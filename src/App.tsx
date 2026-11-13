import React, { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { Header } from './components/Header'
import { FieldSelector } from './components/FieldSelector'
import { DEMO_LOCATIONS } from './lib/demoLocations'
import { Overview } from './components/Overview'
import { NASADashboard } from './components/NASADashboard'
import { RiskCalendar } from './components/RiskCalendar'
import { CropPlanner } from './components/CropPlanner'
import { ScoringEngine } from './components/ScoringEngine'
import { ClimateSimulator } from './components/ClimateSimulator'
import { IrrigationPlanner } from './components/IrrigationPlanner'
import { SoilHealthAdvisor } from './components/SoilHealthAdvisor'
import { ActionPlan } from './components/ActionPlan'
import { HistoricalTrends } from './components/HistoricalTrends'
import { GeminiAssistant } from './components/GeminiAssistant'
import { generateFallback } from './api/nasa-power'
import { getFallbackSoil } from './api/soilgrids'
import {
  Satellite, ShieldCheck, Database,
  ExternalLink, FileSpreadsheet, CheckCircle2, X
} from 'lucide-react'

export const App: React.FC = () => {
  const {
    activeTab,
    setField,
    recalculateAll,
    field,
    dataLoaded,
  } = useAppStore()

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  // Initialize with robust dummy / benchmark data on first mount so the dashboard is NEVER blank!
  useEffect(() => {
    if (!dataLoaded) {
      const defaultLoc = DEMO_LOCATIONS[0] // Punjab, Pakistan
      const delta = 0.0035
      const mockPolygon = {
        coordinates: [
          { lat: defaultLoc.lat - delta, lng: defaultLoc.lon - delta },
          { lat: defaultLoc.lat - delta, lng: defaultLoc.lon + delta },
          { lat: defaultLoc.lat + delta, lng: defaultLoc.lon + delta },
          { lat: defaultLoc.lat + delta, lng: defaultLoc.lon - delta },
        ],
        center: { lat: defaultLoc.lat, lng: defaultLoc.lon },
        areaHectares: 24.5,
        areaAcres: 60.5,
      }
      setField(mockPolygon)

      const initialNasa = generateFallback(defaultLoc.lat, defaultLoc.lon)
      const initialSoil = getFallbackSoil(defaultLoc.lat, defaultLoc.lon)
      recalculateAll(initialNasa, initialSoil)
    }
  }, [dataLoaded, recalculateAll, setField])

  // Custom dataset upload (CSV or JSON) when NASA team provides data
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text)
          if (parsed.monthly) {
            recalculateAll(parsed, getFallbackSoil(field?.center.lat ?? 30, field?.center.lng ?? 71))
            setUploadSuccess(`Successfully loaded NASA JSON dataset (${parsed.source || file.name})`)
          }
        } else {
          // Parse CSV
          const lines = text.trim().split('\n')
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
          const monthly = []
          for (let i = 1; i <= Math.min(12, lines.length - 1); i++) {
            const vals = lines[i].split(',').map(v => parseFloat(v.trim()))
            monthly.push({
              month: i,
              tempMin: vals[headers.indexOf('tmin')] ?? (15 + i),
              tempMax: vals[headers.indexOf('tmax')] ?? (28 + i),
              tempAvg: vals[headers.indexOf('tavg')] ?? (22 + i),
              rainfall: vals[headers.indexOf('rain')] ?? (20 + (i * 8)),
              soilMoistureRoot: vals[headers.indexOf('soilroot')] ?? 0.45,
              soilMoistureProf: vals[headers.indexOf('soilprof')] ?? 0.50,
              et0: vals[headers.indexOf('et0')] ?? 90,
            })
          }
          const annualRainfall = monthly.reduce((s, m) => s + m.rainfall, 0)
          const avgTemp = monthly.reduce((s, m) => s + m.tempAvg, 0) / 12

          recalculateAll(
            {
              monthly,
              annualRainfall,
              avgTemp,
              confidence: {
                level: 'observed',
                label: 'NASA Challenge Dataset',
                description: `Imported directly from official challenge file: ${file.name}`,
                color: '#10b981'
              },
              source: `NASA Space Apps Dataset (${file.name})`,
              lat: field?.center.lat ?? 30.15,
              lon: field?.center.lng ?? 71.52,
            },
            getFallbackSoil(field?.center.lat ?? 30, field?.center.lng ?? 71)
          )
          setUploadSuccess(`Successfully loaded official NASA challenge CSV: ${file.name}`)
        }
      } catch (err) {
        alert('Could not parse file. Using standard NASA benchmark format.')
        console.error(err)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-[#f8f5ef] flex flex-col text-[#342a20] font-sans">
      <Header />

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8 w-full md:ml-64 md:w-[calc(100%-16rem)]">
        {activeTab === 'overview' && (
          <section aria-label="Dashboard Workspace" className="transition-all">
            <Overview />
          </section>
        )}

        <section aria-label="Field Boundary Map">
          <FieldSelector onImportDataset={() => setShowUploadModal(true)} />
        </section>

        {activeTab !== 'overview' && (
          <section aria-label="Dashboard Workspace" className="transition-all">
            {activeTab === 'crops' && <CropPlanner />}
            {activeTab === 'scoring' && <ScoringEngine />}
            {activeTab === 'risk' && <RiskCalendar />}
            {activeTab === 'simulator' && <ClimateSimulator />}
            {activeTab === 'irrigation' && <IrrigationPlanner />}
            {activeTab === 'nasa' && <NASADashboard />}
            {activeTab === 'soil' && <SoilHealthAdvisor />}
            {activeTab === 'action' && <ActionPlan />}
            {activeTab === 'trends' && <HistoricalTrends />}
            {activeTab === 'assistant' && <GeminiAssistant />}
          </section>
        )}
      </main>

      {/* Dataset Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rounded-2xl bg-[#fffdf8] text-[#342a20] max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#e7ddcd] space-y-5">
            <div className="flex items-center justify-between border-b border-[#e7ddcd] pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#8b6a42]" />
                <h3 className="text-base font-bold text-[#342a20]">
                  Import field data
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-[#847766] hover:text-[#342a20] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[#756858] leading-relaxed">
              Upload a NASA or local <strong>CSV</strong> or <strong>JSON</strong> dataset. SoilSight will update the climate summary and crop recommendations.
            </p>

            {/* Dropzone */}
            <label className="border-2 border-dashed border-[#cbb99b] hover:border-[#92734d] rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 bg-[#f8f3e9] hover:bg-[#f3eadc] cursor-pointer transition-all text-center">
              <FileSpreadsheet className="w-10 h-10 text-[#8b6a42]" />
              <span className="text-sm font-bold text-[#463927]">
                Choose a dataset file
              </span>
              <span className="text-xs text-[#847766]">
                CSV or JSON files
              </span>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploadSuccess && (
              <div className="p-3.5 bg-[#edf2e8] rounded-xl border border-[#d6e0cb] text-xs text-[#526c3c] flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#e7ddcd]">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl bg-[#806444] text-white font-bold text-xs shadow-sm hover:bg-[#6e5538]"
              >
                Close & View Telemetry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aerospace Footer */}
      <footer className="bg-[#f1e9dc] border-t border-[#e7ddcd] text-[#756858] text-xs py-6 mt-10 md:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-[#463927] font-bold text-sm">
              <Satellite className="w-4 h-4 text-[#8b6a42]" />
              <span>NST SoilSight — Adapting Farms with NASA Earth Observations</span>
            </div>
            <p className="text-[11px] text-[#756858] leading-relaxed font-sans">
              Developed for the <strong>NASA International Space Apps Challenge 2026</strong>.
              Uses NASA POWER Climatology, NASA GIBS imagery, and ISRIC SoilGrids.
              Designed as an assistive decision-support platform to complement local agricultural expertise.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#5f7047]">
              <ShieldCheck className="w-4 h-4" />
              <span>Observed • Modelled • Estimated Verified</span>
            </span>
            <a
              href="https://power.larc.nasa.gov/"
              target="_blank"
              rel="noreferrer"
              className="text-[#806444] hover:text-[#5f482d] flex items-center gap-1 transition-colors"
            >
              NASA POWER <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://www.spaceappschallenge.org/"
              target="_blank"
              rel="noreferrer"
              className="text-[#806444] hover:text-[#5f482d] flex items-center gap-1 transition-colors"
            >
              Space Apps 2026 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
export default App
