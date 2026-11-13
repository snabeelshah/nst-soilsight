import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import type { RotationStrategy, RotationCrop } from '../types'
import {
  Sprout, AlertTriangle, CheckCircle2,
  Calendar, Layers, Sparkles, Scale, Info, ArrowRight
} from 'lucide-react'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const CropPlanner: React.FC = () => {
  const { rankedStrategies, language } = useAppStore()
  const t = translations[language]

  const [activeStrategyIndex, setActiveStrategyIndex] = useState(0)

  if (!rankedStrategies || rankedStrategies.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
        <Sprout className="w-12 h-12 text-emerald-400/40 mx-auto mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-white">No Crop Rotations Generated</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Delineate your field boundary or pick a quick demo location above to compute climate-suited rotations.
        </p>
      </div>
    )
  }

  const currentStrategy: RotationStrategy = rankedStrategies[activeStrategyIndex] || rankedStrategies[0]

  return (
    <div className="space-y-6">
      {/* Strategy Selector Tabs */}
      <div className="glass-panel p-2 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {rankedStrategies.map((strat, idx) => {
            const isSelected = activeStrategyIndex === idx
            const isRank1 = idx === 0
            return (
              <button
                key={strat.type}
                onClick={() => setActiveStrategyIndex(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                    : 'bg-white/5 text-slate-300 hover:text-white border-white/5 hover:border-white/10'
                }`}
              >
                <span>{language === 'ur' ? strat.nameUrdu : strat.name}</span>
                {isRank1 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    ★ Top Match
                  </span>
                )}
                <span className="font-mono text-[11px] opacity-80">({strat.scores.overall}/100)</span>
              </button>
            )
          })}
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5 px-3 font-mono">
          <Scale className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ranked by Custom Priority Weights</span>
        </div>
      </div>

      {/* Expert Review Notice Banner */}
      {currentStrategy.expertReviewNeeded && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-300 uppercase tracking-wide">
              Expert Agronomic Review Recommended
            </h4>
            <p className="leading-relaxed opacity-90">
              {currentStrategy.expertReviewReason || t.strategies.expertBanner}
            </p>
          </div>
        </div>
      )}

      {/* Main Strategy Overview Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
        {/* Header & Explainable Why */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                {currentStrategy.type}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {language === 'ur' ? currentStrategy.nameUrdu : currentStrategy.name}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
              {currentStrategy.explanation}
            </p>
          </div>

          {/* Overall Resilience Score Halo */}
          <div className="glass-panel p-4 rounded-2xl text-center min-w-[130px] border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
              Resilience Score
            </div>
            <div className="text-3xl font-black text-white font-mono mt-0.5">
              {currentStrategy.scores.overall}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">out of 100</div>
          </div>
        </div>

        {/* 6-Axis Agronomic Scorecard */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-cyan-400" />
            Ecological & Economic Scorecard
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: t.strategies.soilHealth, score: currentStrategy.scores.soilHealth, color: '#10b981' },
              { label: t.strategies.waterConservation, score: currentStrategy.scores.waterConservation, color: '#38bdf8' },
              { label: t.strategies.nitrogenFixing, score: currentStrategy.scores.nitrogenFixing, color: '#06b6d4' },
              { label: t.strategies.marketValue, score: currentStrategy.scores.marketValue, color: '#f59e0b' },
              { label: t.strategies.erosionControl, score: currentStrategy.scores.erosionControl, color: '#6366f1' },
              { label: t.strategies.riskReduction, score: currentStrategy.scores.riskReduction, color: '#ec4899' },
            ].map((metric, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 block leading-tight truncate" title={metric.label}>
                  {metric.label}
                </span>
                <div className="flex items-baseline gap-1 mt-1 font-mono">
                  <span className="text-lg font-black text-white">{metric.score}</span>
                  <span className="text-[10px] text-slate-500">/100</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${metric.score}%`, backgroundColor: metric.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 12-Month Rotation Timeline Pipeline */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2 font-mono">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Seasonal 12-Month Crop Pipeline
          </h3>
          <div className="grid grid-cols-12 gap-1.5 bg-[#0a0f24] p-2.5 rounded-2xl border border-white/5 text-center text-xs font-mono">
            {MONTH_NAMES.map((m, idx) => {
              const activeCrop = currentStrategy.crops.find((rc) => {
                if (rc.monthStart <= rc.monthEnd) {
                  return idx + 1 >= rc.monthStart && idx + 1 <= rc.monthEnd
                } else {
                  return idx + 1 >= rc.monthStart || idx + 1 <= rc.monthEnd
                }
              })

              return (
                <div
                  key={idx}
                  className={`p-2 rounded-xl flex flex-col justify-between transition-all ${
                    activeCrop
                      ? 'bg-gradient-to-b from-cyan-500/20 to-blue-600/30 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : 'bg-white/5 text-slate-500 border border-dashed border-white/5'
                  }`}
                >
                  <span className="text-[10px] opacity-75">{m}</span>
                  <span className="text-[11px] truncate mt-1">
                    {activeCrop ? (language === 'ur' ? activeCrop.crop.nameUrdu : activeCrop.crop.name.split(' ')[0]) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Crop Cards */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-mono">
            Crops in Rotation & Agronomic Profiles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentStrategy.crops.map((rc: RotationCrop, idx: number) => (
              <div
                key={rc.crop.id}
                className="glass-panel p-4 rounded-xl border border-white/10 space-y-3 relative hover:border-cyan-500/40 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                    Phase {idx + 1}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    {rc.suitability}% Suitability
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white flex items-baseline gap-2">
                    <span>{language === 'ur' ? rc.crop.nameUrdu : rc.crop.name}</span>
                    <span className="text-xs font-normal text-slate-400 font-mono">({rc.crop.family})</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Window: {MONTH_NAMES[rc.monthStart - 1]} – {MONTH_NAMES[rc.monthEnd - 1]} ({rc.crop.growingDays[0]}–{rc.crop.growingDays[1]}d)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-2.5 rounded-lg border border-white/5 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Water Deficit Gap</span>
                    <span className="font-bold text-cyan-300">{rc.waterGapMm} mm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">N-Balance</span>
                    <span className={`font-bold ${rc.crop.nitrogenContribution >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {rc.crop.nitrogenContribution > 0 ? `+${rc.crop.nitrogenContribution}` : rc.crop.nitrogenContribution} kg/ha
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {rc.crop.nitrogenFixing && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
                      ✓ N-Fixer
                    </span>
                  )}
                  {rc.crop.coverCrop && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-medium">
                      ✓ Cover Crop
                    </span>
                  )}
                  {rc.crop.deepRooted && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                      ✓ Deep Rooting
                    </span>
                  )}
                  {rc.crop.pestBreaker && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-medium">
                      ✓ Pest Breaker
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits & Gaps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Benefits */}
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2.5 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {t.strategies.benefits}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {currentStrategy.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gaps & Constraints */}
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5 font-mono">
              <Info className="w-4 h-4 text-cyan-400" />
              {t.strategies.gaps}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {currentStrategy.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-slate-500 font-bold">•</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
