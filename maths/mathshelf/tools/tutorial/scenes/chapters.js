/* chapters.js — every chapter of the MathShelf tutorial, teacher's side and
   pupil's side, as scenes for record.js. The pupil chapters are built by a
   factory so the teacher film numbers them 3-8 and the pupils' own cut numbers
   them 1-6 (a chapter number is baked into its title card, so each cut records
   its own cards).

   NO VOICE. Chapter title cards, lower-third captions, gold rings on the real
   controls, a visible cursor doing the pressing, and every scroll shown.
   Register: the teacher captions are written for a colleague who has never
   opened this (full sentences, an example where it helps, where things are
   said each time it matters); the pupil captions are written for an eleven-
   year-old reading alone (short, one idea each, "choose" and "press", both
   gestures where one must be named).

   Source stays ASCII in text nodes where it can: &mdash; &rsquo; &rarr; in
   caption HTML; title cards are plain text (cinema refuses an entity there). */
'use strict';
const path = require('path');
const { dataUri } = require('../lib/cinema');
const F = require('../lib/film');

const CREST = dataUri(path.join(__dirname, '..', 'assets', 'crest-360.png'));
const DASH = '—';
const CLS = F.FILM_CLASS;              /* 10E-Maths */
const CLSQ = encodeURIComponent(CLS);
const PRACTICE = F.PRACTICE_CLASS;     /* 10B Maths (demo) */

/* ---------- state helpers (behind the curtain, never filmed) ---------- */
async function classExists(page, name) {
  return page.evaluate((nm) => window.GJ.app.call('admin', { passcode: 'demo', sub: 'classes' })
    .then(r => !!((r && r.classes) || []).find(c => c.name === nm)), name);
}
async function dropClass(page, name) {
  if (await classExists(page, name)) {
    await page.evaluate((nm) => window.GJ.app.call('admin', { passcode: 'demo', sub: 'deleteClass', className: nm }), name);
    await F.sleep(300);
  }
}
/* the film's class as the teacher leaves it at the end of chapter 2: Angles,
   Averages and Quartiles on; Algebra and Collecting off */
async function ensureFilmClass(page) {
  if (!(await classExists(page, CLS))) {
    await page.evaluate((nm) => window.GJ.app.call('admin', { passcode: 'demo', sub: 'addClass', className: nm }), CLS);
    await F.sleep(300);
  }
  await page.evaluate((nm) => window.GJ.app.call('admin', { passcode: 'demo', sub: 'setActs', className: nm,
    acts: { angles: true, algebra: false, 'stats-collect': false, 'stats-averages': true, 'stats-quartiles': true } }), CLS);
  await F.sleep(300);
}

/* the pupil, at her book's exercise */
async function pupilAt(page, book, exIdx, fresh) {
  await F.boot(page, '?class=' + CLSQ + '&nointro');
  await F.namePupil(page);
  if (fresh) await F.resetPupilBook(page, CLS, book);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await F.sleep(1200);
  await page.evaluate((live) => { window.GJ.app.boot.baseUrl = live; }, F.LIVE);
  await F.pupilIn(page);
  await page.evaluate((b) => document.querySelector('.book[data-book="' + b + '"]').click(), book);
  await F.sleep(2000);
  if (exIdx != null) {
    await page.evaluate((i) => document.querySelectorAll('#act-contents button')[i].click(), exIdx);
    await F.sleep(2000);
  }
  await F.slowSaves(page, 3200);
}
const Q = (qid) => '[data-surface="question"][data-qid="' + qid + '"]';
async function toQuestion(page, qid) {
  await F.scrollIntoFrame(page, Q(qid), null, 'start');
}
/* the marks and comment land one line at a time */
async function waitMarked(page, qid) {
  await page.waitForFunction((s) => {
    const r = document.querySelector(s);
    const st = r && r.getAttribute('data-state');
    return st && /checked/.test(st);
  }, Q(qid), { timeout: 15000 }).catch(() => {});
  await F.sleep(1800);
}

/* ====================================================================
   TEACHER'S SIDE
   ==================================================================== */

const opening = {
  id: 'ch0', label: 'Opening', tailMs: 200,
  run: async ({ page, cine }) => {
    await F.boot(page, '?nointro');
    await cine.install();
    await cine.curtain({
      crest: CREST, kicker: F.KICKER,
      title: 'A Guide to MathShelf',
      sub: 'The teacher’s side, the pupil’s side, and the markbook.\nFilmed on a practice class of made-up pupils.'
    });
    cine.mark('lift');
    await cine.pause(5200);
    cine.mark('down');
    await cine.pause(400);
  }
};

/* ---------- Chapter 1: the door ---------- */
const ch1 = {
  id: 'ch1', label: 'Opening the markbook',
  run: async ({ page, cine }) => {
    await F.boot(page, '?nointro');
    await F.chapterOpen(cine, CREST, 1, 'Opening the markbook', 'the one link, and the staff passcode');
    await cine.lift();
    await cine.ensureCursor(640, 640);

    await cine.caption('MathShelf has <b>one address</b>. Pupils open it from their class link; you open the same address to reach the markbook.');
    await F.ring(cine, page, '#cover-welcome', null,
      'The page knows who you are from your school Google account, so there is <b>nothing to sign in to</b>.', { side: 'below' });
    await F.ring(cine, page, '#cover-staff', null,
      'Staff use this small <b>Staff</b> link at the bottom of the page.', { side: 'above' });
    await F.clickAt(cine, page, '#cover-staff', null, { after: 900 });
    await F.ring(cine, page, '#cover-staffbox', null,
      'A box appears for the <b>staff passcode</b>. The department has one passcode; the Head of Department gives it out.', { side: 'below' });
    await F.typeInto(cine, page, '#cover-pass', 'demo', { delay: 160 });
    await cine.caption('Type the passcode, then press <b>Open the markbook</b>.');
    await F.clickAt(cine, page, '#cover-open', null, { after: 2200 });
    await cine.caption('The markbook opens on <b>Set-up</b>. The markbook closes itself after fifteen minutes away, so you may be asked for the passcode again.');
    await F.chapterClose(cine);
  }
};

/* ---------- Chapter 2: Set-up ---------- */
const ch2 = {
  id: 'ch2', label: 'Set-up: classes, links and books',
  run: async ({ page, cine }) => {
    await F.boot(page, '?nointro');
    await F.staffIn(page);
    await dropClass(page, CLS);                 /* a clean take, every time */
    await page.reload({ waitUntil: 'domcontentloaded' });
    await F.sleep(1200);
    await page.evaluate((live) => { window.GJ.app.boot.baseUrl = live; }, F.LIVE);
    await F.staffIn(page);
    await F.chapterOpen(cine, CREST, 2, 'Set-up', 'classes, links and books');
    await cine.lift();
    await cine.ensureCursor(640, 660);

    await F.ring(cine, page, '.staff-main .ui-msg', null,
      '<b>Set-up</b> is where you add a class and choose the books on its shelf. This line at the top says whose classes you are looking at.', { side: 'below' });
    await cine.caption('Each class is one row of the table. The columns are the class name, how many pupils have opened it, the books on its shelf, and what you can do.');
    await F.ring(cine, page, '.ledger thead th', 'Books on the shelf',
      'Under <b>Books on the shelf</b> every book has a tick box. A ticked book is on that class&rsquo;s shelf; an unticked book is closed for that class and does not appear at all.', { side: 'below' });

    await cine.caption('To add a class, type a name your pupils will recognise &mdash; for example the class code you already use &mdash; and press <b>Add a class</b>.');
    await F.typeInto(cine, page, '#st-newclass', CLS, { delay: 110 });
    await F.clickAt(cine, page, '#st-add', null, { after: 1800 });
    await F.ring(cine, page, '#st-cmsg', null,
      'The class is added. Angles and Algebra start ticked on; the three Handling Data books start <b>off</b>, so you choose which ones this class gets.', { side: 'below' });

    await F.scrollIntoFrame(page, '#st-rows tr', CLS, 'start');
    await F.ring(cine, page, '#st-rows tr', CLS,
      'Here is the new row. Tick a Handling Data book to put it on this class&rsquo;s shelf.', { side: 'below', child: '.ticks-series', noScroll: true });
    await F.clickAt(cine, page, '#st-rows tr', CLS, { child: '.ticks-group:nth-of-type(1) .tickbox:nth-of-type(2) input', noScroll: true, after: 600 });
    await cine.caption('A gold card says <b>Saving changes&hellip;</b> while it saves, then a line confirms which book is now on which shelf.', { hold: 4200 });
    await F.clickAt(cine, page, '#st-rows tr', CLS, { child: '.ticks-group:nth-of-type(1) .tickbox:nth-of-type(3) input', noScroll: true, after: 2600 });
    await cine.caption('Unticking works the same way. Untick <b>Algebra</b> and it leaves this class&rsquo;s shelf the next time a pupil opens the page.');
    await F.clickAt(cine, page, '#st-rows tr', CLS, { child: '.ticks-group:nth-of-type(2) .tickbox:nth-of-type(2) input', noScroll: true, after: 2600 });

    await F.ring(cine, page, '#st-rows tr', CLS,
      '<b>Copy link</b> copies this class&rsquo;s own address. Post it on the class&rsquo;s Google Classroom, or put it wherever pupils find links. It brings each pupil straight to this class&rsquo;s shelf.',
      { side: 'above', child: '.row-acts-more button:nth-of-type(1)', noScroll: true });
    await F.clickAt(cine, page, '#st-rows tr', CLS, { child: '.row-acts-more button:nth-of-type(1)', noScroll: true, after: 1200 });
    await F.ring(cine, page, '#st-rows tr', CLS,
      '<b>QR</b> shows the same link as a code, for the board or a printed sheet.', { side: 'above', child: '.row-acts-more button:nth-of-type(2)', noScroll: true });
    await F.clickAt(cine, page, '#st-rows tr', CLS, { child: '.row-acts-more button:nth-of-type(2)', noScroll: true, after: 1400 });
    await cine.caption('Pupils point a phone or tablet camera at the code and the class opens. The address is printed under it in case anybody needs to type it.', { hold: 5200 });
    await page.evaluate(() => { const x = document.getElementById('st-qr-close'); if (x) x.click(); });
    await cine.pause(800);
    await F.ring(cine, page, '#st-rows tr', CLS,
      'The <b>&times;</b> deletes a class and all its work. It asks you to confirm first.', { side: 'above', child: '.row-acts-more button:nth-of-type(3)', noScroll: true });
    await F.ring(cine, page, '#st-rows tr', CLS,
      '<b>Open the markbook</b> shows this class&rsquo;s work. The last chapter of this film comes back to it, once the pupils have done some.', { side: 'above', child: '.row-acts-main button', noScroll: true });
    await F.chapterClose(cine);
  }
};

/* ====================================================================
   PUPIL'S SIDE  (a factory: n0 = the number of the first pupil chapter)
   ==================================================================== */
function pupilChapters(n0) {
  const N = (k) => n0 + k;

  /* ---------- the shelf ---------- */
  const shelf = {
    id: 'p-shelf', label: 'Opening your books',
    run: async ({ page, cine }) => {
      await F.boot(page, '?nointro');
      await ensureFilmClass(page);
      await F.boot(page, '?class=' + CLSQ + '&nointro');
      await F.namePupil(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await F.sleep(1200);
      await page.evaluate((live) => { window.GJ.app.boot.baseUrl = live; }, F.LIVE);
      await F.chapterOpen(cine, CREST, N(0), 'Opening your books', 'the class link, the cover and the shelf');
      await cine.lift();
      await cine.ensureCursor(640, 660);

      await cine.caption('Open the <b>class link</b> your teacher gave you. This is the first page you see.');
      await F.ring(cine, page, '#cover-welcome', null,
        'It already knows your name from your school account. Check it is you, then press <b>Open your books</b>.', { side: 'below' });
      await F.clickAt(cine, page, '#cover-open', null, { after: 2200 });
      await cine.caption('This is your <b>shelf</b>. Every book here is one your teacher has switched on for your class.');
      await F.ring(cine, page, '#shelf-tiles', null,
        'A book you cannot see is not switched on yet. Your teacher can add more during the year.', { side: 'above' });
      await F.ring(cine, page, '.book', 'Averages',
        'To open a book, <b>choose it</b> &mdash; tap it on a phone or tablet, or click it with a mouse.', { side: 'above' });
      await F.clickAt(cine, page, '.book', 'Averages', { after: 2400 });
      await cine.caption('A book opens on its list of <b>exercises</b>, across the top. Choose an exercise to go to it.');
      await F.ring(cine, page, '#act-contents', null,
        'Do them in order. Each exercise starts with a short worked example, then its questions.', { side: 'below' });
      await F.ring(cine, page, '#act-back', null,
        '<b>The shelf</b> takes you back to your books at any time. Your work is kept.', { side: 'below' });
      await F.chapterClose(cine);
    }
  };

  /* ---------- the worked example and the number pad ---------- */
  const pad = {
    id: 'p-pad', label: 'The worked example and the number pad',
    run: async ({ page, cine }) => {
      await pupilAt(page, 'stats-averages', 0, true);
      await F.chapterOpen(cine, CREST, N(1), 'The worked example and the number pad', 'watch the method, then answer');
      await cine.lift();
      await cine.ensureCursor(640, 660);

      await F.scrollIntoFrame(page, '.movie, [data-surface="movie"]', null, 'center');
      await F.ring(cine, page, '.movie, [data-surface="movie"]', null,
        'Every exercise starts with a <b>worked example</b>. It plays like a short film: the method is drawn on the paper, one step at a time.', { side: 'above', noScroll: true });
      await F.clickAt(cine, page, '.movie .btn-stamp, [data-surface="movie"] .btn-stamp', 'Play', { noScroll: true, after: 9000 });
      await cine.caption('Press <b>Play</b> and it runs on its own. The arrows step forwards or back, so you can see any step again.');
      await page.evaluate(() => { const m = document.querySelector('.movie, [data-surface="movie"]'); const b = m && [...m.querySelectorAll('button')].find(x => /pause/i.test(x.textContent)); if (b) b.click(); });
      await cine.pause(400);

      await toQuestion(page, 'q1');
      await cine.caption('Now the first question. Read the whole question first &mdash; it says what to find and how many marks it carries.');
      await F.ring(cine, page, Q('q1') + ' .stat-msg', null,
        'This line, in the orange bar, always tells you <b>what to do next</b>.', { side: 'below', noScroll: true });
      await F.ring(cine, page, Q('q1') + ' .stat-slots', null,
        'There is one box for each answer. Choose a box to start.', { side: 'below', noScroll: true });
      await F.clickAt(cine, page, Q('q1') + ' .stat-cell', null, { noScroll: true, after: 900 });
      await F.scrollIntoFrame(page, Q('q1') + ' .numpad', null, 'center');
      await F.ring(cine, page, Q('q1') + ' .numpad', null,
        'A <b>number pad</b> opens under the question. Press the numbers you want; they appear in the box you chose.', { side: 'above', noScroll: true });
      await F.padType(cine, page, Q('q1'), '6');
      await F.ring(cine, page, Q('q1') + ' button', 'next',
        '<b>next &darr;</b> moves you to the next box. The pad stays open until every box is filled.', { side: 'above', noScroll: true });
      await F.padNext(cine, page, Q('q1'));
      await F.padType(cine, page, Q('q1'), '5'); await F.padNext(cine, page, Q('q1'));
      await F.padType(cine, page, Q('q1'), '4'); await F.padNext(cine, page, Q('q1'));
      await F.padType(cine, page, Q('q1'), '9');
      await cine.caption('Made a slip? Choose any box again and the pad opens on it. <b>&#9003;</b> rubs out the last number.');
      await F.scrollIntoFrame(page, Q('q1') + ' .btn-stamp', null, 'center');
      await F.ring(cine, page, Q('q1') + ' .btn-stamp', null,
        'When every box is in, press <b>Mark my answers</b>.', { side: 'above', noScroll: true });
      await F.clickAt(cine, page, Q('q1') + ' .btn-stamp', null, { noScroll: true, after: 600 });
      await waitMarked(page, 'q1');
      await F.scrollIntoFrame(page, Q('q1') + ' .stat-slots', null, 'center');
      await cine.caption('Your work is marked at once. A <b>green tick</b> is right. Under it, a comment says how it went.');

      /* a wrong attempt, so the second go is understood */
      await toQuestion(page, 'q2');
      await cine.caption('Question 2. This time one answer is going to be wrong on purpose, so you can see what happens.');
      await F.clickAt(cine, page, Q('q2') + ' .stat-cell', null, { noScroll: true, after: 700 });
      await F.scrollIntoFrame(page, Q('q2') + ' .numpad', null, 'center');
      await F.padType(cine, page, Q('q2'), '9'); await F.padNext(cine, page, Q('q2'));
      await F.padType(cine, page, Q('q2'), '7'); await F.padNext(cine, page, Q('q2'));
      await F.padType(cine, page, Q('q2'), '7'); await F.padNext(cine, page, Q('q2'));
      await F.padType(cine, page, Q('q2'), '18');
      await F.clickAt(cine, page, Q('q2') + ' .btn-stamp', null, { block: 'center', after: 600 });
      await waitMarked(page, 'q2');
      await F.scrollIntoFrame(page, Q('q2') + ' .stat-slots', null, 'center');
      await F.ring(cine, page, Q('q2') + ' .stat-msg', null,
        'A <b>red cross</b> means not right yet. You get <b>one more attempt</b>: your first go stays above, and a fresh set of boxes opens under it.', { side: 'below', noScroll: true });
      await cine.caption('Put your answers in again &mdash; the right ones as well &mdash; then press <b>Mark my answers</b>. The second mark is the one that counts.');
      await F.clickAt(cine, page, Q('q2') + ' .stat-cell', null, { block: 'center', after: 700 });
      await F.scrollIntoFrame(page, Q('q2') + ' .numpad', null, 'center');
      await F.padType(cine, page, Q('q2'), '9'); await F.padNext(cine, page, Q('q2'));
      await F.padType(cine, page, Q('q2'), '7'); await F.padNext(cine, page, Q('q2'));
      await F.padType(cine, page, Q('q2'), '7'); await F.padNext(cine, page, Q('q2'));
      await F.padType(cine, page, Q('q2'), '19');
      await F.clickAt(cine, page, Q('q2') + ' .btn-stamp', null, { block: 'center', after: 600 });
      await waitMarked(page, 'q2');
      await F.scrollIntoFrame(page, Q('q2') + ' .stat-slots', null, 'center');
      await cine.caption('After the second attempt, the right answers are written underneath in pencil, so you can see where the slip was.');
      await F.chapterClose(cine);
    }
  };

  /* ---------- a table to fill in ---------- */
  const table = {
    id: 'p-table', label: 'Filling in a table',
    run: async ({ page, cine }) => {
      await pupilAt(page, 'stats-averages', 2, true);
      await F.chapterOpen(cine, CREST, N(2), 'Filling in a table', 'the stages, the columns and the totals');
      await cine.lift();
      await cine.ensureCursor(640, 660);
      await toQuestion(page, 'q17');
      await F.ring(cine, page, Q('q17') + ' .stage-strip', null,
        'A longer question has <b>stages</b>. The pills show them in order; the filled one is the stage you are on.', { side: 'below' });
      await F.ring(cine, page, Q('q17') + ' .stat-msg', null,
        'The instruction says exactly what this stage wants: fill in the <b>f &times; x</b> column &mdash; each row&rsquo;s frequency times its number &mdash; from the top row down.', { side: 'below' });
      await F.ring(cine, page, Q('q17') + ' button.stat-cell[data-col="fx"][data-row="0"]', null,
        'The dotted boxes are yours to fill. The printed numbers are given. Work down one column, then the next.', { side: 'above' });
      await F.clickAt(cine, page, Q('q17') + ' button.stat-cell[data-col="fx"][data-row="0"]', null, { noScroll: true, after: 800 });
      await F.scrollIntoFrame(page, Q('q17') + ' .numpad', null, 'center');
      await cine.caption('The pad opens under the table. Each <b>f &times; x</b> is the frequency times the number of cats: 6 &times; 0, 13 &times; 1, and so on.');
      const fx = ['0', '13', '14', '9', '4'];
      for (let i = 0; i < fx.length; i++) {
        await F.padType(cine, page, Q('q17'), fx[i]);
        await F.padNext(cine, page, Q('q17'));
      }
      await F.scrollIntoFrame(page, Q('q17') + ' .stage-strip', null, 'center');
      await F.ring(cine, page, Q('q17') + ' .stat-msg', null,
        'When the column is full, the instruction moves on to the <b>totals row</b> by itself.', { side: 'below', noScroll: true });
      await F.scrollIntoFrame(page, Q('q17') + ' .numpad', null, 'center');
      await F.padType(cine, page, Q('q17'), '30'); await F.padNext(cine, page, Q('q17'));
      await F.padType(cine, page, Q('q17'), '40'); await F.padNext(cine, page, Q('q17'));
      await F.scrollIntoFrame(page, Q('q17') + ' .stage-strip', null, 'center');
      await F.ring(cine, page, Q('q17') + ' .stage-strip', null,
        'The second pill lights up. It is called <b>The answers</b>: the questions under the table, which are asked last.', { side: 'below', noScroll: true });
      await F.scrollIntoFrame(page, Q('q17') + ' .numpad', null, 'center');
      await cine.caption('The mean is the f &times; x total divided by the frequency total: 40 &divide; 30 = 1.33. The <b>.</b> key on the pad types a decimal point.');
      await F.padType(cine, page, Q('q17'), '1.33');
      await F.clickAt(cine, page, Q('q17') + ' .btn-stamp', null, { block: 'center', after: 600 });
      await waitMarked(page, 'q17');
      await F.scrollIntoFrame(page, Q('q17') + ' .stat-tablekind', null, 'center');
      await cine.caption('Every box is marked. If one cell is wrong, but your total is the correct sum of the column you wrote, the total gets a <b>hollow tick</b>: you are not marked down twice for one slip.');
      await F.chapterClose(cine);
    }
  };

  /* ---------- choosing a row; deciding a statement ---------- */
  const choose = {
    id: 'p-choose', label: 'Choosing a row, deciding a statement',
    run: async ({ page, cine }) => {
      await pupilAt(page, 'stats-averages', 3, true);
      await F.chapterOpen(cine, CREST, N(3), 'Choosing a row, deciding a statement', 'answers you choose instead of type');
      await cine.lift();
      await cine.ensureCursor(640, 660);
      await toQuestion(page, 'q20');
      await cine.caption('Some answers are chosen, not typed. This grouped table asks for the <b>modal class</b> and the <b>class containing the median</b>. Here a class is a group of the table, like 1&ndash;5.');
      /* fill the table quickly first, so the row asks are the point of the beat */
      await F.clickAt(cine, page, Q('q20') + ' button.stat-cell[data-col="mid"][data-row="0"]', null, { noScroll: true, after: 600 });
      await F.scrollIntoFrame(page, Q('q20') + ' .numpad', null, 'center');
      await cine.captionShow('Fill in the table the same way as before, starting with the midpoints, then f &times; x, then the totals.');
      for (const v of ['3', '8', '13', '18', '23']) { await F.padType(cine, page, Q('q20'), v); await F.padNext(cine, page, Q('q20')); }
      for (const v of ['18', '40', '52', '36', '69']) { await F.padType(cine, page, Q('q20'), v); await F.padNext(cine, page, Q('q20')); }
      for (const v of ['20', '215']) { await F.padType(cine, page, Q('q20'), v); await F.padNext(cine, page, Q('q20')); }
      await F.padType(cine, page, Q('q20'), '10.75');
      await cine.captionHide();
      await F.scrollIntoFrame(page, Q('q20') + ' .stat-rowpicks', null, 'center');
      await F.ring(cine, page, Q('q20') + ' .stat-rowpicks', null,
        'Under <b>Modal class</b> the rows of the table are offered as buttons. Choose the one you mean.', { side: 'above', noScroll: true });
      await F.clickAt(cine, page, Q('q20') + ' .stat-rowpick', null, { noScroll: true, after: 900 });
      await cine.caption('A chosen row turns copper. Choose it again to clear it. Only one row can be lit for each question.');
      await F.clickAt(cine, page, Q('q20') + ' [data-ask="medianClass"][data-row="1"]', null, { noScroll: true, after: 900 });
      await F.clickAt(cine, page, Q('q20') + ' .btn-stamp', null, { block: 'center', after: 600 });
      await waitMarked(page, 'q20');
      await cine.caption('Then press <b>Mark my table and answers</b>, as before.');

      /* the judge */
      await page.evaluate(() => document.querySelectorAll('#act-contents button')[4].click());
      await F.sleep(2000);
      await toQuestion(page, 'q28');
      await cine.caption('Exercise 5 gives you statements to judge. Read the table first &mdash; every statement is about it.');
      await F.scrollIntoFrame(page, Q('q28') + ' [data-tray]', null, 'center');
      await F.ring(cine, page, Q('q28') + ' [data-tray]', null,
        'Under each statement are three answers: <b>True</b>, <b>False</b>, or <b>Not enough information</b>. Choose one for every statement.', { side: 'above', noScroll: true });
      await cine.caption('<b>Not enough information</b> is a real answer, not a way out. A grouped table cannot tell you one exact value inside a group.');
      const picks = [['False'], ['Not enough information'], ['False'], ['True'], ['False']];
      for (let i = 0; i < picks.length; i++) {
        const sel = Q('q28') + ' [data-tray^="judge-' + i + '-"]';
        await F.scrollIntoFrame(page, sel, null, 'center');
        const r = await F.rect(page, sel, null);
        void r;
        await F.clickAt(cine, page, sel + ' [data-tray-item]', '^' + picks[i][0] + '$', { noScroll: true, after: 500 });
      }
      await F.clickAt(cine, page, Q('q28') + ' .btn-stamp', null, { block: 'center', after: 600 });
      await waitMarked(page, 'q28');
      await cine.caption('Press <b>Mark my answers</b> and each statement is marked on its own.');
      await F.chapterClose(cine);
    }
  };

  /* ---------- graphs ---------- */
  const graph = {
    id: 'p-graph', label: 'Graphs: plotting, scrolling and the rule',
    run: async ({ page, cine }) => {
      await pupilAt(page, 'stats-quartiles', 2, true);
      await F.chapterOpen(cine, CREST, N(4), 'Graphs', 'plotting points, scrolling, and moving the rule');
      await cine.lift();
      await cine.ensureCursor(640, 660);
      await toQuestion(page, 'q12');
      await F.ring(cine, page, Q('q12') + ' .stage-strip', null,
        'Drawing a cumulative frequency graph &mdash; a graph of the running total &mdash; has two stages: <b>plot the points</b>, then <b>join the points</b>.', { side: 'below' });
      await F.ring(cine, page, Q('q12') + ' .stat-msg', null,
        'The instruction names the next point for you: how far <b>across</b>, how far <b>up</b>.', { side: 'below' });
      await cine.caption('The grid is tall &mdash; one small square for every unit &mdash; so you will <b>scroll down and up</b> as you plot. Scroll the page as you normally do.');
      const pts = [[0, 0], [5, 18], [10, 48], [15, 80], [20, 95], [25, 100]];
      let first = true;
      for (const [x, y] of pts) {
        const c = await F.boardClient(page, Q('q12'), x, y);
        if (!c) throw new Error('no board for q12');
        await F.scrollPointIntoFrame(page, c.pageY);
        const c2 = await F.boardClient(page, Q('q12'), x, y);
        if (first) {
          await cine.captionShow('To place a point, <b>choose the spot</b> on the grid: tap it, or click it. The first point is across 0, up 0.');
          first = false;
        }
        await cine.click(c2.x, c2.y, { after: 700 });
        if (x === 5) { await cine.captionHide(); await cine.caption('The next one: across 5, up 18. The instruction line at the top has already moved on to the point after that.'); }
      }
      await cine.caption('If a point lands in the wrong place, choose it again to lift it off, and put it where it belongs.');
      await F.scrollIntoFrame(page, Q('q12') + ' .stat-join', null, 'center');
      await F.ring(cine, page, Q('q12') + ' .stat-join', null,
        'With every point placed, the button <b>&#10003; Join the points</b> sits under the graph. Press it and the curve is drawn through your points.', { side: 'above', noScroll: true });
      await F.clickAt(cine, page, Q('q12') + ' .stat-join', null, { noScroll: true, after: 1600 });
      await F.clickAt(cine, page, Q('q12') + ' .btn-stamp', null, { block: 'center', after: 600 });
      await waitMarked(page, 'q12');
      await cine.caption('Then press <b>Mark my points and curve</b>.');

      /* the rule */
      await page.evaluate(() => document.querySelectorAll('#act-contents button')[3].click());
      await F.sleep(2000);
      await toQuestion(page, 'q15');
      await cine.caption('Reading a graph uses the <b>rule</b>: a line that crosses the graph. You move it to the height you need and read where it meets the curve.');
      await F.scrollIntoFrame(page, Q('q15') + ' .nudge-pad', null, 'center');
      await F.ring(cine, page, Q('q15') + ' .nudge-pad', null,
        'The arrows under the graph move the rule <b>one square at a time</b>. You can also drag the rule with a finger or the mouse.', { side: 'above', noScroll: true });
      await cine.captionShow('The median &mdash; the middle value &mdash; of 112 candidates is at 56 on the frequency axis: 28 squares up.');
      for (let i = 0; i < 28; i++) {
        await F.clickAt(cine, page, Q('q15') + ' .nudge-pad button', '▲', { noScroll: true, ms: 220, settle: 90, after: 110 });
      }
      await cine.captionHide();
      await F.scrollIntoFrame(page, Q('q15') + ' .stat-board-host', null, 'center');
      await cine.caption('The rule now sits at 56, and a line drops to the mark axis where it meets the curve. That reading is the median.');
      await F.scrollIntoFrame(page, Q('q15') + ' .btn-stage', null, 'center');
      await F.ring(cine, page, Q('q15') + ' .btn-stage', null,
        'Press <b>&#10003; That&rsquo;s my median</b> to keep the reading. The next stage then opens.', { side: 'above', noScroll: true });
      await F.clickAt(cine, page, Q('q15') + ' .btn-stage', null, { noScroll: true, after: 1400 });
      await cine.caption('Each stage works the same way: move the rule, then press the button that keeps your reading. At the end, press <b>Mark my readings</b>.');
      await F.chapterClose(cine);
    }
  };

  /* ---------- saving ---------- */
  const saving = {
    id: 'p-saving', label: 'Your work is saved',
    run: async ({ page, cine }) => {
      await pupilAt(page, 'stats-averages', 1, true);
      await F.slowSaves(page, 9000);           /* long enough for the ring and its label to be read */
      await F.chapterOpen(cine, CREST, N(5), 'Your work is saved', 'how to tell, and what to do if it is slow');
      await cine.lift();
      await cine.ensureCursor(640, 660);
      await toQuestion(page, 'q8');
      await cine.caption('Your work saves by itself every time you press a <b>Mark</b> button. There is nothing to press to save it.');
      await F.clickAt(cine, page, Q('q8') + ' .stat-cell', null, { noScroll: true, after: 700 });
      await F.scrollIntoFrame(page, Q('q8') + ' .numpad', null, 'center');
      await F.padType(cine, page, Q('q8'), '16'); await F.padNext(cine, page, Q('q8'));
      await F.padType(cine, page, Q('q8'), '7');
      await F.clickAt(cine, page, Q('q8') + ' .btn-stamp', null, { block: 'center', after: 200 });
      /* the save is sent a moment after the mark; wait for its line, then show it */
      await page.waitForFunction(() => !!document.getElementById('act-saving'), null, { timeout: 8000 }).catch(() => {});
      await F.scrollTop(page);
      await F.ring(cine, page, '#act-saving', null,
        'Watch under the book&rsquo;s title: a quiet <b>Saving&hellip;</b> line moves while your work goes to the school&rsquo;s store, and disappears when it has landed.', { side: 'below', noScroll: true, hold: 5200 });
      await cine.caption('It takes a few seconds. You can carry on with the next question while it saves.');
      await cine.caption('If the store is slow, a card says <b>Still saving your work&hellip;</b> Your work is safe on this device and is sent again by itself. You only need <b>Try again</b> if the card stays for a long time.');
      await F.clickAt(cine, page, '#act-back', null, { after: 2000 });
      await F.ring(cine, page, '.book', 'Averages',
        'Back on the shelf, each book shows your <b>marks so far</b> and how many questions you have answered.', { side: 'above' });
      await F.clickAt(cine, page, '.book', 'Averages', { after: 2400 });
      await page.evaluate(() => document.querySelectorAll('#act-contents button')[1].click());
      await F.sleep(2000);
      await toQuestion(page, 'q8');
      await cine.caption('Open the book again and your marked work is still there &mdash; even if you close the tab, or come back tomorrow on a different device.');
      await F.chapterClose(cine);
    }
  };

  return { shelf, pad, table, choose, graph, saving };
}

/* ====================================================================
   TEACHER'S SIDE, again: reading the class's work
   ==================================================================== */
const ch9 = {
  id: 'ch9', label: 'Reading the class’s work',
  run: async ({ page, cine }) => {
    await F.boot(page, '?nointro');
    await F.staffIn(page);
    /* the practice class: twelve made-up pupils, part-way through the year */
    await page.evaluate((nm) => { const rows = [...document.querySelectorAll('#st-rows tr')]; const r = rows.find(tr => tr.textContent.indexOf(nm) > -1); const b = r && [...r.querySelectorAll('button')].find(b => /Open the markbook/.test(b.textContent)); if (b) b.click(); }, PRACTICE);
    await F.sleep(2800);
    await F.chapterOpen(cine, CREST, 9, 'Reading the class’s work', 'the class page, a pupil’s book, and your own marks');
    await cine.lift();
    await cine.ensureCursor(640, 660);

    await cine.caption('Back in Set-up, <b>Open the markbook</b> on a class shows its work. This is a practice class of twelve made-up pupils, part-way through the year.');
    await F.ring(cine, page, '.cp-books', null,
      'The markbook shows one <b>book</b> at a time. These tabs switch between the books on the class&rsquo;s shelf.', { side: 'below' });
    await F.clickAt(cine, page, '.cp-books .toolbtn', 'Averages', { after: 2600 });
    await F.ring(cine, page, '.cp-strip', null,
      'Three counts show how many pupils are in the class, how many have <b>started</b> this book, and how many have <b>finished</b> it.', { side: 'below' });
    await F.ring(cine, page, '.needs', null,
      '<b>Needs you now</b> lists the pupils the marking says are stuck: wrong twice on a question, or stuck for a while. Each line names the book, exercise and question.', { side: 'above' });
    await F.scrollIntoFrame(page, '.excards', null, 'start');
    await F.ring(cine, page, '.excard', null,
      'Each <b>exercise</b> has one card, showing its learning objective, how the class is doing, and the most common slip. Choose a card to see that exercise question by question.', { side: 'below', noScroll: true });
    await F.clickAt(cine, page, '.excard', null, { noScroll: true, after: 2600 });
    /* the grid is taller than the frame: bring its top row in and ring that */
    const gr = await F.rect(page, '.grid.staff-panel');
    const gy = await page.evaluate(() => window.scrollY);
    await F.scrollWindowTo(page, Math.max(0, gr.y + gy - 150));
    await F.ring(cine, page, '.grid.staff-panel tr', null,
      'Each row is one pupil; each column is one question. Green is right; red is wrong; amber means the answer was right but no working was shown.', { side: 'above', hold: 7000, noScroll: true });
    await cine.caption('The key under the table explains every symbol. Look for the reds, then open a cell to read that pupil&rsquo;s book.');
    await F.clickAt(cine, page, '.grid.staff-panel td.cell', null, { after: 2800 });
    await F.scrollTop(page);
    await cine.caption('This is the pupil&rsquo;s own book, exactly as the pupil sees it, with the marks the app gave.');
    await F.ring(cine, page, '.jp-posture', null,
      'Every mark here is the app&rsquo;s. Tap or click a mark to change it to yours: <b>&#10003; mine</b>, <b>&#10007; mine</b>, or back to the app&rsquo;s. Your mark is the one pupils and staff then see.', { side: 'above' });
    await F.ring(cine, page, '.jp-reteach', null,
      '<b>Show them this method again</b> sends the exercise&rsquo;s worked example to this pupil. It is offered the next time they open the book.', { side: 'above' });
    await F.scrollTop(page);
    await F.ring(cine, page, '.staff-crumb', null,
      'The trail at the top takes you back a step at a time: the exercise, the class page, Set-up.', { side: 'below', noScroll: true });
    await F.clickAt(cine, page, '.staff-crumb .crumb-link', PRACTICE.replace(/[()]/g, '\\$&'), { noScroll: true, after: 2600 });
    await F.scrollIntoFrame(page, '.toolrow', null, 'center');
    await F.ring(cine, page, '.toolrow .toolbtn', 'Full grid',
      '<b>Full grid</b> is the whole book at once: every pupil, every question, on one screen. It is good for a projector.', { side: 'above', noScroll: true });
    await F.ring(cine, page, '.toolrow .toolbtn', 'Slips',
      '<b>Slips and starter</b> ranks the class&rsquo;s most common mistakes, so you can open the next lesson with the one that matters most.', { side: 'above', noScroll: true });
    await F.ring(cine, page, '.toolrow .toolbtn', 'Download CSV',
      '<b>Download CSV</b> copies every pupil&rsquo;s marks, one row each, so you can paste them into a spreadsheet.', { side: 'above', noScroll: true });
    await F.scrollTop(page);
    await F.ring(cine, page, '.staff-right .toolbtn', 'Close',
      '<b>Close the markbook</b> when you leave a shared machine. It also closes itself after fifteen minutes.', { side: 'below', noScroll: true });
    await F.chapterClose(cine);
  }
};

const closing = {
  id: 'chEnd', label: 'Closing', tailMs: 200,
  run: async ({ page, cine }) => {
    await F.boot(page, '?nointro');
    await cine.install();
    await cine.curtain({
      crest: CREST, kicker: F.KICKER,
      title: 'You have seen the whole of MathShelf',
      sub: '1. Add a class.   2. Tick its books.   3. Share the link.\nPupils work; the markbook shows you what they did.'
    });
    cine.mark('lift');
    await cine.pause(5000);
    cine.mark('down');
    await cine.pause(400);
  }
};

/* the pupils' own opening and closing cards */
const pupilOpening = {
  id: 'p-open', label: 'Opening', tailMs: 200,
  run: async ({ page, cine }) => {
    await F.boot(page, '?nointro');
    await cine.install();
    await cine.curtain({
      crest: CREST, kicker: F.KICKER,
      title: 'How to use MathShelf',
      sub: 'Your books, and the work you do in them.'
    });
    cine.mark('lift');
    await cine.pause(4600);
    cine.mark('down');
    await cine.pause(400);
  }
};
const pupilClosing = {
  id: 'p-end', label: 'Closing', tailMs: 200,
  run: async ({ page, cine }) => {
    await F.boot(page, '?nointro');
    await cine.install();
    await cine.curtain({
      crest: CREST, kicker: F.KICKER,
      title: 'Read the line in the orange bar',
      sub: 'It always says what to do next.\nPress Mark when you are ready, and your work is saved.'
    });
    cine.mark('lift');
    await cine.pause(5000);
    cine.mark('down');
    await cine.pause(400);
  }
};

module.exports = { opening, ch1, ch2, pupilChapters, ch9, closing, pupilOpening, pupilClosing, ensureFilmClass };
