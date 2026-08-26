/* J3 Lesson 2 "First Words in Python" — the film. TEXT-BASED, silent, captioned,
   four chapters, ~4 minutes (runner spec §D).

   CHAPTER 3 REUSES THE APPROVED VARIABLE ANIMATION, WITH A FRESH CAPTION PASS.
   Spec §D says so in as many words, and DFM 174/180 is why it exists: an
   abstract idea earns a purpose-built animation. The 3D box is his own
   commission (9 Aug 2026) and it is not re-invented here — only its captions are
   written again for a class that has never seen a line of code in any language,
   and that has not met the micro:bit the J1 version ends on. Beat 6 of that
   animation IS about a micro:bit, so this film stops at beat 5 and comes back to
   the console; showing a class a device they do not have would be the dead
   control DFM 42/143 forbids, in film form.

   THE REST IS THE PURPOSE-BUILT PYTHON STAGE (lib/py-stage) for the same reason
   J2's film uses it: nothing this lesson teaches lives in an editor.

   Chapter labels feed the platform's video engine `chapters` config, and the
   REAL measured times from assemble.js replace the placeholders in j3-02.json.

   node lib/record.js j3-l2          all chapters
   node assemble.js j3-l2            stitch + chapters.json
*/
const path = require('path');

const STAGE = 'file://' + path.join(__dirname, '..', 'lib', 'py-stage', 'index.html');
const VBOX = 'file://' + path.join(__dirname, '..', 'lib', 'variable-box', 'index.html');
const DASH = '—';
const KICKER = 'J3 · LESSON 2 · FIRST WORDS IN PYTHON';

async function openStage(page, cine) {
  await page.goto(STAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.pystage, null, { timeout: 15000 });
  await page.evaluate(() => window.pystage.reset());
  await cine.install();
}

async function assertStage(page, want) {
  const p = await page.evaluate(() => window.pystage.probe());
  if (want.rows != null && p.rows !== want.rows) throw new Error('program has ' + p.rows + ' line(s), wanted ' + want.rows);
  if (want.console != null && p.console !== want.console) throw new Error('console reads ' + JSON.stringify(p.console) + ', wanted ' + JSON.stringify(want.console));
  if (want.consoleHas && p.console.indexOf(want.consoleHas) === -1) throw new Error('console does not contain ' + JSON.stringify(want.consoleHas) + ' — it reads ' + JSON.stringify(p.console));
  return p;
}

/* NO BLOCK EVER APPEARS ON CAMERA IN THIS FILM, AND THAT IS DECLARED RATHER
   THAN LEFT BLANK (DFM 207c). J2's Lesson 2 film puts four real Scratch blocks
   up and each one has to say where it is taught. This film has none: it is
   Python from nothing, a 3D box with a name on it, and a console. An ABSENT
   manifest and an EMPTY one look the same to a reader and mean opposite things
   — "nobody checked" against "checked, and there are none" — so it is written
   down. If a block ever does appear here, this list is where it is declared. */
const BLOCKS_ON_CAMERA = [];

const scenes = [
/* ---- THE WORKED EXAMPLE IS NEUTRAL — DFM 210, applied 25 Aug 2026 --------
   Until today this film typed the pupils' own builds on camera, line for line:
   ch1 and ch2 typed `print("THE HARBOUR LIGHT")` and `print("Doors open at 7")`
   — builds 1 and 2's exact answers — and ch3 typed all three lines of build
   3 and printed both of its target lines. A pupil who watched the film met
   three of her four builds already done for her, which is exactly the line DFM
   210 draws: the worked example is never the pupil's own build.
   The film's demo house is now **THE RIVER STAGE, doors at 8**, and ch3's two
   print lines say **Curtain up at** and **See you again at** rather than build
   3's own **Tonight at** and **Thank you for coming to**. That last part is not
   fussiness: renaming only the theatre would have left
   `print("Tonight at " + venue)` on camera VERBATIM, which is a line of build 3
   however different the string inside the box is. The same beats, the same line
   shapes and the same captions survive, so what the film TEACHES is untouched
   and what it HANDS OVER is gone. Builds 1–4 keep THE HARBOUR LIGHT and doors at 7 — they are the
   pupil's own work, which is the point.
   SCOPE, REPORTED RATHER THAN QUIET: the round's spec lists j3 ch1–ch2 under
   NOT TOUCHED while Job 6b binds "no line of builds 1–3 typed on camera". Those
   two sentences cannot both hold, because ch1 and ch2 are where builds 1 and 2
   are typed. The binding requirement wins and the rename reaches all three
   chapters; leaving ch1/ch2 would have fixed his finding for one build and left
   it standing for two. */
  /* ------------------------------------------------------------------ ch1 */
  {
    id: 'ch1',
    label: 'What Python is',
    tailMs: 1400,
    run: async ({ page, cine }) => {
      await openStage(page, cine);
      await cine.curtain({
        kicker: KICKER, title: 'What Python is',
        sub: 'a language you type ' + DASH + ' starting from nothing'
      });
      await page.evaluate(() => { window.pystage.eyebrow('YOU TYPE IT. THE COMPUTER DOES IT.'); window.pystage.program('Your program'); });
      await page.waitForTimeout(700);
      await cine.lift();

      await cine.caption('Python is a language for telling a computer what to do. You type it, one line at a time, and it does exactly what the lines say.');
      await page.evaluate(() => window.pystage.addLine('print("THE RIVER STAGE")'));
      await cine.pause(800);
      await cine.caption('That is a real line of Python. Nothing is hidden and nothing is clever &mdash; the whole language is lines like this one, stacked up.');
      await cine.caption('It is one of the most used languages in the world. A great deal of the software you use every day is written in it.');
      await cine.caption('You are starting from nothing today. Nothing is assumed, and everything you meet in this hour is taught in this hour.');
      await assertStage(page, { rows: 1 });
      await cine.drop({});
      await cine.pause(900);
    },
    verify: async ({ page }) => { await assertStage(page, { rows: 1 }); }
  },

  /* ------------------------------------------------------------------ ch2 */
  {
    id: 'ch2',
    label: 'print, exactly',
    tailMs: 1400,
    run: async ({ page, cine }) => {
      await openStage(page, cine);
      await cine.curtain({ kicker: 'CHAPTER 2', title: 'print, exactly', sub: 'every letter, every space' });
      await page.evaluate(() => { window.pystage.eyebrow('MAKE THE CONSOLE SAY IT'); window.pystage.program('Your program'); window.pystage.consoleOpen('The console'); });
      await page.waitForTimeout(700);
      await cine.lift();

      await cine.caption('<b>print</b> is the Python word for putting something on the console. The console is the strip where a program&rsquo;s words come out.');
      await page.evaluate(() => window.pystage.addLine('print("THE RIVER STAGE")'));
      await cine.pause(700);
      await page.evaluate(() => window.pystage.print(['THE RIVER STAGE']));
      await cine.pause(1100);
      await assertStage(page, { rows: 1, console: 'THE RIVER STAGE' });
      await cine.caption('Whatever sits inside the speech marks comes out <b>exactly</b> as you typed it. Change one capital letter and the console prints a different line &mdash; exactly what you typed, never what you meant.');

      await page.evaluate(() => window.pystage.addLine('print("Doors open at 8")'));
      await cine.pause(700);
      await page.evaluate(() => window.pystage.print(['THE RIVER STAGE', 'Doors open at 8']));
      await cine.pause(1200);
      await assertStage(page, { rows: 2 });
      await cine.caption('Two print lines make two lines on the console, <b>in the order you stacked them</b>. Swap them round and the call sheet comes out wrong.');
      await cine.drop({});
      await cine.pause(900);
    },
    verify: async ({ page }) => { await assertStage(page, { rows: 2 }); }
  },

  /* ------------------------------------------------------------------ ch3 */
  {
    id: 'ch3',
    label: 'A box with a name on it (a variable)',
    tailMs: 1600,
    run: async ({ page, cine, log }) => {
      await page.goto(VBOX, { waitUntil: 'domcontentloaded' });
      await cine.install();
      await cine.curtain({ kicker: 'CHAPTER 3', title: 'A box with a name on it (a variable)', sub: 'one name, used twice' });
      await cine.pause(2400);
      await cine.lift();
      await page.evaluate(() => window.vb.ready);

      /* A FRESH CAPTION PASS AT THIS CLASS'S REGISTER, not J1's words. J1's
         beats end on a micro:bit; this class has never seen one, so this film
         stops at beat 5 and returns to the console it does have. */
      const BEATS = [
        'A computer remembers something by putting it in a box like this one. The box is called a <b>VARIABLE</b>.',
        'Every box has a <b>NAME</b> on it, so the computer can find the right one. This box is called <b>venue</b>.',
        'Inside goes the <b>VALUE</b> &mdash; the thing being remembered. This box is holding the name of tonight&rsquo;s theatre.',
        'Change what is in the box and every line that uses it changes too. You typed the name once, into one box.',
        'A box can hold a word or a number. Yours will hold both today: a theatre&rsquo;s name, and the price of a seat.'
      ];
      for (let i = 0; i < BEATS.length; i++) {
        await cine.captionShow(BEATS[i]);
        await page.evaluate(n => window.vb.play(n), i + 1);
        if (i === 0) {
          const first = await page.evaluate(() => window.vb.probe());
          if (!first.some(p => p.max > 60)) throw new Error('variable-box drew nothing after beat 1 — WebGL failed: ' + JSON.stringify(first));
          log('variable-box probe ok: ' + JSON.stringify(first.map(p => p.max)));
        }
        await cine.pause(600);
      }
      await cine.captionHide();
      const last = await page.evaluate(() => window.vb.probe());
      if (!last.some(p => p.max > 60)) throw new Error('variable-box went blank mid-take');

      await openStage(page, cine);
      await cine.ensureCursor(640, 620);
      await page.evaluate(() => { window.pystage.eyebrow('THE SAME BOX, IN PYTHON'); window.pystage.program('Your program'); window.pystage.consoleOpen('The console'); });
      for (const t of ['venue = "THE RIVER STAGE"', 'print("Curtain up at " + venue)', 'print("See you again at " + venue)']) {
        await page.evaluate(l => window.pystage.addLine(l), t);
      }
      await cine.pause(800);
      await cine.caption('A line with <b>=</b> in it makes the box: the name on the left, what goes in it on the right. It does not mean &ldquo;is the same as&rdquo;.');
      await cine.caption('The two print lines then use that box. A <b>+</b> sticks two pieces together: the words in speech marks, then whatever is inside the box.');
      await page.evaluate(() => window.pystage.print(['Curtain up at THE RIVER STAGE', 'See you again at THE RIVER STAGE']));
      await cine.pause(1300);
      await assertStage(page, { rows: 3, consoleHas: 'Curtain up at THE RIVER STAGE' });
      await cine.caption('You typed the name once, and it printed twice. That is the whole point of a <b>variable</b> &mdash; a box with a name on it.');
      await cine.drop({});
      await cine.pause(900);
    },
    verify: async ({ page }) => { await assertStage(page, { rows: 3 }); }
  },

  /* ------------------------------------------------------------------ ch4 */
  {
    id: 'ch4',
    label: 'Reading an error without fear',
    tailMs: 4200,
    run: async ({ page, cine }) => {
      await openStage(page, cine);
      await cine.curtain({ kicker: 'CHAPTER 4', title: 'Reading an error without fear', sub: 'an error is information, not a telling-off' });
      await page.evaluate(() => { window.pystage.eyebrow('WHEN PYTHON STOPS'); window.pystage.program('Your program'); window.pystage.consoleOpen('The console'); });
      await page.waitForTimeout(700);
      await cine.lift();

      await page.evaluate(() => window.pystage.addLine('print(venue)'));
      await cine.pause(700);
      await cine.caption('Here is a line with a mistake in it, on purpose. Nothing has made a box called <b>venue</b> yet, so Python cannot find one.');
      await page.evaluate(() => window.pystage.error(
        "NameError: name 'venue' is not defined on line 1",
        'Python does not know that name. Words you want printed have to sit inside speech marks.'));
      await page.evaluate(() => window.pystage.bad(0));
      await cine.pause(1400);
      await assertStage(page, { consoleHas: 'NameError' });
      await cine.caption('The console shows you <b>Python&rsquo;s own words</b>, and underneath them one line in plain English. Never one instead of the other.');
      await cine.caption('It even tells you the line number. An error is the computer telling you what it found &mdash; it is not a mark, and nothing is taken off you.');

      await page.evaluate(() => { window.pystage.program('Your program'); window.pystage.consoleOpen('The console'); });
      await page.evaluate(() => window.pystage.addLine('print("venue")'));
      await cine.pause(700);
      await page.evaluate(() => window.pystage.print(['venue']));
      await cine.pause(1200);
      await assertStage(page, { rows: 1, console: 'venue' });
      await cine.caption('Speech marks fix it, because now it is just letters. Without them, Python goes looking for a box with that name.');

      await cine.card({
        kicker: 'NOW IT IS YOUR TURN', title: 'Four builds, and a call sheet that prints itself',
        lines: [
          'Each build shows you <b>The target</b> &mdash; exactly what the console has to print',
          'You drag the lines you want, type into any gap, and press <b>RUN</b>',
          'MATCHED means it came out exactly right. NOT YET means it did not, and you get your lines back &mdash; a run that does not work costs you nothing'
        ]
      }, 10500);
      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ page }) => { await assertStage(page, { rows: 1, console: 'venue' }); }
  }
];

module.exports = { scenes, BLOCKS_ON_CAMERA };
