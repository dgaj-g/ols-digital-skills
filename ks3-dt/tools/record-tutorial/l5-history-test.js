#!/usr/bin/env node
/* l5-history-test — Two Lights live link (assets/twolights/live.js + engine.js), the history burst (deep check 25 Oct 2026).
   Every stage of the hour opens a new page and a new Firebase listener, and Firebase first hands it everything the
   partner has said in the room so far.
   - A hello in that burst is old news (a question already answered) and is dropped, judged on SERVER time, so a laptop
     clock a few seconds out neither drops a live hello nor keeps a stale one. A hello written a moment before the
     listener opened is still live and is kept.
   - A radio slip carries the chapter it was sent in; the engine drops a slip from an earlier chapter, so it is not
     shown again on the next page. A slip from this chapter (her partner reloaded) still lands.
   Run against a fake database that keeps Firebase's order: server offset first, existing children, then live ones.
   CONTROL: the code live before the deep check (commit 38746c9, Version 72) must FAIL the replay and the clock checks.
   Usage: node l5-history-test.js [--old-dir <folder holding the old twolights files>] */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');
const DIR = path.join(__dirname, '../../platform/assets/twolights');
const BEFORE = '38746c9';
const args = process.argv.slice(2);
const OLD_DIR = args.indexOf('--old-dir') >= 0 ? args[args.indexOf('--old-dir') + 1] : null;

let checks = 0, fails = 0;
function must(ok, what) { checks++; if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); return ok; }

function loadLive(dir) {
  const file = path.join(dir, 'live.js');
  const sb = { module: { exports: {} }, setInterval: () => 0, clearInterval: () => {}, Date };
  sb.globalThis = sb;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sb, { filename: file });
  return sb.module.exports && sb.module.exports.makeFireBus ? sb.module.exports : sb.TLLIVE;
}

/* a fake Realtime Database: one shared tree of lists; each laptop gets its own view with its own server offset */
function fakeDb() {
  const lists = {}, subs = {};
  let n = 0;
  const q = [];
  function flush() { while (q.length) q.shift()(); }
  function view(offset) {
    function ref(p) {
      return {
        child: c => ref(p + '/' + c),
        on(ev, cb) {
          if (ev === 'value') { if (p === '.info/connected') q.push(() => cb({ val: () => true })); else if (p === '.info/serverTimeOffset') q.push(() => cb({ val: () => offset })); return; }
          (subs[p] = subs[p] || []).push(cb);
          (lists[p] || []).forEach(it => q.push(() => cb({ key: it.key, val: () => it.v })));
        },
        once(ev, cb) { q.push(() => cb({ val: () => lists[p] || null })); },
        push(v) { const it = { key: 'k' + (n++), v }; (lists[p] = lists[p] || []).push(it); (subs[p] || []).forEach(cb => q.push(() => cb({ key: it.key, val: () => it.v }))); },
        set() {}, remove() { return Promise.resolve(); }
      };
    }
    return { ref };
  }
  return { view, flush };
}

function busCase(dir, label) {
  const TL = loadLive(dir);
  const db = fakeDb();
  const room = 'r1';
  let caraNow = 1000;
  /* Cara (seat B, clock right) spoke on chapter 1: a hello, a radio slip to A, her state */
  const cara = TL.makeFireBus(db.view(0), room, 'B', { now: () => caraNow });
  db.flush();
  cara.send('hello', { seat: 'B' });
  cara.send('tell', { seat: 'B', to: 'A', slip: 'light', ch: 'ch1' });
  cara.send('state', { seat: 'B', st: 'ch1', lamp: 1, horn: 0, done: 1, red: 0, typing: 0, radio: '', line: 3, ran: 2, found: 1, at: 900 });
  /* half a second before Anya's page opens, Cara says hello again (both pages opening at once) */
  caraNow = 4500;
  cara.send('hello', { seat: 'B' });
  db.flush();
  /* Anya opens chapter 2 at server time 5000; her laptop clock is 4 s fast, the server offset corrects it */
  const anya = TL.makeFireBus(db.view(-4000), room, 'A', { now: () => 9000 });
  const got = [];
  anya.on(m => got.push(m));
  db.flush();
  const before = got.slice();
  /* then Cara speaks live */
  caraNow = 5000;
  cara.send('hello', { seat: 'B' });
  cara.send('tell', { seat: 'B', to: 'A', slip: 'horn', ch: 'ch2' });
  db.flush();
  const after = got.slice(before.length);
  const show = a => a.map(m => m.type + (m.ch ? ':' + m.ch : '')).join(',');
  console.log('  ' + label + ': history gave [' + show(before) + '] · live gave [' + show(after) + ']');
  return { before, after, TL };
}

function engineCase(dir, TL, label) {
  const EngineMod = require(path.join(dir, 'engine.js'));
  const sent = [];
  const bus = { on() {}, send: (type, data) => sent.push(Object.assign({ type }, data)), now: () => Date.now() };
  const E = EngineMod.makeEngine({ seat: 'A', seats: ['A', 'B'], room: 'r1', stage: 'ch2', bus });
  /* the slips go through the real codec, as they would on the wire */
  const wire = m => TL.codec.decode(TL.codec.encode(m));
  E.receive(wire({ type: 'tell', seat: 'B', to: 'A', slip: 'light', ch: 'ch1' }));
  const afterOld = E.S.slips.length;
  E.receive(wire({ type: 'tell', seat: 'B', to: 'A', slip: 'horn', ch: 'ch2' }));
  const afterNow = E.S.slips.length;
  E.radio('B', 'none');
  const mine = sent.filter(m => m.type === 'tell')[0] || null;
  console.log('  ' + label + ': slips after a chapter 1 slip ' + afterOld + ' · after a chapter 2 slip ' + afterNow + ' · her own slip carries ' + (mine && mine.ch));
  return { afterOld, afterNow, mine };
}

function checkAll(dir, label) {
  const b = busCase(dir, label);
  const has = (a, t) => a.some(m => m.type === t);
  const r = {};
  r.helloCount = b.before.filter(m => m.type === 'hello').length;
  r.state = has(b.before, 'state');
  r.liveHello = has(b.after, 'hello');
  r.liveTell = has(b.after, 'tell');
  const e = engineCase(dir, b.TL, label);
  r.e = e;
  return r;
}

const now = checkAll(DIR, 'fixed code');
must(now.helloCount === 1, 'the old chapter-1 hello is dropped, the hello from half a second ago is kept (' + now.helloCount + ' kept, want 1)');
must(now.state, 'her partner\'s last state still arrives from the history');
must(now.liveHello, 'a hello sent live arrives, though her laptop clock is 4 s fast');
must(now.liveTell, 'a slip sent live arrives');
must(now.e.afterOld === 0, 'a radio slip from chapter 1 is not shown again on chapter 2');
must(now.e.afterNow === 1, 'a radio slip from this chapter still lands');
must(!!now.e.mine && now.e.mine.ch === 'ch2', 'her own slip is sent with the chapter it belongs to');

/* CONTROL: the code live before the deep check fails these, so the checks above can fail */
let oldDir = OLD_DIR;
if (!oldDir) {
  try {
    oldDir = fs.mkdtempSync(path.join(os.tmpdir(), 'l5-history-old-'));
    const repo = path.join(__dirname, '../../..');
    const git = p => require('child_process').execSync('git show ' + BEFORE + ':ks3-dt/platform/assets/twolights/' + p, { cwd: repo, stdio: ['ignore', 'pipe', 'ignore'] });
    fs.readdirSync(DIR).filter(f => /\.js$/.test(f)).forEach(f => { try { fs.writeFileSync(path.join(oldDir, f), git(f)); } catch (e) { fs.copyFileSync(path.join(DIR, f), path.join(oldDir, f)); } });
  } catch (e) { oldDir = null; }
}
if (oldDir) {
  const old = checkAll(oldDir, 'CONTROL code before the deep check');
  must(old.e.afterOld === 1, 'CONTROL the old code shows the chapter-1 slip again on chapter 2');
  must(!old.liveHello, 'CONTROL the old code drops a live hello when her laptop clock is 4 s fast');
} else must(false, 'CONTROL: no old code to run against');

console.log('\nl5-history: ' + (fails ? 'FAIL · ' + fails + ' of ' + checks : 'PASS · ' + checks + ' checks'));
process.exit(fails ? 1 : 0);
