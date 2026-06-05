#!/usr/bin/env node
/* ============================================================
   Assemble the Path B HtmlService page for the US Constitution class board.
   ------------------------------------------------------------
   The activity is authored ONCE as the normal github.io build (../index.html,
   ../style.css, ../script.js, ../qrcode.min.js). This script bundles it into a
   single self-contained page that Apps Script serves (same-origin with the data).

   Run after ANY change to the activity:   node server/build-pathb.js
   Then paste the generated server/Index.html into the Apps Script "Index" file
   (and server/Code.gs into Code.gs), and deploy a new version.

   What it does:
     - inlines the shared + activity CSS, the body markup, the QR library,
       the google.script.run transport shim, and script.js;
     - injects window.OLS_BOOT (classCode + the real /exec URL) via a template
       scriptlet, because the sandboxed iframe can't read its own URL/params;
     - rewrites relative asset paths (the crest) to absolute github.io URLs;
     - drops the intro loader.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const SERVER = __dirname;
const ACT = path.join(SERVER, '..');                 // the activity folder
const ROOT = path.join(SERVER, '..', '..', '..');    // repo root (shared style.css)
const OUT = path.join(SERVER, 'Index.html');
const GH = 'https://dgaj-g.github.io/ols-digital-skills';

const indexHtml = fs.readFileSync(path.join(ACT, 'index.html'), 'utf8');
const sharedCss = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const actCss = fs.readFileSync(path.join(ACT, 'style.css'), 'utf8');
const scriptJs = fs.readFileSync(path.join(ACT, 'script.js'), 'utf8');
const qrcodeJs = fs.readFileSync(path.join(ACT, 'qrcode.min.js'), 'utf8');

// --- body markup: everything between <body ...> and the trailing <script> tags ---
const bodyOpen = indexHtml.match(/<body[^>]*>/);
let body = indexHtml.slice(indexHtml.indexOf(bodyOpen[0]) + bodyOpen[0].length);
body = body.slice(0, body.indexOf('<script src="qrcode.min.js">'));
body = body.replace(/\.\.\/\.\.\/assets\//g, GH + '/assets/');   // crest etc. -> absolute

// --- google.script.run transport shim (same-origin, carries the verified sign-in) ---
const shim = `
  window.OLS_TRANSPORT = {
    call: function (p) {
      return new Promise(function (resolve, reject) {
        var g = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
        switch (p.action) {
          case 'whoami': g.apiWhoAmI(); break;
          case 'load':   g.apiLoad({ classCode: p['class'], year: p.year }); break;
          case 'save':   g.apiSave({ classCode: p['class'], year: p.year, nodeId: p.nodeId, fieldKey: p.fieldKey, text: p.text, c: p.c, name: p.name }); break;
          case 'myname': g.apiMyName({ set: (typeof p.set !== 'undefined' ? p.set : null) }); break;
          case 'admin':  g.apiAdmin({ passcode: p.passcode, sub: p.sub, name: p.name, classCode: p['class'] }); break;
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
<title>The US Constitution Diagram</title>
<style>
/* ===== shared style.css ===== */
${sharedCss}
/* ===== activity style.css ===== */
${actCss}
</style>
</head>
${bodyOpen[0]}
<script>window.OLS_BOOT = { classCode: "<?= classCode ?>", baseUrl: "<?= baseUrl ?>" };</script>
${body}
<script>
${qrcodeJs}
</script>
<script>
${shim}
</script>
<script>
${scriptJs}
</script>
</body>
</html>
`;

// sanity: Apps Script templating breaks on stray <? or ?>
const stray = (out.match(/<\?(?!=)/g) || []).length + (out.replace(/<\?=[^>]*\?>/g, '').match(/\?>/g) || []).length;
if (stray) { console.error('ERROR: ' + stray + ' stray <? or ?> would break templating'); process.exit(1); }

fs.writeFileSync(OUT, out);
console.log('Wrote', OUT, '(' + (out.length / 1024).toFixed(1) + ' KB)');
