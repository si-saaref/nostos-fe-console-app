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
Axios. **Tailwind v4** utilities over CSS custom properties, plus **Radix** (`radix-ui`) for
Dialog and AlertDialog. No other UI library.

**Shipped:** magic-link signin and callback, sign-out with confirmation, dashboard metrics,
household list (search / sort / status filter / page size / numbered pagination), household
detail and create **as dialogs over the list**, soft-delete with a 30-day grace period, restore,
resend admin invite. Desktop and mobile for the households surfaces.

**Not built:** permission model (the session carries a `role` that nothing consumes), metrics
drill-down, a Settings page, a catch-all route, CI, error tracking.

## Commands

```bash
npm run dev                                        # Vite dev server
npm run build && npm run lint && npx vitest run    # the manual CI gate
npx vitest run -t 'name of a test or describe'     # one test
```

Currently green: 27 test files, 125 tests, clean build, and **`npm run lint` is clean** — 0
errors. The three long-standing errors (ToastProvider fast-refresh, an unused `vi`, an `any` in
`test-utils`) were fixed on 2026-08-23; `useToast` now lives in `src/components/toastContext.ts`
so `ToastProvider.tsx` exports only a component. One warning remains and is not fixable here:
React Compiler cannot memoize React Hook Form's `watch()`.

## Eight things that bite

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
5. **Route paths have no `/console` prefix, but API paths still do.** The console is served
   from its own subdomain (`console.<domain>`, beside `app.<domain>` and `api.<domain>`), so a
   path prefix would only repeat the hostname; it was removed on 2026-08-25. Routes are
   `/`, `/signin`, `/auth/signin/:token`, `/households`, `/households/new`, `/households/:id`.
   The dashboard is `/` — the PRD's `/console/dashboard` was never built either. Endpoints are
   untouched and remain `/api/v1/console/...` (see 3), and so does the query-key prefix
   `['console', ...]`. **The magic-link email must now point at
   `{FRONTEND_URL}/auth/signin/{token}`** — the backend still building the old path will send
   operators to a blank page, because there is no catch-all route.
6. **Two stylesheets, and Tailwind's scale is not Tailwind's default.** `src/styles/tokens.css`
   holds every raw design value; `src/index.css` maps them to Tailwind via `@theme inline`, themes
   the browser surfaces, and keeps the tag/ARIA-role globals. Everything else is utilities. Note
   `text-sm` is **13px** and `text-base`/`text-md` are **14px** — the console's ramp is
   12/13/14/16/20/24/30 — and the elevations are `shadow-rest` / `shadow-float` /
   `shadow-overlay`, deliberately not `shadow-sm`/`-lg`, which would alias to themselves and
   recurse. Full mapping table in `DESIGN.md`.
7. **A keyframe on a centred dialog must not set the centring translate.** Tailwind v4 emits
   `-translate-*` as the standalone `translate` property, which **composes** with `transform`, so
   a `translate(-50%,-50%)` keyframe doubles the centring instead of replacing it. Cost real
   debugging. See `modal-in` in `src/index.css`.
8. **Auth policy is not in `src/api/client.ts`** — that file is transport only. The 401/403
   interceptor is registered by `AuthProvider` inside the router so it can navigate softly
   instead of reloading and discarding its own toast.

## State ownership

One owner per kind, no exceptions, and deliberately **no global client-state store**:

| Kind | Owner |
|---|---|
| Server data | TanStack Query — the cache is the only source of truth; never copy results elsewhere |
| Filter / sort / pagination / page size | URL search params (`useHouseholdFilters`) — `page`, `search`, `sort`, `status`, `limit` |
| Session | `AuthContext` |
| Forms | React Hook Form |
| Local UI | `useState`, component-local |

## Conventions

- Components `PascalCase.tsx`, hooks `useCamelCase.ts`, directories kebab-case.
- **No new `.css` files.** If a value is missing, add a token to `tokens.css`.
- `/households/new` and `/:id` are **nested routes** under the list, rendered into its
  `<Outlet />` as dialogs. Closing navigates to the list carrying the current search params.
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
- One breakpoint, 768px, now expressed mobile-first as Tailwind's `md:`. The dashboard's metric
  grid carries one extra ad-hoc `min-[1100px]:` step, inherited from the stylesheet it replaced.
- The gzipped bundle is ~140 kB JS + ~8 kB CSS (Radix and Tailwind added ~20 kB), not
  "357 kB gzipped".
- **The register reflows on mobile.** An older DESIGN.md rule said tables scroll and never
  restack; that rule existed only because mobile was not a commitment, and it was reversed on
  2026-08-23. Above 768px it is a real table; below, each row is a card.
- **Sortable columns really are shipped now.** This file claimed them for months while
  `HouseholdTable` never called `setSort`. Wired 2026-08-23.
- **There is no `/console` route prefix and no `/` → dashboard redirect.** Removed 2026-08-25
  when the subdomain split was settled; the dashboard *is* `/`. Every older document, plan,
  spec, and commit shows `/console/...` route paths and predates it. The dated documents under
  `docs/superpowers/plans/` and `docs/superpowers/specs/` were deliberately left alone — they
  are a record of what was decided when, not a description of the app.
- **The households API is snake_case as of 2026-08-22.** Any camelCase request body, query param,
  or response field in an older document or commit predates that flip. Resend-invite is shipped
  and working; a superseded plan called for deleting it.

## Documents

`PRODUCT.md` (intent, terminology, what is deliberately undecided) · `DESIGN.md` (design system
as shipped) · `docs/console-households-api-contract.md` and `docs/console-auth-api-contract.md`
(verified contracts, read from the backend's OpenAPI document) · `notes/FE-Console/` and
`notes/BE/` (source PRDs and architecture, all predating the build) ·
`docs/superpowers/plans/` (implementation plans).
