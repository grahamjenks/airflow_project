import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'

// ── helpers ──────────────────────────────────────────────────────────────────

function mockFetchOk(body, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

function mockFetchError(body, status) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

// ── Token management ─────────────────────────────────────────────────────────

describe('token management', () => {
  let getToken, setToken, clearToken

  beforeEach(async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    localStorage.clear()
    // Re-import to pick up stubbed env
    const mod = await import('./apiClient?t=' + Date.now())
    getToken = mod.getToken
    setToken = mod.setToken
    clearToken = mod.clearToken
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    localStorage.clear()
  })

  it('getToken returns null when nothing stored', () => {
    expect(getToken()).toBeNull()
  })

  it('setToken persists token to localStorage', () => {
    setToken('my-jwt')
    expect(localStorage.getItem('cricket_api_token')).toBe('my-jwt')
  })

  it('getToken retrieves stored token', () => {
    setToken('abc123')
    expect(getToken()).toBe('abc123')
  })

  it('clearToken removes token from localStorage', () => {
    setToken('abc123')
    clearToken()
    expect(getToken()).toBeNull()
  })
})

// ── getApiBaseUrl / isApiConfigured ──────────────────────────────────────────

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns empty string when VITE_API_BASE_URL is not set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { getApiBaseUrl } = await import('./apiClient?url=' + Date.now())
    expect(getApiBaseUrl()).toBe('')
  })

  it('strips trailing slash from base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/')
    const { getApiBaseUrl } = await import('./apiClient?slash=' + Date.now())
    expect(getApiBaseUrl()).toBe('http://localhost:8000')
  })
})

describe('isApiConfigured', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('returns false when base URL is not set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { isApiConfigured } = await import('./apiClient?conf=' + Date.now())
    expect(isApiConfigured()).toBe(false)
  })

  it('returns true when base URL is set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    const { isApiConfigured } = await import('./apiClient?conf2=' + Date.now())
    expect(isApiConfigured()).toBe(true)
  })
})

// ── login ─────────────────────────────────────────────────────────────────────

describe('login', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('stores token in localStorage on success', async () => {
    mockFetchOk({ access_token: 'tok123', token_type: 'bearer' })
    const { login } = await import('./apiClient?login=' + Date.now())
    await login('alice', 'secret')
    expect(localStorage.getItem('cricket_api_token')).toBe('tok123')
  })

  it('calls POST /auth/login', async () => {
    mockFetchOk({ access_token: 'tok', token_type: 'bearer' })
    const { login } = await import('./apiClient?login2=' + Date.now())
    await login('alice', 'secret')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/auth/login')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toMatchObject({ username: 'alice', password: 'secret' })
  })

  it('throws when server returns an error response', async () => {
    mockFetchError({ detail: 'Invalid credentials' }, 401)
    const { login } = await import('./apiClient?login3=' + Date.now())
    await expect(login('alice', 'bad')).rejects.toThrow('Invalid credentials')
  })
})

// ── register ─────────────────────────────────────────────────────────────────

describe('register', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('stores token in localStorage on success', async () => {
    mockFetchOk({ access_token: 'reg-tok', token_type: 'bearer' })
    const { register } = await import('./apiClient?reg=' + Date.now())
    await register('bob', 'pass')
    expect(localStorage.getItem('cricket_api_token')).toBe('reg-tok')
  })

  it('calls POST /auth/register', async () => {
    mockFetchOk({ access_token: 'reg-tok', token_type: 'bearer' })
    const { register } = await import('./apiClient?reg2=' + Date.now())
    await register('bob', 'pass')
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('/auth/register')
  })

  it('throws on conflict', async () => {
    mockFetchError({ detail: 'Username already taken' }, 409)
    const { register } = await import('./apiClient?reg3=' + Date.now())
    await expect(register('existing', 'pass')).rejects.toThrow('Username already taken')
  })
})

// ── api CRUD helpers ──────────────────────────────────────────────────────────

describe('api helpers', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    localStorage.setItem('cricket_api_token', 'test-token')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('listMatches calls GET /matches with auth header', async () => {
    mockFetchOk([])
    const { api } = await import('./apiClient?api=' + Date.now())
    await api.listMatches()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/matches')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  it('createMatch calls POST /matches with body', async () => {
    const match = { matchData: { team1: 'India' } }
    mockFetchOk({ id: 'abc', ...match })
    const { api } = await import('./apiClient?api2=' + Date.now())
    await api.createMatch(match)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('http://localhost:8000/matches')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toMatchObject(match)
  })

  it('deleteMatch calls DELETE and returns null on 204', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') })
    const { api } = await import('./apiClient?api3=' + Date.now())
    const result = await api.deleteMatch('some-id')
    expect(result).toBeNull()
  })
})
