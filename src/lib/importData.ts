import type { NASAClimateData, NASAMonthlyData, LatLng } from '../types'
import { estimateET0, summarizeClimate } from './climate'
export function parseClimateImport(
  text: string,
  filename: string,
  center: LatLng,
): NASAClimateData {
  let rows: unknown
  if (filename.toLowerCase().endsWith('.json')) {
    const data = JSON.parse(text)
    if (
      (data.lat !== undefined && Math.abs(data.lat - center.lat) > 0.01) ||
      (data.lon !== undefined && Math.abs(data.lon - center.lng) > 0.01)
    )
      throw new Error('Dataset coordinates do not match the selected field.')
    rows = Array.isArray(data) ? data : data.monthly
  } else if (filename.toLowerCase().endsWith('.csv')) {
    const [header, ...lines] = text
      .replace(/^\uFEFF/, '')
      .trim()
      .split(/\r?\n/)
    const keys = header.split(',').map((x) => x.trim())
    rows = lines.map((line) => {
      const values = line.split(',').map((v) => v.trim())
      if (values.length !== keys.length) throw new Error('CSV column counts do not match.')
      return Object.fromEntries(
        keys.map((k, i) => [k, values[i] === '' ? null : Number(values[i])]),
      )
    })
  } else throw new Error('Choose a JSON or CSV file.')
  if (!Array.isArray(rows) || rows.length !== 12)
    throw new Error('Provide exactly 12 monthly records, one for each month.')
  const required = ['month', 'tempMin', 'tempMax', 'tempAvg', 'rainfall']
  const monthly: NASAMonthlyData[] = rows
    .map((row) => {
      if (!row || required.some((k) => typeof row[k] !== 'number' || !Number.isFinite(row[k])))
        throw new Error(
          'Required values: month, tempMin, tempMax, tempAvg, rainfall. Empty or non-numeric values are not accepted.',
        )
      if (
        !Number.isInteger(row.month) ||
        row.month < 1 ||
        row.month > 12 ||
        row.tempMin < -90 ||
        row.tempMax > 65 ||
        row.tempMin > row.tempAvg ||
        row.tempAvg > row.tempMax ||
        row.rainfall < 0 ||
        row.rainfall > 10000
      )
        throw new Error('A record contains an invalid month, temperature or rainfall value.')
      for (const key of ['soilMoistureRoot', 'soilMoistureProf'])
        if (
          row[key] != null &&
          (typeof row[key] !== 'number' ||
            !Number.isFinite(row[key]) ||
            row[key] < 0 ||
            row[key] > 1)
        )
          throw new Error('Soil wetness must be between 0 and 1, or omitted.')
      return {
        month: row.month,
        tempMin: row.tempMin,
        tempMax: row.tempMax,
        tempAvg: row.tempAvg,
        rainfall: row.rainfall,
        soilMoistureRoot: row.soilMoistureRoot ?? null,
        soilMoistureProf: row.soilMoistureProf ?? null,
        et0: estimateET0(row.tempMin, row.tempMax, center.lat, row.month),
      }
    })
    .sort((a, b) => a.month - b.month)
  if (new Set(monthly.map((m) => m.month)).size !== 12)
    throw new Error('Each month must appear exactly once.')
  return {
    monthly,
    ...summarizeClimate(monthly),
    lat: center.lat,
    lon: center.lng,
    kind: 'imported',
    period: 'User-supplied monthly data; period unverified',
    source: `Imported: ${filename}`,
    confidence: {
      level: 'estimated',
      label: 'Estimated · imported data',
      description:
        'User-supplied inputs. Provenance and measurement quality have not been independently verified.',
      color: '#9a682a',
    },
  }
}
