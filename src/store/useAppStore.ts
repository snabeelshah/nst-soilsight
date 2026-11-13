import { create } from 'zustand'
import type {
  FieldPolygon,
  NASAClimateData,
  SoilData,
  RotationStrategy,
  FarmerPriorities,
  ClimateScenario,
} from '../types'
import { buildRotationStrategies, rankStrategies, applyClimateStress } from '../lib/cropScoring'
import { demoField } from '../lib/geometry'
import { fetchNASAClimateData, generateFallback } from '../api/nasa-power'
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
interface State {
  field: FieldPolygon | null
  fieldName: string
  nasaData: NASAClimateData | null
  soilData: SoilData | null
  loading: boolean
  error: string | null
  soilError: string | null
  activeTab: string
  language: 'en' | 'ur'
  priorities: FarmerPriorities
  climateScenario: ClimateScenario
  rankedStrategies: RotationStrategy[]
  stressedStrategies: RotationStrategy[]
  setField: (f: FieldPolygon | null, name?: string) => void
  loadDemo: (lat: number, lon: number, name: string) => void
  fetchData: () => Promise<void>
  importData: (d: NASAClimateData) => void
  setActiveTab: (t: string) => void
  setLanguage: (l: 'en' | 'ur') => void
  updatePriorities: (p: FarmerPriorities) => void
  updateClimateScenario: (s: ClimateScenario) => void
}
let controller: AbortController | undefined
let requestId = 0
const initialClimate = generateFallback(30.1575, 71.5249),
  initialSoil = getFallbackSoil()
const initialStrategies = buildRotationStrategies(initialClimate, initialSoil, DEFAULT_PRIORITIES)
export const useAppStore = create<State>((set, get) => {
  const calculate = (nasa: NASAClimateData, soil: SoilData | null) => {
    const { priorities, climateScenario } = get()
    const rankedStrategies = buildRotationStrategies(nasa, soil, priorities)
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
    field: demoField(30.1575, 71.5249),
    fieldName: 'Punjab, Pakistan',
    nasaData: initialClimate,
    soilData: initialSoil,
    loading: false,
    error: null,
    soilError: null,
    activeTab: 'overview',
    language: 'en',
    priorities: DEFAULT_PRIORITIES,
    climateScenario: DEFAULT_SCENARIO,
    rankedStrategies: initialStrategies,
    stressedStrategies: initialStrategies,
    setField: (field, name = 'My field') => {
      cancel()
      set({
        field,
        fieldName: name,
        nasaData: null,
        soilData: null,
        rankedStrategies: [],
        stressedStrategies: [],
        loading: false,
        error: null,
        soilError: null,
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
        ...calculate(nasaData, soilData),
        loading: false,
        error: null,
        soilError: null,
      })
    },
    fetchData: async () => {
      const field = get().field
      if (!field) return
      cancel()
      controller = new AbortController()
      const id = requestId,
        signal = controller.signal
      set({ loading: true, error: null, soilError: null })
      const [climate, soil] = await Promise.allSettled([
        fetchNASAClimateData(field.center.lat, field.center.lng, signal),
        fetchSoilData(field.center.lat, field.center.lng, signal),
      ])
      if (signal.aborted || id !== requestId) return
      if (climate.status === 'rejected') {
        set({
          loading: false,
          error:
            'NASA climate data could not be loaded. Check your connection or try again. Any existing results keep their original data label.',
        })
        return
      }
      const soilData = soil.status === 'fulfilled' ? soil.value : getFallbackSoil()
      set({
        nasaData: climate.value,
        soilData,
        ...calculate(climate.value, soilData),
        loading: false,
        soilError:
          soil.status === 'rejected'
            ? 'SoilGrids is unavailable. An example soil profile is shown; soil suitability uses a neutral score.'
            : null,
      })
    },
    importData: (nasaData) => {
      cancel()
      const soilData = get().soilData ?? getFallbackSoil()
      set({ nasaData, soilData, ...calculate(nasaData, soilData), loading: false, error: null })
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
  }
})
