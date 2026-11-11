import type { RequestHandler } from 'express'
import { getPrismaClient } from '../db.ts'
import { AppError } from '../utils/errors.ts'
import { verifyAccessToken } from '../auth/tokens.ts'

export const authenticate: RequestHandler = async (request, response, next) => {
  const authorization = request.get('Authorization')
  const match = authorization?.match(/^Bearer ([A-Za-z0-9._-]+)$/)
  if (!match) return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'))

  try {
    const claims = verifyAccessToken(match[1])
    const session = await getPrismaClient().authSession.findFirst({
      where: {
        id: claims.sid,
        userId: claims.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { status: 'ACTIVE' },
      },
      select: { id: true, userId: true },
    })
    if (!session) return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'))
    response.locals.auth = { userId: session.userId, sessionId: session.id }
    next()
  } catch (error) {
    next(error)
  }
}
