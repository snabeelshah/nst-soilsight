import type { NASAMonthlyData, RotationCrop } from '../types'
import { monthRange, MONTHS } from './climate'
export interface IrrigationMonth {
  month: number
  monthName: string
  cropName: string | null
  et0: number
  rainfall: number
  effectiveRainfall: number
  cropWaterNeed: number
  waterGap: number
  surplus: number
}
// Illustrative mid-season Kc values informed by FAO-56; stage multipliers below are approximations.
export const KC_TABLE: Record<string, number> = {
  wheat: 1.15,
  rice: 1.2,
  maize: 1.2,
  sorghum: 1.0,
  'millet-pearl': 1.0,
  barley: 1.15,
  chickpea: 1,
  lentil: 1.1,
  mungbean: 1.05,
  cowpea: 1.05,
  soybean: 1.15,
  groundnut: 1.15,
  mustard: 1.1,
  sunflower: 1.15,
  sesame: 1.1,
  cotton: 1.15,
  potato: 1.15,
  onion: 1.05,
  tomato: 1.15,
  berseem: 1.0,
  'sunn-hemp': 1,
  'radish-daikon': 0.9,
  'sweet-potato': 1.15,
}
export function buildIrrigationPlan(
  monthly: NASAMonthlyData[],
  crops: RotationCrop[],
): IrrigationMonth[] {
  return monthly.map((m) => {
    const active = crops.find((c) => monthRange(c.monthStart, c.monthEnd).includes(m.month))
    const season = active ? monthRange(active.monthStart, active.monthEnd) : []
    const index = season.indexOf(m.month)
    const stage = index === 0 ? 0.55 : index === season.length - 1 ? 0.75 : 1
    const cropWaterNeed = active ? m.et0 * (KC_TABLE[active.crop.id] ?? 1) * stage : 0
    const effectiveRainfall = m.rainfall * 0.8
    return {
      month: m.month,
      monthName: MONTHS[m.month - 1],
      cropName: active?.crop.name ?? null,
      et0: m.et0,
      rainfall: m.rainfall,
      effectiveRainfall,
      cropWaterNeed,
      waterGap: Math.max(0, cropWaterNeed - effectiveRainfall),
      surplus: Math.max(0, effectiveRainfall - cropWaterNeed),
    }
  })
}
export const totalIrrigationNeed = (plan: IrrigationMonth[]) =>
  plan.reduce((s, m) => s + m.waterGap, 0)
