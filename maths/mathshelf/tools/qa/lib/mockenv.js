/* mockenv.js — APPS SCRIPT, MOCKED HONESTLY ENOUGH TO CATCH THE BUGS THAT SHIPPED.
 *
 * FROM: the makeEnv shape of ks3-dt qa-predeploy.js / qa-store-scale.js
 * (bdd8c5a); adapter: the store is a Google SHEET rather than ScriptProperties,
 * so the cap this enforces is the real one — 50,000 characters in a cell — and
 * a write over it THROWS the way the real API throws. KS3 DT's B-01 was exactly
 * this class: every gate ran against unlimited localStorage and the real store's
 * cap failed at class scale.
 *
 * The mock is deliberately hostile where the real thing is hostile and nowhere
 * else: a sheet that silently truncated would prove the opposite of what this
 * is for.
 */
'use strict';
const vm = require('vm');
const fs = require('fs');

const CELL_MAX = 50000;   /* the real Google Sheets limit, characters per cell */

function makeSheet(width, name) {
  return {
    _rows: [], _name: name,
    _pad(r) { const a = (this._rows[r] || []).slice(); while (a.length < width) a.push(''); return a; },
    _ensureRow(r) { while (this._rows.length <= r) this._rows.push(new Array(width).fill('')); },
    _guard(v) {
      if (typeof v === 'string' && v.length > CELL_MAX) {
        throw new Error('Sheets: the value is too large for a single cell (' + v.length + ' > ' + CELL_MAX + ')');
      }
      return v;
    },
    getName() { return this._name; },
    getLastRow() { return this._rows.length; },
    getMaxRows() { return Math.max(this._rows.length, 1000); },
    appendRow(r) { const a = r.map(v => this._guard(v)); while (a.length < width) a.push(''); this._rows.push(a); },
    getDataRange() { const self = this; return { getValues() { return self._rows.map(r => { const a = r.slice(); while (a.length < width) a.push(''); return a; }); } }; },
    insertRowsAfter(after, n) { for (let i = 0; i < n; i++) this._rows.push(new Array(width).fill('')); },
    deleteRow(idx) { this._rows.splice(idx - 1, 1); },
    getRange(row, col, numRows, numCols) {
      numRows = numRows || 1; numCols = numCols || 1;
      const self = this;
      return {
        setNumberFormat() { return this; },
        getValues() { const out = []; for (let i = 0; i < numRows; i++) { const r = self._pad(row - 1 + i); out.push(r.slice(col - 1, col - 1 + numCols)); } return out; },
        setValue(v) { self._ensureRow(row - 1); self._rows[row - 1][col - 1] = self._guard(v); return this; },
        setValues(vals) {
          for (let i = 0; i < numRows; i++) {
            self._ensureRow(row - 1 + i);
            for (let j = 0; j < numCols; j++) self._rows[row - 1 + i][col - 1 + j] = self._guard(vals[i][j]);
          }
          return this;
        }
      };
    }
  };
}

/* one Apps Script world. `role` decides who Session says is here. */
/* THE CONFIG ROW `acts`, DERIVED (the DATA split, 12 Sept 2026). The server's
   whitelist is its built-in ACTS unioned with the Config row `acts`; a book
   on the shelf that the built-in list does not name lives in that row on the
   live Sheet. The row the deploy must carry is derived here, one home, from
   script.js's ACTIVITIES minus the template's literal - never typed. Returns
   { builtIn, extra, value } (value = the JSON the cell holds, or null). */
function shelfActsRow() {
  const fs2 = require('fs'), path2 = require('path');
  const APP = path2.resolve(__dirname, '..', '..', '..');
  const tpl = fs2.readFileSync(path2.join(APP, 'server', 'Code.gs.template'), 'utf8');
  const lit = /var\s+ACTS\s*=\s*\[([^\]]*)\]/.exec(tpl);
  const builtIn = lit ? lit[1].split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : [];
  const src = fs2.readFileSync(path2.join(APP, 'script.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const m = /var\s+ACTIVITIES\s*=\s*\[([\s\S]*?)\n\s*\];/.exec(src);
  const ids = [];
  if (m) { const re = /id\s*:\s*'([^']+)'/g; let g; while ((g = re.exec(m[1]))) ids.push(g[1]); }
  const extra = ids.filter(id => builtIn.indexOf(id) < 0);
  return { builtIn, extra, value: extra.length ? JSON.stringify(extra) : null };
}

function makeEnv(opts) {
  opts = opts || {};
  const configSheet = opts.configSheet || makeSheet(2, 'Config');
  const dataSheet = opts.dataSheet || makeSheet(7, 'Data');
  if (!configSheet._rows.length) {
    configSheet.appendRow(['Key', 'Value']);
    configSheet.appendRow(['staffPasscode', opts.passcode || '0lsMaths26*']);
    configSheet.appendRow(['classes', '[]']);
    /* a gate that must see the shelf's every book asks for the live row */
    if (opts.actsRow === 'shelf') { const r = shelfActsRow(); if (r.value) configSheet.appendRow(['acts', r.value]); }
  }
  if (!dataSheet._rows.length) dataSheet.appendRow(['Class', 'Email', 'Name', 'Act', 'Summary', 'State', 'Updated']);

  const props = new Map(Object.entries(opts.props || {}));
  const state = {
    active: opts.active || '',
    effective: opts.effective || 'd.gartland@c2ken.net',
    oidc: opts.oidc == null ? { given_name: 'Aoife', family_name: 'Gartland' } : opts.oidc,
    fetches: []
  };

  const sandbox = {
    console,
    Session: {
      getActiveUser: () => ({ getEmail: () => state.active }),
      getEffectiveUser: () => ({ getEmail: () => state.effective })
    },
    SpreadsheetApp: {
      /* A PUPIL CANNOT OPEN THE DEPLOYER'S SHEET. Under execute-as-User the
         bound Sheet is somebody else's document, and every SpreadsheetApp call
         throws exactly this. The front-door world is built with
         sheetAccess:false so that a Sheet read on the pupil's path fails here,
         under test, instead of on a phone in a classroom (9 Sept 2026). */
      getActiveSpreadsheet: () => (opts.sheetAccess === false
        ? (() => { throw new Error('You do not have permission to access the requested document.'); })()
        : {
        getSheetByName: (n) => (n === 'Config' ? configSheet : n === 'Data' ? dataSheet : null),
        insertSheet: (n) => (n === 'Config' ? configSheet : dataSheet)
      }),
      flush() {}
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (props.has(k) ? props.get(k) : null),
        setProperty: (k, v) => { props.set(k, String(v)); },
        deleteProperty: (k) => { props.delete(k); },
        getProperties: () => Object.fromEntries(props)
      })
    },
    ScriptApp: {
      getOAuthToken: () => 'mock-oauth-token-for-' + (state.active || 'nobody'),
      getService: () => ({ getUrl: () => opts.execUrl || 'https://script.google.com/macros/s/MOCK/exec' })
    },
    UrlFetchApp: {
      fetch(url, params) {
        state.fetches.push({ url, params });
        if (/openidconnect\.googleapis\.com/.test(url)) {
          const body = state.oidc ? JSON.stringify(state.oidc) : '';
          return { getResponseCode: () => (state.oidc ? 200 : 500), getContentText: () => body };
        }
        if (opts.relayTo) return opts.relayTo(url, params);
        return { getResponseCode: () => 404, getContentText: () => '' };
      }
    },
    Logger: { log() {} },
    Utilities: {
      sleep() {},
      getUuid: () => 'mock-uuid',
      /* THE REAL HMAC, in the real shape. Apps Script returns a byte[] of
         SIGNED bytes (-128..127) and base64EncodeWebSafe pads with '='; the
         store token (12 Sept 2026) is signed and verified through these two,
         so a mock that was not a real MAC of both inputs under the key would
         let a forged signature "verify" and prove nothing about the guard. */
      computeHmacSha256Signature: (value, key) => Array.from(
        require('crypto').createHmac('sha256', Buffer.from(String(key), 'utf8')).update(Buffer.from(String(value), 'utf8')).digest()
      ).map(b => (b > 127 ? b - 256 : b)),
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes.map(b => (b < 0 ? b + 256 : b))).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      base64Encode: (bytes) => Buffer.from(bytes.map(b => (b < 0 ? b + 256 : b))).toString('base64')
    },
    HtmlService: {
      createTemplateFromFile: (n) => ({
        _n: n,
        evaluate() {
          const self = this;
          const out = {
            _title: '', _meta: {},
            /* EVERY field the server set on the template is what the page
               gets - the store token's three fields included - so a gate can
               read the served BOOT as the browser would */
            getContent: () => '<html data-template="' + self._n + '" data-boot="' + JSON.stringify(Object.keys(self).filter(k => k !== '_n' && typeof self[k] !== 'function').reduce((o, k) => (o[k] = self[k], o), {})).replace(/"/g, '&quot;') + '"></html>',
            setTitle(t) { this._title = t; return this; },
            addMetaTag(k, v) { this._meta[k] = v; return this; },
            setSandboxMode() { return this; },
            setXFrameOptionsMode() { return this; }
          };
          return out;
        }
      }),
      createHtmlOutput: (h) => ({ _h: h, getContent: () => h, setTitle() { return this; }, setXFrameOptionsMode() { return this; }, setSandboxMode() { return this; } }),
      SandboxMode: { IFRAME: 'IFRAME' },
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
    },
    ContentService: {
      createTextOutput: (t) => ({ _t: t, setMimeType() { return this; }, getContent: () => t }),
      MimeType: { JSON: 'JSON', TEXT: 'TEXT' }
    },
    JSON, Math, Date, String, Number, Boolean, Object, Array, RegExp, Error, isNaN, parseInt, parseFloat,
    encodeURIComponent, decodeURIComponent
  };
  vm.createContext(sandbox);
  return { sandbox, state, configSheet, dataSheet, props, CELL_MAX,
    run: (code, filename) => vm.runInContext(code, sandbox, { filename: filename || 'Code.gs' }),
    call: (name) => vm.runInContext(name, sandbox),
    as: (email) => { state.active = email; },
    asEffective: (email) => { state.effective = email; }
  };
}

function loadTemplate(env, file) { env.run(fs.readFileSync(file, 'utf8'), file); return env; }

module.exports = { makeEnv, makeSheet, loadTemplate, shelfActsRow, CELL_MAX };
