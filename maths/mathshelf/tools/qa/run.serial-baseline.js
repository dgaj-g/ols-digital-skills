#!/usr/bin/env node
/* run.js — ONE COMMAND, THREE TIERS, TWO MATRICES.
 *
 * MATHS_GATES_DESIGN Part 6.1. Run from anywhere:
 *     node tools/qa/run.js            (--fast, the pre-commit tier)
 *     node tools/qa/run.js --full     (before every deploy)
 *     node tools/qa/run.js --control  (every control must FIRE)
 *     node tools/qa/run.js --book angles      (scopes the WALKERS to one book)
 *
 * Exit 0 green, 1 red. A CRASH OF ANY GATE IS RED, with the gate named — age of
 * the fault is no excuse and a harness that dies is a harness that measured
 * nothing (L11 / DFM 200).
 *
 * THE GATE LIST IS DERIVED, NEVER TYPED (L5). Every `qa-*.js` and `sit-*.js` in
 * this directory declares its own `TIER` and `ORDER` at the top of its source,
 * and this runner reads them the same way qa-coverage reads COVERS: from the
 * source, comments stripped. So writing a gate registers it — there is no
 * registry to forget to update (Part 6.4 step 4). A gate file with no TIER is a
 * failure named here, not a file that quietly never runs.
 *
 * SCOPING NEVER SILENCES (L3). `--book` narrows what the WALKERS walk; every
 * other gate still runs over every book, and qa-coverage still reports the whole
 * grid and still fails for the cells the scoped run did not close.
 *
 * BOTH MATRICES PRINT WHATEVER THE VERDICT — he reads the matrix, not only the
 * fails (Part 3.4).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { stripComments } = require('./lib/decl.js');
const { matrix } = require('./lib/report.js');

const QA = __dirname;
const APP = path.resolve(QA, '../..');
const OUT = path.join(QA, 'out');
fs.mkdirSync(OUT, { recursive: true });

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const TIER = has('--control') ? 'control' : has('--full') ? 'full' : 'fast';
const BOOK = valOf('--book');
const ONLY = valOf('--only');            /* one gate, for developing it */

/* ------------------------------------------------------- the derived list */
function declared(file) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const t = /(?:^|\n)\s*(?:const|let|var)\s+TIER\s*=\s*'([a-z]+)'/.exec(src);
  const o = /(?:^|\n)\s*(?:const|let|var)\s+ORDER\s*=\s*(\d+)/.exec(src);
  const hasCovers = /(?:^|\n)\s*(?:const|let|var)\s+COVERS\s*=/.test(src);
  const hasControls = /(?:^|\n)\s*(?:const|let|var)\s+CONTROLS\s*=/.test(src);
  return { tier: t ? t[1] : null, order: o ? Number(o[1]) : 9999, hasCovers, hasControls };
}
function gateFiles() {
  return fs.readdirSync(QA)
    .filter(f => /^(qa-|sit-|extract-).*\.js$/.test(f))
    .map(f => {
      const d = declared(path.join(QA, f));
      return { file: f, name: f.replace(/\.js$/, ''), ...d };
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

const ALL = gateFiles();
const undeclared = ALL.filter(g => !g.tier);
/* fast ⊂ full: a gate declared for the fast tier runs in the full tier too */
const inTier = (g) => TIER === 'full' ? (g.tier === 'fast' || g.tier === 'full')
  : TIER === 'fast' ? g.tier === 'fast' : true;

/* ------------------------------------------------------------- the runner */
const results = [];
function runGate(g, extraArgs, env) {
  const started = Date.now();
  console.log('');
  console.log('==== ' + g.name + ' ' + '='.repeat(Math.max(0, 62 - g.name.length)));
  const r = spawnSync(process.execPath, [path.join(QA, g.file)].concat(extraArgs || []), {
    cwd: APP, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: Object.assign({}, process.env, env || {})
  });
  const outText = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(outText);
  let verdict;
  if (r.error) verdict = 'CRASH';
  else if (r.status === 0) verdict = 'GREEN';
  else if (r.signal) verdict = 'CRASH';
  else verdict = 'RED';
  /* a gate that exits non-zero without ever printing a FAIL line died rather
     than judged; say so, because "red" and "dead" are different repairs */
  if (verdict === 'RED' && !/\bFAIL\b/.test(outText)) verdict = 'CRASH';
  results.push({
    name: g.name, verdict, secs: Math.round((Date.now() - started) / 100) / 10,
    fails: (outText.match(/^\s*FAIL\s/gm) || []).length,
    covers: g.hasCovers, controls: g.hasControls
  });
  fs.writeFileSync(path.join(OUT, g.name + '.log'), outText);
  return verdict === 'GREEN';
}

/* ------------------------------------------------------------------- main */
function main() {
  console.log('MathShelf gates — tier ' + TIER + (BOOK ? '  (walkers scoped to ' + BOOK + ')' : '') +
    '   ' + new Date().toISOString().slice(0, 19).replace('T', ' '));
  console.log('app: ' + APP);

  if (undeclared.length) {
    undeclared.forEach(g => console.log('  FAIL  ' + g.name + ' x registration: no TIER declared — a gate nothing runs is not a gate'));
  }

  if (TIER === 'control') {
    const r = spawnSync(process.execPath, [path.join(QA, 'control.js')].concat(BOOK ? ['--book', BOOK] : []), {
      cwd: APP, stdio: 'inherit', maxBuffer: 64 * 1024 * 1024,
      env: Object.assign({}, process.env)
    });
    process.exit(r.status === 0 && !undeclared.length ? 0 : 1);
  }

  let list = ALL.filter(inTier);
  if (ONLY) list = ALL.filter(g => g.name === ONLY);
  const env = { MS_TIER_RUN: TIER };
  if (BOOK) env.MS_BOOK = BOOK;

  list.forEach(g => runGate(g, [], env));

  /* ---- THE RESULTS MATRIX ------------------------------------------- */
  console.log(matrix('RESULTS — ' + TIER, ['gate', 'verdict', 'fails', 'secs', 'COVERS', 'CONTROLS'],
    results.map(r => [r.name, r.verdict, r.fails || '', r.secs, r.covers ? 'yes' : 'MISSING', r.controls ? 'yes' : 'MISSING'])));

  /* ---- THE COVERAGE MATRIX, whatever the verdict --------------------- */
  const cov = path.join(OUT, 'coverage-matrix.txt');
  if (fs.existsSync(cov)) console.log(fs.readFileSync(cov, 'utf8'));
  else console.log('  (no coverage matrix written — qa-coverage did not run)');

  const red = results.filter(r => r.verdict !== 'GREEN');
  console.log('');
  if (red.length || undeclared.length) {
    console.log('RED — ' + red.map(r => r.name + ' (' + r.verdict + ')').concat(undeclared.map(g => g.name + ' (undeclared)')).join(', '));
    process.exit(1);
  }
  console.log('GREEN — ' + results.length + ' gates, tier ' + TIER);
  process.exit(0);
}
main();
