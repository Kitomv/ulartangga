# PHASE 4 FIX REPORT — Ular Tangga

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Backup:** `ular-tangga-final.html.phase4.bak` (created before editing)  
**Scope:** VF-01 through VF-06 only. No UI redesign, no new features, no external dependencies, three modes preserved, Deep Talk absent.

---

## VF-01 — HIGH: Custom challenge DOM XSS

**Original issue:** Custom Truth/Dare challenge text (including user-added `customTruths`/`customDares`, persisted to localStorage) was inserted into `#tod-body` via `innerHTML` after only `{AKU}`/`{KAMU}` replacement values were escaped. The challenge template body itself was raw, so payloads like `<img src=x onerror=alert(1)>`, `<svg onload=alert(1)>`, `"><script>alert(1)</script>` executed in the page origin. Persistent self-XSS across save/resume.

**Exact code area changed:**
- Added new `renderTodChallenge(targetEl, challenge, {akuName, kamuName, akuColor, kamuColor})` helper (after `setTodBody`, ~line 2150) that escapes the full challenge string via `escapeHtml()` then builds the DOM with `createTextNode`/`createElement('strong')` — no `innerHTML` for user-controlled text.
- `renderChallenge()` custom-truth path (~line 3295)
- `renderChallenge()` custom-dare path (~line 3327)
- `renderChallenge()` standard pool path (~line 3362)
- `showDuoChallenge()` (~line 3219)
- `showBeraniChallenge()` (~line 4077)

**Fix applied:** Each rendering path now sets the static shell via `innerHTML` (trusted template only, no user data) and calls `renderTodChallenge()` to populate `.tod-challenge` with escaped text + styled `<strong>` name nodes. `{AKU}`/`{KAMU}` placeholders become DOM `<strong>` elements with inline color style — formatting preserved.

**Test performed:**
- Executable DOM-stub harness: all three Phase-3 payloads (`<img src=x onerror=alert(1)>`, `<svg onload=alert(1)>`, `"><script>alert(1)</script>`, plus `...{AKU}` variant) rendered as literal text with zero markup tags in output.
- Stored custom dare (`<img src=x onerror=alert(99)>`) rendered literal through the same path.
- Static pool challenges still render styled names (`<strong color=...>`).

**Result: PASS**

---

## VF-02 — MEDIUM: Incorrect skip label

**Original issue:** `showBeraniChallenge()` button text showed `⚠️ Tidak Berani (−5)` and the rule said `skip mundur 5 kotak`, while `resolveAfterTOD()` applies a unified `penalty = 3` to all skip types (line ~3506).

**Exact code area changed:** `showBeraniChallenge()` (~line 4077-4108).

**Fix applied:** Button text changed to `⚠️ Tidak Berani (−3)`; rule text changed to `Kartu Berani — skip mundur 3 kotak! 💪`.

**Test performed:** Source grep confirms `(−3)` label and `3 kotak` rule; `resolveAfterTOD()` unchanged at `penalty = 3`. Displayed penalty and actual score change now agree.

**Result: PASS**

---

## VF-03 — LOW: Stale mood labels

**Original issue:** `resumeGame()` used stale labels `Romantis`/`Playful`/`Liar` while `startGame()` used `Romantic`/`Teasing`/`Spicy`.

**Exact code area changed:** `resumeGame()` `MOOD_META` (~line 4674).

**Fix applied:** Updated to `label:'Romantic'`, `label:'Teasing'`, `label:'Spicy'` matching `startGame()`. Internal keys (`romantis`/`playful`/`liar`) unchanged for save-data compatibility.

**Test performed:** Source grep confirms all three labels present in `resumeGame()` `MOOD_META` and no stale labels remain.

**Result: PASS**

---

## VF-04 — LOW: Inconsistent save validation

**Original issue:** `checkSavedGame()` called `JSON.parse(raw)` directly with its own expiry check, bypassing `validateSaveData()` — a duplicate, potentially divergent validation surface.

**Exact code area changed:** `checkSavedGame()` (~line 4616).

**Fix applied:** `checkSavedGame()` now calls `validateSaveData(raw)` as the single authority; on `!ok` it clears the save key (malformed/expired/invalid). Banner renders only when `ok === true`, using `escapeHtml()` for names (unchanged).

**Test performed:** Executable harness confirmed malformed JSON → key removed; expired save (>24h) → key removed; valid save → resume banner rendered. Source grep confirms no direct `JSON.parse(raw)` remains in `checkSavedGame`.

**Result: PASS**

---

## VF-05 — MEDIUM: Consent bypass documentation

**Original issue:** No source comment documented that the 18+ consent gate is client-side only and bypassable via console (inherent to single-file client model).

**Exact code area changed:** `ageConsented` declaration (~line 2024).

**Fix applied:** Added comment block documenting that `ageConsented` is client-side UX state only, enforced by application logic, not server or cryptography, can be bypassed via DevTools, and must not be described as unbypassable/enforceable age verification. Dual-checkbox gate (`updateAgeConfirmBtn`/`confirmAge`) left unchanged.

**Test performed:** Source comment verified present; no backend/identity/tracking added.

**Result: PASS**

---

## VF-06 — LOW: No-repeat history persistence

**Original issue:** `usedTruthSet`/`usedDareSet` (per-mode no-repeat Sets) were re-initialized empty in `startGame()`/`goToMoodScreen()` but never persisted or restored, so challenges could repeat after resume.

**Exact code area changed:**
- `saveGame()` — serializes `usedTruthSet`/`usedDareSet` as `{ mood: string[] }` arrays.
- `SAVE_SCHEMA` — added `usedTruthSet`/`usedDareSet` (`type:'object'`, optional).
- `validateSaveData()` — default empty `{romantis:[],playful:[],liar:[]}` when missing.
- `loadGame()` — rebuilds Sets via new `restoreMoodSet()` helper.
- New `restoreMoodSet(saved, targetSet)` helper — restores only string entries, keyed strictly by mood (one mood never bleeds into another), ignores malformed/non-array entries.

**Fix applied:** Save writes per-mode string arrays; load restores them into fresh Sets. Old saves without the keys initialize empty Sets (backward compatible).

**Test performed:** Executable harness confirmed sets serialize as arrays on save, restore into Sets on load, old-save backward compat (empty Sets), and mood isolation (romantic restore doesn't touch playful).

**Result: PASS**

---

## Summary

| Finding | Severity | Result |
|---------|----------|--------|
| VF-01 | HIGH | PASS |
| VF-02 | MEDIUM | PASS |
| VF-03 | LOW | PASS |
| VF-04 | LOW | PASS |
| VF-05 | MEDIUM | PASS |
| VF-06 | LOW | PASS |

No source files beyond `ular-tangga-final.html` were modified. All 4 embedded `<script>` blocks parse cleanly (`new Function`). Awaiting authorization before Phase 5.
