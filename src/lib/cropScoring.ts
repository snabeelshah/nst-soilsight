import type {
  Crop, NASAClimateData, SoilData, CropSuitability,
  RotationStrategy, RotationCrop, FarmerPriorities, NASAMonthlyData, ClimateScenario
} from '../types'
import { CROPS } from './cropDatabase'

// ── Suitability Scoring ──

function scoreTempSuitability(crop: Crop, avgTemp: number, minMonthTemp: number, maxMonthTemp: number): number {
  // Check absolute limits first
  if (minMonthTemp < crop.tempMin || maxMonthTemp > crop.tempMax) return 20
  const [optLow, optHigh] = crop.tempOptimal
  if (avgTemp >= optLow && avgTemp <= optHigh) return 100
  const distFromOpt = avgTemp < optLow ? optLow - avgTemp : avgTemp - optHigh
  const range = crop.tempMax - crop.tempMin
  return Math.max(20, 100 - (distFromOpt / range) * 120)
}

function scoreRainfallSuitability(crop: Crop, annualRainfall: number): number {
  const need = crop.rainfallNeeded
  if (crop.id === 'fallow') return 100
  if (annualRainfall >= need * 0.7 && annualRainfall <= need * 2.5) {
    // Sweet spot
    const ratio = annualRainfall / need
    return ratio >= 1 && ratio <= 1.5 ? 100 : 100 - Math.abs(ratio - 1.25) * 40
  }
  if (annualRainfall < need * 0.5) {
    // Can partially compensate with drought tolerance
    const deficit = (need - annualRainfall) / need
    return Math.max(10, 60 - deficit * 100 + crop.droughtTolerance * 40)
  }
  // Too much rain
  return Math.max(20, 80 - (annualRainfall - need * 2.5) / need * 50 + crop.floodTolerance * 20)
}

function scoreSoilSuitability(crop: Crop, soil: SoilData | null): number {
  if (!soil) return 60 // neutral if unknown
  const [phLow, phHigh] = crop.soilPh
  const ph = soil.ph

  let phScore: number
  if (ph >= phLow && ph <= phHigh) phScore = 100
  else {
    const dist = ph < phLow ? phLow - ph : ph - phHigh
    phScore = Math.max(10, 100 - dist * 30)
  }

  // SOC bonus for high-OM crops
  const socScore = soil.organicCarbon > 15 ? 100 : 60 + soil.organicCarbon * 2.7

  return phScore * 0.6 + socScore * 0.4
}

export function scoreCropSuitability(crop: Crop, nasa: NASAClimateData, soil: SoilData | null): CropSuitability {
  const avgTemp = nasa.avgTemp
  const minMonthTemp = Math.min(...nasa.monthly.map(m => m.tempMin))
  const maxMonthTemp = Math.max(...nasa.monthly.map(m => m.tempMax))

  const tempScore = scoreTempSuitability(crop, avgTemp, minMonthTemp, maxMonthTemp)
  const rainfallScore = scoreRainfallSuitability(crop, nasa.annualRainfall)
  const soilScore = scoreSoilSuitability(crop, soil)
  const suitabilityScore = tempScore * 0.4 + rainfallScore * 0.4 + soilScore * 0.2

  const reasons: string[] = []
  if (tempScore < 50) reasons.push(`Temperature mismatch: field avg ${avgTemp.toFixed(1)}°C vs crop optimum ${crop.tempOptimal[0]}–${crop.tempOptimal[1]}°C`)
  if (rainfallScore < 50) reasons.push(`Rainfall mismatch: ${nasa.annualRainfall.toFixed(0)}mm vs crop need ${crop.rainfallNeeded}mm`)
  if (soilScore < 50 && soil) reasons.push(`Soil pH ${soil.ph.toFixed(1)} outside crop range ${crop.soilPh[0]}–${crop.soilPh[1]}`)
  if (suitabilityScore >= 75) reasons.push('Well-suited to local climate and soil conditions')

  return { crop, suitabilityScore, tempScore, rainfallScore, soilScore, reasons }
}

// ── Water Gap Calculation ──

export function calcWaterGap(crop: Crop, nasa: NASAClimateData, monthStart: number, monthEnd: number): number {
  const months = monthStart <= monthEnd
    ? nasa.monthly.slice(monthStart - 1, monthEnd)
    : [...nasa.monthly.slice(monthStart - 1), ...nasa.monthly.slice(0, monthEnd)]

  const totalRainfall = months.reduce((s, m) => s + m.rainfall, 0)
  const growingDaysAvg = (crop.growingDays[0] + crop.growingDays[1]) / 2
  const cropWaterNeed = crop.waterUse * growingDaysAvg
  return Math.max(0, cropWaterNeed - totalRainfall)
}

// ── Rotation Builder ──

function buildSeasonCover(crops: RotationCrop[]): boolean[] {
  const covered = new Array(12).fill(false)
  for (const rc of crops) {
    let m = rc.monthStart - 1
    while (m !== rc.monthEnd) {
      covered[m] = true
      m = (m + 1) % 12
    }
    covered[rc.monthEnd - 1] = true
  }
  return covered
}

function assignMonths(crop: Crop, existing: RotationCrop[], nasa: NASAClimateData): [number, number] | null {
  // Try to find a slot that fits the crop's growing days and climate preferences
  const minDays = crop.growingDays[0]
  const maxDays = crop.growingDays[1]
  const covered = buildSeasonCover(existing)

  // For seasonal crops, prefer their season
  const preferredStarts: number[] = []
  if (crop.season === 'kharif') preferredStarts.push(6, 7, 5)  // June/July/May
  else if (crop.season === 'rabi') preferredStarts.push(10, 11, 9)  // Oct/Nov/Sep
  else if (crop.season === 'zaid') preferredStarts.push(3, 4, 2)  // Mar/Apr/Feb
  else preferredStarts.push(...[6, 10, 3, 1, 4, 7, 9, 2, 5, 8, 11, 12])

  for (const start of preferredStarts) {
    const months = Math.round((minDays + maxDays) / 2 / 30)
    const end = ((start - 1 + months) % 12) + 1

    // Check no overlap
    let hasOverlap = false
    for (let i = 0; i < months; i++) {
      if (covered[(start - 1 + i) % 12]) { hasOverlap = true; break }
    }
    if (!hasOverlap) return [start, end]
  }
  return null
}

type StrategyType = 'baseline' | 'soil-first' | 'water-saver'

function strategyScore(crops: RotationCrop[], suitabilities: CropSuitability[]): RotationStrategy['scores'] {
  const getSuit = (id: string) => suitabilities.find(s => s.crop.id === id)?.suitabilityScore ?? 50
  const weighted = (fn: (c: Crop) => number) => crops.reduce((s, rc) => s + fn(rc.crop) * (getSuit(rc.crop.id) / 100), 0) / Math.max(1, crops.length)

  const nitrogenBalance = crops.reduce((s, rc) => s + rc.crop.nitrogenContribution, 0)
  const nScore = Math.min(100, Math.max(0, 50 + nitrogenBalance / 2))
  const soilHealth = weighted(c => c.organicMatterImpact * 100) * 0.4 + nScore * 0.3 + weighted(c => c.erosionReduction * 100) * 0.3
  const waterCons = 100 - weighted(c => c.waterUse * 10)
  const nFix = weighted(c => c.nitrogenFixing ? c.nitrogenContribution : 0) / 1.5
  const market = weighted(c => c.marketValue * 100)
  const erosion = weighted(c => c.erosionReduction * 100)
  const riskRed = weighted(c => (c.pestBreaker ? 20 : 0) + (c.coverCrop ? 15 : 0) + 65)

  const overall = soilHealth * 0.25 + waterCons * 0.2 + nFix * 0.15 + market * 0.2 + erosion * 0.1 + riskRed * 0.1
  return { overall, soilHealth, waterConservation: waterCons, nitrogenFixing: nFix, marketValue: market, erosionControl: erosion, riskReduction: riskRed }
}

function generateExplanation(strategy: StrategyType, crops: RotationCrop[], scores: RotationStrategy['scores'], nasa: NASAClimateData): string {
  const cropList = crops.map(rc => rc.crop.name).join(', ')
  const templates: Record<StrategyType, string> = {
    baseline: `This baseline rotation (${cropList}) is selected for the best overall fit to your climate (avg ${nasa.avgTemp.toFixed(1)}°C, ${nasa.annualRainfall.toFixed(0)}mm/yr). Each crop matches local temperature and rainfall. Overall score: ${scores.overall.toFixed(0)}/100.`,
    'soil-first': `This soil-restoration rotation (${cropList}) prioritises nitrogen fixation (${scores.nitrogenFixing.toFixed(0)}/100) and organic matter building (${scores.soilHealth.toFixed(0)}/100). Legumes and cover crops actively rebuild depleted soils over 2–3 seasons.`,
    'water-saver': `This water-conservative rotation (${cropList}) minimises irrigation needs (water score: ${scores.waterConservation.toFixed(0)}/100). All selected crops tolerate the typical dry months in your location, reducing dependency on irrigation infrastructure.`,
  }
  return templates[strategy]
}

// ── Main Rotation Builder ──

export function buildRotationStrategies(
  nasa: NASAClimateData,
  soil: SoilData | null,
  priorities: FarmerPriorities
): RotationStrategy[] {
  const suitabilities = CROPS.map(c => scoreCropSuitability(c, nasa, soil))
  const suited = suitabilities.filter(s => s.suitabilityScore >= 40).sort((a, b) => b.suitabilityScore - a.suitabilityScore)

  function buildRotation(filterFn: (s: CropSuitability) => boolean, maxCrops = 3): RotationCrop[] {
    const pool = suited.filter(filterFn).slice(0, 10)
    const selected: RotationCrop[] = []

    for (const suit of pool) {
      if (selected.length >= maxCrops) break
      const slot = assignMonths(suit.crop, selected, nasa)
      if (!slot) continue
      const waterGap = calcWaterGap(suit.crop, nasa, slot[0], slot[1])
      selected.push({ crop: suit.crop, monthStart: slot[0], monthEnd: slot[1], suitability: suit.suitabilityScore, waterGapMm: waterGap })
    }
    return selected
  }

  // Baseline: best overall suitability
  const baselineCrops = buildRotation(s => s.suitabilityScore >= 60)

  // Soil-first: prioritise N-fixing + high organic matter
  const soilCrops = buildRotation(s =>
    s.crop.nitrogenFixing || s.crop.coverCrop || s.crop.organicMatterImpact > 0.6
  )

  // Water-saver: lowest water use + highest drought tolerance
  const waterCrops = buildRotation(s =>
    s.crop.waterUse < 4.5 && s.crop.droughtTolerance > 0.5
  )

  const makeStrategy = (type: StrategyType, name: string, nameUrdu: string, crops: RotationCrop[]): RotationStrategy => {
    if (crops.length === 0) {
      // Fallback: take top 2 suited crops
      const fallback = suited.slice(0, 2)
      fallback.forEach(suit => {
        const slot = assignMonths(suit.crop, crops, nasa)
        if (slot) crops.push({ crop: suit.crop, monthStart: slot[0], monthEnd: slot[1], suitability: suit.suitabilityScore, waterGapMm: calcWaterGap(suit.crop, nasa, slot[0], slot[1]) })
      })
    }
    const scores = strategyScore(crops, suitabilities)
    const explanation = generateExplanation(type, crops, scores, nasa)
    const nitrogenBalance = crops.reduce((s, rc) => s + rc.crop.nitrogenContribution, 0)
    const irrigationTotal = crops.reduce((s, rc) => s + rc.waterGapMm, 0)
    const hasKnowledgeGap = crops.some(rc => rc.suitability < 60)
    const needsExpert = scores.soilHealth < 50 || irrigationTotal > 500 || nitrogenBalance < -200

    return {
      type, name, nameUrdu, crops, scores, explanation,
      benefits: crops.flatMap(rc => rc.crop.benefits.slice(0, 2)),
      gaps: [
        ...(hasKnowledgeGap ? ['Some crops have limited local trial data — verify with district agriculture office'] : []),
        ...(irrigationTotal > 300 ? [`Irrigation infrastructure needed: ${irrigationTotal.toFixed(0)}mm/yr estimated`] : []),
        ...(nitrogenBalance < -100 ? ['Nitrogen deficit may require external fertiliser input'] : []),
        'Actual yields depend on seed quality, soil management and local pest pressure',
      ],
      expertReviewNeeded: needsExpert,
      expertReviewReason: needsExpert ? 'This rotation shows significant gaps that require review by a local agricultural extension officer before implementation.' : '',
      irrigationTotal,
      nitrogenBalance,
    }
  }

  const strategies = [
    makeStrategy('baseline', 'Baseline Rotation', 'بنیادی فصل چکر', baselineCrops),
    makeStrategy('soil-first', 'Soil Restoration', 'مٹی بحالی', soilCrops),
    makeStrategy('water-saver', 'Water-Smart Rotation', 'پانی بچت', waterCrops),
  ]
  return rankStrategies(strategies, priorities)
}

export function rankStrategies(strategies: RotationStrategy[], priorities: FarmerPriorities): RotationStrategy[] {
  const total = Object.values(priorities).reduce((s, v) => s + v, 0) || 1

  return [...strategies].sort((a, b) => {
    const score = (s: RotationStrategy) =>
      (s.scores.waterConservation * priorities.waterConservation +
       s.scores.soilHealth * priorities.soilHealth +
       s.scores.marketValue * priorities.marketValue +
       s.scores.nitrogenFixing * priorities.nitrogenFixing +
       s.scores.erosionControl * priorities.erosionControl +
       s.scores.riskReduction * priorities.riskReduction) / total
    return score(b) - score(a)
  })
}

export function applyClimateStress(strategies: RotationStrategy[], nasa: NASAClimateData, scenario: ClimateScenario, soil: SoilData | null, priorities: FarmerPriorities): RotationStrategy[] {
  const stressedNasa: NASAClimateData = {
    ...nasa,
    avgTemp: nasa.avgTemp + scenario.tempDelta,
    annualRainfall: nasa.annualRainfall * (1 + scenario.rainfallDelta / 100),
    monthly: nasa.monthly.map(m => ({
      ...m,
      tempMin: m.tempMin + scenario.tempDelta,
      tempMax: m.tempMax + scenario.tempDelta,
      tempAvg: m.tempAvg + scenario.tempDelta,
      rainfall: m.rainfall * (1 + scenario.rainfallDelta / 100),
    })),
  }
  return buildRotationStrategies(stressedNasa, soil, priorities)
}
