#!/usr/bin/env node
/* qa-deck-shots.js — A PICTURE ON A SLIDE IS A CLAIM ABOUT A SCREEN.
 * This gate makes the claim provable. (DFM 225b, 15 Aug 2026.)
 *
 * WHY IT EXISTS. Lesson 1's deck shipped with Slides 14, 15 and 16 carrying the
 * Vault's inbox under three other screens' names — the Licence Exam, the
 * codename picker and the closing screen — and it was projected eight feet wide
 * in front of a class before anybody noticed. The capture script had asked
 * "did I arrive?", been told NO, and photographed the screen anyway.
 *
 * The capture script now fails loudly at the shutter (see capture-deck-shots.js).
 * This is the SECOND net, and it works on evidence rather than on trust: every
 * shot leaves a manifest row saying which chunk it came from and quoting, word
 * for word, what was on the card. This gate re-reads those rows against the
 * lesson's own packed content and refuses the pack if a picture cannot show it
 * was standing where it says it was.
 *
 * FOR EVERY SHOT A DECK REFERENCES:
 *   1. a manifest row exists;
 *   2. its chunkId is a real chunk of that lesson;
 *   3. its words are that chunk's words — the recorded anchor is verbatim in
 *      the chunk's packed content. Screens the ENGINE draws (the codename
 *      picker, the pairing pop, the waiting card) own no lesson sentences at
 *      all, so they are held to a pinned expectation kept HERE, in the gate,
 *      where a manifest cannot certify itself;
 *   4. the PNG exists on disk;
 *   5. the chunk has not moved since the picture was taken (the freshness
 *      ratchet — a lesson whose screen changes invalidates its own shots).
 *
 * AND IT PROVES ITSELF: a planted fixture whose snippet belongs to a different
 * chunk must be REJECTED, and this gate fails if that fixture ever passes.
 *
 * Usage: node qa-deck-shots.js        (exit 0 = pass, 1 = fail)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const CONTENT = path.join(ROOT, 'content');
const IMG = path.join(ROOT, 'platform', 'assets', 'img', 'deck');

/* ═══════════ THE PINNED EXPECTATIONS (screens the engine draws) ════════════
   These screens carry no sentence from the lesson JSON — the codename picker
   is chrome and a generated name, the pairing pop is the engine's own words.
   So the gate pins what each one MUST say. The pin lives here and not in the
   manifest on purpose: a row that could vouch for itself vouches for nothing. */
const CHROME_PINS = {
  'j1-01': {
    codename: {
      must: [/your codename/i, /shuffle/i, /keep this name/i],
      says: 'the codename picker (label, Shuffle, Keep this name)'
    },
    selfeval: {
      must: [/how did it go/i],
      says: 'the How did it go? screen'
    },
    'vault-waiting': {
      must: [/(waiting|finding|looking)/i],
      says: 'the waiting card while a partner is found'
    },
    'vault-matched': {
      must: [/pair|partner|matched/i],
      says: 'the pop-up that names her partner'
    }
  }
};

const fails = [];
const notes = [];
const fail = m => fails.push(m);

/* ───────────────────────────── helpers ──────────────────────────────────── */
const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

function chunkStrings(chunk) {
  const out = [];
  (function walk(v) {
    if (typeof v === 'string') out.push(norm(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k]));
  })(chunk);
  return out;
}
function chunkHash(chunk) {
  return crypto.createHash('md5').update(JSON.stringify(chunk)).digest('hex').slice(0, 12);
}
function shotsOn(deck) {
  const names = [];
  for (const sec of deck.sections || []) {
    for (const sl of sec.slides || []) {
      if (sl.shot) names.push(sl.shot);
      for (const n of sl.shots || []) names.push(n);
    }
  }
  return Array.from(new Set(names));
}

/* ───────────────── the check, one shot at a time ────────────────────────── */
/* Written as a pure function of (row, lesson, name) so the planted control can
   run the SAME code the real shots run — a control that exercises a copy of the
   logic proves nothing about the logic that ships. */
function checkShot(name, row, lesson, lessonJson, opts) {
  const errs = [];
  const png = path.join(IMG, lesson, 'shot-' + name + '.png');
  const pins = (CHROME_PINS[lesson] || {})[name];

  if (!row) return ['no manifest row — this picture cannot say where it was taken'];

  const chunk = (lessonJson.chunks || []).find(c => c.id === row.chunkId);
  if (!chunk) {
    errs.push('names chunk "' + row.chunkId + '", which is not a chunk of ' + lesson);
    return errs;               /* nothing else can be judged without the chunk */
  }

  if (!row.textSnippet || norm(row.textSnippet).length < 10) {
    errs.push('records no words from the card it photographed');
  }

  const own = chunkStrings(chunk);
  const anchor = norm(row.contentAnchor || '');
  if (anchor) {
    const held = own.some(s => s === anchor || s.includes(anchor) || anchor.includes(s));
    if (!held) {
      errs.push('quotes "' + anchor.slice(0, 60) + '…" as ' + row.chunkId +
        "'s own words, and that sentence is nowhere in " + row.chunkId);
    }
  } else if (pins) {
    /* the WHOLE card, not just its longest line — the pairing pop's longest
       sentence is about keeping real names out of the message box, and the
       words that prove which screen it is ("You've been paired!") sit above it */
    const said = norm(row.cardText || row.textSnippet);
    const missed = pins.must.filter(re => !re.test(said));
    if (missed.length) {
      errs.push('is pinned to be ' + pins.says + ', and the card said "' +
        said.slice(0, 70) + '…" — missing ' + missed.join(', '));
    }
  } else {
    errs.push('has no line of ' + row.chunkId + "'s own words on it, and no pinned " +
      'expectation for a screen the engine draws — so nothing proves what it shows');
  }

  if (!opts || !opts.skipFile) {
    if (!fs.existsSync(png)) errs.push('the picture itself is missing (' + path.relative(ROOT, png) + ')');
  }

  if (!opts || !opts.skipFresh) {
    const now = chunkHash(chunk);
    if (!row.chunkHash) errs.push('records no chunk fingerprint, so its freshness cannot be judged');
    else if (row.chunkHash !== now) {
      errs.push('was taken when ' + row.chunkId + ' looked different (fingerprint ' +
        row.chunkHash + ', now ' + now + ') — re-capture it, or the slide shows a screen ' +
        'the pupils will not meet');
    }
  }
  return errs;
}

/* ───────────────────────────── the run ──────────────────────────────────── */
let checked = 0;
for (const year of fs.readdirSync(CONTENT)) {
  const dir = path.join(CONTENT, year, 'decks');
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.deck.json')) continue;
    const deck = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const lesson = deck.lesson;
    const lessonPath = path.join(CONTENT, year, 'lessons', lesson + '.json');
    if (!fs.existsSync(lessonPath)) { fail(lesson + ': no packed lesson to check its deck against'); continue; }
    const lessonJson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));

    const manPath = path.join(IMG, lesson, 'shots-manifest.json');
    const man = fs.existsSync(manPath)
      ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { shots: {} };

    for (const name of shotsOn(deck)) {
      checked++;
      const errs = checkShot(name, (man.shots || {})[name], lesson, lessonJson);
      errs.forEach(e => fail(lesson + ' › shot "' + name + '" ' + e));
    }
    notes.push(lesson + ': ' + shotsOn(deck).length + ' deck shots checked against ' +
      (lessonJson.chunks || []).length + ' chunks');
  }
}

/* ═════════════════ THE PLANTED CONTROL (DFM 196: controls first) ═══════════
   A row that says it photographed the Licence Exam while quoting the Vault's
   words is EXACTLY the failure this gate exists for — the one that shipped. It
   is fed through the same checkShot the real rows go through, and if it ever
   passes, this gate is broken and says so instead of staying quiet. */
(function control() {
  const lessonPath = path.join(CONTENT, 'j1', 'lessons', 'j1-01.json');
  if (!fs.existsSync(lessonPath)) { fail('CONTROL could not run — j1-01 is not packed'); return; }
  const lessonJson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
  const vault = (lessonJson.chunks || []).find(c => c.id === 'b3-vault');
  const vaultLine = chunkStrings(vault).filter(s => s.length > 40)[0];

  const planted = {
    name: 'exam-question',
    chunkId: 'b4-exam',                      /* the label it claims */
    selector: '.chunk-host .q-card',
    textSnippet: vaultLine,                  /* the screen it actually shows */
    contentAnchor: vaultLine,
    contentVersion: 'control',
    chunkHash: chunkHash((lessonJson.chunks || []).find(c => c.id === 'b4-exam'))
  };
  const errs = checkShot('exam-question', planted, 'j1-01', lessonJson,
    { skipFile: true, skipFresh: true });
  if (!errs.length) {
    fail('THE PLANTED CONTROL PASSED. A shot of the Vault labelled as the Licence ' +
      'Exam was accepted, which means this gate would not have caught the fault it ' +
      'was built for. Fix the gate before trusting any row above.');
  } else {
    notes.push('control: a Vault shot mislabelled "exam-question" was REJECTED — ' +
      errs[0].slice(0, 80) + '…');
  }

  /* the second half of the control: a stale row must fail too */
  const stale = Object.assign({}, planted, {
    textSnippet: 'Which of these is a piece of HARDWARE?',
    contentAnchor: 'Which of these is a piece of HARDWARE?',
    chunkHash: '000000000000'
  });
  const staleErrs = checkShot('exam-question', stale, 'j1-01', lessonJson, { skipFile: true });
  if (!staleErrs.some(e => /looked different/.test(e))) {
    fail('THE FRESHNESS CONTROL PASSED. A shot taken of an older version of the ' +
      'exam chunk was accepted, so stale imagery can still reach a slide.');
  } else {
    notes.push('control: a shot of an older version of b4-exam was REJECTED as stale');
  }
})();

/* ───────────────────────────── the verdict ──────────────────────────────── */
notes.forEach(n => console.log('  ' + n));
if (fails.length) {
  console.error('');
  console.error('qa-deck-shots: FAILED — ' + fails.length + ' problem(s)');
  fails.forEach(f => console.error('  ✗ ' + f));
  console.error('');
  console.error('A deck screenshot is a promise to a class that this is what their');
  console.error('screen will look like. Re-capture with:');
  console.error('  node ks3-dt/tools/slides-deck/capture-deck-shots.js');
  process.exit(1);
}
console.log('qa-deck-shots: PASSED — ' + checked +
  ' deck shots, each proved against the chunk it names, controls rejected');
