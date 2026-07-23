import { useState } from 'react'
import { useStore } from '../store'
import { t } from '../i18n/translations'
import { Calendar, Sparkles, ChefHat, AlertTriangle, ArrowRight, CheckCircle2, Clock } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const MEAL_ICONS = {
  breakfast: '🌅', morning_snack: '🍵',
  lunch: '🍱', evening_snack: '☕', dinner: '🌙', snack: '🍎',
}
const MEAL_ORDER = ['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner']

export default function MealPlannerPage() {
  const { scanHistory, activeMember, lang } = useStore()
  const [planType, setPlanType] = useState('single')
  const [plan, setPlan]         = useState(null)
  const [loading, setLoading]   = useState(false)

  const highRiskFoods = [...new Set(
    scanHistory
      .filter(s => ['HIGH', 'CRITICAL'].includes(s.risk_level))
      .map(s => s.food_name)
  )].slice(0, 8)

  async function generate() {
    setLoading(true)
    setPlan(null)
    try {
      const res = await fetch(`${API_URL}/meal-planner/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: planType,
          member_profile: activeMember || null,
          high_risk_foods: highRiskFoods,
          lang,
        }),
      })
      const data = await res.json()
      setPlan(data)
    } catch {
      setPlan({ error: 'Failed to generate plan. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col animate-fade-up px-4 md:px-8 py-6 max-w-4xl mx-auto w-full pb-32">
      
      {/* Header */}
      <div className="relative p-6 md:p-8 rounded-[32px] bg-glass-gradient border border-surface-200 shadow-2xl overflow-hidden mb-6 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[60px] rounded-full pointer-events-none transform translate-x-1/4 -translate-y-1/4" />
        
        <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center mb-4">
            <ChefHat className="w-7 h-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-sans font-bold text-ink mb-2 leading-tight">
            {t(lang, 'mealPlanner')}
          </h1>
          <p className="text-[11px] md:text-[13px] font-medium text-ink-2 uppercase tracking-[0.15em] mb-6">
            {t(lang, 'mealPlannerSub')}
          </p>

          {/* Member Badge */}
          {activeMember && (
            <div className="flex items-center gap-2 mb-6 px-3 py-1.5 rounded-xl bg-surface-200/50 border border-rule text-[11px] font-bold text-ink-2">
              <span className="text-brand">⚕</span> {t(lang, 'personalizingFor')} <span className="text-ink">{activeMember.name}</span>
              {activeMember.conditions?.length > 0 && <span className="text-ink-3">({activeMember.conditions.join(', ')})</span>}
            </div>
          )}

          {/* Type Toggles */}
          <div className="flex bg-surface-200/50 p-1.5 rounded-2xl border border-rule w-full md:w-auto">
            <button
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2
                ${planType === 'single' ? 'bg-surface-300 text-brand shadow-md border border-rule' : 'text-ink-3 hover:text-ink hover:bg-surface-300/50'}`}
              onClick={() => { setPlanType('single'); setPlan(null) }}
            >
              <Calendar className="w-4 h-4" /> {t(lang, 'todaysPlan')}
            </button>
            <button
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2
                ${planType === 'weekly' ? 'bg-surface-300 text-brand shadow-md border border-rule' : 'text-ink-3 hover:text-ink hover:bg-surface-300/50'}`}
              onClick={() => { setPlanType('weekly'); setPlan(null) }}
            >
              <Calendar className="w-4 h-4" /> {t(lang, 'weeklyPlan')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Generate Action */}
        <button 
          className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex justify-center items-center gap-2 shadow-lg
            ${loading ? 'bg-surface-200 text-ink-3 border border-rule cursor-not-allowed' : 'bg-brand hover:bg-brand-dark text-accent-ink shadow-[0_4px_24px_oklch(52%_0.13_155/0.3)] hover:shadow-[0_8px_32px_oklch(52%_0.13_155/0.4)] border border-brand-dark'}`}
          onClick={generate} 
          disabled={loading}
        >
          {loading ? <Sparkles className="w-4 h-4 animate-spin text-ink-3" /> : <Sparkles className="w-4 h-4" />}
          {loading ? t(lang, 'generatingPlan') : t(lang, 'generatePlan')}
        </button>

        {/* Avoiding Alert */}
        {highRiskFoods.length > 0 && !loading && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-chili/10 border border-chili/30 text-chili text-xs font-medium animate-fade-up leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p><strong className="text-red-300">{t(lang, 'avoidingFoods')}:</strong> {highRiskFoods.join(', ')}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-rule rounded-[32px] bg-surface-100/30">
            <ChefHat className="w-16 h-16 text-ink/10 mb-6 animate-pulse" />
            <p className="text-ink-2 text-[15px] leading-relaxed max-w-sm font-medium">
              🤖 {t(lang, 'creatingPlan')}<br />
              <span className="text-ink-3 text-xs mt-2 block">{t(lang, 'takesSeconds')}</span>
            </p>
          </div>
        )}

        {/* Error State */}
        {plan?.error && (
          <div className="p-4 rounded-2xl bg-chili/10 border border-chili/30 text-chili text-xs font-bold animate-fade-up text-center">
            {plan.error}
          </div>
        )}

        {/* Single Day Plan */}
        {plan && !plan.error && plan.plan_type === 'single' && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MEAL_ORDER.map(mealKey => {
                const meal = plan[mealKey]
                if (!meal) return null
                return (
                  <div key={mealKey} className="bg-surface-100 border border-rule rounded-[24px] overflow-hidden shadow-xl hover:bg-surface-200/50 transition-colors flex flex-col group">
                    <div className="flex justify-between items-center p-5 border-b border-rule bg-surface-200/30 group-hover:bg-transparent transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xl bg-surface-300 w-8 h-8 rounded-lg flex items-center justify-center border border-rule">{MEAL_ICONS[mealKey]}</span>
                        <h3 className="text-[10px] font-bold text-ink-2 uppercase tracking-widest">{mealKey.replace('_', ' ')}</h3>
                      </div>
                      {meal.prep_time && <span className="text-[10px] font-bold text-brand flex items-center gap-1 bg-brand/10 px-2 py-1 rounded-md border border-brand/20"><Clock className="w-3 h-3" /> {meal.prep_time}</span>}
                    </div>
                    <div className="p-5 flex flex-col gap-4 flex-1">
                      <h4 className="font-sans text-[17px] font-bold text-ink leading-snug">{meal.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        {(meal.items || []).map((item, i) => (
                          <span key={i} className="text-[10px] font-bold text-ink-2 bg-surface-300 px-2.5 py-1 rounded-lg border border-rule">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    {meal.safety_note && (
                      <div className="mx-5 mb-5 px-3 py-2.5 bg-brand/10 border border-brand/20 rounded-xl text-[10px] text-brand font-medium flex gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {meal.safety_note}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Nutrition & Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {plan.nutrition_summary && (
                <div>
                  <h3 className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.15em] pl-1 mb-3">{t(lang, 'nutritionSummary')}</h3>
                  <div className="p-5 rounded-[24px] bg-surface-200/50 border border-rule backdrop-blur-md">
                    <p className="text-[12px] text-ink leading-relaxed">
                      {plan.nutrition_summary}
                    </p>
                  </div>
                </div>
              )}
              {plan.safety_tips?.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.15em] pl-1 mb-3">{t(lang, 'safetyTips')}</h3>
                  <div className="bg-surface-100 border border-rule rounded-[24px] p-5">
                    <ul className="space-y-3">
                      {plan.safety_tips.map((tip, i) => (
                        <li key={i} className="flex gap-3 text-[12px] text-ink-2 leading-relaxed">
                          <ArrowRight className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weekly Plan */}
        {plan && !plan.error && plan.plan_type === 'weekly' && (
          <div className="flex flex-col gap-8 animate-fade-up">
            {(plan.days || []).map((day, i) => (
              <div key={i}>
                <h3 className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.15em] pl-1 mb-3">{day.day}</h3>
                <div className="bg-surface-100 border border-rule rounded-[24px] overflow-hidden shadow-xl">
                  <div className="p-4 md:p-5 bg-surface-200/50 border-b border-rule font-sans text-lg font-bold text-ink">
                    {day.day}
                  </div>
                  <div className="divide-y divide-white/5">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map(mealKey => {
                      const meal = day[mealKey]
                      if (!meal) return null
                      return (
                        <div key={mealKey} className="p-4 md:p-5 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-surface-200/30 transition-colors">
                          <div className="w-24 shrink-0 flex items-center gap-2">
                            <span className="text-xl">{MEAL_ICONS[mealKey] || '🍽'}</span>
                            <span className="text-[9px] font-bold text-ink-3 uppercase tracking-widest">{mealKey}</span>
                          </div>
                          <div className="flex-1 flex flex-col gap-2">
                            <h4 className="text-[13px] font-bold text-ink">{meal.name || meal}</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {(meal.items || []).map((item, j) => (
                                <span key={j} className="text-[9px] text-ink-2 bg-surface-300/50 px-2 py-0.5 rounded-md border border-rule">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}

            {plan.safety_tips?.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.15em] pl-1 mb-3">{t(lang, 'safetyTips')}</h3>
                <div className="bg-surface-100 border border-rule rounded-[24px] p-5">
                  <ul className="space-y-3">
                    {plan.safety_tips.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-[12px] text-ink-2 leading-relaxed">
                        <ArrowRight className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
