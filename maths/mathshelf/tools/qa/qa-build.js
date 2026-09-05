#!/usr/bin/env node
/* qa-build.js — THE PAIR HE PASTES IS THE PAIR THE REPO HOLDS, AND IT IS WHOLE.
 *
 * G-G1. The assembler already guards the things that can corrupt a paste (pure
 * ASCII, the `%23` anchor, a stray `</script`, the closer count). This gate
 * wraps it and adds the two it never had:
 *
 *   THE INLINE LIST IS DERIVED. A book added to index.html and forgotten in the
 *   assembler's INPUTS ships a deployed app that silently lacks it — the design
 *   warned about exactly that in prose, and prose is not a gate. So the two
 *   lists are compared BOTH WAYS: every <script src> in index.html is an input,
 *   and every input is loaded by index.html.
 *
 *   THE LIVE ASSETS ARE PROBED, WITH A KNOWN-ABSENT CONTROL. The built page
 *   pulls its fonts, its crest and its films from github.io, so shipping is not
 *   delivering (DFM 239) and the probe must run AFTER the push. A probe that
 *   said yes to everything would be worse than none, so a URL that is KNOWN not
 *   to exist is probed in the same run: if that one comes back 200, the probe
 *   itself is broken and this gate says so instead of reporting a pass.
 *
 * AND THE SECRET IS NOWHERE. Anything in Index.html is in every pupil's browser.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'full';
const ORDER = 80;
const COVERS = { books: '*', kinds: [], surfaces: [], widths: [], projector: false, tier: ['built'], cells: ['deploy'] };
const CONTROLS = [
  { id: 'script-not-inlined', kind: 'fixture', plant: 'fixture-build-missing-input', mustFail: /does not inline it/ },
  { id: 'known-absent-asset', kind: 'self-probe', mustFail: /the live-asset probe is broken/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-build');
g.exempt([
  'the live-asset probe runs only when MS_PROBE_LIVE=1 (it needs the network and the push to have happened); otherwise it is REPORTED as not run, never counted as a pass',
  'the assembler\'s own guards run inside it and are not repeated here'
]);

/* ---- 1. the assembler runs, and its own guards hold -------------------- */
let built = { ok: false, out: '' };
try {
  built.out = execFileSync(process.execPath, [A.app('server/build-pathb.js')], { cwd: A.APP, encoding: 'utf8', maxBuffer: 32e6 });
  built.ok = true;
} catch (e) { built.out = (e.stdout || '') + (e.stderr || ''); }
g.check(built.ok, 'server/Index.html', 'build', 'the assembler refused to build the pair:\n' + built.out.split('\n').slice(0, 6).join('\n'));

const INDEX = A.app('server/Index.html');
const CODE = A.app('server/Code.gs');
if (!A.exists(INDEX) || !A.exists(CODE)) { g.fail('server', 'build', 'the built pair is not on disk'); g.done(); process.exit(1); }
const html = A.read(INDEX);
const codeGs = A.read(CODE);

/* ---- 2. the inline list, DERIVED, both ways ---------------------------- */
{
  const page = A.read(A.app('index.html'));
  const srcs = (page.match(/<script src="([^"]+)"/g) || [])
    .map(s => /src="([^"]+)"/.exec(s)[1])
    .filter(s => !/^\.\.\//.test(s));              /* the shared intro-loader has its own row */
  const assembler = A.read(A.app('server/build-pathb.js'));
  const inputs = (assembler.match(/'([a-z0-9-]+\.js)':\s+path\.join/gi) || [])
    .map(s => /'([^']+)'/.exec(s)[1]);
  /* WHAT THE ASSEMBLER ACTUALLY ASSEMBLES. Reading only `moduleJs` missed
     qrcode.min.js and the transport shim, which are put into `blocks` directly
     - so the gate reported that a file it inlines every single build was not
     inlined. A gate that invents a fault is worse than none (L6): the list is
     everything that ends up in a block, however it gets there. */
  const modules = (() => {
    const m = /const moduleJs\s*=\s*\[([\s\S]*?)\]\s*\.map/.exec(assembler);
    const fromModules = m ? (m[1].match(/'([^']+\.js)'/g) || []).map(s => s.slice(1, -1)) : [];
    const b = /const blocks\s*=\s*\[([\s\S]*?)\]/.exec(assembler);
    const fromBlocks = b ? (b[1].match(/'([^']+\.js)'/g) || []).map(s => s.slice(1, -1)) : [];
    return Array.from(new Set(fromModules.concat(fromBlocks)));
  })();
  srcs.forEach(s => {
    g.check(inputs.includes(s) || modules.includes(s), 'server/Index.html', 'build',
      'index.html loads ' + s + ' but server/build-pathb.js does not inline it — the deployed app would silently lack it');
  });
  modules.forEach(m => {
    g.check(srcs.includes(m), 'index.html', 'build',
      'the assembler inlines ' + m + ' but index.html does not load it — the preview and the deployed app are running different code');
  });
  /* every stylesheet the page links is inlined too */
  const sheets = (page.match(/<link rel="stylesheet" href="([^"]+)"/g) || []).map(s => /href="([^"]+)"/.exec(s)[1]);
  g.check(sheets.length > 0, 'index.html', 'build', 'index.html links no stylesheet at all');
  sheets.forEach(s => {
    const name = s.split('/').pop();
    g.check(html.indexOf(name.replace('.css', '')) >= 0 || new RegExp(name.replace('.', '\\.')).test(assembler),
      'server/Index.html', 'build', 'the stylesheet ' + s + ' is linked by index.html but nothing inlines it');
  });
}

/* ---- 3. nothing that must never ship, ships ---------------------------- */
{
  g.check(html.indexOf('relaySecret') < 0, 'server/Index.html', 'build',
    'the shared secret\'s property name is in the built artefact — anything in Index.html is in every pupil\'s browser');
  g.check(!/content-fixture|fixture-renderers|fixture-strings/.test(html), 'server/Index.html', 'build',
    'a fixture file reached the built artefact — the fixtures are the controls\' own scaffolding and are never shipped');
  const title = /<title>([^<]*)<\/title>/.exec(html);
  g.check(title && /OLS\s*(&mdash;|—|--)\s*MathShelf/.test(title[1]), 'server/Index.html', 'build',
    'the built page\'s title reads "' + (title ? title[1] : '(none)') + '" — it should be "OLS — MathShelf"');
}

/* ---- 4. the md5s the deploy log will carry ----------------------------- */
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const pair = { index: md5(html), code: md5(codeGs) };
A.ensureOut();
fs.writeFileSync(A.out('built-pair.json'), JSON.stringify(pair, null, 1));
g.note('built pair: Index.html md5 ' + pair.index + ' (' + Math.round(html.length / 1024) + 'KB), Code.gs md5 ' + pair.code);

/* ---- 5. the live assets, probed, with a known-absent control ----------- */
(async () => {
  if (process.env.MS_PROBE_LIVE !== '1') {
    g.note('the live-asset probe did not run (set MS_PROBE_LIVE=1 after the push) — it is reported, not counted as a pass');
    g.done();
    return;
  }
  const urls = Array.from(new Set((html.match(/https:\/\/[a-z0-9.\-\/]+\.(?:woff2|png|mp4|jpg|css|js)/gi) || [])));
  const ABSENT = urls.length ? urls[0].replace(/[^/]+$/, 'this-file-does-not-exist-' + Date.now() + '.png') : null;
  async function head(u) {
    try {
      const r = await fetch(u, { method: 'HEAD' });
      return r.status;
    } catch (e) { return 0; }
  }
  if (ABSENT) {
    const s = await head(ABSENT);
    g.check(s !== 200, 'the probe itself', 'build',
      'the live-asset probe is broken: a URL that cannot exist answered 200, so a green result here would mean nothing');
  }
  for (const u of urls) {
    const s = await head(u);
    g.check(s === 200, u.replace(/^https:\/\//, ''), 'build',
      'the built page asks for this and the live site answers ' + s + ' — shipping is not delivering');
  }
  g.note('probed ' + urls.length + ' live asset URLs');
  g.done();
})();
