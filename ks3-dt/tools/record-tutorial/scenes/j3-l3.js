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
  /* J13(g): declared here too, PROACTIVELY, before he sits this lesson — the
     same law on all four L3 films, not on the one that failed him. */
  /* the OUTPUT AREA, not the panel chrome. A panel heading that says "The
     console" is not the console speaking, and holding a caption off a static
     label would be the gate inventing a fault (DFM 146a). What must never be
     covered is what the program actually printed, and what was actually said. */
  await cine.subject('console', '#conBody');
  await cine.subject('conversation', '#chatBody');
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
      sub: 'one name for a whole set of things'
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
    const C3 = 'There are three boxes on one rack, and one label on the front of it. The whole rack has a single name, and that name is <b>playlist</b>.';
    await cine.captionShow(C3);
    await cine.pause(cine.holdFor(C3));
    await cine.captionHide();
    await cine.caption('These are song <b>titles</b>, and nothing else. <b>No music plays in this lesson.</b> Your program moves these titles around, and it never makes a sound.');
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
    await cine.curtain({ kicker: 'CHAPTER 2', title: 'Counting starts at 0', sub: 'the part everybody gets wrong at first' });
    await cine.pause(2200);
    await cine.lift();

    const A1 = 'Every box on the rack has a <b>position</b> number painted under it. Look at the first one: it is <b>0</b>, not 1.';
    await cine.captionShow(A1);
    await cine.pause(cine.holdFor(A1));
    const A2 = 'So <b>playlist[1]</b> is not the first box. The number in the square brackets is a position, and positions start at zero.';
    await cine.captionShow(A2);
    const a2 = Date.now();
    await page.evaluate(() => window.lr.play(3));
    await assertActor(page, log, 3, 'pointer', 110);
    await cine.pause(Math.max(700, cine.holdFor(A2) - (Date.now() - a2)));
    const A3 = 'Count along the rack: zero, then one. You stop on the <b>second</b> box, and that is the title Python gives you.';
    await cine.captionShow(A3);
    await cine.pause(cine.holdFor(A3));
    await cine.captionHide();
    await cine.caption('This is the mistake more people make than any other. The number in the square brackets is a <b>position</b>, and it is never a count.');
    await cine.drop({});
    await cine.pause(1000);
  }
},

/* ------------------------------------------------------------------ ch3 */
{
  id: 'ch3',
  label: 'How many things are in the list?',
  tailMs: 1600,
  run: async ({ page, cine, log }) => {
    await openRack(page, cine);
    await page.evaluate(async () => { await window.lr.play(1); await window.lr.play(2); await window.lr.play(3); });
    await cine.curtain({ kicker: 'CHAPTER 3', title: 'How many things are in the list?', sub: 'len( ) counts the boxes' });
    await cine.pause(2200);
    await cine.lift();

    const B1 = '<b>len( )</b> is the Python word for &ldquo;how many&rdquo;. Give it the list and it counts the boxes on the rack.';
    await cine.captionShow(B1);
    const b1 = Date.now();
    await page.evaluate(() => window.lr.play(4));
    await assertActor(page, log, 4, 'slot0', 110);
    await cine.pause(Math.max(700, cine.holdFor(B1) - (Date.now() - b1)));
    const B2 = 'There are three boxes, so len( ) gives <b>3</b>. Now look under the last box: it is numbered <b>2</b>.';
    await cine.captionShow(B2);
    await cine.pause(cine.holdFor(B2));
    await cine.captionHide();
    await cine.caption('The count and the last position are <b>always one apart</b>, because counting starts at zero. Ask for playlist[3] on a rack of three and the program stops.');
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
    await cine.curtain({ kicker: 'CHAPTER 4', title: 'Adding one on the end', sub: 'append puts one more box on the end' });
    await cine.pause(2200);
    await cine.lift();

    const D1 = '<b>.append( )</b> puts a new box on the <b>end</b> of the rack, and leaves everything already there exactly where it was.';
    await cine.captionShow(D1);
    const d1 = Date.now();
    await page.evaluate(() => window.lr.play(5));
    await assertActor(page, log, 5, 'slot3', 110);
    await cine.pause(Math.max(700, cine.holdFor(D1) - (Date.now() - d1)));
    const D2 = 'There are four boxes now, and nothing moved. The new box is number <b>3</b>, and boxes 0, 1 and 2 are exactly where they were.';
    await cine.captionShow(D2);
    await cine.pause(cine.holdFor(D2));
    const D3 = 'And the whole rack still has <b>one name</b>. Having one name is the point of a list: you write that name, and Python knows every title on the rack.';
    await cine.captionShow(D3);
    const d3 = Date.now();
    await page.evaluate(() => window.lr.play(6));
    await assertActor(page, log, 6, 'rackPlate', 40);
    await cine.pause(Math.max(700, cine.holdFor(D3) - (Date.now() - d3)));
    await cine.captionHide();

    await cine.card({
      kicker: 'NOW GO AND PLAY THE MATCH', title: 'There are six rounds, and the last two are on things nobody has taught you yet.',
      lines: [
        'Somebody else in this room sees the same code as you, at the same moment',
        'You both say what you think it will print, you both lock it in, and then <b>it really runs</b>',
        '<b>Rounds 5 and 6 are on things nobody has taught you.</b> The screen tells you before each of them starts, and they are worth nothing either way',
        'After the Match there is a second film, and it explains those last two rounds.'
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
      sub: 'remove, and the mistake that stops remove working'
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
    await cine.caption('<b>.remove( )</b> takes a title off the rack. You give it the words of the title, not the position number.');
    await cine.caption('So the title has to match <b>exactly</b>. One wrong capital letter, or one extra space, and Python cannot find the title. When that happens, your program stops.');
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
    await cine.caption('Put your remove line and the line that makes the list side by side, and read them both slowly. The difference is nearly always one capital letter.');
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertStage(page, { consoleHas: 'ValueError' }); }
},

/* ------------------------------------------------------------------ ch6 */
{
  id: 'ch6',
  label: 'Taking just the first three',
  tailMs: 1400,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({ kicker: 'PART 2 · CHAPTER 2', title: 'Taking just the first three', sub: 'and a loop to print them' });
    await page.evaluate(() => { window.pystage.eyebrow('NOW PLAYING'); window.pystage.program('The program'); window.pystage.consoleOpen('The console'); });
    await page.waitForTimeout(700);
    await cine.lift();

    for (const t of ['playlist = ["Opening Night", "Curtain Up", "Last Bus Home", "The Long Way Round"]',
                     'print("Now Playing - Top 3")', 'for song in playlist[0:3]:', '    print(song)']) {
      await page.evaluate(l => window.pystage.addLine(l), t);
    }
    await cine.pause(900);
    await assertStage(page, { rows: 4 });
    await cine.caption('<b>playlist[0:3]</b> gives you a copy of part of the rack: start at position 0, stop <b>before</b> position 3. That is boxes 0, 1 and 2 &mdash; three of them, and the rack itself is left alone.');
    await cine.caption('The stopping number is <b>never included</b>. That is why you write 0:3 to get the first three, and not 0:2.');
    await page.evaluate(() => window.pystage.lit(2));
    await cine.pause(700);
    await cine.caption('The <b>for</b> line is a loop. It takes those three titles one at a time and puts each one into a box (a variable) called <b>song</b>. Then it runs the line underneath, once for every title. That line is the one pushed in by four spaces.');
    await page.evaluate(() => window.pystage.lit(3));
    await cine.pause(700);
    await cine.caption('Those four spaces are what put the print line <b>inside</b> the loop. Move it back to the left and it runs once, after the loop has finished.');
    await page.evaluate(() => window.pystage.print(['Now Playing - Top 3', 'Opening Night', 'Curtain Up', 'Last Bus Home']));
    await cine.pause(1400);
    await assertStage(page, { consoleHas: 'Last Bus Home' });
    /* THE CAPTION GOES ABOVE THE CONSOLE HERE (J13g). This beat names what the
       console has just printed, and the console panel on this chapter reaches
       into the lower third — so the sentence was sitting on the very output it
       is about. Found by the proactive audit of this film BEFORE he sat it,
       which is what the audit was ordered for. */
    await cine.caption('There are three titles in the slice, so the loop goes round three times and prints three lines.', { pos: 'top' });
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertStage(page, { rows: 4 }); }
},

/* ------------------------------------------------------------------ ch7 */
{
  id: 'ch7',
  label: 'Putting the titles in order, and the trap that catches people',
  tailMs: 4200,
  run: async ({ page, cine, log }) => {
    await openRack(page, cine);
    await page.evaluate(async () => {
      await window.lr.play(1); await window.lr.play(2); await window.lr.play(3);
      await window.lr.play(4); await window.lr.play(5);
    });
    await cine.curtain({
      kicker: 'PART 2 · CHAPTER 3', title: 'Putting the titles in order, and the trap that catches people',
      sub: 'you met this in round 6 of the Match ' + DASH + ' here is why it happens'
    });
    await cine.pause(2400);
    await cine.lift();

    const S1 = '<b>.sort( )</b> puts the rack in order, A to Z. Watch what it moves: the <b>boxes</b>. The positions stay exactly where they are.';
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
    const S2 = 'And here is the trap. <b>.sort( )</b> changes the list itself, and it gives you <b>nothing back</b> to keep.';
    await cine.captionShow(S2);
    await cine.pause(cine.holdFor(S2));
    const S3 = '<b>None</b> is Python&rsquo;s word for nothing. If you write <b>order = playlist.sort()</b>, the box called order gets None &mdash; and the rack is sorted anyway.';
    await cine.captionShow(S3);
    await cine.pause(cine.holdFor(S3));
    await cine.captionHide();
    await cine.caption('Sort the list on one line, then print the list on the next. Written that way it works, and <b>.reverse( )</b> works exactly the same way.');

    await cine.card({
      kicker: 'NOW BUILD YOUR OWN', title: 'You choose five songs of your own, and your program does five jobs to them.',
      lines: [
        'Your engine does five jobs, in this order:',
        '1. <b>add</b> a song on the end',
        '2. <b>take one out</b>',
        '3. <b>pick one at random</b> and announce it',
        '4. put them <b>in order</b>',
        '5. print the <b>first three</b>',
        'There are no ready-made lines this time: you type the program yourself. The five jobs sit above the box where you type, and each one says done only when your program really does that job.'
      ]
    }, 11000);
    await cine.drop({});
    await cine.pause(1200);
  }
}
];

module.exports = { scenes, BLOCKS_ON_CAMERA };
