# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository is currently an **unmodified Vite + React + TypeScript scaffold** — `src/App.tsx` is still the default Vite starter page. There is no feature code, router, API client, or test runner installed yet. The real spec lives in the planning docs at the repo root and in `docs/`, described below. When asked to build features, treat those docs as the design to implement, not documentation of existing code.

## What this app is

**Nostos Operator Console** — an internal admin console for operators to manage households (not the household-member-facing app). Core scope per the PRD:

- Operator signin via **magic link only** (email input, no password) at `/console/signin`
- Dashboard with read-only metrics (households, members, active/failed signins), auto-refreshing every 5 min
- Household list (search/sort/paginate), household detail (admin + members), create household form
- Household soft-delete (30-day grace period) with restore, and admin invite resend

Route structure, wireframes, exact copy for every error toast, form field specs, and query/mutation shapes are all specified in **`prd-auth-console-fe.md`** (root) and **`docs/prd/prd-auth.md`** — these two files are identical duplicates of the same PRD; treat either as authoritative and keep them in sync if edited.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Type-check (tsc -b) then production build via Vite
npm run lint      # ESLint over the whole repo (flat config, eslint.config.js)
npm run preview   # Preview the production build locally
```

There is no test script configured yet. The architecture docs specify **Vitest + @testing-library/react + MSW** as the intended stack (see `prd-auth-console-fe.md` Section 12 and `FE-Architecture-REVISED.md` Section 10) — when adding tests for the first time, you'll need to install and wire up these deps and add a `test` script, not just write `*.test.ts` files.

TypeScript project is split via references: `tsconfig.json` → `tsconfig.app.json` (src, DOM libs, bundler resolution) + `tsconfig.node.json` (vite.config.ts, node libs). No `@/` path alias is configured yet despite architecture docs using `@/...` imports throughout — add it to both `tsconfig.app.json` (`paths`) and `vite.config.ts` (`resolve.alias`) before relying on it.

## Architecture (planned — from FE-Architecture-REVISED.md)

Two architecture docs exist at the repo root: **`FE-Architecture-REVISED.md` is authoritative**; `FE-Architecture.md` is the original draft it explicitly supersedes (its own author calls the original's TanStack Query + Zustand + Context combo a mistake). The key decision the REVISED doc makes and the original doesn't: **no Zustand, no global client-state store of any kind.**

State is split strictly by kind, each with exactly one owner:

| State kind | Owner | Notes |
|---|---|---|
| Server state (expenses, users, households, etc.) | **TanStack Query** | Query cache is the only source of truth for API data — no copying query results into other state |
| Filter/sort/pagination state | **URL search params** (React Router `useSearchParams`) | Makes filtered views bookmarkable/shareable; back button works |
| Session (user, household/tenant id, role) | **React Context** (`HouseholdContext`) | Fetched once via a `staleTime: Infinity` query, rarely changes |
| Form state | **React Hook Form** | Not `useState` |
| Local UI state (modal open, expanded row, etc.) | `useState` | Component-local only, never lifted to global state |

If you're ever about to reach for a new global store, that's a signal to re-read `FE-Architecture-REVISED.md` Section 2 — there is deliberately no category this app's state falls into where a store is the right call.

### Planned module layout

```
src/
├── api/                # TanStack Query hub: queries/, mutations/, client.ts (Axios + interceptors), queryClient.ts
├── contexts/            # HouseholdContext only — session/tenant, not general state
├── hooks/                # Cross-cutting hooks (useFilters, useDebounce, ...)
├── modules/              # Feature/domain folders: auth/, financial/, household/, ... each with components/ pages/ types/ hooks/
├── components/           # Shared, non-domain UI (Layout, Modal, PermissionGuard, ...)
├── pages/                # Layout-level route components (AuthLayout, DashboardLayout, ...)
├── routes/               # Route config + ProtectedRoute / PermissionRoute guards
├── types/                # Shared cross-module types
└── utils/                # formatters, validators, permissions, errors
```

Conventions from the architecture doc: components are PascalCase (`ExpenseForm.tsx`), hooks are camelCase starting with `use`, directories are kebab-case, and query keys follow `[domain, resource, filters]` (e.g. `['console', 'households', { page, search, sort }]`) so cache invalidation can target a whole domain via `queryClient.invalidateQueries({ queryKey: [...] })`.

### API/auth conventions to preserve when implementing

- Auth is **cookie-based** (`withCredentials: true`), never store tokens in `localStorage` — see FE-Architecture-REVISED.md Section 12 / prd-auth-console-fe.md Section 3.
- An Axios response interceptor handles `401` → redirect to signin, `403` → permission-denied toast.
- Every household-scoped query key and request must carry the tenant/household id explicitly (`['expenses', householdId, filters]`) — a query key missing it is treated as a bug in the architecture doc, since it's the multi-tenant isolation mechanism.
- Mutations use TanStack Query's optimistic-update pattern (`onMutate` snapshot → optimistic `setQueryData` → `onSuccess` invalidate → `onError` rollback), not manual refetch-after-write.
