#!/usr/bin/env node
/* walk-moves-defer-proof.js — THE CARD QUESTION, ANSWERED ALL THREE WAYS.
 *
 * `WRONG_MOVES['pyrun-place']` asks the card it is standing on whether its placed
 * rows offer a labelled way back, and does one of three things with the answer:
 * run the confused route, return 'defer' so the ordinary mover takes the card, or
 * — before anything is placed, when the card cannot yet be asked — place a line
 * the ANSWER wants and ask again next turn.
 *
 * On today's content EVERY pyrun card offers a way back (DFM 272 went to all six
 * lessons on his consistency ruling), so the 'defer' branch is never exercised by
 * a real walk and would otherwise ship untested — which is exactly how the gate it
 * replaces went stale unnoticed. This proves all three against a fake DOM: the
 * mover only ever touches `document` and `window`, so no browser is needed.
 *
 *   node walk-moves-defer-proof.js        (exits non-zero if any answer is wrong)
 */
const WALK = require('./lib/walk-moves.js');
const mv = WALK.WRONG_MOVES['pyrun-place'];

function fakeDoc({ placedRows, takeBack, trayLines }) {
  const clicks = [];
  const node = (cls, si) => ({
    _cls: cls, _si: si,
    getAttribute: (a) => (a === 'data-si' ? String(si) : a === 'data-build' ? 'b1' : null),
    querySelector: (s) => (s === 'code' ? { click: () => clicks.push('tray:' + si) } : null),
    click: () => clicks.push('tray:' + si),
  });
  const tray = trayLines.map((si) => node('tray', si));
  const doc = {
    querySelector: (s) => {
      if (s === '.pyrun-card') return { getAttribute: () => 'b1' };
      if (s === '.pyp-list li .pyrun-line') return placedRows ? {} : null;
      if (s === '.pyp-list .take-back') return takeBack ? {} : null;
      return null;
    },
    querySelectorAll: (s) => {
      if (s === '.pyt-list .pyrun-line') return tray;
      if (s === '.pyp-list .pyrun-line') return new Array(placedRows).fill(node('placed', 0));
      return [];
    },
  };
  return { doc, clicks };
}

function run(state) {
  const { doc, clicks } = fakeDoc(state);
  global.document = doc;
  global.window = { __walkKey: () => ({ order: [0, 1, 2, 3] }) };
  const out = mv();
  return { out, clicks };
}

const cases = [
  ['nothing placed yet  -> places the line the ANSWER wants, no defer',
    { placedRows: 0, takeBack: false, trayLines: [3, 0, 1, 2] }, null, ['tray:0']],
  ['placed, NO way back -> defers to the ordinary mover',
    { placedRows: 1, takeBack: false, trayLines: [3, 1, 2] }, 'defer', []],
  ['placed, way back    -> takes the next tray line, decoys and all',
    { placedRows: 1, takeBack: true, trayLines: [5, 1, 2] }, null, ['tray:5']],
];

let bad = 0;
for (const [name, state, wantOut, wantClicks] of cases) {
  const { out, clicks } = run(state);
  const ok = (out || null) === wantOut && JSON.stringify(clicks) === JSON.stringify(wantClicks);
  if (!ok) bad++;
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (ok ? '' : `   [got ${JSON.stringify({ out, clicks })}]`));
}
console.log(bad ? `\n${bad} FAILURE(S)` : '\nthe card question answers all three ways');
process.exit(bad ? 1 : 0);
