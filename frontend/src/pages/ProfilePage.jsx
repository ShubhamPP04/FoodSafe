import { useState } from 'react'
import { ChevronRight, Plus, Trash2, User } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
]

const INITIAL_USER = {
  name: 'Demo User',
  email: 'demo@safethali.app',
}

const INITIAL_FAMILY = [
  { id: 'f1', name: 'Grandfather', conditions: ['Diabetes'] },
  { id: 'f2', name: 'Mom', conditions: ['Hypertension'] },
]

export default function ProfilePage() {
  const [lang, setLang] = useState('en')
  const [langOpen, setLangOpen] = useState(false)
  const [family, setFamily] = useState(INITIAL_FAMILY)
  const [addingMember, setAddingMember] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCondition, setNewCondition] = useState('')

  const currentLang = LANGUAGES.find((l) => l.code === lang)

  function addMember() {
    if (!newName.trim()) return
    setFamily((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newName.trim(),
        conditions: newCondition.trim() ? [newCondition.trim()] : [],
      },
    ])
    setNewName('')
    setNewCondition('')
    setAddingMember(false)
  }

  function removeMember(id) {
    setFamily((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="flex flex-col gap-8 px-5 pt-8 pb-4">
      {/* Header */}
      <h1 className="text-2xl font-bold text-ink tracking-tight">Profile</h1>

      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-stone-900 flex items-center justify-center
                        text-ink text-xl font-bold shrink-0">
          {INITIAL_USER.name.charAt(0)}
        </div>
        <div>
          <p className="text-lg font-bold text-ink">{INITIAL_USER.name}</p>
          <p className="text-sm text-ink-3">{INITIAL_USER.email}</p>
        </div>
      </div>

      {/* Preferences */}
      <Section title="Preferences">
        {/* Language */}
        <SettingRow
          label="Language"
          value={currentLang.label}
          onClick={() => setLangOpen((v) => !v)}
        />
        {langOpen && (
          <div className="border-t border-stone-100 divide-y divide-stone-100">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setLangOpen(false) }}
                className="w-full flex items-center justify-between px-4 py-3
                           hover:bg-paper-2 text-left transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                <span className={`text-[15px] ${lang === l.code ? 'font-bold text-ink' : 'text-ink-2'}`}>
                  {l.label}
                </span>
                {lang === l.code && <span className="text-emerald-600 text-sm font-medium">✓</span>}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Family */}
      <Section title="Scanning For">
        <div className="divide-y divide-stone-100">
          {family.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3.5"
            >
              <div className="w-8 h-8 rounded-full bg-paper-3 flex items-center justify-center
                              text-sm font-medium text-ink-2 shrink-0">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-ink">{member.name}</p>
                {member.conditions.length > 0 && (
                  <p className="text-xs text-ink-3 mt-0.5">
                    {member.conditions.join(', ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeMember(member.id)}
                className="w-8 h-8 rounded-full hover:bg-red-50 text-ink-3 hover:text-chili
                           flex items-center justify-center transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
                aria-label={`Remove ${member.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Add member form */}
          {addingMember ? (
            <div className="px-4 py-4 flex flex-col gap-3">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="h-10 px-3 rounded-full border border-stone-300 text-sm text-ink
                           placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
              <input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="Health condition (optional)"
                className="h-10 px-3 rounded-full border border-stone-300 text-sm text-ink
                           placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={addMember}
                  className="flex-1 h-9 bg-stone-900 text-ink text-sm font-medium rounded-lg"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingMember(false); setNewName(''); setNewCondition('') }}
                  className="flex-1 h-9 border border-stone-300 text-ink-2 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingMember(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left
                         hover:bg-paper-2 transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
            >
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-stone-300
                              flex items-center justify-center shrink-0">
                <Plus size={14} className="text-ink-3" />
              </div>
              <span className="text-sm font-medium text-ink-3">Add family member</span>
            </button>
          )}
        </div>
      </Section>

      {/* Account */}
      <Section title="Account">
        <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-paper-2
                           transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] text-left">
          <User size={16} className="text-ink-3" />
          <span className="flex-1 text-[15px] text-ink-2">Export my data</span>
          <ChevronRight size={16} className="text-ink-3" />
        </button>
        <div className="border-t border-stone-100">
          <button className="w-full px-4 py-3.5 text-[15px] font-medium text-red-600 text-left
                             hover:bg-red-50 transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-b-2xl">
            Log Out
          </button>
        </div>
      </Section>
    </div>
  )
}

// ─── Small reusable helpers ───────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3 mb-2 px-1">
        {title}
      </p>
      <div className="bg-paper border border-rule rounded-2xl shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5
                 hover:bg-paper-2 active:bg-paper-3 transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] text-left"
    >
      <span className="text-[15px] text-ink-2">{label}</span>
      <div className="flex items-center gap-1.5 text-ink-3">
        <span className="text-sm">{value}</span>
        <ChevronRight size={15} className="text-ink-3" />
      </div>
    </button>
  )
}
