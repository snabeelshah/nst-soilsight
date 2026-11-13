import React from 'react'
import { useAppStore } from '../store/useAppStore'
import { DataConfidenceBadge } from './DataConfidenceBadge'
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid, AreaChart, Area
} from 'recharts'
import { CloudRain, Thermometer, Droplets, Sun, Satellite } from 'lucide-react'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const NASADashboard: React.FC = () => {
  const { nasaData } = useAppStore()

  if (!nasaData) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
        <Satellite className="w-12 h-12 text-cyan-400/40 mx-auto mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-white">No NASA Climate Data Loaded Yet</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Draw a farm field on the map or click any Quick Demo preset above to load 20-year NASA POWER climatology.
        </p>
      </div>
    )
  }

  const chartData = nasaData.monthly.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    month: m.month,
    tempMax: m.tempMax,
    tempMin: m.tempMin,
    tempAvg: m.tempAvg,
    rainfall: m.rainfall,
    soilMoistureRoot: Math.round(m.soilMoistureRoot * 100),
    soilMoistureProf: Math.round(m.soilMoistureProf * 100),
    et0: m.et0,
  }))

  const maxTempMonth = [...nasaData.monthly].sort((a, b) => b.tempMax - a.tempMax)[0]
  const minTempMonth = [...nasaData.monthly].sort((a, b) => a.tempMin - b.tempMin)[0]
  const wettestMonth = [...nasaData.monthly].sort((a, b) => b.rainfall - a.rainfall)[0]
  const driestMonth = [...nasaData.monthly].sort((a, b) => a.rainfall - b.rainfall)[0]

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold flex items-center gap-2">
                <Satellite className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                NASA POWER Climatology Fusion
              </span>
              <DataConfidenceBadge confidence={nasaData.confidence} inline />
            </div>
            <h2 className="text-xl font-black mt-2 text-white tracking-wide">
              Agro-Climatological Telemetry Profile
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Lat: {nasaData.lat.toFixed(4)}°N, Lon: {nasaData.lon.toFixed(4)}°E | Source: {nasaData.source}
            </p>
          </div>

          {/* Quick Metrics HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/10">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Thermometer className="w-3 h-3 text-amber-400" />
                Mean Temp
              </div>
              <div className="text-lg font-bold text-white mt-0.5">
                {nasaData.avgTemp.toFixed(1)}°C
              </div>
              <div className="text-[10px] text-slate-500">20-yr mean</div>
            </div>

            <div className="bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/10">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <CloudRain className="w-3 h-3 text-cyan-400" />
                Rainfall
              </div>
              <div className="text-lg font-bold text-cyan-300 mt-0.5">
                {nasaData.annualRainfall} mm
              </div>
              <div className="text-[10px] text-slate-500">Annual sum</div>
            </div>

            <div className="bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/10">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Sun className="w-3 h-3 text-rose-400" />
                Peak Heat
              </div>
              <div className="text-lg font-bold text-rose-400 mt-0.5">
                {maxTempMonth.tempMax}°C
              </div>
              <div className="text-[10px] text-slate-500">{MONTH_NAMES[maxTempMonth.month - 1]}</div>
            </div>

            <div className="bg-white/5 px-3.5 py-2.5 rounded-xl border border-white/10">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Droplets className="w-3 h-3 text-emerald-400" />
                Wettest
              </div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {wettestMonth.rainfall} mm
              </div>
              <div className="text-[10px] text-slate-500">{MONTH_NAMES[wettestMonth.month - 1]}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Temperature Envelope */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-400" />
                Monthly Thermal Envelope (°C)
              </h3>
              <p className="text-xs text-slate-400">
                Min, Mean, and Max monthly 2m air temperatures (NASA POWER)
              </p>
            </div>
            <DataConfidenceBadge confidence={nasaData.confidence} inline />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="°" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0f24', borderColor: 'rgba(56,189,248,0.3)', borderRadius: '12px', color: '#fff', fontSize: '12px', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="tempMax" name="Max Temp (°C)" stroke="#f43f5e" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="tempAvg" name="Mean Temp (°C)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tempMin" name="Min Temp (°C)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex justify-between px-1 font-mono">
            <span>Lowest: {MONTH_NAMES[minTempMonth.month - 1]} ({minTempMonth.tempMin}°C)</span>
            <span>Peak: {MONTH_NAMES[maxTempMonth.month - 1]} ({maxTempMonth.tempMax}°C)</span>
          </div>
        </div>

        {/* Graph 2: Precipitation vs Evapotranspiration */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                Precipitation vs. Evapotranspiration (mm)
              </h3>
              <p className="text-xs text-slate-400">
                Corrected precipitation (PRECTOTCORR) compared with reference ET₀
              </p>
            </div>
            <DataConfidenceBadge confidence={nasaData.confidence} inline />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="mm" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0f24', borderColor: 'rgba(6,182,212,0.3)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="rainfall" name="Rainfall (mm)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="et0" name="Reference ET₀ (mm)" stroke="#fb923c" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex justify-between px-1 font-mono">
            <span>Driest: {MONTH_NAMES[driestMonth.month - 1]} ({driestMonth.rainfall} mm)</span>
            <span>Peak: {MONTH_NAMES[wettestMonth.month - 1]} ({wettestMonth.rainfall} mm)</span>
          </div>
        </div>

        {/* Graph 3: Surface & Root-Zone Soil Moisture */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Droplets className="w-4 h-4 text-emerald-400" />
                Soil Moisture Saturation: Root-Zone vs. Profile Depth (0–100%)
              </h3>
              <p className="text-xs text-slate-400">
                NASA SMAP & MERRA-2 GWETROOT (root layer) vs GWETPROF (deep profile)
              </p>
            </div>
            <DataConfidenceBadge confidence={nasaData.confidence} inline />
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRoot" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0f24', borderColor: 'rgba(16,185,129,0.3)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="soilMoistureRoot" name="Root-Zone Wetness (%)" stroke="#10b981" fillOpacity={1} fill="url(#colorRoot)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="soilMoistureProf" name="Profile Wetness (%)" stroke="#38bdf8" fillOpacity={1} fill="url(#colorProf)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 flex items-center justify-between">
            <span>Soil moisture levels below 30% indicate water stress for shallow-rooted crops.</span>
            <span className="font-semibold text-emerald-400 font-mono">SMAP Satellite Model Fusion</span>
          </div>
        </div>
      </div>
    </div>
  )
}
