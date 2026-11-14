import type {
  NASAClimateData,
  SoilData,
  NASAMonthlyData,
  MonthRisk,
  Crop,
  FarmerPriorities,
  RotationStrategy,
  ClimateScenario,
  AnnualPoint,
} from '../types'
import { fetchNASAClimateData as directFetchNASA, generateFallback } from './nasa-power'
import { fetchSoilData as directFetchSoil, getFallbackSoil } from './soilgrids'
import {
  buildRotationStrategies as directBuildRotations,
  rankStrategies as directRank,
  applyClimateStress as directApplyStress,
  normalizedWeights,
} from '../lib/cropScoring'
import { buildRiskCalendar as directBuildRisks } from '../lib/riskCalendar'
import { CROPS } from '../lib/cropDatabase'
import { analyzeHistoricalTrends as directAnalyzeTrends } from '../lib/historicalTrends'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export interface EnvironmentalResponse {
  coordinates: { lat: number; lon: number }
  climate: NASAClimateData
  soil: SoilData
  units: {
    temperature: string
    rainfall: string
    soilMoisture: string
    et0: string
  }
  source: string
  period: string
  disclaimer: string
  warnings: string[]
}

export interface HistoricalTrendsResponse {
  coordinates: { lat: number; lon: number }
  series: AnnualPoint[]
  rainfallSlope: number
  tempSlope: number
  rainfallAnomalies: number[]
  meanRainfall: number
  period: string
  units: Record<string, string>
  source: string
}

export interface ClimateRiskResponse {
  monthlyRisks: MonthRisk[]
  summary: {
    highAttentionMonths: number
    mediumAttentionMonths: number
    lowAttentionMonths: number
  }
  confidence: {
    level: 'observed' | 'modelled' | 'estimated'
    label: string
    description: string
    color: string
  }
  missingDataWarnings: string[]
  explanation: string
}

export interface RotationRecommendationsResponse {
  strategies: RotationStrategy[]
  normalizedPriorities: Record<string, number>
  strategyCount: number
  types: string[]
  confidence: {
    level: string
    label: string
    description: string
    color: string
  }
}

export interface RecalculatePrioritiesResponse {
  rankedStrategies: RotationStrategy[]
  normalizedWeights: Record<string, number>
}

export interface ScenarioComparisonItem {
  type: string
  name: string
  baselineScore: number
  scenarioScore: number
  scoreDelta: number
  baselineWaterGap: number
  scenarioWaterGap: number
  waterGapDelta: number
}

export interface ScenarioSimulationResponse {
  isHypothetical: boolean
  disclaimer: string
  stressedClimate: {
    avgTemp: number
    annualRainfall: number
    tempDelta: number
    rainfallDelta: number
  }
  monthlyRisks: MonthRisk[]
  stressedStrategies: RotationStrategy[]
  comparison: ScenarioComparisonItem[]
}

async function request<T>(
  url: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 15000
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const combinedSignal = options?.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal

  const response = await fetch(url, {
    ...options,
    signal: combinedSignal,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    let errorMsg = `Server returned HTTP ${response.status}`
    try {
      const errJson = await response.json()
      if (errJson.message) errorMsg = errJson.message
      else if (errJson.error) errorMsg = errJson.error
    } catch {
      // ignore json parse error
    }
    const err = new Error(errorMsg) as Error & { statusCode?: number }
    err.statusCode = response.status
    throw err
  }

  return response.json()
}

/**
 * Fetch unified NASA environmental data (climate + soil + warnings + disclaimer)
 */
export async function fetchEnvironmentalData(
  lat: number,
  lon: number,
  options?: { demo?: boolean; signal?: AbortSignal },
): Promise<EnvironmentalResponse> {
  const query = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
    ...(options?.demo ? { demo: 'true' } : {}),
  })

  try {
    return await request<EnvironmentalResponse>(`${API_BASE}/environmental?${query}`, {
      signal: options?.signal,
    })
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string }
    // If backend returned a valid HTTP error status (like 503 or 400), don't bypass it!
    if (error.statusCode && error.statusCode >= 400) {
      throw err
    }

    // Only if the backend endpoint itself was completely unreachable (e.g. connection refused in standalone client test):
    if (options?.demo) {
      const demoClimate = generateFallback(lat, lon)
      const demoSoil = getFallbackSoil()
      return {
        coordinates: { lat, lon },
        climate: demoClimate,
        soil: demoSoil,
        units: { temperature: '°C', rainfall: 'mm/month', soilMoisture: 'dimensionless (0–1)', et0: 'mm/month' },
        source: demoClimate.source,
        period: demoClimate.period,
        disclaimer: `Point-based NASA data represents the selected coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°), not measurements across every point of the field.`,
        warnings: ['Point-based demonstration climate representing selected coordinates.'],
      }
    }

    // Direct browser fetch to live NASA POWER and SoilGrids
    const [climateResult, soilResult] = await Promise.allSettled([
      directFetchNASA(lat, lon, options?.signal),
      directFetchSoil(lat, lon, options?.signal),
    ])

    if (climateResult.status === 'rejected') {
      throw new Error(
        climateResult.reason instanceof Error
          ? climateResult.reason.message
          : 'NASA climate data could not be loaded. Check your connection or try again.',
      )
    }

    const liveClimate = climateResult.value
    const liveSoil = soilResult.status === 'fulfilled' ? soilResult.value : getFallbackSoil()

    return {
      coordinates: { lat, lon },
      climate: liveClimate,
      soil: liveSoil,
      units: { temperature: '°C', rainfall: 'mm/month', soilMoisture: 'dimensionless (0–1)', et0: 'mm/month' },
      source: liveClimate.source,
      period: liveClimate.period,
      disclaimer: `Point-based NASA data represents the selected coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°), not measurements across every point of the field.`,
      warnings: soilResult.status === 'rejected' ? ['SoilGrids is unavailable; using bundled example soil profile.'] : [],
    }
  }
}

/**
 * Fetch 15-year NASA POWER historical trend records & regression
 */
export async function fetchHistoricalTrends(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<HistoricalTrendsResponse> {
  const query = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
  })

  try {
    return await request<HistoricalTrendsResponse>(`${API_BASE}/environmental/history?${query}`, {
      signal,
      timeoutMs: 30000,
    })
  } catch (err: unknown) {
    const error = err as { statusCode?: number }
    if (error.statusCode && error.statusCode >= 400) throw err

    const clientAnalysis = await directAnalyzeTrends(lat, lon, signal)
    return {
      coordinates: { lat, lon },
      series: clientAnalysis.data,
      rainfallSlope: clientAnalysis.rainfallTrendSlope,
      tempSlope: clientAnalysis.tempTrendSlope,
      rainfallAnomalies: clientAnalysis.anomalyYears,
      meanRainfall: clientAnalysis.mean,
      period: `${clientAnalysis.data[0].year}–${clientAnalysis.data[clientAnalysis.data.length - 1].year}`,
      units: { rainfall: 'mm/year', temperature: '°C' },
      source: 'NASA POWER monthly point API',
    }
  }
}

/**
 * Calculate 12-month climate risk calendar from monthly climate data
 */
export async function fetchClimateRisk(
  monthly: NASAMonthlyData[],
  signal?: AbortSignal,
): Promise<ClimateRiskResponse> {
  try {
    return await request<ClimateRiskResponse>(`${API_BASE}/climate-risk`, {
      method: 'POST',
      body: JSON.stringify({ monthly }),
      signal,
    })
  } catch (err: unknown) {
    const error = err as { statusCode?: number }
    if (error.statusCode && error.statusCode >= 400) throw err

    const risks = directBuildRisks(monthly)
    return {
      monthlyRisks: risks,
      summary: {
        highAttentionMonths: risks.filter((r) => r.severity === 'high').length,
        mediumAttentionMonths: risks.filter((r) => r.severity === 'medium').length,
        lowAttentionMonths: risks.filter((r) => r.severity === 'low').length,
      },
      confidence: {
        level: 'modelled',
        label: 'Modelled · Climate Screening',
        description: 'Threshold-based screening derived from NASA POWER monthly climate records.',
        color: '#326b8a',
      },
      missingDataWarnings: [],
      explanation: 'Climate-based screening for cold, heat, water deficits and excess rain.',
    }
  }
}

/**
 * Fetch crop database from backend
 */
export async function fetchCrops(signal?: AbortSignal): Promise<{ crops: Crop[]; count: number }> {
  try {
    return await request<{ crops: Crop[]; count: number }>(`${API_BASE}/crops`, { signal })
  } catch (err: unknown) {
    const error = err as { statusCode?: number }
    if (error.statusCode && error.statusCode >= 400) throw err
    return { crops: CROPS, count: CROPS.length }
  }
}

/**
 * Generate 3 rotation strategies (Baseline, Soil-First, Water-Saver) from rotation API
 */
export async function fetchRotationRecommendations(
  climate: NASAClimateData,
  soil: SoilData | null,
  priorities: FarmerPriorities,
  signal?: AbortSignal,
): Promise<RotationRecommendationsResponse> {
  try {
    return await request<RotationRecommendationsResponse>(`${API_BASE}/rotations/recommend`, {
      method: 'POST',
      body: JSON.stringify({ climate, soil, priorities }),
      signal,
    })
  } catch (err: unknown) {
    const error = err as { statusCode?: number }
    if (error.statusCode && error.statusCode >= 400) throw err

    const strategies = directBuildRotations(climate, soil, priorities)
    const weights = normalizedWeights(priorities)
    return {
      strategies,
      normalizedPriorities: Object.fromEntries(
        Object.entries(weights).map(([k, v]) => [k, Math.round(v * 100)]),
      ),
      strategyCount: strategies.length,
      types: strategies.map((s) => s.type),
      confidence: climate.confidence,
    }
  }
}

/**
 * Recalculate strategy overall scores and rankings based on updated farmer priorities
 */
export async function recalculateRotationPriorities(
  strategies: RotationStrategy[],
  priorities: FarmerPriorities,
  signal?: AbortSignal,
): Promise<RecalculatePrioritiesResponse> {
  try {
    return await request<RecalculatePrioritiesResponse>(`${API_BASE}/rotations/recalculate-priorities`, {
      method: 'POST',
      body: JSON.stringify({ strategies, priorities }),
      signal,
    })
  } catch (err: unknown) {
    const error = err as { statusCode?: number }
    if (error.statusCode && error.statusCode >= 400) throw err

    const ranked = directRank(strategies, priorities)
    const weights = normalizedWeights(priorities)
    return {
      rankedStrategies: ranked,
      normalizedWeights: Object.fromEntries(
        Object.entries(weights).map(([k, v]) => [k, Math.round(v * 100)]),
      ),
    }
  }
}

/**
 * Stress-test crop rotations under hypothetical climate scenario deltas
 */
export async function simulateClimateScenario(
  climate: NASAClimateData,
  soil: SoilData | null,
  scenario: ClimateScenario,
  strategies: RotationStrategy[],
  priorities: FarmerPriorities,
  signal?: AbortSignal,
): Promise<ScenarioSimulationResponse> {
  try {
    return await request<ScenarioSimulationResponse>(`${API_BASE}/scenario/simulate`, {
      method: 'POST',
      body: JSON.stringify({ climate, soil, scenario, strategies, priorities }),
      signal,
    })
  } catch (err: unknown) {
    const error = err as { statusCode?: number }
    if (error.statusCode && error.statusCode >= 400) throw err

    const stressed = directApplyStress(strategies, climate, scenario, soil, priorities)
    const comparison: ScenarioComparisonItem[] = strategies.map((baseline) => {
      const after = stressed.find((s) => s.type === baseline.type) ?? baseline
      return {
        type: baseline.type,
        name: baseline.name,
        baselineScore: baseline.scores.overall,
        scenarioScore: after.scores.overall,
        scoreDelta: Math.round((after.scores.overall - baseline.scores.overall) * 10) / 10,
        baselineWaterGap: Math.round(baseline.irrigationTotal),
        scenarioWaterGap: Math.round(after.irrigationTotal),
        waterGapDelta: Math.round(after.irrigationTotal - baseline.irrigationTotal),
      }
    })

    return {
      isHypothetical: true,
      disclaimer: 'Hypothetical climate sensitivity experiment, not a forecast or IPCC scenario.',
      stressedClimate: {
        avgTemp: climate.avgTemp + scenario.tempDelta,
        annualRainfall: climate.annualRainfall * (1 + scenario.rainfallDelta / 100),
        tempDelta: scenario.tempDelta,
        rainfallDelta: scenario.rainfallDelta,
      },
      monthlyRisks: directBuildRisks(climate.monthly),
      stressedStrategies: stressed,
      comparison,
    }
  }
}
