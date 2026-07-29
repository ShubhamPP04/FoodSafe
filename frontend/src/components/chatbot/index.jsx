import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store'
import { MessageCircle, X, Send } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL || 'https://foodsafe-api.onrender.com/api'

// Minimal markdown-lite renderer: **bold**, `code`, and strips stray table pipes/headers
// so occasional markdown from the model still looks clean in the narrow chat widget.
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function MessageContent({ text }) {
  const cleaned = text
    .replace(/^\|.*\|$/gm, '')          // drop markdown table rows
    .replace(/^-{2,}\|?-{2,}.*$/gm, '')  // drop table separators
    .replace(/^#{1,6}\s*/gm, '')        // drop heading hashes
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return (
    <>
      {cleaned.split('\n').map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {renderInline(line)}
        </span>
      ))}
    </>
  )
}

const SUGGESTIONS = {
  en: ['Is turmeric safe?', 'How to test milk?', 'Safe oil brands?'],
  hi: ['हल्दी सुरक्षित है?', 'दूध कैसे जांचें?', 'त्योहार में क्या खाएं?'],
}

export default function Chatbot() {
  const { lang } = useStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi. Ask me about food safety, adulteration tests, or brands.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const userMsg = (text || input).trim()
    if (!userMsg || loading) return
    setInput('')

    const historySnapshot = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch(`${BASE}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: historySnapshot,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const reply = data.reply || 'Sorry, I could not respond.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="fixed bottom-20 md:bottom-6 right-4 z-[1000] w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center shadow-lift hover:-translate-y-0.5 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {open && (
        <div className="fixed bottom-[140px] md:bottom-24 right-4 z-[1000] w-[min(300px,calc(100vw-2rem))] h-[420px] bg-paper border border-rule rounded-2xl shadow-soft flex flex-col overflow-hidden">
          <div className="px-3.5 py-3 flex items-center gap-2.5 border-b border-rule bg-paper">
            <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-ink text-[13px] font-semibold leading-none">SafeThali AI</div>
              <div className="text-ink-3 text-[10px] uppercase tracking-[0.08em] mt-1">Safety assistant</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-paper">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-brand text-white rounded-br-sm'
                      : 'bg-paper-2 text-ink border border-rule rounded-bl-sm'}`}
                >
                  <MessageContent text={m.content} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl bg-paper-2 border border-rule text-[13px] text-ink-3">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-2.5 pb-2.5 flex gap-1.5 flex-wrap bg-paper">
              {(SUGGESTIONS[lang] || SUGGESTIONS.en).map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg border border-rule bg-paper-2 text-ink-2 font-medium hover:border-brand/40 hover:text-ink transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-2.5 border-t border-rule flex gap-2 bg-paper">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
              placeholder={lang === 'hi' ? 'कुछ पूछें...' : 'Ask anything...'}
              className="flex-1 px-3 py-2 rounded-lg border border-rule bg-paper text-ink text-[13px] outline-none focus:border-brand"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-40 bg-brand text-white"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
