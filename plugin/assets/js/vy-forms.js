/**
 * Service enquiry forms, rendered from the shared schema in VY_CONFIG.forms.
 * The same rules are enforced again on the server (class-vy-validator.php).
 */
(function () {
	'use strict';

	var VY = window.VY;
	var cfg = VY.config;
	var OTHER = '__other';

	// ---------- helpers ----------
	function fieldOptions(field, ctx) {
		var o = field.options;
		if (!o) return [];
		if (Array.isArray(o)) return o;
		if (o.source === 'destinations') {
			var groups = (cfg.destinations || {})[ctx.tourType] || {};
			return Object.keys(groups).map(function (g) { return { group: g, options: groups[g] }; });
		}
		if (o.source === 'visa_countries') return cfg.visa.countries;
		if (o.source === 'visa_categories') return cfg.visa.categories;
		return [];
	}

	function optionTags(list, selected) {
		return list.map(function (opt) {
			if (opt && opt.group) {
				return '<optgroup label="' + VY.esc(opt.group) + '">' + optionTags(opt.options, selected) + '</optgroup>';
			}
			return '<option value="' + VY.esc(opt) + '"' + (opt === selected ? ' selected' : '') + '>' + VY.esc(opt) + '</option>';
		}).join('');
	}

	function inputType(t) {
		return t === 'tel' ? 'tel' : t;
	}

	function validPhone(v) {
		if (!/^\+?[0-9\s\-()]+$/.test(v)) return false;
		var d = v.replace(/\D/g, '');
		return d.length >= 10 && d.length <= 15;
	}

	function validEmail(v) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
	}

	function validDate(v, type) {
		var re = type === 'date' ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
		if (!re.test(v)) return false;
		var d = new Date(v.slice(0, 10) + 'T00:00:00Z');
		return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v.slice(0, 10);
	}

	function parseJSON(s) {
		if (!s) return null;
		try { return JSON.parse(s); } catch (e) { return null; }
	}

	// ---------- form controller ----------
	function EnquiryForm(mount) {
		this.mount = mount;
		this.body = mount.querySelector('.vy-enquiry__body');
		this.serviceKey = mount.getAttribute('data-vy-service');
		this.service = cfg.services[this.serviceKey];
		this.formKey = mount.getAttribute('data-vy-form');
		this.schema = cfg.forms[this.formKey];
		this.ctx = { tourType: this.service.tour_type };
		// Values worked out from the page (e.g. a package's destination and days).
		this.prefill = parseJSON(mount.getAttribute('data-vy-prefill')) || {};
		this.context = parseJSON(mount.getAttribute('data-vy-context'));
		this.touched = {};
		this.busy = false;
		this.render();
	}

	EnquiryForm.prototype.id = function (name) {
		return 'vy-' + this.serviceKey + '-' + name;
	};

	EnquiryForm.prototype.render = function () {
		var self = this;
		this.idempotencyKey = VY.uuid();
		var html = '<form class="vy-form" novalidate>';
		html += '<div class="vy-form__summary" role="alert" tabindex="-1" hidden></div>';
		if (this.service.tour_type) {
			html += '<p class="vy-form__type">Tour type: <strong>' + (this.service.tour_type === 'international' ? 'International' : 'Domestic') + '</strong></p>';
		}
		if (this.context && this.context.title) {
			html += '<p class="vy-form__context">' + (this.context.kind === 'package' ? 'Package' : 'Enquiring from') + ': <strong>' + VY.esc(this.context.title) + '</strong>' +
				(this.context.details ? ' <span>· ' + VY.esc(this.context.details) + '</span>' : '') + '</p>';
		}
		html += this.rewardHtml();
		html += '<p class="vy-form__legend"><span class="vy-req" aria-hidden="true">*</span> Required fields</p>';
		html += '<div class="vy-form__grid">';
		this.schema.fields.forEach(function (f) { html += self.fieldHtml(f); });
		html += '</div>';
		html += '<div class="vy-hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
		html += '<div class="vy-form__footer"><button type="submit" class="vy-btn vy-btn--lg">' + VY.esc(this.schema.submit) + '</button>';
		html += '<p class="vy-hint">We use these details only to respond to your enquiry. No payment is collected online.</p></div>';
		html += '</form>';
		this.body.innerHTML = html;
		this.form = this.body.querySelector('form');
		this.summary = this.body.querySelector('.vy-form__summary');
		this.bind();
		this.applyVisibility();
	};

	EnquiryForm.prototype.rewardHtml = function () {
		var r = VY.quizReward();
		if (!r) return '';
		return '<p class="vy-form__reward"><span aria-hidden="true">🎁</span> Quiz reward applied: <strong>' + VY.esc(r.label || (r.percent + '% off your quotation')) +
			'</strong> · code <code>' + VY.esc(r.code) + '</code></p>';
	};

	EnquiryForm.prototype.fieldHtml = function (f) {
		var id = this.id(f.name);
		var req = !!f.required;
		var width = f.width === 'full' ? ' vy-field--full' : (f.width === 'third' ? ' vy-field--third' : '');
		var star = req ? ' <span class="vy-req" aria-hidden="true">*</span>' : '';
		var help = f.help ? '<span class="vy-help" id="' + id + '-help">' + VY.esc(f.help) + '</span>' : '';
		var describedBy = (f.help ? id + '-help ' : '') + id + '-err';
		var common = ' id="' + id + '" name="' + f.name + '" aria-describedby="' + describedBy + '"' + (req ? ' required aria-required="true"' : '');
		var def = this.prefill[f.name] != null ? this.prefill[f.name] : (f['default'] != null ? f['default'] : '');
		var control = '';
		var other = '';

		if (f.type === 'hidden') {
			var hv = f.name === 'tour_type' ? this.service.tour_type : def;
			return '<input type="hidden" name="' + f.name + '" value="' + VY.esc(hv) + '">';
		}

		if (f.type === 'select') {
			var opts = fieldOptions(f, this.ctx);
			control = '<select' + common + '><option value="">Select…</option>' + optionTags(opts, def) +
				(f.other ? '<option value="' + OTHER + '"' + (def === OTHER ? ' selected' : '') + '>Other</option>' : '') + '</select>';
		} else if (f.type === 'radio') {
			var self = this;
			var ropts = fieldOptions(f, this.ctx).slice();
			if (f.other) ropts.push(OTHER);
			var radios = ropts.map(function (opt, i) {
				var rid = id + '-' + i;
				return '<label class="vy-choice" for="' + rid + '"><input type="radio" id="' + rid + '" name="' + f.name + '" value="' + VY.esc(opt) + '"' +
					(opt === def ? ' checked' : '') + (req && i === 0 ? ' required' : '') + '> <span>' + VY.esc(opt === OTHER ? 'Other' : opt) + '</span></label>';
			}).join('');
			if (f.other) other = self.otherHtml(f);
			return '<fieldset class="vy-field' + width + '" data-field="' + f.name + '" aria-describedby="' + describedBy + '"><legend class="vy-label">' + VY.esc(f.label) + star + '</legend>' +
				'<div class="vy-choices">' + radios + '</div>' + help + '<p class="vy-error" id="' + id + '-err"></p></fieldset>' + other;
		} else if (f.type === 'textarea') {
			control = '<textarea' + common + ' rows="4"' + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + '></textarea>';
		} else {
			var attrs = '';
			if (f.type === 'number') {
				attrs += ' inputmode="numeric"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + (f.integer ? ' step="1"' : '');
			}
			if (f.min_today && f.type === 'date') attrs += ' min="' + cfg.today + '"';
			if (f.min_today && f.type === 'datetime-local') attrs += ' min="' + cfg.today + 'T00:00"';
			if (f.maxlength) attrs += ' maxlength="' + f.maxlength + '"';
			if (f.placeholder) attrs += ' placeholder="' + VY.esc(f.placeholder) + '"';
			if (f.autocomplete) attrs += ' autocomplete="' + f.autocomplete + '"';
			if (f.type === 'tel') attrs += ' inputmode="tel"';
			control = '<input type="' + inputType(f.type) + '"' + common + attrs + ' value="' + VY.esc(def) + '">';
			if (f.prefix) control = '<span class="vy-input-prefix"><span aria-hidden="true">' + VY.esc(f.prefix) + '</span>' + control + '</span>';
		}
		if (f.other) other = this.otherHtml(f);

		return '<div class="vy-field' + width + '" data-field="' + f.name + '"><label class="vy-label" for="' + id + '">' + VY.esc(f.label) + star + '</label>' +
			control + help + '<p class="vy-error" id="' + id + '-err"></p></div>' + other;
	};

	EnquiryForm.prototype.otherHtml = function (f) {
		var id = this.id(f.name + '_other');
		return '<div class="vy-field" data-field="' + f.name + '_other" data-other-of="' + f.name + '" hidden>' +
			'<label class="vy-label" for="' + id + '">Please specify <span class="vy-req" aria-hidden="true">*</span></label>' +
			'<input type="text" id="' + id + '" name="' + f.name + '_other" maxlength="100" aria-describedby="' + id + '-err" aria-required="true" value="' + VY.esc(this.prefill[f.name + '_other'] || '') + '">' +
			'<p class="vy-error" id="' + id + '-err"></p></div>';
	};

	EnquiryForm.prototype.bind = function () {
		var self = this;
		this.form.addEventListener('input', function (e) { self.onChange(e); });
		this.form.addEventListener('change', function (e) { self.onChange(e); });
		this.form.addEventListener('focusout', function (e) {
			if (!e.target.name) return;
			self.touched[e.target.name] = true;
			self.validateField(e.target.name, true);
		});
		this.form.addEventListener('submit', function (e) {
			e.preventDefault();
			self.submit();
		});
	};

	EnquiryForm.prototype.onChange = function (e) {
		this.applyVisibility();
		var name = e.target.name;
		if (name === 'departure_date' || name === 'checkin' || name === 'pickup_at') this.syncMinDates();
		if (this.formKey === 'visa' && (name === 'country' || name === 'visa_category')) this.updateVisaAmount();
		if (this.touched[name]) this.validateField(name, true);
	};

	EnquiryForm.prototype.syncMinDates = function () {
		var pairs = { departure_date: 'return_date', checkin: 'checkout', pickup_at: 'return_at' };
		var vals = this.values();
		Object.keys(pairs).forEach(function (a) {
			var el = this.form.elements[pairs[a]];
			if (el && vals[a]) el.min = vals[a];
		}, this);
	};

	EnquiryForm.prototype.updateVisaAmount = function () {
		var vals = this.values();
		var p = cfg.visa.pricing;
		var amount = (p.by_country && p.by_country[vals.country]) || (p.by_category && p.by_category[vals.visa_category]) || p['default'];
		Array.prototype.forEach.call(document.querySelectorAll('[data-vy-visa-amount]'), function (el) {
			el.textContent = VY.formatINR(amount);
		});
	};

	/** Raw values of all controls (radio groups resolved). */
	EnquiryForm.prototype.values = function () {
		var out = {};
		var els = this.form.elements;
		for (var i = 0; i < els.length; i++) {
			var el = els[i];
			if (!el.name || el.name === 'website') continue;
			if (el.type === 'radio') {
				if (el.checked) out[el.name] = el.value;
				else if (!(el.name in out)) out[el.name] = '';
			} else {
				out[el.name] = String(el.value).trim();
			}
		}
		return out;
	};

	EnquiryForm.prototype.fieldDef = function (name) {
		for (var i = 0; i < this.schema.fields.length; i++) if (this.schema.fields[i].name === name) return this.schema.fields[i];
		return null;
	};

	EnquiryForm.prototype.isVisible = function (f, vals) {
		return !f.show_if || vals[f.show_if[0]] === f.show_if[1];
	};

	EnquiryForm.prototype.applyVisibility = function () {
		var vals = this.values();
		var self = this;
		this.schema.fields.forEach(function (f) {
			var wrap = self.form.querySelector('[data-field="' + f.name + '"]');
			if (wrap && f.show_if) {
				var show = self.isVisible(f, vals);
				wrap.hidden = !show;
				if (!show) self.setError(f.name, '');
			}
			if (f.other) {
				var ow = self.form.querySelector('[data-other-of="' + f.name + '"]');
				var showOther = vals[f.name] === OTHER && self.isVisible(f, vals);
				if (ow) {
					ow.hidden = !showOther;
					if (!showOther) self.setError(f.name + '_other', '');
				}
			}
		});
	};

	/** Returns { errors: {name: message}, values: cleaned } using the shared schema rules. */
	EnquiryForm.prototype.check = function () {
		var vals = this.values();
		var errors = {};
		var clean = {};
		var self = this;

		this.schema.fields.forEach(function (f) {
			if (!self.isVisible(f, vals)) return;
			var v = vals[f.name] == null ? '' : vals[f.name];
			var required = f.required || (f.required_if && vals[f.required_if[0]] === f.required_if[1]);
			if (v === '') {
				if (required) errors[f.name] = (f.type === 'select' || f.type === 'radio') ? 'Please choose an option.' : 'This field is required.';
				return;
			}
			var err = self.checkValue(f, v);
			if (err) { errors[f.name] = err; return; }
			if (f.other && v === OTHER && !vals[f.name + '_other']) { errors[f.name + '_other'] = 'Please specify.'; return; }
			clean[f.name] = f.type === 'number' ? Number(v) : v;
		});

		(this.schema.rules || []).forEach(function (r) {
			if (errors[r.target]) return;
			var ok = true;
			if (r.rule === 'sum_min') {
				ok = r.fields.reduce(function (s, n) { return s + (Number(clean[n]) || 0); }, 0) >= r.min;
			} else if (r.rule === 'lte') {
				ok = clean[r.a] == null || clean[r.b] == null || clean[r.a] <= clean[r.b];
			} else if (r.rule === 'date_gte' || r.rule === 'date_gt') {
				if (clean[r.a] && clean[r.b]) ok = r.rule === 'date_gte' ? clean[r.a] >= clean[r.b] : clean[r.a] > clean[r.b];
			} else if (r.rule === 'required_if') {
				ok = clean[r.when] !== r.equals || !!clean[r.field];
			}
			if (!ok) errors[r.target] = r.message;
		});

		return { errors: errors, values: vals };
	};

	EnquiryForm.prototype.checkValue = function (f, v) {
		var max = f.maxlength || 500;
		if (v.length > max) return 'Please keep this under ' + max + ' characters.';
		switch (f.type) {
			case 'email': return validEmail(v) ? '' : 'Please enter a valid email address.';
			case 'tel': return validPhone(v) ? '' : 'Please enter a valid mobile number (10 to 15 digits).';
			case 'number':
				if (!/^-?\d+(\.\d+)?$/.test(v)) return 'Please enter a number.';
				var n = Number(v);
				if (f.integer && Math.floor(n) !== n) return 'Please enter a whole number.';
				if (f.min != null && n < f.min) return 'Must be ' + f.min + ' or more.';
				if (f.max != null && n > f.max) return 'Must be ' + f.max + ' or less.';
				return '';
			case 'date':
			case 'datetime-local':
				if (!validDate(v, f.type)) return 'Please enter a valid date.';
				if (f.min_today && v.slice(0, 10) < cfg.today) return 'Date cannot be in the past.';
				return '';
		}
		return '';
	};

	EnquiryForm.prototype.validateField = function (name, live) {
		var result = this.check();
		var base = name.replace(/_other$/, '');
		var related = [name, base, base + '_other'];
		// Cross-field rules: re-check the rule target when one of its inputs changes.
		(this.schema.rules || []).forEach(function (r) {
			var inputs = r.fields || [r.a, r.b, r.field, r.when];
			if (inputs.indexOf(name) !== -1) related.push(r.target);
		});
		var self = this;
		related.forEach(function (n) {
			if (live && !self.touched[n] && n !== name) return;
			self.setError(n, result.errors[n] || '');
		});
	};

	EnquiryForm.prototype.setError = function (name, message) {
		var wrap = this.form.querySelector('[data-field="' + name + '"]');
		if (!wrap) return;
		var err = wrap.querySelector('.vy-error');
		if (err) err.textContent = message;
		wrap.classList.toggle('vy-field--invalid', !!message);
		Array.prototype.forEach.call(wrap.querySelectorAll('input, select, textarea'), function (el) {
			if (message) el.setAttribute('aria-invalid', 'true');
			else el.removeAttribute('aria-invalid');
		});
	};

	EnquiryForm.prototype.showErrors = function (errors) {
		var self = this;
		var names = Object.keys(errors);
		this.form.querySelectorAll('[data-field]').forEach(function (w) { self.setError(w.getAttribute('data-field'), ''); });
		names.forEach(function (n) { self.touched[n] = true; self.setError(n, errors[n]); });
		if (names.length) {
			this.summary.hidden = false;
			this.summary.textContent = names.length === 1 ? 'Please correct the highlighted field.' : 'Please correct the ' + names.length + ' highlighted fields.';
			var first = this.form.querySelector('.vy-field--invalid input, .vy-field--invalid select, .vy-field--invalid textarea');
			if (first) first.focus();
		}
	};

	EnquiryForm.prototype.setBusy = function (busy) {
		this.busy = busy;
		var btn = this.form.querySelector('button[type="submit"]');
		btn.disabled = busy;
		btn.setAttribute('aria-busy', busy ? 'true' : 'false');
		btn.textContent = busy ? 'Sending…' : this.schema.submit;
	};

	EnquiryForm.prototype.submit = function () {
		if (this.busy) return; // Ignore repeated clicks while a request is in flight.
		this.summary.hidden = true;
		var result = this.check();
		if (Object.keys(result.errors).length) {
			this.showErrors(result.errors);
			return;
		}

		var self = this;
		this.setBusy(true);

		// Static demo copy (no WordPress server): validate only, send nothing.
		if (!cfg.restUrl) {
			var ref = 'DEMO-' + cfg.today.replace(/-/g, '').slice(2) + '-' + this.idempotencyKey.slice(0, 5).toUpperCase();
			setTimeout(function () {
				self.success({
					status: 'prepared',
					reference: ref,
					message: 'Test copy: your enquiry passed all checks and was prepared, but it has NOT been sent to VishvYatra Holidays. On the live site it will be recorded for the team.'
				});
			}, 400);
			return;
		}

		var body = {
			service: this.serviceKey,
			request_type: this.formKey === 'visa' ? 'special_price' : 'quote',
			fields: result.values,
			source_page: window.location.href.split('#')[0],
			idempotency_key: this.idempotencyKey,
			context: this.context || undefined,
			reward_code: VY.quizReward() ? VY.quizReward().code : undefined,
			website: this.form.elements.website.value
		};

		fetch(cfg.restUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(body)
		})
			.then(function (res) {
				return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data }; });
			})
			.then(function (r) {
				if (r.status === 200) {
					self.success(r.data);
				} else if (r.status === 422 && r.data.errors) {
					self.setBusy(false);
					self.showErrors(r.data.errors);
				} else {
					self.setBusy(false);
					self.fail(r.data.message);
				}
			})
			.catch(function () {
				self.setBusy(false);
				self.fail();
			});
	};

	EnquiryForm.prototype.fail = function (message) {
		this.summary.hidden = false;
		this.summary.textContent = message || ('We could not send your enquiry. Your details are still in the form - please try again, or call us on ' + cfg.contact.phone_display + '.');
		this.summary.focus();
	};

	EnquiryForm.prototype.success = function (data) {
		var self = this;
		var prepared = data.status !== 'recorded';
		this.body.innerHTML =
			'<div class="vy-confirm' + (prepared ? ' vy-confirm--pending' : '') + '" role="status" tabindex="-1">' +
			'<h3 class="vy-confirm__title">' + (prepared ? 'Enquiry prepared' : 'Enquiry received') + '</h3>' +
			'<p>' + VY.esc(data.message) + '</p>' +
			(data.reference ? '<p class="vy-confirm__ref">Reference: <strong>' + VY.esc(data.reference) + '</strong></p>' : '') +
			'<button type="button" class="vy-btn vy-btn--outline">Send another enquiry</button></div>';
		var box = this.body.querySelector('.vy-confirm');
		box.focus();
		box.querySelector('button').addEventListener('click', function () {
			self.touched = {};
			self.render();
			self.focusFirst();
		});
	};

	EnquiryForm.prototype.focusFirst = function () {
		var el = this.form && this.form.querySelector('input:not([type="hidden"]), select, textarea');
		if (el) el.focus({ preventScroll: true });
	};

	// ---------- boot ----------
	VY.forms = [];

	/**
	 * Scrolls to the page's enquiry form, briefly highlights it and focuses
	 * the first empty required field. opts.mobile pre-fills the mobile number
	 * (from the Smart Quote Bar).
	 */
	VY.focusEnquiry = function (opts) {
		opts = opts || {};
		var mount = document.getElementById('vy-enquiry');
		if (!mount) return false;
		var form = VY.forms[0];
		if (form && form.form && opts.mobile && form.form.elements.mobile) {
			form.form.elements.mobile.value = opts.mobile;
			form.touched.mobile = true;
			form.validateField('mobile', true);
		}
		var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		mount.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		mount.classList.remove('vy-enquiry--glow');
		void mount.offsetWidth; // restart the animation
		mount.classList.add('vy-enquiry--glow');
		if (form) setTimeout(function () { form.focusFirstEmpty(); }, reduce ? 0 : 450);
		return true;
	};

	EnquiryForm.prototype.focusFirstEmpty = function () {
		if (!this.form) return;
		var vals = this.values();
		var self = this;
		var target = null;
		this.schema.fields.some(function (f) {
			if (f.type === 'hidden' || !f.required || !self.isVisible(f, vals) || vals[f.name]) return false;
			target = self.form.querySelector('[name="' + f.name + '"]');
			return !!target;
		});
		(target || this.form.querySelector('input:not([type="hidden"]), select, textarea')).focus({ preventScroll: true });
	};

	VY.ready(function () {
		Array.prototype.forEach.call(document.querySelectorAll('.vy-enquiry[data-vy-form]'), function (mount) {
			if (cfg.forms && cfg.forms[mount.getAttribute('data-vy-form')] && cfg.services[mount.getAttribute('data-vy-service')]) {
				VY.forms.push(new EnquiryForm(mount));
			}
		});

		Array.prototype.forEach.call(document.querySelectorAll('a[href="#vy-enquiry"]'), function (a) {
			a.addEventListener('click', function (e) {
				if (VY.focusEnquiry()) e.preventDefault();
			});
		});

		Array.prototype.forEach.call(document.querySelectorAll('[data-vy-download-checklist]'), function (btn) {
			btn.addEventListener('click', function () {
				var status = btn.parentNode.parentNode.querySelector('[data-vy-checklist-status]');
				var form = VY.forms.filter(function (f) { return f.formKey === 'visa'; })[0];
				var country = '';
				if (form) {
					var v = form.values();
					country = v.country === OTHER ? '' : (v.country || '');
				}
				try {
					var name = VY.downloadVisaChecklist(country);
					if (status) status.textContent = 'Downloaded ' + name + '.';
				} catch (err) {
					if (status) status.textContent = 'Sorry, the checklist could not be generated in this browser. Please contact us for a copy.';
				}
			});
		});

		if (window.location.hash === '#vy-enquiry') setTimeout(VY.focusEnquiry, 300);

		// Show the reward on forms already on the page as soon as it is won.
		document.addEventListener('vy:quiz-won', function () {
			VY.forms.forEach(function (f) {
				if (f.form && !f.form.querySelector('.vy-form__reward')) {
					f.form.querySelector('.vy-form__legend').insertAdjacentHTML('beforebegin', f.rewardHtml());
				}
			});
		});
	});
})();
