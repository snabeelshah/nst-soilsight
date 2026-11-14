import type { Request, Response } from 'express'

/**
 * Health check controller
 * Endpoint: GET /api/health
 * Returns HTTP 200 with { "status": "ok" }
 */
export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
}
