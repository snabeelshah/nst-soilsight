import { Router } from 'express'
import { healthRouter } from './health.routes.js'
import { environmentalRouter } from './environmental.routes.js'
import { riskRouter } from './risk.routes.js'
import { cropRouter } from './crop.routes.js'
import { rotationRouter } from './rotation.routes.js'
import { scenarioRouter } from './scenario.routes.js'

export const apiRouter = Router()

// Mount sub-routers under /api
apiRouter.use('/', healthRouter)
apiRouter.use('/', environmentalRouter)
apiRouter.use('/', riskRouter)
apiRouter.use('/', cropRouter)
apiRouter.use('/', rotationRouter)
apiRouter.use('/', scenarioRouter)
