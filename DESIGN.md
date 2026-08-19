---
name: Nostos Operator Console
description: A ruled register — engraved hairlines, ledger-bone stock, and vermilion reserved for cancellation.
colors:
  paper: "#f2efe6"
  paper-band: "#ebe6d9"
  paper-deep: "#e3ddcd"
  ink: "#1a1712"
  ink-2: "#5c564c"
  ink-3: "#837c6c"
  rule: "#40566b"
  rule-strong: "#2b3d4e"
  rule-hair: "rgba(43, 61, 78, 0.26)"
  rule-wash: "rgba(43, 61, 78, 0.06)"
  vermilion: "#b7291d"
  vermilion-band: "rgba(183, 41, 29, 0.055)"
typography:
  figure:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontFeature: "tabular-nums"
  title:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.008em"
  head:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.006em"
  entry:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.004em"
  body:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  micro:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.02em"
  stamp:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "10.5px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.15em"
rounded:
  none: "0"
spacing:
  d1: "6px"
  d2: "12px"
  d3: "18px"
  d4: "24px"
  d6: "36px"
  d8: "48px"
  d12: "72px"
components:
  button-default:
    backgroundColor: "transparent"
    textColor: "{colors.rule-strong}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
    height: "34px"
  button-default-hover:
    backgroundColor: "{colors.rule-wash}"
  button-primary:
    backgroundColor: "{colors.rule-strong}"
    textColor: "{colors.paper}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.rule}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.vermilion}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  button-danger-hover:
    backgroundColor: "{colors.vermilion-band}"
  button-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.ink-3}"
  input-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.entry}"
    rounded: "{rounded.none}"
    padding: "12px 0"
  input-area:
    backgroundColor: "{colors.paper-band}"
    textColor: "{colors.ink}"
    typography: "{typography.entry}"
    rounded: "{rounded.none}"
    padding: "12px"
  badge-stamp:
    backgroundColor: "transparent"
    textColor: "{colors.rule}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "2px 6px"
  badge-stamp-warning:
    textColor: "{colors.vermilion}"
  registry-head:
    backgroundColor: "{colors.rule-strong}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "18px 24px"
  table-head-cell:
    backgroundColor: "transparent"
    textColor: "{colors.rule}"
    typography: "{typography.stamp}"
    padding: "12px 12px 6px"
  table-margin-cell:
    backgroundColor: "{colors.paper-band}"
    textColor: "{colors.ink}"
    padding: "12px"
    width: "212px"
  table-entry-struck:
    backgroundColor: "{colors.vermilion-band}"
    textColor: "{colors.ink}"
  toast:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
---

# Design System: Nostos Operator Console

## Overview

**Creative North Star: "The Register"**

A household is a registered title, and this console is the only hand allowed to write on the register. So the page is ruled, not composed. Structure is carried by engraved blue-gray hairlines and full-strength division rules on ledger-bone stock; there are no cards, no status pills, no rounded corners, and no shadow anywhere in the page's own structure. The one authored motion per surface is a stamp being pressed or a rule being drawn.

Density is high and unapologetically clerical: a 6px division governs every measure, numerals are tabular everywhere on the page, and labels are tracked caps set in the rule colour so they read as printed stamps rather than UI chrome. Type is a single face — Libre Franklin, self-hosted variable woff2, weights 400–700, two Latin subsets, SIL OFL — with **no display face by design**. Hierarchy comes from size, weight, tracking and case, never from a second voice.

State is a mark before it is a hue. A cancelled entry is ruled through in vermilion and stays fully legible; remaining grace is a hatched bar whose length is the actual time left; an entry in good standing leaves the margin blank on purpose, so scanning the margin alone finds every household that needs an operator. The register also prints its own law: the notation key on the households folio draws each mark exactly as the entries draw it.

**Key Characteristics:**
- Ruled, never boxed: divisions are 1px hairlines and 2px full-strength rules, never containers.
- One face, tabular figures, tracked-caps stamps for every label and column head.
- A closed three-meaning colour law; vermilion means cancellation and nothing else.
- Every state readable in grayscale, because geometry carries it and colour only confirms.
- Duration drawn to scale rather than restated as prose.
- Flat by structure: exactly one shadowed element in the whole system, and it is not page structure.

## Colors

A warm ledger ground with one structural blue-gray and one reserved red — three meanings total, and the surface publishes them.

### Primary
- **Engraved Registry Blue-Gray** (`{colors.rule}`): every division, column rule, hairline, column head, label, stamp, icon and search mark. Structure *and* interaction live in this hue; it is not an accent applied to the page, it is what draws the page.
- **Deep Engraved Blue-Gray** (`{colors.rule-strong}`): heavy 2px division rules, the registry head band and the signin counter head (paper on a full-strength field), filled primary actions, selection background, caret, and the focus bracket.
- **Hairline** (`{colors.rule-hair}`) and **Wash** (`{colors.rule-wash}`): column divisions and the feint ruling of a waiting folio; wash is the hover state of an entry.

### Secondary
- **Vermilion** (`{colors.vermilion}`): struck, cancelled, or in error. Nothing else, ever. Its only consumers in the shipped build are struck entries (strike-through, row band, and the inset rule on the first cell), the lapsed grace hatch and its `Grace ended` stamp, live error text (`[role=alert]`), danger-toned buttons, the error toast's border and lead rule, the invalid-field underline, the head rule of a dialog that cancels something, and the dashboard's standing-obligation figure while something actually stands cancelled.
- **Vermilion Band** (`{colors.vermilion-band}`): the 5.5%-alpha wash under a struck row and behind a danger button on hover.

### Neutral
- **Ledger Bone** (`{colors.paper}`): the folio itself, and the text colour on any blue-gray field.
- **Band Stock** (`{colors.paper-band}`): the marginal endorsement column, ruled text areas and selects, scrollbar track.
- **Deep Stock** (`{colors.paper-deep}`): inset wells and the margin cell under row hover.
- **Iron-Gall Ink** (`{colors.ink}`): all content — headings, entry names, figures.
- **Secondary Ink** (`{colors.ink-2}`): captions, meta lines, dates, placeholders. Warm, tinted from ink; never a neutral gray.
- **Faded Ink** (`{colors.ink-3}`): disabled controls and the drawn hairline that means "nothing endorsed against this entry". Never running text.

### Measured contrast

Measured on the shipped build, recorded as fact: ink 15.54:1, ink-2 6.32:1, rule 6.61:1, vermilion on paper 5.45:1, vermilion on the struck row band 5.01:1, paper on the head band 9.71:1, placeholders 6.32:1. No accessibility standard has been adopted for this product; these are measurements, not a compliance claim.

### Named Rules

**The Closed Law Rule.** The palette has exactly three meanings: blue-gray = structure and interaction (including focus), iron-gall ink = content, vermilion = struck, cancelled, or in error. There is no fourth. Introducing a hue with a new meaning breaks the system, not just the palette — and the notation key on the register will start lying.

**The Reserved Red Rule.** Vermilion is never decoration, never emphasis, never "important". If the thing is not cancelled, expired, or an error, it is drawn in rule or ink.

**The Mark-Before-Hue Rule.** Every state is carried by geometry first — strike-through, hatch length, vermilion hatch fill, stamp border, margin hairline, focus bracket — so it survives grayscale and colour blindness. Colour only confirms what the mark already said. Audit test: screenshot in grayscale; if a state disappears, it was never designed.

## Typography

**Body Font:** Libre Franklin (self-hosted variable woff2, 400–700, `system-ui, sans-serif` fallback)
**Display Font:** none. Deliberately.

**Character:** One grotesque doing clerical work. Tight negative tracking on headings and figures, wide `0.15em` tracking on small caps, and tabular numerals set globally on `body` so every column of figures aligns without per-component opt-in.

### Hierarchy
- **Figure** (600, 21px, -0.01em): the ramp's top step — page `h1`, return values, the standing-obligation count.
- **Title** (600, 19px, -0.008em): the folio head's title block.
- **Head** (600, 17px, -0.006em): a division head (`h2`) and a slip's own title. `h3` drops to body size.
- **Entry** (500, 15.5px, -0.004em): the proprietor's name on a register entry, and every text input — you write at entry size.
- **Body** (400, 14.5px, 1.5): running prose, capped at 68ch on `p` and 60ch on the standing line.
- **Caption** (400, 12.5px): notices, terms, dates in-row, toast copy.
- **Micro** (400, 11.5px, 0.02em): endorsement dates, folio meta, admin email, operator email in the head.
- **Stamp** (600, 10.5px, 0.15em, uppercase, in `{colors.rule}`): column heads, field labels, buttons, nav links, badges, pagination range, section heads. The single most-used role in the system.

### Named Rules

**The One Face Rule.** There is no display face and no second family. If a heading needs more presence, it gets size, weight, or tracking — not a different typeface.

**The Tabular Figures Rule.** Numerals are tabular everywhere, set once on `body`. Never introduce proportional figures into a column, a count, or a date.

**The Closed Ramp Rule.** Eight steps, and nothing lives outside them: figure 21 / title 19 / head 17 / entry 15.5 / body 14.5 / caption 12.5 / micro 11.5 / stamp 10.5. Every `font-size` in every stylesheet resolves through a `--f-*` token; a literal pixel size is a defect, and a step no surface renders is deleted rather than kept as "reserved" (the former 32px return step went that way). A new size is a deliberate addition to the ramp, never a local override.

**The Stamp Rule.** Anything that labels rather than states — column head, field label, action, badge, section head — is tracked caps at stamp size in the rule colour. Sentence-case labels in ink read as content and break the register.

## Layout

A single centred folio: `main` at max-width 1240px with `36px 24px 72px` padding, dropping to `24px 18px 48px` under 768px. The registry head band spans full width with its inner content on the same 1240px measure.

Everything is placed on the **division scale** (`{spacing}`): a 6px unit and its multiples (6, 12, 18, 24, 36, 48, 72). Nothing on the page is placed off this grid. Legacy `--space-*` aliases still exist but only feed the `.mt-/.mb-/.gap-` utilities; new work uses the division tokens directly.

Divisions, not containers: a `section` is announced by a 2px `rule-strong` top border with `12px` above the content and `36px` of air before it. Lists are hairline-separated rows with no bottom rule on the last item. The register table is bracketed top and bottom by 2px rules, its head underlined at full rule weight, its rows hairline-separated, and its columns divided by vertical hairlines on every `th + th` / `td + td` — that vertical rule is what makes a table a register rather than a list.

The households register is fixed-layout with a 212px margin column at the left (112px under 768px), a right-aligned 96px figure column, and a `min-width` of 880px (720px on narrow) inside a horizontal scroller. **A narrow screen scrolls the ledger rather than dismantling it** — column rules and header associations survive intact — and the surface announces the off-screen columns in a stamp above the table instead of leaving them to be discovered. Mobile is not a product commitment; the register degrades honestly rather than reflowing into cards.

The dashboard returns are a two-column grid with a 72px gutter, collapsing to one column at 860px. The signin counter is a two-column sheet (1.05fr / 1fr, 48px gutter) that collapses at 860px, with the notice's left hairline becoming a top hairline.

### Named Rules

**The Division Rule.** Every measure is a multiple of 6px, taken from the division tokens. A hand-typed spacing value is a defect.

**The Blank Margin Rule.** The margin column notes exceptions only. An entry in good standing shows a 14px hairline and nothing else, so the margin can be scanned on its own to find every household that needs an operator. Never fill the margin with an "OK" state.

## Elevation & Depth

The system is flat by structure. Depth comes from rule weight (1px hairline → 1px full rule → 2px → 3px head), from tonal stock (`paper` → `paper-band` → `paper-deep`), and from the full-strength blue-gray head band. No structural surface is shadowed, and there is no radius to soften one.

There is exactly one shadowed element in the shipped build: the endorsement slip (toast). It floats over the folio rather than belonging to it, so it is allowed an offset with soft blur. Dialogs are handled the other way — a `rgba(26,23,18,0.42)` ink scrim plus a 1px frame and a 3px head rule, no shadow.

### Shadow Vocabulary
- **Slip lift** (`box-shadow: 0 6px 18px -6px rgba(26, 23, 18, 0.4)`): the toast only. Never applied to page structure.
- **Focus bracket** (`box-shadow: -4px 0 0 0 var(--rule-strong), 4px 0 0 0 var(--rule-strong)`): a mark, not a lift — see the rule below.
- **Struck-entry inset** (`box-shadow: inset 1px 0 0 0 var(--vermilion)`): a drawn rule inside the first cell of a cancelled entry, binding the endorsement to the row.

### Named Rules

**The One Shadow Rule.** The toast is the only shadowed thing, because it is the only thing that is not part of the folio. Everything else earns separation from rules, weight and stock.

**The Bracket Focus Rule.** Focus is a bracket, not an outline: two `rule-strong` rules flanking the element, drawn with `box-shadow` so nothing shifts. Fields keep their own frame and add an inset underline. **Filled actions must invert the bracket to paper** (paper bracket inside a wider `rule-strong` bracket), because a `rule-strong` bracket vanishes into a `rule-strong` fill. Any new filled or dark-field control inherits this obligation. A ruled composite field (the search rule) brackets the whole field on `:focus-within` and suppresses the inner input's own bracket. `forced-colors` falls back to a 2px system outline.

## Shapes

Zero radius, everywhere, asserted rather than inherited: buttons, inputs, textareas, selects, checkboxes, badges and dialogs all set `border-radius: 0`. Form language is the ruled line — a single-line entry is written **on** a 2px rule with no box around it; a block (textarea, select) gets a ruled *area*: band stock, hairline frame, 2px rule at the bottom edge. Disabled swaps a solid rule for a dashed one, so unavailability is a change of line quality rather than of opacity.

Marks are drawn, not glyphed. Icons are a single instrument: one 16-unit grid, 1.25 stroke, round caps, `currentColor`, four marks total (sign-out, close, check, search). The notation key's samples are the real geometry — a 2px vermilion bar, a hatch swatch, an outlined vermilion hatch, a 2px rule, a 1px faded hairline — never a character standing in for a mark. Hatch is a shared 45° repeating gradient at 1px-on / 3px-off, in rule for elapsing time and in vermilion for a lapse.

### Named Rules

**The No Radius Rule.** Nothing in this system is rounded. A radius, however small, reads as a card and cards are refused.

**The Drawn Duration Rule.** Time is drawn to scale: the grace bar's *length* is the real remaining fraction, and a lapsed grace **fills** the track with the vermilion hatch rather than emptying it — an empty box reads as a failed render, a full one reads as a verdict. Never restate a duration in prose where it can be drawn (the accessible label carries the numbers).

## Components

Character: pressed, not glowing. Every control behaves like an instrument leaving a mark on stock.

### Buttons
- **Shape:** square (`0` radius), 1px rule border, 34px minimum height, `12px 18px` padding, stamp typography.
- **Default (ruled):** transparent on paper with a `rule` border and `rule-strong` label. Hover fills with the rule wash.
- **Primary (filled):** `button[type=submit]` and `a[role=button]` fill with `rule-strong` and set the label in paper; hover lightens to `rule`. Focus must invert its bracket to paper.
- **Danger:** `data-tone="danger"` — vermilion label and border on transparent, hover in the vermilion band. Reserved for acts that cancel.
- **Active:** a 1px `translateY` press over 90ms linear. No lift, no glow, no scale.
- **Disabled:** faded ink on a dashed hairline border.

### Inputs / Fields
- **Line entry:** transparent, no side or top borders, 2px `rule` bottom rule, entry-size type, tabular figures, 12px vertical padding.
- **Ruled area:** textarea and select on band stock with a hairline frame and a 2px bottom rule; textarea min-height 96px, vertical resize only.
- **Focus:** the bracket, plus a 2px inset bottom rule inside the field's own frame.
- **Invalid:** the bottom rule turns vermilion (`aria-invalid`, or a field pointing at a `-error` description); the message is caption-size vermilion below.
- **Disabled:** faded ink, dashed bottom rule.

### Navigation
Stamp-size tracked caps in `rule`, no underline, with a 2px transparent bottom border that becomes visible on hover. In the registry head the links sit at 72% paper, brighten to full paper on hover, and **the current section is the tab that extends** — a full paper rule under the label, never a filled pill.

### Registry Head
One full-strength `rule-strong` band across the top of every folio, closed by a 2px ink rule at its bottom edge: the wordmark in 12.5px `0.17em` caps, the nav, then the operator's email (micro, 22ch truncation) and a compact ruled sign-out. It is the surface's anchor, not an accent applied to it.

### The Register (signature)
A fixed-layout table read left to right as margin → entries. The **margin column** on band stock carries dated endorsements: a warning-tone stamp, the requested and scheduled dates in micro vermilion, the grace bar, and a `Grace ended` stamp when it has lapsed. An entry in good standing gets the 14px faded hairline aligned to the cap-height of the name beside it, plus a visually-hidden "Active, nothing pending".

A **struck entry** is banded in the vermilion wash, carries an inset vermilion rule on its first cell, and its name is struck with a 1.5px vermilion `line-through` — drawn as a text decoration so a name wrapping to three lines is struck on all three, and animated in by fading the decoration colour over 320ms. It remains completely readable; strike-through is never a way to hide a row. Hover adds `underline line-through`, deepens the wash, and deepens the margin cell.

**Waiting** is a ruled but unwritten folio: the 2px top and bottom rules with 48px-pitch feint ruling behind an empty 288px block and a status line. Never a spinner.

### Notation Key (signature)
The register publishes its own law. A hairline-bracketed row of tracked-caps entries, each preceded by the actual mark drawn at sample size. Only list marks the surface really renders — a legend promising a mark the page never draws is worse than no legend.

### Badge (stamp)
Not a pill: stamp typography, `2px 6px` padding, 1px `currentColor` border, no fill, no radius. Two tones only — neutral in rule, warning in vermilion.

### Endorsement Slip (toast)
Bottom-right stack, max 400px, paper on a 1px `rule-strong` frame with the one permitted shadow, and a 36px × 2px lead rule above the copy. Slides in on the 320ms draw curve. The error variant switches the frame and lead rule to vermilion — the only difference; the copy stays in ink.

### Dialog Slip
An ink scrim, a 460px paper sheet with a 1px frame and a 3px `rule-strong` head rule, hairline-divided header and footer. `[data-strike]` turns the head rule vermilion — only a slip that cancels something wears it, never every consequential dialog.

### Empty Folio
2px rules top and bottom, 72px of air, and 36px-pitch feint ruling behind a centred secondary-ink line. The folio exists and is ruled; it simply has no entries.

## Do's and Don'ts

Scope note: three surfaces received bespoke composition in this build — signin (`/console/signin`), the dashboard (`/console`), and the households register (`/console/households`). The magic-link callback, the create-household form and household detail **inherit this stylesheet through element selectors and have had no composition pass**; treat their current appearance as base setting, not as designed layout.

Two devices were declined on purpose and should not be reintroduced casually: a visible leader tying an endorsement to its entry (the shared row band plus the inset vermilion rule on the first cell is the binding that ships), and a blind emboss for *attested* status (removed because the list endpoint returns no claim status; booked to return on household detail, which has `claimStatus`).

### Do:
- **Do** draw structure with rules and stock: 1px hairline for column and row divisions, 1px full rule under a table head, 2px `rule-strong` for a division or a table's outer bracket, 3px for a sheet's head.
- **Do** place every measure on the 6px division scale.
- **Do** label with stamps: tracked caps (`0.15em`) at 10.5px in the rule colour, for column heads, field labels, buttons, badges and section heads.
- **Do** carry state as a mark first — strike, hatch, border, hairline — and let colour merely confirm it.
- **Do** draw duration to scale, and fill a lapsed track with the vermilion hatch instead of emptying it.
- **Do** bracket focus with `box-shadow`, and **invert the bracket to paper on any filled or dark-field control**.
- **Do** keep motion to stamping and ruling: 90ms linear for a press, 320ms `cubic-bezier(0.16, 1, 0.3, 1)` for a draw, one authored moment per surface, single-axis and damped, snapping under `prefers-reduced-motion`.
- **Do** show waiting as a rule being drawn or a ruled-but-unwritten folio.
- **Do** keep a cancelled entry fully legible while it is struck.

### Don't:
- **Don't** add a fourth colour meaning. Blue-gray, ink, vermilion — that is the whole law, and the notation key prints it.
- **Don't** use vermilion for anything but struck, cancelled, or in error. Not for emphasis, not for a primary action, not for a warning that isn't a cancellation.
- **Don't** introduce a radius, a card, a status pill, or a metric tile. A badge is a bordered stamp; a division is a rule.
- **Don't** shadow page structure. The toast is the only shadowed element in the system.
- **Don't** add a second typeface or a display face, and don't let proportional numerals into a figure column.
- **Don't** write a pixel font-size literal; take a step from the eight-step ramp, or add a step to it deliberately.
- **Don't** use an `outline` for focus, or a bracket in `rule-strong` on a `rule-strong` fill — focus disappears.
- **Don't** ship a spinning circle, a pulse, a bounce, or a multi-axis transition.
- **Don't** fill the margin column for entries in good standing; a blank margin is the reading.
- **Don't** restate in prose a duration the page can draw, and don't empty a track to signal a lapse.
- **Don't** reflow the register into cards at narrow widths; scroll the ledger and announce the off-screen columns.
