import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { useResendInvite } from '../useResendInvite'

const ID = '3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64'

describe('useResendInvite', () => {
  it('issues a fresh link and maps the new expiry', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/admin/resend-invite`, () =>
        HttpResponse.json({
          success: true,
          message: 'Invite resent',
          data: {
            admin_email: 'javier@adios.com',
            new_expiry: '2026-08-04T10:00:00.000Z',
          },
        }),
      ),
    )

    const { result } = renderHook(() => useResendInvite(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      adminEmail: 'javier@adios.com',
      newExpiry: '2026-08-04T10:00:00.000Z',
    })
  })

  it('surfaces the once-a-day limit message', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/admin/resend-invite`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'TOO_MANY_REQUESTS',
              message: 'Already resent today. Try again in 19 hours.',
              status_code: 429,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: `/api/v1/console/households/${ID}/admin/resend-invite`,
            },
          },
          { status: 429 },
        ),
      ),
    )

    const { result } = renderHook(() => useResendInvite(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe(
      'Already resent today. Try again in 19 hours.',
    )
  })

  it('errors when the admin has already claimed the household', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/admin/resend-invite`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'The admin has already claimed this household',
              status_code: 400,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: `/api/v1/console/households/${ID}/admin/resend-invite`,
            },
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useResendInvite(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
