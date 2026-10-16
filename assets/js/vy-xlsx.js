/**
 * Minimal, dependency-free XLSX (Office Open XML) writer and the visa
 * document checklist download.
 *
 * Produces a real .xlsx workbook (zip of SpreadsheetML parts) with styles,
 * merged title rows, column widths and a Yes/No drop-down - not a renamed
 * CSV. Kept small on purpose so the site does not load a 1 MB library.
 */
(function () {
	'use strict';

	var VY = (window.VY = window.VY || {});

	// ---------- ZIP (stored, no compression) ----------
	var CRC_TABLE = (function () {
		var t = new Uint32Array(256);
		for (var n = 0; n < 256; n++) {
			var c = n;
			for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			t[n] = c >>> 0;
		}
		return t;
	})();

	function crc32(bytes) {
		var c = 0xffffffff;
		for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
		return (c ^ 0xffffffff) >>> 0;
	}

	function utf8(str) {
		return new TextEncoder().encode(str);
	}

	function zip(files) {
		var chunks = [];
		var central = [];
		var offset = 0;
		var now = new Date();
		var dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
		var dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

		files.forEach(function (file) {
			var name = utf8(file.name);
			var data = utf8(file.data);
			var crc = crc32(data);

			var local = new DataView(new ArrayBuffer(30));
			local.setUint32(0, 0x04034b50, true);
			local.setUint16(4, 20, true);
			local.setUint16(6, 0x0800, true); // UTF-8 names
			local.setUint16(8, 0, true); // stored
			local.setUint16(10, dosTime, true);
			local.setUint16(12, dosDate, true);
			local.setUint32(14, crc, true);
			local.setUint32(18, data.length, true);
			local.setUint32(22, data.length, true);
			local.setUint16(26, name.length, true);
			local.setUint16(28, 0, true);
			chunks.push(new Uint8Array(local.buffer), name, data);

			var cen = new DataView(new ArrayBuffer(46));
			cen.setUint32(0, 0x02014b50, true);
			cen.setUint16(4, 20, true);
			cen.setUint16(6, 20, true);
			cen.setUint16(8, 0x0800, true);
			cen.setUint16(10, 0, true);
			cen.setUint16(12, dosTime, true);
			cen.setUint16(14, dosDate, true);
			cen.setUint32(16, crc, true);
			cen.setUint32(20, data.length, true);
			cen.setUint32(24, data.length, true);
			cen.setUint16(28, name.length, true);
			cen.setUint32(42, offset, true);
			central.push(new Uint8Array(cen.buffer), name);

			offset += 30 + name.length + data.length;
		});

		var centralSize = central.reduce(function (s, c) { return s + c.length; }, 0);
		var end = new DataView(new ArrayBuffer(22));
		end.setUint32(0, 0x06054b50, true);
		end.setUint16(8, files.length, true);
		end.setUint16(10, files.length, true);
		end.setUint32(12, centralSize, true);
		end.setUint32(16, offset, true);

		return new Blob(chunks.concat(central, [new Uint8Array(end.buffer)]), {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		});
	}

	// ---------- SpreadsheetML ----------
	function xml(s) {
		return String(s == null ? '' : s)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
			.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
	}

	function colName(i) {
		var s = '';
		i += 1;
		while (i > 0) {
			var m = (i - 1) % 26;
			s = String.fromCharCode(65 + m) + s;
			i = Math.floor((i - 1) / 26);
		}
		return s;
	}

	// Style ids (cellXfs order in STYLES below).
	var S = { normal: 0, title: 1, body: 2, header: 3, note: 4, bodyBold: 5, input: 6, section: 7 };

	var STYLES =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
		'<fonts count="6">' +
		'<font><sz val="11"/><name val="Calibri"/></font>' +
		'<font><b/><sz val="16"/><color rgb="FF1D355F"/><name val="Calibri"/></font>' +
		'<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
		'<font><i/><sz val="10"/><color rgb="FF444444"/><name val="Calibri"/></font>' +
		'<font><b/><sz val="11"/><name val="Calibri"/></font>' +
		'<font><b/><sz val="12"/><color rgb="FFD2170F"/><name val="Calibri"/></font>' +
		'</fonts>' +
		'<fills count="4">' +
		'<fill><patternFill patternType="none"/></fill>' +
		'<fill><patternFill patternType="gray125"/></fill>' +
		'<fill><patternFill patternType="solid"><fgColor rgb="FF1D355F"/><bgColor indexed="64"/></patternFill></fill>' +
		'<fill><patternFill patternType="solid"><fgColor rgb="FFFFF8E1"/><bgColor indexed="64"/></patternFill></fill>' +
		'</fills>' +
		'<borders count="2">' +
		'<border><left/><right/><top/><bottom/><diagonal/></border>' +
		'<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>' +
		'</borders>' +
		'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
		'<cellXfs count="8">' +
		'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
		'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
		'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
		'<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
		'<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
		'<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
		'<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>' +
		'<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
		'</cellXfs>' +
		'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
		'</styleSheet>';

	/**
	 * sheet = { name, cols: [widths], rows: [{ cells: [{ v, s }], height }],
	 *           merges: ['A1:E1'], lists: [{ ref: 'D5:D20', values: ['Yes','No'] }] }
	 */
	function sheetXml(sheet) {
		var out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
			'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
		if (sheet.freezeRow) {
			out += '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + sheet.freezeRow + '" topLeftCell="A' + (sheet.freezeRow + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
		}
		out += '<cols>' + sheet.cols.map(function (w, i) {
			return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
		}).join('') + '</cols><sheetData>';

		sheet.rows.forEach(function (row, r) {
			var rn = r + 1;
			out += '<row r="' + rn + '"' + (row.height ? ' ht="' + row.height + '" customHeight="1"' : '') + '>';
			(row.cells || []).forEach(function (cell, c) {
				if (cell == null) return;
				var ref = colName(c) + rn;
				var style = cell.s ? ' s="' + cell.s + '"' : '';
				if (cell.v === '' || cell.v == null) {
					out += '<c r="' + ref + '"' + style + '/>';
				} else if (typeof cell.v === 'number') {
					out += '<c r="' + ref + '"' + style + '><v>' + cell.v + '</v></c>';
				} else {
					out += '<c r="' + ref + '"' + style + ' t="inlineStr"><is><t xml:space="preserve">' + xml(cell.v) + '</t></is></c>';
				}
			});
			out += '</row>';
		});
		out += '</sheetData>';

		if (sheet.merges && sheet.merges.length) {
			out += '<mergeCells count="' + sheet.merges.length + '">' + sheet.merges.map(function (m) {
				return '<mergeCell ref="' + m + '"/>';
			}).join('') + '</mergeCells>';
		}
		if (sheet.lists && sheet.lists.length) {
			out += '<dataValidations count="' + sheet.lists.length + '">' + sheet.lists.map(function (l) {
				return '<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="' + l.ref + '"><formula1>"' + xml(l.values.join(',')) + '"</formula1></dataValidation>';
			}).join('') + '</dataValidations>';
		}
		out += '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
			'<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
		return out;
	}

	function safeSheetName(name, used) {
		var n = String(name).replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31).trim() || 'Sheet';
		var base = n, i = 2;
		while (used[n]) n = base.slice(0, 28) + ' ' + i++;
		used[n] = true;
		return n;
	}

	VY.buildXlsx = function (sheets, meta) {
		var used = {};
		sheets.forEach(function (s) { s.name = safeSheetName(s.name, used); });
		var files = [];
		files.push({
			name: '[Content_Types].xml',
			data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
				'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
				'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
				'<Default Extension="xml" ContentType="application/xml"/>' +
				'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
				'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
				sheets.map(function (s, i) {
					return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
				}).join('') +
				'<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
				'</Types>'
		});
		files.push({
			name: '_rels/.rels',
			data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
				'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
				'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
				'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
				'</Relationships>'
		});
		files.push({
			name: 'docProps/core.xml',
			data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
				'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
				'<dc:title>' + xml(meta.title) + '</dc:title><dc:creator>' + xml(meta.author) + '</dc:creator>' +
				'<dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().replace(/\.\d+Z$/, 'Z') + '</dcterms:created>' +
				'</cp:coreProperties>'
		});
		files.push({
			name: 'xl/workbook.xml',
			data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
				'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
				sheets.map(function (s, i) {
					return '<sheet name="' + xml(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
				}).join('') + '</sheets></workbook>'
		});
		files.push({
			name: 'xl/_rels/workbook.xml.rels',
			data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
				'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
				sheets.map(function (s, i) {
					return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
				}).join('') +
				'<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
				'</Relationships>'
		});
		files.push({ name: 'xl/styles.xml', data: STYLES });
		sheets.forEach(function (s, i) {
			files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: sheetXml(s) });
		});
		return zip(files);
	};

	// ---------- Visa checklist workbook ----------
	function checklistSheet(name, title, intro, items, reminder, extraLines) {
		var rows = [];
		var merges = [];
		var add = function (cells, height) { rows.push({ cells: cells, height: height }); return rows.length; };
		var span = function (r) { merges.push('A' + r + ':E' + r); };

		span(add([{ v: title, s: S.title }], 26));
		(extraLines || []).forEach(function (line) { span(add([{ v: line, s: S.section }], 20)); });
		span(add([{ v: intro, s: S.note }], 48));
		add([]);
		var headerRow = add([
			{ v: 'Document', s: S.header },
			{ v: 'Description / purpose', s: S.header },
			{ v: 'Requirement', s: S.header },
			{ v: 'Ready? (Yes / No)', s: S.header },
			{ v: 'Notes', s: S.header }
		], 22);
		items.forEach(function (item) {
			add([
				{ v: item[0], s: S.bodyBold },
				{ v: item[1], s: S.body },
				{ v: item[2], s: S.body },
				{ v: '', s: S.input },
				{ v: '', s: S.body }
			], Math.max(30, Math.ceil(String(item[1]).length / 55) * 15 + 6));
		});
		var lastItem = rows.length;
		add([]);
		span(add([{ v: reminder, s: S.note }], 34));

		return {
			name: name,
			cols: [30, 62, 22, 16, 34],
			rows: rows,
			merges: merges,
			freezeRow: headerRow,
			lists: items.length ? [{ ref: 'D' + (headerRow + 1) + ':D' + lastItem, values: ['Yes', 'No', 'Not applicable'] }] : []
		};
	}

	VY.downloadVisaChecklist = function (country) {
		var visa = (VY.config.visa || {});
		var cl = visa.checklist;
		if (!cl) return false;
		var amount = (visa.pricing && visa.pricing['default']) || 0;
		var extra = [
			'VishvYatra Holidays visa service amount: ' + VY.formatINR(amount) + ' (agency service charge only; embassy, VFS and other third-party fees are separate).',
			'Generated on ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + (country ? ' for: ' + country : '') + '. Contact: ' + (VY.config.contact ? VY.config.contact.phone_display + ' | ' + VY.config.contact.email : '')
		];
		var sheets = [checklistSheet('General checklist', cl.title, cl.disclaimer, cl.general, cl.reminder, extra)];
		var specific = country && cl.by_country && cl.by_country[country];
		if (specific && specific.length) {
			sheets.push(checklistSheet(country, country + ' - additional documents', cl.disclaimer, specific, cl.reminder));
		}

		var blob = VY.buildXlsx(sheets, { title: cl.title, author: 'VishvYatra Holidays' });
		var fileName = 'VishvYatra-Visa-Document-Checklist' + (country ? '-' + country.replace(/[^a-z0-9]+/gi, '-') : '') + '.xlsx';
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
		return fileName;
	};
})();
