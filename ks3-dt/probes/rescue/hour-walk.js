/* A driver for the whole-hour prototype: opens the page, types like a pupil, waits for moments in the
   story, and takes pictures. Used by the walk scripts and the typed tests.
   const W = await require('./hour-walk.js').open({ query, size, out }) */
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const path = require('path'), fs = require('fs');
/* the gates open the SERVED copy of the lesson's story page (tools/rescue/build-rescue.py makes it):
   node ks3-dt/tools/dev-static.js 8121 <worktree> must be running */
exports.BASE = process.env.RESCUE_BASE || 'http://localhost:8121/ks3-dt/probes/rescue/';
exports.PAGE = exports.BASE + 'hour.html';
exports.ART = exports.BASE + 'art-test.html';
exports.open = async function (o) {
  o = o || {}; const size = o.size || [1366, 768], out = o.out || '.';
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: o.dpr || 1 });
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const W = { p, errs, fails: 0, checks: 0 };
  W.go = async q => { await p.goto(exports.PAGE + '?' + q); await p.waitForFunction(() => window.Hour && Hour.id, null, { timeout: 8000 }); };
  W.st = () => p.evaluate(() => ({ id: Hour.id, t: +Hour.t.toFixed(2), asking: !!Hour.input, val: document.getElementById('hinp').value,
    fb: document.getElementById('hfb').textContent, fbk: document.getElementById('hfb').className, say: document.body.querySelector('#hsay.on') ? document.getElementById('hsayt').textContent : '',
    cap: document.querySelector('#hcap.on') ? document.getElementById('hcap').textContent : '', h: document.querySelector('#hcard.on') ? document.getElementById('hh').textContent : '',
    help: document.getElementById('hhelp').textContent, page: Hour.pageAt ? Hour.pageAt() : -1, name: Hour.name(), water: Hour.V.water }));
  W.until = async (fn, ms, arg) => { try { await p.waitForFunction(fn, arg, { timeout: ms || 30000, polling: 50 }); return true; } catch (e) { errs.push('timed out waiting: ' + String(fn).slice(0, 90)); return false; } };
  W.asking = ms => W.until(() => !!Hour.input, ms);
  W.step = (id, ms) => W.until(i => Hour.id === i, ms, id);
  W.type = async (t, delay) => { await W.asking(); await p.keyboard.type(t, { delay: delay == null ? 25 : delay }); await p.keyboard.press('Enter'); await p.waitForTimeout(120); return W.st(); };
  W.shot = async (name, clip) => { await p.screenshot({ path: path.join(out, name + '.png'), clip: clip || undefined }); };
  W.sleep = ms => p.waitForTimeout(ms);
  W.must = (ok, what) => { W.checks++; if (!ok) { W.fails++; console.log('FAIL: ' + what); } };
  W.close = async () => { if (errs.length) console.log('PAGE ERRORS: ' + errs.join(' | ')); await b.close(); };
  return W;
};
