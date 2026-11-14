export interface EarthdataStatus {
  provider: 'NASA Earthdata'
  configured: boolean
  message: string
}

export async function fetchEarthdataStatus(signal?: AbortSignal): Promise<EarthdataStatus> {
  const response = await fetch('/api/earthdata/status', {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
      : AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`SoilSight data API returned HTTP ${response.status}.`)
  return response.json()
}
