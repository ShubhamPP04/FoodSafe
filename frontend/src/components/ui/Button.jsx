/* high-end-visual-design · Button-in-Button architecture · SafeThali
 * Pill-shaped · haptic press · nested trailing icon · fluid bezier
 */
import { Loader2, Check, AlertCircle } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-brand text-accent-ink shadow-[0_2px_8px_rgba(0,191,165,0.2)] hover:bg-brand-dark hover:shadow-lift active:scale-[0.97]',
  secondary:
    'bg-paper-3 text-ink shadow-card hover:bg-paper-4 active:scale-[0.97]',
  ghost:
    'bg-transparent text-ink-2 hover:bg-paper-3 hover:text-ink active:scale-[0.97]',
  danger:
    'bg-chili text-white hover:bg-red-600 active:scale-[0.97]',
}

const SIZES = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[14px] gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2.5',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  state,
  onClick,
  type = 'button',
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading
  const forced = state === 'error' || state === 'success' ? state : null
  const stateClasses =
    forced === 'error'
      ? 'bg-chili text-white'
      : forced === 'success'
        ? 'bg-emerald-600 text-white'
        : VARIANTS[variant] || VARIANTS.primary

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      className={[
        'inline-flex items-center justify-center font-bold font-sans select-none whitespace-nowrap rounded-full',
        'transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:scale-100',
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
      <span className={`inline-flex items-center gap-[inherit] whitespace-nowrap ${loading ? 'opacity-90' : ''}`}>{children}</span>
    </button>
  )
}
