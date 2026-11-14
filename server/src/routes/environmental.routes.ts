import { Router } from 'express'
import {
  getEnvironmentalData,
  getClimateData,
  getSoilData,
  getHistoricalTrends,
} from '../controllers/environmental.controller.js'

export const environmentalRouter = Router()

// GET /api/environmental - unified climate + soil + warnings
environmentalRouter.get('/environmental', getEnvironmentalData)

// GET /api/environmental/climate - climate specific
environmentalRouter.get('/environmental/climate', getClimateData)

// GET /api/environmental/soil - soil specific
environmentalRouter.get('/environmental/soil', getSoilData)

// GET /api/environmental/history - 15-year NASA POWER trends
environmentalRouter.get('/environmental/history', getHistoricalTrends)
