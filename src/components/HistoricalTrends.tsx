import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { analyzeHistoricalTrends, type TrendAnalysis } from '../lib/historicalTrends'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  Legend, CartesianGrid
} from 'recharts'
import { TrendingUp, CloudRain, Thermometer, Sparkles, RefreshCw } from 'lucide-react'

export const HistoricalTrends: React.FC = () => {
  const { field } = useAppStore()
  const [trendData, setTrendData] = useState<TrendAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!field) return
    let active = true
    setLoading(true)

    analyzeHistoricalTrends(field.center.lat, field.center.lng)
      .then((res) => {
        if (active) setTrendData(res)
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [field])

  if (!field) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
        <TrendingUp className="w-12 h-12 text-cyan-400/40 mx-auto mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-white">No Field Selected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Delineate your farm field or select a demo location to calculate 15-year NASA multi-year historical trends.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-white font-mono">Synthesizing 15-year NASA POWER climatology time series...</p>
      </div>
    )
  }

  if (!trendData) return null

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            15-Year Historical Climate & Anomaly Trends
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            Multi-Year NASA POWER
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Detect long-term thermal shifting and precipitation patterns using linear regression and statistical standard deviation anomaly filtering.
        </p>
      </div>

      {/* KPI Shift Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-slate-400 font-sans block flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" /> Warming Rate
          </span>
          <div className="text-xl font-black text-white mt-0.5">
            {trendData.tempTrendSlope > 0 ? `+${trendData.tempTrendSlope}` : trendData.tempTrendSlope} °C/yr
          </div>
          <span className="text-[10px] text-slate-500">
            {trendData.tempChangeDelta > 0 ? `+${trendData.tempChangeDelta}°C` : `${trendData.tempChangeDelta}°C`} decade shift
          </span>
        </div>

        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-slate-400 font-sans block flex items-center gap-1.5">
            <CloudRain className="w-3.5 h-3.5 text-cyan-400" /> Rain Trajectory
          </span>
          <div className="text-xl font-black text-cyan-300 mt-0.5">
            {trendData.rainfallTrendSlope > 0 ? `+${trendData.rainfallTrendSlope}` : trendData.rainfallTrendSlope} mm/yr
          </div>
          <span className={`text-[10px] ${trendData.rainfallChangePercent >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {trendData.rainfallChangePercent > 0 ? `+${trendData.rainfallChangePercent}%` : `${trendData.rainfallChangePercent}%`} recent volume
          </span>
        </div>

        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-slate-400 font-sans block">Baseline vs. Recent</span>
          <div className="text-xl font-black text-white mt-0.5">
            {trendData.baselineRainfall} → {trendData.recentRainfall} mm
          </div>
          <span className="text-[10px] text-slate-500">10-year rolling window</span>
        </div>

        <div className="p-4 bg-[#0a0f24] rounded-2xl border border-white/5">
          <span className="text-[11px] text-slate-400 font-sans block">Statistical Anomalies</span>
          <div className="text-xl font-black text-white mt-0.5">
            {trendData.anomalyYears.length} Years
          </div>
          <span className="text-[10px] text-slate-500 truncate block">
            {trendData.anomalyYears.join(', ') || 'No extreme breaks'}
          </span>
        </div>
      </div>

      {/* Multi-Year Chart */}
      <div className="p-5 bg-[#0a0f24] rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Annual Precipitation (mm) & Mean Air Temperature (°C) Time Series
          </h3>
          <span className="text-[10px] font-mono text-slate-500">Source: NASA POWER Historical Archive</span>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} unit="mm" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} unit="°" domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0f24', borderColor: 'rgba(56,189,248,0.3)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar yAxisId="left" dataKey="rainfall" name="Annual Rainfall (mm)" fill="#0284c7" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="temp" name="Mean Temperature (°C)" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interpretation */}
      <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-cyan-200 leading-relaxed font-medium">
          {trendData.interpretation}
        </p>
      </div>
    </div>
  )
}
