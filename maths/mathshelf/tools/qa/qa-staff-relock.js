#!/usr/bin/env node
/* qa-staff-relock.js — THE MARKBOOK RE-GATES WHEN IT IS LEFT.
 *
 * G-H4, from KS3 DT's C-08: a staff panel that never re-locked once opened. On
 * a smartboard that means a class's names, marks and misconceptions stay on the
 * wall at the front of the room after the teacher walks away from the desk.
 *
 * Three things, and the third is the one people forget:
 *   1. leaving the markbook (back to the cover) asks for the passcode again;
 *   2. fifteen minutes of nothing does the same, and says why;
 *   3. the passcode is NEVER written to the device on the live tier — the
 *      offline preview's `demo` is the one exemption, and it is tier-gated.
 * And when it closes, the class's data leaves the DOM with it.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const B = require('./lib/browser.js');
const S = require('./lib/stage.js');
const { stripComments } = require('./lib/decl.js');

const TIER = 'full';
const ORDER = 77;
const COVERS = { books: '*', kinds: [], surfaces: ['staff-cover', 'class-page'], widths: [1280], projector: false, tier: ['preview'], cells: ['relock'] };
const CONTROLS = [
  { id: 'panel-stays-open', kind: 'fixture', plant: 'fixture-no-relock', mustFail: /straight back into/ },
  { id: 'passcode-persisted', kind: 'mutation', plant: 'fixture-persist-passcode', mustFail: /written to the device/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-staff-relock');

/* the source half: the passcode never reaches storage, and the clock exists */
{
  const src = stripComments(A.read(A.app('staff.js')));
  const persists = /(localStorage|sessionStorage)\.setItem\([^)]*passcode/i.test(src);
  g.check(!persists, 'staff.js', 'relock',
    'the staff passcode is written to the device — anybody who opens this browser afterwards is in the markbook');
  g.check(/IDLE_RELOCK/.test(src), 'staff.js', 'relock',
    'there is no idle clock on the markbook — on a smartboard a class list stays on the wall until somebody notices');
  g.check(/passcode\s*=\s*null/.test(src), 'staff.js', 'relock',
    'nothing clears the passcode when the markbook closes, so re-entering would not ask for it again');
}

(async () => {
  const browser = await B.launch();
  try {
    const page = await S.openApp(browser, { width: 1280, staff: true });
    /* we are in: open a class, then leave */
    const inMarkbook = await page.evaluate(() => !!document.querySelector('#st-rows, .cp-books'));
    g.check(inMarkbook, 'staff-cover', 'relock', 'the passcode did not open the markbook, so nothing after this is proved');

    const stored = await page.evaluate(() => Object.keys(localStorage).filter(k => /pass/i.test(k) || /pass/i.test(String(localStorage.getItem(k)))).length);
    g.check(stored === 0, 'the device', 'relock',
      'something with the passcode in it was written to the device — the preview seeds a demo class, but the passcode itself never persists');

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.toolbtn, button')].filter(x => /Close the markbook/.test(x.textContent))[0];
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const left = await page.evaluate(() => ({
      onCover: !document.getElementById('scr-cover').hidden,
      classDataInDom: /10B Maths|Aoife|Caoimhe/.test(document.getElementById('scr-staff').innerHTML)
    }));
    g.check(left.onCover, 'staff-cover', 'relock', 'closing the markbook did not return to the cover');
    g.check(!left.classDataInDom, 'staff-cover', 'relock',
      'the class\'s names and marks are still in the page after the markbook closed — on a smartboard they are still on the wall');

    /* re-entering asks again */
    await page.evaluate(() => document.getElementById('cover-staff').click());
    await new Promise(r => setTimeout(r, 400));
    const asks = await page.evaluate(() => !!document.querySelector('#st-pass'));
    g.check(asks, 'staff-cover', 'relock',
      'reopening walked straight back into the markbook with no passcode — the gate is the passcode, and a gate that only asks once is not a gate');
    await page.close();
  } finally { await browser.close(); }
  g.done();
})().catch(e => { console.log('  FAIL  qa-staff-relock x crash: ' + (e && e.stack ? e.stack : e)); process.exit(1); });
