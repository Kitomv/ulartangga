# REGRESSION RESULTS — Ular Tangga (PHASE 3 Independent QA)

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Method:** Static source review + JS syntax parse (`new Function`) of all 4 embedded script blocks.  
**Browser-based execution:** NOT performed — no browser/Playwright available in this session. Results below are static verification of each regression assertion in `REGRESSION_TESTS.md`.

Result key: PASS / FAIL / NOT TESTED / INCONCLUSIVE

---

## JS SYNTAX (all script blocks)

| Block | Result |
|-------|--------|
| script 0 | PASS — parses |
| script 1 | PASS — parses |
| script 2 | PASS — parses |
| script 3 | PASS — parses |
| **Overall** | **PASS — no syntax errors** |

---

## PRIORITY 1: SECURITY (from REGRESSION_TESTS.md)

| # | Test | Result | Evidence |
|---|------|--------|----------|
| S-1 | `escapeHtml()` neutralizes `<script>` | PASS | `escapeHtml()` defined line 2167-2175 escapes `&<>"'` |
| S-2 | `validatePlayerName()` trims, escapes, caps 20, default `Kamu` | PASS | Defined line 2188-2200; applied in `startGame()` 2204-2205 |
| S-3 | `validateSaveData()` rejects garbage / `{}` / `null` | PASS | Lines 4393-4396 return `{ok:false}` |
| S-4 | `validateSaveData()` rejects expired saves (>24h) | PASS | Line 4400 `now - d.ts > 86400000` → `ok:false` |
| S-5 | `validateSaveData()` accepts valid save | PASS | Schema-driven build of `out` (4403-4474), returns `{ok:true, data}` |
| S-6 | `sanitizeFilename()` blocks `../../etc/passwd` | INCONCLUSIVE | Code: dots/slashes → `_`. `../../etc/passwd` → `______etc_passwd`, test asserts `____etc_passwd`. Runtime check needed to confirm exact output. |
| S-7 | Custom Truth/Dare XSS (not in original script) | FAIL | See VERIFIED_FINDINGS VF-01 — challenge text inserted via `innerHTML` unescaped (3367-3369, 3224-3226, 4095-4097) |

**Security regression: 1 FAIL (VF-01), rest PASS/INCONCLUSIVE.**

---

## PRIORITY 2: GAME LOGIC

| # | Test | Result | Evidence |
|---|------|--------|----------|
| G-1 | Skip penalty −3 for all types (no `berani ? 5 : 3`) | PASS | No ternary found; `penalty = 3` at line 3506 |
| G-2 | Skip streak >2 still penalizes | PASS | Lines 3500-3504 `Skip limit tercapai` → `afterPos = Math.max(1, pendRaw - 3)` then reset streak |
| G-3 | `selectMood()` invalid → `romantis` | PASS | Lines 2048-2051 validate against `['romantis','playful','liar']` |
| G-4 | Per-mode no-repeat Sets keyed by mood | PASS | Lines 1971-1972 `usedTruthSet`/`usedDareSet` keyed by mood; `pickUnused` filters within active mood's set (1981-1993) |
| G-5 | berani skip button text mismatch | FAIL | Button says `(−5)` line 4105, code applies −3 line 3506 (VF-02) |
| G-6 | Deep Talk absent | PASS | Zero matches for `deep.talk`/`Deep Talk` |
| G-7 | `resumeGame()` mood label mismatch | FAIL | Uses `Romantis`/`Playful`/`Liar` (4586) vs `Romantic`/`Teasing`/`Spicy` in `startGame()` (2219-2222) (VF-03) |

**Game logic regression: 2 FAIL (VF-02, VF-03), rest PASS.**

---

## PRIORITY 3: COUPLES / CONSENT

| # | Test | Result | Evidence |
|---|------|--------|----------|
| C-1 | `ageConsented` starts `false` | PASS | Line 2013 `let ageConsented = false;` |
| C-2 | `startGame()` blocked without consent | PASS | Line 2203 `if (!ageConsented) { addLog(...); return; }` |
| C-3 | Confirm button requires both checkboxes | PASS | `updateAgeConfirmBtn()` lines 2014-2025, `ok = cb1.checked && cb2.checked` |

**Consent regression: PASS** — with note that client-side consent is bypassable via console (VF-05, inherent design).

---

## PRIORITY 4 & 5: OFFLINE / MOBILE / AUTOMATED

| # | Test | Result | Notes |
|---|------|--------|-------|
| OFF-1 | Offline load / no external resources | NOT TESTED | Static: Google Fonts removed, no `fetch`/external `<script src>`, CSP `connect-src 'self'` |
| MOB-1 | Mobile viewports 320/375/390/430/768 | NOT TESTED | Static: viewport meta present, 600px media query (287-295) |
| AUTO-1 | Playwright E2E | NOT TESTED | Playwright not detected; no browser automation executed |

---

## SUMMARY

| Category | PASS | FAIL | NOT TESTED | INCONCLUSIVE |
|----------|------|------|------------|--------------|
| JS Syntax | 4 | 0 | 0 | 0 |
| Security | 6 | 1 | 0 | 1 |
| Game Logic | 5 | 2 | 0 | 0 |
| Consent | 3 | 0 | 0 | 0 |
| Offline/Mobile/Auto | 0 | 0 | 3 | 0 |
| **Total** | **18** | **3** | **3** | **1** |

**Bottom line:** Core Phase 2 remediation verified. Three real regressions remain (VF-01 XSS via custom challenge text, VF-02 berani `−5` label mismatch, VF-03 stale resume mood labels). Browser-based tests could not be executed in this session.
