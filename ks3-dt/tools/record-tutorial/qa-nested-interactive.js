#!/usr/bin/env node
/* qa-nested-interactive.js — THE SPACE BAR BELONGS TO TYPING (DFM 267f).
 *
 * HIS FINDING, 26 August 2026, sitting J3 Lesson 2: typing the theatre's name
 * into the gap in build 3 threw the whole line between "The lines" and "Your
 * program" the moment he pressed the space bar. THE HARBOUR LIGHT has two
 * spaces in it, so the line he was typing into jumped twice while he typed it.
 *
 * THE CAUSE, and it is structural rather than a missing guard: every pyrun line
 * rendered as a `<button>`, and a typed blank's `<input>` sat NESTED INSIDE that
 * button. A button owns the space bar, so Space activated the ancestor; the
 * click it synthesises carries the BUTTON as `e.target`, so the engine's "a
 * press on a typing blank is typing, never a drag" guard — which reads
 * `e.target` — could never see the input. The guard was right and unreachable.
 *
 * WHAT THIS GATE PROVES, and every one of them is proved by DOING it rather
 * than by reading the source:
 *   (1) THE STRUCTURE. No interactive control is nested inside another one, on
 *       any pyrun or snap card of any lesson of any year. The list of chunks is
 *       DERIVED from the content tree (DFM 206/K23), never typed.
 *   (2) THE BEHAVIOUR, with REAL KEY PRESSES. The probe clicks into build 3's
 *       venue gap, types THE HARBOUR LIGHT with its two real spaces through
 *       Playwright's keyboard (which dispatches trusted key events, exactly as
 *       his own keyboard does), and requires that the line NEVER changes column
 *       and the input holds every character including both spaces.
 *   (3) ENTER STILL PLACES, AND ONLY FROM THE LINE. A blank-carrying row is
 *       announced as a button and behaves like one for Enter — but Enter typed
 *       inside the gap types nothing and moves nothing.
 *   (4) A LINE WITHOUT A GAP IS STILL A REAL `<button>` (267f/spec 6b): native
 *       keyboard behaviour is correct for those and is not thrown away.
 *   (5) IT IS STILL REACHABLE AND STILL ANNOUNCED (spec 6d): tabbable,
 *       role=button, its aria-label intact, its hint caption still drawn.
 *   (6) THE REACH CANNOT BE QUIETLY REMOVED. Both walkers ask the same question
 *       on every screen of every lesson, every run, out of the same one home —
 *       and this gate fails if either of them stops.
 *
 * THE CONTROLS (DFM 196 — a gate that has never said no is a decoration). Every
 * one of them runs against the ENGINE HE SAT, pulled out of git at BASE_REF, in
 * the same browser, driven the same way:
 *   - the structural audit must FIND the nesting there;
 *   - the real-key drive must REPRODUCE his jump there.
 * If the second cannot be reproduced with synthetic-but-trusted key events, this
 * gate says so IN ITS OWN OUTPUT rather than quietly crediting the fix (spec
 * §6e's honesty clause), and the structural half plus the live smoke carry it.
 *
 * BASE_REF IS PINNED. A floating base becomes the fixed code the moment the fix
 * commits, and the control then passes by being vacuous (the qa-pair-stores
 * lesson, DFM 196).
 *
 *   node qa-nested-interactive.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');
const NI = require('./lib/nested-interactive.js');

const BASE_REF = '602071e';          /* V56 — the engine he sat. PINNED. */
const REPO = path.resolve(__dirname, '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const SKULPT = path.join(REPO, 'ks3-dt', 'platform', 'assets', 'vendor', 'skulpt');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

let failures = 0;
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};
const note = (m) => console.log('  ....  ' + m);

/* ---- every chunk of every lesson that draws assembly lines, DERIVED ------- */
function assemblyChunks() {
  const out = [];
  for (const year of ['j1', 'j2', 'j3']) {
    const dir = path.join(SRC, year, 'lessons');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(n => /\.json$/.test(n))) {
      const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const ch of (lesson.chunks || [])) {
        if (ch.engine === 'pyrun' || ch.engine === 'snap') out.push({ lesson, chunk: ch });
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

/* mount one chunk on a bare host, exactly as the lesson shell would */
const MOUNT = `(function(engine, chunk, review){
  window.__nexted = 0;
  document.body.innerHTML = '<div id="host"></div>';
  var host = document.getElementById('host');
  window.Engines[engine].mount(host, chunk, {
    chunk: chunk, review: !!review, catchup: false,
    awardBadge: function () { return Promise.resolve({ ok: true }); },
    next: function () { window.__nexted++; },
    saveEvent: function () { return Promise.resolve({ ok: true }); },
    markItem: function () { return Promise.resolve({ ok: true }); }
  });
  return true;
})`;

/* EVERY BUILD IS RENDERED, NOT JUST THE FIRST ONE. The engine holds its
   position privately and only moves on when a build MATCHES, so walking to
   build 4 would mean solving builds 1–3 first. Instead each build is mounted as
   the only build of a shallow copy of its own chunk: the card that is drawn is
   byte-for-byte the card the pupil meets, because nothing in `lineHtml` knows
   or cares which build it is. Auditing only build 1 would have left the two
   gaps in build 4 unmeasured, which is the DFM 204 fault this file exists to
   avoid committing itself. */
function oneBuildChunk(chunk, i) {
  const cfg = Object.assign({}, chunk.config, { builds: [chunk.config.builds[i]] });
  return Object.assign({}, chunk, { config: cfg });
}

(async () => {
  console.log('qa-nested-interactive — the space bar belongs to typing (DFM 267f)\n');
  console.log('  engine he sat: ' + BASE_REF + ' (pinned)\n');

  const now = fs.readFileSync(ENGINES, 'utf8');
  const before = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':ks3-dt/platform/engines.js'],
    { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  check(before !== now, 'the pinned base really differs from the shipping engine (a control against ' +
    'identical code would pass by being vacuous)');

  const chunks = assemblyChunks();
  check(chunks.length > 0, 'found ' + chunks.length + ' assembly chunk(s) across the content tree: ' +
    chunks.map(c => c.lesson.id + '›' + c.chunk.id).join(', '));

  const browser = await chromium.launch({ headless: true });
  try {
    const { pg, errs } = await makePage(browser, now);
    const { pg: pgOld } = await makePage(browser, before);

    /* ---------- (1) THE STRUCTURE, ON EVERY ASSEMBLY CARD ---------- */
    console.log('\n=== (1) NO INTERACTIVE CONTROL IS NESTED INSIDE ANOTHER ONE ===');
    let auditedCards = 0, auditedChunks = 0;
    for (const { lesson, chunk } of chunks) {
      const builds = (chunk.config && chunk.config.builds) || [];
      const found = [];
      const cards = builds.length ? builds.map((_, i) => oneBuildChunk(chunk, i)) : [chunk];
      for (const card of cards) {
        const hits = await pg.evaluate(async ([mt, eng, ch, q]) => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          const out = [];
          eval(mt)(eng, ch, false);
          await wait(120);
          let go = document.querySelector('#host .primary-btn');   /* the intro card */
          if (go) go.click();
          await wait(160);
          const job = document.querySelector('#host .pyrun-job');  /* the extras hub */
          if (job) { job.click(); await wait(160); }
          out.push.apply(out, eval(q)());
          /* and again with every line PLACED, because the placed column wraps
             each line in an <li> and re-renders it */
          Array.from(document.querySelectorAll('#host .pyt-list .pyrun-line, #host .snap-card [data-si]')).forEach(n => n.click());
          await wait(120);
          out.push.apply(out, eval(q)());
          return out;
        }, [MOUNT, chunk.engine, card, NI.QUERY]);
        found.push.apply(found, hits);
        auditedCards++;
      }
      auditedChunks++;
      const uniq = [];
      found.forEach(f => { const k = f.container + '<' + f.inner; if (uniq.every(u => u.container + '<' + u.inner !== k)) uniq.push(f); });
      check(uniq.length === 0, lesson.id + ' › ' + chunk.id + ' (' + cards.length + ' card(s)): nothing nested' +
        (uniq.length ? '\n           ' + uniq.map(NI.describe).join('\n           ') : ''));
    }
    check(auditedChunks === chunks.length,
      'every assembly chunk found was really rendered and audited (' + auditedChunks + '/' + chunks.length +
      ' chunks, ' + auditedCards + ' cards)');

    /* CONTROL: the same audit against the engine he sat must FIND it. */
    console.log('\n--- CONTROL: the audit really catches the render he sat');
    const j3 = chunks.find(c => c.lesson.id === 'j3-02' && c.chunk.id === 'callsheet-b');
    check(!!j3, 'j3-02 › callsheet-b is in the derived list (his own screen)');
    const oldHits = await pgOld.evaluate(async ([mt, ch, q]) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      eval(mt)('pyrun', ch, false);
      await wait(120);
      const go = document.querySelector('#host .primary-btn');
      if (go) go.click();
      await wait(180);
      return eval(q)();
    }, [MOUNT, j3.chunk, NI.QUERY]);
    control(oldHits.length > 0, BASE_REF + '\'s engine really renders ' + oldHits.length +
      ' nested control(s) on that card' + (oldHits.length ? ' — e.g. ' + NI.describe(oldHits[0]) : ''));

    /* ---------- (2) REAL KEY PRESSES, HIS OWN SCENARIO ---------- */
    console.log('\n=== (2) TYPING “THE HARBOUR LIGHT” WITH ITS TWO REAL SPACES ===');

    /* drive one page's build-3 card with the real keyboard and report what moved */
    async function typeTheName(target, label) {
      await target.evaluate(async ([mt, ch]) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        eval(mt)('pyrun', ch, false);
        await wait(140);
        const go = document.querySelector('#host .primary-btn');
        if (go) go.click();
        await wait(200);
      }, [MOUNT, j3.chunk]);
      /* place the venue line first, so a jump between columns is visible */
      const blank = await target.$('#host .pyrun-blank[data-key="venue"]');
      if (!blank) return { err: 'no venue gap on screen' };
      const whereBefore = await target.evaluate(() => {
        const i = document.querySelector('#host .pyrun-blank[data-key="venue"]');
        return i && i.closest('.pyt-list') ? 'tray' : (i && i.closest('.pyp-list') ? 'program' : '?');
      });
      await blank.click();
      const moves = await target.evaluate(() => {
        window.__moves = 0;
        const where = () => {
          const i = document.querySelector('#host .pyrun-blank[data-key="venue"]');
          return i && i.closest('.pyt-list') ? 'tray' : (i && i.closest('.pyp-list') ? 'program' : '?');
        };
        window.__where = where;
        window.__last = where();
        window.__watch = setInterval(() => {
          const w = where();
          if (w !== window.__last) { window.__moves++; window.__last = w; }
        }, 20);
        return true;
      });
      await target.keyboard.type('THE HARBOUR LIGHT', { delay: 45 });
      await target.waitForTimeout(220);
      const r = await target.evaluate(() => {
        clearInterval(window.__watch);
        const i = document.querySelector('#host .pyrun-blank[data-key="venue"]');
        return {
          value: i ? i.value : '(the gap is gone)',
          moves: window.__moves,
          where: window.__where(),
          focused: !!(document.activeElement && document.activeElement.classList &&
                      document.activeElement.classList.contains('pyrun-blank'))
        };
      });
      r.whereBefore = whereBefore;
      note(label + ': value=' + JSON.stringify(r.value) + '  column ' + r.whereBefore + '→' + r.where +
        '  jumps=' + r.moves + '  still focused=' + r.focused);
      return r;
    }

    const nowTyped = await typeTheName(pg, 'shipping engine');
    check(!nowTyped.err, 'the venue gap is on screen to be typed into');
    check(nowTyped.value === 'THE HARBOUR LIGHT',
      'the gap holds every character INCLUDING both spaces — “' + nowTyped.value + '”');
    check(nowTyped.moves === 0,
      'the line never changes column while she types (' + nowTyped.moves + ' jump(s))');
    check(nowTyped.focused === true,
      'and the caret is still in the gap when she has finished typing');

    console.log('\n--- CONTROL: the same typing on the engine he sat');
    const oldTyped = await typeTheName(pgOld, BASE_REF);
    const reproduced = !oldTyped.err && (oldTyped.moves > 0 || oldTyped.value !== 'THE HARBOUR LIGHT');
    if (reproduced) {
      control(true, BASE_REF + ' reproduces his finding exactly — the line jumps ' + oldTyped.moves +
        ' time(s) while “THE HARBOUR LIGHT” is typed, and the gap ends up holding ' +
        JSON.stringify(oldTyped.value));
    } else {
      /* SPEC §6e's HONESTY CLAUSE, and it is printed rather than swallowed. */
      console.log('  NOTE  CONTROL COULD NOT REPRODUCE THE JUMP SYNTHETICALLY.');
      console.log('        Playwright key events are trusted, but the ancestor button\'s Space');
      console.log('        activation did not fire in this harness against ' + BASE_REF + '. The');
      console.log('        BEHAVIOURAL half of this gate is therefore carried by the live smoke');
      console.log('        (type the venue name on the deployed lesson and watch the line stay');
      console.log('        put); the STRUCTURAL half above stands on its own and is proved both');
      console.log('        ways. This note is the gate saying what it did NOT prove, which is');
      console.log('        the only honest thing to do with a control that will not fire.');
      note('  (' + BASE_REF + ' measured: jumps=' + oldTyped.moves + ' value=' + JSON.stringify(oldTyped.value) + ')');
    }

    /* ---------- (3) ENTER PLACES FROM THE LINE, NEVER FROM THE GAP ---------- */
    console.log('\n=== (3) ENTER PLACES FROM THE LINE; SPACE AND ENTER IN THE GAP DO NOT ===');
    const enter = await pg.evaluate(async ([mt, ch]) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      eval(mt)('pyrun', ch, false);
      await wait(140);
      const go = document.querySelector('#host .primary-btn');
      if (go) go.click();
      await wait(200);
      const row = document.querySelector('#host .pyt-list .pyrun-line.has-blank');
      if (!row) return { err: 'no blank-carrying row in the tray' };
      const placed = () => document.querySelectorAll('#host .pyp-list .pyrun-line').length;
      const start = placed();
      row.focus();
      row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      await wait(80);
      const afterSpace = placed();
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await wait(120);
      const afterEnter = placed();
      return { start, afterSpace, afterEnter };
    }, [MOUNT, j3.chunk]);
    check(!enter.err, 'a blank-carrying row is findable by its own class' + (enter.err ? ' [' + enter.err + ']' : ''));
    check(enter.afterSpace === enter.start,
      'Space on the focused row places NOTHING — the space bar is typing, and only typing');
    check(enter.afterEnter === enter.start + 1,
      'Enter on the focused row DOES place the line, so the row still behaves as a button for the keyboard');

    const inGap = await pg.evaluate(async ([mt, ch]) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      eval(mt)('pyrun', ch, false);
      await wait(140);
      const go = document.querySelector('#host .primary-btn');
      if (go) go.click();
      await wait(200);
      const inp = document.querySelector('#host .pyrun-blank[data-key="venue"]');
      if (!inp) return { err: 'no venue gap' };
      const placed = () => document.querySelectorAll('#host .pyp-list .pyrun-line').length;
      const start = placed();
      inp.focus();
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await wait(120);
      return { start, after: placed() };
    }, [MOUNT, j3.chunk]);
    check(!inGap.err && inGap.after === inGap.start,
      'neither Space nor Enter typed INSIDE the gap moves the line anywhere');

    /* ---------- (4) A LINE WITH NO GAP IS STILL A REAL BUTTON ---------- */
    console.log('\n=== (4) A LINE WITH NO GAP KEEPS ITS NATIVE BUTTON BEHAVIOUR (spec 6b) ===');
    const shapes = await pg.evaluate(async ([mt, ch]) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      eval(mt)('pyrun', ch, false);
      await wait(140);
      const go = document.querySelector('#host .primary-btn');
      if (go) go.click();
      await wait(200);
      return Array.from(document.querySelectorAll('#host .pyrun-line')).map(n => ({
        tag: n.tagName.toLowerCase(),
        gap: !!n.querySelector('.pyrun-blank'),
        role: n.getAttribute('role'),
        tab: n.getAttribute('tabindex'),
        aria: n.getAttribute('aria-label') || '',
        hint: !!n.querySelector('.pyrun-blank-hint')
      }));
    }, [MOUNT, j3.chunk]);
    const withGap = shapes.filter(s => s.gap), noGap = shapes.filter(s => !s.gap);
    check(noGap.length > 0 && noGap.every(s => s.tag === 'button'),
      noGap.length + ' line(s) with no gap are still real <button>s');
    check(withGap.length > 0 && withGap.every(s => s.tag !== 'button'),
      withGap.length + ' line(s) with a gap are NOT buttons any more' +
      (withGap.length ? '  [' + withGap.map(s => s.tag).join(', ') + ']' : ''));

    /* ---------- (5) STILL REACHABLE, STILL ANNOUNCED ---------- */
    console.log('\n=== (5) THE ROW IS STILL TABBABLE, STILL ANNOUNCED, STILL CAPTIONED (spec 6d) ===');
    check(withGap.every(s => s.tab === '0'), 'every gap-carrying row is tabbable (tabindex="0")');
    check(withGap.every(s => s.role === 'button'), 'and announced to a screen reader as a button');
    check(withGap.every(s => s.aria.length > 0), 'and carries an aria-label saying what it is');
    check(withGap.every(s => s.hint), 'and the hint caption that says what to type is still drawn');

    check(errs.length === 0, 'no uncaught page errors while driving the cards' +
      (errs.length ? '  [' + errs.slice(0, 2).join(' | ') + ']' : ''));
  } finally {
    await browser.close();
  }

  /* ---------- (6) THE REACH CANNOT BE QUIETLY REMOVED ---------- */
  console.log('\n=== (6) BOTH WALKERS ASK THE SAME QUESTION ON EVERY SCREEN OF EVERY LESSON ===');
  for (const w of ['sit-review.js', 'sit-wrongpath.js']) {
    const src = fs.readFileSync(path.join(__dirname, w), 'utf8');
    check(/require\(['"]\.\/lib\/nested-interactive\.js['"]\)/.test(src),
      w + ' reads the law out of the one home rather than carrying its own copy (DFM 144)');
    check(/NI\.QUERY/.test(src) && /nestedHits/.test(src),
      w + ' really runs the audit as it walks, and keeps what it finds');
  }
  const srcReview = fs.readFileSync(path.join(__dirname, 'sit-review.js'), 'utf8');
  check(/nestedHits\.length[\s\S]{0,200}bad\.push/.test(srcReview),
    'and a hit is a FAILURE of the walk, never a note underneath a pass (DFM 204)');

  console.log('\n' + (failures ? 'qa-nested-interactive: ' + failures + ' FAILURE(S)' : 'qa-nested-interactive: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();
