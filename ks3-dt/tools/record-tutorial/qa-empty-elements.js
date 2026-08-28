#!/usr/bin/env node
/* qa-empty-elements.js — HIS "WEE WHITE LINE", AND THE CLASS BEHIND IT (J13c).
 *
 * HIS FINDING, 27 August 2026, on training build 3a of J2 Lesson 3: a blank
 * white strip at the top of the card, exactly where a reader's eye starts, on
 * the screen he also called "VERY confusing". Diagnosed at the render: the
 * assemble card drew `.pyrun-target` — a lead paragraph and an expected-output
 * `<pre>` — on EVERY build, and the builds that are checked by RUNNING author
 * neither. So an empty orange shell shipped above the instruction.
 *
 * THE CLASS, not the instance (his charter for this round: "every single problem
 * that I identified will never happen again"): on every screen either walker
 * visits, a visible content container with nothing in it is a FAILURE. The law,
 * the tag list and the declared exemptions live in `lib/empty-elements.js` so
 * the walkers and this gate ask exactly the same question (DFM 144).
 *
 * WHAT THIS FILE ADDS on top of the walkers' ride:
 *   - THE CONTROL. It mounts his own card on the engine he sat, pulled from git
 *     at BASE_REF, and requires the empty `<pre>` to be FOUND there. A gate that
 *     has never said no is a decoration (DFM 196).
 *   - A CARD-LEVEL SWEEP of every pyrun, parsons and briefing chunk of every
 *     lesson, DERIVED from the content tree — because a walker only ever sees
 *     the states it walks into, and every build of a multi-build chunk is a card
 *     a pupil really meets (the DFM 204 coverage rule applied to cards).
 *
 * LOCKED LESSONS ARE ASKED AND WAIVED, NEVER SKIPPED (DFM 221/213).
 *
 *   node qa-empty-elements.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');
const EE = require('./lib/empty-elements.js');

const BASE_REF = '7d9c274';          /* V58 — the engine he sat. PINNED. */
const REPO = path.resolve(__dirname, '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const SKULPT = path.join(REPO, 'ks3-dt', 'platform', 'assets', 'vendor', 'skulpt');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

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

function cardChunks() {
  const out = [];
  for (const year of ['j1', 'j2', 'j3']) {
    const dir = path.join(SRC, year, 'lessons');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(n => /\.json$/.test(n))) {
      const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const ch of (lesson.chunks || [])) {
        if (['pyrun', 'parsons', 'briefing', 'snap'].indexOf(ch.engine) !== -1) out.push({ lesson, chunk: ch });
      }
    }
  }
  return out;
}

async function makePage(browser, engineSrc) {
  const pg = await browser.newPage({ viewport: { width: 1200, height: 1100 } });
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

/* mount, walk onto the card itself, and ask — twice: once as it arrives, and
   once with every row placed, because placing re-renders the whole column */
const DRIVE = `(async function (engine, chunk, q) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  document.body.innerHTML = '<div id="host" style="width:1100px"></div>';
  var host = document.getElementById('host');
  window.Engines[engine].mount(host, chunk, {
    chunk: chunk, review: false, catchup: false,
    awardBadge: function () { return Promise.resolve({ ok: true }); },
    next: function () {}, saveEvent: function () { return Promise.resolve({ ok: true }); },
    markItem: function () { return Promise.resolve({ ok: true, correct: false }); }
  });
  await wait(180);
  var out = [];
  var go = document.querySelector('#host .primary-btn, #host .dossier-cta');
  if (go && !go.disabled) { go.click(); await wait(240); }
  var job = document.querySelector('#host .pyrun-job');
  if (job) { job.click(); await wait(240); }
  var style = document.querySelector('#host .py-style');
  if (style) { style.click(); await wait(240); }
  out.push.apply(out, eval(q)());
  Array.prototype.slice.call(document.querySelectorAll(
    '#host .pyt-list .pyrun-line, #host .pt-list .parsons-block'
  )).forEach(function (n) { (n.querySelector('code') || n).click(); });
  await wait(220);
  out.push.apply(out, eval(q)());
  return out;
})`;

function oneBuildChunk(chunk, i) {
  const cfg = Object.assign({}, chunk.config, { builds: [chunk.config.builds[i]] });
  return Object.assign({}, chunk, { config: cfg });
}

(async () => {
  console.log('qa-empty-elements — a visible container with nothing in it (J13c / DFM 42/184)\n');
  console.log('  engine he sat: ' + BASE_REF + ' (pinned)');
  console.log('  DECLARED EXEMPTIONS, printed every run so none of them is silent:');
  EE.EXEMPTIONS.forEach(e => console.log('    · ' + e));
  console.log('');

  const now = fs.readFileSync(ENGINES, 'utf8');
  let before = null;
  try {
    before = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':ks3-dt/platform/engines.js'],
      { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  } catch (e) { /* reported below */ }
  check(!!before, 'the pinned base ' + BASE_REF + ' is readable out of git');

  const chunks = cardChunks();
  check(chunks.length > 0, 'found ' + chunks.length + ' card-drawing chunk(s), DERIVED from the content tree');

  const browser = await chromium.launch({ headless: true });
  try {
    const { pg, errs } = await makePage(browser, now);

    console.log('\n=== EVERY CARD OF EVERY LESSON ===');
    for (const { lesson, chunk } of chunks) {
      const builds = (chunk.config && chunk.config.builds) || [];
      const cards = builds.length ? builds.map((_, i) => oneBuildChunk(chunk, i)) : [chunk];
      const hits = [];
      for (const card of cards) {
        const r = await pg.evaluate(([d, e, c, q]) =>
          (new Function('return (' + d + ')')())(e, c, q), [DRIVE, chunk.engine, card, EE.QUERY]);
        (r || []).forEach(f => {
          const k = f.tag + f.cls + f.inside;
          if (hits.every(h => h.tag + h.cls + h.inside !== k)) hits.push(f);
        });
      }
      const id = lesson.id + ' › ' + chunk.id;
      if (!hits.length) { console.log('  PASS  ' + id + ' (' + cards.length + ' card(s)): nothing empty on screen'); continue; }
      if (LOCKED.has(lesson.id)) {
        waive(id + ': ' + hits.map(EE.describe).join(' | ') +
          '\n            LOCKED and signed off (DFM 221) — reported, not fixed.');
      } else {
        check(false, id + ' (' + cards.length + ' card(s)):\n           ' + hits.map(EE.describe).join('\n           '));
      }
    }
    check(errs.length === 0, 'no uncaught page errors while rendering the cards' +
      (errs.length ? '  [' + errs.slice(0, 2).join(' | ') + ']' : ''));

    console.log('\n--- CONTROL: his own card on the engine he sat');
    if (!before) { check(false, 'the control could not run — see above'); }
    else {
      const { pg: old } = await makePage(browser, before);
      const his = chunks.find(c => c.lesson.id === 'j2-03' && c.chunk.id === 'training-3');
      check(!!his, 'j2-03 › training-3 is in the derived list (his "wee white line")');
      let fired = false, first = null;
      if (his) {
        for (let i = 0; i < (his.chunk.config.builds || []).length; i++) {
          const r = await old.evaluate(([d, e, c, q]) =>
            (new Function('return (' + d + ')')())(e, c, q),
          [DRIVE, 'pyrun', oneBuildChunk(his.chunk, i), EE.QUERY]);
          const pre = (r || []).find(f => f.tag === 'pre' || /target/.test(f.cls));
          if (pre) { fired = true; first = pre; break; }
        }
      }
      control(fired, BASE_REF + ' really renders his empty strip' + (first ? ' — ' + EE.describe(first) : ''));
    }
  } finally {
    await browser.close();
  }

  if (waived.length) {
    console.log('\n' + waived.length + ' WAIVED (LOCKED-LESSON) FINDING(S), printed rather than hidden:');
    waived.forEach(w => console.log('  - ' + w));
  }
  console.log('\n' + (failures ? 'qa-empty-elements: ' + failures + ' FAILURE(S)' : 'qa-empty-elements: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();
