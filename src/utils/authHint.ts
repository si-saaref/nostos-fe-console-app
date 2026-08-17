/**
 * The backend sets this readable (non-HttpOnly) cookie alongside the HttpOnly
 * session cookie, and clears it on logout. It holds no secret and grants no
 * access — `connect.sid` is the only thing that authenticates a request.
 *
 * Its presence means "this browser was signed in recently", which is used for
 * exactly two rendering decisions:
 *   1. paint the app optimistically instead of a splash while /auth/me is in flight
 *   2. decide whether a 401 deserves a "session expired" toast
 *
 * It must NEVER inform an authorization decision. Any script on the origin can
 * read or forge it, so it is not evidence of anything. Route guards, privileged
 * controls, and anything gating data read the /auth/me query instead, whose
 * authority is the session cookie.
 */
export const SESSION_HINT_COOKIE = 'nostos_console_recent_signin'

export function hasSessionHint(): boolean {
  let raw: string
  try {
    raw = document.cookie
  } catch {
    // Cookie access can throw in hardened/private browsing contexts. Absence of
    // a hint only costs a splash, so degrade quietly.
    return false
  }

  if (!raw) return false

  return raw
    .split(';')
    .some((entry) => entry.split('=')[0]?.trim() === SESSION_HINT_COOKIE)
}
