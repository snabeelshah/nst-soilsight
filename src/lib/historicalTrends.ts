import { fetchNASATrendData } from '../api/nasa-power'

export interface MultiYearPoint {
  year: number
  rainfall: number
  temp: number
}

export interface TrendAnalysis {
  data: MultiYearPoint[]
  rainfallTrendSlope: number    // mm per year
  tempTrendSlope: number        // °C per year
  anomalyYears: number[]
  baselineRainfall: number
  recentRainfall: number
  rainfallChangePercent: number
  baselineTemp: number
  recentTemp: number
  tempChangeDelta: number
  interpretation: string
}

export async function analyzeHistoricalTrends(lat: number, lon: number): Promise<TrendAnalysis> {
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - 15
  const endYear = currentYear - 1

  const rawData = await fetchNASATrendData(lat, lon, startYear, endYear)
  const data: MultiYearPoint[] = Object.entries(rawData).map(([y, val]) => {
    const obj = typeof val === 'object' && val !== null ? val : { rainfall: Number(val), temp: 24 }
    return {
      year: Number(y),
      rainfall: Math.round(obj.rainfall),
      temp: Math.round(obj.temp * 10) / 10,
    }
  }).sort((a, b) => a.year - b.year)

  const n = data.length || 1
  const sumX = data.reduce((s, d) => s + d.year, 0)
  const sumX2 = data.reduce((s, d) => s + d.year * d.year, 0)

  // Rainfall regression
  const sumRain = data.reduce((s, d) => s + d.rainfall, 0)
  const sumXYRain = data.reduce((s, d) => s + d.year * d.rainfall, 0)
  const rainfallTrendSlope = Math.round(((n * sumXYRain - sumX * sumRain) / Math.max(1, (n * sumX2 - sumX * sumX))) * 10) / 10

  // Temp regression
  const sumTemp = data.reduce((s, d) => s + d.temp, 0)
  const sumXYTemp = data.reduce((s, d) => s + d.year * d.temp, 0)
  const tempTrendSlope = Math.round(((n * sumXYTemp - sumX * sumTemp) / Math.max(1, (n * sumX2 - sumX * sumX))) * 100) / 100

  // Baseline vs recent split
  const mid = Math.floor(n / 2)
  const baseline = data.slice(0, mid)
  const recent = data.slice(mid)

  const baselineRainfall = Math.round(baseline.reduce((s, d) => s + d.rainfall, 0) / Math.max(1, baseline.length))
  const recentRainfall = Math.round(recent.reduce((s, d) => s + d.rainfall, 0) / Math.max(1, recent.length))
  const rainfallChangePercent = Math.round((((recentRainfall - baselineRainfall) / Math.max(1, baselineRainfall)) * 100) * 10) / 10

  const baselineTemp = Math.round((baseline.reduce((s, d) => s + d.temp, 0) / Math.max(1, baseline.length)) * 10) / 10
  const recentTemp = Math.round((recent.reduce((s, d) => s + d.temp, 0) / Math.max(1, recent.length)) * 10) / 10
  const tempChangeDelta = Math.round((recentTemp - baselineTemp) * 10) / 10

  // Anomaly detection (>1.5 std dev)
  const meanRain = sumRain / n
  const stdDevRain = Math.sqrt(data.reduce((s, d) => s + (d.rainfall - meanRain) ** 2, 0) / n)
  const anomalyYears = data.filter(d => Math.abs(d.rainfall - meanRain) > 1.4 * stdDevRain).map(d => d.year)

  const rainTrendWord = rainfallTrendSlope > 5 ? 'wetter (+)' : rainfallTrendSlope < -5 ? 'drier (-)' : 'relatively stable'
  const tempTrendWord = tempTrendSlope > 0.03 ? 'warming' : tempTrendSlope < -0.03 ? 'cooling' : 'stable'

  const interpretation = `Across the past ${n} years of NASA satellite & reanalysis observations, your location exhibits a ${tempTrendWord} trend (${tempTrendSlope > 0 ? '+' : ''}${tempTrendSlope}°C/yr) and a ${rainTrendWord} precipitation pattern (${rainfallTrendSlope > 0 ? '+' : ''}${rainfallTrendSlope}mm/yr). Recent seasons averaged ${recentRainfall}mm compared to ${baselineRainfall}mm historically (${rainfallChangePercent > 0 ? '+' : ''}${rainfallChangePercent}%). Anomalous precipitation events occurred in: ${anomalyYears.length > 0 ? anomalyYears.join(', ') : 'no major anomaly'}.`

  return {
    data,
    rainfallTrendSlope,
    tempTrendSlope,
    anomalyYears,
    baselineRainfall,
    recentRainfall,
    rainfallChangePercent,
    baselineTemp,
    recentTemp,
    tempChangeDelta,
    interpretation,
  }
}
