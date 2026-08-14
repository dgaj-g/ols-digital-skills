/* J1 Lesson 4 "The Broken Game" - Detective's Handbook chapters (text-based,
   no narration). Policy: the teacher demo is the primary source; this film
   must let an absent pupil run the whole lesson alone - and it must NOT leak
   the fixes for Cases 2-4 (only the TRAINING case is cracked here, exactly
   like the teacher demo). Chapter labels feed the platform video engine.
   Source stays ASCII: — escapes for text nodes, &mdash;/&rarr; for HTML.

   PIPELINE LESSONS (Scratch, this session):
   - scratch.mit.edu needs no login for File > Load / Save to your computer.
   - Scratch Blocks is a Blockly fork: .blocklyText joins + .blocklyDraggable
     rect lookups carry straight over from the MakeCode driver.
   - The native file chooser can't appear on camera - the load flow is:
     click File ON camera, curtain dip with the filename, drive the real
     filechooser behind the curtain (driver clicks are DOM el.click() so the
     curtain overlay doesn't swallow them).
   - OFF-CAMERA STATE SETUP = load a pre-authored .sb3 variant (no Monaco
     here; the sb3 generator in Claude Work/KS3 DT Platform/sb3 makes any
     editor state authorable). Dropdown FIELD clicks are refused under the
     recorder exactly like MakeCode Blockly - callout + curtain dip pattern.
   - Keyboard arrows reach the Scratch VM at document level - click the
     green flag first, then page.keyboard.press works with nothing focused. */
const path = require('path');
const { dataUri } = require('../lib/cinema');

const DASH = '—';
const CREST = dataUri('crest-360.png');
/* the moth card was CUT from chapter 1 (DFM 192c: it re-told the hook card the
   pupil had just read), so its image is no longer loaded here. The photograph
   still lives on the hook card itself, at paragraph width. */

const SB3_DIR = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/sb3');
const SB3_BROKEN = path.join(SB3_DIR, 'shark-attack-broken-edition.sb3');
const SB3_C1FIXED = path.join(SB3_DIR, 'shark-attack-c1-fixed.sb3');
const SB3_WORKING = path.join(SB3_DIR, 'shark-attack-v2-working.sb3');

/* click the flag + swim a visible lap with the arrow keys */
async function flagAndSwim(cine, drv, presses) {
  const flag = await drv.greenFlag();
  if (!flag) throw new Error('green flag not found');
  await cine.click(flag.cx, flag.cy, { after: 900 });
  for (const [key, n] of presses) {
    for (let i = 0; i < n; i++) {
      await drv.page.keyboard.press(key);
      await drv.page.waitForTimeout(160);
    }
    await drv.page.waitForTimeout(220);
  }
}

/* drag the shark through a slow serpentine sweep until the score moves.
   Fish bounce fast; per-leg re-grabs (the shark sits where the last leg
   dropped it) keep this honest and robust across attempts. */
async function sweepUntilScore(cine, drv, minScore, log) {
  const st = await drv.stageArea();
  if (!st) throw new Error('stage canvas not found');
  const rows = [0.3, 0.55, 0.78];
  let from = { x: st.x + st.w / 2, y: st.y + st.h / 2 };
  for (let pass = 0; pass < 3; pass++) {
    for (let r = 0; r < rows.length; r++) {
      const y = st.y + st.h * rows[r];
      const tx = (r % 2 === (pass % 2)) ? st.x + st.w - 30 : st.x + 30;
      await cine.drag(from.x, from.y, tx, y, { ms: 2400 });
      from = { x: tx, y: y };
      const mon = await drv.monitorText();
      const m = /score\s*(\d+)/i.exec(mon || '');
      log('sweep leg done, monitor: ' + mon);
      if (m && Number(m[1]) >= minScore) return Number(m[1]);
    }
  }
  const mon = await drv.monitorText();
  const m = /score\s*(\d+)/i.exec(mon || '');
  return m ? Number(m[1]) : 0;
}

const scenes = [

  /* ============ CHAPTER 1: load the game & read its code ============ */
  {
    id: 'ch1',
    label: 'Open the game & meet Scratch',
    run: async ({ page, cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        crest: CREST, kicker: 'THE BROKEN GAME ' + DASH + " DETECTIVE'S HANDBOOK",
        title: 'Reading Someone\nElse’s Code',
        sub: 'Chapter 1 ' + DASH + ' open the game & meet Scratch'
      });
      await cine.pause(2900);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      /* THE MOTH CARD IS CUT (Damien, 11 Aug 2026, DFM 192c). It re-told, in a
         film, the 1947 story he had just read on the hook card one screen
         earlier. A film that opens by repeating the last screen teaches nothing
         and spends 13 seconds doing it. The time goes to the interface tour
         below — the thing he actually asked for. */

      await cine.caption('First: get the broken game open in Scratch. The next card on the board &mdash; <b>Evidence Intake</b> &mdash; gives you these steps to follow. This film shows what they look like.');

      const fm = await drv.fileMenu();
      if (!fm) throw new Error('File menu not found');
      await cine.captionShow('<b>File</b> &rarr; <b>Load from your computer</b>', { pos: 'top' });
      await cine.click(fm.cx, fm.cy, { after: 700 });
      const item = await drv.menuItem('Load from your computer');
      if (!item) throw new Error('Load from your computer not in menu');
      await cine.moveTo(item.cx, item.cy);
      await cine.pause(900);
      await cine.captionHide();

      /* the OS file picker can't be filmed - curtain dip, load behind it */
      await cine.curtain({
        kicker: 'PICK THE FILE', title: 'shark-attack-\nbroken-edition.sb3',
        sub: 'straight from your Downloads folder'
      });
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 8000 }),
        page.evaluate(() => {
          const it = Array.from(document.querySelectorAll('li')).find(e => e.offsetParent !== null && /Load from your computer/i.test(e.textContent || ''));
          it.click();
        })
      ]);
      await chooser.setFiles(SB3_BROKEN);
      await page.waitForTimeout(1200);
      await page.evaluate(() => {
        const ok = Array.from(document.querySelectorAll('button')).find(b => b.offsetParent !== null && /^OK$/.test((b.textContent || '').trim()));
        if (ok) ok.click();
      });
      await page.waitForSelector('[class*="sprite-selector-item_sprite-name"]', { timeout: 30000 });
      await page.waitForTimeout(2200);
      await cine.lift();
      await cine.pause(400);

      /* ---- THE TOUR (DFM 192c). Lesson 4 is the year's first Scratch hour.
         Every word the rest of the film and every case card leans on — STAGE,
         SPRITE, SCRIPT, CODE AREA — is defined HERE, on the real editor, before
         it is ever used. Five beats, each held long enough to read. ---- */
      const stage = await drv.region('stage');
      const controls = await drv.region('controls');
      if (!stage) throw new Error('stage region not found for the tour');
      const stageBox = controls
        ? { x: Math.min(stage.x, controls.x) - 6, y: Math.min(stage.y, controls.y) - 6,
            w: Math.max(stage.x + stage.w, controls.x + controls.w) - Math.min(stage.x, controls.x) + 12,
            h: Math.max(stage.y + stage.h, controls.y + controls.h) - Math.min(stage.y, controls.y) + 12 }
        : { x: stage.x - 6, y: stage.y - 6, w: stage.w + 12, h: stage.h + 12 };
      await cine.callout(stageBox,
        'This side is the <b>STAGE</b> &mdash; where the game actually plays. The green flag starts the game; the red sign stops it.',
        { side: 'below', hold: 4500 });

      const sprites = await drv.region('sprites');
      const sharkTile = await drv.spriteTile('Shark');
      const fishTile = await drv.spriteTile('Fish');
      if (!sharkTile || !fishTile) throw new Error('sprite tiles missing');
      const spriteBox = sprites
        ? { x: sprites.x - 4, y: sprites.y - 4, w: sprites.w + 8, h: sprites.h + 8 }
        : { x: sharkTile.x - 6, y: sharkTile.y - 6, w: (fishTile.x + fishTile.w) - sharkTile.x + 12, h: sharkTile.h + 12 };
      await cine.callout(spriteBox,
        'These little pictures are the game’s <b>SPRITES</b> &mdash; one for each character or thing. This game has a Shark and a Fish.',
        { side: 'above', hold: 4500 });

      /* click the Shark ON CAMERA, so "its scripts" is something she watched
         happen rather than a claim about a screen she never saw change */
      await cine.click(sharkTile.cx, sharkTile.cy, { after: 1300 });

      /* DFM 201a — HIS FIND: "the code blocks… are not all visible in the frame."
         The Shark's five stacks do not fit Scratch's default zoom. Zoom out ON
         CAMERA before naming the code area, so she sees the move and the frame
         then really does hold everything the callout is about to talk about. */
      await cine.captionShow('Five stacks of blocks &mdash; and if you cannot see them all, the <b>minus button</b> at the bottom right zooms out until you can.');
      const zoomClicks = await drv.fitWorkspace(cine);
      await cine.captionHide();
      log('workspace fitted with ' + zoomClicks + ' zoom-out click(s)');

      const code = await drv.region('code');
      if (!code) throw new Error('code area region not found for the tour');
      await cine.callout({ x: code.x + 6, y: code.y + 6, w: code.w - 12, h: code.h - 12 },
        'The middle is the <b>CODE AREA</b>. These stacks of blocks are the Shark’s <b>SCRIPTS</b> &mdash; its instructions. Every sprite carries its own.',
        { side: 'below', hold: 4800 });

      const palette = await drv.region('palette');
      if (!palette) throw new Error('palette region not found for the tour');
      await cine.callout({ x: palette.x - 4, y: palette.y + 4, w: palette.w + 8, h: palette.h - 8 },
        'Down the left side live all the blocks Scratch knows, sorted into colour groups. You drag them in &mdash; you never type code.',
        { side: 'below', hold: 4500 });

      await cine.caption('Sprites, scripts, the stage &mdash; that is the whole map. <b>Now read some code.</b>');

      const leftScript = await drv.canvasBlock('when left arrow key pressed');
      if (!leftScript) throw new Error('left arrow script not found on canvas');
      await cine.callout({ x: leftScript.x - 8, y: leftScript.y - 8, w: leftScript.w + 16, h: leftScript.h + 16 },
        '&ldquo;WHEN the left arrow key is pressed: point left, move 10 steps, next costume.&rdquo; Blocks are sentences &mdash; read them top to bottom and they tell you what they do.',
        { side: 'below' });

      await cine.caption('You just read someone else’s code. That is the detective’s first skill &mdash; <b>read it BEFORE you click anything</b>.');
      await cine.caption('Next: why one of the Shark’s scripts <b>never runs at all</b>.');

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const n = await drv.countCanvasBlocks('when .* key pressed');
      if (n !== 3) throw new Error('expected exactly 3 key hats on broken shark, saw ' + n);
      log('verified broken shark canvas (' + n + ' key hats)');
    }
  },

  /* ============ CHAPTER 2: hat blocks - crack the training case ============ */
  {
    id: 'ch2',
    label: 'Why some code never runs',
    run: async ({ page, cine, drv, log }) => {
      /* DFM 191c - HIS INSTRUCTION, 11 Aug 2026: "could we add animations to aid
         understanding of concepts that they meet (I loved the variable one you
         did)?" This chapter's whole idea is WHY SOME CODE NEVER RUNS, so it opens
         on the animation and the editor work follows it - the DFM 174 shape.
         The three stacks are Shark Attack's own: a flag script, a working arrow
         script, and the hatless right-arrow stack the pupil fixes minutes later. */
      const hbUrl = 'file://' + path.join(__dirname, '..', 'lib', 'hat-block', 'index.html');
      await drv.page.goto(hbUrl);
      await cine.install();
      /* The old title used "hat block" and "script" before either word existed
          for her, and said nothing about why she should care. The new one names
          the PROBLEM (DFM 192c). */
      await cine.curtain({
        kicker: 'CHAPTER 2', title: 'Why some code\nnever runs',
        sub: 'and the one block that fixes it'
      });
      await cine.pause(2900);
      await cine.lift();

      await drv.page.evaluate(() => window.hb.ready);
      /* SEVEN beats now, one event on screen at a time, each token big enough
         to read and held long enough to name (DFM 192e). */
      const HB_BEATS = [
        'Every stack of blocks is waiting. Code never starts by itself &mdash; something has to wake it.',
        'The player just clicked the <b>GREEN FLAG</b>. A thing that happens while a game runs is called an <b>EVENT</b>.',
        'The curved block on top is a <b>HAT BLOCK</b>. It catches ONE event &mdash; the green flag &mdash; and every block under it runs.',
        'A different EVENT &mdash; the <b>LEFT ARROW</b> key. A different hat catches it, and that stack runs.',
        'This stack has <b>NO HAT</b>. The RIGHT ARROW is pressed&hellip; and nothing catches it. Perfect blocks &mdash; that never run.',
        'The fix is a hat: &ldquo;when right arrow key pressed&rdquo;. Now the stack knows what wakes it.',
        'Right arrow pressed &mdash; caught &mdash; the stack runs. That is exactly why the shark would not swim right.'
      ];
      /* DFM 192e, gated in pixels, not judged by eye: at each beat's naming
         pause the event token on screen must measure at least 110px tall. This
         is the direct answer to "the little things flying across at the top
         can't hardly be seen" — a number decides it, and the take dies here if
         it regresses. Beats 2, 4 and 5 are the naming pauses. */
      const NAMING_BEATS = { 2: 'green flag', 4: 'left arrow keycap', 5: 'right arrow keycap' };
      const MIN_TOKEN_PX = 110;
      const tokenSizes = {};
      for (let i = 0; i < HB_BEATS.length; i++) {
        const beatNo = i + 1;
        await cine.captionShow(HB_BEATS[i]);
        if (NAMING_BEATS[beatNo]) {
          /* measure DURING the pause, not after it: play the beat and sample
             while the token is parked centre-stage being named */
          const playing = drv.page.evaluate(n => window.hb.play(n), beatNo);
          await drv.page.waitForTimeout(3200);        // enter (2.0s) + into the pause
          const seen = await drv.page.evaluate(() => window.hb.probeTokens());
          const want = NAMING_BEATS[beatNo];
          const tok = (seen || []).find(t => t.name === want);
          if (!tok) throw new Error('beat ' + beatNo + ': "' + want + '" was not on screen at its naming pause (saw ' + JSON.stringify(seen) + ')');
          if (tok.px < MIN_TOKEN_PX) {
            throw new Error('beat ' + beatNo + ': ' + want + ' measures only ' + tok.px +
              'px tall at its naming pause — the DFM 192e floor is ' + MIN_TOKEN_PX + 'px');
          }
          tokenSizes[want] = tok.px;
          log('token legibility ok: ' + want + ' = ' + tok.px + 'px');
          await playing;
        } else {
          await drv.page.evaluate(n => window.hb.play(n), beatNo);
        }
        if (i === 0) {
          /* DFM 146b: a failed WebGL context records as a happy flat rectangle,
             so the take is only trusted once real pixels are proved. */
          const first = await drv.page.evaluate(() => window.hb.probe());
          if (!first.some(p => p.max > 60)) {
            throw new Error('hat-block drew nothing after beat 1 - WebGL failed: ' + JSON.stringify(first));
          }
          log('hat-block probe ok: ' + JSON.stringify(first.map(p => p.max)));
        }
      }
      await cine.captionHide();
      log('TOKEN LEGIBILITY (DFM 192e floor 110px): ' + JSON.stringify(tokenSizes));
      const hbLast = await drv.page.evaluate(() => window.hb.probe());
      if (!hbLast.some(p => p.max > 60)) throw new Error('hat-block went blank mid-take');

      /* now into the real editor, to find that same missing hat for real */
      await drv.openEditor();
      await cine.install();          /* the injected cinema DOM dies with the old document */
      await drv.loadProject(SB3_BROKEN);
      await drv.selectSprite('Shark');
      await cine.pause(1400);
      await cine.ensureCursor(700, 430);
      await cine.caption('That is the idea. Now find it for real, in the broken game.');

      const hat = await drv.canvasBlock('when left arrow key pressed');
      if (!hat) throw new Error('left arrow hat script not found');
      await cine.callout({ x: hat.x - 8, y: hat.y - 8, w: Math.min(hat.w, 260) + 16, h: 46 },
        'A <b>HAT BLOCK</b>. It names the trigger: WHEN this happens, run everything below', { side: 'below' });

      await cine.caption('Four arrows should mean four hats. But the ticket says the shark <b>won’t swim right</b>&hellip;');

      // scratch-blocks text joins are not reading-order: the hatless stack is
      // the only top-level stack whose join ENDS without hat text
      const orphan = await drv.canvasBlock('next costume move steps point in direction$');
      if (!orphan) throw new Error('orphan stack not found');
      await cine.callout({ x: orphan.x - 8, y: orphan.y - 8, w: orphan.w + 16, h: orphan.h + 16 },
        'This stack has <b>NO HAT</b>. Perfect code &mdash; that never, ever runs', { side: 'above' });

      await cine.caption('No hat means nothing wakes it. <b>Case cracked by reading alone.</b> Now the fix.');

      const evCat = await drv.category('Events');
      if (!evCat) throw new Error('Events category not found');
      await cine.captionShow('Hat blocks live in <b>Events</b>, the yellow group &mdash; drag &ldquo;when space key pressed&rdquo; onto the stack.', { pos: 'top' });
      await cine.click(evCat.cx, evCat.cy, { after: 1300 });
      const fly = await drv.flyoutBlock('when space key pressed');
      if (!fly) throw new Error('when space key pressed not in flyout');
      /* two-stage drag: scratch-blocks' flyout click-vs-drag detection is
         flaky under the eased cursor (l3 lesson) - so stage 1 just gets the
         hat OUT (wherever it lands), stage 2 is a precise canvas-to-canvas
         drag onto the orphan's top, with fresh rects + jitter retries. */
      await cine.drag(fly.x + 24, fly.y + 12, 660, 210, { ms: 1400 });
      let merged = null;
      for (let attempt = 0; attempt < 4 && !merged; attempt++) {
        const loose = await drv.canvasBlock('^when space key pressed$');
        if (!loose) {
          merged = await drv.canvasBlock('(?=.*move steps)(?=.*when space key pressed)');
          if (merged) break;
          throw new Error('hat vanished after flyout drag');
        }
        const orph = await drv.canvasBlock('next costume move steps point in direction$');
        if (!orph) throw new Error('orphan lost after drag (attempt ' + attempt + ')');
        const gx = loose.x + 20, gy = loose.y + 10;
        const tx = orph.x + 20 + (attempt * 4), ty = orph.y - loose.h + 16 + (attempt * 3);
        await cine.drag(gx, gy, tx, ty, { ms: 1100 });
        for (let i = 0; i < 6 && !merged; i++) {
          merged = await drv.canvasBlock('(?=.*move steps)(?=.*when space key pressed)');
          if (!merged) await page.waitForTimeout(350);
        }
      }
      await cine.captionHide();
      if (!merged) throw new Error('hat never snapped onto the orphan stack');
      log('hat landed: ' + merged.text);

      /* dropdown flip: the live editor refuses synthetic field clicks while
         the recorder runs (pupils click it for real, no problem) - so show
         the dropdown with a callout, then a curtain dip lands the exact
         state a real click produces (pre-authored c1-fixed build). */
      await cine.caption('It says <b>space</b> &mdash; the ticket needs <b>right arrow</b>.');
      await cine.callout({ x: merged.x + 34, y: merged.y - 2, w: 128, h: 36 },
        'This little menu picks the key &mdash; click the word &ldquo;space&rdquo; and choose right arrow', { side: 'below' });
      await cine.curtain({ kicker: 'ONE CLICK', title: 'space → right arrow', sub: 'pick it from the little menu' });
      await drv.loadProject(SB3_C1FIXED);
      await drv.selectSprite('Shark');
      await cine.pause(700);
      await cine.lift();
      await cine.pause(400);

      await cine.caption('Trigger restored. But a detective never trusts a fix &mdash; <b>a detective re-plays.</b>');
      await cine.captionShow('Green flag. Then a full lap &mdash; swim RIGHT, UP, LEFT, DOWN. All four arrows.');
      await flagAndSwim(cine, drv, [['ArrowRight', 6], ['ArrowUp', 4], ['ArrowLeft', 6], ['ArrowDown', 4]]);
      await cine.captionHide();
      await cine.caption('All four arrows swim. <b>Now it’s true</b> &mdash; because you watched it happen.');

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const n = await drv.countCanvasBlocks('when right arrow key pressed');
      if (n < 1) throw new Error('right-arrow hat missing after the dip');
      log('verified c1-fixed state on canvas');
    }
  },

  /* ============ CHAPTER 3: test like a detective ============ */
  {
    id: 'ch3',
    label: 'Test like a detective',
    run: async ({ page, cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 3', title: 'Test like\na detective',
        sub: 'predict ' + DASH + ' then check'
      });
      /* the fully-working build: this chapter teaches what testing SHOULD
         look like - the game as it should be. No Case 2-4 fixes shown. */
      await drv.loadProject(SB3_WORKING);
      await drv.selectSprite('Shark');
      await cine.pause(1400);
      await cine.lift();
      await cine.ensureCursor(700, 430);

      await cine.caption('A tester never “just plays”. A tester <b>PREDICTS</b>, then <b>CHECKS</b>. Here’s the game as it SHOULD be.');

      await cine.captionShow('PREDICT: “press the right arrow and the shark swims right.” CHECK:');
      await flagAndSwim(cine, drv, [['ArrowRight', 5]]);
      await cine.captionHide();
      await cine.caption('Prediction held. <b>One check passed.</b>');

      await cine.captionShow('PREDICT: “eat a fish and the score climbs by exactly 1.” CHECK:');
      const got = await sweepUntilScore(cine, drv, 1, log);
      if (got < 1) throw new Error('no fish eaten during the sweep (score ' + got + ')');
      await cine.captionHide();
      const mon = await drv.monitorRect();
      if (mon) await cine.callout({ x: mon.x - 6, y: mon.y - 6, w: mon.w + 12, h: mon.h + 12 },
        'The score moved the moment the bite happened. <b>Watch the number, not the feeling</b>', { side: 'below' });

      await cine.caption('One catch could be luck. <b>Three catches, three points &mdash; that’s proof.</b> Keep checking.');

      await cine.card({
        kicker: 'THE METHOD', title: 'Every case, the same three moves',
        lines: [
          '<b>PREDICT</b> what should happen &mdash; say it out loud, before you touch anything',
          '<b>CHECK</b> one thing at a time &mdash; watch what ACTUALLY happens',
          'A failed check isn’t bad luck. <b>It’s a case file.</b> Your broken game will fail some &mdash; that’s the job'
        ]
      }, 13000);

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const mon = await drv.monitorText();
      if (!/score\s*[1-9]/i.test(mon || '')) throw new Error('score never moved: ' + mon);
      log('verified working-build score moved: ' + mon);
    }
  },

  /* ============ CHAPTER 4: the case log ============ */
  {
    id: 'ch4',
    label: 'The case log',
    tailMs: 4200,
    run: async ({ cine, drv }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 4', title: 'The case log',
        sub: 'what was wrong + what you changed'
      });
      await drv.loadProject(SB3_C1FIXED);
      await drv.selectSprite('Shark');
      await cine.pause(1400);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.card({
        kicker: 'CASE CLOSED?', title: 'Not until the log is filed',
        lines: [
          'A real QA log is <b>one sentence</b> with <b>two halves</b>',
          '<b>What was wrong:</b> “the right-arrow script had no hat block”',
          '<b>What you changed:</b> “I added when right-arrow pressed”'
        ]
      }, 12000);

      await cine.card({
        kicker: 'SPOT THE DIFFERENCE', title: 'Weak log vs detective log',
        lines: [
          '“it was broken and i fixed it” &mdash; says <b>nothing</b>. Nobody could re-do your fix',
          '“The change-score block said 0, so I made it 1” &mdash; <b>evidence</b>. Anyone could re-do it',
          'The test: could your partner repeat your fix from the log alone?'
        ]
      }, 12000);

      await cine.caption('Fix it, log it, <b>re-play to prove it</b> &mdash; and only then, the stamp.');

      await cine.drop({
        kicker: 'BACK TO THE BOARD', title: 'Four tickets\nare waiting',
        sub: 'read ' + DASH + ' predict ' + DASH + ' check ' + DASH + ' log'
      });
      await cine.pause(1400);
    }
  }
];

/* ============ BLOCKS_ON_CAMERA (DFM 207c; declared 14 Aug 2026 on his R1
   ruling, DFM 222a) ============
   THE RULE: a film may not put a block on screen and leave a child to guess
   what it is. Every block this film shows must name where it is taught.

   HOW THIS LIST WAS BUILT — from the film's own script and the real .sb3, not
   from memory: chapter 1 opens `shark-attack-broken-edition.sb3`, zooms the
   workspace until all five of the SHARK's stacks fit, and calls the code area
   out; chapters 2-4 work inside those same Shark stacks. So the blocks on
   camera are the Shark's, plus the two the fix itself handles. The Fish's
   clone machinery and the Stage's backdrop scripts are NOT toured by the film
   — a pupil meets them inside the case files, where the cards teach them, and
   the release desk plays the finished game rather than reading its code.

   THE AUDIT'S FINDING, stated plainly rather than buried: every block the film
   shows has a teaching home, and two of them are taught BY THIS FILM as its
   subject matter. Nothing here needed a change to a signed-off lesson. */
const BLOCKS_ON_CAMERA = [
  { block: 'when green flag clicked',
    taughtBy: 'ch1 — the interface tour names the green flag and the film clicks it; Lesson 2 and 3 taught "something starts it"' },
  { block: 'when _ key pressed',
    taughtBy: 'ch2 IS its lesson — the hat block is defined on camera ("a curved top, and it is what starts the script running"), and the missing one is the case' },
  { block: 'point in direction _',
    taughtBy: 'ch1, read aloud as part of the arrow-key stacks ("read it BEFORE you click anything"); its effect is watched on the stage in ch2’s re-play' },
  { block: 'move _ steps',
    taughtBy: 'ch1, same reading pass; ch2’s re-play shows the shark actually swimming when it runs' },
  { block: 'next costume',
    taughtBy: 'ch1, same reading pass; the shark’s swimming animation on the stage is the block doing its job' },
  { block: 'go to x: _ y: _',
    taughtBy: 'ch1 — in the Shark’s green-flag stack; coordinates are taught on camera in Lesson 5’s film, and here the block is only read, never edited' },
  { block: 'set _ to _',
    taughtBy: 'Lesson 3 — she built the scoreboard with set and change on the micro:bit; ch1 reads it in the Shark’s green-flag stack' }
];

module.exports = { scenes, driver: 'scratch', BLOCKS_ON_CAMERA };
