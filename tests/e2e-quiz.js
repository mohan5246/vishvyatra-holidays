const { chromium } = require('playwright');
const BASE = 'http://localhost:8080';
async function play(pg, wantWin) {
  for (let i = 0; i < 5; i++) {
    await pg.locator('.vy-quiz__opt').first().waitFor();
    const qtext = await pg.locator('.vy-quiz__question').innerText();
    const q = await pg.evaluate(t => VY_CONFIG.quiz.pool.find(q => q.question === t), qtext);
    const right = q.options[q.answer];
    const wrong = q.options[(q.answer + 1) % 4];
    const pick = (wantWin || i < 3) ? right : wrong;
    await pg.locator('.vy-quiz__opt', { hasText: pick }).first().click();
    await pg.locator('[data-next]').click();
  }
}
(async () => {
  const b = await chromium.launch(); const errs = [];
  if (process.env.SKIPWIN) {} else {
  // WIN path on a package page
  let ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); let pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(BASE + '/best-of-niagara-falls-with-buffalo/');
  await pg.locator('.vy-quiz-invite').waitFor({ timeout: 8000 });
  console.log('invite:', (await pg.locator('.vy-quiz-invite__title').innerText()).trim());
  await pg.locator('.vy-quiz-invite [data-play]').click();
  console.log('dialog focus inside:', await pg.evaluate(() => !!document.activeElement.closest('.vy-quiz__dialog')));
  await play(pg, true);
  await pg.locator('.vy-quiz__code code').waitFor({ timeout: 8000 });
  const code = await pg.locator('.vy-quiz__code code').innerText();
  console.log('won code:', code, '| confetti:', await pg.locator('canvas.vy-confetti').count());
  await pg.locator('[data-use]').click(); await pg.waitForTimeout(800);
  console.log('form reward banner:', (await pg.locator('.vy-form__reward').innerText()).trim());
  const s = '#vy-international_tours-';
  await pg.fill(s + 'full_name', 'Quiz Winner'); await pg.fill(s + 'mobile', '9840011111');
  await pg.check('input[name="hotel_category"][value="3-star"]'); await pg.fill(s + 'budget_min', '200000'); await pg.fill(s + 'budget_max', '300000');
  await pg.locator('button:has-text("Request a Quote")').click(); await pg.locator('.vy-confirm').waitFor();
  console.log('pill after win:', (await pg.locator('.vy-quiz-pill').innerText()).trim());
  await pg.goto(BASE + '/mice/'); await pg.waitForTimeout(5000);
  console.log('no invite again after win:', await pg.locator('.vy-quiz-invite').count() === 0);
  await ctx.close();
  }
  // LOSE path
  ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, reducedMotion: 'reduce' }); pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(BASE + '/mice/');
  await pg.locator('.vy-quiz-invite').waitFor({ timeout: 8000 });
  await pg.locator('.vy-quiz-invite [data-later]').click(); await pg.waitForTimeout(500);
  console.log('pill after later:', (await pg.locator('.vy-quiz-pill').innerText()).trim());
  await pg.locator('.vy-quiz-pill').click();
  await play(pg, false);
  console.log('lost:', (await pg.locator('.vy-quiz__kicker').innerText()).trim());
  await pg.keyboard.press('Escape');
  console.log('pill hidden after loss:', await pg.locator('.vy-quiz-pill').isHidden());
  await ctx.close();
  // Forged claim is rejected
  const r = await fetch(BASE + '/wp-json/vishvyatra/v1/quiz/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: [{ id: 'taj', choice: 0 }] }) });
  console.log('forged claim:', await r.text());
  console.log('errors:', errs); await b.close();
})();
