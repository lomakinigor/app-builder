// T-307 — Shared HTTP client for all API adapters
// T-309 — Request tracing (X-Request-Id + optional X-Session-Id)
// T-310 — Error correlation: ApiError.requestId from backend error body / response header
//
// Centralises:
//   - ApiError — thrown on non-2xx responses; carries requestId for correlation
//   - getApiAuthToken — reads VITE_API_BEARER_TOKEN; extensible to runtime auth later
//   - buildApiHeaders — Content-Type + Accept + optional Authorization + X-Request-Id + optional X-Session-Id
//   - baseUrl — reads VITE_API_BASE_URL
//   - postJson — fetch POST with shared headers + ApiError semantics + requestId extraction

// ─── Error type ───────────────────────────────────────────────────────────────
// requestId is extracted from the backend error body ({ message, requestId })
// or from the response X-Request-Id header as a fallback, so every thrown
// ApiError can be correlated with backend logs without extra instrumentation.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly requestId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Auth token provider ──────────────────────────────────────────────────────
// Default: reads VITE_API_BEARER_TOKEN at call time (env-based bootstrap).
// Can be overridden in tests or replaced with a runtime auth provider later
// without touching the adapters.

let _tokenProvider: () => string | null = () =>
  (import.meta.env.VITE_API_BEARER_TOKEN as string | undefined) ?? null

export function setApiTokenProvider(provider: () => string | null): void {
  _tokenProvider = provider
}

export function resetApiTokenProvider(): void {
  _tokenProvider = () =>
    (import.meta.env.VITE_API_BEARER_TOKEN as string | undefined) ?? null
}

export function getApiAuthToken(): string | null {
  return _tokenProvider()
}

// ─── Request id provider ─────────────────────────────────────────────────────
// Default: generates a new UUID per request via crypto.randomUUID() with a
// simple fallback for environments where crypto is unavailable.
// Can be overridden in tests to produce stable, assertable ids.

let _requestIdProvider: (() => string) | null = null

export function setApiRequestIdProvider(provider: () => string): void {
  _requestIdProvider = provider
}

export function resetApiRequestIdProvider(): void {
  _requestIdProvider = null
}

function getRequestId(): string {
  if (_requestIdProvider) return _requestIdProvider()
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: timestamp + random suffix (not RFC-4122 but collision-resistant enough for tracing)
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// ─── Session id provider ──────────────────────────────────────────────────────
// Optional: correlates multiple requests within a single run or session.
// Default: reads VITE_SESSION_ID env at call time (useful for CI run tagging).
// Can be overridden to source from auth store or CI job env.

let _sessionIdProvider: (() => string | null) | null = null

export function setApiSessionIdProvider(provider: () => string | null): void {
  _sessionIdProvider = provider
}

export function resetApiSessionIdProvider(): void {
  _sessionIdProvider = null
}

function getSessionId(): string | null {
  if (_sessionIdProvider) return _sessionIdProvider()
  return (import.meta.env.VITE_SESSION_ID as string | undefined) ?? null
}

// ─── Header builder ───────────────────────────────────────────────────────────

export function buildApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Request-Id': getRequestId(),
  }
  const token = getApiAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const sessionId = getSessionId()
  if (sessionId) {
    headers['X-Session-Id'] = sessionId
  }
  return headers
}

// ─── Base URL ─────────────────────────────────────────────────────────────────

export function baseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
}

// ─── Error helper (shared by postJson and getJson) ────────────────────────────

async function extractApiError(res: Response): Promise<ApiError> {
  let message = `HTTP ${res.status}`
  let requestId: string | null = null
  try {
    const data = (await res.json()) as { message?: string; requestId?: string }
    if (data?.message) message = data.message
    if (data?.requestId) requestId = data.requestId
  } catch {
    // ignore JSON parse errors — keep the HTTP status message and null requestId
  }
  if (!requestId) {
    requestId = res.headers.get('x-request-id')
  }
  return new ApiError(res.status, message, requestId)
}

// ─── POST helper ──────────────────────────────────────────────────────────────

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: buildApiHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw await extractApiError(res)
  }

  return res.json() as Promise<T>
}

// ─── GET helper ───────────────────────────────────────────────────────────────

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'GET',
    headers: buildApiHeaders(),
  })

  if (!res.ok) {
    throw await extractApiError(res)
  }

  return res.json() as Promise<T>
}

// ─── PATCH helper ─────────────────────────────────────────────────────────────

export async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'PATCH',
    headers: buildApiHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw await extractApiError(res)
  }

  return res.json() as Promise<T>
}

// ─── DELETE helper ────────────────────────────────────────────────────────────

export async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'DELETE',
    headers: buildApiHeaders(),
  })

  if (!res.ok) {
    throw await extractApiError(res)
  }

  return res.json() as Promise<T>
}
