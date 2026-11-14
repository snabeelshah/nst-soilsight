import type { NASAClimateData, NASAMonthlyData, AnnualPoint } from '../types/index.js'
import { DAYS, MONTHS, estimateET0, summarizeClimate } from './climate.service.js'

const BASE = 'https://power.larc.nasa.gov/api/temporal'

type Parameters = Record<string, Record<string, number>>

interface PowerResponse {
  properties?: { parameter?: Parameters }
  header?: { start?: string; end?: string; fill_value?: number; range?: string; title?: string }
  parameters?: Record<string, { units?: string }>
}

function valid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value !== -999
}

export function parseNASAClimate(
  data: PowerResponse,
  lat: number,
  lon: number,
  sourceUrl?: string,
): NASAClimateData {
  const props = data.properties?.parameter
  if (!props) throw new Error('NASA returned no climate parameters.')

  const get = (key: string, i: number) =>
    props[key]?.[MONTHS[i].toUpperCase()] ?? props[key]?.[String(i + 1).padStart(2, '0')]

  const rainUnits = data.parameters?.PRECTOTCORR?.units
  if (rainUnits && !['mm/day', 'mm day-1', 'mm/d'].includes(rainUnits)) {
    throw new Error(`Unsupported NASA precipitation units: ${rainUnits}`)
  }

  const monthly: NASAMonthlyData[] = MONTHS.map((_, i) => {
    const tempMin = get('T2M_MIN', i),
      tempMax = get('T2M_MAX', i),
      tempAvg = get('T2M', i),
      rain = get('PRECTOTCORR', i)

    if (
      ![tempMin, tempMax, tempAvg, rain].every(valid) ||
      [tempMin, tempMax, tempAvg, rain].includes(data.header?.fill_value ?? -999)
    ) {
      throw new Error(`NASA data is incomplete for ${MONTHS[i]}. No substitute values were used.`)
    }

    if (
      tempMin > tempMax ||
      tempAvg < tempMin ||
      tempAvg > tempMax ||
      tempMin < -90 ||
      tempMax > 65 ||
      rain < 0 ||
      rain > 1000
    ) {
      throw new Error(`NASA returned invalid values for ${MONTHS[i]}.`)
    }

    const moisture = (key: string) => {
      const v = get(key, i)
      return valid(v) && v >= 0 && v <= 1 ? v : null
    }

    return {
      month: i + 1,
      tempMin,
      tempMax,
      tempAvg,
      rainfall: rain * DAYS[i],
      soilMoistureRoot: moisture('GWETROOT'),
      soilMoistureProf: moisture('GWETPROF'),
      et0: estimateET0(tempMin, tempMax, lat, i + 1),
    }
  })

  const period =
    data.header?.range ??
    (data.header?.start && data.header?.end
      ? `${data.header.start}–${data.header.end}`
      : 'POWER climatology (2001–2025)')

  return {
    monthly,
    ...summarizeClimate(monthly),
    lat,
    lon,
    kind: 'live',
    source: 'NASA POWER climatology',
    sourceUrl,
    retrievedAt: new Date().toISOString(),
    period,
    confidence: {
      level: 'modelled',
      label: 'Modelled · NASA POWER',
      description:
        'Gridded reanalysis incorporating satellite and station observations. Climate patterns at roughly 0.5° × 0.625° meteorological resolution; not field measurements or a weather forecast.',
      color: '#326b8a',
    },
  }
}

async function request(url: string, signal?: AbortSignal, timeoutMs = 15000): Promise<PowerResponse> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

  const response = await fetch(url, { signal: combinedSignal })
  if (!response.ok) {
    throw new Error(`NASA POWER returned HTTP ${response.status}. Please retry later.`)
  }
  return (await response.json()) as PowerResponse
}

export async function fetchNASAClimateData(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<NASAClimateData> {
  const params = new URLSearchParams({
    parameters: 'T2M_MAX,T2M_MIN,T2M,PRECTOTCORR,GWETROOT,GWETPROF',
    community: 'AG',
    longitude: lon.toFixed(4),
    latitude: lat.toFixed(4),
    format: 'JSON',
  })
  const url = `${BASE}/climatology/point?${params}`
  const json = await request(url, signal)
  return parseNASAClimate(json, lat, lon, url)
}

export function parseMonthlyHistory(
  data: PowerResponse,
  start: number,
  end: number,
): AnnualPoint[] {
  const p = data.properties?.parameter
  if (!p) throw new Error('NASA returned no historical data.')

  const rainUnits = data.parameters?.PRECTOTCORR?.units
  if (rainUnits && !['mm/day', 'mm day-1', 'mm/d'].includes(rainUnits)) {
    throw new Error('Unsupported historical precipitation units.')
  }

  return Array.from({ length: end - start + 1 }, (_, n) => {
    const year = start + n
    let rainfall = 0,
      temperatureDays = 0,
      days = 0

    for (let month = 1; month <= 12; month++) {
      const key = `${year}${String(month).padStart(2, '0')}`
      const rain = p.PRECTOTCORR?.[key],
        temp = p.T2M?.[key]

      if (
        !valid(rain) ||
        rain < 0 ||
        rain > 1000 ||
        !valid(temp) ||
        temp < -90 ||
        temp > 65 ||
        [rain, temp].includes(data.header?.fill_value ?? -999)
      ) {
        throw new Error(`Incomplete history for ${year}. Trend analysis needs complete years.`)
      }

      const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
      rainfall += rain * count
      temperatureDays += temp * count
      days += count
    }

    return { year, rainfall, temp: temperatureDays / days }
  })
}

export async function fetchNASATrendData(
  lat: number,
  lon: number,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<AnnualPoint[]> {
  const params = new URLSearchParams({
    parameters: 'PRECTOTCORR,T2M',
    community: 'AG',
    longitude: lon.toFixed(4),
    latitude: lat.toFixed(4),
    start: String(start),
    end: String(end),
    format: 'JSON',
  })
  const url = `${BASE}/monthly/point?${params}`
  const json = await request(url, signal, 25000)
  return parseMonthlyHistory(json, start, end)
}

export function linearSlope(points: { x: number; y: number }[]): number {
  if (points.length < 2) throw new Error('At least two complete years are required.')
  const mx = points.reduce((s, p) => s + p.x, 0) / points.length,
    my = points.reduce((s, p) => s + p.y, 0) / points.length
  const denominator = points.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  return denominator ? points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / denominator : 0
}

export function analyzeHistoricalTrends(data: AnnualPoint[]) {
  if (data.length < 5) {
    throw new Error('At least five complete years are required for this trend view.')
  }
  const mean = data.reduce((s, p) => s + p.rainfall, 0) / data.length
  const sd = Math.sqrt(data.reduce((s, p) => s + (p.rainfall - mean) ** 2, 0) / data.length)
  return {
    series: data,
    rainfallSlope: linearSlope(data.map((p) => ({ x: p.year, y: p.rainfall }))),
    tempSlope: linearSlope(data.map((p) => ({ x: p.year, y: p.temp }))),
    rainfallAnomalies: data
      .filter((p) => sd > 0 && Math.abs(p.rainfall - mean) > 1.5 * sd)
      .map((p) => p.year),
    meanRainfall: mean,
    period: `${data[0].year}–${data[data.length - 1].year}`,
  }
}

// Fallback demo model when explicitly needed or in demo mode
export function generateFallback(lat: number, lon: number): NASAClimateData {
  const tropical = Math.abs(lat) < 23.5
  const arid = Math.abs(lat) >= 15 && Math.abs(lat) < 35 && lon > 20 && lon < 80
  const monthly = MONTHS.map((_, i) => {
    const phase = lat >= 0 ? i : (i + 6) % 12
    const season = Math.cos(((phase - 6) * Math.PI) / 6)
    const tempAvg = (tropical ? 27 : arid ? 25 : 16) + season * (tropical ? 3 : 11)
    const tempMin = tempAvg - 6,
      tempMax = tempAvg + 6
    const rainfall =
      (arid ? 20 : tropical ? 110 : 60) * (1 + 0.5 * Math.sin(((phase - 5) * Math.PI) / 6))
    return {
      month: i + 1,
      tempMin,
      tempMax,
      tempAvg,
      rainfall,
      soilMoistureRoot: Math.min(1, rainfall / 160),
      soilMoistureProf: Math.min(1, rainfall / 180),
      et0: estimateET0(tempMin, tempMax, lat, i + 1),
    }
  })
  return {
    monthly,
    ...summarizeClimate(monthly),
    lat,
    lon,
    kind: 'demo',
    source: 'Synthetic demonstration climate',
    period: 'Illustrative annual cycle; no observation period',
    confidence: {
      level: 'estimated',
      label: 'Estimated · demo data',
      description:
        'Synthetic values for exploring the interface. These are not NASA observations and must not guide planting decisions.',
      color: '#9a682a',
    },
  }
}
