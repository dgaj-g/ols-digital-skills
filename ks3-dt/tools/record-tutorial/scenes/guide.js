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
/* DFM 125: "The Teacher Tools" told a viewer nothing; the title now says what
   the film IS, and the kicker carries the platform context. */
const KICKER = 'OLS KS3 DIGITAL TECHNOLOGY PLATFORM';

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

/* THE FIX BEHIND MOST OF DAMIEN'S ROUND-1 NOTES (1 Aug, DFM 121a). The staff
   panel scrolls, and highlights were drawn at whatever coordinates an element
   happened to have - so anything below the fold was ringed OFF SCREEN. The
   caption played to an empty frame and the film sat in dead air waiting for it.
   Every annotation now scrolls its target to the middle of the panel, waits for
   the scroll to settle, and REFUSES to draw if the target is still not fully in
   frame - a loud failure in recording is worth more than a silent one on film. */
async function scrollIntoFrame(page, sel, textRx) {
  await page.evaluate(([s, rx]) => {
    let nodes = Array.from(document.querySelectorAll(s));
    if (rx) { const re = new RegExp(rx, 'i'); nodes = nodes.filter(n => re.test((n.textContent || '').replace(/\s+/g, ' '))); }
    const n = nodes[0];
    if (n) n.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }, [sel, textRx || null]);
  await page.waitForTimeout(900);   // let the smooth scroll finish
}

/* geometry of a live element, in viewport pixels (what callout() wants) */
async function rect(page, sel, textRx, child) {
  const r = await page.evaluate(([s, rx, ch]) => {
    let nodes = Array.from(document.querySelectorAll(s));
    if (rx) {
      const re = new RegExp(rx, 'i');
      nodes = nodes.filter(n => re.test((n.textContent || '').replace(/\s+/g, ' ')));
    }
    let n = nodes[0];
    /* `child` picks a part of the matched node - e.g. the row belonging to a
       named pupil, then that row's lesson cell. Ringing the right pupil's cell
       matters: a caption about self-ratings and comments must land on a cell
       that actually HAS them (DFM 121a). */
    if (n && ch) n = n.querySelector(ch) || n;
    if (!n) return null;
    const b = n.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  }, [sel, textRx || null, child || null]);
  if (!r) throw new Error('no element for ' + sel + (textRx ? ' /' + textRx + '/' : ''));
  return r;
}
const mid = r => [Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2)];

async function ring(cine, page, sel, textRx, label, opts) {
  opts = opts || {};
  if (!opts.noScroll) await scrollIntoFrame(page, sel, textRx);
  const r = await rect(page, sel, textRx, opts.child);
  const VH = 720, MARGIN = 4;
  const pillRoom = opts.side === 'above' ? 100 : 110;
  const top = r.y - (opts.side === 'above' ? pillRoom : 0);
  const bottom = r.y + r.h + (opts.side === 'above' ? 0 : pillRoom);
  if (top < MARGIN || bottom > VH - MARGIN) {
    throw new Error('OFF-FRAME annotation: ' + sel + (textRx ? ' /' + textRx + '/' : '') +
      ' rect y=' + r.y + ' h=' + r.h + ' needs ' + top + '..' + bottom + ' of 0..' + VH);
  }
  await cine.callout(r, label, opts);
  return r;
}

/* a click whose target may be below the fold */
async function clickAt(cine, page, sel, textRx, opts) {
  await scrollIntoFrame(page, sel, textRx);
  const r = await rect(page, sel, textRx);
  await cine.click(Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2), opts || {});
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
      /* DFM 125: the running time and "no sound" are GONE from this card - by
         the time it is on screen the viewer is already watching, so it told
         them nothing. Both still appear on the Guide tab, where a teacher is
         deciding whether to start it. */
      await cine.curtain({
        crest: CREST, kicker: KICKER,
        title: 'A Guide to the Teacher Tools',
        sub: 'Everything in the staff panel, tab by tab.\n' +
             'Filmed on a practice class of made-up pupils.'
      });
      cine.mark('lift');
      await cine.pause(4800);
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

      await cine.caption('This is the <b>Classes</b> tab &mdash; every class you own has a row here.');
      await ring(cine, page, '[data-action="copy-link"]', null,
        '<b>Copy link</b> copies the address pupils open. Post it on your class&rsquo;s Google Classroom ' +
        'and it brings each pupil straight into your class.');

      await clickAt(cine, page, '[data-action="show-qr"]', null, { after: 1500 });
      await cine.caption('<b>QR</b> shows the same link as a code for the projector.');
      await page.evaluate(() => {
        const x = document.querySelector('#qr-modal .modal-close, #qr-modal [data-action="close-modal"]');
        if (x) x.click(); else if (window.App && App.closeModal) App.closeModal('qr-modal');
      });
      await cine.pause(900);

      await ring(cine, page, '.staff-add-row', null,
        'To create a class: type a name pupils will recognise, choose the year group, and press ' +
        '<b>Add class</b>.');
      await ring(cine, page, '#staff-pane .staff-row-meta', 'Platform storage',
        'These two lines are the platform&rsquo;s storage and its nightly archive &mdash; the ' +
        '<b>Guide</b> tab explains both.', { side: 'above' });

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

      await cine.caption('One cell for every lesson of the year. Green means <b>unlocked</b>.');

      const cellTop = async () => {
        const c = await rect(page, '.lock-cell[data-num="2"]');
        return [Math.round(c.x + c.w / 2), Math.round(c.y + 22)];
      };

      await cine.click(...(await cellTop()), { after: 1900 });
      await cine.caption('Tap a cell to unlock that lesson &mdash; pupils can now start <b>Lesson 2</b>.');

      await cine.click(...(await cellTop()), { after: 1500 });
      await ring(cine, page, '#confirm-modal .ols-modal-card', null,
        'Tap it again to lock it. Locking stops anyone <b>new</b> starting &mdash; nobody already inside ' +
        'is thrown out.', { side: 'above', noScroll: true });
      await cine.click(...mid(await rect(page, '#confirm-ok')), { after: 2200 });

      await ring(cine, page, '.lock-cell[data-num="2"] .lc-undo', null,
        'Unlocked by mistake? <b>&#8634; Not taught</b> clears the delivered date, so nobody is flagged ' +
        'absent for a lesson that never ran.');
      await clickAt(cine, page, '.lock-cell[data-num="2"] .lc-undo', null, { after: 1600 });
      await cine.click(...mid(await rect(page, '#confirm-ok')), { after: 2300 });

      await clickAt(cine, page, '.lock-cell[data-num="1"] .lc-reset', null, { after: 1600 });
      await ring(cine, page, '#confirm-modal .ols-modal-card', null,
        '<b>Start again</b> puts the whole class back to the start of a lesson. It always asks first ' +
        '&mdash; today we cancel.', { side: 'above', noScroll: true });
      await cine.click(...mid(await rect(page, '#confirm-cancel')), { after: 1600 });

      await clickAt(cine, page, '.lock-cell[data-num="1"] .lc-brief:not(.lc-reset):not(.lc-undo)', null, { after: 2600 });
      await cine.captionShow('<b>Brief</b> opens the lesson&rsquo;s full run sheet &mdash; what pupils ' +
        'will do, how to prepare, and how to run the hour.');
      await page.evaluate(() => { const p = document.querySelector('#staff-pane'); if (p) p.scrollTop = 0; });
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          const p = document.querySelector('#staff-pane') || document.scrollingElement;
          p.scrollBy({ top: 260, behavior: 'smooth' });
        });
        await cine.pause(1100);
      }
      await cine.captionHide();
      await cine.caption('Read it before you teach. The pictures show exactly what pupils will see, at ' +
        'the moment it matters.');

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
      await page.waitForTimeout(1800);
      await chapterOpen(cine, page, 3, 'Live', 'the room, while it happens');
      await cine.lift();
      await cine.ensureCursor(640, 620);

      await cine.caption('<b>Live</b> is the during-the-hour view &mdash; the tab to keep open while ' +
        'your class works. 8A-DT is mid-lesson, in the Vault.');
      await ring(cine, page, '#staff-pane .staff-actions', null,
        'These counters show how many pupils have joined, how many have finished the lesson, and the ' +
        'class&rsquo;s average XP.');
      await ring(cine, page, '.pair-lens-box', null,
        'While a paired activity runs, this panel manages itself &mdash; it updates every few seconds.',
        { side: 'above' });
      await ring(cine, page, '.pl-pair', null,
        'Here is a pair: codenames first, real names in brackets, and how many messages they have sent.');

      await clickAt(cine, page, '[data-action="pair-view"]', null, { after: 1800 });
      await cine.caption('<b>Channel</b> opens the pair&rsquo;s chat. You can read every message they ' +
        'send each other.');

      await ring(cine, page, '.pl-chip', 'waiting',
        'Niamh is still waiting for a partner. <b>Solo run</b> releases her to work alone.');
      await ring(cine, page, '[data-action="pair-force"]', null,
        '&hellip;or <b>Match everyone waiting now</b> pairs the whole queue at once.');
      await ring(cine, page, '[data-action="pair-reset"]', null,
        '<b>Reset pairing</b> releases every pair to finish alone. It asks twice before doing anything.');

      await ring(cine, page, '.dash-table tr.is-stuck td', null,
        'The red <b>needs you</b> flag means the numbers say this pupil is stuck &mdash; worth a quiet ' +
        'visit.');

      /* DFM 121g: the end-of-lesson evaluations get their own moment - Damien
         calls them extremely important and the first cut barely mentioned them. */
      await ring(cine, page, '.dash-table tr', 'Lucy Sands',
        'Every pupil ends every lesson with a <b>How did it go?</b> screen &mdash; and their answers land ' +
        'here: the self-ratings, how the hour felt, and their private comment, which comes to you and ' +
        'nobody else.', { child: 'td:last-child' });
      await cine.caption('The quiet pupils often say here what they would not say in the room. ' +
        '<b>Copy CSV</b> keeps every comment for your records.');

      await page.evaluate(() => {
        const sel = document.querySelector('#live-mis-select');
        if (sel) { sel.value = '1'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await cine.pause(2400);
      await ring(cine, page, '#live-mis-body', null,
        'Pick a delivered lesson and see which wrong answers the class actually chose &mdash; each ' +
        'labelled with the misunderstanding it usually signals.', { side: 'above' });

      await ring(cine, page, '[data-action="live-refresh"]', null,
        '<b>Refresh</b> re-reads the table. <b>Copy CSV</b> puts it on your clipboard &mdash; paste it ' +
        'into Excel or Sheets as your marksheet.');

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

      await cine.caption('This list is usually empty &mdash; that is what it is designed to tell you. A ' +
        'pupil appears five school days after a delivered lesson with no meaningful work.');
      await ring(cine, page, '.staff-lead', null,
        'Pupils never see this, and it is not an attendance record &mdash; it is a private nudge to ' +
        'check in.');

      await clickAt(cine, page, '[data-action="absence-dismiss"]', null, { after: 1900 });
      await cine.caption('Once you know the story, <b>Dismiss flag</b> clears it.');

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

      await cine.caption('Teams power the tournament lessons and the hidden-teams leaderboard.');
      await clickAt(cine, page, '.staff-chip-pool .staff-chip', null, { after: 1300 });
      await cine.captionShow('Tap any pupil&rsquo;s name and a menu appears &mdash; choose the team to ' +
        'move them into.');
      await cine.pause(1500);
      await cine.click(...mid(await rect(page, '.staff-chip-menu button', 'Falcons')), { after: 2000 });
      await cine.captionHide();

      await ring(cine, page, '[data-action="team-auto"]', null,
        '&hellip;or <b>Auto-make N teams</b> splits the class into even teams in one press.');
      /* last control in the pane: the panel cannot scroll it any higher, so the
         label goes ABOVE it rather than off the bottom of the frame */
      await ring(cine, page, 'label', 'Pupils can see who is in their team',
        'While this stays unticked, pupils can see their team&rsquo;s total without knowing who else is ' +
        'in it &mdash; the tournament lessons use exactly that for their big reveal.', { side: 'above' });

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
      await chapterOpen(cine, page, 6, 'Options', 'four choices for this class');
      await cine.lift();
      await cine.ensureCursor(640, 620);

      await ring(cine, page, '#staff-pane .staff-lead', null,
        'Options holds four choices for the class you have selected. They take effect when you save, and ' +
        'last until you change them.');
      await ring(cine, page, '#staff-pane h3', 'Leaderboard',
        '<b>Leaderboard</b>: private by default &mdash; progress stays between each pupil and you.');
      await cine.caption('<b>Public</b> puts one ranked board on every pupil&rsquo;s home page &mdash; ' +
        'whole-class, whole-year totals &mdash; until you switch it back.');
      await ring(cine, page, 'label', 'Hidden teams',
        '<b>Hidden teams</b>: pupils see their team&rsquo;s total, but not who is in it, until you choose ' +
        'to show them. Built for the tournament lessons.');
      await ring(cine, page, '#staff-pane h3', 'Auto-pairing',
        '<b>Auto-pairing</b> on matches pupils across machines with the monitored chat. Off, pupils work ' +
        'shoulder-to-shoulder at one machine instead.');
      await ring(cine, page, '#staff-pane h3', 'Tournament reveal',
        '<b>Tournament reveal</b>: the projector shows team totals with nobody named &mdash; or, if you ' +
        'choose, the ranked pair scores with pupils&rsquo; full names.');
      await ring(cine, page, '#staff-pane h3', 'Absence window',
        'The <b>absence window</b> from Chapter 4 &mdash; how many school days before a pupil is flagged. ' +
        'Yours to change.');

      await clickAt(cine, page, '[data-action="options-save"]', null, { after: 1900 });
      await cine.caption('One press of <b>Save</b> stores all four choices at once &mdash; they take ' +
        'effect straight away, for this class only.');

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

      await cine.caption('<b>Cover Mode</b> sets your class up for the day you are absent.');
      await ring(cine, page, '#cover-pick', null,
        'It suggests the next lesson that is ready &mdash; and steers around discussion-led ones, which ' +
        'wait for you.');

      await clickAt(cine, page, '[data-action="cover-start"]', null, { after: 3000 });
      await cine.caption('One press unlocks the lesson and writes the cover sheet.');
      await ring(cine, page, '.cover-sheet h4', 'Read this to the class',
        'A few lines for the covering teacher to read aloud &mdash; they are not expected to teach.');
      await ring(cine, page, '[data-action="cover-print"]', null,
        '<b>Print this sheet</b> opens it in a clean tab with the print box ready &mdash; choose your ' +
        'printer, or Save as PDF for a copy you can send.');

      await clickAt(cine, page, '[data-action="cover-end"]', null, { after: 2400 });
      await cine.caption('<b>End Cover Mode</b> when you are back.');

      /* DFM 121e: the Guide chapter is cut - the viewer is already on the Guide
         tab, so a chapter about it was redundant. The film closes here. */
      await cine.pause(600);
      await cine.curtain({
        crest: CREST, kicker: '',
        title: 'That is the whole panel.',
        sub: 'The written version of this tour is right here on the Guide tab, where you found this film.\n' +
             'Lesson-by-lesson help lives in each lesson’s Brief.'
      });
      await cine.pause(3400);
      cine.mark('down');
      await cine.pause(700);
    }
  }
];

module.exports = { scenes };
