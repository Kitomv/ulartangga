# PHASE 5 ROOT CAUSE — Ular Tangga

**Target:** `ular-tangga-final.html`  
**Date:** 2026-11-23  
**Status:** Root cause identified and fixed (CSP fix).

---

## Exact root cause

The `<meta http-equiv="Content-Security-Policy">` on line 8 originally declared:

```
default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self';
object-src 'none';
```

**`script-src` was not explicitly set**, so per the CSP spec `default-src` acted as the fallback for `script-src`. `default-src 'self'` permits only external scripts from the same origin and **blocks all inline script execution** (embedded `<script>` blocks and inline event handlers like `onclick="..."`).

Because `script-src 'self' 'unsafe-inline'` was missing:

1. **All four embedded `<script>` blocks were blocked** — `window.CHALLENGES_ROMANTIS/PLAYFUL/LIAR`, the sound engine, and the core game logic never executed. This includes `selectMood`, `startGame`, `confirmAge`, `updateAgeConfirmBtn`, `goToMoodScreen`, `renderTodChallenge`, `validateSaveData`, and everything else.
2. **Mode-selection buttons (`onclick="selectMood('...')"`)** never fired → mode selection did not respond.
3. **Play button (`onclick="startGame()"`)** never fired → game would not start.
4. **Inline script at lines 1359, 1460, 1561, 1720** were blocked with the hashes shown in the console output (`sha256-itU9Dz...`, etc.).

Secondary informational warning: `frame-ancestors` is ignored when delivered via `<meta>` (known `<meta>` CSP limitation — cannot be fixed without an HTTP header/server, out of scope).

## Evidence

Browser console output (from user paste) showed:
- Repeated `Executing inline event handler violates ... default-src 'self'` — inline handlers blocked.
- `ular-tangga-final.html:1359`, `:1460`, `:1561`, `:1720` `Executing inline script violates ... default-src 'self'` — the four embedded script blocks blocked.

## Why Phase 4 changes are NOT the cause

Phase 4 fixes (VF-01..VF-06) touched `renderTodChallenge`, `checkSavedGame`, `saveGame`/`loadGame`, `selectMood` labels, `showBeraniChallenge` text, and the `ageConsented` comment. None of these removed or changed the CSP meta tag. The page was non-playable because the **entire script payload was blocked by CSP before any Phase-4 function could run**.

## Fix applied

Added explicit `script-src 'self' 'unsafe-inline'` to the CSP meta tag (line 8):

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ...
```

This permits inline scripts and inline event handlers while keeping `default-src 'self'` as the restrictive baseline for everything else. No `'unsafe-inline'` added to `default-src` itself; `frame-ancestors` limitation documented as accepted residual risk.
