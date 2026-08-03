/* qa-guide.js - the 1 Aug 2026 polish batch, pinned.
 *
 * Covers DFM 103-109, 114 and 116: the Guide tab and its HoD-only section, the
 * walkthrough video, the ghost-click guard, card text selection, the
 * misconception panel's correct row, the honest Copy, the Lessons tab's
 * visibility fixes, and the REAL cause of the missing "Not taught" pill (found
 * while filming: doToggle updated the cell's text and never rebuilt its chips).
 *
 *   node qa-guide.js            both halves
 *   node qa-guide.js --static   source/asset checks only (no browser needed)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const P = f => path.join(ROOT, 'ks3-dt/platform', f);
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=8A-DT&as=teacher';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

const staff = fs.readFileSync(P('staff.js'), 'utf8');
const app = fs.readFileSync(P('app.js'), 'utf8');
const engines = fs.readFileSync(P('engines.js'), 'utf8');
const css = fs.readFileSync(P('style.css'), 'utf8');
const server = fs.readFileSync(P('server/Code.gs.template'), 'utf8');
const dev = fs.readFileSync(P('dev-server.js'), 'utf8');

function staticHalf() {
  section('A. GUIDE TAB (DFM 116) - it exists, and it tells the truth');
  check(/\{ id: 'guide', label: 'Guide' \}/.test(staff), 'Guide is a real tab in the staff panel');
  check(/curTab === 'guide'/.test(staff) && /function renderGuide\b/.test(staff), 'and it has a renderer wired to the tab');
  check(/Lessons tab &rarr; Brief/.test(staff), 'it points teaching questions back at the lesson Brief (briefs stayed text - his ruling)');

  /* Every number the Guide states is enforced somewhere in the code. If one of
     these constants ever changes, this harness fails and the WORDING must be
     fixed - that is the point of pinning them together (rule 17). */
  section('B. THE GUIDE\'S FACTUAL CLAIMS vs the code that enforces them');
  /* The Guide's copy is one long concatenated string literal, so sentences run
     across '+' joins and quote boundaries. Flatten first, then match - checking
     the raw source would pass or fail on where the lines happen to wrap. */
  const staffFlat = staff.replace(/'\s*\+\s*\n?\s*'/g, '').replace(/\s+/g, ' ');
  check(/fifteen minutes/.test(staffFlat) && /IDLE_LOCK_MS = 900000/.test(staff),
    'Guide says fifteen minutes; the idle lock really is 900000ms');
  check(/turns red once it passes 70% full/.test(staffFlat) && /pct >= 70/.test(staff),
    'Guide says 70%; storeHealthHtml really warns at 70');
  check(/chat transcripts older than a week/.test(staffFlat) && /CHAT_ARCHIVE_AFTER_DAYS = 7/.test(server),
    'Guide says chats sweep after a week; the server really uses 7 days');
  check(/finished more than four weeks ago/.test(staffFlat) && /ARCHIVE_AFTER_DAYS = 28/.test(server),
    'Guide says detail sweeps after four weeks; the server really uses 28 days');
  check(/after five school days/.test(staffFlat) && /absDays\s*\|\|\s*5|absDays: 5|num_\(cfg\.absDays\) \|\| 5|Number\(cfg\.absDays\) : 5/.test(staff + server + dev),
    'Guide says five school days; five is really the default absence window');
  check(/out of sixteen/.test(staffFlat), 'Guide says the baseline is out of sixteen');
  check(/every night between 2 and 3am/.test(staffFlat) && /2am-3am|2am to 3am/.test(server),
    'Guide says 2-3am; that is what setupArchive tells you to schedule');
  check(/only the Head of Department&rsquo;s account can complete it/.test(staffFlat),
    'Guide is honest that only the owner account can finish an archive sweep');

  section('C. THE HoD-ONLY SECTION (DFM 118) - gated on the server, not the client');
  check(/isHod_\(me\)/.test(server) && /isHod: hodExtras.isHod/.test(server),
    'the server decides isHod and sends it with the class register');
  check(/archiveSheetUrl_/.test(server) && /hodExtras\.archiveUrl/.test(server),
    'and the archive Sheet link is only built for a HoD');
  check(/function guideHodHtml/.test(staff) && /isHod \? guideHodHtml/.test(staff),
    'the client renders the HoD block only when that flag is set');
  check(/Training-day presentation/.test(staff) && /nothing here yet/.test(staff),
    'the training-day presentation slot is present and honestly labelled empty');

  section('D. THE WALKTHROUGH VIDEO - it exists and the stated length is true');
  const vid = P('assets/video/guide/guide-tour.mp4');
  const chapters = P('assets/video/guide/chapters.json');
  check(fs.existsSync(vid), 'the video file is in the repo where the Guide points');
  check(fs.existsSync(chapters), 'and its chapter manifest is beside it');
  if (fs.existsSync(chapters)) {
    const man = JSON.parse(fs.readFileSync(chapters, 'utf8'));
    const mins = man.durationSec / 60;
    /* the stated length is written once, in GUIDE_LENGTH, and must match the
       finished file - a re-cut that changes the running time fails here */
    const stated = (staff.match(/var GUIDE_LENGTH = '([^']+)'/) || [])[1] || '';
    const words = { 'about eight minutes': [7.5, 8.5], 'about ten and a half minutes': [10.0, 11.0],
                    'seven and a half minutes': [7.0, 8.0], 'about ten minutes': [9.5, 10.5],
                    'about eleven minutes': [10.5, 11.5], 'about nine minutes': [8.5, 9.5] }[stated];
    check(!!words && mins >= words[0] && mins <= words[1],
      'the Guide says "' + stated + '" and the film really is ' + man.durationSec + 's');
    const labels = man.chapters.map(c => c.label).join(',');
    check(/Classes/.test(labels) && /Lessons/.test(labels) && /Live/.test(labels) && /Absence/.test(labels) &&
          /Teams/.test(labels) && /Options/.test(labels) && /Cover/.test(labels),
      'every tab named in the Guide\'s chapter list is really a chapter');
    check(!/Guide/.test(labels), 'the Guide chapter is gone - the viewer is already on that tab (DFM 121e)');
  }
  check(/GUIDE_VIDEO = 'assets\/video\/guide\/guide-tour\.mp4'/.test(staff), 'the Guide points at that exact file');

  section('D2. ROUND-2 CONTENT (DFM 121/122) - communicative register + the answers he asked for');
  const flat = staffFlat;
  check(/There are four choices you can make for each of your classes/.test(flat),
    'Options opens with his own sentence, not "four choices per class, one Save"');
  check(/it is not something you set per lesson/.test(flat),
    'the Guide says the leaderboard is not a per-lesson setting');
  check(/switch it on for the fortnight/.test(flat),
    'and gives a worked example of when to use the public board');
  check(/How did it go\?/.test(flat) && /comes to you and nobody else/.test(flat),
    'the end-of-lesson evaluations are explained (DFM 121g)');
  check(/quiet pupils often say there what they would not say in the room/.test(flat),
    'including why they matter');
  check(/Print this sheet/.test(flat) && /Save as PDF for a copy you can send digitally/.test(flat),
    'the Cover sheet says it can be printed or saved as a PDF (DFM 121d)');
  check(/opens the sheet in its own tab/.test(flat) && /panel behind it is left exactly as it was/.test(flat),
    'and the Guide describes what printing REALLY does now (own tab, panel untouched)');
  check(/pair scores with pupils&rsquo; full names/.test(flat),
    'the tournament list is described with FULL names, matching what the projector prints (DFM 124b)');
  check(/listed by her first name, so no two rows ever look the same/.test(flat),
    'and the no-codename-yet case is documented (DFM 124a)');

  section('D3. THE OPTIONS TAB ITSELF (DFM 121c)');
  check(/These options apply to the class you have selected on the Classes tab/.test(flat),
    'the Options pane says WHICH class it is changing');
  check(/one setting for the whole class, all year &mdash; not per lesson/.test(flat),
    'and that it is not per lesson');
  check(/a ranked class board appears at the top of every pupil&rsquo;s home page/.test(flat),
    'the Public radio says what actually happens');
  check(/full names appears on the projector/.test(flat),
    'the tournament radio promises full names (what the code really does)');

  section('D4. DEFECTS FOUND BY DRIVING IT (DFM 121b, 124a)');
  check(/color:var\(--ink\)/.test(staff) && !/color:var\(--text\)/.test(staff),
    'the Teams name-chip menu uses a colour that exists (it was var(--text), undefined)');
  check(/DFM 124a/.test(server) && /!str_\(r\.cn\)/.test(server),
    'the public board falls back to a first name when a pupil has no codename yet');
  check(/DFM 124a/.test(dev), 'and the preview mirrors it');

  section('D5. COVER PRINTING (his v9 finding: the app went blank behind the print box)');
  check(!/global\.print\(\)/.test(staff),
    'the app NEVER prints its own document any more - that is what Safari tore down');
  check(/COVER_PRINT_CSS/.test(staff) && /win\.document\.write/.test(staff),
    'the sheet is rebuilt as a standalone page in its own tab');
  check(/function printStandalone/.test(staff) &&
        /printStandalone\(q\('\.cover-sheet'\)/.test(staff) &&
        /DT teacher brief/.test(staff),
    'the teacher brief prints through the SAME fixed path (it had the identical fault)');
  check(/toDataURL\('image\/png'\)/.test(staff),
    'and the QR canvas is carried across as an image (a cloned canvas is blank)');
  check(/Your browser blocked the new tab/.test(staff),
    'with an honest message if the browser blocks the pop-up');

  section('E. GHOST-CLICK GUARD EVERYWHERE (DFM 104)');
  check(/App\.GHOST_MS = 350/.test(app) && /App\.armButton = function/.test(app), 'one helper, 350ms, in app.js');
  const armCount = (engines.match(/App\.armButton\(/g) || []).length;
  check(armCount >= 8, 'engines.js arms at least 8 controls (found ' + armCount + ')');
  /* 3 Aug 2026: this pinned introCard's exact source line, so it broke the moment
     the CTA had to be selected by class (the ladder intro now carries a film
     re-watch button, and "the first button in the card" armed the wrong one).
     It asserts the RULE instead, plus the reason for the selector - arming the
     first button again would leave a real CTA dead. */
  check(/App\.armButton\(c\.querySelector\('button\.primary-btn'\), function \(\) \{ host\.innerHTML/.test(engines),
    'every intro card is guarded, and it arms the CTA by class (introCard itself)');
  check(!/App\.armButton\(c\.querySelector\('button'\)/.test(engines),
    'introCard never arms merely "the first button" - `extra` can contain buttons of its own');
  check(/DFM 104: this is the confirm Damien watched/.test(engines), 'the steps confirm he reported is guarded');
  check(/re-arm on every stop/.test(engines), 'the tour Next re-arms per stop rather than guarding once');
  check((app.match(/App\.armButton\(/g) || []).length >= 4, 'the badge pop, finish and clearance pops are guarded too');
  check(/\{ repeat: true \}/.test(engines), 'the practice-typing check can still be pressed more than once');

  section('F. CARD TEXT DOES NOT SELECT (DFM 105)');
  check(/\.card, \.vault-stage, \.tour-stage, \.badge-pop-card, \.lock-cell \{[\s\S]{0,120}user-select: none/.test(css),
    'selection is suppressed on lesson cards');
  check(/\.se-comment, \.chat-input, \.case-log-input, \.text-input, \.copy-area \{[\s\S]{0,120}user-select: text/.test(css),
    'and switched back on for every box a pupil types in');

  section('G. MISCONCEPTION PANEL NAMES THE ANSWER (DFM 106)');
  check(/\(the correct answer\)/.test(staff), 'the correct row is labelled "(the correct answer)"');
  check(/optText\[oi\]/.test(staff), 'and it shows the option TEXT, not "Option A"');

  section('H. COPY CANNOT LIE (DFM 107)');
  check(/execCommand\('copy'\)/.test(app) && app.indexOf("execCommand('copy')") < app.indexOf('App.copyBox('),
    'execCommand runs FIRST, because it reports whether the copy happened');
  check(/App\.copyBox = function/.test(app) && /already selected/.test(app),
    'and a failed copy shows the text selected instead of claiming success');
  check(!/navigator\.clipboard\.writeText\(text\)\.then\(done/.test(app),
    'the unverifiable promise no longer reports success on its own');

  section('I. LESSONS TAB VISIBILITY (DFM 108)');
  check(/setPane\('<p class="staff-status" id="lock-status"><\/p>' \+\s*'<div class="lock-grid">/.test(staff),
    'the status line renders ABOVE the 18-cell grid, not below it');
  check(/App\.toast\(lockNotice/.test(staff), 'and the confirmation also rides on a toast that cannot scroll off');
  check(/lock it again, then tap <b>&#8634; Not taught<\/b>/.test(staff),
    'the footer says the pill only appears once the lesson is locked again');

  section('J. THE MISSING PILL - REAL CAUSE (DFM 114)');
  check(/THE REAL CAUSE OF DFM 114/.test(staff), 'the cause is recorded where the bug was');
  check(/loadManifestForActiveClass\(\)\.then\(function \(man\) \{ if \(man\) renderLockGrid\(man\); \}\);/.test(staff),
    'doToggle now REBUILDS the cell, so delivered-gated chips appear at once');

  section('K. VAULT OWN CALL SIGN (DFM 103)');
  check(/your secret identity codename is/.test(engines), 'the pupil is told her own codename, in his words');
  check(/\.vault-me \{/.test(css), 'and it has a style of its own, above the banner');

  section('L. CONTENT EDITS (DFM 109 + the Guide hand-off)');
  const lesson = JSON.parse(fs.readFileSync(path.join(process.env.HOME,
    'Desktop/Claude Work/KS3 DT Platform/content-src/j1/lessons/j1-01.json'), 'utf8'));
  const idx = JSON.parse(fs.readFileSync(path.join(process.env.HOME,
    'Desktop/Claude Work/KS3 DT Platform/content-src/index.json'), 'utf8'));
  const rth = lesson.teacherBrief.runningTheHour;
  const bookmark = rth.filter(e => /Bookmark the class link/.test(e.part))[0];
  check(!!bookmark && !bookmark.img && !bookmark.imgCap, 'the 18-bookmark image slot is gone');
  check(!!bookmark && /press the star/i.test(bookmark.text), 'but the bookmarking advice itself stays');
  check(!/18-bookmark/.test(JSON.stringify(lesson)), 'and nothing else still references that picture');
  const pairEntry = rth.filter(e => /pairing panel/i.test(e.part))[0];
  check(!!pairEntry && /Guide tab/.test(pairEntry.text), 'the pairing-panel entry now points at the Guide tab');
  check(!!pairEntry && !!pairEntry.img && !!pairEntry.say, 'while keeping its picture and its say-line');
  /* re-pinned per batch on purpose: an exact pin is what catches a repack
     that never happened. 2 Aug 2026 = the L2-L5 batch. */
  /* This used to pin one literal version string, so it failed on every later
     content release and told us nothing (3 Aug 2026). What actually matters is
     that the version MOVED PAST the release this harness was written for - the
     live app refetches content on a version change, so a stale version is the
     real defect. Dates sort lexically in this yyyy-mm-dd[letter] format. */
  check(typeof idx.contentVersion === 'string' && idx.contentVersion >= '2026-08-02c',
    'contentVersion is at or past 2026-08-02c (is ' + idx.contentVersion + ')');

  section('M. STAFF PANEL SAYS "PUPIL" (rule 26)');
  check(/the moment the first pupil arrives/.test(staff), 'the pairing panel\'s empty state says pupil');
  check(/' pupil' \+ \(Number\(r\.freed\) === 1/.test(staff), 'and so does the release message');
}

async function browserHalf() {
  const { chromium } = require('./node_modules/playwright');
  const { stageInPage, PUPILS } = require('./lib/stage-guide');
  section('N. BROWSER - the Guide renders, the gate holds, the pill returns');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pa = await ctx.newPage();
  const errs = [];
  pa.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  pa.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

  async function openPanel(hod) {
    await pa.addInitScript(({ fn, o }) => { new Function('opts', '(' + fn + ')(opts)')(o); },
      { fn: stageInPage.toString(), o: { pupils: PUPILS, hod: hod } });
    await pa.goto(BASE, { waitUntil: 'domcontentloaded' });
    await sleep(2300);
    await pa.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
    await sleep(700);
    await pa.evaluate(() => { Array.from(document.querySelectorAll('button,a')).find(e => /staff/i.test(e.textContent || '')).click(); });
    await sleep(900);
    await pa.evaluate(() => {
      const i = document.querySelector('#staff-body input');
      i.value = 'demo'; i.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#staff-body button').click();
    });
    await sleep(2200);
    await pa.evaluate(() => { const b = document.querySelector('[data-action="select-class"]'); if (b) b.click(); });
    await sleep(1200);
  }
  const goTab = async t => { await pa.evaluate(x => document.querySelector('.staff-tab[data-tab="' + x + '"]').click(), t); await sleep(1900); };

  await openPanel(false);
  await goTab('guide');
  const asTeacher = await pa.evaluate(() => {
    const p = document.querySelector('#staff-pane');
    return { hod: !!p.querySelector('.guide-hod'), video: !!p.querySelector('video.guide-video'),
             heads: p.querySelectorAll('.guide-ref h4').length, chars: p.textContent.length };
  });
  check(asTeacher.video, 'the Guide renders its video player');
  /* the copy promises you can jump to a tab, so the chapter names must really
     seek - a list of words would make that sentence untrue (rule 35) */
  const chips = await pa.evaluate(() => Array.from(document.querySelectorAll('.guide-chip'))
    .map(c => c.textContent + ':' + c.getAttribute('data-t')));
  /* seven, not eight: the Guide chapter was cut (DFM 121e) and "Opening" is
     deliberately not offered as a jump target */
  check(chips.length === 7, 'the seven chapter names are real seek buttons (' + chips.length + ')');
  check(!chips.some(c => /^Guide:/.test(c)), 'and there is no Guide chip, matching the re-cut film');
  if (chips.length) {
    await pa.evaluate(() => {
      const c = Array.from(document.querySelectorAll('.guide-chip')).filter(x => /Live/.test(x.textContent))[0];
      if (c) c.click();
    });
    await sleep(1400);
    const at = await pa.evaluate(() => Math.round(document.getElementById('guide-video').currentTime));
    check(at > 100, 'pressing "Live" really jumps the film to that chapter (t=' + at + 's)');
  }
  check(asTeacher.heads >= 12, 'and every tab + "worth knowing" heading (' + asTeacher.heads + ')');
  check(!asTeacher.hod, 'an ordinary teacher does NOT see the Head of Department section');

  await openPanel(true);
  await goTab('guide');
  const asHod = await pa.evaluate(() => {
    const h = document.querySelector('#staff-pane .guide-hod');
    return { present: !!h, link: h ? ((h.querySelector('a') || {}).href || '') : '' };
  });
  check(asHod.present, 'a Head of Department does see it');
  check(/spreadsheets\/d\//.test(asHod.link), 'and it carries the archive spreadsheet link');

  /* DFM 114, the regression that started all this: unlock, lock, and the pill
     must be there WITHOUT any tab switch or reload. */
  await goTab('lessons');
  const cell = await pa.evaluate(() => {
    const c = document.querySelector('.lock-cell[data-num="2"]');
    const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + 22 };
  });
  await pa.mouse.click(cell.x, cell.y); await sleep(2000);
  await pa.mouse.click(cell.x, cell.y); await sleep(1400);
  await pa.evaluate(() => document.getElementById('confirm-ok').click());
  await sleep(2400);
  const after = await pa.evaluate(() => {
    const c = document.querySelector('.lock-cell[data-num="2"]');
    return { state: c.querySelector('.lc-state').textContent,
             pill: !!c.querySelector('.lc-undo'), reset: !!c.querySelector('.lc-reset') };
  });
  check(/Locked \(delivered/.test(after.state), 'locking a just-unlocked lesson leaves it locked-and-delivered');
  check(after.pill, 'the "Not taught" pill is on the cell IMMEDIATELY, with no reload (DFM 114)');
  check(after.reset, 'and so is "Start again", which was missing for the same reason');

  /* the status line must be above the grid, i.e. visible without scrolling */
  const pos = await pa.evaluate(() => {
    const s = document.querySelector('#lock-status'), g = document.querySelector('.lock-grid');
    if (!s || !g) return null;
    return { statusTop: s.getBoundingClientRect().top, gridTop: g.getBoundingClientRect().top };
  });
  check(pos && pos.statusTop <= pos.gridTop, 'the Lessons status line sits above the grid (DFM 108)');

  check(errs.length === 0, 'no console errors anywhere in the run' + (errs.length ? ': ' + errs[0] : ''));
  await browser.close();
}

(async () => {
  staticHalf();
  if (process.argv.indexOf('--static') === -1) {
    try { await browserHalf(); }
    catch (e) { check(false, 'browser half threw: ' + e.message); }
  }
  console.log('\n=========================================');
  console.log('CHECKS RUN: ' + (PASS + FAILS.length) + '   PASSED: ' + PASS + '   FAILED: ' + FAILS.length);
  if (FAILS.length) { FAILS.forEach(f => console.log('  FAILED: ' + f)); console.log('GUIDE CHECKS FAILED'); process.exit(1); }
  console.log('ALL GUIDE CHECKS PASSED');
})();
