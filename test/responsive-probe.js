const { chromium } = require('playwright');
const path = require('path');

const VIEWPORTS = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'standard-phone', width: 360, height: 800 },
  { name: 'modern-phone', width: 390, height: 844 },
  { name: 'large-phone', width: 430, height: 932 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
];

let failures = 0;

function fail(tag, msg) {
  failures += 1;
  console.log(`  ✗ ${tag}: ${msg}`);
}

function pass(tag, msg) {
  console.log(`  ✓ ${tag}: ${msg}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  const fileUrl = 'file://' + path.resolve('index.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Entry flow: consent → names → start
  await page.locator('#age-confirm').check({ force: true });
  await page.locator('#consent-agree').check({ force: true });
  await page.locator('#btn-age-confirm').click({ force: true });
  await page.locator('#name0').fill('A', { force: true });
  await page.locator('#name1').fill('B', { force: true });
  await page.locator('.btn-start').click({ force: true });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    const cells = document.querySelectorAll('#board .cell');
    if (cells.length !== 100) throw new Error('board not ready: ' + cells.length + ' cells');
  });

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    console.log(`${vp.name} (${vp.width}x${vp.height}):`);

    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const body = document.body;
      const overflowX = de.scrollWidth > de.clientWidth + 1 || body.scrollWidth > body.clientWidth + 1;
      const board = document.querySelector('.board-wrap');
      const boardBox = board ? board.getBoundingClientRect() : null;
      const cells = document.querySelectorAll('#board .cell');
      const cards = document.querySelector('.player-cards');
      const cardsBox = cards ? cards.getBoundingClientRect() : null;
      const panel = document.getElementById('game-layout')?.querySelector('.side-panel');
      const panelBox = panel ? panel.getBoundingClientRect() : null;
      const visibleButtons = Array.from(document.querySelectorAll('button, [role="button"]'))
        .filter(b => {
          const rect = b.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && !b.disabled;
        });
      const smallButtons = visibleButtons
        .filter(b => { const rect = b.getBoundingClientRect(); return rect.width < 44 || rect.height < 44; })
        .map(b => b.id || b.className || b.textContent?.slice(0, 20));
      const visibleButtonsCount = visibleButtons.length;
      const cellNum = document.querySelector('.cell-num');
      const pion = document.querySelector('.pion');
      const c1 = document.getElementById('cell-1');
      const c10 = document.getElementById('cell-10');
      const c100 = document.getElementById('cell-100');
      return {
        overflowX,
        board: boardBox ? { w: Math.round(boardBox.width), h: Math.round(boardBox.height), x: Math.round(boardBox.x), y: Math.round(boardBox.y), top: Math.round(boardBox.top), bottom: Math.round(boardBox.bottom) } : null,
        cellCount: cells.length,
        cards: cardsBox ? { bottom: Math.round(cardsBox.bottom) } : null,
        panel: panelBox ? { x: Math.round(panelBox.x), y: Math.round(panelBox.y), w: Math.round(panelBox.width), h: Math.round(panelBox.height) } : null,
        smallButtons,
        cellNumZ: cellNum ? parseInt(window.getComputedStyle(cellNum).zIndex, 10) || 0 : null,
        pionZ: pion ? parseInt(window.getComputedStyle(pion).zIndex, 10) || 0 : null,
        visibleButtonsCount,
        c1: c1 ? c1.getBoundingClientRect() : null,
        c10: c10 ? c10.getBoundingClientRect() : null,
        c100: c100 ? c100.getBoundingClientRect() : null,
      };
    });

    // 1. no horizontal overflow
    if (r.overflowX) fail('overflow', 'horizontal overflow detected'); else pass('overflow', 'tidak ada overflow');

    // 2. 100 cells
    if (r.cellCount !== 100) fail('cells', `cell count ${r.cellCount} != 100`); else pass('cells', '100 sel');

    // 3. board square
    if (!r.board) { fail('board', 'board missing'); }
    else {
      const sq = Math.abs(r.board.w - r.board.h) <= 1;
      if (!sq) fail('board-square', `board ${r.board.w}x${r.board.h} not square`);
      else pass('board-square', `board ${r.board.w}x${r.board.h}`);
    }

    // 4. player cards above board
    if (!r.cards || !r.board) { fail('cards-above-board', 'missing cards or board'); }
    else if (r.cards.bottom > r.board.top + 1) fail('cards-above-board', `cards bottom ${r.cards.bottom} > board top ${r.board.top}`);
    else pass('cards-above-board', `kartu di atas papan (cards.bottom=${r.cards.bottom} <= board.top=${r.board.top})`);

    if (vp.width >= 1001) {
      // 5a. board 540-580
      if (!r.board) { fail('board-size', 'board missing'); }
      else {
        const ok = r.board.w >= 540 && r.board.w <= 580;
        if (!ok) fail('board-size', `board width ${r.board.w} outside 540-580`);
        else pass('board-size', `board ${r.board.w}px (540-580)`);
      }
      // 5b. panel 320-360
      if (!r.panel) { fail('panel-size', 'panel missing'); }
      else {
        const ok = r.panel.w >= 320 && r.panel.w <= 360;
        if (!ok) fail('panel-size', `panel width ${r.panel.w} outside 320-360`);
        else pass('panel-size', `panel ${r.panel.w}px (320-360)`);
      }
      // 5c. panel right of board, aligned top
      if (!r.board || !r.panel) { fail('panel-position', 'missing board or panel'); }
      else {
        const right = r.panel.x >= r.board.x + r.board.w - 1;
        const aligned = Math.abs(r.panel.y - r.board.y) <= 40;
        if (!right || !aligned) fail('panel-position', `panel.x=${r.panel.x} board.right=${r.board.x + r.board.w} |dy|=${Math.abs(r.panel.y - r.board.y)}`);
        else pass('panel-position', `panel kanan papan, sejajar atas`);
      }
      // 5d. panel order: dice.y < roll.y < legend.y < log.y < reset.y
      const orderOk = await page.evaluate(() => {
        const els = ['dice-wrap', 'btn-roll'].map(id => document.getElementById(id));
        const legend = document.querySelector('.legend');
        const log = document.getElementById('game-log');
        const reset = document.querySelector('.btn-reset');
        const all = [...els, legend, log, reset].filter(Boolean);
        const rects = all.map(e => e.getBoundingClientRect());
        for (let i = 1; i < rects.length; i++) {
          if (rects[i].y < rects[i - 1].y - 1) return false;
        }
        return true;
      });
      if (!orderOk) fail('panel-order', 'urutan elemen panel tidak monoton turun'); else pass('panel-order', 'urutan panel: dadu → LEMPAR → legend → timer → log → Ganti Mode');
    } else {
      // 6a. panel under board
      if (!r.board || !r.panel) { fail('panel-under-board', 'missing board or panel'); }
      else if (r.panel.y < r.board.bottom - 1) fail('panel-under-board', `panel.y=${r.panel.y} < board.bottom=${r.board.bottom}`);
      else pass('panel-under-board', `panel di bawah papan (panel.y=${r.panel.y} >= board.bottom=${r.board.bottom})`);
      // 6b. board ≈ min(580, vw-24) (scrollbar dapat menyusutkan 100vw beberapa px)
      if (!r.board) { fail('board-mobile-size', 'board missing'); }
      else {
        const expectW = Math.min(580, vp.width - 24);
        const ok = Math.abs(r.board.w - expectW) <= 16;
        if (!ok) fail('board-mobile-size', `board ${r.board.w} != ${expectW}±16`);
        else pass('board-mobile-size', `board ${r.board.w}px ≈ ${expectW}px`);
      }
      // 6c. panel width <= 580
      if (!r.panel) { fail('panel-mobile-width', 'panel missing'); }
      else if (r.panel.w > 580) fail('panel-mobile-width', `panel ${r.panel.w} > 580`);
      else pass('panel-mobile-width', `panel ${r.panel.w}px <= 580`);
    }

    // 7. touch targets
    if (r.smallButtons.length) fail('touch-targets', `${r.smallButtons.length} tombol <44×44: ${JSON.stringify(r.smallButtons)}`);
    else pass('touch-targets', `semua ${r.visibleButtonsCount} tombol terlihat ≥44×44`);

    // 8. z-index
    if (r.cellNumZ == null || r.pionZ == null) { fail('z-index', 'tidak bisa baca z-index'); }
    else if (r.cellNumZ < 4 || r.pionZ < 10 || r.pionZ <= r.cellNumZ) fail('z-index', `cell-num z=${r.cellNumZ} pion z=${r.pionZ}`);
    else pass('z-index', `cell-num z=${r.cellNumZ}, pion z=${r.pionZ}`);

    // 9. boustrophedon numbering frozen
    if (!r.c1 || !r.c10 || !r.c100) { fail('numbering', 'cell-1/cell-10/cell-100 missing'); }
    else {
      const ok1 = r.c1.left < r.c10.left - 1 && Math.abs(r.c1.top - r.c10.top) <= 1;
      const ok100 = r.c100.top < r.c1.top - 1 && Math.abs(r.c100.left - r.c1.left) <= 1;
      if (!ok1 || !ok100) fail('numbering', `cell-1(${Math.round(r.c1.left)},${Math.round(r.c1.top)}) cell-10(${Math.round(r.c10.left)},${Math.round(r.c10.top)}) cell-100(${Math.round(r.c100.left)},${Math.round(r.c100.top)})`);
      else pass('numbering', 'cell-1 kiri-bawah, cell-10 kanan-bawah (baris sama), cell-100 kiri-atas (zigzag utuh)');
    }
  }

  if (errors.length) {
    console.log('CONSOLE ERRORS:');
    errors.forEach(e => console.log('  - ' + e));
  } else {
    console.log('Tidak ada error console.');
  }

  await browser.close();

  if (failures > 0) {
    console.log(`\n✗ GAGAL: ${failures} pelanggaran`);
    process.exit(1);
  } else {
    console.log(`\n✓ Semua ${VIEWPORTS.length} viewport PASS`);
    process.exit(0);
  }
})();
