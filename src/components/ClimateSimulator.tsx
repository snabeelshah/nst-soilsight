import React from 'react'
import { useAppStore, DEFAULT_SCENARIO } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import { Thermometer, CloudRain, RotateCcw, Flame, Sparkles, AlertCircle } from 'lucide-react'

export const ClimateSimulator: React.FC = () => {
  const {
    climateScenario, updateClimateScenario,
    rankedStrategies, stressedStrategies,
    language, nasaData
  } = useAppStore()

  const t = translations[language]
  const isStressed = climateScenario.tempDelta !== 0 || climateScenario.rainfallDelta !== 0

  const handleTempChange = (val: number) => {
    updateClimateScenario({ ...climateScenario, tempDelta: val })
  }

  const handleRainChange = (val: number) => {
    updateClimateScenario({ ...climateScenario, rainfallDelta: val })
  }

  const handleReset = () => {
    updateClimateScenario(DEFAULT_SCENARIO)
  }

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              {t.simulator.title}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 uppercase tracking-wide">
              Scenario Stress Test
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t.simulator.subtitle}
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={!isStressed}
          className="px-3.5 py-1.5 rounded-xl border border-white/10 hover:border-cyan-500/40 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t.simulator.reset}</span>
        </button>
      </div>

      {/* Sliders Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0a0f24] p-6 rounded-2xl border border-white/5">
        {/* Temperature Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-rose-500" />
              {t.simulator.tempSlider}
            </span>
            <span className="font-mono text-base font-bold text-rose-400">
              +{climateScenario.tempDelta.toFixed(1)}°C
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={climateScenario.tempDelta}
            onChange={(e) => handleTempChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>0°C (Baseline)</span>
            <span>+2.5°C (IPCC SSP2-4.5)</span>
            <span>+5.0°C (Extreme)</span>
          </div>
        </div>

        {/* Rainfall Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              {t.simulator.rainSlider}
            </span>
            <span className={`font-mono text-base font-bold ${climateScenario.rainfallDelta < 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
              {climateScenario.rainfallDelta > 0 ? `+${climateScenario.rainfallDelta}%` : `${climateScenario.rainfallDelta}%`}
            </span>
          </div>
          <input
            type="range"
            min="-50"
            max="50"
            step="5"
            value={climateScenario.rainfallDelta}
            onChange={(e) => handleRainChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>-50% (Megadrought)</span>
            <span>0% (Baseline)</span>
            <span>+50% (Heavy Surges)</span>
          </div>
        </div>
      </div>

      {/* Before / After Strategy Comparison */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Resilience Shift: Baseline vs. Stressed Rotation Rankings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Baseline Rankings */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {t.simulator.beforeStress}
              </span>
              {nasaData && (
                <span className="text-[11px] font-mono text-slate-400">
                  {nasaData.avgTemp.toFixed(1)}°C | {nasaData.annualRainfall}mm
                </span>
              )}
            </div>

            <div className="space-y-2">
              {rankedStrategies.map((st, i) => (
                <div key={st.type} className="p-3.5 bg-white/5 rounded-xl border border-white/5 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white">#{i + 1} {st.name}</span>
                    <p className="text-[10px] text-slate-400 font-mono">{st.crops.map(c => c.crop.name.split(' ')[0]).join(' → ')}</p>
                  </div>
                  <span className="font-mono font-bold text-slate-300">{st.scores.overall}/100</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stressed Rankings */}
          <div className={`p-5 rounded-2xl border space-y-3 transition-all ${
            isStressed ? 'bg-orange-500/10 border-orange-500/30 shadow-[0_0_25px_rgba(249,115,22,0.15)]' : 'glass-panel border-white/5'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isStressed ? 'text-orange-300' : 'text-slate-300'}`}>
                {t.simulator.afterStress}
              </span>
              {nasaData && (
                <span className="text-[11px] font-mono text-orange-400 font-semibold">
                  {(nasaData.avgTemp + climateScenario.tempDelta).toFixed(1)}°C | {Math.max(0, Math.round(nasaData.annualRainfall * (1 + climateScenario.rainfallDelta / 100)))}mm
                </span>
              )}
            </div>

            <div className="space-y-2">
              {(stressedStrategies.length > 0 ? stressedStrategies : rankedStrategies).map((st, i) => {
                const baselineScore = rankedStrategies.find(r => r.type === st.type)?.scores.overall ?? st.scores.overall
                const diff = st.scores.overall - baselineScore

                return (
                  <div key={st.type} className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 text-xs flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">#{i + 1} {st.name}</span>
                        {i === 0 && isStressed && (
                          <span className="text-[9px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                            Most Resilient
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">{st.crops.map(c => c.crop.name.split(' ')[0]).join(' → ')}</p>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-white">{st.scores.overall}/100</span>
                      {diff !== 0 && (
                        <span className={`text-[10px] block ${diff < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
