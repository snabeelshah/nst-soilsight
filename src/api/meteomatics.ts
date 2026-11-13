
export interface MeteomaticsData {
  data: {
    parameter: string
    coordinates: {
      lat: number
      lon: number
      dates: {
        date: string
        value: number
      }[]
    }[]
  }[]
}

export async function fetchMeteomaticsWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<MeteomaticsData> {
  const response = await fetch(
    `/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    { signal },
  )

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || 'Unable to load Meteomatics weather.')
  }

  return response.json()
}
