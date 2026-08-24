# Console Households API Contract (for frontend integration)

**Last updated:** 2026-08-22
**Source:** the backend's own OpenAPI document, `GET {API_URL}/docs-json`, cross-checked against
`notes/Postman/nostos-api.postman_collection.json` (regenerated 2026-08-22 14:50 from the same
document). The two agree exactly.
**Base URL:** `{API_URL}/api/v1/console/households`

`notes/BE/prd-console-be.md` predates the build and describes a flat `{ success, households }`
body. This file wins. If they ever disagree again, re-read `/docs-json` — that is the only
authority.

> **This API has changed three times in two days.** Casing flipped from camelCase to snake_case,
> the list response moved its counts into `meta.pagination`, and resend-invite shipped. Any
> camelCase wire example you find in this repo's history predates 2026-08-22.

## Envelopes

Success:

```json
{ "success": true, "data": "<T>", "message": "optional, only on routes that declare one" }
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Household not found",
    "status_code": 404,
    "timestamp": "2026-01-31T09:15:00.000Z",
    "path": "/api/v1/console/households"
  }
}
```

**Payloads are snake_case** — `household_name`, `member_count`, `claim_status`, `total_pages`,
`status_code`. The envelope keys are not: `success`, `data`, `meta`, `message`, `error`.

**Branch on `error.code`, never on `status_code`.** Several codes share one HTTP status, so the
status alone cannot tell `CONFLICT` from `INVALID_STATE`. The codes:

`VALIDATION_ERROR`, `INVALID_TYPE`, `INVALID_SOURCE`, `INVALID_USER`, `FUTURE_DATE`,
`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVALID_STATE`, `HOUSEHOLD_MISMATCH`,
`INTERNAL_SERVER_ERROR`, `UNPROCESSABLE_ENTITY`, `TOO_MANY_REQUESTS`, `SERVICE_UNAVAILABLE`.

On a `400` from the validation pipe, `error.details` carries **one entry per failed constraint**:

```json
"details": [
  { "field": "admin_email", "code": "IS_EMAIL", "message": "admin_email must be an email" }
]
```

`code` there is the class-validator constraint, upper-snaked — branch on it rather than on the
message copy. `details` is present in every environment for a validation failure, since it
describes the caller's own input. Other statuses carry diagnostic detail there outside production
only.

Auth is the Postgres-backed session cookie `household.sid`. Send every request with
`withCredentials: true`. There is **no `x-household-id` header** — an early Swagger build declared
one as required on all five routes and the backend has since dropped it.

---

## POST /households

Create a household, its ADMIN member, and email a claim link.

**Request:**

```json
{
  "household_name": "Adios Family",
  "admin_email": "javier@adios.com",
  "admin_name": "Javier",
  "notes": "Early adopter, VIP tier"
}
```

| Field | Required | Limits |
|---|---|---|
| `household_name` | yes | 1–100 chars |
| `admin_email` | yes | ≤254 chars, email format |
| `admin_name` | yes | 1–50 chars |
| `notes` | no | ≤1000 chars |

**Response `201`:**

```json
{
  "success": true,
  "message": "Household created",
  "data": {
    "household_id": "3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64",
    "admin_id": "7c2e9a10-5d64-4f8b-b1a3-90e4c7d21f58",
    "admin_email": "javier@adios.com",
    "invite_sent_at": "2026-01-31T09:15:00.000Z"
  }
}
```

`invite_sent_at` is `null` when the claim email failed to send. **The household is created either
way** — treat a null as "created, invite not sent", never as a failure.

**Errors** — `400 VALIDATION_ERROR` (per-field messages in `error.details`) · `401` Not
authenticated · `409 CONFLICT` Household name already in use (case-insensitive) · `429` Too many
requests.

---

## GET /households

Every operator sees every household. Paginated; `search` matches household name or admin email.

**Query parameters:**

| Name | Default | Notes |
|---|---|---|
| `page` | `1` | min 1 |
| `limit` | `50` | 1–100 |
| `search` | — | household name or admin email |
| `sort_by` | `created_at` | `created_at` \| `name` \| `admin_name` \| `admin_email` \| `member_count` |
| `sort_order` | `DESC` | `ASC` \| `DESC` |
| `status` | — | `ACTIVE` \| `DELETION_PENDING`; omit for both |

**Response `200`** — note that **`data` is a bare array**, and the counts live in
`meta.pagination`:

```json
{
  "success": true,
  "data": [
    {
      "id": "3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64",
      "name": "Adios Family",
      "status": "ACTIVE",
      "created_at": "2026-01-31T09:15:00.000Z",
      "deletion_scheduled_for": null,
      "admin_name": "Javier",
      "admin_email": "javier@adios.com",
      "member_count": 4
    }
  ],
  "meta": {
    "pagination": { "page": 1, "limit": 50, "total": 137, "total_pages": 3 }
  }
}
```

- `admin_name` and `admin_email` are **null** when the household has no ADMIN member.
- `deletion_scheduled_for` is set only while `status` is `DELETION_PENDING`.
- `member_count` counts members of every role, admin included.
- `pagination.total` is rows matching the filters across all pages.

**Errors** — `400 VALIDATION_ERROR` · `401` · `429`.

---

## GET /households/:id

`id` must be a UUID.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "household": {
      "id": "3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64",
      "name": "Adios Family",
      "status": "ACTIVE",
      "created_at": "2026-01-31T09:15:00.000Z",
      "deletion_requested_at": null,
      "scheduled_deletion_date": null
    },
    "admin": {
      "id": "7c2e9a10-5d64-4f8b-b1a3-90e4c7d21f58",
      "name": "Javier",
      "email": "javier@adios.com",
      "claim_status": "PENDING_INVITE",
      "invite_sent_at": "2026-01-31T09:15:00.000Z",
      "invite_expires_at": "2026-02-02T09:15:00.000Z",
      "claimed_at": null,
      "last_login_at": null
    },
    "members": [
      {
        "id": "9a1b7c4e-8b2d-4a19-9c33-2e5f7a0b1d64",
        "name": "Sofia",
        "email": "sofia@adios.com",
        "role": "MEMBER",
        "joined_at": "2026-02-01T09:15:00.000Z",
        "last_login_at": null
      }
    ]
  }
}
```

- **`admin` is nullable** — null when the household has no ADMIN member.
- `claim_status` is derived, not stored, and has five values:

  | Value | Meaning |
  |---|---|
  | `CLAIMED` | the invite has been used |
  | `PENDING_INVITE` | an invite is live |
  | `INVITE_EXPIRED` | the invite lapsed unused |
  | `DELETED` | the admin row is gone |
  | `NO_INVITE` | no invite was ever issued |

- `scheduled_deletion_date` is midnight UTC at the end of the 30-day grace period.
- `members` includes the admin, and every member carries `role`.

**Errors** — `400` The id is not a UUID · `401` · `404 NOT_FOUND` Household not found · `429`.

---

## POST /households/:id/delete

Starts the 30-day grace period, ending at midnight UTC. Requires the exact confirmation string.

**Request:** `{ "confirmation": "DELETE" }`

**Response `200`:**

```json
{
  "success": true,
  "message": "Household marked for deletion",
  "data": {
    "household_id": "3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64",
    "status": "DELETION_PENDING",
    "deletion_requested_at": "2026-01-31T09:15:00.000Z",
    "scheduled_deletion_date": "2026-03-02T00:00:00.000Z"
  }
}
```

Both dates are non-null here; `scheduled_deletion_date` is midnight UTC, 30 days after the request.

**Errors** — `400` Missing or wrong confirmation, a non-UUID id, or the household is already
marked for deletion · `401` · `404` · `429`.

---

## POST /households/:id/restore

Clears a pending deletion. Refused once the grace period has expired.

**Request:** no body required. (The Postman collection sends `{}`; either is accepted.)

**Response `200`:**

```json
{
  "success": true,
  "message": "Household restored successfully",
  "data": {
    "household_id": "3f1a7c4e-8b2d-4a19-9c33-2e5f7a0b1d64",
    "status": "ACTIVE"
  }
}
```

**Errors** — `400` A non-UUID id, the household is not marked for deletion, or the grace period
has expired · `401` · `404` · `429`.

---

## POST /households/:id/admin/resend-invite

Issues a fresh 48-hour claim link and invalidates any unused one.

**Limited to one resend per household per day**, counted from the audit trail. There is no
client-visible counter, so the `429` is how an operator finds out — and its message names the
wait.

**Request:** no body.

**Response `200`:**

```json
{
  "success": true,
  "message": "Invite resent",
  "data": {
    "admin_email": "javier@adios.com",
    "new_expiry": "2026-01-31T09:15:00.000Z"
  }
}
```

`new_expiry` is when the newly issued claim link expires, 48 hours out.

**Errors** — `400` The admin has already claimed this household · `401` · `404` No such
household, or it has no admin · `429` Already resent within the last 24 hours (the message names
the wait), or the global request throttle.

---

## Frontend notes

- The console maps this snake_case wire onto camelCase domain types in
  `src/modules/households/api/wire.ts`. That file is the only one in the module allowed to name a
  snake_case field; every component and page above it is camelCase. When the wire changes again,
  it is the one file that moves.
- `limit` **is** sent as of 2026-08-23: the console offers 25 / 50 / 100 through a per-page
  control, and 50 (the API's own default) is what a URL without `?limit=` still means.
- `status` is sent when the register is filtered to one status, and omitted — not sent empty — to
  mean both.
- The `status` query parameter is available but no UI exposes it yet.
- Unwrapping is strict: `unwrapEnvelope` / `unwrapPaginated` in `src/utils/responseHandlers.ts`
  throw an `ApiError` carrying `error.code` rather than guessing at a missing `data`, so a shape
  change surfaces as an error instead of a blank page.
