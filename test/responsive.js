const { chromium } = require('playwright');

const VIEWPORTS = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'standard-phone', width: 360, height: 800 },
  { name: 'modern-phone', width: 390, height: 844 },
  { name: 'large-phone', width: 430, height: 932 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('file://' + require('path').resolve('index.html'), { waitUntil: 'networkidle' });

  // Debug: dump initial visible state
  const initial = await page.evaluate(() => ({
    consent: document.getElementById('age-consent-screen')?.className,
    namescreen: document.getElementById('name-screen')?.className,
    body: document.body.className,
  }));
  console.log('initial:', JSON.stringify(initial));

  // Walk the entry flow: consent → name screen → start game
  await page.locator('#age-confirm').check({ force: true });
  await page.locator('#consent-agree').check({ force: true });
  await page.locator('#btn-age-confirm').click({ force: true });
  await page.locator('#name0').fill('A', { force: true });
  await page.locator('#name1').fill('B', { force: true });
  await page.locator('.btn-start').click({ force: true });
  await page.waitForTimeout(1500);
  const afterStart = await page.evaluate(() => ({
    board: document.getElementById('board')?.className,
    boardWrap: document.getElementById('board-wrap')?.className,
    overlay: document.getElementById('board-overlay')?.innerHTML?.length,
    phase: window.phase,
  }));
  console.log('afterStart:', JSON.stringify(afterStart));

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    const body = await page.locator('body');
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth || document.body.scrollWidth > document.body.clientWidth);

    const board = page.locator('.board-wrap');
    const boardBox = await board.boundingBox();
    const boardVisible = boardBox ? boardBox.width > 100 && boardBox.height > 100 : false;

    const smallButtons = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button, [role="button"]'));
      return all.filter(b => {
        const r = b.getBoundingClientRect();
        return (r.width < 44 || r.height < 44) && !b.disabled && r.width > 0 && r.height > 0;
      }).map(b => b.id || b.className || b.textContent?.slice(0,20) + '[' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height) + ']');
    });

    console.log(`${vp.name} (${vp.width}x${vp.height}): overflow=${overflowX} board=${boardVisible ? boardBox.width.toFixed(0) + 'x' + boardBox.height.toFixed(0) : 'missing'} smallButtons=${smallButtons.length}`);
    if (smallButtons.length) console.log('  small:', JSON.stringify(smallButtons));
  }

  if (errors.length) {
    console.log('CONSOLE ERRORS:');
    errors.forEach(e => console.log('  - ' + e));
  } else {
    console.log('No console errors.');
  }

  await browser.close();
})();
