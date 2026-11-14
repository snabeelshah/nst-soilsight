import type { NASAMonthlyData, MonthRisk, RiskType, DataConfidence } from '../types/index.js'
import { MONTHS } from './climate.service.js'

export interface RiskAnalysisResult {
  monthlyRisks: MonthRisk[]
  summary: {
    highAttentionMonths: number
    mediumAttentionMonths: number
    lowAttentionMonths: number
  }
  confidence: DataConfidence
  missingDataWarnings: string[]
  explanation: string
}

export function calculateRiskCalendar(monthly: NASAMonthlyData[]): RiskAnalysisResult {
  const missingDataWarnings: string[] = []

  // Check for missing soil wetness or fill values
  const missingRootMoisture = monthly.filter((m) => m.soilMoistureRoot === null).length
  if (missingRootMoisture > 0) {
    missingDataWarnings.push(
      `Root zone soil wetness (GWETROOT) is unavailable for ${missingRootMoisture} month(s). Soil water deficit is based on ET0 and rainfall estimates.`,
    )
  }

  const monthlyRisks: MonthRisk[] = monthly.map((m) => {
    const risks: RiskType[] = [],
      description: string[] = []
    let high = false

    if (m.tempMin < 5) {
      risks.push('frost')
      description.push(
        `Mean daily minimum ${m.tempMin.toFixed(1)}°C: cold-sensitive crops may be exposed.`,
      )
      high = high || m.tempMin < 0
    }

    if (m.tempMax > 35) {
      risks.push('heat')
      description.push(
        `Mean daily maximum ${m.tempMax.toFixed(1)}°C: heat-sensitive growth stages need attention.`,
      )
      high = high || m.tempMax > 40
    }

    if (m.et0 - m.rainfall > 60 || m.rainfall < 20) {
      risks.push('drought')
      description.push(
        `Rain ${m.rainfall.toFixed(0)} mm versus estimated reference evapotranspiration ${m.et0.toFixed(0)} mm: plan for water deficits.`,
      )
      high = high || m.et0 - m.rainfall > 120
    }

    if (m.rainfall > 200) {
      risks.push('flood')
      description.push(
        `${m.rainfall.toFixed(0)} mm monthly rain: assess drainage. Monthly totals cannot predict flooding.`,
      )
      high = high || m.rainfall > 300
    }

    return {
      month: m.month,
      monthName: MONTHS[m.month - 1],
      risks: risks.length ? risks : ['none'],
      severity: high || risks.length > 1 ? 'high' : risks.length ? 'medium' : 'low',
      description: description.length
        ? description
        : ['No thresholds triggered. Local extremes and crop-specific risks can still occur.'],
    }
  })

  const highCount = monthlyRisks.filter((r) => r.severity === 'high').length
  const medCount = monthlyRisks.filter((r) => r.severity === 'medium').length
  const lowCount = monthlyRisks.filter((r) => r.severity === 'low').length

  return {
    monthlyRisks,
    summary: {
      highAttentionMonths: highCount,
      mediumAttentionMonths: medCount,
      lowAttentionMonths: lowCount,
    },
    confidence: {
      level: 'modelled',
      label: 'Modelled · Climate Screening',
      description:
        'Threshold-based screening derived from NASA POWER monthly climate records. This is a seasonal planning heuristic, not a weather alert or forecast.',
      color: '#326b8a',
    },
    missingDataWarnings,
    explanation:
      'Climate-based screening for cold, heat, water deficits and excess rain. Monthly averages smooth out short-term weather extremes.',
  }
}
