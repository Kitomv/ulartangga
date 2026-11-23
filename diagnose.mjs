import { chromium } from 'playwright';

const filePath = 'file:///' + 'C:/Users/EOS-Yogyakarta/Downloads/ulartangga/ular-tangga-split.html'.replace(/\\/g, '/');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleLogs = [];
const pageErrors = [];

page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => pageErrors.push('PAGE ERROR: ' + err.message));
page.on('requestfailed', req => pageErrors.push('REQUEST FAILED: ' + req.url() + ' ' + req.failure().errorText));

const steps = [];

async function step(title, fn) {
  const startLogs = consoleLogs.length;
  const startErrors = pageErrors.length;
  let ok = true;
  let error = null;
  try {
    await fn();
  } catch (e) {
    ok = false;
    error = e.message;
  }
  const newLogs = consoleLogs.slice(startLogs).join('\n');
  const newErrors = pageErrors.slice(startErrors).join('\n');
  steps.push({ title, ok, error, logs: newLogs, errors: newErrors });
}

// Step 1: goto + wait for load
await step('1. Page load (file://, window load)', async () => {
  await page.goto(filePath, { waitUntil: 'load' });
  await page.evaluate(() => new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', () => resolve());
  }));
});

// Step 2: checkboxes exist & visible
await step('2. Checkboxes exist & visible', async () => {
  const res = await page.evaluate(() => {
    const age = document.getElementById('age-confirm');
    const consent = document.getElementById('consent-agree');
    const visible = el => {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0'
        && rect.width > 0 && rect.height > 0;
    };
    return {
      ageExists: !!age, ageVisible: age ? visible(age) : false,
      consentExists: !!consent, consentVisible: consent ? visible(consent) : false,
    };
  });
  console.log('  CHECKBOX RESULT:', JSON.stringify(res));
});

// Step 3: age-consent-screen visible on load
await step('3. age-consent-screen visible on load', async () => {
  const res = await page.evaluate(() => {
    const el = document.getElementById('age-consent-screen');
    if (!el) return { exists: false };
    const s = window.getComputedStyle(el);
    return { exists: true, display: s.display, visibility: s.visibility, opacity: s.opacity };
  });
  console.log('  CONSENT SCREEN:', JSON.stringify(res));
});

// Step 4: name-screen state on load
await step('4. name-screen state on load', async () => {
  const res = await page.evaluate(() => {
    const el = document.getElementById('name-screen');
    if (!el) return { exists: false };
    const s = window.getComputedStyle(el);
    return { exists: true, display: s.display, visibility: s.visibility, opacity: s.opacity };
  });
  console.log('  NAME SCREEN:', JSON.stringify(res));
});

// Step 5: click both checkboxes (test normal clickability first)
await step('5. Click both checkboxes (normal click)', async () => {
  let ageOk = false, ageErr = null;
  let consentOk = false, consentErr = null;
  try {
    await page.check('#age-confirm');  // normal, no force
    ageOk = true;
  } catch (e) { ageErr = e.message; }
  try {
    await page.check('#consent-agree');  // normal, no force
    consentOk = true;
  } catch (e) { consentErr = e.message; }
  console.log('  age-confirm normal click OK=' + ageOk + (ageErr ? ' ERR:'+ageErr : ''));
  console.log('  consent-agree normal click OK=' + consentOk + (consentErr ? ' ERR:'+consentErr : ''));
  // If normal failed, use force to continue the journey
  if (!ageOk) { try { await page.check('#age-confirm', { force: true }); console.log('  age-confirm FORCE check OK'); } catch(e){ console.log('  age-confirm FORCE failed:'+e.message);} }
  if (!consentOk) { try { await page.check('#consent-agree', { force: true }); console.log('  consent-agree FORCE check OK'); } catch(e){ console.log('  consent-agree FORCE failed:'+e.message);} }
  const checked = await page.evaluate(() => [
    document.getElementById('age-confirm').checked,
    document.getElementById('consent-agree').checked,
  ]);
  console.log('  CHECKED STATE:', JSON.stringify(checked));
});

// Step 6: click the button (test normal clickability)
await step('6. Click #btn-age-confirm (normal click)', async () => {
  let btnOk = false, btnErr = null;
  try {
    await page.click('#btn-age-confirm');  // normal, no force
    btnOk = true;
  } catch (e) { btnErr = e.message; }
  console.log('  btn-age-confirm normal click OK=' + btnOk + (btnErr ? ' ERR:'+btnErr : ''));
  if (!btnOk) {
    try { await page.click('#btn-age-confirm', { force: true }); console.log('  btn FORCE click OK'); } catch(e){ console.log('  btn FORCE failed:'+e.message); }
  }
});

// Step 7: screens after click
await step('7. Screens after button click', async () => {
  await page.waitForTimeout(300);
  const res = await page.evaluate(() => {
    const g = id => { const el = document.getElementById(id); if (!el) return null; const s = window.getComputedStyle(el); return { display: s.display, visibility: s.visibility, opacity: s.opacity }; };
    return { ageConsent: g('age-consent-screen'), nameScreen: g('name-screen') };
  });
  console.log('  SCREENS:', JSON.stringify(res));
});

// Step 8: fill names
await step('8. Fill name0 and name1', async () => {
  await page.fill('#name0', 'Aldi');
  await page.fill('#name1', 'Bella');
  const vals = await page.evaluate(() => [document.getElementById('name0').value, document.getElementById('name1').value]);
  console.log('  NAME VALUES:', JSON.stringify(vals));
});

// Step 9: click start game
await step('9. Click .btn-start (startGame)', async () => {
  try {
    await page.click('.btn-start', { force: true });
  } catch (e) {
    console.log('  start click failed:', e.message);
    await page.click('.btn-start', { force: true });
  }
  await page.waitForTimeout(500);
});

// Step 10: game-layout visible?
await step('10. game-layout visible?', async () => {
  const res = await page.evaluate(() => {
    const el = document.getElementById('game-layout');
    if (!el) return { exists: false };
    const s = window.getComputedStyle(el);
    return { exists: true, display: s.display, visibility: s.visibility, opacity: s.opacity, isFlex: s.display === 'flex' };
  });
  console.log('  GAME LAYOUT:', JSON.stringify(res));
});

// Step 11: print all console logs + errors
console.log('\n========================================');
console.log('FINAL DIAGNOSTIC REPORT');
console.log('========================================');
for (const s of steps) {
  console.log(`\n[${s.title}] OK=${s.ok}`);
  if (s.error) console.log('  ERROR:', s.error);
  if (s.logs) console.log('  CONSOLE:', s.logs);
  if (s.errors) console.log('  ERRORS:', s.errors);
}
console.log('\n--- ALL CONSOLE LOGS (full session) ---');
console.log(consoleLogs.join('\n') || '(none)');
console.log('\n--- ALL PAGE ERRORS (full session) ---');
console.log(pageErrors.join('\n') || '(none)');

await page.screenshot({ path: 'diagnose-final.png', fullPage: true });
console.log('\nScreenshot saved: diagnose-final.png');

await browser.close();
