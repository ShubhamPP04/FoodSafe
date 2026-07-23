import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store'
import { MessageCircle, X, Send } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SUGGESTIONS = {
  en: ['Is turmeric safe?', 'How to test milk?', 'Safe oil brands?'],
  hi: ['हल्दी सुरक्षित है?', 'दूध कैसे जांचें?', 'त्योहार में क्या खाएं?'],
  mr: ['हळद सुरक्षित आहे?', 'दूध कसे तपासावे?', 'सणात काय खावे?'],
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
      const res = await fetch(`${API_BASE}/api/chat`, {
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
        className="fixed bottom-20 md:bottom-6 right-4 z-[1000] w-12 h-12 rounded-[14px] bg-ink text-accent-ink flex items-center justify-center shadow-[0_8px_24px_oklch(22%_0.03_155/0.18)] hover:-translate-y-0.5 transition-transform"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {open && (
        <div className="fixed bottom-[140px] md:bottom-24 right-4 z-[1000] w-[min(300px,calc(100vw-2rem))] h-[420px] bg-paper border border-rule rounded-[16px] shadow-[0_12px_40px_oklch(22%_0.03_155/0.12)] flex flex-col overflow-hidden">
          <div className="bg-ink px-3.5 py-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[8px] bg-brand text-accent-ink flex items-center justify-center">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-accent-ink text-[13px] font-semibold leading-none">FoodSafe AI</div>
              <div className="text-accent-ink/55 text-[10px] font-mono uppercase tracking-[0.1em] mt-1">Safety assistant</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-paper">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-[14px] text-[13px] leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-brand text-accent-ink rounded-br-[4px]'
                      : 'bg-paper-2 text-ink border border-rule rounded-bl-[4px]'}`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2 rounded-[14px] bg-paper-2 border border-rule text-[13px] text-ink-3">
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
                  className="text-[10px] px-2.5 py-1.5 rounded-[8px] border border-rule bg-paper-2 text-ink-2 font-medium hover:border-brand/40 hover:text-ink transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-rule flex gap-2 bg-paper-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
              placeholder={lang === 'hi' ? 'कुछ पूछें...' : lang === 'mr' ? 'विचारा...' : 'Ask anything...'}
              className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-rule bg-paper text-ink text-[13px] outline-none focus:border-brand"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-[10px] flex items-center justify-center disabled:opacity-40 bg-ink text-accent-ink"
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
