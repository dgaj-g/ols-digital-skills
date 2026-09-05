#!/usr/bin/env node
/* qa-two-homes.js — EVERY SERVER BEHAVIOUR IS EXECUTED IN BOTH HOMES,
 * AGAINST ONE MATRIX. AGREEMENT IS THE SECOND QUESTION; BEHAVIOUR IS THE FIRST.
 *
 * G-F1 / DFM 234a. Both of this platform's live-only bugs were this class:
 *   - the `%23` cover fill: the preview served it, the deploy did not;
 *   - `addClass {name}` vs `{className}`: the offline stub read `p.name`, the
 *     server read `req.className`, the preview passed, and the live app said
 *     "bad-name" to Damien on 18 June. Nothing had ever RUN both.
 *
 * So both are run. The deployed template is loaded TWICE into node:vm sandboxes
 * — once as the FRONT DOOR (execute-as-User: Session is the pupil, and its
 * UrlFetchApp is wired to the second sandbox) and once as DATA (execute-as-Me:
 * the deployer, an in-memory Sheet that enforces the real 50,000-character cell
 * cap, a ScriptProperty holding the shared secret) — and the offline stub is
 * loaded in a third sandbox with just enough browser to boot. One matrix runs
 * through all of them.
 *
 * The relay rows are the v4 architecture (MATHS_V4_DESIGN §7): they are RED
 * until P3 builds it, which is what harness-first means.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { makeEnv, loadTemplate, CELL_MAX } = require('./lib/mockenv.js');
const { makeWindow } = require('./lib/domstub.js');

const TIER = 'fast';
const ORDER = 50;
const COVERS = {
  books: '*', kinds: [], surfaces: [], widths: [], projector: false,
  tier: ['preview', 'built'], cells: ['two-homes']
};
const CONTROLS = [
  { id: 'addclass-field-parity', kind: 'ref', ref: '95cc8ec^', mustFail: /addClass x two-homes/ },
  { id: 'data-without-secret-guard', kind: 'fixture', plant: 'fixture-server', mustFail: /accepted a call with no secret/ },
  { id: 'stub-serves-unticked-book', kind: 'fixture', plant: 'fixture-server', mustFail: /unticked/ },
  { id: 'secret-in-a-return-value', kind: 'fixture', plant: 'fixture-server-secret-leak', mustFail: /the shared secret/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const PW = '0lsMaths26*';
const DEPLOYER = 'd.gartland@c2ken.net';
const TA = 'a.teacher@c2ken.net';
const TB = 'b.teacher@c2ken.net';
const PUPIL = 'aoife.gartland@c2ken.net';

const g = new Gate('qa-two-homes');
g.exempt([
  'cross-pupil behaviour is proved here under mocks, never in the browser: the offline preview has one pupil identity and one staff identity, and that limit is real',
  'the relay hop is exercised sandbox-to-sandbox; the real network is not called'
]);

/* ═════════════════════════════════════ the two server homes ═══════════ */
const TPL = A.app('server/Code.gs.template');
const SECRET = 'mock-shared-secret-value';

/* DATA: execute-as-Me, holds the Sheet and the secret */
const data = makeEnv({ active: PUPIL, effective: DEPLOYER, passcode: PW, props: { relaySecret: SECRET } });
loadTemplate(data, TPL);
data.call('initJotter')();

/* FRONT DOOR: execute-as-User, relays to DATA */
const DATA_URL = 'https://script.google.com/macros/s/MOCK-DATA/exec';
const front = makeEnv({
  active: PUPIL, effective: PUPIL, passcode: PW,
  props: { relaySecret: SECRET, dataUrl: DATA_URL },
  relayTo: (url, params) => {
    let payload = {};
    try { payload = JSON.parse((params && params.payload) || '{}'); } catch (e) {}
    let out;
    try {
      const fn = data.call('apiRelay');
      out = typeof fn === 'function' ? fn(payload) : { ok: false, error: 'no-relay-endpoint' };
    } catch (e) { out = { ok: false, error: 'no-relay-endpoint' }; }
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify(out) };
  }
});
loadTemplate(front, TPL);

/* ═════════════════════════════════════ the offline stub home ══════════ */
function offlineHome() {
  const sandbox = makeWindow();
  vm.createContext(sandbox);
  ['mathcore.js', 'anglecore.js', 'content-angles.js', 'content-algebra.js', 'player.js', 'jotter.js', 'staff.js', 'script.js']
    .forEach(f => {
      const p = A.app(f);
      if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: f });
    });
  return sandbox;
}
let stub;
try { stub = offlineHome(); } catch (e) { stub = null; }
if (!stub || !stub.GJ || !stub.GJ.app) {
  g.fail('offline stub', 'two-homes', 'script.js did not finish booting under the stub sandbox — the second home cannot be executed, so nothing here is proved');
  g.done();
  process.exit(1);
}
const ocall = stub.GJ.app.call;

/* ═════════════════════════════════════ THE MATRIX ═════════════════════ */
const admin = (env, req) => env.call('apiAdmin')(req);

/* --- 'whoami' ---------------------------------------------------------- */
(async () => {
  {
    const s = data.call('apiWhoAmI')();
    const o = await ocall('whoami');
    g.check(s.ok && !!s.email, 'whoami', 'two-homes', 'the server returned no email for a signed-in pupil');
    g.check(o.ok && !!o.email, 'whoami', 'two-homes', 'the offline stub returned no email');
  }

  /* --- 'addClass' — THE FIELD PARITY THAT BROKE LIVE ------------------- */
  {
    data.as(TA);
    const r = admin(data, { passcode: PW, sub: 'addClass', className: '10A Maths' });
    g.check(r.ok && r.name === '10A-Maths', 'addClass', 'two-homes',
      'the server did not accept {className} — the field the client sends and the field the server reads must be the same word (the 18 June live "bad-name")');
    const o = await ocall('admin', { passcode: 'demo', sub: 'addClass', className: 'Parity Test' });
    g.check(o.ok === true, 'addClass', 'two-homes',
      'the offline stub reads a different field name from the server for addClass — the preview passes and the deploy says bad-name (the 18 June live bug)');
    /* the sanitiser is a contract in two places (157a) */
    const r2 = admin(data, { passcode: PW, sub: 'addClass', className: '  10 C  Maths/2  ' });
    g.check(r2.ok && r2.name === '10-C-Maths2', 'addClass', 'two-homes',
      'the server sanitiser gave "' + r2.name + '" — spaces become hyphens and punctuation is dropped; the stub must do the same');
    const o2 = await ocall('admin', { passcode: 'demo', sub: 'addClass', className: '  10 C  Maths/2  ' });
    g.check(o2.ok === false || o2.name === r2.name, 'addClass', 'two-homes',
      'the offline stub sanitised a class name to "' + o2.name + '" where the server gives "' + r2.name + '" — one rule, two homes, one answer');
  }

  /* --- passcode handling ---------------------------------------------- */
  {
    const bad = admin(data, { passcode: 'wrong', sub: 'classes' });
    g.check(bad.error === 'bad-passcode', 'passcode', 'two-homes', 'a wrong passcode was not refused by the server');
    const padded = admin(data, { passcode: '  ' + PW + '  ', sub: 'classes' });
    g.check(padded.ok === true, 'passcode', 'two-homes', 'the server refused a passcode with spaces around it — a passcode typed on a smartboard picks up spaces');
    const obad = await ocall('admin', { passcode: 'wrong', sub: 'classes' });
    g.check(obad.ok === false, 'passcode', 'two-homes', 'the offline stub accepted a wrong passcode');
  }

  /* --- 'setActs' / 'hello' — the tickbox gate, both homes -------------- */
  {
    data.as(TA);
    admin(data, { passcode: PW, sub: 'setActs', className: '10A-Maths', acts: { angles: true, algebra: false } });
    data.as(PUPIL);
    const h = data.call('apiHello')({ classCode: '10A-Maths' });
    g.check(h.ok && h.acts && h.acts.angles === true && h.acts.algebra === false, 'hello', 'two-homes',
      'hello did not return the class\'s own tickboxes — a pupil must never receive an unticked book as openable');
    const sv = data.call('apiSave')({ classCode: '10A-Maths', act: 'algebra', state: '{}', summary: '{}' });
    g.check(sv.ok === false, 'save', 'two-homes',
      'the server saved work for a book this class does not have ticked (' + JSON.stringify(sv) + ') — an unticked book is closed, not hidden');
    const ld = data.call('apiLoad')({ classCode: '10A-Maths', act: 'algebra' });
    g.check(ld.ok === false, 'load', 'two-homes', 'the server served an unticked book\'s state');
    const oh = await ocall('hello', {});
    g.check(oh.ok && oh.acts && typeof oh.acts.angles === 'boolean', 'hello', 'two-homes',
      'the offline stub\'s hello does not return an acts map — the preview would show a shelf the server would refuse');
  }

  /* --- 'save' / 'load' round trip, and the real cell cap --------------- */
  {
    data.as(PUPIL);
    const state = JSON.stringify({ v: 1, qs: { c1: { st: 'ok', L: [{ op: 'rw', t: 'x = 5' }] } } });
    const sv = data.call('apiSave')({ classCode: '10A-Maths', act: 'angles', state, summary: '{"qs":{}}' });
    g.check(sv.ok === true, 'save', 'two-homes', 'a save of a ticked book was refused: ' + JSON.stringify(sv));
    const ld = data.call('apiLoad')({ classCode: '10A-Maths', act: 'angles' });
    g.check(ld.ok && ld.state === state, 'load', 'two-homes', 'the state that came back is not the state that went in');
    const osv = await ocall('save', { act: 'angles', state, summary: '{"qs":{}}' });
    const old = await ocall('load', { act: 'angles' });
    g.check(osv.ok && old.ok && old.state === state, 'save/load', 'two-homes',
      'the offline stub did not round-trip a state that the server round-trips');
  }

  /* --- 'setname' ------------------------------------------------------- */
  {
    data.as(PUPIL);
    const r = data.call('apiSetName')({ name: 'Aoife Gartland' });
    g.check(r.ok === true, 'setname', 'two-homes', 'the server refused a plain name');
    const again = data.call('apiHello')({ classCode: '10A-Maths' });
    g.check(again.name === 'Aoife Gartland', 'setname', 'two-homes', 'the name did not survive to the next hello');
    const o = await ocall('setname', { name: 'Aoife Gartland' });
    g.check(o.ok === true, 'setname', 'two-homes', 'the offline stub refused a plain name');
  }

  /* --- 'override' — the pencil/ink contract ---------------------------- */
  {
    data.as(TA);
    const r = admin(data, { passcode: PW, sub: 'override', className: '10A-Maths', act: 'angles', email: PUPIL, q: 'c1', idx: 'q', val: 1 });
    g.check(r.ok === true, 'override', 'two-homes', 'the server refused the ink contract {q, idx:"q", val:1}: ' + JSON.stringify(r));
    const jt = admin(data, { passcode: PW, sub: 'jotter', className: '10A-Maths', act: 'angles', email: PUPIL });
    let st = null; try { st = JSON.parse(jt.state || '{}'); } catch (e) {}
    /* the stored shape is `ovr: { q: 1 }` — a map keyed by what was inked, so a
       future per-unit annotation cannot collide with the question's own verdict */
    g.check(st && st.qs && st.qs.c1 && st.qs.c1.ovr && st.qs.c1.ovr.q === 1, 'override', 'two-homes',
      'the inked verdict is not in the pupil\'s stored record where the markbook reads it back');
    const clear = admin(data, { passcode: PW, sub: 'override', className: '10A-Maths', act: 'angles', email: PUPIL, q: 'c1', idx: 'q', val: null });
    g.check(clear.ok === true, 'override', 'two-homes', 'the server refused "use the app\'s mark" (val:null)');
    const o = await ocall('admin', { passcode: 'demo', sub: 'override', className: 'demo', act: 'angles', email: 'you@offline.preview', q: 'c1', idx: 'q', val: 1 });
    g.check(o.ok === true, 'override', 'two-homes', 'the offline stub does not implement the ink contract the server implements');
  }

  /* --- 'nudge' — one shot, cleared on delivery ------------------------- */
  {
    data.as(TA);
    /* the nudge carries "<section>::<question>" — rule 10: a nudge names the
       question it is about, not just the exercise (the 25 June fix) */
    const n = admin(data, { passcode: PW, sub: 'nudge', className: '10A-Maths', act: 'angles', email: PUPIL, sec: 's1::c1' });
    g.check(n.ok === true, 'nudge', 'two-homes', 'the server refused a nudge');
    data.as(PUPIL);
    const first = data.call('apiLoad')({ classCode: '10A-Maths', act: 'angles' });
    g.check(!!first.nudge && /::/.test(String(first.nudge)), 'nudge', 'two-homes',
      'the nudge was not delivered on the next load naming its question — a nudge that lands on Q1 instead of the question is the 25 June fault');
    const second = data.call('apiLoad')({ classCode: '10A-Maths', act: 'angles' });
    g.check(!second.nudge, 'nudge', 'two-homes', 'the nudge was delivered twice — a nudge is one shot, cleared as it is read');
    const o = await ocall('admin', { passcode: 'demo', sub: 'nudge', className: 'demo', act: 'angles', email: 'you@offline.preview', sec: 's1::c1' });
    g.check(o.ok === true, 'nudge', 'two-homes', 'the offline stub does not implement nudge');
  }

  /* --- 'deleteClass' deletes only that class's rows -------------------- */
  {
    data.as(TA);
    admin(data, { passcode: PW, sub: 'addClass', className: 'Throwaway' });
    admin(data, { passcode: PW, sub: 'setActs', className: 'Throwaway', acts: { angles: true, algebra: true } });
    data.as(PUPIL);
    data.call('apiSave')({ classCode: 'Throwaway', act: 'angles', state: '{"v":1}', summary: '{}' });
    const before = data.dataSheet.getLastRow();
    data.as(TA);
    admin(data, { passcode: PW, sub: 'deleteClass', className: 'Throwaway' });
    const after = data.dataSheet.getLastRow();
    g.check(after < before, 'deleteClass', 'two-homes', 'deleting a class left its rows behind');
    const survivor = data.call('apiLoad');
    data.as(PUPIL);
    const keep = data.call('apiLoad')({ classCode: '10A-Maths', act: 'angles' });
    g.check(keep.ok === true, 'deleteClass', 'two-homes', 'deleting one class removed another class\'s rows');
  }

  /* --- 'wall' — the markbook's own read, in both homes ------------------ */
  {
    data.as(TA);
    const w = admin(data, { passcode: PW, sub: 'wall', className: '10A-Maths', act: 'angles' });
    g.check(w.ok === true && Array.isArray(w.pupils), 'wall', 'two-homes',
      'the server refused the class read the markbook polls every twenty seconds: ' + JSON.stringify(w).slice(0, 90));
    const ow = await ocall('admin', { passcode: 'demo', sub: 'wall', className: 'demo', act: 'angles' });
    g.check(ow.ok === true && Array.isArray(ow.pupils), 'wall', 'two-homes',
      'the offline stub does not answer the class read the server answers — the preview would show a markbook the deploy could not');
  }

  /* --- 'call' — the relay's own front door, exercised end to end ------- */
  {
    const src = A.read(TPL);
    g.check(/function\s+apiCall/.test(src), 'call', 'two-homes',
      'there is no apiCall on the front door — the client has nothing to call, and every data call would have to reach the data deployment directly');
    front.state.active = PUPIL;
    const r = front.call('apiCall')({ action: 'hello', payload: { classCode: '10A-Maths' } });
    g.check(r && r.ok === true, 'call', 'two-homes',
      'a call through the front door did not come back: ' + JSON.stringify(r));
    g.check(JSON.stringify(r || {}).indexOf(SECRET) < 0, 'call', 'two-homes',
      'the shared secret came back through the relay — a secret the client can see is not a secret');
  }

  /* --- 'classes' / scoping — the twenty assertions, absorbed ----------- */
  {
    const scoping = require('child_process');
    let out = '', ok = true;
    try { out = scoping.execFileSync(process.execPath, [A.app('dev/test-server-scoping.js')], { cwd: A.APP, encoding: 'utf8' }); }
    catch (e) { ok = false; out = (e.stdout || '') + (e.stderr || ''); }
    const n = Number((/(\d+) passed/.exec(out) || [])[1] || 0);
    g.check(ok && n >= 20, 'classes/scoping', 'two-homes',
      'only ' + n + ' of the twenty per-teacher scoping assertions passed — a passcode holder could reach another teacher\'s class');
  }

  /* --- THE RELAY (v4 §7) ---------------------------------------------- */
  {
    const src = A.read(TPL);
    const hasRelay = /function\s+apiRelay/.test(src);
    const hasSecret = /relaySecret/.test(src);
    g.check(hasRelay, 'relay', 'two-homes',
      'the data deployment has no apiRelay endpoint — the front door has nothing to relay to (MATHS_V4_DESIGN §7)');
    g.check(hasSecret, 'relay', 'two-homes',
      'the server template names no shared secret — the data deployment would trust any caller that reached it');
    if (hasRelay && hasSecret) {
      const relay = data.call('apiRelay');
      const naked = relay({ action: 'hello', payload: { classCode: '10A-Maths' } });
      g.check(naked && naked.ok === false && /secret/.test(String(naked.error)), 'relay', 'two-homes',
        'the data deployment accepted a call with no secret — the only thing standing between a pupil and every class is that secret');
      const wrong = relay({ secret: 'not-the-secret', email: PUPIL, action: 'hello', payload: { classCode: '10A-Maths' } });
      g.check(wrong && wrong.ok === false, 'relay', 'two-homes',
        'the data deployment accepted a call with the WRONG secret');
      const good = relay({ secret: SECRET, email: PUPIL, action: 'hello', payload: { classCode: '10A-Maths' } });
      g.check(good && good.ok === true, 'relay', 'two-homes',
        'the data deployment refused a properly relayed call: ' + JSON.stringify(good));
      /* the secret must never come back out */
      const seen = JSON.stringify(good || {});
      g.check(seen.indexOf(SECRET) < 0, 'relay', 'two-homes',
        'the shared secret appears in a value the client can read — a secret that reaches the browser is not a secret');
    }
    /* the front door's own laws */
    const fdGet = /function\s+doGet/.test(src) && /autoName_/.test(src);
    g.check(fdGet, 'front door', 'two-homes', 'doGet does not read the pupil\'s own name — the first visit would not know who she is');
    front.state.active = PUPIL;
    const nm = front.call('autoName_')();
    g.check(nm === 'Aoife Gartland', 'front door', 'two-homes',
      'autoName_ returned "' + nm + '" — the full name is given_name + family_name from the pupil\'s own token');
    front.state.oidc = { given_name: '', family_name: '' };
    const empty = front.call('autoName_')();
    g.check(empty === '', 'front door', 'two-homes',
      'autoName_ invented a name when the account has none — the cover falls back to a typed name, it never guesses');
    front.state.oidc = { given_name: 'Aoife', family_name: 'Gartland' };
  }

  /* --- the secret is nowhere a client can see it ----------------------- */
  {
    const built = A.app('server/Index.html');
    if (A.exists(built)) {
      const html = A.read(built);
      g.check(!/relaySecret/.test(html), 'built Index.html', 'two-homes',
        'the shared secret\'s property name is in the built artefact — anything in Index.html is in every pupil\'s browser');
    }
  }

  /* --- the quota arithmetic, reported --------------------------------- */
  {
    const savesPerPupil = 12, pollsPerTeacher = 3 * 60 / 20 * 5;
    const perClass = 30 * savesPerPupil + pollsPerTeacher;
    g.note('relay arithmetic: ~' + perClass + ' UrlFetch calls per class-period (30 pupils); at 3 concurrent classes all day that is ~' +
      (perClass * 3 * 5) + ' against a ~20,000/day quota');
  }

  g.done();
})().catch(e => {
  console.log('  FAIL  qa-two-homes x crash: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
