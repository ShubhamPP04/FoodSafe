/* Hallmark · component: button · genre: modern-minimal · theme: SafeThali
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass
 */
import { Loader2, Check, AlertCircle } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-brand text-accent-ink border border-brand shadow-[0_1px_2px_rgba(37,99,235,0.15)] hover:bg-brand-dark hover:shadow-lift hover:-translate-y-px active:translate-y-0 active:bg-brand-dark active:shadow-none',
  secondary:
    'bg-paper text-ink border border-rule hover:bg-paper-2 hover:border-rule-2 active:translate-y-px active:bg-paper-3',
  ghost:
    'bg-transparent text-ink-2 border border-transparent hover:bg-paper-3 hover:text-ink active:bg-paper-4',
  danger:
    'bg-chili text-white border border-chili hover:bg-red-700 active:translate-y-px',
}

const SIZES = {
  sm: 'h-9 px-3.5 text-[13px] rounded-md gap-1.5',
  md: 'h-11 px-4 text-[14px] rounded-lg gap-2',
  lg: 'h-12 px-5 text-[15px] rounded-lg gap-2',
}

/**
 * SafeThali Button — turmeric primary, Source Sans 3, full interactive states.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  state, // 'error' | 'success' | undefined — forced visual state
  onClick,
  type = 'button',
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading
  const forced = state === 'error' || state === 'success' ? state : null

  const stateClasses =
    forced === 'error'
      ? 'bg-chili text-white border-chili'
      : forced === 'success'
        ? 'bg-emerald-600 text-white border-emerald-600'
        : VARIANTS[variant] || VARIANTS.primary

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      data-state={forced || (loading ? 'loading' : undefined)}
      className={[
        'inline-flex items-center justify-center font-medium font-sans select-none',
        'transition-[color,background-color,border-color,transform,box-shadow] duration-150 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:translate-y-0 disabled:hover:shadow-none',
        stateClasses,
        SIZES[size] || SIZES.md,
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />}
      {!loading && forced === 'success' && <Check className="w-4 h-4 shrink-0" aria-hidden />}
      {!loading && forced === 'error' && <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />}
      <span className={loading ? 'opacity-90' : ''}>{children}</span>
    </button>
  )
}
