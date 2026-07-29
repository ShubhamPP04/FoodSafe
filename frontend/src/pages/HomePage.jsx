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
  const [listening, setListening]   = useState(false)

  const fileRef   = useRef()
  const cameraRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef()
  const recognitionRef = useRef(null)

  // ── Voice input ───────────────────────────────────────────────
  const LANG_MAP = { en: 'en-IN', hi: 'hi-IN' }

  function toggleVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Voice input not supported in this browser')
      return
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = LANG_MAP[lang] || 'en-IN'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      setQuery(event.results[0][0].transcript)
      setListening(false)
    }
    recognition.onerror = (e) => { setListening(false); setError(`Voice error: ${e.error}`) }
    recognition.onend   = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t + 1), 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/fssai/alerts')
      .then(r => r.json())
      .then(data => { if (data.alerts?.length > 0) setFssaiAlerts(data.alerts.map(a => a.title)) })
      .catch(() => {})
  }, [])

  // ── Camera ────────────────────────────────────────────────────
  async function openCamera() {
    setCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (cameraRef.current) cameraRef.current.srcObject = stream
    } catch {
      setCameraOpen(false)
      setError('Camera access denied')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraOpen(false)
  }

  async function capturePhoto() {
    const video  = cameraRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopCamera()
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
      await handleImageUpload({ target: { files: [file] } })
    }, 'image/jpeg', 0.9)
  }

  // ── Text / combination scan ───────────────────────────────────
  async function handleScan() {
    const foodName = query.trim()
    if (!foodName) return
    setLoading(true)
    setError('')
    try {
      const profile = activeMember || null
      let result
      if (combinationFoods.length > 0) {
        result = await scanCombinationAPI({
          foods: [...combinationFoods, foodName],
          member_profile: profile,
          lang,
        })
        result.isCombination = true
      } else {
        result = await scanFoodAPI({ food_name: foodName, member_profile: profile, lang })
      }
      addScan({ food_name: foodName, risk_level: result.riskLevel, safety_score: result.safetyScore })
      setLastResult(result)
      nav('/result')
    } catch {
      setError('Scan failed. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Image upload (FIXED) ──────────────────────────────────────
  // FIX 1: Removed broken `analyzeLabel` import and fallback — it didn't exist.
  // FIX 2: Use `scanImageAPI` from api.js (handles multipart/form-data correctly).
  // FIX 3: Removed the early-return bug that left loading=true forever on error.
  // FIX 4: Validate file type and size on the frontend before sending.
  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset file input so the same file can be re-selected if needed
    if (e.target.value !== undefined) e.target.value = ''

    // Client-side validation (mirrors backend limits)
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 5MB.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('lang', lang)

      // scanImageAPI already sets Content-Type: multipart/form-data via axios
      const result = await scanImageAPI(formData)

      const foodName = result.foodName || result.food_name || result.productName || 'Image scan'
      addScan({
        food_name:    foodName,
        risk_level:   result.riskLevel,
        safety_score: result.safetyScore,
      })
      setLastResult(result)
      nav('/result')
    } catch (err) {
      // Show a meaningful error instead of silently failing
      const status = err?.response?.status
      if (status === 413) {
        setError('Image is too large. Please use a smaller photo.')
      } else if (status === 400) {
        setError('Unsupported image format. Please use JPEG, PNG, or WebP.')
      } else {
        setError('Image analysis failed. Please try again or type the food name instead.')
      }
    } finally {
      // FIX 3: This now always runs — no more infinite spinner
      setLoading(false)
    }
  }

  const currentAlert = fssaiAlerts[ticker % fssaiAlerts.length]

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto w-full">
      {loading && <ScanLoader food={query.trim()} lang={lang} />}

      {cameraOpen && (
        <div className="fixed inset-0 bg-ink/90 z-[999] flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md overflow-hidden bg-ink">
            <video ref={cameraRef} autoPlay playsInline className="w-full h-[55vh] object-cover" />
            <div className="absolute bottom-0 inset-x-0 p-5 flex justify-center gap-4 bg-gradient-to-t from-ink/90 to-transparent">
              <button type="button" onClick={stopCamera} className="w-12 h-12 rounded-full bg-white/15 text-accent-ink flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
              <button type="button" onClick={capturePhoto} aria-label="Capture" className="w-14 h-14 rounded-full bg-brand border-4 border-white/25" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <header>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          {t(lang, 'scan') || 'Scan food'}
        </h1>
        <p className="mt-1 text-[14px] text-ink-2">{t(lang, 'placeholder')}</p>
      </header>

      {/* One scan surface */}
      <section className="rounded-2xl border border-rule bg-paper shadow-soft overflow-hidden">
        <div className="p-3 sm:p-3.5">
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1 min-w-0">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
              <input
                className="w-full h-11 bg-paper-2 border border-rule rounded-xl pl-9 pr-9 text-[14px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder="Turmeric, Amul milk, mustard oil…"
              />
              {query && (
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink" onClick={() => setQuery('')}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleScan}
              disabled={loading || !query.trim()}
              loading={loading}
              className="shrink-0 h-11 !rounded-xl px-4 shadow-none"
            >
              {t(lang, 'scanNow') || 'Scan'}
            </Button>
          </div>

          <div className="mt-2.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium leading-none text-ink-2 hover:bg-paper-2 hover:text-ink transition-colors"
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'uploadBtn')}</span>
            </button>
            <button
              type="button"
              onClick={openCamera}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium leading-none text-ink-2 hover:bg-paper-2 hover:text-ink transition-colors"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>{t(lang, 'cameraBtn')}</span>
            </button>
            <button
              type="button"
              onClick={toggleVoice}
              className={`inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium leading-none transition-colors ${
                listening ? 'text-chili bg-red-50' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
              }`}
            >
              <Mic className={`w-4 h-4 shrink-0 ${listening ? 'animate-pulse' : ''}`} />
              <span>{listening ? 'Listening…' : t(lang, 'voiceInput')}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>

        {error && (
          <div className="px-3.5 pb-3">
            <p className="text-[13px] text-chili bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">{error}</p>
          </div>
        )}
      </section>

      <aside className="rounded-xl bg-red-50/70 border border-red-100 px-3.5 py-3">
        <p className="text-[11px] font-semibold text-chili tracking-[0.06em] uppercase">{t(lang, 'fssaiAlert')}</p>
        <p className="text-[13px] text-ink mt-1 leading-snug" key={ticker}>{currentAlert}</p>
      </aside>

      <section>
        <h2 className="text-[13px] font-semibold text-ink-3 tracking-wide uppercase mb-2">
          {t(lang, 'quickActions')}
        </h2>
        <ul className="rounded-2xl border border-rule bg-paper divide-y divide-rule overflow-hidden">
          {[
            { icon: Sparkles, title: 'festivalGuide', sub: 'festivalGuideSub', to: '/festival' },
            { icon: HeartPulse, title: 'symptomCheck', sub: 'symptomCheckSub', to: '/symptoms' },
            { icon: MapPin, title: 'foodSafetyMap', sub: 'foodSafetyMapSub', to: '/map' },
          ].map(({ icon: Icon, title, sub, to }) => (
            <li key={to}>
              <button
                type="button"
                onClick={() => nav(to)}
                className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-paper-2 transition-colors"
              >
                <Icon className="w-4 h-4 text-ink-3 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{t(lang, title)}</span>
                  <span className="block text-[12px] text-ink-3">{t(lang, sub)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-rule bg-paper px-3.5 py-3.5">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div>
            <h2 className="text-[14px] font-semibold text-ink flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand" />
              {t(lang, 'combinationRisk')}
            </h2>
            <p className="text-[12px] text-ink-3 mt-0.5">{t(lang, 'combinationSub')}</p>
          </div>
          {combinationFoods.length > 0 && (
            <button type="button" className="text-[12px] font-medium text-chili shrink-0" onClick={clearCombination}>
              {t(lang, 'clear')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {combinationFoods.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-paper-2 text-ink text-[12px] font-medium px-2 py-1 rounded-md border border-rule">
              <CheckCircle2 className="w-3 h-3 text-brand" /> {f}
            </span>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-3 border border-dashed border-rule px-2 py-1 rounded-md hover:border-brand hover:text-brand"
            onClick={() => { if (query.trim()) { addCombinationFood(query.trim()); setQuery('') } }}
          >
            <Plus className="w-3 h-3" /> {t(lang, 'addFood')}
          </button>
        </div>
      </section>

      {family.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold text-ink-3 tracking-wide uppercase mb-2">{t(lang, 'scanFor')}</h2>
          <div className="flex flex-wrap gap-2">
            {family.map(m => {
              const active = activeMember?.id === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMember(active ? null : m)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors ${
                    active ? 'bg-brand text-accent-ink border-brand' : 'bg-paper border-rule text-ink-2 hover:border-brand/40'
                  }`}
                >
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
