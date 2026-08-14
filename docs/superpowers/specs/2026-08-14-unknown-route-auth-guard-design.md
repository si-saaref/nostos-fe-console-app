# Unknown-Route Auth Guard — Design

**Date:** 2026-08-14
**Status:** Approved for planning

## Problem

`src/routes/index.tsx` has no catch-all route. Visiting any URL that doesn't
match a listed path (e.g. `/console/asd`) renders a blank page, because React
Router has nothing to render and nothing redirects.

The desired behavior, as specified by the user:

1. Any page access while unauthenticated (direct link, refresh, or in-app
   navigation) must redirect to `/console/signin`.
2. Any access to an unknown route while authenticated must show a 404 page,
   not signin.
3. Accessing the base path (`/`) while authenticated must land on
   `/console/dashboard`.

## Current state (confirmed by reading the code)

- `/` unconditionally `Navigate`s to `/console/dashboard`, which is wrapped in
  `ProtectedRoute`. So base-path behavior already satisfies rule 1
  (unauthenticated → signin, via the double redirect) and rule 3
  (authenticated → dashboard). **No change needed here.**
- `ConsoleSigninPage` already redirects to `/console/dashboard` if
  `isAuthenticated` is true. **No change needed here.**
- There is no catch-all (`*`) route at all, so rule 2 (and the unknown-route
  half of rule 1) are simply unimplemented — unmatched paths render nothing.

## Design

### Components

- **`src/pages/NotFoundPage.tsx`** *(new)*. This establishes the `src/pages/`
  directory already planned in `FE-Architecture-REVISED.md` for
  layout-level route components; it doesn't exist yet because 404 is the
  first non-domain-specific page. Minimal, standalone content (no shared
  layout/navbar exists yet to match): a centered "404 — Page not found"
  message and a link back to `/console/dashboard`, styled plainly in the
  same spirit as `ConsoleSigninCallbackPage`.
- **`src/routes/index.tsx`** — add, as the last route:
  ```tsx
  <Route path="*" element={<ProtectedRoute><NotFoundPage /></ProtectedRoute>} />
  ```
  This reuses `ProtectedRoute` exactly as every other guarded route does:
  unauthenticated → redirected to `/console/signin`; authenticated → renders
  `NotFoundPage`. No new auth-branching logic is introduced anywhere.
- **`src/routes/ProtectedRoute.tsx`** — no behavioral change. Remove the
  stray `console.log('KOCAK 1')` debug line, since this component now also
  guards every unmatched URL and shouldn't emit debug noise on every miss.

### Data flow

None. The catch-all route reads `isAuthenticated` from `AuthContext` via the
existing `useAuth()` hook — the same path every other protected page already
uses. No new query, mutation, or context.

### Error handling

Not applicable — this change adds a cosmetic 404 view, not a new error
condition. The actual security boundary remains the axios response
interceptor in `src/api/client.ts` (hard-redirects to `/console/signin` on a
`401`) plus `ProtectedRoute`.

### Testing

- `src/routes/__tests__/` — add a case (alongside the existing
  `ProtectedRoute` tests, or a small addition to the route-table test if one
  exists) exercising the catch-all path: unauthenticated → redirected to
  `/console/signin`; authenticated → renders `NotFoundPage`.
- `src/pages/__tests__/NotFoundPage.test.tsx` *(new)* — renders the expected
  "not found" text and a working link to `/console/dashboard`.

## Known limitation (not fixed by this design)

`isAuthenticated` is plain in-memory React state (`useState(false)` in
`AuthContext`), set to `true` only when `login()` is called after a
successful magic-link callback, and never rehydrated from the session
cookie. There is no backend session-check endpoint today — the auth API
contract (`docs/console-auth-api-contract.md`) and the backend PRD
(`docs/prd/prd-auth-console-be.md`) only define `POST /console/auth/signin`,
`GET /console/auth/signin/:token`, and `POST /console/auth/logout`.

Consequence: a hard refresh or a brand-new tab pointed at an unknown URL will
always evaluate `isAuthenticated` as `false` at that instant, even for an
operator with a fully valid session cookie — so they'll see the signin
redirect instead of the 404 page. This is indistinguishable, client-side,
from genuinely being logged out, because nothing has told the client
otherwise yet.

This is out of scope for this design (it requires either a new backend
endpoint or a heavier client-side bootstrap step, and affects more than just
routing). It's called out here as a concrete follow-up:

**Proposed fix (future work):** add `GET /console/auth/me`, returning `200`
with `{ success: true, data: { email } }` if the session cookie is valid
(mirroring the shape of the existing `signin/:token` success response), or
`401` otherwise. A future `AuthProvider` could call this once on mount
(`staleTime: Infinity`, per the session-state convention in `CLAUDE.md`) to
correctly resolve `isAuthenticated` before the route tree renders, instead of
defaulting to `false` until `login()` fires.

## Out of scope

- Fixing the cold-load auth detection gap described above.
- Any shared console layout/navbar for the 404 page (none exists yet).
- Changes to `/`, `ConsoleSigninPage`, or any existing protected route —
  their current behavior already satisfies the stated rules.
