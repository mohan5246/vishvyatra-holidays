// Travel quiz: reward round, practice replays, fresh questions, entry points.
// Run against a WordPress site with the plugin: BASE=http://localhost:8080 node tests/e2e-quiz.js
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// Answers a round: all right, or the 4th question wrong.
async function play(pg, allRight) {
  const ids = [];
  for (let i = 0; i < 5; i++) {
    await pg.locator('.vy-quiz__opt').first().waitFor();
    const q = await pg.evaluate(t => VY_CONFIG.quiz.pool.find(q => q.question === t), await pg.locator('.vy-quiz__question').innerText());
    ids.push(q.id);
    const pick = (allRight || i !== 3) ? q.options[q.answer] : q.options[(q.answer + 1) % q.options.length];
    await pg.locator('.vy-quiz__opt', { hasText: pick }).first().click();
    await pg.locator('[data-next]').click();
  }
  return ids;
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const fresh = async (vp) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 860 }, reducedMotion: 'reduce' });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push(e.message));
    return { ctx, pg };
  };

  // 1. Lose the reward round, then keep playing practice rounds.
  let { ctx, pg } = await fresh();
  await pg.goto(BASE + '/mice/');
  ok((await pg.locator('.vy-quiz-pill').innerText()).includes('Win 10% off'), 'new visitor: quiz button offers the reward');
  await pg.locator('.vy-quiz-pill').click();
  ok((await pg.locator('.vy-quiz__kicker').innerText()).toLowerCase().includes('reward round'), 'first round is a reward round');
  const r1 = await play(pg, false);
  ok((await pg.locator('.vy-quiz__kicker').innerText()).toLowerCase().includes('reward round · you got 4 out of 5'), 'reward round lost with 4/5');
  await pg.locator('[data-again]').click();
  ok((await pg.locator('.vy-quiz__kicker').innerText()).toLowerCase().includes('practice round'), 'Play again starts a practice round');
  const r2 = await play(pg, true);
  ok(r1.every(id => !r2.includes(id)), 'second round uses different questions');
  ok((await pg.locator('.vy-quiz__kicker').innerText()).toLowerCase().includes('practice round · you got 5 out of 5'), 'practice 5/5 does not give a reward');
  ok(!(await pg.evaluate(() => JSON.parse(localStorage.getItem('vy_quiz')).status === 'won')), 'no reward from practice');
  ok((await pg.locator('.vy-quiz__board').innerText()).includes('2 games'), 'scoreboard counts games');
  await pg.keyboard.press('Escape');
  ok(await pg.locator('.vy-quiz-pill').isVisible() && (await pg.locator('.vy-quiz-pill').innerText()).includes('Travel Quiz'), 'quiz button stays on the page after playing');
  await pg.goto(BASE + '/visa-services/');
  ok(await pg.locator('.vy-quiz-pill').isVisible(), 'quiz button on other pages too');
  await pg.locator('.vy-chat-launcher').click();
  await pg.locator('.vy-chat__option', { hasText: 'Travel Quiz' }).click();
  ok(await pg.locator('.vy-quiz__dialog').isVisible(), 'chatbot opens the quiz');
  await ctx.close();

  // 2. Win, then replay for fun; the code is kept.
  ({ ctx, pg } = await fresh({ width: 390, height: 800 }));
  await pg.goto(BASE + '/best-of-niagara-falls-with-buffalo/');
  await pg.evaluate(() => VY.openQuiz());
  await play(pg, true);
  await pg.locator('.vy-quiz__code code').waitFor();
  const code = await pg.locator('.vy-quiz__code code').innerText();
  ok(/^VYQ-/.test(code), 'reward round won: code ' + code);
  await pg.locator('[data-again]').click();
  ok((await pg.locator('.vy-quiz__kicker').innerText()).toLowerCase().includes('practice round'), 'after winning, Play again is practice');
  await play(pg, false);
  ok((await pg.locator('.vy-quiz__hint').innerText()).includes(code), 'practice result reminds the reward code');
  await pg.keyboard.press('Escape');
  ok((await pg.locator('.vy-quiz-pill').innerText()).includes('Your 10% reward'), 'button shows the reward');
  ok((await pg.locator('.vy-form__reward').innerText()).includes(code), 'reward still on the enquiry form');
  await ctx.close();

  // 3. Forged claim is rejected by the server.
  const r = await fetch(BASE + '/wp-json/vishvyatra/v1/quiz/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: [{ id: 'taj', choice: 0 }] }) });
  ok((await r.json()).won === false, 'server refuses a claim without 5 correct answers');

  ok(errs.length === 0, 'no JS errors ' + errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
