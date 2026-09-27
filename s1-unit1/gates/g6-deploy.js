#!/usr/bin/env node
/* G6 — deploy log + ground-truth token (build prompt, A2 routine).
 * Every row of DEPLOY_LOG.md names a version, a build and a description that carries that build; versions count up from 1.
 * The newest row's build is the build in the served Index.html (body data-build + footer) and in the private Code.gs
 * header; the log's Web app URL is a c2ken.net /exec URL on the logged deployment ID; the token read off the live /exec
 * page (gates/out/g6-exec-seen.txt, written from the owner's browser at deploy time) is that same build and was seen
 * after the newest row's version went out.
 * CONTROLS (must fail): a log whose newest row names an older build, and a seen-token file from another build.
 * Run: node s1-unit1/gates/g6-deploy.js  (exit 0 = GREEN). Output: gates/out/g6-deploy.txt */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }

function judgeLog(md, html, codeHead, seen) {
  const fails = [];
  const rows = md.split('\n').filter((l) => /^\| \d/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  if (!rows.length) return ['no version rows'];
  rows.forEach((r, i) => {
    const [date, ver, build, desc] = r;
    if (+ver !== i + 1) fails.push('row ' + (i + 1) + ' version ' + ver);
    if (!/^[0-9a-f]{10}-[0-9a-f]{8}$/.test(build)) fails.push('row ' + (i + 1) + ' build ' + build);
    if (desc.indexOf(build) === -1 || desc.indexOf('v' + ver + ' ') !== 0) fails.push('row ' + (i + 1) + ' description ' + desc);
    if (!/\d{1,2} \w{3} 20\d\d \d\d:\d\d/.test(date)) fails.push('row ' + (i + 1) + ' date ' + date);
  });
  const last = rows[rows.length - 1], build = last[2], ver = last[1];
  const htmlBuild = (html.match(/data-build="s1u1-([0-9a-f-]+)"/) || [])[1];
  if (htmlBuild !== build) fails.push('Index.html body build ' + htmlBuild + ' ≠ log ' + build);
  if (html.split('s1u1-' + build).length < 3) fails.push('Index.html token not in both body and footer');
  if (codeHead.indexOf('build ' + build) === -1) fails.push('Code.gs header does not carry ' + build);
  const dep = (md.match(/Deployment ID: (AKfy[\w-]+)/) || [])[1], url = (md.match(/Web app: (\S+)/) || [])[1];
  if (!dep) fails.push('no deployment ID');
  if (!url || url !== 'https://script.google.com/a/macros/c2ken.net/s/' + dep + '/exec') fails.push('web app URL ' + url);
  if (!/Runs as: the user accessing the web app\. Access: anyone within c2ken\.net\./.test(md)) fails.push('runs-as line');
  if (!/Script ID: [\w-]{40,}/.test(md)) fails.push('script ID');
  const s = {}; seen.split('\n').forEach((l) => { const i = l.indexOf(': '); if (i > 0) s[l.slice(0, i)] = l.slice(i + 2).trim(); });
  if (s.url !== url) fails.push('seen-token url ' + s.url);
  if (s.token !== 's1u1-' + build) fails.push('seen token ' + s.token + ' ≠ s1u1-' + build);
  if (s.version !== ver) fails.push('seen after version ' + s.version + ', log newest ' + ver);
  return fails;
}

const md = fs.readFileSync(path.join(ROOT, 'DEPLOY_LOG.md'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'server', 'Index.html'), 'utf8');
const codeHead = fs.readFileSync(path.join(DESIGN, 'deploy', 'Code.gs'), 'utf8').slice(0, 300);
const seen = fs.readFileSync(path.join(OUT, 'g6-exec-seen.txt'), 'utf8');
const real = judgeLog(md, html, codeHead, seen);
check('DEPLOY_LOG rows, served token, Code.gs header and the live /exec token agree', real.length === 0, real.join(' | '));
const newest = (md.match(/^\| .*$/gm) || []).filter((l) => /^\| \d/.test(l)).pop() || '';
log.push('INFO newest row: ' + newest.replace(/\s+/g, ' ').slice(0, 160));
// ---- controls
const staleBuild = md.replace(/(\| \d{1,2} \w{3} 20\d\d \d\d:\d\d \| \d+ \| )([0-9a-f]{10}-[0-9a-f]{8})( \| v\d+ S1 Unit 1 )([0-9a-f]{10}-[0-9a-f]{8})(?![\s\S]*\| \d{1,2} \w{3} 20\d\d)/, '$1' + '0000000000-00000000' + '$3' + '0000000000-00000000');
const c1 = judgeLog(staleBuild, html, codeHead, seen);
check('CONTROL newest row names another build: fails', staleBuild !== md && c1.length > 0, 'failures ' + c1.length);
const c2 = judgeLog(md, html, codeHead, seen.replace(/token: s1u1-\S+/, 'token: s1u1-0000000000-00000000'));
check('CONTROL seen token from another build: fails', c2.length > 0, 'failures ' + c2.length);
const txt = 'G6 deploy log + token · ' + new Date().toISOString() + '\n' + log.join('\n') + '\n' + (res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail\n';
fs.writeFileSync(path.join(OUT, 'g6-deploy.txt'), txt); process.stdout.write(txt); process.exit(res.fail ? 1 : 0);
