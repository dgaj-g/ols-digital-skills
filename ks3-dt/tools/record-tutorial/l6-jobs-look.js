/* THE OPERATION V2 · the extra jobs gate (spec §5.8, D8). Each job opens in an iframe at the platform's frame size
   (full width, the window less the lesson bar), the way engines.js loads it, and is walked to its end:
   - FIND: every part clicked at the centre of its box is accepted; a miss gives the wrong line; two misses outline
     the part. An overlay of every box on the photo is saved for the eye (look_find_boxes_*.png).
   - CUSTOMERS: a wrong part is struck out, the right one turns green with the reason, Next customer, three times,
     then the end button and the done line.
   - OWN: three facts, Next, then the end button.
   - LETTER: the top bar and the job bar.
   Every job: the top bar names the job, Back and Finish post xback / xfinish to the platform, the job bar is on and
   the green Stuck? Show me rings the thing to use; nothing is off screen, under the job bar or under the top bar;
   no screen carries more than 25 words of prose (kicker, buttons, tray names and the letter's chart rows are chrome).
   CONTROLS that must fail: a moved box (the click at the old centre must be refused), a long line in the paper
   (the words check), a paper pushed under the job bar (the fit check).
   node l6-jobs-look.js [--base http://localhost:8126] */
var pw = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
var path = require('path'), fs = require('fs');
var args = process.argv.slice(2), BASE = args.indexOf('--base') !== -1 ? args[args.indexOf('--base') + 1] : 'http://localhost:8126';
var SHOTS = path.join(__dirname, 'qa-l2-l5-review', 'l6-jobs'); fs.mkdirSync(SHOTS, { recursive: true });
var ROOT = BASE + '/ks3-dt/platform/assets/l6/operation.html';
global.window = {}; eval(fs.readFileSync(path.join(__dirname, '../../platform/assets/l6/cstrings.js'), 'utf8')); var C = window.L6C_STRINGS;
var EXTRAS = { back: C.hub.back, finish: C.hub.finish };
var SIZES = [[1366, 617], [683, 704], [746, 833], [1920, 1016]];  /* the frame at 1366x681, 683x768, 746x897, 1920x1080 (the window less the lesson bar) */
var bad = 0; function fail(m) { bad++; console.log('FAIL', m); }
function title(id) { return C.hub.jobs.filter(function (j) { return j.id === id; })[0].title; }
function hashFor(stage, extra) { var h = { stage: stage, seat: 'A', seats: ['A'], extras: { back: EXTRAS.back, finish: EXTRAS.finish, title: title(stage) } }; for (var k in extra || {}) h[k] = extra[k]; return '#' + encodeURIComponent(JSON.stringify(h)); }
/* runs inside the job's frame */
function fitFn() {
  var W = document.documentElement.clientWidth, H = document.documentElement.clientHeight, out = [];
  function tag(el) { return el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName; }
  var jb = document.getElementById('jobbar'), xt = document.getElementById('xtop');
  var floor = jb && jb.classList.contains('on') ? jb.getBoundingClientRect().top : H, ceil = xt && !xt.hidden ? xt.getBoundingClientRect().bottom : 0;
  var root = !document.getElementById('extra').hidden ? document.getElementById('xpaper') : document.getElementById('letter');
  root.querySelectorAll('*').forEach(function (el) {
    if (!el.offsetParent) return; var r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return;
    if (r.left < -1 || r.right > W + 1) out.push('OFF:' + tag(el));
  });
  /* the scrolling box: its content must fit between the bars without a scroll */
  var sc = !document.getElementById('extra').hidden ? document.getElementById('extra') : document.getElementById('letter');
  var pr = root.getBoundingClientRect();
  if (sc.scrollHeight > sc.clientHeight + 2) out.push('SCROLL:' + tag(sc) + ' ' + sc.scrollHeight + '>' + sc.clientHeight);
  if (pr.bottom > floor + 1) out.push('UNDER JOB BAR by ' + Math.round(pr.bottom - floor));
  if (pr.top < ceil - 1) out.push('UNDER TOP BAR by ' + Math.round(ceil - pr.top));
  if (document.documentElement.scrollWidth > W + 2) out.push('doc wide');
  return out.slice(0, 8);
}
function wordsFn() {
  /* prose on the paper: every visible p / h / li text, less the chrome (kicker, buttons, tray names, chart rows) */
  var root = !document.getElementById('extra').hidden ? document.getElementById('xpaper') : document.getElementById('letter'), n = 0, seen = [];
  root.querySelectorAll('p, h1, h2, h3').forEach(function (el) {
    if (!el.offsetParent || el.closest('.kicker, button, .xtray, #llines')) return;
    var t = el.textContent.trim(); if (!t) return; seen.push(t); n += t.split(/\s+/).length;
  });
  return { n: n, seen: seen };
}
(async function () {
  var b = await pw.chromium.launch(), errs = [];
  async function open(w, h, stage, extra) {
    var ctx = await b.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage();
    p.on('pageerror', function (e) { errs.push(w + 'x' + h + ' ' + stage + ' ' + e.message); });
    p.on('console', function (m) { if (m.type() === 'error' && !/favicon|firebase|ERR_NAME|net::/.test(m.text())) errs.push(w + 'x' + h + ' ' + stage + ' console ' + m.text()); });
    await p.goto(BASE + '/');
    await p.setContent('<!doctype html><html><body style="margin:0;background:#0d1b2a"><iframe id="f" style="position:fixed;inset:0;width:100vw;height:100vh;border:0"></iframe>' +
      '<script>window.msgs=[];addEventListener("message",function(e){if(e.data&&e.data.op)msgs.push(e.data.type)});</script></body></html>');
    await p.evaluate(function (src) { document.getElementById('f').src = src; }, ROOT + hashFor(stage, extra));
    var f; for (var i = 0; i < 100 && !f; i++) { await p.waitForTimeout(100); f = p.frames().filter(function (x) { return /operation\.html/.test(x.url()); })[0]; }
    await f.waitForFunction(function () { return document.title === 'ready'; }, null, { timeout: 15000 });
    await f.evaluate(function () { if (window.OPLAYER) OPLAYER.setIdle(600000); });
    return { ctx: ctx, p: p, f: f };
  }
  async function common(o, tag, stage) {
    var t = await o.f.evaluate(function () { return { where: document.getElementById('xwhere').textContent, back: document.getElementById('xback').textContent, fin: document.getElementById('xfin').textContent, top: !document.getElementById('xtop').hidden, jb: document.getElementById('jobbar').classList.contains('on'), job: document.getElementById('job').textContent }; });
    var want = C.top.job.replace('{job}', title(stage));
    if (!t.top || t.where !== want) fail(tag + ' top bar "' + t.where + '" want "' + want + '"');
    if (t.back !== EXTRAS.back || t.fin !== EXTRAS.finish) fail(tag + ' top bar buttons "' + t.back + '" / "' + t.fin + '"');
    if (!t.jb || t.job.indexOf(C.layer.jobLead.trim()) !== 0) fail(tag + ' job bar off or no lead: "' + t.job + '"');
    if (t.job.replace(C.layer.jobLead, '').trim().split(/\s+/).length > 14) fail(tag + ' job line over 14 words: ' + t.job);
    var fit = await o.f.evaluate(fitFn); if (fit.length) fail(tag + ' fit ' + JSON.stringify(fit));
    var wd = await o.f.evaluate(wordsFn); if (wd.n > 25) fail(tag + ' ' + wd.n + ' words: ' + JSON.stringify(wd.seen));
    return wd;
  }
  async function help(o, tag, wantSel, wantTag) {
    await o.f.click('#helpBtn'); await o.f.waitForTimeout(250);
    var r = await o.f.evaluate(function () { var s = document.querySelector('.spot'), tg = document.getElementById('tag'); return { open: !document.getElementById('help').hidden, spot: s ? (s.id || s.className) : '', tag: tg.style.display === 'block' ? tg.textContent : '', n: document.querySelectorAll('#helpText li').length }; });
    if (!r.open || !r.n) fail(tag + ' help strip did not open with steps');
    if (wantSel && r.spot.indexOf(wantSel) === -1) fail(tag + ' help rings "' + r.spot + '" want ' + wantSel);
    if (wantTag != null && r.tag !== wantTag) fail(tag + ' help tag "' + r.tag + '" want "' + wantTag + '"');
    await o.p.screenshot({ path: SHOTS + '/' + tag.replace(/\s+/g, '_') + '_help.png' });
    await o.f.click('#helpClose'); await o.f.waitForTimeout(150);
  }
  async function endCheck(o, tag) {
    var e = await o.f.evaluate(function () { var x = document.getElementById('xnext'); return { shown: !!(x && !x.hidden && x.offsetParent), text: x ? x.textContent : '', job: document.getElementById('job').textContent }; });
    if (!e.shown || e.text !== EXTRAS.back) fail(tag + ' end button "' + e.text + '" shown ' + e.shown);
    if (e.job.indexOf(e.text) === -1) fail(tag + ' end job line does not name the button: ' + e.job);
    await o.f.click('#xnext'); await o.p.waitForTimeout(100);
    var m = await o.p.evaluate(function () { return msgs.slice(); }); if (m.indexOf('next') === -1) fail(tag + ' end button did not post next: ' + m);
  }
  async function bars(o, tag) {
    await o.f.click('#xback'); await o.f.click('#xfin'); await o.p.waitForTimeout(100);
    var m = await o.p.evaluate(function () { return msgs.slice(); });
    if (m.indexOf('xback') === -1 || m.indexOf('xfinish') === -1) fail(tag + ' Back / Finish did not post: ' + m);
  }
  var nameToPart = {}; Object.keys(C.parts).forEach(function (k) { nameToPart[C.parts[k]] = k; });

  for (var si = 0; si < SIZES.length; si++) {
    var w = SIZES[si][0], h = SIZES[si][1], sz = w + 'x' + h;
    /* ---------- FIND ---------- */
    var o = await open(w, h, 'find'), tag = 'find ' + sz;
    await common(o, tag, 'find'); await help(o, tag, 'xphoto', '');
    var BOX = await o.f.evaluate(function () { return window.OPFIND_BOX; });
    if (si === 0) {
      /* the overlay for the eye: every box drawn with its part name */
      var ov = await o.f.evaluate(function (B) {
        var ph = document.getElementById('xphoto'), cols = { psu: '#e74c3c', fan: '#3498db', cpu: '#f1c40f', mem: '#9b59b6', gpu: '#e67e22', drive: '#1abc9c', board: '#ecf0f1' }, n = 0;
        Object.keys(B).forEach(function (p) { B[p].forEach(function (bx, i) { var d = document.createElement('div'); d.className = 'ovl'; d.style.cssText = 'position:absolute;pointer-events:none;border:2px solid ' + cols[p] + ';left:' + bx[0] + '%;top:' + bx[1] + '%;width:' + bx[2] + '%;height:' + bx[3] + '%;font:700 11px sans-serif;color:' + cols[p] + ';text-shadow:0 0 3px #000;line-height:1;padding:2px;box-sizing:border-box'; d.textContent = p + (i ? i + 1 : ''); ph.appendChild(d); n++; }); });
        return n;
      }, BOX);
      await o.p.screenshot({ path: SHOTS + '/look_find_boxes_' + sz + '.png' });
      await o.f.evaluate(function () { document.querySelectorAll('.ovl').forEach(function (d) { d.remove(); }); });
      console.log(sz, 'find overlay', ov, 'boxes drawn');
    }
    async function centre(box) { return o.f.evaluate(function (bx) { var r = document.querySelector('#xphoto img').getBoundingClientRect(); return { x: r.left + (bx[0] + bx[2] / 2) / 100 * r.width, y: r.top + (bx[1] + bx[3] / 2) / 100 * r.height }; }, box); }
    async function asked() { var t = await o.f.textContent('#xask'); var m = /^Click the (.+)\.$/.exec(t); return m ? nameToPart[m[1]] : null; }
    /* a miss first: a corner of the photo is no part's box except the case fan column, so take the far right edge */
    var first = await asked(); if (!first) fail(tag + ' no part asked');
    var missPt = await o.f.evaluate(function () { var r = document.querySelector('#xphoto img').getBoundingClientRect(); return { x: r.left + 0.97 * r.width, y: r.top + 0.30 * r.height }; });
    await o.p.mouse.click(missPt.x, missPt.y);
    var say1 = await o.f.textContent('#xsay'); if (say1 !== C.find.wrong) fail(tag + ' miss gave "' + say1 + '"');
    await o.p.mouse.click(missPt.x, missPt.y);
    var shown = await o.f.evaluate(function () { return document.querySelectorAll('.xspot.show').length; }); if (shown !== 1) fail(tag + ' two misses did not outline the part (' + shown + ')');
    if (si === 0) await o.p.screenshot({ path: SHOTS + '/look_find_miss2_' + sz + '.png' });
    var found = 0;
    for (var k = 0; k < 7; k++) {
      var part = await asked(); if (!part) { fail(tag + ' step ' + k + ' no part asked'); break; }
      if (k === 6 && part !== 'board') fail(tag + ' motherboard is not last');
      var c = await centre(BOX[part][0]); await o.p.mouse.click(c.x, c.y); await o.f.waitForTimeout(80);
      var s = await o.f.textContent('#xsay');
      if (s !== C.find.right.replace('{part}', C.parts[part])) { fail(tag + ' ' + part + ' at its box centre gave "' + s + '"'); break; }
      found++;
      if (si === 0 && k === 2) await o.p.screenshot({ path: SHOTS + '/look_find_right_' + sz + '.png' });
      await o.f.waitForTimeout(1600);
    }
    if (found === 7) {
      var dn = await o.f.textContent('#xsay'); if (dn !== C.find.done) fail(tag + ' done line "' + dn + '"');
      await common(o, tag + ' done', 'find'); await o.p.screenshot({ path: SHOTS + '/look_find_done_' + sz + '.png' });
      await endCheck(o, tag);
    }
    await bars(o, tag);
    /* CONTROL: a moved box. The click at the old centre must now be refused. */
    if (si === 0) {
      var oc = await open(w, h, 'find'), part0 = await (async function () { var t = await oc.f.textContent('#xask'); return nameToPart[/^Click the (.+)\.$/.exec(t)[1]]; })();
      var old = BOX[part0][0];
      await oc.f.evaluate(function (p) { window.OPFIND_BOX[p] = [[90, 90, 5, 5]]; }, part0);
      var cc = await oc.f.evaluate(function (bx) { var r = document.querySelector('#xphoto img').getBoundingClientRect(); return { x: r.left + (bx[0] + bx[2] / 2) / 100 * r.width, y: r.top + (bx[1] + bx[3] / 2) / 100 * r.height }; }, old);
      await oc.p.mouse.click(cc.x, cc.y); var cs = await oc.f.textContent('#xsay');
      var caught = cs !== C.find.right.replace('{part}', C.parts[part0]); console.log(sz, 'control moved box caught:', caught); if (!caught) fail('control: moved box not caught');
      /* CONTROL: a long line in the paper must trip the words check; a tall block must trip the fit check */
      await oc.f.evaluate(function () { var p = document.createElement('p'); p.id = 'ctlw'; p.textContent = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'; document.getElementById('xbody').appendChild(p); });
      var cw = await oc.f.evaluate(wordsFn); console.log(sz, 'control words caught:', cw.n > 25); if (!(cw.n > 25)) fail('control: words not caught');
      await oc.f.evaluate(function () { document.getElementById('ctlw').style.height = '900px'; });
      var cf = await oc.f.evaluate(fitFn); console.log(sz, 'control fit caught:', cf.length > 0, JSON.stringify(cf.slice(0, 2))); if (!cf.length) fail('control: fit not caught');
      await oc.ctx.close();
    }
    await o.ctx.close();

    /* ---------- CUSTOMERS ---------- */
    o = await open(w, h, 'customers'); tag = 'customers ' + sz;
    await common(o, tag, 'customers'); await help(o, tag, 'xtray', C.layer.tagChoose);
    for (var ci = 0; ci < C.cust.people.length; ci++) {
      var pe = C.cust.people[ci];
      var who = await o.f.textContent('#xwho'); if (who !== C.cust.says.replace('{customer}', pe.who)) fail(tag + ' kicker "' + who + '"');
      var wrongP = ['mem', 'drive', 'gpu', 'psu'].filter(function (x) { return x !== pe.right; })[0];
      await o.f.click('.xpart[data-p="' + wrongP + '"]');
      var ws = await o.f.evaluate(function (q) { var b = document.querySelector('.xpart[data-p="' + q + '"]'); return { st: document.getElementById('xstat').textContent, cls: b.className, dis: b.disabled }; }, wrongP);
      if (ws.st !== C.cust.wrong || !/wrong/.test(ws.cls) || !ws.dis) fail(tag + ' ' + pe.who + ' wrong part: ' + JSON.stringify(ws));
      await common(o, tag + ' ' + pe.who + ' wrong', 'customers');
      if (si === 0 && ci === 0) await o.p.screenshot({ path: SHOTS + '/look_cust_wrong_' + sz + '.png' });
      await o.f.click('.xpart[data-p="' + pe.right + '"]');
      var rs = await o.f.textContent('#xstat'); if (rs !== C.cust.right.replace('{why}', pe.why)) fail(tag + ' ' + pe.who + ' right line "' + rs + '"');
      await common(o, tag + ' ' + pe.who + ' right', 'customers');
      if (si === 0) await o.p.screenshot({ path: SHOTS + '/look_cust_right' + ci + '_' + sz + '.png' });
      if (ci < C.cust.people.length - 1) {
        var jl = await o.f.textContent('#job'); if (jl.indexOf(C.cust.next) === -1) fail(tag + ' job line does not name Next customer: ' + jl);
        await o.f.click('#xcnext');
      }
    }
    await o.f.waitForTimeout(5300);
    var dl = await o.f.textContent('#xneed'); if (dl !== C.cust.done) fail(tag + ' done line "' + dl + '"');
    await common(o, tag + ' done', 'customers'); if (si === 0) await o.p.screenshot({ path: SHOTS + '/look_cust_done_' + sz + '.png' });
    await endCheck(o, tag); await bars(o, tag); await o.ctx.close();

    /* ---------- OWN ---------- */
    o = await open(w, h, 'own'); tag = 'own ' + sz;
    await common(o, tag, 'own'); await help(o, tag, 'xfnext', C.layer.tagPress);
    var facts = [];
    for (var fi = 0; fi < 4; fi++) {
      facts.push(await o.f.textContent('#xfact')); await common(o, tag + ' fact ' + fi, 'own');
      if (si === 0) await o.p.screenshot({ path: SHOTS + '/look_own' + fi + '_' + sz + '.png' });
      var nx = await o.f.evaluate(function () { var b = document.getElementById('xfnext'); return !b.hidden; });
      if (!nx) break; await o.f.click('#xfnext');
    }
    if (facts.length !== 3) fail(tag + ' facts ' + facts.length + ': ' + JSON.stringify(facts));
    facts.forEach(function (t) { var ok = [C.fixes.ownCores, C.fixes.ownMem, C.fixes.ownScreen].some(function (s) { return new RegExp('^' + s.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{[a-z]\\?\}/g, '\\d+').replace(/\{[a-z]\}/g, '\\d+') + '$').test(t); }) || t === C.fixes.ownUnknown; if (!ok) fail(tag + ' fact not from cstrings: ' + t); });
    await endCheck(o, tag); await bars(o, tag); await o.ctx.close();

    /* ---------- LETTER ---------- */
    o = await open(w, h, 'letter', { letter: { pid: 'bernadette', seats: ['A'], chart: ['mem', 'drive', 'cpu', 'gpu', 'fan', 'psu', 'board'].map(function (p) { return { part: p, by: 'A', told: false }; }) } }); tag = 'letter ' + sz;
    await common(o, tag, 'letter'); await help(o, tag, 'lnext', C.layer.tagPress);
    await o.p.screenshot({ path: SHOTS + '/look_letter_' + sz + '.png' });
    await bars(o, tag); await o.ctx.close();
    console.log(sz, 'done');
  }
  if (errs.length) { errs.forEach(function (e) { console.log('ERR', e); }); bad += errs.length; }
  await b.close();
  console.log(bad ? 'L6 JOBS LOOK: ' + bad + ' FAIL' : 'L6 JOBS LOOK: PASS (find, customers, own, letter at ' + SIZES.length + ' sizes; 4 controls caught)');
  process.exit(bad ? 1 : 0);
})();
