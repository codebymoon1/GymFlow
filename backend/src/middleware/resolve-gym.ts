import type { RequestHandler } from 'express'
import { GymStatus, GymUserStatus } from '../../generated/prisma/client.ts'
import { getPrismaClient } from '../db.ts'
import { AppError } from '../utils/errors.ts'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const inaccessibleGym = () => new AppError(404, 'GYM_NOT_FOUND', 'The requested gym was not found.')

export interface ResolveGymOptions {
  /** Only set on explicitly approved, owner-only setup routes. */
  allowPendingOwner?: boolean
}

/**
 * Treat X-Gym-Id only as a selection. Authorization comes from the active
 * authenticated user's GymUser row and the current Gym status in PostgreSQL.
 * This efficient request snapshot is for read-only handlers; consequential
 * mutations must use withAuthorizedGymMutation so locks remain held through
 * commit.
 */
export function resolveGym(options: ResolveGymOptions = {}): RequestHandler {
  return async (request, response, next) => {
    const auth = response.locals.auth
    if (!auth) return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'))

    const selectedGymId = request.get('X-Gym-Id')?.trim()
    if (!selectedGymId) {
      return next(new AppError(400, 'GYM_CONTEXT_REQUIRED', 'Select a gym for this request.'))
    }
    if (!UUID_PATTERN.test(selectedGymId)) {
      return next(new AppError(400, 'INVALID_GYM_ID', 'The selected gym identifier is invalid.'))
    }

    try {
      const membership = await getPrismaClient().gymUser.findUnique({
        where: { gymId_userId: { gymId: selectedGymId, userId: auth.userId } },
        select: {
          role: true,
          status: true,
          gym: { select: { id: true, status: true } },
        },
      })

      if (!membership || membership.status !== GymUserStatus.ACTIVE) {
        return next(inaccessibleGym())
      }

      const pendingOwnerSetup = options.allowPendingOwner === true &&
        membership.role === 'OWNER' && membership.gym.status === GymStatus.PENDING
      if (membership.gym.status !== GymStatus.ACTIVE && !pendingOwnerSetup) {
        return next(inaccessibleGym())
      }

      response.locals.tenant = {
        gymId: membership.gym.id,
        role: membership.role,
        gymStatus: membership.gym.status,
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}
