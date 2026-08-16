#!/usr/bin/env node
/* qa-deck-art.js — THE ART OF AN EARLIER LESSON NEVER MOVES, AND EVERY THEME IS
 * READABLE (the L2-L5 teacher-layer round, DFM 228d).
 *
 * WHY THIS EXISTS, and it is the ordering rule (DFM 196) made physical.
 * `make-deck-art.js` shipped with ONE theme and one way of drawing it. Lessons
 * 2-5 each want their own motif, which means the single drawing becomes a set of
 * BRANCHES — and the moment a shared function grows a branch, the branch that was
 * there first can be changed by accident and nobody would ever see it, because
 * nobody re-opens Lesson 1's deck to look at its background.
 *
 * So before a single motif was added, this gate was written and fired:
 *   (a) IDENTITY — every theme whose art is already committed must REBUILD
 *       BYTE-IDENTICAL. Not "looks the same": the same md5, from a fresh render,
 *       into a scratch directory that is thrown away. The generator is
 *       deterministic by design (a seeded PRNG), so byte-identity is the honest
 *       bar and anything less would be hiding a change.
 *   (b) CONTRAST — every theme's text/ground, dim/ground and accent/ground pair
 *       measured at >= 4.5:1, the floor his own readability harness set (DFM 207g).
 *       A theme is not a mood board; if the board cannot be read from the back of
 *       the room it has failed before a word is written on it.
 *
 * Both carry controls that must fail, because a guard nobody has seen fail is a
 * guard nobody should trust (DFM 146a / 189's lesson).
 *
 * Usage: node qa-deck-art.js        (exit 0 = pass, 1 = fail)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const ART = path.join(ROOT, 'platform', 'assets', 'img', 'deck');
const MAKER = path.join(ROOT, 'tools', 'slides-deck', 'make-deck-art.js');
const { THEMES } = require(MAKER);

const BACKGROUNDS = ['title', 'section', 'stop', 'closer'];
const FLOOR = 4.5;

const fails = [];
const notes = [];
const fail = m => fails.push(m);

/* ---------- contrast, measured the same way qa-readability measures it ---- */
function lum(hex) {
  const h = hex.replace('#', '');
  const v = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function ratio(a, b) {
  const la = lum(a), lb = lum(b);
  return ((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05));
}

function contrastErrors(id, t) {
  const errs = [];
  /* every pair that actually carries TEXT on this ground in the deck renderer */
  const pairs = [
    ['text', t.text, 'ground', t.ground],
    ['text', t.text, 'panel', t.panel],
    ['dim', t.dim, 'ground', t.ground],
    ['accent', t.accent, 'ground', t.ground],
    ['accent2', t.accent2, 'ground', t.ground]
  ];
  pairs.forEach(([an, a, bn, b]) => {
    if (!a || !b) return;
    const r = ratio(a, b);
    if (r < FLOOR) {
      errs.push(id + ': ' + an + ' ' + a + ' on ' + bn + ' ' + b + ' measures ' +
        r.toFixed(2) + ':1, under the ' + FLOOR + ':1 floor — that text cannot be ' +
        'read from the back of the room');
    }
  });
  return errs;
}

/* ---------- identity: a fresh render, byte for byte -----------------------
   The maker writes into platform/assets, so a rebuild is run against a COPY of
   the tree's output directory: the real art is never touched by a check. */
function identityErrors(id) {
  const dir = path.join(ART, id);
  const committed = BACKGROUNDS
    .map(n => ({ n, p: path.join(dir, n + '-bg.png') }))
    .filter(f => fs.existsSync(f.p));
  if (!committed.length) return { errs: [], checked: 0 };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deckart-'));
  try {
    execFileSync(process.execPath, [MAKER, id], {
      env: Object.assign({}, process.env, { KS3DT_DECK_ART_OUT: tmp }),
      stdio: 'pipe'
    });
  } catch (e) {
    return { errs: [id + ': the art generator refused to run — ' +
      String(e.stderr || e.message).trim().split('\n').slice(-1)[0]], checked: 0 };
  }

  const crypto = require('crypto');
  const md5 = p => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
  const errs = [];
  committed.forEach(f => {
    const fresh = path.join(tmp, id, f.n + '-bg.png');
    if (!fs.existsSync(fresh)) {
      errs.push(id + ': a fresh build no longer produces ' + f.n + '-bg.png at all');
      return;
    }
    const was = md5(f.p), now = md5(fresh);
    if (was !== now) {
      errs.push(id + ': ' + f.n + '-bg.png does NOT rebuild identical — committed ' +
        was.slice(0, 12) + '…, fresh ' + now.slice(0, 12) + '…. An earlier lesson\'s ' +
        'artwork has moved, and nobody would have seen it: nothing reopens that deck.');
    }
  });
  fs.rmSync(tmp, { recursive: true, force: true });
  return { errs, checked: committed.length };
}

/* ---------- run ---------------------------------------------------------- */
const ids = Object.keys(THEMES).sort();
notes.push(ids.length + ' theme(s) registered: ' + ids.join(', '));

ids.forEach(id => contrastErrors(id, THEMES[id]).forEach(fail));
ids.forEach(id => {
  const r = identityErrors(id);
  r.errs.forEach(fail);
  if (r.checked) notes.push(id + ' — ' + r.checked + ' background(s) rebuilt and compared byte for byte');
  else notes.push(id + ' — no committed art yet, identity check not applicable');
});

/* ---------- the controls (DFM 196: a guard is not trusted until it has been
   seen to fail) --------------------------------------------------------- */
(function controls() {
  const ok = (cond, what) => {
    if (cond) notes.push('control: ' + what);
    else fail('A CONTROL FAILED — ' + what + '. This gate cannot be trusted until it is fixed.');
  };
  /* contrast, both directions */
  ok(contrastErrors('fixture', {
    text: '#8899AA', ground: '#7F8C99', panel: '#111111',
    dim: '#FFFFFF', accent: '#FFFFFF', accent2: '#FFFFFF'
  }).some(e => /under the 4.5:1 floor/.test(e)),
    'a theme whose text is grey-on-grey is REJECTED');
  ok(contrastErrors('fixture', {
    text: '#FFFFFF', ground: '#0A1430', panel: '#101E46',
    dim: '#A9C4E8', accent: '#35E0FF', accent2: '#E4B824'
  }).length === 0,
    'and Lesson 1\'s real palette passes (over-tightening guard)');
  /* the exact pair the readability round found on the live app: #55688F on
     #1C2A4A, which measured about 2.4:1 (DFM 207g). It must still be caught. */
  ok(ratio('#55688F', '#1C2A4A') < FLOOR,
    'the READY button pair he could not read (#55688F on #1C2A4A) still measures under the floor');

  /* identity: a doctored copy of a committed PNG must be caught. Done on a
     COPY of the art directory so a control never edits shipping artwork. */
  const first = ids.find(id => fs.existsSync(path.join(ART, id, 'title-bg.png')));
  if (!first) { notes.push('control: (identity control skipped — no committed art to doctor)'); return; }
  const crypto = require('crypto');
  const real = fs.readFileSync(path.join(ART, first, 'title-bg.png'));
  const doctored = Buffer.from(real);
  doctored[doctored.length - 1] = doctored[doctored.length - 1] ^ 0xFF;
  const a = crypto.createHash('md5').update(real).digest('hex');
  const b = crypto.createHash('md5').update(doctored).digest('hex');
  ok(a !== b, 'one flipped byte in a committed background changes its md5, so the ' +
    'identity check would catch a silent redraw');
})();

/* ---------- verdict ------------------------------------------------------ */
notes.forEach(n => console.log('  ' + n));
if (fails.length) {
  console.error('');
  console.error('qa-deck-art: FAILED — ' + fails.length + ' problem(s)');
  fails.forEach(f => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('qa-deck-art: PASSED — every committed background rebuilds byte-identical, ' +
  'every theme reads at ' + FLOOR + ':1 or better');
