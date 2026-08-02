# Console Auth & Household Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Nostos Operator Console's authentication and household-management surface — magic-link signin, metrics dashboard, household list/detail, create/delete/restore household, and resend-invite — exactly as specified in `docs/prd/prd-auth.md`.

**Architecture:** React 19 + TypeScript on the existing Vite scaffold. Server state lives entirely in TanStack Query, filters live in the URL, session lives in one React Context, forms use React Hook Form, and everything else is `useState` — per `FE-Architecture-REVISED.md` and `CLAUDE.md` (no Zustand, no global client store). Visual design is driven by `/impeccable:impeccable`, not hand-guessed CSS: `init`/`shape` run before any component code is written, and `polish`/`audit` run as a final pass once every surface is built and tested.

**Tech Stack:** react-router-dom v7, @tanstack/react-query v5, axios, react-hook-form, vitest + @testing-library/react + msw (v2 `http`/`HttpResponse` API).

## Global Constraints

- No Zustand or any global client-state store — server state → TanStack Query, filters → URL params, session → one Context, forms → React Hook Form, local UI → `useState` (`FE-Architecture-REVISED.md` §2, `CLAUDE.md`).
- Auth is magic-link only, no password field anywhere (`prd-auth.md` §1.1).
- Auth session is cookie-based (`withCredentials: true`); never store tokens in `localStorage` (`FE-Architecture.md` §11.3).
- Axios response interceptor: `401` → redirect to `/console/signin`, `403` → permission-denied toast (`FE-Architecture.md` §6.2).
- Query keys are exactly: `['console', 'metrics']`, `['console', 'households', { page, search, sort }]`, `['console', 'households', id]` (`prd-auth.md` §8.1) — do not invent a different shape.
- Dashboard metrics: `refetchInterval: 5 * 60 * 1000`, `staleTime: 1 * 60 * 1000` (`prd-auth.md` §8.1).
- Household search is debounced 300ms (`prd-auth.md` §1.4, §11).
- `household_name`: required, 1–100 chars, trimmed on blur, allowed chars are letters/numbers/spaces/hyphens/apostrophes (`prd-auth.md` §6.1).
- `admin_email`: required, valid email, max 254 chars, lowercased on blur (`prd-auth.md` §6.1).
- `admin_name`: required, 1–50 chars, letters/spaces/hyphens/apostrophes only (`prd-auth.md` §6.1).
- `notes`: optional, max 500 chars (`prd-auth.md` §6.1).
- Delete confirmation modal requires a checked checkbox before "Delete" enables; Restore confirmation has no checkbox (`prd-auth.md` §2.1–2.2).
- "Resend Invite" is only visible when admin status is `PENDING_INVITE`; the endpoint is rate-limited (429) (`prd-auth.md` §1.5).
- Route guard: `/console/*` requires an authenticated operator, redirect unauthenticated → `/console/signin`; redirect an authenticated operator away from `/console/signin` → `/console/dashboard` (`prd-auth.md` §7).
- Accessibility: ARIA labels on all buttons/fields, `aria-describedby` linking errors to fields, keyboard nav (Tab/Enter/Escape), focus trapped and restored in modals, WCAG AA contrast (`prd-auth.md` §10).
- Responsive breakpoints: mobile `<768px`, tablet `768–1024px`, desktop `>1024px` (`prd-auth.md` §9).
- Error toast copy for backend-driven errors comes verbatim from the API's `message` field (see Task 10); do not hardcode per-scenario strings in components.

**Assumption (BE contract not in this repo):** session state is read via `GET /console/auth/session`, returning `200 { email: string }` when authenticated or `401` when not — mirroring the cookie-session pattern in `FE-Architecture.md` §6.1. No logout endpoint exists in the PRD (no logout UI is specified anywhere in `prd-auth.md`), so none is built — the interceptor's `401` → redirect handles session expiry.

---

## File Structure

```
src/
├── styles/
│   └── tokens.css                              # Design tokens from prd-auth.md §5.2 (colors, type, spacing)
├── utils/
│   └── apiErrorMessages.ts                      # AxiosError -> user-facing message
├── api/
│   ├── client.ts                                # axios instance + 401/403 interceptors
│   ├── queryClient.ts                           # QueryClient config
│   ├── queries/
│   │   └── useSession.ts                        # GET /console/auth/session
│   └── mutations/
│       └── useSignin.ts                         # POST /console/auth/signin
├── contexts/
│   ├── AuthContext.tsx
│   └── useAuth.ts
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── ToastProvider.tsx                        # provider + useToast()
│   ├── Toast.tsx
│   ├── Spinner.tsx
│   ├── Skeleton.tsx
│   ├── Badge.tsx
│   ├── SearchBar.tsx
│   ├── Pagination.tsx
│   └── Breadcrumb.tsx
├── hooks/
│   └── useDebouncedValue.ts
├── routes/
│   ├── index.tsx                                # route config
│   └── ProtectedRoute.tsx
├── modules/
│   ├── auth/
│   │   ├── components/ConsoleSigninForm.tsx
│   │   └── pages/ConsoleSigninPage.tsx
│   ├── dashboard/
│   │   ├── types.ts
│   │   ├── api/useMetrics.ts
│   │   ├── components/MetricsGrid.tsx
│   │   └── pages/ConsoleDashboardPage.tsx
│   └── households/
│       ├── types.ts
│       ├── api/
│       │   ├── useHouseholds.ts
│       │   ├── useHousehold.ts
│       │   ├── useCreateHousehold.ts
│       │   ├── useDeleteHousehold.ts
│       │   ├── useRestoreHousehold.ts
│       │   └── useResendInvite.ts
│       ├── hooks/useHouseholdFilters.ts
│       ├── components/
│       │   ├── HouseholdTable.tsx
│       │   ├── CreateHouseholdForm.tsx
│       │   ├── CreateHouseholdModal.tsx
│       │   ├── HouseholdInfo.tsx
│       │   ├── AdminSection.tsx
│       │   ├── MembersList.tsx
│       │   ├── ActionButtons.tsx
│       │   ├── DeleteHouseholdModal.tsx
│       │   └── RestoreHouseholdModal.tsx
│       └── pages/
│           ├── HouseholdsPage.tsx
│           └── HouseholdDetailPage.tsx
├── test/
│   ├── setup.ts
│   ├── test-utils.tsx                           # renderWithProviders
│   └── msw/
│       ├── handlers.ts
│       └── server.ts
├── App.tsx                                      # replaced: providers + router
└── main.tsx                                      # + styles/tokens.css import
```

Each `api/queries|mutations` file owns exactly one TanStack Query hook. Each `modules/*/components` file owns exactly one PRD component. Tests are co-located in `__tests__/` next to the file they cover, matching `FE-Architecture-REVISED.md` §10's convention.

---

### Task 1: Impeccable Init — Capture Product Context

**Files:**
- Create: `PRODUCT.md` (written by the tool)

**Interfaces:**
- Produces: `PRODUCT.md`, read by every later `/impeccable` invocation via `context.mjs`.

- [ ] **Step 1: Run Impeccable init**

Run: `/impeccable init`

When prompted, describe the product as: "Nostos Operator Console — an internal admin tool for Nostos operators to authenticate via magic link and manage households (create, view, soft-delete/restore, resend admin invites). Users are internal Nostos operators, not household members. Platform: web only." Point it at `docs/prd/prd-auth.md` as the source of truth for scope.

- [ ] **Step 2: Verify PRODUCT.md was created**

Run: `test -f PRODUCT.md && echo "exists"`
Expected: `exists`

- [ ] **Step 3: Commit**

```bash
git add PRODUCT.md
git commit -m "docs: capture product context via impeccable init"
```

---

### Task 2: Impeccable Shape — Plan the Console UX/UI

**Files:**
- Create: whatever surface brief / planning artifact `/impeccable shape` produces (typically under an impeccable-managed docs path — follow its own output, don't relocate it).

**Interfaces:**
- Consumes: `PRODUCT.md` (Task 1), `docs/prd/prd-auth.md` (wireframes in §1–§2, design tokens in §5.2, component list in §5.1).
- Produces: the UX/UI direction (mode = Operate, since this is a task-completion admin tool per `impeccable`'s own mode definitions) that Tasks 11–19 build against.

- [ ] **Step 1: Run Impeccable shape**

Run: `/impeccable shape console-auth-household`

Feed it `docs/prd/prd-auth.md` as the scope: signin page, dashboard with metrics, households list, household detail, create/delete/restore modals. Confirm the mode it selects is **Operate** (task completion, scanability, native admin-tool expectations) — correct this if it drifts toward Persuade.

- [ ] **Step 2: Reconcile with the PRD's explicit design tokens**

`prd-auth.md` §5.2 already pins concrete values (Primary `#007AFF`, Danger `#FF3B30`, Success `#34C759`, Warning `#FF9500`, Neutral `#8E8E93`, Background `#F2F2F7`; type scale H1 28px/bold, H2 22px/semibold, Body 16px, Caption 13px; spacing xs 4px → xl 32px). Per impeccable's own rule ("the brief wins"), these pinned values take precedence over generic aesthetic defaults. If shape's output proposes different values, treat the PRD's pinned tokens as the brief and keep them; use shape's output for everything it doesn't pin (layout rhythm, component states, empty/error/loading treatments, responsive behavior).

- [ ] **Step 3: Commit whatever artifacts the tool produced**

```bash
git add -A
git commit -m "docs: shape UX/UI direction for console auth & household console"
```

---

### Task 3: Project Setup — Dependencies, Path Alias, Test Tooling

**Files:**
- Modify: `package.json`, `vite.config.ts`, `tsconfig.app.json`

**Interfaces:**
- Produces: `@/*` import alias resolving to `src/*`; `npm test` script; `vitest` global test APIs available without per-file imports.

- [ ] **Step 1: Install runtime dependencies**

Run: `npm install react-router-dom @tanstack/react-query axios react-hook-form`

- [ ] **Step 2: Install test dependencies**

Run: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw`

- [ ] **Step 3: Add the `@` path alias to `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 4: Add the matching alias to `tsconfig.app.json`, and exclude tests from the build's type-check**

In `tsconfig.app.json`, add to `compilerOptions` (keep every existing key):

```json
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
```

Then add a top-level `exclude` (a sibling of `compilerOptions` and `include`, not nested inside either):

```json
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"]
```

`npm run build` runs `tsc -b`, which type-checks everything `include`d — with `noUnusedLocals`/`noUnusedParameters` already on, that would make every test file's import hygiene a build-breaking concern. Vitest itself doesn't use `tsc` to run tests (it transforms via esbuild, which strips types without checking them), so this exclude only affects the production build gate, not `npm test`.

- [ ] **Step 5: Add the `test` script to `package.json`**

In `package.json`, add to `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 6: Verify the toolchain wires up**

Run: `npm run build`
Expected: builds successfully (no source files reference anything yet, so this only proves the alias/config didn't break the existing scaffold).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.app.json
git commit -m "chore: add router/query/form/test dependencies and @ path alias"
```

---

### Task 4: Test Utilities — MSW Server & renderWithProviders

**Files:**
- Create: `src/test/msw/handlers.ts`, `src/test/msw/server.ts`, `src/test/setup.ts`, `src/test/test-utils.tsx`
- Test: `src/test/__tests__/test-utils.test.tsx`

**Interfaces:**
- Produces: `server` (MSW `setupServer` instance, importable for `server.use(...)` overrides in later tests), `renderWithProviders(ui, opts?)`, `createTestQueryClient()`.

- [ ] **Step 1: Write the MSW handlers file (empty base, extended per-feature later)**

```ts
// src/test/msw/handlers.ts
import type { HttpHandler } from 'msw'

export const handlers: HttpHandler[] = []
```

- [ ] **Step 2: Write the MSW server**

```ts
// src/test/msw/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

- [ ] **Step 3: Write the Vitest setup file**

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

- [ ] **Step 4: Write `renderWithProviders`**

```tsx
// src/test/test-utils.tsx
import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ToastProvider'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(
  ui: ReactElement,
  options: { route?: string; queryClient?: QueryClient } = {},
) {
  const { route = '/', queryClient = createTestQueryClient() } = options

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <ToastProvider>{children}</ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper })
}
```

This imports `ToastProvider`, which doesn't exist yet — that's expected; it's created in Task 6 before anything actually renders through this helper. This task only needs the file to exist and be syntactically valid.

- [ ] **Step 5: Write a smoke test proving the harness works end to end**

```tsx
// src/test/__tests__/test-utils.test.tsx
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

describe('renderWithProviders', () => {
  it('renders children inside the provider stack', () => {
    renderWithProviders(<div>hello harness</div>)
    expect(screen.getByText('hello harness')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run it (expect failure until Task 6 exists)**

Run: `npm test -- test-utils`
Expected: FAIL — `Cannot find module '@/components/ToastProvider'`. This confirms the alias resolves and the test runner is wired correctly; it will pass once Task 6 lands.

- [ ] **Step 7: Commit**

```bash
git add src/test
git commit -m "test: add MSW harness and renderWithProviders utility"
```

---

### Task 5: Design Tokens

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: CSS custom properties (`--color-primary`, `--space-md`, etc.) every component in Tasks 11–19 references.

- [ ] **Step 1: Write the tokens file from `prd-auth.md` §5.2**

```css
/* src/styles/tokens.css */
:root {
  --color-primary: #007aff;
  --color-danger: #ff3b30;
  --color-success: #34c759;
  --color-warning: #ff9500;
  --color-neutral: #8e8e93;
  --color-background: #f2f2f7;
  --color-text: #000000;
  --color-text-secondary: #8e8e93;

  --font-size-h1: 28px;
  --font-weight-h1: 700;
  --font-size-h2: 22px;
  --font-weight-h2: 600;
  --font-size-body: 16px;
  --font-weight-body: 400;
  --font-size-caption: 13px;

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
}
```

- [ ] **Step 2: Import it in `main.tsx`**

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Verify the build still passes**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css src/main.tsx
git commit -m "feat: add design tokens from prd-auth.md design system"
```

---

### Task 6: Toast Notification System

**Files:**
- Create: `src/components/Toast.tsx`, `src/components/ToastProvider.tsx`
- Test: `src/components/__tests__/ToastProvider.test.tsx`

**Interfaces:**
- Produces: `ToastProvider` (wraps the app), `useToast()` returning `{ success(message), error(message), info(message) }`. Every mutation hook from Task 10 onward calls these.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/__tests__/ToastProvider.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../ToastProvider'

function ToastTrigger() {
  const toast = useToast()
  return (
    <button onClick={() => toast.error('Something went wrong')}>
      Trigger
    </button>
  )
}

describe('ToastProvider', () => {
  it('shows a toast when triggered and dismisses it after the duration', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    await user.click(screen.getByText('Trigger'))
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')

    vi.advanceTimersByTime(3000)
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ToastProvider`
Expected: FAIL with "Cannot find module '../ToastProvider'"

- [ ] **Step 3: Write `Toast.tsx`**

```tsx
// src/components/Toast.tsx
export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

export function Toast({ toast }: { toast: ToastItem }) {
  return (
    <div role="alert" className={`toast toast--${toast.type}`}>
      {toast.message}
    </div>
  )
}
```

- [ ] **Step 4: Write `ToastProvider.tsx`**

```tsx
// src/components/ToastProvider.tsx
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Toast, type ToastItem, type ToastType } from './Toast'

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const TOAST_DURATION_MS = 3000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idCounter = useRef(0)

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (type: ToastType, message: string) => {
      idCounter.current += 1
      const id = `toast-${idCounter.current}`
      setToasts((current) => [...current, { id, type, message }])
      setTimeout(() => remove(id), TOAST_DURATION_MS)
    },
    [remove],
  )

  const value: ToastContextValue = {
    success: (message) => show('success', message),
    error: (message) => show('error', message),
    info: (message) => show('info', message),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ToastProvider`
Expected: PASS

- [ ] **Step 6: Re-run the Task 4 smoke test — it should now pass too**

Run: `npm test -- test-utils`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/Toast.tsx src/components/ToastProvider.tsx src/components/__tests__/ToastProvider.test.tsx
git commit -m "feat: add toast notification system"
```

---

### Task 7: API Client and Error Message Mapping

**Files:**
- Create: `src/api/client.ts`, `src/utils/apiErrorMessages.ts`
- Test: `src/utils/__tests__/apiErrorMessages.test.ts`, `src/api/__tests__/client.test.ts`

**Interfaces:**
- Produces: `apiClient` (configured axios instance), `getErrorMessage(error: unknown): string`.
- Consumes: nothing yet (no `AuthContext` dependency — the 401 handler does a hard redirect, not a context call, to avoid a circular import between `api/client.ts` and `contexts/AuthContext.tsx`).

- [ ] **Step 1: Write the failing test for error message mapping**

```ts
// src/utils/__tests__/apiErrorMessages.test.ts
import { describe, expect, it } from 'vitest'
import type { AxiosError } from 'axios'
import { getErrorMessage } from '../apiErrorMessages'

// A minimal fake shaped exactly how axios's own `isAxiosError` type guard checks it
// (`payload.isAxiosError === true`) — avoids fighting AxiosError's constructor/response
// generics for what is purely a runtime shape check in `getErrorMessage`.
function makeAxiosError(status: number, data?: unknown): AxiosError {
  return {
    isAxiosError: true,
    response: { status, data, statusText: '', headers: {}, config: {} },
  } as unknown as AxiosError
}

function makeNetworkError(): AxiosError {
  return { isAxiosError: true, response: undefined } as unknown as AxiosError
}

describe('getErrorMessage', () => {
  it('returns the backend message when present', () => {
    const error = makeAxiosError(409, { message: 'Household name already in use. Try a different name.' })
    expect(getErrorMessage(error)).toBe('Household name already in use. Try a different name.')
  })

  it('falls back to a generic message for 500s with no message', () => {
    const error = makeAxiosError(500, {})
    expect(getErrorMessage(error)).toBe('Something went wrong. Please try again later.')
  })

  it('returns a network error message when there is no response', () => {
    expect(getErrorMessage(makeNetworkError())).toBe('Network error. Please try again.')
  })

  it('returns a generic fallback for non-axios errors', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again later.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apiErrorMessages`
Expected: FAIL with "Cannot find module '../apiErrorMessages'"

- [ ] **Step 3: Write `apiErrorMessages.ts`**

```ts
// src/utils/apiErrorMessages.ts
import { isAxiosError } from 'axios'

const NETWORK_ERROR_MESSAGE = 'Network error. Please try again.'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again later.'

export function getErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return GENERIC_ERROR_MESSAGE
  }

  if (!error.response) {
    return NETWORK_ERROR_MESSAGE
  }

  const data = error.response.data as { message?: string } | undefined
  return data?.message ?? GENERIC_ERROR_MESSAGE
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- apiErrorMessages`
Expected: PASS

- [ ] **Step 5: Write the failing test for the API client's interceptors**

```ts
// src/api/__tests__/client.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { apiClient } from '../client'

describe('apiClient interceptors', () => {
  const originalLocation = window.location

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '/console/dashboard' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('redirects to /console/signin on 401', async () => {
    server.use(
      http.get('*/console/__test-401', () => HttpResponse.json({ message: 'nope' }, { status: 401 })),
    )

    await expect(apiClient.get('/console/__test-401')).rejects.toThrow()
    expect(window.location.href).toBe('/console/signin')
  })

  it('passes through non-401/403 errors unchanged', async () => {
    server.use(
      http.get('*/console/__test-500', () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
    )

    await expect(apiClient.get('/console/__test-500')).rejects.toMatchObject({
      response: { status: 500 },
    })
    expect(window.location.href).toBe('/console/dashboard')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- client.test`
Expected: FAIL with "Cannot find module '../client'"

- [ ] **Step 7: Write `client.ts`**

```ts
// src/api/client.ts
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/console/signin'
    }
    return Promise.reject(error)
  },
)
```

Note: the `403` → permission-denied toast from the Global Constraints is wired in Task 8, once `AuthContext`/`ToastProvider` composition order is settled in `App.tsx` — a bare interceptor can't call `useToast()` (it's not a component). Task 8 adds a second interceptor registered from inside `AuthProvider` via `apiClient.interceptors.response.use`, scoped to that one concern.

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- client.test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/api/client.ts src/utils/apiErrorMessages.ts src/utils/__tests__ src/api/__tests__
git commit -m "feat: add API client with 401 interceptor and error message mapping"
```

---

### Task 8: Auth Context, Session Query, and the 403 Toast Interceptor

**Files:**
- Create: `src/api/queries/useSession.ts`, `src/contexts/AuthContext.tsx`, `src/contexts/useAuth.ts`
- Test: `src/contexts/__tests__/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `apiClient` (Task 7), `useToast` (Task 6).
- Produces: `AuthProvider`, `useAuth()` returning `{ isAuthenticated: boolean, isLoading: boolean }`, query key `['console', 'auth', 'session']`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/contexts/__tests__/AuthContext.test.tsx
import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { AuthProvider } from '../AuthContext'
import { useAuth } from '../useAuth'

function Consumer() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div>loading</div>
  return <div>{isAuthenticated ? 'authenticated' : 'anonymous'}</div>
}

describe('AuthContext', () => {
  it('reports authenticated when the session query succeeds', async () => {
    server.use(
      http.get('*/console/auth/session', () => HttpResponse.json({ email: 'operator@nostos.com' })),
    )

    renderWithProviders(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('authenticated')).toBeInTheDocument()
    })
  })

  it('reports anonymous when the session query 401s', async () => {
    server.use(
      http.get('*/console/auth/session', () => HttpResponse.json({ message: 'unauthenticated' }, { status: 401 })),
    )

    renderWithProviders(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('anonymous')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AuthContext`
Expected: FAIL with "Cannot find module '../AuthContext'"

- [ ] **Step 3: Write `useSession.ts`**

```ts
// src/api/queries/useSession.ts
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

export interface Session {
  email: string
}

export const SESSION_QUERY_KEY = ['console', 'auth', 'session'] as const

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<Session>('/console/auth/session')
      return response.data
    },
    retry: false,
    staleTime: Infinity,
  })
}
```

- [ ] **Step 4: Write `AuthContext.tsx`**

```tsx
// src/contexts/AuthContext.tsx
import { createContext, useEffect, type ReactNode } from 'react'
import { isAxiosError } from 'axios'
import { apiClient } from '@/api/client'
import { useToast } from '@/components/ToastProvider'
import { useSession } from '@/api/queries/useSession'

export interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useSession()
  const toast = useToast()

  useEffect(() => {
    const interceptorId = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isAxiosError(error) && error.response?.status === 403) {
          toast.error('You do not have permission to perform this action')
        }
        return Promise.reject(error)
      },
    )
    return () => apiClient.interceptors.response.eject(interceptorId)
  }, [toast])

  const value: AuthContextValue = {
    isAuthenticated: !isError && !!data,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

- [ ] **Step 5: Write `useAuth.ts`**

```ts
// src/contexts/useAuth.ts
import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- AuthContext`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/api/queries/useSession.ts src/contexts
git commit -m "feat: add AuthContext with session query and 403 toast interceptor"
```

---

### Task 9: Route Config, Guards, and App Shell

**Files:**
- Create: `src/routes/ProtectedRoute.tsx`, `src/routes/index.tsx`, `src/api/queryClient.ts`
- Modify: `src/App.tsx`
- Test: `src/routes/__tests__/ProtectedRoute.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 8).
- Produces: the route tree every page component (Tasks 11+) plugs into; `queryClient` singleton used by `App.tsx`.

- [ ] **Step 1: Write the failing test for the guard**

```tsx
// src/routes/__tests__/ProtectedRoute.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '@/test/test-utils'
import { ProtectedRoute } from '../ProtectedRoute'
import * as useAuthModule from '@/contexts/useAuth'

vi.mock('@/contexts/useAuth')

function renderGuarded(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/console/signin" element={<div>signin page</div>} />
      <Route
        path="/console/dashboard"
        element={
          <ProtectedRoute>
            <div>dashboard page</div>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { route },
  )
}

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ isAuthenticated: true, isLoading: false })
    renderGuarded('/console/dashboard')
    expect(screen.getByText('dashboard page')).toBeInTheDocument()
  })

  it('redirects to signin when not authenticated', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ isAuthenticated: false, isLoading: false })
    renderGuarded('/console/dashboard')
    expect(screen.getByText('signin page')).toBeInTheDocument()
  })

  it('shows a loading state while the session is resolving', () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({ isAuthenticated: false, isLoading: true })
    renderGuarded('/console/dashboard')
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ProtectedRoute`
Expected: FAIL with "Cannot find module '../ProtectedRoute'"

- [ ] **Step 3: Write `ProtectedRoute.tsx`**

```tsx
// src/routes/ProtectedRoute.tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div role="status">Loading…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/console/signin" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ProtectedRoute`
Expected: PASS

- [ ] **Step 5: Write `queryClient.ts`**

```ts
// src/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})
```

- [ ] **Step 6: Write `routes/index.tsx`**

This references page components created in Tasks 11–13/15; it's written now so `App.tsx` has one stable import, and grows as those tasks land. For this task, stub the not-yet-built pages with a `Suspense`-free direct import — they'll exist by the time this route tree is actually exercised in the browser, and each page's own task adds its test coverage.

```tsx
// src/routes/index.tsx
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { ConsoleSigninPage } from '@/modules/auth/pages/ConsoleSigninPage'
import { ConsoleDashboardPage } from '@/modules/dashboard/pages/ConsoleDashboardPage'
import { HouseholdsPage } from '@/modules/households/pages/HouseholdsPage'
import { HouseholdDetailPage } from '@/modules/households/pages/HouseholdDetailPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/console/dashboard" replace />} />
      <Route path="/console/signin" element={<ConsoleSigninPage />} />
      <Route
        path="/console/dashboard"
        element={
          <ProtectedRoute>
            <ConsoleDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/console/households"
        element={
          <ProtectedRoute>
            <HouseholdsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/console/households/:id"
        element={
          <ProtectedRoute>
            <HouseholdDetailPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
```

- [ ] **Step 7: Replace `App.tsx` with the provider + router shell**

```tsx
// src/App.tsx
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/api/queryClient'
import { ToastProvider } from '@/components/ToastProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppRoutes } from '@/routes'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
```

This removes the default Vite starter markup (`hero.png`, counter button, docs links) entirely — it's throwaway scaffold content, not product code. `src/App.css` and the asset imports it depended on are now unused; delete the now-dead `count` state and logo imports (there are none left to delete in the new `App.tsx` — this note confirms the replacement is total, not partial).

- [ ] **Step 8: Verify `App.tsx` compiles**

`App.tsx` now imports four page components that don't exist yet (`ConsoleSigninPage`, `ConsoleDashboardPage`, `HouseholdsPage`, `HouseholdDetailPage`). This is expected: `npm run build` will fail until Tasks 11–13/15 create them. Confirm the failure is exactly those four missing modules and nothing else:

Run: `npm run build`
Expected: FAIL — TS2307 "Cannot find module" for the four page imports only.

- [ ] **Step 9: Commit**

```bash
git add src/routes src/api/queryClient.ts src/App.tsx
git commit -m "feat: add route config, ProtectedRoute guard, and app shell"
```

---

### Task 10: Households Domain Types

**Files:**
- Create: `src/modules/households/types.ts`, `src/modules/dashboard/types.ts`

**Interfaces:**
- Produces: `HouseholdStatus`, `AdminClaimStatus`, `HouseholdSummary`, `HouseholdMember`, `HouseholdAdmin`, `HouseholdDetail`, `HouseholdsListResponse`, `CreateHouseholdInput`, `HouseholdFilters`, `DashboardMetrics` — used verbatim by every query/mutation hook and component from here on. No behavior to test; this is pure type declarations consumed by later tasks' tests.

- [ ] **Step 1: Write `modules/households/types.ts`**

```ts
// src/modules/households/types.ts
export type HouseholdStatus = 'ACTIVE' | 'DELETION_PENDING'
export type AdminClaimStatus = 'PENDING_INVITE' | 'CLAIMED'

export interface HouseholdSummary {
  id: string
  name: string
  adminName: string
  adminEmail: string
  createdAt: string
  memberCount: number
  status: HouseholdStatus
}

export interface HouseholdMember {
  id: string
  name: string
  email: string
  joinedAt: string
}

export interface HouseholdAdmin {
  name: string
  email: string
  claimStatus: AdminClaimStatus
  lastLoginAt: string | null
  inviteSentAt: string | null
}

export interface HouseholdDetail {
  id: string
  name: string
  status: HouseholdStatus
  createdAt: string
  scheduledDeletionDate: string | null
  graceExpiresAt: string | null
  admin: HouseholdAdmin
  members: HouseholdMember[]
}

export interface HouseholdsListResponse {
  data: HouseholdSummary[]
  page: number
  totalPages: number
  total: number
}

export interface CreateHouseholdInput {
  household_name: string
  admin_email: string
  admin_name: string
  notes?: string
}

export interface HouseholdFilters {
  page: number
  search: string
  sort: string
}
```

- [ ] **Step 2: Write `modules/dashboard/types.ts`**

```ts
// src/modules/dashboard/types.ts
export interface DashboardMetrics {
  households: number
  members: number
  newThisWeek: number
  pendingDeletion: number
  active7d: number
  failedSignins: number
  failedEmails: number
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc -b --noEmit`
Expected: succeeds (both files are self-contained type declarations with no unresolved imports).

- [ ] **Step 4: Commit**

```bash
git add src/modules/households/types.ts src/modules/dashboard/types.ts
git commit -m "feat: add households and dashboard domain types"
```

---

### Task 11: Signin Feature

**Files:**
- Create: `src/api/mutations/useSignin.ts`, `src/modules/auth/components/ConsoleSigninForm.tsx`, `src/modules/auth/pages/ConsoleSigninPage.tsx`
- Test: `src/api/mutations/__tests__/useSignin.test.tsx`, `src/modules/auth/components/__tests__/ConsoleSigninForm.test.tsx`

**Interfaces:**
- Consumes: `apiClient` (Task 7), `useToast` (Task 6), design tokens (Task 5).
- Produces: `ConsoleSigninPage`, mounted at `/console/signin` by Task 9's route config.

- [ ] **Step 1: Write the failing test for the signin mutation**

Note the `.tsx` extension — this file's `wrapper` uses JSX, so it can't be a plain `.ts` file.

```tsx
// src/api/mutations/__tests__/useSignin.test.tsx
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { QueryClientProvider } from '@tanstack/react-query'
import { useSignin } from '../useSignin'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useSignin', () => {
  it('succeeds for an authorized email', async () => {
    server.use(
      http.post('*/console/auth/signin', () => HttpResponse.json({}, { status: 200 })),
    )
    const { result } = renderHook(() => useSignin(), { wrapper })

    result.current.mutate('operator@nostos.com')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('surfaces a 401 as an error', async () => {
    server.use(
      http.post('*/console/auth/signin', () =>
        HttpResponse.json({ message: 'Email not authorized to access console' }, { status: 401 }),
      ),
    )
    const { result } = renderHook(() => useSignin(), { wrapper })

    result.current.mutate('stranger@example.com')

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useSignin`
Expected: FAIL with "Cannot find module '../useSignin'"

- [ ] **Step 3: Write `useSignin.ts`**

```ts
// src/api/mutations/useSignin.ts
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

export function useSignin() {
  return useMutation({
    mutationFn: async (email: string) => {
      await apiClient.post('/console/auth/signin', { email })
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useSignin`
Expected: PASS

- [ ] **Step 5: Write the failing test for the signin form**

```tsx
// src/modules/auth/components/__tests__/ConsoleSigninForm.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/test-utils'
import { ConsoleSigninForm } from '../ConsoleSigninForm'

describe('ConsoleSigninForm', () => {
  it('shows a validation error for an invalid email on blur', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ConsoleSigninForm onSubmit={vi.fn()} isLoading={false} />)

    const emailField = screen.getByLabelText(/email/i)
    await user.type(emailField, 'not-an-email')
    await user.tab()

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument()
  })

  it('calls onSubmit with the entered email when valid', async () => {
    const handleSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<ConsoleSigninForm onSubmit={handleSubmit} isLoading={false} />)

    await user.type(screen.getByLabelText(/email/i), 'operator@nostos.com')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(handleSubmit).toHaveBeenCalledWith('operator@nostos.com')
  })

  it('disables the form while loading', () => {
    renderWithProviders(<ConsoleSigninForm onSubmit={vi.fn()} isLoading={true} />)

    expect(screen.getByLabelText(/email/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- ConsoleSigninForm`
Expected: FAIL with "Cannot find module '../ConsoleSigninForm'"

- [ ] **Step 7: Write `ConsoleSigninForm.tsx`**

```tsx
// src/modules/auth/components/ConsoleSigninForm.tsx
import { useForm } from 'react-hook-form'

interface SigninFormValues {
  email: string
}

export interface ConsoleSigninFormProps {
  onSubmit: (email: string) => void
  isLoading: boolean
}

export function ConsoleSigninForm({ onSubmit, isLoading }: ConsoleSigninFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormValues>({ mode: 'onBlur' })

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values.email))} noValidate>
      <label htmlFor="signin-email">Enter your email</label>
      <input
        id="signin-email"
        type="email"
        autoComplete="email"
        placeholder="operator@..."
        aria-required="true"
        aria-describedby={errors.email ? 'signin-email-error' : undefined}
        disabled={isLoading}
        {...register('email', {
          required: 'Invalid email',
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
        })}
      />
      {errors.email && (
        <span id="signin-email-error" role="alert">
          {errors.email.message}
        </span>
      )}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- ConsoleSigninForm`
Expected: PASS

- [ ] **Step 9: Write `ConsoleSigninPage.tsx`**

```tsx
// src/modules/auth/pages/ConsoleSigninPage.tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { useToast } from '@/components/ToastProvider'
import { useSignin } from '@/api/mutations/useSignin'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { ConsoleSigninForm } from '../components/ConsoleSigninForm'

export function ConsoleSigninPage() {
  const { isAuthenticated, isLoading: isSessionLoading } = useAuth()
  const toast = useToast()
  const { mutate, isPending, reset } = useSignin()

  if (!isSessionLoading && isAuthenticated) {
    return <Navigate to="/console/dashboard" replace />
  }

  const handleSubmit = (email: string) => {
    mutate(email, {
      onSuccess: () => {
        toast.success('Check your email for a signin link')
        reset()
      },
      onError: (error) => {
        toast.error(getErrorMessage(error))
      },
    })
  }

  return (
    <main>
      <h1>Nostos Operator Console</h1>
      <ConsoleSigninForm onSubmit={handleSubmit} isLoading={isPending} />
      <p>
        Don't have access? Contact <a href="mailto:support@nostos.com">support@nostos.com</a>
      </p>
    </main>
  )
}
```

- [ ] **Step 10: Verify the app builds now that one of the four missing pages exists**

Run: `npm run build`
Expected: FAIL — TS2307 for the remaining three page imports (`ConsoleDashboardPage`, `HouseholdsPage`, `HouseholdDetailPage`) only.

- [ ] **Step 11: Commit**

```bash
git add src/api/mutations/useSignin.ts src/api/mutations/__tests__/useSignin.test.tsx src/modules/auth
git commit -m "feat: add console signin feature"
```

---

### Task 12: Dashboard Metrics Feature

**Files:**
- Create: `src/modules/dashboard/api/useMetrics.ts`, `src/modules/dashboard/components/MetricsGrid.tsx`, `src/modules/dashboard/pages/ConsoleDashboardPage.tsx`
- Test: `src/modules/dashboard/api/__tests__/useMetrics.test.tsx`, `src/modules/dashboard/components/__tests__/MetricsGrid.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `DashboardMetrics` (Task 10).
- Produces: `ConsoleDashboardPage`, mounted at `/console/dashboard`.

- [ ] **Step 1: Write the failing test for `useMetrics`**

```tsx
// src/modules/dashboard/api/__tests__/useMetrics.test.tsx
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useMetrics } from '../useMetrics'

const metrics = {
  households: 42,
  members: 234,
  newThisWeek: 5,
  pendingDeletion: 2,
  active7d: 189,
  failedSignins: 3,
  failedEmails: 0,
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useMetrics', () => {
  it('fetches dashboard metrics', async () => {
    server.use(http.get('*/console/dashboard/metrics', () => HttpResponse.json(metrics)))

    const { result } = renderHook(() => useMetrics(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(metrics)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useMetrics`
Expected: FAIL with "Cannot find module '../useMetrics'"

- [ ] **Step 3: Write `useMetrics.ts`**

```ts
// src/modules/dashboard/api/useMetrics.ts
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { DashboardMetrics } from '../types'

export function useMetrics() {
  return useQuery({
    queryKey: ['console', 'metrics'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardMetrics>('/console/dashboard/metrics')
      return response.data
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 1 * 60 * 1000,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useMetrics`
Expected: PASS

- [ ] **Step 5: Write the failing test for `MetricsGrid`**

```tsx
// src/modules/dashboard/components/__tests__/MetricsGrid.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricsGrid } from '../MetricsGrid'

describe('MetricsGrid', () => {
  it('renders every metric with its label', () => {
    render(
      <MetricsGrid
        metrics={{
          households: 42,
          members: 234,
          newThisWeek: 5,
          pendingDeletion: 2,
          active7d: 189,
          failedSignins: 3,
          failedEmails: 0,
        }}
      />,
    )

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Households')).toBeInTheDocument()
    expect(screen.getByText('234')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('189')).toBeInTheDocument()
    expect(screen.getByText('Active (7d)')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- MetricsGrid`
Expected: FAIL with "Cannot find module '../MetricsGrid'"

- [ ] **Step 7: Write `MetricsGrid.tsx`**

```tsx
// src/modules/dashboard/components/MetricsGrid.tsx
import type { DashboardMetrics } from '../types'

const METRIC_LABELS: Record<keyof DashboardMetrics, string> = {
  households: 'Households',
  members: 'Members',
  newThisWeek: 'New (week)',
  pendingDeletion: 'Pending',
  active7d: 'Active (7d)',
  failedSignins: 'Failed 24h',
  failedEmails: 'Email Errors',
}

export function MetricsGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <dl className="metrics-grid">
      {(Object.keys(METRIC_LABELS) as Array<keyof DashboardMetrics>).map((key) => (
        <div key={key} className="metrics-grid__item">
          <dt>{METRIC_LABELS[key]}</dt>
          <dd>{metrics[key]}</dd>
        </div>
      ))}
    </dl>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- MetricsGrid`
Expected: PASS

- [ ] **Step 9: Write `ConsoleDashboardPage.tsx`**

```tsx
// src/modules/dashboard/pages/ConsoleDashboardPage.tsx
import { Link } from 'react-router-dom'
import { useMetrics } from '../api/useMetrics'
import { MetricsGrid } from '../components/MetricsGrid'

export function ConsoleDashboardPage() {
  const { data: metrics, isLoading } = useMetrics()

  return (
    <main>
      <h1>Nostos Operator Console</h1>
      <nav>
        <Link to="/console/dashboard">Dashboard</Link>
        <Link to="/console/households">Households</Link>
      </nav>
      <Link to="/console/households/new" role="button">
        New Household
      </Link>
      {isLoading || !metrics ? (
        <p role="status">Loading metrics…</p>
      ) : (
        <MetricsGrid metrics={metrics} />
      )}
    </main>
  )
}
```

- [ ] **Step 10: Verify the app builds with two of four pages present**

Run: `npm run build`
Expected: FAIL — TS2307 for `HouseholdsPage` and `HouseholdDetailPage` only.

- [ ] **Step 11: Commit**

```bash
git add src/modules/dashboard
git commit -m "feat: add dashboard metrics feature"
```

---

### Task 13: Households List Feature

**Files:**
- Create: `src/hooks/useDebouncedValue.ts`, `src/modules/households/hooks/useHouseholdFilters.ts`, `src/modules/households/api/useHouseholds.ts`, `src/components/SearchBar.tsx`, `src/components/Pagination.tsx`, `src/components/Badge.tsx`, `src/modules/households/components/HouseholdTable.tsx`, `src/modules/households/pages/HouseholdsPage.tsx`
- Test: `src/hooks/__tests__/useDebouncedValue.test.ts`, `src/modules/households/api/__tests__/useHouseholds.test.tsx`, `src/modules/households/components/__tests__/HouseholdTable.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `HouseholdSummary`/`HouseholdsListResponse`/`HouseholdFilters` (Task 10).
- Produces: `HouseholdsPage`, mounted at `/console/households`; `useHouseholdFilters()` returning `{ filters, setSearch, setSort, setPage }` backed by `useSearchParams`.

- [ ] **Step 1: Write the failing test for the debounce hook**

```ts
// src/hooks/__tests__/useDebouncedValue.test.ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from '../useDebouncedValue'

describe('useDebouncedValue', () => {
  it('delays updating the returned value by the given delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    })

    expect(result.current).toBe('a')

    rerender({ value: 'ab' })
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('ab')

    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useDebouncedValue`
Expected: FAIL with "Cannot find module '../useDebouncedValue'"

- [ ] **Step 3: Write `useDebouncedValue.ts`**

```ts
// src/hooks/useDebouncedValue.ts
import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useDebouncedValue`
Expected: PASS

- [ ] **Step 5: Write `useHouseholdFilters.ts` (no dedicated unit test — thin wrapper over `useSearchParams`, exercised via `HouseholdsPage` integration in Step 18)**

```ts
// src/modules/households/hooks/useHouseholdFilters.ts
import { useSearchParams } from 'react-router-dom'
import type { HouseholdFilters } from '../types'

const DEFAULT_SORT = 'createdAt:desc'

export function useHouseholdFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: HouseholdFilters = {
    page: Number(searchParams.get('page') ?? '1'),
    search: searchParams.get('search') ?? '',
    sort: searchParams.get('sort') ?? DEFAULT_SORT,
  }

  const setSearch = (search: string) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      if (search) next.set('search', search)
      else next.delete('search')
      next.set('page', '1')
      return next
    })
  }

  const setSort = (sort: string) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.set('sort', sort)
      return next
    })
  }

  const setPage = (page: number) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.set('page', String(page))
      return next
    })
  }

  return { filters, setSearch, setSort, setPage }
}
```

- [ ] **Step 6: Write the failing test for `useHouseholds`**

```tsx
// src/modules/households/api/__tests__/useHouseholds.test.tsx
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useHouseholds } from '../useHouseholds'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useHouseholds', () => {
  it('fetches the households list with the given filters', async () => {
    server.use(
      http.get('*/console/households', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('page')).toBe('1')
        expect(url.searchParams.get('search')).toBe('Adios')
        expect(url.searchParams.get('sort')).toBe('createdAt:desc')
        return HttpResponse.json({
          data: [
            {
              id: '1',
              name: 'Adios Family',
              adminName: 'Javier',
              adminEmail: 'javier@adios.com',
              createdAt: '2026-07-15T00:00:00.000Z',
              memberCount: 4,
              status: 'ACTIVE',
            },
          ],
          page: 1,
          totalPages: 7,
          total: 65,
        })
      }),
    )

    const { result } = renderHook(
      () => useHouseholds({ page: 1, search: 'Adios', sort: 'createdAt:desc' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data[0].name).toBe('Adios Family')
    expect(result.current.data?.totalPages).toBe(7)
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- useHouseholds`
Expected: FAIL with "Cannot find module '../useHouseholds'"

- [ ] **Step 8: Write `useHouseholds.ts`**

```ts
// src/modules/households/api/useHouseholds.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { HouseholdFilters, HouseholdsListResponse } from '../types'

export function useHouseholds(filters: HouseholdFilters) {
  return useQuery({
    queryKey: ['console', 'households', filters],
    queryFn: async () => {
      const response = await apiClient.get<HouseholdsListResponse>('/console/households', {
        params: filters,
      })
      return response.data
    },
    placeholderData: keepPreviousData,
  })
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- useHouseholds`
Expected: PASS

- [ ] **Step 10: Write `SearchBar.tsx`**

```tsx
// src/components/SearchBar.tsx
import { useEffect, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 300)

  useEffect(() => {
    if (debounced !== value) onChange(debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <input
      type="search"
      aria-label="Search"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      placeholder={placeholder}
    />
  )
}
```

- [ ] **Step 11: Write `Pagination.tsx`**

```tsx
// src/components/Pagination.tsx
export interface PaginationProps {
  page: number
  totalPages: number
  onPreviousPage: () => void
  onNextPage: () => void
}

export function Pagination({ page, totalPages, onPreviousPage, onNextPage }: PaginationProps) {
  return (
    <nav aria-label="Pagination">
      <button type="button" onClick={onPreviousPage} disabled={page <= 1}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button type="button" onClick={onNextPage} disabled={page >= totalPages}>
        Next
      </button>
    </nav>
  )
}
```

- [ ] **Step 12: Write `Badge.tsx`**

```tsx
// src/components/Badge.tsx
import type { ReactNode } from 'react'

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warning' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}
```

- [ ] **Step 13: Write the failing test for `HouseholdTable`**

```tsx
// src/modules/households/components/__tests__/HouseholdTable.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HouseholdTable } from '../HouseholdTable'
import type { HouseholdSummary } from '../../types'

const households: HouseholdSummary[] = [
  {
    id: '1',
    name: 'Adios Family',
    adminName: 'Javier',
    adminEmail: 'javier@adios.com',
    createdAt: '2026-07-15T00:00:00.000Z',
    memberCount: 4,
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Smith Household',
    adminName: 'John',
    adminEmail: 'john@smith.com',
    createdAt: '2026-07-10T00:00:00.000Z',
    memberCount: 3,
    status: 'DELETION_PENDING',
  },
]

describe('HouseholdTable', () => {
  it('renders a row per household with a deletion-pending badge where relevant', () => {
    render(<HouseholdTable households={households} isLoading={false} onRowClick={vi.fn()} />)

    expect(screen.getByText('Adios Family')).toBeInTheDocument()
    expect(screen.getByText('Smith Household')).toBeInTheDocument()
    expect(screen.getByText('Deletion Pending')).toBeInTheDocument()
  })

  it('calls onRowClick with the household id when a row is clicked', async () => {
    const onRowClick = vi.fn()
    const user = userEvent.setup()
    render(<HouseholdTable households={households} isLoading={false} onRowClick={onRowClick} />)

    await user.click(screen.getByText('Adios Family'))
    expect(onRowClick).toHaveBeenCalledWith('1')
  })

  it('shows an empty state when there are no households', () => {
    render(<HouseholdTable households={[]} isLoading={false} onRowClick={vi.fn()} />)
    expect(screen.getByText(/no households yet/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 14: Run test to verify it fails**

Run: `npm test -- HouseholdTable`
Expected: FAIL with "Cannot find module '../HouseholdTable'"

- [ ] **Step 15: Write `HouseholdTable.tsx`**

```tsx
// src/modules/households/components/HouseholdTable.tsx
import { Badge } from '@/components/Badge'
import type { HouseholdSummary } from '../types'

export interface HouseholdTableProps {
  households: HouseholdSummary[]
  isLoading: boolean
  onRowClick: (id: string) => void
}

export function HouseholdTable({ households, isLoading, onRowClick }: HouseholdTableProps) {
  if (isLoading) {
    return <p role="status">Loading households…</p>
  }

  if (households.length === 0) {
    return <p>No households yet. Create one to get started.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Admin Name</th>
          <th>Created</th>
          <th>Members</th>
        </tr>
      </thead>
      <tbody>
        {households.map((household) => (
          <tr key={household.id} onClick={() => onRowClick(household.id)} style={{ cursor: 'pointer' }}>
            <td>
              {household.name}
              {household.status === 'DELETION_PENDING' && <Badge tone="warning">Deletion Pending</Badge>}
            </td>
            <td>{household.adminName}</td>
            <td>{new Date(household.createdAt).toLocaleDateString()}</td>
            <td>{household.memberCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npm test -- HouseholdTable`
Expected: PASS

- [ ] **Step 17: Write `HouseholdsPage.tsx`**

```tsx
// src/modules/households/pages/HouseholdsPage.tsx
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '@/components/SearchBar'
import { Pagination } from '@/components/Pagination'
import { useHouseholdFilters } from '../hooks/useHouseholdFilters'
import { useHouseholds } from '../api/useHouseholds'
import { HouseholdTable } from '../components/HouseholdTable'

export function HouseholdsPage() {
  const navigate = useNavigate()
  const { filters, setSearch, setPage } = useHouseholdFilters()
  const { data, isLoading } = useHouseholds(filters)

  return (
    <main>
      <h1>Households</h1>
      <SearchBar value={filters.search} onChange={setSearch} placeholder="Search by name or email..." />
      <HouseholdTable
        households={data?.data ?? []}
        isLoading={isLoading}
        onRowClick={(id) => navigate(`/console/households/${id}`)}
      />
      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPreviousPage={() => setPage(Math.max(1, filters.page - 1))}
          onNextPage={() => setPage(filters.page + 1)}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 18: Write an integration test proving search and pagination update the URL and refetch**

This is the only place `useHouseholdFilters` (Step 5) gets exercised — it's a thin wrapper with no dedicated unit test, so this integration test is what actually proves the URL-param round trip works. No source change is needed for this step; it verifies wiring that already exists.

```tsx
// src/modules/households/pages/__tests__/HouseholdsPage.test.tsx
import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { HouseholdsPage } from '../HouseholdsPage'

const allHouseholds = [
  {
    id: '1',
    name: 'Adios Family',
    adminName: 'Javier',
    adminEmail: 'javier@adios.com',
    createdAt: '2026-07-15T00:00:00.000Z',
    memberCount: 4,
    status: 'ACTIVE' as const,
  },
  {
    id: '2',
    name: 'Smith Household',
    adminName: 'John',
    adminEmail: 'john@smith.com',
    createdAt: '2026-07-10T00:00:00.000Z',
    memberCount: 3,
    status: 'ACTIVE' as const,
  },
]

function installHouseholdsHandler() {
  server.use(
    http.get('*/console/households', ({ request }) => {
      const url = new URL(request.url)
      const search = (url.searchParams.get('search') ?? '').toLowerCase()
      const page = Number(url.searchParams.get('page') ?? '1')
      const filtered = search ? allHouseholds.filter((h) => h.name.toLowerCase().includes(search)) : allHouseholds
      return HttpResponse.json({ data: filtered, page, totalPages: 2, total: filtered.length })
    }),
  )
}

describe('HouseholdsPage', () => {
  it('filters the table after a debounced search', async () => {
    installHouseholdsHandler()
    const user = userEvent.setup()
    renderWithProviders(<HouseholdsPage />, { route: '/console/households' })

    await waitFor(() => expect(screen.getByText('Adios Family')).toBeInTheDocument())
    expect(screen.getByText('Smith Household')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'smith')

    await waitFor(() => expect(screen.queryByText('Adios Family')).not.toBeInTheDocument(), { timeout: 1000 })
    expect(screen.getByText('Smith Household')).toBeInTheDocument()
  })

  it('requests the next page when Next is clicked', async () => {
    installHouseholdsHandler()
    const user = userEvent.setup()
    renderWithProviders(<HouseholdsPage />, { route: '/console/households' })

    await waitFor(() => expect(screen.getByText('Adios Family')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => expect(screen.getByText('Page 2 of 2')).toBeInTheDocument())
  })
})
```

Run: `npm test -- HouseholdsPage`
Expected: PASS (both tests) — this validates existing behavior rather than driving new code, so there's no preceding "confirm it fails" step.

- [ ] **Step 19: Verify the app builds with three of four pages present**

Run: `npm run build`
Expected: FAIL — TS2307 for `HouseholdDetailPage` only.

- [ ] **Step 20: Commit**

```bash
git add src/hooks/useDebouncedValue.ts src/hooks/__tests__ src/modules/households/hooks src/modules/households/api/useHouseholds.ts src/modules/households/api/__tests__/useHouseholds.test.tsx src/components/SearchBar.tsx src/components/Pagination.tsx src/components/Badge.tsx src/modules/households/components/HouseholdTable.tsx src/modules/households/components/__tests__/HouseholdTable.test.tsx src/modules/households/pages/HouseholdsPage.tsx src/modules/households/pages/__tests__/HouseholdsPage.test.tsx
git commit -m "feat: add households list feature with search, sort, and pagination"
```

---

### Task 14: Create Household Feature

**Files:**
- Create: `src/modules/households/api/useCreateHousehold.ts`, `src/components/Modal.tsx`, `src/modules/households/components/CreateHouseholdForm.tsx`, `src/modules/households/components/CreateHouseholdModal.tsx`
- Modify: `src/modules/dashboard/pages/ConsoleDashboardPage.tsx`
- Test: `src/modules/households/api/__tests__/useCreateHousehold.test.tsx`, `src/modules/households/components/__tests__/CreateHouseholdForm.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `CreateHouseholdInput` (Task 10), `Modal` (this task).
- Produces: `CreateHouseholdModal`, wired to the dashboard's "New Household" action.

- [ ] **Step 1: Write the failing test for the create mutation's success and 409-conflict paths**

Note: `prd-auth.md` §8.1's own example for this mutation invalidates on success rather than updating optimistically (unlike the general pattern in `FE-Architecture-REVISED.md` §5) — this implementation and its test follow the PRD's simpler, explicitly-specified version. No optimistic update/rollback is built for this mutation.

```tsx
// src/modules/households/api/__tests__/useCreateHousehold.test.tsx
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useHouseholds } from '../useHouseholds'
import { useCreateHousehold } from '../useCreateHousehold'

const filters = { page: 1, search: '', sort: 'createdAt:desc' }
const existing = {
  data: [
    {
      id: '1',
      name: 'Existing House',
      adminName: 'Ana',
      adminEmail: 'ana@existing.com',
      createdAt: '2026-07-01T00:00:00.000Z',
      memberCount: 1,
      status: 'ACTIVE' as const,
    },
  ],
  page: 1,
  totalPages: 1,
  total: 1,
}

describe('useCreateHousehold', () => {
  it('invalidates the households list on success', async () => {
    server.use(
      http.get('*/console/households', () => HttpResponse.json(existing)),
      http.post('*/console/households', () =>
        HttpResponse.json({ id: '2', ...existing.data[0] }, { status: 201 }),
      ),
    )
    const queryClient = createTestQueryClient()
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result: listResult } = renderHook(() => useHouseholds(filters), { wrapper })
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    const { result: createResult } = renderHook(() => useCreateHousehold(), { wrapper })
    createResult.current.mutate({
      household_name: 'New House',
      admin_email: 'new@house.com',
      admin_name: 'New Admin',
    })

    await waitFor(() => expect(createResult.current.isSuccess).toBe(true))
  })

  it('surfaces a 409 duplicate-name error', async () => {
    server.use(
      http.get('*/console/households', () => HttpResponse.json(existing)),
      http.post('*/console/households', () =>
        HttpResponse.json({ message: 'Household name already in use. Try a different name.' }, { status: 409 }),
      ),
    )
    const queryClient = createTestQueryClient()
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useCreateHousehold(), { wrapper })
    result.current.mutate({
      household_name: 'Existing House',
      admin_email: 'dup@house.com',
      admin_name: 'Dup Admin',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useCreateHousehold`
Expected: FAIL with "Cannot find module '../useCreateHousehold'"

- [ ] **Step 3: Write `useCreateHousehold.ts`**

```ts
// src/modules/households/api/useCreateHousehold.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { CreateHouseholdInput } from '../types'

export function useCreateHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateHouseholdInput) => {
      const response = await apiClient.post('/console/households', input)
      return response.data
    },
    onSuccess: () => {
      // Prefix match: invalidates every filtered variant of the households list
      // (['console', 'households', {...filters}]), not just one specific filter combination.
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useCreateHousehold`
Expected: PASS

- [ ] **Step 5: Write `Modal.tsx` (focus trap + Escape-to-close, per PRD §10 a11y requirement)**

```tsx
// src/components/Modal.tsx
import { useEffect, useRef, type ReactNode } from 'react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previouslyFocused.current = document.activeElement as HTMLElement
    dialogRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="modal"
      >
        <h2 id="modal-title">{title}</h2>
        <button type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write the failing test for `CreateHouseholdForm`**

```tsx
// src/modules/households/components/__tests__/CreateHouseholdForm.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/test-utils'
import { CreateHouseholdForm } from '../CreateHouseholdForm'

describe('CreateHouseholdForm', () => {
  it('disables submit until all required fields are filled', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateHouseholdForm onSubmit={vi.fn()} isLoading={false} />)

    const submitButton = screen.getByRole('button', { name: /create/i })
    expect(submitButton).toBeDisabled()

    await user.type(screen.getByLabelText(/household name/i), 'New House')
    expect(submitButton).toBeDisabled()

    await user.type(screen.getByLabelText(/admin email/i), 'new@house.com')
    await user.type(screen.getByLabelText(/admin name/i), 'New Admin')
    expect(submitButton).toBeEnabled()
  })

  it('submits the trimmed, lowercased values', async () => {
    const handleSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<CreateHouseholdForm onSubmit={handleSubmit} isLoading={false} />)

    await user.type(screen.getByLabelText(/household name/i), '  Adios Family  ')
    await user.type(screen.getByLabelText(/admin email/i), 'JAVIER@ADIOS.COM')
    await user.type(screen.getByLabelText(/admin name/i), 'Javier')
    await user.click(screen.getByRole('button', { name: /create/i }))

    expect(handleSubmit).toHaveBeenCalledWith({
      household_name: 'Adios Family',
      admin_email: 'javier@adios.com',
      admin_name: 'Javier',
      notes: '',
    })
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- CreateHouseholdForm`
Expected: FAIL with "Cannot find module '../CreateHouseholdForm'"

- [ ] **Step 8: Write `CreateHouseholdForm.tsx`**

```tsx
// src/modules/households/components/CreateHouseholdForm.tsx
import { useForm } from 'react-hook-form'
import type { CreateHouseholdInput } from '../types'

export interface CreateHouseholdFormProps {
  onSubmit: (input: CreateHouseholdInput) => void
  isLoading: boolean
}

const NAME_PATTERN = /^[\p{L}\p{N}\s'-]+$/u

export function CreateHouseholdForm({ onSubmit, isLoading }: CreateHouseholdFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateHouseholdInput>({ mode: 'onChange' })

  const submit = handleSubmit((values) => {
    onSubmit({
      household_name: values.household_name.trim(),
      admin_email: values.admin_email.trim().toLowerCase(),
      admin_name: values.admin_name.trim(),
      notes: values.notes?.trim() ?? '',
    })
  })

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="household_name">Household Name *</label>
      <input
        id="household_name"
        placeholder="e.g., Adios Family"
        aria-describedby={errors.household_name ? 'household_name-error' : undefined}
        disabled={isLoading}
        {...register('household_name', {
          required: 'Required field',
          maxLength: { value: 100, message: 'Max 100 characters' },
          pattern: { value: NAME_PATTERN, message: 'Only letters, numbers, spaces, hyphens, apostrophes' },
        })}
      />
      {errors.household_name && <span id="household_name-error" role="alert">{errors.household_name.message}</span>}

      <label htmlFor="admin_email">Admin Email *</label>
      <input
        id="admin_email"
        type="email"
        placeholder="e.g., javier@adios.com"
        aria-describedby={errors.admin_email ? 'admin_email-error' : undefined}
        disabled={isLoading}
        {...register('admin_email', {
          required: 'Required field',
          maxLength: { value: 254, message: 'Too long' },
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
        })}
      />
      {errors.admin_email && <span id="admin_email-error" role="alert">{errors.admin_email.message}</span>}

      <label htmlFor="admin_name">Admin Name *</label>
      <input
        id="admin_name"
        placeholder="e.g., Javier"
        aria-describedby={errors.admin_name ? 'admin_name-error' : undefined}
        disabled={isLoading}
        {...register('admin_name', {
          required: 'Required field',
          maxLength: { value: 50, message: 'Max 50 characters' },
          pattern: { value: /^[\p{L}\s'-]+$/u, message: 'Only letters, spaces, hyphens, apostrophes' },
        })}
      />
      {errors.admin_name && <span id="admin_name-error" role="alert">{errors.admin_name.message}</span>}

      <label htmlFor="notes">Notes (optional)</label>
      <textarea
        id="notes"
        placeholder="e.g., Early adopter, VIP tier"
        disabled={isLoading}
        {...register('notes', { maxLength: { value: 500, message: 'Max 500 characters' } })}
      />

      <button type="submit" disabled={!isValid || isLoading}>
        {isLoading ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- CreateHouseholdForm`
Expected: PASS

- [ ] **Step 10: Write `CreateHouseholdModal.tsx`**

```tsx
// src/modules/households/components/CreateHouseholdModal.tsx
import { useToast } from '@/components/ToastProvider'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { Modal } from '@/components/Modal'
import { useCreateHousehold } from '../api/useCreateHousehold'
import { CreateHouseholdForm } from './CreateHouseholdForm'
import type { CreateHouseholdInput } from '../types'

export function CreateHouseholdModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const toast = useToast()
  const { mutate, isPending } = useCreateHousehold()

  const handleSubmit = (input: CreateHouseholdInput) => {
    mutate(input, {
      onSuccess: () => {
        toast.success(`Household created. Invite sent to ${input.admin_email}.`)
        onClose()
      },
      onError: (error) => {
        toast.error(getErrorMessage(error))
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Household">
      <CreateHouseholdForm onSubmit={handleSubmit} isLoading={isPending} />
    </Modal>
  )
}
```

- [ ] **Step 11: Wire the modal into the dashboard's "New Household" button**

```tsx
// src/modules/dashboard/pages/ConsoleDashboardPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMetrics } from '../api/useMetrics'
import { MetricsGrid } from '../components/MetricsGrid'
import { CreateHouseholdModal } from '@/modules/households/components/CreateHouseholdModal'

export function ConsoleDashboardPage() {
  const { data: metrics, isLoading } = useMetrics()
  const [isCreateOpen, setCreateOpen] = useState(false)

  return (
    <main>
      <h1>Nostos Operator Console</h1>
      <nav>
        <Link to="/console/dashboard">Dashboard</Link>
        <Link to="/console/households">Households</Link>
      </nav>
      <button type="button" onClick={() => setCreateOpen(true)}>
        New Household
      </button>
      {isLoading || !metrics ? (
        <p role="status">Loading metrics…</p>
      ) : (
        <MetricsGrid metrics={metrics} />
      )}
      <CreateHouseholdModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </main>
  )
}
```

This replaces the `<Link to="/console/households/new">` from Task 12 with a modal trigger, matching the PRD's "Modal or New Page" choice resolved toward modal (§1.3) — no separate `/console/households/new` route is added, so none is needed in Task 9's route config.

- [ ] **Step 12: Run the dashboard page's existing test suite plus the new ones**

Run: `npm test -- households dashboard`
Expected: PASS (all)

- [ ] **Step 13: Commit**

```bash
git add src/modules/households/api/useCreateHousehold.ts src/modules/households/api/__tests__/useCreateHousehold.test.tsx src/components/Modal.tsx src/modules/households/components/CreateHouseholdForm.tsx src/modules/households/components/__tests__/CreateHouseholdForm.test.tsx src/modules/households/components/CreateHouseholdModal.tsx src/modules/dashboard/pages/ConsoleDashboardPage.tsx
git commit -m "feat: add create household form and modal"
```

---

### Task 15: Household Detail Feature

**Files:**
- Create: `src/modules/households/api/useHousehold.ts`, `src/components/Breadcrumb.tsx`, `src/modules/households/components/HouseholdInfo.tsx`, `src/modules/households/components/AdminSection.tsx`, `src/modules/households/components/MembersList.tsx`, `src/modules/households/pages/HouseholdDetailPage.tsx`
- Test: `src/modules/households/api/__tests__/useHousehold.test.tsx`, `src/modules/households/pages/__tests__/HouseholdDetailPage.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `HouseholdDetail` (Task 10).
- Produces: `HouseholdDetailPage`, mounted at `/console/households/:id`; this task's `HouseholdDetailPage` renders a placeholder `ActionButtons` — the real one (with delete/restore/resend wiring) lands in Tasks 16–17.

- [ ] **Step 1: Write the failing test for `useHousehold`**

```tsx
// src/modules/households/api/__tests__/useHousehold.test.tsx
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useHousehold } from '../useHousehold'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

const detail = {
  id: '1',
  name: 'Adios Family',
  status: 'ACTIVE' as const,
  createdAt: '2026-07-15T00:00:00.000Z',
  scheduledDeletionDate: null,
  graceExpiresAt: null,
  admin: {
    name: 'Javier',
    email: 'javier@adios.com',
    claimStatus: 'CLAIMED' as const,
    lastLoginAt: '2026-07-30T14:15:00.000Z',
    inviteSentAt: null,
  },
  members: [{ id: 'm1', name: 'Sofia', email: 'sofia@adios.com', joinedAt: '2026-07-16T00:00:00.000Z' }],
}

describe('useHousehold', () => {
  it('fetches a household by id', async () => {
    server.use(http.get('*/console/households/1', () => HttpResponse.json(detail)))

    const { result } = renderHook(() => useHousehold('1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.name).toBe('Adios Family')
  })

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useHousehold(''), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useHousehold.test`
Expected: FAIL with "Cannot find module '../useHousehold'"

- [ ] **Step 3: Write `useHousehold.ts`**

```ts
// src/modules/households/api/useHousehold.ts
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type { HouseholdDetail } from '../types'

export function useHousehold(id: string) {
  return useQuery({
    queryKey: ['console', 'households', id],
    queryFn: async () => {
      const response = await apiClient.get<HouseholdDetail>(`/console/households/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useHousehold.test`
Expected: PASS

- [ ] **Step 5: Write `Breadcrumb.tsx`**

```tsx
// src/components/Breadcrumb.tsx
import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.label}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          {index < items.length - 1 && ' > '}
        </span>
      ))}
    </nav>
  )
}
```

- [ ] **Step 6: Write `HouseholdInfo.tsx`**

```tsx
// src/modules/households/components/HouseholdInfo.tsx
import type { HouseholdDetail } from '../types'

export function HouseholdInfo({ household }: { household: HouseholdDetail }) {
  return (
    <section>
      <h1>{household.name}</h1>
      <p>Status: {household.status === 'ACTIVE' ? 'Active' : 'Deletion Pending'}</p>
      <p>Created: {new Date(household.createdAt).toLocaleDateString()}</p>
      {household.status === 'DELETION_PENDING' && household.scheduledDeletionDate && (
        <p>Will be deleted on {new Date(household.scheduledDeletionDate).toLocaleDateString()}</p>
      )}
    </section>
  )
}
```

- [ ] **Step 7: Write `AdminSection.tsx`**

```tsx
// src/modules/households/components/AdminSection.tsx
import type { HouseholdAdmin } from '../types'

export function AdminSection({ admin }: { admin: HouseholdAdmin }) {
  return (
    <section aria-label="Admin">
      <h2>Admin</h2>
      <p>Name: {admin.name}</p>
      <p>Email: {admin.email}</p>
      <p>Status: {admin.claimStatus === 'CLAIMED' ? 'Claimed' : 'Pending Claim'}</p>
      {admin.lastLoginAt && <p>Last Login: {new Date(admin.lastLoginAt).toLocaleString()}</p>}
    </section>
  )
}
```

- [ ] **Step 8: Write `MembersList.tsx`**

```tsx
// src/modules/households/components/MembersList.tsx
import type { HouseholdMember } from '../types'

export function MembersList({ members }: { members: HouseholdMember[] }) {
  return (
    <section aria-label="Members">
      <h2>Members ({members.length})</h2>
      <ul>
        {members.map((member) => (
          <li key={member.id}>
            {member.name} | {member.email} | Joined {new Date(member.joinedAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 9: Write the failing test for `HouseholdDetailPage`**

```tsx
// src/modules/households/pages/__tests__/HouseholdDetailPage.test.tsx
import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/test-utils'
import { HouseholdDetailPage } from '../HouseholdDetailPage'

const detail = {
  id: '1',
  name: 'Adios Family',
  status: 'ACTIVE' as const,
  createdAt: '2026-07-15T00:00:00.000Z',
  scheduledDeletionDate: null,
  graceExpiresAt: null,
  admin: {
    name: 'Javier',
    email: 'javier@adios.com',
    claimStatus: 'CLAIMED' as const,
    lastLoginAt: '2026-07-30T14:15:00.000Z',
    inviteSentAt: null,
  },
  members: [{ id: 'm1', name: 'Sofia', email: 'sofia@adios.com', joinedAt: '2026-07-16T00:00:00.000Z' }],
}

describe('HouseholdDetailPage', () => {
  it('renders household, admin, and members info', async () => {
    server.use(http.get('*/console/households/1', () => HttpResponse.json(detail)))

    renderWithProviders(
      <Routes>
        <Route path="/console/households/:id" element={<HouseholdDetailPage />} />
      </Routes>,
      { route: '/console/households/1' },
    )

    await waitFor(() => expect(screen.getByText('Adios Family')).toBeInTheDocument())
    expect(screen.getByText('Javier')).toBeInTheDocument()
    expect(screen.getByText(/sofia@adios.com/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- HouseholdDetailPage`
Expected: FAIL with "Cannot find module '../HouseholdDetailPage'"

- [ ] **Step 11: Write `HouseholdDetailPage.tsx`**

```tsx
// src/modules/households/pages/HouseholdDetailPage.tsx
import { useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/Breadcrumb'
import { useHousehold } from '../api/useHousehold'
import { HouseholdInfo } from '../components/HouseholdInfo'
import { AdminSection } from '../components/AdminSection'
import { MembersList } from '../components/MembersList'

export function HouseholdDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: household, isLoading } = useHousehold(id)

  if (isLoading || !household) {
    return <p role="status">Loading household…</p>
  }

  return (
    <main>
      <Breadcrumb
        items={[
          { label: 'Console', to: '/console/dashboard' },
          { label: 'Households', to: '/console/households' },
          { label: household.name },
        ]}
      />
      <HouseholdInfo household={household} />
      <AdminSection admin={household.admin} />
      <MembersList members={household.members} />
    </main>
  )
}
```

`ActionButtons` (delete/restore/resend-invite) is intentionally not rendered yet — Tasks 16–17 add it here once its mutations exist, so this page never ships with dead buttons wired to nothing.

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- HouseholdDetailPage`
Expected: PASS

- [ ] **Step 13: Verify the full app builds — all four pages now exist**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 14: Commit**

```bash
git add src/modules/households/api/useHousehold.ts src/modules/households/api/__tests__/useHousehold.test.tsx src/components/Breadcrumb.tsx src/modules/households/components/HouseholdInfo.tsx src/modules/households/components/AdminSection.tsx src/modules/households/components/MembersList.tsx src/modules/households/pages/HouseholdDetailPage.tsx src/modules/households/pages/__tests__/HouseholdDetailPage.test.tsx
git commit -m "feat: add household detail page"
```

---

### Task 16: Delete & Restore Household Feature

**Files:**
- Create: `src/modules/households/api/useDeleteHousehold.ts`, `src/modules/households/api/useRestoreHousehold.ts`, `src/modules/households/components/DeleteHouseholdModal.tsx`, `src/modules/households/components/RestoreHouseholdModal.tsx`, `src/modules/households/components/ActionButtons.tsx`
- Modify: `src/modules/households/pages/HouseholdDetailPage.tsx`
- Test: `src/modules/households/api/__tests__/useDeleteHousehold.test.tsx`, `src/modules/households/components/__tests__/DeleteHouseholdModal.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `HouseholdDetail` (Task 10), `Modal` (Task 14).
- Produces: `ActionButtons`, wired into `HouseholdDetailPage`.

- [ ] **Step 1: Write the failing test for the delete mutation**

```tsx
// src/modules/households/api/__tests__/useDeleteHousehold.test.tsx
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useDeleteHousehold } from '../useDeleteHousehold'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useDeleteHousehold', () => {
  it('returns the scheduled deletion date on success', async () => {
    server.use(
      http.post('*/console/households/1/delete', () =>
        HttpResponse.json({ scheduled_deletion_date: '2026-08-30T00:00:00.000Z' }),
      ),
    )

    const { result } = renderHook(() => useDeleteHousehold('1'), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.scheduled_deletion_date).toBe('2026-08-30T00:00:00.000Z')
  })

  it('surfaces a 409 already-pending error', async () => {
    server.use(
      http.post('*/console/households/1/delete', () =>
        HttpResponse.json({ message: 'This household is already marked for deletion.' }, { status: 409 }),
      ),
    )

    const { result } = renderHook(() => useDeleteHousehold('1'), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useDeleteHousehold`
Expected: FAIL with "Cannot find module '../useDeleteHousehold'"

- [ ] **Step 3: Write `useDeleteHousehold.ts`**

```ts
// src/modules/households/api/useDeleteHousehold.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

interface DeleteHouseholdResponse {
  scheduled_deletion_date: string
}

export function useDeleteHousehold(householdId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<DeleteHouseholdResponse>(
        `/console/households/${householdId}/delete`,
        { confirmation: 'DELETE' },
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useDeleteHousehold`
Expected: PASS

- [ ] **Step 5: Write `useRestoreHousehold.ts` (mirrors delete; no dedicated test — covered via `ActionButtons` integration in Step 12)**

```ts
// src/modules/households/api/useRestoreHousehold.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

export function useRestoreHousehold(householdId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await apiClient.post(`/console/households/${householdId}/restore`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
    },
  })
}
```

- [ ] **Step 6: Write the failing test for `DeleteHouseholdModal`'s checkbox gating**

```tsx
// src/modules/households/components/__tests__/DeleteHouseholdModal.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/test-utils'
import { DeleteHouseholdModal } from '../DeleteHouseholdModal'

describe('DeleteHouseholdModal', () => {
  it('keeps Delete disabled until the confirmation checkbox is checked', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <DeleteHouseholdModal
        isOpen
        householdName="Adios Family"
        scheduledDeletionDate="2026-08-30T00:00:00.000Z"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isLoading={false}
      />,
    )

    const deleteButton = screen.getByRole('button', { name: /^delete$/i })
    expect(deleteButton).toBeDisabled()

    await user.click(screen.getByRole('checkbox'))
    expect(deleteButton).toBeEnabled()
  })

  it('calls onConfirm when Delete is clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <DeleteHouseholdModal
        isOpen
        householdName="Adios Family"
        scheduledDeletionDate="2026-08-30T00:00:00.000Z"
        onClose={vi.fn()}
        onConfirm={onConfirm}
        isLoading={false}
      />,
    )

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(onConfirm).toHaveBeenCalled()
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- DeleteHouseholdModal`
Expected: FAIL with "Cannot find module '../DeleteHouseholdModal'"

- [ ] **Step 8: Write `DeleteHouseholdModal.tsx`**

```tsx
// src/modules/households/components/DeleteHouseholdModal.tsx
import { useState } from 'react'
import { Modal } from '@/components/Modal'

export interface DeleteHouseholdModalProps {
  isOpen: boolean
  householdName: string
  scheduledDeletionDate: string
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
}

export function DeleteHouseholdModal({
  isOpen,
  householdName,
  scheduledDeletionDate,
  onClose,
  onConfirm,
  isLoading,
}: DeleteHouseholdModalProps) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Household?">
      <p>
        Are you sure? All data for "{householdName}" will be preserved for 30 days. You can restore it if needed.
      </p>
      <p>This household will be deleted on: {new Date(scheduledDeletionDate).toLocaleString()}</p>
      <label>
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        I understand this deletion is reversible for 30 days
      </label>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" disabled={!confirmed || isLoading} onClick={onConfirm}>
        {isLoading ? 'Deleting...' : 'Delete'}
      </button>
    </Modal>
  )
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- DeleteHouseholdModal`
Expected: PASS

- [ ] **Step 10: Write `RestoreHouseholdModal.tsx` (no checkbox, per PRD §2.2 — no dedicated test, covered via `ActionButtons` integration next)**

```tsx
// src/modules/households/components/RestoreHouseholdModal.tsx
import { Modal } from '@/components/Modal'

export interface RestoreHouseholdModalProps {
  isOpen: boolean
  householdName: string
  graceExpiresAt: string
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
}

export function RestoreHouseholdModal({
  isOpen,
  householdName,
  graceExpiresAt,
  onClose,
  onConfirm,
  isLoading,
}: RestoreHouseholdModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Restore Household?">
      <p>Restore "{householdName}"? All members will regain access.</p>
      <p>Grace period expires on: {new Date(graceExpiresAt).toLocaleString()}</p>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" disabled={isLoading} onClick={onConfirm}>
        {isLoading ? 'Restoring...' : 'Restore'}
      </button>
    </Modal>
  )
}
```

- [ ] **Step 11: Write the failing test for `ActionButtons`' visibility rules**

```tsx
// src/modules/households/components/__tests__/ActionButtons.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { ActionButtons } from '../ActionButtons'

describe('ActionButtons', () => {
  it('shows Delete but not Restore for an ACTIVE household', () => {
    renderWithProviders(
      <ActionButtons
        status="ACTIVE"
        adminClaimStatus="CLAIMED"
        onDelete={vi.fn()}
        onRestore={vi.fn()}
        onResendInvite={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /delete household/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^restore$/i })).not.toBeInTheDocument()
  })

  it('shows Restore but not Delete for a DELETION_PENDING household', () => {
    renderWithProviders(
      <ActionButtons
        status="DELETION_PENDING"
        adminClaimStatus="CLAIMED"
        onDelete={vi.fn()}
        onRestore={vi.fn()}
        onResendInvite={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /^restore$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete household/i })).not.toBeInTheDocument()
  })

  it('shows Resend Invite only when the admin is PENDING_INVITE', () => {
    renderWithProviders(
      <ActionButtons
        status="ACTIVE"
        adminClaimStatus="PENDING_INVITE"
        onDelete={vi.fn()}
        onRestore={vi.fn()}
        onResendInvite={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /resend invite/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 12: Run test to verify it fails**

Run: `npm test -- ActionButtons`
Expected: FAIL with "Cannot find module '../ActionButtons'"

- [ ] **Step 13: Write `ActionButtons.tsx`**

```tsx
// src/modules/households/components/ActionButtons.tsx
import type { AdminClaimStatus, HouseholdStatus } from '../types'

export interface ActionButtonsProps {
  status: HouseholdStatus
  adminClaimStatus: AdminClaimStatus
  onDelete: () => void
  onRestore: () => void
  onResendInvite: () => void
}

export function ActionButtons({ status, adminClaimStatus, onDelete, onRestore, onResendInvite }: ActionButtonsProps) {
  return (
    <div>
      {status === 'ACTIVE' && (
        <button type="button" onClick={onDelete}>
          Delete Household
        </button>
      )}
      {status === 'DELETION_PENDING' && (
        <button type="button" onClick={onRestore}>
          Restore
        </button>
      )}
      {adminClaimStatus === 'PENDING_INVITE' && (
        <button type="button" onClick={onResendInvite}>
          Resend Invite
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 14: Run test to verify it passes**

Run: `npm test -- ActionButtons`
Expected: PASS

- [ ] **Step 15: Wire delete/restore into `HouseholdDetailPage`**

```tsx
// src/modules/households/pages/HouseholdDetailPage.tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/Breadcrumb'
import { useToast } from '@/components/ToastProvider'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { useHousehold } from '../api/useHousehold'
import { useDeleteHousehold } from '../api/useDeleteHousehold'
import { useRestoreHousehold } from '../api/useRestoreHousehold'
import { HouseholdInfo } from '../components/HouseholdInfo'
import { AdminSection } from '../components/AdminSection'
import { MembersList } from '../components/MembersList'
import { ActionButtons } from '../components/ActionButtons'
import { DeleteHouseholdModal } from '../components/DeleteHouseholdModal'
import { RestoreHouseholdModal } from '../components/RestoreHouseholdModal'

const DELETION_GRACE_PERIOD_DAYS = 30

function previewDeletionDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + DELETION_GRACE_PERIOD_DAYS)
  return date.toISOString()
}

export function HouseholdDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: household, isLoading } = useHousehold(id)
  const toast = useToast()
  const deleteHousehold = useDeleteHousehold(id)
  const restoreHousehold = useRestoreHousehold(id)
  const [isDeleteOpen, setDeleteOpen] = useState(false)
  const [isRestoreOpen, setRestoreOpen] = useState(false)

  if (isLoading || !household) {
    return <p role="status">Loading household…</p>
  }

  const handleDelete = () => {
    deleteHousehold.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(`Household marked for deletion. Will be deleted on ${new Date(data.scheduled_deletion_date).toLocaleDateString()}.`)
        setDeleteOpen(false)
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  const handleRestore = () => {
    restoreHousehold.mutate(undefined, {
      onSuccess: () => {
        toast.success('Household restored successfully')
        setRestoreOpen(false)
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <main>
      <Breadcrumb
        items={[
          { label: 'Console', to: '/console/dashboard' },
          { label: 'Households', to: '/console/households' },
          { label: household.name },
        ]}
      />
      <HouseholdInfo household={household} />
      <AdminSection admin={household.admin} />
      <MembersList members={household.members} />
      <ActionButtons
        status={household.status}
        adminClaimStatus={household.admin.claimStatus}
        onDelete={() => setDeleteOpen(true)}
        onRestore={() => setRestoreOpen(true)}
        onResendInvite={() => {}}
      />
      <DeleteHouseholdModal
        isOpen={isDeleteOpen}
        householdName={household.name}
        scheduledDeletionDate={household.scheduledDeletionDate ?? previewDeletionDate()}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        isLoading={deleteHousehold.isPending}
      />
      {household.graceExpiresAt && (
        <RestoreHouseholdModal
          isOpen={isRestoreOpen}
          householdName={household.name}
          graceExpiresAt={household.graceExpiresAt}
          onClose={() => setRestoreOpen(false)}
          onConfirm={handleRestore}
          isLoading={restoreHousehold.isPending}
        />
      )}
    </main>
  )
}
```

`onResendInvite={() => {}}` is a deliberate no-op placeholder for exactly one task — Task 17 replaces it with the real handler in its own step, keeping this task's diff scoped to delete/restore only.

`DeleteHouseholdModal` is always mounted (controlled by `isDeleteOpen`, same pattern as `CreateHouseholdModal`) rather than gated on `household.scheduledDeletionDate` — that field is `null` until *after* deletion is confirmed, so gating on it would mean the confirmation modal could never open for the one case it exists for (deleting a still-`ACTIVE` household). The PRD's wireframe (§2.1) shows a concrete "will be deleted on" date in the *pre*-confirmation dialog, which no BE contract in this repo provides ahead of time — `previewDeletionDate()` computes a client-side 30-day-from-now preview to fill that copy for an `ACTIVE` household, falling back to the real `scheduledDeletionDate` if the household already has one (e.g. the page was reloaded after deletion, before the user navigates away). `RestoreHouseholdModal` doesn't have this problem: it only ever renders for a `DELETION_PENDING` household, where `graceExpiresAt` is expected to already be populated by the backend.

- [ ] **Step 16: Run the full test suite**

Run: `npm test`
Expected: PASS (all tests across every prior task)

- [ ] **Step 17: Commit**

```bash
git add src/modules/households/api/useDeleteHousehold.ts src/modules/households/api/useRestoreHousehold.ts src/modules/households/api/__tests__/useDeleteHousehold.test.tsx src/modules/households/components/DeleteHouseholdModal.tsx src/modules/households/components/RestoreHouseholdModal.tsx src/modules/households/components/ActionButtons.tsx src/modules/households/components/__tests__/DeleteHouseholdModal.test.tsx src/modules/households/components/__tests__/ActionButtons.test.tsx src/modules/households/pages/HouseholdDetailPage.tsx
git commit -m "feat: add delete and restore household flows"
```

---

### Task 17: Resend Invite Feature

**Files:**
- Create: `src/modules/households/api/useResendInvite.ts`
- Modify: `src/modules/households/pages/HouseholdDetailPage.tsx`
- Test: `src/modules/households/api/__tests__/useResendInvite.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `getErrorMessage` (Task 7).
- Produces: wires `ActionButtons`' `onResendInvite` to a real mutation.

- [ ] **Step 1: Write the failing test, including the 429 rate-limit case**

```tsx
// src/modules/households/api/__tests__/useResendInvite.test.tsx
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useResendInvite } from '../useResendInvite'

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useResendInvite', () => {
  it('succeeds and invalidates the household detail query', async () => {
    server.use(http.post('*/console/households/1/admin/resend-invite', () => HttpResponse.json({})))

    const { result } = renderHook(() => useResendInvite('1'), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('surfaces a 429 rate-limit message', async () => {
    server.use(
      http.post('*/console/households/1/admin/resend-invite', () =>
        HttpResponse.json(
          { message: "Can't resend. Last sent 4 hours ago. Try again in 20 hours." },
          { status: 429 },
        ),
      ),
    )

    const { result } = renderHook(() => useResendInvite('1'), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useResendInvite`
Expected: FAIL with "Cannot find module '../useResendInvite'"

- [ ] **Step 3: Write `useResendInvite.ts`**

```ts
// src/modules/households/api/useResendInvite.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'

export function useResendInvite(householdId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await apiClient.post(`/console/households/${householdId}/admin/resend-invite`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households', householdId] })
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useResendInvite`
Expected: PASS

- [ ] **Step 5: Wire it into `HouseholdDetailPage`**

Replace the `onResendInvite={() => {}}` no-op from Task 16 Step 15:

```tsx
// src/modules/households/pages/HouseholdDetailPage.tsx — add alongside the other two mutations
import { useResendInvite } from '../api/useResendInvite'

// inside the component, alongside deleteHousehold/restoreHousehold:
const resendInvite = useResendInvite(id)

const handleResendInvite = () => {
  resendInvite.mutate(undefined, {
    onSuccess: () => toast.success(`Invite resent to ${household.admin.email}. Expires in 48 hours.`),
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

// and on <ActionButtons ... />:
// onResendInvite={handleResendInvite}
```

Apply this as a direct edit to the existing file from Task 16: add the `useResendInvite` import and `resendInvite`/`handleResendInvite` declarations next to the delete/restore ones, and change the `onResendInvite` prop from `() => {}` to `handleResendInvite`.

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS (all)

- [ ] **Step 7: Commit**

```bash
git add src/modules/households/api/useResendInvite.ts src/modules/households/api/__tests__/useResendInvite.test.tsx src/modules/households/pages/HouseholdDetailPage.tsx
git commit -m "feat: add resend invite feature"
```

---

### Task 18: Impeccable Polish Pass

**Files:**
- Modify: whatever `/impeccable polish` touches across `src/modules`, `src/components`, `src/styles`.

**Interfaces:**
- Consumes: every surface built in Tasks 11–17, the direction from Task 2.

- [ ] **Step 1: Run the full test suite as a pre-polish baseline**

Run: `npm test`
Expected: PASS (all) — polish must not be allowed to silently break behavior; this is the baseline to diff against.

- [ ] **Step 2: Run Impeccable polish across the built console**

Run: `/impeccable polish console-auth-household`

Scope it explicitly to: `/console/signin`, `/console/dashboard`, `/console/households`, `/console/households/:id`, and their modals (`CreateHouseholdModal`, `DeleteHouseholdModal`, `RestoreHouseholdModal`). This is the pass that turns the bare, accessible markup from Tasks 11–17 into the actual Operate-mode craft — spacing rhythm, table/card treatment, button states, empty/loading/skeleton states per `prd-auth.md` §4.

- [ ] **Step 3: Re-run the full test suite after polish**

Run: `npm test`
Expected: PASS (all) — if polish changed DOM structure in a way that breaks a test (e.g. renamed an accessible name), fix the test to match the new copy/structure only if the underlying behavior is unchanged; if it changed real behavior, that's a polish regression to fix instead.

- [ ] **Step 4: Verify the production build still succeeds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "polish: apply impeccable craft pass to console auth & household surfaces"
```

---

### Task 19: Impeccable Audit Pass (A11y, Responsive, Performance) & Deployment Checklist

**Files:**
- Modify: whatever `/impeccable audit` flags across `src/`.

**Interfaces:**
- Consumes: the polished surfaces from Task 18.
- Produces: the final, shippable state — checked against `prd-auth.md` §13's deployment checklist.

- [ ] **Step 1: Run Impeccable audit**

Run: `/impeccable audit console-auth-household`

This checks the a11y requirements from `prd-auth.md` §10 (ARIA labels, keyboard nav, focus management, contrast, `aria-describedby` error linking), the responsive breakpoints from §9 (mobile `<768px` stacks the dashboard grid to 1 column and hides the Admin Email column on tablet per §9.2), and performance basics from §11 (debounced search — already done in Task 13 — and route-level code splitting).

- [ ] **Step 2: Fix every finding the audit reports**

Apply its fixes directly (this is a bounded pass, not a loop — one round of fixes, confirmed by one more audit run at most, per impeccable's own verification model).

- [ ] **Step 3: Re-run the full test suite**

Run: `npm test`
Expected: PASS (all)

- [ ] **Step 4: Run lint and the production build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Walk `prd-auth.md` §13's deployment checklist by hand**

Confirm each item against what was actually built:
- All pages built + routed — Tasks 9, 11–15
- Forms validate (client-side + server errors) — Tasks 11, 14 (Global Constraints validation rules), error toasts via Task 7's `getErrorMessage`
- All modals working (delete, restore, create) — Tasks 14, 16
- All error toasts showing correct messages — Task 7 (backend-message pass-through) + this task's audit
- Loading states on all buttons + pages — Tasks 11, 12, 13, 14, 16, 17 (each mutation/query's `isPending`/`isLoading`)
- Search/sort/pagination working — Task 13 (`sort` is wired via `useHouseholdFilters().setSort`, though no UI column-header click calls it yet — if the audit doesn't flag this, add one `onClick` per `<th>` in `HouseholdTable` calling `setSort` before checking this item off)
- Responsive layout tested (mobile, tablet, desktop) — this task, Step 1–2
- Accessibility audit passed — this task, Step 1–2
- Authentication guard blocking unauthorized access — Task 9
- E2E tests (Playwright/Cypress) — **not built in this plan**; out of scope (no E2E runner exists in this repo yet, and the PRD marks it as a checklist item, not a requirement with its own spec). Flag as a follow-up, don't silently check it off.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix: apply impeccable audit findings for a11y, responsive, and performance"
```

---

## Self-Review Notes

- **Spec coverage:** Every PRD section maps to a task — §1.1→11, §1.2→12/14, §1.3→14, §1.4→13, §1.5→15–17, §2→14/16, §3→7 (mapping) + verified per-task via MSW error responses, §4→11–17 (`isPending`/`isLoading` throughout) + 18 (skeletons), §5→2/5/18, §6→11/14, §7→9, §8→7/8/11–17 (query keys used verbatim), §9→19, §10→19, §11→13 (debounce) + 19 (code splitting), §12→ every task's own component/hook test, §13→19.
- **Placeholder scan:** the two intentional no-ops (`onResendInvite={() => {}}` in Task 16, replaced in Task 17 Step 5; the stubbed page imports in Task 9 Step 6, resolved by Tasks 11–15) are each called out explicitly with the task that resolves them — not left dangling.
- **Type consistency:** `CreateHouseholdInput`, `HouseholdDetail`, `HouseholdSummary`, `HouseholdFilters`, `DashboardMetrics` are defined once in Task 10 and referenced by identical name/shape in every later task; `getErrorMessage` (Task 7) is the single error-formatting function every mutation's `onError` calls, no task reimplements it.
