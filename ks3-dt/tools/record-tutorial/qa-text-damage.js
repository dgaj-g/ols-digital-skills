#!/usr/bin/env node
/* qa-text-damage.js — A TEXT EDIT APPLIED BY MACHINE IS VERIFIED BY A DERIVED
 * DETECTOR, NEVER BY ITS OWN SUCCESS COUNT (DFM 272's EXECUTION NOTE (f)).
 *
 * WHAT HAPPENED, 27 August 2026. The second separated cold read returned 129
 * lesson FAILs and 178 REWRITEs, each carrying the replacement wording, so the
 * fixes went in by script. The script reported "APPLIED 109" and was, at the
 * same moment, doing three different kinds of damage to the text it was fixing:
 *
 *   TAIL-VERBATIM     a judge quotes a rewrite as a TAIL — "…append, remove and
 *                     sort are the ones you have." — and a literal write puts an
 *                     ellipsis in front of a twelve-year-old. Twelve shipped.
 *   DUPLICATION       where the reported sentence spanned more than one sentence,
 *                     the replacement went in and the old tail stayed behind it:
 *                     "Something in it is repeating and never finishing. Something
 *                     in it is repeating and never finishing." — 15 in the lessons,
 *                     3 more in film captions, one already recorded into a film.
 *   TRUNCATION        the same fallback ATE six strings whole: the Chatbot Swap's
 *                     three-paragraph intro reduced to one sentence.
 *
 * NONE of it appeared in the applier's log, and a hand-written list of "sentences
 * I edited" would have found none of it either. What found it was two detectors
 * DERIVED FROM THE CONTENT — DFM 271's shape turned on my own edits. This file is
 * those detectors, kept, so the next machine pass cannot ship the same three faults.
 *
 * WHAT IT CANNOT DO, said plainly: it cannot tell good writing from bad. It catches
 * text that was MANGLED — repeated, beheaded, or eaten — which is a fact about
 * bytes, and facts get gates (DFM 235). Whether what survived reads well is the
 * cold read's job and nobody else's (DFM 146a).
 *
 *   node qa-text-damage.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const REPO = path.resolve(__dirname, '..', '..', '..');
const BASE_REF = '7d9c274';
const UNDER_REVIEW = (process.env.KS3DT_REVIEW || 'j2-03,j3-03').split(',').map(s => s.trim()).filter(Boolean);
const SHRINK = 0.62;   /* a string now under this fraction of its base length has lost a paragraph,
                          not a clause — every real rewrite this round sat well above it */
const RUN = 6;         /* words in the repeated run. 5 fires on ordinary parallel prose
                          ("click the button that says how today" / "…how hard"); 6 does not */

/* DECLARED EXEMPTIONS, printed on every run rather than hidden (DFM 221). A
   deliberate enumeration really does repeat itself, and a gate that condemned
   one would have me mangling a correct sentence to go green. */
const ALLOWED_SHRINK = [
  ['j2-03', '/chunks/0/config/lines/7',
   'DFM 171: the opening card had a numbered sequence inside ONE string, which renders as run-on prose. Split into one line per step, so every index from 7 on now carries what the line before it used to — the words are all still on the card, one index down'],
  ['j2-03', '/chunks/0/config/lines/9',
   'the same split, one index further down'],
  ['j3-03', '/chunks/5/config/intro',
   'DFM 171 again, on the ordering card: the four numbered things moved out of `intro` into a real `steps` array the card draws as a list, and the sentence after them into `introAfter`. Nothing was lost — it is drawn properly now'],
  ['j3-03', '/chunks/5/config/item/prompt',
   'the separated cold read, 28 Aug 2026: the old prompt NAMED the three blocks in their correct order, so the ordering task could be finished without reading a line of code. Shorter on purpose — it now says what to do and nothing about the answer'],
  ['j3-03', '/chunks/10/config/item/prompt',
   'the same finding on the closing loop puzzle: the prompt gave the order away. Shorter on purpose'],
  ['j3-03', '/chunks/0/config/lines/9',
   'the running order was renumbered into six steps, so every line from index 5 on carries what the line before it used to — the words are still on the card, one index up']
];
const ALLOWED_REPEATS = [
  ['This is going well.',
   'Fred\'s joke on the Swap waiting card: "This is going well. This is going really well. I think this is going well." The escalation IS the gag, and the separated reader named it as deliberate so it could never be mistaken for a broken edit'],
  ['FALSE. FALSE',
   'l5, LOCKED: "This runs when the answer is FALSE. FALSE finally has a job." The repetition is the caption\'s own rhetoric — the word is picked up deliberately to give it its moment'],
  ['Your call sign is the name they see.',
   'a MIRROR, and the judge\'s own words: "Your call sign is the name they see. Their call sign is the name you see." The two sentences share their nouns because the contrast between them IS the sentence'],
  ['two: two',
   'j1-01, LOCKED: "this is a job for two: two pupils, two computers" — the repetition is the sentence\'s own rhetoric'],
  ['words then a box then words',
   'a deliberate enumeration: "words, then a box, then words, then a box, then words" (j2-l3 ch5)'],
  ['click the button that says how',
   'the closing screen asks two questions in the same shape, one after the other'],
  ['call sign is the only name',
   'the judge\'s own sentence: "Your call sign is the only name they see, and their call sign is the only name you see."'],
  ['you are shown the working order',
   'the parsons intro states the one-go rule and then what happens either way']
];

let failures = 0;
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};
const waived = [];

/* ---------------------------------------------------------------- the walks */
function strings(o, p, out) {
  if (o && typeof o === 'object') {
    if (Array.isArray(o)) o.forEach((v, i) => strings(v, p + '/' + i, out));
    else Object.keys(o).forEach(k => strings(o[k], p + '/' + k, out));
  } else if (typeof o === 'string') out.push([p, o]);
  return out;
}
function lessonFiles() {
  const out = [];
  for (const year of ['j1', 'j2', 'j3']) {
    for (const kind of ['lessons', 'decks']) {
      const d = path.join(SRC, year, kind);
      if (!fs.existsSync(d)) continue;
      for (const f of fs.readdirSync(d).filter(n => /\.json$/.test(n))) {
        out.push({ id: f.replace(/\.(deck\.)?json$/, ''), rel: year + '/' + kind + '/' + f,
          file: path.join(d, kind === 'decks' ? f : f) });
      }
    }
  }
  return out;
}

/* --------------------------------------------- 1. THE REPEATED-CLAUSE SWEEP */
function repeatsIn(text) {
  const t = String(text).replace(/<[^>]+>/g, ' ');
  const w = t.match(/[A-Za-z’']+/g) || [];
  const seen = new Set();
  for (let i = 0; i + RUN <= w.length; i++) {
    const g = w.slice(i, i + RUN).join(' ').toLowerCase();
    if (seen.has(g)) return g;
    seen.add(g);
  }
  return null;
}
function allowed(run) {
  /* an exemption may name the whole finding or a phrase inside it — the paraphrase
     finding is two sentences joined, so naming one of them is enough */
  const hit = ALLOWED_REPEATS.find(([r]) => run === r || String(run).indexOf(r) !== -1);
  return hit ? hit[1] : null;
}

/* TWO MORE SHAPES THE SIX-WORD RUN CANNOT SEE, both found by the separated cold
   read on 28 Aug 2026 AFTER this file was already green — which is the honest
   record of what a machine catches and what only a reader does.
     · THE STUTTER. "…after the How did it go? screen. screen." One word, said
       twice, left behind where a splice landed mid-sentence.
     · THE PARAPHRASE. "Do not pick anything that needs thinking about. Nothing
       that needs thinking about." Two sentences saying one thing in different
       words share no six-word run at all, so the first detector is blind to them. */
function stutterIn(text) {
  const t = String(text).replace(/<[^>]+>/g, ' ');
  const m = t.match(/\b([A-Za-z]{3,})\b([\s.,;:!?]+)\1\b/);
  return m ? m[1] + m[2].replace(/\s+/g, ' ') + m[1] : null;
}
const STOP = new Set(['the','a','an','and','or','of','to','in','is','it','that','this','you','your',
  'for','on','at','as','with','not','do','does','be','are','was','one','if','so','then','into','out']);
function paraphraseIn(text) {
  const t = String(text).replace(/<[^>]+>/g, ' ');
  const sents = t.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(x => x.split(/\s+/).length >= 5);
  const sets = sents.map(x => new Set((x.toLowerCase().match(/[a-z']+/g) || []).filter(w => !STOP.has(w))));
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i], b = sets[j];
      /* both sentences must carry real content: a short one that happens to share a
         proper noun with a long one is not a duplicate, it is a sentence about the
         same thing ("…a call sign like Director 3" / "Your call sign is the name
         they see") */
      if (a.size < 4 || b.size < 4) continue;
      let shared = 0;
      a.forEach(w => { if (b.has(w)) shared++; });
      const small = Math.min(a.size, b.size);
      if (shared / small >= 0.75 && shared >= 3) return sents[i].slice(0, 60) + '  ≈  ' + sents[j].slice(0, 60);
    }
  }
  return null;
}

console.log('qa-text-damage — repeated, beheaded and eaten strings, DERIVED from the content\n');
console.log('=== 1. NO PUPIL STRING SAYS THE SAME SIX WORDS TWICE ===');
{
  let hits = 0, scanned = 0;
  for (const L of lessonFiles()) {
    const json = JSON.parse(fs.readFileSync(L.file, 'utf8'));
    for (const [p, v] of strings(json, '', [])) {
      /* the teacher's own script is not pupil text: a spoken note repeats a phrase on
         purpose, and holding a teacher's aside to a pupil sentence's rule would have me
         mangling her script to go green */
      if (v.length < 60 || /teacherBrief/.test(p) || /\/notes$/.test(p)) continue;
      scanned++;
      /* THREE SHAPES, ONE EXEMPTION LIST. Each finding is waived only by an entry
         that names the exact text it waives, and every waiver is printed. */
      const found = [];
      const run = repeatsIn(v);   if (run)  found.push(['repeats "' + run + '"', run]);
      const stut = stutterIn(v);  if (stut) found.push(['says "' + stut + '"', stut]);
      /* THE PARAPHRASE TEST IS SCOPED TO THE LESSONS UNDER REVIEW. It answers the
         question "did an edit leave a shortened restatement behind?", and a lesson
         nobody has edited cannot have one — what it has is an author writing two
         sentences about the same thing on purpose, which is not this gate's business
         and which it is not clever enough to tell apart (DFM 146a). The stutter and
         the six-word run stay platform-wide: neither is ever deliberate. */
      const para = UNDER_REVIEW.indexOf(L.id) !== -1 ? paraphraseIn(v) : null;
      if (para) found.push(['says the same thing twice: ' + para, para]);
      if (!found.length) continue;
      const live = found.filter(([, key]) => {
        const why = allowed(key);
        if (why) { waived.push(L.id + ' ' + p + ': "' + String(key).slice(0, 60) + '" — ' + why); return false; }
        return true;
      });
      if (!live.length) continue;
      hits++;
      console.log('  FAIL  ' + L.id + ' ' + p + '\n           ' + live[0][0] + '\n           ' + v.slice(0, 150));
      failures++;
    }
  }
  check(hits === 0, 'no repeated clause in ' + scanned + ' pupil string(s) across ' + lessonFiles().length + ' file(s)');
}

/* the same sweep over the FILM CAPTIONS, which are source code, not JSON */
{
  let hits = 0, n = 0;
  const Q = require('./qa-language.js');
  for (const s of Q.collectFilmStrings().strings) {
    n++;
    /* A CAPTION STUTTERS TOO. "the last line — the one that uses both answers answers
       answers" is a film SUBTITLE that got past this sweep because three repeated words
       are not a six-word run. Found by a reader, not by this file. */
    const run = repeatsIn(s.text || '');
    const stut = stutterIn(s.text || '');
    if (!run && !stut) continue;
    const key = stut || run;
    const why = allowed(key);
    if (why) { waived.push('film ' + s.set + ':' + (s.line || '') + ': "' + key + '" — ' + why); continue; }
    hits++;
    console.log('  FAIL  film ' + s.set + ' line ' + s.line + '\n           ' +
      (stut ? 'says "' + stut + '"' : 'repeats "' + run + '"') + '\n           ' +
      String(s.text).replace(/<[^>]+>/g, '').slice(0, 150));
    failures++;
  }
  check(hits === 0, 'and none in ' + n + ' film caption(s)');
}

/* ------------------------------------- 2. NOTHING LOST A PARAGRAPH IN SILENCE */
console.log('\n=== 2. NO STRING UNDER REVIEW HAS LOST MOST OF ITSELF SINCE ' + BASE_REF + ' ===');
{
  let hits = 0, compared = 0;
  for (const id of UNDER_REVIEW) {
    const year = id.split('-')[0];
    const rel = 'ks3-dt/content/' + year + '/lessons/' + id + '.json';
    let base;
    try {
      base = JSON.parse(execFileSync('git', ['show', BASE_REF + ':' + rel], { cwd: REPO, encoding: 'utf8' }));
    } catch (e) { check(false, 'the base text for ' + id + ' is readable at ' + BASE_REF); continue; }
    const now = JSON.parse(fs.readFileSync(path.join(SRC, year, 'lessons', id + '.json'), 'utf8'));
    const cur = new Map(strings(now, '', []));
    for (const [p, v] of strings(base, '', [])) {
      if (v.length < 70) continue;
      const c = cur.get(p);
      if (typeof c !== 'string') continue;   /* deleted or moved on purpose — that is not this gate's business */
      compared++;
      if (c.length >= v.length * SHRINK) continue;
      const ex = ALLOWED_SHRINK.find(([i, q]) => i === id && q === p);
      if (ex) { waived.push(id + ' ' + p + ' (' + v.length + ' → ' + c.length + ' chars) — ' + ex[2]); continue; }
      hits++;
      console.log('  FAIL  ' + id + ' ' + p + '  (' + v.length + ' → ' + c.length + ' characters)\n' +
        '           WAS: ' + v.slice(0, 120) + '\n           NOW: ' + c.slice(0, 120));
      failures++;
    }
  }
  check(hits === 0, compared + ' string(s) compared against the text he sat; none has lost more than ' +
    Math.round((1 - SHRINK) * 100) + '% of itself');
}

/* ----------------- 2a. NO CORRECTION LEFT A SURVIVOR BEHIND -------------- */
console.log('\n=== 2a. NO FIX WAS APPLIED TO THREE COPIES OF A STRING AND MISSED ON A FOURTH ===');
{
  /* THE PARTING FINDING OF THE SEPARATED READER THAT READ j2-03 SIX TIMES:
       "Nearly every fault in the last four rounds was a SURVIVOR — a correction
        applied to three copies of a string and missed on a fourth, or applied to
        builds[0] and not builds[1]. Sweeping by exact string across the whole
        lesson when a fix is applied would have caught the str( ) on the Swap
        screen, both notYetSay twins, and all three NOT YET labels before a judge
        ever saw them."
     So: within one lesson, two strings that live under the SAME FIELD NAME and are
     nearly — but not exactly — the same are a correction that did not finish. Held
     at nine words in ten, because a field like `matchedSay` legitimately differs
     between builds and this is looking for a near-miss, not a family resemblance. */
  const NEAR = 0.9, MINW = 7;   /* nine words in ten, and at least seven words long */
  const words = t => (String(t).toLowerCase().match(/[a-z']+/g) || []);
  let hits = 0, compared = 0;
  for (const id of UNDER_REVIEW) {
    const year = id.split('-')[0];
    const file = path.join(SRC, year, 'lessons', id + '.json');
    if (!fs.existsSync(file)) continue;
    const byField = new Map();
    for (const [p, v] of strings(JSON.parse(fs.readFileSync(file, 'utf8')), '', [])) {
      if (/teacherBrief/.test(p)) continue;
      if (words(v).length < MINW) continue;
      const field = p.split('/').pop().replace(/^\d+$/, p.split('/').slice(-2, -1)[0]);
      if (!byField.has(field)) byField.set(field, []);
      byField.get(field).push([p, v]);
    }
    for (const [field, rows] of byField) {
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const [pa, a] = rows[i], [pb, b] = rows[j];
          if (a === b) continue;
          compared++;
          const A = new Set(words(a)), B = new Set(words(b));
          let shared = 0; A.forEach(w => { if (B.has(w)) shared++; });
          const sim = shared / Math.max(A.size, B.size);
          if (sim < NEAR) continue;
          hits++;
          console.log('  ....  ' + id + ' — two `' + field + '` strings are ' +
            Math.round(sim * 100) + '% the same but not identical:\n' +
            '           ' + pa + '\n             ' + a.slice(0, 120) + '\n' +
            '           ' + pb + '\n             ' + b.slice(0, 120));
        }
      }
    }
  }
  /* A REPORTER, NOT A GATE, and the boundary is stated rather than left to be
     discovered (DFM 146a / 197). "Three of these lines" beside "Four of these lines"
     is 92% the same and perfectly correct; "Read the console" beside "Read the
     console underneath" is 96% the same and a fix that did not finish. No machine
     can tell those apart, and one that tried would have me mangling a correct
     sentence to go green. Every near-miss is PRINTED, by path, for the separated
     read to answer — the same shape as the numeral gate's second half. */
  console.log('  ....  ' + hits + ' near-miss pair(s) named above, out of ' + compared +
    ' same-field pairs. REPORTED, NOT BLOCKING — a judge decides which are unfinished fixes.');
}

/* ------------------------- 2b. EVERY BOLD MARKER HAS ITS PARTNER --------- */
console.log('\n=== 2b. NO PUPIL STRING CARRIES AN UNCLOSED ** ===');
{
  /* `fmtBold` turns **paired** markers into bold and leaves an unpaired one on the
     screen as two asterisks. j3-03's opening card shipped with one, on the third
     line of the first screen of the lesson, and it took a separated reader two
     passes to get it looked at. An odd number of markers is a fact about bytes. */
  let hits = 0, scanned = 0;
  for (const L of lessonFiles()) {
    const json = JSON.parse(fs.readFileSync(L.file, 'utf8'));
    for (const [p, v] of strings(json, '', [])) {
      if (v.indexOf('**') === -1) continue;
      scanned++;
      if ((v.match(/\*\*/g) || []).length % 2 === 0) continue;
      hits++;
      console.log('  FAIL  ' + L.id + ' ' + p + ' — an odd number of ** markers, so one renders as two asterisks:\n           ' + v.slice(0, 140));
      failures++;
    }
  }
  check(hits === 0, 'every ** in ' + scanned + ' string(s) has its partner');
}

/* --------------------------------- 3. NOTHING STARTS OR ENDS ON AN ELLIPSIS */
console.log('\n=== 3. NO PUPIL STRING BEGINS ON AN ELLIPSIS ===');
{
  let hits = 0;
  for (const L of lessonFiles()) {
    const json = JSON.parse(fs.readFileSync(L.file, 'utf8'));
    for (const [p, v] of strings(json, '', [])) {
      if (!/^\s*…/.test(v)) continue;
      /* A GENUINE CONTINUATION IS DERIVABLE, not a matter of taste: the string
         immediately before this one in the same list ends on an ellipsis too, so
         the pair is one sentence broken across two bullets. The tail-verbatim
         fault never has that partner — it is a tail with a head that is gone. */
      const m = p.match(/^(.*)\/(\d+)$/);
      if (m && Number(m[2]) > 0) {
        const prev = new Map(strings(json, '', [])).get(m[1] + '/' + (Number(m[2]) - 1));
        if (typeof prev === 'string' && /…\s*$/.test(prev)) {
          waived.push(L.id + ' ' + p + ' — opens on "…" and the bullet before it ends on one: one sentence across two bullets');
          continue;
        }
      }
      hits++;
      console.log('  FAIL  ' + L.id + ' ' + p + ' — a rewrite quoted as a TAIL, written whole:\n           ' + v.slice(0, 140));
      failures++;
    }
  }
  check(hits === 0, 'no lesson or deck string opens on "…" — the tail-verbatim fault');
}

/* ----------------------------------------------------------- THE CONTROLS */
console.log('\n--- CONTROLS: each detector proved against the real damage of 27 Aug 2026');
control(repeatsIn('Your program was still going after a few seconds, so it was stopped. ' +
  'Something in it is repeating and never finishing. Something in it is repeating and never finishing.') !== null,
  'the duplicated timelimit message that shipped on two cards IS caught');
control(repeatsIn('Read what it says back to you. When it has finished, the report button underneath turns on.') === null,
  'and an ordinary two-sentence line is not (over-tightening guard)');
{
  const was = "Every program in the world gets used by somebody who did not write it, and that is when you find out what is really wrong with it.\n\nSo: your bot goes to somebody else in this room, and their bot comes to you.";
  const now = "If it stops working while you are using it, that is a real find, and it goes in the report.";
  control(now.length < was.length * SHRINK, 'the Chatbot Swap intro the splice ATE would be caught by the shrinkage rule');
  control(!(was.length < was.length * SHRINK), 'and an unchanged string is not (over-tightening guard)');
}
control(/^\s*…/.test('…append, remove and sort are the ones you have.'),
  'a replacement quoted as a tail IS caught before it reaches a child');

if (waived.length) {
  console.log('\n' + waived.length + ' DECLARED EXEMPTION(S), printed rather than hidden (DFM 221):');
  waived.forEach(w => console.log('  - ' + w));
}

console.log('\n' + (failures ? 'qa-text-damage: ' + failures + ' FAILURE(S)' : 'qa-text-damage: ALL GREEN'));
process.exit(failures ? 1 : 0);
