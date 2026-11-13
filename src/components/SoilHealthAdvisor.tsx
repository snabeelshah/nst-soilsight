import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import { DataConfidenceBadge } from './DataConfidenceBadge'
import { TestTube2, Sparkles, CheckCircle2 } from 'lucide-react'

export const SoilHealthAdvisor: React.FC = () => {
  const { soilData, language } = useAppStore()
  const t = translations[language]

  if (!soilData) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
        <TestTube2 className="w-12 h-12 text-purple-400/40 mx-auto mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-white">No Soil Data Profile Available</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Delineate a field boundary or select a demo location to fetch ISRIC SoilGrids 250m machine-learning pedological parameters.
        </p>
      </div>
    )
  }

  const { ph, organicCarbon, clay, sand, silt, cec, nitrogen, textureClass, confidence } = soilData

  const getPhAssessment = (val: number) => {
    if (val < 5.5) return { status: 'Strongly Acidic', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', advice: 'Apply agricultural lime (calcium carbonate) at 2–3 t/ha to neutralize acidity and unlock phosphorus.' }
    if (val <= 7.2) return { status: 'Optimal Neutral', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', advice: 'Ideal nutrient bioavailability range for most global agronomic crops.' }
    if (val <= 8.2) return { status: 'Moderately Alkaline', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', advice: 'Slightly alkaline. Monitor zinc and iron micronutrient availability; incorporate sulfur/organic compost.' }
    return { status: 'Strongly Alkaline / Calcareous', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', advice: 'High pH hazards. Apply agricultural gypsum (calcium sulfate) to counter sodium and improve water infiltration.' }
  }

  const getSocAssessment = (val: number) => {
    if (val < 10) return { status: 'Depleted (<10 g/kg)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', advice: 'Critically low organic matter. Prioritize cover crops, legume rotations, and residue retention to rebuild carbon.' }
    if (val < 20) return { status: 'Moderate (10–20 g/kg)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', advice: 'Sub-optimal carbon levels. Incorporate farmyard manure or green manure (sunn hemp/berseem).' }
    return { status: 'Healthy (>20 g/kg)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', advice: 'Robust soil organic carbon reserves supporting biological activity and moisture retention.' }
  }

  const phAssessment = getPhAssessment(ph)
  const socAssessment = getSocAssessment(organicCarbon)

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <TestTube2 className="w-5 h-5 text-purple-400" />
              {t.soilAdvisor.title}
            </h2>
            <DataConfidenceBadge confidence={confidence} inline />
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t.soilAdvisor.subtitle} (Depth: 0–30 cm Topsoil Profile)
          </p>
        </div>

        <div className="text-xs text-slate-400 px-3.5 py-1.5 bg-[#0a0f24] rounded-xl border border-white/5 font-mono">
          Model: <span className="font-semibold text-purple-300">{soilData.source.toUpperCase()}</span>
        </div>
      </div>

      {/* Primary Soil Parameter Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-slate-400 block font-sans">{t.soilAdvisor.ph}</span>
          <div className="text-2xl font-black text-white mt-0.5">{ph.toFixed(1)}</div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-2 font-semibold border ${phAssessment.color}`}>
            {phAssessment.status}
          </span>
        </div>

        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-slate-400 block font-sans">{t.soilAdvisor.soc}</span>
          <div className="text-2xl font-black text-cyan-300 mt-0.5">{organicCarbon.toFixed(1)} <span className="text-xs font-normal text-slate-500">g/kg</span></div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-2 font-semibold border ${socAssessment.color}`}>
            {socAssessment.status}
          </span>
        </div>

        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-slate-400 block font-sans">{t.soilAdvisor.texture}</span>
          <div className="text-lg font-black text-white mt-1">{textureClass}</div>
          <span className="text-[10px] text-slate-500 block mt-1">
            S {sand}% | Si {silt}% | C {clay}%
          </span>
        </div>

        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-slate-400 block font-sans">Total Nitrogen Stock</span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">{nitrogen.toFixed(1)} <span className="text-xs font-normal text-slate-500">g/kg</span></div>
          <span className="text-[10px] text-slate-500 block mt-1">
            CEC: {cec.toFixed(1)} cmol/kg
          </span>
        </div>
      </div>

      {/* Texture Breakdown Progress */}
      <div className="p-5 bg-[#0a0f24] rounded-2xl border border-white/5 space-y-2.5">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="font-bold text-slate-200">Particle Size Fraction Profile (0–30 cm)</span>
          <span className="text-slate-400">USDA Classification</span>
        </div>
        <div className="h-4 w-full rounded-full flex overflow-hidden border border-white/10">
          <div style={{ width: `${sand}%` }} className="bg-amber-400" title={`Sand: ${sand}%`} />
          <div style={{ width: `${silt}%` }} className="bg-slate-500" title={`Silt: ${silt}%`} />
          <div style={{ width: `${clay}%` }} className="bg-orange-600" title={`Clay: ${clay}%`} />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 font-mono px-1">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Sand ({sand}%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Silt ({silt}%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-600" /> Clay ({clay}%)</span>
        </div>
      </div>

      {/* Agronomic Soil Interventions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2 font-mono">
            <Sparkles className="w-4 h-4 text-purple-400" />
            pH & Mineral Bioavailability Intervention
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {phAssessment.advice}
          </p>
        </div>

        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Soil Organic Carbon Building Protocol
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {socAssessment.advice}
          </p>
        </div>
      </div>

      {/* Data Confidence Notice */}
      <DataConfidenceBadge confidence={confidence} showDetails />
    </div>
  )
}
