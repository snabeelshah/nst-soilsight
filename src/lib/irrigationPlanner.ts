import type { NASAMonthlyData, RotationCrop } from '../types'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export interface IrrigationMonth {
  month: number
  monthName: string
  cropName: string | null
  et0: number          // mm
  rainfall: number     // mm
  cropWaterNeed: number // mm (kc * ET0)
  waterGap: number     // mm (gap = need - rainfall, 0 if surplus)
  surplus: number      // mm rainfall surplus
}

// FAO crop coefficients (Kc) by growth stage
const KC_TABLE: Record<string, number> = {
  wheat: 1.1, rice: 1.25, maize: 1.15, sorghum: 1.0, 'millet-pearl': 0.95,
  barley: 1.05, chickpea: 1.0, lentil: 0.95, mungbean: 1.05, cowpea: 1.0,
  soybean: 1.15, groundnut: 1.1, mustard: 1.05, sunflower: 1.1, sesame: 1.0,
  cotton: 1.15, sugarcane: 1.25, potato: 1.1, onion: 1.0, tomato: 1.15,
  berseem: 1.0, 'sunn-hemp': 0.95, fallow: 0.3, 'radish-daikon': 0.9,
  'sweet-potato': 1.05, cassava: 1.0, banana: 1.1, mango: 0.8,
}

export function buildIrrigationPlan(
  monthly: NASAMonthlyData[],
  crops: RotationCrop[]
): IrrigationMonth[] {
  return monthly.map((m, i) => {
    const monthNum = i + 1
    const activeCrop = crops.find(rc => {
      if (rc.monthStart <= rc.monthEnd) {
        return monthNum >= rc.monthStart && monthNum <= rc.monthEnd
      }
      return monthNum >= rc.monthStart || monthNum <= rc.monthEnd
    })

    const kc = activeCrop ? (KC_TABLE[activeCrop.crop.id] ?? 1.0) : 0.3
    const cropWaterNeed = m.et0 * kc
    const waterGap = Math.max(0, cropWaterNeed - m.rainfall)
    const surplus = Math.max(0, m.rainfall - cropWaterNeed)

    return {
      month: monthNum,
      monthName: MONTH_NAMES[i],
      cropName: activeCrop ? activeCrop.crop.name : null,
      et0: m.et0,
      rainfall: m.rainfall,
      cropWaterNeed,
      waterGap,
      surplus,
    }
  })
}

export function totalIrrigationNeed(plan: IrrigationMonth[]): number {
  return plan.reduce((s, m) => s + m.waterGap, 0)
}
