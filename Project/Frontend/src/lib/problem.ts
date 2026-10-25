import { AxiosError } from 'axios'
import type { ProblemDetails } from '../types'

export interface NormalisedProblem {
  /** 0 when the failure was not an HTTP response (network down, CORS, abort). */
  status: number
  type: string
  code: string
  title: string
  detail: string
  instance: string
  correlationId: string
  timestampUtc: string
  /** Field-level messages from a 400/409/422, ready to attach to inputs. */
  fieldErrors: Record<string, string[]>
  /** A sentence fit to show an operator. Never a stack trace, never a code. */
  message: string
  /** True when re-issuing the same request could plausibly succeed. */
  retryable: boolean
}

/** The 28 `type` slugs from doc 04 section 18.7. */
const TYPE_MESSAGES: Record<string, string> = {
  malformed_request: 'The request could not be understood. Check the values and try again.',
  unauthorized: 'Your session has ended. Sign in again.',
  forbidden: 'You do not have permission to do that.',
  not_found: 'That record does not exist, or it is not visible to you.',
  conflict: 'That change conflicts with the current state of the record.',
  validation_failed: 'Some values are not valid. Correct the highlighted fields.',
  payload_too_large: 'That file or request body is too large.',
  rate_limited: 'Too many requests. Wait a moment and try again.',
  internal_error: 'The server hit an unexpected error. Quote the correlation id.',
  service_unavailable: 'The service is temporarily unavailable.',
  solver_unavailable: 'The optimiser is busy or unavailable. Try again shortly.',
}

/**
 * The 70 domain codes, grouped by domain for readability. Only the codes the UI
 * must react to differently are listed; everything else falls through to the
 * `type` message plus the server's own `detail`.
 */
const CODE_MESSAGES: Record<string, string> = {
  // auth
  'auth.invalid_credentials': 'That username or password is not correct.',
  'auth.account_locked': 'This account is locked. Contact an administrator.',
  'auth.account_inactive': 'This account is not active.',
  'auth.token_expired': 'Your session expired. Sign in again.',
  'auth.refresh_failed': 'Your session could not be renewed. Sign in again.',

  // validation
  'validation.field_invalid': 'Correct the highlighted fields.',
  'validation.range_invalid': 'A value is outside the allowed range.',

  // conflict
  'conflict.duplicate': 'A record with these values already exists.',
  'conflict.negative_stock': 'That would take stock below zero. The change was refused.',
  'conflict.fk_restricted': 'This record is still referenced and cannot be deleted.',
  'conflict.fk_invalid': 'A referenced record no longer exists.',
  'conflict.system_role_immutable': 'System roles cannot be modified.',
  'conflict.cart_in_use': 'That cart is in use by an open batch.',
  'conflict.active_batch_exists': 'You already have an open batch. Finish it first.',
  'conflict.order_not_deletable': 'This order has picking activity and cannot be deleted.',
  'conflict.overallocation': 'That allocates more than was picked.',
  'conflict.insufficient_stock': 'There is not enough stock to satisfy this order.',

  // concurrency
  'concurrency.if_match_required': 'This change was changed by someone else. Reload and try again.',
  'concurrency.stale_row': 'Someone else changed this record. Reload and try again.',

  // inventory
  'inventory.capacity_exceeded': 'That location does not have room for the quantity.',
  'inventory.no_stock': 'No stock is recorded for that product at that location.',
  'inventory.negative_stock': 'Stock may not be negative. The change was refused.',

  // receipts
  'receipt.not_draft': 'Only a draft receipt can be changed.',
  'receipt_line.invalid_condition': 'That line condition is not allowed.',
  'receipt.already_verified': 'This receipt has already been verified.',
  'receipt.not_verified': 'Verify the receipt before this action.',
  'receipt.putaway_complete': 'Put-away is already complete for this receipt.',

  // orders
  'order.not_pending': 'Only a pending order can be changed.',
  'order.line_duplicate_product': 'This product already appears on the order.',

  // batches
  'batch.not_pickable': 'This batch is not in a state that can be picked.',
  'batch.line_already_picked': 'One or more lines were already picked.',

  // shipments
  'shipment.not_packed': 'Pack the shipment before dispatching it.',
  'shipment.already_dispatched': 'This shipment has already been dispatched.',

  // solver
  'solver.input_invalid': 'The optimiser rejected these inputs. Correct them and run again.',
  'solver.budget_exceeded': 'The optimiser ran out of its time budget; a fallback plan was produced.',
  'solver.no_feasible_solution': 'The optimiser found no feasible plan for these inputs.',

  // integration
  'integration.invalid_api_key': 'That API key is not valid.',
  'integration.external_ref_duplicate': 'That external reference has already been submitted.',
  'integration.payload_rejected': 'The external payload was rejected.',
}

const GENERIC_MESSAGE = 'Something went wrong. Quote the correlation id if you report this.'

/** Codes for which a plain retry of the identical request is worth making. */
const RETRYABLE_CODES = new Set([
  'solver.budget_exceeded',
  'solver.no_feasible_solution',
  'auth.token_expired',
  'solver_unavailable',
  'rate_limited',
  'service_unavailable',
])

const RETRYABLE_TYPES = new Set(['rate_limited', 'service_unavailable', 'internal_error'])

function slugFromTypeUrl(type: string): string {
  const last = type.split('/').pop() ?? type
  return last.trim()
}

/** True when `error` is an Axios error carrying an HTTP response. */
export function isHttpError(error: unknown): error is AxiosError<ProblemDetails> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  )
}

export function extractProblem(error: unknown): ProblemDetails | null {
  if (!isHttpError(error)) return null
  const data = error.response?.data
  if (data && typeof data === 'object' && 'title' in data && 'status' in data) {
    return data as ProblemDetails
  }
  return null
}

export function normaliseProblem(error: unknown): NormalisedProblem {
  const problem = extractProblem(error)

  // Not an HTTP response: network down, DNS failure, CORS rejection, abort.
  if (!problem) {
    const status = isHttpError(error) ? (error.response?.status ?? 0) : 0
    const isAbort = typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ERR_CANCELED'
    return {
      status,
      type: 'network_error',
      code: 'network.unreachable',
      title: 'Request failed',
      detail: isAbort ? 'The request was cancelled.' : 'No response was received from the server.',
      instance: '',
      correlationId: correlationIdFromError(error),
      timestampUtc: new Date().toISOString(),
      fieldErrors: {},
      message: isAbort
        ? 'The request was cancelled.'
        : 'Cannot reach the server. Check that the API is running and that the dev proxy target is correct.',
      retryable: !isAbort,
    }
  }

  const typeSlug = slugFromTypeUrl(problem.type ?? '')
  const code = typeof problem.code === 'string' && problem.code.length > 0 ? problem.code : typeSlug

  const message =
    CODE_MESSAGES[code] ??
    (typeSlug ? TYPE_MESSAGES[typeSlug] : undefined) ??
    (problem.detail && problem.detail.length > 0 ? problem.detail : problem.title) ??
    GENERIC_MESSAGE

  return {
    status: problem.status ?? 0,
    type: typeSlug,
    code,
    title: problem.title ?? '',
    // The server's `detail` is kept verbatim for the expandable "technical
    // detail" region, never for the primary message.
    detail: problem.detail ?? '',
    instance: problem.instance ?? '',
    correlationId: problem.correlationId ?? correlationIdFromError(error),
    timestampUtc: problem.timestampUtc ?? '',
    fieldErrors: problem.errors ?? {},
    message,
    retryable: RETRYABLE_CODES.has(code) || RETRYABLE_TYPES.has(typeSlug),
  }
}

/** The correlation id we sent, so even a 500 with no body can be traced. */
function correlationIdFromError(error: unknown): string {
  if (isHttpError(error)) {
    const fromHeader = error.response?.headers?.['x-correlation-id']
    if (typeof fromHeader === 'string' && fromHeader.length > 0) return fromHeader
    const fromRequest = error.config?.headers?.['X-Correlation-Id']
    if (typeof fromRequest === 'string' && fromRequest.length > 0) return fromRequest
  }
  return ''
}

/**
 * A problem the browser raised, before anything was sent.
 *
 * The screens check what they can cheaply - a required name, a ten-character
 * password, a shelf level between 1 and 9 - so the operator is not made to pay a
 * round trip to be told what could have been told here. That check has to hand
 * back the same shape as a server failure, because every error panel reads one
 * type, so it is built here once instead of being hand-assembled per call site.
 *
 * `validation.field_invalid` is a real entry in the catalogue, not an invented
 * one: a client problem stays distinguishable from a server problem by code while
 * still being the same type to everything downstream. `timestampUtc` is stamped
 * because the type requires it and something has to tell the truth about it -
 * this is genuinely the moment the failure was noticed.
 */
export function clientProblem(
  message: string,
  fieldErrors: Record<string, string[]> = {},
): NormalisedProblem {
  return {
    status: 422,
    type: 'validation_failed',
    code: 'validation.field_invalid',
    title: 'Validation failed',
    detail: message,
    instance: 'client',
    correlationId: '',
    timestampUtc: new Date().toISOString(),
    fieldErrors,
    message,
    retryable: false,
  }
}

/** Convenience for components: "what should I tell the operator?" */
export function describeProblem(error: unknown): string {
  return normaliseProblem(error).message
}

/** Convenience for forms: pick the messages for one field out of the body. */
export function fieldError(problem: NormalisedProblem, fieldPath: string): string | undefined {
  return problem.fieldErrors[fieldPath]?.[0]
}

/** True for the two statuses that mean "your token is stale, refresh it". */
export function isAuthFailure(problem: NormalisedProblem): boolean {
  return problem.status === 401
}

/** True when a guard should send the operator to /forbidden. */
export function isForbidden(problem: NormalisedProblem): boolean {
  return problem.status === 403
}

export { CODE_MESSAGES, TYPE_MESSAGES }