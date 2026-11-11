import { Router } from 'express'
import { healthRouter } from './health.ts'

export const apiV1Router = Router()
apiV1Router.use('/health', healthRouter)
