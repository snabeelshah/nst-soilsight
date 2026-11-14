export interface LatLng {
  lat: number
  lng: number
}
export interface FieldPolygon {
  coordinates: LatLng[]
  center: LatLng
  areaHectares: number
  areaAcres: number
}
export interface DataConfidence {
  level: 'observed' | 'modelled' | 'estimated'
  label: string
  description: string
  color: string
}
export interface NASAMonthlyData {
  month: number
  tempMin: number
  tempMax: number
  tempAvg: number
  rainfall: number
  soilMoistureRoot: number | null
  soilMoistureProf: number | null
  et0: number
}
export interface NASAClimateData {
  monthly: NASAMonthlyData[]
  annualRainfall: number
  avgTemp: number
  confidence: DataConfidence
  source: string
  lat: number
  lon: number
  kind: 'live' | 'demo' | 'imported'
  sourceUrl?: string
  retrievedAt?: string
  period: string
}
export interface NASARecentDay {
  date: string
  tempAvg: number
  rainfall: number
  soilMoistureRoot: number | null
  soilMoistureProf: number | null
}
export interface NASARecentData {
  days: NASARecentDay[]
  latest: NASARecentDay
  rainfall7Days: number
  rainfall30Days: number
  avgTemp7Days: number
  confidence: DataConfidence
  source: string
  sourceUrl: string
  retrievedAt: string
  period: string
}
export interface SoilData {
  ph: number
  organicCarbon: number
  clay: number
  sand: number
  silt: number
  cec: number
  nitrogen: number
  confidence: DataConfidence
  source: 'soilgrids' | 'fallback'
  textureClass: string
  sourceUrl?: string
}
export type RiskType = 'frost' | 'heat' | 'drought' | 'flood' | 'bare-field' | 'none'
export interface MonthRisk {
  month: number
  monthName: string
  risks: RiskType[]
  severity: 'low' | 'medium' | 'high'
  description: string[]
}
export interface Crop {
  id: string
  name: string
  nameUrdu: string
  family: string
  category: 'cereal' | 'legume' | 'vegetable' | 'oilseed' | 'fiber' | 'forage' | 'root' | 'fruit'
  growingDays: [number, number]
  tempOptimal: [number, number]
  tempMin: number
  tempMax: number
  rainfallNeeded: number
  droughtTolerance: number
  floodTolerance: number
  nitrogenFixing: boolean
  nitrogenContribution: number
  erosionReduction: number
  organicMatterImpact: number
  marketValue: number
  waterUse: number
  coverCrop: boolean
  deepRooted: boolean
  pestBreaker: boolean
  climateZones: string[]
  soilPh: [number, number]
  season: 'kharif' | 'rabi' | 'zaid' | 'perennial' | 'flexible'
  description: string
  benefits: string[]
  risks: string[]
}
export interface CropSuitability {
  crop: Crop
  suitabilityScore: number
  tempScore: number
  rainfallScore: number
  soilScore: number
  reasons: string[]
}
export type StrategyType = 'baseline' | 'soil-first' | 'water-saver'
export interface ExistingRotationEntry {
  cropId: string
  monthStart: number
}
export interface RotationCrop {
  crop: Crop
  monthStart: number
  monthEnd: number
  suitability: number
  waterGapMm: number
}
export interface FarmerPriorities {
  waterConservation: number
  soilHealth: number
  marketValue: number
  nitrogenFixing: number
  erosionControl: number
  riskReduction: number
}
export interface RotationStrategy {
  type: StrategyType
  name: string
  nameUrdu: string
  crops: RotationCrop[]
  scores: FarmerPriorities & { overall: number }
  explanation: string
  benefits: string[]
  gaps: string[]
  expertReviewNeeded: boolean
  expertReviewReason: string
  irrigationTotal: number
  nitrogenBalance: number
}
export interface ClimateScenario {
  tempDelta: number
  rainfallDelta: number
}
