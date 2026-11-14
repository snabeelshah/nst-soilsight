import express, { type Express } from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { apiRouter } from './routes/index.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp(): Express {
  const app = express()

  // 1. Cross-Origin Resource Sharing (CORS) configuration
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )

  // 2. Parse incoming JSON request bodies
  app.use(express.json({ limit: '1mb' }))

  // 3. Mount all API routes under /api
  app.use('/api', apiRouter)

  // 4. Handle 404 for unknown endpoints
  app.use(notFoundHandler)

  // 5. Centralized error handling
  app.use(errorHandler)

  return app
}
