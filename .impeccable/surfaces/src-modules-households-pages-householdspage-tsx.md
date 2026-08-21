---
version: 1
slug: "src-modules-households-pages-householdspage-tsx"
primary_target: "src/modules/households/pages/HouseholdsPage.tsx"
related_targets: ["src/modules/auth/pages/ConsoleSigninPage.tsx","src/modules/dashboard/pages/ConsoleDashboardPage.tsx","src/components/ConsoleLayout.tsx"]
---

# Console visual redesign — anchor surfaces

**Scope:** `/console/signin`, `/console` (dashboard), `/console/households`. Visitor mode: **Operate**.
Second pass, inheriting this world unchanged: `/console/auth/signin/:token`, `/console/households/new`, `/console/households/:id`, plus modals and toasts.

## 1. Job and audience

Nostos internal operators at a desk, desktop browser, a support ticket open in another tab. Sessions are short errands, not dwell time. See PRODUCT.md for the audience record; the design consequence is that every screen is entered with one specific errand already in mind and left immediately afterward.

Two errands govern the anchor set: **register a new household**, and **resolve a ticket** on an existing one (invite expired, delete this household, undo that deletion).

## 2. Outcome and proof

Success is that an operator completes the errand and can tell, without asking a colleague, what state the household is in and what they just did to it. The console is inherited by people who did not build it, so legibility to a stranger outranks efficiency for an expert.

What the design has to work with, and must not exceed: a verified API contract, exact user-facing copy already specified in PRD §3.1, seven dashboard metrics with a refresh timestamp and **no historical series**, and zero production data. There is nothing to trend and no one to quote.

## 3. Selected direction — The Register

Visual authority: a **public deed registry**. A household is a registered title; a deletion is a **caveat entered against it** with a statutory maturity date; a restore **withdraws** the caveat. A register's defining property is the product's own mechanic: it never erases, it rules through and endorses.

Seed key `da764555`, direction round two, assigned. The full direction contract gets written into the artifact at build time; this brief records the strategy, not the contract.

**Structural thesis — the page is ruled, not composed.** Engraved hairline rules define every region. No cards, no rounded corners, no status pills, and no shadow in the page's own structure. A toast is the one exception and is not structure: it floats over the folio and carries an offset-plus-blur cast shadow, which is what earns it separation from the paper.

**The marginal column is architecture.** A permanent column on every record-bearing screen carries dated endorsements against the entry, and stays blank when there is nothing to endorse — a register notes exceptions, so a clear margin is itself a reading.

What it can carry today is bounded by the API, and the brief must not promise more than that: the list endpoint returns `deletion_scheduled_for` but no audit feed and no actor, so the margin shows the caveat's dated facts (requested, deletes, grace remaining or ended) and the requested date is *derived* by subtracting the 30-day grace from the scheduled date. A true endorsement history — every act, its time, and the operator who performed it — needs a backend audit endpoint that does not exist yet. Until it does, no surface may imply one, and no operator name may be shown against an act.

**Focal moment — entering and withdrawing a caveat.** A caveated household is ruled through in vermilion and stays completely legible *in place* in the register; it is never filtered out of the list. Restoring lifts the rule, and the entry returns to a clear margin — the withdrawal itself leaves no mark, because there is no audit feed to record one against. Marking a withdrawal is the first thing to build when that endpoint exists; until then the brief must not claim both directions are recorded.

Five disciplines the direction carries, each donated by a challenger it beat:

- **One measured division grid** — nothing is placed by eye; every element lands on a ruled division that means something.
- **Hierarchy by scale and rule alone** — a status is a mark made *on* the entry, never a badge floating beside it.
- **Each state is a named distinct condition**, not a shade of one. The donor discipline also asked for a *visible leader* tying an endorsement to its entry; that was declined for this build. What ships instead is real binding rather than mere adjacency — the endorsement and its entry share one tinted row band, and the row's first cell carries a vermilion inset rule down its edge. Draw the leader only if a future surface separates an endorsement from the row it concerns.
- **The waiting period is a standing obligation, not a warning** — a caveated entry carries its maturity clock in view at all times.
- **Duration drawn to scale** — grace remaining is a mark whose *length* is the real time left, hatched so it survives grayscale and colour blindness.

**State is a mark, not a hue.** Rule-through, hatch (remaining), vermilion hatch (ended), struck stamp, bracket. Colour confirms; it is never the sole carrier. Every hue on screen carries exactly one published meaning, and the surface prints its own notation key so a newcomer can read it untaught.

**Identity without a headline.** The identity is the full-strength blue-gray head band and the folio heads set as registry stamps in tracked caps. A blind-embossed dry seal was specified for *attested* and then removed: the list endpoint returns no claim status, so nothing on these surfaces is legitimately attested, and shipping the device with nowhere to live would have been decoration. It returns with the household detail page, which has `claimStatus`. There is no display serif anywhere on the surface — that omission is what keeps a bone-and-vermilion palette out of the cream-plus-serif look every model defaults to.

**Motion is stamping and ruling:** discrete, damped, single-axis. A rule draws along its own axis, a stamp lands once without bounce, nothing cross-fades. `prefers-reduced-motion` snaps to the end state.

### Per-surface application

- **`/console/signin` — the counter.** You present an email and are served a notice. A registry stamp head, one ruled field, the no-access escalation as a printed footnote. Rate limiting reads as a recorded fact ("attempts recorded this hour"), not only as a red toast.
- **`/console` — the returns.** The seven metrics as a registry statistics return in ruled columns with tabular figures, the refresh time as a date stamp. Not tiles, and explicitly no trend arrows: there is no historical data, and inventing a delta would be fabricating.
- **`/console/households` — the open folio.** Marginal endorsement column at the left; ruled entry columns carrying entry number, proprietor, admin, member count, date opened; caveated entries ruled through with maturity drawn to scale; the search field is the index of proprietors; pagination is a folio range.

## 4. Boundaries and anti-goals

**Must stay green:** the existing test suite. It queries by role, label and text.

**Copy and information architecture are open** — they were deliberately left off the untouched list — but with one condition that follows from the line above: a copy change ships with its test update in the same commit. Changing a string and rewriting an assertion to match a *chosen* new wording is fine; loosening assertions to accommodate new markup is not.

**Preserved from PRODUCT.md, not reopened here:** the state and data architecture (TanStack Query ownership, URL search params for filters, React Hook Form, no global store, existing query keys and hooks). This is a view-layer redesign.

**The metaphor lives in the marks, never in the labels.** Operators read "deletion pending", "grace period", "household", "member" — the vocabulary PRODUCT.md fixes. Nothing in the UI calls a household a title or a deletion a caveat. A registry that renames the operator's world has failed.

**Anti-goals:** the sidebar-plus-metric-tiles SaaS shell; dark-mode terminal ops chrome; rounded cards with soft shadows; status pills; skeleton shimmer as the loading idiom; any trend indicator on a metric with no history; decorative colour of any kind.

## 5. States and ranges

- **Households:** 0 on day one — the empty register is the first screen anyone sees, and it is a designed state, not a fallback. Typical 100–400, growing; upper bound unstated. Page size comes from the API's `limit`.
- **Members:** 1–12 typical per household; the detail view must not assume a short list.
- **Text extremes:** household name to 100 chars, email to 254. Long emails are the layout's real stress test, not the placeholder ones.
- **Statuses:** `ACTIVE` / `DELETION_PENDING`; admin claim `PENDING_INVITE` / `CLAIMED` with expiry and resend cooldown.
- **Material states:** loading, empty, single-item, error, network failure, 429 rate-limited, session expired mid-errand, and a caveat whose grace period has already lapsed (restore no longer possible).

## 6. Interaction and layout

Desktop-first at a desk; mobile is not a commitment, and the layout may assume width and a pointer. It must still degrade honestly rather than break.

Reading order on the register is left-to-right along one entry: endorsement, identity, admin, count, date, state. Scanning happens down the entry-number and state columns, so those columns are the ones that get the strongest rule and the tabular figures.

Feedback is a recorded fact before it is a notification: an action's result appears as an endorsement on the record, and the toast is the transient echo of it. An operator who misses the toast can still see what happened.

Keyboard operability is protected on its own merits — these are keyboard-heavy desk users. Every action reachable by pointer is reachable by key, and focus is visible as a bracket, in the notation's own vocabulary.

## 7. Constraints and open decisions

**Binding:** cookie auth with `withCredentials`, the verified response envelope, the six existing routes, Vitest + Testing Library + MSW, the fixed domain vocabulary.

**Deliberately left to the build:** exact type faces (character is specified — a workhorse text face for records, tracked caps for labels, tabular figures throughout, and no display serif), final colour values, and whether long emails truncate or wrap.

**A builder must not invent:** a permission model (all operators are equal), a Settings page, metrics drill-down, trend or delta data, or any household, operator, or volume figure. Accessibility has no established standard — keyboard operability and the open items in `docs/FRONTEND.md` §13 are the working floor, and no compliance claim may be made.

**Deferred by design:** DESIGN.md is written at finish, from the built world, not now.
