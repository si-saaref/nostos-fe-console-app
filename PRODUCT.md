# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Nostos internal operators. Today that is a couple of ops/support people plus the
team that built it; the console is written on the assumption that a real
customer-success team inherits it, so an operator with no domain context and no
knowledge of the codebase must be able to act correctly.

They work in a desktop browser at a desk — laptop or external monitor, pointer
and full keyboard available. **Mobile became a commitment on 2026-08-23**, at
the operator's request: desktop is still where the work happens, but the console
has to be genuinely usable on a phone, not merely unbroken. That commitment is
delivered for the households surfaces (list, detail, create, confirmations) and
for the top bar; signin and the dashboard were migrated at their desktop
appearance and degrade honestly, and designing their mobile layout is open work.

Sessions are short and errand-shaped, in two flavors:

- **Proactive:** onboard a new household, which creates it and emails an invite
  to its household admin.
- **Reactive, ticket-driven:** a household reports a problem — an invite
  expired, a household should be deleted, a deletion should be undone — and the
  operator resolves it in one or two screens.

The people the operator serves — household admins and members — never see this
console.

## Product Purpose

The Operator Console is the sanctioned way for Nostos staff to create and repair
households without touching the database. It covers operator signin, read-only
service metrics, household search and inspection, household creation, reversible
household deletion, and re-sending an admin invite.

Stage: pre-launch, private-beta tooling. Success is that the team can create and
fix households entirely through this UI. Breadth of features is not the goal;
the built surface is roughly the intended surface, and correctness, clarity, and
reversibility matter more than new capability.

## Positioning

Internal tool — no market position to defend. Two mechanisms are load-bearing
and should not be traded away:

- **Destruction is reversible by default.** Deleting a household is a soft
  delete with a 30-day grace period, a stated deletion date, and a restore path
  while the grace period holds.
- **Access is allowlisted and passwordless.** Only pre-authorized operator
  emails can sign in, and they do it with a magic link. There is no password and
  no token for the UI to hold, so there is nothing here for an operator to leak.

## Operating Context

**Signin.** Operator enters their email at `/console/signin`. The backend emails
a magic link pointing at the frontend (`{FRONTEND_URL}/console/auth/signin/{token}`),
which the app consumes at `/console/auth/signin/:token` to establish a session
cookie. Signin requests are rate-limited to 5 per email per hour. An email
outside the allowlist gets the same non-revealing 401 as an unknown address.

**Session.** Cookie-based, `withCredentials: true`. A separate non-HttpOnly hint
cookie (`nostos_console_recent_signin`) is readable from JS and drives session
rehydration on page load, so a returning operator is not flashed the signin page
before `GET /console/auth/me` resolves. The session cookie is 7 days; the hint
cookie is intended to outlive it (30 days) so natural expiry can explain itself
instead of redirecting silently.

**Backend.** `{API_URL}/api/v1/console/...`, standard response envelope
(`{ success, data, message? }` / `{ success, error: { code, message, statusCode, ... } }`).
Verified against the running service on 2026-08-17. Contract of record:
`docs/console-auth-api-contract.md`.

**Household lifecycle the console operates on.** Created (admin invited) →
admin claims the invite (invites expire in 48 hours; resend is rate-limited to
roughly once per 24 hours) → active with members → deletion pending (30-day
grace, restorable) → deleted.

**Metrics.** Read-only, auto-refreshing every 5 minutes, with a
last-updated timestamp. No drill-down.

## Capabilities and Constraints

**Shipped routes.** `/console/signin`, `/console/auth/signin/:token`,
`/console` (dashboard), `/console/households`, `/console/households/new`,
`/console/households/:id`. Everything under `/console` is behind a session
guard.

**Shipped capabilities.** Magic-link signin and callback; sign-out with
confirmation; dashboard metrics grid; household list with debounced search,
**sortable columns, a status filter and a selectable page size**, and numbered
pagination; household detail and create, both as **dialogs over the list rather
than separate pages**; soft delete with confirmation; restore with confirmation;
resend admin invite; toast feedback for success and every specified error.

Sortable columns were listed as shipped for months and were not: the sort writer
existed in `useHouseholdFilters` and no component called it. It is wired as of
2026-08-23.

**Terminology (fixed).** household, operator (staff using this console),
household admin (the invited member who owns a household), member, invite /
claim, deletion pending, grace period.

**Technical constraints future work must preserve.**

- Auth is cookie-based. Never put a token in `localStorage`.
- TanStack Query is the only owner of server state; query results are not copied
  into other state.
- Filter, sort, and pagination state lives in URL search params.
- Forms use React Hook Form. There is deliberately no global client-state store.
- Dialogs are Radix primitives (`radix-ui`, Dialog and AlertDialog only). They
  provide the focus trap, Escape, focus restoration and scroll lock; do not
  hand-roll those again.
- Styling is Tailwind v4 utilities over `src/styles/tokens.css`. There are two
  stylesheets in the repo and there should not be a third.
- Query keys follow `[domain, resource, filters]`, and household-scoped keys
  carry the household id explicitly.
- Vitest + Testing Library + MSW is the installed test stack; the shipped
  surface has tests, and they are expected to stay green.

**Explicitly undecided — do not invent an answer.**

- The session envelope returns an operator `role`, but every operator can do
  everything. There is no permission model and no permission-gated UI today.
- A "Settings" item appears in an old PRD wireframe. It does not exist and no
  scope was ever defined for it.
- Metrics drill-down was deferred; there are no detail views behind the numbers.
- Production cookie domain is still open (localhost-verified only).
- Whether an unknown URL should 404, redirect, or land on the dashboard. A design
  exists (`docs/superpowers/specs/2026-08-14-unknown-route-auth-guard-design.md`)
  and was never built; today such a URL renders a blank page.

## Brand Commitments

- **The name is binding:** Nostos Operator Console. The domain vocabulary above
  is binding with it.
- **The visual standard is the category standard.** After seeing a distinctive
  concept direction built out, the operator rejected it and chose the
  conventional admin console, with **Linear and Vercel as the craft bar**. This
  is a standing brand commitment, not a one-off: future surfaces execute the
  familiar pattern at that level of finish, without irony or smuggled quirk.
  Two elements were explicitly kept from the earlier build and should not be
  redesigned without asking: the **navy top bar** and the **loading treatment**.
- **The burger is the top bar's mobile answer.** Below 768px the nav, operator
  email and sign-out move into a panel behind a burger on the same navy field.
  The operator chose this over letting the bar wrap. The bar's desktop
  appearance is unchanged and still must not be redesigned without asking.
- **Everything else visual is open.** There is no Nostos brand for this console to
  match. The PRD's original `#007AFF / #F2F2F7` scaffolding palette is gone; what
  ships now is a navy-and-neutral system recorded in `DESIGN.md` and
  `src/styles/tokens.css`. That system is a considered result, not a commitment —
  future design work may replace it outright, provided the two kept elements above
  survive and contrast is re-measured.
- `support@nostos.com` is shipped as the no-access contact on the signin page.
  Keep the escalation path, but its deliverability was never confirmed here —
  verify before launch rather than assuming or silently swapping it.

## Evidence on Hand

- **The shipped state of the code:** `docs/FRONTEND.md` is the authoritative
  technical record and wins over every spec below where they disagree.
- **Source specs:** `notes/FE/prd-auth-console-fe.md` for flows, copy, and field
  rules; `notes/FE/prd-auth-console-be.md` as a backend contract reference;
  `notes/FE/FE-Architecture.md` for the state-ownership model. All three predate
  the build and carry banners listing what they get wrong.
- **The verified API contract:** `docs/console-auth-api-contract.md`.
- **Exact user-facing copy already specified** for all documented error and
  success states (PRD §3.1). Reuse it rather than rewriting it.
- **A live backend** verified 2026-08-17 for the auth routes, and an MSW-backed
  test suite covering the shipped surface.
- **Absences future work must not fabricate:** no production data, no real
  household or operator names beyond the PRD's illustrative "Adios Family /
  Javier" examples, no customers, testimonials, benchmarks, uptime numbers, or
  pricing. No real imagery — `src/assets/hero.png` is an unreferenced leftover
  from the scaffold.

## Product Principles

1. **Reversible, and visibly so.** Destructive actions state what will happen,
   when, and how to undo it. An operator should never have to guess whether they
   just did something permanent.
2. **The console is the sanctioned path.** If an operator has to open the
   database to finish a job, that is a product gap, not an operator problem.
3. **Design for the operator who inherits it.** The correct action must be
   obvious to someone without the domain context or the commit history.
4. **Server truth, no shadow copies.** The API is the source of truth; the UI
   reflects it rather than maintaining a parallel version of it.
5. **Errands, not dashboards to live in.** Optimize for arriving with a specific
   task and leaving, not for dwell time.

## Accessibility & Inclusion

No standard has been established and no specific user need has been identified —
recorded as undecided rather than claimed. Factually: operators are
keyboard-heavy desk users, so keyboard operability is worth protecting on its
own merits, and `docs/FRONTEND.md` §13 lists the real unmet items: no focus trap
in any dialog, Escape-to-close only on the logout modal, no focus restoration
after a dialog closes, no `aria-sort` on sortable columns, and no screen-reader
testing. Treat that list as a to-do, not as a compliance claim.

Four of those five items are now closed, as a byproduct of moving dialogs onto
Radix on 2026-08-23: there is a focus trap, Escape closes every dialog, focus is
restored to whatever opened it, and the background is inert while one is open.
`aria-sort` is now on the register's sortable columns. **No screen-reader testing
has been done**, so this remains a list of mechanisms present, not a compliance
claim.

One thing that *was* verified: colour contrast. Every text pair in the shipped
palette clears WCAG AA, measured 2026-08-20. An earlier audit guessed the danger
colour would fail; it does not (6.28:1). Re-measure after any token change.
