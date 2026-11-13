import type { NASAMonthlyData, MonthRisk, RiskType } from '../types'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function buildRiskCalendar(monthly: NASAMonthlyData[]): MonthRisk[] {
  return monthly.map((m, i) => {
    const risks: RiskType[] = []
    const descriptions: string[] = []

    // Frost risk
    if (m.tempMin < 2) {
      risks.push('frost')
      descriptions.push(`Frost risk: minimum temperature ${m.tempMin.toFixed(1)}°C — seedlings and tropical crops vulnerable`)
    } else if (m.tempMin < 5) {
      risks.push('frost')
      descriptions.push(`Chilling risk: minimum ${m.tempMin.toFixed(1)}°C — avoid cold-sensitive crops`)
    }

    // Heat stress
    if (m.tempMax > 40) {
      risks.push('heat')
      descriptions.push(`Severe heat stress: maximum ${m.tempMax.toFixed(1)}°C — most crops will suffer yield loss`)
    } else if (m.tempMax > 35) {
      risks.push('heat')
      descriptions.push(`Heat stress: maximum ${m.tempMax.toFixed(1)}°C — monitor heat-sensitive crops`)
    }

    // Drought risk
    const et0 = m.et0 ?? 80
    const waterDeficit = et0 - m.rainfall
    if (m.rainfall < 20 && m.soilMoistureRoot < 0.25) {
      risks.push('drought')
      descriptions.push(`Severe drought: only ${m.rainfall.toFixed(0)}mm rainfall, soil moisture critically low (${(m.soilMoistureRoot*100).toFixed(0)}%)`)
    } else if (waterDeficit > 60 && m.soilMoistureRoot < 0.4) {
      risks.push('drought')
      descriptions.push(`Water stress: ET₀ exceeds rainfall by ${waterDeficit.toFixed(0)}mm — irrigation likely needed`)
    }

    // Flood / excess rain risk
    if (m.rainfall > 300) {
      risks.push('flood')
      descriptions.push(`Flood risk: ${m.rainfall.toFixed(0)}mm exceeds safe field capacity — drainage critical`)
    } else if (m.rainfall > 200) {
      risks.push('flood')
      descriptions.push(`Excess rain: ${m.rainfall.toFixed(0)}mm — waterlogging risk in poorly drained soils`)
    }

    // Bare field risk (heuristic: low rainfall AND no crop growth conditions)
    // This is flagged separately in the rotation — here we flag it as a bare-field window
    if (risks.length === 0 && m.soilMoistureRoot > 0.4 && m.tempAvg > 10 && m.tempAvg < 35) {
      // Good growing window — no risk
    }

    const severity = risks.length === 0 ? 'low' :
      risks.length === 1 && !descriptions.some(d => d.includes('Severe')) ? 'low' :
      risks.some(r => r === 'frost' && m.tempMin < -2) || risks.length >= 2 ? 'high' : 'medium'

    return {
      month: i + 1,
      monthName: MONTH_NAMES[i],
      risks: risks.length === 0 ? ['none'] : risks,
      severity,
      description: descriptions.length === 0
        ? [`${MONTH_NAMES[i]}: Favourable growing conditions (avg ${m.tempAvg.toFixed(1)}°C, ${m.rainfall.toFixed(0)}mm rainfall)`]
        : descriptions,
    }
  })
}

export function getRiskColor(risk: RiskType): string {
  const colors: Record<RiskType, string> = {
    frost: '#3b82f6',      // blue
    heat: '#ef4444',       // red
    drought: '#f59e0b',    // amber
    flood: '#6366f1',      // indigo
    'bare-field': '#94a3b8', // slate
    none: '#22c55e',       // green
  }
  return colors[risk]
}

export function getRiskIcon(risk: RiskType): string {
  const icons: Record<RiskType, string> = {
    frost: '❄️', heat: '🌡️', drought: '☀️', flood: '🌧️', 'bare-field': '🌾', none: '✅'
  }
  return icons[risk]
}
