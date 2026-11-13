import type { DataConfidence } from '../types'

export const CONFIDENCE_LEVELS = {
  observed: {
    level: 'observed' as const,
    label: 'Observed',
    icon: '🛰️',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    description: 'Derived from real satellite and ground station observations.',
    accuracy: 'High accuracy (±5–10%)',
  },
  modelled: {
    level: 'modelled' as const,
    label: 'Modelled',
    icon: '🌐',
    color: '#1976d2',
    bgColor: '#eff6ff',
    description: 'NASA POWER reanalysis: satellite + atmospheric model fusion.',
    accuracy: 'Good accuracy (±10–15%)',
  },
  estimated: {
    level: 'estimated' as const,
    label: 'Estimated',
    icon: '📊',
    color: '#d97706',
    bgColor: '#fffbeb',
    description: 'Computed from global models. Local variation may differ.',
    accuracy: 'Indicative only (±20–30%)',
  },
}

export function getConfidenceInfo(confidence: DataConfidence) {
  return CONFIDENCE_LEVELS[confidence.level] ?? CONFIDENCE_LEVELS.estimated
}
