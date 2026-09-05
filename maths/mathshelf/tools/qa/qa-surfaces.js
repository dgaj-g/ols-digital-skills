#!/usr/bin/env node
/* qa-surfaces.js — EVERY SCREEN DECLARES ITSELF.
 *
 * G-B1. FAULT: a surface with no `data-surface`, invisible to coverage. A screen
 * a gate cannot name is a screen no gate covers, and it passes under the word
 * PASS for as long as it exists (the DFM 238a hole, one level up).
 *
 * THE CONTRACT (MATHS_GATES_DESIGN 2.4): every screen root and every materially
 * different state of one carries `data-surface` / `data-state`; the app declares
 * the whole set it can ever render in `GJ.app.surfaces`; and the two agree in
 * BOTH directions — a registered id nothing renders is as much a fault as a
 * rendered root nothing registered, because coverage derived from a list that
 * over-claims is coverage that lies.
 *
 * This is the first gate a new surface meets, and the first gate of every run
 * (L10: the cheapest disqualifying question first — "can I see the thing at
 * all?" before fifty true failures with the wrong cause).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { objectEntries, stripComments } = require('./lib/decl.js');

const TIER = 'fast';
const ORDER = 10;

const COVERS = {
  books: '*', kinds: '*', surfaces: '*', widths: [375, 768, 1280],
  projector: true, tier: ['preview', 'built'],
  cells: ['contract']
};
const CONTROLS = [
  { id: 'root-without-attribute', kind: 'fixture', plant: 'fixture-surface-root',
    mustFail: /no data-surface/ },
  { id: 'registered-never-rendered', kind: 'fixture', plant: 'fixture-surface-ghost',
    mustFail: /registers .* but nothing renders it/ },
  { id: 'state-nothing-writes', kind: 'fixture', plant: 'fixture-surface-dead-state',
    mustFail: /no file ever writes it/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-surfaces');
g.exempt([
  'the runtime half runs inside the walkers; this file measures the source and the registry',
  'a root rendered only by a fixture module is not required to be registered — the fixture is never shipped'
]);

/* ---- the registry, read from the app's own source ---------------------- */
function registry() {
  const src = A.app('script.js');
  const entries = objectEntries(src, /GJ\.app\.surfaces\s*=\s*/);
  if (!entries) return null;
  const out = {};
  Object.keys(entries).forEach(k => {
    const states = [];
    const re = /'([^']+)'/g; let m;
    while ((m = re.exec(entries[k]))) states.push(m[1]);
    out[k] = states;
  });
  return out;
}

const REG = registry();
if (!REG) {
  g.fail('app', 'contract', 'script.js declares no GJ.app.surfaces registry — the app cannot say which screens it has, so nothing can prove they are covered');
  g.done();
  process.exit(1);
}

/* ---- (1) the static roots in index.html -------------------------------- */
/* The families of MATHS_GATES_DESIGN 2.4: anything that is a screen, a card, a
   modal or a dock is a root a pupil stands on. Derived from the markup by class
   family, so a screen added next year is caught by existing. */
const html = A.read(A.app('index.html'));
const FAMILY = /class="([^"]*\b(?:gj-screen|scr-[a-z-]+|board|modal|dock)\b[^"]*)"/g;
let m, statics = [];
while ((m = FAMILY.exec(html))) {
  const tagStart = html.lastIndexOf('<', m.index);
  const tagEnd = html.indexOf('>', m.index);
  const tag = html.slice(tagStart, tagEnd + 1);
  statics.push({ tag, cls: m[1], surface: (/data-surface="([^"]+)"/.exec(tag) || [])[1] || null });
}
statics.forEach(s => {
  g.check(!!s.surface, s.cls.split(/\s+/)[1] || s.cls, 'contract',
    'a screen root in index.html carries no data-surface — a screen a gate cannot name is a screen no gate covers  [' + s.tag.slice(0, 90) + ']');
});
g.note(statics.length + ' static roots in index.html, ' + statics.filter(s => s.surface).length + ' declared');

/* ---- (2) every id used anywhere in the client is in the registry -------- */
const used = new Map();      /* id -> Set(states) */
const srcFiles = A.renderFiles().concat([A.app('index.html'), A.app('staff-pages.js')]).filter(f => A.exists(f));
srcFiles.forEach(f => {
  const src = /\.js$/.test(f) ? stripComments(A.read(f)) : A.read(f);
  let r;
  const reAttr = /data-surface="([a-z-]+)"(?:[^>]*?data-state="([a-z0-9-]+)")?/g;
  while ((r = reAttr.exec(src))) {
    if (!used.has(r[1])) used.set(r[1], new Set());
    if (r[2]) used.get(r[1]).add(r[2]);
  }
  /* the helper form: GJ.surface(el, 'shelf', 'some-ticked') */
  const reCall = /surface\(\s*[A-Za-z_$][\w$.]*\s*,\s*'([a-z-]+)'\s*(?:,\s*'([a-z0-9-]+)')?/g;
  while ((r = reCall.exec(src))) {
    if (!used.has(r[1])) used.set(r[1], new Set());
    if (r[2]) used.get(r[1]).add(r[2]);
  }
  /* a state set on its own, on a root whose surface the same call names */
  const reState = /setState\(\s*[A-Za-z_$][\w$.]*\s*,\s*'([a-z-]+)'\s*,\s*'([a-z0-9-]+)'/g;
  while ((r = reState.exec(src))) {
    if (!used.has(r[1])) used.set(r[1], new Set());
    used.get(r[1]).add(r[2]);
  }
  /* THE SHAPE THE MARKBOOK ACTUALLY USES. Its screens are built by one `shell`
     helper that takes an options object, so the id and the state are named as
     `surface: 'x', state: 'y'` and reach the DOM through a variable. Reading
     only the direct-call form left thirteen real, rendered screens looking
     unrendered - the gate would have been demanding that a whole markbook be
     deleted from the registry. A gate has to read the code that exists. */
  const reOpts = /surface:\s*'([a-z-]+)'\s*,\s*state:\s*'([a-z0-9-]+)'/g;
  while ((r = reOpts.exec(src))) {
    if (!used.has(r[1])) used.set(r[1], new Set());
    used.get(r[1]).add(r[2]);
  }
  /* and the fallbacks a helper names for itself */
  const reFallback = /opts\.(?:surface|state)\s*\|\|\s*'([a-z0-9-]+)'/g;
  while ((r = reFallback.exec(src))) { if (!used.has(r[1]) && /-/.test(r[1])) used.set(r[1], new Set()); }
});

used.forEach((states, id) => {
  g.check(!!REG[id], id, 'contract',
    'the client renders data-surface="' + id + '" but GJ.app.surfaces does not list it — coverage would never ask for it');
  if (REG[id]) states.forEach(st => {
    g.check(REG[id].includes(st), id + ':' + st, 'contract',
      'the client renders the state "' + st + '" of ' + id + ' but the registry does not list it');
  });
});

/* ---- (3) both directions: a registered id nothing renders --------------- */
Object.keys(REG).forEach(id => {
  g.check(used.has(id), id, 'contract',
    'GJ.app.surfaces registers "' + id + '" but nothing renders it — a registry that over-claims makes coverage lie');
});

/* ---- (4) the states a registry entry claims are real states ------------- */
Object.keys(REG).forEach(id => {
  g.check(REG[id].length > 0, id, 'contract',
    'GJ.app.surfaces registers "' + id + '" with no states — a surface with no state cannot be walked state by state');
});

/* ---- (5) a state nothing ever WRITES ------------------------------------
   A surface that renders is not the same as a surface that says which of its
   states it is in. Five of the seven question kinds went from "fresh" to
   marked without ever stamping data-state, and book-contents was stamped once
   in the markup and never again - so "mid-book" and "finished" were declared,
   counted in the coverage matrix, and rendered by nothing. A state that no
   file ever writes cannot be stood on, and a matrix that counts it lies. */
{
  /* the registry's own declaration is cut out first: every state is named
     there by definition, so leaving it in would let the list vouch for itself */
  const decl = /GJ\.app\.surfaces\s*=\s*\{[\s\S]*?\n  \};/;
  const SRC = ['script.js', 'jotter.js', 'staff.js', 'player.js', 'staff-pages.js', 'index.html']
    .filter(f => A.exists(A.app(f)))
    .map(f => A.read(A.app(f)).replace(decl, ''))
    .join('\n');
  Object.keys(REG).forEach(id => {
    (REG[id] || []).forEach(st => {
      const esc = st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const written = new RegExp("'" + esc + "'").test(SRC) || new RegExp('"' + esc + '"').test(SRC);
      g.check(written, id + ':' + st, 'contract',
        'GJ.app.surfaces claims the state "' + st + '" on "' + id + '" and no file ever writes it - a state nothing sets cannot be stood on, and the coverage matrix counts it anyway');
    });
  });
}

g.note('registry: ' + Object.keys(REG).length + ' surfaces, ' +
  Object.keys(REG).reduce((n, k) => n + REG[k].length, 0) + ' states');

/* the registry is what qa-coverage derives the REQUIRED surface set from, so it
   is written out where the coverage machine can read it without loading the app */
A.ensureOut();
fs.writeFileSync(A.out('surfaces.json'), JSON.stringify(REG, null, 2));

g.done();
