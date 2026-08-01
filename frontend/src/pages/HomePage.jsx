import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { scanFoodAPI, scanImageAPI, scanCombinationAPI } from '../services/api'
import ScanLoader from '../components/ScanLoader'
import { Camera, Image as ImageIcon, Mic, Search as SearchIcon, X, Sparkles, HeartPulse, MapPin, ShieldCheck, Plus, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui'

const DEFAULT_ALERTS = [
  "MDH spices flagged for pesticide residue — Apr 2024",
  "Everest Fish Curry Masala recalled — ethylene oxide",
  "Loose turmeric samples fail lead chromate tests in Delhi",
  "83% paneer samples fail quality in UP cities — Feb 2024",
  "Honey adulteration with HFCS — NMR test recommended",
  "Argemone oil in mustard oil detected in Rajasthan",
  "Sudan Red dye found in chilli powder — Tamil Nadu",
  "Synthetic milk adulteration in Mawa/Khoya — Delhi",
]

export default function HomePage() {
  const { lang, family, activeMember, setActiveMember, addScan, setLastResult, combinationFoods, addCombinationFood, clearCombination } = useStore()
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticker, setTicker] = useState(0)
  const [fssaiAlerts, setFssaiAlerts] = useState(DEFAULT_ALERTS)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [listening, setListening] = useState(false)

  const fileRef = useRef()
  const cameraRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef()
  const recognitionRef = useRef(null)

  const LANG_MAP = { en: 'en-IN', hi: 'hi-IN' }

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Voice input not supported in this browser'); return }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const rec = new SR()
    rec.lang = LANG_MAP[lang] || 'en-IN'
    rec.interimResults = false
    rec.onresult = (e) => { setQuery(e.results[0][0].transcript); setListening(false) }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  useEffect(() => {
    if (!listening && recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTicker(i => i + 1), 4000)
    return () => clearInterval(id)
  }, [])

  async function openCamera() {
    setCameraOpen(true)
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (cameraRef.current) { cameraRef.current.srcObject = streamRef.current; cameraRef.current.play() }
    } catch { setError('Camera access denied'); setCameraOpen(false) }
  }

  function stopCamera() {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setCameraOpen(false)
  }

  async function capturePhoto() {
    if (!cameraRef.current || !canvasRef.current) return
    const v = cameraRef.current
    canvasRef.current.width = v.videoWidth
    canvasRef.current.height = v.videoHeight
    canvasRef.current.getContext('2d').drawImage(v, 0, 0)
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return
      stopCamera()
      setLoading(true); setError('')
      try {
        const fd = new FormData()
        fd.append('file', blob, 'capture.jpg')
        const result = await scanImageAPI(fd)
        addScan({ ...result, food_name: result.foodName || query.trim() || 'Image scan' })
        setLastResult(result)
        nav('/result')
      } catch (e) {
        setError(e?.response?.data?.detail || 'Scan failed. Please try again.')
      } finally { setLoading(false) }
    }, 'image/jpeg', 0.85)
  }

  async function handleScan() {
    if (!query.trim()) return
    setLoading(true); setError('')
    try {
      const foods = combinationFoods.length > 0 ? [query.trim(), ...combinationFoods] : [query.trim()]
      const result = foods.length > 1
        ? await scanCombinationAPI({ foods, member_profile: activeMember, lang })
        : await scanFoodAPI({ food_name: query.trim(), member_profile: activeMember, lang })
      addScan({ ...result, food_name: query.trim() })
      setLastResult(result)
      nav('/result')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Scan failed. Please try again.')
    } finally { setLoading(false) }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Use JPG, PNG, or WebP'); return }
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await scanImageAPI(fd)
      addScan({ ...result, food_name: result.foodName || file.name })
      setLastResult(result)
      nav('/result')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Image scan failed.')
    } finally { setLoading(false) }
  }

  const currentAlert = fssaiAlerts[ticker % fssaiAlerts.length]

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto w-full fade-up">
      {loading && <ScanLoader food={query.trim()} lang={lang} />}

      {cameraOpen && (
        <div className="fixed inset-0 bg-ink/95 z-[999] flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md overflow-hidden bg-ink rounded-2xl">
            <video ref={cameraRef} autoPlay playsInline className="w-full h-[55vh] object-cover" />
            <div className="absolute bottom-0 inset-x-0 p-5 flex justify-center gap-4 bg-gradient-to-t from-ink/95 to-transparent">
              <button type="button" onClick={stopCamera} className="w-12 h-12 rounded-full bg-white/15 text-accent-ink flex items-center justify-center transition-all hover:bg-white/25 active:scale-95">
                <X className="w-5 h-5" />
              </button>
              <button type="button" onClick={capturePhoto} aria-label="Capture" className="w-14 h-14 rounded-full bg-brand border-4 border-white/30 transition-all active:scale-95 shadow-glow" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <header>
        <span className="eyebrow"><SearchIcon className="w-3 h-3" /> Scan Food</span>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.03em] text-ink">
          {t(lang, 'scan') || 'Scan food'}
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-2 font-medium">{t(lang, 'placeholder')}</p>
      </header>

      {/* Scan surface — double-bezel */}
      <div className="bezel-shell">
        <div className="bezel-core p-4">
          <div className="flex items-stretch gap-2.5">
            <div className="relative flex-1 min-w-0">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
              <input
                className="w-full h-12 bg-paper-2 border border-rule rounded-full pl-11 pr-10 text-[14px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="Turmeric, Amul milk, mustard oil…"
              />
              {query && (
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink transition-colors" onClick={() => setQuery('')}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button onClick={handleScan} disabled={loading || !query.trim()} loading={loading} className="shrink-0 h-12 px-5">
              {t(lang, 'scanNow') || 'Scan'}
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <button type="button" onClick={() => fileRef.current.click()}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold text-ink-2 hover:bg-paper-3 hover:text-ink transition-all duration-400 active:scale-95">
              <ImageIcon className="w-4 h-4 shrink-0" /><span>{t(lang, 'uploadBtn')}</span>
            </button>
            <button type="button" onClick={openCamera}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold text-ink-2 hover:bg-paper-3 hover:text-ink transition-all duration-400 active:scale-95">
              <Camera className="w-4 h-4 shrink-0" /><span>{t(lang, 'cameraBtn')}</span>
            </button>
            <button type="button" onClick={toggleVoice}
              className={`inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-all duration-400 active:scale-95 ${
                listening ? 'text-chili bg-chili/10' : 'text-ink-2 hover:bg-paper-3 hover:text-ink'
              }`}>
              <Mic className={`w-4 h-4 shrink-0 ${listening ? 'animate-pulse' : ''}`} />
              <span>{listening ? 'Listening…' : t(lang, 'voiceInput')}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-[13px] text-chili bg-chili/10 border border-chili/20 rounded-full px-4 py-2 font-medium" role="alert">{error}</p>
      )}

      {/* FSSAI Alert — double-bezel */}
      <div className="bezel-shell">
        <div className="bezel-core px-4 py-3">
          <p className="text-[11px] font-bold text-chili tracking-[0.1em] uppercase">{t(lang, 'fssaiAlert')}</p>
          <p className="text-[13px] text-ink mt-1 leading-snug font-medium" key={ticker}>{currentAlert}</p>
        </div>
      </div>

      {/* Quick actions — bento */}
      <section>
        <h2 className="text-[13px] font-bold text-ink-3 tracking-[0.1em] uppercase mb-3">{t(lang, 'quickActions')}</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: Sparkles, title: 'festivalGuide', sub: 'festivalGuideSub', to: '/festival' },
            { icon: HeartPulse, title: 'symptomCheck', sub: 'symptomCheckSub', to: '/symptoms' },
            { icon: MapPin, title: 'foodSafetyMap', sub: 'foodSafetyMapSub', to: '/map' },
          ].map(({ icon: Icon, title, sub, to }, i) => (
            <button key={to} type="button" onClick={() => nav(to)}
              className={`bezel-shell text-left transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-lift active:scale-[0.98] fade-up-${i + 1}`}>
              <div className="bezel-core p-4 flex items-center gap-3.5">
                <span className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-ink">{t(lang, title)}</span>
                  <span className="block text-[12px] text-ink-3">{t(lang, sub)}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Combination risk — double-bezel */}
      <div className="bezel-shell">
        <div className="bezel-core px-4 py-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-[14px] font-bold text-ink flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand" />
                {t(lang, 'combinationRisk')}
              </h2>
              <p className="text-[12px] text-ink-3 mt-0.5">{t(lang, 'combinationSub')}</p>
            </div>
            {combinationFoods.length > 0 && (
              <button type="button" className="text-[12px] font-bold text-chili shrink-0 hover:text-red-600 transition-colors" onClick={clearCombination}>
                {t(lang, 'clear')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {combinationFoods.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-brand/10 text-brand text-[12px] font-bold px-3 py-1 rounded-full border border-brand/20">
                <CheckCircle2 className="w-3 h-3" /> {f}
              </span>
            ))}
            <button type="button"
              className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-3 border border-dashed border-rule px-3 py-1 rounded-full hover:border-brand hover:text-brand transition-all duration-400 active:scale-95"
              onClick={() => { if (query.trim()) { addCombinationFood(query.trim()); setQuery('') } }}>
              <Plus className="w-3 h-3" /> {t(lang, 'addFood')}
            </button>
          </div>
        </div>
      </div>

      {family.length > 0 && (
        <section>
          <h2 className="text-[13px] font-bold text-ink-3 tracking-[0.1em] uppercase mb-3">{t(lang, 'scanFor')}</h2>
          <div className="flex flex-wrap gap-2">
            {family.map(m => {
              const active = activeMember?.id === m.id
              return (
                <button key={m.id} type="button" onClick={() => setActiveMember(active ? null : m)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-[13px] font-bold transition-all duration-400 active:scale-95 ${
                    active ? 'bg-brand text-accent-ink border-brand shadow-glow' : 'bg-paper border-rule text-ink-2 hover:border-brand/40'
                  }`}>
                  <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center ${active ? 'bg-white/20' : 'bg-paper-3'}`}>
                    {m.name.slice(0, 2).toUpperCase()}
                  </span>
                  {m.name}
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
