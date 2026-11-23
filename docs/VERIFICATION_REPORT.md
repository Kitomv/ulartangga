# VERIFICATION REPORT — Ular Tangga (PHASE 3 Independent QA)

**Target:** `ular-tangga-final.html` (single-file self-contained HTML)
**Backup:** `ular-tangga-final.html.bak` (untouched)
**Date:** 2026-11-23
**Mode:** Verification only — NO source modifications made.
**Method:** Static source review + JS syntax parse (`new Function`) of all 4 script blocks. Browser-based tests (TEST 6/7/8) NOT TESTED — no browser automation available in this session; Playwright not detected.

---

## Result key
- **PASS** — requirement verified in source
- **FAIL** — requirement violated / defect found
- **NOT TESTED** — requires live browser; could not execute
- **INCONCLUSIVE** — static evidence ambiguous; needs runtime confirmation

---

## TEST 1 — XSS VERIFICATION

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1.1 | Player 1/2 name neutralized | PASS | `validatePlayerName()` escapes `&<>"'`, trims, 20-char cap, default `Kamu`; applied in `startGame()` (line 2204-2205), rendered via `textContent` (2208-2209) |
| 1.2 | Custom Truth/Dare neutralized | FAIL | `renderChallenge()` (line 3367-3369), `showDuoChallenge()` (3224-3226), `showBeraniChallenge()` (4095-4097) insert pool/challenge text via `innerHTML`. Only `{AKU}`/`{KAMU}` replacement values are escaped — the challenge template text itself (incl. user-added `customTruths`/`customDares`) is inserted RAW. Payload `<img src=x onerror=alert(1)>{AKU}` executes. |
| 1.3 | Saved game data neutralized | PASS | `loadGame()` → `validateSaveData()` schema-validates before restore; player names validated/sanitized (4444-4449); rendered escaped via `escapeHtml()` in `checkSavedGame()` banner (4552-4553) |
| 1.4 | Export filename neutralized | PASS | `downloadRecap()` uses `sanitizeFilename()` + `.png` (3760); `sanitizeFilename()` blocks `..`, caps 60 chars, allows alnum/space/_/- only |
| 1.5 | No `<script>` / `eval` / `innerHTML` with user data | PARTIAL | No `eval`/`new Function` with user data. Remaining `innerHTML` targets use trusted internal SVG catalog or escaped text, EXCEPT custom challenge pool text (see 1.2). |
| 1.6 | Malformed Unicode / long strings | INCONCLUSIVE | No explicit length/Unicode guard on custom challenges beyond `maxItems=15` (4022). Needs runtime fuzz. |

**TEST 1 overall: FAIL** — residual DOM XSS via custom Truth/Dare challenge text rendered unescaped through `innerHTML`.

---

## TEST 2 — STORAGE ADVERSARIAL TESTING

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 2.1 | Missing fields | PASS | `validateSaveData()` returns `ok:false` for required missing fields (4403-4406) |
| 2.2 | Invalid data types | PASS | type/enum/length checks per `SAVE_SCHEMA` (4422-4439) |
| 2.3 | Invalid mood values | PASS | `currentMood` enum `['romantis','playful','liar']` (4373) |
| 2.4 | Invalid player colors | PASS | `colorHex` regex `/^#[0-9a-fA-F]{3,6}$/` fallback (4447) |
| 2.5 | Invalid player positions | PASS | `pos` array len 2 of finite numbers (4364, 4431) |
| 2.6 | Negative statistics | PASS | stats cleaned per-key, non-number → default 0 (4453-4460); no negativity guard but values coerced to defaults on invalid |
| 2.7 | Oversized custom challenges | PARTIAL | `maxItems=15` in UI (4022), but schema doesn't bound `customTruths`/`customDares` string length or array length (4383-4384, type `array` no `len`) |
| 2.8 | Malformed JSON | PASS | `JSON.parse` in try/catch → `ok:false` (4395) |
| 2.9 | Unexpected object properties | PASS | Schema-driven allowlist; unknown keys ignored (not copied to `out`) |
| 2.10 | Expired saves | PASS | 24h `ts` expiry → `ok:false` (4400) |
| 2.11 | Corrupted saves | PASS | `try/catch` + schema reject → `loadGame()` returns `false`, no restore (4506-4531) |
| 2.12 | `checkSavedGame()` validation gap | INCONCLUSIVE | `checkSavedGame()` parses `JSON.parse(raw)` directly (4537) with its own expiry check, bypassing `validateSaveData`; wrapped in try/catch so no crash, but inconsistent with `loadGame()` |

**TEST 2 overall: PASS** (core save validation robust; minor inconsistency in `checkSavedGame()` documented as VF-04).

---

## TEST 3 — GAMEPLAY REGRESSION (all 3 modes)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 3.1 | Deep Talk absent | PASS | Zero matches for `deep.talk` / `Deep Talk` / `DEEP TALK` |
| 3.2 | Mode labels Romantic/Teasing/Spicy | PARTIAL | `startGame()` mood badge uses `Romantic`/`Teasing`/`Spicy` (2219-2222); `resumeGame()` mood badge uses OLD labels `Romantis`/`Playful`/`Liar` (4586) — inconsistent |
| 3.3 | Truth selection (each mode) | PASS | `renderChallenge('truth',...)` reads per-mood pool via `getPool()` → `CHALLENGES_*` |
| 3.4 | Dare selection (each mode) | PASS | `renderChallenge('dare',...)` per-mood pool |
| 3.5 | No-repeat behavior | PASS | `usedTruthSet`/`usedDareSet` keyed by mood (1971-1972); `pickUnused` filters within active mood's set (1981-1993); reset per-mode in `startGame`/`goToMoodScreen`/`confirmReset` |
| 3.6 | Pool exhaustion | PASS | `pickUnused` resets the exhausted mood's set and logs "Pool kartu habis" (1984-1988) |
| 3.7 | Skip behavior | PARTIAL | Penalty unified to −3 for all types (3506); streak >2 still penalizes −3 then resets (3500-3504); BUT berani skip button text says `(−5)` while code applies −3 (4105) — UI/logic mismatch |
| 3.8 | Turn rotation | PASS | `nextTurn()` toggles `turn = (turn+1) % 2` (3541-3547) |
| 3.9 | Player position | PASS | `pos` array, snake/ladder via `pendAfter`, clamp `Math.max(1, ...)` |
| 3.10 | Score & statistics | PASS | `stats` updated in `resolveAfterTOD` per type (4434-4437) |

**TEST 3 overall: FAIL** — berani skip button displays `−5` but code applies `−3`; resume mood badge uses stale labels.

---

## TEST 4 — SAVE & RESUME

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 4.1 | Save persists positions | PASS | `saveGame()` writes `pos`, `turn`, `phase`, etc. (4490-4501) |
| 4.2 | Save persists custom pawns | PASS | `selectedPion` saved/restored (4498, 4526); `resumeGame()` calls `initPionPickers()` (4600) |
| 4.3 | Save persists custom Truth/Dare | PASS | `customTruths`/`customDares` saved (4498) and restored (4527-4528) |
| 4.4 | Resume after refresh | PASS | `loadGame()` + `validateSaveData()`; `resumeGame()` applies state, rebuilds board/pions (4571-4611) |
| 4.5 | Corrupt/expired save rejected | PASS | `loadGame()` returns `false`; banner never shown (4533-4568 guarded) |
| 4.6 | Full state restoration | PARTIAL | `usedTruth`/`usedDare`/`usedDuo` restored (4522-4524); `usedTruthSet`/`usedDareSet` are NOT restored from save (only re-initialized empty in `startGame`/`goToMoodScreen`) — no-repeat history lost after resume |

**TEST 4 overall: PASS** (with VF-06: no-repeat history not persisted across resume).

---

## TEST 5 — CONSENT BYPASS

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 5.1 | Start without consent blocked | PASS | `startGame()` returns early if `!ageConsented` (2203) |
| 5.2 | One checkbox only | PASS | `updateAgeConfirmBtn()` enables confirm only when both checked (2014-2025); button disabled otherwise |
| 5.3 | Both checkboxes | PASS | `confirmAge()` sets `ageConsented=true`, shows name screen (2027-2036) |
| 5.4 | Refresh before consent | PASS | `ageConsented = false` initialized at load (2013); consent screen shown first (1040-1062) |
| 5.5 | Direct `startGame()` console call | BYPASSABLE | `ageConsented` is a global JS variable; `ageConsented = true; startGame()` from console bypasses gate. Inherent to client-side-only design — NOT cryptographic/unbypassable. |
| 5.6 | Manipulating consent variables | BYPASSABLE | Same as 5.5 — client-side state is inspectable/modifiable via DevTools |

**TEST 5 overall: PASS** (gate enforced by application state, not just CSS) — with explicit note: client-side consent is trivially bypassable via console; do not describe as unbypassable.

---

## TEST 6 — OFFLINE VERIFICATION

**NOT TESTED** — cannot disable network / inspect browser DevTools network panel in this session.

Static evidence: Google Fonts `<link>` removed (no `fonts.googleapis.com`/`fonts.gstatic.com`); all assets are inline/data-URI; CSP `connect-src 'self'; font-src 'self'`. No `fetch`/`XMLHttpRequest`/external `<script src>` found. Game is fully self-contained.

---

## TEST 7 — MOBILE QA

**NOT TESTED** — no browser/device emulation available. Static evidence: viewport meta present (line 5); media query at 600px for cell badges (287-295); `overflow-x: hidden` on body (70); touch targets present. Requires runtime verification at 320/375/390/430/768 viewports.

---

## TEST 8 — AUTOMATED TESTING (Playwright)

**NOT TESTED** — Playwright not detected in this environment; no browser automation executed. Per instructions, not claiming tests were executed.

---

## REGRESSION TEST SCRIPT (REGRESSION_TESTS.md) — STATIC REVIEW

| Assertion | Result | Notes |
|-----------|--------|-------|
| escapeHtml neutralizes `<script>` | PASS | function present (2167-2175) |
| validatePlayerName trims/escapes/caps | PASS | function present (2188-2200) |
| validateSaveData rejects garbage/`{}`/`null` | PASS | (4393-4396) |
| validateSaveData rejects expired saves | PASS | (4400) |
| validateSaveData accepts valid save | PASS | (4392-4474) |
| sanitizeFilename blocks `../../etc/passwd` | INCONCLUSIVE | actual code yields `______etc_passwd` (dots/slashes→`_`), test expects `____etc_passwd` — test expectation may be off; needs runtime |
| skip penalty −3 (no `berani ? 5 : 3`) | PASS | no ternary found; `penalty = 3` (3506) |
| skip streak >2 penalizes | PASS | `Skip limit tercapai` branch (3500-3504) |
| selectMood invalid → romantis | PASS | validation (2048-2051) |
| per-mode no-repeat Sets keyed by mood | PASS | (1971-1972) |
| ageConsented starts false | PASS | (2013) |
| startGame blocked without consent | PASS | (2203) |

---

## JS SYNTAX

All 4 embedded `<script>` blocks parse via `new Function()`: OK. No syntax errors.

---

## CONCLUSION

Phase 2 remediation is substantially complete and correct for the core security requirements (DOM XSS on player names, save schema validation, expiry, filename sanitization, CSP, Google Fonts removal, consent gate, per-mode no-repeat, unified skip penalty, save/restore).

**Residual defects found during independent verification (not in FIX_REPORT.md):**
- VF-01: DOM XSS via custom Truth/Dare challenge text (unescaped `innerHTML`) — HIGH
- VF-02: berani skip button shows `−5` but code applies `−3` — MEDIUM
- VF-03: `resumeGame()` mood badge uses stale labels `Romantis`/`Playful`/`Liar` — LOW
- VF-04: `checkSavedGame()` parses/validates outside `validateSaveData` — LOW
- VF-05: consent gate is client-side only, trivially bypassable via console — MEDIUM (inherent)
- VF-06: no-repeat history (`usedTruthSet`/`usedDareSet`) not persisted across resume — LOW

No source files were modified. See `VERIFIED_FINDINGS.md` and `FAILED_TESTS.md` for details.
