// ============================================================
// SCHEDULES + SETTINGS — backed by the Flask backend (Stage 3).
// Replaces the mock localStorage versions in store.js.
// ============================================================

import { api } from './api.js'

// ---------- schedules ----------
export async function listSchedules() {
  const res = await api.get('/schedules')
  if (!res.ok) return { ok: false, error: res.error, schedules: [] }
  return { ok: true, schedules: res.data.schedules }
}

export async function createSchedule(payload) {
  const res = await api.post('/schedules', payload)
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, schedule: res.data.schedule }
}

export async function updateSchedule(id, patch) {
  const res = await api.patch('/schedules/' + id, patch)
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, schedule: res.data.schedule }
}

export async function deleteSchedule(id) {
  const res = await api.del('/schedules/' + id)
  return { ok: res.ok, error: res.error }
}

export async function stopScheduleScan(id) {
  const res = await api.post('/schedules/' + id + '/stop', {})
  return { ok: res.ok, error: res.error }
}

// ---------- settings ----------
export async function getSettings() {
  const res = await api.get('/settings')
  if (!res.ok) return { ok: false, error: res.error, settings: null }
  return { ok: true, settings: res.data.settings }
}

export async function saveSettings(patch) {
  const res = await api.patch('/settings', patch)
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, settings: res.data.settings }
}

// ---------- assistant ----------
export async function askAssistant(message) {
  const res = await api.post('/assistant', { message })
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, reply: res.data.reply }
}
