#!/usr/bin/env node
/* G14 - All slides (v20, 19 Nov 2026). His ask: "a button that can take the reader back to the starting slide, rather than having
 * to manually click previous numerous times ... or an efficient navigation option to let them go to whatever slide they want".
 * The slide screen gets an "All slides" button. It shows every slide of the set as a small numbered picture; she presses one to go
 * straight to it. Driven as a pupil on the dev harness with the real slide pictures, at four screen sizes:
 *   the button is on screen and its words fit, on the normal screen and in full screen; the grid shows every slide in order
 *   ("Slide 1" ... "Slide n"), marks the slide she is on ("You are here") and scrolls it into view; NO small picture shows an
 *   answer: a slide with click reveals shows its before-any-click picture (NN-0), as it looks when she arrives with Next;
 *   pressing a picture opens that slide with nothing revealed yet; "Back to slide i", and Esc, close the grid without moving;
 *   arrow keys do not move the slide while the grid is open; Home goes to slide 1 and End to the last slide;
 *   the grid works in full screen and full screen stays after a jump;
 *   jumping ahead does NOT count as having seen the slides skipped: after slide 1 -> jump -> last slide, the topic page still says
 *   "Up to slide n of n", not "All n slides seen" (the staff tracker reads the same number), and this holds after a reload.
 * COVERAGE: every slide set uses this one viewer (hub.js slides()); the smallest set is driven in full at four sizes, and EVERY slide
 * set in lessons.js has its grid opened and every small picture checked (count, order, labels, no answer shown).
 * CONTROL: the v19 page (origin/main before v20, commit 6590651c) must fail.
 */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), { spawn, execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const REPO = process.env.S1_REPO || '/Users/damiengartland/Sites/s1-wt-platform';
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const S1L = require(path.join(ROOT, 'platform', 'lessons.js')), L = S1L.S;
const PORT = +(process.env.G14_PORT || 8797), SPORT = PORT + 1, BASE = 'http://localhost:' + PORT, ACT = 'http://localhost:' + SPORT + '/';
const OWNER = 'dgartland021@c2ken.net', P = 'pupil1@c2ken.net', CLS = '11a-dt';
const decks = [].concat(...S1L.topics.map((t) => t.decks.map((d) => Object.assign({ topic: t.id }, d))));
const D = decks.slice().sort((a, b) => a.n - b.n)[0], TOP = S1L.topics.find((t) => t.id === D.topic);
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };
const stat = http.createServer((req, rs) => { const u = decodeURIComponent(new URL(req.url, ACT).pathname); const f = path.normalize(path.join(REPO, u)); if (!f.startsWith(REPO)) { rs.writeHead(403); return rs.end(); }
  fs.readFile(f, (e, b) => { if (e) { rs.writeHead(404); return rs.end('not found'); } rs.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); rs.end(b); }); }).listen(SPORT);


const INDEX = path.join(ROOT, 'server', 'Index.html');
const pad = (n) => (n < 10 ? '0' : '') + n;
const steps = (d) => d.steps || {};
const J = +Object.keys(steps(D)).map(Number).filter((j) => j > 2 && j < D.n).sort((a, b) => a - b)[0]; // a slide with click reveals, well past slide 2
const want = (d, j) => 's1_platform/decks/' + d.id + '/' + pad(j) + (steps(d)[j] ? '-0' : '') + '.webp';
const LOOK = () => {
  const r = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, b: q.bottom, rt: q.right }; };
  const vis = (e) => { const q = r(e); return !!q && q.w > 0 && q.h > 0 && q.y >= -1 && q.x >= -1 && q.b <= innerHeight + 1 && q.rt <= innerWidth + 1 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none' && !e.closest('[hidden]'); };
  const fits = (e) => !!e && e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1;
  const p = document.getElementById('spick'), sall = document.getElementById('sall'), back = document.getElementById('spback'), box = p && p.querySelector('.sgrid');
  const th = p ? [].slice.call(p.querySelectorAll('.sthumb')) : [];
  const cur = th.filter((b) => b.getAttribute('aria-current') === 'true');
  const inBox = (e) => { if (!e || !box) return false; const a = e.getBoundingClientRect(), c = box.getBoundingClientRect(); return a.top >= c.top - 1 && a.bottom <= c.bottom + 1; };
  const im = document.getElementById('simg'), s = document.querySelector('.slides');
  return { sallText: sall ? sall.textContent.trim() : null, sallVis: vis(sall), sallFit: fits(sall), open: !!p && !p.hidden && vis(p),
    head: p && p.querySelector('h2') ? p.querySelector('h2').textContent.trim() : '', back: back ? back.textContent.trim() : '', backVis: vis(back), backFit: fits(back),
    n: th.length, labels: th.map((b) => (b.querySelector('.sn') || {}).textContent || ''), srcs: th.map((b) => (b.querySelector('img') || { getAttribute: () => '' }).getAttribute('src')),
    curN: cur.length, cur: cur.length ? +cur[0].dataset.k : 0, curHere: cur.length ? cur[0].textContent : '', curVis: cur.length ? vis(cur[0]) && inBox(cur[0]) : false,
    labelsFit: th.every((b) => fits(b.querySelector('.sn'))), firstVis: th.length ? vis(th[0]) : false, slideVis: vis(document.getElementById('slide')),
    big: !!s && s.classList.contains('big'), src: im ? im.getAttribute('src') : '', count: (document.getElementById('scount') || {}).textContent || '',
    more: (document.getElementById('smore') || {}).textContent || '', hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
};
async function harness(indexFile, store) {
  try { fs.unlinkSync(store); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { S1U1_STORE: store, S1U1_INDEX: indexFile }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 10000); });
  const post = async (p, body, user) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user || OWNER }, body: JSON.stringify(body || {}) })).json();
  await post('/api/apiStaff', { op: 'create', name: '11A DT' });
  for (const t of S1L.topics) if (t.decks.length) await post('/api/apiStaff', { op: 'setTopic', cls: CLS, topic: t.id, open: true });
  await post('/api/apiName', { cls: CLS, name: 'Aoife' }, P);
  return srv;
}
const URL0 = BASE + '/?class=' + CLS + '&as=' + encodeURIComponent(P) + '&actbase=' + encodeURIComponent(ACT);
async function openDeck(page, d) {
  await page.goto(URL0, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-open="' + d.topic + '"]', { timeout: 15000 }); await page.click('[data-open="' + d.topic + '"]');
  await page.waitForSelector('[data-deck="' + d.id + '"]', { timeout: 10000 }); await page.click('[data-deck="' + d.id + '"]');
  await page.waitForSelector('#simg', { timeout: 10000 }); await wait(500);
}
const tap = async (page, sel) => { const e = await page.$(sel); if (e) await e.click(); await wait(450); return !!e; };
async function run(indexFile, store, vw, vh) {
  const out = { errs: [] }; let browser, srv;
  try {
    srv = await harness(indexFile, store);
    browser = await puppeteer.launch({ headless: 'shell' });
    const page = await browser.newPage(); await page.setViewport({ width: vw, height: vh });
    page.on('pageerror', (e) => out.errs.push(e.message));
    await openDeck(page, D);
    out.normal = await page.evaluate(LOOK);
    await tap(page, '#sall'); out.p1 = await page.evaluate(LOOK);
    await page.keyboard.press('ArrowRight'); await wait(300); out.arrow = await page.evaluate(LOOK);
    await tap(page, '#spback'); out.back = await page.evaluate(LOOK);
    await tap(page, '#sall'); await page.keyboard.press('Escape'); await wait(400); out.esc = await page.evaluate(LOOK);
    await tap(page, '#sall'); await tap(page, '.sthumb[data-k="' + J + '"]'); out.jump = await page.evaluate(LOOK);
    await tap(page, '#sall'); out.p2 = await page.evaluate(LOOK); await page.keyboard.press('Escape'); await wait(300);
    await page.keyboard.press('End'); await wait(400); out.end = await page.evaluate(LOOK);
    await page.keyboard.press('Home'); await wait(400); out.home = await page.evaluate(LOOK);
    await tap(page, '#sfull'); await tap(page, '#sall'); out.bigp = await page.evaluate(LOOK);
    await tap(page, '.sthumb[data-k="' + D.n + '"]'); out.bigj = await page.evaluate(LOOK);
    await page.keyboard.press('Escape'); await wait(600);
    await tap(page, '#cHub'); await wait(1500); // the place is saved on the way out
    await page.goto(URL0, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-open="' + D.topic + '"]', { timeout: 15000 }); await page.click('[data-open="' + D.topic + '"]');
    await page.waitForSelector('[data-deck="' + D.id + '"]', { timeout: 10000 });
    out.row = await page.evaluate((id) => { const b = document.querySelector('[data-deck="' + id + '"]'), row = b && b.closest('.row'); return row ? (row.querySelector('.status') || {}).textContent : null; }, D.id);
  } catch (e) { out.errs.push(String(e && e.message || e)); }
  finally { if (browser) await browser.close(); if (srv) srv.kill(); await wait(300); }
  return out;
}
async function every(indexFile, store) { // every slide set: open its grid, read every small picture
  const out = {}; let browser, srv;
  try {
    srv = await harness(indexFile, store);
    browser = await puppeteer.launch({ headless: 'shell' });
    const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
    for (const d of decks) { await openDeck(page, d); await tap(page, '#sall'); out[d.id] = await page.evaluate(LOOK); }
  } catch (e) { out.err = String(e && e.message || e); }
  finally { if (browser) await browser.close(); if (srv) srv.kill(); await wait(300); }
  return out;
}
const grid = (o, d, k) => !!o && o.open && o.n === d.n && o.labels.every((x, j) => x.trim() === fmt(L.pickOne, { i: j + 1 })) && o.curN === 1 && o.cur === k && o.curHere.indexOf(L.pickHere) !== -1;
const noAnswers = (o, d) => !!o && o.n === d.n && o.srcs.every((s, j) => String(s).endsWith(want(d, j + 1)));
const onSlide = (o, k, s0) => !!o && !o.open && o.slideVis && o.count === fmt(L.slideOf, { i: k, n: D.n }) && (!s0 || String(o.src).endsWith(want(D, k)));
(async () => {
  check('the slide set used has a slide with click reveals past slide 2 (J = ' + J + ')', J > 2 && J < D.n);
  for (const [vw, vh] of [[1280, 800], [1366, 768], [1024, 768], [390, 844]]) {
    const sz = ' at ' + vw + 'x' + vh, phone = vw < 640;
    const v = await run(INDEX, path.join(DESIGN, 'gates', 'g14-store.json'), vw, vh);
    check('the slide screen has an "' + L.slidesAll + '" button, on screen, its words fit' + sz, !!v.normal && v.normal.sallText === L.slidesAll && v.normal.sallVis && v.normal.sallFit, JSON.stringify(v.normal));
    check('it opens a grid of every slide in order, "' + L.pickHead + '", slide 1 marked "' + L.pickHere + '"' + sz, grid(v.p1, D, 1) && v.p1.head === L.pickHead && v.p1.firstVis && v.p1.curVis, JSON.stringify(v.p1));
    check('the grid has "' + fmt(L.pickBack, { i: 1 }) + '" on screen, its words and every label fit, no sideways scroll' + sz, !!v.p1 && v.p1.back === fmt(L.pickBack, { i: 1 }) && v.p1.backVis && v.p1.backFit && v.p1.labelsFit && !v.p1.hscroll, JSON.stringify(v.p1 && [v.p1.back, v.p1.backVis, v.p1.backFit, v.p1.labelsFit, v.p1.hscroll]));
    check('no small picture shows an answer (a slide with clicks shows its before-click picture)' + sz, noAnswers(v.p1, D), JSON.stringify(v.p1 && v.p1.srcs.filter((s, j) => !String(s).endsWith(want(D, j + 1)))));
    check('the arrow keys do not move the slide while the grid is open' + sz, !!v.arrow && v.arrow.open && v.arrow.count === fmt(L.slideOf, { i: 1, n: D.n }), JSON.stringify(v.arrow && [v.arrow.open, v.arrow.count]));
    check('"' + fmt(L.pickBack, { i: 1 }) + '" closes the grid on the same slide' + sz, onSlide(v.back, 1) && v.back.src === v.normal.src, JSON.stringify(v.back));
    check('Esc closes the grid on the same slide' + sz, onSlide(v.esc, 1) && v.esc.src === v.normal.src, JSON.stringify(v.esc));
    check('pressing slide ' + J + ' opens it with nothing revealed yet, and says there is more' + sz, onSlide(v.jump, J, true) && v.jump.more === L.slideMore, JSON.stringify(v.jump));
    check('opening the grid again marks slide ' + J + ' and shows it' + sz, grid(v.p2, D, J) && v.p2.curVis, JSON.stringify(v.p2 && [v.p2.cur, v.p2.curVis]));
    check('End goes to the last slide, Home to slide 1' + sz, onSlide(v.end, D.n, true) && onSlide(v.home, 1, true), JSON.stringify([v.end && v.end.count, v.home && v.home.count]));
    if (!phone) {
      check('in full screen the grid shows, "' + fmt(L.pickBack, { i: 1 }) + '" and the first pictures on screen' + sz, grid(v.bigp, D, 1) && v.bigp.big && v.bigp.backVis && v.bigp.firstVis && !v.bigp.hscroll, JSON.stringify(v.bigp));
      check('a jump in full screen keeps full screen' + sz, onSlide(v.bigj, D.n, true) && v.bigj.big, JSON.stringify(v.bigj));
    }
    check('jumping ahead does not count the skipped slides as seen: the topic says "' + fmt(L.deckAt, { i: D.n, n: D.n }) + '" after a reload' + sz, v.row === fmt(L.deckAt, { i: D.n, n: D.n }), v.row);
    check('no page errors' + sz, !v.errs.length, v.errs.join(' | '));
  }
  const all = await every(INDEX, path.join(DESIGN, 'gates', 'g14-all-store.json'));
  check('every slide set opened its grid', !all.err, all.err);
  for (const d of decks) {
    check('slide set ' + d.id + ': ' + d.n + ' small pictures, in order, labelled, slide 1 marked', grid(all[d.id], d, 1), JSON.stringify(all[d.id] && [all[d.id].n, all[d.id].cur]));
    check('slide set ' + d.id + ': no small picture shows an answer (' + Object.keys(steps(d)).length + ' slides with clicks)', noAnswers(all[d.id], d), JSON.stringify(all[d.id] && all[d.id].srcs.filter((s, j) => !String(s).endsWith(want(d, j + 1))).slice(0, 5)));
    check('slide set ' + d.id + ': every small picture exists', [...Array(d.n)].every((x, j) => fs.existsSync(path.join(REPO, want(d, j + 1)))));
  }
  const CTL = path.join(DESIGN, 'gates', 'g14-control.html');
  fs.writeFileSync(CTL, execSync('git -C "' + ROOT + '" show 6590651c:s1-unit1/server/Index.html', { maxBuffer: 1 << 26 }));
  const c = await run(CTL, path.join(DESIGN, 'gates', 'g14-control-store.json'), 1280, 800);
  check('CONTROL the v19 page (no All slides) is caught', !(c.normal && c.normal.sallText === L.slidesAll && grid(c.p1, D, 1)), JSON.stringify(c.normal && c.normal.sallText));
  stat.close();
  log.push((res.fail ? 'RED' : 'GREEN') + ' . ' + res.pass + ' pass . ' + res.fail + ' fail . slide set driven: ' + D.id + ' (' + D.n + ' slides), J = ' + J);
  fs.writeFileSync(path.join(DESIGN, 'gates', 'g14-run.log'), log.join('\n') + '\n');
  console.log(log.join('\n')); process.exit(res.fail ? 1 : 0);
})();
