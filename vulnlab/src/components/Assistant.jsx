import { useState, useRef, useEffect } from 'react'
import { askAssistant } from '../lib/manage.js'

export default function Assistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm the VulnLab assistant. Ask me about your scans, reports, or web security." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading, open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    setLoading(true)
    const res = await askAssistant(text)
    setLoading(false)
    setMessages((m) => [...m, { role: 'bot', text: res.ok ? res.reply : (res.error || 'Something went wrong.') }])
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, left: 20, zIndex: 60,
          width: 340, maxWidth: 'calc(100vw - 40px)', height: 460, maxHeight: 'calc(100vh - 120px)',
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 14, display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        }}>
          {/* header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderBottom: '0.5px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BotIcon size={18} />
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>VulnLab Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} title="Minimize" style={{
              background: 'transparent', color: 'var(--text-dim)', width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? 'var(--primary)' : 'var(--surface-2)',
                color: m.role === 'user' ? 'var(--primary-ink)' : 'var(--text)',
                fontSize: 12.5, lineHeight: 1.55, padding: '9px 12px', borderRadius: 12,
                whiteSpace: 'pre-wrap',
              }}>{m.text}</div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--surface-2)', color: 'var(--text-dim)', fontSize: 12.5, padding: '9px 12px', borderRadius: 12 }}>
                Thinking…
              </div>
            )}
          </div>

          {/* input */}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '0.5px solid var(--border)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about VulnLab…"
              style={{ flex: 1, fontSize: 13 }}
            />
            <button onClick={send} disabled={loading} style={{
              background: 'var(--primary)', color: 'var(--primary-ink)', width: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button onClick={() => setOpen((o) => !o)} title="VulnLab Assistant" style={{
        position: 'fixed', bottom: 20, left: 20, zIndex: 60,
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--primary)', color: 'var(--primary-ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 20px rgba(0,217,255,0.35)',
      }}>
        {open
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          : <BotIcon size={24} />}
      </button>
    </>
  )
}

function BotIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 8V5M12 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
      <path d="M4 12H2M22 12h-2" />
    </svg>
  )
}
