import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { getPrismaClient } from '../db.ts'
import { authenticate } from '../middleware/authenticate.ts'
import { validateBody } from '../middleware/validate.ts'
import { AppError } from '../utils/errors.ts'
import { getRefreshCookie, hasTrustedOrigin } from '../auth/cookies.ts'
import { loginBodySchema } from '../auth/validation.ts'
import {
  listUserSessions,
  login,
  refresh,
  revokeOneSession,
  revokeRefreshToken,
  revokeUserSessions,
} from '../auth/service.ts'
import { clearRefreshCookie, serializeRefreshCookie } from '../auth/tokens.ts'

export const authRouter = Router()

authRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Pragma', 'no-cache')
  next()
})

const authRateLimit = (limit: number) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Try again later.', requestId: response.locals.requestId },
  }),
})

const loginLimiter = authRateLimit(15)
const refreshLimiter = authRateLimit(30)

authRouter.post('/login', loginLimiter, validateBody(loginBodySchema), async (_request, response) => {
  const body = response.locals.validatedBody as { email: string; password: string }
  const result = await login(body.email, body.password)
  response.setHeader('Set-Cookie', serializeRefreshCookie(result.refreshToken))
  response.status(200).json({
    user: result.user,
    accessToken: result.token,
    expiresIn: result.expiresIn,
  })
})

authRouter.post('/refresh', refreshLimiter, async (request, response) => {
  response.setHeader('Set-Cookie', clearRefreshCookie())
  if (!hasTrustedOrigin(request)) {
    throw new AppError(403, 'UNTRUSTED_ORIGIN', 'The request origin is not allowed.')
  }
  const refreshToken = getRefreshCookie(request)
  if (!refreshToken) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'The refresh session is no longer valid.')

  const result = await refresh(refreshToken)
  response.setHeader('Set-Cookie', serializeRefreshCookie(result.refreshToken))
  response.status(200).json({
    user: result.user,
    accessToken: result.token,
    expiresIn: result.expiresIn,
  })
})

authRouter.post('/logout', async (request, response) => {
  response.setHeader('Set-Cookie', clearRefreshCookie())
  if (!hasTrustedOrigin(request)) {
    throw new AppError(403, 'UNTRUSTED_ORIGIN', 'The request origin is not allowed.')
  }
  await revokeRefreshToken(getRefreshCookie(request))
  response.status(204).end()
})

authRouter.post('/logout-all', authenticate, async (_request, response) => {
  const { userId } = response.locals.auth!
  const revokedSessions = await revokeUserSessions(userId)
  response.setHeader('Set-Cookie', clearRefreshCookie())
  response.status(200).json({ revokedSessions })
})

authRouter.get('/sessions', authenticate, async (_request, response) => {
  const { userId, sessionId } = response.locals.auth!
  response.json({ sessions: await listUserSessions(userId, sessionId) })
})

authRouter.delete('/sessions/:sessionId', authenticate, async (request, response) => {
  const { userId } = response.locals.auth!
  const sessionId = request.params.sessionId
  if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    throw new AppError(400, 'INVALID_SESSION_ID', 'The session identifier is invalid.')
  }
  const revoked = await revokeOneSession(userId, sessionId)
  if (!revoked) throw new AppError(404, 'SESSION_NOT_FOUND', 'The session was not found.')
  response.status(204).end()
})

authRouter.get('/me', authenticate, async (_request, response) => {
  const { userId } = response.locals.auth!
  const user = await getPrismaClient().user.findFirst({
    where: { id: userId, status: 'ACTIVE' },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.')
  response.json({ user })
})
