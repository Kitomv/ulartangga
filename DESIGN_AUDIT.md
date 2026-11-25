# DESIGN_AUDIT.md — Midnight Desire Redesign

Audit of the existing Truth or Dare / Snakes & Ladders game, verified by reading the
source files. No source file was modified during this phase.

---

## 1. File inventory

| File | Lines | Size | Status |
|---|---|---|---|
| `index.html` | 349 | 67.6 KB | Editable (link/script tags, static text, `<title>`) |
| `assets/css/style.css` | 1223 | — | **READ ONLY** |
| `assets/css/patch-improvements.css` | 570 | — | Editable (override layer, loads after style.css) |
| `assets/js/game.js` | 3079 | — | **READ ONLY** |
| `assets/js/patch-improvements.js` | 583 | — | Editable (IIFE override layer, loads last) |
| `assets/js/challenges-romantis.js` | 99 | — | **READ ONLY** |
| `assets/js/challenges-playful.js` | 98 | — | **READ ONLY** |
| `assets/js/challenges-liar.js` | 156 | — | **READ ONLY** |
| `test/patch-test.js` | 275 | — | Editable (40 assertions, all passing) |
| `docs/AUDIT.md` | — | 1722 B | Prior security/bug audit (VF-01…VF-06, A-01…A-04) |

No image or SVG asset directory exists. All board art (snakes, ladders, pions, dice)
is generated as inline SVG by `game.js`. There is no build step, no framework, no
backend, and no npm dependency used at runtime.

---

## 2. Architecture

```
index.html
  ├── <link> style.css?v=5          (base layers, tokens, layout)
  ├── <link> patch-improvements.css?v=8   (override layer)
  ├── challenges-romantis.js        → window.CHALLENGES_ROMANTIS
  ├── challenges-playful.js         → window.CHALLENGES_PLAYFUL
  ├── challenges-liar.js            → window.CHALLENGES_LIAR
  ├── game.js?v=5                   (engine: globals, not wrapped in IIFE)
  └── patch-improvements.js?v=8     (IIFE, guarded by window.__kuroPatchApplied)
```

`game.js` declares its functions at top level, so every engine function (`startGame`,
`rollDice`, `showTOD`, `resolveAfterTOD`, …) is a genuine global. The patch layer
captures the original into a local var before reassigning the global:

```js
var _origPositionPions = window.positionPions;
window.positionPions = function () { /* wrapper */ };
```

Function *declarations* are never used inside the IIFE — they hoist and would clobber
the original before capture. This pattern is already used for 12 functions in
`patch-improvements.js` and must be followed for any new override.

### State (all module-global in game.js)

```js
let pos=[1,1], turn=0, phase='roll';
let pendRaw, pendAfter, pendDice, rolling;
let skipStreak=[0,0], jokerCount=[0,0], skipTodCount=[0,0];
let usedTruthSet={romantis:Set, playful:Set, liar:Set};
let usedDareSet ={romantis:Set, playful:Set, liar:Set};
let CELL_TYPE={}, currentTodType=null;
let stats=[{done,skipped,truths,dares,duos,wilds,jokerUsed,snakeHits,
            ladderHits,bonusTurns,maxStreak,curStreak} × 2];
let currentMood='romantis';
let PLAYERS=[{name,colorHex} × 2];
```

Single source of truth. No duplicate state may be introduced by the redesign.

---

## 3. Existing design system ("Cetak Malam")

`style.css:47–87` defines the token block:

| Token | Value | Role |
|---|---|---|
| `--paper` | `#F6ECD8` | page background |
| `--paper-2` | `#FBF4E4` | cards |
| `--paper-3` | `#EDE0C6` | recessed |
| `--ink` | `#1B1633` | text |
| `--ink-soft` | `#4B4463` | secondary text |
| `--ink-faint` | `#857C9B` | tertiary text |
| `--night` / `--night-2` | `#16112B` / `#0E0A1C` | dark surfaces |
| `--coral` | `#F4514B` | P0 / Romantic |
| `--marigold` | `#F5A03C` | P1 / Teasing |
| `--teal` / `--sky` / `--plum` / `--butter` | `#2E9E8F` / `#4C8DD9` / `#9268C8` / `#FFD166` | accents |
| `--liar` | `#C0392B` | Spicy |
| `--p0` / `--p1` | `var(--coral)` / `var(--marigold)` | referenced in JS inline styles |
| `--font-display` | Fraunces | titles |
| `--font-ui` | Karla | body / buttons |

Fonts are loaded from Google Fonts in `index.html`; the CSP already permits
`fonts.googleapis.com` (style) and `fonts.gstatic.com` (font). Any new family must be
added through a Google Fonts URL to stay inside the existing CSP — no CSP change is
required for that.

`body.dark` (patch CSS:461) remaps the tokens to a night plate and re-tints the
overlays back to cream. The night plate is **not** Midnight Desire; it is a neutral
inversion. Both must coexist without fighting.

### Hardcoded colour hotspots (block token remapping alone from being enough)

Because `style.css` is read-only, Midnight Desire is implemented by remapping `:root`
inside `patch-improvements.css`. These values will *not* follow the remap and each needs
an explicit override:

| Where | Occurrences | Detail |
|---|---|---|
| `style.css` `rgba(27,22,51,…)` | 16 | cell hairlines, borders, shadows |
| `style.css` `rgba(246,236,216,…)` | 40 | night-surface text, overlay chrome |
| `index.html` inline `rgba(246,236,216,0.22)` | rules button, custom button | inline styles |
| `game.js` `makeSnake` | `#A3271F`, `#FBA6A2`, `rgba(159,18,57,…)`, `#F4514B` | snake body/scales |
| `game.js` `makeLadder` | `#B8890E`, `#F7C083`, `#FFF3CF`, `#C97716`, `#F5A03C`, `#fde68a` | ladder rails/rungs |
| `game.js` `renderDice` | `#1C1636`, `#16112B`, player `colorHex` | dice SVG |
| `game.js` `#tod-card` | inline `border:2px solid colorHex` + `boxShadow` | set in `showTOD` |
| `game.js` `#mood-badge-bar` | inline colours per mood | set in `updateUI` |
| `game.js` `showWildChoice` | inline Truth/Dare buttons | markup string |
| `game.js` `renderChallenge` | `.tod-challenge{font-size:15px}` inline; `.tod-type-pill` classes | `#tod-body.innerHTML` |
| `game.js` `checkSavedGame` | `#resume-banner` cream inline styles | `background:#FBF4E4; border:2px solid #1B1633` |
| `game.js` `renderTodChallenge` | — | appends **text nodes** only; no escaping needed (see §6) |

Consequence: the redesign needs (a) a token remap, (b) selector-level overrides, and
(c) a small post-render colour pass on the board SVG. All three are achievable inside
the patch layer.

---

## 4. Layout structure (verified from `index.html` + `style.css`)

```
body
├── #hearts-bg, #heat-overlay, #streak-toast      (decorative chrome)
├── #age-consent-screen.age-consent               (fixed, z500, night)
│     .consent-card > .consent-icon 🔞 .consent-title .consent-desc
│                     .consent-terms > #age-confirm + #consent-agree
│                     #btn-age-confirm
├── #name-screen                                  (fixed, night, z500)
│     💕 · h2 "Ular Tangga" · h2 "Truth or Dare"
│     showRules() button · .name-fields (2× .name-input-group
│       label + #name0/#name1 (maxlength 20) + .pion-picker-row #pions0/#pions1)
│     "Pilih vibe malam ini" · .mood-selector
│       #mood-romantis .mood-btn.romantis  💕 Romantic / Lembut & manis
│       #mood-playful  .mood-btn.playful   😜 Teasing  / Fun & seru
│       #mood-liar     .mood-btn.liar      🔥 Spicy    / Intens sesuai batas bersama
│     .btn-start "Mulai sekarang" · showCustomOverlay() button
├── h1 "💋 Truth or Dare" · .subtitle "for couples · 18+" · #mood-badge-bar
├── .player-cards
│     .player-card #pcard-0 / #pcard-1
│       #pname-N > #picon-N + #pname-text-N + .heat-badge#heat-badge-N
│       .pcard-pos#ppos-N · #pturn-N · #pstat-mini-N
│       .streak-badge#streak-N · .joker-token#joker-N
│       #skip-tod-btn-N (hidden by default)
├── .game-layout#game-layout
│     .board-wrap
│       #board (10×10 .cell grid) · svg#board-overlay · #pion-layer
│     .side-panel
│       svg#dice-wrap (role=button) · .btn-roll#btn-roll · .legend
│       .game-duration > #duration-display
│       .game-log#game-log (aria-live polite)
│       row: .btn-stats · #btn-music · #btn-mute · #btn-theme
│       .btn-reset
├── #stats-overlay > .stats-card > #stats-body + .btn-close-stats
├── #tod-overlay > .tod-card-flipper > .tod-card-inner#import
│     #tod-card > .tod-header (#tod-badge, #tod-sq) · .level-bar #lpip-0..2
│       #level-label · #tod-timer (#timer-ring, #timer-text,
│       #timer-level-hint, #btn-timer-start, #btn-timer-skip)
│       #tod-body-wrap > #tod-body · #btn-joker · #skip-warning
├── #winner-overlay > .winner-card (#winner-name, #winner-stats-body, buttons)
├── #recap-overlay > canvas#recap-canvas 360×640
├── #rules-overlay > ol (16 rules)
├── #custom-overlay > .custom-tabs #ctab-truth/#ctab-dare,
│     #custom-input (maxlength 160), .btn-custom-add,
│     #custom-input-error (role=alert), #custom-list
└── canvas#confetti-canvas
```

---

## 5. Bugs / risks found before the redesign

Carried forward from `docs/AUDIT.md`; all previously fixed or documented except the
ones marked open.

| ID | Issue | Status |
|---|---|---|
| VF-01 | DOM XSS via challenge text | **FIXED** — text nodes only in `renderTodChallenge` |
| VF-02 | Berani label said −5, code applied −3 | **FIXED** |
| VF-03 | Stale mood label after `resumeGame` | **FIXED** |
| VF-04 | `checkSavedGame` skipped validation | **FIXED** |
| VF-05 | 18+ gate is client-side only, bypassable via DevTools | **DOCUMENTED — residual, cannot be fixed without a backend. Must never be described as server-backed.** |
| VF-06 | No-repeat history lost on resume | **FIXED** |
| A-01 | `turn` unbounded in save → crash on load | **FIXED** — schema range [0,1] |
| A-02 | `pos` unbounded → tokens render off-board | **FIXED** — range [1,100] |
| A-03 | Non-string custom challenge items → `.replace` crash | **FIXED** — filtered, capped at 15 |
| A-04 | Dead `challenge` variable | **FIXED** |

### New risks identified for the redesign

| ID | Risk | Mitigation |
|---|---|---|
| R-01 | `style.css` inline-styled elements (`#tod-card` border/shadow, `#mood-badge-bar`, `.tod-challenge` font-size) are written by `game.js` at runtime and will outrank stylesheet rules. | Wrap the writing functions, or use `!important` on a narrow selector list. |
| R-02 | Snake/ladder SVG colours are literal strings in generated markup; no classes exist to target. | Post-render colour pass on `#board-overlay` inside a `drawSnakesLadders` wrapper. Map exact old colour strings → new ones. Coordinates untouched. |
| R-03 | `.cell` recolouring must not break `--ink` text contrast on cell numbers, which use a 4-layer paper text-shadow. | Keep the number knockout shadow or replace it with an equivalent. |
| R-04 | `body.dark` currently *is* the dark theme. Midnight Desire is dark by default; leaving the toggle as-is would produce two dark themes. | Redefine the toggle as "ivory candlelight / midnight": `body.dark` becomes a lighter parchment variant, or the toggle is relabelled. Decide in `REDESIGN_PLAN.md` §5. |
| R-05 | `#heat-overlay` intensifies with heat level and is already tinted. A new palette could oversaturate it. | Retune heat-1/2/3 opacity in the patch. |
| R-06 | Existing `prefers-reduced-motion` block sets `animation-duration:.01ms !important` globally. Any cinematic entrance added must degrade to a static state, not vanish. | Entrances animate `opacity`/`transform` from a **visible-at-rest** base. |

---

## 6. Invariants that must not be touched

1. **Board numbering.** `buildBoard()` computes
   `n = (9-row)*10 + ((9-row)%2===0 ? col : 9-col) + 1`; square 100 is top-left.
   `squareToPercent(n)` is its exact inverse. Both are read-only.
2. **Snake / ladder mapping.** `SNAKES = {98:78,95:56,87:36,64:60,62:19,56:53,49:11,47:26,16:6}`,
   `LADDERS = {4:14,9:31,20:38,28:84,40:59,51:67,63:81,71:91}`. Appearance may change;
   the mapping and the `cellCenter()` endpoints may not.
3. **Challenge content.** `challenges-*.js` are read-only and unmodified. The three
   modes map as `romantis → CHALLENGES_ROMANTIS`, `playful → CHALLENGES_PLAYFUL`,
   `liar → CHALLENGES_LIAR` (verified in `getPool()`). No fourth mode exists.
4. **Escaping contract.** Raw text goes into text nodes; escaping happens exactly once,
   only at `innerHTML` boundaries. `renderTodChallenge()` must **not** re-escape.
5. **Save schema.** `tod_game_save_v2`, validates `pos` 1–100, `turn` 0–1, custom items
   as non-empty strings capped at 15.
6. **Patch pattern.** `var _origX = window.X` before reassignment. Never `function`.
7. **CSP.** No new external origins. `unsafe-inline` for style/script is inherent.
8. **No build system, no framework, no new dependency.**
9. **Asset paths relative**, case-exact, GitHub Pages compatible.

---

## 7. Audit conclusion

The codebase is a clean vanilla engine with a well-established override seam. Midnight
Desire can be delivered entirely through:

- `patch-improvements.css` — token remap + selector overrides + new visual system,
- `patch-improvements.js` — SVG recolour pass, inline-style wrappers, entrance motion,
- `index.html` — static text (`<title>`, subtitle, labels) only.

No engine function needs to be rewritten. No ID or selector needs to change.
