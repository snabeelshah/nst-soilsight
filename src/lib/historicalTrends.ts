import { fetchNASATrendData, type AnnualPoint } from '../api/nasa-power'
export function linearSlope(points: { x: number; y: number }[]) {
  if (points.length < 2) throw new Error('At least two complete years are required.')
  const mx = points.reduce((s, p) => s + p.x, 0) / points.length,
    my = points.reduce((s, p) => s + p.y, 0) / points.length
  const denominator = points.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  return denominator ? points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / denominator : 0
}
export function analyzeSeries(data: AnnualPoint[]) {
  if (data.length < 5)
    throw new Error('At least five complete years are required for this trend view.')
  const mean = data.reduce((s, p) => s + p.rainfall, 0) / data.length
  const sd = Math.sqrt(data.reduce((s, p) => s + (p.rainfall - mean) ** 2, 0) / data.length)
  return {
    data,
    rainfallTrendSlope: linearSlope(data.map((p) => ({ x: p.year, y: p.rainfall }))),
    tempTrendSlope: linearSlope(data.map((p) => ({ x: p.year, y: p.temp }))),
    anomalyYears: data
      .filter((p) => sd > 0 && Math.abs(p.rainfall - mean) > 1.5 * sd)
      .map((p) => p.year),
    mean,
  }
}
export async function analyzeHistoricalTrends(lat: number, lon: number, signal?: AbortSignal) {
  // Allow a complete publication year; do not request a partial current year.
  const end = new Date().getUTCFullYear() - 2
  return analyzeSeries(await fetchNASATrendData(lat, lon, end - 14, end, signal))
}
