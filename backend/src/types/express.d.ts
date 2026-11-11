import type { Request } from 'express'
import type { GymRole, GymStatus } from '../../generated/prisma/client.ts'

export interface TenantContext {
  gymId: string
  role: GymRole
  gymStatus: GymStatus
}

declare global {
  namespace Express {
    interface Locals {
      requestId: string
      validatedBody?: unknown
      auth?: { userId: string; sessionId: string }
      tenant?: TenantContext
    }
  }
}

export type GymFlowRequest = Request

export {}
