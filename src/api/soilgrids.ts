import axios from 'axios'
import type { SoilData, DataConfidence } from '../types'

const SOILGRIDS_BASE = 'https://rest.soilgrids.org/soilgrids/v2.0/properties/query'

function getTextureClass(clay: number, sand: number): string {
  const silt = 100 - clay - sand
  if (clay >= 40) return 'Clay'
  if (clay >= 27 && sand < 20) return 'Clay'
  if (clay >= 27 && silt >= 28) return 'Clay loam'
  if (clay >= 20 && sand <= 45) return 'Loam'
  if (sand >= 85) return 'Sand'
  if (sand >= 70 && clay < 15) return 'Sandy loam'
  if (silt >= 80) return 'Silt'
  if (silt >= 50) return 'Silt loam'
  return 'Sandy clay loam'
}

export async function fetchSoilData(lat: number, lon: number): Promise<SoilData> {
  const properties = 'phh2o,soc,clay,sand,cec,nitrogen'
  const url = `${SOILGRIDS_BASE}?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}&property=${properties}&depth=0-30cm&value=mean`

  try {
    const { data } = await axios.get(url, { timeout: 20000 })
    const layers = data?.properties?.layers as Array<{ name: string; depths: Array<{ values: { mean: number } }> }>
    if (!layers) throw new Error('No layers in SoilGrids response')

    const get = (name: string, divisor = 1): number => {
      const layer = layers.find(l => l.name === name)
      const val = layer?.depths?.[0]?.values?.mean
      return val != null ? val / divisor : 0
    }

    const ph = get('phh2o', 10)
    const soc = get('soc', 10)
    const clay = get('clay', 10)
    const sand = get('sand', 10)
    const silt = Math.max(0, 100 - clay - sand)
    const cec = get('cec', 10)
    const nitrogen = get('nitrogen', 100)

    const confidence: DataConfidence = {
      level: 'estimated',
      label: 'Estimated (SoilGrids 250m)',
      description: 'SoilGrids v2.0: machine-learning model at 250m resolution using global soil profiles. Local variation may differ significantly.',
      color: '#7b1fa2',
    }

    return { ph, organicCarbon: soc, clay, sand, silt, cec, nitrogen, confidence, source: 'soilgrids', textureClass: getTextureClass(clay, sand) }
  } catch (err) {
    console.warn('SoilGrids API failed, using fallback:', err)
    return getFallbackSoil(lat, lon)
  }
}

export function getFallbackSoil(lat: number, lon: number): SoilData {
  // Approximate by climate zone
  const absLat = Math.abs(lat)
  const isTropical = absLat < 15
  const isArid = absLat >= 15 && absLat < 35

  const ph = isTropical ? 5.5 : isArid ? 7.5 : 6.5
  const soc = isTropical ? 15 : isArid ? 8 : 20
  const clay = isTropical ? 35 : isArid ? 20 : 25
  const sand = isTropical ? 30 : isArid ? 55 : 35
  const silt = 100 - clay - sand

  const confidence: DataConfidence = {
    level: 'estimated',
    label: 'Estimated (Climate Zone Model)',
    description: 'SoilGrids API unavailable. Values estimated from climate zone. Contact a local agronomist for field measurements.',
    color: '#f57c00',
  }

  return { ph, organicCarbon: soc, clay, sand, silt, cec: 15, nitrogen: 1.2, confidence, source: 'fallback', textureClass: getTextureClass(clay, sand) }
}
