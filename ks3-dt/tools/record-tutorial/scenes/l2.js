/* J1 Lesson 2 "Make It Move" - tutorial chapters (text-based, no narration).
   Policy: teacher demo is the primary source; this video must let an absent
   pupil complete the whole lesson alone. Smooth, slick, simple.
   Chapter labels here feed the platform's video engine `chapters` config.
   Source stays ASCII: — escapes for text nodes, &mdash;/&rarr; for HTML. */
const path = require('path');
const { dataUri } = require('../lib/cinema');

const CREST = dataUri('crest-360.png');
const IMG_USB = dataUri('microbit-usb-1100.jpg');
const IMG_HEART = dataUri('microbit-heart-900.jpg');
const CREDIT_USB = 'Photo: Dcavedon, CC BY-SA 4.0, Wikimedia Commons';
const CREDIT_HEART = 'Photo: Nicolas Buffler, CC BY 2.0, Wikimedia Commons';
const DASH = '\u2014';

const HEART_PROGRAM = 'input.onButtonPressed(Button.A, function () {\n    basic.showIcon(IconNames.Heart)\n})\n';

/* fixed-viewport geometry (1280x720, from probes) for the chapter-1 tour */
const RECT_SIM = { x: 16, y: 80, w: 406, h: 333 };
const RECT_TOOLBOX = { x: 432, y: 85, w: 200, h: 470 };
const RECT_CANVAS = { x: 660, y: 85, w: 590, h: 540 };

async function pressSimA(cine, drv, settleMs) {
  await drv.page.waitForTimeout(settleMs || 2600); // let the sim recompile/restart
  const a = await drv.simButton('A');
  if (!a) throw new Error('sim button A not found');
  await cine.click(a.cx, a.cy, { after: 900 });
}

const scenes = [

  /* ================= CHAPTER 1 - Find MakeCode ================= */
  {
    id: 'ch1',
    label: 'Find MakeCode',
    run: async ({ cine, drv, log }) => {
      await drv.openHome();
      await cine.install();
      await cine.curtain({
        crest: CREST, kicker: 'MAKE IT MOVE ' + DASH + ' TUTORIAL',
        title: 'Getting Started with\nMakeCode for micro:bit',
        sub: 'Chapter 1 ' + DASH + ' Find MakeCode'
      });
      await cine.pause(2900);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      /* DAMIEN, 3 Aug 2026: a caption must teach the medium's own mechanics -
         a pupil watching a film cannot type in another tab at the same time. */
      await cine.caption('This is <b>makecode.microbit.org</b>. Pause this video, type that into a <b>new tab</b>, then come back to this tab and press play. <b>Keep doing that all the way through the film.</b>');
      const np = await drv.page.evaluate(() => {
        const el = document.querySelector('.newprojectcard');
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
      });
      if (!np) throw new Error('New Project card not found');
      await cine.captionShow('Click <b>New Project</b>.');
      await cine.click(np.cx, np.cy, { after: 900 });
      await cine.captionHide();

      // name dialog
      await drv.waitFor(() => drv.page.evaluate(() =>
        !!Array.from(document.querySelectorAll('.ui.modal input, [role="dialog"] input'))
          .find(i => i.offsetParent !== null)), 10000, 'name input');
      const inp = await drv.page.evaluate(() => {
        const i = Array.from(document.querySelectorAll('.ui.modal input, [role="dialog"] input')).find(x => x.offsetParent !== null);
        const b = i.getBoundingClientRect();
        return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
      });
      await cine.captionShow('Name it <b>make-it-move</b>, then Create.');
      await cine.click(inp.cx, inp.cy, { after: 250 });
      await drv.page.keyboard.type('make-it-move', { delay: 110 });
      await cine.pause(500);
      const create = await drv.modalButton('Create');
      if (!create) throw new Error('Create button not found');
      await cine.click(create.cx, create.cy, { after: 600 });
      await cine.captionHide();

      // the editor loads on camera - keep the pupil oriented
      await cine.captionShow('MakeCode is building your empty project&hellip;');
      await drv.waitFor(() => drv.page.evaluate(() =>
        !!document.querySelector('.blocklyToolboxDiv, [role="treeitem"]')), 45000, 'editor after create');
      await drv.page.waitForTimeout(2500);
      await cine.captionHide();

      // MakeCode's welcome-tour toast: close it ON CAMERA (pupils meet it too)
      const tourClose = await drv.page.evaluate(() => {
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          if (el.offsetParent === null || el.children.length > 12) continue;
          if (!/take a tour/i.test(el.textContent || '')) continue;
          const btn = el.closest('div').parentElement.querySelector('[aria-label="Close"], .closeIcon, .close.icon') ||
            el.querySelector('[aria-label="Close"], .closeIcon, .close.icon');
          if (btn) {
            const b = btn.getBoundingClientRect();
            if (b.width > 4) return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
          }
        }
        return null;
      });
      if (tourClose) {
        await cine.captionShow('MakeCode offers a tour &mdash; close it. <b>This video is your tour.</b>');
        await cine.pause(1600);
        await cine.click(tourClose.cx, tourClose.cy, { after: 500 });
        await cine.captionHide();
      }
      await drv.dismissDialogs();
      await drv.page.waitForTimeout(2200); // let the simulator finish booting

      // 10-second tour
      await cine.callout(RECT_SIM, 'The simulator ' + DASH + ' a practice micro:bit', { side: 'below' });
      await cine.callout(RECT_TOOLBOX, 'The toolbox ' + DASH + ' all your blocks', { side: 'below' });
      await cine.callout(RECT_CANVAS, 'The workspace ' + DASH + ' build here', { side: 'below' });
      await cine.caption('Found it. Named it. Toured it. <b>Ready to build.</b>');

      await cine.drop({});
      await cine.pause(1200);
    }
  },

  /* ================= CHAPTER 2 - First blocks ================= */
  {
    id: 'ch2',
    label: 'First blocks',
    run: async ({ cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 2', title: 'First blocks',
        sub: 'Press button A ' + DASH + ' show a heart'
      });
      await drv.setProjectName('make-it-move');
      await cine.pause(2900);
      await cine.lift();
      await cine.ensureCursor(760, 500);

      await cine.caption('Every new project gives you two starter blocks. <b>Leave them be.</b>');
      await cine.caption('The mission: <b>press button A &rarr; show a heart</b>.');

      // Input category -> on button A pressed
      const inputCat = await drv.category('Input');
      if (!inputCat) throw new Error('Input category not found');
      await cine.captionShow('Events live in <b>Input</b>.', { pos: 'top' });
      await cine.click(inputCat.cx, inputCat.cy, { after: 1100 });
      const onBtn = await drv.flyoutBlock('on button A pressed');
      if (!onBtn) throw new Error('on button A pressed not in flyout');
      await cine.captionHide();
      await cine.captionShow('Drag <b>on button A pressed</b> onto the workspace.', { pos: 'top' });
      await cine.drag(onBtn.x + 60, onBtn.y + 22, 770, 420, { ms: 1500 });
      await cine.captionHide();
      const evt = await drv.canvasBlock('on button A pressed');
      if (!evt) throw new Error('event block did not land on canvas');
      await cine.caption('This is an <b>event</b> &mdash; when it happens, everything inside it runs.');

      // Basic category -> show icon, nested inside
      const basicCat = await drv.category('Basic');
      await cine.captionShow('The reaction lives in <b>Basic</b>.', { pos: 'top' });
      await cine.click(basicCat.cx, basicCat.cy, { after: 1100 });
      const icon = await drv.flyoutBlock('show icon');
      if (!icon) throw new Error('show icon not in flyout');
      await cine.captionHide();
      await cine.captionShow('Drop <b>show icon</b> INSIDE the event block.', { pos: 'top' });
      const evt2 = await drv.canvasBlock('on button A pressed');
      await cine.drag(icon.x + 50, icon.y + 20, evt2.x + 72, evt2.y + evt2.h - 20, { ms: 1500 });
      await cine.captionHide();
      await cine.caption('Snapped inside. <b>Input</b> on the outside, <b>output</b> within.');

      // simulator test
      await cine.captionShow('Test it: press <b>A</b> on the simulator.');
      await pressSimA(cine, drv, 2800);
      await cine.captionHide();
      await cine.caption('The heart lights up. An input <b>triggered</b> an output &mdash; your first working program.');

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const code = await drv.readProgram();
      if (!/onButtonPressed[\s\S]*showIcon/.test(code)) throw new Error('program wrong: ' + code.slice(0, 120));
      log('verified nested program');
    }
  },

  /* ================= CHAPTER 3 - Onto the real micro:bit ================= */
  {
    id: 'ch3',
    label: 'Onto the real micro:bit',
    run: async ({ cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 3', title: 'Onto the real micro:bit',
        sub: 'Download ' + DASH + ' connect ' + DASH + ' copy across'
      });
      await drv.setProgram(HEART_PROGRAM);
      await drv.setProjectName('make-it-move');
      await cine.pause(1200);
      await cine.lift();
      await cine.ensureCursor(500, 450);

      await cine.caption('The simulator is practice. Now put it on a <b>real</b> micro:bit.');
      const dl = await drv.button('Download', 100);
      if (!dl) throw new Error('Download button not found');
      await cine.captionShow('Click the purple <b>Download</b> button.', { pos: 'top' });
      await cine.click(dl.cx, dl.cy, { after: 1400 });
      await cine.captionHide();

      /* DAMIEN, 3 Aug 2026: the chapter now HANDS OVER here. He filmed the real
         connect-download-drag journey on a school machine, and his footage
         replaces everything the recorder used to mime between this point and
         the payoff card (the pair wizard, the .hex explanation and the
         ON THE DESK card). His instruction: the Step 1 caption gains "This is
         how you do it..." and the film cuts to his footage on it.
         The payoff card that follows his footage is lifted UNCHANGED from the
         July take (seg/ch3b-payoff.mp4) - see assemble-l2-3aug.js. */
      const info1 = await drv.modalInfo();
      log('wizard1: ' + JSON.stringify(info1));
      await cine.caption('Step 1: plug the micro:bit into the computer with its <b>USB cable</b>. <b>This is how you do it&hellip;</b>',
        { keep: true });
      await cine.pause(500);

      await cine.drop({});
      await cine.pause(1000);
    },
    verify: async ({ drv, log }) => {
      const code = await drv.readProgram();
      if (!/onButtonPressed[\s\S]*showIcon/.test(code)) throw new Error('program wrong');
      log('verified program intact');
    }
  },

  /* ================= CHAPTER 4 - Test it properly ================= */
  {
    id: 'ch4',
    label: 'Test it properly',
    tailMs: 4200,
    run: async ({ cine, drv, log }) => {
      await drv.openEditor();
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 4', title: 'Test it properly',
        sub: 'Break it on purpose ' + DASH + ' watch it fail ' + DASH + ' fix it'
      });
      await drv.setProgram(HEART_PROGRAM);
      await drv.setProjectName('make-it-move');
      await cine.pause(1200);
      await cine.lift();
      await cine.ensureCursor(700, 480);

      /* DAMIEN, 3 Aug 2026: "just make it clear in the pop ups that all of this
         testing will be done on the simulator - pupils don't need to download
         anything else to the micro:bit for the moment." */
      await cine.caption('Everything in this chapter happens on the <b>simulator</b> &mdash; the practice micro:bit on your screen. You do <b>not</b> need to put anything else onto your real micro:bit for now.');
      await cine.captionShow('Your program works&hellip; <b>prove it</b>. Press <b>A</b> on the simulator.');
      await pressSimA(cine, drv, 2400);
      await cine.captionHide();
      await cine.caption('Works. But good programmers go further: <b>break it on purpose</b> to learn how it fails.');

      // pull the show icon block OUT of the event
      const icon = await drv.canvasBlock('show icon', true);
      if (!icon) throw new Error('show icon block not found on canvas');
      await cine.captionShow('Drag <b>show icon</b> OUT of the event block.', { pos: 'top' });
      await cine.drag(icon.cx, icon.cy, 1020, 540, { ms: 1400 });
      await cine.captionHide();
      await cine.captionShow('Now press <b>A</b> again&hellip;');
      await pressSimA(cine, drv, 3000);
      await cine.captionHide();
      const leds = await drv.ledsOn();
      log('LEDs after broken press: ' + leds);
      await cine.caption('<b>Nothing.</b> A block sitting on its own never runs &mdash; it must be INSIDE the event.');

      // fix it
      const evt = await drv.canvasBlock('on button A pressed');
      const icon2 = await drv.canvasBlock('show icon', true);
      await cine.captionShow('Fix it: drag the block <b>back inside</b>.', { pos: 'top' });
      await cine.drag(icon2.cx, icon2.cy, evt.x + 72, evt.y + evt.h - 20, { ms: 1400 });
      await cine.captionHide();
      await pressSimA(cine, drv, 3000);
      await cine.caption('Fixed. See it fail &rarr; find the cause &rarr; test again. That habit is called <b>debugging</b>.');
      /* DAMIEN, 3 Aug 2026: neither "rung" nor "Debug Hint" had ever been
         explained when this caption used them (rule 138.1.3 - define before
         use, on every surface, captions included). The hint really does cost a
         signal point, so the caption says so (rule 35). */
      await cine.caption('Back in the lesson, each challenge sits on its own card called a <b>rung</b> &mdash; four of them, climbed in order, like the rungs of a ladder.');
      await cine.caption('Every rung card works exactly like this one: build it, then test it. If you get stuck, the card has a <b>Debug Hint</b> button that gives you a clue &mdash; it costs you one signal point.');

      await cine.drop({
        crest: CREST, kicker: 'READY TO BUILD',
        title: 'Now build the ladder',
        sub: 'Rung 2 is the heart you just made. Rungs 3 and 4 are yours.'
      });
      await cine.pause(3800);
    },
    verify: async ({ drv, log }) => {
      const code = await drv.readProgram();
      if (!/onButtonPressed[\s\S]*showIcon/.test(code)) throw new Error('fix-it drag failed: ' + code.slice(0, 120));
      log('verified re-nested program');
    }
  }
];

module.exports = { scenes };
