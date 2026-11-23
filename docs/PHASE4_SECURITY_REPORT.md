# PHASE 4 SECURITY REPORT — Ular Tangga

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Scope:** VF-01 through VF-06 remediation security impact.  
**Backup:** `ular-tangga-final.html.phase4.bak`

---

## Post-remediation security status

All six Phase-3 findings resolved. No CRITICAL findings remain. One MEDIUM inherent risk (VF-05 client-side consent) is documented, not claimed as unbypassable.

---

## Vulnerability summary

| ID | Severity | Finding | Status | Fix |
|----|----------|---------|--------|-----|
| VF-01 | HIGH | DOM XSS via custom Truth/Dare challenge text rendered through `innerHTML` | FIXED | New `renderTodChallenge()` safe-DOM builder: `escapeHtml()` on full challenge text + `createTextNode`/`createElement('strong')`; all 5 rendering paths (custom truth, custom dare, standard pool, duo, berani) use it |
| VF-02 | MEDIUM | berani skip button showed `(−5)` while code applied `−3` | FIXED | Button text → `(−3)`; rule text → `skip mundur 3 kotak`; matches `penalty = 3` in `resolveAfterTOD()` |
| VF-03 | LOW | `resumeGame()` mood badge used stale labels `Romantis`/`Playful`/`Liar` | FIXED | `MOOD_META` labels aligned to `Romantic`/`Teasing`/`Spicy`; internal keys unchanged for save compatibility |
| VF-04 | LOW | `checkSavedGame()` validated saves outside `validateSaveData()` (direct `JSON.parse`) | FIXED | Delegates to `validateSaveData()`; malformed/expired/invalid saves cleared; banner only on `ok === true` |
| VF-05 | MEDIUM | Consent gate client-side only, bypassable via console | DOCUMENTED | Source comment: `ageConsented` is client-side UX state only, not server/cryptographic enforcement, must not be described as unbypassable. Dual-checkbox gate unchanged |
| VF-06 | LOW | No-repeat history (`usedTruthSet`/`usedDareSet`) not persisted across save/resume | FIXED | Sets serialized as `{mood: string[]}` in `saveGame()`; restored into Sets in `loadGame()` via `restoreMoodSet()`; backward-compat empty Sets; per-mode isolation |

---

## Security controls in place (unchanged + reinforced)

- **CSP:** `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none';` (added `script-src 'self' 'unsafe-inline'` so inline handlers/embedded scripts execute; `frame-ancestors` is ignored via `<meta>` — known limitation)
- **Input validation:** `validatePlayerName()` (trim, 20-char cap, HTML escape, default fallback).
- **Output encoding:** `escapeHtml()` applied to every player-name interpolation; `renderTodChallenge()` now escapes all custom challenge text before DOM insertion.
- **Save integrity:** `validateSaveData()` validates JSON shape, types, enums, array lengths, player names, colors, stats, CELL_TYPE allowlist, 24-hour expiry. Corrupt/expired saves ignored. `checkSavedGame()` now shares this single authority.
- **Filename safety:** `sanitizeFilename()` strips non-alphanumeric, blocks `..`, caps at 60 chars.
- **No external network calls:** Google Fonts removed; all assets inline/data URI. Single-file self-contained.
- **No `eval`/`innerHTML` with user data:** remaining `innerHTML` targets use trusted internal templates only; user-controlled challenge text never reaches `innerHTML`.

---

## Residual risk (accepted)

- `'unsafe-inline'` in `style-src` is inherent to the single-file self-contained HTML design (inline `<style>` + inline event handlers). Cannot be removed without a build step/nonce injection, out of scope.
- Game logic entirely client-side; no server trust boundary. VF-05 consent bypassable via DevTools — documented, not claimed unbypassable.
- Custom challenges stored in memory/localStorage only; now rendered escaped (VF-01 fixed).

---

## Unresolved vulnerabilities

None. All VF-01..VF-06 resolved or documented.

---

## Verification performed

- JS syntax parse (`new Function`) on all 4 script blocks: PASS.
- Executable DOM-stub harness: all three Phase-3 XSS payloads render as literal text (PASS).
- Save/load round-trip: malformed/expired saves cleared, valid save shows banner, sets serialize/restore with mood isolation (PASS).
- Browser-based tests (TEST 6/7/8): NOT TESTED — no browser/Playwright available; not claimed as executed.
