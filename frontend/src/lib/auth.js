// ============================================================
// AUTH — now backed by the real Flask backend.
// ------------------------------------------------------------
// Functions are async and return { ok, error } like before, so pages
// only need to `await` them. The JWT token and current user are cached
// in localStorage; the token is sent on every API request (see api.js).
// ============================================================

import { api, setToken, getToken } from './api.js'

const USER_KEY = 'vulnlab_user'

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function cacheUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export async function signup({ name, email, password }) {
  const res = await api.post('/auth/signup', { name, email, password })
  if (!res.ok) return { ok: false, error: res.error }
  setToken(res.data.token)
  cacheUser(res.data.user)
  return { ok: true }
}

export async function login({ email, password }) {
  const res = await api.post('/auth/login', { email, password })
  if (!res.ok) return { ok: false, error: res.error }
  setToken(res.data.token)
  cacheUser(res.data.user)
  return { ok: true }
}

export function logout() {
  setToken(null)
  localStorage.removeItem(USER_KEY)
}

export function currentUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) }
  catch { return null }
}

export function isAuthed() {
  return !!getToken()
}

export async function updateAccount({ newEmail, newPassword, name }) {
  const res = await api.patch('/auth/account', { newEmail, newPassword, name })
  if (!res.ok) return { ok: false, error: res.error }
  setToken(res.data.token)
  cacheUser(res.data.user)
  return { ok: true }
}
