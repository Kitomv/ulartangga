# FIX REPORT — Ular Tangga (PHASE 2 Controlled Remediation)

**File remediated:** `ular-tangga-final.html`
**Backup:** `ular-tangga-final.html.bak` (untouched)
**Date:** 2026-11-23
**Publish/deploy:** None — local file only.

## Summary of changes

All changes are surgical and confined to `ular-tangga-final.html`. No new files added to the game itself (deliverables are sidecar markdown docs).

---

## PRIORITY 1 — Security

### V-01..V-0X DOM XSS via `innerHTML` with unsanitized player name
- Added `escapeHtml()` helper (amp/lt/gt/quote/apos).
- `validatePlayerName()` trims, caps at 20 chars, escapes HTML, defaults to `Kamu`.
- `startGame()` gated behind `ageConsented`, uses `validatePlayerName()` for both names.
- `showTOD` badge: replaced `badge.innerHTML = svgThumb + p.name` with safe DOM append (`thumb` SVG from trusted catalog + `escapeHtml(p.name)` as text node).
- `showDuoChallenge`, `showBeraniChallenge`, `renderChallenge`, custom truth/dare: `{AKU}`/`{KAMU}` replaced using `escapeHtml()`-escaped names.
- `buildStatsHTML`, `getAchievements`: player names escaped via `escapeHtml()`.
- `checkSavedGame()` resume banner: player names escaped before `innerHTML`.
- `resumeGame()` mood badge: replaced `innerHTML` template literal with `textContent` + inline style properties.
- `startGame()` and `resumeGame()` mood badge builders converted to style-properties + `textContent` (no `innerHTML`).

### V — localStorage save validation
- Added `SAVE_SCHEMA` (explicit schema: required fields, types, enums, array lengths).
- Added `validateSaveData(raw)` returning `{ ok, data }`: JSON parse guard, 24-hour expiry (`ts`), type/enum/length checks, player name + colorHex validation, stats sanitization, CELL_TYPE allowlist.
- `saveGame()` unchanged shape (writes same fields + `selectedPion`, `customTruths`, `customDares`).
- `loadGame()` rewritten to call `validateSaveData`; corrupt/expired/tampered saves return `false` (no restore).
- `checkSavedGame()` calls `loadGame()` via `resumeGame()`; invalid saves are ignored (banner never shown).

### V — Filename sanitization on recap export
- `downloadRecap()` uses `sanitizeFilename()` (allows alnum/space/underscore/hyphen, blocks `..`, trims to 60 chars, fallback `game`) + `.png`.

### V — External dependency removal
- Removed Google Fonts preconnect/stylesheet links from `<head>`.
- Removed global `user-select: none` reset (restored `user-select: text` on inputs/textarea).
- Body `font-family` now uses CSS var `--font-ui` (system stack).

### V — Content Security Policy
- Added `<meta http-equiv="Content-Security-Policy">`: `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none';`

---

## PRIORITY 2 — Game logic

### F-01 Per-mode no-repeat tracking
- `usedTruthSet` / `usedDareSet` are now objects keyed by mood (`{romantis, playful, liar}`), each holding a `Set`.
- `pickUnused(pool, usedSet)` filters within the active mood's set; resets only that set when exhausted.
- `renderChallenge` selects `usedTruthSet[currentMood]` / `usedDareSet[currentMood]`.
- All reset paths (`startGame`, `goToMoodScreen`, `confirmReset`) re-init per-mode sets.

### F-02 Consistent skip penalties
- Skip penalty unified to −3 for all types (removed `berani` special-case −5).

### F-03 Skip streak >2 penalty
- When `skipStreak[turn] > 2`: streak resets to 0 AND player still moves back −3 (was moved to `pendAfter` with no penalty).

### F-04 Invalid mood fallback validation
- `selectMood(mood)` validates against `['romantis','playful','liar']`; defaults to `romantis` on invalid input.

### F-05 Save/load restoration
- `saveGame()` now persists `selectedPion`, `customTruths`, `customDares`.
- `loadGame()` restores them with safe defaults (`[0,1]`, `[]`, `[]`).
- `resumeGame()` calls `initPionPickers()` so pion pickers reflect restored choices.

---

## PRIORITY 3 — Couples experience

- 18+ age-consent screen (`#age-consent-screen`) with two checkboxes; confirm button disabled until both checked.
- `confirmAge()` sets `ageConsented = true` and hides the consent screen.
- `startGame()` refuses to start without consent (logs a reminder).
- Both players can decline/stop via existing Skip flow; skip streak penalty now consistent.

---

## PRIORITY 4 — Offline / privacy

- Google Fonts removed (no external network calls).
- CSP restricts connections to `self`; no external fonts/scripts.
- Game is fully self-contained single-file HTML.

---

## PRIORITY 5 — QA

- JS syntax verified via `new Function()` parse: OK.
- No console.log/debug statements added.
- Functions kept small (<50 lines); no deep nesting introduced.

---

## Mode rename (UI-facing labels only)

| Internal key | Old UI label | New UI label |
|---|---|---|
| `romantis` | ROMANTIS | ROMANTIC |
| `playful` | PLAYFUL | TEASING |
| `liar` | LIAR | SPICY |

Internal keys intentionally unchanged (they drive save data, pools, CELL_TYPE). Mood badge labels updated to `Romantic` / `Teasing` / `Spicy`.

---

## Remaining / unresolved

None known at this time. All items from the PHASE 2 requirements list are addressed.
