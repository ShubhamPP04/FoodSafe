/* Hallmark · pre-emit critique: P4 H5 E4 S4 R4 V4
 * Reading: consumer food-safety landing · warm kitchen trust · Fraunces + turmeric
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useStore } from '../store'
import { Camera, Languages, Users, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui'

const FEATURES = [
  {
    icon: Camera,
    title: 'Scan any staple',
    desc: 'Name it or photograph the packet. Get a clear score, home tests, and what to buy instead.',
  },
  {
    icon: Languages,
    title: 'English & Hindi',
    desc: 'Switch language anytime — the guidance stays plain and useful for the whole household.',
  },
  {
    icon: Users,
    title: 'Family profiles',
    desc: 'Flag foods that clash with conditions you track for each person at home.',
  },
]

const fade = (reduce, delay = 0) =>
  reduce
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
      }

export default function LandingPage() {
  const nav = useNavigate()
  const { refreshToken: token } = useStore()
  const reduce = useReducedMotion()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (token) nav('/scan', { replace: true })
  }, [token, nav])

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 20)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-[100dvh] bg-paper text-ink font-sans overflow-x-clip">
      {/* Full-bleed hero — one composition */}
      <section className="relative min-h-[100dvh] flex flex-col">
        <img
          src="/images/hero-kitchen-spices.png"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          width={1600}
          height={1200}
          loading="eager"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, rgba(28,25,23,0.88) 0%, rgba(28,25,23,0.72) 42%, rgba(28,25,23,0.35) 70%, rgba(28,25,23,0.2) 100%)',
          }}
        />
        {/* Thali rings — signature motif */}
        <div className="absolute right-[-8%] top-[18%] w-[min(70vw,520px)] h-[min(70vw,520px)] rounded-full border border-white/10 pointer-events-none hidden sm:block" />
        <div className="absolute right-[4%] top-[28%] w-[min(48vw,340px)] h-[min(48vw,340px)] rounded-full border border-brand/35 pointer-events-none hidden sm:block" />

        <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 md:px-12 pt-5 sm:pt-6">
          <div className="flex items-center gap-2.5 text-accent-ink">
            <span className="relative w-9 h-9 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-brand/50" />
              <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </span>
            <span className="font-display text-[20px] sm:text-[22px] font-semibold tracking-tight">
              SafeThali
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => nav('/auth')}
            className="!text-accent-ink/80 hover:!text-accent-ink hover:!bg-white/10"
          >
            Sign in
          </Button>
        </header>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-5 sm:px-8 md:px-12 pb-16 pt-10 max-w-3xl">
          <motion.p
            className="font-display text-[clamp(3rem,11vw,5.5rem)] font-semibold tracking-tight text-accent-ink leading-[0.95] mb-5"
            {...(ready ? fade(reduce, 0) : {})}
          >
            SafeThali
          </motion.p>
          <motion.h1
            className="font-display text-[clamp(1.65rem,4.2vw,2.35rem)] font-medium tracking-tight text-accent-ink/95 leading-[1.15] max-w-[16ch]"
            {...(ready ? fade(reduce, 0.06) : {})}
          >
            Check your thali before you eat
          </motion.h1>
          <motion.p
            className="mt-5 text-[16px] md:text-[17px] text-white/70 leading-relaxed max-w-[36ch]"
            {...(ready ? fade(reduce, 0.12) : {})}
          >
            Adulteration risk for milk, spices, oil, and honey — clear scores you can act on tonight.
          </motion.p>
          <motion.div
            className="mt-9 flex flex-wrap gap-3"
            {...(ready ? fade(reduce, 0.18) : {})}
          >
            <Button size="lg" onClick={() => nav('/auth')}>
              Scan a food
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              className="!bg-white/10 !border-white/25 !text-accent-ink hover:!bg-white/18"
            >
              How it works
            </Button>
          </motion.div>
        </div>
      </section>

      <section id="how" className="border-y border-rule bg-paper-2">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-20 space-y-14 md:space-y-16">
          <h2 className="font-display text-[clamp(1.55rem,3vw,2.1rem)] font-semibold tracking-tight max-w-[18ch]">
            Built for the Indian kitchen
          </h2>
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className={`flex flex-col md:flex-row md:items-start gap-3 md:gap-12 ${
                i % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              <div className="md:w-[38%] shrink-0">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  </span>
                  <h3 className="font-display text-[19px] font-semibold tracking-tight">{title}</h3>
                </div>
              </div>
              <p className="md:w-[62%] text-[15px] text-ink-2 leading-relaxed md:pt-1.5">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink text-accent-ink">
        <div className="absolute -right-20 -bottom-24 w-72 h-72 rounded-full border border-brand/30" />
        <div className="absolute right-24 -bottom-8 w-44 h-44 rounded-full border border-white/10" />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-20">
          <h2 className="font-display text-[clamp(1.5rem,3vw,2.15rem)] font-semibold tracking-tight max-w-[14ch]">
            Start with one scan tonight
          </h2>
          <p className="mt-3 text-[15px] text-white/65 leading-relaxed max-w-[40ch]">
            Turmeric, milk, honey, mustard oil — under a minute, no install required.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={() => nav('/auth')}>
              Create free account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-rule bg-paper">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="font-display font-semibold tracking-tight">SafeThali · सेफथाली</span>
          <p className="text-[13px] text-ink-3">Food adulteration awareness · English & Hindi</p>
        </div>
      </footer>
    </div>
  )
}
