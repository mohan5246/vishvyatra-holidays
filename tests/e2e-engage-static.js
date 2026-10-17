const { chromium } = require('playwright');
const BASE = process.env.BASE;
(async () => {
  const p = new URL(process.env.HTTPS_PROXY);
  const b = await chromium.launch({ proxy: { server: `${p.protocol}//${p.host}`, bypass: '192.0.2.2', username: decodeURIComponent(p.username)||undefined, password: decodeURIComponent(p.password)||undefined } });
  const errs = [];
  for (const vp of [{ width: 1366, height: 860 }, { width: 390, height: 800 }]) {
    const W = vp.width;
    const ctx = await b.newContext({ viewport: vp, isMobile: W < 500, hasTouch: W < 500, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { try { localStorage.setItem('vy_quiz', JSON.stringify({ status: 'lost' })); } catch (e) {} }); // keep quiz invite out of the way
    const pg = await ctx.newPage(); pg.on('pageerror', e => { if (!/reading 'style'/.test(e.message)) errs.push(W + ' ' + e.message); });
    // Stories
    await pg.goto(BASE + '/', { timeout: 90000 });
    await pg.locator('.vy-modal__dialog').waitFor(); 
    console.log(W, 'popup has finder link:', await pg.locator('.vy-finder-strip').count());
    await pg.keyboard.press('Escape');
    await pg.locator('.vy-story').first().scrollIntoViewIfNeeded(); await pg.waitForTimeout(800);
    console.log(W, 'stories:', await pg.locator('.vy-story').count());
    await pg.screenshot({ path: `static/eng-stories-${W}.png` });
    await pg.locator('.vy-story').nth(2).click(); await pg.waitForTimeout(1200);
    console.log(W, 'story open:', await pg.locator('.vy-sv__caption').innerText());
    await pg.screenshot({ path: `static/eng-story-${W}.png` });
    await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(500);
    console.log(W, 'story CTA:', (await pg.locator('.vy-sv__cta-title').innerText()));
    await pg.screenshot({ path: `static/eng-story-cta-${W}.png` });
    await pg.keyboard.press('Escape');
    // Finder from grid CTA
    await pg.locator('.vy-finder-cta [data-vy-open-finder]').scrollIntoViewIfNeeded();
    await pg.locator('.vy-finder-cta [data-vy-open-finder]').click(); await pg.waitForTimeout(400);
    await pg.screenshot({ path: `static/eng-finder-1-${W}.png` });
    for (const ans of ['domestic', 'beach', 'week', 'couple']) { await pg.locator(`.vy-finder__opt[data-answer="${ans}"]`).click(); await pg.waitForTimeout(350); }
    await pg.locator('.vy-pcard').first().waitFor();
    console.log(W, 'finder:', (await pg.locator('.vy-finder .vy-emodal__title').innerText()), '| cards:', await pg.locator('.vy-finder .vy-pcard').count(), '|', (await pg.locator('.vy-finder .vy-pcard__title').allInnerTexts()).slice(0, 3).join(' / '));
    await pg.screenshot({ path: `static/eng-finder-results-${W}.png` });
    await pg.locator('.vy-finder .vy-heart').first().click(); await pg.waitForTimeout(300);
    await pg.locator('.vy-finder .vy-pcard a:has-text("Get quote")').first().click();
    await pg.waitForLoadState('load'); await pg.waitForTimeout(1500);
    console.log(W, 'finder -> package form adults:', await pg.locator('input[name="adults"]').inputValue(), '| url:', pg.url().split('/').slice(-2).join('/'));
    // Wishlist on a listing page
    await pg.goto(BASE + '/usa-tour-packages/', { timeout: 90000 }); await pg.waitForTimeout(1500);
    console.log(W, 'hearts on listing cards:', await pg.locator('article.et_pb_post [data-vy-heart]').count());
    for (const n of [0, 1]) { const h = pg.locator('article.et_pb_post [data-vy-heart]').nth(n); await h.evaluate(e => e.scrollIntoView({ block: 'center' })); await h.click(); }
    await pg.locator('article.et_pb_post [data-vy-heart]').nth(0).scrollIntoViewIfNeeded();
    await pg.screenshot({ path: `static/eng-hearts-${W}.png` });
    console.log(W, 'My Trips:', (await pg.locator('.vy-trips-btn').innerText()).replace(/\s+/g, ' '));
    await pg.locator('.vy-trips-btn').click(); await pg.locator('.vy-trips__item').first().waitFor();
    await pg.screenshot({ path: `static/eng-trips-${W}.png` });
    await pg.locator('[data-compare]').click(); await pg.locator('.vy-compare table').waitFor();
    console.log(W, 'compare columns:', await pg.locator('.vy-compare thead th').count());
    await pg.screenshot({ path: `static/eng-compare-${W}.png` });
    await pg.locator('[data-back]').click(); await pg.locator('[data-send]').waitFor();
    await pg.locator('[data-send]').click(); await pg.waitForLoadState('load'); await pg.waitForTimeout(1500);
    console.log(W, 'wishlist enquiry:', (await pg.locator('.vy-form__context').innerText()).slice(0, 90), '| desc lines:', (await pg.locator('textarea[name="description"]').inputValue()).split('\n').length);
    // Itinerary
    await pg.goto(BASE + '/best-of-niagara-falls-with-buffalo/', { timeout: 90000 }); await pg.waitForTimeout(1200);
    console.log(W, 'itinerary days:', await pg.locator('.vy-itin__day').count(), '| original accordion hidden:', await pg.locator('.vy-itin-source').isHidden(), '| heart on title:', await pg.locator('.vy-heart--label').count());
    await pg.locator('.vy-itin').scrollIntoViewIfNeeded(); await pg.waitForTimeout(400);
    await pg.screenshot({ path: `static/eng-itin-${W}.png` });
    await pg.locator('.vy-itin').evaluate(e => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 300)); await pg.waitForTimeout(400);
    const t1 = await pg.locator('.vy-itin__plane').evaluate(e => e.style.top);
    await pg.evaluate(() => window.scrollBy(0, 450)); await pg.waitForTimeout(400);
    const t2 = await pg.locator('.vy-itin__plane').evaluate(e => e.style.top);
    console.log(W, 'plane moves:', t1, '->', t2);
    await pg.locator('.vy-itin__day').nth(2).evaluate(e => e.scrollIntoView({ block: 'center' }));
    await pg.locator('.vy-itin__day').nth(2).locator('.vy-itin__toggle').click();
    await pg.locator('.vy-itin__day').nth(2).locator('.vy-itin__custom').evaluate(e => e.scrollIntoView({ block: 'center' }));
    await pg.locator('.vy-itin__day').nth(2).locator('.vy-itin__custom').click();
    await pg.screenshot({ path: `static/eng-itin-open-${W}.png` });
    console.log(W, 'notes:', JSON.stringify(await pg.locator('#vy-enquiry textarea[name="additional"]').inputValue()));
    await ctx.close();
  }
  console.log('errors:', errs); await b.close();
})();
