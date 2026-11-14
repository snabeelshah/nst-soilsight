import type { NASAMonthlyData, NASAClimateData } from '../types/index.js'

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))

export function monthRange(start: number, end: number): number[] {
  return Array.from({ length: ((end - start + 12) % 12) + 1 }, (_, i) => ((start - 1 + i) % 12) + 1)
}

// FAO-56 Hargreaves equation: Ra in MJ/m²/day converted to equivalent mm/day (0.408).
export function estimateET0(tmin: number, tmax: number, lat: number, month: number): number {
  const phi = (clamp(lat, -89.9, 89.9) * Math.PI) / 180
  const j = DAYS.slice(0, month - 1).reduce((a, b) => a + b, 0) + 15
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * j) / 365)
  const delta = 0.409 * Math.sin((2 * Math.PI * j) / 365 - 1.39)
  const ws = Math.acos(clamp(-Math.tan(phi) * Math.tan(delta), -1, 1))
  const ra =
    ((24 * 60) / Math.PI) *
    0.082 *
    dr *
    (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws))
  return Math.max(
    0,
    0.0023 *
      0.408 *
      ra *
      ((tmin + tmax) / 2 + 17.8) *
      Math.sqrt(Math.max(0, tmax - tmin)) *
      DAYS[month - 1],
  )
}

export function summarizeClimate(monthly: NASAMonthlyData[]) {
  return {
    annualRainfall: monthly.reduce((s, m) => s + m.rainfall, 0),
    avgTemp: monthly.reduce((s, m) => s + m.tempAvg * DAYS[m.month - 1], 0) / 365,
  }
}

export function stressClimate(
  nasa: NASAClimateData,
  tempDelta: number,
  rainfallDelta: number,
): NASAClimateData {
  const monthly = nasa.monthly.map((m) => ({
    ...m,
    tempMin: m.tempMin + tempDelta,
    tempMax: m.tempMax + tempDelta,
    tempAvg: m.tempAvg + tempDelta,
    rainfall: m.rainfall * Math.max(0, 1 + rainfallDelta / 100),
    et0: estimateET0(m.tempMin + tempDelta, m.tempMax + tempDelta, nasa.lat, m.month),
  }))
  return { ...nasa, monthly, ...summarizeClimate(monthly) }
}
