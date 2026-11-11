import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.ts'
import { AppError } from '../utils/errors.ts'

export function securityHeaders(_request: Request, response: Response, next: NextFunction) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  if (env.isProduction) response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
}

export function corsPolicy(request: Request, response: Response, next: NextFunction) {
  const origin = request.get('Origin')
  response.vary('Origin')

  if (origin) {
    if (!env.allowedOrigins.has(origin)) {
      return next(new AppError(403, 'CORS_ORIGIN_DENIED', 'This origin is not allowed.'))
    }
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-Gym-Id')
  response.setHeader('Access-Control-Max-Age', '600')

  if (request.method === 'OPTIONS') return response.status(204).end()
  next()
}
