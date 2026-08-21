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

Some class names still carry the old vocabulary (`.registry-head`, `.validating-sheet`). They
are legacy names for conventional components, not a surviving metaphor. Rename freely; do not
read intent into them.

**Source of truth is the code**, in this order: `src/styles/tokens.css` (the palette, type
scale, spacing, elevation, motion), `src/styles/console.css` (every base element and shared
component), then the co-located page stylesheets (`header.css`, `console-layout.css`,
`logout-modal.css`, `signin.css`, `dashboard.css`, `households.css`).

Light only. `color-scheme: light` is declared and there is no dark palette.

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
- **One breakpoint:** `max-width: 768px`. Desktop is the committed target; the mobile block
  reduces padding and lets tables scroll. There is no tablet tier.

### Named Rules

- **Everything shares the 1280px measure.** Top bar inner, page, and footers align to one edge.
- **Spacing comes from the scale.** No arbitrary pixel values in new CSS.
- **Tables scroll, they do not reflow.** `.table-wrap` is `overflow-x: auto`; columns are never
  dropped or restacked into cards.

---

## Elevation & Depth

Depth is carried by **borders first, shadow second**. Every surface has a real 1px border; the
shadow only lifts it off the page.

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(16,24,40,.06)` | Cards, inputs, buttons at rest |
| `--shadow` | `0 1px 3px rgba(16,24,40,.1), 0 1px 2px rgba(16,24,40,.06)` | The loading sheet |
| `--shadow-lg` | `0 12px 24px -8px rgba(16,24,40,.18), 0 4px 8px -4px rgba(16,24,40,.08)` | Dialogs, toasts |

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

---

## Motion

`--fast` `120ms cubic-bezier(.4,0,.2,1)` for state changes — hover, border, colour.
`--base` `200ms cubic-bezier(.16,1,.3,1)` for entrances.

Two animations exist: `toast-in` (8px rise plus fade) and `rule-sweep` (the loading bar,
1100ms ease-in-out alternating).

### Named Rules

- **Transition properties, never `all`.** Every rule names what it animates.
- **Motion confirms, it never entertains.** Nothing moves that the operator did not cause,
  except the loading sweep.

---

## Components

### Top bar (`.registry-head`) — signature, kept by request

Navy field, white uppercase wordmark tracked at `0.16em`, uppercase nav links at `0.12em` with
a 2px underline on the active tab, operator email and sign-out pushed right. The email
truncates with an ellipsis and carries a `title`. **Do not redesign without asking.**

### Loading treatment (`.validating`) — signature, kept by request

A centred 400px white sheet on `--bg` carrying a status line and a 4px round rule, inside which
a navy segment at 38% width sweeps back and forth. Used for the full-page session splash and
the magic-link token exchange. **Do not redesign without asking.**

### Card

`--surface`, 1px `--border`, `--r-lg`, `--shadow-sm`. Optional header (title left, action
right, bottom rule) and footer (`--surface-2`, top rule, bottom corners rounded).

### Table

Lives inside a card, inside `.table-wrap`. Head is `--surface-2` with 12px 600 `--text-2`
labels; cells are 16px/20px with a bottom rule that is removed on the last row; rows hover to
`--surface-2`.

### Buttons

36px tall, 6px radius, 14px/500, `--shadow-sm`, 8px icon gap.

- **Default:** white on `--border-strong`, hovering to `--surface-2`.
- **Primary:** navy fill, white text — also applied automatically to `button[type="submit"]`
  and `a[role="button"]`.
- **Danger:** `--danger` fill, white text, via `.danger` or `data-tone="danger"`.
- **Ghost:** transparent, no shadow, `--text-2`, hovering to a `--surface-2` fill.
- **Disabled:** `--surface-2` fill, `--text-3`, no shadow, `not-allowed`.

### Inputs

Full width, 9px/12px padding, 6px radius, `--border-strong`, `--shadow-sm`. Focus swaps the
border to `--focus` and adds a 3px ring. `aria-invalid="true"` or an `-error` `aria-describedby`
turns the border and ring red — **validation state is driven by the ARIA attribute, not a class**,
so the accessible name and the visual state cannot drift apart. `.field` gives 20px bottom
spacing; `.field-hint` is 13px `--text-3`.

### Badge

Round pill, 12px/500, `4px 9px`, with a 6px `currentColor` dot rendered via `::before`. Three
variants map to the status pairs: `.badge--neutral` (success green), `.badge--warning`,
`.badge--danger`.

### Toast

Bottom-right stack, 24px inset, 12px gap, `min(400px, 100vw - 40px)`. Each toast is a
`--shadow-lg` card tinted with its status pair, an icon in the status foreground, entering with
`toast-in`. Success, error and info must never be mistaken for each other — that is the whole
job of the tint.

### Dialog

`role="dialog"` / `role="alertdialog"` is the full-screen overlay itself (`position: fixed`,
`inset: 0`, `--overlay`, grid-centred). Its single child is the panel: `max-width: 440px`,
white, `--r-lg`, `--shadow-lg`, 24px padding.

### Inline messages

`[role="alert"]` is 13px `--danger` with 8px top margin. `[role="status"]` is 13px `--text-2`.
Both are styled globally by role — **give the element the right role and it is styled**.

### Empty state

Centred, `48px 24px`, `--text-2` prose. Says what is absent and what to do about it.

---

## Do's and Don'ts

### Do

- Put content in a card, on `--bg`, aligned to the 1280px measure.
- Reach for `console.css` before writing new CSS — most elements are styled by tag or by ARIA
  role already.
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
- Don't add a tablet breakpoint to match an old doc; one 768px block is the system.
- Don't restack tables into cards on mobile — let them scroll.
