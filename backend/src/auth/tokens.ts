import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.ts'
import { AppError } from '../utils/errors.ts'

export const ACCESS_TOKEN_LIFETIME_SECONDS = 10 * 60
export const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000
export const REFRESH_COOKIE_NAME = 'gymflow_refresh'

interface AccessClaims {
  sub: string
  sid: string
  iss: string
  aud: string
  iat: number
  exp: number
  jti: string
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(input: string): string {
  return createHmac('sha256', env.accessTokenSecret).update(input).digest('base64url')
}

export function issueAccessToken(userId: string, sessionId: string, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000)
  const claims: AccessClaims = {
    sub: userId,
    sid: sessionId,
    iss: 'gymflow-api',
    aud: 'gymflow-client',
    iat: issuedAt,
    exp: issuedAt + ACCESS_TOKEN_LIFETIME_SECONDS,
    jti: randomBytes(16).toString('base64url'),
  }
  const input = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}`
  return { token: `${input}.${sign(input)}`, expiresIn: ACCESS_TOKEN_LIFETIME_SECONDS }
}

export function verifyAccessToken(token: string, now = Date.now()): AccessClaims {
  if (token.length > 4096) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.')
  const parts = token.split('.')
  if (parts.length !== 3) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.')

  const [headerPart, claimsPart, signaturePart] = parts
  const expected = Buffer.from(sign(`${headerPart}.${claimsPart}`), 'base64url')
  const received = Buffer.from(signaturePart, 'base64url')
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.')
  }

  try {
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as { alg?: string; typ?: string }
    const claims = JSON.parse(Buffer.from(claimsPart, 'base64url').toString('utf8')) as Partial<AccessClaims>
    const currentTime = Math.floor(now / 1000)
    if (
      header.alg !== 'HS256' || header.typ !== 'JWT' ||
      typeof claims.sub !== 'string' || typeof claims.sid !== 'string' ||
      claims.iss !== 'gymflow-api' || claims.aud !== 'gymflow-client' ||
      typeof claims.iat !== 'number' || typeof claims.exp !== 'number' ||
      typeof claims.jti !== 'string' || claims.exp <= currentTime || claims.iat > currentTime + 30
    ) {
      throw new Error('Invalid access token claims.')
    }
    return claims as AccessClaims
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.')
  }
}

export function createRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function serializeRefreshCookie(token: string, maxAgeSeconds = REFRESH_TOKEN_LIFETIME_MS / 1000): string {
  const parts = [
    `${REFRESH_COOKIE_NAME}=${token}`,
    `Path=/api/v1/auth`,
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ]
  if (env.isProduction) parts.push('Secure')
  return parts.join('; ')
}

export function clearRefreshCookie(): string {
  return serializeRefreshCookie('', 0)
}
