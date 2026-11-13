import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import {
  Satellite, Volume2, VolumeX, Compass,
  Sprout, Sliders, Calendar, Flame, Droplets,
  TestTube2, FileText, TrendingUp, Bot, LayoutDashboard
} from 'lucide-react'

export { DEMO_LOCATIONS } from '../lib/demoLocations'

export const Header: React.FC = () => {
  const { language, setLanguage, activeTab, setActiveTab, field } = useAppStore()
  const t = translations[language]
  const [speechActive, setSpeechActive] = useState(false)

  const toggleSpeech = () => {
    if (!speechActive) {
      if ('speechSynthesis' in window) {
        const text = language === 'ur'
          ? 'این ایس ٹی سوئل سائٹ میں خوش آمدید۔ ناسا ارتھ آبزرویشنز پر مبنی سمارٹ زرعی مشیر۔'
          : 'Welcome to NST SoilSight. Powered by NASA Earth observations for climate-adaptive crop rotations and soil resilience.'
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = language === 'ur' ? 'ur-PK' : 'en-US'
        utterance.rate = 0.95
        utterance.onend = () => setSpeechActive(false)
        window.speechSynthesis.speak(utterance)
        setSpeechActive(true)
      } else {
        alert('Web Speech API is not supported in this browser.')
      }
    } else {
      window.speechSynthesis.cancel()
      setSpeechActive(false)
    }
  }

  const navItems = [
    { id: 'overview', label: t.tabs.overview, icon: LayoutDashboard },
    { id: 'crops', label: t.tabs.crops, icon: Sprout },
    { id: 'scoring', label: t.tabs.scoring, icon: Sliders },
    { id: 'risk', label: t.tabs.risk, icon: Calendar },
    { id: 'simulator', label: t.tabs.simulator, icon: Flame },
    { id: 'irrigation', label: t.tabs.irrigation, icon: Droplets },
    { id: 'nasa', label: t.tabs.nasa, icon: Satellite },
    { id: 'soil', label: t.tabs.soil, icon: TestTube2 },
    { id: 'action', label: t.tabs.action, icon: FileText },
    { id: 'trends', label: t.tabs.trends, icon: TrendingUp },
    { id: 'assistant', label: t.tabs.assistant, icon: Bot },
  ] as const

  return (
    <header className="app-header app-sidebar z-50 border-b md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r">
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4 md:flex-col md:items-stretch md:px-5 md:py-6">
        {/* Brand & Mission Badge */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="absolute -inset-1 bg-gradient-to-r from-[#cbb99b] to-[#9aaf7d] rounded-xl blur-xs opacity-45 group-hover:opacity-70 transition duration-300"></div>
            <div className="relative w-10 h-10 rounded-xl bg-[#f3eadc] border border-[#d9c8ae] flex items-center justify-center">
              <Satellite className="w-5 h-5 text-[#806444] group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-[#342a20]">
                <span className="text-[#342a20]">
                  {t.appName}
                </span>
              </h1>
            </div>
            <p className="hidden text-[11px] leading-4 text-slate-400 sm:block md:max-w-[185px]">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Real-time Telemetry & Quick Action Controls */}
        <div className="flex items-center gap-2 md:mt-5 md:flex-wrap">
          {/* Active Field Telemetry Chip */}
          {field && (
            <div className="hidden items-center gap-2 rounded-lg border border-[#d6e0cb] bg-[#eaf0e2] px-3 py-1.5 text-xs text-[#526c3c] md:flex md:w-full">
              <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
              <span className="font-medium">{field.areaHectares.toFixed(1)} ha selected</span>
            </div>
          )}

          {/* Voice Read-Aloud Toggle */}
          <button
            onClick={toggleSpeech}
            title={speechActive ? 'Stop Voice' : 'Read Aloud (Voice)'}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-all ${
              speechActive
                ? 'bg-[#eaf0e2] text-[#5f7047] border-[#cdd9bf]'
                : 'bg-[#f3eadc] text-[#756858] border-[#e7ddcd] hover:bg-[#ece2d3]'
            }`}
          >
            {speechActive ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="hidden sm:inline md:inline">{speechActive ? 'Stop Voice' : 'Voice'}</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-[#f1e9dc] rounded-lg p-0.5 border border-[#e7ddcd]">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                language === 'en'
                  ? 'bg-[#806444] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ur')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all font-urdu ${
                language === 'ur'
                  ? 'bg-[#6f8053] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              اردو
            </button>
          </div>
        </div>
      </div>

      <nav aria-label="Main navigation" className="border-t border-[#e7ddcd] overflow-x-auto md:min-h-0 md:flex-1 md:border-t-0 md:overflow-y-auto md:px-3 md:py-5">
        <p className="hidden px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a0917d] md:block">Workspace</p>
        <div className="flex gap-1 px-4 py-2 md:flex-col md:gap-1 md:px-0 md:py-0">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-all md:w-full md:gap-3 md:py-2.5 ${
                  isActive
                      ? 'bg-[#ece2d3] text-[#725637] border-[#d9c8ae] md:shadow-sm'
                      : 'text-[#847766] border-transparent hover:text-[#463927] hover:bg-[#f3eadc] hover:border-[#e7ddcd]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#806444]' : 'text-[#9a8d7b]'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
