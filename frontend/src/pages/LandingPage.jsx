/* SafeThali — Cinematic Scroll Story · Green Theme
 * sticky stage + RAF scroll rig + CSS custom properties + mouse parallax
 * All CSS lives in index.css under .cinema-page scope
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Leaf, Search, ShieldCheck, Sparkles, Map as MapIcon, Users } from 'lucide-react'

const FEATURES = [
  { kicker: 'Scan', title: 'Food Scanner', desc: 'Name it, photograph it, or use voice — get instant adulteration risk scores.', icon: Search },
  { kicker: 'Safety', title: 'Risk Analysis', desc: 'AI-powered adulterant detection with home tests and safer alternatives.', icon: ShieldCheck },
  { kicker: 'Brands', title: 'Brand Compare', desc: 'Compare branded products with FSSAI certification and safety scores.', icon: Sparkles },
  { kicker: 'Map', title: 'Delhi Risk Map', desc: 'Live community adulteration reports across Delhi NCR neighborhoods.', icon: MapIcon },
  { kicker: 'Family', title: 'Family Profiles', desc: 'Personalized warnings based on health conditions for each member.', icon: Users },
]

export default function LandingPage() {
  const nav = useNavigate()
  const { refreshToken: token } = useStore()
  const pageRef = useRef(null)
  const sectionRef = useRef(null)

  useEffect(() => { if (token) nav('/scan', { replace: true }) }, [token, nav])

  // ── Scroll rig ──────────────────────────────────────────────
  useEffect(() => {
    const pageEl = pageRef.current
    const section = sectionRef.current
    if (!pageEl || !section) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let targetMouseX = 0, targetMouseY = 0, mouseX = 0, mouseY = 0
    let targetScroll = 0, smoothScroll = 0
    let initialized = false, rafPending = false

    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))
    const smoothstep = (e0, e1, v) => { const x = clamp((v - e0) / (e1 - e0)); return x * x * (3 - 2 * x) }
    const lerp = (a, b, t) => a + (b - a) * t
    const seg = (s, a, b, c, d) => {
      const enter = smoothstep(a, b, s), exit = smoothstep(c, d, s)
      return { enter, exit, active: enter * (1 - exit) }
    }
    const getScroll = () => clamp(-section.getBoundingClientRect().top, 0, section.offsetHeight - window.innerHeight)

    function update() {
      rafPending = false
      targetScroll = getScroll()
      if (!initialized || reduceMotion.matches) { smoothScroll = targetScroll; initialized = true }
      else { smoothScroll = lerp(smoothScroll, targetScroll, 0.14) }
      if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll

      mouseX = lerp(mouseX, targetMouseX, 0.12)
      mouseY = lerp(mouseY, targetMouseY, 0.12)

      const frame2 = seg(smoothScroll, 400, 750, 1000, 1300)
      const frame3 = seg(smoothScroll, 1400, 1750, 2100, 2350)
      const progress = clamp(smoothScroll / 2350)
      const introExit = smoothstep(60, 550, smoothScroll)
      const sightsEnterRaw = smoothstep(2400, 3100, smoothScroll)
      const sightsEnter = Math.pow(sightsEnterRaw, 1.55)
      const sightsControlsEnter = smoothstep(2900, 3200, smoothScroll)
      const blurActive = clamp(frame2.active + frame3.active)

      const set = (prop, val) => pageEl.style.setProperty(prop, val)

      set('--mx', reduceMotion.matches ? '0' : mouseX.toFixed(4))
      set('--my', reduceMotion.matches ? '0' : mouseY.toFixed(4))
      set('--bg-scale', (0.9 + progress * 0.25).toFixed(4))
      set('--bg-brightness', (1 - blurActive * 0.25).toFixed(4))
      set('--blur-px', blurActive * 12 + 'px')
      set('--shade-opacity', '1')
      set('--shade-z', frame2.active > 0.02 ? '2' : '0')
      set('--shade-alpha-top', (blurActive * 0.35).toFixed(3))
      set('--shade-alpha-mid', (blurActive * 0.3).toFixed(3))
      set('--shade-alpha-bot', (blurActive * 0.4).toFixed(3))
      set('--title-y', introExit * -180 + 'px')
      set('--title-scale', (1 - introExit * 0.06).toFixed(4))
      set('--title-opacity', (1 - introExit).toFixed(4))
      set('--intro-y', introExit * 80 + 'px')
      set('--intro-opacity', (1 - introExit).toFixed(4))
      set('--panel2-opacity', (frame2.active * (1 - frame2.exit)).toFixed(4))
      set('--panel2-y', 'calc(-50% + ' + (-frame2.exit * 70 + (1 - frame2.enter) * 50) + 'px)')
      set('--panel3-opacity', (frame3.active * (1 - frame3.exit)).toFixed(4))
      set('--panel3-y', 'calc(-50% + ' + (-frame3.exit * 70 + (1 - frame3.enter) * 50) + 'px)')
      set('--sights-enter-x', (1 - sightsEnter) * 420 + 'vw')
      set('--sights-visibility', sightsEnter > 0.01 ? 'visible' : 'hidden')
      set('--sights-controls-opacity', sightsControlsEnter.toFixed(4))

      // Toggle pointer events on controls
      const controls = pageEl.querySelector('.sights-controls')
      if (controls) controls.classList.toggle('is-ready', sightsControlsEnter > 0.98)

      if (Math.abs(smoothScroll - targetScroll) > 0.08 || Math.abs(mouseX - targetMouseX) > 0.001 || Math.abs(mouseY - targetMouseY) > 0.001) requestTick()
    }

    function requestTick() { if (!rafPending) { rafPending = true; requestAnimationFrame(update) } }

    const onScroll = () => requestTick()
    const onResize = () => requestTick()
    const onPointer = (e) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5
      targetMouseY = e.clientY / window.innerHeight - 0.5
      requestTick()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    requestTick()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  return (
    <div className="cinema-page" ref={pageRef}>
      <main className="cinema-scroll" ref={sectionRef} aria-label="SafeThali cinematic scroll story">
        <div className="cinema-stage">
          <div className="bg-layer" />
          <div className="bg-animated">
            {/* Floating glow orbs */}
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
            <div className="orb orb-4" />
            <div className="orb orb-5" />
            {/* Rotating gradient mesh */}
            <div className="mesh" />
            {/* Rising particles */}
            <div className="particles">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="particle" style={{
                  left: `${5 + Math.random() * 90}%`,
                  width: `${2 + Math.random() * 3}px`,
                  height: `${2 + Math.random() * 3}px`,
                  animationDuration: `${8 + Math.random() * 12}s`,
                  animationDelay: `${-Math.random() * 20}s`,
                  opacity: 0.3 + Math.random() * 0.5,
                }} />
              ))}
            </div>
          </div>
          <div className="grid-tex" />
          <div className="cursor-glow" />

          {/* Header */}
          <header className="site-header">
            <div className="logo-grp">
              <span className="logo-box"><Leaf size={18} color="#fff" strokeWidth={2.5} /></span>
              <span className="logo-text">SafeThali</span>
            </div>
            <nav>
              <button onClick={() => nav('/auth')}>Scan</button>
              <button onClick={() => window.scrollTo({ top: 2400, behavior: 'smooth' })}>Features</button>
              <button onClick={() => window.scrollTo({ top: 1400, behavior: 'smooth' })}>About</button>
            </nav>
            <button className="cta" onClick={() => nav('/auth')}>Get Started</button>
          </header>

          {/* Hero Title */}
          <h1 className="hero-title">
            Safe<span className="accent">Thali</span>
          </h1>

          {/* Intro copy */}
          <div className="intro-copy">
            <p>Check adulteration risk for milk, spices, oil, and honey before you eat. Clear scores you can act on tonight.</p>
            <div className="hero-tags">
              <span>FSSAI Data</span>
              <span>AI Powered</span>
              <span>English &amp; Hindi</span>
            </div>
          </div>

          {/* Shade overlay */}
          <div className="shade" />

          {/* Story Panel 1 — Scan */}
          <section className="story-panel story-panel-bridge" aria-label="Food scanning">
            <h2>Scan before you eat.</h2>
            <p>Name a food or snap the packet. AI cross-references FSSAI records, seasonal risk models, and community reports to give you a clear safety score in seconds.</p>
            <dl className="facts">
              <div><dt>15+</dt><dd>Foods tracked</dd></div>
              <div><dt>2</dt><dd>Languages</dd></div>
              <div><dt>10+</dt><dd>Delhi areas</dd></div>
            </dl>
          </section>

          {/* Story Panel 2 — Map */}
          <section className="story-panel story-panel-bazaar" aria-label="Community risk map">
            <h2>Know your area.</h2>
            <p>Live community reports map adulteration hotspots across Delhi NCR. See which foods are flagged in your neighborhood before you buy.</p>
            <div style={{ marginTop: '24px', pointerEvents: 'auto' }}>
              <button onClick={() => nav('/auth')} style={{
                minHeight: '44px', display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '0 24px', borderRadius: '999px', border: 0, cursor: 'pointer',
                color: '#0A1F1A', background: 'rgba(232,245,240,0.95)', fontSize: '14px', fontWeight: 600,
                boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
              }}>
                <span aria-hidden="true">&#8599;</span>
                <span>Start scanning</span>
              </button>
            </div>
          </section>

          {/* Feature slider */}
          <section className="sights-slider" id="features" aria-label="SafeThali features slider">
            <div className="sights-track">
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <article key={i} className="sight-card" tabIndex={0} role="button"
                    onClick={() => nav('/auth')} onKeyDown={e => { if (e.key === 'Enter') nav('/auth') }}>
                    <span className="kick">{f.kicker}</span>
                    <div className="icon-box"><Icon size={20} color="#00D9BE" strokeWidth={1.75} /></div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                  </article>
                )
              })}
            </div>
          </section>

          {/* Slider controls */}
          <div className="sights-controls" id="about">
            <button className="sight-nav" aria-label="Previous" onClick={() => {
              const track = document.querySelector('.sights-track')
              if (track) track.scrollBy({ left: -340, behavior: 'smooth' })
            }}>&#8592;</button>
            <button className="sight-nav" aria-label="Next" onClick={() => {
              const track = document.querySelector('.sights-track')
              if (track) track.scrollBy({ left: 340, behavior: 'smooth' })
            }}>&#8594;</button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '32px', background: '#020806', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: 24, height: 24, borderRadius: 7, background: '#00BFA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Leaf size={12} color="#fff" strokeWidth={2.5} />
        </span>
        <span style={{ fontWeight: 800, fontSize: 13, color: 'rgba(232,245,240,0.7)' }}>SafeThali</span>
        <span style={{ fontSize: 12, color: 'rgba(232,245,240,0.3)', marginLeft: 16 }}>Food adulteration awareness</span>
      </footer>
    </div>
  )
}
