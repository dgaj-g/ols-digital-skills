/* J3 Lesson 4 "Function Factory" — the film. TEXT-BASED, silent, captioned,
   FIVE chapters cut into TWO PARTS at their own seam (DFM 168/170; spec §C5).

   PART A (ch1–ch3, ~3:30) opens the hour: the box office's twelve-copy
   program, THE MACHINE animation (def builds it, a call feeds it, return hands
   the product out — and the print trap), and one machine read line by line
   with three calls.
   PART B (ch4–ch5, ~2:00) rides the PLAN face of `factory` as its introVideo:
   the spec card she is about to read, the factory floor, and what the reject
   bin tells her.

   THE WORKED EXAMPLES ARE THE HOUSE'S (DFM 210): the ticket-office programs
   from content (the bloat meter's two real programs), a ticket machine of the
   film's own, and the factory's own spec with the reference machines behind
   it — never a machine a pupil could be writing.

   THE STAGES: lib/py-stage (program / console, as in Lesson 3), lib/machine
   (the new three.js stage, subjects published at birth — DFM 278), and
   lib/dom-stage (the platform's OWN renderers drawing the spec card, the floor
   and the reject bin from a real Skulpt run of the house machines).

   node lib/record.js j3-l4          all chapters
   node assemble.js j3-l4            stitch + chapters.json (two parts)
*/
const path = require('path');
const fs = require('fs');

const STAGE = 'file://' + path.join(__dirname, '..', 'lib', 'py-stage', 'index.html');
const MACHINE = 'file://' + path.join(__dirname, '..', 'lib', 'machine', 'index.html');
const DOM = 'file://' + path.join(__dirname, '..', 'lib', 'dom-stage', 'index.html');
const DASH = '—';
const KICKER = 'J3 · LESSON 4 · FUNCTION FACTORY';

/* THE HOUSE PROGRAMS, READ FROM CONTENT (one fact, one file — DFM 144) */
const CONTENT = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'Desktop', 'Claude Work', 'KS3 DT Platform', 'content-src');
const SRC_J3 = fs.existsSync(path.join(CONTENT, 'j3', 'lessons', 'j3-04.json'))
  ? path.join(CONTENT, 'j3', 'lessons', 'j3-04.json')
  : path.join(__dirname, '..', '..', '..', 'content', 'j3', 'lessons', 'j3-04.json');
const L = JSON.parse(fs.readFileSync(SRC_J3, 'utf8'));
const chunk = (id) => L.chunks.find(c => c.id === id);
const METER = chunk('machine-1').config.meter;
const TWELVE = METER.before.lines;            /* the twelve-order program, 24 lines */
const ONCE = METER.after.lines;               /* one machine, used twelve times */
const FACTORY = chunk('factory').config;
const ORDERS = FACTORY.builds[0].orders;
const FEATS = FACTORY.builds[0].features;
const refOf = (id) => FEATS.find(f => f.id === id).reference;
const HOUSE_MACHINES = refOf('label') + '\n\n' + refOf('cost');   /* the spec's own reference machines */

/* the film's own ticket machine — the one the animation builds, read again
   line by line in chapter 3 */
const TICKET = ['def ticket(name):', '    return "Ticket for " + name',
  'print(ticket("Aoife"))', 'print(ticket("Ben"))', 'print(ticket("Cara"))'];

async function openStage(page, cine) {
  await page.goto(STAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.pystage, null, { timeout: 15000 });
  await page.evaluate(() => window.pystage.reset());
  await cine.install();
  await cine.subject('console', '#conBody');
  await cine.subject('conversation', '#chatBody');
  await cine.subject('program', '#prog');
}
async function assertStage(page, want) {
  const p = await page.evaluate(() => window.pystage.probe());
  if (want.inView && !(p.chatAtEnd && p.conAtEnd)) {
    throw new Error('the newest output is not in view — chat at end: ' + p.chatAtEnd + ', console at end: ' + p.conAtEnd);
  }
  if (want.rows != null && p.rows !== want.rows) throw new Error('program has ' + p.rows + ' line(s), wanted ' + want.rows);
  if (want.consoleHas && p.console.indexOf(want.consoleHas) === -1) throw new Error('console does not contain ' + JSON.stringify(want.consoleHas) + ' — it reads ' + JSON.stringify(p.console));
  if (want.litInView && !p.litInView) throw new Error('the lit line is not in view');
  [['progBottom', p.progBottom], ['chatBottom', p.chatBottom], ['conBottom', p.conBottom]].forEach(([k, v]) => {
    if (v > 478) throw new Error(k + ' reaches ' + v + 'px — into the caption band (a five-line caption starts at 481px)');
  });
  return p;
}
async function openDom(page, cine) {
  await page.goto(DOM, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.domstage && !!window.PyRun, null, { timeout: 20000 });
  await page.evaluate(() => window.domstage.reset());
  await cine.install();
  await cine.subject('platform', '#hostWrap');
}
async function assertDom(page, want) {
  const p = await page.evaluate(() => window.domstage.probe());
  if (want.rows != null && p.rows !== want.rows) throw new Error('table has ' + p.rows + ' row(s), wanted ' + want.rows);
  if (want.orders != null && p.orders !== want.orders) throw new Error('floor shows ' + p.orders + ' order(s), wanted ' + want.orders);
  if (want.has && p.text.indexOf(want.has) === -1) throw new Error('the platform surface does not say ' + JSON.stringify(want.has) + ' — it reads ' + JSON.stringify(p.text));
  if (p.minFontPx < 17) throw new Error('text on camera is ' + p.minFontPx + 'px — too small to read');
  if (want.litInView && !p.litInView) throw new Error('the card the caption is about is not in view');
  return p;
}
async function assertActor(page, log, beat, name, floor) {
  const tok = await page.evaluate(() => window.mc.probeTokens());
  log('beat ' + beat + ' tokens ' + JSON.stringify(tok));
  if (name && !(tok[name] >= (floor || 110))) {
    throw new Error('beat ' + beat + ': the actor it names (' + name + ') measures ' + tok[name] + 'px');
  }
}

/* NO BLOCK EVER APPEARS ON CAMERA IN THIS FILM, DECLARED RATHER THAN LEFT
   BLANK (DFM 207c). It is Python and a machine from the first frame. */
const BLOCKS_ON_CAMERA = [];

const scenes = [
/* ------------------------------------------------------------------ ch1 */
{
  id: 'ch1',
  label: 'The box office',
  tailMs: 1400,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({
      kicker: KICKER, title: 'The box office',
      sub: 'twelve orders, and the same lines twelve times'
    });
    await page.evaluate(() => { window.pystage.program('The twelve-order program', { compact: true }); });
    await page.waitForTimeout(700);
    await cine.lift();

    for (const t of TWELVE) await page.evaluate(l => window.pystage.addLine(l), t);
    await page.evaluate(() => window.pystage.scrollProgram(0));
    await cine.pause(600);
    await assertStage(page, { rows: TWELVE.length });
    await cine.captionShow('The Studio&rsquo;s box office has twelve orders. Every order needs the same two lines. The first line is a label with the name and the number of seats. The second line is the cost.');
    await cine.captionShow('Until today, those two lines had to be typed twelve times, once for each order.');
    const t0 = Date.now();
    /* the program scrolls past, the way it scrolled on the opening card */
    for (let i = 4; i < TWELVE.length; i += 4) { await page.evaluate(n => window.pystage.scrollProgram(n), i); await cine.pause(650); }
    await cine.pause(Math.max(700, cine.holdFor('x '.repeat(40)) - (Date.now() - t0)));
    await cine.captionHide();
    await page.evaluate(() => window.pystage.litMany([1, 3, 5]));
    await cine.caption('There are twenty-four lines, and every one was typed by hand. If the price of a seat changes, twelve lines have to be found and changed. One typing mistake means one order is wrong.');

    await page.evaluate(() => { window.pystage.program('One machine, used twelve times', { compact: true }); });
    for (const t of ONCE) await page.evaluate(l => window.pystage.addLine(l), t);
    await page.evaluate(() => window.pystage.scrollProgram(0));
    await cine.pause(600);
    await assertStage(page, { rows: ONCE.length });
    await page.evaluate(() => window.pystage.litMany([0, 1, 2]));
    await cine.caption('A factory does not build a new machine for every order. It builds the machine once, and then feeds every order through it. In Python, a machine like this is called a <b>FUNCTION</b>.');
    await page.evaluate(() => window.pystage.litMany([3, 4, 5]));
    await cine.caption('Three lines build the machine. Twelve short lines use it, one for each order. The program prints the same twenty-four lines as before. Change the price once, inside the machine, and all twelve costs change.');
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertStage(page, { rows: ONCE.length }); }
},

/* ------------------------------------------------------------------ ch2 */
{
  id: 'ch2',
  label: 'How a machine works: def, the slot, and return',
  tailMs: 1600,
  run: async ({ page, cine, log }) => {
    await page.goto(MACHINE, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.mc, null, { timeout: 20000 });
    await cine.install();
    /* the curtain names the IDEA, not the words: the caption that first says
       "return" is the one that defines it (DFM 192i) */
    await cine.curtain({
      kicker: 'CHAPTER 2', title: 'How a machine works',
      sub: 'build it once, use it again and again'
    });
    await cine.pause(2400);
    await cine.lift();
    await page.evaluate(() => window.mc.ready);

    /* six beats, one idea each (DFM 192e / 207d); the actor each names is
       measured on the real screen (146b). The hand is Lesson 3's hand. */
    /* the captions IN FILM ORDER — a beat told in two captions has two rows here,
       one after the other, so the transcript a reader is handed shows them in the
       order she meets them (the earlier BEATS/BEATS2 pair listed every second
       half after every first, and a cold reader judged them out of sequence).
       BEAT_OF says which beat each caption belongs to; a new beat number plays the
       stage and measures its named actor (146b), a repeat holds the picture. */
    const BEATS = [
      'These two lines build a machine called <b>ticket</b>. The first word, <b>def</b>, BUILDS a machine. The machine has a slot for what goes in. The slot is named in the brackets. This slot is called name.',
      'The two lines that build the machine do nothing on their own. The machine just sits there until a line uses it. Building a machine is not the same as using it.',
      '<b>ticket("Aoife")</b> USES the machine. The word in the brackets is dropped into the slot, and the machine works with it.',
      '<b>return</b> hands the finished thing back out: a ticket comes down the chute into the waiting hand. Whatever comes after the word return is what the machine hands back.',
      'Here is a second use of the machine (a second call). A different name goes into the slot, and a second ticket comes out &mdash; from the SAME machine.',
      'Write the machine once. Then use it as many times as you like.',
      'Here is the trap. This machine has <b>print</b> inside it and no <b>return</b>. Drop a name in and the machine PRINTS the words: they go to the console, not down the chute.',
      'And the hand gets <b>None</b>. None is Python&rsquo;s word for nothing at all. A machine that prints has nothing to hand back. If you want the product, use return.',
    ];
    const BEAT_OF = [1, 1, 2, 3, 4, 4, 5, 6];
    const NAMED = ['machine', 'machine', 'hand', 'ticket_ben', 'shout', 'none'];
    const FLOOR = [110, 110, 55, 40, 40, 40];
    let beatPlayed = 0;
    for (let i = 0; i < BEATS.length; i++) {
      await cine.captionShow(BEATS[i]);
      const t0 = Date.now();
      const beat = BEAT_OF[i];
      if (beat !== beatPlayed) {
        await page.evaluate(n => window.mc.play(n), beat);
        if (beat === 1) {
          const first = await page.evaluate(() => window.mc.probe());
          if (first.nonNavy < 1) throw new Error('the stage drew nothing after beat 1 — WebGL failed: ' + JSON.stringify(first));
          log('stage probe ok: ' + JSON.stringify(first.samples));
        }
        await assertActor(page, log, beat, NAMED[beat - 1], FLOOR[beat - 1]);
        beatPlayed = beat;
      }
      await cine.pause(Math.max(700, cine.holdFor(BEATS[i]) - (Date.now() - t0)));
    }
    await cine.captionHide();
    const last = await page.evaluate(() => window.mc.probe());
    if (last.nonNavy < 1) throw new Error('the machine stage went blank mid-take');
    await cine.drop({});
    await cine.pause(1000);
  }
},

/* ------------------------------------------------------------------ ch3 */
{
  id: 'ch3',
  label: 'Reading a machine',
  tailMs: 4200,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({ kicker: 'CHAPTER 3', title: 'Reading a machine', sub: 'two lines build it, three lines use it' });
    await page.evaluate(() => { window.pystage.eyebrow('ONE MACHINE, THREE CALLS'); window.pystage.split(true); window.pystage.program('The program', { compact: true }); window.pystage.consoleOpen('The console'); });
    await page.waitForTimeout(700);
    await cine.lift();

    for (const t of TICKET) await page.evaluate(l => window.pystage.addLine(l), t);
    await cine.pause(700);
    await assertStage(page, { rows: TICKET.length });
    await page.evaluate(() => window.pystage.litMany([0, 1]));
    await cine.caption('The two lines that start at <b>def</b> are the machine. Python reads them and builds it. Nothing is printed: the console is still empty.');
    await cine.caption('In Python, a slot is called a <b>parameter</b>. Whatever is dropped into it &mdash; Aoife, then Ben, then Cara &mdash; is what the machine works with each time.');
    await page.evaluate(() => window.pystage.litMany([2]));
    await cine.caption('Each of the three bottom lines drops a different name into the slot, and <b>return</b> hands each ticket back out. ticket("Aoife") is a call — one use of the machine.');
    await cine.caption('The <b>print( )</b> wrapped around the call is what puts the ticket in the console.');
    const out = ['Ticket for Aoife', 'Ticket for Ben', 'Ticket for Cara'];
    for (let i = 0; i < 3; i++) {
      await page.evaluate(n => window.pystage.litMany([n]), 2 + i);
      await page.evaluate(lines => window.pystage.print(lines), out.slice(0, i + 1));
      await cine.pause(500);
    }
    await assertStage(page, { consoleHas: 'Ticket for Cara', inView: true });
    await cine.caption('Three tickets came from one machine. The machine was written once. Each call dropped a different name into its slot.');

    await cine.card({
      kicker: 'NOW IT IS YOUR TURN', title: 'Three training builds, then a factory of your own',
      lines: [
        'The machine in the first training build is missing one word from its inside. You put the word in, press RUN, and watch the machine make three products.',
        'Where you type Python lines yourself, there is a grey button that says <b>Show me the shape</b>. You lose no points for using it.',
        'At the end comes the Rush: somebody in this room sends your machines three orders, and checks what came out.'
      ]
    }, 10500);
    await cine.drop({});
    await cine.pause(1200);
  },
  verify: async ({ page }) => { await assertStage(page, { rows: TICKET.length, consoleHas: 'Ticket for Cara' }); }
},

/* ================= PART B — served on the PLAN face of her factory ======= */
/* ------------------------------------------------------------------ ch4 */
{
  id: 'ch4',
  label: 'The spec card and the floor',
  tailMs: 1400,
  run: async ({ page, cine, log }) => {
    await openDom(page, cine);
    await cine.curtain({
      kicker: KICKER + ' · PART 2', title: 'The spec card and the floor',
      sub: 'what each machine must hand back, and twelve orders through it'
    });
    await page.evaluate(() => window.domstage.eyebrow('THE SPEC CARD'));
    await page.waitForTimeout(600);
    await cine.lift();

    await page.evaluate(S => window.domstage.spec(S), FACTORY.spec);
    await assertDom(page, { rows: 2, has: 'label' });
    await cine.caption('Read the spec card first. Every order on the floor is a name and a number of seats. Your factory needs two machines, and the spec card has one row for each machine.');
    await page.evaluate(() => window.domstage.lit('tbody tr', 0));
    await cine.caption('Each row says what the machine is called, what goes in its slots, and what it must hand back. Each row also gives one example, so you can see exactly what your own machine should hand back.');
    await page.evaluate(() => window.domstage.lit('tbody tr', 1));
    await cine.caption('<b>label</b> has two slots, with a comma between them. <b>cost</b> has one slot. Build both machines. Then use each machine once at the bottom, so you can see it work. Then press RUN.');

    /* THE FLOOR, for real: the spec's own reference machines through the
       platform's own routine, twelve orders, the platform's own renderer */
    /* the floor's small ORDER / PRODUCT tags are the platform's own .68rem:
       the floor screens stand a little larger so those read at 17px+ */
    await page.evaluate(() => { window.domstage.lit(null); window.domstage.reset(); window.domstage.eyebrow('THE FACTORY FLOOR'); window.domstage.zoom(1.65); window.domstage.width(680); });
    const rLabel = await page.evaluate(([code, cfg]) => window.domstage.runCalls(code, cfg),
      [HOUSE_MACHINES, { fn: 'label', args: ORDERS, reference: refOf('label') }]);
    log('label floor: ' + rLabel.products.length + ' products, allOk=' + rLabel.allOk);
    if (!rLabel.allOk || rLabel.products.length !== ORDERS.length) throw new Error('the house label machine does not pass its own floor: ' + JSON.stringify(rLabel).slice(0, 300));
    await page.evaluate(([F, r]) => window.domstage.floor(F, r, 'label'), [FACTORY.floor, rLabel]);
    await assertDom(page, { orders: ORDERS.length, has: FACTORY.floor.rejectEmpty });
    await page.evaluate(() => window.domstage.scrollTo('.fac-order', 0));
    await cine.caption('When you press RUN, the floor drops every order into your machine and shows what comes out: the order that went in, and the product beside it.');
    await page.evaluate(() => window.domstage.lit('.fac-order', 1));
    await assertDom(page, { litInView: true });
    await cine.caption('Every product gets a stamp. When the stamp says <b>matches</b>, the product is exactly what the spec card asked for. You are aiming for twelve stamps that say matches, one for every order.');
    await page.evaluate(() => { window.domstage.lit(null); window.domstage.scrollTo('.fac-reject', 0); });
    await cine.caption('And under the floor is the reject bin. When every product matches, it is empty &mdash; which is what you are aiming for.');
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertDom(page, { orders: ORDERS.length }); }
},

/* ------------------------------------------------------------------ ch5 */
{
  id: 'ch5',
  label: 'The reject bin',
  tailMs: 3600,
  run: async ({ page, cine, log }) => {
    await openDom(page, cine);
    await cine.curtain({ kicker: 'PART 2 · CHAPTER 2', title: 'The reject bin', sub: 'a run that printed instead of returning' });
    await page.evaluate(() => { window.domstage.eyebrow('THE REJECT BIN'); window.domstage.zoom(1.65); window.domstage.width(680); });
    await page.waitForTimeout(600);
    await cine.lift();

    /* a cost machine that PRINTS: every product comes back None, and the bin
       says so in one sentence (the platform's own all-None collapse) */
    const PRINTS = 'def cost(seats):\n    print(seats * 4)';
    const rNone = await page.evaluate(([code, cfg]) => window.domstage.runCalls(code, cfg),
      [PRINTS, { fn: 'cost', args: ORDERS.map(o => [o[1]]), reference: refOf('cost') }]);
    log('printing cost machine: allOk=' + rNone.allOk + ' none=' + rNone.products.filter(p => p.none).length);
    if (rNone.allOk || rNone.products.filter(p => p.none).length !== ORDERS.length) throw new Error('the printing machine did not come back all-None: ' + JSON.stringify(rNone).slice(0, 300));
    await page.evaluate(([F, r]) => window.domstage.floor(F, r, 'cost'), [FACTORY.floor, rNone]);
    await assertDom(page, { orders: ORDERS.length, has: 'None' });
    await page.evaluate(() => window.domstage.scrollTo('.fac-order', 0));
    await cine.caption('This cost machine has <b>print</b> on its inside line, and no <b>return</b>. Every product is <b>None</b>, Python’s word for nothing at all. So every product gets the stamp “<b>nothing came back</b>”.');
    await page.evaluate(() => window.domstage.scrollTo('.fac-reject', 0));
    await assertDom(page, { has: 'printed instead of handing back with return' });
    await cine.caption('The reject bin shows what went wrong: the machine printed instead of returning. Each card shows your product beside what the spec card wanted. Change print to return on the inside line, and the bin empties.');

    /* a machine that hands back the WRONG thing: the bin shows the pair */
    await page.evaluate(() => { window.domstage.reset(); window.domstage.eyebrow('THE REJECT BIN, A DIFFERENT MISTAKE'); });
    const WRONG = 'def label(name, seats):\n    return name + "x" + str(seats)';
    const rWrong = await page.evaluate(([code, cfg]) => window.domstage.runCalls(code, cfg),
      [WRONG, { fn: 'label', args: ORDERS, reference: refOf('label') }]);
    log('wrong label machine: allOk=' + rWrong.allOk + ' bad=' + rWrong.products.filter(p => !p.ok).length);
    if (rWrong.allOk) throw new Error('the wrong label machine passed the floor');
    await page.evaluate(([F, r]) => window.domstage.floor(F, r, 'label'), [FACTORY.floor, rWrong]);
    await assertDom(page, { orders: ORDERS.length, has: FACTORY.floor.wrongStamp });
    await page.evaluate(() => window.domstage.scrollTo('.fac-reject h3', 0));
    await cine.caption('A product can also be the wrong thing. This label machine is missing the spaces around the x.');
    await cine.caption('The bin shows your product beside the product the spec wanted. Read both, and the difference shows you what to fix.');
    await page.evaluate(() => window.domstage.scrollTo('.fac-reject-more', 0));
    await assertDom(page, { has: 'more like these' });
    await cine.caption('There are twelve rejects. The bin shows three of them, and says how many more are like them. Fix the one wrong line, press RUN, and all twelve change together. That is why you built a machine.');
    await cine.drop({});
    await cine.pause(1200);
  },
  verify: async ({ page }) => { await assertDom(page, { orders: ORDERS.length }); }
}
];

module.exports = { scenes, BLOCKS_ON_CAMERA };
