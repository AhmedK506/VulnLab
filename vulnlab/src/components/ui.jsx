import Topbar from './Topbar.jsx'

const severityMap = {
  critical: { color: 'var(--critical)', ink: '#4A1B0C' },
  high: { color: 'var(--high)', ink: '#4A1B0C' },
  medium: { color: 'var(--medium)', ink: '#412402' },
  low: { color: 'var(--low)', ink: '#0f3a1a' },
  info: { color: 'var(--info)', ink: '#042C33' },
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 12,
      padding: 18,
      ...style,
    }}>
      {children}
    </div>
  )
}

export function SeverityBadge({ level, children }) {
  const s = severityMap[level] || severityMap.info
  return (
    <span className="mono" style={{
      background: s.color, color: s.ink,
      fontSize: 11, fontWeight: 500,
      padding: '2px 7px', borderRadius: 5,
    }}>
      {children}
    </span>
  )
}

export function StubPage({ title, subtitle, icon, note }) {
  return (
    <>
      <Topbar title={title} subtitle={subtitle} />
      <div style={{ padding: 26 }}>
        <Card style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center', padding: '64px 24px',
          borderStyle: 'dashed',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--surface-2)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 18,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)"
              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-dim)', maxWidth: 380 }}>{note}</div>
        </Card>
      </div>
    </>
  )
}
