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
import { generateFallback } from '../api/nasa-power'
import { getFallbackSoil } from '../api/soilgrids'
import {
  fetchEnvironmentalData,
  fetchRotationRecommendations,
  recalculateRotationPriorities,
  simulateClimateScenario,
} from '../api/backend'

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
  disclaimer: string | null
  warnings: string[]
  units: Record<string, string>
  loading: boolean
  error: string | null
  soilError: string | null
  activeTab: string
  language: 'en' | 'ur'
  priorities: FarmerPriorities
  climateScenario: ClimateScenario
  rankedStrategies: RotationStrategy[]
  stressedStrategies: RotationStrategy[]
  setField: (f: FieldPolygon | null, name?: string, autoFetch?: boolean) => void
  loadDemo: (lat: number, lon: number, name: string) => void
  fetchData: (demo?: boolean) => Promise<void>
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
  const cancel = () => {
    controller?.abort()
    requestId++
  }

  return {
    field: demoField(30.1575, 71.5249),
    fieldName: 'Punjab, Pakistan',
    nasaData: initialClimate,
    soilData: initialSoil,
    disclaimer:
      'Point-based NASA data represents the selected centroid (30.1575°N, 71.5249°E), not measurements across every point of the field.',
    warnings: [],
    units: {
      temperature: '°C',
      rainfall: 'mm/month',
      soilMoisture: 'dimensionless (0–1)',
      et0: 'mm/month',
    },
    loading: false,
    error: null,
    soilError: null,
    activeTab: 'overview',
    language: 'en',
    priorities: DEFAULT_PRIORITIES,
    climateScenario: DEFAULT_SCENARIO,
    rankedStrategies: initialStrategies,
    stressedStrategies: initialStrategies,

    setField: (field, name = 'My field', autoFetch = false) => {
      cancel()
      const disclaimer = field
        ? `Point-based NASA data represents the selected centroid (${field.center.lat.toFixed(4)}°, ${field.center.lng.toFixed(4)}°), not measurements across every point of the field.`
        : null

      set({
        field,
        fieldName: name,
        nasaData: null,
        soilData: null,
        disclaimer,
        warnings: [],
        rankedStrategies: [],
        stressedStrategies: [],
        loading: false,
        error: null,
        soilError: null,
      })

      if (autoFetch && field) {
        void get().fetchData()
      }
    },

    loadDemo: async (lat, lon, fieldName) => {
      cancel()
      controller = new AbortController()
      const signal = controller.signal
      const field = demoField(lat, lon)
      set({
        field,
        fieldName,
        loading: true,
        error: null,
        soilError: null,
      })

      try {
        const env = await fetchEnvironmentalData(lat, lon, { demo: true, signal })
        const { priorities, climateScenario } = get()
        const rotRes = await fetchRotationRecommendations(env.climate, env.soil, priorities, signal)

        let stressed = rotRes.strategies
        if (climateScenario.tempDelta !== 0 || climateScenario.rainfallDelta !== 0) {
          const simRes = await simulateClimateScenario(
            env.climate,
            env.soil,
            climateScenario,
            rotRes.strategies,
            priorities,
            signal,
          )
          stressed = simRes.stressedStrategies
        }

        set({
          nasaData: env.climate,
          soilData: env.soil,
          disclaimer: env.disclaimer,
          warnings: env.warnings,
          units: env.units,
          rankedStrategies: rotRes.strategies,
          stressedStrategies: stressed,
          loading: false,
          error: null,
          soilError: null,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load demo data.'
        set({ loading: false, error: message })
      }
    },

    fetchData: async (demo = false) => {
      const field = get().field
      if (!field) return
      cancel()
      controller = new AbortController()
      const id = requestId,
        signal = controller.signal

      set({ loading: true, error: null, soilError: null })

      try {
        const env = await fetchEnvironmentalData(field.center.lat, field.center.lng, {
          demo,
          signal,
        })

        if (signal.aborted || id !== requestId) return

        const { priorities, climateScenario } = get()
        const rotRes = await fetchRotationRecommendations(env.climate, env.soil, priorities, signal)

        let stressed = rotRes.strategies
        if (climateScenario.tempDelta !== 0 || climateScenario.rainfallDelta !== 0) {
          const simRes = await simulateClimateScenario(
            env.climate,
            env.soil,
            climateScenario,
            rotRes.strategies,
            priorities,
            signal,
          )
          stressed = simRes.stressedStrategies
        }

        set({
          nasaData: env.climate,
          soilData: env.soil,
          disclaimer: env.disclaimer,
          warnings: env.warnings,
          units: env.units,
          rankedStrategies: rotRes.strategies,
          stressedStrategies: stressed,
          loading: false,
          error: null,
          soilError: env.warnings.some((w) => w.toLowerCase().includes('soilgrids'))
            ? 'SoilGrids is unavailable. An example soil profile is shown; soil suitability uses a neutral score.'
            : null,
        })
      } catch (err: unknown) {
        if (signal.aborted || id !== requestId) return
        const message =
          err instanceof Error
            ? err.message
            : 'NASA climate data could not be loaded. Check your connection or try again. Any existing results keep their original data label.'
        set({
          loading: false,
          error: message.includes('could not be loaded')
            ? message
            : `NASA climate data could not be loaded. ${message} Any existing results keep their original data label.`,
        })
      }
    },

    importData: async (nasaData) => {
      cancel()
      const soilData = get().soilData ?? getFallbackSoil()
      const { priorities, climateScenario } = get()
      try {
        const rotRes = await fetchRotationRecommendations(nasaData, soilData, priorities)
        set({
          nasaData,
          soilData,
          rankedStrategies: rotRes.strategies,
          stressedStrategies: applyClimateStress(
            rotRes.strategies,
            nasaData,
            climateScenario,
            soilData,
            priorities,
          ),
          loading: false,
          error: null,
        })
      } catch {
        const localStrategies = buildRotationStrategies(nasaData, soilData, priorities)
        set({
          nasaData,
          soilData,
          rankedStrategies: localStrategies,
          stressedStrategies: applyClimateStress(
            localStrategies,
            nasaData,
            climateScenario,
            soilData,
            priorities,
          ),
          loading: false,
          error: null,
        })
      }
    },

    setActiveTab: (activeTab) => set({ activeTab }),

    setLanguage: (language) => {
      set({ language })
      document.documentElement.lang = language
      document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr'
    },

    updatePriorities: async (priorities) => {
      const { nasaData, soilData, rankedStrategies, climateScenario } = get()

      // Optimistic / instantaneous local update first so slider doesn't lag
      const quickRank = rankStrategies(rankedStrategies, priorities)
      set({
        priorities,
        rankedStrategies: quickRank,
        stressedStrategies: nasaData
          ? applyClimateStress(quickRank, nasaData, climateScenario, soilData, priorities)
          : [],
      })

      // Backend recalculation from rotation API
      try {
        const res = await recalculateRotationPriorities(rankedStrategies, priorities)
        let stressed = res.rankedStrategies
        if (nasaData && (climateScenario.tempDelta !== 0 || climateScenario.rainfallDelta !== 0)) {
          const simRes = await simulateClimateScenario(
            nasaData,
            soilData,
            climateScenario,
            res.rankedStrategies,
            priorities,
          )
          stressed = simRes.stressedStrategies
        }
        set({
          rankedStrategies: res.rankedStrategies,
          stressedStrategies: stressed,
        })
      } catch {
        // Optimistic ranking already applied
      }
    },

    updateClimateScenario: async (climateScenario) => {
      const { rankedStrategies, nasaData, soilData, priorities } = get()

      if (!nasaData) {
        set({ climateScenario, stressedStrategies: [] })
        return
      }

      // Optimistic update
      const quickStressed = applyClimateStress(
        rankedStrategies,
        nasaData,
        climateScenario,
        soilData,
        priorities,
      )
      set({ climateScenario, stressedStrategies: quickStressed })

      // Backend calculation from scenario API
      try {
        const res = await simulateClimateScenario(
          nasaData,
          soilData,
          climateScenario,
          rankedStrategies,
          priorities,
        )
        set({ stressedStrategies: res.stressedStrategies })
      } catch {
        // Optimistic stress already applied
      }
    },
  }
})
