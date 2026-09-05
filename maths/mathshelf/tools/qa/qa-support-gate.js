#!/usr/bin/env node
/* qa-support-gate.js — HELP IS EARNED, PERSONAL, AND ONE SHOT FROM THE TEACHER.
 *
 * G-E8, and three separate incidents on this platform:
 *   - the help strip was ALWAYS ON (fixed 792870c). Help that is there before
 *     she has tried is not help; it is the answer with an extra press.
 *   - it replayed the film with no reference to what she had actually got wrong
 *     — his word for that was "pointless".
 *   - a teacher's nudge landed on Q1 instead of on the question it was about
 *     (fixed 7ada10f), so a pupil was sent to re-watch something she had done.
 *
 * So: earned at TWO wrong attempts (an AMBER counts), it leads with HER slip,
 * the film sits below it, the fact that she pulled it is recorded and reaches
 * the teacher, and a nudge opens THAT question's strip once and is cleared as
 * it is delivered.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { makeEnv, loadTemplate } = require('./lib/mockenv.js');
const { stripComments } = require('./lib/decl.js');

const TIER = 'fast';
const ORDER = 56;
const COVERS = { books: '*', kinds: '*', surfaces: ['question'], widths: [], projector: false, tier: ['preview', 'built'], cells: ['support'] };
const CONTROLS = [
  { id: 'always-on-strip', kind: 'ref', ref: '792870c^', path: 'script.js', mustFail: /before she has earned it/ },
  { id: 'nudge-lands-on-q1', kind: 'ref', ref: '7ada10f^', path: 'script.js', mustFail: /names no question/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-support-gate');
g.exempt(['the DOM half — the strip appearing after the second wrong Check and leading with her own slip — rides sit-confused on every question of every book']);

/* ---- the client: the strip is gated, and the nudge names its question --- */
{
  const src = stripComments(A.read(A.app('script.js')));
  g.check(/supportEarned/.test(src), 'script.js', 'support',
    'nothing gates the method help — it would be on the page before she has earned it, which makes it the answer with an extra press (fixed 792870c)');
  const earned = /function\s+supportEarned[\s\S]{0,400}?\}/.exec(src);
  /* THE GATE IS WRITTEN AS A REFUSAL, not as a permission: `att.length < 2`
     returns false. Looking only for the `>= 2` spelling reported that a
     correctly gated help strip was ungated — a gate inventing a fault (L6). */
  g.check(earned && /att\.length\s*(?:<\s*2|>=?\s*[12])/.test(earned[0]), 'script.js', 'support',
    'the help is not gated at TWO attempts — one wrong go is a slip, two is a pupil who needs the method');
  g.check(earned && /res\s*!==\s*'OK'/.test(earned[0]), 'script.js', 'support',
    'the help is offered after two attempts even when the second was RIGHT — help she does not need is noise');
  g.check(/\bhelp\b/.test(src) && /state\.help/.test(src), 'script.js', 'support',
    'nothing records that she pulled the method help — the teacher cannot see who needed it, which is half the point of offering it');
  g.check(/np\[1\]|nudge\.q/.test(src), 'script.js', 'support',
    'the nudge names no question — a nudge that lands on Q1 sends her to re-watch something she has already done (fixed 7ada10f)');
}

/* ---- the server: one shot, cleared as it is read ----------------------- */
{
  const PW = '0lsMaths26*', T = 'a.teacher@c2ken.net', P = 'p@c2ken.net';
  const env = makeEnv({ active: P, effective: 'd.gartland@c2ken.net', passcode: PW, props: {} });
  loadTemplate(env, A.app('server/Code.gs.template'));
  env.call('initJotter')();
  const admin = (r) => env.call('apiAdmin')(r);
  env.as(T);
  admin({ passcode: PW, sub: 'addClass', className: 'Support' });
  admin({ passcode: PW, sub: 'setActs', className: 'Support', acts: { angles: true, algebra: true } });
  /* a nudge before she has ever opened the book still lands on her first open */
  const n = admin({ passcode: PW, sub: 'nudge', className: 'Support', act: 'angles', email: P, sec: 's2::q5' });
  g.check(n.ok === true, 'nudge', 'support', 'the server refused a nudge sent before the pupil had started');
  env.as(P);
  const first = env.call('apiLoad')({ classCode: 'Support', act: 'angles' });
  g.check(first.nudge === 's2::q5', 'nudge', 'support',
    'the nudge came back as "' + first.nudge + '" — it must name the section AND the question, or it lands on Q1');
  const second = env.call('apiLoad')({ classCode: 'Support', act: 'angles' });
  g.check(!second.nudge, 'nudge', 'support',
    'the nudge was delivered twice — a one-shot pointer that repeats becomes a nag she cannot clear');
}
g.done();
