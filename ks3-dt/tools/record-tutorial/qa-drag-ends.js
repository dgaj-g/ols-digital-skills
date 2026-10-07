#!/usr/bin/env node
/* qa-drag-ends.js — EVERY DRAG ENDS, HOWEVER IT ENDS, AND THE BLOCK STAYS UNDER THE POINTER.
 *
 * ORLA'S PHOTO, 7 October 2026 (J2 Lesson 3, "a number of students across the
 * lesson series"): copies of code lines frozen over the card, carried from the
 * ordering card onto the next one. His description: the options get stuck,
 * will not follow the mouse, lag and freeze, on more than one lesson.
 *
 * WHAT WAS WRONG, read at the line and proved here in a real browser with REAL
 * mouse and touch input (Chrome's own input pipeline, not synthetic events):
 *   (A) THE COPY ONLY EVER LEFT ON ONE SIGNAL. The floating copy of a line was
 *       removed only when "the button was let go" reached that exact line. When
 *       that signal never arrives — the window loses focus mid-drag, a second
 *       finger lands on a touchscreen, the line is redrawn under the pointer, the
 *       card changes — nothing else ever removed it. It sat on screen for the rest
 *       of the lesson and followed her from card to card, because it lived on the
 *       page itself rather than on the card.
 *   (B) THE ORDERING CARD'S COPY TRAILED THE POINTER. A later style rule gave the
 *       ordering block a 0.15 s movement animation, and the copy is an ordering
 *       block, so every position written to it was animated towards instead of
 *       jumped to: the copy chased the mouse. On a slow school machine that reads
 *       as lag and freezing.
 *   (C) A CLICK COULD BE EATEN. A finished drag sets "ignore the click that
 *       follows". When the drop redraws the line, that click never comes, the
 *       flag stays set, and her NEXT ordinary click on a line did nothing.
 *   (D) SCROLLING MID-DRAG MISSED THE DROP. The drop positions are measured once
 *       when the drag starts; scroll the page while holding and they are wrong,
 *       so a line released squarely on the program went back to the tray. And
 *       there was no way to reach a box below the screen edge while holding.
 *
 * EACH CHECK IS RUN ON EVERY DRAG CARD IN EVERY LESSON (coverage is derived from
 * the content tree, never listed by hand), and the CONTROLS run the same checks
 * against the engine that was live when she sent the photo — Version 69, pinned
 * at BASE_REF — where they must FAIL (DFM 196).
 *
 *   node qa-drag-ends.js            (all cards, plus controls)
 *   node qa-drag-ends.js --quick    (one card per engine, plus controls)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');

const BASE_REF = 'fd134dd';          /* Version 69 — live when Orla sent the photo. PINNED. */
const REPO = path.resolve(__dirname, '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const APPJS = path.join(REPO, 'ks3-dt', 'platform', 'app.js');
const SKULPT = path.join(REPO, 'ks3-dt', 'platform', 'assets', 'vendor', 'skulpt');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const QUICK = process.argv.includes('--quick');

let failures = 0;
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};
const note = (m) => console.log('  ....  ' + m);

const SEL = {
  parsons: { tray: '#host .pt-list', item: '.parsons-block', prog: '#host .pp-list' },
  pyrun: { tray: '#host .pyt-list', item: '.pyrun-line', prog: '#host .pyp-list' },
  vault: { tray: '#host .vault-tray', item: '.vault-file', prog: '#host .vault-folder' }
};

/* ---- coverage: every drag card, derived from the content tree ---------- */
function allCases() {
  const out = [];
  for (const y of ['j1', 'j2', 'j3']) {
    const d = path.join(SRC, y, 'lessons');
    for (const f of fs.readdirSync(d).filter(f => /^j\d-\d\d\.json$/.test(f)).sort()) {
      const L = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
      for (const c of (L.chunks || [])) {
        if (!SEL[c.engine]) continue;
        if (c.engine === 'pyrun') {
          (c.config.builds || []).forEach((b, i) => out.push({
            label: f.replace('.json', '') + ' › ' + c.id + ' build ' + (i + 1), engine: 'pyrun',
            chunk: Object.assign({}, c, { config: Object.assign({}, c.config, { builds: [b] }) })
          }));
        } else out.push({ label: f.replace('.json', '') + ' › ' + c.id, engine: c.engine, chunk: c });
      }
    }
  }
  return out;
}

async function makePage(browser, engineSrc, vp, styleSrc) {
  const ctx = await browser.newContext({ viewport: vp || { width: 1280, height: 860 }, hasTouch: true });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto('about:blank');
  await pg.addStyleTag({ content: styleSrc });
  await pg.evaluate(() => {
    window.App = {
      esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      asset: p => p,
      armButton: (b, fn) => { if (b) b.onclick = fn; },
      toast: () => {},
      state: { pairing: 0 }
    };
  });
  await pg.addScriptTag({ content: engineSrc });
  await pg.addScriptTag({ path: path.join(SKULPT, 'skulpt.min.js') });
  await pg.addScriptTag({ path: path.join(SKULPT, 'skulpt-stdlib.js') });
  await pg.evaluate(() => { if (window.PyRun) window.PyRun._p = Promise.resolve(true); });
  const cdp = await ctx.newCDPSession(pg);
  return { pg, errs, cdp, ctx };
}

/* mount one card, open it, and leave the drag surface on screen */
const MOUNT = `(async function (engine, chunk) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  document.body.innerHTML = '<div id="host" style="padding:24px"></div>';
  document.body.style.margin = '0';
  window.scrollTo(0, 0);
  var host = document.getElementById('host');
  window.Engines[engine].mount(host, chunk, {
    chunk: chunk, review: false, catchup: false, lesson: { id: 'qa' },
    call: function () { return Promise.resolve({ ok: true, salt: 'qa', check: {} }); },
    awardBadge: function () { return Promise.resolve({ ok: true }); },
    next: function () {}, saveEvent: function () { return Promise.resolve({ ok: true }); },
    markItem: function () { return Promise.resolve({ ok: true, correct: false }); }
  });
  await wait(200);
  var go = document.querySelector('#host .primary-btn, #host .dossier-cta');
  if (go && !go.disabled) { go.click(); await wait(400); }
  var job = document.querySelector('#host .pyrun-job');
  if (job) { job.click(); await wait(300); }
  return true;
})`;

/* everything the page could leave behind after a drag that did not end */
const LEFTOVERS = `(function () {
  var ghosts = document.querySelectorAll('body > .parsons-ghost, body > .pyrun-ghost, [data-drag-ghost]').length;
  var half = document.querySelectorAll('#host .parsons-block.dragging, #host .pyrun-line.dragging, #host .vault-file.dragging').length;
  var lifted = Array.prototype.filter.call(document.querySelectorAll('#host .vault-file'), function (n) {
    return /translate/.test(n.style.transform || '');
  }).length;
  return { ghosts: ghosts, half: half, lifted: lifted, total: ghosts + half + lifted };
})()`;

/* where a pupil takes hold of a line: on the line itself, never on its typing
   blank (a press there is typing, by design). The tray is shuffled, so the
   first line can start with a blank. Runs in the page. */
const PRESS_AT = `function (node) {
  var r = node.getBoundingClientRect(), y = Math.round(r.top + r.height / 2);
  for (var x = Math.round(r.left + 6); x < r.right - 4; x += 5) {
    var e = document.elementFromPoint(x, y);
    if (e && node.contains(e) && !/input|textarea/i.test(e.tagName)) return { x: x, y: y };
  }
  return { x: Math.round(r.left + Math.min(14, r.width / 4)), y: y };
}`;

/* a press point on the item that is NOT a typing blank */
async function itemPoints(pg, s, n) {
  return pg.evaluate(([tray, item, n, PRESS_AT]) => {
    var pressAt = new Function('return (' + PRESS_AT + ')')();
    var nodes = Array.prototype.slice.call(document.querySelectorAll(tray + ' ' + item));
    /* scroll ONCE (to the first line), then measure — scrolling to each line in
       turn would move the ones already measured */
    if (nodes[0]) nodes[0].scrollIntoView({ block: 'center' });
    return nodes.slice(0, n).map(function (node) {
      var r = node.getBoundingClientRect(), p = pressAt(node);
      return { x: p.x, y: p.y,
        hit: (function () { var e = document.elementFromPoint(p.x, p.y); return !e ? 'nothing' : node.contains(e) ? 'line>' + e.tagName + '.' + String(e.className).slice(0, 30) : (e.tagName + '.' + e.className).slice(0, 60); })(),
        left: r.left, top: r.top, cx: r.left + r.width / 2, cy: r.top + r.height / 2, text: (node.textContent || '').replace(/\s+/g, ' ').trim() };
    });
  }, [s.tray, s.item, n, PRESS_AT]);
}
const count = (pg, sel) => pg.evaluate(sel => document.querySelectorAll(sel).length, sel);
const frames = (pg, n) => pg.evaluate(n => new Promise(r => {
  var k = 0; (function f() { if (++k > n) r(); else requestAnimationFrame(f); })();
}), n || 2);
const mouse = (cdp, type, x, y, buttons, extra) => cdp.send('Input.dispatchMouseEvent', Object.assign({
  type, x, y, button: type === 'mouseMoved' ? (buttons ? 'left' : 'none') : 'left',
  buttons: buttons, clickCount: type === 'mouseMoved' ? 0 : 1, pointerType: 'mouse'
}, extra || {}));

async function release(pg, cdp) {
  await mouse(cdp, 'mouseReleased', 2, 2, 0).catch(() => {});
  await pg.waitForTimeout(450);
}

/* (1) THE COPY IS WHERE THE POINTER IS — measured two frames after one jump */
async function testFollows(P, C) {
  const { pg, cdp } = P; const s = SEL[C.engine];
  const [a] = await itemPoints(pg, s, 1);
  if (!a) return { skip: 'no line in the tray' };
  await mouse(cdp, 'mousePressed', a.x, a.y, 1);
  await mouse(cdp, 'mouseMoved', a.x + 20, a.y + 12, 1);
  await frames(pg, 2);
  const tx = a.x + 160, ty = a.y + 90;
  await mouse(cdp, 'mouseMoved', tx, ty, 1);
  await frames(pg, 2);
  const r = await pg.evaluate(([engine, tx, ty, ax, ay, al, at, itemSel, traySel]) => {
    var g = document.querySelector('body > .parsons-ghost, body > .pyrun-ghost, [data-drag-ghost]');
    var node = g;
    if (engine === 'vault') node = document.querySelector('#host .vault-file.dragging');
    if (!node) return { none: true };
    var b = node.getBoundingClientRect();
    var cs = getComputedStyle(node);
    /* where the copy's CENTRE should be: the line's centre carried by exactly
       the distance the pointer travelled (centres, so the vault's 6% lift-up
       scale is not counted as being off) */
    var ex = al + (tx - ax), ey = at + (ty - ay);
    b = { left: b.left + b.width / 2, top: b.top + b.height / 2 };
    var dur = 0;
    var props = cs.transitionProperty.split(','), durs = cs.transitionDuration.split(',');
    props.forEach(function (p, i) {
      p = p.trim();
      if (p === 'transform' || p === 'all') dur = Math.max(dur, parseFloat(durs[i % durs.length]) || 0);
    });
    return { off: Math.round(Math.hypot(b.left - ex, b.top - ey)), dur: dur };
  }, [C.engine, tx, ty, a.x, a.y, a.cx, a.cy, s.item, s.tray]);
  await mouse(cdp, 'mouseMoved', 4, 4, 1);
  await release(pg, cdp);
  const left = await pg.evaluate(LEFTOVERS);
  return Object.assign(r, { leftAfterNormal: left.total });
}

/* (2) A RELEASE THE PAGE NEVER SAW — the button comes up while the window is
   elsewhere (focus stolen, alt-tab, a notification). Chrome then reports the
   pointer moving with NO button held, and she presses somewhere else. */
async function testLostRelease(P, C) {
  const { pg, cdp } = P; const s = SEL[C.engine];
  const pts = await itemPoints(pg, s, 2);
  if (pts.length < 1) return { skip: 'no line in the tray' };
  const a = pts[0];
  await mouse(cdp, 'mousePressed', a.x, a.y, 1);
  await mouse(cdp, 'mouseMoved', a.x + 40, a.y + 30, 1);
  await mouse(cdp, 'mouseMoved', a.x + 90, a.y + 60, 1);
  await frames(pg, 2);
  const had = (await pg.evaluate(LEFTOVERS)).total;
  if (!had) {
    const now = await pg.evaluate(([x, y, tray, item]) => {
      var n = document.querySelector(tray + ' ' + item), e = document.elementFromPoint(x, y);
      var r = n && n.getBoundingClientRect();
      return { dis: n && (n.disabled + '/' + n.getAttribute('aria-disabled')), cls: n && n.className, top: r && Math.round(r.top), left: r && Math.round(r.left), at: e && (e.tagName + '.' + String(e.className).slice(0, 40)) };
    }, [a.x, a.y, s.tray, s.item]);
    console.log('      [diag] press ' + a.x + ',' + a.y + ' measured on ' + a.hit + ' top ' + Math.round(a.top) + ' · now ' + JSON.stringify(now));
  }
  /* the window loses focus, the button is let go out there */
  await pg.evaluate(() => { window.dispatchEvent(new Event('blur')); });
  await mouse(cdp, 'mouseMoved', a.x + 120, a.y + 80, 0);
  await mouse(cdp, 'mouseMoved', 30, 30, 0);
  await frames(pg, 3);
  await pg.waitForTimeout(450);
  const after = await pg.evaluate(LEFTOVERS);
  await release(pg, cdp);
  return { had, left: after.total, detail: after };
}

/* (3) THE CARD CHANGES UNDER A DRAG — the line is redrawn or the card replaced
   while the button is still down (the copy in Orla's photo crossed a card). */
async function testCardChange(P, C) {
  const { pg, cdp } = P; const s = SEL[C.engine];
  const [a] = await itemPoints(pg, s, 1);
  if (!a) return { skip: 'no line in the tray' };
  await mouse(cdp, 'mousePressed', a.x, a.y, 1);
  await mouse(cdp, 'mouseMoved', a.x + 40, a.y + 30, 1);
  await mouse(cdp, 'mouseMoved', a.x + 80, a.y + 50, 1);
  await frames(pg, 2);
  const had = (await pg.evaluate(LEFTOVERS)).total;
  /* what App.mountChunk does: empty the card host, mount the next card */
  await pg.evaluate(() => {
    var host = document.getElementById('host');
    host.innerHTML = '<div class="card"><p>next card</p></div>';
    if (window.DragKit && window.DragKit.sweep) window.DragKit.sweep();
  });
  await mouse(cdp, 'mouseMoved', a.x + 120, a.y + 70, 1);
  await mouse(cdp, 'mouseReleased', a.x + 120, a.y + 70, 0);
  await pg.waitForTimeout(450);
  const ghosts = await pg.evaluate(() =>
    document.querySelectorAll('body > .parsons-ghost, body > .pyrun-ghost, [data-drag-ghost]').length);
  return { had, left: ghosts };
}

/* (4) TWO FINGERS ON A TOUCHSCREEN — one line each, both lifted */
async function testTwoFingers(P, C) {
  const { pg, cdp } = P; const s = SEL[C.engine];
  const pts = await itemPoints(pg, s, 2);
  if (pts.length < 2) return { skip: 'fewer than two lines in the tray' };
  const [a, b] = pts;
  const T = (type, list) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: list });
  const p = (q, id, dx, dy) => ({ x: q.x + dx, y: q.y + dy, id, radiusX: 4, radiusY: 4, force: 1 });
  await T('touchStart', [p(a, 1, 0, 0)]);
  await T('touchMove', [p(a, 1, 30, 25)]);
  await T('touchMove', [p(a, 1, 60, 45)]);
  await T('touchStart', [p(a, 1, 60, 45), p(b, 2, 0, 0)]);
  await T('touchMove', [p(a, 1, 80, 60), p(b, 2, 30, 25)]);
  await T('touchMove', [p(a, 1, 100, 70), p(b, 2, 60, 45)]);
  await frames(pg, 2);
  await T('touchEnd', []);
  await frames(pg, 2);
  await pg.waitForTimeout(450);
  const after = await pg.evaluate(LEFTOVERS);
  return { left: after.total, detail: after };
}

/* (5) THE CLICK AFTER A DRAG — drag one line into the program, then click a
   second line in the tray: it must go in (click-to-add is how many of them work) */
async function testClickAfterDrag(P, C) {
  const { pg, cdp } = P; const s = SEL[C.engine];
  if (C.engine === 'vault') return { skip: 'the vault has no click-to-place' };
  const pts = await itemPoints(pg, s, 2);
  if (pts.length < 2) return { skip: 'fewer than two lines in the tray' };
  const placedBefore = await count(pg, s.prog + ' ' + s.item);
  const [a2] = await itemPoints(pg, s, 1);
  /* the program box where it is NOW (after the line was scrolled to) — its visible part */
  const pr = await pg.evaluate(sel => {
    var r = document.querySelector(sel).getBoundingClientRect();
    var top = Math.max(r.top, 0), bot = Math.min(r.bottom, innerHeight);
    return { x: r.left + r.width / 2, y: top + Math.min(30, (bot - top) / 2), vis: bot - top };
  }, s.prog);
  if (pr.vis < 24) return { skip: 'the program box is off screen while the line is on screen' };
  await mouse(cdp, 'mousePressed', a2.x, a2.y, 1);
  for (let k = 1; k <= 6; k++) {
    await mouse(cdp, 'mouseMoved', a2.x + (pr.x - a2.x) * k / 6, a2.y + (pr.y - a2.y) * k / 6, 1);
  }
  await frames(pg, 2);
  await mouse(cdp, 'mouseReleased', pr.x, pr.y, 0);
  await pg.waitForTimeout(250);
  const placedMid = await count(pg, s.prog + ' ' + s.item);
  const [b] = await itemPoints(pg, s, 1);
  if (!b) return { skip: 'nothing left in the tray to click' };
  await mouse(cdp, 'mousePressed', b.x, b.y, 1);
  await mouse(cdp, 'mouseReleased', b.x, b.y, 0);
  await pg.waitForTimeout(300);
  const placedAfter = await count(pg, s.prog + ' ' + s.item);
  return { dragged: placedMid > placedBefore, clicked: placedAfter > placedMid, placedBefore, placedMid, placedAfter };
}

/* (6) SCROLL WHILE HOLDING — wheel the page mid-drag, then release squarely on
   the program box where it now is: the line must land there */
async function testScrollMidDrag(P, C) {
  const { pg, cdp } = P; const s = SEL[C.engine];
  if (C.engine === 'vault') return { skip: 'vault drop is hit-tested live' };
  const tall = await pg.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  if (tall < 120) return { skip: 'the card fits the screen (nothing to scroll)' };
  await pg.evaluate(() => window.scrollTo(0, 0));
  const [a] = await itemPoints(pg, s, 1);
  if (!a) return { skip: 'no line in the tray' };
  const placedBefore = await count(pg, s.prog + ' ' + s.item);
  await mouse(cdp, 'mousePressed', a.x, a.y, 1);
  await mouse(cdp, 'mouseMoved', a.x + 30, a.y + 20, 1);
  await mouse(cdp, 'mouseMoved', a.x + 60, a.y + 40, 1);
  await frames(pg, 2);
  const y0 = await pg.evaluate(() => scrollY);
  /* wheel far enough to move things, not so far the program box leaves the screen */
  const room = await pg.evaluate(sel => Math.floor(document.querySelector(sel).getBoundingClientRect().bottom - 80), s.prog);
  const wheel = Math.min(260, room);
  if (wheel < 60) { await release(pg, cdp); return { skip: 'the program box is too near the top to scroll past' }; }
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: a.x + 60, y: a.y + 40, deltaX: 0, deltaY: wheel, buttons: 1, button: 'left', pointerType: 'mouse' });
  await pg.waitForTimeout(350);
  await frames(pg, 2);
  const y1 = await pg.evaluate(() => scrollY);
  const pr = await pg.evaluate(sel => {
    var r = document.querySelector(sel).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: Math.max(r.top + 12, Math.min(r.bottom - 12, innerHeight - 60)), top: r.top, bottom: r.bottom };
  }, s.prog);
  if (pr.bottom < 0 || pr.top > (await pg.evaluate(() => innerHeight))) {
    await release(pg, cdp); return { skip: 'program box not on screen after the scroll' };
  }
  for (let k = 1; k <= 5; k++) await mouse(cdp, 'mouseMoved', a.x + 60 + (pr.x - a.x - 60) * k / 5, a.y + 40 + (pr.y - a.y - 40) * k / 5, 1);
  await frames(pg, 2);
  await mouse(cdp, 'mouseReleased', pr.x, pr.y, 0);
  await pg.waitForTimeout(300);
  const placedAfter = await count(pg, s.prog + ' ' + s.item);
  return { scrolled: y1 - y0, landed: placedAfter > placedBefore };
}

/* (7) HOLD AT THE BOTTOM EDGE — the page must carry her down to a box below */
async function testEdgeScroll(P, C) {
  const { pg, cdp } = P; const s = SEL[C.engine];
  const tall = await pg.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  if (tall < 120) return { skip: 'the card fits the screen (nothing to scroll)' };
  await pg.evaluate(() => window.scrollTo(0, 0));
  /* the line near the TOP of the screen, so there is page left below to carry her to */
  const a = await pg.evaluate(([tray, item, PRESS_AT]) => {
    var n = document.querySelector(tray + ' ' + item);
    if (!n) return null;
    n.scrollIntoView({ block: 'start' }); window.scrollBy(0, -40);
    return (new Function('return (' + PRESS_AT + ')')())(n);
  }, [s.tray, s.item, PRESS_AT]);
  if (!a) return { skip: 'no line in the tray' };
  const H = await pg.evaluate(() => innerHeight);
  const y0 = await pg.evaluate(() => scrollY);
  const below = await pg.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY);
  if (below < 40) return { skip: 'the line sits in the last screen of the card (nothing below it)' };
  await mouse(cdp, 'mousePressed', a.x, a.y, 1);
  for (let k = 1; k <= 6; k++) await mouse(cdp, 'mouseMoved', a.x + 20, a.y + (H - 8 - a.y) * k / 6, 1);
  await pg.waitForTimeout(900);
  const y1 = await pg.evaluate(() => scrollY);
  await mouse(cdp, 'mouseMoved', 40, H / 2, 1);
  await release(pg, cdp);
  return { scrolled: y1 - y0, below };
}

async function runCase(browser, src, C, which) {
  const [engineSrc, styleSrc] = src;
  const vp = (which === 'scroll' || which === 'edge') ? { width: 1280, height: 520 } : null;
  const P = await makePage(browser, engineSrc, vp, styleSrc);
  try {
    await P.pg.evaluate(([m, e, c]) => (new Function('return (' + m + ')')())(e, c), [MOUNT, C.engine, C.chunk]);
    const fn = { follows: testFollows, lost: testLostRelease, card: testCardChange, fingers: testTwoFingers,
      click: testClickAfterDrag, scroll: testScrollMidDrag, edge: testEdgeScroll }[which];
    const r = await fn(P, C);
    r.errs = P.errs.slice();
    return r;
  } finally { await P.ctx.close(); }
}

(async () => {
  console.log('qa-drag-ends — every drag ends, however it ends; the block stays under the pointer\n');
  const now = [fs.readFileSync(ENGINES, 'utf8'), fs.readFileSync(STYLE, 'utf8')];
  let before = null;
  try {
    const show = f => execFileSync('git', ['-C', REPO, 'show', BASE_REF + ':ks3-dt/platform/' + f],
      { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
    before = [show('engines.js'), show('style.css')];
  } catch (e) { /* reported below */ }
  check(!!before, 'the pinned base ' + BASE_REF + ' (Version 69) is readable out of git');

  /* the card change in the real app: mountChunk must sweep any copy left on the page */
  const app = fs.readFileSync(APPJS, 'utf8');
  const mc = app.slice(app.indexOf('function mountChunk'), app.indexOf('function mountChunk') + 1600);
  check(/DragKit[\s\S]{0,40}sweep\(/.test(mc), 'App.mountChunk sweeps every drag copy off the page when a card opens');

  let cases = allCases();
  const byEngine = {};
  cases.forEach(c => { byEngine[c.engine] = (byEngine[c.engine] || 0) + 1; });
  note('drag cards found in the content tree: ' + cases.length + '  ' + JSON.stringify(byEngine));
  const REP = {
    parsons: cases.find(c => /j2-03 › training-2/.test(c.label)),
    pyrun: cases.find(c => /j2-03 › training-3 build 1/.test(c.label)),
    vault: cases.find(c => c.engine === 'vault')
  };
  if (QUICK) cases = Object.values(REP);
  const ONLY = (process.argv.find(x => x.startsWith('--only=')) || '').slice(7);
  if (ONLY) cases = cases.filter(C => C.label.includes(ONLY));

  const browser = await chromium.launch({ headless: true });
  const ALL = ['follows', 'lost', 'card', 'fingers', 'click', 'scroll', 'edge'];
  try {
    for (const C of cases) {
      console.log('\n=== ' + C.engine + ' — ' + C.label + ' ===');
      const res = {};
      for (const w of ALL) res[w] = await runCase(browser, now, C, w);
      const errs = [].concat(...ALL.map(w => res[w].errs || []));
      const f = res.follows;
      if (f.skip || f.none) { note('no draggable line on this card (' + (f.skip || 'no copy appeared') + ') — typing-only build'); continue; }
      check(f.off <= 2, '(1) the dragged copy sits exactly under the pointer two frames after a jump  [' + f.off + ' px off]');
      check(f.dur === 0, '(1) the copy has no movement animation while dragged  [transform transition ' + f.dur + ' s]');
      check(f.leftAfterNormal === 0, '(1) an ordinary drag leaves nothing behind  [' + f.leftAfterNormal + ']');
      const L = res.lost;
      if (!L.skip) check(L.had > 0 && L.left === 0, '(2) a release the page never saw: nothing left stuck  [' + L.left + ' left, ' + JSON.stringify(L.detail) + ']');
      const K = res.card;
      if (!K.skip) check(K.had > 0 && K.left === 0, '(3) the card changes mid-drag: no copy survives onto the next card  [' + K.left + ' left]');
      const T = res.fingers;
      if (T.skip) note('(4) ' + T.skip); else check(T.left === 0, '(4) two fingers on a touchscreen: nothing left stuck  [' + T.left + ' left, ' + JSON.stringify(T.detail) + ']');
      const Q = res.click;
      if (Q.skip) note('(5) ' + Q.skip);
      else check(Q.dragged && Q.clicked, '(5) after a drag, the next click on a line still places it  [drag ' + (Q.dragged ? 'landed' : 'MISSED') + ', click ' + (Q.clicked ? 'placed' : 'IGNORED') + ']');
      const S = res.scroll;
      if (S.skip) note('(6) ' + S.skip);
      else check(S.landed, '(6) scroll mid-drag, release on the program: the line lands  [scrolled ' + S.scrolled + ' px, ' + (S.landed ? 'landed' : 'MISSED') + ']');
      const E = res.edge;
      if (E.skip) note('(7) ' + E.skip);
      else check(E.scrolled >= Math.min(E.below, 120) - 2, '(7) holding a line at the bottom edge carries the page down  [' + E.scrolled + ' of ' + E.below + ' px below]');
      check(errs.length === 0, 'no page errors on this card' + (errs.length ? '  [' + errs.slice(0, 2).join(' | ') + ']' : ''));
    }

    /* THE CONTROLS: the same checks against Version 69, where they must fail */
    if (before) {
      console.log('\n=== CONTROLS — the same checks against Version 69 (' + BASE_REF + ') ===');
      const P = REP.parsons, Y = REP.pyrun, V = REP.vault;
      const pf = await runCase(browser, before, P, 'follows');
      control(pf.dur > 0 && pf.off > 2, 'V69 ordering copy trails the pointer  [' + pf.off + ' px off, transition ' + pf.dur + ' s]');
      for (const C of [P, Y, V]) {
        const l = await runCase(browser, before, C, 'lost');
        control(l.left > 0, 'V69 ' + C.engine + ': a release the page never saw leaves ' + l.left + ' thing(s) stuck ' + JSON.stringify(l.detail));
      }
      for (const C of [P, Y]) {
        const k = await runCase(browser, before, C, 'card');
        control(k.left > 0, 'V69 ' + C.engine + ': a card change mid-drag carries ' + k.left + ' copy/copies onto the next card');
        const t = await runCase(browser, before, C, 'fingers');
        control(t.left > 0, 'V69 ' + C.engine + ': two fingers leave ' + t.left + ' thing(s) stuck ' + JSON.stringify(t.detail));
      }
      for (const C of [P, Y]) {
        const q = await runCase(browser, before, C, 'click');
        control(q.dragged && !q.clicked, 'V69 ' + C.engine + ': after a drag, her next click on a line is IGNORED');
        const sc = await runCase(browser, before, C, 'scroll');
        if (sc.skip) note('V69 ' + C.engine + ' scroll: ' + sc.skip);
        else control(!sc.landed, 'V69 ' + C.engine + ': scrolled ' + sc.scrolled + ' px mid-drag, released on the program — the line MISSED');
        const ed = await runCase(browser, before, C, 'edge');
        control(!(ed.scrolled > 0), 'V69 ' + C.engine + ': holding a line at the bottom edge scrolls nothing  [' + ed.scrolled + ' px]');
      }
    }
  } finally {
    await browser.close();
  }
  console.log('\n' + (failures ? 'qa-drag-ends: ' + failures + ' FAILURE(S)' : 'qa-drag-ends: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();
