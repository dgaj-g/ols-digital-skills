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
  { id: 'data-serves-unticked-book', kind: 'fixture', plant: 'fixture-data-no-tickgate', mustFail: /unticked/ },
  { id: 'secret-in-a-return-value', kind: 'fixture', plant: 'fixture-server-secret-leak', mustFail: /the shared secret/ },
  /* the 9 Sept fault, planted back: a Config read on the pupil's own page */
  { id: 'front-door-touches-the-sheet', kind: 'fixture', plant: 'fixture-front-door-reads-sheet', mustFail: /touched the Sheet as a pupil/ },
  /* THE STORE CUT (ruling 51, 12 Sept 2026): the page's own road to DATA */
  { id: 'token-any-signature', kind: 'fixture', plant: 'fixture-token-any-sig', mustFail: /forged/ },
  { id: 'token-never-expires', kind: 'fixture', plant: 'fixture-token-never-expires', mustFail: /expired token/ },
  { id: 'token-for-another-pupil', kind: 'fixture', plant: 'fixture-token-unsigned-email', mustFail: /another pupil/ },
  { id: 'secret-in-the-page', kind: 'fixture', plant: 'fixture-boot-carries-secret', mustFail: /secret .* served page/ },
  { id: 'relay-with-bearer', kind: 'fixture', plant: 'fixture-relay-bearer', mustFail: /bearer/ },
  { id: 'store-payload-disagrees', kind: 'fixture', plant: 'fixture-store-payload-drift', mustFail: /two roads/ },
  /* TWO PROJECTS (Book A's cut, 12 Sept 2026): the act list comes from the
     Config row, validated, and every Sheet read goes through ss_() so the same
     Code.gs runs in a STANDALONE DATA project with no active spreadsheet */
  { id: 'acts-hardcoded', kind: 'fixture', plant: 'fixture-acts-hardcoded', mustFail: /still answered bad-act/ },
  { id: 'acts-any-string', kind: 'fixture', plant: 'fixture-acts-any-string', mustFail: /junk id/ },
  { id: 'active-spreadsheet-call-site', kind: 'fixture', plant: 'fixture-active-spreadsheet', mustFail: /STANDALONE/ },
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

/* ONE FILE, TWO HOMES - AND NOW TWO PROJECTS (Book A's cut, 12 Sept 2026).
   The DATA code moves to a STANDALONE Apps Script project so its manifest can
   rest at USER_DEPLOYING + ANYONE forever and the front door's at
   USER_ACCESSING + DOMAIN forever - no flip, no hands, per cut. A standalone
   script has NO active spreadsheet: SpreadsheetApp.getActiveSpreadsheet() gives
   nothing, and the code must open the Sheet BY ID from the `sheetId` script
   property (ss_()). makeWorld wraps makeEnv with the two things mockenv does
   not model: an openById that answers ONLY the id the world was built with
   (and refuses a pupil, exactly as getActiveSpreadsheet does), and a
   `standalone:true` variant whose getActiveSpreadsheet throws. */
function makeWorld(o) {
  const env = makeEnv(o);
  const SA = env.sandbox.SpreadsheetApp;
  const ss = {
    getSheetByName: (n) => (n === 'Config' ? env.configSheet : n === 'Data' ? env.dataSheet : null),
    insertSheet: (n) => (n === 'Config' ? env.configSheet : env.dataSheet)
  };
  env.state.openById = 0;
  env.state.activeCalls = 0;
  SA.openById = (id) => {
    env.state.openById++;
    if (o.sheetAccess === false) throw new Error('You do not have permission to access the requested document.');
    if (!o.sheetId || String(id) !== String(o.sheetId)) throw new Error('Unexpected error while getting the method or property openById on object SpreadsheetApp. (no Sheet with id ' + JSON.stringify(id) + ')');
    return ss;
  };
  if (o.standalone) {
    const was = SA.getActiveSpreadsheet;
    SA.getActiveSpreadsheet = () => {
      env.state.activeCalls++;
      /* the real API returns null here and the next .getSheetByName is a
         TypeError; the mock throws by name so the sentence says what happened */
      throw new Error('getActiveSpreadsheet() returned null: a standalone script has no active spreadsheet');
    };
    void was;
  }
  return env;
}

/* DATA: execute-as-Me, holds the Sheet and the secret - the BOUND home
   (sheetId unset, so ss_() falls back to the active spreadsheet) */
const data = makeWorld({ active: PUPIL, effective: DEPLOYER, passcode: PW, props: { relaySecret: SECRET } });
loadTemplate(data, TPL);
data.call('initJotter')();

/* DATA, STANDALONE: the same file in a project with no bound Sheet. sheetId is
   the script property; the world answers openById for that id and nothing else */
const SHEET_ID = '1xVDBKmPP83MMZPqpPJr0GQRR0N9estf9ebhKyhGQd0Y';
const solo = makeWorld({
  active: PUPIL, effective: DEPLOYER, passcode: PW, standalone: true, sheetId: SHEET_ID,
  props: { relaySecret: SECRET, sheetId: SHEET_ID }
});
loadTemplate(solo, TPL);

/* FRONT DOOR: execute-as-User, relays to DATA */
const DATA_URL = 'https://script.google.com/macros/s/MOCK-DATA/exec';
const front = makeWorld({
  active: PUPIL, effective: PUPIL, passcode: PW, sheetAccess: false,
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
    /* THE PAGE IS SERVED TO A PUPIL WHO CANNOT OPEN THE SHEET. Executed, not
       grepped: doGet runs in the front-door world, whose SpreadsheetApp throws
       the permission error a pupil really gets. On 9 Sept 2026 the deployed
       doGet read a Config value through getName_ and every pupil on every
       class link met "You do not have permission to access the requested
       document" - the deployer never did, because the Sheet is his. */
    front.state.active = PUPIL;
    let served = null, refused = null;
    try { served = front.call('doGet')({ parameter: { class: '10A-Maths' } }); } catch (e) { refused = String(e && e.message || e); }
    g.check(!refused, 'front door', 'two-homes',
      'the front door touched the Sheet as a pupil: doGet threw "' + refused + '" - under execute-as-User the Sheet is the deployer\'s and every pupil is refused; anything that needs it goes through the relay');
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

  /* --- THE STORE TOKEN (ruling 51, the store cut, 12 Sept 2026) ---------
     The page talks to DATA directly with a token doGet minted for it. Every
     claim below is EXECUTED in the two sandboxes: the front door mints, DATA
     verifies, and the secret is looked for everywhere a browser could read. */
  {
    const src = A.read(TPL);
    front.state.active = PUPIL;
    /* the served page carries the token, and the token carries no secret */
    let page = null, boot = null;
    try { page = front.call('doGet')({ parameter: { class: '10A-Maths' } }).getContent(); } catch (e) { page = ''; }
    try { boot = JSON.parse((/data-boot="([^"]*)"/.exec(page) || [])[1].replace(/&quot;/g, '"')); } catch (e) { boot = null; }
    g.check(!!(boot && boot.storeUrl === DATA_URL && boot.storeSig && Number(boot.storeExp) > Math.floor(Date.now() / 1000)),
      'doGet', 'two-homes',
      'the served page carries no usable store token (BOOT.store: url, exp, sig) — the page would have to relay every call through the front door, the hop this cut removes: ' + JSON.stringify(boot));
    g.check(page.indexOf(SECRET) < 0 && !/relaySecret/.test(page), 'doGet', 'two-homes',
      'the shared secret is in the served page — anything doGet prints is in every pupil\'s browser (the store token is a SIGNATURE under the secret, never the secret)');
    const good = boot ? { email: PUPIL, exp: Number(boot.storeExp), sig: boot.storeSig } : null;
    if (good) {
      const relay = data.call('apiRelay');
      /* the same answer down both roads */
      const viaSecret = relay({ secret: SECRET, email: PUPIL, action: 'hello', payload: { classCode: '10A-Maths' } });
      const viaToken = relay({ email: good.email, exp: good.exp, sig: good.sig, action: 'hello', payload: { classCode: '10A-Maths' } });
      g.check(viaToken && viaToken.ok === true && JSON.stringify(viaToken) === JSON.stringify(viaSecret), 'doPost', 'two-homes',
        'the direct path (token) did not get the same answer as the relay (secret) for the same call: ' + JSON.stringify(viaToken).slice(0, 120));
      const sv = relay({ email: good.email, exp: good.exp, sig: good.sig, action: 'save', payload: { classCode: '10A-Maths', act: 'angles', state: '{"v":1,"qs":{}}', summary: '{}' } });
      g.check(sv && sv.ok === true && sv.saved === true, 'doPost', 'two-homes',
        'a save down the direct path was refused: ' + JSON.stringify(sv));
      /* a forged signature */
      const forged = relay({ email: good.email, exp: good.exp, sig: good.sig.slice(0, -2) + 'AA', action: 'hello', payload: { classCode: '10A-Maths' } });
      g.check(forged && forged.ok === false && forged.error === 'token-bad', 'doPost', 'two-homes',
        'a forged signature was accepted by the store (' + JSON.stringify(forged).slice(0, 80) + ') — anyone who found the URL could name any pupil');
      const noSig = relay({ email: good.email, exp: good.exp, action: 'hello', payload: { classCode: '10A-Maths' } });
      g.check(noSig && noSig.ok === false, 'doPost', 'two-homes',
        'a call with neither the secret nor a signature was answered — a forged (absent) signature opened the store');
      /* a token for one pupil, presented as another: the signature covers the
         email, so the swap must read as forged */
      const swapped = relay({ email: TA, exp: good.exp, sig: good.sig, action: 'hello', payload: { classCode: '10A-Maths' } });
      g.check(swapped && swapped.ok === false && swapped.error === 'token-bad', 'doPost', 'two-homes',
        'a token minted for one pupil was accepted for another pupil\'s email — the signature must cover the email, or any pupil can act as any other');
      /* an expired token, minted honestly, is refused by name */
      const oldExp = Math.floor(Date.now() / 1000) - 60;
      const oldSig = front.call('storeSign_')(PUPIL, oldExp, SECRET);
      const expired = relay({ email: PUPIL, exp: oldExp, sig: oldSig, action: 'hello', payload: { classCode: '10A-Maths' } });
      g.check(expired && expired.ok === false && expired.error === 'token-expired', 'doPost', 'two-homes',
        'an expired token was not refused as token-expired (' + JSON.stringify(expired).slice(0, 80) + ') — a token is eight hours of being herself, not forever');
      /* the token's email, not the body's: the signature is over the email as
         given, and DATA trusts only that */
      const whoami = relay({ email: good.email, exp: good.exp, sig: good.sig, action: 'whoami', payload: {} });
      g.check(whoami && whoami.ok && String(whoami.email).toLowerCase() === PUPIL.toLowerCase(), 'doPost', 'two-homes',
        'the store answered a token call as somebody other than the token\'s own pupil: ' + JSON.stringify(whoami));
      /* a fresh token on request, minted on the front door with no hop */
      const before = front.state.fetches.length;
      const fresh = front.call('apiCall')({ action: 'token' });
      g.check(fresh && fresh.ok && fresh.store && fresh.store.url === DATA_URL && fresh.store.sig && fresh.store.exp > Math.floor(Date.now() / 1000),
        'apiCall token', 'two-homes',
        'apiCall({action:"token"}) did not answer with a fresh store token — a token that expires mid-lesson would strand her on the relay: ' + JSON.stringify(fresh).slice(0, 120));
      g.check(front.state.fetches.length === before, 'apiCall token', 'two-homes',
        'the token request made a UrlFetch — a fresh token is minted on the front door itself, with no hop');
      g.check(JSON.stringify(fresh || {}).indexOf(SECRET) < 0, 'apiCall token', 'two-homes',
        'the shared secret came back with the fresh token');
      const freshOk = relay({ email: fresh.store.email, exp: fresh.store.exp, sig: fresh.store.sig, action: 'whoami', payload: {} });
      g.check(freshOk && freshOk.ok === true, 'apiCall token', 'two-homes',
        'the fresh token the front door minted is not accepted by the store: ' + JSON.stringify(freshOk));
    }
    /* NO BEARER on the relay (S4): with it, two of three probes came back 404 */
    front.state.fetches.length = 0;
    front.call('apiCall')({ action: 'hello', payload: { classCode: '10A-Maths' } });
    const relayed = front.state.fetches.filter(x => x.url === DATA_URL);
    const bearer = relayed.some(x => x.params && x.params.headers && /Authorization/i.test(Object.keys(x.params.headers).join(',')));
    g.check(relayed.length === 1 && !bearer, 'apiCall', 'two-homes',
      'the relay still sends a bearer to the DATA web app — measured 12 Sept 2026: with it two of three POSTs were answered 404 (which apiCall turns into relay-failed); without it, three of three were 200');
    /* the direct path is on the page's own road: script.js calls the store
       when BOOT.store exists and falls back to the relay */
    const js = A.read(A.app('script.js'));
    g.check(/BOOT\.store/.test(js) && /fetch\(/.test(js) && /'token-expired'/.test(js), 'script.js', 'two-homes',
      'script.js does not call the store directly with BOOT.store — every call still takes the 3-68 s relay hop');
  }

  /* --- ONE PAYLOAD, TWO ROADS: the shim's shaping and script.js's agree --- */
  {
    /* the transport shim is a template string inside server/build-pathb.js;
       it is evaluated here with google.script.run stubbed to capture what it
       would send, and compared with GJ.app.storePayload for every action */
    const bp = A.read(A.app('server/build-pathb.js'));
    const m = /const shim = `([\s\S]*?)`;/.exec(bp);
    let shimOk = false, drift = [];
    if (m && stub.GJ.app.storePayload) {
      const sb = { window: {}, Promise, Error };
      sb.window.OLS_BOOT = { name: 'Aoife Gartland' };
      vm.createContext(sb);
      vm.runInContext(m[1], sb);
      const samples = [
        { action: 'whoami' },
        { action: 'hello', classCode: '10A-Maths' },
        { action: 'load', classCode: '10A-Maths', act: 'angles' },
        { action: 'save', classCode: '10A-Maths', act: 'angles', state: '{"v":1}', summary: '{}' },
        { action: 'setname', classCode: '10A-Maths', name: 'Aoife' },
        { action: 'admin', classCode: '10A-Maths', passcode: 'x', sub: 'override', className: '10A-Maths', acts: { angles: true }, act: 'angles', email: PUPIL, q: 'c1', idx: 'q', val: 1, sec: 's1::c1' }
      ];
      shimOk = true;
      for (const p of samples) {
        let sent = null;
        sb.google = { script: { run: { withSuccessHandler() { return this; }, withFailureHandler() { return this; }, apiCall(x) { sent = x; } } } };
        sb.window.OLS_BOOT.name = 'Aoife Gartland';
        sb.window.OLS_TRANSPORT.call(Object.assign({}, p));
        stub.GJ.app.boot.name = 'Aoife Gartland';
        const mine = stub.GJ.app.storePayload(Object.assign({}, p));
        if (!sent || JSON.stringify(sent.payload) !== JSON.stringify(mine)) drift.push(p.action + ': shim=' + JSON.stringify(sent && sent.payload) + ' direct=' + JSON.stringify(mine));
      }
    }
    g.check(shimOk && drift.length === 0, 'storePayload', 'two-homes',
      'the two roads to the store carry different payloads for the same call — the shim (server/build-pathb.js) and script.js storePayload must shape one payload, or the fallback silently sends a different request: ' + drift.join('; '));
  }

  /* --- TWO PROJECTS (Book A's cut, 12 Sept 2026) ------------------------
     (1) THE SHEET BY ID. The same Code.gs runs in a STANDALONE DATA project:
         every Sheet read goes through ss_(), which opens the `sheetId` script
         property by id and falls back to the active spreadsheet only when the
         property is unset (the bound front-door project). Executed: the whole
         DATA-side matrix, through apiRelay, in a world whose
         getActiveSpreadsheet THROWS.
     (2) ACTS FROM THE CONFIG SHEET. A book is a Config row edit, not a server
         change: the row `acts` (Value = a JSON array of ids) is UNIONED with the
         built-ins, validated and de-duplicated; a malformed row falls back to
         the built-ins; a junk id never reaches the live list. A book still
         arrives UNTICKED. acts_() reads the Sheet, so it runs only on the DATA
         side - the pupil's doGet is executed with no Sheet at all (above). */
  {
    const src = A.read(TPL);
    const S = (name) => solo.call(name);
    /* every call is caught: a throw is a named failure, never a crash */
    const R = (body) => { try { return S('apiRelay')(body); } catch (e) { return { ok: false, error: 'threw', threw: String(e && e.message || e) }; } };
    const asTA = (action, payload) => R({ secret: SECRET, email: TA, action, payload });
    const asPupil = (action, payload) => R({ secret: SECRET, email: PUPIL, action, payload });
    const say = (label, r) => 'in the STANDALONE DATA project ' + label + ' failed: ' + JSON.stringify(r).slice(0, 160) +
      ' - a call site still reaches SpreadsheetApp.getActiveSpreadsheet() directly (a standalone script has none); every Sheet read goes through ss_() and the sheetId property';

    let initErr = null;
    try { S('initJotter')(); } catch (e) { initErr = String(e && e.message || e); }
    g.check(!initErr, 'standalone', 'two-homes', say('initJotter', { threw: initErr }));
    g.check(solo.state.openById > 0, 'standalone', 'two-homes',
      'in the STANDALONE DATA project nothing opened the Sheet by id - ss_() must read the sheetId script property and call SpreadsheetApp.openById with it');
    g.check(data.state.openById === 0, 'bound', 'two-homes',
      'the BOUND project (sheetId unset) called openById ' + data.state.openById + ' time(s) - with no sheetId property ss_() must fall back to getActiveSpreadsheet, or the front-door project cannot run this file');

    /* the DATA-side matrix, every action, in the standalone world */
    const add = asTA('admin', { passcode: PW, sub: 'addClass', className: '10A Maths' });
    g.check(add.ok === true && add.name === '10A-Maths', 'standalone', 'two-homes', say('addClass', add));
    const older = asTA('admin', { passcode: PW, sub: 'addClass', className: 'Older' });
    g.check(older.ok === true, 'standalone', 'two-homes', say('addClass Older', older));
    const st = asTA('admin', { passcode: PW, sub: 'setActs', className: '10A-Maths', acts: { angles: true, algebra: false } });
    g.check(st.ok === true && st.acts && st.acts.angles === true && st.acts.algebra === false, 'standalone', 'two-homes', say('setActs', st));
    const h = asPupil('hello', { classCode: '10A-Maths' });
    g.check(h.ok === true && h.acts && h.acts.angles === true, 'standalone', 'two-homes', say('hello', h));
    const state = JSON.stringify({ v: 1, qs: { c1: { st: 'ok', L: [{ op: 'rw', t: 'x = 5' }] } } });
    const sv = asPupil('save', { classCode: '10A-Maths', act: 'angles', state, summary: '{"qs":{}}' });
    g.check(sv.ok === true && sv.saved === true, 'standalone', 'two-homes', say('save', sv));
    const ld = asPupil('load', { classCode: '10A-Maths', act: 'angles' });
    g.check(ld.ok === true && ld.state === state, 'standalone', 'two-homes', say('load', ld));
    const sn = asPupil('setname', { name: 'Aoife Gartland' });
    g.check(sn.ok === true, 'standalone', 'two-homes', say('setname', sn));
    const w = asTA('admin', { passcode: PW, sub: 'wall', className: '10A-Maths', act: 'angles' });
    g.check(w.ok === true && Array.isArray(w.pupils) && w.pupils.length === 1 && w.pupils[0].name === 'Aoife Gartland', 'standalone', 'two-homes', say('wall', w));
    const jt = asTA('admin', { passcode: PW, sub: 'jotter', className: '10A-Maths', act: 'angles', email: PUPIL });
    g.check(jt.ok === true && jt.state === state, 'standalone', 'two-homes', say('jotter', jt));
    const ov = asTA('admin', { passcode: PW, sub: 'override', className: '10A-Maths', act: 'angles', email: PUPIL, q: 'c1', idx: 'q', val: 1 });
    g.check(ov.ok === true, 'standalone', 'two-homes', say('override', ov));
    const nd = asTA('admin', { passcode: PW, sub: 'nudge', className: '10A-Maths', act: 'angles', email: PUPIL, sec: 's1::c1' });
    g.check(nd.ok === true, 'standalone', 'two-homes', say('nudge', nd));
    const ld2 = asPupil('load', { classCode: '10A-Maths', act: 'angles' });
    g.check(ld2.ok === true && ld2.nudge === 's1::c1', 'standalone', 'two-homes', say('load (nudge delivered)', ld2));
    const cl = asTA('admin', { passcode: PW, sub: 'classes' });
    g.check(cl.ok === true && (cl.classes || []).some(c => c.name === '10A-Maths' && c.count === 1), 'standalone', 'two-homes', say('classes', cl));
    asTA('admin', { passcode: PW, sub: 'addClass', className: 'Throwaway' });
    const del = asTA('admin', { passcode: PW, sub: 'deleteClass', className: 'Throwaway' });
    g.check(del.ok === true, 'standalone', 'two-homes', say('deleteClass', del));
    /* the same secret in two projects: a token the FRONT DOOR minted verifies
       in the standalone store, so the split changes nothing the page can see */
    const tk = front.call('storeToken_')(PUPIL);
    const viaToken = tk ? R({ email: tk.email, exp: tk.exp, sig: tk.sig, action: 'whoami', payload: {} }) : null;
    g.check(viaToken && viaToken.ok === true && String(viaToken.email).toLowerCase() === PUPIL.toLowerCase(), 'standalone', 'two-homes',
      'a store token minted by the front door was not accepted by the STANDALONE DATA project: ' + JSON.stringify(viaToken) + ' - the two projects share one relaySecret, and the token is the page\'s only key');
    g.check(solo.state.activeCalls === 0, 'standalone', 'two-homes',
      'in the STANDALONE DATA project getActiveSpreadsheet() was reached ' + solo.state.activeCalls + ' time(s) - a call site bypasses ss_()');

    /* (2) THE CONFIG ROW `acts` */
    const BUILTIN = ['angles', 'algebra', 'stats-quartiles'];
    const fresh = () => { try { S('ACTS_LIVE = null'); } catch (e) {} };
    const setRow = (v) => { try { S('setConfig_')('acts', v); } catch (e) { g.fail('acts row', 'two-homes', 'in the STANDALONE DATA project setConfig_ threw writing the acts row: ' + String(e && e.message || e)); } fresh(); };
    const liveActs = () => { try { fresh(); return S('acts_')(); } catch (e) { return { threw: String(e && e.message || e) }; } };
    const keysOf = (o) => Object.keys(o || {}).sort().join(',');
    const hasActs = /function\s+acts_\s*\(/.test(src);
    g.check(hasActs, 'acts row', 'two-homes',
      'there is no acts_() in the template - the act whitelist is still the hard-coded array, so every new book is a server change (a version cut of the DATA project) instead of one Config row');
    g.check(!/\bACTS\.indexOf\(|for \(var si = 0; si < ACTS\.length/.test(src), 'acts row', 'two-homes',
      'actOk_ or apiHello still reads the built-in ACTS array directly - every whitelist read must go through acts_() so the Config row counts everywhere');

    /* before the row exists: built-ins work, a row-only book is refused */
    setRow('');
    const noRowTick = asTA('admin', { passcode: PW, sub: 'setActs', className: '10A-Maths', acts: { angles: true, 'stats-collect': true } });
    g.check(noRowTick.ok === true && !('stats-collect' in (noRowTick.acts || {})), 'acts row', 'two-homes',
      'with NO acts row the server let a class tick "stats-collect" (' + JSON.stringify(noRowTick.acts) + ') - a book the server does not know cannot be ticked; the row is what names it');
    const noRowSave = asPupil('save', { classCode: '10A-Maths', act: 'stats-collect', state: '{"v":1,"qs":{}}', summary: '{}' });
    g.check(noRowSave.ok === false && noRowSave.error === 'bad-act', 'acts row', 'two-homes',
      'with NO acts row a save under "stats-collect" was answered ' + JSON.stringify(noRowSave).slice(0, 80) + ' - a book nobody has named is bad-act');
    const noRowBuiltin = asPupil('save', { classCode: '10A-Maths', act: 'angles', state, summary: '{}' });
    g.check(noRowBuiltin.ok === true, 'acts row', 'two-homes',
      'with NO acts row a built-in book was refused: ' + JSON.stringify(noRowBuiltin).slice(0, 80) + ' - the app must work before the row exists');
    g.check(keysOf(asPupil('hello', { classCode: '10A-Maths' }).acts) === BUILTIN.slice().sort().join(','), 'acts row', 'two-homes',
      'with NO acts row hello\'s acts map is not exactly the built-ins');

    /* the row names Book A: it is accepted, and only then */
    setRow('["stats-collect"]');
    const rowTick = asTA('admin', { passcode: PW, sub: 'setActs', className: '10A-Maths', acts: { angles: true, 'stats-collect': true } });
    g.check(rowTick.ok === true && rowTick.acts && rowTick.acts['stats-collect'] === true, 'acts row', 'two-homes',
      'the Config row `acts` names "stats-collect" and setActs still dropped it (' + JSON.stringify(rowTick.acts) + ') - coerceActs_ must derive its keys from acts_(), the union of the built-ins and the row');
    const rowSave = asPupil('save', { classCode: '10A-Maths', act: 'stats-collect', state: '{"v":1,"qs":{}}', summary: '{}' });
    g.check(rowSave.ok === true && rowSave.saved === true, 'acts row', 'two-homes',
      'the Config row `acts` names "stats-collect" and the server still answered bad-act (' + JSON.stringify(rowSave).slice(0, 80) + ') - a book is a Config row edit now, not a server change; acts_() must read the row');
    const rowLoad = asPupil('load', { classCode: '10A-Maths', act: 'stats-collect' });
    g.check(rowLoad.ok === true && /"v":1/.test(String(rowLoad.state)), 'acts row', 'two-homes',
      'the Config row names "stats-collect" and load still refused it: ' + JSON.stringify(rowLoad).slice(0, 80));
    const rowBuiltin = asPupil('save', { classCode: '10A-Maths', act: 'angles', state, summary: '{}' });
    g.check(rowBuiltin.ok === true, 'acts row', 'two-homes',
      'with the acts row present a built-in book was refused: ' + JSON.stringify(rowBuiltin).slice(0, 80) + ' - the row is UNIONED with the built-ins, it never replaces them');
    const rowHello = asPupil('hello', { classCode: '10A-Maths' });
    g.check(keysOf(rowHello.acts) === BUILTIN.concat(['stats-collect']).sort().join(','), 'acts row', 'two-homes',
      'hello\'s acts map is ' + keysOf(rowHello.acts) + ' - it must be exactly the union of the built-ins and the row');
    g.check(rowHello.summaries && ('stats-collect' in rowHello.summaries) && rowHello.summaries['stats-collect'] && typeof rowHello.summaries['stats-collect'] === 'object', 'acts row', 'two-homes',
      'hello\'s summaries carry no "stats-collect" entry after a save under it - apiHello still seeds its summaries from the built-in array');
    /* the wall reads the new book too */
    const rowWall = asTA('admin', { passcode: PW, sub: 'wall', className: '10A-Maths', act: 'stats-collect' });
    g.check(rowWall.ok === true && (rowWall.pupils || []).length === 1, 'acts row', 'two-homes',
      'the markbook cannot read the row-named book: ' + JSON.stringify(rowWall).slice(0, 80));
    /* A BOOK STILL ARRIVES UNTICKED: the class made before the row shows it OFF */
    const olderHello = asPupil('hello', { classCode: 'Older' });
    g.check(olderHello.ok === true && olderHello.acts && olderHello.acts['stats-collect'] === false, 'acts row', 'two-homes',
      'a class that predates the row shows "stats-collect" as ' + JSON.stringify(olderHello.acts && olderHello.acts['stats-collect']) + ' - a new book arrives UNTICKED (an absent key reads false), whether it came from the array or the row');
    const olderSave = asPupil('save', { classCode: 'Older', act: 'stats-collect', state: '{"v":1,"qs":{}}', summary: '{}' });
    g.check(olderSave.ok === false && olderSave.error === 'not-set', 'acts row', 'two-homes',
      'an UNTICKED row-named book was answered ' + JSON.stringify(olderSave).slice(0, 80) + ' - known to the server (not bad-act) but closed for this class (not-set)');
    /* the union, de-duplicated, in built-in order then row order */
    setRow('["angles", "stats-collect", "stats-collect", "stats-averages"]');
    const dup = liveActs();
    g.check(Array.isArray(dup) && dup.join(',') === 'angles,algebra,stats-quartiles,stats-collect,stats-averages', 'acts row', 'two-homes',
      'acts_() gave ' + JSON.stringify(dup) + ' for a row repeating a built-in and itself - the list is the built-ins first, then each new row id once');

    /* malformed rows fall back to the built-ins, and never throw */
    const bad = [
      ['not json at all', 'plain text'],
      ['{"a":1}', 'an object, not an array'],
      ['"stats-collect"', 'a bare string'],
      ['[42, null, {"x":1}, true]', 'non-strings'],
      ['[]', 'an empty array']
    ];
    for (const [row, what] of bad) {
      setRow(row);
      const live = liveActs();
      g.check(Array.isArray(live) && live.join(',') === BUILTIN.join(','), 'acts row', 'two-homes',
        'a malformed acts row (' + what + ': ' + row + ') gave ' + JSON.stringify(live) + ' - a bad row must fall back to the built-ins without throwing, so nothing live can be switched off by a typo in a Sheet cell');
    }
    /* junk ids in an otherwise-valid row are dropped one by one */
    const junk = ['Stats-Collect', 'a', 'stats collect', '-bad', '1abc', 'x'.repeat(50), '../etc', 'DROP TABLE', 'angles;', ''];
    setRow(JSON.stringify(['stats-collect'].concat(junk)));
    const withJunk = liveActs();
    const leaked = Array.isArray(withJunk) ? withJunk.filter(id => BUILTIN.indexOf(id) < 0 && id !== 'stats-collect') : ['(threw) ' + JSON.stringify(withJunk)];
    g.check(leaked.length === 0, 'acts row', 'two-homes',
      'a junk id from the Config row reached the live act list: ' + JSON.stringify(leaked) + ' - acts_() must accept only strings matching /^[a-z][a-z0-9-]{1,40}$/, because an act id is a Sheet key, a class-registry key and a client tile name');
    g.check(Array.isArray(withJunk) && withJunk.indexOf('stats-collect') > -1, 'acts row', 'two-homes',
      'a valid id beside junk ids was dropped with them - validation is per id, not per row');
    const junkTick = asTA('admin', { passcode: PW, sub: 'setActs', className: '10A-Maths', acts: { angles: true, 'DROP TABLE': true, 'Stats-Collect': true } });
    g.check(junkTick.ok === true && !('DROP TABLE' in (junkTick.acts || {})) && !('Stats-Collect' in (junkTick.acts || {})), 'acts row', 'two-homes',
      'a junk id from the Config row became a tickable key in the class registry: ' + JSON.stringify(junkTick.acts));
    setRow('["stats-collect"]');

    /* one Sheet read per execution: getConfig_ is the read, so count its
       calls across one relayed hello (apiHello -> getClasses_ -> coerceActs_
       per class, actOk_ per row, coerceActs_ for the answer) */
    let reads = 0;
    const cfgSheet = solo.configSheet, realRange = cfgSheet.getDataRange;
    cfgSheet.getDataRange = function () { reads++; return realRange.call(this); };
    asPupil('hello', { classCode: '10A-Maths' });
    cfgSheet.getDataRange = realRange;
    g.check(reads <= 4, 'acts row', 'two-homes',
      'one relayed hello read the Config tab ' + reads + ' times - acts_() must cache per execution (a module variable), or every coerceActs_ in getClasses_ is a Sheet read of its own');

    /* THE FRONT DOOR NEVER READS THE ROW. Executed above (doGet as a pupil with
       no Sheet); said here in the source too, so a future acts_() call in doGet,
       apiCall or the token minting is named before it is run */
    const fd = /function doGet\([\s\S]*?\n}\n/.exec(src);
    const call = /function apiCall\([\s\S]*?\n}\n/.exec(src);
    const mint = /function storeToken_\([\s\S]*?\n}\n/.exec(src);
    /* comments stripped: doGet's own comment tells the 9 Sept story by name */
    const frontSrc = [fd, call, mint].map(m => (m ? m[0] : '')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
    g.check(!/acts_\(|ss_\(|getConfig_\(|coerceActs_\(|actOk_\(|SpreadsheetApp/.test(frontSrc), 'front door', 'two-homes',
      'doGet, apiCall or storeToken_ names acts_/ss_/getConfig_/coerceActs_/actOk_/SpreadsheetApp - the act list lives in the Sheet now, and the front door runs as a pupil who cannot open it');
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
