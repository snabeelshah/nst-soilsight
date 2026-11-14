import dotenv from 'dotenv'

// Load environment variables from .env file into process.env
dotenv.config()

export interface EnvConfig {
  port: number
  host: string
  nodeEnv: string
  corsOrigin: string | string[]
}

const rawCorsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
const corsOrigin = rawCorsOrigin.includes(',')
  ? rawCorsOrigin.split(',').map((origin) => origin.trim())
  : rawCorsOrigin

export const env: EnvConfig = {
  port: parseInt(process.env.PORT ?? '5000', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin,
}
