import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Sprout,
  LayoutDashboard,
  Satellite,
  CloudSun,
  CalendarDays,
  SlidersHorizontal,
  Leaf,
  ClipboardList,
  TrendingUp,
  MessageCircle,
  BookOpen,
  Upload,
  Volume2,
  VolumeX,
  X,
  Info,
  ArrowUpRight,
} from 'lucide-react'
import { useAppStore } from './store/useAppStore'
import { Overview } from './components/Overview'
import MeteomaticsDashboard from './components/MeteomaticsDashboard'
import { parseClimateImport } from './lib/importData'
import { generateFallback } from './api/nasa-power'
const CropPlanner = lazy(() =>
  import('./components/PlanViews').then((m) => ({ default: m.CropPlanner })),
)
const ClimateSimulator = lazy(() =>
  import('./components/PlanViews').then((m) => ({ default: m.ClimateSimulator })),
)
const ActionPlan = lazy(() =>
  import('./components/PlanViews').then((m) => ({ default: m.ActionPlan })),
)
const NASADashboard = lazy(() =>
  import('./components/ScienceViews').then((m) => ({ default: m.NASADashboard })),
)
const RiskCalendar = lazy(() =>
  import('./components/ScienceViews').then((m) => ({ default: m.RiskCalendar })),
)
const SoilHealthAdvisor = lazy(() =>
  import('./components/ScienceViews').then((m) => ({ default: m.SoilHealthAdvisor })),
)
const HistoricalTrends = lazy(() =>
  import('./components/ScienceViews').then((m) => ({ default: m.HistoricalTrends })),
)
const Methodology = lazy(() =>
  import('./components/ScienceViews').then((m) => ({ default: m.Methodology })),
)
const Advisor = lazy(() => import('./components/Advisor').then((m) => ({ default: m.Advisor })))
const navigation = [
  { id: 'overview', en: 'Field overview', ur: 'کھیت کا جائزہ', icon: LayoutDashboard },
  { id: 'crops', en: 'Crop planner', ur: 'فصلوں کی منصوبہ بندی', icon: Sprout },
  { id: 'nasa', en: 'NASA climate', ur: 'ناسا موسمی ڈیٹا', icon: Satellite },
  { id: 'meteomatics', en: 'Live Weather', ur: 'موسم', icon: CloudSun },
  { id: 'risk', en: 'Risk calendar', ur: 'خطرے کا کیلنڈر', icon: CalendarDays },
  { id: 'simulator', en: 'Climate simulator', ur: 'موسمی تبدیلی', icon: SlidersHorizontal },
  { id: 'soil', en: 'Soil health', ur: 'مٹی کی صحت', icon: Leaf },
  { id: 'action', en: 'Action plan', ur: 'عملی منصوبہ', icon: ClipboardList },
  { id: 'trends', en: 'Historical trends', ur: 'تاریخی رجحانات', icon: TrendingUp },
  { id: 'advisor', en: 'Field advisor', ur: 'کھیت کا مشیر', icon: MessageCircle },
  { id: 'methodology', en: 'Sources & methods', ur: 'ذرائع اور طریقہ کار', icon: BookOpen },
]
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    return this.state.error ? (
      <div className="panel empty-state" role="alert">
        <h2>This view could not load.</h2>
        <p>
          Your repository and downloaded plans are unaffected. Reload to restore the demo workspace.
        </p>
        <button className="btn primary" onClick={() => window.location.reload()}>
          Reload dashboard
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
function ImportDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    [error, setError] = useState('')
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  const example = () => {
    const field = useAppStore.getState().field
    if (!field) return
    const data = generateFallback(field.center.lat, field.center.lng)
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = 'soilsight-demo-climate.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose()
      }}
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">BRING YOUR OWN INPUTS</span>
          <h2>Import monthly climate</h2>
        </div>
        <button className="icon-btn" aria-label="Close import dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <p>
        Import 12 monthly records as JSON or CSV. Required columns:{' '}
        <code>month, tempMin, tempMax, tempAvg, rainfall</code>. Temperatures are °C and rainfall is
        the monthly total in mm. Optional wetness indices are 0–1.
      </p>
      <p className="caption">
        This is SoilSight’s normalized format, not a raw NASA CSV. Imports remain labelled as
        unverified estimates. A selected field is required.
      </p>
      <button className="text-link" onClick={example}>
        Download an example JSON
      </button>
      <label className="upload-zone">
        <Upload size={26} />
        <strong>Choose a CSV or JSON file</strong>
        <span>Maximum 1 MB · exactly one record per month</span>
        <input
          type="file"
          aria-label="Climate dataset file"
          accept=".csv,.json"
          onChange={async (e) => {
            setError('')
            const file = e.target.files?.[0],
              field = useAppStore.getState().field
            if (!file) return
            try {
              if (!field) throw new Error('Select a field before importing data.')
              if (file.size > 1000000) throw new Error('Choose a file smaller than 1 MB.')
              const text = await file.text()
              if (useAppStore.getState().field !== field)
                throw new Error('The field changed. Select the file again.')
              useAppStore.getState().importData(parseClimateImport(text, file.name, field.center))
              onClose()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to read this file.')
            }
            e.target.value = ''
          }}
        />
      </label>
      {error && (
        <p className="notice warning" role="alert">
          {error}
        </p>
      )}
    </dialog>
  )
}
export default function App() {
  const {
    activeTab,
    setActiveTab,
    language,
    setLanguage,
    nasaData: nasa,
    error,
    soilError,
    field,
    loading,
  } = useAppStore()
  const [importOpen, setImportOpen] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [voiceMessage, setVoiceMessage] = useState('')
  useEffect(
    () => () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    },
    [],
  )
  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [language])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.title = `${navigation.find((n) => n.id === activeTab)?.en ?? 'Workspace'} — SoilSight`
  }, [activeTab])
  const readAloud = () => {
    if (!('speechSynthesis' in window)) {
      setVoiceMessage('Read-aloud is not supported in this browser.')
      return
    }
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const voices = window.speechSynthesis.getVoices(),
      voice = voices.find((v) => v.lang.startsWith(language))
    if (!voice) {
      setVoiceMessage(
        `No ${language === 'ur' ? 'Urdu' : 'English'} voice is available on this device. The text remains available.`,
      )
      return
    }
    const best = useAppStore.getState().rankedStrategies[0]
    const text =
      language === 'ur'
        ? `یہ ابتدائی منصوبہ ہے۔ ${nasa?.kind === 'demo' ? 'یہ مثالی ڈیٹا ہے، ناسا کا حقیقی ڈیٹا نہیں۔' : ''} سالانہ بارش ${Math.round(nasa?.annualRainfall ?? 0)} ملی میٹر ہے۔ ${best?.nameUrdu ?? ''} کے لیے پانی کی اندازاً کمی ${Math.round(best?.irrigationTotal ?? 0)} ملی میٹر ہے۔ مقامی ماہر سے تصدیق کریں۔`
        : `${nasa?.confidence.label ?? 'No data loaded'}. Annual rainfall is ${Math.round(nasa?.annualRainfall ?? 0)} millimetres. ${best?.explanation ?? 'Choose a field and load climate data.'} Review this preliminary plan with a local agronomist.`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => {
      setSpeaking(false)
      setVoiceMessage('Read-aloud could not complete on this device.')
    }
    setVoiceMessage('')
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }
    const view = {
    overview: <Overview />,
    crops: <CropPlanner />,
    nasa: <NASADashboard />,
    meteomatics: <MeteomaticsDashboard />,
    risk: <RiskCalendar />,
    simulator: <ClimateSimulator />,
    soil: <SoilHealthAdvisor />,
    action: <ActionPlan />,
    trends: <HistoricalTrends />,
    advisor: <Advisor key={`${nasa?.lat}-${nasa?.lon}-${nasa?.kind}`} />,
    methodology: <Methodology />,
  }[activeTab] ?? <Overview />
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setActiveTab('overview')}
          aria-label="SoilSight home"
        >
          <span className="brand-icon">
            <Sprout size={26} />
          </span>
          <span>
            SoilSight<small>EARTH DATA. FARM WISDOM.</small>
          </span>
        </button>
        <span className="sidebar-label">YOUR FARM WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, en, ur, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{language === 'ur' ? ur : en}</span>
              {activeTab === id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="challenge-card">
            <Satellite size={22} />
            <span>
              Built for better
              <br />
              <strong>seasons on Earth.</strong>
            </span>
            <p>
              NASA Space Apps
              <br />
              Challenge prototype · 2026
            </p>
            <a href="https://www.spaceappschallenge.org/" target="_blank" rel="noreferrer">
              Explore the challenge <ArrowUpRight size={13} />
            </a>
          </div>
          <div className="sidebar-foot">
            <span className="live-dot" /> Explainable by design
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{navigation.find((n) => n.id === activeTab)?.[language] ?? 'Overview'}</strong>
          </div>
          <div className="topbar-tools">
            <div className="segmented language" aria-label="Interface language">
              <button aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>
                EN
              </button>
              <button aria-pressed={language === 'ur'} onClick={() => setLanguage('ur')}>
                اردو
              </button>
            </div>
            <button
              className="icon-btn"
              aria-label={speaking ? 'Stop reading' : 'Read summary aloud'}
              onClick={readAloud}
            >
              {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              className="btn small import-button"
              disabled={!field}
              onClick={() => setImportOpen(true)}
            >
              <Upload size={14} />
              <span>Import data</span>
            </button>
            <span className="avatar" aria-hidden="true">
              <Leaf size={17} />
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {nasa?.kind !== 'live' && nasa && (
            <div className="data-banner">
              <Info size={16} />
              <span>
                <strong>{nasa.kind === 'demo' ? 'Demo mode' : 'Imported data'}.</strong>{' '}
                {nasa.kind === 'demo'
                  ? 'Climate and soil values are illustrative estimates. Load NASA data for a real climate baseline.'
                  : 'User-supplied climate inputs. Provenance has not been verified.'}
              </span>
              <button onClick={() => setActiveTab('methodology')}>
                About the data <ArrowUpRight size={13} />
              </button>
            </div>
          )}
          {loading && (
            <p className="notice" role="status">
              Loading climate and soil at your field’s centre…
            </p>
          )}
          {error && (
            <div className="notice warning" role="alert">
              {error}
            </div>
          )}
          {soilError && (
            <div className="notice warning" role="status">
              {soilError}
            </div>
          )}
          {voiceMessage && (
            <p className="notice" role="status">
              {voiceMessage}
            </p>
          )}
          {language === 'ur' && (
            <p className="caption language-note" lang="ur">
              اہم مینو اور فصلوں کی وضاحت اردو میں ہے۔ تکنیکی جدول اور تفصیلی طریقہ کار فی الحال
              انگریزی میں ہیں۔ آواز کی دستیابی آپ کے آلے پر منحصر ہے۔
            </p>
          )}
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="panel empty-state" role="status">
                  Loading workspace…
                </div>
              }
            >
              {view}
            </Suspense>
          </ErrorBoundary>
          <footer>
            <span>
              <Sprout size={14} /> SoilSight · Thoughtful farming starts with context.
            </span>
            <button onClick={() => setActiveTab('methodology')}>
              Sources, assumptions & limitations <ArrowRightIcon />
            </button>
          </footer>
        </main>
      </div>
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
    </div>
  )
}
function ArrowRightIcon() {
  return <ArrowUpRight size={13} />
}
