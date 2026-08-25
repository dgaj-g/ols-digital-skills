/* J2 Lesson 2 "Translation Bureau" — the film. TEXT-BASED, silent, captioned,
   four chapters, ~4 minutes (runner spec §C).

   WHY THERE IS NO EDITOR ON CAMERA. J1's four films drive MakeCode or Scratch
   live, because in those lessons the editor IS the thing being taught. Nothing
   in this hour lives in an editor: she reads six Scratch blocks she already has
   pictures of, and she assembles Python inside the platform's own build card.
   So the set is a purpose-built stage (lib/py-stage) that renders exactly three
   things — a block beside its Python twin, a program building up a line at a
   time, and a console printing what really came out.

   THE BLOCKS ON CAMERA ARE THE LESSON'S OWN BLOCKS. Every picture here is the
   same PNG the matching desk shows her, photographed out of the real Scratch
   editor. A film that drew its own blocks would be teaching her to read a
   picture she will never meet again (DFM 225b's family).

   Chapter labels here feed the platform's video engine `chapters` config, and
   the REAL measured times from assemble.js replace the placeholders in
   j2-02.json — one fact, one home (DFM 179d).

   node lib/record.js j2-l2          all chapters
   node lib/record.js j2-l2 ch2      one chapter
   node assemble.js j2-l2            stitch + chapters.json
*/
const path = require('path');
const { dataUri } = require('../lib/cinema');

const STAGE = 'file://' + path.join(__dirname, '..', 'lib', 'py-stage', 'index.html');
const BLOCKS = path.join(__dirname, '..', '..', '..', 'platform', 'assets', 'img', 'j2', 'blocks');
const IMG = (f) => dataUri(path.join(BLOCKS, f));
const DASH = '—';
const KICKER = 'J2 · LESSON 2 · TRANSLATION BUREAU';

/* Every block picture that appears on camera, so qa-film-laws can check that
   each one is taught or glossed in frame (spec §C's blocks-on-camera law). */
const BLOCKS_ON_CAMERA = [
  { file: 'say-hello.png', says: 'say Hello!' },
  { file: 'set-score.png', says: 'set score to 0' },
  { file: 'change-score.png', says: 'change score by 1' },
  { file: 'say-join.png', says: 'say join Score: score' }
];

async function openStage(page, cine) {
  await page.goto(STAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.pystage, null, { timeout: 15000 });
  await page.evaluate(() => window.pystage.reset());
  await cine.install();
}

/* THE STAGE IS PROVED BEFORE THE TAKE IS TRUSTED (DFM 243's family). A picture
   that never loaded films as an empty panel and nothing errors — so every
   chapter that puts a block on camera asks the page what it really has. */
async function assertLoaded(page, want) {
  const p = await page.evaluate(() => window.pystage.probe());
  if (want.blockLoaded && !p.blockLoaded) throw new Error('the block picture never loaded — the panel is empty');
  if (want.python && p.python !== want.python) throw new Error('python line reads ' + JSON.stringify(p.python) + ', wanted ' + JSON.stringify(want.python));
  if (want.rows != null && p.rows !== want.rows) throw new Error('program has ' + p.rows + ' line(s), wanted ' + want.rows);
  if (want.console != null && p.console !== want.console) throw new Error('console reads ' + JSON.stringify(p.console) + ', wanted ' + JSON.stringify(want.console));
  return p;
}

const scenes = [
  /* ------------------------------------------------------------------ ch1 */
  {
    id: 'ch1',
    label: 'Why anyone types code',
    tailMs: 1400,
    run: async ({ page, cine }) => {
      await openStage(page, cine);
      await cine.curtain({
        kicker: KICKER, title: 'Why anyone types code',
        sub: 'the same job ' + DASH + ' said two ways'
      });
      await page.evaluate(() => window.pystage.eyebrow('SCRATCH, AND PYTHON'));
      await page.evaluate(([img, alt]) => window.pystage.pair({
        img: img, alt: alt, leftLabel: 'Scratch', rightLabel: 'Python', python: 'print("Hello!")'
      }), [IMG('say-hello.png'), 'A purple Scratch block that reads: say Hello!']);
      await page.waitForTimeout(800);
      await cine.lift();
      await assertLoaded(page, { blockLoaded: true, python: 'print("Hello!")' });

      await cine.caption('You have dragged blocks like this one. It makes a character say <b>Hello!</b> on the screen.');
      await cine.caption('Beside it is a line of Python that does <b>exactly the same job</b>. Same result. Different way of writing it down.');
      await cine.caption('Scratch says it with a shape and a colour. Python says it with words and brackets.');
      await cine.caption('So why type at all? Because typing is far quicker once you know the words &mdash; and almost every app on your phone was typed, not dragged.');
      await cine.drop({});
      await cine.pause(900);
    },
    verify: async ({ page }) => { await assertLoaded(page, { blockLoaded: true }); }
  },

  /* ------------------------------------------------------------------ ch2 */
  {
    id: 'ch2',
    label: 'Meet print()',
    tailMs: 1400,
    run: async ({ page, cine }) => {
      await openStage(page, cine);
      await cine.curtain({ kicker: 'CHAPTER 2', title: 'Meet print()', sub: 'the word that puts something on the console' });
      await page.evaluate(() => { window.pystage.eyebrow('ONE LINE, AND WHAT IT DOES'); window.pystage.program('Your program'); window.pystage.consoleOpen('The console'); });
      await page.waitForTimeout(700);
      await cine.lift();

      await cine.caption('<b>print</b> is the Python word for putting something on the screen. What it puts there is whatever sits inside the brackets.');
      await page.evaluate(() => window.pystage.addLine('print("Hello!")'));
      await cine.pause(900);
      await cine.caption('The speech marks matter. They mean <b>these letters, exactly</b> &mdash; capital H, small e, and the exclamation mark too.');
      await cine.caption('The strip underneath is called <b>the console</b>. Everything your program prints comes out there, and nowhere else.');
      await page.evaluate(() => window.pystage.print(['Hello!']));
      await cine.pause(1200);
      await assertLoaded(page, { rows: 1, console: 'Hello!' });
      await cine.caption('One line in. One line out. The console never adds anything and never tidies anything up &mdash; it shows you what your program really did.');
      await cine.drop({});
      await cine.pause(900);
    },
    verify: async ({ page }) => { await assertLoaded(page, { rows: 1, console: 'Hello!' }); }
  },

  /* ------------------------------------------------------------------ ch3 */
  {
    id: 'ch3',
    label: 'A variable: a box with a name on it',
    tailMs: 1400,
    run: async ({ page, cine }) => {
      await openStage(page, cine);
      await cine.curtain({ kicker: 'CHAPTER 3', title: 'The same variable, written in Python', sub: 'you already have this idea' });
      await page.evaluate(() => window.pystage.eyebrow('A BOX WITH A NAME ON IT'));
      await page.evaluate(([img, alt]) => window.pystage.pair({
        img: img, alt: alt, leftLabel: 'Scratch', rightLabel: 'Python', python: 'score = 0'
      }), [IMG('set-score.png'), 'An orange Scratch block that reads: set score to 0']);
      await page.waitForTimeout(800);
      await cine.lift();
      await assertLoaded(page, { blockLoaded: true, python: 'score = 0' });

      /* the defining sentence for "variable" in J2's own spine lives HERE, and
         vocab.json points at this chunk — so this caption is load-bearing */
      await cine.caption('A <b>variable</b> is a box with a name on it. It holds one thing for you, and you can look inside it or change what is in it.');
      await cine.caption('The Scratch block sets a box called <b>score</b> to 0. The Python line does the same job, with an equals sign.');
      await cine.caption('The equals sign does not mean "is the same as". It means <b>put this into the box with this name</b>.');

      await page.evaluate(([img, alt]) => window.pystage.pair({
        img: img, alt: alt, leftLabel: 'Scratch', rightLabel: 'Python', python: 'score = score + 1'
      }), [IMG('change-score.png'), 'An orange Scratch block that reads: change score by 1']);
      await cine.pause(1000);
      await assertLoaded(page, { blockLoaded: true, python: 'score = score + 1' });
      await cine.caption('Adding one works the same way. Take what is already in the box, add 1, and put the answer back in the same box.');
      await cine.drop({});
      await cine.pause(900);
    },
    verify: async ({ page }) => { await assertLoaded(page, { blockLoaded: true, python: 'score = score + 1' }); }
  },

  /* ------------------------------------------------------------------ ch4 */
  {
    id: 'ch4',
    label: 'Reading a whole program',
    tailMs: 4200,
    run: async ({ page, cine }) => {
      await openStage(page, cine);
      await cine.curtain({ kicker: 'CHAPTER 4', title: 'Reading a whole program', sub: 'three lines, from the top down' });
      await page.evaluate(([img, alt]) => window.pystage.pair({
        img: img, alt: alt, leftLabel: 'Scratch', rightLabel: 'Python', python: 'print("Score: " + str(score))'
      }), [IMG('say-join.png'), 'A purple Scratch say block holding a green join block, which holds the words Score: and the orange score variable']);
      await page.evaluate(() => window.pystage.eyebrow('ONE MORE LINE, THEN A WHOLE PROGRAM'));
      await page.waitForTimeout(800);
      await cine.lift();
      await assertLoaded(page, { blockLoaded: true });

      await cine.caption('This block sticks two things together: the words <b>Score:</b> and whatever number is in the box. The Python line does that with a + sign.');
      await cine.caption('<b>str( )</b> turns a number into letters, so it can be joined to words. You do not have to remember that today &mdash; you only have to spot the line that does it.');

      /* ---- THE WORKED EXAMPLE IS NEUTRAL — DFM 210, applied here 25 Aug 2026.
         This chapter used to type build 1's exact four lines on camera, in
         order, and print its exact answer (Score: 2). A pupil who watched the
         film then met the same four lines in the tray with nothing left to work
         out — the film did her build for her, which is the line DFM 210 draws
         and which this file's own header already knew not to cross.
         The demo is now a LIVES COUNTER that nobody builds: the same three
         shapes (make a box, change what is in it, print it) on a program that
         appears nowhere in the lesson. And it is PREDICT-then-REVEAL, so the
         reading is hers before the console answers: she is asked what will come
         out, the lines are read one at a time, and only then does the console
         print. Every caption below is his, through the gate and the ledger. */
      await page.evaluate(() => { window.pystage.hidePair(); window.pystage.eyebrow('A WHOLE PROGRAM'); window.pystage.program('Your program'); window.pystage.consoleOpen('The console'); });
      await cine.pause(700);
      for (const t of ['lives = 3', 'lives = lives + 1', 'print("Lives: " + str(lives))']) {
        await page.evaluate(l => window.pystage.addLine(l), t);
      }
      await cine.pause(900);
      await cine.caption('One last job: READING a whole program, the way Python runs it &mdash; top line first.');
      await cine.caption('Read these three lines. What will the console print when they run?');
      await cine.pause(2600);
      for (let i = 0; i < 3; i++) { await page.evaluate(n => window.pystage.lit(n), i); await cine.pause(1100); }
      await page.evaluate(() => window.pystage.clearLit());
      await cine.caption('The box is called <b>lives</b>. It starts at 3, the next line adds 1, and the last line prints it.');
      await page.evaluate(() => window.pystage.print(['Lives: 4']));
      await cine.pause(1300);
      await assertLoaded(page, { rows: 3, console: 'Lives: 4' });
      await cine.caption('<b>Lives: 4</b> &mdash; the console printed the box&rsquo;s NEW number.');
      await cine.caption('In the lesson you build programs like this yourself, and the console checks every one.');

      await cine.card({
        kicker: 'NOW IT IS YOUR TURN', title: 'Six blocks, then programs of your own',
        lines: [
          'First the matching desk: six Scratch blocks, and the Python line that does the same job as each one',
          'Then three builds, each one harder than the last, out of lines that are shuffled every time',
          'You press RUN and the console shows exactly what came out. A run that does not work costs you nothing'
        ]
      }, 10000);
      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ page }) => { await assertLoaded(page, { rows: 3, console: 'Lives: 4' }); }
  }
];

module.exports = { scenes, BLOCKS_ON_CAMERA };
