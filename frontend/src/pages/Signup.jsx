import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { signup } from '../lib/auth.js'

// Password policy rules — each has a test function.
const RULES = [
  { label: 'At least 6 characters', test: (p) => p.length >= 6 },
  { label: 'At least 1 capital letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'At least 1 number', test: (p) => /[0-9]/.test(p) },
  { label: 'At least 1 symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const allMet = RULES.every((r) => r.test(password))

  async function submit() {
    setError('')
    if (!allMet) { setError('Your password does not meet all the requirements below.'); return }
    const res = await signup({ name, email, password })
    if (res.ok) navigate('/')
    else setError(res.error)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 360, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Logo size={34} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)', marginBottom: 26 }}>
          Create your account
        </div>

        {error && (
          <div style={{ background: 'rgba(255,59,92,0.12)', border: '0.5px solid var(--critical)', color: '#ffb3c1', fontSize: 12.5, padding: '9px 12px', borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" style={{ width: '100%', margin: '6px 0 16px' }} />

        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', margin: '6px 0 16px' }} />

        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Create a password" style={{ width: '100%', margin: '6px 0 10px' }} />

        <div style={{ marginBottom: 20 }}>
          {RULES.map((r, i) => {
            const met = r.test(password)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '3px 0', color: met ? 'var(--low)' : 'var(--critical)' }}>
                {met ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                )}
                {r.label}
              </div>
            )
          })}
        </div>

        <button onClick={submit} disabled={!allMet} style={{
          width: '100%',
          background: allMet ? 'var(--primary)' : 'var(--surface-2)',
          color: allMet ? 'var(--primary-ink)' : 'var(--text-dim)',
          fontSize: 14, fontWeight: 500, padding: 12,
          cursor: allMet ? 'pointer' : 'not-allowed',
        }}>
          Create account
        </button>

        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 18 }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
