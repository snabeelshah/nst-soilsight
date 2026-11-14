function sendJson(response, status, body) {
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  return response.status(status).json(body)
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
  for (const property of ['phh2o', 'soc', 'clay', 'sand', 'silt', 'cec', 'nitrogen'])
    params.append('property', property)
  for (const depth of ['0-5cm', '5-15cm', '15-30cm']) params.append('depth', depth)

  try {
    const upstream = await fetch(
      `https://rest.isric.org/soilgrids/v2.0/properties/query?${params}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`)
    return sendJson(response, 200, await upstream.json())
  } catch (error) {
    console.error('SoilGrids proxy request failed:', error instanceof Error ? error.message : error)
    return sendJson(response, 502, { error: 'SoilGrids is currently unavailable.' })
  }
}
