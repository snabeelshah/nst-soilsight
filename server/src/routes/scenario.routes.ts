import { Router } from 'express'
import { simulateScenario } from '../controllers/scenario.controller.js'

export const scenarioRouter = Router()

// POST /api/scenario/simulate
scenarioRouter.post('/scenario/simulate', simulateScenario)
