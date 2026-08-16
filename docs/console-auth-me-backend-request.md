# Backend Request: Console Session Check (`GET /console/auth/me`)

**From:** Console frontend
**Date:** 2026-08-17
**Status:** Awaiting backend review — frontend implementation is blocked on this
**Related:** `docs/console-auth-api-contract.md`, `docs/prd/prd-auth-console-be.md`

---

## Why we're asking

Right now, an operator who signs in via magic link lands on the dashboard
correctly — then gets kicked to `/console/signin` the moment they refresh the
page, even though their session row and `connect.sid` cookie are both still
valid.

The cause is entirely frontend: we track "is signed in" as in-memory React
state, which resets on every page load. On refresh we redirect to signin
*before making any request*, so the valid session is never consulted.

The fix is for the frontend to stop guessing and ask the server on every page
load. There is currently no endpoint that answers "is this cookie a valid
session, and whose?" — the console auth API has only `signin`,
`signin/:token`, and `logout`. This document requests that endpoint.

We need **one endpoint** and **one extra cookie**. Both are small.

---

## Ask 1 — `GET /api/v1/console/auth/me`

Cookie-authenticated, no request body, no query params.

Behaves like every other authenticated console endpoint: `OperatorGuard`
applies, and a request without a valid session gets the standard 401.

**200 — valid session:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "operator@nostos.com",
    "role": "OPERATOR"
  }
}
```

**401 — no session, expired session, or inactive operator:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Not authenticated",
    "statusCode": 401,
    "timestamp": "...",
    "path": "/api/v1/console/auth/me"
  }
}
```

The three fields come straight from the existing session payload
(`prd-auth-console-be.md:88`), so this should be close to a passthrough of
`request.session`. We want the operator's identity rather than a bare
`{ ok: true }` because the console header and logout UI need it — this way
one request bootstraps the whole session, instead of a liveness ping plus a
second call for the same data.

**Must not redirect.** JSON on every path, including errors — same as the
other three routes. (This bit us before: see the "Why this doc exists"
section of `console-auth-api-contract.md`, where a 302 on
`signin/:token` produced a CORS failure because axios followed it.)

**Call frequency:** once per page load, per tab. It is not polled. Every
other API call continues to rely on the cookie alone, and a mid-session 401
from any endpoint is what tells us the session died.

---

## Ask 2 — A readable companion cookie

On the same response that establishes a session (`GET /console/auth/signin/:token`),
alongside the existing `connect.sid`:

```
Set-Cookie: nostos_console_recent_signin=true; Max-Age=2592000; Path=/; SameSite=Lax; Secure
```

And cleared on `POST /console/auth/logout`, alongside `connect.sid`.

| Attribute | Value | Why |
|---|---|---|
| `HttpOnly` | **absent** | The whole point is that frontend JS can read it. It holds no secret. |
| `Max-Age` | 30 days | Deliberately longer than the 7-day session — see below. |
| `Path`, `SameSite`, `Secure` | Match `connect.sid` | Consistency; no reason to differ. |
| Value | `true` | Never parsed. We check presence only. The literal `true` is so it's self-explanatory in DevTools. |

### What it's for

It is not an auth mechanism and grants nothing. `connect.sid` remains the only
thing that authenticates a request. This cookie answers one question during the
~100ms before `/me` responds: *was this browser signed in recently?*

- **Present** → we paint the dashboard immediately instead of a loading
  splash, so refreshing an active session has no visible flicker.
- **Absent** → we show a brief splash, and if `/me` comes back 401 we redirect
  silently, because nothing was lost.

If someone forges it, the only effect is that *their own* browser paints a
dashboard shell that `/me` 401s out of a moment later. No data is fetched
without a valid `connect.sid`.

### Why 30 days and not 7

If the hint expired exactly with the session, an operator returning after their
session lapsed would arrive with no hint — indistinguishable from someone who
never signed in — and we'd bounce them to signin with no explanation. To tell
someone their session expired, the app has to still know they had one. The
30-day ceiling stops that belief from persisting indefinitely.

### Why we're asking you to set it rather than doing it ourselves

We could write this cookie (or a `localStorage` flag) from the frontend, and
that needs zero backend work. We're asking you instead because it removes a
class of bug: if the frontend maintains its own mirror of "a session exists,"
then login, logout, and expiry each become a chance for the two to disagree.
Set server-side, it's written and cleared atomically with the session itself,
on the same response, whether or not our JS ran.

**If this is inconvenient, say so and we'll do it frontend-side.** Ask 1 is the
blocker; Ask 2 is an improvement we'd like but can work around.

---

## Questions we need answered

**Blocking:**

1. **Cookie domain.** In production, what host serves the API versus the
   console UI? If the API is on `api.nostos.com` and the console on
   `console.nostos.com`, a cookie set without an explicit `Domain` will be
   scoped to the API host and **the console's JavaScript cannot read it** —
   it would need `Domain=.nostos.com`. Is setting a parent-domain cookie
   acceptable in your environment? If not, we'll set the hint frontend-side
   and drop Ask 2 entirely. (This doesn't affect `connect.sid`, which is
   HttpOnly and sent automatically regardless.)

**Non-blocking — tell us what you decide and we'll match:**

2. **Should `/me` run `ActivityRefreshGuard`?** Our instinct is yes: it's
   applied to all authenticated endpoints today (`prd-auth-console-be.md:579`),
   and a page load is genuine operator activity. The consequence is that
   opening the console refreshes the 7-day window. We're flagging it only
   because we don't want to silently change session lifetime semantics — your
   call, we just need to know which it is.

3. **Cookie name.** `nostos_console_recent_signin` is our suggestion, not a
   requirement. Any name works; we just need the final one.

4. **Extra fields on `/me`.** `id`, `email`, and `role` cover what we need
   today. If there's something else the console will want (operator name,
   last login, permissions), easier to include now than to add later.

---

## How we'll verify

```bash
# 1. No session → 401, JSON, no redirect
curl -i http://localhost:3000/api/v1/console/auth/me

# 2. Sign in, capturing cookies
curl -i -c cookies.txt "http://localhost:3000/api/v1/console/auth/signin/<token>"
#    Expect: Set-Cookie for BOTH connect.sid and nostos_console_recent_signin
#    Expect: the hint cookie has NO HttpOnly flag

# 3. Valid session → 200 with operator identity
curl -i -b cookies.txt http://localhost:3000/api/v1/console/auth/me

# 4. Logout clears both cookies
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/v1/console/auth/logout
curl -i -b cookies.txt http://localhost:3000/api/v1/console/auth/me
#    Expect: 401
```

---

## Not being asked for

To be explicit about scope — none of the following is part of this request:

- Any change to `POST /console/auth/signin`, or to token generation,
  expiry, or single-use semantics.
- Any change to how `connect.sid` itself is configured.
- A refresh-token or session-extension endpoint.
- Server-side rendering, redirects, or any change to `logout`'s response
  shape.

---

## One stale doc to note

`prd-auth-console-be.md:82-85` still documents `GET /console/auth/signin/:token`
as returning a `302` redirect to `/console/dashboard`. That was changed to a
JSON response (recorded in `console-auth-api-contract.md`), and the deployed
behavior matches the JSON version — the frontend depends on it. Worth
correcting in the PRD when someone's next in that file, so nobody implements
against the old shape.
