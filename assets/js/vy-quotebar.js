/**
 * Smart Quote Bar: a slim bar that slides in under the site header on every
 * page that has an enquiry form, worded for that page (package name,
 * destination, duration), with a mobile-number shortcut into the form.
 * Hides while the form itself is on screen; the visitor can close it.
 */
(function () {
	'use strict';

	var VY = window.VY;
	var cfg = VY.config;
	var barCfg = cfg.quoteBar || {};
	var CLOSED_KEY = 'vy_quotebar_closed';

	function headerBottom() {
		var top = 0;
		var admin = document.getElementById('wpadminbar');
		if (admin && getComputedStyle(admin).position === 'fixed') top = admin.getBoundingClientRect().bottom;
		var header = document.getElementById('main-header') || document.querySelector('header.site-header, header');
		if (header) {
			var pos = getComputedStyle(header).position;
			if (pos === 'fixed' || pos === 'sticky') {
				var r = header.getBoundingClientRect();
				if (r.bottom > 0) top = Math.max(top, r.bottom);
			}
		}
		return Math.max(0, Math.round(top));
	}

	function parseJSON(s) {
		try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
	}

	/** Headline + chips for this page, from the form's own data attributes. */
	function describe(mount) {
		var key = mount.getAttribute('data-vy-service');
		var service = cfg.services[key] || {};
		var context = parseJSON(mount.getAttribute('data-vy-context'));
		var prefill = parseJSON(mount.getAttribute('data-vy-prefill')) || {};
		var h = barCfg.headlines || {};
		var kind;
		if (context && context.kind === 'package') kind = 'package';
		else if (!context) kind = key === 'visa' ? 'visa' : 'service';
		else kind = service.form === 'tour' ? 'tour' : 'other';

		var title = context && context.title ? context.title : service.label;
		var visaAmount = cfg.visa && cfg.visa.pricing ? VY.formatINR(cfg.visa.pricing['default']) : '';
		var html = VY.esc(h[kind] || '{title}')
			.replace('{title}', '<strong>' + VY.esc(title) + '</strong>')
			.replace('{service}', '<strong>' + VY.esc(service.label || '') + '</strong>')
			.replace('{visa_amount}', '<strong>' + VY.esc(visaAmount) + '</strong>');

		var chips = [];
		var dest = prefill.destination === '__other' ? prefill.destination_other : prefill.destination;
		if (dest) chips.push(dest);
		if (context && context.details) chips.push(context.details);
		else if (prefill.travel_days) chips.push(prefill.travel_days + ' days');
		if (prefill.category && prefill.category !== 'General enquiry') chips.push(prefill.category);
		if (service.tour_type && !chips.length) chips.push(service.tour_type === 'international' ? 'International' : 'Domestic');
		return { html: html, chips: chips, compactLabel: kind === 'other' ? 'Ask us' : 'Get quote' };
	}

	function build(mount) {
		var d = describe(mount);
		var bar = document.createElement('div');
		bar.className = 'vy-qbar';
		bar.setAttribute('role', 'region');
		bar.setAttribute('aria-label', 'Quick quote');
		bar.hidden = true;
		bar.innerHTML =
			'<div class="vy-qbar__inner">' +
			'<span class="vy-qbar__plane" aria-hidden="true"><span class="vy-qbar__trail"></span>' + VY.icon('plane', 'vy-qbar__plane-svg') + '</span>' +
			'<div class="vy-qbar__text">' +
			'<p class="vy-qbar__title">' + d.html + '</p>' +
			'<p class="vy-qbar__meta">' + d.chips.map(function (c) { return '<span class="vy-chip">' + VY.esc(c) + '</span>'; }).join('') +
			'<span class="vy-qbar__sub">' + VY.esc(barCfg.subline || '') + '</span></p>' +
			'</div>' +
			'<form class="vy-qbar__form" novalidate>' +
			'<label class="vy-sr" for="vy-qbar-mobile">' + VY.esc(barCfg.placeholder || 'Mobile number') + '</label>' +
			'<input id="vy-qbar-mobile" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="' + VY.esc(barCfg.placeholder || '') + '">' +
			'<button type="submit" class="vy-qbar__go"><span class="vy-qbar__go-full">' + VY.esc(barCfg.button || 'Get my free quote') + '</span>' +
			'<span class="vy-qbar__go-short">' + VY.esc(d.compactLabel) + '</span> <span aria-hidden="true">→</span></button>' +
			'</form>' +
			'<button type="button" class="vy-qbar__close" aria-label="Hide quote bar">' + VY.icon('close') + '</button>' +
			'</div>';
		document.body.appendChild(bar);
		return bar;
	}

	VY.ready(function () {
		if (!barCfg.enabled) return;
		var mount = document.getElementById('vy-enquiry');
		if (!mount || !cfg.services || !cfg.services[mount.getAttribute('data-vy-service')]) return;
		if (VY.storage.get(CLOSED_KEY)) return;

		var bar = build(mount);
		var ready = false;
		var formInView = false;
		var hasMotion = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

		function place() {
			bar.style.top = headerBottom() + 'px';
		}

		function update() {
			var done = !!mount.querySelector('.vy-confirm');
			var show = ready && !formInView && !done;
			if (show && bar.hidden) {
				place();
				bar.hidden = false;
				// Next frame so the slide-in transition runs.
				requestAnimationFrame(function () { bar.classList.add('vy-qbar--in'); });
			} else if (!show && !bar.hidden) {
				bar.classList.remove('vy-qbar--in');
				setTimeout(function () { if (!bar.classList.contains('vy-qbar--in')) bar.hidden = true; }, hasMotion ? 250 : 0);
			}
		}

		var ticking = false;
		window.addEventListener('scroll', function () {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(function () { ticking = false; if (!bar.hidden) place(); });
		}, { passive: true });
		window.addEventListener('resize', place);

		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries) {
				formInView = entries[0].isIntersecting;
				update();
			}, { threshold: 0.12 }).observe(mount);
		}

		bar.querySelector('.vy-qbar__form').addEventListener('submit', function (e) {
			e.preventDefault();
			var mobile = bar.querySelector('#vy-qbar-mobile').value.trim();
			VY.focusEnquiry({ mobile: mobile });
		});
		bar.querySelector('.vy-qbar__close').addEventListener('click', function () {
			VY.storage.set(CLOSED_KEY, '1');
			ready = false;
			update();
		});

		setTimeout(function () { ready = true; update(); }, barCfg.delay_ms || 0);
	});
})();
