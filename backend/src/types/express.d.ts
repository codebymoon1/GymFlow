import type { Request } from 'express'

declare global {
  namespace Express {
    interface Locals {
      requestId: string
      validatedBody?: unknown
      auth?: { userId: string; sessionId: string }
    }
  }
}

export type GymFlowRequest = Request

export {}
