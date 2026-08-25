---
name: Nostos Operator Console
description: The conventional admin console executed properly — white cards on light neutral, 1px borders, a navy top bar as the only brand accent, and status that always means one thing.
colors:
  bg: "#f6f7f9"
  surface: "#ffffff"
  surface-2: "#f9fafb"
  border: "#e5e7eb"
  border-strong: "#d3d8de"
  text: "#111827"
  text-2: "#4b5563"
  text-3: "#6b7280"
  navy: "#2b3d4e"
  navy-hover: "#22313f"
  focus: "#3b82f6"
  success: "#047857"
  danger: "#b42318"
  warning: "#b45309"
  info: "#1d4ed8"
typography:
  page-title:
    fontFamily: "Libre Franklin, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.011em"
  section:
    fontFamily: "Libre Franklin, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.011em"
  card-title:
    fontFamily: "Libre Franklin, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.011em"
  body:
    fontFamily: "Libre Franklin, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Libre Franklin, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "Libre Franklin, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  micro:
    fontFamily: "Libre Franklin, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.12em"
    textTransform: "uppercase"
---

# Design System: Nostos Operator Console

## Overview

**The conventional operator console, executed properly.** It refuses metaphor, ornament and
invention: an operator who has used any admin tool should need nothing explained. Familiarity
is the commitment, not a retreat. The craft bar is Linear and Vercel.

This direction was chosen deliberately. A distinctive concept — "The Register", a ruled ledger
in bone paper and vermilion — was built out and **rejected** by the operator in favour of the
category standard. Do not reintroduce it. Two elements were explicitly kept from that build and
should not be redesigned without asking: **the navy top bar** and **the loading treatment**.

The old class vocabulary (`.registry-head`, `.validating-sheet`, `.households-table`) is **gone**.
Those names were legacy labels for conventional components, not a surviving metaphor, and the
Tailwind migration on 2026-08-23 removed them along with the stylesheets that held them.

**Source of truth is the code**, and there are now only two stylesheets:

1. `src/styles/tokens.css` — the palette, type scale, spacing, elevation and motion, as raw
   values on `:root`. Every design value in the system is defined here exactly once.
2. `src/index.css` — three jobs and nothing else: it exposes those tokens to Tailwind through
   `@theme inline`, themes the browser surfaces we did not draw (caret, selection, scrollbar,
   focus ring, placeholder), and keeps the short list of globals that are styled **by tag or
   ARIA role** rather than by class.

Everything else is Tailwind utilities in the component that needs them, with the shared faces
(`Button`, `Field`, `Card`, `Badge`, `Dialog`, `Notice`) built as React components under
`src/components/`. There are no page-level or component-level `.css` files, and new ones should
not appear: if a value is missing, add a token.

Light only. `color-scheme: light` is declared and there is no dark palette.

### Tokens to Tailwind

`@theme inline` means a utility compiles to `var(--surface)` rather than copying the value, so
`tokens.css` stays the single definition. The names differ where the raw token name would have
produced an unreadable utility (`text-text-2`) or collided with a Tailwind namespace:

| Token in `tokens.css` | Tailwind name | Example utility |
|---|---|---|
| `--bg` | `canvas` | `bg-canvas` |
| `--surface`, `--surface-2` | `surface`, `surface-2` | `bg-surface-2` |
| `--border`, `--border-strong`, `--border-hover` | `line`, `line-strong`, `line-hover` | `border-line` |
| `--text`, `--text-2`, `--text-3`, `--text-inverse` | `ink`, `ink-2`, `ink-3`, `ink-inverse` | `text-ink-2` |
| `--navy`, `--navy-hover`, `--on-navy-*` | same | `bg-navy`, `text-on-navy-muted` |
| `--success-border` etc. | `success-line`, `danger-line`, `warning-line`, `info-line` | `border-warning-line` |
| `--t-xs … --t-3xl` | `text-xs … text-3xl` (plus `text-md` = 14px) | `text-sm` = 13px |
| `--r-sm`, `--r`, `--r-lg` | `radius-sm`, `radius-md`, `radius-lg` | `rounded-lg` |
| `--shadow-sm`, `--shadow`, `--shadow-lg` | `shadow-rest`, `shadow-float`, `shadow-overlay` | `shadow-rest` |

Two things to know about that table. **The type scale is not Tailwind's** — `text-sm` is 13px
and `text-base`/`text-md` are 14px, because the console's ramp is 12/13/14/16/20/24/30. And the
elevations are deliberately **not** called `shadow-sm`/`shadow-lg`: those names already exist in
`tokens.css`, and aliasing a variable to itself recurses. `rest`/`float`/`overlay` are the three
levels this system has anyway.

Spacing needs no mapping: Tailwind's default 4px base already *is* the console's scale, so `p-5`
is `--s5` (20px) and `gap-2` is `--s2` (8px).

---

## Colors

### Surfaces

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f6f7f9` | The page. Nothing content-bearing sits directly on it. |
| `--surface` | `#ffffff` | Cards, dialogs, inputs, toasts. |
| `--surface-2` | `#f9fafb` | Table heads, row hover, card footers, inset wells, disabled fields. |
| `--border` | `#e5e7eb` | The default 1px rule between everything. |
| `--border-strong` | `#d3d8de` | Interactive edges — inputs and buttons at rest. |
| `--border-hover` | `#b9c0c9` | Those same edges on hover. |
| `--overlay` | `rgba(17, 24, 39, 0.5)` | Behind dialogs. |

### Text

`--text` `#111827` · `--text-2` `#4b5563` (secondary, captions) · `--text-3` `#6b7280`
(hints, disabled) · `--text-inverse` `#f8fafc` (on navy and danger fills).

### Brand

**`--navy` `#2b3d4e` is the only brand accent**, and it is spent almost entirely on the top
bar. It also fills the primary button and drives the loading sweep. `--navy-hover` `#22313f`.
`--focus` `#3b82f6` with a `rgba(59,130,246,0.18)` ring.

### Status

Each status is a **pair plus a border**, and each means exactly one thing:

| Status | Foreground | Background | Border | Means |
|---|---|---|---|---|
| success | `#047857` | `#ecfdf5` | `#a7f3d0` | Active, claimed, done |
| warning | `#b45309` | `#fffbeb` | `#fde68a` | Pending invite, awaiting action |
| danger | `#b42318` | `#fef2f2` | `#fecaca` | Deletion pending, destructive, failed |
| info | `#1d4ed8` | `#eff6ff` | `#bfdbfe` | Neutral notice |

### Measured contrast

All text pairs clear WCAG AA (4.5:1), measured 2026-08-20:

| Pair | Ratio |
|---|---|
| `--text` on `--surface` | 17.74 |
| `--text` on `--bg` | 16.55 |
| `--text-inverse` on `--navy` | 10.67 |
| `--text-2` on `--surface` | 7.56 |
| `--danger` on `--surface` | 6.57 |
| `--text-inverse` on `--danger` | 6.28 |
| `--info` on `--info-bg` | 6.16 |
| `--danger` on `--danger-bg` | 6.01 |
| `--success` on `--success-bg` | 5.21 |
| `--text-3` on `--surface` | 4.83 |
| `--warning` on `--warning-bg` | 4.84 |
| `--text-3` on `--surface-2` | 4.63 ← tightest |
| `--focus` on `--surface` (non-text, needs 3:1) | 3.68 |

`--text-3` on `--surface-2` is the tightest pair at 4.63:1. Darkening `--surface-2` or
lightening `--text-3` breaks AA. Re-measure after any token edit.

### Named Rules

- **Nothing content-bearing floats on `--bg`.** It goes in a card.
- **Navy is the top bar and the primary button.** Do not spread it into surfaces, headings, or
  decoration; its scarcity is what makes it read as brand.
- **A status colour never appears without its pair.** Foreground on its own background, with
  its own border. A bare red word is not a status.
- **One meaning per colour.** Red is destructive-or-failed, never merely emphatic.

---

## Typography

**Libre Franklin**, self-hosted as two subset woff2 files (latin, latin-ext) with
`font-display: swap` and explicit `unicode-range`. Falls back to the system UI stack.
One family for everything — there is no second face.

### Hierarchy

| Role | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| Page title (`h1`) | 24px | 600 | 1.25 | -0.011em |
| Section (`h2`) | 20px | 600 | 1.3 | -0.011em |
| Card title (`h3`) | 16px | 600 | 1.4 | -0.011em |
| Body / input / button | 14px | 400 / 500 | 1.5 | normal |
| Label, caption, `small` | 13px | 500 / 400 | 1.5 | normal |
| Table head, badge | 12px | 600 / 500 | 1.4 | normal |
| Nav link, wordmark | 12–13px | 600 | 1.4 | 0.12–0.16em, uppercase |

Scale tokens: `--t-xs` 12 · `--t-sm` 13 · `--t-md` 14 · `--t-lg` 16 · `--t-xl` 20 ·
`--t-2xl` 24 · `--t-3xl` 30.

### Named Rules

- **Headings tighten, body does not.** Every heading carries `-0.011em`; body stays at normal.
- **Uppercase plus wide tracking is reserved for the top bar** — the wordmark and nav links.
  It is a chrome treatment. It must not appear in page content.
- **Prose wraps at `70ch`.** `p` carries `max-width: 70ch` globally.
- **Weight carries hierarchy, size confirms it.** 600 for anything structural, 500 for labels
  and controls, 400 for prose. There is no 700.

---

## Layout

- **Page:** `main` is `max-width: 1280px`, centred, `32px 24px 48px`. Below 768px it becomes
  `24px 16px 40px`.
- **Top bar:** full-bleed navy, inner content constrained to the same 1280px measure so the
  wordmark aligns with the page title beneath it.
- **Spacing scale, 4px base:** `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 20 ·
  `--s6` 24 · `--s8` 32 · `--s10` 40 · `--s12` 48.
- **Card internals:** header `16px 20px`, body `20px`, footer `12px 20px`. Below 768px the
  horizontal padding drops to 16px.
- **One breakpoint: 768px**, and it is now Tailwind's `md:` — so the rules read
  mobile-first (bare utility below 768, `md:` at and above) rather than as a `max-width` override.
  There is no tablet tier. The dashboard's metric grid carries one extra ad-hoc
  `min-[1100px]:` step, which is where four metric cards stop fitting; it is a local fix, not a
  system tier, and was inherited unchanged from the stylesheet it replaced.
- **Mobile is a commitment as of 2026-08-23**, for the households surfaces. Desktop is still
  where the work happens, but a phone has to be usable, not merely unbroken. Signin, the
  dashboard and the top bar were migrated at their desktop appearance and made to degrade
  honestly; only the top bar got a real mobile answer (a burger).

### Named Rules

- **Everything shares the 1280px measure.** Top bar inner, page, and footers align to one edge.
- **Spacing comes from the scale.** No arbitrary pixel values in new CSS.
- **The register is a table on a pointer and a list of cards on a phone.** This reverses the
  previous rule, which said tables never reflow. That rule existed only because mobile was not a
  commitment: five columns on a 390px screen means swiping sideways to find out whether a
  household is being deleted, which is the one fact the errand is about. Above 768px it is a real
  `<table>` with sortable headers; below, each row becomes a tappable card with name and status on
  the first line.
- **One presentation at a time, never both.** The table and the card list are switched by
  `useIsDesktop()`, not by `md:hidden`. Rendering both and hiding one would put every household in
  the DOM twice — two of every name for a screen reader, and two of every row for anything
  querying the page.
- **Rows scroll inside the card, not down the page.** The table body is capped at
  `calc(100svh - 320px)` with a 360px floor, which is what makes the sticky header work at all
  *and* keeps the toolbar and the pagination in view at 200+ households. Beware: a wrapper with
  `overflow-x: auto` computes `overflow-y: auto` too, so an uncapped wrapper becomes a scroll
  container the header sticks to and never scrolls — the header silently never sticks.

---

## Elevation & Depth

Depth is carried by **borders first, shadow second**. Every surface has a real 1px border; the
shadow only lifts it off the page.

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` → `shadow-rest` | `0 1px 2px rgba(16,24,40,.06)` | Cards, inputs, buttons at rest |
| `--shadow` → `shadow-float` | `0 1px 3px rgba(16,24,40,.1), 0 1px 2px rgba(16,24,40,.06)` | The loading sheet |
| `--shadow-lg` → `shadow-overlay` | `0 12px 24px -8px rgba(16,24,40,.18), 0 4px 8px -4px rgba(16,24,40,.08)` | Dialogs, sheets, toasts |

Z-index is a short, explicit ladder: dialogs `40`, toasts `60`. Nothing else stacks.

### Named Rules

- **Shadow never replaces a border.** A shadowed element without a border reads as a mistake.
- **Every shadow is offset plus blur, tinted `rgba(16,24,40,…)`.** No pure-black, no spread-only,
  no glow.
- **Only three elevations exist.** Resting, floating, overlay. A fourth means the hierarchy is
  wrong.

---

## Shapes

`--r-sm` 4px · `--r` 6px (buttons, inputs) · `--r-lg` 8px (cards, dialogs, toasts) ·
`--r-full` 999px (badges, pagination pills, the loading rule).

### Named Rules

- **Small radii, consistently.** 6px for controls, 8px for containers. Nothing above 8px except
  fully-round pills.
- **Fully round means "status or progress", never "button".** A pill-shaped button would read as
  a badge.
- **The bottom sheet uses 8px on its top corners only** — `rounded-t-lg`. A larger radius was
  considered and rejected: the grab handle is what signals "sheet", so there was no reason to
  introduce a fourth radius for it.

---

## Motion

`--fast` `120ms cubic-bezier(.4,0,.2,1)` for state changes — hover, border, colour.
`--base` `200ms cubic-bezier(.16,1,.3,1)` for entrances.

Five animations exist, all defined in `src/index.css` and reached through `animate-*`:

| Animation | What it does |
|---|---|
| `toast-in` | 8px rise plus fade, 200ms |
| `rule-sweep` | the loading bar, 1100ms ease-in-out alternating |
| `overlay-in` | the dialog scrim fades, 200ms |
| `modal-in` | the centred modal rises 6px and scales from .985, 200ms |
| `sheet-in` | the bottom sheet translates up from off-screen, 260ms |

Each has a matching `-out` that is the same keyframes played `reverse` at roughly half the
duration, bound to Radix's `data-[state=closed]`.

### Named Rules

- **Transition properties, never `all`.** Every rule names what it animates.
- **Motion confirms, it never entertains.** Nothing moves that the operator did not cause,
  except the loading sweep.
- **A keyframe on a centred element must never set the centring translate.** Tailwind v4 emits
  `-translate-x-1/2 -translate-y-1/2` as the standalone `translate` property, not as `transform`.
  The two **compose**. A `transform: translate(-50%, -50%)` in a keyframe therefore does not
  replace the centring, it doubles it, and the panel lands a full width up and to the left of
  centre. `modal-in` carries the entrance offset in `transform` and nothing else. This cost real
  debugging; do not "fix" it back.
- **The resting state is the CSS default, never a fill-mode artefact.** Every `-in` animation
  ends at `transform: none`, so an animation that has not run yet (a backgrounded tab produces no
  frames and freezes the clock at time 0) leaves the element only a few pixels out rather than
  somewhere arbitrary.

---

## Components

Every one of these is a React component under `src/components/` (or, for the register's own
parts, `src/modules/households/components/`). Import the component; do not re-derive its
utilities inline.

### Top bar (`Header`) — signature, kept by request

Navy field, white uppercase wordmark tracked at `0.16em`, uppercase nav links at `0.12em` with
a 2px underline on the active tab, operator email and sign-out pushed right. The email
truncates with an ellipsis and carries a `title`. **Do not redesign without asking** — the
Tailwind rebuild reproduces the same measurements and is not a redesign.

Below 768px none of that fits, so **the nav, the email and sign-out move into a panel behind a
burger**, added 2026-08-23 at the operator's request. The panel stays on the navy field, so the
bar reads as one object that grew rather than a second surface dropping over the page. It closes
on navigation, and Escape closes it and returns focus to the burger. Open/closed state is derived
from the pathname the menu was opened on — not a boolean plus an effect — so a menu can never
survive a navigation.

### Loading treatment (`LoadingSheet`) — signature, kept by request

A centred 400px white sheet on `--bg` carrying a status line and a 4px round rule, inside which
a navy segment at 38% width sweeps back and forth. Used for the full-page session splash
(`SessionSplash`) and the magic-link token exchange. **Do not redesign without asking.**

### Card

`Card` / `CardHeader` / `CardBody` / `CardFooter`. Surface, 1px line, `rounded-lg`,
`shadow-rest`, `overflow-hidden`. Header is title left, action right, bottom rule; footer is
`surface-2` with a top rule. Cards are never nested.

### Dialog — the responsive one

`Dialog` is **one component with two presentations**, built on Radix `Dialog`:

- **≥768px:** a centred modal, `top/left: 50%` plus a -50% translate, `max-h: min(85svh, 720px)`,
  `rounded-lg`. Widths by `size`: `sm` 440px, `md` 480px (create), `lg` 560px (detail).
- **<768px:** a bottom sheet — `inset-x-0 bottom-0`, `max-h: 88svh`, `rounded-t-lg`, with a
  36×4 grab handle. A centred box on a phone wastes the safe area and puts the primary action
  mid-screen, away from the thumb that has to press it.

Structure is header (title, optional description, optional `titleAside` badge, close button) /
scrolling body / pinned footer. The footer clears the home indicator with
`pb-[max(0.75rem,env(safe-area-inset-bottom))]`. `busy` blocks Escape and click-outside while a
mutation is in flight.

`ConfirmDialog` is the same presentation on `role="alertdialog"`: two answers, no close
affordance, `tone="danger"` for destruction. Used for delete, restore and sign-out.

**Radix owns what is easy to get wrong and invisible when you do:** the focus trap, Escape,
focus restoration to whatever opened it, scroll lock, and marking the rest of the page inert.
Do not hand-roll a dialog — the previous hand-rolled ones had Escape on one of three and a
focus trap on none.

### Detail and create are dialogs on the register, not pages

`/households/:id` and `/households/new` are **nested routes** under
`/households`, rendering into its `<Outlet />`. The register stays mounted behind them,
so opening a household costs the operator neither their scroll position, their search, nor their
page; Escape and Back both close. The URLs are unchanged, so a link out of a support ticket still
addresses one household. Closing navigates back to the register **carrying the current search
params**, which is what preserves the filters.

### Table (the register, ≥768px)

Lives inside a card, in a height-capped scroll area (see Layout). Head is `surface-2` with 12px
600 `ink-2` labels and is `sticky top-0`. Cells are 16px/20px with a bottom rule; rows hover to
`surface-2`. Sortable columns are buttons inside `<th>` carrying **`aria-sort`**; the direction
arrow renders **only on the sorted column**, so the one arrow on screen always means something.
Counts and dates are `tabular-nums`.

### Card row (the register, <768px)

Name and status badge on the first line, admin email on the second, and a third line that is
either `N members · created <date>` or — when a deletion is pending — the grace phrase in its
status colour. Everything the table shows stays on screen; nothing is behind a swipe.

### Toolbar

Search (300ms debounce), a status `<select>`, and a per-page `<select>` pushed right. It sits in
the card header above the rows and does not need to be sticky, because the rows scroll inside the
card rather than under it.

### Buttons

`Button`, 36px tall, `rounded-md`, 14px/500, `shadow-rest`, 8px icon gap. `size="sm"` is 32px and
`size="icon"` is 32×32. `buttonClasses()` in `buttonStyles.ts` puts the same face on a router
`Link`.

- **Default:** white on `line-strong`, hovering to `surface-2`.
- **Primary:** navy fill, white text. **Explicit, never inferred** — the old stylesheet styled
  every `button[type="submit"]` navy, which meant a form's secondary action had to fight the
  selector to look secondary.
- **Danger:** `danger` fill, white text.
- **Ghost:** transparent, no shadow, `ink-2`, hovering to a `surface-2` fill.
- **Disabled:** `surface-2` fill, `ink-3`, no shadow, `not-allowed`.

Hover states use the **`not-disabled:` variant, not `enabled:`** — `:enabled` matches only form
elements, so an `enabled:hover:` class on a `Link` silently never fires.

### Inputs

`Input`, `Select` and `Field` in `Field.tsx`. Full width, 9px/12px padding, `rounded-md`,
`line-strong`, `shadow-rest`. Focus swaps the border to `focus` and adds a 3px ring.
`aria-invalid="true"` or an `-error` `aria-describedby` turns the border and ring red —
**validation state is driven by the ARIA attribute, not a class**, so the accessible state and
the visual state cannot drift apart. `Field` owns the label, the required asterisk, and the
hint-or-error slot below the control.

`Select` is a **native `<select>` on purpose**: keyboard-operable for free, and on a phone it
opens the OS picker, which beats any listbox we could draw. The chevron is ours because
`appearance: none` removes the platform one.

### Badge

`Badge`. Round pill, 12px/500, with a 6px `currentColor` dot. Four tones map to the status
triples: `neutral` (success green), `warning`, `danger`, `info`. The dot is `currentColor`, so a
badge cannot end up green-on-amber.

### Pagination

`Pagination`. Numbered, with prev/next chevrons, the current page as a navy pill, and an ellipsis
where numbers were skipped. The window is pinned to a constant width so the control does not
jitter as the operator walks through pages. Prev/next alone was not enough at 200+ households:
page 4 was a four-click journey with no sense of where it ended.

### Toast

Bottom-right stack, `z-60` — **above** the dialog layer, because an operator who just acted
inside a modal has to see the result. Each toast is a `shadow-overlay` card tinted with its
status triple and an icon in the status foreground, entering with `toast-in`. Success, error and
info must never be mistaken for each other; that is the whole job of the tint.

### Notice

`Notice`. A standing statement about the page or the record, where a toast is what disappears.
Tinted panel, status icon, `role="status"` or `role="alert"`. Used for the sample-metrics
disclaimer and for the deletion-pending statement on a household.

### Inline messages

`[role="alert"]` is 13px `danger`. `[role="status"]` is 13px `ink-2`. Both are styled globally by
role in `index.css` — **give the element the right role and it is styled.** Utilities still win
over these, because Tailwind's utilities layer comes after base.

### Empty state

Centred, `48px 24px`, `ink-2` prose. Says what is absent and what to do about it — and when a
*filter* is what emptied the register, it says so and offers a Clear filters button, rather than
implying there are no households.

---

## Do's and Don'ts

### Do

- Put content in a card, on `--bg`, aligned to the 1280px measure.
- Reach for an existing component (`Button`, `Field`, `Card`, `Badge`, `Dialog`, `Notice`) before
  writing utilities. If the face you need does not exist, add a variant to the component rather
  than a one-off class list at the call site.
- Take every value from a Tailwind token name that maps back to `tokens.css`. An arbitrary value
  like `text-[15px]` means the ramp is being ignored — the design hook will say so.
- Use the ARIA attribute as the styling hook for state (`aria-invalid`, `role="alert"`,
  `role="status"`). It keeps the visual and the accessible state in sync by construction.
- Pair every status colour with its background and border.
- Take spacing, radius, type and motion from the tokens.
- Re-measure contrast after touching a colour token.

### Don't

- Don't reintroduce the rejected Register direction — bone paper, vermilion, engraved hairlines,
  ledger metaphor. It was seen, built, and turned down.
- Don't redesign the navy top bar or the loading treatment without asking.
- Don't spread navy into surfaces or headings.
- Don't use a status colour for emphasis.
- Don't add a fourth elevation, a second typeface, or a radius above 8px.
- Don't animate `all`, and don't move anything the operator did not cause.
- Don't add a tablet breakpoint; 768px is the system, and the dashboard's `min-[1100px]:` metric
  step is a local fix, not licence for more tiers.
- Don't add a `.css` file. Two stylesheets exist and both are listed in the Overview; a third is
  how the last system fragmented into seven.
- Don't set the centring translate inside a keyframe (see Motion). It doubles, it does not
  replace.
- Don't hand-roll a dialog, a focus trap, or Escape handling. Use `Dialog` / `ConfirmDialog`.
- Don't render both the table and the card list and hide one — pick with `useIsDesktop()`.
- Don't reach for `enabled:` for a hover state; use `not-disabled:`, which also matches anchors.
