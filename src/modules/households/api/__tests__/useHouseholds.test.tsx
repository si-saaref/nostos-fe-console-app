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
  it('sends snake_case params and reads data plus meta.pagination', async () => {
    server.use(
      http.get('*/api/v1/console/households', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('page')).toBe('1')
        expect(url.searchParams.get('search')).toBe('Adios')
        expect(url.searchParams.get('sort_by')).toBe('created_at')
        expect(url.searchParams.get('sort_order')).toBe('DESC')

        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 'h1',
              name: 'Adios Family',
              status: 'ACTIVE',
              created_at: '2026-07-15T00:00:00.000Z',
              deletion_scheduled_for: null,
              admin_name: 'Javier',
              admin_email: 'javier@adios.com',
              member_count: 4,
            },
          ],
          meta: { pagination: { page: 1, limit: 50, total: 65, total_pages: 2 } },
        })
      }),
    )

    const { result } = renderHook(
      () => useHouseholds({ page: 1, search: 'Adios', sortBy: 'createdAt', sortOrder: 'DESC' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.households[0]).toMatchObject({
      name: 'Adios Family',
      adminName: 'Javier',
      memberCount: 4,
    })
    expect(result.current.data?.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 65,
      totalPages: 2,
    })
  })

  it('translates a camelCase sort field to its snake_case param', async () => {
    let sentSortBy: string | null = null

    server.use(
      http.get('*/api/v1/console/households', ({ request }) => {
        sentSortBy = new URL(request.url).searchParams.get('sort_by')
        return HttpResponse.json({
          success: true,
          data: [],
          meta: { pagination: { page: 1, limit: 50, total: 0, total_pages: 0 } },
        })
      }),
    )

    const { result } = renderHook(
      () => useHouseholds({ page: 1, search: '', sortBy: 'memberCount', sortOrder: 'ASC' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(sentSortBy).toBe('member_count')
  })

  it('errors when the backend rejects the query', async () => {
    server.use(
      http.get('*/api/v1/console/households', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'page must not be less than 1',
              status_code: 400,
              timestamp: '2026-07-15T00:00:00.000Z',
              path: '/api/v1/console/households',
            },
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(
      () => useHouseholds({ page: 1, search: '', sortBy: 'createdAt', sortOrder: 'DESC' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
