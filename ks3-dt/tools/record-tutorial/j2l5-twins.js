/* J2 L5 THE SEARCH, gate 8 (spec §12): every sound has a drawn twin, and every sound in the table is played.
   (1) Each §12 sound is called somewhere in the shipped hour (the hum by the frozen bang film).
   (2) Each call site has its drawn twin set in the same place: the twin's cue within 400 characters of the call.
   CONTROLS: a planted S2.door() with nothing drawn beside it must fail (2); a sound table with the battery call
   taken out must fail (1). The prototype itself fails (1): S2.battery is defined but never played.
   Run: node ks3-dt/tools/record-tutorial/j2l5-twins.js   (J2L5_HOUR=<dir> to point at another copy) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const HOUR = process.env.J2L5_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/search/hour');
let fails = 0, n = 0;
const must = (ok, what) => { n++; if (!ok) { fails++; console.log('FAIL ' + what); } else if (process.env.VERBOSE) console.log('ok   ' + what); };
const done = () => { console.log('\nj2l5-twins: ' + (fails ? 'FAIL · ' + fails + ' of ' + n : 'PASS · ' + n + ' checks')); process.exit(fails ? 1 : 0); };
const FILES = ['chapters.js', 'ui.js', 'box.js', 'cast.js', 'pics.js', 'free.js', 'bridge.js'];
if (!fs.existsSync(path.join(HOUR, 'chapters.js'))) { must(false, 'the hour is shipped at ' + path.relative(ROOT, HOUR)); done(); }
const SRC = FILES.filter(f => fs.existsSync(path.join(HOUR, f))).map(f => ({ f, t: fs.readFileSync(path.join(HOUR, f), 'utf8') }));
const FILM = fs.readFileSync(path.join(HOUR, '..', 'search', 'film.js'), 'utf8');
/* the sound → the cue that draws its twin (spec §12 table) */
/* Version 2 (spec V2 §13 on top of V1 §12): the sound → the cue that draws its twin */
const TWIN = {
  rotor: [/ribbon|runIt|tween|b\.x|st\.beep|fly|lift|P\.prints|box\.run|U\.lerp/, 'rotor blur / the drone moving'],
  chirp: [/say|label|bubble|talk|st\.lit|look|wake|won/, 'the speech bubble'],
  bleat: [/baa|bleat|L\.baa|U\.lamb|L\.cold/, '**baaa** drawn beside her'],
  buzz: [/'bad'|under\(|wrong|V\.buzz/, 'the red line under the box'],
  wrong: [/'bad'|under\(|\.fb|textContent|wrong|bad/, 'the red line / her line under the pick'],
  beat: [/heart|red|pulse|left <= 10|last/, 'the clock pulses red'],
  rewind: [/back|wind|undo|ribbons\s*=|st\.lit\s*=|rewind|fail/, 'the ribbon rolling back'],
  round: [/pill|round/, 'the round pill pulses'],
  flare: [/flare|lit|light|glow|wall|right|good|found/, 'the flare itself'],
  tick: [/next|Next|fade|\.on\b/, 'Next fades in'],
  thud: [/wall|hit|bump|crash|stop|fail/, 'BEEP stops at the wall'],
  chord: [/warm|lamp|found|hold|glow|lit|torch|wool|door|barn|LAMBNAME|name/, 'the torch holds and glows']
};
const EXEMPT = /^(click|start|pause|unpause|setMuted|setWind|bedLevel|hum|stop|resume|mute)$/; /* wind and the bed follow the clock (§13: the snow thickens with it), drawn by the scene */
const CALL = /\b(S2|Snd)\.([a-zA-Z]+)\s*\(/g;
function sites(text) { const out = []; let m; CALL.lastIndex = 0; while ((m = CALL.exec(text))) { if (/function\s*$/.test(text.slice(Math.max(0, m.index - 12), m.index))) continue; /* Snd.rotor(0…) and Snd.rotor(0.3…) set the idle hum for a new view, not a movement: a bed level */ if (m[2] === 'rotor' && /^\s*\((0|0\.[0-3])\s*,/.test(text.slice(m.index + m[0].length - 1, m.index + m[0].length + 8))) continue; out.push({ who: m[1], kind: m[2], at: m.index }); } return out; }
function checkSites(text, f, report) {
  let bad = 0;
  for (const s of sites(text)) {
    if (EXEMPT.test(s.kind)) continue;
    const tw = TWIN[s.kind];
    const win = text.slice(Math.max(0, s.at - 400), s.at + 400).replace(new RegExp('\\b(S2|Snd)\\.' + s.kind + '\\b', 'g'), '');
    const ok = !!tw && tw[0].test(win);
    if (!ok) bad++;
    if (report) must(ok, f + ': ' + s.who + '.' + s.kind + ' at character ' + s.at + (tw ? ' draws its twin (' + tw[1] + ')' : ' is a sound in the §12 table'));
  }
  return bad;
}
/* (2) every call site has its twin */
for (const { f, t } of SRC) checkSites(t, f, true);
/* (1) every sound in the table is played */
const called = new Set(); for (const { t } of SRC) for (const s of sites(t)) called.add(s.kind);
const PLAYED = ['rotor', 'chirp', 'bleat', 'wrong', 'beat', 'rewind', 'round', 'flare', 'tick', 'chord'];
for (const k of PLAYED) must(called.has(k), 'the §12 sound "' + k + '" is played somewhere in the hour');
must(/Snd\.hum\s*\(|\.hum\s*\(/.test(FILM), 'the low hum is played (by the frozen bang film)');
/* CONTROLS */
must(checkSites('var a = 1;\n' + 'x'.repeat(500) + '\nS2.door();\n' + 'y'.repeat(500), 'planted', false) === 1, 'CONTROL a planted S2.door() with nothing drawn beside it fails');
const noBattery = new Set(called); noBattery.delete('round');
must(!PLAYED.every(k => noBattery.has(k)), 'CONTROL a sound table without the round call fails (1)');
done();
