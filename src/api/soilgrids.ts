import type { SoilData } from '../types'
import fallback from '../data/soil-fallback.json'
interface SoilResponse {
  _soilsight?: { provider?: string; sourceUrl?: string }
  properties?: {
    layers?: Array<{
      name: string
      unit_measure?: { d_factor?: number }
      depths: Array<{ label: string; values: { mean: number | null } }>
    }>
  }
}
export function parseSoilGrids(data: SoilResponse, sourceUrl?: string): SoilData {
  const layers = data.properties?.layers
  const get = (name: string, divisor: number) => {
    const layer = layers?.find((l) => l.name === name)
    if (!layer) throw new Error(`SoilGrids ${name} property is missing.`)
    const depths = [
      { label: '0-5cm', weight: 5 },
      { label: '5-15cm', weight: 10 },
      { label: '15-30cm', weight: 15 },
    ]
    const factor = layer.unit_measure?.d_factor ?? divisor
    if (!Number.isFinite(factor) || factor <= 0)
      throw new Error(`SoilGrids ${name} unit conversion is invalid.`)
    const available = depths.flatMap((d) => {
      const value = layer?.depths.find((x) => x.label === d.label)?.values.mean
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return []
      return [{ value: value / factor, weight: d.weight }]
    })
    if (!available.length) throw new Error(`SoilGrids ${name} has no usable depth values.`)
    const coveredDepth = available.reduce((sum, sample) => sum + sample.weight, 0)
    return available.reduce((sum, sample) => sum + sample.value * sample.weight, 0) / coveredDepth
  }
  const optional = (name: string, divisor: number) => {
    try {
      return get(name, divisor)
    } catch {
      return null
    }
  }
  const ph = get('phh2o', 10),
    organicCarbon = optional('soc', 10),
    rawTexture = {
      clay: get('clay', 10),
      sand: get('sand', 10),
      silt: get('silt', 10),
    },
    textureTotal = rawTexture.clay + rawTexture.sand + rawTexture.silt
  // SoilGrids models the fractions independently, so normalize valid component predictions to 100%.
  if (
    ph < 0 ||
    ph > 14 ||
    Object.values(rawTexture).some((x) => x < 0 || x > 100) ||
    textureTotal < 50 ||
    textureTotal > 150
  )
    throw new Error('Invalid SoilGrids soil profile.')
  const texture = {
    clay: (rawTexture.clay / textureTotal) * 100,
    sand: (rawTexture.sand / textureTotal) * 100,
    silt: (rawTexture.silt / textureTotal) * 100,
  }
  return {
    ph,
    organicCarbon,
    ...texture,
    cec: optional('cec', 10),
    nitrogen: optional('nitrogen', 100),
    textureClass:
      texture.clay >= 40
        ? 'Clay-rich'
        : texture.sand >= 70
          ? 'Sand-rich'
          : texture.silt >= 60
            ? 'Silt-rich'
            : 'Mixed texture',
    source: 'soilgrids',
    sourceUrl: data._soilsight?.sourceUrl ?? sourceUrl,
    confidence: {
      level: 'estimated',
      label: 'Estimated · SoilGrids',
      description: `250 m global soil predictions${data._soilsight?.provider ? ` delivered by ${data._soilsight.provider}` : ''}; available requested depths are thickness-weighted and texture fractions are normalized. Optional carbon, CEC or nitrogen values may be unavailable. Local soil testing is needed.`,
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
  const openEpiParams = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4) })
  for (const p of ['phh2o', 'clay', 'sand', 'silt']) params.append('property', p)
  for (const p of ['phh2o', 'clay', 'sand', 'silt']) openEpiParams.append('properties', p)
  for (const d of ['0-5cm', '5-15cm', '15-30cm']) {
    params.append('depth', d)
    openEpiParams.append('depths', d)
  }
  openEpiParams.append('values', 'mean')
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?${params}`
  const openEpiUrl = `https://api.openepi.io/soil/property?${openEpiParams}`
  const proxyUrl = `/api/soilgrids?lat=${encodeURIComponent(lat.toFixed(4))}&lon=${encodeURIComponent(lon.toFixed(4))}`
  const request = async (requestUrl: string, timeout: number) => {
    const response = await fetch(requestUrl, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
        : AbortSignal.timeout(timeout),
    })
    if (!response.ok) {
      const body = (await response
        .clone()
        .json()
        .catch(() => null)) as { error?: string; detail?: string } | null
      const detail = body?.detail ?? body?.error
      throw new Error(`SoilGrids returned HTTP ${response.status}${detail ? `: ${detail}` : ''}.`)
    }
    return response.json()
  }
  try {
    // ISRIC can need several seconds to assemble seven properties at three depths.
    // Prefer the same-origin serverless proxy so browser CORS never determines availability.
    return parseSoilGrids(await request(proxyUrl, 35000), url)
  } catch (proxyError) {
    if (signal?.aborted) throw proxyError
    // Direct providers remain development fallbacks; production normally succeeds via the proxy.
    try {
      return parseSoilGrids(await request(url, 8000), url)
    } catch (isricError) {
      try {
        const data = (await request(openEpiUrl, 16000)) as SoilResponse
        data._soilsight = { provider: 'SoilGrids via OpenEPI', sourceUrl: openEpiUrl }
        return parseSoilGrids(data, openEpiUrl)
      } catch (openEpiError) {
        const explain = (error: unknown) =>
          error instanceof Error ? error.message : 'unknown request failure'
        throw new Error(
          `Proxy: ${explain(proxyError)} Direct ISRIC: ${explain(isricError)} OpenEPI: ${explain(openEpiError)}`,
        )
      }
    }
  }
}
export function getFallbackSoil(): SoilData {
  return {
    ...fallback,
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
