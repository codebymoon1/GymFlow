import type { Prisma } from '../../generated/prisma/client.ts'
import { GymRole, GymStatus, GymUserStatus } from '../../generated/prisma/client.ts'
import { getPrismaClient } from '../db.ts'
import { hasGymPermission } from '../permissions/gym-permissions.ts'
import { AppError } from '../utils/errors.ts'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const inaccessibleGym = () => new AppError(404, 'GYM_NOT_FOUND', 'The requested gym was not found.')

export interface LockedGymMembership {
  gymId: string
  userId: string
  role: GymRole
  status: GymUserStatus
}

export interface AuthorizedGymMutationContext {
  gymId: string
  role: GymRole
  gymStatus: GymStatus
  /** Rows locked in this transaction; use these database roles for target policy checks. */
  lockedMemberships: readonly LockedGymMembership[]
}

export interface AuthorizedGymMutationOptions {
  /** Authenticated identity from response.locals.auth; never from request input. */
  actorUserId: string
  /** Untrusted selector is revalidated against current database membership. */
  gymId: string
  permission: string
  allowPendingOwner?: boolean
}

export interface AuthorizedGymMembershipMutationOptions extends AuthorizedGymMutationOptions {
  /** All existing target memberships changed by the operation; locked in sorted UUID order. */
  targetUserIds: readonly string[]
}

/**
 * Runs a consequential tenant mutation with current authorization held through
 * commit. Lock order is always Gym first, then GymUser rows by userId. The
 * ordinary mutation path uses FOR SHARE so independent mutations can
 * proceed together. Membership administration must use
 * withAuthorizedGymMembershipMutation, which locks the actor and every target
 * with FOR UPDATE up front to avoid lock upgrades and use locked DB roles.
 *
 * Membership status/role updates and deletes naturally conflict with these
 * PostgreSQL row locks. Every future membership-changing path must run in a
 * transaction and follow the same Gym -> sorted GymUser order. Do not authorize
 * a mutation from response.locals.tenant alone.
 */
async function runAuthorizedGymMutation<T>(
  options: AuthorizedGymMutationOptions,
  targetUserIds: readonly string[],
  lockTargetsForUpdate: boolean,
  operation: (tx: Prisma.TransactionClient, context: AuthorizedGymMutationContext) => Promise<T>,
): Promise<T> {
  if (!UUID_PATTERN.test(options.actorUserId) || !UUID_PATTERN.test(options.gymId)) {
    throw inaccessibleGym()
  }

  if (targetUserIds.some((userId) => !UUID_PATTERN.test(userId))) {
    throw inaccessibleGym()
  }
  const lockUserIds = [...new Set([options.actorUserId, ...targetUserIds])].sort()

  return getPrismaClient().$transaction(async (tx) => {
    // Lock order is consistent: one gym row, followed by memberships in UUID order.
    const gyms = await tx.$queryRaw<Array<{ id: string; status: GymStatus }>>`
      SELECT "id", "status"
      FROM "Gym"
      WHERE "id" = ${options.gymId}::uuid
      FOR SHARE
    `
    const gym = gyms[0]
    if (!gym) throw inaccessibleGym()

    let lockedMemberships: LockedGymMembership[]
    if (lockTargetsForUpdate) {
      lockedMemberships = await tx.$queryRaw<LockedGymMembership[]>`
        SELECT "gymId", "userId", "role", "status"
        FROM "GymUser"
        WHERE "gymId" = ${options.gymId}::uuid
          AND "userId" = ANY(${lockUserIds}::uuid[])
        ORDER BY "userId" ASC
        FOR UPDATE
      `
    } else {
      lockedMemberships = await tx.$queryRaw<LockedGymMembership[]>`
        SELECT "gymId", "userId", "role", "status"
        FROM "GymUser"
        WHERE "gymId" = ${options.gymId}::uuid
          AND "userId" = ${options.actorUserId}::uuid
        FOR SHARE
      `
    }

    const actorMembership = lockedMemberships.find(({ userId }) => userId === options.actorUserId)
    if (!actorMembership || actorMembership.status !== GymUserStatus.ACTIVE) {
      throw inaccessibleGym()
    }

    const pendingOwnerSetup = options.allowPendingOwner === true &&
      actorMembership.role === GymRole.OWNER && gym.status === GymStatus.PENDING
    if (gym.status !== GymStatus.ACTIVE && !pendingOwnerSetup) {
      throw inaccessibleGym()
    }
    if (gym.status === GymStatus.PENDING && options.permission !== 'gym:setup') {
      throw inaccessibleGym()
    }
    if (!hasGymPermission(actorMembership.role, options.permission)) {
      throw new AppError(403, 'PERMISSION_DENIED', 'You do not have permission to perform this action.')
    }

    return operation(tx, {
      gymId: gym.id,
      role: actorMembership.role,
      gymStatus: gym.status,
      lockedMemberships,
    })
  }, { isolationLevel: 'ReadCommitted' })
}

/**
 * Transaction-safe pattern for consequential business mutations. The callback
 * must perform all protected database changes through the supplied tx.
 */
export function withAuthorizedGymMutation<T>(
  options: AuthorizedGymMutationOptions,
  operation: (tx: Prisma.TransactionClient, context: AuthorizedGymMutationContext) => Promise<T>,
): Promise<T> {
  return runAuthorizedGymMutation(options, [], false, operation)
}

/**
 * Transaction-safe pattern for membership role/status changes. The caller must
 * list every existing target membership; their locked DB roles are returned in
 * context.lockedMemberships. Creating a new membership has no target role and
 * must use a separately defined, explicit role-creation policy.
 */
export function withAuthorizedGymMembershipMutation<T>(
  options: AuthorizedGymMembershipMutationOptions,
  operation: (tx: Prisma.TransactionClient, context: AuthorizedGymMutationContext) => Promise<T>,
): Promise<T> {
  if (options.targetUserIds.length === 0) throw new AppError(400, 'TARGET_MEMBERSHIP_REQUIRED', 'A target membership is required.')
  return runAuthorizedGymMutation(options, options.targetUserIds, true, operation)
}
