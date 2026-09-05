#!/usr/bin/env node
/* qa-compositor.js — THE BLACK SCREEN ON SCROLL, AND EVERYTHING LIKE IT.
 *
 * FAULT: `background-attachment: fixed` on a layer that sits behind cards
 * using `backdrop-filter` — the combination that black-screens on scroll on
 * school Chromebooks, paid for once on the KS3 DT platform and never to be
 * paid for again on this one. Its sibling fault is any @keyframes block
 * that animates a property the compositor cannot cheaply thread every
 * frame: a "reveal" animated on width, background, or a box-shadow spread
 * looks fine on a fast machine and drops frames on a shared classroom one.
 *
 * THE WHITELIST IS EXACTLY transform, opacity, background-position,
 * stroke-dashoffset, stroke-dasharray — nothing else, not even box-shadow.
 * If the shipped CSS ever needs a sixth property, that is a real design
 * conversation, not a line this gate quietly grows to fit; this file widens
 * the whitelist for no one, including its own author.
 *
 * THE EMPTY-MATCH GUARD is copied in spirit from ks3-dt qa-year-worlds: a
 * scan that finds ZERO @keyframes blocks at all is not a clean pass, it is
 * a gate that measured nothing — the parser broke, the file moved, or the
 * whole animation layer quietly vanished, and every one of those reads as
 * green under a naive count. Silence is never permission.
 */
'use strict';
const fs = require('fs');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'fast';
const ORDER = 44;
const COVERS = { books: '*', kinds: [], surfaces: [], widths: [], projector: false, tier: ['preview', 'built'], cells: ['compositor'] };
const CONTROLS = [
  { id: 'banned-pair', kind: 'fixture', plant: 'fixture-css', mustFail: /background-attachment/ },
  { id: 'expensive-keyframe', kind: 'fixture', plant: 'fixture-css', mustFail: /only transform/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-compositor');
g.exempt([
  'a CSS comment mentioning "background-attachment: fixed" (documenting the rule this gate enforces) is not itself a violation — comments are stripped before either check runs'
]);

/* CSS has only the one comment form; stripped the same way decl.js strips
 * JS block comments, kept separate because CSS has no "//" line comment and
 * a shared stripper would risk mangling a url(http://...) value. */
function stripCssComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, ' '); }

const WHITELIST = ['transform', 'opacity', 'background-position', 'stroke-dashoffset', 'stroke-dasharray'];

const cssFiles = fs.readdirSync(A.APP).filter(f => /\.css$/i.test(f)).sort();
if (!cssFiles.length) {
  g.fail('app', 'compositor', 'no .css file was found in the app directory at all — this gate has nothing to check, which is a failure, not a pass');
}
g.note('css files scanned: ' + (cssFiles.join(', ') || '(none)'));

let totalKeyframes = 0;

cssFiles.forEach(f => {
  const raw = A.read(A.app(f));
  const src = stripCssComments(raw);

  /* ---- (1) background-attachment: fixed must appear nowhere ------------ */
  const baRe = /background-attachment\s*:\s*fixed/gi;
  let bm;
  while ((bm = baRe.exec(src))) {
    const line = src.slice(0, bm.index).split('\n').length;
    g.fail(f + ':' + line, 'compositor',
      'this rule sets background-attachment: fixed — combined with a card\'s backdrop-filter this is the exact pairing that black-screens on scroll on a school Chromebook; give the background its own fixed-POSITION layer instead');
  }

  /* ---- (2) every @keyframes block only animates whitelisted properties - */
  const kfRe = /@keyframes\s+([\w-]+)\s*\{/g;
  let km;
  while ((km = kfRe.exec(src))) {
    const braceStart = src.indexOf('{', km.index);
    let depth = 0, end = -1;
    for (let j = braceStart; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end < 0) continue;
    totalKeyframes++;
    const body = src.slice(braceStart + 1, end);
    const props = new Set();
    const declRe = /([a-zA-Z-]+)\s*:\s*[^;{}]+/g;
    let dm;
    while ((dm = declRe.exec(body))) props.add(dm[1].trim().replace(/^-\w+-/, ''));
    const bad = [...props].filter(p => WHITELIST.indexOf(p) === -1);
    if (bad.length) {
      g.fail(f + ' @keyframes ' + km[1], 'compositor',
        'the keyframe "' + km[1] + '" animates ' + bad.join(', ') + ' — only transform, opacity, background-position, stroke-dashoffset and stroke-dasharray are cheap enough to animate every frame; redo this effect on one of those (a reveal is usually stroke-dashoffset or opacity, never ' + bad[0] + ')');
    } else {
      g.pass(f + ' @keyframes ' + km[1] + ' animates only whitelisted properties (' + [...props].join(', ') + ')');
    }
  }

  /* ---- (4) no transition ever names "all" ------------------------------- */
  const trRe = /transition(?:-property)?\s*:\s*([^;]+);/gi;
  let tm;
  while ((tm = trRe.exec(src))) {
    const first = tm[1].split(',').map(c => c.trim().split(/\s+/)[0]);
    if (first.some(c => /^all$/i.test(c))) {
      const line = src.slice(0, tm.index).split('\n').length;
      g.fail(f + ':' + line, 'compositor',
        'this transition names "all" — that forces the browser to watch every property on the element for a change instead of the one or two that actually move; name the specific properties instead');
    }
  }
});

/* ---- (3) THE CRITICAL GUARD: zero keyframes anywhere is a failure ------- */
g.check(totalKeyframes > 0, 'compositor', 'coverage',
  'the scan found zero @keyframes blocks across ' + cssFiles.length + ' css file(s) — that reads as "nothing to check", and an empty match must never read as a pass (the ks3-dt qa-year-worlds rule)');

g.note(totalKeyframes + ' @keyframes block(s) checked across ' + cssFiles.length + ' file(s)');
g.done();
