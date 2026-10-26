// ============================================================
// SCANS — backed by the Flask backend (Stage 2).
// Start a scan (background job), poll its status, list, and fetch detail.
// Schedules/settings still live in store.js (mock) until Stage 3.
// ============================================================

import { api } from './api.js'

export async function startScan({ url, mode, email }) {
  const res = await api.post('/scans', { url, mode, email })
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, jobId: res.data.job_id }
}

export async function pollScan(jobId) {
  const res = await api.get('/scans/status/' + jobId)
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, ...res.data } // { status, percent, phase, scan_id, error }
}

export async function listScans() {
  const res = await api.get('/scans')
  if (!res.ok) return { ok: false, error: res.error, scans: [] }
  return { ok: true, scans: res.data.scans }
}

export async function getScan(scanId) {
  const res = await api.get('/scans/' + scanId)
  if (!res.ok) return { ok: false, error: res.error, scan: null }
  return { ok: true, scan: res.data.scan }
}

// ---------- shared helpers (used by pages) ----------

// The user's timezone, cached so all date formatting is consistent.
// Initialize from the persisted setting if present, else the browser, else
// the app default. This avoids a wrong (UTC) value before settings load.
function _initialTz() {
  try {
    const cached = JSON.parse(localStorage.getItem('vulnlab_settings_tz'))
    if (cached) return cached
  } catch {}
  // Default to the app's default timezone rather than the browser's, so times
  // are consistent before settings load. Settings will override this on load.
  return 'Asia/Kuala_Lumpur'
}
let _userTz = _initialTz()

const VALID_TZS = [
  'Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Dubai', 'Asia/Kolkata',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'UTC',
]

export function setUserTimezone(tz) {
  // Only accept a known-good timezone; never let a blank/bad value poison things.
  if (tz && VALID_TZS.includes(tz)) {
    _userTz = tz
    try { localStorage.setItem('vulnlab_settings_tz', JSON.stringify(tz)) } catch {}
  }
}
export function getUserTimezone() {
  return _userTz
}

function _resolveTzForDisplay() {
  try {
    const cached = JSON.parse(localStorage.getItem('vulnlab_settings_tz'))
    if (cached) return cached
  } catch {}
  return 'Asia/Kuala_Lumpur'
}

export function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const tz = _resolveTzForDisplay()
  try {
    return d.toLocaleString('en-US', {
      timeZone: tz,
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch {
    return d.toLocaleString()
  }
}

export function scansToCSV(scans) {
  const rows = [['Scan URL', 'Scan date', 'Mode', 'Vulnerability', 'Severity', 'Risk score', 'Location']]
  scans.forEach((s) => {
    ;(s.vulns || []).forEach((v) => {
      rows.push([s.url, formatDate(s.date), s.mode, v.name, v.severity, v.score, v.location])
    })
  })
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
