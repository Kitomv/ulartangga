/* Harness uji patch-improvements.js dengan DOM stub.
   Fungsi "asli" di bawah ini adalah versi ringkas yang meniru perilaku
   master (game.js) pada bagian yang relevan — bukan copy penuh game.js.
   Jalankan: node test/patch-test.js   (dari folder ulartangga-improved/)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── DOM stub ─────────────────────────────────────────────────────────────
class El {
  constructor(id) {
    this.id = id;
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
    this.disabled = false;
    this.title = '';
    const classes = new Set();
    this.classList = {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, f) => { if (f) classes.add(c); else classes.delete(c); },
      contains: (c) => classes.has(c),
    };
  }
}
const els = {};
function getEl(id) { if (!els[id]) els[id] = new El(id); return els[id]; }

global.document = {
  readyState: 'complete',
  getElementById: (id) => getEl(id),
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => new El('tmp'),
  createTreeWalker: () => ({ nextNode: () => false, currentNode: null }),
  addEventListener: () => {},
  body: new El('body'),
};
global.NodeFilter = { SHOW_TEXT: 4 };
global.window = global;

// ── State game (meniru game.js) ──────────────────────────────────────────
global.pos = [1, 1];
global.turn = 0;
global.phase = 'roll';
global.currentMood = 'romantis';
global.currentTodType = null;
global.skipTodCount = [0, 0];
global.stats = [
  { done: 0, skipped: 0, curStreak: 0, maxStreak: 0 },
  { done: 0, skipped: 0, curStreak: 0, maxStreak: 0 },
];
global.PLAYERS = [{ name: 'Ana', colorHex: '#f472b6' }, { name: 'Ben', colorHex: '#fb923c' }];
global.pionEls = [new El('pion-0'), new El('pion-1')];
global.squareToPercent = (n) => {
  const rfb = Math.floor((n - 1) / 10), pip = (n - 1) % 10;
  const col = rfb % 2 === 0 ? pip : 9 - pip, row = 9 - rfb;
  return { left: col * 10, top: row * 10 };
};
const logs = [];
global.addLog = (m) => logs.push(m);
global.showStreakToast = () => {};
global.stopTimer = () => {};
global.sfx = { skip: () => {}, jokerGet: () => {} };

// ── Fungsi asli (ringkas, meniru master) ─────────────────────────────────
global.positionPions = function () { // master: 7.5% + offset diagonal
  const shared = pos[0] === pos[1];
  [0, 1].forEach((i) => {
    const el = pionEls[i];
    const sq = squareToPercent(pos[i]);
    el.style.left = sq.left + '%'; el.style.top = sq.top + '%';
    if (shared) {
      el.style.width = '7.5%'; el.style.height = '7.5%';
      el.style.marginLeft = i === 0 ? '-1%' : '3.5%';
      el.style.marginTop = i === 0 ? '-1%' : '3.5%';
    } else {
      el.style.width = '10%'; el.style.height = '10%';
      el.style.marginLeft = '0%'; el.style.marginTop = '0%';
    }
  });
};
global.updateSkipTodUI = function () { // master: sembunyikan kalau 0
  [0, 1].forEach((i) => {
    const el = getEl('skip-tod-btn-' + i);
    if (skipTodCount[i] > 0) { el.style.display = 'inline-flex'; el.textContent = '🎟️ Skip TOD ×' + skipTodCount[i]; }
    else el.style.display = 'none';
  });
};
global.useSkipTod = function (i) { if (skipTodCount[i] <= 0) return; };
global.setLevelUI = function (level) { // master: badge NAIK tanpa cek berubah
  const badge = window._adaptedDir === 'up' ? '🔥 NAIK' : '';
  getEl('level-label').innerHTML = level + badge;
};
global.resolveAfterTOD = function (completed) { // master: award hanya dare-like
  if (!completed) return;
  const s = stats[turn];
  s.done++; s.curStreak++;
  const isDare = ['dare', 'berani', 'duo', 'wild'].includes(currentTodType);
  if (isDare && s.curStreak % 3 === 0) { skipTodCount[turn]++; }
};
global.resetGameState = function () {
  pos = [1, 1]; turn = 0; phase = 'roll';
  skipTodCount = [0, 0];
  stats = [
    { done: 0, skipped: 0, curStreak: 0, maxStreak: 0 },
    { done: 0, skipped: 0, curStreak: 0, maxStreak: 0 },
  ];
};
global.updateUI = function () { positionPions(); };

// ── Load patch ───────────────────────────────────────────────────────────
const patchPath = path.join(__dirname, '..', 'assets', 'js', 'patch-improvements.js');
vm.runInThisContext(fs.readFileSync(patchPath, 'utf8'), { filename: 'patch-improvements.js' });

// ── Assert ───────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); }
}
// Visual span token: div [left+margin, left+margin+10], scale s di sekitar
// pusat => visual [pusat - 5*s, pusat + 5*s], dalam % lebar papan.
function visualSpan(el) {
  const left = parseFloat(el.style.left) + parseFloat(el.style.marginLeft || '0');
  const scale = el.style.transform === 'scale(0.5)' ? 0.5 : 1;
  const centre = left + 5;
  return [centre - 5 * scale, centre + 5 * scale];
}

console.log('P1 — token berbagi kotak:');
pos = [1, 1]; positionPions();
let [a0, a1] = visualSpan(pionEls[0]), [b0, b1] = visualSpan(pionEls[1]);
check('P0 visual 0–5% sel', a0 === 0 && a1 === 5, JSON.stringify([a0, a1]));
check('P1 visual 5–10% sel', b0 === 5 && b1 === 10, JSON.stringify([b0, b1]));
check('tidak overlap', a1 <= b0);
check('tidak keluar sel (0–10)', a0 >= 0 && b1 <= 10);
pos = [1, 5]; positionPions();
check('tidak berbagi: kembali scale 1', pionEls[0].style.transform === 'scale(1)');

console.log('P2 — tombol Skip TOD:');
skipTodCount = [0, 0]; phase = 'roll'; turn = 0; updateSkipTodUI();
check('count 0: tombol tetap tampil', getEl('skip-tod-btn-0').style.display === 'inline-flex');
check('count 0: disabled', getEl('skip-tod-btn-0').disabled === true);
check('count 0: teks ×0', getEl('skip-tod-btn-0').textContent.includes('×0'));
check('count 0: tooltip menjelaskan cara dapat', getEl('skip-tod-btn-0').title.includes('3 tantangan'));
skipTodCount = [1, 0]; phase = 'tod'; turn = 0; updateSkipTodUI();
check('count 1 + giliran TOD: P0 bisa dipakai', getEl('skip-tod-btn-0').disabled === false);
check('count 1 + giliran TOD: P1 tetap disabled', getEl('skip-tod-btn-1').disabled === true);

console.log('P2b — fallback award streak ke-3:');
turn = 0; currentTodType = 'truth'; stats[0].curStreak = 2; skipTodCount = [0, 0];
resolveAfterTOD(true, false, false);
check('streak 3 Truth: token didapat', skipTodCount[0] === 1, 'count=' + skipTodCount[0]);
turn = 0; currentTodType = 'dare'; stats[0].curStreak = 2; skipTodCount = [0, 0];
resolveAfterTOD(true, false, false);
check('streak 3 Dare: tidak double (tetap 1)', skipTodCount[0] === 1, 'count=' + skipTodCount[0]);
turn = 0; currentTodType = 'truth'; stats[0].curStreak = 3; skipTodCount = [0, 0];
resolveAfterTOD(true, false, false);
check('streak 4 Truth: tidak dapat token', skipTodCount[0] === 0, 'count=' + skipTodCount[0]);

console.log('P3 — badge NAIK hanya saat level berubah:');
window._adaptedDir = 'up'; window.__patchPrevLevel = 'hot';
setLevelUI('hot');
check('sudah hot, tetap hot: tanpa NAIK', !getEl('level-label').innerHTML.includes('NAIK'));
window._adaptedDir = 'up'; window.__patchPrevLevel = 'mild';
setLevelUI('medium');
check('mild -> medium: NAIK muncul', getEl('level-label').innerHTML.includes('NAIK'));

console.log('P5 — reset & updateUI:');
window.__patchPrevLevel = 'hot'; window._adaptedDir = 'up';
skipTodCount = [2, 1]; resetGameState();
check('reset: level patch kembali mild', window.__patchPrevLevel === 'mild');
check('reset: skip count kembali 0', skipTodCount[0] === 0 && skipTodCount[1] === 0);
check('reset: tombol Skip tampil lagi', getEl('skip-tod-btn-0').style.display === 'inline-flex');
skipTodCount = [0, 0]; phase = 'roll'; turn = 0; updateUI();
check('updateUI: refresh tombol Skip', getEl('skip-tod-btn-0').disabled === true);

console.log(`\n${pass} lolos, ${fail} gagal`);
process.exit(fail ? 1 : 0);
