import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { useDeleteHousehold } from '../useDeleteHousehold'

describe('useDeleteHousehold', () => {
  it('deletes household and invalidates queries', async () => {
    server.use(
      http.post('*/console/households/hhd_123/delete', () =>
        HttpResponse.json({
          success: true,
          household_id: 'hhd_123',
          status: 'DELETION_PENDING',
          deletion_requested_at: '2026-08-02T10:00:00Z',
          scheduled_deletion_date: '2026-09-01',
          message: 'Household marked for deletion',
        }),
      ),
    )

    const { result } = renderHook(() => useDeleteHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate('hhd_123')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data?.household_id).toBe('hhd_123')
      expect(result.current.data?.status).toBe('DELETION_PENDING')
    })
  })

  it('handles error response', async () => {
    server.use(
      http.post('*/console/households/hhd_invalid/delete', () =>
        HttpResponse.json(
          { error: 'Household is already marked for deletion' },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useDeleteHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate('hhd_invalid')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error).toBeDefined()
    })
  })
})
