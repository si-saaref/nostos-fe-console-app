> **Status: implemented.** Shipped in commit `91d8c84`.
>
> This is the design behind `AuthContext`'s four-status model and the
> `nostos_console_recent_signin` hint cookie. It matches the code. The condensed version, plus
> the security boundary on the hint cookie, is in `docs/FRONTEND.md` §8.

---

# Session Rehydration on Page Load — Design

**Date:** 2026-08-17
**Status:** Approved for planning

## Problem

After clicking a magic link, the operator lands on the dashboard successfully.
Refreshing the page immediately redirects them to `/console/signin`, even
though the session row in the database and the session cookie in the browser
are both still valid.

## Root cause

`isAuthenticated` is plain in-memory React state — `useState(false)` in
`src/contexts/AuthContext.tsx:17`. It is set to `true` only by `login()`,
called from the magic-link callback page.

On refresh the React tree remounts, the state resets to `false`, and
`src/routes/ProtectedRoute.tsx:9` redirects to signin **before any network
request is made**. The client never asks whether the session is valid; it
asserts that it isn't.

This is the limitation recorded at lines 78–105 of
`2026-08-14-unknown-route-auth-guard-design.md`. That spec proposed
`GET /console/auth/me` as the fix. This design implements it.

## Backend requirements

**Status: both shipped and verified against a live session on 2026-08-17.**
`GET /api/v1/console/auth/me` returns `{ success: true, data: { id, email,
role } }` on 200 and the specified envelope with `code: "UNAUTHORIZED"` on 401,
with no redirect. The `nostos_console_recent_signin` cookie is set and is
readable from JS on the app origin. The frontend design below needs no
adjustment.

Two caveats remain open:

- The cookie's `Max-Age` could not be verified from the browser
  (`document.cookie` does not expose it). If it was set to 7 days rather than
  30, natural expiry becomes silent — the redirect still works, but the
  "session expired" toast never fires. Confirm from a `Set-Cookie` header when
  convenient.
- Readability is confirmed in development only, where the API and console
  share a host. See "Deployment risk" below for production.

Two additions, both in the console auth API.

### 1. `GET /api/v1/console/auth/me`

Cookie-authenticated, no request body. Standard response envelope.

```
200 → { "success": true, "data": { "id": "uuid", "email": "operator@nostos.com", "role": "OPERATOR" } }
401 → { "success": false, "error": { "code": "UNAUTHORIZED", ... } }
```

Constraints:
- No redirects. JSON only, like the other three console auth routes.
- Returns the operator's identity, not just a liveness bit — the console
  header and logout UI need it, so `/me` doubles as the session bootstrap
  query rather than being a bare ping. The three fields come from the
  existing session payload (`prd-auth-console-be.md:88`).
- Sliding expiry (`ActivityRefreshGuard`) applies or not at the backend's
  discretion — it is applied to all authenticated endpoints today, and a page
  load is genuine operator activity. Raised as a question in
  `docs/console-auth-me-backend-request.md`; the frontend behaves identically
  either way.

### 2. A readable companion cookie

Alongside the existing HttpOnly session cookie, on the same response that
establishes a session:

```
nostos_console_recent_signin=true; Max-Age=2592000; Path=/; SameSite=Lax; Secure
```

- **Not** `HttpOnly` — the frontend must be able to read it.
- `Max-Age` of 30 days — deliberately **longer** than the 7-day session. See
  "Why the hint outlives the session" below.
- Same `Path`, `Domain`, and `SameSite` as the session cookie.
- Cleared on logout, alongside the session cookie.
- Contains no secret and grants no access. Its worst case if forged is that
  an attacker makes their own browser paint a dashboard shell that `/me`
  then 401s out of a moment later.

#### Security boundary — read this before using the hint anywhere new

**The hint must never inform an authorization decision.** It is readable and
writable by any script on the origin, so treating it as evidence of anything
is a vulnerability. It is a rendering coin-flip during the first ~100ms and
nothing else.

Legitimate uses, exhaustively: choosing between a splash and an optimistic
paint, and deciding whether a 401 deserves an "expired" toast. Both are
overruled by `/me` moments later, and neither exposes data.

Illegitimate uses, to reject in review: gating a route, showing or hiding a
privileged control, skipping the `/me` query, or standing in for `status ===
'authenticated'`. Anything that must be true before data is shown reads from
the query, whose authority is the HttpOnly session cookie.

`HttpOnly` is omitted because the hint is not a credential — the attribute
exists to stop credential exfiltration, and applying it here would defeat the
cookie's only purpose while protecting a value with nothing in it.
`connect.sid` remains HttpOnly, Secure, and the sole authenticator; this
design does not alter it. Note also that `localStorage` would offer no
security advantage: XSS reads it just as easily. The cookie was chosen for
expiry semantics and desync resistance, not safety.

**Deployment risk (development verified, production open):** in development the
console (`localhost:5173`) and API (`localhost:3000`) share a host — cookies
ignore port — so the hint is readable and this is confirmed working. In
production, if the API and the console are served from different
hosts (e.g. `api.nostos.com` and `console.nostos.com`), a cookie set without
an explicit `Domain` is scoped to the API host and the console's JavaScript
cannot read it — it would need `Domain=.nostos.com`. This is a blocking
question for the backend team. **Fallback if the answer is no:** the frontend
writes the hint itself as a `document.cookie` with a 30-day `max-age`, set on
successful signin and cleared on logout and on any 401. Behavior, status
derivation, toast logic, and tests are unchanged — only the body of
`authHint.ts` differs, gaining `setSessionHint()` / `clearSessionHint()`
alongside the existing read. This is precisely why the mechanism sits behind
that one module.

## Design

### Two mechanisms, clearly separated

**The server query is the only authority.** `AuthProvider` owns one TanStack
Query — key `['console','auth','me']`, `staleTime: Infinity` — that fires once
per app boot. Its response lives in the query cache only. The operator's email
and id are **never persisted anywhere**; on refresh they are re-fetched. (Per
`CLAUDE.md`: the query cache is the only source of truth for API data.)

**The cookie hint decides the first paint and the expiry message, nothing
else.** Reading `nostos_console_recent_signin` answers one question before the
network replies: was this browser signed in recently? If removed, the app
remains correct — every refresh would show a brief splash, and expiries would
be silent.

The frontend never writes the hint. The backend sets and clears it as part of
creating and destroying sessions, so the two can never desync. Presence is the
entire signal; the value `true` exists only so a human inspecting DevTools
understands what they are looking at. `authHint.ts` exposes a single
`hasSessionHint(): boolean`, so no call site touches the raw cookie string.

#### Why the hint outlives the session

The hint means *"this browser was signed in recently"* — not *"a session is
active right now."* Both behaviors this design needs depend on that second-hand
meaning:

- **Present** → paint optimistically, and if `/me` returns 401, toast, because
  something was lost.
- **Absent** → splash, and on 401 redirect silently, because nothing was lost.

If the hint expired in lockstep with the session, an operator returning after
their session lapsed would arrive with no hint — indistinguishable from someone
who never signed in — and would be redirected with no explanation. The app has
to still believe you were signed in in order to tell you that you no longer
are. A deliberately stale hint is the mechanism that produces the expiry
message; the brief dashboard paint before it is the accepted cost. The 30-day
ceiling stops the hint from being wrong indefinitely.

### Auth status

```ts
type AuthStatus = 'checking' | 'provisional' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  operator: Operator | null      // { id, email, role }
  refreshSession: () => void     // call after a token exchange establishes a session
  logout: () => void
}
```

Derived as:

| `/me` query | Hint cookie | Status | Protected route renders |
|---|---|---|---|
| pending | present | `provisional` | content immediately — no flash |
| pending | absent | `checking` | splash |
| success | — | `authenticated` | content |
| 401 | — | `unauthenticated` | redirect to signin |

The query fires on every boot regardless of the hint. An operator whose
cookies were partially cleared but whose session cookie is live stays signed
in — they pay a splash, they are not wrongly ejected.

**One deliberate asymmetry.** `ProtectedRoute` passes on `provisional |
authenticated`; `ConsoleSigninPage` bounces to the dashboard only on
`authenticated`. If the signin page acted on `provisional`, a stale hint would
ricochet the operator signin → dashboard → signin. Briefly seeing the signin
form before a legitimate bounce is harmless; the ricochet is not.

### Where the redirect lives

The module-level 401 interceptor moves out of `src/api/client.ts` into
`AuthProvider`'s existing `useEffect`, joining the 403 handler. This requires
reordering `App.tsx` so `BrowserRouter` wraps `AuthProvider`, giving the
interceptor `useNavigate` — a soft in-app navigation instead of
`window.location.href`. The hard navigation currently reloads the page and
would wipe the expiry toast before it could be read.

`client.ts` becomes a plainly configured axios instance with no auth policy;
all auth-response handling lives in one file.

## Data flow

| Scenario | Behavior |
|---|---|
| Magic link clicked | Callback consumes the token, then calls `refreshSession()`, which resets the `/auth/me` query, and navigates to the dashboard. The backend has already set both cookies. **Corrected during implementation:** the exchange returns only `{ email }`, not `id` or `role`, so seeding the cache from it would leave a partial `Operator` and break anything reading `operator.role`. One extra `/me` request buys the full identity. `refreshSession` also marks the session optimistically, so the dashboard paints rather than flashing a splash. |
| Refresh, valid session | Hint present → dashboard paints immediately → `/me` 200 confirms → operator populates. Visually a no-op. **This is the bug being fixed.** |
| Refresh, expired or revoked session | Hint still present → dashboard paints provisionally → `/me` 401 → toast *"Your session has expired. Please sign in again."* → redirect to signin. |
| Cold visit, no hint, no session | Splash → `/me` 401 → **silent** redirect. Nothing was lost, so no toast. |
| Return after 30+ days | Hint has lapsed → treated as a cold visit: splash, silent redirect. |
| Cold visit, no hint, live session | Splash → `/me` 200 → dashboard renders. |
| `/console/signin` with live session | Form renders, `/me` settles 200 → bounce to dashboard. |
| Mid-session 401 on any data call | Interceptor: toast, soft-navigate to signin. |
| Logout | `POST /logout` clears both cookies server-side → `queryClient.clear()` → navigate to signin. |

A hint that was present is what makes an expiry an expiry: no hint means
nothing was lost, so no toast. This gives per-case toast precision with no
extra state.

## Error handling

### Interceptor exemptions

Three, each for a distinct reason:

- `POST /console/auth/signin` — 401 means "email not authorized," a normal
  user-facing response, not an expired session. Already handled at
  `src/api/client.ts:18`.
- `POST /console/auth/logout` — 401 means "already signed out." Complete the
  local logout silently; do not toast an expiry at someone who asked to leave.
- `GET /console/auth/me` — **critical.** Its 401 is handled by the query's own
  error path. Without this exemption, every expired refresh produces a double
  toast and a double navigate.

### Not every failure is a sign-out

Only `401` maps to `unauthenticated`. Network errors and 5xx responses retry
twice; if they still fail and the hint is present, the session stays
`provisional` rather than ejecting an operator whose session is fine and whose
server is briefly not. A backend hiccup must not log out the console.

## Files

### New

| File | Responsibility |
|---|---|
| `src/utils/authHint.ts` | Reads the companion cookie. Exposes `hasSessionHint(): boolean`, so no call site touches the raw cookie string. Guarded against `document.cookie` being unavailable. Read-only in the server-set design; gains `setSessionHint()` / `clearSessionHint()` if the cookie-domain fallback applies. |
| `src/api/queries/useOperatorSession.ts` | The `/me` query: key, fetcher, and retry policy (401 fails fast; network/5xx retry twice). Creates the `api/queries/` directory already planned in `CLAUDE.md`. |

### Modified

| File | Change |
|---|---|
| `src/contexts/AuthContext.tsx` | Composes the two new modules, derives `status`, owns both interceptors (401 + 403), exposes the new context value. Remove the stray `console.log(error)` at line 23. |
| `src/api/client.ts` | Delete the response interceptor. Becomes a plain configured instance. |
| `src/App.tsx` | Reorder to `QueryClientProvider > BrowserRouter > ToastProvider > AuthProvider > AppRoutes`. |
| `src/routes/ProtectedRoute.tsx` | Status-aware: splash on `checking`, redirect on `unauthenticated`, render on `provisional \| authenticated`. Remove the `console.log('KOCAK 1')` debug line at line 7. |
| `src/routes/index.tsx` | The dashboard moved from `/console/dashboard` to `/console`; `/` still redirected to the old path, which matches no route and — with no catch-all — rendered a blank page. |
| `src/modules/auth/pages/ConsoleSigninPage.tsx` | Line 14 guard becomes `status === 'authenticated'` only. |
| `src/modules/auth/pages/ConsoleSigninCallbackPage.tsx` | Calls `refreshSession()` after a successful exchange to fetch the full operator. |
| `src/components/SessionSplash.tsx` *(new)* | The `checking` state's loading view, carrying `role="status"`. |
| `src/contexts/useAuth.ts` | Type update for the new context value. |
| `docs/console-auth-api-contract.md` | Document `GET /console/auth/me` and the companion cookie. |

Consumers of the removed `isAuthenticated` boolean must be updated to the
`status` enum.

## Testing

Vitest + `@testing-library/react` + MSW, per `CLAUDE.md`.

**The regression test that pins this bug:** mount the app at
`/console` with the hint cookie set and MSW returning 200 for `/me`;
assert the dashboard stays rendered and no redirect to signin occurs. This
fails against the current code.

Beyond it:

- The hint × response matrix from the data-flow table, asserting which status
  is derived, whether the expiry toast fires, and where the operator lands.
- `authHint` unit tests: cookie present, absent, present among other cookies,
  and `document.cookie` access throwing.
- Retry policy: 401 fails immediately; a network error retries then leaves a
  hinted session `provisional` rather than ejecting.
- The three interceptor exemptions, plus soft navigation (assert no
  `window.location.href` assignment) and the unchanged 403 toast.
- `ProtectedRoute` across all four statuses.
- The callback page ends up authenticated with the **full** operator (id and
  role, not just the email the exchange returned).

Existing 401-redirect assertions in `src/api/__tests__/client.test.ts` move to
the `AuthContext` suite along with the code.

## Relationship to the unknown-route auth guard spec

`2026-08-14-unknown-route-auth-guard-design.md` is unimplemented and remains
valid. This design resolves the limitation it documents at lines 78–105: once
`ProtectedRoute` rehydrates from the server, its catch-all route will
correctly show the 404 page to a refreshing authenticated operator instead of
bouncing them to signin.

Both specs call for removing `console.log('KOCAK 1')`. Whichever lands first
takes it.

The reverse guard on `/console/signin` already exists at
`ConsoleSigninPage.tsx:14` — it is fixed here, not built. No new
`PublicOnlyRoute` component is needed.

## Out of scope

- Refreshing or extending sessions; sliding expiry.
- Multi-tab session synchronization (a logout in one tab does not
  proactively eject others — they discover it on their next request via the
  401 interceptor).
- Any change to the magic-link request or token-exchange flows beyond seeding
  the query cache.
- The 404 page and catch-all route, which belong to the 2026-08-14 spec.
