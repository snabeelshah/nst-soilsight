import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import { getRiskIcon } from '../lib/riskCalendar'
import type { MonthRisk } from '../types'
import { AlertTriangle, ShieldCheck, Info, Calendar, Sparkles } from 'lucide-react'

const MONTH_NAMES_URDU = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر']

export const RiskCalendar: React.FC = () => {
  const { riskCalendar, language, nasaData } = useAppStore()
  const t = translations[language]

  const [selectedMonth, setSelectedMonth] = useState<MonthRisk | null>(
    riskCalendar.length > 0 ? riskCalendar[0] : null
  )

  if (!riskCalendar || riskCalendar.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
        <Calendar className="w-12 h-12 text-cyan-400/40 mx-auto mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-white">No Risk Calendar Available</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Delineate a farm boundary or select a demo location to calculate the 12-month agro-ecological hazard calendar.
        </p>
      </div>
    )
  }

  const currentSelection = selectedMonth || riskCalendar[0]
  const currentMonthData = nasaData?.monthly[currentSelection.month - 1]

  const getSeverityBadge = (severity: MonthRisk['severity']) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-500',
          label: t.riskCalendar.high,
          icon: AlertTriangle,
        }
      case 'medium':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-500',
          label: t.riskCalendar.medium,
          icon: Info,
        }
      case 'low':
      default:
        return {
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-500',
          label: t.riskCalendar.low,
          icon: ShieldCheck,
        }
    }
  }

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
      {/* Title & Description */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            {t.riskCalendar.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t.riskCalendar.subtitle}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs bg-[#0a0f24] px-3.5 py-1.5 rounded-xl border border-white/5 font-mono">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            {t.riskCalendar.low}
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            {t.riskCalendar.medium}
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            {t.riskCalendar.high}
          </span>
        </div>
      </div>

      {/* 12-Month Calendar Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {riskCalendar.map((item) => {
          const isSelected = currentSelection.month === item.month
          const sev = getSeverityBadge(item.severity)
          const mData = nasaData?.monthly[item.month - 1]

          return (
            <button
              key={item.month}
              onClick={() => setSelectedMonth(item)}
              className={`p-3.5 rounded-2xl text-left transition-all border relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                  : 'bg-white/5 hover:bg-white/10 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white font-mono">
                  {language === 'ur' ? MONTH_NAMES_URDU[item.month - 1] : item.monthName.slice(0, 3)}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${sev.dot}`} />
              </div>

              {mData && (
                <div className="my-2 text-[11px] text-slate-400 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span>Temp:</span>
                    <span className="font-semibold text-slate-200">{mData.tempAvg}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rain:</span>
                    <span className="font-semibold text-cyan-300">{mData.rainfall}mm</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {item.risks.map((r, idx) => (
                  <span
                    key={idx}
                    title={r}
                    className="text-xs p-1 rounded-md bg-white/10 border border-white/5"
                  >
                    {getRiskIcon(r)}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Detailed Month Inspection HUD */}
      {currentSelection && (
        <div className="bg-[#0a0f24] rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-black font-mono text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                {currentSelection.month}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'ur' ? MONTH_NAMES_URDU[currentSelection.month - 1] : currentSelection.monthName} — Agro-Climate Risk Profile
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Derived from 20-year NASA POWER satellite reanalysis
                </span>
              </div>
            </div>

            <div className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border flex items-center gap-2 ${getSeverityBadge(currentSelection.severity).bg}`}>
              <span className={`w-2 h-2 rounded-full ${getSeverityBadge(currentSelection.severity).dot}`} />
              <span>{getSeverityBadge(currentSelection.severity).label}</span>
            </div>
          </div>

          {currentMonthData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-3 rounded-xl border border-white/5 text-xs font-mono">
              <div>
                <span className="text-slate-400 block">Thermal Range</span>
                <span className="font-bold text-white text-sm">
                  {currentMonthData.tempMin}°C – {currentMonthData.tempMax}°C
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Mean Temperature</span>
                <span className="font-bold text-white text-sm">
                  {currentMonthData.tempAvg}°C
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Precipitation</span>
                <span className="font-bold text-cyan-300 text-sm">
                  {currentMonthData.rainfall} mm
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Root Soil Saturation</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {Math.round(currentMonthData.soilMoistureRoot * 100)}%
                </span>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
              Identified Ecological Constraints & Adaptive Recommendations
            </h4>
            <div className="space-y-2">
              {currentSelection.description.map((desc, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-slate-200 flex items-start gap-2.5"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
