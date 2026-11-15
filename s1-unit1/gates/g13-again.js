#!/usr/bin/env node
/* G13 — a pupil starts her own next round (v19, 15 Nov 2026). A pupil wanted to try the Software questions again and could
 * not: only a teacher could open a new round. Now, once her round is finished (every stage card and the topic card saved),
 * the topic page offers "Start round {n}"; until then a line in the round card tells her the button will appear.
 * SERVER (harness API, real play): refused before the round is finished and before the topic card; opens round 2 once
 * finished; a resent press returns round 2 (never 3); round 1 stays intact; no stacking (round 2 unfinished is refused);
 * a far round is refused; a locked topic is refused; near the store's limit it is refused; a teacher's class round still
 * works beside it; Digital Data (whose rounds live in the pupil's header) works the same.
 * PAGE (puppeteer, as a pupil): the line shows before she finishes; all stages answered but no topic card gives "Do the
 * last step", which opens the topic card; the finished round gives "Want another go?" on the topic page and the marks
 * page; pressing "Start round 2" shows "Round 2 · started by you" with round 1 under Earlier rounds; words fit inside
 * the buttons at four sizes; no page errors.
 * CONTROLS (must fail): a server without the finished check; a server without the resent-press guard; a page without the line.
 * Run: node s1-unit1/gates/g13-again.js  (exit 0 = GREEN). Log: <design>/gates/g13-run.log */
'use strict';
const fs = require('fs'), path = require('path'), { spawn, execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const Policy = require(path.join(ROOT, 'platform', 'sitpolicy.js'));
const S = require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'platform', 'strings.js'), 'utf8') + '\n;S1S', {}).S;
const PORT = 8785, BASE = 'http://localhost:' + PORT;
const OWNER = 'dgartland021@c2ken.net', CLS = '11a-dt', T = 'software';
const P1 = 'pupil1@c2ken.net', P2 = 'pupil2@c2ken.net', P3 = 'pupil3@c2ken.net', P4 = 'pupil4@c2ken.net';
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CODE = path.join(DESIGN, 'deploy', 'Code.gs'), INDEX = path.join(ROOT, 'server', 'Index.html');

async function run(codeFile, indexFile, tag, opts) {
  const store = path.join(DESIGN, 'gates', 'g13-store' + tag + '.json'); try { fs.unlinkSync(store); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { S1U1_STORE: store, S1U1_CODE: codeFile, S1U1_INDEX: indexFile }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 10000); });
  const post = async (p, body, user) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user || OWNER }, body: JSON.stringify(body || {}) })).json();
  const api = (fn, req, user) => post('/api/' + fn, Object.assign({ cls: CLS }, req), user);
  const tp = (b, id) => ((b && b.topics) || []).find((t) => t.id === id) || {};
  const marks = (b, id, k) => { const r = (tp(b, id).rounds || {})[k]; return r ? Object.values(r.s).reduce((t, s) => t + s.m, 0) : -1; };
  async function play(user, topic, round, cards, topicCard) { // answers every question of every stage; then the stage cards and the topic card
    const b = await api('apiBoot', {}, user), st = tp(b, topic).stages.map((s) => s.n);
    for (const n of st) {
      const s = await api('apiStage', { topic, round, stage: n }, user);
      for (let i = 0; i < s.order.length; i++) { if (s.done[s.order[i]]) continue; const a = Policy.answer(s.views[i], user + '|' + round); const r = await api('apiMark', { topic, round, qid: s.order[i], answer: a, idk: !!a.idk }, user); if (!r.ok) throw new Error('mark ' + s.order[i] + ' ' + r.error); }
      if (cards) { const e = await api('apiEval', { topic, round, stage: n, payload: { rating: 3, ticks: [1] } }, user); if (!e.ok) throw new Error('stage card ' + n + ' ' + e.error); }
    }
    if (topicCard) { const e = await api('apiEval', { topic, round, stage: 'topic', payload: { rating: 3, unsure: [0], note: '' } }, user); if (!e.ok) throw new Error('topic card ' + e.error); }
  }
  const o = { errs: [], sv: {}, pg: {} };
  let browser;
  try {
    await post('/api/apiStaff', { op: 'create', name: '11A DT' });
    for (const id of [T, 'digital-data']) await post('/api/apiStaff', { op: 'setTopic', cls: CLS, topic: id, open: true });
    for (const [u, n] of [[P1, 'Aoife'], [P2, 'Brid'], [P3, 'Caoimhe'], [P4, 'Dearbhla']]) await api('apiName', { name: n }, u);
    // ---- server
    let r = await api('apiAgain', { topic: T, round: 1 }, P1); o.sv.fresh = r.error || 'ok';
    await play(P1, T, 1, true, false);
    r = await api('apiAgain', { topic: T, round: 1 }, P1); o.sv.noTopicCard = r.error || 'ok';
    await api('apiEval', { topic: T, round: 1, stage: 'topic', payload: { rating: 3, unsure: [0], note: '' } }, P1);
    const m1 = marks(await api('apiBoot', {}, P1), T, '1');
    r = await api('apiAgain', { topic: T, round: 1 }, P1); o.sv.open = r.ok ? r.round : r.error;
    r = await api('apiAgain', { topic: T, round: 1 }, P1); o.sv.resend = r.ok ? r.round + (r.repeat ? ' repeat' : '') : r.error;
    let b = await api('apiBoot', {}, P1);
    o.sv.after = { round: tp(b, T).round, self: tp(b, T).self, done1: !!(tp(b, T).rounds['1'] || {}).done, m1: marks(b, T, '1'), m1was: m1, dd: tp(b, 'digital-data').round };
    r = await api('apiAgain', { topic: T, round: 2 }, P1); o.sv.stack = r.error || 'ok';
    r = await api('apiAgain', { topic: T, round: 7 }, P1); o.sv.far = r.error || 'ok';
    const s2 = await api('apiStage', { topic: T, round: 2, stage: 1 }, P1); o.sv.r2fresh = s2.ok && Object.keys(s2.done).length === 0;
    // a teacher's class round beside it: pupil2 (not started) moves to 2, pupil1 stays on her own round 2
    r = await post('/api/apiStaff', { op: 'openClass', cls: CLS, topic: T });
    const b1 = await api('apiBoot', {}, P1), b2 = await api('apiBoot', {}, P2);
    o.sv.cls = { ok: r.ok && r.round === 2, p1: tp(b1, T).round + (tp(b1, T).self ? ' self' : ''), p2: tp(b2, T).round + (tp(b2, T).self ? ' self' : '') };
    // Digital Data: rounds live in the pupil's header
    await play(P3, 'digital-data', 1, true, true);
    const d1 = marks(await api('apiBoot', {}, P3), 'digital-data', '1');
    r = await api('apiAgain', { topic: 'digital-data', round: 1 }, P3);
    b = await api('apiBoot', {}, P3);
    o.sv.dd = { ok: r.ok && r.round === 2, round: tp(b, 'digital-data').round, self: tp(b, 'digital-data').self, m1: marks(b, 'digital-data', '1'), m1was: d1, sw: tp(b, T).round };
    // near the store's limit: refused, then fine again
    await play(P3, 'digital-data', 2, true, true);
    await post('/__set', { script: { 'zz:g13-fill': 'x'.repeat(440 * 1024) } });
    r = await api('apiAgain', { topic: 'digital-data', round: 2 }, P3); o.sv.full = r.error || 'ok';
    await post('/__set', { script: { 'zz:g13-fill': null } });
    r = await api('apiAgain', { topic: 'digital-data', round: 2 }, P3); o.sv.afterFull = r.ok ? r.round : r.error;
    // locked topic
    await post('/api/apiStaff', { op: 'setTopic', cls: CLS, topic: 'digital-data', open: false });
    r = await api('apiAgain', { topic: 'digital-data', round: 3 }, P3); o.sv.locked = r.error || 'ok';
    // ---- page
    if (opts && opts.serverOnly) return o;
    await play(P4, T, 2, true, false); // pupil4 (on class round 2): every stage card, no topic card
    browser = await puppeteer.launch({ headless: 'shell' });
    const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
    page.on('pageerror', (e) => o.errs.push(e.message));
    async function openTopic(user) {
      await page.goto(BASE + '/?class=' + CLS + '&as=' + encodeURIComponent(user), { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-open="' + T + '"]', { timeout: 15000 }); await page.click('[data-open="' + T + '"]');
      await page.waitForSelector('#hubExam', { timeout: 10000 }); await page.click('#hubExam');
      await page.waitForSelector('button[data-st]', { timeout: 10000 });
    }
    const grab = () => page.evaluate(() => ({ h2: (document.querySelector('.card h2') || {}).innerText || '', hint: (document.getElementById('againHint') || {}).innerText || '', again: (document.getElementById('again') || {}).innerText || '',
      head: ((document.getElementById('againCard') || {}).querySelector ? document.getElementById('againCard').querySelector('h2').innerText : ''), line: ((document.getElementById('againCard') || {}).querySelector ? document.getElementById('againCard').querySelector('.sub').innerText : ''),
      last: (document.getElementById('last') || {}).innerText || '', lastLine: ((document.getElementById('lastCard') || {}).querySelector ? document.getElementById('lastCard').querySelector('.sub').innerText : ''), body: document.body.innerText }));
    await openTopic(P2); o.pg.unfinished = await grab();
    await openTopic(P4); o.pg.lastStep = await grab();
    if (o.pg.lastStep.last) { await page.click('#last'); await page.waitForSelector('#rate', { timeout: 8000 }).catch(() => {}); o.pg.lastOpens = await page.evaluate(() => !!document.getElementById('rate') && !!document.getElementById('save')); }
    // pupil1 again, but on a fresh class: pupil1's own round 2 is open already, so use pupil5 who finishes round 2 of the class
    const P5 = 'pupil5@c2ken.net'; await api('apiName', { name: 'Eimear' }, P5); await play(P5, T, 2, true, true);
    await openTopic(P5); o.pg.done = await grab();
    // fit at four sizes (topic page with the card)
    o.pg.fit = [];
    for (const [w, hgt] of [[1280, 800], [1024, 768], [768, 1024], [390, 844]]) {
      await page.setViewport({ width: w, height: hgt }); await wait(250);
      o.pg.fit.push(await page.evaluate((w) => { const b = document.getElementById('again'), hp = document.getElementById('againHint'); return { w, fits: !!b && b.scrollWidth <= b.clientWidth + 1 && b.scrollHeight <= b.clientHeight + 1, page: document.documentElement.scrollWidth <= window.innerWidth + 1 }; }, w));
    }
    await page.setViewport({ width: 1280, height: 800 });
    await page.click('#again');
    await page.waitForFunction(() => /Round 3/.test((document.querySelector('.card h2') || {}).innerText || ''), { timeout: 10000 }).catch(() => {});
    o.pg.started = await grab();
    // the marks page of a finished round also offers it (pupil3's Digital Data is locked now, so pupil1's round 1 is not current: use P2 after finishing)
    await play(P2, T, 2, true, true);
    await openTopic(P2); await page.click('#seeSum').catch(() => {}); await wait(800);
    o.pg.summary = await grab();
  } catch (e) { o.errs.push(String(e && e.stack || e)); }
  finally { if (browser) await browser.close(); srv.kill(); await wait(300); }
  return o;
}

function judge(o) { // returns [name, good, detail] rows
  const sv = o.sv, pg = o.pg, a = sv.after || {}, c = sv.cls || {}, d = sv.dd || {};
  const rows = [
    ['server: refused before she has answered anything (not-finished)', sv.fresh === 'not-finished', sv.fresh],
    ['server: refused with every stage card but no topic card (not-finished)', sv.noTopicCard === 'not-finished', sv.noTopicCard],
    ['server: once finished, it opens round 2', sv.open === 2, sv.open],
    ['server: a resent press returns round 2, not 3', sv.resend === '2 repeat', sv.resend],
    ['server: she is on round 2, marked as started by her; round 1 is done with its marks unchanged; other topics untouched', a.round === 2 && a.self === true && a.done1 && a.m1 === a.m1was && a.m1 > 0 && a.dd === 1, JSON.stringify(a)],
    ['server: no stacking: round 2 unfinished is refused (not-finished)', sv.stack === 'not-finished', sv.stack],
    ['server: a far round is refused (bad-round)', sv.far === 'bad-round', sv.far],
    ['server: round 2 is a fresh draw with nothing marked', sv.r2fresh === true, sv.r2fresh],
    ['server: a teacher\'s class round still works: pupil2 moves to 2 (not "self"), pupil1 stays on her own round 2', c.ok && c.p1 === '2 self' && c.p2 === '2', JSON.stringify(c)],
    ['server: Digital Data (rounds in the header) opens round 2 the same way, round 1 marks kept, Software untouched', d.ok && d.round === 2 && d.self === true && d.m1 === d.m1was && d.m1 > 0 && d.sw === 2, JSON.stringify(d)],
    ['server: near the store\'s limit it is refused (store-full), and opens once there is room', sv.full === 'store-full' && sv.afterFull === 3, sv.full + ' / ' + sv.afterFull],
    ['server: a locked topic is refused (locked)', sv.locked === 'locked', sv.locked],
  ];
  if (pg.unfinished) {
    const u = pg.unfinished, l = pg.lastStep || {}, dn = pg.done || {}, st = pg.started || {}, sm = pg.summary || {};
    rows.push(
      ['page: before she finishes, the round card says "' + S.againHint + '"', u.hint === S.againHint && !u.again, JSON.stringify([u.hint, u.again])],
      ['page: every stage answered but no topic card: "' + S.lastLine + '" with "' + S.lastGo + '", and no hint', l.lastLine === S.lastLine && l.last === S.lastGo && !l.hint, JSON.stringify([l.lastLine, l.last, l.hint])],
      ['page: "' + S.lastGo + '" opens the topic card', pg.lastOpens === true, pg.lastOpens],
      ['page: a finished round shows "' + S.againHead + '", "' + fmt(S.againLine, { n: 3, m: 2 }) + '" and "' + fmt(S.againGo, { n: 3 }) + '"', dn.head === S.againHead && dn.line === fmt(S.againLine, { n: 3, m: 2 }) && dn.again === fmt(S.againGo, { n: 3 }) && !dn.hint, JSON.stringify([dn.head, dn.line, dn.again, dn.hint])],
      ['page: the button\'s words fit inside it, no sideways scroll, at 1280, 1024, 768 and 390 wide', (pg.fit || []).length === 4 && pg.fit.every((f) => f.fits && f.page), JSON.stringify(pg.fit)],
      ['page: pressing it shows "' + S.round + '3' + S.startedYou + '", round 2 under ' + S.earlier + ', and the line again', st.h2 === S.round + '3' + S.startedYou && st.body.indexOf(S.earlier) !== -1 && /Round 2 · \d+ of \d+ marks/.test(st.body) && st.hint === S.againHint, JSON.stringify([st.h2, st.hint])],
      ['page: the marks page of her finished round offers it too', sm.head === S.againHead && sm.again === fmt(S.againGo, { n: 3 }), JSON.stringify([sm.head, sm.again])],
    );
  }
  rows.push(['no page or run errors', !o.errs.length, o.errs.join(' | ').slice(0, 400)]);
  return rows;
}

(async () => {
  const v = await run(CODE, INDEX, '', {});
  judge(v).forEach(([n, g, d]) => check(n, g, d));
  const code = fs.readFileSync(CODE, 'utf8'), index = fs.readFileSync(INDEX, 'utf8');
  const ctl = (name, file, from, to, row, opts) => ({ name, file, from, to, row, opts });
  const controls = [
    ctl('a server without the finished check', 'code', "if (!rh || !rh.d) return err_('not-finished');", '', 'server: refused with every stage card but no topic card', { serverOnly: true }),
    ctl('a server without the resent-press guard', 'code', 'if (round < cur) return ok_({ round: cur, repeat: true });', '', 'server: a resent press returns round 2', { serverOnly: true }),
    ctl('a page without the line', 'index', "'<p class=\"hint\" id=\"againHint\">' + S.againHint + '</p>'", "''", 'page: before she finishes', {}),
  ];
  for (const c of controls) {
    const src = c.file === 'code' ? code : index, found = src.split(c.from).length === 2;
    if (!found) { check('CONTROL ' + c.name + ': its fault could be put in', false, 'pattern not found once'); continue; }
    const f = path.join(DESIGN, 'gates', 'g13-control' + (c.file === 'code' ? '.gs' : '.html')); fs.writeFileSync(f, src.replace(c.from, c.to));
    const cv = await run(c.file === 'code' ? f : CODE, c.file === 'index' ? f : INDEX, '-control', c.opts);
    const row = judge(cv).find(([n]) => n.indexOf(c.row) === 0);
    check('CONTROL ' + c.name + ' is caught ("' + c.row + '" fails)', row && !row[1], row ? row[2] : 'row missing');
  }
  log.push((res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail');
  fs.writeFileSync(path.join(DESIGN, 'gates', 'g13-run.log'), log.join('\n') + '\n');
  console.log(log.join('\n')); process.exit(res.fail ? 1 : 0);
})();
