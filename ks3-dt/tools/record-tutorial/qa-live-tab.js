/* qa-live-tab.js - the Live tab shows ONE lesson at a time, and says which.
 *
 * DAMIEN, 8 Aug 2026 (DFM 156), with three lessons delivered and Lesson 2 sat
 * as a pupil: "it is a bit of a mess, with stats across different lessons, and
 * I'm unsure what evaluation data I'm being shown for the 2 students - is it for
 * lesson 2? Lesson 1? Lesson 3? How did Jarlath do on the questions at the end
 * of lesson 2? I can't find this out here."
 *
 * Three separate faults sat behind that, and this harness pins all three:
 *   1. every delivered lesson was rendered side by side in one table, with four
 *      other panels each carrying their OWN lesson dropdown;
 *   2. the exit-check answers were never rendered at all - they were in the
 *      payload the whole time (the stuck flag, the CSV and the misconception
 *      bars all read them), so his question was genuinely unanswerable;
 *   3. the glyphs that WERE on screen (the pupil's own self-ratings) carried no
 *      key, so they read as marks.
 *
 * Every check that pins a fix carries a CONTROL that fails without it - either
 * the pre-fix source (git show) or a deliberately wrong assertion about the
 * live screen. Rendered values are measured in a real browser (DFM 146b), never
 * inferred from the source.
 *
 *   node qa-live-tab.js          (needs the dev server on :8096)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../..');
const P = f => path.join(ROOT, 'ks3-dt/platform', f);
/* the commit that was live when he reported this - a relative ref would stop
   being pre-fix the moment this lands */
const PREFIX_REF = process.env.KS3DT_LIVE_PREFIX_REF || 'ccb6822';
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=QA-Live';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

const staff = fs.readFileSync(P('staff.js'), 'utf8');
const css = fs.readFileSync(P('style.css'), 'utf8');
function atPrefix(rel) {
  try {
    return execFileSync('git', ['show', PREFIX_REF + ':ks3-dt/platform/' + rel], { cwd: ROOT, encoding: 'utf8' });
  } catch (e) { return null; }
}

/* ---------- the content this harness asserts against, read from the SOURCE of
   truth rather than copied, so a content edit can never leave the harness
   asserting a stem nobody ships (DFM 149's lesson) ---------- */
const CONTENT = path.join('/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/content-src/j1/lessons');
const L2 = JSON.parse(fs.readFileSync(path.join(CONTENT, 'j1-02.json'), 'utf8'));
const L3 = JSON.parse(fs.readFileSync(path.join(CONTENT, 'j1-03.json'), 'utf8'));
function chunkOf(lesson, engine) { return (lesson.chunks || []).filter(c => c.engine === engine)[0] || null; }
const L2_EXIT = chunkOf(L2, 'exitcheck').config.items;
const L2_SE = chunkOf(L2, 'selfeval').config;
const L3_EXIT = chunkOf(L3, 'exitcheck').config.items;
const L3_SE = chunkOf(L3, 'selfeval').config;
const L2_PARSONS = chunkOf(L2, 'parsons');

/* ============================================================
   A. SOURCE - the shapes the redesign needs, and the pre-fix controls
   ============================================================ */
section('A. SOURCE: one selection governs the whole tab');
check(/var liveLessonNum = ''/.test(staff), 'there is ONE lesson selection for the tab (liveLessonNum)');
check(/id="live-lesson-sel"/.test(staff), 'and one picker that sets it');
check(!/id="live-mis-select"/.test(staff), 'the misconception panel no longer carries its own lesson dropdown');
check(!/id="pair-lesson-sel"/.test(staff), 'the pairing lens no longer carries its own lesson dropdown');
check(!/id="gallery-lesson-sel"/.test(staff), 'the Press Night lens no longer carries its own lesson dropdown');
check(/function lessonFeaturesFor/.test(staff) && !/function pairedInfoFor/.test(staff) && !/function tourneyInfoFor/.test(staff),
  'what a lesson contains is answered in ONE place, so two panels can never disagree');
check(/function stuckLessonsFor/.test(staff) && !/function isStuck\b/.test(staff),
  'stuck-spotting returns WHICH lessons flagged, so the flag can name them');
check(/isSideQuestNum/.test(staff) && /the side quest always sorts last/.test(staff),
  'the side quest is handled explicitly (its manifest num is the string S1, so Number() is NaN)');

section('B. SOURCE CONTROL - the pre-fix file must fail all of that');
const old = atPrefix('staff.js');
if (!old) {
  check(false, 'could not read the pre-fix commit ' + PREFIX_REF + ' - the controls cannot run');
} else {
  check(!/var liveLessonNum/.test(old), 'pre-fix: there was no single tab-wide lesson selection');
  check(/id="live-mis-select"/.test(old) && /id="pair-lesson-sel"/.test(old) && /id="gallery-lesson-sel"/.test(old),
    'pre-fix: three panels each carried their own separate lesson dropdown (this is the mess he saw)');
  check(/deliveredNums\.map\(function \(n\) \{ return '<th>L' \+ n \+ '<\/th>'; \}\)/.test(old),
    'pre-fix: the table drew a column for EVERY delivered lesson at once');
  check(!/Q' \+ \(i \+ 1\)/.test(old),
    'pre-fix: no per-question exit column existed anywhere (his "how did Jarlath do" was unanswerable)');
  check(!/own rating of herself, not a mark/.test(old),
    'pre-fix: nothing on the tab said the tick/wave/cross glyphs were the pupil’s own self-rating');
}

section('C. SOURCE: the glyph key exists in CSS as well as in words');
['.live-pick', '.live-elsewhere', '.lc-yes', '.lc-no', '.lc-mid', '.lc-skip', '.lc-dash', '.lc-comment', '.live-legend']
  .forEach(cl => check(css.indexOf(cl) !== -1, 'style.css defines ' + cl));

section('D. SOURCE: the Guide tab teaches the new screen (DFM 156d)');
const guideSlice = staff.slice(staff.indexOf('<h4>Live</h4>'), staff.indexOf('<h4>Absence</h4>'));
check(/one lesson at a time/.test(guideSlice) && /Showing/.test(guideSlice),
  'the Guide tab teaches the Showing menu');
check(/Build puzzle/.test(guideSlice), 'and the Build puzzle column');
check(/never appear in the table/.test(guideSlice), 'and says a teacher’s own runs are not listed');
check(/filtering can never hide a pupil who needs help/.test(guideSlice),
  'and that choosing a lesson never hides a stuck pupil');

/* The banned-word sweep (DFM 150) runs on RENDERED TEXT further down, not on
   this file's source: code naming is not prose, and DFM 140(a) forbids
   "fixing" fontSize/center/behavior/normalize. What a teacher READS is the
   thing under the rule. */
const BANNED = [['tap', /\btap(s|ped|ping)?\b/i], ['wifi', /\bwi-?fi\b/i], ['the device', /\bthe device\b/i],
  ['color', /\bcolors?\b/i], ['center', /\bcenter(ed|s)?\b/i], ['behavior', /\bbehaviors?\b/i],
  ['organize', /\borganiz/i], ['recognize', /\brecogniz/i], ['favorite', /\bfavorite/i],
  ['practicing', /\bpracticing\b/i]];

/* ============================================================
   LIVE HALF - staged classes driven in a real browser
   ============================================================ */
const CLASS = 'QA-Live';
const STAFF_EMAIL = 'teacher@demo';

/* L2 keys: ex2-1 -> 1, ex2-2 -> 0. L3 keys: ex3-1 -> 1, ex3-2 -> 0, ex3-3 -> 1.
   Answer strings are chosen so all FOUR glyph states appear across the rows. */
function stageInPage(opts) {
  const CLS = 'QA-Live', STAFF = 'teacher@demo';
  const EPOCH = 1767225600000;
  const tmin = Math.floor((Date.now() - EPOCH) / 60000);
  const weekAgo = tmin - 7 * 1440;
  const s = {
    passcode: 'demo',
    classes: [{ name: CLS, owner: STAFF, year: 'j1', created: new Date(Date.now() - 7 * 864e5).toISOString() }],
    locks: {}, hods: [], cfg: {}, team: {}, pupils: {}, userProps: {}
  };
  s.locks[CLS] = {};
  if (!opts.nothingDelivered) {
    s.locks[CLS]['1'] = { u: weekAgo, on: 1 };
    s.locks[CLS]['2'] = { u: weekAgo + 1440, on: 1 };
    /* delivered LAST but locked again: a naive "newest delivered" default would
       wrongly land here, which is the control for the default rule */
    s.locks[CLS]['3'] = { u: weekAgo + 2880, on: opts.l3On ? 1 : 0 };
    if (opts.sideQuest) s.locks[CLS].S1 = { u: weekAgo + 4320, on: 1 };  // newest of all
  }
  s.cfg[CLS] = {
    lb: { mode: 'off', basis: 'xp', names: 'codename', topN: 0 },
    absDays: 5, cover: { on: 0, lesson: '', ts: 0 }, pairing: { on: 1 }, tn: { mode: 'team' }
  };
  function rec(name, xp, L) { return { n: name, cn: name.split(' ')[0] + ' Heron', j: weekAgo, xp: xp, g: '', L: L }; }
  /* Larr: [status, xp, detail, exitChosen, selfEval, lastSeen, mins, flags, comment, recapRight, recapTotal] */
  s.pupils[CLS + ':anya.murphy@demo'] = rec('Anya Murphy', 110, {
    '1': [2, 60, 'bl=12/16|0121000000010000', '0', '222|0', tmin - 30, 46, 0, '', 7, 9],
    '2': [2, 50, 'ep=0', '1', '222|0', tmin - 5, 40, 0, '', 6, 7]
  });
  s.pupils[CLS + ':jarlath.gartland@demo'] = rec('Jarlath Gartland', 96, {
    '1': [2, 46, 'bl=5/16|0121000000010000', '0', '221|1', tmin - 40, 44, 0, '', 6, 9],
    '2': [2, 50, 'ep=1', '0x', '210|1', tmin - 6, 42, 0, 'I got stuck on the download bit', 5, 7]
  });
  /* stuck on LESSON 1 only (1 of 9 recap): with Lesson 2 on screen her flag and
     the strip must still name her - a filter may never hide a stuck pupil */
  s.pupils[CLS + ':ciara.small@demo'] = rec('Ciara Small', 20, {
    '1': [1, 20, '', '', '', tmin - 50, 12, 0, '', 1, 9]
  });
  s.pupils[CLS + ':mia.larkin@demo'] = rec('Mia Larkin', 0, {});
  if (opts.l3Data) {
    s.pupils[CLS + ':jarlath.gartland@demo'].L['3'] = [2, 40, '', '1x2', '2210|2', tmin - 3, 30, 0, '', 4, 6];
  }
  localStorage.setItem('ks3dt-dev', JSON.stringify(s));
}

async function openLive(page, opts) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(stageInPage, opts);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate(() => window.Staff.open());
  await sleep(700);
  await page.evaluate(() => {
    const i = document.querySelector('#staff-modal input[type=password], #staff-modal input');
    if (i) { i.value = 'demo'; i.dispatchEvent(new Event('input', { bubbles: true })); }
    const b = Array.from(document.querySelectorAll('#staff-modal button')).find(x => /enter|unlock|go/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await sleep(1800);
  /* the panel opens on Classes with NO class selected - a teacher picks hers
     first, and so must this harness, or every tab says "Select a class" */
  await page.evaluate(() => {
    const b = document.querySelector('#staff-modal [data-action="select-class"][data-class="QA-Live"]');
    if (b) b.click();
  });
  await sleep(900);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('#staff-modal [data-action="switch-tab"]')).find(x => /^live$/i.test((x.textContent || '').trim()));
    if (t) t.click();
  });
  await sleep(3000);
}

async function pick(page, num) {
  await page.evaluate((n) => {
    const sel = document.querySelector('#live-lesson-sel');
    sel.value = n;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, num);
  await sleep(1600);
}

/* everything the assertions need, read off the real screen in one go */
async function readTab(page) {
  return page.evaluate(() => {
    const body = document.getElementById('staff-body');
    const sel = body.querySelector('#live-lesson-sel');
    const rowFor = (name) => Array.from(body.querySelectorAll('.dash-table tr')).find(tr =>
      (tr.querySelector('td') || {}).textContent && tr.querySelector('td').textContent.indexOf(name) !== -1);
    const cellsFor = (name) => {
      const tr = rowFor(name);
      return tr ? Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()) : null;
    };
    const heads = Array.from(body.querySelectorAll('.dash-table th')).map(th => th.textContent.trim());
    const pairBox = Array.from(body.querySelectorAll('.pair-lens-box')).map(b => (b.querySelector('h3') || {}).textContent || '');
    return {
      hasPicker: !!sel,
      picked: sel ? sel.value : '',
      options: sel ? Array.from(sel.options).map(o => o.textContent.trim()) : [],
      heads: heads,
      resultsHeading: (Array.from(body.querySelectorAll('h3')).map(h => h.textContent.trim())
        .filter(t => !/Pairing|Press Night|Reaction|Misconception/.test(t))[0]) || '',
      misHeading: (Array.from(body.querySelectorAll('h3')).map(h => h.textContent.trim())
        .filter(t => /Misconception/.test(t))[0]) || '',
      chips: Array.from(body.querySelectorAll('.staff-actions .pill')).map(p => p.textContent.trim()),
      pairPanel: pairBox.some(t => /Pairing/.test(t)),
      pairHeading: pairBox.filter(t => /Pairing/.test(t))[0] || '',
      tourneyPanel: !!body.querySelector('[data-action="tourney-open"]'),
      tourneyHeading: pairBox.filter(t => /Rally|Tournament/.test(t))[0] || '',
      galleryPanel: !!body.querySelector('#gallery-lens-body'),
      elsewhere: (body.querySelector('.live-elsewhere') || {}).textContent || '',
      legend: (body.querySelector('.live-legend') || {}).textContent || '',
      legendItems: Array.from(body.querySelectorAll('.live-legend-list li')).map(li => li.textContent.trim()),
      note: Array.from(body.querySelectorAll('.pl-note')).map(p => p.textContent.trim()),
      flags: Array.from(body.querySelectorAll('.pill.flag')).map(f => f.textContent.trim()),
      emptyState: body.textContent.indexOf('Nothing to show yet') !== -1,
      allText: body.textContent,
      /* The tab's OWN words. Quoted lesson content (the question stems in the
         legend, the authored misconception labels) and pupil-typed comments are
         deliberately excluded: the tab's job is to quote them faithfully, and
         rewriting a stem to satisfy a word rule would make the screen lie about
         what the question asked (rule 35 beats rule 150 on quoted material). */
      chromeText: (() => {
        const clone = body.cloneNode(true);
        clone.querySelectorAll('.live-legend-list, #live-mis-body, .dash-table').forEach(n => n.remove());
        return clone.textContent;
      })(),
      cells: {
        anya: cellsFor('Anya Murphy'),
        jarlath: cellsFor('Jarlath Gartland'),
        ciara: cellsFor('Ciara Small'),
        mia: cellsFor('Mia Larkin')
      },
      /* rendered pixels, not source (DFM 146b) */
      legendPx: (() => {
        const el = body.querySelector('.live-legend p');
        return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
      })(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      /* the whole table visible without sideways scrolling inside its own box:
         a cut-off "Private comme..." header is exactly the unreadability he
         reported, so a future column that pushes it over should FAIL here and
         be reconsidered rather than quietly clipped */
      tableOverflow: (() => {
        const sc = document.querySelector('.dash-scroll'), tb = document.querySelector('.dash-table');
        return (sc && tb) ? Math.round(tb.scrollWidth - sc.clientWidth) : 0;
      })()
    };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  /* ---------------------------------------------------------- */
  section('E. LIVE: the tab opens on the lesson being taught');
  await openLive(page, { l3On: false });
  let t = await readTab(page);
  check(t.hasPicker, 'the Showing picker is on screen');
  check(t.picked === '2', 'it opens on Lesson 2 - the newest lesson that is actually unlocked (got "' + t.picked + '")');
  check(t.picked !== '3', 'CONTROL: it does NOT open on Lesson 3, which was delivered later but locked again');
  check(/Lesson 2/.test(t.resultsHeading) && /Make It Move/.test(t.resultsHeading),
    'the results block names its lesson: "' + t.resultsHeading + '"');
  check(/Lesson 2/.test(t.misHeading), 'the misconception panel names its lesson: "' + t.misHeading + '"');
  check(t.options.length === 3, 'every delivered lesson is pickable, including the re-locked one (' + t.options.length + ')');

  section('E2. LIVE: the banned words, checked on what a teacher actually READS');
  BANNED.forEach(b => check(!b[1].test(t.chromeText), 'nothing the Live tab itself writes says "' + b[0] + '"'));

  section('F. LIVE: his exact complaint - Lesson 2 shows no panel it does not use');
  check(!t.pairPanel, 'Lesson 2 shows NO pairing panel');
  check(!t.tourneyPanel, 'Lesson 2 shows NO tournament panel');
  check(!t.galleryPanel, 'Lesson 2 shows no Press Night panel either');

  section('G. LIVE: "How did Jarlath do on the questions at the end of lesson 2?"');
  const qHeads = t.heads.filter(h => /^Q\d+$/.test(h));
  check(qHeads.length === L2_EXIT.length,
    'there is one column per exit-check question (' + qHeads.length + ' of ' + L2_EXIT.length + ')');
  /* Jarlath answered ex2-1 wrongly (chose 0, key 1) and answered nothing on ex2-2 */
  const jq = t.cells.jarlath.slice(t.heads.indexOf('Q1'), t.heads.indexOf('Q1') + qHeads.length);
  check(jq[0] === '✗', 'Q1 renders a cross for his wrong answer (got "' + jq[0] + '")');
  check(jq[1] === '○', 'Q2 renders a circle for a question he answered nothing on (got "' + jq[1] + '")');
  const aq = t.cells.anya.slice(t.heads.indexOf('Q1'), t.heads.indexOf('Q1') + qHeads.length);
  check(aq[0] === '✓', 'Anya’s Q1 renders a tick for her right answer');
  check(aq[1] === '–', 'and Q2 a dash - she never got that far, which is not the same as wrong');
  check(t.legendItems.some(li => li.indexOf(String(L2_EXIT[0].stem).slice(0, 40)) !== -1),
    'the legend quotes the real question stem from the lesson content');

  section('H. LIVE: the build puzzle, and the self-ratings labelled as self-ratings');
  check(t.heads.indexOf('Build puzzle') !== -1, 'Lesson 2 shows its Build puzzle column');
  check(t.cells.jarlath[t.heads.indexOf('Build puzzle')] === '✓', 'Jarlath’s ep=1 renders a tick');
  check(t.cells.anya[t.heads.indexOf('Build puzzle')] === '✗', 'Anya’s ep=0 renders a cross');
  check(t.legend.indexOf(L2_PARSONS.config.title || L2_PARSONS.title) !== -1,
    'the legend names the puzzle by its real title');
  check(t.heads.indexOf('How did it go?') !== -1 && t.heads.indexOf('How it felt') !== -1 &&
        t.heads.indexOf('Private comment') !== -1, 'the self-rating columns are separate and named');
  check(/own rating of herself, not a mark/.test(t.legend),
    'and the legend says plainly they are her own rating, not a mark');
  L2_SE.statements.forEach((st, i) => {
    check(t.legendItems.some(li => li.indexOf(String(st).slice(0, 30)) !== -1),
      'the legend quotes self-rating statement ' + (i + 1) + ' from the lesson content');
  });
  check(t.cells.jarlath[t.heads.indexOf('Private comment')].indexOf('download bit') !== -1,
    'his private comment is on screen');

  section('I. LIVE: the lesson’s own progress counts, and the teacher-run note');
  check(t.chips.some(c => /^2 of 4 finished$/.test(c)), 'the counts belong to this lesson: ' + JSON.stringify(t.chips));
  check(t.chips.some(c => /2 not started/.test(c)), 'and say how many have not started it');
  check(t.note.some(n => /never appear in this table/.test(n)),
    'the tab says on screen that a teacher’s own runs are not listed (rule 40, which is why his own sit-through showed nothing)');

  section('J. LIVE: choosing a lesson can never hide a stuck pupil');
  check(/Ciara Small/.test(t.elsewhere) && /Lesson 1/.test(t.elsewhere),
    'with Lesson 2 on screen, the strip names Ciara and her lesson: "' + t.elsewhere.trim() + '"');
  check(t.flags.some(f => /needs you \(Lesson 1\)/.test(f)), 'and her row flag names that lesson too');
  check(t.flags.some(f => /^needs you$/.test(f)), 'a pupil stuck in THIS lesson keeps the plain flag');

  section('K. LIVE: the picker moves the whole tab');
  await pick(page, '1');
  let t1 = await readTab(page);
  check(t1.pairPanel, 'Lesson 1 brings its pairing panel back');
  check(/Lesson 1/.test(t1.pairHeading), 'and the panel heading names the lesson: "' + t1.pairHeading.trim() + '"');
  check(!t1.tourneyPanel, 'CONTROL: Lesson 1 still shows no tournament panel');
  check(/Lesson 1/.test(t1.misHeading), 'the misconception panel followed the picker');
  check(t1.heads.filter(h => /^Q\d+$/.test(h)).length === 1, 'Lesson 1 has one exit question, so one Q column');

  await pick(page, '3');
  let t3 = await readTab(page);
  check(t3.tourneyPanel, 'Lesson 3 brings the Reaction Rally launch row');
  check(/Lesson 3/.test(t3.tourneyHeading), 'which names its lesson: "' + t3.tourneyHeading.trim() + '"');
  check(!t3.pairPanel, 'CONTROL: Lesson 3 shows no pairing panel');
  check(t3.heads.filter(h => /^Q\d+$/.test(h)).length === L3_EXIT.length, 'and three Q columns, one per question');
  check(t3.legendItems.filter(li => /^Statement/.test(li)).length === L3_SE.statements.length,
    'Lesson 3’s four self-rating statements are all quoted (' + L3_SE.statements.length + ')');

  section('L. LIVE: Refresh keeps the lesson he is looking at');
  await page.evaluate(() => {
    const b = document.querySelector('[data-action="live-refresh"]');
    if (b) b.click();
  });
  await sleep(2600);
  const tr = await readTab(page);
  check(tr.picked === '3', 'after Refresh the tab is still showing Lesson 3 (got "' + tr.picked + '")');

  section('M. LIVE: rendered pixels, not source (DFM 146b)');
  check(tr.legendPx >= 12, 'the legend renders at ' + tr.legendPx + 'px - readable, not fine print');
  check(tr.overflow <= 1, 'the page itself does not scroll sideways (' + tr.overflow + 'px)');
  check(tr.tableOverflow <= 0, 'every column is visible without scrolling the table sideways (' + tr.tableOverflow + 'px over)');
  await page.setViewportSize({ width: 1440, height: 900 });
  await sleep(600);
  const tw = await readTab(page);
  check(tw.overflow <= 1, 'and the page still does not scroll sideways at 1440x900 (' + tw.overflow + 'px)');
  check(tw.tableOverflow <= 0, 'and every column is still visible there (' + tw.tableOverflow + 'px over)');
  await page.setViewportSize({ width: 1280, height: 720 });

  section('N. LIVE: the side quest is pickable but never the default');
  await openLive(page, { l3On: false, sideQuest: true });
  const ts = await readTab(page);
  check(ts.picked === '2', 'the self-paced side quest does not steal the default, even delivered newest (got "' + ts.picked + '")');
  check(/Side quest/.test(ts.options[ts.options.length - 1]), 'it sorts last in the picker: "' + ts.options[ts.options.length - 1] + '"');
  await pick(page, 'S1');
  const tsq = await readTab(page);
  check(/Side quest/.test(tsq.resultsHeading), 'and it is fully selectable: "' + tsq.resultsHeading + '"');
  check(!tsq.pairPanel && !tsq.tourneyPanel, 'with no lens panels of its own');
  check(tsq.heads.indexOf('Build puzzle') === -1,
    'CONTROL: no Build puzzle column on a lesson that has no build puzzle');

  section('O. LIVE: a class with nothing delivered says so');
  await openLive(page, { nothingDelivered: true });
  const te = await readTab(page);
  check(te.emptyState, 'the tab explains there is nothing to show yet');
  check(!te.hasPicker, 'and shows no picker at all');

  section('P. LIVE: the default follows the room when Lesson 3 is unlocked');
  await openLive(page, { l3On: true, l3Data: true });
  const t3d = await readTab(page);
  check(t3d.picked === '3', 'unlock Lesson 3 and the tab opens on Lesson 3 (got "' + t3d.picked + '")');
  const j3 = t3d.cells.jarlath.slice(t3d.heads.indexOf('Q1'), t3d.heads.indexOf('Q1') + 3);
  check(j3[0] === '✓' && j3[1] === '○' && j3[2] === '✗',
    'his three Lesson 3 answers render right/answered-nothing/wrong in order (got ' + JSON.stringify(j3) + ')');

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL LIVE-TAB CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
