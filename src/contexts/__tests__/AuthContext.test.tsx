import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { SESSION_HINT_COOKIE } from '@/utils/authHint'
import { AuthProvider } from '../AuthContext'
import { useAuth } from '../useAuth'

const OPERATOR = {
  id: '00000000-0000-4000-8000-000000000010',
  email: 'operator@household.test',
  role: 'OPERATOR',
}

const EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'

function setHint() {
  document.cookie = `${SESSION_HINT_COOKIE}=true; path=/`
}

function clearHint() {
  document.cookie = `${SESSION_HINT_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

function sessionValid() {
  server.use(
    http.get('*/api/v1/console/auth/me', () =>
      HttpResponse.json({ success: true, data: OPERATOR }),
    ),
  )
}

function sessionValidButSlow() {
  server.use(
    http.get('*/api/v1/console/auth/me', async () => {
      await delay(100)
      return HttpResponse.json({ success: true, data: OPERATOR })
    }),
  )
}

function Consumer() {
  const { status, operator, refreshSession, logout } = useAuth()
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="operator">{operator?.email ?? 'none'}</div>
      <button onClick={refreshSession}>refresh</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

function renderAuth(route?: string) {
  return renderWithProviders(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
    route ? { route } : {},
  )
}

describe('AuthProvider status derivation', () => {
  afterEach(clearHint)

  it('reports provisional while /auth/me is in flight and a hint is present', async () => {
    setHint()
    sessionValidButSlow()

    renderAuth()

    expect(screen.getByTestId('status')).toHaveTextContent('provisional')
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )
  })

  it('reports checking while /auth/me is in flight with no hint', async () => {
    sessionValidButSlow()

    renderAuth()

    expect(screen.getByTestId('status')).toHaveTextContent('checking')
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )
  })

  it('becomes authenticated and exposes the operator when the cookie is still valid', async () => {
    setHint()
    sessionValid()

    renderAuth()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )
    expect(screen.getByTestId('operator')).toHaveTextContent('operator@household.test')
  })

  it('becomes unauthenticated when the session is gone', async () => {
    renderAuth()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    )
    expect(screen.getByTestId('operator')).toHaveTextContent('none')
  })
})

describe('AuthProvider expiry messaging', () => {
  afterEach(clearHint)

  it('explains the expiry when the browser believed it was signed in', async () => {
    setHint()

    renderAuth()

    expect(await screen.findByText(EXPIRED_MESSAGE)).toBeInTheDocument()
  })

  it('stays silent when nothing was lost', async () => {
    renderAuth()

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    )
    expect(screen.queryByText(EXPIRED_MESSAGE)).not.toBeInTheDocument()
  })
})

describe('AuthProvider refreshSession and logout', () => {
  afterEach(clearHint)

  it('picks up the operator after a token exchange establishes a session mid-session', async () => {
    // The callback page mounts while anonymous — /auth/me 401s — and only then
    // does the token exchange create the session. Nothing refetches on its own,
    // because the query is staleTime: Infinity.
    let sessionExists = false
    server.use(
      http.get('*/api/v1/console/auth/me', () =>
        sessionExists
          ? HttpResponse.json({ success: true, data: OPERATOR })
          : HttpResponse.json(
              { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
              { status: 401 },
            ),
      ),
    )
    const user = userEvent.setup()

    renderAuth()
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    )

    sessionExists = true
    await user.click(screen.getByText('refresh'))

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )
    expect(screen.getByTestId('operator')).toHaveTextContent('operator@household.test')
  })

  it('treats a just-established session as provisional rather than flashing a splash', async () => {
    server.use(
      http.get('*/api/v1/console/auth/me', async () => {
        await delay(100)
        return HttpResponse.json({ success: true, data: OPERATOR })
      }),
    )
    const user = userEvent.setup()

    renderAuth()
    await user.click(screen.getByText('refresh'))

    expect(screen.getByTestId('status')).toHaveTextContent('provisional')
  })

  it('drops the operator on logout', async () => {
    setHint()
    sessionValid()
    const user = userEvent.setup()

    renderAuth()
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )

    await user.click(screen.getByText('logout'))

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated')
    expect(screen.getByTestId('operator')).toHaveTextContent('none')
  })
})

describe('AuthProvider on the signin page', () => {
  afterEach(clearHint)

  it('does not ask about a session an anonymous visitor cannot have', async () => {
    let meRequests = 0
    server.use(
      http.get('*/api/v1/console/auth/me', () => {
        meRequests += 1
        return HttpResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
          { status: 401 },
        )
      }),
    )

    renderAuth('/console/signin')

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    )
    expect(meRequests).toBe(0)
  })

  it('still asks when a hint says this browser was signed in, so the reverse guard works', async () => {
    setHint()
    sessionValid()

    renderAuth('/console/signin')

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )
  })

  it('still asks on a protected route with no hint, so a cleared-cookie operator is not ejected', async () => {
    sessionValid()

    renderAuth('/console')

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    )
  })
})
