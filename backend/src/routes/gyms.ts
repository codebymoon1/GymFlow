import { Router } from 'express'
import { GymUserStatus } from '../../generated/prisma/client.ts'
import { getPrismaClient } from '../db.ts'
import { authenticate } from '../middleware/authenticate.ts'

export const gymsRouter = Router()

gymsRouter.get('/', authenticate, async (_request, response) => {
  const { userId } = response.locals.auth!
  const memberships = await getPrismaClient().gymUser.findMany({
    where: { userId, status: GymUserStatus.ACTIVE },
    orderBy: [{ createdAt: 'asc' }, { gymId: 'asc' }],
    select: {
      role: true,
      gym: { select: { id: true, name: true, slug: true, status: true } },
    },
  })

  response.json({
    gyms: memberships.map(({ gym, role }) => ({ ...gym, role })),
  })
})
