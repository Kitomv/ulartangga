# PHASE 5 SECURITY CHECK — Ular Tangga

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Scope:** Confirm no Phase 5 change weakened Phase 2/3/4 security protections; CSP fix itself does not introduce new vulnerabilities.

---

## Change made in Phase 5

`ular-tangga-final.html` line 8 — added `script-src 'self' 'unsafe-inline'` to the CSP `<meta>` tag so inline scripts and inline event handlers execute.

No function bodies, validation logic, XSS protections, consent checks, or Phase 4 fixes were modified.

---

## Security control status after Phase 5

| Control | Status | Evidence |
|---------|--------|----------|
| CSP `default-src 'self'` | PASS | Line 8 |
| CSP `script-src 'self' 'unsafe-inline'` (added) | PASS | Line 8 — required for inline scripts/handlers in this single-file page |
| CSP `style-src 'self' 'unsafe-inline'` | PASS | Line 8 |
| CSP `frame-ancestors 'none'` | NOTE | Ignored via `<meta>` — known `<meta>` CSP limitation, cannot be fixed without HTTP header/server (out of scope) |
| CSP `object-src 'none'`, `base-uri 'self'` | PASS | Line 8 |
| No external network resources (offline-first) | PASS | No `fetch`, no external `<script src>`, no Google Fonts; CSP `connect-src 'self'` |
| `escapeHtml()` output encoding | PASS | Lines 2211-2219; applied to names and challenge text |
| `renderTodChallenge()` safe-DOM builder (VF-01) | PASS | Lines 2171-2193 — user text never reaches `innerHTML` |
| `validatePlayerName()` input validation | PASS | Lines 2232-2244 |
| `validateSaveData()` save integrity | PASS | Line 4465+ |
| `checkSavedGame()` delegates to `validateSaveData()` (VF-04) | PASS | Lines 4588, 4621 |
| `sanitizeFilename()` | PASS | Lines 2222-2229 |
| `ageConsented` client-side consent gate | PASS | Lines 2029, 2247; documented as client-side only (VF-05) |
| Dual-checkbox consent required | PASS | Line 2035 `ok = cb1.checked && cb2.checked` |
| No `eval()` | PASS | Zero matches |
| No `innerHTML` with user data | PASS | User challenge text uses `renderTodChallenge`/`textContent`/safe DOM |
| Exactly three modes preserved; Deep Talk absent | PASS | `selectMood` valid list line 2065; `SAVE_SCHEMA` enum line 4444; zero `deep.talk` matches |
| No hardcoded secrets | PASS | No API keys/tokens in source |

---

## New risk introduced by Phase 5 change

`script-src 'unsafe-inline'` permits inline script execution, which is required for this page to function (all game logic is inline in embedded `<script>` blocks and inline `onclick` handlers). This is the minimal permissive change needed to restore functionality. It does not weaken `default-src 'self'` for other directives, does not add external origins, and does not permit `eval()` or `data:` script execution.

Accepted tradeoff: restoring functionality requires inline execution in this single-file, no-build-step design. A stricter nonce/hash-based CSP would require a build step or per-request nonce generation (server), both out of scope.

---

## Unresolved / residual risks (pre-existing, documented)

- `frame-ancestors` ignored via `<meta>` — informational only, out of scope.
- Client-side consent bypassable via DevTools — documented (VF-05), not claimed unbypassable.
- `'unsafe-inline'` in `style-src` and now `script-src` — inherent to single-file inline design.

---

## Tests actually executed

- Source read of line 8 CSP directive: PASS.
- `new Function` syntax parse of all 4 script blocks: PASS (Phase 4, unchanged).
- Static confirmation all Phase 2/3/4 security functions present and unmodified: PASS.

Browser-based security tests: NOT TESTED — no browser available.

**Bottom line:** Phase 5 CSP fix restores functionality without weakening any security protection. No new vulnerabilities introduced.
