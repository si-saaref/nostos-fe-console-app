import { isAxiosError } from 'axios'

interface BackendResponse<T> {
  success: boolean
  data?: T
  error?: string
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
    throw new Error(r.error || r.message || 'Unknown error')
  }

  // Try different common response shapes, ensure we return the data
  return (r.data ?? r.metrics ?? r.households ?? response) as T
}

export function getBackendErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined
    return data?.error || data?.message || 'Unknown error'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}
