/* J1 Lesson 3 "Scoreboard Engineer" - tutorial chapters (text-based, no narration).
   Policy: teacher demo is the primary source; this video must let an absent
   pupil complete the whole lesson alone. Smooth, slick, simple.
   Chapter labels here feed the platform's video engine `chapters` config.
   Source stays ASCII: — escapes for text nodes, &mdash;/&rarr; for HTML. */
const path = require('path');
const { dataUri } = require('../lib/cinema');

const CREST = dataUri('crest-360.png');
const IMG_ARCADE = dataUri('arcade-highscores-950.jpg');
const CREDIT_ARCADE = 'Photo: Brett L., CC BY-SA 2.0, Wikimedia Commons';
const DASH = '—';

/* Program states used to jump a fresh scene straight to where the previous
   chapter ended (off camera, behind the curtain). REBUILT 2 Aug 2026: the
   display now lives in the forever loop, never inside a button event -
   which is what the built rungs, the parsons key and the recap teach. */
const LOOP_ONLY_PROGRAM = 'basic.forever(function () {\n    basic.showNumber(score)\n})\nlet score = 0\n';
const SET_ONE_PROGRAM = 'input.onButtonPressed(Button.A, function () {\n    score = 1\n})\nbasic.forever(function () {\n    basic.showNumber(score)\n})\nlet score = 0\n';
const COUNT_PROGRAM = 'input.onButtonPressed(Button.A, function () {\n    score += 1\n})\nbasic.forever(function () {\n    basic.showNumber(score)\n})\nlet score = 0\n';
const COUNT_PLUS_EMPTY_B = 'input.onButtonPressed(Button.A, function () {\n    score += 1\n})\ninput.onButtonPressed(Button.B, function () {\n\t\n})\nbasic.forever(function () {\n    basic.showNumber(score)\n})\nlet score = 0\n';

async function pressSim(cine, drv, label, settleMs) {
  await drv.page.waitForTimeout(settleMs || 2600); // let the sim recompile/restart
  const b = await drv.simButton(label);
  if (!b) throw new Error('sim button ' + label + ' not found');
  await cine.click(b.cx, b.cy, { after: 900 });
}

/* "Make a Variable..." is an SVG Blockly flyout button, not an HTML button */
function flyoutButtonRect(drv, rxSrc) {
  return drv.page.evaluate((rxSrc) => {
    const rx = new RegExp(rxSrc, 'i');
    for (const el of Array.from(document.querySelectorAll('.blocklyFlyoutButton'))) {
      const t = (el.textContent || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').trim();
      if (!rx.test(t)) continue;
      const b = el.getBoundingClientRect();
      if (b.width > 4) return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    }
    return null;
  }, rxSrc);
}

/* silently create the score variable (behind the curtain - no cursor, no cinema) */
async function makeVariableSilently(drv, name) {
  const cat = await drv.category('Variables');
  if (!cat) throw new Error('Variables category not found');
  await drv.page.mouse.click(cat.cx, cat.cy);
  await drv.page.waitForTimeout(1200);
  const mk = await flyoutButtonRect(drv, 'Make a Variable');
  if (!mk) throw new Error('Make a Variable flyout button not found');
  await drv.page.mouse.click(mk.cx, mk.cy);
  await drv.page.waitForTimeout(900);
  await drv.page.keyboard.type(name, { delay: 60 });
  await drv.page.waitForTimeout(300);
  const ok = await drv.modalButton('Ok');
  if (!ok) throw new Error('variable Ok button not found');
  await drv.page.mouse.click(ok.cx, ok.cy);
  await drv.page.waitForTimeout(900);
  await drv.page.keyboard.press('Escape').catch(() => {});
}

/* rect (+ joined text) of the smallest nested sub-block matching subRx inside a
   canvas block matching containerRx. Text-only detection via .blocklyText - the
   proven selector; field-class selectors differ between Blockly builds. */
function nestedBlockRect(drv, containerRx, subRx) {
  return drv.page.evaluate(([containerRx, subRx]) => {
    const crx = new RegExp(containerRx, 'i');
    const srx = new RegExp(subRx, 'i');
    const clean = (x) => x.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const el of Array.from(document.querySelectorAll('.blocklyBlockCanvas g.blocklyDraggable'))) {
      const text = clean(Array.from(el.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' '));
      if (!crx.test(text)) continue;
      const subs = Array.from(el.querySelectorAll('g.blocklyDraggable')).filter(g =>
        srx.test(clean(Array.from(g.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' '))));
      subs.sort((a, b) => { const ba = a.getBoundingClientRect(), bb = b.getBoundingClientRect(); return ba.width * ba.height - bb.width * bb.height; });
      if (subs.length) {
        const b = subs[0].getBoundingClientRect();
        const t2 = clean(Array.from(subs[0].querySelectorAll('.blocklyText')).map(t => t.textContent).join(' '));
        return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2, text: t2 };
      }
    }
    return null;
  }, [containerRx, subRx]);
}

/* rect of a dropdown field (by its current text) - returns the LAST matching
   block's field (the most recently added copy), via the field GROUP rect,
   matching the proven probe behaviour. */
function dropdownRect(drv, blockRx, fieldText) {
  return drv.page.evaluate(([blockRx, fieldText]) => {
    const rx = new RegExp(blockRx, 'i');
    const clean = (x) => (x || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').trim();
    const out = [];
    for (const el of Array.from(document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable'))) {
      const text = clean(Array.from(el.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' ')).replace(/\s+/g, ' ');
      if (!rx.test(text)) continue;
      const f = Array.from(el.querySelectorAll('.blocklyEditableText, .blocklyDropdownText, text')).find(t => clean(t.textContent) === fieldText);
      if (!f) continue;
      const g = f.closest('g') || f;
      const b = g.getBoundingClientRect();
      if (b.width > 4) out.push({ cx: b.x + b.width / 2, cy: b.y + b.height / 2 });
    }
    return out.length ? out[out.length - 1] : null;
  }, [blockRx, fieldText]);
}

/* rect of an item in an OPEN Blockly dropdown menu */
function dropdownItemRect(drv, itemText) {
  return drv.page.evaluate((itemText) => {
    const items = Array.from(document.querySelectorAll('.blocklyDropDownDiv .goog-menuitem, .blocklyDropDownDiv [role="menuitem"], .blocklyWidgetDiv .goog-menuitem'));
    for (const el of items) {
      const t = (el.textContent || '').replace(/[​-‍﻿ ]/g, ' ').trim();
      if (t === itemText || t.indexOf(itemText) !== -1) {
        const b = el.getBoundingClientRect();
        if (b.width > 4) return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
      }
    }
    return null;
  }, itemText);
}

/* drag `show number` to sit under a nested sibling block. Blockly's flyout
   click-vs-drag detection is flaky under the eased cursor, so: fresh rects per
   attempt, varied grab points, stray-block recovery, and a program dump in the
   failure message so a failed take is diagnosable from the log alone. */
async function dragShowNumberUnder(cine, drv, siblingRx, containerRx) {
  await drv.page.waitForTimeout(800); // let the flyout fully settle
  for (let attempt = 0; attempt < 3; attempt++) {
    const sib = await drv.canvasBlock(siblingRx, true);
    if (!sib) throw new Error(siblingRx + ' not on canvas');
    const fly = await drv.flyoutBlock('show number');
    if (!fly) throw new Error('show number not in flyout');
    const gx = fly.x + 24 + attempt * 20;
    const gy = fly.y + 10 + attempt * 8;
    await cine.drag(gx, gy, sib.x + 46, sib.y + sib.h + 8, { ms: 1400 });
    for (let i = 0; i < 6; i++) {
      if (await nestedBlockRect(drv, containerRx, 'show number')) return;
      await drv.page.waitForTimeout(350);
    }
    const stray = await drv.canvasBlock('show number', true);
    const sib2 = await drv.canvasBlock(siblingRx, true);
    if (stray && sib2) {
      await cine.drag(stray.cx, stray.cy, sib2.x + 46, sib2.y + sib2.h + 6, { ms: 1000 });
      for (let i = 0; i < 6; i++) {
        if (await nestedBlockRect(drv, containerRx, 'show number')) return;
        await drv.page.waitForTimeout(350);
      }
    }
  }
  let prog = '';
  try { prog = (await drv.readProgram()).replace(/\s+/g, ' ').slice(0, 160); } catch (e) {}
  throw new Error('show number never nested under ' + siblingRx + ' - program: ' + prog);
}

/* drop a flyout block INSIDE a C-block's mouth (forever, on button pressed...).
   Blockly's snap radius is small and the eased recorder cursor makes the
   flyout's click-vs-drag detection flaky, so: fresh rects every attempt,
   several drop points down the mouth, and a program dump on failure so a bad
   take is diagnosable from the log alone. */
/* the same multi-spot retry, but moving a block ALREADY on the canvas back
   into a C-block's mouth. A single fixed drop point missed the mouth of an
   emptied forever block two takes running (2 Aug 2026), which is exactly what
   dragIntoMouth's offset list exists to solve. */
async function dragCanvasIntoMouth(cine, drv, blockRx, containerRx) {
  const spots = [[78, -18], [70, -26], [90, -12], [62, -34], [84, -8]];
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await nestedBlockRect(drv, containerRx, blockRx)) return;
    const blk = await drv.canvasBlock(blockRx, true);
    const box = await drv.canvasBlock(containerRx, true);
    if (!blk || !box) throw new Error('cannot find ' + blockRx + ' / ' + containerRx + ' to restore');
    const [dx, dy] = spots[attempt % spots.length];
    /* grab the block by its LABEL, never its centre: the centre of
       `show number score` sits on the score OVAL, and dragging that pulls the
       oval out on its own (two failed takes, 2 Aug 2026). */
    await cine.drag(blk.x + 26 + attempt * 6, blk.cy, box.x + dx, box.y + box.h + dy, { ms: 1300 });
    for (let i = 0; i < 6; i++) {
      if (await nestedBlockRect(drv, containerRx, blockRx)) return;
      await drv.page.waitForTimeout(350);
    }
  }
  throw new Error(blockRx + ' never restored into ' + containerRx);
}

async function dragIntoMouth(cine, drv, flyoutRx, containerRx) {
  await drv.page.waitForTimeout(800);
  const spots = [[78, -18], [70, -26], [90, -12], [62, -34]];
  for (let attempt = 0; attempt < 4; attempt++) {
    const box = await drv.canvasBlock(containerRx, true);
    if (!box) throw new Error(containerRx + ' not on canvas');
    const fly = await drv.flyoutBlock(flyoutRx);
    if (!fly) throw new Error(flyoutRx + ' not in flyout');
    const [dx, dy] = spots[attempt % spots.length];
    await cine.drag(fly.x + 40 + attempt * 14, fly.y + 18, box.x + dx, box.y + box.h + dy, { ms: 1400 });
    for (let i = 0; i < 6; i++) {
      if (await nestedBlockRect(drv, containerRx, flyoutRx)) return;
      await drv.page.waitForTimeout(350);
    }
    const stray = await drv.canvasBlock(flyoutRx, true);
    const box2 = await drv.canvasBlock(containerRx, true);
    if (stray && box2) {
      await cine.drag(stray.cx, stray.cy, box2.x + 78, box2.y + box2.h - 18, { ms: 1000 });
      for (let i = 0; i < 6; i++) {
        if (await nestedBlockRect(drv, containerRx, flyoutRx)) return;
        await drv.page.waitForTimeout(350);
      }
    }
  }
  let prog = '';
  try { prog = (await drv.readProgram()).replace(/\s+/g, ' ').slice(0, 160); } catch (e) {}
  throw new Error(flyoutRx + ' never nested inside ' + containerRx + ' - program: ' + prog);
}

const scenes = [

  /* ================= CHAPTER 1 - What's a variable? ================= */
  {
    id: 'ch1',
    label: "What's a variable?",
    run: async ({ cine, drv, log }) => {
      await drv.openHome();
      await cine.install();
      await cine.curtain({
        crest: CREST, kicker: 'SCOREBOARD ENGINEER ' + DASH + ' TUTORIAL',
        title: 'Keeping Score\nwith Variables',
        sub: 'Chapter 1 ' + DASH + " What's a variable?"
      });
      await cine.pause(2900);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.card({
        kicker: 'THE BIG IDEA', title: 'Every game keeps score somewhere invisible',
        img: IMG_ARCADE, credit: CREDIT_ARCADE,
        lines: [
          'Behind every score sits a <b>VARIABLE</b> &mdash; a named box holding a number',
          'The <b>name</b> stays the same. The <b>number inside</b> can change',
          'Today you build one, and turn it into a real scoreboard'
        ]
      }, 14000);

      await cine.caption('Back at <b>makecode.microbit.org</b> &mdash; time to build.');
      const np = await drv.page.evaluate(() => {
        const el = document.querySelector('.newprojectcard');
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
      });
      if (!np) throw new Error('New Project card not found');
      await cine.captionShow('<b>New Project</b> &mdash; just like last lesson.');
      await cine.click(np.cx, np.cy, { after: 900 });
      await cine.captionHide();

      await drv.waitFor(() => drv.page.evaluate(() =>
        !!Array.from(document.querySelectorAll('.ui.modal input, [role="dialog"] input'))
          .find(i => i.offsetParent !== null)), 10000, 'name input');
      /* DFM 169: MakeCode decorates this dialog's title with emoji, and the
         recording machine draws them in ITS OWN (Apple) art - his 9 Aug find.
         A school Windows machine can never look like that, and this Mac can
         never draw them the Windows way, so the film shows the plain title. */
      await drv.page.evaluate(() => {
        document.querySelectorAll('.ui.modal .header').forEach(h => {
          h.childNodes.forEach(n => {
            if (n.nodeType === 3) n.textContent = n.textContent.replace(/[^\x00-\x7F]/g, '').trimEnd();
          });
        });
      });
      const inp = await drv.page.evaluate(() => {
        const i = Array.from(document.querySelectorAll('.ui.modal input, [role="dialog"] input')).find(x => x.offsetParent !== null);
        const b = i.getBoundingClientRect();
        return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
      });
      await cine.captionShow('Name it <b>scoreboard</b>, then Create.');
      await cine.click(inp.cx, inp.cy, { after: 250 });
      await drv.page.keyboard.type('scoreboard', { delay: 110 });
      await cine.pause(500);
      const create = await drv.modalButton('Create');
      if (!create) throw new Error('Create button not found');
      await cine.click(create.cx, create.cy, { after: 600 });
      await cine.captionHide();

      await cine.captionShow('MakeCode is building your empty project&hellip;');
      await drv.waitFor(() => drv.page.evaluate(() =>
        !!document.querySelector('.blocklyToolboxDiv, [role="treeitem"]')), 45000, 'editor after create');
      await drv.page.waitForTimeout(2500);
      await cine.captionHide();

      /* DFM 169(b): the Welcome tour popup used to appear ON camera and get
         dismissed OFF camera - an unexplained help box that vanished. The same
         popup will greet a pupil on her own machine, so the film now teaches
         the click instead of hiding it. If MakeCode ever stops showing the
         popup, this beat simply never fires. */
      const tourClose = await (async () => {
        for (let i = 0; i < 12; i++) {
          const r = await drv.page.evaluate(() => {
            const el = document.querySelector('.tour-container .close, [aria-label="Close"]');
            if (!el || el.offsetParent === null) return null;
            const b = el.getBoundingClientRect();
            return b.width > 4 ? { cx: b.x + b.width / 2, cy: b.y + b.height / 2 } : null;
          }).catch(() => null);
          if (r) return r;
          await drv.page.waitForTimeout(500);
        }
        return null;
      })();
      if (tourClose) {
        await cine.captionShow('A blue Welcome box may pop up. Click its &#10005; &mdash; you do not need the tour today.');
        await cine.click(tourClose.cx, tourClose.cy, { after: 1400 });
        await cine.captionHide();
      }
      await drv.dismissDialogs();
      await drv.page.waitForTimeout(1800);

      await cine.caption('An empty project&hellip; but no box to keep score in yet. <b>Chapter 2 fixes that.</b>');

      await cine.drop({});
      await cine.pause(1200);
    }
  },

  /* ================= CHAPTER 2 - Make the variable ================= */
  /* REBUILT 2 Aug 2026 (review finding L3 F-2). The old chapters 2-4 taught the
     PRE-rework program - show number inside the button events, forever left
     empty on camera - which contradicts the built rungs, the parsons key and
     recap items r-306/r-403. An absent pupil following the old film failed the
     lesson around her. The display is the LOOP's job now, throughout. */
  {
    id: 'ch2',
    label: 'Make the variable',
    run: async ({ cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 2', title: 'Make the variable',
        sub: 'One box, named score ' + DASH + ' and a loop to show it'
      });
      await drv.setProjectName('scoreboard');
      await cine.pause(2900);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.caption('Variable blocks live under <b>Variables</b>.');
      const cat = await drv.category('Variables');
      if (!cat) throw new Error('Variables category not found');
      await cine.captionShow('Click <b>Variables</b>.', { pos: 'top' });
      await cine.click(cat.cx, cat.cy, { after: 1100 });
      await cine.captionHide();

      const mk = await flyoutButtonRect(drv, 'Make a Variable');
      if (!mk) throw new Error('Make a Variable flyout button not found');
      await cine.captionShow('Click <b>Make a Variable&hellip;</b>');
      await cine.click(mk.cx, mk.cy, { after: 1000 });
      await cine.captionHide();

      await cine.captionShow('Name the box <b>score</b> &mdash; short, clear, exactly what it holds.');
      await drv.page.keyboard.type('score', { delay: 130 });
      await cine.pause(600);
      const ok = await drv.modalButton('Ok');
      if (!ok) throw new Error('Ok button not found');
      await cine.click(ok.cx, ok.cy, { after: 1200 });
      await cine.captionHide();

      const setBlk = await drv.flyoutBlock('set score to');
      if (!setBlk) throw new Error('set score to not in flyout after create');
      await cine.caption('Three new blocks have appeared. <b>set score to</b>&hellip; FORCES a number into the box &mdash; whatever was there before is gone.');
      await cine.caption('<b>change score by</b>&hellip; ADDS to the number already inside the box.');
      await cine.caption('The round <b>score</b> block stands for the number inside the box.');
      await drv.page.keyboard.press('Escape').catch(() => {});
      await drv.page.waitForTimeout(700);

      /* the rework's teaching beat: the forever block was there all along */
      const fv = await drv.canvasBlock('forever', true);
      if (!fv) throw new Error('forever block not on canvas');
      /* DFM 169 sit finding: the callout and the caption used to carry the
         IDENTICAL sentence, so the film said the same thing twice in a row.
         The callout now NAMES the block; the caption says what it DOES. */
      await cine.callout({ x: fv.x - 6, y: fv.y - 6, w: fv.w + 12, h: fv.h + 12 },
        'This forever block came free with your project', { side: 'below' });
      await cine.caption('Every new project comes with a <b>forever</b> block. Whatever you put inside it runs over and over &mdash; and it never stops.');

      const basicCat = await drv.category('Basic');
      if (!basicCat) throw new Error('Basic category not found');
      await cine.captionShow('From <b>Basic</b>: drop <b>show number</b> INSIDE forever.', { pos: 'top' });
      await cine.click(basicCat.cx, basicCat.cy, { after: 1100 });
      await dragIntoMouth(cine, drv, 'show number', 'forever');
      await cine.captionHide();

      const varCat2 = await drv.category('Variables');
      await cine.captionShow('Now drag the round <b>score</b> block INTO the 0 slot, so the block reads <b>show number score</b>.', { pos: 'top' });
      await cine.click(varCat2.cx, varCat2.cy, { after: 1100 });
      const oval = await drv.flyoutBlock('^score$');
      if (!oval) throw new Error('score oval not in flyout');
      const sn = await nestedBlockRect(drv, 'forever', 'show number');
      if (!sn) throw new Error('nested show number not found');
      await cine.drag(oval.cx, oval.cy, sn.x + sn.w - 18, sn.cy, { ms: 1600 });
      for (let i = 0; i < 8; i++) {
        const now = await nestedBlockRect(drv, 'forever', 'show number');
        if (now && /score/.test(now.text)) break;
        await drv.page.waitForTimeout(350);
        if (i === 7) throw new Error('score oval never landed in the slot: ' + (now && now.text));
      }
      await cine.captionHide();
      await drv.page.keyboard.press('Escape').catch(() => {});

      await drv.page.waitForTimeout(3200); // let the simulator restart and draw
      const leds = await drv.ledsOn();
      log('LEDs with nothing pressed: ' + leds);
      /* his screenshot-4 finding, 9 Aug: the old caption ("The display is the
         loop's job now... The loop started itself.") was four abstractions in
         two lines and he could not tell what it was trying to say. */
      await cine.caption('Look at the simulator: it already shows <b>0</b>, and you have not pressed anything. The <b>forever</b> loop started by itself, and it is showing the number in the box &mdash; over and over.');
      await cine.caption('That is a variable made, and a scoreboard already running. <b>Now make it count.</b>');

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const code = await drv.readProgram();
      if (!/forever\([\s\S]*showNumber\(score\)/.test(code)) throw new Error('show number not inside forever: ' + code.slice(0, 200));
      if (/onButtonPressed/.test(code)) throw new Error('unexpected event block in ch2: ' + code.slice(0, 200));
      log('verified forever-owns-the-display program');
    }
  },

  /* ================= CHAPTER 3 - Count it up ================= */
  {
    id: 'ch3',
    label: 'Count it up',
    run: async ({ cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 3', title: 'Count it up',
        sub: 'Press A ' + DASH + ' the number climbs'
      });
      await drv.setProgram(LOOP_ONLY_PROGRAM);
      await drv.setProjectName('scoreboard');
      await cine.pause(1400);
      await cine.lift();
      await cine.ensureCursor(700, 480);

      /* his screenshot-5 finding, 9 Aug: the old caption ("The job: every
         press of button A changes the number in the box. The loop is already
         showing it.") described a block she had not built yet in the present
         tense, and "it" could read as the button press. Future-framed now. */
      await cine.caption('Right now, pressing <b>button A</b> does nothing &mdash; no block is listening for it. You are about to build the block that listens.');

      const inputCat = await drv.category('Input');
      if (!inputCat) throw new Error('Input category not found');
      await cine.captionShow('Events live in <b>Input</b> &mdash; drag <b>on button A pressed</b> out.', { pos: 'top' });
      await cine.click(inputCat.cx, inputCat.cy, { after: 1100 });
      const onBtn = await drv.flyoutBlock('on button A pressed');
      if (!onBtn) throw new Error('on button A pressed not in flyout');
      await cine.drag(onBtn.x + 60, onBtn.y + 22, 840, 300, { ms: 1500 });
      await cine.captionHide();
      await cine.caption('Drop it on empty canvas BESIDE the forever block &mdash; its own separate stack, not inside forever. When A is pressed, this event will change the number in the box &mdash; and the loop already shows that number on screen, so you will see it change.');

      const varCat = await drv.category('Variables');
      await cine.captionShow('From <b>Variables</b>: drop <b>set score to</b> INSIDE the event.', { pos: 'top' });
      await cine.click(varCat.cx, varCat.cy, { after: 1100 });
      const setB = await drv.flyoutBlock('set score to');
      if (!setB) throw new Error('set score to not in flyout');
      const evt = await drv.canvasBlock('on button A pressed');
      if (!evt) throw new Error('button A event not on canvas');
      await cine.drag(setB.x + 50, setB.y + 20, evt.x + 78, evt.y + evt.h - 18, { ms: 1500 });
      await cine.captionHide();
      await drv.page.keyboard.press('Escape').catch(() => {});
      await drv.page.waitForTimeout(700);

      /* the live editor refuses synthetic number-field clicks while the
         recorder runs (pupils click it for real, no problem) - so the film
         SHOWS the field with a callout, then a clean curtain dip lands the
         exact state a real click and keystroke produce. Same proven trick as
         the A-to-B dropdown below. */
      const num = await nestedBlockRect(drv, 'on button A pressed', 'set score to');
      if (num) {
        await cine.callout({ x: num.x + num.w - 46, y: num.y - 4, w: 44, h: num.h + 8 },
          'Click the 0 and type 1 — set FORCES that number into the box', { side: 'below' });
      }
      await cine.curtain({ kicker: 'ONE CLICK', title: '0 → 1', sub: 'type it straight into the block' });
      await drv.setProgram(SET_ONE_PROGRAM);
      await drv.setProjectName('scoreboard');
      await cine.pause(600);
      await cine.lift();
      await cine.pause(400);

      await cine.captionShow('Press <b>A</b>&hellip; then press it again.');
      await pressSim(cine, drv, 'A', 3200);
      await pressSim(cine, drv, 'A', 900);
      await cine.captionHide();
      await cine.caption('<b>1</b>, every single time. <b>set</b> forces the same number in, over and over. Useful for a reset &mdash; useless for counting.');

      // swap set -> change: take the old block OUT first (never stack them)
      const toolbox = await drv.category('Basic');
      const oldSet = await nestedBlockRect(drv, 'on button A pressed', 'set score to');
      if (!oldSet) throw new Error('set block missing before swap');
      await cine.captionShow('Swap it: drag <b>set score to 1</b> out and drop it back on the toolbox to bin it.', { pos: 'top' });
      await cine.drag(oldSet.cx, oldSet.cy, toolbox.cx, toolbox.cy, { ms: 1500 });
      for (let i = 0; i < 8; i++) {
        if (!(await drv.canvasBlock('set score to', true))) break;
        await drv.page.waitForTimeout(350);
        if (i === 7) throw new Error('set block never binned');
      }
      await cine.captionHide();

      const varCat2 = await drv.category('Variables');
      await cine.captionShow('And drop <b>change score by 1</b> in its place.', { pos: 'top' });
      await cine.click(varCat2.cx, varCat2.cy, { after: 1100 });
      const chg = await drv.flyoutBlock('change score by');
      if (!chg) throw new Error('change score by not in flyout');
      const evt2 = await drv.canvasBlock('on button A pressed');
      await cine.drag(chg.x + 50, chg.y + 20, evt2.x + 78, evt2.y + evt2.h - 18, { ms: 1500 });
      for (let i = 0; i < 8; i++) {
        if (await nestedBlockRect(drv, 'on button A pressed', 'change score by')) break;
        await drv.page.waitForTimeout(350);
        if (i === 7) throw new Error('change block never nested');
      }
      await cine.captionHide();
      await drv.page.keyboard.press('Escape').catch(() => {});

      await cine.captionShow('Now press <b>A</b> three times.');
      await pressSim(cine, drv, 'A', 3200);
      await pressSim(cine, drv, 'A', 900);
      await pressSim(cine, drv, 'A', 900);
      await cine.captionHide();
      await cine.caption('1&hellip; 2&hellip; 3. Notice what you never touched: <b>the display</b>. The loop redraws whatever is in the box, the instant it changes.');

      /* the proof - and the exact move rung 1 asks a pupil to make */
      await cine.caption('Do not take my word for it. <b>Prove</b> the loop is doing the showing.');
      const snIn = await nestedBlockRect(drv, 'forever', 'show number');
      if (!snIn) throw new Error('show number not inside forever at proof time');
      await cine.captionShow('Drag <b>show number score</b> OUT of forever, onto empty canvas.', { pos: 'top' });
      await cine.drag(snIn.x + 26, snIn.cy, 1040, 560, { ms: 1500 });
      await cine.captionHide();
      await drv.page.waitForTimeout(3200);
      const dark = await drv.ledsOn();
      log('LEDs with show number outside forever: ' + dark);
      await cine.captionShow('Press <b>A</b>&hellip; and again&hellip;');
      await pressSim(cine, drv, 'A', 2600);
      await pressSim(cine, drv, 'A', 900);
      await cine.captionHide();
      const dark2 = await drv.ledsOn();
      log('LEDs after presses with show number outside forever: ' + dark2);
      await cine.caption('Dark. And it <b>stays</b> dark, even when you press. <b>No loop, no scoreboard. Put it back.</b>');

      await dragCanvasIntoMouth(cine, drv, 'show number', 'forever');
      await drv.page.waitForTimeout(2800);
      await cine.caption('Back on. <b>A real score counter</b> &mdash; the event changes the number, the loop shows it.');

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const code = await drv.readProgram();
      if (!/onButtonPressed\(Button\.A[\s\S]*score \+= 1/.test(code)) throw new Error('A handler wrong: ' + code.slice(0, 200));
      if (!/forever\([\s\S]*showNumber\(score\)/.test(code)) throw new Error('show number not back inside forever: ' + code.slice(0, 200));
      if (/onButtonPressed[\s\S]*showNumber/.test(code.replace(/basic\.forever\([\s\S]*?\n\}\)/, ''))) throw new Error('stray show number inside an event: ' + code.slice(0, 200));
      log('verified count program with the loop owning the display');
    }
  },

  /* ================= CHAPTER 4 - Reset for a fresh game ================= */
  {
    id: 'ch4',
    label: 'Reset for a fresh game',
    tailMs: 4200,
    run: async ({ cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 4', title: 'Reset for a fresh game',
        sub: 'Button B wipes the board ' + DASH + ' then prove it'
      });
      await drv.setProgram(COUNT_PROGRAM);
      await drv.setProjectName('scoreboard');
      await cine.pause(1200);
      await cine.lift();
      await cine.ensureCursor(700, 480);

      await cine.caption('One problem: last game’s score <b>never goes away</b>. Every game needs a fresh 0.');

      const inputCat = await drv.category('Input');
      await cine.captionShow('Drag a second <b>on button A pressed</b> out&hellip; it lands FADED.', { pos: 'top' });
      await cine.click(inputCat.cx, inputCat.cy, { after: 1100 });
      const onBtn = await drv.flyoutBlock('on button A pressed');
      if (!onBtn) throw new Error('on button A pressed not in flyout');
      await cine.drag(onBtn.x + 60, onBtn.y + 22, 900, 520, { ms: 1500 });

      /* the flip: the live editor refuses synthetic field clicks while the
         recorder runs (pupils click it for real, no problem) - so the video
         SHOWS the dropdown with a callout + instruction, then a clean curtain
         dip lands the exact state a real click produces */
      const dd = await dropdownRect(drv, 'on button A pressed', 'A');
      if (!dd) throw new Error('A dropdown field not found');
      await cine.captionHide();
      await cine.caption('It landed FADED — two “button A” events can’t both run.');
      await cine.callout({ x: dd.cx - 30, y: dd.cy - 18, w: 60, h: 36 }, 'This little dropdown picks the button — click it, choose B', { side: 'below' });
      await cine.curtain({ kicker: 'ONE CLICK', title: 'A → B', sub: 'pick B from the little menu' });
      await drv.setProgram(COUNT_PLUS_EMPTY_B);
      await drv.setProjectName('scoreboard');
      await cine.pause(600);
      await cine.lift();
      await cine.pause(400);

      const varCat = await drv.category('Variables');
      await cine.captionShow('From <b>Variables</b>: <b>set score to 0</b> goes INSIDE button B.', { pos: 'top' });
      await cine.click(varCat.cx, varCat.cy, { after: 1100 });
      const setBlk = await drv.flyoutBlock('set score to');
      if (!setBlk) throw new Error('set score to not in flyout');
      const evtB = await drv.canvasBlock('on button B pressed');
      if (!evtB) throw new Error('button B event not on canvas');
      await cine.drag(setBlk.x + 50, setBlk.y + 20, evtB.x + 78, evtB.y + evtB.h - 18, { ms: 1500 });
      for (let i = 0; i < 8; i++) {
        if (await nestedBlockRect(drv, 'on button B pressed', 'set score to')) break;
        await drv.page.waitForTimeout(350);
        if (i === 7) throw new Error('set score to never nested under button B');
      }
      await cine.captionHide();
      await drv.page.keyboard.press('Escape').catch(() => {});
      await cine.caption('And that is the whole reset. <b>No show block needed anywhere else</b> &mdash; the loop already shows every change.');

      // the multi-round test habit - the whole point of the lesson
      await cine.caption('Now test like an engineer. <b>Three full rounds</b>, not one.');
      await cine.captionShow('Round 1: <b>B</b> for a fresh 0&hellip;');
      await pressSim(cine, drv, 'B', 3200);
      await cine.captionHide();
      await cine.captionShow('&hellip;then <b>A</b> three times&hellip;');
      await pressSim(cine, drv, 'A', 900);
      await pressSim(cine, drv, 'A', 900);
      await pressSim(cine, drv, 'A', 900);
      await cine.captionHide();
      await cine.captionShow('&hellip;and <b>B</b> again. Back to 0.');
      await pressSim(cine, drv, 'B', 900);
      await cine.captionHide();

      await cine.captionShow('Round 2. Same cycle, no shortcuts.');
      await pressSim(cine, drv, 'A', 1200);
      await pressSim(cine, drv, 'A', 900);
      await pressSim(cine, drv, 'A', 900);
      await pressSim(cine, drv, 'B', 900);
      await cine.captionHide();

      await cine.captionShow('Round 3.');
      await pressSim(cine, drv, 'A', 1200);
      await pressSim(cine, drv, 'A', 900);
      await pressSim(cine, drv, 'A', 900);
      await pressSim(cine, drv, 'B', 900);
      await cine.captionHide();
      await cine.caption('<b>Right once could be luck. Right three rounds running is proof.</b>');

      /* DFM 168: the film is now served in parts ON the ladder, so "now build
         the ladder" would be false - she has been building all along. */
      await cine.drop({
        crest: CREST, kicker: 'READY TO COMPETE',
        title: 'That is the whole scoreboard',
        sub: 'Built by you, tested three rounds — the Reaction Rally is waiting.'
      });
      await cine.pause(3800);
    },
    verify: async ({ drv, log }) => {
      const code = await drv.readProgram();
      if (!/Button\.B[\s\S]*score = 0/.test(code)) throw new Error('B handler wrong: ' + code.slice(0, 200));
      if (!/Button\.A[\s\S]*score \+= 1/.test(code)) throw new Error('A handler lost: ' + code.slice(0, 200));
      if (!/forever\([\s\S]*showNumber\(score\)/.test(code)) throw new Error('forever display lost: ' + code.slice(0, 200));
      log('verified reset program with the loop owning the display');
    }
  }
];

module.exports = { scenes };
