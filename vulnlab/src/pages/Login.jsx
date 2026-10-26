import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { login } from '../lib/auth.js'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    const res = await login({ email, password })
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
          Continuous, risk-aware vulnerability assessment
        </div>

        {error && (
          <div style={{ background: 'rgba(255,59,92,0.12)', border: '0.5px solid var(--critical)', color: '#ffb3c1', fontSize: 12.5, padding: '9px 12px', borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', margin: '6px 0 16px' }} />

        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="••••••••" style={{ width: '100%', margin: '6px 0 22px' }} />

        <button onClick={submit} style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-ink)', fontSize: 14, fontWeight: 500, padding: 12 }}>
          Sign in
        </button>

        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 18 }}>
          No account? <Link to="/signup" style={{ color: 'var(--primary)' }}>Create one</Link>
        </div>
      </div>
    </div>
  )
}
