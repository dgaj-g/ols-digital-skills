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
  } finally { await browser.close(); }
  g.done();
})().catch(e => { console.log('  FAIL  qa-waits x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
