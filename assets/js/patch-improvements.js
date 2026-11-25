/* ============================================================================
   patch-improvements.js — Ular Tangga Truth or Dare
   ----------------------------------------------------------------------------
   Drop-in patch untuk game di repo Kitomv/ulartangga (master, commit be5b450).
   Dibuat dari hasil playtest 23 Nov 2026 (test 1: 7/10, retest: 8/10).

   CARA PASANG (2 baris, di index.html, SETELAH game.js):
     <link rel="stylesheet" href="assets/css/patch-improvements.css?v=8"/>
     <script src="assets/js/patch-improvements.js?v=8"></script>
   Letakkan <link> di <head> (atau setelah style.css) dan <script> tepat
   setelah <script src="assets/js/game.js"></script>, sebelum </body>.

   YANG DIPERBAIKI (semua diverifikasi dari source master, bukan tebakan):
   P1. Token numpuk di kotak yang sama — positionPions() lama: dua token
       7.5% lebar, offset diagonal -1% / +3.5% => tumpang tindih ~3% lebar
       papan (~40% lebar token), plus SVG overflow:visible. Di kotak 1,
       token P0 malah meluber ke luar papan (-1%).
       Patch: dua token 0.72× (~28px di papan 390px) bersinggungan kiri|kanan
       di tengah sel, tanpa margin vertikal. Pasangannya sengaja menjulur ke
       sel tetangga; kalau menyentuh tepi papan keduanya digeser bersama
       supaya jarak antar token tetap 0.
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
   P7. (a) Token berjalan jauh lebih cepat — 1,95s jadi ~1,3s roll→modal.
       (b) Timer durasi tidak hidup lagi setelah "Main Lagi".
       (c) Tombol Skip TOD bisa diklik selagi modal tantangan terbuka.
   P8. Kartu Berani wajib dilakukan — opsi "Tidak Berani (−3)" dibuang dari
       kartu; hanya tombol Selesai. Tombol Skip TOD (token) tetap ada
       karena itu hadiah, bukan jalan keluar tanpa biaya.
   P9. Lawan menolak Dare — dulu hukumannya jatuh ke pemilik kartu: kalau
       tantangan menyuruh lawan melakukan sesuatu dan lawan menolak,
       pemilik kartu yang bayar skip −3. Sekarang kartu Dare punya tombol
       "🚫 Lawan menolak — dia mundur 3": pemilik kartu tetap dihitung
       selesai (dia sudah meminta), lawan yang mundur 3 dari posisinya
       sendiri, streak-nya putus, dan skip-nya tercatat. Kartu Berani
       tidak dapat tombol ini (wajib dilakukan).
   P10. Kalimat kartu lebih mudah dibaca — 39 kartu menaruh durasi sebagai
        ekor klausa: "... dan caranya — lakukan selama 30 detik." Sekarang
        durasi jadi kalimat sendiri: "... dan caranya. Lakukan selama
        30 detik." Rata-rata kalimat turun dari 17,5 jadi 14,9 kata.
   P11. Animasi in-game lebih mulus. Diagnosa trace CDP (4× CPU throttle,
        3 giliran): Layerize ~284–530ms dan RasterTask ~270–550ms
        mendominasi, bukan Layout/Paint per-event. Dua penyebab:
        (a) animateSteps() mentransisikan left/top — tiap langkah memicu
            layout + raster seluruh lapisan papan; (b) pulseCell() memaksa
            reflow (void offsetWidth) dan .cell-pulse menganimasikan filter
            di selnya. Patch: posisi token lewat translate piksel (left/top
            diset sekali di akhir), denyut digambar di .cell::after dengan
            opacity saja, animasi filter asli dimatikan. Terukur: Layout
            59→27ms, Paint 54→43ms, RasterTask 299→95ms, Layerize 284→89ms.

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
  var _origAnimateSteps = window.animateSteps;
  var _origConfirmReset = window.confirmReset;
  var _origRollDice = window.rollDice;
  var _origShowBeraniChallenge = window.showBeraniChallenge;
  function warn(missing) {}

  // ── P8. Kartu Berani wajib dilakukan: buang opsi "Tidak Berani (−3)" ───
  //    Asli: kartu Berani menawarkan tombol skip −3 kotak, sama seperti Dare.
  //    Sekarang kartu itu wajib — hanya ada tombol "Selesai!". Timer yang
  //    habis tetap dihitung selesai (todDoneInternal(true)), jadi tidak ada
  //    jalan keluar lewat timeout.
  if (typeof _origShowBeraniChallenge === 'function') {
    window.showBeraniChallenge = function showBeraniChallenge(sq, level) {
      _origShowBeraniChallenge(sq, level);
      var body = document.getElementById('tod-body');
      if (!body || !body.querySelector) return;
      // Kalau pool Berani kosong, aslinya jatuh ke kartu Dare — jangan
      // dicabut skip-nya. Kenali kartu Berani dari badge-nya.
      if (!body.querySelector('.pill-berani')) return;
      var skip = body.querySelector('.btn-skip');
      if (skip && skip.parentNode) skip.parentNode.removeChild(skip);
      var row = body.querySelector('.tod-action-btns');
      if (row && row.style) row.style.setProperty('grid-template-columns', '1fr', 'important');
      var rule = body.querySelector('.tod-rule');
      if (rule) rule.textContent = 'Kartu Berani wajib dilakukan — tidak ada opsi skip. 💪';
    };
  } else warn('showBeraniChallenge');

  // ── P9. Lawan menolak Dare: yang menolak mundur 3 kotak ────────────────
  //    Sebelumnya hukumannya jatuh ke pemilik kartu: kalau lawan menolak
  //    "minta lawanmu melakukan X", pemilik kartu yang bayar skip −3.
  //    Sekarang ada tombol ketiga di kartu Dare: lawan sendiri yang mundur.
  //    Pemilik kartu tetap dihitung selesai (dia sudah melakukan bagiannya:
  //    meminta), lalu lawan dipindah mundur 3 dari posisinya sendiri.
  //    Kartu Berani tidak dapat tombol ini (wajib dilakukan).
  var _origRenderChallenge = window.renderChallenge;
  if (typeof _origRenderChallenge === 'function') {
    window.renderChallenge = function renderChallenge(type, sq, level) {
      _origRenderChallenge(type, sq, level);
      if (type !== 'dare') return;
      var body = document.getElementById('tod-body');
      if (!body || !body.querySelector) return;
      var row = body.querySelector('.tod-action-btns');
      if (!row || !row.appendChild || row.querySelector('#btn-partner-refuse')) return;
      var btn = document.createElement('button');
      btn.id = 'btn-partner-refuse';
      btn.className = 'btn-partner-refuse';
      btn.type = 'button';
      btn.textContent = '🚫 Lawan menolak — dia mundur 3';
      btn.addEventListener('click', partnerRefuseDare);
      row.appendChild(btn);
    };
  } else warn('renderChallenge');

  function partnerRefuseDare() {
    var owner = turn;
    var other = (turn + 1) % 2;
    stopTimer();
    document.getElementById('tod-overlay').classList.remove('show');
    sfx.skip();
    stats[other].skipped++;
    stats[other].curStreak = 0;
    skipStreak[other]++;
    var back = Math.max(1, pos[other] - 3);
    addLog('🚫 ' + PLAYERS[other].name + ' menolak tantangan ' + PLAYERS[owner].name +
           ' — mundur 3 ke kotak ' + back);
    // Pemilik kartu dihitung selesai lebih dulu (ular/tangga & giliran tetap
    // berjalan seperti biasa), baru lawan dipindah supaya animasi pemilik
    // tidak bertabrakan dengan posisi lawan.
    resolveAfterTOD(true, false);
    setTimeout(function () {
      pos[other] = back;
      positionPions();
      var pp = document.getElementById('ppos-' + other);
      if (pp) pp.textContent = 'Kotak ' + back;
      if (typeof saveGame === 'function') saveGame();
    }, 0);
  }

  // ── P10. Kalimat kartu lebih mudah dibaca: instruksi durasi dipisah ─────
  //    Dulu 39 kartu menaruh durasi sebagai ekor klausa terakhir:
  //      "... dan caranya — lakukan selama 30 detik."
  //    Satu kalimat panjang berisi tiga klausa, dan bagian yang harus
  //    dituruti (berapa lama) justru yang paling mudah terlewat. Sekarang
  //    durasi jadi kalimat sendiri: "... dan caranya. Lakukan selama 30 detik."
  //    Timer TIDAK terpengaruh — parseDurationFromText() membaca teks asli
  //    sebelum render, dan angkanya tidak berubah.
  //    Hanya pola ekor itu yang disentuh; teks lain lewat apa adanya.
  var _origRenderTodChallenge = window.renderTodChallenge;
  var DURATION_TAIL = /\s+—\s+lakukan((?:\s+selama)?\s+[^.]*)\.\s*$/;
  if (typeof _origRenderTodChallenge === 'function') {
    window.renderTodChallenge = function renderTodChallenge(el, challenge, names) {
      var text = typeof challenge === 'string'
        ? challenge.replace(DURATION_TAIL, function (_, rest) { return '. Lakukan' + rest + '.'; })
        : challenge;
      return _origRenderTodChallenge(el, text, names);
    };
  } else warn('renderTodChallenge');

  // ── P(x). Papan: ular & tangga menjadi MIDNIGHT DESIRE ──
  //    Pemetaan ular/tangga dan koordinat cellCenter tidak berubah — hanya
  //    isian dan garis SVG yang di-rekoleur. Semua warna asli ada di dalam
  //    markup papan, jadi penggantian string tepat pada innerHTML overlay
  //    aman (tidak menyentuh UI di luar papan).
  if (typeof window.drawSnakesLadders === 'function') {
    var _origDrawSnakesLadders = window.drawSnakesLadders;
    var SL_COLOURS = {
      // tangga — emas campuran (rail, highlight, glint, baut)
      '#B8890E': '#D6B779',
      '#F7C083': '#ECD9B4',
      '#FFF3CF': '#F3E8E5',
      '#C97716': '#B8890E',
      '#fde68a': '#D6B779',
      '#FFD166': '#D6B779',
      // ular — gelap hias, sorotan emas 20 %
      '#A3271F': '#2A1017',
      '#FBA6A2': 'rgba(214,183,121,0.20)',
      'rgba(159,18,57,0.75)': 'rgba(89,20,39,0.75)',
      'rgba(136,19,55,0.65)': 'rgba(89,20,39,0.65)',
      'rgba(190,18,60,0.5)': 'rgba(89,20,39,0.5)',
      'rgba(253,164,175,0.35)': 'rgba(214,183,121,0.20)',
      '#8E2F27': '#2A1017',
      '#F27A52': '#5B1427',
      '#C0392B': '#A32648',
      '#F4514B': '#D98C9F',
      '#1B1633': '#130D12',
      'rgba(246,236,216,0.4)': 'rgba(243,232,229,0.30)',
      '#0c0a09': '#130D12'
    };
    function escapeRegExp(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    window.drawSnakesLadders = function drawSnakesLadders() {
      _origDrawSnakesLadders();
      var svg = document.getElementById('board-overlay');
      if (!svg) return;
      var html = svg.innerHTML;
      Object.keys(SL_COLOURS).forEach(function (oldC) {
        var newC = SL_COLOURS[oldC];
        var re = new RegExp('(stop-color="|fill="|stroke=")' + escapeRegExp(oldC) + '"', 'g');
        html = html.replace(re, '$1' + newC + '"');
      });
      svg.innerHTML = html;
    };
  } else warn('drawSnakesLadders');

  // ── Dadu — badan malam, sorotan emas, titik tetap warna pemain ──
  if (typeof window.renderDice === 'function') {
    var _origRenderDice = window.renderDice;
    window.renderDice = function renderDice(val) {
      _origRenderDice(val);
      var wrap = document.getElementById('dice-wrap');
      if (!wrap) return;
      wrap.innerHTML = wrap.innerHTML
        .replace(/fill="#1C1636"/g, 'fill="#1B1218"')
        .replace(/fill="#16112B"/g, 'fill="#130D12"');
    };
  } else warn('renderDice');

  // ── P1. Token di kotak yang sama: dua token besar, bersebelahan ────────
  //    Asli: 7.5% + margin -1%/+3.5% → dua token ~19px di papan 390px yang
  //    saling menutup, dan margin vertikal positif membuat token P1
  //    terpotong tepi bawah (#pion-layer overflow:hidden) di kotak 1.
  //    Sekarang: dua token 0.72× (~28px) bersinggungan kiri|kanan di tengah
  //    sel, tanpa transform vertikal (jadi tak pernah kena tepi bawah).
  //    Pasangan selebar 14.4% sengaja menjulur ke sel tetangga — token
  //    melayang di atas papan. Bila pasangan menyentuh tepi papan, KEDUANYA
  //    digeser bersama (corr), bukan diklem sendiri-sendiri: jarak antar
  //    token tetap 0 dan lebarnya tetap 7.2% masing-masing.
  var SHARED_SCALE = 0.72;
  if (typeof _origPositionPions === 'function') {
    window.positionPions = function positionPions() {
      var shared = pos[0] === pos[1];
      var half = 5 * SHARED_SCALE;   // 3.6 — setengah lebar token hasil scale
      var pairHalf = 2 * half;       // 7.2 — setengah lebar pasangan
      [0, 1].forEach(function (i) {
        var el = pionEls[i];
        if (!el) return;
        var sq = squareToPercent(pos[i]);
        el.style.left = sq.left + '%';
        el.style.top = sq.top + '%';
        el.style.width = '10%';
        el.style.height = '10%';
        el.style.marginTop = '0%';
        if (!shared) {
          el.style.marginLeft = '0%';
          el.style.transform = 'scale(1)';
          el.style.zIndex = 20;
          return;
        }
        // Pasangan: P0 [left-2.2, left+5], P1 [left+5, left+12.2]
        var corr = Math.max(0, pairHalf - 5 - sq.left);
        corr = Math.min(corr, 95 - sq.left - pairHalf);
        el.style.marginLeft = round2((i === 0 ? -half : half) + corr) + '%';
        el.style.transform = 'scale(' + SHARED_SCALE + ')';
        el.style.zIndex = 20 + i;
      });
    };
  } else warn('positionPions');

  function round2(n) { return Math.round(n * 100) / 100; }

  // ── P2a. Tombol Skip TOD: selalu tampil, disabled saat tidak bisa ──────
  //    Termasuk cerminannya di dalam modal (#tod-overlay z-index 100 menutupi
  //    tombol di kartu pemain, jadi tombol di kartu tak bisa diklik saat TOD
  //    terbuka — dulu itulah satu-satunya tombol Skip gratis).
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
      var modalBtn = document.getElementById('skip-tod-modal');
      if (modalBtn) {
        var n = skipTodCount[turn];
        modalBtn.textContent = '🎟️ Skip tantangan ini — gratis ×' + n;
        modalBtn.disabled = !(n > 0 && phase === 'tod');
        if (modalBtn.classList) modalBtn.classList.toggle('skip-tod-disabled', modalBtn.disabled);
      }
    };
  } else warn('updateSkipTodUI');

  // Tombol Skip di dalam modal: satu-satunya jalan karena overlay menutupi
  // kartu pemain. Dibuat di DOM, bukan di index.html, supaya patch tetap drop-in.
  function injectModalSkip() {
    var card = document.getElementById('tod-card');
    var joker = document.getElementById('btn-joker');
    if (!card || !joker || document.getElementById('skip-tod-modal')) return;
    var btn = document.createElement('button');
    btn.id = 'skip-tod-modal';
    btn.className = 'btn-skip-tod-modal';
    btn.type = 'button';
    btn.addEventListener('click', function () { useSkipTod(turn); });
    joker.parentNode.insertBefore(btn, joker.nextSibling);
    updateSkipTodUI();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectModalSkip);
  } else {
    injectModalSkip();
  }

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

  // ── P5. Token berjalan lebih lambat, lebih terbaca ─────────────────────
  //    Asli: per kotak 0.68×stepMs + 0.6×stepMs = 1.28×stepMs, ditambah
  //    bounce 190ms. Patch: jeda per kotak dinaikkan supaya tiap langkah
  //    jelas terlihat — 6 kotak ~0,86s di stepMs 150. Dadu (750ms di
  //    rollDice) tidak diubah.
  if (typeof _origAnimateSteps === 'function') {
    window.animateSteps = function animateSteps(playerIdx, from, to, callback) {
      var el = pionEls[playerIdx];
      var dir = to > from ? 1 : -1;
      var steps = Math.abs(to - from);
      var cur = from, step = 0;
      var stepMs = steps <= 2 ? 200 : steps <= 4 ? 175 : 150;
      //    P11: posisi pindah lewat translate di ruang piksel, bukan left/top.
      //    left/top memicu layout + raster ulang seluruh lapisan papan tiap
      //    langkah; translate cukup compositor. Trace 4x throttle/3 giliran:
      //    Layout 59->27ms, Paint 54->43ms, RasterTask 299->95ms, Layerize 284->89ms.
      //    left/top diset sekali di akhir, jadi tidak ada lompatan.
      var board = el.parentNode.getBoundingClientRect();
      var W = board.width, H = board.height;
      var startSq = squareToPercent(from);
      var sx = (startSq.left / 100) * W, sy = (startSq.top / 100) * H;
      el.style.transition = 'transform ' + stepMs + 'ms cubic-bezier(0.4,0,0.2,1)';
      el.style.willChange = 'transform';
      el.style.filter = 'drop-shadow(0 4px 10px rgba(0,0,0,0.8))';
      el.style.left = startSq.left + '%';
      el.style.top = startSq.top + '%';
      function land() {
        // translate terakhir sudah menaruh token tepat di kotak tujuan, jadi
        // pindah ke left/top + transform identitas tidak menggeser apa pun.
        // Transisi dimatikan dulu supaya transform tidak "mundur" animasi.
        var f = squareToPercent(cur);
        el.style.transition = 'none';
        el.style.transform = 'none';
        el.style.left = f.left + '%';
        el.style.top = f.top + '%';
        el.style.willChange = 'auto';
        el.style.filter = 'drop-shadow(0 4px 10px rgba(0,0,0,0.8))';
        pos[playerIdx] = cur;
        positionPions();
        callback();
        setTimeout(function () { el.style.transition = ''; }, 0);
      }
      function doStep() {
        cur += dir; step++;
        var sq = squareToPercent(cur);
        var p = Math.sin((step / steps) * Math.PI);
        el.style.transform = 'translate(' + ((sq.left / 100) * W - sx).toFixed(1) + 'px,'
          + ((sq.top / 100) * H - sy).toFixed(1) + 'px) '
          + 'scale(' + (1 + 0.4 * p).toFixed(2) + ') translateY(' + (-9 * p).toFixed(1) + 'px)';
        pulseCell(cur);
        sfx.step();
        setTimeout(function () {
          var pp = document.getElementById('ppos-' + playerIdx);
          if (pp) pp.textContent = 'Kotak ' + cur;
          if (step < steps) doStep();
          else land();
        }, stepMs * 0.95);
      }
      doStep();
    };
  } else warn('animateSteps');

  // ── P11b. Denyut kotak tanpa reflow paksa ──────────────────────────────
  //    Asli: classList.remove → `void cell.offsetWidth` (layout sinkron) →
  //    classList.add. Reflow itu cuma dipakai untuk me-restart animasi filter
  //    di sel. Animasi itu sekarang dimatikan di CSS dan diganti fade
  //    opacity di .cell::after, jadi reflow-nya dibuang. Restart tetap
  //    aman: kotak berurutan selalu beda, dan giliran berjarak >0,34s.
  if (typeof window.pulseCell === 'function') {
    window.pulseCell = function pulseCell(n) {
      var cell = document.getElementById('cell-' + n);
      if (!cell) return;
      if (cell.classList) cell.classList.remove('cell-pulse');
      if (cell.classList) cell.classList.add('cell-pulse');
      cell.addEventListener('animationend', function () {
        cell.classList.remove('cell-pulse');
      }, { once: true });
    };
  } else warn('pulseCell');

  // ── P5b. Lemparan dadu: putaran 750ms -> 420ms ─────────────────────────
  //    Modal baru muncul setelah animasi selesai, dan 750ms itu yang
  //    mendominasi lemparan pendek (1–2 kotak). 420ms masih terbaca
  //    sebagai dadu berputar. Logika dadu/ular/tangga tidak diubah —
  //    salinan persis rollDice() asli, hanya durasi putarannya.
  if (typeof _origRollDice === 'function') {
    window.rollDice = function rollDice() {
      if (phase !== 'roll' || rolling) return;
      rolling = true; updateUI();
      var wrap = document.getElementById('dice-wrap');
      wrap.classList.add('rolling');
      sfx.diceRoll();
      var spin = setInterval(function () { renderDice(Math.ceil(Math.random() * 6)); }, 70);
      setTimeout(function () {
        clearInterval(spin); wrap.classList.remove('rolling');
        var dice = Math.ceil(Math.random() * 6);
        sfx.diceLand();
        renderDice(dice); rolling = false;
        pendDice = dice;
        var cur = pos[turn], raw = cur + dice;
        if (raw > 100) {
          addLog(PLAYERS[turn].name + ' 🎲 Dadu ' + dice + '. Butuh ' + (100 - cur) + ' lagi!');
          nextTurn(); return;
        }
        pendRaw = raw;
        pendAfter = SNAKES[raw] != null ? SNAKES[raw] : (LADDERS[raw] != null ? LADDERS[raw] : raw);
        addLog(PLAYERS[turn].name + ' 🎲 Dadu ' + dice
          + (dice === 6 ? ' — BONUS GILIRAN! 🎲' : '') + ' → kotak ' + raw);
        updateUI();
        var btn = document.getElementById('btn-roll');
        if (btn) btn.textContent = '⏳ Bergerak...';
        animateSteps(turn, cur, raw, function () {
          if (pos[turn] === 100) { endGame(); return; }
          phase = 'tod'; updateUI();
          showTOD(raw);
        });
      }, 420);
    };
  } else warn('rollDice');

  // ── P3. Durasi game setelah "Main Lagi" ────────────────────────────────
  //    confirmReset() tidak memanggil startDurationTimer(), jadi kotak timer
  //    tetap display:none sepanjang game ke-2 dan modal pemenang tanpa durasi.
  if (typeof _origConfirmReset === 'function') {
    window.confirmReset = function confirmReset() {
      _origConfirmReset();
      startDurationTimer();
    };
  } else warn('confirmReset');

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

  // ── P6. Tema: gelap default (Midnight Desire), terang = candlelight ──
  //    body.dark lama = piring malam netral. Sekarang toggle adalah
  //    "malam / terang": body.light adalah alternatif papan kertas warna
  //    avorio. Kunci disimpan di kuro-theme-v2 (baru) agar nilai lama dari
  //    kuro-theme tidak memaksa tema tak terduga.
  var THEME_KEY = 'kuro-theme-v2';
  function setAttr(el, k, v) { if (el && el.setAttribute) el.setAttribute(k, v); }
  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function writeTheme(v) {
    try { localStorage.setItem(THEME_KEY, v); } catch (e) {}
  }
  function applyTheme(light, persist) {
    document.body.classList.toggle('light', light);
    var b = document.getElementById('btn-theme');
    if (b) {
      b.textContent = light ? '☀️' : '🌙';
      setAttr(b, 'aria-pressed', light ? 'true' : 'false');
      setAttr(b, 'aria-label', light ? 'Mode gelap' : 'Mode terang');
    }
    if (persist) writeTheme(light ? 'light' : 'midnight');
  }
  window.toggleTheme = function toggleTheme() {
    applyTheme(!document.body.classList.contains('light'), true);
  };
  var savedTheme = readTheme();
  var startLight = savedTheme
    ? savedTheme === 'light'
    : typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(startLight, false);

  // ── P7. Timer TOD: durasi benar untuk tantangan per-titik / bergantian ──
  //    parseDurationFromText() di game.js hanya ambil durasi pertama ("X detik")
  //    dan abaikan durasi per-item ("5 detik tiap titik", "10 detik per kata").
  //    Hasil: timer terlalu pendek (misal 75 detik dipadukan 15 detik = 15s).
  //    Override global karena game.js memanggil binding ini langsung (sloppy mode,
  //    tidak ada module). Visual / UX only — mapping ular/tangga, posisi, dan
  //    aturan permainan tidak berubah.
  var _origParseDuration = window.parseDurationFromText;
  if (typeof _origParseDuration === 'function') {
    window.parseDurationFromText = function parseDurationFromText(text) {
      var plain = String(text).replace(/<[^>]+>/g, '');
      var lower = plain.toLowerCase();
      // Open-ended: tidak ada timer sama sekali.
      var NO_TIMER_KEYWORDS = [
        'tahan napas', 'tahan nafas',
        'sampai x bilang stop', 'bilang stop',
        'tahan sampai x yang pertama', 'yang pertama melepas',
        'jangan berhenti sampai', 'tidak boleh berhenti sampai',
        'sampai aku bilang', 'sampai kamu bilang',
        'selama yang bisa', 'selama yang kamu bisa', 'selama yang aku bisa',
      ];
      var i;
      for (i = 0; i < NO_TIMER_KEYWORDS.length; i++) {
        if (lower.indexOf(NO_TIMER_KEYWORDS[i]) !== -1) return -1;
      }
      // Durasi keseluruhan eksplisit ("selama 30 detik", "lakukan selama 2 menit").
      var total = 0;
      var reTotal = /selama\s*([0-9]+)\s*(detik|menit)/gi;
      var tm;
      while ((tm = reTotal.exec(plain)) !== null) {
        var v = parseInt(tm[1], 10);
        total += tm[2].toLowerCase() === 'menit' ? v * 60 : v;
      }
      // Marker per-item: durasi tiap-tiap titik/kata, bukan total.
      var perItem = /(tiap|setiap|masing-masing|bergantian|per kata|per titik|di beberapa titik)/i.test(plain);
      if (perItem) {
        if (total > 0) return total;               // "selama 75 detik ... tahan 15 detik tiap titik"
        var per = plain.match(/([0-9]+)\s*detik/i);
        var perSecs = per ? parseInt(per[1], 10) : 5;
        var countMatch = plain.match(/([0-9]+)\s*(titik|kata)/i);
        var count = countMatch ? parseInt(countMatch[1], 10) : 5;
        return perSecs * count;
      }
      if (total > 0) return total;
      return _origParseDuration(text);
    };
  } else {
    warn('parseDurationFromText');
  }

})();
