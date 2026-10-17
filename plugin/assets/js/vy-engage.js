/**
 * Engagement features built on the site's own packages and photos:
 *   - Holiday Finder: 4 taps -> matching real packages + prefilled quote
 *   - Wishlist & compare: hearts on packages, "My Trips" drawer, compare,
 *     send the whole wishlist as one enquiry
 *   - Interactive itinerary: "Day 1 / Day 2..." accordions become a journey
 *     timeline with a plane that follows your scroll
 *   - Destination stories: story circles on the homepage
 */
(function () {
	'use strict';

	var VY = window.VY;
	var cfg = VY.config;
	var E = cfg.engage || {};
	if (!E.themes) return;

	var WISH = 'vy_wishlist';
	var FINDER = 'vy_finder';

	// ---------- shared ----------
	var catalogPromise = null;
	VY.catalog = function () {
		if (!catalogPromise) {
			var cached = null;
			try { cached = JSON.parse(sessionStorage.getItem('vy_catalog') || 'null'); } catch (e) { /* ignore */ }
			catalogPromise = cached ? Promise.resolve(cached) : fetch(E.catalogUrl, { credentials: 'same-origin' })
				.then(function (r) { return r.json(); })
				.then(function (d) {
					var list = (d && d.packages) || [];
					try { sessionStorage.setItem('vy_catalog', JSON.stringify(list)); } catch (e) { /* too big / blocked */ }
					return list;
				});
			catalogPromise = catalogPromise.catch(function () { catalogPromise = null; return []; });
		}
		return catalogPromise;
	};

	function slugFromUrl(href) {
		try {
			var path = new URL(href, location.href).pathname.replace(/\/+$/, '');
			return path.split('/').pop();
		} catch (e) { return ''; }
	}
	function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
	function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

	/** A simple accessible modal shell shared by finder, compare and stories. */
	function Modal(cls, label) {
		var el = document.createElement('div');
		el.className = 'vy-emodal ' + cls;
		el.hidden = true;
		el.innerHTML = '<div class="vy-emodal__backdrop" data-close></div>' +
			'<div class="vy-emodal__dialog" role="dialog" aria-modal="true" aria-label="' + VY.esc(label) + '" tabindex="-1">' +
			'<button type="button" class="vy-emodal__close" data-close aria-label="Close">' + VY.icon('close') + '</button>' +
			'<div class="vy-emodal__body"></div></div>';
		document.body.appendChild(el);
		var last = null;
		var api = {
			el: el,
			body: el.querySelector('.vy-emodal__body'),
			onClose: null,
			open: function () {
				last = document.activeElement;
				el.hidden = false;
				document.documentElement.classList.add('vy-scroll-lock');
				el.querySelector('.vy-emodal__dialog').focus({ preventScroll: true });
			},
			close: function () {
				if (el.hidden) return;
				el.hidden = true;
				document.documentElement.classList.remove('vy-scroll-lock');
				if (api.onClose) api.onClose();
				if (last && last.focus && document.contains(last)) last.focus();
			}
		};
		el.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) api.close(); });
		el.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { e.preventDefault(); api.close(); return; }
			VY.trapFocus(el.querySelector('.vy-emodal__dialog'), e);
		});
		return api;
	}

	function packageCard(p, opts) {
		opts = opts || {};
		var themes = (p.themes || []).slice(0, 2).map(function (t) {
			var th = E.themes[t]; return th ? '<span class="vy-pcard__tag">' + th.icon + ' ' + VY.esc(th.label) + '</span>' : '';
		}).join('');
		return '<article class="vy-pcard">' +
			'<div class="vy-pcard__media"><img src="' + VY.esc(p.image) + '" alt="">' +
			heartHtml(p.slug, p.title) + '</div>' +
			'<div class="vy-pcard__body">' +
			'<p class="vy-pcard__meta">' + (p.duration ? '<span>🕒 ' + VY.esc(p.duration) + '</span>' : '') +
			'<span>' + (p.tour_type === 'domestic' ? '🇮🇳 India' : '✈️ Abroad') + '</span></p>' +
			'<h3 class="vy-pcard__title">' + VY.esc(p.title) + '</h3>' +
			(p.places ? '<p class="vy-pcard__places">📍 ' + VY.esc(p.places) + '</p>' : '') +
			'<p class="vy-pcard__tags">' + themes + '</p>' +
			'<div class="vy-pcard__actions"><a class="vy-btn vy-btn--outline" href="' + VY.esc(p.url) + '">View trip</a>' +
			'<a class="vy-btn" href="' + VY.esc(p.url) + '#vy-enquiry">Get quote</a></div>' +
			(opts.extra || '') + '</div></article>';
	}

	// =====================================================================
	// Wishlist & compare
	// =====================================================================
	function wishlist() { var w = VY.local.get(WISH); return Array.isArray(w) ? w : []; }
	function setWishlist(w) { VY.local.set(WISH, w.slice(0, 20)); syncHearts(); renderTripsButton(); }
	function inWishlist(slug) { return wishlist().indexOf(slug) !== -1; }
	function toggleWish(slug) {
		var w = wishlist();
		var i = w.indexOf(slug);
		if (i === -1) w.unshift(slug); else w.splice(i, 1);
		setWishlist(w);
		return i === -1;
	}

	function heartHtml(slug, title) {
		if (!E.wishlist || !E.wishlist.enabled) return '';
		var on = inWishlist(slug);
		return '<button type="button" class="vy-heart' + (on ? ' is-on' : '') + '" data-vy-heart="' + VY.esc(slug) + '" aria-pressed="' + on + '" aria-label="' +
			VY.esc((on ? 'Remove ' : 'Save ') + title + (on ? ' from' : ' to') + ' My Trips') + '"><span aria-hidden="true">' + (on ? '♥' : '♡') + '</span></button>';
	}
	function syncHearts() {
		Array.prototype.forEach.call(document.querySelectorAll('[data-vy-heart]'), function (b) {
			var on = inWishlist(b.getAttribute('data-vy-heart'));
			b.classList.toggle('is-on', on);
			b.setAttribute('aria-pressed', on);
			b.querySelector('span').textContent = on ? '♥' : '♡';
			if (b.classList.contains('vy-heart--label')) b.lastChild.textContent = on ? ' Saved to My Trips' : ' Save to My Trips';
		});
	}

	var tripsBtn = null;
	function renderTripsButton() {
		if (!E.wishlist || !E.wishlist.enabled) return;
		var n = wishlist().length;
		if (!tripsBtn) {
			tripsBtn = document.createElement('button');
			tripsBtn.type = 'button';
			tripsBtn.className = 'vy-trips-btn';
			tripsBtn.addEventListener('click', openTrips);
			document.body.appendChild(tripsBtn);
		}
		tripsBtn.hidden = n === 0;
		tripsBtn.innerHTML = '<span aria-hidden="true">♥</span> My Trips <span class="vy-trips-btn__n">' + n + '</span>';
		tripsBtn.setAttribute('aria-label', 'My Trips: ' + n + ' saved');
	}

	function heartBurst(btn) {
		if (reduceMotion()) return;
		btn.classList.remove('is-pop'); void btn.offsetWidth; btn.classList.add('is-pop');
		if (tripsBtn && !tripsBtn.hidden) { tripsBtn.classList.remove('is-bump'); void tripsBtn.offsetWidth; tripsBtn.classList.add('is-bump'); }
	}

	document.addEventListener('click', function (e) {
		var h = e.target.closest('[data-vy-heart]');
		if (!h) return;
		e.preventDefault();
		e.stopPropagation();
		var added = toggleWish(h.getAttribute('data-vy-heart'));
		if (added) heartBurst(h);
	});

	/** Hearts on the theme's package cards and on the package page title. */
	function decoratePackages(catalog) {
		if (!E.wishlist || !E.wishlist.enabled) return;
		var bySlug = {};
		catalog.forEach(function (p) { bySlug[p.slug] = p; });
		Array.prototype.forEach.call(document.querySelectorAll('article.et_pb_post a.entry-featured-image-url'), function (a) {
			var p = bySlug[slugFromUrl(a.href)];
			var box = a.parentNode;
			if (!p || box.querySelector('[data-vy-heart]')) return;
			box.classList.add('vy-has-heart');
			box.insertAdjacentHTML('beforeend', heartHtml(p.slug, p.title));
		});
		var here = bySlug[slugFromUrl(location.href)];
		var h1 = document.querySelector('#left-area h1.entry-title, .et_post_meta_wrapper h1');
		if (here && h1 && !document.querySelector('.vy-heart--label')) {
			h1.insertAdjacentHTML('afterend', '<button type="button" class="vy-heart vy-heart--label' + (inWishlist(here.slug) ? ' is-on' : '') + '" data-vy-heart="' + VY.esc(here.slug) +
				'" aria-pressed="' + inWishlist(here.slug) + '"><span aria-hidden="true">' + (inWishlist(here.slug) ? '♥' : '♡') + '</span>' +
				(inWishlist(here.slug) ? ' Saved to My Trips' : ' Save to My Trips') + '</button>');
		}
	}

	var trips = null;
	function openTrips() {
		if (!trips) {
			trips = Modal('vy-trips', 'My Trips');
			trips.body.addEventListener('click', function (e) {
				if (e.target.closest('[data-compare]')) compare();
				else if (e.target.closest('[data-send]')) sendWishlist();
			});
			trips.body.addEventListener('change', function (e) { if (e.target.matches('[data-pick]')) updateCompareButton(); });
		}
		trips.body.innerHTML = '<p class="vy-emodal__kicker">♥ My Trips</p><p class="vy-emodal__title">Loading your saved trips…</p>';
		trips.open();
		VY.catalog().then(function (catalog) {
			var map = {}; catalog.forEach(function (p) { map[p.slug] = p; });
			var items = wishlist().map(function (s) { return map[s]; }).filter(Boolean);
			if (!items.length) {
				trips.body.innerHTML = '<p class="vy-emodal__kicker">♥ My Trips</p><p class="vy-emodal__title">No saved trips yet</p><p class="vy-emodal__text">Tap ♡ on any package to save it here.</p>';
				return;
			}
			var max = (E.wishlist && E.wishlist.compare_max) || 3;
			trips.body.innerHTML = '<p class="vy-emodal__kicker">♥ My Trips</p><p class="vy-emodal__title">' + items.length + ' saved trip' + (items.length > 1 ? 's' : '') + '</p>' +
				'<p class="vy-emodal__text">Tick up to ' + max + ' to compare side by side, or send them all to our team in one enquiry.</p>' +
				'<ul class="vy-trips__list">' + items.map(function (p, i) {
					return '<li class="vy-trips__item"><label class="vy-trips__pick"><input type="checkbox" data-pick value="' + VY.esc(p.slug) + '"' + (i < max ? ' checked' : '') + '><span class="vy-sr">Compare ' + VY.esc(p.title) + '</span></label>' +
						'<img src="' + VY.esc(p.image) + '" alt=""><div class="vy-trips__info"><a href="' + VY.esc(p.url) + '">' + VY.esc(p.title) + '</a><span>' + VY.esc(p.duration || '') + '</span></div>' +
						heartHtml(p.slug, p.title) + '</li>';
				}).join('') + '</ul>' +
				'<div class="vy-emodal__actions"><button type="button" class="vy-btn vy-btn--outline" data-compare>Compare</button><button type="button" class="vy-btn" data-send>Send all in one enquiry →</button></div>';
			updateCompareButton();
		});
	}
	function picked() {
		return Array.prototype.map.call(trips.body.querySelectorAll('[data-pick]:checked'), function (c) { return c.value; });
	}
	function updateCompareButton() {
		var max = (E.wishlist && E.wishlist.compare_max) || 3;
		var n = picked().length;
		var b = trips.body.querySelector('[data-compare]');
		if (b) { b.disabled = n < 2 || n > max; b.textContent = n > max ? 'Pick up to ' + max : 'Compare ' + (n >= 2 ? n : ''); }
	}

	function compare() {
		var slugs = picked();
		VY.catalog().then(function (catalog) {
			var map = {}; catalog.forEach(function (p) { map[p.slug] = p; });
			var items = slugs.map(function (s) { return map[s]; }).filter(Boolean);
			var row = function (label, fn) {
				return '<tr><th scope="row">' + label + '</th>' + items.map(function (p) { return '<td>' + fn(p) + '</td>'; }).join('') + '</tr>';
			};
			trips.body.innerHTML = '<p class="vy-emodal__kicker">Compare</p><p class="vy-emodal__title">Side by side</p>' +
				'<div class="vy-compare"><table><thead><tr><td></td>' + items.map(function (p) {
					return '<th scope="col"><img src="' + VY.esc(p.image) + '" alt=""><span>' + VY.esc(p.title) + '</span></th>';
				}).join('') + '</tr></thead><tbody>' +
				row('Duration', function (p) { return VY.esc(p.duration || (p.days ? p.days + ' days' : '-')); }) +
				row('Days', function (p) {
					var max = Math.max.apply(null, items.map(function (x) { return x.days || 0; })) || 1;
					return '<span class="vy-compare__bar" style="width:' + Math.round(((p.days || 0) / max) * 100) + '%"></span>' + (p.days || '-');
				}) +
				row('Where', function (p) { return VY.esc(p.places || p.destination || '-'); }) +
				row('Trip type', function (p) { return p.tour_type === 'domestic' ? '🇮🇳 India' : '✈️ Abroad'; }) +
				row('Best for', function (p) { return (p.themes || []).map(function (t) { return E.themes[t] ? E.themes[t].icon + ' ' + VY.esc(E.themes[t].label) : ''; }).join('<br>') || '-'; }) +
				row('', function (p) { return '<a class="vy-btn vy-btn--outline" href="' + VY.esc(p.url) + '">View</a> <a class="vy-btn" href="' + VY.esc(p.url) + '#vy-enquiry">Quote</a>'; }) +
				'</tbody></table></div>' +
				'<div class="vy-emodal__actions"><button type="button" class="vy-btn vy-btn--ghost" data-back>← Back to My Trips</button></div>';
			trips.body.querySelector('[data-back]').addEventListener('click', openTrips);
		});
	}

	function sendWishlist() {
		VY.catalog().then(function (catalog) {
			var map = {}; catalog.forEach(function (p) { map[p.slug] = p; });
			var items = wishlist().map(function (s) { return map[s]; }).filter(Boolean);
			VY.storage.set('vy_wishlist_enquiry', JSON.stringify(items.map(function (p) { return { title: p.title, duration: p.duration, url: p.url }; })));
			var other = cfg.services && cfg.services.other;
			if (other) location.href = other.url + '#vy-enquiry';
		});
	}

	// =====================================================================
	// Holiday Finder
	// =====================================================================
	var STEPS = [
		{ key: 'where', q: 'Where would you like to go?', options: [
			{ v: 'domestic', icon: '🇮🇳', label: 'Within India' }, { v: 'international', icon: '✈️', label: 'Abroad' }, { v: 'any', icon: '🎲', label: 'Surprise me' }] },
		{ key: 'vibe', q: 'What\'s your travel vibe?', options: null },
		{ key: 'days', q: 'How long can you travel?', options: [
			{ v: 'short', icon: '⚡', label: 'Short break', sub: 'up to 5 days' }, { v: 'week', icon: '🗓️', label: 'About a week', sub: '6-8 days' },
			{ v: 'long', icon: '🌍', label: 'Long trip', sub: '9+ days' }, { v: 'any', icon: '🤷', label: 'Flexible' }] },
		{ key: 'who', q: 'Who\'s coming along?', options: [
			{ v: 'couple', icon: '💑', label: 'Couple' }, { v: 'family', icon: '👨‍👩‍👧', label: 'Family with kids' }, { v: 'friends', icon: '👯', label: 'Friends' },
			{ v: 'solo', icon: '🧳', label: 'Just me' }, { v: 'seniors', icon: '🧓', label: 'Seniors' }] }
	];
	var finder = null, answers = {};

	VY.openFinder = function () {
		if (!finder) {
			finder = Modal('vy-finder', 'Find my perfect holiday');
			finder.body.addEventListener('click', function (e) {
				var opt = e.target.closest('[data-answer]');
				if (opt) {
					var step = STEPS[Number(opt.getAttribute('data-step'))];
					answers[step.key] = opt.getAttribute('data-answer');
					opt.classList.add('is-picked');
					setTimeout(function () { renderStep(Number(opt.getAttribute('data-step')) + 1); }, reduceMotion() ? 0 : 220);
				} else if (e.target.closest('[data-step-back]')) {
					renderStep(Number(e.target.closest('[data-step-back]').getAttribute('data-step-back')));
				} else if (e.target.closest('[data-restart]')) {
					answers = {}; renderStep(0);
				}
			});
		}
		answers = {};
		VY.catalog(); // start loading while the visitor answers
		finder.open();
		renderStep(0);
	};

	function renderStep(i) {
		if (i >= STEPS.length) return renderResults();
		var step = STEPS[i];
		var options = step.options || Object.keys(E.themes).map(function (k) {
			return { v: k, icon: E.themes[k].icon, label: E.themes[k].label };
		}).concat([{ v: 'any', icon: '✨', label: 'A bit of everything' }]);
		finder.body.innerHTML =
			'<p class="vy-emodal__kicker">✨ Holiday Finder · Step ' + (i + 1) + ' of ' + STEPS.length + '</p>' +
			'<div class="vy-finder__progress" aria-hidden="true"><span style="width:' + Math.round((i / STEPS.length) * 100) + '%"></span></div>' +
			'<p class="vy-emodal__title">' + VY.esc(step.q) + '</p>' +
			'<div class="vy-finder__options' + (options.length > 4 ? ' vy-finder__options--many' : '') + '">' + options.map(function (o) {
				return '<button type="button" class="vy-finder__opt' + (answers[step.key] === o.v ? ' is-picked' : '') + '" data-step="' + i + '" data-answer="' + VY.esc(o.v) + '">' +
					'<span class="vy-finder__icon" aria-hidden="true">' + o.icon + '</span><span class="vy-finder__label">' + VY.esc(o.label) + '</span>' +
					(o.sub ? '<span class="vy-finder__sub">' + VY.esc(o.sub) + '</span>' : '') + '</button>';
			}).join('') + '</div>' +
			(i > 0 ? '<button type="button" class="vy-link vy-finder__back" data-step-back="' + (i - 1) + '">← Back</button>' : '');
		var first = finder.body.querySelector('.vy-finder__opt');
		if (first) first.focus({ preventScroll: true });
	}

	function score(p) {
		var s = 0;
		if (answers.where !== 'any' && p.tour_type !== answers.where) return -1;
		if (answers.vibe && answers.vibe !== 'any') {
			if ((p.themes || []).indexOf(answers.vibe) === -1) return -1;
			s += 3;
		}
		var d = p.days || 0;
		var range = { short: [1, 5], week: [6, 8], long: [9, 99] }[answers.days];
		if (range) {
			if (d >= range[0] && d <= range[1]) s += 3;
			else if (d >= range[0] - 1 && d <= range[1] + 1) s += 1;
			else s -= 2;
		}
		var t = (p.title + ' ' + (p.places || '')).toLowerCase();
		if (answers.who === 'couple' && /honeymoon|romantic|couple/.test(t)) s += 2;
		if (answers.who === 'family' && /family|disney|theme park|universal|legoland/.test(t)) s += 2;
		if (answers.who === 'seniors' && (p.themes || []).indexOf('pilgrimage') !== -1) s += 1;
		if (answers.who === 'friends' && (p.themes || []).indexOf('adventure') !== -1) s += 1;
		return s;
	}

	function renderResults() {
		VY.storage.set(FINDER, JSON.stringify(answers));
		finder.body.innerHTML = '<p class="vy-emodal__kicker">✨ Holiday Finder</p><p class="vy-emodal__title">Finding your trips…</p><div class="vy-finder__spinner" aria-hidden="true">✈️</div>';
		VY.catalog().then(function (catalog) {
			var n = (E.finder && E.finder.results) || 6;
			var ranked = shuffle(catalog).map(function (p) { return { p: p, s: score(p) }; })
				.filter(function (x) { return x.s >= 0; })
				.sort(function (a, b) { return b.s - a.s; })
				.slice(0, n).map(function (x) { return x.p; });
			var relaxed = false;
			if (!ranked.length) {
				// Nothing matches every answer: keep where + vibe, drop the rest.
				relaxed = true;
				var keep = { where: answers.where, vibe: answers.vibe };
				ranked = shuffle(catalog).filter(function (p) {
					return (keep.where === 'any' || p.tour_type === keep.where) && (!keep.vibe || keep.vibe === 'any' || (p.themes || []).indexOf(keep.vibe) !== -1);
				}).slice(0, n);
			}
			var vibe = answers.vibe && E.themes[answers.vibe] ? E.themes[answers.vibe].label.toLowerCase() : 'trips';
			finder.body.innerHTML =
				'<p class="vy-emodal__kicker">✨ Your matches</p>' +
				'<p class="vy-emodal__title">' + (ranked.length ? 'We found ' + ranked.length + ' ' + VY.esc(vibe) + ' for you' : 'No exact match - let\'s talk!') + '</p>' +
				(relaxed && ranked.length ? '<p class="vy-emodal__text">No package matched every answer, so here are the closest ones. Our team can tailor any of them.</p>' : '') +
				'<div class="vy-finder__results">' + ranked.map(function (p) { return packageCard(p); }).join('') + '</div>' +
				'<div class="vy-emodal__actions"><button type="button" class="vy-btn vy-btn--ghost" data-restart>↺ Start over</button>' +
				'<a class="vy-btn" href="' + VY.esc((cfg.services.other || {}).url || '#') + '#vy-enquiry">Plan something custom →</a></div>';
			if (!reduceMotion()) {
				Array.prototype.forEach.call(finder.body.querySelectorAll('.vy-pcard'), function (c, i) { c.style.animationDelay = (i * 70) + 'ms'; });
			}
		});
	}

	/** Travellers prefill for tour forms, from the finder's "Who" answer. */
	VY.finderTravellers = function () {
		var a = null;
		try { a = JSON.parse(VY.storage.get(FINDER) || 'null'); } catch (e) { /* ignore */ }
		var map = { couple: { adults: 2 }, family: { adults: 2, children: 2 }, friends: { adults: 4 }, solo: { adults: 1 }, seniors: { adults: 0, elderly: 2 } };
		return a && map[a.who] ? map[a.who] : null;
	};

	document.addEventListener('click', function (e) {
		if (e.target.closest('[data-vy-open-finder]')) { e.preventDefault(); if (VY.closeServicePopup) VY.closeServicePopup(); VY.openFinder(); }
	});

	// =====================================================================
	// Interactive itinerary
	// =====================================================================
	function buildItinerary() {
		if (!E.itinerary || !E.itinerary.enabled) return;
		var acc = Array.prototype.find.call(document.querySelectorAll('.et_pb_accordion'), function (a) {
			var titles = a.querySelectorAll('.et_pb_toggle_title');
			return titles.length >= 2 && /^\s*Day\s*\d+/i.test(titles[0].textContent);
		});
		if (!acc) return;
		var days = Array.prototype.map.call(acc.querySelectorAll('.et_pb_toggle'), function (t) {
			var title = (t.querySelector('.et_pb_toggle_title') || {}).textContent || '';
			var m = title.match(/^\s*Day\s*(\d+)\s*[:\-–]?\s*(.*)$/i);
			return { n: m ? m[1] : '', place: (m ? m[2] : title).trim(), html: (t.querySelector('.et_pb_toggle_content') || {}).innerHTML || '' };
		});

		var wrap = document.createElement('section');
		wrap.className = 'vy-itin';
		wrap.setAttribute('aria-label', 'Day-by-day itinerary');
		wrap.innerHTML =
			'<div class="vy-itin__head"><p class="vy-itin__kicker">Your journey</p><h2 class="vy-itin__title">' + days.length + ' days, day by day</h2>' +
			'<button type="button" class="vy-link" data-itin-all aria-expanded="false">Expand all days</button></div>' +
			'<div class="vy-itin__track"><div class="vy-itin__rail" aria-hidden="true"><span class="vy-itin__fill"></span><span class="vy-itin__plane">' + VY.icon('plane') + '</span></div>' +
			'<ol class="vy-itin__days">' + days.map(function (d, i) {
				var id = 'vy-day-' + i;
				return '<li class="vy-itin__day' + (i === 0 ? ' is-open' : '') + '">' +
					'<span class="vy-itin__node" aria-hidden="true">' + VY.esc(d.n || String(i + 1)) + '</span>' +
					'<button type="button" class="vy-itin__toggle" aria-expanded="' + (i === 0) + '" aria-controls="' + id + '">' +
					'<span class="vy-itin__daynum">Day ' + VY.esc(d.n || String(i + 1)) + '</span><span class="vy-itin__place">' + VY.esc(d.place) + '</span><span class="vy-itin__chev" aria-hidden="true">⌄</span></button>' +
					'<div class="vy-itin__content" id="' + id + '"' + (i === 0 ? '' : ' hidden') + '>' + d.html +
					'<button type="button" class="vy-itin__custom" data-day="' + i + '" aria-pressed="false">✎ I\'d like to change this day</button></div></li>';
			}).join('') + '</ol></div>';
		acc.parentNode.insertBefore(wrap, acc);
		acc.classList.add('vy-itin-source'); // original accordion kept for search engines, hidden visually

		wrap.addEventListener('click', function (e) {
			var tog = e.target.closest('.vy-itin__toggle');
			if (tog) {
				var li = tog.parentNode, open = !li.classList.contains('is-open');
				li.classList.toggle('is-open', open); tog.setAttribute('aria-expanded', open);
				li.querySelector('.vy-itin__content').hidden = !open;
				requestAnimationFrame(track);
				return;
			}
			if (e.target.closest('[data-itin-all]')) {
				var btn = e.target.closest('[data-itin-all]'), expand = btn.getAttribute('aria-expanded') !== 'true';
				Array.prototype.forEach.call(wrap.querySelectorAll('.vy-itin__day'), function (li) {
					li.classList.toggle('is-open', expand); li.querySelector('.vy-itin__toggle').setAttribute('aria-expanded', expand); li.querySelector('.vy-itin__content').hidden = !expand;
				});
				btn.setAttribute('aria-expanded', expand); btn.textContent = expand ? 'Collapse all days' : 'Expand all days';
				requestAnimationFrame(track);
				return;
			}
			var c = e.target.closest('.vy-itin__custom');
			if (c) {
				var on = c.getAttribute('aria-pressed') !== 'true';
				c.setAttribute('aria-pressed', on); c.classList.toggle('is-on', on);
				c.textContent = on ? '✓ Added to your quote request' : '✎ I\'d like to change this day';
				syncCustomDays(wrap, days);
			}
		});

		// Plane + progress follow the visitor's scroll through the journey.
		var fill = wrap.querySelector('.vy-itin__fill'), plane = wrap.querySelector('.vy-itin__plane');
		var nodes = wrap.querySelectorAll('.vy-itin__day');
		function track() {
			var r = wrap.querySelector('.vy-itin__track').getBoundingClientRect();
			var mid = window.innerHeight * 0.55;
			var p = Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height)));
			fill.style.height = (p * 100) + '%';
			plane.style.top = (p * 100) + '%';
			Array.prototype.forEach.call(nodes, function (li) { li.classList.toggle('is-passed', li.getBoundingClientRect().top < mid); });
		}
		var ticking = false;
		window.addEventListener('scroll', function () {
			if (ticking) return; ticking = true;
			requestAnimationFrame(function () { ticking = false; track(); });
		}, { passive: true });
		window.addEventListener('resize', track);
		track();
	}

	/** Puts the days the visitor wants changed into the form's notes. */
	function syncCustomDays(wrap, days) {
		var picked = Array.prototype.filter.call(wrap.querySelectorAll('.vy-itin__custom'), function (b) { return b.getAttribute('aria-pressed') === 'true'; })
			.map(function (b) { var d = days[Number(b.getAttribute('data-day'))]; return 'Day ' + d.n + (d.place ? ' (' + d.place + ')' : ''); });
		var ta = document.querySelector('#vy-enquiry textarea[name="additional"]');
		if (!ta) return;
		var marker = 'Please customise: ';
		var lines = ta.value.split('\n').filter(function (l) { return l.indexOf(marker) !== 0; });
		if (picked.length) lines.unshift(marker + picked.join(', '));
		ta.value = lines.join('\n').trim();
	}

	// =====================================================================
	// Destination stories
	// =====================================================================
	var SEEN = 'vy_stories_seen';
	function buildStories() {
		var S = E.stories;
		var mount = document.querySelector('[data-vy-stories]');
		if (!mount || !S || !S.enabled || !S.items || !S.items.length) return;
		var seen = VY.local.get(SEEN) || [];
		mount.innerHTML = '<p class="vy-stories__title">Explore destinations</p><div class="vy-stories__row" role="list">' + S.items.map(function (s, i) {
			return '<button type="button" role="listitem" class="vy-story' + (seen.indexOf(s.label) !== -1 ? ' is-seen' : '') + '" data-story="' + i + '">' +
				'<span class="vy-story__ring"><img src="' + VY.esc(E.imageBase + s.cover) + '" alt=""></span><span class="vy-story__label">' + VY.esc(s.label) + '</span></button>';
		}).join('') + '</div>';
		mount.addEventListener('click', function (e) {
			var b = e.target.closest('[data-story]');
			if (b) openStory(Number(b.getAttribute('data-story')));
		});
	}

	var viewer = null, cur = { story: 0, slide: 0 }, timer = null, paused = false, started = 0, elapsed = 0;
	var SLIDE_MS = 5000;

	function openStory(i) {
		if (!viewer) {
			viewer = Modal('vy-storyview', 'Destination story');
			viewer.onClose = function () { clearTimeout(timer); timer = null; };
			var el = viewer.el;
			var downAt = 0, downX = 0;
			el.addEventListener('pointerdown', function (e) {
				if (e.target.closest('button, a')) return;
				downAt = Date.now(); downX = e.clientX; pause(true);
			});
			el.addEventListener('pointerup', function (e) {
				if (!downAt) return;
				var held = Date.now() - downAt, dx = e.clientX - downX;
				downAt = 0; pause(false);
				if (Math.abs(dx) > 50) { nextStory(dx < 0 ? 1 : -1); return; }
				if (held < 250) { var r = el.querySelector('.vy-sv').getBoundingClientRect(); step(e.clientX < r.left + r.width / 3 ? -1 : 1); }
			});
			el.addEventListener('keydown', function (e) {
				if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
				else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
				else if (e.key === ' ') { e.preventDefault(); pause(!paused); }
			});
		}
		cur = { story: i, slide: 0 };
		viewer.open();
		renderSlide();
	}

	function storyAt(i) { return E.stories.items[i]; }
	function slidesOf(s) { return s.slides.length + 1; } // +1 = the call-to-action card

	function renderSlide() {
		clearTimeout(timer);
		var s = storyAt(cur.story);
		var total = slidesOf(s);
		var seen = VY.local.get(SEEN) || [];
		if (seen.indexOf(s.label) === -1) { seen.push(s.label); VY.local.set(SEEN, seen); }
		var isCta = cur.slide >= s.slides.length;
		var bars = '';
		for (var k = 0; k < total; k++) bars += '<span class="vy-sv__bar' + (k < cur.slide ? ' is-done' : '') + '"><span' + (k === cur.slide ? ' class="is-now"' : '') + '></span></span>';
		var head = '<div class="vy-sv__bars" aria-hidden="true">' + bars + '</div><p class="vy-sv__label"><img src="' + VY.esc(E.imageBase + s.cover) + '" alt="">' + VY.esc(s.label) + '</p>';
		if (isCta) {
			viewer.body.innerHTML = '<div class="vy-sv vy-sv--cta" style="background-image:url(\'' + VY.esc(E.imageBase + s.cover) + '\')">' + head +
				'<div class="vy-sv__cta"><p class="vy-sv__cta-title">Fancy ' + VY.esc(s.label) + '?</p>' +
				'<a class="vy-btn vy-btn--lg" href="' + VY.esc(s.link) + '">See ' + VY.esc(s.label) + ' packages</a>' +
				'<a class="vy-btn vy-btn--lg vy-btn--light" href="' + VY.esc(s.link) + '#vy-enquiry">Get a quote</a>' +
				'<button type="button" class="vy-link vy-link--light" data-vy-open-finder>✨ Not sure? Find my perfect holiday</button>' +
				'<button type="button" class="vy-link vy-link--light" data-next-story>Next story →</button></div></div>';
			viewer.body.querySelector('[data-next-story]').addEventListener('click', function () { nextStory(1); });
			return;
		}
		var slide = s.slides[cur.slide];
		viewer.body.innerHTML = '<div class="vy-sv">' + head +
			'<img class="vy-sv__bg" src="' + VY.esc(E.imageBase + slide[0]) + '" alt="">' +
			'<img class="vy-sv__img" src="' + VY.esc(E.imageBase + slide[0]) + '" alt="' + VY.esc(slide[1]) + '">' +
			'<p class="vy-sv__caption">' + VY.esc(slide[1]) + '<span class="vy-sv__hint" aria-hidden="true">Tap to continue · hold to pause</span></p></div>';
		// Preload the next photo.
		var nxt = s.slides[cur.slide + 1]; if (nxt) { var im = new Image(); im.src = E.imageBase + nxt[0]; }
		elapsed = 0; startTimer();
	}
	function startTimer() {
		if (reduceMotion()) return; // no auto-advance: visitor taps through
		started = Date.now();
		var now = viewer.body.querySelector('.is-now');
		if (now) { now.style.animationDuration = SLIDE_MS + 'ms'; now.style.animationPlayState = 'running'; }
		timer = setTimeout(function () { step(1); }, SLIDE_MS - elapsed);
	}
	function pause(on) {
		paused = on;
		var now = viewer && viewer.body.querySelector('.is-now');
		if (on) { clearTimeout(timer); elapsed += Date.now() - started; if (now) now.style.animationPlayState = 'paused'; }
		else if (!viewer.el.hidden && storyAt(cur.story) && cur.slide < storyAt(cur.story).slides.length) startTimer();
	}
	function step(d) {
		var s = storyAt(cur.story);
		var next = cur.slide + d;
		if (next < 0) return nextStory(-1);
		if (next >= slidesOf(s)) return nextStory(1);
		cur.slide = next; renderSlide();
	}
	function nextStory(d) {
		var n = cur.story + d;
		if (n < 0 || n >= E.stories.items.length) { viewer.close(); return; }
		cur = { story: n, slide: 0 }; renderSlide();
	}

	// ---------- boot ----------
	VY.ready(function () {
		buildItinerary();
		buildStories();
		renderTripsButton();
		var needsCatalog = document.querySelector('article.et_pb_post a.entry-featured-image-url') || document.querySelector('#left-area h1.entry-title');
		if (needsCatalog && E.wishlist && E.wishlist.enabled) VY.catalog().then(decoratePackages);
	});
})();
