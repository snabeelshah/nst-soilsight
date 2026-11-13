import React from 'react'
import type { DataConfidence } from '../types'
import { Info, Satellite, Cpu, Calculator } from 'lucide-react'

interface Props {
  confidence: DataConfidence
  inline?: boolean
  showDetails?: boolean
}

export const DataConfidenceBadge: React.FC<Props> = ({ confidence, inline = false, showDetails = false }) => {
  const getBadgeStyle = () => {
    switch (confidence.level) {
      case 'observed':
        return {
          bg: 'bg-[#eaf0e2] text-[#526c3c] border-[#d6e0cb]',
          dot: 'bg-[#6f8053]',
          label: 'Observed',
          badgeText: 'Satellite Observation',
          icon: Satellite,
        }
      case 'modelled':
        return {
          bg: 'bg-[#e9f0ee] text-[#446a61] border-[#ccddd7]',
          dot: 'bg-[#608a7e]',
          label: 'Modelled',
          badgeText: 'NASA POWER Fusion',
          icon: Cpu,
        }
      case 'estimated':
      default:
        return {
          bg: 'bg-[#f6eddb] text-[#866331] border-[#e7d8b8]',
          dot: 'bg-[#b38a45]',
          label: 'Estimated',
          badgeText: 'Pedological Heuristic',
          icon: Calculator,
        }
    }
  }

  const style = getBadgeStyle()
  const Icon = style.icon

  if (inline) {
    return (
      <span
        title={confidence.description}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${style.bg} cursor-help transition-all shadow-xs`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`} />
        <span>{style.label}</span>
      </span>
    )
  }

  return (
    <div className={`p-3.5 rounded-2xl border text-xs ${style.bg} flex items-start gap-3 shadow-md`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5 text-current opacity-90" />
      <div className="flex-1">
        <div className="flex items-center gap-2 font-mono font-bold">
          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
          <span className="text-white">{confidence.label || style.badgeText}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-80 font-mono px-2 py-0.5 rounded-full bg-white/10">
            {confidence.level}
          </span>
        </div>
        {(showDetails || confidence.description) && (
          <p className="mt-1 text-[11px] leading-relaxed opacity-85 font-sans">{confidence.description}</p>
        )}
      </div>
    </div>
  )
}
