import type { Request, Response, NextFunction } from 'express'
import { calculateRiskCalendar } from '../services/risk.service.js'
import { fetchNASAClimateData, generateFallback } from '../services/nasa.service.js'
import type { NASAMonthlyData } from '../types/index.js'

export async function getClimateRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let monthly: NASAMonthlyData[] | undefined = req.body?.monthly

    if (!monthly) {
      // If coordinates are provided, fetch climate
      const lat = Number(req.query.lat ?? req.body?.lat)
      const lon = Number(req.query.lon ?? req.query.lng ?? req.body?.lon ?? req.body?.lng)
      const isDemo = req.query.demo === 'true'

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const climate = isDemo ? generateFallback(lat, lon) : await fetchNASAClimateData(lat, lon)
        monthly = climate.monthly
      }
    }

    if (!monthly || !Array.isArray(monthly) || monthly.length !== 12) {
      res.status(400).json({
        error: 'Invalid Request',
        message: '12 months of climate data or valid coordinates are required to calculate the risk calendar.',
      })
      return
    }

    const result = calculateRiskCalendar(monthly)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}
