#!/usr/bin/env node
/* qa-human-pace.js — EVERY CLOCK THAT CAN CUT A PUPIL OFF IS WRITTEN DOWN (J13e).
 *
 * DFM 269, from his J2 Lesson 3 sit: "A TIME BUDGET MEASURES THE PROGRAM'S WORK,
 * NEVER THE PUPIL'S TYPING." The five-second run budget was being spent on a
 * twelve-year-old reading a question and typing an answer, so every conversation
 * answered at human speed died — and it survived every gate because every
 * walker, probe and preview partner answers in milliseconds. The gap class is
 * named in the law's second half: **any budget, timeout or threshold that a
 * pupil's ordinary human pace can trip is tested AT HUMAN PACE before it ships.**
 *
 * A LAW WITH NO INVENTORY IS A LAW ABOUT ONE CONSTANT. So every time constant in
 * the two engine files is FOUND (never listed), and each one owes a row in
 * `HUMAN_PACE_INVENTORY.md` saying what it bounds and why it is safe at the pace
 * a real child works. A NEW constant with no row FAILS — the same ratchet shape
 * as the engine-strings debt, and for the same reason: the next one of these
 * will be introduced by somebody who has forgotten this ever happened.
 *
 * THE KEY IS STABLE ACROSS EDITS, deliberately: `file :: nearest named function
 * :: value`. Line numbers move every time a comment is added, and an inventory
 * keyed on them would go stale on its first day and be quietly abandoned — the
 * DFM 144 stale-copy fault, built in.
 *
 * WHAT IT CANNOT DO, said plainly: it cannot tell a safe number from a dangerous
 * one. It refuses a constant nobody has thought about, and it makes the thinking
 * readable. Whether 5,000 ms is right is a judgement; whether anybody made it is
 * a fact, and facts get gates (DFM 235).
 *
 *   node qa-human-pace.js            check
 *   node qa-human-pace.js --scaffold print rows for anything missing
 */
'use strict';
const fs = require('fs');
const path = require('path');

const PLATFORM = path.resolve(__dirname, '..', '..', 'platform');
const FILES = ['engines.js', 'app.js'];
const INVENTORY = path.join(__dirname, 'HUMAN_PACE_INVENTORY.md');
const SCAFFOLD = process.argv.includes('--scaffold');

let failures = 0;
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};

/* every millisecond literal that can hold a pupil up or cut her off: a timer, an
   interval, a declared budget, or a per-step stagger. The floor is 200ms because
   below that nothing is perceptible as a wait; the ceiling keeps stray large
   integers (pixel maths, byte caps) out. */
const PAT = new RegExp([
  'setTimeout\\s*\\([^,]{0,400}?,\\s*(\\d{3,6})\\s*\\)',
  'setInterval\\s*\\([^,]{0,400}?,\\s*(\\d{3,6})\\s*\\)',
  '(?:LIMIT_MS|limitMs|_MS|Ms|MS)\\s*[:=]\\s*(\\d{3,6})',
  '\\b(\\d{3,6})\\s*\\*\\s*\\(?[a-zA-Z_]'
].join('|'), 'gs');
const NAME = /(?:function\s+([A-Za-z0-9_$]+)\s*\(|^\s*([A-Za-z0-9_$]+)\s*:\s*function|\bvar\s+([A-Za-z0-9_$]+)\s*=)/gm;

function scan() {
  const out = [];
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(PLATFORM, f), 'utf8');
    const names = [];
    let n;
    NAME.lastIndex = 0;
    while ((n = NAME.exec(src)) !== null) names.push([n.index, n[1] || n[2] || n[3]]);
    PAT.lastIndex = 0;
    let m;
    while ((m = PAT.exec(src)) !== null) {
      const ms = Number(m[1] || m[2] || m[3] || m[4]);
      if (!ms || ms < 200 || ms > 600000) continue;
      let owner = '(top level)';
      for (const [pos, nm] of names) { if (pos < m.index) owner = nm; else break; }
      out.push({
        file: f, owner: owner, ms: ms,
        line: src.slice(0, m.index).split('\n').length,
        snippet: m[0].replace(/\s+/g, ' ').slice(0, 74),
        key: f + ' :: ' + owner + ' :: ' + ms
      });
    }
  }
  /* one row per KEY, not per occurrence: the same constant used twice in one
     function is one decision, and asking for it twice would be busywork that
     teaches an inventory to be ignored */
  const seen = new Set(), uniq = [];
  out.forEach(r => { if (!seen.has(r.key)) { seen.add(r.key); uniq.push(r); } });
  return uniq;
}

(async () => {
  console.log('qa-human-pace — every clock that can cut a pupil off, written down (J13e / DFM 269)\n');
  const found = scan();
  check(found.length > 0, 'found ' + found.length + ' time constant(s) across ' + FILES.join(' + ') +
    ', DERIVED from the source rather than listed');

  if (!fs.existsSync(INVENTORY)) {
    check(false, 'HUMAN_PACE_INVENTORY.md exists');
  } else {
    const inv = fs.readFileSync(INVENTORY, 'utf8');
    const rows = inv.split('\n').filter(l => /^\s*\|/.test(l) && !/^\s*\|\s*-+/.test(l));
    check(rows.length >= 5, 'the inventory carries real rows (' + rows.length + ')');

    const missing = found.filter(r => inv.indexOf(r.key) === -1);
    check(missing.length === 0,
      'every constant has a row saying what it bounds and why it is safe at human pace (' +
      (found.length - missing.length) + ' of ' + found.length + ')' +
      (missing.length ? '\n           NO ROW:\n           ' +
        missing.map(r => r.key + '   [' + r.file + ':' + r.line + '] ' + r.snippet).join('\n           ') : ''));

    /* AND THE OTHER DIRECTION, so the file cannot rot into fiction: a row for a
       constant that no longer exists is a claim about code that is gone. */
    const keys = new Set(found.map(r => r.key));
    const stale = rows
      .map(l => (l.match(/\|\s*`([^`]+)`\s*\|/) || [])[1])
      .filter(Boolean)
      .filter(k => !keys.has(k));
    check(stale.length === 0,
      'and no row describes a constant that no longer exists (' + stale.length + ' stale)' +
      (stale.length ? '\n           STALE: ' + stale.join('\n           STALE: ') : ''));

    /* THE RUN BUDGET IS NAMED SPECIFICALLY, because it is the one that cost him
       an hour, and a general inventory that happened not to mention it would be
       an inventory that had learned nothing. */
    check(/PyRun :: 5000|DEFAULT_LIMIT_MS/.test(inv),
      'the run budget itself (DFM 269) has its own row, by name');
    check(/execStart|reset|input\(\s*\)/i.test(inv),
      'and that row says how the clock is reset while she is typing');
  }

  if (SCAFFOLD) {
    console.log('\n--- SCAFFOLD ---');
    const inv = fs.existsSync(INVENTORY) ? fs.readFileSync(INVENTORY, 'utf8') : '';
    found.filter(r => inv.indexOf(r.key) === -1).forEach(r =>
      console.log('| `' + r.key + '` | ' + r.snippet + ' | ??? | ??? |'));
  }

  console.log('\n--- CONTROL: the ratchet really bites');
  {
    const inv = fs.existsSync(INVENTORY) ? fs.readFileSync(INVENTORY, 'utf8') : '';
    const invented = 'engines.js :: someNewFunction :: 4321';
    control(inv.indexOf(invented) === -1,
      'a constant nobody has written a row for is not silently present in the inventory');
    const src = fs.readFileSync(path.join(PLATFORM, 'engines.js'), 'utf8');
    control(/DEFAULT_LIMIT_MS: 5000/.test(src) && /Sk\.execStart = Date\.now\(\)/.test(src),
      'the run budget is still 5,000 ms AND the clock is still reset as an answer arrives — ' +
      'the inventory is describing the code that is really there');
  }

  console.log('\n' + (failures ? 'qa-human-pace: ' + failures + ' FAILURE(S)' : 'qa-human-pace: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();
