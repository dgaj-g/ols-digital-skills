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
    /* (a) every copy OF THE SAME FILM says the same thing.
       RE-STAGED 12 Aug 2026 for the DFM 168 split: Lesson 5's film is now
       served as two halves in two places — the idea at the masterclass chunk,
       the worked example on the Studio Desk — so its two homes legitimately
       carry DIFFERENT times. The rule was never "one lesson, one set of
       numbers"; it is "one FILM, one set of numbers", and the drift it caught
       (173 against 174) was two copies of the SAME film. Grouping by src keeps
       exactly that tooth and loses nothing. */
    const bySrc = {};
    homes.forEach(h => { (bySrc[String(h.src || '')] = bySrc[String(h.src || '')] || []).push(h); });
    Object.keys(bySrc).forEach(src => {
      bySrc[src].slice(1).forEach(h => {
        check(sameChapters(bySrc[src][0].chapters, h.chapters),
          label + '/' + f + ': "' + h.path + '" carries the same chapter times as "' + bySrc[src][0].path +
          '" — one film, one fact (DFM 144)');
      });
    });
    /* (b) and each home says what the assembler measured out of THE FILE IT
       SERVES — the full film, or the half it points at. A home that agreed with
       its twin while both were wrong would still jump a pupil to the wrong
       place, which is why this half is the one with teeth. */
    homes.forEach(h => {
      const src = String(h.src || '');
      const set = (src.match(/assets\/video\/([^/]+)\//) || [])[1];
      const cj = set && path.join(OUT, set, 'chapters.json');
      if (!cj || !fs.existsSync(cj)) return;
      const man = JSON.parse(fs.readFileSync(cj, 'utf8'));
      const base = src.split('/').pop();
      /* a published half is named "<set>-<the assembler's own name>" */
      const part = (man.halves || []).find(x => base === set + '-' + String(x.file).split('/').pop());
      const real = part ? (part.chapters || []) : (man.chapters || []);
      check(sameChapters(real, h.chapters),
        label + '/' + f + ': "' + h.path + '" matches the times the assembler measured for ' +
        base + ' (' + real.map(c => c.t).join('/') + ')');
    });
  }
}
check(chapterHomes >= 5, 'every chapter-time home in the year was found and checked (' + chapterHomes + ')');

/* ------------------------------------------------------------------ *
 * 5. A LATER LESSON NEVER BRAND-NAMES AN EARLIER LESSON'S PROJECT
 *    UNLESS THAT NAME IS ONE FACT (DFM 181, 10 Aug 2026).
 *
 *    His words: "you've said on point 2 not to open Signal Relay project
 *    from the last lesson. I don't remember lesson 2 having this name,
 *    can you double check this?"
 *
 *    Checked - and the answer is not the simple one. Lesson 2 names that
 *    project TWICE, differently:
 *      - its ladder SET-UP CARD tells the pupil to type "Signal Relay";
 *      - its FILM is a build-along ("build the programs along with it on
 *        your own screen") and types "make-it-move" on camera, and the
 *        teacher brief names the demo that too.
 *    So whichever a pupil followed, the OTHER name is wrong for her - and
 *    Lesson 3 naming either one would be wrong for half the room. Lesson 3
 *    therefore calls it "last lesson's project", which is true for every
 *    pupil and invents nothing.
 *
 *    Lesson 2's own conflict is NOT fixed here: DFM 176 locks Lesson 2 and
 *    the fix is his call. It is printed as a WAIVED finding on every run,
 *    the same way "the device" debt is, so it stays visible.
 * ------------------------------------------------------------------ */
console.log('\n== 5. a later lesson never brand-names an earlier project (DFM 181) ==');
const PROJECT_NAMES = /(Signal Relay|make-it-move)/i;
const L2j = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/j1-02.json'), 'utf8'));
const L3j = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/j1-03.json'), 'utf8'));
const setupOf = (L) => {
  const lad = (L.chunks || []).find(c => c.engine === 'ladder');
  return ((lad && lad.config && lad.config.setup) || []).join(' ');
};
const setup3 = setupOf(L3j);
check(/last lesson's project/i.test(setup3),
  "Lesson 3's set-up list calls the old project \"last lesson's project\" — true whichever name she used");
check(!PROJECT_NAMES.test(setup3),
  'and it brand-names neither "Signal Relay" nor "make-it-move" (DFM 181)');
/* the built shell she is served must agree with the source */
check(!/Do NOT open (your Signal Relay|make-it-move)/i.test(built),
  'the built PathB_Index.html carries no brand-named warn-off either');

/* THE DEBT IS PAID (DFM 188, his 11 Aug ruling — he opened Lesson 2's lock to do it).
   It used to print here as a WAIVED finding: the set-up card said "Signal Relay" while
   the build-along film typed "make-it-move" on camera, so one project had two names and
   whichever a pupil followed, the other was wrong for her. His fix deleted the naming
   step entirely — the project is named ONCE, on camera, in the film — so the card now
   refers back to the name she actually gave it. This is a law now, not a waiver: the
   card and the film must agree, and a card that re-names a project the film already
   named is the fault. */
const l2Setup = setupOf(L2j);
const l2FilmSrc = path.join(__dirname, 'scenes/l2.js');
check(fs.existsSync(l2FilmSrc), "Lesson 2's film scene script was found, so the name it types can be checked");
const l2FilmText = fs.existsSync(l2FilmSrc) ? fs.readFileSync(l2FilmSrc, 'utf8') : '';
check(/make-it-move/.test(l2FilmText),
  'the Lesson 2 film still types "make-it-move" on camera (the one place the project is named)');
check(!/Signal Relay/i.test(l2Setup),
  'and the Lesson 2 set-up card no longer tells her to type a DIFFERENT name (DFM 188)');
check(/make-it-move/i.test(l2Setup),
  'the set-up card names the project exactly as the film named it — one project, one name');
check(!/type\s+Signal Relay|says Untitled/i.test(l2Setup),
  'the card no longer promises the box reads "Untitled", which was only true if she had NOT built along');

console.log('\n== 6. CONTROLS: the pre-fix text must fail these very tests ==');
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
/* THE PROJECT-NAME CONTROLS: the exact sentence he read on his own screen, and
   the one I nearly replaced it with. BOTH must fail — that is the whole finding:
   the fault was never which name, it was naming it at all. */
const PRE_SETUP = "Click New Project, type scoreboard as the project's name, and press Create. Do NOT " +
  "open your Signal Relay project from last lesson — today's scoreboard is a fresh build.";
const NEARLY = "Click New Project, type scoreboard as the project's name, and press Create. Do NOT " +
  "open make-it-move from last lesson — today's scoreboard is a fresh build.";
control(PROJECT_NAMES.test(PRE_SETUP) && !/last lesson's project/i.test(PRE_SETUP),
  'the sentence he questioned brand-names the project ("Signal Relay") and FAILS the law');
control(PROJECT_NAMES.test(NEARLY) && !/last lesson's project/i.test(NEARLY),
  'and so does the "make-it-move" version — Lesson 2 gives that project BOTH names, so either is wrong for half the class');
control(!PROJECT_NAMES.test("Do NOT open last lesson's project — today's scoreboard is a fresh build."),
  'while the shipped wording, which names no brand at all, PASSES (over-tightening guard)');
/* THE LESSON-2 ONE-NAME CONTROLS (DFM 188): the exact set-up line he had us delete,
   which is the line that created the two-name clash in the first place. */
const PRE_L2_SETUP = 'Give your project a name: click the box at the bottom that says Untitled and type Signal Relay.';
control(/Signal Relay/i.test(PRE_L2_SETUP),
  'the deleted Lesson 2 set-up step named the project "Signal Relay" and FAILS the one-name law');
control(/says Untitled/i.test(PRE_L2_SETUP),
  'and it promised the box would read "Untitled", which was false for any pupil who built along with the film');
control(!/Signal Relay/i.test(l2Setup) && /make-it-move/i.test(l2Setup),
  'while the shipped set-up list names the project once, the way the film named it (over-tightening guard)');

/* ------------------------------------------------------------------ *
 * THE SIDE QUEST'S DEADLINE IS ONE FACT WITH SIX HOMES (22 Aug 2026).
 * The design spec named three - the briefing card, the lesson-file tagline and
 * the manifest tagline (the string the TILE renders). Executing his ruling
 * found three MORE, all in the teacher brief inside the same lesson file: the
 * purpose line, the running-the-hour text and the say-line a teacher reads
 * aloud. Three would have been a guard that let the teacher contradict the
 * pupil's own tile, which is the precise fault DFM 167 exists to stop.
 * It deliberately does NOT hardcode WHICH lesson the deadline names - that is
 * Damien's call - it holds every home EQUAL, so whichever he rules they can
 * never come apart again (DFM 144/167b).
 * ------------------------------------------------------------------ */
console.log('\n== 7. the side quest names ONE deadline, in every home it has ==');
{
  const sqFile = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/j1-sq1.json'), 'utf8'));
  const man = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/manifest.json'), 'utf8'));
  const manEntry = (man.lessons || []).find(l => l.id === 'j1-sq1') || {};
  const brief = (sqFile.chunks || []).find(c => c.id === 'sq-brief') || { config: {} };
  const tb = sqFile.teacherBrief || {};
  const run = (tb.runningTheHour || []).find(r => /before\s+Lesson/i.test(String(r.text || '') + String(r.say || ''))) || {};
  /* "before Lesson N" is the fact; the number is what must agree. */
  const nameOf = (t) => { const m = /before\s+Lesson\s+(\d+)/i.exec(String(t || '')); return m ? m[1] : null; };
  const first = (arr) => (arr || []).map(nameOf).find(v => v !== null) || null;
  const homes = {
    'PUPIL: the briefing card she reads': first((brief.config || {}).lines),
    'PUPIL: the lesson-file tagline': nameOf(sqFile.tagline),
    'PUPIL: the manifest tagline (the tile)': nameOf(manEntry.tagline),
    'TEACHER: the brief\'s purpose section': first(tb.purpose),
    'TEACHER: the running-the-hour row': nameOf(run.text),
    'TEACHER: the say-line read aloud': nameOf(run.say)
  };
  Object.keys(homes).forEach(h => {
    check(homes[h] !== null, 'the deadline is stated in ' + h + ' (found: ' + JSON.stringify(homes[h]) + ')');
  });
  const vals = Object.keys(homes).map(h => homes[h]);
  check(new Set(vals).size === 1 && vals[0] !== null,
    'all six homes name the SAME lesson (' + JSON.stringify(homes) + ')');
  /* And the whole tree, so a seventh home cannot be born unwatched: no lesson
     anywhere may name a DIFFERENT lesson as the side quest's deadline. */
  const strays = [];
  for (const f of lessonFiles) {
    const raw = fs.readFileSync(path.join(SRC, 'j1/lessons/' + f), 'utf8');
    const rx = /before\s+Lesson\s+(\d+)/gi; let m;
    while ((m = rx.exec(raw))) if (m[1] !== vals[0]) strays.push(f + ': "' + m[0] + '"');
  }
  check(strays.length === 0, 'no lesson anywhere names a different deadline for it (' + strays.join(' | ') + ')');

  /* Controls both ways (DFM 196): a disagreement must be caught, and agreement
     must not be caught, or the check proves nothing either way. */
  const agree = (...xs) => new Set(xs.map(nameOf)).size === 1;
  control(!agree('done before Lesson 2.', 'done before Lesson 3.'),
    'a deadline that says Lesson 3 on the tile and Lesson 2 on the card FAILS the one-fact law');
  control(!agree('done before Lesson 2.', 'a vault you build yourself'),
    'a home that drops the deadline altogether FAILS it too (silence is not agreement)');
  control(!agree('have it done before Lesson 2.', 'check the dashboard before Lesson 3.'),
    'and the TEACHER brief drifting from the pupil tile FAILS it - the three homes the spec named would have missed exactly this');
  check(agree('done before Lesson 2.', 'have it done before Lesson 2.', 'I want it done before Lesson 2.'),
    'while homes that DO agree pass, whatever wording surrounds the fact (over-tightening guard)');
}

/* ------------------------------------------------------------------ *
 * DFM 252 — BOTH CLOUDS CARRY THE SAME SPINE, AND NEITHER IS STEERED OVER
 * THE OTHER. His ruling of 22 Aug: the app a file was made in decides its
 * cloud; Word/Excel/PowerPoint work lives in OneDrive, Google-tool work in
 * Google Drive; School -> DT Work is built in BOTH. The side quest's two
 * cards are the only place a pupil is ever taught this, and they now state
 * overlapping facts, so DFM 167(b) applies: one fact, held equal, or a
 * harness fails. Controls both ways, including the exact over-steer he
 * overruled.
 * ------------------------------------------------------------------ */
console.log('\n== 8. both clouds are first-class DT homes (DFM 252) ==');
{
  const sq = JSON.parse(fs.readFileSync(path.join(SRC, 'j1/lessons/j1-sq1.json'), 'utf8'));
  const chunk = (id) => (sq.chunks || []).find(c => c.id === id) || { config: {} };
  const drive = chunk('sq-drive').config, one = chunk('sq-onedrive').config;
  const stepText = (cfg) => (cfg.steps || []).map(s => String(s.text || '')).join(' \n ');
  const driveAll = stepText(drive), oneAll = stepText(one);

  /* (b) the spine is built in BOTH clouds */
  const buildsDTWork = (t) => /name (?:this one |it )?exactly:\s*DT Work/i.test(t);
  check(buildsDTWork(driveAll), 'the Drive card builds DT Work inside School');
  check(buildsDTWork(oneAll), 'the OneDrive card builds DT Work inside School TOO (his ruling)');
  const buildsSchool = (t) => /name it exactly:\s*School/i.test(t);
  check(buildsSchool(driveAll) && buildsSchool(oneAll), 'and both cards build the School folder above it');

  /* (a) the app decides - stated once, and not contradicted anywhere */
  check(/The app you made a file in tells you which cloud it lives in/i.test(oneAll),
    'the which-cloud rule is the app-decides rule, in those words');
  check(/Word, Excel or PowerPoint\s*(?:→|->)\s*OneDrive/i.test(oneAll),
    'its Microsoft half names OneDrive');
  check(/Google Docs\s*(?:→|->)\s*Google Drive/i.test(oneAll),
    'its Google half names Google Drive');

  /* THE OVER-STEER HE OVERRULED must be dead on every surface of the lesson,
     not just the one sentence it was quoted from (DFM 150's sweep law). */
  const whole = JSON.stringify(sq);
  const STEER = [
    [/everything you make in DT lives here/i, 'the Drive card\'s "Everything you make in DT lives here"'],
    [/everything you make in DT\s*(?:→|->)\s*Google Drive/i, 'the old rule\'s "everything you make in DT -> Google Drive"']
  ];
  STEER.forEach(([rx, name]) => check(!rx.test(whole), 'the over-steer is gone: ' + name));

  /* Neither cloud may be described as the one DT actually uses. */
  check(/In DT you will use BOTH/i.test(oneAll),
    'and the card says plainly that DT uses BOTH clouds');

  /* The honest asymmetry (DFM 252d): only Drive is machine-checked, and the
     briefing says so rather than implying both are. */
  const briefLines = (chunk('sq-brief').config.lines || []).join(' ');
  check(/check your Google Drive ones are really there/i.test(briefLines),
    'the briefing names WHICH folders the website checks - the asymmetry is stated, not hidden');

  /* Controls both ways (DFM 196). */
  control(/everything you make in DT lives here/i.test(
    'This is your DT home. Everything you make in DT lives here — and your teacher can find it.'),
    'the pre-252 Drive sentence IS caught by the over-steer sweep');
  control(!/name (?:this one |it )?exactly:\s*DT Work/i.test(
    'Click + New → Folder and name it exactly: School. Now both of your clouds have the same tidy top level.'),
    'the pre-252 OneDrive card, which stopped at School, FAILS the both-clouds spine check');
  check(buildsDTWork('Open your School folder, then + New → Folder again, and name it exactly: DT Work.'),
    'while the shipped OneDrive step passes it (over-tightening guard)');
}

console.log('\n=========================================');
console.log(FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL CROSS-LESSON CHECKS PASSED');
process.exit(FAILS.length ? 1 : 0);
