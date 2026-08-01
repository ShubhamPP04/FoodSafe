/* high-end-visual-design · Input · SafeThali
 * Pill-shaped · soft fill · diffused focus glow
 */
import { forwardRef } from 'react'
import { AlertCircle, Check } from 'lucide-react'

const Input = forwardRef(function Input(
  {
    label, placeholder, value, onChange, onKeyDown,
    type = 'text', error, success, hint, left, right,
    disabled = false, className = '', id, name, autoComplete,
  },
  ref
) {
  const fieldId = id || name || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const hasError = Boolean(error)
  const hasSuccess = Boolean(success) && !hasError

  return (
    <div className={`flex flex-col gap-2 font-sans ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="text-[13px] font-bold text-ink tracking-tight">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {left && (
          <div className="absolute left-4 flex items-center text-ink-3 pointer-events-none [&_svg]:w-4 [&_svg]:h-4">
            {left}
          </div>
        )}
        <input
          ref={ref}
          id={fieldId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={[
            'w-full h-12 text-[14px] text-ink bg-paper-2 font-sans',
            'border border-rule rounded-full placeholder:text-ink-3',
            'transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]',
            'focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            left ? 'pl-11' : 'pl-4',
            right || hasError || hasSuccess ? 'pr-11' : 'pr-4',
            hasError
              ? 'border-chili focus:border-chili focus:ring-chili/10'
              : hasSuccess
                ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/10'
                : '',
          ].filter(Boolean).join(' ')}
        />
        {(right || hasError || hasSuccess) && (
          <div className="absolute right-4 flex items-center gap-1 text-ink-3">
            {hasError && <AlertCircle className="w-4 h-4 text-chili" aria-hidden />}
            {hasSuccess && <Check className="w-4 h-4 text-emerald-600" aria-hidden />}
            {!hasError && !hasSuccess && right}
          </div>
        )}
      </div>
      {hasError && (
        <p id={`${fieldId}-error`} className="text-[12px] text-chili flex items-center gap-1" role="alert">{error}</p>
      )}
      {!hasError && hint && <p id={`${fieldId}-hint`} className="text-[12px] text-ink-3">{hint}</p>}
      {!hasError && hasSuccess && typeof success === 'string' && <p className="text-[12px] text-emerald-700">{success}</p>}
    </div>
  )
})

export default Input
