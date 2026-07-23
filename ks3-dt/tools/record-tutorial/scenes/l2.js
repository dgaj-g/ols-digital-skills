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
      await cine.install();
      await cine.curtain({
        crest: CREST, kicker: 'MAKE IT MOVE ' + DASH + ' TUTORIAL',
        title: 'Getting Started with MakeCode',
        sub: 'Chapter 1 ' + DASH + ' Find MakeCode'
      });
      await drv.openHome();
      await cine.pause(600);
      await cine.lift();
      await cine.ensureCursor(640, 430);

      await cine.caption('This is <b>makecode.microbit.org</b> &mdash; type that into your browser.');
      const np = await drv.button('New Project', 80);
      if (!np) throw new Error('New Project button not found');
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
      await drv.page.waitForTimeout(3500);
      await drv.dismissDialogs();
      await cine.captionHide();

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
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 2', title: 'First blocks',
        sub: 'Press button A ' + DASH + ' show a heart'
      });
      await drv.openEditor();
      await drv.setProjectName('make-it-move');
      await cine.pause(400);
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
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 3', title: 'Onto the real micro:bit',
        sub: 'Download ' + DASH + ' connect ' + DASH + ' copy across'
      });
      await drv.openEditor();
      await drv.setProgram(HEART_PROGRAM);
      await drv.setProjectName('make-it-move');
      await cine.pause(400);
      await cine.lift();
      await cine.ensureCursor(500, 450);

      await cine.caption('The simulator is practice. Now put it on a <b>real</b> micro:bit.');
      const dl = await drv.button('Download', 100);
      if (!dl) throw new Error('Download button not found');
      await cine.captionShow('Click the purple <b>Download</b> button.', { pos: 'top' });
      await cine.click(dl.cx, dl.cy, { after: 1400 });
      await cine.captionHide();

      // wizard step 1: connect
      const info1 = await drv.modalInfo();
      log('wizard1: ' + JSON.stringify(info1));
      await cine.caption('Step 1: plug the micro:bit into the computer with its <b>USB cable</b>.');
      const next = await drv.modalButton('Next');
      if (next) await cine.click(next.cx, next.cy, { after: 1300 });

      // wizard step 2: pair / download as file
      const info2 = await drv.modalInfo();
      log('wizard2: ' + JSON.stringify(info2));
      await cine.caption('In school we use <b>Download as File</b>.');
      const asFile = await drv.modalButton('Download as File');
      if (asFile) {
        await cine.click(asFile.cx, asFile.cy, { after: 2200 });
        const info3 = await drv.modalInfo();
        log('wizard3: ' + JSON.stringify(info3));
        await cine.caption('MakeCode saves <b>make-it-move.hex</b> into the <b>Downloads</b> folder. That file IS your program.');
        // close whatever remains
        const done = await drv.modalButton('Done|Got it|Close|Ok');
        if (done) await cine.click(done.cx, done.cy, { after: 700 });
        await drv.dismissDialogs();
      }

      // the physical steps - full-screen cards with the real photos
      await cine.card({
        kicker: 'ON THE DESK', title: 'Copy your program across',
        img: IMG_USB, credit: CREDIT_USB,
        lines: [
          'Your micro:bit shows up like a USB stick called <b>MICROBIT</b>',
          'Drag <b>make-it-move.hex</b> from Downloads onto <b>MICROBIT</b>',
          'The light on the back <b>blinks</b> while it copies &mdash; when it stops, your program lives on the device'
        ]
      }, 15500);
      await cine.card({
        kicker: 'THE PAYOFF', title: 'Press A on the real thing',
        img: IMG_HEART, credit: CREDIT_HEART,
        lines: ['No screen, no simulator &mdash; a real heart on real hardware. <b>You built that.</b>']
      }, 8500);

      await cine.drop({});
      await cine.pause(1200);
    },
    verify: async ({ drv, log }) => {
      const code = await drv.readProgram();
      if (!/onButtonPressed[\s\S]*showIcon/.test(code)) throw new Error('program wrong');
      log('verified program intact');
    }
  },

  /* ================= CHAPTER 4 - Test like an agent ================= */
  {
    id: 'ch4',
    label: 'Test like an agent',
    tailMs: 4200,
    run: async ({ cine, drv, log }) => {
      await cine.install();
      await cine.curtain({
        kicker: 'CHAPTER 4', title: 'Test like an agent',
        sub: 'Break it on purpose ' + DASH + ' watch it fail ' + DASH + ' fix it'
      });
      await drv.openEditor();
      await drv.setProgram(HEART_PROGRAM);
      await drv.setProjectName('make-it-move');
      await cine.pause(400);
      await cine.lift();
      await cine.ensureCursor(700, 480);

      await cine.captionShow('Your program works&hellip; <b>prove it</b>. Press A.');
      await pressSimA(cine, drv, 2400);
      await cine.captionHide();
      await cine.caption('Works. But agents go further: <b>break it on purpose</b> to learn how it fails.');

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
      await cine.caption('Your rung cards work exactly like this: build, test on the device, <b>Debug Hint</b> only if stuck.');

      await cine.drop({
        crest: CREST, kicker: 'MISSION IS GO',
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
