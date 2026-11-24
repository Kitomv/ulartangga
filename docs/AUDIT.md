# Audit — Ular Tangga (2026-11-24)

Target: `index.html` + `assets/`. Metode: review statis + eksekusi Node untuk
memverifikasi klaim. Entry point tunggal `index.html`.

## Status temuan lama (VERIFIED_FINDINGS VF-01..VF-06)

| ID | Temuan | Status |
|----|--------|--------|
| VF-01 | DOM XSS via teks tantangan kustom (innerHTML) | FIXED — semua jalur lewat `renderTodChallenge()` + `escapeHtml()` |
| VF-02 | Tombol berani tampil −5 tapi kode −3 | FIXED — label (−3), `penalty=3` |
| VF-03 | Label mood basi di `resumeGame` | FIXED — Romantic/Teasing/Spicy |
| VF-04 | `checkSavedGame` lewati validasi | FIXED — delegasi ke `validateSaveData` |
| VF-05 | Gate 18+ client-side saja | DOCUMENTED — keterbatasan desain, jangan diklaim server-enforced |
| VF-06 | Riwayat no-repeat hilang saat resume | FIXED — `usedTruthSet/usedDareSet` dipersist |

## Temuan baru (audit ini) — sudah diperbaiki

| # | Temuan | Sev | Status |
|---|--------|-----|--------|
| A-01 | `turn` save tak dibatasi 0–1 → crash `PLAYERS[n].name` | MEDIUM | FIXED — schema `range:[0,1]` |
| A-02 | `pos` tak dibatasi 1–100 → bidak render di luar papan | LOW | FIXED — schema `range:[1,100]` |
| A-03 | Item `customTruths/customDares` non-string → crash `.replace` | MEDIUM | FIXED — filter string non-kosong, cap 15 |
| A-04 | Dead var `challenge` di jalur dare custom | INFO | FIXED — dihapus |

Bukti: ketiganya direproduksi dengan Node sebelum perbaikan.

## Residual / diterima

- `unsafe-inline` CSP: inheren desain single-file.
- Google Fonts eksternal: disengaja (tipografi desain); CSP mengizinkan.
- Gate 18+ client-side (VF-05).
- Logika game sepenuhnya client-side; tak ada trust boundary server.
