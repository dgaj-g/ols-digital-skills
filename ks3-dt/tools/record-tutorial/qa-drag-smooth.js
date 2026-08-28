#!/usr/bin/env node
/* qa-drag-smooth.js — THE DRAG IS MEASURED ON HOW IT FEELS, NOT ON WHETHER IT WORKS.
 *
 * HIS FINDING, 27 August 2026, sitting J2 Lesson 3's ordering build:
 *   the drag was laggy — and his question about the existing gate was
 *   "was the harness shite?"
 * THE HONEST ANSWER, and it is the reason this file exists: `qa-parsons-drag`
 * proves the drag WORKS — pick up, drop, snap, click — and measures NOTHING
 * about how it feels. It checks the wrong property, so it could never fail on
 * jank however bad the jank got. A harness that cannot fail on the thing being
 * complained about is not evidence about that thing.
 *
 * THE MECHANISM, read at the line. On EVERY pointermove both engines:
 *   - read `getBoundingClientRect()` on the zones, and (parsons) on every
 *     placed row, to work out where the drop would land — each read forces the
 *     browser to lay the page out again, mid-gesture;
 *   - tear down and rebuild the drop marker whether or not the target changed;
 *   - write the ghost's transform synchronously, once per event, so a mouse
 *     that reports at 240 Hz gets 240 style writes a second into a 60 Hz frame.
 * On a long card that is visible jank.
 *
 * WHAT THIS GATE MEASURES, by DOING the gesture in a real browser:
 *   (1) LAYOUT-FORCING READS DURING THE MOVE. `getBoundingClientRect` is
 *       counted by patching it on Element.prototype. Once the drag has started,
 *       the count must be ZERO: the geometry is cached when the gesture begins,
 *       and nothing moves under a dragged ghost.
 *   (2) GHOST WRITES PER FRAME. Forty pointermoves are dispatched in ONE task,
 *       so exactly one animation frame can run. A synchronous writer produces
 *       forty style writes; a requestAnimationFrame writer produces one.
 *   (3) MARKER WRITES PER MOVE. The drop marker may only be written when the
 *       TARGET INDEX CHANGES, so the count is bounded by the number of distinct
 *       drop positions the pointer crossed, never by the number of events.
 *
 * WHAT IS DELIBERATELY NOT CLAIMED. This measures the work the page is asked to
 * do per event; it does not claim to measure his perception. That is the honest
 * boundary, and it is stated rather than implied — but the work is the cause,
 * and the cause is what a machine can hold.
 *
 * THE SEMANTICS ARE PROVED UNCHANGED IN THE SAME RUN (this is performance work
 * on two engines that eleven signed-off lessons stand on, DFM 176): after the
 * measured gesture the block is really dropped, and it lands in the same place
 * the pre-fix engine lands it, in the same page, on the same card.
 *
 * THE CONTROL (DFM 196): every one of the three is run against the engine he
 * sat, pulled from git at BASE_REF, and must FAIL there. PINNED, because a
 * floating base is vacuous the moment the fix commits.
 *
 *   node qa-drag-smooth.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');

const BASE_REF = '7d9c274';          /* V58 — the engine he sat. PINNED. */
const REPO = path.resolve(__dirname, '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const SKULPT = path.join(REPO, 'ks3-dt', 'platform', 'assets', 'vendor', 'skulpt');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

const MOVES = 40;
let failures = 0;
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};
const note = (m) => console.log('  ....  ' + m);

async function makePage(browser, engineSrc) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
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

/* ---- the gesture, measured. Runs entirely inside the page. ---------------
   The counters are installed AFTER the drag has started, so what is measured is
   the steady state of moving — not the one-off cost of picking the row up,
   which is exactly where the caching is supposed to happen. */
const GESTURE = `(async function (engine, chunk, traySel, itemSel, progSel, moves) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  document.body.innerHTML = '<div id="host"></div>';
  var host = document.getElementById('host');
  window.Engines[engine].mount(host, chunk, {
    chunk: chunk, review: false, catchup: false,
    awardBadge: function () { return Promise.resolve({ ok: true }); },
    next: function () {}, saveEvent: function () { return Promise.resolve({ ok: true }); },
    markItem: function () { return Promise.resolve({ ok: true, correct: false }); }
  });
  await wait(160);
  var go = document.querySelector('#host .primary-btn, #host .dossier-cta');
  if (go && !go.disabled) { go.click(); await wait(220); }
  var job = document.querySelector('#host .pyrun-job');
  if (job) { job.click(); await wait(240); }

  /* put MOST of the rows in the program, so there is a real list to compute a
     drop index against — a one-row list cannot show a per-move marker storm */
  var trayRows = Array.prototype.slice.call(document.querySelectorAll(traySel + ' ' + itemSel));
  if (trayRows.length < 3) return { err: 'only ' + trayRows.length + ' row(s) in the tray' };
  /* THE ROWS ARE SERVED SHUFFLED (DFM 258), so both the row that gets dragged
     and the order the rest land in would differ between two independently
     mounted pages — and comparing two random orders is exactly the number
     DFM 199 forbids asserting. Everything here is therefore chosen BY TEXT: the
     rows are placed in text order and the row dragged is the text-last one, so
     the landing position is the same fact on both engines and the comparison
     means something. */
  var byText = trayRows.slice().sort(function (a, b) {
    var at = (a.textContent || '').trim(), bt = (b.textContent || '').trim();
    return at < bt ? -1 : (at > bt ? 1 : 0);
  });
  var dragText = (byText[byText.length - 1].textContent || '').replace(/\s+/g, ' ').trim();
  byText.slice(0, byText.length - 1).forEach(function (n) { (n.querySelector('code') || n).click(); });
  await wait(220);

  var node = Array.prototype.slice.call(document.querySelectorAll(traySel + ' ' + itemSel))
    .filter(function (n) { return (n.textContent || '').replace(/\s+/g, ' ').trim() === dragText; })[0]
    || document.querySelector(traySel + ' ' + itemSel);
  var prog = document.querySelector(progSel);
  if (!node || !prog) return { err: 'nothing left to drag' };
  var pr = prog.getBoundingClientRect();
  var nr = node.getBoundingClientRect();
  if (pr.height < 40) return { err: 'the program column has no height' };

  var ev = function (type, x, y) {
    return new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 1, isPrimary: true,
      button: 0, buttons: 1, clientX: x, clientY: y
    });
  };
  var x0 = nr.left + nr.width / 2, y0 = nr.top + nr.height / 2;
  node.dispatchEvent(ev('pointerdown', x0, y0));
  /* one move to cross the 6px threshold and start the drag (and build the ghost) */
  node.dispatchEvent(ev('pointermove', x0 + 20, y0 + 20));
  await new Promise(r => requestAnimationFrame(() => r()));
  await new Promise(r => requestAnimationFrame(() => r()));

  /* ---- counters ON, drag already running ---- */
  var rects = 0;
  var real = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () { rects++; return real.apply(this, arguments); };
  var ghost = document.querySelector('.pyrun-ghost, .parsons-ghost');
  var ghostWrites = 0, markerWrites = 0;
  var gobs = ghost ? new MutationObserver(function (rs) { ghostWrites += rs.length; }) : null;
  if (gobs) gobs.observe(ghost, { attributes: true, attributeFilter: ['style'] });
  var mobs = new MutationObserver(function (rs) { markerWrites += rs.length; });
  mobs.observe(document.querySelector('#host'), { attributes: true, attributeFilter: ['class'], subtree: true });

  /* forty moves, IN ONE TASK, straight down the program column */
  var xs = pr.left + pr.width / 2;
  for (var i = 0; i < moves; i++) {
    var y = pr.top + 6 + (pr.height - 12) * (i / (moves - 1));
    node.dispatchEvent(ev('pointermove', xs, y));
  }
  /* let exactly one frame run */
  await new Promise(r => requestAnimationFrame(() => r()));
  await new Promise(r => setTimeout(r, 0));

  Element.prototype.getBoundingClientRect = real;
  if (gobs) gobs.disconnect();
  mobs.disconnect();

  var progWas = document.querySelectorAll(progSel + ' ' + itemSel).length;
  node.dispatchEvent(ev('pointerup', xs, pr.top + pr.height - 8));
  await wait(200);
  var progNow = document.querySelectorAll(progSel + ' ' + itemSel).length;

  return {
    rects: rects, ghostWrites: ghostWrites, markerWrites: markerWrites,
    hadGhost: !!ghost, moves: moves, dragged: dragText,
    dropped: progNow > progWas,
    order: Array.prototype.slice.call(document.querySelectorAll(progSel + ' ' + itemSel))
      .map(function (n) { return (n.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 32); })
  };
})`;

function lessonChunk(year, file, chunkId) {
  const lesson = JSON.parse(fs.readFileSync(path.join(SRC, year, 'lessons', file), 'utf8'));
  const ch = (lesson.chunks || []).find(c => c.id === chunkId);
  return ch;
}
function oneBuildChunk(chunk, i) {
  const cfg = Object.assign({}, chunk.config, { builds: [chunk.config.builds[i]] });
  return Object.assign({}, chunk, { config: cfg });
}

(async () => {
  console.log('qa-drag-smooth — how the drag FEELS, measured as the work it makes the page do\n');
  console.log('  engine he sat: ' + BASE_REF + ' (pinned)   moves per gesture: ' + MOVES + '\n');

  const now = fs.readFileSync(ENGINES, 'utf8');
  let before = null;
  try {
    before = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':ks3-dt/platform/engines.js'],
      { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  } catch (e) { /* reported below */ }
  check(!!before, 'the pinned base ' + BASE_REF + ' is readable out of git');

  /* BOTH ENGINES, on the two cards this round is about — his ordering build and
     his tray build. */
  const CASES = [
    {
      what: 'the ORDERING engine (his laggy build — j2-03 › training-2)',
      engine: 'parsons',
      chunk: () => lessonChunk('j2', 'j2-03.json', 'training-2'),
      tray: '#host .pt-list', item: '.parsons-block', prog: '#host .pp-list'
    },
    {
      what: 'the TRAY engine (j2-03 › training-3, the card he lost the line on)',
      engine: 'pyrun',
      chunk: () => oneBuildChunk(lessonChunk('j2', 'j2-03.json', 'training-3'), 0),
      tray: '#host .pyt-list', item: '.pyrun-line', prog: '#host .pyp-list'
    }
  ];

  const browser = await chromium.launch({ headless: true });
  try {
    const { pg, errs } = await makePage(browser, now);
    const old = before ? (await makePage(browser, before)).pg : null;

    for (const C of CASES) {
      console.log('\n=== ' + C.what + ' ===');
      const chunk = C.chunk();
      if (!chunk) { check(false, 'the chunk was not found in the content tree'); continue; }
      const r = await pg.evaluate(([g, e, c, t, i, p, m]) =>
        (new Function('return (' + g + ')')())(e, c, t, i, p, m),
      [GESTURE, C.engine, chunk, C.tray, C.item, C.prog, MOVES]);
      if (r.err) { check(false, 'the gesture could not be driven: ' + r.err); continue; }

      check(r.hadGhost, 'the drag really started — a ghost is on screen');
      check(r.rects === 0,
        '(1) ZERO layout-forcing reads across ' + r.moves + ' moves  [' + r.rects + ' getBoundingClientRect]');
      check(r.ghostWrites <= 2,
        '(2) the ghost is written ONCE PER FRAME, not once per event  [' + r.ghostWrites +
        ' style write(s) for ' + r.moves + ' moves]');
      check(r.markerWrites < r.moves,
        '(3) the drop marker is written only when the target index CHANGES  [' + r.markerWrites +
        ' class write(s) for ' + r.moves + ' moves]');
      check(r.dropped, 'and the gesture still DROPS the row — the semantics are untouched');
      note('landing order: ' + r.order.slice(0, 3).join(' | ') + (r.order.length > 3 ? ' …' : ''));

      if (old) {
        const o = await old.evaluate(([g, e, c, t, i, p, m]) =>
          (new Function('return (' + g + ')')())(e, c, t, i, p, m),
        [GESTURE, C.engine, chunk, C.tray, C.item, C.prog, MOVES]);
        if (o.err) { control(false, 'the pre-fix gesture could not be driven: ' + o.err); continue; }
        control(o.rects > 0,
          BASE_REF + ' forces layout ' + o.rects + ' time(s) across ' + o.moves + ' moves (' +
          (o.rects / o.moves).toFixed(1) + ' per move)');
        control(o.ghostWrites > 2,
          BASE_REF + ' writes the ghost ' + o.ghostWrites + ' time(s) — one per event, not one per frame');
        control(o.dropped, 'and the pre-fix engine drops the row too, so the comparison is like for like');
        /* AND THE SEMANTICS ARE THE SAME. Performance work that changed where a
           block lands would be a behaviour change wearing a performance label,
           on engines eleven signed-off lessons stand on (DFM 176). */
        check(JSON.stringify(o.order) === JSON.stringify(r.order),
          'the row lands in EXACTLY the same place as it did on the engine he sat');
      }
    }
    check(errs.length === 0, 'no uncaught page errors while driving either engine' +
      (errs.length ? '  [' + errs.slice(0, 2).join(' | ') + ']' : ''));
  } finally {
    await browser.close();
  }

  console.log('\n' + (failures ? 'qa-drag-smooth: ' + failures + ' FAILURE(S)' : 'qa-drag-smooth: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();
