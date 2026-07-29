/**
 * SafeThali SplashLoader — warm kitchen.
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
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        opacity: leaving ? 0 : 1,
        transition: 'opacity 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div style={{ position: 'relative', width: 52, height: 52 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '999px', border: '2px solid rgba(74,144,217,0.35)' }} />
        <div
          style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '999px',
            background: '#4a90d9',
            color: '#fffaf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'splashIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
      </div>
      <div
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontWeight: 600,
          fontSize: 26,
          letterSpacing: '-0.03em',
          color: '#1c1917',
          animation: 'splashIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.06s both',
        }}
      >
        SafeThali
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
