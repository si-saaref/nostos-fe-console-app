import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/useAuth'
import { ConsoleSigninCallbackPage } from '../ConsoleSigninCallbackPage'

function DashboardStub() {
  const { status, operator } = useAuth()
  return <div>{`dashboard: ${status} ${operator?.email ?? 'no operator'}`}</div>
}

function renderCallback(token: string) {
  return renderWithProviders(
    <AuthProvider>
      <Routes>
        <Route path="/console/signin" element={<div>signin page</div>} />
        <Route path="/console" element={<DashboardStub />} />
        <Route path="/console/auth/signin/:token" element={<ConsoleSigninCallbackPage />} />
      </Routes>
    </AuthProvider>,
    { route: `/console/auth/signin/${token}` },
  )
}

describe('ConsoleSigninCallbackPage', () => {
  it('lands on the dashboard with the full operator once the token is exchanged', async () => {
    // The exchange returns only the email, so the id and role have to come from
    // /auth/me — which the callback is responsible for triggering.
    let sessionExists = false
    server.use(
      http.get('*/console/auth/signin/:token', () => {
        sessionExists = true
        return HttpResponse.json({
          success: true,
          data: { email: 'operator@test.com' },
          message: 'Signed in successfully',
        })
      }),
      http.get('*/api/v1/console/auth/me', () =>
        sessionExists
          ? HttpResponse.json({
              success: true,
              data: {
                id: '00000000-0000-4000-8000-000000000010',
                email: 'operator@household.test',
                role: 'OPERATOR',
              },
            })
          : HttpResponse.json(
              { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
              { status: 401 },
            ),
      ),
    )

    renderCallback('valid-token')

    await waitFor(() =>
      expect(
        screen.getByText('dashboard: authenticated operator@household.test'),
      ).toBeInTheDocument(),
    )
  })

  it('shows the backend error message and redirects to signin on an unknown/expired token', async () => {
    server.use(
      http.get('*/console/auth/signin/:token', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Link invalid or expired',
              statusCode: 404,
              timestamp: '2026-08-04T00:00:00.000Z',
              path: '/api/v1/console/auth/signin/bad-token',
            },
          },
          { status: 404 },
        ),
      ),
    )

    renderCallback('bad-token')

    await waitFor(() => expect(screen.getByText('signin page')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent('Link invalid or expired')
  })

  it('shows exactly one toast and redirects to signin on an invalid token, without looping', async () => {
    server.use(http.get('*/console/auth/signin/:token', () => HttpResponse.error()))

    renderCallback('bad-token')

    await waitFor(() => expect(screen.getByText('signin page')).toBeInTheDocument())

    // Give a runaway effect loop (the ToastProvider-identity bug) a chance to
    // fire repeatedly before asserting only one toast was ever shown.
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })
})
