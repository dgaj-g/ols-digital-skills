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
const SB3_STARTER = path.join(SB3_DIR, 'catch-it-starter.sb3');
const SB3_SCORE_ONLY = path.join(SB3_DIR, 'catch-it-score-only.sb3');
const SB3_COMPLETE = path.join(SB3_DIR, 'catch-it-complete.sb3');

/* comment bubbles aren't blockly draggables - find the STUDIO NOTE directly */
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
      await drv.loadProject(SB3_STARTER);
      await drv.selectSprite('Apple');
      await cine.pause(1200);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.card({
        kicker: 'THE JOB', title: 'Your game has to choose.',
        lines: [
          'Last lesson you read scripts that run <b>top to bottom</b> &mdash; a SEQUENCE, every block in order',
          'But a real game makes decisions: caught&hellip; <b>or</b> dropped? right&hellip; <b>or</b> wrong?',
          'Choosing has a name: <b>SELECTION</b>. One block does it &mdash; and it finishes your game'
        ]
      }, 9000);

      await cine.caption('This is the <b>Catch It kit</b>, fresh from the studio. Watch what happens when an apple lands&hellip;');
      const flag = await drv.greenFlag();
      if (!flag) throw new Error('green flag not found');
      await cine.click(flag.cx, flag.cy, { after: 600 });
      await cine.pause(2600);
      const st = await drv.stageArea();
      await cine.callout({ x: st.x + st.w * 0.15, y: st.y + st.h * 0.55, w: st.w * 0.7, h: st.h * 0.4 },
        'Straight <b>through</b> the bowl. No catch, no miss &mdash; the kit can&rsquo;t CHOOSE yet', { side: 'above' });

      await cine.caption('Read the Apple&rsquo;s code &mdash; Lesson 4 skills. Top to bottom: what does it do?');
      const fall = await drv.canvasBlock('(?=[\\s\\S]*repeat until)(?=[\\s\\S]*change y)');
      if (!fall) throw new Error('fall loop not found on Apple');
      await cine.callout({ x: fall.x - 8, y: fall.y - 8, w: fall.w + 16, h: fall.h + 16 },
        'Go to the top, fall&hellip; then <b>nothing</b>. Perfect sequence, zero decisions', { side: 'above' });

      const note = await commentRect(drv);
      if (note) {
        await cine.callout({ x: note.x - 6, y: note.y - 6, w: note.w + 12, h: note.h + 12 },
          'The kit even marks the spot &mdash; the <b>STUDIO NOTE</b> is where your choice will live', { side: 'below' });
      } else {
        log('studio note comment not visible - caption instead');
        await cine.caption('The kit even marks the spot &mdash; a <b>STUDIO NOTE</b> comment sits right by that loop.');
      }

      await cine.caption('One block turns this sequence into a game. <b>Chapter 2: meet if/else.</b>');
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
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 2', title: 'The if/else block',
        sub: 'one question ' + DASH + ' two mouths ' + DASH + ' exactly one runs'
      });
      await drv.loadProject(SB3_STARTER);
      await drv.selectSprite('Apple');
      await cine.pause(1200);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.caption('Selection lives in <b>Control</b> &mdash; the gold category.');
      const ctrl = await drv.category('Control');
      if (!ctrl) throw new Error('Control category not found');
      await cine.click(ctrl.cx, ctrl.cy, { after: 1300 });

      const ifelse = await drv.flyoutBlock('^if then else$');
      if (!ifelse) throw new Error('if/else not in Control flyout');
      await cine.callout({ x: ifelse.x - 8, y: ifelse.y - 8, w: ifelse.w + 16, h: ifelse.h + 16 },
        '<b>IF / ELSE</b>. One question. Two mouths. TRUE runs the top &mdash; FALSE runs the bottom. <b>Never both</b>', { side: 'below' });

      await cine.caption('FALSE doesn&rsquo;t mean &ldquo;nothing happens&rdquo; &mdash; FALSE means the <b>else</b> mouth runs. Remember that.');

      await cine.caption('The question snaps into the diamond slot. Questions live in <b>Sensing</b>&hellip;');
      const sens = await drv.category('Sensing');
      if (!sens) throw new Error('Sensing category not found');
      await cine.click(sens.cx, sens.cy, { after: 1300 });
      const touching = await drv.flyoutBlock('(?=[\\s\\S]*touching)(?=[\\s\\S]*mouse)');
      if (!touching) throw new Error('touching block not in Sensing flyout');
      await cine.callout({ x: touching.x - 8, y: touching.y - 8, w: touching.w + 16, h: touching.h + 16 },
        '<b>touching &hellip;?</b> &mdash; a yes/no question. Point it at the Bowl and it keeps answering, over and over, all game long', { side: 'below' });

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
        await cine.caption('The green <b>=</b> diamond asks: are these two the same? <b>stars = 3</b>, <b>answer = true</b>, <b>lives = 0</b>.');
      }

      await cine.card({
        kicker: 'THE ANATOMY', title: 'if / else, in one breath',
        lines: [
          'A <b>question</b> sits in the diamond: touching Bowl? &hellip; lives = 0?',
          'When the answer is TRUE, the <b>top mouth</b> runs',
          'When it is FALSE, the <b>else mouth</b> runs &mdash; exactly one, never both, every single time'
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
    label: 'Worked example: Catch It',
    run: async ({ page, cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 3', title: 'Worked example:\nCatch It',
        sub: 'half a choice is a broken game'
      });
      await drv.loadProject(SB3_SCORE_ONLY);
      await drv.selectSprite('Apple');
      await cine.pause(1200);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.caption('One studio got <b>halfway</b>. They added a score&hellip; and only an <b>if</b> &mdash; no else.');
      const lonely = await drv.canvasBlock('(?=[\\s\\S]*touching)(?=[\\s\\S]*change score)');
      if (!lonely) throw new Error('score-only if not found');
      await cine.callout({ x: lonely.x - 8, y: lonely.y - 8, w: lonely.w + 16, h: lonely.h + 16 },
        'IF touching Bowl: the score goes up. But when the answer is FALSE&hellip; <b>nothing handles the miss</b>', { side: 'above' });

      const flag = await drv.greenFlag();
      await cine.captionShow('Watch a miss. Predict first: what SHOULD it cost?', { pos: 'top' });
      await cine.click(flag.cx, flag.cy, { after: 600 });
      await cine.pause(5200);
      await cine.captionHide();
      const st = await drv.stageArea();
      await cine.callout({ x: st.x + 12, y: st.y + 8, w: st.w * 0.5, h: 60 },
        'Misses just&hellip; vanish. No lives. No danger. No <b>ending</b>. Half a choice is half a game', { side: 'below' });

      await cine.curtain({ kicker: 'THE FULL BUILD', title: 'if AND else', sub: 'the blueprint, block by block' });
      await drv.loadProject(SB3_COMPLETE);
      await drv.selectSprite('Apple');
      await cine.pause(1000);
      await cine.lift();
      await cine.pause(400);

      const full = await drv.canvasBlock('(?=[\\s\\S]*pop)(?=[\\s\\S]*Game over)');
      if (!full) throw new Error('complete if/else not found');
      await cine.callout({ x: full.x - 8, y: full.y - 8, w: full.w + 16, h: full.h + 16 },
        'The finished landing check &mdash; <b>read it top to bottom</b>', { side: 'above' });

      const score = await drv.canvasBlock('^change score by$|change score by');
      if (score) await cine.callout({ x: score.x - 8, y: score.y - 8, w: score.w + 16, h: 40 },
        'TRUE mouth: touching the Bowl &mdash; <b>score up 1</b>, and the pop sound plays', { side: 'below' });

      const lives = await drv.canvasBlock('change lives by');
      if (lives) await cine.callout({ x: lives.x - 8, y: lives.y - 8, w: lives.w + 16, h: 40 },
        'ELSE mouth: the miss costs <b>one life</b> &mdash; FALSE finally has a job', { side: 'below' });

      const over = await drv.canvasBlock('(?=[\\s\\S]*Game over)(?=[\\s\\S]*stop all)');
      if (over) await cine.callout({ x: over.x - 8, y: over.y - 8, w: over.w + 16, h: over.h + 16 },
        'And inside the else: when lives hits 0 &mdash; Game over, then <b>stop all</b>. The game can END', { side: 'above' });

      await cine.caption('One if/else, one variable pair, one ending. <b>REACT &middot; TRACK &middot; END</b> &mdash; the whole brief.');
      await cine.caption('Your kit&rsquo;s blueprint shows YOUR version &mdash; maze door, quiz tiles, same block. <b>Chapter 4: prove it works.</b>');

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const n = await drv.countCanvasBlocks('Game over');
      if (n < 1) throw new Error('complete build not on canvas');
      log('verified complete build state');
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
        sub: 'predict ' + DASH + ' play ' + DASH + ' record what ACTUALLY happened'
      });
      await drv.loadProject(SB3_COMPLETE);
      await cine.pause(1000);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.caption('Built is not shipped. Before the gallery, a studio runs the <b>QA Desk</b> &mdash; watch two tests, for real.');

      /* TEST 1 - the miss test: deterministic (park the bowl, wait) */
      await cine.captionShow('TEST 1: stand still and miss three. <b>Predict:</b> lives 3&hellip;2&hellip;1&hellip; then Game over &mdash; and everything stops.', { pos: 'top' });
      await cine.pause(2600);
      await cine.captionHide();
      await flagClick(page, cine, drv);
      await cine.captionShow('TEST 1 running: lives 3&hellip;2&hellip;1&hellip;', { pos: 'top' });
      const st = await drv.stageArea();
      // park the bowl in the corner so every apple misses
      await cine.drag(st.x + st.w / 2, st.y + st.h * 0.88, st.x + 36, st.y + st.h * 0.88, { ms: 1200 });
      await cine.pause(9500);
      await cine.captionHide();
      const monTxt = await drv.monitorText();
      log('after misses, monitors: ' + monTxt);
      if (!/lives\s*0/i.test(monTxt || '')) throw new Error('miss test never reached 0 lives: ' + monTxt);
      const stFinal = await drv.stageArea();
      await cine.callout({ x: stFinal.x + 12, y: stFinal.y + 8, w: 200, h: 64 },
        'Lives hit 0 &mdash; <b>Game over</b>, and the whole game FROZE. stop all did its job. Tick', { side: 'below' });

      /* TEST 2 - the catch test: fresh flag, chase until a catch lands */
      await cine.captionShow('TEST 2: fresh flag &mdash; now CATCH one. <b>Predict:</b> the score jumps +1 the instant it lands in the bowl.', { pos: 'top' });
      await cine.pause(2600);
      await cine.captionHide();
      await flagClick(page, cine, drv);
      await cine.captionShow('TEST 2 running: chase the apple&hellip;', { pos: 'top' });
      const got = await catchOne(cine, drv, log);
      await cine.captionHide();
      if (got < 1) throw new Error('never caught an apple on camera');
      const mon = await drv.monitorRect();
      if (mon) await cine.callout({ x: mon.x - 8, y: mon.y - 8, w: 190, h: 64 },
        'The catch paid <b>exactly +1</b> &mdash; and the misses on the way cost lives, exactly as they should. Tick', { side: 'below' });

      await cine.card({
        kicker: 'PRESS NIGHT AWAITS', title: 'Run all four. Record the truth.',
        lines: [
          'Your QA Desk has <b>four tests</b> &mdash; run every one in Scratch, like these two',
          'Record what <b>ACTUALLY</b> happened. A cross isn&rsquo;t failure &mdash; it hands you the exact fix',
          'Four ticks and <b>READY FOR GALLERY</b> lights up &mdash; open your doors. See you at Press Night'
        ]
      }, 10500);

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const mon = await drv.monitorText();
      if (!/score\s*[1-9]/i.test(mon || '')) throw new Error('no catch registered on camera: ' + mon);
      log('verified both tests played out on camera: ' + mon);
    }
  }
];

module.exports = { scenes, driver: 'scratch' };
