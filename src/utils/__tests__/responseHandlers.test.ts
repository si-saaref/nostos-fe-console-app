import { describe, expect, it } from 'vitest'
import type { AxiosError } from 'axios'
import {
  ApiError,
  rethrowAsApiError,
  toApiError,
  unwrapBackendResponse,
  unwrapEnvelope,
  unwrapPaginated,
} from '../responseHandlers'

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

describe('unwrapEnvelope', () => {
  it('returns the data payload on success', () => {
    const data = { household_id: 'abc', status: 'ACTIVE' }
    expect(unwrapEnvelope<typeof data>({ success: true, data })).toEqual(data)
  })

  it('returns data even when it is an empty object', () => {
    expect(unwrapEnvelope({ success: true, data: {} })).toEqual({})
  })

  it('throws an ApiError carrying the backend error code', () => {
    let thrown: unknown
    try {
      unwrapEnvelope({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Household name already in use',
          status_code: 409,
          timestamp: '2026-01-31T09:15:00.000Z',
          path: '/api/v1/console/households',
        },
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(ApiError)
    expect((thrown as ApiError).code).toBe('CONFLICT')
    expect((thrown as ApiError).statusCode).toBe(409)
    expect((thrown as ApiError).message).toBe('Household name already in use')
  })

  it('exposes validation field errors as a list', () => {
    let thrown: unknown
    try {
      unwrapEnvelope({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          status_code: 400,
          timestamp: '2026-01-31T09:15:00.000Z',
          path: '/api/v1/console/households',
          details: [
            { field: 'admin_email', code: 'IS_EMAIL', message: 'admin_email must be an email' },
          ],
        },
      })
    } catch (error) {
      thrown = error
    }

    expect((thrown as ApiError).fieldErrors).toEqual([
      { field: 'admin_email', code: 'IS_EMAIL', message: 'admin_email must be an email' },
    ])
  })

  it('reports no field errors when details is absent', () => {
    let thrown: unknown
    try {
      unwrapEnvelope({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Household not found',
          status_code: 404,
          timestamp: '2026-01-31T09:15:00.000Z',
          path: '/x',
        },
      })
    } catch (error) {
      thrown = error
    }
    expect((thrown as ApiError).fieldErrors).toEqual([])
  })

  it('throws when a success envelope carries no data', () => {
    expect(() => unwrapEnvelope({ success: true })).toThrow(/no data/i)
  })

  it('throws when the body is not an envelope at all', () => {
    expect(() => unwrapEnvelope({ households: [] })).toThrow(/envelope/i)
    expect(() => unwrapEnvelope(null)).toThrow(/envelope/i)
  })
})

describe('unwrapPaginated', () => {
  it('returns the array and the pagination block from meta', () => {
    const result = unwrapPaginated<{ id: string }>({
      success: true,
      data: [{ id: '1' }],
      meta: { pagination: { page: 2, limit: 50, total: 137, total_pages: 3 } },
    })

    expect(result.items).toEqual([{ id: '1' }])
    expect(result.pagination).toEqual({ page: 2, limit: 50, total: 137, total_pages: 3 })
  })

  it('throws when data is not an array', () => {
    expect(() =>
      unwrapPaginated({ success: true, data: { households: [] }, meta: { pagination: {} } }),
    ).toThrow(/array/i)
  })

  it('throws when meta.pagination is missing', () => {
    expect(() => unwrapPaginated({ success: true, data: [] })).toThrow(/pagination/i)
  })

  it('propagates an ApiError from a failed envelope', () => {
    expect(() =>
      unwrapPaginated({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'page must not be less than 1',
          status_code: 400,
          timestamp: '2026-01-31T09:15:00.000Z',
          path: '/x',
        },
      }),
    ).toThrow(ApiError)
  })
})

describe('toApiError', () => {
  function axiosErrorWith(data: unknown): AxiosError {
    return {
      isAxiosError: true,
      response: { status: 400, data, statusText: '', headers: {}, config: {} },
    } as unknown as AxiosError
  }

  it('recovers the code and field errors from a rejected axios response', () => {
    const error = toApiError(
      axiosErrorWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          status_code: 400,
          timestamp: '2026-01-31T09:15:00.000Z',
          path: '/api/v1/console/households',
          details: [
            { field: 'admin_email', code: 'IS_EMAIL', message: 'admin_email must be an email' },
          ],
        },
      }),
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error?.code).toBe('VALIDATION_ERROR')
    expect(error?.fieldErrors).toHaveLength(1)
    expect(error?.fieldErrors[0].field).toBe('admin_email')
  })

  it('passes an ApiError straight through', () => {
    const original = new ApiError({
      code: 'CONFLICT',
      message: 'Household name already in use',
      status_code: 409,
      timestamp: '2026-01-31T09:15:00.000Z',
      path: '/x',
    })

    expect(toApiError(original)).toBe(original)
  })

  it('returns null for failures the backend did not describe', () => {
    expect(toApiError(new TypeError('boom'))).toBeNull()
    expect(toApiError(axiosErrorWith('<html>502</html>'))).toBeNull()
    expect(
      toApiError({ isAxiosError: true, response: undefined } as unknown as AxiosError),
    ).toBeNull()
  })
})

describe('rethrowAsApiError', () => {
  it('rethrows a described failure as an ApiError', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: 'The grace period has expired',
            status_code: 400,
            timestamp: '2026-01-31T09:15:00.000Z',
            path: '/x',
          },
        },
        statusText: '',
        headers: {},
        config: {},
      },
    } as unknown as AxiosError

    expect(() => rethrowAsApiError(axiosError)).toThrow(ApiError)
    expect(() => rethrowAsApiError(axiosError)).toThrow('The grace period has expired')
  })

  it('rethrows anything else untouched', () => {
    const original = new TypeError('boom')
    expect(() => rethrowAsApiError(original)).toThrow(original)
  })
})
