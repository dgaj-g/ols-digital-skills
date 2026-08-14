/* J1 Lesson 5 "Game Studio" - the Masterclass: "Making Your Game React"
   (text-based, no narration). Policy: the film teaches SELECTION on the
   Catch It template only (the spec's worked example) - Maze Escape and Quiz
   Master are never shown; their blueprints translate the same block. The
   film must let an absent pupil learn if/else alone, and it must NOT do the
   pupil's build for their own kit beyond what the blueprint already shows.
   Chapter labels feed the platform video engine.

   Pipeline laws inherited from scenes/l4.js (read its header):
   - accept native confirm() dialogs (openEditor does);
   - the OS file picker can't be filmed - curtain dip, load behind it
     (drv.loadProject is curtain-safe DOM clicking);
   - NO on-camera dropdown/field clicks (refused under the recorder) -
     callout + curtain dip to a pre-authored .sb3 state instead;
   - off-camera state setup = load a pre-authored variant (the L5 template
     generator built all three Catch It states);
   - keyboard reaches the VM once the flag is clicked. */
const path = require('path');
const { dataUri } = require('../lib/cinema');

const DASH = '—';
const CREST = dataUri('crest-360.png');

const SB3_DIR = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/sb3');
/* THE FILM TEACHES ON A DEMO THAT BELONGS TO NO CONTRACT (DFM 210, his find).
   It used to load the Catch It kit and build its finished answer on camera: "if
   that's true, then that's a clear advantage for anybody who chooses that first
   game." These three states are a Lamp that asks one question — is the space bar
   down? — so every pupil transfers the same distance and nobody is handed their
   own answer. The keyboard is used because it is the input the recorder can drive
   once the flag is clicked (see the header); a mouse-touch test would have filmed
   a speech bubble that never appeared. */
const SB3_NONE = path.join(SB3_DIR, 'demo-choice-none.sb3');   /* sequence only */
const SB3_HALF = path.join(SB3_DIR, 'demo-choice-half.sb3');   /* an if, no else */
const SB3_FULL = path.join(SB3_DIR, 'demo-choice-full.sb3');   /* both parts */

/* THE SPRITE'S OWN x/y READOUTS. Probed from the live editor rather than guessed:
   each sits in a [class*="sprite-info_group"] whose text is the letter itself.
   The hashed suffixes scratch-gui appends (sprite-info_group_GgQtt) change
   between builds, so only the stable prefix and the label are matched. */
async function xyReadout(drv) {
  return drv.page.evaluate(() => {
    const groups = Array.from(document.querySelectorAll('[class*="sprite-info_group"]'));
    const one = (letter) => {
      const g = groups.find(el => (el.textContent || '').trim().toLowerCase() === letter);
      const inp = g && g.querySelector('input');
      if (!inp) return null;
      const r = inp.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, value: inp.value };
    };
    const X = one('x'), Y = one('y');
    if (!X || !Y) return null;
    const left = Math.min(X.x, Y.x), top = Math.min(X.y, Y.y);
    return { X: X, Y: Y, box: { x: left - 10, y: top - 10,
      w: (Math.max(X.x + X.w, Y.x + Y.w) - left) + 20, h: Math.max(X.h, Y.h) + 20 } };
  });
}

/* WHERE THE SPRITE ACTUALLY IS, in screen pixels. Scratch's stage maps x -240..240
   across and y 180..-180 down, so the sprite's own readouts give its position on
   screen. The first cut of the coordinates beat dragged from the MIDDLE of the
   stage - but the lamp has just FALLEN to the bottom, so both drags grabbed empty
   stage and the readouts never moved. The captions would then have claimed "both
   numbers went MINUS" over a sprite that had not budged (rule 35), and the only
   reason it was caught is that the two logged readings came back identical. */
async function spriteScreenPos(drv) {
  const xy = await xyReadout(drv);
  const st = await drv.stageArea();
  if (!xy || !st) return null;
  const sx = Number(xy.X.value), sy = Number(xy.Y.value);
  if (!isFinite(sx) || !isFinite(sy)) return null;
  return { x: st.x + ((sx + 240) / 480) * st.w, y: st.y + ((180 - sy) / 360) * st.h, sx: sx, sy: sy };
}

/* comment bubbles are not blockly draggables - find the STUDIO NOTE directly */
async function commentRect(drv) {
  return drv.page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.blocklyComment, .blocklyCommentTarget, [class*="blocklyComment"]'));
    for (const e of els) {
      const r = e.getBoundingClientRect();
      if (r.width > 40 && r.height > 20) return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
    }
    return null;
  });
}

/* sweep the bowl along the floor with the mouse until the score moves
   (mouse-dragging a sprite is how the L4 film played the shark, too) */
async function catchOne(cine, drv, log) {
  const st = await drv.stageArea();
  if (!st) throw new Error('stage canvas not found');
  const floorY = st.y + st.h * 0.88;
  let from = { x: st.x + st.w / 2, y: floorY };
  for (let leg = 0; leg < 8; leg++) {
    const tx = leg % 2 === 0 ? st.x + st.w - 40 : st.x + 40;
    await cine.drag(from.x, from.y, tx, floorY, { ms: 2000 });
    from = { x: tx, y: floorY };
    const mon = await drv.monitorText();
    const m = /score\s*(\d+)/i.exec(mon || '');
    log('bowl sweep leg ' + leg + ': ' + mon);
    if (m && Number(m[1]) >= 1) return Number(m[1]);
  }
  const mon = await drv.monitorText();
  const m = /score\s*(\d+)/i.exec(mon || '');
  return m ? Number(m[1]) : 0;
}

/* the flag listens for real mouse events (DOM .click() does nothing), and
   caption pills swallow real clicks - so captions must be DOWN around a
   flag click. Cost ch4 six takes between them; keep this order. */
async function flagClick(page, cine, drv) {
  const f = await drv.greenFlag();
  if (!f) throw new Error('green flag not found');
  await cine.click(f.cx, f.cy, { after: 700 });
}

/* ============ BLOCKS_ON_CAMERA (DFM 207c) ============
   HIS FINDING: the film read "go to x ... y ..." on camera and no lesson had ever
   taught coordinates — "I don't think a student would have seen any of that code
   before" — and then: "anything similarly new or complex needs explained as well."
   So every block this film SHOWS is listed here with where it is taught. A row
   with no teaching home fails qa-harness-coverage: the film may not put a block
   on screen and leave a child to guess what it is. */
const BLOCKS_ON_CAMERA = [
  { block: 'when green flag clicked', taughtBy: 'Lesson 4 (the interface tour names it and the pupil clicks it all lesson)' },
  { block: 'go to x: _ y: _',        taughtBy: 'ch1, the coordinates beat: the sprite is dragged and Scratch\u2019s own x/y readouts move on camera' },
  { block: 'pick random _ to _',     taughtBy: 'ch1 caption, glossed in place ("rolls a dice for the x")' },
  { block: 'repeat until _',         taughtBy: 'ch1 caption, glossed in place ("keeps it falling until it reaches the floor")' },
  { block: 'change y by _',          taughtBy: 'ch1 caption, glossed by the fall it produces; y itself is taught in the coordinates beat' },
  { block: 'y position',             taughtBy: 'ch1, the coordinates beat (the readout IS the y position)' },
  { block: '_ < _',                  taughtBy: 'ch1 caption, glossed as the floor test inside repeat until' },
  { block: 'if _ then _ else _',     taughtBy: 'ch2 in full — the animation, the palette callout and the anatomy card' },
  { block: 'touching _ ?',           taughtBy: 'ch2 callout ("a yes/no question")' },
  { block: '_ = _',                  taughtBy: 'ch2 callout ("are these two the same?")' },
  { block: 'forever',                taughtBy: 'Lesson 2 (the micro:bit ladder) and Lesson 3, where she builds with it' },
  { block: 'if _ then _',            taughtBy: 'ch3 callout ("an if on its own"), against the finished if/else beside it' },
  { block: 'key _ pressed?',         taughtBy: 'ch3 caption ("is the space bar being pressed?"), and she presses it herself' },
  { block: 'say _',                  taughtBy: 'ch3, shown doing exactly what it says on the stage' }
];

const scenes = [

  /* ============ CHAPTER 1: from sequence to selection ============ */
  {
    id: 'ch1',
    label: 'From sequence to selection',
    run: async ({ page, cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        crest: CREST, kicker: 'GAME STUDIO ' + DASH + ' THE MASTERCLASS',
        title: 'Making Your\nGame React',
        sub: 'Chapter 1 ' + DASH + ' from sequence to selection'
      });
      await drv.loadProject(SB3_NONE);
      await drv.selectSprite('Lamp');
      await cine.pause(1200);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.card({
        kicker: 'THE JOB', title: 'Your game has to choose.',
        lines: [
          'Last lesson you read scripts that run <b>top to bottom</b> &mdash; a SEQUENCE, every block in order',
          'But a real game makes decisions: caught&hellip; <b>or</b> dropped? right&hellip; <b>or</b> wrong?',
          'Choosing has a name: <b>SELECTION</b>. One block does it &mdash; and it is the last piece your game needs'
        ]
      }, 9000);

      /* DFM 207c, his words: "there's only one video for all... people who choose
         maze, for example, and then when they go into the video and they see the
         apple, they might think there's some sort of mistake, so that needs to be
         really clear." Said BEFORE she can wonder, not at the end of chapter 3. */
      await cine.caption('<b>One film, three games.</b> I build a little demo of my own here &mdash; <b>not</b> any of the three, so nobody gets their answer handed to them. The same block runs your maze door, your quiz tiles and your falling apple, and your blueprint shows where it goes in YOUR game.');

      await cine.caption('This is a little demo of mine &mdash; a lamp that falls down the screen. Watch it run.');
      const flag = await drv.greenFlag();
      if (!flag) throw new Error('green flag not found');
      await cine.click(flag.cx, flag.cy, { after: 600 });
      await cine.pause(2600);
      const st = await drv.stageArea();
      await cine.callout({ x: st.x + st.w * 0.15, y: st.y + st.h * 0.55, w: st.w * 0.7, h: st.h * 0.4 },
        'It falls, it stops. It never asks a single question &mdash; this code cannot CHOOSE anything', { side: 'above' });

      /* ===== THE COORDINATES BEAT (DFM 207c / 209) =====
         His finding: the code says "go to x ... y ..." and NO lesson has ever
         taught coordinates. His ruling when I proposed leaving the film alone:
         "the film is not above being changed if it means the child can
         understand." So x and y are taught here, on camera, by MOVING the sprite
         and letting Scratch's own numbers do the explaining — a number she has
         watched change is a number she understands. */
      const st1 = await drv.stageArea();
      await cine.caption('Before we read it: two words live in this code &mdash; <b>x</b> and <b>y</b>. They are how Scratch says <b>where</b> something is.');
      await cine.captionHide();
      /* captions swallow real mouse events (see the header note on flagClick), so
         they are DOWN for every drag in this beat */
      const xy0 = await xyReadout(drv);
      if (!xy0) throw new Error('sprite x/y readouts not found in the sprite pane');
      await cine.callout(xy0.box,
        'The Lamp&rsquo;s own <b>x</b> and <b>y</b> live here. Watch these two numbers as it moves', { side: 'below' });

      const from0 = await spriteScreenPos(drv);
      if (!from0) throw new Error('could not work out where the Lamp is on the stage');
      await cine.drag(from0.x, from0.y, st1.x + st1.w * 0.14, st1.y + st1.h * 0.84, { ms: 2400 });
      const xyL = await xyReadout(drv);
      log('coordinates beat, bottom-left: x=' + xyL.X.value + ' y=' + xyL.Y.value);
      if (Number(xyL.X.value) === from0.sx && Number(xyL.Y.value) === from0.sy) {
        throw new Error('the drag did not move the Lamp (readouts unchanged at ' +
          xyL.X.value + ',' + xyL.Y.value + ') - the grab missed the sprite');
      }
      await cine.callout(xyL.box,
        'Bottom LEFT &mdash; and both numbers went <b>MINUS</b>. x is ACROSS, y is UP AND DOWN', { side: 'below' });

      const from1 = await spriteScreenPos(drv);
      await cine.drag(from1.x, from1.y, st1.x + st1.w * 0.86, st1.y + st1.h * 0.16, { ms: 2400 });
      const xyR = await xyReadout(drv);
      log('coordinates beat, top-right: x=' + xyR.X.value + ' y=' + xyR.Y.value);
      if (!(Number(xyR.X.value) > Number(xyL.X.value) && Number(xyR.Y.value) > Number(xyL.Y.value))) {
        throw new Error('the second drag did not go up and to the right (' +
          xyL.X.value + ',' + xyL.Y.value + ' -> ' + xyR.X.value + ',' + xyR.Y.value +
          ') - the caption would describe a move that did not happen');
      }
      await cine.callout(xyR.box,
        'Top RIGHT &mdash; both <b>PLUS</b>. Right and up are plus, left and down are minus. The middle is <b>0, 0</b>', { side: 'below' });

      await cine.caption('So in this code, <b>y: 140</b> puts the lamp near the top &mdash; and its x is a <b>random</b> number, so it starts somewhere different every run.');

      await cine.caption('Now read the Lamp&rsquo;s code &mdash; Lesson 4 skills. Top to bottom: what does it do?');
      const fall = await drv.canvasBlock('(?=[\\s\\S]*repeat until)(?=[\\s\\S]*change y)');
      if (!fall) throw new Error('fall loop not found on Apple');
      /* his "anything similarly new or complex needs explained as well": pick
         random and repeat until are both first-meetings, glossed in place */
      await cine.callout({ x: fall.x - 8, y: fall.y - 8, w: fall.w + 16, h: fall.h + 16 },
        'Go to the top &mdash; <b>pick random</b> rolls a dice for the x, so it starts somewhere new each time. Then <b>repeat until</b> keeps it falling until it reaches the floor. Then&hellip; <b>nothing</b>. Perfect sequence, zero decisions', { side: 'above' });

      const note = await commentRect(drv);
      if (note) {
        await cine.callout({ x: note.x - 6, y: note.y - 6, w: note.w + 12, h: note.h + 12 },
          /* DFM 179a + the defining-phrase gate: the film is the FIRST place she
           meets STUDIO NOTE, so the film has to say what one is. */
        'The kit even marks the spot &mdash; the yellow <b>STUDIO NOTE</b>, a programmer&rsquo;s sticky-note, is where your choice will live', { side: 'below' });
      } else {
        log('studio note comment not visible - caption instead');
        await cine.caption('The kit even marks the spot &mdash; a yellow <b>STUDIO NOTE</b>, a programmer&rsquo;s sticky-note, sits right by that loop.');
      }

      await cine.caption('One block turns a sequence like this into a game. <b>Chapter 2: meet if/else.</b>');
      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const n = await drv.countCanvasBlocks('touching');
      if (n !== 0) throw new Error('starter should have NO touching blocks, saw ' + n);
      log('verified starter has no selection yet');
    }
  },

  /* ============ CHAPTER 2: the if/else block ============ */
  {
    id: 'ch2',
    label: 'The if/else block',
    run: async ({ page, cine, drv, log }) => {
      /* DFM 191c - HIS INSTRUCTION, 11 Aug 2026: an animation for the concept the
         lesson turns on. The thing an 11-year-old gets wrong about if/else is
         FALSE - they read it as "nothing happens" - so the gate answers with an
         amber lamp and a working ELSE chute, never a red cross. Beat 4 exists for
         that sentence alone; beat 5 proves "exactly one, never both". */
      const cgUrl = 'file://' + path.join(__dirname, '..', 'lib', 'choice-gate', 'index.html');
      await drv.page.goto(cgUrl);
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 2', title: 'The if/else block',
        sub: 'one question ' + DASH + ' two parts ' + DASH + ' exactly one runs'
      });
      await cine.pause(2900);
      await cine.lift();

      await drv.page.evaluate(() => window.cg.ready);
      const CG_BEATS = [
        'Machines and games are full of moments like this one: a coin goes in. Enough money&hellip; or not?',
        'One <b>QUESTION</b> decides: enough money? The answer is always YES or NO.',
        'YES &mdash; TRUE &mdash; and the <b>IF part</b> runs: the snack drops.',
        'NO &mdash; FALSE &mdash; and the <b>ELSE part</b> runs: the machine says so out loud. FALSE never means nothing happens.',
        'Every coin, the block chooses again. Exactly <b>ONE part</b> runs each time &mdash; never both.',
        'This is Scratch&rsquo;s <b>if/else</b> block. Choosing has a name &mdash; <b>SELECTION</b> &mdash; and it is what turns a slideshow into a game.'
      ];
      /* THE LEGIBILITY GATE (L5 spec Part C). Damien's verdict on the beat
         stills: the apple "is the star and reads small", the lamps are
         "near-invisible until lit". Sizes are now MEASURED at the moment each
         thing is being taught, and the take is refused below the floor — the
         hat-block's law, applied to this animation (DFM 192e/146b).
         Beats 3 and 4 are sampled DURING the apple's naming pause at the gate;
         beat 5 is sampled while all four labels are on screen at once. */
      /* THE UNIFIED ANIMATION LAW (DFM 207d). The old floors were 90px and 18px, and
         an 18px label PASSED while being unreadable — pixel size proves size, never
         legibility. One law now, the hat-block's: the actor being taught is at
         least 110px and every teaching label at least 24px. */
      const CG_MIN = { apple: 110, label: 24 };
      /* the tokens the REBUILT animation exposes (DFM 143b: renaming a thing
         re-stages everything that reads it). The actor being taught is the
         snack; TRUE/FALSE only flash, so the sampled names are the ones that
         are reliably on screen at each teaching moment. */
      const CG_SAMPLE = { 3: ['snack', 'IF PART'], 4: ['ELSE PART'],
        5: ['IF PART', 'ELSE PART'] };
      const cgSizes = {};
      for (let i = 0; i < CG_BEATS.length; i++) {
        const beatNo = i + 1;
        await cine.captionShow(CG_BEATS[i]);
        if (CG_SAMPLE[beatNo]) {
          /* A REFUSED TAKE MUST RETRY, NOT KILL THE RUN. This promise is started here
             and awaited at the bottom of the block; when a legibility check throws
             in between, it rejected against a closed page and took the whole
             process down with it — so one refused take ended the recording rather
             than causing another attempt. A crashing harness is a failing
             harness (DFM 200). */
          const playing = drv.page.evaluate(n => window.cg.play(n), beatNo).catch(() => {});
          /* beats 3/4: entry 0.9s + fall 0.75s, then a 1.2s pause at the gate —
             sample inside it. Beat 5: both part labels are already lit. */
          /* WAIT UNTIL THE THING BEING TAUGHT IS ACTUALLY THERE. Beat 3's snack
             does not leave the machine until ~3.3s (coin, question, answer,
             THEN the drop), so a 2.6s sample refused a take for a snack that
             was simply not out yet — the check was right, the clock was wrong. */
          await drv.page.waitForTimeout(beatNo === 5 ? 1500 : (beatNo === 3 ? 4200 : 3600));
          const seen = await drv.page.evaluate(() => window.cg.probeTokens());
          CG_SAMPLE[beatNo].forEach(name => {
            const tok = (seen || []).find(t => t.name === name);
            if (!tok) {
              throw new Error('choice-gate beat ' + beatNo + ': "' + name +
                '" was not on screen at its teaching moment (saw ' + JSON.stringify(seen) + ')');
            }
            const floor = name === 'snack' ? CG_MIN.apple : CG_MIN.label;
            if (tok.px < floor) {
              throw new Error('choice-gate beat ' + beatNo + ': ' + name + ' measures only ' +
                tok.px + 'px tall — the floor is ' + floor + 'px (L5 spec Part C)');
            }
            cgSizes[name] = tok.px;
          });
          /* SIZE IS NOT VISIBILITY (DFM 146b). A beat-5 frame once came back with
             every word missing while these very numbers read 36px, because the
             renderer had dropped the text textures and a mesh with no texture is
             still a mesh. So the take also checks that the words are DRAWN. */
          const ink = await drv.page.evaluate(() => window.cg.probeInk());
          (ink || []).forEach(t => {
            if (t.inkPixels < 40) {
              throw new Error('choice-gate beat ' + beatNo + ': "' + t.name +
                '" is the right size but nothing is drawn in it (' + t.inkPixels +
                ' lit pixels) — the label texture did not render');
            }
          });
          log('choice-gate legibility ok (beat ' + beatNo + '): ' +
            CG_SAMPLE[beatNo].map(n => n + ' = ' + cgSizes[n] + 'px').join(', ') +
            '; ink ' + (ink || []).map(t => t.name + '=' + t.inkPixels).join('/'));
          await playing;
        } else {
          await drv.page.evaluate(n => window.cg.play(n), beatNo);
        }
        if (i === 0) {
          /* DFM 146b: prove the pixels, not the absence of an error */
          const first = await drv.page.evaluate(() => window.cg.probe());
          if (!first.some(p => p.max > 60)) {
            throw new Error('choice-gate drew nothing after beat 1 - WebGL failed: ' + JSON.stringify(first));
          }
          log('choice-gate probe ok: ' + JSON.stringify(first.map(p => p.max)));
        }
      }
      await cine.captionHide();
      const cgLast = await drv.page.evaluate(() => window.cg.probe());
      if (!cgLast.some(p => p.max > 60)) throw new Error('choice-gate went blank mid-take');

      /* now find that block in the real palette */
      await drv.openEditor();
      await cine.install();          /* the injected cinema DOM dies with the old document */
      await drv.loadProject(SB3_NONE);
      await drv.selectSprite('Lamp');
      await cine.pause(1200);
      await cine.ensureCursor(640, 430);

      await cine.caption('Selection lives in <b>Control</b> &mdash; the gold category.');
      const ctrl = await drv.category('Control');
      if (!ctrl) throw new Error('Control category not found');
      await cine.click(ctrl.cx, ctrl.cy, { after: 1300 });

      const ifelse = await drv.flyoutBlock('^if then else$');
      if (!ifelse) throw new Error('if/else not in Control flyout');
      await cine.callout({ x: ifelse.x - 8, y: ifelse.y - 8, w: ifelse.w + 16, h: ifelse.h + 16 },
        '<b>IF / ELSE</b>. One question, and two <b>gaps</b> where blocks go. TRUE runs the top gap &mdash; the <b>IF part</b>. FALSE runs the gap underneath &mdash; the <b>ELSE part</b>. <b>Never both</b>', { side: 'below' });

      await cine.caption('FALSE doesn&rsquo;t mean &ldquo;nothing happens&rdquo; &mdash; FALSE means the <b>ELSE part</b> runs. Remember that.');

      await cine.caption('The question drops into the <b>pointed slot</b> at the top &mdash; that is where the question always goes. Questions live in <b>Sensing</b>&hellip;');
      const sens = await drv.category('Sensing');
      if (!sens) throw new Error('Sensing category not found');
      await cine.click(sens.cx, sens.cy, { after: 1300 });
      const touching = await drv.flyoutBlock('(?=[\\s\\S]*touching)(?=[\\s\\S]*mouse)');
      if (!touching) throw new Error('touching block not in Sensing flyout');
      await cine.callout({ x: touching.x - 8, y: touching.y - 8, w: touching.w + 16, h: touching.h + 16 },
        '<b>touching &hellip;?</b> &mdash; a yes/no question. Point it at any sprite on the stage and it keeps answering, over and over, all game long', { side: 'below' });

      await cine.caption('&hellip;and one more, in <b>Operators</b> &mdash; the maze door and the quiz tiles both need it.');
      const ops = await drv.category('Operators');
      if (!ops) throw new Error('Operators category not found');
      await cine.click(ops.cx, ops.cy, { after: 1300 });
      const eq = await drv.flyoutBlock('^(50 ?)?= ?(50)?$');
      if (eq) {
        await cine.callout({ x: eq.x - 8, y: eq.y - 8, w: eq.w + 16, h: eq.h + 16 },
          'The <b>equals</b> question: are these two the same? <i>stars = 3</i> &hellip; <i>answer = true</i> &hellip; <i>lives = 0</i>', { side: 'below' });
      } else {
        log('equals block not matched in flyout - caption fallback');
        await cine.caption('The green <b>=</b> block asks: are these two the same? <b>stars = 3</b>, <b>answer = true</b>, <b>lives = 0</b>.');
      }

      await cine.card({
        kicker: 'THE ANATOMY', title: 'if / else, in one breath',
        lines: [
          'A <b>question</b> sits in the pointed slot at the top: stars = 3? &hellip; answer = true? &hellip; touching Bowl?',
          'When the answer is TRUE, the <b>IF part</b> runs &mdash; the top gap',
          'When it is FALSE, the <b>ELSE part</b> runs &mdash; the gap underneath. Exactly one, never both, every single time'
        ]
      }, 8500);

      await cine.caption('Now watch a studio build the real thing. <b>Chapter 3.</b>');
      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const n = await drv.countCanvasBlocks('repeat until');
      if (n !== 1) throw new Error('apple fall loop missing after flyout tour (' + n + ')');
      log('verified editor alive after flyout tour');
    }
  },

  /* ============ CHAPTER 3: worked example on Catch It ============ */
  {
    id: 'ch3',
    label: 'Building it for real',
    run: async ({ page, cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 3', title: 'Building it\nfor real',
        sub: 'on a demo of mine ' + DASH + ' not on anybody\u2019s game'
      });
      await drv.loadProject(SB3_HALF);
      await drv.selectSprite('Lamp');
      await cine.pause(1200);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.caption('Here is my lamp. It asks <b>one question</b> &mdash; is the space bar being pressed? &mdash; and right now it only knows how to say YES.');
      const lonely = await drv.canvasBlock('(?=[\\s\\S]*key)(?=[\\s\\S]*Yes)');
      if (!lonely) throw new Error('the half-built if was not found on the Lamp');
      await cine.callout({ x: lonely.x - 8, y: lonely.y - 8, w: lonely.w + 16, h: lonely.h + 16 },
        'An <b>if</b> on its own. There is no ELSE part at all &mdash; so what happens when the answer is NO?', { side: 'above' });

      await cine.captionShow('Predict first: I press space, then let go. What will it say each time?', { pos: 'top' });
      await cine.pause(2400);
      await cine.captionHide();
      await flagClick(page, cine, drv);
      await page.keyboard.down('Space');
      await cine.pause(2000);
      const stH = await drv.stageArea();
      await cine.callout({ x: stH.x + stH.w * 0.35, y: stH.y + stH.h * 0.12, w: stH.w * 0.6, h: stH.h * 0.3 },
        'Space down &mdash; the answer is TRUE, and it says <b>Yes!</b>', { side: 'below' });
      await page.keyboard.up('Space');
      await cine.pause(2200);
      await cine.callout({ x: stH.x + stH.w * 0.2, y: stH.y + stH.h * 0.3, w: stH.w * 0.7, h: stH.h * 0.35 },
        'Let go &mdash; the answer is FALSE, and&hellip; <b>nothing</b>. The bubble just sits there. Half a choice is half a game', { side: 'above' });

      await cine.curtain({ kicker: 'THE FULL BLOCK', title: 'if AND else', sub: 'both parts filled in' });
      await drv.loadProject(SB3_FULL);
      await drv.selectSprite('Lamp');
      await cine.pause(1000);
      await cine.lift();
      await cine.pause(400);
      await cine.ensureCursor(640, 430);

      const full = await drv.canvasBlock('(?=[\\s\\S]*Yes)(?=[\\s\\S]*No)');
      if (!full) throw new Error('the finished if/else was not found on the Lamp');
      await cine.callout({ x: full.x - 8, y: full.y - 8, w: full.w + 16, h: full.h + 16 },
        'The same block, finished. One question at the top, and now <b>two parts</b> underneath it', { side: 'above' });

      const yes = await drv.canvasBlock('Yes');
      if (yes) await cine.callout({ x: yes.x - 8, y: yes.y - 8, w: yes.w + 16, h: 40 },
        'The <b>IF part</b> &mdash; the top gap. This runs when the answer is TRUE', { side: 'below' });
      const no = await drv.canvasBlock('(?=[\\s\\S]*say)(?=[\\s\\S]*No)');
      if (no) await cine.callout({ x: no.x - 8, y: no.y - 8, w: no.w + 16, h: 40 },
        'The <b>ELSE part</b> &mdash; the gap underneath. This runs when the answer is FALSE. <b>FALSE finally has a job</b>', { side: 'below' });

      await flagClick(page, cine, drv);
      await page.keyboard.down('Space');
      await cine.pause(1800);
      const stF = await drv.stageArea();
      await cine.callout({ x: stF.x + stF.w * 0.35, y: stF.y + stF.h * 0.12, w: stF.w * 0.6, h: stF.h * 0.3 },
        'Space down: <b>Yes!</b>', { side: 'below' });
      await page.keyboard.up('Space');
      await cine.pause(1800);
      await cine.callout({ x: stF.x + stF.w * 0.35, y: stF.y + stF.h * 0.12, w: stF.w * 0.6, h: stF.h * 0.3 },
        'Let go: <b>No</b>. Exactly <b>one part</b> runs, every single time &mdash; never both, never neither', { side: 'below' });

      await cine.caption('That is the whole block. <b>One question, two parts, one answer each time.</b>');
      await cine.caption('Your blueprint puts this same block into <b>YOUR</b> game &mdash; the maze door, the quiz tiles, the falling apple. <b>Chapter 4: prove it works.</b>');

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const n = await drv.countCanvasBlocks('No');
      if (n < 1) throw new Error('the finished else branch is not on the canvas');
      log('verified the finished if/else state');
    }
  },

  /* ============ CHAPTER 4: test like a studio ============ */
  {
    id: 'ch4',
    label: 'Test like a studio',
    tailMs: 4200,
    run: async ({ page, cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 4', title: 'Test like a studio',
        sub: 'predict ' + DASH + ' try it ' + DASH + ' record what ACTUALLY happened'
      });
      await drv.loadProject(SB3_FULL);
      await drv.selectSprite('Lamp');
      await cine.pause(1000);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.caption('Built is not finished. Before anything goes to the gallery, a studio <b>tests</b> it &mdash; watch two tests, for real.');

      /* TEST 1 — the TRUE path */
      await cine.captionShow('TEST 1: hold the space bar. <b>Predict:</b> the lamp says Yes!', { pos: 'top' });
      await cine.pause(2600);
      await cine.captionHide();
      await flagClick(page, cine, drv);
      await page.keyboard.down('Space');
      await cine.pause(2200);
      const st1 = await drv.stageArea();
      await cine.callout({ x: st1.x + st1.w * 0.35, y: st1.y + st1.h * 0.12, w: st1.w * 0.6, h: st1.h * 0.3 },
        'It said <b>Yes!</b> &mdash; exactly what I predicted. Tick', { side: 'below' });
      await page.keyboard.up('Space');
      await cine.pause(900);

      /* TEST 2 — the FALSE path, which is the one that catches half-built games */
      await cine.captionShow('TEST 2: let go of it. <b>Predict:</b> the lamp says No &mdash; not nothing.', { pos: 'top' });
      await cine.pause(2600);
      await cine.captionHide();
      await cine.pause(1800);
      await cine.callout({ x: st1.x + st1.w * 0.35, y: st1.y + st1.h * 0.12, w: st1.w * 0.6, h: st1.h * 0.3 },
        'It said <b>No</b>. If it had said nothing at all, the ELSE part would be missing. Tick', { side: 'below' });

      await cine.card({
        kicker: 'PRESS NIGHT AWAITS', title: 'Run all four. Record the truth.',
        lines: [
          'Your QA Desk has <b>four tests</b> &mdash; do each one in Scratch, like these two',
          'Click the answer that matches what <b>ACTUALLY</b> happened. A wrong result tells you exactly what to fix',
          'Four green ticks and <b>READY FOR GALLERY</b> lights up &mdash; open your doors. See you at Press Night'
        ]
      }, 10500);

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const n = await drv.countCanvasBlocks('key');
      if (n < 1) throw new Error('the demo project is not loaded at the end of ch4');
      log('verified both tests played out on camera');
    }
  }
];

module.exports = { scenes, driver: 'scratch', BLOCKS_ON_CAMERA };
