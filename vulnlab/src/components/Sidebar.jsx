import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'

const nav = [
  { to: '/', label: 'Dashboard', icon: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm9 0h6v-9h-6v9zm0-16v5h6V4h-6z' },
  { to: '/scan', label: 'New scan', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4v6l4 2' },
  { to: '/results', label: 'Scan results', icon: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/scheduled', label: 'Scheduled', icon: 'M8 2v3M16 2v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z' },
  { to: '/trends', label: 'Compare scans', icon: 'M3 17l6-6 4 4 7-7M14 8h5v5' },
  { to: '/reports', label: 'Reports', icon: 'M6 2h9l5 5v15H6V2zM15 2v5h5' },
  { to: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 00-1.7-1L14.5 3h-4l-.3 2.5a7 7 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.4 1 2-3.5-2-1.5c.06-.3.1-.66.1-1z' },
]

const linkStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  padding: '10px 12px',
  borderRadius: 'var(--radius)',
  fontSize: 13.5,
  color: isActive ? 'var(--primary)' : 'var(--text-dim)',
  background: isActive ? 'var(--surface-2)' : 'transparent',
  marginBottom: 2,
})

export default function Sidebar() {
  return (
    <aside style={{
      width: 220,
      background: 'var(--surface)',
      borderRight: '0.5px solid var(--border)',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '4px 8px 22px' }}>
        <Logo size={28} />
      </div>
      <nav>
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} style={linkStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', padding: '12px 10px', fontSize: 11, color: 'var(--text-dim)' }}>
        <span className="mono">v0.1.0 · prototype</span>
      </div>
    </aside>
  )
}
