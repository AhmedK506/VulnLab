import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal, { Field, PrimaryButton } from './Modal.jsx'
import { startScan, pollScan } from '../lib/scans.js'
import { validateEmail, currentUser } from '../lib/auth.js'

const MODES = [
  { key: 'Quick', desc: 'Homepage + nearby pages, fast' },
  { key: 'Deep', desc: 'Crawls the whole site, thorough' },
  { key: 'Targeted', desc: 'Only the exact URL you enter' },
]

export default function ScanModal({ onClose }) {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState(currentUser()?.email || '')
  const [mode, setMode] = useState('Deep')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [percent, setPercent] = useState(0)
  const [phase, setPhase] = useState('')
  const timer = useRef(null)

  async function start() {
    setError('')
    if (!/^https?:\/\/.+/.test(url.trim())) { setError('Enter a valid URL starting with http:// or https://'); return }
    if (!validateEmail(email)) { setError('Enter a valid email to receive the report.'); return }

    setRunning(true); setPercent(0); setPhase('starting')
    const res = await startScan({ url: url.trim(), mode, email: email.trim() })
    if (!res.ok) { setError(res.error); setRunning(false); return }

    // poll every 2s until done/failed
    timer.current = setInterval(async () => {
      const p = await pollScan(res.jobId)
      if (!p.ok) return
      setPercent(p.percent || 0)
      setPhase(p.phase || '')
      if (p.status === 'completed') {
        clearInterval(timer.current)
        onClose()
        navigate('/results/' + p.scan_id)
      } else if (p.status === 'failed') {
        clearInterval(timer.current)
        setError(p.error || 'Scan failed.')
        setRunning(false)
      }
    }, 2000)
  }

  return (
    <Modal title="New scan" onClose={running ? () => {} : onClose} width={460}>
      {error && (
        <div style={{ background: 'rgba(255,59,92,0.12)', border: '0.5px solid var(--critical)', color: '#ffb3c1', fontSize: 12.5, padding: '9px 12px', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {running ? (
        <div style={{ padding: '10px 0' }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
            Scanning {url} — {phase}
          </div>
          <div style={{ height: 10, background: 'var(--bg)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${percent}%`, height: '100%', background: 'var(--primary)', transition: 'width .4s' }} />
          </div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, textAlign: 'right' }}>{percent}%</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 14 }}>
            You can keep this open — you'll be taken to the results when it finishes.
          </div>
        </div>
      ) : (
        <>
          <Field label="Target website URL">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" style={{ width: '100%' }} />
          </Field>

          <Field label="Email to send the report to">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%' }} />
          </Field>

          <Field label="Scan mode">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {MODES.map((m) => (
                <button key={m.key} onClick={() => setMode(m.key)} style={{
                  background: mode === m.key ? 'var(--surface-2)' : 'transparent',
                  border: `0.5px solid ${mode === m.key ? 'var(--primary)' : 'var(--border)'}`,
                  color: mode === m.key ? 'var(--primary)' : 'var(--text)',
                  padding: '10px 8px', textAlign: 'left',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.key}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 2 }}>{m.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}>
              All modes test for the same vulnerabilities (SQL injection, XSS, security headers, misconfigurations). The mode only changes <strong>how much of the site</strong> is scanned.
            </div>
          </Field>

          <PrimaryButton onClick={start} style={{ width: '100%', marginTop: 6 }}>Start scan</PrimaryButton>
        </>
      )}
    </Modal>
  )
}
