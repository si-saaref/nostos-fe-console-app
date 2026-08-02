import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div role="status">Loading…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/console/signin" replace />
  }

  return <>{children}</>
}
