import { Router } from 'express'
import { healthRouter } from './health.ts'
import { authRouter } from './auth.ts'

export const apiV1Router = Router()
apiV1Router.use('/health', healthRouter)
apiV1Router.use('/auth', authRouter)
