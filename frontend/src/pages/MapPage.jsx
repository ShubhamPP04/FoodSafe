import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import {
  Map as MapIcon, Database, AlertCircle, AlertOctagon,
  MapPin, Search, ChevronRight, CheckCircle2, X, Send,
  TrendingUp, Shield, Flame
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// ── Risk config (Forest calm tokens) ───────────────────────────────────────
const RISK_CONFIG = {
  LOW:      { bg: 'bg-brand/10',     text: 'text-brand',     border: 'border-brand/30',     dot: '#2f8f52', glow: 'rgba(47,143,82,0.25)',  label: 'Low Risk',      icon: Shield },
  MEDIUM:   { bg: 'bg-ochre/10',     text: 'text-ochre',     border: 'border-ochre/30',     dot: '#c4892e', glow: 'rgba(196,137,46,0.25)', label: 'Medium Risk',   icon: TrendingUp },
  HIGH:     { bg: 'bg-chili/10',     text: 'text-chili',     border: 'border-chili/30',     dot: '#c93d32', glow: 'rgba(201,61,50,0.30)',  label: 'High Risk',     icon: AlertCircle },
  CRITICAL: { bg: 'bg-chili/15',     text: 'text-chili',     border: 'border-chili/40',     dot: '#a52a20', glow: 'rgba(165,42,32,0.40)',  label: 'Critical Risk', icon: Flame },
}
const RISK_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

// ── Leaflet map component (lazy-loads leaflet from CDN) ────────────────────
function LeafletMap({ cities, selected, onSelect, filter }) {
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markersRef = useRef({})
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setLeafletLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || leafletMapRef.current) return
    const L = window.L

    leafletMapRef.current = L.map(mapRef.current, {
      center: [28.6139, 77.2090],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    })

    // Light tile layer — matches cool bone paper surface
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
    }).addTo(leafletMapRef.current)

    L.control.attribution({ position: 'bottomleft', prefix: '' })
      .addAttribution('<span style="opacity:0.4;font-size:9px">© OpenStreetMap © CARTO</span>')
      .addTo(leafletMapRef.current)

    L.control.zoom({ position: 'bottomright' }).addTo(leafletMapRef.current)
  }, [leafletLoaded])

  useEffect(() => {
    if (!leafletLoaded || !leafletMapRef.current) return
    const L = window.L
    const map = leafletMapRef.current

    Object.values(markersRef.current).forEach(m => map.removeLayer(m))
    markersRef.current = {}

    cities.forEach(city => {
      if (!city.lat || !city.lng) return
      const cfg = RISK_CONFIG[city.risk] || RISK_CONFIG.LOW
      const isFiltered = filter !== 'ALL' && city.risk !== filter
      if (isFiltered) return

      const isSel = selected === city.city
      const size = isSel ? 22 : city.reports > 25 ? 18 : city.reports > 15 ? 14 : 11

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:${size}px; height:${size}px;
            background:${cfg.dot};
            border-radius:50%;
            border: ${isSel ? '3px solid #14241c' : '2px solid rgba(255,255,255,0.85)'};
            box-shadow: 0 0 ${isSel ? 16 : 8}px ${cfg.glow};
            transition: all 0.3s;
            ${city.risk === 'CRITICAL' ? 'animation: pulse 1.8s ease-in-out infinite;' : ''}
          "></div>
          <style>@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }</style>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      const marker = L.marker([city.lat, city.lng], { icon })
        .addTo(map)
        .on('click', () => onSelect(selected === city.city ? null : city.city))

      marker.bindTooltip(`
        <div style="background:#ffffff;border:1px solid var(--color-rule, #d5dcd5);border-radius:10px;padding:8px 12px;color:#14241c;font-family:'Outfit',sans-serif;min-width:120px;box-shadow:0 4px 16px rgba(20,36,28,0.10)">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${city.city}</div>
          <div style="font-size:10px;color:${cfg.dot};text-transform:uppercase;letter-spacing:0.1em;font-weight:600">${cfg.label}</div>
          <div style="font-size:11px;color:#6a7a70;margin-top:4px">${city.reports} reports · ${city.topFood}</div>
        </div>
      `, { permanent: false, direction: 'top', offset: [0, -size / 2], opacity: 1, className: 'custom-tooltip' })

      markersRef.current[city.city] = marker
    })
  }, [cities, selected, filter, leafletLoaded])

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-[20px] overflow-hidden" style={{ zIndex: 0 }}>
      {!leafletLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper-2 gap-3" style={{ zIndex: 1 }}>
          <MapPin className="w-8 h-8 text-ink-3 animate-bounce" />
          <span className="text-ink-3 text-xs font-bold uppercase tracking-widest">Loading Map…</span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: 420, background: '#ebf0eb', zIndex: 0 }} />
    </div>
  )
}

// ── City Card ───────────────────────────────────────────────────────────────
function CityCard({ city, selected, onSelect, index }) {
  const cfg = RISK_CONFIG[city.risk] || RISK_CONFIG.LOW
  const Icon = cfg.icon
  const isSel = selected === city.city

  return (
    <div
      onClick={() => onSelect(isSel ? null : city.city)}
      className={`group relative flex items-center gap-3 p-3.5 cursor-pointer transition-all duration-300 rounded-[14px] mx-2 my-1
        ${isSel
          ? `${cfg.bg} border ${cfg.border}`
          : 'hover:bg-paper-2 border border-transparent'
        }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ background: `${cfg.dot}18`, border: `1px solid ${cfg.dot}40` }}>
          <Icon className={`w-4 h-4 ${cfg.text}`} />
        </div>
        {city.risk === 'CRITICAL' && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-chili animate-ping" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold truncate text-ink">{city.city}</span>
          <span className="text-[10px] font-bold text-ink-3 ml-2 shrink-0">{city.reports}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
          <span className="text-ink-3">·</span>
          <span className="text-[10px] text-ink-3 truncate">{city.topFood}</span>
        </div>
      </div>

      <ChevronRight className={`w-3.5 h-3.5 text-ink-3 shrink-0 transition-transform duration-200
        ${isSel ? 'rotate-90 text-ink-2' : 'group-hover:translate-x-0.5'}`} />
    </div>
  )
}

// ── Selected City Detail Panel ──────────────────────────────────────────────
function CityDetail({ city, onClose }) {
  const cfg = RISK_CONFIG[city.risk] || RISK_CONFIG.LOW
  const Icon = cfg.icon

  return (
    <div className={`relative overflow-hidden rounded-[20px] border ${cfg.border} p-5 animate-fade-up bg-glass-gradient backdrop-blur`}>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center"
              style={{ background: `${cfg.dot}20`, border: `1px solid ${cfg.dot}40` }}>
              <Icon className={`w-5 h-5 ${cfg.text}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">{city.city}</h3>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-paper-2 hover:bg-paper-3 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-ink-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[12px] p-3.5 bg-paper-2 border border-rule">
            <div className="text-[9px] uppercase tracking-widest text-ink-3 font-bold mb-1.5">Reports</div>
            <div className="text-2xl font-black text-ink tabular-nums">{city.reports}</div>
          </div>
          <div className="rounded-[12px] p-3.5 bg-paper-2 border border-rule">
            <div className="text-[9px] uppercase tracking-widest text-ink-3 font-bold mb-1.5">Top Risk</div>
            <div className="text-sm font-bold text-ink leading-tight">{city.topFood || 'Various'}</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] uppercase tracking-wider text-ink-3 font-bold">Risk Level</span>
            <span className={`text-[9px] font-bold uppercase ${cfg.text}`}>{city.risk}</span>
          </div>
          <div className="h-1.5 rounded-full bg-paper-3 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${{ LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 }[city.risk]}%`,
                background: cfg.dot,
              }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Report Form ─────────────────────────────────────────────────────────────
function ReportForm({ lang, token, onClose, onSuccess }) {
  const [food, setFood] = useState('')
  const [city, setCity] = useState('')
  const [brand, setBrand] = useState('')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [step, setStep] = useState(1)

  const valid1 = food.trim() && city.trim()
  const valid2 = desc.trim().length >= 10

  async function submit() {
    if (!valid1 || !valid2) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/community/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ food_name: food.trim(), city: city.trim(), description: desc.trim(), brand: brand.trim() || null }),
      })
      if (!res.ok) throw new Error()
      setMsg('success')
      setTimeout(() => { onSuccess?.(); onClose() }, 1800)
    } catch {
      setMsg('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(20,36,28,0.45)', backdropFilter: 'blur(12px)', zIndex: 2000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-md rounded-[24px] overflow-hidden animate-fade-up bg-paper border border-rule shadow-[0_24px_64px_rgba(20,36,28,0.18)]">

        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-rule bg-glass-gradient">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-chili/10 border border-chili/25 flex items-center justify-center">
                <AlertCircle className="w-4.5 h-4.5 text-chili" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink tracking-wide">Report Adulteration</h3>
                <p className="text-[10px] text-ink-3 mt-0.5">Submitted anonymously · Helps the community</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-paper-2 hover:bg-paper-3 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-ink-3" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 mt-4 relative z-10">
            {[1, 2].map(s => (
              <div key={s} className="h-0.5 flex-1 rounded-full transition-all duration-500"
                style={{ background: step >= s ? '#c93d32' : 'var(--color-rule)' }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 bg-paper">
          {msg === 'success' && (
            <div className="flex items-center gap-3 p-3.5 rounded-[12px] bg-brand/10 border border-brand/20 animate-fade-up">
              <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
              <span className="text-sm text-brand-dark font-medium">Report submitted! Thank you.</span>
            </div>
          )}
          {msg === 'error' && (
            <div className="flex items-center gap-3 p-3.5 rounded-[12px] bg-chili/10 border border-chili/30">
              <AlertCircle className="w-5 h-5 text-chili shrink-0" />
              <span className="text-sm text-chili font-medium">Failed to submit. Try again.</span>
            </div>
          )}

          {step === 1 ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-3">Food Name *</span>
                <input value={food} onChange={e => setFood(e.target.value)}
                  placeholder="e.g. Turmeric Powder, Buffalo Milk…"
                  className="w-full rounded-[10px] py-3 px-4 text-sm text-ink placeholder-ink-3/40 outline-none transition-all bg-paper-2 border border-rule focus:border-brand/40"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-3">City *</span>
                  <input value={city} onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Dwarka"
                    className="w-full rounded-[10px] py-3 px-4 text-sm text-ink placeholder-ink-3/40 outline-none transition-all bg-paper-2 border border-rule focus:border-brand/40"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-3">Brand <span className="text-ink-3/50">(opt)</span></span>
                  <input value={brand} onChange={e => setBrand(e.target.value)}
                    placeholder="Brand name"
                    className="w-full rounded-[10px] py-3 px-4 text-sm text-ink placeholder-ink-3/40 outline-none transition-all bg-paper-2 border border-rule focus:border-brand/40"
                  />
                </label>
              </div>
              <button onClick={() => valid1 && setStep(2)} disabled={!valid1}
                className="mt-1 w-full py-3.5 rounded-[10px] text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 bg-chili hover:bg-[#b3342a] text-white border border-[#a52a20] disabled:bg-paper-3 disabled:text-ink-3 disabled:border-rule">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 rounded-[10px] bg-paper-2 border border-rule">
                <MapPin className="w-3.5 h-3.5 text-ink-3" />
                <span className="text-xs text-ink-2">{food} · {city}{brand && ` · ${brand}`}</span>
                <button onClick={() => setStep(1)} className="ml-auto text-[10px] text-chili/70 hover:text-chili font-bold transition-colors">Edit</button>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-3">Describe the issue *</span>
                <textarea value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="What did you notice? Unusual smell, color, texture, or taste? Any symptoms after eating?"
                  rows={4}
                  className="w-full rounded-[10px] py-3 px-4 text-sm text-ink placeholder-ink-3/40 outline-none transition-all resize-none bg-paper-2 border border-rule focus:border-brand/40"
                />
                <span className="text-[10px] text-ink-3 text-right">{desc.length} chars · min 10</span>
              </label>

              <button onClick={submit} disabled={submitting || !valid2 || msg === 'success'}
                className="mt-1 w-full py-3.5 rounded-[10px] text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 bg-chili hover:bg-[#b3342a] text-white border border-[#a52a20] disabled:bg-paper-3 disabled:text-ink-3 disabled:border-rule">
                {submitting
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
                  : <><Send className="w-4 h-4" /> Submit Report</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main MapPage ─────────────────────────────────────────────────────────────
export default function MapPage() {
  const { lang, accessToken: token } = useStore()
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/community/city-risk`)
      .then(r => r.json())
      .then(d => { if (d.cities?.length) setCities(d.cities) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function refresh() {
    const r = await fetch(`${API_URL}/community/city-risk`)
    const d = await r.json()
    if (d.cities) setCities(d.cities)
  }

  const totalReports = cities.reduce((s, c) => s + c.reports, 0)
  const criticalCount = cities.filter(c => c.risk === 'CRITICAL').length
  const highCount = cities.filter(c => c.risk === 'HIGH').length
  const sel = selected ? cities.find(c => c.city === selected) : null

  const filtered = cities
    .filter(c => filter === 'ALL' || c.risk === filter)
    .filter(c => !search || c.city.toLowerCase().includes(search.toLowerCase()) || c.topFood?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk))

  return (
    <div className="flex flex-col animate-fade-up px-3 md:px-8 py-6 max-w-6xl mx-auto w-full pb-32">

      {/* ── Header ── */}
      <div className="relative p-6 md:p-8 rounded-[20px] mb-6 overflow-hidden bg-glass-gradient border border-rule">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 bg-brand/10 border border-brand/20">
              <MapIcon className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink tracking-tight">{t(lang, 'riskMap') || 'Adulteration Risk Map'}</h1>
              <p className="text-[11px] text-ink-3 mt-0.5 uppercase tracking-widest font-medium">Delhi NCR · Live Reports</p>
            </div>
          </div>

          <div className="flex gap-3">
            {[
              { label: 'Total Reports', value: totalReports, color: 'text-ink', icon: null },
              { label: 'Cities Tracked', value: cities.length, color: 'text-ink', icon: null },
              { label: 'High Risk', value: criticalCount + highCount, color: 'text-chili', icon: AlertOctagon },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center justify-center px-4 py-3 rounded-[14px] min-w-[80px] bg-paper-2 border border-rule">
                <span className={`text-xl font-black leading-none mb-1 ${color} flex items-center gap-1`}>
                  {Icon && <Icon className="w-4 h-4" />}{value}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-ink-3 font-bold text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-5">

        {/* ── Map ── */}
        <div className="flex flex-col gap-4">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {['ALL', ...RISK_ORDER].map(f => {
              const cfg = f !== 'ALL' ? RISK_CONFIG[f] : null
              const active = filter === f
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border
                    ${active
                      ? (cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-paper-3 text-ink border-rule-2')
                      : 'bg-paper-2 text-ink-3 border-rule hover:border-rule-2'}`}>
                  {f === 'ALL' ? 'All Cities' : cfg.label}
                </button>
              )
            })}
          </div>

          {/* Leaflet map */}
          <div className="rounded-[20px] overflow-hidden border border-rule" style={{ height: 460 }}>
            <LeafletMap cities={cities} selected={selected} onSelect={setSelected} filter={filter} />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-1 flex-wrap">
            {RISK_ORDER.map(r => {
              const cfg = RISK_CONFIG[r]
              return (
                <div key={r} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.dot }} />
                  <span className="text-[10px] text-ink-3 font-medium">{cfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="flex flex-col gap-4">
          {/* Selected city detail */}
          {sel && <CityDetail city={sel} onClose={() => setSelected(null)} />}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search city or food…"
              className="w-full pl-10 pr-4 py-3 rounded-[14px] text-sm text-ink placeholder-ink-3/40 outline-none transition-all bg-paper-2 border border-rule focus:border-brand/40"
            />
          </div>

          {/* City list */}
          <div className="rounded-[20px] overflow-hidden flex flex-col bg-paper-2 border border-rule" style={{ minHeight: 200 }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-rule">
              <Database className="w-3.5 h-3.5 text-ink-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-3">
                {filtered.length} {filtered.length === 1 ? 'City' : 'Cities'}
              </span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-12 text-ink-3 text-xs font-bold uppercase tracking-wider">
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 bg-paper">
                <Search className="w-7 h-7 text-ink-3/30" />
                <p className="text-ink-3 text-sm">No cities found</p>
              </div>
            ) : (
              <div className="overflow-y-auto py-2 bg-paper" style={{ maxHeight: 380 }}>
                {filtered.map((city, i) => (
                  <CityCard key={city.city} city={city} selected={selected} onSelect={setSelected} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FAB ── */}
      <button onClick={() => setShowForm(true)}
        className="fixed bottom-24 md:bottom-10 right-6 flex items-center gap-2.5 pl-4 pr-5 h-12 rounded-full font-bold text-sm tracking-wide transition-all duration-300 group bg-chili hover:bg-[#b3342a] text-white border border-[#a52a20] shadow-[0_4px_20px_rgba(201,61,50,0.30)]"
        style={{ zIndex: 1500 }}>
        <AlertCircle className="w-4 h-4" />
        Report
      </button>

      {/* ── Report Form Modal ── */}
      {showForm && (
        <ReportForm
          lang={lang}
          token={token}
          onClose={() => setShowForm(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
