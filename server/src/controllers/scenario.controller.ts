import type { Request, Response, NextFunction } from 'express'
import { simulateClimateScenario } from '../services/scenario.service.js'
import type { NASAClimateData, SoilData, FarmerPriorities, ClimateScenario, RotationStrategy } from '../types/index.js'

export function simulateScenario(req: Request, res: Response, next: NextFunction): void {
  try {
    const climate: NASAClimateData = req.body?.climate
    const soil: SoilData | null = req.body?.soil ?? null
    const scenario: ClimateScenario = req.body?.scenario ?? { tempDelta: 0, rainfallDelta: 0 }
    const strategies: RotationStrategy[] = req.body?.strategies ?? []
    const priorities: FarmerPriorities = req.body?.priorities ?? {
      waterConservation: 25,
      soilHealth: 25,
      marketValue: 20,
      nitrogenFixing: 15,
      erosionControl: 10,
      riskReduction: 5,
    }

    if (!climate || !climate.monthly || climate.monthly.length !== 12) {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'Valid climate data is required to run climate scenario simulations.',
      })
      return
    }

    // Validate scenario ranges
    const safeScenario: ClimateScenario = {
      tempDelta: Number.isFinite(scenario.tempDelta) ? Math.max(0, Math.min(10, scenario.tempDelta)) : 0,
      rainfallDelta: Number.isFinite(scenario.rainfallDelta)
        ? Math.max(-90, Math.min(200, scenario.rainfallDelta))
        : 0,
    }

    const result = simulateClimateScenario(climate, soil, safeScenario, strategies, priorities)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}
