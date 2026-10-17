/**
 * Travel quiz: 5 easy picture questions. Playable any time from any page
 * (floating quiz button, chatbot, homepage, [data-vy-open-quiz] links).
 * The quotation reward can be won in the first `rewardAttempts` rounds per
 * visitor; after that (or after winning) rounds are "practice" for fun.
 * Rounds prefer questions the visitor has not seen yet.
 */
(function () {
	'use strict';

	var VY = window.VY;
	var cfg = VY.config;
	var Q = cfg.quiz || {};
	var STATE = 'vy_quiz';            // { status: won|lost, code, percent, label, score }
	var PROGRESS = 'vy_quiz_progress'; // an unfinished quiz, so reopening resumes it
	var INVITED = 'vy_quiz_invited';   // invite already shown this visit
	var STATS = 'vy_quiz_stats';       // { plays, best, correct }
	var SEEN = 'vy_quiz_seen';         // question ids already asked

	if (!Q.enabled || !Q.pool || !Q.pool.length) return;

	var pill, invite, modal, lastFocus;

	// ---------- helpers ----------
	function shuffle(a) {
		a = a.slice();
		for (var i = a.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var t = a[i]; a[i] = a[j]; a[j] = t;
		}
		return a;
	}
	function byId(id) {
		for (var i = 0; i < Q.pool.length; i++) if (Q.pool[i].id === id) return Q.pool[i];
		return null;
	}
	function state() { return VY.local.get(STATE); }
	function stats() { return VY.local.get(STATS) || { plays: 0, best: 0, correct: 0 }; }
	/** Can the next round still earn the reward? */
	function eligible() {
		var s = state();
		if (!s) return true;
		if (s.status === 'won') return false;
		return (s.attempts || 1) < (Q.rewardAttempts || 1);
	}
	function useAttempt(score, total) {
		var s = state() || {};
		VY.local.set(STATE, { status: 'lost', attempts: (s.attempts || 0) + 1, score: score, total: total });
	}
	function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
	function img(q) { return Q.imageBase + q.image; }
	function rewardText() { return Q.rewardLabel || (Q.rewardPercent + '% off your quotation'); }

	function newProgress() {
		var n = Math.min(Q.questions, Q.pool.length);
		var seen = VY.local.get(SEEN) || [];
		var fresh = Q.pool.filter(function (q) { return seen.indexOf(q.id) === -1; });
		if (fresh.length < n) { seen = []; fresh = Q.pool.slice(); } // everything seen: start over
		var picked = shuffle(fresh).slice(0, n);
		VY.local.set(SEEN, seen.concat(picked.map(function (q) { return q.id; })));
		return {
			eligible: eligible(),
			items: picked.map(function (q) {
				return { id: q.id, order: shuffle(q.options.map(function (_, i) { return i; })) };
			}),
			index: 0,
			answers: []
		};
	}

	// ---------- floating button ----------
	function renderPill() {
		var s = state();
		if (!pill) {
			pill = document.createElement('button');
			pill.type = 'button';
			pill.className = 'vy-quiz-pill';
			pill.addEventListener('click', function () {
				hideInvite();
				VY.openQuiz();
			});
			document.body.appendChild(pill);
		}
		pill.hidden = false;
		var won = s && s.status === 'won';
		var canWin = eligible();
		pill.classList.toggle('vy-quiz-pill--play', !won && !canWin);
		pill.innerHTML = '<span class="vy-quiz-pill__gift" aria-hidden="true">' + (won || canWin ? '🎁' : '🧠') + '</span>' +
			(won ? '<span>Your ' + VY.esc(Q.rewardPercent + '% reward') + '</span>'
				: canWin ? '<span>Win ' + VY.esc(Q.rewardPercent + '% off') + '</span>' : '<span>Travel Quiz</span>');
		pill.setAttribute('aria-label', won ? 'Show my travel quiz reward and play again' : canWin ? 'Play the travel quiz to win ' + rewardText() : 'Play the travel quiz');
	}

	// ---------- invite ----------
	function showInvite() {
		var s = state();
		if (s || VY.storage.get(INVITED) || invite) return;
		if (document.documentElement.classList.contains('vy-scroll-lock') || VY.chatOpen) return;
		VY.storage.set(INVITED, '1');
		var thumbs = shuffle(Q.pool).slice(0, 3).map(function (q) {
			return '<img src="' + VY.esc(img(q)) + '" alt="">';
		}).join('');
		invite = document.createElement('div');
		invite.className = 'vy-quiz-invite';
		invite.setAttribute('role', 'region');
		invite.setAttribute('aria-label', 'Travel quiz');
		invite.innerHTML =
			'<button type="button" class="vy-quiz-invite__close" aria-label="Close">' + VY.icon('close') + '</button>' +
			'<div class="vy-quiz-invite__thumbs" aria-hidden="true">' + thumbs + '</div>' +
			'<p class="vy-quiz-invite__kicker">Travel Quiz · 1 minute</p>' +
			'<p class="vy-quiz-invite__title">Guess 5 famous places &amp; win <strong>' + VY.esc(rewardText()) + '</strong></p>' +
			'<div class="vy-quiz-invite__actions"><button type="button" class="vy-btn" data-play>Play now</button>' +
			'<button type="button" class="vy-btn vy-btn--ghost" data-later>Maybe later</button></div>';
		document.body.appendChild(invite);
		requestAnimationFrame(function () { invite.classList.add('vy-quiz-invite--in'); });
		invite.addEventListener('click', function (e) {
			if (e.target.closest('[data-play]')) { hideInvite(); openModal('quiz'); }
			else if (e.target.closest('[data-later]') || e.target.closest('.vy-quiz-invite__close')) hideInvite();
		});
	}
	function hideInvite() {
		if (!invite) return;
		var el = invite;
		invite = null;
		el.classList.remove('vy-quiz-invite--in');
		setTimeout(function () { el.remove(); }, reduceMotion() ? 0 : 300);
	}

	// ---------- modal ----------
	function openModal(view) {
		if (!modal) {
			modal = document.createElement('div');
			modal.className = 'vy-quiz';
			modal.innerHTML = '<div class="vy-quiz__backdrop" data-close></div>' +
				'<div class="vy-quiz__dialog" role="dialog" aria-modal="true" aria-labelledby="vy-quiz-title" tabindex="-1">' +
				'<button type="button" class="vy-quiz__close" data-close aria-label="Close quiz">' + VY.icon('close') + '</button>' +
				'<div class="vy-quiz__body"></div></div>';
			document.body.appendChild(modal);
			modal.addEventListener('click', function (e) {
				if (e.target.closest('[data-close]')) closeModal();
			});
			modal.addEventListener('keydown', function (e) {
				if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
				VY.trapFocus(modal.querySelector('.vy-quiz__dialog'), e);
			});
		}
		lastFocus = document.activeElement;
		modal.hidden = false;
		document.documentElement.classList.add('vy-scroll-lock');
		if (view === 'reward') renderReward(false);
		else renderQuestion();
	}
	function closeModal() {
		if (!modal || modal.hidden) return;
		modal.hidden = true;
		document.documentElement.classList.remove('vy-scroll-lock');
		stopConfetti();
		renderPill();
		if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
	}
	function body() { return modal.querySelector('.vy-quiz__body'); }
	function focusIn(sel) {
		var el = modal.querySelector(sel);
		if (el) el.focus({ preventScroll: true });
	}

	// ---------- questions ----------
	function renderQuestion() {
		var p = VY.local.get(PROGRESS);
		if (!p || !p.items || !p.items.length) { p = newProgress(); VY.local.set(PROGRESS, p); }
		if (p.index >= p.items.length) return finish(p);

		var item = p.items[p.index];
		var q = byId(item.id);
		if (!q) { VY.local.set(PROGRESS, null); return renderQuestion(); }
		var total = p.items.length;
		var dots = p.items.map(function (_, i) {
			var a = p.answers[i];
			var cls = i === p.index ? ' is-current' : (a ? (a.ok ? ' is-right' : ' is-wrong') : '');
			return '<span class="vy-quiz__dot' + cls + '"></span>';
		}).join('');

		body().innerHTML =
			'<p class="vy-quiz__kicker" id="vy-quiz-title">Travel Quiz · Question ' + (p.index + 1) + ' of ' + total +
			(p.eligible ? ' <span class="vy-quiz__mode vy-quiz__mode--prize">🎁 Reward round</span>' : ' <span class="vy-quiz__mode">Practice round</span>') + '</p>' +
			'<div class="vy-quiz__dots" aria-hidden="true">' + dots + '</div>' +
			'<figure class="vy-quiz__figure"><img src="' + VY.esc(img(q)) + '" alt="' + VY.esc(q.alt) + '"></figure>' +
			'<p class="vy-quiz__question">' + VY.esc(q.question) + '</p>' +
			'<div class="vy-quiz__options" role="group" aria-label="Answers">' +
			item.order.map(function (orig) {
				return '<button type="button" class="vy-quiz__opt" data-choice="' + orig + '">' + VY.esc(q.options[orig]) + '</button>';
			}).join('') + '</div>' +
			'<div class="vy-quiz__feedback" role="status" aria-live="polite"></div>';

		body().querySelector('.vy-quiz__options').addEventListener('click', function (e) {
			var btn = e.target.closest('.vy-quiz__opt');
			if (btn && !btn.disabled) answer(p, q, Number(btn.getAttribute('data-choice')));
		});
		focusIn('.vy-quiz__opt');
	}

	function answer(p, q, choice) {
		var ok = choice === q.answer;
		p.answers[p.index] = { id: q.id, choice: choice, ok: ok };
		p.index++;
		VY.local.set(PROGRESS, p);
		// In a reward round, the first wrong answer uses up that attempt.
		var correct = p.answers.filter(function (a) { return a && a.ok; }).length;
		if (!ok && p.eligible && !p.counted) { p.counted = true; VY.local.set(PROGRESS, p); useAttempt(correct, p.items.length); }

		Array.prototype.forEach.call(body().querySelectorAll('.vy-quiz__opt'), function (b) {
			var c = Number(b.getAttribute('data-choice'));
			b.disabled = true;
			if (c === q.answer) b.classList.add('is-right');
			else if (c === choice) b.classList.add('is-wrong');
		});
		var dot = body().querySelectorAll('.vy-quiz__dot')[p.index - 1];
		if (dot) { dot.classList.remove('is-current'); dot.classList.add(ok ? 'is-right' : 'is-wrong'); }

		var last = p.index >= p.items.length;
		body().querySelector('.vy-quiz__feedback').innerHTML =
			'<p class="vy-quiz__verdict ' + (ok ? 'is-right' : 'is-wrong') + '">' +
			(ok ? '✓ Correct!' : '✗ Not quite - it\'s ' + VY.esc(q.options[q.answer]) + '.') + '</p>' +
			'<p class="vy-quiz__fact">' + VY.esc(q.fact || '') + '</p>' +
			'<button type="button" class="vy-btn" data-next>' + (last ? 'See my result' : 'Next question') + ' →</button>';
		body().querySelector('[data-next]').addEventListener('click', renderQuestion);
		focusIn('[data-next]');
	}

	function finish(p) {
		var correct = p.answers.filter(function (a) { return a && a.ok; }).length;
		var total = p.items.length;
		if (!p.recorded) {
			p.recorded = true;
			var st = stats();
			VY.local.set(STATS, { plays: st.plays + 1, best: Math.max(st.best, correct), correct: st.correct + correct });
			VY.local.set(PROGRESS, p);
		}
		if (!p.eligible || correct < Q.requiredCorrect) {
			if (p.eligible && !p.counted) useAttempt(correct, total);
			VY.local.set(PROGRESS, null);
			return renderResult(correct, total, p.eligible);
		}
		body().innerHTML = '<p class="vy-quiz__kicker" id="vy-quiz-title">All ' + total + ' correct!</p><p class="vy-quiz__question">Unlocking your reward…</p>';
		claim(p.answers).then(function (code) {
			VY.local.set(STATE, { status: 'won', code: code, percent: Q.rewardPercent, label: rewardText(), score: correct, total: total });
			VY.local.set(PROGRESS, null);
			document.dispatchEvent(new CustomEvent('vy:quiz-won'));
			renderReward(true);
		}, function () {
			body().innerHTML = '<p class="vy-quiz__kicker" id="vy-quiz-title">All ' + total + ' correct!</p>' +
				'<p class="vy-quiz__question">We could not create your reward code just now.</p>' +
				'<button type="button" class="vy-btn" data-retry>Try again</button>';
			body().querySelector('[data-retry]').addEventListener('click', function () { finish(p); });
			focusIn('[data-retry]');
		});
	}

	function claim(answers) {
		if (!Q.claimUrl) {
			// Static test copy: no server, so make a clearly-marked demo code.
			return Promise.resolve('DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase());
		}
		return fetch(Q.claimUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify({ answers: answers.map(function (a) { return { id: a.id, choice: a.choice }; }) })
		}).then(function (r) { return r.json(); }).then(function (d) {
			if (d && d.won && d.code) return d.code;
			throw new Error('not won');
		});
	}

	// ---------- results ----------
	function renderReward(celebrate) {
		var s = state();
		var hasForm = !!document.getElementById('vy-enquiry');
		body().innerHTML =
			'<div class="vy-quiz__win">' +
			'<div class="vy-quiz__stamp' + (celebrate ? ' is-new' : '') + '" aria-hidden="true"><span class="vy-quiz__stamp-big">' + VY.esc(Q.rewardPercent + '%') + '</span><span>OFF</span></div>' +
			'<p class="vy-quiz__kicker" id="vy-quiz-title">' + (celebrate ? 'Congratulations - 5 out of 5!' : 'Your travel quiz reward') + '</p>' +
			'<p class="vy-quiz__question">You\'ve unlocked <strong>' + VY.esc(rewardText()) + '</strong></p>' +
			'<div class="vy-quiz__code"><span>Your code</span><code>' + VY.esc(s.code) + '</code>' +
			'<button type="button" class="vy-btn vy-btn--outline" data-copy>Copy</button></div>' +
			'<p class="vy-quiz__hint">It is added to your enquiry automatically - just request a quote on any page.</p>' +
			'<button type="button" class="vy-btn vy-btn--lg" data-use>' + (hasForm ? 'Use it - get my quote' : 'Choose a service') + ' →</button>' +
			'<button type="button" class="vy-btn vy-btn--ghost vy-quiz__again" data-again>🧠 Play again just for fun</button>' +
			scoreboard() +
			'<p class="vy-quiz__terms">' + VY.esc(Q.terms || '') + '</p></div>';
		body().querySelector('[data-copy]').addEventListener('click', function (e) {
			var btn = e.currentTarget;
			var done = function () { btn.textContent = 'Copied ✓'; };
			if (navigator.clipboard) navigator.clipboard.writeText(s.code).then(done, done); else done();
		});
		body().querySelector('[data-use]').addEventListener('click', function () {
			closeModal();
			if (hasForm) VY.focusEnquiry();
			else if (VY.openServicePopup) VY.openServicePopup();
		});
		body().querySelector('[data-again]').addEventListener('click', playAgain);
		focusIn('[data-use]');
		if (celebrate && !reduceMotion()) confetti();
	}

	function scoreboard() {
		var st = stats();
		if (!st.plays) return '';
		return '<p class="vy-quiz__board"><span>🎮 ' + st.plays + ' game' + (st.plays > 1 ? 's' : '') + '</span><span>🏆 Best ' + st.best + '/' + Math.min(Q.questions, Q.pool.length) +
			'</span><span>✅ ' + st.correct + ' right answers</span></p>';
	}

	function playAgain() {
		VY.local.set(PROGRESS, null);
		renderQuestion();
	}

	function renderResult(correct, total, wasRewardRound) {
		var hasForm = !!document.getElementById('vy-enquiry');
		var s = state();
		var cheer = correct === total ? 'Perfect score! 🌟' : correct >= total - 1 ? 'So close, globetrotter! ✈️' : correct >= 3 ? 'Nice going, traveller! 🌍' : 'Every trip starts somewhere! 🧭';
		var note = wasRewardRound
			? 'The reward needs all ' + total + ' right - but our team still finds you the best price on every trip. Keep playing for fun!'
			: (s && s.status === 'won' ? 'Your ' + VY.esc(rewardText()) + ' is safe - code <code>' + VY.esc(s.code) + '</code>.' : 'Practice rounds are just for fun. Can you beat your best score?');
		body().innerHTML =
			'<p class="vy-quiz__kicker" id="vy-quiz-title">' + (wasRewardRound ? 'Reward round' : 'Practice round') + ' · You got ' + correct + ' out of ' + total + '</p>' +
			'<p class="vy-quiz__question">' + cheer + '</p>' +
			'<p class="vy-quiz__hint">' + note + '</p>' +
			scoreboard() +
			'<button type="button" class="vy-btn vy-btn--lg" data-again>🧠 Play again</button>' +
			'<button type="button" class="vy-btn vy-btn--ghost vy-quiz__again" data-use>' + (hasForm ? 'Get my quote' : 'Choose a service') + ' →</button>';
		body().querySelector('[data-again]').addEventListener('click', playAgain);
		body().querySelector('[data-use]').addEventListener('click', function () {
			closeModal();
			if (hasForm) VY.focusEnquiry();
			else if (VY.openServicePopup) VY.openServicePopup();
		});
		focusIn('[data-again]');
		if (correct === total && !reduceMotion()) confetti();
	}

	// ---------- confetti (no library) ----------
	var confettiRaf = null, confettiCanvas = null;
	function confetti() {
		stopConfetti();
		var c = confettiCanvas = document.createElement('canvas');
		c.className = 'vy-confetti';
		c.setAttribute('aria-hidden', 'true');
		document.body.appendChild(c);
		var ctx = c.getContext('2d');
		var dpr = window.devicePixelRatio || 1;
		var W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr;
		var colors = ['#d2170f', '#1d355f', '#7ebec5', '#f5b400', '#ffffff', '#e6332a'];
		var parts = [];
		for (var i = 0; i < 180; i++) {
			var fromLeft = i % 2 === 0;
			parts.push({
				x: fromLeft ? 0 : W, y: H * 0.65,
				vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 10) * dpr,
				vy: -(10 + Math.random() * 14) * dpr,
				w: (6 + Math.random() * 6) * dpr, h: (8 + Math.random() * 8) * dpr,
				r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
				c: colors[i % colors.length]
			});
		}
		var start = performance.now();
		(function frame(t) {
			ctx.clearRect(0, 0, W, H);
			parts.forEach(function (p) {
				p.vy += 0.35 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
				ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
				ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
				ctx.restore();
			});
			if (t - start < 4000) confettiRaf = requestAnimationFrame(frame);
			else stopConfetti();
		})(start);
	}
	function stopConfetti() {
		if (confettiRaf) cancelAnimationFrame(confettiRaf);
		confettiRaf = null;
		if (confettiCanvas) confettiCanvas.remove();
		confettiCanvas = null;
	}

	// ---------- boot ----------
	VY.openQuiz = function () { hideInvite(); openModal(state() && state().status === 'won' && !VY.local.get(PROGRESS) ? 'reward' : 'quiz'); };
	document.addEventListener('click', function (e) {
		if (e.target.closest('[data-vy-open-quiz]')) { e.preventDefault(); if (VY.closeServicePopup) VY.closeServicePopup(); VY.openQuiz(); }
	});

	VY.ready(function () {
		renderPill();
		var s = state();
		if (s) return;
		var later = function () { setTimeout(showInvite, Q.inviteDelay || 0); };
		if (cfg.isFrontPage && cfg.popup && cfg.popup.enabled) {
			// On the homepage, wait for the service popup to be closed first.
			document.addEventListener('vy:popup-close', function () { setTimeout(showInvite, 1500); }, { once: true });
			setTimeout(function () { if (!document.documentElement.classList.contains('vy-scroll-lock')) later(); }, 2500);
		} else {
			later();
		}
	});
})();
