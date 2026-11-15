function sendJson(response, status, body, provider) {
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (provider) response.setHeader('X-SoilSight-Soil-Provider', provider)
  return response.status(status).json(body)
}

async function requestSoilProfile(isricUrl, openEpiUrl) {
  const failures = []
  for (const [provider, url, timeout] of [
    ['ISRIC SoilGrids', isricUrl, 8000],
    ['SoilGrids via OpenEPI', openEpiUrl, 20000],
  ]) {
    try {
      const upstream = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SoilSight/1.0 (NASA Space Apps farm-planning prototype)',
        },
        signal: AbortSignal.timeout(timeout),
      })
      if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`)
      const data = await upstream.json()
      if (!Array.isArray(data?.properties?.layers)) throw new Error('incomplete response')
      return { data, provider, sourceUrl: url }
    } catch (error) {
      failures.push(`${provider}: ${error instanceof Error ? error.message : 'unknown failure'}`)
    }
  }
  throw new Error(failures.join(' | '))
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' })

  const rawLat = Array.isArray(request.query.lat) ? request.query.lat[0] : request.query.lat
  const rawLon = Array.isArray(request.query.lon) ? request.query.lon[0] : request.query.lon
  const lat = Number(rawLat)
  const lon = Number(rawLon)
  if (
    typeof rawLat !== 'string' ||
    rawLat.trim() === '' ||
    typeof rawLon !== 'string' ||
    rawLon.trim() === '' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    return sendJson(response, 400, { error: 'Valid latitude and longitude are required.' })

  const params = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4), value: 'mean' })
  const openEpiParams = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4) })
  for (const property of ['phh2o', 'clay', 'sand', 'silt']) params.append('property', property)
  for (const property of ['phh2o', 'clay', 'sand', 'silt'])
    openEpiParams.append('properties', property)
  for (const depth of ['0-5cm', '5-15cm', '15-30cm']) {
    params.append('depth', depth)
    openEpiParams.append('depths', depth)
  }
  openEpiParams.append('values', 'mean')

  try {
    const result = await requestSoilProfile(
      `https://rest.isric.org/soilgrids/v2.0/properties/query?${params}`,
      `https://api.openepi.io/soil/property?${openEpiParams}`,
    )
    return sendJson(
      response,
      200,
      {
        ...result.data,
        _soilsight: { provider: result.provider, sourceUrl: result.sourceUrl },
      },
      result.provider,
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown upstream failure.'
    console.error('SoilGrids proxy request failed:', detail)
    return sendJson(response, 502, {
      error: 'SoilGrids is currently unavailable.',
      detail,
    })
  }
}
