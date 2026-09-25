#!/usr/bin/env node
/* qa-artifact-wayout.js — THE DRIVE INSPECTION'S WAY OUT, ON EVERY CARD IT LIVES ON.
 *
 * DFM 290 (a teacher's report, 24 Sep 2026): in J1 Lesson 2's "Bank your build"
 * the card said "The check could not reach your Drive — try again in a moment."
 * and offered Try again for ever. The artifact engine (j1-02 bank, j1-03 rig,
 * j1-05 ship) and the casework SHIP block (j1-04) only ever offered a way out
 * on the not-found answer; the skip they had was a bare next() the Live tab
 * could not see; `locked` read as "could not reach"; and a call that never
 * answered spun for ever. DFM 287 fixed the side quest's drivecheck in V67.
 *
 * WHAT THIS GATE PROVES (spec V68_DRIVE_WAYOUT_SPEC.md §10):
 *   (a) could-not-run ×2 → note + ghost; press → one next, ONE zero-XP event skipped=drive-error
 *   (b) no-folder ×2 / (b2) not-found ×2 → the same, with the why recorded (was a bare next)
 *   (c) a call that never answers → a timeout failure, counted; ×2 → the way out
 *   (d) locked → its own sentence
 *   (e) the found answer and the FIRST failure of each kind render byte-identically
 *   (f) the casework SHIP block gains the same way out
 *   (g) every skip detail is `skipped=<why>` — short, lower-case, safe
 *   (h) the side quest's drivecheck (Patch D: timeout only) renders byte-identically
 *       on intro / pass / fail / first could-not-run / second could-not-run, and a
 *       hung call now ends. This stands in for qa-clip-overlay while that gate's
 *       own pinned base (a6f47b1) is unreachable after the 23 Sep 2026 history purge.
 *
 * The pre-change engine is RUN, not described: BASE_REF is PINNED to the V67 main.
 * SHIP_REF=<ref> runs the checks against that ref's engine instead of the working
 * tree — with SHIP_REF=90d6077 the checks a–d MUST fail (the dead end is real).
 *
 *   node qa-artifact-wayout.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');

const BASE_REF = '90d6077';          /* V67 on main — the engine with the dead end. PINNED. */
const SHIP_REF = process.env.SHIP_REF || '';
const REPO = path.resolve(__dirname, '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

let failures = 0;
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};
const gitShow = (ref, p) => execFileSync('git', ['-C', REPO, 'show', ref + ':' + p], { encoding: 'utf8', maxBuffer: 64 << 20 });
const lessonChunk = (file, id) => {
  const l = JSON.parse(fs.readFileSync(path.join(SRC, 'j1', 'lessons', file), 'utf8'));
  return (l.chunks || []).find(c => c.id === id);
};
const WHY = /^skipped=[a-z0-9-]{1,20}$/;

async function page(browser, engineSrc) {
  const pg = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto('about:blank');
  await pg.addStyleTag({ path: STYLE });
  await pg.evaluate(() => {
    window.OLS_CALL_TIMEOUT_MS = 300;
    window.App = {
      esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      asset: p => p,
      armButton: (b, fn) => { if (b) b.onclick = fn; },
      toast: () => {}, confirm: () => Promise.resolve(true),
      state: {}
    };
  });
  await pg.addScriptTag({ content: engineSrc });
  return { pg, errs };
}

/* Mount the artifact card, press Run `answers.length` times (each press gets the
   next answer; 'HANG' never settles), snapshot after each, optionally press the ghost. */
function runArtifact(pg, chunk, answers, pressSkip) {
  return pg.evaluate(async ([ch, answers, pressSkip]) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host');
    const events = []; let nexts = 0; let n = 0;
    window.Engines.artifact.mount(host, ch, {
      chunk: ch, review: false, catchup: false, lessonEntry: { num: '2' },
      awardBadge: () => Promise.resolve({ ok: true }), next: () => { nexts++; },
      saveEvent: (e) => { events.push(e); return Promise.resolve({ ok: true }); },
      markItem: () => Promise.resolve({ ok: true }),
      call: () => { const a = answers[n++]; return a === 'HANG' ? new Promise(() => {}) : Promise.resolve(a); }
    });
    await wait(40);
    const card = host.querySelector('.af-card');
    const run = host.querySelector('.rung-actions .primary-btn');
    const ghost = host.querySelector('.rung-actions .ghost-btn');
    const snaps = [];
    for (let i = 0; i < answers.length; i++) {
      run.click();
      await wait(answers[i] === 'HANG' ? 650 : 80);
      snaps.push({
        result: host.querySelector('.af-result').innerHTML,
        note: !!host.querySelector('.af-skip-note'),
        ghostHidden: ghost.hidden,
        runDisabled: run.disabled,
        loading: !!host.querySelector('.af-result .panel-loading')
      });
    }
    const ghostText = ghost.textContent;
    const cardHtml = card.outerHTML;
    if (pressSkip && !ghost.hidden) { ghost.click(); await wait(80); }
    return { snaps, ghostText, cardHtml, events, nexts };
  }, [chunk, answers, pressSkip]);
}

/* the SHIP block: seed a board with every case closed and the RC run done, open
   the release desk, and press the HQ Inspection twice on a could-not-run answer */
function runShip(pg, chunk, answer) {
  return pg.evaluate(async ([ch, answer]) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host');
    const ids = ((ch.config && ch.config.cases) || []).map(c => String(c.id));
    const draft = { casework: { closed: ids, silver: [], logs: {}, gg: 1, rc: 1, rcs: 42, ship: 0, sk: 0, stretch: 0, sn: '' } };
    window.App.state = { draft: draft };
    window.Engines.casework.mount(host, ch, {
      chunk: ch, review: false, catchup: false, lessonEntry: { num: '4' }, draft: draft,
      awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
      saveEvent: () => Promise.resolve({ ok: true }), markItem: () => Promise.resolve({ ok: true }),
      call: () => Promise.resolve(answer)
    });
    await wait(80);
    const open = host.querySelector('.intro-card .primary-btn');
    if (open) { open.click(); await wait(80); }
    const rel = host.querySelector('.case-release');
    if (!rel) return { painted: false, why: 'no release pin' };
    rel.click();
    await wait(80);
    const run = host.querySelector('.case-ship-btn');
    const ghost = host.querySelector('.case-ship-skip');
    if (!run || !ghost) return { painted: false, why: 'no ship panel' };
    run.click(); await wait(80);
    const first = { note: !!host.querySelector('.case-ship .af-skip-note'), ghostHidden: ghost.hidden };
    run.click(); await wait(80);
    const second = { note: !!host.querySelector('.case-ship .af-skip-note'), ghostHidden: ghost.hidden, text: ghost.textContent };
    if (!ghost.hidden) { ghost.click(); await wait(80); }
    return { painted: true, first, second, after: host.querySelector('.case-ship') ? host.querySelector('.case-ship').innerHTML : '' };
  }, [chunk, answer]);
}

/* the side quest's drivecheck, for Patch D's byte-identity */
function runDrive(pg, chunk, answers) {
  return pg.evaluate(async ([ch, answers]) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host');
    let n = 0;
    window.Engines.drivecheck.mount(host, ch, {
      chunk: ch, review: false, catchup: false, lessonEntry: { num: 'S1' },
      awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
      saveEvent: () => Promise.resolve({ ok: true }), markItem: () => Promise.resolve({ ok: true }),
      call: () => { const a = answers[n++]; return a === 'HANG' ? new Promise(() => {}) : Promise.resolve(a); }
    });
    await wait(60);
    const snaps = [host.innerHTML];
    host.querySelector('.intro-card .primary-btn').click();
    for (let i = 0; i < answers.length; i++) {
      if (i > 0) { const b = host.querySelector('.card .primary-btn'); if (b) b.click(); }
      await wait(answers[i] === 'HANG' ? 800 : 500);
      snaps.push(host.innerHTML);
    }
    return snaps;
  }, [chunk, answers]);
}

(async () => {
  console.log('qa-artifact-wayout — the Drive inspection\'s way out, on every card (DFM 290)\n');
  console.log('  pre-change engine: ' + BASE_REF + ' (pinned)' + (SHIP_REF ? '   shipping engine: ' + SHIP_REF + ' (SHIP_REF)' : '   shipping engine: working tree') + '\n');
  const nowSrc = SHIP_REF ? gitShow(SHIP_REF, 'ks3-dt/platform/engines.js') : fs.readFileSync(ENGINES, 'utf8');
  const oldSrc = gitShow(BASE_REF, 'ks3-dt/platform/engines.js');
  const bank = lessonChunk('j1-02.json', 'bank');
  const board = lessonChunk('j1-04.json', 'board');
  const inspect = lessonChunk('j1-sq1.json', 'sq-inspect');
  if (!bank || !board || !inspect) { console.log('  FAIL  a chunk is missing from content-src'); process.exit(1); }
  const skipLabel = bank.config.skipLabel || 'Carry on without the check';

  const browser = await chromium.launch();
  try {
    const { pg: pgNow, errs: eNow } = await page(browser, nowSrc);
    const { pg: pgOld, errs: eOld } = await page(browser, oldSrc);
    const ERR = { ok: false, error: 'drive-error' };
    const NOF = { ok: true, found: false, noFolder: true };
    const NF = { ok: true, found: false };
    const FOUND = { ok: true, found: true, name: 'x.hex', ageMin: 2 };
    const whys = [];

    console.log('=== (a) could-not-run twice → the way out (the dead end the teacher saw) ===');
    const aN = await runArtifact(pgNow, bank, [ERR, ERR], true);
    const aO = await runArtifact(pgOld, bank, [ERR, ERR], true);
    check(/could not reach your Drive/.test(aN.snaps[0].result) && !aN.snaps[0].note && aN.snaps[0].ghostHidden,
      'after ONE failure: the ✗ line, no note, the ghost hidden');
    check(aN.snaps[1].note && !aN.snaps[1].ghostHidden, 'after the SECOND failure: the note AND the ghost button');
    check(aN.ghostText === skipLabel, '  the ghost says the content\'s words: "' + aN.ghostText + '"');
    check(aN.nexts === 1 && aN.events.length === 1 && Number(aN.events[0].xp) === 0 && aN.events[0].detail === 'skipped=drive-error',
      '  pressing it: one next, ONE zero-XP event skipped=drive-error (' + JSON.stringify(aN.events.map(e => e.detail)) + ')');
    if (aN.events[0]) whys.push(aN.events[0].detail);
    control(aO.snaps[1].ghostHidden && !aO.snaps[1].note, 'the pre-change engine offers NO way out after two could-not-runs');

    console.log('\n=== (b) no folder twice / (b2) not found twice → the way out, and the Live tab sees it ===');
    for (const [label, ans, why] of [['b ', NOF, 'skipped=no-folder'], ['b2', NF, 'skipped=not-found']]) {
      const n = await runArtifact(pgNow, bank, [ans, ans], true);
      const o = await runArtifact(pgOld, bank, [ans, ans], true);
      check(!n.snaps[0].note && n.snaps[0].ghostHidden && n.snaps[1].note && !n.snaps[1].ghostHidden,
        label + ': no way out after one, note + ghost after two');
      check(n.nexts === 1 && n.events.length === 1 && Number(n.events[0].xp) === 0 && n.events[0].detail === why,
        label + ':   pressing it: one next, ONE zero-XP event ' + why + ' (' + JSON.stringify(n.events.map(e => e.detail)) + ')');
      if (n.events[0]) whys.push(n.events[0].detail);
      control(o.nexts === 1 && o.events.length === 0, label + ': the pre-change skip is a bare next — ZERO events, the Live tab is blind');
    }

    console.log('\n=== (c) a call that never answers → a counted failure, not a spinner for ever ===');
    const cN = await runArtifact(pgNow, bank, ['HANG', 'HANG'], true);
    const cO = await runArtifact(pgOld, bank, ['HANG'], false);
    check(!cN.snaps[0].loading && /dc-row miss/.test(cN.snaps[0].result) && cN.snaps[0].runDisabled === false,
      'after the timeout: the ✗ line, the spinner gone, Run pressable again');
    check(cN.snaps[1].note && !cN.snaps[1].ghostHidden, 'a second hang: the note and the ghost');
    check(cN.events.length === 1 && cN.events[0].detail === 'skipped=timeout', '  pressing it records skipped=timeout (' + JSON.stringify(cN.events.map(e => e.detail)) + ')');
    if (cN.events[0]) whys.push(cN.events[0].detail);
    control(cO.snaps[0].loading && cO.snaps[0].runDisabled === true, 'the pre-change engine is still spinning with Run disabled');

    console.log('\n=== (d) locked has its own sentence ===');
    const dN = await runArtifact(pgNow, bank, [{ ok: false, error: 'locked' }], false);
    const dO = await runArtifact(pgOld, bank, [{ ok: false, error: 'locked' }], false);
    const LOCKED = (bank.config.lockedText || 'Your teacher has not opened this lesson yet — ask them.');
    const lockedEsc = LOCKED.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    check(dN.snaps[0].result.indexOf(lockedEsc) !== -1, 'locked reads: "' + LOCKED + '"');
    control(/could not reach your Drive/.test(dO.snaps[0].result), 'the pre-change engine told a locked pupil it "could not reach your Drive"');

    console.log('\n=== (e) the found path and every FIRST failure are byte-identical to ' + BASE_REF + ' ===');
    for (const [label, ans] of [['found', FOUND], ['first could-not-run', ERR], ['first no-folder', NOF], ['first not-found', NF]]) {
      const n = await runArtifact(pgNow, bank, [ans], false);
      const o = await runArtifact(pgOld, bank, [ans], false);
      check(n.snaps[0].result === o.snaps[0].result, label + ': .af-result identical');
    }
    {
      const n = await runArtifact(pgNow, bank, [], false);
      const o = await runArtifact(pgOld, bank, [], false);
      const norm = h => h.replace(/(<button class="ghost-btn" type="button" hidden="">)[^<]*(<\/button>)/, '$1~$2');
      check(norm(n.cardHtml) === norm(o.cardHtml), 'the mounted card: identical once the ghost button\'s words are set aside');
    }

    console.log('\n=== (f) the casework SHIP block (j1-04) gains the same way out ===');
    const fN = await runShip(pgNow, board, ERR);
    const fO = await runShip(pgOld, board, ERR);
    if (!fN.painted) check(false, 'the SHIP panel painted (' + fN.why + ')');
    else {
      check(!fN.first.note && fN.first.ghostHidden, 'after ONE dropped line: no note, the ghost hidden');
      check(fN.second.note && !fN.second.ghostHidden, 'after the SECOND: the note and the ghost "' + fN.second.text + '"');
      check(/Signed off without the Drive copy\./.test(fN.after), '  pressing it takes the existing sign-off path');
    }
    control(fO.painted && fO.second.ghostHidden && !fO.second.note, 'the pre-change SHIP block offers NO way out after two dropped lines');

    console.log('\n=== (g) every skip detail is skipped=<why>, short and safe ===');
    check(whys.length === 4 && whys.every(w => WHY.test(w)), JSON.stringify(whys));

    console.log('\n=== (h) the side quest\'s inspection (Patch D, timeout only) is unchanged ===');
    const DERR = { ok: false, error: 'net' };
    for (const [label, answers] of [
      ['intro + pass', [{ ok: true, school: true, dtwork: true, simulated: true }]],
      ['fail (DT Work missing)', [{ ok: true, school: true, dtwork: false, simulated: true }]],
      ['could-not-run, first then second', [DERR, DERR]]
    ]) {
      const n = await runDrive(pgNow, inspect, answers);
      const o = await runDrive(pgOld, inspect, answers);
      check(n.length === o.length && n.every((h, i) => h === o[i]), label + ': every screen identical');
    }
    const hN = await runDrive(pgNow, inspect, ['HANG']);
    const hO = await runDrive(pgOld, inspect, ['HANG']);
    const firstFail = (await runDrive(pgNow, inspect, [DERR]))[1];
    const firstFailOld = (await runDrive(pgOld, inspect, [DERR]))[1];
    check(hN[1] === firstFail, 'a hung inspection ends on the could-not-run card');
    control(hO[1] !== firstFailOld, 'the pre-change inspection was still waiting');

    check(eNow.length === 0, 'no page errors on the shipping engine' + (eNow.length ? ': ' + eNow.join(' | ') : ''));
    void eOld;
  } finally {
    await browser.close();
  }
  console.log('\n' + (failures ? 'qa-artifact-wayout: ' + failures + ' FAIL' : 'qa-artifact-wayout: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('qa-artifact-wayout FAILED: ' + (e && e.stack || e)); process.exit(1); });
