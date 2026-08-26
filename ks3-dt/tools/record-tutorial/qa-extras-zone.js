#!/usr/bin/env node
/* qa-extras-zone.js — THE EXTRA JOBS ZONE PAYS NOTHING AND TRAPS NOBODY (DFM 265).
 *
 * His ruling, 26 Aug 2026, is two sentences that are one design: "I'm not sure that we
 * should offer extra XP for students who are naturally brighter, as this might seem
 * unfair to a 'normal' student", and "the teacher says it's nearly time up and to
 * finish — how can they leave their current task… so that they can still claim their
 * badge, carry out the exit question(s) and completing their evaluation."
 *
 * The two halves hold each other up: with no points promised, leaving costs nothing,
 * and "Finish the lesson" is a free move rather than a forfeit. So this gate asks the
 * questions that would fail if either half quietly came apart:
 *
 *   (1) A pyrun chunk WITHOUT `extrasMode` renders BYTE-IDENTICALLY to the engine he
 *       has already sat. The stretch field is gone from that engine, so the control is
 *       run against `a3b5fce`'s engine pulled out of git — not described, RUN.
 *   (2) The hub says what it is BEFORE it lists what to click (DFM 151), lists every
 *       job the content declares, and carries the way out.
 *   (3) The way out is on EVERY screen (265c): the hub AND every job card, live from
 *       the moment the card mounts, never disabled.
 *   (4) Abandoning a half-done job returns it to its START — the tray full again, the
 *       program empty, no typed value remembered.
 *   (5) Finishing a job marks its tick, and the back control is armed BY CLASS, not by
 *       "the first button in the card" (DFM 143a — the fault that killed "Start
 *       climbing" and then "Run the inspection again").
 *   (6) FINISH FROM INSIDE A HALF-DONE JOB really finishes the chunk — his time-up
 *       scenario, walked exactly — and it does so with ZERO bonus XP.
 *   (7) REVIEW MODE renders the zone LIVE (265d) and swaps the hub's opening line.
 *   (8) No extras string anywhere promises points, and the finish label agrees WORD FOR
 *       WORD with the closing chunk's own help sentence (DFM 144/167b: one fact, one
 *       wording — the label promises "two cards, then the last two screens" and the very
 *       card it delivers her to says the same thing).
 *
 * BASE_REF IS PINNED. A floating base becomes the fixed code the moment the fix commits,
 * and the control then passes by being vacuous (the qa-pair-stores lesson, DFM 196).
 *
 *   node qa-extras-zone.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');

const BASE_REF = 'a3b5fce';          /* V55 — the engine before the extras zone. PINNED. */
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

const LESSONS = [
  { id: 'j2-02', year: 'j2', extras: 'extras', core: 'build', back: 'Back to the extra jobs' },
  { id: 'j3-02', year: 'j3', extras: 'extras', core: 'callsheet-b', back: 'Back to the encore sheet' }
];
const load = (L) => JSON.parse(fs.readFileSync(path.join(SRC, L.year, 'lessons', L.id + '.json'), 'utf8'));

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

/* mount a pyrun chunk and hand back a driver bound to that page */
const MOUNT = `(function(chunk, review){
  window.__fin = null; window.__xp = null; window.__nexted = 0; window.__badges = 0;
  document.body.innerHTML = '<div id="host"></div>';
  var host = document.getElementById('host');
  window.Engines.pyrun.mount(host, chunk, {
    chunk: chunk, review: !!review, catchup: false,
    awardBadge: function (b, d) { window.__badges++; window.__fin = d; window.__xp = b && b.xp; return Promise.resolve({ ok: true }); },
    next: function () { window.__nexted++; },
    saveEvent: function () { return Promise.resolve({ ok: true }); },
    markItem: function () { return Promise.resolve({ ok: true }); }
  });
  return true;
})`;

(async () => {
  console.log('qa-extras-zone — the extra jobs pay nothing and trap nobody (DFM 265)\n');
  console.log('  pre-change engine: ' + BASE_REF + ' (pinned)\n');

  const now = fs.readFileSync(ENGINES, 'utf8');
  const before = execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':ks3-dt/platform/engines.js'],
    { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  check(before !== now, 'the pinned base really differs from the shipping engine (a control against ' +
    'identical code would pass by being vacuous)');
  control(/offerStretch/.test(before) && /cfg\.stretch/.test(before),
    'and the base really carries the V54 stretch offer, so there is something to compare against');
  check(!/offerStretch|cfg\.stretch|stretchNextLabel/.test(now.slice(now.indexOf('Engines.pyrun = {'), now.indexOf('/* ================= artifact'))),
    'the shipping pyrun engine carries NO stretch machinery at all — the field died with the offer');

  const browser = await chromium.launch({ headless: true });
  try {
    const { pg: pgNow, errs: eNow } = await makePage(browser, now);
    const { pg: pgOld } = await makePage(browser, before);

    /* ---------- (1) NO extrasMode → BYTE-IDENTICAL ---------- */
    console.log('=== (1) A pyrun CHUNK WITH NO `extrasMode` RENDERS AS IT ALWAYS DID ===');
    for (const L of LESSONS) {
      const lesson = load(L);
      const core = lesson.chunks.find(c => c.id === L.core);
      check(!!core && !core.config.extrasMode, L.id + ' › ' + L.core + ' really has no extrasMode');
      check(core.config.stretch === undefined && core.config.stretchNextLabel === undefined,
        '  and no leftover stretch field in its content either');
      const render = (pg) => pg.evaluate(async ([mt, ch]) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        eval(mt)(ch, false);
        await wait(60);
        const host = document.getElementById('host');
        const open = host.querySelector('.intro-card button.primary-btn');
        if (open) open.click();
        await wait(120);
        return host.innerHTML;
      }, [MOUNT, core]);
      const a = await render(pgNow);
      const b = await render(pgOld);
      check(a.length > 500, '  ' + L.core + ' really rendered (' + a.length + ' bytes)');
      /* the tray is SHUFFLED at mount (DFM 258), so the two renders can never be
         string-equal; what must be identical is the CARD's shape, which is what the
         byte-identical promise is really about. The line set is compared as a SET. */
      const shape = h => h.replace(/<button class="pyrun-line in-tray"[\s\S]*?<\/button>/g, '')
                          .replace(/data-si="\d+"/g, '');
      check(shape(a) === shape(b),
        '  and its card is BYTE-IDENTICAL to the pre-change engine once the shuffled tray is set aside');
      const lines = h => (h.match(/<code>([\s\S]*?)<\/code>/g) || []).sort().join('|');
      check(lines(a) === lines(b), '  and it serves exactly the same set of lines');
    }

    /* ---------- (2)(3) THE HUB, AND THE WAY OUT ---------- */
    console.log('\n=== (2) THE HUB SAYS WHAT IT IS, THEN LISTS THE JOBS ===');
    for (const L of LESSONS) {
      const lesson = load(L);
      const ex = lesson.chunks.find(c => c.id === L.extras);
      check(!!ex && ex.config.extrasMode === true, L.id + ' carries an `extras` chunk in extrasMode');
      check(ex.minutes === 0, '  and it is worth 0 minutes — outside the hour');
      check(!ex.badge, '  and it carries NO badge, so nothing it does can reach the server');
      const idx = lesson.chunks.findIndex(c => c.id === L.extras);
      const core = lesson.chunks.findIndex(c => c.id === L.core);
      const next = lesson.chunks.findIndex(c => c.id === 'next');
      check(core < idx && idx < next,
        '  and it sits AFTER the badged build and BEFORE the closing cards (265b)');

      const hub = await pgNow.evaluate(async ([mt, ch]) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        eval(mt)(ch, false);
        await wait(80);
        const host = document.getElementById('host');
        const c = host.querySelector('.pyrun-hub');
        if (!c) return { err: 'no hub card' };
        const jobs = Array.from(c.querySelectorAll('.pyrun-job')).map(b => ({
          id: b.getAttribute('data-job'),
          title: (b.querySelector('.pyrun-job-title') || {}).textContent || '',
          whiff: (b.querySelector('.pyrun-job-whiff') || {}).textContent || '',
          tick: !!b.querySelector('.pyrun-job-tick')
        }));
        const fin = c.querySelector('.pyrun-finish');
        return {
          html: c.innerHTML, jobs,
          lead: (c.querySelector('.intro-lead') || {}).textContent || '',
          finish: fin ? fin.textContent : null,
          finishDisabled: fin ? !!fin.disabled : null,
          leadBeforeJobs: c.innerHTML.indexOf('intro-lead') < c.innerHTML.indexOf('pyrun-jobs')
        };
      }, [MOUNT, ex]);
      check(!hub.err, L.id + ': the hub card mounts' + (hub.err ? ' — ' + hub.err : ''));
      check(hub.jobs.length === ex.config.builds.length,
        '  it lists every job the content declares (' + hub.jobs.length + ')');
      check(hub.jobs.every(j => j.title && j.whiff),
        '  every job button carries a title AND its one-line whiff');
      check(hub.jobs.every(j => !j.tick), '  and no job is ticked before anything is done');
      check(hub.leadBeforeJobs, '  the intro is ABOVE the job buttons, not under them (DFM 151)');
      check(hub.lead.indexOf('no points') > -1 || hub.lead.indexOf('no points') > -1,
        '  and it says on the card itself that the jobs add no points');
      check(hub.finish === ex.config.finishLabel && hub.finishDisabled === false,
        '  the way out is on the hub, live from the first frame  [' + hub.finish + ']');
    }

    console.log('\n=== (3) THE WAY OUT IS ON EVERY SCREEN OF THE ZONE (265c) ===');
    for (const L of LESSONS) {
      const ex = load(L).chunks.find(c => c.id === L.extras);
      for (let i = 0; i < ex.config.builds.length; i++) {
        const st = await pgNow.evaluate(async ([mt, ch, n]) => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          eval(mt)(ch, false);
          await wait(80);
          const host = document.getElementById('host');
          host.querySelectorAll('.pyrun-job')[n].click();
          await wait(120);
          const card = host.querySelector('.pyrun-card');
          if (!card) return { err: 'job card did not open' };
          const back = card.querySelector('.pyrun-back'), fin = card.querySelector('.pyrun-finish');
          return {
            back: back ? { text: back.textContent, disabled: !!back.disabled, ghost: /ghost-btn/.test(back.className) } : null,
            finish: fin ? { text: fin.textContent, disabled: !!fin.disabled } : null,
            tray: host.querySelectorAll('.pyt-list .pyrun-line').length,
            runDisabled: host.querySelector('.pyrun-run').disabled,
            lockedNote: (function () {
              const n = host.querySelector('.pyrun-locked-note');
              return n && !n.hidden ? (n.textContent || '').trim() : null;
            })()
          };
        }, [MOUNT, ex, i]);
        const job = ex.config.builds[i];
        check(!st.err, L.id + ' › ' + job.id + ': the job card opens from the hub');
        check(st.back && st.back.text === ex.config.backLabel && !st.back.disabled,
          '  it carries "' + ex.config.backLabel + '", live from the first frame');
        check(st.finish && st.finish.text === ex.config.finishLabel && !st.finish.disabled,
          '  and "' + ex.config.finishLabel + '", live from the first frame');
        check(st.tray === job.lines.length, '  with every line in the tray (' + st.tray + ')');
        check(st.runDisabled === true, '  and RUN born asleep, exactly as on a core build');
        /* NO MUTE LOCK IN THE ZONE (DFM 205). A control that is off and silent is
           the fault he pressed on Case 01 and again on the QA desk; it may not be
           reintroduced by a new surface just because the surface is optional.
           sit-wrongpath clicks every unactionable control on this screen on every
           run; this is the source-side twin of that walk. */
        check(!!st.lockedNote && st.lockedNote === ex.config.lockedNote,
          '  and the sleeping RUN SAYS what wakes it — never a mute lock  [' +
          String(st.lockedNote).slice(0, 48) + '…]');
      }
    }

    /* ---------- (4) ABANDON RETURNS THE JOB TO ITS START ---------- */
    console.log('\n=== (4) LEAVING A HALF-DONE JOB PUTS THAT JOB BACK TO ITS START ===');
    for (const L of LESSONS) {
      const ex = load(L).chunks.find(c => c.id === L.extras);
      const r = await pgNow.evaluate(async ([mt, ch]) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        eval(mt)(ch, false);
        await wait(80);
        const host = document.getElementById('host');
        host.querySelectorAll('.pyrun-job')[0].click();
        await wait(120);
        /* do half the job: place two lines, and type into a gap if there is one */
        const put = Array.from(host.querySelectorAll('.pyt-list .pyrun-line')).slice(0, 2);
        put.forEach(n => n.click());
        await wait(60);
        const blank = host.querySelector('.pyrun-blank');
        if (blank) { blank.value = '7'; blank.dispatchEvent(new Event('input', { bubbles: true })); }
        await wait(40);
        const half = {
          placed: host.querySelectorAll('.pyp-list .pyrun-line').length,
          typed: blank ? blank.value : null,
          runArmed: !host.querySelector('.pyrun-run').disabled
        };
        host.querySelector('.pyrun-back').click();
        await wait(120);
        const onHub = !!host.querySelector('.pyrun-hub');
        const tickedNow = !!host.querySelector('.pyrun-job-tick');
        host.querySelectorAll('.pyrun-job')[0].click();
        await wait(120);
        const b2 = host.querySelector('.pyrun-blank');
        return {
          half, onHub, tickedNow,
          placed: host.querySelectorAll('.pyp-list .pyrun-line').length,
          tray: host.querySelectorAll('.pyt-list .pyrun-line').length,
          typed: b2 ? b2.value : null,
          runDisabled: host.querySelector('.pyrun-run').disabled,
          nexted: window.__nexted, badges: window.__badges
        };
      }, [MOUNT, ex]);
      check(r.half.placed === 2 && r.half.runArmed, L.id + ': two lines really went into the program first');
      check(r.onHub, '  pressing "' + ex.config.backLabel + '" lands back on the hub');
      check(!r.tickedNow, '  and an ABANDONED job earns no tick');
      check(r.placed === 0 && r.runDisabled === true,
        '  re-opening it starts it over: the program is empty and RUN is asleep again');
      check(r.tray === ex.config.builds[0].lines.length, '  every line is back in the tray (' + r.tray + ')');
      check(r.typed === '' || r.typed == null, '  and nothing she typed is remembered  [' + JSON.stringify(r.typed) + ']');
      check(r.nexted === 0 && r.badges === 0, '  and nothing was written or advanced by any of it');
    }

    /* ---------- (5) FINISHING A JOB ---------- */
    console.log('\n=== (5) A FINISHED JOB SHOWS ITS MATCHED MOMENT AND TICKS ON THE HUB ===');
    for (const L of LESSONS) {
      const lesson = load(L);
      const ex = lesson.chunks.find(c => c.id === L.extras);
      const job = ex.config.builds[1];              // job 2: no typed gaps in either lesson
      const key = lesson.keys[job.id];
      check(!!key && !!key.order, L.id + ' › ' + job.id + ' has an answer key a machine can drive');
      const r = await pgNow.evaluate(async ([mt, ch, order, blanks]) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        eval(mt)(ch, false);
        await wait(80);
        const host = document.getElementById('host');
        host.querySelectorAll('.pyrun-job')[1].click();
        await wait(120);
        order.forEach(si => {
          const n = host.querySelector('.pyt-list .pyrun-line[data-si="' + si + '"]');
          if (n) n.click();
        });
        await wait(60);
        Object.keys(blanks || {}).forEach(k => {
          const inp = host.querySelector('.pyrun-blank[data-key="' + k + '"]');
          if (inp) { inp.value = blanks[k]; inp.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        await wait(40);
        host.querySelector('.pyrun-run').click();
        for (let i = 0; i < 100 && !host.querySelector('.pyrun-verdict:not([hidden]) .pyrun-vtag'); i++) await wait(100);
        const tag = ((host.querySelector('.pyrun-vtag') || {}).textContent || '').trim();
        const printed = ((host.querySelector('.pyc-out') || {}).textContent || '').trim();
        const back = host.querySelector('.pyrun-back');
        const out = {
          tag, printed,
          backIsPrimary: back ? /primary-btn/.test(back.className) : null,
          backCount: host.querySelectorAll('.pyrun-back').length,
          finishStillLive: !!host.querySelector('.pyrun-finish') && !host.querySelector('.pyrun-finish').disabled,
          xpAfter: window.__xp, badges: window.__badges, nexted: window.__nexted
        };
        back.click();
        await wait(140);
        out.onHub = !!host.querySelector('.pyrun-hub');
        out.ticks = host.querySelectorAll('.pyrun-job-tick').length;
        out.tickedJob = (host.querySelectorAll('.pyrun-job')[1].querySelector('.pyrun-job-tick') || {}).textContent || null;
        return out;
      }, [MOUNT, ex, key.order, key.blanks || {}]);
      check(r.tag === (ex.config.matchedLabel || 'MATCHED'),
        '  the answer key really MATCHES on the job card  [' + r.tag + ']');
      check(r.printed === (job.target || []).join('\n'),
        '  and the console printed the target  [' + JSON.stringify(r.printed) + ']');
      check(r.backCount === 1 && r.backIsPrimary === true,
        '  ONE back control, promoted to primary — not a second button beside it');
      check(r.finishStillLive, '  and "Finish the lesson" is still live beside it');
      check(r.onHub, '  it really returns to the hub');
      check(r.ticks === 1 && !!r.tickedJob, '  and exactly the job she finished carries the tick');
      check(r.badges === 0 && r.nexted === 0,
        '  NOTHING was awarded and nothing advanced — finishing a job writes no record (265a)');
    }

    /* ---------- (6) HIS TIME-UP SCENARIO, WALKED EXACTLY ---------- */
    console.log('\n=== (6) FINISH THE LESSON, FROM INSIDE A HALF-DONE JOB (his own scenario) ===');
    for (const L of LESSONS) {
      const ex = load(L).chunks.find(c => c.id === L.extras);
      const r = await pgNow.evaluate(async ([mt, ch]) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        eval(mt)(ch, false);
        await wait(80);
        const host = document.getElementById('host');
        host.querySelectorAll('.pyrun-job')[2].click();
        await wait(120);
        Array.from(host.querySelectorAll('.pyt-list .pyrun-line')).slice(0, 2).forEach(n => n.click());
        await wait(60);
        const mid = host.querySelectorAll('.pyp-list .pyrun-line').length;
        host.querySelector('.pyrun-card .pyrun-finish').click();
        await wait(200);
        return { mid, nexted: window.__nexted, badges: window.__badges, xp: window.__xp, fin: window.__fin };
      }, [MOUNT, ex]);
      check(r.mid === 2, L.id + ': she is genuinely half way through a job (2 lines placed)');
      check(r.nexted === 1, '  pressing Finish the lesson ADVANCES the lesson — the closing cards are next');
      check(r.badges === 0 && r.xp == null,
        '  and it awards NOTHING: no badge, no bonus, nothing written  (265a — so leaving costs her nothing)');
    }

    /* ---------- (7) REVIEW MODE ---------- */
    console.log('\n=== (7) THE ZONE IS LIVE IN REVIEW MODE, AND SAYS SO (265d) ===');
    for (const L of LESSONS) {
      const ex = load(L).chunks.find(c => c.id === L.extras);
      const r = await pgNow.evaluate(async ([mt, ch]) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        eval(mt)(ch, true);
        await wait(80);
        const host = document.getElementById('host');
        const c = host.querySelector('.pyrun-hub');
        if (!c) return { err: 'no hub in review' };
        const lead = (c.querySelector('.intro-lead') || {}).textContent || '';
        c.querySelectorAll('.pyrun-job')[0].click();
        await wait(120);
        return {
          lead,
          jobOpens: !!host.querySelector('.pyrun-card'),
          trayLive: host.querySelectorAll('.pyt-list .pyrun-line').length,
          clickable: !Array.from(host.querySelectorAll('.pyt-list .pyrun-line')).some(n => n.disabled),
          exitRow: !!host.querySelector('.pyrun-card .pyrun-finish')
        };
      }, [MOUNT, ex]);
      check(!r.err, L.id + ': the hub renders in review mode');
      check(r.lead.indexOf(ex.config.reviewIntro) === 0,
        '  and it OPENS with the review line, so the mode announces itself (DFM 146e)');
      check(r.jobOpens && r.trayLive > 0 && r.clickable,
        '  a job really opens and its lines are really live — not a read-only picture of one');
      check(r.exitRow, '  and the way out is on it in review too');
    }

    /* CONTROL: the same content against the PRE-CHANGE engine is unusable. */
    console.log('\n=== CONTROL: THE PRE-CHANGE ENGINE CANNOT SERVE THIS ZONE AT ALL ===');
    for (const L of LESSONS) {
      const ex = load(L).chunks.find(c => c.id === L.extras);
      const r = await pgOld.evaluate(async ([mt, ch]) => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        eval(mt)(ch, false);
        await wait(120);
        const host = document.getElementById('host');
        return {
          hub: !!host.querySelector('.pyrun-hub'),
          jobs: host.querySelectorAll('.pyrun-job').length,
          finish: host.querySelectorAll('.pyrun-finish').length
        };
      }, [MOUNT, ex]);
      control(!r.hub && r.jobs === 0 && r.finish === 0,
        L.id + ': ' + BASE_REF + '\'s engine draws NO hub, NO job list and NO way out for this ' +
        'chunk — every check above fails against the build he has already sat');
    }

    check(eNow.length === 0, 'no uncaught page errors while driving the zone' +
      (eNow.length ? '  [' + eNow.slice(0, 2).join(' | ') + ']' : ''));
  } finally {
    await browser.close();
  }

  /* ---------- (8) THE SOURCE RATCHETS ---------- */
  console.log('\n=== (8) NO PROMISE OF POINTS, AND ONE FACT IN ONE WORDING ===');
  for (const L of LESSONS) {
    const lesson = load(L);
    const ex = lesson.chunks.find(c => c.id === L.extras);
    const all = [];
    (function walk(n) {
      if (typeof n === 'string') { all.push(n); return; }
      if (Array.isArray(n)) return n.forEach(walk);
      if (n && typeof n === 'object') Object.values(n).forEach(walk);
    })(ex);
    const xp = all.filter(s => /\bXP\b/i.test(s));
    check(xp.length === 0, L.id + ': not one string anywhere in the extras chunk mentions XP' +
      (xp.length ? '  [' + xp[0].slice(0, 60) + ']' : ''));
    control(/\bXP\b/i.test('It is worth **5 XP** if you get the console to print the target.'),
      '  (and the test really catches the promise the V54 offer carried)');

    /* the label and the card it delivers her to must say the SAME thing */
    const closer = lesson.chunks.find(c => c.id === 'next');
    const help = String((closer.config || {}).help || '');
    const tail = String(ex.config.finishLabel).split('—').pop().trim();
    check(help.toLowerCase().indexOf(tail.toLowerCase()) > -1,
      '  the finish label\'s promise ("' + tail + '") is word for word what the card it ' +
      'delivers her to says — one fact, one wording (DFM 144/167b)');

    /* the jobs the hub lists are the jobs the answer keys can drive */
    ex.config.builds.forEach(b => {
      const k = lesson.keys[b.id];
      check(!!(k && k.order && k.order.length),
        '  job ' + b.id + ' has an answer key, so every walker and qa-pyrun can drive it');
      check(!!b.title && !!b.whiff, '  job ' + b.id + ' carries a title and a whiff for the hub');
      check(b.tab === undefined,
        '  job ' + b.id + ' declares no `tab` — the zone has no step strip, so a tab would be ' +
        'text no pupil ever reads (DFM 155)');
    });
  }

  console.log('\n' + (failures ? 'qa-extras-zone: ' + failures + ' FAILURE(S)' : 'qa-extras-zone: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();
