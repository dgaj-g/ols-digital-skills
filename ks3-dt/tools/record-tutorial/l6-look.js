/* own look: screenshots at the four sizes, door + table + cards + done, solo, still */
var pw = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
var path = require('path'), fs = require('fs');
var args = process.argv.slice(2), BASE = args.indexOf('--base') !== -1 ? args[args.indexOf('--base') + 1] : 'http://localhost:8121';
var SHOTS = path.join(__dirname, 'qa-l2-l5-review', 'l6-look'); fs.mkdirSync(SHOTS, { recursive: true });
var ROOT = BASE + '/ks3-dt/platform/assets/l6/operation.html';
var sizes = [[683, 768], [746, 897], [1366, 768], [1920, 1080]];
var bad = 0;
function overFn() {
      /* real overflow only: a descendant drawn outside the viewport, or clipped by an overflow:hidden ancestor */
      var W = document.documentElement.clientWidth, H = document.documentElement.clientHeight, out = [];
      function tag(el) { return el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName; }
      document.querySelectorAll('#app *').forEach(function (el) {
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return; if (el.tagName === 'OPTION') return;
        var r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0 || getComputedStyle(el).opacity === '0') return;
        if (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2) { out.push('OFF:' + tag(el)); return; }
        var a = el.parentElement;
        while (a && a.id !== 'app') { var cs = getComputedStyle(a); if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { var q = a.getBoundingClientRect(); if (r.left < q.left - 2 || r.top < q.top - 2 || r.right > q.right + 2 || r.bottom > q.bottom + 2) { out.push('CLIP:' + tag(el) + ' in ' + tag(a)); break; } } a = a.parentElement; }
      });
      /* a grid/flex child drawn into its parent's padding (his find 14 Oct: 58%+42%+gap ran the right column to the window edge) */
      document.querySelectorAll('#app, #app *').forEach(function (par) { var cs = getComputedStyle(par); if (!/grid|flex/.test(cs.display)) return; var q = par.getBoundingClientRect(); if (q.width === 0) return;
        var Lx = q.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), Rx = q.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
        var items = []; (function collect(n) { Array.prototype.forEach.call(n.children, function (k) { getComputedStyle(k).display === 'contents' ? collect(k) : items.push(k); }); })(par);
        items.forEach(function (ch) { var c2 = getComputedStyle(ch); if (c2.position === 'absolute' || c2.position === 'fixed' || c2.display === 'none' || parseFloat(c2.marginLeft) < 0 || parseFloat(c2.marginRight) < 0) return; var r = ch.getBoundingClientRect(); if (r.width === 0) return;
          if (r.left < Lx - 1 || r.right > Rx + 1) out.push('PAD:' + tag(ch) + ' in ' + tag(par) + ' by ' + Math.round(Math.max(Lx - r.left, r.right - Rx)) + 'px'); }); });
      var m = document.getElementById('main'), mc = getComputedStyle(m), mr = m.getBoundingClientRect(), mi = [];
      (function collect(n) { Array.prototype.forEach.call(n.children, function (k) { var c3 = getComputedStyle(k); if (c3.display === 'contents') collect(k); else if (c3.position !== 'absolute' && c3.position !== 'fixed' && c3.display !== 'none') mi.push(k.getBoundingClientRect()); }); })(m);
      var maxR = Math.max.apply(null, mi.map(function (r) { return r.right; })), minL = Math.min.apply(null, mi.map(function (r) { return r.left; }));
      return { over: out.slice(0, 12), docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight, rightAir: Math.round(mr.right - maxR), leftAir: Math.round(minL - mr.left), padRight: parseFloat(mc.paddingRight) };
}
/* the other screens (spec §6.2: done, ward, names, exit): nothing off screen, nothing clipped, no page scroll */
function screenFn(root) {
  var W = document.documentElement.clientWidth, H = document.documentElement.clientHeight, out = [];
  function tag(el) { return el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName; }
  var R = document.querySelector(root); if (!R || R.hidden) return ['NO SCREEN ' + root];
  R.querySelectorAll('*').forEach(function (el) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
    var r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0 || getComputedStyle(el).opacity === '0') return;
    if (r.left < -2 || r.right > W + 2) out.push('OFF:' + tag(el));
  });
  var d = document.documentElement; if (d.scrollWidth > d.clientWidth + 2) out.push('doc wide ' + d.scrollWidth);
  return out.slice(0, 10);
}
(async function () {
  var b = await pw.chromium.launch(); var errs = [];
  for (var i = 0; i < sizes.length; i++) {
    var w = sizes[i][0], h = sizes[i][1], tag = w + 'x' + h;
    var ctx = await b.newContext({ viewport: { width: w, height: h } }); var p = await ctx.newPage();
    p.on('pageerror', function (e) { errs.push(tag + ' ' + e.message); }); p.on('console', function (m) { if (m.type() === 'error') errs.push(tag + ' console ' + m.text()); });
    await p.goto(ROOT + '?solo=1&bot=1&fast=1&seed=5&still=1&tour=0'); await p.waitForFunction(function () { return document.title === 'ready'; });
    await p.waitForTimeout(2500); await p.screenshot({ path: SHOTS + '/look_door_' + tag + '.png' });
    await p.click('#beginbtn'); await p.waitForTimeout(400); await p.screenshot({ path: SHOTS + '/look_table_' + tag + '.png' });
    var ov = await p.evaluate(overFn);
    console.log(tag, 'table', JSON.stringify(ov));
    if (ov.over.length || ov.rightAir < ov.padRight - 1) { bad++; console.log(tag, 'FAIL table width/overflow'); }
    /* CONTROL: the old 58%/42% rule must be caught (his find, 14 Oct 2026) */
    var ctrlH = await p.addStyleTag({ content: '#main{grid-template-columns:58% 42% !important}' }); var ovC = await p.evaluate(overFn);
    var caught = ovC.over.some(function (s) { return /^PAD:/.test(s); }) && ovC.rightAir < ovC.padRight - 1; console.log(tag, 'control caught:', caught, JSON.stringify(ovC.over.slice(0, 3)), 'air', ovC.rightAir); if (!caught) { bad++; console.log(tag, 'FAIL control not caught'); }
    await ctrlH.evaluate(function (e) { e.remove(); }); await p.waitForTimeout(100); var ctrlGone = await p.evaluate(function () { var m = document.getElementById('main'); var c1 = parseFloat(getComputedStyle(m).gridTemplateColumns); return c1 > 0 && c1 < 0.6 * m.clientWidth && !!document.querySelector('#facecol style, #patient style, style'); }); if (!ctrlGone) { bad++; console.log(tag, 'FAIL control style not removed cleanly'); }
    await p.click('.slot[data-part="fan"]'); await p.waitForTimeout(600); await p.screenshot({ path: SHOTS + '/look_cards_' + tag + '.png' });
    var r = await p.evaluate(function () { var out = []; document.querySelectorAll('#cards *').forEach(function (el) { if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflowY === 'visible' && el.id) out.push('V:' + el.id); }); var cl = document.getElementById('cardlist'); return { over: out, cardlist: cl.scrollHeight + '/' + cl.clientHeight }; });
    console.log(tag, 'cards', JSON.stringify(r));
    await p.click('.card[data-key="fan"]'); await p.waitForTimeout(400);
    await p.goto(ROOT + '?solo=1&bot=1&fast=1&seed=5&still=1&tour=0&at=done'); await p.waitForFunction(function () { return document.title === 'ready'; }); await p.waitForTimeout(600);
    await p.screenshot({ path: SHOTS + '/look_done_' + tag + '.png' });
    var screens = [['done', '?solo=1&bot=1&fast=1&seed=5&still=1&tour=0&at=done', '#app'], ['ward', '?stage=ward&seat=A&seats=A', '#ward'],
      ['boss', '?stage=boss', '#extra'], ['names', '?stage=names', '#extra'], ['machine', '?stage=machine', '#extra'], ['letter', '?stage=letter', '#letter']];
    for (var k = 0; k < screens.length; k++) {
      await p.goto(ROOT + screens[k][1]); await p.waitForFunction(function () { return document.title === 'ready'; }, null, { timeout: 15000 }); await p.waitForTimeout(500);
      if (screens[k][0] === 'ward') { await p.click('.bed'); await p.waitForTimeout(500); }
      var so = await p.evaluate(screenFn, screens[k][2]);
      console.log(tag, screens[k][0], JSON.stringify(so)); if (so.length) { bad++; console.log(tag, 'FAIL ' + screens[k][0]); }
      await p.screenshot({ path: SHOTS + '/look_' + screens[k][0] + '_' + tag + '.png' });
    }
    /* CONTROL: a screen pushed past the window edge must be caught */
    await p.addStyleTag({ content: '#letter{margin-left:120vw !important}' }); var sc = await p.evaluate(screenFn, '#letter');
    console.log(tag, 'screen control caught:', sc.length > 0); if (!sc.length) { bad++; console.log(tag, 'FAIL screen control not caught'); }
    await ctx.close();
  }
  console.log('errors:', errs.length ? errs.join('\n') : 'none'); await b.close();
  console.log(bad || errs.length ? 'LOOK FAIL ' + bad : 'LOOK OK'); process.exit(bad || errs.length ? 1 : 0);
})();
