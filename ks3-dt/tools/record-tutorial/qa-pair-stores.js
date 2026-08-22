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
  return { as, world };
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

console.log('');
if (failures) { console.log('qa-pair-stores: ' + failures + ' FAILURE(S)'); process.exit(1); }
console.log('qa-pair-stores: ALL GREEN');
