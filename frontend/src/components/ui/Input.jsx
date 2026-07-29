/* Hallmark · component: input · genre: modern-minimal · theme: SafeThali
 * states: default · hover · focus · disabled · error · success
 */
import { forwardRef } from 'react'
import { AlertCircle, Check } from 'lucide-react'

/**
 * Text field with label, hint, error/success, and optional left/right adornments.
 */
const Input = forwardRef(function Input(
  {
    label,
    placeholder,
    value,
    onChange,
    onKeyDown,
    type = 'text',
    error,
    success,
    hint,
    left,
    right,
    disabled = false,
    className = '',
    id,
    name,
    autoComplete,
  },
  ref
) {
  const fieldId = id || name || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)
  const hasError = Boolean(error)
  const hasSuccess = Boolean(success) && !hasError

  return (
    <div className={`flex flex-col gap-1.5 font-sans ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="text-[13px] font-medium text-ink">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {left && (
          <div className="absolute left-3 flex items-center text-ink-3 pointer-events-none [&_svg]:w-4 [&_svg]:h-4">
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
          aria-describedby={
            hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
          }
          className={[
            'w-full h-11 text-[14px] text-ink bg-paper font-sans',
            'border rounded-lg placeholder:text-ink-3',
            'transition-[border-color,box-shadow,background-color] duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-paper-2',
            'hover:border-rule-2',
            left ? 'pl-10' : 'pl-3.5',
            right || hasError || hasSuccess ? 'pr-10' : 'pr-3.5',
            hasError
              ? 'border-chili focus-visible:ring-chili'
              : hasSuccess
                ? 'border-emerald-500 focus-visible:ring-emerald-500'
                : 'border-rule focus-visible:border-brand',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {(right || hasError || hasSuccess) && (
          <div className="absolute right-3 flex items-center gap-1 text-ink-3">
            {hasError && <AlertCircle className="w-4 h-4 text-chili" aria-hidden />}
            {hasSuccess && <Check className="w-4 h-4 text-emerald-600" aria-hidden />}
            {!hasError && !hasSuccess && right}
          </div>
        )}
      </div>

      {hasError && (
        <p id={`${fieldId}-error`} className="text-[12px] text-chili flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
      {!hasError && hint && (
        <p id={`${fieldId}-hint`} className="text-[12px] text-ink-3">
          {hint}
        </p>
      )}
      {!hasError && hasSuccess && typeof success === 'string' && (
        <p className="text-[12px] text-emerald-700">{success}</p>
      )}
    </div>
  )
})

export default Input
