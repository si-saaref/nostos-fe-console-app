import { afterEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { AuthProvider } from '@/contexts/AuthContext'
import { SESSION_HINT_COOKIE } from '@/utils/authHint'
import { AppRoutes } from '..'

const OPERATOR = {
  id: '00000000-0000-4000-8000-000000000010',
  email: 'operator@household.test',
  role: 'OPERATOR',
}

function setHint() {
  document.cookie = `${SESSION_HINT_COOKIE}=true; path=/`
}

function clearHint() {
  document.cookie = `${SESSION_HINT_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

function metricsAvailable() {
  server.use(
    http.get('*/api/v1/console/dashboard/metrics', () =>
      HttpResponse.json({
        success: true,
        data: { households: 0, members: 0, activeSignins: 0, failedSignins: 0 },
      }),
    ),
  )
}

function sessionValid() {
  server.use(
    http.get('*/api/v1/console/auth/me', () =>
      HttpResponse.json({ success: true, data: OPERATOR }),
    ),
  )
}

function renderAppAt(route: string) {
  return renderWithProviders(
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>,
    { route },
  )
}

describe('reloading the console with a live session', () => {
  afterEach(clearHint)

  it('stays on the dashboard instead of bouncing to signin', async () => {
    // A page load is indistinguishable from a refresh: nothing is in memory, and
    // the only evidence of a session is the cookie the browser sends.
    setHint()
    sessionValid()
    metricsAvailable()

    renderAppAt('/')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument()
  })

  it('shows the dashboard before /auth/me answers, so the refresh does not flicker', async () => {
    setHint()
    metricsAvailable()
    server.use(
      http.get('*/api/v1/console/auth/me', async () => {
        await delay(100)
        return HttpResponse.json({ success: true, data: OPERATOR })
      }),
    )

    renderAppAt('/')

    // Synchronous on purpose: no waitFor. The dashboard must be on screen while
    // the session check is still in flight.
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument()

    await screen.findByRole('heading', { name: 'Dashboard' })
  })

  it('sends an operator with no session to signin', async () => {
    renderAppAt('/')

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('lands the base path on the console rather than an unmatched route', async () => {
    // There is no catch-all route, so a redirect to a path that no longer exists
    // renders nothing at all — a blank page, not an error.
    setHint()
    sessionValid()
    metricsAvailable()

    renderAppAt('/')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})
