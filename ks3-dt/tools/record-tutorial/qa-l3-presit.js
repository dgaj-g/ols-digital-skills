/* qa-l3-presit.js — pins every fix in L3_PRESIT_SPEC.md (Fable's 9 Aug pre-sit
   review of Lesson 3, executed by Opus 5 High).

   The faults it guards against, in one line each:
     - rungs 2/3 never said to download again, so a pupil's edited code ran the
       OLD program on the micro:bit and looked broken (DFM 35);
     - rung 1's "the display goes dark" was false on the real device and its
       film claim pointed at a routine the L3 film never shows;
     - nothing told her to start a NEW MakeCode project called scoreboard, while
       Lesson 2 had taught "you never start a new one" (DFM 152c);
     - exit item ex3-1's keyed answer could not physically produce its scenario;
     - "the DEVICE is the judge" (DFM 138.1.5), in L3 and the reported L2 lines;
     - the rung buttons had no ghost-click guard, so one double-click cleared
       TWO rungs (DFM 104), and the film button stacked two modals;
     - a catch-up pupil was told to "follow the five rules" above three of them
       and to send in "our" score with no partner in the room.

   Every section carries a CONTROL: the pre-fix text or the pre-fix wiring is
   run against the same assertion and must FAIL, so a green run means the guard
   is really watching (DFM 146b/150).

   Needs the digital-skills-l4 server on :8096.  Usage: node qa-l3-presit.js */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const URL = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const PACKED = path.join(__dirname, '../../content');
const BUILT = path.join(__dirname, '../../platform/server/PathB_Index.html');
const ENGINES = path.join(__dirname, '../../platform/engines.js');
const APPJS = path.join(__dirname, '../../platform/app.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };
/* a control asserts the OPPOSITE: the pre-fix input must fail the same test */
const control = (failed, m) => { console.log((failed ? '  PASS ' : '  FAIL ') + 'CONTROL: ' + m); if (!failed) FAILS.push('CONTROL ' + m); };

/* ---- the pre-fix strings, kept verbatim so the controls are honest ---- */
const PRE = {
  s1test: "Copy it onto the micro:bit the same way as last lesson (Download, then drag the file across — the film button below replays it). Before you press anything, look at the display: it already reads 0. Nobody triggered that — the forever loop started on its own the second the micro:bit powered up, and it redraws the score over and over. Now press A five times: it says 1 every single time, because 'set' FORCES that value into the box. Last job — prove the loop is doing the showing: drag 'show number score' back OUT of forever and drop it on empty canvas. The display goes dark and STAYS dark, even when you press A. Put it back.",
  s2test: "Press A three times. Does the number climb by exactly one per press — 1, 2, 3? Notice you never touched the display code: the forever loop redraws the new total the instant it changes.",
  s3test: "THE MULTI-ROUND TEST: press B (it says 0), press A three times (it says 3), press B (back to 0). Now run that whole cycle three times over.",
  s2hint: "'change score by 1' ADDS one to whatever is in the box. If your number is stuck at 1, the old 'set score to 1' block is still in there — swap it out, don't stack them. Leave the forever loop exactly as it is.",
  ex31stem: "In the Rally, a pair press button A five times — clean catches — but their scoreboard ends on 3. What's the MOST likely cause?",
  ex31opt1: "The 'change score by 1' block isn't sitting inside 'on button A pressed' properly"
};
/* the download-again instruction, however it is phrased */
const DOWNLOAD_AGAIN = /download (it|and drag)[^.]*again|again and drag|drag the new file across/i;
/* the 596465f-era rung 2 test (pre guided-build): its dark proof lived on rung 1 */
const PRE_GB_S2TEST = "Download it again and drag the new file across — your micro:bit keeps running the OLD program until a new file lands on it. Then press A three times. Does the number climb by exactly one per press — 1, 2, 3? Notice you never touched the display code: the forever loop redraws the new total the instant it changes. It also keeps counting up from whatever it showed before. Annoying? Good — a fresh-start button is exactly what Rung 3 builds.";

(async () => {
  /* ================= 1. CONTENT: source AND packed must both carry it ====== */
  console.log('== 1. the lesson content (source and packed) ==');
  const readL = (root, f) => JSON.parse(fs.readFileSync(path.join(root, 'j1/lessons/' + f), 'utf8'));
  const srcL3 = readL(SRC, 'j1-03.json'), packL3 = readL(PACKED, 'j1-03.json');
  const srcL2 = readL(SRC, 'j1-02.json'), packL2 = readL(PACKED, 'j1-02.json');

  for (const [label, L3] of [['source', srcL3], ['packed', packL3]]) {
    const lad = L3.chunks.find(c => c.id === 'ladder').config;
    const r = id => lad.rungs.find(x => x.id === id);
    /* DFM 171 moved every sequence out of `target`/`test` prose and into real
       arrays (steps / testSteps), so these assertions read the rung's WHOLE
       pupil-facing text rather than one field. What is being checked is that the
       teaching is present - not which key happens to hold it. */
    const rtxt = id => {
      const x = r(id) || {};
      return [x.target, x.stepsLead, (x.steps || []).join(' '), x.note,
              x.testLead, (x.testSteps || []).join(' '), x.test].filter(Boolean).join(' ');
    };
    const stxt = () => {
      const x = lad.stretch || {};
      return [x.target, x.stepsLead, (x.steps || []).join(' '), x.note,
              x.testLead, (x.testSteps || []).join(' '), x.test].filter(Boolean).join(' ');
    };

    // A1 the set-up list
    check(Array.isArray(lad.setup) && lad.setup.length === 5, label + ': the ladder carries a 5-step MakeCode set-up list');
    check(/Welcome box/.test(lad.setup.join(' ')) && /✕|close it/.test(lad.setup.join(' ')),
      label + ': the set-up list teaches closing the Welcome box (DFM 169)');
    check(/Before rung 1/.test(String(lad.setupLead || '')), label + ': the set-up list has its own lead line');
    /* DFM 181, his 10 Aug sit: "I don't remember lesson 2 having this name, can
       you double check this?" Checked - and Lesson 2 names that project TWO
       ways: its set-up card tells her to type "Signal Relay", while its film is
       a build-along that types "make-it-move" on camera. Whichever she
       followed, the other name is wrong for her, so Lesson 3 must not brand-name
       it at all. It says "last lesson's project", which is true either way.
       This check used to REQUIRE the disputed name - a harness that pins a name
       nobody verified just preserves the argument. */
    check(/scoreboard/.test(lad.setup.join(' ')) && /last lesson's project/i.test(lad.setup.join(' ')),
      label + ": the set-up list names the NEW project (scoreboard) and refers to the old one as \"last lesson's project\"");
    check(!/Signal Relay|make-it-move/i.test(lad.setup.join(' ')),
      label + ': and it brand-names neither of the two names Lesson 2 gives that project (DFM 181)');
    check(/New Project/i.test(lad.setup.join(' ')), label + ': it says to click New Project');

    // A2 the banned generic noun
    check(/micro:bit is the judge/.test(lad.intro) && !/DEVICE is the judge/.test(lad.intro),
      label + ': the ladder intro says the micro:bit is the judge, never "the DEVICE"');
    check(/micro:bit is the judge/.test(lad.introSolo) && !/DEVICE is the judge/.test(lad.introSolo),
      label + ': the solo intro says it too');
    check(!/DEVICE is the judge/.test(JSON.stringify(L3)), label + ': "DEVICE is the judge" is gone from the whole lesson');

    // The guided-build re-cut (DFM 168): rung 1 = variable + the loop showing it
    check(/Watch your simulator/i.test(rtxt('s1')), label + ': rung 1 starts at the simulator reading 0');
    check(!/the film button below replays it/.test(rtxt('s1')),
      label + ': rung 1 never claims the film replays the copy-across routine');
    check(/press Download in MakeCode, then drag the file across/.test(rtxt('s1')),
      label + ': rung 1 spells the copy-across steps out itself');
    check(!/button A|set score/i.test(rtxt('s1')),
      label + ': rung 1 no longer builds the button event — that is rung 2\'s part of the film');

    // rung 2 = the event, set-vs-change, and the dark proof (moved here with its film part)
    check(/set score to 1/.test(rtxt('s2')) && /change score by 1/.test(rtxt('s2')),
      label + ': rung 2 builds the event and the set-to-change swap');
    check(DOWNLOAD_AGAIN.test(rtxt('s2')), label + ': rung 2 opens by telling her to download');
    check(DOWNLOAD_AGAIN.test(rtxt('s3')), label + ': rung 3 opens by telling her to download again');
    check(/OLD program/i.test(rtxt('s2')), label + ': rung 2 says why — the micro:bit keeps running the OLD program');
    check(/SIMULATOR/.test(rtxt('s2')) && /goes dark/.test(rtxt('s2')),
      label + ': rung 2 carries the break-it proof, on the SIMULATOR');
    check(/only changes when you download again/i.test(rtxt('s2')),
      label + ': and says a micro:bit only changes on a fresh download');
    check(/First check you downloaded again/i.test(r('s2').hint),
      label + ': rung 2\'s hint names the fresh download as the FIRST thing to check');
    check(/Part 2/.test(rtxt('s1')) && /Part 3/.test(rtxt('s2')),
      label + ': the rung targets point at their own film parts');

    // A6 help
    check(/simulator's display go dark/.test(lad.help), label + ': the ladder help names the simulator for the break-it step');

    // DFM 168: the standalone film chunk is GONE — the film lives on the ladder in parts
    check(!L3.chunks.find(c => c.id === 'howto'),
      label + ': the standalone film chunk is gone — the film is served in parts on the ladder');
    check(!!lad.introPart && /Part 1/.test(String(lad.introPart.label || '')),
      label + ': the ladder intro carries film Part 1');
    check(['s1', 's2', 's3'].every(function (id) { return r(id).part && /Part [234]/.test(r(id).part.label); }),
      label + ': every rung carries its own film part');
    /* THE BOUNDARY LAW, re-shaped for FILES (DFM 170). A part used to be a window
       into one long film (from/to seconds); it is now a file of its own, because
       a window still let a pupil scrub into the next rung's material. So the law
       becomes: every part file EXISTS, is the length of its own chapter, and the
       parts add up to the whole film. Same one-fact discipline (144), now proved
       against the media rather than against two numbers. */
    const chJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/l3/chapters.json'), 'utf8'));
    const chT = chJson.chapters.map(function (c) { return Number(c.t); });
    const VID = path.join(__dirname, '../../platform/assets/video/l3');
    const dur = function (f) {
      return Number(String(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
        'format=duration', '-of', 'csv=p=0', f])).trim());
    };
    const parts = [lad.introPart, r('s1').part, r('s2').part, r('s3').part];
    let partSum = 0;
    parts.forEach(function (p, i) {
      check(!!p.src && !/from|to/.test(Object.keys(p).join(' ')),
        label + ': part ' + (i + 1) + ' is served as its own FILE, not a window into the whole film');
      const f = path.join(__dirname, '../../platform', String(p.src || ''));
      const exists = fs.existsSync(f);
      check(exists, label + ': part ' + (i + 1) + ' file exists on disk (' + p.src + ')');
      if (!exists) return;
      const d = dur(f);
      partSum += d;
      const expected = ((i < 3) ? chT[i + 1] : Number(chJson.durationSec)) - chT[i];
      check(Math.abs(d - expected) <= 1.5,
        label + ': part ' + (i + 1) + ' is exactly its own section (' + d.toFixed(1) + 's vs chapter ' + expected + 's)');
      /* HIS ACTUAL COMPLAINT: every rung's scrubber read 8:44. A part must be a
         small fraction of the film, or a pupil can still stray out of it. */
      check(d < Number(chJson.durationSec) * 0.6,
        label + ': part ' + (i + 1) + '\'s scrubber cannot reach the rest of the film (' +
        d.toFixed(0) + 's of ' + chJson.durationSec + 's)');
    });
    check(Math.abs(partSum - Number(chJson.durationSec)) <= 2,
      label + ': the four parts add up to the whole film (' + partSum.toFixed(1) + 's vs ' + chJson.durationSec + 's) — no footage lost between rungs');
    check(fs.existsSync(path.join(VID, 'l3-tutorial.mp4')),
      label + ': the WHOLE film is still on disk for the re-watch button (DFM 143)');
    check(lad.film.chapters.every(function (c, i) { return Number(c.t) === chT[i]; }),
      label + ': the re-watch modal\'s chapter buttons match chapters.json too');
    check(Number(lad.film.defaultT) === chT[1], label + ': the film button still defaults to the make-the-variable chapter');

    // A8 the exit item
    const ex = L3.chunks.find(c => c.id === 'exit').config.items.find(i => i.id === 'ex3-1');
    check(/says 1 after every single press/.test(ex.stem), label + ': ex3-1 asks about a scoreboard stuck on 1');
    check(/'set score to 1' inside it instead of 'change score by 1'/.test(ex.options[1]),
      label + ': ex3-1 option 1 is the set-instead-of-change cause');
    /* the pack lifts every answer key out of the pupil-facing file, so the keys
       are asserted where they actually live - and the packed file is asserted
       to be free of them, which is the behaviour that keeps answers off her
       machine in the first place */
    if (label === 'source') {
      check(Number(L3.keys['ex3-1'].a) === 1, label + ': ex3-1 key still points at option index 1');
      check(L3.keys['ex3-1'].mis.length === 4 && L3.keys['ex3-1'].mis[0] === 'blame-the-hardware first' &&
        L3.keys['ex3-1'].mis[1] === null && L3.keys['ex3-1'].mis[3] === 'blame-the-player instead of checking the code',
        label + ': the four misconception labels are unchanged');
      /* the wording changed in the 9 Aug rework (DFM 173: "the classic
         set-instead-of-change" was adult shorthand); the FAULT it must name has
         not - so the assertion follows the meaning, not the old phrase. */
      check(/'set score to 1' is\s+still inside the event/.test(L3.keys['ex3-1'].explain) &&
            /adds one to what is already there/.test(L3.keys['ex3-1'].explain),
        label + ': the explanation names the real fault (set forces, change adds)');
    } else {
      check(!L3.keys, label + ': the packed lesson carries no answer keys at all (they stay server-side)');
    }

    // A9 the rig
    const rig = L3.chunks.find(c => c.id === 'rig').config;
    /* DFM 35, tightened by the rework: the card must name the button she can
       actually see, and Lesson 3's is now "Check my Drive" (cfg.checkLabel). The
       law is that the two AGREE - so read the label and look for it. */
    const rigBtn = rig.checkLabel || 'Run the HQ Inspection';
    check(rig.help.indexOf(rigBtn) !== -1, label + ': the rig help names the button as it appears on screen (' + rigBtn + ')');
    check(rig.failText.indexOf(rigBtn) !== -1, label + ': the rig failText names the same button');
    check(!/HQ Inspection/.test(rig.help + rig.failText + rig.intro),
      label + ': the old "HQ Inspection" wording is gone from Lesson 3 (it never matched the button)');
    check(rig.steps[2].title === 'Drag it in', label + ': the third rig step is titled "Drag it in"');
    check(!/insurance|kill your build/.test(rig.intro), label + ': the rig intro drops "insurance" and "kill your build"');

    // A10 the rally
    const rally = L3.chunks.find(c => c.id === 'rally').config;
    check(!/closer|on form/.test(rally.rules.join(' ')), label + ': the rally rules drop "closer"/"on form"');
    check(!/key it in|key exactly that number/.test(JSON.stringify(rally)), label + ': "key it in" is gone from the rally');
    /* DFM 185 re-stage: every pupil now sends in HER OWN two goes, so both help
        texts name one button - "Send in my scores" - and the old our/my split
        has nothing left to describe. */
    check(/Send in my scores/.test(rally.help), label + ': the rally help names the real button');
    check(/three rules/.test(String(rally.soloHelp || '')) && /Send in my scores/.test(String(rally.soloHelp || '')),
      label + ': the rally carries its own solo help, matching the solo screen');
    check(!/Catch-up mission/.test(rally.soloIntro), label + ': "Catch-up mission" is gone');

    // A11/A12
    /* "your verdicts arrive once the whole report is filed" was legal-metaphor
       register (DFM 173's family) and is now plain. Same promise, testable. */
    check(/find out how you did at the end, after the last screen/.test(L3.chunks.find(c => c.id === 'exit').config.help),
      label + ': the exit help says plainly when she finds out how she did');
    check(/every step adds 1 to a box called steps/i.test(JSON.stringify(L3.chunks[0].config.images)),
      label + ': the tracker caption is words, not block syntax');

    // A13/A14
    check(!/the real device|their device never showed|A device dies/.test(JSON.stringify(L3.teacherBrief)),
      label + ': the brief calls it the micro:bit');
    check(Number(L3.chunks.find(c => c.id === "ladder").minutes) === 36,
      label + ': the ladder is 36 minutes on paper (the 9:16 film moved in with it)');
    /* The paper minutes are DERIVED from the film that actually exists, never
       typed from memory (DFM 164b, 131's law). The variable animation grew
       chapter 1, so the ladder and the hour moved with it - both reported to him
       in plain minutes rather than quietly left stale. */
    check(Number(L3.durationMin) === 65, label + ': the lesson\'s stated hour is 65 minutes (the film grew to 9:16 with the variable animation — reported to him)');
    const mSum = L3.chunks.reduce(function (a, c) { return a + (Number(c.minutes) || 0); }, 0);
    check(mSum + 3 === 65, label + ': the chunk minutes plus the Do-Now really sum to the stated hour (' + (mSum + 3) + ')');
    const filmSec = Number(JSON.parse(fs.readFileSync(path.join(__dirname, 'out/l3/chapters.json'), 'utf8')).durationSec);
    check(Math.ceil(filmSec / 60) <= Number(lad.minutesFilmCheck || 36),
      label + ': the ladder chunk is at least as long as the film inside it (' + Math.ceil(filmSec / 60) + ' min of film in 36)');
  }

  console.log('\n== 1b. the three reported Lesson 2 strings (DFM 150 sweep) ==');
  for (const [label, L2] of [['source', srcL2], ['packed', packL2]]) {
    const lad2 = L2.chunks.find(c => c.id === 'ladder').config;
    check(/micro:bit is still the judge/.test(lad2.introSolo), label + ': L2 solo intro says the micro:bit is the judge');
    const ex21 = L2.chunks.find(c => c.id === 'exit').config.items.find(i => i.id === 'ex2-1');
    check(ex21.options[1] === 'You forgot to flash the code onto the micro:bit', label + ': ex2-1 option 1 names the micro:bit');
    if (label === 'source') {
      check(Number(L2.keys['ex2-1'].a) === 1, label + ': ex2-1 key is untouched (still option 1)');
      check(!/TO the device|the device's reaction/.test(L2.keys['ex2-2'].explain), label + ': ex2-2 explanation names the micro:bit');
      check(/TO the micro:bit/.test(L2.keys['ex2-2'].explain), label + ': and says so in the words the pupil reads back');
    }
  }

  console.log('\n== 1c. CONTROLS: the pre-fix content must fail these tests ==');
  control(!/Watch your simulator/i.test(PRE.s1test), 'the pre-fix rung 1 test never started at the simulator');
  control(/the film button below replays it/.test(PRE.s1test), 'the pre-fix rung 1 test carried the false film claim');
  control(!DOWNLOAD_AGAIN.test(PRE.s2test), 'the pre-fix rung 2 test never said to download again');
  control(!DOWNLOAD_AGAIN.test(PRE.s3test), 'the pre-fix rung 3 test never said to download again');
  control(!/goes dark/.test(PRE_GB_S2TEST), 'the pre-guided-build rung 2 had no break-it proof — it lived on rung 1 then');
  control(!/First check you downloaded again/i.test(PRE.s2hint), 'the pre-fix hint sent her straight to the code');
  control(!/says 1 after every single press/.test(PRE.ex31stem), 'the pre-fix ex3-1 asked about a physically impossible score of 3');
  control(!/set score to 1/.test(PRE.ex31opt1), 'the pre-fix ex3-1 answer named a cause that would have counted 0, not 3');

  /* ================= 2. THE BUILT ARTEFACT (DFM 162's lesson) ============== */
  console.log('\n== 2. the built PathB_Index.html he actually pastes ==');
  const built = fs.readFileSync(BUILT, 'utf8');
  check(built.indexOf('It worked! &#9889;') !== -1, 'the built shell carries the new rung button label');
  check(built.indexOf('It worked on the device!') === -1, 'and not one copy of the old one survives');
  check(/if \(document\.querySelector\('\.film-modal'\)\) return;/.test(built), 'the built shell carries the film-modal guard');
  check(/Send in my scores/.test(built) && !/Send in ' \+ \(solo \? 'my' : 'our'\)/.test(built),
    'the built shell serves ONE rally button label, because every pupil now sends her own scores (DFM 185)');
  check(/Start the ' \+ secs \+ ' seconds/.test(built) || /Start the .{0,4} seconds/.test(built),
    'the built shell carries the five-second timer button');
  check(built.indexOf('cfgH.soloHelp') !== -1, 'the built shell prefers soloHelp on a catch-up run');
  check(built.indexOf('your pair’s best round') === -1 && built.indexOf("your pair's best round") === -1,
    'the review line no longer assumes a pair');
  const eng = fs.readFileSync(ENGINES, 'utf8'), appjs = fs.readFileSync(APPJS, 'utf8');
  check(/App\.armButton\(c\.querySelector\('\.rung-worked'\)/.test(eng), 'engines.js arms the rung-worked button');
  check(/if \(hb\) App\.armButton\(hb,/.test(eng), 'engines.js arms the Debug Hint button');
  check(/App\.armButton\(btns\[0\]/.test(eng) && /App\.armButton\(btns\[1\]/.test(eng), 'engines.js arms both stretch buttons');
  check(/wireFilmBtn\(c, \(idx === 0 && !cfg\.unplugged\) \? 0 : undefined\)/.test(eng),
    'engines.js opens the film at the start on a first rung with no unplugged rung below it');
  check(/App\.state\.catchup && cfgH\.soloHelp/.test(appjs), 'app.js reads soloHelp only on a catch-up run');

  /* ================= 3. IN A REAL BROWSER ================================= */
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  /* Wait for the HUB to render before touching anything. The direct-mount
     pattern replaces document.body, and the app's boot chain ends in showHub(),
     which writes to elements the wipe has removed - so wiping mid-boot throws a
     page error that belongs to the harness, not to the app. Rendered tiles mean
     boot is finished (found while writing this: the error was mine, and DFM
     146a says a harness must never print a fault the app does not have). */
  const bootedGoto = async () => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('.tile').length > 0, { timeout: 20000 });
    await sleep(1200);
  };
  await bootedGoto();

  /* Mount into the SHELL'S OWN #chunk-host rather than replacing document.body
     (qa-rung-bar's pattern, tightened here). Two reasons, and the second is the
     one that decided it: engines really do mount into that element in the live
     app, so this is the truer test - and wiping the body takes the shell
     singletons with it (#toast, #help-beacon, #help-modal), so a rung clear
     threw inside App.toast and printed a page error the app does not have. */
  const mountLadder = async (file, opts) => page.evaluate(async ([file, opts]) => {
    const lesson = await (await fetch('/ks3-dt/content/j1/lessons/' + file)).json();
    const ladder = lesson.chunks.find(c => c.engine === 'ladder');
    /* show the player screen the way the app does, so pixel measurements are
       real - #chunk-host lives inside <main id="player" hidden> */
    document.getElementById('hub').hidden = true;
    document.getElementById('player').hidden = false;
    const host = document.querySelector('#chunk-host');
    host.hidden = false; host.innerHTML = '';
    window.__cleared = [];
    const draft = { ladder: { done: [], hinted: [], unplugged: opts.unplugged ? 1 : 0, stretch: 0 } };
    window.Engines.ladder.mount(host, ladder, {
      draft, catchup: false, review: false, chunk: ladder,
      saveEvent: (e) => { const d = e && e.draft && e.draft.ladder; if (d) window.__cleared = d.done.slice(); },
      next: () => {}, awardBadge: () => Promise.resolve()
    });
    await new Promise(r => setTimeout(r, 400));
    return true;
  }, [file, opts]);

  console.log('\n== 3. the ladder card, rendered ==');
  await mountLadder('j1-03.json', {});
  const introDom = await page.evaluate(() => {
    const h = document.querySelector('#chunk-host');
    return {
      setupItems: h.querySelectorAll('.ladder-setup li').length,
      setupText: (h.querySelector('.ladder-setup') || {}).textContent || '',
      lead: (h.querySelector('.ladder-setup-lead') || {}).textContent || '',
      body: h.textContent
    };
  });
  check(introDom.setupItems === 5, 'the intro card really renders the five set-up steps (' + introDom.setupItems + ')');
  check(/scoreboard/.test(introDom.setupText) && /last lesson's project/i.test(introDom.setupText),
    "the rendered steps name scoreboard and refer to the old one as \"last lesson's project\" (DFM 181)");
  check(/Before rung 1/.test(introDom.lead), 'the rendered lead line is on screen above them');
  check(/micro:bit is the judge/.test(introDom.body), 'the rendered intro says the micro:bit is the judge');

  /* DFM 168: the guided-build part player, on the intro card and every rung */
  console.log('\n== 3b. the film part player (DFM 168) ==');
  const chBounds = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/l3/chapters.json'), 'utf8'));
  const introPartDom = await page.evaluate(() => {
    const h = document.querySelector('#chunk-host');
    const v = h.querySelector('.rung-part-video');
    return {
      has: !!v, w: v ? v.getBoundingClientRect().width : 0,
      head: (h.querySelector('.rung-step-head') || {}).textContent || '',
      note: (h.querySelector('.rung-part-note') || {}).textContent || '',
      replay: !!h.querySelector('.rung-part-replay')
    };
  });
  check(introPartDom.has, 'the intro card carries the Part 1 player');
  check(introPartDom.w >= 500, 'the rendered player is a real size, not a thumbnail (' + Math.round(introPartDom.w) + 'px)');
  check(/① Watch this part/.test(introPartDom.head) && /Part 1/.test(introPartDom.head),
    'its step head reads "① Watch this part — Part 1 …"');
  check(/runs about \d+ minute/.test(introPartDom.note), 'the card says how long the part runs');
  check(introPartDom.replay, 'and offers "Watch this part again"');

  /* walk to rung 1 */
  const toRung1 = () => page.evaluate(async () => {
    document.querySelector('#chunk-host button.primary-btn').click();
    await new Promise(r => setTimeout(r, 500));
  });
  await toRung1();
  const rungDom = await page.evaluate(() => {
    const h = document.querySelector('#chunk-host');
    return {
      label: (h.querySelector('.rung-worked') || {}).textContent || '',
      test: (h.querySelector('.rung-test') || {}).textContent || '',
      heads: Array.from(h.querySelectorAll('.rung-step-head')).map(x => x.textContent),
      hasPart: !!h.querySelector('.rung-part-video')
    };
  });
  check(/It worked!/.test(rungDom.label) && !/device/i.test(rungDom.label), 'the rung button reads "It worked!" with no generic noun');
  check(/Watch your simulator/i.test(rungDom.test), 'the rendered rung 1 test starts at the simulator');
  check(rungDom.hasPart, 'rung 1 carries its own part player');
  check(rungDom.heads.some(t => /① Watch this part/.test(t)) && rungDom.heads.some(t => /② Build it yourself/.test(t)),
    'the ①-watch and ②-build heads are both on the card');
  check(/③ Prove it/.test(rungDom.test), 'the test box leads with ③ Prove it');

  /* DFM 170 - THE POINT OF THE WHOLE CHANGE, measured on the real element:
     a rung's player must be its OWN file, so its scrubber cannot reach any other
     rung's material. His words: "a student who wants to rewind or go forward
     might accidentally stray into another part of the video that isn't being
     dealt with that particular rung." The old assertions here checked that the
     player SEEKED to the part's start inside one long film - the very behaviour
     he rejected - so they are replaced, not relaxed. */
  const partPlay = await page.evaluate(async (bounds) => {
    const h = document.querySelector('#chunk-host');
    const v = h.querySelector('.rung-part-video');
    for (let i = 0; i < 60 && !(v.readyState >= 1 && isFinite(v.duration)); i++) {
      await new Promise(r => setTimeout(r, 250));
    }
    const out = { src: v.getAttribute('src') || '', duration: v.duration, startsAtZero: v.currentTime < 0.5 };
    try { await v.play(); } catch (e) {}
    v.currentTime = Math.max(0, v.duration - 0.2);
    await new Promise(r => setTimeout(r, 900));
    const done = h.querySelector('.rung-part-done');
    out.stopped = !!(done && !done.hidden);
    h.querySelector('.rung-part-replay').click();
    await new Promise(r => setTimeout(r, 400));
    out.replayedToZero = v.currentTime < 1.5;
    out.note = (h.querySelector('.rung-part-len') || {}).textContent || '';
    try { v.pause(); } catch (e) {}
    return out;
  }, chBounds);
  const filmLen = Number(chBounds.durationSec || 0);
  check(/l3-part\d\.mp4$/.test(partPlay.src), 'the rung plays its OWN part file, not the whole film (' + partPlay.src.split('/').pop() + ')');
  check(partPlay.startsAtZero, 'the part player opens at 0:00 — a part file has no offset to seek to');
  check(partPlay.duration > 30 && partPlay.duration < filmLen * 0.6,
    'the scrubber spans ONLY this part (' + Math.round(partPlay.duration) + 's of the ' + filmLen + 's film) — it cannot stray into another rung');
  check(partPlay.stopped, 'reaching the end shows "now build it below"');
  check(partPlay.replayedToZero, 'Watch-this-part-again returns to the start of the part');
  check(/runs about \d+ minute/.test(partPlay.note),
    'the length is read off the file itself, not typed into the content (' + partPlay.note.trim() + ')');

  /* CONTROL + the L2 guard: a ladder with no parts renders none of this */
  await mountLadder('j1-02.json', { unplugged: true });
  const l2Dom = await page.evaluate(() => {
    const h = document.querySelector('#chunk-host');
    return { part: !!h.querySelector('.rung-part-video'), heads: h.querySelectorAll('.rung-step-head').length };
  });
  control(!l2Dom.part && l2Dom.heads === 0, 'Lesson 2 (no parts in config) renders NO player and NO step heads — byte-identical cards');
  await page.evaluate(async () => {   // and its test box still reads exactly as before
    document.querySelector('#chunk-host button.primary-btn').click();
    await new Promise(r => setTimeout(r, 400));
    const cs = document.querySelector('#chunk-host .confirm-step');
    if (cs) { cs.click(); await new Promise(r => setTimeout(r, 800)); }
  });
  const l2Test = await page.evaluate(() => (document.querySelector('#chunk-host .rung-test') || {}).textContent || '');
  check(/The real test:/.test(l2Test) && !/③/.test(l2Test), 'Lesson 2\'s test box still leads "The real test:" with no ③');
  await mountLadder('j1-03.json', {});

  console.log('\n== 4. one gesture, one transition (DFM 104) ==');
  const dbl = async () => page.evaluate(async () => {
    const b = document.querySelector('#chunk-host .rung-worked');
    b.click(); b.click();                      // the real double-click, same tick
    await new Promise(r => setTimeout(r, 500));
    return window.__cleared.length;
  });
  await mountLadder('j1-03.json', {});
  await toRung1();
  const clearedGuarded = await dbl();
  check(clearedGuarded === 1, 'a double-click on the rung button clears exactly ONE rung (cleared ' + clearedGuarded + ')');

  /* CONTROL: restore the pre-fix wiring (a bare onclick, no guard) and prove
     the very same double-click clears two rungs */
  await page.evaluate(() => {
    window.__realArm = window.App.armButton;
    window.App.armButton = function (btn, fn) { if (btn) btn.onclick = fn; return btn; };
  });
  await mountLadder('j1-03.json', {});
  await toRung1();
  const clearedBare = await dbl();
  control(clearedBare === 2, 'the pre-fix bare onclick clears TWO rungs on the same double-click (cleared ' + clearedBare + ')');
  await page.evaluate(() => { window.App.armButton = window.__realArm; });

  console.log('\n== 5. the film button ==');
  await mountLadder('j1-03.json', {});
  await toRung1();
  const filmOnce = await page.evaluate(async () => {
    const b = document.querySelector('#chunk-host .rung-film-btn');
    b.click(); b.click();
    await new Promise(r => setTimeout(r, 700));
    const v = document.querySelector('.film-modal video');
    return { modals: document.querySelectorAll('.film-modal').length, t: v ? v.currentTime : -1 };
  });
  check(filmOnce.modals === 1, 'two quick presses open exactly ONE film modal (' + filmOnce.modals + ')');
  check(filmOnce.t < 1, 'and on L3 rung 1 the film opens at the beginning (t=' + filmOnce.t.toFixed(1) + 's), because there is no unplugged rung between it and the film');
  /* CONTROL: hide the open modal from the guard's own query and the second
     press gets through - proving the guard is what stops it, not luck */
  const filmTwice = await page.evaluate(async () => {
    document.querySelector('.film-modal').className = 'ols-modal decoy-modal';
    document.querySelector('#chunk-host .rung-film-btn').click();
    await new Promise(r => setTimeout(r, 500));
    return document.querySelectorAll('.film-modal, .decoy-modal').length;
  });
  control(filmTwice === 2, 'with the guard blinded, the second press really does stack a second modal (' + filmTwice + ')');
  await page.evaluate(() => document.querySelectorAll('.film-modal, .decoy-modal').forEach(m => m.remove()));

  /* L2 is untouched: its first BUILT rung still opens at the copy-across chapter */
  await mountLadder('j1-02.json', { unplugged: true });
  await toRung1();
  const l2t = await page.evaluate(async () => {
    document.querySelector('#chunk-host .rung-film-btn').click();
    await new Promise(r => setTimeout(r, 700));
    const v = document.querySelector('.film-modal video');
    return v ? v.currentTime : -1;
  });
  check(l2t > 100, 'Lesson 2 is unchanged — its first built rung still opens the film at the copy-across chapter (t=' + Math.round(l2t) + 's)');
  await page.evaluate(() => document.querySelectorAll('.film-modal').forEach(m => m.remove()));

  console.log('\n== 6. the Rally speaks to the pupil who is actually there ==');
  const mountRally = solo => page.evaluate(async (solo) => {
    const lesson = await (await fetch('/ks3-dt/content/j1/lessons/j1-03.json')).json();
    const rally = lesson.chunks.find(c => c.engine === 'tournament');
    const host = document.querySelector('#chunk-host');
    host.hidden = false; host.innerHTML = '';
    window.Engines.tournament.mount(host, rally, {
      draft: {}, catchup: solo, review: false, chunk: rally, lesson: { id: 'j1-03' },
      saveEvent: () => {}, next: () => {}, awardBadge: () => Promise.resolve(), call: () => Promise.resolve({ ok: true, n: 0 })
    });
    await new Promise(r => setTimeout(r, 400));
    const h = document.querySelector('#chunk-host');
    return { btn: (h.querySelector('.rally-transmit') || {}).textContent || '', rules: h.querySelectorAll('.rally-rules li').length };
  }, solo);
  const pair = await mountRally(false), soloR = await mountRally(true);
  check(pair.btn === 'Send in my scores' && pair.rules === 5, 'a pair sees five rules and "Send in my scores"');
  check(soloR.btn === 'Send in my scores' && soloR.rules === 3, 'a catch-up pupil sees three rules and the same button');
  control(!(soloR.rules === 5), 'the solo screen genuinely shows fewer rules than the help used to promise');

  console.log('\n== 7. the round ? matches the screen underneath it ==');
  const helpFor = catchup => page.evaluate(async (catchup) => {
    const lesson = await (await fetch('/ks3-dt/content/j1/lessons/j1-03.json')).json();
    window.App.state.lesson = lesson;
    window.App.state.chunks = lesson.chunks;
    window.App.state.chunkIdx = lesson.chunks.findIndex(c => c.engine === 'tournament');
    window.App.state.catchup = catchup;
    document.querySelector('#help-beacon').click();
    await new Promise(r => setTimeout(r, 300));
    const t = document.querySelector('#help-body').textContent;
    document.querySelector('#help-close').click();
    return t;
  }, catchup);
  const helpPair = await helpFor(false), helpSolo = await helpFor(true);
  check(/five rules/.test(helpPair) && /Send in my scores/.test(helpPair), 'the pair help says five rules and names her button');
  check(/three rules/.test(helpSolo) && /Send in my scores/.test(helpSolo), 'the catch-up help says three rules and names the same button');
  control(!/three rules/.test(helpPair), 'the two help texts are genuinely different (the pair one is not the solo one)');

  console.log('\n== 8. the re-watch modal still carries the whole film ==');
  await mountLadder('j1-03.json', {});   // section 6 left the rally card mounted
  const modalDom = await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('#chunk-host .rung-film-btn').click();
    await new Promise(r => setTimeout(r, 600));
    const m = document.querySelector('.film-modal');
    const out = { chapters: m ? m.querySelectorAll('.vid-chapter').length : 0 };
    if (m) m.remove();
    return out;
  });
  check(modalDom.chapters === 4, 'the film button still opens the whole film with its four chapter buttons (' + modalDom.chapters + ')');

  const realErrs = errs.filter(e => !/tutorial|\.mp4|poster|favicon/.test(e));
  check(realErrs.length === 0, 'zero console errors: ' + JSON.stringify(realErrs.slice(0, 3)));

  console.log('\n=========================================');
  console.log(FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL L3 PRE-SIT CHECKS PASSED');
  await browser.close();
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error('QA CRASHED:', e.message); process.exit(1); });
