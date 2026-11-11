import type { RequestHandler } from 'express'
import { GymStatus } from '../../generated/prisma/client.ts'
import { hasGymPermission } from '../permissions/gym-permissions.ts'
import { AppError } from '../utils/errors.ts'

/**
 * Checks request-local authorization for read-only handlers. A consequential
 * database mutation must reauthorize and hold membership locks via
 * withAuthorizedGymMutation within the same transaction as its writes.
 */
export function requirePermission(permission: string): RequestHandler {
  return (_request, response, next) => {
    if (!response.locals.auth) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'))
    }
    const tenant = response.locals.tenant
    if (!tenant) {
      return next(new AppError(404, 'GYM_NOT_FOUND', 'The requested gym was not found.'))
    }
    if (tenant.gymStatus === GymStatus.PENDING && permission !== 'gym:setup') {
      return next(new AppError(404, 'GYM_NOT_FOUND', 'The requested gym was not found.'))
    }
    if (!hasGymPermission(tenant.role, permission)) {
      return next(new AppError(403, 'PERMISSION_DENIED', 'You do not have permission to perform this action.'))
    }
    next()
  }
}
