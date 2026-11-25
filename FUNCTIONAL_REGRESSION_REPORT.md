# FUNCTIONAL_REGRESSION_REPORT.md — MIDNIGHT DESIRE

Tanggal: 2026-11-24
Branch: `redesign/midnight-desire`
Commit terakhir: `5307b84`

## 1. Uji yang dijalankan

### A. `node test/patch-test.js` — 40 assertions, DOM stub yang meniru game.js
Hasil: **40 lolos, 0 gagal**, exit 0.

Cakupan (kelompok P1–P10 dari patch-improvements.js):

| Kelompok | Perilaku yang diuji | Jumlah |
|----------|---------------------|--------|
| P1 | Token berbagi kotak: tidak overlap, tidak keluar papan (0–100), ≥60% sel, tidak terpotong tepi, kotak 100 dalam papan, kembali scale 1 | 6 |
| P2 | Skip TOD: count 0 tetap tampil/disabled/tooltip, count 1 P0 bisa dipakai P1 disabled | 5 |
| P2b | Fallback award streak ke-3: Truth dapat token, Dare tidak double, streak 4 tidak dapat | 3 |
| P3 | Badge NAIK hanya saat level berubah (hot tetap hot, mild→medium NAIK) | 2 |
| P5 | Reset & updateUI: level patch kembali mild, skip count 0, tombol Skip tampil, refresh saat giliran | 4 |
| P8 | Kartu Berani wajib: skip dibuang, Selesai satu kolom, teks aturan, fallback Dare skip tetap ada + teks tidak berubah | 5 |
| P9 | Lawan menolak Dare: tombol hadir setelah render, tidak ada sebelum render, P1 mundur 3 (40→37), P0 di tempat, pemilik dihitung selesai, streak putus, skip tercatat, tidak mundur < kotak 1 | 7 |
| P10 | Durasi jadi kalimat sendiri: ekor dipisah, "lakukan" tanpa "selama" dipisah, em dash tengah tidak disentuh, teks tanpa durasi apa adanya, "lakukan" tengah tidak disentuh, angka durasi tidak berubah | 6 |
| P4 (via fixStaticText) | 17+→18+, aturan dadu >100/skip/reset ditambahkan | 2 |

Total: 40.

### B. Playwright gameplay + responsif probe (`test/responsive.js`)
Dieksekusi di 7 viewport: 320×568, 360×800, 390×844, 430×932, 768×1024, 1366×768, 1920×1080.

Alur yang dieksekusi per viewport: setuju konsen (#age-confirm + #consent-agree) → konfirmasi → isi nama P1/P1 → Mulai → board render.

Hasil per viewport:
- overflow horizontal: **false** (semua)
- papan terlihat dengan ukuran: 176×176 (320×568) … 480×480 (1920×1080) — **terlihat semua**
- tombol <44×44: **0** (semua; joker-0/joker-1 diperbaiki lewat min-width/min-height 44px)
- error console: 0 (kecuali peringatan CSP `frame-ancestors` via `<meta>` yang sudah ada sebelum perbaikan ini)

## 2. Fungsi mesin yang tidak diubah (dipastikan tetap berfungsi)
`rollDice` RNG, `nextTurn`, `buildBoard`/`squareToPercent`, `SNAKES`/`LADDERS` pemetaan, `cellCenter`, `animateSnakeLadder`, `showTOD`/`todDoneInternal`/`resolveAfterTOD`, `saveGame`/`loadGame` (`tod_game_save_v2`), `validateSaveData` (pos 1–100, turn 0–1, item ≤15), `renderTodChallenge` (text node, escaping sekali), `parseDurationFromText`, `initCellTypes`, `selectMood`, `startGame`, `endGame`.

## 3. Bug ditemukan dan diperbaiki
1. **Reduced-motion bocor**: `heatPulse` (#heat-overlay), `.cell-pulse::after`, `.music-dot` tetap berjalan di bawah `prefers-reduced-motion` karena selektor spesifik lebih tinggi tidak terpengaruh aturan `*`. → Ditambahkan pengecualian eksplisit di media block (commit `5307b84`).
2. **Tap target <44×44**: `joker-0`/`joker-1` (div role="button") kurang dari 44px di semua viewport. → `min-width/min-height 44px`, `display inline-flex`, padding (commit `5307b84`).

## 4. Masalah tersisa
- Tidak ada. Semua assertion dan probe lolos.

## 5. Bukti eksekusi
- `node test/patch-test.js` → "40 lolos, 0 gagal", exit 0.
- `node test/responsive.js` → 7 viewport, overflow=false, board terlihat, smallButtons=0.
