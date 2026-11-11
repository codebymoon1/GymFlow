import type { Request } from 'express'
import { env } from '../config/env.ts'
import { REFRESH_COOKIE_NAME } from './tokens.ts'

export function getRefreshCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return undefined

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0 || part.slice(0, separator).trim() !== REFRESH_COOKIE_NAME) continue
    const token = part.slice(separator + 1).trim()
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined
  }
  return undefined
}

export function hasTrustedOrigin(request: Request): boolean {
  const origin = request.get('Origin')
  return Boolean(origin && env.allowedOrigins.has(origin))
}
