/* ============================================================================
   patch-improvements.js — Ular Tangga Truth or Dare
   ----------------------------------------------------------------------------
   Drop-in patch untuk game di repo Kitomv/ulartangga (master, commit be5b450).
   Dibuat dari hasil playtest 23 Nov 2026 (test 1: 7/10, retest: 8/10).

   CARA PASANG (2 baris, di index.html, SETELAH game.js):
     <link rel="stylesheet" href="assets/css/patch-improvements.css?v=4"/>
     <script src="assets/js/patch-improvements.js?v=3"></script>
   Letakkan <link> di <head> (atau setelah style.css) dan <script> tepat
   setelah <script src="assets/js/game.js"></script>, sebelum </body>.

   YANG DIPERBAIKI (semua diverifikasi dari source master, bukan tebakan):
   P1. Token numpuk di kotak yang sama — positionPions() lama: dua token
       7.5% lebar, offset diagonal -1% / +3.5% => tumpang tindih ~3% lebar
       papan (~40% lebar token), plus SVG overflow:visible. Di kotak 1,
       token P0 malah meluber ke luar papan (-1%).
       Patch: token dibagi dua secara horizontal, scale(0.5) di sekitar
       bottom-centre — visual P0 menempati 0–5% sel, P1 5–10% sel,
       tanpa overlap dan tanpa keluar sel.
   P2. Skip TOD "hilang" setelah Main Lagi + token jarang didapat —
       (a) updateSkipTodUI() lama menyembunyikan tombol saat count = 0,
       jadi pemain mengira fiturnya rusak. Patch: tombol SELALU tampil,
       disabled + tooltip saat belum bisa dipakai.
       (b) resolveAfterTOD() lama memberi token HANYA kalau streak ke-3/6/9
       jatuh tepat di tantangan Dare/Duo/Wild/Berani. Kalau streak ke-3
       itu Truth, milestone hilang diam-diam — itulah kenapa di retest
       13 tantangan selesai di game ke-2 tidak menghasilkan token sama
       sekali. Patch: fallback award — setiap 3 tantangan selesai
       beruntun (tipe apa pun) dapat 1 token, kecuali kalau aslinya
       sudah memberi (tidak double).
       (c) useSkipTod() lama diam (return) kalau token = 0. Patch: beri
       log yang menjelaskan cara mendapat token.
   P3. "LEVEL PANAS NAIK" muncul padahal level sudah mentok — setLevelUI()
       lama menampilkan badge NAIK setiap kali window._adaptedDir = 'up',
       tanpa mengecek levelnya benar-benar berubah. Patch: badge hanya
       muncul kalau level memang berubah dari level sebelumnya.
   P4. Teks statis — subtitle "17+" dinormalisasi ke "18+", dan 3 aturan
       yang sudah berlaku di kode tapi tidak tertulis ditambahkan ke
       peraturan: dadu melebihi 100, cara dapat Skip TOD, dan reset Main Lagi.
   P5. updateUI() tidak pernah memanggil updateSkipTodUI(), jadi status
       disabled tombol Skip tidak pernah refresh saat giliran berubah.
       Patch: updateUI() dibungkus untuk selalu refresh tombol Skip.
   P6. Mode gelap in-game — papan cetak versi malam. Token remap di
       body.dark (CSS), plus tombol 🌙/☀️ di side panel. Pilihan disimpan
       di localStorage; default mengikuti prefers-color-scheme.

   TIDAK DIUBAH: game.js, style.css, challenges-*.js, dan HTML asli.
   Hapus 2 baris pemasangan di atas untuk kembali ke versi asli.
   ========================================================================== */
(function () {
  'use strict';

  if (window.__kuroPatchApplied) return;
  window.__kuroPatchApplied = true;

  // ── Simpan fungsi asli SEBELUM menimpa (assignment, bukan function
  //    declaration — declaration akan ter-hoist dan menimpa aslinya dulu).
  var _origPositionPions = window.positionPions;
  var _origUpdateSkipTodUI = window.updateSkipTodUI;
  var _origUseSkipTod = window.useSkipTod;
  var _origSetLevelUI = window.setLevelUI;
  var _origResolveAfterTOD = window.resolveAfterTOD;
  var _origResetGameState = window.resetGameState;
  var _origUpdateUI = window.updateUI;

  function warn(missing) {}

  // ── P1. Token di kotak yang sama: berdampingan, tanpa overlap ──────────
  if (typeof _origPositionPions === 'function') {
    window.positionPions = function positionPions() {
      var shared = pos[0] === pos[1];
      [0, 1].forEach(function (i) {
        var el = pionEls[i];
        if (!el) return;
        var sq = squareToPercent(pos[i]);
        el.style.left = sq.left + '%';
        el.style.top = sq.top + '%';
        // Ukuran div tetap 10% (satu sel), tapi visual diperkecil scale(0.5)
        // dengan transform-origin center bottom (sudah di CSS .pion).
        el.style.width = '10%';
        el.style.height = '10%';
        if (shared) {
          // P0: div di left-2.5%..left+7.5%, pusat left+2.5% -> visual 0–5%
          // P1: div di left+2.5%..left+12.5%, pusat left+7.5% -> visual 5–10%
          el.style.marginLeft = (i === 0 ? '-2.5' : '2.5') + '%';
          el.style.marginTop = '0%';
          el.style.transform = 'scale(0.5)';
          el.style.zIndex = 20 + i;
        } else {
          el.style.marginLeft = '0%';
          el.style.marginTop = '0%';
          el.style.transform = 'scale(1)';
          el.style.zIndex = 20;
        }
      });
    };
  } else warn('positionPions');

  // ── P2a. Tombol Skip TOD: selalu tampil, disabled saat tidak bisa ──────
  if (typeof _origUpdateSkipTodUI === 'function') {
    window.updateSkipTodUI = function updateSkipTodUI() {
      [0, 1].forEach(function (i) {
        var el = document.getElementById('skip-tod-btn-' + i);
        if (!el) return;
        var count = skipTodCount[i];
        el.style.display = 'inline-flex';
        el.textContent = '🎟️ Skip TOD ×' + count;
        var usable = count > 0 && phase === 'tod' && turn === i;
        el.disabled = !usable;
        if (count <= 0) {
          el.title = 'Belum punya token — selesaikan 3 tantangan beruntun untuk dapat 1 token.';
        } else if (phase !== 'tod') {
          el.title = 'Hanya bisa dipakai saat giliran TOD sedang berjalan.';
        } else if (turn !== i) {
          el.title = 'Bukan giliran kamu.';
        } else {
          el.title = 'Pakai untuk skip tantangan ini gratis (tanpa mundur kotak).';
        }
        if (el.classList) el.classList.toggle('skip-tod-disabled', !usable);
      });
    };
  } else warn('updateSkipTodUI');

  // ── P2c. useSkipTod: jangan diam saat token 0, beri penjelasan ─────────
  if (typeof _origUseSkipTod === 'function') {
    window.useSkipTod = function useSkipTod(playerIdx) {
      if (skipTodCount[playerIdx] <= 0) {
        addLog('🎟️ ' + PLAYERS[playerIdx].name + ' belum punya Skip TOD Token — selesaikan 3 tantangan beruntun!');
        return;
      }
      if (phase !== 'tod') { addLog('⚠️ Hanya bisa dipakai saat giliran TOD!'); return; }
      if (playerIdx !== turn) { addLog('⚠️ Bukan giliran kamu!'); return; }
      skipTodCount[playerIdx]--;
      updateSkipTodUI();
      sfx.skip();
      addLog('🎟️ ' + PLAYERS[playerIdx].name + ' pakai Skip TOD Token! (sisa: ' + skipTodCount[playerIdx] + ')');
      stopTimer();
      document.getElementById('tod-overlay').classList.remove('show');
      // No penalty — free skip
      resolveAfterTOD(false, true /* freeSkip */);
    };
  } else warn('useSkipTod');

  // ── P2b. Fallback award: setiap 3 tantangan selesai beruntun = 1 token ─
  //    Aslinya hanya memberi token kalau streak ke-3 itu Dare/Duo/Wild/
  //    Berani. Wrapper ini membiarkan aslinya jalan dulu, lalu memberi
  //    token hanya untuk kasus yang aslinya lewatkan (Truth, dsb.).
  if (typeof _origResolveAfterTOD === 'function') {
    window.resolveAfterTOD = function resolveAfterTOD(completed, isJoker, freeSkip) {
      var player = turn;
      var typeBefore = currentTodType;
      _origResolveAfterTOD(completed, isJoker, freeSkip);
      if (!completed || isJoker || freeSkip) return;
      var s = stats[player];
      if (!s) return;
      if (s.curStreak <= 0 || s.curStreak % 3 !== 0) return;
      var isDareType = (typeBefore === 'dare' || typeBefore === 'berani' ||
                        typeBefore === 'duo' || typeBefore === 'wild');
      if (isDareType) return; // aslinya sudah memberi token — jangan double
      skipTodCount[player]++;
      sfx.jokerGet();
      addLog('🎟️ ' + PLAYERS[player].name + ' dapat Skip TOD Token! (streak ' + s.curStreak + 'x)');
      if (typeof showStreakToast === 'function') {
        showStreakToast('🎟️ ' + PLAYERS[player].name + ' dapat Skip TOD Token!');
      }
      updateSkipTodUI();
    };
  } else warn('resolveAfterTOD');

  // ── P3. Badge NAIK/TURUN hanya saat level benar-benar berubah ──────────
  window.__patchPrevLevel = 'mild';
  if (typeof _origSetLevelUI === 'function') {
    window.setLevelUI = function setLevelUI(level) {
      var moodLabel = currentMood === 'liar' ? '💋' : currentMood === 'romantis' ? '💕' : '😜';
      var labels = {
        mild: '🌸 Level Ringan',
        medium: '🔥 Level Panas',
        hot: moodLabel + ' Level Spicy'
      };
      var cls = { mild: 'level-mild', medium: 'level-medium', hot: 'level-hot' };
      var adaptDir = window._adaptedDir;
      // Sebelumnya: badge muncul setiap kali adaptDir = 'up'/'down',
      // termasuk saat level sudah mentok di Spicy. Sekarang: hanya kalau
      // levelnya memang berubah dari yang terakhir ditampilkan.
      var changed = level !== window.__patchPrevLevel;
      var adaptBadge = (adaptDir === 'up' && changed)
        ? '<span style="font-size:10px;background:rgba(16,185,129,0.25);color:#34d399;border:1px solid #10b981;border-radius:8px;padding:1px 6px;margin-left:6px;font-weight:900">🔥 NAIK</span>'
        : (adaptDir === 'down' && changed)
        ? '<span style="font-size:10px;background:rgba(99,102,241,0.25);color:#a5b4fc;border:1px solid #6366f1;border-radius:8px;padding:1px 6px;margin-left:6px;font-weight:900">😌 TURUN</span>'
        : '';
      window.__patchPrevLevel = level;
      document.getElementById('level-label').innerHTML = labels[level] + adaptBadge;
      document.getElementById('level-label').className = 'level-label ' + cls[level];
      ['lpip-0', 'lpip-1', 'lpip-2'].forEach(function (id, i) {
        var pip = document.getElementById(id);
        pip.className = 'level-pip';
        if (level === 'mild' && i === 0) pip.classList.add('active-mild');
        if (level === 'medium' && i <= 1) pip.classList.add('active-medium');
        if (level === 'hot') pip.classList.add('active-hot');
      });
    };
  } else warn('setLevelUI');

  // ── P5. Reset + updateUI: selalu refresh tombol Skip & level ───────────
  if (typeof _origResetGameState === 'function') {
    window.resetGameState = function resetGameState() {
      _origResetGameState();
      window.__patchPrevLevel = 'mild';
      window._adaptedDir = null;
      updateSkipTodUI();
    };
  } else warn('resetGameState');

  if (typeof _origUpdateUI === 'function') {
    window.updateUI = function updateUI() {
      _origUpdateUI();
      updateSkipTodUI();
    };
  } else warn('updateUI');

  // ── P4. Teks statis: 17+ -> 18+, tambah 3 aturan yang belum tertulis ───
  function fixStaticText() {
    document.querySelectorAll('.subtitle').forEach(function (el) {
      el.textContent = el.textContent.replace(/17\+/g, '18+');
    });
    // Typo defence (di master sudah benar, tapi kalau deploy lama masih
    // menampilkan "labelTatauD", perbaiki di runtime).
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      if (n.nodeValue && n.nodeValue.indexOf('labelTatauD') !== -1) {
        n.nodeValue = n.nodeValue.replace(/labelTatauD/g, 'label T atau D');
      }
    });
    var ol = document.querySelector('#rules-overlay ol');
    if (ol && ol.textContent.indexOf('melebihi 100') === -1) {
      [
        '🎲 Dadu melebihi 100 = tetap di tempat, ganti giliran (harus pas sampai 100).',
        '🎟️ Skip TOD Token didapat tiap 3 tantangan selesai beruntun — pakai untuk skip gratis tanpa mundur kotak.',
        '🔁 Main Lagi mereset semua: posisi, skor ✅/❌, streak, Joker, dan Skip TOD kembali ke 0.'
      ].forEach(function (t) {
        var li = document.createElement('li');
        li.style.cssText = 'color:#e2e8f0;font-size:13px;line-height:1.5';
        li.textContent = t;
        ol.appendChild(li);
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixStaticText);
  } else {
    fixStaticText();
  }

  // ── P6. Mode gelap: papan cetak versi malam ─────────────────────────────
  var THEME_KEY = 'kuro-theme';
  function setAttr(el, k, v) { if (el && el.setAttribute) el.setAttribute(k, v); }
  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function writeTheme(v) {
    try { localStorage.setItem(THEME_KEY, v); } catch (e) {}
  }
  function applyTheme(dark, persist) {
    document.body.classList.toggle('dark', dark);
    var b = document.getElementById('btn-theme');
    if (b) {
      b.textContent = dark ? '☀️' : '🌙';
      setAttr(b, 'aria-pressed', dark ? 'true' : 'false');
      setAttr(b, 'aria-label', dark ? 'Mode terang' : 'Mode gelap');
    }
    if (persist) writeTheme(dark ? 'dark' : 'light');
  }
  window.toggleTheme = function toggleTheme() {
    applyTheme(!document.body.classList.contains('dark'), true);
  };
  var savedTheme = readTheme();
  var startDark = savedTheme
    ? savedTheme === 'dark'
    : typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(startDark, false);

})();
