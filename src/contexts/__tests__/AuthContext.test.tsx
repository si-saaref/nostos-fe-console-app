import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { AuthProvider } from '../AuthContext'
import { useAuth } from '../useAuth'

function Consumer() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div>loading</div>
  return <div>{isAuthenticated ? 'authenticated' : 'anonymous'}</div>
}

describe('AuthContext', () => {
  it('reports authenticated when the session query succeeds', async () => {
    server.use(
      http.get('*/console/auth/session', () => HttpResponse.json({ email: 'operator@nostos.com' })),
    )

    renderWithProviders(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('authenticated')).toBeInTheDocument()
    })
  })

  it('reports anonymous when the session query 401s', async () => {
    server.use(
      http.get('*/console/auth/session', () => HttpResponse.json({ message: 'unauthenticated' }, { status: 401 })),
    )

    renderWithProviders(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('anonymous')).toBeInTheDocument()
    })
  })
})
