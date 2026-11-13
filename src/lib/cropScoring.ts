import type {
  Crop,
  NASAClimateData,
  SoilData,
  CropSuitability,
  RotationStrategy,
  RotationCrop,
  FarmerPriorities,
  ClimateScenario,
  StrategyType,
} from '../types'
import { CROPS } from './cropDatabase'
import { clamp, monthRange, stressClimate, MONTHS } from './climate'
import { buildIrrigationPlan, totalIrrigationNeed } from './irrigationPlanner'
export const PRIORITY_KEYS: (keyof FarmerPriorities)[] = [
  'waterConservation',
  'soilHealth',
  'marketValue',
  'nitrogenFixing',
  'erosionControl',
  'riskReduction',
]
const round = (v: number) => Math.round(v * 10) / 10
function windowSuitability(
  crop: Crop,
  nasa: NASAClimateData,
  soil: SoilData | null,
  start: number,
  end: number,
): CropSuitability {
  const months = nasa.monthly.filter((m) => monthRange(start, end).includes(m.month))
  const tempScore =
    months.reduce((s, m) => {
      if (m.tempAvg < crop.tempMin || m.tempAvg > crop.tempMax) return s
      const distance = Math.max(crop.tempOptimal[0] - m.tempAvg, m.tempAvg - crop.tempOptimal[1], 0)
      const extremes = Math.max(crop.tempMin - m.tempMin, m.tempMax - crop.tempMax, 0)
      return s + clamp(100 - distance * 6 - extremes * 7)
    }, 0) / months.length
  const plan = buildIrrigationPlan(nasa.monthly, [
    { crop, monthStart: start, monthEnd: end, suitability: 0, waterGapMm: 0 },
  ])
  const need = plan.reduce((s, m) => s + m.cropWaterNeed, 0)
  const gap = totalIrrigationNeed(plan)
  const rainfallScore = clamp(100 * (1 - gap / Math.max(1, need)))
  const soilScore =
    soil?.source === 'soilgrids'
      ? clamp(100 - Math.max(crop.soilPh[0] - soil.ph, soil.ph - crop.soilPh[1], 0) * 35)
      : 60
  const suitabilityScore = clamp(tempScore * 0.6 + rainfallScore * 0.25 + soilScore * 0.15)
  return {
    crop,
    tempScore,
    rainfallScore,
    soilScore,
    suitabilityScore,
    reasons: [
      `${MONTHS[start - 1]}–${MONTHS[end - 1]} temperature fit ${round(tempScore)}/100.`,
      `Estimated supplemental water gap: ${Math.round(gap)} mm.`,
      soil?.source !== 'soilgrids'
        ? 'Soil suitability uses a neutral score until a field profile is available.'
        : `Soil pH ${soil.ph.toFixed(1)} compared with ${crop.soilPh.join('–')}.`,
    ],
  }
}
export function scoreCropSuitability(
  crop: Crop,
  nasa: NASAClimateData,
  soil: SoilData | null,
): CropSuitability {
  return windows(crop)
    .map(([s, e]) => windowSuitability(crop, nasa, soil, s, e))
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore)[0]
}
function windows(crop: Crop): [number, number][] {
  const duration = Math.min(12, Math.ceil((crop.growingDays[0] + crop.growingDays[1]) / 2 / 30.4))
  return Array.from({ length: 12 }, (_, i) => [i + 1, ((i + duration - 1) % 12) + 1])
}
export function calcWaterGap(
  crop: Crop,
  nasa: NASAClimateData,
  start: number,
  end: number,
): number {
  return totalIrrigationNeed(
    buildIrrigationPlan(nasa.monthly, [
      { crop, monthStart: start, monthEnd: end, suitability: 0, waterGapMm: 0 },
    ]),
  )
}
function evaluate(
  type: StrategyType,
  crops: RotationCrop[],
  nasa: NASAClimateData,
  soil: SoilData | null,
): RotationStrategy {
  const evaluated = crops.map((rc) => ({
    ...rc,
    suitability: windowSuitability(rc.crop, nasa, soil, rc.monthStart, rc.monthEnd)
      .suitabilityScore,
    waterGapMm: calcWaterGap(rc.crop, nasa, rc.monthStart, rc.monthEnd),
  }))
  const count = evaluated.length
  const weighted = (f: (c: Crop) => number) =>
    count ? evaluated.reduce((s, rc) => s + (f(rc.crop) * rc.suitability) / 100, 0) / count : 0
  const covered = new Set(evaluated.flatMap((c) => monthRange(c.monthStart, c.monthEnd))).size
  const irrigationTotal = evaluated.reduce((s, c) => s + c.waterGapMm, 0)
  const nitrogenBalance = evaluated.reduce((s, c) => s + c.crop.nitrogenContribution, 0)
  const fit = count ? evaluated.reduce((s, c) => s + c.suitability, 0) / count : 0
  const scores = {
    overall: 0,
    soilHealth: weighted((c) => c.organicMatterImpact * 70 + (c.nitrogenFixing ? 30 : 0)),
    waterConservation: count
      ? (clamp(100 - (irrigationTotal / Math.max(1, covered)) * 1.1) * fit) / 100
      : 0,
    nitrogenFixing: weighted((c) => (c.nitrogenFixing ? 100 : 0)),
    marketValue: weighted((c) => c.marketValue * 100),
    erosionControl: (weighted((c) => c.erosionReduction * 100) * covered) / 12,
    riskReduction:
      fit * 0.75 + (count ? (new Set(evaluated.map((c) => c.crop.family)).size / 3) * 25 : 0),
  }
  for (const key of PRIORITY_KEYS) scores[key] = round(clamp(scores[key]))
  const names = {
    baseline: ['Baseline', 'بنیادی فصل چکر'],
    'soil-first': ['Soil-first', 'مٹی کی صحت'],
    'water-saver': ['Water-saver', 'پانی کی بچت'],
  }
  const goal = {
    baseline: 'seasonal climate fit and an illustrative market index',
    'soil-first': 'legumes, organic matter and crop-family diversity',
    'water-saver': 'lower water gaps and drought-tolerant crops',
  }
  return {
    type,
    name: names[type][0],
    nameUrdu: names[type][1],
    crops: evaluated,
    scores,
    irrigationTotal,
    nitrogenBalance,
    explanation: count
      ? `Selected for ${goal[type]}. ${count} crops cover ${covered} of 12 months, with ${Math.round(irrigationTotal)} mm of estimated supplemental water and ${Math.round(fit)}/100 average seasonal suitability.`
      : 'No feasible annual crop window was found in this small crop library. Do not plant from these results; seek local advice.',
    benefits: count
      ? [
          `${covered} months of planned soil cover`,
          `${evaluated.filter((c) => c.crop.nitrogenFixing).length} nitrogen-fixing crop(s)`,
          `${new Set(evaluated.map((c) => c.crop.family)).size} crop families`,
        ]
      : [],
    gaps: [
      ...(nasa.kind !== 'live'
        ? ['Climate inputs are demo or user-supplied data; not verified NASA retrievals.']
        : []),
      ...(soil?.source !== 'soilgrids' ? ['No local soil profile: soil fit is provisional.'] : []),
      ...(covered < 12
        ? [
            `${12 - covered} months without a planned crop; confirm cover and transition periods locally.`,
          ]
        : []),
      ...(evaluated.some((c) => c.suitability < 55)
        ? ['At least one crop has a weak climate fit.']
        : []),
      'Market indices, nitrogen contributions and crop traits are illustrative assumptions, not yield or income predictions.',
      'Cultivar, planting dates, pests, labour and irrigation access need local verification.',
    ],
    expertReviewNeeded: true,
    expertReviewReason:
      'Review this preliminary plan with a local agronomist. Monthly climate averages cannot establish field-scale suitability or predict individual weather events.',
  }
}
export function buildRotationStrategies(
  nasa: NASAClimateData,
  soil: SoilData | null,
  priorities: FarmerPriorities,
): RotationStrategy[] {
  // Search all calendar starts globally; regional season names are never used for scheduling.
  const candidates = CROPS.filter((c) => c.id !== 'fallow' && c.season !== 'perennial')
    .flatMap((crop) =>
      windows(crop).map(([monthStart, monthEnd]) => {
        const fit = windowSuitability(crop, nasa, soil, monthStart, monthEnd)
        return {
          crop,
          monthStart,
          monthEnd,
          suitability: fit.suitabilityScore,
          tempScore: fit.tempScore,
          waterGapMm: calcWaterGap(crop, nasa, monthStart, monthEnd),
        }
      }),
    )
    .filter((c) => c.tempScore >= 55 && c.suitability >= 45)
  const types: StrategyType[] = ['baseline', 'soil-first', 'water-saver']
  const strategies = types.map((type) => {
    const objective = (c: (typeof candidates)[number]) => {
      if (type === 'soil-first')
        return (
          c.suitability * 0.55 + (c.crop.nitrogenFixing ? 25 : 0) + c.crop.organicMatterImpact * 20
        )
      if (type === 'water-saver')
        return (
          c.suitability * 0.5 +
          c.crop.droughtTolerance * 20 +
          30 * Math.max(0, 1 - c.waterGapMm / monthRange(c.monthStart, c.monthEnd).length / 100)
        )
      return c.suitability * 0.8 + c.crop.marketValue * 20
    }
    const sorted = [...candidates].sort(
      (a, b) =>
        objective(b) - objective(a) ||
        a.crop.id.localeCompare(b.crop.id) ||
        a.monthStart - b.monthStart,
    )
    const selected: RotationCrop[] = [],
      occupied = new Set<number>(),
      families = new Set<string>()
    for (const c of sorted) {
      if (selected.length === 3) break
      const months = monthRange(c.monthStart, c.monthEnd)
      if (families.has(c.crop.family) || months.some((m) => occupied.has(m))) continue
      selected.push(c)
      families.add(c.crop.family)
      months.forEach((m) => occupied.add(m))
    }
    selected.sort((a, b) => a.monthStart - b.monthStart)
    return evaluate(type, selected, nasa, soil)
  })
  return rankStrategies(strategies, priorities)
}
export function normalizedWeights(priorities: FarmerPriorities): FarmerPriorities {
  const clean = Object.fromEntries(
    PRIORITY_KEYS.map((k) => [k, Number.isFinite(priorities[k]) ? clamp(priorities[k]) : 0]),
  ) as unknown as FarmerPriorities
  const sum = Object.values(clean).reduce((a, b) => a + b, 0)
  return Object.fromEntries(
    PRIORITY_KEYS.map((k) => [k, sum ? clean[k] / sum : 1 / PRIORITY_KEYS.length]),
  ) as unknown as FarmerPriorities
}
export function rankStrategies(
  strategies: RotationStrategy[],
  priorities: FarmerPriorities,
): RotationStrategy[] {
  const weights = normalizedWeights(priorities)
  return strategies
    .map((s) => ({
      ...s,
      scores: {
        ...s.scores,
        overall: round(PRIORITY_KEYS.reduce((sum, k) => sum + s.scores[k] * weights[k], 0)),
      },
    }))
    .sort((a, b) => b.scores.overall - a.scores.overall || a.type.localeCompare(b.type))
}
export function applyClimateStress(
  strategies: RotationStrategy[],
  nasa: NASAClimateData,
  scenario: ClimateScenario,
  soil: SoilData | null,
  priorities: FarmerPriorities,
): RotationStrategy[] {
  const stressed = stressClimate(nasa, scenario.tempDelta, scenario.rainfallDelta)
  // Hold crops and planting windows fixed so before/after comparisons measure climate sensitivity.
  return rankStrategies(
    strategies.map((s) => evaluate(s.type, s.crops, stressed, soil)),
    priorities,
  )
}
