import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useMetrics } from '../useMetrics'

const metrics = {
  households: 42,
  members: 234,
  newThisWeek: 5,
  pendingDeletion: 2,
  active7d: 189,
  failedSignins: 3,
  failedEmails: 0,
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useMetrics', () => {
  it('fetches dashboard metrics', async () => {
    server.use(http.get('*/console/dashboard/metrics', () => HttpResponse.json(metrics)))

    const { result } = renderHook(() => useMetrics(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(metrics)
  })
})
