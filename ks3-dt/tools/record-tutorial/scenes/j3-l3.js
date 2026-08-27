/* J3 Lesson 3 "Playlist Engine" — the film. TEXT-BASED, silent, captioned,
   SEVEN chapters cut into TWO PARTS at their own concept seam (DFM 168/170).

   PART A (ch1–ch4, ~6:00) opens the hour and is everything the Prediction Match
   then scores: one box becomes a rack, the numbering starts at 0, len( ) counts
   the boxes, append slides one onto the end.
   PART B (ch5–ch7, ~4:00) plays AFTER the Match, and that placement is the
   design: the last thing the class saw was `.sort()` handing back None in a
   guess round, and ch7 explains exactly that — now that they have watched it
   happen rather than been told about it.

   THE WORKED EXAMPLE IS NEUTRAL (DFM 210): every title on camera belongs to the
   Studio's own running order, and no pupil is building that list. Her five
   songs are hers.

   NO MUSIC PLAYS ANYWHERE IN THIS FILM (K35(1c)), and the film says so, because
   it is the first thing every class asks.

   node lib/record.js j3-l3          all chapters
   node assemble.js j3-l3            stitch + chapters.json (two parts)
*/
const path = require('path');

const STAGE = 'file://' + path.join(__dirname, '..', 'lib', 'py-stage', 'index.html');
const RACK = 'file://' + path.join(__dirname, '..', 'lib', 'list-rack', 'index.html');
const DASH = '—';
const KICKER = 'J3 · LESSON 3 · PLAYLIST ENGINE';

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
async function openRack(page, cine) {
  await page.goto(RACK, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.lr, null, { timeout: 20000 });
  await cine.install();
  await page.evaluate(() => window.lr.ready);
}
/* DFM 207d, MEASURED at every naming pause rather than judged by eye (146b). */
async function assertActor(page, log, beat, name, floor) {
  const tok = await page.evaluate(() => window.lr.probeTokens());
  log('beat ' + beat + ' tokens ' + JSON.stringify(tok));
  if (name && !(tok[name] >= (floor || 55))) {
    throw new Error('beat ' + beat + ': the actor it names (' + name + ') measures ' + tok[name] + 'px');
  }
}

/* NO BLOCK EVER APPEARS ON CAMERA IN THIS FILM, DECLARED RATHER THAN LEFT
   BLANK (DFM 207c). It is Python and a rack of boxes from the first frame. */
const BLOCKS_ON_CAMERA = [];

const scenes = [
/* ------------------------------------------------------------------ ch1 */
{
  id: 'ch1',
  label: 'One box, then a rack of them',
  tailMs: 1600,
  run: async ({ page, cine, log }) => {
    await openRack(page, cine);
    await cine.curtain({
      kicker: KICKER, title: 'One box, then a rack of them',
      sub: 'one name over a whole set of things'
    });
    await cine.pause(2400);
    await cine.lift();
    const C1 = 'Last lesson you made one of these: a box with a name on it, holding one thing. Python calls it a <b>variable</b>.';
    await cine.captionShow(C1);
    const t1 = Date.now();
    await page.evaluate(() => window.lr.play(1));
    const first = await page.evaluate(() => window.lr.probe());
    if (first.nonNavy < 1) throw new Error('list-rack drew nothing after beat 1 — WebGL failed: ' + JSON.stringify(first));
    log('list-rack probe ok: ' + JSON.stringify(first.samples));
    await assertActor(page, log, 1, 'oneBox', 110);
    await cine.pause(Math.max(700, cine.holdFor(C1) - (Date.now() - t1)));
    const C2 = 'Today one name holds a whole <b>rack</b> of them, in an order you decide. Python calls that a <b>LIST</b>.';
    await cine.captionShow(C2);
    const t2 = Date.now();
    await page.evaluate(() => window.lr.play(2));
    await assertActor(page, log, 2, 'slot0', 110);
    await cine.pause(Math.max(700, cine.holdFor(C2) - (Date.now() - t2)));
    const C3 = 'Three boxes, one shelf, and one label on the front. Every box on that shelf answers to the name <b>playlist</b>.';
    await cine.captionShow(C3);
    await cine.pause(cine.holdFor(C3));
    await cine.captionHide();
    await cine.caption('These are song <b>titles</b>, and nothing else. <b>No music plays in this lesson.</b> Your program manages the titles; it never makes a sound.');
    await cine.drop({});
    await cine.pause(1000);
  }
},

/* ------------------------------------------------------------------ ch2 */
{
  id: 'ch2',
  label: 'Counting starts at 0',
  tailMs: 1600,
  run: async ({ page, cine, log }) => {
    await openRack(page, cine);
    await page.evaluate(async () => { await window.lr.play(1); await window.lr.play(2); });
    await cine.curtain({ kicker: 'CHAPTER 2', title: 'Counting starts at 0', sub: 'the one everybody gets wrong' });
    await cine.pause(2200);
    await cine.lift();

    const A1 = 'Every box on the shelf has a <b>position</b> stencilled under it. Look at the first one: it is <b>0</b>, not 1.';
    await cine.captionShow(A1);
    await cine.pause(cine.holdFor(A1));
    const A2 = 'So <b>playlist[1]</b> is not the first box. The square brackets say <b>which position</b>, and the counting started at zero.';
    await cine.captionShow(A2);
    const a2 = Date.now();
    await page.evaluate(() => window.lr.play(3));
    await assertActor(page, log, 3, 'pointer', 110);
    await cine.pause(Math.max(700, cine.holdFor(A2) - (Date.now() - a2)));
    const A3 = 'The pointer counts along: zero, one. It lands on the <b>second</b> box, and that is what comes back.';
    await cine.captionShow(A3);
    await cine.pause(cine.holdFor(A3));
    await cine.captionHide();
    await cine.caption('This is the single thing people get wrong all year. The number in the square brackets is a <b>position</b>, and it is never a count.');
    await cine.drop({});
    await cine.pause(1000);
  }
},

/* ------------------------------------------------------------------ ch3 */
{
  id: 'ch3',
  label: 'How many are in there?',
  tailMs: 1600,
  run: async ({ page, cine, log }) => {
    await openRack(page, cine);
    await page.evaluate(async () => { await window.lr.play(1); await window.lr.play(2); await window.lr.play(3); });
    await cine.curtain({ kicker: 'CHAPTER 3', title: 'How many are in there?', sub: 'len( ) counts the boxes' });
    await cine.pause(2200);
    await cine.lift();

    const B1 = '<b>len( )</b> is the Python word for &ldquo;how many&rdquo;. Give it the list and it counts the boxes on the shelf.';
    await cine.captionShow(B1);
    const b1 = Date.now();
    await page.evaluate(() => window.lr.play(4));
    await assertActor(page, log, 4, 'slot0', 110);
    await cine.pause(Math.max(700, cine.holdFor(B1) - (Date.now() - b1)));
    const B2 = 'Three boxes, so it says <b>3</b>. Now look under the last one: it is numbered <b>2</b>.';
    await cine.captionShow(B2);
    await cine.pause(cine.holdFor(B2));
    await cine.captionHide();
    await cine.caption('The count and the last position are <b>always one apart</b>, because the counting started at zero. Ask for playlist[3] on a shelf of three and the program stops.');
    await cine.drop({});
    await cine.pause(1000);
  }
},

/* ------------------------------------------------------------------ ch4 */
{
  id: 'ch4',
  label: 'Adding one on the end',
  tailMs: 4000,
  run: async ({ page, cine, log }) => {
    await openRack(page, cine);
    await page.evaluate(async () => { await window.lr.play(1); await window.lr.play(2); await window.lr.play(3); await window.lr.play(4); });
    await cine.curtain({ kicker: 'CHAPTER 4', title: 'Adding one on the end', sub: 'append, and what it does NOT do' });
    await cine.pause(2200);
    await cine.lift();

    const D1 = '<b>.append( )</b> puts a new box on the <b>end</b> of the shelf, and leaves everything already there exactly where it was.';
    await cine.captionShow(D1);
    const d1 = Date.now();
    await page.evaluate(() => window.lr.play(5));
    await assertActor(page, log, 5, 'slot3', 110);
    await cine.pause(Math.max(700, cine.holdFor(D1) - (Date.now() - d1)));
    const D2 = 'Four boxes now, and the positions did not shuffle. The new one is <b>3</b>, and 0, 1 and 2 are the same boxes they were.';
    await cine.captionShow(D2);
    await cine.pause(cine.holdFor(D2));
    const D3 = 'And the whole shelf still answers to <b>one name</b>. That is the point of a list: everything you can do to it, you do to all of them at once.';
    await cine.captionShow(D3);
    const d3 = Date.now();
    await page.evaluate(() => window.lr.play(6));
    await assertActor(page, log, 6, 'rackPlate', 40);
    await cine.pause(Math.max(700, cine.holdFor(D3) - (Date.now() - d3)));
    await cine.captionHide();

    await cine.card({
      kicker: 'NOW GO AND PLAY THE MATCH', title: 'Six rounds, and two of them are unfair on purpose',
      lines: [
        'Somebody else in this room sees the same code as you, at the same moment',
        'You both say what you think it will print, you both lock it in, and then <b>it really runs</b>',
        '<b>Rounds 5 and 6 are on things nobody has taught you.</b> They say so before they start, and they are worth nothing either way',
        'Come back here afterwards. The second film picks up on exactly those two'
      ]
    }, 11000);
    await cine.drop({});
    await cine.pause(1200);
  }
},

/* ================= PART B — after the Match ============================= */
/* ------------------------------------------------------------------ ch5 */
{
  id: 'ch5',
  label: 'Taking one out',
  tailMs: 1400,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({
      kicker: KICKER + ' · PART 2', title: 'Taking one out',
      sub: 'remove, and the one thing that catches it'
    });
    await page.evaluate(() => { window.pystage.eyebrow('OFF THE SHELF'); window.pystage.program('The program'); window.pystage.consoleOpen('The console'); });
    await page.waitForTimeout(700);
    await cine.lift();

    for (const t of ['playlist = ["Opening Night", "Curtain Up", "Last Bus Home"]',
                     'playlist.remove("Curtain Up")', 'print(playlist)']) {
      await page.evaluate(l => window.pystage.addLine(l), t);
    }
    await cine.pause(900);
    await page.evaluate(() => window.pystage.print(["['Opening Night', 'Last Bus Home']"]));
    await cine.pause(1300);
    await assertStage(page, { rows: 3, consoleHas: 'Last Bus Home' });
    await cine.caption('<b>.remove( )</b> takes a title off the shelf by <b>naming it</b>. Not by its position &mdash; by the words themselves.');
    await cine.caption('Which is why it has to match <b>exactly</b>. A capital letter in the wrong place, or one extra space, and Python cannot find it and stops.');
    await page.evaluate(() => { window.pystage.program('The program'); window.pystage.consoleOpen('The console'); });
    for (const t of ['playlist = ["Opening Night", "Curtain Up"]', 'playlist.remove("curtain up")']) {
      await page.evaluate(l => window.pystage.addLine(l), t);
    }
    await cine.pause(700);
    await page.evaluate(() => window.pystage.bad(1));
    await page.evaluate(() => window.pystage.error(
      'ValueError: list.remove(x): x not in list on line 2',
      'Python could not use the thing in the brackets. If this was a remove line, the title has to match one that is really in the list, capital letters and all.'));
    await cine.pause(1500);
    await assertStage(page, { consoleHas: 'ValueError' });
    await cine.caption('Read the two out loud, side by side. The difference is nearly always one capital letter.');
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertStage(page, { consoleHas: 'ValueError' }); }
},

/* ------------------------------------------------------------------ ch6 */
{
  id: 'ch6',
  label: 'The first three only',
  tailMs: 1400,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({ kicker: 'PART 2 · CHAPTER 2', title: 'The first three only', sub: 'and a loop to print them' });
    await page.evaluate(() => { window.pystage.eyebrow('NOW PLAYING'); window.pystage.program('The program'); window.pystage.consoleOpen('The console'); });
    await page.waitForTimeout(700);
    await cine.lift();

    for (const t of ['playlist = ["Opening Night", "Curtain Up", "Last Bus Home", "The Long Way Round"]',
                     'print("Now Playing - Top 3")', 'for song in playlist[0:3]:', '    print(song)']) {
      await page.evaluate(l => window.pystage.addLine(l), t);
    }
    await cine.pause(900);
    await assertStage(page, { rows: 4 });
    await cine.caption('<b>playlist[0:3]</b> takes a slice off the shelf: start at position 0, stop <b>before</b> position 3. That is boxes 0, 1 and 2 &mdash; three of them.');
    await cine.caption('The stopping number is <b>not included</b>. That is why a Top-3 line reads 0:3 and not 0:2.');
    await page.evaluate(() => window.pystage.lit(2));
    await cine.pause(700);
    await cine.caption('The <b>for</b> line is a loop. It takes those three one at a time, puts each one into a box called <b>song</b>, and runs the indented line underneath once for each.');
    await page.evaluate(() => window.pystage.lit(3));
    await cine.pause(700);
    await cine.caption('Those four spaces are what put the print line <b>inside</b> the loop. Move it back to the left and it runs once, after the loop has finished.');
    await page.evaluate(() => window.pystage.print(['Now Playing - Top 3', 'Opening Night', 'Curtain Up', 'Last Bus Home']));
    await cine.pause(1400);
    await assertStage(page, { consoleHas: 'Last Bus Home' });
    await cine.caption('Three titles in the slice, three trips round the loop, three lines on the console.');
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertStage(page, { rows: 4 }); }
},

/* ------------------------------------------------------------------ ch7 */
{
  id: 'ch7',
  label: 'Putting them in order, and the trap',
  tailMs: 4200,
  run: async ({ page, cine, log }) => {
    await openRack(page, cine);
    await page.evaluate(async () => {
      await window.lr.play(1); await window.lr.play(2); await window.lr.play(3);
      await window.lr.play(4); await window.lr.play(5);
    });
    await cine.curtain({
      kicker: 'PART 2 · CHAPTER 3', title: 'Putting them in order, and the trap',
      sub: 'you met this one in the Match ' + DASH + ' now you know why'
    });
    await cine.pause(2400);
    await cine.lift();

    const S1 = '<b>.sort( )</b> puts the shelf in order, A to Z. Watch what it moves: the <b>boxes</b>. The positions stay exactly where they are.';
    await cine.captionShow(S1);
    const s1 = Date.now();
    await page.evaluate(() => window.lr.play(7));
    await assertActor(page, log, 7, 'hand', 55);
    /* THE PICTURE HAS TO BE TRUE: the recorder reads the rack's real order off
       the scene rather than trusting that something animated (DFM 146b). */
    const order = await page.evaluate(() => window.lr.order());
    log('rack order after sort: ' + JSON.stringify(order));
    const want = ['Curtain Up', 'Last Bus Home', 'Opening Night', 'The Long Way Round'];
    if (JSON.stringify(order) !== JSON.stringify(want)) {
      throw new Error('the sort beat did not really order the rack: ' + JSON.stringify(order));
    }
    await cine.pause(Math.max(900, cine.holdFor(S1) - (Date.now() - s1)));
    const S2 = 'And here is the trap. It does that <b>to the list itself</b>, and it hands back <b>nothing at all</b>.';
    await cine.captionShow(S2);
    await cine.pause(cine.holdFor(S2));
    const S3 = '<b>None</b> is Python&rsquo;s word for nothing. If you write <b>order = playlist.sort()</b>, the box called order gets None &mdash; and the shelf is sorted anyway.';
    await cine.captionShow(S3);
    await cine.pause(cine.holdFor(S3));
    await cine.captionHide();
    await cine.caption('So: <b>sort the list, then print the LIST.</b> That is the whole fix, and <b>.reverse( )</b> behaves in exactly the same way.');

    await cine.card({
      kicker: 'NOW BUILD YOUR OWN', title: 'Five songs, five things done to them',
      lines: [
        '<b>Add</b> one, <b>take</b> one out, <b>announce</b> one at random, put them <b>in order</b>, print the <b>first three</b>',
        'There is no bank of ready-made lines this time. You type it',
        'The list beside your program ticks each of the five only when your program <b>really does it</b> &mdash; it is run, never read'
      ]
    }, 11000);
    await cine.drop({});
    await cine.pause(1200);
  }
}
];

module.exports = { scenes, BLOCKS_ON_CAMERA };
