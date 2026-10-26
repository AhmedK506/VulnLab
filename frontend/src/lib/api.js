// ============================================================
// API CLIENT — talks to the Flask backend
// ------------------------------------------------------------
// Base URL of the backend. If you deploy later, change this or
// read it from an environment variable.
// ============================================================

const BASE = 'http://localhost:5000/api'

const TOKEN_KEY = 'vulnlab_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

// Core request helper. Attaches the auth token and parses JSON.
// Returns { ok, data, error } so callers never have to try/catch.
async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || `Request failed (${res.status})` }
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: 'Cannot reach the server. Is the backend running?' }
  }
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
}
