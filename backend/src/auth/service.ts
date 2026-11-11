import { randomBytes, randomUUID } from 'node:crypto'
import type { User } from '../../generated/prisma/client.ts'
import { getPrismaClient } from '../db.ts'
import { AppError } from '../utils/errors.ts'
import { hashPassword, verifyPassword } from './passwords.ts'
import {
  createRefreshToken,
  hashRefreshToken,
  issueAccessToken,
  REFRESH_TOKEN_LIFETIME_MS,
} from './tokens.ts'

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
const dummyHash = hashPassword(randomBytes(32).toString('base64url'))

function makeSessionTokens(userId: string, sessionId: string) {
  return {
    ...issueAccessToken(userId, sessionId),
  }
}

export async function login(email: string, password: string) {
  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { email } })
  const storedHash = user?.passwordHash ?? await dummyHash
  const passwordMatches = await verifyPassword(storedHash, password)

  if (!user || user.status !== 'ACTIVE' || !passwordMatches) throw invalidCredentials()

  const now = new Date()
  const refreshToken = createRefreshToken()
  const sessionId = randomUUID()
  const familyId = randomUUID()
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS)

  await prisma.$transaction(async (tx) => {
    await tx.authSession.create({
      data: { id: sessionId, userId: user.id, familyId, refreshTokenHash: hashRefreshToken(refreshToken), expiresAt, lastUsedAt: now },
    })
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } })
  })

  return {
    user: safeUser(user),
    ...makeSessionTokens(user.id, sessionId),
    refreshToken,
    refreshExpiresAt: expiresAt,
  }
}

export async function refresh(refreshToken: string) {
  const prisma = getPrismaClient()
  const refreshTokenHash = hashRefreshToken(refreshToken)
  const now = new Date()

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AuthSession" WHERE "refreshTokenHash" = ${refreshTokenHash} FOR UPDATE`
    const current = await tx.authSession.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    })
    if (!current) return { kind: 'invalid' as const }

    if (current.rotatedAt) {
      await tx.authSession.updateMany({
        where: { familyId: current.familyId, revokedAt: null },
        data: { revokedAt: now },
      })
      return { kind: 'reused' as const }
    }

    if (current.revokedAt || current.expiresAt <= now || current.user.status !== 'ACTIVE') {
      return { kind: 'invalid' as const }
    }

    const nextRefreshToken = createRefreshToken()
    const nextSessionId = randomUUID()
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS)

    await tx.authSession.create({
      data: {
        id: nextSessionId,
        userId: current.userId,
        familyId: current.familyId,
        refreshTokenHash: hashRefreshToken(nextRefreshToken),
        expiresAt,
        lastUsedAt: now,
      },
    })
    await tx.authSession.update({
      where: { id: current.id },
      data: { revokedAt: now, rotatedAt: now, lastUsedAt: now },
    })

    return {
      kind: 'rotated' as const,
      user: current.user,
      sessionId: nextSessionId,
      refreshToken: nextRefreshToken,
      refreshExpiresAt: expiresAt,
    }
  })

  if (outcome.kind !== 'rotated') {
    throw new AppError(401, outcome.kind === 'reused' ? 'REFRESH_TOKEN_REUSE' : 'INVALID_REFRESH_TOKEN', 'The refresh session is no longer valid.')
  }

  return {
    user: safeUser(outcome.user),
    ...makeSessionTokens(outcome.user.id, outcome.sessionId),
    refreshToken: outcome.refreshToken,
    refreshExpiresAt: outcome.refreshExpiresAt,
  }
}

export async function revokeRefreshToken(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return
  const prisma = getPrismaClient()
  const hash = hashRefreshToken(refreshToken)
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AuthSession" WHERE "refreshTokenHash" = ${hash} FOR UPDATE`
    const session = await tx.authSession.findUnique({ where: { refreshTokenHash: hash } })
    if (!session || session.revokedAt) return

    if (session.rotatedAt) {
      await tx.authSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: now },
      })
      return
    }

    await tx.authSession.update({ where: { id: session.id }, data: { revokedAt: now } })
  })
}

export async function revokeUserSessions(userId: string): Promise<number> {
  const result = await getPrismaClient().authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return result.count
}

export async function revokeOneSession(userId: string, sessionId: string): Promise<boolean> {
  const result = await getPrismaClient().authSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  return result.count === 1
}

export async function listUserSessions(userId: string, currentSessionId: string) {
  const now = new Date()
  return getPrismaClient().authSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, expiresAt: true, lastUsedAt: true },
  }).then((sessions) => sessions.map((session) => ({ ...session, current: session.id === currentSessionId })))
}

function safeUser(user: User) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
}
