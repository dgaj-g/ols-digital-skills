/* domstub.js — JUST ENOUGH BROWSER TO EXECUTE THE OFFLINE STUB UNDER NODE.
 *
 * DFM 234a: a behaviour that lives in two homes is EXECUTED in both, against
 * one matrix. Both of this platform's live-only bugs — the `%23` cover fill and
 * `addClass {name}` vs `{className}` — were the same class: the preview passed
 * and the deploy was wrong, because only one home was ever run.
 *
 * script.js is an IIFE that boots the whole app at load, so it needs a document
 * to load at all. This is the smallest document that lets it finish booting and
 * hand back `GJ.app.call`, which is the offline stub's front door. Nothing here
 * pretends to render: every node is a bag of attributes with the handful of
 * methods the shell touches on its way to being ready.
 */
'use strict';

function makeNode(tag) {
  const node = {
    tagName: String(tag || 'div').toUpperCase(),
    nodeType: 1,
    children: [], childNodes: [], parentNode: null,
    style: { cssText: '', setProperty() {}, removeProperty() {} },
    dataset: {}, _attrs: {}, _text: '', _html: '', hidden: false, disabled: false, value: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); }, remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (on) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); }
    },
    get className() { return [...this.classList._s].join(' '); },
    set className(v) { this.classList._s = new Set(String(v || '').split(/\s+/).filter(Boolean)); },
    get textContent() { return this._text; }, set textContent(v) { this._text = String(v == null ? '' : v); },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v == null ? '' : v); },
    setAttribute(k, v) { this._attrs[k] = String(v); }, getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; },
    removeAttribute(k) { delete this._attrs[k]; }, hasAttribute(k) { return k in this._attrs; },
    appendChild(c) { this.children.push(c); this.childNodes.push(c); c.parentNode = this; return c; },
    insertBefore(c) { return this.appendChild(c); },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); this.childNodes.splice(i, 1); } return c; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    querySelector() { return makeNode('div'); }, querySelectorAll() { return []; },
    closest() { return null; }, matches() { return false; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    focus() {}, blur() { }, select() {}, click() {},
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; },
    scrollIntoView() {}, animate() { return { finished: Promise.resolve(), cancel() {} }; }
  };
  return node;
}

function makeDom() {
  const byId = {};
  const document = {
    _byId: byId,
    getElementById(id) { return (byId[id] = byId[id] || makeNode('div')); },
    createElement(t) { return makeNode(t); },
    createElementNS(ns, t) { return makeNode(t); },
    createDocumentFragment() { return makeNode('fragment'); },
    querySelector() { return makeNode('div'); },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    body: makeNode('body'), documentElement: makeNode('html'),
    hidden: false, fonts: { check() { return true; }, ready: Promise.resolve() }
  };
  const storage = (() => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => { m.set(k, String(v)); },
      removeItem: (k) => { m.delete(k); },
      clear: () => m.clear(),
      get length() { return m.size; },
      key: (i) => [...m.keys()][i] || null,
      _map: m
    };
  })();
  return { document, storage };
}

/* the whole sandbox a client file needs to load and finish booting */
function makeWindow(extra) {
  const { document, storage } = makeDom();
  const sandbox = {
    console, JSON, Math, Date, Promise, RegExp, Error, Object, Array, String, Number, Boolean, Map, Set,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: (f) => setTimeout(() => f(Date.now()), 0),
    cancelAnimationFrame: (h) => clearTimeout(h),
    document, localStorage: storage, sessionStorage: makeDom().storage,
    location: { search: '?class=demo&nointro', href: 'http://localhost/preview', pathname: '/preview' },
    navigator: { userAgent: 'node', platform: 'node', clipboard: { writeText: () => Promise.resolve() } },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    scrollTo() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    innerWidth: 1280, innerHeight: 900, devicePixelRatio: 1,
    fetch: () => Promise.reject(new Error('no network in the stub sandbox')),
    encodeURIComponent, decodeURIComponent, btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    XMLHttpRequest: function () { this.open = () => {}; this.send = () => {}; this.setRequestHeader = () => {}; }
  };
  Object.assign(sandbox, extra || {});
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  sandbox.top = sandbox; sandbox.parent = sandbox;
  return sandbox;
}

module.exports = { makeDom, makeNode, makeWindow };
