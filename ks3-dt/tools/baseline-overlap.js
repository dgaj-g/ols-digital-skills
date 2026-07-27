/* baseline-overlap.js - audit blocker B-09.
 *
 * Lesson 1's Calibration Ping warm-up runs in FEEDBACK mode (engines.js): it
 * marks each answer, prints "Correct." / "Not this time.", reveals the right
 * option and shows the explanation. Thirty minutes later the same pupil sits
 * the sealed Year 8 baseline - which deliberately gives no per-item feedback,
 * because "immediate correction would bias the very measurement it exists to
 * take". If the warm-up teaches what the baseline is about to ask, the only
 * Year 8 comparison the department will ever get is inflated at source, and
 * the Lesson 17 "then vs now" payoff is built on it.
 *
 * The audit found the overlap BY EYE. This finds it MECHANICALLY, comparing
 * every warm-up item against every baseline item on all three surfaces the
 * audit named - STEMS, CORRECT ANSWERS and DISTRACTORS - so nothing hides
 * behind a rewording.
 *
 *   node baseline-overlap.js           report
 *   node baseline-overlap.js --strict  exit 1 if ANY overlap is found
 *
 * Content is read from content-src (never packed output).
 */
const fs = require('fs');
const path = require('path');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const LESSON = path.join(SRC, 'j1/lessons/j1-01.json');
const STRICT = process.argv.includes('--strict');

/* ---------- normalisation ---------- */
const STOP = new Set(('a an the of to in on at for and or is are was were be been it its this that these ' +
  'those you your yours my me i we our they them he she his her as if then than so but with without ' +
  'do does did done what which who whom whose when where why how not no yes can could should would ' +
  'will shall may might must have has had one two three four all any some each every other another ' +
  'best most more less least very really just only also even about into onto from by up down out off ' +
  'over under again here there now').split(/\s+/));
/* Generic verbs and framing words carry no TOPIC. Without this list a warm-up
   answer like "your teacher opens it" collides with "the computer opens YOUR
   account" on the word "opens" and buries the real signal. */
const GENERIC = new Set(('open opens opened look looks looking type types typing press presses give ' +
  'gives tell tells say says get gets use uses using make makes need needs want wants know knows ' +
  'think thinks find finds keep keeps put puts take takes come comes going means mean thing things ' +
  'something anything nothing next first last actually really piece pieces).').split(/\s+/));

function norm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokens(s) {
  return norm(s).split(' ').filter(t => t && !STOP.has(t) && !GENERIC.has(t) && t.length > 2);
}
/* Jaccard over content words - catches a reworded stem that asks the same thing */
function jaccard(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach(t => { if (B.has(t)) inter++; });
  return inter / (A.size + B.size - inter);
}

/* ---------- load ---------- */
const lesson = JSON.parse(fs.readFileSync(LESSON, 'utf8'));
const keys = lesson.keys || {};
function chunkItems(id) {
  const c = (lesson.chunks || []).find(x => x.id === id);
  if (!c) throw new Error('chunk not found: ' + id);
  return (c.config.items || []).map(it => ({
    id: it.id,
    stem: it.stem,
    options: it.options || [],
    answer: (keys[it.id] && typeof keys[it.id].a === 'number') ? (it.options || [])[keys[it.id].a] : null,
    explain: (keys[it.id] || {}).explain || ''
  }));
}

const warm = chunkItems('calibration');
const base = chunkItems('b4-exam');

console.log('KS3 DT baseline contamination check (audit B-09)');
console.log('warm-up items : ' + warm.length + '  (' + warm.map(w => w.id).join(', ') + ')');
console.log('baseline items: ' + base.length + '  (' + base.map(b => b.id).join(', ') + ')');
console.log('The warm-up runs with FEEDBACK. Anything it shares with the sealed baseline is taught, not measured.\n');

/* ---------- the three surfaces the audit named ---------- */
const STEM_SIM = 0.34;     // reworded-but-same-question threshold
const findings = [];

for (const w of warm) {
  for (const b of base) {
    const sim = jaccard(w.stem, b.stem);
    if (sim >= STEM_SIM) {
      findings.push({ kind: 'STEM', w: w.id, b: b.id, detail:
        'similarity ' + sim.toFixed(2) + '\n      warm-up : "' + w.stem + '"\n      baseline: "' + b.stem + '"' });
    }
    if (w.answer && b.answer && norm(w.answer) === norm(b.answer)) {
      findings.push({ kind: 'ANSWER', w: w.id, b: b.id, detail:
        'the SAME correct answer is revealed then asked: "' + b.answer + '"' });
    }
    /* every option against every option: a reused distractor is the audit's
       bl-07 finding, and it is just as contaminating as a reused stem because
       the warm-up's feedback tells her it was wrong */
    for (const wo of w.options) {
      for (const bo of b.options) {
        if (norm(wo) && norm(wo) === norm(bo)) {
          findings.push({ kind: 'OPTION', w: w.id, b: b.id, detail:
            'shared option text: "' + bo + '"' + (norm(bo) === norm(b.answer) ? '  <-- and it is the baseline ANSWER' : '') });
        }
      }
    }
    /* the warm-up's EXPLANATION is the strongest teaching surface of all */
    if (b.answer && w.explain && norm(w.explain).indexOf(norm(b.answer)) !== -1) {
      findings.push({ kind: 'EXPLAIN', w: w.id, b: b.id, detail:
        'the warm-up explanation contains the baseline answer verbatim: "' + b.answer + '"' });
    }
  }
}

/* ---------- surface 4: CONCEPT proximity ----------
   The three string surfaces above cannot see the audit's cal-3 finding: the
   warm-up asked where work must live so you can open it anywhere ("Your Google
   Drive") and the baseline asks where you look for last week's work ("Your
   Drive / documents folder"). Different stems, different answer strings, same
   thing taught then measured. So: flag when the two CORRECT ANSWERS share a
   topic word that is RARE across the baseline (appears in at most 2 items) -
   a rare shared noun between two short answers is a concept collision, not a
   coincidence of phrasing. */
const baseDocFreq = {};
base.forEach(b => {
  new Set(tokens(b.stem + ' ' + b.options.join(' '))).forEach(t => {
    baseDocFreq[t] = (baseDocFreq[t] || 0) + 1;
  });
});
for (const w of warm) {
  if (!w.answer) continue;
  for (const b of base) {
    if (!b.answer) continue;
    const wa = new Set(tokens(w.answer));
    const shared = tokens(b.answer).filter(t => wa.has(t) && (baseDocFreq[t] || 0) <= 2);
    if (shared.length) {
      findings.push({ kind: 'CONCEPT', w: w.id, b: b.id, detail:
        'both correct answers turn on "' + shared.join('", "') + '" (rare across the baseline)\n' +
        '      warm-up answer : "' + w.answer + '"\n' +
        '      baseline answer: "' + b.answer + '"' });
    }
  }
}

/* de-duplicate identical (kind, w, b, detail) rows */
const seen = new Set();
const rows = findings.filter(f => {
  const k = f.kind + '|' + f.w + '|' + f.b + '|' + f.detail;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

if (!rows.length) {
  let optPairs = 0;
  for (const w of warm) for (const b of base) optPairs += w.options.length * b.options.length;
  console.log('RESULT: ZERO overlap between the warm-up and the sealed baseline.');
  console.log('  stem pairs compared            : ' + (warm.length * base.length));
  console.log('  correct-answer pairs compared  : ' + (warm.length * base.length));
  console.log('  option pairs compared          : ' + optPairs);
  console.log('  concept (rare shared topic word): ' + (warm.length * base.length) + ' answer pairs');
  reportBadges();
  process.exit(0);
}

console.log('OVERLAP FOUND - ' + rows.length + ' finding(s):\n');
const byKind = {};
rows.forEach(f => { (byKind[f.kind] = byKind[f.kind] || []).push(f); });
for (const kind of ['STEM', 'ANSWER', 'OPTION', 'EXPLAIN', 'CONCEPT']) {
  (byKind[kind] || []).forEach(f => {
    console.log('  [' + kind + '] ' + f.w + ' <-> ' + f.b);
    console.log('      ' + f.detail);
  });
}
console.log('\n' + rows.length + ' overlap(s). Every one of these is taught with feedback and then measured.');
reportBadges();
process.exit(STRICT ? 1 : 0);

/* ---------- informational: the BADGE items ----------
   The audit also noted that Badge 1's and Badge 2's items, which likewise carry
   explanations, pre-teach several baseline items. That is a different question
   from the warm-up: badges are the lesson's actual TEACHING, and a lesson is
   supposed to teach. Damien's decision covered the warm-up only, so this is
   reported and not gated - it is here so the residual is visible rather than
   forgotten. */
function reportBadges() {
  const badgeChunks = (lesson.chunks || []).filter(c =>
    /^b[12]-/.test(c.id) && c.config && Array.isArray(c.config.items));
  if (!badgeChunks.length) return;
  const baseDF = {};
  base.forEach(b => {
    new Set(tokens(b.stem + ' ' + b.options.join(' '))).forEach(t => { baseDF[t] = (baseDF[t] || 0) + 1; });
  });
  const hits = [];
  let n = 0;
  badgeChunks.forEach(c => {
    (c.config.items || []).forEach(it => {
      n++;
      const a = (keys[it.id] && typeof keys[it.id].a === 'number') ? (it.options || [])[keys[it.id].a] : null;
      base.forEach(b => {
        const sim = jaccard(it.stem, b.stem);
        const sameAns = a && b.answer && norm(a) === norm(b.answer);
        const shared = (a && b.answer)
          ? tokens(b.answer).filter(t => new Set(tokens(a)).has(t) && (baseDF[t] || 0) <= 2) : [];
        /* a deliberately LOWER bar than the gated warm-up check: this section
           exists to show topical proximity, not to fail a build */
        if (sim >= 0.18 || sameAns || shared.length) {
          hits.push('  ' + c.id + '/' + it.id + ' <-> ' + b.id +
            (sim >= 0.18 ? '  stem sim ' + sim.toFixed(2) : '') +
            (sameAns ? '  SAME correct answer' : '') +
            (shared.length ? '  shared topic word(s): ' + shared.join(', ') : '') +
            '\n        badge   : "' + it.stem + '"\n        baseline: "' + b.stem + '"');
        }
      });
    });
  });
  console.log('\n  (' + n + ' badge items scanned against ' + base.length + ' baseline items)');
  console.log('\n--- informational: badge teaching that the baseline also measures ---');
  console.log('(NOT gated - a lesson is meant to teach. Listed so the effect on the');
  console.log(' September figures is visible rather than forgotten.)');
  console.log(hits.length ? hits.join('\n') : '  none found on stem or answer');
}
