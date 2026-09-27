#!/usr/bin/env node
/* tools/build-server.js — assemble the two Apps Script files (D54, D75).
 *
 *   Code.gs     PRIVATE. A2PRIVATE (deploy/private.js) + A2META (public facts from content.js) + the judge
 *               (src/judge: schema, judge, markpoints, twinpoints; the UMD root becomes globalThis) + server/Code.gs.template
 *               with the owner email, the staff passcode's salt and hash, the build id and the title filled.
 *               Written to "Claude Work/A2 SSD Platform/deploy/Code.gs" (mode 600). Never committed.
 *   Index.html  PUBLIC. style.css inlined, index.html's body, the boot scriptlet, the transport shim, then
 *               content.js, lessonview.js, tsql2sqlite.js, editor.js, lesson.js, app.js, staff.js inlined, then App.boot().
 *               Written to a2-ssd/server/Index.html. Only the sql.js wasm loads from outside (cdnjs, github.io fallback).
 *
 * Both files are pure ASCII (\uXXXX in JS, &#N; in HTML, CSS's own escape in <style>); Apps Script templating
 * breaks on a stray <? or ?>, and an inlined </script would end the block early: guards refuse all three.
 * The staff passcode is made once: plain text to "Claude Work/A2 SSD Platform/STAFF_PASSCODE.txt" (mode 600),
 * salt and hash to deploy/staff.json (mode 600). Run: node a2-ssd/tools/build-server.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const A2 = path.join(__dirname, '..');
const PLATFORM = path.join(A2, 'platform');
const SERVER = path.join(A2, 'server');
const DESIGN = process.env.A2SSD_DESIGN || '/Users/damiengartland/Desktop/Claude Work/A2 SSD Platform';
const DEPLOY = path.join(DESIGN, 'deploy');
const JUDGE = path.join(DESIGN, 'src', 'judge');
const OWNER_EMAIL = 'dgartland021@c2ken.net';
const GH = 'https://dgaj-g.github.io/ols-digital-skills/a2-ssd/platform/vendor/';
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/';

const need = (p) => { if (!fs.existsSync(p)) { console.error('missing: ' + p); process.exit(1); } return fs.readFileSync(p, 'utf8'); };

// ---- ASCII helpers (as ks3-dt/platform/server/build-pathb.js)
const asciiJs = (s) => s.replace(/[\u0080-￿]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
const asciiHtml = (s) => s.replace(/[\u0080-\u{10ffff}]/gu, (c) => '&#' + c.codePointAt(0) + ';');
const asciiCss = (s) => s.replace(/[\u0080-￿]/g, (c) => '\\' + c.charCodeAt(0).toString(16) + ' ');
const jsBlock = (s) => asciiJs(s).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
function guardAscii(name, text) {
  const m = text.match(/[^\x00-\x7f]/);
  if (m) { console.error(name + ': non-ASCII U+' + m[0].charCodeAt(0).toString(16) + ' at line ' + text.slice(0, text.indexOf(m[0])).split('\n').length); process.exit(1); }
}
function guardScriptlets(name, text) {
  const clean = text.replace(/<\?= classCode \?>/g, '').replace(/<\?= baseUrl \?>/g, '');
  const n = (clean.match(/<\?/g) || []).length + (clean.match(/\?>/g) || []).length;
  if (n) { console.error(name + ': ' + n + ' stray <? or ?>'); process.exit(1); }
}

// ---- content facts the server needs (public)
global.window = {};
require(path.join(PLATFORM, 'content.js'));
const C = global.window.A2CONTENT;
const papers = {};
C.papers.forEach((p) => { papers[p.id] = { id: p.id, year: p.year, marks: p.marks, parts: p.parts.map((q) => ({ id: q.id, marks: q.marks, kind: q.kind, type: q.type, cluster: q.cluster })) }; });
const clusterTwins = {};
Object.entries(C.clusters.clusters).forEach(([k, v]) => { clusterTwins[k] = v.twins; });
const META = { papers, order: C.papers.map((p) => p.id), twinOrder: C.clusters.order, clusterTwins };

// ---- staff passcode (made once)
const STAFF_JSON = path.join(DEPLOY, 'staff.json');
const PASS_TXT = path.join(DESIGN, 'STAFF_PASSCODE.txt');
if (!fs.existsSync(STAFF_JSON)) {
  const words = ['query', 'table', 'field', 'index', 'join', 'select', 'insert', 'update', 'schema', 'column', 'record', 'having'];
  const pick = () => words[crypto.randomInt(words.length)];
  const pass = pick() + '-' + pick() + '-' + String(crypto.randomInt(1000, 9999));
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + pass, 'utf8').digest('hex');
  fs.writeFileSync(STAFF_JSON, JSON.stringify({ salt, hash }) + '\n', { mode: 0o600 });
  fs.writeFileSync(PASS_TXT, 'OLS A2 SSD Platform - staff passcode (the staff page at the bare /exec link)\n\n' + pass + '\n\nClass owners and heads of department are let in by their school email and never need it.\nA Script Property "staffPasscode" in the Apps Script project overrides it.\n', { mode: 0o600 });
  console.log('made the staff passcode -> ' + PASS_TXT);
}
const STAFF = JSON.parse(fs.readFileSync(STAFF_JSON, 'utf8'));

// ---- the public page first (its hash is part of the build id)
const index = need(path.join(PLATFORM, 'index.html'));
const style = need(path.join(PLATFORM, 'style.css'));
const scripts = [
  ['content.js', path.join(PLATFORM, 'content.js')],
  ['lessonview.js', path.join(PLATFORM, 'lessonview.js')],
  ['tsql2sqlite.js', path.join(A2, 'tools', 'tsql2sqlite.js')],
  ['editor.js', path.join(PLATFORM, 'editor.js')],
  ['lesson.js', path.join(PLATFORM, 'lesson.js')],
  ['app.js', path.join(PLATFORM, 'app.js')],
  ['staff.js', path.join(PLATFORM, 'staff.js')],
].map(([n, p]) => [n, need(p)]);

const APIS = ['apiBoot', 'apiName', 'apiState', 'apiMark', 'apiAnswer', 'apiTwin', 'apiTwinMark', 'apiFlag', 'apiEval', 'apiPing', 'apiKv', 'apiStaff'];
const shim = `window.OLS_TRANSPORT = {
  call: function (fn, req) {
    return new Promise(function (resolve, reject) {
      if (${JSON.stringify(APIS)}.indexOf(fn) === -1) { reject(new Error('unknown call ' + fn)); return; }
      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn](req || {});
    });
  }
};`;

const hashOf = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const pageHash = hashOf(style + index + scripts.map((s) => s[1]).join('\n'));
const tpl = need(path.join(SERVER, 'Code.gs.template'));
const judgeSrc = ['schema.js', 'judge.js', 'markpoints.js', 'twinpoints.js'].map((f) => {
  const s = need(path.join(JUDGE, f));
  const n = (s.match(/typeof self !== 'undefined' \? self : this/g) || []).length;
  if (n !== 1) { console.error(f + ': expected one UMD root, found ' + n); process.exit(1); }
  if (/\?\.|\?\?|replaceAll/.test(s.replace(/\/[^/\n]*\/[gimsuy]*/g, ''))) console.warn('note: ' + f + ' may use ?. ?? or replaceAll');
  return '/* ---- ' + f + ' ---- */\n' + s.replace("typeof self !== 'undefined' ? self : this", 'globalThis');
}).join('\n');
const priv = need(path.join(DEPLOY, 'private.js'));
if (!/^\/\*[^]*?\*\/\s*var A2PRIVATE = /.test(priv)) { console.error('deploy/private.js is not the A2PRIVATE file'); process.exit(1); }
const serverHash = hashOf(priv + judgeSrc + tpl);
const BUILD = C.BUILD + '-' + hashOf(pageHash + serverHash).slice(0, 8);

const filled = tpl.replace("'@@OWNER_EMAIL@@'", JSON.stringify(OWNER_EMAIL)).replace("'@@STAFF_SALT@@'", JSON.stringify(STAFF.salt))
  .replace("'@@STAFF_HASH@@'", JSON.stringify(STAFF.hash)).replace("'@@BUILD@@'", JSON.stringify(BUILD)).replace("'@@TITLE@@'", JSON.stringify(C.strings['app.title']));
if (/@@[A-Z_]+@@/.test(filled)) { console.error('Code.gs.template: unfilled placeholder ' + filled.match(/@@[A-Z_]+@@/)[0]); process.exit(1); }
const code = asciiJs(['/* OLS A2 SSD Platform - Code.gs - build ' + BUILD + ' - PRIVATE: holds the mark schemes. Never commit. */',
  priv.trim(), 'var A2META = ' + JSON.stringify(META) + ';', judgeSrc, filled].join('\n\n'));
guardAscii('Code.gs', code);
fs.writeFileSync(path.join(DEPLOY, 'Code.gs'), code, { mode: 0o600 });
fs.chmodSync(path.join(DEPLOY, 'Code.gs'), 0o600);
fs.copyFileSync(path.join(SERVER, 'appsscript.json'), path.join(DEPLOY, 'appsscript.json'));

// ---- assemble Index.html
const bodyOpen = (index.match(/<body[^>]*>/) || [])[0];
if (!bodyOpen) { console.error('index.html: no <body>'); process.exit(1); }
let body = index.slice(index.indexOf(bodyOpen) + bodyOpen.length);
body = body.slice(0, body.lastIndexOf('</body>') > -1 ? body.lastIndexOf('</body>') : body.length).replace(/<script[\s\S]*?<\/script>/gi, '');
const boot = '<script>window.OLS_BOOT = { classCode: "<?= classCode ?>", baseUrl: "<?= baseUrl ?>" };\n' +
  'window.A2_VENDOR = ' + JSON.stringify([CDN, GH]) + ';\nwindow.A2_DEPLOY = ' + JSON.stringify('a2ssd-' + BUILD) + ';</script>';
const frags = [boot, '<script>\n' + jsBlock(shim) + '\n</script>']
  .concat(scripts.map(([n, s]) => { const b = jsBlock(s); if (/<\/script/i.test(b)) { console.error(n + ': </script left'); process.exit(1); } return '<script>\n' + b + '\n</script>'; }))
  .concat(["<script>window.addEventListener('DOMContentLoaded', function () { App.boot(); });</script>"]);
const out = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base target="_top">
<title>${asciiHtml(C.strings['app.title'])}</title>
<style>
${asciiCss(style)}
</style>
</head>
${bodyOpen}
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
fs.writeFileSync(path.join(SERVER, 'Index.html'), out);
fs.writeFileSync(path.join(DEPLOY, 'BUILD.txt'), BUILD + '\n');
console.log('Code.gs    ' + (code.length / 1024).toFixed(1) + ' KB (private) -> ' + path.join(DEPLOY, 'Code.gs'));
console.log('Index.html ' + (out.length / 1024).toFixed(1) + ' KB, ' + closes + ' script blocks -> a2-ssd/server/Index.html');
console.log('build ' + BUILD + ' · ground-truth token a2ssd-' + BUILD);
