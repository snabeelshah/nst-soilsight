import type { NASAClimateData, SoilData, RotationStrategy } from '../types'
export function answerQuestion(
  question: string,
  nasa: NASAClimateData,
  soil: SoilData | null,
  strategies: RotationStrategy[],
) {
  const q = question.toLowerCase(),
    best = strategies[0]
  const source = `Inputs: ${nasa.confidence.label}; ${soil?.confidence.label ?? 'no soil profile'}.`
  if (/(water|irrigat|rain|پانی|بارش)/.test(q))
    return `${source} Annual rainfall totals ${Math.round(nasa.annualRainfall)} mm. The highest-ranked plan (${best?.name ?? 'none'}) has an estimated ${Math.round(best?.irrigationTotal ?? 0)} mm supplemental water gap. It is calculated month by month using crop coefficients × estimated ET₀ minus 80% of rainfall. Check the monthly table and field moisture before scheduling irrigation.`
  if (/(soil|carbon|ph|مٹی)/.test(q))
    return `${source} ${soil ? `The displayed soil profile has pH ${soil.ph.toFixed(1)} and organic carbon ${soil.organicCarbon.toFixed(1)} g/kg. ${soil.source === 'fallback' ? 'This is example soil, not a measurement or a prediction for your field.' : 'These are SoilGrids estimates for 0–30 cm.'}` : 'No soil profile is available.'} A local soil test is needed to choose amendments; this advisor cannot prescribe fertiliser rates.`
  if (/(why|crop|rotat|plan|فصل|کیوں)/.test(q))
    return best?.crops.length
      ? `${source} ${best.name} ranks first at ${best.scores.overall.toFixed(1)}/100 under your current weights. ${best.explanation} The score breakdown shows every criterion and weight. Local prices, pests and cultivar performance are unknown.`
      : 'No feasible crop window was found. A local agronomist should assess the site before making a planting plan.'
  if (/(nasa|source|data|forecast|ناسا)/.test(q))
    return `${source} ${nasa.source}. Period: ${nasa.period}. NASA POWER is a regional climate model, not field-level sensing or a weather forecast. ${nasa.kind !== 'live' ? 'The current climate inputs were not retrieved live from NASA.' : 'The source response is linked on the NASA Climate page.'}`
  return 'I can explain this field’s crop ranking, water gap, soil profile and data sources. I use fixed templates and the numbers in this dashboard, not Gemini or web search. I cannot answer questions about yields, prices, pesticide doses or forecasts that are not in these data. Try “Why this crop plan?” or “How is the water gap calculated?”'
}
