# REDESIGN_REPORT.md — MIDNIGHT DESIRE

Tanggal: 2026-11-24
Branch: `redesign/midnight-desire`
Commit terakhir: `5307b84` (fix: reduced-motion karak + joker token ≥44px)

## 1. Apa yang berubah secara visual

Seluruh lapisan visual ditimpa melalui patch drop-in (tanpa mengedit `style.css`, `game.js`, `challenges-*.js`):

### Design system (tokens + tipografi)
- Palet MIDNIGHT DESIRE di `:root`: `--md-black #130D12`, `--md-burgundy #54152B`, `--md-red #A32648`, `--md-rose #D98C9F`, `--md-gold #D6B779`, `--md-ivory #F3E8E5`, diturunkan `--md-black-2/3`, `--md-line`, `--md-line-soft`, `--md-glow`, `--liar`.
- Token engine di-remap: `--paper`→`--md-black`, `--ink`→`--md-ivory`, `--coral`/`--marigold`/`--butter`→gold/red, `--liar`→`#7E1027`, `--font-display` Cormorant Garamond, `--font-ui` Jost.
- Google Fonts (Cormorant Garamond + Jost) ditambahkan ke `index.html` di samping Fraunces/Karla sebagai fallback. CSP tidak diubah (font-src `fonts.gstatic.com`, style-src `fonts.googleapis.com` sudah diizinkan).
- Label tidak ALL-CAPS (sentence case). `h1` pakai Cormorant Garamond WONK 900.
- `body.light` = alternatif kertas avorio (palette terbalik), dipilih via `prefers-color-scheme: light` default, disimpan di `kuro-theme-v2` (kunci baru agar nilai lama `kuro-theme` tidak memaksa tema).

### Layar
- Consent screen: latar malam, border rambut emas, stempel coral, tombol konfirmasi merah dengan sorotan emas.
- Name screen (landing): judul MIDNIGHT LOVE-ish, subtitle "A Game of Love, Temptation & Connection", tombol aturan/kustom outline emas.
- Setup: dua panel P1 (rules merah) / P2 (rules emas), input transparan border emas, fokus bersinar `--md-glow`.
- Mood cards (3 mode): Romantis rose/teasing playful/spicy liar, masing-masing warna latar aktif, `::after "✓"` dan cincin emas saat `.active`, hover `translateY(-1px)`.
- Papan: frame rambut emas + bayangan lilin (`--md-glow`), sel bergantian `--md-black-2/3`, nomor sel Jost ivory dengan knockout gelap, cuwas sel khusus ≤12% alpha (duo slate, joker emas, wild rose, berani crimson).
- Snakes & tangga di SVG di-rekoleur ke palet malam (pemetaan dan koordinat tidak berubah).
- Dadu: badan `--md-black-2`/`--md-black`, stroke emas.
- `.btn-roll`: gradien burgundy→merah, label ivory, state disabled 12% ivory.
- Tombol utilitas ≥44×44, ikon rambut emas.
- Overlay: sambak velvet `rgba(10,6,9,0.82)`, `.tod-card` burgundy dengan frame emas di dalam.
- Tombol done/skip/joker: outline emas, fill burgundy, 44px, fokus ring jelas.
- `.cell-pulse` dialihkan ke opacity saja di `::after` (compositor, tanpa repaint sel).

### Animasi / gerak
- Token bergerak lewat `transform` (translate) bukan `left/top` (compositor).
- Roll dadu 420ms (dari 750ms).
- `prefers-reduced-motion: reduce` mematikan semua animasi dekorasi (heatPulse, cell-pulse, musicPulse, screen enter/exit).

### File yang dimodifikasi
- `assets/css/patch-improvements.css` — token, tipografi, chrome, board, motion, reduced-motion, joker-token tap target.
- `assets/js/patch-improvements.js` — `drawSnakesLadders` wrapper (rekolur SVG), `renderDice` wrapper (rekolur dadu), `animateSteps`/`pulseCell`/`rollDice` wrapper (gerak kompositor), tema `light`/`midnight` + kunci `kuro-theme-v2`.
- `index.html` — link font Google, bump `?v=8`→`?v=9` pada kedua aset patch.

## 2. File yang tidak disentuh (read-only, dipertahankan)
`style.css`, `game.js`, `challenges-*.js`, markup `index.html` selain tag link/script dan teks statis. Pemetaan ular/tangga, penomoran papan, RNG, urutan giliran, logika TOD/skip/joker, dan penyimpanan `tod_game_save_v2` tidak diubah.

## 3. Fungsi yang dibungkus patch (pola `var _origX` sebelum reassignment)
`drawSnakesLadders`, `renderDice`, `animateSteps`, `pulseCell`, `rollDice`, `updateUI`, `setLevelUI`, `resolveAfterTOD`, `resetGameState`, `confirmReset`, `updateSkipTodUI`, `useSkipTod`, `showBeraniChallenge`, `renderChallenge`, `positionPions`, `toggleTheme`.

## 4. Hasil uji
- `node test/patch-test.js`: 40 lolos, 0 gagal (exit 0).
- Responsif 7 viewport (320×568 … 1920×1080): tidak ada overflow horizontal, papan terlihat semua, 0 tombol <44×44, tidak ada error console (kecuali peringatan CSP `frame-ancestors` via meta yang sudah ada sebelum ini).

## 5. Pengajuan kembali (rollback)
Semua perubahan additif pada dua file patch + teks statis di `index.html`. Menghapus 2 baris pemasangan di `index.html` kembali ke tampilan asli tanpa perubahan mesin.
