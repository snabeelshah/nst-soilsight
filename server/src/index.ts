import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()

const server = app.listen(env.port, env.host, () => {
  console.log(`[SoilSight Backend] Server running in ${env.nodeEnv} mode`)
  console.log(`[SoilSight Backend] Listening on http://${env.host}:${env.port}`)
  console.log(`[SoilSight Backend] Health check: http://localhost:${env.port}/api/health`)
})

// Graceful shutdown handling
function shutdown(signal: string) {
  console.log(`\n[SoilSight Backend] Received ${signal}. Closing server...`)
  server.close(() => {
    console.log('[SoilSight Backend] HTTP server closed.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
