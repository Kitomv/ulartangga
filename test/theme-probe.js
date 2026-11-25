const { chromium } = require('playwright');
const path = require('path');

let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.log('  ✗ ' + m); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'networkidle' });
  await page.locator('#age-confirm').check({ force: true });
  await page.locator('#consent-agree').check({ force: true });
  await page.locator('#btn-age-confirm').click({ force: true });
  await page.locator('#name0').fill('A', { force: true });
  await page.locator('#name1').fill('B', { force: true });
  await page.locator('.btn-start').click({ force: true });
  await page.waitForTimeout(1000);

  for (const theme of ['dark', 'light']) {
    if (theme === 'light') { await page.locator('#btn-theme').click({ force: true }); await page.waitForTimeout(500); }
    console.log(`theme=${theme}`);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const board = document.querySelector('.board-wrap').getBoundingClientRect();
      const panel = document.querySelector('.side-panel').getBoundingClientRect();
      const legend = document.querySelector('.legend');
      const legendColor = legend ? getComputedStyle(legend).color : null;
      return {
        overflow: de.scrollWidth > de.clientWidth + 1,
        board: Math.round(board.width) + 'x' + Math.round(board.height),
        panelW: Math.round(panel.width),
        bodyClass: document.body.className,
        legendColor,
        legendVisible: legend ? legend.getBoundingClientRect().height > 20 : false,
      };
    });
    if (r.overflow) bad('overflow horizontal'); else ok('tanpa overflow');
    if (r.board.split('x')[0] === r.board.split('x')[1]) ok('papan persegi ' + r.board); else bad('papan tidak persegi ' + r.board);
    if (r.panelW >= 320 && r.panelW <= 360) ok('panel ' + r.panelW + 'px'); else bad('panel ' + r.panelW + 'px');
    if (r.legendVisible) ok('legend terlihat'); else bad('legend tidak terlihat');
    console.log('    body.class=' + JSON.stringify(r.bodyClass) + ' legendColor=' + r.legendColor);
  }

  await browser.close();
  if (failures) { console.log(`\n✗ GAGAL ${failures}`); process.exit(1); }
  console.log('\n✓ Tema PASS');
})();
