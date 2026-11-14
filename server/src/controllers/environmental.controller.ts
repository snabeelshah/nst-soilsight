import type { Request, Response, NextFunction } from 'express'
import {
  fetchNASAClimateData,
  fetchNASATrendData,
  analyzeHistoricalTrends,
  generateFallback,
} from '../services/nasa.service.js'
import { fetchSoilData, getFallbackSoil } from '../services/soil.service.js'

function parseCoordinates(req: Request): { lat: number; lon: number } {
  const latStr = (req.query.lat ?? req.body?.lat) as string | undefined
  const lonStr = (req.query.lon ?? req.query.lng ?? req.body?.lon ?? req.body?.lng) as string | undefined

  if (!latStr || !lonStr) {
    throw Object.assign(new Error('Latitude and longitude parameters are required.'), { statusCode: 400 })
  }

  const lat = Number(latStr)
  const lon = Number(lonStr)

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw Object.assign(new Error('Latitude must be a valid number between -90 and 90.'), { statusCode: 400 })
  }

  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw Object.assign(new Error('Longitude must be a valid number between -180 and 180.'), { statusCode: 400 })
  }

  return { lat, lon }
}

export async function getEnvironmentalData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lat, lon } = parseCoordinates(req)
    const isDemo = req.query.demo === 'true'

    const warnings: string[] = [
      `Point-based NASA data represents the selected centroid (${lat.toFixed(4)}°, ${lon.toFixed(4)}°), not measurements across every point of the field.`,
    ]

    let climate
    if (isDemo) {
      climate = generateFallback(lat, lon)
    } else {
      try {
        climate = await fetchNASAClimateData(lat, lon)
      } catch (err) {
        // If live request fails, return 503 so client does not treat it as successful
        res.status(503).json({
          error: 'NASA Service Unavailable',
          message: err instanceof Error ? err.message : 'Failed to retrieve NASA POWER climate data.',
          coordinates: { lat, lon },
        })
        return
      }
    }

    // Check missing monthly values in climate
    const missingMoisture = climate.monthly.filter((m) => m.soilMoistureRoot === null).length
    if (missingMoisture > 0) {
      warnings.push(`Soil moisture is unavailable for ${missingMoisture} month(s) in the NASA reanalysis grid cell.`)
    }

    let soil
    try {
      soil = isDemo ? getFallbackSoil() : await fetchSoilData(lat, lon)
    } catch {
      soil = getFallbackSoil()
      warnings.push('ISRIC SoilGrids data could not be retrieved; using bundled fallback soil profile.')
    }

    res.status(200).json({
      coordinates: { lat, lon },
      climate,
      soil,
      units: {
        temperature: '°C',
        rainfall: 'mm/month',
        soilMoisture: 'dimensionless (0–1)',
        et0: 'mm/month',
      },
      source: climate.source,
      period: climate.period,
      disclaimer: `Point-based NASA data represents the selected coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°), not measurements across every point of the field.`,
      warnings,
    })
  } catch (error) {
    next(error)
  }
}

export async function getClimateData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lat, lon } = parseCoordinates(req)
    const isDemo = req.query.demo === 'true'

    if (isDemo) {
      res.status(200).json({
        coordinates: { lat, lon },
        climate: generateFallback(lat, lon),
        warnings: [`Point-based demonstration climate representing (${lat.toFixed(4)}°, ${lon.toFixed(4)}°).`],
      })
      return
    }

    try {
      const climate = await fetchNASAClimateData(lat, lon)
      res.status(200).json({
        coordinates: { lat, lon },
        climate,
        warnings: [
          `Point-based NASA data represents the selected centroid (${lat.toFixed(4)}°, ${lon.toFixed(4)}°), not measurements across every point of the field.`,
        ],
      })
    } catch (err) {
      res.status(503).json({
        error: 'NASA Service Unavailable',
        message: err instanceof Error ? err.message : 'Failed to retrieve NASA POWER climate data.',
        coordinates: { lat, lon },
      })
    }
  } catch (error) {
    next(error)
  }
}

export async function getSoilData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lat, lon } = parseCoordinates(req)
    const isDemo = req.query.demo === 'true'

    const soil = isDemo ? getFallbackSoil() : await fetchSoilData(lat, lon)
    res.status(200).json({
      coordinates: { lat, lon },
      soil,
    })
  } catch (error) {
    next(error)
  }
}

export async function getHistoricalTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lat, lon } = parseCoordinates(req)
    const end = Number(req.query.end) || new Date().getUTCFullYear() - 2
    const start = Number(req.query.start) || end - 14

    try {
      const rawPoints = await fetchNASATrendData(lat, lon, start, end)
      const analysis = analyzeHistoricalTrends(rawPoints)
      res.status(200).json({
        coordinates: { lat, lon },
        ...analysis,
        units: {
          rainfall: 'mm/year',
          temperature: '°C',
          rainfallSlope: 'mm/year²',
          tempSlope: '°C/year',
        },
        source: 'NASA POWER monthly point API',
      })
    } catch (err) {
      res.status(503).json({
        error: 'NASA Historical Trends Unavailable',
        message: err instanceof Error ? err.message : 'NASA historical data is unavailable or incomplete.',
        coordinates: { lat, lon },
      })
    }
  } catch (error) {
    next(error)
  }
}
