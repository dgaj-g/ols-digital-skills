#!/usr/bin/env node
/* ============================================================
   Assemble the Path B deploy files for the KS3 DT platform.
   ------------------------------------------------------------
   The platform is authored once as the normal github.io build in ..
   (index.html, style.css, app.js, engines.js, staff.js, qrcode.min.js).
   dev-server.js is preview-only (localStorage FakeServer for localhost/
   github.io) and is NEVER inlined here. This script produces the two
   files for the Apps Script project:

     PathB_Code.gs    — copy of Code.gs.template (already ASCII; no
                        question-bank injection needed, content is
                        fetched from github.io at runtime)
     PathB_Index.html — the page Apps Script serves: style.css inlined,
                        the index.html body (scripts stripped), the
                        OLS_BOOT/OLS_CONTENT_BASE/OLS_ASSET_BASE
                        scriptlet block, the OLS_TRANSPORT shim, then
                        qrcode.min.js / app.js / engines.js / staff.js
                        inlined in load order, then the App.boot() call.

   IMPORTANT:
   - Both output files are PURE ASCII. Every non-ASCII character is
     written as a safe escape: \uXXXX inside JavaScript, &#NNN; inside
     HTML, and \HEX (CSS's own escape) inside the inlined <style> block.
     CSS gets its OWN escape (not the HTML one) because <style> is an
     HTML "raw text" element — the browser never decodes &#NNN; entities
     there, so an HTML-escaped glyph inside a `content: "..."` rule would
     render as the literal entity text instead of the character. style.css
     has exactly one such rule (the confirm-step tick mark), so this is
     not a theoretical concern here. A guard refuses to write a file that
     still contains a raw non-ASCII byte.
   - Apps Script templating breaks on stray <? or ?> outside the two
     <?= ... ?> scriptlets we control (classCode, baseUrl); a guard
     catches these.
   - Every source file this script reads is authored elsewhere (app.js /
     engines.js / staff.js by others, dev-server.js not read at all).
     This script only reads them at run time and refuses to run — with a
     clear list of what's missing — if any required file isn't there yet.

   Run after ANY change to the platform:
       node server/build-pathb.js        (from the platform/ folder)
   Then paste PathB_Code.gs into Code.gs and PathB_Index.html into the
   Index HTML file in the Apps Script project, and deploy a new version.
   ============================================================ */

'use strict';
const fs   = require('fs');
const path = require('path');

const SERVER = __dirname;               // .../ks3-dt/platform/server/
const ACT    = path.join(SERVER, '..'); // .../ks3-dt/platform/

/* Absolute bases — the sandboxed HtmlService iframe cannot resolve the
   platform's normal relative paths (../../assets/, ../content/), so
   everything crosses to github.io absolute URLs at assembly time. */
const GH            = 'https://dgaj-g.github.io/ols-digital-skills';
const PLATFORM_BASE = GH + '/ks3-dt/platform/';
const CONTENT_BASE  = GH + '/ks3-dt/content/';
const CREST_URL     = GH + '/assets/crest.png';

/* ---- required source files (read at run time; not vendored here) ---- */
const P_INDEX    = path.join(ACT, 'index.html');
const P_APP      = path.join(ACT, 'app.js');
const P_ENGINES  = path.join(ACT, 'engines.js');
const P_STAFF    = path.join(ACT, 'staff.js');
const P_STYLE    = path.join(ACT, 'style.css');
const P_QRCODE   = path.join(ACT, 'qrcode.min.js');
const P_CODETPL  = path.join(SERVER, 'Code.gs.template');

const REQUIRED = [
  ['index.html', P_INDEX],
  ['app.js', P_APP],
  ['engines.js', P_ENGINES],
  ['staff.js', P_STAFF],
  ['style.css', P_STYLE],
  ['qrcode.min.js', P_QRCODE],
  ['server/Code.gs.template', P_CODETPL]
];
const missing = REQUIRED.filter(function (r) { return !fs.existsSync(r[1]); });
if (missing.length) {
  console.error('ERROR: cannot assemble Path B - missing source file(s):');
  missing.forEach(function (r) { console.error('  - ' + r[0] + '  (' + r[1] + ')'); });
  process.exit(1);
}

const indexHtml    = fs.readFileSync(P_INDEX, 'utf8');
const appJs        = fs.readFileSync(P_APP, 'utf8');
const enginesJs    = fs.readFileSync(P_ENGINES, 'utf8');
const staffJs      = fs.readFileSync(P_STAFF, 'utf8');
const styleCss     = fs.readFileSync(P_STYLE, 'utf8')
  // relative asset URLs inside the inlined CSS (the vendored font) cannot
  // resolve under the googleusercontent origin — rewrite to absolute github.io
  .replace(/url\('assets\//g, "url('" + PLATFORM_BASE + "assets/");
const qrcodeJs     = fs.readFileSync(P_QRCODE, 'utf8');
const codeTemplate = fs.readFileSync(P_CODETPL, 'utf8');

/* ============================================================
   ASCII-escaping helpers
   ============================================================ */

/** JS context — escape every UTF-16 code unit >= 0x80 as \uXXXX. Operating
 *  per code unit (not code point) is deliberate: an astral emoji becomes
 *  two \u escapes (its surrogate pair) which the browser stitches back
 *  together, so this stays correct without any surrogate-pair handling. */
function asciiJs(s) {
  return s.replace(/[-￿]/g, function (c) {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}

/** HTML context — escape every code point >= 0x80 as a decimal numeric
 *  entity (&#NNN;). Uses /gu + codePointAt so astral characters are one
 *  substitution, not a mangled surrogate pair. */
function asciiHtml(s) {
  return s.replace(/[-\u{10ffff}]/gu, function (c) {
    return '&#' + c.codePointAt(0) + ';';
  });
}

/** CSS context (inside the inlined <style> block) — escape every UTF-16
 *  code unit >= 0x80 as CSS's own hex escape (\HEX followed by a space to
 *  terminate it). <style> is an HTML raw-text element: the browser does
 *  NOT decode &#NNN; entities inside it, so asciiHtml would leave a
 *  content: "&#10003;" rule showing the literal entity text instead of a
 *  glyph. The trailing space is consumed as the escape terminator by the
 *  CSS tokenizer, so it never appears in the resulting string/token. */
function asciiCss(s) {
  return s.replace(/[-￿]/g, function (c) {
    return '\\' + c.charCodeAt(0).toString(16) + ' ';
  });
}

/** Inline-safe JS: ASCII-escape AND neutralise any literal </script that
 *  would prematurely close the host <script> element. A backslash before
 *  the slash is invalid HTML end-tag syntax but harmless inside a JS
 *  string/comment/regex. */
function jsBlock(s) { return asciiJs(s).replace(/<\/script/gi, '<\\/script'); }

/** Abort if the output still contains a raw non-ASCII byte. */
function guardAscii(name, text) {
  const m = text.match(/[^\x00-\x7f]/);
  if (m) {
    const lineNo = text.slice(0, text.indexOf(m[0])).split('\n').length;
    console.error('ERROR: ' + name + ' still has a non-ASCII char U+' + m[0].charCodeAt(0).toString(16) + ' at line ' + lineNo);
    process.exit(1);
  }
}

/** Abort if there are stray <? or ?> that would break Apps Script
 *  templating. Only the two scriptlets we deliberately inject are
 *  whitelisted. */
function guardScriptlets(name, text) {
  const clean = text.replace(/<\?= classCode \?>/g, '').replace(/<\?= baseUrl \?>/g, '');
  const openCount  = (clean.match(/<\?/g) || []).length;
  const closeCount = (clean.match(/\?>/g) || []).length;
  if (openCount + closeCount > 0) {
    console.error('ERROR: ' + name + ' has ' + (openCount + closeCount) + ' stray <? or ?> that would break Apps Script templating');
    process.exit(1);
  }
}

/* ============================================================
   1. PathB_Code.gs — the template needs no injection, just guard + copy.
   ============================================================ */
guardAscii('PathB_Code.gs', codeTemplate);
fs.writeFileSync(path.join(SERVER, 'PathB_Code.gs'), codeTemplate);
console.log('Wrote PathB_Code.gs    (' + (codeTemplate.length / 1024).toFixed(1) + ' KB) - pure ASCII');

/* ============================================================
   2. PathB_Index.html
   ============================================================ */

/* ---- 2a. Extract body markup from index.html ----
   Everything between <body ...> and </body>, with ALL <script> tags
   stripped (every one of them is re-inlined below, in controlled order;
   dev-server.js is deliberately never inlined). */
const bodyTagMatch = indexHtml.match(/<body[^>]*>/);
if (!bodyTagMatch) { console.error('ERROR: could not find <body> tag in index.html'); process.exit(1); }
const bodyOpen = bodyTagMatch[0];
let body = indexHtml.slice(indexHtml.indexOf(bodyOpen) + bodyOpen.length);
const bodyCloseIdx = body.lastIndexOf('</body>');
if (bodyCloseIdx > -1) body = body.slice(0, bodyCloseIdx);
body = body.replace(/<script[\s\S]*?<\/script>/gi, '');

/* ---- 2b. Asset rewrite: the shared crest can't be resolved with a
   relative ../../assets/ path inside the sandboxed iframe. */
body = body.replace(/src="\.\.\/\.\.\/assets\/crest\.png"/g, 'src="' + CREST_URL + '"');

/* ---- 2c. OLS_TRANSPORT shim ----
   Routes every action App.call() makes through to the matching
   server-side Apps Script apiXxx function via google.script.run. The
   whole params object is passed straight through, matching how every
   apiXxx(req) in Code.gs.template reads req.classCode / req.lessonId /
   req.itemId etc. off it. */
const shimSrc = `
window.OLS_TRANSPORT = {
  call: function (p) {
    return new Promise(function (resolve, reject) {
      var g = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      switch (p.action) {
        case 'whoami':        g.apiWhoAmI(); break;
        case 'join':           g.apiJoin(p); break;
        case 'state':          g.apiState(p); break;
        case 'recapStart':     g.apiRecapStart(p); break;
        case 'recapAnswer':    g.apiRecapAnswer(p); break;
        case 'mark':           g.apiMark(p); break;
        case 'vaultInfo':      g.apiVaultInfo(p); break;
        case 'board':          g.apiBoard(p); break;
        case 'saveEvent':      g.apiSaveEvent(p); break;
        case 'loadDraft':      g.apiLoadDraft(p); break;
        case 'submitExit':     g.apiSubmitExit(p); break;
        case 'submitBaseline': g.apiSubmitBaseline(p); break;
        case 'catchup':        g.apiCatchup(p); break;
        case 'setKit':         g.apiSetKit(p); break;
        case 'admin':          g.apiAdmin(p); break;
        default: reject(new Error('unknown action: ' + p.action));
      }
    });
  }
};`;

/* ---- 2d. inline-safe JS chunks (ASCII-escaped + any literal </script
   neutralised), then a residual-</script> check per chunk (belt + braces
   before the whole-document count check below). */
const qrcodeBlock  = jsBlock(qrcodeJs);
const shimBlock    = jsBlock(shimSrc);
const appBlock     = jsBlock(appJs);
const enginesBlock = jsBlock(enginesJs);
const staffBlock   = jsBlock(staffJs);
[
  ['qrcode.min.js', qrcodeBlock],
  ['transport-shim', shimBlock],
  ['app.js', appBlock],
  ['engines.js', enginesBlock],
  ['staff.js', staffBlock]
].forEach(function (p) {
  if (/<\/script/i.test(p[1])) { console.error('ERROR: ' + p[0] + ' still contains a raw </script after neutralisation'); process.exit(1); }
});

/* ---- 2e. the boot scriptlet block (immediately after <body>) and the
   final App.boot() call (after every script is loaded). Both are
   authored here, not read from a source file, so they are inherently
   pure ASCII with no </script risk. */
const bootScriptletHtml =
  '<script>window.OLS_BOOT = { classCode: "<?= classCode ?>", baseUrl: "<?= baseUrl ?>" };\n' +
  'window.OLS_CONTENT_BASE = "' + CONTENT_BASE + '";\n' +
  'window.OLS_ASSET_BASE = "' + PLATFORM_BASE + '";</script>';
const finalBootHtml = "<script>window.addEventListener('DOMContentLoaded', function(){ App.boot(); });</script>";

/* ---- 2f. Every <script>...</script> pair the assembled document will
   contain, in the exact order they are written. The expected </script>
   closer count for the guard below comes directly from this array's
   length — never a hard-coded number. */
const scriptFragments = [
  bootScriptletHtml,
  '<script>\n' + qrcodeBlock + '\n</script>',
  '<script>\n' + shimBlock + '\n</script>',
  '<script>\n' + appBlock + '\n</script>',
  '<script>\n' + enginesBlock + '\n</script>',
  '<script>\n' + staffBlock + '\n</script>',
  finalBootHtml
];
const expectedScriptCloses = scriptFragments.length;

/* ---- 2g. Assemble the full HTML document ---- */
const out = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base target="_top">
<title>OLS KS3 Digital Technology</title>
<style>
${asciiCss(styleCss)}
</style>
</head>
${bodyOpen}
${scriptFragments[0]}
${asciiHtml(body)}
${scriptFragments.slice(1).join('\n')}
</body>
</html>
`;

/* ---- 2h. Guards ---- */
guardScriptlets('PathB_Index.html', out);
guardAscii('PathB_Index.html', out);
const actualScriptCloses = (out.match(/<\/script>/gi) || []).length;
if (actualScriptCloses !== expectedScriptCloses) {
  console.error('ERROR: expected ' + expectedScriptCloses + ' </script> closers (one per constructed script fragment), found ' + actualScriptCloses + ' - a literal </script> may have leaked into inlined JS');
  process.exit(1);
}

fs.writeFileSync(path.join(SERVER, 'PathB_Index.html'), out);
console.log('Wrote PathB_Index.html (' + (out.length / 1024).toFixed(1) + ' KB) - pure ASCII, ' + actualScriptCloses + ' script blocks');
console.log('Ready to paste: PathB_Code.gs -> Code.gs, PathB_Index.html -> Index.html, in the Apps Script project. Deploy a new version.');
