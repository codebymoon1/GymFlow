import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError } from '../utils/errors.ts'

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'The requested endpoint was not found.'))
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  let appError = error instanceof AppError ? error : undefined

  if (!appError && error instanceof SyntaxError && 'body' in error) {
    appError = new AppError(400, 'INVALID_JSON', 'The request body contains invalid JSON.')
  }

  if (!appError && typeof error === 'object' && error !== null && 'status' in error) {
    const status = Number(error.status)
    if (status === 413) appError = new AppError(413, 'REQUEST_TOO_LARGE', 'The request body is too large.')
    if (status === 415) appError = new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The request content type is not supported.')
  }

  const statusCode = appError?.statusCode ?? 500
  const code = appError?.code ?? 'INTERNAL_SERVER_ERROR'
  const message = appError?.message ?? 'An unexpected error occurred.'

  if (statusCode >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'request_failed',
      requestId: response.locals.requestId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
  }

  response.status(statusCode).json({
    error: { code, message, requestId: response.locals.requestId },
  })
}
