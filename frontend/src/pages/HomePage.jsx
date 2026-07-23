import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { scanFoodAPI, scanImageAPI, scanCombinationAPI } from '../services/api'
import ScanLoader from '../components/ScanLoader'
import { Camera, Image as ImageIcon, Mic, Search as SearchIcon, X, Sparkles, HeartPulse, MapPin, ShieldCheck, Plus, CheckCircle2 } from 'lucide-react'

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
  const LANG_MAP = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }

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
    <div className="flex flex-col gap-6 fade-up">
      {loading && <ScanLoader food={query.trim()} lang={lang} />}

      {cameraOpen && (
        <div className="fixed inset-0 bg-ink/90 backdrop-blur-xl z-[999] flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-[20px] overflow-hidden border border-rule shadow-2xl bg-ink">
            <video ref={cameraRef} autoPlay playsInline className="w-full h-[60vh] object-cover" />
            <div className="absolute inset-0 border-2 border-brand/40 rounded-[16px] pointer-events-none m-4" />
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-ink/90 to-transparent flex justify-center gap-4">
              <button onClick={stopCamera} className="w-14 h-14 rounded-full bg-paper-2 border border-rule flex items-center justify-center text-ink-2 hover:bg-paper-3 hover:text-ink transition-colors">
                <X className="w-6 h-6" />
              </button>
              <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-brand flex items-center justify-center border-4 border-paper shadow-[0_1px_2px_oklch(22%_0.03_155/0.2)]">
                <div className="w-12 h-12 rounded-full border-2 border-ink/20" />
              </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <div className="relative p-6 md:p-7 rounded-[20px] bg-paper-2 border border-rule overflow-hidden mt-1">
        <div className="relative z-10 flex flex-col gap-5">
          <div>
            <h2 className="font-sans text-3xl md:text-4xl text-ink font-semibold tracking-tight mb-2">What&apos;s in your food?</h2>
            <p className="font-sans text-[13px] md:text-sm text-ink-2">{t(lang, 'placeholder') || 'Search paneer, spices, or ingredients...'}</p>
          </div>

          <div className="relative group w-full">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3 group-focus-within:text-brand transition-colors" />
            <input
              className="w-full bg-paper border border-rule rounded-[14px] py-4 pl-12 pr-12 text-sm text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 transition-all"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="E.g. Turmeric powder, Amul Milk..."
            />
            {query && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-ink/5 text-ink-2 hover:bg-ink/10 hover:text-ink transition-colors"
                onClick={() => setQuery('')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-3 h-[72px]">
            <button
              className="flex-1 rounded-[14px] border border-rule bg-paper flex flex-col items-center justify-center gap-1.5 hover:bg-paper-3 hover:border-rule-2 transition-all hover:-translate-y-0.5 group"
              onClick={() => fileRef.current.click()}
            >
              <ImageIcon className="w-5 h-5 text-ink-2 group-hover:text-brand transition-colors" />
              <span className="text-[11px] font-medium text-ink-2 group-hover:text-ink">{t(lang, 'uploadBtn')}</span>
            </button>
            <button
              className="flex-1 rounded-[14px] border border-rule bg-paper flex flex-col items-center justify-center gap-1.5 hover:bg-paper-3 hover:border-rule-2 transition-all hover:-translate-y-0.5 group"
              onClick={openCamera}
            >
              <Camera className="w-5 h-5 text-ink-2 group-hover:text-brand transition-colors" />
              <span className="text-[11px] font-medium text-ink-2 group-hover:text-ink">{t(lang, 'cameraBtn')}</span>
            </button>
            <button
              className={`flex-1 rounded-[14px] border transition-all hover:-translate-y-0.5 group flex flex-col items-center justify-center gap-1.5
                ${listening ? 'bg-chili/10 border-chili/30' : 'bg-paper border-rule hover:bg-paper-3 hover:border-rule-2'}`}
              onClick={toggleVoice}
            >
              <Mic className={`w-5 h-5 transition-colors ${listening ? 'text-chili animate-pulse' : 'text-ink-2 group-hover:text-brand'}`} />
              <span className={`text-[11px] font-medium ${listening ? 'text-chili' : 'text-ink-2 group-hover:text-ink'}`}>
                {listening ? 'Listening...' : t(lang, 'voiceInput')}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {error && (
            <div className="p-3 bg-chili/10 border border-chili/30 rounded-[10px] flex items-center gap-3 text-[12px] text-chili">
              <div className="w-1.5 h-1.5 rounded-full bg-chili" />
              {error}
            </div>
          )}

          <button
            className={`w-full py-4 rounded-[14px] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2
              ${query.trim()
                ? 'btn-safe !rounded-[14px] !py-4'
                : 'bg-paper text-ink-3 border border-rule cursor-not-allowed'}`}
            onClick={handleScan}
            disabled={loading || !query.trim()}
          >
            <SearchIcon className="w-4 h-4" />
            {t(lang, 'scanNow') || 'Analyze Food Safety'}
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[16px] bg-paper border border-rule p-4 flex gap-4 items-center">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-chili/10 border border-chili/30 shrink-0">
          <div className="w-2 h-2 rounded-full bg-chili" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-chili font-mono">{t(lang, 'fssaiAlert')}</span>
            <span className="text-[10px] text-ink-3">{ticker % fssaiAlerts.length + 1}/{fssaiAlerts.length}</span>
          </div>
          <p className="text-[12px] text-ink font-medium truncate" key={ticker}>
            {currentAlert}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.12em] mb-3 pl-1 font-mono">{t(lang, 'quickActions')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Sparkles, color: 'text-ochre', bg: 'bg-ochre/10', border: 'group-hover:border-ochre/30', title: 'festivalGuide', sub: 'festivalGuideSub', to: '/festival' },
            { icon: HeartPulse, color: 'text-brand', bg: 'bg-brand/10', border: 'group-hover:border-brand/30', title: 'symptomCheck', sub: 'symptomCheckSub', to: '/symptoms' },
            { icon: MapPin, color: 'text-brand', bg: 'bg-brand/10', border: 'group-hover:border-brand/30', title: 'foodSafetyMap', sub: 'foodSafetyMapSub', to: '/map' },
          ].map(({ icon: Icon, color, bg, border, title, sub, to }) => (
            <button key={to} onClick={() => nav(to)} className={`p-4 rounded-[14px] bg-paper border border-rule flex flex-col gap-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-paper-2 group ${border}`}>
              <div className={`w-9 h-9 rounded-[10px] ${bg} flex items-center justify-center`}>
                <Icon className={`w-[18px] h-[18px] ${color}`} />
              </div>
              <div className="space-y-0.5">
                <div className="text-[13px] font-semibold text-ink">{t(lang, title)}</div>
                <div className="text-[10px] text-ink-3 leading-snug">{t(lang, sub)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.12em] mb-3 pl-1 font-mono">{t(lang, 'combinationRisk') || 'Combination Analysis'}</h3>
        <div className="p-5 rounded-[16px] bg-paper border border-rule">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand" />
                <h4 className="text-[13px] font-semibold text-ink">Meal Safety Stack</h4>
              </div>
              <p className="text-[11px] text-ink-3 mt-1">{t(lang, 'combinationSub')}</p>
            </div>
            {combinationFoods.length > 0 && (
              <button className="text-[10px] font-semibold text-chili bg-chili/10 px-2.5 py-1 rounded-md hover:bg-chili/20 transition-colors" onClick={clearCombination}>
                {t(lang, 'clear')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {combinationFoods.map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-brand/10 border border-brand/20 text-brand text-[11px] font-semibold px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                {f}
              </span>
            ))}
            <button
              className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-3 border border-dashed border-rule px-3 py-1.5 rounded-full hover:border-brand/40 hover:text-ink transition-colors"
              onClick={() => { if (query.trim()) { addCombinationFood(query.trim()); setQuery('') } }}
            >
              <Plus className="w-3 h-3" />
              {t(lang, 'addFood') || 'Add to Stack'}
            </button>
          </div>
        </div>
      </div>

      {family.length > 0 && (
        <div className="mb-8">
          <h3 className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.12em] mb-3 pl-1 font-mono">{t(lang, 'scanFor')}</h3>
          <div className="p-4 rounded-[16px] bg-paper border border-rule flex flex-wrap gap-2">
            {family.map(m => {
              const active = activeMember?.id === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMember(active ? null : m)}
                  className={`
                    flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all duration-200
                    ${active
                      ? 'bg-brand text-accent-ink border-brand font-semibold'
                      : 'bg-paper-2 border-rule text-ink-2 hover:text-ink hover:bg-paper-3 font-medium'}
                  `}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold
                    ${active ? 'bg-accent-ink/20 text-accent-ink' : 'bg-paper-3 text-ink-2'}`}>
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[12px]">{m.name}</span>
                  {m.conditions?.length > 0 && <HeartPulse className={`w-3 h-3 ${active ? 'text-accent-ink/80' : 'text-chili'}`} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}