#!/usr/bin/env node
/* qa-click-safety.js — A SINGLE CLICK NEVER DESTROYS PLACED WORK (DFM 272).
 *
 * HIS FINDING, 27 August 2026, sitting J2 Lesson 3, training build 3b:
 *   "the third line was put back over to the left"
 * He was typing into the gaps on neighbouring lines. One click landed on a
 * placed line's BODY and the engine threw it back to the tray — no
 * confirmation, no announcement, nothing on screen to say the program had just
 * been unbuilt. He pressed RUN, it failed, and the engine's own honest error
 * pointed him at box names he had not mistyped. The screen blamed the pupil for
 * a destruction the screen had performed.
 *
 * THE MECHANISM, read at the line rather than recalled: the pyrun tray's click
 * handler is `if (isPlaced) take(si); else put(si, null)`. Placement and removal
 * were the same gesture, so the gesture that builds is the gesture that unbuilds.
 * The ordering engine has the identical shape.
 *
 * WHAT THIS GATE PROVES, and every one of them is proved by CLICKING rather than
 * by reading source:
 *   (1) On every assembly card of every lesson of every year — DERIVED from the
 *       content tree, never typed (DFM 206/K23) — a click on the body of a
 *       PLACED row leaves it placed.
 *   (2) The deliberate acts still work: the labelled remove control takes the
 *       row back, and Enter on a focused placed row still takes it back, because
 *       both are deliberate and neither is a stray (DFM 272's own wording).
 *   (3) Placing still works. A law that protected placed work by making
 *       placement impossible would be worse than the fault.
 *   (4) The remove control is ANNOUNCED: it carries the row's own text in its
 *       accessible name, so a pupil who cannot see the row still knows which
 *       line the control removes (DFM 149's family — a symbol is a word she has
 *       to decode).
 *
 * THE LOCKED LESSONS ARE ASSERTED AND WAIVED, NEVER SKIPPED (DFM 221 + 204).
 * The two Lesson 2s carry the same shipped trap and are signed off, so the
 * question is still ASKED there and the answer is PRINTED as a waived finding
 * with his one-word ruling named. An exemption that hides a class of fault is
 * worse than no check (DFM 213) — so nothing here is quietly not run.
 *
 * THE CONTROL (DFM 196). Every assertion is run a second time against the engine
 * he sat, pulled out of git at BASE_REF, in the same browser, driven the same
 * way. His own card must FAIL there. BASE_REF is PINNED, because a floating base
 * becomes the fixed code the moment the fix commits and the control then passes
 * by being vacuous (the qa-pair-stores lesson).
 *
 *   node qa-click-safety.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');
const PW = require('./lib/placed-work.js');

const BASE_REF = '7d9c274';          /* V58 — the engine he sat. PINNED. */
const REPO = path.resolve(__dirname, '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const SKULPT = path.join(REPO, 'ks3-dt', 'platform', 'assets', 'vendor', 'skulpt');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

/* signed off on his own screen — findings here are REPORTED, never fixed
   without his word (DFM 221). The list is the same one qa-language keeps for
   the same reason, stated here rather than imported so this gate can say in its
   own voice what it is waiving. */
const LOCKED = new Set(['j1-01', 'j1-02', 'j1-03', 'j1-04', 'j1-05', 'j1-sq1',
  'j2-01', 'j2-02', 'j3-01', 'j3-02']);

let failures = 0;
const waived = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};
const waive = (m) => { console.log('  WAIVED  ' + m); waived.push(m); };

/* ---- every chunk of every lesson that draws assembly rows, DERIVED -------- */
function assemblyChunks() {
  const out = [];
  for (const year of ['j1', 'j2', 'j3']) {
    const dir = path.join(SRC, year, 'lessons');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(n => /\.json$/.test(n))) {
      const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const ch of (lesson.chunks || [])) {
        if (ch.engine === 'pyrun' || ch.engine === 'parsons') out.push({ lesson, chunk: ch });
      }
    }
  }
  return out;
}

async function makePage(browser, engineSrc) {
  const pg = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
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
      toast: () => {}
    };
  });
  await pg.addScriptTag({ content: engineSrc });
  await pg.addScriptTag({ path: path.join(SKULPT, 'skulpt.min.js') });
  await pg.addScriptTag({ path: path.join(SKULPT, 'skulpt-stdlib.js') });
  await pg.evaluate(() => { if (window.PyRun) window.PyRun._p = Promise.resolve(true); });
  return { pg, errs };
}

const MOUNT = `(function(engine, chunk, item){
  document.body.innerHTML = '<div id="host"></div>';
  var host = document.getElementById('host');
  window.Engines[engine].mount(host, chunk, {
    chunk: chunk, review: false, catchup: false, item: item,
    awardBadge: function () { return Promise.resolve({ ok: true }); },
    next: function () {},
    saveEvent: function () { return Promise.resolve({ ok: true }); },
    markItem: function () { return Promise.resolve({ ok: true, correct: false }); }
  });
  return true;
})`;

/* one build at a time, for the reason qa-nested-interactive states: the engine
   only moves on when a build MATCHES, so reaching build 4 would mean solving
   builds 1-3 — and auditing build 1 only is the DFM 204 fault this gate exists
   to refuse to commit itself. */
function oneBuildChunk(chunk, i) {
  const cfg = Object.assign({}, chunk.config, { builds: [chunk.config.builds[i]] });
  return Object.assign({}, chunk, { config: cfg });
}

/* mount, get onto the card, place every tray row, then ask the shared law */
const DRIVE = `(async function (mt, engine, chunk, q) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  eval(mt)(engine, chunk, null);
  await wait(140);
  var go = document.querySelector('#host .primary-btn, #host .dossier-cta');
  if (go && !go.disabled) { go.click(); await wait(200); }
  var job = document.querySelector('#host .pyrun-job');
  if (job) { job.click(); await wait(220); }
  var style = document.querySelector('#host .py-style');
  if (style) { style.click(); await wait(220); }
  /* place everything: the placed column is the surface under test */
  Array.prototype.slice.call(document.querySelectorAll(
    '#host .pyt-list .pyrun-line, #host .parsons-tray .parsons-block, #host .pt-list .parsons-block'
  )).forEach(function (n) { (n.querySelector('code') || n).click(); });
  await wait(200);
  var res = eval(q)();
  /* and the deliberate acts, asked on the same screen */
  var first = document.querySelector('#host .pyp-list .pyrun-line, #host .pp-list .parsons-block');
  res.removeControls = document.querySelectorAll('#host .pyp-list .take-back, #host .pp-list .take-back').length;
  res.removeNames = Array.prototype.slice.call(document.querySelectorAll('#host .take-back'))
    .map(function (b) { return b.getAttribute('aria-label') || b.textContent || ''; });
  res.enterRemoved = null;
  if (first) {
    var listEl = first.closest('.pyp-list, .pp-list');
    var was = listEl.querySelectorAll('.pyrun-line, .parsons-block').length;
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await wait(160);
    res.enterRemoved = listEl.querySelectorAll('.pyrun-line, .parsons-block').length < was;
  }
  return res;
})`;

(async () => {
  console.log('qa-click-safety — a single click never destroys placed work (DFM 272)\n');
  console.log('  engine he sat: ' + BASE_REF + ' (pinned)\n');

  const now = fs.readFileSync(ENGINES, 'utf8');
  let before = null;
  try {
    before = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':ks3-dt/platform/engines.js'],
      { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  } catch (e) { /* reported below rather than crashed on */ }
  check(!!before, 'the pinned base ' + BASE_REF + ' is readable out of git (an unrun control credits nothing — DFM 200)');
  if (before) {
    check(before !== now, 'the pinned base really differs from the shipping engine ' +
      '(a control against identical code would pass by being vacuous)');
  }

  const chunks = assemblyChunks();
  check(chunks.length > 0, 'found ' + chunks.length + ' assembly chunk(s), DERIVED from the content tree: ' +
    chunks.map(c => c.lesson.id + '›' + c.chunk.id).join(', '));

  const browser = await chromium.launch({ headless: true });
  try {
    const { pg, errs } = await makePage(browser, now);

    console.log('\n=== (1) A CLICK ON PLACED WORK LEAVES IT PLACED — every card, every lesson ===');
    let cards = 0, asked = 0;
    for (const { lesson, chunk } of chunks) {
      const builds = (chunk.config && chunk.config.builds) || [];
      const list = builds.length ? builds.map((_, i) => oneBuildChunk(chunk, i))
        : (chunk.engine === 'parsons' ? parsonsCards(chunk) : [chunk]);
      const hits = [];
      let placedTotal = 0, controlsTotal = 0, enterWorked = 0, enterAsked = 0;
      const names = [];
      for (const card of list) {
        const r = await pg.evaluate(([d, mt, eng, ch, q]) =>
          (new Function('return (' + d + ')')())(mt, eng, ch, q),
        [DRIVE, MOUNT, chunk.engine, card, PW.QUERY]);
        cards++;
        placedTotal += r.placed || 0;
        controlsTotal += r.removeControls || 0;
        (r.removeNames || []).forEach(n => names.push(n));
        if (r.placed) { asked++; hits.push.apply(hits, r.findings || []); }
        if (r.enterRemoved !== null) { enterAsked++; if (r.enterRemoved) enterWorked++; }
      }
      const id = lesson.id + ' › ' + chunk.id;
      if (!placedTotal) { console.log('  ....  ' + id + ': no placed work on any card — nothing to protect'); continue; }
      const ok = hits.length === 0;
      if (!ok && LOCKED.has(lesson.id)) {
        waive(id + ': ' + hits.map(PW.describe).join(' | ') +
          '\n            LOCKED and signed off (DFM 221) — one word from him applies the fix here too.');
      } else {
        check(ok, id + ' (' + list.length + ' card(s), ' + placedTotal + ' placed row(s)): a body click leaves the work placed' +
          (ok ? '' : '\n           ' + hits.map(PW.describe).join('\n           ')));
      }
      if (!LOCKED.has(lesson.id)) {
        check(controlsTotal >= 1, id + ': every placed row carries a labelled remove control (' + controlsTotal + ' found)');
        check(names.length > 0 && names.every(n => String(n).trim().length > 6),
          id + ': the remove control is ANNOUNCED with the row\'s own text' +
          (names.length ? '  [e.g. “' + String(names[0]).slice(0, 70) + '”]' : '  [none]'));
        check(enterAsked === 0 || enterWorked === enterAsked,
          id + ': Enter on a focused placed row STILL removes it — the deliberate act survives (' +
          enterWorked + '/' + enterAsked + ')');
      }
    }
    check(asked > 0, 'the question was really asked on ' + asked + ' of ' + cards + ' card(s) rendered');
    check(errs.length === 0, 'no uncaught page errors while driving the cards' +
      (errs.length ? '  [' + errs.slice(0, 2).join(' | ') + ']' : ''));

    /* ---------- THE CONTROL: his own card, on the engine he sat ---------- */
    console.log('\n--- CONTROL: the engine he sat really loses the line');
    if (!before) {
      check(false, 'the control could not run — see above');
    } else {
      const { pg: old } = await makePage(browser, before);
      const his = chunks.find(c => c.lesson.id === 'j2-03' && c.chunk.id === 'training-3');
      check(!!his, 'j2-03 › training-3 is in the derived list (the card he lost the line on)');
      let fired = false, tried = 0;
      if (his) {
        for (let i = 0; i < (his.chunk.config.builds || []).length; i++) {
          const r = await old.evaluate(([d, mt, eng, ch, q]) =>
            (new Function('return (' + d + ')')())(mt, eng, ch, q),
          [DRIVE, MOUNT, 'pyrun', oneBuildChunk(his.chunk, i), PW.QUERY]);
          tried++;
          if ((r.findings || []).length) { fired = true; console.log('        ' + PW.describe(r.findings[0])); break; }
        }
      }
      control(fired, BASE_REF + '\'s engine ejects a placed line on a single body click (' + tried + ' card(s) driven)');
      /* AND THE SECOND HALF, which is what makes it his fault and not a guess:
         the same engine on the LOCKED Lesson 2 loses it too — which is the
         exposure this round reports rather than fixes. */
      const l2 = chunks.find(c => c.lesson.id === 'j2-02' && (c.chunk.config.builds || []).length);
      if (l2) {
        const r2 = await old.evaluate(([d, mt, eng, ch, q]) =>
          (new Function('return (' + d + ')')())(mt, eng, ch, q),
        [DRIVE, MOUNT, 'pyrun', oneBuildChunk(l2.chunk, 0), PW.QUERY]);
        control((r2.findings || []).length > 0,
          'and the same shipped engine loses it on j2-02 as well — the exposure reported under DFM 221');
      }
    }
  } finally {
    await browser.close();
  }

  if (waived.length) {
    console.log('\n' + waived.length + ' WAIVED (LOCKED-LESSON) FINDING(S) — printed on every run, never fixed without his word:');
    waived.forEach(w => console.log('  - ' + w));
  }
  console.log('\n' + (failures ? 'qa-click-safety: ' + failures + ' FAILURE(S)' : 'qa-click-safety: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();

/* a parsons chunk holds its items on the chunk, not in `builds` */
function parsonsCards(chunk) {
  const items = (chunk.config && chunk.config.items) || (chunk.items || []);
  if (!items.length) return [chunk];
  return items.map(it => Object.assign({}, chunk,
    { config: Object.assign({}, chunk.config, { item: it }) }));
}
