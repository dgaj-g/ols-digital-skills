#!/usr/bin/env node
/* qa-cache-scope.js — THE RATCHET ON SHARED STATE.
 *
 * G-F7 / DFM 248, 249. FAULT: state two users must both see, put in a cache
 * that is per-user; and its sibling, an offline key that is not qualified by
 * the class, so a save made in one class resumes in another.
 *
 * The whitelist here is EMPTY on purpose: nothing in this server needs
 * CacheService, so the ratchet is "not at all" rather than "only here" — the
 * cheapest rule to hold and the only one that cannot rot.
 *
 * FROM: ks3-dt qa-cache-scope.js + qa-draft-scope.js (mechanism copied at
 * bdd8c5a; the whitelist emptied, the key shape rewritten for maths).
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { stripComments } = require('./lib/decl.js');

const TIER = 'fast';
const ORDER = 47;
const COVERS = { books: '*', kinds: [], surfaces: [], widths: [], projector: false, tier: ['preview', 'built'], cells: ['two-homes'] };
const CONTROLS = [
  { id: 'cacheservice-planted', kind: 'mutation', mustFail: /CacheService/ },
  { id: 'key-without-class', kind: 'mutation', mustFail: /not qualified by the class/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const g = new Gate('qa-cache-scope');
g.exempt(['the CacheService whitelist is EMPTY: no use is legitimate in this server, so none is exempt']);

/* ---- (1) the template holds no CacheService at all --------------------- */
const tpl = A.app('server/Code.gs.template');
const src = stripComments(A.read(tpl));
const lines = src.split('\n');
let fn = '(top level)';
lines.forEach((l, i) => {
  const f = /function\s+([A-Za-z_$][\w$]*)/.exec(l);
  if (f) fn = f[1];
  if (/\bCacheService\b/.test(l)) {
    g.fail('Code.gs.template :: ' + fn, 'cache-scope',
      'CacheService appears in ' + fn + ' — a per-user cache is invisible to the second user who needs the same fact (DFM 248)');
  }
});
g.pass('no CacheService in the server template');

/* ---- (2) the offline store's keys are class-qualified ------------------ */
const client = stripComments(A.read(A.app('script.js')));
const outbox = /outbox:/.test(client);

/* A NAME IS NOT A KEY. The first cut of this gate read the variable NAME at the
   call site and condemned `LSKEY` — which is `'gj-offline-v1'`, the single key
   holding the whole offline store, and that store is class-qualified INSIDE
   itself (`s.data[class][email][act]`). A gate that invents a fault is worse
   than no gate (L6), so the constant is resolved to its literal first, and the
   whole-store key is named as the one declared exemption. */
const consts = {};
let cm; const reConst = /(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*'([^']*)'/g;
while ((cm = reConst.exec(client))) consts[cm[1]] = cm[2];
const WHOLE_STORE = 'gj-offline-v1';
g.exempt(['the single whole-store key "' + WHOLE_STORE + '" is exempt: it holds one object whose own shape is data[class][email][act], so it IS class-qualified']);

[/localStorage\.(?:setItem|getItem|removeItem)\(\s*([^,)]+)/g].forEach(re => {
  let m;
  while ((m = re.exec(client))) {
    const expr = m[1].trim();
    const literal = /^'([^']*)'$/.test(expr) ? expr.slice(1, -1) : consts[expr];
    if (literal === WHOLE_STORE) continue;
    if (/class|BOOT\.classCode|cls|CLASS/.test(expr)) continue;
    if (literal && /:/.test(literal) === false && /class/i.test(literal)) continue;
    g.fail('script.js', 'cache-scope',
      'a localStorage key is not qualified by the class (' + expr.slice(0, 60) +
      (literal ? ' = "' + literal + '"' : '') + ') — a draft made in one class would resume in another (DFM 249)');
  }
});
g.note('outbox keys present: ' + outbox);
g.done();
