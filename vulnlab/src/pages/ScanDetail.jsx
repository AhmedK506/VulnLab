import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import { Card, SeverityBadge } from '../components/ui.jsx'
import { getScan, formatDate, scansToCSV, downloadCSV } from '../lib/scans.js'

const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

export default function ScanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getScan(id).then((r) => { setScan(r.scan); setLoading(false) })
  }, [id])

  if (loading) {
    return (<><Topbar title="Scan detail" /><div style={{ padding: 26, color: 'var(--text-dim)' }}>Loading…</div></>)
  }

  if (!scan) {
    return (
      <>
        <Topbar title="Scan not found" />
        <div style={{ padding: 26 }}>
          <button onClick={() => navigate('/results')} style={{ background: 'var(--surface-2)', color: 'var(--text)', padding: '10px 14px' }}>← Back to results</button>
        </div>
      </>
    )
  }

  const vulns = [...scan.vulns].sort((a, b) => order[a.severity] - order[b.severity])
  const stats = [
    { label: 'Critical', value: scan.counts.critical, color: 'var(--critical)' },
    { label: 'High', value: scan.counts.high, color: 'var(--high)' },
    { label: 'Medium', value: scan.counts.medium, color: 'var(--medium)' },
    { label: 'Low', value: scan.counts.low, color: 'var(--low)' },
  ]

  return (
    <>
      <Topbar title="Scan detail" subtitle={`${scan.url} · ${scan.mode} · ${formatDate(scan.date)}`} />
      <div style={{ padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => navigate('/results')} style={{ background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, padding: '9px 14px' }}>← Back to results</button>
          <button onClick={() => downloadCSV('scan-' + scan.id + '.csv', scansToCSV([scan]))} style={{
            display: 'flex', alignItems: 'center', gap: 7, background: 'transparent',
            border: '0.5px solid var(--border)', color: 'var(--text)', fontSize: 13, padding: '9px 14px',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" /></svg>
            Export CSV
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{s.label}</div>
              <div className="mono" style={{ fontSize: 26, fontWeight: 500, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {scan.aiSummary && (
          <Card style={{ marginBottom: 12, borderLeft: '3px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" /></svg>
              <div style={{ fontSize: 14, fontWeight: 500 }}>In plain English</div>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text)' }}>{scan.aiSummary}</div>
          </Card>
        )}

        <Card>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Detected vulnerabilities</div>
          {vulns.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No vulnerabilities found.</div>}
          {vulns.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '16px 0', borderTop: i > 0 ? '0.5px solid var(--border)' : 'none' }}>
              <SeverityBadge level={v.severity}>{v.score}</SeverityBadge>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{v.name}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--primary)', margin: '2px 0 8px', wordBreak: 'break-all' }}>{v.location}</div>
                {v.ai ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <AiLine label="What this means" text={v.ai.what} />
                    <AiLine label="Why it matters" text={v.ai.why} />
                    <AiLine label="What to do" text={v.ai.fix} />
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>{v.desc}</div>
                )}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}

function AiLine({ label, text }) {
  if (!text) return null
  return (
    <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
      <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{label}: </span>
      <span style={{ color: 'var(--text-dim)' }}>{text}</span>
    </div>
  )
}
