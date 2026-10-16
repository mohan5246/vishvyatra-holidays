/**
 * VishvYatra enhancements - shared helpers (namespace, icons, DOM utils).
 * Config is provided by WordPress as window.VY_CONFIG.
 */
(function () {
	'use strict';

	var VY = (window.VY = window.VY || {});
	VY.config = window.VY_CONFIG || {};

	// Simple line icons (inline SVG, inherit currentColor).
	var ICONS = {
		globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
		map: '<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"/><path d="M9 4v13M15 6.5v13"/>',
		stamp: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/>',
		plane: '<path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16.5 6a2 2 0 0 1 3 3l-4.5 4.5 1 7.5L14.5 22.5 12 15l-3 3v2.5L7.5 22 6 18l-4-1.5L3.5 15H6l3-3"/>',
		car: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="16" r="1.5"/><circle cx="16.5" cy="16" r="1.5"/><path d="M5 11h14"/>',
		bed: '<path d="M3 18V6M21 18v-5a3 3 0 0 0-3-3h-8v8"/><path d="M3 14h18"/><circle cx="6.5" cy="10.5" r="1.8"/>',
		passport: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="10" r="3.5"/><path d="M8.5 10h7M12 6.5c1 1 1.4 2.2 1.4 3.5S13 12.5 12 13.5M12 6.5c-1 1-1.4 2.2-1.4 3.5s.4 2.5 1.4 3.5M9 17.5h6"/>',
		chat: '<path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9.5h8M8 12.5h5"/>',
		close: '<path d="M6 6l12 12M18 6 6 18"/>',
		back: '<path d="M15 5l-7 7 7 7"/>',
		home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
		send: '<path d="M4 12 20 4l-6 16-3-7-7-1z"/>'
	};

	VY.icon = function (name, cls) {
		var path = ICONS[name] || ICONS.chat;
		return '<svg class="' + (cls || 'vy-svg') + '" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + path + '</svg>';
	};

	VY.esc = function (s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	};

	VY.formatINR = function (n) {
		var s = String(Math.round(Number(n) || 0));
		if (s.length <= 3) return '₹' + s;
		var last3 = s.slice(-3);
		var rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
		return '₹' + rest + ',' + last3;
	};

	VY.uuid = function () {
		if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = (Math.random() * 16) | 0;
			return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
		});
	};

	VY.storage = {
		get: function (key) {
			try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
		},
		set: function (key, value) {
			try { window.sessionStorage.setItem(key, value); } catch (e) { /* private mode: ignore */ }
		}
	};

	// Elements that can take focus, for focus trapping in dialogs.
	VY.focusable = function (root) {
		return Array.prototype.filter.call(
			root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
			function (el) { return el.offsetParent !== null || el === document.activeElement; }
		);
	};

	VY.trapFocus = function (root, event) {
		if (event.key !== 'Tab') return;
		var items = VY.focusable(root);
		if (!items.length) return;
		var first = items[0];
		var last = items[items.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};

	VY.ready = function (fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	};

	// Fill server-rendered icon placeholders.
	VY.ready(function () {
		Array.prototype.forEach.call(document.querySelectorAll('[data-vy-icon]'), function (el) {
			el.innerHTML = VY.icon(el.getAttribute('data-vy-icon'));
		});
	});
})();
