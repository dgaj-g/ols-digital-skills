#!/usr/bin/env node
/* qa-pair-stores.js — the pairing engine must coordinate through a store that
   crosses users. Born 21 Aug 2026, the morning three real staff sat Lesson 1
   on the live app and every one was released solo: CacheService on the
   execute-as-user deployment had stopped sharing between users, so presence,
   the queue and the chat were per-user silos while every properties-backed
   store (roster, records, pair registries) crossed users perfectly.

   This harness runs the REAL server template inside a vm with a CacheService
   stub that is DELIBERATELY PARTITIONED PER USER (today's measured live
   behaviour) and a shared PropertiesService. Three simulated pupils ping and
   join, staggered, exactly as the staff did.

   CONTROL: the pre-fix template (git show <base>) under the same stubs must
   reproduce the incident — every joiner released solo, no trio. A simulation
   that cannot reproduce the fault it exists to prevent proves nothing.
   FIX: the current template must hold the first two joiners and form the trio,
   and the pairing lens must count all three as present. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const TEMPLATE = path.join(ROOT, 'platform', 'server', 'Code.gs.template');
/* PINNED at the PRE-FIX ref, never 'HEAD' (22 Aug 2026). With 'HEAD' the base
   became the fixed code the moment the fix was committed, and the control below
   printed "already carries the fix; control skipped" and went green — a gate
   whose control skips itself is a gate with no evidence behind it (DFM 196).
   af5b69b is the last commit before the pairing hotfix, i.e. the code that was
   live the morning three staff were each released solo. */
const BASE_REF = process.env.PAIR_STORES_BASE || 'af5b69b';

let failures = 0;
function check(name, ok, detail) {
  if (ok) { console.log('  PASS  ' + name); }
  else { failures++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

function makeWorld(src, label) {
  // shared script properties; cache partitioned by CURRENT user (the measured
  // live behaviour this harness exists to simulate)
  const scriptProps = {};
  const cacheSilos = {};   // user -> {key: value}
  const world = { user: 'nobody@c2ken.net' };

  const sandbox = {
    console, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, parseInt, parseFloat, isNaN,
    Logger: { log: () => {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (k in scriptProps ? scriptProps[k] : null),
        setProperty: (k, v) => { scriptProps[k] = String(v); },
        deleteProperty: k => { delete scriptProps[k]; },
        getProperties: () => Object.assign({}, scriptProps),
      }),
      getUserProperties: () => {
        const u = world.user;
        cacheSilos['__up__' + u] = cacheSilos['__up__' + u] || {};
        const store = cacheSilos['__up__' + u];
        return {
          getProperty: k => (k in store ? store[k] : null),
          setProperty: (k, v) => { store[k] = String(v); },
          deleteProperty: k => { delete store[k]; },
          getProperties: () => Object.assign({}, store),
        };
      },
    },
    CacheService: {
      getScriptCache: () => {
        const u = world.user;               // <- the partition under test
        cacheSilos[u] = cacheSilos[u] || {};
        const silo = cacheSilos[u];
        return {
          get: k => (k in silo ? silo[k] : null),
          put: (k, v) => { silo[k] = String(v); },
          remove: k => { delete silo[k]; },
          getAll: keys => { const o = {}; keys.forEach(k => { if (k in silo) o[k] = silo[k]; }); return o; },
        };
      },
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => world.user }) },
    Utilities: { sleep: () => {} },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 404, getContentText: () => '' }) },
  };
  vm.createContext(sandbox);
  try { vm.runInContext(src, sandbox, { filename: label }); }
  catch (e) { throw new Error(label + ' failed to load: ' + e.message); }

  // Bypass the content machinery (not under test): j1-01 is lesson '1', open.
  vm.runInContext(`
    lessonNum_ = function (year, lessonId) { return lessonId === 'j1-01' ? '1' : ''; };
    lessonAccessible_ = function () { return true; };
  `, sandbox);

  // The world: one class, an owner, three pupils with records.
  scriptProps['classes'] = JSON.stringify([{ name: 'DT-Demo', owner: 'owner@c2ken.net', year: 'j1', created: 1 }]);
  scriptProps['staffPasscode'] = 'pc';
  ['a@c2ken.net', 'b@c2ken.net', 'c@c2ken.net'].forEach((e, i) => {
    scriptProps['p:DT-Demo:' + e] = JSON.stringify({ n: 'P ' + 'ABC'[i], cn: '', j: 1, xp: 0, L: {} });
  });

  const as = (user, expr) => { world.user = user; return vm.runInContext(expr, sandbox); };
  return { as, world, cacheSilos, scriptProps };
}

function runScenario(w) {
  const P = { classCode: 'DT-Demo', lessonId: 'j1-01' };
  const ping = u => w.as(u, `apiPing(${JSON.stringify({ classCode: 'DT-Demo', lessonNum: '1', ci: 2, cc: 10 })})`);
  const join = u => w.as(u, `apiPairJoin(${JSON.stringify(Object.assign({ stageIdx: 4 }, P))})`);
  // all three are live mid-lesson, pinging — exactly the morning's room
  ping('a@c2ken.net'); ping('b@c2ken.net'); ping('c@c2ken.net');
  const r1 = join('a@c2ken.net');            // first to the Vault
  ping('b@c2ken.net'); ping('c@c2ken.net');
  const r2 = join('b@c2ken.net');            // second
  const r3 = join('c@c2ken.net');            // third
  const r1b = join('a@c2ken.net');           // first's waiting poll
  const r2b = join('b@c2ken.net');
  const lens = w.as('owner@c2ken.net',
    `apiAdmin(${JSON.stringify({ passcode: 'pc', sub: 'pairs', className: 'DT-Demo', lessonId: 'j1-01' })})`);
  return { r1, r2, r3, r1b, r2b, lens };
}

console.log('qa-pair-stores — pairing must coordinate across users\n');

/* ---- CONTROL: the pre-fix template must reproduce the 21 Aug incident ---- */
const baseSrc = execSync('git show ' + BASE_REF + ':ks3-dt/platform/server/Code.gs.template',
  { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 }).toString();
if (/pPut_\(presPKey_/.test(baseSrc)) {
  failures++;
  console.log('  FAIL  CONTROL CANNOT RUN: base ref ' + BASE_REF + ' already carries the fix.');
  console.log('        A control that skips itself is not evidence (DFM 196/204). Point');
  console.log('        PAIR_STORES_BASE at a pre-fix ref, or leave the pinned default.');
} else {
  const ctl = runScenario(makeWorld(baseSrc, 'pre-fix template'));
  check('CONTROL: pre-fix code under partitioned cache solos the first joiner instantly',
    ctl.r1 && ctl.r1.state === 'solo', 'got ' + JSON.stringify(ctl.r1));
  check('CONTROL: pre-fix code solos all three (the incident)',
    ['r1', 'r2', 'r3'].every(k => ctl[k] && ctl[k].state === 'solo'),
    JSON.stringify([ctl.r1 && ctl.r1.state, ctl.r2 && ctl.r2.state, ctl.r3 && ctl.r3.state]));
  check('CONTROL: pre-fix lens sees nobody live',
    ctl.lens && ctl.lens.ok && Number(ctl.lens.present) === 0, JSON.stringify(ctl.lens && ctl.lens.present));
}

/* ---- THE FIX: the current template must pair properly under the same stubs ---- */
const fixSrc = fs.readFileSync(TEMPLATE, 'utf8');
const fx = runScenario(makeWorld(fixSrc, 'fixed template'));
check('first joiner WAITS (three expected, trio hold)',
  fx.r1 && fx.r1.state === 'wait' && Number(fx.r1.expected) === 3 && Number(fx.r1.trioHold) === 1,
  JSON.stringify(fx.r1));
check('second joiner WAITS (held for the trio)',
  fx.r2 && fx.r2.state === 'wait', JSON.stringify(fx.r2));
check('third joiner lands PAIRED in a TRIO',
  fx.r3 && fx.r3.state === 'paired' && Number(fx.r3.trio) === 1 && (fx.r3.members || []).length === 3,
  JSON.stringify(fx.r3));
check('first joiner\'s next poll finds her trio',
  fx.r1b && fx.r1b.state === 'paired' && Number(fx.r1b.trio) === 1, JSON.stringify(fx.r1b));
check('nobody was released solo', [fx.r1, fx.r2, fx.r3, fx.r1b, fx.r2b].every(r => r && r.state !== 'solo'));
check('the lens counts all three live on the lesson',
  fx.lens && fx.lens.ok && Number(fx.lens.present) === 3, JSON.stringify(fx.lens && fx.lens.present));
check('the lens shows one trio row with three call signs',
  fx.lens && (fx.lens.pairs || []).length === 1 && Number(fx.lens.pairs[0].trio) === 1
    && (fx.lens.pairs[0].cn || []).length === 3, JSON.stringify(fx.lens && fx.lens.pairs));

/* ---- owner exclusion + two-user pair + chat, same partitioned world ---- */
const w2 = makeWorld(fixSrc, 'fixed template (pair case)');
const P2 = { classCode: 'DT-Demo', lessonId: 'j1-01' };
w2.as('owner@c2ken.net', `apiPing(${JSON.stringify({ classCode: 'DT-Demo', lessonNum: '1', ci: 2, cc: 10 })})`);
const own = w2.as('owner@c2ken.net', `apiPairJoin(${JSON.stringify(Object.assign({ stageIdx: 4 }, P2))})`);
check('the class owner goes straight to a solo run', own && own.state === 'solo', JSON.stringify(own));
w2.as('a@c2ken.net', `apiPing(${JSON.stringify({ classCode: 'DT-Demo', lessonNum: '1', ci: 3, cc: 10 })})`);
w2.as('b@c2ken.net', `apiPing(${JSON.stringify({ classCode: 'DT-Demo', lessonNum: '1', ci: 3, cc: 10 })})`);
const p1 = w2.as('a@c2ken.net', `apiPairJoin(${JSON.stringify(Object.assign({ stageIdx: 4 }, P2))})`);
const p2 = w2.as('b@c2ken.net', `apiPairJoin(${JSON.stringify(Object.assign({ stageIdx: 4 }, P2))})`);
check('two live pupils form a PAIR (owner never counted)',
  p1 && p1.state === 'wait' && p2 && p2.state === 'paired' && Number(p2.trio) === 0,
  JSON.stringify([p1 && p1.state, p2 && p2.state]));
if (p2 && p2.state === 'paired') {
  const sent = w2.as('a@c2ken.net',
    `apiPairSend(${JSON.stringify(Object.assign({ pid: p2.pid, kind: 'msg', text: 'hello across users' }, P2))})`);
  const got = w2.as('b@c2ken.net',
    `apiPairChannel(${JSON.stringify(Object.assign({ pid: p2.pid, since: 0 }, P2))})`);
  check('a chat message crosses users through the properties channel',
    sent && sent.ok && got && got.ok && (got.ev || []).some(e => String(e[3]) === 'hello across users'),
    JSON.stringify({ sent: sent && sent.ok, ev: got && (got.ev || []).length }));
  check('partner liveness reads from the presence heartbeat',
    got && Array.isArray(got.live) && got.live.length === 2 && Number(got.live[0]) === 1 && Number(got.live[1]) === 1,
    JSON.stringify(got && got.live));
}

/* ══════════════════════════════════════════════════════════════════════════
   §F6 — THE PAIR BLOB, in both homes and both ways (DFM 234 / DFM 248)

   `pairBlob` is how a pupil hands her partner something too big for a chat
   line: the bot she has written, the report she has filled in, the score card.
   It is cross-user state, and cross-user state on this deployment lives in
   ScriptProperties and NEVER in cache -- that is the whole lesson of the 21
   August morning above, where CacheService silently stopped crossing users and
   three staff were each released solo.

   So the blob is checked the same way the pairing was:
     - in the SAME partitioned world, where a and b are already a real pair;
     - in BOTH homes, the deployed template and the preview mimic, because a
       behaviour implemented twice is a contract and asserting one of them
       verifies nothing about the file he pastes (DFM 234a);
     - and BOTH WAYS. A control mutates the template so the blob goes through
       CacheService instead, and that mutant MUST fail to hand b what a wrote.
       Without it, every assertion below would pass just as happily against an
       implementation that cannot work in the room (DFM 196).
   ══════════════════════════════════════════════════════════════════════════ */
console.log('\n-- §F6: the pair blob --');
if (!(p2 && p2.state === 'paired')) {
  check('the blob section had a real pair to work with', false, 'no pair formed above');
} else {
  const PID = p2.pid;
  const blob = (world, user, req) => world.as(user,
    `apiPairBlob(${JSON.stringify(Object.assign({ pid: PID }, P2, req))})`);
  const MAXB = w2.as('a@c2ken.net', 'PAIR_BLOB_MAX');
  const BOT = 'name = input("What is your name?")\nprint("Hello " + name)\n';

  const put = blob(w2, 'a@c2ken.net', { op: 'put', slot: 'bot', v: BOT });
  check('a pupil can put her build in the pair blob',
    put && put.ok && put.bytes === BOT.length && Number(put.mi) === 0, JSON.stringify(put));

  /* THE ONE THAT MATTERS: her partner, a different user, reads it back. */
  const got = blob(w2, 'b@c2ken.net', { op: 'get', slot: 'bot', mi: 0 });
  check('and her PARTNER reads it back — the blob crosses users',
    got && got.ok && Number(got.has) === 1 && got.v === BOT, JSON.stringify(got && got.v));

  const back = blob(w2, 'b@c2ken.net', { op: 'put', slot: 'report', v: 'It asked two things and used both.' });
  const backGot = blob(w2, 'a@c2ken.net', { op: 'get', slot: 'report', mi: 1 });
  check('and it crosses back the other way, in its own slot',
    back && back.ok && Number(back.mi) === 1 && backGot && backGot.ok &&
    backGot.v === 'It asked two things and used both.', JSON.stringify(backGot));

  const empty = blob(w2, 'a@c2ken.net', { op: 'get', slot: 'card', mi: 1 });
  check('an unwritten slot answers plainly instead of failing',
    empty && empty.ok && Number(empty.has) === 0 && empty.v === '', JSON.stringify(empty));

  /* the refusals, each named, so a bug cannot hide behind a generic error */
  const refusals = [
    ['bad-slot',      { op: 'get', slot: 'anything', mi: 0 }, 'a slot the lesson never declared'],
    ['bad-op',        { op: 'delete', slot: 'bot', mi: 0 },   'an operation that does not exist'],
    ['bad-member',    { op: 'get', slot: 'bot', mi: 7 },      'a member number outside this pair'],
    ['too-big',       { op: 'put', slot: 'bot', v: 'x'.repeat(MAXB + 1) }, 'more than the blob will hold']
  ];
  refusals.forEach(([err, req, why]) => {
    const r = blob(w2, 'a@c2ken.net', req);
    check('refuses ' + why + ' by name (' + err + ')',
      r && r.ok === false && r.error === err, JSON.stringify(r));
  });
  const stranger = blob(w2, 'c@c2ken.net', { op: 'get', slot: 'bot', mi: 0 });
  check('a pupil outside the pair is refused it entirely (not-your-pair)',
    stranger && stranger.ok === false && stranger.error === 'not-your-pair', JSON.stringify(stranger));

  /* DFM 248, made a measurement: empty every per-user cache silo and read
     again. A cache-backed blob dies here; a properties-backed one does not. */
  Object.keys(w2.cacheSilos || {}).forEach(u => { delete w2.cacheSilos[u]; });
  const afterWipe = blob(w2, 'b@c2ken.net', { op: 'get', slot: 'bot', mi: 0 });
  check('the blob survives every cache being emptied — it is properties-backed',
    afterWipe && afterWipe.ok && afterWipe.v === BOT, JSON.stringify(afterWipe && afterWipe.has));

  /* ---- CONTROL: the same walk against a CACHE-BACKED blob must break ---- */
  const mutant = fixSrc
    .replace('var got = pGet_(blobPKey_(cls, str_(hit.pid), slot, mi), null);',
      'var got = JSON.parse(CacheService.getScriptCache().get(blobPKey_(cls, str_(hit.pid), slot, mi)) || "null");')
    .replace('pPut_(blobPKey_(cls, str_(hit.pid), slot, num_(hit.mi)), { v: v, t: tsec_() });',
      'CacheService.getScriptCache().put(blobPKey_(cls, str_(hit.pid), slot, num_(hit.mi)), JSON.stringify({ v: v, t: tsec_() }), 3600);');
  check('CONTROL: the cache-backed mutant really is a different program',
    mutant !== fixSrc && /getScriptCache\(\)\.put\(blobPKey_/.test(mutant), 'the mutation did not apply');
  const wm = makeWorld(mutant, 'cache-backed mutant');
  wm.as('owner@c2ken.net', `apiPing(${JSON.stringify({ classCode: 'DT-Demo', lessonNum: '1', ci: 2, cc: 10 })})`);
  wm.as('owner@c2ken.net', `apiPairJoin(${JSON.stringify(Object.assign({ stageIdx: 4 }, P2))})`);
  wm.as('a@c2ken.net', `apiPing(${JSON.stringify({ classCode: 'DT-Demo', lessonNum: '1', ci: 3, cc: 10 })})`);
  wm.as('b@c2ken.net', `apiPing(${JSON.stringify({ classCode: 'DT-Demo', lessonNum: '1', ci: 3, cc: 10 })})`);
  wm.as('a@c2ken.net', `apiPairJoin(${JSON.stringify(Object.assign({ stageIdx: 4 }, P2))})`);
  const mp = wm.as('b@c2ken.net', `apiPairJoin(${JSON.stringify(Object.assign({ stageIdx: 4 }, P2))})`);
  if (!(mp && mp.state === 'paired')) {
    check('CONTROL: the mutant world formed its own pair to test with', false, JSON.stringify(mp));
  } else {
    const mPut = wm.as('a@c2ken.net',
      `apiPairBlob(${JSON.stringify(Object.assign({ pid: mp.pid, op: 'put', slot: 'bot', v: BOT }, P2))})`);
    const mGot = wm.as('b@c2ken.net',
      `apiPairBlob(${JSON.stringify(Object.assign({ pid: mp.pid, op: 'get', slot: 'bot', mi: 0 }, P2))})`);
    check('CONTROL: a cache-backed blob hands the partner NOTHING (the fault this proves against)',
      mPut && mPut.ok && mGot && mGot.ok && Number(mGot.has) === 0,
      'put=' + JSON.stringify(mPut && mPut.ok) + ' partner got=' + JSON.stringify(mGot));
  }
}

/* ---- HOME 2: the preview mimic, held to the same answers (DFM 234a) -------
   dev-server.js runs the whole preview as ONE signed-in pupil, so it cannot be
   asked the cross-user half of the question -- and pretending otherwise would
   be a green tick over an assertion nobody made. What it CAN be held to is
   every answer that does not need a second person: the round trip through her
   own slot, and each refusal BY NAME. Those are the answers the pupil-side
   engine branches on, so if the two homes disagree on one of them a card
   behaves differently in the preview than in the room, which is the exact class
   of fault DFM 234 exists to stop. */
async function blobMimic() {
  const src = fs.readFileSync(path.join(ROOT, 'platform', 'dev-server.js'), 'utf8');
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
  vm.runInContext(src, sandbox, { filename: 'dev-server.js' });
  const api = sandbox.OLS_DEV_SERVER;
  if (!api || typeof api.call !== 'function') throw new Error('dev-server.js did not expose OLS_DEV_SERVER.call');
  const who = await api.call({ action: 'whoami' });
  const me = (who && who.email) || '';

  /* the same class and the same pair, seeded straight into the preview's own
     state -- how a pair FORMS is the business of the sections above */
  const st = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
  st.classes = [{ name: 'DT-Demo', owner: 'owner@c2ken.net', year: 'j1', created: new Date().toISOString() }];
  st.locks = { 'DT-Demo': { '1': { u: 1, on: 1 } } };
  st.pairing = { 'DT-Demo|j1-01': { P: { pid1: { m: [me, 'partner@c2ken.net'], t: 1 } }, solo: [] } };
  localStorage.setItem('ks3dt-dev', JSON.stringify(st));

  const call = (req) => api.call(Object.assign({ action: 'pairBlob', classCode: 'DT-Demo', lessonId: 'j1-01', pid: 'pid1' }, req));
  return { me, call };
}

blobMimic().then(async (dev) => {
  console.log('\n-- §F6: the same blob in the preview mimic (DFM 234a) --');
  check('the preview mimic knows who is signed in', !!dev.me, JSON.stringify(dev.me));
  const BOT2 = 'name = input("What is your name?")\nprint("Hello " + name)\n';

  const dPut = await dev.call({ op: 'put', slot: 'bot', v: BOT2 });
  const dGet = await dev.call({ op: 'get', slot: 'bot', mi: 0 });
  check('the mimic stores and returns her own build, byte for byte',
    dPut && dPut.ok && Number(dPut.mi) === 0 && dGet && dGet.ok && Number(dGet.has) === 1 && dGet.v === BOT2,
    JSON.stringify({ put: dPut, has: dGet && dGet.has }));

  const dEmpty = await dev.call({ op: 'get', slot: 'card', mi: 1 });
  check('an unwritten slot answers plainly in the mimic too',
    dEmpty && dEmpty.ok && Number(dEmpty.has) === 0 && dEmpty.v === '', JSON.stringify(dEmpty));

  /* THE PARITY CLAIM: the same request, the same named answer, in both homes */
  const bothWays = [
    ['bad-slot',   { op: 'get', slot: 'anything', mi: 0 }],
    ['bad-op',     { op: 'delete', slot: 'bot', mi: 0 }],
    ['bad-member', { op: 'get', slot: 'bot', mi: 7 }],
    ['too-big',    { op: 'put', slot: 'bot', v: 'x'.repeat(4097) }],
    ['not-your-pair', { op: 'get', slot: 'bot', mi: 0, pid: 'not-a-pair-of-hers' }]
  ];
  for (const [want, req] of bothWays) {
    const r = await dev.call(req);
    check('mimic and template agree: ' + want,
      r && r.ok === false && r.error === want, JSON.stringify(r));
  }
  /* the size ceiling is a NUMBER in two files; if they drift, a build that saves
     in the preview is refused in the room */
  const tMax = w2.as('a@c2ken.net', 'PAIR_BLOB_MAX');
  const dOver = await dev.call({ op: 'put', slot: 'bot', v: 'x'.repeat(tMax) });
  check('and they agree on the ceiling itself (' + tMax + ' characters exactly fits)',
    dOver && dOver.ok === true && Number(dOver.max) === tMax, JSON.stringify(dOver));

  console.log('');
  if (failures) { console.log('qa-pair-stores: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-pair-stores: ALL GREEN');
}).catch(e => {
  console.log('  FAIL  the preview mimic half could not run — ' + e.message);
  console.log('\nqa-pair-stores: 1 FAILURE(S)');
  process.exit(1);
});
