# RESPONSIVE_TEST_REPORT.md — MIDNIGHT DESIRE

Tanggal: 2026-11-24
Branch: `redesign/midnight-desire`
Commit terakhir: `5307b84`
Alat: `test/responsive.js` (Playwright Chromium, headless, file:// index.html)

## 1. Viewport yang diuji

| Viewport | Resolusi | Overflow X | Papan terlihat | Ukuran papan | Tombol <44×44 | Error console |
|----------|----------|------------|----------------|--------------|---------------|---------------|
| small-phone | 320×568 | tidak | ya | 176×176 | 0 | — |
| standard-phone | 360×800 | tidak | ya | 348×348 | 0 | — |
| modern-phone | 390×844 | tidak | ya | 378×378 | 0 | — |
| large-phone | 430×932 | tidak | ya | 418×418 | 0 | — |
| tablet-portrait | 768×1024 | tidak | ya | 400×400 | 0 | — |
| laptop | 1366×768 | tidak | ya | 468×468 | 0 | — |
| desktop | 1920×1080 | tidak | ya | 480×480 | 0 | — |

## 2. Alur yang dieksekusi per viewport

1. Centang #age-confirm + #consent-agree → klik #btn-age-confirm
2. Isi #name0="A", #name1="B"
3. Klik .btn-start → board render
4. Buka setiap viewport, ukur `document.body.scrollWidth vs clientWidth`, `#board-wrap` boundingBox, semua `button`/`[role="button"]` getBoundingClientRect

## 3. Temuan dan perbaikan

| Masalah | Viewport | Perbaikan | Commit |
|---------|----------|-----------|--------|
| `joker-0`/`joker-1` <44×44 (div role="button") | semua | `min-width/min-height 44px`, `display inline-flex`, padding 6px 10px | `5307b84` |

Sebelum perbaikan: smallButtons=2 di semua viewport. Sesudah: smallButtons=0 di semua viewport.

## 4. Catatan konsentrasi

- Layar ponsel kecil (320×568) menyusutkan papan ke 176×176 karena budget `100dvh − 392px`, tapi tetap terlihat penuh tanpa overflow.
- Perangkat landscape pendek (390 tinggi, mis. iPhone SE landscape) menyembunyikan `#dice-wrap`, `h1`, `#mood-badge-bar`, heat-badge agar papan tidak menyusut menjadi cap via `@media (max-height: 560px)`.
- Tidak ada horizontal scroll pada semua breakpoint (`body { overflow-x: hidden }`, `body.no-scroll` mengunci viewport).
- Satu peringatan console pre-existing: CSP `frame-ancestors` diabaikan saat dikirim via `<meta>` (bukan berasal dari perubahan ini).

## 5. Kesimpulan

Semua 7 viewport lolos kriteria: tidak ada overflow horizontal, papan sepenuhnya terlihat, semua target sentuh ≥44×44px, tidak ada error console baru.
