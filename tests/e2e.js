const { chromium } = require('playwright');
const OUT = process.env.OUT || require('os').tmpdir();
const BASE = process.env.BASE || 'http://localhost:8080';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const future = (d) => { const t = new Date(Date.now() + d * 864e5); return t.toISOString().slice(0, 10); };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Missing files are errors, except uploaded photos (a local test site has none of the client's uploads).
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\/wp-content\/uploads\//.test(r.url()) && !/favicon/.test(r.url())) errors.push(r.status() + ' ' + r.url()); });

  // 1. Homepage popup
  await page.goto(BASE + '/');
  const dlg = page.locator('.vy-modal__dialog');
  await dlg.waitFor({ state: 'visible', timeout: 4000 });
  ok(await page.locator('.vy-option').count() === 8, 'popup shows 8 services');
  ok(await dlg.getAttribute('role') === 'dialog' && await dlg.getAttribute('aria-modal') === 'true', 'popup has dialog semantics');
  ok(await page.evaluate(() => document.activeElement.classList.contains('vy-option')), 'focus moved into popup');
  await page.screenshot({ path: OUT + '/home-popup-desktop.png' });
  await page.keyboard.press('ArrowRight');
  ok(await page.evaluate(() => document.activeElement.textContent.trim()) === 'Domestic Tours', 'arrow keys move between options');
  await page.keyboard.press('Escape');
  ok(await page.locator('.vy-modal').isHidden(), 'Escape closes popup');
  ok(await page.locator('#wpcs_tab_368').isHidden() && await page.locator('.ecp-modal').isHidden(), 'homepage general enquiry slider/popup hidden');
  ok(await page.locator('a:has-text("Pay Now"), a:has-text("Gift Card")').count() === 0, 'no Pay Now / Gift Card links on homepage');
  await page.reload();
  await page.waitForTimeout(1200);
  ok(await page.locator('.vy-modal').isVisible(), 'popup shown again on every homepage visit (frequency=every_visit)'); await page.keyboard.press('Escape');
  await page.locator('.vy-side-tab').click();
  await dlg.waitFor({ state: 'visible' });
  ok(true, 'Get a Quote tab reopens popup');
  await page.locator('.vy-option:has-text("Visa Services")').click();
  await page.waitForURL('**/visa-services/');
  ok(true, 'selecting Visa Services navigates to /visa-services/');

  // 2. Visa page
  ok((await page.locator('.vy-price').innerText()).includes('Visa Service Amount: ₹5,000'), 'visa amount ₹5,000 shown');
  ok(await page.locator('#wpcs_tab_368').isHidden(), 'old general slider hidden on service pages too (hide_on=all)');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-vy-download-checklist]').click()]);
  await dl.saveAs(OUT + '/' + dl.suggestedFilename());
  ok(dl.suggestedFilename().endsWith('.xlsx'), 'checklist downloads as .xlsx: ' + dl.suggestedFilename());
  await page.locator('button:has-text("Request Special Price")').click();
  ok(await page.locator('.vy-field--invalid').count() >= 4, 'empty visa submit shows field errors');
  ok(await page.locator('.vy-form__summary').isVisible(), 'error summary shown');
  await page.fill('#vy-visa-full_name', 'Test Visa');
  await page.fill('#vy-visa-mobile', '98400 12345');
  await page.selectOption('#vy-visa-country', '__other');
  ok(await page.locator('#vy-visa-country_other').isVisible(), 'Other country reveals text field');
  await page.fill('#vy-visa-country_other', 'Iceland');
  await page.selectOption('#vy-visa-visa_category', 'Tourist');
  await page.fill('#vy-visa-stay_days', '10');
  await page.locator('button:has-text("Request Special Price")').dblclick();
  await page.locator('.vy-confirm').waitFor();
  const visaMsg = await page.locator('.vy-confirm').innerText();
  ok(/Reference: VY-\d{6}-/.test(visaMsg), 'visa special-price confirmation with reference');
  console.log('   msg:', visaMsg.split('\n')[1]);
  await page.screenshot({ path: OUT + '/visa-confirm.png', fullPage: true });

  // 3. International vs domestic tours
  await page.goto(BASE + '/international-tours/');
  let opts = await page.locator('#vy-international_tours-destination option').allInnerTexts();
  ok(opts.includes('Maldives') && !opts.includes('Kerala') && opts.includes('Other'), 'international destinations list');
  ok((await page.locator('.vy-form__type').innerText()).includes('International'), 'tour type shown as International');
  await page.fill('#vy-international_tours-full_name', 'Tour Tester');
  await page.fill('#vy-international_tours-mobile', '12');
  await page.fill('#vy-international_tours-adults', '0');
  await page.fill('#vy-international_tours-budget_min', '200000');
  await page.fill('#vy-international_tours-budget_max', '100000');
  await page.locator('button:has-text("Request a Quote")').click();
  const err = async (n) => (await page.locator(`[data-field="${n}"] .vy-error`).innerText()).trim();
  ok((await err('mobile')).includes('valid mobile'), 'invalid mobile error');
  ok((await err('adults')).includes('at least one traveller'), 'at least one traveller rule');
  ok((await err('budget_max')).includes('greater than or equal'), 'budget max >= min rule');
  ok(await page.inputValue('#vy-international_tours-full_name') === 'Tour Tester', 'values kept after validation errors');
  await page.screenshot({ path: OUT + '/tour-errors.png', fullPage: true });
  await page.fill('#vy-international_tours-mobile', '+91 98400 90644');
  await page.fill('#vy-international_tours-adults', '2');
  await page.fill('#vy-international_tours-budget_max', '300000');
  await page.selectOption('#vy-international_tours-destination', 'Maldives');
  await page.fill('#vy-international_tours-travel_days', '6');
  await page.check('input[name="hotel_category"][value="4-star"]');
  await page.locator('button:has-text("Request a Quote")').click();
  await page.locator('.vy-confirm').waitFor();
  ok((await page.locator('.vy-confirm').innerText()).includes('International Tours enquiry has been received'), 'international tour enquiry recorded');

  await page.goto(BASE + '/domestic-tours/');
  opts = await page.locator('#vy-domestic_tours-destination option').allInnerTexts();
  ok(opts.includes('Kerala') && !opts.includes('Maldives'), 'domestic destinations list');

  // 4. Flight return date rule
  await page.goto(BASE + '/air-ticketing/');
  ok(await page.locator('[data-field="return_date"]').isHidden(), 'return date hidden for one-way');
  await page.check('input[name="trip_type"][value="Round-trip"]');
  ok(await page.locator('[data-field="return_date"]').isVisible(), 'return date shown for round-trip');
  await page.fill('#vy-flight-full_name', 'Flyer'); await page.fill('#vy-flight-mobile', '9840012345');
  await page.fill('#vy-flight-origin', 'Chennai'); await page.fill('#vy-flight-destination', 'Dubai');
  await page.fill('#vy-flight-departure_date', future(20)); await page.fill('#vy-flight-return_date', future(10));
  await page.locator('button:has-text("Request Flight Quote")').click();
  ok((await err('return_date')).includes('cannot be earlier'), 'return before departure rejected');

  // 5. Hotel dates
  await page.goto(BASE + '/hotel-booking/');
  ok(await page.locator('h1.vy-heading:has-text("Hotel Booking")').count() === 1, 'new hotel page has heading + intro');
  await page.fill('#vy-hotel-checkin', future(10)); await page.fill('#vy-hotel-checkout', future(10));
  await page.locator('button:has-text("Request Hotel Quote")').click();
  ok((await err('checkout')).includes('after check-in'), 'checkout must be after checkin');

  // 6. Passport page: no sensitive fields
  await page.goto(BASE + '/passport-services/');
  const names = await page.locator('.vy-form [name]').evaluateAll(els => els.map(e => e.name));
  ok(!names.some(n => /passport_no|aadhaar|upload|file/i.test(n)) && await page.locator('input[type=file]').count() === 0, 'passport form collects no ID numbers / files');

  // 7. Chatbot
  await page.goto(BASE + '/');
  await page.locator('.vy-chat-launcher').click();
  ok((await page.locator('.vy-msg--bot').first().innerText()).includes('Welcome to VishvYatra Holidays! How can we help you today?'), 'chatbot greeting');
  ok(await page.locator('.vy-chat__option').count() === 11, 'chatbot shows Holiday Finder + Travel Quiz + 8 services + contact');
  await page.locator('.vy-chat__option:has-text("Hotel Booking")').click();
  ok(await page.locator('.vy-chat__option:has-text("Request a Quote")').count() === 1, 'service state offers Request a Quote');
  await page.screenshot({ path: OUT + '/chatbot-desktop.png' });
  await page.locator('[data-chat="back"]').click();
  ok(await page.locator('.vy-chat__option').count() === 11, 'Back returns to main menu');
  await page.fill('#vy-chat-text', 'what is the price of goa trip?');
  await page.press('#vy-chat-text', 'Enter');
  ok((await page.locator('.vy-msg--bot').last().innerText()).includes('I can only help with the options below'), 'free text gets polite fallback');
  await page.locator('.vy-chat__option:has-text("Passport Issue / Renewal")').click();
  await page.locator('.vy-chat__option:has-text("Request a Quote")').click();
  await page.waitForURL('**/passport-services/#vy-enquiry');
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'vy-passport-full_name', 'Request a Quote opens page and focuses form');
  ok(await page.locator('.vy-chat').isHidden(), 'chat panel closed after navigation (does not cover form)');
  await page.locator('.vy-chat-launcher').click();
  ok(await page.locator('.vy-msg').count() > 5, 'conversation preserved across pages');
  await page.keyboard.press('Escape');
  ok(await page.locator('.vy-chat').isHidden(), 'Escape closes chat');

  // 8. Mobile
  const m = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(BASE + '/');
  await mp.locator('.vy-modal__dialog').waitFor({ state: 'visible' });
  const box = await mp.locator('.vy-modal__dialog').boundingBox();
  ok(box.y >= 0 && box.y + box.height <= 667 && box.x >= 0 && box.x + box.width <= 375, 'mobile popup fits viewport ' + JSON.stringify(box));
  ok(await mp.evaluate(() => document.documentElement.scrollWidth <= 375), 'no horizontal scroll on mobile');
  await mp.screenshot({ path: OUT + '/home-popup-mobile.png' });
  await mp.goto(BASE + '/visa-services/');
  await mp.screenshot({ path: OUT + '/visa-mobile.png', fullPage: true });
  await mp.locator('button:has-text("Request Special Price")').scrollIntoViewIfNeeded();
  const sb = await mp.locator('button:has-text("Request Special Price")').boundingBox();
  const lb = await mp.locator('.vy-chat-launcher').boundingBox();
  const overlap = !(sb.x + sb.width < lb.x || lb.x + lb.width < sb.x || sb.y + sb.height < lb.y || lb.y + lb.height < sb.y);
  ok(!overlap, 'chat launcher does not cover submit button on mobile');
  await mp.locator('.vy-chat-launcher').click();
  await mp.screenshot({ path: OUT + '/chatbot-mobile.png' });

  ok(errors.length === 0, 'no JS errors: ' + errors.join(' | '));
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
