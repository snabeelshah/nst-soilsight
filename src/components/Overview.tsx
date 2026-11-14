import { ArrowRight, ArrowUpRight, Sprout, Droplets, CalendarDays } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { buildRiskCalendar } from '../lib/riskCalendar'
import { MONTHS } from '../lib/climate'
import { FieldSelector } from './FieldSelector'
import { Metric, number, SourceNote } from './ui'
export function Overview() {
  const {
    nasaData: nasa,
    soilData: soil,
    rankedStrategies,
    field,
    fieldName,
    setActiveTab,
    language,
  } = useAppStore()
  const best = rankedStrategies[0],
    risks = nasa ? buildRiskCalendar(nasa.monthly) : []
  const chart = nasa?.monthly.map((m) => ({
    month: MONTHS[m.month - 1],
    rainfall: Math.round(m.rainfall),
    temperature: Number(m.tempAvg.toFixed(1)),
  }))
  return (
    <div className="view-stack">
      <section className="hero">
        <div>
          <span className="eyebrow">
            <span className="live-dot" /> NASA DATA. LOCAL POSSIBILITIES.
          </span>
          <h1>
            {language === 'ur' ? (
              'اگلے موسم کی بہتر منصوبہ بندی۔'
            ) : (
              <>
                A clearer view of
                <br />
                your next growing season.
              </>
            )}
          </h1>
          <p>
            {language === 'ur'
              ? 'اپنا کھیت منتخب کریں، موسمی خطرات سمجھیں اور اپنی ترجیحات کے مطابق فصلوں کا موازنہ کریں۔'
              : 'Understand your land. Explore the trade-offs. Build a crop plan around what matters to you.'}
          </p>
          <button
            className="btn primary"
            onClick={() => {
              if (nasa) setActiveTab('crops')
              else document.getElementById('field-selector')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            {nasa
              ? 'Explore your crop plans'
              : field
                ? 'Continue field setup'
                : 'Choose your field'}{' '}
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 320 240" fill="none">
            <path d="M24 180L160 244L306 164L168 100Z" fill="#ded5b9" />
            <path d="M24 156L160 222L306 142L168 78Z" fill="#91a778" />
            <path d="M24 133L160 198L306 119L168 54Z" fill="#577851" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path
                key={i}
                d={`M${40 + i * 21} ${126 + i * 10}L${184 + i * 20} ${62 + i * 10}`}
                stroke="#aac38d"
                strokeWidth="7"
              />
            ))}
            <path
              d="M168 54L306 119L160 198L24 133Z"
              stroke="#e7edd4"
              strokeWidth="2"
              strokeDasharray="6 5"
            />
            <circle cx="168" cy="54" r="6" fill="#fff8dc" />
            <path d="M168 54V22" stroke="#f7f4e6" strokeWidth="2" />
            <circle cx="168" cy="18" r="7" fill="#dba95f" />
          </svg>
          <span>
            FROM EARTH OBSERVATIONS
            <br />
            TO FIELD DECISIONS
          </span>
        </div>
      </section>
      <FieldSelector />
      <div className="section-label">
        <h2>
          {fieldName || 'Your field'} <span className="muted">/ season overview</span>
        </h2>
        <span className="tag">
          {nasa?.kind === 'live'
            ? 'NASA climate loaded'
            : nasa?.kind === 'imported'
              ? 'Imported inputs'
              : nasa
                ? 'Demo workspace'
                : 'Awaiting data'}
        </span>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Annual rainfall"
          value={
            nasa ? (
              <>
                {number(nasa.annualRainfall)} <em>mm</em>
              </>
            ) : (
              '—'
            )
          }
          detail={nasa?.confidence.label ?? 'No climate loaded'}
        />
        <Metric
          label="Mean temperature"
          value={
            nasa ? (
              <>
                {number(nasa.avgTemp, 1)}
                <em>°C</em>
              </>
            ) : (
              '—'
            )
          }
          detail="Day-weighted annual average"
        />
        <Metric
          label="Planning attention"
          value={
            nasa ? (
              <>
                {risks.filter((r) => r.severity === 'high').length}
                <em> months</em>
              </>
            ) : (
              '—'
            )
          }
          detail="Estimated high climate risk · not a forecast"
        />
        <Metric
          label="Topsoil pH"
          value={soil ? soil.ph.toFixed(1) : '—'}
          detail={soil?.confidence.label ?? 'No soil profile'}
        />
      </div>
      <section className="panel seasonal-card overview-seasonal">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">02 / CLIMATE SIGNALS</span>
            <h2>Your year, at a glance</h2>
          </div>
        </div>
        {nasa ? (
          <>
            <div className="chart-legend">
              <span>
                <i className="rain-dot" /> Rainfall · mm
              </span>
              <span>
                <i className="temp-dot" /> Temperature · °C
              </span>
            </div>
            <div
              className="chart"
              role="img"
              aria-label="Monthly rainfall and mean temperature chart"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ left: -20, right: -20, top: 15 }}>
                  <CartesianGrid vertical={false} stroke="#e9ece4" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis yAxisId="rain" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="temp"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#dbe3d3' }} />
                  <Bar
                    isAnimationActive={false}
                    dataKey="rainfall"
                    name="Rainfall (mm)"
                    yAxisId="rain"
                    fill="#adc5ad"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    isAnimationActive={false}
                    dataKey="temperature"
                    name="Mean temperature (°C)"
                    yAxisId="temp"
                    stroke="#b57a3c"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="risk-strip">
              {risks.map((r) => (
                <button
                  key={r.month}
                  title={`${r.monthName}: ${r.severity} attention`}
                  onClick={() => setActiveTab('risk')}
                >
                  <span>{r.monthName[0]}</span>
                  <i className={r.severity} />
                </button>
              ))}
            </div>
            <p className="caption inset">
              Monthly risk signals · green low, amber medium, rust high
            </p>
            <SourceNote />
            <button className="text-link inset" onClick={() => setActiveTab('nasa')}>
              Explore climate & sources <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <p className="inset muted">Load climate data to see the seasonal pattern.</p>
        )}
      </section>
      <div className="next-grid">
        <button className="next-card" onClick={() => setActiveTab('crops')}>
          <Sprout size={22} />
          <div>
            <span className="eyebrow">YOUR BEST FIT</span>
            <h3>{best?.crops.length ? best.name : 'Compare three approaches'}</h3>
            <p>
              {best?.crops.length
                ? best.crops.map((c) => c.crop.name).join(' → ')
                : 'Balance soil, water and your priorities.'}
            </p>
          </div>
          <ArrowUpRight size={20} />
        </button>
        <button className="next-card" onClick={() => setActiveTab('simulator')}>
          <Droplets size={22} />
          <div>
            <span className="eyebrow">WHAT IF?</span>
            <h3>Warmer. Drier. Still prepared.</h3>
            <p>Stress-test the same crop plans.</p>
          </div>
          <ArrowUpRight size={20} />
        </button>
        <button className="next-card" onClick={() => setActiveTab('action')}>
          <CalendarDays size={22} />
          <div>
            <span className="eyebrow">YOUR NEXT STEP</span>
            <h3>A plan you can take with you</h3>
            <p>Seasonal actions, ready to export.</p>
          </div>
          <ArrowUpRight size={20} />
        </button>
      </div>
    </div>
  )
}
