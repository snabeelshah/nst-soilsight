import { Router } from 'express'
import { getAllCrops, getCropById, calculateSuitability } from '../controllers/crop.controller.js'

export const cropRouter = Router()

// GET /api/crops
cropRouter.get('/crops', getAllCrops)

// GET /api/crops/:id
cropRouter.get('/crops/:id', getCropById)

// POST /api/crops/suitability
cropRouter.post('/crops/suitability', calculateSuitability)
