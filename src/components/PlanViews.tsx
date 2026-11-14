import { useState } from 'react'
import {
  ArrowRight,
  Download,
  RotateCcw,
  Check,
  Droplets,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Info,
  TrendingUp,
  Shield,
  Leaf,
  Coins,
  ShieldAlert,
  FileWarning,
} from 'lucide-react'
import { useAppStore, DEFAULT_PRIORITIES, DEFAULT_SCENARIO } from '../store/useAppStore'
import { normalizedWeights, PRIORITY_KEYS } from '../lib/cropScoring'
import { MONTHS, monthRange } from '../lib/climate'
import { buildIrrigationPlan } from '../lib/irrigationPlanner'
import { generateActionPlan } from '../lib/actionPlan'
import type { FarmerPriorities, RotationStrategy } from '../types'
import { EmptyState, ExpertBanner, PanelTitle, Metric, SourceNote, number } from './ui'
export const CRITERIA: Record<keyof FarmerPriorities, { label: string; ur: string; help: string }> =
  {
    waterConservation: {
      label: 'Save water',
      ur: 'پانی کی بچت',
      help: 'Lower estimated monthly irrigation gaps',
    },
    soilHealth: {
      label: 'Build soil health',
      ur: 'مٹی کی صحت',
      help: 'Organic matter traits and legumes',
    },
    marketValue: {
      label: 'Market potential',
      ur: 'منڈی کی اہمیت',
      help: 'Illustrative index; local prices are unknown',
    },
    nitrogenFixing: {
      label: 'Include legumes',
      ur: 'دالوں کی فصلیں',
      help: 'Potential for biological nitrogen fixation',
    },
    erosionControl: {
      label: 'Protect soil cover',
      ur: 'مٹی کا تحفظ',
      help: 'Crop cover traits and covered months',
    },
    riskReduction: {
      label: 'Diversify risk',
      ur: 'خطرے میں کمی',
      help: 'Seasonal fit and different crop families',
    },
  }
export function Priorities() {
  const { priorities, updatePriorities, language, loading: storeLoading } = useAppStore()
  const weights = normalizedWeights(priorities)
  const [recalculating, setRecalculating] = useState(false)
  const total = PRIORITY_KEYS.reduce((sum, k) => sum + priorities[k], 0)
  const handlePriorityChange = async (key: keyof FarmerPriorities, value: number) => {
    const newPriorities = { ...priorities, [key]: value }
    setRecalculating(true)
    try {
      await updatePriorities(newPriorities)
    } finally {
      setRecalculating(false)
    }
  }
  return (
    <section className="panel priorities">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">YOU SET THE BALANCE</span>
          <h3>What matters most?</h3>
        </div>
        <div className="button-row">
          {recalculating && (
            <span className="caption" role="status" aria-live="polite">
              <Loader2 size={14} className="spin" /> Recalculating…
            </span>
          )}
          <button
            className="icon-btn"
            aria-label="Reset priorities"
            onClick={() => {
              setRecalculating(true)
              updatePriorities(DEFAULT_PRIORITIES).finally(() => setRecalculating(false))
            }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      <p className="caption">
        Adjust relative importance. Weights automatically normalize to 100%; all zero uses equal
        weights. Total raw weight: {total} points.
      </p>
      {PRIORITY_KEYS.map((key) => (
        <div className="priority" key={key}>
          <div>
            <label htmlFor={`priority-${key}`}>
              {language === 'ur' ? CRITERIA[key].ur : CRITERIA[key].label}
            </label>
            <output htmlFor={`priority-${key}`}>{Math.round(weights[key] * 100)}%</output>
          </div>
          <input
            id={`priority-${key}`}
            type="range"
            min="0"
            max="100"
            step="5"
            value={priorities[key]}
            disabled={storeLoading}
            onChange={(e) => void handlePriorityChange(key, Number(e.target.value))}
          />
          <p>{CRITERIA[key].help}</p>
        </div>
      ))}
    </section>
  )
}
function StrategyCard({ strategy, rank }: { strategy: RotationStrategy; rank: number }) {
  const { priorities, language, nasaData } = useAppStore()
  const weights = normalizedWeights(priorities)
  return (
    <article className={`panel strategy-card ${rank === 0 ? 'winner' : ''}`}>
      <div className="strategy-head">
        <span className={`tag ${rank === 0 ? 'green' : ''}`}>
          {rank === 0 ? (
            <>
              <Check size={12} /> Highest score
            </>
          ) : (
            `Rank ${rank + 1}`
          )}
        </span>
        <span className="score">
          {strategy.scores.overall.toFixed(1)}
          <small>/100</small>
        </span>
      </div>
      <h3>{language === 'ur' ? strategy.nameUrdu : strategy.name}</h3>

      {/* Crop sequence */}
      <p className="strategy-sequence">
        {strategy.crops.length
          ? strategy.crops
              .map((c) => (language === 'ur' ? c.crop.nameUrdu : c.crop.name))
              .join(' → ')
          : 'No feasible crops found'}
      </p>

      {/* Visual timeline */}
      <div className="rotation-timeline" aria-label={`${strategy.name} crop calendar`}>
        <div className="timeline-months">
          {MONTHS.map((m) => (
            <span key={m}>{m[0]}</span>
          ))}
        </div>
        {strategy.crops.map((c, i) => (
          <div
            key={c.crop.id}
            className="timeline-row"
            title={`${c.crop.name}: ${MONTHS[c.monthStart - 1]}–${MONTHS[c.monthEnd - 1]}`}
          >
            <span>{language === 'ur' ? c.crop.nameUrdu : c.crop.name}</span>
            <div>
              {MONTHS.map((m, idx) => (
                <i
                  key={m}
                  className={
                    monthRange(c.monthStart, c.monthEnd).includes(idx + 1) ? `crop-color-${i}` : ''
                  }
                />
              ))}
            </div>
            <small>
              {MONTHS[c.monthStart - 1]}–{MONTHS[c.monthEnd - 1]}
            </small>
          </div>
        ))}
      </div>

      {/* Key score cards: Water, Soil, Income-potential */}
      <div className="score-cards">
        <div className="score-card" title="Water conservation score">
          <Droplets size={14} />
          <div>
            <span className="caption">Water score</span>
            <strong>{strategy.scores.waterConservation.toFixed(1)}</strong>
          </div>
        </div>
        <div className="score-card" title="Soil health score">
          <Leaf size={14} />
          <div>
            <span className="caption">Soil score</span>
            <strong>{strategy.scores.soilHealth.toFixed(1)}</strong>
          </div>
        </div>
        <div className="score-card" title="Income potential score">
          <Coins size={14} />
          <div>
            <span className="caption">Income potential</span>
            <strong>{strategy.scores.marketValue.toFixed(1)}</strong>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <p className="body-copy">
        {language === 'ur'
          ? `یہ ابتدائی منصوبہ ${strategy.crops.length} فصلوں پر مشتمل ہے۔ پانی کی اندازاً کمی ${Math.round(strategy.irrigationTotal)} ملی میٹر ہے۔ مقامی ماہر سے تصدیق کریں۔`
          : strategy.explanation}
      </p>

      {/* Water gap */}
      <div className="strategy-water">
        <Droplets size={16} />
        <strong>{number(strategy.irrigationTotal)} mm</strong>
        <span>estimated water gap / year</span>
      </div>

      {/* Benefits */}
      {strategy.benefits && strategy.benefits.length > 0 && (
        <details open={rank === 0}>
          <summary>
            <TrendingUp size={14} /> Benefits
          </summary>
          <ul className="benefits-list">
            {strategy.benefits.map((b) => (
              <li key={b} className="benefit-item">
                <Check size={12} /> {b}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Risks */}
      {strategy.risks && strategy.risks.length > 0 && (
        <details>
          <summary>
            <ShieldAlert size={14} /> Risks
          </summary>
          <ul className="risks-list">
            {strategy.risks.map((r) => (
              <li key={r} className="risk-item">
                <AlertTriangle size={12} /> {r}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Score breakdown */}
      <details>
        <summary>Why this score?</summary>
        <p className="caption">
          Each criterion × your normalized weight. Scores are estimates, not probabilities of
          success.
        </p>
        <div className="score-breakdown">
          {PRIORITY_KEYS.map((k) => (
            <div key={k}>
              <span>{CRITERIA[k].label}</span>
              <span>
                {strategy.scores[k].toFixed(1)} × {Math.round(weights[k] * 100)}% ={' '}
                <strong>{(strategy.scores[k] * weights[k]).toFixed(1)}</strong>
              </span>
            </div>
          ))}
        </div>
        <p className="caption">Rounded contributions may differ slightly from the total.</p>
      </details>

      {/* Confidence & data gaps */}
      <details>
        <summary>
          <FileWarning size={14} /> Confidence & data gaps
        </summary>
        {nasaData && (
          <div className={`notice ${nasaData.kind !== 'live' ? 'warning' : ''}`} role="note">
            <Info size={14} />
            <div>
              <strong>{nasaData.confidence.label}</strong>
              <p className="caption">{nasaData.confidence.description}</p>
            </div>
          </div>
        )}
        <ul>
          {strategy.gaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        {strategy.expertReviewNeeded && (
          <p className="caption notice">
            <Shield size={14} /> {strategy.expertReviewReason}
          </p>
        )}
      </details>
    </article>
  )
}
export function CropPlanner() {
  const { nasaData, rankedStrategies, loading, error } = useAppStore()
  if (!nasaData) return <EmptyState />
  return (
    <div className="view-stack">
      <PanelTitle
        number="PLAN / COMPARE THE TRADE-OFFS"
        title="Three ways to grow forward"
        description="The same field. Three approaches. Your priorities decide the ranking."
      />
      <SourceNote />
      {loading && (
        <div className="notice" role="status" aria-live="polite">
          <Loader2 size={16} className="spin" /> Recalculating strategies…
        </div>
      )}
      {error && (
        <div className="notice warning" role="alert">
          <AlertTriangle size={16} /> {error}
          <button
            className="btn small"
            onClick={() => void useAppStore.getState().fetchData()}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}
      <div className="planner-layout">
        <Priorities />
        <div className="strategy-grid" aria-live="polite">
          {rankedStrategies.length === 0 && !loading ? (
            <div className="panel empty-state" role="status">
              <Info size={24} />
              <h3>No strategies available</h3>
              <p>Load climate data for your field to generate crop rotation strategies.</p>
            </div>
          ) : (
            rankedStrategies.map((s, i) => (
              <StrategyCard key={s.type} strategy={s} rank={i} />
            ))
          )}
        </div>
      </div>
      <ExpertBanner />
      <IrrigationPlanner />
    </div>
  )
}
export function IrrigationPlanner() {
  const { nasaData, rankedStrategies, field } = useAppStore()
  const [choice, setChoice] = useState('winning')
  const strategy = rankedStrategies.find((s) => s.type === choice) ?? rankedStrategies[0]
  if (!nasaData || !strategy) return null
  const plan = buildIrrigationPlan(nasaData.monthly, strategy.crops)
  const total = plan.reduce((s, m) => s + m.waterGap, 0)
  return (
    <section className="panel irrigation">
      <PanelTitle
        title="Every drop, accounted for"
        description="Monthly water gaps for the selected rotation. Bare months have no irrigation allocation."
        action={
          <select
            aria-label="Irrigation strategy"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="winning">Highest-ranked plan</option>
            {rankedStrategies.map((s) => (
              <option key={s.type} value={s.type}>
                {s.name}
              </option>
            ))}
          </select>
        }
      />
      <div className="water-summary">
        <Metric
          label={`${strategy.name} · net water gap`}
          value={
            <>
              {number(total)} <em>mm / year</em>
            </>
          }
          detail="Estimated · sum of positive monthly deficits"
        />
        <Metric
          label="Equivalent field volume"
          value={
            field ? (
              <>
                {number(total * field.areaHectares * 10)} <em>m³</em>
              </>
            ) : (
              '—'
            )
          }
          detail="1 mm over 1 hectare = 10 m³; delivery losses excluded"
        />
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Monthly irrigation needs for {strategy.name}</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Crop</th>
              <th>Rain (mm)</th>
              <th>Effective rain (mm)</th>
              <th>Crop need (mm)</th>
              <th>Water gap (mm)</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((m) => (
              <tr key={m.month}>
                <th>{m.monthName}</th>
                <td>{m.cropName ?? 'Unplanted'}</td>
                <td>{number(m.rainfall)}</td>
                <td>{number(m.effectiveRainfall)}</td>
                <td>{number(m.cropWaterNeed)}</td>
                <td className={m.waterGap > 0 ? 'water-gap' : ''}>{number(m.waterGap)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="caption">
        Estimated crop need = Hargreaves ET₀ × approximate stage-adjusted crop coefficient (Kc).
        Water gap = max(0, crop need − 80% of rainfall), summed monthly. No rainfall is carried
        between months. Soil storage, runoff, salinity, paddy percolation and irrigation efficiency
        are not modelled; this is not a watering schedule.
      </p>
    </section>
  )
}
export function ClimateSimulator() {
  const {
    nasaData: nasa,
    rankedStrategies,
    stressedStrategies,
    climateScenario,
    updateClimateScenario,
    loading,
  } = useAppStore()
  const [simulating, setSimulating] = useState(false)
  const [simError, setSimError] = useState('')

  if (!nasa) return <EmptyState />

  const handleScenarioChange = async (newScenario: typeof climateScenario) => {
    setSimulating(true)
    setSimError('')
    try {
      await updateClimateScenario(newScenario)
    } catch {
      setSimError('Scenario simulation failed. Results shown are from local estimation.')
    } finally {
      setSimulating(false)
    }
  }

  const isModified = climateScenario.tempDelta !== 0 || climateScenario.rainfallDelta !== 0

  return (
    <div className="view-stack">
      <PanelTitle
        number="EXPLORE / CLIMATE SENSITIVITY"
        title="What if the next season feels different?"
        description="Apply a hypothetical change to the same crops and planting windows. This is a sensitivity test, not a climate projection."
      />

      {/* Hypothetical disclaimer */}
      <div className="notice" role="note">
        <AlertTriangle size={16} />
        <div>
          <strong>Hypothetical scenario — not a forecast.</strong>
          <p className="caption">
            These results show sensitivity to uniform temperature and rainfall shifts applied to
            the same crop plan. They are not climate projections, not IPCC scenarios, and should
            not be used as weather predictions.
          </p>
        </div>
      </div>

      <section className="panel simulator-controls">
        <div className="control-heading">
          <span className="tag amber">Estimated scenario</span>
          <div className="button-row">
            {simulating && (
              <span className="caption" role="status" aria-live="polite">
                <Loader2 size={14} className="spin" /> Simulating…
              </span>
            )}
            <button className="btn small" onClick={() => void handleScenarioChange(DEFAULT_SCENARIO)}>
              <RotateCcw size={14} /> Reset scenario
            </button>
          </div>
        </div>
        {simError && (
          <div className="notice warning" role="alert">
            <AlertTriangle size={14} /> {simError}
          </div>
        )}
        <div className="two-columns">
          <div>
            <label htmlFor="temp-delta">
              Temperature change <strong>+{climateScenario.tempDelta.toFixed(1)}°C</strong>
            </label>
            <input
              id="temp-delta"
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={climateScenario.tempDelta}
              disabled={loading}
              onChange={(e) =>
                void handleScenarioChange({ ...climateScenario, tempDelta: Number(e.target.value) })
              }
            />
            <div className="range-endpoints">
              <span>Current baseline</span>
              <span>+5°C</span>
            </div>
          </div>
          <div>
            <label htmlFor="rain-delta">
              Rainfall change{' '}
              <strong>
                {climateScenario.rainfallDelta > 0 ? '+' : ''}
                {climateScenario.rainfallDelta}%
              </strong>
            </label>
            <input
              id="rain-delta"
              type="range"
              min="-50"
              max="50"
              step="5"
              value={climateScenario.rainfallDelta}
              disabled={loading}
              onChange={(e) =>
                void handleScenarioChange({ ...climateScenario, rainfallDelta: Number(e.target.value) })
              }
            />
            <div className="range-endpoints">
              <span>50% less rain</span>
              <span>50% more rain</span>
            </div>
          </div>
        </div>
      </section>

      <div className="two-columns">
        <section className="panel compare-panel">
          <span className="eyebrow">BASELINE</span>
          <h3>
            {number(nasa.avgTemp, 1)}°C · {number(nasa.annualRainfall)} mm/year
          </h3>
          {rankedStrategies.map((s, i) => (
            <Comparison key={s.type} strategy={s} rank={i} />
          ))}
        </section>
        <section className="panel compare-panel scenario" aria-live="polite">
          <span className="eyebrow">YOUR SCENARIO {isModified ? '(HYPOTHETICAL)' : ''}</span>
          <h3>
            {number(nasa.avgTemp + climateScenario.tempDelta, 1)}°C ·{' '}
            {number(nasa.annualRainfall * (1 + climateScenario.rainfallDelta / 100))} mm/year
          </h3>
          {stressedStrategies.length === 0 && !simulating ? (
            <p className="muted">Adjust scenario to see results.</p>
          ) : (
            stressedStrategies.map((s, i) => (
              <Comparison
                key={s.type}
                strategy={s}
                rank={i}
                before={rankedStrategies.find((b) => b.type === s.type)}
              />
            ))
          )}
        </section>
      </div>

      <p className="caption">
        Temperature shifts change seasonal fit and estimated ET₀. Rainfall scales each month. Soil
        and farmer priorities stay fixed. No CO₂, extreme events or future climate-model scenarios
        are included. Results are clearly hypothetical and should not be treated as predictions.
      </p>
      <ExpertBanner />
    </div>
  )
}
function Comparison({
  strategy: s,
  rank,
  before,
}: {
  strategy: RotationStrategy
  rank: number
  before?: RotationStrategy
}) {
  const diff = before ? s.scores.overall - before.scores.overall : 0
  return (
    <div className="comparison-row">
      <div>
        <span className="caption">RANK {rank + 1}</span>
        <h4>{s.name}</h4>
        <p>{s.crops.map((c) => c.crop.name).join(' → ') || 'No feasible crops'}</p>
        <small>
          {number(s.irrigationTotal)} mm estimated water gap{' '}
          {before &&
            `(${s.irrigationTotal >= before.irrigationTotal ? '+' : ''}${number(s.irrigationTotal - before.irrigationTotal)} mm)`}
        </small>
      </div>
      <div className="score">
        {s.scores.overall.toFixed(1)}
        <small>/100</small>
        {before && (
          <span className={`score-change ${diff < 0 ? 'negative' : ''}`}>
            {diff > 0 ? '+' : ''}
            {diff.toFixed(1)} pts
          </span>
        )}
      </div>
    </div>
  )
}
export function ActionPlan() {
  const state = useAppStore(),
    { nasaData, soilData, rankedStrategies } = state
  if (!nasaData || !rankedStrategies[0]) return <EmptyState />
  const best = rankedStrategies[0],
    plan = generateActionPlan(best, nasaData, soilData)
  const download = () => {
    const result = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      field: state.field,
      fieldName: state.fieldName,
      climate: nasaData,
      soil: soilData,
      priorities: state.priorities,
      rotations: rankedStrategies,
      actionPlan: plan,
      methodology:
        'Prototype heuristics. See README and the in-app methodology. Not a prescription.',
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'soilsight-field-plan.json'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="view-stack">
      <PanelTitle
        number="ACT / MAKE THE NEXT SEASON COUNT"
        title="From a recommendation to a conversation"
        description={`A template-generated checklist for ${best.name}. Confirm all dates with your local growing calendar.`}
        action={
          <div className="button-row">
            <button className="btn" onClick={() => window.print()}>
              Print plan
            </button>
            <button className="btn primary" onClick={download}>
              <Download size={16} /> Export plan
            </button>
          </div>
        }
      />
      <SourceNote />
      <ExpertBanner />
      <div className="two-columns">
        <section className="panel action-list">
          <h3>Your seasonal checklist</h3>
          {plan.steps.length ? (
            plan.steps.map((s, i) => (
              <div className="action-step" key={`${s.action}-${i}`}>
                <span>{s.monthName}</span>
                <div>
                  <small className="eyebrow">{s.category}</small>
                  <h4>{s.action}</h4>
                  <p>{s.details}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No feasible rotation found. A local assessment is the next step.</p>
          )}
        </section>
        <div className="view-stack">
          <section className="panel padded">
            <h3>Before you commit</h3>
            <ul className="checklist">
              {plan.soilRecommendations.map((s) => (
                <li key={s}>{s}</li>
              ))}
              <li>Confirm irrigation availability, seed sources, labour and market access.</li>
              <li>
                Use local forecasts for day-to-day operations; this dashboard uses climate averages.
              </li>
            </ul>
            <button className="text-link" onClick={() => state.setActiveTab('advisor')}>
              Ask about this plan <ArrowRight size={15} />
            </button>
          </section>
          <section className="panel padded">
            <span className="eyebrow">TAKE THE EVIDENCE WITH YOU</span>
            <h3>An export you can inspect</h3>
            <p className="muted">
              Your JSON download includes the boundary, all monthly inputs, provenance, priorities,
              three rotations and checklist. Estimated inputs stay labelled.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
