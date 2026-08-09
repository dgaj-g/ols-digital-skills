/* The teacher-tools walkthrough (DFM 116). NO VOICE: chapter title cards,
   caption pop-ups, gold rings + labels on the real controls, and a visible
   cursor doing the pressing. Every word on screen was approved verbatim by
   Damien on 1 Aug 2026 (DRAFTS_GUIDE_VIDEO_1AUG.md section B) - do not reword
   here; change the drafts file and re-record.

   TWO HOMES, since 9 Aug 2026 (rule 144): chapters ch0/ch1/ch2/ch4/ch5/ch6/ch7
   are owned by DRAFTS_GUIDE_VIDEO_1AUG.md as above. Chapters ch3 and ch3b are
   owned by GUIDE_FILM_LIVE2_SPEC.md sections 4 and 5 - the Live tab was rebuilt
   across DFM 156-162 and the old chapter 3 could not even be re-taken, because
   it drove #live-mis-select, a control the redesign deleted.
   The three "Tap" captions in ch2 and ch5 were swept to "Click" on 9 Aug: she
   has a MOUSE (138.1.6), and rule 150 says a banned word is swept on every
   surface - this generator was the one the 4 Aug sweep never reached (147).

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
       that actually HAS them (DFM 121a).
       A MISSING child is a HARD FAILURE, never a fall back to the parent
       (9 Aug 2026): it used to return the row, so when a flag failed to save
       and the grey "helped" pill never appeared, the beat quietly ringed the
       whole row and the film shipped a caption describing something that was
       not on screen. A silent fallback hides exactly the fault the off-frame
       guard exists to catch. */
    if (n && ch) {
      const kid = n.querySelector(ch);
      if (!kid) return { missingChild: true };
      n = kid;
    }
    if (!n) return null;
    const b = n.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  }, [sel, textRx || null, child || null]);
  if (!r) throw new Error('no element for ' + sel + (textRx ? ' /' + textRx + '/' : ''));
  if (r.missingChild) {
    throw new Error('MISSING TARGET: ' + sel + (textRx ? ' /' + textRx + '/' : '') +
      ' has no ' + child + ' - the thing this beat is about is not on screen');
  }
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

/* a click on a control INSIDE a matched row - the flag pills all look alike, so
   they are only ever addressed as "this pupil's red flag", never "the first one" */
async function clickIn(cine, page, sel, textRx, child, opts) {
  opts = opts || {};
  if (!opts.noScroll) await scrollIntoFrame(page, sel, textRx);
  const r = await rect(page, sel, textRx, child);
  await cine.click(...mid(r), opts);
  return r;
}

/* THE TWO-PRESS CONTROLS HAVE A DEADLINE (staff.js: flagArmTimer disarms after
   4000ms). A filmed press is not a scripted press: the cursor animates, the
   panel scrolls, and each of those costs real time - the first cut spent ~3.9s
   getting from press one to press two and the flag disarmed under it. So the
   confirming press never scrolls (the target is already in frame, it was just
   clicked) and moves fast, leaving the arm window comfortably unspent. */
const CONFIRM = { noScroll: true, ms: 200, settle: 120, after: 200 };
async function pressTwice(cine, page, sel, textRx, child, armedMs) {
  await clickIn(cine, page, sel, textRx, child, { after: armedMs == null ? 1400 : armedMs });
  await clickIn(cine, page, sel, textRx, child, CONFIRM);
}

/* THE APP'S OWN HOVER TEXT (DFM 163). Half of what the Live tab teaches lives
   in title attributes - why a flag fired, which baseline questions she missed,
   what Refresh actually does. The string is read OFF THE ELEMENT here and drawn
   as a tooltip: retyping it into a caption would be a copy that drifts the day
   the app's wording changes (149's lesson). Same off-frame law as ring(). */
async function tip(cine, page, sel, textRx, opts) {
  opts = opts || {};
  if (!opts.noScroll) await scrollIntoFrame(page, sel, textRx);
  const found = await page.evaluate(([s, rx, ch]) => {
    let nodes = Array.from(document.querySelectorAll(s));
    if (rx) { const re = new RegExp(rx, 'i'); nodes = nodes.filter(n => re.test((n.textContent || '').replace(/\s+/g, ' '))); }
    let n = nodes[0];
    if (n && ch) n = n.querySelector(ch) || n;
    if (!n) return null;
    const b = n.getBoundingClientRect();
    return { title: n.getAttribute('title') || '', x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  }, [sel, textRx || null, opts.child || null]);
  if (!found) throw new Error('no element to hover for ' + sel + (textRx ? ' /' + textRx + '/' : ''));
  if (!found.title) throw new Error('element has no title attribute to show: ' + sel + (textRx ? ' /' + textRx + '/' : ''));
  /* the tooltip must fit the frame, like every other annotation */
  const VH = 720, W = Math.min(460, Math.max(200, found.title.length * 8.2));
  const tipH = Math.ceil((found.title.length * 8.2) / W) * 23 + 22;
  const top = opts.side === 'above' ? (found.y - 12 - tipH) : found.y;
  const bottom = opts.side === 'above' ? (found.y + found.h) : (found.y + found.h + 12 + tipH);
  if (top < 4 || bottom > VH - 4) {
    throw new Error('OFF-FRAME tooltip: ' + sel + ' needs ' + top + '..' + bottom + ' of 0..' + VH);
  }
  await cine.moveTo(...mid(found));
  await cine.tooltip(found, found.title, opts);
  return found;
}

/* the Showing menu, driven the way a teacher drives it */
async function showLesson(cine, page, num) {
  const r = await rect(page, '#live-lesson-sel');
  await cine.moveTo(...mid(r));
  await page.evaluate(n => {
    const sel = document.querySelector('#live-lesson-sel');
    sel.value = n;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(num));
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
      await cine.caption('Click a cell to unlock that lesson &mdash; pupils can now start <b>Lesson 2</b>.');

      await cine.click(...(await cellTop()), { after: 1500 });
      await ring(cine, page, '#confirm-modal .ols-modal-card', null,
        'Click it again to lock it. Locking stops anyone <b>new</b> starting &mdash; nobody already inside ' +
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

  /* ============ CHAPTER 3 - Live ============
     Rebuilt 9 Aug 2026 (DFM 163). The old chapter could not be re-taken: it
     drove #live-mis-select, a per-panel dropdown the redesign deleted, and its
     captions described a tab that no longer exists. Captions are owned by
     GUIDE_FILM_LIVE2_SPEC.md section 4. */
  {
    id: 'ch3',
    label: 'Live',
    run: async ({ page, cine }) => {
      await boot(page, { live2: true, pairing: true });
      await openPanel(page, 'live');
      await page.waitForTimeout(2600);
      await chapterOpen(cine, page, 3, 'Live', 'one lesson at a time');
      await cine.lift();
      await cine.ensureCursor(640, 620);

      /* A1-A3: the governing idea, the picker, and a panel a lesson earns */
      await cine.caption('<b>Live</b> is the during-the-hour view &mdash; and it shows <b>one lesson at ' +
        'a time</b>. Everything on this tab belongs to the lesson picked in the Showing menu. When you ' +
        'open it, it starts on the newest lesson you have unlocked.');
      await ring(cine, page, '.live-pick', null,
        'Use the <b>Showing</b> menu to look at any delivered lesson. The counts, the table, the key and ' +
        'the misconception bars all follow it together.');
      await ring(cine, page, '#gallery-lens .pair-lens-box', null,
        'A lesson only shows the panels it actually uses. Lesson 5 ends with Press Night, so its panel ' +
        'is here: every studio a pupil has shipped, the reviews they file about each other&rsquo;s games, ' +
        'and a <b>Hide</b> for any listing you want off the class marquee.', { side: 'above' });

      /* A4-A5: the COLD first visit to a lesson. The delay is routed rather
         than faked in the app, and kept to a length a real first fetch takes -
         a film must never show a wait longer than the one a teacher gets. */
      await page.route('**/content/j1/lessons/j1-02.json', async route => {
        await new Promise(r => setTimeout(r, 3800));
        await route.continue();
      });
      await showLesson(cine, page, 2);
      await cine.caption('The first visit to a lesson has to fetch it.', { hold: 3100 });
      await page.waitForTimeout(1400);
      await page.unroute('**/content/j1/lessons/j1-02.json');
      await cine.caption('It says which lesson it is loading, so you are never left looking at a blank ' +
        'panel &mdash; and it only happens once. After that, switching lessons is instant.');

      /* A6-A11: the table, column by column */
      await ring(cine, page, '.staff-actions', 'finished',
        'The counts above the table belong to the picked lesson: how many pupils have finished it, ' +
        'started it, or not started it yet.');
      await ring(cine, page, '.dash-table th', '^Warm-up$',
        '<b>Warm-up</b> is her score on the recap questions the lesson opens with. They ask about earlier ' +
        'lessons, so a low score usually means last fortnight&rsquo;s idea needs another airing.');
      await ring(cine, page, '.dash-table th', '^Q1$',
        'The <b>Q columns</b> are her marked answers to this lesson&rsquo;s exit check, question by question.');
      await ring(cine, page, '.live-legend p', 'exit check',
        'The key under the table quotes what each question asked, and names every symbol &mdash; right, ' +
        'wrong, answered nothing, and not there yet. A wrong answer and no answer are different facts, ' +
        'and the table keeps them different.', { side: 'above' });
      await ring(cine, page, '.dash-table th', '^Build puzzle$',
        'Lessons that close with a build-the-code puzzle add a <b>Build puzzle</b> column &mdash; one mark ' +
        'for whether her rebuilt program was right.');
      await ring(cine, page, '.dash-table th', 'How did it go',
        'These three columns are not marks. They are the pupil&rsquo;s own words: her rating against the ' +
        'lesson&rsquo;s I-can statements, how the hour felt, and a private comment that comes to you and ' +
        'nobody else.');

      /* A12: her real comment, in the app's own hover */
      await tip(cine, page, '.dash-table tr', 'Lucy Sands', { child: '.lc-comment', side: 'above' });
      await cine.caption('Hover over a clipped comment to read all of it. The quiet pupils often say here ' +
        'what they would not say in the room.');

      /* A13-A14 */
      await ring(cine, page, '#live-mis-body', null,
        'The misconception bars show which wrong answers the class chose, each labelled with the ' +
        'misunderstanding it usually signals, and the correct answer named. They follow the picked ' +
        'lesson too.', { side: 'above' });
      await ring(cine, page, '.pl-note', 'never appear in this table',
        'Your own runs of a lesson never appear in this table &mdash; it lists pupils only. Sit a lesson ' +
        'yourself as often as you like; the class sees nothing.', { side: 'above' });

      /* A15-A18: Lesson 1 earns two panels of its own */
      await showLesson(cine, page, 1);
      await page.waitForTimeout(2600);
      await ring(cine, page, '#pair-lens .pair-lens-box', null,
        'Lesson 1 runs the paired Vault, so the Pairing panel appears on Lesson 1&rsquo;s view &mdash; and ' +
        'it manages itself, updating every few seconds. Waiting pupils, the pairs and their message ' +
        'counts, and <b>Channel</b> to read any pair&rsquo;s chat all live here.', { side: 'above' });
      await ring(cine, page, 'h3', 'Licence Exam',
        'Lesson 1 also carries the <b>Licence Exam</b> panel: how the class answered each of the sixteen ' +
        'baseline questions in September, question by question, with the correct answer named on every bar.');
      await tip(cine, page, '.dash-table tr', 'Aoife Byrne', { child: 'td:nth-child(4)' });
      await cine.caption('Hover over any pupil&rsquo;s Baseline score to see the question numbers she got ' +
        'wrong.');

      /* A19: Lesson 3 earns the tournament row */
      await showLesson(cine, page, 3);
      await page.waitForTimeout(2600);
      await ring(cine, page, '#tourney-slot .pair-lens-box', null,
        'Lesson 3 is the tournament lesson, so its launch row lives on Lesson 3&rsquo;s view. The ' +
        '<b>Tournament view</b> and its projector reveal work as the Options chapter shows.',
        { side: 'above' });

      /* A20-A22 */
      await tip(cine, page, '[data-action="live-refresh"]', null, {});
      await cine.caption('<b>Refresh</b> re-reads the class &mdash; new joiners, marks that have just ' +
        'landed. Nothing on this tab updates by itself except the Pairing panel.');
      await ring(cine, page, '[data-action="live-csv"]', null,
        '<b>Copy CSV</b> copies every pupil and every delivered lesson &mdash; the whole marksheet, not ' +
        'just the lesson on screen &mdash; in the same words and marks as this table, ready to paste into ' +
        'Excel or Google Sheets.');
      await cine.caption('One thing we have stepped past: the flags beside some names, and the red line ' +
        'above the table. They get the whole next chapter.');

      await chapterClose(cine);
    }
  },

  /* ============ CHAPTER 3, PART TWO - Live: the flags ============
     New 9 Aug 2026 (DFM 163). The flags grew a whole lifecycle across DFM
     157-162 - explaining themselves, the pupil's own voice, helped/heard, the
     cross-lesson strip - and none of it existed when the film was shot. It is
     its own chapter so a teacher can jump straight to "what do I do with a
     flag" from the chapter list. Captions: GUIDE_FILM_LIVE2_SPEC.md section 5. */
  {
    id: 'ch3b',
    label: 'Live: flags',
    run: async ({ page, cine }) => {
      await boot(page, { live2: true, pairing: true });
      await openPanel(page, 'live');
      await page.waitForTimeout(2600);
      /* behind the curtain: onto Lesson 2, where every flag state is real */
      await page.evaluate(() => {
        const sel = document.querySelector('#live-lesson-sel');
        sel.value = '2'; sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(3000);
      /* DFM 161: the wait between confirming a flag and it turning grey is the
         Apps Script round trip. The preview answers instantly, so the spinner
         he asked for would be invisible on film. Held to the "few seconds" he
         reported, never longer - the film must not overstate the wait either. */
      await page.evaluate(() => {
        const orig = window.OLS_DEV_SERVER.call.bind(window.OLS_DEV_SERVER);
        window.OLS_DEV_SERVER.call = function (p) {
          const r = orig(p);
          if (p && p.action === 'admin' && p.sub === 'flagHandled') {
            return new Promise(res => setTimeout(function () { r.then(res); }, 2600));
          }
          return r;
        };
      });
      await chapterOpen(cine, page, 3, 'Live: the flags', 'part two: the flags, and what to do');
      await cine.lift();
      await cine.ensureCursor(640, 620);

      /* B1-B4: the red flag, its reasons, and the one rule behind two of them */
      await ring(cine, page, '.dash-table tr', 'Lucy Sands',
        'A red <b>needs you</b> flag beside a name means the numbers say something went wrong for her ' +
        '&mdash; in this lesson, the one on screen.', { child: '.pill.flag' });
      await tip(cine, page, '.dash-table tr', 'Lucy Sands', { child: '.pill.flag' });
      await cine.caption('Hover over the flag and it names exactly what happened. Every reason is written ' +
        'in plain words, with her real numbers.');
      await ring(cine, page, '.live-legend p', 'needs you',
        'The key lists all three triggers. Two of them share one rule you only have to learn once: ' +
        '<b>under half right</b> &mdash; of her exit answers, or of her warm-up answers. The third is ' +
        'twenty minutes with nothing new saved.', { side: 'above' });
      await ring(cine, page, '.dash-table tr', 'Grace Toner',
        'Grace got one of her two exit answers right &mdash; half is not under half, so she carries no ' +
        'flag. Lucy got neither right, so her flag is up.');

      /* B5-B8: her own voice */
      await ring(cine, page, '.dash-table tr', 'Lucy Sands',
        'The amber <b>says not yet</b> flag is different: it is the pupil&rsquo;s own voice. At the end of ' +
        'the lesson she pressed &lsquo;Not yet&rsquo; against an I-can statement.', { child: '.pill.voice' });
      await tip(cine, page, '.dash-table tr', 'Lucy Sands', { child: '.pill.voice' });
      await cine.caption('Hover over it and it quotes the exact statement she meant &mdash; and points at ' +
        'her comment when she left one.');
      await ring(cine, page, '.staff-actions .pill.voice', null,
        'The count at the top shows how many pupils are saying it before you read a single row. When half ' +
        'the class says not yet, the message is about the lesson, not the pupils &mdash; re-teach that ' +
        'idea from the front.');
      await ring(cine, page, '.dash-table tr', 'Campbell',
        'The two flags read together: red is what the marks say, amber is what she says. Both on one row ' +
        'means everything agrees she needs help. Amber beside good marks is a pupil who can do it but ' +
        'does not believe it yet &mdash; the statement she marked names what to reassure her about.');

      /* B9-B14: the lifecycle, on Lucy.
         THE APP DISARMS AN ARMED FLAG AFTER 4 SECONDS (staff.js flagArmTimer),
         so the two presses have to happen inside that window. The first cut of
         this chapter explained between them and took ~4.8s - the flag disarmed,
         nothing saved, and the film showed a caption about a grey pill that
         never appeared. So the EXPLAINING happens first, and the two presses
         then run back to back the way a teacher would really do them. */
      await cine.caption('A flag is a to-do, not a verdict. When you have dealt with one, click it &mdash; ' +
        'it asks first, so a stray click can never clear it.');
      await cine.captionShow('Click, then click again to confirm. The flag shows it is saving until the ' +
        'answer comes back &mdash; a second or two.');
      await cine.pause(2600);
      await pressTwice(cine, page, '.dash-table tr', 'Lucy Sands', '.pill.flag');
      await cine.pause(3200);
      await cine.captionHide();
      await ring(cine, page, '.dash-table tr', 'Lucy Sands',
        'It becomes a quiet grey <b>helped</b>. Her marks never change &mdash; only the flag goes quiet, ' +
        'so the tab shows what is still outstanding.', { child: '.pill.flag-done' });
      await tip(cine, page, '.dash-table tr', 'Ellie Hughes', { child: '.pill.flag-done' });
      await cine.caption('Hover over any grey flag and it remembers the day you dealt with it.');
      await cine.captionShow('It is never a one-way door: two clicks bring the colour back.');
      await cine.pause(2400);
      await pressTwice(cine, page, '.dash-table tr', 'Lucy Sands', '.pill.flag-done');
      await cine.pause(3200);
      await cine.captionHide();
      await cine.caption('And red only returns by itself if she works on the lesson again and gets stuck ' +
        'again.');
      await cine.captionShow('Her voice is acknowledged the same way: once you have listened and ' +
        'responded, <b>says not yet</b> becomes <b>heard</b>.');
      await cine.pause(2600);
      await pressTwice(cine, page, '.dash-table tr', 'Lucy Sands', '.pill.voice');
      await cine.pause(3200);
      await cine.captionHide();
      await ring(cine, page, '.dash-table tr', 'Lucy Sands',
        'Heard, and her ratings and comment stay exactly as she wrote them.', { child: '.pill.flag-done' });

      /* B15-B19: the strip, and the route from a flag to the help */
      await ring(cine, page, '.live-elsewhere', null,
        'This line watches every delivered lesson, not just the one on screen. Every pupil with a live red ' +
        'flag in another lesson is named here &mdash; so choosing a lesson can never hide a pupil who ' +
        'needs help.');
      /* The strip names FOUR pupils on this class, not one - three are still
         mid-Lesson-1 with a low warm-up, which is honest data and makes the
         line above read true. But it means "she" would have been ambiguous
         here, so this caption names Sophie (DFM 146a: every quotation says what
         it refers to). Reported to him as a wording change to the spec. */
      await ring(cine, page, '.live-elsewhere', null,
        'Sophie Magee is struggling in two of them, so both are named &mdash; and each one is a button. ' +
        'Dealing with one lesson never hides the other.');
      await clickAt(cine, page, '.live-elsewhere .strip-jump[data-lesson="3"]', null, { after: 400 });
      await cine.caption('Click a lesson and the whole tab jumps there &mdash; her flag, her marks and the ' +
        'misconception bars all in front of you, in the lesson the flag belongs to.');
      await page.waitForTimeout(2200);
      await tip(cine, page, '.dash-table tr', 'Sophie Magee', { child: '.pill.flag' });
      await cine.caption('Here is why she was named: one right out of three is under half.');
      await ring(cine, page, '.dash-table tr', 'Sophie Magee',
        'From flag to help in one route: the hover names the trouble&hellip;', { child: '.pill.flag' });
      await ring(cine, page, '.dash-table tr', 'Sophie Magee',
        '&hellip;the Q columns show which questions&hellip;', { child: 'td.lc-mark' });
      /* ONE question's block, not the whole panel: Lesson 3 asks three questions,
         so #live-mis-body is 565px tall and cannot share a 720px frame with a
         caption - the off-frame guard refused to draw it, correctly (DFM 121a).
         One block is also the better annotation: the caption is about which
         wrong answers were chosen, and here they are readable. */
      await ring(cine, page, '#live-mis-body .staff-row', null,
        '&hellip;and the misconception bars show which wrong answers were chosen &mdash; that is the thing ' +
        'to re-teach.', { side: 'above' });

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
      await cine.captionShow('Click any pupil&rsquo;s name and a menu appears &mdash; choose the team to ' +
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
