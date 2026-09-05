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
function makeEnv(opts) {
  opts = opts || {};
  const configSheet = opts.configSheet || makeSheet(2, 'Config');
  const dataSheet = opts.dataSheet || makeSheet(7, 'Data');
  if (!configSheet._rows.length) {
    configSheet.appendRow(['Key', 'Value']);
    configSheet.appendRow(['staffPasscode', opts.passcode || '0lsMaths26*']);
    configSheet.appendRow(['classes', '[]']);
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
      getActiveSpreadsheet: () => ({
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
    Utilities: {
      sleep() {},
      getUuid: () => 'mock-uuid',
      computeHmacSha256Signature: (a, b) => Array.from(String(a) + String(b)).map(c => c.charCodeAt(0) & 255)
    },
    HtmlService: {
      createTemplateFromFile: (n) => ({
        _n: n,
        evaluate() {
          const self = this;
          const out = {
            _title: '', _meta: {},
            getContent: () => '<html data-template="' + self._n + '" data-boot="' + JSON.stringify({ classCode: self.classCode, baseUrl: self.baseUrl, email: self.email, name: self.name }).replace(/"/g, '&quot;') + '"></html>',
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

module.exports = { makeEnv, makeSheet, loadTemplate, CELL_MAX };
