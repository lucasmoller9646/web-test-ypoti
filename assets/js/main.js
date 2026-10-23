/* =========================================================
   Ypoti · comportamiento del sitio
   - Textos en 5 idiomas desde data/textos.csv o desde la planilla
     de Google (Apps Script), según assets/js/site-config.js
   - Modo claro / oscuro, selector de idioma, menú del celular
   - Simulador de rentabilidad y formularios que abren WhatsApp
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.YPOTI_CONFIG || {};
  var LANGS = CFG.IDIOMAS || ['es', 'pt', 'en', 'de', 'gn'];
  var DEFAULT_LANG = CFG.IDIOMA_POR_DEFECTO || 'es';
  var LOCALES = { es: 'es-PY', pt: 'pt-BR', en: 'en-US', de: 'de-DE', gn: 'es-PY' };
  var CACHE_KEY = 'ypoti-data-v1';

  var state = { lang: DEFAULT_LANG, textos: {}, config: {}, sim: {} };

  /* ---------------- utilidades ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // Lector de CSV tolerante: separador , ; o tabulación, comillas, saltos de línea dentro de celdas, BOM.
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    var firstLine = text.split(/\r?\n/)[0] || '';
    var counts = { ',': (firstLine.match(/,/g) || []).length, ';': (firstLine.match(/;/g) || []).length, '\t': (firstLine.match(/\t/g) || []).length };
    var sep = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { q = false; } }
        else { cell += c; }
      } else if (c === '"') { q = true; }
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else { cell += c; }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    return rows.slice(1).filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); }).map(function (r) {
      var o = {}; head.forEach(function (h, j) { o[h] = r[j] !== undefined ? r[j] : ''; }); return o;
    });
  }
  function rowsToTextos(rows) {
    var out = {};
    rows.forEach(function (r) {
      var k = (r.clave || r.key || '').trim(); if (!k) return;
      var e = {}; LANGS.forEach(function (l) { e[l] = r[l] || ''; }); out[k] = e;
    });
    return out;
  }
  function rowsToConfig(rows) {
    var out = {};
    rows.forEach(function (r) { var k = (r.clave || r.key || '').trim(); if (k) out[k] = String(r.valor !== undefined ? r.valor : (r.value || '')).trim(); });
    return out;
  }
  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function loadFromCSV() {
    return Promise.all([
      fetch(CFG.TEXTOS_CSV || 'data/textos.csv', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('csv'); return r.text(); }),
      fetch(CFG.CONFIG_CSV || 'data/config.csv', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
    ]).then(function (res) { return { textos: rowsToTextos(parseCSV(res[0])), config: rowsToConfig(parseCSV(res[1])) }; });
  }
  function loadFromAppsScript() {
    return withTimeout(fetch(CFG.APPS_SCRIPT_URL + (CFG.APPS_SCRIPT_URL.indexOf('?') >= 0 ? '&' : '?') + 'accion=textos'), 6000)
      .then(function (r) { if (!r.ok) throw new Error('gs'); return r.json(); })
      .then(function (j) { if (!j || !j.textos) throw new Error('gs-format'); return { textos: j.textos, config: j.config || {} }; });
  }
  function loadData() {
    if (CFG.APPS_SCRIPT_URL) return loadFromAppsScript().catch(function () { return loadFromCSV(); });
    return loadFromCSV();
  }

  /* ---------------- textos ---------------- */
  function escapeHTML(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // Solo se permiten <b>, <strong>, <em>, <i> y <br> dentro de los textos.
  function safeHTML(s) {
    return escapeHTML(s).replace(/&lt;(\/?)(b|strong|em|i)&gt;/gi, '<$1$2>').replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\n/g, '<br>');
  }
  function t(key, vars) {
    var e = state.textos[key];
    var s = e ? (e[state.lang] || e[DEFAULT_LANG] || '') : '';
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
    return s;
  }
  function has(key) { var e = state.textos[key]; return !!(e && (e[state.lang] || e[DEFAULT_LANG])); }
  function cfg(k, d) { var v = state.config[k]; return v === undefined || v === '' ? (d === undefined ? '' : d) : v; }
  function num(v) {
    var s = String(v === undefined ? '' : v).trim().replace(/\s/g, '');
    if (!s) return NaN;
    var lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc >= 0 && ld >= 0) { s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''); }
    else if (lc >= 0) { s = s.replace(',', '.'); }
    else if (ld >= 0 && state.lang !== 'en' && /^\d{1,3}(\.\d{3})+$/.test(s)) { s = s.replace(/\./g, ''); }
    return parseFloat(s);
  }
  // Números de la hoja config: aceptan 0.29 o 0,29 (nunca separador de miles).
  function cnum(v) { var s = String(v === undefined ? '' : v).trim().replace(/\s/g, ''); if (s.indexOf(',') >= 0 && s.indexOf('.') < 0) s = s.replace(',', '.'); return parseFloat(s); }
  function fmt(n, d) {
    if (!isFinite(n)) return '–';
    return new Intl.NumberFormat(LOCALES[state.lang] || 'es-PY', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  }
  function resolveVars(el) {
    var spec = el.getAttribute('data-vars'); if (!spec) return null;
    var out = {};
    spec.split(';').forEach(function (part) {
      var m = part.split('='); if (m.length < 2) return;
      var name = m[0].trim(), src = m[1].split(':');
      if (src[0] === 'cfg') {
        var raw = cnum(cfg(src[1]));
        out[name] = src[2] === 'pct' ? fmt(raw * 100, raw * 100 % 1 ? 1 : 0) + ' %' : fmt(raw, parseInt(src[2] || '0', 10));
      } else if (src[0] === 'out') {
        out[name] = state.sim[src[1]] !== undefined ? state.sim[src[1]] : '';
      }
    });
    if (state.lang === 'en') Object.keys(out).forEach(function (k) { out[k] = String(out[k]).replace(' %', '%'); });
    return out;
  }
  function applyTexts() {
    $all('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n'); if (!has(key)) return;
      var s = t(key, resolveVars(el));
      if (el.tagName === 'TITLE' || el.tagName === 'OPTION') el.textContent = s.replace(/<[^>]+>/g, '');
      else el.innerHTML = safeHTML(s);
    });
    $all('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split('='); if (p.length < 2) return;
        var key = p[1].trim(); if (has(key)) el.setAttribute(p[0].trim(), t(key).replace(/<[^>]+>/g, ''));
      });
    });
    document.documentElement.setAttribute('lang', state.lang === 'gn' ? 'gn' : state.lang);
    $all('.lang-code').forEach(function (el) { el.textContent = state.lang.toUpperCase(); });
    $all('[data-lang]').forEach(function (b) { b.setAttribute('aria-current', b.getAttribute('data-lang') === state.lang ? 'true' : 'false'); });
    var lb = $('.lang-btn'); if (lb && has('ui.language')) lb.setAttribute('aria-label', t('ui.language') + ': ' + state.lang.toUpperCase());
    updateThemeLabel();
    var y = String(new Date().getFullYear());
    $all('[data-i18n="footer.copy"]').forEach(function (el) { el.textContent = t('footer.copy', { anio: y }); });
  }

  /* ---------------- ajustes (config) ---------------- */
  function waLink(numberKey, message) {
    var n = String(cfg(numberKey)).replace(/\D/g, '');
    return 'https://wa.me/' + n + (message ? '?text=' + encodeURIComponent(message) : '');
  }
  function applyConfig() {
    $all('[data-cfg-href]').forEach(function (el) {
      var v = cfg(el.getAttribute('data-cfg-href'));
      if (v) { el.setAttribute('href', v); el.hidden = false; }
      else if (el.hasAttribute('data-fallback')) { el.setAttribute('href', el.getAttribute('data-fallback')); el.removeAttribute('target'); }
      else if (el.hasAttribute('data-keep')) { el.removeAttribute('href'); }
      else { el.hidden = true; }
    });
    $all('[data-cfg-text]').forEach(function (el) { var v = cfg(el.getAttribute('data-cfg-text')); if (v) el.textContent = v; });
    $all('[data-cfg-tel]').forEach(function (el) { var v = cfg(el.getAttribute('data-cfg-tel')); if (v) el.setAttribute('href', 'tel:' + v.replace(/[^\d+]/g, '')); });
    $all('[data-cfg-mail]').forEach(function (el) {
      var v = cfg(el.getAttribute('data-cfg-mail')); if (!v) return;
      var subj = el.getAttribute('data-mail-subject');
      el.setAttribute('href', 'mailto:' + v + (subj ? '?subject=' + encodeURIComponent(subj) : ''));
    });
    $all('[data-wa]').forEach(function (el) { el.setAttribute('href', waLink(el.getAttribute('data-wa'), t(el.getAttribute('data-wa-msg') || 'wa.general'))); });
  }

  /* ---------------- idioma ---------------- */
  function detectLang() {
    var p = new URLSearchParams(location.search).get('lang');
    if (p && LANGS.indexOf(p) >= 0) return p;
    var s = store('ypoti-lang'); if (s && LANGS.indexOf(s) >= 0) return s;
    if (CFG.DETECTAR_IDIOMA_DEL_NAVEGADOR) {
      var nav = (navigator.languages || [navigator.language || '']).map(function (l) { return String(l).slice(0, 2).toLowerCase(); });
      for (var i = 0; i < nav.length; i++) if (LANGS.indexOf(nav[i]) >= 0) return nav[i];
    }
    return DEFAULT_LANG;
  }
  function setLang(l, push) {
    if (LANGS.indexOf(l) < 0) return;
    var simValues = readSim();
    state.lang = l; store('ypoti-lang', l);
    if (push) {
      var u = new URL(location.href);
      if (l === DEFAULT_LANG) u.searchParams.delete('lang'); else u.searchParams.set('lang', l);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
    applyTexts(); applyConfig(); writeSim(simValues); calcSim();
  }

  /* ---------------- tema ---------------- */
  function updateThemeLabel() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $all('.theme-toggle').forEach(function (b) {
      var k = dark ? 'ui.theme_light' : 'ui.theme_dark';
      if (has(k)) b.setAttribute('aria-label', t(k));
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
    });
  }
  function toggleTheme() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', 'dark');
    store('ypoti-theme', dark ? 'light' : 'dark');
    updateThemeLabel();
  }

  /* ---------------- simulador ---------------- */
  var SIM_FIELDS = ['cab', 'peso', 'dias', 'gmd', 'ms', 'precio'];
  var SIM_DEC = { cab: 0, peso: 0, dias: 0, gmd: 2, ms: 2, precio: 2 };
  function readSim() {
    var o = {}; SIM_FIELDS.forEach(function (f) { var el = $('#sim-' + f); if (el && el.value !== '') o[f] = num(el.value); }); return o;
  }
  function writeSim(values) {
    SIM_FIELDS.forEach(function (f) {
      var el = $('#sim-' + f); if (!el) return;
      var v = values && isFinite(values[f]) ? values[f] : cnum(cfg('sim_' + f));
      el.value = isFinite(v) ? fmt(v, SIM_DEC[f]) : '';
    });
  }
  function calcSim() {
    var form = $('#sim-form'); if (!form) return;
    var v = readSim();
    var cab = v.cab || 0, peso = v.peso || 0, dias = v.dias || 0, gmd = v.gmd || 0, ms = v.ms || 0, precio = v.precio || 0;
    var MS = cnum(cfg('precio_ms_usd', '0.29')), DIARIA = cnum(cfg('diaria_usd', '0.40'));
    var RCI = cnum(cfg('rc_entrada', '0.50')), RCS = cnum(cfg('rc_salida', '0.563')), OTROS = cnum(cfg('otros_costos_usd', '15'));
    var pesoFinal = peso + gmd * dias;
    var carcasa = pesoFinal * RCS - peso * RCI;           // kg de carcasa producidos en Ypoti
    var ingreso = carcasa * precio;                        // USD por cabeza
    var costo = ms * MS * dias + DIARIA * dias + OTROS;    // hotelería por cabeza (sin compra del animal ni costo financiero)
    var ganancia = ingreso - costo;
    state.sim = { cab: fmt(cab, 0), pesofinal: fmt(pesoFinal, 0), ganancia: fmt(ganancia, 0), lote: fmt(ganancia * cab, 0), carcasa: fmt(carcasa, 0) };
    $all('[data-out]').forEach(function (el) { var k = el.getAttribute('data-out'); if (state.sim[k] !== undefined) el.textContent = state.sim[k]; });
    $all('[data-vars*="out:"]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (has(k)) el.innerHTML = safeHTML(t(k, resolveVars(el))); });
    var a = $('#sim-wa');
    if (a) a.setAttribute('href', waLink('whatsapp_hoteleria', t('wa.cotizacion', {
      cab: fmt(cab, 0), peso: fmt(peso, 0), dias: fmt(dias, 0), gmd: fmt(gmd, 2), ms: fmt(ms, 2), precio: fmt(precio, 2), ganancia: state.sim.ganancia
    })));
  }

  /* ---------------- formularios ---------------- */
  function toast(msg) {
    var el = $('.toast'); if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, 3200);
  }
  function sendLead(tipo, data) {
    if (!CFG.APPS_SCRIPT_URL) return;
    try {
      fetch(CFG.APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ accion: 'lead', tipo: tipo, idioma: state.lang, pagina: location.href, datos: data }) });
    } catch (e) { /* el envío a la planilla es opcional */ }
  }
  function openWA(url) {
    var w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }
  function bindForm(id, tipo, numberKey, msgKey) {
    var form = document.getElementById(id); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.website && form.website.value) return; // trampa anti-spam
      var sel = form.categoria;
      var data = {
        categoria: sel ? sel.options[sel.selectedIndex].text : '',
        cantidad: form.cantidad ? form.cantidad.value.trim() : '',
        peso: form.peso ? form.peso.value.trim() : '',
        fecha: form.fecha ? form.fecha.value.trim() : '',
        ubicacion: form.ubicacion ? form.ubicacion.value.trim() : ''
      };
      if (!data.cantidad || !data.peso) { toast(t('ui.form_missing')); (form.cantidad && !data.cantidad ? form.cantidad : form.peso).focus(); return; }
      var msg = t(msgKey, { categoria: data.categoria, cantidad: data.cantidad, peso: data.peso, fecha: data.fecha || '–', ubicacion: data.ubicacion || '–' });
      openWA(waLink(numberKey, msg));
      sendLead(tipo, data);
    });
  }

  /* ---------------- interfaz ---------------- */
  function bindUI() {
    $all('.theme-toggle').forEach(function (b) { b.addEventListener('click', toggleTheme); });
    var lb = $('.lang-btn'), lm = $('.lang-menu');
    function closeLang() { if (lm) { lm.hidden = true; lb.setAttribute('aria-expanded', 'false'); } }
    if (lb && lm) {
      lb.addEventListener('click', function (e) { e.stopPropagation(); var open = lm.hidden; lm.hidden = !open; lb.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { var cur = lm.querySelector('[aria-current="true"]') || lm.querySelector('button'); cur && cur.focus(); } });
      document.addEventListener('click', function (e) { if (!lm.contains(e.target)) closeLang(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!lm.hidden) { closeLang(); lb.focus(); } closeMenu(); } });
    }
    $all('[data-lang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang'), true); closeLang(); if (lb) lb.focus(); }); });

    var mb = $('.menu-btn'), nav = $('#main-nav');
    function closeMenu() { if (nav && nav.classList.contains('open')) { nav.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); if (has('ui.menu_open')) mb.setAttribute('aria-label', t('ui.menu_open')); } }
    if (mb && nav) {
      mb.addEventListener('click', function () {
        var open = !nav.classList.contains('open');
        nav.classList.toggle('open', open); mb.setAttribute('aria-expanded', open ? 'true' : 'false');
        var k = open ? 'ui.menu_close' : 'ui.menu_open'; if (has(k)) mb.setAttribute('aria-label', t(k));
      });
      $all('a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
    }

    var sf = $('#sim-form');
    if (sf) {
      sf.addEventListener('input', calcSim);
      sf.addEventListener('submit', function (e) { e.preventDefault(); });
      $all('input', sf).forEach(function (inp) {
        inp.addEventListener('blur', function () { var f = inp.name, v = num(inp.value); if (isFinite(v)) inp.value = fmt(v, SIM_DEC[f]); calcSim(); });
      });
    }
    var sw = $('#sim-wa'); if (sw) sw.addEventListener('click', function () { sendLead('cotizacion', readSim()); });
    bindForm('form-compra', 'compra', 'whatsapp_compras', 'wa.compra');
    bindForm('form-reserva', 'reserva', 'whatsapp_hoteleria', 'wa.reserva');

    var vid = $('.hero-media');
    if (vid && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { vid.removeAttribute('autoplay'); vid.pause(); }
  }

  /* ---------------- arranque ---------------- */
  function start(data, fromCache) {
    state.textos = data.textos || {}; state.config = data.config || {};
    var first = !start._done; start._done = true;
    if (first) { state.lang = detectLang(); }
    var simValues = first ? null : readSim();
    applyTexts(); applyConfig();
    if (first || fromCache === false) writeSim(simValues);
    calcSim();
  }

  bindUI();
  var cached = null;
  try { cached = JSON.parse(store('ypoti-data-v1') || 'null'); } catch (e) { cached = null; }
  if (cached && cached.textos) start(cached, true);
  loadData().then(function (data) {
    if (!data || !data.textos || !Object.keys(data.textos).length) throw new Error('vacío');
    store(CACHE_KEY, JSON.stringify(data));
    start(data, false);
  }).catch(function () {
    // Sin datos (por ejemplo, abriendo el archivo directo desde la computadora): queda el español que ya trae el HTML.
    if (!cached) { state.lang = DEFAULT_LANG; calcSimFallback(); }
  });

  function calcSimFallback() {
    // Ajustes de fábrica incluidos en el HTML (solo se usan si no se pudieron leer los CSV ni la planilla).
    try { state.config = JSON.parse(($('#ypoti-defaults') || {}).textContent || '{}'); } catch (e) { state.config = {}; }
    applyConfig(); writeSim(null); calcSim();
  }

  window.Ypoti = { setLang: setLang, t: t, state: state };
})();
