/* rendered-debt.js — WHICH LESSON RENDERS WHICH ENGINE DEBT, AND THE RATCHET.
 *
 * The ledger (ENGINE_STRINGS_DEBT.md) says which engine sentences no gate reads.
 * This says which of them a PUPIL actually meets, lesson by lesson, and it is
 * the half with teeth.
 *
 * WHY IT IS A RATCHET AND NOT A BAN. Failing every lesson that renders any
 * outstanding string would fail six signed-off lessons on debt that predates
 * this round — which re-opens his approvals, and he ruled on 28 Aug 2026 that
 * approvals are never re-opened (DFM 273a), and DFM 221 says a locked lesson's
 * exposure is REPORTED, never fixed without his word. So: what a shipped build
 * already showed is the ceiling, printed loudly on every run; a sentence
 * reaching a card that did NOT render it before is a FAILURE.
 *
 * That is exactly the shape of the fault it exists to kill. "Exit check —
 * part 2" was old debt on a NEW card: training-2 mounted the parsons engine on
 * 27 August and the parked string walked straight onto a pupil's screen. Under
 * this ratchet that walk fails the moment it happens.
 *
 * The baseline is committed as ENGINE_STRINGS_RENDERED.md; the sidecars the
 * walkers write live in out/rendered-debt/ and are inputs to qa-engine-debt.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '../../../ENGINE_STRINGS_RENDERED.md');
const SIDE = path.join(__dirname, '../out/rendered-debt');

/* lesson -> [sentence] as committed */
function baseline() {
  const out = {};
  if (!fs.existsSync(BASE)) return out;
  fs.readFileSync(BASE, 'utf8').split('\n').forEach((l) => {
    const m = /^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*$/.exec(l);
    if (!m || m[1] === 'lesson') return;
    (out[m[1]] = out[m[1]] || []).push(m[2].replace(/\\\|/g, '|').trim());
  });
  return out;
}

/* what this walk saw, against what the build he approved already showed */
function check(lesson, seen) {
  const now = Array.from(new Set(seen.map((s) => String(s).trim())));
  /* NO CEILING HAS BEEN COMMITTED YET. The very first walk after this gate was
     written has nothing to compare against, and failing it would be a gate
     failing because it is new rather than because anything is wrong. It says so
     — loudly, in the walk's own log — and the next walk has a ceiling to hold.
     It is never silent: an unset ceiling that printed nothing would be exactly
     the "quiet pass" this whole round exists to kill (DFM 204). */
  if (!fs.existsSync(BASE)) return { fresh: [], gone: [], ceiling: 0, unset: true };
  const was = baseline()[String(lesson)] || [];
  return {
    fresh: now.filter((t) => was.indexOf(t) === -1),
    gone: was.filter((t) => now.indexOf(t) === -1),
    ceiling: was.length
  };
}

/* the walker's sidecar, so the pack's own gate can read what the browser saw
   without opening a browser of its own */
function write(lesson, seen) {
  try {
    fs.mkdirSync(SIDE, { recursive: true });
    fs.writeFileSync(path.join(SIDE, String(lesson).replace(/[^\w.-]/g, '_') + '.json'),
      JSON.stringify({ lesson: String(lesson), at: new Date().toISOString(),
        seen: Array.from(new Set(seen.map((s) => String(s).trim()))) }, null, 1) + '\n');
  } catch (e) { /* a sidecar that cannot be written must never stop a walk */ }
}

module.exports = { BASE, SIDE, baseline, check, write };
