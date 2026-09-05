#!/usr/bin/env node
/* qa-staff-authority.js — A PASSCODE HOLDER REACHING ANOTHER TEACHER'S CLASS BY NAME.
 *
 * 3 August 2026: the shared staffPasscode gets any signed-in teacher through
 * the front door, and it was the per-teacher OWNERSHIP check behind that door
 * — not the passcode — that was supposed to stop her reaching a class she
 * did not create. The classes LIST was filtered correctly; a class NAMED
 * directly (wall/jotter/override/setActs/nudge/deleteClass, called with
 * someone else's className) was not. A power that is advertised to someone
 * who does not hold it, and a power its rightful holder — the deploy owner,
 * standing in for every teacher on handover — cannot reach, are the same
 * bug seen from two directions.
 *
 * The fix was one function, guardClass_, called first by every handler that
 * takes a className. This gate has two halves. The first is a TEXT RATCHET
 * that does not care whether the mocked scoping matrix currently passes —
 * it reads apiAdmin's own dispatch table and proves that every handler
 * reading req.className calls guardClass_ to do it, so the day a
 * `removePupil` sub is added and forgets the call, this gate names it before
 * the matrix even has to catch it. The second half runs the matrix itself,
 * directly, as its own assertions rather than trusting a subprocess's
 * headline count.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { makeEnv, loadTemplate } = require('./lib/mockenv.js');

const TIER = 'fast';
const ORDER = 53;
const COVERS = {
  books: '*', kinds: [], surfaces: [], widths: [], projector: false,
  tier: ['built'], cells: ['authority']
};
const CONTROLS = [
  { id: 'sub-without-guard', kind: 'mutation', plant: 'fixture-staff-no-guard', mustFail: /with no guardClass_/ },
  /* the pre-fix server, pinned by hash: before 18 June a passcode holder could
     reach any class by typing its name, and the guard that stopped it lives on
     the SERVER, so that is the file the ref replaces */
  { id: 'pre-scoping', kind: 'ref', ref: 'bbeffa3^', path: 'server/Code.gs.template', mustFail: /another teacher/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const PW = '0lsMaths26*';
const DEPLOYER = 'd.gartland@c2ken.net';
const TA = 'a.teacher@c2ken.net';
const TB = 'b.teacher@c2ken.net';

const g = new Gate('qa-staff-authority');
g.exempt([
  'the DOM half — the passcode box, the class list actually shown on screen, another teacher\'s tiles never appearing at all — rides the teacher walker; this gate proves only the server\'s own enforcement, which is what the walker has no way to reach around'
]);

const TPL = A.app('server/Code.gs.template');

/* ═══════════════════ helper: a function's body, by brace count ═════════ */
/* same technique as lib/decl.js's objectBody, adapted for a named function
   declaration instead of an object literal assignment */
function functionBody(src, name) {
  const re = new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(');
  const m = re.exec(src);
  if (!m) return null;
  const brace = src.indexOf('{', m.index);
  if (brace < 0) return null;
  let depth = 0, end = -1;
  for (let j = brace; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  return end < 0 ? null : src.slice(brace + 1, end);
}

/* ═══════════════════ THE TEXT RATCHET ═══════════════════════════════ */
const rawSrc = A.read(TPL);
const src = A.stripComments(rawSrc);

const dispatchRe = /if\s*\(\s*sub\s*===\s*'([^']+)'\s*\)\s*return\s+(\w+)\(/g;
const dispatch = [];
let dm;
while ((dm = dispatchRe.exec(src))) dispatch.push({ sub: dm[1], fn: dm[2] });
g.check(dispatch.length >= 8, 'apiAdmin', 'authority',
  'apiAdmin only dispatches ' + dispatch.length + ' subs the way this gate knows how to read them — a dispatch this gate cannot see is a law this gate cannot enforce, so the ratchet below is only as complete as this count');
g.note('apiAdmin dispatch table read from source: ' + dispatch.map(d => d.sub).join(', '));

/* addClass is the one structural exception: it reads req.className to name a
   class that does NOT exist yet. guardClass_ looks up an EXISTING class and
   would refuse every addClass with "unknown-class" — the law it stands in
   for here is the global name-uniqueness check (proved below and in
   qa-two-homes.js), not guardClass_ itself. 'classes' takes no className at
   all (it filters the whole registry), so it never matches the ratchet. */
const CREATE_EXEMPT = {
  addClass: 'creates a class that does not exist yet — guardClass_ requires an EXISTING class, and the global name-uniqueness check (which IS proved below) is what stands in its place'
};

dispatch.forEach(({ sub, fn }) => {
  const body = functionBody(src, fn);
  if (body == null) {
    g.fail(sub, 'authority', 'apiAdmin dispatches "' + sub + '" to ' + fn + '(), but this gate could not find that function\'s body to check it — a dispatch to code this gate cannot see is a law this gate cannot enforce');
    return;
  }
  const touchesClassName = /\bclassName\b/.test(body);
  if (!touchesClassName) { g.pass(); return; }
  if (CREATE_EXEMPT[sub]) { g.note('"' + sub + '" reads className but ' + CREATE_EXEMPT[sub]); return; }
  const guarded = /\bguardClass_\s*\(/.test(body);
  g.check(guarded, sub, 'authority',
    'admin sub "' + sub + '" reads a class name with no guardClass_ check in ' + fn + '() — a passcode holder could reach another teacher\'s class by typing its name into "' + sub + '", the way one did on 3 August 2026');
});

/* ═══════════════════ THE SCOPING MATRIX, DIRECTLY ═══════════════════ */
const data = makeEnv({ active: DEPLOYER, effective: DEPLOYER, passcode: PW });
loadTemplate(data, TPL);
data.call('initJotter')();
const admin = (req) => data.call('apiAdmin')(req);

data.as(TA);
const rA = admin({ passcode: PW, sub: 'addClass', className: 'QA-Auth-A' });
g.check(rA.ok === true, 'addClass', 'authority', 'teacher A could not even create her own class: ' + JSON.stringify(rA));
data.as(TB);
const rB = admin({ passcode: PW, sub: 'addClass', className: 'QA-Auth-B' });
g.check(rB.ok === true, 'addClass', 'authority', 'teacher B could not even create her own class: ' + JSON.stringify(rB));

/* each teacher sees ONLY her own; the deployer sees BOTH + isAdmin */
data.as(TA);
const listA = admin({ passcode: PW, sub: 'classes' });
g.check(listA.ok && listA.classes.length === 1 && listA.classes[0].name === rA.name && listA.isAdmin === false, 'classes', 'authority',
  'teacher A\'s own class list is not exactly her own one class: ' + JSON.stringify(listA));
data.as(TB);
const listB = admin({ passcode: PW, sub: 'classes' });
g.check(listB.ok && listB.classes.length === 1 && listB.classes[0].name === rB.name && listB.isAdmin === false, 'classes', 'authority',
  'teacher B\'s own class list is not exactly her own one class: ' + JSON.stringify(listB));
data.as(DEPLOYER);
const listD = admin({ passcode: PW, sub: 'classes' });
g.check(listD.ok && listD.classes.length === 2 && listD.isAdmin === true, 'classes', 'authority',
  'the deploy owner does not see both classes with isAdmin true: ' + JSON.stringify(listD));

/* B cannot touch A's class BY NAME on ANY guarded sub — the enforcement, not
   just the list filter, which is the part 3 August actually broke */
data.as(TB);
['setActs', 'wall', 'jotter', 'override', 'nudge', 'deleteClass'].forEach(sub => {
  const req = {
    passcode: PW, sub, className: rA.name, act: 'angles', email: 'p@c2ken.net',
    q: 'c1', idx: 'q', val: 1, acts: { angles: false, algebra: false }, sec: 's1::c1'
  };
  const r = admin(req);
  g.check(r.ok === false && r.error === 'not-your-class', sub, 'authority',
    'teacher B reached another teacher\'s class through "' + sub + '" (' + JSON.stringify(r) + ') — a passcode holder must never be able to open another teacher\'s class by typing its name');
});

/* the deploy owner CAN — the power its rightful holder must be able to reach */
data.as(DEPLOYER);
const ownerWall = admin({ passcode: PW, sub: 'wall', className: rA.name, act: 'angles' });
g.check(ownerWall.ok === true, 'wall', 'authority',
  'the deploy owner, who stands in for every teacher on handover, was blocked from a class she does not personally own: ' + JSON.stringify(ownerWall));
const ownerDelete = admin({ passcode: PW, sub: 'deleteClass', className: rB.name });
g.check(ownerDelete.ok === true, 'deleteClass', 'authority',
  'the deploy owner could not delete a class she does not personally own — the admin override that makes staff handover possible does not work');

/* an unowned legacy class is visible and touchable ONLY by the deploy owner */
const reg = JSON.parse(data.call('getConfig_')('classes'));
reg.push({ name: 'QA-Legacy', acts: { angles: true, algebra: true } });   /* no owner field at all */
data.call('setConfig_')('classes', JSON.stringify(reg));
data.as(TA);
const listALegacy = admin({ passcode: PW, sub: 'classes' });
g.check(listALegacy.classes.every(c => c.name !== 'QA-Legacy'), 'classes', 'authority',
  'teacher A can see an unowned legacy class in her own list — a class nobody claimed must default to the deploy owner only, not to everyone');
const touchALegacy = admin({ passcode: PW, sub: 'wall', className: 'QA-Legacy', act: 'angles' });
g.check(touchALegacy.ok === false && touchALegacy.error === 'not-your-class', 'wall', 'authority',
  'teacher A reached an unowned legacy class that another teacher never owned either (' + JSON.stringify(touchALegacy) + ')');
data.as(DEPLOYER);
const listDLegacy = admin({ passcode: PW, sub: 'classes' });
g.check(listDLegacy.classes.some(c => c.name === 'QA-Legacy'), 'classes', 'authority',
  'the deploy owner cannot see the unowned legacy class that only she is meant to manage');
const touchDLegacy = admin({ passcode: PW, sub: 'wall', className: 'QA-Legacy', act: 'angles' });
g.check(touchDLegacy.ok === true, 'wall', 'authority',
  'the deploy owner cannot touch the unowned legacy class that only she is meant to manage: ' + JSON.stringify(touchDLegacy));

/* class names are globally unique across owners — a passcode holder cannot
   even discover another teacher's class exists, but must not be able to
   collide with it either */
data.as(TB);
const dup = admin({ passcode: PW, sub: 'addClass', className: rA.name.replace(/-/g, ' ') });
g.check(dup.ok === false && dup.error === 'exists', 'addClass', 'authority',
  'teacher B created a class with the same name as teacher A\'s (' + JSON.stringify(dup) + ') — class names are the routing key and the Data-row key, so they must stay globally unique across every owner');

g.done();
