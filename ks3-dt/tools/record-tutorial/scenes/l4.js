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
const IMG_MOTH = dataUri('moth-log-950.jpg');
const CREDIT_MOTH = 'Photo: U.S. Navy, public domain, Wikimedia Commons';

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
    label: 'Load the game & read its code',
    run: async ({ page, cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        crest: CREST, kicker: 'THE BROKEN GAME ' + DASH + " DETECTIVE'S HANDBOOK",
        title: 'Reading Someone\nElse’s Code',
        sub: 'Chapter 1 ' + DASH + ' Load the game & read its code'
      });
      await cine.pause(2900);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.card({
        kicker: 'THE JOB', title: 'Four bugs got past. You’re QA.',
        img: IMG_MOTH, credit: CREDIT_MOTH,
        lines: [
          'The first computer <b>bug</b> was a real moth &mdash; taped into Harvard’s logbook, 1947',
          'Every game you have ever played went on sale with bugs in it. <b>QA testers</b> find them before players do',
          'Four player tickets are on your case board. This film is your handbook'
        ]
      }, 13000);

      await cine.caption('First: get the broken game open in Scratch &mdash; exactly like the <b>Evidence Intake</b> card.');

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

      await cine.caption('The broken game is open. <b>Meet the suspects.</b>');
      const sharkTile = await drv.spriteTile('Shark');
      const fishTile = await drv.spriteTile('Fish');
      if (!sharkTile || !fishTile) throw new Error('sprite tiles missing');
      await cine.callout(
        { x: sharkTile.x - 6, y: sharkTile.y - 6, w: (fishTile.x + fishTile.w) - sharkTile.x + 12, h: sharkTile.h + 12 },
        'Every sprite carries its OWN scripts &mdash; click one to read its code', { side: 'above' });

      await cine.click(sharkTile.cx, sharkTile.cy, { after: 1200 });
      await cine.caption('The Shark’s scripts. Blocks say what they mean &mdash; so <b>read one out loud</b>, top to bottom.');

      const leftScript = await drv.canvasBlock('when left arrow key pressed');
      if (!leftScript) throw new Error('left arrow script not found on canvas');
      await cine.callout({ x: leftScript.x - 8, y: leftScript.y - 8, w: leftScript.w + 16, h: leftScript.h + 16 },
        '“WHEN the left arrow is pressed: point left, move 10 steps, next costume.” You just read code.', { side: 'below' });

      await cine.caption('Read first, click second &mdash; that’s the whole detective method. <b>Chapter 2: what starts a script.</b>');

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
    label: 'Hat blocks: what starts a script',
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
      await cine.curtain({
        kicker: 'CHAPTER 2', title: 'Hat blocks:\nwhat starts a script',
        sub: 'no trigger ' + DASH + ' no code runs'
      });
      await cine.pause(2900);
      await cine.lift();

      await drv.page.evaluate(() => window.hb.ready);
      const HB_BEATS = [
        'Code does not start by itself. Every stack of blocks waits to be woken up.',
        'Things keep happening: the flag is clicked&hellip; a key is pressed. Each one is an <b>EVENT</b>.',
        'A <b>HAT BLOCK</b> catches ONE event. When that event happens, everything under the hat runs.',
        'A different hat catches a different event.',
        'No hat? Events fly straight past. The blocks are perfect &mdash; and they will <b>never run</b>.',
        'The fix is the hat. Give the stack its trigger &mdash; and it wakes.'
      ];
      for (let i = 0; i < HB_BEATS.length; i++) {
        await cine.captionShow(HB_BEATS[i]);
        await drv.page.evaluate(n => window.hb.play(n), i + 1);
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

      await cine.caption('No trigger means no code runs. <b>Case cracked by reading alone.</b> Now the fix.');

      const evCat = await drv.category('Events');
      if (!evCat) throw new Error('Events category not found');
      await cine.captionShow('Triggers live in <b>Events</b> &mdash; drag a <b>when key pressed</b> hat onto the stack.', { pos: 'top' });
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
        'This little menu picks the key &mdash; click it, choose <b>right arrow</b>', { side: 'below' });
      await cine.curtain({ kicker: 'ONE CLICK', title: 'space → right arrow', sub: 'pick it from the little menu' });
      await drv.loadProject(SB3_C1FIXED);
      await drv.selectSprite('Shark');
      await cine.pause(700);
      await cine.lift();
      await cine.pause(400);

      await cine.caption('Trigger restored. But a detective never trusts a fix &mdash; <b>a detective re-plays.</b>');
      await cine.captionShow('Green flag. Then a FULL lap &mdash; all four arrows, no shortcuts.');
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

module.exports = { scenes, driver: 'scratch' };
