import express from 'express'
import { apiV1Router } from './routes/api-v1.ts'
import { healthRouter } from './routes/health.ts'
import { corsPolicy, securityHeaders } from './middleware/security.ts'
import { errorHandler, notFoundHandler } from './middleware/error-handler.ts'
import { requestContext, requestLogger } from './middleware/request-context.ts'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')

  app.use(requestContext)
  app.use(requestLogger)
  app.use(securityHeaders)
  app.use(corsPolicy)
  app.use(express.json({ limit: '100kb', strict: true }))

  // Keep the original health URLs working while adding an explicit API version.
  app.use('/health', healthRouter)
  app.use('/api/v1', apiV1Router)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
