/* J2 L6 The Headliner · the live-walk gate · written 25 Nov 2026
   Found walking the hour live in his Chrome at school-PC size (1366x625 window, so the hour's frame is 1366x484):
   Next and lit boxes fell below the fold, a sum typed without = got "the wrong number", fill feedback blamed a right
   sum, the c4 hint repeated the question, the right predict option never showed after a wrong pick, typing 25 for 25 %
   got no help, and free time told her to "leave" tickets she had changed, opened with "The hour is over", had no help.
   Runs the hour page itself at 1366x484 (files served from disk through page.route, no server):
     1  the model pupil walks donow → free; every button she must click next is in view and not covered when she needs
        it (the gate never scrolls for her); the coach card and the sum bar are sticky; Pause/Sound stand on the right;
     2  wrong moves, one fresh page each (?at=<screen>), each must get the line written for it;
     3  free time: the exact set-up step, D13 in view, Stuck? Show me with three steps, both challenges won, the end line.
   CONTROL=1 serves hour.html, main.js, strings.js and judge.js from git HEAD (before this fix): must go RED.
     node ks3-dt/tools/record-tutorial/qa-j2l6-walk.js            (expects PASS, exit 0)
     CONTROL=1 node ks3-dt/tools/record-tutorial/qa-j2l6-walk.js  (expects RED, exit 1) */
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright')); }
const ASSETS = path.join(__dirname, '../../platform/assets');
const CONTROL = process.env.CONTROL === '1';
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const REV = argOf('--base-rev', 'HEAD');
const FILES = ['hour.html', 'hour/main.js', 'hour/strings.js', 'hour/judge.js'];
const OLD = f => cp.execSync('git show ' + REV + ':ks3-dt/platform/assets/headliner/' + f, { cwd: path.join(__dirname, '../../..'), encoding: 'utf8', maxBuffer: 1 << 26 });
const SERVE = {};
for (const f of FILES) SERVE[path.join(ASSETS, 'headliner', f)] = CONTROL ? OLD(f) : fs.readFileSync(path.join(ASSETS, 'headliner', f), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webp': 'image/webp' };
const W = 1366, H = 484;
let passes = 0, fails = 0;
const must = (ok, msg) => { if (ok) passes++; else fails++; console.log((ok ? '  PASS ' : '  FAIL ') + msg); };

/* static: the words this fix changed */
const STR = SERVE[path.join(ASSETS, 'headliner/hour/strings.js')];
must(!/'B1 and C4'/.test(STR), 'predict2 options never offer B1 (B1 is the rate, not a price box)');
must(/Part 5 · Pin a box/.test(STR), 'part 5 is called "Pin a box"');
must(!/Click the Shop tab/.test(STR), 'part 5 intro does not tell her to click a tab that is already open');
must(!/yes: 'Tell her: yes, we make £|no: 'Tell her: no, we lose £/.test(STR), 'the c4 answers carry no £ figure (the figure would give the answer away)');

async function open(b, q, hash) {
  const page = await b.newPage({ viewport: { width: W, height: H } });
  const errs = []; page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
  await page.route('http://gate.local/**', route => {
    const u = new URL(route.request().url()); const p = path.join(ASSETS, decodeURIComponent(u.pathname));
    if (SERVE[p] != null) return route.fulfill({ status: 200, contentType: TYPES[path.extname(p)], body: SERVE[p] });
    if (!p.startsWith(ASSETS) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ status: 200, contentType: TYPES[path.extname(p)] || 'application/octet-stream', body: fs.readFileSync(p) });
  });
  await page.route(/^https?:\/\/(?!gate\.local)/, route => route.abort());
  await page.goto('http://gate.local/headliner/hour.html?' + (q || 'x=0') + '#' + encodeURIComponent(JSON.stringify(Object.assign({ test: 1 }, hash || {}))), { waitUntil: 'load' });
  await page.waitForFunction(() => window.Hour, null, { timeout: 15000 });
  page.errs = errs; return page;
}
/* wholly inside the 484px frame and the top thing at its centre (not under the strip, the dock or a sticky card) */
const seen = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); if (!el) return 'missing'; const r = el.getBoundingClientRect(); if (!r.height) return 'hidden';
  if (r.top < 0 || r.bottom > innerHeight) return 'outside (top ' + Math.round(r.top) + ', bottom ' + Math.round(r.bottom) + ' of ' + innerHeight + ')';
  const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === el || el.contains(t) || t.contains(el)) ? 'ok' : 'covered by ' + (t ? t.className || t.tagName : 'nothing'); }, sel);
const cellSel = ref => '[data-cell="' + ref + '"]';
async function type(page, ref, text) { await page.click(cellSel(ref)); await page.keyboard.type(text); await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
const line = page => page.evaluate(() => { const l = document.querySelector('main .line'); return l ? { text: l.textContent, cls: l.className, border: getComputedStyle(l).borderTopColor } : { text: '', cls: '', border: '' }; });
const mainText = page => page.evaluate(() => document.querySelector('main').innerText);
const RED = 'rgb(255, 138, 128)';

(async () => {
  const b = await chromium.launch();
  try {
    /* 1 · the model walk at 1366x484 */
    {
      const page = await open(b);
      const notSeen = [], cellsOut = [];
      let n = 0, last = '';
      while (n++ < 400) {
        const s = await page.evaluate(() => ({ id: Hour.screen(), w: Hour.want() }));
        if (!s.w || s.w.kind === 'done' || s.id === 'free') { last = s.id; break; }
        if (s.w.kind === 'wait') { await page.waitForTimeout(Math.min(s.w.ms, 3000)); continue; }
        if (s.w.kind === 'click') { await page.waitForTimeout(60); const v = await seen(page, s.w.sel); if (v !== 'ok') notSeen.push(s.id + ' ' + s.w.sel + ': ' + v); await page.click(s.w.sel); }
        else if (s.w.kind === 'cell') { await type(page, s.w.ref, s.w.text); }
        else if (s.w.kind === 'fill') { await page.click(cellSel(s.w.from)); await page.click('[data-act="fill"]'); }
        await page.waitForTimeout(40);
      }
      must(last === 'free', 'the model pupil reaches free time (stopped at ' + last + ')');
      must(notSeen.length === 0, 'every button she must click next is in view and uncovered at 1366x484' + (notSeen.length ? ': ' + notSeen.slice(0, 6).join(' | ') + (notSeen.length > 6 ? ' (+' + (notSeen.length - 6) + ')' : '') : ''));
      must(page.errs.length === 0, 'no page errors on the walk' + (page.errs.length ? ': ' + page.errs.join('; ') : ''));
      await page.close();
    }
    /* sticky coach and sum bar; the dock on the right */
    {
      const page = await open(b, 'at=c2-d11');
      const st = await page.evaluate(() => { const c = document.querySelector('.two>.coach'), bar = document.querySelector('.sheet>.bar'), d = document.querySelector('.dock'); const dr = d && d.getBoundingClientRect();
        return { coach: c && getComputedStyle(c).position, bar: bar && getComputedStyle(bar).position, dockRight: dr ? Math.round(innerWidth - dr.right) : -1, dockLeft: dr ? Math.round(dr.left) : -1 }; });
      must(st.coach === 'sticky', 'the job card stays in view while she scrolls the sheet (coach ' + st.coach + ')');
      must(st.bar === 'sticky', 'the sum bar stays at the top while she types into a low box (bar ' + st.bar + ')');
      must(st.dockRight >= 0 && st.dockRight < 40 && st.dockLeft > W / 2, 'Pause and Sound stand on the right, off the row names (left ' + st.dockLeft + ', right gap ' + st.dockRight + ')');
      await page.click(cellSel('D11')); await page.waitForTimeout(120);
      const bar = await seen(page, '.sheet>.bar');
      must(bar === 'ok', 'after clicking D11 the sum bar is in view (' + bar + ')');
      await page.close();
    }
    /* 2 · wrong moves */
    { const page = await open(b, 'at=c1-ask'); await type(page, 'D3', 'B3*C3'); const l = await line(page);
      must(/=/.test(l.text) && /no-eq/.test(l.cls), 'a sum typed without = gets the "put = at the start" line (' + l.text.slice(0, 70) + ')');
      must(l.border === RED, 'that line is red (' + l.border + ')'); await page.close(); }
    { const page = await open(b, 'at=c1-change'); await type(page, 'B3', '1250'); const l = await line(page);
      must(/not 1,300 yet/.test(l.text) && !/still says 1,200/.test(l.text), 'B3 changed to the wrong number: the line says it is not 1,300 yet, never "still says 1,200" (' + l.text.slice(0, 60) + ')'); await page.close(); }
    { const page = await open(b, 'at=c2-fill'); await page.click(cellSel('D3')); await page.waitForTimeout(100);
      const h = await page.$('[data-handle="D3"]'); const hb = h && await h.boundingBox(); const d4 = await (await page.$(cellSel('D4'))).boundingBox();
      if (hb) { await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down(); await page.mouse.move(d4.x + d4.width / 2, d4.y + d4.height / 2, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150); }
      const l = await line(page);
      must(!!hb && /D5/.test(l.text) && !/D4 and D5/.test(l.text), 'a fill dragged only to D4 names D5 as the empty box (' + l.text.slice(0, 70) + ')');
      await page.click('[data-act="fill"]'); await page.waitForTimeout(150); const l2 = await line(page);
      must(/One copy/.test(l2.text), 'the fill-down success line says "One copy" (Fill down is a copy, not always a drag)'); await page.close(); }
    { const page = await open(b, 'at=c5-fill'); await page.click('[data-act="fill"]'); await page.waitForTimeout(120); const l = await line(page);
      must(/Click C3 first/.test(l.text), 'Fill down pressed with no box picked says "Click C3 first" (' + l.text.slice(0, 50) + ')'); await page.close(); }
    { const page = await open(b, 'at=c5-pinfill'); await page.evaluate(() => { const M = Hour.book.sheet('merch'); M.set('C3', '=B3*(1+B1)'); M.fillDown('C3', 'C6'); Hour.go(Hour.ids().indexOf('c5-pinfill')); }); await type(page, 'C3', '=B3*(1+$B$1)'); const l = await line(page);
      must(/C3 is right/.test(l.text) && /C6/.test(l.text) && l.border !== RED, 'a right pinned sum in C3 is told to fill down to C6, not marked wrong (' + l.text.slice(0, 60) + ', ' + l.border + ')'); await page.close(); }
    { const page = await open(b, 'at=c3-testchange'); await type(page, 'D10', '9000'); await page.waitForTimeout(200); const v = await seen(page, cellSel('D13'));
      must(v === 'ok', 'c3 test change: D13 scrolls into view so she can read it (' + v + ')'); await page.close(); }
    { const page = await open(b, 'at=c4-q1');
      await page.click('[data-pred="yes"]'); await page.waitForTimeout(100); await page.click('[data-ans="yes"]'); await page.waitForTimeout(100);
      const l1 = await line(page);
      must(/does not show the answer yet/.test(l1.text), 'c4 answered before the change: the not-yet line shows');
      await type(page, 'C3', '30'); await page.waitForTimeout(200); const l2 = await line(page); const v = await seen(page, cellSel('D13'));
      must(!/does not show the answer yet/.test(l2.text), 'c4: once the change is made the stale not-yet line clears');
      must(v === 'ok', 'c4: once the change is made D13 scrolls into view (' + v + ')'); await page.close(); }
    { const page = await open(b, 'at=c4-q1&speed=60'); await page.click('[data-pred="yes"]');
      await page.waitForFunction(() => Hour.clock().timedOut, null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(200); const hb = await page.$('[data-act="hint"]'); if (hb) { await hb.click(); await page.waitForTimeout(120); }
      const t = await mainText(page);
      must(!!hb && /Click C3\. Type 30/.test(t), 'c4 after the time runs out: the hint says the exact clicks, not the question again');
      await page.close(); }
    { const page = await open(b, 'at=c5-show'); const lab = await page.evaluate(() => { const d = document.querySelector('.demolab'); return d ? d.textContent : ''; });
      must(lab === 'C3', 'part 5 demo is labelled C3, the box it is typed in (' + lab + ')'); await page.close(); }
    { const page = await open(b, 'at=c5-predict'); const opts = await page.$$eval('[data-opt]', a => a.map(x => x.dataset.opt)); const wrong = opts.find(o => o !== '37.50');
      await page.click('[data-opt="' + wrong + '"]'); await page.waitForTimeout(120);
      const cls = await page.$eval('[data-opt="37.50"]', x => x.className);
      must(/\bright\b/.test(cls), 'after a wrong guess the right option turns green (' + cls + ')'); await page.close(); }
    { const page = await open(b, 'at=c5-change'); await type(page, 'B1', '25'); const l = await line(page);
      must(/0\.25/.test(l.text) && /£780/.test(l.text), 'B1 typed as 25: the line explains 25% is written 0.25 (' + l.text.slice(0, 60) + ')'); await page.close(); }
    { const page = await open(b, 'x=0', { saved: { at: 'c3-ask' } }); const t = await mainText(page);
      must(/part 3/.test(t) && !/\d · /.test(t), 'the welcome-back line says "part 3, …" in words (' + t.split('\n')[0].slice(0, 70) + ')'); await page.close(); }
    /* 3 · free time */
    { const page = await open(b, 'at=free');
      await type(page, 'B3', '1100'); await type(page, 'C3', '32');
      let t = await mainText(page);
      must(/First, B3 must say 1,200/.test(t) && !/leave the tickets/i.test(t), 'challenge 1 with B3 at 1,100: the line names the exact step (B3 must say 1,200)');
      let v = await seen(page, cellSel('D13')); must(v === 'ok', 'free time: D13 is in view (' + v + ')');
      const sb = await page.$('[data-act="free-help"]'); if (sb) { await sb.click(); await page.waitForTimeout(120); }
      const lis = await page.$$eval('main .hint ol li', a => a.length).catch(() => 0);
      must(!!sb && lis === 3, 'challenge 1 has a green "Stuck? Show me" that opens three steps (' + lis + ')');
      await type(page, 'B3', '1200'); await type(page, 'C3', '27'); t = await mainText(page);
      must(/You found it\. At £27/.test(t), 'challenge 1 won at £27');
      must(/First, C3 must say 25/.test(t), 'challenge 2 opens with the exact step (C3 must say 25)');
      await type(page, 'C3', '25'); await type(page, 'B3', '1300'); let l = await line(page);
      must(/1,300/.test(l.text), 'challenge 2 tries say tickets with a comma (' + l.text.slice(0, 50) + ')');
      await type(page, 'B3', '1269'); t = await mainText(page);
      must(/You found it\. 1,269/.test(t), 'challenge 2 won at 1,269 tickets');
      must(/Press Done when you finish/.test(t) && !/The hour is over/.test(t), 'challenge 3 says how to finish, never "The hour is over" as it opens');
      must(page.errs.length === 0, 'no page errors in free time' + (page.errs.length ? ': ' + page.errs.join('; ') : ''));
      await page.close(); }
  } catch (e) { fails++; console.log('  FAIL gate crashed: ' + String(e).split('\n')[0]); }
  await b.close();
  console.log('qa-j2l6-walk' + (CONTROL ? ' CONTROL' : '') + ': ' + passes + ' pass, ' + fails + ' fail');
  process.exit(fails ? 1 : 0);
})();
