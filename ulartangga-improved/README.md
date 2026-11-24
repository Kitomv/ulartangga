# Ular Tangga — Truth or Dare: Improvement Patch

Patch hasil playtest 23 Nov 2026 (test 1: **7/10**, retest: **8/10**).
Dibuat dari source repo `Kitomv/ulartangga`, branch `master`, commit `be5b450`
— semua root cause diverifikasi langsung dari `assets/js/game.js` (5.888 baris)
dan `assets/css/style.css` (2.226 baris), bukan dari tebakan.

## Cara pasang (2 menit, tanpa edit file asli)

Di `ular-tangga-split.html`:

1. Di `<head>`, setelah baris `<link rel="stylesheet" href="assets/css/style.css?v=3"/>`, tambah:
   ```html
   <link rel="stylesheet" href="assets/css/patch-improvements.css?v=1"/>
   ```
2. Di akhir `<body>`, tepat setelah `<script src="assets/js/game.js"></script>`, tambah:
   ```html
   <script src="assets/js/patch-improvements.js?v=1"></script>
   ```
3. Copy dua file ini ke repo, dengan struktur yang sama:
   - `assets/js/patch-improvements.js`
   - `assets/css/patch-improvements.css`
4. Commit, push, tunggu GitHub Pages deploy, lalu hard refresh (`Ctrl+Shift+R`).

Untuk kembali ke versi asli: hapus 2 baris di atas. Tidak ada file asli yang diubah.

## Yang diperbaiki

| # | Masalah (retest 23 Nov) | Root cause di master | Fix di patch |
|---|---|---|---|
| P1 | Token numpuk di kotak 1 — Hello Kitty ketutup Hamtaro | `positionPions()` (game.js:2025): token 7,5% lebar, offset diagonal −1% / +3,5% → tumpang tindih ~40% lebar token; SVG `overflow:visible` | Token dibagi dua horizontal, `scale(0.5)` di sekitar bottom-centre: visual P0 0–5% sel, P1 5–10% sel, tanpa overlap dan tanpa keluar sel |
| P2 | Skip TOD "hilang" setelah Main Lagi + token tidak didapat di game ke-2 (13 tantangan, 0 token) | (a) `updateSkipTodUI()` (game.js:2296) menyembunyikan tombol saat count = 0. (b) `resolveAfterTOD()` (game.js:3587) memberi token HANYA kalau streak ke-3/6/9 jatuh di Dare/Duo/Wild/Berani — kalau streak ke-3 itu Truth, milestone hilang diam-diam. (c) `useSkipTod()` diam saat token 0 | (a) Tombol selalu tampil, disabled + tooltip saat belum bisa dipakai. (b) Fallback award: setiap 3 tantangan selesai beruntun (tipe apa pun) dapat 1 token — kalau aslinya sudah memberi, tidak double. (c) Klik saat token 0 memberi log cara mendapat token |
| P3 | "LEVEL PANAS🔥 NAIK" muncul padahal level sudah mentok (11/21 modal) | `setLevelUI()` (game.js:2898) menampilkan badge NAIK setiap kali `window._adaptedDir = 'up'`, tanpa cek level benar-benar berubah | Badge hanya muncul kalau level memang berubah dari level sebelumnya |
| P4 | Nomor kotak kecil & redup; level bar tipis; modal sempit di layar kecil | `.cell-num` clamp(7px,1vw,10px) warna 0.65, di mobile 4–6px; `.level-pip` 4px | Nomor jadi clamp(9px,1.3vw,12px) putih penuh + background lebih gelap; pip 6px; modal winner/stats max 94vw di bawah 900px |
| P5 | Teks: subtitle "17+" vs gate 18+, typo "labelTatauD", 3 aturan tidak tertulis | Teks di HTML/deploy lama; aturan overshoot / Skip TOD / reset hanya ada di kode | Patch normalisasi "17+" → "18+" di runtime, tambah 3 butir peraturan (dadu melebihi 100, cara dapat Skip TOD, reset Main Lagi) |

## Yang SUDAH benar di master (tidak disentuh)

- Restart / Main Lagi sudah mereset skor ✅/❌, streak, Joker, timer, dan log (`resetGameState()`, game.js:1007).
- Modal tantangan muncul < 1 detik (730–920 ms di retest).
- Log game sudah bisa di-scroll (`overflow-y:auto`, max-height 160px).
- Tombol Skip di modal sudah jelas: "Skip — mundur 3 kotak".
- Dadu melebihi 100 sudah ditangani di kode (tetap di tempat, ganti giliran) — hanya belum tertulis di peraturan, sekarang ditambahkan patch.

## Cara ngetes (checklist retest)

1. Buka game, mulai game baru — di kotak 1, kedua token harus kelihatan penuh, berdampingan, tidak saling menutup.
2. Mainkan sampai ada yang menang, klik **Main Lagi** — skor ✅0 ❌0, dan tombol **Skip TOD ×0** harus tetap terlihat (abu-abu, disabled, bukan hilang).
3. Selesaikan 3 tantangan beruntun apa pun (Truth boleh) — token Skip TOD harus bertambah 1, dengan log + toast "dapat Skip TOD Token!".
4. Klik tombol Skip TOD di luar giliran TOD — tombol harus disabled, tidak ada toast.
5. Naik level sampai Spicy, lalu selesaikan tantangan lagi di level yang sama — badge "🔥 NAIK" tidak boleh muncul lagi.
6. Cek nomor kotak: terbaca jelas di desktop dan HP; cek modal pemenang di lebar ~880px: tidak ada label bertumpuk.

Kalau semua lolos, rating yang ditargetkan: **9/10** (sisa 1 poin untuk polish visual lanjutan, bukan bug fungsional).

## File di folder ini

- `assets/js/patch-improvements.js` — patch JS (drop-in, override via `window.*`).
- `assets/css/patch-improvements.css` — patch CSS (load setelah style.css).
- `test/patch-test.js` — harness Node untuk uji logika patch dengan DOM stub (lihat bawah).
- `README.md` — file ini.

## Uji otomatis

```bash
node --check assets/js/patch-improvements.js
node test/patch-test.js
```

Harness menguji dengan stub DOM + fungsi asli yang disalin dari master:
token berbagi kotak tidak overlap, tombol Skip selalu tampil & disabled
saat token 0, fallback award di streak ke-3 Truth, badge NAIK tidak
muncul dua kali di level yang sama, dan reset mengembalikan level ke mild.
