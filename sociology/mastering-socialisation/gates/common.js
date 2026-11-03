/* gates/common.js - what g0 and g7 share: the result sheet (PASS / FAIL / SKIP lines + a count), the scratch folder, the
 * stand-in page (used only while platform/ is unfinished, written to the scratch folder, never into platform/) and the build. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const L = require('../tools/lib.js');

const SCRATCH = process.env.SOC_SCRATCH || path.join(os.tmpdir(), 'soc-gates');
const OUT = path.join(__dirname, 'out');

function sheet(name) {
  const lines = [], n = { PASS: 0, FAIL: 0, SKIP: 0 };
  const put = (kind, what, detail) => { n[kind]++; const l = kind + ' ' + what + (detail != null && detail !== '' ? ' — ' + detail : ''); lines.push(l); console.log(l); };
  return {
    pass: (w, d) => put('PASS', w, d), fail: (w, d) => put('FAIL', w, d), skip: (w, d) => put('SKIP', w, d),
    check: (ok, w, d) => put(ok ? 'PASS' : 'FAIL', w, d),
    info: (l) => { lines.push('INFO ' + l); console.log('INFO ' + l); },
    counts: () => n,
    finish() {
      const tail = name + ': ' + n.PASS + ' PASS, ' + n.FAIL + ' FAIL, ' + n.SKIP + ' SKIP';
      lines.push(tail); console.log(tail);
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, name + '.txt'), lines.join('\n') + '\n');
      process.exit(n.FAIL ? 1 : 0);
    },
  };
}

// the stand-in page: just enough to boot through google.script.run and show the reply, with one non-ASCII character and the
// real font, so the build's encoders, font inlining, script count and leak guard all run on it
function writeStandin(dir) {
  fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
  const files = {
    'index.html': '<!DOCTYPE html>\n<html lang="en-GB"><head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head>\n<body>\n<main id="app"><h1>Mastering Socialisation — stand-in page</h1><pre id="out">Loading…</pre></main>\n<script src="app.js"></script>\n</body></html>\n',
    'style.css': '@font-face { font-family: "Bricolage Grotesque"; src: url("fonts/BricolageGrotesque.woff2") format("woff2"); }\nbody { font-family: "Bricolage Grotesque", system-ui, sans-serif; margin: 16px; background: #fffdf8; color: #222; }\npre { white-space: pre-wrap; }\n',
    'strings.js': 'var S = { loading: "Loading…", standin: "Stand-in page (the front end is not written yet)." };\n',
    'engine.js': 'var Engine = { show: function (o) { document.getElementById("out").textContent = S.standin + "\\n\\n" + JSON.stringify(o, null, 2); } };\n',
    'staff.js': 'var Staff = { open: function () { google.script.run.withSuccessHandler(Engine.show).apiStaff({ op: "check" }); } };\n',
    'app.js': 'var App = { boot: function () { var b = window.SOCBOOT || {}; if (!b.cls) { Staff.open(); return; } google.script.run.withSuccessHandler(Engine.show).withFailureHandler(function (e) { Engine.show({ error: String(e) }); }).apiBoot({ cls: b.cls }); } };\n',
  };
  for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), s);
  return dir;
}
// which page to build: the real platform/ when all six files exist, else the stand-in (into a scratch deploy folder, so the
// real DESIGN/deploy/Index.html is never a stand-in)
function pagePlan(sh) {
  const missing = L.PAGE_FILES.filter((f) => !fs.existsSync(path.join(L.REPO, 'platform', f)));
  if (!missing.length && !process.env.SOC_STANDIN) return { platform: path.join(L.REPO, 'platform'), deploy: L.DEPLOY, standin: false };
  const dir = writeStandin(path.join(SCRATCH, 'standin-platform'));
  const deploy = path.join(SCRATCH, 'deploy');
  fs.mkdirSync(deploy, { recursive: true });
  if (sh) sh.skip('real page', 'platform/ is missing ' + (missing.join(', ') || '(SOC_STANDIN set)') + ': built with the stand-in page in ' + dir + ', deploy to ' + deploy);
  return { platform: dir, deploy, standin: true };
}
function build(plan) {
  const env = Object.assign({}, process.env, { SOC_PLATFORM: plan.platform, SOC_DEPLOY: plan.deploy });
  const r = spawnSync(process.execPath, [path.join(L.REPO, 'tools', 'build-server.js')], { env, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), env };
}
module.exports = { SCRATCH, OUT, sheet, writeStandin, pagePlan, build, L };
