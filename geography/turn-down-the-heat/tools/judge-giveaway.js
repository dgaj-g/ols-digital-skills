#!/usr/bin/env node
/* GIVEAWAY JUDGE — no answer may reach the page before she has answered.
   Runs the real-mouse walk in --scan mode: a MutationObserver records any element that ever carries
   data-answer / data-ok / data-right / data-correct / data-solution, and the walk records where the
   right option sits in every question (it must move about, never mostly first).
   node judge-giveaway.js            → must print GIVEAWAY CLEAN, exit 0
   node judge-giveaway.js --control  → two control walks the judge must catch (exit 0 only if it catches both):
                                       ?giveaway=1 puts answers in data-answer; --control-show forces
                                       "Show me the answers" visible before any Check.
   Every walk also fails if "Show me the answers" is visible when a task first appears. */
const { spawnSync } = require('child_process');
const path = require('path');
const CONTROL = process.argv.includes('--control');
const local = path.resolve(__dirname, '../index.html').split('/').map(encodeURIComponent).join('/');
const base = [path.join(__dirname, 'walk.js'), '--scan', '--width', '1536', '--height', '864'];
function walk(extra) {
  const r = spawnSync(process.execPath, base.concat(extra), { encoding: 'utf8', env: process.env, timeout: 600000 });
  const out = (r.stdout || '') + (r.stderr || '');
  out.split('\n').filter(l => /scan:|LEAK|FAIL|WALK/.test(l)).slice(0, 20).forEach(l => console.log(l));
  return { status: r.status, out };
}
if (CONTROL) {
  // Control 1: answers planted in data-answer. Control 2: "Show me the answers" forced visible from the start.
  const a = walk(['--url', 'file://' + local + '?giveaway=1']);
  const b = walk(['--control-show']);
  const c1 = /LEAK: an answer is in the page/.test(a.out), c2 = /LEAK: .* before two wrong Checks/.test(b.out);
  console.log(c1 ? 'CONTROL 1 OK: the judge caught the answers on ?giveaway=1.' : 'CONTROL 1 BROKEN: answers were in the page and the judge missed them.');
  console.log(c2 ? 'CONTROL 2 OK: the judge caught Show-answers showing too early.' : 'CONTROL 2 BROKEN: Show-answers showed early and the judge missed it.');
  console.log(c1 && c2 ? 'CONTROL OK' : 'CONTROL BROKEN');
  process.exit(c1 && c2 ? 0 : 1);
}
const r = walk([]);
const ok = r.status === 0 && !/LEAK:/.test(r.out);
console.log(ok ? 'GIVEAWAY CLEAN' : 'GIVEAWAY FAILED');
process.exit(ok ? 0 : 1);
