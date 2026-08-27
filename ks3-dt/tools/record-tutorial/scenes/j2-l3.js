/* J2 Lesson 3 "Chatbot Workshop" — the film. TEXT-BASED, silent, captioned,
   FIVE chapters cut into TWO PARTS at their own seam (DFM 168/170).

   PART A (ch1–ch3, ~3:30) opens the hour: what a chatbot is, the input-halt
   ANIMATION, and one whole three-line bot read through.
   PART B (ch4–ch5, ~2:00) sits ON the card where she starts writing her own bot,
   because that is where what it shows is next needed — "when a film teaches a
   build, the film is served in parts, at the point of building" (DFM 168), and
   a rung's film is a physically separate file so its scrubber cannot stray
   outside its own part (DFM 170).

   THE WORKED EXAMPLE IS NEUTRAL (DFM 210). The bot on camera asks about a PET
   and a COLOUR, and its sentences are the film's own. No Topic Card a pupil can
   pick appears here, and no line of her build is typed on screen — the two
   things the film hands over are the SHAPE and the two mistakes, never the
   words.

   EVERY QUESTION THE BOT ASKS IS ONE AN ELEVEN-YEAR-OLD CAN ANSWER WITHOUT
   THINKING (K36a, his ruling: "make sure you don't ask questions that might
   confuse them").

   node lib/record.js j2-l3          all chapters
   node assemble.js j2-l3            stitch + chapters.json (two parts)
*/
const path = require('path');

const STAGE = 'file://' + path.join(__dirname, '..', 'lib', 'py-stage', 'index.html');
const IHALT = 'file://' + path.join(__dirname, '..', 'lib', 'input-halt', 'index.html');
const DASH = '—';
const KICKER = 'J2 · LESSON 3 · CHATBOT WORKSHOP';

async function openStage(page, cine) {
  await page.goto(STAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.pystage, null, { timeout: 15000 });
  await page.evaluate(() => window.pystage.reset());
  await cine.install();
}
async function assertStage(page, want) {
  const p = await page.evaluate(() => window.pystage.probe());
  if (want.rows != null && p.rows !== want.rows) throw new Error('program has ' + p.rows + ' line(s), wanted ' + want.rows);
  if (want.said != null && p.said !== want.said) throw new Error('conversation has ' + p.said + ' line(s), wanted ' + want.said);
  if (want.console != null && p.console !== want.console) throw new Error('console reads ' + JSON.stringify(p.console) + ', wanted ' + JSON.stringify(want.console));
  if (want.consoleHas && p.console.indexOf(want.consoleHas) === -1) throw new Error('console does not contain ' + JSON.stringify(want.consoleHas) + ' — it reads ' + JSON.stringify(p.console));
  return p;
}

/* NO BLOCK EVER APPEARS ON CAMERA IN THIS FILM, AND THAT IS DECLARED RATHER
   THAN LEFT BLANK (DFM 207c). An ABSENT manifest and an EMPTY one look the same
   to a reader and mean opposite things. This film is Python from the first
   frame: no Scratch, no MakeCode, no editor of any kind. */
const BLOCKS_ON_CAMERA = [];

const scenes = [
/* ------------------------------------------------------------------ ch1 */
{
  id: 'ch1',
  label: 'What a chatbot really is',
  tailMs: 1400,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({
      kicker: KICKER, title: 'What a chatbot really is',
      sub: 'a program following instructions somebody typed'
    });
    await page.evaluate(() => { window.pystage.eyebrow('IT IS NOT CLEVER. IT IS A LIST OF INSTRUCTIONS.'); window.pystage.chatOpen('The conversation'); });
    await page.waitForTimeout(700);
    await cine.lift();

    await cine.caption('A chatbot asks the person at the keyboard a question, waits for an answer, and then uses what they typed. Here is one running.');
    await page.evaluate(() => window.pystage.say('bot', 'Hello. I am a chatbot. Do you have a pet?'));
    await cine.pause(700);
    await page.evaluate(() => window.pystage.say('you', 'A dog'));
    await cine.pause(600);
    await page.evaluate(() => window.pystage.say('bot', 'A dog. Good choice.'));
    await cine.pause(900);
    await assertStage(page, { said: 3 });
    await cine.caption('Nothing about that is clever. Somebody typed every sentence it said, and typed the one place where your answer goes.');
    await page.evaluate(() => window.pystage.say('bot', 'What colour is your school bag?'));
    await cine.pause(600);
    await page.evaluate(() => window.pystage.say('you', 'Green'));
    await cine.pause(600);
    await page.evaluate(() => window.pystage.say('bot', 'Green it is. A dog and a green bag. Noted.'));
    await cine.pause(1100);
    await assertStage(page, { said: 6 });
    await cine.caption('It follows the same three jobs over and over: <b>ask</b> a question, <b>keep</b> the answer, <b>reply</b> using it. That is the whole hour.');
    await cine.caption('Notice both questions. Anybody in your room could answer either of them in a second, without thinking. That is what makes them good questions for a bot.');
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertStage(page, { said: 6 }); }
},

/* ------------------------------------------------------------------ ch2 */
{
  id: 'ch2',
  label: 'The program stops and waits',
  tailMs: 1600,
  run: async ({ page, cine, log }) => {
    await page.goto(IHALT, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.ih, null, { timeout: 20000 });
    await cine.install();
    await cine.curtain({
      kicker: 'CHAPTER 2', title: 'The program stops and waits',
      sub: 'the one new word today ' + DASH + ' input( )'
    });
    await cine.pause(2400);
    await cine.lift();
    await page.evaluate(() => window.ih.ready);

    const BEATS = [
      'A program runs down the page, one line at a time. This one prints <b>Hello!</b> and moves on.',
      'Then it reaches <b>input( )</b> and it <b>STOPS</b>. Not pauses in the background &mdash; stops. Nothing after that line runs while it is waiting.',
      'It waits for a person. Until somebody types an answer and presses Enter, the program stays exactly where it is.',
      'What she typed goes into the box with <b>name</b> on it. That is a variable, the same kind of box you made last lesson.',
      'The moment the answer is in, the program wakes up and carries on with the next line.',
      'And the reply uses what she typed. The box keeps its word &mdash; using it does not empty it.'
    ];
    for (let i = 0; i < BEATS.length; i++) {
      await cine.captionShow(BEATS[i]);
      const t0 = Date.now();
      await page.evaluate(n => window.ih.play(n), i + 1);
      if (i === 0) {
        const first = await page.evaluate(() => window.ih.probe());
        if (first.nonNavy < 1) throw new Error('input-halt drew nothing after beat 1 — WebGL failed: ' + JSON.stringify(first));
        log('input-halt probe ok: ' + JSON.stringify(first.samples));
      }
      /* DFM 207d, MEASURED: the actor a caption is naming has to be at least
         110 pixels tall on the real screen, and the labels on it at least 24.
         Judged by eye is how two animations got rejected. */
      const tok = await page.evaluate(() => window.ih.probeTokens());
      log('beat ' + (i + 1) + ' tokens ' + JSON.stringify(tok));
      const NAMED = [null, 'console', 'waiting', 'keyboard', 'box', 'line3', 'console'];
      const want = NAMED[i + 1];
      if (want && !(tok[want] >= 55)) throw new Error('beat ' + (i + 1) + ': the actor it names (' + want + ') measures ' + tok[want] + 'px');
      /* hold the caption for the house reading time, counted from the moment it
         appeared — the beat's own animation is part of that time, not extra to it */
      await cine.pause(Math.max(700, cine.holdFor(BEATS[i]) - (Date.now() - t0)));
    }
    await cine.captionHide();
    const last = await page.evaluate(() => window.ih.probe());
    if (last.nonNavy < 1) throw new Error('input-halt went blank mid-take');
    await cine.drop({});
    await cine.pause(1000);
  }
},

/* ------------------------------------------------------------------ ch3 */
{
  id: 'ch3',
  label: 'Reading the whole program',
  tailMs: 4200,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({ kicker: 'CHAPTER 3', title: 'Reading the whole program', sub: 'three lines, and one real mistake' });
    await page.evaluate(() => { window.pystage.eyebrow('ASK, KEEP, REPLY'); window.pystage.program('The bot'); window.pystage.consoleOpen('The console'); });
    await page.waitForTimeout(700);
    await cine.lift();

    for (const t of ['print("Hello. One question.")', 'pet = input("Do you have a pet?")', 'print("A " + pet + ". Good choice.")']) {
      await page.evaluate(l => window.pystage.addLine(l), t);
    }
    await cine.pause(900);
    await assertStage(page, { rows: 3 });
    await cine.caption('Three lines, and each one is a job. The first <b>prints</b>. The second <b>asks and keeps</b>. The third <b>replies</b>, using what is in the box.');
    await cine.caption('The <b>=</b> on the second line is what keeps the answer. input( ) asks the question; the equals sign puts what was typed into the box called <b>pet</b>.');
    await page.evaluate(() => window.pystage.print(['Hello. One question.', 'A dog. Good choice.']));
    await cine.pause(1300);
    await assertStage(page, { consoleHas: 'A dog. Good choice.' });

    await cine.caption('Now the mistake that will happen to you today, on purpose, in the very first build.');
    await page.evaluate(() => { window.pystage.program('The bot'); window.pystage.consoleOpen('The console'); });
    for (const t of ['print("Hello. One question.")', 'pte = input("Do you have a pet?")', 'print("A " + pet + ". Good choice.")']) {
      await page.evaluate(l => window.pystage.addLine(l), t);
    }
    await cine.pause(700);
    await page.evaluate(() => window.pystage.bad(1));
    await page.evaluate(() => window.pystage.error(
      "NameError: name 'pet' is not defined on line 3",
      'Python does not know a box with that name. Check the spelling on this line matches the box name you made further up.'));
    await cine.pause(1500);
    await assertStage(page, { consoleHas: 'NameError' });
    await cine.caption('The box on line 2 is spelled <b>pte</b>. Line 3 asks for <b>pet</b>. To Python those are two different boxes, so it stops and says so.');
    await cine.caption('The console shows you <b>Python&rsquo;s own words</b>, and one line in plain English underneath them. Never one instead of the other.');

    await cine.card({
      kicker: 'NOW IT IS YOUR TURN', title: 'Three training builds, then a bot of your own',
      lines: [
        'The first build has a real mistake in it, put there on purpose &mdash; you press RUN, read what Python says, and put it right',
        'Every build has two grey buttons for help, and <b>neither of them costs you anything</b>',
        'At the end, somebody else in this room gets your bot and tries to break it'
      ]
    }, 10500);
    await cine.drop({});
    await cine.pause(1200);
  },
  verify: async ({ page }) => { await assertStage(page, { rows: 3, consoleHas: 'NameError' }); }
},

/* ================= PART B — served on the card where she builds ========= */
/* ------------------------------------------------------------------ ch4 */
{
  id: 'ch4',
  label: 'Two questions anybody can answer',
  tailMs: 1400,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({
      kicker: KICKER + ' · PART 2', title: 'Two questions anybody can answer',
      sub: 'the part people get wrong'
    });
    await page.evaluate(() => { window.pystage.eyebrow('YOUR BOT ASKS TWO THINGS'); window.pystage.chatOpen('The conversation'); });
    await page.waitForTimeout(700);
    await cine.lift();

    await cine.caption('Your bot asks two questions, and you choose them. There is one rule, and it is the only thing people get wrong.');
    await page.evaluate(() => window.pystage.say('bot', 'What is your favourite food?'));
    await cine.pause(600);
    await page.evaluate(() => window.pystage.say('you', 'Chips'));
    await cine.pause(900);
    await cine.caption('That took a second to answer. Remember your program <b>STOPS</b> until somebody types &mdash; so a question they have to think about leaves them staring at a frozen screen.');
    await page.evaluate(() => window.pystage.say('bot', 'What would you change about the school day, and why?'));
    await page.evaluate(() => window.pystage.waiting(true, 'still waiting'));
    await cine.pause(1800);
    await assertStage(page, { said: 3 });
    await cine.caption('That one is a good question and a terrible bot question. Pick things anybody in your room could answer straight away: a food, a team, a subject, a film.');
    await page.evaluate(() => window.pystage.waiting(false));
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertStage(page, { said: 3 }); }
},

/* ------------------------------------------------------------------ ch5 */
{
  id: 'ch5',
  label: 'One line that uses both answers',
  tailMs: 3600,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({ kicker: 'PART 2 · CHAPTER 2', title: 'One line that uses both answers', sub: 'the verdict' });
    await page.evaluate(() => { window.pystage.eyebrow('TWO BOXES, ONE SENTENCE'); window.pystage.program('The bot'); window.pystage.consoleOpen('The console'); });
    await page.waitForTimeout(700);
    await cine.lift();

    for (const t of ['pet = input("Do you have a pet?")', 'bag = input("What colour is your school bag?")',
                     'print("A " + pet + " and a " + bag + " bag. Noted.")']) {
      await page.evaluate(l => window.pystage.addLine(l), t);
    }
    await cine.pause(900);
    await assertStage(page, { rows: 3 });
    await cine.caption('Two questions means two boxes, and they need <b>different names</b>. Two boxes called the same thing is one box, and the second answer wipes out the first.');
    await cine.caption('The last line is the one to look at. It has <b>both</b> box names in it, joined onto the words with <b>+</b> signs.');
    await page.evaluate(() => window.pystage.lit(2));
    await cine.pause(900);
    await page.evaluate(() => window.pystage.print(['A dog and a green bag. Noted.']));
    await cine.pause(1300);
    await assertStage(page, { consoleHas: 'A dog and a green bag' });
    await cine.caption('One sentence, both answers. Every + sticks the next piece on the end &mdash; words, box, words, box, words.');

    await cine.card({
      kicker: 'THE LIST BESIDE YOUR PROGRAM', title: 'Three things, ticked by running it',
      lines: [
        'It <b>asks twice</b> and waits for both answers',
        'Both answers <b>come back out</b> in what the bot says',
        'One line at the end uses <b>both at once</b>',
        'The list fills in every time you press RUN. Nothing is read &mdash; your program is run.'
      ]
    }, 10000);
    await cine.drop({});
    await cine.pause(1200);
  },
  verify: async ({ page }) => { await assertStage(page, { rows: 3 }); }
}
];

module.exports = { scenes, BLOCKS_ON_CAMERA };
