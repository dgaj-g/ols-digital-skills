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
fs.mkdirSync(dir, { recursive: true });
const dest = path.join(dir, 'pre-commit');
fs.copyFileSync(path.join(QA, 'hooks', 'pre-commit'), dest);
fs.chmodSync(dest, 0o755);
console.log('pre-commit hook installed at ' + dest);
console.log('every commit from here runs `node tools/qa/run.js` (the fast tier).');
