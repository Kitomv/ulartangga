# PHASE 5 REGRESSION REPORT — Ular Tangga

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Method:** Static source review + CSP directive verification + `new Function` syntax parse of all 4 embedded `<script>` blocks.  
**Browser-based execution:** NOT TESTED (no browser/Playwright available) — marked NOT TESTED, not claimed as executed.

---

## CSP fix verification

| # | Test | Result | Evidence |
|---|------|--------|----------|
| C-1 | `script-src 'self' 'unsafe-inline'` present in CSP meta | PASS | Line 8 verified via source read |
| C-2 | `default-src 'self'` retained as restrictive baseline | PASS | Line 8 |
| C-3 | All 4 embedded `<script>` blocks parse (`new Function`) | PASS | Lines 1359, 1460, 1561, 1720 |
| C-4 | Inline handlers (`onclick`) now permitted by CSP | PASS | `script-src 'unsafe-inline'` allows inline execution |

**CSP regression: PASS**

---

## Phase 4 security regression (confirming protections intact)

| # | Test | Result | Evidence |
|---|------|--------|----------|
| P4-1 | `renderTodChallenge()` escapes challenge text via `escapeHtml()` | PASS | Line 2171-2193 |
| P4-2 | Custom Truth/Dare paths use `renderTodChallenge` (no `innerHTML` for user text) | PASS | Lines ~3367, ~3412, ~4175 |
| P4-3 | `escapeHtml()` applied to player names | PASS | Lines 2232-2244, applied in `startGame` (2248-2249) |
| P4-4 | `validateSaveData()` rejects malformed/expired/invalid saves | PASS | Line 4465+ |
| P4-5 | `checkSavedGame()` delegates to `validateSaveData()` | PASS | Lines 4588, 4621 |
| P4-6 | `ageConsented` starts `false`, `startGame()` blocked without consent | PASS | Lines 2029, 2247 |
| P4-7 | Confirm button requires both checkboxes | PASS | Line 2035 `ok = cb1.checked && cb2.checked` |
| P4-8 | Skip penalty unified at `penalty = 3` | PASS | Line 3572 |
| P4-9 | berani button text `(−3)` / rule `3 kotak` | PASS | Line 4170 |
| P4-10 | `resumeGame()` mood labels Romantic/Teasing/Spicy | PASS | Line 4674 |
| P4-11 | Deep Talk absent | PASS | Zero matches for `deep.talk`/`Deep Talk` |
| P4-12 | Exactly three modes preserved (`romantis`/`playful`/`liar`) | PASS | `selectMood` valid list (line 2065), `SAVE_SCHEMA` enum (4444) |

**Phase 4 security regression: PASS**

---

## Game logic / flow checks (static)

| # | Test | Result | Evidence |
|---|------|--------|----------|
| G-1 | `selectMood()` responds to mood buttons (`onclick="selectMood('...')"`) | PASS | Lines 1098-1112; `selectMood` line 2064 |
| G-2 | `currentMood` initialized to `romantis` | PASS | Line 1940 |
| G-3 | `startGame()` gated on `ageConsented` | PASS | Line 2247 |
| G-4 | `confirmAge()` sets `ageConsented = true` and proceeds to name screen | PASS | Lines 2043-2052 |
| G-5 | `startGame()` initializes board, players, sets, UI | PASS | Lines 2246-2297 |
| G-6 | No duplicate function declarations found for changed functions | PASS | Source scan |
| G-7 | All referenced element IDs exist in DOM (`mood-romantis`, `btn-age-confirm`, `name0`, `name1`, etc.) | PASS | Lines 1058-1115 |

**Game logic regression: PASS**

---

## Summary

| Category | PASS | FAIL | NOT TESTED |
|----------|------|------|------------|
| CSP fix | 4 | 0 | 0 |
| Phase 4 security regression | 12 | 0 | 0 |
| Game logic / flow (static) | 7 | 0 | 0 |
| Browser flows (A–F per Phase 5 spec) | 0 | 0 | ~20 |
| **Total** | **23** | **0** | **~20** |

**Bottom line:** CSP root cause fixed. All Phase 4 protections verified intact via static inspection. Browser-based functional flows (mode selection, consent, play, board, dice/challenge) are NOT TESTED — no browser available; not claimed as executed.

Awaiting authorization before Phase 6.
