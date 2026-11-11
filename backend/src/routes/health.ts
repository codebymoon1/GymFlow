import { Router } from 'express'
import { getPrismaClient } from '../db.ts'
import { env } from '../config/env.ts'

export const healthRouter = Router()

healthRouter.get('/', (_request, response) => {
  response.json({ status: 'ok', service: 'gymflow-backend' })
})

healthRouter.get('/live', (_request, response) => {
  response.json({ status: 'ok', service: 'gymflow-backend' })
})

const readiness = async (_request: import('express').Request, response: import('express').Response) => {
  if (!env.databaseUrl) {
    return response.status(503).json({ status: 'error', database: 'not_configured' })
  }
  try {
    await getPrismaClient().$queryRaw`SELECT 1`
    response.json({ status: 'ok', database: 'connected' })
  } catch {
    response.status(503).json({ status: 'error', database: 'unavailable' })
  }
}

healthRouter.get('/db', readiness)
healthRouter.get('/ready', readiness)
