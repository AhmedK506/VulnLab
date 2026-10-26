import { useState, useMemo, useEffect } from 'react'
import Topbar from '../components/Topbar.jsx'
import Toolbar from '../components/Toolbar.jsx'
import ScheduleModal from '../components/ScheduleModal.jsx'
import { listSchedules, deleteSchedule, updateSchedule, stopScheduleScan } from '../lib/manage.js'
import { formatDate } from '../lib/scans.js'

export default function Scheduled() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('next_asc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)  // schedule pending deletion

  function load() {
    listSchedules().then((r) => { setAll(r.schedules || []); setLoading(false) })
  }
  useEffect(() => {
    load()
    // Poll frequently while any schedule is running (to animate the ring),
    // otherwise poll slowly. Re-evaluated each tick.
    let timer
    const tick = () => {
      listSchedules().then((r) => {
        const list = r.schedules || []
        setAll(list)
        setLoading(false)
        const anyRunning = list.some((s) => s.status === 'running')
        timer = setTimeout(tick, anyRunning ? 3000 : 15000)
      }).catch(() => { timer = setTimeout(tick, 15000) })
    }
    timer = setTimeout(tick, 3000)
    return () => clearTimeout(timer)
  }, [])

  const list = useMemo(() => {
    let l = all.filter((s) => s.url.toLowerCase().includes(search.toLowerCase()))
    if (status !== 'all') l = l.filter((s) => s.status === status)
    l = [...l].sort((a, b) => {
      if (sort === 'next_asc') return a.next - b.next
      if (sort === 'next_desc') return b.next - a.next
      return a.url.localeCompare(b.url)
    })
    return l
  }, [all, search, status, sort])

  function openNew() { setEditing(null); setModalOpen(true) }
  function openEdit(s) { setEditing(s); setModalOpen(true) }
  function onSaved() { setModalOpen(false); setLoading(true); load() }
  async function remove(id) { await deleteSchedule(id); setLoading(true); load() }
  async function doConfirmedDelete() {
    if (!confirmDelete) return
    const id = confirmDelete.id
    setConfirmDelete(null)
    await deleteSchedule(id); setLoading(true); load()
  }
  async function stopScan(s, e) {
    e.stopPropagation()
    await stopScheduleScan(s.id)
    setLoading(true); load()
  }
  async function togglePause(s, e) {
    e.stopPropagation()
    await updateSchedule(s.id, { paused: !s.paused })
    setLoading(true); load()
  }

  const statusFilter = (
    <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: 130 }}>
      <option value="all">All statuses</option>
      <option value="pending">Pending</option>
      <option value="running">Running</option>
      <option value="done">Scan done</option>
    </select>
  )

  const scheduleBtn = (
    <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--primary)', color: 'var(--primary-ink)', fontSize: 13, fontWeight: 500, padding: '10px 14px' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      Schedule a scan
    </button>
  )

  return (
    <>
      <Topbar title="Scheduled scans" subtitle={loading ? 'Loading…' : `${all.length} schedules`} />
      <div style={{ padding: 26 }}>
        <Toolbar
          search={search} onSearch={setSearch}
          filters={statusFilter}
          sort={{ value: sort, options: [
            { value: 'next_asc', label: 'Next scan soonest' },
            { value: 'next_desc', label: 'Next scan latest' },
            { value: 'url', label: 'URL A–Z' },
          ] }}
          onSort={setSort}
          right={scheduleBtn}
        />

        {loading ? (
          <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>Loading schedules…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((s) => (
              <div key={s.id} onClick={() => openEdit(s)} style={{
                display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface)',
                border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary-dim)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ fontSize: 13.5, wordBreak: 'break-all' }}>{s.url}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>
                    {s.mode} · {s.repeat === 'Custom' ? `every ${s.intervalDays}d` : s.repeat} · next: {formatDate(s.next)}
                  </div>
                </div>
                <StatusLabel status={s.status} progress={s.progress} paused={s.paused} />
                {s.status === 'running' ? (
                  <button onClick={(e) => stopScan(s, e)} title="Stop scan" style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'transparent',
                    border: '0.5px solid var(--critical)', color: 'var(--critical)',
                    fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 8,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
                    Stop
                  </button>
                ) : (
                  <button onClick={(e) => togglePause(s, e)} title={s.paused ? 'Resume' : 'Pause'} style={{
                    background: 'transparent', color: s.paused ? 'var(--low)' : 'var(--text-dim)', width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {s.paused ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                    )}
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(s) }} title="Delete" style={{
                  background: 'transparent', color: 'var(--text-dim)', width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2m-1 0v14H9V6" /></svg>
                </button>
              </div>
            ))}
            {list.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 20 }}>No schedules yet. Click “Schedule a scan”.</div>}
          </div>
        )}
      </div>

      {modalOpen && <ScheduleModal onClose={() => setModalOpen(false)} onSaved={onSaved} existing={editing} />}

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(3,6,12,0.66)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: 400, maxWidth: '92vw', background: 'var(--surface)',
            border: '0.5px solid var(--border)', borderRadius: 14, padding: 24,
          }}>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Delete this schedule?</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
              This will permanently remove the scheduled scan for<br />
              <span className="mono" style={{ color: 'var(--text)' }}>{confirmDelete.url}</span>. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13.5, padding: '10px 16px',
              }}>Cancel</button>
              <button onClick={doConfirmedDelete} style={{
                background: 'var(--critical)', color: '#2a0810', fontSize: 13.5, fontWeight: 500, padding: '10px 16px',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ProgressRing({ percent }) {
  const size = 34, stroke = 3, r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.max(0, Math.min(100, percent)) / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--info)" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .4s' }} />
      </svg>
      <span className="mono" style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 8.5, color: 'var(--info)',
      }}>{Math.round(percent)}</span>
    </div>
  )
}

function StatusLabel({ status, progress, paused }) {
  if (status === 'running') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--info)' }}>
        <ProgressRing percent={progress || 0} />
        Running…
      </span>
    )
  }
  if (paused && status !== 'done') {
    const c = 'var(--text-dim)'
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c, border: `0.5px solid ${c}`, padding: '4px 10px', borderRadius: 20 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
        Paused
      </span>
    )
  }
  const map = {
    pending: { color: 'var(--medium)', label: 'Pending' },
    done: { color: 'var(--low)', label: 'Scan done' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: s.color, border: `0.5px solid ${s.color}`, padding: '4px 10px', borderRadius: 20 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {s.label}
    </span>
  )
}
