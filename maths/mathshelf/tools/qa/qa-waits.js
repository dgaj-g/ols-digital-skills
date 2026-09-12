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
 *
 * RULING 51 (12 Sept 2026, the store and the films cut): apiCall itself runs
 * 3-68 s against a 1-7 s Sheet write. Ruling 48's card already waits for the
 * genuine 30 s; what was still missing is what happens AFTER it appears - it
 * used to just sit there until tapped. Now it re-sends by itself every 20 s
 * and clears itself the moment a retry lands, and a call the store outright
 * REFUSES (bad-secret/not-configured/no-secret-configured) is named at once
 * instead, because retrying that one would never help. Both measured at the
 * app's own real clocks, with the store stubbed to answer only after real
 * wall-clock time has passed - a control that faked the delay would prove
 * nothing about the 30 s and 20 s the pupil's own device actually waits on.
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
  /* ruling 51, 12 Sept 2026: the card the pupil's own device raises must heal
     itself - re-sending by itself and clearing itself once a retry lands.
     This plants back the OLD card, which only ever came down on a tap. */
  { id: 'outbox-card-tap-only', kind: 'fixture', plant: 'fixture-outbox-card-tap-only', mustFail: /never re-sent by itself/ },
  /* THE STORE CUT (ruling 51, 12 Sept 2026): the page's own road to the store,
     and the relay kept as the road home when it is closed */
  { id: 'store-never-direct', kind: 'fixture', plant: 'fixture-store-no-direct', mustFail: /never took the direct path/ },
  { id: 'store-no-fallback', kind: 'fixture', plant: 'fixture-store-no-fallback', mustFail: /did not fall back to the relay/ },
  { id: 'store-no-refresh', kind: 'fixture', plant: 'fixture-store-no-refresh', mustFail: /token-expired reached the screen/ },
  { id: 'store-no-timeout', kind: 'fixture', plant: 'fixture-store-no-timeout', mustFail: /did not time out/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-waits');

/* the source half: the outbox exists, and it is on the save path */
{
  const src = stripComments(A.read(A.app('script.js')));
  g.check(/outbox:/.test(src), 'script.js', 'waits',
    'there is no outbox — a save that fails would take her attempt with it, and the screen would say nothing');
  /* a bare /outboxReplay/ still matched a renamed outboxReplayDISABLED - the
     substring survives a rename that removes the actual call. Requiring the
     opening paren is what tells "this function is invoked" from "this
     function's old name is still in here somewhere" apart. */
  g.check(/\boutboxReplay\s*\(/.test(src) && /call\('load'/.test(src), 'script.js', 'waits',
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

    /* THIS GATE'S OWN CORNER OF THE SHARED fixture-renderers PLANT (control
       control-with-no-busy-state): its injected Check button is exactly a
       control that can fire and has nothing on screen to say it is busy.
       fixtureBusy is null on the shipped app - nothing named fixture-q exists
       there - so this never runs outside that one sandbox. */
    const fixtureBusy = await page.evaluate(() => {
      const b = document.querySelector('[data-qid="fixture-q"] button');
      return b ? b.hasAttribute('data-busy-for') : null;
    });
    if (fixtureBusy !== null) {
      g.check(fixtureBusy, 'fixture-renderers.js :: Check button', 'waits',
        'a control with nothing on screen to say it is busy — every control that can fire a call declares data-busy-for, and this one does not');
    }

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

    /* ═══ THE OUTBOX HEALS ITSELF (ruling 51, 12 Sept 2026) ══════════════
       apiCall runs 3-68 s against a 1-7 s Sheet write, and a card that only
       ever comes down on a tap leaves her stranded for however long that
       gap actually is. Two more truths beyond ruling 48's own, both timed at
       the real 30 s / 20 s the app itself uses, not a friendlier stand-in:
       a card that is up because the store is genuinely LATE must clear
       itself the moment the store answers, with no tap anywhere, and it
       must have kept asking the store on her behalf while she waited - not
       merely be declared to; and a call the store REFUSES outright (not
       merely late) is named at once, whatever the clock says, because
       retrying it on her behalf would never help. */
    const healPage = await S.openApp(browser, { width: 1280 });
    const healBook = A.books()[0];
    const healIn = await S.openExercise(healPage, healBook, 0);
    g.check(!!healIn, 'lib/stage.js :: openExercise', 'waits',
      'could not open a book to test the self-healing outbox (' + healBook + ') — nothing below this was checked');
    if (healIn) {
      /* THE STUB IS GATED ON WALL-CLOCK TIME, not a fixed per-call delay: the
         store only starts saying ok once 45 real seconds have passed since
         the first save, exactly the scenario named in the brief, and every
         call (there or not) answers quickly - the only way a re-send the
         outbox sends while the first is already failing is a call this stub
         can actually see and count, rather than one the guard silently ate. */
      await healPage.evaluate(() => {
        window.__saveCalls = 0;
        window.__t0 = Date.now();
        window.OLS_TRANSPORT = {
          call: function (p) {
            if (p.action !== 'save') return new Promise(function (r) { setTimeout(function () { r({ ok: true }); }, 300); });
            window.__saveCalls++;
            var late = (Date.now() - window.__t0) >= 45000;
            return new Promise(function (resolve) { setTimeout(function () { resolve({ ok: !!late }); }, 400); });
          }
        };
      });
      await healPage.evaluate(() => { window.GJ.app.save(); });

      /* NOT BEFORE 30 s - ruling 48's own law, still true for a failure that
         is merely late rather than refused (ruling 51 does not loosen it). */
      await new Promise(r => setTimeout(r, 24000));
      const early = await healPage.evaluate(() => !!document.getElementById('gj-save-trouble'));
      g.check(!early, 'script.js :: armSlowTimer', 'waits',
        'the outbox card appeared before 30 s for a save that was only late, not refused — a trouble card before 30 s');

      /* AT 30 s the card is up, and it names what it is doing rather than
         just repeating "still saving" with nothing said about the retry. */
      await new Promise(r => setTimeout(r, 11000));   // t ≈ 35 s since the save was asked for
      const atThirty = await healPage.evaluate(() => {
        const el = document.getElementById('gj-save-trouble');
        return { up: !!el, text: el ? el.textContent : null };
      });
      g.note('outbox card at t≈35s: ' + JSON.stringify(atThirty));
      g.check(atThirty.up, 'script.js :: armSlowTimer', 'waits',
        'the outbox card never appeared at all — a save that is genuinely late must say so by 30 s');

      /* THE SELF RE-SEND, PROVED BY COUNTING, not assumed from the card's
         own words: by now the loop has had one immediate tick at ~30 s on
         top of the original call, so the store must already have seen more
         than the one. */
      const midCalls = await healPage.evaluate(() => window.__saveCalls);
      g.check(midCalls > 1, 'script.js :: startOutboxRetry', 'waits',
        'the store had seen only ' + midCalls + ' save call 35 s in — the outbox never re-sent by itself');

      /* THE SELF CLEAR. Once wall-clock reaches 45 s the next tick the loop
         was already going to make answers ok, and the card must be gone by
         itself within moments of that - no tap anywhere. */
      await healPage.waitForFunction(() => !document.getElementById('gj-save-trouble'), { timeout: 25000 }).catch(() => {});
      const settled = await healPage.evaluate(() => ({
        cardGone: !document.getElementById('gj-save-trouble'), calls: window.__saveCalls, elapsed: Date.now() - window.__t0
      }));
      g.note('self re-send settle: ' + settled.calls + ' save call(s) seen by the stub, card gone=' + settled.cardGone + ' at t=' + settled.elapsed + 'ms');
      g.check(settled.cardGone, 'script.js :: saveTrouble', 'waits',
        'the trouble card did not clear itself once the store answered ok — it must go the moment a retry lands, with no tap anywhere');
      g.check(settled.calls > midCalls, 'script.js :: outboxRetryTick', 'waits',
        'the outbox stopped re-sending before the store ever answered ok (stuck at ' + settled.calls + ' calls) — a self re-send that gives up is not the law ruling 51 asked for');
    }
    await healPage.close();

    /* ═══ A REFUSAL IS NAMED AT ONCE (ruling 51) ══════════════════════════
       bad-secret / not-configured / no-secret-configured mean the store said
       no, not that it is slow - retrying will not fix it, so she is not made
       to wait thirty seconds, or watch a loop keep asking, to be told. */
    const refusedPage = await S.openApp(browser, { width: 1280 });
    const refusedIn = await S.openExercise(refusedPage, healBook, 0);
    g.check(!!refusedIn, 'lib/stage.js :: openExercise', 'waits',
      'could not open a book to test a refused save — nothing below this was checked');
    if (refusedIn) {
      await refusedPage.evaluate(() => {
        window.__saveCalls = 0;
        window.OLS_TRANSPORT = {
          call: function (p) {
            if (p.action !== 'save') return new Promise(function (r) { setTimeout(function () { r({ ok: true }); }, 300); });
            window.__saveCalls++;
            return new Promise(function (r) { setTimeout(function () { r({ ok: false, error: 'bad-secret' }); }, 500); });
          }
        };
      });
      await refusedPage.evaluate(() => { window.GJ.app.save(); });
      await refusedPage.waitForFunction(() => !!document.getElementById('gj-save-trouble'), { timeout: 8000 }).catch(() => {});
      const refused = await refusedPage.evaluate(() => {
        const el = document.getElementById('gj-save-trouble');
        return { up: !!el, text: el ? el.textContent : null, elapsed: Date.now() };
      });
      g.note('refused card inside 8s: ' + JSON.stringify(refused));
      g.check(refused.up, 'script.js :: flushSave', 'waits',
        'a refused save (bad-secret) raised no card at all — she is left with no honest word for a call the store outright refused, and ruling 51 says that one is named at once, not after 30 s');
      if (refused.up) {
        g.check(!/still saving/i.test(refused.text || ''), 'strings.js :: saveRefused', 'waits',
          'a refused save still shows the generic "still saving" wording — a refusal needs its own honest sentence, not the one that means "wait, it is trying again on its own"');
      }
      /* AND IT DOES NOT QUIETLY KEEP GOING: a further wait well past the 30 s
         mark, and the store must still have seen exactly the one call. */
      await new Promise(r => setTimeout(r, 30000));
      const refusedCalls = await refusedPage.evaluate(() => window.__saveCalls);
      g.check(refusedCalls === 1, 'script.js :: SAVE_REFUSED', 'waits',
        'a refused save was sent again on its own (' + refusedCalls + ' calls seen) — a refusal will not heal by retrying, so nothing should retry it for her');
    }
    await refusedPage.close();

    /* ═══ THE DIRECT PATH TO THE STORE (ruling 51, the store cut) ══════════
       When the page was served with a store token (BOOT.store), a call goes
       straight to the DATA web app by fetch - a simple request (text/plain,
       redirect: follow, no preflight) - and the relay is the road home when
       that road is closed: a network error, a 25 s silence, or a token the
       store will not take even after one fresh one. Measured on the app's
       own public call, with fetch and the relay both stubbed and COUNTED, so
       "the direct path was used" and "the relay was used" are counts, not
       claims. The preview serves no token, so the token is put on the boot
       object the app itself reads (GJ.app.boot IS the app's BOOT). */
    const storePage = await S.openApp(browser, { width: 1280 });
    const storeIn = await S.openExercise(storePage, healBook, 0);
    g.check(!!storeIn, 'lib/stage.js :: openExercise', 'waits',
      'could not open a book to test the direct path to the store — nothing below this was checked');
    const consoleLines = [];
    storePage.on('console', m => { try { consoleLines.push(m.text()); } catch (e) {} });
    if (storeIn) {
      await storePage.evaluate(() => {
        window.__relayCalls = []; window.__fetches = []; window.__mode = 'ok';
        window.OLS_TRANSPORT = {
          call: function (p) {
            window.__relayCalls.push(p.action);
            if (p.action === 'token') return Promise.resolve({ ok: true, store: { url: 'https://store.invalid/exec', email: 'you@offline.preview', exp: 9999999999, sig: 'FRESH' } });
            return new Promise(function (r) { setTimeout(function () { r({ ok: true, saved: true, via: 'relay' }); }, 200); });
          }
        };
        window.GJ.app.boot.store = { url: 'https://store.invalid/exec', email: 'you@offline.preview', exp: 9999999999, sig: 'OLD' };
        window.fetch = function (url, opts) {
          var body = {}; try { body = JSON.parse(opts.body); } catch (e) {}
          window.__fetches.push({ url: url, method: opts.method, ct: opts.headers && opts.headers['Content-Type'], redirect: opts.redirect, sig: body.sig, email: body.email, action: body.action, hasPayload: !!body.payload, hasSignal: !!opts.signal, hasSecret: 'secret' in body });
          var reply = function (o) { return Promise.resolve({ text: function () { return Promise.resolve(JSON.stringify(o)); } }); };
          if (window.__mode === 'ok') return reply({ ok: true, saved: true, via: 'store' });
          if (window.__mode === 'neterr') return Promise.reject(new TypeError('Failed to fetch'));
          if (window.__mode === 'expired') return reply(body.sig === 'FRESH' ? { ok: true, saved: true, via: 'store' } : { ok: false, error: 'token-expired' });
          if (window.__mode === 'hang') return new Promise(function (res, rej) {
            if (opts.signal) opts.signal.addEventListener('abort', function () { var e = new Error('aborted'); e.name = 'AbortError'; rej(e); });
          });
          return reply({ ok: false, error: 'unknown-mode' });
        };
      });
      const saveVia = (mode) => storePage.evaluate((mode) => {
        window.__mode = mode; window.__fetches.length = 0; window.__relayCalls.length = 0;
        var t0 = Date.now();
        return Promise.race([
          window.GJ.app.call('save', { act: 'angles', state: '{"v":1}', summary: '{}' }),
          new Promise(function (r) { setTimeout(function () { r({ testDeadline: true }); }, 40000); })
        ]).then(function (r) { return { r: r, fetches: window.__fetches.slice(), relay: window.__relayCalls.slice(), ms: Date.now() - t0, sig: window.GJ.app.boot.store.sig }; },
          /* a call that REJECTS is the worst answer of all - nothing came
             back, no road was taken - and it is recorded as such rather than
             crashing the gate, so the law below can say why by name */
          function (e) { return { r: { rejected: String(e && e.message || e) }, fetches: window.__fetches.slice(), relay: window.__relayCalls.slice(), ms: Date.now() - t0, sig: window.GJ.app.boot.store.sig }; });
      }, mode);

      /* 1. the direct road, taken, as a simple request */
      const ok = await saveVia('ok');
      g.note('direct path: ' + JSON.stringify(ok));
      g.check(ok.r && ok.r.ok && ok.r.via === 'store' && ok.fetches.length === 1 && ok.relay.length === 0, 'script.js :: storeCall', 'waits',
        'with a store token on the page the save never took the direct path (fetches=' + ok.fetches.length + ', relay=' + JSON.stringify(ok.relay) + ') — every call still takes the 3-68 s relay hop');
      const f0 = ok.fetches[0] || {};
      g.check(f0.method === 'POST' && f0.ct === 'text/plain' && f0.redirect === 'follow' && f0.hasSignal && f0.sig === 'OLD' && f0.action === 'save' && f0.hasPayload && !f0.hasSecret,
        'script.js :: storeCall', 'waits',
        'the direct request is not the simple request the 20:08 probe proved (POST, text/plain, redirect follow, a timeout signal, the token and no secret): ' + JSON.stringify(f0));

      /* 2. the road home: a network error, and the relay carries the save */
      const net = await saveVia('neterr');
      g.note('network error: ' + JSON.stringify(net));
      g.check(net.r && net.r.ok && net.r.via === 'relay' && net.relay.indexOf('save') > -1, 'script.js :: storeFallback', 'waits',
        'on a network error the direct path did not fall back to the relay (' + JSON.stringify(net.r) + ', relay=' + JSON.stringify(net.relay) + ') — a closed road with no way home is a lost save');
      g.check(consoleLines.some(l => /store: direct path/.test(l)), 'script.js :: storeFallback', 'waits',
        'the fallback said nothing in the console — a slow lesson could not be read afterwards');

      /* 3. an expired token: one fresh token from the front door, one retry, no relay */
      const exp = await saveVia('expired');
      g.note('expired token: ' + JSON.stringify(exp));
      g.check(exp.r && exp.r.ok && exp.r.via === 'store' && exp.fetches.length === 2 && exp.fetches[1].sig === 'FRESH' && exp.relay.join(',') === 'token' && exp.sig === 'FRESH',
        'script.js :: storeRefresh', 'waits',
        (exp.r && exp.r.error === 'token-expired' ? 'token-expired reached the screen — ' : '') + 'an expired token was not refreshed once and retried on the direct path (fetches=' + exp.fetches.length + ', relay=' + JSON.stringify(exp.relay) + ', kept sig=' + exp.sig + ')');

      /* 4. a store that never answers: 25 s, then the relay */
      const hang = await saveVia('hang');
      g.note('silent store: ' + JSON.stringify({ r: hang.r, ms: hang.ms, relay: hang.relay }));
      g.check(hang.r && hang.r.ok && hang.r.via === 'relay' && hang.ms >= 20000 && hang.ms < 38000, 'script.js :: STORE_TIMEOUT_MS', 'waits',
        'a store that never answered did not time out at 25 s and fall back to the relay (' + JSON.stringify(hang.r) + ' after ' + hang.ms + ' ms)');
    }
    await storePage.close();
  } finally { await browser.close(); }
  g.done();
})().catch(e => { console.log('  FAIL  qa-waits x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
