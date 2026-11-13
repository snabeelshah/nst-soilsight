import type { ReactNode } from 'react'
import { Info, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
export function PanelTitle({
  number,
  title,
  description,
  action,
}: {
  number?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="view-heading">
      <div>
        {number && <span className="eyebrow">{number}</span>}
        <h2>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
export function EmptyState() {
  return (
    <div className="panel empty-state">
      <Info size={28} />
      <h2>Your field comes first</h2>
      <p>Draw a boundary and load NASA data, or explore a labelled demo.</p>
      <button
        className="btn primary"
        onClick={() => useAppStore.getState().setActiveTab('overview')}
      >
        Select a field <ArrowUpRight size={16} />
      </button>
    </div>
  )
}
export function ExpertBanner() {
  return (
    <div className="expert-banner">
      <ShieldCheck size={22} />
      <div>
        <strong>A planning conversation, before a planting decision.</strong>
        <p>
          Review crop choice, water access and soil tests with a local agronomist. Scores are
          illustrative decision aids; yields and income are not predicted.
        </p>
      </div>
    </div>
  )
}
export function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: ReactNode
  detail: string
  tone?: string
}) {
  return (
    <div className={`metric ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}
export function SourceNote() {
  const nasa = useAppStore((s) => s.nasaData)
  return (
    <p className="source-note">
      <Info size={14} />
      {nasa
        ? `${nasa.confidence.label}. ${nasa.period}. Calculated outputs are estimates.`
        : 'Select a field and load climate data.'}
    </p>
  )
}
export const number = (n: number, digits = 0) =>
  new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(n)
