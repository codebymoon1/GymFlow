import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/errors.ts'

export interface BodySchema<T> {
  parse(value: unknown): T
}

export function validateBody<T>(schema: BodySchema<T>) {
  return (request: Request, response: Response, next: NextFunction) => {
    try {
      response.locals.validatedBody = schema.parse(request.body)
      next()
    } catch (error) {
      if (error instanceof AppError) return next(error)
      next(new AppError(400, 'INVALID_REQUEST_BODY', 'The request body is invalid.'))
    }
  }
}
