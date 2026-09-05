#!/usr/bin/env node
/* install-hooks.js — point this worktree's git at the committed hook.
 * Run once per worktree: `node tools/qa/install-hooks.js`.
 * The hook itself is committed (tools/qa/hooks/pre-commit) so it travels with
 * the repo; only the link into .git/hooks is per-checkout. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const QA = __dirname;
const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], { cwd: QA, encoding: 'utf8' }).trim();
const target = path.resolve(QA, '..', '..', '..', '..', gitDir, 'hooks');
const dir = path.isAbsolute(gitDir) ? path.join(gitDir, 'hooks') : target;

/* A LINKED WORKTREE SHARES ITS HOOKS WITH EVERY OTHER WORKTREE. This repo is
   worked in from more than one place at once, and writing a maths pre-commit
   hook into the shared .git/hooks would make an unrelated session run this
   project's gates on its own commits. Git has no per-worktree hooks directory
   without core.hooksPath, and core.hooksPath is shared too - so unless the
   caller says outright that sharing is what they want, this installer stops
   and says what to run instead. */
const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: QA, encoding: 'utf8' }).trim();
/* and this is the directory git ACTUALLY reads hooks from - for a linked
   worktree it is the common one, not this worktree's own gitdir, so a hook
   copied to $GIT_DIR/hooks here would sit there and never once run */
const used = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], { cwd: QA, encoding: 'utf8' }).trim();
const linked = path.resolve(QA, common) !== path.resolve(QA, gitDir);
if (linked && process.env.MS_INSTALL_SHARED_HOOK !== '1') {
  console.log('this is a LINKED WORKTREE. Git reads its hooks from the SHARED directory');
  console.log('  ' + path.resolve(QA, used));
  console.log('(not from this worktree\'s own gitdir, ' + dir + ',');
  console.log('where a copy would sit and never run).');
  console.log('installing here would run the MathShelf gates on every commit made from any worktree');
  console.log('of this repository, including another session\'s. Nothing has been installed.');
  console.log('');
  console.log('run the gates yourself before each commit:   node tools/qa/run.js');
  console.log('or, if the sharing is what you want:         MS_INSTALL_SHARED_HOOK=1 node tools/qa/install-hooks.js');
  process.exit(0);
}
const installDir = linked ? path.resolve(QA, used) : dir;
fs.mkdirSync(installDir, { recursive: true });
const dest = path.join(installDir, 'pre-commit');
fs.copyFileSync(path.join(QA, 'hooks', 'pre-commit'), dest);
fs.chmodSync(dest, 0o755);
console.log('pre-commit hook installed at ' + dest);
console.log('every commit from here runs `node tools/qa/run.js` (the fast tier).');
