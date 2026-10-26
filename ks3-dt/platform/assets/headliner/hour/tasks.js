/* THE HEADLINER — every judged task of the hour (J2_L6_SPEC.md §7–§11, the probe table). window.Tasks.
   The judge (judge.js) reads these; the screens never mark anything themselves. */
(function (global) {
  'use strict';
  global.Tasks = {
    d3:   { sheet: 'plan', cell: 'D3', expect: 30000, probes: [{ set: { B3: 1300 }, expect: 32500 }, { set: { C3: 30 }, expect: 36000 }] },
    fill: { sheet: 'plan', from: 'D3', to: 'D5', expect: [30000, 1500, 4800], probes: [{ set: { B4: 400 }, expect: [30000, 2000, 4800] }] },
    d6:   { sheet: 'plan', cell: 'D6', expect: 36300, probes: [{ set: { B3: 1300 }, expect: 38800 }, { set: { B5: 500 }, expect: 37500 }] },
    d11:  { sheet: 'plan', cell: 'D11', expect: 38000, probes: [{ set: { D10: 9000 }, expect: 29000 }, { set: { D8: 15000 }, expect: 39000 }] },
    d12:  { sheet: 'plan', cell: 'D12', expect: -1700, probes: [{ set: { D10: 9000 }, expect: 7300 }] },
    /* the C3 probe moves the profit through the ticket price, a route the fee never touches */
    d13:  { sheet: 'plan', cell: 'D13', expect: 'Not yet', kind: 'text', probes: [{ set: { C3: 30 }, expect: 'Book her' }, { set: { D10: 9000 }, expect: 'Book her' }, { set: { D10: 40000 }, expect: 'Not yet' }] },
    c3:   { sheet: 'merch', cell: 'C3', expect: 14.4, probes: [{ set: { B3: 20 }, expect: 24 }, { set: { B1: 0.25 }, expect: 15 }] },
    pin:  { sheet: 'merch', from: 'C3', to: 'C6', expect: [14.4, 36, 9.6, 6], probes: [{ set: { B1: 0.25 }, expect: [15, 37.5, 10, 6.25] }] },
    /* the call: the changes each question asks for, and the true answer the sheet must give (D13) */
    call: [
      { set: { C3: 30 }, truth: 'yes', profit: 4300 },
      { set: { B3: 1000 }, truth: 'no', profit: -1700 },
      { set: { B3: 1100, C3: 32 }, truth: 'yes', profit: 3500 }
    ],
    /* §6.3 the sheet as it starts */
    start: {
      plan: { B3: 1200, C3: 25, B4: 300, C4: 5, B5: 400, C5: 12, D8: 14000, D9: 6000, D10: 18000 },
      merch: { B1: 0.2, B3: 12, B4: 30, B5: 8, B6: 5 }
    }
  };
})(typeof window !== 'undefined' ? window : global);
