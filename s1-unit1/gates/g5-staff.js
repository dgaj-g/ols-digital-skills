#!/usr/bin/env node
/* G5 — the staff page (SPEC §7, §3.8), driven through the page on the harness at 1280x800.
 * A teacher who is not the script owner opens the staff link (the owner is let in without the door). A wrong passcode is refused and shows no tabs; the right one opens Classes / Topics / Rounds / Tracker / Export; the class link
 * is shown; Topics locks Digital Data (the pupil's tile then says "Not opened yet" and has no Open) and opens it again (DECISIONS §16); the tracker shows a real pupil's marks and rating, and the two flags fire on synthetic records and stay silent
 * on a control record; the CSV the Export button downloads has exactly SPEC §3.8's columns; nothing is wider than its box;
 * the build token is on the body but its footer shows only with ?build in the link (his ruling, 27 Sep 2026); no console errors.
 * CONTROLS (must fail): the control record made flag-worthy must show a flag (so silence is real), a stylesheet that
 * widens the tracker must be caught by the layout check, and the locked-tile check run on an open topic must not pass.
 * Run: node s1-unit1/gates/g5-staff.js  (exit 0 = GREEN). Output: gates/out/g5-staff.txt */
'use strict';
const fs = require('fs'), path = require('path'), { spawn, execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const Policy = require(path.join(ROOT, 'platform', 'sitpolicy.js'));
const BANK = require(path.join(DESIGN, 'content', 'bank_digital_data.js'));
const PORT = 8770, BASE = 'http://localhost:' + PORT, OWNER = 'dgartland021@c2ken.net', TEACHER = 'mcolleague@c2ken.net', CLS = '11a-dt', T = 'digital-data';
const STORE = path.join(DESIGN, 'gates', 'g5-store.json');
const PASS = fs.readFileSync(path.join(DESIGN, 'STAFF_PASSCODE.txt'), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)[1];
const SPEC = fs.readFileSync(path.join(DESIGN, 'SPEC.md'), 'utf8');
const COLS = SPEC.match(/columns `([^`]+)`/)[1].split(',').map((c) => c.trim()).join(',');
const HIGH = "Thinks it's fine, isn't", LOW = "Doing fine, doesn't think so";
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
async function post(p, body, user) { const r = await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user || OWNER }, body: JSON.stringify(body || {}) }); return r.json(); }
const api = (fn, body, user) => post('/api/' + fn, body, user);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const x = BANK.stages.map((s) => s.questions.reduce((t, q) => t + q.marks, 0)), nq = BANK.stages.map((s) => s.questions.length);
const syn = (e, m) => ({ s: { 1: { a: nq[0], m: m[0], f: [], e: e[0] }, 2: { a: nq[1], m: m[1], f: [], e: e[1] }, 3: { a: nq[2], m: m[2], f: [], e: e[2] }, 4: { a: nq[3], m: m[3], f: [], e: e[3] } } });
const CONTROL_OK = syn([{ r: 3, t: [1] }, { r: 2, t: [1] }, { r: 4, t: [] }, { r: 1, t: [] }], [Math.ceil(x[0] * 0.5), Math.floor(x[1] * 0.74), x[2], 0]);
const CONTROL_BAD = syn([{ r: 4, t: [1] }, null, null, null], [Math.floor(x[0] * 0.2), 0, 0, 0]);
const LAYOUT = `(() => { const bad = []; if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('page scrolls sideways');
  document.querySelectorAll('header.bar, .card, .tabs, .srow, table, td, th, .btn, .chip, h1, h2, p').forEach((e) => { if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'auto') bad.push((e.className || e.tagName) + ' ' + e.scrollWidth + '>' + e.clientWidth); });
  return bad; })()`;
async function trackerRows(page) { return page.evaluate(() => [...document.querySelectorAll('table.track tr')].slice(1).map((tr) => ({ name: tr.querySelector('td').innerText.trim(), text: tr.innerText }))); }
async function clickTab(page, name) { await page.evaluate((n) => [...document.querySelectorAll('.tabs .tab')].find((b) => b.innerText.trim() === n).click(), name); await wait(400); }
(async () => {
  try { fs.unlinkSync(STORE); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { S1U1_STORE: STORE }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 10000); });
  let browser;
  try {
    // ---- records: a class, one real pupil through stage 1 with a card, three synthetic pupils
    const made = await api('apiStaff', { op: 'create', name: '11A DT' });
    const born = await api('apiStaff', { op: 'topics', cls: CLS });
    check('a new class starts with Digital Data locked', born.ok && born.topics[0].open === false, JSON.stringify(born));
    await api('apiStaff', { op: 'setTopic', cls: CLS, topic: T, open: true });
    const P = 'pupil1@c2ken.net';
    await api('apiName', { cls: CLS, name: 'Aoife' }, P);
    await api('apiBoot', { cls: CLS }, P);
    const s = await api('apiStage', { cls: CLS, topic: T, round: 1, stage: 1 }, P);
    let m = 0; for (let i = 0; i < s.order.length; i++) { const r = await api('apiMark', { cls: CLS, topic: T, round: 1, qid: s.order[i], answer: Policy.answer(s.views[i], P + '|1'), idk: !!Policy.answer(s.views[i], P + '|1').idk }, P); m += r.r ? r.r.marks : 0; }
    const card = await api('apiEval', { cls: CLS, topic: T, round: 1, stage: 1, payload: { rating: 2, ticks: [0], stageNote: 'bit rate' } }, P);
    check('records made (class, pupil stage 1 ' + m + '/' + x[0] + ', card)', made.ok && card.ok, JSON.stringify([made, card]).slice(0, 200));
    const setRec = (e, name, R) => post('/__set', { script: { ['p:' + CLS + ':' + e]: JSON.stringify({ n: name, j: 1, o: {}, R: { 1: R } }) } });
    await setRec('flaghigh@c2ken.net', 'High', syn([{ r: 4, t: [1] }, { r: 3, t: [1] }, null, null], [Math.floor(x[0] * 0.49), Math.floor(x[1] * 0.2), 0, 0]));
    await setRec('flaglow@c2ken.net', 'Low', syn([{ r: 1, t: [0] }, { r: 2, t: [0] }, null, null], [Math.ceil(x[0] * 0.75), x[1], 0, 0]));
    await setRec('control@c2ken.net', 'Control', CONTROL_OK);
    // ---- the page
    browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000 });
    const page = await browser.newPage(), errs = [];
    await page.setViewport({ width: 1280, height: 800 });
    page.on('console', (c) => { if (c.type() === 'error') errs.push('console: ' + c.text()); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
    await page.evaluateOnNewDocument(() => { const o = URL.createObjectURL; URL.createObjectURL = (b) => { window.__blob = b; return o.call(URL, b); }; });
    await page.goto(BASE + '/?as=' + encodeURIComponent(TEACHER), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#pw', { timeout: 15000 });
    const tok = await page.evaluate(() => ({ b: document.body.dataset.build, f: (document.querySelector('.build') || {}).innerText || '' }));
    check('door: passcode box, no tabs; build token on the body, no build footer', !(await page.$('.tabs')) && /^s1u1-/.test(tok.b || '') && tok.f === '', JSON.stringify(tok));
    const pb = await browser.newPage(); await pb.goto(BASE + '/?build&as=' + encodeURIComponent(TEACHER), { waitUntil: 'domcontentloaded' }); await pb.waitForSelector('#pw', { timeout: 15000 });
    const tokB = await pb.evaluate(() => (document.querySelector('.build') || {}).innerText || ''); await pb.close();
    check('with ?build in the link the footer shows the token', tokB.trim() === tok.b, tokB);
    await page.type('#pw', 'not-the-passcode'); await page.click('#enter'); await wait(700);
    const err1 = await page.evaluate(() => (document.getElementById('err') || {}).innerText || '');
    check('wrong passcode refused: "Passcode not recognised." and no tabs', err1.trim() === 'Passcode not recognised.' && !(await page.$('.tabs')), err1);
    await page.click('#pw', { clickCount: 3 }); await page.type('#pw', PASS); await page.click('#enter');
    await page.waitForSelector('.tabs', { timeout: 10000 });
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.tabs .tab')].map((b) => b.innerText.trim()).join('|'));
    check('right passcode opens the five tabs', tabs === 'Classes|Topics|Rounds|Tracker|Export', tabs);
    const clsText = await page.evaluate(() => document.getElementById('app').innerText);
    check('Classes shows 11A DT and its link ?class=11a-dt', /11A DT/.test(clsText) && /\?class=11a-dt/.test(clsText), clsText.slice(0, 200));
    check('Classes: says a new class starts locked', clsText.indexOf('A new class starts with its topics locked. Open them on the Topics tab.') !== -1, clsText.slice(-200));
    let lay = await page.evaluate(LAYOUT); check('Classes: nothing wider than its box', lay.length === 0, lay.join(' | '));
    // ---- Topics: lock, see the pupil's tile, open again
    const topicRows = () => page.evaluate(() => [...document.querySelectorAll('.tlist .trow')].map((r) => r.innerText.replace(/\s+/g, ' ').trim()));
    const pupilTile = async () => { const pp = await browser.newPage(); await pp.setViewport({ width: 1280, height: 800 }); pp.on('pageerror', (e) => errs.push('pupil pageerror: ' + e.message));
      await pp.goto(BASE + '/?class=' + CLS + '&as=' + encodeURIComponent(P), { waitUntil: 'domcontentloaded' }); await pp.waitForFunction(() => App.t.cur().screen === 'home', { timeout: 15000 });
      const t = await pp.evaluate(() => ({ text: document.querySelector('.tiles .topic').innerText.replace(/\s+/g, ' '), open: !!document.getElementById('openLive') })); await pp.close(); return t; };
    const lockedTile = (t) => /Not opened yet/.test(t.text) && /Your teacher opens topics in class\./.test(t.text) && !t.open;
    await clickTab(page, 'Topics'); await page.waitForSelector('.tlist', { timeout: 10000 });
    let tr = await topicRows();
    check('Topics: nine rows; Digital Data "Open" with a Lock button; the rest "Comes later"', tr.length === 9 && /^1\.1 Digital data Open Lock$/.test(tr[0]) && tr.slice(1).every((r) => /Comes later$/.test(r)) && (await page.$$('[data-t]')).length === 1, tr.join(' | '));
    const tText = await page.evaluate(() => document.getElementById('app').innerText);
    check('Topics: the note "Pupils see locked topics as “Not opened yet”."', tText.indexOf('Pupils see locked topics as “Not opened yet”.') !== -1, tText.slice(0, 300));
    lay = await page.evaluate(LAYOUT); check('Topics: nothing wider than its box', lay.length === 0, lay.join(' | '));
    const openTile = await pupilTile();
    check('CONTROL the locked-tile check, run on the open topic, does not pass', !lockedTile(openTile) && openTile.open, JSON.stringify(openTile));
    await page.click('[data-t="digital-data"]'); await page.waitForFunction(() => /Locked/.test((document.querySelector('.tlist .trow') || {}).innerText || ''), { timeout: 10000 });
    tr = await topicRows();
    check('Topics: Lock pressed -> "Locked" with an Open button', /^1\.1 Digital data Locked Open$/.test(tr[0]), tr[0]);
    try { await page.screenshot({ path: path.join(OUT, 'g5-topics.png') }); } catch (e) {}
    const shutTile = await pupilTile();
    check('pupil home: the locked tile says "Not opened yet" / "Your teacher opens topics in class." and has no Open', lockedTile(shutTile), JSON.stringify(shutTile));
    const refused = await api('apiStage', { cls: CLS, topic: T, round: 1, stage: 1 }, P);
    check('pupil: a stage of the locked topic is refused', !refused.ok && refused.error === 'locked', JSON.stringify(refused).slice(0, 120));
    await page.click('[data-t="digital-data"]'); await page.waitForFunction(() => /Open Lock$/.test(((document.querySelector('.tlist .trow') || {}).innerText || '').replace(/\s+/g, ' ').trim()), { timeout: 10000 });
    const backTile = await pupilTile();
    check('Topics: Open pressed -> the pupil tile has Open again', !lockedTile(backTile) && backTile.open, JSON.stringify(backTile));
    await clickTab(page, 'Rounds');
    const rText = await page.evaluate(() => document.getElementById('app').innerText);
    check('Rounds: "Digital Data · Round 1 open" and the two open buttons', /Digital Data · Round 1 open/.test(rText) && /Open round 2 for the class/.test(rText) && /Open round 2 for one pupil/.test(rText), rText.slice(0, 300));
    lay = await page.evaluate(LAYOUT); check('Rounds: nothing wider than its box', lay.length === 0, lay.join(' | '));
    await clickTab(page, 'Tracker');
    await page.waitForSelector('table.track', { timeout: 10000 });
    let rows = await trackerRows(page); const row = (n) => rows.find((r) => r.name === n) || { text: '' };
    check('Tracker: the real pupil shows ' + m + '/' + x[0] + ', rating 2 and the note', row('Aoife').text.indexOf(m + '/' + x[0]) !== -1 && /rating 2/.test(row('Aoife').text) && /bit rate/.test(row('Aoife').text), row('Aoife').text.replace(/\s+/g, ' ').slice(0, 200));
    check('Tracker: "' + HIGH + '" fires on the High record', row('High').text.indexOf(HIGH) !== -1 && row('High').text.indexOf(LOW) === -1, row('High').text.replace(/\s+/g, ' ').slice(0, 200));
    check('Tracker: "' + LOW + '" fires on the Low record', row('Low').text.indexOf(LOW) !== -1 && row('Low').text.indexOf(HIGH) === -1, row('Low').text.replace(/\s+/g, ' ').slice(0, 200));
    check('Tracker: the control record (rating 3 at 50%, 2 at 74%, 4 at 100%, 1 at 0%) shows no flag', row('Control').text && row('Control').text.indexOf(HIGH) === -1 && row('Control').text.indexOf(LOW) === -1, row('Control').text.replace(/\s+/g, ' ').slice(0, 200));
    lay = await page.evaluate(LAYOUT); check('Tracker: nothing wider than its box', lay.length === 0, lay.join(' | '));
    try { await page.screenshot({ path: path.join(OUT, 'g5-tracker.png') }); } catch (e) {}
    await clickTab(page, 'Export');
    await page.click('#csv'); await page.waitForFunction('window.__blob', { timeout: 10000 });
    const csv = await page.evaluate(() => window.__blob.text());
    const bom = await page.evaluate(async () => [...new Uint8Array(await window.__blob.arrayBuffer()).slice(0, 3)].join(','));
    const head = csv.replace(/^﻿/, '').split(/\r?\n/)[0];
    check('Export: the CSV has exactly SPEC §3.8 columns, with a BOM', head === COLS && bom === '239,187,191', head + ' · first bytes ' + bom);
    check('Export: one row per pupil per stage (4 pupils x 4 stages)', csv.trim().split(/\r?\n/).length === 1 + 16, csv.trim().split(/\r?\n/).length - 1 + ' rows');
    check('no console errors or failed requests', errs.length === 0, errs.slice(0, 5).join(' | '));
    // ---- controls
    await setRec('control@c2ken.net', 'Control', CONTROL_BAD);
    await clickTab(page, 'Tracker'); await page.waitForSelector('table.track');
    rows = await trackerRows(page);
    check('CONTROL the control record made flag-worthy (rating 4 at 20%) shows the flag', row('Control').text.indexOf(HIGH) !== -1, row('Control').text.replace(/\s+/g, ' ').slice(0, 200));
    await page.addStyleTag({ content: 'table.track{min-width:1800px}' });
    lay = await page.evaluate(LAYOUT);
    check('CONTROL a widened tracker is caught by the layout check', lay.length > 0);
  } catch (e) { check('run', false, e.stack || e.message); }
  finally { if (browser) await browser.close(); srv.kill(); }
  const txt = 'G5 staff page · ' + new Date().toISOString() + '\n' + log.join('\n') + '\n' + (res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail\n';
  fs.writeFileSync(path.join(OUT, 'g5-staff.txt'), txt); process.stdout.write(txt); process.exit(res.fail ? 1 : 0);
})();
