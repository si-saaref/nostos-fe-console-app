import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '@/test/test-utils'
import { ProtectedRoute } from '../ProtectedRoute'
import * as useAuthModule from '@/contexts/useAuth'

vi.mock('@/contexts/useAuth')

function renderGuarded(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/console/signin" element={<div>signin page</div>} />
      <Route
        path="/console/dashboard"
        element={
          <ProtectedRoute>
            <div>dashboard page</div>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { route },
  )
}

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ isAuthenticated: true, isLoading: false })
    renderGuarded('/console/dashboard')
    expect(screen.getByText('dashboard page')).toBeInTheDocument()
  })

  it('redirects to signin when not authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ isAuthenticated: false, isLoading: false })
    renderGuarded('/console/dashboard')
    expect(screen.getByText('signin page')).toBeInTheDocument()
  })

  it('shows a loading state while the session is resolving', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ isAuthenticated: false, isLoading: true })
    renderGuarded('/console/dashboard')
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
