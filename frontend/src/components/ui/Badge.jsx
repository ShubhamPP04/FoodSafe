/* high-end-visual-design · component: badge · SafeThali */
import { getRiskConfig, normalizeRisk } from '../../utils/risk'

export default function Badge({ risk, label, size = 'md', className = '' }) {
  const level = normalizeRisk(risk)
  const config = getRiskConfig(level)

  const sizeClass =
    size === 'sm'
      ? 'text-[10px] px-2.5 py-0.5 gap-1'
      : 'text-[12px] px-3 py-1 gap-1.5'

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-semibold font-sans border',
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
