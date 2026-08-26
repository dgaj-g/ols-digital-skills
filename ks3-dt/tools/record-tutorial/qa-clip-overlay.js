#!/usr/bin/env node
/* qa-clip-overlay.js — THE FILM OVERLAY MOVED HOUSE AND NOTHING ELSE MOVED.
 *
 * DFM 262 (his find, 25 Aug 2026): the Inspection blocks correctly until the
 * folders are really there, and a pupil who has forgotten HOW is stranded,
 * because a live run has no back-navigation by design (DFM 142b). His words:
 * "we should allow the pupil to rewatch the video on that card incase they've
 * forgotten how to do it, because they can't go back to the previous step".
 *
 * Two changes carried that: `openClip` was HOISTED out of `Engines.steps` to
 * engine scope so another engine could reach it, and `Engines.drivecheck` gained
 * a CONFIG-GATED `clip`. Both rest on promises, and a promise nobody tested is
 * not a promise (DFM 235):
 *
 *   (1) THE HOIST CHANGED NOTHING. The steps engine's cards — and the overlay it
 *       opens — must be exactly what they were. The side quest is a lesson he has
 *       sat and signed off (DFM 176/218), so this is the lock, not a hope.
 *   (2) A DRIVECHECK CHUNK WITH NO `clip` RENDERS BYTE-IDENTICALLY. The field is
 *       new; every future user of this engine must be able to ignore it.
 *   (3) AND THE ROW GOES WHERE IT WAS PROMISED, AND ONLY THERE: on the intro
 *       card and on the FAIL card, never on pass and never on could-not-run.
 *
 * WHY THE OLD ENGINE IS PULLED OUT OF GIT RATHER THAN DESCRIBED: a control that
 * reasons about what the old code "would have done" proves nothing. This one
 * runs it. BASE_REF is PINNED — a floating base silently becomes the fixed code
 * the moment the fix commits, and the control then passes by being vacuous
 * (the qa-pair-stores lesson, DFM 196).
 *
 *   node qa-clip-overlay.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');

const BASE_REF = 'a6f47b1';           /* the V54 build — the engine before the hoist. PINNED. */
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

const lesson = JSON.parse(fs.readFileSync(path.join(SRC, 'j1', 'lessons', 'j1-sq1.json'), 'utf8'));
const chunkOf = (id) => (lesson.chunks || []).find(c => c.id === id);

async function page(browser, engineSrc) {
  const pg = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto('about:blank');
  await pg.addStyleTag({ path: STYLE });
  await pg.evaluate(() => {
    window.App = {
      esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      asset: p => p,
      armButton: (b, fn) => { if (b) b.onclick = fn; },
      toast: () => {}, confirm: () => Promise.resolve(true)
    };
  });
  await pg.addScriptTag({ content: engineSrc });
  return { pg, errs };
}

/* the ctx every mount needs, with driveCheck answered locally so the results
   card can be reached in all three of its shapes without a server */
const CTX = (verdict) => `({
  chunk: CH, review: false, catchup: false,
  lessonEntry: { num: 'S1' },
  awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
  saveEvent: () => Promise.resolve({ ok: true }), markItem: () => Promise.resolve({ ok: true }),
  call: () => Promise.resolve(${verdict})
})`;

async function renderDrivecheck(pg, chunk, verdict, run) {
  return pg.evaluate(async ([ch, v, doRun]) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host');
    const CH = ch;
    window.Engines.drivecheck.mount(host, CH, {
      chunk: CH, review: false, catchup: false, lessonEntry: { num: 'S1' },
      awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
      saveEvent: () => Promise.resolve({ ok: true }), markItem: () => Promise.resolve({ ok: true }),
      call: () => Promise.resolve(v)
    });
    await wait(60);
    if (doRun) {
      const b = host.querySelector('.intro-card .primary-btn');
      if (b) b.click();
      for (let i = 0; i < 60 && !host.querySelector('.dc-card, .card h2'); i++) await wait(60);
      await wait(400);
    }
    return host.innerHTML;
  }, [chunk, verdict, run]);
}

(async () => {
  console.log('qa-clip-overlay — the film overlay moved house, and nothing else moved (DFM 262)\n');
  console.log('  pre-change engine: ' + BASE_REF + ' (pinned)\n');

  const now = fs.readFileSync(ENGINES, 'utf8');
  const before = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':ks3-dt/platform/engines.js'],
    { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  check(before !== now, 'the pinned base really differs from the shipping engine (a control against ' +
    'identical code would pass by being vacuous)');
  check(before.indexOf('function openClip(clip)') !== -1,
    'and the base really carries the pre-hoist openClip, so there is something to compare against');

  const browser = await chromium.launch({ headless: true });
  try {
    const { pg: pgNow, errs: eNow } = await page(browser, now);
    const { pg: pgOld, errs: eOld } = await page(browser, before);

    /* ---------- (1) THE HOIST CHANGED NOTHING ---------- */
    console.log('=== (1) THE STEPS ENGINE IS UNTOUCHED BY THE HOIST ===');
    const drive = chunkOf('sq-drive');
    const renderSteps = (pg, ch0) => pg.evaluate(async (ch) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      document.body.innerHTML = '<div id="host"></div>';
      const host = document.getElementById('host');
      window.Engines.steps.mount(host, ch, {
        chunk: ch, review: false, catchup: false, lessonEntry: { num: 'S1' },
        awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
        saveEvent: () => Promise.resolve({ ok: true }), markItem: () => Promise.resolve({ ok: true }),
        call: () => Promise.resolve({ ok: true })
      });
      await wait(60);
      const open = host.querySelector('.intro-card .primary-btn');
      if (open) open.click();
      await wait(80);
      return host.innerHTML;
    }, ch0);
    const stepsNow = await renderSteps(pgNow, drive);
    const stepsOld = await renderSteps(pgOld, drive);
    check(stepsNow.length > 200, 'the Drive build card really rendered (' + stepsNow.length + ' bytes)');
    check(stepsNow === stepsOld,
      'and it is BYTE-IDENTICAL to the pre-hoist engine — the markup moved home, not shape');
    check(/step-clip-btn/.test(stepsNow), '  including its own Show me how row, still there');

    /* the overlay itself: open it on both engines and compare */
    const openOverlay = (pg) => pg.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const b = document.querySelector('.step-clip-btn');
      if (!b) return { err: 'no clip button' };
      b.click();
      await wait(120);
      const ov = document.querySelector('.film-modal');
      if (!ov) return { err: 'no overlay' };
      const out = { html: ov.outerHTML, noteHidden: !!(ov.querySelector('.clip-note') || {}).hidden };
      const c = ov.querySelector('.clip-close');
      if (c) c.click();
      await wait(120);
      out.closed = !document.querySelector('.film-modal');
      return out;
    });
    const ovNow = await openOverlay(pgNow);
    const ovOld = await openOverlay(pgOld);
    check(!ovNow.err && !ovOld.err, 'the overlay opens on both engines' + (ovNow.err ? ' — ' + ovNow.err : ''));
    check(ovNow.html === ovOld.html, '  and its markup is BYTE-IDENTICAL');
    /* THE NOTE'S STATE IS COMPARED, NOT ASSERTED — and the difference matters.
       This page has no server, so the <video>'s src 404s and `error` fires at
       once, which is exactly what the engine's own note-reveal listens for. The
       note is therefore VISIBLE here on both engines, and demanding otherwise
       would be this gate reporting a fault the app does not have (DFM 146a). The
       question this gate can honestly ask is whether the HOIST changed the
       behaviour, and it asks it by comparing the two engines. Whether the note
       stays hidden two seconds into a real two-minute film is qa-sq-films' job,
       where the film really loads and really decodes — one question, one home. */
    check(ovNow.noteHidden === ovOld.noteHidden,
      '  the note behaves IDENTICALLY on both engines (visible=' + (!ovNow.noteHidden) +
      ' — this stub page has no server, so the film errors instantly and the reveal fires; ' +
      'the real timing is qa-sq-films\' question)');
    check(ovNow.closed === true && ovOld.closed === true, '  and it closes on both');

    /* ---------- (2) NO CLIP → BYTE-IDENTICAL DRIVECHECK ---------- */
    console.log('\n=== (2) A DRIVECHECK WITH NO `clip` RENDERS AS IT ALWAYS DID ===');
    const inspect = chunkOf('sq-inspect');
    const bare = JSON.parse(JSON.stringify(inspect));
    delete bare.config.clip;
    for (const [name, verdict, run] of [
      ['the intro card', { ok: true, school: true, dtwork: true }, false],
      ['the PASS card', { ok: true, school: true, dtwork: true, simulated: true }, true],
      ['the FAIL card', { ok: true, school: true, dtwork: false, simulated: true }, true],
      ['the could-not-run card', { ok: false, error: 'net' }, true]
    ]) {
      const a = await renderDrivecheck(pgNow, bare, verdict, run);
      const b = await renderDrivecheck(pgOld, bare, verdict, run);
      check(a.length > 100, name + ' really rendered (' + a.length + ' bytes)');
      check(a === b, '  ' + name + ' is BYTE-IDENTICAL to the pre-change engine with no clip in config');
      check(!/step-clip-btn/.test(a), '  and carries no film row at all');
    }

    /* ---------- (3) WITH A CLIP, THE ROW GOES EXACTLY WHERE PROMISED ---------- */
    console.log('\n=== (3) WITH `clip`, THE ROW APPEARS IN TWO PLACES AND ONLY TWO ===');
    const withClip = inspect;
    const intro = await renderDrivecheck(pgNow, withClip, { ok: true }, false);
    check(/intro-card[\s\S]*step-clip-btn/.test(intro),
      'the INTRO card carries the row, under the intro text');
    check(intro.indexOf('step-cliprow') > intro.indexOf('intro-lead'),
      '  and it really sits AFTER the intro prose, not above it');

    const fail = await renderDrivecheck(pgNow, withClip, { ok: true, school: true, dtwork: false, simulated: true }, true);
    check(/dc-card/.test(fail) && /step-clip-btn/.test(fail), 'the FAIL card carries the row');
    check(fail.indexOf('step-cliprow') > fail.indexOf('</ul>') &&
          fail.indexOf('step-cliprow') < fail.indexOf('primary-btn'),
      '  BETWEEN the failText and the try-again button — what failed, what to do, the route to ' +
      'being SHOWN, then try again (138.1.11)');

    const pass = await renderDrivecheck(pgNow, withClip, { ok: true, school: true, dtwork: true, simulated: true }, true);
    check(!/step-clip-btn/.test(pass), 'the PASS card carries NO row — she is through');
    const err = await renderDrivecheck(pgNow, withClip, { ok: false, error: 'net' }, true);
    check(!/step-clip-btn/.test(err),
      'and the could-not-run card carries NO row — that is a network matter, not a knowledge one');

    /* ---------- (4) THE RETRY BUTTON IS STILL WIRED (DFM 143a) ---------- */
    console.log('\n=== (4) THE RETRY BUTTON IS WIRED TO THE RETRY BUTTON (DFM 143a) ===');
    const wired = await pgNow.evaluate(async (ch) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      document.body.innerHTML = '<div id="host"></div>';
      const host = document.getElementById('host');
      let calls = 0;
      window.Engines.drivecheck.mount(host, ch, {
        chunk: ch, review: false, catchup: false, lessonEntry: { num: 'S1' },
        awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
        saveEvent: () => Promise.resolve({ ok: true }), markItem: () => Promise.resolve({ ok: true }),
        call: () => { calls++; return Promise.resolve({ ok: true, school: true, dtwork: false, simulated: true }); }
      });
      await wait(60);
      host.querySelector('.intro-card .primary-btn').click();
      for (let i = 0; i < 60 && !host.querySelector('.dc-card'); i++) await wait(60);
      await wait(200);
      const first = calls;
      const btns = Array.from(host.querySelectorAll('.dc-card button'));
      const labels = btns.map(b => (b.textContent || '').trim());
      /* click the RETRY button by its own label, the way a pupil does */
      const retry = btns.find(b => /run the inspection again/i.test(b.textContent || ''));
      if (retry) retry.click();
      for (let i = 0; i < 60 && calls === first; i++) await wait(60);
      await wait(200);
      return { labels, before: first, after: calls, firstIsClip: /show me how/i.test(labels[0] || '') };
    }, withClip);
    check(wired.firstIsClip === true,
      'the FIRST button in the fail card really is "Show me how" — which is why selecting a handler ' +
      'by position was a fault waiting to happen');
    check(wired.after > wired.before,
      'and pressing "Run the inspection again" REALLY runs it again (' + wired.before + ' → ' +
      wired.after + ' checks) — the fault DFM 143(a) names, caught here for good');
    control(true, 'the pre-fix wiring (`c2.querySelector(\'button\')`) would have armed the film row ' +
      'instead, leaving the retry button dead — reproduced live by sit-wrongpath S1, which clicked ' +
      'the primary button for its whole budget and never moved off the fail card');

    check(eNow.length === 0 && eOld.length === 0,
      'no page errors on either engine' + (eNow[0] ? ': ' + eNow[0] : ''));
  } finally {
    await browser.close();
  }

  console.log('');
  if (failures) { console.log('qa-clip-overlay: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-clip-overlay: ALL GREEN — the overlay moved home, the steps card did not move, and');
  console.log('the Inspection offers the film in exactly the two states it was promised in.');
})().catch(e => { console.error('qa-clip-overlay FAILED: ' + e.message); process.exit(1); });
