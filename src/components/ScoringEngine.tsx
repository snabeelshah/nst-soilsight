import React from 'react'
import { useAppStore, DEFAULT_PRIORITIES } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import type { FarmerPriorities } from '../types'
import { Sliders, RotateCcw, Award, ArrowRight } from 'lucide-react'

export const ScoringEngine: React.FC = () => {
  const { priorities, updatePriorities, rankedStrategies, language, setActiveTab } = useAppStore()
  const t = translations[language]

  const totalWeight = Object.values(priorities).reduce((a, b) => a + b, 0)

  const handleSliderChange = (key: keyof FarmerPriorities, value: number) => {
    updatePriorities({
      ...priorities,
      [key]: value,
    })
  }

  const handleReset = () => {
    updatePriorities(DEFAULT_PRIORITIES)
  }

  const sliderConfig: Array<{ key: keyof FarmerPriorities; label: string; desc: string; accent: string; barColor: string }> = [
    {
      key: 'soilHealth',
      label: t.strategies.soilHealth,
      desc: 'Build organic carbon, mycorrhizal fungi & soil structure',
      accent: 'accent-emerald-400',
      barColor: 'from-emerald-600 to-teal-500',
    },
    {
      key: 'waterConservation',
      label: t.strategies.waterConservation,
      desc: 'Cut groundwater pumping and buffer moisture deficits',
      accent: 'accent-cyan-400',
      barColor: 'from-cyan-600 to-blue-500',
    },
    {
      key: 'marketValue',
      label: t.strategies.marketValue,
      desc: 'Prioritize commercial yield revenue & cash flow',
      accent: 'accent-amber-400',
      barColor: 'from-amber-600 to-yellow-500',
    },
    {
      key: 'nitrogenFixing',
      label: t.strategies.nitrogenFixing,
      desc: 'Maximize biological nodule fixation to cut synthetic urea',
      accent: 'accent-teal-400',
      barColor: 'from-teal-600 to-emerald-500',
    },
    {
      key: 'erosionControl',
      label: t.strategies.erosionControl,
      desc: 'Sustain canopy & root networks against wind/water loss',
      accent: 'accent-indigo-400',
      barColor: 'from-indigo-600 to-purple-500',
    },
    {
      key: 'riskReduction',
      label: t.strategies.riskReduction,
      desc: 'Interrupt pest cycles and diversify agro-climatic exposures',
      accent: 'accent-rose-400',
      barColor: 'from-rose-600 to-pink-500',
    },
  ]

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Farmer Priority Weighting & Scoring Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Tune the multi-criteria sliders to model your farm goals. The scoring engine recalculates all rotation rankings in real time.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-cyan-500/40 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all font-mono"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Reset Weights</span>
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sliderConfig.map((item) => {
          const val = priorities[item.key]
          const pct = Math.round((val / (totalWeight || 1)) * 100)

          return (
            <div key={item.key} className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5 space-y-2.5">
              <div className="flex justify-between items-start">
                <div>
                  <label className="text-xs font-bold text-white block">
                    {item.label}
                  </label>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-sm font-bold text-cyan-400">{val}%</span>
                  <span className="text-[10px] text-slate-500 block">({pct}% wt)</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={val}
                onChange={(e) => handleSliderChange(item.key, parseInt(e.target.value, 10))}
                className={`w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer ${item.accent}`}
              />
            </div>
          )
        })}
      </div>

      {/* Live Ranked Outcome */}
      <div className="border-t border-white/10 pt-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 font-mono">
          <Award className="w-4 h-4 text-amber-400" />
          Real-Time Recalculated Strategy Rankings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rankedStrategies.map((strat, idx) => (
            <div
              key={strat.type}
              className={`p-5 rounded-2xl border relative transition-all ${
                idx === 0
                  ? 'bg-gradient-to-b from-cyan-500/10 to-blue-600/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  : 'bg-white/5 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  idx === 0 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  Rank #{idx + 1}
                </span>
                <span className="text-base font-black font-mono text-cyan-400">
                  {strat.scores.overall}/100
                </span>
              </div>

              <h4 className="text-sm font-bold text-white">
                {language === 'ur' ? strat.nameUrdu : strat.name}
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                {strat.explanation}
              </p>

              <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 truncate max-w-[150px]">
                  {strat.crops.map((c) => c.crop.name.split(' ')[0]).join(' → ')}
                </span>
                <button
                  onClick={() => setActiveTab('crops')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 text-[11px]"
                >
                  View <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
