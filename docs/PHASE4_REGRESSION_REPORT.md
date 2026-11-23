# PHASE 4 REGRESSION REPORT — Ular Tangga

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Method:** Executable DOM-stub harness (XSS payloads, save/load round-trip, consent gate) + static source review + `new Function` syntax parse of all 4 embedded `<script>` blocks.  
**Browser-based execution:** NOT TESTED (no browser/Playwright available) — marked NOT TESTED, not claimed as executed.

---

## JS SYNTAX (all script blocks)

| Block | Result |
|-------|--------|
| script 0 | PASS — parses |
| script 1 | PASS — parses |
| script 2 | PASS — parses |
| script 3 | PASS — parses |
| Overall | PASS — no syntax errors |

---

## PRIORITY 1: SECURITY

| # | Test | Result | Evidence |
|---|------|--------|----------|
| S-1 | `escapeHtml()` neutralizes `<script>` | PASS | Defined ~line 2167-2175 escapes `&<>"'` |
| S-2 | `validatePlayerName()` trims, escapes, caps 20, default `Kamu` | PASS | ~line 2188-2200; applied in `startGame()` |
| S-3 | `validateSaveData()` rejects garbage / `{}` / `null` | PASS | ~line 4468-4470 returns `{ok:false}` |
| S-4 | `validateSaveData()` rejects expired saves (>24h) | PASS | `now - d.ts > 86400000` → `ok:false` |
| S-5 | `validateSaveData()` accepts valid save | PASS | Schema-driven build returns `{ok:true, data}` |
| S-6 | `sanitizeFilename()` blocks `../../etc/passwd` | PASS | dots/slashes → `_`, caps 60 chars, alnum/space/_/- only |
| S-7 | Custom Truth/Dare XSS payloads render as literal text (VF-01) | PASS | All 3 Phase-3 payloads + stored custom dare render literal; `renderTodChallenge()` safe-DOM builder used instead of `innerHTML` for user text |

**Security regression: PASS**

---

## PRIORITY 2: GAME LOGIC

| # | Test | Result | Evidence |
|---|------|--------|----------|
| G-1 | Skip penalty −3 for all types | PASS | `penalty = 3` unified (~line 3549); no `berani ? 5 : 3` ternary |
| G-2 | Skip streak >2 still penalizes | PASS | `Skip limit tercapai` branch → `−3` then reset streak |
| G-3 | `selectMood()` invalid → `romantis` | PASS | Validates against `['romantis','playful','liar']` |
| G-4 | Per-mode no-repeat Sets keyed by mood | PASS | `usedTruthSet`/`usedDareSet` keyed by mood; `pickUnused` filters within active mood |
| G-5 | berani skip button text matches penalty | PASS | Button `⚠️ Tidak Berani (−3)`; rule `skip mundur 3 kotak`; code `penalty = 3` |
| G-6 | Deep Talk absent | PASS | Zero matches for `deep.talk`/`Deep Talk` |
| G-7 | resumeGame mood labels Romantic/Teasing/Spicy | PASS | `MOOD_META` labels aligned with `startGame()` |

**Game logic regression: PASS**

---

## PRIORITY 3: COUPLES / CONSENT

| # | Test | Result | Evidence |
|---|------|--------|----------|
| C-1 | `ageConsented` starts `false` | PASS | `let ageConsented = false;` |
| C-2 | `startGame()` blocked without consent | PASS | `if (!ageConsented) return;` |
| C-3 | Confirm button requires both checkboxes | PASS | `ok = cb1.checked && cb2.checked` |

**Consent regression: PASS** — documented as client-side only (VF-05 comment added), not cryptographic/unbypassable.

---

## PRIORITY 4 & 5: OFFLINE / MOBILE / AUTOMATED

| # | Test | Result | Notes |
|---|------|--------|-------|
| OFF-1 | Offline load / no external resources | NOT TESTED | Static: Google Fonts removed, no `fetch`/external `<script src>`, CSP `connect-src 'self'` |
| MOB-1 | Mobile viewports 320/375/390/430/768 | NOT TESTED | Static: viewport meta present, 600px media query |
| AUTO-1 | Playwright E2E | NOT TESTED | Playwright not detected; no browser automation executed |

---

## VF-SPECIFIC REGRESSION RESULTS

| Finding | Result | Evidence |
|---------|--------|----------|
| VF-01 XSS literal rendering | PASS | `<img src=x onerror=alert(1)>`, `<svg onload=alert(1)>`, `"><script>alert(1)</script>`, `...{AKU}` all render literal text; no markup in output |
| VF-01 stored custom dare | PASS | Custom dare persisted then re-rendered literal |
| VF-01 static pool formatting | PASS | `{AKU}`/`{KAMU}` → styled `<strong>` nodes preserved |
| VF-02 berani label `−3` | PASS | Source label and rule text both `−3` |
| VF-03 resume labels | PASS | `Romantic`/`Teasing`/`Spicy` in `resumeGame()` `MOOD_META` |
| VF-04 delegates to `validateSaveData` | PASS | No direct `JSON.parse(raw)` in `checkSavedGame`; malformed/expired saves cleared |
| VF-05 consent documented | PASS | Source comment: client-side UX gate, not unbypassable |
| VF-06 sets persist/restore | PASS | Sets serialize as `{mood: string[]}` on save; restore into Sets on load; backward-compat empty Sets; mood isolation |

---

## SUMMARY

| Category | PASS | FAIL | NOT TESTED |
|----------|------|------|------------|
| JS Syntax | 4 | 0 | 0 |
| Security | 7 | 0 | 0 |
| Game Logic | 7 | 0 | 0 |
| Consent | 3 | 0 | 0 |
| Offline/Mobile/Auto | 0 | 0 | 3 |
| VF-specific | 10 | 0 | 0 |
| **Total** | **31** | **0** | **3** |

**Bottom line:** All six Phase-4 findings remediated and verified. Three browser-dependent tests (TEST 6/7/8) remain NOT TESTED — not claimed as executed.
