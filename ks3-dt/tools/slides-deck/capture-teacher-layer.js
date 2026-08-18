#!/usr/bin/env node
/* capture-teacher-layer.js — every picture the teacher layer shows, for
 * Lessons 2 to 5, taken on the real running app and PROVED at the shutter.
 *
 * ─── WHY IT WORKS THE WAY IT DOES ──────────────────────────────────────────
 * Lesson 1's captures shipped three slides carrying the WRONG SCREEN, eight
 * feet wide, in front of a class (DFM 225b). The cause was never carelessness
 * at the keyboard: the capture script carried its own second, dumber copy of
 * the walk, that copy could not perform a drag, and when its own arrival check
 * said "I never got there", the next line photographed whatever was on screen
 * and filed it under the name of a screen it had never reached.
 *
 * So this script does three things differently, and they are the whole design:
 *
 *   1. IT WALKS THE WAY sit-review WALKS. The detector and the moves come from
 *      `record-tutorial/lib/walk-moves.js` — the same file sit-review reads.
 *      There is no second copy to drift (DFM 144).
 *   2. IT NEVER NAVIGATES TO A PICTURE. It walks the lesson once, and every
 *      turn it asks which of the pictures it still owes are TRUE right now.
 *      A picture is taken because the app is standing on its screen, never
 *      because the script believes it ought to be.
 *   3. IT FAILS LOUDLY AND EMPTY-HANDED. A shot whose predicate never came
 *      true is reported by name at the end and the run exits non-zero. It does
 *      not fall back to "close enough", and nothing is ever written under a
 *      name it did not earn.
 *
 * Usage:
 *   node capture-teacher-layer.js --lesson j1-02 [--base http://localhost:8121]
 *   node capture-teacher-layer.js --all
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('../record-tutorial/node_modules/playwright');
const WALK = require('../record-tutorial/lib/walk-moves.js');
const { THEMES, frameShot, composeTrio, composeCredited, filmFrame } =
  require('./make-deck-art.js');
const { DECK_SHOTS, COMPOSED, BRIEF_SHOTS, REUSED } = require('./deck-shot-plan.js');

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8121');
const ALL = args.includes('--all');
const ONE = argOf('--lesson', '');
/* --all means every lesson this script has a shot plan for, DERIVED from the plan
   rather than typed. It used to be a hardcoded list of J1's four, which was true
   the day it was written and would have silently skipped both J2/J3 decks — the
   exact fault K23 refused to accept an excuse for ("a hardcoded list closes
   today's instance and nothing else"). A lesson with a plan is a lesson --all
   captures, because having a plan is what puts it on the list. */
const PLANNED = Array.from(new Set(
  [].concat(Object.keys(DECK_SHOTS), Object.keys(BRIEF_SHOTS), Object.keys(COMPOSED))
)).filter(id => id !== 'j1-01').sort();
const LESSONS = ALL ? PLANNED : (ONE ? [ONE] : []);
if (!LESSONS.length) {
  console.error('name a lesson: --lesson j2-01   (or --all for ' + PLANNED.join(', ') + ')');
  process.exit(2);
}

const ROOT = path.join(__dirname, '..', '..');
const PLATFORM = path.join(ROOT, 'platform');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CONTENT_VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'content', 'index.json'), 'utf8')).contentVersion;

/* ══════════════ WHICH YEAR A LESSON BELONGS TO, TAKEN FROM ITS ID ═══════════
   Three things in this file used to assume J1 and would each have failed
   differently on a J2 deck: the hub-tile number stripped a literal "j1-" prefix,
   the lesson JSON was read out of `content/j1/lessons`, and the preview pupil was
   always Demo-8A's Anya — who is in a J1 class, so the J2 lesson she was sent to
   open is not on her year map at all. All three now come from the id. */
const yearOf = id => (String(id).match(/^(j\d)-/) || [null, 'j1'])[1];
const numOf = id => String(Number(String(id).replace(/^j\d-0?/, '')));
/* the dummy class and the preview pupil per year — the same three sit-review and
   sit-wrongpath use, so a capture stands where the walkers stand (DFM 144) */
const CLASS_OF = { j1: 'Demo-8A', j2: 'Demo-9A', j3: 'Demo-10A' };
const WHO_OF = { j1: 'anya', j2: 'aoife', j3: 'orla' };
/* the second pupil, used for the brief pass — Cara's seeded J1 record is what
   gives Lesson 2-5's Do-Now real questions (DFM 134). J2/J3 Lesson 1 has no
   Do-Now at all, so their brief pass uses the year's own first pupil. */
const BRIEF_WHO_OF = { j1: 'cara', j2: 'aoife', j3: 'orla' };

/* the tallest a deck screenshot may be, height over width — see the shape
   guard at the shutter for why this number is 1.6 and not a guess */
const MAX_ASPECT = 1.6;

/* the studio each simulated pupil founds — plausible pupil work, and DIFFERENT
   per pupil, because two of them end up side by side on a projected marquee */
const STUDIOS = {
  anya: { studio: 'Golden Otter Games', title: 'Apple Catcher',
          how: 'Arrow keys move the bowl. Catch the apples — miss three and it ends.' },
  /* a CATCHING game, because the walk signs the Catch It contract for every
     pupil — a maze-sounding title under the marquee's "A CATCHING GAME" tag is
     a small lie, and it would be projected */
  sean: { studio: 'Bramble Row Studio', title: 'Comet Catch',
          how: 'Move the tray with the arrow keys. Catch the comets before they land.' },
  cara: { studio: 'Quickfire Quiz Co', title: 'True or False?',
          how: 'Read the claim, click T or F. Three rounds, no second guesses.' },
  erin: { studio: 'Paper Lantern Games', title: 'Lantern Drop',
          how: 'Move the lantern left and right. Catch the sparks before they land.' }
};

/* ══════════════════════ the freshness ratchet ═════════════════════════════
   A picture goes stale when the SCREEN IT SHOWS changes — not when an
   unrelated string elsewhere bumps the build number. Each row therefore
   fingerprints its own chunk, and the gate recomputes it. */
function lessonJson(lesson) {
  return JSON.parse(fs.readFileSync(
    path.join(ROOT, 'content', yearOf(lesson), 'lessons', lesson + '.json'), 'utf8'));
}
function chunkOf(lj, id) { return (lj.chunks || []).find(c => c.id === id) || null; }
function md5(s) { return crypto.createHash('md5').update(s).digest('hex'); }
function chunkHash(lj, id) {
  const c = chunkOf(lj, id);
  return c ? md5(JSON.stringify(c)).slice(0, 12) : null;
}
function chunkStrings(chunk) {
  const out = [];
  (function w(v) {
    if (typeof v === 'string') out.push(v.replace(/\s+/g, ' ').trim());
    else if (Array.isArray(v)) v.forEach(w);
    else if (v && typeof v === 'object') Object.keys(v).forEach(k => w(v[k]));
  })(chunk);
  return out;
}
/* THE ANCHOR — the longest line on the photographed card that is VERBATIM one
   of the declared chunk's own sentences. A picture of the wrong screen has no
   anchor, and the gate then demands a pinned expectation it does not have. */
function contentAnchor(lj, chunkId, lines) {
  const c = chunkOf(lj, chunkId);
  if (!c) return null;
  const own = chunkStrings(c);
  return lines
    .filter(l => l.length >= 20 && own.some(s => s === l || s.includes(l) || l.includes(s)))
    .sort((a, b) => b.length - a.length)[0] || null;
}

/* ══════════════════════════ failing loudly ════════════════════════════════ */
async function where(page) {
  try { return await page.evaluate(WALK.whereAmI); }
  catch (e) { return { chunk: '(page gone)', heading: '', text: e.message }; }
}
async function abort(page, msg) {
  const w = await where(page);
  console.error('');
  console.error('!! CAPTURE ABORTED — ' + msg);
  console.error('   the walk is actually standing on : ' + w.chunk);
  console.error('   the screen says                  : ' + w.heading);
  console.error('   card text                        : ' + w.text);
  console.error('');
  console.error('   NOTHING was photographed under a name it had not reached.');
  throw new Error('capture aborted: ' + msg);
}

/* ═══════════════════════ staging a preview pupil ══════════════════════════ */
async function pupil(ctx, who, lesson, fresh) {
  const cls = CLASS_OF[yearOf(lesson)];
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.error('   [page error] ' + m.text().slice(0, 140)); });
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=' + cls + '&as=' + who,
    { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  /* the preview "server" is localStorage, so two pupils must share ONE browser
     context — a second context is a second world and neither can see the
     other's queue entry. Only the FIRST pupil clears the store. */
  if (fresh !== false) {
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(1800);
  }
  await page.evaluate((cls) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {};
    db.locks[cls] = db.locks[cls] || {};
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks[cls][n] = { u: now, on: 1 };
    db.cfg[cls] = db.cfg[cls] || {};
    db.cfg[cls].pairing = { on: 0 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, cls);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  /* a studio identity per pupil, so Press Night's marquee lists two DIFFERENT
     studios rather than the same name twice (which reads, on a slide, as a
     pupil reviewing her own game) */
  await page.evaluate((id) => { window.__studioIdentity = id; }, STUDIOS[who] || STUDIOS.anya);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);
  const n = numOf(lesson);
  /* THE TILE IS FOUND BY ITS OWN TITLE FIRST, and the number is the fallback.
     "Lesson 1" appears on three year maps now, and the tile a J2 pupil is being
     sent to is not identified by a number that every year shares. The title
     comes out of the lesson JSON, so it can never drift from the tile. */
  const title = lessonJson(lesson).title || '';
  const opened = await page.evaluate((arg) => {
    const tiles = Array.from(document.querySelectorAll('.tile'));
    const byTitle = arg.title && tiles.find(e => (e.textContent || '').indexOf(arg.title) !== -1);
    if (byTitle) { byTitle.click(); return 'title'; }
    const rx = new RegExp('Lesson\\s*' + arg.num + '(?!\\d)', 'i');
    const byNum = tiles.find(e => rx.test(e.textContent || ''));
    if (byNum) { byNum.click(); return 'number'; }
    return null;
  }, { num: n, title: title });
  if (!opened) {
    await abort(page, 'the hub had no tile for "' + title + '" (Lesson ' + n + ') on ' + cls);
  }
  await sleep(2600);
  /* the local preview stamps a PREVIEW pill on the page — an artefact of
     previewing, never something a pupil or a teacher sees */
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('body > div, body > span')).forEach(d => {
      const t = (d.textContent || '').trim();
      if (d.id === 'ks3dt-nokeys' || /^PREVIEW\s*[·\-—]/.test(t)) d.remove();
    });
  });
  return page;
}

/* ═════════════ NOTHING IS PHOTOGRAPHED WHILE IT IS STILL LOADING ══════════
   Read off the proofs, 16 Aug 2026. Lesson 3's rung-1 card and Lesson 5's
   masterclass card were both photographed with the film player mid-load: a
   black spinner arc sat across the title and, on Lesson 5, a half-faded caption
   was still dissolving underneath it. Every check passed — the predicate held,
   the selector was right, the pinned words were all present — because provenance
   was all anything measured. A screen that is still ASSEMBLING is not the screen
   a class will see, so the shutter now waits for it to be still: no live spinner
   inside the frame, and any film settled enough to have drawn its own first
   frame. It gives up after a few seconds rather than hanging, and says so. */
async function settled(pg, el, name) {
  const deadline = Date.now() + 15000;
  for (;;) {
    const busy = await el.evaluate(node => {
      const spin = node.querySelector('.panel-spinner, .guard-spinner, .q-spin, .pill-spinner');
      if (spin && spin.getClientRects().length) return 'a spinner';
      /* AND THE POSTER IS NOT AN EXCUSE TO SHOOT EARLY. The first version of
         this check skipped any film that had a poster — and a poster is exactly
         when Chrome draws its OWN loading ring over the frame, which is not in
         the DOM and cannot be queried, only waited out. Lesson 5's masterclass
         still came back with a black arc across the school crest. So every film
         is waited for, poster or not, until it holds enough to play. */
      const vids = Array.from(node.querySelectorAll('video'));
      const cold = vids.find(v => v.readyState < 4);
      return cold ? 'a film still loading (readyState ' + cold.readyState + ')' : '';
    });
    if (!busy) break;
    if (Date.now() > deadline) {
      console.log('    note: "' + name + '" still showed ' + busy +
        ' after 6s — photographed anyway, READ THIS ONE.');
      break;
    }
    await pg.waitForTimeout(250);
  }
  /* CHROME'S OWN LOADING RING IS NOT IN THE DOM AND DOES NOT GO AWAY BY
     WAITING. It is drawn over a poster until the media has actually decoded a
     frame, so it survived every readiness check and sat across the school crest
     on Lesson 5's masterclass card. The cure is to make the film paint: play it
     for a moment, pause it, and put it back to the start. Nothing is faked —
     the poster IS the film's own opening frame (qa-film-posters holds that), so
     what the shutter sees is the same picture without the ring. */
  await el.evaluate(async node => {
    const vids = Array.from(node.querySelectorAll('video'));
    for (const v of vids) {
      try {
        v.muted = true;
        await v.play();
        await new Promise(r => setTimeout(r, 120));
        v.pause();
        v.currentTime = 0;
      } catch (e) { /* a film that refuses to play is the walk's problem, not the shutter's */ }
    }
  });
  /* one more beat so a fade that has just started is over before the shutter */
  await pg.waitForTimeout(500);
}

/* ═══════════════ ONE WALK, SHOOTING WHATEVER COMES TRUE ═══════════════════
   The walk never steers toward a picture. Each turn it asks which of the
   pictures it still owes are true RIGHT NOW, takes those, and then takes one
   ordinary step. That is what makes a mislabelled shot impossible: a picture
   exists only because its own predicate held while the shutter was open. */
async function walkAndShoot(page, owed, take, budget) {
  let lastKey = '', same = 0, stretchSeen = 0, reviewsFiled = 0;
  for (let turn = 0; turn < (budget || 320) && owed.size; turn++) {
    for (const name of Array.from(owed)) {
      const spec = take.spec(name);
      let on = false;
      try { on = await page.evaluate(spec.at); } catch (e) { on = false; }
      if (!on) continue;
      await take.shoot(page, name, spec);
      owed.delete(name);
    }
    if (!owed.size) break;

    /* THE ONE CONTROL THAT ENDS LESSON 4's CASE BOARD, pressed by name.
       `.case-finish-btn` ("Wrap up the board") is rendered inside the RELEASE
       view once the game is shipped or signed off, and it is the only way out
       of the casework chunk. The generic "press the primary button" handler
       never reached it — whatever else that view offers wins first — so the
       walk kept re-entering the release desk and bouncing back to the board.
       Read out of the engine, not guessed from the screen. */
    /* tell the page whether the clue picture is still owed, so the ladder is
       opened only while it is needed and the walk is otherwise unchanged */
    await page.evaluate((want) => { window.__wantClues = want; },
      Array.from(owed).some(n => /clue/i.test(n)));
    /* armed only once the walk has plainly stalled on the studio's stretch */
    await page.evaluate((on) => { window.__studioNudge = on; }, same > 3);
    await page.evaluate((n) => { window.__needReview = n; }, reviewsFiled < 3);
    const wrapped = await page.evaluate(() => {
      /* "ONE FILE LEFT" — the real reason four earlier guards all failed.
         Pressing "Wrap up the board" calls maybeFinish(), and while the
         Jellyfish Job is still pinned open that puts up a card offering
         "Take the job ⭐" (PRIMARY) or "Clock off" (ghost). The generic
         handler presses the primary button, so the lesson itself politely
         funnelled the walk straight back into the one screen it cannot close,
         over and over. The board was never stuck; it was being obeyed.
         The capture clocks off: it does not need the stretch closed. */
      /* NOTHING here may fire while a badge pop is up. "Clock off" calls
         finishBoard(), which awards a badge and only then moves the lesson on —
         and the pop is an OVERLAY, so the card underneath still reads "still
         pinned open" the whole time it is showing. Without this line the walk
         clicks the buried card for ever and the pop is never dismissed, which
         is precisely what it did: twenty-five "clock off" presses, no progress,
         and a screen that looked stuck while it was actually waiting to be
         acknowledged. */
      if (document.querySelector('.badge-pop')) return null;
      const host = document.querySelector('.chunk-host');
      /* PRESS NIGHT: pick a studio off the marquee. The listings are DIVs with
         an onclick, not buttons, so the generic "press a button" handler cannot
         see them at all and the walk simply stops at the gallery floor with two
         press passes unspent. Clicking one opens the review desk, which the
         ordinary handlers then fill in. Her own listing is skipped — it is not
         clickable, and reviewing yourself is not a thing the lesson allows. */
      if (window.__studioNudge) {
        /* ── PRESS NIGHT, WRITTEN THROUGH ────────────────────────────────────
           The gallery floor stalled for 1,300 turns as `button`, because its
           only primary control is "File the note & wrap up" — and that stays
           LOCKED until a press pass has been spent. The marquee listings are
           DIVs with an onclick, so the generic handler cannot see them at all:
           the walk was pressing the one button it could see, which is the one
           button that refuses. So the review is written here, in order: open a
           studio, fill BOTH stems, file it. Nothing is skipped — this is the
           lesson's own sequence, performed rather than waited for. */
        const desk = document.querySelector('.chunk-host .gal-desk');
        if (desk && !window.__needReview) {
          /* the passes are spent. Filing again just earns "you already reviewed
             this studio" for ever. Back to the floor, where the V2 note is now
             unlocked. (How many are OWED depends on how many other studios are
             on the marquee — the lesson's own need = min(quota, others) — so the
             walk keeps reviewing until the floor lets it move on.) */
          const back = desk.querySelector('.std-back');
          if (back) { back.click(); return 'back to the gallery floor'; }
        }
        if (desk) {
          const stems = Array.from(desk.querySelectorAll('.gal-stem-input')).filter(t => !t.value);
          if (stems.length) {
            const t = stems[0];
            t.value = t.getAttribute('data-stem') === 'like'
              ? 'that the apples speed up as your score climbs, so it keeps getting harder'
              : 'whether a golden apple worth three points would make you choose which one to chase';
            t.dispatchEvent(new Event('input', { bubbles: true }));
            return 'wrote a review stem';
          }
          const file = desk.querySelector('.gal-file-btn');
          if (file && file.offsetParent && !file.disabled) { file.click(); return 'filed the review'; }
        }
        /* only while a pass is still owed — otherwise picking a studio and
           coming straight back is its own little loop, which is what it did */
        if (window.__needReview) {
          const card = document.querySelector('.chunk-host .gal-marquee-card.clickable');
          if (card) { card.click(); return 'picked a studio off the marquee'; }
        }
      }
      /* THE HELP LADDER, opened on purpose. The teacher's brief carries a
         picture of the clue steps ("two free, one that costs a gold stamp"),
         and a walk that solves every case never needs help, so that screen
         simply never appears. Opening it is not faking anything: it is the
         control a stuck pupil presses, pressed once so the picture exists. */
      if (host && window.__wantClues) {
        const cb = host.querySelector('.case-clue-btn');
        if (cb && cb.offsetParent && !cb.disabled) { cb.click(); return 'open the help steps'; }
      }
      if (host && /still pinned open/i.test(host.textContent || '')) {
        const off = Array.from(host.querySelectorAll('button'))
          .find(b => /clock off/i.test(b.textContent || '') && b.offsetParent && !b.disabled);
        if (off) { off.click(); return 'clock off'; }
      }
      const b = document.querySelector('.chunk-host .case-finish-btn');
      if (b && b.offsetParent && !b.disabled) { b.click(); return 'wrap up the board'; }

      /* LESSON 5's STUDIO STRETCH — the same trap as Lesson 4's Jellyfish Job,
         wearing different clothes. "It works — I tested it" is an OPTIONAL
         stretch confirm sitting at the bottom of the Studio Desk. It is the
         first unticked confirm on the screen, so the generic handler goes for
         it every turn, and the walk never presses the control that actually
         moves the lesson on. The capture takes the stretch if it will take —
         it fills its note first, which is what arms the confirm — and if the
         tick still has not landed, it leaves it and heads for the gallery. */
      if (window.__studioNudge) {
        const note = document.querySelector('.chunk-host .std-stretch-note');
        if (note && !note.value) {
          note.value = 'A second variable that counts the lives left.';
          note.dispatchEvent(new Event('input', { bubbles: true }));
          return 'filled the studio note';
        }
        const ready = document.querySelector('.chunk-host .std-ready-btn.lit:not([disabled])');
        if (ready) { ready.click(); return 'READY FOR GALLERY'; }
        const on = document.querySelector('.chunk-host .std-continue');
        if (on && on.offsetParent && !on.disabled) { on.click(); return 'head to Press Night'; }
      }
      return null;
    });
    if (wrapped) {
      if (wrapped === 'filed the review') reviewsFiled++;
      console.log('   · (pressed "' + wrapped + '")');
      await sleep(1100);
      continue;
    }

    const st = await page.evaluate(WALK.detectKind);
    const ck = await page.evaluate(WALK.chunkNow);
    /* say where the time is going. A walk that runs out of turns without ever
       looping looks identical, from the outside, to one that is stuck — and
       guessing which it was cost two forty-minute runs. */
    if (turn > 0 && turn % 100 === 0) {
      console.log('   · turn ' + turn + ' @ ' + ck + ' (' + st.kind + ') — still owed: ' +
        Array.from(owed).join(', '));
    }
    const key = ck + ':' + st.kind + ':' + (st.label || '');
    same = key === lastKey ? same + 1 : 0;
    lastKey = key;
    if (same > 40) {
      console.error('   !! the walk is stuck on ' + JSON.stringify(st) + ' @ ' + ck);
      break;
    }
    /* ── THE ESCAPE VALVE, and why a CAPTURE walker may have one ────────────
       Some cards offer several live buttons where only one moves the lesson on
       — Lesson 4's Jellyfish Job sits behind a confirm that stays clickable
       after it is satisfied, so "press the first live button" presses the same
       already-done control for ever. After four identical turns this tries the
       NEXT button along instead.
       This belongs in a capture walker and NOT in `sit-review`: sit-review's
       whole value is that its numbers are deterministic and pinned (DFM 199),
       and a walker that improvises when it gets stuck would quietly change what
       those numbers mean. This one asserts nothing about a pupil's journey — it
       only has to arrive at screens and photograph them. */
    /* Lesson 4's Jellyfish Job is optional content the capture never needs to
       CLOSE, and it cannot be closed by clicking: the board keeps offering it
       (no stamp on it), the card offers only "Pin it back on the board", and
       the two bounce off each other for ever. After the stretch has been opened
       twice, the walk leaves it alone and takes the release desk instead. It is
       skipped for the CAPTURE only — `sit-review` still walks it in full, which
       is where a pupil's journey is actually proved. */
    /* ── THE CASE BOARD, DRIVEN DELIBERATELY ────────────────────────────────
       Lesson 4's board hands back a DIFFERENT label every turn, so a walk that
       keeps reopening something it cannot close never repeats itself and never
       trips the stuck detector. It circles, politely, until the budget runs out
       — which from outside looks exactly like a walk that needed more time.
       Instrumenting it is what told the two apart: 1,400 turns, all on `board`.
       THE CAUSE, and it is one pin. The shared chooser opens anything without a
       CASE CLOSED stamp, and two pins never get one: the Jellyfish Job (optional
       stretch) and the Detective's Handbook (a film). The board offers them for
       ever, so `pick` is never empty, so the board's own Continue never becomes
       the thing to press, so the walk never leaves the chunk. Three earlier
       guards each swapped one loop for another — skip the stretch and it takes
       the handbook; exclude both and it re-opens the finished Evidence Intake —
       because each was patching the symptom.
       So the capture drives this board ITSELF, in the order a pupil does, and
       simply never opens the two pins that cannot close. The stretch is opened
       exactly ONCE, and only while its picture is still owed. When the board has
       nothing left worth opening, the walk presses Continue and leaves.
       CAPTURE ONLY. `sit-review` still walks the stretch to the end — a walker
       that declines a screen must never be the one whose numbers are pinned. */
    if (st.kind === 'case-pin') {
      const wantStretch = Array.from(owed).some(n => /jellyfish|stretch/i.test(n)) && !stretchSeen;
      const took = await page.evaluate((takeStretch) => {
        const label = e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        const pins = Array.from(document.querySelectorAll('button.case-pin:not([disabled])'));
        const isStretch = p => /jellyfish/i.test(p.textContent || '') || p.classList.contains('case-stretch');
        const isFilm = p => /handbook|training film/i.test(p.textContent || '');
        if (takeStretch) {
          const st2 = pins.find(isStretch);
          if (st2) { st2.click(); return { what: label(st2), stretch: true }; }
        }
        const intake = pins.find(p => p.getAttribute('data-view') === 'intake' &&
          !p.classList.contains('done'));
        const openCase = pins.find(p => p.hasAttribute('data-case') && !p.querySelector('.case-stamp'));
        const release = pins.find(p => p.getAttribute('data-view') === 'release' &&
          !/signed off/i.test(p.textContent || ''));
        const pick = intake || openCase || release;
        if (pick && !isStretch(pick) && !isFilm(pick)) { pick.click(); return { what: label(pick) }; }
        /* Nothing left worth opening. The board is NOT finished from the board:
           the control that ends it — "Wrap up the board" (.case-finish-btn) —
           is rendered inside the RELEASE view, after the game is shipped or
           signed off. So the way out is to walk back into the release desk and
           let the ordinary handlers press it. Guessing at a Continue button on
           the board itself was the last of four wrong turns here; this one was
           read out of the engine rather than inferred from the screen. */
        const rel2 = document.querySelector('button.case-pin[data-view="release"]:not([disabled])');
        if (rel2) { rel2.click(); return { what: label(rel2), leaving: true }; }
        const on = Array.from(document.querySelectorAll('.chunk-host button'))
          .filter(x => x.offsetParent && !x.disabled)
          .find(x => /continue|finish|move on|next|done|wrap up/i.test(x.textContent || ''));
        if (on) { on.click(); return { what: label(on), leaving: true }; }
        return null;
      }, wantStretch);
      if (took && took.stretch) stretchSeen++;
      if (took && took.leaving) console.log('   · (board done — leaving via "' + took.what + '")');
      await sleep(950);
      continue;
    }
    if (same > 3 && st.kind === 'button') {
      const tried = await page.evaluate((n) => {
        const host = document.querySelector('.chunk-host');
        if (!host) return null;
        const b = Array.from(host.querySelectorAll('button')).filter(x => x.offsetParent && !x.disabled);
        if (!b.length) return null;
        const pick = b[n % b.length];
        pick.click();
        return (pick.textContent || '').trim().slice(0, 40);
      }, same - 3);
      if (tried) console.log('   · (unsticking: pressed "' + tried + '")');
      await sleep(900);
      continue;
    }
    /* the shell arms every control with a 350ms mount guard (DFM 104): a click
       fired the instant a button appears is deliberately swallowed */
    await sleep(420);
    const mv = WALK.MOVES[st.kind];
    if (mv) { try { await page.evaluate(mv); } catch (e) { /* re-detected next turn */ } }
    else if (WALK.ACTIONS[st.kind]) {
      try { await WALK.ACTIONS[st.kind](page); } catch (e) { /* re-detected next turn */ }
    }
    await sleep(WALK.SETTLE[st.kind] || 700);
  }
}

/* ═══════════ PRESS NIGHT NEEDS A ROOM, AND BOTH PASSES NEED ONE ═══════════
   Lesson 5's marquee lists only studios whose doors have OPENED, so a single
   account meets an empty marquee — and an empty marquee on a slide teaches a
   class that Press Night looks like nothing. A second real preview pupil opens
   hers first (the qa-l5-sweep machinery, and the DFM 225b paired-Vault lesson
   applied to L5's one multi-pupil screen).

   AND THE PREVIEW'S OWN BOT STUDIOS ARE SWITCHED OFF. The live app has no
   simulated studios; the local preview seeds three — Comet Collective, Bramble
   Interactive, Quizzical Fox — the first time the gallery is polled, as a
   kindness for one-tab testing. Photographed, that puts the word SIMULATED on a
   slide in front of a class, above studios that do not exist. So the seeding is
   skipped (its own `bots` flag set as though it had already run) AFTER the real
   second studio is on the board and BEFORE the marquee is first polled. Nothing
   is removed from the picture and no pixel is edited: the marquee is asked to
   behave the way the live one does, and then photographed honestly.

   THIS RUNS FOR BOTH PASSES. It was written for the deck pass alone, and the
   brief pass then stalled for 1,400 turns on a gallery floor it could not
   leave — no other studio meant no press pass could be spent, so the V2 note
   never unlocked. The teacher's brief carries a picture of that marquee too,
   and it must not be the preview's bots either. */
async function stagePressNight(ctx, page, lesson) {
  console.log('  · staging a second studio so the marquee is real…');
  const pB = await pupil(ctx, 'sean', lesson, false);
  for (let i = 0; i < 260; i++) {
    const done = await pB.evaluate(() => {
      const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
      return !!s && (s.id === 'press' || s.id === 'ship' || s.id === 'exit' || s.id === 'selfeval');
    });
    if (done) break;
    const st = await pB.evaluate(WALK.detectKind);
    await sleep(380);
    const mv = WALK.MOVES[st.kind];
    if (mv) { try { await pB.evaluate(mv); } catch (e) {} }
    else if (WALK.ACTIONS[st.kind]) { try { await WALK.ACTIONS[st.kind](pB); } catch (e) {} }
    await sleep(WALK.SETTLE[st.kind] || 700);
  }
  await pB.close();
  console.log('  · second studio staged.');

  const off = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
    db.props = db.props || {};
    let touched = 0;
    for (const k of Object.keys(db.props)) {
      if (k.indexOf('gal:') !== 0) continue;
      let head;
      try { head = JSON.parse(db.props[k]); } catch (e) { continue; }
      if (head && !head.bots) { head.bots = 1; db.props[k] = JSON.stringify(head); touched++; }
    }
    for (const id of ['5', 'j1-05']) {
      const k = 'gal:Demo-8A|' + id;
      if (!db.props[k]) { db.props[k] = JSON.stringify({ v: 2, seq: 0, ns: 0, nr: 0, bots: 1 }); touched++; }
    }
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
    return touched;
  });
  console.log('  · preview bot studios suppressed (' + off + ' gallery head(s)) — ' +
    'the marquee will show only real studios, as the live app does.');
}

/* ══════════════════════════════ THE RUN ═══════════════════════════════════ */
/* deck shots that came out too tall to read on a slide, gathered across the
   whole run and reported together at the end */
const tooTall = [];

async function captureLesson(browser, lesson) {
  const theme = THEMES[lesson];
  const lj = lessonJson(lesson);
  const deckDir = path.join(PLATFORM, 'assets', 'img', 'deck', lesson);
  const briefDir = path.join(PLATFORM, 'assets', 'img', 'brief', lesson);
  const rawDir = path.join(deckDir, '_raw');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(briefDir, { recursive: true });

  const manPath = path.join(deckDir, 'shots-manifest.json');
  const manifest = fs.existsSync(manPath)
    ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { lesson, shots: {} };
  manifest.lesson = lesson;
  manifest.shots = manifest.shots || {};
  const briefManPath = path.join(briefDir, 'shots-manifest.json');
  const briefMan = { lesson, kind: 'brief', contentVersion: CONTENT_VERSION, shots: {} };
  const write = () => {
    fs.writeFileSync(manPath, JSON.stringify(manifest, null, 1) + '\n');
    fs.writeFileSync(briefManPath, JSON.stringify(briefMan, null, 1) + '\n');
  };

  console.log('');
  console.log('══ ' + lesson + ' — ' + theme.name + ' @ contentVersion ' + CONTENT_VERSION);

  /* ── 1. THE COMPOSED STILLS. No browser needed: these are the lesson's own
     pictures and the films' own frames, arranged for a projector. ────────── */
  for (const [name, spec] of Object.entries(COMPOSED[lesson] || {})) {
    const out = spec.out === 'brief'
      ? path.join(briefDir, spec.file || (name + '.png'))
      : path.join(deckDir, 'shot-' + name + '.png');
    let row;
    if (spec.kind === 'film-frame') {
      const mp4 = path.join(PLATFORM, spec.src);
      if (!fs.existsSync(mp4)) throw new Error(lesson + ': no film at ' + spec.src);
      const hash = md5(fs.readFileSync(mp4)).slice(0, 12);
      const size = await filmFrame(mp4, spec.tSeconds, out, theme, null,
        { crop: spec.crop, ring: spec.ring, inset: spec.inset });
      row = {
        name, kind: 'film-frame', src: spec.src, tSeconds: spec.tSeconds, filmHash: hash,
        /* recorded so what was done to the frame is inspectable rather than
           implied — a cropped still that does not say it was cropped is a claim
           about a film nobody can check */
        crop: spec.crop || null, ring: spec.ring || null, inset: spec.inset || null,
        says: spec.says, contentVersion: CONTENT_VERSION, px: size.w + 'x' + size.h
      };
      console.log('  ✓ ' + path.relative(PLATFORM, out) + '  ' + size.w + 'x' + size.h +
        '  [film frame @ ' + spec.tSeconds + 's of ' + path.basename(spec.src) + ']');
    } else {
      const chunk = chunkOf(lj, spec.from.chunk);
      if (!chunk) throw new Error(lesson + ': ' + name + ' names chunk ' + spec.from.chunk + ', which does not exist');
      let sources = [];
      if (spec.from.field === 'images') {
        sources = ((chunk.config || {}).images || []).map(im => ({
          src: im.src, caption: im.caption || '', file: path.join(PLATFORM, im.src)
        }));
      } else {
        const st = ((chunk.config || {}).steps || [])[spec.from.step];
        if (!st || !st.img) throw new Error(lesson + ': ' + name + ' found no image on ' + spec.from.chunk + ' step ' + spec.from.step);
        sources = [{ src: st.img, caption: st.imgCap || '', file: path.join(PLATFORM, st.img) }];
      }
      for (const s of sources) {
        if (!fs.existsSync(s.file)) throw new Error(lesson + ': ' + name + ' — no file at ' + s.src);
      }
      const size = sources.length > 1
        ? await composeTrio(sources.map(s => ({ src: s.file, caption: s.caption })), out, theme)
        : await composeCredited(sources[0].file, out, theme, sources[0].caption);
      const captions = sources.map(s => s.caption).join(' · ');
      if (spec.creditMust && !spec.creditMust.test(captions)) {
        throw new Error(lesson + ': ' + name + ' lost its credit line — the lesson caption ' +
          'must carry ' + spec.creditMust + ' and it does not. Composing a credited ' +
          'photograph without its credit is not a formatting slip.');
      }
      row = {
        name, kind: 'content-asset', chunkId: spec.from.chunk,
        sources: sources.map(s => s.src), captions, says: spec.says,
        contentVersion: CONTENT_VERSION, chunkHash: chunkHash(lj, spec.from.chunk),
        px: size.w + 'x' + size.h
      };
      console.log('  ✓ shot-' + name + '.png  ' + size.w + 'x' + size.h +
        '  [' + sources.length + ' asset(s) from ' + spec.from.chunk + ']');
    }
    if (spec.out === 'brief') briefMan.shots[name] = row; else manifest.shots[name] = row;
    write();
  }

  /* ── 2. THE DECK SHOTS — one walk, 1280x940 at 2x for a projector ─────── */
  const deckPlan = DECK_SHOTS[lesson] || {};
  const owedDeck = new Set(Object.keys(deckPlan));
  if (owedDeck.size) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 940 }, deviceScaleFactor: 2 });
    const page = await pupil(ctx, WHO_OF[yearOf(lesson)], lesson);
    const take = {
      spec: n => deckPlan[n],
      shoot: async (pg, name, spec) => {
        const el = await pg.$(spec.selector) || await pg.$('.chunk-host .card') || await pg.$('.chunk-host');
        if (!el) await abort(pg, 'nothing to photograph for "' + name + '" (' + spec.selector + ')');
        const lines = await el.evaluate(node => (node.innerText || '').split('\n')
          .map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean));
        /* ── THE PREDICATE PROVES THE SCREEN; THE SELECTOR CHOOSES THE PICTURE,
           and they can point at different things. Lesson 5's Press Night proved
           TRUE — a real marquee with another studio on it was on the page — and
           the selector then photographed a greyed-out "YOUR V2 NOTE" card
           further up, because a comma-separated selector takes the first match
           in document order. The manifest looked perfect: a real `press` chunk
           sentence as its anchor, so the gate had nothing to object to.
           **A proved screen and a wrong picture is still a wrong picture**, and
           it is the DFM 225b fault surviving inside the machinery built to stop
           it. So a shot may declare `mustShow`: words that have to be IN THE
           ELEMENT PHOTOGRAPHED, not merely somewhere on the page. */
        if (spec.mustNotShow) {
          const said0 = lines.join(' · ');
          if (spec.mustNotShow.test(said0)) {
            await abort(pg, '"' + name + '" photographed something matching ' + spec.mustNotShow +
              ' — that word belongs to the preview, not to a classroom, and it would be ' +
              'projected. It said: "' + said0.slice(0, 120) + '…"');
          }
        }
        if (spec.mustShow) {
          const said = lines.join(' · ');
          if (!spec.mustShow.test(said)) {
            await abort(pg, '"' + name + '" photographed an element that does not show ' +
              spec.mustShow + ' — the screen was right, the picture was not. It said: "' +
              said.slice(0, 120) + '…"');
          }
        }
        await settled(pg, el, name);
        const raw = path.join(rawDir, name + '.png');
        await el.screenshot({ path: raw });
        /* AND AGAIN AFTER: a screen that moved under the shutter is a screen
           photographed mid-change, and that picture goes on a projector */
        if (!await pg.evaluate(spec.at)) {
          await abort(pg, '"' + name + '" moved off its screen while it was being photographed');
        }
        /* ── THE CROP, measured off the real boxes (DFM 237b) ───────────────
           `cropTo` names an element INSIDE the photographed one; the picture
           keeps the top of the card down to that element's bottom, plus a
           little air. Measured as a FRACTION so it is independent of the
           device pixel ratio and re-measures itself in every lesson, where the
           same card is a different height. A cropTo that matches nothing is a
           failure, never a silent full-size shot — the whole point is that the
           picture is the size the plan says it is. */
        let crop = null;
        if (spec.cropTo) {
          crop = await el.evaluate((node, sel) => {
            const inner = node.querySelector(sel);
            if (!inner) return null;
            const a = node.getBoundingClientRect(), b = inner.getBoundingClientRect();
            if (!a.height) return null;
            return { to: sel, keepFrac: Math.min(1, (b.bottom - a.top + 16) / a.height) };
          }, spec.cropTo);
          if (!crop) {
            await abort(pg, '"' + name + '" declares cropTo "' + spec.cropTo +
              '", and the element photographed has no such descendant');
          }
        }
        const framed = path.join(deckDir, 'shot-' + name + '.png');
        const size = await frameShot(raw, framed, theme, crop);
        /* ── THE SHAPE GUARD, and it is about the back of the room ──────────
           A shot can be of exactly the right screen and still be useless. The
           deck gives a single screenshot about 250 points of width beside its
           bullets, and scales it to fit — so a card photographed at 1:2.5 comes
           out roughly 100 points wide on a 720-point slide: a ribbon nobody can
           read, projected as though it were teaching something.
           Lesson 1's approved set — the one he called "spot on" — runs from
           1:0.37 to 1:1.02, so 1.6 is a floor with real headroom rather than a
           number picked to make today's shots pass. A shot that breaks it FAILS
           and says so: the fix is to photograph a tighter, complete element,
           never to squash the picture or quietly ship it small. */
        const aspect = size.h / size.w;
        if (aspect > MAX_ASPECT) {
          /* RECORDED AND CARRIED, not thrown here. Aborting on the first tall
             shot would hand back one offender per forty-minute run; the run
             finishes, and every offender is named together at the end with the
             width it would really be on the slide, so the selectors can be
             fixed in one pass. The run still FAILS — nothing ships small and
             quiet — it just fails usefully. */
          tooTall.push({ lesson, name, w: size.w, h: size.h, aspect,
            wouldBe: Math.round(250 / aspect) });
        }
        const long = lines.filter(l => l.length >= 20).sort((a, b) => b.length - a.length);
        manifest.shots[name] = {
          name, kind: 'app', chunkId: spec.chunk, selector: spec.selector,
          textSnippet: (long[0] || lines.join(' ')).slice(0, 200),
          contentAnchor: contentAnchor(lj, spec.chunk, lines),
          cardText: lines.join(' · ').slice(0, 500),
          says: spec.says, contentVersion: CONTENT_VERSION,
          /* what was done to the picture, recorded rather than implied */
          crop: crop ? { to: crop.to, keepFrac: Math.round(crop.keepFrac * 1000) / 1000 } : null,
          chunkHash: chunkHash(lj, spec.chunk), px: size.w + 'x' + size.h
        };
        write();
        console.log('  ✓ shot-' + name + '.png  ' + size.w + 'x' + size.h + '  [' + spec.chunk + ']');
        console.log('      anchor: ' + (manifest.shots[name].contentAnchor
          ? '"' + manifest.shots[name].contentAnchor.slice(0, 62) + '…"'
          : '(none — engine-drawn; the gate holds a pinned expectation)'));
      }
    };
    if (lesson === 'j1-05') await stagePressNight(ctx, page, lesson);
    /* Lesson 4's casework is the longest walk on the platform — four cases, each
       opened, logged and closed, plus intake, the stretch and the release desk —
       and it ran out of turns before the closing screen. The budget is generous
       rather than tuned: the loop exits the moment nothing is owed, so a bigger
       ceiling costs nothing on the lessons that finish early. */
    await walkAndShoot(page, owedDeck, take, 1500);
    if (owedDeck.size) {
      console.error('');
      console.error('!! ' + lesson + ': these deck pictures were never taken, because their');
      console.error('   screens never came true on the walk:');
      for (const n of owedDeck) console.error('     ✗ ' + n + ' — ' + deckPlan[n].says);
      await ctx.close();
      throw new Error(lesson + ': ' + owedDeck.size + ' deck shot(s) unproved');
    }
    await ctx.close();
  }

  /* ── 3. THE BRIEF IMAGES — the same build, the teacher's own viewport ──── */
  const briefPlan = BRIEF_SHOTS[lesson] || {};
  const owedBrief = new Set(Object.keys(briefPlan));
  if (owedBrief.size) {
    /* CARA, NOT A FRESH PUPIL — and the reason is a rule, not a preference.
       The Do-Now may only serve recap items from lessons this pupil has
       COMPLETED (DFM 134), so a pupil with no history meets an EMPTY Do-Now
       that skips itself. Photographing that would have put a screen in the
       teacher's brief that no real pupil in her room will ever see. Cara's
       seeded record has Lesson 1 finished, so her Do-Now is a real one with
       real questions on it. */
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 769 }, deviceScaleFactor: 2 });
    const page = await pupil(ctx, BRIEF_WHO_OF[yearOf(lesson)], lesson);
    if (lesson === 'j1-05') await stagePressNight(ctx, page, lesson);
    const take = {
      spec: (n) => {
        const b = briefPlan[n];
        const want = b.chunk;
        /* the chunk is the FLOOR, never the whole test. Six of Lesson 4's brief
           pictures live in one chunk, so "are we on `board`?" would have taken
           all six at the first board screen — six identical files under six
           different names. Where a row declares its own predicate, BOTH must
           hold: the right chunk AND the right screen within it.

           IT IS BUILT AS ONE SELF-CONTAINED FUNCTION, and that is not a style
           choice. The first version wrapped the two tests in a Node closure and
           handed THAT to the browser — where neither captured variable exists,
           so every predicate threw, every throw was read as "not yet", and the
           run quietly took two pictures out of nine. A page predicate may close
           over nothing. */
        const src = '(function(){' +
          'var s = window.App && App.state && App.state.chunks[App.state.chunkIdx];' +
          'if (!s || s.id !== ' + JSON.stringify(want) + ') return false;' +
          (b.at ? 'try { return !!(' + b.at.toString() + ')(); } catch (e) { return false; }'
                : 'return true;') +
          '})';
        return { chunk: want, says: b.says, at: new Function('return ' + src)() };
      },
      shoot: async (pg, name, spec) => {
        const el = await pg.$('.chunk-host .card') || await pg.$('.chunk-host');
        if (!el) await abort(pg, 'nothing to photograph for the brief image "' + name + '"');
        const lines = await el.evaluate(node => (node.innerText || '').split('\n')
          .map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean));
        await settled(pg, el, name);
        const out = path.join(briefDir, name);
        await el.screenshot({ path: out, quality: /\.jpe?g$/i.test(name) ? 88 : undefined,
          type: /\.jpe?g$/i.test(name) ? 'jpeg' : 'png' });
        if (!await pg.evaluate(spec.at)) {
          await abort(pg, 'the brief image "' + name + '" moved off its screen mid-shutter');
        }
        const long = lines.filter(l => l.length >= 20).sort((a, b) => b.length - a.length);
        briefMan.shots[name] = {
          name, chunkId: spec.chunk,
          synthetic: spec.chunk.charAt(0) === '_' || undefined,
          textSnippet: (long[0] || lines.join(' ')).slice(0, 200),
          contentAnchor: contentAnchor(lj, spec.chunk, lines),
          says: spec.says, contentVersion: CONTENT_VERSION,
          chunkHash: chunkHash(lj, spec.chunk)
        };
        write();
        console.log('  ✓ brief/' + name + '  [' + spec.chunk + ']');
      }
    };
    await walkAndShoot(page, owedBrief, take, 1500);
    if (owedBrief.size) {
      console.error('');
      console.error('!! ' + lesson + ': these brief images were never taken:');
      for (const n of owedBrief) console.error('     ✗ ' + n + ' — ' + briefPlan[n].says);
      await ctx.close();
      throw new Error(lesson + ': ' + owedBrief.size + ' brief image(s) unproved');
    }
    await ctx.close();
  }

  briefMan.reused = Object.entries(REUSED)
    .filter(([k]) => k.indexOf(lesson + '/') === 0)
    .reduce((a, [k, v]) => { a[k] = v; return a; }, {});
  write();
  console.log('  manifest: ' + Object.keys(manifest.shots).length + ' deck rows · ' +
    Object.keys(briefMan.shots).length + ' brief rows @ ' + CONTENT_VERSION);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const l of LESSONS) await captureLesson(browser, l);
  } finally {
    await browser.close();
  }
  console.log('');
  console.log('Pictures deliberately NOT re-taken this round, each with its reason:');
  for (const [k, why] of Object.entries(REUSED)) console.log('  · ' + k + ' — ' + why);

  if (tooTall.length) {
    console.error('');
    console.error('!! ' + tooTall.length + ' deck picture(s) are too tall to read on a slide.');
    console.error('   The deck gives one screenshot about 250pt of width beside its bullets and');
    console.error('   scales it to fit, so a tall card ends up a ribbon nobody can read:');
    for (const t of tooTall) {
      console.error('     ✗ ' + t.lesson + ' › ' + t.name + '  ' + t.w + 'x' + t.h +
        '  (1:' + t.aspect.toFixed(2) + ') → about ' + t.wouldBe + 'pt wide on the slide');
    }
    console.error('');
    console.error('   FIX: give each one a tighter `selector` in deck-shot-plan.js so it');
    console.error('   photographs a smaller COMPLETE element. Never squash the picture.');
    process.exit(1);
  }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
