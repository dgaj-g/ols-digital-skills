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
/* ── --wrong: DRIVE LIKE THE CONFUSED PUPIL (19 Aug 2026) ───────────────────
   Some screens only exist for a pupil who gets it wrong, and one of them is a
   picture a teacher genuinely needs on the board: THE CONSOLE AFTER A RUN THAT
   DID NOT WORK. The expert walker cannot reach it, because it drives every
   build from the answer key and therefore never fails. `WRONG_MOVES` — the same
   home, beside the movers it replaces (DFM 144) — fails each build once on a
   decoy the author planted and then puts it right, so the walk still finishes
   the lesson and every other predicate is still met. */
const WRONG = args.includes('--wrong');
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
/* THE SECOND REAL PUPIL FOR A PAIRED SET-PIECE (K42b, 14 Sep 2026) — the same
   two the paired harnesses use (qa-swap-paired: aoife + leah), so a capture
   stands where the harness stands (DFM 144) */
const PARTNER_OF = { j1: 'cara', j2: 'leah', j3: 'katie' };

async function pupil(ctx, who, lesson, fresh, opts) {
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
  await page.evaluate((a) => {
    const cls = a.cls;
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {};
    db.locks[cls] = db.locks[cls] || {};
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks[cls][n] = { u: now, on: 1 };
    db.cfg[cls] = db.cfg[cls] || {};
    /* PAIRING IS ON ONLY FOR A LESSON WHOSE PLAN PHOTOGRAPHS A PAIRED SCREEN
       (K42b). Off, the two Lesson 3 set-pieces go straight to their one-machine
       seat and the waiting card, the PARTNER FOUND card and the tester's seat
       cannot exist — the harness's own configuration, not the lesson, would be
       what kept them off the board. Derived from the plan's own selectors, never
       from a lesson's name (DFM 271). */
    db.cfg[cls].pairing = { on: a.pairing ? 1 : 0 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, { cls, pairing: !!(opts && opts.pairing) });
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
  /* THE BUILD CARD'S MOVER NEEDS THE PREVIEW'S OWN MARKING FILE, and without it
     it does NOTHING rather than guessing (which is correct — a walk that quietly
     assembles the wrong program and photographs it would be the DFM 225b fault
     wearing new clothes). `dev-keys.json` is git-ignored and served beside the
     packed content; a harness may read it because a harness is not a pupil. */
  await WALK.primeDevKeys(page, BASE);
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
  /* AND THE CARD MUST HAVE STOPPED GROWING (14 Sep 2026). The L4 briefing
     demos type their rows in one at a time, and the last row of J3's — two
     lines long — was still unfolding when the crop was measured: the picture
     stopped one note short of what the plan said it showed. So the shutter
     waits until two readings of the card's height, a third of a second apart,
     agree — up to six seconds, and then it says so rather than shooting a
     screen that is still moving. */
  const grew = Date.now() + 6000;
  let last = -1;
  for (;;) {
    const h = await el.evaluate(node => Math.round(node.getBoundingClientRect().height));
    if (h === last) break;
    last = h;
    if (Date.now() > grew) { console.log('    note: "' + name + '" was still changing height after 6s — photographed anyway, READ THIS ONE.'); break; }
    await pg.waitForTimeout(350);
  }
}

/* ═══════════════ ONE WALK, SHOOTING WHATEVER COMES TRUE ═══════════════════
   The walk never steers toward a picture. Each turn it asks which of the
   pictures it still owes are true RIGHT NOW, takes those, and then takes one
   ordinary step. That is what makes a mislabelled shot impossible: a picture
   exists only because its own predicate held while the shutter was open. */
async function walkAndShoot(page, owed, take, budget) {
  let lastKey = '', same = 0, stretchSeen = 0, reviewsFiled = 0, holds = 0;
  /* the sweep: every picture still owed whose screen is TRUE right now is taken
     now. Named so a paired stager can call it at the one moment that matters —
     the PARTNER FOUND card is up for exactly as long as it takes the walk to
     press its button, so it is photographed the instant it appears (K42b). */
  const sweep = async () => {
    for (const name of Array.from(owed)) {
      const spec = take.spec(name);
      let on = false;
      try { on = await page.evaluate(spec.at); } catch (e) { on = false; }
      if (!on) continue;
      await take.shoot(page, name, spec);
      owed.delete(name);
    }
  };
  for (let turn = 0; turn < (budget || 320) && owed.size; turn++) {
    await sweep();
    if (!owed.size) break;
    /* THE PARTNER'S TURN (K42b). A paired lesson's second pupil takes her own
       step here, once per turn of the walk, and may ask the walk to hold still
       — the photographed pupil is kept at the door until her partner is
       standing at it too, so the wait she is photographed in is a real one and
       the preview's simulated partner never has time to arrive. */
    if (take.tick) {
      const r = await take.tick(page, owed, sweep);
      if (r && r.holdA) { await sleep(900); continue; }
      if (!owed.size) break;
    }
    /* A PICTURE MAY ASK THE WALK TO WAIT (14 Sep 2026): a row's `hold` names a
       state that is ABOUT to become the picture — the opening card's demo still
       playing — and while it holds, the walk takes no step, so the shutter is
       not beaten by the press that ends the screen. It never steers toward the
       picture; it only declines to walk away from a screen that is still
       arriving. Bounded, so a hold that never clears cannot stall a walk. */
    let holding = false;
    for (const name of Array.from(owed)) {
      const spec = take.spec(name);
      if (!spec.hold) continue;
      let h = false;
      try { h = await page.evaluate(spec.hold); } catch (e) { h = false; }
      if (h) { holding = true; break; }
    }
    if (holding && (holds = (holds || 0) + 1) < 40) { await sleep(900); continue; }

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
    /* A CONFUSED MOVE MAY DECLINE THE CARD IT IS STANDING ON, AND THIS READER HAS TO
       HEAR IT TOO (28 Aug 2026). `WRONG_MOVES` returns 'defer' on a card its extra
       machinery cannot work — one that offers no labelled way back — and the ordinary
       mover takes it instead. sit-wrongpath.js honours that; if this did not, the
       --wrong pass would silently do nothing on such a card and the shot it was sent
       for would go missing with no explanation (DFM 144: one law, every reader in
       step). */
    const wrongMv = WRONG && WALK.WRONG_MOVES[st.kind];
    let mv = wrongMv || WALK.MOVES[st.kind];
    if (wrongMv) {
      let deferred = false;
      try { deferred = await page.evaluate(wrongMv) === 'defer'; }
      catch (e) { deferred = false; /* re-detected next turn */ }
      if (!deferred) { await sleep(WALK.SETTLE[st.kind] || 700); continue; }
      mv = WALK.MOVES[st.kind];
    }
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

/* ═══════════ A PAIRED SET-PIECE NEEDS A REAL PARTNER (K42b, 14 Sep 2026) ═══
   Both Lesson 3s put the pupil with a partner — the Chatbot Swap and the
   Prediction Match — and three of the screens a teacher most needs on the board
   exist only for a pupil who HAS one: the waiting card with the character on
   it, the PARTNER FOUND card with her call sign, and the seat where her
   partner's work is on her screen. The preview will pair a lone pupil with its
   simulated partner after twenty seconds, and that partner is called "Pixel
   (simulated)" — projected, that is the Press Night fault again (DFM 225b's
   word SIMULATED on a slide). So a SECOND REAL preview pupil is staged on the
   two-account rig qa-swap-paired built, and driven in step with the walk:

     1. she walks to the door of the paired chunk on her own, with the ordinary
        movers, and stops there; the photographed pupil is HELD at her own door
        until the partner is standing at hers, so the wait about to be
        photographed is a real one and the simulated partner never has time;
     2. the photographed pupil opens her door and genuinely waits; the character
        mounts after the lesson's own `sideAfterMs`; the waiting card is taken;
     3. only then does the partner open hers — and the PARTNER FOUND card is
        photographed the instant it appears, before the walk presses its button;
     4. from there the partner keeps pace, one or two ordinary moves per turn,
        with ONE more hold: in the Match she never locks a prediction while the
        photographed pupil's "locked in, waiting" picture is still owed, so that
        state really exists on screen before the reveal is allowed to happen.

   Nothing here steers the photographed walk toward a picture (the rule at the
   top of this file); it steers the PARTNER, and the pictures are still taken
   only when their own predicates hold. */
async function stagePartner(ctx, lesson, lj) {
  /* `orders` (14 Sep 2026): J3 Lesson 4's Rush pairs through the same PairKit
     door — its beginLabel opens the wait, and the partner keeps pace with the
     ordinary ord-form / ord-check movers once matched */
  const paired = (lj.chunks || []).find(c => c.engine === 'chatswap' || c.engine === 'duel' || c.engine === 'orders');
  if (!paired) throw new Error(lesson + ': the plan photographs a paired screen but the lesson has no paired chunk');
  const doorChunk = paired.id;
  const doorLabel = String((paired.config || {}).beginLabel || '').trim();
  const order = (lj.chunks || []).map(c => c.id);
  const who = PARTNER_OF[yearOf(lesson)];
  console.log('  · staging a real partner (' + who + ') for the ' + doorChunk +
    ' — the preview\'s simulated one would be projected…');
  const pB = await pupil(ctx, who, lesson, false, { pairing: true });
  const st = { doorOpen: false, done: false, held: 0 };
  const atDoor = (pg) => pg.evaluate((a) => {
    const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
    if (!s || s.id !== a.chunk) return false;
    if (document.querySelector('.pair-wait, .swap-card, .duel-card, .pair-pop, .ord-form-card, .ord-card-own')) return false;
    const b = Array.from(document.querySelectorAll('.chunk-host button.primary-btn'))
      .find(x => x.offsetParent !== null && !x.disabled && (x.textContent || '').trim() === a.label);
    return !!b;
  }, { chunk: doorChunk, label: doorLabel });
  const pressDoor = (pg) => pg.evaluate((a) => {
    const b = Array.from(document.querySelectorAll('.chunk-host button.primary-btn'))
      .find(x => x.offsetParent !== null && !x.disabled && (x.textContent || '').trim() === a.label);
    if (b) b.click();
    return !!b;
  }, { label: doorLabel });
  const idx = id => order.indexOf(id);

  /* one ordinary step for the partner — the shared movers, then the same plain
     fallbacks qa-swap-paired's advance() uses; `noLock` holds a Match commit */
  async function stepB(noLock) {
    const k = await pB.evaluate(WALK.detectKind);
    if (!k) return 'nothing';
    if (noLock && k.kind === 'duel-lock') return 'held-lock';
    const mv = WALK.MOVES[k.kind];
    if (mv) {
      try { await pB.evaluate(mv); } catch (e) { /* re-detected next turn */ }
      await sleep(Math.min(WALK.SETTLE[k.kind] || 600, 1400));
      return k.kind;
    }
    if (WALK.ACTIONS[k.kind]) {
      try { await WALK.ACTIONS[k.kind](pB); } catch (e) {}
      await sleep(700);
      return k.kind;
    }
    await pB.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const vis = (e) => e && e.offsetParent !== null && !e.disabled;
      const pop = q('.badge-pop button'); if (vis(pop)) { pop.click(); return; }
      const skip = q('.intro-skip'); if (vis(skip)) { skip.click(); return; }
      const opt = q('.chunk-host .q-opt'); if (vis(opt)) { opt.click(); return; }
      for (const b of document.querySelectorAll('.chunk-host button.primary-btn, .chunk-host button.ghost-btn')) {
        if (vis(b) && !/Running out of time|leave|Leave/i.test(b.textContent)) { b.click(); return; }
      }
    });
    await sleep(700);
    return k.kind + '*';
  }

  async function tick(pageA, owed, sweep) {
    if (st.done) return null;
    const ckB = await pB.evaluate(WALK.chunkNow);
    if (idx(ckB) > idx(doorChunk)) {
      st.done = true;
      console.log('  · the partner is through the ' + doorChunk + ' — she is not needed again');
      return null;
    }
    if (!st.doorOpen) {
      const bAtDoor = ckB === doorChunk && await atDoor(pB);
      if (!bAtDoor) {
        /* she walks; the photographed pupil is held at her own door meanwhile */
        await stepB(false);
        const ckA = await pageA.evaluate(WALK.chunkNow);
        if (ckA === doorChunk && await atDoor(pageA)) {
          if (++st.held % 10 === 1) console.log('   · (holding at the door until the partner arrives — ' + who + ' is at ' + ckB + ')');
          return { holdA: true };
        }
        return null;
      }
      /* both at the door. The photographed pupil opens hers by her own next move
         and waits; nothing happens here until her waiting card has been taken */
      if (owed.has('wait')) return null;
      const pressed = await pressDoor(pB);
      if (!pressed) return null;
      st.doorOpen = true;
      console.log('   · (the partner opened her door; watching for the PARTNER FOUND card)');
      /* the card is up only until the walk presses its button: photograph it the
         moment the poll brings it, before the walk gets its turn */
      for (let i = 0; i < 60 && owed.has('matched'); i++) {
        await sleep(400);
        await sweep();
      }
      if (owed.has('matched')) console.log('   !! the PARTNER FOUND card never showed a real call sign within 24s');
      return null;
    }
    /* after the door: keep pace, two steps a turn, never committing a Match
       prediction while the locked-in picture is still owed */
    const noLock = owed.has('locked');
    await stepB(noLock);
    await stepB(noLock);
    return null;
  }
  return { tick, close: async () => { try { await pB.close(); } catch (e) {} } };
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
    /* a lesson whose plan photographs a paired screen is staged with pairing ON
       and a second real pupil (derived from the rows, DFM 271) */
    const PAIRED = Object.values(deckPlan).some(r => /pair-wait|pair-pop/.test(String(r.selector)));
    const page = await pupil(ctx, WHO_OF[yearOf(lesson)], lesson, true, { pairing: PAIRED });
    const partner = PAIRED ? await stagePartner(ctx, lesson, lj) : null;
    const take = {
      tick: partner ? partner.tick : null,
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
        /* ── THE APP'S OWN CHROME MUST NOT LAND IN THE PICTURE (19 Aug 2026) ──
           `.topbar` is `position: sticky; top: 0`, so when Playwright scrolls a
           card TALLER THAN THE VIEWPORT into frame to photograph it, the bar
           parks itself over the top of that card — and the element screenshot
           takes it with it. The two Python cards are the first cards on this
           platform tall enough to trigger it (2,022 and 2,892 device pixels),
           and the result was a dark band across the card's own HEADING with a
           stray letter from the bar's title showing at the left edge. Projected
           eight feet wide, that is a slide whose first line cannot be read.
           So every fixed or sticky element that is NOT part of the thing being
           photographed is hidden for the shutter and put straight back. Nothing
           inside the picture changes; what leaves is furniture that was never
           part of the screen being claimed. `visibility` rather than `display`,
           so no layout moves and the predicate that was true a moment ago is
           still true after (it is re-checked below, and would catch it if not). */
        let crop = null;
        const measureCrop = async () => el.evaluate((node, sels) => {
            const a = node.getBoundingClientRect();
            if (!a.height) return null;
            const out = { to: sels.to || null, keepFrac: 1, from: sels.from || null, fromFrac: 0 };
            /* THE AIR NEVER SHOWS A NEIGHBOUR (14 Sep 2026). The little margin
               above and below a crop used to be a flat 14/16px, and on the L4
               briefing cards that was enough to catch one line of the paragraph
               next door: a projected slide with a sentence cut mid-word along
               its edge. So the air is now the lesser of the flat margin and
               HALF the gap to the nearest text-bearing element on that side —
               measured, never assumed. Inside a tight card the crop closes up;
               inside a roomy one it keeps its air. */
            const texty = [...node.querySelectorAll('*')].filter(e => {
              if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
              const r = e.getBoundingClientRect();
              return r.height > 0 && r.width > 0 && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
            }).map(e => e.getBoundingClientRect());
            if (sels.to) {
              const inner = node.querySelector(sels.to);
              if (!inner) return null;
              const b = inner.getBoundingClientRect().bottom;
              const below = texty.filter(r => r.top >= b - 0.5).map(r => r.top - b);
              const air = below.length ? Math.max(0, Math.min(16, Math.floor(Math.min(...below) / 2))) : 16;
              out.keepFrac = Math.min(1, (b - a.top + air) / a.height);
            }
            /* `cropFrom` starts the picture at an element's top, with a little
               air above it — the same measured-fraction discipline as cropTo */
            if (sels.from) {
              const start = node.querySelector(sels.from);
              if (!start) return null;
              const t = start.getBoundingClientRect().top;
              const above = texty.filter(r => r.bottom <= t + 0.5).map(r => t - r.bottom);
              const air = above.length ? Math.max(0, Math.min(14, Math.floor(Math.min(...above) / 2))) : 14;
              out.fromFrac = Math.max(0, (t - a.top - air) / a.height);
            }
            if (out.fromFrac >= out.keepFrac) return null;
            return out;
          }, { to: spec.cropTo || null, from: spec.cropFrom || null });
        let retakes = 0;
        for (;;) {
        const cropBeforeShot = (spec.cropTo || spec.cropFrom) ? await measureCrop() : null;
        const unchromed = await el.evaluate((node) => {
          const hidden = [];
          Array.from(document.querySelectorAll('body *')).forEach(e => {
            const pos = getComputedStyle(e).position;
            if (pos !== 'fixed' && pos !== 'sticky') return;
            if (e === node || e.contains(node) || node.contains(e)) return;
            if (e.offsetParent === null && pos !== 'fixed') return;
            hidden.push([e, e.style.visibility]);
            e.style.visibility = 'hidden';
          });
          window.__unchrome = hidden;
          return hidden.length;
        });
        await el.screenshot({ path: raw });
        await pg.evaluate(() => {
          (window.__unchrome || []).forEach(([e, v]) => { e.style.visibility = v || ''; });
          window.__unchrome = null;
        });
        if (unchromed) console.log('      (' + unchromed + ' fixed/sticky element(s) held back for the shutter)');
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
        if (spec.cropTo || spec.cropFrom) {
          crop = await measureCrop();
          /* MEASURED TWICE, EITHER SIDE OF THE SHUTTER (14 Sep 2026). The J3
             briefing's demo note faded in a beat after its last row, between the
             screenshot and the measurement: the fractions were read off a taller
             card than the one in the picture, and the crop started a line early
             and ended a line short. The crop is measured BEFORE the shot (above,
             `cropBefore`) and again after; if the card moved between the two, the
             picture is of a moving screen and is taken again, up to three times. */
          const cropBefore = cropBeforeShot;
          if (cropBefore && crop && (Math.abs(cropBefore.keepFrac - crop.keepFrac) > 0.002 ||
              Math.abs(cropBefore.fromFrac - crop.fromFrac) > 0.002)) {
            if (retakes < 3) {
              retakes++;
              console.log('      (the card changed height under the shutter — taking "' + name + '" again, ' + retakes + ' of 3)');
              await pg.waitForTimeout(900);
              continue;
            }
            await abort(pg, '"' + name + '" kept changing height under the shutter — a screen still moving is not a screen to project');
          }
          if (!crop) {
            await abort(pg, '"' + name + '" declares cropTo/cropFrom "' + (spec.cropTo || '') + '" / "' +
              (spec.cropFrom || '') + '", and the element photographed has no such descendant (or they cross)');
          }
        }
        break;
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
          crop: crop ? { to: crop.to, keepFrac: Math.round(crop.keepFrac * 1000) / 1000,
                         from: crop.from, fromFrac: Math.round(crop.fromFrac * 1000) / 1000 } : null,
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
    if (partner) await partner.close();
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
