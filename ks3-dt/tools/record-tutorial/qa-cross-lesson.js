/* qa-cross-lesson.js — the guard DFM 167 demands, after his 9 Aug finding.

   THE TWO FAULTS THIS EXISTS TO STOP EVER RECURRING:

   (a) AN INVENTED FACT ABOUT HIS SCHOOL. On 3 Aug he ruled (decision log E-13):
       "in this brief change 'the grey box in the DT office' to 'ask HOD where
       to find them'" - because the grey box was something I made up. The fix
       landed on the ONE line he pointed at and was never swept, so the same
       invented location survived in Lesson 2's own resources row and was
       copied twice into the Lesson 3 brief. His words on finding it, 9 Aug:
       "i specifically told you not to mention that in lesson 2 since you made
       it up, so you should have known not to include it in subsequent
       lessons." Rule 150's sweep-and-harness law applies to FACTS exactly as
       it does to banned words. Where the truth is not known, the wording is
       HIS: ask the Head of Department.

   (b) A WORKING MODEL THAT DRIFTED BETWEEN LESSONS. The 2 Aug batch had both
       ladder lessons on "one of you builds the blocks, the other reads the
       card". On 4 Aug Lesson 2 was rebuilt to "You BOTH build every rung, each
       on your OWN computer" - and Lesson 3 was never re-staged to match, so a
       pupil met two different pair models a fortnight apart. Not cosmetic:
       under one-builds, the pupil who did not build has no .hex of her own,
       so Register Your Rig's Drive check fails her, and she cannot honestly
       tick "I can create a variable" at the self-review.

   THE LAW (DFM 167): a fact or working model stated in more than one lesson is
   ONE fact. It changes everywhere at once, or a harness fails. This file scans
   EVERY lesson - including ones not written yet - so lesson 6 onwards is
   covered the day it is authored.

   Pure source/packed scan: no browser, no server needed.
   Usage: node qa-cross-lesson.js */
const path = require('path');
const fs = require('fs');
const SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const PACKED = path.join(__dirname, '../../content');
const BUILT = path.join(__dirname, '../../platform/server/PathB_Index.html');
const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };
const control = (failed, m) => { console.log((failed ? '  PASS ' : '  FAIL ') + 'CONTROL: ' + m); if (!failed) FAILS.push('CONTROL ' + m); };

/* ------------------------------------------------------------------ *
 * THE BANNED-FACTS TABLE. Every entry is something I invented about his
 * school and he corrected. EXTEND THIS whenever he corrects another one -
 * that is the whole point of the file (DFM 167a).
 * ------------------------------------------------------------------ */
/* SCOPE matters, and getting it wrong the first time is worth recording: a
   banned FACT is not always a banned WORD. "grey box" and "DT office" are
   inventions that could never be true on any surface, so they are scope 'all'.
   "labelled" is only a lie ABOUT THE KIT - the Guide tab's approved sentence
   "each one labelled with the misunderstanding it usually signals" is true and
   his, and a word-level ban would have forced me to damage it to make a
   harness green (DFM 35, and 146a: a harness must never print a fault the app
   does not have). So it is scope 'kit' and is tested only where the kit is
   described. */
const BANNED_FACTS = [
  { rx: /grey box/i, scope: 'all', why: 'the grey box is invented — his 3 Aug ruling E-13 killed it', fix: 'say "ask the Head of Department where they are kept"' },
  { rx: /DT office/i, scope: 'all', why: 'the DT office as a kit location is invented — same ruling', fix: 'say "ask the Head of Department where the set is kept"' },
  { rx: /\blabelled\b/i, scope: 'kit', why: 'the micro:bits being labelled is invented room-detail (same family)', fix: 'state only what is known: how many micro:bits and cables' }
];
const ALL_SCOPE = BANNED_FACTS.filter(b => b.scope === 'all');
const KIT_SCOPE = BANNED_FACTS.filter(b => b.scope === 'kit');

const lessonFiles = fs.readdirSync(path.join(SRC, 'j1/lessons'))
  .filter(f => /^j1-.*\.json$/.test(f) && !/\.bak/.test(f));

const strings = (obj) => { const out = []; (function walk(o) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k]));
})(obj); return out; };

console.log('== 1. no invented fact about his school survives anywhere ==');
console.log('   (scanning ' + lessonFiles.length + ' lessons, source AND packed)');
for (const f of lessonFiles) {
  for (const [label, root] of [['source', SRC], ['packed', PACKED]]) {
    const p = path.join(root, 'j1/lessons/' + f);
    if (!fs.existsSync(p)) continue;             // side quest etc. may not pack 1:1
    const raw = fs.readFileSync(p, 'utf8');
    for (const b of ALL_SCOPE) {
      check(!b.rx.test(raw), label + '/' + f + ': no "' + b.rx.source.replace(/\\b/g, '') + '" — ' + b.why);
    }
  }
}
/* the built shell he pastes must be clean too (DFM 162's lesson: assert the
   built artefact, not only the source) */
const built = fs.readFileSync(BUILT, 'utf8');
for (const b of ALL_SCOPE) {
  check(!b.rx.test(built), 'the built PathB_Index.html carries no "' + b.rx.source.replace(/\\b/g, '') + '"');
}

console.log('\n== 2. the kit is located the way HE said to locate it ==');
let kitRows = 0;
for (const f of lessonFiles) {
  const L = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/' + f), 'utf8'));
  const res = (L.teacherBrief && L.teacherBrief.resources) || [];
  for (const r of res) {
    if (!/micro:bit class set|micro:bits/i.test(String(r.label || ''))) continue;
    kitRows++;
    check(/Ask the Head of Department/i.test(String(r.where || '')),
      f + ': the "' + r.label + '" row sends the teacher to the Head of Department');
    const rowText = String(r.what || '') + ' ' + String(r.where || '');
    for (const b of KIT_SCOPE) {
      check(!b.rx.test(rowText), f + ': the kit row claims nothing invented — ' + b.why);
    }
  }
  /* the prepare section states the kit too */
  const prep = (L.teacherBrief && L.teacherBrief.prepare) || [];
  for (const p of prep) {
    const t = String(p.text || '');
    if (!/micro:bit class set/i.test(t)) continue;
    kitRows++;
    check(/Head of Department/i.test(t), f + ': the kit prep step names the Head of Department, not a room');
    for (const b of KIT_SCOPE) {
      check(!b.rx.test(t), f + ': the kit prep step claims nothing invented — ' + b.why);
    }
  }
}
check(kitRows >= 3, 'the kit is actually stated in at least three places and every one was checked (' + kitRows + ')');

console.log('\n== 3. one pair model across every ladder lesson (DFM 167b) ==');
let ladders = 0;
for (const f of lessonFiles) {
  const L = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/' + f), 'utf8'));
  const lad = (L.chunks || []).find(c => c.engine === 'ladder');
  if (!lad) continue;
  const intro = String(lad.config.intro || '');
  if (!/pair|person beside you|between the two of you/i.test(intro)) continue;  // solo-only ladder
  ladders++;
  check(/You BOTH build every rung/.test(intro),
    f + ': the ladder intro puts BOTH pupils on the build, each at her own computer');
  check(!/one of you builds/i.test(intro),
    f + ': and the abandoned one-builds-one-reads model is gone');
  check(/take turns|swap over/i.test(intro),
    f + ': the turn-taking is about the shared micro:bit, and it is still said');
  /* the reason the model matters, asserted rather than trusted: a lesson that
     asks her to bank her OWN file must have had her build her OWN program */
  const banks = (L.chunks || []).some(c => c.engine === 'artifact');
  if (banks) check(/each on your OWN computer/.test(intro),
    f + ': it banks a file per pupil, so every pupil must have built her own program');
}
check(ladders >= 2, 'both ladder lessons were found and checked (' + ladders + ')');

/* ------------------------------------------------------------------ *
 * 4. ONE FILM, ONE SET OF CHAPTER TIMES (DFM 144/167 applied to a
 *    number instead of a sentence; added 10 Aug 2026, DFM 179d).
 *
 *    Found while bringing the film captions under the language harness:
 *    Lesson 5's chapter times lived in TWO content homes - the
 *    masterclass video chunk and the Studio Desk's own copy inside the
 *    build chunk - and they had ALREADY drifted apart, 173 against 174.
 *    Nobody typed the second one wrong on purpose; the film was
 *    re-assembled once and only one of the two copies was updated. That
 *    is exactly rule 144's law ("a fact that changes lives in exactly ONE
 *    file") in a place nobody had thought to look, so it gets the same
 *    treatment every other repeated fact gets: a harness.
 *
 *    The rule has two halves, and the second is the one with teeth: the
 *    copies must agree with EACH OTHER, and they must agree with the
 *    film's own chapters.json - the thing the assembler measured out of
 *    the real video. Agreeing with each other while both being wrong is
 *    still a lesson that jumps a pupil to the wrong place.
 * ------------------------------------------------------------------ */
console.log('\n== 4. one film, one set of chapter times (DFM 144/179d) ==');
const OUT = path.join(__dirname, 'out');
const sameChapters = (a, b) => a.length === b.length &&
  a.every((c, i) => Number(c.t) === Number(b[i].t) && String(c.label) === String(b[i].label));
const chapterNodes = (node, p, out) => {
  if (Array.isArray(node)) { node.forEach((v, i) => chapterNodes(v, p + '[' + i + ']', out)); return out; }
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node.chapters)) out.push({ path: p, src: node.src, chapters: node.chapters });
  Object.keys(node).forEach(k => chapterNodes(node[k], p + ' › ' + k, out));
  return out;
};
let chapterHomes = 0;
for (const f of lessonFiles) {
  for (const [label, root] of [['source', SRC], ['packed', PACKED]]) {
    const p = path.join(root, 'j1/lessons/' + f);
    if (!fs.existsSync(p)) continue;
    const L = JSON.parse(fs.readFileSync(p, 'utf8'));
    const homes = [];
    (L.chunks || []).forEach(c => chapterNodes(c.config || {}, f.replace(/\.json$/, '') + ' › ' + c.id + ' › config', homes));
    if (!homes.length) continue;
    if (label === 'source') chapterHomes += homes.length;
    /* (a) every copy inside one lesson says the same thing */
    homes.slice(1).forEach(h => {
      check(sameChapters(homes[0].chapters, h.chapters),
        label + '/' + f + ': "' + h.path + '" carries the same chapter times as "' + homes[0].path +
        '" — one film, one fact (DFM 144)');
    });
    /* (b) and they say what the assembler actually measured out of the film */
    homes.forEach(h => {
      const set = (String(h.src || '').match(/assets\/video\/([^/]+)\//) || [])[1];
      const cj = set && path.join(OUT, set, 'chapters.json');
      if (!cj || !fs.existsSync(cj)) return;
      const real = JSON.parse(fs.readFileSync(cj, 'utf8')).chapters || [];
      check(sameChapters(real, h.chapters),
        label + '/' + f + ': "' + h.path + '" matches the times the assembler measured in ' +
        set + '/chapters.json (' + real.map(c => c.t).join('/') + ')');
    });
  }
}
check(chapterHomes >= 5, 'every chapter-time home in the year was found and checked (' + chapterHomes + ')');

console.log('\n== 5. CONTROLS: the pre-fix text must fail these very tests ==');
const PRE_INTRO = "This is where you build it — in your pair again: you and the person beside you, one micro:bit between you. Three rungs, each one an upgrade — and the micro:bit is the judge. Take turns: one of you builds the blocks, the other reads the rung card and runs the test. Swap jobs at every rung.";
const PRE_PREP = "micro:bit class set and cables, one per pair — the same grey box as Lesson 2. Same pairs and the same devices if you can; quiet ownership works.";
const PRE_WHERE = "The DT office, in the grey box";
const PRE_WHAT = "15 devices, 15 cables, labelled.";
control(!/You BOTH build every rung/.test(PRE_INTRO), 'the pre-fix L3 intro never put both pupils on the build');
control(/one of you builds/i.test(PRE_INTRO), 'the pre-fix L3 intro carried the abandoned one-builds model');
control(BANNED_FACTS[0].rx.test(PRE_PREP), 'the pre-fix prep line carried the invented grey box');
control(BANNED_FACTS[1].rx.test(PRE_WHERE), 'the pre-fix resources row carried the invented DT office');
control(!/Ask the Head of Department/i.test(PRE_WHERE), 'and it never sent the teacher to the Head of Department');
control(KIT_SCOPE[0].rx.test(PRE_WHAT), 'the pre-fix kit line claimed the micro:bits were labelled');
/* and the scope itself is asserted, so nobody "tightens" it back to a word ban
   and quietly damages the Guide's true sentence to make this file green */
control(!ALL_SCOPE.some(b => b.rx.test('each one labelled with the misunderstanding it usually signals')),
  'the Guide\'s approved "labelled with the misunderstanding" sentence is NOT caught by the always-banned list');
/* THE CHAPTER-TIME CONTROL: the exact pair that was live on his screen on
   10 Aug 2026 - the Lesson 5 masterclass chunk said the worked example starts at
   173 seconds, the Studio Desk's copy said 174. One second is nothing to look at
   and is precisely why it survived; the point is that a repeated fact drifted at
   all. If this control ever passes, the check above has stopped comparing. */
const PRE_MASTERCLASS = [{ t: 0, label: 'From sequence to selection' }, { t: 76, label: 'The if/else block' },
  { t: 173, label: 'Worked example: Catch It' }, { t: 279, label: 'Test like a studio' }];
const PRE_STUDIO_DESK = PRE_MASTERCLASS.map(c => (c.t === 173 ? { t: 174, label: c.label } : c));
control(!sameChapters(PRE_MASTERCLASS, PRE_STUDIO_DESK),
  "Lesson 5's pre-fix 173-against-174 chapter times FAIL the one-film-one-fact check");
control(sameChapters(PRE_MASTERCLASS, PRE_MASTERCLASS.slice()),
  'and two genuinely identical chapter lists still PASS it (over-tightening guard)');

console.log('\n=========================================');
console.log(FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL CROSS-LESSON CHECKS PASSED');
process.exit(FAILS.length ? 1 : 0);
