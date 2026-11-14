import type { Request, Response, NextFunction } from 'express'
import {
  buildRotationStrategies,
  rankStrategies,
  normalizedWeights,
  PRIORITY_KEYS,
} from '../services/crop.service.js'
import type { NASAClimateData, SoilData, FarmerPriorities, RotationStrategy } from '../types/index.js'

function validatePriorities(raw: Partial<FarmerPriorities> | undefined): FarmerPriorities {
  const defaults: FarmerPriorities = {
    waterConservation: 25,
    soilHealth: 25,
    marketValue: 20,
    nitrogenFixing: 15,
    erosionControl: 10,
    riskReduction: 5,
  }

  if (!raw) return defaults

  const result: Partial<FarmerPriorities> = {}
  for (const key of PRIORITY_KEYS) {
    const val = raw[key]
    result[key] = typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.min(100, val)) : defaults[key]
  }

  return result as FarmerPriorities
}

export function getRotationRecommendations(req: Request, res: Response, next: NextFunction): void {
  try {
    const climate: NASAClimateData = req.body?.climate
    const soil: SoilData | null = req.body?.soil ?? null
    const priorities = validatePriorities(req.body?.priorities)

    if (!climate || !climate.monthly || climate.monthly.length !== 12) {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'Valid 12-month climate data is required to generate rotation strategies.',
      })
      return
    }

    const strategies = buildRotationStrategies(climate, soil, priorities)
    const weights = normalizedWeights(priorities)

    res.status(200).json({
      strategies,
      normalizedPriorities: Object.fromEntries(
        PRIORITY_KEYS.map((k) => [k, Math.round(weights[k] * 100)]),
      ),
      strategyCount: strategies.length,
      types: strategies.map((s) => s.type),
      confidence: climate.confidence,
    })
  } catch (error) {
    next(error)
  }
}

export function recalculatePriorities(req: Request, res: Response, next: NextFunction): void {
  try {
    const strategies: RotationStrategy[] = req.body?.strategies
    const priorities = validatePriorities(req.body?.priorities)

    if (!strategies || !Array.isArray(strategies) || strategies.length === 0) {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'An array of strategies is required to recalculate ranking.',
      })
      return
    }

    const ranked = rankStrategies(strategies, priorities)
    const weights = normalizedWeights(priorities)

    res.status(200).json({
      rankedStrategies: ranked,
      normalizedWeights: Object.fromEntries(
        PRIORITY_KEYS.map((k) => [k, Math.round(weights[k] * 100)]),
      ),
    })
  } catch (error) {
    next(error)
  }
}
