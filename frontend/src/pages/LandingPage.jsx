/* SafeThali · Soft Structuralism · Asymmetrical Bento Landing
 * Pure white · emerald accent · double-bezel cards · fluid motion
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useStore } from '../store'
import { Camera, Languages, Users, ArrowRight, Leaf, ShieldCheck, Zap, Globe } from 'lucide-react'
import { Button } from '../components/ui'

const fade = (reduce, delay = 0) =>
  reduce ? {} : {
    initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.8, ease: [0.32, 0.72, 0, 1], delay },
  }

export default function LandingPage() {
  const nav = useNavigate()
  const { refreshToken: token } = useStore()
  const reduce = useReducedMotion()
  const [ready, setReady] = useState(false)

  useEffect(() => { if (token) nav('/scan', { replace: true }) }, [token, nav])
  useEffect(() => { const t = setTimeout(() => setReady(true), 30); return () => clearTimeout(t) }, [])

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink font-sans overflow-x-clip">
      {/* ── Hero ── */}
      <section className="relative min-h-[100dvh] flex flex-col">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 bg-mesh-teal" />
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-brand-light/8 blur-[100px] rounded-full pointer-events-none" />

        {/* Floating nav */}
        <header className="relative z-10 px-4 pt-6">
          <div className="max-w-6xl mx-auto">
            <div className="glass rounded-full px-5 h-14 flex items-center justify-between shadow-card">
              <div className="flex items-center gap-2.5">
                <span className="relative w-8 h-8 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-xl bg-brand/10" />
                  <span className="relative w-7 h-7 rounded-lg bg-brand text-accent-ink flex items-center justify-center shadow-[0_2px_8px_rgba(0,191,165,0.3)]">
                    <Leaf className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </span>
                <span className="font-display text-[16px] font-extrabold tracking-tight">SafeThali</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => nav('/auth')}>
                Sign in
              </Button>
            </div>
          </div>
        </header>

        {/* Hero content — left-aligned, massive type */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl mx-auto w-full px-6 py-20">
          <motion.div {...(ready ? fade(reduce, 0) : {})}>
            <span className="eyebrow">
              <Leaf className="w-3 h-3" /> Food Safety for India
            </span>
          </motion.div>
          <motion.h1
            className="mt-6 font-display text-[clamp(2.8rem,7vw,5.5rem)] font-extrabold tracking-[-0.04em] leading-[0.95] max-w-[14ch]"
            {...(ready ? fade(reduce, 0.1) : {})}
          >
            Check your thali
            <br />
            before you eat
          </motion.h1>
          <motion.p
            className="mt-8 text-[18px] md:text-[20px] text-ink-2 leading-relaxed max-w-[40ch] font-medium"
            {...(ready ? fade(reduce, 0.2) : {})}
          >
            Adulteration risk for milk, spices, oil, and honey. Clear scores you can act on tonight.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-wrap gap-3"
            {...(ready ? fade(reduce, 0.3) : {})}
          >
            <Button size="lg" onClick={() => nav('/auth')} className="group">
              <span>Scan a food</span>
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
            <Button variant="secondary" size="lg" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
              How it works
            </Button>
          </motion.div>
        </div>

        {/* Stats strip — floating at bottom of hero */}
        <motion.div
          className="relative z-10 max-w-6xl mx-auto w-full px-6 pb-12"
          {...(ready ? fade(reduce, 0.4) : {})}
        >
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '8+', label: 'Foods Tracked' },
              { value: '2', label: 'Languages' },
              { value: 'FSSAI', label: 'Data Source' },
            ].map(({ value, label }) => (
              <div key={label} className="bezel-shell">
                <div className="bezel-core px-4 py-4 flex flex-col items-center text-center">
                  <span className="font-display text-[clamp(1.4rem,3vw,2rem)] font-extrabold text-ink tracking-tight">{value}</span>
                  <span className="text-[10px] font-bold text-ink-3 uppercase tracking-[0.15em] mt-1">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Features — Asymmetrical Bento ── */}
      <section id="how" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...(ready ? fade(reduce, 0) : {})}>
            <span className="eyebrow"><Zap className="w-3 h-3" /> How It Works</span>
          </motion.div>
          <motion.h2
            className="mt-5 font-display text-[clamp(2rem,4.5vw,3rem)] font-extrabold tracking-[-0.03em] max-w-[16ch]"
            {...(ready ? fade(reduce, 0.1) : {})}
          >
            Built for the Indian kitchen
          </motion.h2>

          {/* Bento grid — asymmetric */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Large card — Scan */}
            <motion.div
              className="md:col-span-7 md:row-span-2"
              {...(ready ? fade(reduce, 0.15) : {})}
            >
              <div className="bezel-shell h-full">
                <div className="bezel-core p-8 md:p-10 h-full flex flex-col justify-between min-h-[280px]">
                  <div>
                    <span className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-5">
                      <Camera className="w-5 h-5" strokeWidth={1.75} />
                    </span>
                    <h3 className="font-display text-[24px] font-extrabold tracking-tight">Scan any staple</h3>
                    <p className="mt-3 text-[15px] text-ink-2 leading-relaxed max-w-[30ch]">
                      Name it or photograph the packet. Get a clear score, home tests, and what to buy instead.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-[13px] font-semibold text-brand">
                    <span className="w-7 h-7 rounded-full bg-brand/10 flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    Under a minute
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Medium card — Languages */}
            <motion.div className="md:col-span-5" {...(ready ? fade(reduce, 0.2) : {})}>
              <div className="bezel-shell h-full">
                <div className="bezel-core p-6 md:p-8 h-full flex flex-col justify-between min-h-[130px]">
                  <div>
                    <span className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center mb-4">
                      <Languages className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                    <h3 className="font-display text-[18px] font-extrabold tracking-tight">English & Hindi</h3>
                    <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">Switch language anytime. Guidance stays plain and useful.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Medium card — Family */}
            <motion.div className="md:col-span-5" {...(ready ? fade(reduce, 0.25) : {})}>
              <div className="bezel-shell h-full">
                <div className="bezel-core p-6 md:p-8 h-full flex flex-col justify-between min-h-[130px]">
                  <div>
                    <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
                      <Users className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                    <h3 className="font-display text-[18px] font-extrabold tracking-tight">Family profiles</h3>
                    <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">Flag foods that clash with conditions you track.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA section ── */}
      <section className="px-6 pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto">
          <motion.div {...(ready ? fade(reduce, 0) : {})}>
            <div className="bezel-shell">
              <div className="bezel-core p-10 md:p-16 text-center flex flex-col items-center">
                <span className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-6 shadow-glow">
                  <ShieldCheck className="w-6 h-6" strokeWidth={1.75} />
                </span>
                <h2 className="font-display text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold tracking-[-0.03em] max-w-[18ch]">
                  Start with one scan tonight
                </h2>
                <p className="mt-4 text-[16px] text-ink-2 leading-relaxed max-w-[36ch]">
                  Turmeric, milk, honey, mustard oil. No install required.
                </p>
                <div className="mt-8">
                  <Button size="lg" onClick={() => nav('/auth')} className="group">
                    <span>Create free account</span>
                    <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 pb-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand text-accent-ink flex items-center justify-center">
              <Leaf className="w-3 h-3" strokeWidth={2.5} />
            </span>
            <span className="font-display font-extrabold tracking-tight text-[14px]">SafeThali · सेफथाली</span>
          </div>
          <p className="text-[12px] text-ink-3 font-medium">Food adulteration awareness · English & Hindi</p>
        </div>
      </footer>
    </div>
  )
}
