#!/usr/bin/env node
/* ============================================================
   Assemble the Path B deploy files for The Glass Jotter.
   ------------------------------------------------------------
   The platform is authored ONCE as the normal github.io build
   (../index.html, ../style.css, the module JS files, ../qrcode.min.js,
   plus the shared repo-root style.css and assets/fonts/fonts.css).
   This produces the two files for the Google Apps Script project:

     - Code.gs    : the server (Code.gs.template, verbatim, ASCII-guarded)
     - Index.html : the page Apps Script serves (shared + fonts + activity
                    CSS in one <style>, the body markup, the OLS_BOOT
                    scriptlet, qrcode, the google.script.run transport shim,
                    the nine module files in INTERFACES.md load order, and
                    the OLS intro loader pointed at absolute github.io URLs)

   Both outputs are emitted as PURE ASCII (non-ASCII escaped to a browser-
   safe form: \x5cuXXXX in JS, &#N; in HTML, \x5cHEX in CSS -- CSS gets its
   own escaper because <style> content is raw text, so HTML entities are
   NOT decoded there). A guard refuses to write a file that still contains
   a raw non-ASCII byte; this immunises the files against charset
   corruption when pasted into the Apps Script editor.

   URL rewrites (HTML attributes AND CSS url(), incl. fonts.css woff2):
     ../../assets/...  ->  https://dgaj-g.github.io/ols-digital-skills/assets/...
     assets/...        ->  .../ols-digital-skills/maths/glass-jotter/assets/...
   (CSS refs are resolved against each stylesheet's own canonical github.io
   location, so relative paths inside assets/fonts/fonts.css land correctly.)

   Run after ANY change:  node server/build-pathb.js
   Then paste server/Code.gs and server/Index.html into the Apps Script
   project and deploy a NEW VERSION of the same deployment (see DEPLOY.md).

   Testing without the activity files:  node server/build-pathb.js --fixture DIR
   where DIR mirrors the repo layout (DIR/style.css, DIR/assets/intro-loader.js,
   DIR/maths/glass-jotter/index.html ...). Outputs land in the fixture's
   server/ folder, never in the repo.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const SERVER = __dirname;
let ACT = path.join(SERVER, '..');                 // maths/glass-jotter
let ROOT = path.join(ACT, '..', '..');             // repo root
let OUTDIR = SERVER;
let TEMPLATE = path.join(SERVER, 'Code.gs.template');

const fxIdx = process.argv.indexOf('--fixture');
if (fxIdx > -1) {
  const fx = process.argv[fxIdx + 1];
  if (!fx) {
    console.error('ERROR: --fixture needs a directory (a tree mirroring the repo: DIR/maths/glass-jotter/...).');
    process.exit(1);
  }
  ROOT = path.resolve(fx);
  ACT = path.join(ROOT, 'maths', 'glass-jotter');
  OUTDIR = path.join(ACT, 'server');
  // a fixture may carry its own template; otherwise test against the real one
  const fxTemplate = path.join(ACT, 'server', 'Code.gs.template');
  TEMPLATE = fs.existsSync(fxTemplate) ? fxTemplate : TEMPLATE;
}

const GH = 'https://dgaj-g.github.io/ols-digital-skills';
const GHACT = GH + '/maths/glass-jotter';
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);                // backslash

/* ---- inputs (checked together so EVERY missing file is reported at once) ---- */
const INPUTS = {
  'index.html':         path.join(ACT, 'index.html'),
  'shared style.css':   path.join(ROOT, 'style.css'),
  'fonts.css':          path.join(ACT, 'assets', 'fonts', 'fonts.css'),
  'activity style.css': path.join(ACT, 'style.css'),
  'qrcode.min.js':      path.join(ACT, 'qrcode.min.js'),
  'mathcore.js':        path.join(ACT, 'mathcore.js'),
  'anglecore.js':       path.join(ACT, 'anglecore.js'),
  'content-angles.js':  path.join(ACT, 'content-angles.js'),
  'content-algebra.js': path.join(ACT, 'content-algebra.js'),
  'player.js':          path.join(ACT, 'player.js'),
  'jotter.js':          path.join(ACT, 'jotter.js'),
  'staff.js':           path.join(ACT, 'staff.js'),
  'script.js':          path.join(ACT, 'script.js'),
  'intro-loader.js':    path.join(ROOT, 'assets', 'intro-loader.js'),
  'Code.gs.template':   TEMPLATE
};
const missing = Object.keys(INPUTS).filter(function (k) { return !fs.existsSync(INPUTS[k]); });
if (missing.length) {
  console.error('ERROR: cannot assemble - ' + missing.length + ' input file(s) missing:');
  missing.forEach(function (k) { console.error('  - ' + INPUTS[k] + '   (' + k + ')'); });
  console.error('Build them first, or run against a fixture tree:  node server/build-pathb.js --fixture DIR');
  process.exit(1);
}
function read(k) { return fs.readFileSync(INPUTS[k], 'utf8'); }

const indexHtml  = read('index.html');
const sharedCss  = read('shared style.css');
const fontsCss   = read('fonts.css');
const actCss     = read('activity style.css');
const qrcodeJs   = read('qrcode.min.js');
const moduleJs   = ['mathcore.js', 'anglecore.js', 'content-angles.js', 'content-algebra.js',
                    'player.js', 'jotter.js', 'staff.js', 'script.js'].map(function (k) { return [k, read(k)]; });
const introJsRaw = read('intro-loader.js');
const codeTemplate = read('Code.gs.template');

/* ---- ASCII-escaping helpers ---- */
// JS context: escape every UTF-16 code unit >= 0x80 as \uXXXX (surrogate
// pairs / emoji rebuild correctly from two \u escapes).
function asciiJs(s) {
  return s.replace(/[^\x00-\x7f]/g, function (c) {
    return BS + 'u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}
// HTML context: escape every code POINT >= 0x80 as a numeric entity.
function asciiHtml(s) {
  return s.replace(/[^\x00-\x7f]/gu, function (c) {
    return '&#' + c.codePointAt(0) + ';';
  });
}
// CSS context: <style> content is raw text -- entities are NOT decoded there,
// so non-ASCII (degree signs in content:, real multiplication signs) must use
// CSS's own escape form: backslash + hex + terminating space.
function asciiCss(s) {
  return s.replace(/[^\x00-\x7f]/gu, function (c) {
    return BS + c.codePointAt(0).toString(16) + ' ';
  });
}
// Inline-safe JS: ASCII-escape AND neutralise any literal </script that would
// prematurely close the host <script> element (e.g. a doc-comment showing a
// script tag). A backslash before the slash is invalid HTML end-tag syntax
// but harmless inside a JS string/comment/regex.
function jsBlock(s) { return asciiJs(s).replace(new RegExp('</script', 'gi'), '<' + BS + '/script'); }
function guardAscii(name, text) {
  const m = text.match(/[^\x00-\x7f]/);
  if (m) {
    const i = text.indexOf(m[0]);
    const line = text.slice(0, i).split(NL).length;
    console.error('ERROR: ' + name + ' still has a non-ASCII char U+' + m[0].charCodeAt(0).toString(16) + ' at line ' + line);
    process.exit(1);
  }
}

/* ---- CSS url() resolution: every relative ref becomes the absolute github.io
   URL it would have had in the static build, by resolving against the
   stylesheet's own canonical location. Handles bare filenames, ./, ../ and
   assets/ paths in one rule; data:/http(s)/anchor refs pass through. ---- */
function resolveCssUrls(css, sheetAbsUrl) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, function (m, q, ref) {
    if (/^(data:|https?:|[/][/]|#)/i.test(ref)) return m;
    return 'url(' + q + new URL(ref, sheetAbsUrl).href + q + ')';
  });
}

/* ---- 1. Code.gs (template is already ASCII; guard + verbatim copy) ---- */
guardAscii('Code.gs', codeTemplate);

/* ---- 2. body markup: between <body ...> and the FIRST <script tag ---- */
const bodyOpenM = indexHtml.match(/<body[^>]*>/);
if (!bodyOpenM) { console.error('ERROR: index.html has no <body> tag'); process.exit(1); }
const bodyOpen = bodyOpenM[0];
let body = indexHtml.slice(indexHtml.indexOf(bodyOpen) + bodyOpen.length);
let cut = body.indexOf('<script');
if (cut === -1) cut = body.indexOf('</body>');
if (cut === -1) { console.error('ERROR: index.html has no <script> and no </body> - cannot find the end of the markup'); process.exit(1); }
body = body.slice(0, cut);
body = body.replace(/\.\.[/]\.\.[/]assets[/]/g, GH + '/assets/');                        // shared assets -> absolute
body = body.replace(/(src|href|poster)=(["'])assets[/]/g, '$1=$2' + GHACT + '/assets/'); // activity-local assets -> absolute

/* ---- 3. CSS: resolve url() refs against each sheet's canonical home, then
   escape to CSS-safe ASCII ---- */
const cssOut =
  '/* ===== shared (repo root) style.css ===== */' + NL +
  asciiCss(resolveCssUrls(sharedCss, GH + '/style.css')) + NL +
  '/* ===== assets/fonts/fonts.css ===== */' + NL +
  asciiCss(resolveCssUrls(fontsCss, GHACT + '/assets/fonts/fonts.css')) + NL +
  '/* ===== activity style.css ===== */' + NL +
  asciiCss(resolveCssUrls(actCss, GHACT + '/style.css'));
if (new RegExp('</style', 'i').test(cssOut)) {
  console.error('ERROR: inlined CSS contains a literal </style - it would close the <style> block early');
  process.exit(1);
}

/* ---- 4. intro loader: inline LAST, but resolve videos from absolute github.io.
   When inlined there is no document.currentScript.src, so force the base. ---- */
const introJs = introJsRaw.replace(
  /const here = document\.currentScript[^;]*;\s*const baseUrl = here\.replace\([^;]*\);/,
  "const baseUrl = '" + GH + "/assets/';"
);
if (introJs === introJsRaw) {
  console.error('ERROR: could not rewrite intro-loader baseUrl (the source changed) - fix build-pathb.js');
  process.exit(1);
}

/* ---- 5. transport shim (same-origin google.script.run, carries the sign-in).
   Injected AFTER qrcode, BEFORE mathcore, so script.js finds OLS_TRANSPORT
   defined when it boots. Accepts the class under either key. ---- */
const shim = `
window.OLS_TRANSPORT = {
  call: function (p) {
    return new Promise(function (resolve, reject) {
      var g = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      var cls = (p.classCode != null) ? p.classCode : p['class'];
      switch (p.action) {
        case 'whoami':  g.apiWhoAmI(); break;
        case 'hello':   g.apiHello({ classCode: cls }); break;
        case 'load':    g.apiLoad({ classCode: cls, act: p.act }); break;
        case 'save':    g.apiSave({ classCode: cls, act: p.act, state: p.state, summary: p.summary }); break;
        case 'setname': g.apiSetName({ classCode: cls, name: p.name }); break;
        case 'admin':   g.apiAdmin({ passcode: p.passcode, sub: p.sub, className: p.className, acts: p.acts, act: p.act, email: p.email, q: p.q, idx: p.idx, val: p.val }); break;
        default: reject(new Error('unknown action ' + p.action));
      }
    });
  }
};`;

/* ---- 6. the script blocks, in INTERFACES.md load order ---- */
const blocks = [['qrcode.min.js', qrcodeJs], ['transport shim', shim]]
  .concat(moduleJs)
  .concat([['intro-loader.js', introJs]])
  .map(function (p) { return [p[0], jsBlock(p[1])]; });
blocks.forEach(function (p) {
  if (new RegExp('</script', 'i').test(p[1])) {
    console.error('ERROR: ' + p[0] + ' still contains a raw </script after neutralisation');
    process.exit(1);
  }
});
const scriptsHtml = blocks.map(function (p) {
  return '<script>' + NL + p[1] + NL + '</script>';
}).join(NL);

/* ---- 7. assemble Index.html (OLS_BOOT scriptlet FIRST) ---- */
const out = `<!doctype html>
<html lang="en">
<head>
<base target="_top">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>The Glass Jotter &mdash; OLS Maths</title>
<style>
${cssOut}
</style>
</head>
${bodyOpen}
<script>window.OLS_BOOT = { classCode: "<?= classCode ?>", baseUrl: "<?= baseUrl ?>" }; window.OLS_ASSET_BASE = "${GHACT}/";</script>
${asciiHtml(body)}
${scriptsHtml}
</body>
</html>
`;

/* Apps Script templating breaks on stray <? or ?> outside the one scriptlet. */
const stray = (out.match(/<\?(?!=)/g) || []).length + (out.replace(/<\?=[^>]*\?>/g, '').match(/\?>/g) || []).length;
if (stray) { console.error('ERROR: ' + stray + ' stray <? or ?> would break Apps Script templating'); process.exit(1); }
/* Exactly the intentional script blocks should close (OLS_BOOT + the 11 inlined files). */
const expectClosers = blocks.length + 1;
const sClose = (out.match(new RegExp('</script>', 'gi')) || []).length;
if (sClose !== expectClosers) {
  console.error('ERROR: expected ' + expectClosers + ' </script> closers, found ' + sClose + ' (a literal </script> may have leaked into inlined JS)');
  process.exit(1);
}
guardAscii('Index.html', out);

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(path.join(OUTDIR, 'Code.gs'), codeTemplate);
fs.writeFileSync(path.join(OUTDIR, 'Index.html'), out);
console.log('Wrote ' + path.join(OUTDIR, 'Code.gs') + '   (' + (codeTemplate.length / 1024).toFixed(1) + ' KB) - pure ASCII');
console.log('Wrote ' + path.join(OUTDIR, 'Index.html') + ' (' + (out.length / 1024).toFixed(1) + ' KB, ' + sClose + ' script blocks) - pure ASCII');
