# GITHUB_PAGES_VALIDATION.md — MIDNIGHT DESIRE

Tanggal: 2026-11-24
Branch: `redesign/midnight-desire`
Commit terakhir: `5307b84`
Hosting target: GitHub Pages (root repo, `assets/` relatif)

## 1. Path aset (relatif, case-exact)

Semua referensi aset dalam `index.html` relatif dan case-sensitive sesuai kasus file sebenarnya:

| Tag | Path | File ada |
|-----|------|----------|
| `<link rel="stylesheet" href="assets/css/style.css">` | assets/css/style.css | ya |
| `<link rel="stylesheet" href="assets/css/patch-improvements.css?v=9">` | assets/css/patch-improvements.css | ya |
| `<script src="assets/js/game.js">` | assets/js/game.js | ya |
| `<script src="assets/js/patch-improvements.js?v=9">` | assets/js/patch-improvements.js | ya |
| Google Fonts `<link>` | https://fonts.googleapis.com/... (CSP diizinkan) | — |
| preconnect fonts.gstatic.com | https://fonts.gstatic.com (CSP diizinkan) | — |

Tidak ada path development lokal (tidak ada `C:/`, `localhost`, `file://`, `127.0.0.1` dalam aset yang di-deploy).

## 2. CSP (Content Security Policy)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
object-src 'none';
```

Semua origin yang digunakan patch (Google Fonts style + font) sudah tercantum. Tidak ada penambahan origin baru. Peringatan `frame-ancestors` via `<meta>` diabaikan browser (perilaku standar, bukan regresi).

## 3. Cache-busting

Kedua aset patch naik dari `?v=8` ke `?v=9` setelah commit chrome (`91a2c4f`). Refresh di GitHub Pages akan muat versi terbaru, tidak ada versi kunci di browser yang menampilkan tampilan lama.

## 4. Inisialisasi aman saat refresh

- `window.__kuroPatchApplied` mencegah patch dipasang dua kali (IIFE guard di baris 82-83 patch-improvements.js).
- Tema awal dibaca dari `kuro-theme-v2` (localStorage), fallback `prefers-color-scheme: light`; disimpan hanya saat user men-toggle.
- `fixStaticText()` berjalan pada `DOMContentLoaded` atau segera jika sudah siap — idempotent (ceks `ol.textContent.indexOf('melebihi 100')` sebelum menambah aturan).
- Semua `window.X` dibungkus `typeof ... === 'function'` dengan `warn()` fallback — tidak ada crash jika fungsi mesin belum terdefinisi saat patch dieksekusi.

## 5. Tidak ada dependensi baru

Tanpa framework, tanpa build step, tanpa runtime dependency baru. Hanya dua file patch + dua tag font di `index.html`. Rollback: hapus 2 baris pemasangan di `index.html`.

## 6. Kesimpulan validasi

- Relatif path: lolos.
- CSS/JS muat dengan benar: lolos.
- Tidak ada path lokal sisa: lolos.
- Tidak ada aset hilang: lolos.
- Case-sensitive filename cocok: lolos.
- Bekerja dari URL GitHub Pages (asumsi root repo): lolos.
- Refresh-safe (guard `__kuroPatchApplied`, tema persisten, fixStaticText idempotent): lolos.
