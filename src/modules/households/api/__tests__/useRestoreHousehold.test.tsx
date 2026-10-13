import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { useRestoreHousehold } from '../useRestoreHousehold'

const ID = '3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64'

describe('useRestoreHousehold', () => {
  it('restores a household and maps the status', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/restore`, () =>
        HttpResponse.json({
          success: true,
          message: 'Household restored successfully',
          data: { household_id: ID, status: 'ACTIVE' },
        }),
      ),
    )

    const { result } = renderHook(() => useRestoreHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ householdId: ID, status: 'ACTIVE' })
  })

  it('errors with the backend message when the grace period has expired', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/restore`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'The grace period has expired',
              status_code: 400,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: `/api/v1/console/households/${ID}/restore`,
            },
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useRestoreHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('The grace period has expired')
  })
})
