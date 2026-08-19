import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { apiClient } from '@/api/client'
import { SESSION_HINT_COOKIE } from '@/utils/authHint'
import { AuthProvider, SESSION_EXPIRED_MESSAGE } from '../AuthContext'

const PERMISSION_MESSAGE = 'You do not have permission to perform this action'

function clearHint() {
  document.cookie = `${SESSION_HINT_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

function sessionValid() {
  server.use(
    http.get('*/api/v1/console/auth/me', () =>
      HttpResponse.json({
        success: true,
        data: {
          id: '00000000-0000-4000-8000-000000000010',
          email: 'operator@household.test',
          role: 'OPERATOR',
        },
      }),
    ),
  )
}

/** Fires a request from inside the provider tree, the way a real page would. */
function Caller({ request }: { request: () => Promise<unknown> }) {
  return (
    <button
      onClick={() => {
        void request().catch(() => {})
      }}
    >
      call
    </button>
  )
}

function renderWithCaller(request: () => Promise<unknown>) {
  return renderWithProviders(
    <AuthProvider>
      <Routes>
        <Route path="/console/signin" element={<div>signin page</div>} />
        <Route path="/console" element={<Caller request={request} />} />
      </Routes>
    </AuthProvider>,
    { route: '/console' },
  )
}

describe('session loss mid-session', () => {
  afterEach(clearHint)

  it('navigates to signin and explains why, without a full page reload', async () => {
    sessionValid()
    server.use(
      http.get('*/api/v1/console/households', () => HttpResponse.json({}, { status: 401 })),
    )
    const user = userEvent.setup()

    renderWithCaller(() => apiClient.get('/api/v1/console/households'))
    await waitFor(() => expect(screen.getByText('call')).toBeInTheDocument())

    await user.click(screen.getByText('call'))

    expect(await screen.findByText('signin page')).toBeInTheDocument()
    expect(screen.getByText(SESSION_EXPIRED_MESSAGE)).toBeInTheDocument()
  })

  it('still surfaces a permission error on a 403 without signing the operator out', async () => {
    sessionValid()
    server.use(
      http.get('*/api/v1/console/households', () => HttpResponse.json({}, { status: 403 })),
    )
    const user = userEvent.setup()

    renderWithCaller(() => apiClient.get('/api/v1/console/households'))
    await waitFor(() => expect(screen.getByText('call')).toBeInTheDocument())

    await user.click(screen.getByText('call'))

    expect(await screen.findByText(PERMISSION_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText('signin page')).not.toBeInTheDocument()
  })
})

describe('401s that are not session loss', () => {
  afterEach(clearHint)

  it('leaves the signin request alone — 401 there means the email is not authorized', async () => {
    sessionValid()
    server.use(
      http.post('*/api/v1/console/auth/signin', () =>
        HttpResponse.json(
          { success: false, error: { message: 'Email not authorized to access console' } },
          { status: 401 },
        ),
      ),
    )
    const user = userEvent.setup()

    renderWithCaller(() =>
      apiClient.post('/api/v1/console/auth/signin', { email: 'stranger@example.com' }),
    )
    await waitFor(() => expect(screen.getByText('call')).toBeInTheDocument())

    await user.click(screen.getByText('call'))

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByText('signin page')).not.toBeInTheDocument()
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument()
  })

  it('does not announce an expiry when logout returns 401 — the operator asked to leave', async () => {
    sessionValid()
    server.use(
      http.post('*/api/v1/console/auth/logout', () => HttpResponse.json({}, { status: 401 })),
    )
    const user = userEvent.setup()

    renderWithCaller(() => apiClient.post('/api/v1/console/auth/logout'))
    await waitFor(() => expect(screen.getByText('call')).toBeInTheDocument())

    await user.click(screen.getByText('call'))

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument()
  })

  it('announces the expiry exactly once when /auth/me itself 401s', async () => {
    document.cookie = `${SESSION_HINT_COOKIE}=true; path=/`

    renderWithProviders(
      <AuthProvider>
        <div>app</div>
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByText(SESSION_EXPIRED_MESSAGE)).toBeInTheDocument())
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(screen.getAllByText(SESSION_EXPIRED_MESSAGE)).toHaveLength(1)
  })
})
