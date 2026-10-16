const { chromium } = require('playwright');
const BASE = process.env.BASE;
(async () => {
  const p = new URL(process.env.HTTPS_PROXY);
  const b = await chromium.launch({ proxy: { server: `${p.protocol}//${p.host}`, bypass: '192.0.2.2', username: decodeURIComponent(p.username)||undefined, password: decodeURIComponent(p.password)||undefined } });
  const errs = [];
  for (const vp of [{ width: 1366, height: 860 }, { width: 390, height: 800 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
    const pg = await ctx.newPage(); pg.on('pageerror', e => { if (!/reading 'style'/.test(e.message)) errs.push(e.message); });
    // Popup on every homepage visit
    let seen = [];
    for (let i = 0; i < 3; i++) { await pg.goto(BASE + '/', { timeout: 90000 }); await pg.waitForTimeout(1800); seen.push(await pg.locator('.vy-modal__dialog').isVisible()); await pg.keyboard.press('Escape'); }
    console.log(vp.width, 'popup on 3 homepage loads:', seen.join(','));
    await pg.goto(BASE + '/best-of-niagara-falls-with-buffalo/', { timeout: 90000 });
    await pg.waitForTimeout(2200);
    console.log(vp.width, 'bar visible:', await pg.locator('.vy-qbar').isVisible(), '|', (await pg.locator('.vy-qbar__inner').innerText()).replace(/\s+/g, ' ').trim());
    const hb = await pg.evaluate(() => { const h = document.getElementById('main-header').getBoundingClientRect(); const q = document.querySelector('.vy-qbar__inner').getBoundingClientRect(); return { headerBottom: Math.round(h.bottom), barTop: Math.round(q.top), barRight: Math.round(q.right), vw: innerWidth }; });
    console.log(vp.width, 'position:', JSON.stringify(hb));
    await pg.screenshot({ path: `static/qbar-${vp.width}.png` });
    await pg.mouse.wheel(0, 900); await pg.waitForTimeout(700);
    await pg.screenshot({ path: `static/qbar-scrolled-${vp.width}.png` });
    if (vp.width > 500) await pg.fill('#vy-qbar-mobile', '98400 55555');
    await pg.locator('.vy-qbar__go').click();
    await pg.waitForTimeout(1500);
    console.log(vp.width, 'after click: mobile =', JSON.stringify(await pg.inputValue('#vy-international_tours-mobile')), '| focused:', await pg.evaluate(() => document.activeElement.id), '| bar hidden while form in view:', await pg.locator('.vy-qbar').isHidden());
    await pg.screenshot({ path: `static/qbar-form-${vp.width}.png` });
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(800);
    console.log(vp.width, 'bar back at top:', await pg.locator('.vy-qbar').isVisible());
    await pg.locator('.vy-qbar__close').click(); await pg.waitForTimeout(500);
    await pg.goto(BASE + '/mice/', { timeout: 90000 }); await pg.waitForTimeout(2000);
    console.log(vp.width, 'closed stays closed this visit:', await pg.locator('.vy-qbar').count() === 0);
    await ctx.close();
    const c2 = await b.newContext({ viewport: vp, isMobile: vp.width < 500 }); const p2 = await c2.newPage();
    for (const u of ['/mice/', '/visa-services/', '/enchanting-kerala-delight/', '/europe-tour-packages/']) {
      await p2.goto(BASE + u, { timeout: 90000 }); await p2.waitForTimeout(2000);
      console.log(vp.width, u, '|', (await p2.locator('.vy-qbar__inner').innerText()).replace(/\s+/g, ' ').trim());
      if (u === '/visa-services/') await p2.screenshot({ path: `static/qbar-visa-${vp.width}.png` });
    }
    await c2.close();
  }
  console.log('errors:', errs); await b.close();
})();
