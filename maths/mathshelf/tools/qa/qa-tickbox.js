#!/usr/bin/env node
/* qa-tickbox.js — AN UNTICK THAT HIDES A PUPIL'S WORK FOR GOOD.
 *
 * KS3 DT's B-05 was a relock that turned out to be a no-op: the control the
 * teacher believed she had thrown had no effect at all. Here the same shape
 * cuts two ways. A teacher unticks a book mid-topic — to stage it, to pull it
 * back for a rewrite, to stop a class racing ahead — and TWO different
 * failures both look like nothing happened: the server can keep serving the
 * book to anyone who already has the link (the tickbox becomes decorative),
 * or worse, the untick can make the pupil's own row look like it was never
 * there (the tickbox becomes destructive). Neither is acceptable, and this
 * platform's whole promise to a pupil is "once earned, always hers" — an
 * untick, a retick, a topic staged and unstaged three times over a term, must
 * never cost her a single saved line.
 *
 * The third shape is a book that does not exist yet: the day a third topic is
 * added to ACTS, every class that predates it must treat it as unticked,
 * automatically, with no teacher action required — the opposite failure
 * (a new book arriving open to a class nobody configured) is a curriculum
 * leak, not a convenience.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { makeEnv, loadTemplate } = require('./lib/mockenv.js');
const { makeWindow } = require('./lib/domstub.js');

const TIER = 'fast';
const ORDER = 52;
const COVERS = {
  books: '*', kinds: [], surfaces: [], widths: [], projector: false,
  tier: ['preview', 'built'], cells: ['tickbox']
};
const CONTROLS = [
  { id: 'setacts-wipes-rows', kind: 'fixture', plant: 'fixture-server', mustFail: /lost the pupil's work/ },
  { id: 'new-book-defaults-true', kind: 'mutation', mustFail: /arrives ticked/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const PW = '0lsMaths26*';
const TEACHER = 'a.teacher@c2ken.net';
const PUPIL = 'aoife.gartland@c2ken.net';
const PROBE_PUPIL = 'probe.tickbox@c2ken.net';   /* a throwaway identity for the "is a write refused" probe, so it can never contaminate the pupil row this gate checks for byte-identical survival */
const TPL = A.app('server/Code.gs.template');

const g = new Gate('qa-tickbox');
g.exempt([
  'the pupil\'s shelf actually greying out or hiding the tile in the DOM is not re-rendered here; this gate proves only the acts map the shelf reads to decide (script.js: "if (!me.acts[a.id])")'
]);

/* ═══════════════════ the server home ════════════════════════════════ */
const data = makeEnv({ active: TEACHER, effective: TEACHER, passcode: PW });
loadTemplate(data, TPL);
data.call('initJotter')();
data.as(TEACHER);
const admin = (req) => data.call('apiAdmin')(req);
const addR = admin({ passcode: PW, sub: 'addClass', className: 'QA-Tickbox' });
g.check(addR.ok === true, 'addClass', 'tickbox', 'could not create the tickbox-test class: ' + JSON.stringify(addR));
const CLASS = addR.name || 'QA-Tickbox';
admin({ passcode: PW, sub: 'setActs', className: CLASS, acts: { angles: true, algebra: true } });

/* a pupil does real, identifiable work while the book is ticked on */
data.as(PUPIL);
const initialState = JSON.stringify({ v: 1, qs: { c1: { att: [{ L: [{ op: 'sub', t: 'x = 7', s: 12 }], dur: 12 }], lock: true } } });
const sv0 = data.call('apiSave')({ classCode: CLASS, act: 'algebra', state: initialState, summary: '{"qs":{}}' });
g.check(sv0.ok === true, 'save', 'tickbox', 'could not even save a pupil\'s work while the book was ticked on, so nothing below this line can be trusted');

function rowFor(cls, email, act) {
  const vals = data.dataSheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === cls && String(vals[i][1]).toLowerCase() === email.toLowerCase() && String(vals[i][3]) === act) return vals[i];
  }
  return null;
}
const rowBefore = rowFor(CLASS, PUPIL, 'algebra');
const countBefore = data.dataSheet.getLastRow();
g.check(!!rowBefore, 'save', 'tickbox', 'the pupil\'s row cannot be found immediately after a successful save — nothing below this line can be measured');

/* ═══════════════════ untick algebra ══════════════════════════════════ */
data.as(TEACHER);
const untickR = admin({ passcode: PW, sub: 'setActs', className: CLASS, acts: { angles: true, algebra: false } });
g.check(untickR.ok === true, 'setActs', 'tickbox', 'the teacher could not untick a book at all: ' + JSON.stringify(untickR));

/* the row itself must survive the mere act of unticking — checked BEFORE any
   save is attempted against the unticked book, so a later probe's outcome
   (refused or wrongly accepted) can never be mistaken for this */
const rowAfterUntick = rowFor(CLASS, PUPIL, 'algebra');
const countAfterUntick = data.dataSheet.getLastRow();
g.check(countAfterUntick === countBefore, 'setActs', 'tickbox',
  'unticking a book changed the pupil\'s Data row count (' + countBefore + ' -> ' + countAfterUntick + ') — an untick must never look like it lost the pupil\'s work');
g.check(!!rowAfterUntick && String(rowAfterUntick[5]) === String(rowBefore[5]), 'setActs', 'tickbox',
  'the pupil\'s stored State changed after the book was merely unticked, with no save in between — an untick must never look like it lost the pupil\'s work');

/* hello must reflect the untick truthfully (read-only, safe either way) */
data.as(PUPIL);
const helloAfterUntick = data.call('apiHello')({ classCode: CLASS });
g.check(helloAfterUntick.ok === true && helloAfterUntick.acts && helloAfterUntick.acts.algebra === false, 'hello', 'tickbox',
  'hello still reports the unticked book as open — the pupil\'s shelf gates on exactly this map, so a closed book would still show as an openable tile');

/* KNOWN OPEN FINDING: apiLoad does not check the class's tickboxes yet.
   Read-only, so safe to run against the real pupil's row; asserted anyway
   because the correct behaviour is that a closed book refuses to load. */
const loadAfterUntick = data.call('apiLoad')({ classCode: CLASS, act: 'algebra' });
g.check(loadAfterUntick.ok === false, 'load', 'tickbox',
  'load still served an unticked book\'s state (KNOWN OPEN FINDING, fixed in a later phase) — anyone who still has the class link can keep reading a book the teacher believes is closed');

/* the write-refusal probe uses a THROWAWAY identity: if this known finding
   also lets a WRITE through, it must never be able to overwrite the very
   row this gate just proved survives untouched */
data.as(PROBE_PUPIL);
const saveAfterUntick = data.call('apiSave')({ classCode: CLASS, act: 'algebra', state: '{"v":1,"qs":{}}', summary: '{}' });
g.check(saveAfterUntick.ok === false, 'save', 'tickbox',
  'save still accepted new work for an unticked book (KNOWN OPEN FINDING, fixed in a later phase) — a pupil could keep working in a book the teacher just closed');

/* ═══════════════════ retick: once earned, always hers ═══════════════ */
data.as(TEACHER);
const retickR = admin({ passcode: PW, sub: 'setActs', className: CLASS, acts: { angles: true, algebra: true } });
g.check(retickR.ok === true, 'setActs', 'tickbox', 'the teacher could not retick a book at all: ' + JSON.stringify(retickR));
data.as(PUPIL);
const loadAfterRetick = data.call('apiLoad')({ classCode: CLASS, act: 'algebra' });
g.check(loadAfterRetick.ok === true && loadAfterRetick.state === initialState, 'load', 'tickbox',
  'reticking the book did not hand back exactly the state that was there before the untick — once a book is earned it must always be hers, byte for byte, no matter how many times a teacher ticks and unticks it');

/* ═══════════════════ a NEW book: mutate a COPY of the template ═════════ */
const rawSrc = A.read(TPL);
const ORIG_ACTS = "var ACTS = ['angles', 'algebra'];";
const MUT_ACTS = "var ACTS = ['angles', 'algebra', 'geometry'];";
g.check(rawSrc.indexOf(ORIG_ACTS) >= 0, 'mutation harness', 'tickbox',
  'this gate could not find the exact "' + ORIG_ACTS + '" line in server/Code.gs.template to replace — the ACTS declaration has moved and this gate is silently testing nothing');
const mutatedSrc = rawSrc.replace(ORIG_ACTS, MUT_ACTS);
g.check(mutatedSrc !== rawSrc && mutatedSrc.indexOf(MUT_ACTS) >= 0, 'mutation harness', 'tickbox',
  'the ACTS string-replace did not actually change the template source — this measurement would silently test the unmutated two-book server instead of a server with a new book');

const data2 = makeEnv({ active: TEACHER, effective: TEACHER, passcode: PW });
data2.run(mutatedSrc, 'Code.gs.template (mutated: +geometry)');
data2.call('initJotter')();
data2.as(TEACHER);
const admin2 = (req) => data2.call('apiAdmin')(req);
const addR2 = admin2({ passcode: PW, sub: 'addClass', className: 'QA-Predates-Geometry' });
g.check(addR2.ok === true, 'addClass', 'tickbox', 'could not create a class under the mutated (three-book) template: ' + JSON.stringify(addR2));
const EXISTING_CLASS = addR2.name || 'QA-Predates-Geometry';

const listAfterMutation = admin2({ passcode: PW, sub: 'classes' });
const regRow = (listAfterMutation.classes || []).find(c => c.name === EXISTING_CLASS);
g.check(!!regRow && regRow.acts.geometry !== true, 'classes', 'tickbox',
  'a class created before "geometry" existed shows it as ' + JSON.stringify(regRow && regRow.acts) + ' — a new book that is not explicitly false arrives ticked open for every class that predates it');

data2.as(PUPIL);
const helloNewBook = data2.call('apiHello')({ classCode: EXISTING_CLASS });
g.check(helloNewBook.ok === true && helloNewBook.acts.geometry !== true, 'hello', 'tickbox',
  'hello reports geometry as ' + JSON.stringify(helloNewBook.acts && helloNewBook.acts.geometry) + ' for a class that predates it — a new book that is not explicitly false arrives ticked open the moment a pupil opens the shelf');

/* the REAL defect this measurement surfaces: coerceActs_ is hardcoded to
   exactly {angles, algebra} and does not derive from ACTS, so a teacher who
   tries to switch the new book ON cannot — it is silently dropped, forever,
   until coerceActs_ itself is extended to match ACTS */
data2.as(TEACHER);
const tryEnable = admin2({ passcode: PW, sub: 'setActs', className: EXISTING_CLASS, acts: { angles: true, algebra: true, geometry: true } });
g.check(tryEnable.ok === true && tryEnable.acts && tryEnable.acts.geometry === true, 'setActs', 'tickbox',
  'setActs silently dropped "geometry" when asked to switch it ON for ' + EXISTING_CLASS + ' (got ' + JSON.stringify(tryEnable.acts) + ') — coerceActs_ only ever returns {angles, algebra}, so a class can never legitimately enable a book that was added after this function was written, even once a teacher ticks it');

/* ═══════════════════ the offline stub home ══════════════════════════ */
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
  g.fail('offline stub', 'tickbox', 'script.js did not finish booting under the stub sandbox — the second home cannot be executed, so half of this gate proves nothing');
  g.done();
  process.exit(1);
}
const ocall = stub.GJ.app.call;

(async () => {
  await ocall('admin', { passcode: 'demo', sub: 'setActs', className: 'demo', acts: { angles: true, algebra: true } });
  const stubState = JSON.stringify({ v: 1, qs: { c1: { att: [{ L: [{ op: 'sub', t: 'x = 7', s: 12 }], dur: 12 }], lock: true } } });
  const svs = await ocall('save', { act: 'algebra', state: stubState, summary: '{}' });
  g.check(svs.ok === true, 'save', 'tickbox', 'the offline stub refused a save while algebra was ticked on: ' + JSON.stringify(svs));

  await ocall('admin', { passcode: 'demo', sub: 'setActs', className: 'demo', acts: { angles: true, algebra: false } });
  const helloStub = await ocall('hello', {});
  g.check(helloStub.ok === true && helloStub.acts && helloStub.acts.algebra === false, 'hello', 'tickbox',
    'the offline stub\'s hello still reports algebra as open after unticking it');

  /* THE TWO HALVES OF AN UNTICK, and they are different questions.
     (1) the book is CLOSED: the stub refuses load, exactly as the server does.
     (2) her work SURVIVES: the row is still in the store, byte for byte.
     The first cut of this check asked the second question THROUGH the door the
     first question had just closed, so closing it correctly read as losing her
     work. The store is read directly instead - which is the only honest way to
     ask "is it still there" of a thing you have just made unreachable. */
  const loadStubUnticked = await ocall('load', { act: 'algebra' });
  g.check(loadStubUnticked.ok === false, 'load', 'tickbox',
    'the offline stub served an unticked book\'s state - a book this class does not have is closed, not merely hidden');
  const rawStore = JSON.parse(stub.localStorage.getItem('gj-offline-v1') || '{}');
  let kept = null;
  Object.keys(rawStore.data || {}).forEach(cls => {
    Object.keys(rawStore.data[cls] || {}).forEach(em => {
      const r = rawStore.data[cls][em] && rawStore.data[cls][em].algebra;
      if (r && r.state) kept = r.state;
    });
  });
  g.check(kept === stubState, 'load', 'tickbox',
    'the offline stub\'s stored content for an unticked book changed instead of surviving untouched - an untick must never look like it lost the pupil\'s work');

  await ocall('admin', { passcode: 'demo', sub: 'setActs', className: 'demo', acts: { angles: true, algebra: true } });
  const loadStubRetick = await ocall('load', { act: 'algebra' });
  g.check(loadStubRetick.ok === true && loadStubRetick.state === stubState, 'load', 'tickbox',
    'reticking in the offline stub did not hand back exactly the prior state — once earned, always hers, in both homes');

  /* same keys, both homes */
  const serverKeys = Object.keys(helloAfterUntick.acts || {}).sort();
  const stubKeys = Object.keys(helloStub.acts || {}).sort();
  g.check(serverKeys.length > 0 && serverKeys.join(',') === stubKeys.join(','), 'hello', 'tickbox',
    'the offline stub\'s hello returns acts keys [' + stubKeys.join(',') + '] where the server returns [' + serverKeys.join(',') + '] — the preview would show a shelf shaped differently from the deploy');

  /* the stub's own equivalent of coerceActs_: script.js's 'hello' case passes
     reg.acts straight through (falling back to a fixed two-key object only
     when the whole acts object is missing) rather than defaulting any
     individual key to true — checked by source, since giving the stub a
     third book for real would mean loading a whole extra content pack */
  const stubSrc = A.stripComments(A.read(A.app('script.js')));
  const helloIdx = stubSrc.indexOf("case 'hello':");
  g.check(helloIdx >= 0, 'hello', 'tickbox', 'this gate could not find the offline stub\'s hello case at all — script.js has moved and this check is reading nothing');
  if (helloIdx >= 0) {
    const nextCaseIdx = stubSrc.indexOf("case '", helloIdx + 10);
    const helloBody = stubSrc.slice(helloIdx, nextCaseIdx > 0 ? nextCaseIdx : helloIdx + 800);
    g.check(!/!==?\s*false/.test(helloBody), 'hello', 'tickbox',
      'the offline stub\'s hello builds its acts map with a "true unless explicitly false" pattern — that is exactly the shape that would make a new book arrive ticked open for every existing class');
    g.note('the offline stub has no coerceActs_ equivalent: hello passes reg.acts through verbatim (a fixed {angles:true, algebra:true} fallback only fires when the whole acts object is missing), so a book absent from a class\'s stored acts is simply absent from what the shelf reads — unlike the server, nothing here would also silently drop a newly-ticked book\'s key, which is the real, separate defect this gate found on the server side (coerceActs_)');
  }

  g.done();
})().catch(e => {
  console.log('  FAIL  qa-tickbox x crash: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
