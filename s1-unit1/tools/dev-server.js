#!/usr/bin/env node
/* tools/dev-server.js — the dev harness (copied from a2-ssd, D61). Runs the REAL assembled Code.gs (deploy/Code.gs) in a Node vm with Apps Script
 * shims, and serves the REAL assembled Index.html with google.script.run routed to POST /api/<fn>.
 *   Properties  ScriptProperties shared, UserProperties per dev user; both persisted to a JSON file; the 9 KB value and
 *               500 KB store limits throw as Apps Script does.
 *   Session     the dev user is ?as=<email> on the page (sent as the x-dev-user header); default pupil1@c2ken.net.
 *   userinfo    a name from DEV_NAMES, '' for an address containing "noname".
 *   Lock, Utilities (SHA-256, gzip, base64, formatDate), ScriptApp, SpreadsheetApp (a JSON-file stub).
 * Usage: nohup node s1-unit1/tools/dev-server.js [port] > dev.log 2>&1 &    ·   S1U1_STORE=<file> picks the store (default
 * "Claude Work/S1 Unit 1 Platform/gates/dev-store.json"); POST /__reset clears it; POST /__store returns it (gates only). */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const PORT = Number(process.argv[2] || process.env.PORT || 8767);
const STORE = process.env.S1U1_STORE || path.join(DESIGN, 'gates', 'dev-store.json');
const CODE = path.join(DESIGN, 'deploy', 'Code.gs');
const INDEX = path.join(ROOT, 'server', 'Index.html');
const DEV_NAMES = { 'pupil1@c2ken.net': 'Aoife Byrne', 'pupil2@c2ken.net': 'Ciara Doyle', 'pupil3@c2ken.net': 'Niamh Kelly', 'dgartland021@c2ken.net': 'Damien Gartland', 'teacher2@c2ken.net': 'Sean Murphy', 'hod@c2ken.net': 'Mary Quinn' };

let db = { script: {}, user: {}, sheets: {} };
const load = () => { try { db = JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch (e) { db = { script: {}, user: {}, sheets: {} }; } };
const save = () => fs.writeFileSync(STORE, JSON.stringify(db));
load();

let current = 'pupil1@c2ken.net';
const QUOTA = (msg) => { const e = new Error(msg); e.name = 'Exception'; return e; };
function props(get) {
  return {
    getProperty: (k) => (k in get() ? get()[k] : null),
    setProperty: (k, v) => {
      v = String(v);
      if (Buffer.byteLength(k) + Buffer.byteLength(v) > 9216) throw QUOTA('Exception: Argument too large: value');
      const all = get(); const size = Object.entries(all).reduce((n, [a, b]) => n + (a === k ? 0 : Buffer.byteLength(a) + Buffer.byteLength(b)), 0);
      if (size + Buffer.byteLength(k) + Buffer.byteLength(v) > 500 * 1024) throw QUOTA('Exception: You have exceeded the property storage quota.');
      all[k] = v; save(); return this;
    },
    deleteProperty: (k) => { delete get()[k]; save(); },
    getProperties: () => Object.assign({}, get()),
    getKeys: () => Object.keys(get()),
  };
}
const signed = (buf) => Array.from(buf).map((b) => (b > 127 ? b - 256 : b));
const unsigned = (arr) => Buffer.from(arr.map((b) => (b < 0 ? b + 256 : b)));
function blob(data, type) {
  const buf = Buffer.isBuffer(data) ? data : Array.isArray(data) ? unsigned(data) : Buffer.from(String(data), 'utf8');
  return { getBytes: () => signed(buf), getDataAsString: () => buf.toString('utf8'), _buf: buf, getContentType: () => type || null };
}
function fmtDate(d, tz, f) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .formatToParts(d).map((p) => [p.type, p.value]));
  return f.replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day).replace('HH', parts.hour === '24' ? '00' : parts.hour).replace('mm', parts.minute).replace('ss', parts.second);
}
const sandbox = {
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
function sheetApi(id) {
  const s = db.sheets[id];
  const sheet = { appendRow: (r) => { s.rows.push(r); save(); }, getLastRow: () => s.rows.length,
    getRange: () => ({ setValues: (rows) => { rows.forEach((r) => s.rows.push(r.map((c) => (c instanceof Date ? c.toISOString() : c)))); save(); } }) };
  return { getId: () => id, getSheets: () => [sheet] };
}
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(CODE, 'utf8'), sandbox, { filename: 'Code.gs' });

function page(q) {
  const cls = String(q.get('class') || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
  const as = String(q.get('as') || 'pupil1@c2ken.net');
  const shim = '<script>window.__DEV_USER = ' + JSON.stringify(as) + ';\n' +
    'window.google = { script: { run: (function () {\n' +
    '  function runner(ok, bad) { return new Proxy({}, { get: function (t, k) {\n' +
    "    if (k === 'withSuccessHandler') return function (f) { return runner(f, bad); };\n" +
    "    if (k === 'withFailureHandler') return function (f) { return runner(ok, f); };\n" +
    "    return function (req) { fetch('/api/' + k, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': window.__DEV_USER }, body: JSON.stringify(req || {}) })\n" +
    "      .then(function (r) { return r.json(); }).then(function (j) { if (j && j.__error) (bad || function () {})(new Error(j.__error)); else (ok || function () {})(j); })\n" +
    "      .catch(function (e) { (bad || function () {})(e); }); };\n" +
    '  } }); }\n  return runner(null, null);\n})() } };</script>';
  const sit = q.get('sit') === '1' ? '1' : '';
  const html = fs.readFileSync(INDEX, 'utf8').replace('<?= classCode ?>', cls).replace('<?= baseUrl ?>', 'http://localhost:' + PORT + '/').replace('<?= sit ?>', sit);
  return html.replace('<script>window.S1BOOT', shim + '\n<script>window.S1BOOT');
}
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/exec')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(page(u.searchParams)); return; }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      if (u.pathname === '/__reset') { db = { script: {}, user: {}, sheets: {} }; save(); res.end('{"ok":true}'); return; }
      if (u.pathname === '/__store') { res.end(JSON.stringify(db)); return; }
      if (u.pathname === '/__set') { const j = JSON.parse(body || '{}'); Object.assign(db.script, j.script || {}); Object.entries(j.user || {}).forEach(([k, v]) => { db.user[k] = Object.assign(db.user[k] || {}, v); }); save(); res.end('{"ok":true}'); return; }
      const fn = u.pathname.replace(/^\/api\//, '');
      if (!/^api[A-Z]\w+$/.test(fn) || typeof sandbox[fn] !== 'function') { res.end(JSON.stringify({ __error: 'unknown ' + fn })); return; }
      current = String(req.headers['x-dev-user'] || 'pupil1@c2ken.net').toLowerCase();
      try {
        const out = sandbox[fn](JSON.parse(body || '{}'));
        res.end(JSON.stringify(out === undefined ? null : out));
      } catch (e) { console.error(fn, e); res.end(JSON.stringify({ __error: String(e && e.message || e) })); }
    });
    return;
  }
  if (u.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; } // Apps Script serves its own icon
  res.writeHead(404); res.end('not found ' + u.pathname);
}).listen(PORT, () => console.log('S1 Unit 1 dev harness on http://localhost:' + PORT + '/?class=<name>&as=<email>  store ' + STORE));
