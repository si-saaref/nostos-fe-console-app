# Console Auth API Contract (for frontend integration)

**Last updated:** 2026-08-04
**Base URL:** `{API_URL}/api/v1/console/auth` (e.g. `http://localhost:3000/api/v1/console/auth`)

All responses use the standard envelope:
- Success: `{ "success": true, "data": <T>, "message"?: string }`
- Error: `{ "success": false, "error": { "code", "message", "status_code", "timestamp", "path", "details"? } }`

> **Corrected 2026-08-22:** this field is `status_code`, not `statusCode`. The API moved its
> payloads to snake_case; verified against a live `401` from `GET /console/auth/me`.

All three endpoints below are called via `fetch`/`axios` with `credentials: 'include'` /
`withCredentials: true` — none of them are meant to be reached by a top-level browser
navigation, so none of them redirect.

---

## POST /console/auth/signin

Request a magic signin link for an operator email.

**Request body:**
```json
{ "email": "operator@nostos.com" }
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "email": "operator@nostos.com" },
  "message": "Check your email for a signin link"
}
```

**Response `401`** — email not authorized (does not reveal whether the account exists):
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Email not authorized to access console", ... } }
```

**Response `429`** — more than 5 attempts for that email in the last hour:
```json
{ "success": false, "error": { "code": "TOO_MANY_REQUESTS", "message": "Too many signin attempts. Try again in 1 hour.", ... } }
```

The emailed link points at the **frontend**: `{FRONTEND_URL}/console/auth/signin/{token}`.

---

## GET /console/auth/signin/:token

Consume the token from the magic link, establish the session, and return the operator's
email. Call this from whatever page the magic link's frontend route renders — **do not**
expect or follow a redirect; this always returns JSON (or a JSON error) and sets the session
cookie on the same response.

**Response `200`:**
```json
{
  "success": true,
  "data": { "email": "operator@nostos.com" },
  "message": "Signed in successfully"
}
```
A `Set-Cookie` header on this same response establishes the session — after a `200`, the
client is authenticated and can navigate to the dashboard itself (client-side route change,
no further request needed).

**Response `404`** — token unknown, already used, or expired (all three map to the same
generic message so the client can't distinguish them):
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Link invalid or expired", ... } }
```

Tokens are single-use and expire 15 minutes after the signin request.

---

## POST /console/auth/logout

Requires an authenticated session (cookie).

**Response `200`:**
```json
{ "success": true, "data": {}, "message": "Logged out successfully" }
```

**Response `401`** — no valid session:
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "...", ... } }
```

Clears the session cookie on success.

---

## Why this doc exists

The `GET /console/auth/signin/:token` endpoint originally issued an HTTP 302 redirect to
`{FRONTEND_URL}/console/dashboard`, on the assumption the magic link would be opened as a
plain browser navigation straight to the backend. In practice the link points at the
**frontend**, and the frontend's own callback route calls this endpoint via XHR — so the
redirect was followed by `axios` instead of the browser, landing on the SPA's own origin,
which has no CORS headers and isn't JSON anyway. That combination is what produced the
`No 'Access-Control-Allow-Origin' header is present` error. The endpoint was changed to
return JSON like every other route in this API, matching what the frontend's
`useSigninCallback` hook and its tests already expected.
