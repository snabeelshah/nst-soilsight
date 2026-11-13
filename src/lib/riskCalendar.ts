import type { NASAMonthlyData, MonthRisk, RiskType } from '../types'
import { MONTHS } from './climate'
export function buildRiskCalendar(monthly: NASAMonthlyData[]): MonthRisk[] {
  return monthly.map((m) => {
    const risks: RiskType[] = [],
      description: string[] = []
    let high = false
    if (m.tempMin < 5) {
      risks.push('frost')
      description.push(
        `Mean daily minimum ${m.tempMin.toFixed(1)}°C: cold-sensitive crops may be exposed.`,
      )
      high ||= m.tempMin < 0
    }
    if (m.tempMax > 35) {
      risks.push('heat')
      description.push(
        `Mean daily maximum ${m.tempMax.toFixed(1)}°C: heat-sensitive growth stages need attention.`,
      )
      high ||= m.tempMax > 40
    }
    if (m.et0 - m.rainfall > 60 || m.rainfall < 20) {
      risks.push('drought')
      description.push(
        `Rain ${m.rainfall.toFixed(0)} mm versus estimated reference evapotranspiration ${m.et0.toFixed(0)} mm: plan for water deficits.`,
      )
      high ||= m.et0 - m.rainfall > 120
    }
    if (m.rainfall > 200) {
      risks.push('flood')
      description.push(
        `${m.rainfall.toFixed(0)} mm monthly rain: assess drainage. Monthly totals cannot predict flooding.`,
      )
      high ||= m.rainfall > 300
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
}
