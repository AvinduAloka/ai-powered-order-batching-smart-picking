import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? dateFmt.format(d) : ''
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? dateTimeFmt.format(d) : ''
}

export function formatTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? timeFmt.format(d) : ''
}

/** ISO date (`yyyy-MM-dd`) for `<input type="date">` and for query strings. */
export function toIsoDate(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** ISO instant for `<input type="datetime-local">`, in local time. */
export function toLocalDateTimeInput(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}

/** Local wall-clock value back to a UTC ISO instant, for request bodies. */
export function fromLocalDateTimeInput(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

// Numbers
const intFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const decFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return intFmt.format(value)
}

export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return decFmt.format(value)
}

/** Distances are DECIMAL(12,2) on the server, so two decimals is exact. */
export function formatMetres(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return `${decFmt.format(value)} m`
}


export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return `${value.toFixed(decimals)} %`
}

/** Signed delta with an explicit `+`, so +5 is never read as -5. */
export function formatSigned(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return value > 0 ? `+${intFmt.format(value)}` : intFmt.format(value)
}

// Query strings
export type QueryValue = string | number | boolean | null | undefined | Array<string | number>

export function buildQuery(params: Record<string, QueryValue>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined || item === '') continue
        sp.append(key, String(item))
      }
      continue
    }
    if (typeof value === 'string' && value.trim() === '') continue
    sp.append(key, String(value))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}


// Save a server-produced file.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on the next tick: revoking synchronously can cancel the download in
  // some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// `stock-ledger-2026-09-27.csv` style names, so an export is self-describing.
export function exportFilename(prefix: string, extension: string, at = new Date()): string {
  return `${prefix}-${toIsoDate(at)}.${extension}`
}

// Misc
export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number) {
  let handle: ReturnType<typeof setTimeout> | undefined
  const wrapped = (...args: A) => {
    if (handle !== undefined) clearTimeout(handle)
    handle = setTimeout(() => fn(...args), waitMs)
  }
  wrapped.cancel = () => {
    if (handle !== undefined) clearTimeout(handle)
  }
  return wrapped
}

export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === ''
}

/** A new UUID per request, echoed as `X-Correlation-Id` (doc 04 section 5.5). */
export function newCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback for an insecure origin (plain http on a LAN address).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Up to two initials for the sidebar avatar.
 *
 * A blank name yields `?`, never an empty string: the avatar has to render
 * something, and an empty circle looks like a failed image rather than like
 * a person with no name recorded.
 */
export function initials(fullName: string): string {
  const parts = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
  return parts === '' ? '?' : parts
}

/** Group an array by a derived key, preserving encounter order within a group. */
export function groupBy<T, K extends string>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>()
  for (const row of rows) {
    const k = key(row)
    const bucket = out.get(k)
    if (bucket) bucket.push(row)
    else out.set(k, [row])
  }
  return out
}

export function unique<T>(rows: T[]): T[] {
  return Array.from(new Set(rows))
}

export function sumBy<T>(
  rows: T[],
  value: (row: T) => number | undefined,
): number {
  // A missing value counts as zero rather than poisoning the total with
  // NaN: an optional quantity column is normal, and a NaN total is not
  // something a warehouse supervisor can act on.
  return rows.reduce((acc, row) => acc + (value(row) ?? 0), 0)
}

/** Clamp a number into a range; returns the bounds for a NaN input. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}