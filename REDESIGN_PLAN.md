# REDESIGN_PLAN.md — MIDNIGHT DESIRE

Implementation plan for the visual redesign. Written after the source audit; no source
file has been modified yet.

---

## 0. Hard constraints (from audit + user rules)

| Rule | Consequence for this plan |
|---|---|
| `style.css`, `game.js`, `challenges-*.js` are read-only | All visual change lands in `patch-improvements.css` / `patch-improvements.js` |
| `index.html` editable for link/script tags + static text | `<title>`, subtitle, setup copy, labels only |
| No framework, no build step, no new runtime dependency | Plain CSS/JS appended to the two patch files |
| IDs / selectors / listeners preserved | Zero markup restructure; no handler renamed |
| Snake/ladder mapping + board numbering frozen | SVG recolour only; `SNAKES`/`LADDERS`/`cellCenter` untouched |
| RNG and turn logic frozen | No JS touching `rollDice` math or `nextTurn` |
| CSP unchanged | Only Google Fonts origins already allowed |
| 18+ gate remains client-side | Never described as server-backed anywhere |

---

## 1. Design system — tokens

Added at the top of the new section in `patch-improvements.css`, scoped to `:root`
(so every existing surface that reads `--paper`/`--ink` follows):

```css
:root {
  /* MIDNIGHT DESIRE */
  --md-black:     #130D12;   /* main background */
  --md-burgundy:  #54152B;   /* panels, sections */
  --md-red:       #A32648;   /* primary accent */
  --md-rose:      #D98C9F;   /* secondary accent */
  --md-gold:      #D6B779;   /* premium detail, ladder metal */
  --md-ivory:     #F3E8E5;   /* main text */

  /* derived, low-chroma so nothing goes neon */
  --md-black-2:   #1B1218;   /* raised surface */
  --md-black-3:   #241820;   /* recessed / hover */
  --md-line:      rgba(214,183,121,0.20);  /* gold hairline */
  --md-line-soft: rgba(243,232,229,0.10);
  --md-glow:      rgba(163,38,72,0.30);    /* candle halo */

  /* existing tokens are remapped onto the new palette */
  --paper:      var(--md-black);
  --paper-2:    var(--md-black-2);
  --paper-3:    var(--md-black-3);
  --ink:        var(--md-ivory);
  --ink-soft:   #CDB9B9;
  --ink-faint:  #9A868A;
  --night:      #0F090D;
  --night-2:    #0A0609;
  --coral:      var(--md-red);       /* P0 and Romantic */
  --marigold:   var(--md-gold);      /* P1 and Teasing */
  --teal:       #7FA89F;             /* muted sage, keeps Truth legible */
  --sky:        #8FA6C2;             /* muted slate-blue, Duo */
  --plum:       var(--md-rose);      /* Wild */
  --butter:     var(--md-gold);      /* Joker */
  --liar:       #7E1027;             /* Spicy, deeper than --md-red */
  --border:     var(--md-line);
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-ui:      'Jost', 'Karla', system-ui, sans-serif;
}
```

**Why these remaps:** `game.js` writes inline styles with `var(--p0)`, `var(--p1)`,
`var(--rose)`, `var(--gold)`, and the `.cell`/`.pion`/`.tod-*` rules in `style.css`
read the tokens. Remapping at `:root` gives the new palette to the whole engine for
free, with no selector-by-selector repaint.

**Do not** re-introduce bright red (`#F4514B`), neon, or oversaturated pink. The only
saturated value is `--md-red #A32648`, used for accents, never as a large fill.

### Typography

| Role | Family | Weights | Notes |
|---|---|---|---|
| Display / emotional headings | **Cormorant Garamond** | 300, 400, 600 | high-contrast old-style serif, romantic without script cliché |
| UI / gameplay | **Jost** | 300, 400, 500, 600 | geometric sans, clean at 10–14 px |

Both load from Google Fonts — already permitted by the CSP (`style-src`
`fonts.googleapis.com`, `font-src` `fonts.gstatic.com`). Add the `<link>` to
`index.html` head next to the existing Fraunces/Karla link. Fraunces/Karla stay in the
stack as fallbacks so a slow font fetch never changes layout metrics.

Type scale (`rem` where it matters, container units on the board):

```
display-xl  clamp(2.2rem, 7vw, 3.4rem)   Cormorant 300, letter-spacing .02em
display-l   clamp(1.5rem, 4.5vw, 2.2rem) Cormorant 400
title       clamp(1.05rem, 2.6vw, 1.35rem) Cormorant 600
body        0.9375rem / 1.65  Jost 400
label       0.75rem, letter-spacing .12em, Jost 500  → sentence/title case, not ALL CAPS
numeral     0.6875rem, Jost 500, tabular-nums
```

No ALL-CAPS labels (frontend-design guidance), no single-word colour accents in
headlines, no numbered eyebrow markers — this content is not a sequence.

### Atmosphere (non-blocking)

- `body` background: layered radial gradients — a warm burgundy vignette top-centre,
  a faint rose glow bottom-left, all over `--md-black`. Pure CSS, no image.
- `#hearts-bg` recoloured to low-opacity rose petals via `currentColor` + `opacity`
  override; unchanged DOM.
- A single ornamental hairline (gold, 1 px, 20 % alpha) beneath the main title.
- Subtle grain: one inline SVG `feTurbulence` data-URI at 2 % opacity, `pointer-events:none`.
- **No** decorative layer above the board (`z-index` of board content stays above any
  atmosphere layer), no parallax, no infinite animation beyond the existing heart drift.

---

## 2. Screen-by-screen

### A. Landing / welcome (`#name-screen`)

- Title becomes **MIDNIGHT LOVE** (display-xl, Cormorant 300, ivory, letterspaced).
- Below it, a smaller "Truth or Dare" line, then the subtitle
  **"A Game of Love, Temptation & Connection"** (body, `--ink-faint`).
- Existing rules button and custom-challenge button keep their handlers; restyled to
  gold hairline outline, transparent fill, gold hover.
- Entrance: one orchestrated `opacity` + `translateY(10px)` sequence on
  `.consent-card`/`#name-screen > *` with staggered `animation-delay` — 420 ms total,
  runs once. Under `prefers-reduced-motion` the elements are static at their rest state
  (the reduced-motion block already zeroes duration; the keyframe starts from
  `opacity:0` only in the media-less case — so the base state must be `opacity:1`).
- The consent screen gets the same treatment: gold rules mark, ivory copy, single
  gold-filled confirm button.

### B. Player setup

- `.name-fields` → two panels separated by a gold hairline. P1 uses `--p0`, P2 `--p1`
  as the panel's left rule and label colour → immediate distinction.
- `.name-field`: transparent fill, 1 px gold-20 % border, ivory text, focus ring in
  `--p0`/`--p1` (`.name-input-group:nth-child(1)` / `(2)`).
- `.pion-option`: circular, 40 px, gold ring on selected, `--p0`/`--p1` glow.
- Start button (`.btn-start`): full-width on mobile, burgundy→red gradient, ivory text,
  gold 1 px inner top highlight, 48 px tall, `press` transform of 1 px.

### C. Mode selection (exactly three)

Existing `.mood-btn.romantis/.playful/.liar`. Each card gets its own identity without
touching `selectMood()`:

| Mode | Card treatment |
|---|---|
| Romantic (`#F4514B`→`--p0`) | dusty-rose gradient `#3A1A26 → #2A1219`, gold hairline, rose glow on selected |
| Teasing (marigold→`--p1`) | burgundy `#54152B → #3B0F1E`, rose-pink accent line, quirky icon frame |
| Spicy (`#C0392B`→`--liar`) | near-black `#1A0A10`, crimson edge, dark-gold lock motif |

State model unchanged: `.active` already toggles in `selectMood()`. Add an explicit
`✓` indicator element via `::after` on `.mood-btn.active`, plus a 2 px gold outer ring.
Hover: lift `translateY(-1px)` + border brighten. Tap: 1 px scale-down. Descriptions
stay the existing Indonesian strings (no content change).

Icons: replace emoji-only look with a framed icon disc; keep the existing emoji glyph
as the inner mark (no new asset pipeline, no external SVG fetch).

### D. Board

- `.board-wrap`: gold 1 px outer frame, 6 px inner ivory-8 % inset, soft red
  under-glow (`box-shadow: 0 24px 60px -30px var(--md-glow)`).
- `.cell`: background gradient per band — alternating `#1B1218` / `#201419`, with a
  very low-alpha rose wash on even columns. Border 1 px `rgba(214,183,121,0.10)`.
- `.cell-num`: Jost 500, ivory at 85 %, keeping the existing 4-layer paper knockout
  text-shadow retargeted to the dark cell colour (this preserves legibility over the
  snake artwork).
- Special-cell treatments (classes are engine-generated, keep names):
  `--duo` sky → muted slate wash; `--joker` gold wash; `--wild` rose wash;
  `--berani` crimson wash; each kept under 12 % alpha so numbers stay readable.
- Start cell (1) and finish (100): gold ring + small `START`/`FINISH` micro-label via
  `::before`/`::after` on `[data-n="1"]`… — **note:** cells have no data attribute, so
  target by structural rule is not possible; instead a one-time JS pass after
  `buildBoard()` adds `data-sq` to each `.cell` (attribute only, no layout change) so
  the patch CSS can style squares 1 and 100. This is an additive DOM attribute, not a
  restructure.
- Snakes: recolour the generated strokes from `#A3271F`/`#FBA6A2`/`rgba(159,18,57,…)`
  to `#2A1017` / `--md-rose` / `rgba(89,20,39,…)`; scale highlights → gold 20 %.
  Mapping and paths untouched.
- Ladders: `#B8890E`/`#F7C083`/`#FFF3CF` → `--md-gold`, a 70 % gold highlight, and a
  near-white champagne glint. Implemented as an SVG colour map applied once in
  `drawSnakesLadders` wrapper (`svg.innerHTML` string replace on exact literals, then
  iterate path/line elements and set `stroke`/`fill`). Coordinates unchanged.
- Pions: keep the existing SVG figures; add a gold ring + drop shadow per token, and
  retain the existing `SHARED_SCALE` overlap correction (no change).
- Pion layer `pointer-events:none` stays, so board interactions are unaffected.

### E. Controls

- Dice (`#dice-wrap`): restyle the inner rects via a wrapper on `renderDice` — replace
  the literal `#1C1636`/`#16112B` fills with `--md-black-2`/`--md-black` and a gold
  stroke. Roll animation already exists (`.rolling`, 420 ms patch); add a gold glow
  pulse keyed to `.rolling::after` (compositor-only `opacity`/`transform`).
- `.btn-roll`: burgundy fill, ivory label, gold top inner line; disabled state is a
  12 % ivory fill with `--ink-faint` text (no colour-only signal — also dim the label
  text and keep `aria-disabled` semantics as-is via the existing `disabled` attr).
- Stats / music / mute / theme: 44×44 minimum, gold hairline icons row.
- `.game-log`: scrollable panel with a burgundy header bar; entries get quiet
  separators. Existing auto-scroll behaviour untouched.
- Timer ring: `#timer-ring` stroke colours are written inline by `startTimer()`
  (`#2E9E8F`, `#F5A03C`, `#F4514B`). Wrap `startTimer` is unnecessary: instead add a
  CSS `filter: hue-rotate`? No — that is brittle. Use a tiny observer: the timer text
  element's inline `fill` is rewritten every tick, so a `MutationObserver` on
  `#timer-text` would fire every second (waste). Chosen approach: leave the ring
  colours as functional signal (green→amber→red) but desaturate them via
  `filter: saturate(.75)` on `#tod-timer` and retint the track. This is a deliberate,
  documented exception: the timer is the one place semantic colour beats brand colour.

### F. Overlays (modal)

- `#tod-overlay` backdrop: `rgba(10,6,9,0.82)` + 6 px backdrop blur, capped so the
  board stays faintly visible.
- `.tod-card`: burgundy panel, gold 1 px frame *inside* the existing 6 px inset,
  player-colour edge kept (it is written inline by `showTOD` and is functional
  identification).
- `.tod-challenge`: Cormorant 400, 1.15–1.3 rem, ivory, max 42ch, `text-wrap: pretty`.
- `.btn-done` / `.btn-skip` / `.btn-joker` / partner-refuse: gold-outline, burgundy
  fill, 44 px, clear focus ring.
- Winner, stats, recap, rules, custom overlays: same panel language; recap canvas is
  drawn by JS and is left alone except for its border.

### G. Theme toggle

Current model: `body` cream, `.dark` = night. Midnight Desire is dark by default, so:

- `:root` becomes Midnight Desire (§1).
- The existing `body.dark` block is repurposed as `body.light` — the ivory "Cetak
  Malam" light alternative — with the palette values inverted and the cream guards
  flipped (gold hairlines become ink hairlines, etc.).
- `patch-improvements.js`: toggle `light` instead of `dark`; button shows ☀️ in light
  mode and 🌙 in midnight; `aria-label` accordingly; initial theme follows
  `prefers-color-scheme: light` (so a light-preferring OS gets ivory, everyone else
  gets midnight). Persisted under a new key `kuro-theme-v2` so no stale value from the
  old key forces an unexpected theme.

No feature is removed: the toggle still exists, still persists, still respects the OS
preference — its default and its two palettes are simply redefined.

---

## 3. Motion budget

| Moment | Property | Duration | Easing |
|---|---|---|---|
| Screen entrance | `opacity`, `translateY` | 420 ms, 60 ms stagger | `cubic-bezier(.16,1,.3,1)` |
| Card flip (existing) | rotation | unchanged | unchanged |
| TOD card reveal | `opacity`, `translateY(8px)` | 260 ms | ease-out |
| Button press | `translateY(1px)` | 90 ms | linear |
| Dice roll (existing) | existing | 420 ms | unchanged |
| Token step (existing) | transform | 160/135/110 ms | unchanged |
| Cell pulse (existing) | `::after` opacity | 340 ms | unchanged |
| Modal entrance | `opacity`, `scale(.985→1)` | 240 ms | ease-out |

All on `transform`/`opacity`. `prefers-reduced-motion` block already forces
`animation-duration`/`transition-duration` to `0.01ms` — verify each new keyframe's
start state is invisible-only while its end state is the normal rest state, so the
reduced-motion render is identical to the final frame.

No looping decorative animation. `will-change` only on `.pion` (already) and the dice
during `.rolling`.

---

## 4. Responsive strategy

One implementation; breakpoints already exist in `patch-improvements.css` and are kept:

| Range | Board budget | Layout |
|---|---|---|
| ≥841 px | `min(480px, 100vw−215px, 100dvh−300px)` | board left, controls right (side-panel 165 px) |
| 601–840 | `min(400px, 100vw−155px, 100dvh−320px)` | board left, controls right (narrow) |
| portrait phone | `min(100vw−12px, 100dvh−392px)` | stacked: header → cards → board → controls |
| landscape phone | `min(480px, 100vw−170px, 100dvh−175px)` | board left, controls right |

Mobile order is enforced with flex `order` in the existing stacked layout — no DOM
reordering, so JS `querySelector` paths stay valid. Activity log collapses to a
42 px bar that expands on tap (`aria-expanded` + `aria-controls` on a wrapper button
added in `index.html`… **decision:** avoid markup change — instead style the existing
`.game-log` with a `max-height` transition and a “Log” toggle button appended by the
patch JS, keeping `#game-log` itself intact).

Tap targets: every button ≥44×44 (`min-height:44px` + `min-width:44px` for icon
buttons), verified per viewport in Phase 7.

Test viewports: 320×568, 360×800, 390×844, 430×932, 768×1024, 1366×768, 1920×1080.

---

## 5. Implementation order (each step self-checked)

1. **Git safety commit / branch** — verify: `git status` clean, branch `redesign/midnight-desire`.
2. **CSS: token remap + typography link** — verify: page loads, no console error, tokens resolve.
3. **CSS: chrome (body, headings, panels, buttons, overlays)** — verify: contrast ≥4.5:1 sample.
4. **CSS: board cells + numbers + special cells** — verify: numbering still 1→100, 100 top-left.
5. **JS: board SVG recolour + `data-sq` tagging** — verify: snake/ladder endpoints unchanged;
   compare computed `cellCenter` pairs before/after (no change possible — function untouched).
6. **JS: dice recolour + theme key flip** — verify: `renderDice` output recoloured, toggle persists.
7. **CSS/JS: motion + reduced-motion audit** — verify: emulate reduced motion; no invisible text.
8. **Responsive pass** — verify: 7 viewports, no horizontal overflow, board fully visible.
9. **Regression run** — `node test/patch-test.js` (40 assertions) + Playwright gameplay script.
10. **Docs**: Phase 9 reports.

Rollback: everything is additive to two files plus static text; `git revert` of the
redesign commit restores the previous look with no engine change.

---

## 6. What is deliberately out of scope

- No change to challenge text, pools, levels, or the Spicy-only `berani` content.
- No change to snake/ladder mapping, board numbering, RNG, turn order, scoring.
- No new mode (Deep Talk stays absent).
- No new asset files, build tooling, or dependency.
- No server-side consent check (the 18+ gate remains a client-side acknowledgment and
  will be described that way in every report).
