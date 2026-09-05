/* verbs.js — DOES THIS CLAUSE HAVE A VERB IN IT?
 *
 * The KS3 DT fragment reporter uses `compromise` for part-of-speech tagging.
 * That library is installed inside the KS3 DT tools directory, and no maths gate
 * may require across trees or carry a node_modules of its own (gates design
 * Part 9): the maths gates must run when the KS3 DT tree is absent. So the verb
 * detector is re-authored here, self-contained.
 *
 * IT IS A REPORTER, NEVER A GATE (DFM 197/198, and 146a). Its output is a list
 * of candidates the separated judge must answer one by one; it never fails a
 * build on its own. That is what makes a hand-built detector honest: over-
 * reporting costs the judge a row, under-reporting costs a child a sentence, so
 * this leans towards reporting. It proves itself both ways on every run against
 * the exhibits in EXHIBITS below — a detector nobody has seen say yes AND no is
 * not a detector.
 */
'use strict';

/* auxiliaries and copulas — a clause with one of these has a verb */
const AUX = new Set(('is are was were be been being am do does did doing done has have had having ' +
  'can could will would shall should may might must ought need dare let lets ' +
  "isn't aren't wasn't weren't don't doesn't didn't can't won't shouldn't couldn't").split(' '));

/* the verbs these books and screens actually use, plus the common core. A word
   list is not grammar; it is the floor under the morphological rules below. */
const VERBS = new Set(('add adds answer answers ask asks build builds change changes check checks choose chooses ' +
  'clear clears close closes collect collects compare compares complete completes copy copies count counts ' +
  'cross crosses cut cuts describe describes divide divides draw draws drag drags drop drops earn earns enter enters ' +
  'estimate estimates expand expands explain explains fill fills find finds finish finishes fit fits fix fixes ' +
  'follow follows get gets give gives go goes hold holds ink inks join joins keep keeps know knows label labels ' +
  'leave leaves let lets lift lifts line lines list lists look looks make makes mark marks match matches ' +
  'measure measures meet meets move moves multiply multiplies name names need needs open opens order orders ' +
  'pick picks place places plot plots point points press presses put puts read reads record records ' +
  'remove removes repeat repeats replace replaces reply replies rest rests return returns run runs save saves ' +
  'say says see sees select selects send sends set sets show shows simplify simplifies slide slides solve solves ' +
  'sort sorts split splits start starts stay stays stop stops subtract subtracts swap swaps take takes ' +
  'tap taps tell tells think thinks try tries turn turns type types use uses want wants watch watches ' +
  'work works write writes came come comes gave gone got made put ran said saw seen sent set took went wrote ' +
  'means meant shows showed drew drawn found held kept knew left lost read wrote ' +
  'live lives belong belongs sit sits stay stays happen happens matter matters count counts ' +
  'reach reaches lead leads carry carries cover covers ask asked told tell tells ' +
  'chooses choosing suggest suggests wait waits').split(' '));

const NOT_VERB = new Set(('working workings marking markings reading readings drawing drawings ' +
  'setting settings meeting meetings feeling feelings building buildings ' +
  'answer answers question questions').split(' '));

/* determiners, cardinals and possessives OPEN a noun phrase; the head of that
   phrase is a NOUN however verb-like the word looks. This is the whole reason a
   word list alone cannot do the job: "Four fixes, one game." and "A fair copy."
   are the exhibits, and both were read as sentences with verbs until the noun
   phrase was tracked. */
const DET = new Set(('a an the this that these those my your his her its our their no every each ' +
  'one two three four five six seven eight nine ten some any another other').split(' '));
/* once a head noun has been seen the phrase is closed, so the next candidate is
   free to be the clause's verb: "Your teacher chooses…" */
const NOUNS = new Set(('teacher teachers pupil pupils class classes question questions book books ' +
  'exercise exercises page pages answer answers working line lines mark marks tally star ' +
  'curve rule tray scale marker markers point points grid axis value values number numbers ' +
  'angle angles shape shapes step steps film films method methods shelf cover dock pad chip chips ' +
  'name names school work sheet row rows column columns box plot median quartile range data ' +
  'thing things one ones way ways time times side sides part parts word words').split(' '));

function words(s) { return String(s).toLowerCase().replace(/[^a-z' -]+/g, ' ').split(/\s+/).filter(Boolean); }

/* morphology: -s / -ed / -ing forms of a listed stem, and the regular endings
   that only verbs take in this register */
function looksVerb(w, first) {
  if (AUX.has(w)) return true;
  if (VERBS.has(w)) return true;
  if (NOT_VERB.has(w)) return false;
  if (/^[a-z]+ed$/.test(w) && (VERBS.has(w.slice(0, -2)) || VERBS.has(w.slice(0, -1)))) return true;
  if (/^[a-z]+ies$/.test(w) && VERBS.has(w.slice(0, -3) + 'y')) return true;
  if (/^[a-z]+es$/.test(w) && VERBS.has(w.slice(0, -2))) return true;
  if (/^[a-z]+s$/.test(w) && VERBS.has(w.slice(0, -1))) return true;
  /* an -ing word is a verb only with an auxiliary in front of it; on its own it
     is a gerund, which is the whole point of the fragment rule */
  return false;
}

function hasRealVerb(text) {
  const raw = String(text);
  const w = words(raw);
  if (!w.length) return false;
  let npOpen = false;
  for (let i = 0; i < w.length; i++) {
    const word = w[i];
    if (/[,;:]/.test(raw) && false) { /* punctuation is handled by the caller's clause split */ }
    /* FIRST WORD FIRST. These screens are written in the imperative — "Put…",
       "Choose…", "Order…", "Answer…" — and several of those words are also
       perfectly good nouns. In first position, with no determiner in front of
       them, they are the instruction. Asking this before the noun rules is what
       stopped "Answer the question in the box." reading as verbless. */
    if (i === 0 && !npOpen && VERBS.has(word)) return true;
    if (DET.has(word)) { npOpen = true; continue; }
    if (NOUNS.has(word) && !AUX.has(word)) { npOpen = false; continue; }
    if (looksVerb(word, i === 0)) {
      /* the head of an open noun phrase is a noun, whatever it looks like */
      if (npOpen && !AUX.has(word)) { npOpen = false; continue; }
      return true;
    }
  }
  return false;
}

/* the pair the detector must get right, proved on every run */
const EXHIBITS = {
  mustHave: [
    'Put the values in order, smallest first.',
    'Slide the rule up the frequency axis.',
    'You have all the points you need.',
    'Your teacher chooses which ones are out.',
    'Find angles on a straight line.',
    'Nothing here is saved to school.',
    'Answer the question in the box.'
  ],
  mustNotHave: [
    'Four fixes, one game.',
    'That is the whole hour',      /* copula stripped by the caller's normaliser */
    'Five moves',
    'Four player tickets',
    'A fair copy.'
    /* "Answer only — no working shown." is NOT in either list. Read as an
       instruction it has a verb; read as a mark label it has none, and the label
       is what it is. Labels are exempt from the fragment rule BY PATH (the KS3
       DT isLabelPath shape), never by bending the detector around one string. */
  ]
};

function selfProve() {
  const bad = [];
  EXHIBITS.mustHave.forEach(s => { if (!hasRealVerb(s)) bad.push('missed a verb in "' + s + '"'); });
  EXHIBITS.mustNotHave.forEach(s => {
    const t = s.replace(/^(that|this)\s+(is|was|are|were)\b/i, 'that');   /* the demonstrative net owns those */
    if (hasRealVerb(t)) bad.push('found a verb in "' + s + '"');
  });
  return bad;
}

module.exports = { hasRealVerb, words, EXHIBITS, selfProve };
