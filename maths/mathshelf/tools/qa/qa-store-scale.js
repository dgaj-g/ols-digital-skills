#!/usr/bin/env node
/* qa-store-scale.js — ONE PUPIL'S WHOLE BOOK LIVES IN ONE 50,000-CHARACTER CELL.
 *
 * KS3 DT's B-01: every gate on that platform ran against unlimited
 * localStorage while the real store had a cap, and the cap only failed once
 * a whole class hit it at once — mid-lesson, in front of the class. Here the
 * trap is narrower and just as nasty: a pupil's ENTIRE state for one book —
 * every attempt, every committed line, every override — is written into ONE
 * Google Sheets cell on every save, and Sheets refuses a cell past 50,000
 * characters outright. The server's own STATE_MAX of 45,000 exists to leave
 * headroom under that wall, not to chase it. A book that grows past the cap
 * does not truncate or degrade gracefully — the save simply stops working,
 * silently, for whichever pupil happened to write the most that lesson.
 *
 * So this gate builds the biggest book a real pupil could plausibly produce
 * — two attempts on every question, each attempt as long as its kind
 * plausibly runs — and asks the mocked Sheet, which enforces the real
 * 50,000-character cap and throws exactly where Google's API throws, whether
 * it still fits at THIRTY pupils, not one. The self-probe at the end exists
 * because a mock that quietly accepted an oversized cell would make every
 * other check in this file worthless without ever going red to say so.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { makeEnv, loadTemplate, CELL_MAX } = require('./lib/mockenv.js');
const { makeWindow } = require('./lib/domstub.js');

const TIER = 'fast';
const ORDER = 51;
const COVERS = {
  books: '*', kinds: [], surfaces: [], widths: [], projector: false,
  tier: ['preview', 'built'], cells: ['store-scale']
};
const CONTROLS = [
  { id: 'oversize-cell', kind: 'fixture', plant: 'fixture-state-huge', mustFail: /cell cap/ },
  { id: 'summary-too-fat', kind: 'fixture', plant: 'fixture-state-huge', mustFail: /summary/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const PW = '0lsMaths26*';
const TEACHER = 'a.teacher@c2ken.net';
const N_PUPILS = 30;

const g = new Gate('qa-store-scale');
g.exempt([
  'the wall-clock timings below are the mock\'s in-memory speed, not real Apps Script / Sheets I/O latency or LockService contention under real concurrent writers — the six-minute extrapolation is arithmetic on a shape, not a measured real-world duration'
]);

const TPL = A.app('server/Code.gs.template');

/* ═══════════════════ boot the offline stub, for the real summarise() ═══ */
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
if (!stub || !stub.GJ || !stub.GJ.app || typeof stub.GJ.app.summarise !== 'function') {
  g.fail('offline stub', 'store-scale', 'script.js did not finish booting under the stub sandbox, or exposes no summarise() — the summary side of this gate cannot be measured at all');
  g.done();
  process.exit(1);
}

/* a real dx code, longest first — derived, not typed (L5), and it doubles as
   gate qa-needs-you's own proof that GJ_DX exists */
const DX = stub.GJ_DX || {};
const DX_KEYS = Object.keys(DX);
const LONGEST_DX = DX_KEYS.length ? DX_KEYS.reduce((a, b) => (b.length > a.length ? b : a), '') : 'UNKNOWN_DX_CODE';

/* ═══════════════════ the largest plausible book, per A.grid() ══════════ */
const BIG_KINDS = { solve: 1, form: 1, reasoned: 1 };   /* 8 committed lines; everything else gets 4 */

function committedLine(book, i) {
  const text = 'x'.repeat(40);
  return book === 'angles'
    ? { ang: 'a' + i, val: 90, rsn: text, s: 7 * (i + 1) }        /* anglecore's step shape */
    : { op: 'sub', t: text, s: 7 * (i + 1) };                     /* mathcore's line shape */
}
function biggestAttempt(book, kind) {
  const n = BIG_KINDS[kind] ? 8 : 4;
  const lines = []; for (let i = 0; i < n; i++) lines.push(committedLine(book, i));
  return book === 'angles' ? { steps: lines, dur: 600 } : { L: lines, dur: 600 };
}
/* per-question record: the two attempts a pupil would actually leave behind,
   PLUS the st/errAt/dx/mk/t/at/a1 fields named in the brief — deliberately
   redundant with what summarise() derives, so the STATE-size bound stays
   pessimistic even if a future build starts caching them in state too */
function questionRecord(book, kind) {
  return {
    att: [biggestAttempt(book, kind), biggestAttempt(book, kind)],
    lock: true, ovr: { q: 1 },
    st: 'err', errAt: 3, dx: LONGEST_DX, mk: [1, 1], t: 999, at: 2, a1: 0
  };
}
function biggestState(book) {
  const qs = {};
  A.grid().filter(r => r.book === book).forEach(r => { qs[r.qid] = questionRecord(book, r.kind); });
  return { v: 1, qs, evals: {}, help: {} };
}

const BOOKS = A.books();
g.check(BOOKS.length > 0, 'content', 'store-scale', 'A.books() returned no books at all — there is nothing to size against the cell cap, which proves nothing rather than proving it fits');

const built = {};
const stateSizes = [];
BOOKS.forEach(book => {
  const state = biggestState(book);
  const json = JSON.stringify(state);
  built[book] = { state, json };
  stateSizes.push(book + '=' + json.length);
  g.check(json.length < 45000, book, 'store-scale',
    'the largest plausible ' + book + ' state is ' + json.length + ' characters — the server\'s own STATE_MAX is 45,000, so a pupil this thorough would stop being able to save before this gate would let it ship');
});
g.note('largest plausible STATE per book (chars, JSON): ' + stateSizes.join(', '));

/* ═══════════════════ the summary side, from the REAL summarise() ═══════ */
const summarySizes = [];
BOOKS.forEach(book => {
  const { state } = built[book];
  let sum;
  try { sum = stub.GJ.app.summarise(book, state, 'QA Scale Pupil'); }
  catch (e) { g.fail(book, 'store-scale', 'summarise() threw building the summary for the largest plausible state: ' + (e && e.message)); return; }
  const sjson = JSON.stringify(sum || {});
  built[book].summaryJson = sjson;
  summarySizes.push(book + '=' + sjson.length);
  g.check(sjson.length < 5000, book, 'store-scale',
    'the ' + book + ' summary built from the largest plausible state is ' + sjson.length + ' characters — this gate holds the summary to a 5,000-character headroom (the server\'s own SUMMARY_MAX only refuses past 8,000), because the Working Wall polls every pupil\'s summary every ~20 seconds and a fat summary is a slow wall for the whole class');
});
g.note('largest plausible SUMMARY per book (chars, JSON, real summarise()): ' + summarySizes.join(', ') +
  ' — built from synthetic attempt text, so a marking engine that resolves a real verdict on real pupil writing may size slightly differently; the bound above is what this gate can actually exercise');

/* ═══════════════════ 30 pupils × every book, through the mocked server ═ */
const data = makeEnv({ active: TEACHER, effective: TEACHER, passcode: PW });
loadTemplate(data, TPL);
data.call('initJotter')();
data.as(TEACHER);
const CLASS = 'QA-Scale';
const addR = data.call('apiAdmin')({ passcode: PW, sub: 'addClass', className: CLASS });
g.check(addR.ok === true, 'addClass', 'store-scale', 'could not even create the scale-test class: ' + JSON.stringify(addR));
const actsOn = {}; BOOKS.forEach(b => { actsOn[b] = true; });
const setR = data.call('apiAdmin')({ passcode: PW, sub: 'setActs', className: addR.name || CLASS, acts: actsOn });
g.check(setR.ok === true, 'setActs', 'store-scale', 'could not tick every book on for the scale-test class: ' + JSON.stringify(setR));
const CLASSNAME = addR.name || CLASS;

const pupils = [];
for (let i = 1; i <= N_PUPILS; i++) pupils.push('pupil' + String(i).padStart(2, '0') + '@c2ken.net');

let saveRefused = 0, saveThrew = 0;
pupils.forEach(email => {
  data.as(email);
  BOOKS.forEach(book => {
    const summaryJson = built[book].summaryJson || '{}';
    let r;
    try { r = data.call('apiSave')({ classCode: CLASSNAME, act: book, state: built[book].json, summary: summaryJson }); }
    catch (e) { saveThrew++; return; }
    if (!r || r.ok !== true) saveRefused++;
  });
});
const totalSaves = N_PUPILS * BOOKS.length;
g.check(saveThrew === 0, 'save', 'store-scale',
  saveThrew + ' of ' + totalSaves + ' saves at the largest plausible size THREW instead of returning an error — a thrown cell write is a pupil who loses a whole lesson\'s work with no message on screen at all');
g.check(saveRefused === 0, 'save', 'store-scale',
  saveRefused + ' of ' + totalSaves + ' saves at the largest plausible size were refused — thirty pupils each writing their biggest plausible book must all fit, one class at a time, every lesson');

/* ═══════════════════ time wall + jotter for the full class ═════════════ */
data.as(TEACHER);
BOOKS.forEach(book => {
  const t0 = Date.now();
  const wall = data.call('apiAdmin')({ passcode: PW, sub: 'wall', className: CLASSNAME, act: book });
  const elapsed = Date.now() - t0;
  g.check(wall.ok === true, 'wall', 'store-scale', 'the Working Wall call failed for a full class of ' + N_PUPILS + ' on ' + book + ': ' + JSON.stringify(wall).slice(0, 200));
  g.check(elapsed < 60000, 'wall', 'store-scale',
    'the Working Wall took ' + elapsed + 'ms to poll ' + N_PUPILS + ' pupils on ' + book + ' — Apps Script kills any single call after six minutes (360,000ms) and a class poll must stay far under that, every ~20 seconds, all lesson');
  const rows = wall.pupils ? wall.pupils.length : 0;
  const perPupil = Math.max(elapsed, 1) / N_PUPILS;
  g.note(book + ' wall: ' + rows + ' rows in ' + elapsed + 'ms (extrapolated at this rate, ~' + Math.round(360000 / perPupil) + ' pupils would fit inside Apps Script\'s six-minute ceiling — this mock does not model real Sheets I/O, so treat this as a shape, not a promise)');
});

BOOKS.forEach(book => {
  const t0 = Date.now();
  let jFail = 0;
  pupils.forEach(email => {
    const j = data.call('apiAdmin')({ passcode: PW, sub: 'jotter', className: CLASSNAME, act: book, email });
    if (!j.ok) jFail++;
  });
  const elapsed = Date.now() - t0;
  g.check(jFail === 0, 'jotter', 'store-scale', jFail + ' of ' + N_PUPILS + ' jotter drill-downs failed for ' + book);
  g.check(elapsed < 60000, 'jotter', 'store-scale',
    'reading all ' + N_PUPILS + ' pupils\' ' + book + ' jotters one at a time took ' + elapsed + 'ms — still must stay well under Apps Script\'s six-minute ceiling');
  g.note(book + ' jotter: ' + N_PUPILS + ' drill-downs in ' + elapsed + 'ms');
});

/* ═══════════════════ the self-probe: prove the mock is hostile ═════════ */
/* unconditional, every run — a mock that silently accepted an oversized
   cell would make every check above meaningless without ever going red */
{
  let threw = false, msg = '';
  try { data.dataSheet.appendRow(['ProbeClass', 'probe@qa.test', 'Probe', 'angles', '{}', 'A'.repeat(60000), 'now']); }
  catch (e) { threw = true; msg = String((e && e.message) || e); }
  g.check(threw, 'mock sheet', 'store-scale',
    'a 60,000-character cell was accepted by the mocked sheet with no error at all instead of hitting the cell cap — prove the mock is hostile before trusting its silence, and here it just went quiet');
  if (threw) g.note('self-probe: the mock\'s cell cap (CELL_MAX=' + CELL_MAX + ') threw as expected: ' + msg);
}

g.done();
