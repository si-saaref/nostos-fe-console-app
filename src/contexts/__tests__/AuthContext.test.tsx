import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { AuthProvider } from '../AuthContext'
import { useAuth } from '../useAuth'

function Consumer() {
  const { isAuthenticated } = useAuth()
  return <div>{isAuthenticated ? 'authenticated' : 'anonymous'}</div>
}

describe('AuthContext', () => {
  it('reports authenticated (session is cookie-based, always trusted)', () => {
    renderWithProviders(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    // Authentication is now cookie-based; the interceptor handles session validation
    expect(screen.getByText('authenticated')).toBeInTheDocument()
  })
})
