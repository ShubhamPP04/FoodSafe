/**
 * ScanLoader — warm kitchen progress overlay while food is analysed.
 */
import { useEffect, useState } from 'react'

const MESSAGES = {
  en: [
    'Checking FSSAI violation records…',
    'Analysing adulterant risk…',
    'Running seasonal risk model…',
    'Preparing your safety report…',
  ],
  hi: [
    'FSSAI रिकॉर्ड जांच रहे हैं…',
    'मिलावट जोखिम विश्लेषण…',
    'मौसमी जोखिम मॉडल चला रहे हैं…',
    'सुरक्षा रिपोर्ट तैयार हो रही है…',
  ],
}

export default function ScanLoader({ food = '', lang = 'en' }) {
  const messages = MESSAGES[lang] || MESSAGES.en
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx(i => (i + 1) % messages.length)
    }, 900)

    let p = 0
    const progTimer = setInterval(() => {
      p += Math.random() * 4 + 1
      if (p > 88) p = 88
      setProgress(Math.round(p))
    }, 200)

    return () => { clearInterval(msgTimer); clearInterval(progTimer) }
  }, [messages.length])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(248, 250, 252, 0.94)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: 24,
      }}
    >
      <div style={{ position: 'relative', width: 56, height: 56, marginBottom: 28 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '999px',
            border: '2px solid rgba(74,144,217,0.3)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 6,
            borderRadius: '999px',
            background: '#4a90d9',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
      </div>

      <p
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: '-0.02em',
          color: '#1c1917',
          marginBottom: 6,
          textAlign: 'center',
        }}
      >
        {food ? `Scanning ${food}` : 'Scanning…'}
      </p>
      <p
        key={msgIdx}
        style={{
          fontFamily: '"Source Sans 3", system-ui, sans-serif',
          fontSize: 14,
          color: '#57534e',
          marginBottom: 28,
          textAlign: 'center',
          minHeight: 20,
        }}
      >
        {messages[msgIdx]}
      </p>

      <div
        style={{
          width: 'min(280px, 80vw)',
          height: 4,
          borderRadius: 999,
          background: '#e3e7ed',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#4a90d9',
            borderRadius: 999,
            transition: 'width 200ms ease-out',
          }}
        />
      </div>
      <p
        style={{
          marginTop: 10,
          fontFamily: '"Source Sans 3", system-ui, sans-serif',
          fontSize: 12,
          color: '#a8a29e',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {progress}%
      </p>
    </div>
  )
}
