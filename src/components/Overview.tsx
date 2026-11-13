import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { DataConfidenceBadge } from './DataConfidenceBadge'
import {
  ArrowRight, CalendarDays, Droplets, Leaf, MapPin, Sprout, TestTube2, Thermometer, Wheat,
} from 'lucide-react'

export const Overview: React.FC = () => {
  const { field, nasaData, soilData, rankedStrategies, riskCalendar, language, setActiveTab } = useAppStore()
  const topStrategy = rankedStrategies[0]
  const highRiskMonths = riskCalendar.filter((month) => month.severity === 'high')
  const metricCard = 'rounded-2xl border border-[#e9dfcf] bg-white/80 p-4 shadow-sm'

  const metrics = [
    { label: 'Field size', value: field ? `${field.areaHectares.toFixed(1)} ha` : '—', detail: field ? `${field.areaAcres.toFixed(1)} acres` : 'Select a field', icon: MapPin },
    { label: 'Annual rainfall', value: nasaData ? `${Math.round(nasaData.annualRainfall)} mm` : '—', detail: 'Yearly average', icon: Droplets },
    { label: 'Average temperature', value: nasaData ? `${nasaData.avgTemp.toFixed(1)}°C` : '—', detail: 'Annual average', icon: Thermometer },
    { label: 'Soil pH', value: soilData ? soilData.ph.toFixed(1) : '—', detail: soilData?.textureClass ?? 'Soil profile', icon: TestTube2 },
    { label: 'Organic carbon', value: soilData ? `${soilData.organicCarbon.toFixed(1)} g/kg` : '—', detail: 'Topsoil estimate', icon: Leaf },
    { label: 'Irrigation need', value: topStrategy ? `${Math.round(topStrategy.irrigationTotal)} mm` : '—', detail: 'Recommended rotation / year', icon: Droplets },
  ]

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#e8d9c4] bg-gradient-to-br from-[#fffdf8] to-[#f4ead9] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#92734d]">
              <span className="h-2 w-2 rounded-full bg-[#78945f]" />
              Farm snapshot
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-[#342a20] sm:text-3xl">
              {field ? 'Your field at a glance' : 'Welcome to SoilSight'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756858]">
              {field
                ? `A practical overview of soil, climate, water needs and crop planning for ${field.center.lat.toFixed(3)}°, ${field.center.lng.toFixed(3)}°.`
                : 'Choose a demo location or draw your field boundary to see local soil and climate facts.'}
            </p>
          </div>
          {nasaData && <DataConfidenceBadge confidence={nasaData.confidence} inline />}
        </div>
      </section>

      <section aria-label="Key field figures" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className={metricCard}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3eadc] text-[#8b6a42]">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-[#847766]">{label}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-[#342a20]">{value}</p>
            <p className="mt-1 text-[11px] text-[#9a8d7b]">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-[#e9dfcf] bg-white/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e2] text-[#5f7c48]">
                <Sprout className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-[#342a20]">Recommended rotation</h3>
                <p className="text-xs text-[#8a7c69]">Best match for this field</p>
              </div>
            </div>
            {topStrategy && (
              <span className="rounded-full bg-[#edf2e8] px-2.5 py-1 text-xs font-bold text-[#5f7c48]">
                {topStrategy.scores.overall}/100
              </span>
            )}
          </div>
          <p className="mt-4 text-lg font-bold text-[#463927]">
            {topStrategy ? (language === 'ur' ? topStrategy.nameUrdu : topStrategy.name) : 'No recommendation yet'}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#756858]">
            {topStrategy?.crops.map((crop) => crop.crop.name).join(' → ') ?? 'Select a field to calculate suitable crop sequences.'}
          </p>
          <button onClick={() => setActiveTab('crops')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7b613e] hover:text-[#5f482d]">
            Explore crop plans <ArrowRight className="h-4 w-4" />
          </button>
        </article>

        <article className="rounded-2xl border border-[#e9dfcf] bg-white/80 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7eee0] text-[#a17942]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-[#342a20]">Seasonal risk outlook</h3>
              <p className="text-xs text-[#8a7c69]">12-month climate calendar</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-[#756858]">
            {highRiskMonths.length
              ? <><strong className="text-[#9a563b]">{highRiskMonths.length} high-risk months</strong> need extra planning.</>
              : 'No high-risk months identified in the current outlook.'}
          </p>
          <div className="mt-4 flex gap-1" aria-label="Monthly risk levels">
            {riskCalendar.slice(0, 12).map((month) => (
              <span
                key={month.month}
                title={`${month.monthName}: ${month.severity} risk`}
                className={`h-2.5 flex-1 rounded-full ${
                  month.severity === 'high' ? 'bg-[#c8795d]' : month.severity === 'medium' ? 'bg-[#d9ae68]' : 'bg-[#9aaf7d]'
                }`}
              />
            ))}
          </div>
          <button onClick={() => setActiveTab('risk')} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#7b613e] hover:text-[#5f482d]">
            View risk calendar <ArrowRight className="h-4 w-4" />
          </button>
        </article>

        <article className="rounded-2xl border border-[#e9dfcf] bg-white/80 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3eadc] text-[#8b6a42]">
              <Wheat className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-[#342a20]">Soil at a glance</h3>
              <p className="text-xs text-[#8a7c69]">Topsoil properties</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[#847766]">Texture</dt><dd className="font-medium text-[#463927]">{soilData?.textureClass ?? '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#847766]">Nitrogen</dt><dd className="font-medium text-[#463927]">{soilData ? `${soilData.nitrogen.toFixed(1)} g/kg` : '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#847766]">CEC</dt><dd className="font-medium text-[#463927]">{soilData ? `${soilData.cec.toFixed(1)} cmol/kg` : '—'}</dd></div>
          </dl>
          <button onClick={() => setActiveTab('soil')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7b613e] hover:text-[#5f482d]">
            Soil details <ArrowRight className="h-4 w-4" />
          </button>
        </article>
      </section>
    </div>
  )
}
