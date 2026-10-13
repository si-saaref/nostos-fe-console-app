import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '@/test/test-utils'
import { ProtectedRoute } from '../ProtectedRoute'
import type { AuthStatus } from '@/contexts/AuthContext'
import * as useAuthModule from '@/contexts/useAuth'

vi.mock('@/contexts/useAuth')

function renderGuarded(status: AuthStatus) {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    status,
    operator: null,
    refreshSession: vi.fn(),
    logout: vi.fn(),
  })

  return renderWithProviders(
    <Routes>
      <Route path="/signin" element={<div>signin page</div>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div>dashboard page</div>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { route: '/' },
  )
}

describe('ProtectedRoute', () => {
  it('renders children once the session is confirmed', () => {
    renderGuarded('authenticated')

    expect(screen.getByText('dashboard page')).toBeInTheDocument()
  })

  it('renders children immediately on a provisional session, so a refresh does not flash', () => {
    renderGuarded('provisional')

    expect(screen.getByText('dashboard page')).toBeInTheDocument()
    expect(screen.queryByText('signin page')).not.toBeInTheDocument()
  })

  it('waits rather than guessing while the session is being checked', () => {
    renderGuarded('checking')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('dashboard page')).not.toBeInTheDocument()
    expect(screen.queryByText('signin page')).not.toBeInTheDocument()
  })

  it('redirects to signin when there is no session', () => {
    renderGuarded('unauthenticated')

    expect(screen.getByText('signin page')).toBeInTheDocument()
  })
})
