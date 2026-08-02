import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useHouseholds } from '../useHouseholds'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useHouseholds', () => {
  it('fetches the households list with the given filters', async () => {
    server.use(
      http.get('*/console/households', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('page')).toBe('1')
        expect(url.searchParams.get('search')).toBe('Adios')
        expect(url.searchParams.get('sort')).toBe('createdAt:desc')
        return HttpResponse.json({
          data: [
            {
              id: '1',
              name: 'Adios Family',
              adminName: 'Javier',
              adminEmail: 'javier@adios.com',
              createdAt: '2026-07-15T00:00:00.000Z',
              memberCount: 4,
              status: 'ACTIVE',
            },
          ],
          page: 1,
          totalPages: 7,
          total: 65,
        })
      }),
    )

    const { result } = renderHook(
      () => useHouseholds({ page: 1, search: 'Adios', sort: 'createdAt:desc' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data[0].name).toBe('Adios Family')
    expect(result.current.data?.totalPages).toBe(7)
  })
})
