---
version: 1
slug: "src-modules-households-pages-householdspage-tsx"
primary_target: "src/modules/households/pages/HouseholdsPage.tsx"
related_targets: ["src/modules/households/pages/HouseholdDetailPage.tsx","src/modules/households/pages/CreateHouseholdPage.tsx","src/modules/households/components/HouseholdTable.tsx","src/components/Dialog.tsx","src/components/Header.tsx"]
---

# Households — the register and its dialogs

**Supersedes the previous brief on this slug entirely.** That brief specified "The Register" — a
public-deed-registry world in bone paper and vermilion, with caveats ruled through entries and a
marginal endorsement column. PRODUCT.md records that direction as seen, built, and **rejected** by
the operator in favour of the category standard at a Linear/Vercel craft bar. It should never have
survived on disk after that decision. Do not reinstate any of it.

**Scope:** `/console/households` and its two nested dialog routes. Visitor mode: **Operate**.
Executed 2026-08-23.

## 1. Job and audience

Nostos operators, on desktop at a desk **and on a phone** — mobile became a commitment with this
pass. Two errands: register a new household, and resolve a ticket on an existing one (invite
expired, delete it, undo that deletion). Sessions are short and arrive with the errand decided.

## 2. Outcome and proof

An operator finds the right household among 200+, learns its state without leaving the list, acts
on it, and never loses their place. The previous build failed all four: you had to know a
household's exact name to find it, sortable columns were claimed but never wired, the state fact
was a horizontal swipe away on a phone, and acting meant a full page navigation away and back.

Material available and not to be exceeded: the verified snake_case contract, `status` ∈
`ACTIVE | DELETION_PENDING`, admin `claimStatus` ∈ `CLAIMED | PENDING_INVITE | INVITE_EXPIRED |
DELETED | NO_INVITE`, a 30-day grace with `deletionScheduledFor`. **No audit feed and no actor**,
so no surface may imply one and no operator name may be shown against an act.

## 3. Direction as built

Inherits DESIGN.md's world unchanged — white cards on light neutral, borders first and shadow
second, navy as the only accent, small radii, status colour that means one thing. Three structural
moves:

- **The list is the home and it never leaves.** Detail and create are nested routes rendering into
  the register's `<Outlet />` as overlays. URLs unchanged, so ticket deep links still work.
- **One responsive dialog, two presentations.** Centred modal ≥768px, bottom sheet with a grab
  handle below. One Radix component, one breakpoint, no second code path.
- **The toolbar earns its keep at 200+.** Sort wired onto the columns for the first time, a status
  filter, a selectable page size (`limit`), numbered pagination, and `Showing 1–50 of 214`.

**Focal moment:** a deletion-pending household stays in place in the register, never filtered out,
carrying its maturity date. A *running* grace period is amber; a **lapsed** one is red, because
that is the other condition entirely — the deletion can no longer be undone from here.

## 4. Boundaries

**Not reopened:** the navy top bar's and loading treatment's appearance (rebuilt in Tailwind at
identical measurements — a migration, not a redesign), TanStack Query ownership, URL search params,
React Hook Form, no global store, existing query keys.

**Anti-goals, all held:** infinite scroll, virtualization, a sidebar shell, dark mode, skeleton
shimmer, trend arrows on metrics with no history, a fourth elevation, a second typeface, any radius
above 8px, decorative colour.

## 5. What this pass did not do

- **Signin and the dashboard have no designed mobile layout.** They were migrated to Tailwind at
  their desktop appearance and made to degrade honestly. Designing them is open work.
- **No screen-reader testing.** Radix closed the focus trap, Escape, focus restoration and
  background-inert gaps, and `aria-sort` is now on the sortable columns, but nothing has been
  driven with a screen reader. That is a list of mechanisms present, not a compliance claim.
- **`radix-ui` was added for Dialog and AlertDialog only.** DropdownMenu and Tooltip were scoped
  and then not needed — a native `<select>` beat a drawn listbox for the filters, especially on a
  phone, and truncated emails carry a `title`.
