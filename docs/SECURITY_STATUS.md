# SECURITY STATUS — Ular Tangga

**File:** `ular-tangga-final.html`
**Date:** 2026-11-23
**Scope:** Single-file self-contained HTML (no backend, no build, no framework).

## Post-remediation status

All identified vulnerabilities from the pre-remediation audit are addressed. No CRITICAL or HIGH findings remain.

---

## Vulnerability summary

| ID | Severity | Finding | Status | Fix |
|---|---|---|---|---|
| V-01 | CRITICAL | DOM XSS via `innerHTML` with unsanitized player name in `showTOD` badge | FIXED | `escapeHtml()` + safe DOM append |
| V-02 | CRITICAL | DOM XSS via `innerHTML` in challenge rendering (`{AKU}`/`{KAMU}`) | FIXED | Names escaped before interpolation |
| V-03 | HIGH | localStorage save loaded without schema validation (arbitrary JS object restore) | FIXED | `SAVE_SCHEMA` + `validateSaveData()` |
| V-04 | HIGH | No expiry / corruption handling on saved games | FIXED | 24-hour `ts` expiry + `validateSaveData` reject |
| V-05 | MEDIUM | Recap export filename unsanitized (path traversal via player name) | FIXED | `sanitizeFilename()` |
| V-06 | MEDIUM | External dependency: Google Fonts (privacy / offline) | FIXED | Removed; CSP `font-src 'self'` |
| V-07 | MEDIUM | No Content Security Policy | FIXED | CSP meta tag added |

---

## Security controls in place

- **CSP:** `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none';`
- **Input validation:** `validatePlayerName()` (trim, 20-char cap, HTML escape, default fallback).
- **Output encoding:** `escapeHtml()` applied to every player-name interpolation into the DOM.
- **Save integrity:** `validateSaveData()` validates JSON shape, types, enums, array lengths, player names, colors, stats, CELL_TYPE allowlist, and 24-hour expiry. Corrupt/expired saves are ignored.
- **Filename safety:** `sanitizeFilename()` strips non-alphanumeric, blocks `..`, caps at 60 chars.
- **No external network calls:** Google Fonts removed; all assets inline/data URI.
- **No `eval`/`innerHTML` with user data:** remaining `innerHTML` targets use trusted internal SVG catalogs or escaped text only.

---

## Residual risk (accepted, low)

- `'unsafe-inline'` in `style-src` is required because the game is a single self-contained HTML file with inline `<style>` and inline event handlers. This is inherent to the single-file design and cannot be removed without a build step or nonce injection, which is out of scope for PHASE 2.
- Game logic is entirely client-side; no server trust boundary exists.
- Custom challenges entered by users are stored in memory/localStorage only and rendered escaped.

---

## Unresolved vulnerabilities

None.

---

## Verification performed

- JS syntax parse (`new Function`) on all script blocks: OK.
- `escapeHtml`, `validatePlayerName`, `sanitizeFilename`, `validateSaveData` unit assertions pass (see `REGRESSION_TESTS.md`).
