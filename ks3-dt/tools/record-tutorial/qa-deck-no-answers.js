#!/usr/bin/env node
/* qa-deck-no-answers.js — NO QUIZ QUESTION AND NO ANSWER EVER GOES ON A SLIDE.
 *
 * HIS RULE, from the very first list (DFM 37): the deck is delivered at the
 * front, and "the on-screen activities then reinforce what the teacher has
 * already explained — do not show the actual quiz questions in the deck."
 *
 * WHY IT NEEDED A MACHINE. Every deck spec this round ends with the words
 * "DFM 37 sweep" and, until now, that sweep was a person reading slides. A
 * sweep done by hand once is not enforcement: it holds for exactly as long as
 * nobody edits a slide. That is the lesson of "tap" (DFM 150) — a banned string
 * is mechanical and belongs in a test, or the rule only ever applies to the
 * sentences somebody happens to be looking at.
 *
 * WHAT IT READS. Every marked thing a pupil is ever asked, out of the packed
 * content itself rather than from a list somebody maintains: the warm-up and
 * Do-Now recap items, the exit check, every question inside a chunk, the
 * ordering puzzle's blocks, and the QA desk's outcome lines (each of which
 * carries the exact fix). Then every word any deck projects OR says.
 *
 * WHAT COUNTS AS A LEAK. A question reproduced verbatim on a slide, or a whole
 * clause of an answer. The two floors, and the false alarm that set them, are
 * documented at `longEnough` below — they are considered numbers, not guesses,
 * because the gate's own over-tightening control caught the first attempt
 * flagging an honest sentence (DFM 146a).
 *
 * IT CHECKS THE SPEAKER NOTES TOO, and that is deliberate: a note is what the
 * teacher SAYS. Reading a quiz question aloud from the notes gives the answer
 * away exactly as printing it would.
 *
 * Usage: node qa-deck-no-answers.js      (exit 0 = pass, 1 = fail)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CONTENT = path.join(ROOT, 'content');

const fails = [];
const notes = [];
const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const flat = s => norm(s).toLowerCase().replace(/[’']/g, "'");

/* ── WHAT COUNTS AS A LEAK, and the false alarm that set the floor ──────────
   The first version of this gate held every asked string at 20 characters and
   immediately reported Lesson 2's slide "Nobody marks the ladder. The micro:bit
   itself is the judge…" as leaking an exit-check option, because one of that
   question's options is the noun phrase "The micro:bit itself".
   That is not a leak. It is four ordinary words that the lesson is entitled to
   use, and a gate which stops the round for it is the DFM 146(a) fault — a
   check that reports a problem the deck does not have is worse than no check,
   because the next person to see it starts ignoring the gate.
   THE RULE THAT CAME OUT OF IT: a QUESTION is distinctive by nature, so a stem
   is held at 20 characters. An OPTION, an explanation, a puzzle block or a fix
   is only a leak when the deck reproduces a whole CLAUSE of it — 35 characters
   AND at least six words — which cannot happen by coincidence of ordinary
   English. The gate was caught by its own over-tightening control, which is the
   only reason this floor is a considered number instead of a guess. */
const STEM_FLOOR = 20;
const CLAUSE_FLOOR = 35;
const CLAUSE_WORDS = 6;
function longEnough(text, isStem) {
  const t = norm(text);
  if (isStem) return t.length >= STEM_FLOOR;
  return t.length >= CLAUSE_FLOOR && t.split(/\s+/).length >= CLAUSE_WORDS;
}

/* ── everything a pupil is ever ASKED, or told the answer to ──────────────── */
function askedIn(lessonJson, recapPool, lessonNum) {
  const out = [];
  const add = (text, what, isStem) => {
    const t = norm(text);
    if (longEnough(t, isStem)) out.push({ text: t, what });
  };
  const addItem = (it, what) => {
    add(it.stem, what + ' stem', true);
    (it.options || []).forEach((o, i) => add(typeof o === 'string' ? o : o.text, what + ' option ' + (i + 1)));
    if (it.explain) add(it.explain, what + ' explanation');
  };

  for (const ch of lessonJson.chunks || []) {
    const cfg = ch.config || {};
    (cfg.items || []).forEach(it => addItem(it, ch.id));
    (ch.items || []).forEach(it => addItem(it, ch.id));
    /* the ordering puzzle: its blocks ARE the answer, in order */
    (cfg.blocks || []).forEach((b, i) => add(typeof b === 'string' ? b : (b.text || b.label), ch.id + ' puzzle block ' + (i + 1)));
    /* the QA desk: every outcome names the exact fix */
    (cfg.criteria || []).forEach(c => {
      (c.outcomes || []).forEach((o, i) => {
        add(o.label || o.text, ch.id + ' QA outcome ' + (i + 1));
        add(o.fix, ch.id + ' QA fix');
      });
    });
    /* the casework clue ladder */
    (cfg.cases || []).forEach(cs => {
      (cs.clues || []).forEach((c, i) => add(typeof c === 'string' ? c : (c.text || c.clue), cs.id + ' clue ' + (i + 1)));
      (cs.fixes || []).forEach((f, i) => add(typeof f === 'string' ? f : (f.text || f.fix), cs.id + ' fix ' + (i + 1)));
    });
    /* ══ THE INSPECTION'S OWN ANSWERS (added for the J2/J3 round, 17 Aug 2026) ══
       J2 Lesson 1's biggest activity is not a question engine at all: it is five
       drawn rooms, and the pupil's job is to work out which stations break which
       rule. Every zone therefore carries the answer in prose — `rule` says what is
       wrong with a flagged station, and `clearSay`/`okSay` say why a clean one is
       fine, INCLUDING the two looks-wrong-but-is-not traps that are the whole
       point of scenes 4 and 5.
       None of that was reachable from this gate: it collected `items`, `blocks`,
       `criteria` and `cases`, and an inspect zone is none of them. So a slide
       could have printed "the screen showing the sign-in box is the one that is
       fine" and every check would have gone green. That is the DFM 204 shape —
       coverage that does not exist, reporting nothing — on the one activity in
       the year that is built entirely out of answers.
       The six RULES themselves (`config.rules`) are deliberately NOT collected:
       they are the teaching, the deck is meant to deliver them, and he ruled that
       giving the room rules first is on purpose. */
    (cfg.scenes || []).forEach((sc, si) => {
      const where = ch.id + ' scene ' + (si + 1);
      (sc.zones || []).forEach((z, zi) => {
        const zn = where + ' › ' + (z.name || 'zone ' + (zi + 1));
        add(z.rule, zn + ' verdict');
        add(z.clearSay, zn + ' clean verdict');
        add(z.okSay, zn + ' left-alone verdict');
      });
    });
  }
  (lessonJson.exit && lessonJson.exit.items || []).forEach(it => addItem(it, 'exit check'));

  /* the Do-Now serves the RECAP POOL, so its items are asked in this lesson
     too — a pool item on a slide is the same leak by a different route */
  for (const it of (recapPool && recapPool.items) || []) {
    const from = String(it.lesson == null ? '' : it.lesson);
    if (!from || Number(from) < Number(lessonNum)) addItem(it, 'Do-Now item ' + (it.id || ''));
  }
  return out;
}

/* ── every word a deck projects or says ───────────────────────────────────── */
function deckText(deck) {
  const out = [];
  for (const sec of deck.sections || []) {
    for (const sl of sec.slides || []) {
      const push = (v, where) => { const t = norm(v); if (t) out.push({ text: t, where }); };
      push(sl.heading, 'heading');
      push(sl.kicker, 'kicker');
      (sl.bullets || []).forEach((b, i) => push(b, 'bullet ' + (i + 1)));
      push(sl.beacon, 'beacon');
      push(sl.notes, 'speaker notes');
      push(sl.sub, 'sub-heading');
    }
  }
  return out;
}

function sweep(lesson, deck, asked) {
  const found = [];
  const texts = deckText(deck);
  for (const a of asked) {
    const needle = flat(a.text);
    for (const t of texts) {
      if (flat(t.text).indexOf(needle) !== -1) {
        found.push(lesson + ': the ' + t.where + ' on a slide reproduces the ' + a.what +
          ' — "' + a.text.slice(0, 70) + (a.text.length > 70 ? '…' : '') + '"');
      }
    }
  }
  return found;
}

/* ─────────────────────────────── the run ────────────────────────────────── */
let decks = 0, asks = 0;
for (const year of fs.readdirSync(CONTENT)) {
  const dir = path.join(CONTENT, year, 'decks');
  if (!fs.existsSync(dir)) continue;
  const poolPath = path.join(CONTENT, year, 'recap-pool.json');
  const pool = fs.existsSync(poolPath) ? JSON.parse(fs.readFileSync(poolPath, 'utf8')) : null;
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith('.deck.json')) continue;
    const deck = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const lessonPath = path.join(CONTENT, year, 'lessons', deck.lesson + '.json');
    if (!fs.existsSync(lessonPath)) { fails.push(deck.lesson + ': no packed lesson to sweep its deck against'); continue; }
    const lj = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
    const asked = askedIn(lj, pool, lj.num);
    decks++; asks += asked.length;
    sweep(deck.lesson, deck, asked).forEach(m => fails.push(m));
    notes.push(deck.lesson + ': ' + asked.length + ' asked/answer strings held off ' +
      deckText(deck).length + ' projected and spoken lines');
  }
}

/* ═════════════ THE CONTROLS (DFM 196 — proved to fail, then trusted) ═══════
   Both directions, because only one of them is easy. A gate that catches a
   planted leak but also flags honest slides would stop this round's decks for a
   fault they do not have, which is its own defect (DFM 146a). */
(function controls() {
  const lessonPath = path.join(CONTENT, 'j1', 'lessons', 'j1-02.json');
  const deckPath = path.join(CONTENT, 'j1', 'decks', 'j1-02.deck.json');
  if (!fs.existsSync(lessonPath) || !fs.existsSync(deckPath)) {
    fails.push('CONTROL could not run — j1-02 is not packed');
    return;
  }
  const lj = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
  const pool = JSON.parse(fs.readFileSync(path.join(CONTENT, 'j1', 'recap-pool.json'), 'utf8'));
  const asked = askedIn(lj, pool, lj.num);
  const real = JSON.parse(fs.readFileSync(deckPath, 'utf8'));

  if (!asked.length) { fails.push('CONTROL could not run — j1-02 appears to ask nothing at all'); return; }

  /* (1) a slide that prints a real exit-check stem must be REJECTED */
  const leak = JSON.parse(JSON.stringify(real));
  const firstSlide = ((leak.sections || [])[0] || {}).slides || [];
  if (!firstSlide.length) { fails.push('CONTROL could not run — j1-02 deck has no slides'); return; }
  firstSlide[0].bullets = (firstSlide[0].bullets || []).concat([asked[0].text]);
  const caught = sweep('CONTROL', leak, asked);
  if (!caught.length) {
    fails.push('THE LEAK CONTROL PASSED. A slide printing "' + asked[0].text.slice(0, 50) +
      '…" — a real ' + asked[0].what + ' — was accepted, so this gate would not stop a ' +
      'quiz answer being projected in front of the class it is meant to test.');
  } else {
    notes.push('control: a slide printing a real ' + asked[0].what + ' was REJECTED');
  }

  /* (2) the same leak in the SPEAKER NOTES must be rejected too — a note is
     what the teacher says out loud, which gives it away exactly as printing it
     would */
  const spoken = JSON.parse(JSON.stringify(real));
  spoken.sections[0].slides[0].notes = norm(spoken.sections[0].slides[0].notes) + ' ' + asked[0].text;
  if (!sweep('CONTROL', spoken, asked).length) {
    fails.push('THE SPOKEN-LEAK CONTROL PASSED. A speaker note carrying a real question was ' +
      'accepted, so a teacher could be scripted into reading the quiz aloud.');
  } else {
    notes.push('control: a speaker note carrying a real question was REJECTED');
  }

  /* (3) the OVER-TIGHTENING guard: the real, unmodified deck must pass */
  if (sweep('CONTROL', real, asked).length) {
    fails.push('THE OVER-TIGHTENING CONTROL FAILED. The real j1-02 deck was flagged as ' +
      'leaking, which means this gate reports a fault the deck does not have — worse ' +
      'than no gate (DFM 146a). Fix the matcher before trusting any pass above.');
  } else {
    notes.push('control: the real j1-02 deck passes cleanly (the over-tightening guard)');
  }

  /* ═══ (4) THE INSPECTION CONTROL — the new row kind, proved to bite ═════════
     A gate that has grown a new reach and never been watched to use it has not
     grown at all. This plants the exact leak the extension exists for: a slide
     that tells the class which station in scene 4 is the one that only LOOKS
     wrong. It is fed through the same askedIn/sweep the real decks go through. */
  const j2Path = path.join(CONTENT, 'j2', 'lessons', 'j2-01.json');
  const j2Deck = path.join(CONTENT, 'j2', 'decks', 'j2-01.deck.json');
  if (!fs.existsSync(j2Path) || !fs.existsSync(j2Deck)) {
    notes.push('(inspection control skipped — j2-01 is not packed yet)');
    return;
  }
  const j2 = JSON.parse(fs.readFileSync(j2Path, 'utf8'));
  const j2asked = askedIn(j2, null, j2.num);
  const zoneVerdicts = j2asked.filter(a => /scene \d+ › .* verdict$/.test(a.what));
  if (!zoneVerdicts.length) {
    fails.push('THE INSPECTION CONTROL COULD NOT RUN: j2-01\'s inspection scenes yielded no ' +
      'zone verdicts, so the new reach is collecting nothing and the extension is ' +
      'decorative. Check askedIn\'s scenes walk.');
    return;
  }
  notes.push('j2-01: ' + zoneVerdicts.length + ' inspection zone verdict(s) now held off the board too');
  const j2real = JSON.parse(fs.readFileSync(j2Deck, 'utf8'));
  const leak2 = JSON.parse(JSON.stringify(j2real));
  const sl2 = ((leak2.sections || [])[0] || {}).slides || [];
  sl2[0].bullets = (sl2[0].bullets || []).concat([zoneVerdicts[0].text]);
  if (!sweep('CONTROL', leak2, j2asked).length) {
    fails.push('THE INSPECTION-LEAK CONTROL PASSED. A slide printing "' +
      zoneVerdicts[0].text.slice(0, 60) + '…" — the verdict on a real station in a room the ' +
      'class is about to inspect — was accepted. The whole activity is made of answers, so ' +
      'this gate must reach them.');
  } else {
    notes.push('control: a slide printing an inspection station\'s verdict was REJECTED');
  }
  if (sweep('CONTROL', j2real, j2asked).length) {
    fails.push('THE INSPECTION OVER-TIGHTENING CONTROL FAILED. The real j2-01 deck was flagged ' +
      'as leaking an inspection verdict. Its six-rules slide is DELIBERATE (his ruling: the ' +
      'rules are given first, on purpose), so if the rules are being collected as answers the ' +
      'extension is over-reaching (DFM 146a).');
  } else {
    notes.push('control: the real j2-01 deck passes cleanly, six-rules slide and all');
  }
})();

notes.forEach(n => console.log('  ' + n));
if (fails.length) {
  console.error('');
  console.error('qa-deck-no-answers: FAILED — ' + fails.length + ' problem(s)');
  fails.forEach(f => console.error('  ✗ ' + f));
  console.error('');
  console.error('His rule (DFM 37): the deck is delivered at the FRONT and the activities');
  console.error('reinforce it afterwards. A question on a slide is a question already');
  console.error('answered, and the activity that follows it measures nothing.');
  process.exit(1);
}
console.log('qa-deck-no-answers: PASSED — ' + decks + ' decks swept against ' + asks +
  ' asked/answer strings, controls caught both a printed and a spoken leak');
