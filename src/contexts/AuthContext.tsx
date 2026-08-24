import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isAxiosError } from 'axios'
import { useMatch, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import {
  OPERATOR_SESSION_QUERY_KEY,
  useOperatorSession,
  type Operator,
} from '@/api/queries/useOperatorSession'
import { useToast } from '@/components/toastContext'
import { hasSessionHint } from '@/utils/authHint'

/**
 * `checking`        — no hint, and /auth/me hasn't answered yet. Show a splash.
 * `provisional`     — a hint says this browser was signed in recently, so paint
 *                     the app now and let /auth/me confirm or eject.
 * `authenticated`   — /auth/me confirmed the session. The only status that
 *                     should ever gate anything beyond a loading state.
 * `unauthenticated` — no session. Redirect.
 */
export type AuthStatus = 'checking' | 'provisional' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  operator: Operator | null
  /**
   * Call after the magic-link token exchange has established a session. The
   * exchange returns only the operator's email, so the full identity comes from
   * re-running /auth/me rather than seeding the cache with a partial operator.
   */
  refreshSession: () => void
  logout: () => void
}

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function isAuthError(error: unknown): boolean {
  if (!isAxiosError(error)) return false
  const status = error.response?.status
  return status === 401 || status === 403
}

/**
 * Routes whose 401 does not mean "your session died":
 *  - signin: 401 is "email not authorized", a normal user-facing answer
 *  - logout: 401 is "already signed out" — don't announce an expiry to someone leaving
 *  - me: its 401 is handled by the query's own error path; intercepting it too
 *    would produce a duplicate toast and a duplicate navigation
 */
const SESSION_AGNOSTIC_PATHS = [
  '/console/auth/signin',
  '/console/auth/logout',
  '/console/auth/me',
]

function isSessionAgnostic(url: string | undefined): boolean {
  if (!url) return false
  return SESSION_AGNOSTIC_PATHS.some((path) => url.includes(path))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Read once at mount: this is about what to paint on the first frame, so it
  // must not change underneath us as cookies come and go.
  const [hadHint] = useState(hasSessionHint)
  const [signedOut, setSignedOut] = useState(false)
  // Set when a token exchange has just established a session. Like the cookie
  // hint, it only buys an optimistic paint while /auth/me is in flight.
  const [justSignedIn, setJustSignedIn] = useState(false)

  // The magic-link callback route cannot have a session yet — establishing one
  // is what it exists to do. Asking there is a guaranteed 401, so wait until the
  // exchange has run and refreshSession() asks on our behalf.
  const onTokenExchange = useMatch('/console/auth/signin/:token') !== null

  // The signin page asks only to power its reverse guard (bounce an operator who
  // already has a session to the dashboard). With no hint there is nothing to
  // bounce, so skip the guaranteed 401 — every anonymous visit hits this path.
  // Protected routes always ask, so an operator whose hint was cleared but whose
  // session is live still gets rehydrated rather than ejected.
  const onSigninPage = useMatch('/console/signin') !== null
  const guardIsPointless = onSigninPage && !hadHint

  const session = useOperatorSession({
    enabled: !signedOut && !onTokenExchange && !guardIsPointless,
  })
  const optimistic = hadHint || justSignedIn

  const status = useMemo<AuthStatus>(() => {
    if (signedOut) return 'unauthenticated'
    // Deliberately not asking is an answer: there is no evidence of a session,
    // and nothing is waiting on one. Reporting `checking` here would strand the
    // signin page in a loading state forever.
    if (guardIsPointless) return 'unauthenticated'
    if (session.isSuccess) return 'authenticated'
    if (session.isError) {
      // A 401 is definitive. Anything else (network, 5xx) says nothing about the
      // session, so an operator with a hint stays put rather than being ejected
      // because the server hiccuped.
      if (isAuthError(session.error)) return 'unauthenticated'
      return optimistic ? 'provisional' : 'unauthenticated'
    }
    return optimistic ? 'provisional' : 'checking'
  }, [signedOut, guardIsPointless, session.isSuccess, session.isError, session.error, optimistic])

  const operator = signedOut ? null : session.data ?? null

  // A hint that was present is what makes an expiry an expiry: without one,
  // nothing was lost and there is nothing to explain.
  const expiryAnnounced = useRef(false)
  useEffect(() => {
    if (expiryAnnounced.current) return
    if (!hadHint) return
    if (!session.isError || !isAuthError(session.error)) return

    expiryAnnounced.current = true
    toast.error(SESSION_EXPIRED_MESSAGE)
  }, [hadHint, session.isError, session.error, toast])

  useEffect(() => {
    const interceptorId = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!isAxiosError(error)) return Promise.reject(error)

        const status = error.response?.status

        if (status === 403) {
          toast.error('You do not have permission to perform this action')
        }

        if (status === 401 && !isSessionAgnostic(error.config?.url)) {
          setSignedOut(true)
          if (!expiryAnnounced.current) {
            expiryAnnounced.current = true
            toast.error(SESSION_EXPIRED_MESSAGE)
          }
          // A soft navigation, not window.location: a reload would discard the
          // toast we just queued before anyone could read it.
          navigate('/console/signin', { replace: true })
        }

        return Promise.reject(error)
      },
    )
    return () => apiClient.interceptors.response.eject(interceptorId)
  }, [toast, navigate])

  const refreshSession = useCallback(() => {
    setSignedOut(false)
    setJustSignedIn(true)
    expiryAnnounced.current = false
    // resetQueries rather than invalidateQueries: the mount-time call almost
    // certainly 401'd, and that error state has to be cleared, not just refetched.
    void queryClient.resetQueries({ queryKey: OPERATOR_SESSION_QUERY_KEY })
  }, [queryClient])

  const logout = useCallback(() => {
    setSignedOut(true)
    setJustSignedIn(false)
    queryClient.removeQueries({ queryKey: OPERATOR_SESSION_QUERY_KEY })
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ status, operator, refreshSession, logout }),
    [status, operator, refreshSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
