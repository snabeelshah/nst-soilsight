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

const server = createServer((request, response) => {
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

  sendJson(response, 404, { error: 'Route not found.' })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`SoilSight data API listening on http://127.0.0.1:${port}`)
})
