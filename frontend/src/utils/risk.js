// Single source of truth for risk level styling and labels.
// Soft Structuralism palette — emerald / amber / red

export const RISK_CONFIG = {
  SAFE: {
    label: 'Safe to Consume',
    shortLabel: 'Safe',
    icon: '✓',
    bannerClass: 'bg-brand/10 border-brand/20 text-brand',
    badgeClass: 'bg-brand/10 text-brand border-brand/20',
    scoreClass: 'text-brand',
    barClass: 'bg-brand',
    dotClass: 'bg-brand',
  },
  MODERATE: {
    label: 'Moderate Risk',
    shortLabel: 'Moderate',
    icon: '⚠',
    bannerClass: 'bg-gold/10 border-gold/20 text-gold',
    badgeClass: 'bg-gold/10 text-gold border-gold/20',
    scoreClass: 'text-gold',
    barClass: 'bg-gold',
    dotClass: 'bg-gold',
  },
  UNSAFE: {
    label: 'High Risk — Avoid',
    shortLabel: 'Unsafe',
    icon: '✕',
    bannerClass: 'bg-chili/10 border-chili/20 text-chili',
    badgeClass: 'bg-chili/10 text-chili border-chili/20',
    scoreClass: 'text-chili',
    barClass: 'bg-chili',
    dotClass: 'bg-chili',
  },
  CRITICAL: {
    label: 'Critical — Stop Use Immediately',
    shortLabel: 'Critical',
    icon: '✕',
    bannerClass: 'bg-chili/15 border-chili/30 text-chili',
    badgeClass: 'bg-chili/15 text-chili border-chili/30',
    scoreClass: 'text-chili',
    barClass: 'bg-chili',
    dotClass: 'bg-chili',
  },
}

export function normalizeRisk(level) {
  const raw = String(level || '').toUpperCase()
  const map = { LOW: 'SAFE', SAFE: 'SAFE', MEDIUM: 'MODERATE', MODERATE: 'MODERATE', HIGH: 'UNSAFE', UNSAFE: 'UNSAFE', CRITICAL: 'CRITICAL' }
  return map[raw] || 'MODERATE'
}

export function getRiskConfig(level) {
  return RISK_CONFIG[normalizeRisk(level)] ?? RISK_CONFIG.MODERATE
}
