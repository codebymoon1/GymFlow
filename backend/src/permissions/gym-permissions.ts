import { GymRole } from '../../generated/prisma/client.ts'

export const GYM_PERMISSIONS = [
  'gym:setup',
  'gym:operations:manage',
  'gym:settings:manage',
  'gym:subscription:manage',
  'members:read',
  'members:manage',
  'attendance:read',
  'attendance:manage',
  'finance:read',
  'finance:manage',
  'wallets:manage',
  'transactions:manage',
  'plans:manage',
  'staff:read',
  'staff:manage',
] as const

export type GymPermission = (typeof GYM_PERMISSIONS)[number]

const permissionKeys = new Set<string>(GYM_PERMISSIONS)

const rolePermissions: Record<GymRole, ReadonlySet<GymPermission>> = {
  OWNER: new Set(GYM_PERMISSIONS),
  MANAGER: new Set([
    'members:read', 'members:manage',
    'attendance:read', 'attendance:manage',
    'finance:read', 'finance:manage',
    'wallets:manage', 'transactions:manage', 'plans:manage',
    'staff:read', 'staff:manage', 'gym:operations:manage',
  ]),
  STAFF: new Set([
    'members:read', 'members:manage',
    'attendance:read', 'attendance:manage',
  ]),
  TRAINER: new Set([
    'members:read',
    'attendance:read', 'attendance:manage',
  ]),
}

const rolesManagedByManager = new Set<GymRole>(['STAFF', 'TRAINER'])
const gymRoles = new Set<GymRole>(Object.values(GymRole))

function isGymRole(role: unknown): role is GymRole {
  return typeof role === 'string' && gymRoles.has(role as GymRole)
}

export function hasGymPermission(role: unknown, permission: string): boolean {
  if (!permissionKeys.has(permission)) return false
  if (!isGymRole(role)) return false
  return rolePermissions[role]?.has(permission as GymPermission) ?? false
}

/**
 * OWNER membership changes remain deliberately unsupported pending a separate
 * ownership-transfer decision. MANAGER can manage only STAFF and TRAINER.
 */
export function canManageMembershipRole(
  actorRole: unknown,
  targetRole: unknown,
  nextRole: unknown,
): boolean {
  if (!isGymRole(actorRole) || !isGymRole(targetRole) || !isGymRole(nextRole)) return false
  if (targetRole === GymRole.OWNER || nextRole === GymRole.OWNER) return false

  if (actorRole === GymRole.OWNER) return true
  if (actorRole !== GymRole.MANAGER) return false

  return rolesManagedByManager.has(targetRole) && rolesManagedByManager.has(nextRole)
}
