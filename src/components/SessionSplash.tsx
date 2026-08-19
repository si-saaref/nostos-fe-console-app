/**
 * Shown only when there is no session hint and /auth/me hasn't answered yet —
 * i.e. this browser has no recent record of being signed in. An operator
 * refreshing an active session never sees this.
 */
export function SessionSplash() {
  return (
    <div className="validating">
      <div className="validating-sheet">
        <div role="status" aria-live="polite">
          Checking your session...
        </div>
        <div className="validating-rule" aria-hidden="true" />
      </div>
    </div>
  )
}
