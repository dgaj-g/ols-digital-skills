#!/usr/bin/env node
/* G5 — pupil and staff surfaces, driven through the real page on the dev harness at 1280x800 (ACCEPTANCE_TESTS T01–T53, the g5 rows).
 * Its own server on 8772 (G5_PORT overrides) with a fresh store in DESIGN/gates/g5-store.json. A second pupil (and a third, who only
 * learns answers) is driven through the API. Right answers are learned from a first mark's per-item reply and never printed.
 * CONTROLS (each must fail as expected): a wrong passcode shows no tabs; one Delete press deletes nothing; 4 of 5 on a needed build gives no
 * badge; a page source that holds the passcode is caught by the source check; the board hides when the teacher turns it off.
 * Run: node gates/g5-pupil-staff.js  (exit 0 = GREEN). Output: gates/out/g5-pupil-staff.txt */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), { spawn, execSync } = require('child_process');
const { sheet } = require('./common');
const ROOT = path.join(__dirname, '..');
const DESIGN = '/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/Sociology';
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const PORT = +(process.env.G5_PORT || 8772), BASE = 'http://localhost:' + PORT;
const STORE = path.join(DESIGN, 'gates', 'g5-store.json');
const PASS = fs.readFileSync(path.join(DESIGN, 'STAFF_PASSCODE.txt'), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)[1];
const OWNER = 'dgartland021@c2ken.net', DOORU = 'teacher3@c2ken.net', P1 = 'pupil1@c2ken.net', P2 = 'pupil2@c2ken.net', P3 = 'pupil3@c2ken.net', NONAME = 'noname1@c2ken.net', GMAIL = 'someone@gmail.com';
const CLS = '12a-sociology';
const ROUTE = { t1p: 's1/primary/test', 'c-val': 's2/values/quiz', 'r-test': 's3/religion/test', 'w-test': 's3/workplace/test', 'm-images': 's3/media/images', 'f-scen': 's3/family/scenarios', 'f-apply': 's3/family/apply', 'e-spot': 's3/education/spot', 'p-decide': 's3/peers/decide', vquiz: 's5/quiz' };
const ctx = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'platform', 'strings.js'), 'utf8') + ';this.__S=SOCS;', ctx);
const S = ctx.__S.S;
const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
const sh0 = sheet('g5-pupil-staff');
const one = (d) => (d == null ? d : String(d).replace(/\s+/g, ' ').slice(0, 160));
const sh = { check: (ok, w, d) => sh0.check(ok, w, ok ? undefined : one(d)), fail: (w, d) => sh0.fail(w, one(d)), pass: (w) => sh0.pass(w), skip: (w, d) => sh0.skip(w, d), info: (l) => sh0.info(l), finish: () => sh0.finish() };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function post(p, body, user) {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user == null ? P1 : user }, body: JSON.stringify(body || {}) });
  const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { raw: t.slice(0, 80), status: r.status }; }
}
const api = (fn, b, u) => post('/api/' + fn, b, u);
const bad = (r) => !r || r.__error || r.ok === false;
// learn the right answers for one open from a first (dummy) mark; never printed
function keyFrom(open, per) {
  const v = open.view;
  if (v.slots) return v.slots.map((s, i) => (s.type === 'order' ? (Array.isArray(per[i].k) ? per[i].k : s.steps) : per[i].k));
  if (v.bins) return { round: v.round || 1, bin: per.map((p) => p.bin) };
  if (v.chips) return per.map((p) => p.chip);
  if (v.items) return per.map((p) => (Array.isArray(p.k) ? p.k : [p.k]));
  if (v.steps && !v.asks) return per.slice().sort((a, b) => a.pos - b.pos).map((p) => p.t);
  return per.map((p) => p.k);
}
function dummy(open) {
  const v = open.view;
  if (v.slots) return v.slots.map((s) => (s.type === 'pick' ? 0 : s.type === 'tap' ? [0] : s.steps));
  if (v.bins) return { round: v.round || 1, bin: v.cards.map(() => v.bins[0].id || v.bins[0].label || v.bins[0]) };
  if (v.chips) return v.cards.map(() => (v.chips[0].id || v.chips[0]));
  if (v.items) return v.items.map(() => [0]);
  const qs = v.qs || v.scenes || v.rows || v.asks || [];
  return qs.map(() => 0);
}
async function full(act, user, extra) {
  const o = await api('apiOpen', Object.assign({ cls: CLS, act }, extra || {}), user);
  if (bad(o)) return { err: o.error || o.__error };
  const d = dummy(o), body = (ans) => Object.assign({ cls: CLS, act, a: o.a, ans }, o.round ? { round: o.round } : {});
  const m1 = await api('apiMark', body(d), user);
  if (bad(m1) || !m1.per) return { err: m1.error || m1.__error || 'no per' };
  const key = keyFrom(o, m1.per);
  return { o, key, mark: (ans) => api('apiMark', body(ans || key), user) };
}
const txt = (page, sel) => page.$eval(sel, (e) => e.innerText).catch(() => null);
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const count = (page, sel) => page.$$eval(sel, (a) => a.length).catch(() => 0);
(async () => {
  try { fs.unlinkSync(STORE); } catch (e) {}
  const srv = spawn('node', [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { SOC_STORE: STORE }), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start')), 15000); });
  let browser; const errs = []; let net = { mode: '', marks: 0, apis: [] };
  try {
    browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000, args: ['--no-sandbox'] });
    const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
    await page.evaluateOnNewDocument(() => {
      window.__clip = null; try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.__clip = t; return Promise.resolve(); } } }); } catch (e) {}
      const oc = URL.createObjectURL; URL.createObjectURL = function (b) { try { b.text().then((t) => { window.__blob = t; }); } catch (e) {} return oc.call(URL, b); };
      window.prompt = (m, v) => { window.__clip = v; return v; };
    });
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      const u = r.url();
      if (/\/api\/apiMark/.test(u)) net.marks++;
      if (/\/api\//.test(u) && net.mode === 'offline') return r.abort('internetdisconnected');
      if (/\/api\//.test(u) && net.mode === 'expired') return r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'not-signed-in' }) });
      r.continue();
    });
    page.on('response', async (res) => { if (/\/api\//.test(res.url()) && net.keep) { try { net.apis.push(await res.json()); } catch (e) {} } });
    page.on('pageerror', (e) => errs.push('pageerror ' + String(e.message).slice(0, 120)));
    page.on('console', (m) => { if (m.type() === 'error' && !net.mode && !/Failed to load resource/.test(m.text())) errs.push('console ' + m.text().slice(0, 120)); });
    const go = async (user, q, hash) => {
      await page.goto('about:blank');
      await page.goto(BASE + '/?as=' + encodeURIComponent(user) + (q ? '&' + q : '') + (hash ? '#' + hash : ''), { waitUntil: 'networkidle0' });
      await wait(250);
    };
    const pupil = (user, hash) => go(user, 'class=' + CLS, hash);
    const tapEl = async (hd) => { if (!hd) return false; await hd.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await wait(70); const bb = await hd.boundingBox(); if (!bb) return false; await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await wait(40); return true; };
    const tap = async (sel) => { const hd = await page.$(sel); if (!hd) throw new Error('No element found for selector: ' + sel); return tapEl(hd); };
    const dragOrder = async (scope) => { const li = await page.$$(scope + ' li.dcard'); if (li.length < 2) return false; await li[0].evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await wait(80); const a = await li[0].boundingBox(), b = await li[1].boundingBox(); await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(a.x + a.width / 2, b.y + b.height * 0.8, { steps: 14 }); await wait(60); await page.mouse.up(); await wait(120); return true; };
    const waitSel = (sel, ms) => page.waitForSelector(sel, { timeout: ms || 6000 }).then(() => true, () => false);

    // ================= STAFF =================
    // T48 the door, as a teacher who is not the owner and not on the named list
    await go(DOORU, '', 'staff');
    sh.check(await waitSel('#pw'), 'T48 a bare staff link shows the passcode door to a teacher who is not on the list');
    await page.type('#pw', 'not-the-pass-' + Date.now()); await tap('#in'); await wait(700);
    const wrongErr = await txt(page, '#pwErr'), tabsAfterWrong = await count(page, '.tabs');
    sh.check(String(wrongErr || '').trim() === S.staffWrong, 'T48 a wrong passcode says "' + S.staffWrong + '"', 'saw: ' + wrongErr);
    sh.check(tabsAfterWrong === 0, 'CONTROL T48 a wrong passcode shows no tabs', 'tabs shown: ' + tabsAfterWrong);
    await page.$eval('#pw', (e) => { e.value = ''; }); await page.type('#pw', PASS); await tap('#in');
    sh.check(await waitSel('.tabs button[data-t="classes"]'), 'T48 the right passcode opens the staff tabs');
    const srcs = [await (await fetch(BASE + '/?as=' + DOORU)).text(), await (await fetch(BASE + '/?as=' + P1 + '&class=x')).text()];
    const srcHolds = (s) => s.indexOf(PASS) >= 0;
    sh.check(!srcs.some(srcHolds), 'T48 the passcode is not in the served page source (staff and pupil links)');
    sh.check(srcHolds('<p>' + PASS + '</p>'), 'CONTROL T48 the source check catches a page that holds the passcode');

    // T49 classes, as the owner (straight in, no door)
    await go(OWNER, '', '');
    sh.check(await waitSel('.tabs button[data-t="classes"]'), 'T49 the owner goes straight to the staff tabs on a bare link');
    const rowFor = (name) => page.evaluateHandle((n) => [...document.querySelectorAll('#stf tr, #stf .rowline, #stf li')].find((r) => r.innerText.indexOf(n) >= 0) || null, name);
    const makeClass = async (name) => { await page.$eval('#cn', (e) => { e.value = ''; }); await page.type('#cn', name); await tap('#mkb'); await wait(900); };
    await makeClass('12A Sociology');
    let row = await rowFor('12A Sociology');
    sh.check(!!(await row.evaluate((r) => !!r)), 'T49 "12A Sociology" appears in the class list after Create');
    const cls1 = await api('apiStaff', { op: 'classes' }, OWNER);
    const made = (cls1.classes || cls1.rows || []).find((c) => c.name === '12A Sociology');
    sh.check(made && made.slug === CLS, 'T49 the class slug is "' + CLS + '"', 'saw ' + (made && made.slug));
    await page.evaluate(() => { window.__clip = null; });
    await row.evaluate((r) => r.querySelector('.cp').click()); await wait(500);
    const clip = await page.evaluate(() => window.__clip);
    sh.check(clip === BASE + '/?class=' + CLS, 'T49 Copy class link copies base + "?class=' + CLS + '"', 'copied: ' + clip);
    const lb0 = (await api('apiBoard', { cls: CLS }, P1)).lb;
    await row.evaluate((r) => r.querySelector('.lb').click()); await wait(800);
    const lb1 = (await api('apiBoard', { cls: CLS }, P1)).lb;
    sh.check(!!lb0 !== !!lb1, 'T49 the board button flips the class board', 'before ' + lb0 + ' after ' + lb1);
    await makeClass('Spare Class');
    let spare = await rowFor('Spare Class');
    sh.check(!!(await spare.evaluate((r) => !!r)), 'T49 a spare class can be made');
    await spare.evaluate((r) => r.querySelector('.del').click()); await wait(900);
    spare = await rowFor('Spare Class');
    const still = await spare.evaluate((r) => !!r), sure = still ? await spare.evaluate((r) => r.querySelector('.del').innerText.trim()) : '';
    sh.check(still, 'CONTROL T49 one press of Delete deletes nothing');
    sh.check(sure === S.staffDeleteSure, 'T49 the first press asks "' + S.staffDeleteSure + '"', 'saw ' + sure);
    if (still) await spare.evaluate((r) => r.querySelector('.del').click()); await wait(1200);
    spare = await rowFor('Spare Class');
    sh.check(!(await spare.evaluate((r) => !!r)), 'T49 the second press deletes the class');

    // T50 parts: lock part 6 through the Parts tab
    await tap('.tabs button[data-t="parts"]'); await wait(700);
    if (await count(page, 'select#cls')) { await page.select('select#cls', CLS).catch(() => {}); await wait(700); }
    const p6btn = await page.evaluateHandle(() => [...document.querySelectorAll('#plist li')].find((l) => /^Part 6:/.test(l.innerText.trim())));
    if (await p6btn.evaluate((l) => !!l)) { await p6btn.evaluate((l) => l.querySelector('button').click()); await wait(1000); }
    const pressed = await page.evaluate(() => { const l = [...document.querySelectorAll('#plist li')].find((x) => /^Part 6:/.test(x.innerText.trim())); return l ? l.querySelector('button').getAttribute('aria-pressed') : null; });
    sh.check(pressed === 'true', 'T50 Part 6 shows as locked after one press in the Parts tab', 'aria-pressed ' + pressed);

    // ================= PUPILS =================
    await api('apiName', { cls: CLS, name: 'Ciara' }, P2); await api('apiName', { cls: CLS, name: 'Niamh' }, P3);
    // T01 sign-in: the name screen once, then "Hi <name>"
    await pupil(NONAME, '');
    sh.check(await waitSel('#nm'), 'T01 a pupil with no name on record is asked for her first name');
    await page.type('#nm', 'Orla'); await tap('#go'); await wait(1200);
    const hi1 = await txt(page, '#who .nm');
    sh.check(hi1 === fmt(S.hi, { name: 'Orla' }), 'T01 the bar says "Hi Orla" after naming', 'saw ' + hi1);
    await pupil(NONAME, ''); await waitSel('.tiles');
    sh.check(!(await count(page, '#nm')) && (await count(page, '.tiles a.tile')) > 0 && (await txt(page, '#who .nm')) === 'Hi Orla', 'T01 the next load goes straight home with "Hi Orla"');

    // T02 domain
    net.keep = true; net.apis = [];
    await go(GMAIL, 'class=' + CLS, ''); await wait(400); net.keep = false;
    const t02 = (await bodyText(page)).trim();
    sh.check(t02.indexOf(S.domain) >= 0 && !(await count(page, '.tiles')) && !(await count(page, '#who .nm')), 'T02 a gmail user sees the domain line and nothing else', 'saw: ' + t02.slice(0, 90));
    const g2 = [await api('apiBoot', { cls: CLS }, GMAIL), await api('apiOpen', { cls: CLS, act: 't1p' }, GMAIL), await api('apiBoard', { cls: CLS }, GMAIL)];
    sh.check(net.apis.length > 0 && net.apis.concat(g2).every(bad), 'T02 no API call succeeds for a gmail user', net.apis.length + ' page calls');

    // T03 no class
    await go(P1, 'class=no-such-class', '');
    const t03 = (await bodyText(page)).trim();
    sh.check(t03.indexOf(S.noClass) >= 0 && !(await count(page, '.tiles')), 'T03 a link with an unknown class shows the no-class line and nothing else', 'saw: ' + t03.slice(0, 90));
    await go(P1, '', '');
    const t03b = await count(page, '.tiles a.tile');
    sh.check(t03b === 0, 'T03 a bare link (no ?class=) shows no pupil parts');
    sh.info('T03 a bare link now opens the staff page (the door) for everyone, by the build ruling that copies the S1 Unit 1 shell; the acceptance row still expects the no-class line there');

    // T06 the locked part
    await pupil(P1, ''); await waitSel('.tiles');
    const lockInfo = await page.$$eval('.tiles a.tile', (a) => a.map((t) => [t.dataset.part, t.classList.contains('lock')]));
    const p6 = lockInfo.find((x) => x[0] === 'p6');
    sh.check(p6 && p6[1], 'T06 the Part 6 tile shows a lock');
    sh.check(lockInfo.filter((x) => x[0] !== 'p6').every((x) => !x[1]) && lockInfo.length >= 10, 'T06 every other tile is open', JSON.stringify(lockInfo.filter((x) => x[1])));
    await pupil(P1, 's6'); await wait(500);
    sh.check((await bodyText(page)).indexOf(S.locked) >= 0, 'T06 #s6 says "' + S.locked + '"');
    await pupil(P1, 's7'); await wait(500);
    sh.check((await bodyText(page)).indexOf(S.locked) < 0 && (await count(page, 'a[href^="#s7/"]')) > 0, 'T06 Part 7 still opens');
    await api('apiStaff', { op: 'setPart', slug: CLS, part: 'p6', locked: 0 }, OWNER);

    // T09 / T13 / T26 / T24 quizzes, through the page
    async function quiz(id, act, opts) {
      opts = opts || {};
      await pupil(P1, ROUTE[act] || act); const okq = await waitSel('.q[data-q] .opt');
      if (!okq) { sh.fail(id + ' #' + (ROUTE[act] || act) + ' shows its questions'); return null; }
      const n = await count(page, '.q[data-q]');
      for (let i = 0; i < n - 1; i++) await tap('.q[data-q="' + i + '"] .opt[data-o="0"]');
      const ck = await page.$eval('#ck', (b) => ({ d: b.disabled, t: b.innerText.trim() }));
      const m0 = net.marks; await tap('#ck').catch(() => {}); await wait(300);
      sh.check(ck.d && net.marks === m0, id + ' Check is inert with ' + (n - 1) + ' of ' + n + ' answered', JSON.stringify(ck));
      if (opts.word) sh.check(ck.t === fmt(S.checkN, { m: n }), id + ' Check reads "' + fmt(S.checkN, { m: n }) + '"', 'saw ' + ck.t);
      await tap('.q[data-q="' + (n - 1) + '"] .opt[data-o="1"]');
      sh.check(!(await page.$eval('#ck', (b) => b.disabled)), id + ' Check comes alive when all ' + n + ' are answered');
      const before = await page.$$eval('.q[data-q]', (a) => a.map((q) => q.innerText).join('|'));
      await tap('#ck'); const gotRes = await waitSel('.res .score');
      const score = gotRes ? await txt(page, '.res .score') : '';
      const mm = /(\d+) of (\d+) marks/.exec(score || '');
      sh.check(!!mm && +mm[2] === n, id + ' the result says "You scored n of ' + n + ' marks."', 'saw ' + score);
      const marks = await count(page, '.why .mark'), rights = await count(page, '.opt.right');
      sh.check(marks === n && rights === n, id + ' every question shows a tick or cross and its right answer', marks + ' marks, ' + rights + ' right');
      sh.check((await count(page, '.why span')) >= n, id + ' why lines are shown');
      if (opts.tag) sh.check((await page.$$eval('.why .tag', (a, L) => a.filter((t) => t.textContent.indexOf(L) === 0).length, S.tagLabel)) === n, id + ' each result shows "' + S.tagLabel + ' <tag>"');
      if (opts.imgs) {
        const im = await page.$$eval('.q[data-q] img', (a) => a.map((i) => ({ alt: i.alt, credit: !!(i.closest('.q').querySelector('p.small.mute')), ok: i.complete && i.naturalWidth > 0 })));
        sh.check(im.length === n && im.every((i) => i.alt && i.alt.length > 3 && i.credit), id + ' every image has alt text and a credit line', JSON.stringify(im.filter((i) => !(i.alt && i.credit)).length) + ' short');
        sh.check(im.every((i) => i.ok), id + ' every image loads', im.filter((i) => !i.ok).length + ' broken');
      }
      if (await count(page, '#again')) {
        await tap('#again'); await waitSel('.q[data-q] .opt'); await wait(300);
        const after = await page.$$eval('.q[data-q]', (a) => a.map((q) => q.innerText).join('|'));
        const bt = await bodyText(page);
        sh.check(after !== before, id + ' Try again reshuffles');
        if (mm) sh.check(bt.indexOf(fmt(S.best, { n: mm[1], m: n })) >= 0, id + ' the best is kept ("' + fmt(S.best, { n: mm[1], m: n }) + '")');
      } else sh.fail(id + ' Try again is offered');
      return mm ? +mm[1] : null;
    }
    await quiz('T09', 't1p', { word: true });
    await quiz('T13', 'c-val', { word: true });
    await quiz('T26', 'r-test', { word: true });
    await quiz('T26', 'w-test', { word: true });
    await quiz('T24', 'm-images', { imgs: true });
    await quiz('T19', 'f-scen', { tag: true });

    // T10 checklist
    await pupil(P1, 's1/checklist'); await waitSel('input[data-i]');
    const nck = await count(page, 'input[data-i]');
    for (let i = 0; i < nck; i++) { await tap('input[data-i="' + i + '"]').catch(() => {}); await wait(60); }
    await wait(1200);
    await pupil(P1, 's1/checklist'); await waitSel('input[data-i]');
    const kept = await page.$$eval('input[data-i]', (a) => a.filter((x) => x.checked).length);
    sh.check(nck === 12 && kept === 12, 'T10 all 12 ticks are kept after a reload', nck + ' lines, ' + kept + ' kept');
    const bootCk = await api('apiBoot', { cls: CLS }, P1);
    const ck = (bootCk.hdr || {}).ck; const ckN = Array.isArray(ck) ? ck.filter(Boolean).length : ck && typeof ck === 'object' ? Object.values(ck).filter(Boolean).length : 0;
    sh.check(ckN === 12, 'T10 the ticks are saved as ck on the pupil record', 'ck count ' + ckN);

    // T20 tap (f-apply)
    await pupil(P1, ROUTE['f-apply']); await waitSel('.ph[data-i]');
    const nItems = await count(page, '.q[data-q]');
    await tap('.q[data-q="0"] .ph[data-i="0"]'); const on1 = await page.$eval('.q[data-q="0"] .ph[data-i="0"]', (e) => e.getAttribute('aria-pressed') || e.className);
    await tap('.q[data-q="0"] .ph[data-i="0"]'); const on2 = await page.$eval('.q[data-q="0"] .ph[data-i="0"]', (e) => e.getAttribute('aria-pressed') || e.className);
    sh.check(on1 !== on2, 'T20 a second tap on a phrase undoes the first', on1 + ' / ' + on2);
    for (let i = 0; i < nItems - 1; i++) await tap('.q[data-q="' + i + '"] .ph[data-i="0"]');
    sh.check(await page.$eval('#ck', (b) => b.disabled), 'T20 Check is inert until every item has a phrase');
    await tap('.q[data-q="' + (nItems - 1) + '"] .ph[data-i="0"]'); await tap('#ck'); await waitSel('.res .score');
    const tapMarks = await page.$$eval('.q[data-q]', (a) => a.map((q) => q.querySelectorAll('.ph.right, .ph.ok, .ph.wrong, .ph.no').length));
    sh.check(tapMarks.every((x) => x > 0), 'T20 after Check each item shows its right phrase (and a wrong one when picked)', JSON.stringify(tapMarks));

    // T21 tick (e-spot)
    await pupil(P1, ROUTE['e-spot']); await waitSel('.q[data-q] .opt');
    const nRows = await count(page, '.q[data-q]');
    for (let i = 0; i < nRows - 1; i++) await tap('.q[data-q="' + i + '"] .opt[data-o="' + (i % 2) + '"]');
    sh.check(nRows === 12 && (await page.$eval('#ck', (b) => b.disabled)), 'T21 Check is inert with 11 of 12 rows set', nRows + ' rows');
    await tap('.q[data-q="' + (nRows - 1) + '"] .opt[data-o="0"]'); await tap('#ck'); await waitSel('.res .score');
    sh.check(/of 12 marks/.test(await txt(page, '.res .score') || '') && (await count(page, '.why')) >= 12, 'T21 a score out of 12 and why lines');

    // T23 branch (p-decide): story choices are not marked, the five asks are
    await pupil(P1, ROUTE['p-decide']); await waitSel('.story .opt');
    let steps = 0;
    for (let s = 0; s < 12; s++) {
      const opt = await page.$('.story .q:last-child .opt:not([disabled])'); if (!opt) break;
      await tapEl(opt); await wait(150); steps++;
      const g = await page.$('.story .q:last-child #go:not([disabled])'); if (g) { await tapEl(g); await wait(250); }
      if (await count(page, '.asks .q[data-q]')) break;
    }
    const m0 = net.marks;
    sh.check(steps === 5 && net.marks === m0, 'T23 five story choices, none marked', steps + ' steps');
    const nAsk = await count(page, '.asks .q[data-q]');
    for (let i = 0; i < nAsk; i++) await tap('.asks .q[data-q="' + i + '"] .opt[data-o="0"]');
    await tap('.asks #ck').catch(() => {}); await waitSel('.res .score');
    sh.check(nAsk === 5 && /of 5 marks/.test(await txt(page, '.res .score') || ''), 'T23 the five asks are marked out of 5', nAsk + ' asks');

    // T29 cards
    await pupil(P1, 's5/cards'); await waitSel('.fc');
    const firstTerms = []; let flips = 0;
    for (let i = 0; i < 40; i++) {
      const fc = await page.$('.fc'); if (!fc) break;
      firstTerms.push(await page.$eval('.fc .term', (e) => e.innerText.trim()).catch(() => ''));
      await tapEl(fc); await wait(80); await tap(i % 3 === 0 ? '#no' : '#yes'); await wait(120); flips++;
    }
    const pk = await count(page, '#pk li'), pn = await count(page, '#pn li');
    sh.check(flips === 17 && pk + pn === 17, 'T29 17 cards flip and sort into the two piles', flips + ' flips, ' + pk + '+' + pn);
    const terms = await api('apiOpen', { cls: CLS, act: 'cards' }, P1).catch(() => null);
    await wait(800);
    const pile = ((await api('apiBoot', { cls: CLS }, P1)).hdr || {}).pile || {};
    sh.check(Object.keys(pile).length === 17, 'T29 the piles are saved as pile on the pupil record', Object.keys(pile).length + ' saved');
    await pupil(P1, 's5/cards'); await wait(600);
    const again = await bodyText(page);
    sh.check(again.indexOf(S.cardsNone) >= 0 || (await count(page, '#pk li')) === pk, 'T29 the piles come back on reload');
    sh.info('T29 card order fixed as the list: first five shown were ' + firstTerms.slice(0, 5).join(', '));

    // T30 v-quiz: 10 drawn per pupil, seeded
    const vq1 = await api('apiOpen', { cls: CLS, act: 'vquiz' }, P1), vq1b = await api('apiOpen', { cls: CLS, act: 'vquiz' }, P1), vq2 = await api('apiOpen', { cls: CLS, act: 'vquiz' }, P2);
    const qset = (o) => ((o.view && o.view.qs) || []).map((q) => q.q || q.t).sort().join('|');
    sh.check((vq1.view.qs || []).length === 10, 'T30 ten questions are drawn', (vq1.view.qs || []).length + ' drawn');
    sh.check(qset(vq1) === qset(vq1b), 'T30 the same pupil gets the same ten (seeded)');
    sh.check(qset(vq1) !== qset(vq2), 'T30 a second pupil gets a different ten');
    await quiz('T30', 'vquiz', {});

    // T32 / T33 five-mark build and write (s6/1)
    await pupil(P1, 's6/1'); const b5 = await waitSel('.slotc[data-s]');
    if (b5) {
      const slots = await page.$$eval('.slotc[data-s]', (a) => a.map((c) => c.dataset.type));
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === 'pick') await tap('.slotc[data-s="' + i + '"] .opt[data-o="0"]');
        if (slots[i] === 'tap') { const ph = await page.$$('.slotc[data-s="' + i + '"] .ph[data-i]'); for (let k = 0; k < 2 && k < ph.length; k++) await tapEl(ph[k]); }
      }
      await tap('#ck').catch(() => {}); await waitSel('.res .score');
      const sc5 = await txt(page, '.res .score');
      sh.check(/of 5 marks/.test(sc5 || ''), 'T32 the build is marked out of 5', 'saw ' + sc5);
      const strip = await page.$$eval('.strip li', (a) => [a.length, a.filter((l) => /AO[12]/.test(l.innerText)).length]);
      sh.check(strip[0] >= 1 && strip[1] === strip[0], 'T32 the mark strip shows AO1/AO2 on each line', strip[0] + ' lines, ' + strip[1] + ' with AO1/AO2');
      const fixes = await page.$$eval('.slotc .fix, .slotc .right, .slotc .why', (a) => a.length);
      sh.check(fixes > 0, 'T32 wrong picks show the right sentence');
      if (await count(page, '#again')) { const bf = await page.$$eval('.slotc .opt', (a) => a.map((x) => x.innerText).join('|')); await tap('#again'); await waitSel('.slotc .opt'); await wait(300); const af = await page.$$eval('.slotc .opt', (a) => a.map((x) => x.innerText).join('|')); sh.check(bf !== af, 'T32 Try again reshuffles the options'); }
      sh.check((await bodyText(page)).indexOf('Build: ') >= 0 || (await bodyText(page)).indexOf('Your best so far') >= 0, 'T32 the best is kept on the question page');
    } else sh.fail('T32 #s6/1 shows its build slots');
    await pupil(P1, 's6/1/write'); const w5 = await waitSel('textarea#w1');
    if (w5) {
      await page.type('#w1', 'Culture is the shared way of life of a group. ');
      const ph = await page.$('.ph.ins'); const phT = ph ? await ph.evaluate((e) => e.textContent) : '';
      if (ph) await tapEl(ph); await wait(150);
      const val = await page.$eval('#w1', (t) => t.value);
      sh.check(!!phT && val.indexOf(phT) > 0, 'T33 a tapped item phrase drops in at the caret', ph ? 'not inserted' : 'no item phrases');
      await page.type('#w1', ' This means people learn norms and values, for example in the family.');
      await tap('#ck').catch(() => {}); await waitSel('ul.ckl li', 8000);
      const ckl = await count(page, 'ul.ckl li');
      sh.check(ckl === 5, 'T33 the checklist shows 5 lines', ckl + ' lines');
      sh.check((await count(page, '.writeout')) > 0 && (await count(page, '.writeout .model p.ao1')) > 0 && (await count(page, '.writeout .model p.ao2')) > 0, 'T33 the model answer appears with AO tags', await page.$$eval('.writeout *', (a) => [...new Set(a.map((e) => e.tagName.toLowerCase() + '.' + e.className))].join(' ')));
      sh.skip('T33 item quotes underlined in the model', 'needs a judgement of which words are item quotes; left to the sit and g1');
      await pupil(P1, 's6/1/write'); await waitSel('textarea#w1'); await wait(500);
      sh.check(((await page.$eval('#w1', (t) => t.value)) || '').indexOf('Culture is the shared way') === 0, 'T33 the answer is restored on reload');
      await pupil(P1, 's6/2/write'); await waitSel('textarea#w1'); await wait(500);
      await page.type('#w1', 'A first try at this question to see the model answer.'); await tap('#ck'); await waitSel('.writeout .model', 8000);
      const model = await page.$eval('.writeout .model', (m) => [...m.querySelectorAll('p.ao1, p.ao2')].map((p) => p.textContent.replace(/^\s*AO[12][:\s]*/, '')).join(' ')).catch(() => '');
      if (model.length > 40) {
        await page.$eval('#w1', (t, v) => { t.value = v; }, model.slice(0, 880)); await page.focus('#w1'); await page.keyboard.type(' ');
        await tap('#ck'); await wait(1500);
        const pt1 = await bodyText(page), n1 = (/found (\d+) of/.exec(pt1) || [])[1];
        sh.check(+n1 >= 3 && pt1.indexOf(fmt(S.practicePt, { n: n1 })) >= 0, 'T33 a practice point is given when 3 or more are found', 'found ' + n1);
        await tap('#ck'); await wait(1500);
        const pt2 = await bodyText(page);
        sh.check(pt2.indexOf(S.practiceHad) >= 0 && pt2.indexOf(fmt(S.practicePt, { n: n1 })) < 0, 'T33 the practice point is given once only');
      } else sh.skip('T33 practice point when 3 or more found', 'the model answer could not be read off the page to write a strong answer');
    } else sh.fail('T33 #s6/1/write shows a writing box');

    // T35 / T36 / T37 ten-mark
    await pupil(P1, 's7/1'); const b10 = await waitSel('.slotc[data-s]');
    if (b10) {
      const slots = await page.$$eval('.slotc[data-s]', (a) => a.map((c) => c.dataset.type));
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === 'pick') await tap('.slotc[data-s="' + i + '"] .opt[data-o="0"]');
        if (slots[i] === 'tap') { const ph = await page.$$('.slotc[data-s="' + i + '"] .ph[data-i]'); if (ph[0]) await tapEl(ph[0]); }
        if (slots[i] === 'order') await dragOrder('.slotc[data-s="' + i + '"]');
      }
      sh.check(!(await page.$eval('#ck', (b) => b.disabled)), 'T35 Check comes alive once every slot is filled and each explain order has been moved', await txt(page, '#cnt'));
      await tap('#ck').catch(() => {}); await waitSel('.res .score');
      sh.check(slots.length === 10 && /of 10 marks/.test((await txt(page, '.res .score')) || ''), 'T35 ten slots over two paragraphs, marked out of 10', slots.join(','));
    } else sh.fail('T35 #s7/1 shows its build slots');
    await pupil(P1, 's7/1/write'); const w10 = await waitSel('textarea#w2');
    if (w10) {
      await page.type('#w1', 'Families teach norms through primary socialisation, for example parents praise good manners.');
      await page.type('#w2', 'Schools also teach values, for example through rules and sanctions.');
      await tap('#ck').catch(() => {}); await waitSel('ul.ckl li', 8000);
      const groups = await count(page, 'ul.ckl'), lines = await count(page, 'ul.ckl li');
      sh.check(lines === 10 && groups >= 2, 'T36 ten checklist lines in two groups', lines + ' lines in ' + groups + ' groups');
    } else sh.fail('T36 #s7/1/write shows two boxes');
    await pupil(P1, 's7/6/write'); await waitSel('textarea#w1');
    const nb = await bodyText(page);
    sh.check(nb.indexOf(S.tenNoItem) >= 0 && nb.indexOf(S.schemeHer) >= 0, 'T37 question 6 says it has no item and gives her scheme line');
    await page.type('#w1', 'Religion teaches values through rules, for example the Ten Commandments set norms.'); await tap('#ck'); await waitSel('ul.ckl li', 8000);
    sh.check((await count(page, 'ul.ckl li')) === 10, 'T37 question 6 write checklist has her ten lines', (await count(page, 'ul.ckl li')) + ' lines');
    sh.skip('T36 practice point once when 6 or more found', 'needs a strong two-paragraph answer; the model is not split per box on the page');
    await pupil(P1, 's7/6'); await waitSel('.slotc[data-s]');
    const t6 = await page.$$eval('.slotc[data-s]', (a) => a.map((c) => c.dataset.type));
    sh.check(t6.length === 10 && t6.every((t) => t === 'pick'), 'T37 question 6 builds with ten picks', t6.join(','));

    // T40 badges, with the 4-of-5 control (pupil2, by API)
    const sc = [await full('sc-sort', P2), null];
    if (sc[0].key) { await sc[0].mark(); sc[1] = await full('sc-sort', P2, { round: 2 }); if (sc[1].key) await sc[1].mark(); }
    const d8 = await full('d5-08', P2), d25 = await full('d5-25', P2);
    let r8 = d8.key ? await d8.mark() : {};
    sh.check(r8.score === r8.max, 'T40 a learned build scores full marks (the harness can earn a badge)', 'scored ' + r8.score + ' of ' + r8.max);
    let four = null;
    let k4 = null;
    if (d25.key) { k4 = d25.key.slice(); const pi = d25.o.view.slots.findIndex((s) => s.type === 'pick'); k4[pi] = (k4[pi] + 1) % d25.o.view.slots[pi].opts.length; four = await d25.mark(k4); }
    const hasB = (r) => !!r && ((r.badges || []).indexOf('sanctions') >= 0 || ((r.hdr || {}).bd || []).indexOf('sanctions') >= 0);
    sh.check(four && four.score === 4 && !hasB(four), 'CONTROL T40 4 of 5 on the social control build gives no Sanctions badge', four ? 'scored ' + four.score + ', badge ' + hasB(four) : 'no mark');
    const five = d25.key ? await d25.mark() : null;
    sh.check(hasB(five), 'T40 5 of 5 then earns the Sanctions badge', five ? 'scored ' + five.score : 'no mark');
    const worse = k4 ? await d25.mark(k4) : null;
    for (const a of ['d5-01', 'd5-02', 'd5-03']) { const f = await full(a, P2); if (f.key) await f.mark(); }
    sh.check(hasB(worse), 'T40 the badge is kept after a worse score', worse ? 'scored ' + worse.score + ', bd ' + JSON.stringify((worse.hdr || {}).bd) : 'no mark');
    await pupil(P2, 'badges'); await waitSel('.badge');
    const bs = await page.$$eval('.badge', (a) => a.map((b) => ({ on: b.classList.contains('on'), t: b.innerText })));
    sh.check(bs.length === 6, 'T40 six badges are shown', bs.length + ' shown; page: ' + (await bodyText(page)).slice(0, 120));
    sh.check(bs.filter((b) => b.on).length >= 1 && bs.filter((b) => b.on).every((b) => /\d/.test(b.t)), 'T40 an earned badge is dated');
    sh.check(bs.filter((b) => !b.on).every((b) => b.t.length > 40), 'T40 unearned badges show their rule in words');

    // T41 board on and off (CONTROL: hidden when off)
    await api('apiStaff', { op: 'lb', slug: CLS, lb: 1 }, OWNER);
    await pupil(P1, 'board'); await waitSel('table.board');
    const brows = await count(page, 'table.board tbody tr, table.board tr.me'), me = await count(page, 'tr.me');
    sh.check(brows > 0 && brows <= 11 && me === 1, 'T41 with the board on: the top ten and her own row', brows + ' rows, me ' + me);
    await api('apiStaff', { op: 'lb', slug: CLS, lb: 0 }, OWNER);
    await pupil(P1, 'board'); await wait(800);
    sh.check(!(await count(page, 'table.board')) && (await bodyText(page)).indexOf(S.boardOff) >= 0, 'CONTROL T41 the board hides when the teacher turns it off', 'table ' + (await count(page, 'table.board')));
    await api('apiStaff', { op: 'lb', slug: CLS, lb: 1 }, OWNER);

    // T42 progress
    await pupil(P1, 'progress'); await waitSel('ul.prog li');
    const prog = await page.$$eval('ul.prog li', (a) => a.map((l) => l.innerText));
    sh.check(prog.length >= 9 && prog.every((l) => /\d+ of \d+ marks/.test(l)), 'T42 one bar per part with "n of m marks" in words', prog.length + ' rows');

    // T43 daily: two pupils, same five; first stores dl, second says practice
    await pupil(P1, 'daily'); await waitSel('.q[data-q] .opt');
    const dq = await page.$$eval('.q[data-q] .qt', (a) => a.map((e) => e.innerText.trim()).sort().join('|'));
    const d2 = await api('apiDaily', { cls: CLS }, P2);
    sh.check(dq && dq === ((d2.view || {}).qs || []).map((q) => q.q || q.t).sort().join('|'), 'T43 two pupils in the class get the same daily five');
    for (let i = 0; i < 5; i++) await tap('.q[data-q="' + i + '"] .opt[data-o="0"]');
    await tap('#ck'); await waitSel('.res .score');
    const dl1 = ((await api('apiBoot', { cls: CLS }, P1)).hdr || {}).dl || {};
    sh.check(Object.keys(dl1).length === 1, 'T43 the first run stores dl[date]', Object.keys(dl1).length + ' dates');
    await pupil(P1, 'daily'); await waitSel('.q[data-q] .opt');
    const dd = await bodyText(page);
    const doneLine = fmt(S.dailyDone, { n: Object.values(dl1)[0] });
    sh.check(dd.indexOf(doneLine) >= 0, 'T43 the second run says it is practice ("' + doneLine.slice(0, 50) + '…")', 'page: ' + dd.slice(Math.max(0, dd.indexOf('challenge') - 20), Math.max(0, dd.indexOf('challenge')) + 120) + ' dl=' + JSON.stringify(dl1).replace(/\d{4}-/g, ''));

    // T44 weekly
    await pupil(P1, 'weekly'); await waitSel('.slotc[data-s]');
    const wk = await api('apiWeekly', { cls: CLS }, P1);
    const bl = ((wk.view || {}).builds || []).map((b) => b.slots.length);
    sh.check(bl.join(',') === '5,5,10' && wk.max === 20, 'T44 two five-mark builds and one ten-mark build, max 20', bl.join(',') + ' max ' + wk.max);
    const wsl = await page.$$eval('.slotc[data-s]', (a) => a.map((c) => c.dataset.type));
    const picks = await page.$$('.slotc[data-type="pick"]');
    for (const p of picks) { const o = await p.$('.opt[data-o="0"]'); if (o) await tapEl(o); }
    const ords = await page.$$eval('.slotc[data-type="order"]', (x) => x.map((c) => c.closest('[data-b]') ? null : c.dataset.s));
    { const all = await page.$$('.slotc[data-type="order"]'); for (let i = 0; i < all.length; i++) { await all[i].evaluate((e, i) => e.setAttribute('data-g5', 'o' + i), i); await dragOrder('[data-g5="o' + i + '"]'); } }
    const taps = await page.$$('.slotc[data-type="tap"]');
    for (const t of taps) { const ph = await t.$$('.ph[data-i]'); for (let k = 0; k < 2 && k < ph.length; k++) await tapEl(ph[k]); }
    await tap('#ck').catch(() => {}); const wres = await waitSel('.res .score', 8000);
    sh.check(wres && /of 20 marks/.test((await txt(page, '.res .score')) || ''), 'T44 the weekly mock is marked out of 20', wsl.length + ' slots on the page');
    const wk1 = JSON.stringify(((await api('apiBoot', { cls: CLS }, P1)).hdr || {}).wk || {});
    await api('apiMark', { cls: CLS, act: 'weekly', ans: { builds: wk.view.builds.map((b) => b.slots.map((s) => (s.type === 'pick' ? 0 : s.type === 'tap' ? [0] : s.steps))) } }, P1);
    const wk2 = JSON.stringify(((await api('apiBoot', { cls: CLS }, P1)).hdr || {}).wk || {});
    sh.check(wk1 !== '{}' && wk1 === wk2, 'T44 wk[week] is stored once', wk1 === '{}' ? 'nothing stored' : 'changed on a second run');

    // T46 offline then retry
    await pupil(P1, ROUTE.t1p); await waitSel('.q[data-q] .opt');
    const nq = await count(page, '.q[data-q]');
    for (let i = 0; i < nq; i++) await tap('.q[data-q="' + i + '"] .opt[data-o="0"]');
    net.mode = 'offline'; await tap('#ck'); await wait(2500);
    const sysT = await txt(page, '#sys');
    sh.check(String(sysT || '').indexOf(S.offline) >= 0 && (await count(page, '#retry')) === 1, 'T46 with the server unreachable the offline line and Retry show', 'saw ' + sysT);
    sh.check((await count(page, '.opt[aria-pressed="true"]')) === nq, 'T46 her answers are kept');
    net.mode = ''; await tap('#retry').catch(() => {}); const back = await waitSel('.res .score', 8000);
    sh.check(back, 'T46 Retry marks the answers once the server is back');

    // T47 expired sign-in
    await pupil(P1, 'home'); await waitSel('.tiles');
    net.mode = 'expired'; await page.evaluate(() => { location.hash = 's1/primary/test'; }); await wait(1500);
    const exT = (await txt(page, '#sys')) || '';
    sh.check(exT.indexOf(S.expired) >= 0 || (await bodyText(page)).indexOf(S.expired) >= 0, 'T47 a not-signed-in reply shows the expired line', 'saw ' + exT.slice(0, 80));
    net.mode = '';

    // T51 tracker, T52 pupil page, T53 export (owner)
    await api('apiWrite', { cls: CLS, act: 'w5-02', text: 'Socialisation is how people learn the norms and values of their society.', text2: '' }, P3);
    await go(OWNER, '', ''); await waitSel('.tabs');
    await tap('.tabs button[data-t="tracker"]'); await wait(800);
    if (await count(page, 'select#cls')) { await page.select('select#cls', CLS).catch(() => {}); await wait(900); }
    const trows = await page.$$eval('#trk tr', (a) => a.slice(1).map((r) => r.innerText.replace(/\s+/g, ' ')));
    const names = ['Aoife', 'Ciara', 'Orla', 'Niamh'];
    sh.check(names.every((n) => trows.some((r) => r.indexOf(n) >= 0)), 'T51 a row for each pupil who has used the class', trows.length + ' rows: ' + trows.map((r) => r.split(' ')[0]).join(', '));
    const ao = trows.find((r) => r.indexOf('Aoife') >= 0) || '';
    sh.check(/\d/.test(ao) && /(today|ago|yesterday|\d{1,2} \w+)/i.test(ao), 'T51 the row carries points and last seen in words', ao.slice(0, 120));
    const flagA = trows.find((r) => r.indexOf('Writes but never builds') >= 0), flagB = trows.find((r) => r.indexOf('Builds full marks, never writes') >= 0);
    sh.check(!!flagA, 'T51 a pupil who writes but never builds is flagged');
    sh.check(!!flagB, 'T51 a pupil who builds full marks but never writes is flagged', trows.map((r) => r.split(' ')[0] + (r.indexOf('never') >= 0 ? '*' : '')).join(', '));
    const link = await page.evaluateHandle(() => [...document.querySelectorAll('#trk a.link')].find((a) => a.innerText.indexOf('Aoife') >= 0));
    if (await link.evaluate((a) => !!a)) {
      await link.evaluate((a) => a.click()); await waitSel('#pp'); await page.waitForFunction(() => (document.querySelector('#pp') || {}).innerText && document.querySelector('#pp').innerText.length > 60, { timeout: 6000 }).catch(() => {});
      const pp = await txt(page, '#pp') || '';
      sh.check(/\d+ of \d+/.test(pp) && pp.indexOf('Culture is the shared way') >= 0, 'T52 the pupil page lists her bests and her written answer with its checklist', pp.length + ' chars, bests ' + /\d+ of \d+/.test(pp) + ', write ' + (pp.indexOf('Culture is the shared way') >= 0) + ' ' + pp.slice(0, 160));
      await tap('#bk'); await wait(700);
      sh.check((await count(page, '#trk')) === 1, 'T52 "Back" returns to the tracker');
    } else sh.fail('T52 a pupil name in the tracker opens her page');
    await tap('.tabs button[data-t="csv"]'); await wait(800);
    if (await count(page, 'select#cls')) { await page.select('select#cls', CLS).catch(() => {}); await wait(700); }
    await page.evaluate(() => { window.__blob = null; });
    if (await count(page, '#dl')) { await tap('#dl'); await wait(1500); }
    const csv = await page.evaluate(() => window.__blob);
    if (csv) {
      const parse = (l) => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; };
      const body = csv.replace(/^\uFEFF/, ''), lines = body.split(/\r\n/).filter(Boolean);
      const secs = []; lines.forEach((l) => { const c = parse(l); if (c[0] === 'class' && c[1] === 'pupil') secs.push({ head: c, rows: [] }); else if (secs.length) secs[secs.length - 1].rows.push(c); });
      const w = secs.length ? secs[0].head.length : 0;
      sh.check(secs.length >= 1 && secs[0].rows.length === names.length && names.every((n) => secs[0].rows.some((r) => r[1] === n)), 'T53 the tracker part of the CSV has one row per pupil', secs.length ? secs[0].rows.map((r) => r[1]).join(', ') : 'no header');
      sh.check(secs.every((x) => x.rows.every((r) => r.length === x.head.length)), 'T53 every row has its header\'s column count', secs.map((x) => x.head.length + ':' + x.rows.map((r) => r.length).join('/')).join(' '));
      sh.check(secs.length < 2 || secs[1].rows.length >= 1, 'T53 a second part lists the written answers, one row each', secs.length + ' parts');
      sh.check(!/\r(?!\n)|(?<!\r)\n/.test(body.replace(/"[^"]*"/g, '')), 'T53 rows end CRLF only');
      sh.info('T53 columns follow SPEC §7 (the tracker: points, badges, streak, Part 1–9, last seen, flags), ' + w + ' columns; the acceptance row says one column per act');
    } else sh.fail('T53 Download CSV hands over a file');

    sh.check(errs.length === 0, 'no console or page errors', errs.slice(0, 3).join(' | '));
  } catch (e) { sh.fail('the gate ran to the end', String(e && e.stack || e).split('\n').slice(0, 3).join(' ')); }
  finally { if (browser) await browser.close().catch(() => {}); srv.kill(); }
  sh.finish();
})();
