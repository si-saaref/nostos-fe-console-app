import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { useDeleteHousehold } from '../useDeleteHousehold'

const ID = '3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64'

describe('useDeleteHousehold', () => {
  it('sends the DELETE confirmation and maps the schedule', async () => {
    let body: Record<string, unknown> | undefined

    server.use(
      http.post(`*/api/v1/console/households/${ID}/delete`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          success: true,
          message: 'Household marked for deletion',
          data: {
            household_id: ID,
            status: 'DELETION_PENDING',
            deletion_requested_at: '2026-08-02T10:00:00.000Z',
            scheduled_deletion_date: '2026-09-01T00:00:00.000Z',
          },
        })
      }),
    )

    const { result } = renderHook(() => useDeleteHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(body).toEqual({ confirmation: 'DELETE' })
    expect(result.current.data).toEqual({
      householdId: ID,
      status: 'DELETION_PENDING',
      deletionRequestedAt: '2026-08-02T10:00:00.000Z',
      scheduledDeletionDate: '2026-09-01T00:00:00.000Z',
    })
  })

  it('errors with the backend message when the household is already pending', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/delete`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'Household is already marked for deletion',
              status_code: 400,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: `/api/v1/console/households/${ID}/delete`,
            },
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useDeleteHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe(
      'Household is already marked for deletion',
    )
  })
})
