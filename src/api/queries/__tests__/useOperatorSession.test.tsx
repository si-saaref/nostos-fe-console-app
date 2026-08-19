import { describe, expect, it } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { shouldRetrySession, useOperatorSession } from '../useOperatorSession'

function axiosErrorWithStatus(status: number) {
  return new AxiosError('request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
  } as AxiosResponse)
}

describe('shouldRetrySession', () => {
  it('does not retry a 401 — the answer is definitive, not a glitch', () => {
    expect(shouldRetrySession(0, axiosErrorWithStatus(401))).toBe(false)
  })

  it('does not retry a 403', () => {
    expect(shouldRetrySession(0, axiosErrorWithStatus(403))).toBe(false)
  })

  it('retries a 500, because a broken server is not a signed-out operator', () => {
    expect(shouldRetrySession(0, axiosErrorWithStatus(500))).toBe(true)
  })

  it('retries a network error with no response at all', () => {
    expect(shouldRetrySession(0, new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(true)
  })

  it('gives up after two retries', () => {
    expect(shouldRetrySession(1, axiosErrorWithStatus(500))).toBe(true)
    expect(shouldRetrySession(2, axiosErrorWithStatus(500))).toBe(false)
  })
})

describe('useOperatorSession', () => {
  it('returns the operator identity for a valid session', async () => {
    server.use(
      http.get('*/api/v1/console/auth/me', () =>
        HttpResponse.json({
          success: true,
          data: {
            id: '00000000-0000-4000-8000-000000000010',
            email: 'operator@household.test',
            role: 'OPERATOR',
          },
        }),
      ),
    )

    const { result } = renderHook(() => useOperatorSession(), {
      wrapper: createQueryClientWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      id: '00000000-0000-4000-8000-000000000010',
      email: 'operator@household.test',
      role: 'OPERATOR',
    })
  })

  it('surfaces an error when there is no valid session', async () => {
    server.use(
      http.get('*/api/v1/console/auth/me', () =>
        HttpResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
          { status: 401 },
        ),
      ),
    )

    const { result } = renderHook(() => useOperatorSession(), {
      wrapper: createQueryClientWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
