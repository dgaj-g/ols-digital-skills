#!/usr/bin/env node
/* tools/build-server.js — assemble the two Apps Script files (modelled on a2-ssd/tools/build-server.js).
 *
 *   Code.gs     PRIVATE. The bank (DESIGN/content/bank_digital_data.js) + the judge (DESIGN/judge/judge.js, read in place,
 *               never copied into this repo) + server/Code.gs.template with the owner email, the staff passcode's salt and
 *               hash, the build id and the title filled. Written to DESIGN/deploy/Code.gs (mode 600). Never committed.
 *   Index.html  PUBLIC. style.css inlined, index.html's body, the boot scriptlet, then strings.js, sitpolicy.js, app.js,
 *               staff.js, sit.js inlined, then App.boot(). Written to s1-unit1/server/Index.html.
 *
 * Both files are pure ASCII (\uXXXX in JS, &#N; in HTML, CSS's own escape in <style>); Apps Script templating breaks on a
 * stray <? or ?>, and an inlined </script would end the block early: guards refuse all three.
 * The staff passcode is made once: plain text to DESIGN/STAFF_PASSCODE.txt (mode 600), salt and hash to deploy/staff.json.
 * Run: node s1-unit1/tools/build-server.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PLATFORM = path.join(ROOT, 'platform');
const SERVER = path.join(ROOT, 'server');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const DEPLOY = path.join(DESIGN, 'deploy');
const BANK = path.join(DESIGN, 'content', 'bank_digital_data.js');
const JUDGE = path.join(DESIGN, 'judge', 'judge.js');
const OWNER_EMAIL = 'dgartland021@c2ken.net';
const TITLE = 'OLS Unit 1 Revision';

const need = (p) => { if (!fs.existsSync(p)) { console.error('missing: ' + p); process.exit(1); } return fs.readFileSync(p, 'utf8'); };
const asciiJs = (s) => s.replace(/[\u0080-￿]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
const asciiHtml = (s) => s.replace(/[\u0080-\u{10ffff}]/gu, (c) => '&#' + c.codePointAt(0) + ';');
const asciiCss = (s) => s.replace(/[\u0080-￿]/g, (c) => '\\' + c.charCodeAt(0).toString(16) + ' ');
const jsBlock = (s) => asciiJs(s).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
function guardAscii(name, text) {
  const m = text.match(/[^\x00-\x7f]/);
  if (m) { console.error(name + ': non-ASCII U+' + m[0].charCodeAt(0).toString(16) + ' at line ' + text.slice(0, text.indexOf(m[0])).split('\n').length); process.exit(1); }
}
function guardScriptlets(name, text) {
  const clean = text.replace(/<\?= classCode \?>/g, '').replace(/<\?= baseUrl \?>/g, '').replace(/<\?= sit \?>/g, '').replace(/<\?= showBuild \?>/g, '');
  const n = (clean.match(/<\?/g) || []).length + (clean.match(/\?>/g) || []).length;
  if (n) { console.error(name + ': ' + n + ' stray <? or ?>'); process.exit(1); }
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---- staff passcode (made once)
fs.mkdirSync(DEPLOY, { recursive: true, mode: 0o700 });
const STAFF_JSON = path.join(DEPLOY, 'staff.json');
const PASS_TXT = path.join(DESIGN, 'STAFF_PASSCODE.txt');
if (!fs.existsSync(STAFF_JSON)) {
  const words = ['binary', 'pixel', 'sample', 'vector', 'bitmap', 'nibble', 'denary', 'codec', 'lossy', 'stream', 'header', 'buffer'];
  const pick = () => words[crypto.randomInt(words.length)];
  const pass = pick() + '-' + pick() + '-' + String(crypto.randomInt(10, 99));
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = sha(salt + pass);
  fs.writeFileSync(STAFF_JSON, JSON.stringify({ salt, hash }) + '\n', { mode: 0o600 });
  fs.writeFileSync(PASS_TXT, 'OLS Unit 1 Revision - staff passcode (the staff page at the bare /exec link)\n\n' + pass + '\n\nClass owners and heads of department are let in by their school email and never need it.\nA Script Property "staffPasscode" in the Apps Script project overrides it.\n', { mode: 0o600 });
  console.log('made the staff passcode -> ' + PASS_TXT);
}
const STAFF = JSON.parse(fs.readFileSync(STAFF_JSON, 'utf8'));

// ---- the page (its hash is part of the build id)
const scriptNames = ['strings.js', 'sitpolicy.js', 'app.js', 'staff.js', 'sit.js'];
const pageReady = fs.existsSync(path.join(PLATFORM, 'index.html'));
const index = pageReady ? need(path.join(PLATFORM, 'index.html')) : '';
// fonts: each url("fonts/<file>.woff2") in style.css becomes a data URI, so the served page loads no outside file
const fontFiles = [];
const style = pageReady ? need(path.join(PLATFORM, 'style.css')).replace(/url\("fonts\/([\w.-]+\.woff2)"\)/g, (_, f) => {
  const b = fs.readFileSync(path.join(PLATFORM, 'fonts', f)); fontFiles.push(f + ' ' + (b.length / 1024).toFixed(1) + ' KB');
  return 'url(data:font/woff2;base64,' + b.toString('base64') + ')';
}) : '';
const scripts = pageReady ? scriptNames.map((n) => [n, need(path.join(PLATFORM, n))]) : [];
const pageHash = sha(style + index + scripts.map((s) => s[1]).join('\n')).slice(0, 8);

// ---- Code.gs
const bank = need(BANK), judge = need(JUDGE), tpl = need(path.join(SERVER, 'Code.gs.template'));
if (!/var BANK_DIGITAL_DATA = /.test(bank)) { console.error('bank file is not BANK_DIGITAL_DATA'); process.exit(1); }
if (!/root\.Judge = API/.test(judge)) { console.error('judge.js lost its UMD root'); process.exit(1); }
const BUILD = sha(bank + judge + tpl).slice(0, 10) + '-' + pageHash;
const filled = tpl.replace("'@@OWNER_EMAIL@@'", JSON.stringify(OWNER_EMAIL)).replace("'@@STAFF_SALT@@'", JSON.stringify(STAFF.salt))
  .replace("'@@STAFF_HASH@@'", JSON.stringify(STAFF.hash)).replace("'@@BUILD@@'", JSON.stringify(BUILD)).replace("'@@TITLE@@'", JSON.stringify(TITLE));
if (/@@[A-Z_]+@@/.test(filled)) { console.error('Code.gs.template: unfilled placeholder ' + filled.match(/@@[A-Z_]+@@/)[0]); process.exit(1); }
const code = asciiJs(['/* OLS Unit 1 Revision - Code.gs - build ' + BUILD + ' - PRIVATE: holds the bank and the mark schemes. Never commit. */',
  '/* ---- bank_digital_data.js ---- */\n' + bank.trim(), '/* ---- judge.js ---- */\n' + judge.trim(), filled].join('\n\n'));
guardAscii('Code.gs', code);
fs.writeFileSync(path.join(DEPLOY, 'Code.gs'), code, { mode: 0o600 });
fs.chmodSync(path.join(DEPLOY, 'Code.gs'), 0o600);
fs.copyFileSync(path.join(SERVER, 'appsscript.json'), path.join(DEPLOY, 'appsscript.json'));
fs.writeFileSync(path.join(DEPLOY, 'BUILD.txt'), BUILD + '\n');
console.log('Code.gs    ' + (code.length / 1024).toFixed(1) + ' KB (private) -> ' + path.join(DEPLOY, 'Code.gs'));
if (!pageReady) { console.log('platform/index.html not written yet: Index.html skipped · build ' + BUILD); process.exit(0); }

// ---- Index.html
const bodyOpen = (index.match(/<body[^>]*>/) || [])[0];
if (!bodyOpen) { console.error('index.html: no <body>'); process.exit(1); }
let body = index.slice(index.indexOf(bodyOpen) + bodyOpen.length);
body = body.slice(0, body.lastIndexOf('</body>') > -1 ? body.lastIndexOf('</body>') : body.length).replace(/<script[\s\S]*?<\/script>/gi, '');
const TOKEN = 's1u1-' + BUILD;
const boot = '<script>window.S1BOOT = { cls: "<?= classCode ?>", base: "<?= baseUrl ?>", sit: "<?= sit ?>", sb: "<?= showBuild ?>", build: ' + JSON.stringify(TOKEN) + ' };</script>';
const frags = [boot].concat(scripts.map(([n, s]) => { const b = jsBlock(s); if (/<\/script/i.test(b)) { console.error(n + ': </script left'); process.exit(1); } return '<script>\n' + b + '\n</script>'; }))
  .concat(["<script>window.addEventListener('DOMContentLoaded', function () { App.boot(); });</script>"]);
const out = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base target="_top">
<title>${TITLE}</title>
<style>
${asciiCss(style)}
</style>
</head>
<body data-build="${TOKEN}">
${frags[0]}
${asciiHtml(body.trim())}
${frags.slice(1).join('\n')}
</body>
</html>
`;
guardScriptlets('Index.html', out);
guardAscii('Index.html', out);
const closes = (out.match(/<\/script>/gi) || []).length;
if (closes !== frags.length) { console.error('Index.html: ' + closes + ' </script> for ' + frags.length + ' blocks'); process.exit(1); }
// the public page must never carry the bank or the judge
const leak = ['BANK_DIGITAL_DATA', 'markTyped', 'keys:', '"keys"', 'dis:', STAFF.hash, STAFF.salt].find((t) => out.indexOf(t) !== -1);
if (leak) { console.error('Index.html: leak guard tripped on ' + JSON.stringify(leak.slice(0, 12))); process.exit(1); }
fs.writeFileSync(path.join(SERVER, 'Index.html'), out);
if (fontFiles.length) console.log('fonts      ' + fontFiles.join(', ') + ' (inlined)');
console.log('Index.html ' + (out.length / 1024).toFixed(1) + ' KB, ' + closes + ' script blocks -> s1-unit1/server/Index.html');
console.log('build ' + BUILD + ' · ground-truth token ' + TOKEN);
