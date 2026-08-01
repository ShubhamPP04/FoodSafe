import { useEffect, useState } from 'react'

export default function SplashLoader({ onDone }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1100)
    const t2 = setTimeout(() => onDone?.(), 1450)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-[9999] bg-canvas flex flex-col items-center justify-center gap-4 transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1, pointerEvents: leaving ? 'none' : 'auto' }}>
      <div className="relative w-13 h-13">
        <div className="absolute inset-0 rounded-full border-2 border-brand/35" />
        <div className="absolute inset-1.5 rounded-full bg-brand text-white flex items-center justify-center shadow-glow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
      </div>
      <div className="font-display font-extrabold text-[26px] tracking-[-0.03em] text-ink">SafeThali</div>
    </div>
  )
}
