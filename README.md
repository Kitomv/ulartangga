# Ular Tangga — Truth or Dare (18+)

Game papan untuk pasangan. Single page, tanpa backend, jalan dari `file://`
atau GitHub Pages.

**Entry point:** `index.html` (satu halaman, semua aset di `assets/`).

## Struktur

```
index.html                     halaman game (HTML + inline style/handler)
assets/css/style.css           gaya utama
assets/css/patch-improvements.css  override drop-in (design + UX patch)
assets/js/challenges-*.js      bank tantangan (romantis/playful/liar)
assets/js/game.js              logika game
assets/js/patch-improvements.js    patch JS drop-in (P1–P5)
test/patch-test.js             harness Node uji logika patch (20 asersi)
docs/AUDIT.md                  hasil audit terbaru
```

## Menjalankan lokal

Buka `index.html` langsung, atau dari root:

```bash
python -m http.server 8000   # lalu buka http://localhost:8000/
```

## Uji

```bash
node --check assets/js/game.js
node test/patch-test.js      # harapan: 20 lolos, 0 gagal
```

## Catatan keamanan

- CSP di `index.html:8` mengizinkan `unsafe-inline` (dibutuhkan oleh handler
  inline & style inline khas single-file) dan Google Fonts
  (`fonts.googleapis.com` / `fonts.gstatic.com`).
- Semua teks tantangan (termasuk kustom buatan pemain) dirender lewat
  `renderTodChallenge()` yang `escapeHtml()` dulu; nama pemain di-escape.
- Save `localStorage` divalidasi skema (`validateSaveData`): rentang posisi
  (1–100), `turn` (0–1), item tantangan kustom wajib string, expiry 24 jam.
- Gate usia 18+ bersifat **client-side saja** — bisa dilewati lewat DevTools.
  Ini keterbatasan desain tanpa backend, bukan celah yang bisa ditutup di sini.
