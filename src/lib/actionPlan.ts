import type { RotationStrategy, NASAClimateData, SoilData } from '../types'

export interface ActionStep {
  month: number
  monthName: string
  action: string
  priority: 'critical' | 'important' | 'optional'
  category: 'planting' | 'harvest' | 'soil' | 'irrigation' | 'monitoring' | 'market'
  details: string
}

export interface ActionPlan {
  strategyName: string
  season: string
  steps: ActionStep[]
  soilRecommendations: string[]
  irrigationRecommendations: string[]
  marketRecommendations: string[]
  disclaimer: string
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function generateActionPlan(
  strategy: RotationStrategy,
  nasa: NASAClimateData,
  soil: SoilData | null
): ActionPlan {
  const steps: ActionStep[] = []

  // Add planting and harvest events for each crop
  for (const rc of strategy.crops) {
    steps.push({
      month: rc.monthStart,
      monthName: MONTH_NAMES[rc.monthStart - 1],
      action: `Plant ${rc.crop.name}`,
      priority: 'critical',
      category: 'planting',
      details: `Prepare seedbed 2 weeks before. Soil temperature should be >${rc.crop.tempMin + 3}°C. Apply ${rc.crop.nitrogenFixing ? 'rhizobium inoculant' : 'starter fertiliser'} at planting.`,
    })

    const harvestMonth = rc.monthEnd
    steps.push({
      month: harvestMonth,
      monthName: MONTH_NAMES[harvestMonth - 1],
      action: `Harvest ${rc.crop.name}`,
      priority: 'critical',
      category: 'harvest',
      details: `Monitor maturity signs. Arrange storage and market access in advance. Incorporate crop residue to build organic matter.`,
    })

    // Irrigation reminders
    if (rc.waterGapMm > 50) {
      steps.push({
        month: Math.round((rc.monthStart + rc.monthEnd) / 2),
        monthName: MONTH_NAMES[Math.round((rc.monthStart + rc.monthEnd) / 2) - 1],
        action: `Irrigation planning for ${rc.crop.name}`,
        priority: 'important',
        category: 'irrigation',
        details: `Estimated ${rc.waterGapMm.toFixed(0)}mm irrigation needed. Schedule based on soil moisture — avoid waterlogging.`,
      })
    }
  }

  // Soil management steps
  if (soil && soil.organicCarbon < 10) {
    steps.push({
      month: 1,
      monthName: 'January',
      action: 'Soil organic matter improvement',
      priority: 'important',
      category: 'soil',
      details: `Current SOC ${soil.organicCarbon.toFixed(1)}g/kg is low. Add compost (5–10 t/ha) or green manure before planting season.`,
    })
  }

  if (soil && (soil.ph < 5.5 || soil.ph > 7.5)) {
    steps.push({
      month: 2,
      monthName: 'February',
      action: `pH correction (current: ${soil.ph.toFixed(1)})`,
      priority: 'important',
      category: 'soil',
      details: soil.ph < 5.5 ? 'Apply agricultural lime at 2–4 t/ha to raise pH. Test again after 3 months.' : 'Avoid excess irrigation salinity. Consider gypsum application and crop selection for alkaline soils.',
    })
  }

  // Sort by month
  steps.sort((a, b) => a.month - b.month)

  const soilRecommendations = [
    soil && soil.organicCarbon < 15 ? `Build organic matter: current SOC ${soil?.organicCarbon.toFixed(1)}g/kg below optimal 20g/kg` : 'Maintain current organic matter levels with residue incorporation',
    strategy.nitrogenBalance < 0 ? `Nitrogen deficit of ${Math.abs(strategy.nitrogenBalance)}kg N/ha/yr — supplement with ${Math.abs(strategy.nitrogenBalance / 2).toFixed(0)}kg urea/ha or expand legume area` : `Positive N balance: ${strategy.nitrogenBalance}kg N/ha/yr from legume fixation`,
    'Conduct annual soil test (pH, N, P, K) to track trends',
    'Minimise tillage to reduce erosion and preserve soil structure',
  ].filter(Boolean) as string[]

  const irrigationRecommendations = [
    strategy.irrigationTotal > 0 ? `Total estimated irrigation: ${strategy.irrigationTotal.toFixed(0)}mm/yr` : 'Rainfed rotation — no supplemental irrigation required under normal conditions',
    strategy.irrigationTotal > 200 ? 'Consider drip irrigation to reduce water use by 30–50% vs. flood irrigation' : '',
    'Install soil moisture sensors or use finger test to avoid over-irrigation',
    'Collect rainwater during surplus months (see irrigation planner for monthly gaps)',
  ].filter(Boolean) as string[]

  const marketRecommendations = [
    'Contact district agricultural marketing office 2 months before harvest',
    `Highest-value crop in rotation: ${strategy.crops.sort((a,b) => b.crop.marketValue - a.crop.marketValue)[0]?.crop.name ?? 'N/A'}`,
    'Consider local co-operative for bulk selling to get better prices',
    'Stagger harvest dates to avoid glutting local markets',
  ]

  return {
    strategyName: strategy.name,
    season: `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`,
    steps,
    soilRecommendations,
    irrigationRecommendations,
    marketRecommendations,
    disclaimer: 'This action plan is generated from NASA climate data and global crop models. Local conditions, pest pressure, market prices, and infrastructure vary significantly. Validate all recommendations with your local agricultural extension officer before implementation.',
  }
}
