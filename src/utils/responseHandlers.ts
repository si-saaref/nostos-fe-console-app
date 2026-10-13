interface BackendResponse<T> {
  success: boolean
  data?: T
  error?: { message?: string }
  message?: string
  metrics?: T
  households?: T
}

export function unwrapBackendResponse<T>(response: unknown): T {
  // If it's not an object, return as-is
  if (!response || typeof response !== 'object') {
    return response as T
  }

  const r = response as BackendResponse<T>

  // If there's no success flag, it's not a wrapped response - return as-is
  if (!('success' in r)) {
    return response as T
  }

  if (!r.success) {
    throw new Error(r.error?.message || r.message || 'Unknown error')
  }

  // Try different common response shapes, ensure we return the data
  return (r.data ?? r.metrics ?? r.households ?? response) as T
}

import { isAxiosError } from 'axios'

/** One failed constraint from the validation pipe. */
export interface FieldError {
  field: string
  /** The class-validator constraint, upper-snaked. Branch on this, not the copy. */
  code: string
  message: string
}

/** The `error` object every failed console response carries. */
export interface ApiErrorDetail {
  code: string
  message: string
  status_code: number
  timestamp: string
  path: string
  details?: FieldError[]
}

/** The `meta.pagination` block on a paginated console response. */
export interface PaginationWire {
  page: number
  limit: number
  total: number
  total_pages: number
}

/**
 * A failure the backend described. `code` is the field to branch on: several
 * codes share one HTTP status, so the status alone cannot tell CONFLICT from
 * INVALID_STATE.
 */
export class ApiError extends Error {
  readonly code: string
  readonly statusCode: number
  readonly fieldErrors: FieldError[]

  constructor(detail: ApiErrorDetail) {
    super(detail.message)
    this.name = 'ApiError'
    this.code = detail.code
    this.statusCode = detail.status_code
    this.fieldErrors = detail.details ?? []
  }
}

function readEnvelope(payload: unknown): {
  success: boolean
  data?: unknown
  meta?: unknown
} {
  if (!payload || typeof payload !== 'object' || !('success' in payload)) {
    throw new Error('Malformed response: expected a { success, data } envelope')
  }

  const envelope = payload as {
    success: boolean
    data?: unknown
    meta?: unknown
    error?: ApiErrorDetail
  }

  if (!envelope.success) {
    if (envelope.error?.code) throw new ApiError(envelope.error)
    throw new Error('Request failed')
  }

  return envelope
}

/**
 * Strict counterpart to `unwrapBackendResponse`, for the console households
 * endpoints. It throws rather than guessing: a shape change should surface as
 * an error, not as a blank page.
 */
export function unwrapEnvelope<T>(payload: unknown): T {
  const envelope = readEnvelope(payload)

  if (envelope.data === undefined) {
    throw new Error('Malformed response: success envelope carried no data')
  }

  return envelope.data as T
}

/**
 * The list endpoint returns `data` as a bare array and puts the counts in
 * `meta.pagination`, so unwrapping it needs both halves.
 */
export function unwrapPaginated<T>(payload: unknown): {
  items: T[]
  pagination: PaginationWire
} {
  const envelope = readEnvelope(payload)

  if (!Array.isArray(envelope.data)) {
    throw new Error('Malformed response: expected data to be an array')
  }

  const pagination = (envelope.meta as { pagination?: PaginationWire } | undefined)?.pagination
  if (!pagination) {
    throw new Error('Malformed response: expected meta.pagination')
  }

  return { items: envelope.data as T[], pagination }
}

/**
 * Normalise a thrown value into an ApiError when the backend described the
 * failure. Axios rejects a non-2xx before any unwrapping runs, so an error
 * envelope arrives as an AxiosError carrying the envelope in `response.data` —
 * this is what recovers `code` and the per-field `details` from it. Returns
 * null when the failure was not one the backend described (a network drop, a
 * thrown TypeError), which callers should treat as "no structured detail".
 */
export function toApiError(error: unknown): ApiError | null {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    const detail = (error.response?.data as { error?: ApiErrorDetail } | undefined)?.error
    if (detail?.code) return new ApiError(detail)
  }

  return null
}

/**
 * Rethrow a rejected request as an ApiError when the backend described the
 * failure, and unchanged otherwise. Use as `.catch(rethrowAsApiError)` on the
 * axios call so consumers can branch on `error.code` rather than parsing a
 * status-code string out of axios's own message.
 */
export function rethrowAsApiError(error: unknown): never {
  throw toApiError(error) ?? error
}
