import { Router } from 'express'
import {
  getRotationRecommendations,
  recalculatePriorities,
} from '../controllers/rotation.controller.js'

export const rotationRouter = Router()

// POST /api/rotations/recommend
rotationRouter.post('/rotations/recommend', getRotationRecommendations)

// POST /api/rotations/recalculate-priorities
rotationRouter.post('/rotations/recalculate-priorities', recalculatePriorities)
