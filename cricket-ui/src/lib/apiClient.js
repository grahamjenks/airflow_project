import { logger } from './logger'

const TOKEN_KEY = 'cricket_api_token'

export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  return raw ? String(raw).replace(/\/+$/, '') : ''
}

export function isApiConfigured() {
  return Boolean(getApiBaseUrl())
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (e) {
    logger.error('auth.token_read_failed', { error: e })
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (e) {
    logger.error('auth.token_write_failed', { error: e })
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (e) {
    logger.error('auth.token_clear_failed', { error: e })
  }
}

async function apiFetch(path, { method = 'GET', body, auth = true, timeoutMs = 15000 } = {}) {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) throw new Error('API base URL not configured')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (!token) throw new Error('Not authenticated')
    headers.Authorization = `Bearer ${token}`
  }

  const requestId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `req-${Date.now()}`
  headers['X-Request-ID'] = requestId

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (res.status === 204) return null

    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    if (!res.ok) {
      const err = new Error(data?.detail || `Request failed (${res.status})`)
      err.status = res.status
      err.data = data
      throw err
    }
    return data
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function login(username, password) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: { username, password }, auth: false })
  if (!data?.access_token) throw new Error('Login failed')
  setToken(data.access_token)
  return data.access_token
}

export const api = {
  listMatches: () => apiFetch('/matches', { method: 'GET' }),
  getMatch: (id) => apiFetch(`/matches/${id}`, { method: 'GET' }),
  createMatch: (payload) => apiFetch('/matches', { method: 'POST', body: payload }),
  updateMatch: (id, payload) => apiFetch(`/matches/${id}`, { method: 'PUT', body: payload }),
  deleteMatch: (id) => apiFetch(`/matches/${id}`, { method: 'DELETE' }),
}

