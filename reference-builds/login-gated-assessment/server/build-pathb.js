#!/usr/bin/env node
/* ============================================================
   Assemble the Path B deploy files for the Login-gated assessment engine (reference)
   Computational Thinking Challenge.
   ------------------------------------------------------------
   The activity is authored ONCE as the normal build in ../challenge
   (index.html, style.css, script.js, questions.js). This script produces
   the two files that go into the Google Apps Script project:

     - Code.gs    : the server (Code.gs.template + the question bank, WITH answers)
     - Index.html : the activity page Apps Script serves (style + body + the
                    google.script.run transport shim + script.js). It does NOT
                    include questions.js, so the answer key never reaches the
                    browser; questions arrive sanitised from the server.

   IMPORTANT: both output files are emitted as PURE ASCII. Every non-ASCII
   character (curly quotes, em-dashes, accented Irish names, emoji) is written
   as a safe escape -- \uXXXX inside JavaScript, &#NNN; inside HTML -- which the
   browser turns back into the real character. This makes the files immune to
   the charset corruption that can happen when large files are pasted into the
   Apps Script editor and served by HtmlService. A guard refuses to write a file
   that still contains a raw non-ASCII byte.

   Run after ANY change to the activity or questions:  node build-pathb.js
   Then paste Code.gs and Index.html into the Apps Script project and deploy a
   new version.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const SERVER = __dirname;
const ACT = path.join(SERVER, '..', 'challenge');

const indexHtml = fs.readFileSync(path.join(ACT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ACT, 'style.css'), 'utf8');
const scriptJs = fs.readFileSync(path.join(ACT, 'script.js'), 'utf8');
const qrcodeJs = fs.readFileSync(path.join(ACT, 'qrcode.min.js'), 'utf8');
const questionsJs = fs.readFileSync(path.join(ACT, 'questions.js'), 'utf8');
const template = fs.readFileSync(path.join(SERVER, 'Code.gs.template'), 'utf8');

/* ---- ASCII-escaping helpers ---- */
// JS context: escape every UTF-16 code unit >= 0x80 as \uXXXX (handles surrogate
// pairs / emoji correctly -- two \u escapes rebuild the astral character).
function asciiJs(s) { return s.replace(/[-￿]/g, function (c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); }); }
// HTML context: escape every code POINT >= 0x80 as a numeric entity.
function asciiHtml(s) { return s.replace(/[-\u{10ffff}]/gu, function (c) { return '&#' + c.codePointAt(0) + ';'; }); }
function guardAscii(name, text) {
  const m = text.match(/[^\x00-\x7f]/);
  if (m) { const i = text.indexOf(m[0]); const line = text.slice(0, i).split('\n').length; console.error('ERROR: ' + name + ' still has a non-ASCII char U+' + m[0].charCodeAt(0).toString(16) + ' at line ' + line); process.exit(1); }
}

/* ---- 1. extract the full question bank from questions.js ---- */
const sandbox = { window: {} };
// eslint-disable-next-line no-new-func
new Function('window', questionsJs)(sandbox.window);
const bank = sandbox.window.GG_QUESTIONS;
if (!Array.isArray(bank) || !bank.length) { console.error('ERROR: could not read GG_QUESTIONS from questions.js'); process.exit(1); }

/* ---- 2. Code.gs = template (already ASCII) + the bank, escaped to ASCII ---- */
const codeGs = template.replace('/*__QUESTION_BANK__*/[]', asciiJs(JSON.stringify(bank)));
guardAscii('Code.gs', codeGs);
fs.writeFileSync(path.join(SERVER, 'Code.gs'), codeGs);

/* ---- 3. Index.html = inlined page (ASCII), NO questions.js ---- */
const bodyOpen = indexHtml.match(/<body[^>]*>/)[0];
let body = indexHtml.slice(indexHtml.indexOf(bodyOpen) + bodyOpen.length);
body = body.slice(0, body.indexOf('<script src="qrcode.min.js">'));   // up to the scripts (footer included); questions.js is NOT shipped

const shim = `
window.GG_TRANSPORT = {
  call: function (p) {
    return new Promise(function (resolve, reject) {
      var g = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      switch (p.action) {
        case 'whoami':      g.apiWhoAmI(); break;
        case 'resume':      g.apiResume({ classCode: p.classCode }); break;
        case 'start':       g.apiStart({ classCode: p.classCode, firstName: p.firstName, surname: p.surname }); break;
        case 'answer':      g.apiAnswer({ classCode: p.classCode, questionId: p.questionId, optionId: p.optionId }); break;
        case 'finish':      g.apiFinish({ classCode: p.classCode }); break;
        case 'leaderboard': g.apiLeaderboard({ classCode: p.classCode }); break;
        case 'admin':       g.apiAdmin({ passcode: p.passcode, sub: p.sub, className: p.className, year: p.year }); break;
        default: reject(new Error('unknown action ' + p.action));
      }
    });
  }
};`;

const out = `<!doctype html>
<html lang="en">
<head>
<base target="_top">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>the reference engine &mdash; Computational Thinking Challenge</title>
<style>
${css}
</style>
</head>
${bodyOpen}
<script>window.GG_BOOT = { classCode: "<?= classCode ?>", baseUrl: "<?= baseUrl ?>" };</script>
${asciiHtml(body)}
<script>
${asciiJs(qrcodeJs)}
</script>
<script>
${asciiJs(shim)}
</script>
<script>
${asciiJs(scriptJs)}
</script>
</body>
</html>
`;

// Apps Script templating breaks on stray <? or ?> outside the one scriptlet we control.
const stray = (out.match(/<\?(?!=)/g) || []).length + (out.replace(/<\?=[^>]*\?>/g, '').match(/\?>/g) || []).length;
if (stray) { console.error('ERROR: ' + stray + ' stray <? or ?> would break Apps Script templating'); process.exit(1); }
guardAscii('Index.html', out);

fs.writeFileSync(path.join(SERVER, 'Index.html'), out);

console.log('Wrote Code.gs   (' + (codeGs.length / 1024).toFixed(1) + ' KB, ' + bank.length + ' questions) -- pure ASCII');
console.log('Wrote Index.html (' + (out.length / 1024).toFixed(1) + ' KB) -- pure ASCII');
