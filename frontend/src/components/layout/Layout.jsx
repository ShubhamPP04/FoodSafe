import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store'
import { t } from '../../i18n/translations'
import { useEffect, useState } from 'react'
import PushNotificationBell from '../PushNotificationBell'
import { Search, BookOpen, Newspaper, ShieldCheck, Users, Map, Calendar, LogOut, LogIn, Leaf, Sun, Moon } from 'lucide-react'
import { Button } from '../ui'

const NAV = [
  { to: '/scan',   icon: Search,      key: 'scan' },
  { to: '/diary',  icon: BookOpen,    key: 'diary' },
  { to: '/meal',   icon: Calendar,    key: 'mealPlanner' },
  { to: '/map',    icon: Map,         key: 'riskMap' },
  { to: '/brands', icon: ShieldCheck, key: 'brands' },
  { to: '/family', icon: Users,       key: 'family' },
  { to: '/news',   icon: Newspaper,   key: 'news' },
]

export default function Layout({ children }) {
  const { lang, setLang, user, logout, theme, toggleTheme } = useStore()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) { setInstalled(true); return }
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); setShowBanner(true) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setInstalled(true); setShowBanner(false) })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setInstalled(true); setShowBanner(false) }
    setInstallPrompt(null)
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-canvas text-ink font-sans antialiased overflow-hidden">
      {/* Floating glass nav */}
      <header className="shrink-0 z-50 px-4 pt-4">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-full px-5 h-14 flex items-center justify-between gap-4 shadow-card">
            <button type="button" onClick={() => nav('/scan')} className="flex items-center gap-2.5 min-w-0 group">
              <span className="relative w-8 h-8 flex items-center justify-center shrink-0">
                <span className="absolute inset-0 rounded-xl bg-brand/10 transition-colors duration-400 group-hover:bg-brand/20" />
                <span className="relative w-7 h-7 rounded-lg bg-brand text-accent-ink flex items-center justify-center shadow-[0_2px_8px_rgba(0,191,165,0.3)]">
                  <Leaf className="w-3.5 h-3.5" strokeWidth={2.5} />
                </span>
              </span>
              <span className="font-display text-[16px] font-extrabold tracking-tight truncate">{t(lang, 'appName')}</span>
            </button>

            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-2xl">
              {NAV.map(({ to, key }) => {
                const isActive = pathname === to || (to !== '/scan' && pathname.startsWith(to))
                return (
                  <NavLink key={to} to={to}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      isActive ? 'bg-brand/10 text-brand' : 'text-ink-2 hover:text-ink hover:bg-paper-3'
                    }`}>
                    {t(lang, key)}
                  </NavLink>
                )
              })}
            </nav>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Dark mode toggle */}
              <button type="button" onClick={toggleTheme}
                className="w-9 h-9 rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-paper-3 transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-90"
                aria-label="Toggle dark mode" title="Toggle dark mode">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <div className="flex rounded-full border border-rule overflow-hidden bg-paper">
                {['en', 'hi'].map(l => (
                  <button key={l} type="button" onClick={() => setLang(l)}
                    className={`text-[11px] px-3 py-1 font-bold transition-all duration-400 ${
                      lang === l ? 'bg-brand text-white' : 'bg-paper text-ink-3 hover:text-ink'
                    }`}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <PushNotificationBell />
              {user ? (
                <button type="button" onClick={() => { logout(); nav('/') }}
                  className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-2 hover:text-ink px-2 py-1.5 transition-colors"
                  title="Log out">
                  <span className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[12px] font-bold">
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
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {children}
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-rule safe-pb">
        <div className="flex items-stretch justify-between max-w-lg mx-auto px-1">
          {NAV.map(({ to, icon: Icon, key }) => {
            const isActive = pathname === to || (to !== '/scan' && pathname.startsWith(to))
            return (
              <NavLink key={to} to={to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-w-0 relative"
                aria-label={t(lang, key)}>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-brand" />}
                <Icon className={`w-5 h-5 transition-all duration-400 ${isActive ? 'text-brand' : 'text-ink-3'}`} strokeWidth={isActive ? 2.5 : 1.75} />
                <span className={`text-[9px] font-bold truncate max-w-full px-0.5 transition-colors ${isActive ? 'text-brand' : 'text-ink-3'}`}>
                  {t(lang, key)}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      {showBanner && !installed && (
        <div className="fixed bottom-24 lg:bottom-6 inset-x-4 lg:inset-x-auto lg:right-6 lg:w-96 z-[100]">
          <div className="bezel-shell">
            <div className="bezel-core p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand text-accent-ink flex items-center justify-center shrink-0 shadow-glow">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold">Install SafeThali</p>
                <p className="text-[12px] text-ink-2">Add to home screen for quicker scans.</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button size="sm" onClick={handleInstall}>Install</Button>
                <button type="button" onClick={() => setShowBanner(false)} className="text-[11px] text-ink-3 font-medium">Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
