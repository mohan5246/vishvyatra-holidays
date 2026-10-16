/**
 * "What are you looking for today?" service-selection dialog.
 * Opens once per browsing session on the homepage, and on demand from any
 * element with [data-vy-open-services].
 */
(function () {
	'use strict';

	var VY = window.VY;
	var cfg = VY.config;
	var popupCfg = cfg.popup || {};
	var KEY = popupCfg.storage_key || 'vy_service_popup_seen';
	var root, dialog, lastFocus, isOpen = false;

	function build() {
		if (root) return;
		root = document.getElementById('vy-popup-root');
		if (!root) {
			root = document.createElement('div');
			root.id = 'vy-popup-root';
			document.body.appendChild(root);
		}
		var services = cfg.services || {};
		var items = Object.keys(services).map(function (key) {
			var s = services[key];
			return '<li><a class="vy-option" href="' + VY.esc(s.url) + '" data-service="' + VY.esc(key) + '">' +
				'<span class="vy-option__icon">' + VY.icon(s.icon) + '</span>' +
				'<span class="vy-option__label">' + VY.esc(s.label) + '</span></a></li>';
		}).join('');

		root.innerHTML =
			'<div class="vy-modal" hidden>' +
			'<div class="vy-modal__backdrop" data-vy-close></div>' +
			'<div class="vy-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="vy-popup-title" aria-describedby="vy-popup-desc">' +
			'<button type="button" class="vy-modal__close" data-vy-close aria-label="Close and continue browsing">' + VY.icon('close') + '</button>' +
			'<h2 class="vy-modal__title" id="vy-popup-title">What are you looking for today?</h2>' +
			'<p class="vy-modal__desc" id="vy-popup-desc">Choose a service to see details and request a quote.</p>' +
			'<ul class="vy-options">' + items + '</ul>' +
			'<div class="vy-modal__footer">' +
			'<a class="vy-link" href="' + VY.esc(cfg.homeUrl + 'services/') + '">Explore all services</a>' +
			'<button type="button" class="vy-btn vy-btn--ghost" data-vy-close>Continue browsing</button>' +
			'</div></div></div>';

		dialog = root.querySelector('.vy-modal');
		root.addEventListener('click', function (e) {
			if (e.target.closest('[data-vy-close]')) close();
			var opt = e.target.closest('.vy-option, .vy-link');
			if (opt) VY.storage.set(KEY, '1');
		});
		dialog.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { e.preventDefault(); close(); return; }
			VY.trapFocus(dialog.querySelector('.vy-modal__dialog'), e);
			arrowNav(e);
		});
	}

	// Arrow keys move between service options (grid-friendly).
	function arrowNav(e) {
		if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) === -1) return;
		var opts = Array.prototype.slice.call(dialog.querySelectorAll('.vy-option'));
		var i = opts.indexOf(document.activeElement);
		if (i === -1) return;
		e.preventDefault();
		var next = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? i + 1 : i - 1;
		opts[(next + opts.length) % opts.length].focus();
	}

	function open() {
		build();
		if (isOpen) return;
		isOpen = true;
		lastFocus = document.activeElement;
		dialog.hidden = false;
		document.documentElement.classList.add('vy-scroll-lock');
		VY.storage.set(KEY, '1');
		var first = dialog.querySelector('.vy-option');
		if (first) first.focus();
		document.dispatchEvent(new CustomEvent('vy:popup-open'));
	}

	function close() {
		if (!isOpen) return;
		isOpen = false;
		dialog.hidden = true;
		document.documentElement.classList.remove('vy-scroll-lock');
		VY.storage.set(KEY, '1');
		if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
	}

	VY.openServicePopup = open;
	VY.closeServicePopup = close;

	VY.ready(function () {
		document.addEventListener('click', function (e) {
			var trigger = e.target.closest('[data-vy-open-services]');
			if (trigger) { e.preventDefault(); open(); }
		});
		if (cfg.isFrontPage && popupCfg.enabled && !VY.storage.get(KEY)) {
			setTimeout(function () {
				// Don't interrupt a visitor who has already opened another dialog / the chatbot.
				if (!document.documentElement.classList.contains('vy-scroll-lock') && !VY.chatOpen) open();
			}, popupCfg.delay_ms || 0);
		}
	});
})();
