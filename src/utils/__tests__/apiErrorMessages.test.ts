import { describe, expect, it } from 'vitest'
import type { AxiosError } from 'axios'
import { getErrorMessage } from '../apiErrorMessages'

function makeAxiosError(status: number, data?: unknown): AxiosError {
  return {
    isAxiosError: true,
    response: { status, data, statusText: '', headers: {}, config: {} },
  } as unknown as AxiosError
}

function makeNetworkError(): AxiosError {
  return { isAxiosError: true, response: undefined } as unknown as AxiosError
}

describe('getErrorMessage', () => {
  it('returns the backend message when present', () => {
    const error = makeAxiosError(409, { message: 'Household name already in use. Try a different name.' })
    expect(getErrorMessage(error)).toBe('Household name already in use. Try a different name.')
  })

  it('falls back to a generic message for 500s with no message', () => {
    const error = makeAxiosError(500, {})
    expect(getErrorMessage(error)).toBe('Something went wrong. Please try again later.')
  })

  it('returns a network error message when there is no response', () => {
    expect(getErrorMessage(makeNetworkError())).toBe('Network error. Please try again.')
  })

  it('returns a generic fallback for non-axios errors', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again later.')
  })

  it('returns the backend message from the console auth error envelope', () => {
    const error = makeAxiosError(401, {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Email not authorized to access console',
        statusCode: 401,
        timestamp: '2026-08-04T00:00:00.000Z',
        path: '/api/v1/console/auth/signin',
      },
    })
    expect(getErrorMessage(error)).toBe('Email not authorized to access console')
  })
})
