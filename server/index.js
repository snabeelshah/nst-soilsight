import { createServer } from 'node:http'
import { existsSync } from 'node:fs'

if (existsSync('.env')) process.loadEnvFile('.env')

const port = Number(process.env.SOILSIGHT_API_PORT ?? 3001)

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(body))
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { service: 'SoilSight data API', status: 'ok' })
    return
  }

  if (url.pathname === '/api/earthdata/status') {
    sendJson(response, 200, {
      provider: 'NASA Earthdata',
      configured: Boolean(process.env.EARTHDATA_TOKEN),
      message: process.env.EARTHDATA_TOKEN
        ? 'Earthdata authentication is configured on the server.'
        : 'Set EARTHDATA_TOKEN on the server before enabling authenticated NASA products.',
    })
    return
  }

  if (url.pathname === '/api/soilgrids') {
    const rawLat = url.searchParams.get('lat')
    const rawLon = url.searchParams.get('lon')
    const lat = Number(rawLat)
    const lon = Number(rawLon)
    if (
      rawLat === null ||
      rawLat.trim() === '' ||
      rawLon === null ||
      rawLon.trim() === '' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    ) {
      sendJson(response, 400, { error: 'Valid latitude and longitude are required.' })
      return
    }
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
      sendJson(response, 200, await upstream.json())
    } catch (error) {
      console.error(
        'SoilGrids proxy request failed:',
        error instanceof Error ? error.message : error,
      )
      sendJson(response, 502, { error: 'SoilGrids is currently unavailable.' })
    }
    return
  }

  sendJson(response, 404, { error: 'Route not found.' })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`SoilSight data API listening on http://127.0.0.1:${port}`)
})
