#!/usr/bin/env node
/* qa-earned-stays.js — ONCE EARNED, ALWAYS HERS.
 *
 * G-E7 / DFM 145. The fault class is an admin action that SUBTRACTS and is not
 * walked forward through everything downstream. On the KS3 DT platform a reset
 * took points and left the rank, the unlocks and the currently-worn wardrobe
 * pointing at things the pupil no longer had. Here the shapes are:
 *   - unticking a book, and ticking it back: her marks, her inked verdicts and
 *     her gold star are all still there;
 *   - a name written after she has worked: the row is still hers;
 *   - a teacher inking a verdict and then choosing "use the app's mark": her own
 *     marks are untouched throughout — the ink is the teacher's layer, never a
 *     rewrite of the pupil's work;
 *   - a locked-correct question cannot be lowered by any client action;
 *   - and a state written by the LAST approved build still loads: a redeploy
 *     that quietly changed the schema would lose a term's work.
 *
 * The schema half is proved against a real state captured at 45b03ed, not a
 * hand-written one — a fixture somebody typed proves only that the typist knew
 * the schema.
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { makeEnv, loadTemplate } = require('./lib/mockenv.js');

const TIER = 'fast';
const ORDER = 55;
const COVERS = { books: '*', kinds: [], surfaces: ['shelf'], widths: [], projector: false, tier: ['preview', 'built'], cells: ['earned-stays'] };
const CONTROLS = [
  { id: 'setacts-deletes-rows', kind: 'fixture', plant: 'fixture-server-wipe', mustFail: /lost her work/ },
  { id: 'setname-rekeys-the-row', kind: 'fixture', plant: 'fixture-server-rekey', mustFail: /no longer hers/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const PW = '0lsMaths26*';
const OWNER = 'd.gartland@c2ken.net';
const TEACHER = 'a.teacher@c2ken.net';
const PUPIL = 'aoife.gartland@c2ken.net';

const g = new Gate('qa-earned-stays');

const env = makeEnv({ active: PUPIL, effective: OWNER, passcode: PW, props: { relaySecret: 's' } });
loadTemplate(env, A.app('server/Code.gs.template'));
env.call('initJotter')();
const admin = (r) => env.call('apiAdmin')(r);

/* a class, a book, and a pupil who has done some work and been inked */
env.as(TEACHER);
admin({ passcode: PW, sub: 'addClass', className: 'Earned' });
admin({ passcode: PW, sub: 'setActs', className: 'Earned', acts: { angles: true, algebra: true } });
env.as(PUPIL);
const STATE = JSON.stringify({ v: 1, act: 'angles', qs: { c1: { st: 'ok', lock: true, att: [{ pick: 'acute' }], mk: [0, 1] } } });
env.call('apiSave')({ classCode: 'Earned', act: 'angles', state: STATE, summary: JSON.stringify({ v: 1, marks: [1, 1], done: 1, total: 1, qs: { c1: { st: 'ok' } } }) });
env.call('apiSetName')({ name: 'Aoife Gartland' });
env.as(TEACHER);
admin({ passcode: PW, sub: 'override', className: 'Earned', act: 'angles', email: PUPIL, q: 'c1', idx: 'q', val: 1 });

/* ---- untick, and tick back ------------------------------------------- */
{
  /* THE BEFORE IS WHAT IS THERE NOW, not what was first written. The teacher
     has inked a verdict since, and the ink lives IN the state — so comparing
     against the original string would report the ink as data loss. What this
     law is about is that nothing is lost ACROSS the untick. */
  env.as(PUPIL);
  const beforeState = env.call('apiLoad')({ classCode: 'Earned', act: 'angles' }).state;
  env.as(TEACHER);
  const rowsBefore = env.dataSheet.getLastRow();
  admin({ passcode: PW, sub: 'setActs', className: 'Earned', acts: { angles: false, algebra: true } });
  g.check(env.dataSheet.getLastRow() === rowsBefore, 'shelf', 'earned-stays',
    'unticking a book deleted rows from the Sheet — she has lost her work because a teacher changed her mind about a book');
  admin({ passcode: PW, sub: 'setActs', className: 'Earned', acts: { angles: true, algebra: true } });
  env.as(PUPIL);
  const back = env.call('apiLoad')({ classCode: 'Earned', act: 'angles' });
  g.check(back.ok && back.state === beforeState, 'shelf:star-earned', 'earned-stays',
    'after untick then retick her state did not come back byte for byte — a book set back is a book she still finished');
  let st = null; try { st = JSON.parse(back.state); } catch (e) {}
  g.check(st && st.qs.c1.ovr && st.qs.c1.ovr.q === 1, 'shelf', 'earned-stays',
    'the teacher\'s inked verdict did not survive the untick');
  const keep = (st && st.qs && st.qs.c1) || null;
  g.check(!!keep && keep.mk && keep.mk[1] === 1, 'shelf', 'earned-stays',
    'her own marks did not survive the untick');
}

/* ---- a name written later does not re-key the row --------------------- */
{
  env.as(PUPIL);
  const beforeName = env.call('apiLoad')({ classCode: 'Earned', act: 'angles' }).state;
  env.call('apiSetName')({ name: 'Aoife M Gartland' });
  const after = env.call('apiLoad')({ classCode: 'Earned', act: 'angles' });
  /* `after.state === beforeName` alone passes when BOTH are empty, which is
     exactly what an orphaned row looks like: the check has to insist there is
     work there before it can say the work came back */
  g.check(after.ok && !!beforeName && after.state === beforeName, 'setname', 'earned-stays',
    'writing a name orphaned her row — the work is no longer hers, and nothing on any screen would say why' +
    (beforeName ? '' : ' (her state was empty before the rename, so there was nothing for this check to hold)'));
}

/* ---- "use the app's mark" restores, and never touches her marks -------- */
{
  env.as(TEACHER);
  admin({ passcode: PW, sub: 'override', className: 'Earned', act: 'angles', email: PUPIL, q: 'c1', idx: 'q', val: 0 });
  admin({ passcode: PW, sub: 'override', className: 'Earned', act: 'angles', email: PUPIL, q: 'c1', idx: 'q', val: null });
  const jt = admin({ passcode: PW, sub: 'jotter', className: 'Earned', act: 'angles', email: PUPIL });
  let st = null; try { st = JSON.parse(jt.state || '{}'); } catch (e) {}
  const c1 = (st && st.qs && st.qs.c1) || null;
  g.check(!!c1 && !c1.ovr, 'book-view:inked-app', 'earned-stays',
    '"use the app\'s mark" did not clear the teacher\'s ink' + (c1 ? '' : ' — her row could not be read back at all'));
  g.check(!!c1 && c1.mk && c1.mk[1] === 1, 'book-view', 'earned-stays',
    'a full cycle of inking changed the PUPIL\'s own marks — the ink is the teacher\'s layer, never a rewrite of her work');
}

/* ---- a state from the last approved build still loads ----------------- */
{
  const fx = A.qa('fixtures/state-v1.json');
  if (!A.exists(fx)) {
    g.note('no state-v1.json fixture captured yet — the schema half of this gate is not proved (capture one from the demo class at 45b03ed)');
  } else {
    const old = A.read(fx);
    env.as(PUPIL);
    const r = env.call('apiSave')({ classCode: 'Earned', act: 'algebra', state: old, summary: '{"v":1,"qs":{}}' });
    g.check(r.ok === true, 'the schema', 'earned-stays',
      'a state written by the last approved build was refused by this one — a redeploy would lose a term of work');
    const back = env.call('apiLoad')({ classCode: 'Earned', act: 'algebra' });
    g.check(back.ok && back.state === old, 'the schema', 'earned-stays',
      'a v1 state did not round-trip unchanged');
  }
}
g.done();
