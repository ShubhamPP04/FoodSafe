import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store'
import { t } from '../../i18n/translations'
import { useEffect, useState } from 'react'
import PushNotificationBell from '../PushNotificationBell'
import { Search, BookOpen, Newspaper, ShieldCheck, Users, Map, Calendar, LogOut, LogIn } from 'lucide-react'
import { Button } from '../ui'

const NAV = [
  { to: '/',       icon: Search,      key: 'scan' },
  { to: '/diary',  icon: BookOpen,    key: 'diary' },
  { to: '/meal',   icon: Calendar,    key: 'mealPlanner' },
  { to: '/map',    icon: Map,         key: 'riskMap' },
  { to: '/brands', icon: ShieldCheck, key: 'brands' },
  { to: '/family', icon: Users,       key: 'family' },
  { to: '/news',   icon: Newspaper,   key: 'news' },
]

export default function Layout({ children }) {
  const { lang, setLang, user, logout } = useStore()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setTimeout(() => setShowBanner(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowBanner(false)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      setShowBanner(false)
    }
    setInstallPrompt(null)
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-paper text-ink font-sans antialiased overflow-hidden">
      {/* Top bar — desktop + mobile */}
      <header className="shrink-0 z-50 bg-paper border-b border-rule">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <button type="button" onClick={() => nav('/')} className="flex items-center gap-2.5 min-w-0">
            <span className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <span className="absolute inset-0 rounded-full border-2 border-brand/30" />
              <span className="w-7 h-7 rounded-full bg-brand text-accent-ink flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </span>
            <span className="font-display text-[17px] font-semibold tracking-tight truncate">{t(lang, 'appName')}</span>
          </button>

          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center max-w-2xl">
            {NAV.map(({ to, key }) => {
              const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    isActive ? 'bg-paper-3 text-ink' : 'text-ink-2 hover:text-ink hover:bg-paper-3'
                  }`}
                >
                  {t(lang, key)}
                </NavLink>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-md border border-rule overflow-hidden">
              {['en', 'hi'].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`text-[11px] px-2.5 py-1 font-medium ${
                    lang === l ? 'bg-ink text-white' : 'bg-paper text-ink-3 hover:text-ink'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <PushNotificationBell />
            {user ? (
              <button
                type="button"
                onClick={() => { logout(); nav('/') }}
                className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink px-2 py-1.5"
                title="Log out"
              >
                <span className="w-7 h-7 rounded-full bg-brand/15 text-brand flex items-center justify-center text-[12px] font-semibold">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Button size="sm" onClick={() => nav('/auth')}>
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log in</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-paper border-t border-rule safe-pb">
        <div className="flex items-stretch justify-between max-w-lg mx-auto px-1">
          {NAV.map(({ to, icon: Icon, key }) => {
            const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
            return (
              <NavLink
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0"
                aria-label={t(lang, key)}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand' : 'text-ink-3'}`} strokeWidth={isActive ? 2.25 : 1.75} />
                <span className={`text-[9px] font-medium truncate max-w-full px-0.5 ${isActive ? 'text-brand' : 'text-ink-3'}`}>
                  {t(lang, key)}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      {showBanner && !installed && (
        <div className="fixed bottom-20 lg:bottom-6 inset-x-4 lg:inset-x-auto lg:right-6 lg:w-96 z-[100]">
          <div className="bg-paper border border-rule shadow-soft rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand text-accent-ink flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold">Install SafeThali</p>
              <p className="text-[12px] text-ink-2">Add to home screen for quicker scans.</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button size="sm" onClick={handleInstall}>Install</Button>
              <button type="button" onClick={() => setShowBanner(false)} className="text-[11px] text-ink-3">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
