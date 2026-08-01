import { useEffect, useState } from 'react'

const MESSAGES = {
  en: ['Checking FSSAI violation records', 'Analysing adulterant risk', 'Running seasonal risk model', 'Preparing your safety report'],
  hi: ['FSSAI रिकॉर्ड जांच रहे हैं', 'मिलावट जोखिम विश्लेषण', 'मौसमी जोखिम मॉडल चला रहे हैं', 'सुरक्षा रिपोर्ट तैयार हो रही है'],
}

export default function ScanLoader({ food = '', lang = 'en' }) {
  const messages = MESSAGES[lang] || MESSAGES.en
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 900)
    let p = 0
    const progTimer = setInterval(() => { p = Math.min(p + Math.random() * 8 + 3, 95); setProgress(Math.round(p)) }, 200)
    return () => { clearInterval(msgTimer); clearInterval(progTimer) }
  }, [messages.length])

  return (
    <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center p-6 bg-canvas/95 backdrop-blur-md">
      <div className="relative w-14 h-14 mb-7">
        <div className="absolute inset-0 rounded-full border-2 border-brand/30" />
        <div className="absolute inset-1.5 rounded-full bg-brand text-white flex items-center justify-center shadow-glow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
      </div>
      <p className="font-display text-[22px] font-extrabold tracking-tight text-ink mb-1.5 text-center">{food ? `Scanning ${food}` : 'Scanning'}</p>
      <p key={msgIdx} className="font-sans text-[14px] text-ink-2 mb-7 text-center min-h-[20px] fade-up font-medium">{messages[msgIdx]}</p>
      <div className="w-[min(280px,80vw)] h-1.5 rounded-full bg-paper-3 overflow-hidden">
        <div className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2.5 font-mono text-[12px] text-ink-3 tabular-nums font-bold">{progress}%</p>
    </div>
  )
}
