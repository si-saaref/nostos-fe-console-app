# Console Households — Shipped Contract Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Supersedes the 2026-08-21 draft of this plan, which was written against a camelCase API.**
> The API changed twice after that draft: casing flipped to **snake_case**, the list response
> moved its counts into **`meta.pagination`** with `data` becoming a bare array, and
> **resend-invite shipped**. Every fixture below was re-read from the live `/docs-json` and from
> `notes/Postman/nostos-api.postman_collection.json` after those changes, and the two agree.

**Goal:** Make every `/api/v1/console/households` call match the contract the backend actually serves — snake_case payloads, `{ success, data }` envelopes with `meta.pagination` on the list, a nullable admin, five claim statuses, and a working resend-invite.

**Architecture:** One boundary, one direction. A new `src/modules/households/api/wire.ts` holds the snake_case wire types and the pure functions that map them to the camelCase domain types components already consume. Hooks become thin: unwrap the envelope, call a mapper, return. Components keep their shape. When the backend flips casing a third time, `wire.ts` is the only file that moves.

**Tech Stack:** React 19, TypeScript strict, TanStack Query 5, Axios, React Hook Form, Vitest + MSW + Testing Library.

## Ground truth

```bash
curl -s http://localhost:3073/docs-json | python3 -m json.tool | less
```

Verified against `notes/Postman/nostos-api.postman_collection.json` (regenerated 2026-08-22 14:50
from the app's own OpenAPI document). The two agree exactly. `notes/BE/prd-console-be.md` predates
the build and is wrong about the envelope; the live document wins.

## Global Constraints

- Every path carries the `/api/v1` prefix. Never a bare `/console/…`.
- **The wire is snake_case.** Bodies, query params, response payloads: `household_name`,
  `sort_by`, `member_count`, `claim_status`, `total_pages`, `status_code`. The envelope keys are
  not: `success`, `data`, `meta`, `message`, `error`.
- **Components never see snake_case.** Domain types are camelCase; `api/wire.ts` is the only file
  in the module allowed to name a snake_case field. Task 10 enforces this with a grep.
- Success envelope: `{ success: true, data: <T>, message?: string }`. **The list additionally
  carries `meta.pagination`, and its `data` is a bare array**, not an object.
- Error envelope: `{ success: false, error: { code, message, status_code, timestamp, path,
  details? } }`. `details` is an **array** of `{ field, code, message }` on a 400 from the
  validation pipe, where `code` is the class-validator constraint (`IS_EMAIL`, `MAX_LENGTH`, …).
- **Branch on `error.code`, never on `status_code`** — several codes share one HTTP status.
- Query keys are `['console', 'households', …]` — **plural, always.** The singular
  `['console', 'household', id]` used today by `useDeleteHousehold`, `useRestoreHousehold`,
  `useResendInvite`, and `HouseholdDetailPage` matches nothing.
- Auth is the session cookie `household.sid` with `withCredentials: true`. No token, and no
  `x-household-id` header — an early Swagger build declared one and it is gone.
- TypeScript strict. `npm run build` must be clean at the end of Task 9.
- `npm run lint` starts at **5 errors** (`docs/FRONTEND.md` §11.4). Two live in files this plan
  rewrites and get fixed on the way through. Do not add new ones. Ending state: 3.
- Tests live in `__tests__/` beside the code, using `renderWithProviders` /
  `createQueryClientWrapper` from `src/test/test-utils.tsx`.
- Baseline before Task 1: **26 test files, 85 tests, all passing.**
- Commit at the end of every task, Conventional Commits.

## The shipped contract, in full

**`POST /households`** → `201`
Body: `household_name` (1–100, required), `admin_email` (≤254, required), `admin_name` (1–50, required), `notes` (≤1000, optional).
`data`: `{ household_id, admin_id, admin_email, invite_sent_at: string | null }`
`invite_sent_at` is null when the claim email failed to send — **the household still exists.**
Errors: `400 VALIDATION_ERROR` (per-field `error.details`), `401`, `409 CONFLICT` (name in use, case-insensitive), `429`.

**`GET /households`** → `200`
Query: `page` (≥1, default 1), `limit` (1–100, default 50), `search`, `sort_by` (`created_at` | `name` | `admin_name` | `admin_email` | `member_count`, default `created_at`), `sort_order` (`ASC` | `DESC`, default `DESC`), `status` (`ACTIVE` | `DELETION_PENDING`).
```json
{
  "success": true,
  "data": [ { "id": "…", "name": "Adios Family", "status": "ACTIVE",
              "created_at": "…", "deletion_scheduled_for": null,
              "admin_name": "Javier", "admin_email": "javier@adios.com",
              "member_count": 4 } ],
  "meta": { "pagination": { "page": 1, "limit": 50, "total": 137, "total_pages": 3 } }
}
```
`admin_name` / `admin_email` are **null when the household has no ADMIN member.** `member_count` counts every role, admin included. `deletion_scheduled_for` is set only while `status` is `DELETION_PENDING`.
Errors: `400`, `401`, `429`.

**`GET /households/{id}`** → `200`
`data`: `{ household, admin: … | null, members: [] }`
- `household`: `{ id, name, status, created_at, deletion_requested_at: string | null, scheduled_deletion_date: string | null }`
- `admin` (**nullable**): `{ id, name, email, claim_status, invite_sent_at, invite_expires_at, claimed_at, last_login_at }`
- `claim_status`: `CLAIMED` | `PENDING_INVITE` | `INVITE_EXPIRED` | `DELETED` | `NO_INVITE`
- `members`: `{ id, name, email, role: 'ADMIN' | 'MEMBER', joined_at, last_login_at: string | null }`
Errors: `400` (id not a UUID), `401`, `404 NOT_FOUND`, `429`.

**`POST /households/{id}/delete`** → `200`
Body: `{ "confirmation": "DELETE" }` — the exact string, required.
`data`: `{ household_id, status, deletion_requested_at, scheduled_deletion_date }` (both dates non-null; the schedule is midnight UTC, 30 days out).
Errors: `400` (missing/wrong confirmation, non-UUID id, already pending), `401`, `404`, `429`.

**`POST /households/{id}/restore`** → `200`
No body required.
`data`: `{ household_id, status }`
Errors: `400` (non-UUID id, not marked for deletion, or grace period expired), `401`, `404`, `429`.

**`POST /households/{id}/admin/resend-invite`** → `200` — **shipped.**
No body. Issues a fresh 48-hour claim link and invalidates any unused one.
`data`: `{ admin_email, new_expiry }`
**Limited to one resend per household per day**, counted from the audit trail.
Errors: `400` (the admin has already claimed this household), `401`, `404` (no such household, or it has no admin), `429` (already resent in the last 24 hours — *the message names the wait*).

## What is actually broken today

Each row was checked against the live schemas, not assumed.

| Area | State |
|---|---|
| **List** | **Broken.** Reads top-level `households` and `pagination`; the API returns `data` as a bare array with counts under `meta.pagination`, and the hook does no unwrapping at all, so `backend.households` is `undefined`. |
| **Detail** | Happy path works by luck — `unwrapBackendResponse` returns `data` and the snake field names line up. Breaks on `admin: null`; misses `INVITE_EXPIRED` / `DELETED` / `NO_INVITE`; ignores member `role`; and on a 404 the `isLoading \|\| !household` guard renders "Loading household…" forever. |
| **Create** | Wire-correct. Discards the `409` and the per-field `400`, showing axios's "Request failed with status code 409" instead. |
| **Delete / Restore** | Wire-correct. Both invalidate the singular key, so the detail page keeps its stale status. Both show raw axios messages. |
| **Resend** | Wire-correct, but its trigger tests `claimStatus === 'PENDING_INVITE'` against a union that could not hold `INVITE_EXPIRED` or `NO_INVITE`, and it never surfaces the once-a-day `429`. Its response type invents a `message` field and misses `admin_email`. |

Two problems the 2026-08-21 draft set out to fix are **moot**: the create body and the
`sort_by` / `sort_order` params became correct when the API moved to snake_case. And
resend-invite is now to be **fixed, not deleted**.

**Out of scope, flagged not fixed:** `useMetrics` calls `/api/v1/console/dashboard/metrics`, which
does not exist in the live document — the dashboard is hitting a 404. Separate plan. Also unused:
the `status` and `limit` query params.

## File Structure

**Create**
- `docs/console-households-api-contract.md` — the verified contract, sibling to `docs/console-auth-api-contract.md`.
- `src/modules/households/api/wire.ts` — snake_case wire types + pure mappers. The single place casing is translated.
- `src/modules/households/api/__tests__/wire.test.ts` — mapper unit tests.

**Modify**
- `src/utils/responseHandlers.ts` — add `unwrapEnvelope`, `unwrapPaginated`, `ApiError`; leave `unwrapBackendResponse` for auth/metrics.
- `src/utils/apiErrorMessages.ts` — teach `getErrorMessage` about `ApiError`.
- `src/modules/households/types.ts` — camelCase domain types only.
- `src/modules/households/api/{useHouseholds,useHousehold,useCreateHousehold,useDeleteHousehold,useRestoreHousehold,useResendInvite}.ts`
- `src/modules/households/hooks/useHouseholdFilters.ts`
- `src/modules/households/components/{HouseholdTable,AdminSection,MembersList,CreateHouseholdForm,DeleteHouseholdButton,RestoreHouseholdButton,ResendInviteButton,HouseholdInfo}.tsx`
- `src/modules/households/pages/{HouseholdsPage,HouseholdDetailPage}.tsx`
- `CLAUDE.md`, `docs/FRONTEND.md`, `notes/BE/prd-console-be.md`

**Delete** — nothing.

---

### Task 1: Record the verified contract

A document, not code. Every later task's fixtures are copied from it.

**Files:**
- Create: `docs/console-households-api-contract.md`

**Interfaces:**
- Consumes: nothing. Produces: the canonical contract text.

- [ ] **Step 1: Confirm the live contract still matches this plan**

```bash
curl -s http://localhost:3073/docs-json | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('paths:', [p for p in d['paths'] if 'household' in p])
print('list 200:', json.dumps(d['paths']['/api/v1/console/households']['get']['responses']['200']['content']['application/json']['schema'], indent=1)[:600])
print('claim_status:', d['components']['schemas']['HouseholdDetailAdminDto']['properties']['claim_status']['enum'])
"
```

Expected: five household paths including `…/admin/resend-invite`; the list `200` shows `data` as
an **array** plus a required `meta`; `claim_status` is
`['CLAIMED','PENDING_INVITE','INVITE_EXPIRED','DELETED','NO_INVITE']`.

**If any of that differs, stop and re-derive the contract before writing code.** This API changed
three times in two days; a mismatch here means every fixture below is stale.

- [ ] **Step 2: Write the contract document**

Create `docs/console-households-api-contract.md`. Use the "shipped contract, in full" section
above as the body, expanded into the house style of `docs/console-auth-api-contract.md`: a
`# Console Households API Contract (for frontend integration)` heading; a **Last updated:
2026-08-22** line; a **Source** line naming `GET {API_URL}/docs-json` and the Postman collection;
the envelope and error-code paragraphs from **Global Constraints**; then one `## METHOD /path`
section per endpoint with its request table, a full JSON response example, and its error list.
Include verbatim:

- the `meta.pagination` shape, and a sentence saying `data` is a bare array on the list endpoint;
- the five `claim_status` values with the meaning of each;
- `invite_sent_at: null` means created-but-not-emailed, not failure;
- resend-invite's **one per household per day** limit, and that the `429` message names the wait;
- `error.details` as an array of `{ field, code, message }`, `code` being the class-validator
  constraint and the thing to branch on;
- a closing note that `notes/BE/prd-console-be.md` is superseded.

- [ ] **Step 3: Verify the suite is untouched**

Run: `npx vitest run`
Expected: 26 files, 85 tests passing.

- [ ] **Step 4: Commit**

```bash
git add docs/console-households-api-contract.md
git commit -m "docs: record the verified console households API contract"
```

---

### Task 2: Envelope helpers

`unwrapBackendResponse` cannot express this contract: its `r.data ?? r.metrics ?? r.households ?? response`
fallback returns the whole envelope when `data` is missing, and it drops `meta` entirely — which is
exactly why the list endpoint fails silently. Households get strict helpers; auth and metrics keep
the old one.

**Files:**
- Modify: `src/utils/responseHandlers.ts`, `src/utils/apiErrorMessages.ts`
- Test: `src/utils/__tests__/responseHandlers.test.ts`, `src/utils/__tests__/apiErrorMessages.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface FieldError { field: string; code: string; message: string }`
  - `interface ApiErrorDetail { code: string; message: string; status_code: number; timestamp: string; path: string; details?: FieldError[] }`
  - `interface PaginationWire { page: number; limit: number; total: number; total_pages: number }`
  - `class ApiError extends Error` with `code: string`, `statusCode: number`, `fieldErrors: FieldError[]`
  - `unwrapEnvelope<T>(payload: unknown): T`
  - `unwrapPaginated<T>(payload: unknown): { items: T[]; pagination: PaginationWire }`
  - `getErrorMessage(error: unknown): string` — unchanged signature, now recognises `ApiError`.

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/__tests__/responseHandlers.test.ts`, adding `ApiError`, `unwrapEnvelope` and
`unwrapPaginated` to its existing import from `../responseHandlers`:

```ts
describe('unwrapEnvelope', () => {
  it('returns the data payload on success', () => {
    const data = { household_id: 'abc', status: 'ACTIVE' }
    expect(unwrapEnvelope<typeof data>({ success: true, data })).toEqual(data)
  })

  it('returns data even when it is an empty object', () => {
    expect(unwrapEnvelope({ success: true, data: {} })).toEqual({})
  })

  it('throws an ApiError carrying the backend error code', () => {
    let thrown: unknown
    try {
      unwrapEnvelope({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Household name already in use',
          status_code: 409,
          timestamp: '2026-01-31T09:15:00.000Z',
          path: '/api/v1/console/households',
        },
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(ApiError)
    expect((thrown as ApiError).code).toBe('CONFLICT')
    expect((thrown as ApiError).statusCode).toBe(409)
    expect((thrown as ApiError).message).toBe('Household name already in use')
  })

  it('exposes validation field errors as a list', () => {
    let thrown: unknown
    try {
      unwrapEnvelope({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          status_code: 400,
          timestamp: '2026-01-31T09:15:00.000Z',
          path: '/api/v1/console/households',
          details: [
            { field: 'admin_email', code: 'IS_EMAIL', message: 'admin_email must be an email' },
          ],
        },
      })
    } catch (error) {
      thrown = error
    }

    expect((thrown as ApiError).fieldErrors).toEqual([
      { field: 'admin_email', code: 'IS_EMAIL', message: 'admin_email must be an email' },
    ])
  })

  it('reports no field errors when details is absent', () => {
    let thrown: unknown
    try {
      unwrapEnvelope({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Household not found',
          status_code: 404,
          timestamp: '2026-01-31T09:15:00.000Z',
          path: '/x',
        },
      })
    } catch (error) {
      thrown = error
    }
    expect((thrown as ApiError).fieldErrors).toEqual([])
  })

  it('throws when a success envelope carries no data', () => {
    expect(() => unwrapEnvelope({ success: true })).toThrow(/no data/i)
  })

  it('throws when the body is not an envelope at all', () => {
    expect(() => unwrapEnvelope({ households: [] })).toThrow(/envelope/i)
    expect(() => unwrapEnvelope(null)).toThrow(/envelope/i)
  })
})

describe('unwrapPaginated', () => {
  it('returns the array and the pagination block from meta', () => {
    const result = unwrapPaginated<{ id: string }>({
      success: true,
      data: [{ id: '1' }],
      meta: { pagination: { page: 2, limit: 50, total: 137, total_pages: 3 } },
    })

    expect(result.items).toEqual([{ id: '1' }])
    expect(result.pagination).toEqual({ page: 2, limit: 50, total: 137, total_pages: 3 })
  })

  it('throws when data is not an array', () => {
    expect(() =>
      unwrapPaginated({ success: true, data: { households: [] }, meta: { pagination: {} } }),
    ).toThrow(/array/i)
  })

  it('throws when meta.pagination is missing', () => {
    expect(() => unwrapPaginated({ success: true, data: [] })).toThrow(/pagination/i)
  })

  it('propagates an ApiError from a failed envelope', () => {
    expect(() =>
      unwrapPaginated({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'page must not be less than 1',
          status_code: 400,
          timestamp: '2026-01-31T09:15:00.000Z',
          path: '/x',
        },
      }),
    ).toThrow(ApiError)
  })
})
```

Append to `src/utils/__tests__/apiErrorMessages.test.ts`, adding
`import { ApiError } from '../responseHandlers'`:

```ts
it('uses the message from an ApiError thrown by unwrapEnvelope', () => {
  const error = new ApiError({
    code: 'INVALID_STATE',
    message: 'Household is already marked for deletion',
    status_code: 400,
    timestamp: '2026-01-31T09:15:00.000Z',
    path: '/api/v1/console/households/x/delete',
  })

  expect(getErrorMessage(error)).toBe('Household is already marked for deletion')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/utils`
Expected: FAIL — `ApiError`, `unwrapEnvelope`, `unwrapPaginated` are not exported.

- [ ] **Step 3: Implement**

Append to `src/utils/responseHandlers.ts`, leaving `unwrapBackendResponse` untouched:

```ts
/** One failed constraint from the validation pipe. */
export interface FieldError {
  field: string
  /** The class-validator constraint, upper-snaked. Branch on this, not the copy. */
  code: string
  message: string
}

/** The `error` object every failed console response carries. */
export interface ApiErrorDetail {
  code: string
  message: string
  status_code: number
  timestamp: string
  path: string
  details?: FieldError[]
}

/** The `meta.pagination` block on a paginated console response. */
export interface PaginationWire {
  page: number
  limit: number
  total: number
  total_pages: number
}

/**
 * A failure the backend described. `code` is the field to branch on: several
 * codes share one HTTP status, so the status alone cannot tell CONFLICT from
 * INVALID_STATE.
 */
export class ApiError extends Error {
  readonly code: string
  readonly statusCode: number
  readonly fieldErrors: FieldError[]

  constructor(detail: ApiErrorDetail) {
    super(detail.message)
    this.name = 'ApiError'
    this.code = detail.code
    this.statusCode = detail.status_code
    this.fieldErrors = detail.details ?? []
  }
}

function readEnvelope(payload: unknown): {
  success: boolean
  data?: unknown
  meta?: unknown
} {
  if (!payload || typeof payload !== 'object' || !('success' in payload)) {
    throw new Error('Malformed response: expected a { success, data } envelope')
  }

  const envelope = payload as {
    success: boolean
    data?: unknown
    meta?: unknown
    error?: ApiErrorDetail
  }

  if (!envelope.success) {
    if (envelope.error?.code) throw new ApiError(envelope.error)
    throw new Error('Request failed')
  }

  return envelope
}

/**
 * Strict counterpart to `unwrapBackendResponse`, for the console households
 * endpoints. It throws rather than guessing: a shape change should surface as
 * an error, not as a blank page.
 */
export function unwrapEnvelope<T>(payload: unknown): T {
  const envelope = readEnvelope(payload)

  if (envelope.data === undefined) {
    throw new Error('Malformed response: success envelope carried no data')
  }

  return envelope.data as T
}

/**
 * The list endpoint returns `data` as a bare array and puts the counts in
 * `meta.pagination`, so unwrapping it needs both halves.
 */
export function unwrapPaginated<T>(payload: unknown): {
  items: T[]
  pagination: PaginationWire
} {
  const envelope = readEnvelope(payload)

  if (!Array.isArray(envelope.data)) {
    throw new Error('Malformed response: expected data to be an array')
  }

  const pagination = (envelope.meta as { pagination?: PaginationWire } | undefined)?.pagination
  if (!pagination) {
    throw new Error('Malformed response: expected meta.pagination')
  }

  return { items: envelope.data as T[], pagination }
}
```

In `src/utils/apiErrorMessages.ts`, add the `ApiError` branch **first**:

```ts
import { isAxiosError } from 'axios'
import { ApiError } from './responseHandlers'

const NETWORK_ERROR_MESSAGE = 'Network error. Please try again.'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again later.'

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  if (!isAxiosError(error)) {
    return GENERIC_ERROR_MESSAGE
  }

  if (!error.response) {
    return NETWORK_ERROR_MESSAGE
  }

  const data = error.response.data as
    | { message?: string; error?: { message?: string } }
    | undefined
  return data?.error?.message ?? data?.message ?? GENERIC_ERROR_MESSAGE
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/utils`
Expected: PASS.

- [ ] **Step 5: Run the gate**

Run: `npm run build && npx vitest run`
Expected: clean build, all tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/utils
git commit -m "feat: add strict envelope unwrappers and a typed ApiError"
```

---

### Task 3: The wire boundary

One file that knows the API's casing, and pure functions across it. Testable on its own, with no
network and no React.

**Files:**
- Create: `src/modules/households/api/wire.ts`, `src/modules/households/api/__tests__/wire.test.ts`
- Modify: `src/modules/households/types.ts`

**Interfaces:**
- Consumes: `PaginationWire` from Task 2.
- Produces — domain types in `types.ts`:
  - `type HouseholdStatus = 'ACTIVE' | 'DELETION_PENDING'`
  - `type AdminClaimStatus = 'CLAIMED' | 'PENDING_INVITE' | 'INVITE_EXPIRED' | 'DELETED' | 'NO_INVITE'`
  - `type MemberRole = 'ADMIN' | 'MEMBER'`
  - `type HouseholdSortField = 'createdAt' | 'name' | 'adminName' | 'adminEmail' | 'memberCount'`
  - `interface HouseholdSummary { id: string; name: string; status: HouseholdStatus; createdAt: string; deletionScheduledFor: string | null; adminName: string | null; adminEmail: string | null; memberCount: number }`
  - `interface PaginationMeta { page: number; limit: number; total: number; totalPages: number }`
  - `interface HouseholdsListResponse { households: HouseholdSummary[]; pagination: PaginationMeta }`
  - `interface HouseholdCore { id: string; name: string; status: HouseholdStatus; createdAt: string; deletionRequestedAt: string | null; scheduledDeletionDate: string | null }`
  - `interface HouseholdAdmin { id: string; name: string; email: string; claimStatus: AdminClaimStatus; inviteSentAt: string | null; inviteExpiresAt: string | null; claimedAt: string | null; lastLoginAt: string | null }`
  - `interface HouseholdMember { id: string; name: string; email: string; role: MemberRole; joinedAt: string; lastLoginAt: string | null }`
  - `interface HouseholdDetail { household: HouseholdCore; admin: HouseholdAdmin | null; members: HouseholdMember[] }`
  - `interface HouseholdFilters { page: number; search: string; sortBy: HouseholdSortField; sortOrder: 'ASC' | 'DESC' }`
  - `interface CreateHouseholdInput { householdName: string; adminEmail: string; adminName: string; notes?: string }`
  - `interface CreatedHousehold { householdId: string; adminId: string; adminEmail: string; inviteSentAt: string | null }`
  - `interface HouseholdDeletion { householdId: string; status: HouseholdStatus; deletionRequestedAt: string; scheduledDeletionDate: string }`
  - `interface HouseholdRestore { householdId: string; status: HouseholdStatus }`
  - `interface ResendInvite { adminEmail: string; newExpiry: string }`
- Produces — from `wire.ts`: the `*Wire` interfaces, plus `toListQuery`, `toHouseholdSummary`, `toPagination`, `toHouseholdDetail`, `toCreateHouseholdBody`, `toCreatedHousehold`, `toHouseholdDeletion`, `toHouseholdRestore`, `toResendInvite`.

- [ ] **Step 1: Write the failing tests**

Create `src/modules/households/api/__tests__/wire.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  toCreateHouseholdBody,
  toCreatedHousehold,
  toHouseholdDeletion,
  toHouseholdDetail,
  toHouseholdRestore,
  toHouseholdSummary,
  toListQuery,
  toPagination,
  toResendInvite,
} from '../wire'

describe('toListQuery', () => {
  it('translates domain filters into snake_case query params', () => {
    expect(
      toListQuery({ page: 2, search: 'Adios', sortBy: 'memberCount', sortOrder: 'ASC' }),
    ).toEqual({ page: 2, search: 'Adios', sort_by: 'member_count', sort_order: 'ASC' })
  })

  it('omits an empty search rather than sending a blank param', () => {
    const query = toListQuery({ page: 1, search: '', sortBy: 'createdAt', sortOrder: 'DESC' })
    expect(query).toEqual({ page: 1, sort_by: 'created_at', sort_order: 'DESC' })
    expect('search' in query).toBe(false)
  })
})

describe('toHouseholdSummary', () => {
  it('maps a list item to camelCase', () => {
    expect(
      toHouseholdSummary({
        id: 'h1',
        name: 'Adios Family',
        status: 'ACTIVE',
        created_at: '2026-07-15T00:00:00.000Z',
        deletion_scheduled_for: null,
        admin_name: 'Javier',
        admin_email: 'javier@adios.com',
        member_count: 4,
      }),
    ).toEqual({
      id: 'h1',
      name: 'Adios Family',
      status: 'ACTIVE',
      createdAt: '2026-07-15T00:00:00.000Z',
      deletionScheduledFor: null,
      adminName: 'Javier',
      adminEmail: 'javier@adios.com',
      memberCount: 4,
    })
  })

  it('keeps a missing admin as null rather than inventing a name', () => {
    const summary = toHouseholdSummary({
      id: 'h2',
      name: 'Orphan',
      status: 'ACTIVE',
      created_at: '2026-07-15T00:00:00.000Z',
      deletion_scheduled_for: null,
      admin_name: null,
      admin_email: null,
      member_count: 0,
    })

    expect(summary.adminName).toBeNull()
    expect(summary.adminEmail).toBeNull()
  })
})

describe('toPagination', () => {
  it('maps total_pages to totalPages', () => {
    expect(toPagination({ page: 2, limit: 50, total: 137, total_pages: 3 })).toEqual({
      page: 2,
      limit: 50,
      total: 137,
      totalPages: 3,
    })
  })
})

describe('toHouseholdDetail', () => {
  const wire = {
    household: {
      id: 'h1',
      name: 'Adios Family',
      status: 'ACTIVE' as const,
      created_at: '2026-07-15T00:00:00.000Z',
      deletion_requested_at: null,
      scheduled_deletion_date: null,
    },
    admin: {
      id: 'a1',
      name: 'Javier',
      email: 'javier@adios.com',
      claim_status: 'PENDING_INVITE' as const,
      invite_sent_at: '2026-07-15T00:00:00.000Z',
      invite_expires_at: '2026-07-17T00:00:00.000Z',
      claimed_at: null,
      last_login_at: null,
    },
    members: [
      {
        id: 'm1',
        name: 'Sofia',
        email: 'sofia@adios.com',
        role: 'MEMBER' as const,
        joined_at: '2026-07-16T00:00:00.000Z',
        last_login_at: null,
      },
    ],
  }

  it('maps the household, admin, and members', () => {
    const detail = toHouseholdDetail(wire)

    expect(detail.household.createdAt).toBe('2026-07-15T00:00:00.000Z')
    expect(detail.household.scheduledDeletionDate).toBeNull()
    expect(detail.admin?.claimStatus).toBe('PENDING_INVITE')
    expect(detail.admin?.inviteExpiresAt).toBe('2026-07-17T00:00:00.000Z')
    expect(detail.members[0]).toEqual({
      id: 'm1',
      name: 'Sofia',
      email: 'sofia@adios.com',
      role: 'MEMBER',
      joinedAt: '2026-07-16T00:00:00.000Z',
      lastLoginAt: null,
    })
  })

  it('passes a null admin through as null', () => {
    expect(toHouseholdDetail({ ...wire, admin: null, members: [] }).admin).toBeNull()
  })
})

describe('request and mutation mappers', () => {
  it('sends a snake_case create body and drops an empty notes field', () => {
    expect(
      toCreateHouseholdBody({
        householdName: 'Adios Family',
        adminEmail: 'javier@adios.com',
        adminName: 'Javier',
        notes: '',
      }),
    ).toEqual({
      household_name: 'Adios Family',
      admin_email: 'javier@adios.com',
      admin_name: 'Javier',
    })
  })

  it('keeps notes when there is something to say', () => {
    expect(
      toCreateHouseholdBody({
        householdName: 'Adios Family',
        adminEmail: 'javier@adios.com',
        adminName: 'Javier',
        notes: 'VIP',
      }).notes,
    ).toBe('VIP')
  })

  it('maps the created household', () => {
    expect(
      toCreatedHousehold({
        household_id: 'h1',
        admin_id: 'a1',
        admin_email: 'javier@adios.com',
        invite_sent_at: null,
      }),
    ).toEqual({
      householdId: 'h1',
      adminId: 'a1',
      adminEmail: 'javier@adios.com',
      inviteSentAt: null,
    })
  })

  it('maps a deletion schedule', () => {
    expect(
      toHouseholdDeletion({
        household_id: 'h1',
        status: 'DELETION_PENDING',
        deletion_requested_at: '2026-08-02T10:00:00.000Z',
        scheduled_deletion_date: '2026-09-01T00:00:00.000Z',
      }),
    ).toEqual({
      householdId: 'h1',
      status: 'DELETION_PENDING',
      deletionRequestedAt: '2026-08-02T10:00:00.000Z',
      scheduledDeletionDate: '2026-09-01T00:00:00.000Z',
    })
  })

  it('maps a restore', () => {
    expect(toHouseholdRestore({ household_id: 'h1', status: 'ACTIVE' })).toEqual({
      householdId: 'h1',
      status: 'ACTIVE',
    })
  })

  it('maps a resent invite', () => {
    expect(
      toResendInvite({
        admin_email: 'javier@adios.com',
        new_expiry: '2026-08-04T10:00:00.000Z',
      }),
    ).toEqual({ adminEmail: 'javier@adios.com', newExpiry: '2026-08-04T10:00:00.000Z' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/modules/households/api/__tests__/wire.test.ts`
Expected: FAIL — `../wire` does not exist.

- [ ] **Step 3: Write the domain types**

Replace the whole of `src/modules/households/types.ts` with the camelCase domain types listed in
this task's **Produces** block, each as an `export interface` / `export type`, carrying these
comments:

- on `AdminClaimStatus`: "Derived by the backend, not stored: CLAIMED once the invite is used, PENDING_INVITE while it is live, INVITE_EXPIRED after it lapses, DELETED when the admin row is gone, NO_INVITE when none was ever issued."
- on `HouseholdSummary.adminName` / `adminEmail`: "Null when the household has no ADMIN member."
- on `HouseholdSummary.deletionScheduledFor`: "Set only while status is DELETION_PENDING."
- on `HouseholdSummary.memberCount`: "Members of every role, admin included."
- on `HouseholdCore.scheduledDeletionDate`: "Midnight UTC at the end of the 30-day grace period."
- on `HouseholdDetail.admin`: "Null when the household has no ADMIN member."
- on `CreatedHousehold.inviteSentAt`: "When the admin claim email was sent, or null when delivery failed. The household is created either way."
- on `ResendInvite.newExpiry`: "When the newly issued claim link expires, 48 hours out."

Delete `HouseholdsBackendResponse`, `HouseholdDetailBackendResponse`, `CreateHouseholdResponse`,
`DeleteHouseholdResponse`, `RestoreHouseholdResponse`, and `ResendInviteResponse` — the wire
shapes live in `wire.ts` now.

- [ ] **Step 4: Write the wire boundary**

Create `src/modules/households/api/wire.ts`:

```ts
/**
 * The only file in this module that names a snake_case field.
 *
 * The API speaks snake_case; components speak camelCase. Everything crossing
 * that line goes through a pure function here, so a casing change on the
 * backend — and there have been two in two days — costs one file.
 */
import type { PaginationWire } from '@/utils/responseHandlers'
import type {
  AdminClaimStatus,
  CreateHouseholdInput,
  CreatedHousehold,
  HouseholdAdmin,
  HouseholdCore,
  HouseholdDeletion,
  HouseholdDetail,
  HouseholdFilters,
  HouseholdMember,
  HouseholdRestore,
  HouseholdSortField,
  HouseholdStatus,
  HouseholdSummary,
  MemberRole,
  PaginationMeta,
  ResendInvite,
} from '../types'

export type { PaginationWire }

export interface HouseholdListItemWire {
  id: string
  name: string
  status: HouseholdStatus
  created_at: string
  deletion_scheduled_for: string | null
  admin_name: string | null
  admin_email: string | null
  member_count: number
}

export interface HouseholdCoreWire {
  id: string
  name: string
  status: HouseholdStatus
  created_at: string
  deletion_requested_at: string | null
  scheduled_deletion_date: string | null
}

export interface HouseholdAdminWire {
  id: string
  name: string
  email: string
  claim_status: AdminClaimStatus
  invite_sent_at: string | null
  invite_expires_at: string | null
  claimed_at: string | null
  last_login_at: string | null
}

export interface HouseholdMemberWire {
  id: string
  name: string
  email: string
  role: MemberRole
  joined_at: string
  last_login_at: string | null
}

export interface HouseholdDetailWire {
  household: HouseholdCoreWire
  admin: HouseholdAdminWire | null
  members: HouseholdMemberWire[]
}

export interface CreateHouseholdBodyWire {
  household_name: string
  admin_email: string
  admin_name: string
  notes?: string
}

export interface CreatedHouseholdWire {
  household_id: string
  admin_id: string
  admin_email: string
  invite_sent_at: string | null
}

export interface HouseholdDeletionWire {
  household_id: string
  status: HouseholdStatus
  deletion_requested_at: string
  scheduled_deletion_date: string
}

export interface HouseholdRestoreWire {
  household_id: string
  status: HouseholdStatus
}

export interface ResendInviteWire {
  admin_email: string
  new_expiry: string
}

export interface HouseholdListQueryWire {
  page: number
  search?: string
  sort_by: string
  sort_order: 'ASC' | 'DESC'
}

const SORT_FIELD_TO_WIRE: Record<HouseholdSortField, string> = {
  createdAt: 'created_at',
  name: 'name',
  adminName: 'admin_name',
  adminEmail: 'admin_email',
  memberCount: 'member_count',
}

export function toListQuery(filters: HouseholdFilters): HouseholdListQueryWire {
  const query: HouseholdListQueryWire = {
    page: filters.page,
    sort_by: SORT_FIELD_TO_WIRE[filters.sortBy],
    sort_order: filters.sortOrder,
  }

  // An empty `search` would go out as `search=`, which filters on the empty
  // string rather than meaning "no filter".
  if (filters.search) query.search = filters.search

  return query
}

export function toHouseholdSummary(wire: HouseholdListItemWire): HouseholdSummary {
  return {
    id: wire.id,
    name: wire.name,
    status: wire.status,
    createdAt: wire.created_at,
    deletionScheduledFor: wire.deletion_scheduled_for,
    adminName: wire.admin_name,
    adminEmail: wire.admin_email,
    memberCount: wire.member_count,
  }
}

export function toPagination(wire: PaginationWire): PaginationMeta {
  return {
    page: wire.page,
    limit: wire.limit,
    total: wire.total,
    totalPages: wire.total_pages,
  }
}

function toHouseholdCore(wire: HouseholdCoreWire): HouseholdCore {
  return {
    id: wire.id,
    name: wire.name,
    status: wire.status,
    createdAt: wire.created_at,
    deletionRequestedAt: wire.deletion_requested_at,
    scheduledDeletionDate: wire.scheduled_deletion_date,
  }
}

function toHouseholdAdmin(wire: HouseholdAdminWire): HouseholdAdmin {
  return {
    id: wire.id,
    name: wire.name,
    email: wire.email,
    claimStatus: wire.claim_status,
    inviteSentAt: wire.invite_sent_at,
    inviteExpiresAt: wire.invite_expires_at,
    claimedAt: wire.claimed_at,
    lastLoginAt: wire.last_login_at,
  }
}

function toHouseholdMember(wire: HouseholdMemberWire): HouseholdMember {
  return {
    id: wire.id,
    name: wire.name,
    email: wire.email,
    role: wire.role,
    joinedAt: wire.joined_at,
    lastLoginAt: wire.last_login_at,
  }
}

export function toHouseholdDetail(wire: HouseholdDetailWire): HouseholdDetail {
  return {
    household: toHouseholdCore(wire.household),
    admin: wire.admin ? toHouseholdAdmin(wire.admin) : null,
    members: wire.members.map(toHouseholdMember),
  }
}

export function toCreateHouseholdBody(input: CreateHouseholdInput): CreateHouseholdBodyWire {
  const body: CreateHouseholdBodyWire = {
    household_name: input.householdName,
    admin_email: input.adminEmail,
    admin_name: input.adminName,
  }

  // The field is optional and capped at 1000 chars; an empty string is not a note.
  if (input.notes) body.notes = input.notes

  return body
}

export function toCreatedHousehold(wire: CreatedHouseholdWire): CreatedHousehold {
  return {
    householdId: wire.household_id,
    adminId: wire.admin_id,
    adminEmail: wire.admin_email,
    inviteSentAt: wire.invite_sent_at,
  }
}

export function toHouseholdDeletion(wire: HouseholdDeletionWire): HouseholdDeletion {
  return {
    householdId: wire.household_id,
    status: wire.status,
    deletionRequestedAt: wire.deletion_requested_at,
    scheduledDeletionDate: wire.scheduled_deletion_date,
  }
}

export function toHouseholdRestore(wire: HouseholdRestoreWire): HouseholdRestore {
  return {
    householdId: wire.household_id,
    status: wire.status,
  }
}

export function toResendInvite(wire: ResendInviteWire): ResendInvite {
  return {
    adminEmail: wire.admin_email,
    newExpiry: wire.new_expiry,
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/modules/households/api/__tests__/wire.test.ts`
Expected: PASS.

- [ ] **Step 6: Note the expected breakage, then commit**

`npm run build` is **red** from here: the hooks and components still reference the deleted
`*BackendResponse` types and the old field names. Tasks 4–9 repair them one endpoint at a time,
and the build goes green at the end of Task 9. Commit anyway so the boundary lands as one
reviewable change.

```bash
npx vitest run src/modules/households/api/__tests__/wire.test.ts src/utils
git add src/modules/households/api/wire.ts src/modules/households/api/__tests__/wire.test.ts src/modules/households/types.ts
git commit -m "feat: add a snake_case wire boundary with pure mappers for households"
```

---

### Task 4: The list endpoint

The one that is outright broken: `data` is a bare array and the counts moved to `meta.pagination`.

**Files:**
- Modify: `src/modules/households/api/useHouseholds.ts`, `src/modules/households/hooks/useHouseholdFilters.ts`, `src/modules/households/components/HouseholdTable.tsx`, `src/modules/households/pages/HouseholdsPage.tsx`
- Test: `src/modules/households/api/__tests__/useHouseholds.test.tsx`, `src/modules/households/components/__tests__/HouseholdTable.test.tsx`

**Interfaces:**
- Consumes: `unwrapPaginated` (Task 2); `toListQuery`, `toHouseholdSummary`, `toPagination`, `HouseholdListItemWire` (Task 3).
- Produces: `useHouseholds(filters)` → `UseQueryResult<HouseholdsListResponse>`; `useHouseholdFilters()` → `{ filters, setSearch, setSort, setPage }` with `filters.sortBy` a `HouseholdSortField`.

- [ ] **Step 1: Write the failing tests**

Replace `src/modules/households/api/__tests__/useHouseholds.test.tsx`:

```tsx
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
  it('sends snake_case params and reads data plus meta.pagination', async () => {
    server.use(
      http.get('*/api/v1/console/households', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('page')).toBe('1')
        expect(url.searchParams.get('search')).toBe('Adios')
        expect(url.searchParams.get('sort_by')).toBe('created_at')
        expect(url.searchParams.get('sort_order')).toBe('DESC')

        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 'h1',
              name: 'Adios Family',
              status: 'ACTIVE',
              created_at: '2026-07-15T00:00:00.000Z',
              deletion_scheduled_for: null,
              admin_name: 'Javier',
              admin_email: 'javier@adios.com',
              member_count: 4,
            },
          ],
          meta: { pagination: { page: 1, limit: 50, total: 65, total_pages: 2 } },
        })
      }),
    )

    const { result } = renderHook(
      () => useHouseholds({ page: 1, search: 'Adios', sortBy: 'createdAt', sortOrder: 'DESC' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.households[0]).toMatchObject({
      name: 'Adios Family',
      adminName: 'Javier',
      memberCount: 4,
    })
    expect(result.current.data?.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 65,
      totalPages: 2,
    })
  })

  it('translates a camelCase sort field to its snake_case param', async () => {
    let sentSortBy: string | null = null

    server.use(
      http.get('*/api/v1/console/households', ({ request }) => {
        sentSortBy = new URL(request.url).searchParams.get('sort_by')
        return HttpResponse.json({
          success: true,
          data: [],
          meta: { pagination: { page: 1, limit: 50, total: 0, total_pages: 0 } },
        })
      }),
    )

    const { result } = renderHook(
      () => useHouseholds({ page: 1, search: '', sortBy: 'memberCount', sortOrder: 'ASC' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(sentSortBy).toBe('member_count')
  })

  it('errors when the backend rejects the query', async () => {
    server.use(
      http.get('*/api/v1/console/households', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'page must not be less than 1',
              status_code: 400,
              timestamp: '2026-07-15T00:00:00.000Z',
              path: '/api/v1/console/households',
            },
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(
      () => useHouseholds({ page: 1, search: '', sortBy: 'createdAt', sortOrder: 'DESC' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

In `src/modules/households/components/__tests__/HouseholdTable.test.tsx`, update every fixture to
the camelCase `HouseholdSummary` shape (`adminName`, `adminEmail`, `createdAt`,
`deletionScheduledFor`, `memberCount`) and add:

```tsx
  it('renders a placeholder when the household has no admin', () => {
    renderWithProviders(
      <HouseholdTable
        households={[
          {
            id: 'h2',
            name: 'Orphan Household',
            status: 'ACTIVE',
            createdAt: '2026-07-15T00:00:00.000Z',
            deletionScheduledFor: null,
            adminName: null,
            adminEmail: null,
            memberCount: 0,
          },
        ]}
        isLoading={false}
        onRowClick={() => {}}
      />,
    )

    expect(screen.getByText('No admin')).toBeInTheDocument()
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/modules/households/api/__tests__/useHouseholds.test.tsx src/modules/households/components/__tests__/HouseholdTable.test.tsx`
Expected: FAIL — `data.households` is undefined and "No admin" renders nowhere.

- [ ] **Step 3: Rewrite the hook**

Replace `src/modules/households/api/useHouseholds.ts`:

```ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapPaginated } from '@/utils/responseHandlers'
import type { HouseholdFilters, HouseholdsListResponse } from '../types'
import { toHouseholdSummary, toListQuery, toPagination } from './wire'
import type { HouseholdListItemWire } from './wire'

export function useHouseholds(filters: HouseholdFilters) {
  return useQuery({
    queryKey: ['console', 'households', filters],
    queryFn: async (): Promise<HouseholdsListResponse> => {
      const response = await apiClient.get<unknown>('/api/v1/console/households', {
        params: toListQuery(filters),
      })

      // `data` is a bare array here; the counts live in `meta.pagination`.
      const { items, pagination } = unwrapPaginated<HouseholdListItemWire>(response.data)

      return {
        households: items.map(toHouseholdSummary),
        pagination: toPagination(pagination),
      }
    },
    placeholderData: keepPreviousData,
  })
}
```

- [ ] **Step 4: Move the casing knowledge out of the filters hook**

Replace `src/modules/households/hooks/useHouseholdFilters.ts`:

```ts
import { useSearchParams } from 'react-router-dom'
import type { HouseholdFilters, HouseholdSortField } from '../types'

const SORT_FIELDS: HouseholdSortField[] = [
  'createdAt',
  'name',
  'adminName',
  'adminEmail',
  'memberCount',
]

const DEFAULT_SORT_BY: HouseholdSortField = 'createdAt'
const DEFAULT_SORT_ORDER = 'DESC' as const

function parseSortField(value: string | undefined): HouseholdSortField {
  return SORT_FIELDS.includes(value as HouseholdSortField)
    ? (value as HouseholdSortField)
    : DEFAULT_SORT_BY
}

export function useHouseholdFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Stored in the URL as 'field:order' so a sorted view is bookmarkable. The
  // field stays in domain casing; `toListQuery` translates it for the API.
  const sortParam =
    searchParams.get('sort') ?? `${DEFAULT_SORT_BY}:${DEFAULT_SORT_ORDER.toLowerCase()}`
  const [sortByRaw, sortOrderRaw] = sortParam.split(':')

  const filters: HouseholdFilters = {
    page: Number(searchParams.get('page') ?? '1'),
    search: searchParams.get('search') ?? '',
    // An unrecognised ?sort= falls back rather than reaching the API as an
    // invalid sort_by and earning a 400.
    sortBy: parseSortField(sortByRaw),
    sortOrder: sortOrderRaw?.toUpperCase() === 'ASC' ? 'ASC' : DEFAULT_SORT_ORDER,
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

  const setSort = (sortBy: HouseholdSortField, sortOrder: 'ASC' | 'DESC' = 'DESC') => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.set('sort', `${sortBy}:${sortOrder.toLowerCase()}`)
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

- [ ] **Step 5: Handle a null admin in the table**

In `src/modules/households/components/HouseholdTable.tsx`, replace the admin cell:

```tsx
                <td title={household.adminEmail ?? undefined}>
                  {household.adminName || household.adminEmail ? (
                    <>
                      <span className="cell-primary">{household.adminName ?? '—'}</span>
                      <span className="cell-secondary">{household.adminEmail ?? '—'}</span>
                    </>
                  ) : (
                    <span className="cell-secondary">No admin</span>
                  )}
                </td>
```

- [ ] **Step 6: Read the new response on the page**

In `src/modules/households/pages/HouseholdsPage.tsx`, replace the count binding, the table prop,
and the footer:

```tsx
  const total = data?.pagination.total
  const count =
    total !== undefined ? `${total} ${total === 1 ? 'household' : 'households'}` : undefined
```

```tsx
        <HouseholdTable
          households={data?.households ?? []}
          isLoading={isLoading}
          search={filters.search}
          onRowClick={(id) => navigate(`/console/households/${id}`)}
        />

        {data && data.pagination.totalPages > 1 && (
          <div className="card-footer">
            <span className="pagination-range">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPreviousPage={() => setPage(Math.max(1, filters.page - 1))}
              onNextPage={() => setPage(filters.page + 1)}
            />
          </div>
        )}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/modules/households/api/__tests__/useHouseholds.test.tsx src/modules/households/components/__tests__/HouseholdTable.test.tsx`
Expected: PASS. The full build is still red until Task 9 — expected.

- [ ] **Step 8: Commit**

```bash
git add src/modules/households
git commit -m "fix: read the list endpoint's data array and meta.pagination"
```

---

### Task 5: The detail endpoint

**Files:**
- Modify: `src/modules/households/api/useHousehold.ts`, `src/modules/households/components/{AdminSection,MembersList,HouseholdInfo}.tsx`, `src/modules/households/pages/HouseholdDetailPage.tsx`
- Test: `src/modules/households/api/__tests__/useHousehold.test.tsx`, `src/modules/households/pages/__tests__/HouseholdDetailPage.test.tsx`

**Interfaces:**
- Consumes: `unwrapEnvelope` (Task 2); `toHouseholdDetail`, `HouseholdDetailWire` (Task 3).
- Produces: `useHousehold(id)` → `UseQueryResult<HouseholdDetail>` under `['console','households',id]`; `AdminSection({ admin: HouseholdAdmin | null, householdId: string })` — **`householdId` is retained**, the resend button needs it; `HouseholdInfo({ household: HouseholdCore, onRefresh? })`.

- [ ] **Step 1: Write the failing tests**

Replace `src/modules/households/api/__tests__/useHousehold.test.tsx`:

```tsx
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { createTestQueryClient } from '@/test/test-utils'
import { useHousehold } from '../useHousehold'

const ID = '3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64'

const detailPayload = {
  household: {
    id: ID,
    name: 'Adios Family',
    status: 'ACTIVE',
    created_at: '2026-07-15T00:00:00.000Z',
    deletion_requested_at: null,
    scheduled_deletion_date: null,
  },
  admin: {
    id: 'a1',
    name: 'Javier',
    email: 'javier@adios.com',
    claim_status: 'PENDING_INVITE',
    invite_sent_at: '2026-07-15T00:00:00.000Z',
    invite_expires_at: '2026-07-17T00:00:00.000Z',
    claimed_at: null,
    last_login_at: null,
  },
  members: [
    {
      id: 'm1',
      name: 'Sofia',
      email: 'sofia@adios.com',
      role: 'MEMBER',
      joined_at: '2026-07-16T00:00:00.000Z',
      last_login_at: null,
    },
  ],
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useHousehold', () => {
  it('unwraps and maps the detail payload', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json({ success: true, data: detailPayload }),
      ),
    )

    const { result } = renderHook(() => useHousehold(ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.household.name).toBe('Adios Family')
    expect(result.current.data?.admin?.claimStatus).toBe('PENDING_INVITE')
    expect(result.current.data?.admin?.inviteExpiresAt).toBe('2026-07-17T00:00:00.000Z')
    expect(result.current.data?.members[0].role).toBe('MEMBER')
  })

  it('tolerates a household with no admin', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json({ success: true, data: { ...detailPayload, admin: null, members: [] } }),
      ),
    )

    const { result } = renderHook(() => useHousehold(ID), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.admin).toBeNull()
  })

  it('errors on a 404 instead of resolving with undefined', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Household not found',
              status_code: 404,
              timestamp: '2026-07-15T00:00:00.000Z',
              path: `/api/v1/console/households/${ID}`,
            },
          },
          { status: 404 },
        ),
      ),
    )

    const { result } = renderHook(() => useHousehold(ID), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('registers under the plural households key', async () => {
    server.use(
      http.get(`*/api/v1/console/households/${ID}`, () =>
        HttpResponse.json({ success: true, data: detailPayload }),
      ),
    )

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useHousehold(ID), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(['console', 'households', ID])).toBeDefined()
  })

  it('is disabled when id is empty', () => {
    const { result } = renderHook(() => useHousehold(''), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
```

Replace `src/modules/households/pages/__tests__/HouseholdDetailPage.test.tsx` with the same
`detailPayload` fixture and three cases: it renders the household, admin and members; it says
"No admin" when `admin` is null; and on the `404` above it shows `role="alert"` containing
"Household not found" and no longer renders "Loading household…".

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/modules/households/api/__tests__/useHousehold.test.tsx src/modules/households/pages/__tests__/HouseholdDetailPage.test.tsx`
Expected: FAIL — the hook still hand-maps into the old flat shape, and the page loads forever on 404.

- [ ] **Step 3: Rewrite the hook**

Replace `src/modules/households/api/useHousehold.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapEnvelope } from '@/utils/responseHandlers'
import type { HouseholdDetail } from '../types'
import { toHouseholdDetail } from './wire'
import type { HouseholdDetailWire } from './wire'

export function useHousehold(id: string) {
  return useQuery({
    // Plural, so invalidating ['console','households'] reaches it.
    queryKey: ['console', 'households', id],
    queryFn: async (): Promise<HouseholdDetail> => {
      const response = await apiClient.get<unknown>(`/api/v1/console/households/${id}`)
      return toHouseholdDetail(unwrapEnvelope<HouseholdDetailWire>(response.data))
    },
    enabled: !!id,
  })
}
```

- [ ] **Step 4: Show all five claim statuses and a missing admin**

Replace `src/modules/households/components/AdminSection.tsx`:

```tsx
import { ResendInviteButton } from './ResendInviteButton'
import type { AdminClaimStatus, HouseholdAdmin } from '../types'

const CLAIM_STATUS_LABELS: Record<AdminClaimStatus, string> = {
  CLAIMED: 'Claimed',
  PENDING_INVITE: 'Invite pending',
  INVITE_EXPIRED: 'Invite expired',
  DELETED: 'Admin removed',
  NO_INVITE: 'No invite issued',
}

/** A fresh link is only worth offering while the invite is still the blocker. */
const RESENDABLE: AdminClaimStatus[] = ['PENDING_INVITE', 'INVITE_EXPIRED', 'NO_INVITE']

interface AdminSectionProps {
  admin: HouseholdAdmin | null
  householdId: string
}

export function AdminSection({ admin, householdId }: AdminSectionProps) {
  if (!admin) {
    return (
      <section aria-label="Admin">
        <h2>Admin</h2>
        <p>No admin. This household has no ADMIN member.</p>
      </section>
    )
  }

  return (
    <section aria-label="Admin">
      <h2>Admin</h2>
      <p>Name: {admin.name}</p>
      <p>Email: {admin.email}</p>
      <p>Status: {CLAIM_STATUS_LABELS[admin.claimStatus]}</p>
      {admin.claimStatus === 'PENDING_INVITE' && admin.inviteExpiresAt && (
        <p>Invite expires {new Date(admin.inviteExpiresAt).toLocaleString()}</p>
      )}
      {admin.lastLoginAt && <p>Last Login: {new Date(admin.lastLoginAt).toLocaleString()}</p>}
      {RESENDABLE.includes(admin.claimStatus) && (
        <ResendInviteButton householdId={householdId} adminEmail={admin.email} />
      )}
    </section>
  )
}
```

- [ ] **Step 5: Show the member role**

Replace `src/modules/households/components/MembersList.tsx`:

```tsx
import type { HouseholdMember } from '../types'

export function MembersList({ members }: { members: HouseholdMember[] }) {
  return (
    <section aria-label="Members">
      <h2>Members ({members.length})</h2>
      {members.length === 0 ? (
        <p>No members.</p>
      ) : (
        <ul>
          {members.map((member) => (
            <li key={member.id}>
              {member.name} | {member.email} | {member.role === 'ADMIN' ? 'Admin' : 'Member'} |
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 6: Retype `HouseholdInfo`**

In `src/modules/households/components/HouseholdInfo.tsx`, change only the import and prop type —
the body already reads the right field names:

```tsx
import type { HouseholdCore } from '../types'

interface HouseholdInfoProps {
  household: HouseholdCore
  onRefresh?: () => void
}
```

- [ ] **Step 7: Read the nested shape and stop looping on error**

Replace `src/modules/households/pages/HouseholdDetailPage.tsx`:

```tsx
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Breadcrumb } from '@/components/Breadcrumb'
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { useHousehold } from '../api/useHousehold'
import { HouseholdInfo } from '../components/HouseholdInfo'
import { AdminSection } from '../components/AdminSection'
import { MembersList } from '../components/MembersList'

export function HouseholdDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: detail, isPending, isError, error } = useHousehold(id)

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['console', 'households', id] })
  }

  // isPending, not `isLoading || !data`: a 404 leaves data undefined forever,
  // and the old guard rendered a loading state that never resolved.
  if (isPending) {
    return <p role="status">Loading household…</p>
  }

  if (isError || !detail) {
    return (
      <main>
        <Breadcrumb
          items={[
            { label: 'Console', to: '/console' },
            { label: 'Households', to: '/console/households' },
          ]}
        />
        <p role="alert">{getErrorMessage(error)}</p>
      </main>
    )
  }

  return (
    <main>
      <Breadcrumb
        items={[
          { label: 'Console', to: '/console' },
          { label: 'Households', to: '/console/households' },
          { label: detail.household.name },
        ]}
      />
      <HouseholdInfo household={detail.household} onRefresh={handleRefresh} />
      <AdminSection admin={detail.admin} householdId={detail.household.id} />
      <MembersList members={detail.members} />
    </main>
  )
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/modules/households/api/__tests__/useHousehold.test.tsx src/modules/households/pages/__tests__/HouseholdDetailPage.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/modules/households
git commit -m "fix: map the detail payload, tolerate a null admin, stop loading forever on 404"
```

---

### Task 6: The create endpoint

The body is already snake_case and correct. What is missing is the envelope discipline and the
error copy: a `409` and a per-field `400` both currently read "Request failed with status code …".

**Files:**
- Modify: `src/modules/households/api/useCreateHousehold.ts`, `src/modules/households/components/CreateHouseholdForm.tsx`
- Test: `src/modules/households/components/__tests__/CreateHouseholdForm.test.tsx`, `src/modules/households/pages/__tests__/CreateHouseholdPage.test.tsx`

**Interfaces:**
- Consumes: `unwrapEnvelope`, `ApiError` (Task 2); `toCreateHouseholdBody`, `toCreatedHousehold`, `CreatedHouseholdWire` (Task 3).
- Produces: `useCreateHousehold()` whose `data` is `CreatedHousehold`; `CreateHouseholdForm({ onSuccess: (householdId: string) => void })` with camelCase field names.

- [ ] **Step 1: Write the failing tests**

In `src/modules/households/components/__tests__/CreateHouseholdForm.test.tsx`, drop the unused
`user` binding from the first test (one of the 5 standing lint errors) and replace the submit
cases:

```tsx
  it('submits a snake_case body and reports the new household id', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    let submitted: Record<string, unknown> | undefined

    server.use(
      http.post('*/api/v1/console/households', async ({ request }) => {
        submitted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            success: true,
            message: 'Household created',
            data: {
              household_id: 'h-new',
              admin_id: 'a-new',
              admin_email: 'test@example.com',
              invite_sent_at: '2026-08-02T10:00:00.000Z',
            },
          },
          { status: 201 },
        )
      }),
    )

    renderWithProviders(<CreateHouseholdForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText(/Household Name/), 'Test Family')
    await user.type(screen.getByLabelText(/Admin Email/), 'test@example.com')
    await user.type(screen.getByLabelText(/Admin Name/), 'Test Admin')
    await user.click(screen.getByText('Create'))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('h-new'))
    expect(submitted).toEqual({
      household_name: 'Test Family',
      admin_email: 'test@example.com',
      admin_name: 'Test Admin',
    })
  })

  it('shows the backend message when the household name is taken', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    server.use(
      http.post('*/api/v1/console/households', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'Household name already in use',
              status_code: 409,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: '/api/v1/console/households',
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderWithProviders(<CreateHouseholdForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText(/Household Name/), 'Test Family')
    await user.type(screen.getByLabelText(/Admin Email/), 'test@example.com')
    await user.type(screen.getByLabelText(/Admin Name/), 'Test Admin')
    await user.click(screen.getByText('Create'))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Household name already in use'),
    )
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('attaches a per-field validation error to its own input', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    server.use(
      http.post('*/api/v1/console/households', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              status_code: 400,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: '/api/v1/console/households',
              details: [
                {
                  field: 'admin_email',
                  code: 'IS_EMAIL',
                  message: 'admin_email must be an email',
                },
              ],
            },
          },
          { status: 400 },
        ),
      ),
    )

    renderWithProviders(<CreateHouseholdForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText(/Household Name/), 'Test Family')
    await user.type(screen.getByLabelText(/Admin Email/), 'test@example.com')
    await user.type(screen.getByLabelText(/Admin Name/), 'Test Admin')
    await user.click(screen.getByText('Create'))

    await waitFor(() =>
      expect(screen.getByText('admin_email must be an email')).toBeInTheDocument(),
    )
  })
```

Update the "disables button while submitting" handler to the same `201` envelope.

In `src/modules/households/pages/__tests__/CreateHouseholdPage.test.tsx`, delete the unused `vi`
import (the other standing lint error) and replace its handler with the same `201` envelope.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/modules/households/components/__tests__/CreateHouseholdForm.test.tsx src/modules/households/pages/__tests__/CreateHouseholdPage.test.tsx`
Expected: FAIL — `onSuccess` receives `undefined`, and the alert shows axios's status-code text.

- [ ] **Step 3: Rewrite the hook**

Replace `src/modules/households/api/useCreateHousehold.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapEnvelope } from '@/utils/responseHandlers'
import type { CreateHouseholdInput, CreatedHousehold } from '../types'
import { toCreateHouseholdBody, toCreatedHousehold } from './wire'
import type { CreatedHouseholdWire } from './wire'

export function useCreateHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateHouseholdInput): Promise<CreatedHousehold> => {
      const response = await apiClient.post<unknown>(
        '/api/v1/console/households',
        toCreateHouseholdBody(input),
      )
      return toCreatedHousehold(unwrapEnvelope<CreatedHouseholdWire>(response.data))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
    },
  })
}
```

- [ ] **Step 4: Rename the form fields and surface the real errors**

In `src/modules/households/components/CreateHouseholdForm.tsx`, rename each field key everywhere
it appears — `defaultValues`, `watch`, `register`, `errors.*`, `htmlFor`, `id`,
`aria-describedby`, and the error-span ids:

- `household_name` → `householdName`
- `admin_email` → `adminEmail`
- `admin_name` → `adminName`

Add the imports, pull `setError` off the form, map backend field errors onto it, and use
`getErrorMessage`:

```tsx
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { ApiError } from '@/utils/responseHandlers'
```

```tsx
/** The API names fields in snake_case; the form registers them in camelCase. */
const FIELD_FROM_WIRE: Record<string, keyof CreateHouseholdInput> = {
  household_name: 'householdName',
  admin_email: 'adminEmail',
  admin_name: 'adminName',
  notes: 'notes',
}
```

```tsx
  const { register, handleSubmit, formState: { errors }, watch, setError } =
    useForm<CreateHouseholdInput>({
      mode: 'onBlur',
      defaultValues: { householdName: '', adminEmail: '', adminName: '', notes: '' },
    })
```

```tsx
  const onSubmit = (data: CreateHouseholdInput) => {
    mutate(data, {
      onSuccess: (created) => onSuccess(created.householdId),
      onError: (mutationError) => {
        if (!(mutationError instanceof ApiError)) return
        for (const fieldError of mutationError.fieldErrors) {
          const field = FIELD_FROM_WIRE[fieldError.field]
          if (field) setError(field, { type: fieldError.code, message: fieldError.message })
        }
      },
    })
  }
```

```tsx
      {error && (
        <div role="alert" aria-live="polite" style={{ color: 'red' }}>
          {getErrorMessage(error)}
        </div>
      )}
```

Leave the client-side rules and `maxLength` attributes as they are — they already match the DTO's
100 / 254 / 50 / 1000 limits.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/modules/households`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/households
git commit -m "fix: unwrap the create envelope and surface its 409 and per-field 400"
```

---

### Task 7: The delete endpoint

**Files:**
- Modify: `src/modules/households/api/useDeleteHousehold.ts`, `src/modules/households/components/DeleteHouseholdButton.tsx`
- Test: `src/modules/households/api/__tests__/useDeleteHousehold.test.tsx`

**Interfaces:**
- Consumes: `unwrapEnvelope` (Task 2); `toHouseholdDeletion`, `HouseholdDeletionWire` (Task 3).
- Produces: `useDeleteHousehold()` whose `data` is `HouseholdDeletion`, invalidating `['console','households']` and `['console','households', householdId]`.

- [ ] **Step 1: Write the failing tests**

Replace `src/modules/households/api/__tests__/useDeleteHousehold.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { useDeleteHousehold } from '../useDeleteHousehold'

const ID = '3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64'

describe('useDeleteHousehold', () => {
  it('sends the DELETE confirmation and maps the schedule', async () => {
    let body: Record<string, unknown> | undefined

    server.use(
      http.post(`*/api/v1/console/households/${ID}/delete`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          success: true,
          message: 'Household marked for deletion',
          data: {
            household_id: ID,
            status: 'DELETION_PENDING',
            deletion_requested_at: '2026-08-02T10:00:00.000Z',
            scheduled_deletion_date: '2026-09-01T00:00:00.000Z',
          },
        })
      }),
    )

    const { result } = renderHook(() => useDeleteHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(body).toEqual({ confirmation: 'DELETE' })
    expect(result.current.data).toEqual({
      householdId: ID,
      status: 'DELETION_PENDING',
      deletionRequestedAt: '2026-08-02T10:00:00.000Z',
      scheduledDeletionDate: '2026-09-01T00:00:00.000Z',
    })
  })

  it('errors when the household is already pending deletion', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/delete`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'Household is already marked for deletion',
              status_code: 400,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: `/api/v1/console/households/${ID}/delete`,
            },
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useDeleteHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe(
      'Household is already marked for deletion',
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/modules/households/api/__tests__/useDeleteHousehold.test.tsx`
Expected: FAIL — `data.householdId` is undefined.

- [ ] **Step 3: Rewrite the hook**

Replace `src/modules/households/api/useDeleteHousehold.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapEnvelope } from '@/utils/responseHandlers'
import type { HouseholdDeletion } from '../types'
import { toHouseholdDeletion } from './wire'
import type { HouseholdDeletionWire } from './wire'

export function useDeleteHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string): Promise<HouseholdDeletion> => {
      const response = await apiClient.post<unknown>(
        `/api/v1/console/households/${householdId}/delete`,
        { confirmation: 'DELETE' },
      )
      return toHouseholdDeletion(unwrapEnvelope<HouseholdDeletionWire>(response.data))
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
      // Plural — the detail query registers under ['console','households', id].
      queryClient.invalidateQueries({ queryKey: ['console', 'households', data.householdId] })
    },
  })
}
```

- [ ] **Step 4: Show the real error in the dialog**

In `src/modules/households/components/DeleteHouseholdButton.tsx`, add
`import { getErrorMessage } from '@/utils/apiErrorMessages'` and render `{getErrorMessage(error)}`
in the alert.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/modules/households`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/households
git commit -m "fix: map the delete envelope, invalidate the plural key, show real refusals"
```

---

### Task 8: The restore endpoint

**Files:**
- Modify: `src/modules/households/api/useRestoreHousehold.ts`, `src/modules/households/components/RestoreHouseholdButton.tsx`
- Test: `src/modules/households/api/__tests__/useRestoreHousehold.test.tsx`

**Interfaces:**
- Consumes: `unwrapEnvelope` (Task 2); `toHouseholdRestore`, `HouseholdRestoreWire` (Task 3).
- Produces: `useRestoreHousehold()` whose `data` is `HouseholdRestore`, invalidating both keys.

- [ ] **Step 1: Write the failing tests**

Replace `src/modules/households/api/__tests__/useRestoreHousehold.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { useRestoreHousehold } from '../useRestoreHousehold'

const ID = '3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64'

describe('useRestoreHousehold', () => {
  it('restores a household and maps the status', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/restore`, () =>
        HttpResponse.json({
          success: true,
          message: 'Household restored successfully',
          data: { household_id: ID, status: 'ACTIVE' },
        }),
      ),
    )

    const { result } = renderHook(() => useRestoreHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ householdId: ID, status: 'ACTIVE' })
  })

  it('errors when the grace period has expired', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/restore`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'The grace period has expired',
              status_code: 400,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: `/api/v1/console/households/${ID}/restore`,
            },
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useRestoreHousehold(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('The grace period has expired')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/modules/households/api/__tests__/useRestoreHousehold.test.tsx`
Expected: FAIL — `data.householdId` is undefined.

- [ ] **Step 3: Rewrite the hook**

Replace `src/modules/households/api/useRestoreHousehold.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapEnvelope } from '@/utils/responseHandlers'
import type { HouseholdRestore } from '../types'
import { toHouseholdRestore } from './wire'
import type { HouseholdRestoreWire } from './wire'

export function useRestoreHousehold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string): Promise<HouseholdRestore> => {
      // No body — the id in the path is the whole request.
      const response = await apiClient.post<unknown>(
        `/api/v1/console/households/${householdId}/restore`,
      )
      return toHouseholdRestore(unwrapEnvelope<HouseholdRestoreWire>(response.data))
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['console', 'households'] })
      queryClient.invalidateQueries({ queryKey: ['console', 'households', data.householdId] })
    },
  })
}
```

- [ ] **Step 4: Show the real error on the button**

In `src/modules/households/components/RestoreHouseholdButton.tsx`, add
`import { getErrorMessage } from '@/utils/apiErrorMessages'` and render `{getErrorMessage(error)}`
in the alert.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/modules/households`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/households
git commit -m "fix: map the restore envelope and surface its refusals"
```

---

### Task 9: The resend-invite endpoint

Newly shipped. The existing UI has never rendered, because its trigger tested a claim status the
old two-value union could not hold. It also needs to say something useful about the once-a-day
limit, since hitting it is the normal way for an operator to learn it exists.

**Files:**
- Modify: `src/modules/households/api/useResendInvite.ts`, `src/modules/households/components/ResendInviteButton.tsx`
- Test: `src/modules/households/api/__tests__/useResendInvite.test.tsx`

**Interfaces:**
- Consumes: `unwrapEnvelope` (Task 2); `toResendInvite`, `ResendInviteWire` (Task 3); the `RESENDABLE` gate in `AdminSection` (Task 5).
- Produces: `useResendInvite()` whose `data` is `ResendInvite`, invalidating `['console','households', householdId]`.

- [ ] **Step 1: Write the failing tests**

Replace `src/modules/households/api/__tests__/useResendInvite.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { createQueryClientWrapper } from '@/test/test-utils'
import { useResendInvite } from '../useResendInvite'

const ID = '3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64'

describe('useResendInvite', () => {
  it('issues a fresh link and maps the new expiry', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/admin/resend-invite`, () =>
        HttpResponse.json({
          success: true,
          message: 'Invite resent',
          data: {
            admin_email: 'javier@adios.com',
            new_expiry: '2026-08-04T10:00:00.000Z',
          },
        }),
      ),
    )

    const { result } = renderHook(() => useResendInvite(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      adminEmail: 'javier@adios.com',
      newExpiry: '2026-08-04T10:00:00.000Z',
    })
  })

  it('surfaces the once-a-day limit message', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/admin/resend-invite`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'TOO_MANY_REQUESTS',
              message: 'Already resent today. Try again in 19 hours.',
              status_code: 429,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: `/api/v1/console/households/${ID}/admin/resend-invite`,
            },
          },
          { status: 429 },
        ),
      ),
    )

    const { result } = renderHook(() => useResendInvite(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe(
      'Already resent today. Try again in 19 hours.',
    )
  })

  it('errors when the admin has already claimed the household', async () => {
    server.use(
      http.post(`*/api/v1/console/households/${ID}/admin/resend-invite`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATE',
              message: 'The admin has already claimed this household',
              status_code: 400,
              timestamp: '2026-08-02T10:00:00.000Z',
              path: `/api/v1/console/households/${ID}/admin/resend-invite`,
            },
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useResendInvite(), {
      wrapper: createQueryClientWrapper(),
    })

    result.current.mutate(ID)

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/modules/households/api/__tests__/useResendInvite.test.tsx`
Expected: FAIL — `data.adminEmail` is undefined.

- [ ] **Step 3: Rewrite the hook**

Replace `src/modules/households/api/useResendInvite.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { unwrapEnvelope } from '@/utils/responseHandlers'
import type { ResendInvite } from '../types'
import { toResendInvite } from './wire'
import type { ResendInviteWire } from './wire'

export function useResendInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (householdId: string): Promise<ResendInvite> => {
      const response = await apiClient.post<unknown>(
        `/api/v1/console/households/${householdId}/admin/resend-invite`,
      )
      return toResendInvite(unwrapEnvelope<ResendInviteWire>(response.data))
    },
    onSuccess: (_data, householdId) => {
      // Plural — a fresh invite changes the admin's claim status and expiry.
      queryClient.invalidateQueries({ queryKey: ['console', 'households', householdId] })
    },
  })
}
```

- [ ] **Step 4: Report the outcome, including the limit**

Replace `src/modules/households/components/ResendInviteButton.tsx`:

```tsx
import { getErrorMessage } from '@/utils/apiErrorMessages'
import { useResendInvite } from '../api/useResendInvite'

interface ResendInviteButtonProps {
  householdId: string
  adminEmail: string
}

export function ResendInviteButton({ householdId, adminEmail }: ResendInviteButtonProps) {
  const { mutate, isPending, error, data } = useResendInvite()

  return (
    <>
      <button onClick={() => mutate(householdId)} disabled={isPending}>
        {isPending ? 'Sending...' : 'Resend Invite'}
      </button>
      {error && (
        <div role="alert" style={{ color: 'red' }}>
          {getErrorMessage(error)}
        </div>
      )}
      {data && (
        <div role="status" style={{ color: 'green' }}>
          Invite resent to {adminEmail}. The new link expires{' '}
          {new Date(data.newExpiry).toLocaleString()}.
        </div>
      )}
    </>
  )
}
```

One resend per household per day is a backend rule with no client-side counter, so the button
stays enabled and the `429` message — which names the wait — is what tells the operator.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/modules/households`
Expected: PASS.

- [ ] **Step 6: Run the full gate — the build should be green again**

Run: `npm run build && npm run lint && npx vitest run`
Expected: **clean build** (the first since Task 3); lint at 3 errors; all tests passing. If the
build is still red, fix the remaining errors here rather than deferring.

- [ ] **Step 7: Commit**

```bash
git add src/modules/households
git commit -m "feat: wire up the newly shipped resend-invite endpoint"
```

---

### Task 10: Verify against the live backend, then update the record

**Files:**
- Modify: `CLAUDE.md`, `docs/FRONTEND.md`, `notes/BE/prd-console-be.md`

- [ ] **Step 1: Prove the casing invariant holds**

```bash
grep -rnE "[a-z]+_[a-z]+" src/modules/households --include='*.ts' --include='*.tsx' \
  | grep -v "api/wire.ts" \
  | grep -vE "__tests__|\.test\." \
  || echo "clean"
```

Expected: `clean`, or only hits that are plainly not wire field names. Anything that *is* an API
field outside `api/wire.ts` breaks the invariant — move it into a mapper. Test files legitimately
name wire fields in their fixtures, hence the exclusion.

- [ ] **Step 2: Exercise the real backend by hand**

Start `npm run dev`, sign in as an operator via a real magic link, then walk the console: list,
sort by each column, search, paginate, open a detail page, create a household, resend its invite,
resend again to see the `429`, delete it, restore it. Watch the network tab and confirm each
request is snake_case and each response is `{ success, data }` — with `meta.pagination` on the
list.

If any response disagrees with `docs/console-households-api-contract.md`, **stop**: re-read
`/docs-json`, fix the contract document, the mapper in `wire.ts`, and the affected fixtures. Note
the discrepancy in the commit message. Do not compensate for it in a component.

- [ ] **Step 3: Correct `CLAUDE.md`**

- "Five things that bite" item 1 (the query-key singular/plural bug) is **fixed** — replace it
  with: "**Households speak snake_case and return `{ success, data }`, with the list's counts
  under `meta.pagination` and its `data` a bare array.**
  `src/modules/households/api/wire.ts` is the only file that names a wire field; components are
  camelCase. See `docs/console-households-api-contract.md`."
- Add to the same list: "**The dashboard calls an endpoint that does not exist.** `useMetrics`
  requests `/api/v1/console/dashboard/metrics`, absent from the live API document."
- Under "Documents", add `docs/console-households-api-contract.md`.
- Under "Things older docs got wrong", note that the API's casing flipped from camelCase to
  snake_case on 2026-08-22, so any camelCase wire example predates it.

- [ ] **Step 4: Correct `docs/FRONTEND.md`**

- §11: delete the query-key singular/plural defect and the resend-invite defect — both resolved.
  Record that `unwrapBackendResponse` still serves auth and metrics while households use the
  strict `unwrapEnvelope` / `unwrapPaginated`, and that unifying them is open work. Add the
  missing dashboard-metrics endpoint as a known defect.
- §11.4: the lint count is now **3 errors** (`ToastProvider` fast-refresh, `ToastProvider.test`
  unused `vi`, `test-utils` `any`).
- Replace any restatement of the households request/response shapes with a pointer to
  `docs/console-households-api-contract.md`, and document the `wire.ts` boundary and its rule.
- Note the two unused affordances: the `status` and `limit` query params.
- Update the test counts to whatever `npx vitest run` reports.

- [ ] **Step 5: Mark the stale PRD**

Add at the very top of `notes/BE/prd-console-be.md`:

```markdown
> **Superseded for the households endpoints.** This document predates the build and describes a
> flat `{ success, households }` body. The verified contract is
> `docs/console-households-api-contract.md`, read from the backend's own OpenAPI document.
```

- [ ] **Step 6: Run the full gate one last time**

Run: `npm run build && npm run lint && npx vitest run`
Expected: clean build; lint at 3 errors; every test passing. Record the final counts in the
commit message.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md docs/FRONTEND.md notes/BE/prd-console-be.md
git commit -m "docs: record the snake_case households contract and the wire boundary"
```

---

## Notes for the reviewer

- **Nothing here is optimistic.** Every mutation stays invalidate-on-success — no `onMutate`, no
  snapshot, no rollback.
- **`unwrapBackendResponse` survives on purpose.** Auth and metrics depend on its loose
  fallbacks; converting them is separate work.
- **The grace-period helpers are untouched.** `graceRemaining` takes a nullable ISO string, and
  both `deletionScheduledFor` and `scheduledDeletionDate` still carry one.
- **`limit` is never sent**, so the API's default of 50 governs page size. Changing it is a
  product decision, not a contract fix.
- **Tasks 3–8 leave the build red on purpose.** The wire boundary lands first and the endpoints
  are repaired one at a time; the build goes green again at the end of Task 9. Each task's own
  tests pass at each step.
- **Why a mapping layer rather than snake_case in components:** the wire casing changed twice in
  two days. Confining it to `wire.ts` made the third change a one-file edit, and kept every
  component and its tests out of the blast radius.
