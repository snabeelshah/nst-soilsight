import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw, Info } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { buildRiskCalendar } from '../lib/riskCalendar'
import { type analyzeSeries } from '../lib/historicalTrends'
import { fetchHistoricalTrends } from '../api/backend'
import { MONTHS } from '../lib/climate'
import { CROPS } from '../lib/cropDatabase'
import { EmptyState, ExpertBanner, PanelTitle, Metric, SourceNote, number } from './ui'
export function NASADashboard() {
  const { nasaData: nasa, fetchData, loading } = useAppStore()
  if (!nasa) return <EmptyState />
  const wettest = [...nasa.monthly].sort((a, b) => b.rainfall - a.rainfall)[0]
  const driest = [...nasa.monthly].sort((a, b) => a.rainfall - b.rainfall)[0]
  return (
    <div className="view-stack">
      <PanelTitle
        number="UNDERSTAND / THE CLIMATE BASELINE"
        title="A year of climate, in context"
        description="NASA POWER is the only climate provider. These are monthly patterns, not next week's weather."
        action={
          <button className="btn" disabled={loading} onClick={() => void fetchData()}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh NASA data
          </button>
        }
      />
      <SourceNote />
      <div className="metrics-grid">
        <Metric
          label="Rainfall / year"
          value={`${number(nasa.annualRainfall)} mm`}
          detail={nasa.confidence.label}
        />
        <Metric
          label="Wettest month"
          value={MONTHS[wettest.month - 1]}
          detail={`${number(wettest.rainfall)} mm · monthly total`}
        />
        <Metric
          label="Driest month"
          value={MONTHS[driest.month - 1]}
          detail={`${number(driest.rainfall)} mm · monthly total`}
        />
        <Metric
          label="Climate grid"
          value="~55 × 70 km"
          detail="At the equator · much larger than a field"
        />
      </div>
      <section className="panel padded">
        <div className="panel-heading">
          <h3>Monthly climate records</h3>
          {nasa.sourceUrl && (
            <a className="text-link" href={nasa.sourceUrl} target="_blank" rel="noreferrer">
              Open source response <ExternalLink size={14} />
            </a>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Monthly temperature, rainfall, soil wetness and estimated evapotranspiration
            </caption>
            <thead>
              <tr>
                <th>Month</th>
                <th>Mean low °C</th>
                <th>Mean °C</th>
                <th>Mean high °C</th>
                <th>Rain mm</th>
                <th>Root wetness</th>
                <th>Profile wetness</th>
                <th>ET₀ mm</th>
              </tr>
            </thead>
            <tbody>
              {nasa.monthly.map((m) => (
                <tr key={m.month}>
                  <th>{MONTHS[m.month - 1]}</th>
                  <td>{m.tempMin.toFixed(1)}</td>
                  <td>{m.tempAvg.toFixed(1)}</td>
                  <td>{m.tempMax.toFixed(1)}</td>
                  <td>{number(m.rainfall)}</td>
                  <td>{m.soilMoistureRoot?.toFixed(2) ?? 'Unavailable'}</td>
                  <td>{m.soilMoistureProf?.toFixed(2) ?? 'Unavailable'}</td>
                  <td>{number(m.et0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="caption">
          T2M_MIN/MAX are monthly means of daily minima/maxima, not monthly extremes. POWER rainfall
          is converted from mm/day using each month's day count (February: 28). GWETROOT/GWETPROF
          are dimensionless wetness indices, 0–1, not measured volumetric water content. ET₀ is an
          estimated Hargreaves calculation.
        </p>
      </section>
      <div className="two-columns">
        <section className="panel padded">
          <h3>What these data can tell you</h3>
          <p>
            Typical warm, cool, wet and dry windows help compare crop calendars and plan water
            infrastructure. The same grid-cell climate drives all three strategies.
          </p>
        </section>
        <section className="panel padded">
          <h3>What remains unknown</h3>
          <p>
            Field microclimates, local storms, irrigation, drainage and soil variability. This
            resolution cannot distinguish different zones inside a farm.
          </p>
        </section>
      </div>
    </div>
  )
}
export function RiskCalendar() {
  const nasa = useAppStore((s) => s.nasaData)
  if (!nasa) return <EmptyState />
  const risks = buildRiskCalendar(nasa.monthly)
  const labels = {
    frost: 'Cold / frost sensitivity',
    heat: 'Heat stress',
    drought: 'Water deficit',
    flood: 'Excess rain',
    none: 'No threshold triggered',
    'bare-field': 'Bare ground',
  }
  return (
    <div className="view-stack">
      <PanelTitle
        number="PREPARE / SEASONAL RISK WINDOWS"
        title="Know when to pay closer attention"
        description="Climate-based screening for cold, heat, water deficits and excess rain. This is not a forecast or an emergency alert."
      />
      <SourceNote />
      <div className="risk-legend">
        <span>
          <i className="low" /> Low attention
        </span>
        <span>
          <i className="medium" /> Medium attention
        </span>
        <span>
          <i className="high" /> High attention
        </span>
      </div>
      <div className="risk-grid">
        {risks.map((r) => (
          <article className={`panel risk-card ${r.severity}`} key={r.month}>
            <div>
              <h3>{r.monthName}</h3>
              <span className="tag">{r.severity}</span>
            </div>
            <strong>{r.risks.map((k) => labels[k]).join(' · ')}</strong>
            {r.description.map((d) => (
              <p key={d}>{d}</p>
            ))}
          </article>
        ))}
      </div>
      <details className="panel padded">
        <summary>Thresholds and limitations</summary>
        <p>
          Cold: mean daily minimum below 5°C (high below 0°C). Heat: mean daily maximum above 35°C
          (high above 40°C). Water: rain below 20 mm or estimated ET₀ minus rain above 60 mm (high
          above 120 mm). Excess rain: above 200 mm (high above 300 mm). Multiple signals raise
          attention to high. These generic screening thresholds are not calibrated for every crop or
          region. No trigger does not mean no risk; monthly averages hide extremes.
        </p>
      </details>
    </div>
  )
}
export function SoilHealthAdvisor() {
  const soil = useAppStore((s) => s.soilData)
  if (!soil) return <EmptyState />
  return (
    <div className="view-stack">
      <PanelTitle
        number="SUPPORT / THE SOIL BENEATH THE PLAN"
        title="Healthy soil starts with better questions"
        description="SoilGrids is an ISRIC global soil model, not a NASA product. All soil properties shown here are estimates."
      />
      <div className={`notice ${soil.source === 'fallback' ? 'warning' : ''}`}>
        <Info size={19} />
        <div>
          <strong>{soil.confidence.label}</strong>
          <p>{soil.confidence.description}</p>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric label="Soil pH" value={soil.ph.toFixed(1)} detail="Estimated · 0–30 cm profile" />
        <Metric
          label="Organic carbon"
          value={`${soil.organicCarbon.toFixed(1)} g/kg`}
          detail="Estimated · concentration, not carbon stock"
        />
        <Metric
          label="Total nitrogen"
          value={`${soil.nitrogen.toFixed(2)} g/kg`}
          detail="Estimated · not plant-available nitrogen"
        />
        <Metric
          label="Cation exchange capacity"
          value={`${soil.cec.toFixed(1)}`}
          detail="Estimated · cmol(c)/kg"
        />
      </div>
      <div className="two-columns">
        <section className="panel padded">
          <h3>Texture composition</h3>
          <p className="muted">{soil.textureClass}</p>
          <div className="texture-bar">
            {[
              { name: 'Sand', v: soil.sand },
              { name: 'Silt', v: soil.silt },
              { name: 'Clay', v: soil.clay },
            ].map((s, i) => (
              <span
                key={s.name}
                style={{ width: `${s.v}%` }}
                className={`crop-color-${i}`}
                title={`${s.name}: ${s.v.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="texture-labels">
            <span>
              Sand <b>{soil.sand.toFixed(1)}%</b>
            </span>
            <span>
              Silt <b>{soil.silt.toFixed(1)}%</b>
            </span>
            <span>
              Clay <b>{soil.clay.toFixed(1)}%</b>
            </span>
          </div>
          <p className="caption">
            Three standard depths (0–5, 5–15, 15–30 cm) averaged by thickness. The pH average is a
            descriptive model summary, not a lab result.
          </p>
          {soil.sourceUrl && (
            <a className="text-link" target="_blank" rel="noreferrer" href={soil.sourceUrl}>
              Inspect SoilGrids response <ExternalLink size={14} />
            </a>
          )}
        </section>
        <section className="panel padded">
          <h3>Start with a soil test</h3>
          <ul className="checklist">
            <li>Sample representative areas before choosing amendments or fertiliser rates.</li>
            <li>Discuss residue retention and suitable cover crops with a local advisor.</li>
            <li>Check drainage and salinity where irrigation is used.</li>
            <li>Track repeated lab results; a global soil map cannot prove improvement.</li>
          </ul>
          <p className="caption">
            No lime, gypsum or fertiliser dose is prescribed from these estimates.
          </p>
        </section>
      </div>
      <ExpertBanner />
    </div>
  )
}
export function HistoricalTrends() {
  const field = useAppStore((s) => s.field)
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeSeries> | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [run, setRun] = useState(0)
  useEffect(() => {
    setAnalysis(null)
    setError('')
    setLoading(false)
    if (!field || !run) return
    const controller = new AbortController()
    setLoading(true)
    fetchHistoricalTrends(field.center.lat, field.center.lng, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted)
          setAnalysis({
            data: res.series,
            rainfallTrendSlope: res.rainfallSlope,
            tempTrendSlope: res.tempSlope,
            anomalyYears: res.rainfallAnomalies,
            mean: res.meanRainfall,
          })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            'Historical NASA data is unavailable or incomplete. No synthetic trend has been substituted. Try again when the service is available.',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [field, run])
  if (!field) return <EmptyState />
  return (
    <div className="view-stack">
      <PanelTitle
        number="LOOK BACK / MULTI-YEAR CONTEXT"
        title="Patterns emerge over time"
        description="15 complete years from NASA POWER monthly records, ending two calendar years ago to allow publication lag."
        action={
          <button className="btn primary" disabled={loading} onClick={() => setRun((n) => n + 1)}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {loading ? 'Loading history…' : 'Load NASA history'}
          </button>
        }
      />
      {error && (
        <div className="notice warning" role="alert">
          {error}
        </div>
      )}
      {analysis ? (
        <>
          <div className="metrics-grid">
            <Metric
              label="Rainfall trend"
              value={`${number(analysis.rainfallTrendSlope, 1)} mm/year`}
              detail="Estimated linear regression on modelled data"
            />
            <Metric
              label="Temperature trend"
              value={`${number(analysis.tempTrendSlope, 3)}°C/year`}
              detail="Estimated linear regression on modelled data"
            />
            <Metric
              label="Years in analysis"
              value={analysis.data.length}
              detail={`${analysis.data[0].year}–${analysis.data[analysis.data.length - 1]?.year}`}
            />
            <Metric
              label="Rainfall anomaly years"
              value={analysis.anomalyYears.length}
              detail="More than 1.5 standard deviations from mean"
            />
          </div>
          <section className="panel padded">
            <h3>Annual precipitation</h3>
            <div className="chart large" role="img" aria-label="Annual rainfall chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analysis.data}>
                  <CartesianGrid stroke="#e4e9df" vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis unit=" mm" width={75} />
                  <Tooltip />
                  <Line dataKey="rainfall" stroke="#4e785e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Rainfall (mm)</th>
                    <th>Mean temperature (°C)</th>
                    <th>Rainfall anomaly</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.data.map((p) => (
                    <tr key={p.year}>
                      <th>{p.year}</th>
                      <td>{number(p.rainfall)}</td>
                      <td>{p.temp.toFixed(2)}</td>
                      <td>
                        {analysis.anomalyYears.includes(p.year)
                          ? 'Outside ±1.5 SD'
                          : 'Within ±1.5 SD'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="caption">
              Anomaly baseline: this displayed period. Daily mean precipitation is converted using
              each actual calendar month's days, including leap years. Descriptive slopes do not
              establish statistical significance, causation or future trends.
            </p>
          </section>
        </>
      ) : (
        <section className="panel empty-state">
          <h3>{loading ? 'Requesting complete years…' : 'Real records, or a clear gap.'}</h3>
          <p>
            Load history to see annual rainfall and temperature. This view stays empty when NASA
            records cannot be verified.
          </p>
        </section>
      )}
    </div>
  )
}
export function Methodology() {
  return (
    <div className="view-stack">
      <PanelTitle
        number="TRANSPARENCY / EVERY ASSUMPTION ON THE TABLE"
        title="Understand the evidence behind the plan"
        description="Built for the NASA Space Apps challenge: an explainable prototype that connects Earth data to crop-planning trade-offs."
      />
      <div className="two-columns">
        <section className="panel padded">
          <h3>Three kinds of evidence</h3>
          <dl className="definitions">
            <dt>
              <span className="tag green">Observed</span>
            </dt>
            <dd>
              Direct measurements with documented provenance. The app currently makes no claim of
              field observations.
            </dd>
            <dt>
              <span className="tag blue">Modelled</span>
            </dt>
            <dd>
              NASA POWER gridded reanalysis combines observations and atmospheric modelling. This is
              the live climate baseline.
            </dd>
            <dt>
              <span className="tag amber">Estimated</span>
            </dt>
            <dd>
              SoilGrids predictions, synthetic examples, unverified imports, crop traits, scores,
              water gaps and simulated scenarios.
            </dd>
          </dl>
        </section>
        <section className="panel padded">
          <h3>A transparent chain of calculations</h3>
          <ol className="checklist">
            <li>Draw a field. Calculate spherical area and a local polygon centroid.</li>
            <li>
              Request NASA climate at that centroid; preserve source, retrieval time and period.
            </li>
            <li>Evaluate every month as a possible sowing window for annual crops.</li>
            <li>
              Build up to three non-overlapping crops from different families for each strategy.
            </li>
            <li>
              Rank the strategies by your normalized priority weights. Export the inputs with the
              result.
            </li>
          </ol>
        </section>
      </div>
      <section className="panel padded">
        <h3>Crop selection and scoring</h3>
        <p>
          Seasonal suitability = 60% temperature fit + 25% estimated rainfall adequacy + 15% pH fit.
          Without a SoilGrids profile, soil fit is a neutral 60/100. A candidate needs at least
          55/100 temperature fit and 45/100 total suitability. The planner scans all 12 starts,
          using average growing days rounded up to whole months; it does not use Pakistan-specific
          season names. Perennials are excluded from annual rotations.
        </p>
        <p>
          The baseline favours fit and an illustrative market index. Soil-first favours legumes and
          organic matter traits. Water-saver favours low water gaps and drought tolerance. A greedy
          selection chooses up to three different crop families without overlap. This is not a
          globally optimal agronomic plan. Under constrained conditions strategies can converge or
          contain no feasible crop.
        </p>
        <p>
          Criterion scores combine seasonal suitability with crop traits, estimated water deficits
          and planned coverage. Your displayed total is the weighted sum of those six scores, with
          equal weights if all sliders are zero. No score is a yield probability, actual carbon
          gain, local market price or guaranteed water saving.
        </p>
      </section>
      <section className="panel padded">
        <h3>The crop library: a prototype, not a certified global database</h3>
        <p>
          {CROPS.length} illustrative crop profiles provide temperature ranges, growth duration, pH
          ranges and qualitative traits. They follow the structure of agro-ecological crop
          screening, but are not a verified import of FAO EcoCrop. Cultivar-specific and regional
          validation remain essential. Numeric nitrogen and market assumptions are not used to
          prescribe fertiliser or estimate income.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Crop</th>
                <th>Family</th>
                <th>Growing days</th>
                <th>Optimal °C</th>
                <th>pH range</th>
                <th>Annual planner</th>
              </tr>
            </thead>
            <tbody>
              {CROPS.filter((c) => c.id !== 'fallow').map((c) => (
                <tr key={c.id}>
                  <th>{c.name}</th>
                  <td>{c.family}</td>
                  <td>{c.growingDays.join('–')}</td>
                  <td>{c.tempOptimal.join('–')}</td>
                  <td>{c.soilPh.join('–')}</td>
                  <td>{c.season === 'perennial' ? 'Excluded: perennial' : 'Candidate'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel padded">
        <h3>Sources and further reading</h3>
        <div className="source-links">
          {[
            ['NASA POWER API & methodology', 'https://power.larc.nasa.gov/docs/services/api/'],
            ['NASA GIBS imagery documentation', 'https://nasa-gibs.github.io/gibs-api-docs/'],
            ['ISRIC SoilGrids documentation', 'https://docs.isric.org/globaldata/soilgrids/'],
            ['FAO-56 crop evapotranspiration', 'https://www.fao.org/4/x0490e/x0490e00.htm'],
            ['FAO EcoCrop data context', 'https://gaez.fao.org/pages/ecocrop'],
            ['NASA Space Apps', 'https://www.spaceappschallenge.org/'],
          ].map(([name, href]) => (
            <a key={href} href={href} target="_blank" rel="noreferrer">
              {name}
              <ExternalLink size={15} />
            </a>
          ))}
        </div>
        <p className="caption">
          Independent challenge prototype. NASA supplies data; it has not validated or endorsed
          these recommendations. Consult the official challenge brief for final submission rules.
        </p>
      </section>
    </div>
  )
}
