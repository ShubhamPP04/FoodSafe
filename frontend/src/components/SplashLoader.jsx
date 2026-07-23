/**
 * FoodSafe SplashLoader — Forest calm.
 * Cool bone, Outfit wordmark, emerald mark.
 */
import { useEffect, useState } from 'react'

export default function SplashLoader({ onDone }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1100)
    const t2 = setTimeout(() => onDone?.(), 1450)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'oklch(97.2% 0.006 150)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        opacity: leaving ? 0 : 1,
        transition: 'opacity 320ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'oklch(52% 0.13 155)',
          color: 'oklch(98% 0.004 150)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'splashIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <div
        style={{
          fontFamily: '"Outfit", "Noto Sans Devanagari", system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 26,
          letterSpacing: '-0.03em',
          color: 'oklch(22% 0.035 155)',
          animation: 'splashIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both',
        }}
      >
        FoodSafe
      </div>
      <style>{`
        @keyframes splashIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
