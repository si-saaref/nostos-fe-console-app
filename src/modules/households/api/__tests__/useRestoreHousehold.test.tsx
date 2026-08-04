import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { useRestoreHousehold } from '../useRestoreHousehold'

describe('useRestoreHousehold', () => {
  it('restores household and invalidates queries', async () => {
    server.use(
      http.post('*/console/households/hhd_123/restore', () =>
        HttpResponse.json({
          success: true,
          household_id: 'hhd_123',
          status: 'ACTIVE',
          message: 'Household restored',
        }),
      ),
    )

    const { result } = renderHook(() => useRestoreHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate('hhd_123')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data?.household_id).toBe('hhd_123')
      expect(result.current.data?.status).toBe('ACTIVE')
    })
  })

  it('handles error when household not marked for deletion', async () => {
    server.use(
      http.post('*/console/households/hhd_active/restore', () =>
        HttpResponse.json(
          { error: 'Household is not marked for deletion' },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useRestoreHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate('hhd_active')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
