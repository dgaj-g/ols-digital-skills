#!/usr/bin/env node
/* ============================================================
   Content validator for the A2 Plate Tectonics atlas.

   Checks the authoring contract in AUTHORING.md holds:
   schema shape, exactly one correct MCQ option, non-empty cloze
   answers, plate/sim/diagram references that resolve, and — the
   important one — that no question gives its own answer away.

   Run:  node tools/validate-content.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const errors = [];
const warnings = [];
function err(m) { errors.push(m); }
function warn(m) { warnings.push(m); }

/* ---------- load the content + the registries it references ---------- */

const sandbox = { window: {}, document: { createElementNS: () => ({}) }, console };
sandbox.window.matchMedia = () => ({ matches: false });
vm.createContext(sandbox);

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  try { vm.runInContext(src, sandbox, { filename: rel }); }
  catch (e) { err(`${rel} failed to parse/run: ${e.message}`); }
}
load('topics/margins-landforms/content.js');

/* sim + plate ids, read as text so we do not need a DOM to run them */
const simSrc = fs.readFileSync(path.join(ROOT, 'assets/sims.js'), 'utf8');
const plateSrc = fs.readFileSync(path.join(ROOT, 'assets/plates.js'), 'utf8');
const diagSrc = fs.readFileSync(path.join(ROOT, 'assets/diagrams.js'), 'utf8');

const SIM_IDS = new Set();
simSrc.replace(/SIMS(?:\.|\[')([a-zA-Z0-9-]+)'?\]?\s*=\s*\{/g, (_, id) => SIM_IDS.add(id));
const DIAGRAM_IDS = new Set();
diagSrc.replace(/DIAGRAMS\.([a-zA-Z0-9]+)\s*=\s*\{/g, (_, id) => DIAGRAM_IDS.add(id));
const PLATE_REFS = new Set();
plateSrc.replace(/from:\s*'(sim|diagram)',\s*ref:\s*'([a-zA-Z0-9-]+)'/g, (_, k, r) => PLATE_REFS.add(r));

const topics = sandbox.window.OLS_A2PT_TOPICS || [];
if (!topics.length) err('No topic registered on window.OLS_A2PT_TOPICS');

/* ---------- helpers ---------- */

const strip = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => strip(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

const KNOWN = new Set(['heading', 'text', 'steps', 'callout', 'keyterms', 'note', 'diagram',
  'sim', 'board', 'data', 'mcq', 'cloze', 'match', 'sequence', 'classify',
  'checkpoint', 'examq', 'marker']);
const GENRES = new Set(['keypoint', 'didyouknow', 'examtip', 'howdoweknow', 'thinkdiscuss',
  'speclink', 'place']);

/* Common words that may legitimately appear in both a stem and its answer. */
const STOP = new Set(('the a an and or of to in at on is are was were be been it its this that ' +
  'these those for from with by as not no which what where when why how does do did than then ' +
  'more most less least two three four five one all any each between into onto up down out ' +
  'plate plates margin margins earth crust it\'s you your').split(/\s+/));

/* ---------- walk ---------- */

const qids = new Set();
let stats = { chapters: 0, blocks: 0, assessed: 0, sims: 0, examq: 0 };

topics.forEach((topic) => {
  if (!topic.id || !topic.title) err('Topic is missing id or title');
  if (!Array.isArray(topic.spec) || !topic.spec.length) err('Topic has no spec statements');
  const specIds = new Set((topic.spec || []).map((s) => s.id));

  const chIds = new Set();
  (topic.chapters || []).forEach((ch) => {
    stats.chapters++;
    const where = `ch ${ch.num} (${ch.id})`;
    if (!ch.id) err(`${where}: missing id`);
    if (chIds.has(ch.id)) err(`${where}: duplicate chapter id`);
    chIds.add(ch.id);
    if (!ch.title) err(`${where}: missing title`);
    (ch.specIds || []).forEach((s) => {
      if (!specIds.has(s)) err(`${where}: references unknown spec statement "${s}"`);
    });
    if (!(ch.specIds || []).length) warn(`${where}: no specIds — it will not count towards any spec statement`);

    let assessedInChapter = 0;

    (ch.blocks || []).forEach((b, i) => {
      stats.blocks++;
      const at = `${where} block ${i} [${b.type}]`;
      if (!KNOWN.has(b.type)) { err(`${at}: unknown block type`); return; }

      if (['mcq', 'cloze', 'match', 'sequence', 'classify', 'checkpoint', 'examq', 'marker']
        .includes(b.type)) { assessedInChapter++; stats.assessed++; }

      switch (b.type) {
        case 'callout':
          if (!GENRES.has(b.genre)) err(`${at}: unknown callout genre "${b.genre}"`);
          if (b.genre === 'place' && !b.place) warn(`${at}: place callout with no place chip`);
          if (!b.html) err(`${at}: empty callout`);
          break;

        case 'sim':
          stats.sims++;
          if (!SIM_IDS.has(b.id)) err(`${at}: sim "${b.id}" is not registered in assets/sims.js`);
          break;

        case 'diagram':
          if (!DIAGRAM_IDS.has(b.id)) err(`${at}: diagram "${b.id}" is not registered in assets/diagrams.js`);
          if (!PLATE_REFS.has(b.id)) warn(`${at}: diagram "${b.id}" has no Atlas Plate entry`);
          break;

        case 'keyterms':
          (b.terms || []).forEach((t) => {
            if (!t.term || !t.def) err(`${at}: key term missing term or def`);
          });
          break;

        case 'data':
          (b.facts || []).forEach((f) => {
            if (f.value === undefined || !f.label) err(`${at}: data fact missing value or label`);
          });
          break;

        case 'mcq':
          checkMcq(b, at);
          break;

        case 'cloze':
          checkCloze(b, at);
          break;

        case 'match':
          if (!(b.pairs || []).length) err(`${at}: no pairs`);
          (b.pairs || []).forEach((p) => {
            if (!p.left || !p.right) err(`${at}: pair missing left or right`);
          });
          if (new Set((b.pairs || []).map((p) => p.right)).size !== (b.pairs || []).length) {
            err(`${at}: duplicate right-hand chips — two targets would accept the same chip`);
          }
          break;

        case 'sequence':
          if ((b.items || []).length < 3) err(`${at}: sequence needs at least 3 items`);
          break;

        case 'classify': {
          const cols = new Set(b.columns || []);
          if (cols.size < 2) err(`${at}: classify needs at least 2 columns`);
          (b.items || []).forEach((it) => {
            if (!cols.has(it.col)) err(`${at}: item "${it.text}" has column "${it.col}" which is not declared`);
          });
          cols.forEach((c) => {
            if (!(b.items || []).some((it) => it.col === c)) {
              warn(`${at}: column "${c}" has no items`);
            }
          });
          break;
        }

        case 'checkpoint':
          if (!(b.items || []).length) err(`${at}: empty checkpoint`);
          (b.items || []).forEach((it, j) => {
            const at2 = `${at} item ${j}`;
            if (it.type === 'mcq') checkMcq(it, at2);
            else if (it.type === 'cloze') checkCloze(it, at2);
            else err(`${at2}: checkpoint items must be mcq or cloze`);
            if (!it.teach) warn(`${at2}: no teach line for the review list`);
          });
          break;

        case 'examq':
          stats.examq++;
          if (!b.qid) err(`${at}: missing qid`);
          if (qids.has(b.qid)) err(`${at}: duplicate qid "${b.qid}"`);
          qids.add(b.qid);
          if (!b.question) err(`${at}: missing question`);
          if (typeof b.marks !== 'number') err(`${at}: marks must be a number`);
          if (!(b.scheme || []).length) err(`${at}: no mark scheme`);
          if (!b.source) err(`${at}: no provenance line — every exam card must say where it came from`);
          if (b.model && !/<mark>/.test(b.model)) {
            warn(`${at}: model answer has no <mark> phrases, so the examiner ink will not draw`);
          }
          if (b.model && !b.modelNote) {
            warn(`${at}: model answer without a modelNote saying where it came from`);
          }
          break;

        case 'marker':
          if (!b.qid) err(`${at}: missing qid`);
          if (qids.has(b.qid)) err(`${at}: duplicate qid "${b.qid}"`);
          qids.add(b.qid);
          if (!(b.bands || []).length) err(`${at}: no band descriptors`);
          if (!b.verdict || !b.verdict.band) err(`${at}: no verdict`);
          if (b.verdict && !(b.bands || []).some((x) => x.band === b.verdict.band)) {
            err(`${at}: verdict band "${b.verdict.band}" is not one of the offered bands`);
          }
          if (b.verdict && !b.verdict.caveat) {
            warn(`${at}: verdict with no caveat — say whose judgement it is`);
          }
          break;
      }
    });

    if (assessedInChapter < 2) {
      warn(`${where}: only ${assessedInChapter} interactive block(s) — the brief asks for quizzes throughout`);
    }
  });
});

/* ---------- the answer-leak checks ---------- */

function checkMcq(b, at) {
  const opts = b.options || [];
  if (opts.length < 3) err(`${at}: fewer than 3 options`);
  const correct = opts.filter((o) => o.correct);
  if (correct.length !== 1) err(`${at}: needs exactly one correct option, found ${correct.length}`);
  if (!b.stem) { err(`${at}: no stem`); return; }
  opts.forEach((o) => {
    if (!o.why) warn(`${at}: option "${strip(o.text).slice(0, 40)}" has no teaching line`);
  });

  /* LEAK: does the stem contain the distinctive words of its own answer? */
  if (correct[0]) {
    const stemWords = new Set(words(b.stem));
    const ansWords = words(correct[0].text).filter((w) => w.length > 3 && !STOP.has(w));
    const shared = ansWords.filter((w) => stemWords.has(w));
    if (ansWords.length && shared.length / ansWords.length >= 0.6) {
      err(`${at}: LEAK — the stem repeats most of its own answer (${shared.join(', ')})`);
    }
  }

  /* LEAK: is the correct option conspicuously the longest? */
  const lens = opts.map((o) => strip(o.text).length);
  const ci = opts.findIndex((o) => o.correct);
  if (ci >= 0 && lens.length > 2) {
    const others = lens.filter((_, i) => i !== ci);
    const maxOther = Math.max.apply(null, others);
    if (lens[ci] > maxOther * 2.1) {
      warn(`${at}: the correct option is more than twice the length of every other — length is a tell`);
    }
  }
}

function checkCloze(b, at) {
  const segs = b.segments || [];
  const gaps = segs.filter((s) => s.t === 'gap');
  if (!gaps.length) { err(`${at}: cloze with no gaps`); return; }
  gaps.forEach((g) => {
    if (!g.answer || !String(g.answer).trim()) err(`${at}: gap with empty answer`);
    if (g.show != null && (g.show < 0 || g.show >= String(g.answer).length)) {
      err(`${at}: gap "show" of ${g.show} would reveal the whole answer "${g.answer}"`);
    }
  });

  /* LEAK: does the surrounding prose already contain the answer? */
  const around = words(segs.filter((s) => s.t === 'txt').map((s) => s.text).join(' ') +
    ' ' + (b.prompt || '') + ' ' + (b.title || ''));
  const aroundSet = new Set(around);
  gaps.forEach((g) => {
    const a = String(g.answer).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (a.length > 3 && aroundSet.has(a)) {
      err(`${at}: LEAK — the answer "${g.answer}" already appears in the surrounding text`);
    }
  });
}

/* ---------- report ---------- */

console.log('\nTerra Mobilis — content validation');
console.log('  chapters %d · blocks %d · interactive %d · animations %d · exam cards %d',
  stats.chapters, stats.blocks, stats.assessed, stats.sims, stats.examq);

if (warnings.length) {
  console.log('\n  %d warning(s):', warnings.length);
  warnings.forEach((w) => console.log('   ~ ' + w));
}
if (errors.length) {
  console.log('\n  %d ERROR(S):', errors.length);
  errors.forEach((e) => console.log('   ✗ ' + e));
  console.log('');
  process.exit(1);
}
console.log('\n  No errors.\n');
