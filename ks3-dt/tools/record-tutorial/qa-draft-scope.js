#!/usr/bin/env node
/* qa-draft-scope.js — A DRAFT BELONGS TO THE RUN IT CAME FROM.

   Born 22 Aug 2026, from the second finding of the 21 Aug staff-meeting morning
   (DFM 249). M McKeever had sat Lesson 1 in an earlier class; she opened a NEW
   class's Lesson 1 and it "opened at the end of her lesson". Cause, at the line:
   a pupil's in-progress position lives in her own UserProperties under
   `draft:<year>:<lessonNum>` — year-qualified (an earlier fix stopped a J2 pupil
   inheriting her own J1 drafts) but NOT class-qualified, so two classes of the
   same year share one key and a draft follows the pupil across them.

   THE LAW IT HOLDS: the class joins the key on save AND on load, so an old
   class's drafts simply stop matching — which is the wanted behaviour, not a
   side effect. The screen must never lie about where a pupil is (DFM 35).

   THIS HARNESS EXECUTES BOTH SERVER HOMES (DFM 234a: a behaviour implemented in
   the deployed template AND in the preview mimic is a contract, and asserting
   the mimic alone verifies nothing about the file he pastes):
     HOME 1  server/Code.gs.template, run in a vm on stub Apps Script services
     HOME 2  dev-server.js, the whole FakeServer, run under a stub window

   CONTROLS (DFM 196 — a control that cannot reproduce the fault proves nothing):
   the PRE-FIX sources at DRAFT_SCOPE_BASE (default 239bb0b, the build that was
   live when he found it) must, in BOTH homes, hand class A's draft back inside
   class B. The fix is credited only after both controls have failed.

   Usage:  node qa-draft-scope.js
           DRAFT_SCOPE_BASE=<ref> node qa-draft-scope.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');           // ks3-dt/
const REPO = path.join(ROOT, '..');                      // repo root
const TEMPLATE = path.join(ROOT, 'platform', 'server', 'Code.gs.template');
const DEVSERVER = path.join(ROOT, 'platform', 'dev-server.js');
/* PINNED, never 'HEAD'. A base that floats forward silently becomes the fixed
   code and the control skips itself — the qa-pair-stores lesson, same round. */
const BASE_REF = process.env.DRAFT_SCOPE_BASE || '239bb0b';

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log('  PASS  ' + name);
  else { failures++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}
function section(t) { console.log('\n' + t); }

const PUPIL = 'm.mckeever@c2ken.net';
/* Two classes, SAME YEAR, same lesson number — the exact shape of his finding.
   A third class in another year keeps the older year-qualification honest. */
const CLASSES = [
  { name: 'DT-Old', year: 'j1' },
  { name: 'DT-New', year: 'j1' },
  { name: 'DT-J2', year: 'j2' }
];
const DRAFT_A = { done: ['welcome', 'warmup', 'badge1'], ci: 6, t: 900 };
const DRAFT_B = { done: ['welcome'], ci: 1, t: 950 };

/* ============================================================ HOME 1: template
   The real Code.gs.template inside a vm. Script properties are shared (the
   roster); UserProperties are per user, which is where a draft lives. */
function templateHome(src, label) {
  const scriptProps = {};
  const userSilos = {};
  const world = { user: PUPIL };
  const sandbox = {
    console, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, parseInt, parseFloat, isNaN,
    Logger: { log: () => {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (k in scriptProps ? scriptProps[k] : null),
        setProperty: (k, v) => { scriptProps[k] = String(v); },
        deleteProperty: k => { delete scriptProps[k]; },
        getProperties: () => Object.assign({}, scriptProps)
      }),
      getUserProperties: () => {
        const u = world.user;
        userSilos[u] = userSilos[u] || {};
        const store = userSilos[u];
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
        const silo = (userSilos['__c__'] = userSilos['__c__'] || {});
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
    Utilities: { sleep: () => {} },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '' }) }
  };
  vm.createContext(sandbox);
  try { vm.runInContext(src, sandbox, { filename: label }); }
  catch (e) { throw new Error(label + ' failed to load: ' + e.message); }
  /* The content machinery is not under test: every lesson is open. */
  vm.runInContext(`
    lessonAccessible_ = function () { return true; };
  `, sandbox);

  scriptProps['classes'] = JSON.stringify(
    CLASSES.map(c => ({ name: c.name, owner: 'owner@c2ken.net', year: c.year, created: 1 })));
  CLASSES.forEach(c => {
    scriptProps['p:' + c.name + ':' + PUPIL] =
      JSON.stringify({ n: 'M McKeever', cn: '', j: 1, xp: 0, L: {} });
  });

  const call = (fn, req) => vm.runInContext(fn + '(' + JSON.stringify(req) + ')', sandbox);
  return {
    name: 'Code.gs.template',
    save: (cls, num, draft) => call('apiSaveEvent', { classCode: cls, lessonNum: num, draft: draft }),
    load: (cls, num) => call('apiLoadDraft', { classCode: cls, lessonNum: num }),
    keys: () => Object.keys(userSilos[PUPIL] || {}).filter(k => k.indexOf('draft:') === 0)
  };
}

/* ========================================================== HOME 2: dev-server
   The whole FakeServer under a stub window, exactly as qa-kit-parity runs it
   (DFM 234a). Its calls are promises, so this half of the harness is async
   throughout rather than pretending a promise can be drained synchronously. */
function devDriver(devPath) {
  const src = fs.readFileSync(devPath, 'utf8');
  const mem = {};
  const localStorage = {
    getItem: k => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: k => { delete mem[k]; }
  };
  const sandbox = {
    console, setTimeout, clearTimeout, Promise, Date, Math, JSON, String, Number, Object, Array, isNaN,
    localStorage, sessionStorage: localStorage,
    location: { search: '', href: 'http://localhost/ks3-dt/platform/' },
    document: {
      addEventListener() {}, createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
      head: { appendChild() {} }, body: { appendChild() {} }
    },
    addEventListener() {},
    fetch: () => Promise.resolve({ ok: false, status: 404 })
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: devPath });
  const api = sandbox.OLS_DEV_SERVER;
  if (!api || typeof api.call !== 'function') throw new Error('dev-server.js did not expose OLS_DEV_SERVER.call');
  const state = () => JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
  const put = s => localStorage.setItem('ks3dt-dev', JSON.stringify(s));

  return {
    name: 'dev-server.js',
    async whoami() { const r = await api.call({ action: 'whoami' }); return (r && r.email) || ''; },
    seed(who) {
      const s = state();
      s.classes = CLASSES.map(c => ({ name: c.name, owner: 'staff@demo', year: c.year, created: new Date().toISOString() }));
      s.locks = {};
      CLASSES.forEach(c => { s.locks[c.name] = { '1': { u: 1, on: 1 }, '2': { u: 1, on: 1 } }; });
      s.pupils = {};
      CLASSES.forEach(c => { s.pupils[c.name + ':' + who] = { n: 'M McKeever', cn: '', j: 1, xp: 0, L: {} }; });
      s.userProps = {};
      put(s);
    },
    save: (cls, num, draft) => api.call({ action: 'saveEvent', classCode: cls, lessonNum: num, draft: draft }),
    load: (cls, num) => api.call({ action: 'loadDraft', classCode: cls, lessonNum: num }),
    keys() {
      const up = state().userProps || {};
      const who = Object.keys(up)[0];
      return who ? Object.keys((up[who] || {}).draft || {}) : [];
    }
  };
}

function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

/* One scenario, run against any home that offers save/load. Returns the raw
   answers so both the control and the fix can be judged from the same walk. */
async function scenario(home) {
  await home.save('DT-Old', '1', DRAFT_A);              // she works through her old class
  const inNew = await home.load('DT-New', '1');          // then opens the NEW class's Lesson 1
  const inOld = await home.load('DT-Old', '1');          // and her old class still remembers her
  await home.save('DT-New', '1', DRAFT_B);               // she starts the new class properly
  const oldAfter = await home.load('DT-Old', '1');       // the old run is not clobbered
  const newAfter = await home.load('DT-New', '1');
  const otherLesson = await home.load('DT-Old', '2');    // a different lesson never inherits
  const otherYear = await home.load('DT-J2', '1');       // and neither does another year
  return { inNew, inOld, oldAfter, newAfter, otherLesson, otherYear };
}

function draftOf(r) { return r && r.ok ? (r.draft || null) : undefined; }

async function main() {
  console.log('qa-draft-scope — a draft belongs to the run it came from (DFM 249)\n');
  console.log('  base ref for the controls: ' + BASE_REF);

  const show = execSync('git show ' + BASE_REF + ':ks3-dt/platform/server/Code.gs.template',
    { cwd: REPO, maxBuffer: 32 * 1024 * 1024 }).toString();
  const showDev = execSync('git show ' + BASE_REF + ':ks3-dt/platform/dev-server.js',
    { cwd: REPO, maxBuffer: 32 * 1024 * 1024 }).toString();

  /* ---------------- CONTROL, HOME 1: the template he was running -------------- */
  section('CONTROL — Code.gs.template at ' + BASE_REF + ' (the McKeever build)');
  {
    const home = templateHome(show, 'pre-fix template');
    const r = await scenario(home);
    check('CONTROL: the pre-fix template hands class DT-Old\'s draft back inside DT-New',
      same(draftOf(r.inNew), DRAFT_A),
      'got ' + JSON.stringify(draftOf(r.inNew)));
    check('CONTROL: the pre-fix key carries no class segment',
      home.keys().length > 0 && home.keys().every(k => k.split(':').length === 3),
      JSON.stringify(home.keys()));
  }

  /* ---------------- CONTROL, HOME 2: the preview mimic ----------------------- */
  section('CONTROL — dev-server.js at ' + BASE_REF);
  {
    const tmp = path.join(require('os').tmpdir(), 'qa-draft-scope-prefix-dev-server.js');
    fs.writeFileSync(tmp, showDev);
    const home = devDriver(tmp);
    home.seed(await home.whoami());
    const r = await scenario(home);
    check('CONTROL: the pre-fix dev-server hands DT-Old\'s draft back inside DT-New',
      same(draftOf(r.inNew), DRAFT_A),
      'got ' + JSON.stringify(draftOf(r.inNew)));
    check('CONTROL: the pre-fix dev-server key is the bare lesson number',
      home.keys().length > 0 && home.keys().every(k => /^\d+$|^S\d+$/i.test(k)),
      JSON.stringify(home.keys()));
    fs.unlinkSync(tmp);
  }

  /* ---------------- THE FIX, HOME 1 ----------------------------------------- */
  section('THE FIX — Code.gs.template as it ships');
  {
    const home = templateHome(fs.readFileSync(TEMPLATE, 'utf8'), 'shipped template');
    const r = await scenario(home);
    check('a draft saved in DT-Old does NOT resume in DT-New (his finding, dead)',
      draftOf(r.inNew) === null, JSON.stringify(draftOf(r.inNew)));
    check('the same class still resumes her exactly where she was',
      same(draftOf(r.inOld), DRAFT_A), JSON.stringify(draftOf(r.inOld)));
    check('starting the new class does not clobber the old class\'s draft',
      same(draftOf(r.oldAfter), DRAFT_A), JSON.stringify(draftOf(r.oldAfter)));
    check('the new class keeps its own draft', same(draftOf(r.newAfter), DRAFT_B), JSON.stringify(draftOf(r.newAfter)));
    check('another lesson in the same class inherits nothing', draftOf(r.otherLesson) === null);
    check('another YEAR still inherits nothing (the earlier fix holds)', draftOf(r.otherYear) === null);
    check('the reset stamp still has what it needs: the draft\'s own t survives the round trip',
      draftOf(r.oldAfter) && Number(draftOf(r.oldAfter).t) === DRAFT_A.t);
    check('two classes now hold two separate keys, each naming its class',
      home.keys().length === 2 &&
      home.keys().some(k => k === 'draft:j1:1:DT-Old') &&
      home.keys().some(k => k === 'draft:j1:1:DT-New'),
      JSON.stringify(home.keys()));
  }

  /* ---------------- THE FIX, HOME 2 ----------------------------------------- */
  section('THE FIX — dev-server.js as it ships');
  {
    const home = devDriver(DEVSERVER);
    home.seed(await home.whoami());
    const r = await scenario(home);
    check('a draft saved in DT-Old does NOT resume in DT-New', draftOf(r.inNew) === null,
      JSON.stringify(draftOf(r.inNew)));
    check('the same class still resumes her exactly where she was', same(draftOf(r.inOld), DRAFT_A),
      JSON.stringify(draftOf(r.inOld)));
    check('starting the new class does not clobber the old class\'s draft', same(draftOf(r.oldAfter), DRAFT_A));
    check('the new class keeps its own draft', same(draftOf(r.newAfter), DRAFT_B));
    check('another lesson in the same class inherits nothing', draftOf(r.otherLesson) === null);
    check('another YEAR inherits nothing', draftOf(r.otherYear) === null);
    check('the preview key names year, lesson and class, exactly like the template',
      home.keys().length === 2 &&
      home.keys().some(k => k === 'j1:1:DT-Old') &&
      home.keys().some(k => k === 'j1:1:DT-New'),
      JSON.stringify(home.keys()));
  }

  console.log('');
  if (failures) { console.log('qa-draft-scope: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-draft-scope: ALL GREEN — a draft belongs to the run it came from, in both server homes.');
}

main().catch(e => { console.error(e); process.exit(1); });
