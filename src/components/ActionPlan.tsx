import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import { generateActionPlan, type ActionStep } from '../lib/actionPlan'
import { Calendar, AlertTriangle, Printer, CheckCircle, Leaf, Droplets, TrendingUp, Sparkles } from 'lucide-react'

export const ActionPlan: React.FC = () => {
  const { rankedStrategies, nasaData, soilData, language } = useAppStore()
  const t = translations[language]

  if (!rankedStrategies.length || !nasaData) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
        <Calendar className="w-12 h-12 text-cyan-400/40 mx-auto mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-white">No Action Plan Generated</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Delineate your field or select a demo location to generate a customized next-season action plan.
        </p>
      </div>
    )
  }

  const topStrategy = rankedStrategies[0]
  const plan = generateActionPlan(topStrategy, nasaData, soilData)

  const handlePrint = () => {
    window.print()
  }

  const getPriorityStyle = (priority: ActionStep['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      case 'important':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      case 'optional':
      default:
        return 'bg-slate-800 text-slate-400 border-white/5'
    }
  }

  const getCategoryIcon = (cat: ActionStep['category']) => {
    switch (cat) {
      case 'planting':
        return <Leaf className="w-4 h-4 text-emerald-400" />
      case 'harvest':
        return <CheckCircle className="w-4 h-4 text-amber-400" />
      case 'irrigation':
        return <Droplets className="w-4 h-4 text-cyan-400" />
      case 'market':
        return <TrendingUp className="w-4 h-4 text-purple-400" />
      default:
        return <Calendar className="w-4 h-4 text-slate-400" />
    }
  }

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              {t.actionPlan.title}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
              {plan.strategyName}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t.actionPlan.subtitle} (Season: {plan.season})
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md font-mono"
        >
          <Printer className="w-4 h-4 text-cyan-400" />
          <span>{t.actionPlan.downloadPdf}</span>
        </button>
      </div>

      {/* Advisory Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3 shadow-lg">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-amber-300 uppercase tracking-wide">Official Advisory Protocol</h4>
          <p className="leading-relaxed opacity-90">
            {plan.disclaimer}
          </p>
        </div>
      </div>

      {/* Chronological Action Timeline */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Month-by-Month Field Operations Roadmap
        </h3>

        <div className="space-y-3">
          {plan.steps.map((step, idx) => (
            <div
              key={idx}
              className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5 flex flex-wrap sm:flex-nowrap items-start justify-between gap-4 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-start gap-3.5 flex-1">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-xs shrink-0">
                  {getCategoryIcon(step.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-cyan-400 uppercase">
                      {step.monthName}
                    </span>
                    <span className="text-slate-600">•</span>
                    <h4 className="text-sm font-bold text-white">{step.action}</h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{step.details}</p>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0 ${getPriorityStyle(step.priority)}`}>
                {step.priority}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Advisory Columns: Soil, Water, Market */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2 font-mono">
            <Leaf className="w-4 h-4 text-emerald-400" />
            Soil Stewardship Protocol
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {plan.soilRecommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2 font-mono">
            <Droplets className="w-4 h-4 text-cyan-400" />
            Water & Irrigation Management
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {plan.irrigationRecommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2 font-mono">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Market & Value Chain Strategy
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {plan.marketRecommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-purple-400 font-bold">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
