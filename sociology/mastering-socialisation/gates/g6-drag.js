#!/usr/bin/env node
/* G6 - drag and drop, driven with REAL input only (page.mouse at 1280x800, page.touchscreen at 375x812; never dispatchEvent for a test).
 * Surfaces: c-sort (bins), sc-sort (bins, 16 cards over two rounds), f-match (a chip dropped anywhere on the whole example card),
 * w-first (order list). For each: the card follows the pointer 1:1 (bbox sampled at 3 points mid-drag, each within 4 px of the
 * pointer offset); a drop on a target's centre, corner and label lands; a drop in empty space snaps back to the tray; Check is
 * inert until every card is placed; a wrong card after Check shows its right bin; at 375 no sideways scroll and the tray is sticky
 * and reachable. CONTROLS (must fail): a drag made only of dispatched events must not move a card, and a drop outside every target
 * must leave the counter unchanged. Answer keys are never printed: a wrong card is reported by count only.
 * Run: node gates/g6-drag.js  (exit 0 = GREEN). Port: G6_PORT (default 8772). Output: gates/out/g6-drag.txt */
'use strict';
const fs = require('fs'), path = require('path'), { spawn, execSync } = require('child_process');
const { sheet } = require('./common');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.SOC_DESIGN || '/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/Sociology';
const puppeteer = require(path.join(execSync('npm root -g').toString().trim(), 'puppeteer'));
const PORT = +(process.env.G6_PORT || 8772), BASE = 'http://localhost:' + PORT, OWNER = 'dgartland021@c2ken.net';
const STORE = path.join(DESIGN, 'gates', 'g6-store.json');
const sh = sheet('g6-drag');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ROUTES = { 'c-sort': 's2/sorter', 'sc-sort': 's4/sorter', 'f-match': 's3/family/match', 'w-first': 's3/workplace/firstday' };

async function api(fn, body, user) {
  const r = await fetch(BASE + '/api/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user }, body: JSON.stringify(body || {}) });
  return r.json();
}

// ---- real input -------------------------------------------------------------------------------------------------------------
function Input(page, touch) {
  return {
    async down(x, y) { if (touch) await page.touchscreen.touchStart(x, y); else { await page.mouse.move(x, y); await page.mouse.down(); } },
    async move(x, y) { if (touch) await page.touchscreen.touchMove(x, y); else await page.mouse.move(x, y); },
    async up() { if (touch) await page.touchscreen.touchEnd(); else await page.mouse.up(); },
    async tap(x, y) { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); },
  };
}
// a point on an element, read fresh: kind = centre | corner | label (label = a child selector) | {x,y}
async function pointOf(page, sel, kind, labelSel) {
  return page.evaluate((sel, kind, labelSel) => {
    let e = document.querySelector(sel); if (!e) return null;
    if (kind === 'label') e = e.querySelector(labelSel) || e;
    const r = e.getBoundingClientRect();
    if (kind === 'corner') return { x: r.right - 9, y: r.bottom - 9 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel, kind, labelSel || '');
}
async function cardBox(page) {
  return page.evaluate(() => { const c = document.querySelector('.dcard.dragging'); if (!c) return null; const b = c.getBoundingClientRect(); return { l: b.left, t: b.top }; });
}
// drag from a point to a (re-aimed) point in many small steps; returns 3 mid-drag samples of pointer-minus-card-corner
async function drag(page, inp, from, aim, steps) {
  steps = steps || 24;
  const samples = [];
  await inp.down(from.x, from.y);
  let to = await aim();
  for (let i = 1; i <= steps; i++) {
    const x = from.x + (to.x - from.x) * i / steps, y = from.y + (to.y - from.y) * i / steps;
    await inp.move(x, y);
    if (i === Math.round(steps / 4) || i === Math.round(steps / 2) || i === Math.round(steps * 3 / 4)) {
      const b = await cardBox(page); samples.push(b ? { dx: x - b.l, dy: y - b.t } : null);
    }
  }
  const t2 = await aim(); // the page may have scrolled under the pointer: a pupil re-aims at where the target is now
  if (t2 && (Math.abs(t2.x - to.x) + Math.abs(t2.y - to.y) > 2)) { for (let i = 1; i <= 6; i++) await inp.move(to.x + (t2.x - to.x) * i / 6, to.y + (t2.y - to.y) * i / 6); }
  await inp.up(); await wait(120);
  return samples;
}
function followOk(samples) {
  if (samples.some((s) => !s)) return { ok: false, d: 'no .dragging card at a sample point' };
  const base = samples[0], worst = Math.max(...samples.map((s) => Math.max(Math.abs(s.dx - base.dx), Math.abs(s.dy - base.dy))));
  return { ok: worst <= 4, d: 'largest drift ' + worst.toFixed(1) + ' px' };
}
// the visible centre of the first card still in the tray (scrolls the tray itself so the card is in view)
async function trayCard(page, sel) {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel); if (!c) return null;
    c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = c.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 60), y: r.top + r.height / 2, key: c.dataset.i || c.dataset.chip || c.dataset.t };
  }, sel);
}
async function settle(page) { let a = -1; for (let i = 0; i < 30; i++) { const b = await page.evaluate(() => scrollY); if (b === a) return; a = b; await wait(120); } }
async function bring(page, sel, kind) { // put a target in the middle of the free band between the sticky tray and the sticky check bar
  await settle(page);
  await page.evaluate((sel, kind) => {
    const e = document.querySelector(sel); if (!e) return;
    const tray = document.querySelector('.tray'), bar = document.querySelector('.checkbar');
    const top = tray ? Math.max(0, tray.getBoundingClientRect().height) : 0, bot = bar ? bar.getBoundingClientRect().height : 0;
    const r = e.getBoundingClientRect(), mid = top + (innerHeight - top - bot) / 2;
    // for a corner drop the bottom edge goes to the middle of the band, so the corner is on screen and clear of the check bar
    window.scrollBy({ top: (kind === 'corner' ? r.bottom - 20 : r.top + Math.min(r.height, 120) / 2) - mid, behavior: 'instant' });
  }, sel, kind || '');
  await wait(60);
}
// a point in empty space: inside the viewport, not on any card, target or tray, not on the check bar
async function emptyPoint(page, targetSel) {
  return page.evaluate((targetSel) => {
    for (let y = innerHeight - 90; y > 80; y -= 23) for (let x = 6; x < innerWidth - 6; x += 17) {
      const e = document.elementFromPoint(x, y); if (!e) continue;
      if (e.closest(targetSel) || e.closest('.dcard') || e.closest('.checkbar') || e.closest('.tray') || e.closest('button,a,input')) continue;
      return { x, y };
    }
    return null;
  }, targetSel);
}
const placedText = (page) => page.evaluate(() => { const t = document.querySelector('#tc'); return t ? t.textContent : ''; });

async function open(page, slug, user, act, round) {
  await page.goto(BASE + '/?as=' + encodeURIComponent(user) + '&class=' + slug + '#' + ROUTES[act], { waitUntil: 'networkidle0' });
  await page.waitForSelector('#ck', { timeout: 15000 });
  await wait(250);
}

// ---- one bins surface (c-sort / sc-sort) --------------------------------------------------------------------------------------
async function binsRun(page, inp, tag, act, net) {
  const nBins = await page.$$eval('.bins .bin', (b) => b.length);
  const total = () => page.$$eval('.dcard[data-i]', (c) => c.length);
  const inBins = () => page.$$eval('.bins .dcard', (c) => c.length);
  const n = await total();
  sh.info(tag + ' ' + act + ': ' + n + ' cards, ' + nBins + ' bins');
  const kinds = ['centre', 'corner', 'label'];
  let follow = null;
  for (let k = 0; k < 3; k++) {
    const binSel = '.bins .bin:nth-child(' + ((k % nBins) + 1) + ')';
    await bring(page, binSel, kinds[k]);
    const from = await trayCard(page, '.tray .dcard');
    const before = await page.$$eval(binSel + ' .in .dcard', (c) => c.length);
    const s = await drag(page, inp, from, () => pointOf(page, binSel, kinds[k], '.bh'));
    if (k === 0) follow = followOk(s);
    const after = await page.$$eval(binSel + ' .in .dcard', (c) => c.length);
    const landed = await page.$eval(binSel, (b, key) => !!b.querySelector('.dcard[data-i="' + key + '"]'), from.key);
    sh.check(after === before + 1 && landed, tag + ' ' + act + ': a drop on a bin\'s ' + kinds[k] + (kinds[k] === 'label' ? ' (its heading)' : '') + ' lands the card in that bin', 'bin held ' + before + ' then ' + after);
  }
  sh.check(follow.ok, tag + ' ' + act + ': the dragged card follows the pointer 1:1 (3 samples within 4 px)', follow.d);
  // empty space: back to the tray, counter unchanged (CONTROL: a drop outside every target must change nothing)
  const cBefore = await placedText(page), bBefore = await inBins();
  const from = await trayCard(page, '.tray .dcard');
  const ep = await emptyPoint(page, '.bin, .tray');
  if (!ep) sh.skip(tag + ' ' + act + ': drop in empty space', 'no empty point found on screen');
  else {
    await drag(page, inp, from, async () => ep);
    const back = await page.$eval('#tin', (t, key) => !!t.querySelector('.dcard[data-i="' + key + '"]'), from.key);
    sh.check(back, tag + ' ' + act + ': a drop in empty space snaps the card back to the tray');
    sh.check((await placedText(page)) === cBefore && (await inBins()) === bBefore, 'CONTROL ' + tag + ' ' + act + ': a drop outside every target leaves the counter unchanged', cBefore + ' -> ' + (await placedText(page)));
  }
  // Check stays inert until every card is placed
  const ck = await page.$eval('#ck', (b) => ({ dis: b.disabled, t: b.textContent }));
  const markBefore = net.marks;
  const ckp = await pointOf(page, '#ck', 'centre'); await inp.tap(ckp.x, ckp.y); await wait(400);
  const inert = ck.dis && net.marks === markBefore && !(await page.$('.res'));
  sh.check(inert, tag + ' ' + act + ': Check is inert while cards are left in the tray', 'disabled=' + ck.dis + ', marks sent ' + (net.marks - markBefore));
  // place the rest by tapping a card then a bin (real taps); all into bin 1 so some are surely wrong
  let guard = 0;
  while ((await page.$('.tray .dcard')) && guard++ < 40) {
    const c = await trayCard(page, '.tray .dcard'); await inp.tap(c.x, c.y); await wait(60);
    await bring(page, '.bins .bin:nth-child(1)');
    const b = await pointOf(page, '.bins .bin:nth-child(1)', 'label', '.bh'); await inp.tap(b.x, b.y); await wait(80);
  }
  const all = (await inBins()) === n;
  sh.check(all, tag + ' ' + act + ': every card can be placed (tap a card, tap a bin)', (await inBins()) + ' of ' + n);
  const ready = await page.$eval('#ck', (b) => !b.disabled);
  sh.check(ready, tag + ' ' + act + ': Check comes alive once every card is placed');
  const ckp2 = await pointOf(page, '#ck', 'centre'); await inp.tap(ckp2.x, ckp2.y);
  await page.waitForSelector('.res', { timeout: 15000 }).catch(() => {});
  await wait(300);
  const fx = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.bins .bin')].map((b) => b.getAttribute('aria-label'));
    const no = [...document.querySelectorAll('.bins .dcard.no')];
    const good = no.filter((c) => { const f = c.querySelector('.fix'); if (!f) return false; const here = c.closest('.bin').getAttribute('aria-label'); const named = labels.filter((l) => f.textContent.indexOf(l) >= 0); return named.length && named.indexOf(here) < 0; });
    return { no: no.length, good: good.length, res: !!document.querySelector('.res') };
  });
  sh.check(fx.res && fx.no > 0 && fx.good === fx.no, tag + ' ' + act + ': after Check every wrong card names its right bin', fx.good + ' of ' + fx.no + ' wrong cards name another bin; result card ' + fx.res);
}

async function matchRun(page, inp, tag, net) {
  const n = await page.$$eval('.matchlist .mrow', (r) => r.length);
  const inSlots = () => page.$$eval('.matchlist .slot .dcard', (c) => c.length);
  sh.info(tag + ' f-match: ' + n + ' examples');
  const kinds = ['centre', 'corner', 'label'];
  let follow = null;
  for (let k = 0; k < 3; k++) {
    const rowSel = '.matchlist .mrow:nth-child(' + (k + 1) + ')';
    await bring(page, rowSel, kinds[k]);
    const from = await trayCard(page, '.tray .dcard');
    const s = await drag(page, inp, from, () => pointOf(page, rowSel, kinds[k], '.mt'));
    if (k === 0) follow = followOk(s);
    const landed = await page.$eval(rowSel, (r, key) => !!r.querySelector('.slot .dcard[data-chip="' + key.replace(/"/g, '\\"') + '"]'), from.key);
    sh.check(landed, tag + ' f-match: a chip dropped on the example card\'s ' + (kinds[k] === 'label' ? 'text' : kinds[k]) + ' lands in its slot');
  }
  sh.check(follow.ok, tag + ' f-match: the dragged chip follows the pointer 1:1 (3 samples within 4 px)', follow.d);
  const cBefore = await placedText(page), sBefore = await inSlots();
  const from = await trayCard(page, '.tray .dcard');
  const ep = await emptyPoint(page, '.mrow, .tray');
  if (!ep) sh.skip(tag + ' f-match: drop in empty space', 'no empty point found on screen');
  else {
    await drag(page, inp, from, async () => ep);
    const back = await page.$eval('#tin', (t, key) => !!t.querySelector('.dcard[data-chip="' + key.replace(/"/g, '\\"') + '"]'), from.key);
    sh.check(back, tag + ' f-match: a drop in empty space snaps the chip back to the tray');
    sh.check((await placedText(page)) === cBefore && (await inSlots()) === sBefore, 'CONTROL ' + tag + ' f-match: a drop outside every target leaves the counter unchanged', cBefore + ' -> ' + (await placedText(page)));
  }
  const ck = await page.$eval('#ck', (b) => b.disabled); const m0 = net.marks;
  const ckp = await pointOf(page, '#ck', 'centre'); await inp.tap(ckp.x, ckp.y); await wait(400);
  sh.check(ck && net.marks === m0 && !(await page.$('.res')), tag + ' f-match: Check is inert while examples are empty');
  let guard = 0;
  while ((await page.$('.tray .dcard')) && guard++ < 20) {
    const empty = await page.evaluate(() => { const r = [...document.querySelectorAll('.matchlist .mrow')].findIndex((m) => !m.querySelector('.slot .dcard')); return r; });
    if (empty < 0) break;
    const rowSel = '.matchlist .mrow:nth-child(' + (empty + 1) + ')';
    const c = await trayCard(page, '.tray .dcard'); await inp.tap(c.x, c.y); await wait(60);
    await bring(page, rowSel); const p = await pointOf(page, rowSel, 'label', '.mt'); await inp.tap(p.x, p.y); await wait(80);
  }
  sh.check((await inSlots()) === n, tag + ' f-match: every example can be filled (tap a chip, tap an example)', (await inSlots()) + ' of ' + n);
  sh.check(await page.$eval('#ck', (b) => !b.disabled), tag + ' f-match: Check comes alive once every example is filled');
  const ckp2 = await pointOf(page, '#ck', 'centre'); await inp.tap(ckp2.x, ckp2.y);
  await page.waitForSelector('.res', { timeout: 15000 }).catch(() => {}); await wait(300);
  const r = await page.evaluate(() => ({ res: !!document.querySelector('.res'), no: document.querySelectorAll('.matchlist .slot.no').length, fix: document.querySelectorAll('.matchlist .mrow .fix, .matchlist .slot.no .fix').length }));
  sh.check(r.res, tag + ' f-match: Check gives a result card', 'wrong slots ' + r.no);
  if (r.no) sh.check(r.fix >= r.no, tag + ' f-match: every wrong example shows its right way', r.fix + ' fix lines for ' + r.no + ' wrong');
}

async function orderRun(page, inp, tag, net) {
  const seq = () => page.$$eval('ol.ordlist li.dcard', (l) => l.map((c) => c.dataset.t));
  const nums = () => page.$$eval('ol.ordlist li.dcard .n', (l) => l.map((c) => c.textContent).join(','));
  const s0 = await seq();
  sh.info(tag + ' w-first: ' + s0.length + ' steps; Check is live at once (' + (await page.$eval('#ck', (b) => !b.disabled)) + ') because an order list starts fully placed, so place-all-then-check does not apply');
  await bring(page, 'ol.ordlist li.dcard:nth-child(4)');
  const from = await pointOf(page, 'ol.ordlist li.dcard:nth-child(1)', 'centre');
  const s = await drag(page, inp, from, async () => { const p = await page.evaluate(() => { const l = [...document.querySelectorAll('ol.ordlist li.dcard:not(.dragging)')]; const r = l[3].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.75 }; }); return p; }, 30);
  const f = followOk(s);
  sh.check(f.ok, tag + ' w-first: the dragged step follows the pointer 1:1 (3 samples within 4 px)', f.d);
  const s1 = await seq();
  const movedTo = s1.indexOf(s0[0]);
  sh.check(movedTo >= 2 && s1.length === s0.length, tag + ' w-first: a step dragged down the list lands lower and the others close up', 'step 1 now at ' + (movedTo + 1));
  sh.check((await nums()) === s1.map((_, i) => String(i + 1)).join(','), tag + ' w-first: the step numbers renumber after the move');
  // drop in empty space (off the list): the order stays as it was
  const ep = await emptyPoint(page, 'ol.ordlist');
  const from2 = await pointOf(page, 'ol.ordlist li.dcard:nth-child(2)', 'centre');
  if (ep) {
    await drag(page, inp, from2, async () => ({ x: ep.x, y: from2.y + 0 }), 10);
    await drag(page, inp, from2, async () => ep, 1).catch(() => {});
  }
  const s2 = await seq();
  sh.info(tag + ' w-first: a step dragged sideways off the list keeps its place: ' + (JSON.stringify(s2) === JSON.stringify(s1) ? 'yes' : 'no (moved)'));
  const ckp = await pointOf(page, '#ck', 'centre'); await inp.tap(ckp.x, ckp.y);
  await page.waitForSelector('.res', { timeout: 15000 }).catch(() => {}); await wait(300);
  const r = await page.evaluate(() => ({ res: !!document.querySelector('.res'), no: document.querySelectorAll('ol.ordlist li.dcard.no').length, fix: document.querySelectorAll('ol.ordlist li.dcard.no .fix').length }));
  sh.check(r.res, tag + ' w-first: Check gives a result card');
  if (r.no) sh.check(r.fix === r.no, tag + ' w-first: every step out of place shows its right step number', r.fix + ' of ' + r.no);
  else sh.info(tag + ' w-first: the order happened to be right, so no wrong-step line to check');
}

async function layout375(page, tag, act) {
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  sh.check(sideways <= 1, tag + ' ' + act + ': no sideways scroll', 'page is ' + sideways + ' px too wide');
  if (act === 'w-first') return;
  const tgt = act === 'f-match' ? '.matchlist .mrow:last-child' : '.bins .bin:last-child';
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), tgt); await wait(100);
  const st = await page.evaluate((s) => {
    const t = document.querySelector('.tray').getBoundingClientRect(), c = document.querySelector('.tray .dcard');
    if (!c) return { t: t.top, b: t.bottom, card: false };
    const r = c.getBoundingClientRect(), hit = document.elementFromPoint(r.left + Math.min(r.width / 2, 60), r.top + r.height / 2);
    return { t: t.top, b: t.bottom, card: !!(hit && hit.closest('.dcard') === c), scroll: scrollY };
  }, tgt);
  sh.check(st.scroll > 100 && Math.abs(st.t) <= 2 && st.b > 80 && st.card, tag + ' ' + act + ': with the last target in view the tray stays stuck at the top and its first card can be touched', 'tray top ' + Math.round(st.t) + ', bottom ' + Math.round(st.b) + ', card reachable ' + st.card + ', page scrolled ' + Math.round(st.scroll || 0));
}

// CONTROL: a drag made only of dispatched (untrusted) mouse and HTML drag events must not move the card
async function dispatchControl(page, tag) {
  const r = await page.evaluate(() => {
    const c = document.querySelector('.tray .dcard'), b = document.querySelector('.bins .bin');
    const cr = c.getBoundingClientRect(), br = b.getBoundingClientRect(), key = c.dataset.i;
    const at = (x, y) => ({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
    c.dispatchEvent(new MouseEvent('mousedown', at(cr.left + 10, cr.top + 10)));
    for (let i = 1; i <= 10; i++) document.dispatchEvent(new MouseEvent('mousemove', at(cr.left + (br.left - cr.left) * i / 10 + 10, cr.top + (br.top - cr.top) * i / 10 + 10)));
    b.dispatchEvent(new MouseEvent('mouseup', at(br.left + 20, br.top + 20)));
    try { const dt = new DataTransfer(); c.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt })); b.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt })); b.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt })); } catch (e) {}
    return { stillInTray: !!document.querySelector('#tin .dcard[data-i="' + key + '"]'), inBin: !!b.querySelector('.dcard[data-i="' + key + '"]') };
  });
  sh.check(r.stillInTray && !r.inBin, 'CONTROL ' + tag + ' c-sort: a drag made only of dispatched mouse and drag events does not move the card', 'still in tray ' + r.stillInTray);
}

(async () => {
  try { fs.unlinkSync(STORE); } catch (e) {}
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  const srv = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { SOC_STORE: STORE }), stdio: ['ignore', 'pipe', 'pipe'] });
  let errOut = ''; srv.stderr.on('data', (d) => { errOut += d; });
  await new Promise((ok, no) => { srv.stdout.on('data', (d) => { if (/dev harness on/.test(d)) ok(); }); setTimeout(() => no(new Error('harness did not start: ' + errOut.slice(0, 200))), 15000); });
  let browser;
  try {
    const made = await api('apiStaff', { op: 'create', name: '12B Drag' }, OWNER);
    const slug = made.slug || (made.cls && made.cls.slug);
    if (!slug) throw new Error('class not made: ' + JSON.stringify(made).slice(0, 120));
    browser = await puppeteer.launch({ headless: 'shell', protocolTimeout: 60000, args: ['--no-sandbox'] });
    for (const vp of [{ tag: '1280', w: 1280, h: 800, touch: false, user: 'pupil1@c2ken.net' }, { tag: '375', w: 375, h: 812, touch: true, user: 'pupil2@c2ken.net' }]) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.touch, hasTouch: vp.touch });
      const net = { marks: 0 }, errs = [];
      page.on('request', (r) => { if (/\/api\/apiMark/.test(r.url())) net.marks++; });
      page.on('pageerror', (e) => errs.push(String(e.message || e).slice(0, 120)));
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
      const inp = Input(page, vp.touch);
      // c-sort
      await open(page, slug, vp.user, 'c-sort');
      if (vp.touch) await layout375(page, vp.tag, 'c-sort');
      if (!vp.touch) await dispatchControl(page, vp.tag);
      // edge scroll: grabbing a card from the stuck tray must not scroll the page by itself
      await bring(page, '.bins .bin:nth-child(1)');
      { const c = await trayCard(page, '.tray .dcard'); const y0 = await page.evaluate(() => scrollY);
        await inp.down(c.x, c.y); for (let i = 1; i <= 8; i++) await inp.move(c.x + i * 3, c.y + i); const y1 = await page.evaluate(() => scrollY); await inp.up(); await wait(100);
        sh.check(Math.abs(y1 - y0) < 2, vp.tag + ' c-sort: picking a card up in the stuck tray does not scroll the page under it', 'page moved ' + Math.round(y1 - y0) + ' px'); }
      await open(page, slug, vp.user, 'c-sort');
      await binsRun(page, inp, vp.tag, 'c-sort', net);
      // sc-sort: two rounds of 8 = 16 cards
      await open(page, slug, vp.user, 'sc-sort');
      if (vp.touch) await layout375(page, vp.tag, 'sc-sort');
      const r1 = await page.$$eval('.dcard[data-i]', (c) => c.map((x) => x.dataset.i));
      await binsRun(page, inp, vp.tag, 'sc-sort round 1', net);
      const nr = await page.$('#nr');
      sh.check(!!nr, vp.tag + ' sc-sort: after round 1 there is a button to the next round');
      if (nr) {
        await settle(page);
        const p = await pointOf(page, '#nr', 'centre'); await inp.tap(p.x, p.y);
        await page.waitForFunction(() => !document.querySelector('.res') && document.querySelector('#ck'), { timeout: 15000 }).catch(() => {}); await wait(300);
        const r2 = await page.$$eval('.dcard[data-i]', (c) => c.map((x) => x.dataset.i));
        const all = new Set(r1.concat(r2));
        sh.check(all.size === 16 && r2.every((i) => r1.indexOf(i) < 0), vp.tag + ' sc-sort: round 2 brings new cards, 16 in all over the two rounds', r1.length + ' + ' + r2.length + ' cards, ' + all.size + ' different');
        await binsRun(page, inp, vp.tag, 'sc-sort round 2', net);
      }
      // f-match
      await open(page, slug, vp.user, 'f-match');
      if (vp.touch) await layout375(page, vp.tag, 'f-match');
      await matchRun(page, inp, vp.tag, net);
      // w-first
      await open(page, slug, vp.user, 'w-first');
      if (vp.touch) await layout375(page, vp.tag, 'w-first');
      await orderRun(page, inp, vp.tag, net);
      sh.check(errs.length === 0, vp.tag + ': no console or page errors', errs.slice(0, 3).join(' | '));
      await page.close();
    }
  } catch (e) {
    sh.fail('the run finished', String(e && e.stack || e).split('\n').slice(0, 3).join(' '));
  } finally {
    if (browser) await browser.close().catch(() => {});
    srv.kill();
  }
  sh.finish();
})();
