import { LoadingSheet } from './LoadingSheet'

/**
 * Shown only when there is no session hint and /auth/me hasn't answered yet —
 * i.e. this browser has no recent record of being signed in. An operator
 * refreshing an active session never sees this.
 */
export function SessionSplash() {
  return <LoadingSheet message="Checking your session..." />
}
