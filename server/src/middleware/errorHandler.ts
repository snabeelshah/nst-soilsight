import type { Request, Response, NextFunction } from 'express'
import { env } from '../config/env.js'

export interface AppError extends Error {
  statusCode?: number
}

/**
 * Centralized error handling middleware.
 * Express recognizes this as an error handler because it takes 4 arguments.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500
  const isDev = env.nodeEnv === 'development'

  console.error(`[Error] ${err.message}`)
  if (isDev && err.stack) {
    console.error(err.stack)
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : 'Error',
    message: isDev ? err.message : 'An unexpected error occurred.',
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  })
}
