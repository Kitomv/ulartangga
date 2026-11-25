const { chromium } = require('playwright');
const path = require('path');

let failures = 0;
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { failures++; console.log('  ✗ ' + m); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('file://' + path.resolve('index.html'), { waitUntil: 'networkidle' });
  await page.locator('#age-confirm').check({ force: true });
  await page.locator('#consent-agree').check({ force: true });
  await page.locator('#btn-age-confirm').click({ force: true });

  const modes = ['romantis', 'playful', 'liar'];
  for (const mode of modes) {
    console.log(`\nmode=${mode}`);
    if (await page.locator('#name-screen').isVisible()) {
      await page.locator(`#mood-${mode}`).click({ force: true });
      await page.locator('#name0').fill('A', { force: true });
      await page.locator('#name1').fill('B', { force: true });
      await page.locator('.btn-start').click({ force: true });
      await page.waitForTimeout(900);
    }

    const before = await page.evaluate(() => ({
      p0: document.getElementById('ppos-0')?.textContent || '',
      p1: document.getElementById('ppos-1')?.textContent || '',
    }));

    // roll once
    await page.locator('#btn-roll').click({ force: true });
    await page.waitForTimeout(3200);

    const after = await page.evaluate(() => ({
      p0: document.getElementById('ppos-0')?.textContent || '',
      p1: document.getElementById('ppos-1')?.textContent || '',
      pion0Transform: document.querySelectorAll('.pion')[0]?.style.transform || document.querySelectorAll('.pion')[0]?.style.left,
    }));

    if (after.p0 !== before.p0 || after.p1 !== before.p1) ok(`bidak bergerak: P0 ${before.p0}->${after.p0}, P1 ${before.p1}->${after.p1}`);
    else bad(`bidak tidak bergerak (P0=${after.p0}, P1=${after.p1})`);

    const pionCount = await page.evaluate(() => document.querySelectorAll('.pion').length);
    if (pionCount === 2) ok('2 bidak terpasang'); else bad(`${pionCount} bidak`);

    // end this mode: back to mood screen
    await page.evaluate(() => window.goToMoodScreen());
    await page.waitForTimeout(500);
    const backToName = await page.locator('#name-screen').isVisible();
    if (backToName) ok('Ganti Mode kembali ke layar nama'); else bad('gagal kembali ke layar nama');
  }

  const cellCount = await page.evaluate(() => document.querySelectorAll('#board .cell').length);
  if (cellCount === 100) ok('papan 10×10 utuh setelah 3 mode'); else bad(`papan ${cellCount} sel`);

  if (errors.length) { bad('pageerror: ' + errors.join(' | ')); } else ok('tanpa page error');

  await browser.close();
  if (failures) { console.log(`\n✗ GAGAL ${failures}`); process.exit(1); }
  console.log('\n✓ Gameplay PASS');
})();
