import type { BodySchema } from '../middleware/validate.ts'
import { AppError } from '../utils/errors.ts'

export interface LoginBody {
  email: string
  password: string
}

export const loginBodySchema: BodySchema<LoginBody> = {
  parse(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new AppError(400, 'INVALID_REQUEST_BODY', 'The request body is invalid.')
    }
    const record = value as Record<string, unknown>
    if (typeof record.email !== 'string' || typeof record.password !== 'string') {
      throw new AppError(400, 'INVALID_REQUEST_BODY', 'The request body is invalid.')
    }
    const email = record.email.trim().toLowerCase()
    if (
      email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      record.password.length === 0 || record.password.length > 1024
    ) {
      throw new AppError(400, 'INVALID_REQUEST_BODY', 'The request body is invalid.')
    }
    return { email, password: record.password }
  },
}
