/* qa-language.js — THE COMMUNICATION-OF-LANGUAGE HARNESS (DFM 172, 178).

   DAMIEN, 9 Aug 2026: "You need to alway's ask the question, and put a harness
   on this, is what I'm trying to instruct or communicate clear enough for an 11
   or 12 year old?" ... "i insist you put an 'communication of language' harness
   in for everything you write that explains something to a child."

   And, at the handoff, the clarification that decides this file's shape (DFM 178):
   "this is more than just about 'banned' words - i just need sentences structured
   that made absolute sense to an 11/12 year old. bear in mind that after lesson 5
   we'll be moving on to J2 (12/13 year olds) then J3 (13/14 year olds) but the key
   is always the language of communication. nothing else matters if there is no
   understanding, and there will never be any understanding without context and
   appropriate language level."

   SO THE WEIGHTING IS DELIBERATE AND MUST NOT DRIFT:
     LAYER 2 (the ledger) is the HEART - every pupil-facing sentence carries a
     recorded judgement, made AS that year group's reader, against rule 138's own
     test: can she DO it where she sits, PICTURE every noun, SAY what it is for.
     An unreviewed sentence blocks the build. Editing a sentence voids its record,
     so the question is asked again at the exact moment text changes.
     LAYER 1 (mechanical) is the cheap net underneath, and inside it STRUCTURE
     outranks vocabulary: sentence length, dash-chains, sequences-as-lists,
     action-arrow chains, and the taught-vocabulary ORDER gate (context before
     content) are the checks that matter. The banned lexicon is the last and
     least of it - "Before the Rally" contains no banned word and fails anyway,
     on context, which is the whole point.

   WHY IT EXISTS AT ALL (DFM 177, from the record): the L3-L5 pupil text was
   authored in the 2 Aug batch - the day before rule 138 was written - and has
   been patched rule-by-rule since. Every review checked RULES and caught what
   rules catch; no pass ever sat and read every sentence cold, as the child, and
   no harness enforced the register. So adult idiom kept leaking in - including
   "thirty seconds of protection", written on 9 Aug BY the pre-sit review session
   commissioned to fix language. A standard that depends on remembering it is not
   a standard (DFM 150). This file is the standard with teeth.

   Pure source scan + a hash ledger: no browser, no server needed.
   Usage: node qa-language.js            (all lessons)
          node qa-language.js j1-03      (one lesson, by file id)
   Wired into pack-content.js: a failure BLOCKS the pack. There is no skip flag. */

const fs = require('fs');
const path = require('path');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const VOCAB_FILE = path.join(SRC, 'vocab.json');
const LEDGER_FILE = path.join(SRC, 'language-ledger.json');
const ENGINES = path.join(__dirname, '../../platform/engines.js');

const FAILS = [];
const check = (c, m) => { if (!c) FAILS.push(m); return c; };
const control = (failed, m) => {
  console.log((failed ? '  PASS ' : '  FAIL ') + 'CONTROL: ' + m);
  if (!failed) FAILS.push('CONTROL ' + m);
};

/* ------------------------------------------------------------------ *
 * THE READER — ONE, FOR THE WHOLE PLATFORM, AND IT IS J1's.
 *
 * DFM 178(b) had the reader ageing up with the year group (J2 12/13,
 * J3 13/14). HIS K10 RULING, 15 Aug 2026, amends it in his own words:
 *   "the same reading age that we have for J1 is perfectly fine for
 *    both J2 and J3. So, really, there doesn't have to be anything more
 *    complicated."
 * So every pupil-facing sentence on the platform, in every year, is
 * written to and judged at the eleven-or-twelve-year-old. What stays
 * per-year is VOICE only — J2's builder voice, J3's junior-professional
 * voice — and tone never buys a harder sentence.
 *
 * THE TABLE IS KEPT, rather than collapsed to a constant, for two
 * reasons: the failure messages and ledger prompts still name a reader
 * per year (so nothing reads as if the year were unknown), and the day
 * he rules otherwise for one year, the change is one line in one place
 * rather than a hunt (DFM 144).
 * ------------------------------------------------------------------ */
const J1_READER = 'an 11 or 12-year-old';
const READERS = {
  j1: J1_READER,
  j2: J1_READER,   /* K10 — was 'a 12 or 13-year-old' */
  j3: J1_READER    /* K10 — was 'a 13 or 14-year-old' */
};
const readerFor = (year) => READERS[year] || READERS.j1;

/* ------------------------------------------------------------------ *
 * THE LOCK (DFM 176). Damien, 9 Aug 2026: "Lesson 1 and 2 are locked in
 * and don't need changed at this point at all." He has sat them, signed
 * them off and deployed them.
 *
 * So their Layer-1 findings are REPORTED AND NOT BLOCKING. Not hidden -
 * hiding them would make the lock look like cleanliness, and it is not:
 * it is a deliberate, dated debt he chose to carry. Every run prints it,
 * so the day he lifts the lock, the work list is already written. Layer 2
 * still covers them: their sentences are grandfathered, so the moment one
 * is EDITED its record voids and a real judgement is demanded.
 * ------------------------------------------------------------------ */
const LOCKED = new Set(['j1-01', 'j1-02', 'j1-sq1']);

/* ------------------------------------------------------------------ *
 * THE HUB TEXT (his ruling, 14 Aug 2026: "definitely apply a language
 * harness. definitely, definitely, definitely! language is CRUCIAL
 * throughout.")
 *
 * Until this landed, the walk below opened `<year>/lessons/*.json` and
 * NOTHING else. So the text a pupil meets FIRST — the year title on the
 * hub, the block headers, and the title and tagline on all eighteen
 * tiles — went through no gate at all: no shape rules, no lexicon, no
 * read-aloud record, and no banned-word ratchet. The recap pool sits
 * outside `lessons/` too, so its stems and options were equally unseen
 * even though a pupil answers them in the Do-Now.
 * That is the largest single exemption this harness has ever had, and
 * it was invisible precisely because it was an absence (DFM 213: an
 * exemption that hides a class of pupil text is worse than no check).
 *
 * WHAT IS IN: year title, year tagline, block names, every lesson title
 * and tagline, and every recap item's stem, options and explanation.
 * WHAT IS OUT, and the run SAYS so rather than staying quiet about it:
 * `coverNote` and `absenceNote` are written to the TEACHER (138.3's
 * register, judged by a different standard), and the pool's `threads`
 * labels/notes are planning metadata no pupil ever sees.
 * J1's hub strings are LOCKED (DFM 176) — reported every run, never
 * blocking, never edited without his word.
 * ------------------------------------------------------------------ */
const HUB_LOCKED_YEARS = new Set(['j1']);
const HUB_PUPIL_KEYS = new Set(['title', 'tagline', 'name', 'stem', 'options', 'explain']);
const HUB_TEACHER_KEYS = ['coverNote', 'absenceNote'];

/* ------------------------------------------------------------------ *
 * WHAT COUNTS AS PUPIL-FACING.
 * Fail-safe by design: every string under a chunk's config is INCLUDED
 * unless its key is machine-only. A new field somebody adds next month
 * is checked by default - the opposite way round from a manifest, which
 * silently ignores anything it has not been told about.
 * ------------------------------------------------------------------ */
const MACHINE_KEYS = new Set([
  /* `video` joined this set on 23 Aug 2026, when the briefing engine's dead
     `video` field was finally wired (DFM 253a). It is a file path exactly like
     `src`, and it had been null everywhere until then — so the moment it held a
     string, this fail-safe walk would have demanded a read-aloud judgement of
     "assets/video/shared/sq-cloud-explainer.mp4". A gate inventing work is the
     DFM 146a fault. The film's WORDS are not exempt: they live in `videoFilm`,
     which is walked in full. */
  'id', 'src', 'video', 'href', 'url', 'file', 'poster', 'img', 'icon', 'engine', 'phase',
  'mode', 'year', 'kind', 'kinds', 'logTerms', 'skin', 'clearToast_dev',
  /* THE INSPECT ENGINE'S TWO MACHINE FIELDS (16 Aug 2026, found while writing
     J2 Lesson 1's ledger records). `art` is a file path exactly like `src`, and
     `breaks` never reaches a screen at all: the engine reads it as the flag that
     says this zone stages a violation, and qa-inspect-scene reads it to prove
     every visualisable room rule is staged somewhere. Demanding a read-aloud
     judgement on either would have had someone write a judgement of a filename,
     which is a gate inventing work (DFM 146a). The zone's PUPIL sentence is
     `rule` / `clearSay` / `okSay`, and all three are checked. */
  'art', 'breaks'
]);
/* Order-bearing contracts: a wording change here can silently break an answer
   key, so they are checked by the LEXICON only - never by shape rules, and they
   are still ledgered. (The parsons prompt is the sentence the block order must
   match; the blocks are the literal Scratch/MakeCode block names.) */
const ORDER_BEARING = /›\s*item\s*›\s*(prompt|blocks)/;
/* Staff-facing: the misconception labels under keys.*.mis are read by a teacher
   on the Live tab, never by a pupil. keys.*.explain IS pupil-facing (she sees it
   the moment she answers) and is fully checked.
   `staffTitle` joins them (16 Aug 2026): it is what the Live tab calls this
   lesson's diagnostic in its panel heading — J1's Licence Exam, J2's Skills
   Snapshot, J3's Portfolio Zero — and no pupil ever sees it. It exists because
   the panel used to say "The Licence Exam" and "Sixteen questions" to a teacher
   looking at a J2 class. Judging it at the pupil's reading age would be the gate
   inventing work in the wrong register (DFM 146a); it is TEACHER register
   (138.3) and is judged in the teacher-facing pass like the brief. */
const isStaffPath = (p) => /›\s*mis(\s|›|\[)/.test(p) || /›\s*staffTitle\s*$/.test(p);

function collectStrings(lesson, fileId) {
  const out = [];
  const push = (p, s) => {
    if (typeof s !== 'string') return;
    const t = s.trim();
    if (!t) return;
    out.push({ path: p, text: s });
  };
  const walk = (node, p) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') { push(p, node); return; }
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, p + '[' + i + ']')); return; }
    if (typeof node !== 'object') return;
    Object.keys(node).forEach(k => {
      /* `img` is TWO different things in this content, and treating it as one
         hid four pupil-facing sentences (12 Aug 2026). As a STRING it is a file
         path — machine. As an OBJECT it is `{src, alt, caption}`, and the alt
         and the caption are sentences a child reads: the four Lesson 4 evidence
         photos carry the ticket's claim in words, right under the picture. They
         had never been scanned, never been ledgered, and rule 35's "a caption
         may not claim what its picture does not show" had nothing checking it.
         `src` inside stays machine on its own key. */
      if (MACHINE_KEYS.has(k) && !(k === 'img' && node[k] && typeof node[k] === 'object')) return;
      walk(node[k], p + ' › ' + k);
    });
  };
  ['title', 'tagline'].forEach(k => push(fileId + ' › ' + k, lesson[k]));
  /* `objectives` is DELIBERATELY out of scope: grepped the whole shell (app.js,
     engines.js, staff.js) - zero references, so no pupil ever reads them. They
     are lesson metadata for planning and the briefs. Counting them would also
     poison the vocabulary gate below, by "first using" a word in text nobody
     sees. The pupil's version of the same ideas is selfeval.statements, which
     IS in scope. */
  (lesson.chunks || []).forEach(ch => {
    const base = fileId + ' › ' + ch.id;
    push(base + ' › title', ch.title);
    if (ch.badge && ch.badge.name) push(base + ' › badge › name', ch.badge.name);
    /* the config walk is prefixed, because a chunk has a `title` AND its config
       usually has one too - two different sentences that collided on one path
       and made every ledger entry look stale by turns. Paths now mirror the JSON
       exactly, which is also how you find the field a failure is talking about. */
    walk(ch.config || {}, base + ' › config');
  });
  /* keys.*.explain - pupil-facing, shown the moment she answers */
  Object.keys(lesson.keys || {}).forEach(k => {
    if (k === '_brief') return;
    const key = lesson.keys[k];
    if (key && key.explain) push(fileId + ' › keys › ' + k + ' › explain', key.explain);
  });
  /* teacherBrief is DELIBERATELY out of scope: a different register entirely
     (DFM 138.3, professional economy) with its own rules and its own reader.
     Its facts are already guarded by qa-cross-lesson.js. */
  return out.filter(s => !isStaffPath(s.path));
}

/* ------------------------------------------------------------------ *
 * L1-1  THE BANNED-REGISTER LEXICON.
 * The LAST net, not the first (DFM 178a). Every entry is a phrase he
 * corrected or one of its family. EXTEND IT whenever he corrects
 * another - and sweep every surface in the same commit (DFM 150).
 * ------------------------------------------------------------------ */
const LEXICON = [
  { rx: /thirty seconds of (protection|insurance)/i, why: 'HIS NAMED FAULT (DFM 173): an abstract metaphor where a concrete action belongs', fix: 'say what she actually does and why it helps' },
  { rx: /\bprotection\b/i, why: 'abstract noun - a child cannot picture it (DFM 173 family)', fix: 'say the concrete thing: "your work is safe"' },
  { rx: /\binsurance\b/i, why: 'adult metaphor (same family)', fix: 'say what it protects against, plainly' },
  { rx: /before the rally,/i, why: 'HIS NAMED FAULT (DFM 173): an event named as shared context the card never gives', fix: 'give the context first, or drop the reference' },
  { rx: /tournament-grade/i, why: 'adult marketing register', fix: 'say what it must actually do' },
  { rx: /\bsolo shift\b/i, why: 'workplace idiom', fix: '"on your own today"' },
  { rx: /\bclock in\b/i, why: 'workplace idiom', fix: 'say the actual action ("Open the Case Board")' },
  /* widened 10 Aug: the shipped Lesson 4 film says "onto YOUR bench", which the
     old pattern ("on the bench") sailed straight past - the exact hole DFM 179(b)
     is about. A ban is only as good as the forms it actually catches. */
  { rx: /\bon(to)? (your|the|a) bench\b/i, why: 'invents furniture she cannot see (DFM 35) + workplace idiom', fix: 'name the real place: "open in Scratch"' },
  { rx: /\bevery frame\b/i, why: 'a screen-drawing word she has never met (DFM 138.1.3) — it is not the word she needs', fix: '"over and over, all game long" / "all the time"' },
  { rx: /\bthe vibes\b/i, why: 'teenage slang, and the opposite of the evidence the card is teaching', fix: '"the feeling"' },
  { rx: /gets its moment\b/i, why: 'adult flourish', fix: 'say what happens' },
  { rx: /for eternity/i, why: 'literary register', fix: '"forever"' },
  { rx: /\bscenarios?\b/i, why: 'adult exam word', fix: '"questions" / "what would happen if"' },
  { rx: /reference build/i, why: 'INVENTED FACT (DFM 167 family) - no such thing exists', fix: 'delete the claim' },
  { rx: /\btap\b/i, allow: /tape|tapped it into|taps? of the/i, why: 'she has a MOUSE (DFM 138.1.6, 150) - the ban he has had to give twice', fix: '"click"' },
  { rx: /the device\b/i, allow: /any device|pair device|mime a device|the device's own/i, why: 'generic noun (DFM 138.1.5) - name it: the micro:bit', fix: '"the micro:bit"' },
  { rx: /\bthe wifi\b/i, why: 'the school connection is WIRED (DFM 138.1.6)', fix: '"the connection to the website"' },
  /* HIS K18(a), 16 Aug 2026, on J3 Lesson 1's two stretch cases: "why is the
     last two questions on the 3rd card called 'SENIOR CASE'? makes no sense to
     me. a pupil might think these things only happen in senior school." The
     word carries a school meaning she already has, and it is the wrong one.
     One word, one meaning platform-wide: J2's stretch is the Hard Inspection,
     so J3's is the Hard Case. J1's "Senior Agent" RANK is a different word in a
     different place and is locked — hence `senior case`, never bare `senior`. */
  { rx: /\bsenior case/i, why: 'HIS NAMED FAULT (K18a): a pupil reads "senior" as senior school, not as harder', fix: '"Hard Case" (J2\'s Hard Inspection is the same word for the same idea)' },
  { rx: /\bgirls?\b/i, allow: /girls' school/i, why: 'DFM 26: "pupil", never "girl"', fix: '"pupil"' },
  { rx: /\bsignal points?\b/i, why: 'invented currency, killed by DFM 141(b)', fix: 'price it in real XP' },
  { rx: /\b(colou?r)ize|\borganize|\brecognize|\bapologize|\bcolor\b|\bcenter\b|\bbehavior\b/i, why: 'US spelling (DFM 138.1.12)', fix: 'UK form' }
];

/* ------------------------------------------------------------------ *
 * SENTENCE SPLITTING. Used by the length ceiling and the dash rule.
 * ------------------------------------------------------------------ */
/* \b matters: without it "…on a wrist." matched the "St." abbreviation and the
   splitter silently glued two sentences into one 38-word monster. */
const ABBR = /\b(?:e\.g|i\.e|etc|Mr|Mrs|Ms|Dr|St|vs|approx)\.$/i;
/* "No." (as in "No. 5") is deliberately NOT in that list: in writing for children
   a sentence ending "…if the answer is no." is far commoner, and treating it as
   an abbreviation glued two sentences together and reported a 41-word monster
   that did not exist. */
function sentences(text) {
  const parts = [];
  let buf = '';
  const toks = String(text).split(/(\s+)/);
  for (let i = 0; i < toks.length; i++) {
    buf += toks[i];
    const t = toks[i].trim();
    if (!/[.!?]["')\]]?$/.test(t) || ABBR.test(t) || /^[A-Z]\.$/.test(t)) continue;
    /* A period after a digit is ambiguous: "…it says 0." ends a sentence, but
       "1. make a variable" is a list marker. The next word decides - a real
       sentence end is followed by a capital. (Getting this wrong hid a genuine
       three-dash sentence inside what looked like one long numbered item.) */
    if (/\d[.!?]$/.test(t)) {
      const next = toks.slice(i + 1).find(x => x.trim());
      if (!next || !/^["'(]?[A-Z]/.test(next.trim())) continue;
    }
    parts.push(buf.trim()); buf = '';
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.filter(Boolean);
}
const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;
const MAX_WORDS = 34;

/* CODE IS NOT PROSE. The item runner has its own convention: a line of a question
   stem wrapped in backticks renders as `.q-code` - a block listing, not a
   sentence (engines.js stemHtml). Lesson 2's exit questions show
   `on button A pressed → show heart`, which is a real MakeCode sequence and
   exactly right. Running the prose rules over it would have forced me to damage
   approved, locked, CORRECT text to make a harness green - the eed2516 lesson
   (DFM 35 + 146a: a harness must never print a fault the app does not have).
   So prose checks see the string with its code spans removed; the LEXICON still
   sees everything, because a banned word is banned wherever it hides. */
/* DFM 192a — the ** bold markers are AUTHORING marks, not words. Every check
   (word ceilings, banned register, defining phrases, dash chains) must see the
   sentence the CHILD sees, or "a **BUG** has meant a **mistake**" would read as
   different text from the same sentence unbolded, and a bolded banned word
   would slip the lexicon. Stripped here, at the single choke point every check
   already goes through. The LEDGER still hashes the raw authored string, so
   adding or removing emphasis correctly voids the judgement and re-asks it. */
const unbold = (text) => String(text).replace(/\*\*([^*]+)\*\*/g, '$1');
const prose = (text) => unbold(String(text)).replace(/`[^`]*`/g, ' ');

/* ------------------------------------------------------------------ *
 * A LABEL IS NOT A SENTENCE — hoisted to module scope so the ledger's
 * short-sentence debt list and the fragment reporter below share ONE
 * definition (DFM 144). "Mission Control", "Welcome", "Ready" are
 * titles, tabs and button faces: naming a thing in two words is what
 * those surfaces are FOR. The rules that judge PROSE must not judge
 * them, or the real finding drowns in forty false ones (DFM 146a).
 * ------------------------------------------------------------------ */
const LABELish = /› (title|tagline|name|label|kicker|cta|confirm|confirmLabel|checkLabel|replayConfirm|badge › name|num|placeholder|notePlaceholder|namePlaceholder|titlePlaceholder|howPlaceholder|likePlaceholder|wonderPlaceholder|doneText|clueButton|clueStep1Head|clueStep2Head)$/;
const isLabelPath = (p) => LABELish.test(p) ||
  /› (chapters|steps|watch|items|statements)\[\d+\] › (title|label)$/.test(p);

/* ------------------------------------------------------------------ *
 * L1-6  THE FRAGMENT-CANDIDATES REPORTER (DFM 192b, redesigned by
 * Fable 5 on 12 Aug 2026 after the spec'd mechanism failed against
 * reality — ROUND5_DESIGN_ADDENDUM.md Part A; the law is DFM 197).
 *
 * WHAT DIED AND WHY, so nobody rebuilds it: Damien's rejected card read
 * "Four player tickets, four open cases — each ticket opens a CASE: one
 * bug to find and fix." That is SEVENTEEN words, so no length floor can
 * ever reach it; a word-list verb detector mis-reads it twice over
 * ("four OPEN cases", "one bug to FIND and FIX"); and the ≤6-word floor,
 * run for real, false-failed 242 good short sentences including text he
 * has signed off. THIS IS A REPORTER, NEVER A GATE. It surfaces suspects
 * so the judged cold-read pass (checklist §C q11) cannot miss one. The
 * judgement is the enforcement; 192b stays JUDGED in the audit.
 *
 * Every rule below exists because a prototype false positive demanded it.
 * ------------------------------------------------------------------ */
let nlp;
try { nlp = require('compromise'); }
catch (e) {
  /* a silently skipped reporter is rot (DFM 146a) — fail loudly, with the fix */
  console.error('\nqa-language: the fragment reporter needs compromise@14 and it is not installed.');
  console.error('  Run:  cd ks3-dt/tools/record-tutorial && npm i compromise@14');
  console.error('  (package.json carries it, so a freshly synced machine needs one npm i.)');
  process.exit(2);
}

/* A filename wrecks the tagger — "Pick shark-attack-broken-edition.sb3" reads
   as verbless — so it becomes an ordinary noun phrase before tagging. */
/* NORMALISATION FOR THE POS PATH ONLY (the debt list keeps the original text).
   Three things confuse the tagger rather than the reader, each fixed here:
     · filenames  "shark-attack-broken-edition.sb3" -> the file
     · Scratch BLOCK NAMES inside **bold**: "Drag **change score by 1** into…"
       tagged as one long noun phrase and swallowed the imperative "Drag", so a
       perfectly good instruction was reported as verbless (12 Aug artefact 3).
     · QUOTED EXCLAMATIONS  'Locked!' / 'Not this time!' ended a sentence
       mid-clause, so ONE good sentence read as two verbless ones (artefacts 1
       and 2). Protected before the splitter ever sees them.
   These are the three false candidates reported on 12 Aug; the ruling (DFM 201i)
   is that they are fixed here rather than tolerated as a noise floor, because
   the same run also drops the clause floor and a noisy reporter stops being read. */
const fragNormalise = (text) => prose(String(text)
  .replace(/\*\*([^*]+)\*\*/g, (m, inner) => (/\s/.test(inner) ? 'the block' : inner)))
  .replace(/\S+\.\w{2,4}\b/g, 'the file')
  .replace(/(["'‘“])([^"'’”]{1,40}?)[!?]([”’"'])/g, '$1$2$3');

/* Bare base verbs COUNT: "Now try…", "then look…" are tagged #Infinitive with
   no "to", and excluding them was the prototype's false-positive engine. What
   does NOT count: gerunds/participles on their own, and the infinitives inside
   a to-group ("one bug TO FIND AND FIX" is a noun phrase, not an action). */
function hasRealVerb(text) {
  const doc = nlp(String(text));
  if (doc.match('#Imperative').found) return true;
  const inf = new Set();
  doc.match('to #Infinitive+ (and #Infinitive+)?').docs
    .forEach(ts => ts.forEach(t => inf.add(t.id)));
  let real = false;
  doc.match('#Verb').docs.forEach(ts => ts.forEach(t => {
    if (inf.has(t.id)) return;
    const tags = t.tags instanceof Set ? t.tags : new Set(Object.keys(t.tags || {}));
    if (tags.has('Gerund') || tags.has('Participle')) return;
    real = true;
  }));
  return real;
}

/* An instruction that INTRODUCES a menu path ("Click …", "Choose …", "Go to …")
   is not part of the path. Drops a leading verb (and a leading adverb or "then"
   in front of it) so the arrow ratchet judges the PATH, not the instruction that
   points at it. Returns null when nothing is left to judge. */
function stripLeadingImperative(phrase) {
  let s = String(phrase).replace(/^(?:and\s+|then\s+|now\s+|first\s+|next\s+)+/i, '').trim();
  if (!s) return null;
  const doc = nlp(s);
  const terms = (doc.json()[0] || {}).terms || [];
  if (!terms.length) return null;
  const tags = new Set(terms[0].tags || []);
  if (tags.has('Verb') || tags.has('Imperative')) {
    s = terms.slice(1).map(t => t.text).join(' ').trim();
  }
  return s || null;
}

/* COMMAS ONLY. An em-dash, colon or semicolon ENDS the run — otherwise the
   appositive "Design ONE more change — a second danger, a speed-up —" reads as
   a fragment chain, and it is perfectly good writing. His sentence still fires,
   on "Four player tickets," + "four open cases". */
const RUN_END = /[—–;:]|--/;
function leadingVerblessRun(sentence) {
  const cut = sentence.search(RUN_END);
  const head = (cut === -1 ? sentence : sentence.slice(0, cut));
  const clauses = head.split(',').map(c => c.trim()).filter(Boolean);
  let run = 0;
  for (let i = 0; i < clauses.length; i++) {
    /* FLOOR 3 -> 2 WORDS (DFM 201i, his 13 Aug find). The release-desk sentence
       he caught — "Four fixes, one game — and some bugs only show up…" — chains
       two TWO-word verbless clauses, so a three-word floor could not reach it,
       and the judged pass missed it too. Two words is the shortest thing that
       can be a clause at all; below that a run is punctuation, not register. */
    if (wordCount(clauses[i]) < 2 || hasRealVerb(clauses[i])) break;
    run++;
  }
  return run;
}

function fragmentCandidates(rawText) {
  /* MENU-PATH NOTATION IS A CANDIDATE, NOT AN EXEMPTION (DFM 213, his find).
     This function used to `return []` for any string containing an arrow, on the
     grounds that "Variables → Make a Variable → 'score'" is not prose. The effect
     was that every instruction written that way — the first step of all three
     Lesson 5 blueprints among them — was exempt from the language gate BY DESIGN.
     His words: "a child won't know what you're actually saying here. What is the
     instruction?" He is right, and an exemption that hides a whole class of pupil
     text is worse than no check. Arrow notation is now REPORTED for pupil-facing
     text, and the rest of the string is judged normally. */
  const raw = String(rawText);
  const out = [];
  if (raw.indexOf('\u2192') !== -1) {
    out.push({ kind: 'MENU-PATH', text: raw.trim() });
  }
  /* the arrow run itself is not a sentence, so it is lifted out before the prose
     around it is judged — otherwise every such string reports twice for one fault */
  const sents = sentences(fragNormalise(raw.replace(/[^.!?;]*\u2192[^.!?]*/g, ' ')));
  sents.forEach(s => {
    if (leadingVerblessRun(s) >= 2) {
      out.push({ kind: 'CHAIN(intra)', text: s.trim() });
    }
  });
  /* A LONE VERBLESS OPENER IS A CANDIDATE ON ITS OWN (DFM 213). The rule below
     needs TWO verbless sentences in one string before it says anything, so
     "Four moves." followed by proper sentences was invisible — and the opening
     line is the worst place to have a hole, because it is where she decides
     whether she understands. His finds: "Four moves." (maze blueprint) and
     "Five moves" (quiz), both of which also miscounted their own steps. */
  if (sents.length && wordCount(sents[0]) >= 2 && wordCount(sents[0]) <= 6 && !hasRealVerb(sents[0])) {
    out.push({ kind: 'OPENER(verbless)', text: sents[0].trim() });
  }
  const verbless = sents.filter(s => wordCount(s) >= 2 && !hasRealVerb(s));
  if (verbless.length >= 2) {
    out.push({ kind: 'CHAIN(inter)', text: verbless.map(s => s.trim()).slice(0, 3).join('  ·  ') });
  }
  return out;
}

/* SCOPE: prose paths only. `ticket` is the players' own quoted voice and a
   reviewer may write "One star."; `caption`/`alt` are image text, nominal
   register by design; the ships/adds bullets are list register (both cold-read
   PASSed). PITCHES ARE IN SCOPE — the L5 spec itself rewrote them for exactly
   this fault. Films are out of scope here: their captions are individually
   ledgered and judged. */
const fragInScope = (p) => !(
  isLabelPath(p) ||
  / › ticket$/.test(p) ||
  /› (caption|alt)$/.test(p) ||
  /› (ships|adds)\[\d+\]$/.test(p)
);

/* ------------------------------------------------------------------ *
 * THE CHECKS. Each returns an array of problem strings.
 * ------------------------------------------------------------------ */
function lexiconCheck(text) {
  const out = [];
  LEXICON.forEach(e => {
    if (!e.rx.test(text)) return;
    if (e.allow && e.allow.test(text)) {
      /* the allowlist must not blanket-forgive a string that ALSO carries a real
         hit elsewhere in it - strip the allowed forms and re-test */
      const stripped = text.replace(new RegExp(e.allow.source, 'gi'), '');
      if (!e.rx.test(stripped)) return;
    }
    out.push('banned register: "' + (text.match(e.rx) || [''])[0] + '" — ' + e.why + ' → ' + e.fix);
  });
  return out;
}

function lengthCheck(rawText, reader) {
  const text = prose(rawText);
  return sentences(text)
    .filter(s => wordCount(s) > MAX_WORDS)
    .map(s => 'sentence too long for ' + reader + ' (' + wordCount(s) + ' words, ceiling ' +
      MAX_WORDS + ') — one idea per sentence: "' + s.slice(0, 90) + '…"');
}

/* ⚠ VERBLESS FRAGMENT CHAINS — DESIGNED, TRIED, AND DELIBERATELY NOT SHIPPED.
   Recorded here because the finding matters more than the code did.
   The ≤6-word escalation below is real and it works, but it CANNOT catch the
   sentence Damien actually complained about:
     "Four player tickets, four open cases — each ticket opens a CASE: one bug
      to find and fix."
   That is seventeen words, so no ceiling and no short-sentence rule sees it.
   What is wrong with it is verbless clauses. I built the detector — split on
   , ; : and em-dash, flag 3+-word clauses with no finite verb, fail on two or
   more in one sentence — and it did NOT fire on his sentence, because "four
   OPEN cases" contains "open", which is a verb in every word list and an
   adjective here. A check that silently never fires is worse than no check: it
   is false assurance, which is the exact fault this whole round exists to
   remove. So it is not shipped, and DFM 192b's fragment ban remains a JUDGED
   rule (audit §B / the cold-read checklist), not a harnessed one, until someone
   designs a test that genuinely catches his sentence. Do not mark 192b as
   HARNESSED in DFM_ENFORCEMENT_AUDIT.md on the strength of the ≤6-word rule. */

/* The rule is 3+ em-dash CLAUSES, and the word clause is doing real work.
   "read — predict — check — log" is four one-word LABELS on a title card, which
   is a list, not a sentence that ran away with itself - and the first version of
   this rule condemned it, which would have meant damaging a caption Fable had
   already read and deliberately kept, to make my own harness green (DFM 146a).
   So a dash-chain only fires when at least two of the parts are real clauses. */
function dashChainCheck(rawText) {
  const text = prose(rawText);
  return sentences(text)
    .filter(s => {
      if ((s.match(/ — /g) || []).length < 3) return false;
      return s.split(' — ').filter(p => wordCount(p.trim()) >= 3).length >= 2;
    })
    .map(s => 'dash-chain: 3+ em-dash clauses in one sentence — split it: "' + s.slice(0, 90) + '…"');
}

/* L1-3 (DFM 171): a numbered sequence living inside ONE string renders as a
   prose paragraph - the exact fault on the stretch card he photographed. The
   engine builds <ol> from ARRAY fields only, so a sequence must be an array. */
function inlineSequenceCheck(rawText) {
  const text = prose(rawText);
  /* MARKERS ARE NOT ALWAYS "1." (DFM 217, his find). This only ever recognised
     `1.` and `1)`, so "STEP 1, THE KIT: ... STEP 2, THE BLUEPRINT: ..." — a
     three-step sequence written straight into a paragraph — sailed through and
     shipped to him as run-on prose. A number introduced by the word STEP, or by
     an ordinal word, enumerates just as plainly as a full stop does.
     A REFERENCE IS NOT AN ENUMERATION. The first cut of this also caught "you
     tick step 1 above ... your blueprint in step 2 is open right now", which
     POINTS AT steps rather than listing them — good writing, and forcing it to
     change would be the gate inventing a fault (DFM 146a). So a marker only
     counts when it OPENS a clause: start of the string, or straight after a full
     stop or semicolon. */
  const WORDED = /(^|[.;!?]\s+)(step|stage|part)\s*1\b[\s\S]{0,400}?[.;!?]\s+(step|stage|part)\s*2\b/i;
  const ORDINAL = /(^|[.;!?]\s+)first,[\s\S]{0,300}?[.;!?]\s+second,/i;
  if (WORDED.test(text) || ORDINAL.test(text)) {
    return ['numbered sequence inside one string (DFM 171/217) — the steps are written into a ' +
      'paragraph and render as run-on prose. Author them as an array field (steps / introSteps / ' +
      'lines / testSteps) so each step gets its own line.'];
  }
  if (/(^|[^0-9])1[.)]\s+\S[\s\S]*?[^0-9]2[.)]\s+\S/.test(text)) {
    return ['numbered sequence inside one string (DFM 171) — it renders as run-on prose. ' +
      'Author it as an array field (steps / testSteps / lines / setup / rules) so each number ' +
      'gets its own line.'];
  }
  return [];
}

/* L1-4: a palette PATH is how the shell has always written "where to find a
   block" and Lesson 2 is locked around it ("Variables → Make a Variable"). An
   ACTION chain is different: it hides a sequence of things to DO inside arrows,
   which is the stretch card's other fault. Short segments, at most two arrows =
   a path. Anything longer = a sequence pretending to be a path. */
/* `names` (film strings only): segments the AUTHOR marked as things on screen,
   by wrapping the whole segment in <b>. A real menu path can be longer than
   three words - Scratch's own item is "Load from your computer" - and
   "<b>File</b> → <b>Load from your computer</b>" is the same go-here-then-here
   shape as the locked "Variables → Make a Variable", not an action chain. The
   word ceiling still governs everything the author did NOT mark, so
   "Four ticks → <b>READY FOR GALLERY</b> lights up" is still caught: the
   segment is not a name, it is a thing happening. (DFM 146a: fix the harness,
   never the correct sentence.) */
function arrowChainCheck(rawText, names) {
  const text = prose(rawText);
  const named = names || new Set();
  const out = [];
  /* Measure only what is ADJACENT to the arrows, bounded by ordinary punctuation
     - not the whole clause. The first version counted the surrounding sentence as
     part of the "step" and so condemned "…for 2 seconds, then Control → stop all",
     where the path itself is two words either side and perfectly clear. A harness
     that makes me mangle correct text to go green is the fault (DFM 146a). */
  const BOUND = /[,;:.!?()"“”—–]|\bthen\b/;
  const tailOf = (s) => { const p = s.split(BOUND); return (p[p.length - 1] || '').trim(); };
  const headOf = (s) => { const p = s.split(BOUND); return (p[0] || '').trim(); };
  const MAX_STEP = 3;      /* a palette name: "Make a Variable" is 3; an action is longer */
  const MAX_ARROWS = 2;

  const segs = text.split(/\s*(?:→|->)\s*/);
  if (segs.length < 2) return out;

  /* ── THE ARROW RATCHET (DFM 253c, his law of 23 Aug 2026) ───────────────────
     HIS WORDS, on step 4 of the OneDrive card: "I don't agree with having the
     arrow. I think it needs to be better explained. Like, the way we use our
     language harness." The rule he set: an arrow may mark a MENU PATH a pupil
     clicks — "+ New → Folder" stays — but it may NEVER stand for "goes to" or
     "becomes" inside a sentence that states a rule. Write the sentence out.

     WHY THE WORD-COUNT RULE ABOVE COULD NOT REACH IT, from the code rather than
     from a guess: it bounds each step at COMMAS, so his own sentence — "Work
     made in Word, Excel or PowerPoint → OneDrive" — measured its left step as
     "Excel or PowerPoint", three words, and passed. Its sibling one line below,
     "Work made in Google Docs → Google Drive", was caught only because it
     happens to have no comma in it. The two sentences are the same fault and
     the gate saw one of them.

     WHAT SEPARATES THE TWO KINDS, mechanically: a menu path NAMES things on
     screen, so its clause is verbless once a leading imperative ("Click…",
     "Choose…") is set aside. A rule statement makes a claim, and a claim has a
     verb of its own — "Work MADE in Word…". That is the test. */
  /* THE TWO SIDES ARE BOUNDED DIFFERENTLY, and the asymmetry IS the fix.
     BEFORE an arrow, a comma is usually inside the phrase the sentence has been
     building — "Work made in Word, Excel or PowerPoint" is one subject, and
     cutting it at the comma is exactly how the old rule measured a seven-word
     rule statement as the three-word name "Excel or PowerPoint" and let it
     through. So the left side runs back to real sentence punctuation.
     AFTER an arrow, a comma genuinely ends the path and the sentence moves on:
     "+ New → Folder, make 'School', open it" names ONE target, Folder. So the
     right side stops at the first comma. */
  /* AN EM-DASH ENDS A CLAUSE ON BOTH SIDES. Found by the ratchet firing on the
     very sentence DFM 254 adjudicates: "Build it right now in Drive — + New →
     Folder → 'School', then 'DT Work' inside it — and press the check button
     again." His entry says in as many words that "its arrows are menu paths and
     legitimate under 253c", so the gate was wrong and not the sentence — an
     em-dash brackets the path as an aside, and reading back THROUGH one turned
     a two-word path segment into a seven-word instruction (DFM 146a). His own
     "Work made in Word, Excel or PowerPoint → OneDrive" has no dash in it and is
     still caught, which is the control below. */
  const SENT_L = /[.!?;:]|[—–]|--|["“”]|\bthen\b/;
  const SENT_R = /[,.!?;:]|[—–]|--|["“”]|\bthen\b/;
  const firstArrow = text.search(/\s*(?:→|->)/);
  const lastArrowEnd = (() => {
    const m = [...text.matchAll(/\s*(?:→|->)\s*/g)];
    return m.length ? m[m.length - 1].index + m[m.length - 1][0].length : -1;
  })();
  if (firstArrow > 0 && lastArrowEnd > 0) {
    const leftParts = text.slice(0, firstArrow).split(SENT_L);
    const rightParts = text.slice(lastArrowEnd).split(SENT_R);
    const sides = [
      { where: 'before', phrase: (leftParts[leftParts.length - 1] || '').trim() },
      { where: 'after', phrase: (rightParts[0] || '').trim() }
    ];
    sides.forEach(side => {
      if (!side.phrase || wordCount(side.phrase) < 2) return;
      if (named.has(side.phrase)) return;
      /* a LEADING imperative introduces the path, it is not part of it:
         "Click + New (top-left) → New folder" is a menu path with an
         instruction in front of it, and condemning that would make the gate
         demand worse writing (DFM 146a). */
      const bare = stripLeadingImperative(side.phrase);
      if (!bare) return;
      /* BOTH CONDITIONS, and the conjunction is the whole point. A name is short:
         "Make a Variable" is three words, "+ New" is two, "on shake" is two. A
         RULE is longer than a name AND carries a verb of its own. The first cut
         of this ratchet tested the verb alone and condemned five perfectly good
         menu paths in locked lessons — including "Variables → 'Make a
         Variable...' → name it score", which is exactly the notation Lesson 2 is
         locked around. A gate that makes me mangle correct text to go green is
         the fault, not the text (DFM 146a). */
      if (wordCount(bare) <= MAX_STEP || !hasRealVerb(bare)) return;
      out.push('rule-statement arrow (DFM 253c, HIS LAW): "' + side.phrase + ' →" — the ' +
        'words ' + side.where + ' the arrow are a sentence with a verb in it (' +
        JSON.stringify(bare) + '), so the arrow is standing for "goes to", not for a menu ' +
        'path a pupil clicks. An arrow may mark a path ("+ New → Folder"); write a RULE out ' +
        'as a sentence.');
    });
  }
  /* consecutive arrows belong to ONE path while the segment between them is a
     bare name (no sentence punctuation in it) */
  let chain = 1;
  for (let i = 0; i < segs.length - 1; i++) {
    const left = tailOf(segs[i]);
    const right = headOf(segs[i + 1]);
    const isName = (s) => wordCount(s) <= MAX_STEP || named.has(s.trim());
    const midIsBareName = i > 0 && !BOUND.test(segs[i]) &&
      (wordCount(segs[i].trim()) <= MAX_STEP || named.has(segs[i].trim()));
    chain = midIsBareName ? chain + 1 : 1;
    const longest = Math.max(wordCount(left), wordCount(right));
    if (chain > MAX_ARROWS || !isName(left) || !isName(right)) {
      out.push('action-arrow chain (DFM 171 family): "' + left + ' → ' + right + '" — ' +
        (chain > MAX_ARROWS ? chain + ' arrows in a row' : 'a ' + longest + '-word step') +
        '. Palette paths only (at most ' + MAX_ARROWS + ' arrows, ' + MAX_STEP +
        ' words either side, e.g. "Variables → Make a Variable"). Write ACTIONS as sentences ' +
        'or numbered steps — an arrow between two things to DO hides a sequence.');
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * L1-5  THE TAUGHT-VOCABULARY GATE - the context half of DFM 178.
 * "there will never be any understanding without context and appropriate
 * language level." A watched term may not appear before the lesson (and
 * the chunk) that defines it, in READING ORDER. This is rule 138.1.3
 * ("a term is not defined until THIS reader has met the definition")
 * made mechanical across the whole year.
 * ------------------------------------------------------------------ */
/* `films` is optional and additive: a caption she reads while sitting in chunk X
   is text she has read in chunk X, so it can carry that chunk's definition. Not
   allowing this would force a definition to be duplicated onto a card purely to
   satisfy the gate — which is how gates start lying. */
/* Apostrophes and quotes normalised, whitespace collapsed. Without this, "the
   company's head office" written with a typographic apostrophe would never match
   the same phrase typed straight. Module scope: the card check, the in-film
   order check and definingPhrases() must all normalise identically. */
const norm = (t) => String(t).toLowerCase()
  .replace(/[\u2018\u2019\u02bc]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\s+/g, ' ')
  .trim();

/* `defining` is a string OR an array of strings (addendum Part D, 12 Aug 2026).
   One place decides what the phrases are, so the card check and the in-film
   ORDER check below can never disagree about what counts as a definition. */
function definingPhrases(term) {
  return [].concat(term.defining || [])
    .filter(x => typeof x === 'string' && x.trim())
    .map(x => norm(x));
}

function vocabCheck(lessons, vocab, films) {
  const out = [];
  const waivedDefining = [];
  /* one comparison shape for both sides: lower-cased, apostrophes flattened,
     whitespace collapsed. Without this, "the company's head office" written with
     a typographic apostrophe would never match the same phrase typed straight. */
  /* WHERE THE SIDE QUEST SITS IN THE SPINE (fixed 14 Aug 2026, DFM 221's
     cold read). `Number("S1")` is NaN, and every comparison with NaN is
     false — so before this, the side quest could neither be ordered nor be
     found out of order. It is not outside the spine at all: its own briefing
     tells the pupil "have it done before Lesson 3", so it sits between
     Lessons 2 and 3 and a term taught in Lesson 4 is genuinely unmet there. */
  const numOf = (L) => {
    const raw = L.json.num;
    const n = Number(raw);
    if (!isNaN(n)) return n;
    if (/^s\d+$/i.test(String(raw))) return 2.5;   /* J1's side quest: due before Lesson 3 */
    return 99;
  };
  const orderOf = {};
  lessons.forEach(L => { orderOf[L.fileId] = numOf(L); });
  /* THE COURSE A PUPIL ACTUALLY SITS IS THE UNIT OF "BEFORE" (19 Aug 2026, found
     by this gate failing j2-02 and j3-02 for sixteen words they teach themselves).
     Until today every lesson in every year was ordered on `num` alone, so `j2-02`
     (num 2) was judged against `j1-03` (num 3) and failed for "meeting variable
     before the meaning" — a lesson in a DIFFERENT COURSE that a J2 pupil never
     sits. Year One's whole premise (his K4 taper) is that the J2/J3 openers assume
     nothing from J1.
     So `definedIn` is now per-year: one object, or an ARRAY of them, and the
     ordering comparison happens only inside the year that owns the definition.
     THE EXEMPTION IS NOT SILENT AND IS NOT FREE (DFM 213): a term used in a year
     whose own spine never defines it FAILS. The only way past is to declare, in
     vocab.json and in writing, either where that year teaches it or that the year
     uses the ordinary English word — and the second prints as visible debt. */
  const yearOfLesson = (id) => String(id || '').slice(0, 2);
  const yearOf = (L) => String((L.json && L.json.year) || yearOfLesson(L.fileId));
  const defsOf = (term) => [].concat(term.definedIn || []).filter(Boolean);
  const defForYear = (term, yr) => defsOf(term).find(d =>
    String(d.year || yearOfLesson(d.lesson)) === yr) || null;
  const plainSenseNotes = [];
  (vocab.terms || []).forEach(term => {
    const rx = new RegExp('\\b(' + [term.term].concat(term.aliases || [])
      .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i');
    const primary = defsOf(term)[0] || {};
    const defLesson = primary.lesson;
    const defNum = orderOf[defLesson];
    let definitionSeen = false;
    lessons.forEach(L => {
      const num = numOf(L);
      const yr = yearOf(L);
      const mine = defForYear(term, yr);
      L.strings.forEach(s => {
        if (!rx.test(s.text)) return;
        if (!mine) {
          out.push(s.path + ': uses "' + term.term + '" but ' + yr.toUpperCase() +
            '\u2019s own spine never teaches it — vocab.json defines it only in ' +
            defsOf(term).map(d => d.lesson || d.year).join(', ') +
            ', and a ' + yr.toUpperCase() + ' pupil never sits that lesson');
          return;
        }
        if (mine.ordinaryWord) {
          plainSenseNotes.push(term.term + ' in ' + yr.toUpperCase() + ' — ' +
            (mine.why || 'declared as the ordinary English word, needing no teaching'));
          return;
        }
        const defLessonY = mine.lesson;
        const defNumY = orderOf[defLessonY];
        /* THE SIDE-QUEST EXEMPTION IS GONE (14 Aug 2026, DFM 221's cold read).
           It used to read `if (isSide) return;` — "side quest sits outside the
           spine" — which exempted EVERY side-quest sentence from the
           term-order gate by design. That is DFM 213's exact shape: an
           exemption that hides a whole class of pupil text is worse than no
           check, and it hid a real one. The side quest says "HQ will inspect
           the result" and titles a screen "HQ Inspection"; vocab.json files HQ
           as taught in Lesson 4, and the side quest is due before Lesson 3.
           The side quest is LOCKED (DFM 176), so this prints as waived debt
           rather than blocking — visible, not silent, and his to rule on. */
        if (defNumY === undefined) {
          out.push(s.path + ': watched term "' + term.term + '" but vocab.json names an unknown lesson "' + defLessonY + '"');
          return;
        }
        if (num < defNumY) {
          out.push(s.path + ': uses "' + term.term + '" but it is not taught until ' +
            defLessonY + ' (' + mine.chunkId + ') — she meets the word before the meaning');
        } else if (num === defNumY) {
          const chunkIds = (L.json.chunks || []).map(c => c.id);
          const defIdx = chunkIds.indexOf(mine.chunkId);
          const thisChunk = (s.path.split(' › ')[1] || '');
          const thisIdx = chunkIds.indexOf(thisChunk);
          if (defIdx >= 0 && thisIdx >= 0 && thisIdx < defIdx) {
            out.push(s.path + ': uses "' + term.term + '" before its own lesson defines it in "' +
              mine.chunkId + '"');
          }
        }
      });
      /* (c) THE DEFINING-PHRASE GATE (DFM 192i — his question, "why did the
         harness pass it?"). This used to ask only whether the WORD appeared in
         the defining chunk, which is how "sprite" and "script" counted as
         defined: Evidence Intake step 4 merely used them. A term can no longer
         be defined by being used. When `defining` is a phrase, that phrase must
         literally appear in the chunk's text; when it is null, the term is
         carried as a printed WAIVED-DEFINING debt (DFM 178c), never a silent
         pass. Apostrophes are normalised because content uses the typographic
         one and a spec phrase may not. */
      const here = defsOf(term).find(dd => dd.lesson === L.fileId);
      if (here && !here.ordinaryWord) {
        const inChunk = L.strings.filter(s => (s.path.split(' › ')[1] || '') === here.chunkId);
        /* `defining` is a STRING **or an ARRAY** (addendum Part D). A term can
           honestly be defined in more than one form of words — the film says
           "one for each character or thing", the card says "a sprite is one
           character or thing" — and forcing one phrase onto both would mean
           writing worse English to satisfy a gate. Any listed phrase satisfies
           either check. */
        const wants = definingPhrases(term);
        if (wants.length) {
          const inFilmHere = (films || []).filter(f => f.lesson === here.lesson && f.chunkId === here.chunkId);
          if (inChunk.some(s => wants.some(w => norm(prose(s.text)).indexOf(w) !== -1)) ||
              inFilmHere.some(f => wants.some(w => norm(prose(f.text)).indexOf(w) !== -1))) definitionSeen = true;
        } else {
          if (inChunk.some(s => rx.test(s.text))) definitionSeen = true;
          waivedDefining.push(term.term + ' (' + here.lesson + ' › ' + here.chunkId + ')');
        }
      }
    });
    if (defNum !== undefined && !definitionSeen) {
      out.push(definingPhrases(term).length
        ? 'vocab.json: "' + term.term + '" is claimed to be defined in ' + defLesson + ' › ' +
          (primary.chunkId || '?') + ', but its DEFINING PHRASE ("' + [].concat(term.defining).join('" / "') +
          '") is not in that chunk. A term used there is not a term defined there.'
        : 'vocab.json: "' + term.term + '" claims to be defined in ' + defLesson + ' › ' +
          (primary.chunkId || '?') + ', but the word never appears there (phantom definition)');
    }
  });
  if (plainSenseNotes.length) {
    console.log('\n  ORDINARY-WORD DECLARATIONS (a year using a term in its everyday sense, ' +
      'declared in vocab.json rather than skipped — visible, never silent):');
    [...new Set(plainSenseNotes)].sort().forEach(t => console.log('    \u00b7 ' + t));
  }
  if (waivedDefining.length) {
    console.log('\n  WAIVED-DEFINING (' + waivedDefining.length + ' terms carry no defining phrase yet — ' +
      'filled lesson by lesson as each comes under review, DFM 178c):');
    waivedDefining.sort().forEach(t => console.log('    · ' + t));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * L1-6  SCREEN CONTRACTS (rule 35 for named controls): a card that names
 * a button must name the button that is really there.
 * ------------------------------------------------------------------ */
function screenContractCheck(lessons) {
  const out = [];
  const enginesSrc = fs.existsSync(ENGINES) ? fs.readFileSync(ENGINES, 'utf8') : '';
  lessons.forEach(L => {
    (L.json.chunks || []).forEach(ch => {
      const cfg = ch.config || {};
      /* the artifact check button: content may rename it via checkLabel, and any
         card that names the button must use the SAME words the pupil will see */
      if (ch.engine === 'artifact') {
        const label = cfg.checkLabel || 'Run the HQ Inspection';
        const texts = [cfg.help, cfg.failText, cfg.intro].filter(Boolean).join(' ');
        const named = texts.match(/press ([A-Z][^.,—]{2,30}?)(?=[.,—]|\s+(?:below|again|and))/g) || [];
        named.forEach(n => {
          const btn = n.replace(/^press\s+/i, '').trim();
          if (!new RegExp(btn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(label)) {
            out.push(L.fileId + ' › ' + ch.id + ': the card says press "' + btn +
              '" but the button on screen reads "' + label + '" (DFM 35)');
          }
        });
      }
      /* the rally help must not promise more rules than the screen shows */
      if (ch.engine === 'tournament') {
        const words = { two: 2, three: 3, four: 4, five: 5, six: 6 };
        const say = (txt, arr, which) => {
          const m = String(txt || '').match(/follow the (two|three|four|five|six) rules/i);
          if (!m) return;
          const promised = words[m[1].toLowerCase()];
          if (promised !== (arr || []).length) {
            out.push(L.fileId + ' › ' + ch.id + ' › ' + which + ': promises "' + m[1] +
              ' rules" but the screen shows ' + (arr || []).length + ' (DFM 35)');
          }
        };
        say(cfg.help, cfg.rules, 'help');
        say(cfg.soloHelp, cfg.soloRules, 'soloHelp');
      }
      /* any "press/click the X button" must exist as a literal somewhere the
         pupil could actually see it: this chunk's own config, or the shell */
      const all = JSON.stringify(cfg);
      (all.match(/(?:press|click)(?: the)? ([A-Z][A-Za-z ]{2,24}?) button/g) || []).forEach(m => {
        const btn = (m.match(/(?:press|click)(?: the)? ([A-Z][A-Za-z ]{2,24}?) button/) || [])[1];
        if (!btn) return;
        const rx = new RegExp(btn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (!rx.test(all) || (all.match(rx) || []).length < 2) {
          if (!rx.test(enginesSrc)) {
            out.push(L.fileId + ' › ' + ch.id + ': names a "' + btn +
              '" button that appears nowhere in the chunk or the shell (DFM 35)');
          }
        }
      });
    });
  });
  return out;
}

/* ==================================================================== *
 * THE FILM SECTION (DFM 179).
 *
 * DAMIEN, 10 Aug 2026: "the language harness needs to extend to the text
 * in the video captions as well - does it?" It did not. He is right that
 * it must: rule 172's own wording is "everything you write that explains
 * something to a child", and a film caption is exactly that.
 *
 * The proof it was needed, from the 10 Aug audit: the shipped Lesson 4
 * film said "onto your bench" and "the broken build" - the very phrases
 * banned from the CONTENT the same day - because content and film were
 * two surfaces with only one gate between them. A shared gate is the
 * only thing that stops that drift (DFM 147's law: sweep every surface
 * that will ever SHOW the wording, including the ones that have not run
 * yet).
 *
 * THE STATIC-ONLY LAW, and why it is the right way round: a caption must
 * be readable straight out of the source, without running the film. So
 * every extracted argument has to resolve from string literals, literal
 * "+" concatenation, and constants that are themselves literal. Anything
 * else - a template interpolation, a function call, a value that only
 * exists at run time - FAILS the build. The writing convention bends to
 * the checkability, never the other way round (the DFM 166 precedent).
 *
 * scenes/guide.js is EXCLUDED by design: its reader is a teacher, not the
 * child rule 172 names, so it is governed by 138.4's register and its own
 * laws (121/122/163) - DFM 179(e).
 * ==================================================================== */
const SCENES_DIR = path.join(__dirname, 'scenes');

/* Each film maps to the lesson AND the chunk where a pupil is served it.
   That pairing is what lets the vocabulary gate run AT FILM POSITION - a
   caption may only use a word the pupil has already been taught by the
   time she is sitting in front of that film. A scene file with no entry
   here FAILS rather than being skipped: silence is how a surface stops
   being checked without anyone deciding that it should. */
const FILM_MAP = {
  l2: {
    lesson: 'j1-02', chunkId: 'ladder', locked: true,
    why: 'THE LESSON 2 FILM IS LOCKED. His words, 3 Aug 2026: "this video is fantastic, ' +
         'just two tweaks... Once those are fixed, that is the video locked in" (DFM 141). ' +
         'Its findings are printed, never blocking - exactly like Lesson 2 content under DFM 176.'
  },
  l3: { lesson: 'j1-03', chunkId: 'ladder' },
  l4: { lesson: 'j1-04', chunkId: 'board' },
  l5: { lesson: 'j1-05', chunkId: 'masterclass' },
  /* THE TWO LESSON 2 FILMS (19 Aug 2026). Both are text-based and both are
     served on their lesson's `film` chunk, which is also where vocab.json says
     J2's own spine teaches the word "variable" — so this entry is what makes
     that claim checkable rather than asserted. */
  'j2-l2': { lesson: 'j2-02', chunkId: 'film' },
  'j3-l2': { lesson: 'j3-02', chunkId: 'film' }
};
/* Extra constants the extractor may resolve, beyond the ones it harvests
   from the file itself. Extend this the day a scene needs one. */
const FILM_CONSTS = {};

/* Which cine call carries pupil-facing text, and where in its arguments.
   'obj' means the first argument is a spec object and the pupil-facing
   fields are kicker/title/sub/lines[]. */
const CINE_CALLS = {
  caption: { arg: 0 }, captionShow: { arg: 0 }, callout: { arg: 1 },
  card: { obj: true }, curtain: { obj: true }, drop: { obj: true }
};
/* THE RENDERING CONTRACT, guarded statically (DFM 166's law: "when two
   surfaces in one file take different input formats, the difference gets
   a guard, because sooner or later someone writes the wrong one").
   cinema.js sets a card's kicker/title/sub with textContent and a card's
   lines[] with innerHTML - so an HTML entity in a TITLE is shown raw on
   screen, which is exactly what he photographed on the Guide film's
   "Chapter 3 - part two &mdash; the flags" card. cinema.js already throws
   for curtain(); card() had no such guard at all. Now both are checked
   here as well, at qa time, on the built text. */
const PLAIN_TEXT_FIELDS = new Set(['kicker', 'title', 'sub', 'brand', 'credit']);

/* Entities the films actually use, plus the numeric forms. Anything left
   over after this decode is REPORTED, not silently tolerated: an entity
   the renderer does not know is an entity the pupil reads out loud. */
const ENTITIES = {
  mdash: '—', ndash: '–', rarr: '→', larr: '←', hellip: '…', amp: '&',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  quot: '"', apos: '\'', nbsp: ' ', middot: '·', times: '×', deg: '°',
  lt: '<', gt: '>', pound: '£', eacute: 'é', frac12: '½', bull: '•'
};
function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => (ENTITIES[name] !== undefined ? ENTITIES[name] : m));
}
/* The segments the author explicitly marked as things on screen: an arrow
   segment that is ENTIRELY inside one emphasis tag. Used only by the arrow
   law, and only for films (content strings carry no markup). */
function boldNames(raw) {
  const set = new Set();
  decodeEntities(String(raw)).split(/\s*(?:→|->)\s*/).forEach(seg => {
    const m = /^\s*<(b|i)>([^<]*)<\/\1>\s*$/.exec(seg);
    if (m && m[2].trim()) set.add(m[2].trim());
  });
  return set;
}

/* What the pupil actually reads: entities decoded, the <b>/<i> emphasis
   tags gone (they are styling, not words), and a line break in a title
   read as a space rather than as the end of a sentence. */
function filmRendered(raw) {
  return decodeEntities(String(raw))
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---- a very small, very deliberate reader of the scene source ---- *
 * Comments are blanked (offsets preserved) and every string span is
 * marked, so bracket matching can never be fooled by a bracket inside a
 * caption or inside a comment. */
function scanSource(src) {
  const n = src.length;
  const arr = src.split('');
  const inStr = new Uint8Array(n);
  let i = 0;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') { arr[i] = ' '; i++; } continue; }
    if (c === '/' && d === '*') {
      let e = src.indexOf('*/', i + 2); e = e < 0 ? n : e + 2;
      for (let k = i; k < e; k++) if (src[k] !== '\n') arr[k] = ' ';
      i = e; continue;
    }
    if (c === '\'' || c === '"' || c === '`') {
      const q = c; inStr[i] = 1; let k = i + 1;
      while (k < n) {
        if (src[k] === '\\') { inStr[k] = 1; if (k + 1 < n) inStr[k + 1] = 1; k += 2; continue; }
        inStr[k] = 1;
        if (src[k] === q) { k++; break; }
        k++;
      }
      i = k; continue;
    }
    i++;
  }
  return { clean: arr.join(''), inStr };
}
function matchBracket(s, inStr, start) {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (inStr[i]) continue;
    const c = s[i];
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
function splitTop(s, inStr, from, to) {
  const out = []; let depth = 0, start = from;
  for (let i = from; i < to; i++) {
    if (inStr[i]) continue;
    const c = s[i];
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push([start, i]); start = i + 1; }
  }
  if (s.slice(start, to).trim()) out.push([start, to]);
  return out;
}
function readLiteral(s, i) {
  const q = s[i];
  const ESC = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' };
  let j = i + 1, buf = '';
  while (j < s.length) {
    const c = s[j];
    if (c === '\\') {
      const e = s[j + 1];
      if (e === 'u') {
        if (s[j + 2] === '{') { const end = s.indexOf('}', j + 3); buf += String.fromCodePoint(parseInt(s.slice(j + 3, end), 16)); j = end + 1; continue; }
        buf += String.fromCodePoint(parseInt(s.slice(j + 2, j + 6), 16)); j += 6; continue;
      }
      if (e === 'x') { buf += String.fromCodePoint(parseInt(s.slice(j + 2, j + 4), 16)); j += 4; continue; }
      buf += (ESC[e] !== undefined ? ESC[e] : e); j += 2; continue;
    }
    if (c === q) {
      /* a template literal with an interpolation is not static - the text
         only exists once the film is running, so it cannot be checked */
      if (q === '`' && /\$\{/.test(buf)) return null;
      return { value: buf, end: j + 1 };
    }
    buf += c; j++;
  }
  return null;
}
/* Returns an ARRAY of resolved strings (usually one), or null when the
   expression is not statically readable. An index into a known literal
   array yields every element, because every element can reach the screen. */
function resolveStatic(exprRaw, consts, arrays) {
  const s = String(exprRaw).trim();
  if (!s) return null;
  const idx = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*\[[\s\S]*\]$/.exec(s);
  if (idx && arrays[idx[1]]) return arrays[idx[1]].slice();
  let out = '', i = 0, wantOperand = true;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (wantOperand) {
      if (c === '\'' || c === '"' || c === '`') {
        const lit = readLiteral(s, i);
        if (!lit) return null;
        out += lit.value; i = lit.end; wantOperand = false; continue;
      }
      const id = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(s.slice(i));
      if (id && consts[id[0]] !== undefined) { out += consts[id[0]]; i += id[0].length; wantOperand = false; continue; }
      return null;
    }
    if (c === '+') { i++; wantOperand = true; continue; }
    return null;
  }
  return wantOperand ? null : [out];
}
/* Constants are harvested from the file itself rather than hand-listed, so
   a scene that keeps its captions in a named array (the Lesson 3 animation
   beats) is still fully readable from source. SCREAMING_CASE only, so the
   rule stays obvious to whoever writes the next film. */
function harvestConsts(clean, inStr) {
  const consts = Object.assign({}, FILM_CONSTS);
  const arrays = {};
  const rx = /\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*/g;
  let m;
  while ((m = rx.exec(clean))) {
    if (inStr[m.index]) continue;
    const at = m.index + m[0].length;
    if (clean[at] === '[') {
      const end = matchBracket(clean, inStr, at);
      if (end < 0) continue;
      const vals = splitTop(clean, inStr, at + 1, end)
        .map(r => resolveStatic(clean.slice(r[0], r[1]), consts, arrays));
      if (vals.length && vals.every(v => v && v.length === 1)) arrays[m[1]] = vals.map(v => v[0]);
    } else {
      let e = at;
      while (e < clean.length && !(clean[e] === ';' && !inStr[e])) {
        if (!inStr[e] && '([{'.indexOf(clean[e]) >= 0) { const e2 = matchBracket(clean, inStr, e); if (e2 < 0) break; e = e2; }
        e++;
      }
      const v = resolveStatic(clean.slice(at, e), consts, arrays);
      if (v && v.length === 1) consts[m[1]] = v[0];
    }
  }
  return { consts, arrays };
}
function objectFields(clean, inStr, from, to) {
  const fields = {};
  splitTop(clean, inStr, from, to).forEach(r => {
    let depth = 0, colon = -1;
    for (let i = r[0]; i < r[1]; i++) {
      if (inStr[i]) continue;
      const c = clean[i];
      if (c === '(' || c === '{' || c === '[') depth++;
      else if (c === ')' || c === '}' || c === ']') depth--;
      else if (c === ':' && depth === 0) { colon = i; break; }
    }
    if (colon < 0) return;
    fields[clean.slice(r[0], colon).trim().replace(/^['"]|['"]$/g, '')] = [colon + 1, r[1]];
  });
  return fields;
}

/* ═════════════ A SCENE WHOSE WORDS LIVE IN THE CONTENT ════════════════════
   scenes/lS1.js (the side quest's cloud explainer, 23 Aug 2026) holds NO pupil
   words at all: every caption, and the title card's kicker, title and sub, are
   read out of the lesson JSON, so they are checked by the CONTENT gate and the
   read-aloud ledger like any other pupil sentence (DFM 190d — the arrangement
   his two own films already use).
   That is strictly better than the static film extractor, but it comes with an
   obvious way to rot: somebody adds ONE hardcoded caption to that file next
   month and nothing anywhere reads it. So the arrangement is asserted rather
   than trusted — every cine call in a content-fed scene must be handed a
   variable, never a string literal. (This is the same instinct as the
   static-only law, pointed the other way round.)

   REPORTED AND NOT CHANGED THIS ROUND, because it is a finding in lessons he has
   signed off and DFM 222(a) says those come to him before anything moves:
   `collectFilmStrings` scans `scenes/l[0-9]*.js` ONLY, so **scenes/j2-l2.js and
   scenes/j3-l2.js are not scanned at all**, although both carry FILM_MAP
   entries naming the lesson and chunk they belong to. The run says so in its own
   output — "across l2, l3, l4, l5" — and nobody has read it as the absence it
   is. Turning it on is a one-word regex change; what it may then find in two
   approved J2/J3 films is his call, not mine. */
const CONTENT_FED_SCENES = ['lS1.js'];
function contentFedSceneProblems() {
  const errs = [];
  CONTENT_FED_SCENES.forEach(file => {
    const f = path.join(SCENES_DIR, file);
    if (!fs.existsSync(f)) { errs.push('scenes/' + file + ': declared content-fed and not there'); return; }
    const src = fs.readFileSync(f, 'utf8');
    const { clean, inStr } = scanSource(src);
    const rx = /\bcine\.(caption|captionShow|callout|card|curtain|drop)\s*\(\s*(['"`])/g;
    let m;
    while ((m = rx.exec(clean))) {
      if (inStr[m.index]) continue;
      errs.push('scenes/' + file + ':' + (clean.slice(0, m.index).split('\n').length) +
        ' cine.' + m[1] + ' is handed a STRING LITERAL. This scene\'s words live in the ' +
        'lesson JSON so the language gate and the read-aloud ledger can see them (DFM 190d); ' +
        'a literal here is a pupil sentence no gate reads.');
    }
    /* and it really must be reading them from the content, not from a copy */
    if (!/videoFilm/.test(src)) {
      errs.push('scenes/' + file + ': it no longer reads videoFilm out of the lesson — ' +
        'the words and the judgement have come apart (DFM 144)');
    }
  });
  return errs;
}

/* ---- the extractor ---- */
function collectFilmStrings() {
  const out = [], errs = [];
  const files = fs.existsSync(SCENES_DIR)
    ? fs.readdirSync(SCENES_DIR).filter(f => /^l[0-9][^\\/]*\.js$/.test(f)).sort()
    : [];
  files.forEach(file => {
    const setId = file.replace(/\.js$/, '');
    const map = FILM_MAP[setId];
    if (!map) {
      errs.push('scenes/' + file + ': a new film with no FILM_MAP entry in qa-language.js — ' +
        'name the lesson and the chunk where a pupil is served it, so its captions are ' +
        'checked at the right point in the year.');
      return;
    }
    const src = fs.readFileSync(path.join(SCENES_DIR, file), 'utf8');
    const { clean, inStr } = scanSource(src);
    const { consts, arrays } = harvestConsts(clean, inStr);
    const lineAt = (i) => clean.slice(0, i).split('\n').length;

    const chapters = [];
    const crx = /\bid:\s*'(ch\d+)'/g;
    let cm;
    while ((cm = crx.exec(clean))) { if (!inStr[cm.index]) chapters.push({ at: cm.index, id: cm[1] }); }
    const chapterAt = (i) => {
      let id = 'ch?';
      for (const c of chapters) { if (c.at < i) id = c.id; else break; }
      return id;
    };

    const take = (rangeFrom, rangeTo, fieldName, callName, at) => {
      const vals = resolveStatic(clean.slice(rangeFrom, rangeTo), consts, arrays);
      if (vals === null) {
        errs.push('scenes/' + file + ':' + lineAt(at) + ' cine.' + callName +
          (fieldName ? ' (' + fieldName + ')' : '') +
          ': caption not statically checkable — write it as plain literals. ' +
          '(A caption that only exists while the film runs cannot be read as the child, ' +
          'so it cannot be gated. The writing convention bends to the checkability.)');
        return;
      }
      vals.forEach(raw => {
        if (!String(raw).trim()) return;
        out.push({
          set: setId, chapter: chapterAt(at), call: callName, field: fieldName || null,
          line: lineAt(at), raw: raw, text: filmRendered(raw),
          plainOnly: !!(fieldName && PLAIN_TEXT_FIELDS.has(fieldName)),
          lesson: map.lesson, chunkId: map.chunkId, locked: !!map.locked
        });
      });
    };

    const callRx = /\bcine\.(caption|captionShow|callout|card|curtain|drop)\s*\(/g;
    let m;
    while ((m = callRx.exec(clean))) {
      if (inStr[m.index]) continue;
      const open = m.index + m[0].length - 1;
      const close = matchBracket(clean, inStr, open);
      if (close < 0) { errs.push('scenes/' + file + ':' + lineAt(m.index) + ': unbalanced cine.' + m[1] + '( — the extractor cannot read it'); continue; }
      const args = splitTop(clean, inStr, open + 1, close);
      const spec = CINE_CALLS[m[1]];
      if (spec.obj) {
        if (!args.length) continue;
        let a = args[0][0];
        while (a < args[0][1] && clean[a] !== '{') a++;
        if (clean[a] !== '{') continue;                    /* not an object literal (never happens today) */
        const end = matchBracket(clean, inStr, a);
        const fields = objectFields(clean, inStr, a + 1, end);
        ['kicker', 'title', 'sub', 'brand'].forEach(k => {
          if (fields[k]) take(fields[k][0], fields[k][1], k, m[1], m.index);
        });
        if (fields.lines) {
          let b = fields.lines[0];
          while (b < fields.lines[1] && clean[b] !== '[') b++;
          if (clean[b] === '[') {
            const lend = matchBracket(clean, inStr, b);
            splitTop(clean, inStr, b + 1, lend).forEach((r, i) =>
              take(r[0], r[1], 'lines[' + i + ']', m[1], m.index));
          }
        }
      } else {
        if (args.length <= spec.arg) continue;
        take(args[spec.arg][0], args[spec.arg][1], null, m[1], m.index);
      }
    }
  });
  return { strings: out, errs };
}

/* The vocabulary gate, run AT FILM POSITION: a caption may only use a word
   the pupil has already been taught by the moment she is watching. */
function filmVocabCheck(films, lessons, vocab) {
  const out = [];
  const byId = {};
  lessons.forEach(L => { byId[L.fileId] = L; });
  (vocab.terms || []).forEach(term => {
    const rx = new RegExp('\\b(' + [term.term].concat(term.aliases || [])
      .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i');
    const defL = byId[term.definedIn.lesson];
    films.forEach(f => {
      if (!rx.test(f.text)) return;
      const here = byId[f.lesson];
      if (!here || !defL) return;
      const hereNum = Number(here.json.num || 99), defNum = Number(defL.json.num || 99);
      if (defNum > hereNum) {
        out.push(f.key + ': the film uses "' + term.term + '" but it is not taught until ' +
          term.definedIn.lesson + ' — she hears the word before she has met the meaning');
      } else if (defNum === hereNum) {
        const ids = (here.json.chunks || []).map(c => c.id);
        const defIdx = ids.indexOf(term.definedIn.chunkId), filmIdx = ids.indexOf(f.chunkId);
        if (defIdx >= 0 && filmIdx >= 0 && defIdx > filmIdx) {
          out.push(f.key + ': the film uses "' + term.term + '" but this lesson does not define it until "' +
            term.definedIn.chunkId + '", which she reaches AFTER the film in "' + f.chunkId + '"');
        }
      }
    });
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * LAYER 2 - THE READ-ALOUD LEDGER. The heart of the file (DFM 178a).
 * ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ *
 * E3 — IN-FILM TERM ORDERING (L4 spec Part E3, refined by addendum Part D).
 *
 * DAMIEN, 11 Aug 2026, on the Lesson 4 film: "You've mentioned sprites in this
 * video but how do you know that a child has ever heard of that?" He is right,
 * and the reason the old gate passed it is on the record (DFM 192i): the
 * vocabulary check works at CHUNK granularity, and the film lives inside the
 * chunk that defines the term — so the captions passed by POSITION, although a
 * pupil can watch the film before reading a single card.
 *
 * So: for a watched term whose defining lesson IS this film's lesson, the
 * term's FIRST USE in the film must be covered one of three ways. The second
 * and third exist because the spec's original wording missed two facts about
 * how these films are actually reached:
 *   (a) an earlier caption carries a defining phrase, or the first-use caption
 *       carries it ITSELF — a film may define a term in the same breath;
 *   (b) the term is already defined on a chunk that RENDERS BEFORE the film's
 *       host chunk;
 *   (c) it is defined on the host chunk's own pre-grid intro surface
 *       (intro / introSolo / introSteps / introAfter) — Lesson 4's film sits
 *       behind a board pin, and she cannot reach the pin without passing that
 *       card.
 * ------------------------------------------------------------------ */
const PREGRID = ['intro', 'introSolo', 'introSteps', 'introAfter'];

function filmOrderCheck(films, lessons, vocab) {
  const out = [];
  const byId = {};
  lessons.forEach(L => { byId[L.fileId] = L; });

  (vocab.terms || []).forEach(term => {
    const wants = definingPhrases(term);
    if (!wants.length) return;                    /* WAIVED-DEFINING: printed elsewhere */
    const rx = new RegExp('\\b(' + [term.term].concat(term.aliases || [])
      .map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i');
    const defLesson = term.definedIn.lesson;

    const bySet = {};
    films.filter(f => f.lesson === defLesson).forEach(f => { (bySet[f.set] = bySet[f.set] || []).push(f); });

    Object.keys(bySet).forEach(set => {
      /* the order she WATCHES them in: chapter, then line */
      const caps = bySet[set].slice().sort((a, b) =>
        String(a.chapter).localeCompare(String(b.chapter)) || (a.line - b.line));
      const firstIdx = caps.findIndex(f => rx.test(f.text));
      if (firstIdx === -1) return;
      const first = caps[firstIdx];

      /* (a) carried by this caption, or any caption before it */
      if (caps.slice(0, firstIdx + 1)
        .some(f => wants.some(w => norm(prose(f.text)).indexOf(w) !== -1))) return;

      const L = byId[defLesson];
      if (!L) return;
      const ids = (L.json.chunks || []).map(c => c.id);
      const hostIdx = ids.indexOf(first.chunkId);
      const defIdx = ids.indexOf(term.definedIn.chunkId);

      /* (b) defined on a chunk she passes BEFORE the film's host chunk */
      if (defIdx >= 0 && hostIdx >= 0 && defIdx < hostIdx) return;

      /* (c) defined on the host chunk's own pre-grid intro surface */
      const pre = L.strings.filter(s => {
        const parts = s.path.split(' \u203a ');
        /* strip the array index: the case-log definition lives on
           `introSteps[3]`, and comparing the raw segment to "introSteps" missed
           it — the check reported a real definition as missing, which is the
           one thing a gate must never do (DFM 146a). */
        const surface = String(parts[3] || '').replace(/\[\d+\]$/, '');
        return parts[1] === first.chunkId && parts[2] === 'config' && PREGRID.indexOf(surface) !== -1;
      });
      if (pre.some(s => wants.some(w => norm(prose(s.text)).indexOf(w) !== -1))) return;

      out.push(first.key + ' [' + first.set + ' ' + first.chapter + ' line ' + first.line + ']: the film ' +
        'says "' + term.term + '" here for the FIRST time and nothing has defined it yet — not this ' +
        'caption, not an earlier one, not a screen she passes before the film. She can watch this ' +
        'before she reads a single card (DFM 192i). Carry the definition at or before this caption: "' +
        [].concat(term.defining).join('" / "') + '"');
    });
  });
  return out;
}

const crypto = require('crypto');
const sha1 = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 16);

/* Film strings are CONTENT-ADDRESSED: the key carries the hash of the caption
   itself, so editing a caption voids its record exactly like a content sentence,
   and re-ordering the captions inside a chapter costs nothing. */
const filmKey = (f) => 'film:' + f.set + ':' + f.chapter + ' › ' + sha1(f.raw);

/* ---------------------------------------------------- THE HUB STRINGS
   Every DECLARED year's manifest and recap pool. Read from index.json's
   years array rather than by globbing directories, so this walk and the
   pack's own year-folder gate can never disagree about what a year is.
   Paths are keyed by LESSON ID where one exists (`j2-04 › manifest ›
   tagline`), not by array position, so reordering the manifest cannot
   silently void a record or move it onto a different lesson. */
function collectHubStrings() {
  const out = [];
  const errs = [];
  const indexPath = path.join(SRC, 'index.json');
  if (!fs.existsSync(indexPath)) { errs.push('no index.json at ' + SRC); return { strings: out, errs: errs }; }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  (index.years || []).forEach(y => {
    const locked = HUB_LOCKED_YEARS.has(y.id);
    const manPath = path.join(SRC, y.manifest || (y.id + '/manifest.json'));
    if (!fs.existsSync(manPath)) { errs.push(y.id + ': declared in index.json but no manifest at ' + manPath); return; }
    const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
    const push = (p, s) => { if (typeof s === 'string' && s.trim()) out.push({ path: p, text: s, year: y.id, locked: locked }); };

    push(y.id + ' › manifest › title', man.title);
    push(y.id + ' › manifest › tagline', man.tagline);
    (man.blocks || []).forEach(b => push(y.id + ' › manifest › block:' + b.id + ' › name', b.name));
    (man.lessons || []).forEach(L => {
      const id = L.id || (y.id + '-' + L.num);
      push(id + ' › manifest › title', L.title);
      push(id + ' › manifest › tagline', L.tagline);
    });

    /* the recap pool: the stems a pupil actually answers in the Do-Now */
    const poolRel = man.recapPool || (y.id + '/recap-pool.json');
    const poolPath = path.join(SRC, poolRel);
    if (!fs.existsSync(poolPath)) return;            /* a year may have no pool yet */
    const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
    (pool.items || []).forEach(it => {
      const base = (it.lesson || y.id) + ' › recap:' + it.id;
      push(base + ' › stem', it.stem);
      (it.options || []).forEach((o, i) => push(base + ' › options[' + i + ']', o));
    });
    Object.entries(pool.keys || {}).forEach(([k, v]) => {
      if (v && typeof v.explain === 'string') push(y.id + ' › recap:' + k + ' › explain', v.explain);
    });
  });
  return { strings: out, errs: errs };
}

function hubLedgerCheck(hub, ledger) {
  const out = [];
  const byPath = ledger.entries || {};
  hub.forEach(s => {
    const e = byPath[s.path];
    if (!e) {
      out.push('UNREVIEWED HUB TEXT: ' + s.path + ' — no read-aloud record. It reads: "' +
        s.text.slice(0, 80) + '". Ask it as ' + readerFor(s.year) + ': can she DO it, PICTURE ' +
        'every noun, SAY what it is for? Then: node ledger-tool.js --set "' + s.path + '" "<what she does>" "<what she pictures>" "<what it is for>"');
      return;
    }
    if (e.sha1 !== sha1(s.text)) {
      out.push('CHANGED SINCE REVIEW: ' + s.path + ' — the hub text was edited after its record ' +
        'was written. Re-ask the question as ' + readerFor(s.year) + ' and update the entry.');
    }
  });
  return out;
}

function filmLedgerCheck(films, ledger) {
  const out = [];
  const byPath = ledger.entries || {};
  films.forEach(f => {
    const e = byPath[f.key];
    if (!e) {
      out.push('UNREVIEWED CAPTION: ' + f.key + ' — no read-aloud record. It reads: "' +
        f.text.slice(0, 80) + '". Ask it as an 11 or 12-year-old: can she DO it, PICTURE ' +
        'every noun, SAY what it is for? Then: node ledger-tool.js --set-film "' + f.key + '" ...');
      return;
    }
    if (e.grandfathered || e.reviewed) return;
    const ra = e.readAloud || {};
    ['do', 'picture', 'for'].forEach(k => {
      if (!ra[k] || String(ra[k]).trim().length < 3) {
        out.push('THIN CAPTION RECORD: ' + f.key + ' — readAloud.' + k + ' is empty.');
      }
    });
  });
  return out;
}

/* ---- THE DECK'S OWN LEDGER DEMAND (DFM 225d, 15 Aug 2026) ----------------
   His find, on the built deck: Slide 17 said "Next lesson you make a computer
   react." His question — "why was that not picked up in the language harness?"
   — has an honest answer. Deck text was wired into LAYER 1, the mechanical net,
   and never into this one. The sentence has a verb and sits under every
   ceiling, so no mechanical rule could fire; only a person reading it aloud
   from the pupil's seat hears that it is compressed, ungrammatical and speaks
   about a lesson she has not had yet.
   So projected deck text now carries a read-aloud record like every other
   pupil sentence: no deck sentence ships without one.
   THE LOCK DOES NOT EXCUSE IT. j1-01 is in LOCKED, which waives Layer 1
   findings on text he has already signed off (DFM 176) — but the deck did not
   exist when he locked the lesson, and its slides are this round's OPEN
   surface. An unreviewed deck sentence blocks the pack whether its lesson is
   locked or not.
   Speaker notes are teacher register and are NOT demanded here: a note is a
   paragraph of instructions to an adult (138.3/138.4), and it is already swept
   for banned facts and the lexicon above. */
function deckLedgerCheck(deckStrings, ledger) {
  const out = [];
  const byPath = ledger.entries || {};
  deckStrings.forEach(s => {
    if (s.register === 'teacher') return;
    const e = byPath[s.path];
    if (!e) {
      out.push('UNREVIEWED DECK TEXT: ' + s.path + ' — no read-aloud record. This goes on a ' +
        'wall, eight feet wide, in front of the class. Read it aloud from the back row as ' +
        readerFor(s.year) + ': can she DO it, PICTURE every noun, SAY what it is for? ' +
        'It reads: "' + s.text.slice(0, 90) + '". Then: node ledger-tool.js --set "' + s.path + '" "<what she does>" "<what she pictures>" "<what it is for>"');
      return;
    }
    if (e.sha1 !== sha1(s.text)) {
      out.push('CHANGED SINCE REVIEW: ' + s.path + ' — the slide was edited after its record was ' +
        'written. Re-read it aloud and update the entry.');
      return;
    }
    if (e.grandfathered) {
      out.push('NO GRANDFATHERING ON SLIDES: ' + s.path + ' — a bulk provenance stamp is exactly ' +
        'what let "Next lesson you make a computer react" through. Record a real judgement.');
      return;
    }
    if (e.reviewed) return;
    const ra = e.readAloud || {};
    ['do', 'picture', 'for'].forEach(k => {
      if (!ra[k] || String(ra[k]).trim().length < 3) {
        out.push('THIN RECORD: ' + s.path + ' — readAloud.' + k + ' is empty.');
      }
    });
  });
  return out;
}

function ledgerCheck(lessons, ledger) {
  const out = [];
  const byPath = ledger.entries || {};
  lessons.forEach(L => {
    const reader = readerFor(L.year || L.json.year);   /* the directory is the fallback (multi-year walk) */
    L.strings.forEach(s => {
      const e = byPath[s.path];
      if (!e) {
        out.push('UNREVIEWED: ' + s.path + ' — no read-aloud record. Ask it as ' + reader +
          ': can she DO it, PICTURE every noun, SAY what it is for? Then: node ledger-tool.js --set "' + s.path + '" "<what she does>" "<what she pictures>" "<what it is for>"');
        return;
      }
      if (e.sha1 !== sha1(s.text)) {
        out.push('CHANGED SINCE REVIEW: ' + s.path + ' — the sentence was edited after its record was written. ' +
          'Re-ask the question as ' + reader + ' and update the entry.');
        return;
      }
      /* FRAGMENT ESCALATION (DFM 192b). Damien on the board card: "it's very
         unclear for a child. It's not proper sentences." The word ceiling could
         never have caught it — telegraphic fragments sail UNDER a maximum, so
         short was rewarded and verbless was invisible. Any sentence of six words
         or fewer now demands a REAL per-sentence judgement; a bulk provenance
         stamp is refused for it. The floor is mechanical, the judgement is human,
         and that is the division DFM 193d insists on.
         EXEMPT: the player tickets. Those are quoted VOICE — the players talking,
         not the platform instructing — and a game reviewer is entitled to write
         "One star." They are still spell- and banned-word checked above. */
      /* A LABEL IS NOT A SENTENCE — the shared definition is at module scope
         (isLabelPath), so this list and the fragment reporter can never drift
         apart (DFM 144). The escalation applies to PROSE: the places the
         platform explains something.
         THE PITCH EXEMPTION WAS REVOKED, 12 Aug 2026 (addendum Part A): a
         contract pitch is platform copy, not a player's voice, and the L5 spec
         had already had to rewrite the pitches for verbless chains. `ticket`
         stays exempt — those really are the players talking. */
      const isQuotedVoice = / › ticket$/.test(s.path) || isLabelPath(s.path);
      const shortest = sentences(prose(unbold(s.text)))
        .map(x => ({ x, n: wordCount(x) }))
        .filter(o => o.n > 0)
        .sort((a2, b2) => a2.n - b2.n)[0];
      const hasFragment = !isQuotedVoice && shortest && shortest.n <= 6;
      if (e.grandfathered || e.reviewed) {
        if (hasFragment) {
          out.push('FRAGMENT NEEDS A REAL JUDGEMENT: ' + s.path + ' — carries a ' + shortest.n +
            '-word sentence ("' + shortest.x.trim().slice(0, 60) + '") and rides a bulk ' +
            (e.grandfathered ? 'grandfathered' : 'reviewed') + ' stamp. Short sentences are exactly ' +
            'what a word ceiling cannot see (DFM 192b). Record a per-sentence readAloud judgement.');
        }
        return;                                        /* provenance-stamped, see ledger-tool */
      }
      const ra = e.readAloud || {};
      ['do', 'picture', 'for'].forEach(k => {
        if (!ra[k] || String(ra[k]).trim().length < 3) {
          out.push('THIN RECORD: ' + s.path + ' — readAloud.' + k + ' is empty. The record must say ' +
            'what she does, what she pictures, and what it is for.');
        }
      });
    });
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * CONTROLS (DFM 146a): the harness must FAIL the pre-fix world, and must
 * NOT fail approved text. Both directions, every run.
 * ------------------------------------------------------------------ */
function runControls() {
  console.log('\nCONTROLS — the harness proves itself before it judges anything:');
  const C1 = 'Before the Rally, thirty seconds of protection: save your scoreboard program to your ' +
    'Drive, exactly like last lesson — then a yanked cable cannot lose your work mid-competition. ' +
    'The website checks it landed, same as before.';
  control(lexiconCheck(C1).length >= 2, 'HIS EXHIBIT fails the lexicon ("Before the Rally," + "thirty seconds of protection")');

  const C2 = "Your challenge: make every press of button A count. Build what Part 3 showed you: " +
    "1. add a separate event: 'on button A pressed' with 'set score to 1' inside — press A on the " +
    "simulator a few times and watch it stick at 1 — 2. now swap 'set score to 1' for 'change score by 1'.";
  control(inlineSequenceCheck(C2).length === 1, 'the old rung-2 target fails the numbered-sequence layout law (DFM 171)');

  const C3 = 'Your stretch challenge: teach your micro:bit to REMEMBER the best score ever. Build it in ' +
    'three steps: 1. make a SECOND variable called highScore — 2. add: on shake → if score > highScore ' +
    'then set highScore to score — 3. teach the loop to show both.';
  control(arrowChainCheck(C3).length >= 1, 'the stretch card he photographed fails the action-arrow rule');
  control(inlineSequenceCheck(C3).length === 1, 'the stretch card also fails the numbered-sequence rule');

  const C4 = 'Your catch-up job: prove your rig is tournament-grade, then log your best solo round.';
  control(lexiconCheck(C4).length >= 1, '"tournament-grade" fails the lexicon');

  const C5 = 'This is the hour that variable stops being a word and becomes something every single pupil ' +
    'has built with her own hands on the micro:bit she used a fortnight ago in the room next door, ' +
    'which is why it matters so much to all of us here today and always.';
  control(lengthCheck(C5, 'an 11 or 12-year-old').length === 1, 'a 40-word run-on fails the sentence ceiling');

  /* THE OVER-TIGHTENING GUARD. A harness that flags approved text is broken,
     not strict - and the eed2516 lesson is that this really happens. */
  const OK1 = 'One last thing, before you go.';
  const OK2 = 'You are about to be paired with somebody else in the class.';
  const OK3 = 'Variables → Make a Variable';
  const OK4 = 'It worked! Press Download in MakeCode, then drag the file across onto the MICROBIT drive.';
  const clean = (t) => lexiconCheck(t).length + lengthCheck(t, 'x').length +
    dashChainCheck(t).length + inlineSequenceCheck(t).length + arrowChainCheck(t).length;
  control(clean(OK1) === 0, 'the approved belonging-card line still PASSES (over-tightening guard)');
  control(clean(OK2) === 0, 'the approved pairing sentence still PASSES');
  control(clean(OK3) === 0, 'the locked Lesson-2 palette path "Variables → Make a Variable" still PASSES');
  control(clean(OK4) === 0, 'an ordinary two-sentence instruction still PASSES');
  const OK5 = "Let's say you've built a program from the following instructions:\n" +
    '`on button A pressed → show heart`\nYou press button A but nothing appears.';
  control(clean(OK5) === 0, "Lesson 2's backticked BLOCK LISTING is not judged as prose (code exemption)");
  const MIXED = 'First open it up. `a → b` Then go to Settings → the third tab down → press the blue Save button.';
  control(arrowChainCheck(MIXED).length >= 1, 'the code exemption does NOT forgive an action chain in the same string');

  /* ---- THE ARROW RATCHET (DFM 253c, HIS LAW, 23 Aug 2026) -------------------
     "An arrow may mark a MENU PATH a pupil clicks; it may never stand for 'goes
     to' in a rule statement." Both directions, because a ratchet that condemned
     the menu paths would make the gate demand worse writing than it has (DFM
     146a) — and because "+ New → Folder" is text he has already sat. */
  const RULE_ARROW = 'Work made in Word, Excel or PowerPoint → OneDrive.';
  const RULE_ARROW2 = 'Work made in Google Docs → Google Drive.';
  const isRuleArrow = (t) => arrowChainCheck(t).some(m => /rule-statement arrow/.test(m));
  control(isRuleArrow(RULE_ARROW),
    'HIS OWN STEP-4 SENTENCE is caught: "Work made in Word, Excel or PowerPoint → OneDrive" — ' +
    'the word-count rule measured its left step as "Excel or PowerPoint" and passed it');
  control(isRuleArrow(RULE_ARROW2),
    'and so is its sibling one line below it, which the old rule caught only by accident (no comma in it)');
  const PATH1 = 'Click + New (top-left) → New folder. Name it exactly: School.';
  const PATH2 = 'Open your School folder (double-click it), then + New → New folder again.';
  const PATH3 = 'Follow the route exactly: My-School → Launch → Microsoft 365 Web Apps → the squares menu → OneDrive.';
  const PATH4 = '+ New → Folder';
  [[PATH1, 'the sq-drive step-2 menu path'], [PATH2, 'the sq-drive step-3 menu path'],
   [PATH3, 'the OneDrive route in the help text'], [PATH4, 'the bare "+ New → Folder" path'],
   [OK3, 'the locked "Variables → Make a Variable" path']].forEach(([t, what]) => {
    control(!isRuleArrow(t), what + ' still PASSES the ratchet — an arrow marking a path is legitimate');
  });
  control(!isRuleArrow('Nothing here has an arrow in it at all.'),
    'and a sentence with no arrow in it raises nothing (the ratchet only judges arrows)');
  const DASHPATH = 'Build it right now in Drive — + New → Folder → "School", then "DT Work" inside it — ' +
    'and press the check button again.';
  control(!isRuleArrow(DASHPATH),
    'the noFolder sentence DFM 254 adjudicates ("its arrows are menu paths and legitimate under 253c") ' +
    'PASSES — an em-dash brackets a path as an aside and the ratchet reads only inside the brackets');
  control(isRuleArrow(RULE_ARROW),
    'and his own sentence, which has no dash in it, is still caught by exactly the same code');

  /* ---- THE FRAGMENT-CANDIDATE CONTROLS (DFM 192b/196/197; addendum Part A).
     Every string below is VERBATIM from the build he sat (`7bba564`), so the
     reporter proves on every run that it still catches the text he rejected —
     and, just as importantly, that it does NOT catch the good short sentences
     a length floor would have destroyed. */
  const G1 = 'Four player tickets, four open cases — each ticket opens a CASE: one bug to find and fix.';
  control(fragmentCandidates(G1).length >= 1,
    'HIS OWN REJECTED SENTENCE is a fragment candidate — seventeen words, so no length rule could ever reach it (DFM 192b)');
  const G2 = 'Click the green flag and watch ONLY the very first second. Now click it again. And again. Same wrongness every time?';
  control(fragmentCandidates(G2).length >= 1,
    'his Case 04 find ("And again." + "Same wrongness every time?") is a candidate');
  const G3 = 'Apples fall. One bowl. No second chances. Miss three and the game is over — if you build it that way.';
  control(fragmentCandidates(G3).length >= 1, 'the pre-fix Catch It pitch is a candidate');
  /* verbatim, whole: a truncated control is a control that proves nothing */
  const G4 = "Three steps. First, save the .sb3 from Scratch: open the File menu and choose " +
    "'Save to your computer'. Then drag that file into your Google Drive, into School, then DT Work. " +
    "Last, press Check my Drive. The website really does look in your Drive, the same check as every build this term.";
  control(fragmentCandidates(G4).length >= 1,
    'the pre-fix ship help opening "Three steps." is a candidate (the one this detector found on current content, 12 Aug)');
  /* DFM 201i, HIS 13 AUG FIND — the sentence that proved the three-word clause
     floor too high: "Four fixes, one game" is two TWO-word verbless clauses, so
     nothing could reach it and the judged pass walked past it too. This control
     is the reason the floor is 2, and it must never go silent again. */
  const G5 = 'Four fixes, one game — and some bugs only show up when the whole game is played.';
  /* DFM 213: this exact string used to be a control asserting that menu-path
     notation raises NOTHING — the old law. It is now a control the other way
     round, because that exemption is what hid the first step of all three
     Lesson 5 blueprints from every language check. */
  control(fragmentCandidates("Variables \u2192 Make a Variable \u2192 'score', for all sprites.")
    .some(c => c.kind === 'MENU-PATH'),
    'HIS MENU-PATH FIND is a candidate: an instruction written as arrows is not an instruction a child can follow');
  control(fragmentCandidates('Four moves. The kit already punishes wall-touches — READ that script first.')
    .some(c => c.kind === 'OPENER(verbless)'),
    'HIS "Four moves." FIND is a candidate: a lone verbless opener no longer needs a second one to be seen');
  control(fragmentCandidates(G5).length >= 1,
    'HIS RELEASE-DESK FIND is a candidate at the two-word clause floor (it was invisible at three)');
  /* THE THREE 12 AUG ARTEFACTS. Each was a REAL sentence wrongly reported, and
     each is now normalised away rather than tolerated as a noise floor — a
     reporter with known false rows is a reporter that stops being read. */
  const A1 = "The sprite says 'Locked!' and slides back to the start of the maze.";
  control(fragmentCandidates(A1).length === 0,
    'a quoted exclamation no longer splits one good sentence into two verbless ones (artefact 1)');
  const A2 = "It says 'Not this time!' when the answer is wrong.";
  control(fragmentCandidates(A2).length === 0, 'same artefact on the quiz blueprint step (artefact 2)');
  const A3 = 'Drag **change score by 1** into the empty mouth of the if block.';
  control(fragmentCandidates(A3).length === 0,
    'a Scratch BLOCK NAME in bold no longer swallows the imperative "Drag" (artefact 3)');
  /* THE OVER-TIGHTENING GUARDS. A reporter that cries at good writing gets
     ignored, and an ignored reporter is worse than none (DFM 146a). Each line
     below is text that must stay silent — three of them are sentences the
     abandoned ≤6-word floor false-failed. */
  const OKF = [
    ['Nobody is ranked against anybody.', 'the signed-off Press Night line'],
    ['Every game keeps score.', 'a good short sentence'],
    ['Design ONE more change — a second danger, a speed-up — and test it.', 'an appositive between em-dashes is not a chain'],

    ['Shipping your game takes three steps.', 'the 12 Aug rewrite of the ship help opener'],
    ['Now try the left arrow. Then look at the code area.', 'bare imperatives are real verbs']
  ];
  OKF.forEach(([t, why]) => control(fragmentCandidates(t).length === 0, why + ' raises NO candidate'));

  /* ---- THE FILM CONTROLS (DFM 179). The captions that were SHIPPED on his
     screen this week must fail these checks before any rewrite is credited. */
  const F1 = 'First: the broken game onto your bench &mdash; exactly like the <b>Evidence Intake</b> card.';
  control(lexiconCheck(filmRendered(F1)).length >= 1,
    'the shipped L4 caption "onto your bench" fails the lexicon (the phrase banned from the CONTENT the same day)');
  const F2 = 'PREDICT: &ldquo;right arrow &rarr; the shark swims right.&rdquo; CHECK:';
  control(arrowChainCheck(filmRendered(F2)).length >= 1,
    'the shipped L4 chapter-3 PREDICT caption fails the action-arrow law');
  const F3 = 'Point it at the Bowl and it answers every frame';
  control(lexiconCheck(filmRendered(F3)).length >= 1,
    'the shipped L5 caption "it answers every frame" fails the lexicon (new entry)');
  const F4 = 'The first computer <b>bug</b> was a real moth &mdash; taped into Harvard&rsquo;s logbook, 1947';
  const cleanFilm = (t) => { const r = filmRendered(t); return lexiconCheck(r).length + lengthCheck(r, 'x').length +
    dashChainCheck(r).length + inlineSequenceCheck(r).length + arrowChainCheck(r).length; };
  control(cleanFilm(F4) === 0,
    'the moth line still PASSES unchanged (over-tightening guard — a harness that flags good text is broken, not strict)');
  /* the two places the harness itself was wrong, pinned in BOTH directions so
     nobody "tightens" them back and quietly damages correct captions (DFM 146a) */
  const MENU = '<b>File</b> &rarr; <b>Load from your computer</b>';
  control(arrowChainCheck(filmRendered(MENU), boldNames(MENU)).length === 0,
    'a real menu path with a 4-word ITEM NAME the author marked with <b> still PASSES (the "Variables → Make a Variable" family)');
  const NOTNAME = 'Four ticks &rarr; <b>READY FOR GALLERY</b> lights up &rarr; open your doors';
  control(arrowChainCheck(filmRendered(NOTNAME), boldNames(NOTNAME)).length >= 1,
    'and the same allowance does NOT forgive a segment that is a thing HAPPENING rather than a name');
  control(dashChainCheck('read — predict — check — log').length === 0,
    'a row of one-word LABELS on a title card is a list, not a dash-chain');
  control(dashChainCheck('You open the file — then you read the code — then you predict what it does — then you check it').length >= 1,
    'and a real runaway sentence of dash-joined clauses still FAILS');
  /* the static-only law, proved on a fixture rather than asserted */
  const FIX_DIR = path.join(__dirname, 'out', '.qa-language-fixture');
  try {
    fs.mkdirSync(FIX_DIR, { recursive: true });
    const bad = path.join(FIX_DIR, 'lX.js');
    fs.writeFileSync(bad, 'const someVar = "hello";\nconst scenes=[{id:\'ch1\',run:async({cine})=>{await cine.caption(someVar);}}];\n');
    const { clean, inStr } = scanSource(fs.readFileSync(bad, 'utf8'));
    const { consts, arrays } = harvestConsts(clean, inStr);
    const m = /\bcine\.caption\s*\(/.exec(clean);
    const open = m.index + m[0].length - 1;
    const args = splitTop(clean, inStr, open + 1, matchBracket(clean, inStr, open));
    control(resolveStatic(clean.slice(args[0][0], args[0][1]), consts, arrays) === null,
      'a caption built from a variable is NOT statically checkable and fails the build');
    fs.unlinkSync(bad); fs.rmdirSync(FIX_DIR);
  } catch (e) {
    control(false, 'the static-only fixture could not run: ' + e.message);
  }

  /* ---- THE MULTI-YEAR WALK (addendum Part E; the gap HIS question found on
     12 Aug 2026: "will these persist to J2 and J3?"). Until that day this
     harness walked `j1/lessons` and nothing else, so a Lesson dropped into
     `content-src/j2/lessons/` would have shipped with no banned-word check, no
     ledger and no vocabulary order — silently, which is the worst kind. The
     control plants exactly that file, with one banned word and one sentence
     that has no record, and proves the walk AND the checks reach it. It is
     permanent: the day somebody narrows the walk back to one year, this fails
     and says why. */
  const YR_DIR = path.join(__dirname, 'out', '.qa-language-j2-fixture');
  try {
    const lessonDir = path.join(YR_DIR, 'j2/lessons');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(path.join(lessonDir, 'j2-99.json'), JSON.stringify({
      num: 99, year: 'j2', title: 'Multi-year scan control',
      chunks: [{ id: 'probe', title: 'Probe', config: {
        /* "tap" is the ban he has had to give twice (DFM 150) — she has a mouse */
        intro: 'Just tap the screen when you are ready to begin the next part.'
      } }]
    }, null, 1));
    const planted = loadLessons(YR_DIR);
    control(planted.length === 1 && planted[0].fileId === 'j2-99',
      'a lesson sitting in content-src/j2/lessons IS found by the walk (it was invisible until 12 Aug — his question)');
    const probe = (planted[0] || { strings: [] }).strings.find(s => / › intro$/.test(s.path)) || { text: '' };
    control(lexiconCheck(unbold(probe.text)).length >= 1,
      'and a banned word inside that J2 lesson is caught, judged as ' + readerFor('j2'));
    control(ledgerCheck(planted, { entries: {} }).some(p => /^UNREVIEWED: j2-99/.test(p)),
      'and its unrecorded sentence blocks the pack exactly as a J1 one would');
    fs.rmSync(YR_DIR, { recursive: true, force: true });
  } catch (e) {
    control(false, 'the multi-year fixture could not run: ' + e.message);
  }

  /* ---- THE YEAR-AWARE VOCABULARY CONTROLS (19 Aug 2026). The rule this gate
     used to apply — order every lesson in every year on `num` alone — failed
     j2-02 and j3-02 sixteen times for words those lessons teach themselves,
     because `j2-02` is num 2 and `j1-03` is num 3. The fix must be able to say
     NO in three distinct ways or it is an exemption wearing a rule's clothes
     (DFM 213), so all four cases are planted and asserted here. ---- */
  try {
    const mk = (fileId, year, num, chunkId, text) => ({
      fileId, json: { num, year, chunks: [{ id: chunkId }] },
      strings: [{ path: fileId + ' \u203a ' + chunkId + ' \u203a intro', text }]
    });
    const V = (definedIn) => ({ terms: [{ term: 'widget', aliases: [], definedIn, defining: null }] });
    const say = (v, ls) => vocabCheck(ls, v, []).join(' | ');

    /* (1) THE FAULT ITSELF: a J2 lesson judged against a J1 lesson it never sits. */
    const crossYear = say(V([{ lesson: 'j1-03', chunkId: 'hook' }]),
      [mk('j1-03', 'j1', 3, 'hook', 'a widget is a thing'), mk('j2-02', 'j2', 2, 'build', 'use the widget')]);
    control(/J2\u2019s own spine never teaches it/.test(crossYear),
      'a term used in J2 with no J2 definition FAILS, and says so in those words (before 19 Aug it ' +
      'failed for the WRONG reason — "not taught until j1-03", a lesson no J2 pupil sits)');
    control(!/not taught until/.test(crossYear),
      'and it no longer compares a J2 lesson number against a J1 one at all');

    /* (2) A PER-YEAR DEFINITION MAKES IT PASS — the exemption exists and works. */
    control(say(V([{ lesson: 'j1-03', chunkId: 'hook' }, { lesson: 'j2-02', chunkId: 'build' }]),
      [mk('j1-03', 'j1', 3, 'hook', 'a widget is a thing'), mk('j2-02', 'j2', 2, 'build', 'use the widget')]) === '',
      'and a term J2 teaches in its OWN Lesson 2 passes');

    /* (3) THE ORDER RULE STILL BITES INSIDE A YEAR — the half that must not be lost. */
    control(/not taught until j2-04/.test(say(V([{ lesson: 'j2-04', chunkId: 'hook' }]),
      [mk('j2-04', 'j2', 4, 'hook', 'a widget is a thing'), mk('j2-02', 'j2', 2, 'build', 'use the widget')])),
      'and INSIDE one year, meeting the word before the meaning still fails exactly as it did');

    /* (4) THE ORDINARY-WORD DECLARATION IS THE ONLY WAY PAST, AND IT IS WRITTEN DOWN. */
    control(say(V([{ lesson: 'j1-03', chunkId: 'hook' },
      { year: 'j2', ordinaryWord: true, why: 'control fixture' }]),
      [mk('j1-03', 'j1', 3, 'hook', 'a widget is a thing'), mk('j2-02', 'j2', 2, 'build', 'use the widget')]) === '',
      'and a year may declare the ordinary English sense in vocab.json — printed as visible debt, never silent');
  } catch (e) {
    control(false, 'the year-aware vocabulary fixture could not run: ' + e.message);
  }

  /* ---- THE HUB CONTROLS (his 14 Aug ruling). Each one proves the gate at the
     layer it guards, and the first proves the thing that was missing: that a
     manifest is opened AT ALL. Until this landed the answer was no. ---- */
  const hubFx = collectHubStrings();
  const hubPath = (p) => hubFx.strings.find(s => s.path === p) || { text: '', year: 'j1' };
  control(hubFx.strings.length > 0 && hubFx.strings.some(s => / › manifest › /.test(s.path)),
    'THE MANIFESTS ARE SCANNED AT ALL — ' + hubFx.strings.length + ' hub strings across ' +
    [...new Set(hubFx.strings.map(s => s.year))].join('/') + ' (before 14 Aug 2026: zero, and nothing said so)');
  control(hubFx.strings.some(s => / › recap:/.test(s.path)),
    'and the recap pool is scanned too — its stems are answered by a pupil in the Do-Now');
  /* HIS OWN APPROVED TAGLINE is the exemplar of the register 192b bans. It must
     be CAUGHT (and waived, because J1 is locked) — if the reporter cannot see
     the clearest case of the fault on the platform, it sees nothing. */
  const l1Tag = hubPath('j1-01 › manifest › tagline');
  control(fragmentCandidates(l1Tag.text).length >= 1,
    'HIS OWN LESSON-1 TAGLINE ("' + l1Tag.text.slice(0, 44) + '") is a fragment candidate — the ' +
    'headline register, on the tile every pupil sees first, invisible to every gate until now');
  control(HUB_LOCKED_YEARS.has('j1'),
    'and it is WAIVED, not fixed: J1 is locked (DFM 176) and nothing here edits it');
  /* a banned word in a planted tagline must fail, judged at the right age */
  control(lexiconCheck('Just tap the tile to start this lesson.').length >= 1,
    'a banned word planted in a manifest tagline is caught (the "tap" ban, DFM 150)');

  /* ---- HIS K10 RULING, CONTROLLED BOTH WAYS (15 Aug 2026) ----------------
     "the same reading age that we have for J1 is perfectly fine for both J2
     and J3." The table above was per-year; if it silently drifted back, J2 and
     J3 text would be judged at an older reader than he has ruled for, and the
     drift would be invisible — the sentences would still pass. So the reader
     is asserted in BOTH directions: it IS J1's for every year, and no message
     this gate can emit names either of the two retired profiles. */
  control(readerFor('j2') === readerFor('j1') && readerFor('j3') === readerFor('j1'),
    'K10: J2 and J3 are read at J1\'s reader — ' + readerFor('j2') + ' — one profile, every year');
  control(readerFor('j1') === J1_READER && Object.keys(READERS).length === 3,
    'and J1\'s own reader is untouched by the repoint (the over-tightening guard)');
  const retired = Object.values(READERS).filter(r => /12 or 13|13 or 14/.test(r));
  control(retired.length === 0,
    'neither retired profile survives anywhere in the table — a J2 string can no longer be ' +
    'judged as a 12 or 13-year-old\'s by accident');
  /* and the prompt a pupil-facing J2 string actually produces must say so, or
     the ruling lives in a constant nobody reads (DFM 195b: a rule with no
     enforcement home is a defect) */
  const j2Prompt = 'Ask it as ' + readerFor('j2');
  control(/an 11 or 12-year-old/.test(j2Prompt),
    'and the UNREVIEWED prompt a J2 string produces asks it as ' + readerFor('j2') +
    ' — the question in front of the judge is the ruled one');
  /* THE WRITING END OF THE SAME CONTRACT. ledger-tool.js prints the reader when
     it asks for a judgement; if its table drifts from this one, a record gets
     written against a question this gate is not asking, and nothing would say
     so (DFM 157a: a rule in two places is a contract, and a harness holds the
     copies equal or one of them is lying). */
  const toolSrc = fs.readFileSync(path.join(__dirname, 'ledger-tool.js'), 'utf8');
  control(/const READERS = \{ j1: J1_READER, j2: J1_READER, j3: J1_READER \}/.test(toolSrc),
    'and ledger-tool.js — the WRITING end — reads every year at the same one profile');
  control(!/12 or 13-year-old|13 or 14-year-old/.test(toolSrc),
    'with neither retired profile left in it either');
  /* the ledger really reaches hub text, in both directions */
  const j2Tag = hubPath('j2-01 › manifest › tagline');
  control(hubLedgerCheck([{ path: 'x › manifest › tagline', text: 'Anything.', year: 'j2', locked: false }], { entries: {} })
    .some(p => /^UNREVIEWED HUB TEXT/.test(p)),
    'an unrecorded hub string blocks the pack exactly as a lesson sentence does');
  control(hubLedgerCheck([{ path: 'p', text: 'Anything.', year: 'j2', locked: false }],
    { entries: { p: { sha1: sha1('Anything.') } } }).length === 0,
    'and a recorded one is silent (over-tightening guard)');
  control(hubLedgerCheck([{ path: 'p', text: 'Edited since.', year: 'j2', locked: false }],
    { entries: { p: { sha1: sha1('Anything.') } } }).some(p => /^CHANGED SINCE REVIEW/.test(p)),
    'and editing a tagline after its record voids it — a tile cannot be reworded behind the judgement');
  /* THE SLIDE LEDGER, BOTH DIRECTIONS (DFM 225d). The control is the exact
     sentence that got through: it has a verb, it breaks no ceiling, and Layer 1
     is silent about it — only the demand for a judgement stops it. */
  const theSlip = 'Next lesson you make a computer react.';
  const deckStr = p => [{ path: p, text: theSlip, year: 'j1', deck: 'j1-01',
    locked: true, register: 'pupil' }];
  control(deckLedgerCheck(deckStr('j1-01.deck › s7.1:closer › bullets[2]'), { entries: {} })
    .some(p => /^UNREVIEWED DECK TEXT/.test(p)),
    'an unrecorded SLIDE sentence blocks the pack — the DFM 225d hole, closed');
  const fullRecord = { do: 'she listens', picture: 'the next lesson', for: 'knowing what is coming' };
  control(deckLedgerCheck(deckStr('p'), { entries: { p: { sha1: sha1(theSlip),
    readAloud: fullRecord } } }).length === 0,
    'and a judged slide sentence is silent (over-tightening guard)');
  control(deckLedgerCheck(deckStr('p'), { entries: { p: { sha1: sha1(theSlip),
    readAloud: { do: 'she listens', picture: '', for: 'knowing what is coming' } } } })
    .some(p => /^THIN RECORD/.test(p)),
    'and a record with an empty half is not a judgement');
  control(deckLedgerCheck(deckStr('p'), { entries: { p: { sha1: sha1('something else'),
    readAloud: fullRecord } } }).some(p => /^CHANGED SINCE REVIEW/.test(p)),
    'and rewording a slide after its judgement voids the judgement');
  control(deckLedgerCheck(deckStr('p'), { entries: { p: { sha1: sha1(theSlip),
    grandfathered: 'locked' } } }).some(p => /^NO GRANDFATHERING ON SLIDES/.test(p)),
    'and a bulk provenance stamp cannot stand in for a slide judgement');
  control(deckLedgerCheck([{ path: 'n', text: theSlip, year: 'j1', register: 'teacher' }],
    { entries: {} }).length === 0,
    'while speaker notes are not demanded — they are prose to an adult (138.3)');

  /* over-tightening on the real new text: the shipped J2/J3 taglines are prose
     and must raise NOTHING mechanically, or the gate is punishing good writing */
  const newHub = hubFx.strings.filter(s => !s.locked);
  const newHubProblems = newHub.filter(s => [].concat(
    lengthCheck(unbold(s.text), readerFor(s.year)), dashChainCheck(unbold(s.text)),
    inlineSequenceCheck(unbold(s.text)), arrowChainCheck(unbold(s.text)), lexiconCheck(unbold(s.text))
  ).length > 0);
  control(newHub.length > 0 && newHubProblems.length === 0,
    'the ' + newHub.length + ' J2/J3 hub strings raise NO mechanical problem (over-tightening guard)');
  /* and a title is a LABEL: reporting it as a fragment would be DFM 146a */
  control(fragmentCandidates('Query Quest').length >= 1,
    'a bare noun phrase IS a fragment by the reporter\'s own rule…');
  control(true, '…which is exactly why manifest TITLES and BLOCK NAMES are exempted from it — ' +
    '"Mission Control" and "The Broken Game" are his own approved titles, and a title is a label, not a sentence');
}

/* ------------------------------------------------------------------ *
 * MAIN
 * ------------------------------------------------------------------ */
/* ALWAYS load every lesson: the vocabulary gate is inherently cross-lesson - it
   cannot know whether "simulator" was taught earlier if it can only see one file.
   `only` narrows what is REPORTED, never what is read. (Scoping the read made a
   one-lesson run invent 20 failures about lessons it had not opened.) */
/* DAMIEN, 12 Aug 2026: "will these persist to J2 and J3?" — and the question
   found a real hole. This walk read ONE directory, `j1/lessons`, so the day a
   J2 lesson landed in `content-src/j2/lessons/` it would have shipped entirely
   unscanned and nothing would have said a word: no banned-word check, no
   ledger, no vocabulary order, silence. The READER table above already knew j2
   and j3 (12–13 / 13–14); only the walk was stuck in year one. It now reads
   the lessons directory of EVERY year folder it finds (j1, j2, j3 …), and the
   control below proves it by planting a J2 lesson with a known fault and
   watching the harness catch it.
   `root` is a parameter ONLY so that control can run on a fixture. */
/* ---- the teacher decks (DFM 219d) -----------------------------------------
   Slide text lives in content-src/<year>/decks/*.deck.json so that it is packed
   like all content and read by this gate. Projected text is judged as the
   pupil's own register; speaker notes as the teacher's. */
function collectDeckStrings() {
  const out = [], errs = [];
  const years = fs.existsSync(SRC)
    ? fs.readdirSync(SRC).filter(d => /^j\d$/.test(d)).sort() : [];
  years.forEach(y => {
    const dir = path.join(SRC, y, 'decks');
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter(f => f.endsWith('.deck.json')).sort().forEach(f => {
      let d;
      try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
      catch (e) { errs.push(f + ': unreadable — ' + e.message); return; }
      const deckId = d.lesson || f.replace(/\.deck\.json$/, '');
      const locked = LOCKED.has(deckId);
      const push = (p, s, register) => {
        if (typeof s === 'string' && s.trim()) {
          out.push({ path: deckId + '.deck › ' + p, text: s, year: d.year || y,
            deck: deckId, locked: locked, register: register || 'pupil' });
        }
      };
      (d.sections || []).forEach((sec, si) => {
        (sec.slides || []).forEach((sl, li) => {
          const at = 's' + (si + 1) + '.' + (li + 1) + (sl.kind ? ':' + sl.kind : '');
          push(at + ' › heading', sl.heading);
          push(at + ' › kicker', sl.kicker);
          push(at + ' › sub', sl.sub);
          push(at + ' › text', sl.text);
          (sl.bullets || []).forEach((b, bi) => push(at + ' › bullets[' + bi + ']', b));
          /* the script: teacher register, and it must still never carry a
             banned FACT (the grey box, the invented currency, "the device") */
          push(at + ' › notes', sl.notes, 'teacher');
        });
      });
    });
  });
  return { strings: out, errs: errs };
}

function loadLessons(root) {
  const src = root || SRC;
  const years = fs.existsSync(src)
    ? fs.readdirSync(src).filter(d => /^j\d$/.test(d) && fs.existsSync(path.join(src, d, 'lessons'))).sort()
    : [];
  const out = [];
  years.forEach(y => {
    const dir = path.join(src, y, 'lessons');
    fs.readdirSync(dir)
      .filter(f => /^j\d-.*\.json$/.test(f) && !f.includes('.bak'))
      .forEach(f => {
        const fileId = f.replace(/\.json$/, '');
        const json = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        /* the directory is the fallback truth: a file that forgets its `year`
           field must still be judged as its own year group's reader, never
           silently as an 11-year-old's */
        out.push({ fileId, year: json.year || y, json, strings: collectStrings(json, fileId) });
      });
  });
  return out.sort((a, b) => (a.year === b.year)
    ? Number(a.json.num || 99) - Number(b.json.num || 99)
    : String(a.year).localeCompare(String(b.year)));
}

function main() {
  const only = process.argv[2];
  console.log('qa-language — the communication-of-language harness (DFM 172/178)');
  runControls();

  const lessons = loadLessons();
  if (!lessons.length) { console.error('no lessons found at ' + SRC); process.exit(1); }
  const byFileId = {};
  lessons.forEach(L => { byFileId[L.fileId] = L.json; });
  const inScope = (p) => !only || String(p).indexOf(only) === 0;
  const vocab = fs.existsSync(VOCAB_FILE) ? JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8')) : { terms: [] };
  const ledger = fs.existsSync(LEDGER_FILE) ? JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8')) : { entries: {} };

  console.log('\nLAYER 1 — the mechanical net (structure first, lexicon last):');
  let n = 0;
  const problems = [];
  const locked = [];
  lessons.forEach(L => {
    if (!inScope(L.fileId)) return;
    const reader = readerFor(L.year || L.json.year);   /* the directory is the fallback (multi-year walk) */
    const isLocked = LOCKED.has(L.fileId);
    L.strings.forEach(s => {
      n++;
      const orderBearing = ORDER_BEARING.test(s.path);
      const plain = unbold(s.text);          // the child's text, never the markers
      const found = orderBearing
        ? lexiconCheck(plain)
        : [].concat(
            lengthCheck(plain, reader),
            dashChainCheck(plain),
            inlineSequenceCheck(plain),
            arrowChainCheck(plain),
            lexiconCheck(plain)
          );
      found.forEach(f => (isLocked ? locked : problems).push(s.path + ': ' + f));
    });
  });
  /* route by the lesson id at the FRONT of the message. `p.slice(0, 6)` used to
     be the test and it never matched anything - "j1-02 " carries a trailing
     space - so a vocabulary or screen-contract finding on a LOCKED lesson would
     have blocked the pack instead of being waived. Nothing had ever tripped it,
     which is exactly how a latent fault survives (DFM 143b's family). */
  const lessonOf = (p) => (String(p).match(/^(j\d-[a-z0-9]+)/) || [])[1];
  /* collected here, before vocabCheck, because a caption played inside a chunk
     can carry that chunk's definition (see vocabCheck's `films` argument). */
  const filmForVocab = collectFilmStrings();
  filmForVocab.strings.forEach(f => { f.key = filmKey(f); });
  vocabCheck(lessons, vocab, filmForVocab.strings).filter(inScope).forEach(p => (LOCKED.has(lessonOf(p)) ? locked : problems).push(p));
  screenContractCheck(lessons).filter(inScope).forEach(p => (LOCKED.has(lessonOf(p)) ? locked : problems).push(p));
  console.log('  scanned ' + n + ' pupil-facing strings across ' + lessons.length + ' lesson(s)');
  console.log(problems.length ? '  ' + problems.length + ' problem(s)' : '  clean');
  problems.forEach(p => { console.log('  FAIL ' + p); FAILS.push(p); });
  if (locked.length) {
    console.log('\n  LOCKED (DFM 176) — ' + locked.length + ' finding(s) in Lessons 1/2/side quest, recorded, NOT blocking.');
    console.log('  He has sat and signed these off; they are not to be "improved". This list is the');
    console.log('  work waiting the day he lifts the lock — and it is printed every run so it cannot rot.');
    locked.forEach(p => console.log('    WAIVED ' + p));
  }

  /* ---- THE HUB (his 14 Aug ruling): the same laws, on the text she reads FIRST ---- */
  console.log('\nHUB TEXT — the same net, on the year map and the tiles:');
  const hubAll = collectHubStrings();
  hubAll.errs.forEach(e => { console.log('  FAIL ' + e); FAILS.push(e); });
  const hub = hubAll.strings.filter(s => inScope(s.path));
  const hubProblems = [], hubLocked = [];
  hub.forEach(s => {
    const bucket = s.locked ? hubLocked : hubProblems;
    const plain = unbold(s.text);
    [].concat(
      lengthCheck(plain, readerFor(s.year)),
      dashChainCheck(plain), inlineSequenceCheck(plain), arrowChainCheck(plain), lexiconCheck(plain)
    ).forEach(p => bucket.push(s.path + ': ' + p));
  });
  console.log('  scanned ' + hub.length + ' manifest/recap string(s) across ' +
    [...new Set(hub.map(s => s.year))].join(', ') +
    '  (coverNote/absenceNote excluded BY NAME — teacher register, DFM 138.3; thread labels are planning metadata)');
  console.log(hubProblems.length ? '  ' + hubProblems.length + ' problem(s)' : '  clean');
  hubProblems.forEach(p => { console.log('  FAIL ' + p); FAILS.push(p); });
  if (hubLocked.length) {
    console.log('\n  LOCKED HUB (DFM 176) — ' + hubLocked.length + ' finding(s) in J1\'s year map, recorded, NOT blocking.');
    console.log('  J1\'s tiles were written and signed off long before anything scanned them. This list is');
    console.log('  the work waiting the day he lifts the lock, printed every run so it cannot rot.');
    hubLocked.forEach(p => console.log('    WAIVED ' + p));
  }
  /* The fragment reporter runs here too — J1's TAGLINES are the exact headline
     register DFM 192b bans and must be visible rather than merely absent.
     But a lesson TITLE and a block NAME are labels: "Mission Control", "The
     Broken Game", "Query Quest" are noun phrases because that is what a title
     IS, and every one of his own approved J1 titles is one. Reporting them
     would be the DFM 146a fault — a gate inventing a fault drowns the real
     ones, and the first cut of this listed 34 of them. Titles and block names
     are still fully checked by the lexicon and the shape rules above; they are
     simply not candidates for "this should have been a sentence". */
  const hubIsLabel = (p) => /› manifest › (title|block:[^ ]+ › name)$/.test(p) || /› options\[\d+\]$/.test(p);
  const hubFrag = [], hubFragLocked = [];
  hub.forEach(s => {
    if (hubIsLabel(s.path)) return;
    const bucket = s.locked ? hubFragLocked : hubFrag;
    fragmentCandidates(s.text).forEach(c => bucket.push(s.path + ' [' + c.kind + '] "' + c.text.slice(0, 90) + '"'));
  });
  if (hubFrag.length || hubFragLocked.length) {
    console.log('\n  HUB FRAGMENT-CANDIDATES — ' + hubFrag.length + ' open, ' + hubFragLocked.length +
      ' locked. REPORTED, NOT BLOCKING (§C q11 decides each one).');
    hubFrag.concat(hubFragLocked).slice(0, 12).forEach(p => console.log('    CANDIDATE ' + p));
  }

  /* ---- THE TEACHER DECKS (his 14 Aug decision 4, DFM 219d) ----
     "The language harness applies to the slide decks. This serves two purposes:
     the language stays appropriate for J1–J3 pupils, and the teachers — who are
     not subject experts — can understand and confidently say what's on the
     slides."
     So a deck's PROJECTED text is judged at the pupil's own register: it is
     read off a wall by the same eleven-year-old, eight feet wide. The SPEAKER
     NOTES are the teacher's register (138.3) and are checked for banned facts
     and the lexicon only — a note is allowed to be a paragraph of instructions
     to an adult, which is exactly what 138.4 asks of it.
     This closes the DFM 147 rot for good: before decks were content, three
     separate wording sweeps missed the deck file entirely, and by 14 Aug its
     Lesson 5 slides still said "two mouths" — killed everywhere else on 13 Aug. */
  console.log('\nTEACHER DECKS — projected text at pupil register, notes at teacher register (DFM 219d):');
  const deck = collectDeckStrings();
  deck.errs.forEach(e => { console.log('  FAIL ' + e); FAILS.push(e); });
  const decks = deck.strings.filter(s => inScope(s.path));
  const deckProblems = [], deckLocked = [];
  decks.forEach(s => {
    const bucket = s.locked ? deckLocked : deckProblems;
    const plain = unbold(s.text);
    const checks = s.register === 'teacher'
      ? [].concat(lexiconCheck(plain))
      : [].concat(lengthCheck(plain, readerFor(s.year)), dashChainCheck(plain),
          inlineSequenceCheck(plain), arrowChainCheck(plain), lexiconCheck(plain));
    checks.forEach(p => bucket.push(s.path + ': ' + p));
  });
  console.log('  scanned ' + decks.length + ' deck string(s) across ' +
    ([...new Set(decks.map(s => s.deck))].join(', ') || 'no decks') +
    '  (' + decks.filter(s => s.register === 'teacher').length + ' of them speaker notes)');
  console.log(deckProblems.length ? '  ' + deckProblems.length + ' problem(s)' : '  clean');
  deckProblems.forEach(p => { console.log('  FAIL ' + p); FAILS.push(p); });
  if (deckLocked.length) {
    console.log('\n  LOCKED DECKS (DFM 176) — ' + deckLocked.length + ' finding(s), recorded, NOT blocking.');
    deckLocked.forEach(p => console.log('    WAIVED ' + p));
  }
  /* LAYER 2 REACHES THE SLIDES (DFM 225d) — the judged layer, which is the one
     that catches compressed register. Blocking, locked lesson or not. */
  const deckLedger = deckLedgerCheck(decks, ledger);
  console.log('  read-aloud ledger: ' +
    (deckLedger.length ? deckLedger.length + ' slide sentence(s) without a judgement' :
      'every projected sentence carries a judgement'));
  deckLedger.forEach(p => { console.log('  FAIL ' + p); FAILS.push(p); });

  const deckFrag = [];
  decks.forEach(s => {
    if (s.register === 'teacher') return;           /* notes are prose to an adult */
    if (/› (heading|kicker|sub)$/.test(s.path)) return;  /* a heading is a label (the hubIsLabel reasoning) */
    fragmentCandidates(s.text).forEach(c => deckFrag.push(s.path + ' [' + c.kind + '] "' + c.text.slice(0, 90) + '"'));
  });
  if (deckFrag.length) {
    console.log('\n  DECK FRAGMENT-CANDIDATES — ' + deckFrag.length + '. REPORTED, NOT BLOCKING (§C q11).');
    deckFrag.slice(0, 12).forEach(p => console.log('    CANDIDATE ' + p));
  }

  /* ---- THE FILMS (DFM 179): the same laws, on the surface a pupil watches ---- */
  console.log('\nFILM CAPTIONS — the same net, on the screen she watches (DFM 179):');
  {
    const cf = contentFedSceneProblems();
    cf.forEach(e => filmProblems.push({ set: 'content-fed', where: e, msgs: [e] }));
    console.log('  content-fed scenes (' + CONTENT_FED_SCENES.join(', ') + '): ' +
      (cf.length ? cf.length + ' PROBLEM(S)' : 'every pupil word comes from the lesson, none is a literal here') +
      '\n  NOT SCANNED AT ALL, reported not fixed (DFM 222a — a finding in a signed-off lesson): ' +
      'scenes/j2-l2.js and scenes/j3-l2.js carry FILM_MAP entries and the extractor\'s file ' +
      'filter never reaches them.');
  }
  const film = collectFilmStrings();
  film.strings.forEach(f => { f.key = filmKey(f); });
  const inScopeFilm = (f) => !only || f.lesson.indexOf(only) === 0 || ('film:' + f.set).indexOf(only) === 0;
  const films = film.strings.filter(inScopeFilm);
  const filmProblems = [], filmLocked = [];
  film.errs.forEach(e => { console.log('  FAIL ' + e); FAILS.push(e); });
  films.forEach(f => {
    const bucket = f.locked ? filmLocked : filmProblems;
    const r = f.text;
    [].concat(
      lengthCheck(r, readerFor((byFileId[f.lesson] || {}).year || 'j1')),
      dashChainCheck(r), inlineSequenceCheck(r), arrowChainCheck(r, boldNames(f.raw)), lexiconCheck(r)
    ).forEach(p => bucket.push(f.key + ' [' + f.set + ' ' + f.chapter + ' line ' + f.line + ']: ' + p));
    /* an entity the decoder does not know is an entity the pupil READS (DFM 166) */
    const left = decodeEntities(f.raw).match(/&[a-zA-Z][a-zA-Z0-9]*;/g);
    if (left) bucket.push(f.key + ': unknown HTML entity ' + left.join(' ') + ' — it will be shown raw on screen (DFM 166)');
    /* a card/curtain TITLE is set with textContent, so an entity there is
       always shown raw. cinema.js throws for curtain(); card() had no guard. */
    if (f.plainOnly && /&[a-zA-Z]+;|&#\d+;/.test(f.raw)) {
      bucket.push(f.key + ': a ' + f.call + ' ' + f.field + ' is PLAIN TEXT (cinema.js sets it with ' +
        'textContent) — the entity in "' + f.raw.slice(0, 60) + '" would be shown raw, exactly like the ' +
        '"part two &mdash; the flags" card he photographed (DFM 166)');
    }
  });
  filmVocabCheck(films, lessons, vocab).forEach(p => {
    const set = (p.match(/^film:(l\d+)/) || [])[1];
    ((FILM_MAP[set] || {}).locked ? filmLocked : filmProblems).push(p);
  });
  filmOrderCheck(films, lessons, vocab).forEach(p => {
    const set = (p.match(/^film:(l\d+)/) || [])[1];
    ((FILM_MAP[set] || {}).locked ? filmLocked : filmProblems).push(p);
  });
  console.log('  scanned ' + films.length + ' caption/card/callout string(s) across ' +
    Object.keys(FILM_MAP).filter(s => films.some(f => f.set === s)).join(', ') +
    '  (scenes/guide.js excluded by design — its reader is a teacher, DFM 179e)');
  console.log(filmProblems.length ? '  ' + filmProblems.length + ' problem(s)' : '  clean');
  filmProblems.forEach(p => { console.log('  FAIL ' + p); FAILS.push(p); });
  if (filmLocked.length) {
    console.log('\n  LOCKED FILM (DFM 141) — ' + filmLocked.length + ' finding(s) in the Lesson 2 film, recorded, NOT blocking.');
    console.log('  His words, 3 Aug 2026: "that is the video locked in." Printed every run so the debt');
    console.log('  stays visible rather than looking like cleanliness.');
    filmLocked.forEach(p => console.log('    WAIVED ' + p));
  }

  console.log('\nLAYER 2 — the read-aloud ledger (the gate that matters):');
  /* J1's hub text is LOCKED, so it is reported as debt rather than ledgered:
     stamping ninety "grandfathered" judgements onto tiles he signed off before
     any gate existed would claim a read-aloud pass that never happened. The
     honest position is the waived list above — visible every run, blocking
     nothing. J2/J3's hub text is NOT locked and is ledgered like any other
     pupil sentence. */
  const hubLed = hubLedgerCheck(hub.filter(s => !s.locked), ledger);
  const ledAll = ledgerCheck(lessons, ledger).filter(p => inScope(p.replace(/^[A-Z ]+: /, '')))
    .concat(filmLedgerCheck(films, ledger))
    .concat(hubLed);
  /* DFM 176: Lessons 1, 2 and the side quest are LOCKED — he has sat them and
     signed them off, and they are not to be "improved". The fragment escalation
     is the first ledger rule that can fire on already-signed-off text, so it is
     routed exactly like every other finding on a locked lesson: recorded in full,
     printed every run so it cannot rot, and NOT blocking. Without this it would
     have failed forty perfectly good short sentences ("Nobody is ranked against
     anybody.") and the only ways out would have been rewriting text he approved
     or waiving the rule into meaninglessness. */
  const ledLocked = ledAll.filter(p => /^FRAGMENT NEEDS/.test(p));
  const led = ledAll.filter(p => ledLocked.indexOf(p) === -1);
  if (ledLocked.length) {
    console.log('\n  SHORT-SENTENCE DEBT — ' + ledLocked.length + ' sentence(s) of six words or fewer ' +
      'ride a bulk stamp rather than a per-sentence judgement. REPORTED, NOT BLOCKING, and the ' +
      'reason is written down rather than quietly assumed: LENGTH CANNOT TELL A FRAGMENT FROM A ' +
      'GOOD SHORT SENTENCE. "Nobody is ranked against anybody." and "Every game keeps score." are ' +
      'both fine; "Four player tickets, four open cases." is not — and it is SEVENTEEN words, so ' +
      'no length rule reaches it at all. Blocking on this would have failed hundreds of good ' +
      'sentences, including text Damien has signed off. The list below is real work for the ' +
      'cold-read pass; it is not a verdict.');
    ledLocked.slice(0, 8).forEach(p => console.log('    DEBT ' + p.replace(/ Short sentences.*$/, '')));
    if (ledLocked.length > 8) console.log('    … and ' + (ledLocked.length - 8) + ' more');
  }

  /* ---- FRAGMENT-CANDIDATES (DFM 192b Layer 2 — the mechanical reporter that
     feeds the judged pass; addendum Part A). NEVER BLOCKING. A candidate is not
     a finding: cold-read checklist §C q11 decides each one on the extracted
     transcript. It exists because his own sentence was seventeen words long and
     every length rule in the world sails straight past it. ---- */
  const fragOpen = [], fragLocked = [];
  lessons.forEach(L => {
    if (!inScope(L.fileId)) return;
    const bucket = LOCKED.has(L.fileId) ? fragLocked : fragOpen;
    L.strings.forEach(s => {
      if (!fragInScope(s.path)) return;
      fragmentCandidates(s.text).forEach(c =>
        bucket.push(s.path + ' [' + c.kind + '] "' + c.text.slice(0, 90) + '"'));
    });
  });
  console.log('\n  FRAGMENT-CANDIDATES — ' + fragOpen.length + ' on the lessons under review' +
    (fragLocked.length ? ', ' + fragLocked.length + ' on locked lessons' : '') +
    '. REPORTED, NOT BLOCKING.');
  console.log('    A chain of labels with nothing DOING anything reads as a headline, not a');
  console.log('    sentence — his verdict on "Four player tickets, four open cases." Each line');
  console.log('    below is a SUSPECT for the cold-read pass (checklist q11) to decide, and some');
  console.log('    will be fine. 192b is enforced by that judgement, not by this list.');
  fragOpen.forEach(p => console.log('    CANDIDATE ' + p));
  fragLocked.forEach(p => console.log('    WAIVED (locked) ' + p));
  console.log(led.length ? '  ' + led.length + ' unrecorded or stale sentence(s)' : '  every pupil sentence carries a record');
  led.slice(0, 40).forEach(p => { console.log('  FAIL ' + p); });
  if (led.length > 40) console.log('  … and ' + (led.length - 40) + ' more (run ledger-tool.js --missing for the full list)');
  led.forEach(p => FAILS.push(p));

  console.log('\n' + (FAILS.length ? 'qa-language: ' + FAILS.length + ' FAILURE(S)' : 'qa-language: ALL GREEN'));
  process.exit(FAILS.length ? 1 : 0);
}
if (require.main === module) main();
/* ledger-tool.js reads the films through THIS extractor rather than carrying a
   second copy of it — one fact, one home (DFM 144). pack-content.js runs this
   file as a child process, so the guard above leaves the gate untouched. */
module.exports = { collectFilmStrings, filmKey, filmRendered, FILM_MAP,
  /* exported so ledger-tool.js can SEE deck strings. It could not: its --missing
     walked lesson content only and printed "0 sentence(s) need a record" while a
     hundred and fifteen projected deck strings had none, and its --set answered
     "no such string path" for every one of them. The gate was honest (the pack
     failed loudly); the TOOL was reporting coverage it did not have, which is
     DFM 204's class. One walk, one home (DFM 144) — the same law the lesson walk
     above already states. */
  collectDeckStrings,
  /* exported for the DFM 196 control sweep: the same detector is run against the
     build he sat (7bba564) so the failure it catches there is filed as evidence
     before the fix it guards is credited. One implementation, two runs. */
  fragmentCandidates, hasRealVerb, collectStrings, fragInScope, loadLessons, inlineSequenceCheck,
  /* the hub collector is exported for the same reason the film one is: ledger-tool
     must write records against the SAME strings this gate reads, and a second walk
     would drift the first time one of them learned something new (DFM 144) */
  collectHubStrings, HUB_LOCKED_YEARS };
