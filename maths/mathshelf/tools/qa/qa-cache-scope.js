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
  { id: 'cacheservice-planted', kind: 'mutation', plant: 'fixture-cacheservice', mustFail: /CacheService/ },
  { id: 'key-without-class', kind: 'mutation', plant: 'fixture-key-without-class', mustFail: /no class in it/ },
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

/* A KEY BUILT BY A FUNCTION IS STILL A KEY. The outbox calls outboxKey(act),
   and that function's own body is `'outbox:' + BOOT.classCode + ':' + email +
   ':' + actId` - properly class-qualified. Reading only the call site condemned
   it three times over, which is a gate inventing a fault (L6). So a call to a
   local function is followed into that function's body and the same question is
   asked there. A builder this cannot resolve is REPORTED as unresolved, never
   silently passed. */
function builderBody(name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n  \\}');
  const m = re.exec(client);
  return m ? m[1] : null;
}
const CLASS_QUALIFIED = /class|BOOT\.classCode|cls|CLASS/;

[/localStorage\.(?:setItem|getItem|removeItem)\(\s*([^,)]+)/g].forEach(re => {
  let m;
  while ((m = re.exec(client))) {
    const expr = m[1].trim();
    const literal = /^'([^']*)'$/.test(expr) ? expr.slice(1, -1) : consts[expr];
    if (literal === WHOLE_STORE) continue;
    if (CLASS_QUALIFIED.test(expr)) continue;
    const call = /^([A-Za-z_$][\w$]*)\s*\(/.exec(expr);
    if (call) {
      const body = builderBody(call[1]);
      if (body == null) {
        g.fail('script.js', 'cache-scope',
          'a localStorage key is built by ' + call[1] + '() and this gate cannot read that function - resolve it or inline the key, because an unread key is an unchecked key');
        continue;
      }
      if (CLASS_QUALIFIED.test(body)) { g.pass(call[1] + '() builds a class-qualified key'); continue; }
      g.fail('script.js', 'cache-scope',
        call[1] + '() builds a localStorage key with no class in it - a draft made in one class would resume in another (DFM 249)');
      continue;
    }
    g.fail('script.js', 'cache-scope',
      'a localStorage key is not qualified by the class (' + expr.slice(0, 60) +
      (literal ? ' = "' + literal + '"' : '') + ') - a draft made in one class would resume in another (DFM 249)');
  }
});
g.note('outbox keys present: ' + outbox);
g.done();
