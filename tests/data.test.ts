import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  parseNASAClimate,
  parseMonthlyHistory,
  fetchNASAClimateData,
  parseNASARecent,
  generateFallback,
} from '../src/api/nasa-power'
import { parseSoilGrids, getFallbackSoil } from '../src/api/soilgrids'
import { estimateET0, monthRange } from '../src/lib/climate'
import { parseClimateImport } from '../src/lib/importData'
import { climateResponse, recentClimateResponse, soilResponse } from './fixtures'
import { analyzeSeries } from '../src/lib/historicalTrends'
afterEach(() => vi.unstubAllGlobals())
describe('NASA response validation and units', () => {
  it('parses named climatology months and uses actual month lengths', () => {
    const data = parseNASAClimate(climateResponse(), 30, 71)
    expect(data.monthly).toHaveLength(12)
    expect(data.monthly[0].rainfall).toBe(62)
    expect(data.monthly[1].rainfall).toBe(56)
    expect(data.annualRainfall).toBe(730)
    expect(data.avgTemp).toBe(22)
    expect(data.kind).toBe('live')
    expect(data.confidence.level).toBe('modelled')
  })
  it('supports numeric month keys', () => {
    const data = climateResponse()
    for (const key of Object.keys(data.properties.parameter))
      data.properties.parameter[key] = Object.fromEntries(
        Object.values(data.properties.parameter[key]).map((v, i) => [
          String(i + 1).padStart(2, '0'),
          v,
        ]),
      )
    expect(parseNASAClimate(data, 30, 71).monthly[11].rainfall).toBe(62)
  })
  it.each([-999, NaN, -1])('rejects missing or invalid precipitation %s', (value) => {
    const data = climateResponse()
    data.properties.parameter.PRECTOTCORR.JAN = value
    expect(() => parseNASAClimate(data, 30, 71)).toThrow()
  })
  it('honours a provider-specific fill value', () => {
    const data = climateResponse()
    data.header.fill_value = -99
    data.properties.parameter.T2M.JAN = -99
    expect(() => parseNASAClimate(data, 30, 71)).toThrow('incomplete')
  })
  it('does not invent unavailable soil wetness', () => {
    const data = climateResponse()
    data.properties.parameter.GWETROOT.JAN = -999
    expect(parseNASAClimate(data, 30, 71).monthly[0].soilMoistureRoot).toBeNull()
  })
  it('rejects unknown rainfall units', () => {
    const data = climateResponse()
    data.parameters.PRECTOTCORR.units = 'inches'
    expect(() => parseNASAClimate(data, 30, 71)).toThrow('units')
  })
  it('propagates service failures instead of returning synthetic NASA data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
    await expect(fetchNASAClimateData(30, 71)).rejects.toThrow('503')
  })
  it('summarizes the latest complete daily POWER records without inventing missing values', () => {
    const response = recentClimateResponse()
    response.properties.parameter.T2M['20261005'] = -999
    const recent = parseNASARecent(response, 'https://power.example/daily')
    expect(recent.latest.date).toBe('2026-10-04')
    expect(recent.rainfall7Days).toBe(14)
    expect(recent.rainfall30Days).toBe(60)
    expect(recent.avgTemp7Days).toBe(24)
    expect(recent.latest.soilMoistureRoot).toBe(0.42)
    expect(recent.confidence.level).toBe('modelled')
  })
  it('converts daily means in monthly history, including leap years', () => {
    const records = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`2020${String(i + 1).padStart(2, '0')}`, 2]),
    )
    const history = parseMonthlyHistory(
      { properties: { parameter: { PRECTOTCORR: records, T2M: records } } },
      2020,
      2020,
    )
    expect(history).toEqual([{ year: 2020, rainfall: 732, temp: 2 }])
    delete records['202002']
    expect(() =>
      parseMonthlyHistory(
        { properties: { parameter: { PRECTOTCORR: records, T2M: records } } },
        2020,
        2020,
      ),
    ).toThrow('Incomplete')
  })
})
describe('estimation and provenance', () => {
  it('keeps ET0 finite and nonnegative at both poles and under freezing conditions', () => {
    for (const lat of [-90, -80, 0, 80, 90])
      for (let month = 1; month <= 12; month++) {
        const value = estimateET0(-20, -10, lat, month)
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(0)
      }
  })
  it('converts radiation MJ to equivalent water depth in Hargreaves', () => {
    const july = estimateET0(20, 32, 30, 7) / 31
    expect(july).toBeGreaterThan(4)
    expect(july).toBeLessThan(7)
  })
  it('labels deterministic demo climate and example soil honestly', () => {
    const data = generateFallback(-30, -60)
    expect(data).toEqual(generateFallback(-30, -60))
    expect(data.kind).toBe('demo')
    expect(data.confidence.level).toBe('estimated')
    expect(getFallbackSoil().source).toBe('fallback')
    expect(data.monthly[0].tempAvg).toBeGreaterThan(data.monthly[6].tempAvg)
  })
  it('handles inclusive cross-year month ranges', () => {
    expect(monthRange(11, 2)).toEqual([11, 12, 1, 2])
    expect(monthRange(3, 3)).toEqual([3])
    expect(monthRange(2, 1)).toHaveLength(12)
  })
  it('computes regression and anomalies from supplied records only', () => {
    const analysis = analyzeSeries(
      Array.from({ length: 15 }, (_, i) => ({
        year: 2000 + i,
        rainfall: 100 + 10 * i,
        temp: 20 + 0.1 * i,
      })),
    )
    expect(analysis.rainfallTrendSlope).toBeCloseTo(10)
    expect(analysis.tempTrendSlope).toBeCloseTo(0.1)
    expect(() => analyzeSeries([])).toThrow()
  })
})
describe('SoilGrids profiles', () => {
  it('converts texture, pH, carbon and nitrogen units', () => {
    const soil = parseSoilGrids(soilResponse())
    expect(soil.ph).toBeCloseTo(6.5)
    expect(soil.organicCarbon).toBeCloseTo(12)
    expect(soil.clay).toBeCloseTo(25)
    expect(soil.sand).toBeCloseTo(40)
    expect(soil.nitrogen).toBeCloseTo(1.2)
    expect(soil.source).toBe('soilgrids')
  })
  it('weights standard depths by thickness, not by number of samples', () => {
    const data = soilResponse()
    data.properties.layers.find((l) => l.name === 'soc')!.depths[0].values.mean = 300
    expect(parseSoilGrids(data).organicCarbon).toBeCloseTo(15)
  })
  it('rejects a partial soil profile instead of filling missing properties with zero', () => {
    const data = soilResponse()
    data.properties.layers.pop()
    expect(() => parseSoilGrids(data)).toThrow('missing')
  })
})
describe('climate imports', () => {
  const demo = () => generateFallback(30, 71)
  it('accepts normalized JSON and recomputes derived values', () => {
    const d = demo()
    d.annualRainfall = 999999
    d.monthly[0].et0 = 999999
    const result = parseClimateImport(JSON.stringify(d), 'field.json', { lat: 30, lng: 71 })
    expect(result.kind).toBe('imported')
    expect(result.annualRainfall).toBe(demo().annualRainfall)
    expect(result.monthly[0].et0).toBe(demo().monthly[0].et0)
  })
  it('accepts exact normalized CSV units and omitted wetness', () => {
    const d = demo()
    const csv =
      'month,tempMin,tempMax,tempAvg,rainfall\n' +
      d.monthly
        .map((m) => [m.month, m.tempMin, m.tempMax, m.tempAvg, m.rainfall].join(','))
        .join('\n')
    expect(
      parseClimateImport(csv, 'field.csv', { lat: 30, lng: 71 }).monthly[0].soilMoistureRoot,
    ).toBeNull()
  })
  it.each(['missing', 'duplicate', 'blank', 'wrong-coordinates'])('rejects %s data', (kind) => {
    const d = demo()
    if (kind === 'missing') d.monthly.pop()
    if (kind === 'duplicate') d.monthly[0].month = 2
    if (kind === 'blank') d.monthly[0].rainfall = NaN
    if (kind === 'wrong-coordinates') d.lat = 10
    expect(() =>
      parseClimateImport(JSON.stringify(d), 'field.json', { lat: 30, lng: 71 }),
    ).toThrow()
  })
})
