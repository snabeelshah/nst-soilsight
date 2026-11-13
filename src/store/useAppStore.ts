import { create } from 'zustand'
import type { AppState, FarmerPriorities, ClimateScenario } from '../types'
import { buildRiskCalendar } from '../lib/riskCalendar'
import { buildRotationStrategies, rankStrategies, applyClimateStress } from '../lib/cropScoring'

export const DEFAULT_PRIORITIES: FarmerPriorities = {
  waterConservation: 25,
  soilHealth: 25,
  marketValue: 20,
  nitrogenFixing: 15,
  erosionControl: 10,
  riskReduction: 5,
}

export const DEFAULT_SCENARIO: ClimateScenario = {
  tempDelta: 0,
  rainfallDelta: 0,
}

export const useAppStore = create<AppState>((set, get) => ({
  field: null,
  setField: (field) => set({ field }),

  nasaData: null,
  nasaLoading: false,
  nasaError: null,
  setNasaData: (nasaData) => set({ nasaData }),
  setNasaLoading: (nasaLoading) => set({ nasaLoading }),
  setNasaError: (nasaError) => set({ nasaError }),

  soilData: null,
  soilLoading: false,
  soilError: null,
  setSoilData: (soilData) => set({ soilData }),
  setSoilLoading: (soilLoading) => set({ soilLoading }),
  setSoilError: (soilError) => set({ soilError }),

  riskCalendar: [],
  setRiskCalendar: (riskCalendar) => set({ riskCalendar }),

  strategies: [],
  rankedStrategies: [],
  setStrategies: (strategies) => set({ strategies }),
  setRankedStrategies: (rankedStrategies) => set({ rankedStrategies }),

  priorities: DEFAULT_PRIORITIES,
  setPriorities: (priorities) => {
    set({ priorities })
    const { strategies, climateScenario, nasaData, soilData } = get()
    if (strategies.length > 0) {
      const ranked = rankStrategies(strategies, priorities)
      set({ rankedStrategies: ranked })
      if (nasaData && (climateScenario.tempDelta !== 0 || climateScenario.rainfallDelta !== 0)) {
        const stressed = applyClimateStress(strategies, nasaData, climateScenario, soilData, priorities)
        set({ stressedStrategies: stressed })
      }
    }
  },

  climateScenario: DEFAULT_SCENARIO,
  setClimateScenario: (climateScenario) => {
    set({ climateScenario })
    const { strategies, nasaData, soilData, priorities } = get()
    if (nasaData && strategies.length > 0) {
      const stressed = applyClimateStress(strategies, nasaData, climateScenario, soilData, priorities)
      set({ stressedStrategies: stressed })
    }
  },

  stressedStrategies: [],
  setStressedStrategies: (stressedStrategies) => set({ stressedStrategies }),

  activeTab: 'overview',
  setActiveTab: (activeTab) => set({ activeTab }),

  language: 'en',
  setLanguage: (language) => {
    set({ language })
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  },

  dataLoaded: false,
  setDataLoaded: (dataLoaded) => set({ dataLoaded }),

  recalculateAll: (nasa, soil) => {
    const { priorities, climateScenario } = get()
    const risk = buildRiskCalendar(nasa.monthly)
    const baseStrategies = buildRotationStrategies(nasa, soil, priorities)
    const ranked = rankStrategies(baseStrategies, priorities)

    let stressed = ranked
    if (climateScenario.tempDelta !== 0 || climateScenario.rainfallDelta !== 0) {
      stressed = applyClimateStress(baseStrategies, nasa, climateScenario, soil, priorities)
    }

    set({
      nasaData: nasa,
      soilData: soil,
      riskCalendar: risk,
      strategies: baseStrategies,
      rankedStrategies: ranked,
      stressedStrategies: stressed,
      dataLoaded: true,
      nasaLoading: false,
      soilLoading: false,
    })
  },

  updatePriorities: (newPriorities) => {
    get().setPriorities(newPriorities)
  },

  updateClimateScenario: (scenario) => {
    get().setClimateScenario(scenario)
  },
}))
