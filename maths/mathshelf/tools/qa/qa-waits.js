#!/usr/bin/env node
/* qa-waits.js — EVERY ROUND TRIP OWNS ITS WAITING STATE, IN THE SAME TICK.
 *
 * G-F5 / DFM 42, 161, and rule 22. Two different faults, and the second is the
 * one that costs a pupil her work:
 *
 *   A CONTROL THAT GOES DEAD. She presses something, the page does nothing
 *   visible for a second and a half, and she presses it again. The busy state
 *   has to appear in the SAME TICK as the press, not when the answer comes back.
 *
 *   A SAVE THAT FAILS SILENTLY. v4 puts a relay hop in front of every call, so
 *   a save has further to go than it used to. The screen never claims saving
 *   that is not happening: the attempt is kept on the device under
 *   outbox:<class>:<email>:<book> until the server acknowledges it, she is told
 *   if it is taking too long, and a reload puts it back before the book opens.
 *
 * MEASURED AT LIVE SPEED. A local preview answers instantly, so a gate run
 * against it would pass a control that has no busy state at all. The transport
 * is slowed to two seconds first — the qa-skip-guard trick — so the gap a pupil
 * would see is the gap this gate sees.
 *
 * RULINGS 46/47/48 (12 Sept 2026) fold in here rather than opening a sixth
 * gate, because they are the same law read twice: the passcode wait is now
 * measured as the PUPIL's own is-waiting line, not the staff gold card
 * (ruling 46 moved the fault, this gate's rendered-frame check moves with
 * it); and a pupil's own save gets the identical treatment on her side of
 * the app — quiet while it runs, honest only once it is genuinely late
 * (ruling 48: a save that takes 12-40 s and completes is not trouble at 8 s).
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const S = require('./lib/stage.js');
const { stripComments } = require('./lib/decl.js');

const TIER = 'full';
const ORDER = 74;
const COVERS = { books: '*', kinds: [], surfaces: '*', widths: [1280], projector: false, tier: ['preview'], cells: ['waits'] };
const CONTROLS = [
  { id: 'control-with-no-busy-state', kind: 'fixture', plant: 'fixture-renderers', mustFail: /with nothing on screen/ },
  { id: 'outbox-dropped-on-reload', kind: 'fixture', plant: 'fixture-no-outbox', mustFail: /her work would be gone/ },
  /* rulings 34/35/37, 11 Sept 2026: a wait card that is declared but does not
     actually move on screen, and a tick that moves only after the server
     answers, are both "a breath the eye cannot see is not a breath" - the same
     fault as a busy state that never appears, one frame later. */
  { id: 'wait-card-still', kind: 'fixture', plant: 'fixture-passcode-line-still', mustFail: /does not breathe in rendered frames/ },
  { id: 'tick-waits', kind: 'fixture', plant: 'fixture-tick-waits', mustFail: /waits for the server before it moves/ },
  { id: 'outbox-warns-at-eight', kind: 'fixture', plant: 'fixture-outbox-warns-at-eight', mustFail: /a trouble card before 30 s/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-waits');

/* the source half: the outbox exists, and it is on the save path */
{
  const src = stripComments(A.read(A.app('script.js')));
  g.check(/outbox:/.test(src), 'script.js', 'waits',
    'there is no outbox — a save that fails would take her attempt with it, and the screen would say nothing');
  g.check(/outboxReplay/.test(src) && /call\('load'/.test(src), 'script.js', 'waits',
    'nothing replays an unsent attempt when the book opens — her work would be gone the next time she looked, and she would have no way to know why');
  g.check(/saveTrouble/.test(src), 'script.js', 'waits',
    'a save that has not landed says nothing on screen — a screen must never claim saving that is not happening');
}

(async () => {
  const browser = await B.launch();
  try {
    const page = await S.openApp(browser, { width: 1280 });
    /* SLOW THE TRANSPORT to live speed before asking anything */
    await page.evaluate(() => {
      const real = window.GJ.app.call;
      window.GJ.app.call = function (a, p) { return new Promise(r => setTimeout(() => real(a, p).then(r), 2000)); };
    });
    /* every control that triggers a call declares what it is waiting for */
    const declared = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('[data-busy-for]').forEach(e => out.push({
        sel: String(e.className).split(' ')[0] || e.id, action: e.getAttribute('data-busy-for')
      }));
      return out;
    });
    g.check(declared.length > 0, 'the app', 'waits',
      'no control anywhere declares data-busy-for — nothing can be held to owning its waiting state');
    g.note(declared.length + ' controls declare what they are waiting for: ' + declared.map(d => d.action).join(', '));

    /* the outbox really holds an attempt while a save is in flight */
    const held = await page.evaluate(async () => {
      const before = Object.keys(localStorage).filter(k => k.indexOf('outbox:') === 0).length;
      return { before: before, keys: Object.keys(localStorage).slice(0, 6) };
    });
    g.note('outbox keys on this device at rest: ' + held.before);
    await page.close();

    /* ═══ THE STAFF SIDE (rulings 34/35/37/46, 11-12 Sept 2026) ═════════
       A rendered-frame check for the passcode screen's wait line. Ruling 46
       moved this from the staff gold card to the pupil's own is-waiting line
       ("I want it to flash like the 'getting your details' message... not
       gold"), so the check now demands the pupil line's class AND its own
       turning mark - not just an opacity swing that could belong to either.
       It is not enough for the CSS to declare an animation, because a card
       that is replaced, re-parented, or sitting under a media query nobody
       expected can carry an animation nobody ever sees. Two samples 700ms
       apart, on the actual computed opacity of the actual element on screen,
       at live transport speed - a full 1.5s breath goes 1 -> .58 (or deeper)
       -> 1, so two points 700ms apart must differ by at least 0.15 or the
       breath is not there for a human either. */
    const fs = require('fs');
    const outDir = A.qa('out/polish/E');
    fs.mkdirSync(outDir, { recursive: true });
    const staffPage = await B.newPage(browser, { width: 1280 });
    await staffPage.goto(S.BASE + '?class=demo&nointro&reserve=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));
    await staffPage.evaluate(() => localStorage.clear());
    await staffPage.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    /* slow the transport BEFORE the passcode is submitted, so the busy card
       is actually on screen long enough to sample twice */
    await staffPage.evaluate(() => {
      const real = window.GJ.app.call;
      window.GJ.app.call = function (a, p) { return new Promise(r => setTimeout(() => real(a, p).then(r), 2000)); };
    });
    await staffPage.evaluate(() => document.getElementById('cover-staff').click());
    await staffPage.waitForFunction(() => !!document.querySelector('#st-pass') && !!document.querySelector('#st-go'),
      { timeout: 15000 }).catch(() => {});
    await staffPage.evaluate(() => {
      const i = document.querySelector('#st-pass');
      if (!i) throw new Error('the staff passcode box never appeared');
      i.value = 'demo';
      document.querySelector('#st-go').click();
    });
    const sample = () => staffPage.evaluate(() => {
      const m = document.querySelector('#st-msg');
      if (!m) return null;
      const before = getComputedStyle(m, '::before');
      return {
        opacity: parseFloat(getComputedStyle(m).opacity),
        className: m.className,
        beforeAnim: before ? before.animationName : null
      };
    });
    const frame1 = await sample();
    await staffPage.screenshot({ path: outDir + '/passcode-frame-1.png' }).catch(() => {});
    await new Promise(r => setTimeout(r, 700));
    const frame2 = await sample();
    await staffPage.screenshot({ path: outDir + '/passcode-frame-2.png' }).catch(() => {});
    const bothWaiting = !!(frame1 && frame2 && /\bis-waiting\b/.test(frame1.className) && /\bis-waiting\b/.test(frame2.className));
    const beforeTurns = !!(frame1 && frame1.beforeAnim && frame1.beforeAnim !== 'none');
    const diff = (frame1 && frame2) ? Math.abs(frame1.opacity - frame2.opacity) : 0;
    g.note('passcode wait line: t=' + JSON.stringify(frame1) + ', t+700ms=' + JSON.stringify(frame2) + ', diff=' + diff.toFixed(3));
    g.check(bothWaiting && diff >= 0.15 && beforeTurns, 'style.css :: .is-waiting', 'waits',
      'the passcode waiting line does not breathe in rendered frames — a breath the eye cannot see is not a breath');
    await staffPage.close();

    /* A TICK REACTS AT ONCE: the box must already be flipped, and the message
       slot must already be the gold wait-card, in the SAME synchronous turn as
       the change event - never after the (here, slowed) server round trip. */
    const teacherPage = await S.openApp(browser, { width: 1280, staff: true });
    await teacherPage.evaluate(() => {
      const real = window.GJ.app.call;
      window.GJ.app.call = function (a, p) { return new Promise(r => setTimeout(() => real(a, p).then(r), 2000)); };
    });
    const tick = await teacherPage.evaluate(() => {
      const cb = document.querySelector('.acts-ticks input[type=checkbox]');
      if (!cb) return { found: false };
      const before = cb.checked;
      cb.click();
      const cmsg = document.querySelector('#st-cmsg');
      return {
        found: true,
        flippedAtOnce: cb.checked !== before,
        cmsgIsBusyCard: !!(cmsg && /\bpanel-loading\b/.test(cmsg.className))
      };
    });
    await teacherPage.screenshot({ path: outDir + '/tick-saving.png' }).catch(() => {});
    g.check(tick.found, 'staff.js :: showClasses', 'waits',
      'no class tickbox was found to test — Set-up must show at least one class with a book to tick');
    if (tick.found) {
      g.check(tick.flippedAtOnce && tick.cmsgIsBusyCard, 'staff.js :: addTick', 'waits',
        'a tick waits for the server before it moves — the box flips at once and the card says it is saving');
    }
    await teacherPage.close();

    /* ═══ A PUPIL'S OWN SAVE (ruling 48, 12 Sept 2026) ══════════════════
       His Executions log showed her live saves taking 12-40 s and every one
       completing, while the screen told her at 8 s that it had failed.
       script.js's pupil-side `call()` is a private closure - flushSave never
       goes through `window.GJ.app.call` (only staff.js's admin calls do, via
       `window.GJ.app.call('admin', p)`), so slowing HER save needs the other
       door `call()` already checks first: `window.OLS_TRANSPORT`. Installed
       only once she is already inside a book (boot and the book-open used the
       real, fast, offline path), so only what happens next - her save - is
       slowed. 'save' answers after a SIMULATED 20 s - inside a real save's
       own range, and well past the dead clock this replaces - everything
       else at 2 s. */
    const pupilPage = await S.openApp(browser, { width: 1280 });
    const book0 = A.books()[0];
    const gotIn = await S.openExercise(pupilPage, book0, 0);
    g.check(!!gotIn, 'lib/stage.js :: openExercise', 'waits',
      'could not open a book to test the pupil save law (' + book0 + ') — nothing below this was checked');
    if (gotIn) {
      await pupilPage.evaluate(() => {
        window.OLS_TRANSPORT = {
          call: function (p) {
            var ms = (p.action === 'save') ? 20000 : 2000;
            return new Promise(function (resolve) { setTimeout(function () { resolve({ ok: true }); }, ms); });
          }
        };
      });
      await pupilPage.evaluate(() => { window.GJ.app.save(); });
      /* scheduleSave debounces up to ~10s in general, but her very first save
         this session has nothing to debounce against (lastSave is 0), so the
         line should be up well inside 4s - give it that long, not the full
         debounce, so a genuinely missing line still fails this check. */
      await pupilPage.waitForFunction(() => !!document.querySelector('#act-saving.is-waiting'),
        { timeout: 4000 }).catch(() => {});
      const appeared = await pupilPage.evaluate(() => !!document.querySelector('#act-saving.is-waiting'));
      g.check(appeared, 'script.js :: saveLine', 'waits',
        'the quiet "Saving…" line never appeared within 4 s of the save being scheduled — a save that gives no sign it started is a save she cannot trust');

      if (appeared) {
        /* the line itself breathes, same law as the passcode line above */
        const sampleLine = () => pupilPage.evaluate(() => {
          const m = document.getElementById('act-saving');
          return m ? { opacity: parseFloat(getComputedStyle(m).opacity), className: m.className } : null;
        });
        const lf1 = await sampleLine();
        await new Promise(r => setTimeout(r, 700));
        const lf2 = await sampleLine();
        const lineDiff = (lf1 && lf2) ? Math.abs(lf1.opacity - lf2.opacity) : 0;
        g.note('pupil save line: t=' + JSON.stringify(lf1) + ', t+700ms=' + JSON.stringify(lf2) + ', diff=' + lineDiff.toFixed(3));
        g.check(!!(lf1 && lf2 && lineDiff >= 0.15), 'style.css :: .act-saving', 'waits',
          'the pupil save line does not breathe in rendered frames — a breath the eye cannot see is not a breath');

        /* the ten seconds that prove the eight-second clock is gone, without
           spending the full thirty on it (DFM: build time is a budget) */
        await new Promise(r => setTimeout(r, 10000));
        const troubleAt10 = await pupilPage.evaluate(() => !!document.getElementById('gj-save-trouble'));
        g.check(!troubleAt10, 'script.js :: OUTBOX_WARN', 'waits',
          'a trouble card before 30 s — she is told her live save has failed while it is still quietly running');
      }
    }
    await pupilPage.close();
  } finally { await browser.close(); }
  g.done();
})().catch(e => { console.log('  FAIL  qa-waits x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
