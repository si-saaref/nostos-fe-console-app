# CLAUDE.md

**This file plus the contract documents in `docs/` are the authoritative record.** They are
written to be read cold: architecture, decisions, the gotchas that cost real debugging, known
defects, open items.

Treat them as living documents: when a change invalidates something they claim, update them in
the same commit, the way you would update a test.

> `docs/FRONTEND.md` was archived to `docs/archive.local/FRONTEND.md` on 2026-08-21, and
> `*.local` is gitignored — so it is a local-only file that teammates who clone this repo do not
> have. Do not cite it as the authority, and do not rely on its §-numbers.

## What this is

**Nostos Operator Console** — an internal admin console for Nostos staff ("operators") to
create and repair households without touching the database. Not the household-member app.

React 19 / TypeScript strict / Vite 8 / React Router 7 / TanStack Query 5 / React Hook Form /
Axios. Plain CSS with custom properties, no framework.

**Shipped:** magic-link signin and callback, sign-out with confirmation, dashboard metrics,
household list (search / sort / paginate), household detail, create household, soft-delete with
a 30-day grace period, restore, resend admin invite.

**Not built:** permission model (the session carries a `role` that nothing consumes), metrics
drill-down, a Settings page, a catch-all route, CI, error tracking.

## Commands

```bash
npm run dev                                        # Vite dev server
npm run build && npm run lint && npx vitest run    # the manual CI gate
npx vitest run -t 'name of a test or describe'     # one test
```

Currently green: 27 test files, 125 tests, clean build. **`npm run lint` is red** with 3
pre-existing errors: `ToastProvider` fast-refresh, an unused `vi` in `ToastProvider.test`, and
one `any` in `src/test/test-utils.tsx`.

## Six things that bite

1. **Households speak snake_case and return `{ success, data }` — and the list's `data` is a
   bare array with its counts under `meta.pagination`.** Errors carry `status_code`, and
   `error.code` is what you branch on. `src/modules/households/api/wire.ts` is the only file in
   that module allowed to name a wire field; everything above it is camelCase. The verified
   contract is `docs/console-households-api-contract.md`, read off the backend's own
   `/docs-json`. **The API's casing flipped from camelCase to snake_case on 2026-08-22** and the
   list envelope changed the same day, so treat any older example as stale and re-read
   `/docs-json` when in doubt.
2. **The dashboard calls an endpoint that does not exist.** `useMetrics` requests
   `/api/v1/console/dashboard/metrics`, which is absent from the live API document — the only
   console routes served are `auth/*` and `households/*`. The metrics grid is hitting a 404.
3. **Every endpoint is `/api/v1/console/...`.** The PRDs in `notes/FE-Console/` and
   `notes/BE/` show bare `/console/...` paths and are wrong.
4. **The session endpoint is `GET /auth/me`**, not `/auth/session`. The latter never existed.
5. **The dashboard is `/console`**, not `/console/dashboard` as the PRD specifies.
6. **Auth policy is not in `src/api/client.ts`** — that file is transport only. The 401/403
   interceptor is registered by `AuthProvider` inside the router so it can navigate softly
   instead of reloading and discarding its own toast.

## State ownership

One owner per kind, no exceptions, and deliberately **no global client-state store**:

| Kind | Owner |
|---|---|
| Server data | TanStack Query — the cache is the only source of truth; never copy results elsewhere |
| Filter / sort / pagination | URL search params (`useHouseholdFilters`) |
| Session | `AuthContext` |
| Forms | React Hook Form |
| Local UI | `useState`, component-local |

## Conventions

- Components `PascalCase.tsx`, hooks `useCamelCase.ts`, directories kebab-case.
- `@/` → `src/`, configured in **both** `vite.config.ts` and `tsconfig.app.json`.
- Query keys are `['console', resource, ...]` so the domain can be invalidated in one call.
- Tests live in `__tests__/` beside the code; use `renderWithProviders` from
  `src/test/test-utils.tsx` rather than hand-rolling providers.
- Auth is cookie-based. **Never** put a token in `localStorage` — there is no token to hold.
- The `nostos_console_recent_signin` cookie is a *rendering hint only*. It is readable by any
  script on the origin and must never inform an authorization decision.
- Households unwrap responses with the strict `unwrapEnvelope` / `unwrapPaginated` from
  `src/utils/responseHandlers.ts`, and `.catch(rethrowAsApiError)` on the axios call so callers
  see an `ApiError` carrying `code` and the per-field `details` rather than axios's
  "Request failed with status code 400". Auth and metrics still use the looser
  `unwrapBackendResponse`; unifying them is open work.

## Things older docs got wrong — do not reinstate

- **Mutations are not optimistic.** Every one is invalidate-on-success; there is no `onMutate`,
  snapshot, or rollback anywhere. Several superseded documents claimed otherwise.
- There is no `staleTime` default on the `QueryClient` — only `refetchOnWindowFocus: false`.
- Search is debounced **300 ms**, not 500 ms.
- Only one media query exists (`max-width: 768px`), not a three-tier breakpoint system.
- The gzipped bundle is ~120 kB, not "357 kB gzipped".
- **The households API is snake_case as of 2026-08-22.** Any camelCase request body, query param,
  or response field in an older document or commit predates that flip. Resend-invite is shipped
  and working; a superseded plan called for deleting it.

## Documents

`PRODUCT.md` (intent, terminology, what is deliberately undecided) · `DESIGN.md` (design system
as shipped) · `docs/console-households-api-contract.md` and `docs/console-auth-api-contract.md`
(verified contracts, read from the backend's OpenAPI document) · `notes/FE-Console/` and
`notes/BE/` (source PRDs and architecture, all predating the build) ·
`docs/superpowers/plans/` (implementation plans).
