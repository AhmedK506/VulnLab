import { useState } from 'react'
import Modal, { Field, PrimaryButton } from './Modal.jsx'
import { createSchedule, updateSchedule } from '../lib/manage.js'
import { getUserTimezone } from '../lib/scans.js'
import { currentUser, validateEmail } from '../lib/auth.js'

const MODES = ['Quick', 'Deep', 'Targeted']
const REPEATS = ['Once', 'Daily', 'Weekly', 'Monthly', 'Custom']

// Resolve the timezone to use. Prefer the value cached from the user's saved
// settings (so it is correct even if the settings fetch hasn't repopulated the
// in-memory value yet); fall back to the app value, then the browser.
function resolveTz() {
  try {
    const cached = JSON.parse(localStorage.getItem('vulnlab_settings_tz'))
    if (cached) return cached
  } catch {}
  return getUserTimezone() || 'Asia/Kuala_Lumpur'
}

// --- timezone-correct conversions ---------------------------------------
// The datetime-local input holds a "wall clock" value (what the user typed),
// which we treat as being in the user's SELECTED timezone (from settings).

// Get the offset (in minutes) of a timezone at a given instant.
function tzOffsetMinutes(tz, date) {
  // format the date in the target tz and in UTC, then diff them
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const parts = Object.fromEntries(dtf.formatToParts(date).map(p => [p.type, p.value]))
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return (asUTC - date.getTime()) / 60000
}

// Convert a "wall clock" string (YYYY-MM-DDTHH:mm) in tz -> UTC epoch ms
function wallClockToEpoch(str, tz) {
  if (!str) return Date.now() + 5 * 60000
  const [datePart, timePart] = str.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)
  // first guess: treat the wall-clock as if it were UTC
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  // then subtract the tz offset at that instant to get the true UTC epoch
  const offset = tzOffsetMinutes(tz, new Date(guess))
  return guess - offset * 60000
}

// Convert a UTC epoch ms -> "wall clock" string in tz for the input's value
function epochToWallClock(ms, tz) {
  const d = ms ? new Date(ms) : new Date(Date.now() + 5 * 60000)
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
  const parts = Object.fromEntries(dtf.formatToParts(d).map(p => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export default function ScheduleModal({ onClose, onSaved, existing }) {
  const tz = resolveTz()
  const [url, setUrl] = useState(existing?.url || '')
  const [mode, setMode] = useState(existing?.mode || 'Deep')
  const [repeat, setRepeat] = useState(existing?.repeat || 'Weekly')
  const [intervalDays, setIntervalDays] = useState(existing?.intervalDays || 3)
  const [runAtLocal, setRunAtLocal] = useState(epochToWallClock(existing?.next, tz))
  const [email, setEmail] = useState(existing?.email || currentUser()?.email || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setError('')
    if (!/^https?:\/\/.+/.test(url.trim())) { setError('Enter a valid URL starting with http:// or https://'); return }
    if (repeat === 'Custom' && (!intervalDays || intervalDays < 1)) {
      setError('Custom interval must be at least 1 day.'); return
    }
    const runAt = wallClockToEpoch(runAtLocal, tz)

    if (email && !validateEmail(email)) { setError('Enter a valid email or leave it blank.'); return }
    const payload = { url: url.trim(), mode, repeat, intervalDays: Number(intervalDays), runAt, email: email.trim() }
    setSaving(true)
    const res = existing
      ? await updateSchedule(existing.id, payload)
      : await createSchedule(payload)
    setSaving(false)
    if (!res.ok) { setError(res.error); return }
    onSaved()
  }

  return (
    <Modal title={existing ? 'Edit schedule' : 'Schedule a scan'} onClose={onClose} width={480}>
      {error && (
        <div style={{ background: 'rgba(255,59,92,0.12)', border: '0.5px solid var(--critical)', color: '#ffb3c1', fontSize: 12.5, padding: '9px 12px', borderRadius: 8, marginBottom: 16 }}>{error}</div>
      )}

      <Field label="Target website URL">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" style={{ width: '100%' }} />
      </Field>

      <Field label="Email to send the report to">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%' }} />
      </Field>

      <Field label="Scan mode">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {MODES.map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              background: mode === m ? 'var(--surface-2)' : 'transparent',
              border: `0.5px solid ${mode === m ? 'var(--primary)' : 'var(--border)'}`,
              color: mode === m ? 'var(--primary)' : 'var(--text)', padding: '10px 8px', fontSize: 13, fontWeight: 500,
            }}>{m}</button>
          ))}
        </div>
      </Field>

      <Field label={`Start date & time (${tz})`}>
        <input type="datetime-local" value={runAtLocal} onChange={(e) => setRunAtLocal(e.target.value)} style={{ width: '100%' }} />
      </Field>

      <Field label="Repeat">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
          {REPEATS.map((r) => (
            <button key={r} onClick={() => setRepeat(r)} style={{
              background: repeat === r ? 'var(--surface-2)' : 'transparent',
              border: `0.5px solid ${repeat === r ? 'var(--primary)' : 'var(--border)'}`,
              color: repeat === r ? 'var(--primary)' : 'var(--text)', padding: '9px 4px', fontSize: 12, fontWeight: 500,
            }}>{r}</button>
          ))}
        </div>
      </Field>

      {repeat === 'Custom' && (
        <Field label="Run every (days)">
          <input type="number" min="1" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} style={{ width: '100%' }} />
        </Field>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 14 }}>
        {repeat === 'Once'
          ? 'This scan will run once at the chosen time.'
          : repeat === 'Custom'
            ? `Repeats every ${intervalDays || 1} day(s) from the start time.`
            : `Repeats ${repeat.toLowerCase()} from the start time.`}
      </div>

      <PrimaryButton onClick={save} style={{ width: '100%' }}>
        {saving ? 'Saving…' : (existing ? 'Save changes' : 'Create schedule')}
      </PrimaryButton>
    </Modal>
  )
}
