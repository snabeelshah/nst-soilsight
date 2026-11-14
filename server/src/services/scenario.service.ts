import type {
  NASAClimateData,
  SoilData,
  FarmerPriorities,
  ClimateScenario,
  RotationStrategy,
  MonthRisk,
} from '../types/index.js'
import { stressClimate } from './climate.service.js'
import { evaluate, rankStrategies } from './crop.service.js'
import { calculateRiskCalendar } from './risk.service.js'

export interface ScenarioComparisonItem {
  type: string
  name: string
  baselineScore: number
  scenarioScore: number
  scoreDelta: number
  baselineWaterGap: number
  scenarioWaterGap: number
  waterGapDelta: number
}

export interface ScenarioSimulationResult {
  isHypothetical: boolean
  disclaimer: string
  stressedClimate: {
    avgTemp: number
    annualRainfall: number
    tempDelta: number
    rainfallDelta: number
  }
  monthlyRisks: MonthRisk[]
  stressedStrategies: RotationStrategy[]
  comparison: ScenarioComparisonItem[]
}

export function simulateClimateScenario(
  nasa: NASAClimateData,
  soil: SoilData | null,
  scenario: ClimateScenario,
  strategies: RotationStrategy[],
  priorities: FarmerPriorities,
): ScenarioSimulationResult {
  const stressed = stressClimate(nasa, scenario.tempDelta, scenario.rainfallDelta)
  const risksResult = calculateRiskCalendar(stressed.monthly)

  // Hold crops and planting windows fixed so before/after comparisons measure climate sensitivity
  const stressedStrategies = rankStrategies(
    strategies.map((s) => evaluate(s.type, s.crops, stressed, soil)),
    priorities,
  )

  const comparison: ScenarioComparisonItem[] = strategies.map((baseline) => {
    const after = stressedStrategies.find((s) => s.type === baseline.type) ?? baseline
    return {
      type: baseline.type,
      name: baseline.name,
      baselineScore: baseline.scores.overall,
      scenarioScore: after.scores.overall,
      scoreDelta: Math.round((after.scores.overall - baseline.scores.overall) * 10) / 10,
      baselineWaterGap: Math.round(baseline.irrigationTotal),
      scenarioWaterGap: Math.round(after.irrigationTotal),
      waterGapDelta: Math.round(after.irrigationTotal - baseline.irrigationTotal),
    }
  })

  return {
    isHypothetical: true,
    disclaimer:
      'Hypothetical climate sensitivity experiment, not a weather forecast or an IPCC projection. Evaluates existing crops and dates under shifted baseline temperature and rainfall.',
    stressedClimate: {
      avgTemp: Math.round(stressed.avgTemp * 10) / 10,
      annualRainfall: Math.round(stressed.annualRainfall),
      tempDelta: scenario.tempDelta,
      rainfallDelta: scenario.rainfallDelta,
    },
    monthlyRisks: risksResult.monthlyRisks,
    stressedStrategies,
    comparison,
  }
}
