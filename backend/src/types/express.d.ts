import type { Request } from 'express'

declare global {
  namespace Express {
    interface Locals {
      requestId: string
      validatedBody?: unknown
    }
  }
}

export type GymFlowRequest = Request

export {}
