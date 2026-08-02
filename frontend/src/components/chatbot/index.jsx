import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../../store'
import { MessageCircle, X, Send, GripHorizontal } from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL || 'https://foodsafe-api.onrender.com/api'

// Minimal markdown-lite renderer: **bold**, `code`, and strips stray table pipes/headers
// so occasional markdown from the model still looks clean in the narrow chat widget.
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
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
          {line ? renderInline(line) : '\u00A0'}
          {i < cleaned.split('\n').length - 1 && <br />}
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

  // ── Drag state ──────────────────────────────────────────────
  const [pos, setPos] = useState({ x: 0, y: 0 }) // offset from default bottom-right
  const dragRef = useRef(null)
  const dragStart = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startDrag = useCallback((e) => {
    // Don't drag on button clicks inside the panel
    if (e.target.closest('button') && !e.target.closest('.drag-handle')) return
    const isTouch = e.touches
    const clientX = isTouch ? e.touches[0].clientX : e.clientX
    const clientY = isTouch ? e.touches[0].clientY : e.clientY
    dragStart.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX: pos.x,
      posY: pos.y,
    }
    dragRef.current = true
    e.preventDefault()
  }, [pos])

  const onDrag = useCallback((e) => {
    if (!dragRef.current || !dragStart.current) return
    const isTouch = e.touches
    const clientX = isTouch ? e.touches[0].clientX : e.clientX
    const clientY = isTouch ? e.touches[0].clientY : e.clientY
    const dx = clientX - dragStart.current.mouseX
    const dy = clientY - dragStart.current.mouseY
    // Constrain within viewport
    const maxX = window.innerWidth / 2
    const maxY = window.innerHeight / 2
    const newX = Math.max(-maxX, Math.min(maxX, dragStart.current.posX - dx))
    const newY = Math.max(-maxY, Math.min(maxY, dragStart.current.posY - dy))
    setPos({ x: newX, y: newY })
  }, [])

  const endDrag = useCallback(() => {
    dragRef.current = false
    dragStart.current = null
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onDrag)
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchmove', onDrag)
    window.addEventListener('touchend', endDrag)
    return () => {
      window.removeEventListener('mousemove', onDrag)
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('touchmove', onDrag)
      window.removeEventListener('touchend', endDrag)
    }
  }, [onDrag, endDrag])

  async function sendMessage(text) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, lang }),
      })
      if (!res.ok) throw new Error('Chat service unavailable')
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.message || 'Sorry, I could not process that.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, the AI service is unavailable right now. Please try again later.' }])
    } finally {
      setLoading(false)
    }
  }

  // Default position: bottom-right. pos.x/y are offsets from that.
  const btnStyle = {
    right: `${16 - pos.x}px`,
    bottom: `${80 - pos.y}px`,
  }
  const panelStyle = {
    right: `${16 - pos.x}px`,
    bottom: `${140 - pos.y}px`,
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="fixed z-[1000] w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-lift hover:-translate-y-0.5 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={btnStyle}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {open && (
        <div
          className="fixed z-[1000] w-[min(300px,calc(100vw-2rem))] h-[420px] bg-paper border border-rule rounded-2xl shadow-soft flex flex-col overflow-hidden"
          style={panelStyle}
        >
          {/* Draggable header */}
          <div
            className="drag-handle px-3.5 py-3 flex items-center gap-2.5 border-b border-rule bg-paper cursor-grab active:cursor-grabbing select-none"
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          >
            <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-ink text-[13px] font-bold leading-none">SafeThali AI</div>
              <div className="text-ink-3 text-[10px] uppercase tracking-[0.08em] mt-1">Safety assistant</div>
            </div>
            <GripHorizontal className="w-4 h-4 text-ink-3 shrink-0" />
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-paper">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-brand text-white rounded-br-md'
                      : 'bg-paper-2 text-ink border border-rule rounded-bl-md'}`}
                >
                  <MessageContent text={m.content} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl bg-paper-2 border border-rule text-[13px] text-ink-3">
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
                  className="text-[10px] px-3 py-1.5 rounded-full border border-rule bg-paper-2 text-ink-2 font-bold hover:border-brand/40 hover:text-ink transition-all duration-300 active:scale-95"
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
              className="flex-1 px-4 py-2.5 rounded-full border border-rule bg-paper-2 text-ink text-[13px] outline-none focus:border-brand transition-all duration-300"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 bg-brand text-white active:scale-95 transition-all duration-300"
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
