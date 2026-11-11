import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export function requestContext(_request: Request, response: Response, next: NextFunction) {
  response.locals.requestId = randomUUID()
  response.setHeader('X-Request-Id', response.locals.requestId)
  next()
}

export function requestLogger(request: Request, response: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint()
  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    console.info(JSON.stringify({
      level: 'info',
      event: 'http_request',
      requestId: response.locals.requestId,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    }))
  })
  next()
}
