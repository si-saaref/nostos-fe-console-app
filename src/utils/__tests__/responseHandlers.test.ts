import { describe, expect, it } from 'vitest'
import { unwrapBackendResponse } from '../responseHandlers'

describe('unwrapBackendResponse', () => {
  it('returns the data payload on success', () => {
    const result = unwrapBackendResponse<{ email: string }>({
      success: true,
      data: { email: 'operator@test.com' },
      message: 'Signed in successfully',
    })

    expect(result).toEqual({ email: 'operator@test.com' })
  })

  it('throws the nested error message from the console auth error envelope', () => {
    expect(() =>
      unwrapBackendResponse({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Link invalid or expired',
          statusCode: 404,
          timestamp: '2026-08-04T00:00:00.000Z',
          path: '/api/v1/console/auth/signin/bad-token',
        },
      }),
    ).toThrow('Link invalid or expired')
  })

  it('passes through non-envelope values unchanged', () => {
    expect(unwrapBackendResponse('plain string')).toBe('plain string')
  })
})
