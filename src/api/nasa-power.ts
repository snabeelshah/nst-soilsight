import type { NASAClimateData, NASAMonthlyData, NASARecentData, NASARecentDay } from '../types'
import { DAYS, MONTHS, estimateET0, summarizeClimate } from '../lib/climate'
const BASE = 'https://power.larc.nasa.gov/api/temporal'
type Parameters = Record<string, Record<string, number>>
interface PowerResponse {
  properties?: { parameter?: Parameters }
  header?: { start?: string; end?: string; fill_value?: number }
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
  if (rainUnits && !['mm/day', 'mm day-1', 'mm/d'].includes(rainUnits))
    throw new Error(`Unsupported NASA precipitation units: ${rainUnits}`)
  const monthly: NASAMonthlyData[] = MONTHS.map((_, i) => {
    const tempMin = get('T2M_MIN', i),
      tempMax = get('T2M_MAX', i),
      tempAvg = get('T2M', i),
      rain = get('PRECTOTCORR', i)
    if (
      ![tempMin, tempMax, tempAvg, rain].every(valid) ||
      [tempMin, tempMax, tempAvg, rain].includes(data.header?.fill_value ?? -999)
    )
      throw new Error(`NASA data is incomplete for ${MONTHS[i]}. No substitute values were used.`)
    if (
      tempMin > tempMax ||
      tempAvg < tempMin ||
      tempAvg > tempMax ||
      tempMin < -90 ||
      tempMax > 65 ||
      rain < 0 ||
      rain > 1000
    )
      throw new Error(`NASA returned invalid values for ${MONTHS[i]}.`)
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
  return {
    monthly,
    ...summarizeClimate(monthly),
    lat,
    lon,
    kind: 'live',
    source: 'NASA POWER climatology',
    sourceUrl,
    retrievedAt: new Date().toISOString(),
    period:
      data.header?.start && data.header?.end
        ? `${data.header.start}–${data.header.end}`
        : 'POWER climatology (period not supplied)',
    confidence: {
      level: 'modelled',
      label: 'Modelled · NASA POWER',
      description:
        'Gridded reanalysis incorporating observations. Climate patterns at roughly 0.5° × 0.625° meteorological resolution; not field measurements or a weather forecast.',
      color: '#326b8a',
    },
  }
}
async function request(url: string, signal?: AbortSignal): Promise<PowerResponse> {
  const response = await fetch(url, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
      : AbortSignal.timeout(30000),
  })
  if (!response.ok)
    throw new Error(`NASA POWER returned HTTP ${response.status}. Please retry later.`)
  return response.json()
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
  return parseNASAClimate(await request(url, signal), lat, lon, url)
}
function isoDate(key: string): string {
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`
}
export function parseNASARecent(data: PowerResponse, sourceUrl: string): NASARecentData {
  const props = data.properties?.parameter
  if (!props) throw new Error('NASA returned no recent daily parameters.')
  const rainUnits = data.parameters?.PRECTOTCORR?.units
  if (rainUnits && !['mm/day', 'mm day-1', 'mm/d'].includes(rainUnits))
    throw new Error(`Unsupported NASA daily precipitation units: ${rainUnits}`)
  const fill = data.header?.fill_value ?? -999
  const keys = Object.keys(props.T2M ?? {})
    .filter((key) => /^\d{8}$/.test(key))
    .sort()
  const days: NASARecentDay[] = keys.flatMap((key) => {
    const tempAvg = props.T2M?.[key]
    const rainfall = props.PRECTOTCORR?.[key]
    if (
      !valid(tempAvg) ||
      !valid(rainfall) ||
      [tempAvg, rainfall].includes(fill) ||
      tempAvg < -90 ||
      tempAvg > 65 ||
      rainfall < 0 ||
      rainfall > 1000
    )
      return []
    const moisture = (parameter: string) => {
      const value = props[parameter]?.[key]
      return valid(value) && value !== fill && value >= 0 && value <= 1 ? value : null
    }
    return [
      {
        date: isoDate(key),
        tempAvg,
        rainfall,
        soilMoistureRoot: moisture('GWETROOT'),
        soilMoistureProf: moisture('GWETPROF'),
      },
    ]
  })
  if (days.length < 7)
    throw new Error('NASA returned fewer than seven complete recent days. No substitute was used.')
  const last7 = days.slice(-7),
    last30 = days.slice(-30),
    latest = days[days.length - 1]
  return {
    days,
    latest,
    rainfall7Days: last7.reduce((sum, day) => sum + day.rainfall, 0),
    rainfall30Days: last30.reduce((sum, day) => sum + day.rainfall, 0),
    avgTemp7Days: last7.reduce((sum, day) => sum + day.tempAvg, 0) / last7.length,
    source: 'NASA POWER daily point data',
    sourceUrl,
    retrievedAt: new Date().toISOString(),
    period: `${days[0].date}–${latest.date}`,
    confidence: {
      level: 'modelled',
      label: 'Modelled · latest available NASA POWER',
      description:
        'Latest complete regional daily values returned by NASA POWER. These are not a field sensor, a real-time weather feed or a forecast.',
      color: '#326b8a',
    },
  }
}
function yyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}
export async function fetchNASARecentData(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<NASARecentData> {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 2)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 44)
  const params = new URLSearchParams({
    parameters: 'T2M,PRECTOTCORR,GWETROOT,GWETPROF',
    community: 'AG',
    longitude: lon.toFixed(4),
    latitude: lat.toFixed(4),
    start: yyyymmdd(start),
    end: yyyymmdd(end),
    format: 'JSON',
  })
  const url = `${BASE}/daily/point?${params}`
  return parseNASARecent(await request(url, signal), url)
}
// An explicit demonstration model. Never returned automatically when a live request fails.
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
export interface AnnualPoint {
  year: number
  rainfall: number
  temp: number
}
export function parseMonthlyHistory(
  data: PowerResponse,
  start: number,
  end: number,
): AnnualPoint[] {
  const p = data.properties?.parameter
  if (!p) throw new Error('NASA returned no historical data.')
  const rainUnits = data.parameters?.PRECTOTCORR?.units
  if (rainUnits && !['mm/day', 'mm day-1', 'mm/d'].includes(rainUnits))
    throw new Error('Unsupported historical precipitation units.')
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
      )
        throw new Error(`Incomplete history for ${year}. Trend analysis needs complete years.`)
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
  return parseMonthlyHistory(await request(`${BASE}/monthly/point?${params}`, signal), start, end)
}
