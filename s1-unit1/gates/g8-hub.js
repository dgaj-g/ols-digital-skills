#!/usr/bin/env node
/* G8 — a topic's own page (v11, 11 Nov 2026), driven as a pupil through the page on the dev harness, with the real
 * activities and slides served from the S1 repo checkout on a local port (?actbase=).
 * COVERAGE (derived from S1L, no browser): every activity file in the catalogue exists, loads s1_platform/bridge.js and
 * calls OLSBridge; every slide set has exactly n pictures named 01.webp … n.webp.
 * PAGE: the topic page has its job line, Help, the four parts and no resume card at first; the slides count, step, use the
 * arrow keys and remember the place on the server (a reload brings back "Carry on where you left off"); an activity in its
 * frame says it is ready, a finish from the real bridge is saved and shown ("Saved. Your best: 8 of 10."), a worse second go
 * keeps the best and counts the go, a message that is not from the frame is ignored; with the connection to apiLessons cut,
 * a score waits in the browser, survives a reload, shows on the topic page with the "still waiting" line, and is saved when the
 * connection comes back; "How did this topic go?" will not send until every line has an answer, sends with no comment, comes
 * back filled in to change, and keeps a comment; an activity with no score is saved by "I've finished this"; every screen has
 * Help; nothing is wider than its box at 1280, 1024, 768 and 390 wide; no console errors on the page.
 * CONTROLS (must fail): a catalogue entry for a missing activity, a slide set one picture short, a stylesheet that widens the
 * topic page's rows, the resume check after the server's record is wiped, and a bridge that never sends "back".
 * v13 (11 Nov 2026), HIS RULING: only the HQ activity sets made with him for the new course are on the platform.
 * HQ-ONLY (no browser): each topic's activities are exactly the activityN.html files of its HQ folder, titled as each page's
 * <title>, with no retired id; a topic with no HQ folder lists none. CONTROLS: Database Showdown put back, Data Detective put
 * back, an HQ set one short. The browser part runs a COPY of Code.gs and Index.html with the gate-only test entries from
 * gates/test-catalogue.js (zt1, no score, in impact). Digital data's page names only what it has and says it has no
 * activities; CONTROL: an old activity pushed into the page's own Digital data list must fail that check.
 * v14 (12 Nov 2026): the activity screen says the score line once (the job line no longer repeats the status line);
 * CONTROL: the v13 job line must fail that check. A no-score activity's status line is blank until it is finished.
 * Run: node s1-unit1/gates/g8-hub.js  (exit 0 = GREEN). Output: gates/out/g8-hub.txt */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), { spawn, execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const REPO = process.env.S1_REPO || '/Users/damiengartland/Sites/s1-wt-platform';
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const S1L = require(path.join(ROOT, 'platform', 'lessons.js')), L = S1L.S;
const PORT = 8773, SPORT = 8774, BASE = 'http://localhost:' + PORT, ACT = 'http://localhost:' + SPORT + '/';
const OWNER = 'dgartland021@c2ken.net', P = 'pupil1@c2ken.net', CLS = '11a-dt';
const STORE = path.join(DESIGN, 'gates', 'g8-store.json');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
function info(s) { log.push('INFO ' + s); }
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function post(p, body, user) { const r = await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user || OWNER }, body: JSON.stringify(body || {}) }); return r.json(); }
const api = (fn, body, user) => post('/api/' + fn, body, user);
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
async function store() { return post('/__store', {}); }
async function rec() { const s = await store(); const v = (s.script || {})['L:' + CLS + ':' + P]; return v ? parse(v) : null; }
async function evRec(tid) { const s = await store(); const v = (s.script || {})['E:' + CLS + ':' + P + ':' + tid]; return v ? parse(v) : null; }
async function until(fn, ms, step) { const end = Date.now() + (ms || 8000); for (;;) { let v; try { v = await fn(); } catch (e) { v = null; } if (v) return v; if (Date.now() > end) return v; await wait(step || 200); } }
const TC = require('./test-catalogue'), S1T = TC.addToL(JSON.parse(JSON.stringify(S1L))); // S1T: the gate's copy with its test entries
const SW = S1L.topics.find((t) => t.id === 'software'), IM = S1T.topics.find((t) => t.id === 'impact'), ZT = IM.acts.find((a) => a.id === 'zt1');
const JOB_SW = 'Go through the slides, play the activities, answer the exam questions, then tell your teacher how the topic went.';
const JOB_DD = 'Answer the exam questions, then tell your teacher how the topic went.';
// ---- v13: only the HQ sets made with him for the new course. Add a topic here only when its HQ set has been made with him.
const HQ = { software: 'software_revision', databases: 'databases_revision', spreadsheets: 'spreadsheets_revision' };
const RETIRED = 'dh1 dh2 dh3 dh4 dh5 dh6 ns1 ns2 ns3 ns4 sw6 db6 db7 db8 db9 db10 db11 hw1 nt1 nt2 nt3 nt4 nt5 cy1 cy2 cy3 cy4 cl1 cl2 et1 et2 lg1 lg2 lg3 ap1 ap2 ap3 ap4 em1 em2 em3'.split(' ');
function hqProblems(topics) { const bad = [];
  topics.forEach((t) => { const dir = HQ[t.id];
    t.acts.forEach((a) => { if (RETIRED.indexOf(a.id) !== -1) bad.push(a.id + ' is a retired id'); });
    if (!dir) { if (t.acts.length) bad.push(t.title + ' lists ' + t.acts.length + ' activities but has no HQ set made for the new course'); return; }
    t.acts.forEach((a) => { if (!new RegExp('^' + dir + '/activity\\d+\\.html$').test(a.path)) return bad.push(a.id + ' is not in ' + dir);
      let ti = ''; try { ti = ((fs.readFileSync(path.join(REPO, a.path), 'utf8').match(/<title>([^<]*)<\/title>/) || [])[1] || '').split(' \u2014 ')[0].trim(); } catch (e) {}
      if (ti !== a.title) bad.push(a.id + ' is called "' + a.title + '" but its page says "' + ti + '"'); });
    let have = []; try { have = fs.readdirSync(path.join(REPO, dir)).filter((f) => /^activity\d+\.html$/.test(f)).sort(); } catch (e) {}
    const listed = t.acts.map((a) => path.basename(a.path)).sort();
    if (have.join() !== listed.join()) bad.push(t.title + ' lists ' + listed.join(',') + ' but ' + dir + ' has ' + have.join(',')); });
  return bad; }
const swap = (fn) => { const c = JSON.parse(JSON.stringify(S1L.topics)); fn(c); return c; };

const pad2 = (i) => (i < 10 ? '0' : '') + i;
const MADE_UP = new RegExp('/decks/sw/' + pad2(SW.decks[0].n) + '-\\d+\\.webp'); // the last-slide check gives slide n clicks it has no pictures for

// ---- coverage, derived from the catalogue ----
function actProblems(acts) { const bad = []; acts.forEach((a) => { const f = path.join(REPO, a.path); if (!fs.existsSync(f)) return bad.push(a.id + ' missing ' + a.path); const s = fs.readFileSync(f, 'utf8');
  if (!/<script[^>]+src="[^"]*s1_platform\/bridge\.js"/.test(s)) bad.push(a.id + ' has no bridge'); if (!/OLSBridge\.(finish|done)\(/.test(s)) bad.push(a.id + ' never calls OLSBridge'); }); return bad; }
function deckProblems(decks) { const bad = []; decks.forEach((d) => { const dir = path.join(REPO, 's1_platform', 'decks', d.id); let have = []; try { have = fs.readdirSync(dir).filter((f) => /^\d\d\.webp$/.test(f)).sort(); } catch (e) {}
  const want = Array.from({ length: d.n }, (_, k) => (k + 1 < 10 ? '0' : '') + (k + 1) + '.webp'); if (have.join() !== want.join()) bad.push(d.id + ' has ' + have.length + ' of ' + d.n); }); return bad; }

const LAYOUT = `(() => { const bad = []; if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('page scrolls sideways');
  document.querySelectorAll('header.bar, .card, .stages, .row, .snav, .actbar, .erow, .eopts, .tog, .btn, .status, h1, h2, p, .slide, .actframe').forEach((e) => { if (e.offsetParent === null) return; if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'auto') bad.push((e.className || e.tagName) + ' ' + e.scrollWidth + '>' + e.clientWidth); });
  document.querySelectorAll('#simg, #aframe').forEach((e) => { const r = e.getBoundingClientRect(); if (r.right > innerWidth + 1) bad.push(e.id + ' runs off the screen'); });
  return bad; })()`;
const SIZES = [[1280, 800], [1024, 768], [768, 1024], [390, 844]];

(async () => {
  // coverage
  const allActs = [].concat(...S1L.topics.map((t) => t.acts)), allDecks = [].concat(...S1L.topics.map((t) => t.decks));
  const ap = actProblems(allActs), dp = deckProblems(allDecks);
  check('coverage: all ' + allActs.length + ' activities exist, load s1_platform/bridge.js and call OLSBridge', ap.length === 0, ap.join(' | '));
  check('coverage: all ' + allDecks.length + ' slide sets have exactly their n pictures (' + allDecks.reduce((t, d) => t + d.n, 0) + ' slides)', dp.length === 0, dp.join(' | '));
  info('topics with no slide set: ' + S1L.topics.filter((t) => !t.decks.length).map((t) => t.title).join(', '));
  check('CONTROL a catalogue entry for a missing activity is caught', actProblems([{ id: 'zz1', path: 'no_such_folder/activity9.html' }]).length === 1);
  const hq = hqProblems(S1L.topics);
  check('HQ only (v13): the platform lists ' + allActs.length + ' activities, exactly the HQ sets of ' + Object.keys(HQ).join(', ') + ', titled as their pages, no retired id, none for any other topic', hq.length === 0 && allActs.length === 15, hq.join(' | '));
  check('CONTROL Database Showdown put back on Database applications is caught', hqProblems(swap((c) => c.find((t) => t.id === 'databases').acts.push({ id: 'db6', title: 'Database Showdown', path: '06.database_showdown.html', scored: true }))).length > 0);
  check('CONTROL Data Detective put back on Digital data is caught', hqProblems(swap((c) => c.find((t) => t.id === 'digital-data').acts.push({ id: 'dh1', title: 'Data Detective', path: 'digital_data_revision/activity1.html', scored: true }))).length > 0);
  check('CONTROL an HQ set one short (Ski Trip left off Spreadsheet applications) is caught', hqProblems(swap((c) => c.find((t) => t.id === 'spreadsheets').acts.pop())).length > 0);
  check('CONTROL a slide set one picture short is caught', deckProblems([{ id: SW.decks[0].id, n: SW.decks[0].n + 1 }]).length === 1);

  // servers
  try { fs.unlinkSync(STORE); } catch (e) {}
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
  const stat = http.createServer((req, rs) => { const u = decodeURIComponent(new URL(req.url, ACT).pathname); const f = path.normalize(path.join(REPO, u)); if (!f.startsWith(REPO)) { rs.writeHead(403); return rs.end(); }
    fs.readFile(f, (e, b) => { if (e) { rs.writeHead(404); return rs.end('not found'); } rs.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); rs.end(b); }); }).listen(SPORT);
  const CAT = path.join(DESIGN, 'gates', 'g8-catalogue'); // the built files plus the gate-only test entries
  fs.writeFileSync(CAT + '.gs', TC.addToSource(fs.readFileSync(path.join(DESIGN, 'deploy', 'Code.gs'), 'utf8')));
  fs.writeFileSync(CAT + '.html', TC.addToSource(fs.readFileSync(path.join(ROOT, 'server', 'Index.html'), 'utf8')));
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { S1U1_STORE: STORE, S1U1_CODE: CAT + '.gs', S1U1_INDEX: CAT + '.html' }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 10000); });
  let browser;
  try {
    await api('apiStaff', { op: 'create', name: '11A DT' });
    for (const id of ['digital-data', 'software', 'impact']) await api('apiStaff', { op: 'setTopic', cls: CLS, topic: id, open: true });
    await api('apiName', { cls: CLS, name: 'Aoife' }, P);
    await api('apiBoot', { cls: CLS }, P);

    browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000 });
    const page = await browser.newPage(), errs = [], side = [];
    let cut = false, oldBridge = false;
    await page.setViewport({ width: 1280, height: 800 });
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      if (cut && r.url().indexOf('/api/apiLessons') !== -1) return r.abort('internetdisconnected');
      if (oldBridge && /s1_platform\/bridge\.js/.test(r.url())) return r.respond({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(REPO, 's1_platform', 'bridge.js'), 'utf8').split("post('back')").join('void 0') });
      r.continue();
    });
    const mine = (u) => !u || u.indexOf(BASE) === 0 || u.indexOf(ACT + 's1_platform/') === 0;
    page.on('console', (m) => { if (m.type() !== 'error') return; const u = (m.location() || {}).url || ''; if (cut && /apiLessons|Failed to load resource/.test(m.text() + u)) return; if (MADE_UP.test(u)) return; (mine(u) ? errs : side).push('console: ' + m.text() + ' @ ' + u); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => { const u = r.url(); if (cut && u.indexOf('/api/apiLessons') !== -1) return; (mine(u) ? errs : side).push('request failed: ' + u); });
    const URL0 = BASE + '/?class=' + CLS + '&as=' + encodeURIComponent(P) + '&actbase=' + encodeURIComponent(ACT);
    const txt = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
    const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 10000 }); await page.evaluate((s) => document.querySelector(s).click(), sel); await wait(250); };
    const openHome = async () => { await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('[data-open]', { timeout: 15000 }); };
    const openTopic = async (id) => { await click('[data-open="' + id + '"]'); await page.waitForSelector('.hub h1', { timeout: 10000 }); };
    const row = (sel) => page.evaluate((s) => { const b = document.querySelector(s); const r = b && b.closest('.row'); return r ? { st: r.querySelector('.st').innerText.replace(/\s+/g, ' ').trim(), status: r.querySelector('.status').innerText.trim(), btn: b.innerText.trim() } : null; }, sel);
    async function helpOk(where) {
      const r = await page.evaluate(() => { const b = document.getElementById('hbtn'), x = document.getElementById('hbox'); if (!b || !x) return { has: false }; const was = x.hidden; b.click(); const open = !x.hidden && x.querySelectorAll('li').length > 0; b.click(); return { has: true, text: b.innerText.trim(), was, open, shut: x.hidden }; });
      check(where + ': has its job line and a Help button that opens and closes', r.has && r.text === L.help && r.was && r.open && r.shut, JSON.stringify(r));
    }
    async function fitAll(where, extra) { const bad = []; for (const [w, hh] of SIZES) { await page.setViewport({ width: w, height: hh }); await wait(300); const l = await page.evaluate(LAYOUT); if (l.length) bad.push(w + 'x' + hh + ': ' + l.slice(0, 3).join(', ')); }
      await page.setViewport({ width: 1280, height: 800 }); await wait(250); if (extra === 'control') return bad; check(where + ': nothing wider than its box at 1280, 1024, 768 and 390 wide', bad.length === 0, bad.join(' | ')); try { await page.screenshot({ path: path.join(OUT, 'g8-' + where.replace(/\W+/g, '-').toLowerCase() + '.png') }); } catch (e) {} return bad; }

    // ---- home and the topic page
    await openHome();
    const tiles = await page.evaluate(() => [...document.querySelectorAll('[data-open]')].map((b) => b.dataset.open));
    check('home: Digital data, Software and Ethical, legal and environmental impact have Open; the six locked topics do not', tiles.join(',') === 'digital-data,software,impact', tiles.join(','));
    // ---- v13: Digital data has no activities on the platform (and no slides): its tile and page say so
    const ddTile = await page.evaluate(() => { const b = document.querySelector('[data-open="digital-data"]'), c = b && b.closest('.topic'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    check('home (v13): the Digital data tile reads "No slides · No activities · exam questions"', /No slides · No activities · exam questions/.test(ddTile), ddTile);
    const ddPage = () => page.evaluate(() => ({ job: ((document.querySelector('.job') || {}).innerText || '').replace(/\s+/g, ' ').trim(), none: ((document.getElementById('noActs') || {}).innerText || '').trim(), acts: document.querySelectorAll('[data-act]').length, decks: document.querySelectorAll('[data-deck]').length }));
    const ddGood = (d) => d.job.indexOf(JOB_DD) === 0 && d.none === L.noActsLine && d.acts === 0 && d.decks === 0;
    await openTopic('digital-data');
    const dd = await ddPage();
    check('topic page (Digital data, v13): job line "' + JOB_DD + '", the line "' + L.noActsLine + '", no activity or slide rows', ddGood(dd), JSON.stringify(dd));
    await helpOk('topic page (Digital data)');
    await fitAll('topic page (Digital data)');
    await page.evaluate(() => S1L.topics.find((t) => t.id === 'digital-data').acts.push({ id: 'db6', title: 'Database Showdown', path: '06.database_showdown.html', scored: true }));
    await click('#cHome'); await openTopic('digital-data');
    const ddc = await ddPage();
    check('CONTROL an old activity pushed into the page\'s own Digital data list fails the Digital data page check', !ddGood(ddc), JSON.stringify(ddc));
    await page.evaluate(() => S1L.topics.find((t) => t.id === 'digital-data').acts.pop());
    await click('#cHome');
    await openTopic('software');
    const tp = await page.evaluate(() => ({ h1: document.querySelector('.hub h1').innerText.trim(), job: (document.querySelector('.job') || {}).innerText || '', parts: [...document.querySelectorAll('.hubpart h2')].map((h) => h.innerText.replace(/\s+/g, ' ').trim()), resume: !!document.getElementById('resume'), pend: document.getElementById('pend').hidden }));
    check('topic page: "Software", its job line, the four parts in order, no resume card yet, no "still waiting" line', tp.h1 === 'Software' && tp.job.indexOf(JOB_SW) === 0 && tp.parts.length === 4 && tp.parts[0] === L.partSlides && tp.parts[1].indexOf(L.partActs) === 0 && tp.parts[2] === L.partExam && tp.parts[3] === L.partEval && !tp.resume && tp.pend, JSON.stringify(tp));
    await helpOk('topic page');
    const r0 = await row('[data-deck="sw"]'), a0 = await row('[data-act="sw1"]'), e0 = await row('#hubEval');
    check('topic page: slides "Not started" / Start; OS Control Room "Not played yet" / Play; "0 of 5 done"; topic check "Not done yet" / Start', r0 && r0.status === L.deckNot && r0.btn === L.start && a0 && a0.status === L.actNot && a0.btn === L.play && tp.parts[1].indexOf(fmt(L.actsDone, { d: 0, n: SW.acts.length })) !== -1 && e0 && e0.status === L.evalNot && e0.btn === L.evalStart, JSON.stringify([r0, a0, e0]));
    await fitAll('topic page');

    // ---- slides
    await click('[data-deck="sw"]'); await page.waitForSelector('#scount');
    const img = async () => until(() => page.evaluate(() => { const i = document.getElementById('simg'); return i && i.complete && i.naturalWidth > 0 ? i.naturalWidth + 'x' + i.naturalHeight : null; }), 8000);
    const s1 = { count: await txt('#scount'), prev: await page.$eval('#sprev', (b) => b.disabled), img: await img() };
    check('slides: "Slide 1 of 41", the picture loads, Back is off on the first slide', s1.count === fmt(L.slideOf, { i: 1, n: 41 }) && s1.prev && !!s1.img, JSON.stringify(s1));
    await helpOk('slides');
    for (let k = 0; k < 4; k++) await click('#snext');
    const s5 = { count: await txt('#scount'), bar: await txt('#sbar'), w: await page.$eval('#sline', (e) => e.style.width) };
    await page.keyboard.press('ArrowLeft'); await wait(250);
    const s4 = await txt('#scount');
    check('slides: Next four times reads "Slide 5 of 41" (bar and line follow); the left arrow key goes back to slide 4', s5.count === 'Slide 5 of 41' && /Slide 5 of 41/.test(s5.bar) && s5.w === Math.round(500 / 41) + '%' && s4 === 'Slide 4 of 41', JSON.stringify([s5, s4]));
    await fitAll('slides');
    await click('#cHub'); await page.waitForSelector('.hub h1');
    const g = await until(async () => { const r = await rec(); return r && r.s && r.s.sw && r.s.sw[0] === 4 ? r : null; }, 6000);
    check('slides: the server keeps the place (slide 4, furthest 5) and that Software was left on its slides', g && g.s.sw[1] === 5 && g.p.software === 'd:sw', JSON.stringify(g && { s: g.s, p: g.p }));
    const resumeOk = async (w) => { const t = await txt('#resume'); return t === fmt(L.resume, { w }) ? t : null; };
    await openHome(); await openTopic('software');
    const rs1 = await resumeOk('Software'), r1 = await row('[data-deck="sw"]');
    check('after a reload: "Carry on where you left off: Software"; the slides say "Up to slide 4 of 41" / Carry on', !!rs1 && r1.status === 'Up to slide 4 of 41' && r1.btn === L.carry, JSON.stringify([rs1, r1]));
    await click('#resume'); await page.waitForSelector('#scount');
    check('the resume card opens the slides at slide 4', (await txt('#scount')) === 'Slide 4 of 41');

    // ---- click reveals (v12): a slide with click animations shows its parts one Next at a time, as in the slideshow, so a
    // past-paper answer stays hidden until she presses Next. CS = the first Software slide with clicks, CC = its clicks.
    const SWD = SW.decks[0], CS = +Object.keys(SWD.steps || {}).sort((a, b) => a - b)[0], CC = (SWD.steps || {})[CS];
    const pic = () => page.evaluate(() => ((document.getElementById('simg') || { getAttribute: () => '' }).getAttribute('src') || '').replace(/^.*\/(\d\d(-\d+)?)\.webp.*$/, '$1'));
    const num = async () => +((((await txt('#scount')) || '').match(/(\d+)/) || [0, 0])[1]);
    const goSlide = async (n) => { for (let g = 0; g < 200 && (await num()) !== n; g++) await click((await num()) < n ? '#snext' : '#sprev'); };
    const look = async () => { const p = await pic(); return [p, (await txt('#smore')) === L.slideMore ? 'more' : '', await num(), await txt('#snext')]; };
    const wantS = (p, fin) => [p, /-/.test(p) ? 'more' : '', +p.slice(0, 2), fin ? L.finish : L.next];
    const firstPic = (j) => ((SWD.steps || {})[j] ? pad2(j) + '-0' : pad2(j));
    const FWD = [pad2(CS - 1)].concat(Array.from({ length: CC }, (_, k) => pad2(CS) + '-' + k), [pad2(CS), firstPic(CS + 1)]);
    const WANT = FWD.concat(FWD.slice(0, -1).reverse(), [pad2(CS) + '-0']).map((p) => wantS(p));
    async function revealWalk() {
      await goSlide(CS - 1); const seen = [await look()];
      for (let k = 0; k < CC + 2; k++) { await click('#snext'); seen.push(await look()); }
      for (let k = 0; k < CC + 2; k++) { await click('#sprev'); seen.push(await look()); }
      await page.keyboard.press('ArrowRight'); await wait(250); seen.push(await look());
      return seen;
    }
    check('Software has a slide with clicks to walk (slide ' + CS + ', ' + CC + ' clicks)', CS > 1 && CC > 0);
    const walk = await revealWalk();
    check('click reveals: Next shows slide ' + CS + ' one click at a time (' + pad2(CS) + '-0 … ' + pad2(CS) + '-' + (CC - 1) + ', then the finished slide), the more line shows until the last click, Previous walks back through the clicks, the right arrow key starts them again', JSON.stringify(walk) === JSON.stringify(WANT), JSON.stringify(walk.map((w) => w.slice(0, 2).join(':'))));
    const stImg = await img();
    await page.screenshot({ path: path.join(OUT, 'g8-click-1280.png') }); await page.setViewport({ width: 390, height: 844 }); await wait(400); await page.screenshot({ path: path.join(OUT, 'g8-click-390.png'), fullPage: true }); await page.setViewport({ width: 1280, height: 800 }); await wait(250);
    check('click reveals: the first click picture loads, the same size as a finished slide', !!stImg && stImg === s1.img, stImg + ' vs ' + s1.img);
    await fitAll('slides, a click still to come');
    await click('#snext');
    await click('#cHub'); await page.waitForSelector('.hub h1');
    const gS = await until(async () => { const r = await rec(); return r && r.s && r.s.sw && r.s.sw[0] === CS ? r : null; }, 6000);
    await openHome(); await openTopic('software'); await click('#resume'); await page.waitForSelector('#scount');
    const rsS = await look();
    check('click reveals: the place kept is the slide (' + CS + '), and carrying on opens it at its first click picture with the more line', !!gS && JSON.stringify(rsS) === JSON.stringify(wantS(pad2(CS) + '-0')), JSON.stringify([gS && gS.s.sw, rsS]));
    await click('#cHub'); await page.waitForSelector('.hub h1');

    // ---- an activity in its frame
    const frameOf = (re) => until(() => page.frames().find((f) => re.test(f.url())) || null, 10000);
    await click('[data-act="sw1"]'); await page.waitForSelector('#aframe');
    const src = await page.$eval('#aframe', (f) => f.getAttribute('src'));
    check('activity: the frame opens the real activity with ?embed=1 from the slides-and-activities site', src === ACT + 'software_revision/activity1.html?embed=1', src);
    const f1 = await frameOf(/software_revision\/activity1\.html/);
    const framed = f1 && (await until(() => f1.evaluate(() => !!(window.OLSBridge && window.OLSBridge.framed)), 10000));
    await wait(400);
    check('activity: the bridge knows it is inside the app; the page says "' + L.actWait + '"', !!framed && (await txt('#asave')) === L.actWait, JSON.stringify([!!framed, await txt('#asave')]));
    const saidOnce = (jobT, statusT) => ((String(jobT) + ' ' + String(statusT)).match(/\bsaved\b/gi) || []).length === 1;
    const jobT = await txt('.actscr .job'), st1 = await txt('#asave');
    check('activity: the score line is said once (job line "' + L.actJob + '"; status "' + L.actWait + '")', saidOnce(jobT, st1), JSON.stringify([jobT, st1]));
    check('CONTROL the v13 job line ("... Your score is saved when you finish.") repeats the status line and is caught', !saidOnce('Play the activity to the end. Your score is saved when you finish. Help', L.actWait));
    await helpOk('activity');
    await fitAll('activity');
    await page.evaluate(() => window.postMessage({ t: 's1act', v: 1, kind: 'finish', score: 10, max: 10, path: '/x' }, '*')); await wait(1200);
    let g1 = await rec();
    check('activity: a score message that does not come from the activity frame is ignored', !(g1 && g1.a && g1.a.sw1), JSON.stringify(g1 && g1.a));
    await f1.evaluate(() => window.parent.postMessage({ t: 's1act', v: 1, kind: 'finish', score: 9, max: 10, path: location.pathname.replace('activity1', 'activity2') }, '*')); await wait(1200);
    g1 = await rec();
    check('activity: a score sent from a different page inside the frame is not given to this activity', !(g1 && g1.a && g1.a.sw1), JSON.stringify(g1 && g1.a));
    await f1.evaluate(() => window.OLSBridge.finish(8, 10));
    const saved = await until(async () => ((await txt('#asave')) === fmt(L.actSaved, { s: 8, m: 10 }) ? true : null), 8000);
    g1 = await rec();
    check('activity: the bridge\'s 8 of 10 is saved and shown: "Saved. Your best: 8 of 10."', saved && g1.a.sw1 && g1.a.sw1.slice(0, 5).join(',') === '8,10,8,10,1', JSON.stringify([await txt('#asave'), g1 && g1.a]));
    await wait(3200); await f1.evaluate(() => window.OLSBridge.finish(6, 10));
    g1 = await until(async () => { const r = await rec(); return r && r.a.sw1 && r.a.sw1[4] === 2 ? r : null; }, 8000);
    check('activity: a worse second go keeps the best (8 of 10) and counts the go', g1 && g1.a.sw1.slice(0, 5).join(',') === '8,10,8,10,2' && (await txt('#asave')) === fmt(L.actSaved, { s: 8, m: 10 }), JSON.stringify(g1 && g1.a.sw1));
    const backTo = async () => !!(await until(() => page.evaluate(() => (document.querySelector('.hub h1') || {}).innerText === 'Software' || null), 6000));
    await f1.evaluate(() => { const a = document.querySelector('a[href="index.html"]'); if (a) a.click(); });
    check('activity: its own "Back to Software HQ" link goes back to the app\'s Software page (not the old HQ inside the frame)', await backTo(), await txt('h1'));
    const a1 = await row('[data-act="sw1"]'), cnt = await txt('.hubpart[data-hue="2"] h2');
    check('topic page: OS Control Room "Best: 8 of 10 (80%)", "First go: 8 of 10 · 2 goes", Play again; "1 of ' + SW.acts.length + ' done"', a1.status === 'Best: 8 of 10 (80%)' && /First go: 8 of 10 · 2 goes/.test(a1.st) && a1.btn === L.playAgain && cnt.indexOf('1 of ' + SW.acts.length + ' done') !== -1, JSON.stringify([a1, cnt]));
    await openHome(); await openTopic('software');
    check('after a reload: "Carry on where you left off: OS Control Room"', !!(await resumeOk('OS Control Room')), await txt('#resume'));

    // ---- the connection drops: the score waits in the browser and is saved later
    cut = true;
    await click('[data-act="sw2"]'); const f2 = await frameOf(/software_revision\/activity2\.html/);
    await until(() => f2.evaluate(() => !!(window.OLSBridge && window.OLSBridge.framed)), 10000); await wait(300);
    await f2.evaluate(() => window.OLSBridge.finish(5, 7));
    const retry = await until(async () => ((await txt('#asave')) === L.actRetry ? true : null), 8000);
    const q = await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }, 's1q:' + P + ':' + CLS);
    check('offline: the page says "' + L.actRetry + '" and the score waits in the browser', retry && q.some((o) => o.op === 'finish' && o.id === 'sw2' && o.s === 5 && o.m === 7), JSON.stringify([await txt('#asave'), q]));
    await openHome(); await openTopic('software');
    const a2 = await row('[data-act="sw2"]'), pend = await page.evaluate(() => { const x = document.getElementById('pend'); return x.hidden ? null : x.innerText.trim(); });
    check('offline, after a reload: Processing Mode Dispatch still shows "Best: 5 of 7 (71%)" and the "still waiting" line shows', a2.status === 'Best: 5 of 7 (71%)' && pend === L.pending, JSON.stringify([a2, pend]));
    check('offline: nothing reached the server yet', !((await rec()).a.sw2));
    cut = false; await page.evaluate(() => Hub.flush());
    const g2 = await until(async () => { const r = await rec(); return r && r.a.sw2 ? r : null; }, 10000);
    const pendGone = await until(() => page.evaluate(() => document.getElementById('pend').hidden || null), 5000);
    check('back online: the waiting 5 of 7 is saved and the "still waiting" line goes', g2 && g2.a.sw2.slice(0, 5).join(',') === '5,7,5,7,1' && pendGone, JSON.stringify(g2 && g2.a.sw2));

    // an activity whose own button sends the page to its HQ by script: the HQ page tells the app, which goes back to the topic
    await click('[data-act="sw3"]'); const f3 = await frameOf(/software_revision\/activity3\.html/);
    await until(() => f3.evaluate(() => !!(window.OLSBridge && window.OLSBridge.framed)), 10000);
    await f3.evaluate(() => { location.href = 'index.html'; });
    check('activity: a script that sends the frame to the HQ page brings the pupil back to the Software page', await backTo(), await txt('h1'));

    // ---- How did this topic go?
    await click('#hubEval'); await page.waitForSelector('.evalf');
    const ef = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.erow')].map((r) => [r.querySelector('.et').innerText.trim(), [...r.querySelectorAll('.tog')].map((b) => b.innerText.trim()).join('|')]), max: document.getElementById('ec').maxLength, left: document.getElementById('eleft').innerText.trim(), job: (document.querySelector('.job') || {}).innerText || '' }));
    check('topic check: one line per Software part, each with "' + S1L.rate.join(' / ') + '"; an optional box of 500 characters', ef.rows.length === SW.parts.length && ef.rows.every((r, k) => r[0] === SW.parts[k] && r[1] === S1L.rate.join('|')) && ef.max === 500 && ef.left === '500 characters left' && ef.job.indexOf(L.evalJob) === 0, JSON.stringify(ef));
    await helpOk('topic check');
    await fitAll('topic check');
    await click('#esend');
    const n1 = await page.evaluate(() => ({ err: document.getElementById('eerr').innerText.trim(), miss: document.querySelectorAll('.erow.miss').length, on: !!document.querySelector('.evalf') }));
    const rate = (k, v) => page.evaluate((k, v) => document.querySelectorAll('.erow')[k].querySelectorAll('.tog')[v - 1].click(), k, v);
    for (let k = 0; k < SW.parts.length - 1; k++) await rate(k, 1 + (k % 3));
    await click('#esend');
    const n2 = await page.evaluate(() => ({ miss: document.querySelectorAll('.erow.miss').length, on: !!document.querySelector('.evalf') }));
    check('topic check: will not send with no answers (every line marked) or with one line left (that line marked)', n1.on && n1.err === L.evalNeed && n1.miss === SW.parts.length && n2.on && n2.miss === 1 && !(await evRec('software')), JSON.stringify([n1, n2]));
    await rate(SW.parts.length - 1, 3); await click('#esend');
    await page.waitForSelector('.done-card', { timeout: 10000 });
    const want = SW.parts.map((_, k) => (k === SW.parts.length - 1 ? 3 : 1 + (k % 3)));
    const e1 = await evRec('software');
    check('topic check: sends with every line answered and no comment; "' + L.evalDoneH + '"', (await txt('.done-card h2')) === L.evalDoneH && e1 && JSON.stringify(e1.r) === JSON.stringify(want) && !e1.c, JSON.stringify(e1));
    await helpOk('topic check sent');
    await fitAll('topic check sent');
    await click('#eagain'); await page.waitForSelector('.evalf');
    const pre = await page.evaluate(() => [...document.querySelectorAll('.erow')].map((r) => [...r.querySelectorAll('.tog')].findIndex((b) => b.getAttribute('aria-checked') === 'true') + 1));
    await page.type('#ec', 'Can we go over backups again?');
    const left = await txt('#eleft');
    await click('#esend'); await page.waitForSelector('.done-card', { timeout: 10000 });
    const e2 = await evRec('software');
    check('topic check: "Change my answers" comes back filled in; a comment is kept ("471 characters left" while typing)', JSON.stringify(pre) === JSON.stringify(want) && left === '471 characters left' && e2 && e2.c === 'Can we go over backups again?', JSON.stringify([pre, left, e2]));
    await click('#eback'); await page.waitForSelector('.hub h1');
    const e3 = await row('#hubEval');
    check('topic page: the check says "Sent to your teacher on …" / Change my answers', e3 && e3.status.indexOf('Sent to your teacher on ') === 0 && e3.btn === L.evalChange, JSON.stringify(e3));

    // ---- an activity with no score
    await click('#cHome'); await openTopic('impact');
    await click('[data-act="zt1"]'); await page.waitForSelector('#afin');
    const st0 = await txt('#asave');
    check('no-score activity: the status line says nothing about a score before it is finished', st0 === '', JSON.stringify(st0));
    const fb = await txt('#afin'); await click('#afin');
    const done = await until(async () => ((await txt('#asave')) === L.actSavedDone ? true : null), 8000);
    const g3 = await rec();
    check('no-score activity: "' + L.actFinished + '" saves it as done (0 of 0, 1 go) and the button goes off', fb === L.actFinished && done && (await page.$eval('#afin', (b) => b.disabled)) && g3.a.zt1 && g3.a.zt1.slice(0, 5).join(',') === '0,0,0,0,1', JSON.stringify([fb, await txt('#asave'), g3.a.zt1]));
    await click('#aback'); await page.waitForSelector('.hub h1');
    check('topic page (impact): the test activity "' + ZT.title + '" says Done / Play again; no slide sets listed, the no-slides line shown', ((await row('[data-act="zt1"]')) || {}).status === L.actDone && (await page.$$('[data-deck]')).length === 0 && IM.decks.length === 0 && ((await page.evaluate(() => document.body.innerText)) || '').includes(L.noDecksLine));

    // ---- controls
    await page.addStyleTag({ content: '.hub .row{min-width:1400px}' });
    const cb = await fitAll('control', 'control');
    check('CONTROL a stylesheet that widens the topic page rows is caught by the layout check', cb.length > 0);
    const key = 'L:' + CLS + ':' + P; await post('/__set', { script: { [key]: JSON.stringify({ a: {}, s: {}, p: {} }) } });
    await openHome(); await openTopic('software');
    check('CONTROL with the server\'s record wiped, the resume check fails (it reads the server, not the browser)', !(await resumeOk('OS Control Room')), await txt('#resume'));

    // the last slide: Next reads "Back to the topic" only once its last click is shown. No slide set has clicks on its last
    // slide yet, so the page's own copy of Software gets two there (the pictures need not load for this).
    await openHome(); await openTopic('software');
    await page.evaluate((n) => { const d = S1L.topics.find((t) => t.id === 'software').decks[0]; d.steps = Object.assign({}, d.steps, { [n]: 2 }); document.querySelector('[data-deck="sw"]').dataset.i = String(n); }, SWD.n);
    await click('[data-deck="sw"]'); await page.waitForSelector('#scount');
    const z0 = await look(); await click('#snext'); const z1 = await look(); await click('#snext'); const z2 = await look();
    await click('#snext'); const backT = await until(() => txt('.hub h1'), 6000);
    const eWant = [wantS(pad2(SWD.n) + '-0'), wantS(pad2(SWD.n) + '-1'), wantS(pad2(SWD.n), true)];
    check('last slide with clicks: Next stays "' + L.next + '" with the more line until the last click, then reads "' + L.finish + '" and goes back to the topic', JSON.stringify([z0, z1, z2]) === JSON.stringify(eWant) && backT === SW.title, JSON.stringify([z0, z1, z2, backT]));
    // CONTROL: the same walk with the click steps taken out of the page must fail (slide CS would show its answers at once)
    await openHome(); await openTopic('software');
    await page.evaluate(() => S1L.topics.forEach((t) => t.decks.forEach((d) => { delete d.steps; })));
    await click('[data-deck="sw"]'); await page.waitForSelector('#scount');
    const cw = await revealWalk();
    check('CONTROL with the click steps taken out of the page, the reveal walk fails', JSON.stringify(cw) !== JSON.stringify(WANT), JSON.stringify(cw.map((w) => w[0])));

    oldBridge = true; await page.setCacheEnabled(false); await openHome(); await openTopic('software');
    await click('[data-act="sw4"]'); const f4 = await frameOf(/software_revision\/activity4\.html/);
    await until(() => f4.evaluate(() => !!(window.OLSBridge && window.OLSBridge.framed)), 10000);
    await f4.evaluate(() => { const a = document.querySelector('a[href="index.html"]'); if (a) a.click(); else location.href = 'index.html'; });
    check('CONTROL a bridge with no "back" message leaves the pupil on the old HQ inside the frame (the back check fails)', !(await backTo()), await txt('h1'));
    oldBridge = false;
    check('no console errors or failed requests on the page, its slides or the bridge', errs.length === 0, errs.slice(0, 5).join(' | '));
    if (side.length) info('inside the activities (not the app): ' + side.slice(0, 4).join(' | '));
  } catch (e) { check('the gate ran to the end', false, e.stack); }
  finally { if (browser) await browser.close(); srv.kill(); stat.close(); ['.gs', '.html'].forEach((x) => { try { fs.unlinkSync(path.join(DESIGN, 'gates', 'g8-catalogue' + x)); } catch (e) {} }); }
  const head = (res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail';
  fs.writeFileSync(path.join(OUT, 'g8-hub.txt'), log.concat(head).join('\n') + '\n');
  console.log(log.concat(head).join('\n'));
  process.exit(res.fail ? 1 : 0);
})();
