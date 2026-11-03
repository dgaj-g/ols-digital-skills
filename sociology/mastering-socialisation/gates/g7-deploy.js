#!/usr/bin/env node
/* gates/g7-deploy.js - the deploy gate: what goes into Apps Script and what goes into git. Builds first (the real platform/
 * into DESIGN/deploy), then checks the served Index.html (four scriptlets once each, balanced script blocks, pure ASCII,
 * window.CONTENT equal to content/, no bank key text, no judge, no staff secret, no named teacher), the private Code.gs
 * (mode 600, parses, outside the repo), that git holds nothing private (tracked AND untracked-not-ignored files under
 * sociology/mastering-socialisation), and that appsscript.json matches s1-unit1's scopes and web-app settings.
 * Writes gates/out/g7.txt; exit 1 on any FAIL.   Usage: node gates/g7-deploy.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const { sheet, pagePlan, build, redact, L } = require('./common.js');

const sh = sheet('g7');
const WT = path.resolve(L.REPO, '..', '..');
const REL = path.relative(WT, L.REPO);
const S1_APPS = path.join(WT, 's1-unit1', 'server', 'appsscript.json');
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

function main() {
  // ---------- build ----------
  const plan = pagePlan(sh);
  const b = build(plan);
  const outLines = b.out.trim().split('\n').filter(Boolean);
  sh.check(b.code === 0, 'build', b.code === 0 ? outLines.slice(-1)[0] : redact(outLines.slice(-2).join(' | ')));
  if (b.code !== 0) return;
  const idxPath = path.join(plan.deploy, 'Index.html'), codePath = path.join(plan.deploy, 'Code.gs');
  if (!fs.existsSync(idxPath)) { sh.fail('Index.html', 'not written to ' + plan.deploy); return; }
  const page = fs.readFileSync(idxPath, 'utf8'), code = fs.readFileSync(codePath, 'utf8');
  sh.info('Index.html ' + kb(page.length) + ' -> ' + idxPath + (plan.standin ? ' (stand-in page)' : ''));

  // ---------- Index.html: templating and structure ----------
  const counts = L.SCRIPTLETS.map((s) => page.split(s).length - 1);
  sh.check(counts.every((n) => n === 1), 'each of the four scriptlets exactly once', L.SCRIPTLETS.map((s, i) => s + ' x' + counts[i]).join(', '));
  let clean = page; L.SCRIPTLETS.forEach((s) => { clean = clean.split(s).join(''); });
  const stray = (clean.match(/<\?|\?>/g) || []).length;
  sh.check(stray === 0, 'no other <? or ?> (Apps Script templating)', stray + ' stray');
  const tags = page.match(/<script\b[^>]*>|<\/script>/gi) || [];
  let depth = 0, nested = false, opens = 0;
  for (const tg of tags) { if (/^<script/i.test(tg)) { opens++; if (depth) nested = true; depth++; } else depth--; if (depth < 0) nested = true; }
  sh.check(!nested && depth === 0 && opens > 0, 'script blocks balanced (each <script> closed before the next opens)', opens + ' blocks');
  const nonAscii = page.match(/[^\x00-\x7f]/);
  sh.check(!nonAscii, 'Index.html is pure ASCII', nonAscii ? 'U+' + nonAscii[0].charCodeAt(0).toString(16) : page.length + ' bytes');
  sh.check(/window\.SOCBOOT = \{ cls: "<\?= classCode \?>"/.test(page) && /App\.boot\(\)/.test(page), 'boot block and App.boot() present');

  // ---------- window.CONTENT ----------
  const m = page.match(/<script>window\.CONTENT = ([\s\S]*?);<\/script>/);
  if (!m) sh.fail('window.CONTENT present', 'no <script>window.CONTENT = ...</script> block');
  else {
    const box = { window: {} };
    try { vm.runInNewContext('window.CONTENT = ' + m[1] + ';', box); } catch (e) { box.err = e.message; }
    const want = JSON.stringify(L.readContent());
    sh.check(!box.err && JSON.stringify(box.window.CONTENT) === want, 'window.CONTENT present and equal to content/', box.err ? 'does not run: ' + box.err : Object.keys(box.window.CONTENT || {}).length + ' files, ' + kb(m[1].length) + ' in the page');
  }

  // ---------- Index.html: nothing private ----------
  const banks = L.readBanks().banks, content = L.readContent(), staff = L.readStaff(), pass = L.readPass(), teachers = L.readTeachers();
  const LL = L.leakList({ banks, content, staff, pass, teachers });
  const fixedHits = LL.fixed.filter((t) => page.indexOf(t) !== -1);
  sh.check(page.indexOf('"k":') === -1, 'no "k": in the page');
  sh.check(!fixedHits.length, 'no judge, BANKS, key field or STAFF_ name in the page', fixedHits.length ? fixedHits.join(', ') : LL.fixed.length + ' fixed strings');
  sh.check(!!(staff && staff.salt && staff.hash && pass), 'staff secrets exist to check against', staff ? 'salt, hash and passcode read' : 'DESIGN/deploy/staff.json missing');
  const secretHits = LL.secrets.filter((t) => page.indexOf(t) !== -1).length;
  sh.check(secretHits === 0, 'no STAFF_ value (salt, hash, passcode) or named teacher in the page', LL.secrets.length + ' secrets');
  const bankHits = L.findLeaks(page, { fixed: [], secrets: [], guarded: LL.guarded });
  sh.check(!bankHits.length, 'no bank key text in the page (leak guard)', bankHits.length ? bankHits.length + ' hits, first from ' + bankHits[0].from : LL.guarded.size + ' bank strings checked');
  sh.info('leak-guard exemptions: ' + LL.exempt.size + ' bank key strings are word for word in the public content/ and are not counted');

  // ---------- Code.gs: private and whole ----------
  const mode = (fs.statSync(codePath).mode & 0o777).toString(8);
  sh.check(mode === '600', 'Code.gs is mode 600', mode);
  let parses = true; try { new vm.Script(code); } catch (e) { parses = false; }
  sh.check(parses && /var BANKS = /.test(code) && /var JudgeFive\b/.test(code) && !/@@[A-Z_]+@@/.test(code), 'Code.gs parses, holds the banks and judge, no unfilled placeholder', kb(code.length));
  sh.check(!path.resolve(plan.deploy).startsWith(path.resolve(WT) + path.sep), 'the deploy folder is outside the git worktree', plan.deploy);

  // ---------- git: nothing private tracked or about to be ----------
  const git = (args) => spawnSync('git', ['-C', WT].concat(args), { encoding: 'utf8' });
  const tracked = git(['ls-files', REL]), untracked = git(['ls-files', '--others', '--exclude-standard', REL]);
  if (tracked.status !== 0) sh.fail('git ls-files', (tracked.stderr || '').trim());
  else {
    const BAD = [/(^|\/)banks\//, /(^|\/)judge\//, /(^|\/)deploy\//, /(^|\/)Code\.gs$/, /STAFF_PASSCODE/, /TEACHERS\.txt$/, /dev-store/, /staff\.json$/];
    const bad = (list) => list.filter((f) => BAD.some((re) => re.test(f)));
    const T = tracked.stdout.split('\n').filter(Boolean), U = untracked.stdout.split('\n').filter(Boolean);
    sh.check(!bad(T).length, 'git tracks no banks/, judge/, deploy/, Code.gs, STAFF_PASSCODE, TEACHERS.txt or dev-store', bad(T).length ? bad(T).slice(0, 5).join(', ') : T.length + ' tracked files');
    sh.check(!bad(U).length, 'nothing private waits untracked to be added', bad(U).length ? bad(U).slice(0, 5).join(', ') : U.length + ' untracked files');
    // file contents: the staff secrets and the bank key text must not be in any text file git has or would add
    const textFiles = T.concat(U).filter((f) => /\.(js|json|html|css|md|txt|gs|template|svg)$/.test(f) && fs.existsSync(path.join(WT, f)));
    const secretFiles = [], keyFiles = [];
    for (const f of textFiles) {
      const s = fs.readFileSync(path.join(WT, f), 'utf8');
      if (LL.secrets.some((x) => s.indexOf(x) !== -1)) secretFiles.push(f);
      if (!/\/content\//.test(f) && L.findLeaks(s, { fixed: [], secrets: [], guarded: LL.guarded }).length) keyFiles.push(f);
    }
    sh.check(!secretFiles.length, 'no repo file holds the staff salt, hash, passcode or a named teacher', secretFiles.length ? secretFiles.join(', ') : textFiles.length + ' text files read');
    sh.check(!keyFiles.length, 'no repo file outside content/ holds bank key text', keyFiles.length ? keyFiles.slice(0, 5).join(', ') : textFiles.length + ' text files read');
  }

  // ---------- appsscript.json ----------
  const mine = JSON.parse(fs.readFileSync(path.join(L.REPO, 'server', 'appsscript.json'), 'utf8'));
  const dep = JSON.parse(fs.readFileSync(path.join(plan.deploy, 'appsscript.json'), 'utf8'));
  if (!fs.existsSync(S1_APPS)) sh.skip('appsscript.json scopes match s1-unit1', S1_APPS + ' not found');
  else {
    const s1 = JSON.parse(fs.readFileSync(S1_APPS, 'utf8'));
    const sc = (j) => JSON.stringify((j.oauthScopes || []).slice().sort());
    sh.check(sc(mine) === sc(s1) && sc(dep) === sc(s1), 'appsscript.json scopes match s1-unit1', (mine.oauthScopes || []).map((u) => u.replace('https://www.googleapis.com/auth/', '')).join(', '));
    sh.check(JSON.stringify(mine.webapp) === JSON.stringify(s1.webapp) && mine.runtimeVersion === 'V8' && mine.timeZone === 'Europe/London', 'web app runs as the user, domain only, V8, Europe/London', JSON.stringify(mine.webapp));
  }
}

try { main(); } catch (e) { sh.fail('g7 crashed', (e && e.stack || String(e)).split('\n').slice(0, 3).join(' | ')); }
sh.finish();
