#!/usr/bin/env node
/* l5-resume-test — Two Lights, coming back in a later lesson (deep check 25 Oct 2026).
   One hour a fortnight: many pupils stop mid-chapter and come back two weeks later. The page saves the room's boat
   with her lines. A boat left drifting in an earlier lesson must start again from the mark, not open on the rocks
   and rewind at once. A reload in the same lesson keeps the boat where it was. Her code is kept either way.
   CONTROL: the engine live before the deep check (commit 38746c9, Version 72) must open on the rocks.
   Usage: node l5-resume-test.js */
'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const DIR = path.join(__dirname, '../../platform/assets/twolights');
const BEFORE = '38746c9';
let checks = 0, fails = 0;
function must(ok, what) { checks++; if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); return ok; }
function clockMake(t) {
  const q = [];
  return { now: () => t, setTimeout: (f, ms) => q.push({ at: t + ms, f }),
    advance(ms) { t += ms; q.sort((x, y) => x.at - y.at); while (q.length && q[0].at <= t) q.shift().f(); } };
}
function fresh(dir) { Object.keys(require.cache).filter(k => k.indexOf(dir) === 0).forEach(k => delete require.cache[k]); }

function sitting(dir, gapMs) {
  fresh(dir);
  const EN = require(path.join(dir, 'engine.js')), CK = require(path.join(dir, 'clock.js'));
  const B = { ch1: 90000, ch2: 90000, ch3: 90000, ch4: 231000 };
  function engine(clock) {
    const bus = EN.makeLocalBus(300, clock), ep = bus.endpoint();
    const E = EN.makeEngine({ seat: 'A', seats: ['A'], room: null, stage: 'ch2', bus: ep, clock, budgets: B });
    ep.on(m => E.receive(m)); return E;
  }
  /* lesson one: she starts chapter 2, types for 40 s, and the lesson ends */
  const c1 = clockMake(1e12), E1 = engine(c1);
  E1.edit('blasts = 3\n# half done', 1); c1.advance(40000); E1.tick();
  const saved = JSON.parse(JSON.stringify(E1.snapshot()));
  /* the next sitting, gapMs later */
  const c2 = clockMake(1e12 + 40000 + gapMs), E2 = engine(c2);
  E2.restore(saved); E2.setStage('ch2');
  c2.advance(1000); E2.tick(); c2.advance(1000); E2.tick();
  const b = E2.S.boat.ch2 || { t0: null, fails: [] };
  const pos = CK.position({ t0: b.t0, pauses: b.pauses, fails: b.fails, doneAt: b.doneAt }, c2.now(), B.ch2);
  return { x: pos.x, black: pos.black, fails: b.fails.length, code: E2.code('A', 'ch2') };
}

const later = sitting(DIR, 14 * 24 * 3600000), soon = sitting(DIR, 20000);
console.log('  fixed code: two weeks later x ' + later.x.toFixed(2) + ' black ' + later.black + ' fails ' + later.fails + ' · 20 s later x ' + soon.x.toFixed(2) + ' fails ' + soon.fails);
must(later.x < 0.05 && !later.black && later.fails === 0, 'two weeks later the boat starts again from the mark, no rewind');
must(later.code === 'blasts = 3\n# half done', 'two weeks later her code is still there');
must(soon.x > 0.5 && soon.fails === 0, 'a reload in the same lesson keeps the boat where it was (x ' + soon.x.toFixed(2) + ')');
const src = fs.readFileSync(path.join(__dirname, '../../platform/engines.js'), 'utf8');
must(/Date\.now\(\) - draft\.tlT0 > 3 \* 3600000\)\) draft\.tlT0 = Date\.now\(\)/.test(src), 'the lesson clock for "Running out of time?" starts again when it is more than 3 hours old');

let oldDir = null;
try {
  oldDir = fs.mkdtempSync(path.join(os.tmpdir(), 'l5-resume-old-'));
  const repo = path.join(__dirname, '../../..');
  fs.readdirSync(DIR).filter(f => /\.js$/.test(f)).forEach(f => {
    try { fs.writeFileSync(path.join(oldDir, f), require('child_process').execSync('git show ' + BEFORE + ':ks3-dt/platform/assets/twolights/' + f, { cwd: repo, stdio: ['ignore', 'pipe', 'ignore'] })); }
    catch (e) { fs.copyFileSync(path.join(DIR, f), path.join(oldDir, f)); }
  });
} catch (e) { oldDir = null; }
if (oldDir) {
  const old = sitting(oldDir, 14 * 24 * 3600000);
  console.log('  CONTROL old code: two weeks later x ' + old.x.toFixed(2) + ' black ' + old.black + ' fails ' + old.fails);
  must(old.black || old.fails > 0 || old.x >= 0.99, 'CONTROL the old engine opens on the rocks two weeks later');
} else must(false, 'CONTROL: no old code to run against');
console.log('\nl5-resume: ' + (fails ? 'FAIL · ' + fails + ' of ' + checks : 'PASS · ' + checks + ' checks'));
process.exit(fails ? 1 : 0);
