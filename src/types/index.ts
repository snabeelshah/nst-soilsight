export interface LatLng { lat: number; lng: number }

export interface FieldPolygon {
  coordinates: LatLng[]
  center: LatLng
  areaHectares: number
  areaAcres: number
}

export interface NASAMonthlyData {
  month: number
  tempMin: number
  tempMax: number
  tempAvg: number
  rainfall: number
  soilMoistureRoot: number
  soilMoistureProf: number
  et0: number
}

export interface DataConfidence {
  level: 'observed' | 'modelled' | 'estimated'
  label: string
  description: string
  color: string
}

export interface NASAClimateData {
  monthly: NASAMonthlyData[]
  annualRainfall: number
  avgTemp: number
  confidence: DataConfidence
  source: string
  lat: number
  lon: number
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

export interface RotationCrop {
  crop: Crop
  monthStart: number
  monthEnd: number
  suitability: number
  waterGapMm: number
}

export interface RotationStrategy {
  type: StrategyType
  name: string
  nameUrdu: string
  crops: RotationCrop[]
  scores: {
    overall: number
    soilHealth: number
    waterConservation: number
    nitrogenFixing: number
    marketValue: number
    erosionControl: number
    riskReduction: number
  }
  explanation: string
  benefits: string[]
  gaps: string[]
  expertReviewNeeded: boolean
  expertReviewReason: string
  irrigationTotal: number
  nitrogenBalance: number
}

export interface FarmerPriorities {
  waterConservation: number
  soilHealth: number
  marketValue: number
  nitrogenFixing: number
  erosionControl: number
  riskReduction: number
}

export interface ClimateScenario {
  tempDelta: number
  rainfallDelta: number
}

export interface AppState {
  field: FieldPolygon | null
  setField: (f: FieldPolygon | null) => void
  nasaData: NASAClimateData | null
  nasaLoading: boolean
  nasaError: string | null
  setNasaData: (d: NASAClimateData | null) => void
  setNasaLoading: (v: boolean) => void
  setNasaError: (e: string | null) => void
  soilData: SoilData | null
  soilLoading: boolean
  soilError: string | null
  setSoilData: (d: SoilData | null) => void
  setSoilLoading: (v: boolean) => void
  setSoilError: (e: string | null) => void
  riskCalendar: MonthRisk[]
  setRiskCalendar: (r: MonthRisk[]) => void
  strategies: RotationStrategy[]
  rankedStrategies: RotationStrategy[]
  setStrategies: (s: RotationStrategy[]) => void
  setRankedStrategies: (s: RotationStrategy[]) => void
  priorities: FarmerPriorities
  setPriorities: (p: FarmerPriorities) => void
  climateScenario: ClimateScenario
  setClimateScenario: (s: ClimateScenario) => void
  stressedStrategies: RotationStrategy[]
  setStressedStrategies: (s: RotationStrategy[]) => void
  activeTab: string
  setActiveTab: (t: string) => void
  language: 'en' | 'ur'
  setLanguage: (l: 'en' | 'ur') => void
  dataLoaded: boolean
  setDataLoaded: (v: boolean) => void
  recalculateAll: (nasa: NASAClimateData, soil: SoilData | null) => void
  updatePriorities: (p: FarmerPriorities) => void
  updateClimateScenario: (s: ClimateScenario) => void
}
