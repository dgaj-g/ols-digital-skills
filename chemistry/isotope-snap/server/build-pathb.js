#!/usr/bin/env node
/* ============================================================
   Assemble the Path B deploy files for Isotope Lab.
   ------------------------------------------------------------
   The activity is authored once as the normal github.io build in ..
   (index.html, style.css, data.js, engine.js, atom3d.js, snap.js,
    massspec.js, staff.js, app.js, assets/vendor/qrcode.min.js).
   This script produces the two files for the Apps Script project:

     PathB_Code.gs    — the server (copy of Code.gs.template; no
                         question bank injection needed for this activity)
     PathB_Index.html — the page Apps Script serves (shared CSS + local
                         CSS + page body + OLS_TRANSPORT shim + all JS
                         inlined in load order)

   IMPORTANT:
   - Both output files are PURE ASCII.  Every non-ASCII character
     (smart quotes, em-dashes, emoji, accented names) is written as a
     safe escape: \uXXXX inside JavaScript, &#NNN; inside HTML.  A
     guard function refuses to write a file that still contains a raw
     non-ASCII byte.
   - Apps Script templating breaks on stray <? or ?> outside the one
     <?= ... ?> scriptlet we control; a second guard catches these.
   - Three.js (600KB) is NOT inlined.  It stays as a <script src>
     pointing at the absolute github.io URL so the sandboxed iframe
     can load it (relative paths break inside HtmlService).

   Run after ANY change to the activity:
       node build-pathb.js        (from the server/ folder)
   Then paste PathB_Code.gs into Code.gs and PathB_Index.html into
   the Index HTML file in the Apps Script project, and deploy a new
   version.
   ============================================================ */

'use strict';
const fs   = require('fs');
const path = require('path');

const SERVER = __dirname;                          // .../isotope-snap/server/
const ACT    = path.join(SERVER, '..');            // .../isotope-snap/

/* Absolute base URL for assets that cannot be resolved with relative
   paths inside a sandboxed HtmlService iframe. */
const GITHUB_BASE = 'https://dgaj-g.github.io/ols-digital-skills/chemistry/isotope-snap/';
const ASSETS_BASE = 'https://dgaj-g.github.io/ols-digital-skills/assets/';

/* ---- file reads ---- */
const indexHtml    = fs.readFileSync(path.join(ACT, 'index.html'),              'utf8');
const localCss     = fs.readFileSync(path.join(ACT, 'style.css'),               'utf8');
const sharedCss    = fs.readFileSync(path.join(ACT, '../../style.css'),         'utf8');
const dataJs       = fs.readFileSync(path.join(ACT, 'data.js'),                 'utf8');
const engineJs     = fs.readFileSync(path.join(ACT, 'engine.js'),               'utf8');
const atom3dJs     = fs.readFileSync(path.join(ACT, 'atom3d.js'),               'utf8');
const snapJs       = fs.readFileSync(path.join(ACT, 'snap.js'),                 'utf8');
const massspecJs   = fs.readFileSync(path.join(ACT, 'massspec.js'),             'utf8');
const staffJs      = fs.readFileSync(path.join(ACT, 'staff.js'),                'utf8');
const appJs        = fs.readFileSync(path.join(ACT, 'app.js'),                  'utf8');
const qrcodeJs     = fs.readFileSync(path.join(ACT, 'assets/vendor/qrcode.min.js'), 'utf8');
const introLoaderJs= fs.readFileSync(path.join(ACT, '../../assets/intro-loader.js'), 'utf8');
const template     = fs.readFileSync(path.join(SERVER, 'Code.gs.template'),     'utf8');

/* ============================================================
   ASCII-escaping helpers
   ============================================================ */

/**
 * JS context — escape every UTF-16 code unit >= 0x80 as \uXXXX.
 * Using the BMP range avoids surrogate-pair edge cases (emoji etc.
 * become two \u escapes which the browser stitches back together).
 */
function asciiJs(s) {
  return s.replace(/[-￿]/g, function (c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}

/**
 * HTML context — escape every code point >= 0x80 as a decimal
 * numeric entity (&#NNN;).  Uses the /gu flag + codePointAt so that
 * astral characters (emoji) are handled as single code points.
 */
function asciiHtml(s) {
  return s.replace(/[-\u{10ffff}]/gu, function (c) {
    return '&#' + c.codePointAt(0) + ';';
  });
}

/** Abort if the output still contains a raw non-ASCII byte. */
function guardAscii(name, text) {
  const m = text.match(/[^\x00-\x7f]/);
  if (m) {
    const lineNo = text.slice(0, text.indexOf(m[0])).split('\n').length;
    console.error(
      'ERROR: ' + name + ' still has a non-ASCII char U+' +
      m[0].charCodeAt(0).toString(16) + ' at line ' + lineNo
    );
    process.exit(1);
  }
}

/** Abort if there are stray <? or ?> that would break Apps Script templating. */
function guardScriptlets(name, text) {
  /* Allow only the two scriptlets we deliberately inject. */
  const clean = text.replace(/<\?= classCode \?>/g, '').replace(/<\?= baseUrl \?>/g, '');
  const openCount  = (clean.match(/<\?/g) || []).length;
  const closeCount = (clean.match(/\?>/g) || []).length;
  if (openCount + closeCount > 0) {
    console.error(
      'ERROR: ' + name + ' has ' + (openCount + closeCount) +
      ' stray <? or ?> that would break Apps Script templating'
    );
    process.exit(1);
  }
}

/* ============================================================
   1. PathB_Code.gs
      The template is already valid Apps Script with no question bank
      to inject.  Just copy it as-is (it should be pure ASCII already,
      but we run it through asciiJs / guardAscii to be certain).
   ============================================================ */
const codeGs = asciiJs(template);
guardAscii('PathB_Code.gs', codeGs);
fs.writeFileSync(path.join(SERVER, 'PathB_Code.gs'), codeGs);
console.log('Wrote PathB_Code.gs   (' + (codeGs.length / 1024).toFixed(1) + ' KB) -- pure ASCII');

/* ============================================================
   2. PathB_Index.html
   ============================================================ */

/* ---- 2a. Extract body markup from index.html ----
   We want everything between <body ...> and </body>, with ALL
   <script> tags stripped (JS is inlined separately below). */
const bodyTagMatch = indexHtml.match(/<body[^>]*>/);
if (!bodyTagMatch) { console.error('ERROR: could not find <body> tag in index.html'); process.exit(1); }
const bodyOpen = bodyTagMatch[0];
let body = indexHtml.slice(indexHtml.indexOf(bodyOpen) + bodyOpen.length);
/* Strip </body> and everything after. */
const bodyCloseIdx = body.lastIndexOf('</body>');
if (bodyCloseIdx > -1) body = body.slice(0, bodyCloseIdx);
/* Remove every <script ...>...</script> block (including multiline). */
body = body.replace(/<script[\s\S]*?<\/script>/gi, '');

/* ---- 2b. Rewrite asset paths that break inside the sandboxed iframe ----

   The sandboxed HtmlService iframe cannot resolve relative paths that
   walk up the directory tree (../../assets/) or even same-folder
   paths when the document origin is a google.com script URL.  We
   rewrite every affected reference to an absolute github.io URL.

   Paths affected:
     assets/characters/*        → GITHUB_BASE + assets/characters/*
     ../../assets/crest.png     → ASSETS_BASE + crest.png
*/
body = body.replace(/(['"])assets\/characters\//g, '$1' + GITHUB_BASE + 'assets/characters/');
body = body.replace(/(['"])\.\.\/\.\.\/assets\/crest\.png(['"])/g, '$1' + ASSETS_BASE + 'crest.png$2');

/* ---- 2c. OLS_TRANSPORT shim ----
   Routes every action the front-end calls via Lab.call() through to
   the matching server-side Apps Script function via google.script.run.
   Shape must exactly mirror what engine.js's offlineTransport handles. */
const shim = `
/* OLS_TRANSPORT — wires Lab.call(action, params) to google.script.run */
window.OLS_TRANSPORT = {
  call: function (p) {
    return new Promise(function (resolve, reject) {
      var g = google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject);
      switch (p.action) {
        case 'whoami':      g.apiWhoAmI(); break;
        case 'setName':     g.apiSetName({ classCode: p.classCode, firstName: p.firstName, surname: p.surname }); break;
        case 'state':       g.apiState({ classCode: p.classCode }); break;
        case 'save':        g.apiSave({ classCode: p.classCode, xp: p.xp, progress: p.progress }); break;
        case 'leaderboard': g.apiLeaderboard({ classCode: p.classCode }); break;
        case 'myGroup':     g.apiMyGroup({ classCode: p.classCode }); break;
        case 'admin':       g.apiAdmin({
          passcode:  p.passcode,
          sub:       p.sub,
          className: p.className,
          name:      p.name,
          email:     p.email,
          groupId:   p.groupId,
          groupName: p.groupName,
          n:         p.n,
          revealed:  p.revealed
        }); break;
        default: reject(new Error('unknown action: ' + p.action));
      }
    });
  }
};`;

/* ---- 2d. Inline intro-loader, rewriting video src to absolute URLs ----
   The intro-loader resolves its mp4 path relative to its own script URL.
   Inside HtmlService that URL is a google.com script URL, so the relative
   path would resolve to the wrong place.  We patch the VIDEO_FILENAME
   constants to absolute paths before inlining. */
let introPatched = introLoaderJs
  .replace(
    "const VIDEO_FILENAME_LANDSCAPE = 'intro.mp4';",
    "const VIDEO_FILENAME_LANDSCAPE = '" + ASSETS_BASE + "intro.mp4';"
  )
  .replace(
    "const VIDEO_FILENAME_PORTRAIT  = 'intro-portrait.mp4';",
    "const VIDEO_FILENAME_PORTRAIT  = '" + ASSETS_BASE + "intro-portrait.mp4';"
  );
/* The loader also derives videoSrc from its own script URL — we override
   that derivation entirely by making the filenames already absolute, so
   the baseUrl + VIDEO_FILENAME concatenation still works (baseUrl will be
   the google URL, but VIDEO_FILENAME is already the full absolute URL). */

/* ---- 2e. Assemble the full HTML document ---- */
const out = `<!doctype html>
<html lang="en">
<head>
<base target="_top">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Isotope Lab</title>
<style>
${asciiHtml(sharedCss)}
${asciiHtml(localCss)}
</style>
</head>
${bodyOpen}
<script>window.OLS_BOOT = { classCode: "<?= classCode ?>", baseUrl: "<?= baseUrl ?>" };</script>
${asciiHtml(body)}
<script src="${GITHUB_BASE}assets/vendor/three.min.js" defer></script>
<script>
${asciiJs(qrcodeJs)}
</script>
<script>
${asciiJs(shim)}
</script>
<script>
${asciiJs(dataJs)}
</script>
<script>
${asciiJs(engineJs)}
</script>
<script>
${asciiJs(atom3dJs)}
</script>
<script>
${asciiJs(snapJs)}
</script>
<script>
${asciiJs(massspecJs)}
</script>
<script>
${asciiJs(staffJs)}
</script>
<script>
${asciiJs(appJs)}
</script>
<script>
${asciiJs(introPatched)}
</script>
</body>
</html>
`;

/* ---- 2f. Guards ---- */
guardScriptlets('PathB_Index.html', out);
guardAscii('PathB_Index.html', out);

fs.writeFileSync(path.join(SERVER, 'PathB_Index.html'), out);
console.log('Wrote PathB_Index.html (' + (out.length / 1024).toFixed(1) + ' KB) -- pure ASCII');
console.log('Done. Paste PathB_Code.gs -> Code.gs and PathB_Index.html -> Index in Apps Script.');
