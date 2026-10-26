import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import Toolbar from '../components/Toolbar.jsx'
import { listScans, formatDate, scansToCSV, downloadCSV } from '../lib/scans.js'

export default function Results() {
  const navigate = useNavigate()
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('all')
  const [sort, setSort] = useState('date_desc')

  useEffect(() => {
    listScans().then((r) => { setAll(r.scans || []); setLoading(false) })
  }, [])

  const scans = useMemo(() => {
    let list = all.filter((s) => s.url.toLowerCase().includes(search.toLowerCase()))
    if (mode !== 'all') list = list.filter((s) => s.mode === mode)
    list = [...list].sort((a, b) => {
      if (sort === 'date_desc') return b.date - a.date
      if (sort === 'date_asc') return a.date - b.date
      if (sort === 'findings_desc') return (b.vulns?.length || 0) - (a.vulns?.length || 0)
      return a.url.localeCompare(b.url)
    })
    return list
  }, [all, search, mode, sort])

  const modeFilter = (
    <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ minWidth: 130 }}>
      <option value="all">All modes</option>
      <option value="Quick">Quick</option>
      <option value="Deep">Deep</option>
      <option value="Targeted">Targeted</option>
    </select>
  )

  const exportBtn = (
    <button onClick={() => downloadCSV('vulnlab-scans.csv', scansToCSV(scans))} style={{
      display: 'flex', alignItems: 'center', gap: 7, background: 'transparent',
      border: '0.5px solid var(--border)', color: 'var(--text)', fontSize: 13, padding: '10px 14px',
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
      </svg>
      Export CSV
    </button>
  )

  return (
    <>
      <Topbar title="Scan results" subtitle={loading ? 'Loading…' : `${all.length} scans recorded`} />
      <div style={{ padding: 26 }}>
        <Toolbar
          search={search} onSearch={setSearch}
          filters={modeFilter}
          sort={{ value: sort, options: [
            { value: 'date_desc', label: 'Newest first' },
            { value: 'date_asc', label: 'Oldest first' },
            { value: 'findings_desc', label: 'Most findings' },
            { value: 'url', label: 'URL A–Z' },
          ] }}
          onSort={setSort}
          right={exportBtn}
        />

        {loading ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>Loading scans…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
            {scans.map((s) => (
              <div key={s.id} onClick={() => navigate('/results/' + s.id)} style={{
                background: 'var(--surface)', border: '0.5px solid var(--border)',
                borderRadius: 12, padding: 16, cursor: 'pointer',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary-dim)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div className="mono" style={{ fontSize: 13.5, marginBottom: 4, wordBreak: 'break-all' }}>{s.url}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 12 }}>{formatDate(s.date)}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', border: '0.5px solid var(--border)', padding: '2px 7px', borderRadius: 5 }}>{s.mode}</span>
                  {s.counts.critical > 0 && <Pill c="var(--critical)">{s.counts.critical} critical</Pill>}
                  {s.counts.high > 0 && <Pill c="var(--high)">{s.counts.high} high</Pill>}
                  {s.counts.medium > 0 && <Pill c="var(--medium)">{s.counts.medium} medium</Pill>}
                  {s.counts.low > 0 && <Pill c="var(--low)">{s.counts.low} low</Pill>}
                </div>
              </div>
            ))}
            {scans.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>No scans yet. Click “New scan” to run one.</div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function Pill({ c, children }) {
  return <span className="mono" style={{ fontSize: 10.5, color: c, border: `0.5px solid ${c}`, padding: '2px 6px', borderRadius: 5 }}>{children}</span>
}
