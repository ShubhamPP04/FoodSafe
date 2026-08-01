import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { register, login } from '../services/api'
import { User, Mail, Lock, MapPin, ArrowRight, Leaf, Camera, Languages, Users, ShieldCheck, Sparkles } from 'lucide-react'
import { Button, Input } from '../components/ui'

export default function AuthPage() {
  const { setAuth, setGuestMode } = useStore()
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email || !password) return
    if (mode === 'register' && (!name || !city)) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    try {
      const res = mode === 'register' ? await register({ name, email, password, city }) : await login({ email, password })
      setAuth({ id: res.user?.id, name: res.user?.name, email: res.user?.email, city: res.user?.city }, res.access_token, res.refresh_token)
      nav('/scan', { replace: true })
    } catch (e) {
      setError(e?.response?.data?.detail || 'Authentication failed. Please check your credentials.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[100dvh] bg-canvas font-sans text-ink grid lg:grid-cols-2">
      {/* ── Brand panel — deep green gradient with glow ── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden p-14"
        style={{ background: 'linear-gradient(160deg, #0A1F1A 0%, #0D2A22 50%, #000000 100%)' }}>

        {/* Glow orbs */}
        <div className="absolute top-[5%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,217,190,0.08) 0%, transparent 65%)' }} />
        <div className="absolute bottom-[10%] left-[-8%] w-[350px] h-[350px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,191,165,0.05) 0%, transparent 65%)' }} />

        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <span className="relative w-10 h-10 flex items-center justify-center">
            <span className="absolute inset-0 rounded-xl bg-brand/15" />
            <span className="relative w-8 h-8 rounded-lg bg-brand flex items-center justify-center shadow-[0_2px_8px_rgba(0,191,165,0.4)]">
              <Leaf className="w-4 h-4 text-white" />
            </span>
          </span>
          <span className="font-display text-[20px] font-extrabold text-white">SafeThali</span>
        </div>

        {/* Center content */}
        <div className="relative">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] text-brand bg-brand/10 border border-brand/20">
            <Sparkles className="w-3 h-3" /> Food Safety
          </span>
          <h1 className="mt-6 font-display text-[2.8rem] font-extrabold leading-[1.02] tracking-[-0.03em] max-w-[14ch] text-white">
            Check your thali before you eat
          </h1>
          <p className="mt-5 text-white/50 text-[15px] max-w-[34ch] leading-relaxed font-medium">
            Clear adulteration guidance for Indian kitchen staples, in English and Hindi.
          </p>

          {/* Feature list */}
          <ul className="mt-10 flex flex-col gap-4">
            {[
              { icon: Camera, text: 'Name a food or snap the packet' },
              { icon: Languages, text: 'Guidance in English & Hindi' },
              { icon: Users, text: 'Personalised for your family' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5 text-[14px] text-white/70 font-medium">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Icon className="w-4 h-4 text-brand" strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-white/20" />
          <p className="text-[12px] text-white/30 font-medium">SafeThali · every plate, safer</p>
        </div>
      </div>

      {/* ── Form panel — clean, airy, centered ── */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10 bg-canvas">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <span className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-[0_2px_8px_rgba(0,191,165,0.3)]">
              <Leaf className="w-4 h-4 text-white" />
            </span>
            <span className="font-display font-extrabold text-[18px]">SafeThali</span>
          </div>

          {/* Heading */}
          <h2 className="font-display text-[28px] font-extrabold tracking-[-0.03em] mb-1.5">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-[14px] text-ink-2 mb-8 font-medium">
            {mode === 'login' ? 'Sign in to continue scanning.' : 'Takes less than a minute.'}
          </p>

          {/* Toggle */}
          <div className="flex bg-paper-3 rounded-full p-1 mb-8 border border-rule">
            {['login', 'register'].map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2.5 rounded-full text-[13px] font-bold transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]
                  ${mode === m ? 'bg-white text-ink shadow-card' : 'text-ink-3 hover:text-ink'}`}>
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">
            {mode === 'register' && (
              <>
                <Input label="Full name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" left={<User />} autoComplete="name" />
                <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="Delhi" left={<MapPin />} />
              </>
            )}
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" left={<Mail />} autoComplete="email" />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" left={<Lock />} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            {error && <p className="text-[13px] text-chili bg-chili/10 border border-chili/20 rounded-full px-4 py-2 font-medium" role="alert">{error}</p>}
            <Button fullWidth size="lg" loading={loading} onClick={handleSubmit} className="mt-2 group">
              <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
              {!loading && <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>}
            </Button>
          </div>

          {/* Links */}
          <div className="mt-7 flex flex-col items-center gap-3">
            <p className="text-[13px] text-ink-3 font-medium">
              {mode === 'login' ? "New to SafeThali?" : 'Already have an account?'}{' '}
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
                className="font-bold text-brand hover:text-brand-dark transition-colors">
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
            <button type="button" onClick={() => { setGuestMode(true); nav('/scan') }}
              className="text-[13px] text-ink-3 hover:text-ink font-medium transition-colors">
              Skip for now →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
