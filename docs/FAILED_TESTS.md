# FAILED TESTS — Ular Tangga (PHASE 3 Independent QA)

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Method:** Static source review + JS syntax parse. No source modified.  
**Note:** Browser-dependent tests (TEST 6/7/8) were NOT executed — marked NOT TESTED, not FAIL.

---

## FAIL — TEST 1: XSS Verification

### T-1.2 | Custom Truth/Dare challenge text rendered unescaped via innerHTML

**Requirement:** User-controlled custom challenge text must not execute as HTML/JS.

**Result:** FAIL

**Evidence:**
- `renderChallenge()` line 3367-3369 inserts `challenge` (derived from `customTruths`/`customDares`) into `tod-body.innerHTML` without escaping the template text.
- `showDuoChallenge()` line 3224-3226 inserts `duoChosen` raw.
- `showBeraniChallenge()` line 4095-4097 inserts `beraniChosen` raw.
- Only `{AKU}`/`{KAMU}` replacement values are escaped via `escapeHtml()`; the challenge body itself is not.

**Reproduction:**
1. Open game, pass 18+ consent, enter names, start.
2. Open custom challenge overlay → add a custom Dare: `<img src=x onerror=alert(1)>{AKU}`
3. Play until a Dare cell triggers the custom challenge → `alert(1)` executes.
4. Save + reload → custom challenge persists and re-executes (persistent self-XSS).

**Remediation:** Escape the full challenge string before `{AKU}`/`{KAMU}` substitution, or route through the existing `setTodBody()` safe-DOM builder (line 2132, currently unused) instead of `innerHTML`.

---

### T-1.6 | Malformed Unicode / extremely long custom strings

**Result:** INCONCLUSIVE (static only)

**Evidence:** `addCustomTantangan()` (4018-4030) caps count at `maxItems=15` but imposes no per-string length or Unicode validation. `validateSaveData()` does not bound `customTruths`/`customDares` string length (schema type `array`, no `len`, 4383-4384).

**Remediation:** Add per-entry max length + schema `len` bound for custom challenge arrays.

---

## FAIL — TEST 3: Gameplay Regression

### T-3.7 | berani skip button displays `−5` but code applies `−3`

**Requirement:** Skip penalty consistent across all types (F-02).

**Result:** FAIL (UI/logic mismatch)

**Evidence:**
- `showBeraniChallenge()` line 4105: button text `⚠️ Tidak Berani (−5)`
- `resolveAfterTOD()` line 3506: `const penalty = 3;` (applies to all types)

**Reproduction:** Spicy mode → berani cell → Skip → player moves back 3, button claims 5.

**Remediation:** Change button text to `(−3)`.

---

### T-3.2 (partial) | `resumeGame()` mood badge uses stale labels

**Requirement:** Mode labels Romantic / Teasing / Spicy everywhere.

**Result:** FAIL (cosmetic, resume path only)

**Evidence:** `startGame()` lines 2219-2222 uses `Romantic`/`Teasing`/`Spicy`. `resumeGame()` line 4586 uses `Romantis`/`Playful`/`Liar`.

**Remediation:** Align `resumeGame()` `MOOD_META` labels with `startGame()`.

---

## INCONCLUSIVE — TEST 2: Storage (validation gap)

### T-2.12 | `checkSavedGame()` parses JSON outside `validateSaveData`

**Result:** INCONCLUSIVE (not exploitable via crash, but inconsistent)

**Evidence:** `checkSavedGame()` line 4537 `JSON.parse(raw)` with own expiry check (4538), bypassing `validateSaveData()`. Wrapped in try/catch (4534-4568) so no crash.

**Remediation:** Delegate to `validateSaveData()` and show banner only when `ok === true`.

---

## INCONCLUSIVE — TEST 4: Save & Resume

### T-4.6 | No-repeat history not persisted across resume

**Result:** INCONCLUSIVE (behavioral gap, not a crash)

**Evidence:** `usedTruthSet`/`usedDareSet` re-initialized empty in `startGame()` (2242-2243) and `goToMoodScreen()` (3575-3576); not in `saveGame()` (4490-4501) or `loadGame()` (4506-4531). Previously-shown challenges can repeat after resume.

---

## BYPASSABLE (by design) — TEST 5: Consent

### T-5.5 / T-5.6 | Client-side consent bypassable via console

**Result:** BYPASSABLE (inherent, not a fixable code defect in single-file client model)

**Evidence:** `ageConsented` global (2013); `startGame()` checks it (2203). Console: `ageConsented = true; startGame()` bypasses both checkboxes.

**Remediation:** None possible without backend. Document as non-cryptographic, non-unbypassable. (Already noted in SECURITY_STATUS.md residual risk.)

---

## NOT TESTED

- TEST 6 Offline Verification — no browser/network control available.
- TEST 7 Mobile QA — no device/browser emulation available.
- TEST 8 Automated (Playwright) — Playwright not detected; no browser automation executed.

Per instructions: no claim made that these tests were executed.

---

## Regression Test Script (REGRESSION_TESTS.md) — static assertions

All assertions either PASS via static review or are INCONCLUSIVE (require browser runtime). None FAIL as source defects beyond T-1.2 / T-3.7 above. See `VERIFICATION_REPORT.md` for the full assertion-by-assertion review.
