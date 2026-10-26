import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar.jsx'
import Toolbar from '../components/Toolbar.jsx'
import { listScans, formatDate, scansToCSV, downloadCSV } from '../lib/scans.js'

export default function Reports() {
  const navigate = useNavigate()
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [risk, setRisk] = useState('all')
  const [range, setRange] = useState('all')
  const [sort, setSort] = useState('date_desc')

  useEffect(() => {
    listScans().then((r) => { setAll(r.scans || []); setLoading(false) })
  }, [])

  const reports = useMemo(() => {
    let l = all.filter((s) => s.url.toLowerCase().includes(search.toLowerCase()))
    if (risk === 'critical') l = l.filter((s) => s.counts.critical > 0)
    if (risk === 'high') l = l.filter((s) => s.counts.high > 0)
    if (risk === 'clean') l = l.filter((s) => s.counts.critical === 0 && s.counts.high === 0)
    if (range !== 'all') {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[range]
      const cutoff = Date.now() - days * 86400000
      l = l.filter((s) => s.date >= cutoff)
    }
    l = [...l].sort((a, b) => {
      if (sort === 'date_desc') return b.date - a.date
      if (sort === 'date_asc') return a.date - b.date
      return b.counts.critical - a.counts.critical
    })
    return l
  }, [all, search, risk, range, sort])

  const dateFilter = (
    <select value={range} onChange={(e) => setRange(e.target.value)} style={{ minWidth: 140 }}>
      <option value="all">All time</option>
      <option value="7d">Last 7 days</option>
      <option value="30d">Last month</option>
      <option value="90d">Last 3 months</option>
    </select>
  )

  const riskFilter = (
    <select value={risk} onChange={(e) => setRisk(e.target.value)} style={{ minWidth: 150 }}>
      <option value="all">All reports</option>
      <option value="critical">Has critical</option>
      <option value="high">Has high</option>
      <option value="clean">No critical/high</option>
    </select>
  )

  const exportBtn = (
    <button onClick={() => downloadCSV('vulnlab-reports.csv', scansToCSV(reports))} style={{
      display: 'flex', alignItems: 'center', gap: 7, background: 'transparent',
      border: '0.5px solid var(--border)', color: 'var(--text)', fontSize: 13, padding: '10px 14px',
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" /></svg>
      Export CSV
    </button>
  )

  return (
    <>
      <Topbar title="Reports" subtitle={loading ? 'Loading…' : `${all.length} reports generated`} />
      <div style={{ padding: 26 }}>
        <Toolbar
          search={search} onSearch={setSearch}
          filters={<>{dateFilter}{riskFilter}</>}
          sort={{ value: sort, options: [
            { value: 'date_desc', label: 'Newest first' },
            { value: 'date_asc', label: 'Oldest first' },
            { value: 'critical', label: 'Most critical' },
          ] }}
          onSort={setSort}
          right={exportBtn}
        />

        {loading ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>Loading reports…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.map((s) => (
              <div key={s.id} onClick={() => navigate('/results/' + s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface)',
                border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary-dim)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h9l5 5v15H6zM15 2v5h5" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ fontSize: 13.5, wordBreak: 'break-all' }}>{s.url}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>
                    {formatDate(s.date)} · {s.mode} · sent to {s.email || 'n/a'}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.vulns.length} findings</div>
              </div>
            ))}
            {reports.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>No reports yet.</div>}
          </div>
        )}
      </div>
    </>
  )
}
