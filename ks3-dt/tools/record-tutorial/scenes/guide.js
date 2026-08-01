/* The teacher-tools walkthrough (DFM 116). NO VOICE: chapter title cards,
   caption pop-ups, gold rings + labels on the real controls, and a visible
   cursor doing the pressing. Every word on screen was approved verbatim by
   Damien on 1 Aug 2026 (DRAFTS_GUIDE_VIDEO_1AUG.md section B) - do not reword
   here; change the drafts file and re-record.

   Filmed against the preview FakeServer on a staged practice class (8A-DT,
   twelve made-up pupils), so every panel is the real panel rendering real
   data. Source stays ASCII: escapes for text nodes, &mdash;/&rarr; for HTML.

   node lib/record.js guide            all chapters
   node lib/record.js guide ch3        one chapter
   node assemble.js guide              stitch + chapters.json
*/
const path = require('path');
const { dataUri } = require('../lib/cinema');
const { stageInPage, PUPILS } = require('../lib/stage-guide');

const CREST = dataUri('crest-360.png');
const DASH = '—';
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=8A-DT&as=teacher';
const KICKER = 'THE TEACHER TOOLS ' + DASH + ' A TOUR';

/* ---------- setup helpers (run behind the curtain, never filmed) ---------- */

async function boot(page, opts) {
  await page.addInitScript(
    ({ fn, o }) => { new Function('opts', '(' + fn + ')(opts)')(o); },
    { fn: stageInPage.toString(), o: Object.assign({ pupils: PUPILS }, opts || {}) }
  );
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    const b = document.querySelector('.intro-skip, .intro-overlay button');
    if (b) b.click();
  });
  await page.waitForTimeout(700);
  await tidyPreview(page);
}

/* Two things the preview adds that the real app does not have, and that would
   film as defects: its own PREVIEW badge/banner, and the record the signed-in
   preview identity creates by joining the class (a thirteenth pupil nobody in
   the script ever mentions). Both are removed before anything is filmed, so
   the panel on screen is the panel a teacher actually gets. */
async function tidyPreview(page) {
  await page.evaluate(names => {
    Array.from(document.querySelectorAll('div')).forEach(d => {
      const t = (d.textContent || '').trim();
      if (d.id === 'ks3dt-nokeys' || /^PREVIEW\s*[·-]/.test(t)) d.remove();
    });
    document.documentElement.style.paddingTop = '';
    document.body.style.paddingTop = '';
    const db = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
    let changed = false;
    Object.keys(db.pupils || {}).forEach(k => {
      if (names.indexOf(db.pupils[k].n) === -1) { delete db.pupils[k]; changed = true; }
    });
    if (changed) localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, PUPILS.map(p => p[0]));
}

async function openPanel(page, tab) {
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button,a')).find(e => /staff/i.test(e.textContent || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const inp = document.querySelector('#staff-body input');
    inp.value = 'demo';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#staff-body button').click();
  });
  await page.waitForTimeout(2100);
  /* Every tab but Classes works on the SELECTED class, so select it behind the
     curtain - a teacher does this once and the panel remembers. */
  await page.evaluate(() => {
    const b = document.querySelector('[data-action="select-class"]');
    if (b) b.click();
  });
  await page.waitForTimeout(1200);
  if (tab) await switchTab(page, tab);
}

async function switchTab(page, tab) {
  await page.evaluate(t => {
    const el = document.querySelector('.staff-tab[data-tab="' + t + '"]');
    if (el) el.click();
  }, tab);
  await page.waitForTimeout(1700);
}

/* geometry of a live element, in viewport pixels (what callout() wants) */
async function rect(page, sel, textRx) {
  const r = await page.evaluate(([s, rx]) => {
    let nodes = Array.from(document.querySelectorAll(s));
    if (rx) {
      const re = new RegExp(rx, 'i');
      nodes = nodes.filter(n => re.test((n.textContent || '').replace(/\s+/g, ' ')));
    }
    const n = nodes[0];
    if (!n) return null;
    const b = n.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  }, [sel, textRx || null]);
  if (!r) throw new Error('no element for ' + sel + (textRx ? ' /' + textRx + '/' : ''));
  return r;
}
const mid = r => [Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2)];

async function ring(cine, page, sel, textRx, label, opts) {
  const r = await rect(page, sel, textRx);
  await cine.callout(r, label, opts || {});
  return r;
}

/* a chapter opens on its navy title card and closes back to navy */
async function chapterOpen(cine, page, n, title, sub) {
  await cine.install();
  await cine.curtain({
    crest: CREST, kicker: KICKER,
    title: title,
    sub: 'Chapter ' + n + ' ' + DASH + ' ' + sub
  });
  await cine.pause(2600);
}
async function chapterClose(cine) {
  await cine.pause(700);
  await cine.drop({ bare: true });
  await cine.pause(900);
}

const scenes = [

  /* ============ OPENING CARD ============
     A pure title card: mark lift/down without ever lifting the curtain, so the
     assembler's trim window contains nothing but the card. The running time is
     stated because it is the first thing a teacher wants to know - it must
     match the finished file, so if the film gets longer, change it here AND in
     the Guide tab's heading. */
  {
    id: 'ch0',
    label: 'Opening',
    tailMs: 200,
    run: async ({ page, cine }) => {
      await boot(page, {});
      await cine.install();
      await cine.curtain({
        crest: CREST, kicker: KICKER,
        title: 'The Teacher Tools',
        sub: 'Seven and a half minutes, no sound ' + DASH + ' the captions tell you what is happening.\n' +
             'Filmed on a practice class of made-up pupils.'
      });
      cine.mark('lift');
      await cine.pause(5200);
      cine.mark('down');
      await cine.pause(400);
    }
  },

  /* ============ CHAPTER 1 - Classes ============ */
  {
    id: 'ch1',
    label: 'Classes',
    run: async ({ page, cine }) => {
      await boot(page, {});
      await openPanel(page, 'classes');
      await chapterOpen(cine, page, 1, 'Classes', 'where a class begins');
      await cine.lift();
      await cine.ensureCursor(640, 560);

      await cine.caption('This is the <b>Classes</b> tab &mdash; every class you own, one row each.');
      await ring(cine, page, '[data-action="copy-link"]', null,
        '<b>Copy link</b> is the address pupils open &mdash; post it on Google Classroom.');

      const qr = await rect(page, '[data-action="show-qr"]');
      await cine.click(...mid(qr), { after: 1400 });
      await cine.caption('<b>QR</b> shows the same link as a code for the projector.');
      await page.evaluate(() => {
        const x = document.querySelector('#qr-modal .modal-close, #qr-modal [data-action="close-modal"]');
        if (x) x.click(); else if (window.App && App.closeModal) App.closeModal('qr-modal');
      });
      await cine.pause(900);

      await ring(cine, page, '.staff-add-row', null,
        'New class: a name pupils will recognise, the right year group, <b>Add class</b>.');
      await ring(cine, page, '#staff-pane .staff-row-meta', 'Platform storage',
        'The platform&rsquo;s storage and its nightly archive &mdash; the <b>Guide</b> tab explains both.',
        { side: 'above' });

      await chapterClose(cine);
    }
  },

  /* ============ CHAPTER 2 - Lessons ============ */
  {
    id: 'ch2',
    label: 'Lessons',
    run: async ({ page, cine }) => {
      await boot(page, {});
      await openPanel(page, 'lessons');
      await chapterOpen(cine, page, 2, 'Lessons', 'unlock, lock, and the run sheet');
      await cine.lift();
      await cine.ensureCursor(640, 600);

      await cine.caption('One cell per lesson. Green means <b>unlocked</b>.');

      /* Cell clicks land on the TITLE area: the lower half of a cell is where
         the Brief / Start again / Not taught chips live, and they win the
         click (they are data-action spans inside the toggle button). */
      const cellTop = async () => {
        const c = await rect(page, '.lock-cell[data-num="2"]');
        return [Math.round(c.x + c.w / 2), Math.round(c.y + 22)];
      };

      // unlock Lesson 2 for real
      await cine.click(...(await cellTop()), { after: 1900 });
      await cine.caption('Tap a cell to unlock it &mdash; pupils can now start <b>Lesson 2</b>.');

      // lock it again: the confirm dialog explains itself
      await cine.click(...(await cellTop()), { after: 1500 });
      await ring(cine, page, '#confirm-modal .ols-modal-card', null,
        'Locking again stops anyone <b>new</b> starting. Nobody already inside is thrown out.',
        { side: 'above' });
      await cine.click(...mid(await rect(page, '#confirm-ok')), { after: 2200 });

      // the pill Damien could not see on 1 Aug, appearing on a real state change
      await ring(cine, page, '.lock-cell[data-num="2"] .lc-undo', null,
        'Unlocked by mistake? This clears the delivered date, so nobody is flagged absent for a lesson that never ran.');
      await cine.click(...mid(await rect(page, '.lock-cell[data-num="2"] .lc-undo')), { after: 1600 });
      await cine.click(...mid(await rect(page, '#confirm-ok')), { after: 2300 });

      // Start again - shown, explained, then cancelled
      await cine.click(...mid(await rect(page, '.lock-cell[data-num="1"] .lc-reset')), { after: 1600 });
      await ring(cine, page, '#confirm-modal .ols-modal-card', null,
        '<b>Start again</b> puts the class back to the start of a lesson. It always asks first &mdash; today we cancel.',
        { side: 'above' });
      await cine.click(...mid(await rect(page, '#confirm-cancel')), { after: 1600 });

      // the brief
      const brief = await rect(page, '.lock-cell[data-num="1"] .lc-brief:not(.lc-reset):not(.lc-undo)');
      await cine.click(...mid(brief), { after: 2600 });
      await cine.captionShow('<b>Brief</b> is the lesson&rsquo;s full run sheet &mdash; read it before you teach.');
      await page.evaluate(() => {
        const p = document.querySelector('#staff-pane');
        if (p) p.scrollTop = 0;
      });
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          const p = document.querySelector('#staff-pane') || document.scrollingElement;
          p.scrollBy({ top: 260, behavior: 'smooth' });
        });
        await cine.pause(1100);
      }
      await cine.captionHide();
      await cine.caption('Pictures show what pupils will see, at the moment it matters.');

      await chapterClose(cine);
    }
  },

  /* ============ CHAPTER 3 - Live ============ */
  {
    id: 'ch3',
    label: 'Live',
    run: async ({ page, cine }) => {
      await boot(page, { pairing: true });
      await openPanel(page, 'live');
      await page.waitForTimeout(1800);   // let the pairing panel's first tick land
      await chapterOpen(cine, page, 3, 'Live', 'the room, while it happens');
      await cine.lift();
      await cine.ensureCursor(640, 620);

      await cine.caption('<b>Live</b> is the during-the-hour view. 8A-DT is mid-lesson, in the Vault.');
      await ring(cine, page, '#staff-pane .staff-actions', null,
        'How many have joined, how many have finished, and the class&rsquo;s average XP.');
      await ring(cine, page, '.pair-lens-box', null,
        'During a paired activity this panel runs itself &mdash; it updates every few seconds.',
        { side: 'above' });
      await ring(cine, page, '.pl-pair', null,
        'A pair: codenames first, real names in brackets, and how many messages they have sent.');

      const chan = await rect(page, '[data-action="pair-view"]');
      await cine.click(...mid(chan), { after: 1800 });
      await cine.caption('<b>Channel</b> opens the pair&rsquo;s chat. You can read every message.');

      await ring(cine, page, '.pl-chip', 'waiting',
        'Niamh has been waiting. <b>Solo run</b> releases her to work alone.');
      await ring(cine, page, '[data-action="pair-force"]', null,
        '&hellip;or pair the whole queue at once.');
      await ring(cine, page, '[data-action="pair-reset"]', null,
        '<b>Reset pairing</b> releases every pair to finish alone. It asks twice before doing anything.');
      await ring(cine, page, '.dash-table tr.is-stuck td', null,
        'The red flag means the numbers say this pupil is stuck &mdash; worth a visit.');
      await ring(cine, page, '.dash-table tbody tr:nth-child(2) td:last-child, .dash-table tr:nth-child(2) td:last-child', null,
        'Per lesson: done or started, the recap score, the pupil&rsquo;s own ratings &mdash; and any private comment.');

      await page.evaluate(() => {
        const sel = document.querySelector('#live-mis-select');
        if (sel) { sel.value = '1'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await cine.pause(2200);
      await cine.caption('Pick a lesson and see which wrong answers the class chose &mdash; each labelled with what that mistake usually means.');
      await ring(cine, page, '[data-action="live-refresh"]', null,
        '<b>Refresh</b> re-reads the table. <b>Copy CSV</b> puts it on your clipboard for a marksheet.');

      await chapterClose(cine);
    }
  },

  /* ============ CHAPTER 4 - Absence ============ */
  {
    id: 'ch4',
    label: 'Absence',
    run: async ({ page, cine }) => {
      await boot(page, { absence: true });
      await openPanel(page, 'absence');
      await chapterOpen(cine, page, 4, 'Absence', 'the quiet catch-up list');
      await cine.lift();
      await cine.ensureCursor(640, 600);

      await cine.caption('This list is usually empty. A pupil appears five school days after a delivered lesson with no meaningful work.');
      await ring(cine, page, '.staff-lead', null,
        'Pupils never see this, and it is not an attendance record &mdash; it is a nudge to check in.');

      const dismiss = await rect(page, '[data-action="absence-dismiss"]');
      await cine.click(...mid(dismiss), { after: 1900 });
      await cine.caption('<b>Dismiss</b> clears a flag once you know the story.');

      await chapterClose(cine);
    }
  },

  /* ============ CHAPTER 5 - Teams ============ */
  {
    id: 'ch5',
    label: 'Teams',
    run: async ({ page, cine }) => {
      await boot(page, { teams: true });
      await openPanel(page, 'teams');
      await chapterOpen(cine, page, 5, 'Teams', 'optional groups');
      await cine.lift();
      await cine.ensureCursor(640, 600);

      await cine.caption('Teams power the tournament lessons and the team leaderboard.');
      const chip = await rect(page, '.staff-chip-pool .staff-chip');
      await cine.click(...mid(chip), { after: 1200 });
      await cine.captionShow('Tap a name to move a pupil between teams.');
      const menuBtn = await rect(page, '.staff-chip-menu button', 'Falcons');
      await cine.click(...mid(menuBtn), { after: 2000 });
      await cine.captionHide();

      await ring(cine, page, '[data-action="team-auto"]', null,
        '&hellip;or build fair teams in one press.');
      await ring(cine, page, 'label', 'Pupils can see who is in their team',
        'Team totals can show while the members stay hidden &mdash; until you tick this.');

      await chapterClose(cine);
    }
  },

  /* ============ CHAPTER 6 - Options ============ */
  {
    id: 'ch6',
    label: 'Options',
    run: async ({ page, cine }) => {
      await boot(page, {});
      await openPanel(page, 'options');
      await chapterOpen(cine, page, 6, 'Options', 'four choices per class');
      await cine.lift();
      await cine.ensureCursor(640, 620);

      await ring(cine, page, '#staff-pane h3', 'Leaderboard',
        '<b>Leaderboard</b>: private by default. Public is a deliberate choice.');
      await ring(cine, page, '#staff-pane h3', 'Auto-pairing',
        '<b>Auto-pairing</b> off runs paired activities shoulder-to-shoulder at one machine instead.');
      await ring(cine, page, '#staff-pane h3', 'Tournament reveal',
        'The projector reveal: team totals only, or pair scores as well.');
      await ring(cine, page, '#staff-pane h3', 'Absence window',
        'The absence window from Chapter 4 &mdash; yours to change.');

      const save = await rect(page, '[data-action="options-save"]');
      await cine.click(...mid(save), { after: 1900 });
      await cine.caption('One <b>Save</b> stores all four.');

      await chapterClose(cine);
    }
  },

  /* ============ CHAPTER 7 - Cover ============ */
  {
    id: 'ch7',
    label: 'Cover',
    run: async ({ page, cine }) => {
      await boot(page, {});
      await openPanel(page, 'cover');
      await chapterOpen(cine, page, 7, 'Cover', 'for the day you are absent');
      await cine.lift();
      await cine.ensureCursor(640, 600);

      await cine.caption('<b>Cover Mode</b> sets your class up for a covering teacher.');
      await ring(cine, page, '#cover-pick', null,
        'It suggests the next ready lesson &mdash; and steers around discussion-led ones, which wait for you.');

      const start = await rect(page, '[data-action="cover-start"]');
      await cine.click(...mid(start), { after: 3000 });
      await cine.caption('One press unlocks the lesson and writes the cover sheet.');
      await ring(cine, page, '.cover-sheet', null,
        'A few lines to read aloud &mdash; the covering teacher is not expected to teach.',
        { side: 'above' });

      const end = await rect(page, '[data-action="cover-end"]');
      await cine.click(...mid(end), { after: 2400 });
      await cine.caption('<b>End Cover Mode</b> when you are back.');

      await chapterClose(cine);
    }
  },

  /* ============ CHAPTER 8 - Guide ============ */
  {
    id: 'ch8',
    label: 'Guide',
    run: async ({ page, cine }) => {
      await boot(page, { hod: true });
      await openPanel(page, 'guide');
      await chapterOpen(cine, page, 8, 'Guide', 'this reference, whenever you need it');
      await cine.lift();
      await cine.ensureCursor(640, 620);

      await cine.caption('The <b>Guide</b> tab holds this video, the written quick-reference, and the answers teachers actually ask for.');
      await page.evaluate(() => {
        const p = document.querySelector('#staff-pane') || document.scrollingElement;
        p.scrollBy({ top: 420, behavior: 'smooth' });
      });
      await cine.pause(1600);

      await cine.pause(500);
      await cine.curtain({
        crest: CREST, kicker: '', bare: false,
        /* curtain text is set with textContent, so entities would render raw -
           title-card copy uses the real characters, unlike captions (HTML). */
        title: 'That is the whole panel.',
        sub: 'Lesson-by-lesson help lives in each lesson’s Brief.'
      });
      await cine.pause(3000);
      cine.mark('down');
      await cine.pause(700);
    }
  }
];

module.exports = { scenes };
