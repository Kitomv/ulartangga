# VERIFIED FINDINGS — Ular Tangga (PHASE 3 Independent QA)

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Method:** Static source review + JS syntax parse. No source modified.

Severity key: CRITICAL / HIGH / MEDIUM / LOW / INFO

---

## VF-01 — DOM XSS via custom Truth/Dare challenge text (unescaped innerHTML)

**Severity:** HIGH  
**Status:** UNRESOLVED (residual from Phase 2)

**Root cause:** Custom challenge text is inserted into the DOM via `innerHTML` without escaping the pool/challenge string itself. Only `{AKU}`/`{KAMU}` replacement values are escaped via `escapeHtml()`.

**Locations:**
- `renderChallenge()` line 3367-3369 — `challenge` (from `customTruths`/`customDares` or static pool) inserted raw into `tod-body.innerHTML`
- `showDuoChallenge()` line 3224-3226 — `duoChosen` inserted raw
- `showBeraniChallenge()` line 4095-4097 — `beraniChosen` inserted raw
- `showJokerCell()` line 3204-3216 — joker count escaped but static template only

**Reproduction:**
1. Open game, pass consent, enter names, start.
2. Open custom challenge overlay, add a custom Dare:
   `<img src=x onerror=alert(1)>{AKU}`
3. Play until a Dare cell is hit and the custom challenge is selected (35% chance; or exhaust pool).
4. `alert(1)` executes in the page origin.

**Why it matters:** `customTruths`/`customDares` are fully user-controlled (added via `addCustomTantangan()`, line 4018-4030) and persisted to localStorage via `saveGame()` (4498). Reloading restores them (`loadGame()` 4527-4528) and they re-execute on render. Persistent (self-)XSS.

**Fix direction:** Apply `escapeHtml()` to the full challenge string before the `{AKU}`/`{KAMU}` replacement, or use the existing `setTodBody()` safe-DOM builder (defined line 2132 but currently unused) instead of `innerHTML`.

**Note:** Static challenge pools (`CHALLENGES_*`) contain no markup, so they are not currently an injection vector — only user-added custom challenges are.

---

## VF-02 — berani skip button displays `−5` but code applies `−3`

**Severity:** MEDIUM  
**Status:** UNRESOLVED

**Root cause:** UI text not updated to match the unified skip penalty.

**Location:** `showBeraniChallenge()` line 4105:
```html
<button class="btn-skip" onclick="todDone(false)" ...>⚠️ Tidak Berani (−5)</button>
```

**Actual penalty:** `resolveAfterTOD()` line 3506 `const penalty = 3;` — applies to all skip types including berani (F-02/F-03 remediation). `usedBeraniSet` / `−5` special case was removed from logic but the button label remains.

**Reproduction:** Enter Spicy (liar) mode, land on a berani cell, click Skip → player moves back 3, not 5. Button says −5.

**Fix direction:** Change button text to `(−3)` to match behavior.

---

## VF-03 — `resumeGame()` mood badge uses stale labels

**Severity:** LOW  
**Status:** UNRESOLVED

**Root cause:** Mode rename (ROMANTIS→ROMANTIC, PLAYFUL→TEASING, LIAR→SPICY) not fully applied in resume path.

**Location:** `resumeGame()` line 4586:
```js
const MOOD_META = { romantis:{emoji:'💕',label:'Romantis',...}, playful:{emoji:'😜',label:'Playful',...}, liar:{emoji:'🔥',label:'Liar',...} };
```
Contrast `startGame()` lines 2219-2222 which correctly use `Romantic`/`Teasing`/`Spicy`.

**Reproduction:** Save a game, refresh, resume → mood badge shows `Mode Romantis`/`Mode Playful`/`Mode Liar` instead of `Romantic`/`Teasing`/`Spicy`.

**Fix direction:** Update `resumeGame()` `MOOD_META` labels to match `startGame()`.

---

## VF-04 — `checkSavedGame()` validates save outside `validateSaveData`

**Severity:** LOW  
**Status:** UNRESOLVED (defense-in-depth gap)

**Root cause:** `checkSavedGame()` (4533-4569) parses `JSON.parse(raw)` directly (line 4537) and performs its own expiry check (4538) instead of delegating to `validateSaveData()`. Wrapped in try/catch so no crash, but duplicates validation logic and could diverge from `loadGame()`.

**Reproduction:** Not directly exploitable (try/catch present). Inconsistent validation surface.

**Fix direction:** Have `checkSavedGame()` call `validateSaveData()` and only show the banner when `ok === true`.

---

## VF-05 — Consent gate is client-side only, trivially bypassable via console

**Severity:** MEDIUM (inherent to design)  
**Status:** DOCUMENTED (not a code defect per se)

**Root cause:** `ageConsented` is a global JavaScript variable (line 2013). `startGame()` checks it (2203), but nothing server-side enforces consent.

**Reproduction:** Open DevTools Console, run `ageConsented = true; startGame();` — game starts without either checkbox checked.

**Note:** This is inherent to a single-file client-side game with no backend. The Phase 2 requirement is satisfied (gate enforced by application state, not just CSS), but it must NOT be described as cryptographic, unbypassable, or server-enforced.

---

## VF-06 — No-repeat history not persisted across save/resume

**Severity:** LOW  
**Status:** UNRESOLVED

**Root cause:** `usedTruthSet`/`usedDareSet` (per-mode no-repeat Sets, lines 1971-1972) are re-initialized empty in `startGame()` (2242-2243) and `goToMoodScreen()` (3575-3576), but `saveGame()` does not persist them and `loadGame()` does not restore them. `usedTruth`/`usedDare` (per-level arrays, 1976-1977) ARE persisted/restored, but the mood-keyed Sets are not.

**Reproduction:** Play some Truths in Romantic mode, save, refresh, resume → previously-shown Truths can repeat immediately.

**Fix direction:** Persist `usedTruthSet`/`usedDareSet` as serializable arrays in `saveGame()` and rebuild the Sets in `loadGame()`.

---

## VERIFIED FIXED (from Phase 2 — confirmed present and correct)

| ID | Finding | Status |
|----|---------|--------|
| V-01 | DOM XSS via `innerHTML` player name in `showTOD` badge | FIXED — `escapeHtml()` + `textContent`/DOM append (3156-3161) |
| V-02 | DOM XSS in challenge `{AKU}`/`{KAMU}` | FIXED — names escaped before interpolation (3222-3223, 3365-3366, 4084-4085) — see VF-01 for remaining pool-text gap |
| V-03 | localStorage loaded without schema validation | FIXED — `SAVE_SCHEMA` + `validateSaveData()` (4363-4474) |
| V-04 | No expiry/corruption handling | FIXED — 24h `ts` expiry + reject (4400); corrupt saves → `ok:false` |
| V-05 | Recap filename unsanitized | FIXED — `sanitizeFilename()` (3760, 2178-2185) |
| V-06 | Google Fonts external dependency | FIXED — removed; `--font-ui` system stack (59) |
| V-07 | No CSP | FIXED — CSP meta tag present (line 8) |

F-01..F-05 game logic: confirmed fixed (per-mode Sets, unified −3 skip, streak penalty, mood validation, save/restore of custom fields).

---

## Unresolved findings summary

HIGH: VF-01  
MEDIUM: VF-02, VF-05  
LOW: VF-03, VF-04, VF-06
