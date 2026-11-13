import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  buildRotationStrategies,
  applyClimateStress,
  rankStrategies,
  normalizedWeights,
  PRIORITY_KEYS,
} from '../src/lib/cropScoring'
import { buildIrrigationPlan } from '../src/lib/irrigationPlanner'
import { generateFallback } from '../src/api/nasa-power'
import { getFallbackSoil } from '../src/api/soilgrids'
import { monthRange } from '../src/lib/climate'
import { createField, demoField, formatCoordinates } from '../src/lib/geometry'
import { buildRiskCalendar } from '../src/lib/riskCalendar'
import { generateActionPlan } from '../src/lib/actionPlan'
import { useAppStore, DEFAULT_PRIORITIES } from '../src/store/useAppStore'
import { climateResponse, soilResponse } from './fixtures'
import { answerQuestion } from '../src/lib/advisor'
const nasa = generateFallback(30, 71),
  soil = getFallbackSoil()
const plans = () => buildRotationStrategies(nasa, soil, DEFAULT_PRIORITIES)
afterEach(() => vi.unstubAllGlobals())
describe('field geometry', () => {
  it('computes an equatorial square area and centroid from its coordinates', () => {
    const field = createField([
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.01 },
      { lat: 0.01, lng: 0.01 },
      { lat: 0.01, lng: 0 },
    ])
    expect(field.areaHectares).toBeCloseTo(123.643, 1)
    expect(field.center).toEqual({ lat: 0.005, lng: 0.005 })
    expect(field.areaAcres / field.areaHectares).toBeCloseTo(2.47105)
  })
  it('rejects degenerate and date-line-crossing polygons', () => {
    expect(() =>
      createField([
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 2 },
      ]),
    ).toThrow()
    expect(() =>
      createField([
        { lat: 1, lng: 179 },
        { lat: 1, lng: -179 },
        { lat: 2, lng: 179 },
      ]),
    ).toThrow('date line')
  })
  it('formats southern and western coordinates correctly', () =>
    expect(formatCoordinates(-30, -60)).toBe('30.0000°S, 60.0000°W'))
})
describe('rotation planning and scoring', () => {
  it.each([
    [30, 71],
    [-30, -60],
    [0, 20],
    [65, 15],
    [-65, 15],
  ])(
    'keeps windows non-overlapping, scores bounded and perennial crops out at %s,%s',
    (lat, lon) => {
      const rotations = buildRotationStrategies(
        generateFallback(lat, lon),
        soil,
        DEFAULT_PRIORITIES,
      )
      expect(rotations).toHaveLength(3)
      for (const plan of rotations) {
        const months = plan.crops.flatMap((c) => monthRange(c.monthStart, c.monthEnd))
        expect(new Set(months).size).toBe(months.length)
        expect(plan.crops.every((c) => c.crop.season !== 'perennial')).toBe(true)
        for (const score of Object.values(plan.scores)) {
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(100)
        }
      }
    },
  )
  it('shifts planting windows to the opposite hemisphere with mirrored climate', () => {
    const north = buildRotationStrategies(generateFallback(30, 71), soil, DEFAULT_PRIORITIES)
    const south = buildRotationStrategies(generateFallback(-30, 71), soil, DEFAULT_PRIORITIES)
    const n = north.find((p) => p.type === 'baseline')!,
      s = south.find((p) => p.type === 'baseline')!
    expect(n.crops.length).toBeGreaterThan(0)
    expect(n.crops.map((c) => c.monthStart)).not.toEqual(s.crops.map((c) => c.monthStart))
  })
  it('displays the weighted total actually used for sorting, without mutating previous results', () => {
    const original = plans(),
      snapshot = JSON.stringify(original)
    const priorities = {
      ...DEFAULT_PRIORITIES,
      marketValue: 100,
      soilHealth: 0,
      waterConservation: 0,
      nitrogenFixing: 0,
      erosionControl: 0,
      riskReduction: 0,
    }
    const ranked = rankStrategies(original, priorities)
    for (const r of ranked) expect(r.scores.overall).toBe(r.scores.marketValue)
    expect(ranked[0].scores.overall).toBeGreaterThanOrEqual(ranked[1].scores.overall)
    expect(JSON.stringify(original)).toBe(snapshot)
  })
  it('uses equal weights for all-zero priorities', () => {
    const weights = normalizedWeights(
      Object.fromEntries(PRIORITY_KEYS.map((k) => [k, 0])) as unknown as typeof DEFAULT_PRIORITIES,
    )
    expect(Object.values(weights).every((x) => x === 1 / 6)).toBe(true)
  })
  it('uses the same monthly water gaps everywhere and allocates no irrigation to bare months', () => {
    for (const strategy of plans()) {
      const monthly = buildIrrigationPlan(nasa.monthly, strategy.crops)
      expect(monthly.reduce((s, m) => s + m.waterGap, 0)).toBeCloseTo(strategy.irrigationTotal)
      expect(
        monthly.filter((m) => !m.cropName).every((m) => m.waterGap === 0 && m.cropWaterNeed === 0),
      ).toBe(true)
    }
  })
  it('does not offset a dry month water gap with a later wet month', () => {
    const strategy = plans()[0],
      monthly = nasa.monthly.map((m) => ({ ...m, rainfall: m.month % 2 ? 0 : 10000 }))
    const water = buildIrrigationPlan(monthly, strategy.crops)
    expect(water.some((m) => m.cropName && m.waterGap > 0)).toBe(true)
  })
  it('holds crop identities and windows fixed under stress and updates water gaps', () => {
    const baseline = plans(),
      stressed = applyClimateStress(
        baseline,
        nasa,
        { tempDelta: 3, rainfallDelta: -30 },
        soil,
        DEFAULT_PRIORITIES,
      )
    for (const s of stressed) {
      const old = baseline.find((p) => p.type === s.type)!
      expect(s.crops.map((c) => [c.crop.id, c.monthStart, c.monthEnd])).toEqual(
        old.crops.map((c) => [c.crop.id, c.monthStart, c.monthEnd]),
      )
      expect(s.irrigationTotal).toBeGreaterThanOrEqual(old.irrigationTotal)
    }
    expect(
      applyClimateStress(
        baseline,
        nasa,
        { tempDelta: 0, rainfallDelta: 0 },
        soil,
        DEFAULT_PRIORITIES,
      ),
    ).toEqual(baseline)
  })
  it('reports no feasible crops at an extreme site instead of a positive empty-plan score', () => {
    const polar = {
      ...nasa,
      monthly: nasa.monthly.map((m) => ({ ...m, tempMin: -50, tempMax: -30, tempAvg: -40 })),
    }
    const result = buildRotationStrategies(polar, soil, DEFAULT_PRIORITIES)
    expect(result.every((s) => s.crops.length === 0 && s.scores.overall === 0)).toBe(true)
  })
  it('generates the action plan without reordering the rotation', () => {
    const strategy = plans()[0],
      before = JSON.stringify(strategy)
    const action = generateActionPlan(strategy, nasa, soil)
    expect(JSON.stringify(strategy)).toBe(before)
    expect(action.steps.length).toBe(strategy.crops.length * 3)
    for (const step of action.steps) expect(step.month).toBeGreaterThanOrEqual(1)
  })
  it('does not present monthly rainfall as proof of flooding', () => {
    const risk = buildRiskCalendar([{ ...nasa.monthly[0], rainfall: 350 }])[0]
    expect(risk.description.join(' ')).toContain('cannot predict flooding')
  })
  it('answers using the actual winning water gap and declines unsupported questions', () => {
    const strategies = plans()
    expect(answerQuestion('water', nasa, soil, strategies)).toContain(
      `${Math.round(strategies[0].irrigationTotal)} mm`,
    )
    expect(answerQuestion('tomorrow price?', nasa, soil, strategies)).toContain('cannot answer')
  })
})
describe('request ownership', () => {
  it('clears derived data when a field is edited or deleted', () => {
    useAppStore.getState().loadDemo(30, 71, 'Test')
    useAppStore.getState().setField(demoField(-30, -60))
    expect(useAppStore.getState().nasaData).toBeNull()
    expect(useAppStore.getState().rankedStrategies).toEqual([])
    useAppStore.getState().setField(null)
    expect(useAppStore.getState().field).toBeNull()
  })
  it('ignores an old response after the field changes', async () => {
    const resolvers: ((response: Response) => void)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => resolvers.push(resolve))),
    )
    useAppStore.getState().setField(demoField(30, 71))
    const pending = useAppStore.getState().fetchData()
    useAppStore.getState().setField(demoField(-30, -60))
    resolvers[0](Response.json(climateResponse()))
    resolvers[1](Response.json(soilResponse()))
    await pending
    expect(useAppStore.getState().nasaData).toBeNull()
    expect(useAppStore.getState().field!.center.lat).toBeCloseTo(-30)
  })
})
