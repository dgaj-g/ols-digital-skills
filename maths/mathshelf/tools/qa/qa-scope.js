#!/usr/bin/env node
/* qa-scope.js — THE CUT NAMED WHAT IT MAY TOUCH (leash L2, 11 Sept 2026).
 *
 * Book C ran nine hours because the walks kept finding faults on OLD screens
 * and the build fixed the sampler, the gate, the law — nine harness commits in
 * an afternoon, none of them the book. His ruling (8 Sept): a red on an old
 * screen is a WAIVED debt row, never a fix inside a book build. A rule that
 * lives only in a prompt is a rule the next session forgets, so this gate
 * holds it: a cut writes tools/qa/CUT_SCOPE.txt — one path or glob per line —
 * before its first edit, and every file changed since the cut's start commit
 * (the stamp the budget clock wrote, tools/qa/out/cut-start.json) that matches
 * no line is failed BY NAME. Not the samplers, not the audits, not the
 * coverage machine: a false finding from those is a debt row, and this is the
 * gate that makes that the cheaper path.
 *
 * With no stamp there is no cut running and nothing to scope; the gate says
 * so and passes. The scope file is never consulted for what to run — it only
 * ever narrows what may CHANGE (L3: scoping never silences).
 *
 * THE BUDGET CLOCK'S CONTROL LIVES HERE TOO (leash L1). run.js is a runner,
 * not a gate, and has nowhere to declare a control; so at the --full tier this
 * gate asks the clock the same question run.js asked a moment earlier, and
 * under the planted four-hour-old stamp it proves run.js --full actually
 * refused — by running it, and quoting the refusal only when it was given.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const budget = require('./lib/budget.js');

const TIER = 'fast';
const ORDER = 83;
const COVERS = { books: '*', kinds: [], surfaces: [], widths: [], projector: false, tier: ['preview', 'built'], cells: ['deploy'] };
const CONTROLS = [
  { id: 'edit-outside-the-scope', kind: 'fixture', plant: 'fixture-scope-breach', mustFail: /is outside this cut's scope - the cut named what it may touch, and this is not it/ },
  { id: 'budget-spent', kind: 'fixture', plant: 'fixture-budget-spent', mustFail: /budget spent: deploy what is green at a clean pushed commit, or stop and report/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const FULL = process.env.MS_TIER_RUN === 'full';
const g = new Gate('qa-scope');
g.exempt(['the scope file narrows what may CHANGE, never what runs: every other gate still reads the whole tree']);

const st = budget.status();
g.note(budget.line());

/* ---- L1: at the expensive tier, a spent budget is a red, and run.js must
        have refused it ------------------------------------------------- */
if (FULL && st && st.spent) {
  const r = spawnSync(process.execPath, [A.qa('run.js'), '--full', '--only', 'qa-audit'], {
    cwd: A.APP, encoding: 'utf8', timeout: 60000, env: Object.assign({}, process.env, { MS_TIER_RUN: '' })
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const refused = r.status !== 0 && out.indexOf(budget.REFUSAL) >= 0;
  if (refused) g.fail('the cut', 'budget', budget.REFUSAL + ' (run.js --full refused to start, as it must: ' + st.used + ' of ' + st.budget + ' minutes used)');
  else g.fail('the cut', 'budget', 'the budget is spent (' + st.used + ' of ' + st.budget + ' minutes) and run.js --full started anyway — the clock is decoration');
}

/* ---- L2: every changed file is inside the scope ------------------------ */
if (!st || !st.startCommit) {
  g.note('no cut running (no tools/qa/out/cut-start.json with a start commit) — nothing to scope');
} else if (!A.exists(A.qa('CUT_SCOPE.txt'))) {
  g.fail('the cut', 'scope', 'a cut is running from ' + st.startCommit.slice(0, 7) + ' but tools/qa/CUT_SCOPE.txt does not exist — the cut never named what it may touch');
} else {
  const globs = A.read(A.qa('CUT_SCOPE.txt')).split('\n').map(s => s.trim()).filter(l => l && !l.startsWith('#'));
  const res = globs.map(gl => new RegExp('^' + gl.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'));
  const inScope = (rel) => res.some(re => re.test(rel));

  let repo = null;
  try { repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: A.APP, encoding: 'utf8' }).trim(); } catch (e) {}
  if (!repo) {
    g.fail('the cut', 'scope', 'not a git repository — the scope cannot be measured, so it is not held');
  } else {
    const git = (args) => execFileSync('git', args, { cwd: A.APP, encoding: 'utf8', maxBuffer: 32e6 }).split('\n').map(s => s.trim()).filter(Boolean);
    let changed = [];
    try {
      /* every list repo-relative (--full-name), whatever the cwd */
      changed = git(['diff', '--name-only', st.startCommit])            /* committed + unstaged since the start */
        .concat(git(['diff', '--name-only', '--cached']))                /* staged */
        .concat(git(['ls-files', '--others', '--exclude-standard', '--full-name', '--', repo]));   /* brand-new files */
    } catch (e) {
      g.fail('the cut', 'scope', 'git could not diff against the start commit ' + st.startCommit.slice(0, 7) + ': ' + String(e.message).split('\n')[0]);
    }
    const appRel = path.relative(repo, A.APP).split(path.sep).join('/') + '/';
    const seen = new Set();
    changed.forEach(p => {
      if (seen.has(p)) return; seen.add(p);
      /* a change outside the app is outside every scope this file could name */
      const rel = p.startsWith(appRel) ? p.slice(appRel.length) : null;
      if (rel && inScope(rel)) return;
      g.fail(rel || p, 'scope', (rel || p) + " is outside this cut's scope - the cut named what it may touch, and this is not it");
    });
    g.note(seen.size + ' file(s) changed since ' + st.startCommit.slice(0, 7) + '; scope has ' + globs.length + ' line(s)');
    if (!g.fails.length) g.pass('every changed file is inside the cut\'s scope');
  }
}

g.done();
