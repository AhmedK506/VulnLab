import { useState, useEffect, useMemo } from 'react'
import Topbar from '../components/Topbar.jsx'
import { Card, SeverityBadge } from '../components/ui.jsx'
import { listScans, formatDate } from '../lib/scans.js'

// A vulnerability's identity for comparison: name + location
const keyOf = (v) => `${v.name} @ ${v.location}`

export default function Trends() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [aId, setAId] = useState('')
  const [bId, setBId] = useState('')

  useEffect(() => {
    listScans().then((r) => {
      const list = [...(r.scans || [])].sort((a, b) => b.date - a.date)
      setScans(list)
      // default: newest two scans
      if (list[1]) { setAId(String(list[1].id)); setBId(String(list[0].id)) }
      else if (list[0]) { setBId(String(list[0].id)) }
      setLoading(false)
    })
  }, [])

  const scanA = scans.find((s) => String(s.id) === aId)
  const scanB = scans.find((s) => String(s.id) === bId)

  const diff = useMemo(() => {
    if (!scanA || !scanB) return null
    const aMap = new Map(scanA.vulns.map((v) => [keyOf(v), v]))
    const bMap = new Map(scanB.vulns.map((v) => [keyOf(v), v]))
    const fixed = [], added = [], still = []
    for (const [k, v] of aMap) {
      if (bMap.has(k)) still.push(bMap.get(k))
      else fixed.push(v)          // in A, not in B -> fixed
    }
    for (const [k, v] of bMap) {
      if (!aMap.has(k)) added.push(v)  // in B, not in A -> new
    }
    return { fixed, added, still }
  }, [scanA, scanB])

  if (loading) {
    return (<><Topbar title="Compare scans" /><div style={{ padding: 26, color: 'var(--text-dim)' }}>Loading…</div></>)
  }

  if (scans.length < 2) {
    return (
      <>
        <Topbar title="Compare scans" subtitle="Scan → fix → rescan → verify" />
        <div style={{ padding: 26 }}>
          <Card><div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
            You need at least two scans to compare. Run a scan, make changes to the site, then scan again — this page will show what changed.
          </div></Card>
        </div>
      </>
    )
  }

  const ScanPicker = ({ label, value, onChange, exclude }) => (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: '100%' }}>
        {scans.map((s) => (
          <option key={s.id} value={String(s.id)} disabled={String(s.id) === exclude}>
            {s.url} — {formatDate(s.date)} ({s.vulns.length} findings)
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <>
      <Topbar title="Compare scans" subtitle="See what changed between two scans" />
      <div style={{ padding: 26 }}>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
            Pick two scans to compare — for example, a scan before you fixed issues and one after.
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <ScanPicker label="Scan A (earlier / before)" value={aId} onChange={setAId} exclude={bId} />
            <div style={{ color: 'var(--text-dim)', paddingBottom: 10 }}>→</div>
            <ScanPicker label="Scan B (later / after)" value={bId} onChange={setBId} exclude={aId} />
          </div>
        </Card>

        {scanA && scanB && diff && (
          <>
            {/* side-by-side counts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <CountsCard title="Scan A" scan={scanA} />
              <CountsCard title="Scan B" scan={scanB} />
            </div>

            {/* summary line */}
            <Card style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                <Stat n={diff.fixed.length} label="Fixed" color="var(--low)" />
                <Stat n={diff.added.length} label="New" color="var(--critical)" />
                <Stat n={diff.still.length} label="Still present" color="var(--medium)" />
              </div>
            </Card>

            <DiffList title="Fixed (were in A, gone in B)" items={diff.fixed} color="var(--low)" empty="Nothing was fixed between these scans." />
            <DiffList title="New (appeared in B)" items={diff.added} color="var(--critical)" empty="No new issues appeared." />
            <DiffList title="Still present (in both)" items={diff.still} color="var(--medium)" empty="No shared issues." />
          </>
        )}
      </div>
    </>
  )
}

function CountsCard({ title, scan }) {
  const c = scan.counts
  return (
    <Card>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{title}</div>
      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 12, wordBreak: 'break-all' }}>{scan.url} · {formatDate(scan.date)}</div>
      <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
        <span style={{ color: 'var(--critical)' }}>{c.critical} critical</span>
        <span style={{ color: 'var(--high)' }}>{c.high} high</span>
        <span style={{ color: 'var(--medium)' }}>{c.medium} medium</span>
        <span style={{ color: 'var(--low)' }}>{c.low} low</span>
      </div>
    </Card>
  )
}

function Stat({ n, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="mono" style={{ fontSize: 20, fontWeight: 600, color }}>{n}</span>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
    </div>
  )
}

function DiffList({ title, items, color, empty }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color }}>{title} · {items.length}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{empty}</div>
      ) : items.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: i > 0 ? '0.5px solid var(--border)' : 'none' }}>
          <SeverityBadge level={v.severity}>{v.score}</SeverityBadge>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13 }}>{v.name}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{v.location}</div>
          </div>
        </div>
      ))}
    </Card>
  )
}
