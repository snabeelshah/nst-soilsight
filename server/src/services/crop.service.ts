import type {
  Crop,
  NASAClimateData,
  SoilData,
  CropSuitability,
  RotationStrategy,
  RotationCrop,
  FarmerPriorities,
  StrategyType,
  NASAMonthlyData,
} from '../types/index.js'
import { clamp, monthRange, MONTHS } from './climate.service.js'

export const PRIORITY_KEYS: (keyof FarmerPriorities)[] = [
  'waterConservation',
  'soilHealth',
  'marketValue',
  'nitrogenFixing',
  'erosionControl',
  'riskReduction',
]

export const CROPS: Crop[] = [
  {
    id: 'wheat',
    name: 'Wheat',
    nameUrdu: 'گندم',
    family: 'Poaceae',
    category: 'cereal',
    growingDays: [100, 150],
    tempOptimal: [15, 22],
    tempMin: 3,
    tempMax: 32,
    rainfallNeeded: 350,
    droughtTolerance: 0.6,
    floodTolerance: 0.2,
    nitrogenFixing: false,
    nitrogenContribution: -60,
    erosionReduction: 0.5,
    organicMatterImpact: 0.4,
    marketValue: 0.8,
    waterUse: 3.5,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: false,
    climateZones: ['temperate', 'semi-arid', 'mediterranean'],
    soilPh: [5.5, 8.0],
    season: 'rabi',
    description: 'Staple cereal crop suited to cool, dry winters.',
    benefits: ['High market value', 'Established supply chains', 'Good ground cover'],
    risks: ['Rust disease pressure', 'Needs cool season', 'Moderate water demand'],
  },
  {
    id: 'rice',
    name: 'Rice (Paddy)',
    nameUrdu: 'چاول',
    family: 'Poaceae',
    category: 'cereal',
    growingDays: [120, 180],
    tempOptimal: [25, 35],
    tempMin: 20,
    tempMax: 40,
    rainfallNeeded: 1200,
    droughtTolerance: 0.1,
    floodTolerance: 0.9,
    nitrogenFixing: false,
    nitrogenContribution: -80,
    erosionReduction: 0.3,
    organicMatterImpact: 0.5,
    marketValue: 0.9,
    waterUse: 7.0,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: false,
    climateZones: ['tropical', 'subtropical', 'humid'],
    soilPh: [5.0, 7.0],
    season: 'kharif',
    description: 'High-water paddy rice for warm humid climates.',
    benefits: ['Highest market value', 'Staple food crop', 'Flood tolerant'],
    risks: ['Extremely high water demand', 'Methane emissions', 'Needs flooded conditions'],
  },
  {
    id: 'maize',
    name: 'Maize (Corn)',
    nameUrdu: 'مکئی',
    family: 'Poaceae',
    category: 'cereal',
    growingDays: [80, 120],
    tempOptimal: [20, 30],
    tempMin: 10,
    tempMax: 38,
    rainfallNeeded: 500,
    droughtTolerance: 0.5,
    floodTolerance: 0.3,
    nitrogenFixing: false,
    nitrogenContribution: -100,
    erosionReduction: 0.4,
    organicMatterImpact: 0.6,
    marketValue: 0.75,
    waterUse: 5.0,
    coverCrop: false,
    deepRooted: true,
    pestBreaker: false,
    climateZones: ['tropical', 'subtropical', 'temperate'],
    soilPh: [5.8, 7.5],
    season: 'kharif',
    description: 'Versatile warm-season cereal with high yield potential.',
    benefits: ['High biomass', 'Versatile end-use', 'Good soil cover'],
    risks: ['High nitrogen demand', 'Pest sensitive', 'Moderate water need'],
  },
  {
    id: 'sorghum',
    name: 'Sorghum',
    nameUrdu: 'جوار',
    family: 'Poaceae',
    category: 'cereal',
    growingDays: [90, 130],
    tempOptimal: [26, 34],
    tempMin: 15,
    tempMax: 40,
    rainfallNeeded: 300,
    droughtTolerance: 0.85,
    floodTolerance: 0.4,
    nitrogenFixing: false,
    nitrogenContribution: -50,
    erosionReduction: 0.5,
    organicMatterImpact: 0.5,
    marketValue: 0.55,
    waterUse: 3.0,
    coverCrop: false,
    deepRooted: true,
    pestBreaker: true,
    climateZones: ['arid', 'semi-arid', 'tropical'],
    soilPh: [5.5, 8.5],
    season: 'kharif',
    description: 'Highly drought-tolerant cereal for arid/semi-arid regions.',
    benefits: ['Excellent drought tolerance', 'Low water use', 'Breaks cereal pest cycles'],
    risks: ['Lower market value than maize', 'Bird damage risk', 'Moderate nutritional value'],
  },
  {
    id: 'millet-pearl',
    name: 'Pearl Millet',
    nameUrdu: 'باجرہ',
    family: 'Poaceae',
    category: 'cereal',
    growingDays: [60, 90],
    tempOptimal: [28, 35],
    tempMin: 20,
    tempMax: 42,
    rainfallNeeded: 250,
    droughtTolerance: 0.9,
    floodTolerance: 0.3,
    nitrogenFixing: false,
    nitrogenContribution: -40,
    erosionReduction: 0.4,
    organicMatterImpact: 0.4,
    marketValue: 0.45,
    waterUse: 2.5,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: false,
    climateZones: ['arid', 'semi-arid'],
    soilPh: [5.0, 8.0],
    season: 'kharif',
    description: 'Fastest maturing drought-tolerant cereal.',
    benefits: ['Lowest water use', 'Heat tolerant', 'Short season allows double cropping'],
    risks: ['Low market value', 'Limited processing infrastructure', 'Bird damage'],
  },
  {
    id: 'barley',
    name: 'Barley',
    nameUrdu: 'جو',
    family: 'Poaceae',
    category: 'cereal',
    growingDays: [80, 120],
    tempOptimal: [12, 20],
    tempMin: 1,
    tempMax: 30,
    rainfallNeeded: 300,
    droughtTolerance: 0.65,
    floodTolerance: 0.2,
    nitrogenFixing: false,
    nitrogenContribution: -55,
    erosionReduction: 0.5,
    organicMatterImpact: 0.4,
    marketValue: 0.6,
    waterUse: 3.0,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: false,
    climateZones: ['temperate', 'semi-arid', 'boreal'],
    soilPh: [6.0, 8.5],
    season: 'rabi',
    description: 'Cold-hardy cereal tolerating poor soils and salinity.',
    benefits: ['Tolerates salinity', 'Cold hardy', 'Low input requirements'],
    risks: ['Low yield in tropics', 'Limited markets in some regions'],
  },
  {
    id: 'chickpea',
    name: 'Chickpea',
    nameUrdu: 'چنا',
    family: 'Fabaceae',
    category: 'legume',
    growingDays: [90, 120],
    tempOptimal: [15, 25],
    tempMin: 5,
    tempMax: 35,
    rainfallNeeded: 350,
    droughtTolerance: 0.75,
    floodTolerance: 0.1,
    nitrogenFixing: true,
    nitrogenContribution: 100,
    erosionReduction: 0.3,
    organicMatterImpact: 0.6,
    marketValue: 0.7,
    waterUse: 3.0,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: true,
    climateZones: ['semi-arid', 'mediterranean', 'subtropical'],
    soilPh: [5.5, 8.0],
    season: 'rabi',
    description: 'High-protein legume fixing 100+ kg N/ha. Ideal rabi rotation crop.',
    benefits: ['Fixes 100 kg N/ha', 'Improves soil structure', 'High protein food/feed'],
    risks: [
      'Sensitive to waterlogging',
      'Botrytis blight in humid conditions',
      'Soil-borne diseases if repeated',
    ],
  },
  {
    id: 'lentil',
    name: 'Lentil',
    nameUrdu: 'مسور',
    family: 'Fabaceae',
    category: 'legume',
    growingDays: [80, 110],
    tempOptimal: [15, 25],
    tempMin: 3,
    tempMax: 32,
    rainfallNeeded: 300,
    droughtTolerance: 0.7,
    floodTolerance: 0.1,
    nitrogenFixing: true,
    nitrogenContribution: 80,
    erosionReduction: 0.25,
    organicMatterImpact: 0.55,
    marketValue: 0.65,
    waterUse: 2.5,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: true,
    climateZones: ['temperate', 'semi-arid', 'mediterranean'],
    soilPh: [6.0, 8.0],
    season: 'rabi',
    description: 'Short-season legume ideal for cool dry winters.',
    benefits: ['Nitrogen fixing', 'Short season', 'Breaks cereal disease cycles'],
    risks: ['Low yield', 'Sensitive to salinity', 'Weed competition'],
  },
  {
    id: 'mungbean',
    name: 'Mung Bean',
    nameUrdu: 'مونگ',
    family: 'Fabaceae',
    category: 'legume',
    growingDays: [60, 90],
    tempOptimal: [25, 35],
    tempMin: 18,
    tempMax: 40,
    rainfallNeeded: 350,
    droughtTolerance: 0.6,
    floodTolerance: 0.2,
    nitrogenFixing: true,
    nitrogenContribution: 70,
    erosionReduction: 0.3,
    organicMatterImpact: 0.5,
    marketValue: 0.6,
    waterUse: 3.5,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: true,
    climateZones: ['tropical', 'subtropical', 'semi-arid'],
    soilPh: [5.5, 7.5],
    season: 'zaid',
    description: 'Short-season summer legume, ideal between kharif and rabi.',
    benefits: ['N-fixer in hot summers', 'Pest cycle breaker', 'Short season'],
    risks: ['Sensitive to frost', 'Limited storage life', 'Yellow mosaic virus risk'],
  },
  {
    id: 'cowpea',
    name: 'Cowpea',
    nameUrdu: 'لوبیا',
    family: 'Fabaceae',
    category: 'legume',
    growingDays: [60, 90],
    tempOptimal: [25, 35],
    tempMin: 18,
    tempMax: 42,
    rainfallNeeded: 300,
    droughtTolerance: 0.75,
    floodTolerance: 0.3,
    nitrogenFixing: true,
    nitrogenContribution: 90,
    erosionReduction: 0.4,
    organicMatterImpact: 0.6,
    marketValue: 0.5,
    waterUse: 3.0,
    coverCrop: true,
    deepRooted: false,
    pestBreaker: true,
    climateZones: ['tropical', 'semi-arid', 'arid'],
    soilPh: [5.5, 8.0],
    season: 'kharif',
    description: 'Drought-tolerant N-fixing cover/food legume for hot climates.',
    benefits: ['High N fixation in heat', 'Good soil cover', 'Dual purpose: food+fodder'],
    risks: ['Moderate market value', 'Pest sensitive', 'Not suited to cold'],
  },
  {
    id: 'soybean',
    name: 'Soybean',
    nameUrdu: 'سویابین',
    family: 'Fabaceae',
    category: 'legume',
    growingDays: [100, 140],
    tempOptimal: [22, 32],
    tempMin: 15,
    tempMax: 38,
    rainfallNeeded: 500,
    droughtTolerance: 0.5,
    floodTolerance: 0.3,
    nitrogenFixing: true,
    nitrogenContribution: 120,
    erosionReduction: 0.4,
    organicMatterImpact: 0.7,
    marketValue: 0.85,
    waterUse: 4.5,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: false,
    climateZones: ['temperate', 'subtropical'],
    soilPh: [6.0, 7.0],
    season: 'kharif',
    description: 'High-value oilseed+protein legume with strong N fixation.',
    benefits: ['Highest N fixation', 'High market value', 'Good for soil organic matter'],
    risks: ['Moderate water demand', 'Needs neutral pH', 'Pod shattering risk'],
  },
  {
    id: 'groundnut',
    name: 'Groundnut (Peanut)',
    nameUrdu: 'مونگ پھلی',
    family: 'Fabaceae',
    category: 'legume',
    growingDays: [100, 150],
    tempOptimal: [25, 33],
    tempMin: 18,
    tempMax: 40,
    rainfallNeeded: 500,
    droughtTolerance: 0.65,
    floodTolerance: 0.2,
    nitrogenFixing: true,
    nitrogenContribution: 85,
    erosionReduction: 0.3,
    organicMatterImpact: 0.6,
    marketValue: 0.75,
    waterUse: 4.0,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: true,
    climateZones: ['tropical', 'subtropical', 'semi-arid'],
    soilPh: [5.5, 7.0],
    season: 'kharif',
    description: 'Underground-fruiting legume with excellent N fixation.',
    benefits: ['N-fixing', 'Deep pod aeration improves soil', 'High value oil+protein'],
    risks: ['Aflatoxin risk in storage', 'Needs light sandy soils', 'Vulnerable to late leaf spot'],
  },
  {
    id: 'mustard',
    name: 'Mustard (Rapeseed)',
    nameUrdu: 'سرسوں',
    family: 'Brassicaceae',
    category: 'oilseed',
    growingDays: [90, 120],
    tempOptimal: [10, 22],
    tempMin: 2,
    tempMax: 30,
    rainfallNeeded: 350,
    droughtTolerance: 0.55,
    floodTolerance: 0.2,
    nitrogenFixing: false,
    nitrogenContribution: -60,
    erosionReduction: 0.5,
    organicMatterImpact: 0.5,
    marketValue: 0.7,
    waterUse: 3.5,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: true,
    climateZones: ['temperate', 'semi-arid'],
    soilPh: [5.5, 7.5],
    season: 'rabi',
    description: 'Winter oilseed breaking cereal disease cycles.',
    benefits: ['Pest cycle breaker', 'Good for soil biota', 'Established oil market'],
    risks: ['Sclerotinia risk', 'Not suited to heavy rainfall', 'Aphid pressure'],
  },
  {
    id: 'cotton',
    name: 'Cotton',
    nameUrdu: 'کپاس',
    family: 'Malvaceae',
    category: 'fiber',
    growingDays: [150, 200],
    tempOptimal: [25, 35],
    tempMin: 18,
    tempMax: 40,
    rainfallNeeded: 700,
    droughtTolerance: 0.55,
    floodTolerance: 0.2,
    nitrogenFixing: false,
    nitrogenContribution: -100,
    erosionReduction: 0.3,
    organicMatterImpact: 0.3,
    marketValue: 0.9,
    waterUse: 5.0,
    coverCrop: false,
    deepRooted: true,
    pestBreaker: false,
    climateZones: ['tropical', 'subtropical', 'semi-arid'],
    soilPh: [5.8, 8.0],
    season: 'kharif',
    description: 'High-value fiber crop for warm long-season areas.',
    benefits: ['Very high market value', 'Deep rooting', 'Long growing season income'],
    risks: ['High water demand', 'Heavy pesticide use', 'Soil nutrient depletion'],
  },
  {
    id: 'potato',
    name: 'Potato',
    nameUrdu: 'آلو',
    family: 'Solanaceae',
    category: 'root',
    growingDays: [70, 120],
    tempOptimal: [15, 22],
    tempMin: 7,
    tempMax: 30,
    rainfallNeeded: 500,
    droughtTolerance: 0.3,
    floodTolerance: 0.1,
    nitrogenFixing: false,
    nitrogenContribution: -100,
    erosionReduction: 0.2,
    organicMatterImpact: 0.4,
    marketValue: 0.75,
    waterUse: 5.0,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: false,
    climateZones: ['temperate', 'subtropical', 'highland'],
    soilPh: [5.0, 6.5],
    season: 'rabi',
    description: 'High-yielding cool-season root vegetable with strong market.',
    benefits: ['High caloric yield', 'Good income potential', 'Short season'],
    risks: ['Late blight risk', 'High input requirement', 'Soil-borne diseases without rotation'],
  },
  {
    id: 'onion',
    name: 'Onion',
    nameUrdu: 'پیاز',
    family: 'Alliaceae',
    category: 'vegetable',
    growingDays: [120, 150],
    tempOptimal: [15, 25],
    tempMin: 7,
    tempMax: 32,
    rainfallNeeded: 450,
    droughtTolerance: 0.4,
    floodTolerance: 0.1,
    nitrogenFixing: false,
    nitrogenContribution: -70,
    erosionReduction: 0.1,
    organicMatterImpact: 0.3,
    marketValue: 0.7,
    waterUse: 4.0,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: true,
    climateZones: ['temperate', 'semi-arid', 'subtropical'],
    soilPh: [6.0, 7.5],
    season: 'rabi',
    description: 'Allium crop with good market value that breaks cereal cycles.',
    benefits: ['High market value', 'Pest cycle breaker', 'Good cold tolerance'],
    risks: ['Thrips damage', 'Sensitive to waterlogging', 'Storage losses'],
  },
  {
    id: 'fallow',
    name: 'Fallow (Bare/Managed)',
    nameUrdu: 'پرتی',
    family: '-',
    category: 'forage',
    growingDays: [60, 180],
    tempOptimal: [0, 50],
    tempMin: -20,
    tempMax: 50,
    rainfallNeeded: 0,
    droughtTolerance: 1.0,
    floodTolerance: 0.5,
    nitrogenFixing: false,
    nitrogenContribution: 0,
    erosionReduction: -0.3,
    organicMatterImpact: -0.2,
    marketValue: 0.0,
    waterUse: 0.5,
    coverCrop: false,
    deepRooted: false,
    pestBreaker: false,
    climateZones: ['all'],
    soilPh: [0, 14],
    season: 'flexible',
    description: 'Resting the field. Positive if weed-managed; risky if bare.',
    benefits: ['Breaks disease cycles if managed', 'Moisture recharge', 'Low cost'],
    risks: ['Erosion risk if bare', 'Weed build-up', 'No income'],
  },
]

export const KC_TABLE: Record<string, number> = {
  wheat: 1.15,
  rice: 1.2,
  maize: 1.2,
  sorghum: 1.0,
  'millet-pearl': 1.0,
  barley: 1.15,
  chickpea: 1.0,
  lentil: 1.1,
  mungbean: 1.05,
  cowpea: 1.05,
  soybean: 1.15,
  groundnut: 1.15,
  mustard: 1.1,
  cotton: 1.15,
  potato: 1.15,
  onion: 1.05,
}

export interface IrrigationMonth {
  month: number
  monthName: string
  cropName: string | null
  et0: number
  rainfall: number
  effectiveRainfall: number
  cropWaterNeed: number
  waterGap: number
  surplus: number
}

export function buildIrrigationPlan(
  monthly: NASAMonthlyData[],
  crops: RotationCrop[],
): IrrigationMonth[] {
  return monthly.map((m) => {
    const active = crops.find((c) => monthRange(c.monthStart, c.monthEnd).includes(m.month))
    const season = active ? monthRange(active.monthStart, active.monthEnd) : []
    const index = season.indexOf(m.month)
    const stage = index === 0 ? 0.55 : index === season.length - 1 ? 0.75 : 1
    const cropWaterNeed = active ? m.et0 * (KC_TABLE[active.crop.id] ?? 1) * stage : 0
    const effectiveRainfall = m.rainfall * 0.8
    return {
      month: m.month,
      monthName: MONTHS[m.month - 1],
      cropName: active?.crop.name ?? null,
      et0: m.et0,
      rainfall: m.rainfall,
      effectiveRainfall,
      cropWaterNeed,
      waterGap: Math.max(0, cropWaterNeed - effectiveRainfall),
      surplus: Math.max(0, effectiveRainfall - cropWaterNeed),
    }
  })
}

export const totalIrrigationNeed = (plan: IrrigationMonth[]) =>
  plan.reduce((s, m) => s + m.waterGap, 0)

const round = (v: number) => Math.round(v * 10) / 10

export function windowSuitability(
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

export function windows(crop: Crop): [number, number][] {
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

export function evaluate(
  type: StrategyType,
  crops: RotationCrop[],
  nasa: NASAClimateData,
  soil: SoilData | null,
): RotationStrategy {
  const evaluated = crops.map((rc) => ({
    ...rc,
    suitability: windowSuitability(rc.crop, nasa, soil, rc.monthStart, rc.monthEnd).suitabilityScore,
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

  const benefits: string[] = count
    ? [
        `${covered} months of planned soil cover`,
        `${evaluated.filter((c) => c.crop.nitrogenFixing).length} nitrogen-fixing crop(s)`,
        `${new Set(evaluated.map((c) => c.crop.family)).size} crop families`,
      ]
    : []

  const risks: string[] = []
  if (evaluated.some((c) => c.suitability < 55)) {
    risks.push('At least one crop has a weak seasonal climate fit.')
  }
  if (irrigationTotal > 500) {
    risks.push('High annual irrigation water gap; dependent on reliable surface or tubewell water.')
  }
  if (covered < 8) {
    risks.push('Extended bare-soil window poses weed and erosion risks.')
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
      : 'No feasible annual crop window was found in this crop library. Do not plant from these results; seek local advice.',
    benefits,
    risks,
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
      if (type === 'soil-first') {
        return (
          c.suitability * 0.55 + (c.crop.nitrogenFixing ? 25 : 0) + c.crop.organicMatterImpact * 20
        )
      }
      if (type === 'water-saver') {
        return (
          c.suitability * 0.5 +
          c.crop.droughtTolerance * 20 +
          30 * Math.max(0, 1 - c.waterGapMm / monthRange(c.monthStart, c.monthEnd).length / 100)
        )
      }
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
