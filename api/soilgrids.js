function sendJson(response, status, body) {
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  return response.status(status).json(body)
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function requestSoilGrids(url) {
  let lastError
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const upstream = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SoilSight/1.0 (NASA Space Apps farm-planning prototype)',
        },
        signal: AbortSignal.timeout(12000),
      })
      if (!upstream.ok) {
        const error = new Error(`HTTP ${upstream.status}`)
        if (upstream.status < 500 && upstream.status !== 429) throw error
        lastError = error
      } else {
        const data = await upstream.json()
        if (!Array.isArray(data?.properties?.layers))
          throw new Error('SoilGrids returned an incomplete response.')
        return data
      }
    } catch (error) {
      lastError = error
    }
    if (attempt === 1) await wait(350)
  }
  throw lastError ?? new Error('SoilGrids request failed.')
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
    const data = await requestSoilGrids(
      `https://rest.isric.org/soilgrids/v2.0/properties/query?${params}`,
    )
    return sendJson(response, 200, data)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown upstream failure.'
    console.error('SoilGrids proxy request failed:', detail)
    return sendJson(response, 502, {
      error: 'SoilGrids is currently unavailable.',
      detail,
    })
  }
}
