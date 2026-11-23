# PHASE 5 FIX REPORT — Ular Tangga

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Backup:** `ular-tangga-final.html.phase5.bak` (created before editing)

---

## Finding (P0 functional regression)

After Phase 4 remediation the game was not playable: mode-selection buttons did not respond and Play would not start. The entire embedded JavaScript payload was blocked by CSP before any game function could execute.

## Root cause

CSP meta tag (line 8) declared `default-src 'self'` with no explicit `script-src`, so `script-src` fell back to `default-src`. This blocked all inline scripts and inline event handlers (`onclick`, `window.addEventListener('load', ...)`, the four `<script>` blocks). Console output confirmed blocking at lines 1359, 1460, 1561, 1720 plus repeated inline-handler violations.

## Exact code area changed

`ular-tangga-final.html`, line 8 — the `<meta http-equiv="Content-Security-Policy">` tag.

## Fix applied

Added `script-src 'self' 'unsafe-inline'` to the CSP directive list so inline scripts and inline event handlers execute while `default-src 'self'` remains the restrictive baseline for all other fetch directives.

Before:
```
default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';
connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none';
```
After:
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
base-uri 'self'; object-src 'none';
```

No function bodies, validation, XSS protections, consent checks, or phase-4 fixes were removed or weakened.

## Tests actually executed

- `new Function` syntax parse of all 4 embedded `<script>` blocks: PASS (performed during Phase 4, unchanged by this edit).
- CSP directive text verified present via source read: PASS.

## Browser-based tests

NOT TESTED — no browser/Playwright available in this session. Not claimed as executed.

## Remaining defects

None identified. `frame-ancestors`-via-`<meta>` informational warning is a known `<meta>` CSP limitation, not a functional defect, and cannot be fixed without an HTTP header/server (out of scope).

Awaiting authorization before Phase 6.
