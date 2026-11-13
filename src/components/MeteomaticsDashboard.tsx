
import { useEffect, useState } from 'react'
import { fetchMeteomaticsWeather } from '../api/meteomatics'
import { useAppStore } from '../store/useAppStore'

export default function MeteomaticsDashboard() {
  const field = useAppStore((state) => state.field)
  const lat = field?.center.lat
  const lon = field?.center.lng

  const [weather, setWeather] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (lat == null || lon == null) return

    const latitude = lat
    const longitude = lon
    const controller = new AbortController()

    async function loadWeather() {
      setLoading(true)
      setError('')

      try {
        const result = await fetchMeteomaticsWeather(
          latitude,
          longitude,
          controller.signal
        )

        const values: Record<string, number> = {}

        for (const item of result.data) {
          const value = item.coordinates[0]?.dates[0]?.value

          if (typeof value === 'number') {
            values[item.parameter] = value
          }
        }

        setWeather(values)
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Weather data could not be loaded.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadWeather()

    return () => controller.abort()
  }, [lat, lon])

  if (!field) return <p>Select a field to view weather data.</p>
  if (loading) return <p>Loading live weather data...</p>
  if (error) return <p>Weather error: {error}</p>

  const cards = [
    { label: 'Temperature', value: weather['t_2m:C'], unit: '°C' },
    { label: 'Humidity', value: weather['relative_humidity_2m:p'], unit: '%' },
    { label: 'Wind speed', value: weather['wind_speed_10m:ms'], unit: 'm/s' },
    { label: 'Hourly precipitation', value: weather['precip_1h:mm'], unit: 'mm' },
  ]

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Meteomatics Live Weather</h2>
        <p className="text-sm text-gray-500">
          Current weather conditions for your selected field.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border p-5">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">
              {card.value !== undefined
                ? `${card.value} ${card.unit}`
                : 'Unavailable'}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
