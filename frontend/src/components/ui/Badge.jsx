/* Hallmark · component: badge · genre: modern-minimal · theme: SafeThali */
import { getRiskConfig, normalizeRisk } from '../../utils/risk'

/**
 * Risk / status pill. Accepts SAFE|MODERATE|UNSAFE|CRITICAL
 * or scan-style LOW|MEDIUM|HIGH|CRITICAL.
 */
export default function Badge({ risk, label, size = 'md', className = '' }) {
  const level = normalizeRisk(risk)
  const config = getRiskConfig(level)

  const sizeClass =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 gap-1'
      : 'text-[12px] px-2.5 py-1 gap-1.5'

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium font-sans border',
        sizeClass,
        config.badgeClass,
        className,
      ].join(' ')}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} aria-hidden />
      {label ?? config.shortLabel}
    </span>
  )
}
