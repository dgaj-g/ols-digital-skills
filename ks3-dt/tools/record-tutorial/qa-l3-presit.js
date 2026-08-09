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
const DOWNLOAD_AGAIN = /download (it|and drag)[^.]*again|again and drag|download and drag the new file/i;

(async () => {
  /* ================= 1. CONTENT: source AND packed must both carry it ====== */
  console.log('== 1. the lesson content (source and packed) ==');
  const readL = (root, f) => JSON.parse(fs.readFileSync(path.join(root, 'j1/lessons/' + f), 'utf8'));
  const srcL3 = readL(SRC, 'j1-03.json'), packL3 = readL(PACKED, 'j1-03.json');
  const srcL2 = readL(SRC, 'j1-02.json'), packL2 = readL(PACKED, 'j1-02.json');

  for (const [label, L3] of [['source', srcL3], ['packed', packL3]]) {
    const lad = L3.chunks.find(c => c.id === 'ladder').config;
    const r = id => lad.rungs.find(x => x.id === id);

    // A1 the set-up list
    check(Array.isArray(lad.setup) && lad.setup.length === 4, label + ': the ladder carries a 4-step MakeCode set-up list');
    check(/Before rung 1/.test(String(lad.setupLead || '')), label + ': the set-up list has its own lead line');
    check(/scoreboard/.test(lad.setup.join(' ')) && /Signal Relay/.test(lad.setup.join(' ')),
      label + ': the set-up list names the NEW project (scoreboard) and warns off Signal Relay');
    check(/New Project/i.test(lad.setup.join(' ')), label + ': it says to click New Project');

    // A2 the banned generic noun
    check(/micro:bit is the judge/.test(lad.intro) && !/DEVICE is the judge/.test(lad.intro),
      label + ': the ladder intro says the micro:bit is the judge, never "the DEVICE"');
    check(/micro:bit is the judge/.test(lad.introSolo) && !/DEVICE is the judge/.test(lad.introSolo),
      label + ': the solo intro says it too');
    check(!/DEVICE is the judge/.test(JSON.stringify(L3)), label + ': "DEVICE is the judge" is gone from the whole lesson');

    // A3 rung 1: the simulator, and no false film claim
    check(/SIMULATOR/.test(r('s1').test), label + ': rung 1 sends the break-it step to the SIMULATOR');
    check(/only changes when you download to it again/i.test(r('s1').test),
      label + ': rung 1 says a micro:bit only changes on a fresh download');
    check(!/the film button below replays it/.test(r('s1').test),
      label + ': rung 1 no longer claims the film replays the copy-across routine');
    check(/press Download in MakeCode, then drag the file across/.test(r('s1').test),
      label + ': rung 1 spells the copy-across steps out itself instead');

    // A4/A5 the download-again openers
    check(DOWNLOAD_AGAIN.test(r('s2').test), label + ': rung 2 opens by telling her to download again');
    check(DOWNLOAD_AGAIN.test(r('s3').test), label + ': rung 3 opens by telling her to download again');
    check(/OLD program/i.test(r('s2').test), label + ': rung 2 says why — the micro:bit keeps running the OLD program');
    check(/First check you downloaded again/i.test(r('s2').hint),
      label + ': rung 2\'s hint names the fresh download as the FIRST thing to check');

    // A6 help
    check(/simulator's display goes dark/.test(lad.help), label + ': the ladder help names the simulator for the break-it step');

    // A7 the film's watching instructions
    const howto = L3.chunks.find(c => c.id === 'howto').config;
    check(/just WATCH it/.test(String(howto.intro || '')), label + ': the film card says today she just watches it');
    check(/pause it/.test(String(howto.intro || '')), label + ': and tells her she can pause it');

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
      check(/set-instead-of-change/.test(L3.keys['ex3-1'].explain), label + ': the explanation names the real fault');
    } else {
      check(!L3.keys, label + ': the packed lesson carries no answer keys at all (they stay server-side)');
    }

    // A9 the rig
    const rig = L3.chunks.find(c => c.id === 'rig').config;
    check(/Run the HQ Inspection/.test(rig.help), label + ': the rig help names the button as it appears on screen');
    check(/run the inspection again/.test(rig.failText), label + ': the rig failText says "run the inspection again"');
    check(rig.steps[2].title === 'Drag it in', label + ': the third rig step is titled "Drag it in"');
    check(!/insurance|kill your build/.test(rig.intro), label + ': the rig intro drops "insurance" and "kill your build"');

    // A10 the rally
    const rally = L3.chunks.find(c => c.id === 'rally').config;
    check(!/closer|on form/.test(rally.rules.join(' ')), label + ': the rally rules drop "closer"/"on form"');
    check(!/key it in|key exactly that number/.test(JSON.stringify(rally)), label + ': "key it in" is gone from the rally');
    check(/Send in our score/.test(rally.help), label + ': the rally help names the real button');
    check(/three rules/.test(String(rally.soloHelp || '')) && /Send in my score/.test(String(rally.soloHelp || '')),
      label + ': the rally carries its own solo help, matching the solo screen');
    check(!/Catch-up mission/.test(rally.soloIntro), label + ': "Catch-up mission" is gone');

    // A11/A12
    check(/at the end of the last screen/.test(L3.chunks.find(c => c.id === 'exit').config.help),
      label + ': the exit help explains when verdicts arrive');
    check(/Every step adds 1 to a box called steps/.test(JSON.stringify(L3.chunks[0].config.images)),
      label + ': the tracker caption is words, not block syntax');

    // A13/A14
    check(!/the real device|their device never showed|A device dies/.test(JSON.stringify(L3.teacherBrief)),
      label + ': the brief calls it the micro:bit');
    check(Number(L3.chunks.find(c => c.id === 'howto').minutes) === 8, label + ': the film chunk is 8 minutes on paper (DFM 164b)');
    check(Number(L3.durationMin) === 63, label + ': the lesson\'s stated hour is 63 minutes');
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
  control(!/SIMULATOR/.test(PRE.s1test), 'the pre-fix rung 1 test never mentioned the simulator');
  control(/the film button below replays it/.test(PRE.s1test), 'the pre-fix rung 1 test carried the false film claim');
  control(!DOWNLOAD_AGAIN.test(PRE.s2test), 'the pre-fix rung 2 test never said to download again');
  control(!DOWNLOAD_AGAIN.test(PRE.s3test), 'the pre-fix rung 3 test never said to download again');
  control(!/First check you downloaded again/i.test(PRE.s2hint), 'the pre-fix hint sent her straight to the code');
  control(!/says 1 after every single press/.test(PRE.ex31stem), 'the pre-fix ex3-1 asked about a physically impossible score of 3');
  control(!/set score to 1/.test(PRE.ex31opt1), 'the pre-fix ex3-1 answer named a cause that would have counted 0, not 3');

  /* ================= 2. THE BUILT ARTEFACT (DFM 162's lesson) ============== */
  console.log('\n== 2. the built PathB_Index.html he actually pastes ==');
  const built = fs.readFileSync(BUILT, 'utf8');
  check(built.indexOf('It worked! &#9889;') !== -1, 'the built shell carries the new rung button label');
  check(built.indexOf('It worked on the device!') === -1, 'and not one copy of the old one survives');
  check(/if \(document\.querySelector\('\.film-modal'\)\) return;/.test(built), 'the built shell carries the film-modal guard');
  check(/Send in ' \+ \(solo \? 'my' : 'our'\) \+ ' score/.test(built), 'the built shell picks the rally button by mode');
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
  check(introDom.setupItems === 4, 'the intro card really renders the four set-up steps (' + introDom.setupItems + ')');
  check(/scoreboard/.test(introDom.setupText) && /Signal Relay/.test(introDom.setupText),
    'the rendered steps name scoreboard and warn off Signal Relay');
  check(/Before rung 1/.test(introDom.lead), 'the rendered lead line is on screen above them');
  check(/micro:bit is the judge/.test(introDom.body), 'the rendered intro says the micro:bit is the judge');

  /* walk to rung 1 */
  const toRung1 = () => page.evaluate(async () => {
    document.querySelector('#chunk-host button.primary-btn').click();
    await new Promise(r => setTimeout(r, 500));
  });
  await toRung1();
  const rungDom = await page.evaluate(() => {
    const h = document.querySelector('#chunk-host');
    return { label: (h.querySelector('.rung-worked') || {}).textContent || '', test: (h.querySelector('.rung-test') || {}).textContent || '' };
  });
  check(/It worked!/.test(rungDom.label) && !/device/i.test(rungDom.label), 'the rung button reads "It worked!" with no generic noun');
  check(/SIMULATOR/.test(rungDom.test), 'the rendered rung 1 test names the simulator');

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
  check(pair.btn === 'Send in our score' && pair.rules === 5, 'a pair sees five rules and "Send in our score"');
  check(soloR.btn === 'Send in my score' && soloR.rules === 3, 'a catch-up pupil sees three rules and "Send in my score"');
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
  check(/five rules/.test(helpPair) && /Send in our score/.test(helpPair), 'the pair help says five rules and names her button');
  check(/three rules/.test(helpSolo) && /Send in my score/.test(helpSolo), 'the catch-up help says three rules and names hers');
  control(!/three rules/.test(helpPair), 'the two help texts are genuinely different (the pair one is not the solo one)');

  console.log('\n== 8. the film card tells her how to watch it ==');
  const howtoDom = await page.evaluate(async () => {
    const lesson = await (await fetch('/ks3-dt/content/j1/lessons/j1-03.json')).json();
    const chunk = lesson.chunks.find(c => c.engine === 'video');
    const host = document.querySelector('#chunk-host');
    host.hidden = false; host.innerHTML = '';
    window.Engines.video.mount(host, chunk, { chunk, saveEvent: () => {}, next: () => {}, lesson });
    await new Promise(r => setTimeout(r, 300));
    const h = document.querySelector('#chunk-host');
    return { intro: (h.querySelector('.video-intro') || {}).textContent || '', chapters: h.querySelectorAll('.vid-chapter').length };
  });
  check(/just WATCH it/.test(howtoDom.intro), 'the film card renders the watching instructions');
  check(howtoDom.chapters === 4, 'and still offers its four chapter buttons (' + howtoDom.chapters + ')');

  const realErrs = errs.filter(e => !/tutorial|\.mp4|poster|favicon/.test(e));
  check(realErrs.length === 0, 'zero console errors: ' + JSON.stringify(realErrs.slice(0, 3)));

  console.log('\n=========================================');
  console.log(FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL L3 PRE-SIT CHECKS PASSED');
  await browser.close();
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error('QA CRASHED:', e.message); process.exit(1); });
