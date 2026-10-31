import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useLocation } from 'react-router-dom'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/useAuth'
import { Header } from '@/components/Header'
import { ConsoleSigninPage } from '../ConsoleSigninPage'

function SessionState() {
  const { status, operator } = useAuth()
  const location = useLocation()
  return <output>{`${status}|${operator?.email ?? 'none'}|${location.pathname}`}</output>
}

function failure(status: number, message: string) {
  return HttpResponse.json({ success: false, error: {
    code: status === 401 ? 'UNAUTHORIZED' : status === 429 ? 'TOO_MANY_REQUESTS' : 'INTERNAL_SERVER_ERROR',
    message, status_code: status, timestamp: '2026-10-31T00:00:00.000Z', path: '/api/v1/console/auth/logout',
  } }, { status })
}

function renderLogout() {
  server.use(http.get('*/api/v1/console/auth/me', () => HttpResponse.json({ success: true, data: {
    id: '00000000-0000-4000-8000-000000000010', email: 'operator@nostos.com', role: 'OPERATOR',
  } })))
  return renderWithProviders(<AuthProvider><Header /><SessionState /></AuthProvider>)
}

async function confirmLogout() {
  const user = userEvent.setup()
  await screen.findByText('authenticated|operator@nostos.com|/')
  await user.click(screen.getAllByRole('button', { name: 'Sign Out' })[0])
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sign Out' }))
  return user
}

describe('console auth payload handling', () => {
  it.each([
    [429, 'Please try again later'],
    [500, 'Service temporarily unavailable'],
    [0, 'Network error. Please try again.'],
  ])('keeps the session and allows dialog retry when logout fails (%s)', async (status, message) => {
    server.use(http.post('*/api/v1/console/auth/logout', () => status ? failure(status, message) : HttpResponse.error()))
    renderLogout()
    const user = await confirmLogout()
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByText('authenticated|operator@nostos.com|/')).toBeInTheDocument()
    const dialog = screen.getByRole('alertdialog')
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Sign Out' })).toBeEnabled())
    server.use(http.post('*/api/v1/console/auth/logout', () => HttpResponse.json({ success: true, data: {}, message: 'Logged out successfully' })))
    await user.click(within(dialog).getByRole('button', { name: 'Sign Out' }))
    expect(await screen.findByText('unauthenticated|none|/signin')).toBeInTheDocument()
  })

  it('clears the local session when logout returns already unauthenticated', async () => {
    server.use(http.post('*/api/v1/console/auth/logout', () => failure(401, 'Not authenticated')))
    renderLogout()
    await confirmLogout()
    expect(await screen.findByText('unauthenticated|none|/signin')).toBeInTheDocument()
  })

  it('confirms the normalized address returned by signin', async () => {
    server.use(http.post('*/api/v1/console/auth/signin', async ({ request }) => {
      expect(await request.json()).toEqual({ email: 'Operator@Nostos.com' })
      return HttpResponse.json({ success: true, data: { email: 'operator@nostos.com' }, message: 'Check your email for a signin link' })
    }))
    renderWithProviders(<AuthProvider><ConsoleSigninPage /></AuthProvider>, { route: '/signin' })
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Enter your email'), 'Operator@Nostos.com')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(await screen.findByText('operator@nostos.com', { selector: 'strong' })).toBeInTheDocument()
  })
})
