import type { RotationStrategy, NASAClimateData, SoilData } from '../types'
import { MONTHS, monthRange } from './climate'
export function generateActionPlan(
  strategy: RotationStrategy,
  nasa: NASAClimateData,
  soil: SoilData | null,
) {
  const steps = strategy.crops
    .flatMap((c) => [
      {
        month: c.monthStart,
        action: `Prepare and sow ${c.crop.name}`,
        details:
          'Confirm the local sowing window and cultivar with an agronomist. Check seed availability and a recent soil test.',
        category: 'Planting',
      },
      {
        month: monthRange(c.monthStart, c.monthEnd)[
          Math.floor(monthRange(c.monthStart, c.monthEnd).length / 2)
        ],
        action: `Check water needs for ${c.crop.name}`,
        details: `${Math.round(c.waterGapMm)} mm estimated seasonal water gap. Use field moisture and current forecasts to schedule irrigation.`,
        category: 'Water',
      },
      {
        month: c.monthEnd,
        action: `Assess ${c.crop.name} maturity`,
        details:
          'Use crop maturity indicators before harvest. Plan storage, buyers and residue management.',
        category: 'Harvest',
      },
    ])
    .sort((a, b) => a.month - b.month)
    .map((s) => ({ ...s, monthName: MONTHS[s.month - 1] }))
  return {
    strategyName: strategy.name,
    steps,
    soilRecommendations: [
      soil?.source === 'soilgrids'
        ? `Confirm the estimated pH of ${soil.ph.toFixed(1)} and organic carbon of ${soil.organicCarbon.toFixed(1)} g/kg with a lab test.`
        : 'Obtain a soil test before deciding on amendments.',
      'Discuss residue retention, cover crops and reduced tillage locally. Fertiliser doses cannot be inferred from this prototype.',
    ],
    disclaimer: `Preliminary plan based on ${nasa.source}. All crop traits and scoring outcomes are estimates. Review locally before acting.`,
  }
}
