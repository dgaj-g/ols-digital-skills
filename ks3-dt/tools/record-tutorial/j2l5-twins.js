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
const FILES = ['chapters.js', 'ui.js', 'main.js', 'cast.js', 'pics.js', 'free.js', 'bridge.js'];
if (!fs.existsSync(path.join(HOUR, 'chapters.js'))) { must(false, 'the hour is shipped at ' + path.relative(ROOT, HOUR)); done(); }
const SRC = FILES.filter(f => fs.existsSync(path.join(HOUR, f))).map(f => ({ f, t: fs.readFileSync(path.join(HOUR, f), 'utf8') }));
const FILM = fs.readFileSync(path.join(HOUR, '..', 'search', 'film.js'), 'utf8');
/* the sound → the cue that draws its twin (spec §12 table) */
const TWIN = {
  rotor: [/ribbon|turtle|st\.tr\b|upto|bob|st\.tx|st\.ty|lift|fly|P\.prints|st\.at\b/, 'rotor blur / the drone moving'],
  chirp: [/U\.bubble|say\(|U\.say|bubble|st\.torch|st\.lit/, 'the speech bubble'],
  count: [/U\.bubble|U\.text\('above'|st\.lit/, 'the speech bubble with the count'],
  bleat: [/st\.bleat|bleatAt|wave|mouth|st\.found/, 'the sound wave, the lamb\'s mouth'],
  buzz: [/'bad'|classList\.(add|toggle)\('bad'|wrong/, 'the red line under the box'],
  heartbeat: [/'low'/, 'the gauge pulses (low)'],
  battery: [/'low'|gauge|ring/, 'the battery gauge, red at the end'],
  rewind: [/upto|back|st\.lit = \[\]|unmake|rewind|fail\[|st\.dark = 0|st\.tr = null/, 'the ribbon rolling back'],
  bark: [/bark|Bran|head/, 'Bran\'s head up, a bark mark'],
  door: [/door|P\.barn/, 'the door swinging in'],
  chord: [/warm|lamp|found|held|glow|lit|'ok'|st\.name|H\.lamb/, 'the lamplight warming / the held moment']
};
const EXEMPT = /^(click|start|pause|unpause|setMuted|setWind|stop|resume|mute)$/;
const CALL = /\b(S2|Snd)\.([a-zA-Z]+)\s*\(/g;
function sites(text) { const out = []; let m; CALL.lastIndex = 0; while ((m = CALL.exec(text))) { if (/function\s*$/.test(text.slice(Math.max(0, m.index - 12), m.index))) continue; out.push({ who: m[1], kind: m[2], at: m.index }); } return out; }
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
const PLAYED = ['rotor', 'chirp', 'bleat', 'buzz', 'heartbeat', 'rewind', 'battery', 'bark', 'door', 'chord'];
for (const k of PLAYED) must(called.has(k), 'the §12 sound "' + k + '" is played somewhere in the hour');
must(/Snd\.hum\s*\(|\.hum\s*\(/.test(FILM), 'the low hum is played (by the frozen bang film)');
/* CONTROLS */
must(checkSites('var a = 1;\n' + 'x'.repeat(500) + '\nS2.door();\n' + 'y'.repeat(500), 'planted', false) === 1, 'CONTROL a planted S2.door() with nothing drawn beside it fails');
const noBattery = new Set(called); noBattery.delete('battery');
must(!PLAYED.every(k => noBattery.has(k)), 'CONTROL a sound table without the battery call fails (1)');
done();
