#!/usr/bin/env node
/* G12 — Full screen for slide sets (v18, 15 Nov 2026). He asked for the slide sets, now and to come, to go full screen inside
 * the app, as the activities do (v17). The slide screen gets the same "Full screen" button. Driven as a pupil on the dev
 * harness with the real slide pictures from the S1 repo, at four screen sizes:
 *   the button says "Full screen" and its words fit; pressing it makes the WHOLE slide fill the screen (the wider of the two
 *   sides used, nothing cut off), with Previous, Next, the slide count and "Exit full screen" all on screen and fitting;
 *   the arrow keys and Next still move on in full screen; Esc and "Exit full screen" both bring the normal screen back;
 *   finishing the slide set in full screen goes back to the topic page on the normal screen, and the next activity opens normally.
 * COVERAGE: every slide set uses this one viewer (hub.js slides()), so one real set (the smallest, sw) covers them all, and any
 * set added later. The check also reads every slide set in lessons.js and fails if one has no pictures folder to show.
 * CONTROL: the v17 page (commit 5707f7ac's server/Index.html) must fail.
 */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), { spawn, execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const REPO = process.env.S1_REPO || '/Users/damiengartland/Sites/s1-wt-platform';
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const S1L = require(path.join(ROOT, 'platform', 'lessons.js')), L = S1L.S;
const PORT = +(process.env.G12_PORT || 8787), SPORT = PORT + 1, BASE = 'http://localhost:' + PORT, ACT = 'http://localhost:' + SPORT + '/';
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
const LOOK = () => {
  const s = document.querySelector('.slides'), sl = document.getElementById('slide'), im = document.getElementById('simg'), x = document.getElementById('sfull'), j = document.querySelector('.slides .job');
  const r = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, b: q.bottom, rt: q.right }; };
  const vis = (e) => { const q = r(e); return !!q && q.w > 0 && q.h > 0 && q.y >= -1 && q.x >= -1 && q.b <= innerHeight + 1 && q.rt <= innerWidth + 1 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none'; };
  const fits = (e) => !!e && e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1;
  const btns = ['sprev', 'snext', 'sfull'].map((id) => document.getElementById(id));
  return { big: !!s && s.classList.contains('big'), sl: r(sl), W: innerWidth, H: innerHeight, slVis: vis(sl), img: im ? im.complete && im.naturalWidth > 0 : false, src: im ? im.getAttribute('src') : '',
    navVis: btns.every(vis) && vis(document.getElementById('scount')), fit: btns.every(fits), exitText: x ? x.textContent.trim() : '', pressed: x ? x.getAttribute('aria-pressed') : '', jobVis: vis(j),
    count: (document.getElementById('scount') || {}).textContent || '', hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
};
async function run(indexFile, store, vw, vh) {
  try { fs.unlinkSync(store); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { S1U1_STORE: store, S1U1_INDEX: indexFile }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 10000); });
  const post = async (p, body, user) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user || OWNER }, body: JSON.stringify(body || {}) })).json();
  const out = { label: null, normal: null, big: null, key: null, nxt: null, esc: null, big2: null, exit: null, end: null, act: null, errs: [] };
  let browser;
  try {
    await post('/api/apiStaff', { op: 'create', name: '11A DT' });
    await post('/api/apiStaff', { op: 'setTopic', cls: CLS, topic: D.topic, open: true });
    await post('/api/apiName', { cls: CLS, name: 'Aoife' }, P);
    browser = await puppeteer.launch({ headless: 'shell' });
    const page = await browser.newPage(); await page.setViewport({ width: vw, height: vh });
    page.on('pageerror', (e) => out.errs.push(e.message));
    await page.goto(BASE + '/?class=' + CLS + '&as=' + encodeURIComponent(P) + '&actbase=' + encodeURIComponent(ACT), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-open="' + D.topic + '"]', { timeout: 15000 }); await page.click('[data-open="' + D.topic + '"]');
    await page.waitForSelector('[data-deck="' + D.id + '"]', { timeout: 10000 }); await page.click('[data-deck="' + D.id + '"]');
    await page.waitForSelector('#simg', { timeout: 10000 }); await wait(700);
    const b = await page.$('#sfull'); out.label = b ? await page.evaluate((x) => x.textContent.trim(), b) : null;
    out.normal = await page.evaluate(LOOK);
    const pagesBefore = (await browser.pages()).length;
    if (b) await b.click(); await wait(700);
    out.big = await page.evaluate(LOOK); out.big.newTabs = (await browser.pages()).length - pagesBefore;
    await page.keyboard.press('ArrowRight'); await wait(500); out.key = await page.evaluate(LOOK);
    const nx = await page.$('#snext'); if (nx) await nx.click(); await wait(500); out.nxt = await page.evaluate(LOOK);
    await page.keyboard.press('Escape'); await wait(500); out.esc = await page.evaluate(LOOK);
    const b2 = await page.$('#sfull'); if (b2) await b2.click(); await wait(500); out.big2 = await page.evaluate(LOOK);
    const b3 = await page.$('#sfull'); if (b3) await b3.click(); await wait(500); out.exit = await page.evaluate(LOOK);
    const b4 = await page.$('#sfull'); if (b4) await b4.click(); await wait(400);
    out.end = await page.evaluate(() => { for (let k = 0; k < 2000 && document.getElementById('snext'); k++) document.getElementById('snext').click();
      return { onTopic: !document.querySelector('.slides') && !!document.querySelector('[data-deck]'), anyBig: !!document.querySelector('.big') }; });
    await wait(600); out.end.fs = await page.evaluate(() => !!document.fullscreenElement); // leaving the browser's full screen takes a moment
    const a = TOP.acts[0];
    if (a) { await page.click('[data-act="' + a.id + '"]'); await page.waitForSelector('.actscr', { timeout: 10000 }); out.act = await page.evaluate(() => ({ big: document.querySelector('.actscr').classList.contains('big'), btn: (document.getElementById('afull') || {}).textContent })); }
  } catch (e) { out.errs.push(String(e && e.message || e)); }
  finally { if (browser) await browser.close(); srv.kill(); await wait(300); }
  return out;
}
// the whole slide fills the screen: it reaches (nearly) the full width or the full height, and none of it is cut off
const fills = (o) => !!o && o.big && !!o.sl && o.slVis && (o.sl.w >= o.W * 0.94 || o.sl.h >= o.H * 0.74) && Math.abs(o.sl.w / o.sl.h - 16 / 9) < 0.03;
(async () => {
  decks.forEach((d) => check('slide set ' + d.id + ' has its pictures folder to show', fs.existsSync(path.join(REPO, 's1_platform', 'decks', d.id, '01.webp'))));
  for (const [vw, vh] of [[1280, 800], [1920, 1080], [1366, 768], [1024, 768]]) {
    const sz = ' at ' + vw + '×' + vh;
    const v = await run(INDEX, path.join(DESIGN, 'gates', 'g12-store.json'), vw, vh);
    check('the slide screen has a "' + L.fullWindow + '" button and its words fit' + sz, v.label === L.fullWindow && !!v.normal && v.normal.fit, JSON.stringify([v.label, v.normal && v.normal.fit]));
    check('on the normal screen the slide picture shows with Previous, Next and the count on screen' + sz, !!v.normal && v.normal.img && v.normal.slVis && v.normal.navVis && !v.normal.hscroll, JSON.stringify(v.normal));
    check('Full screen: the whole slide fills the screen, no new tab opens' + sz, fills(v.big) && v.big.newTabs === 0 && v.big.img, JSON.stringify(v.big));
    check('Full screen: Previous, Next, the count and "' + L.exitFull + '" are on screen and their words fit' + sz, !!v.big && v.big.navVis && v.big.fit && v.big.exitText === L.exitFull && v.big.pressed === 'true' && !v.big.jobVis, JSON.stringify(v.big));
    check('in full screen the right arrow key moves on and full screen stays' + sz, fills(v.key) && v.key.src !== v.big.src, JSON.stringify([v.big && v.big.src, v.key && v.key.src]));
    check('in full screen Next moves on and full screen stays' + sz, fills(v.nxt) && v.nxt.src !== v.key.src, JSON.stringify([v.key && v.key.src, v.nxt && v.nxt.src]));
    check('Esc brings the normal screen back on the same slide' + sz, !!v.esc && !v.esc.big && v.esc.jobVis && v.esc.exitText === L.fullWindow && v.esc.src === v.nxt.src, JSON.stringify(v.esc));
    check('"' + L.exitFull + '" brings the normal screen back' + sz, fills(v.big2) && !!v.exit && !v.exit.big && v.exit.jobVis && v.exit.exitText === L.fullWindow && v.exit.pressed === 'false', JSON.stringify([v.big2, v.exit]));
    check('finishing the slide set in full screen goes back to the topic page on the normal screen' + sz, !!v.end && v.end.onTopic && !v.end.anyBig && !v.end.fs, JSON.stringify(v.end));
    check('the next activity then opens on the normal screen' + sz, !TOP.acts.length || (!!v.act && !v.act.big && v.act.btn === L.fullWindow), JSON.stringify(v.act));
    check('no page errors' + sz, !v.errs.length, v.errs.join(' | '));
  }
  const CTL = path.join(DESIGN, 'gates', 'g12-control.html');
  fs.writeFileSync(CTL, execSync('git -C "' + ROOT + '" show 5707f7ac:s1-unit1/server/Index.html', { maxBuffer: 1 << 26 }));
  const c = await run(CTL, path.join(DESIGN, 'gates', 'g12-control-store.json'), 1280, 800);
  check('CONTROL the v17 page (no full screen for slides) is caught', !(c.label === L.fullWindow && fills(c.big)), JSON.stringify([c.label, c.big]));
  stat.close();
  log.push((res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail · slide set used: ' + D.id + ' (' + D.n + ' slides)');
  fs.writeFileSync(path.join(DESIGN, 'gates', 'g12-run.log'), log.join('\n') + '\n');
  console.log(log.join('\n')); process.exit(res.fail ? 1 : 0);
})();
