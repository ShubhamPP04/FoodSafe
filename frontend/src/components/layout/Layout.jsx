import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../store'
import { t } from '../../i18n/translations'
import { useEffect, useState } from 'react'
import PushNotificationBell from '../PushNotificationBell'
import { Search, BookOpen, Newspaper, ShieldCheck, Users, Map, Calendar, LogOut, LogIn, ChevronRight } from 'lucide-react'

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
    <div className="flex h-[100dvh] w-full bg-paper overflow-hidden font-sans text-ink antialiased">
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] h-full border-r border-rule bg-paper-2 z-40 relative">
        <div className="p-6 pb-3 cursor-pointer flex items-center gap-3 group" onClick={() => nav('/')}>
          <div className="w-9 h-9 rounded-[10px] bg-brand text-accent-ink flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-0.5">
            <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-sans text-[21px] font-semibold tracking-tight text-ink leading-none">FoodSafe</h1>
            <p className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.14em] mt-1.5">
              {t(lang, 'tagline') || 'Protect your plate'}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, key }) => {
            const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
            return (
              <NavLink key={to} to={to} className="block focus:outline-none">
                <div className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors duration-150
                  ${isActive
                    ? 'bg-brand/10 text-ink'
                    : 'text-ink-2 hover:text-ink hover:bg-ink/[0.03]'}
                `}>
                  <Icon className={`w-[17px] h-[17px] ${isActive ? 'text-brand' : ''}`} strokeWidth={isActive ? 2.25 : 1.75} />
                  <span className={`text-[13.5px] tracking-[-0.01em] ${isActive ? 'font-semibold text-ink' : 'font-medium'}`}>
                    {t(lang, key)}
                  </span>
                  {isActive && <span className="nav-active-dot ml-auto" />}
                </div>
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-rule">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex bg-paper-3 rounded-[8px] p-0.5 border border-rule">
              {['en', 'hi', 'mr'].map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`
                    text-[10px] px-2.5 py-1 rounded-[6px] font-mono font-medium tracking-[0.08em] transition-colors duration-150
                    ${lang === l ? 'bg-ink text-accent-ink' : 'text-ink-3 hover:text-ink'}
                  `}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="pr-1"><PushNotificationBell /></div>
          </div>

          {user ? (
            <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-paper border border-rule">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-brand/15 text-brand flex items-center justify-center font-sans text-[14px] font-semibold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[12.5px] font-medium text-ink leading-tight">{user.name?.split(' ')[0]}</span>
                  <span className="text-[10px] text-ink-3">Signed in</span>
                </div>
              </div>
              <button
                onClick={() => { logout(); nav('/') }}
                className="w-8 h-8 rounded-[8px] hover:bg-chili/10 hover:text-chili text-ink-3 flex items-center justify-center transition-colors"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => nav('/auth')}
              className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-paper border border-rule hover:border-rule-2 hover:bg-paper-3 transition-colors text-ink group"
            >
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span className="text-[13px] font-medium">Log in</span>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative z-10 w-full md:w-[calc(100%-260px)] lg:w-[calc(100%-280px)]">
        <header className="md:hidden sticky top-0 z-50 px-5 py-3 flex items-center justify-between bg-paper/90 backdrop-blur-md border-b border-rule">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => nav('/')}>
            <div className="w-7 h-7 rounded-[7px] bg-brand text-accent-ink flex items-center justify-center">
              <ShieldCheck className="w-[15px] h-[15px]" strokeWidth={2} />
            </div>
            <span className="font-sans text-[17px] font-semibold text-ink tracking-tight leading-none">FoodSafe</span>
          </div>
          <div className="flex items-center gap-3">
            <PushNotificationBell />
            {user ? (
              <button
                onClick={() => { logout(); nav('/') }}
                className="w-7 h-7 rounded-[7px] bg-brand/15 text-brand flex items-center justify-center font-sans text-[12px] font-semibold"
              >
                {user.name?.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={() => nav('/auth')}
                className="w-7 h-7 rounded-[7px] bg-paper-3 border border-rule flex items-center justify-center text-ink"
                aria-label="Log in"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        <div className="md:hidden flex justify-center py-1.5 bg-paper z-40 border-b border-rule">
          <div className="flex bg-paper-3 rounded-[8px] p-0.5 border border-rule">
            {['en', 'hi', 'mr'].map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`
                  text-[10px] px-3 py-1 rounded-[6px] font-mono font-medium tracking-[0.08em] transition-colors duration-150
                  ${lang === l ? 'bg-ink text-accent-ink' : 'text-ink-3'}
                `}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-[100px] md:pb-0 relative">
          <div className="h-full w-full max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8 lg:px-10">
            {children}
          </div>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-4 pt-2 bg-paper/92 backdrop-blur-lg border-t border-rule">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {NAV.map(({ to, icon: Icon, key }) => {
              const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
              return (
                <NavLink
                  key={to}
                  to={to}
                  className="flex flex-col items-center justify-center flex-1 relative group focus:outline-none h-12"
                  aria-label={t(lang, key)}
                >
                  <div className={`relative z-10 p-1.5 rounded-[8px] transition-colors duration-200 ${isActive ? 'text-brand' : 'text-ink-3 group-hover:text-ink-2'}`}>
                    <Icon className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.25 : 1.75} />
                  </div>
                  <span className={`text-[9px] font-medium tracking-wide ${isActive ? 'text-brand opacity-100' : 'text-ink-3 opacity-0'}`}>
                    {t(lang, key)}
                  </span>
                  {isActive && <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand" />}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {showBanner && !installed && (
          <div className="fixed bottom-[84px] md:bottom-6 right-0 left-0 md:left-auto md:right-6 px-4 md:px-0 z-[100] animate-fade-up">
            <div className="mx-auto w-full max-w-md glass-strong p-4 flex items-center gap-4">
              <div className="w-11 h-11 flex-shrink-0 bg-brand text-accent-ink rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-sans font-semibold text-ink text-[15px] leading-tight">Install FoodSafe</h4>
                <p className="text-[11.5px] text-ink-2 leading-snug mt-0.5">Add to home screen for faster scanning.</p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={handleInstall} className="btn-safe !py-1.5 !px-3 !text-xs">Install</button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="text-[10px] text-ink-3 hover:text-ink uppercase tracking-[0.12em] font-mono font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
