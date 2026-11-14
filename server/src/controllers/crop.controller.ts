import type { Request, Response, NextFunction } from 'express'
import { CROPS, windowSuitability, windows } from '../services/crop.service.js'
import type { Crop, NASAClimateData, SoilData } from '../types/index.js'

export function getAllCrops(_req: Request, res: Response): void {
  res.status(200).json({
    crops: CROPS,
    count: CROPS.length,
  })
}

export function getCropById(req: Request, res: Response): void {
  const crop = CROPS.find((c) => c.id === req.params.id)
  if (!crop) {
    res.status(404).json({ error: 'Not Found', message: `Crop with id '${req.params.id}' not found.` })
    return
  }
  res.status(200).json({ crop })
}

export function calculateSuitability(req: Request, res: Response, next: NextFunction): void {
  try {
    const climate: NASAClimateData = req.body?.climate
    const soil: SoilData | null = req.body?.soil ?? null
    const cropIds: string[] | undefined = req.body?.cropIds

    if (!climate || !climate.monthly || climate.monthly.length !== 12) {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'Valid 12-month climate data is required to calculate crop suitability.',
      })
      return
    }

    const targetCrops = cropIds
      ? CROPS.filter((c) => cropIds.includes(c.id))
      : CROPS.filter((c) => c.id !== 'fallow' && c.season !== 'perennial')

    const suitabilities = targetCrops.map((crop: Crop) => {
      const bestWindow = windows(crop)
        .map(([s, e]) => windowSuitability(crop, climate, soil, s, e))
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore)[0]
      return bestWindow
    })

    res.status(200).json({ suitabilities })
  } catch (error) {
    next(error)
  }
}
