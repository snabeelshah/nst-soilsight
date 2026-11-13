import { useState } from 'react'
import { ArrowRight, Download, RotateCcw, Check, Droplets } from 'lucide-react'
import { useAppStore, DEFAULT_PRIORITIES, DEFAULT_SCENARIO } from '../store/useAppStore'
import { normalizedWeights, PRIORITY_KEYS } from '../lib/cropScoring'
import { MONTHS, monthRange } from '../lib/climate'
import { buildIrrigationPlan } from '../lib/irrigationPlanner'
import { generateActionPlan } from '../lib/actionPlan'
import type { FarmerPriorities, RotationStrategy } from '../types'
import { CROPS } from '../lib/cropDatabase'
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
  const { priorities, updatePriorities, language } = useAppStore()
  const weights = normalizedWeights(priorities)
  return (
    <section className="panel priorities">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">YOU SET THE BALANCE</span>
          <h3>What matters most?</h3>
        </div>
        <button
          className="icon-btn"
          aria-label="Reset priorities"
          onClick={() => updatePriorities(DEFAULT_PRIORITIES)}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <p className="caption">
        Adjust relative importance. Weights automatically add up to 100%; all zero uses equal
        weights.
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
            onChange={(e) => updatePriorities({ ...priorities, [key]: Number(e.target.value) })}
          />
          <p>{CRITERIA[key].help}</p>
        </div>
      ))}
    </section>
  )
}
function StrategyCard({ strategy, rank }: { strategy: RotationStrategy; rank: number }) {
  const { priorities, language } = useAppStore()
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
      <p className="strategy-sequence">
        {strategy.crops.length
          ? strategy.crops
              .map((c) => (language === 'ur' ? c.crop.nameUrdu : c.crop.name))
              .join(' → ')
          : 'No feasible crops found'}
      </p>
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
      <p className="body-copy">
        {language === 'ur'
          ? `یہ ابتدائی منصوبہ ${strategy.crops.length} فصلوں پر مشتمل ہے۔ پانی کی اندازاً کمی ${Math.round(strategy.irrigationTotal)} ملی میٹر ہے۔ مقامی ماہر سے تصدیق کریں۔`
          : strategy.explanation}
      </p>
      <div className="strategy-water">
        <Droplets size={16} />
        <strong>{number(strategy.irrigationTotal)} mm</strong>
        <span>estimated water gap / year</span>
      </div>
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
      <details>
        <summary>Assumptions & gaps</summary>
        <ul>
          {strategy.gaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </details>
    </article>
  )
}
export function CropPlanner() {
  const { nasaData, rankedStrategies, existingRotation, updateExistingRotation } = useAppStore()
  if (!nasaData) return <EmptyState />
  const annualCrops = CROPS.filter((crop) => crop.id !== 'fallow' && crop.season !== 'perennial')
  return (
    <div className="view-stack">
      <PanelTitle
        number="PLAN / COMPARE THE TRADE-OFFS"
        title="Current practice versus two alternatives"
        description="Compare the farmer's existing rotation with Soil-first and Water-saver plans. Your priorities decide the ranking."
      />
      <SourceNote />
      <section className="panel current-rotation-editor">
        <div>
          <span className="eyebrow">CHALLENGE BASELINE / FARMER INPUT</span>
          <h3>Describe the current rotation</h3>
          <p className="caption">
            The opening values are a clearly labelled Punjab demo. Replace them with the farmer's
            real crops and approximate sowing months before presenting a recommendation.
          </p>
        </div>
        <div className="rotation-input-grid">
          {existingRotation.map((entry, index) => (
            <div className="rotation-input" key={index}>
              <label htmlFor={`existing-crop-${index}`}>Crop {index + 1}</label>
              <select
                id={`existing-crop-${index}`}
                value={entry.cropId}
                onChange={(event) =>
                  updateExistingRotation(
                    existingRotation.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, cropId: event.target.value } : item,
                    ),
                  )
                }
              >
                {annualCrops.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name}
                  </option>
                ))}
              </select>
              <label htmlFor={`existing-month-${index}`}>Sowing month</label>
              <select
                id={`existing-month-${index}`}
                value={entry.monthStart}
                onChange={(event) =>
                  updateExistingRotation(
                    existingRotation.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, monthStart: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
              >
                {MONTHS.map((month, monthIndex) => (
                  <option key={month} value={monthIndex + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
      <div className="planner-layout">
        <Priorities />
        <div className="strategy-grid" aria-live="polite">
          {rankedStrategies.map((s, i) => (
            <StrategyCard key={s.type} strategy={s} rank={i} />
          ))}
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
  } = useAppStore()
  if (!nasa) return <EmptyState />
  return (
    <div className="view-stack">
      <PanelTitle
        number="EXPLORE / CLIMATE SENSITIVITY"
        title="What if the next season feels different?"
        description="Apply a hypothetical change to the same crops and planting windows. This is a sensitivity test, not a climate projection."
      />
      <section className="panel simulator-controls">
        <div className="control-heading">
          <span className="tag amber">Estimated scenario</span>
          <button className="btn small" onClick={() => updateClimateScenario(DEFAULT_SCENARIO)}>
            <RotateCcw size={14} /> Reset scenario
          </button>
        </div>
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
              onChange={(e) =>
                updateClimateScenario({ ...climateScenario, tempDelta: Number(e.target.value) })
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
              onChange={(e) =>
                updateClimateScenario({ ...climateScenario, rainfallDelta: Number(e.target.value) })
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
          <span className="eyebrow">YOUR SCENARIO</span>
          <h3>
            {number(nasa.avgTemp + climateScenario.tempDelta, 1)}°C ·{' '}
            {number(nasa.annualRainfall * (1 + climateScenario.rainfallDelta / 100))} mm/year
          </h3>
          {stressedStrategies.map((s, i) => (
            <Comparison
              key={s.type}
              strategy={s}
              rank={i}
              before={rankedStrategies.find((b) => b.type === s.type)}
            />
          ))}
        </section>
      </div>
      <p className="caption">
        Temperature shifts change seasonal fit and estimated ET₀. Rainfall scales each month. Soil
        and farmer priorities stay fixed. No CO₂, extreme events or future climate-model scenarios
        are included.
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
