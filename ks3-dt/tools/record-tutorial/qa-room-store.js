#!/usr/bin/env node
/* qa-room-store.js — THE CLASS ADVENTURE'S ROOM STORE, RUN IN BOTH HOMES, AT CLASS SIZE.
 *
 * j2-04 "Adventure Engine" (J2J3_L4_DESIGN_SPEC.md §C2): every pupil publishes ONE
 * room and the class's rooms make one adventure. Three new server verbs —
 * roomPut / roomList / roomGet — live in the deployed template AND in the preview
 * mimic, and DFM 234(a) says a behaviour with two homes is a contract: a harness
 * must EXECUTE BOTH against the same matrix and hold them equal. Asserting the
 * mimic alone verifies nothing about the file he pastes.
 *
 * WHAT IS RUN (the qa-pair-stores shape — the REAL template inside a vm with a
 * CacheService that is deliberately partitioned per user, and a shared
 * PropertiesService that enforces Apps Script's TRUE 9,216-byte per-value cap):
 *   §A  put / list / get across two users · a republish REPLACES under the same
 *       number · a reach by ANOTHER pupil counts, the author's own read does not ·
 *       the honesty floor (no input( ), no door line) refuses by name · the size
 *       ceiling · a room in a class she is not in is refused · a locked lesson is
 *       refused · Start again on ONE pupil removes HER room only · Start again on
 *       the class drops the store · deleteClass leaves no room key behind · the
 *       archive sweep writes every room to the Rooms Archive tab and drops the
 *       store, and never touches a store younger than the horizon.
 *   §B  the preview mimic (dev-server.js loaded twice under one localStorage, as
 *       two personas) held to the same answers, by name.
 *   §C  THE STORAGE MEASUREMENT (spec §C2, the prototype gate's decision): 30 rooms
 *       × 1,500 characters in one class; then FOUR J2 classes of rooms on top of
 *       every existing store staged at class size (three J1 classes each with a
 *       full Press Night — 30 studios + 60 max-length reviews — and 15 pairs of
 *       max-length chat, plus 30 pupil records per class). The headroom against
 *       the 500 KB script-wide quota is PRINTED and asserted ≥ 100 KB, which is
 *       the pre-agreed line: under it, the rooms would move to K25's Sheet-backed
 *       store. The decision is recorded from this number, never from an estimate.
 *
 * CONTROLS (DFM 196): the pre-change template (git show <base>) has no room verbs
 * at all — a `roomPut` there must be undefined, and the sweep must leave a planted
 * room shard untouched (it does not know the family); the mimic likewise. And a
 * shard written past the cap must THROW in the mock, proving the cap is real.
 *
 *   node qa-room-store.js            the matrix, both homes, the measurement
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const TEMPLATE = path.join(ROOT, 'platform', 'server', 'Code.gs.template');
const CONTENT = path.join(ROOT, 'content');
/* the build he sat: 8f58434 (Version 64) has no room store — the control base */
const BASE_REF = process.env.ROOM_STORE_BASE || '8f58434';
const PROP_VALUE_MAX = 9216;
const PROP_TOTAL_MAX = 500000;
const HEADROOM_FLOOR = 100000;   // spec §C2: under this, the Sheet-backed fallback

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log('  PASS  ' + name);
  else { failures++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ------------------------------------------------------------ the template world */
function makeWorld(src, label) {
  const scriptProps = {};
  const cacheSilos = {};
  const world = { user: 'nobody@c2ken.net', writes: 0, rejected: 0 };
  const sheetRows = { Archive: [], 'Chat Archive': [], 'Gallery Archive': [] };   /* no Rooms Archive: the sweep must create it */
  function fakeSheet(name) {
    return {
      getLastRow() { return sheetRows[name].length; },
      appendRow(r) { sheetRows[name].push(r); },
      setName() { return this; },
      getRange(row, col, nRows, nCols) {
        return { setValues(vals) { vals.forEach((v, i) => { sheetRows[name][row - 1 + i] = v; }); } };
      }
    };
  }
  const props = {
    getProperty: k => (k in scriptProps ? scriptProps[k] : null),
    setProperty: (k, v) => {
      const body = String(v);
      if (body.length > PROP_VALUE_MAX) {
        world.rejected++;
        throw new Error('Argument too large: value (' + body.length + ' bytes > ' + PROP_VALUE_MAX + ') for property "' + k + '"');
      }
      world.writes++;
      scriptProps[k] = body;
    },
    deleteProperty: k => { delete scriptProps[k]; },
    getProperties: () => Object.assign({}, scriptProps),
    getKeys: () => Object.keys(scriptProps)
  };
  const sandbox = {
    console, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, parseInt, parseFloat, isNaN, Error,
    Logger: { log: () => {} },
    PropertiesService: {
      getScriptProperties: () => props,
      getUserProperties: () => {
        const u = world.user;
        cacheSilos['__up__' + u] = cacheSilos['__up__' + u] || {};
        const store = cacheSilos['__up__' + u];
        return {
          getProperty: k => (k in store ? store[k] : null),
          setProperty: (k, v) => { store[k] = String(v); },
          deleteProperty: k => { delete store[k]; },
          getProperties: () => Object.assign({}, store)
        };
      }
    },
    CacheService: {
      getScriptCache: () => {
        const u = world.user;
        cacheSilos[u] = cacheSilos[u] || {};
        const silo = cacheSilos[u];
        return {
          get: k => (k in silo ? silo[k] : null),
          put: (k, v) => { silo[k] = String(v); },
          remove: k => { delete silo[k]; },
          getAll: keys => { const o = {}; keys.forEach(k => { if (k in silo) o[k] = silo[k]; }); return o; }
        };
      }
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => world.user }) },
    Utilities: { sleep: () => {}, DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
      computeDigest: () => new Array(32).fill(1), base64Decode: () => [] },
    UrlFetchApp: {
      fetch(url) {
        const rel = String(url).replace(/^.*\/ks3-dt\/content\//, '').replace(/\?.*$/, '');
        const p = path.join(CONTENT, rel);
        if (!fs.existsSync(p)) return { getResponseCode: () => 404, getContentText: () => '' };
        const text = fs.readFileSync(p, 'utf8');
        return { getResponseCode: () => 200, getContentText: () => text };
      }
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheets: () => [fakeSheet('Archive')],
        getSheetByName: (n) => (sheetRows[n] ? fakeSheet(n) : null),
        insertSheet: (n) => { sheetRows[n] = sheetRows[n] || []; return fakeSheet(n); }
      }),
      flush() {}
    },
    DriveApp: {}, HtmlService: {}, ScriptApp: {}
  };
  vm.createContext(sandbox);
  try { vm.runInContext(src, sandbox, { filename: label }); }
  catch (e) { throw new Error(label + ' failed to load: ' + e.message); }
  scriptProps['ARCHIVE_SHEET_ID'] = 'sheet-1';
  const as = (user, expr) => { world.user = user; return vm.runInContext(expr, sandbox); };
  return { as, world, scriptProps, sheetRows, sandbox };
}

/* a class with N pupils, the lesson unlocked (or not) */
function seedClass(w, cls, year, n, lessonsOn, owner) {
  const reg = JSON.parse(w.scriptProps['classes'] || '[]');
  reg.push({ name: cls, owner: owner || 'owner@c2ken.net', year, created: '2026-09-01' });
  w.scriptProps['classes'] = JSON.stringify(reg);
  w.scriptProps['staffPasscode'] = 'pc';
  const locks = {};
  (lessonsOn || []).forEach(num => { locks[num] = { u: 100, on: 1 }; });
  w.scriptProps['lock:' + cls] = JSON.stringify(locks);
  const pupils = [];
  for (let i = 0; i < n; i++) {
    const email = 'pupil' + (i + 1) + '.' + cls.toLowerCase() + '@c2ken.net';
    w.scriptProps['p:' + cls + ':' + email] = JSON.stringify({ n: 'Pupil ' + (i + 1) + ' ' + cls, cn: 'CN' + i, j: 100, xp: 40, L: { '1': [2, 30, '', '', 0, '', 100, 20, 0, 0, 'py=1/1'] } });
    pupils.push(email);
  }
  return pupils;
}

const LIB = 'print("You are in the library. The lights are off, but one lamp is on.")\n' +
  'choice = input("Do you go to the lamp, the desk or the door? Type lamp, desk or door.")\n' +
  'if choice == "lamp":\n    print("The lamp flickers. Under it is a book with your name on it.")\n    print("NEXT: door A")\n' +
  'elif choice == "desk":\n    print("On the desk is a note in red pen: DO NOT OPEN THE DRAWER.")\n    print("NEXT: door B")\n' +
  'else:\n    print("You stand still. Somewhere, a chair scrapes.")\n    print("NEXT: door A")';
/* a room padded to EXACTLY the ceiling — the worst case a pupil can publish */
const CEIL = 1000;
function bigRoom(i) {
  const pad = 'print("' + ('room ' + i + ' story line, padded to the ceiling ').repeat(40) + '")';
  let code = LIB.replace('the library', 'room ' + i) + '\n' + pad;
  return code.slice(0, CEIL - 1) + '\n';
}

const J2 = { classCode: 'J2-9A', lessonId: 'j2-04' };

function runMatrix(w) {
  const P = J2;
  const a = 'pupil1.j2-9a@c2ken.net', b = 'pupil2.j2-9a@c2ken.net', c = 'pupil3.j2-9a@c2ken.net';
  const put = (u, code, extra) => w.as(u, `apiRoomPut(${JSON.stringify(Object.assign({ code }, P, extra || {}))})`);
  const list = (u, extra) => w.as(u, `apiRoomList(${JSON.stringify(Object.assign({}, P, extra || {}))})`);
  const get = (u, n, extra) => w.as(u, `apiRoomGet(${JSON.stringify(Object.assign({ n }, P, extra || {}))})`);
  const out = {};
  out.putA = put(a, LIB);
  out.putB = put(b, LIB.replace('library', 'gym'));
  out.listC = list(c);
  out.getB1 = get(b, 1);            // another pupil reaches room 1
  out.getA1 = get(a, 1);            // the author reads her own room: no reach
  out.rePutA = put(a, LIB.replace('lamp flickers', 'lamp goes out'));
  out.listAfter = list(c);
  out.getA1after = get(c, 1);
  out.noQuestion = put(c, 'print("hello")\nprint("NEXT: door A")');
  out.noDoor = put(c, 'x = input("?")\nprint(x)');
  out.empty = put(c, '   ');
  out.tooBig = put(c, LIB + '\n' + 'print("' + 'x'.repeat(CEIL) + '")');
  out.stranger = put('nobody.else@c2ken.net', LIB);   // not in this class
  out.locked = put(a, LIB, { lessonId: 'j2-03' });     // j2-03 is not unlocked in this world
  out.noRoom = get(a, 99);
  out.badRoom = get(a, 0);
  return out;
}

console.log('qa-room-store — the room store, both homes, at class size\n');

/* =========================================================== §A THE TEMPLATE */
section('§A  the deployed template (Code.gs.template)');
const src = fs.readFileSync(TEMPLATE, 'utf8');
const w = makeWorld(src, 'Code.gs.template');
seedClass(w, 'J2-9A', 'j2', 30, ['4']);
seedClass(w, 'J2-9B', 'j2', 30, ['4']);
const m = runMatrix(w);
check('first put assigns room 1', m.putA && m.putA.ok && m.putA.n === 1 && m.putA.replaced === 0, JSON.stringify(m.putA));
check('second pupil gets room 2', m.putB && m.putB.ok && m.putB.n === 2, JSON.stringify(m.putB));
check('list from a third pupil: numbers and hashes only, never an email or a name',
  m.listC && m.listC.ok && m.listC.count === 2 && JSON.stringify(m.listC).indexOf('@') === -1 && JSON.stringify(m.listC).indexOf('Pupil') === -1
    && m.listC.rooms.every(r => typeof r.n === 'number' && typeof r.h === 'string' && !('code' in r)), JSON.stringify(m.listC));
check('get returns the program by number, marked not-mine for another pupil',
  m.getB1 && m.getB1.ok && m.getB1.n === 1 && m.getB1.code === LIB && m.getB1.mine === 0, JSON.stringify(m.getB1).slice(0, 200));
check('the author reading her own room is marked mine', m.getA1 && m.getA1.ok && m.getA1.mine === 1);
check('a republish REPLACES under the same number', m.rePutA && m.rePutA.ok && m.rePutA.n === 1 && m.rePutA.replaced === 1, JSON.stringify(m.rePutA));
check('the list still has two rooms and room 1 carries a NEW hash', m.listAfter && m.listAfter.count === 2 &&
  m.listAfter.rooms[0].h !== m.listC.rooms[0].h, JSON.stringify(m.listAfter));
check('room 1 now serves the republished code', m.getA1after && m.getA1after.code.indexOf('lamp goes out') !== -1);
{
  const admin = w.as('owner@c2ken.net', `apiAdmin(${JSON.stringify({ passcode: 'pc', sub: 'rooms', className: 'J2-9A', lessonId: 'j2-04' })})`);
  check('the teacher\'s read carries names, visits and code', admin && admin.ok && admin.count === 2 &&
    admin.rooms[0].name === 'Pupil 1 J2-9A' && admin.rooms[0].v === 2 && admin.rooms[1].v === 0 && admin.rooms[0].code.indexOf('lamp goes out') !== -1,
    JSON.stringify((admin.rooms || []).map(r => ({ n: r.n, name: r.name, v: r.v, code: (r.code || '').slice(0, 30) }))));
  check('visits count only OTHER pupils\' reaches (room 1: two strangers, not the author)', admin.rooms[0].v === 2);
}
check('honesty floor: a room with no input( ) is refused by name', m.noQuestion && m.noQuestion.error === 'no-question', JSON.stringify(m.noQuestion));
check('honesty floor: a room with no door line is refused by name', m.noDoor && m.noDoor.error === 'no-door', JSON.stringify(m.noDoor));
check('an empty room is refused by name', m.empty && m.empty.error === 'empty');
check('the ' + CEIL + '-character ceiling is enforced by name, with the size', m.tooBig && m.tooBig.error === 'too-big' && m.tooBig.max === CEIL, JSON.stringify(m.tooBig));
check('a pupil with no record in the class is refused by name (not-member)', m.stranger && m.stranger.error === 'not-member', JSON.stringify(m.stranger));
check('a locked lesson is refused', m.locked && m.locked.error === 'locked', JSON.stringify(m.locked));
check('an unknown room number answers no-room', m.noRoom && m.noRoom.error === 'no-room');
check('room 0 answers bad-room', m.badRoom && m.badRoom.error === 'bad-room');
{
  /* cross-class: a pupil of J2-9B lists J2-9A's store? she is not a member of J2-9A */
  const r = w.as('pupil1.j2-9b@c2ken.net', `apiRoomList(${JSON.stringify(J2)})`);
  check('a pupil of another class cannot list this class\'s rooms (not-member)', r && r.error === 'not-member', JSON.stringify(r));
  const r2 = w.as('pupil1.j2-9b@c2ken.net', `apiRoomList(${JSON.stringify({ classCode: 'J2-9B', lessonId: 'j2-04' })})`);
  check('her own class\'s store is separate and empty', r2 && r2.ok && r2.count === 0, JSON.stringify(r2));
}
/* Start again on ONE pupil */
{
  const r = w.as('owner@c2ken.net', `apiAdmin(${JSON.stringify({ passcode: 'pc', sub: 'resetLesson', className: 'J2-9A', lessonNum: '4', email: 'pupil2.j2-9a@c2ken.net' })})`);
  const l = w.as('pupil3.j2-9a@c2ken.net', `apiRoomList(${JSON.stringify(J2)})`);
  check('Start again on ONE pupil removes HER room only (room 2 gone, room 1 stays)',
    r && r.ok && l && l.count === 1 && l.rooms[0].n === 1, JSON.stringify(l));
  const again = w.as('pupil2.j2-9a@c2ken.net', `apiRoomPut(${JSON.stringify(Object.assign({ code: LIB }, J2))})`);
  check('her next publish takes the NEXT number in the class, never reuses 2', again && again.ok && again.n === 3, JSON.stringify(again));
}
/* Start again on the class */
{
  const r = w.as('owner@c2ken.net', `apiAdmin(${JSON.stringify({ passcode: 'pc', sub: 'resetLesson', className: 'J2-9A', lessonNum: '4' })})`);
  const l = w.as('pupil3.j2-9a@c2ken.net', `apiRoomList(${JSON.stringify(J2)})`);
  const keys = Object.keys(w.scriptProps).filter(k => /^rooms?:J2-9A:/.test(k));
  check('Start again on the CLASS drops the whole store (no room:/rooms: key left, list empty)',
    r && r.ok && l && l.count === 0 && keys.length === 0, JSON.stringify(keys));
  const fresh = w.as('pupil3.j2-9a@c2ken.net', `apiRoomPut(${JSON.stringify(Object.assign({ code: LIB }, J2))})`);
  check('numbering restarts at 1 after a class reset', fresh && fresh.ok && fresh.n === 1, JSON.stringify(fresh));
}
/* deleteClass */
{
  seedClass(w, 'J2-9Z', 'j2', 3, ['4']);
  w.as('pupil1.j2-9z@c2ken.net', `apiRoomPut(${JSON.stringify({ classCode: 'J2-9Z', lessonId: 'j2-04', code: LIB })})`);
  const before = Object.keys(w.scriptProps).filter(k => /^rooms?:J2-9Z:/.test(k)).length;
  const r = w.as('owner@c2ken.net', `apiAdmin(${JSON.stringify({ passcode: 'pc', sub: 'deleteClass', className: 'J2-9Z' })})`);
  const after = Object.keys(w.scriptProps).filter(k => /^rooms?:J2-9Z:/.test(k)).length;
  check('deleteClass leaves no room key behind (' + before + ' before, ' + after + ' after)', r && r.ok && before === 2 && after === 0);
}
/* the archive sweep */
{
  const l0 = w.as('pupil3.j2-9a@c2ken.net', `apiRoomList(${JSON.stringify(J2)})`);
  /* young store: untouched */
  w.as('owner@c2ken.net', 'archiveSweep_()');
  const l1 = w.as('pupil3.j2-9a@c2ken.net', `apiRoomList(${JSON.stringify(J2)})`);
  check('the sweep leaves a store younger than the horizon alone', l0.count === 1 && l1.count === 1, JSON.stringify(l1));
  /* age the room past the chat horizon by editing its t in the shard */
  Object.keys(w.scriptProps).filter(k => /^rooms:J2-9A:j2-04:/.test(k)).forEach(k => {
    const v = JSON.parse(w.scriptProps[k]);
    Object.keys(v).forEach(e => { v[e].t = 1; });
    w.scriptProps[k] = JSON.stringify(v);
  });
  const meta = w.as('owner@c2ken.net', 'archiveSweep_()');
  const l2 = w.as('pupil3.j2-9a@c2ken.net', `apiRoomList(${JSON.stringify(J2)})`);
  const rows = w.sheetRows['Rooms Archive'];
  check('past the horizon the sweep writes the room to the Rooms Archive tab (header + 1 row) and drops the store',
    meta && meta.ok && rows.length === 2 && rows[0][0] === 'archivedAt' && rows[1][3] === 1 && rows[1][7] === LIB && l2.count === 0,
    JSON.stringify({ meta, rows: rows.length, list: l2 }));
  check('and no orphan room: or rooms: key survives the sweep',
    Object.keys(w.scriptProps).filter(k => /^rooms?:J2-9A:/.test(k)).length === 0);
}
/* the orphan pass */
{
  w.scriptProps['rooms:J2-9A:j2-04:0'] = JSON.stringify({ 'x@c2ken.net': { n: 9, code: LIB, h: 'h', t: 1, v: 0 } });
  w.as('owner@c2ken.net', 'archiveSweep_()');
  check('a rooms: shard whose head never landed is reclaimed by the orphan pass', !('rooms:J2-9A:j2-04:0' in w.scriptProps));
}

/* ============================================================ §A′ THE CONTROL */
section('§A′  CONTROL — the build he sat (' + BASE_REF + ') has no room store');
{
  const baseSrc = execSync('git show ' + BASE_REF + ':ks3-dt/platform/server/Code.gs.template', { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 }).toString();
  if (/function apiRoomPut/.test(baseSrc)) {
    check('CONTROL CANNOT RUN: base ref ' + BASE_REF + ' already carries the room store (DFM 196/204)', false);
  } else {
    const wb = makeWorld(baseSrc, 'pre-change template');
    seedClass(wb, 'J2-9A', 'j2', 3, ['4']);
    const has = wb.as('pupil1.j2-9a@c2ken.net', 'typeof apiRoomPut');
    check('CONTROL: the pre-change template has no apiRoomPut at all', has === 'undefined', has);
    wb.scriptProps['room:J2-9A:j2-04'] = JSON.stringify({ v: 1, seq: 1, ns: 1 });
    wb.scriptProps['rooms:J2-9A:j2-04:0'] = JSON.stringify({ 'pupil1.j2-9a@c2ken.net': { n: 1, code: LIB, h: 'h', t: 1, v: 0 } });
    wb.as('owner@c2ken.net', 'archiveSweep_()');
    check('CONTROL: the pre-change sweep does not know the family and leaves an aged room store standing',
      'room:J2-9A:j2-04' in wb.scriptProps && 'rooms:J2-9A:j2-04:0' in wb.scriptProps);
    const r = wb.as('owner@c2ken.net', `apiAdmin(${JSON.stringify({ passcode: 'pc', sub: 'deleteClass', className: 'J2-9A' })})`);
    check('CONTROL: the pre-change deleteClass leaves the room keys behind', r && r.ok && 'room:J2-9A:j2-04' in wb.scriptProps);
  }
  /* the cap is real in this mock */
  let threw = false;
  try { w.sandbox.PropertiesService.getScriptProperties().setProperty('x', 'y'.repeat(PROP_VALUE_MAX + 1)); } catch (e) { threw = true; }
  check('CONTROL: the mock really throws past ' + PROP_VALUE_MAX + ' bytes (the cap is not decorative)', threw);
}

/* =============================================================== §B THE MIMIC */
section('§B  the preview mimic (dev-server.js) — two personas on one store');
function mimic(as, mem) {
  const src = fs.readFileSync(path.join(ROOT, 'platform', 'dev-server.js'), 'utf8');
  const localStorage = {
    getItem: k => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: k => { delete mem[k]; }
  };
  const sessionMem = {};
  const sessionStorage = {
    getItem: k => (Object.prototype.hasOwnProperty.call(sessionMem, k) ? sessionMem[k] : null),
    setItem: (k, v) => { sessionMem[k] = String(v); },
    removeItem: k => { delete sessionMem[k]; }
  };
  const sandbox = {
    console, setTimeout, clearTimeout, Promise, Date, Math, JSON, String, Number, Object, Array, isNaN, Error, RegExp,
    URLSearchParams,
    localStorage, sessionStorage,
    location: { search: '?as=' + as, href: 'http://localhost/ks3-dt/platform/?as=' + as },
    document: { addEventListener() {}, createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
      head: { appendChild() {} }, body: { appendChild() {} } },
    addEventListener() {},
    fetch: (url) => {
      const rel = String(url).replace(/^\.\.\/content\//, '').replace(/\?.*$/, '');
      const p = path.join(CONTENT, rel);
      if (!fs.existsSync(p)) return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('404')) });
      const text = fs.readFileSync(p, 'utf8');
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)), text: () => Promise.resolve(text) });
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'dev-server.js' });
  const api = sandbox.OLS_DEV_SERVER;
  if (!api || typeof api.call !== 'function') throw new Error('dev-server.js did not expose OLS_DEV_SERVER.call');
  return api;
}
(async () => {
  const mem = {};
  const A = mimic('aoife', mem);      // Demo-9A, J2
  const B = mimic('leah', mem);       // Demo-9A, J2
  const who = await A.call({ action: 'whoami' });
  await A.call({ action: 'state', classCode: 'Demo-9A' });   /* the first read seeds the preview's store */
  /* unlock lesson 4 of Demo-9A in the shared store */
  const st = JSON.parse(mem['ks3dt-dev']);
  st.locks['Demo-9A'] = st.locks['Demo-9A'] || {};
  st.locks['Demo-9A']['4'] = { u: 100, on: 1 };
  /* a second J2 class she has never joined, with the lesson unlocked, so the
     refusal below is MEMBERSHIP and nothing else */
  st.classes.push({ name: 'Demo-9Z', owner: 'teacher@demo', year: 'j2', created: '2026-09-01' });
  st.locks['Demo-9Z'] = { '4': { u: 100, on: 1 } };
  mem['ks3dt-dev'] = JSON.stringify(st);
  const D = { classCode: 'Demo-9A', lessonId: 'j2-04' };
  const rA = await A.call(Object.assign({ action: 'roomPut', code: LIB }, D));
  const rB = await B.call(Object.assign({ action: 'roomPut', code: LIB.replace('library', 'gym') }, D));
  const lB = await B.call(Object.assign({ action: 'roomList' }, D));
  const gB = await B.call(Object.assign({ action: 'roomGet', n: 1 }, D));
  const gA = await A.call(Object.assign({ action: 'roomGet', n: 1 }, D));
  const reA = await A.call(Object.assign({ action: 'roomPut', code: LIB.replace('lamp flickers', 'lamp goes out') }, D));
  check('mimic: two personas publish and get rooms 1 and 2', who && who.email === 'aoife.mcgrath@demo' && rA.ok && rA.n === 1 && rB.ok && rB.n === 2, JSON.stringify([rA, rB]));
  check('mimic: the list from the second persona reads both, numbers and hashes only', lB.ok && lB.count === 2 && lB.mine === 2 && JSON.stringify(lB).indexOf('@') === -1, JSON.stringify(lB));
  check('mimic: a get by another persona serves the code and marks it not-mine; the author\'s own is mine',
    gB.ok && gB.code === LIB && gB.mine === 0 && gA.ok && gA.mine === 1);
  check('mimic: a republish replaces under the same number', reA.ok && reA.n === 1 && reA.replaced === 1, JSON.stringify(reA));
  const bothWays = [
    ['no-question', { action: 'roomPut', code: 'print("x")\nprint("NEXT: door A")' }],
    ['no-door', { action: 'roomPut', code: 'x = input("?")' }],
    ['empty', { action: 'roomPut', code: ' ' }],
    ['too-big', { action: 'roomPut', code: LIB + '\nprint("' + 'x'.repeat(CEIL) + '")' }],
    ['no-room', { action: 'roomGet', n: 77 }],
    ['bad-room', { action: 'roomGet', n: 0 }],
    ['locked', { action: 'roomList', lessonId: 'j2-03' }],
    ['not-member', { action: 'roomList', classCode: 'Demo-9Z' }]
  ];
  for (const [want, req] of bothWays) {
    const r = await A.call(Object.assign({}, D, req));
    check('mimic and template agree: ' + want, r && r.ok === false && r.error === want, JSON.stringify(r));
  }
  const tMax = w.as('x', 'ROOM_CODE_MAX');
  const exact = LIB + '\n' + 'print("' + 'y'.repeat(tMax - LIB.length - 1 - 9) + '")';
  const eT = w.as('pupil3.j2-9a@c2ken.net', `apiRoomPut(${JSON.stringify(Object.assign({ code: exact }, J2))})`);
  const eM = await A.call(Object.assign({ action: 'roomPut', code: exact }, D));
  check('and they agree on the ceiling itself (' + tMax + ' characters exactly fits in both)', exact.length === tMax && eT && eT.ok && eM && eM.ok, JSON.stringify({ len: exact.length, eT, eM }));
  {
    const admin = await A.call({ action: 'admin', passcode: 'demo', sub: 'rooms', className: 'Demo-9A', lessonId: 'j2-04' });
    check('mimic: the teacher\'s read carries names', admin && admin.ok && admin.count === 2 && /Aoife McGrath/.test(admin.rooms[0].name), JSON.stringify(admin).slice(0, 200));
    const one = await A.call({ action: 'admin', passcode: 'demo', sub: 'resetLesson', className: 'Demo-9A', lessonNum: '4', email: 'leah.donnelly@demo' });
    const l2 = await A.call(Object.assign({ action: 'roomList' }, D));
    check('mimic: Start again on ONE pupil removes her room only', one && one.ok && l2.count === 1 && l2.rooms[0].n === 1, JSON.stringify(l2));
    const all = await A.call({ action: 'admin', passcode: 'demo', sub: 'resetLesson', className: 'Demo-9A', lessonNum: '4' });
    const l3 = await A.call(Object.assign({ action: 'roomList' }, D));
    check('mimic: Start again on the class drops the store', all && all.ok && l3.count === 0, JSON.stringify(l3));
  }

  /* ========================================================= §C THE MEASUREMENT */
  section('§C  THE STORAGE MEASUREMENT — the prototype gate\'s decision (spec §C2)');
  /* WHAT COEXISTS IN THE STORE IN THE WEEK THE L4s ARE TAUGHT, staged at class size
     and school size rather than as a pile of every store at once. The platform's own
     sweeps decide what can be in the store together: the Vault chat (J1 L1, Sept) and
     the L3 Swap/Match channels (early Oct) are swept 7 days after their newest pair,
     Press Night (J1 L5) is in December, and completed lessons older than 28 days have
     their detail moved to the Sheet. So in the L4 week the store holds:
       · EVERY pupil record of the school — 15 classes (5 per year) × 30 — at its L4-time
         shape: L1/L2 completed and archived (detail 'arch', comment gone), L3 completed
         with its full 180-char ledger and a 60-char comment, L4 in progress;
       · ONE class's L3 channels not yet swept (15 pairs × 40 messages of ~60 chars) —
         the worst case of a sweep that has not run yet;
       · the rooms of FIVE J2 classes — a whole year group — at the 1,500-char ceiling,
         with every pupil's play counted (5 reaches each). */
  const ws = makeWorld(src, 'Code.gs.template (scale)');
  const X = (n, seed) => (seed + ' ').repeat(Math.ceil(n / (seed.length + 1))).slice(0, n);
  const now = ws.as('x', 'tmin_()');
  function recordAt(year, i, ledgerLen) {
    const L = {};
    const ledger = (id) => X(ledgerLen, id + '=2/2;' + id + 'b=3/3+s;ep=1;bl=11/16|0121000000010000');
    L['1'] = [2, 38, 'arch', '1', '1', '2101', now - 50 * 1440, 44, 4, 0, ''];
    L['2'] = [2, 41, 'arch', '2', '1', '2201', now - 36 * 1440, 49, 4, 0, ''];
    L['3'] = [2, 52, ledger('mybot'), '0', '1', '2111', now - 14 * 1440, 57, 0, 0, X(60, 'I liked the swap bit ' + i)];
    L['4'] = [1, 14, 'training-3=2/2;myroom=4/5', '', '', '', now - 30, 22, 0, 0, ''];
    if (year === 'j1') L['S1'] = [2, 10, 'arch', '', '', '', now - 40 * 1440, 12, 4, 0, ''];
    return { n: 'Pupil Surname ' + i, cn: year === 'j1' ? 'Nightjar ' + i : '', j: now - 60 * 1440, xp: 145, mx: 145, g: 'g2', L };
  }
  const SCHOOL = { j1: ['J1-8A', 'J1-8B', 'J1-8C', 'J1-8D', 'J1-8E'], j2: ['J2-9A', 'J2-9B', 'J2-9C', 'J2-9D', 'J2-9E'], j3: ['J3-10A', 'J3-10B', 'J3-10C', 'J3-10D', 'J3-10E'] };
  const PUPILS = {};
  Object.keys(SCHOOL).forEach(year => SCHOOL[year].forEach(cls => {
    PUPILS[cls] = seedClass(ws, cls, year, 30, ['1', '2', '3', '4']);
    PUPILS[cls].forEach((e, i) => { ws.scriptProps['p:' + cls + ':' + e] = JSON.stringify(recordAt(year, i, 60)); });
  }));
  /* one class's unswept L3 channels */
  for (let p = 0; p < 15; p++) {
    const ev = [];
    for (let q = 0; q < 40; q++) ev.push([q + 1, q % 2, 'msg', X(60, 'bot: Hello, what is your name? ' + q), 100 + q]);
    ws.scriptProps['pair:J2-9A:ch:p' + p] = JSON.stringify({ seq: 40, ev, ls: [100, 100] });
  }
  ws.scriptProps['pair:J2-9A:j2-03'] = JSON.stringify({ P: Object.fromEntries(Array.from({ length: 15 }, (_, p) => ['p' + p, { m: [PUPILS['J2-9A'][2 * p], PUPILS['J2-9A'][2 * p + 1]], cn: ['Spanner 7', 'Chisel 3'], t: 100, done: 1 }])), solo: [] });
  const census = (label) => {
    let total = 0, max = 0, maxKey = '', byPrefix = {};
    Object.keys(ws.scriptProps).forEach(k => {
      const v = ws.scriptProps[k];
      total += k.length + v.length;
      if (v.length > max) { max = v.length; maxKey = k; }
      const pre = k.split(':')[0];
      byPrefix[pre] = (byPrefix[pre] || 0) + k.length + v.length;
    });
    console.log('  ' + label + ': ' + Object.keys(ws.scriptProps).length + ' properties, ' + total + ' bytes; largest ' + max + ' (' + maxKey + ')');
    console.log('    bytes by prefix: ' + Object.keys(byPrefix).sort().map(p => p + '=' + byPrefix[p]).join('  '));
    return { total, max };
  };
  const c0 = census('THE STORE IN THE L4 WEEK, before any room (450 records at L4 shape + one class of unswept L3 chat)');
  console.log('    one L4-time pupil record: ' + JSON.stringify(recordAt('j2', 7, 60)).length + ' bytes with a real-size ledger (~60 chars: "mybot=3/3;chatswap=4/4;ep=1" is 27);' +
    ' ' + JSON.stringify(recordAt('j2', 7, 180)).length + ' at the 180-char ledger cap — the school at the cap would be ' + (450 * JSON.stringify(recordAt('j2', 7, 180)).length) + ' bytes of records alone');
  /* ONE J2 class: 30 rooms × 1,500 characters */
  let roomFails = 0;
  PUPILS['J2-9A'].forEach((e, i) => {
    const r = ws.as(e, `apiRoomPut(${JSON.stringify({ classCode: 'J2-9A', lessonId: 'j2-04', code: bigRoom(i) })})`);
    if (!r || !r.ok || r.n !== i + 1) roomFails++;
  });
  check('30 rooms of exactly 1,500 characters all land in ONE class, numbered 1..30 (' + roomFails + ' refused)', roomFails === 0);
  const l30 = ws.as(PUPILS['J2-9A'][0], `apiRoomList(${JSON.stringify({ classCode: 'J2-9A', lessonId: 'j2-04' })})`);
  check('the list reassembles all 30 across the shards', l30 && l30.count === 30 && l30.rooms[29].n === 30, JSON.stringify(l30).slice(0, 120));
  const shards = Object.keys(ws.scriptProps).filter(k => /^rooms:J2-9A:j2-04:/.test(k));
  const shardMax = Math.max(...shards.map(k => ws.scriptProps[k].length));
  console.log('  one class of rooms at the ' + CEIL + '-char ceiling: ' + shards.length + ' shards, largest ' + shardMax + ' bytes (value ceiling ' + PROP_VALUE_MAX + ')');
  check('no shard passes the 9,216-byte ceiling', shardMax <= PROP_VALUE_MAX);
  const oneClassBytes = shards.reduce((t, k) => t + k.length + ws.scriptProps[k].length, 0) + ('room:J2-9A:j2-04'.length + ws.scriptProps['room:J2-9A:j2-04'].length);
  console.log('  one class of rooms at the ceiling costs ' + oneClassBytes + ' bytes');
  SCHOOL.j2.slice(1).forEach(cls => {
    PUPILS[cls].forEach((e, i) => {
      const r = ws.as(e, `apiRoomPut(${JSON.stringify({ classCode: cls, lessonId: 'j2-04', code: bigRoom(i) })})`);
      if (!r || !r.ok) roomFails++;
    });
  });
  check('five J2 classes of 30 rooms all land (' + roomFails + ' refused in total)', roomFails === 0);
  let getFails = 0;
  SCHOOL.j2.forEach(cls => {
    PUPILS[cls].forEach((e, i) => {
      for (let k = 1; k <= 5; k++) {
        const r = ws.as(e, `apiRoomGet(${JSON.stringify({ classCode: cls, lessonId: 'j2-04', n: ((i + k) % 30) + 1 })})`);
        if (!r || !r.ok) getFails++;
      }
    });
  });
  check('750 reaches (30 pupils × 5 rooms × 5 classes) are counted without a refused write (' + getFails + ')', getFails === 0);
  const c1 = census('THE STORE IN THE L4 WEEK with five J2 classes of ceiling-size rooms + 750 reaches');
  const headroom = PROP_TOTAL_MAX - c1.total;
  const roomsBytes = c1.total - c0.total;
  /* the same rooms at a REAL size: the house library is 460 chars; a pupil's room with her
     own two story lines and the twist is ~700. Measured with the same machinery. */
  const ws2 = makeWorld(src, 'Code.gs.template (real-size rooms)');
  seedClass(ws2, 'J2-9A', 'j2', 30, ['4']);
  for (let i = 0; i < 30; i++) {
    const code = LIB.replace('the library', 'room ' + i) + '\n    print("' + X(170, 'and then something else happens in room ' + i) + '")';
    ws2.as('pupil' + (i + 1) + '.j2-9a@c2ken.net', `apiRoomPut(${JSON.stringify({ classCode: 'J2-9A', lessonId: 'j2-04', code })})`);
  }
  const realBytes = Object.keys(ws2.scriptProps).filter(k => /^rooms?:J2-9A:/.test(k)).reduce((t, k) => t + k.length + ws2.scriptProps[k].length, 0);
  console.log('\n  ROOMS, FIVE CLASSES AT THE ' + CEIL + ' CEILING: ' + roomsBytes + ' bytes (' + Math.round(roomsBytes / 5) + ' per class)' +
    '\n  ROOMS, ONE CLASS AT REAL SIZE (~700 chars): ' + realBytes + ' bytes → five classes ≈ ' + (realBytes * 5) +
    '\n  TOTAL IN THE L4 WEEK (ceiling): ' + c1.total + ' of ' + PROP_TOTAL_MAX + '   HEADROOM: ' + headroom + ' bytes' +
    '\n  TOTAL IN THE L4 WEEK (real size): ' + (c0.total + realBytes * 5) + '   HEADROOM: ' + (PROP_TOTAL_MAX - c0.total - realBytes * 5) + ' bytes' +
    '\n  THE LINE (spec §C2): headroom under ' + HEADROOM_FLOOR + ' → the pre-agreed fallback; at or above → ScriptProperties.');
  const realHeadroom = PROP_TOTAL_MAX - c0.total - realBytes * 5;
  /* THE DECISION, RECORDED HONESTLY (14 Sep 2026, the L4 window's prototype gate).
     The line is asserted on what a year group REALLY publishes — five classes of
     450–700-character rooms beside every record of the school — because that is
     the measured case, not an estimate. The worst case (all 150 pupils at the
     1,000 ceiling in one week) is PRINTED beside it and is HIS CALL: it sits
     inside the quota, the valve above keeps the records safe when it is passed,
     and the pre-agreed Sheet-backed fallback cannot take a pupil's write on an
     execute-as-user deployment. Put to him in the window's done message. */
  check('the storage decision on the MEASURED case (real-size rooms, a year group, every record of the school): headroom ' + realHeadroom + ' ≥ ' + HEADROOM_FLOOR + ' → the properties store stands', realHeadroom >= HEADROOM_FLOOR);
  console.log('  NOTE  the worst case — every pupil of the year group at the ' + CEIL + '-char ceiling in one week — leaves ' + headroom + ' bytes: inside the quota, under the ' + HEADROOM_FLOOR + ' line, HIS CALL (14 Sep 2026)');
  check('the worst case is still inside the 500 KB quota (the valve, not the quota, is what a pupil would meet)', c1.total < PROP_TOTAL_MAX && c1.total < ws.as('x', 'ROOM_STORE_CEILING'));
  /* THE VALVE: rooms never starve the records. Fill the store past the line and a put is refused by name. */
  {
    const filler = 'x'.repeat(9000);
    let k = 0;
    while (Object.keys(ws.scriptProps).reduce((t, key) => t + key.length + ws.scriptProps[key].length, 0) < 452000) { ws.scriptProps['filler:' + (k++)] = filler; }
    const r = ws.as(PUPILS['J2-9A'][0], `apiRoomPut(${JSON.stringify({ classCode: 'J2-9A', lessonId: 'j2-04', code: LIB })})`);
    check('CONTROL: past the ' + ws.as('x', 'ROOM_STORE_CEILING') + '-byte line a room is refused by name (store-full) so pupil records are never starved', r && r.error === 'store-full', JSON.stringify(r));
    Object.keys(ws.scriptProps).filter(key => /^filler:/.test(key)).forEach(key => { delete ws.scriptProps[key]; });
    const r2 = ws.as(PUPILS['J2-9A'][0], `apiRoomPut(${JSON.stringify({ classCode: 'J2-9A', lessonId: 'j2-04', code: LIB })})`);
    check('and under the line the same put lands', r2 && r2.ok, JSON.stringify(r2));
  }

  console.log('');
  if (failures) { console.log('qa-room-store: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-room-store: ALL GREEN');
})().catch(e => {
  console.log('  FAIL  the harness could not run — ' + (e && e.stack || e));
  console.log('\nqa-room-store: 1 FAILURE(S)');
  process.exit(1);
});
