/**
 * ScanLoader — Forest calm progress overlay while food is analysed.
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
  mr: [
    'FSSAI नोंदी तपासत आहोत…',
    'भेसळ जोखीम विश्लेषण…',
    'हंगामी जोखीम मॉडेल चालवत आहोत…',
    'सुरक्षा अहवाल तयार होत आहे…',
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
        background: 'oklch(97.2% 0.006 150 / 0.94)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'oklch(52% 0.13 155)',
          color: 'oklch(98% 0.004 150)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>

      {food ? (
        <div
          style={{
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'oklch(22% 0.035 155)',
            marginBottom: 10,
            textAlign: 'center',
          }}
        >
          {food}
        </div>
      ) : null}

      <div
        key={msgIdx}
        style={{
          fontFamily: '"Outfit", system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 500,
          color: 'oklch(38% 0.025 155)',
          minHeight: 22,
          marginBottom: 28,
          textAlign: 'center',
        }}
      >
        {messages[msgIdx]}
      </div>

      <div
        style={{
          width: 220,
          height: 4,
          background: 'oklch(91% 0.010 150)',
          borderRadius: 99,
          overflow: 'hidden',
          border: '1px solid oklch(88% 0.008 150)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'oklch(52% 0.13 155)',
            borderRadius: 99,
            transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      <div
        style={{
          marginTop: 12,
          fontFamily: '"DM Mono", monospace',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'oklch(52% 0.018 155)',
        }}
      >
        {progress}%
      </div>
    </div>
  )
}
