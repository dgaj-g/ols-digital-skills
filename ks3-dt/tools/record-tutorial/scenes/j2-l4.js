/* J2 Lesson 4 "Adventure Engine" — the film. TEXT-BASED, silent, captioned,
   FIVE chapters cut into TWO PARTS at their own seam (DFM 168/170; spec §C5).

   PART A (ch1–ch3, ~3:30) opens the hour: one room of a text adventure played,
   THE FORK animation (a program that chooses which lines to run), and one whole
   room read line by line with one typed word.
   PART B (ch4–ch5, ~2:00) rides the PLAN face of `myroom` as its introVideo,
   because that is where what it shows is next needed: the room recipe, and the
   path check she is about to meet.

   THE WORKED EXAMPLES ARE THE HOUSE'S (DFM 210): the canteen room and the
   corridor room from the class adventure's own house rooms, verbatim from
   content — never a room a pupil could be writing. The two things the film hands
   over are the SHAPE and what the path check shows, never her words.

   THE STAGES: lib/py-stage (the conversation / the program / the console, as in
   Lesson 3), lib/fork (the new three.js stage, subjects published at birth —
   DFM 278), and lib/dom-stage (the platform's OWN renderers drawing the path
   check from a real Skulpt run — the table she sees is the table on camera).

   node lib/record.js j2-l4          all chapters
   node assemble.js j2-l4            stitch + chapters.json (two parts)
*/
const path = require('path');
const fs = require('fs');

const STAGE = 'file://' + path.join(__dirname, '..', 'lib', 'py-stage', 'index.html');
const FORK = 'file://' + path.join(__dirname, '..', 'lib', 'fork', 'index.html');
const DOM = 'file://' + path.join(__dirname, '..', 'lib', 'dom-stage', 'index.html');
const DASH = '—';
const KICKER = 'J2 · LESSON 4 · ADVENTURE ENGINE';

/* THE HOUSE ROOMS, READ FROM CONTENT (one fact, one file — DFM 144). The film
   never carries its own copy of a room: if the canteen changes in content-src,
   the film re-records the new canteen. */
const CONTENT = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'Desktop', 'Claude Work', 'KS3 DT Platform', 'content-src');
const SRC_J2 = fs.existsSync(path.join(CONTENT, 'j2', 'lessons', 'j2-04.json'))
  ? path.join(CONTENT, 'j2', 'lessons', 'j2-04.json')
  : path.join(__dirname, '..', '..', '..', 'content', 'j2', 'lessons', 'j2-04.json');
const L = JSON.parse(fs.readFileSync(SRC_J2, 'utf8'));
const chunk = (id) => L.chunks.find(c => c.id === id);
const HOUSE = chunk('classadventure').config.houseRooms;
const CANTEEN = HOUSE.find(r => /canteen/i.test(r.title)).lines.map(l => l.t);
const CORRIDOR = HOUSE.find(r => /corridor/i.test(r.title)).lines.map(l => l.t);
const MYROOM = chunk('myroom').config;
const WORDS = ['left', 'right'];   /* the corridor room's own two words */

async function openStage(page, cine) {
  await page.goto(STAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.pystage, null, { timeout: 15000 });
  await page.evaluate(() => window.pystage.reset());
  await cine.install();
  /* J13(g): the subject regions are declared, once, here — the OUTPUT areas,
     not the panel chrome (see scenes/j2-l3.js for the find that made this law) */
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
  if (want.said != null && p.said !== want.said) throw new Error('conversation has ' + p.said + ' line(s), wanted ' + want.said);
  if (want.consoleHas && p.console.indexOf(want.consoleHas) === -1) throw new Error('console does not contain ' + JSON.stringify(want.consoleHas) + ' — it reads ' + JSON.stringify(p.console));
  if (want.litInView && !p.litInView) throw new Error('the lit line is not in view');
  /* the caption band is the caption's: no panel may stand in the bottom 150px */
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
  if (want.has && p.text.indexOf(want.has) === -1) throw new Error('the platform surface does not say ' + JSON.stringify(want.has) + ' — it reads ' + JSON.stringify(p.text));
  if (want.jobs && p.jobs.join(',') !== want.jobs) throw new Error('jobs read ' + p.jobs.join(',') + ', wanted ' + want.jobs);
  if (p.minFontPx < 17) throw new Error('text on camera is ' + p.minFontPx + 'px — too small to read');
  if (want.litInView && !p.litInView) throw new Error('the row the caption is about is not in view');
  return p;
}
async function assertActor(page, log, beat, name, floor) {
  const tok = await page.evaluate(() => window.fk.probeTokens());
  log('beat ' + beat + ' tokens ' + JSON.stringify(tok));
  if (name && !(tok[name] >= (floor || 110))) {
    throw new Error('beat ' + beat + ': the actor it names (' + name + ') measures ' + tok[name] + 'px');
  }
}

/* NO BLOCK EVER APPEARS ON CAMERA IN THIS FILM, DECLARED RATHER THAN LEFT
   BLANK (DFM 207c). It is Python from the first frame. */
const BLOCKS_ON_CAMERA = [];

/* one room played in the conversation panel: the scene lines, the question,
   the player's word, the road, the door line */
async function playRoom(page, cine, lines, word, opts) {
  opts = opts || {};
  const say = (who, text) => page.evaluate(([w, t, l]) => window.pystage.say(w, t, l), [who, text, who === 'you' ? 'The player' : 'The room']);
  const printed = (t) => t.replace(/^\s*print\("(.*)"\)\s*$/, '$1');
  const ask = lines.find(l => /input\(/.test(l)).replace(/^.*input\("(.*)"\).*$/, '$1');
  const before = lines.filter(l => /^print\(/.test(l) && lines.indexOf(l) < lines.findIndex(x => /input\(/.test(x)));
  for (const l of before) { await say('bot', printed(l)); await cine.pause(opts.gap || 650); }
  await say('bot', ask);
  await page.evaluate(() => window.pystage.waiting(true, 'waiting for the player'));
  await cine.pause(opts.wait || 1500);
  await say('you', word);
  await page.evaluate(() => window.pystage.waiting(false));
  await cine.pause(500);
  /* the road: the pushed-in lines under the signpost whose word this is, else
     the road with no sign — the same rule the fork stage draws */
  const iIf = lines.findIndex(l => new RegExp('^if choice == "' + word + '"').test(l));
  const iElif = lines.findIndex(l => new RegExp('^elif choice == "' + word + '"').test(l));
  let start = iIf >= 0 ? iIf : iElif >= 0 ? iElif : lines.findIndex(l => /^else:/.test(l));
  const road = [];
  for (let i = start + 1; i < lines.length && /^\s{4}/.test(lines[i]); i++) road.push(lines[i]);
  for (const l of road) { await say('bot', printed(l)); await cine.pause(opts.gap || 650); }
  return road.map(printed);
}

const scenes = [
/* ------------------------------------------------------------------ ch1 */
{
  id: 'ch1',
  label: 'A room of a text adventure',
  tailMs: 1400,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({
      kicker: KICKER, title: 'A room of a text adventure',
      sub: 'a story that a program tells you one piece at a time'
    });
    await page.evaluate(() => { window.pystage.eyebrow('THE CANTEEN ROOM, PLAYED'); window.pystage.chatOpen('The adventure'); });
    await page.waitForTimeout(700);
    await cine.lift();

    await cine.caption('A <b>text adventure</b> is a story that a program tells you one piece at a time. Here is one room of a text adventure. It is running. It is the room you watched on the opening card.');
    const road1 = await playRoom(page, cine, CANTEEN, 'trolley');
    await cine.pause(700);
    await assertStage(page, { said: 6, inView: true });
    await cine.caption('The room says where the player is. Then it asks <b>one</b> question. The question says the two words the player can type. Then the room waits for the player, exactly as your chatbot waited last lesson.');
    await cine.caption('The player typed <b>trolley</b>, so the room chose the trolley road. The last line is the <b>door line</b>: <b>NEXT: door A</b>. That line is how the adventure moves the player on to the next room.');
    /* the other word, the other road: the whole point, seen */
    await page.evaluate(() => { window.pystage.chatOpen('The adventure'); });
    await cine.captionShow('If the player types <b>window</b> instead, the same room chooses a different road, and the player goes through a different door. That is the one new thing today: a program that <b>chooses which lines to run</b>.');
    const road2 = await playRoom(page, cine, CANTEEN, 'window', { wait: 1100 });
    await cine.pause(1200);
    await cine.captionHide();
    await assertStage(page, { said: 6, inView: true });
    if (road1.join('|') === road2.join('|')) throw new Error('the two plays told the same road — the canteen room in content has changed shape');
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertStage(page, { said: 6, inView: true }); }
},

/* ------------------------------------------------------------------ ch2 */
{
  id: 'ch2',
  label: 'The fork: if, elif and else',
  tailMs: 1600,
  run: async ({ page, cine, log }) => {
    await page.goto(FORK, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.fk, null, { timeout: 20000 });
    await cine.install();
    /* the curtain names the IDEA, not the words: a term's first appearance in
       the film is the caption that defines it (DFM 192i), and a title that said
       "fork" and "elif" before either had been explained was that rule's fault */
    await cine.curtain({
      kicker: 'CHAPTER 2', title: 'A signpost in the program',
      sub: 'a program that chooses which lines to run'
    });
    await cine.pause(2400);
    await cine.lift();
    await page.evaluate(() => window.fk.ready);

    /* seven beats, one idea each (DFM 192e / 207d); the actor each names is
       measured on the real screen, never judged by eye (146b) */
    /* the captions IN FILM ORDER — a beat told in two captions has two rows here,
       one after the other, so the transcript a reader is handed shows them in the
       order she meets them (the earlier BEATS/BEATS2 pair listed every second
       half after every first, and a cold reader judged them out of sequence).
       BEAT_OF says which beat each caption belongs to; a new beat number plays the
       stage and measures its named actor (146b), a repeat holds the picture. */
    const BEATS = [
      'A program runs down the page one line at a time. This one has a <b>fork</b> in it. The fork is the line that starts with if: a signpost, with a question on it.',
      'The player types a word, and it goes into the box called <b>choice</b> &mdash; a variable, the same kind of box as last lesson.',
      'The signpost asks: is the word in the box the same as <b>left</b>? It is, so the signpost\'s lamp lights up: <b>TRUE</b>.',
      'The two lines pushed in under the if belong to the if. When the if signpost says TRUE, those two lines run. They are its road.',
      'Once a road has run, Python skips the rest of the fork. The other roads stay dark. Not one of their lines runs.',
      'Now the player types a different word. The first signpost says <b>FALSE</b>, so Python moves on to the next signpost.',
      '<b>elif</b> is a second signpost. Python only looks at it when the first signpost said FALSE. When the elif signpost says TRUE, its road runs instead.',
      'Now the player types a word nobody planned for. Both signposts say FALSE. <b>else</b> is the road with no signpost on it. It is for everything else, so it runs.',
      'The same program ran three times, with three different words, and it took three different roads. It is one program, and the player\'s word decides which road runs. The fork is the part that chooses.',
    ];
    const BEAT_OF = [1, 2, 3, 3, 4, 5, 5, 6, 7];
    const NAMED = ['program', 'box', 'row1', 'sign2', 'row2', 'row3', 'roads'];
    let beatPlayed = 0;
    for (let i = 0; i < BEATS.length; i++) {
      await cine.captionShow(BEATS[i]);
      const t0 = Date.now();
      const beat = BEAT_OF[i];
      if (beat !== beatPlayed) {
        await page.evaluate(n => window.fk.play(n), beat);
        if (beat === 1) {
          const first = await page.evaluate(() => window.fk.probe());
          if (first.nonNavy < 1) throw new Error('the stage drew nothing after beat 1 — WebGL failed: ' + JSON.stringify(first));
          log('stage probe ok: ' + JSON.stringify(first.samples));
        }
        await assertActor(page, log, beat, NAMED[beat - 1], 110);
        beatPlayed = beat;
      }
      await cine.pause(Math.max(700, cine.holdFor(BEATS[i]) - (Date.now() - t0)));
    }
    await cine.captionHide();
    const last = await page.evaluate(() => window.fk.probe());
    if (last.nonNavy < 1) throw new Error('the fork stage went blank mid-take');
    await cine.drop({});
    await cine.pause(1000);
  }
},

/* ------------------------------------------------------------------ ch3 */
{
  id: 'ch3',
  label: 'Reading a whole room',
  tailMs: 4200,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({ kicker: 'CHAPTER 3', title: 'Reading a whole room', sub: 'the canteen room, line by line, after the player types one word' });
    await page.evaluate(() => { window.pystage.program('The canteen room, line by line', { compact: true }); });
    await page.waitForTimeout(700);
    await cine.lift();

    /* screen 1: the scene and the question */
    const iAsk = CANTEEN.findIndex(l => /input\(/.test(l));
    for (const t of CANTEEN.slice(0, iAsk + 1)) await page.evaluate(l => window.pystage.addLine(l), t);
    await cine.pause(700);
    await assertStage(page, { rows: iAsk + 1 });
    await page.evaluate(() => window.pystage.litMany([0, 1]));
    await cine.caption('Every room has the same shape. It starts by saying where the player is. Those are the print lines. They run every time, whatever the player types.');
    await page.evaluate(n => window.pystage.litMany([n]), iAsk);
    await cine.caption('Then it asks <b>one</b> question with input( ), and the answer goes into the box called <b>choice</b> — a variable. The question says the two words the player can type: <b>trolley</b> or <b>window</b>.');

    /* screen 2: the fork, with the player's word in the eyebrow */
    await page.evaluate(() => { window.pystage.program('The canteen room, continued — the player typed: trolley', { compact: true }); });
    const FORK_LINES = CANTEEN.slice(iAsk + 1);
    for (const t of FORK_LINES) await page.evaluate(l => window.pystage.addLine(l), t);
    await cine.pause(600);
    await assertStage(page, { rows: FORK_LINES.length });
    await page.evaluate(() => window.pystage.litMany([0]));
    await cine.caption('Now comes the fork. The fork is the line that starts with if. It asks: is what the player typed the same as trolley?');
    await cine.caption('<b>Two</b> equals signs ask that question. One equals sign would put something into a box.');
    await page.evaluate(() => window.pystage.litMany([1, 2]));
    await cine.caption('What the player typed is the same as trolley. So the two lines pushed in under the if both run: the story line, which says what happens, and the door line.');
    const iElse = FORK_LINES.findIndex(l => /^else:/.test(l));
    await page.evaluate(n => { window.pystage.litMany([]); window.pystage.dim([n, n + 1, n + 2]); }, iElse);
    await cine.caption('The two lines pushed in under the else line only run when the player types anything else. This time they do not run at all. The fork chose the trolley road, so the window road stays dark.');
    await page.evaluate(n => { window.pystage.undim(); window.pystage.litMany([2, n + 2]); }, iElse);
    await cine.caption('Every road ends with a door line: <b>NEXT: door A</b> or <b>NEXT: door B</b>. The website reads that line to move the player on to the next room.');

    /* screen 3: what actually came out, for that word */
    await page.evaluate(() => { window.pystage.eyebrow('WHAT THE ROOM PRINTED FOR: trolley'); document.getElementById('progPanel').classList.add('hidden'); window.pystage.consoleOpen('The console'); });
    const printed = (t) => t.replace(/^\s*print\("(.*)"\)\s*$/, '$1');
    const out = CANTEEN.slice(0, iAsk).map(printed).concat(FORK_LINES.slice(1, iElse).map(printed));
    await page.evaluate(lines => window.pystage.print(lines), out);
    await cine.pause(900);
    await assertStage(page, { consoleHas: 'NEXT: door A', inView: true });
    await cine.caption('Here is everything the room printed when the player typed trolley. First comes the scene: the lines that say where the player is. Then comes the trolley road, with its door line.');
    await cine.caption('The window road printed nothing, because the fork never chose it.');

    await cine.card({
      kicker: 'NOW IT IS YOUR TURN', title: 'Three training builds, then a room of your own',
      lines: [
        'The first build has a mistake on its fork line. It was put there on purpose. You press RUN, read what Python says, and put the mistake right.',
        'Where you type Python lines yourself, there is a grey button that says <b>Show me the shape</b>. You lose no points for using it.',
        'At the end, your room joins the class adventure, and you play through other people&rsquo;s rooms.'
      ]
    }, 10500);
    await cine.drop({});
    await cine.pause(1200);
  },
  verify: async ({ page }) => { await assertStage(page, { consoleHas: 'NEXT: door A' }); }
},

/* ================= PART B — served on the PLAN face of her own room ======= */
/* ------------------------------------------------------------------ ch4 */
{
  id: 'ch4',
  label: 'The room recipe',
  tailMs: 1400,
  run: async ({ page, cine }) => {
    await openStage(page, cine);
    await cine.curtain({
      kicker: KICKER + ' · PART 2', title: 'The room recipe',
      sub: 'scene, question, two roads, and a door on every road'
    });
    await page.evaluate(() => { window.pystage.program('The corridor room — one of the house rooms', { compact: true }); });
    await page.waitForTimeout(700);
    await cine.lift();
    for (const t of CORRIDOR) await page.evaluate(l => window.pystage.addLine(l), t);
    await cine.pause(700);
    await assertStage(page, { rows: CORRIDOR.length });

    /* THE FIVE JOBS ON CAMERA ARE THE FIVE JOBS ON HER CARD, in her card's order
       and words (DFM 179a: one definition, the same everywhere) */
    const iAsk = CORRIDOR.findIndex(l => /input\(/.test(l));
    const iIf = CORRIDOR.findIndex(l => /^if /.test(l));
    const iElse = CORRIDOR.findIndex(l => /^else:/.test(l));
    const stories = CORRIDOR.map((l, i) => (/^\s{4}print/.test(l) && !/NEXT: door/.test(l)) ? i : -1).filter(i => i >= 0);
    const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
    await page.evaluate(n => window.pystage.litMany(Array.from({ length: n + 1 }, (_, i) => i)), iAsk);
    await cine.caption('Your room has five jobs. They are the five listed on this card. The room in this film is already written, and it does all five.');
    await cine.caption('<b>One:</b> it says where the player is, then it asks ONE question that says your two words. In this room the two words are left and right.');
    await page.evaluate(r => window.pystage.litMany(r), range(iIf, iElse));
    await cine.caption('<b>Two:</b> if the player types your FIRST word, one road runs, and it ends with a door line: <b>NEXT: door A</b>.');
    await page.evaluate(r => window.pystage.litMany(r), range(iElse, CORRIDOR.length));
    await cine.caption('<b>Three:</b> if the player types your SECOND word, the other road runs, and it ends with its own door line. This room uses <b>else</b> for that road.');
    await cine.caption('<b>Four:</b> if the player types anything else, the room still sends them through a door. else catches everything else, so nobody gets stuck.');
    await page.evaluate(r => window.pystage.litMany(r), stories);
    await cine.caption('<b>Five:</b> the two roads tell different stories. If the player types left, the story goes to the music room. If the player types anything else, the story goes to the stairs.');
    await page.evaluate(() => window.pystage.litMany([]));
    await cine.caption('The shape on your card has an <b>elif</b> line too, so your second word gets a road of its own. Every CAPITAL word in that shape is yours to change. The shape itself stays the same.');
    await cine.drop({});
    await cine.pause(900);
  },
  verify: async ({ page }) => { await assertStage(page, { rows: CORRIDOR.length }); }
},

/* ------------------------------------------------------------------ ch5 */
{
  id: 'ch5',
  label: 'The path check',
  tailMs: 3600,
  run: async ({ page, cine, log }) => {
    await openDom(page, cine);
    await cine.curtain({ kicker: 'PART 2 · CHAPTER 2', title: 'The path check', sub: 'the website plays your room three times' });
    await page.evaluate(() => window.domstage.eyebrow('THE PATH CHECK'));
    await page.waitForTimeout(600);
    await cine.lift();

    /* a corridor room with the else road's DOOR LINE missing: the real path
       check, run by the platform's own routine over real Python, says NO DOOR */
    const doorLess = CORRIDOR.filter((l, i) => !(/NEXT: door/.test(l) && i > CORRIDOR.findIndex(x => /^else:/.test(x))));
    if (doorLess.length !== CORRIDOR.length - 1) throw new Error('could not take the else road door line out of the corridor room');
    const r1 = await page.evaluate(([code, words]) => window.domstage.runPaths(code, { words }), [doorLess.join('\n'), WORDS]);
    log('doorless run: ' + JSON.stringify(r1.rows.map(x => x.word + '→' + (x.door || 'none'))));
    if (r1.features['catch-all']) throw new Error('the door-less room passed catch-all — the path check would not have caught it');
    await page.evaluate(([T, rows]) => window.domstage.pathTable(T, rows), [MYROOM.pathTable, r1.rows]);
    await assertDom(page, { rows: 3, has: 'no door' });
    await page.evaluate(() => window.domstage.lit('tbody tr', 0));
    await cine.caption('When you press RUN, the website plays your room three times &mdash; once with each of your two words, and once with a word you did not plan for: <b>banana</b>.');
    await cine.caption('Each play gets one row. The row shows what was typed, what the room said, and which door.');
    await page.evaluate(() => window.domstage.lit('tbody tr', 2));
    await assertDom(page, { litInView: true });
    await cine.caption('This room has a problem. When the player typed <b>right</b>, and when the player typed <b>banana</b>, the last column says <b>no door</b>. The road for anything else has no door line, so the adventure could not move on.');

    /* the fix, and the same table again: three doors, and the five jobs tick */
    await page.evaluate(() => { window.domstage.lit(null); window.domstage.reset(); window.domstage.eyebrow('THE PATH CHECK, AFTER THE FIX'); });
    const r2 = await page.evaluate(([code, words]) => window.domstage.runPaths(code, { words }), [CORRIDOR.join('\n'), WORDS]);
    log('fixed run: ' + JSON.stringify(r2.rows.map(x => x.word + '→' + (x.door || 'none'))) + ' ' + JSON.stringify(r2.features));
    if (!r2.features['paths-all']) throw new Error('the house corridor room does not pass its own path check: ' + JSON.stringify(r2.features));
    await page.evaluate(([T, rows]) => window.domstage.pathTable(T, rows), [MYROOM.pathTable, r2.rows]);
    await assertDom(page, { rows: 3 });
    await cine.caption('The fix is to put a door line on that road and press RUN again. Now there are three plays and three doors. Every row has a door.');
    await page.evaluate(() => { window.domstage.reset(); window.domstage.eyebrow('THE FIVE JOBS'); });
    const feats = MYROOM.builds[0].features;
    const states = feats.map(f => (r2.features[f.probe === 'path' ? (f.word === 'w1' ? 'path-1' : f.word === 'w2' ? 'path-2' : 'catch-all') : f.probe] ? 'ok' : 'no'));
    await page.evaluate(([title, feats, pending, states]) => window.domstage.jobs(title, feats, pending, states),
      [MYROOM.checklistLabel, feats, MYROOM.pendingLabel, states]);
    await assertDom(page, { jobs: 'is-matched,is-matched,is-matched,is-matched,is-matched' });
    await cine.caption('Every time you press RUN, the website uses those three plays to tick the five jobs above your program.');
    await cine.caption('When all five jobs are done, the Publish button switches on. Your room then joins the class adventure with a number on it &mdash; never your name.');
    await cine.drop({});
    await cine.pause(1200);
  },
  verify: async ({ page }) => { await assertDom(page, { jobs: 'is-matched,is-matched,is-matched,is-matched,is-matched' }); }
}
];

module.exports = { scenes, BLOCKS_ON_CAMERA };
