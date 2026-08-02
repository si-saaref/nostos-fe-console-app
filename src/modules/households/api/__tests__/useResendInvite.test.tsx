import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { useResendInvite } from '../useResendInvite'

describe('useResendInvite', () => {
  it('resends invite and invalidates household query', async () => {
    server.use(
      http.post('*/console/households/hhd_123/admin/resend-invite', () =>
        HttpResponse.json({
          success: true,
          message: 'Invite resent to javier@adios.com. Expires in 48 hours.',
          new_expiry: '2026-08-02T10:05:00Z',
        }),
      ),
    )

    const { result } = renderHook(() => useResendInvite(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate('hhd_123')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data?.success).toBe(true)
    })
  })

  it('handles rate limit error', async () => {
    server.use(
      http.post('*/console/households/hhd_123/admin/resend-invite', () =>
        HttpResponse.json(
          { error: "Can't resend. Last sent 4 hours ago. Try again in 20 hours." },
          { status: 429 },
        ),
      ),
    )

    const { result } = renderHook(() => useResendInvite(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate('hhd_123')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error).toBeDefined()
    })
  })

  it('handles admin not pending invite error', async () => {
    server.use(
      http.post('*/console/households/hhd_123/admin/resend-invite', () =>
        HttpResponse.json(
          { error: 'Admin has already claimed the household' },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useResendInvite(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate('hhd_123')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
