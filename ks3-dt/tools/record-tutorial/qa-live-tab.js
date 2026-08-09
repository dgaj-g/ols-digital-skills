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
const L1 = JSON.parse(fs.readFileSync(path.join(CONTENT, 'j1-01.json'), 'utf8'));
const L1_EXAM = chunkOf(L1, 'diagnostic').config.items;
const L1_SE = chunkOf(L1, 'selfeval').config;
/* The real answer key, read from the same file the app reads, so the expected
   "wrong question" list is derived and never hand-copied (DFM 149's lesson). */
const DEVKEYS = JSON.parse(fs.readFileSync(path.join(ROOT, 'ks3-dt/content/dev-keys.json'), 'utf8'));
const L1_KEYS = DEVKEYS['j1/lessons/j1-01'];
/* Build a 16-digit baseline answer string: every question right except the ones
   named, which are given a deliberately wrong digit (or 'x' = answered nothing). */
function baselineString(wrongQs, blankQs) {
  return L1_EXAM.map((it, i) => {
    const q = i + 1;
    if ((blankQs || []).indexOf(q) !== -1) return 'x';
    const a = Number(L1_KEYS[it.id].a);
    return (wrongQs.indexOf(q) !== -1) ? String(a === 0 ? 1 : 0) : String(a);
  }).join('');
}
const ANYA_BL = baselineString([3, 7], []);       // 14 of 16
const ORLA_BL = baselineString([], [2]);          // 15 of 16, Q2 answered nothing

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

/* His live-verification finding, 8 Aug: the FIRST switch to a lesson sat silent
   for a few seconds. Its own pre-fix ref is the redesign commit itself. */
section('B2. SOURCE CONTROL - the silent wait he reported really was silent');
/* round 3 (DFM 162, 9 Aug) landed on top of the flag-lifecycle build, so its
   controls need their own pre-fix ref */
const preFlags2 = (() => {
  try {
    return execFileSync('git', ['show', (process.env.KS3DT_FLAGS2_PREFIX_REF || 'cfc3cbf') + ':ks3-dt/platform/staff.js'],
      { cwd: ROOT, encoding: 'utf8' });
  } catch (e) { return null; }
})();
const preBusy = (() => {
  try {
    return execFileSync('git', ['show', (process.env.KS3DT_BUSY_PREFIX_REF || 'c48961c') + ':ks3-dt/platform/staff.js'],
      { cwd: ROOT, encoding: 'utf8' });
  } catch (e) { return null; }
})();
if (!preBusy) {
  check(false, 'could not read the pre-fix commit for the loading state - that control cannot run');
} else {
  check(/live-lesson-sel'\) \{ liveLessonNum = t\.value; renderLiveTable\(\)/.test(preBusy),
    'pre-fix: changing the lesson went straight to the fetch with nothing drawn in between');
  check(!/function paintLiveLoading/.test(preBusy), 'pre-fix: there was no loading screen to draw');
  check(/function paintLiveLoading/.test(staff) && /paintLiveLoading\(liveLessonNum\); renderLiveTable\(\)/.test(staff),
    'now: the loading screen is drawn first, then the fetch runs');
}

section('C. SOURCE: the glyph key exists in CSS as well as in words');
['.live-pick', '.live-elsewhere', '.strip-jump', '.lc-yes', '.lc-no', '.lc-mid', '.lc-skip', '.lc-dash', '.lc-comment', '.live-legend']
  .forEach(cl => check(css.indexOf(cl) !== -1, 'style.css defines ' + cl));

section('D. SOURCE: the Guide tab teaches the new screen (DFM 156d)');
const guideSlice = staff.slice(staff.indexOf('<h4>Live</h4>'), staff.indexOf('<h4>Absence</h4>'));
check(/one lesson at a time/.test(guideSlice) && /Showing/.test(guideSlice),
  'the Guide tab teaches the Showing menu');
check(/Build puzzle/.test(guideSlice), 'and the Build puzzle column');
check(/never appear in the table/.test(guideSlice), 'and says a teacher’s own runs are not listed');
check(/choosing a lesson can never hide a pupil who needs help/.test(guideSlice),
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
  /* all sixteen but two right; all-ticks + Tricky is the control that a Tricky
     dot ALONE never raises the amber voice flag (DFM 159) */
  s.pupils[CLS + ':anya.murphy@demo'] = rec('Anya Murphy', 110, {
    '1': [2, 60, 'bl=14/16|' + opts.anyaBl, '0', '222|2', tmin - 30, 46, 0, '', 7, 9],
    '2': [2, 50, 'ep=0', '1', '222|2', tmin - 5, 40, 0, '', 6, 7]
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
  /* L1: the single-question exit check answered wrongly (one reason wording) and
     one baseline question answered with nothing. L2: started and untouched for
     an hour (the no-activity reason), with all-"Getting there" ratings, which
     must NOT raise the voice flag. */
  s.pupils[CLS + ':orla.devine@demo'] = rec('Orla Devine', 40, {
    '1': [2, 40, 'bl=15/16|' + opts.orlaBl, '1', '222|1', tmin - 30, 40, 0, '', 6, 9],
    '2': [1, 10, '', '', '111|1', tmin - 60, 8, 0, '', 0, 0]
  });
  /* every exit question wrong (the plural reason wording) with all-ticks
     ratings: the control that a red-flagged pupil gets red ONLY */
  s.pupils[CLS + ':sinead.boyle@demo'] = rec('Sinead Boyle', 60, {
    '2': [2, 60, '', '01', '222|1', tmin - 8, 38, 0, '', 5, 7]
  });
  if (opts.l3Data) {
    s.pupils[CLS + ':jarlath.gartland@demo'].L['3'] = [2, 40, '', '1x2', '2210|2', tmin - 3, 30, 0, '', 4, 6];
  }
  localStorage.setItem('ks3dt-dev', JSON.stringify(s));
}

async function openLive(page, opts) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(stageInPage, Object.assign({ anyaBl: ANYA_BL, orlaBl: ORLA_BL }, opts));
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
        mia: cellsFor('Mia Larkin'),
        orla: cellsFor('Orla Devine'),
        sinead: cellsFor('Sinead Boyle')
      },
      /* round 2: the flags' own explanations, read off the real attributes */
      flagTitles: (() => {
        const out = {};
        ['Anya Murphy', 'Jarlath Gartland', 'Ciara Small', 'Orla Devine', 'Sinead Boyle'].forEach(n => {
          const tr = rowFor(n); if (!tr) return;
          const p = tr.querySelector('.pill.flag');
          out[n] = p ? p.getAttribute('title') : null;
        });
        return out;
      })(),
      voiceTitles: (() => {
        const out = {};
        ['Anya Murphy', 'Jarlath Gartland', 'Ciara Small', 'Orla Devine', 'Sinead Boyle'].forEach(n => {
          const tr = rowFor(n); if (!tr) return;
          const p = tr.querySelector('.pill.voice');
          out[n] = p ? p.getAttribute('title') : null;
        });
        return out;
      })(),
      voicePillCount: body.querySelectorAll('.dash-table .pill.voice').length,
      /* re-staged 9 Aug (DFM 162a): the strip's lessons became BUTTONS that jump
         the tab, so its explanations live on them and not on a span */
      stripTitles: Array.from(body.querySelectorAll('.live-elsewhere .strip-jump')).map(s => s.getAttribute('title')),
      stripLabels: Array.from(body.querySelectorAll('.live-elsewhere .strip-jump')).map(s => s.textContent.trim()),
      refreshTitle: (body.querySelector('[data-action="live-refresh"]') || {}).title || '',
      csvTitle: (body.querySelector('[data-action="live-csv"]') || {}).title || '',
      baseline: (() => {
        const h = Array.from(body.querySelectorAll('h3')).filter(x => /Licence Exam/.test(x.textContent))[0];
        if (!h) return null;
        /* the blocks that follow the Licence Exam heading, i.e. after the misconception ones */
        const all = Array.from(body.querySelectorAll('.staff-row'));
        const after = all.filter(el => h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
        return {
          blocks: after.length,
          firstTitle: after.length ? after[0].querySelector('.staff-row-name').textContent.trim() : '',
          text: after.map(el => el.textContent).join(' | '),
          correctLabels: after.filter(el => /\(the correct answer\)/.test(el.textContent)).length
        };
      })(),
      baselineTitles: (() => {
        const out = {};
        ['Anya Murphy', 'Orla Devine', 'Ciara Small'].forEach(n => {
          const tr = rowFor(n); if (!tr) return;
          out[n] = tr.querySelectorAll('td')[3].getAttribute('title');
        });
        return out;
      })(),
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
  check(t.chips.some(c => /^3 of 6 finished$/.test(c)), 'the counts belong to this lesson: ' + JSON.stringify(t.chips));
  check(t.chips.some(c => /2 not started/.test(c)), 'and say how many have not started it');
  check(t.note.some(n => /never appear in this table/.test(n)),
    'the tab says on screen that a teacher’s own runs are not listed (rule 40, which is why his own sit-through showed nothing)');

  section('J. LIVE: choosing a lesson can never hide a stuck pupil');
  check(/Ciara Small/.test(t.elsewhere) && /Lesson 1/.test(t.elsewhere),
    'with Lesson 2 on screen, the strip names Ciara and her lesson: "' + t.elsewhere.trim() + '"');
  /* re-staged 9 Aug (DFM 162a - one pill, one lesson). Ciara is stuck in Lesson 1
     and has no Lesson 2 record at all, so with Lesson 2 on screen her ROW says
     nothing and the strip is the single, complete home of that signal. The old
     "needs you (Lesson 1)" pill is what let an acknowledgement in one lesson
     hide a live flag in another. */
  check(!t.flags.some(f => /\(Lesson /.test(f)), 'no pill in the table names another lesson any more');
  check(t.cells.ciara && !/needs you/.test(t.cells.ciara[0]),
    'Ciara’s Lesson 2 row carries no flag: everything in the table is about the lesson on screen');
  check(t.stripLabels.length === 2 && t.stripLabels.every(l => l === 'Lesson 1'),
    'and every lesson named in the strip is a button: ' + JSON.stringify(t.stripLabels));
  /* the completeness half of DFM 162(a): Orla is flagged in Lesson 2 (the lesson
     on screen) AND in Lesson 1. The old strip skipped her entirely, because it
     only listed pupils whose ROW pill was about another lesson - so a pupil in
     trouble in two lessons at once was half invisible. */
  check(/Orla Devine/.test(t.elsewhere),
    'a pupil flagged in THIS lesson and another one is named in the strip too: "' + t.elsewhere.trim() + '"');
  check(/Ciara Small/.test(t.elsewhere), 'alongside the pupil who is only flagged elsewhere');
  /* this one's pre-fix ref is NOT ccb6822 (the strip did not exist then) but the
     build that was live when he found the masking bug */
  if (preFlags2) {
    check(/if \(liveRed && !hereHit\)/.test(preFlags2),
      'pre-fix CONTROL: the strip only ever listed a pupil whose row pill belonged to another lesson, so Orla was missed');
  } else {
    check(false, 'could not read the round-3 pre-fix commit - that control cannot run');
  }
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

  section('L2. LIVE: no silent wait when the lesson is changed (rule 42, his 8 Aug finding)');
  /* A lesson's content and answer key are fetched once and cached, so ONLY the
     first visit to a lesson is slow - which is exactly what he saw. Read the DOM
     synchronously, in the same tick as the change event, i.e. before any fetch
     could possibly have resolved: whatever is on screen at that instant is what
     he stares at during the wait. */
  const instant = await page.evaluate(() => {
    const sel = document.querySelector('#live-lesson-sel');
    sel.value = '2';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const body = document.getElementById('staff-body');
    return {
      busy: !!body.querySelector('.panel-loading'),
      busyText: (body.querySelector('.panel-loading') || {}).textContent || '',
      pickerStillThere: !!body.querySelector('#live-lesson-sel'),
      pickerShows: body.querySelector('#live-lesson-sel') ? body.querySelector('#live-lesson-sel').value : ''
    };
  });
  check(instant.busy, 'the moment the lesson changes, the screen says it is loading');
  check(/Lesson 2/.test(instant.busyText), 'and names the lesson it is loading: "' + instant.busyText.trim() + '"');
  check(instant.pickerStillThere && instant.pickerShows === '2',
    'the picker stays on screen showing the newly chosen lesson, so nothing jumps');
  await sleep(1800);
  const afterBusy = await readTab(page);
  check(/Lesson 2/.test(afterBusy.resultsHeading), 'and the real Lesson 2 view then replaces it');
  await pick(page, '3');

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

  /* ============================================================
     ROUND 2 (DFM 157/159) - the flags explain themselves, the pupil's own
     voice gets its own flag, the baseline becomes readable, the CSV stops
     speaking in codes.
     ============================================================ */
  section('Q. THE RED FLAG NAMES ITS OWN CAUSE (DFM 157b)');
  await openLive(page, { l3On: false });
  let q = await readTab(page);          // opens on Lesson 2
  /* re-staged 9 Aug: the exit trigger is now under-half-right, his ruling
     (DFM 162b). Jarlath answered one wrongly and skipped one; Sinead got both
     wrong - 0 of 2 under either rule, said in the new words. */
  check(/Under half her exit answers were right \(0 of 2\)/.test(q.flagTitles['Jarlath Gartland'] || ''),
    'plural exit wording, with the real count: "' + q.flagTitles['Jarlath Gartland'] + '"');
  check(/Under half her exit answers were right \(0 of 2\)/.test(q.flagTitles['Sinead Boyle'] || ''),
    'and the same for a pupil whose only trigger is the exit check');
  check(/nothing new has been saved for over 20 minutes/.test(q.flagTitles['Orla Devine'] || ''),
    'the no-activity trigger says so plainly: "' + q.flagTitles['Orla Devine'] + '"');
  check(q.flagTitles['Ciara Small'] == null,
    're-staged (DFM 162a): a pupil stuck only in ANOTHER lesson now has no pill in this table at all');
  check(q.stripTitles.some(t2 => /Under half her warm-up answers were right \(1 of 9\)/.test(t2 || '')),
    'her reason lives on the strip’s own lesson button, with its real numbers: "' + q.stripTitles[0] + '"');
  check(q.stripTitles.length === 2 && q.stripTitles.every(t2 => /Click to show this lesson\.$/.test(t2 || '')),
    'and every button on the line says what pressing it will do');
  check(/red <b>needs you<\/b> flag means one of three things/.test(q.legend) ||
        /needs you.*flag means one of three things/.test(q.legend),
    'the key under the table lists the three triggers');

  section('R. THE PUPIL’S OWN VOICE HAS ITS OWN FLAG (DFM 159)');
  check(/She pressed 'Not yet' on:/.test(q.voiceTitles['Jarlath Gartland'] || ''),
    'the amber flag names what she pressed: "' + q.voiceTitles['Jarlath Gartland'] + '"');
  check((q.voiceTitles['Jarlath Gartland'] || '').indexOf(String(L2_SE.statements[2]).slice(0, 30)) !== -1,
    'and quotes the REAL statement she marked Not yet, from the lesson content');
  check(/Her comment is in the last column\./.test(q.voiceTitles['Jarlath Gartland'] || ''),
    'and points at her comment, because she left one');
  check(!/felt tricky/.test(q.voiceTitles['Jarlath Gartland'] || ''),
    'and does NOT claim she found it tricky - she said "just right"');
  check(q.chips.some(c => /^1 says not yet$/.test(c)),
    'the count chip is singular for one pupil: ' + JSON.stringify(q.chips));
  check(q.voicePillCount === 1, 'exactly one amber flag on this lesson (' + q.voicePillCount + ')');
  check(!q.voiceTitles['Anya Murphy'], 'CONTROL: all ticks with a Tricky dot raises NO amber flag');
  check(!q.voiceTitles['Orla Devine'], 'CONTROL: all "Getting there" raises NO amber flag');
  check(!q.voiceTitles['Sinead Boyle'] && !!q.flagTitles['Sinead Boyle'],
    'CONTROL: a red-flagged pupil who rated herself all ticks gets red only');
  check(!!q.flagTitles['Jarlath Gartland'] && !!q.voiceTitles['Jarlath Gartland'],
    'and a pupil whose marks AND words both say so carries both flags');
  check(/amber <b>says not yet<\/b> flag is the pupil/.test(q.legend) || /says not yet.*pupil’s own voice/.test(q.legend),
    'the key explains the amber flag too');
  check(q.stripTitles.every(t => !/Not yet/.test(t || '')),
    'CONTROL: the cross-lesson strip stays red-only - no voice entries in the emergency line');
  /* count REAL text lines: the cell's own padding is not a line (the first
     version of this check counted it as one and reported four for three) */
  const nameLines = await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('#staff-body .dash-table tr'))
      .find(x => (x.textContent || '').indexOf('Jarlath Gartland') !== -1);
    const td = tr.querySelector('td');
    const cs = getComputedStyle(td);
    const inner = td.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return Math.round(inner / parseFloat(cs.lineHeight));
  });
  check(nameLines <= 2, 'her name and BOTH flags fit in two lines, never a stack (' + nameLines + ')');

  section('S. REFRESH SAYS WHAT IT DOES (DFM 157e)');
  check(/Re-reads this tab/.test(q.refreshTitle) && /except the Pairing panel/.test(q.refreshTitle),
    'Refresh carries his hover explanation: "' + q.refreshTitle + '"');

  section('T. THE LICENCE EXAM IS READABLE AT LAST (DFM 157d)');
  check(!q.baseline, 'CONTROL: no Licence Exam panel on Lesson 2');
  await pick(page, '1');
  const t1b = await readTab(page);
  check(!!t1b.baseline, 'the panel is there on Lesson 1');
  check(t1b.baseline.blocks === L1_EXAM.length,
    'one block per baseline question (' + (t1b.baseline ? t1b.baseline.blocks : 0) + ' of ' + L1_EXAM.length + ')');
  check(/^Q1 — /.test(t1b.baseline.firstTitle), 'numbered, with the real stem: "' + t1b.baseline.firstTitle.slice(0, 60) + '"');
  check(t1b.baseline.firstTitle.indexOf(String(L1_EXAM[0].stem).slice(0, 30)) !== -1,
    'and that stem comes from the lesson content');
  check(t1b.baseline.correctLabels === L1_EXAM.length, 'every question names its correct answer (DFM 106)');
  check(/answered nothing: 1/.test(t1b.baseline.text), 'a question answered with nothing is counted on its own line');
  const expWrong = 'Right 14 of 16. Wrong: Q3, Q7';
  check((t1b.baselineTitles['Anya Murphy'] || '').indexOf(expWrong) === 0,
    'the Baseline score hover names exactly her wrong questions: "' + t1b.baselineTitles['Anya Murphy'] + '"');
  check(/Wrong: Q2 /.test(t1b.baselineTitles['Orla Devine'] || ''),
    'a question she answered with nothing counts as not right: "' + t1b.baselineTitles['Orla Devine'] + '"');
  check(!t1b.baselineTitles['Ciara Small'], 'CONTROL: no hover for a pupil who has not sat the exam');
  await pick(page, '3');
  const t3b = await readTab(page);
  check(!t3b.baseline, 'CONTROL: no Licence Exam panel on Lesson 3 either');

  section('U. THE CSV STOPS SPEAKING IN CODES (DFM 157f)');
  await pick(page, '2');
  const csv = await page.evaluate(async () => {
    window.__csv = null;
    const real = window.App.copyText;
    window.App.copyText = (t) => { window.__csv = t; };
    document.querySelector('[data-action="live-csv"]').click();
    await new Promise(r => setTimeout(r, 1500));
    window.App.copyText = real;
    return window.__csv;
  });
  check(!!csv, 'Copy CSV produced a sheet');
  const head = (csv || '').split('\n')[0];
  check(/"Name","Email","Codename","XP","Baseline"/.test(head), 'it starts with the pupil columns and Baseline');
  check(/"L2 build puzzle"/.test(head), 'a lesson with a build puzzle gets that column');
  check(!/"L1 build puzzle"/.test(head), 'CONTROL: a lesson without one does not');
  check(/"L2 how did it go","L2 how it felt","L2 comment"/.test(head),
    'and the self-rating columns are named in words, not "self-eval"');
  const jarlathRow = (csv || '').split('\n').filter(l => /Jarlath/.test(l))[0] || '';
  check(/"done"/.test(jarlathRow) && /"0\/2"/.test(jarlathRow), 'his row carries progress and exit score');
  check(/"right"/.test(jarlathRow), 'and his build puzzle in words');
  check(/"✓ ≈ ✗"/.test(jarlathRow), 'his ratings render as the table’s own marks');
  check(/"Just right"/.test(jarlathRow), 'and how the hour felt, in words');
  const orlaRow = (csv || '').split('\n').filter(l => /Orla/.test(l))[0] || '';
  check(/"started"/.test(orlaRow), 'a started lesson says "started"');
  check(!/"none"/.test(csv || ''), 'the word "none" is retired from the export too');
  check(!/\|/.test(csv || ''), 'CONTROL: not one raw pipe-code (like 200|2) survives anywhere in the sheet');

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL LIVE-TAB CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
