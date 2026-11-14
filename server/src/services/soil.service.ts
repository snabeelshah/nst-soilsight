import type { SoilData } from '../types/index.js'

interface SoilResponse {
  properties?: {
    layers?: Array<{
      name: string
      unit_measure?: { d_factor?: number }
      depths: Array<{ label: string; values: { mean: number | null } }>
    }>
  }
}

const fallbackSoilValues = {
  ph: 6.5,
  organicCarbon: 12,
  clay: 25,
  sand: 40,
  silt: 35,
  cec: 15,
  nitrogen: 1.2,
  textureClass: 'Illustrative loam',
}

export function parseSoilGrids(data: SoilResponse, sourceUrl?: string): SoilData {
  const layers = data.properties?.layers
  const get = (name: string, divisor: number) => {
    const layer = layers?.find((l) => l.name === name)
    const depths = [
      { label: '0-5cm', weight: 5 },
      { label: '5-15cm', weight: 10 },
      { label: '15-30cm', weight: 15 },
    ]
    return depths.reduce((sum, d) => {
      const value = layer?.depths.find((x) => x.label === d.label)?.values.mean
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`SoilGrids ${name} data missing for ${d.label}.`)
      }
      return sum + ((value / (layer?.unit_measure?.d_factor || divisor)) * d.weight) / 30
    }, 0)
  }

  const ph = get('phh2o', 10),
    organicCarbon = get('soc', 10),
    clay = get('clay', 10),
    sand = get('sand', 10),
    silt = get('silt', 10)

  const texture = { clay, sand, silt }
  if (
    ph > 14 ||
    Object.values(texture).some((x) => x > 100) ||
    Math.abs(texture.clay + texture.sand + texture.silt - 100) > 5
  ) {
    throw new Error('Invalid SoilGrids soil profile.')
  }

  return {
    ph,
    organicCarbon,
    ...texture,
    cec: get('cec', 10),
    nitrogen: get('nitrogen', 100),
    textureClass:
      texture.clay >= 40
        ? 'Clay-rich'
        : texture.sand >= 70
          ? 'Sand-rich'
          : texture.silt >= 60
            ? 'Silt-rich'
            : 'Mixed texture',
    source: 'soilgrids',
    sourceUrl,
    confidence: {
      level: 'estimated',
      label: 'Estimated · SoilGrids',
      description:
        '250 m global soil predictions; thickness-weighted 0–30 cm means. Local soil testing is needed.',
      color: '#776290',
    },
  }
}

export async function fetchSoilData(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<SoilData> {
  const params = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4), value: 'mean' })
  for (const p of ['phh2o', 'soc', 'clay', 'sand', 'silt', 'cec', 'nitrogen']) {
    params.append('property', p)
  }
  for (const d of ['0-5cm', '5-15cm', '15-30cm']) {
    params.append('depth', d)
  }
  const url = `https://rest.soilgrids.org/soilgrids/v2.0/properties/query?${params}`

  try {
    const timeoutSignal = AbortSignal.timeout(10000)
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
    const response = await fetch(url, { signal: combinedSignal })
    if (!response.ok) throw new Error(`SoilGrids returned HTTP ${response.status}.`)
    return parseSoilGrids((await response.json()) as SoilResponse, url)
  } catch {
    return getFallbackSoil()
  }
}

export function getFallbackSoil(): SoilData {
  return {
    ...fallbackSoilValues,
    source: 'fallback',
    confidence: {
      level: 'estimated',
      label: 'Estimated · example soil',
      description:
        'Bundled example soil profile, not a prediction for this field. Soil-based recommendations remain provisional until a soil test is available.',
      color: '#9a682a',
    },
  }
}
