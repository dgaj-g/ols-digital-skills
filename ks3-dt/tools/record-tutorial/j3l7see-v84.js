/* J3 L7 TEACH IT TO SEE · gate for the word fixes after the live look at the school PC frame (1366 x 625, frame 484 px), V84.
   1 Who checks?: each round's rule gives both costs with their thing ("A check costs 3 points."), never a bare "costs 3.".
   2 Drawing golf: the rules have no number without its thing (the old "go six over the aim" is gone).
   CONTROL (must FAIL): the strings as they were at V83 (origin/main before this fix).
   node j3l7see-v84.js */
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const lib = require('./j3l7see-lib.js'), J = lib.judge('j3l7see-v84');
const FILE = path.join(__dirname, '../../platform/assets/see/see/strings.js');
const load = src => { const g = {}; vm.runInNewContext(src, { window: g, self: g, globalThis: g }); return g.SeeStrings; };
const NUM = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)';
const ruleOk = c => (c.match(/costs \d+ points?\./g) || []).length === 2 && !/costs \d+\./.test(c);
const bare = lines => lines.join(' ').match(new RegExp('\\b' + NUM + '\\b(?= over\\b| under\\b|[.,!?])', 'gi')) || [];
function judgeOf(S) { return { rules: S.checks.jobs.map(j => j.c), golf: S.golf.introLines }; }
(async () => {
  const now = judgeOf(load(fs.readFileSync(FILE, 'utf8')));
  J.must(now.rules.length === 4 && now.rules.every(ruleOk), 'Who checks?: every rule gives both costs in points — "' + now.rules[0] + '"');
  J.must(!bare(now.golf).length, 'Drawing golf: no number without its thing in the rules — "' + now.golf.join(' ') + '"');
  let old = null;
  try { old = judgeOf(load(execSync('git show 2841c0ab:ks3-dt/platform/assets/see/see/strings.js', { cwd: __dirname, encoding: 'utf8' }))); } catch (e) { old = null; }
  J.control(!!old && !old.rules.every(ruleOk), 'the V83 rule "A check costs 3."');
  J.control(!!old && bare(old.golf).length > 0, 'the V83 golf rule "You can go six over the aim."');
  await J.end();
})();
