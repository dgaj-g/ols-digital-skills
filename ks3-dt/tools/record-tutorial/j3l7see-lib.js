/* J3 L7 TEACH IT TO SEE · the robot pupil every page gate shares (ported from L7_J3_REDESIGN/tools/walk.js).
   walk({ W, H, who, out, fault, maxScreens, shots }) walks the whole hour (main lesson, the five extras, the end
   questions) on the BUILT page and measures every screen: words, sentences, job line, the Stuck? Show me button and
   what it shows, button fit, page height. `fault` is a line of script run in the page before every measurement: each
   gate's CONTROL passes one in and must then FAIL.
   The page is walked at the size of its frame on the platform: the window less the platform's top bar (BAR px; the
   save gate measures the real frame and fails if this number is wrong).
   puppeteer runs headless 'shell' (NODE_PATH=$(npm root -g)). */
'use strict';
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs');
const SEE = path.resolve(__dirname, '../../platform/assets/see');
const People = require(path.join(SEE, 'see/people.js')).SeePeople;
const A = process.argv, argOf = (n, d) => { const i = A.indexOf(n); return i === -1 ? d : A[i + 1]; };
const PAGE = argOf('--url', 'file://' + path.join(SEE, 'hour.html'));
const BAR = +argOf('--bar', 141);   // measured in the platform: its header 81 px + the lesson's top bar 60 px
const SIZES = [[1280, 800], [1366, 768], [1440, 900], [1024, 768]];
const OUTDIR = path.join(__dirname, 'j3l7see');
const url = flags => PAGE + (PAGE.indexOf('?') > 0 ? '&' : '?') + 'f=' + flags;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let browser = null;
async function open() { if (!browser) browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--allow-file-access-from-files'] }); return browser; }
async function close() { if (browser) await browser.close(); browser = null; }

/* a click only on a control she can see and press */
async function click(p, sel) {
  const h = await p.evaluateHandle(s => [...document.querySelectorAll(s)].find(e => e.offsetParent !== null && !e.disabled && !e.closest('[hidden]')) || null, sel);
  const e = h.asElement(); if (!e) return false; await e.click(); return true;
}
async function draw(p, strokes) {
  // the drawing box shrinks to fit a short frame, so the robot draws at the size the box really is
  const box = await (await p.$('#pad')).boundingBox(), k = (box.width - 8) / 420, X = v => box.x + 4 + (v - 4) * k, Y = v => box.y + 4 + (v - 4) * k;
  for (const s of strokes) {
    await p.mouse.move(X(s[0][0]), Y(s[0][1])); await p.mouse.down();
    for (const q of s.slice(1)) await p.mouse.move(X(q[0]), Y(q[1]));
    await p.mouse.up();
  }
}
const info = p => p.evaluate(() => App.info());

/* everything a gate judges about the screen in front of her */
function measure() {
  const vis = e => e && e.offsetParent !== null, bad = [];
  document.querySelectorAll('button').forEach(e => { if (vis(e) && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) bad.push(e.textContent.trim() || e.id); });
  const out = [];
  document.querySelectorAll('button, .chip, #job, #mins').forEach(e => { if (!vis(e) || e.closest('#help')) return; const r = e.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1 || r.top < -1)) out.push(e.textContent.trim().slice(0, 30) || e.id); });
  const jobEl = document.getElementById('job'), lead = 'Your job now: ';
  const prose = [jobEl].concat([...document.querySelectorAll('#stage .say, #stage .big, #stage .stem, #side .say, #warn')]).filter(e => vis(e) && !e.closest('.mcard')).map(e => e.textContent.trim()).filter(Boolean);
  const words = prose.join(' ').replace(lead, '').split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length;
  const long = []; prose.forEach(t => t.replace(lead, '').split(/(?<=[.?!])\s+/).forEach(s => { if (s.split(/\s+/).length > 14) long.push(s); }));
  const hbEl = document.getElementById('helpBtn'), hb = hbEl.getBoundingClientRect(), jb = jobEl.getBoundingClientRect();
  const helpOK = vis(hbEl) && hb.width >= 150 && hb.height >= 40 && hb.right <= innerWidth && hb.bottom <= innerHeight && /Stuck\? Show me/.test(hbEl.textContent);
  const job = jobEl.textContent, jobSay = job.replace(lead, '').trim();
  const jobOK = vis(jobEl) && job.indexOf(lead) === 0 && jobSay.split(/\s+/).filter(Boolean).length >= 3 && /[.?!]$/.test(jobSay) && jb.bottom <= innerHeight && jb.width > 100;
  const chips = [...document.querySelectorAll('.chip')].filter(vis), here = chips.filter(c => /\b(on|now|here|cur)\b/.test(c.className)).length;
  return { bad, out, words, long, helpOK, job, jobOK, chips: chips.length, here, prose, scrollH: document.documentElement.scrollHeight, viewH: innerHeight, hOver: document.documentElement.scrollWidth > innerWidth };
}
/* Stuck? Show me: open it on this screen, check what it shows, close it, check nothing changed */
function helpCheck() {
  const before = App.snap(), i0 = App.info(), emptyPad = i0.pad && !i0.play && document.querySelector('#draw:not([hidden])') && JSON.parse(before.split('|').pop()).length === 0;
  App.help(true);
  const i = App.info(), box = document.getElementById('help').getBoundingClientRect(), sp = document.querySelector('.spot'), steps = [...document.querySelectorAll('#helpText li')].map(e => e.textContent), r = sp && sp.getBoundingClientRect(), bad = [];
  if (!i.helpOpen) bad.push('did not open');
  if (steps.length < 1 || steps.length > 3) bad.push('steps ' + steps.length);
  steps.forEach(t => { if (t.split(/\s+/).length > 10) bad.push('long step: ' + t); });
  if (!sp) bad.push('points at nothing'); else {
    if (r.top < box.bottom - 2) bad.push('help covers what it points at');
    if (r.bottom > innerHeight + 2 || r.width < 20) bad.push('pointer off screen');
    if (sp.matches('[data-want]') && sp.closest('.opts, .pick, .tiles')) bad.push('points at the right answer');
    if (!i.tag) bad.push('no tag');
  }
  if (document.documentElement.scrollHeight > innerHeight) bad.push('help makes the page taller');
  const demo = i.demoRuns > i0.demoRuns;
  App.help(false);
  if (App.snap() !== before) bad.push('state changed');
  if (document.querySelector('.spot')) bad.push('pointer left behind');
  return { bad, demo, emptyPad: !!emptyPad, tag: i.tag, steps, draw: i0.draw };
}
function subTag() {
  const s = App.st();
  return [s.scr, s.shown, s.cls[0].ex.length + s.cls[1].ex.length < 10 ? (s.cls[0].ex.length < 5 ? 'sun' : 'fish') : '', document.querySelector('#stage:not([hidden])') ? 'stage' : 'pad', s.line ? 'L' : '', (s.eq && s.eq.pick >= 0) ? 'picked' : '', s.name ? 'named' : '', s.gap >= 0 ? 'gap' : '', (s.felt || []).join('') === '222' ? 'felt' : '', document.getElementById('job').textContent.replace(/Your job now: /, '').replace(/\d+/g, '').slice(0, 26)].join('|');
}

async function walk(o) {
  const W = o.W, H = o.H, WHO = o.who || 's', b = await open();
  const out = o.out || path.join(OUTDIR, W + 'x' + H + '-' + WHO); if (o.shots !== false) fs.mkdirSync(out, { recursive: true });
  const p = await b.newPage(); await p.setViewport({ width: W, height: H - BAR, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url('new-fast'), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
  let seed = 1, n = 0, ended = false, guard = 0; const seen = {}, report = [], tiles = ['third', 'speed', 'half', 'bad', 'own'], t0 = Date.now();
  function pic(i) {
    const P = People(seed++); let d = i.draw, s;
    if (d === 'own') d = /cat/.test(i.job) ? 'cat' : /dog/.test(i.job) ? 'house' : 'cat';
    if (d === 'half') s = P.sun().concat(P.fish()); else s = P[d]();
    return i.zone ? P.into(s, i.zone) : s;
  }
  async function snap(tag) {
    if (seen[tag]) return; seen[tag] = 1; n++;
    if (o.fault) await p.evaluate(o.fault);
    const m = await p.evaluate(measure); m.help = await p.evaluate(helpCheck);
    const name = String(n).padStart(2, '0') + '-' + tag.replace(/[^a-z0-9-]/gi, '_').slice(0, 70) + '.png';
    if (o.shots !== false) await p.screenshot({ path: path.join(out, name) });
    report.push(Object.assign({ tag, name }, m));
  }
  while (!ended && guard++ < 700) {
    if (o.maxScreens && report.length >= o.maxScreens) break;
    const i = await info(p);
    if (i.play) { await sleep(60); continue; }
    if (i.scr === 'x-menu') {
      await snap('x-menu-' + tiles.length);
      if (tiles.length) { await click(p, '[data-arg=' + tiles.shift() + ']'); continue; }
      await click(p, '#endBtn'); continue;
    }
    if (i.scr === 'x-speed' && i.pad) {
      await snap('x-speed-play');
      for (let k = 0; k < 60; k++) { const j = await info(p); if (!j.pad || j.scr !== 'x-speed') break; await draw(p, pic(j)); }
      continue;
    }
    if (i.pad && i.draw && !i.shown) { await snap((await p.evaluate(subTag)) + '|empty'); await draw(p, pic(i)); }
    await snap(await p.evaluate(subTag));
    if (i.scr === 'f-who') { await click(p, '[data-act=' + WHO + ']'); continue; }
    if (i.scr === 'e-done') { ended = true; break; }
    if (!(await click(p, '#draw [data-want], #stage [data-want], #side [data-want]')) && !(await click(p, '[data-want]'))) { if (!(await click(p, '[data-act=menu]'))) { report.push({ tag: 'STUCK ' + i.scr }); break; } }
  }
  const res = { W, H, who: WHO, out, report, errs, ended, secs: (Date.now() - t0) / 1000, packSize: await p.evaluate(() => App.packSize()).catch(() => -1) };
  if (o.shots !== false) fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(res, null, 1));
  await p.close(); return res;
}
/* one page at a size, already past the opening, for a gate's own checks */
async function fresh(W, H, flags) {
  const b = await open(), p = await b.newPage(); await p.setViewport({ width: W, height: H - BAR, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url(flags || 'new-fast'), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); p._errs = errs; return p;
}
/* walk the main lesson until the page is on screen `scr` (drawing whatever each screen asks for) */
async function until(p, scr, who) {
  let seed = 500;
  for (let k = 0; k < 400; k++) {
    const i = await info(p); if (i.scr === scr) return true;
    if (i.play) { await sleep(60); continue; }
    if (i.scr === 'f-who') { await click(p, '[data-act=' + (who || 's') + ']'); continue; }
    if (i.pad && i.draw && !i.shown) { const P = People(seed++); let d = i.draw; if (d === 'own') d = 'cat'; const s = d === 'half' ? P.sun().concat(P.fish()) : P[d](); await draw(p, i.zone ? P.into(s, i.zone) : s); }
    if (!(await click(p, '#draw [data-want], #stage [data-want], #side [data-want]'))) { if (!(await click(p, '[data-act=menu]'))) return false; }
  }
  return false;
}
/* a gate's verdict lines */
function judge(name) {
  const fails = []; let checks = 0;
  return {
    must(ok, what) { checks++; console.log((ok ? '  PASS ' : '  FAIL ') + what); if (!ok) fails.push(what); return ok; },
    control(failed, what) { checks++; console.log((failed ? '  PASS CONTROL (it failed, as it must): ' : '  FAIL CONTROL DID NOT FAIL: ') + what); if (!failed) fails.push('control: ' + what); },
    async end() { await close(); console.log(fails.length ? name + ': FAILED (' + fails.length + ' of ' + checks + ')\n  ' + fails.join('\n  ') : name + ': ALL ' + checks + ' CHECKS PASS'); process.exit(fails.length ? 1 : 0); }
  };
}
/* the walks every page gate reads: one per screen size and route, re-walked whenever the built page has changed */
function builtHash() {
  const h = require('crypto').createHash('md5'), files = [];
  (function all(d) { fs.readdirSync(d).sort().forEach(f => { const q = path.join(d, f); if (fs.statSync(q).isDirectory()) all(q); else if (/\.(html|js|css)$/.test(f)) files.push(q); }); })(SEE);
  files.forEach(f => h.update(fs.readFileSync(f))); h.update(fs.readFileSync(__filename)); h.update(PAGE + BAR); return h.digest('hex').slice(0, 12);
}
async function reports(fresh) {
  const hash = builtHash(), all = [];
  for (const [W, H] of SIZES) for (const who of ['s', 'n']) {
    const f = path.join(OUTDIR, W + 'x' + H + '-' + who, 'report.json'); let r = null;
    if (!fresh && fs.existsSync(f)) { r = JSON.parse(fs.readFileSync(f, 'utf8')); if (r.hash !== hash) r = null; }
    if (!r) { r = await walk({ W, H, who }); r.hash = hash; fs.writeFileSync(f, JSON.stringify(r, null, 1)); console.log('  walked ' + W + 'x' + H + ' route ' + who + ': ' + r.report.length + ' screens in ' + Math.round(r.secs) + ' s'); }
    all.push(r);
  }
  return all;
}
module.exports = { reports, builtHash, walk, fresh, until, click, draw, info, sleep, open, close, judge, measure, helpCheck, People, SIZES, BAR, PAGE, OUTDIR, SEE, url, argOf };
