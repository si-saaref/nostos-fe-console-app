import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { ConsoleDashboardPage } from '@/modules/dashboard/pages/ConsoleDashboardPage'
import { HouseholdsPage } from '@/modules/households/pages/HouseholdsPage'

vi.mock('@/contexts/useAuth', () => ({
  useAuth: () => ({ operator: { email: 'operator@nostos.com' } }),
}))

describe('Console request states', () => {
  it('shows unavailable metrics without calling an undocumented endpoint', async () => {
    let requests = 0
    server.use(http.get('*/console/dashboard/metrics', () => {
      requests += 1
      return HttpResponse.json({}, { status: 404 })
    }))
    renderWithProviders(<ConsoleDashboardPage />)
    expect(await screen.findByText('Metrics are unavailable.')).toBeInTheDocument()
    expect(screen.queryByText('214')).not.toBeInTheDocument()
    expect(screen.queryByText(/4 households are pending/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find a household' })).toBeInTheDocument()
    expect(requests).toBe(0)
  })

  it('shows a failed household request with retry instead of an empty register', async () => {
    let fails = true
    server.use(http.get('*/console/households', () => fails
      ? HttpResponse.json({ success: false }, { status: 500 })
      : HttpResponse.json({ success: true, data: [], meta: {
        pagination: { page: 1, limit: 50, total: 0, total_pages: 0 },
      } })))
    renderWithProviders(<HouseholdsPage />, { route: '/households' })
    const retry = await screen.findByRole('button', { name: /try again/i })
    expect(screen.queryByText(/no households yet/i)).not.toBeInTheDocument()
    fails = false
    await userEvent.setup().click(retry)
    await waitFor(() => expect(screen.getByText(/no households yet/i)).toBeInTheDocument())
  })
})
