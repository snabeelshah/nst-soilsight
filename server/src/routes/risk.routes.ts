import { Router } from 'express'
import { getClimateRisk } from '../controllers/risk.controller.js'

export const riskRouter = Router()

// POST or GET /api/climate-risk
riskRouter.post('/climate-risk', getClimateRisk)
riskRouter.get('/climate-risk', getClimateRisk)
