#!/usr/bin/env node
/* tools/dev-server.js - the dev harness (as s1-unit1/tools/dev-server.js). Runs the REAL assembled Code.gs (DESIGN/deploy/Code.gs)
 * in a Node vm with Apps Script shims, and serves the REAL assembled Index.html with google.script.run routed to POST /api/<fn>.
 *   Properties  ScriptProperties shared, UserProperties per dev user; both persisted to a JSON file; the 9 KB value and
 *               500 KB store limits throw as Apps Script does.
 *   Session     the dev user is ?as=<email> on the page (sent as the x-dev-user header); default pupil1@c2ken.net; ?as= (empty)
 *               and an empty x-dev-user header mean signed out.
 *   userinfo    a name from DEV_NAMES, '' for an address containing "noname".
 *   Lock, Utilities (SHA-256, gzip, base64, formatDate), ScriptApp, SpreadsheetApp (a JSON-file stub).
 *   Reload      Code.gs and Index.html are re-read into a fresh sandbox when either file changes (the store is kept).
 *   Images      GET /img/<file> serves REPO/img/; the page's SOCBOOT.img is "/img/".
 * Usage: nohup node tools/dev-server.js [port] > /tmp/soc-dev.log 2>&1 &   (port default 8771)
 *   SOC_STORE=<file> picks the store (default DESIGN/deploy/dev-store.json); SOC_DEPLOY=<dir> picks Code.gs/Index.html.
 *   POST /__reset clears the store; POST /__store returns it; POST /__set merges {script:{}, user:{email:{}}} into it;
 *   POST /__clock {days} moves the server's clock by whole days (streak and daily tests). Gates only. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const zlib = require('zlib');
const crypto = require('crypto');
const L = require('./lib.js');

const PORT = Number(process.argv[2] || process.env.PORT || 8771);
const STORE = process.env.SOC_STORE || path.join(L.DESIGN, 'deploy', 'dev-store.json');
const CODE = path.join(L.DEPLOY, 'Code.gs');
const INDEX = path.join(L.DEPLOY, 'Index.html');
const IMG = path.join(L.REPO, 'img');
const DEV_NAMES = { 'pupil1@c2ken.net': 'Aoife Byrne', 'pupil2@c2ken.net': 'Ciara Doyle', 'pupil3@c2ken.net': 'Niamh Kelly', 'dgartland021@c2ken.net': 'Damien Gartland', 'teacher2@c2ken.net': 'Sean Murphy', 'hod@c2ken.net': 'Mary Quinn', 'teacher3@c2ken.net': 'Orla Keane' };
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };

let db = { script: {}, user: {}, sheets: {} };
const load = () => { try { db = JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch (e) { db = { script: {}, user: {}, sheets: {} }; } db.script = db.script || {}; db.user = db.user || {}; db.sheets = db.sheets || {}; };
const save = () => { fs.mkdirSync(path.dirname(STORE), { recursive: true }); fs.writeFileSync(STORE, JSON.stringify(db)); };
load();

let current = 'pupil1@c2ken.net';
let dayShift = 0; // POST /__clock
const QUOTA = (msg) => { const e = new Error(msg); e.name = 'Exception'; return e; };
function props(get) {
  const api = {
    getProperty: (k) => (Object.prototype.hasOwnProperty.call(get(), k) ? get()[k] : null),
    setProperty: (k, v) => {
      v = String(v);
      if (Buffer.byteLength(k) + Buffer.byteLength(v) > 9216) throw QUOTA('Exception: Argument too large: value');
      const all = get(); const size = Object.entries(all).reduce((n, [a, b]) => n + (a === k ? 0 : Buffer.byteLength(a) + Buffer.byteLength(b)), 0);
      if (size + Buffer.byteLength(k) + Buffer.byteLength(v) > 500 * 1024) throw QUOTA('Exception: You have exceeded the property storage quota.');
      all[k] = v; save(); return api;
    },
    deleteProperty: (k) => { delete get()[k]; save(); return api; },
    getProperties: () => Object.assign({}, get()),
    getKeys: () => Object.keys(get()),
  };
  return api;
}
const signed = (buf) => Array.from(buf).map((b) => (b > 127 ? b - 256 : b));
const unsigned = (arr) => Buffer.from(arr.map((b) => (b < 0 ? b + 256 : b)));
function blob(data, type) {
  const buf = Buffer.isBuffer(data) ? data : Array.isArray(data) ? unsigned(data) : Buffer.from(String(data), 'utf8');
  return { getBytes: () => signed(buf), getDataAsString: () => buf.toString('utf8'), _buf: buf, getContentType: () => type || null };
}
function fmtDate(d, tz, f) {
  d = new Date(d.getTime() + dayShift * 86400000);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .formatToParts(d).map((p) => [p.type, p.value]));
  return f.replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day).replace('HH', parts.hour === '24' ? '00' : parts.hour).replace('mm', parts.minute).replace('ss', parts.second);
}
function sheetApi(id) {
  const s = db.sheets[id];
  const sheet = { appendRow: (r) => { s.rows.push(r); save(); }, getLastRow: () => s.rows.length,
    getRange: () => ({ setValues: (rows) => { rows.forEach((r) => s.rows.push(r.map((c) => (c instanceof Date ? c.toISOString() : c)))); save(); } }) };
  return { getId: () => id, getName: () => s.name, getSheets: () => [sheet] };
}
function makeSandbox() {
  return {
    console,
    PropertiesService: {
      getScriptProperties: () => props(() => db.script),
      getUserProperties: () => props(() => (db.user[current] = db.user[current] || {})),
    },
    Session: { getActiveUser: () => ({ getEmail: () => current }), getEffectiveUser: () => ({ getEmail: () => current }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    UrlFetchApp: {
      fetch: (url) => {
        if (/openidconnect\.googleapis\.com\/v1\/userinfo/.test(url)) {
          const name = /noname/.test(current) ? '' : DEV_NAMES[current] || 'Dev Pupil';
          const [g, ...f] = name.split(' ');
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify(name ? { given_name: g, family_name: f.join(' '), name } : {}) };
        }
        return { getResponseCode: () => 404, getContentText: () => '' };
      },
    },
    ScriptApp: { getOAuthToken: () => 'dev-token', getService: () => ({ getUrl: () => 'http://localhost:' + PORT + '/' }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, s) => signed(crypto.createHash('sha256').update(String(s), 'utf8').digest()),
      newBlob: blob,
      gzip: (b) => blob(zlib.gzipSync(b._buf), 'application/x-gzip'),
      ungzip: (b) => blob(zlib.gunzipSync(b._buf)),
      base64Encode: (bytes) => (Array.isArray(bytes) ? unsigned(bytes) : Buffer.from(String(bytes), 'utf8')).toString('base64'),
      base64Decode: (s) => signed(Buffer.from(String(s), 'base64')),
      formatDate: fmtDate,
    },
    SpreadsheetApp: {
      create: (name) => { const id = 'sheet-' + Object.keys(db.sheets).length; db.sheets[id] = { name, rows: [] }; save(); return sheetApi(id); },
      openById: (id) => { if (!db.sheets[id]) throw new Error('no sheet'); return sheetApi(id); },
    },
    HtmlService: {},
  };
}
// Code.gs and Index.html: re-read into a fresh sandbox whenever either file changes (the store stays)
let sandbox = null, loadedAt = '', indexHtml = '';
const stamp = (f) => { try { return String(fs.statSync(f).mtimeMs); } catch (e) { return 'none'; } };
function fresh() {
  const at = stamp(CODE) + '/' + stamp(INDEX);
  if (at === loadedAt && sandbox) return;
  const sb = makeSandbox();
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(CODE, 'utf8'), sb, { filename: 'Code.gs' });
  sandbox = sb;
  indexHtml = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
  if (loadedAt) console.log(new Date().toISOString() + ' reloaded Code.gs + Index.html');
  loadedAt = at;
}
fresh();

function page(q) {
  const cls = String(q.get('class') || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
  const as = q.has('as') ? String(q.get('as') || '') : 'pupil1@c2ken.net';
  const shim = '<script>window.__DEV_USER = ' + JSON.stringify(as) + ';\n' +
    'window.google = { script: { run: (function () {\n' +
    '  function runner(ok, bad) { return new Proxy({}, { get: function (t, k) {\n' +
    "    if (k === 'withSuccessHandler') return function (f) { return runner(f, bad); };\n" +
    "    if (k === 'withFailureHandler') return function (f) { return runner(ok, f); };\n" +
    "    return function (req) { fetch('/api/' + k, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': window.__DEV_USER }, body: JSON.stringify(req || {}) })\n" +
    "      .then(function (r) { return r.json(); }).then(function (j) { if (j && j.__error) (bad || function () {})(new Error(j.__error)); else (ok || function () {})(j); })\n" +
    "      .catch(function (e) { (bad || function () {})(e); }); };\n" +
    '  } }); }\n  return runner(null, null);\n})() } };</script>';
  const sit = /^(1|[a-z0-9-]{1,30})$/.test(q.get('sit') || '') ? q.get('sit') : '';
  if (!indexHtml) return '<!DOCTYPE html><p>No Index.html yet in ' + L.DEPLOY + ' - run node tools/build-server.js once the page files exist.</p>';
  const html = indexHtml.replace('<?= classCode ?>', cls).replace('<?= baseUrl ?>', 'http://localhost:' + PORT + '/').replace('<?= sit ?>', sit).replace('<?= showBuild ?>', q.has('build') ? '1' : '')
    .replace(JSON.stringify(L.IMG_URL), '"/img/"');
  return html.replace('<script>window.SOCBOOT', shim + '\n<script>window.SOCBOOT');
}
const log = (req, code, extra) => console.log(new Date().toISOString().slice(11, 19) + ' ' + req.method + ' ' + req.url.slice(0, 120) + ' ' + code + (extra ? ' ' + extra : ''));
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  try { fresh(); } catch (e) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end('Code.gs failed to load: ' + e.message); log(req, 500, e.message); return; }
  if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/exec')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(page(u.searchParams)); log(req, 200); return; }
  if (req.method === 'GET' && u.pathname.indexOf('/img/') === 0) {
    const name = decodeURIComponent(u.pathname.slice(5));
    const f = path.join(IMG, name);
    if (!name || name.indexOf('..') !== -1 || path.relative(IMG, f).startsWith('..') || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end('not found'); log(req, 404); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res); log(req, 200); return;
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      if (u.pathname === '/__reset') { db = { script: {}, user: {}, sheets: {} }; save(); res.end('{"ok":true}'); log(req, 200); return; }
      if (u.pathname === '/__store') { res.end(JSON.stringify(db)); log(req, 200); return; }
      if (u.pathname === '/__set') {
        const j = JSON.parse(body || '{}');
        Object.entries(j.script || {}).forEach(([k, v]) => { if (v === null) delete db.script[k]; else db.script[k] = String(v); });
        Object.entries(j.user || {}).forEach(([k, v]) => { db.user[k] = Object.assign(db.user[k] || {}, v); });
        save(); res.end('{"ok":true}'); log(req, 200); return;
      }
      if (u.pathname === '/__clock') { const j = JSON.parse(body || '{}'); dayShift = Number(j.days) || 0; res.end(JSON.stringify({ ok: true, days: dayShift })); log(req, 200, 'days ' + dayShift); return; }
      const fn = u.pathname.replace(/^\/api\//, '');
      if (!/^api[A-Z]\w+$/.test(fn) || typeof sandbox[fn] !== 'function') { res.end(JSON.stringify({ __error: 'unknown ' + fn })); log(req, 200, 'unknown'); return; }
      const h = req.headers['x-dev-user'];
      current = h === undefined ? 'pupil1@c2ken.net' : String(h).toLowerCase();
      try {
        const out = sandbox[fn](JSON.parse(body || '{}'));
        res.end(JSON.stringify(out === undefined ? null : out));
        log(req, 200, (current || '(signed out)') + ' ' + (out && out.ok === false ? 'error ' + out.error + (out.detail ? ' ' + out.detail : '') : 'ok'));
      } catch (e) { console.error(fn, e); res.end(JSON.stringify({ __error: String((e && e.message) || e) })); log(req, 200, '__error'); }
    });
    return;
  }
  if (u.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; } // Apps Script serves its own icon
  res.writeHead(404); res.end('not found ' + u.pathname); log(req, 404);
}).listen(PORT, () => console.log('Mastering Socialisation dev harness on http://localhost:' + PORT + '/?class=<name>&as=<email>  store ' + STORE + '  deploy ' + L.DEPLOY));
