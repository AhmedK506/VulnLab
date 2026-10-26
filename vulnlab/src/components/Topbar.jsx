import { useNewScan } from './Layout.jsx'

export default function Topbar({ title, subtitle }) {
  const openScan = useNewScan()
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 26px', borderBottom: '0.5px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 19, fontWeight: 500 }}>{title}</div>
        {subtitle && (
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={{ background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text-dim)', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
          </svg>
        </button>
        <button onClick={openScan} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary)', color: 'var(--primary-ink)', fontSize: 13.5, fontWeight: 500, padding: '10px 16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v6l4 2" />
          </svg>
          New scan
        </button>
      </div>
    </header>
  )
}
