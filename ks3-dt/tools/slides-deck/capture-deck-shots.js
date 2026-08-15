#!/usr/bin/env node
/* capture-deck-shots.js — the pupil screens that go ON the teacher deck
 * (DFM 219b: the teacher points at the board and says "you're going to see
 * this, which means…", so the screen is familiar before the pupil meets it).
 *
 * ─── WHY THIS FILE WAS REWRITTEN, 15 AUGUST 2026 (DFM 225b) ────────────────
 * The first version shipped three slides carrying the WRONG SCREEN. Slides 14,
 * 15 and 16 — the Licence Exam, the codename and the closing screens — all
 * showed the Vault's inbox, eight feet wide, in front of a class.
 *
 * The cause, proved rather than guessed: this script carried its OWN little
 * navigator, and that navigator could not DRAG. Lesson 1's Vault is a drag
 * activity, so the walk stalled there for ever. Then `advanceTo` returned
 * false — correctly, honestly, saying "I never got there" — and NOBODY LOOKED
 * AT THE ANSWER. The next line photographed whatever happened to be on screen
 * and filed it under the name of a screen it had never reached.
 *
 * Two things are therefore true of this version, and they are the whole point:
 *
 *   1. IT MOVES THE WAY THE TAUGHT WALKER MOVES. The walker that CAN drive
 *      Lesson 1 existed all along in sit-review.js — the Vault drag and the
 *      press-and-hold oath signature. Those moves are used here, matched to
 *      that file (see `vaultDrag` / `holdSign`), instead of a dumber copy.
 *   2. IT FAILS LOUDLY. Every arrival is ASSERTED: an unreached target aborts
 *      the run and NAMES the screen the walk actually ended on. A shot is only
 *      taken while the predicate that names it is TRUE — checked immediately
 *      before the shutter and again immediately after — and every shot writes a
 *      manifest row (name, chunk, selector, the words that were on the card,
 *      the contentVersion) that `qa-deck-shots` re-verifies against the
 *      lesson's own packed content, with a planted mislabelled control.
 *
 * A capture that cannot prove where it was standing is not a capture.
 *
 * Usage: node capture-deck-shots.js [--base http://localhost:8140]
 *                                   [--only solo|paired] [--keep]
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('../record-tutorial/node_modules/playwright');
const { THEMES, frameShot } = require('./make-deck-art.js');

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8140');
const ONLY = argOf('--only', '');
const LESSON = 'j1-01';
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'platform', 'assets', 'img', 'deck', LESSON);
const RAW = path.join(OUT, '_raw');
const MANIFEST = path.join(OUT, 'shots-manifest.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const theme = THEMES[LESSON];

const CONTENT_VERSION = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'content', 'index.json'), 'utf8')).contentVersion;

/* THE FRESHNESS RATCHET (template §6). A shot goes stale when the SCREEN IT
   SHOWS changes — not when some unrelated string elsewhere bumps the build
   number. So each row carries a fingerprint of its own chunk's packed content;
   qa-deck-shots recomputes it and fails the pack if the chunk has moved since
   the picture was taken. contentVersion is recorded beside it for the record. */
const crypto = require('crypto');
const LESSON_JSON = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'content', 'j1', 'lessons', LESSON + '.json'), 'utf8'));
function chunkOf(chunkId) {
  return (LESSON_JSON.chunks || []).find(x => x.id === chunkId) || null;
}
function chunkHash(chunkId) {
  const c = chunkOf(chunkId);
  if (!c) return null;
  return crypto.createHash('md5').update(JSON.stringify(c)).digest('hex').slice(0, 12);
}
/* every sentence this chunk owns, flattened, so a line read off the card can be
   matched against the lesson's own words */
function chunkStrings(chunkId) {
  const out = [];
  (function walk(v) {
    if (typeof v === 'string') out.push(v.replace(/\s+/g, ' ').trim());
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k]));
  })(chunkOf(chunkId));
  return out;
}
/* THE ANCHOR — the longest line on the photographed card that is VERBATIM one
   of the declared chunk's own sentences. This is what makes a mislabelled
   picture impossible to file quietly: a shot of the Vault declared as the
   Licence Exam has no line of the exam's words anywhere on it, so it has no
   anchor, and `qa-deck-shots` then demands a pinned expectation it does not
   have. Screens the ENGINE draws (the codename picker, the pairing pop) own no
   lesson sentences at all and are pinned in the gate instead. */
function contentAnchor(chunkId, lines) {
  const own = chunkStrings(chunkId);
  const hits = lines.filter(l => own.some(s => s === l || s.includes(l) || l.includes(s)) &&
    l.length >= 20);
  return hits.sort((a, b) => b.length - a.length)[0] || null;
}

fs.mkdirSync(RAW, { recursive: true });

/* ══════════════════════════ THE SHOT LIST ══════════════════════════════════
   Each shot declares the CHUNK it belongs to and the predicate that proves the
   app is standing on it. The chunk is the shot's own truth, not the slide's:
   the warm-up picture sits on a slide about the briefing, but it is taken in
   `calibration`, and that is what the manifest records and the gate checks. */
const SHOTS = {
  warmup: {
    chunk: 'calibration',
    selector: '.chunk-host .q-card',
    /* A MARKED ANSWER, its verdict and its reason on screen — the teaching
       point of the slide. `.q-feedback` is in the DOM from the moment a
       question renders, carrying the `hidden` attribute until an answer is
       marked, so PRESENCE proves nothing: the panel must be unhidden and have
       words in it. (Asking the loose question here would have photographed an
       unanswered question and called it a marked one.) */
    at: () => {
      const h = document.querySelector('.chunk-host');
      if (!h || !h.querySelector('.q-stem')) return false;
      const fb = h.querySelector('.q-feedback');
      return !!fb && !fb.hasAttribute('hidden') && (fb.textContent || '').trim().length > 10;
    },
    says: 'a warm-up question, answered, verdict and reason on screen'
  },
  'vault-door': {
    chunk: 'b3-vault',
    selector: '.chunk-host .card',
    at: () => {
      const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
      if (!s || s.id !== 'b3-vault') return false;
      const btns = Array.from(document.querySelectorAll('.chunk-host button'));
      return btns.some(b => /open the vault/i.test(b.textContent || ''));
    },
    says: 'the Vault door, before it is opened'
  },
  realvault: {
    chunk: 'realvault',
    selector: '.chunk-host .card',
    at: () => {
      const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
      if (!s || s.id !== 'realvault') return false;
      /* THE STEPS, not the intro card that opens the part. The intro is one
         sentence and a Start button — it shows a class nothing they need to
         recognise. The steps card is the screen a pupil actually works
         through, with "Open your real Drive" and "Spot the + New button" on
         it, and that is what the teacher points at (DFM 219b). */
      return !!document.querySelector('.chunk-host .confirm-step');
    },
    says: 'the Real Vault steps card (Open your real Drive · the + New button)'
  },
  'exam-question': {
    chunk: 'b4-exam',
    selector: '.chunk-host .q-card',
    at: () => {
      const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
      if (!s || s.id !== 'b4-exam') return false;
      const h = document.querySelector('.chunk-host');
      if (!h || !h.querySelector('.q-stem')) return false;
      /* UNANSWERED: live options, and the feedback panel still hidden */
      const fb = h.querySelector('.q-feedback');
      return !!h.querySelector('.q-opt:not([disabled])') &&
        (!fb || fb.hasAttribute('hidden'));
    },
    says: 'a Licence Exam question, not yet answered'
  },
  'exam-saved': {
    chunk: 'b4-exam',
    selector: '.chunk-host .q-card',
    at: () => {
      const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
      if (!s || s.id !== 'b4-exam') return false;
      const h = document.querySelector('.chunk-host');
      if (!h) return false;
      /* THE ONE THAT WORRIES THEM. The exam is the `neutral` runner: it never
         marks anything, so there is no verdict panel at all — the words appear
         INSIDE the option she pressed, as `.q-logged`. Asking the screen at
         large would have matched the exam's own intro card, which quotes the
         phrase ("you will see 'Answer saved'"), and photographed that instead. */
      const lg = h.querySelector('.q-opt.logged .q-logged');
      return !!lg && /answer saved/i.test(lg.textContent || '');
    },
    says: 'the "Answer saved" state'
  },
  codename: {
    chunk: 'b5-codename',
    selector: '.chunk-host .codename-card',
    at: () => {
      const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
      if (!s || s.id !== 'b5-codename') return false;
      const h = document.querySelector('.chunk-host');
      /* the PICKER, with its shuffle still live — not the intro card that
         precedes it and not the oath card that follows it */
      return !!h && !!h.querySelector('.codename-card #cn-shuffle') &&
        !h.querySelector('.oath-card');
    },
    says: 'the codename picker, before it is signed'
  },
  selfeval: {
    chunk: 'selfeval',
    selector: '.chunk-host .se-card',
    at: () => {
      const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
      if (!s || s.id !== 'selfeval') return false;
      return !!document.querySelector('.se-card');
    },
    says: 'the "How did it go?" screen'
  },
  'vault-waiting': {
    chunk: 'b3-vault',
    selector: '.chunk-host .card',
    at: () => {
      const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
      if (!s || s.id !== 'b3-vault') return false;
      const h = document.querySelector('.chunk-host');
      return !!h && /(waiting|finding|looking for)/i.test(h.textContent || '') &&
        !document.querySelector('.pair-pop');
    },
    says: 'the waiting card, while a partner is found'
  },
  'vault-matched': {
    chunk: 'b3-vault',
    selector: '.pair-pop .badge-pop-card',
    at: () => {
      const pop = document.querySelector('.pair-pop');
      return !!pop && (pop.textContent || '').trim().length > 20;
    },
    says: 'the pop-up that names her partner'
  }
};

/* ══════════════════════ THE MANIFEST (the proof) ═══════════════════════════
   Every shot writes what it saw. A picture on a slide is a CLAIM about a
   screen, and this is the evidence for that claim. */
function loadManifest() {
  if (!fs.existsSync(MANIFEST)) return { lesson: LESSON, shots: {} };
  try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); }
  catch (e) { return { lesson: LESSON, shots: {} }; }
}
let manifest = loadManifest();
function writeManifest() {
  manifest.lesson = LESSON;
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
}

/* ════════════════════════ FAILING LOUDLY ══════════════════════════════════ */
async function where(page) {
  try {
    return await page.evaluate(() => {
      const s = window.App && App.state && App.state.chunks &&
        App.state.chunks[App.state.chunkIdx];
      const h = document.querySelector('.chunk-host');
      const head = h && h.querySelector('h1, h2, h3');
      return {
        chunk: s ? s.id : '(no chunk)',
        heading: head ? (head.textContent || '').trim().slice(0, 80) : '(no heading)',
        text: h ? (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) : '(no host)'
      };
    });
  } catch (e) { return { chunk: '(page gone)', heading: '', text: e.message }; }
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
  console.error('   (This is the check that was missing when Slides 14–16 shipped');
  console.error('    the Vault under three other screens'+"'"+' names — DFM 225b.)');
  throw new Error('capture aborted: ' + msg);
}

/* ════════════════════ THE TAUGHT MOVES (from sit-review.js) ═══════════════
   Matched to `sit-review.js`'s `vault` and `hold-sign` cases. Lesson 1 cannot
   be walked without them: a vault file is not a button, and the oath's sign
   control does nothing at all on a plain click. */
async function vaultDrag(page) {
  return page.evaluate(async () => {
    const sleep2 = ms => new Promise(r => setTimeout(r, ms));
    const centre = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    const drag = async (fileEl, folderEl) => {
      const a = centre(fileEl), b = centre(folderEl);
      const ev = (type, pt) => fileEl.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 1, isPrimary: true,
        clientX: pt.x, clientY: pt.y
      }));
      /* the engine calls setPointerCapture, which would redirect the later
         events to the node; a stub keeps the synthetic drag alive */
      if (!fileEl.setPointerCapture) fileEl.setPointerCapture = () => {};
      ev('pointerdown', a);
      await sleep2(30);
      ev('pointermove', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      await sleep2(30);
      ev('pointermove', b);
      await sleep2(30);
      ev('pointerup', b);
      await sleep2(320);
    };
    const report = [];
    for (let guard = 0; guard < 40; guard++) {
      const file = document.querySelector('.chunk-host .vault-file:not(.filed)');
      if (!file) break;
      const folders = Array.from(document.querySelectorAll('.chunk-host .vault-folder'));
      if (!folders.length) break;
      let done = false, tries = 0;
      for (const fo of folders) {
        tries++;
        await drag(file, fo);
        if (file.classList.contains('filed')) {
          report.push((file.getAttribute('data-id') || '?') + ' filed on try ' + tries);
          done = true; break;
        }
      }
      if (!done) { report.push((file.getAttribute('data-id') || '?') + ' REFUSED BY EVERY FOLDER'); break; }
    }
    return report;
  });
}

async function holdSign(page) {
  return page.evaluate(async () => {
    const sleep2 = ms => new Promise(r => setTimeout(r, ms));
    const b = document.querySelector('.chunk-host .oath-sign, .chunk-host .hold-btn, .chunk-host [class*="hold"]');
    if (!b) return false;
    const r = b.getBoundingClientRect();
    const pt = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    const ev = (t) => b.dispatchEvent(new PointerEvent(t, Object.assign({
      bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }, pt)));
    if (!b.setPointerCapture) b.setPointerCapture = () => {};
    ev('pointerdown');
    await sleep2(1800);            /* the hold is 1200ms; hold past it */
    ev('pointerup');
    return true;
  });
}

/* one step of the walk, in sit-review's priority order, trimmed to Lesson 1 */
async function stepOnce(page) {
  const kind = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const vis = e => e && e.offsetParent !== null && !e.disabled;
    if (q('.badge-pop button') && !q('.pair-pop')) return 'badge';
    if (vis(q('.dossier-cta'))) return 'dossier';
    if (q('.chunk-host .vault-file:not(.filed)') && vis(q('.chunk-host .vault-folder'))) return 'vault';
    if (vis(q('.chunk-host .oath-sign:not([disabled])'))) return 'hold-sign';
    if (vis(q('.chunk-host .q-feedback button'))) return 'q-next';
    if (q('.chunk-host .q-opt:not([disabled])')) return 'q-opt';
    if (q('.chunk-host .confirm-step:not(.ticked):not([disabled]):not(.locked)')) return 'confirm';
    if (vis(q('.chunk-host .tour-callout button'))) return 'tour';
    const host = q('.chunk-host');
    if (!host) return 'nohost';
    const ta = Array.from(host.querySelectorAll('textarea, input[type=text], input:not([type])'))
      .filter(vis).filter(e => !e.value);
    if (ta.length) return 'input';
    if (Array.from(host.querySelectorAll('button')).filter(vis)
      .some(b => b.classList.contains('primary-btn'))) return 'primary';
    return 'stuck';
  });

  switch (kind) {
    case 'vault': { await vaultDrag(page); await sleep(900); return kind; }
    case 'hold-sign': { await holdSign(page); await sleep(1800); return kind; }
    case 'input':
      await page.evaluate(() => {
        const vis = e => e && e.offsetParent !== null && !e.disabled;
        const t = Array.from(document.querySelectorAll('.chunk-host textarea, .chunk-host input[type=text], .chunk-host input:not([type])'))
          .filter(vis).filter(e => !e.value)[0];
        if (t) { t.value = 'Preview capture run.'; t.dispatchEvent(new Event('input', { bubbles: true })); }
      });
      await sleep(400); return kind;
    default:
      await page.evaluate(() => {
        const q = s => document.querySelector(s);
        const vis = e => e && e.offsetParent !== null && !e.disabled;
        const pop = q('.badge-pop button'); if (pop && !q('.pair-pop')) return pop.click();
        const dc = q('.dossier-cta'); if (vis(dc)) return dc.click();
        const nx = Array.from(document.querySelectorAll('.chunk-host .q-feedback button')).filter(vis)[0];
        if (nx) return nx.click();
        const o = Array.from(document.querySelectorAll('.chunk-host .q-opt:not([disabled])')).filter(vis)[0];
        if (o) return o.click();
        const c = q('.chunk-host .confirm-step:not(.ticked):not([disabled]):not(.locked)');
        if (c) return c.click();
        const tour = q('.chunk-host .tour-callout button'); if (vis(tour)) return tour.click();
        const b = Array.from(document.querySelectorAll('.chunk-host button')).filter(vis)
          .find(e => e.classList.contains('primary-btn'));
        if (b) return b.click();
      });
      await sleep(650); return kind;
  }
}

/* walk forward until the predicate is TRUE — and say so honestly if it is not */
async function advanceTo(page, test, budget) {
  for (let i = 0; i < (budget || 120); i++) {
    if (await page.evaluate(test)) return true;
    await stepOnce(page);
  }
  return await page.evaluate(test);
}

/* ═══════════════════ THE SHUTTER (predicate true, or nothing) ═════════════ */
async function shoot(page, name) {
  const shot = SHOTS[name];
  if (!shot) throw new Error('no shot declared called ' + name);

  /* CHECKED IMMEDIATELY BEFORE THE SHUTTER — not earlier, not "probably" */
  if (!await page.evaluate(shot.at)) {
    await abort(page, 'the predicate for "' + name + '" (' + shot.says + ') is not true at the shutter');
  }
  const el = await page.$(shot.selector) ||
    await page.$('.chunk-host .card') || await page.$('.chunk-host');
  if (!el) await abort(page, 'nothing to photograph for "' + name + '" (' + shot.selector + ')');

  /* the words that were actually on the card, read from the element being
     photographed — this is what qa-deck-shots holds the picture to */
  const lines = await el.evaluate((node) => (node.innerText || '').split('\n')
    .map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean));
  const long = lines.filter(l => l.length >= 20).sort((a, b) => b.length - a.length);
  const snippet = (long[0] || lines.join(' ')).slice(0, 200);
  const anchor = contentAnchor(shot.chunk, lines);

  const raw = path.join(RAW, name + '.png');
  await el.screenshot({ path: raw });

  /* AND AGAIN AFTER: a screen that moved under the shutter is a screen that
     was photographed mid-change, and that picture goes on a projector */
  if (!await page.evaluate(shot.at)) {
    await abort(page, '"' + name + '" moved off its screen while it was being photographed');
  }

  const framed = path.join(OUT, 'shot-' + name + '.png');
  const size = await frameShot(raw, framed, theme);
  manifest.shots[name] = {
    name,
    chunkId: shot.chunk,
    selector: shot.selector,
    textSnippet: snippet,
    contentAnchor: anchor,
    /* the whole card, so a pinned expectation can be checked against what the
       screen SAID rather than against whichever line happened to be longest */
    cardText: lines.join(' · ').slice(0, 500),
    contentVersion: CONTENT_VERSION,
    chunkHash: chunkHash(shot.chunk),
    px: size.w + 'x' + size.h
  };
  writeManifest();
  console.log('  ✓ shot-' + name + '.png  ' + size.w + 'x' + size.h + '  [' + shot.chunk + ']');
  console.log('      card said: "' + snippet.slice(0, 90) + (snippet.length > 90 ? '…' : '') + '"');
  console.log('      anchor   : ' + (anchor
    ? '"' + anchor.slice(0, 70) + (anchor.length > 70 ? '…' : '') + '" — this chunk\'s own words'
    : '(none — the engine draws this screen; the gate holds a pinned expectation)'));
}

/* ═════════════════════════ staging a pupil ════════════════════════════════ */
async function pupil(ctx, who, pairing, fresh) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-8A&as=' + who,
    { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  /* THE PREVIEW "SERVER" IS localStorage, SO TWO PUPILS MUST SHARE ONE BROWSER
     CONTEXT — a second context is a second world, and the two can never see
     each other's queue entry. So only the FIRST pupil clears the store; the
     second joins the one already there. */
  if (fresh !== false) {
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(1800);
  }
  await page.evaluate((p) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: p };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, pairing);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile'))
      .find(e => /Lesson\s*1(?!\d)/i.test(e.textContent));
    if (t) t.click();
  });
  await sleep(2600);
  return page;
}

/* ═══════════════════════════════ the run ══════════════════════════════════ */
(async () => {
  console.log('capture-deck-shots — ' + LESSON + ' @ contentVersion ' + CONTENT_VERSION);
  const browser = await chromium.launch({ headless: true });

  if (ONLY !== 'paired') {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 940 }, deviceScaleFactor: 2 });
    const page = await pupil(ctx, 'anya', 0);

    /* 1. the warm-up, ANSWERED — the verdict-and-reason moment */
    if (!await advanceTo(page, () => {
      const h = document.querySelector('.chunk-host');
      return !!h && !!h.querySelector('.q-opt:not([disabled])');
    }, 60)) await abort(page, 'never reached the warm-up question');
    await page.evaluate(() => {
      const o = Array.from(document.querySelectorAll('.chunk-host .q-opt:not([disabled])'))
        .filter(e => e.offsetParent !== null)[0];
      if (o) o.click();
    });
    await sleep(1300);
    await shoot(page, 'warmup');

    /* 2. the Vault door, before it opens */
    if (!await advanceTo(page, SHOTS['vault-door'].at, 140))
      await abort(page, 'never reached the Vault door');
    await shoot(page, 'vault-door');

    /* 3. the Real Vault — REACHED THROUGH THE VAULT, WHICH MEANS DRAGGING.
       This is the exact step the old script could not perform, and the reason
       three slides shipped showing the Vault. */
    if (!await advanceTo(page, SHOTS['realvault'].at, 220))
      await abort(page, 'never reached the Real Vault (the Vault drag is the step before it)');
    await shoot(page, 'realvault');

    /* 4. a Licence Exam question, unanswered — then "Answer saved" */
    if (!await advanceTo(page, SHOTS['exam-question'].at, 160))
      await abort(page, 'never reached the Licence Exam');
    await shoot(page, 'exam-question');
    /* "Answer saved" LASTS 650 MILLISECONDS and then the exam moves to the next
       question. A screenshot cannot be taken and framed inside that, so the
       page's own advance timer is HELD while the picture is taken and released
       immediately afterwards. Nothing is faked: these are the exact pixels a
       pupil looks at, held still long enough to photograph. */
    await page.evaluate(() => {
      const real = window.setTimeout;
      window.__held = [];
      window.setTimeout = function (fn, ms) {
        if (ms >= 400 && ms <= 900) { window.__held.push(fn); return 0; }
        return real.apply(window, arguments);
      };
      window.__release = function () {
        window.setTimeout = real;
        (window.__held || []).forEach(f => real(f, 0));
      };
    });
    await sleep(500);                    /* past the 350ms ghost-click guard */
    await page.evaluate(() => {
      const o = Array.from(document.querySelectorAll('.chunk-host .q-opt:not([disabled])'))
        .filter(e => e.offsetParent !== null)[0];
      if (o) o.click();
    });
    await sleep(350);
    if (!await page.evaluate(SHOTS['exam-saved'].at))
      await abort(page, '"Answer saved" never appeared after answering an exam question');
    await shoot(page, 'exam-saved');
    await page.evaluate(() => { if (window.__release) window.__release(); });
    await sleep(900);

    /* 5. the codename picker, BEFORE the oath is signed */
    if (!await advanceTo(page, SHOTS['codename'].at, 240))
      await abort(page, 'never reached the codename picker');
    await shoot(page, 'codename');

    /* 6. How did it go? — the last screen of the hour */
    if (!await advanceTo(page, SHOTS['selfeval'].at, 300))
      await abort(page, 'never reached "How did it go?" (the oath signature is the step before it)');
    await shoot(page, 'selfeval');
    await ctx.close();
  }

  if (ONLY !== 'solo') {
    /* ── the paired Vault states: two real pupils, ONE browser context ──
       The preview spawns a simulated partner for anyone left waiting alone for
       eight seconds — a kindness for one-tab testing and poison for a deck
       slide, because a screenshot projected to a class must not name a partner
       who does not exist. So both pupils are staged AT the door before either
       presses it, and the second presses inside the window.

       WHICH TWO PUPILS IS NOT A DETAIL — IT WAS THE WHOLE FAULT. Every earlier
       attempt used Anya and Cara, and Anya was paired with the bot every single
       time no matter how the presses were staged. The reason was never timing:
       CARA'S SEEDED RECORD ALREADY HAS LESSON 1 FINISHED (state 2, 105 XP, a
       self-evaluation comment), so opening Lesson 1 puts her in CATCH-UP — and
       PairKit's first line sends a catch-up pupil straight to a solo run, which
       means she never joins the queue at all. Anya then waits alone, correctly,
       and the eight seconds run out.
       So the partner must be a pupil with NO Lesson 1 record: Anya (no seeded
       record at all) with Sean O'Hagan (`L: {}`), and Erin Mallon — also
       Lesson-1-less — for the waiting card. */
    const cPair = await browser.newContext({ viewport: { width: 1280, height: 940 }, deviceScaleFactor: 2 });
    const pA = await pupil(cPair, 'anya', 1);
    const pB = await pupil(cPair, 'sean', 1, false);

    const atDoor = (p) => advanceTo(p, () => {
      const st = window.App && App.state && App.state.chunks[App.state.chunkIdx];
      if (!st || st.id !== 'b3-vault') return false;
      return Array.from(document.querySelectorAll('.chunk-host button'))
        .some(b => b.offsetParent !== null && !b.disabled && /open the vault/i.test(b.textContent || ''));
    }, 160);

    if (!await atDoor(pA)) await abort(pA, 'pupil A never reached the Vault door');
    if (!await atDoor(pB)) await abort(pB, 'pupil B never reached the Vault door');

    const press = (p) => p.evaluate(() => {
      const door = Array.from(document.querySelectorAll('.chunk-host button'))
        .filter(e => e.offsetParent !== null && !e.disabled)
        .find(e => /open the vault/i.test(e.textContent || ''));
      if (!door) return false;
      door.click();
      return true;
    });
    /* BOTH PRESSES INSIDE THE EIGHT SECONDS, and nothing slow in between:
       the earlier attempt took the waiting shot between the two presses, and
       the screenshot plus its framing pushed the second press past the bot
       timer every single time. */
    const okA = await press(pA);
    await sleep(700);
    const okB = await press(pB);
    if (!okA || !okB) await abort(pA, 'the Vault door button was not pressable for both pupils');

    let matched = false;
    for (let i = 0; i < 20 && !matched; i++) {
      await sleep(600);
      matched = await pA.evaluate(SHOTS['vault-matched'].at);
    }
    if (matched) {
      const who = await pA.evaluate(() => {
        const pop = document.querySelector('.pair-pop');
        return pop ? (pop.textContent || '').replace(/\s+/g, ' ').trim() : '';
      });
      if (/simulated/i.test(who)) {
        console.error('  !! the partner is the PREVIEW BOT — that name cannot go on a slide.');
        await abort(pA, 'paired with the simulated partner, not a real second pupil');
      }
      await shoot(pA, 'vault-matched');
      console.log('  (paired with a real second pupil: ' + who.slice(0, 90) + ')');
    } else {
      console.error('  !! the two pupils did not pair inside the bot window — no matched shot taken.');
      console.error('     (Nothing was photographed under that name. See the run record.)');
    }

    /* the waiting state, on its own: a pupil at the door with nobody left to
       pair with sees exactly this */
    const pC = await pupil(cPair, 'erin', 1, false);
    if (!await atDoor(pC)) await abort(pC, 'the third pupil never reached the Vault door');
    await press(pC);
    await sleep(2000);
    if (await pC.evaluate(SHOTS['vault-waiting'].at)) {
      await shoot(pC, 'vault-waiting');
    } else {
      console.error('  !! the waiting card never showed — no waiting shot taken.');
    }
    await cPair.close();
    if (!matched) { await browser.close(); process.exit(3); }
  }

  await browser.close();
  writeManifest();
  console.log('');
  console.log('manifest: ' + path.relative(ROOT, MANIFEST) +
    '  (' + Object.keys(manifest.shots).length + ' shots @ ' + CONTENT_VERSION + ')');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
