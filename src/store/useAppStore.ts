import { create } from 'zustand'
import type {
  FieldPolygon,
  NASAClimateData,
  SoilData,
  RotationStrategy,
  FarmerPriorities,
  ClimateScenario,
  ExistingRotationEntry,
  NASARecentData,
} from '../types'
import { buildRotationStrategies, rankStrategies, applyClimateStress } from '../lib/cropScoring'
import { demoField } from '../lib/geometry'
import { fetchNASAClimateData, fetchNASARecentData, generateFallback } from '../api/nasa-power'
import { fetchSoilData, getFallbackSoil } from '../api/soilgrids'
export const DEFAULT_PRIORITIES: FarmerPriorities = {
  waterConservation: 25,
  soilHealth: 25,
  marketValue: 20,
  nitrogenFixing: 15,
  erosionControl: 10,
  riskReduction: 5,
}
export const DEFAULT_SCENARIO: ClimateScenario = { tempDelta: 0, rainfallDelta: 0 }
export const DEFAULT_EXISTING_ROTATION: ExistingRotationEntry[] = [
  { cropId: 'wheat', monthStart: 11 },
  { cropId: 'mungbean', monthStart: 4 },
  { cropId: 'sorghum', monthStart: 7 },
]
interface State {
  field: FieldPolygon | null
  fieldName: string
  nasaData: NASAClimateData | null
  soilData: SoilData | null
  recentData: NASARecentData | null
  loading: boolean
  recentLoading: boolean
  error: string | null
  soilError: string | null
  recentError: string | null
  activeTab: string
  language: 'en' | 'ur'
  priorities: FarmerPriorities
  climateScenario: ClimateScenario
  rankedStrategies: RotationStrategy[]
  stressedStrategies: RotationStrategy[]
  existingRotation: ExistingRotationEntry[]
  setField: (f: FieldPolygon | null, name?: string) => void
  loadDemo: (lat: number, lon: number, name: string) => void
  fetchData: () => Promise<boolean>
  importData: (d: NASAClimateData) => void
  setActiveTab: (t: string) => void
  setLanguage: (l: 'en' | 'ur') => void
  updatePriorities: (p: FarmerPriorities) => void
  updateClimateScenario: (s: ClimateScenario) => void
  updateExistingRotation: (rotation: ExistingRotationEntry[]) => void
}
let controller: AbortController | undefined
let requestId = 0
export const useAppStore = create<State>((set, get) => {
  const calculate = (nasa: NASAClimateData, soil: SoilData | null) => {
    const { priorities, climateScenario, existingRotation } = get()
    const rankedStrategies = buildRotationStrategies(nasa, soil, priorities, existingRotation)
    return {
      rankedStrategies,
      stressedStrategies: applyClimateStress(
        rankedStrategies,
        nasa,
        climateScenario,
        soil,
        priorities,
      ),
    }
  }
  const cancel = () => {
    controller?.abort()
    requestId++
  }
  return {
    field: null,
    fieldName: '',
    nasaData: null,
    soilData: null,
    recentData: null,
    loading: false,
    recentLoading: false,
    error: null,
    soilError: null,
    recentError: null,
    activeTab: 'overview',
    language: 'en',
    priorities: DEFAULT_PRIORITIES,
    climateScenario: DEFAULT_SCENARIO,
    rankedStrategies: [],
    stressedStrategies: [],
    existingRotation: DEFAULT_EXISTING_ROTATION,
    setField: (field, name = 'My field') => {
      cancel()
      set({
        field,
        fieldName: name,
        nasaData: null,
        soilData: null,
        recentData: null,
        rankedStrategies: [],
        stressedStrategies: [],
        loading: false,
        recentLoading: false,
        error: null,
        soilError: null,
        recentError: null,
      })
    },
    loadDemo: (lat, lon, fieldName) => {
      cancel()
      const nasaData = generateFallback(lat, lon),
        soilData = getFallbackSoil()
      set({
        field: demoField(lat, lon),
        fieldName,
        nasaData,
        soilData,
        recentData: null,
        ...calculate(nasaData, soilData),
        loading: false,
        recentLoading: false,
        error: null,
        soilError: null,
        recentError: null,
      })
    },
    fetchData: async () => {
      const field = get().field
      if (!field) return false
      cancel()
      controller = new AbortController()
      const id = requestId,
        signal = controller.signal
      set({ loading: true, recentLoading: true, error: null, soilError: null, recentError: null })
      const [climate, soil, recent] = await Promise.allSettled([
        fetchNASAClimateData(field.center.lat, field.center.lng, signal),
        fetchSoilData(field.center.lat, field.center.lng, signal),
        fetchNASARecentData(field.center.lat, field.center.lng, signal),
      ])
      if (signal.aborted || id !== requestId) return false
      if (climate.status === 'rejected') {
        set({
          loading: false,
          recentLoading: false,
          error:
            'NASA climate data could not be loaded. Check your connection or try again. Any existing results keep their original data label.',
        })
        return false
      }
      const soilData = soil.status === 'fulfilled' ? soil.value : getFallbackSoil()
      set({
        nasaData: climate.value,
        soilData,
        recentData: recent.status === 'fulfilled' ? recent.value : null,
        ...calculate(climate.value, soilData),
        loading: false,
        recentLoading: false,
        soilError:
          soil.status === 'rejected'
            ? 'SoilGrids is unavailable. Climate remains live when labelled NASA POWER, but the soil values shown are bundled examples—not local data. Soil suitability uses a neutral 60/100.'
            : null,
        recentError:
          recent.status === 'rejected'
            ? 'Latest NASA POWER daily data are unavailable. The long-term climate plan remains available.'
            : null,
      })
      return true
    },
    importData: (nasaData) => {
      cancel()
      const soilData = get().soilData ?? getFallbackSoil()
      set({
        nasaData,
        soilData,
        recentData: null,
        ...calculate(nasaData, soilData),
        loading: false,
        recentLoading: false,
        error: null,
        recentError: null,
      })
    },
    setActiveTab: (activeTab) => set({ activeTab }),
    setLanguage: (language) => {
      set({ language })
      document.documentElement.lang = language
      document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr'
    },
    updatePriorities: (priorities) => {
      const { nasaData, soilData, rankedStrategies, climateScenario } = get()
      const ranked = rankStrategies(rankedStrategies, priorities)
      set({
        priorities,
        rankedStrategies: ranked,
        stressedStrategies: nasaData
          ? applyClimateStress(ranked, nasaData, climateScenario, soilData, priorities)
          : [],
      })
    },
    updateClimateScenario: (climateScenario) => {
      const { rankedStrategies, nasaData, soilData, priorities } = get()
      set({
        climateScenario,
        stressedStrategies: nasaData
          ? applyClimateStress(rankedStrategies, nasaData, climateScenario, soilData, priorities)
          : [],
      })
    },
    updateExistingRotation: (existingRotation) => {
      const { nasaData, soilData, priorities, climateScenario } = get()
      if (!nasaData) return set({ existingRotation })
      const rankedStrategies = buildRotationStrategies(
        nasaData,
        soilData,
        priorities,
        existingRotation,
      )
      set({
        existingRotation,
        rankedStrategies,
        stressedStrategies: applyClimateStress(
          rankedStrategies,
          nasaData,
          climateScenario,
          soilData,
          priorities,
        ),
      })
    },
  }
})
