#!/usr/bin/env node
/* tools/build-server.js - assemble the two Apps Script files (modelled on s1-unit1/tools/build-server.js).
 *
 *   Code.gs     PRIVATE. The judge (DESIGN/judge/common.js + five.js + ten.js, read in place, never copied into this repo),
 *               every bank (DESIGN/banks/** /*.json as var BANKS = {act id: bank}), the p5 card terms (var CARD_TERMS, public)
 *               and server/Code.gs.template with the owner email, the staff passcode's salt and hash, the named teachers,
 *               the build id and the title filled. Written to DESIGN/deploy/Code.gs (mode 600). Never committed.
 *   Index.html  PUBLIC. style.css (fonts as data URIs), index.html's body, the boot scriptlet, window.CONTENT (every
 *               content/** /*.json), then strings.js, app.js, engine.js, staff.js (+ sit.js) inlined, then App.boot().
 *               Written to DESIGN/deploy/Index.html beside Code.gs, appsscript.json and BUILD.txt.
 *
 * Both files are pure ASCII (\uXXXX in JS, &#N; in HTML, CSS's own escape in <style>); Apps Script templating breaks on a
 * stray <? or ?>, and an inlined </script would end the block early: guards refuse all three. The leak guard refuses a page
 * that holds any bank key text, the judge, the staff salt, hash or passcode, or a named teacher's address.
 * The staff passcode is made once: plain text to DESIGN/STAFF_PASSCODE.txt (mode 600), salt and hash to DESIGN/deploy/staff.json.
 * Env: SOC_DESIGN (design folder), SOC_DEPLOY (output folder, default DESIGN/deploy), SOC_PLATFORM (page folder, default
 * platform/; the gates point it at a stand-in while the front end is unfinished). Missing page files skip Index.html only.
 * Run: node tools/build-server.js      (from sociology/mastering-socialisation)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const L = require('./lib.js');

const { REPO, DESIGN, DEPLOY, STAFF_DIR, PLATFORM } = L;
const SERVER = path.join(REPO, 'server');
const OWNER_EMAIL = 'dgartland021@c2ken.net';
const TITLE = 'OLS Sociology — Mastering Socialisation';
const fail = (m) => { console.error('build-server: ' + m); process.exit(1); };
const need = (p) => { if (!fs.existsSync(p)) fail('missing: ' + p); return fs.readFileSync(p, 'utf8'); };
const jsBlock = (s) => L.asciiJs(s).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
function guardAscii(name, text) {
  const m = text.match(/[^\x00-\x7f]/);
  if (m) fail(name + ': non-ASCII U+' + m[0].charCodeAt(0).toString(16) + ' at line ' + text.slice(0, text.indexOf(m[0])).split('\n').length);
}
function guardScriptlets(name, text) {
  let clean = text; L.SCRIPTLETS.forEach((s) => { clean = clean.split(s).join(''); });
  const n = (clean.match(/<\?/g) || []).length + (clean.match(/\?>/g) || []).length;
  if (n) fail(name + ': ' + n + ' stray <? or ?>');
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---- private files made once: the staff passcode and the teachers list
fs.mkdirSync(STAFF_DIR, { recursive: true, mode: 0o700 });
fs.mkdirSync(DEPLOY, { recursive: true, mode: 0o700 });
const STAFF_JSON = path.join(STAFF_DIR, 'staff.json');
const PASS_TXT = path.join(DESIGN, 'STAFF_PASSCODE.txt');
if (!fs.existsSync(STAFF_JSON)) {
  const words = ['norms', 'values', 'roles', 'status', 'culture', 'custom', 'belief', 'sanction', 'peers', 'agents', 'identity', 'ritual'];
  const pick = () => words[crypto.randomInt(words.length)];
  const pass = pick() + '-' + pick() + '-' + String(crypto.randomInt(10, 99));
  const salt = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(STAFF_JSON, JSON.stringify({ salt, hash: sha(salt + pass) }) + '\n', { mode: 0o600 });
  fs.writeFileSync(PASS_TXT, TITLE + ' - staff passcode (the staff page at the bare /exec link)\n\n' + pass + '\n\n' +
    'Class owners, named teachers (TEACHERS.txt) and heads of department are let in by their school email and never need it.\n' +
    'A Script Property "staffPasscode" in the Apps Script project replaces this passcode without a rebuild.\n', { mode: 0o600 });
  console.log('made the staff passcode -> ' + PASS_TXT);
}
const TEACHERS_TXT = path.join(DESIGN, 'TEACHERS.txt');
if (!fs.existsSync(TEACHERS_TXT)) { fs.writeFileSync(TEACHERS_TXT, '# one school address per line\n', { mode: 0o600 }); console.log('made ' + TEACHERS_TXT); }
const STAFF = JSON.parse(fs.readFileSync(STAFF_JSON, 'utf8'));
const TEACHERS = L.readTeachers(DESIGN);
const PASS = L.readPass(DESIGN);

// ---- inputs
let banks, content;
try { banks = L.readBanks(DESIGN).banks; content = L.readContent(REPO); } catch (e) { fail(e.message); }
const CARD_TERMS = L.cardTerms(content);
const judgeFiles = ['common.js', 'five.js', 'ten.js'].map((f) => [f, need(path.join(DESIGN, 'judge', f))]);
if (!/var JudgeCommon\b/.test(judgeFiles[0][1]) || !/var JudgeFive\b/.test(judgeFiles[1][1]) || !/var JudgeTen\b/.test(judgeFiles[2][1])) fail('a judge file lost its global (JudgeCommon / JudgeFive / JudgeTen)');
const tpl = need(path.join(SERVER, 'Code.gs.template'));

// ---- the page (its hash is part of the build id)
const missing = L.PAGE_FILES.filter((f) => !fs.existsSync(path.join(PLATFORM, f)));
const pageReady = !missing.length;
const rd = (f) => fs.readFileSync(path.join(PLATFORM, f), 'utf8');
const fontFiles = [];
const fontPath = (f) => [path.join(PLATFORM, 'fonts', f), path.join(REPO, 'platform', 'fonts', f)].find((p) => fs.existsSync(p));
const style = pageReady ? rd('style.css').replace(/url\(["']?fonts\/([\w.-]+\.woff2)["']?\)/g, (_, f) => {
  const p = fontPath(f); if (!p) fail('style.css: font not found: ' + f);
  const b = fs.readFileSync(p); fontFiles.push(f + ' ' + (b.length / 1024).toFixed(1) + ' KB');
  return 'url(data:font/woff2;base64,' + b.toString('base64') + ')';
}) : '';
const index = pageReady ? rd('index.html') : '';
const scriptNames = L.SCRIPT_NAMES.concat(fs.existsSync(path.join(PLATFORM, 'sit.js')) ? ['sit.js'] : []);
const scripts = pageReady ? scriptNames.map((n) => [n, rd(n)]) : [];
const contentJson = JSON.stringify(content);
const pageHash = sha(style + index + scripts.map((s) => s[1]).join('\n') + contentJson).slice(0, 8);

// ---- Code.gs
const banksJson = JSON.stringify(banks);
const BUILD = sha(banksJson + judgeFiles.map((j) => j[1]).join('\n') + tpl + JSON.stringify(CARD_TERMS)).slice(0, 10) + '-' + pageHash;
const fill = { OWNER_EMAIL, STAFF_SALT: STAFF.salt, STAFF_HASH: STAFF.hash, BUILD, TITLE, TEACHERS };
let filled = tpl;
for (const [k, v] of Object.entries(fill)) {
  const ph = "'@@" + k + "@@'";
  if (filled.split(ph).length !== 2) fail('Code.gs.template: placeholder ' + ph + ' must appear exactly once');
  filled = filled.replace(ph, () => JSON.stringify(v));
}
if (/@@[A-Z_]+@@/.test(filled)) fail('Code.gs.template: unfilled placeholder ' + filled.match(/@@[A-Z_]+@@/)[0]);
const code = L.asciiJs(['/* ' + TITLE + ' - Code.gs - build ' + BUILD + ' - PRIVATE: holds the banks, the judge and the mark schemes. Never commit. */']
  .concat(judgeFiles.map(([f, s]) => '/* ---- judge/' + f + ' ---- */\n' + s.trim()))
  .concat(['/* ---- banks (' + Object.keys(banks).length + ') ---- */\nvar BANKS = ' + banksJson + ';', 'var CARD_TERMS = ' + JSON.stringify(CARD_TERMS) + ';', filled]).join('\n\n'));
guardAscii('Code.gs', code);
try { new vm.Script(code, { filename: 'Code.gs' }); } catch (e) { fail('Code.gs does not parse: ' + e.message); }
fs.writeFileSync(path.join(DEPLOY, 'Code.gs'), code, { mode: 0o600 });
fs.chmodSync(path.join(DEPLOY, 'Code.gs'), 0o600);
fs.copyFileSync(path.join(SERVER, 'appsscript.json'), path.join(DEPLOY, 'appsscript.json'));
fs.writeFileSync(path.join(DEPLOY, 'BUILD.txt'), BUILD + '\n');
console.log('Code.gs    ' + (code.length / 1024).toFixed(1) + ' KB (private, ' + Object.keys(banks).length + ' banks) -> ' + path.join(DEPLOY, 'Code.gs'));
if (!pageReady) { console.log('SKIP Index.html - page files not written yet in ' + PLATFORM + ': ' + missing.join(', ') + ' · build ' + BUILD); process.exit(0); }

// ---- Index.html
const bodyOpen = (index.match(/<body[^>]*>/) || [])[0];
let body = bodyOpen ? index.slice(index.indexOf(bodyOpen) + bodyOpen.length) : index;
const endAt = body.lastIndexOf('</body>');
body = body.slice(0, endAt > -1 ? endAt : body.length).replace(/<script[\s\S]*?<\/script>/gi, '');
const TOKEN = 'soc-' + BUILD;
const boot = '<script>window.SOCBOOT = { cls: "<?= classCode ?>", base: "<?= baseUrl ?>", sit: "<?= sit ?>", sb: "<?= showBuild ?>", build: ' + JSON.stringify(TOKEN) + ', img: ' + JSON.stringify(L.IMG_URL) + ' };</script>';
const contentBlock = '<script>window.CONTENT = ' + jsBlock(contentJson) + ';</script>';
const frags = [boot, contentBlock].concat(scripts.map(([n, s]) => { const b = jsBlock(s); if (/<\/script/i.test(b)) fail(n + ': </script left'); return '<script>\n' + b + '\n</script>'; }))
  .concat(["<script>window.addEventListener('DOMContentLoaded', function () { App.boot(); });</script>"]);
const out = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base target="_top">
<title>${L.asciiHtml(TITLE)}</title>
<style>
${L.asciiCss(style)}
</style>
</head>
<body data-build="${TOKEN}">
${frags[0]}
${L.asciiHtml(body.trim())}
${frags.slice(1).join('\n')}
</body>
</html>
`;
guardScriptlets('Index.html', out);
guardAscii('Index.html', out);
const closes = (out.match(/<\/script>/gi) || []).length, opens = (out.match(/<script\b/gi) || []).length;
if (closes !== frags.length || opens !== frags.length) fail('Index.html: ' + opens + ' <script> and ' + closes + ' </script> for ' + frags.length + ' blocks');
L.SCRIPTLETS.forEach((s) => { if (out.split(s).length !== 2) fail('Index.html: scriptlet ' + s + ' must appear exactly once'); });
// the public page must never carry a bank key, the judge or a staff secret
const LL = L.leakList({ banks, content, staff: STAFF, pass: PASS, teachers: TEACHERS });
const hits = L.findLeaks(out, LL);
if (hits.length) fail('Index.html: leak guard tripped ' + hits.length + 'x, first ' + JSON.stringify(hits[0].what) + ' from ' + hits[0].from);
fs.writeFileSync(path.join(DEPLOY, 'Index.html'), out);
if (fontFiles.length) console.log('fonts      ' + fontFiles.join(', ') + ' (inlined)');
console.log('leak guard ' + LL.guarded.size + ' bank strings + ' + LL.fixed.length + ' fixed + ' + LL.secrets.length + ' secrets clear (' + LL.exempt.size + ' bank strings also public in content/, exempt)');
console.log('Index.html ' + (out.length / 1024).toFixed(1) + ' KB, ' + closes + ' script blocks, page from ' + PLATFORM + ' -> ' + path.join(DEPLOY, 'Index.html'));
console.log('build ' + BUILD + ' · ground-truth token ' + TOKEN);
