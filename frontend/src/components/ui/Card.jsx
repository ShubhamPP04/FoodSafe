/* Hallmark · component: card · genre: modern-minimal · theme: SafeThali
 * states: default · hover (interactive) · focus-within · active · disabled
 */
/**
 * Surface container. Prefer for interactive lists / form panels.
 * Non-interactive by default — pass onClick or href-like role only when needed.
 */
export default function Card({
  children,
  className = '',
  onClick,
  padding = 'md',
  interactive = false,
}) {
  const pad =
    padding === 'none' ? '' :
    padding === 'sm' ? 'p-3' :
    padding === 'lg' ? 'p-6' :
    'p-4'

  const clickable = Boolean(onClick) || interactive

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) } } : undefined}
      className={[
        'bg-paper border border-rule rounded-xl shadow-sm font-sans text-ink',
        pad,
        clickable
          ? 'cursor-pointer transition-colors duration-150 hover:border-rule-2 hover:bg-paper-2 active:bg-paper-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
