/**
 * Ypoti · Apps Script del sitio
 * ----------------------------------------------------------------
 * Va pegado DENTRO de la planilla de Google que tiene las hojas
 * "textos" y "config" (la misma estructura del Excel ypoti_textos.xlsx).
 *
 *  - GET  ?accion=textos  -> devuelve los textos de los 5 idiomas y los
 *                            ajustes en JSON para el sitio.
 *  - POST {accion:'lead'} -> guarda en la hoja "leads" cada formulario
 *                            enviado desde el sitio (ofrecer lote,
 *                            reservar lugar, pedir cotización) y, si en
 *                            config hay un "leads_email", avisa por correo.
 *
 * Publicación: Implementar > Nueva implementación > Aplicación web,
 *   Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 * Copiar la URL que termina en /exec y pegarla en
 *   assets/js/site-config.js -> APPS_SCRIPT_URL.
 */

var HOJA_TEXTOS = 'textos';
var HOJA_CONFIG = 'config';
var HOJA_LEADS = 'leads';
var IDIOMAS = ['es', 'pt', 'en', 'de', 'gn'];
var CACHE_SEG = 300; // 5 minutos: después de editar la planilla, el sitio se actualiza en hasta 5 min

function doGet(e) {
  var accion = (e && e.parameter && e.parameter.accion) || 'textos';
  if (accion === 'textos') return json_(leerTodo_(e && e.parameter && e.parameter.fresco === '1'));
  if (accion === 'ping') return json_({ ok: true, hora: new Date().toISOString() });
  return json_({ ok: false, error: 'acción desconocida' });
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.accion !== 'lead') return json_({ ok: false, error: 'acción desconocida' });
    var d = body.datos || {};
    var fila = [
      new Date(),
      limpio_(body.tipo, 30),
      limpio_(body.idioma, 5),
      limpio_(d.categoria, 120),
      limpio_(d.cantidad !== undefined ? d.cantidad : d.cab, 20),
      limpio_(d.peso, 20),
      limpio_(d.fecha, 60),
      limpio_(d.ubicacion, 160),
      limpio_(JSON.stringify(d), 500),
      limpio_(body.pagina, 300)
    ];
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try { hojaLeads_().appendRow(fila); } finally { lock.releaseLock(); }
    avisar_(fila);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ---------------- lectura de la planilla ---------------- */
function leerTodo_(fresco) {
  var cache = CacheService.getScriptCache();
  if (!fresco) {
    var guardado = leerCache_(cache, 'ypoti-datos');
    if (guardado) return JSON.parse(guardado);
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var datos = { textos: leerTextos_(ss), config: leerConfig_(ss), actualizado: new Date().toISOString() };
  guardarCache_(cache, 'ypoti-datos', JSON.stringify(datos), CACHE_SEG);
  return datos;
}

function leerTextos_(ss) {
  var sh = ss.getSheetByName(HOJA_TEXTOS);
  if (!sh) throw new Error('Falta la hoja "' + HOJA_TEXTOS + '"');
  var v = sh.getDataRange().getDisplayValues();
  var cab = v[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var iClave = cab.indexOf('clave');
  var out = {};
  for (var r = 1; r < v.length; r++) {
    var k = String(v[r][iClave] || '').trim();
    if (!k) continue;
    var e = {};
    IDIOMAS.forEach(function (l) { var i = cab.indexOf(l); e[l] = i >= 0 ? String(v[r][i]) : ''; });
    out[k] = e;
  }
  return out;
}

function leerConfig_(ss) {
  var sh = ss.getSheetByName(HOJA_CONFIG);
  if (!sh) return {};
  var v = sh.getDataRange().getValues();
  var cab = v[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var iC = cab.indexOf('clave'), iV = cab.indexOf('valor');
  var out = {};
  for (var r = 1; r < v.length; r++) {
    var k = String(v[r][iC] || '').trim();
    if (k) out[k] = String(v[r][iV] === null || v[r][iV] === undefined ? '' : v[r][iV]).trim();
  }
  return out;
}

/* ---------------- leads ---------------- */
function hojaLeads_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(HOJA_LEADS);
  if (!sh) {
    sh = ss.insertSheet(HOJA_LEADS);
    sh.appendRow(['fecha', 'tipo', 'idioma', 'categoria', 'cantidad', 'peso_kg', 'fecha_envio', 'ubicacion', 'datos', 'pagina']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 10).setFontWeight('bold');
  }
  return sh;
}

function avisar_(fila) {
  var cfg = leerConfig_(SpreadsheetApp.getActiveSpreadsheet());
  var para = cfg.leads_email;
  if (!para) return;
  var tipos = { compra: 'Oferta de lote (compra)', reserva: 'Reserva de hotelería', cotizacion: 'Pedido de cotización' };
  var asunto = 'Sitio Ypoti · ' + (tipos[fila[1]] || fila[1]);
  var cuerpo = 'Fecha: ' + fila[0] + '\nTipo: ' + fila[1] + '\nIdioma: ' + fila[2] + '\nCategoría: ' + fila[3] +
    '\nCantidad: ' + fila[4] + '\nPeso: ' + fila[5] + '\nFecha de envío: ' + fila[6] + '\nUbicación: ' + fila[7] +
    '\n\nDetalle: ' + fila[8] + '\nPágina: ' + fila[9];
  try { MailApp.sendEmail(para, asunto, cuerpo); } catch (e) { /* sin aviso si falla el correo */ }
}

/* ---------------- menú dentro de la planilla ---------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sitio Ypoti')
    .addItem('Publicar cambios ahora (borrar caché)', 'borrarCache')
    .addItem('Revisar textos vacíos', 'revisarVacios')
    .addToUi();
}

function borrarCache() {
  var c = CacheService.getScriptCache();
  var n = Number(c.get('ypoti-datos-n') || 0);
  var keys = ['ypoti-datos', 'ypoti-datos-n'];
  for (var i = 0; i < n; i++) keys.push('ypoti-datos-' + i);
  c.removeAll(keys);
  SpreadsheetApp.getActiveSpreadsheet().toast('Listo: el sitio va a mostrar los textos nuevos en la próxima visita.', 'Sitio Ypoti', 5);
}

function revisarVacios() {
  var t = leerTextos_(SpreadsheetApp.getActiveSpreadsheet());
  var faltan = [];
  Object.keys(t).forEach(function (k) { IDIOMAS.forEach(function (l) { if (!String(t[k][l]).trim()) faltan.push(k + ' (' + l + ')'); }); });
  SpreadsheetApp.getUi().alert(faltan.length ? 'Textos vacíos (se mostrará el español):\n\n' + faltan.join('\n') : 'Todos los textos están completos en los 5 idiomas.');
}

/* ---------------- utilidades ---------------- */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function limpio_(v, max) {
  var s = v === undefined || v === null ? '' : String(v);
  s = s.replace(/^[=+\-@]/, "'$&"); // evita que la planilla lo interprete como fórmula
  return s.slice(0, max || 200);
}
// CacheService guarda hasta 100 KB por clave: los textos se parten en pedazos.
function guardarCache_(cache, key, str, seg) {
  var size = 90000, n = Math.ceil(str.length / size), obj = {};
  for (var i = 0; i < n; i++) obj[key + '-' + i] = str.substr(i * size, size);
  obj[key + '-n'] = String(n);
  try { cache.putAll(obj, seg); } catch (e) { /* sin caché */ }
}
function leerCache_(cache, key) {
  var n = Number(cache.get(key + '-n') || 0);
  if (!n) return null;
  var keys = []; for (var i = 0; i < n; i++) keys.push(key + '-' + i);
  var got = cache.getAll(keys), s = '';
  for (var j = 0; j < n; j++) { if (got[keys[j]] === undefined) return null; s += got[keys[j]]; }
  return s;
}
