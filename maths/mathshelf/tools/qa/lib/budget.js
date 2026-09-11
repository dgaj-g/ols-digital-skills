/* budget.js — THE BUDGET CLOCK (leash L1 of the Book C polish cut, 11 Sept 2026).
 *
 * Build time is a BUDGET, never "irrelevant" (his ruling of 7 Sept 2026: the
 * v4 gate hours were "a disgrace"). A cap that is only a sentence in a prompt
 * is not a cap; this is the mechanism. The first run of run.js with
 * MS_CUT_BUDGET_MIN set writes a STAMP — tools/qa/out/cut-start.json: when the
 * cut began, how many minutes it has, and the commit it began from — and from
 * then on every run prints "budget: N of M minutes used". Once N > M the two
 * expensive tiers (run.js --full, control.js) REFUSE TO START with one sentence,
 * while --fast still runs so a commit can still be proved and pushed. The
 * stamp is authoritative once written: the env var only creates it, so the
 * clock cannot be reset by forgetting to export the variable.
 *
 * The start commit the stamp records is also what the scope gate (qa-scope.js,
 * leash L2) diffs against: the two leashes share one start.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.resolve(__dirname, '..', 'out');
const STAMP = path.join(OUT, 'cut-start.json');
const APP = path.resolve(__dirname, '..', '..', '..');

const REFUSAL = 'budget spent: deploy what is green at a clean pushed commit, or stop and report';

function readStamp() {
  try { return JSON.parse(fs.readFileSync(STAMP, 'utf8')); } catch (e) { return null; }
}

/* write the stamp the first time a run sees MS_CUT_BUDGET_MIN; never overwrite */
function stamp() {
  const existing = readStamp();
  if (existing) return existing;
  const min = parseInt(process.env.MS_CUT_BUDGET_MIN || '', 10);
  if (!(min > 0)) return null;
  let commit = null;
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: APP, encoding: 'utf8' }).trim(); } catch (e) {}
  const s = { start: new Date().toISOString(), budgetMin: min, startCommit: commit };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(STAMP, JSON.stringify(s, null, 2) + '\n');
  return s;
}

/* { used, budget, spent, startCommit } or null when no cut is running */
function status() {
  const s = stamp();
  if (!s) return null;
  const used = Math.round((Date.now() - Date.parse(s.start)) / 60000);
  return { used, budget: s.budgetMin, spent: used > s.budgetMin, startCommit: s.startCommit || null, start: s.start };
}

function line() {
  const st = status();
  return st ? 'budget: ' + st.used + ' of ' + st.budget + ' minutes used' + (st.spent ? '  — SPENT' : '') : 'budget: no cut running';
}

/* the sentence an expensive tier prints when it refuses, or null */
function refusal() {
  const st = status();
  return st && st.spent ? REFUSAL : null;
}

module.exports = { STAMP, REFUSAL, stamp, status, line, refusal, readStamp };
