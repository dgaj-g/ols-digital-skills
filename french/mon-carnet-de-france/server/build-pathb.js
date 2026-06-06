#!/usr/bin/env node
/* ============================================================
   Assemble the Path B deploy files for Mon Carnet de France.
   ------------------------------------------------------------
   The activity is authored ONCE as the normal github.io build (../index.html,
   ../style.css, ../script.js, ../qrcode.min.js + the shared ../../../style.css).
   This produces the two files for the Google Apps Script project:

     - Code.gs    : the server (../server/Code.gs.template, already ASCII)
     - Index.html : the activity page Apps Script serves (shared+activity CSS,
                    body markup, the OLS intro loader pointed at github.io video,
                    the google.script.run transport shim, qrcode, script.js)

   Both outputs are emitted as PURE ASCII (every non-ASCII char escaped to a
   browser-safe form: \uXXXX in JS, &#NNN; in HTML), with a guard that refuses
   to write a file still containing a raw non-ASCII byte. This immunises the
   files against charset corruption when pasted into the Apps Script editor.

   Run after ANY change:  node server/build-pathb.js
   Then paste server/Code.gs and server/Index.html into the Apps Script project
   and deploy a new VERSION of the same deployment.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const SERVER = __dirname;
const ACT = path.join(SERVER, '..');
const ROOT = path.join(SERVER, '..', '..', '..');           // repo root (shared style.css, assets)
const GH = 'https://dgaj-g.github.io/ols-digital-skills';

const indexHtml = fs.readFileSync(path.join(ACT, 'index.html'), 'utf8');
const sharedCss = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const actCss    = fs.readFileSync(path.join(ACT, 'style.css'), 'utf8');
const scriptJs  = fs.readFileSync(path.join(ACT, 'script.js'), 'utf8');
const qrcodeJs  = fs.readFileSync(path.join(ACT, 'qrcode.min.js'), 'utf8');
const introJsRaw = fs.readFileSync(path.join(ROOT, 'assets', 'intro-loader.js'), 'utf8');
const codeTemplate = fs.readFileSync(path.join(SERVER, 'Code.gs.template'), 'utf8');

/* ---- ASCII-escaping helpers ---- */
function asciiJs(s) {
  return s.replace(/[\u0080-\uffff]/g, function (c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}
function asciiHtml(s) {
  return s.replace(/[\u0080-\u{10ffff}]/gu, function (c) {
    return '&#' + c.codePointAt(0) + ';';
  });
}
// Inline-safe JS: ASCII-escape AND neutralise any literal </script that would
// prematurely close the host <script> element (e.g. the intro-loader doc-comment
// that shows "<script src=...></script>"). A backslash before the slash is
// invalid HTML end-tag syntax but harmless inside a JS string/comment/regex.
function jsBlock(s) { return asciiJs(s).replace(/<\/script/gi, '<\\/script'); }
function guardAscii(name, text) {
  const m = text.match(/[^\x00-\x7f]/);
  if (m) {
    const i = text.indexOf(m[0]);
    const line = text.slice(0, i).split('\n').length;
    console.error('ERROR: ' + name + ' still has a non-ASCII char U+' + m[0].charCodeAt(0).toString(16) + ' at line ' + line);
    process.exit(1);
  }
}

/* ---- 1. Code.gs (template is already ASCII; guard + copy) ---- */
guardAscii('Code.gs', codeTemplate);
fs.writeFileSync(path.join(SERVER, 'Code.gs'), codeTemplate);

/* ---- 2. body markup: between <body ...> and the first <script ...> ---- */
const bodyOpen = indexHtml.match(/<body[^>]*>/)[0];
let body = indexHtml.slice(indexHtml.indexOf(bodyOpen) + bodyOpen.length);
body = body.slice(0, body.indexOf('<script src="qrcode.min.js">'));
body = body.replace(/\.\.\/\.\.\/assets\//g, GH + '/assets/');   // crest -> absolute github.io

/* ---- 3. intro loader: inline, but resolve videos from absolute github.io ---- */
/* When inlined there is no document.currentScript.src, so force the asset base. */
let introJs = introJsRaw.replace(
  /const here = document\.currentScript[^;]*;\s*const baseUrl = here\.replace\([^;]*\);/,
  "const baseUrl = '" + GH + "/assets/';"
);
if (introJs === introJsRaw) {
  console.error('ERROR: could not rewrite intro-loader baseUrl (the source changed) - fix build-pathb.js');
  process.exit(1);
}

/* ---- 4. transport shim (same-origin google.script.run, carries the sign-in) ---- */
const shim = `
window.OLS_TRANSPORT = {
  call: function (p) {
    return new Promise(function (resolve, reject) {
      var g = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      switch (p.action) {
        case 'whoami':  g.apiWhoAmI(); break;
        case 'load':    g.apiLoad({ classCode: p['class'] }); break;
        case 'save':    g.apiSave({ classCode: p['class'], name: p.name, stations: p.stations }); break;
        case 'makeDoc': g.apiMakeDoc({ classCode: p['class'] }); break;
        case 'admin':   g.apiAdmin({ passcode: p.passcode, sub: p.sub, classCode: p['class'] }); break;
        default: reject(new Error('unknown action ' + p.action));
      }
    });
  }
};`;

/* inline-safe JS chunks (ASCII-escaped + any literal </script neutralised) */
const qrcodeBlock = jsBlock(qrcodeJs);
const shimBlock   = jsBlock(shim);
const scriptBlock = jsBlock(scriptJs);
const introBlock  = jsBlock(introJs);
[['qrcode.min.js', qrcodeBlock], ['shim', shimBlock], ['script.js', scriptBlock], ['intro-loader', introBlock]].forEach(function (p) {
  if (/<\/script/i.test(p[1])) { console.error('ERROR: ' + p[0] + ' still contains a raw </script after neutralisation'); process.exit(1); }
});

const out = `<!doctype html>
<html lang="en">
<head>
<base target="_top">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mon Carnet de France</title>
<style>
/* ===== shared style.css ===== */
${sharedCss}
/* ===== activity style.css ===== */
${actCss}
</style>
</head>
${bodyOpen}
<script>window.OLS_BOOT = { classCode: "<?= classCode ?>", baseUrl: "<?= baseUrl ?>" };</script>
${asciiHtml(body)}
<script>
${qrcodeBlock}
</script>
<script>
${shimBlock}
</script>
<script>
${scriptBlock}
</script>
<script>
${introBlock}
</script>
</body>
</html>
`;

/* Apps Script templating breaks on stray <? or ?> outside the one scriptlet. */
const stray = (out.match(/<\?(?!=)/g) || []).length + (out.replace(/<\?=[^>]*\?>/g, '').match(/\?>/g) || []).length;
if (stray) { console.error('ERROR: ' + stray + ' stray <? or ?> would break Apps Script templating'); process.exit(1); }
// Exactly the 5 intentional script blocks should close (OLS_BOOT + qrcode + shim + script.js + intro).
const sClose = (out.match(/<\/script>/gi) || []).length;
if (sClose !== 5) { console.error('ERROR: expected 5 </script> closers, found ' + sClose + ' (a literal </script> may have leaked into inlined JS)'); process.exit(1); }
guardAscii('Index.html', out);

fs.writeFileSync(path.join(SERVER, 'Index.html'), out);
console.log('Wrote server/Code.gs   (' + (codeTemplate.length / 1024).toFixed(1) + ' KB) - pure ASCII');
console.log('Wrote server/Index.html (' + (out.length / 1024).toFixed(1) + ' KB) - pure ASCII');
