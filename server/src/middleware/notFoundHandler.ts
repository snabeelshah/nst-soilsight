import type { Request, Response } from 'express'

/**
 * 404 handler for unknown routes.
 * Must be registered after all route definitions.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  })
}
