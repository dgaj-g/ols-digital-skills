#!/usr/bin/env node
/* l5-sound-test — Two Lights sound (assets/twolights/sound.js), sounds asked for before her first click (deep check 25 Oct 2026).
   A browser starts a page's sound only after a click on that page. Until then its sound clock stands still, so the old
   code queued the radio-ceremony crackle and horn (0.3 s and 0.6 s after the page opens) at time zero, and they all went
   off together the moment she first clicked. A sound asked for before the sound has started now plays only if the
   sound starts straight away (a click that asked for it); a stale one is dropped. A click's own sound still plays.
   Run against a fake AudioContext that behaves like Chrome's: suspended, resume() waits for a click, clock stopped.
   CONTROL: the code live before the deep check (commit 38746c9, Version 72) must FAIL the burst check.
   Usage: node l5-sound-test.js */
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const FILE = path.join(__dirname, '../../platform/assets/twolights/sound.js');
const BEFORE = '38746c9';
let checks = 0, fails = 0;
function must(ok, what) { checks++; if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what); return ok; }

function load(src) {
  let now = 0, clicked = false;
  const started = [], waiting = [];
  function node() { return { connect() {}, gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, Q: { value: 0 }, start(t) { started.push({ t, at: now }); }, stop() {} }; }
  function AC() {
    this.state = 'suspended'; this.sampleRate = 8000; this.destination = {};
    Object.defineProperty(this, 'currentTime', { get: () => this.state === 'running' ? (now - this.t0) / 1000 : this.frozen });
    this.frozen = 0;
  }
  AC.prototype.createGain = node; AC.prototype.createOscillator = node; AC.prototype.createBiquadFilter = node;
  AC.prototype.createBufferSource = node;
  AC.prototype.createBuffer = function (c, n) { return { getChannelData: () => new Float32Array(n) }; };
  AC.prototype.resume = function () { const me = this; return new Promise(res => { if (clicked) { me.start(); res(); } else waiting.push(() => { me.start(); res(); }); }); };
  AC.prototype.start = function () { if (this.state !== 'running') { this.state = 'running'; this.t0 = now - this.frozen * 1000; } };
  AC.prototype.suspend = function () { this.frozen = this.currentTime; this.state = 'suspended'; return Promise.resolve(); };
  const win = { AudioContext: AC };
  const sb = { window: win, Date: { now: () => now }, Promise, Float32Array, Math };
  vm.runInNewContext(src, sb, { filename: 'sound.js' });
  return {
    S: win.TwoSound, started,
    at(ms) { now = ms; },
    click() { clicked = true; waiting.splice(0).forEach(f => f()); },   // a click on the page: the browser lets the sound start
    flush: () => new Promise(r => setImmediate(r))
  };
}

async function cases(src, label) {
  const r = {};
  /* the radio ceremony: crackle at 0.3 s, horn at 0.6 s, no click yet; her first click is 5 s later */
  let h = load(src);
  h.at(300); h.S.play('ceremony'); h.at(600); h.S.play('horn'); await h.flush();
  const beforeClick = h.started.length;
  h.at(5000); h.S.unlock(); h.click(); await h.flush();
  r.burst = h.started.filter(s => s.at === 5000 || s.t < 0.1).length;
  r.queuedBeforeClick = beforeClick;
  /* a click that asks for its own sound (the radio button: unlock, then crackle) still hears it */
  h = load(src);
  h.at(100); h.S.unlock(); h.click(); h.S.play('crackle'); await h.flush();
  r.clickSound = h.started.length;
  /* once the sound has started, a sound plays at once, on the running clock */
  h.at(8000); const n0 = h.started.length; h.S.play('coin'); await h.flush();
  r.running = h.started.length - n0;
  r.runningAt = h.started.length ? h.started[h.started.length - 1].t : null;
  /* paused story: nothing plays */
  h.S.hold(true); const n1 = h.started.length; h.S.play('horn'); await h.flush();
  r.held = h.started.length - n1;
  console.log('  ' + label + ': tones at her first click ' + r.burst + ' (queued while suspended ' + r.queuedBeforeClick + ') · a click\'s own sound ' + r.clickSound + ' tones · running ' + r.running + ' at ' + (r.runningAt && r.runningAt.toFixed(2)) + ' s · while paused ' + r.held);
  return r;
}

(async () => {
  const now = await cases(fs.readFileSync(FILE, 'utf8'), 'fixed code');
  must(now.burst === 0, 'no sounds queued before her first click go off together when she clicks (' + now.burst + ' tones)');
  must(now.clickSound > 0, 'the sound her click asked for still plays');
  must(now.running > 0 && now.runningAt > 7, 'once the sound has started, a sound plays at once on the running clock');
  must(now.held === 0, 'while the story is paused, nothing plays');
  let old = null;
  try { old = require('child_process').execSync('git show ' + BEFORE + ':ks3-dt/platform/assets/twolights/sound.js', { cwd: path.join(__dirname, '../../..'), stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) {}
  if (old) {
    const o = await cases(old, 'CONTROL code before the deep check');
    must(o.burst > 0, 'CONTROL the old code sets the queued sounds off together on her first click');
  } else must(false, 'CONTROL: no old code to run against');
  console.log('\nl5-sound: ' + (fails ? 'FAIL · ' + fails + ' of ' + checks : 'PASS · ' + checks + ' checks'));
  process.exit(fails ? 1 : 0);
})();
