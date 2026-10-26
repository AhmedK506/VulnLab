import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import { Card, SeverityBadge } from '../components/ui.jsx'
import { listScans, formatDate } from '../lib/scans.js'

const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

export default function Dashboard() {
  const navigate = useNavigate()
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listScans().then((r) => {
      setScans([...(r.scans || [])].sort((a, b) => b.date - a.date))
      setLoading(false)
    })
  }, [])

  const totals = { critical: 0, high: 0, medium: 0, low: 0 }
  scans.forEach((s) => Object.keys(totals).forEach((k) => (totals[k] += s.counts[k] || 0)))
  const stats = [
    { label: 'Critical', value: totals.critical, color: 'var(--critical)' },
    { label: 'High', value: totals.high, color: 'var(--high)' },
    { label: 'Medium', value: totals.medium, color: 'var(--medium)' },
    { label: 'Low', value: totals.low, color: 'var(--low)' },
  ]

  const topRisks = scans
    .flatMap((s) => s.vulns.map((v) => ({ ...v, url: s.url })))
    .sort((a, b) => (order[a.severity] - order[b.severity]) || (b.score - a.score))
    .slice(0, 4)

  const recent = scans.slice(0, 4)
  const latest = scans[0]

  const trendPts = [...scans].reverse().map((s) => s.vulns.length)
  const maxT = Math.max(1, ...trendPts)
  const line = trendPts.map((t, i) => {
    const x = trendPts.length > 1 ? (i / (trendPts.length - 1)) * 400 : 200
    const y = 150 - (t / maxT) * 130 - 10
    return `${x},${y}`
  }).join(' ')

  return (
    <>
      <Topbar title="Security overview" subtitle={latest ? `Last scan · ${latest.url} · ${formatDate(latest.date)}` : 'No scans yet'} />
      <div style={{ padding: 26 }}>
        {loading ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>Loading…</div>
        ) : scans.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '56px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No scans yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Click “New scan” in the top right to run your first assessment.</div>
          </Card>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {stats.map((s) => (
                <div key={s.label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{s.label}</div>
                  <div className="mono" style={{ fontSize: 26, fontWeight: 500, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 12 }}>
              <Card>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>Findings over time</div>
                <svg width="100%" height="150" viewBox="0 0 400 150" preserveAspectRatio="none">
                  <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth="2" />
                </svg>
              </Card>

              <Card>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Top risks</div>
                {topRisks.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < topRisks.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                    <SeverityBadge level={r.severity}>{r.score}</SeverityBadge>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13 }}>{r.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.location}</div>
                    </div>
                  </div>
                ))}
                {topRisks.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>No findings.</div>}
              </Card>
            </div>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Recent scans</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'left' }}>
                    <th style={{ padding: '10px 0', fontWeight: 400 }}>Target</th>
                    <th style={{ fontWeight: 400 }}>Mode</th>
                    <th style={{ fontWeight: 400 }}>Findings</th>
                    <th style={{ fontWeight: 400, textAlign: 'right' }}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr key={s.id} onClick={() => navigate('/results/' + s.id)} style={{ borderTop: '0.5px solid var(--border)', cursor: 'pointer' }}>
                      <td className="mono" style={{ padding: '11px 0' }}>{s.url}</td>
                      <td>{s.mode}</td>
                      <td className="mono">{s.vulns.length}</td>
                      <td className="mono" style={{ textAlign: 'right', color: 'var(--text-dim)' }}>{formatDate(s.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
