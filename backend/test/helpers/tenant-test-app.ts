import express, { Router } from 'express'
import { getPrismaClient } from '../../src/db.ts'
import { authenticate } from '../../src/middleware/authenticate.ts'
import { errorHandler, notFoundHandler } from '../../src/middleware/error-handler.ts'
import { requirePermission } from '../../src/middleware/require-permission.ts'
import { requestContext } from '../../src/middleware/request-context.ts'
import { resolveGym } from '../../src/middleware/resolve-gym.ts'
import { corsPolicy, securityHeaders } from '../../src/middleware/security.ts'
import { apiV1Router } from '../../src/routes/api-v1.ts'
import { withAuthorizedGymMembershipMutation, withAuthorizedGymMutation } from '../../src/middleware/with-authorized-gym-mutation.ts'
import { canManageMembershipRole } from '../../src/permissions/gym-permissions.ts'

let testMutationBarrier: (() => Promise<void>) | undefined

export function setTenantTestMutationBarrier(barrier: (() => Promise<void>) | undefined) {
  testMutationBarrier = barrier
}

/** Test-only routes. This module is imported by tests and never by the server. */
export function createTenantTestApp() {
  const app = express()
  const router = Router()
  app.disable('x-powered-by')
  app.use(requestContext)
  app.use(securityHeaders)
  app.use(corsPolicy)
  app.use(express.json({ limit: '100kb', strict: true }))
  app.use('/api/v1', apiV1Router)

  router.get('/context', authenticate, resolveGym(), requirePermission('members:read'), (_request, response) => {
    response.json({
      userId: response.locals.auth!.userId,
      tenant: response.locals.tenant,
    })
  })

  router.post('/context', authenticate, resolveGym(), requirePermission('members:read'), (_request, response) => {
    response.json({
      userId: response.locals.auth!.userId,
      tenant: response.locals.tenant,
    })
  })

  router.get('/members', authenticate, resolveGym(), requirePermission('members:read'), async (_request, response) => {
    const members = await getPrismaClient().member.findMany({
      where: { gymId: response.locals.tenant!.gymId },
      orderBy: { rollNo: 'asc' },
      select: { id: true, gymId: true, rollNo: true, fullName: true },
    })
    response.json({ members })
  })

  router.get('/members/:memberId', authenticate, resolveGym(), requirePermission('members:read'), async (request, response) => {
    const member = await getPrismaClient().member.findFirst({
      where: { id: request.params.memberId as string, gymId: response.locals.tenant!.gymId },
      select: { id: true, gymId: true, rollNo: true, fullName: true },
    })
    if (!member) return response.status(404).json({ error: { code: 'MEMBER_NOT_FOUND', message: 'The requested member was not found.' } })
    response.json({ member })
  })

  router.get('/pending-setup', authenticate, resolveGym({ allowPendingOwner: true }), requirePermission('gym:setup'), (_request, response) => {
    response.json({ readyForSetup: true, gymId: response.locals.tenant!.gymId })
  })

  router.get('/pending-finance', authenticate, resolveGym({ allowPendingOwner: true }), requirePermission('finance:manage'), (_request, response) => {
    response.json({ allowed: true })
  })

  router.get('/permission/:permission', authenticate, resolveGym(), (request, response, next) => {
    const permission = request.params.permission
    if (typeof permission !== 'string') return response.status(403).json({ error: { code: 'PERMISSION_DENIED' } })
    return requirePermission(permission)(request, response, next)
  }, (_request, response) => response.json({ allowed: true }))

  router.post('/membership-policy', authenticate, async (request, response) => {
    const targetUserId = request.body?.targetUserId
    const nextRole = request.body?.nextRole
    if (typeof targetUserId !== 'string') return response.status(403).json({ error: { code: 'PERMISSION_DENIED' } })
    const context = response.locals.auth!
    const gymId = request.get('X-Gym-Id')?.trim() ?? ''
    const allowed = await withAuthorizedGymMembershipMutation({
      actorUserId: context.userId,
      gymId,
      permission: 'staff:manage',
      targetUserIds: [targetUserId],
    }, async (_tx, tenant) => {
      const target = tenant.lockedMemberships.find(({ userId }) => userId === targetUserId)
      if (!target) return false
      return canManageMembershipRole(tenant.role, target.role, nextRole)
    })
    if (!allowed) return response.status(403).json({ error: { code: 'PERMISSION_DENIED' } })
    response.json({ allowed })
  })

  router.post('/authorized-mutation/:memberId', authenticate, async (request, response) => {
    const gymId = request.get('X-Gym-Id')?.trim() ?? ''
    const { userId } = response.locals.auth!
    const updated = await withAuthorizedGymMutation({
      actorUserId: userId,
      gymId,
      permission: 'staff:manage',
    }, async (tx, tenant) => {
      if (testMutationBarrier) await testMutationBarrier()
      const result = await tx.member.updateMany({
        where: { id: request.params.memberId as string, gymId: tenant.gymId },
        data: { fullName: 'Authorized Phase 4 Test Mutation' },
      })
      if (result.count !== 1) return false
      return true
    })
    if (!updated) return response.status(404).json({ error: { code: 'MEMBER_NOT_FOUND', message: 'The requested member was not found.' } })
    response.json({ updated })
  })

  app.use('/_phase4_test', router)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
