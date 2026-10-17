/**
 * Rule-based chatbot. Deterministic state machine driven by
 * VY_CONFIG.chatbot (includes/config/chatbot.php). No AI, no external
 * services: typed text is never interpreted beyond showing the fallback.
 */
(function () {
	'use strict';

	var VY = window.VY;
	var cfg = VY.config;
	var bot = cfg.chatbot || {};
	var B = bot.buttons || {};
	var SESSION_KEY = 'vy_chat_state';

	// ---------- states ----------
	function mainState() {
		var opts = Object.keys(cfg.services).map(function (key) {
			var label = key === 'other' ? (B.other || 'Other Enquiries') : cfg.services[key].label;
			return { label: label, action: { goto: 'service:' + key } };
		});
		if (cfg.engage && cfg.engage.finder && cfg.engage.finder.enabled) opts.unshift({ label: '✨ Find my perfect holiday', action: { finder: true }, primary: true });
		if (cfg.quiz && cfg.quiz.enabled) opts.splice(1, 0, { label: '🧠 Play the Travel Quiz', action: { quiz: true } });
		opts.push({ label: B.contact || 'Contact Details', action: { goto: 'contact' } });
		return { messages: [bot.greeting], options: opts };
	}

	function serviceState(key) {
		var s = cfg.services[key];
		if (!s) return null;
		var needs = (s.needs || []).length ? [bot.needs_intro + ' ' + s.needs.join(', ') + '.'] : [];
		return {
			messages: [s.chat].concat(needs),
			options: [
				{ label: B.explore || 'Explore Service', action: { explore: key } },
				{ label: B.quote || 'Request a Quote', action: { quote: key }, primary: true },
				{ label: B.main_menu || 'Back to Main Menu', action: { goto: 'main' } }
			]
		};
	}

	function contactState() {
		var c = cfg.contact || {};
		return {
			messages: [bot.contact_message, 'Phone / WhatsApp: ' + c.phone_display + (c.landline ? ' | ' + c.landline : '') + '\nEmail: ' + c.email + '\nOffice: ' + c.address],
			options: [
				{ label: 'Call ' + c.phone_display, action: { url: c.phone_href } },
				{ label: 'Contact page', action: { url: c.contact_page } },
				{ label: B.main_menu || 'Back to Main Menu', action: { goto: 'main' } }
			]
		};
	}

	function fallbackState() {
		var st = mainState();
		st.messages = [bot.fallback];
		return st;
	}

	function stateFor(id) {
		if (id === 'main') return mainState();
		if (id === 'contact') return contactState();
		if (id === 'fallback') return fallbackState();
		if (id.indexOf('service:') === 0) return serviceState(id.slice(8));
		return mainState();
	}

	// ---------- UI ----------
	var root, panel, log, launcher, input;
	var history = [];   // state ids, for Back
	var transcript = []; // { from: 'bot'|'user', text }
	var current = null;

	function save() {
		try {
			window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ history: history, transcript: transcript.slice(-40), current: current, open: VY.chatOpen }));
		} catch (e) { /* ignore */ }
	}

	function restore() {
		try {
			var s = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null');
			if (s && s.current) {
				history = s.history || [];
				transcript = s.transcript || [];
				current = s.current;
				return s;
			}
		} catch (e) { /* ignore */ }
		return null;
	}

	function build() {
		root = document.getElementById('vy-chatbot-root');
		if (!root) {
			root = document.createElement('div');
			root.id = 'vy-chatbot-root';
			document.body.appendChild(root);
		}
		root.innerHTML =
			'<button type="button" class="vy-chat-launcher" aria-expanded="false" aria-controls="vy-chat-panel">' +
			VY.icon('chat') + '<span>' + VY.esc(bot.launcher || 'Need help?') + '</span></button>' +
			'<section class="vy-chat" id="vy-chat-panel" role="dialog" aria-modal="false" aria-labelledby="vy-chat-title" hidden>' +
			'<header class="vy-chat__header">' +
			'<button type="button" class="vy-chat__icon-btn" data-chat="back" aria-label="Back">' + VY.icon('back') + '</button>' +
			'<div class="vy-chat__heading"><h2 id="vy-chat-title">' + VY.esc(bot.title) + '</h2><p>' + VY.esc(bot.subtitle) + '</p></div>' +
			'<button type="button" class="vy-chat__icon-btn" data-chat="main" aria-label="Main menu">' + VY.icon('home') + '</button>' +
			'<button type="button" class="vy-chat__icon-btn" data-chat="close" aria-label="Close chat">' + VY.icon('close') + '</button>' +
			'</header>' +
			'<div class="vy-chat__log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
			'<form class="vy-chat__input"><label class="vy-sr" for="vy-chat-text">Message</label>' +
			'<input id="vy-chat-text" type="text" autocomplete="off" maxlength="200" placeholder="' + VY.esc(bot.input_placeholder) + '">' +
			'<button type="submit" class="vy-chat__icon-btn vy-chat__send" aria-label="Send">' + VY.icon('send') + '</button></form>' +
			'</section>';

		launcher = root.querySelector('.vy-chat-launcher');
		panel = root.querySelector('.vy-chat');
		log = root.querySelector('.vy-chat__log');
		input = root.querySelector('#vy-chat-text');

		launcher.addEventListener('click', function () { VY.chatOpen ? close() : open(); });
		panel.addEventListener('click', function (e) {
			var ctl = e.target.closest('[data-chat]');
			if (ctl) {
				var what = ctl.getAttribute('data-chat');
				if (what === 'close') close();
				else if (what === 'main') go('main', B.main_menu || 'Main menu');
				else if (what === 'back') back();
				return;
			}
			var opt = e.target.closest('.vy-chat__option');
			if (opt) choose(Number(opt.getAttribute('data-index')));
		});
		panel.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { e.preventDefault(); close(); }
		});
		root.querySelector('.vy-chat__input').addEventListener('submit', function (e) {
			e.preventDefault();
			var text = input.value.trim();
			if (!text) return;
			input.value = '';
			// Typed text is never interpreted: echo it and show the fallback menu.
			addMessage('user', text);
			show('fallback', true);
		});
	}

	function addMessage(from, text) {
		transcript.push({ from: from, text: text });
		renderMessage(from, text);
	}

	function renderMessage(from, text) {
		var el = document.createElement('div');
		el.className = 'vy-msg vy-msg--' + from;
		el.innerHTML = VY.esc(text).replace(/\n/g, '<br>');
		log.appendChild(el);
	}

	function renderOptions(state) {
		var old = log.querySelector('.vy-chat__options');
		if (old) old.remove();
		var wrap = document.createElement('div');
		wrap.className = 'vy-chat__options';
		wrap.setAttribute('role', 'group');
		wrap.setAttribute('aria-label', 'Choose an option');
		wrap.innerHTML = state.options.map(function (o, i) {
			return '<button type="button" class="vy-chat__option' + (o.primary ? ' vy-chat__option--primary' : '') + '" data-index="' + i + '">' + VY.esc(o.label) + '</button>';
		}).join('');
		log.appendChild(wrap);
		log.scrollTop = log.scrollHeight;
	}

	function show(id, pushHistory) {
		var state = stateFor(id);
		if (pushHistory && current && current !== id) history.push(current);
		current = id;
		state.messages.forEach(function (m) { if (m) addMessage('bot', m); });
		renderOptions(state);
		save();
	}

	function go(id, userLabel) {
		if (userLabel) addMessage('user', userLabel);
		show(id, true);
		focusFirstOption();
	}

	function back() {
		if (!history.length) { go('main', B.main_menu); return; }
		var prev = history.pop();
		addMessage('user', B.back || 'Back');
		show(prev, false);
		focusFirstOption();
	}

	function focusFirstOption() {
		var btn = log.querySelector('.vy-chat__option');
		if (btn) btn.focus({ preventScroll: true });
	}

	function choose(index) {
		var state = stateFor(current);
		var opt = state.options[index];
		if (!opt) return;
		var a = opt.action;
		if (a.goto) return go(a.goto, opt.label);
		if (a.finder) { close(); if (VY.openFinder) VY.openFinder(); return; }
		if (a.quiz) { close(); if (VY.openQuiz) VY.openQuiz(); return; }
		addMessage('user', opt.label);
		if (a.explore || a.quote) {
			var key = a.explore || a.quote;
			var s = cfg.services[key];
			var onPage = cfg.currentService === key && document.getElementById('vy-enquiry');
			if (a.quote && onPage) {
				addMessage('bot', 'The enquiry form is on this page - I have taken you to it.');
				renderOptions(state);
				close(); // Never leave the panel over the form or its submit button.
				VY.focusEnquiry();
				return;
			}
			addMessage('bot', 'Opening ' + s.label + '…');
			VY.chatOpen = false; // Arrive on the new page with the panel closed.
			save();
			window.location.href = s.url + (a.quote ? '#vy-enquiry' : '');
			return;
		}
		if (a.url) {
			if (a.url.indexOf('tel:') !== 0) VY.chatOpen = false;
			save();
			window.location.href = a.url;
		}
	}

	function open() {
		VY.chatOpen = true;
		panel.hidden = false;
		launcher.setAttribute('aria-expanded', 'true');
		root.classList.add('vy-chat-root--open');
		if (!current) show('main', false);
		else log.scrollTop = log.scrollHeight;
		save();
		focusFirstOption();
	}

	function close() {
		VY.chatOpen = false;
		panel.hidden = true;
		launcher.setAttribute('aria-expanded', 'false');
		root.classList.remove('vy-chat-root--open');
		save();
		launcher.focus();
	}

	VY.openChat = function () { open(); };

	VY.ready(function () {
		if (!cfg.chatbotEnabled || !cfg.services) return;
		build();
		var saved = restore();
		if (saved) {
			transcript.forEach(function (m) { renderMessage(m.from, m.text); });
			renderOptions(stateFor(current));
		}
		// Close the panel while the service popup is open.
		document.addEventListener('vy:popup-open', function () { if (VY.chatOpen) close(); });
	});
})();
