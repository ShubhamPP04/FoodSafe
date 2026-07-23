import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { register, login } from '../services/api'
import { User, Mail, Lock, MapPin, ArrowRight, ShieldCheck } from 'lucide-react'

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

      const userData = {
        id: res.user_id || res.id,
        name: res.name || name,
        email: email,
        city: res.city || city,
      }

      setAuth(userData, res.access_token, res.refresh_token)
      nav('/scan', { replace: true })
    } catch (e) {
      console.error('Auth Error:', e)
      setError(e?.response?.data?.detail || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-paper flex flex-col items-center justify-center p-6 relative overflow-hidden fade-up">
      <div className="text-center mb-10 relative z-10 w-full max-w-sm">
        <div className="mx-auto w-12 h-12 rounded-[12px] bg-brand text-accent-ink flex items-center justify-center mb-6 hover-lift">
          <ShieldCheck className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <h1 className="display text-[2.5rem] mb-3 text-ink">FoodSafe</h1>
        <p className="text-[14px] text-ink-2 max-w-[28ch] mx-auto leading-relaxed">
          Protect your family&apos;s plate with clear food risk checks.
        </p>
      </div>

      <div className="w-full max-w-sm glass-strong p-8 relative z-10">
        <div className="flex bg-paper-3 rounded-[10px] p-1 mb-7 border border-rule">
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-[7px] text-[12.5px] font-medium tracking-[-0.005em] transition-all duration-150
                ${mode === m
                  ? 'bg-paper text-ink shadow-[0_1px_2px_oklch(22%_0.03_155/0.1)]'
                  : 'text-ink-3 hover:text-ink-2'}`}
            >
              {m === 'login' ? 'Sign in' : 'Join'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3.5">
          {mode === 'register' && (
            <>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 group-focus-within:text-brand transition-colors" />
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  className="input-glass !pl-10"
                />
              </div>
              <div className="relative group">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 group-focus-within:text-brand transition-colors" />
                <input
                  value={city} onChange={e => setCity(e.target.value)}
                  placeholder="City (e.g. Dwarka)"
                  className="input-glass !pl-10"
                />
              </div>
            </>
          )}

          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 group-focus-within:text-brand transition-colors" />
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" type="email"
              className="input-glass !pl-10"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 group-focus-within:text-brand transition-colors" />
            <input
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" type="password"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="input-glass !pl-10"
            />
          </div>

          {error && (
            <div className="bg-chili/10 border border-chili/30 text-chili text-[12.5px] py-2.5 px-3.5 rounded-[8px] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-chili" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit} disabled={loading}
            className="btn-brand w-full mt-3 !py-3"
          >
            {loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        onClick={() => nav('/scan')}
        className="mt-7 text-[11px] text-ink-3 hover:text-ink transition-colors font-mono uppercase tracking-[0.12em]"
      >
        Skip for now
      </button>
    </div>
  )
}
