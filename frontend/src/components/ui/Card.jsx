/* high-end-visual-design · Double-bezel Card · SafeThali
 * Outer shell + inner core = physical machined hardware feel
 */
export default function Card({
  children,
  className = '',
  onClick,
  padding = 'md',
  interactive = false,
  bezel = false,
}) {
  const pad =
    padding === 'none' ? '' :
    padding === 'sm' ? 'p-4' :
    padding === 'lg' ? 'p-8' :
    'p-6'

  const clickable = Boolean(onClick) || interactive

  if (bezel) {
    return (
      <div
        className={[
          'bg-paper-3 rounded-[2rem] p-1.5 shadow-bezel',
          clickable ? 'cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lift active:scale-[0.99]' : '',
          className,
        ].filter(Boolean).join(' ')}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <div className={`bg-paper rounded-[1.625rem] shadow-inner ${pad}`}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) } } : undefined}
      className={[
        'bg-paper border border-rule rounded-2xl font-sans text-ink shadow-card',
        'transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]',
        pad,
        clickable
          ? 'cursor-pointer hover:-translate-y-1 hover:shadow-soft active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'
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
