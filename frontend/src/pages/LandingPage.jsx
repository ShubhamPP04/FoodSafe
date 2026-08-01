/* SafeThali — Cinematic Scroll Story · Green Theme
 * Adapted from the Mostar cinematic scroll technique:
 * sticky stage + RAF scroll rig + CSS custom properties + mouse parallax
 */
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Leaf, ArrowRight, Camera, Languages, Users, ShieldCheck, Search, Map as MapIcon, BookOpen, Sparkles } from 'lucide-react'

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
  const sectionRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => { if (token) nav('/scan', { replace: true }) }, [token, nav])
  useEffect(() => { const t = setTimeout(() => setReady(true), 50); return () => clearTimeout(t) }, [])

  // ── Scroll rig ──────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const root = document.documentElement
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
      const sharedHeroY = progress * -60
      const sharedHeroScale = progress * 0.18

      const set = (prop, val) => root.style.setProperty(prop, val)

      set('--mx', reduceMotion.matches ? '0' : mouseX.toFixed(4))
      set('--my', reduceMotion.matches ? '0' : mouseY.toFixed(4))
      set('--bg-scale', (0.9 + progress * 0.25).toFixed(4))
      set('--bg-brightness', (1 - blurActive * 0.25).toFixed(4))
      set('--blur-px', `${blurActive * 12}px`)
      set('--shade-opacity', '1')
      set('--shade-z', frame2.active > 0.02 ? '2' : '0')
      set('--shade-alpha-top', (blurActive * 0.35).toFixed(3))
      set('--shade-alpha-mid', (blurActive * 0.3).toFixed(3))
      set('--shade-alpha-bot', (blurActive * 0.4).toFixed(3))
      set('--title-y', `${introExit * -180}px`)
      set('--title-scale', (1 - introExit * 0.06).toFixed(4))
      set('--title-opacity', (1 - introExit).toFixed(4))
      set('--intro-y', `${introExit * 80}px`)
      set('--intro-opacity', (1 - introExit).toFixed(4))
      set('--panel2-opacity', (frame2.active * (1 - frame2.exit)).toFixed(4))
      set('--panel2-y', `calc(-50% + ${-frame2.exit * 70 + (1 - frame2.enter) * 50}px)`)
      set('--panel3-opacity', (frame3.active * (1 - frame3.exit)).toFixed(4))
      set('--panel3-y', `calc(-50% + ${-frame3.exit * 70 + (1 - frame3.enter) * 50}px)`)
      set('--sights-enter-x', `${(1 - sightsEnter) * 420}vw`)
      set('--sights-visibility', sightsEnter > 0.01 ? 'visible' : 'hidden')
      set('--sights-controls-opacity', sightsControlsEnter.toFixed(4))

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
    <div className="cinema-page">
      <style>{`
        .cinema-page {
          --mx: 0; --my: 0;
          --bg-scale: 0.9; --bg-brightness: 1; --blur-px: 0px;
          --shade-opacity: 1; --shade-z: 0;
          --shade-alpha-top: 0; --shade-alpha-mid: 0; --shade-alpha-bot: 0;
          --title-y: 0px; --title-scale: 1; --title-opacity: 1;
          --intro-y: 0px; --intro-opacity: 1;
          --panel2-opacity: 0; --panel2-y: calc(-50% + 50px);
          --panel3-opacity: 0; --panel3-y: calc(-50% + 50px);
          --sights-enter-x: 420vw; --sights-visibility: hidden;
          --sights-controls-opacity: 0;
          background: #050d0a;
          color: #e8f5f0;
        }
        .cinema-scroll { position: relative; height: calc(100vh + 3200px); }
        .stage { position: sticky; top: 0; height: 100vh; min-height: 600px; overflow: hidden; isolation: isolate; }
        .bg-layer, .shade, .hero-title, .intro-copy, .story-panel, .sights-slider, .sights-controls, .site-header {
          position: absolute;
        }

        /* Background gradient with scroll-driven scale/blur */
        .bg-layer {
          inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse at 30% 20%, rgba(0,217,190,0.06) 0%, transparent 55%),
            radial-gradient(ellipse at 70% 80%, rgba(0,191,165,0.04) 0%, transparent 55%),
            linear-gradient(180deg, #0A1F1A 0%, #0D2A22 35%, #051410 70%, #020806 100%);
          filter: blur(var(--blur-px)) brightness(var(--bg-brightness));
          transform: scale(var(--bg-scale));
          transform-origin: 50% 50%;
          will-change: transform, filter;
        }

        /* Grid texture */
        .grid-tex {
          position: absolute; inset: 0; z-index: 0; opacity: 0.025; pointer-events: none;
          background-image:
            linear-gradient(rgba(0,217,190,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,217,190,0.3) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* Shade overlay */
        .shade {
          inset: 0; z-index: var(--shade-z); pointer-events: none; opacity: var(--shade-opacity);
          background: linear-gradient(180deg,
            rgba(0,80,60,var(--shade-alpha-top)) 0%,
            rgba(0,60,45,var(--shade-alpha-mid)) 48%,
            rgba(0,40,30,var(--shade-alpha-bot)) 100%);
        }

        /* Header */
        .site-header {
          top: 0; left: 0; right: 0; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 32px; gap: 24px;
        }
        .site-header .logo-grp { display: flex; align-items: center; gap: 10px; }
        .site-header .logo-box {
          width: 32px; height: 32px; border-radius: 9px; background: #00BFA5;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 12px rgba(0,191,165,0.35);
        }
        .site-header .logo-text { font-size: 18px; font-weight: 800; color: #e8f5f0; letter-spacing: -0.02em; }
        .site-header nav { display: flex; gap: 28px; }
        .site-header nav button {
          font-size: 14px; font-weight: 500; color: rgba(232,245,240,0.6);
          background: none; border: 0; cursor: pointer; transition: color 0.3s;
        }
        .site-header nav button:hover { color: #00D9BE; }
        .site-header .cta {
          padding: 8px 20px; border-radius: 999px; border: 0; cursor: pointer;
          background: #00BFA5; color: #fff; font-size: 13px; font-weight: 700;
          transition: all 0.3s cubic-bezier(0.32,0.72,0,1);
        }
        .site-header .cta:hover { background: #00897B; transform: translateY(-1px); }

        /* Hero title */
        .hero-title {
          left: 50%; top: clamp(90px, 18vh, 180px); z-index: 3;
          width: 100%; margin: 0; text-align: center;
          font-size: clamp(3.5rem, 13vw, 11rem); font-weight: 800;
          line-height: 0.82; letter-spacing: -0.04em;
          color: #e8f5f0; pointer-events: none;
          transform: translate3d(-50%, var(--title-y), 0) scale(var(--title-scale));
          opacity: var(--title-opacity);
          will-change: transform, opacity;
        }
        .hero-title .accent { color: #00D9BE; }
        .hero-logo-emblem {
          display: inline-block; vertical-align: middle; margin: 0 0.15em;
          width: clamp(40px, 10vw, 90px); height: clamp(40px, 10vw, 90px);
        }

        /* Intro copy */
        .intro-copy {
          left: 50%; bottom: clamp(48px, 22vh, 300px); z-index: 9;
          width: min(520px, calc(100vw - 32px)); text-align: center;
          transform: translate3d(-50%, var(--intro-y), 0);
          opacity: var(--intro-opacity);
          will-change: transform, opacity;
        }
        .intro-copy p {
          margin: 0 auto; max-width: 480px;
          color: rgba(232,245,240,0.7); font-size: clamp(0.95rem, 1.3vw, 1.15rem);
          font-weight: 500; line-height: 1.4;
          text-shadow: 0 2px 16px rgba(0,0,0,0.4);
        }
        .hero-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 22px; }
        .hero-tags span {
          min-height: 38px; display: inline-flex; align-items: center; justify-content: center;
          padding: 0 18px; border-radius: 999px;
          background: rgba(232,245,240,0.95); color: #0A1F1A;
          font-size: 0.85rem; font-weight: 600;
          box-shadow: 0 10px 28px rgba(0,0,0,0.15);
        }

        /* Story panels */
        .story-panel {
          left: 50%; top: 45%; z-index: 10;
          width: min(680px, calc(100vw - 32px)); text-align: center;
          pointer-events: none;
          transform: translate3d(-50%, -50%, 0);
          will-change: transform, opacity;
        }
        .story-panel-bridge { top: 58%; opacity: var(--panel2-opacity); transform: translate3d(-50%, var(--panel2-y), 0); }
        .story-panel-bazaar { top: 30%; opacity: var(--panel3-opacity); transform: translate3d(-50%, var(--panel3-y), 0); }
        .story-panel h2 {
          margin: 0; color: #e8f5f0;
          font-size: clamp(2rem, 5vw, 4.5rem); font-weight: 800;
          line-height: 0.95; letter-spacing: -0.03em;
          text-shadow: 0 12px 36px rgba(0,0,0,0.4);
        }
        .story-panel p {
          width: min(480px, 100%); margin: 22px auto 0;
          color: rgba(232,245,240,0.65); font-size: clamp(0.95rem, 1.2vw, 1.1rem);
          font-weight: 500; line-height: 1.4;
          text-shadow: 0 2px 16px rgba(0,0,0,0.4);
        }
        .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; width: min(480px, 100%); margin: 40px auto 0; }
        .facts dt { color: #00D9BE; font-size: clamp(1.8rem, 3.5vw, 3.2rem); font-weight: 800; line-height: 0.9; }
        .facts dd { margin: 10px 0 0; color: rgba(232,245,240,0.55); font-size: 0.85rem; font-weight: 500; }

        /* Sights slider */
        .sights-slider {
          left: 0; right: 0; z-index: 2;
          top: clamp(120px, 28vh, 280px);
          visibility: var(--sights-visibility);
          transform: translate3d(var(--sights-enter-x), 0, 0);
          will-change: transform;
        }
        .sights-track {
          display: flex; gap: clamp(14px, 1.5vw, 22px);
          padding: 0 32px;
        }
        .sight-card {
          position: relative; flex: 0 0 clamp(300px, 22vw, 380px);
          height: 200px; padding: 22px; overflow: hidden;
          border: 1px solid rgba(0,217,190,0.15); border-radius: 22px;
          color: #e8f5f0; background: rgba(15,30,25,0.9);
          box-shadow: 0 16px 48px rgba(0,0,0,0.25);
          backdrop-filter: blur(12px); cursor: pointer; user-select: none;
        }
        .sight-card .kick {
          display: block; margin-bottom: 50px;
          color: #00D9BE; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.12em;
        }
        .sight-card .icon-box {
          position: absolute; top: 22px; right: 22px;
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(0,217,190,0.12); display: flex; align-items: center; justify-content: center;
        }
        .sight-card h3 {
          position: absolute; left: 22px; right: 22px; bottom: 56px;
          margin: 0; color: #e8f5f0; font-size: 20px; font-weight: 700;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sight-card p {
          position: absolute; left: 22px; right: 22px; bottom: 22px;
          margin: 0; color: rgba(232,245,240,0.5); font-size: 13px;
          line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }

        /* Slider controls */
        .sights-controls {
          left: 32px; z-index: 5;
          top: calc(clamp(120px, 28vh, 280px) + 200px + 14px);
          display: flex; gap: 12px;
          opacity: var(--sights-controls-opacity);
          pointer-events: none;
        }
        .sights-controls.is-ready { pointer-events: auto; }
        .sight-nav {
          width: 48px; height: 48px; border-radius: 999px;
          border: 0; cursor: pointer; font-size: 18px;
          color: #0A1F1A; background: rgba(232,245,240,0.92);
          box-shadow: 0 14px 32px rgba(0,0,0,0.2);
          display: inline-flex; align-items: center; justify-content: center;
          transition: transform 0.3s cubic-bezier(0.32,0.72,0,1);
        }
        .sight-nav:hover { transform: scale(1.05); }

        @media (max-width: 768px) {
          .site-header { padding: 18px 20px; }
          .site-header nav { display: none; }
          .hero-title { top: 14vh; }
          .intro-copy { bottom: 36px; }
          .facts { grid-template-columns: 1fr; gap: 16px; }
          .sight-card { flex-basis: min(80vw, 320px); }
          .sights-controls { left: 20px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .bg-layer, .hero-title, .intro-copy, .story-panel, .sights-slider { transition: none; }
        }
      `}</style>

      <main className="cinema-scroll" ref={sectionRef} aria-label="SafeThali cinematic scroll story">
        <div className="stage">
          <div className="bg-layer" />
          <div className="grid-tex" />

          {/* Header */}
          <header className="site-header">
            <div className="logo-grp">
              <span className="logo-box"><Leaf size={18} color="#fff" strokeWidth={2.5} /></span>
              <span className="logo-text">SafeThali</span>
            </div>
            <nav>
              <button onClick={() => nav('/auth')}>Scan</button>
              <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
              <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>About</button>
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
                <span aria-hidden="true">↗</span>
                <span>Start scanning</span>
              </button>
            </div>
          </section>

          {/* Feature slider */}
          <section className="sights-slider" id="features" aria-label="SafeThali features slider">
            <div className="sights-track" style={{ overflow: 'hidden' }}>
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
            }}>←</button>
            <button className="sight-nav" aria-label="Next" onClick={() => {
              const track = document.querySelector('.sights-track')
              if (track) track.scrollBy({ left: 340, behavior: 'smooth' })
            }}>→</button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '32px', background: '#020806', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: 24, height: 24, borderRadius: 7, background: '#00BFA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Leaf size={12} color="#fff" strokeWidth={2.5} />
        </span>
        <span style={{ fontWeight: 800, fontSize: 13, color: 'rgba(232,245,240,0.7)' }}>SafeThali · सेफथाली</span>
        <span style={{ fontSize: 12, color: 'rgba(232,245,240,0.3)', marginLeft: 16 }}>Food adulteration awareness</span>
      </footer>
    </div>
  )
}
