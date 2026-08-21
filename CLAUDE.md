# CLAUDE.md

**Read [`docs/FRONTEND.md`](docs/FRONTEND.md) before making any non-trivial change.** It is the
single authoritative document for this repository — architecture, decisions, the gotchas that
cost real debugging, known defects, and the open items. It is written to be read cold.
Everything below is a summary of it, and it wins any disagreement.

Treat it as a living document: when a change invalidates something it claims, update it in the
same commit, the way you would update a test.

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

Currently green: 26 test files, 82 tests, clean build. **`npm run lint` is red** with 5
pre-existing errors (unused test imports, one `any`) — see `docs/FRONTEND.md` §11.4.

## Five things that bite

1. **Query-key singular/plural is a live bug.** Detail queries register under
   `['console', 'households', id]`; `useResendInvite` and `HouseholdDetailPage` invalidate
   `['console', 'household', id]`. Those invalidations match nothing. See `docs/FRONTEND.md` §11.
2. **Every endpoint is `/api/v1/console/...`.** The PRDs in `notes/FE/` show bare
   `/console/...` paths and are wrong.
3. **The session endpoint is `GET /auth/me`**, not `/auth/session`. The latter never existed.
4. **The dashboard is `/console`**, not `/console/dashboard` as the PRD specifies.
5. **Auth policy is not in `src/api/client.ts`** — that file is transport only. The 401/403
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

## Things older docs got wrong — do not reinstate

- **Mutations are not optimistic.** Every one is invalidate-on-success; there is no `onMutate`,
  snapshot, or rollback anywhere. Several superseded documents claimed otherwise.
- There is no `staleTime` default on the `QueryClient` — only `refetchOnWindowFocus: false`.
- Search is debounced **300 ms**, not 500 ms.
- Only one media query exists (`max-width: 768px`), not a three-tier breakpoint system.
- The gzipped bundle is ~119 kB, not "357 kB gzipped".

## Documents

`docs/FRONTEND.md` (authoritative technical record) · `PRODUCT.md` (intent, terminology,
what is deliberately undecided) · `DESIGN.md` (design system as shipped) ·
`docs/console-auth-api-contract.md` (verified contract) · `notes/FE/` (source PRDs and
architecture, all predating the build).
