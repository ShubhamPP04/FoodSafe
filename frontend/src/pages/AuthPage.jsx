import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { register, login } from '../services/api'
import { User, Mail, Lock, MapPin, ArrowRight, ShieldCheck, Camera, Languages, Users } from 'lucide-react'
import { Button, Input } from '../components/ui'

export default function AuthPage() {
  const { setAuth } = useStore()
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
    if (mode === 'register' && (!name || !city)) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = mode === 'register'
        ? await register({ name, email, password, city })
        : await login({ email, password })

      setAuth({
        id: res.user_id || res.id,
        name: res.name || name,
        email,
        city: res.city || city,
      }, res.access_token, res.refresh_token)
      nav('/scan', { replace: true })
    } catch (e) {
      setError(e?.response?.data?.detail || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-paper font-sans text-ink grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-ink text-accent-ink p-12">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full border border-brand/30" />
        <div className="absolute right-16 bottom-28 w-48 h-48 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="relative w-10 h-10 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-brand/50" />
            <span className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </span>
          <span className="font-display text-[20px] font-semibold">SafeThali</span>
        </div>

        <div className="relative">
          <h1 className="font-display text-[2.4rem] font-semibold leading-[1.1] tracking-tight max-w-[12ch]">
            Check your thali before you eat
          </h1>
          <p className="mt-4 text-white/65 text-[15px] max-w-[34ch] leading-relaxed">
            Clear adulteration guidance for Indian kitchen staples — in English and Hindi.
          </p>

          <ul className="mt-8 flex flex-col gap-3.5">
            {[
              { icon: Camera, text: 'Name a food or snap the packet' },
              { icon: Languages, text: 'Guidance in English & Hindi' },
              { icon: Users, text: 'Personalised for your family' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[14px] text-white/80">
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[12px] text-white/40">SafeThali · every plate, safer</p>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-10 bg-paper">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="w-8 h-8 rounded-full bg-brand text-accent-ink flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="font-display font-semibold text-[17px]">SafeThali</span>
          </div>

          <h2 className="font-display text-[24px] font-semibold tracking-tight mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-[14px] text-ink-2 mb-6">
            {mode === 'login' ? 'Sign in to continue scanning.' : 'Takes less than a minute.'}
          </p>

          <div className="flex bg-paper-2 rounded-lg p-1 mb-6 border border-rule">
            {['login', 'register'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-md text-[13px] font-medium transition-colors
                  ${mode === m ? 'bg-paper text-ink shadow-sm' : 'text-ink-3 hover:text-ink'}`}
              >
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {mode === 'register' && (
              <>
                <Input label="Full name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" left={<User />} autoComplete="name" />
                <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="Delhi" left={<MapPin />} />
              </>
            )}
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" left={<Mail />} autoComplete="email" />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              left={<Lock />}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {error && (
              <p className="text-[13px] text-chili bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">{error}</p>
            )}
            <Button fullWidth size="lg" loading={loading} onClick={handleSubmit} className="mt-1 group">
              {mode === 'login' ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </div>

          <p className="mt-6 text-center text-[13px] text-ink-3">
            {mode === 'login' ? "New to SafeThali?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="font-medium text-brand hover:text-brand-dark"
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          <button type="button" onClick={() => nav('/scan')} className="mt-3 w-full text-center text-[13px] text-ink-3 hover:text-ink">
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  )
}
