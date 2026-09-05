#!/usr/bin/env node
/* qa-pencil-ink.js — THE TEACHER'S VERDICT IS PER QUESTION, IT STICKS, AND IT
 * NEVER REWRITES THE PUPIL'S WORK.
 *
 * G-E6. The model is the one he asked for on 25 June: the app's marks are the
 * first pass, and one press on a mark opens three choices — mark it right, mark
 * it wrong, or use the app's mark. The teacher's judgement is a LAYER over the
 * pupil's work, never an edit of it.
 *
 * The incident this gate is named for is subtler than the model: on 25 June an
 * inked verdict REVERTED when the teacher flicked to the next pupil and back,
 * because the one-ahead prefetch handed back a copy of the book from before the
 * ink. A verdict that silently un-does itself is worse than one that never
 * saved: she has no reason to look again.
 *
 * So: the ink survives a flick, survives a reload, and survives the PUPIL
 * saving again afterwards — a save must never carry `ovr` away with it.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { makeEnv, loadTemplate } = require('./lib/mockenv.js');
const { stripComments } = require('./lib/decl.js');

const TIER = 'fast';
const ORDER = 57;
const COVERS = { books: '*', kinds: [], surfaces: ['book-view'], widths: [], projector: false, tier: ['preview', 'built'], cells: ['pencil-ink'] };
const CONTROLS = [
  { id: 'stale-prefetch', kind: 'ref', ref: '9a585aa^', path: 'staff.js', mustFail: /cache/ },
  { id: 'save-clobbers-the-ink', kind: 'fixture', plant: 'fixture-server-clobber', mustFail: /carried the teacher's verdict away/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const PW = '0lsMaths26*', T = 'a.teacher@c2ken.net', P = 'p@c2ken.net';
const g = new Gate('qa-pencil-ink');
g.exempt(['the three-button control, the hand-drawn ring and the flick itself are walked by sit-teacher on the rendered screen']);

const env = makeEnv({ active: P, effective: 'd.gartland@c2ken.net', passcode: PW, props: {} });
loadTemplate(env, A.app('server/Code.gs.template'));
env.call('initJotter')();
const admin = (r) => env.call('apiAdmin')(r);

env.as(T);
admin({ passcode: PW, sub: 'addClass', className: 'Ink' });
admin({ passcode: PW, sub: 'setActs', className: 'Ink', acts: { angles: true, algebra: true } });
env.as(P);
const S1 = JSON.stringify({ v: 1, act: 'angles', qs: { c1: { st: 'err', lock: true, att: [{ pick: 'obtuse' }], mk: [0, 0] } } });
env.call('apiSave')({ classCode: 'Ink', act: 'angles', state: S1, summary: '{"v":1,"qs":{"c1":{"st":"err"}}}' });

/* ---- the three actions ------------------------------------------------ */
env.as(T);
['1', '0'].forEach(v => {
  const r = admin({ passcode: PW, sub: 'override', className: 'Ink', act: 'angles', email: P, q: 'c1', idx: 'q', val: Number(v) });
  g.check(r.ok === true, 'book-view', 'pencil-ink', 'the server refused "mark it ' + (v === '1' ? 'right' : 'wrong') + '"');
});
{
  const r = admin({ passcode: PW, sub: 'override', className: 'Ink', act: 'angles', email: P, q: 'c1', idx: 'q', val: null });
  g.check(r.ok === true, 'book-view', 'pencil-ink', 'the server refused "use the app\'s mark"');
}

/* ---- the ink survives the pupil saving again -------------------------- */
{
  env.as(T);
  admin({ passcode: PW, sub: 'override', className: 'Ink', act: 'angles', email: P, q: 'c1', idx: 'q', val: 1 });
  env.as(P);
  const S2 = JSON.stringify({ v: 1, act: 'angles', qs: { c1: { st: 'err', lock: true, att: [{ pick: 'obtuse' }], mk: [0, 0] }, c2: { st: 'ok', lock: true, mk: [0, 1] } } });
  env.call('apiSave')({ classCode: 'Ink', act: 'angles', state: S2, summary: '{"v":1,"qs":{}}' });
  env.as(T);
  const jt = admin({ passcode: PW, sub: 'jotter', className: 'Ink', act: 'angles', email: P });
  let st = null; try { st = JSON.parse(jt.state || '{}'); } catch (e) {}
  g.check(st && st.qs.c1 && st.qs.c1.ovr && st.qs.c1.ovr.q === 1, 'book-view:inked-mine-tick', 'pencil-ink',
    'the pupil\'s next save carried the teacher\'s verdict away — she inked it, the pupil typed one more line, and the ink was gone with no word to anybody');
  g.check(st && st.qs.c2, 'book-view', 'pencil-ink', 'the pupil\'s own new work did not survive the ink');
}

/* ---- the flick's prefetch cache is invalidated ------------------------- */
{
  const src = stripComments(A.read(A.app('staff.js')));
  g.check(/jotterCache/.test(src), 'staff.js', 'pencil-ink',
    'there is no prefetch cache at all — the flick would be slow, which is not a fault but is not what was built either');
  g.check(/delete\s+view\.jotterCache|jotterCache\s*=\s*\{\}/.test(src), 'staff.js', 'pencil-ink',
    'nothing clears the prefetch cache — an inked verdict reverts on flick-back, which is exactly the 25 June fault: it un-does itself, and she has no reason to look again');
}

/* ---- the verdict is per QUESTION, not per unit ------------------------- */
{
  const r = admin({ passcode: PW, sub: 'override', className: 'Ink', act: 'angles', email: P, q: 'c1', idx: 'q', val: 1 });
  g.check(r.idx === 'q', 'book-view', 'pencil-ink',
    'the ink contract is not keyed to the QUESTION — per-unit ticks on an artefact are annotations, and a teacher marking a unit would be marking something the model has no place for');
}
g.done();
