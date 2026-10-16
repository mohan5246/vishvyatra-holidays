const { chromium } = require('playwright');
const BASE = process.env.BASE; const OUT = __dirname + '/static';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const p = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
  const browser = await chromium.launch(p ? { proxy: { server: `${p.protocol}//${p.host}`, bypass: '192.0.2.2', username: decodeURIComponent(p.username)||undefined, password: decodeURIComponent(p.password)||undefined } } : {});
  for (const [name, vp] of [['desktop', { width: 1366, height: 860 }], ['mobile', { width: 390, height: 800 }]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: name === 'mobile', hasTouch: name === 'mobile', acceptDownloads: true });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    const sent = []; page.on('request', r => { if (r.method() === 'POST') sent.push(r.url()); });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 90000 });
    await page.locator('.vy-modal__dialog').waitFor({ state: 'visible', timeout: 10000 });
    ok(await page.locator('.vy-option').count() === 8, name + ': popup over the real homepage');
    await page.screenshot({ path: `${OUT}/${name}-home-popup.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}-home.png` });
    ok(await page.locator('a:has-text("Pay Now")').count() === 0, name + ': no Pay Now');
    ok(await page.locator('[id^="wpcs_tab_"]').evaluateAll(els => els.every(e => getComputedStyle(e).display === 'none')), name + ': old Enquiry Now tabs hidden on home');
    await page.locator('#vy-discovery-title').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/${name}-home-grid.png` });
    await page.goto(BASE + '/visa-services/');
    await page.locator('.vy-price').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/${name}-visa.png` });
    await page.fill('#vy-visa-full_name', 'Demo'); await page.fill('#vy-visa-mobile', '9840012345');
    await page.selectOption('#vy-visa-country', 'Thailand'); await page.fill('#vy-visa-stay_days', '5');
    await page.locator('button:has-text("Request Special Price")').last().click();
    await page.locator('.vy-confirm').waitFor();
    ok((await page.locator('.vy-confirm').innerText()).includes('NOT been sent'), name + ': demo-mode confirmation');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-vy-download-checklist]').click()]);
    ok(dl.suggestedFilename().endsWith('.xlsx'), name + ': checklist download ' + dl.suggestedFilename());
    await page.goto(BASE + '/hotel-booking/');
    await page.screenshot({ path: `${OUT}/${name}-hotel.png` });
    ok(await page.locator('.vy-enquiry[data-vy-form="hotel"]').count() === 1, name + ': new hotel page in site layout');
    await page.goto(BASE + '/contact-us/');
    page.once('dialog', d => d.dismiss());
    const cf = page.locator('form.wpcf7-form').last();
    if (await cf.count()) { await cf.evaluate(f => f.requestSubmit ? f.requestSubmit() : f.submit()).catch(() => {}); }
    await page.waitForTimeout(500);
    ok(!sent.some(u => u.includes('vishvyatraholidays.com')), name + ': nothing posted to live site');
    ok(errs.length === 0, name + ': no JS errors ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
})().catch(e => { console.error(e); process.exit(2); });
