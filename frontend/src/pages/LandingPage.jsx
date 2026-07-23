import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { ShieldCheck, Camera, Languages, Users, ArrowRight } from 'lucide-react'

const PROOF = [
  { value: '68%', label: 'Turmeric samples flagged in surveys' },
  { value: '77%', label: 'Honey brands failing NMR checks' },
  { value: '46%', label: 'Milk samples found impure' },
]

const FEATURES = [
  {
    icon: Camera,
    title: 'Scan any food',
    desc: 'Type a name or snap a photo. Get a clear safety score with home tests and buying tips.',
  },
  {
    icon: Languages,
    title: 'Hindi, Marathi, English',
    desc: 'Ask about adulteration risk in the language your family actually uses.',
  },
  {
    icon: Users,
    title: 'Family profiles',
    desc: 'Flag foods that conflict with conditions you track for each household member.',
  },
]

const STEPS = [
  { title: 'Scan', desc: 'Search a food, capture a label, or speak your query.' },
  { title: 'Check', desc: 'We match FSSAI signals, seasonal risk, and your family profile.' },
  { title: 'Act', desc: 'Read the score, run a home test, and choose a safer buy.' },
]

export default function LandingPage() {
  const nav = useNavigate()
  const { refreshToken: token } = useStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (token) nav('/scan', { replace: true })
  }, [token, nav])

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 40)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-[100dvh] bg-paper text-ink font-sans overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[9px] bg-brand text-accent-ink flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" strokeWidth={2.25} />
            </div>
            <span className="text-[18px] font-semibold tracking-tight">FoodSafe</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => nav('/auth')} className="btn-glass !py-2 !px-3.5 !text-[13px] hidden sm:inline-flex">
              Sign in
            </button>
            <button onClick={() => nav('/auth')} className="btn-safe !py-2 !px-3.5 !text-[13px]">
              Scan food
            </button>
          </div>
        </div>
      </header>

      <section className="relative max-w-6xl mx-auto px-5 pt-14 md:pt-20 pb-16 md:pb-24 grid md:grid-cols-12 gap-10 md:gap-8 items-end">
        <div
          className={`md:col-span-7 transition-all duration-500 ${ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <h1 className="display text-[clamp(2.4rem,6vw,3.75rem)] text-ink max-w-[14ch]">
            Know what is really in your food
          </h1>
          <p className="mt-5 text-[16px] md:text-[17px] text-ink-2 leading-relaxed max-w-[42ch]">
            FoodSafe checks Indian kitchen staples for adulteration risk before they reach your family&apos;s plate.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => nav('/auth')} className="btn-safe !py-3.5 !px-6 !text-[15px]">
              Scan food free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-glass !py-3.5 !px-6 !text-[15px]"
            >
              How it works
            </button>
          </div>
        </div>

        <div
          className={`md:col-span-5 transition-all duration-700 delay-100 ${ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <figure className="relative rounded-[20px] overflow-hidden border border-rule bg-paper-2 aspect-[4/5] md:aspect-[5/6]">
            <img
              src="/images/hero-kitchen-spices.png"
              alt="Turmeric, chilli, mustard oil, and honey on an Indian kitchen counter"
              className="w-full h-full object-cover"
              width={900}
              height={1100}
              loading="eager"
              decoding="async"
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-ink/70 to-transparent">
              <p className="text-accent-ink text-[13px] font-medium leading-snug">
                Turmeric, chilli, honey, mustard oil - checked against real adulteration patterns.
              </p>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-y border-rule bg-paper-2">
        <div className="max-w-6xl mx-auto px-5 py-10 grid sm:grid-cols-3 gap-8">
          {PROOF.map((item) => (
            <div key={item.label}>
              <div className="text-[2rem] font-semibold tracking-tight text-ink tabular-nums">{item.value}</div>
              <p className="mt-1.5 text-[13px] text-ink-2 leading-snug max-w-[28ch]">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <h2 className="display text-[clamp(1.75rem,3.5vw,2.5rem)] max-w-[18ch]">
          Built for Indian kitchens, not generic food apps
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className={`p-6 rounded-[16px] border border-rule ${i === 0 ? 'bg-brand/5 border-brand/20' : 'bg-paper'}`}
            >
              <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center mb-5 ${i === 0 ? 'bg-brand text-accent-ink' : 'bg-paper-3 text-ink'}`}>
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="bg-ink text-accent-ink">
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-24">
          <h2 className="display text-[clamp(1.75rem,3.5vw,2.5rem)] text-accent-ink max-w-[16ch]">
            Three steps to a safer plate
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-10">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-accent-ink/45 mb-3">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="text-[20px] font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-[14px] text-accent-ink/70 leading-relaxed max-w-[32ch]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <div className="rounded-[20px] border border-rule bg-paper-2 px-6 py-12 md:px-12 md:py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h2 className="display text-[clamp(1.6rem,3vw,2.25rem)] max-w-[16ch]">
              Start with one scan tonight
            </h2>
            <p className="mt-3 text-[15px] text-ink-2 max-w-[40ch] leading-relaxed">
              No install required. Check turmeric, milk, honey, or spices in under a minute.
            </p>
          </div>
          <button onClick={() => nav('/auth')} className="btn-safe !py-3.5 !px-6 !text-[15px] shrink-0 self-start md:self-center">
            Scan food free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand" strokeWidth={2} />
            <span className="text-[14px] font-semibold tracking-tight">FoodSafe</span>
          </div>
          <p className="text-[12px] text-ink-3">Food safety guidance for Indian households.</p>
        </div>
      </footer>
    </div>
  )
}
