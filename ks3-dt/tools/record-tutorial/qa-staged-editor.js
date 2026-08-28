#!/usr/bin/env node
/* qa-staged-editor.js — THE MYBOT REBUILD, PROVED ON THE RENDERED CARD (K41).
 *
 * HIS ORDER, 27 August 2026: "The interface needs a LOT of work and a COMPLETE
 * DESIGN RETHINK - it is a complete mess and a child in J2 is not going to have
 * an earthly clue what they are supposed to do." … "This is just a wall, a wall
 * of too much information." The CODE PITCH is approved and unchanged; the shape
 * is what was rejected.
 *
 * WHAT THIS GATE PROVES, on the real card in a real browser (DFM 146b — what is
 * promised visually is verified visually):
 *   (1) ONE JOB ON SCREEN AT A TIME. The first face carries the plan: the goal,
 *       the film, the jobs, one button — and NO editor, NO palette, NO console,
 *       NO conversation, NO verdict.
 *   (2) THE JOBS ARE ONE FACT. The sentences on the plan face, the sentences in
 *       the bench strip and the sentences in the verdict are the SAME strings,
 *       and all of them come from the build's own feature list (DFM 144).
 *   (3) THE CONVERSATION AND CONSOLE DO NOT EXIST UNTIL THEY ARE NEEDED. On the
 *       bench, before any run, neither panel is in the DOM at all — they are not
 *       empty boxes waiting to be understood.
 *   (4) THE EDITOR IS FULL CARD WIDTH AND NOTHING IS CLIPPED SIDEWAYS. A
 *       sixty-character question is typed in and the box must not scroll
 *       horizontally by a single pixel — his own complaint, measured.
 *   (5) THE GUTTER STILL COUNTS LOGICAL LINES when a line wraps onto two rows.
 *   (6) LIGHT GROUND, DARK PANELS ONLY FOR CODE. The card is light, the title is
 *       readable on it, and the only dark surfaces are the editor and console.
 *   (7) THE COUNT IS COMPUTED. The matched heading's numeral is derived from the
 *       feature list; no authored label may disagree with it.
 *
 * THE CONTROL (DFM 196), against the engine he sat, pulled from git at BASE_REF:
 *   - the card he rejected really mounts EVERYTHING at once;
 *   - its title really is navy on navy (the measured contrast is hopeless);
 *   - and it really prints "ALL FOUR" over a list of three.
 *
 *   node qa-staged-editor.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');
const CA = require('./lib/contrast-audit.js');

const BASE_REF = '7d9c274';          /* V58 — the card he rejected. PINNED. */
const REPO = path.resolve(__dirname, '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const SKULPT = path.join(REPO, 'ks3-dt', 'platform', 'assets', 'vendor', 'skulpt');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

const CASES = [
  { lesson: 'j2', file: 'j2-03.json', chunk: 'mybot', what: 'J2 Lesson 3 — Your bot (his own card)' },
  { lesson: 'j3', file: 'j3-03.json', chunk: 'engine', what: 'J3 Lesson 3 — the playlist engine (the ride-along, J10)' }
];

let failures = 0;
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};
const note = (m) => console.log('  ....  ' + m);

function chunkOf(c) {
  const lesson = JSON.parse(fs.readFileSync(path.join(SRC, c.lesson, 'lessons', c.file), 'utf8'));
  return (lesson.chunks || []).find(x => x.id === c.chunk);
}

async function makePage(browser, engineSrc) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto('about:blank');
  /* THE PAGE FRAME GOES ON FIRST, AND THE PLATFORM'S OWN SHEET WINS.
     The first version of this file injected `.card{background:#fff}` AFTER
     style.css, so it overrode `.pye-card`'s #16253F and measured the card he
     rejected on a WHITE plate — a harness flattering the very thing it was
     built to catch (DFM 146a in reverse). The shell background is set on the
     body, and every card colour comes from the platform's own stylesheet. */
  await pg.addStyleTag({ content: 'body{margin:0;padding:24px;background:#0B1A33;}' });
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

const MOUNT = `(async function (chunk) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  document.body.innerHTML = '<div id="host"></div>';
  window.__draft = null;
  window.Engines.pyrun.mount(document.getElementById('host'), chunk, {
    chunk: chunk, review: false, catchup: false, draft: {},
    saveDraft: function (d) { window.__draft = d; },
    awardBadge: function () { return Promise.resolve({ ok: true }); },
    next: function () {}, saveEvent: function () { return Promise.resolve({ ok: true }); },
    markItem: function () { return Promise.resolve({ ok: true, correct: false }); }
  });
  await wait(260);
  return true;
})`;

const LOOK = `(function () {
  var q = function (s) { return document.querySelector(s); };
  var n = function (s) { return document.querySelectorAll(s).length; };
  var txt = function (s) {
    return Array.prototype.slice.call(document.querySelectorAll(s))
      .map(function (e) { return (e.textContent || '').replace(/\\s+/g, ' ').trim(); });
  };
  return {
    plan: !!q('.pye-plan'), bench: !!q('.pye-bench'),
    editors: n('.pye-code'), palette: n('.pyp-chip'), console: n('.pyc'), chat: n('.pyx'),
    verdict: !!(q('.pyrun-verdict') && !q('.pyrun-verdict').hidden),
    planJobs: txt('.pye-plan-list li'),
    stripJobs: txt('.pye-strip .pyf-say'),
    verdictJobs: txt('.pyv-say'),
    vtag: (q('.pyrun-vtag') || {}).textContent || '',
    vsay: (q('.pyrun-vsay') || {}).textContent || '',
    starters: n('.pye-starter-btn'),
    buttons: txt('#host button').filter(function (t) { return t; }),
    darkPanels: Array.prototype.slice.call(document.querySelectorAll('#host *'))
      .filter(function (e) {
        var bg = getComputedStyle(e).backgroundColor;
        var m = bg.match(/\\d+/g);
        if (!m) return false;
        var lum = (Number(m[0]) * 299 + Number(m[1]) * 587 + Number(m[2]) * 114) / 1000;
        return lum < 80 && Number(m[3] == null ? 1 : m[3]) > 0.5 && e.getBoundingClientRect().height > 24;
      })
      .map(function (e) { return e.className && typeof e.className === 'string'
        ? '.' + e.className.trim().split(/\\s+/)[0] : e.tagName.toLowerCase(); })
  };
})`;

(async () => {
  console.log('qa-staged-editor — the K41 rebuild, proved on the rendered card\n');
  console.log('  card he rejected: ' + BASE_REF + ' (pinned)\n');

  const now = fs.readFileSync(ENGINES, 'utf8');
  let before = null;
  try {
    before = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':ks3-dt/platform/engines.js'],
      { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  } catch (e) { /* reported below */ }
  check(!!before, 'the pinned base ' + BASE_REF + ' is readable out of git');

  const browser = await chromium.launch({ headless: true });
  try {
    const { pg, errs } = await makePage(browser, now);

    for (const C of CASES) {
      console.log('\n=== ' + C.what + ' ===');
      const chunk = chunkOf(C);
      if (!chunk) { check(false, 'the chunk was not found'); continue; }
      const feats = ((chunk.config.builds || [])[0] || {}).features || [];

      await pg.evaluate(([m, c]) => (new Function('return (' + m + ')')())(c), [MOUNT, chunk]);
      const face1 = await pg.evaluate(l => (new Function('return (' + l + ')')())(), LOOK);

      /* (1) the plan face, and NOTHING ELSE on it */
      check(face1.plan && !face1.bench, '(1) she lands on THE PLAN, not on the bench');
      check(face1.editors === 0 && face1.palette === 0 && face1.console === 0 && face1.chat === 0 && !face1.verdict,
        '(1) …and the plan face carries no editor, no palette, no console, no conversation, no verdict' +
        '  [editor ' + face1.editors + ' · palette ' + face1.palette + ' · console ' + face1.console +
        ' · chat ' + face1.chat + ']');
      check(face1.planJobs.length === feats.length,
        '(1) the plan lists every job the build declares (' + face1.planJobs.length + ' of ' + feats.length + ')');
      check(face1.buttons.length === 1,
        '(1) ONE button on the plan face  [' + face1.buttons.join(' | ') + ']');

      /* (2) one fact, one wording */
      check(JSON.stringify(face1.planJobs) === JSON.stringify(feats.map(f => f.label)),
        '(2) the plan\'s sentences ARE the feature list\'s sentences, word for word');

      /* onto the bench */
      await pg.evaluate(() => { const b = document.querySelector('.pye-start'); if (b) b.click(); });
      await pg.waitForTimeout(320);
      const face2 = await pg.evaluate(l => (new Function('return (' + l + ')')())(), LOOK);
      check(face2.bench && !face2.plan, 'she reaches THE BENCH');
      check(JSON.stringify(face2.stripJobs) === JSON.stringify(feats.map(f => f.label)),
        '(2) the bench strip says the same sentences, in the same order');

      /* (3) the panels are not there yet */
      check(face2.console === 0 && face2.chat === 0,
        '(3) before any run there is NO console and NO conversation in the DOM' +
        '  [console ' + face2.console + ' · chat ' + face2.chat + ']');
      check(face2.editors === 1, '(3) …and exactly one editor');
      check(face2.palette <= 4, '(3) at most FOUR template lines on the bench (' + face2.palette + ')');

      /* (4) + (5) his own clipped question, typed in and measured */
      const wrap = await pg.evaluate(async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const ta = document.querySelector('.pye-code');
        const long = 'answer1 = input("What is your all-time favourite thing to eat at breakfast time?")';
        ta.value = 'print("Hello there. I am your bot and I have two questions for you today.")\n' + long;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(160);
        const cs = getComputedStyle(ta);
        const gut = document.querySelector('.pye-nums');
        const card = document.querySelector('.pye-bench');
        /* AN INDEPENDENT MEASUREMENT OF HOW MANY SCREEN ROWS THE TEXT REALLY
           TAKES. Reading the engine's own mirror would be asking the gutter to
           confirm itself; this lays the same text out again, in this file, at the
           same font and the same content width, and counts. */
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;' +
          'white-space:pre-wrap;word-break:break-word;box-sizing:content-box;padding:0;';
        probe.style.font = cs.font;
        probe.style.letterSpacing = cs.letterSpacing;
        /* the CONTENT width, padding taken off — a padded probe measures the
           padding as extra rows and reports a gutter fault the app does not have
           (DFM 146a: a gate that invents a fault is worse than no gate) */
        probe.style.width = (ta.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) + 'px';
        document.body.appendChild(probe);
        const lh = parseFloat(cs.lineHeight) || 20;
        let rows = 0;
        ta.value.split('\n').forEach(t => {
          probe.textContent = t === '' ? '\u200b' : t;
          rows += Math.max(1, Math.round(probe.offsetHeight / lh));
        });
        probe.remove();
        return {
          chars: long.length,
          scrollW: ta.scrollWidth, clientW: ta.clientWidth,
          wrap: ta.getAttribute('wrap'), white: cs.whiteSpace,
          gutter: (gut.textContent || '').split('\n').filter(x => x !== '').join(','),
          /* ONE trailing newline is the last number's own; every newline after it
             is a padding row for a wrapped line, and stripping them all was this
             file counting the gutter short */
          gutterRows: (gut.textContent || '').replace(/\n$/, '').split('\n').length,
          taRows: rows,
          edWidth: Math.round(ta.getBoundingClientRect().width),
          cardWidth: Math.round(card.getBoundingClientRect().width)
        };
      });
      check(wrap.scrollW <= wrap.clientW + 1,
        '(4) a ' + wrap.chars + '-character question is fully visible — nothing clipped sideways' +
        '  [scrollWidth ' + wrap.scrollW + ' vs clientWidth ' + wrap.clientW + ']');
      check(wrap.edWidth > wrap.cardWidth * 0.75,
        '(4) the editor is FULL CARD WIDTH  [' + wrap.edWidth + 'px of a ' + wrap.cardWidth + 'px card]');
      check(wrap.gutter === '1,2',
        '(5) the gutter still counts LOGICAL lines when one wraps  [numbers: ' + wrap.gutter +
        ', gutter rows ' + wrap.gutterRows + ', text rows ' + wrap.taRows + ']');
      check(wrap.gutterRows === wrap.taRows,
        '(5) …and it is padded to the same number of screen rows the text really takes' +
        '  [gutter ' + wrap.gutterRows + ' rows, text ' + wrap.taRows + ' rows, measured independently]');

      /* (6) light ground, dark panels only for code */
      const dark = [...new Set(face2.darkPanels)];
      const codeOnly = dark.every(d => /^\.(pye|pyc|pye-body|pye-nums|pye-code)/.test(d));
      check(codeOnly, '(6) the only dark panels are code surfaces  [' + (dark.join(' ') || 'none') + ']');

      /* the title, measured in real pixels on the real ground */
      const rects = await pg.evaluate(CA.COLLECT, [['.pyrun-goal', '.pye-strip-h', '.pyf-say'], [], '.pye-bench']);
      const shot = await pg.screenshot({ fullPage: true });
      const measured = await pg.evaluate(CA.MEASURE, ['data:image/png;base64,' + shot.toString('base64'), rects]);
      const title = measured.find(m => /pyrun-goal/.test(m.sel) && !m.skip);
      check(!!title && title.ratio >= CA.floorFor(title),
        '(6) the card title is READABLE on its own ground' +
        (title ? '  [' + title.ratio + ':1, ink ' + title.ink + ' on ' + title.plate + ']' : '  [not measured]'));

      /* (7) the count is computed */
      const run = await pg.evaluate(async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const ta = document.querySelector('.pye-code');
        ta.value = 'a = input("Q1?")\nprint("You said " + a)\nb = input("Q2?")\nprint("And " + b)\nprint("Both: " + a + " and " + b)';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.pyrun-run').click();
        for (let i = 0; i < 90; i++) {
          const inp = document.querySelector('.pyx-reply');
          if (inp) { inp.value = 'toast'; document.querySelector('.pyx-send').click(); }
          const v = document.querySelector('.pyrun-verdict');
          if (v && !v.hidden && document.querySelector('.pyrun-vtag')) break;
          await wait(180);
        }
        const q = s => document.querySelector(s);
        return {
          vtag: (q('.pyrun-vtag') || {}).textContent || '',
          vsay: (q('.pyrun-vsay') || {}).textContent || '',
          rows: Array.from(document.querySelectorAll('.pyv-say')).map(e => e.textContent.trim()),
          chat: document.querySelectorAll('.pyx').length,
          console: document.querySelectorAll('.pyc').length
        };
      });
      note('heading after a run: "' + run.vtag + '"');
      const words = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
      const digits = (run.vtag + ' ' + run.vsay).match(/\b(one|two|three|four|five|six|\d+)\b/ig) || [];
      const wrongNumeral = digits.filter(w => {
        const v = /^\d+$/.test(w) ? Number(w) : words.indexOf(w.toUpperCase());
        return v > 0 && v !== feats.length;
      });
      check(wrongNumeral.length === 0,
        '(7) no numeral on the verdict disagrees with the ' + feats.length + ' jobs the build declares' +
        (wrongNumeral.length ? '  [' + wrongNumeral.join(', ') + ']' : ''));
      check(run.rows.length === 0 || JSON.stringify(run.rows) === JSON.stringify(feats.map(f => f.label)),
        '(2) the verdict says the same sentences again, one row per job');
      check(run.console >= 1, '(3) the console EXISTS once a run has ended (' + run.console + ')');
      check(run.chat >= 1, '(3) the conversation EXISTS once the run asked (' + run.chat + ')');
    }

    check(errs.length === 0, 'no uncaught page errors while driving both cards' +
      (errs.length ? '  [' + errs.slice(0, 3).join(' | ') + ']' : ''));

    /* ---------------- THE CONTROL: the card he rejected ---------------- */
    console.log('\n--- CONTROL: the wall he sat, on the engine he sat');
    if (!before) { check(false, 'the control could not run — see above'); }
    else {
      const { pg: old } = await makePage(browser, before);
      /* the card as it was: the old content authored "ALL FOUR" over three
         features, so the control uses the SHIPPED content out of git too */
      let oldLesson = null;
      try {
        oldLesson = JSON.parse(execFileSync('git', ['-C', REPO, 'show',
          BASE_REF + ':ks3-dt/content/j2/lessons/j2-03.json'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
      } catch (e) { /* reported */ }
      check(!!oldLesson, 'the content he sat is readable out of git as well');
      if (oldLesson) {
        const oldChunk = oldLesson.chunks.find(c => c.id === 'mybot');
        const oldFeats = oldChunk.config.builds[0].features.length;
        control(oldChunk.config.matchedLabel === 'ALL FOUR' && oldFeats === 3,
          'the shipped content really authored "' + oldChunk.config.matchedLabel + '" over ' +
          oldFeats + ' features — his exhibit, in the file');
        await old.evaluate(([m, c]) => (new Function('return (' + m + ')')())(c), [MOUNT, oldChunk]);
        await old.evaluate(() => { const b = document.querySelector('#host .primary-btn'); if (b) b.click(); });
        await old.waitForTimeout(400);
        const wall = await old.evaluate(l => (new Function('return (' + l + ')')())(), LOOK);
        control(wall.editors > 0 && wall.palette > 0 && wall.console > 0 && wall.chat > 0,
          'the card he rejected really mounts everything at once — editor, ' + wall.palette +
          ' palette lines, console and conversation, all before she has typed a word');
        const r2 = await old.evaluate(CA.COLLECT, [['.pyrun-goal'], [], '.pye-card']);
        const s2 = await old.screenshot({ fullPage: true });
        const m2 = await old.evaluate(CA.MEASURE, ['data:image/png;base64,' + s2.toString('base64'), r2]);
        const t2 = m2.find(m => /pyrun-goal/.test(m.sel) && !m.skip);
        control(!!t2 && t2.ratio < CA.floorFor(t2),
          'and its title really is navy on navy' +
          (t2 ? '  [' + t2.ratio + ':1, ink ' + t2.ink + ' on plate ' + t2.plate + ' — needs ' + CA.floorFor(t2) + ']'
              : '  [could not be measured]'));
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\n' + (failures ? 'qa-staged-editor: ' + failures + ' FAILURE(S)' : 'qa-staged-editor: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();
