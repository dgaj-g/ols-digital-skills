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
 * THE READER. DFM 178(b): the reader ages up with the year group. The
 * register laws (138) hold at every age; the LEVEL calibrates. Every
 * failure message and every ledger prompt names the right reader, so
 * nobody writing J2 text is silently judging it as an 11-year-old's.
 * ------------------------------------------------------------------ */
const READERS = {
  j1: 'an 11 or 12-year-old',
  j2: 'a 12 or 13-year-old',
  j3: 'a 13 or 14-year-old'
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
 * WHAT COUNTS AS PUPIL-FACING.
 * Fail-safe by design: every string under a chunk's config is INCLUDED
 * unless its key is machine-only. A new field somebody adds next month
 * is checked by default - the opposite way round from a manifest, which
 * silently ignores anything it has not been told about.
 * ------------------------------------------------------------------ */
const MACHINE_KEYS = new Set([
  'id', 'src', 'href', 'url', 'file', 'poster', 'img', 'icon', 'engine', 'phase',
  'mode', 'year', 'kind', 'kinds', 'logTerms', 'skin', 'clearToast_dev'
]);
/* Order-bearing contracts: a wording change here can silently break an answer
   key, so they are checked by the LEXICON only - never by shape rules, and they
   are still ledgered. (The parsons prompt is the sentence the block order must
   match; the blocks are the literal Scratch/MakeCode block names.) */
const ORDER_BEARING = /›\s*item\s*›\s*(prompt|blocks)/;
/* Staff-facing: the misconception labels under keys.*.mis are read by a teacher
   on the Live tab, never by a pupil. keys.*.explain IS pupil-facing (she sees it
   the moment she answers) and is fully checked. */
const isStaffPath = (p) => /›\s*mis(\s|›|\[)/.test(p);

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
      if (MACHINE_KEYS.has(k)) return;
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
  { rx: /on the bench\b/i, why: 'invents furniture she cannot see (DFM 35) + workplace idiom', fix: 'name the real place: "open in Scratch"' },
  { rx: /gets its moment\b/i, why: 'adult flourish', fix: 'say what happens' },
  { rx: /for eternity/i, why: 'literary register', fix: '"forever"' },
  { rx: /\bscenarios?\b/i, why: 'adult exam word', fix: '"questions" / "what would happen if"' },
  { rx: /reference build/i, why: 'INVENTED FACT (DFM 167 family) - no such thing exists', fix: 'delete the claim' },
  { rx: /\btap\b/i, allow: /tape|tapped it into|taps? of the/i, why: 'she has a MOUSE (DFM 138.1.6, 150) - the ban he has had to give twice', fix: '"click"' },
  { rx: /the device\b/i, allow: /any device|pair device|mime a device|the device's own/i, why: 'generic noun (DFM 138.1.5) - name it: the micro:bit', fix: '"the micro:bit"' },
  { rx: /\bthe wifi\b/i, why: 'the school connection is WIRED (DFM 138.1.6)', fix: '"the connection to the website"' },
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
const prose = (text) => String(text).replace(/`[^`]*`/g, ' ');

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

function dashChainCheck(rawText) {
  const text = prose(rawText);
  return sentences(text)
    .filter(s => (s.match(/ — /g) || []).length >= 3)
    .map(s => 'dash-chain: 3+ em-dash clauses in one sentence — split it: "' + s.slice(0, 90) + '…"');
}

/* L1-3 (DFM 171): a numbered sequence living inside ONE string renders as a
   prose paragraph - the exact fault on the stretch card he photographed. The
   engine builds <ol> from ARRAY fields only, so a sequence must be an array. */
function inlineSequenceCheck(rawText) {
  const text = prose(rawText);
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
function arrowChainCheck(rawText) {
  const text = prose(rawText);
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
  /* consecutive arrows belong to ONE path while the segment between them is a
     bare name (no sentence punctuation in it) */
  let chain = 1;
  for (let i = 0; i < segs.length - 1; i++) {
    const left = tailOf(segs[i]);
    const right = headOf(segs[i + 1]);
    const midIsBareName = i > 0 && !BOUND.test(segs[i]) && wordCount(segs[i].trim()) <= MAX_STEP;
    chain = midIsBareName ? chain + 1 : 1;
    const longest = Math.max(wordCount(left), wordCount(right));
    if (chain > MAX_ARROWS || longest > MAX_STEP) {
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
function vocabCheck(lessons, vocab) {
  const out = [];
  const orderOf = {};
  lessons.forEach(L => { orderOf[L.fileId] = Number(L.json.num || 99); });
  (vocab.terms || []).forEach(term => {
    const rx = new RegExp('\\b(' + [term.term].concat(term.aliases || [])
      .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i');
    const defLesson = term.definedIn.lesson;
    const defNum = orderOf[defLesson];
    let definitionSeen = false;
    lessons.forEach(L => {
      const num = Number(L.json.num || 99);
      const isSide = (L.json.mode === 'side' || /sq/.test(L.fileId));
      L.strings.forEach(s => {
        if (!rx.test(s.text)) return;
        if (isSide) return;                       /* side quest sits outside the spine */
        if (defNum === undefined) {
          out.push(s.path + ': watched term "' + term.term + '" but vocab.json names an unknown lesson "' + defLesson + '"');
          return;
        }
        if (num < defNum) {
          out.push(s.path + ': uses "' + term.term + '" but it is not taught until ' +
            defLesson + ' (' + term.definedIn.chunkId + ') — she meets the word before the meaning');
        } else if (num === defNum) {
          const chunkIds = (L.json.chunks || []).map(c => c.id);
          const defIdx = chunkIds.indexOf(term.definedIn.chunkId);
          const thisChunk = (s.path.split(' › ')[1] || '');
          const thisIdx = chunkIds.indexOf(thisChunk);
          if (defIdx >= 0 && thisIdx >= 0 && thisIdx < defIdx) {
            out.push(s.path + ': uses "' + term.term + '" before its own lesson defines it in "' +
              term.definedIn.chunkId + '"');
          }
        }
      });
      /* (c) the definition must really be there - no phantom definitions */
      if (L.fileId === defLesson) {
        const inChunk = L.strings.filter(s => (s.path.split(' › ')[1] || '') === term.definedIn.chunkId);
        if (inChunk.some(s => rx.test(s.text))) definitionSeen = true;
      }
    });
    if (defNum !== undefined && !definitionSeen) {
      out.push('vocab.json: "' + term.term + '" claims to be defined in ' + defLesson + ' › ' +
        term.definedIn.chunkId + ', but the word never appears there (phantom definition)');
    }
  });
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

/* ------------------------------------------------------------------ *
 * LAYER 2 - THE READ-ALOUD LEDGER. The heart of the file (DFM 178a).
 * ------------------------------------------------------------------ */
const crypto = require('crypto');
const sha1 = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 16);

function ledgerCheck(lessons, ledger) {
  const out = [];
  const byPath = ledger.entries || {};
  lessons.forEach(L => {
    const reader = readerFor(L.json.year);
    L.strings.forEach(s => {
      const e = byPath[s.path];
      if (!e) {
        out.push('UNREVIEWED: ' + s.path + ' — no read-aloud record. Ask it as ' + reader +
          ': can she DO it, PICTURE every noun, SAY what it is for? Then: node ledger-tool.js --add "' + s.path + '"');
        return;
      }
      if (e.sha1 !== sha1(s.text)) {
        out.push('CHANGED SINCE REVIEW: ' + s.path + ' — the sentence was edited after its record was written. ' +
          'Re-ask the question as ' + reader + ' and update the entry.');
        return;
      }
      if (e.grandfathered || e.reviewed) return;      /* provenance-stamped, see ledger-tool */
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
}

/* ------------------------------------------------------------------ *
 * MAIN
 * ------------------------------------------------------------------ */
/* ALWAYS load every lesson: the vocabulary gate is inherently cross-lesson - it
   cannot know whether "simulator" was taught earlier if it can only see one file.
   `only` narrows what is REPORTED, never what is read. (Scoping the read made a
   one-lesson run invent 20 failures about lessons it had not opened.) */
function loadLessons() {
  const dir = path.join(SRC, 'j1/lessons');
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => /^j\d-.*\.json$/.test(f) && !f.includes('.bak')) : [];
  return files.map(f => {
    const fileId = f.replace(/\.json$/, '');
    const json = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { fileId, json, strings: collectStrings(json, fileId) };
  }).sort((a, b) => Number(a.json.num || 99) - Number(b.json.num || 99));
}

function main() {
  const only = process.argv[2];
  console.log('qa-language — the communication-of-language harness (DFM 172/178)');
  runControls();

  const lessons = loadLessons();
  if (!lessons.length) { console.error('no lessons found at ' + SRC); process.exit(1); }
  const inScope = (p) => !only || String(p).indexOf(only) === 0;
  const vocab = fs.existsSync(VOCAB_FILE) ? JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8')) : { terms: [] };
  const ledger = fs.existsSync(LEDGER_FILE) ? JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8')) : { entries: {} };

  console.log('\nLAYER 1 — the mechanical net (structure first, lexicon last):');
  let n = 0;
  const problems = [];
  const locked = [];
  lessons.forEach(L => {
    if (!inScope(L.fileId)) return;
    const reader = readerFor(L.json.year);
    const isLocked = LOCKED.has(L.fileId);
    L.strings.forEach(s => {
      n++;
      const orderBearing = ORDER_BEARING.test(s.path);
      const found = orderBearing
        ? lexiconCheck(s.text)
        : [].concat(
            lengthCheck(s.text, reader),
            dashChainCheck(s.text),
            inlineSequenceCheck(s.text),
            arrowChainCheck(s.text),
            lexiconCheck(s.text)
          );
      found.forEach(f => (isLocked ? locked : problems).push(s.path + ': ' + f));
    });
  });
  vocabCheck(lessons, vocab).filter(inScope).forEach(p => (LOCKED.has(p.slice(0, 6)) ? locked : problems).push(p));
  screenContractCheck(lessons).filter(inScope).forEach(p => (LOCKED.has(p.slice(0, 6)) ? locked : problems).push(p));
  console.log('  scanned ' + n + ' pupil-facing strings across ' + lessons.length + ' lesson(s)');
  console.log(problems.length ? '  ' + problems.length + ' problem(s)' : '  clean');
  problems.forEach(p => { console.log('  FAIL ' + p); FAILS.push(p); });
  if (locked.length) {
    console.log('\n  LOCKED (DFM 176) — ' + locked.length + ' finding(s) in Lessons 1/2/side quest, recorded, NOT blocking.');
    console.log('  He has sat and signed these off; they are not to be "improved". This list is the');
    console.log('  work waiting the day he lifts the lock — and it is printed every run so it cannot rot.');
    locked.forEach(p => console.log('    WAIVED ' + p));
  }

  console.log('\nLAYER 2 — the read-aloud ledger (the gate that matters):');
  const led = ledgerCheck(lessons, ledger).filter(p => inScope(p.replace(/^[A-Z ]+: /, '')));
  console.log(led.length ? '  ' + led.length + ' unrecorded or stale sentence(s)' : '  every pupil sentence carries a record');
  led.slice(0, 40).forEach(p => { console.log('  FAIL ' + p); });
  if (led.length > 40) console.log('  … and ' + (led.length - 40) + ' more (run ledger-tool.js --missing for the full list)');
  led.forEach(p => FAILS.push(p));

  console.log('\n' + (FAILS.length ? 'qa-language: ' + FAILS.length + ' FAILURE(S)' : 'qa-language: ALL GREEN'));
  process.exit(FAILS.length ? 1 : 0);
}
main();
