#!/usr/bin/env node
/* l5-extra-test — Two Lights, a line she added that is not part of the program (deep check 25 Oct 2026).
   Every fault fixed, but she also typed a line of her own that Python accepts (a copied print, a spare sum).
   The chapter is not clean, so it cannot finish; the bar must name that line and tell her to delete it,
   not say "Press RUN" for ever. Once the line is gone the chapter finishes.
   CONTROL: the engine live before the deep check (commit 38746c9, Version 72) must leave her on "Press RUN".
   Usage: node l5-extra-test.js */
'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const DIR = path.join(__dirname, '../../platform/assets/twolights');
const BEFORE = '38746c9';
let checks = 0, fails = 0;
function must(ok, what) { checks++; if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); return ok; }

function clockMake() {
  let t = 1e12; const q = [];
  return { now: () => t, setTimeout: (f, ms) => q.push({ at: t + ms, f }),
    advance(ms) { t += ms; q.sort((x, y) => x.at - y.at); while (q.length && q[0].at <= t) q.shift().f(); } };
}
function fresh(dir) { Object.keys(require.cache).filter(k => k.indexOf(dir) === 0).forEach(k => delete require.cache[k]); }

/* one seat on her own, chapter c: type `code`, wait, RUN, wait; what does the bar say, and is the chapter done? */
function attempt(dir, c, code) {
  fresh(dir);
  const EN = require(path.join(dir, 'engine.js'));
  const clock = clockMake(), bus = EN.makeLocalBus(300, clock), ep = bus.endpoint();
  const E = EN.makeEngine({ seat: 'A', seats: ['A'], room: null, stage: c, bus: ep, clock, budgets: { ch1: 1e9, ch2: 1e9, ch3: 1e9, ch4: 1e9 } });
  ep.on(m => E.receive(m));
  E.edit(code, 1); clock.advance(3000); E.tick();
  E.run(); clock.advance(3000); E.tick();
  const b = E.bar() || {};
  return { E, clock, id: b.id || '', n: b.vars && b.vars.n, done: !!E.S.L.A.done[c] };
}

function cases(dir, label) {
  fresh(dir);
  const PR = require(path.join(dir, 'programs.js'));
  const SEAT = PR.SEATS.A;
  const good = { ch1: PR.ch1(SEAT, 2), ch2: PR.ch2(SEAT, true), ch3: PR.ch3(SEAT, 'after') };
  const out = {};
  /* a copied print at the end of chapter 1 */
  const l1 = good.ch1.replace(/\s*$/, '') .split('\n'); l1.push('print("hello")');
  out.endPrint = attempt(dir, 'ch1', l1.join('\n') + '\n'); out.endLine = l1.length;
  /* a spare sum in the middle of chapter 2 */
  const l2 = good.ch2.split('\n'); l2.splice(2, 0, 'x = 5');
  out.midSum = attempt(dir, 'ch2', l2.join('\n'));
  /* the clean programs still finish (nothing extra named) */
  out.clean1 = attempt(dir, 'ch1', good.ch1);
  out.clean3 = attempt(dir, 'ch3', good.ch3);
  /* she deletes the line the bar named: the chapter finishes */
  if (out.endPrint.id === 'bar.extra') {
    const E = out.endPrint.E, c = out.endPrint.clock;
    E.edit(good.ch1, 1); c.advance(3000); E.tick(); E.run(); c.advance(3000); E.tick();
    out.afterDelete = !!E.S.L.A.done.ch1;
  }
  console.log('  ' + label + ': end print → ' + out.endPrint.id + ' ' + (out.endPrint.n || '') + ' done ' + out.endPrint.done +
    ' · middle sum → ' + out.midSum.id + ' ' + (out.midSum.n || '') + ' done ' + out.midSum.done +
    ' · clean ch1 → ' + out.clean1.id + ' done ' + out.clean1.done + ' · clean ch3 → ' + out.clean3.id + ' done ' + out.clean3.done);
  return out;
}

const now = cases(DIR, 'fixed code');
must(!now.endPrint.done, 'a program with a line of her own is not finished');
must(now.endPrint.id === 'bar.extra' && now.endPrint.n === now.endLine, 'the bar names the extra print line to delete (line ' + now.endPrint.n + ', want ' + now.endLine + ')');
must(now.midSum.id === 'bar.extra' && now.midSum.n === 3, 'the bar names a spare line in the middle (line ' + now.midSum.n + ', want 3)');
must(now.afterDelete === true, 'once she deletes it, the chapter finishes');
must(now.clean1.done && now.clean1.id !== 'bar.extra', 'a clean chapter 1 finishes, nothing named');
must(now.clean3.done && now.clean3.id !== 'bar.extra', 'a clean chapter 3 finishes, nothing named');
fresh(DIR);
const TS = require(path.join(DIR, 'strings.js'));
must(/^Line 6 is not part of this program\. Delete it\.$/.test(TS.render('bar.extra', { n: 6 })), 'the line reads: ' + TS.render('bar.extra', { n: 6 }));

let oldDir = null;
try {
  oldDir = fs.mkdtempSync(path.join(os.tmpdir(), 'l5-extra-old-'));
  const repo = path.join(__dirname, '../../..');
  fs.readdirSync(DIR).filter(f => /\.js$/.test(f)).forEach(f => {
    try { fs.writeFileSync(path.join(oldDir, f), require('child_process').execSync('git show ' + BEFORE + ':ks3-dt/platform/assets/twolights/' + f, { cwd: repo, stdio: ['ignore', 'pipe', 'ignore'] })); }
    catch (e) { fs.copyFileSync(path.join(DIR, f), path.join(oldDir, f)); }
  });
} catch (e) { oldDir = null; }
if (oldDir) {
  const old = cases(oldDir, 'CONTROL code before the deep check');
  must(!old.endPrint.done && old.endPrint.id === 'bar.run', 'CONTROL the old engine leaves her on "Press RUN" with the chapter unfinished');
} else must(false, 'CONTROL: no old code to run against');

console.log('\nl5-extra: ' + (fails ? 'FAIL · ' + fails + ' of ' + checks : 'PASS · ' + checks + ' checks'));
process.exit(fails ? 1 : 0);
