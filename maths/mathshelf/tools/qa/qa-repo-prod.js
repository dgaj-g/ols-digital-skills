#!/usr/bin/env node
/* qa-repo-prod.js — WHAT IS LIVE IS WHAT THE REPO HOLDS, BYTE FOR BYTE.
 *
 * G-G3 / DFM 154, 146d. The fault class: the deployed pair came apart from the
 * repo, so the next person to read the code was reading something else. It is
 * the quietest kind of breakage - nothing looks wrong until somebody trusts the
 * source and is wrong.
 *
 * Four questions, in the order that makes the cheapest one first (L10):
 *   is the tree clean? is HEAD pushed? is the committed pair identical to a
 *   FRESH build of HEAD? does HANDOVER.md name that commit and both /exec URLs?
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'fast';
const ORDER = 82;
const COVERS = { books: '*', kinds: [], surfaces: [], widths: [], projector: false, tier: ['built'], cells: ['deploy'] };
const CONTROLS = [
  { id: 'dirty-tree', kind: 'fixture', plant: 'fixture-dirty-tree', mustFail: /uncommitted/ },
  { id: 'stale-built-pair', kind: 'fixture', plant: 'fixture-stale-pair', mustFail: /differs from a fresh build/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const FULL = process.env.MS_TIER_RUN === 'full' || process.env.MS_POST_DEPLOY === '1';
const g = new Gate('qa-repo-prod');
g.exempt(['at the fast tier only the dirty-tree question is asked; the fresh-build comparison runs at --full and post-deploy']);

function git(args) {
  try { return execFileSync('git', args, { cwd: A.APP, encoding: 'utf8' }).trim(); }
  catch (e) { return null; }
}

/* ---- 1. clean ---------------------------------------------------------- */
const dirty = git(['status', '--porcelain', '--', '.']);
if (dirty === null) { g.note('not a git repository — nothing to compare against'); g.done(); process.exit(process.exitCode || 0); }
const lines = dirty.split('\n').filter(Boolean).filter(l => !/tools\/qa\/out\//.test(l));
g.check(lines.length === 0, 'the tree', 'repo-prod',
  lines.length + ' uncommitted change(s) — a deploy from a tree nobody can name is a deploy nobody can go back to:\n' +
  lines.slice(0, 8).map(l => '        ' + l).join('\n'));

if (!FULL) { g.note('fast tier: only the clean-tree question is asked here'); g.done(); process.exit(process.exitCode || 0); }

/* ---- 2. pushed --------------------------------------------------------- */
const sb = git(['status', '-sb']) || '';
g.check(!/\[ahead |\[behind /.test(sb), 'the branch', 'repo-prod',
  'HEAD is not level with its remote (' + (sb.split('\n')[0] || '') + ') — the built page pulls its fonts and films from the pushed site, so the push comes BEFORE the version cut');

/* ---- 3. the committed pair equals a fresh build ------------------------ */
{
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'mathshelf-fresh-'));
  try {
    execFileSync('cp', ['-R', A.APP + '/', scratch + '/']);
    const r = spawnSync(process.execPath, [path.join(scratch, 'server/build-pathb.js')], { cwd: scratch, encoding: 'utf8', maxBuffer: 32e6 });
    g.check(r.status === 0, 'a fresh build', 'repo-prod', 'a fresh build of the tree failed: ' + (r.stderr || '').slice(0, 200));
    ['server/Index.html', 'server/Code.gs'].forEach(rel => {
      const a = A.read(A.app(rel));
      const b = fs.readFileSync(path.join(scratch, rel), 'utf8');
      g.check(a === b, rel, 'repo-prod',
        'the committed ' + rel + ' differs from a fresh build of the same tree — the pair he pastes is not the pair the repo holds');
    });
  } finally { try { fs.rmSync(scratch, { recursive: true, force: true }); } catch (e) {} }
}

/* ---- 4. the handover names what is live -------------------------------- */
{
  const p = A.app('HANDOVER.md');
  const md = A.exists(p) ? A.read(p) : '';
  const head = git(['rev-parse', '--short', 'HEAD']) || '';
  if (process.env.MS_POST_DEPLOY === '1') {
    g.check(md.indexOf(head) >= 0, 'HANDOVER.md', 'repo-prod',
      'the handover does not name the commit that is live (' + head + ') — the next person to open this has no way to know what they are looking at');
    g.check((md.match(/\/exec/g) || []).length >= 2, 'HANDOVER.md', 'repo-prod',
      'the handover does not carry both /exec URLs — there are two deployments now, and only one of them is the one anybody visits');
  } else {
    g.note('post-deploy only: the handover is checked against the live commit after the version cut');
  }
}
g.done();
