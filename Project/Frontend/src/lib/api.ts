import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { newCorrelationId } from './utils'
import { extractProblem } from './problem'
import { SOLVER_CLIENT_TIMEOUT_MS } from '../config/constants'
import type { ProblemDetails } from '../types'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
export const SOLVER_BASE_URL = import.meta.env.VITE_SOLVER_BASE_URL ?? '/api/v1'
export const SWAGGER_URL = import.meta.env.VITE_SWAGGER_URL ?? ''

const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Access token storage.
 *
 * Rules (doc 12 section 11.5):
 *  - the access token lives in memory, and is mirrored to sessionStorage so a
 *    page reload inside the same tab does not sign the operator out;
 *  - "Remember me" upgrades that mirror to localStorage, so it survives closing
 *    the tab;
 *  - the REFRESH token is an httpOnly cookie set by the server. This code can
 *    neither read nor write it. It is sent automatically because every instance
 *    sets `withCredentials: true`.
 */
const SESSION_KEY = 'xtrena.accessToken'
const LOCAL_KEY = 'xtrena.accessToken.remembered'

let memoryToken: string | null = null

export function getAccessToken(): string | null {
  if (memoryToken) return memoryToken
  try {
    memoryToken = window.localStorage.getItem(LOCAL_KEY) ?? window.sessionStorage.getItem(SESSION_KEY)
  } catch {
    // Private browsing modes can throw on storage access. Memory-only is a
    // supported mode, so degrade rather than crash.
    memoryToken = null
  }
  return memoryToken
}

export function setAccessToken(token: string | null, remember: boolean): void {
  memoryToken = token
  try {
    window.localStorage.removeItem(LOCAL_KEY)
    window.sessionStorage.removeItem(SESSION_KEY)
    if (token === null) return
    if (remember) window.localStorage.setItem(LOCAL_KEY, token)
    else window.sessionStorage.setItem(SESSION_KEY, token)
  } catch {
    // Ignore: the in-memory copy is authoritative for this tab either way.
  }
}

export function isRemembered(): boolean {
  try {
    return window.localStorage.getItem(LOCAL_KEY) !== null
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* Shared interceptors                                                 */
/* ------------------------------------------------------------------ */

/** The last correlation id the server echoed. The error screen shows it. */
let lastCorrelationId = ''
export function getLastCorrelationId(): string {
  return lastCorrelationId
}

function attachCorrelationId(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const id = newCorrelationId()
  config.headers.set('X-Correlation-Id', id)
  config.headers.set('Accept', 'application/json, text/plain, */*')
  return config
}

function readCorrelationId(config: InternalAxiosRequestConfig | undefined): string {
  const raw = config?.headers?.['X-Correlation-Id']
  return typeof raw === 'string' ? raw : ''
}

/**
 * 401 handling.
 *
 * The refresh cookie is the ONE cookie the system sets (doc 12 section 11.5).
 * On a 401 we call `POST /auth/refresh` exactly once and replay the original
 * request once. A second 401 is not retried again: if a fresh token still fails,
 * the session is genuinely over and looping would hammer the API.
 *
 * `refreshing` is a module-level promise so that ten components failing at once
 * produce ONE refresh call, not ten.
 */
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const response = await axios.post<{ accessToken: string }>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true, timeout: DEFAULT_TIMEOUT_MS, headers: { 'X-Correlation-Id': newCorrelationId() } },
    )
    const token = response.data.accessToken
    setAccessToken(token, isRemembered())
    return token
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

// The internal config, not the public one. `error.config` is an
// InternalAxiosRequestConfig, and its `headers` is a non-optional
// AxiosHeaders - which is what makes the replay below cast-free.
type RetriableConfig = InternalAxiosRequestConfig & { _xtrenaRetried?: boolean }

function buildInstance(baseURL: string, timeout: number): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  })

  instance.interceptors.request.use((config) => {
    const cfg = config as InternalAxiosRequestConfig
    attachCorrelationId(cfg)
    const token = getAccessToken()
    if (token) cfg.headers.set('Authorization', `Bearer ${token}`)
    return cfg
  })

  instance.interceptors.response.use(
    (response) => {
      const fromHeader = response.headers?.['x-correlation-id']
      if (typeof fromHeader === 'string') lastCorrelationId = fromHeader
      return response
    },
    async (error: AxiosError<ProblemDetails>) => {
      const problem = extractProblem(error)
      const echoed = problem?.correlationId
      const fromHeader = error.response?.headers?.['x-correlation-id']
      lastCorrelationId = echoed ?? (typeof fromHeader === 'string' ? fromHeader : readCorrelationId(error.config))

      const status = error.response?.status ?? 0
      const cfg = error.config as RetriableConfig | undefined
      if (!cfg) throw error

      // --- 401: one refresh, one replay ---------------------------------
      // ★ M1 adaptation: `code.md` excluded every `/auth/*` URL, which also
      // excluded `/auth/me` — so a reload after the 15-minute access-token
      // expiry forced a fresh login even though the refresh cookie was valid.
      // Only the endpoints that must never recurse are excluded here.
      if (
        status === 401 &&
        cfg._xtrenaRetried !== true &&
        !/\/auth\/(login|refresh|logout|change-password)/.test(cfg.url ?? '')
      ) {
        cfg._xtrenaRetried = true
        try {
          const fresh = await refreshAccessToken()
          // Set through the AxiosHeaders API rather than assigned as a plain
          // object: axios merges the instance defaults into this instance, and
          // replacing it with an object literal drops them.
          cfg.headers.set('Authorization', `Bearer ${fresh}`)
          return instance.request(cfg)
        } catch {
          setAccessToken(null, false)
          throw error
        }
      }

      // --- 429 / 503: one retry, 500 ms backoff, GET only ----------------
      // Retrying a POST could double-apply a stock movement, so writes are
      // never retried automatically. This mirrors the server's Polly policy,
      // which is also GET-only plus one attempt.
      if (
        (status === 429 || status === 503 || status === 502 || status === 504) &&
        cfg._xtrenaRetried !== true &&
        (cfg.method ?? 'get').toLowerCase() === 'get'
      ) {
        cfg._xtrenaRetried = true
        await new Promise((resolve) => setTimeout(resolve, 500))
        return instance.request(cfg)
      }

      throw error
    },
  )

  return instance
}

/** The main client. 15 s is generous for a CRUD endpoint. */
export const api = buildInstance(API_BASE_URL, DEFAULT_TIMEOUT_MS)

/**
 * The optimisation client.
 *
 * Its timeout is 5.0 s on purpose. The server's solver budget is 4.5 s, so the
 * server always answers first and the operator sees the server's own
 * `solver.budget_exceeded` explanation instead of a generic client timeout.
 * Raising this value would destroy the diagnostic.
 */
export const solverApi = buildInstance(SOLVER_BASE_URL, SOLVER_CLIENT_TIMEOUT_MS)

/**
 * The integration client.
 *
 * doc 04 section 3.2: integration clients authenticate with `X-Api-Key`, not
 * with a JWT. This instance therefore does NOT attach the user's bearer token -
 * a request that carried both would be ambiguous about which identity applied.
 */
export const integrationApi = buildInstance(API_BASE_URL, DEFAULT_TIMEOUT_MS)

/** The API key is entered in the UI and kept in sessionStorage only. */
const API_KEY_STORAGE = 'xtrena.apiKey'

export function getApiKey(): string | null {
  try {
    return window.sessionStorage.getItem(API_KEY_STORAGE)
  } catch {
    return null
  }
}

export function setApiKey(key: string | null): void {
  try {
    if (key === null) window.sessionStorage.removeItem(API_KEY_STORAGE)
    else window.sessionStorage.setItem(API_KEY_STORAGE, key)
  } catch {
    // Ignore: the key is optional convenience state.
  }
}

/* ------------------------------------------------------------------ */
/* Typed request helpers                                               */
/* ------------------------------------------------------------------ */

export interface RequestOptions {
  /**
   * Optimistic concurrency token for doc 04 section 5.6. Send it on any entity
   * that carries a `rowVersion`. Omit it and the update proceeds, unless the
   * endpoint makes it mandatory - `POST /shipments/{id}/dispatch` does.
   */
  ifMatch?: string
  params?: Record<string, unknown>
  signal?: AbortSignal
}

export async function get<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await api.get<T>(url, { params: options.params, signal: options.signal })
  return response.data
}

export async function post<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const response = await api.post<T>(url, body ?? {}, {
    params: options.params,
    signal: options.signal,
    headers: options.ifMatch ? { 'If-Match': options.ifMatch } : undefined,
  })
  return response.data
}

export async function put<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const response = await api.put<T>(url, body ?? {}, {
    params: options.params,
    signal: options.signal,
    headers: options.ifMatch ? { 'If-Match': options.ifMatch } : undefined,
  })
  return response.data
}

export async function del<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await api.delete<T>(url, { params: options.params, signal: options.signal })
  return response.data
}

/** Download a server-produced file. Never build the payload in the browser. */
export async function downloadFile(url: string, params?: Record<string, unknown>): Promise<Blob> {
  const response = await api.get<Blob>(url, { params, responseType: 'blob' })
  return response.data
}

/** Same as `downloadFile`, but through the optimisation client. */
export async function solverGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await solverApi.get<T>(url, { params })
  return response.data
}

export async function solverPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await solverApi.post<T>(url, body ?? {})
  return response.data
}

/** POST with `X-Api-Key` instead of `Authorization: Bearer`. */
export async function integrationPost<T>(url: string, body: unknown, apiKey: string): Promise<T> {
  const response = await integrationApi.post<T>(url, body, {
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
  })
  return response.data
}
