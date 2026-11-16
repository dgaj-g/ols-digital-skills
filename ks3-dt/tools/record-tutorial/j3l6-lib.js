/* J3 L6 THE NIGHT DESK · shared parts of the V85 page gates (fit, help, hour).
   Walks the built hour as the model pupil on three routes (model, honest fails, the late shift) at the school's
   window sizes, stopping on every new state (screen + job line + what help points at) to measure it.
   The frame is the window less the platform's bars (BAR, measured as in J3 L7: 81 px header + 60 px lesson bar).
   The current chip's "You are here" hangs below it by design, so it is not counted as words spilling out.
   puppeteer runs headless 'shell' (NODE_PATH=$(npm root -g)). */
'use strict';
const puppeteer = require('puppeteer'), fs = require('fs'), path = require('path');
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const HOUR = argOf('--url', 'file://' + path.resolve(__dirname, '../../platform/assets/nightdesk/hour.html'));
const BAR = +argOf('--bar', 141);
const SIZES = [[1366, 625], [1280, 800], [1366, 768], [1440, 900], [1024, 768]];   // 1366x625 is the school PC's window: a 484 px frame
const ROUTES = { model: 'x=0', fails: 'fails=1', late: 'late=1' };
const OUTDIR = path.resolve(__dirname, 'j3l6');
let browser = null;
async function open() { if (!browser) browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] }); return browser; }
async function close() { if (browser) { await browser.close(); browser = null; } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function url(q) { return HOUR + (HOUR.indexOf('?') > 0 ? '&' : '?') + q + '#' + encodeURIComponent(JSON.stringify({ test: 1 })); }
async function page(W, H, q) {
  const b = await open(), p = await b.newPage(); p._errs = [];
  p.on('pageerror', e => p._errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_FILE_NOT_FOUND/.test(m.text())) p._errs.push(m.text()); });
  await p.setViewport({ width: W, height: H - BAR, deviceScaleFactor: 1 });
  await p.goto(url(q), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); return p;
}
/* one step of the model pupil */
async function act(p, w) {
  if (w.kind === 'wait') { await sleep(w.ms); return; }
  await p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'nearest' }); }, w.sel);
  if (w.kind === 'click') await p.click(w.sel);
  else if (w.kind === 'type') { await p.click(w.sel); await p.keyboard.type(w.text); if (w.enter) await p.keyboard.press('Enter'); }
  await sleep(60);
}
/* in the page: the state's name */
function stateKey() { const g = Hour.guide() || {}; return Hour.screen() + '|' + (g.job || '') + '|' + (g.sel || ''); }
/* in the page: does it fit, is the job line right, is the button right */
function measure() {
  const vis = e => !!e && !e.hidden && !e.closest('[hidden]') && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const de = document.documentElement, out = [], spill = [];
  document.querySelectorAll('main button, main input, main .tbl, #job, #helpBtn, .strip button').forEach(e => { if (!vis(e) || e.closest('#help')) return; const r = e.getBoundingClientRect();
    if (r.width && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1)) out.push((e.textContent || e.id || e.className).trim().slice(0, 30)); });
  document.querySelectorAll('button:not(.rc.here)').forEach(b => { if (vis(b) && (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 2)) spill.push(b.textContent.trim().slice(0, 30)); });
  const jobEl = document.getElementById('job'), lead = 'Your job now: ', job = jobEl ? jobEl.textContent : '', say = job.replace(lead, '').trim(), n = say.split(/\s+/).filter(Boolean).length;
  const hb = document.getElementById('helpBtn'), r = hb ? hb.getBoundingClientRect() : {}, g = Hour.guide() || {}, steps = !!(g.steps && g.steps.length);
  const helpOK = vis(hb) && r.width >= 150 && r.height >= 40 && r.right <= innerWidth && r.bottom <= innerHeight && /^Stuck\? Show me$/.test(hb.textContent.trim());
  const jobOK = vis(jobEl) && job.indexOf(lead) === 0 && n >= 3 && n <= 14 && /[.?!]$/.test(say) && jobEl.getBoundingClientRect().bottom <= innerHeight;
  return { screen: Hour.screen(), over: de.scrollHeight - innerHeight, side: de.scrollWidth - innerWidth, out, spill, job, jobWords: n, jobOK, helpOK, steps };
}
/* in the page: open Stuck? Show me, check what it shows, close it, check nothing of hers changed */
function helpCheck() {
  const g0 = Hour.guide() || {}; if (!g0.steps || !g0.steps.length) return null;
  const skip = /^(g|spotEl|helpOn|nudged|idleAt|demoTxt)$/, snap = () => JSON.stringify(Hour.state, (k, v) => skip.test(k) || v instanceof Node ? undefined : v);
  const vis = e => !!e && !e.hidden && e.getClientRects().length > 0, before = snap(), bad = [];
  Hour.help(true);
  const hp = document.getElementById('help'), box = hp.getBoundingClientRect(), sp = document.querySelector('.help-spot'), tag = document.getElementById('tag');
  const steps = [...document.querySelectorAll('#helpText li')].map(e => e.textContent.trim());
  if (hp.hidden) bad.push('did not open');
  if (steps.length < 1 || steps.length > 3) bad.push('steps ' + steps.length);
  steps.forEach(t => { if (t.split(/\s+/).length > 10) bad.push('long step: ' + t); });
  if (!sp) bad.push('points at nothing'); else {
    const r = sp.getBoundingClientRect();
    if (r.top < box.bottom - 2) bad.push('help covers what it points at');
    if (r.bottom > innerHeight + 2 || r.top < -2 || r.width < 20) bad.push('pointer off screen');
    if (!vis(tag) || !tag.textContent.trim()) bad.push('no tag'); else { const t = tag.getBoundingClientRect(); if (t.top < box.bottom - 2 || t.bottom > innerHeight + 1 || t.left < 0 || t.right > innerWidth + 1) bad.push('tag off screen or under the help'); }
  }
  /* her work: nothing she reads or uses sits under the help box */
  [...document.querySelectorAll('main button, main input, main .tbl, main .paper, main .ask, main p')].filter(e => vis(e) && !e.closest('#help')).forEach(e => { const r = e.getBoundingClientRect();
    if (r.width && r.height && r.top < box.bottom - 2 && r.bottom > box.top + 2 && r.left < box.right && r.right > box.left) bad.push('help covers ' + (e.textContent || e.tagName).trim().slice(0, 24)); });
  if (document.documentElement.scrollHeight > innerHeight) bad.push('help makes the page taller');
  /* the example typed in the empty box is a different rule: it never finds the rows the task wants */
  let demo = null;
  if (g0.demo) { const qb = document.getElementById('qbox'), st = Hour.state, t = st.table, D = window.NightData, f = st.free || {};
    demo = { text: g0.demo, ghost: !!qb && qb.classList.contains('ghost') && st.demoTxt === g0.demo };
    if (!demo.ghost) bad.push('no example typed in the empty box');
    const core = { 'c1-ask': 'c1', 'c2-ask': 'c2', 'c3-ask': 'c3', 'c4-ask': 'c4', 'c5-ask': 'c5', 'c6-ask1': 'c6a', 'c6-ask2': 'c6b' }[Hour.screen()];
    const it = !core && f.x && S.late[f.x] && S.late[f.x].items ? S.late[f.x].items[f[f.x].i] : null;
    try { const got = Query.run(g0.demo, D[t], D.columns[t]).map(r => r.id).sort((a, b) => a - b).join(',');
      const want = core ? Hour.tasks[core].slice().sort((a, b) => a - b).join(',') : it && (it.rule || it.fix) ? Query.run(it.rule || it.fix, D[it.t], D.columns[it.t]).map(r => r.id).sort((a, b) => a - b).join(',') : null;
      if (want !== null && got === want) bad.push('the example is the answer: ' + g0.demo);
      if (it && it.n != null && got.split(',').filter(Boolean).length === it.n) bad.push('the example keeps the number asked for: ' + g0.demo);
      if (!core && !it) bad.push('no task found to compare the example with'); }
    catch (e) { bad.push('the example does not run: ' + g0.demo); } }
  Hour.help(false);
  if (snap() !== before) bad.push('state changed');
  if (document.querySelector('.help-spot')) bad.push('pointer left behind');
  if (document.getElementById('qbox') && document.getElementById('qbox').classList.contains('ghost')) bad.push('example left behind');
  return { bad, steps, demo, tag: tag && tag.textContent };
}
/* the walk: every new state is measured (and help checked); o.fault is run in the page first, for controls */
async function walk(o) {
  const p = await page(o.W, o.H, ROUTES[o.route] || o.route), seen = {}, report = []; let steps = 0, done = false;
  while (steps++ < 900) {
    const k = await p.evaluate(stateKey);
    if (!seen[k]) { seen[k] = 1; if (o.fault) await p.evaluate(o.fault);
      const m = await p.evaluate(measure); if (o.help !== false) m.help = await p.evaluate(helpCheck); m.key = k; report.push(m);
      if (o.shots) { fs.mkdirSync(o.shots, { recursive: true }); await p.screenshot({ path: path.join(o.shots, String(report.length).padStart(2, '0') + '-' + m.screen + '.png') }); }
      if (o.maxStates && report.length >= o.maxStates) break; }
    const w = await p.evaluate(() => Hour.want());
    if (!w || w.kind === 'done') { done = true; break; }
    await act(p, w);
  }
  const res = { W: o.W, H: o.H, route: o.route, report, errs: p._errs, done }; await p.close(); return res;
}
/* a verdict line per check; a control must FAIL */
function judge(name) {
  const fails = []; let checks = 0; const lines = [];
  const say = t => { console.log(t); lines.push(t); };
  return {
    must(ok, what) { checks++; say((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) fails.push(what); return ok; },
    control(failed, what) { checks++; say((failed ? '  PASS CONTROL (it failed, as it must): ' : '  FAIL CONTROL DID NOT FAIL: ') + what); if (!failed) fails.push('control: ' + what); },
    async end() { await close(); say(fails.length ? name + ': FAILED (' + fails.length + ' of ' + checks + ')\n  ' + fails.join('\n  ') : name + ': ALL ' + checks + ' CHECKS PASS');
      fs.mkdirSync(OUTDIR, { recursive: true }); fs.writeFileSync(path.join(OUTDIR, name.replace(/^j3l6-/, '') + '.txt'), lines.join('\n') + '\n'); process.exit(fails.length ? 1 : 0); }
  };
}
module.exports = { open, close, sleep, url, page, act, walk, judge, measure, helpCheck, stateKey, argOf, SIZES, ROUTES, BAR, HOUR, OUTDIR };
