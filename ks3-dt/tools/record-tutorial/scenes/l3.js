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

const COUNT_PROGRAM = 'input.onButtonPressed(Button.A, function () {\n    score += 1\n    basic.showNumber(score)\n})\nlet score = 0\n';

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

/* rect of the editable number slot ("0") inside the SUB-BLOCK (e.g. show number)
   of a top-level canvas block matching containerRx. Scoped to the sub-block so
   the finder can never hit a sibling's slot (change score by 1 also has one). */
function numberSlotRect(drv, containerRx, subRx) {
  return drv.page.evaluate(([containerRx, subRx]) => {
    const crx = new RegExp(containerRx, 'i');
    const srx = new RegExp(subRx, 'i');
    const clean = (s) => s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const el of Array.from(document.querySelectorAll('.blocklyBlockCanvas > g.blocklyDraggable'))) {
      const text = clean(Array.from(el.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' '));
      if (!crx.test(text)) continue;
      const subs = Array.from(el.querySelectorAll('g.blocklyDraggable')).filter(s =>
        srx.test(clean(Array.from(s.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' '))));
      subs.sort((a, b) => { const ba = a.getBoundingClientRect(), bb = b.getBoundingClientRect(); return ba.width * ba.height - bb.width * bb.height; });
      for (const sub of subs) {
        const slot = Array.from(sub.querySelectorAll('.blocklyEditableText')).find(s => /^[0-9]+$/.test((s.textContent || '').trim()));
        if (!slot) continue;
        const b = slot.getBoundingClientRect();
        return { cx: b.x + b.width / 2, cy: b.y + b.height / 2, w: b.width, h: b.height };
      }
    }
    return null;
  }, [containerRx, subRx]);
}

/* rect of a dropdown field (by its current text) inside a canvas block matching blockRx */
function dropdownRect(drv, blockRx, fieldText) {
  return drv.page.evaluate(([blockRx, fieldText]) => {
    const rx = new RegExp(blockRx, 'i');
    for (const el of Array.from(document.querySelectorAll('.blocklyBlockCanvas g.blocklyDraggable'))) {
      const text = Array.from(el.querySelectorAll('.blocklyText')).map(t => t.textContent).join(' ')
        .replace(/[​-‍﻿ ]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!rx.test(text)) continue;
      const f = Array.from(el.querySelectorAll('.blocklyEditableText, .blocklyDropdownText')).find(s => (s.textContent || '').trim() === fieldText);
      if (!f) continue;
      const b = f.getBoundingClientRect();
      return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    }
    return null;
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

/* drag `show number` to sit under a nested sibling block; one corrective
   re-drag if the first drop failed to snap into the container */
async function dragShowNumberUnder(cine, drv, siblingRx, containerRx) {
  const sib = await drv.canvasBlock(siblingRx, true);
  if (!sib) throw new Error(siblingRx + ' not on canvas');
  const fly = await drv.flyoutBlock('show number');
  if (!fly) throw new Error('show number not in flyout');
  await cine.drag(fly.x + 30, fly.y + 12, sib.x + 46, sib.y + sib.h + 8, { ms: 1500 }); // grab the label edge - +50/+20 lands on the slot region and the drag never starts
  for (let i = 0; i < 5; i++) {
    if (await numberSlotRect(drv, containerRx, 'show number')) return;
    await drv.page.waitForTimeout(400);
  }
  const stray = await drv.canvasBlock('show number', true);
  const sib2 = await drv.canvasBlock(siblingRx, true);
  if (stray && sib2) {
    await cine.drag(stray.cx, stray.cy, sib2.x + 46, sib2.y + sib2.h + 6, { ms: 1100 });
    for (let i = 0; i < 5; i++) {
      if (await numberSlotRect(drv, containerRx, 'show number')) return;
      await drv.page.waitForTimeout(400);
    }
  }
  throw new Error('show number never nested under ' + siblingRx);
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
      await cine.captionShow('<b>New Project</b> &mdash; just like last mission.');
      await cine.click(np.cx, np.cy, { after: 900 });
      await cine.captionHide();

      await drv.waitFor(() => drv.page.evaluate(() =>
        !!Array.from(document.querySelectorAll('.ui.modal input, [role="dialog"] input'))
          .find(i => i.offsetParent !== null)), 10000, 'name input');
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
      await drv.dismissDialogs();
      await drv.page.waitForTimeout(1800);

      await cine.caption('An empty project&hellip; but no box to keep score in yet. <b>Chapter 2 fixes that.</b>');

      await cine.drop({});
      await cine.pause(1200);
    }
  },

  /* ================= CHAPTER 2 - Make the variable ================= */
  {
    id: 'ch2',
    label: 'Make the variable',
    run: async ({ cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 2', title: 'Make the variable',
        sub: 'One box, named score'
      });
      await drv.setProjectName('scoreboard');
      await cine.pause(2900);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.caption('Variables live in&hellip; <b>Variables</b>. Sensible.');
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

      // the flyout now shows the score blocks - the teaching beat
      const setBlk = await drv.flyoutBlock('set score to');
      if (!setBlk) throw new Error('set score to not in flyout after create');
      await cine.caption('Three new blocks appeared. <b>set score to</b> &mdash; FORCE a number into the box.');
      await cine.caption('<b>change score by</b> &mdash; ADD to whatever is already inside.');
      await cine.caption('And the little <b>score</b> oval IS the box &mdash; drop it anywhere a number goes.');
      await cine.caption('That is a variable made. <b>Now make it count.</b>');

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      /* a created-but-unused variable emits no `let` in TS - verify via the
         Variables flyout instead (runs behind the drop curtain) */
      const cat = await drv.category('Variables');
      if (!cat) throw new Error('Variables category missing');
      await drv.page.mouse.click(cat.cx, cat.cy);
      await drv.page.waitForTimeout(1400);
      const blk = await drv.flyoutBlock('set score to');
      if (!blk) throw new Error('score variable not in flyout after create');
      log('verified score variable exists in flyout');
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
      await drv.setProjectName('scoreboard');
      await makeVariableSilently(drv, 'score'); // fresh scene: recreate the box off-camera
      await cine.pause(1400);
      await cine.lift();
      await cine.ensureCursor(700, 480);

      await cine.caption('The mission: every press of <b>button A</b> adds one to the score.');

      const inputCat = await drv.category('Input');
      if (!inputCat) throw new Error('Input category not found');
      await cine.captionShow('Events live in <b>Input</b> &mdash; drag <b>on button A pressed</b> out.', { pos: 'top' });
      await cine.click(inputCat.cx, inputCat.cy, { after: 1100 });
      const onBtn = await drv.flyoutBlock('on button A pressed');
      if (!onBtn) throw new Error('on button A pressed not in flyout');
      await cine.drag(onBtn.x + 60, onBtn.y + 22, 780, 400, { ms: 1500 });
      await cine.captionHide();

      const varCat = await drv.category('Variables');
      await cine.captionShow('From <b>Variables</b>: drop <b>change score by 1</b> INSIDE the event.', { pos: 'top' });
      await cine.click(varCat.cx, varCat.cy, { after: 1100 });
      const chg = await drv.flyoutBlock('change score by');
      if (!chg) throw new Error('change score by not in flyout');
      const evt = await drv.canvasBlock('on button A pressed');
      await cine.drag(chg.x + 50, chg.y + 20, evt.x + 78, evt.y + evt.h - 18, { ms: 1500 });
      await cine.captionHide();
      await cine.caption('Every press: <b>add 1 to the box</b>. But a scoreboard nobody can see is useless&hellip;');

      const basicCat = await drv.category('Basic');
      await cine.captionShow('From <b>Basic</b>: drop <b>show number</b> underneath it.', { pos: 'top' });
      await cine.click(basicCat.cx, basicCat.cy, { after: 1100 });
      await dragShowNumberUnder(cine, drv, 'change score by', 'on button A pressed');
      await cine.captionHide();

      // the key move: the score oval INTO the 0 slot
      const varCat2 = await drv.category('Variables');
      await cine.captionShow('The clever bit: drag the <b>score</b> oval INTO the 0 slot.', { pos: 'top' });
      await cine.click(varCat2.cx, varCat2.cy, { after: 1100 });
      const oval = await drv.flyoutBlock('^score$');
      if (!oval) throw new Error('score oval not in flyout');
      const slot = await numberSlotRect(drv, 'on button A pressed', 'show number');
      if (!slot) throw new Error('show number 0 slot not found');
      await cine.drag(oval.cx, oval.cy, slot.cx, slot.cy, { ms: 1600 });
      await cine.captionHide();
      await cine.caption('<b>show number score</b> &mdash; show whatever is in the box, every time.');

      await cine.captionShow('Test it: press <b>A</b>&hellip; then again&hellip; then again.');
      await pressSim(cine, drv, 'A', 3000);
      await pressSim(cine, drv, 'A', 800);
      await pressSim(cine, drv, 'A', 800);
      await cine.captionHide();
      await cine.caption('1&hellip; 2&hellip; 3. The box remembers, the display shows it. <b>A real score counter.</b>');

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const code = await drv.readProgram();
      if (!/onButtonPressed[\s\S]*score \+= 1[\s\S]*showNumber\(score\)/.test(code)) throw new Error('program wrong: ' + code.slice(0, 160));
      log('verified count program');
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
      await cine.captionHide();
      await cine.caption('Two “button A” events can’t both run &mdash; MakeCode fades the copy out.');

      // flip the dropdown A -> B on camera
      await cine.captionShow('The little dropdown fixes it: click the <b>A</b>&hellip;', { pos: 'top' });
      const dd = await dropdownRect(drv, 'on button A pressed', 'A');
      if (!dd) throw new Error('A dropdown field not found');
      await cine.click(dd.cx, dd.cy, { after: 1000 });
      const itemB = await dropdownItemRect(drv, 'B');
      if (!itemB) throw new Error('dropdown item B not found');
      await cine.click(itemB.cx, itemB.cy, { after: 900 });
      await cine.captionHide();
      await cine.caption('<b>on button B pressed</b> &mdash; awake, and all yours.');

      const varCat = await drv.category('Variables');
      await cine.captionShow('From <b>Variables</b>: <b>set score to 0</b> goes INSIDE button B.', { pos: 'top' });
      await cine.click(varCat.cx, varCat.cy, { after: 1100 });
      const setBlk = await drv.flyoutBlock('set score to');
      if (!setBlk) throw new Error('set score to not in flyout');
      const evtB = await drv.canvasBlock('on button B pressed');
      if (!evtB) throw new Error('button B event not on canvas');
      await cine.drag(setBlk.x + 50, setBlk.y + 20, evtB.x + 78, evtB.y + evtB.h - 18, { ms: 1500 });
      await cine.captionHide();

      const basicCat = await drv.category('Basic');
      await cine.captionShow('And <b>show number</b> under it &mdash; so everyone SEES the fresh 0.', { pos: 'top' });
      await cine.click(basicCat.cx, basicCat.cy, { after: 1100 });
      await dragShowNumberUnder(cine, drv, 'set score to', 'on button B pressed');
      await cine.captionHide();

      const varCat2 = await drv.category('Variables');
      await cine.captionShow('Same trick as before: the <b>score</b> oval into the 0 slot.', { pos: 'top' });
      await cine.click(varCat2.cx, varCat2.cy, { after: 1100 });
      const oval = await drv.flyoutBlock('^score$');
      const slot = await numberSlotRect(drv, 'on button B pressed', 'show number');
      if (!slot) throw new Error('B-handler number slot not found');
      await cine.drag(oval.cx, oval.cy, slot.cx, slot.cy, { ms: 1600 });
      await cine.captionHide();

      // the multi-round test habit - the whole point of the lesson
      await cine.captionShow('Now test like an engineer. Score three&hellip;');
      await pressSim(cine, drv, 'A', 3200);
      await pressSim(cine, drv, 'A', 800);
      await pressSim(cine, drv, 'A', 800);
      await cine.captionHide();
      await cine.captionShow('&hellip;and press <b>B</b>.');
      await pressSim(cine, drv, 'B', 1000);
      await cine.captionHide();
      await cine.caption('Back to 0. That is <b>one round</b>. An engineer runs the cycle <b>three times</b> before trusting it.');
      await cine.caption('Right once could be luck. <b>Right three rounds running is proof.</b>');

      await cine.drop({
        crest: CREST, kicker: 'MISSION IS GO',
        title: 'Now build the ladder',
        sub: 'Rung 1 is one block away. The Reaction Rally is waiting.'
      });
      await cine.pause(3800);
    },
    verify: async ({ drv, log }) => {
      const code = await drv.readProgram();
      if (!/Button\.B[\s\S]*score = 0[\s\S]*showNumber\(score\)/.test(code)) throw new Error('B handler wrong: ' + code.slice(0, 200));
      if (!/Button\.A[\s\S]*score \+= 1/.test(code)) throw new Error('A handler lost: ' + code.slice(0, 200));
      log('verified reset program');
    }
  }
];

module.exports = { scenes };
