import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import { buildIrrigationPlan, totalIrrigationNeed, type IrrigationMonth } from '../lib/irrigationPlanner'
import {
  ResponsiveContainer, Bar, Line, XAxis, YAxis, Tooltip,
  Legend, CartesianGrid, ComposedChart
} from 'recharts'
import { Droplets, CloudRain, AlertCircle, Sparkles, CheckCircle } from 'lucide-react'

export const IrrigationPlanner: React.FC = () => {
  const { nasaData, rankedStrategies, language, field } = useAppStore()
  const t = translations[language]

  const [selectedStrategyIndex, setSelectedStrategyIndex] = useState(0)

  if (!nasaData || rankedStrategies.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
        <Droplets className="w-12 h-12 text-blue-400/40 mx-auto mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-white">No Irrigation Plan Available</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Delineate a field or select a demo location to calculate monthly crop water needs and supplemental irrigation requirements.
        </p>
      </div>
    )
  }

  const currentStrategy = rankedStrategies[selectedStrategyIndex] || rankedStrategies[0]
  const plan: IrrigationMonth[] = buildIrrigationPlan(nasaData.monthly, currentStrategy.crops)
  const totalGapMm = Math.round(totalIrrigationNeed(plan))
  const totalWaterNeedMm = Math.round(plan.reduce((s, m) => s + m.cropWaterNeed, 0))
  const totalRainfallMm = Math.round(plan.reduce((s, m) => s + m.rainfall, 0))

  const areaHa = field ? field.areaHectares : 1
  const totalGapM3 = Math.round(totalGapMm * 10 * areaHa)

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-400" />
            {t.irrigation.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t.irrigation.subtitle}
          </p>
        </div>

        {/* Strategy Switcher */}
        <div className="flex items-center gap-2">
          {rankedStrategies.map((s, idx) => (
            <button
              key={s.type}
              onClick={() => setSelectedStrategyIndex(idx)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedStrategyIndex === idx
                  ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/5'
              }`}
            >
              {language === 'ur' ? s.nameUrdu : s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-blue-400 font-semibold block">{t.irrigation.annualNeed}</span>
          <div className="text-xl font-black text-white mt-0.5">{totalWaterNeedMm} mm</div>
          <span className="text-[10px] text-slate-500">ETc (FAO-56 Kc)</span>
        </div>

        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-cyan-400 font-semibold block">{t.irrigation.annualRain}</span>
          <div className="text-xl font-black text-cyan-300 mt-0.5">{totalRainfallMm} mm</div>
          <span className="text-[10px] text-slate-500">NASA PRECTOTCORR</span>
        </div>

        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-amber-400 font-semibold block">{t.irrigation.deficit}</span>
          <div className="text-xl font-black text-amber-300 mt-0.5">{totalGapMm} mm</div>
          <span className="text-[10px] text-slate-500">Net depth deficit</span>
        </div>

        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-emerald-400 font-semibold block">Total Volume Needed</span>
          <div className="text-xl font-black text-emerald-300 mt-0.5">{totalGapM3.toLocaleString()} m³</div>
          <span className="text-[10px] text-slate-500">for {areaHa.toFixed(1)} ha field</span>
        </div>
      </div>

      {/* Monthly Water Gap Chart */}
      <div className="p-5 bg-[#0a0f24] rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 font-mono">
            <CloudRain className="w-4 h-4 text-cyan-400" />
            Monthly Crop Water Requirement vs. Observed Precipitation (mm)
          </h3>
          <span className="text-[10px] font-mono text-slate-500">Red line = Supplemental Deficit</span>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={plan} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="monthName" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="mm" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0f24', borderColor: 'rgba(59,130,246,0.3)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                formatter={(val: number) => [`${Math.round(val)} mm`]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="cropWaterNeed" name="Crop Water Need (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rainfall" name="NASA Rainfall (mm)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="waterGap" name="Irrigation Deficit Gap (mm)" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Smart Irrigation Advice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Drip Irrigation Advisory</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Converting to precision drip micro-irrigation cuts evapotranspiration losses by 35–45%, conserving ~{Math.round(totalGapMm * 0.4)} mm of groundwater tube-well pumping per year.
          </p>
        </div>

        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Rainwater Catchment</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Monsoon surplus months ({plan.filter(p => p.surplus > 20).map(p => p.monthName).join(', ') || 'none'}) provide runoff catchment potential for farm-pond storage and groundwater aquifer recharge.
          </p>
        </div>

        <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <AlertCircle className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Critical Growth Windows</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Shield anthesis and grain formation from moisture stress; moisture deficits during vegetative canopy stages are significantly better tolerated.
          </p>
        </div>
      </div>
    </div>
  )
}
