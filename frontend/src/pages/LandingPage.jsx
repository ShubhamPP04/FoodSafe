/* SafeThali · Aether Lane-style hero · Green theme
 * Full-bleed visual · massive split typography · floating glass nav
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useStore } from '../store'
import { Camera, Languages, Users, ArrowRight, Leaf, ShieldCheck, Sparkles, ChevronDown } from 'lucide-react'
import { Button } from '../components/ui'

const fade = (reduce, delay = 0) =>
  reduce ? {} : {
    initial: { opacity: 0, y: 30, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 1, ease: [0.32, 0.72, 0, 1], delay },
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
      {/* ── HERO — full-bleed dark green with massive split typography ── */}
      <section className="relative min-h-[100dvh] flex flex-col overflow-hidden">
        {/* Deep green gradient background */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, #0A1F1A 0%, #0D2A22 30%, #0A1F1A 70%, #000000 100%)',
        }} />

        {/* Radial glow orbs */}
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,217,190,0.08) 0%, transparent 60%)' }} />
        <div className="absolute bottom-[5%] right-[15%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,191,165,0.06) 0%, transparent 60%)' }} />

        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* ── Floating glass nav ── */}
        <header className="relative z-20 px-4 pt-6">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-full px-5 h-14 flex items-center justify-between shadow-card"
              style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-2.5">
                <span className="relative w-8 h-8 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-xl bg-brand/15" />
                  <span className="relative w-7 h-7 rounded-lg bg-brand flex items-center justify-center shadow-[0_2px_8px_rgba(0,191,165,0.4)]">
                    <Leaf className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </span>
                </span>
                <span className="font-display text-[16px] font-extrabold tracking-tight text-white">SafeThali</span>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                {['Scan', 'Features', 'About'].map(item => (
                  <span key={item} className="text-[13px] font-medium text-white/60 hover:text-white cursor-pointer transition-colors">{item}</span>
                ))}
              </nav>
              <Button size="sm" onClick={() => nav('/auth')} className="!bg-brand !border-brand !text-white hover:!bg-brand-dark">
                Get Started
              </Button>
            </div>
          </div>
        </header>

        {/* ── Massive split typography ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-10">
          {/* Split heading — "Safe" left, logo center, "Thali" right */}
          <div className="flex items-center justify-center gap-4 md:gap-12 w-full max-w-5xl">
            <motion.div {...(ready ? fade(reduce, 0.1) : {})}>
              <h1 className="font-display font-extrabold tracking-[-0.04em] leading-[0.9] text-[clamp(3.5rem,12vw,9rem)] text-white/95">
                Safe
              </h1>
            </motion.div>

            {/* Center logo emblem */}
            <motion.div {...(ready ? fade(reduce, 0.25) : {})}
              className="relative shrink-0">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-brand flex items-center justify-center shadow-[0_0_40px_rgba(0,191,165,0.3)]">
                <Leaf className="w-8 h-8 md:w-12 md:h-12 text-white" strokeWidth={2} />
              </div>
              <div className="absolute inset-0 rounded-2xl border border-brand/30 animate-pulse" />
            </motion.div>

            <motion.div {...(ready ? fade(reduce, 0.2) : {})}>
              <h1 className="font-display font-extrabold tracking-[-0.04em] leading-[0.9] text-[clamp(3.5rem,12vw,9rem)] text-white/95">
                Thali
              </h1>
            </motion.div>
          </div>

          {/* Subtitle — split left/right like reference */}
          <div className="mt-8 md:mt-12 flex flex-col md:flex-row items-center justify-between w-full max-w-4xl gap-4 md:gap-0">
            <motion.p {...(ready ? fade(reduce, 0.4) : {})}
              className="text-[14px] md:text-[16px] text-white/50 font-medium tracking-wide text-center md:text-left max-w-[20ch]">
              Check adulteration risk before you eat
            </motion.p>
            <motion.p {...(ready ? fade(reduce, 0.45) : {})}
              className="text-[14px] md:text-[16px] text-white/50 font-medium tracking-wide text-center md:text-right max-w-[20ch]">
              Your family's safety starts here
            </motion.p>
          </div>

          {/* CTA buttons */}
          <motion.div {...(ready ? fade(reduce, 0.55) : {})}
            className="mt-10 flex flex-wrap gap-3 justify-center">
            <Button size="lg" onClick={() => nav('/auth')} className="group !bg-brand !text-white !border-brand hover:!bg-brand-dark !shadow-[0_8px_32px_rgba(0,191,165,0.3)]">
              <span>Scan a food</span>
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
            <Button variant="ghost" size="lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="!text-white/70 hover:!text-white hover:!bg-white/10 !border-white/15">
              Learn more
            </Button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div {...(ready ? fade(reduce, 0.7) : {})}
          className="relative z-10 flex flex-col items-center pb-8">
          <ChevronDown className="w-5 h-5 text-white/30 animate-bounce" />
        </motion.div>
      </section>

      {/* ── FEATURES — Bento grid on dark green ── */}
      <section id="features" className="relative py-24 md:py-32 px-6"
        style={{ background: 'linear-gradient(180deg, #000000 0%, #0A1F1A 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div {...(ready ? fade(reduce, 0) : {})}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] text-brand bg-brand/10 border border-brand/20">
              <Sparkles className="w-3 h-3" /> Features
            </span>
          </motion.div>
          <motion.h2 {...(ready ? fade(reduce, 0.1) : {})}
            className="mt-5 font-display text-[clamp(2rem,4.5vw,3rem)] font-extrabold tracking-[-0.03em] max-w-[16ch] text-white">
            Built for the Indian kitchen
          </motion.h2>

          {/* Bento grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Large card */}
            <motion.div className="md:col-span-7 md:row-span-2" {...(ready ? fade(reduce, 0.15) : {})}>
              <div className="h-full rounded-3xl p-1.5"
                style={{ background: 'rgba(255,255,255,0.04)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                <div className="rounded-[1.4rem] p-8 md:p-10 h-full flex flex-col justify-between min-h-[280px]"
                  style={{ background: 'rgba(255,255,255,0.02)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.03)' }}>
                  <div>
                    <span className="w-12 h-12 rounded-2xl bg-brand/15 flex items-center justify-center mb-5">
                      <Camera className="w-5 h-5 text-brand" strokeWidth={1.75} />
                    </span>
                    <h3 className="font-display text-[24px] font-extrabold tracking-tight text-white">Scan any staple</h3>
                    <p className="mt-3 text-[15px] text-white/50 leading-relaxed max-w-[30ch]">
                      Name it or photograph the packet. Get a clear score, home tests, and what to buy instead.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-[13px] font-bold text-brand">
                    <span className="w-7 h-7 rounded-full bg-brand/15 flex items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    Under a minute
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Medium cards */}
            <motion.div className="md:col-span-5" {...(ready ? fade(reduce, 0.2) : {})}>
              <div className="h-full rounded-3xl p-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="rounded-[1.4rem] p-6 md:p-8 h-full min-h-[130px]"
                  style={{ background: 'rgba(255,255,255,0.02)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.03)' }}>
                  <span className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center mb-4">
                    <Languages className="w-4 h-4 text-gold-light" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display text-[18px] font-extrabold tracking-tight text-white">English & Hindi</h3>
                  <p className="mt-2 text-[14px] text-white/50 leading-relaxed">Switch language anytime. Guidance stays plain and useful.</p>
                </div>
              </div>
            </motion.div>

            <motion.div className="md:col-span-5" {...(ready ? fade(reduce, 0.25) : {})}>
              <div className="h-full rounded-3xl p-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="rounded-[1.4rem] p-6 md:p-8 h-full min-h-[130px]"
                  style={{ background: 'rgba(255,255,255,0.02)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.03)' }}>
                  <span className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center mb-4">
                    <Users className="w-4 h-4 text-brand" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display text-[18px] font-extrabold tracking-tight text-white">Family profiles</h3>
                  <p className="mt-2 text-[14px] text-white/50 leading-relaxed">Flag foods that clash with conditions you track.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA section — dark ── */}
      <section className="relative py-24 md:py-32 px-6" style={{ background: '#0A1F1A' }}>
        <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,217,190,0.06) 0%, transparent 60%)' }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div {...(ready ? fade(reduce, 0) : {})}>
            <span className="w-14 h-14 rounded-2xl bg-brand/15 flex items-center justify-center mb-6 mx-auto">
              <ShieldCheck className="w-6 h-6 text-brand" strokeWidth={1.75} />
            </span>
          </motion.div>
          <motion.h2 {...(ready ? fade(reduce, 0.1) : {})}
            className="font-display text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold tracking-[-0.03em] max-w-[18ch] text-white mx-auto">
            Start with one scan tonight
          </motion.h2>
          <motion.p {...(ready ? fade(reduce, 0.15) : {})}
            className="mt-4 text-[16px] text-white/50 leading-relaxed max-w-[36ch] mx-auto">
            Turmeric, milk, honey, mustard oil. No install required.
          </motion.p>
          <motion.div {...(ready ? fade(reduce, 0.2) : {})}
            className="mt-8">
            <Button size="lg" onClick={() => nav('/auth')} className="group !bg-brand !text-white !border-brand hover:!bg-brand-dark !shadow-[0_8px_32px_rgba(0,191,165,0.3)]">
              <span>Create free account</span>
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-10" style={{ background: '#000000' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand flex items-center justify-center">
              <Leaf className="w-3 h-3 text-white" strokeWidth={2.5} />
            </span>
            <span className="font-display font-extrabold tracking-tight text-[14px] text-white/80">SafeThali · सेफथाली</span>
          </div>
          <p className="text-[12px] text-white/30 font-medium">Food adulteration awareness · English & Hindi</p>
        </div>
      </footer>
    </div>
  )
}
