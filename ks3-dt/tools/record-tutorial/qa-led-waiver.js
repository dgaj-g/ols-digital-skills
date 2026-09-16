#!/usr/bin/env node
/* qa-led-waiver.js — DFM 282: THE J1 LESSON 3 LED PANEL IS A DATED WAIVER, AND ONLY IT.
 *
 * His ruling, 14 Sep 2026: "no need to bring this up again." The two readability
 * rows on j1-03's LED score display (gold seven-segment digits on a near-black
 * strip, where the sampled plate is the digits' own glow) become a dated
 * WAIVED-BY-HIS-RULING exemption in the readability walk — printed as waived,
 * never as a finding — the DFM 255/261 shape.
 *
 * The waiver has ONE home (lib/state-audit.js, `readabilityWaiver`) and both
 * walkers ask it. This file proves the exemption is exactly as wide as his ruling:
 *   · the two LED selectors on Lesson 3 are waived;
 *   · CONTROL — the SAME selectors on any other lesson are NOT waived, and any
 *     OTHER surface on Lesson 3 is NOT waived: an un-waived surface still fails.
 * The integration half is the walkers' own logs: sit-review 3 must print the two
 * rows as WAIVED-BY-HIS-RULING and no UNREADABLE row for .led-digits (see the
 * battery's sit-review-3 log after this change), which is what makes the waiver a
 * fact on the surface rather than a promise in a file.
 *
 *   node qa-led-waiver.js
 */
'use strict';
const SA = require('./lib/state-audit.js');

let failures = 0;
const check = (ok, m, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m + (!ok && d ? ' — ' + d : '')); if (!ok) failures++; };
const control = (ok, m, d) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m + (!ok && d ? ' — ' + d : '')); if (!ok) failures++; };

console.log('qa-led-waiver — DFM 282, the J1 L3 LED panel is waived, and nothing else is\n');
const w1 = SA.readabilityWaiver('3', '.led-digits.led-now');
const w2 = SA.readabilityWaiver('3', '.led-digits.led-cleared.rolling');
const w3 = SA.readabilityWaiver('3', '.led-digits.led-cleared');
check(!!w1 && w1.rule === 'DFM 282' && w1.ruled === '2026-09-14', 'the LED "now" digits on Lesson 3 are waived under DFM 282, dated 14 Sep 2026', JSON.stringify(w1));
check(!!w2 && !!w3, 'the LED "cleared" digits (rolling or still) on Lesson 3 are waived too');
check(/No need to bring this up again/i.test(w1.why) && /never raised again/i.test(w1.why), 'the row carries his words and the never-again clause');
check(SA.READABILITY_WAIVERS.length === 1, 'exactly ONE waiver row exists — the exemption is no wider than his ruling (' + SA.READABILITY_WAIVERS.length + ')');

/* the walkers' own lesson keys, both spellings */
check(!!SA.readabilityWaiver('J1-3'.replace('J1-', ''), '.led-digits.led-now'), 'the key the walkers pass ("3") is the key the row uses');

control(SA.readabilityWaiver('j2-3', '.led-digits.led-now') === null, 'the same digits on ANOTHER lesson (j2-3) are NOT waived — still a finding');
control(SA.readabilityWaiver('4', '.led-digits.led-now') === null, 'nor on J1 Lesson 4');
control(SA.readabilityWaiver('3', '.pyc-out') === null, 'another surface on Lesson 3 (.pyc-out) is NOT waived — an un-waived surface still fails');
control(SA.readabilityWaiver('3', '.led-cell') === null, 'the LED strip\'s label cell is NOT waived — only the two digit surfaces he ruled on');
control(SA.readabilityWaiver('3', '.led-digits.led-now.something-else') === null, 'the match is exact — a longer selector with the same prefix is not swallowed');

console.log('');
if (failures) { console.log('qa-led-waiver: ' + failures + ' FAILURE(S)'); process.exit(1); }
console.log('qa-led-waiver: ALL GREEN');
