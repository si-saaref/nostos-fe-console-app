import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { SessionSplash } from '@/components/SessionSplash'
import { useAuth } from '@/contexts/useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  // `provisional` renders straight through on purpose: the browser was signed in
  // recently, so a refresh should not flash a loading state. /auth/me is already
  // in flight and will eject us if the session is actually gone.
  if (status === 'authenticated' || status === 'provisional') {
    return <>{children}</>
  }

  if (status === 'checking') {
    return <SessionSplash />
  }

  return <Navigate to="/console/signin" replace />
}
