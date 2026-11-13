
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'

// Load private credentials from the project's .env file
if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const PORT = 3001

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')

  if (requestUrl.pathname !== '/api/weather' || req.method !== 'GET') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Route not found' }))
    return
  }

  const username = process.env.METEOMATICS_USERNAME
  const password = process.env.METEOMATICS_PASSWORD

  if (!username || !password) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Meteomatics credentials are not configured.' }))
    return
  }

  const lat = Number(requestUrl.searchParams.get('lat'))
  const lon = Number(requestUrl.searchParams.get('lon'))

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid latitude or longitude.' }))
    return
  }

  const parameters =
    't_2m:C,relative_humidity_2m:p,wind_speed_10m:ms,precip_1h:mm'

  const url =
    `https://api.meteomatics.com/now/${parameters}/${lat},${lon}/json`

  const auth = Buffer.from(`${username}:${password}`).toString('base64')

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      console.error('Meteomatics HTTP error:', response.status)
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Meteomatics request failed. Check API access and credentials.' }))
      return
    }

    const data = await response.json()

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  } catch (error) {
    console.error('Weather request failed:', error.message)
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unable to retrieve weather data.' }))
  }
})

server.listen(PORT, () => {
  console.log(`SoilSight weather backend running on http://localhost:${PORT}`)
})
