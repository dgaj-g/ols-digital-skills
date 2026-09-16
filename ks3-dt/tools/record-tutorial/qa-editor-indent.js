#!/usr/bin/env node
/* qa-editor-indent.js — THE TWO INDENT INCREMENTS, ON AND OFF (L4 spec §C1.5 / §C8).
 *
 * J2 Lesson 4 is its cohort's first indentation and J3 Lesson 4 its first `def`
 * body, so PyRun.editor gains two flags: `autoIndent` (Enter after a line ending
 * in ':' keeps the indent and adds four; Enter on an indented line keeps it) and
 * `indentGuides` (a faint guide in the gutter LEFT of the number for every line
 * pushed in four spaces, two for eight). Both were proved in the prototype and
 * both are OFF unless a lesson asks.
 *
 * WHAT IS ASSERTED, in a real Chromium with real key presses:
 *   ON   Tab types four spaces · Enter after "if x:" lands on a new line pushed in
 *        four · Enter on a pushed-in line keeps its indent · Enter after "    if y:"
 *        gives eight · the gutter row of every pushed-in line carries the guide
 *        class, and the guide's paint sits LEFT of the digit's ink (measured: the
 *        digit's text box starts ≥ 6px from the row's left edge — the prototype's
 *        first cut drew the guide across the digits) · the guide is really painted
 *        (the row's computed box-shadow is not "none").
 *   OFF  the gutter is the same text `<pre>` with the same textContent the engine
 *        he sat renders for the same program, and Enter/Tab behave identically —
 *        the L2/L3 editors set neither flag (asserted from content-src) and so
 *        render byte-identically.
 * CONTROL (DFM 196): the engine of the build he sat (git show <base>) mounted with
 *        the flags ON must NOT auto-indent and must NOT draw a guide — a flag the
 *        old engine ignores is what proves the increment is real.
 *
 *   node qa-editor-indent.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');

const BASE_REF = process.env.KS3DT_INDENT_BASE || '8f58434';   /* Version 64 — the build he sat */
const REPO = path.resolve(__dirname, '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const SRC = process.env.KS3DT_SRC || path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

let failures = 0;
const check = (ok, m, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m + (!ok && d ? ' — ' + d : '')); if (!ok) failures++; };
const control = (ok, m, d) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m + (!ok && d ? ' — ' + d : '')); if (!ok) failures++; };

async function makePage(browser, engineSrc) {
  const pg = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto('about:blank');
  await pg.addStyleTag({ content: 'body{margin:0;padding:24px;background:#0B1A33;}' });
  await pg.addStyleTag({ path: STYLE });
  await pg.evaluate(() => {
    window.App = {
      esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      asset: p => p, armButton: (b, fn) => { if (b) b.onclick = fn; }, toast: () => {}
    };
  });
  await pg.addScriptTag({ content: engineSrc });
  await pg.evaluate(() => { if (window.PyRun) window.PyRun._p = Promise.resolve(true); });
  return { pg, errs };
}

const MOUNT = (cfg) => {
  document.body.innerHTML = '<div id="host" style="max-width:720px"></div>';
  window.__ed = window.PyRun.editor(document.getElementById('host'), cfg);
  return !!document.querySelector('.pye-code');
};

/* type a program with REAL key presses, one key at a time */
async function typeProgram(pg, lines) {
  await pg.focus('.pye-code');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    /* "\\t" means the Tab key; a leading ">" means "this line's indent comes from Enter, type only the rest" */
    for (const ch of l) {
      if (ch === '\t') await pg.keyboard.press('Tab');
      else await pg.keyboard.type(ch);
    }
    if (i < lines.length - 1) await pg.keyboard.press('Enter');
  }
  return pg.evaluate(() => window.__ed.value());
}

async function gutter(pg) {
  return pg.evaluate(() => {
    const nums = document.querySelector('.pye-nums');
    /* RE-STAGED 14 Sep 2026: the guide is its own element beside the digit
       (`.pye-gut > .pye-guide + .pye-num`), never a shadow inside the digit's
       box — the readability sampler read that shadow as the digit's ink on the
       first Lesson 4 walks. A row is the gutter row; its class is the guide's;
       "painted" is the guide's ::before pseudo-element having a real width;
       the digit's ink is measured from the ROW's left edge, as before. */
    const rows = Array.from(nums.querySelectorAll('.pye-gut')).map(r => {
      const rr = r.getBoundingClientRect();
      const num = r.querySelector('.pye-num'), guide = r.querySelector('.pye-guide');
      const range = document.createRange(); range.selectNodeContents(num);
      const tr = range.getBoundingClientRect();
      const before = guide ? getComputedStyle(guide, '::before') : null;
      const painted = before && before.content !== 'none' && parseFloat(before.width) > 0 ? before.width + ' ' + before.backgroundColor : 'none';
      return { cls: guide ? guide.className : '', shadow: painted, digitLeft: Math.round(tr.left - rr.left), text: num.textContent,
        guideInDigitBox: guide ? (guide.getBoundingClientRect().right > num.getBoundingClientRect().left + 0.5) : false };
    });
    return { tag: nums.tagName, text: nums.textContent, rows, html: nums.innerHTML };
  });
}

(async () => {
  console.log('qa-editor-indent — autoIndent + indentGuides, on and off\n');
  const browser = await chromium.launch();
  const cur = fs.readFileSync(ENGINES, 'utf8');

  /* ---------------------------------------------------------------- ON */
  console.log('-- flags ON (the two L4 editors) --');
  const on = await makePage(browser, cur);
  await on.pg.evaluate(MOUNT, { title: 'Your room', autoIndent: true, indentGuides: true, softWrap: true });
  const v1 = await typeProgram(on.pg, ['if choice == "lamp":', 'print("A")', 'print("NEXT: door A")']);
  check(v1 === 'if choice == "lamp":\n    print("A")\n    print("NEXT: door A")',
    'Enter after a line ending in ":" lands pushed in by four, and the next Enter keeps the indent', JSON.stringify(v1));
  await on.pg.keyboard.press('Enter'); await on.pg.keyboard.press('Backspace'); await on.pg.keyboard.press('Backspace');
  await on.pg.keyboard.press('Backspace'); await on.pg.keyboard.press('Backspace');
  await on.pg.keyboard.type('else:'); await on.pg.keyboard.press('Enter'); await on.pg.keyboard.type('if twist == "yes":');
  await on.pg.keyboard.press('Enter'); await on.pg.keyboard.type('print("B")');
  const v2 = await on.pg.evaluate(() => window.__ed.value());
  check(/\nelse:\n    if twist == "yes":\n        print\("B"\)$/.test(v2), 'a fork inside a road: Enter after "    if …:" lands eight spaces in', JSON.stringify(v2));
  await on.pg.keyboard.press('Enter'); await on.pg.keyboard.press('Tab'); await on.pg.keyboard.type('x');
  const v3 = await on.pg.evaluate(() => window.__ed.value());
  check(/\n            x$/.test(v3), 'Tab still types four spaces (eight from Enter + four from Tab)', JSON.stringify(v3.split('\n').pop()));
  const g = await gutter(on.pg);
  const lines = v3.split('\n');
  check(g.rows.length === lines.length, 'the gutter has one row per logical line (' + g.rows.length + ' of ' + lines.length + ')');
  const want = lines.map(l => /^ {8}/.test(l) ? 'is-in2' : (/^ {4}/.test(l) ? 'is-in' : ''));
  const got = g.rows.map(r => /is-in2/.test(r.cls) ? 'is-in2' : (/is-in\b/.test(r.cls) ? 'is-in' : ''));
  check(JSON.stringify(got) === JSON.stringify(want), 'every pushed-in line carries the guide class (one for four spaces, two for eight)', JSON.stringify(got));
  const guided = g.rows.filter(r => /is-in/.test(r.cls));
  check(guided.length > 0 && guided.every(r => r.shadow && r.shadow !== 'none'), 'the guide is really painted (its ::before has a width and a colour)', JSON.stringify(guided.map(r => r.shadow)));
  check(g.rows.every(r => !r.guideInDigitBox), 'the guide never enters the digit\'s own box (what the readability sampler measures)', JSON.stringify(g.rows.map(r => r.guideInDigitBox)));
  check(g.rows.every(r => r.digitLeft >= 6), 'the guide sits LEFT of the digits: every digit\'s ink starts ≥ 6px from the row\'s left edge', JSON.stringify(g.rows.map(r => r.digitLeft)));
  check(on.errs.length === 0, 'no page errors with the flags on', on.errs.join(' | '));
  await on.pg.close();

  /* ---------------------------------------------------------------- OFF */
  console.log('\n-- flags OFF (every existing editor) --');
  const baseSrc = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':ks3-dt/platform/engines.js'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const PROG = ['if choice == "lamp":', '    print("A")', 'print("done")'];
  async function offRun(src) {
    const p = await makePage(browser, src);
    await p.pg.evaluate(MOUNT, { title: 'Your program', softWrap: true });
    await p.pg.focus('.pye-code');
    for (let i = 0; i < PROG.length; i++) { await p.pg.keyboard.type(PROG[i]); if (i < PROG.length - 1) await p.pg.keyboard.press('Enter'); }
    const value = await p.pg.evaluate(() => window.__ed.value());
    const gut = await gutter(p.pg);
    await p.pg.close();
    return { value, gut, errs: p.errs };
  }
  const offNow = await offRun(cur), offBase = await offRun(baseSrc);
  check(offNow.value === PROG.join('\n'), 'flags off: Enter does not auto-indent (the typed program is exactly what was typed)', JSON.stringify(offNow.value));
  check(offNow.gut.tag === 'PRE' && offNow.gut.rows.length === 0, 'flags off: the gutter is the text <pre> it always was (no rows)', offNow.gut.tag + ' rows=' + offNow.gut.rows.length);
  check(offNow.gut.html === offBase.gut.html && offNow.value === offBase.value,
    'flags off: gutter markup and typed value are BYTE-IDENTICAL to the engine he sat (' + BASE_REF + ')', JSON.stringify([offNow.gut.html, offBase.gut.html]));
  /* the shipped lessons set neither flag */
  const flagged = [];
  ['j2', 'j3'].forEach(y => fs.readdirSync(path.join(SRC, y, 'lessons')).forEach(f => {
    const L = JSON.parse(fs.readFileSync(path.join(SRC, y, 'lessons', f), 'utf8'));
    JSON.stringify(L, (k, v) => { if ((k === 'autoIndent' || k === 'indentGuides') && v) flagged.push(f + ':' + k); return v; });
  }));
  const allowed = flagged.filter(x => !/^j[23]-04\.json/.test(x));
  check(allowed.length === 0, 'no lesson before Lesson 4 sets either flag (the L2/L3 editors render as they did)', allowed.join(', '));

  /* ---------------------------------------------------------------- CONTROL */
  console.log('\n-- CONTROL: the engine he sat ignores the flags --');
  const ctl = await makePage(browser, baseSrc);
  await ctl.pg.evaluate(MOUNT, { title: 'Your room', autoIndent: true, indentGuides: true, softWrap: true });
  const cv = await typeProgram(ctl.pg, ['if choice == "lamp":', 'print("A")']);
  control(cv === 'if choice == "lamp":\nprint("A")', 'the pre-change engine does NOT auto-indent after ":" (the increment is real)', JSON.stringify(cv));
  const cg = await gutter(ctl.pg);
  control(cg.rows.length === 0 && cg.tag === 'PRE', 'the pre-change engine draws NO guide rows', cg.tag + ' rows=' + cg.rows.length);
  await ctl.pg.close();
  await browser.close();

  console.log('');
  if (failures) { console.log('qa-editor-indent: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-editor-indent: ALL GREEN');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
