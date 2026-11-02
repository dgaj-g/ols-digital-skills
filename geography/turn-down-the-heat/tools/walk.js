#!/usr/bin/env node
/* ============================================================
   WALK — plays Turn Down the Heat from the start page to the end page
   with REAL input (Puppeteer's mouse, the same path a hand takes):
   every drag is a real press-move-release, every answer a real click.
   It gets each right answer from content.js (test-only), never from the page.

   Run (from this folder's parent):
     NODE_PATH=$(npm root -g) node tools/walk.js
     NODE_PATH=$(npm root -g) node tools/walk.js --width 375 --height 667
     NODE_PATH=$(npm root -g) node tools/walk.js --url http://localhost:8099/geography/turn-down-the-heat/
     NODE_PATH=$(npm root -g) node tools/walk.js --control   # removes one drop zone; the walk MUST fail

   Passes only if: no console errors, every task completes, Part 7 scores 135 out of 135,
   the end page shows seven parts of three stars, and the poster thumbnail was saved.
   Exits non-zero on any failure (or, with --control, if the walk does NOT fail).
   ============================================================ */
const puppeteer = require('puppeteer');
const path = require('path');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const CONTROL = argv.includes('--control');
const CONTROL_SHOW = argv.includes('--control-show'); // forces every Show-answers button visible: the early-show check must catch it
/* --scan: the giveaway judge's mode. Watches the whole page for answers leaking into the DOM and
   records where the right option sits in every question (it must move about). */
const SCAN = argv.includes('--scan');
/* Build checks: --extras (reload mid-part resumes; Show answers after two wrong Checks on p4-move, capped at 1 star; every finished part reopens from the stage bar), --reduced (prefers-reduced-motion), --nostorage (localStorage throws, as in some private windows). */
const EXTRAS = argv.includes('--extras'), REDUCED = argv.includes('--reduced'), NOSTORE = argv.includes('--nostorage');
const positions = [];
/* --shots <dir>: screenshot each task as she first meets it, plus the start, run result and end page (for the own look). */
const SHOTS = opt('--shots', null);
let shotN = 0;
const W = +opt('--width', 1536), H = +opt('--height', 864);
const local = path.resolve(__dirname, '../index.html').split('/').map(encodeURIComponent).join('/');
const BASE = opt('--url', 'file://' + local);
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'nointro';
const wait = ms => new Promise(r => setTimeout(r, ms));
const fails = [], errors = [];
function fail(m) { fails.push(m); console.log('  FAIL', m); }
class Stop extends Error {}

(async () => {
  const b = await puppeteer.launch({ headless: 'shell', args: ['--allow-file-access-from-files'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: W, height: H, isMobile: W < 768, hasTouch: W < 768 });
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  pg.on('pageerror', e => errors.push(e.message));
  if (REDUCED) await pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (NOSTORE) await pg.evaluateOnNewDocument(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } }); });
  const cdp = await pg.target().createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'deny' });
  if (CONTROL_SHOW) await pg.evaluateOnNewDocument(() => document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style'); s.textContent = '.check-row .btn.ghost { display: inline-flex !important; }'; document.head.appendChild(s);
  }));
  if (SCAN) await pg.evaluateOnNewDocument(() => {
    window.__leaks = [];
    const SEL = '[data-answer],[data-ok],[data-right],[data-correct],[data-solution]';
    const look = n => { if (n.nodeType !== 1) return; [n.matches(SEL) ? n : null, ...n.querySelectorAll(SEL)].filter(Boolean)
      .forEach(e => window.__leaks.push(e.tagName + ' ' + (e.textContent || '').trim().slice(0, 40))); };
    new MutationObserver(ms => ms.forEach(m => m.type === 'attributes' ? look(m.target) : m.addedNodes.forEach(look)))
      .observe(document, { subtree: true, childList: true, attributes: true });
  });
  await pg.goto(URL, { waitUntil: 'load' });
  await pg.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await pg.reload({ waitUntil: 'load' });
  await wait(600);
  const C = await pg.evaluate(() => JSON.parse(JSON.stringify(TDTH_APP.C)));

  /* Every question in the content, keyed by its wording, gives the wording of its right option. */
  const right = {};
  (function walkObj(o) {
    if (!o || typeof o !== 'object') return;
    if (typeof o.q === 'string' && Array.isArray(o.opts) && o.opts[0] && typeof o.opts[0] === 'object' && 't' in o.opts[0]) {
      const r = o.opts.find(x => x.ok); if (r) right[o.q] = r.t;
    }
    Object.values(o).forEach(walkObj);
  })(C);

  async function centre(h) {
    await h.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await wait(120);
    const bb = await h.boundingBox();
    if (!bb) throw new Stop('element has no box');
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  }
  async function click(h, what) {
    if (!h) throw new Stop('could not find ' + what);
    const c = await centre(h);
    await pg.mouse.click(c.x, c.y);
    await wait(180);
  }
  /* The first element under scope matching sel whose own text (or a child's) equals text. */
  async function byText(scope, sel, text) {
    const hs = await scope.$$(sel);
    for (const h of hs) {
      const ok = await h.evaluate((e, t) => e.textContent.trim() === t || [].some.call(e.children, c => c.textContent.trim() === t), text);
      if (ok) return h;
    }
    return null;
  }
  async function card(id) { const h = await pg.$('#task-' + id); if (!h) throw new Stop('no card for ' + id); return h; }
  async function isDone(id) { return pg.evaluate(id => !!(TDTH_APP.S.tasks[id] && TDTH_APP.S.tasks[id].done), id); }

  async function answerMcqs(scope) {
    for (let guard = 0; guard < 12; guard++) {
      const blocks = await scope.$$('.mcq');
      let acted = false;
      for (const bl of blocks) {
        const open = await bl.evaluate(e => !e.querySelector('.why') && !!e.querySelector('.opts button:not(:disabled)'));
        if (!open) continue;
        const q = await bl.$eval('.q', e => e.textContent.trim());
        if (!right[q]) throw new Stop('no right answer known for: ' + q);
        const btns = await bl.$$('.opts button');
        let hit = null;
        for (const h of btns) if (await h.evaluate((e, t) => e.children[1] && e.children[1].textContent.trim() === t, right[q])) hit = h;
        if (SCAN) positions.push(btns.indexOf(hit) + '/' + btns.length);
        await click(hit, 'right option for ' + q);
        acted = true;
        await wait(250);
      }
      if (!acted) return;
    }
  }

  /* Press, travel in steps, release. With a zone given, every step re-reads where the zone is now
     (as an eye follows a target if the page scrolls), and the release lands on it. */
  async function realDrag(from, to, zone) {
    const zb0 = zone && await zone.boundingBox(), off = zb0 && { x: to.x - zb0.x, y: to.y - zb0.y };
    const aim = async () => { if (!zone) return to; const b = await zone.boundingBox(); return { x: b.x + off.x, y: b.y + off.y }; };
    await pg.mouse.move(from.x, from.y);
    await pg.mouse.down();
    for (let i = 1; i <= 18; i++) { const t = await aim(); await pg.mouse.move(from.x + (t.x - from.x) * i / 18, from.y + (t.y - from.y) * i / 18); await wait(8); }
    await wait(60);
    const t = await aim(); await pg.mouse.move(t.x, t.y); await wait(40);
    await pg.mouse.up();
    await wait(220);
  }
  async function inView(h) { return h.evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0; }); }

  async function dragTask(t, cd) {
    for (const it of t.items) {
      if (it.zone === null) continue;   /* a spare card: it stays in the tray */
      const zone = await cd.$('.zone[data-zone="' + it.zone + '"]');
      if (!zone) throw new Stop(t.id + ': drop zone ' + it.zone + ' is missing');
      const chip = await cd.$('.chip[data-item="' + it.id + '"]');
      if (!chip) throw new Stop(t.id + ': chip ' + it.id + ' is missing');
      await zone.evaluate(e => e.scrollIntoView({ block: 'center' }));
      await wait(150);
      if (!(await inView(chip))) { await chip.evaluate(e => e.scrollIntoView({ block: 'nearest' })); await wait(150); }
      if (!(await inView(zone))) { await zone.evaluate(e => e.scrollIntoView({ block: 'nearest' })); await wait(150); }
      /* Aim where a hand would: at a part of the zone that is showing, not hidden under the sticky tray or header. */
      let to = null;
      for (const at of [null, 0.62, 0.3, 0.8]) {
        if (at !== null) { await zone.evaluate((e, f) => scrollBy(0, e.getBoundingClientRect().top - innerHeight * f), at); await wait(150); }
        to = await zone.evaluate(e => {
          const r = e.getBoundingClientRect(), x = r.left + r.width / 2;
          for (let y = Math.max(r.top + 8, 0); y < Math.min(r.bottom - 4, innerHeight); y += 12) {
            const hit = document.elementFromPoint(x, y);
            if (hit && hit.closest('[data-zone]') === e) return { x, y };
          }
          return null;
        });
        if (to) break;
      }
      if (!to) throw new Stop(t.id + ': zone ' + it.zone + ' never shows on screen clear of the tray');
      /* Scroll the tray itself (never the page, which would move the zone) until the card shows, as she would with a thumb. */
      const from = await chip.evaluate(e => {
        const tray = e.closest('.tray'), hit = (x, y) => { const h = document.elementFromPoint(x, y); return h && h.closest('.chip') === e; };
        for (let n = 0; n < 2; n++) {
          const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 20);
          if (hit(x, y)) return { x, y };
          if (tray) { const tr = tray.getBoundingClientRect(); tray.scrollTop += r.top - tr.top - 12; }
        }
        return null;
      });
      if (!from) throw new Stop(t.id + ': card ' + it.id + ' cannot be reached on screen');
      if (!(await zone.evaluate((e, p) => { const h = document.elementFromPoint(p.x, p.y); return !!h && h.closest('[data-zone]') === e; }, to))) throw new Stop(t.id + ': zone ' + it.zone + ' moved while the card was found');
      const cb = await chip.boundingBox(), zb = await zone.boundingBox();
      await realDrag(from, to, zone);
      const landed = await cd.evaluate((e, z, i) => !!e.querySelector('[data-zone="' + z + '"] [data-item="' + i + '"]'), it.zone, it.id);
      if (!landed) {
        const why = await pg.evaluate((x, y, id) => { const nm = e => e.tagName.toLowerCase() + '.' + String(e.className).split(' ').join('.'); const tr = document.querySelector('#task-' + id + ' .tray').getBoundingClientRect(), hd = document.querySelector('header.top').getBoundingClientRect(); return document.elementsFromPoint(x, y).slice(0, 3).map(nm).join(' > ') + '; tray ' + Math.round(tr.top) + '-' + Math.round(tr.bottom) + ', header ends ' + Math.round(hd.bottom); }, to.x, to.y, t.id);
        throw new Stop(t.id + ': chip ' + it.id + ' did not land in ' + it.zone + ' under a real drag (chip at y ' + Math.round(cb.y) + ', zone at y ' + Math.round(zb.y) + ', drop point hits ' + why + ')');
      }
    }
    await click(await byText(cd, '.check-row button', C.ui.check), t.id + ' Check');
    await wait(400);
    if (t.qs) await answerMcqs(cd);
  }

  async function doTask(t) {
    const cd = await card(t.id);
    await shot(cd, t.id);
    const early = await cd.evaluate((e, txt) => [...e.querySelectorAll('.check-row button')].filter(b => b.offsetParent !== null && b.textContent.trim() === txt).length, C.ui.showMe);
    if (early) fail('LEAK: ' + t.id + ' shows "' + C.ui.showMe + '" before two wrong Checks');
    if (t.type === 'mcq' || t.type === 'globe') await answerMcqs(cd);
    else if (t.type === 'drag') {
      if (CONTROL && t.id === 'p1-timeline') await cd.evaluate(e => { const z = e.querySelector('.zone[data-zone="z1997"]'); if (z) z.remove(); });
      await dragTask(t, cd);
    } else if (t.type === 'binary') {
      for (const it of t.items) {
        const row = await byText(cd, '.bin-row', it.t);
        if (!row) throw new Stop(t.id + ': no row for ' + it.t);
        await click((await row.$$('.seg button'))[it.ok], t.id + ' choice');
      }
      await click(await byText(cd, '.check-row button', C.ui.check), t.id + ' Check');
      if (t.qs) await answerMcqs(cd);
    } else if (t.type === 'multi') {
      if (EXTRAS && t.id === 'p4-move') {
        const bad = t.opts.find(o => !o.ok);
        await click(await byText(cd, '.multi button', bad.t), 'wrong tick');
        for (let i = 0; i < 2; i++) { await click(await byText(cd, '.check-row button', i ? C.ui.checkAgain : C.ui.check), 'wrong Check ' + (i + 1)); await wait(300); }
        const sm = await byText(cd, '.check-row button', C.ui.showMe);
        const vis = sm && await sm.evaluate(b => b.offsetParent !== null);
        if (!vis) throw new Stop('p4-move: "' + C.ui.showMe + '" not shown after two wrong Checks');
        await click(sm, 'show answers'); await wait(400);
        const st = await pg.evaluate(() => TDTH_APP.S.tasks['p4-move']);
        if (!st || !st.done || st.stars !== 1) fail('p4-move: Show answers did not finish the task at 1 star (' + JSON.stringify(st) + ')');
        else console.log('  ok show answers after two wrong Checks, 1 star');
        return;
      }
      for (const op of t.opts) if (op.ok) await click(await byText(cd, '.multi button', op.t), op.t);
      await click(await byText(cd, '.check-row button', C.ui.check), t.id + ' Check');
      if (t.qs) await answerMcqs(cd);
    } else if (t.type === 'machine') {
      for (const h of await cd.$$('.stops button')) await click(h, 'machine stop');
    } else if (t.type === 'footprint') {
      for (const q of t.qs) {
        let hi = 0; q.opts.forEach((o, i) => { if (o[1] > q.opts[hi][1]) hi = i; });
        const pills = await cd.$('[aria-labelledby="fq-' + q.id + '"]');
        await click((await pills.$$('button'))[hi], 'footprint ' + q.id);
      }
    } else if (t.type === 'swaps') {
      for (let n = 0; n < 3; n++) {
        const free = await cd.$$('.swaps button[aria-pressed="false"]:not(:disabled)');
        if (!free.length) break;
        await click(free[0], 'a swap');
      }
      const line = await cd.$eval('.swap-result', e => e.textContent);
      if (!line) fail('swaps: no before-and-after line');
    } else if (t.type === 'run') {
      const plan = [['solar', 'homes', 'forests'], ['evs', 'rainforest', 'labmeat'], ['floodhomes', 'drycrops', 'capture']];
      for (let r = 0; r < 3; r++) {
        for (const id of plan[r]) await click(await byText(cd, '.card-btn', t.deck[id][0]), 'card ' + id);
        await click(await cd.$('.lock-row .btn'), 'Lock in');
        await wait(2300);
        const ev = await cd.$('.events');
        if (!ev) throw new Stop('run: no events after round ' + (r + 1));
        await click(await cd.$('.lock-row .btn'), r < 2 ? 'next round' : 'see result');
        await wait(r < 2 ? 300 : 3800);
      }
      const v = await cd.$('.verdict'); await shot(await cd.$('.results') || v, 'run-result');
      if (!v) throw new Stop('run: no verdict');
      console.log('  run verdict:', (await v.evaluate(e => e.textContent)).slice(0, 80));
    } else if (t.type === 'poster') {
      await click((await cd.$$('.slogans button'))[1], 'slogan');
      const nm = await cd.$('#poster-name');
      await click(nm, 'name box'); await pg.keyboard.type('Aoife', { delay: 20 });
      await click(await byText(cd, '.lock-row .btn', C.ui.save), 'Save picture');
      await wait(400);
      const img = await pg.evaluate(() => TDTH_APP.S.poster && TDTH_APP.S.poster.img && TDTH_APP.S.poster.img.length);
      if (!img) fail('poster: no thumbnail saved');
    } else if (t.type === 'final') {
      const F = C.final;
      for (let i = 0; i < F.qs.length; i++) {
        const q = F.qs[i], fc = await pg.$('#final .fq-card'), type = q.type || 'mcq';
        if (type === 'mcq' || type === 'chart') await answerMcqs(fc);
        else if (type === 'tf') {
          const bl = await fc.$('.mcq'), want = F.tf[q.ok ? 0 : 1];
          let hit = null; for (const h of await bl.$$('.opts button')) if (await h.evaluate((e, w) => e.children[1].textContent.trim() === w, want)) hit = h;
          await click(hit, 'true or false');
        } else if (type === 'order') {
          for (const s of q.steps) await click(await byText(fc, '.order-picks button', s), 'step ' + s.slice(0, 20));
          await click(await byText(fc, '.check-row button', C.ui.check), 'order Check');
        } else if (type === 'match') {
          for (const it of q.items) {
            const row = await byText(fc, '.match-row', it[0]);
            if (!row) throw new Stop('final match: no row ' + it[0]);
            await click((await row.$$('.seg button'))[it[1]], 'match ' + it[0]);
          }
          await click(await byText(fc, '.check-row button', C.ui.check), 'match Check');
        }
        const ok = await pg.evaluate(id => TDTH_APP.S.final.answers[id] && TDTH_APP.S.final.answers[id].ok, q.id);
        if (!ok) fail('final ' + q.id + ' was not marked right');
        await click(await fc.$('.lock-row .btn:not([hidden])'), 'Next');
        await wait(350);
      }
      const sc = await pg.$eval('#score', e => e.textContent).catch(() => '');
      await wait(1400);
      const want = C.final.score.replace('{s}', 135).replace('{m}', 135);
      const got = await pg.$eval('#final #score', e => e.textContent);
      if (got !== want) fail('final score shows "' + got + '", wanted "' + want + '"');
    }
    await wait(300);
    if (!(await isDone(t.id))) throw new Stop(t.id + ' did not complete');
    console.log('  ok', t.id);
  }

  async function shot(h, name) {
    if (!SHOTS) return;
    if (h) await h.evaluate(e => e.scrollIntoView({ block: 'start' }));
    await wait(h ? 900 : 300);
    await pg.screenshot({ path: path.join(SHOTS, W + 'x' + H + '-' + String(++shotN).padStart(2, '0') + '-' + name + '.png') });
  }
  try {
    if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await wait(1500); await shot(null, 'start'); }
    await click(await pg.$('.go-row .btn'), 'start button');
    for (const p of C.parts) {
      const view = await pg.evaluate(() => TDTH_APP.S.view);
      if (view !== p.k) throw new Stop('expected to be on part ' + p.k + ', on view ' + view);
      console.log('part', p.k);
      if (p.quick) await answerMcqs(await pg.$('#quick-' + p.k));
      for (const t of p.tasks) {
        await doTask(t);
        if (EXTRAS && !NOSTORE && t.id === p.tasks[0].id && p.k === 3) {
          await pg.reload({ waitUntil: 'load' }); await wait(800);
          const r = await pg.evaluate(id => ({ view: TDTH_APP.S.view, done: !!(TDTH_APP.S.tasks[id] || {}).done }), t.id);
          if (r.view !== 3 || !r.done) fail('reload mid-part 3 did not resume (' + JSON.stringify(r) + ')'); else console.log('  ok reload mid-part resumes');
        }
      }
      const pd = await pg.$('#partdone-' + p.k);
      if (!pd) throw new Stop('no part-done card for part ' + p.k);
      await click(await pd.$('.btn.big'), 'next part');
      await wait(500);
    }
    await wait(800); await pg.evaluate(() => scrollTo(0, 0)); await shot(null, 'end');
    const end = await pg.evaluate(() => ({ view: TDTH_APP.S.view, stars: TDTH_APP.S.stars, cells: document.querySelectorAll('.end-stars > div').length, img: !!document.querySelector('.end-grid img') }));
    if (end.view !== 8) fail('did not reach the end page');
    if (end.cells !== 7) fail('end page shows ' + end.cells + ' parts, not 7');
    for (let k = 1; k <= 7; k++) if (end.stars[k] !== (EXTRAS && k === 4 ? 1 : 3)) fail('part ' + k + ' has ' + end.stars[k] + ' stars, not 3');
    if (!end.img) fail('end page has no poster');
    if (EXTRAS) {
      for (let k = 1; k <= 7; k++) {
        await click(await pg.$('#stagebar button[data-part="' + k + '"]'), 'reopen part ' + k); await wait(500);
        const v = await pg.evaluate(() => TDTH_APP.S.view);
        if (v !== k) fail('stage bar did not reopen part ' + k + ' (view ' + v + ')');
      }
      console.log('  ok every finished part reopens');
    }
  } catch (e) {
    if (e instanceof Stop) fail(e.message); else fail('crash: ' + e.message);
  }
  if (SCAN) {
    const leaks = await pg.evaluate(() => window.__leaks || []).catch(() => ['page gone']);
    leaks.slice(0, 8).forEach(l => fail('LEAK: an answer is in the page: ' + l));
    const firsts = positions.filter(p => p.startsWith('0/')).length;
    console.log('  scan: ' + positions.length + ' questions, right answer first in ' + firsts + ', leaks ' + leaks.length);
    if (positions.length < 10) fail('scan saw only ' + positions.length + ' questions');
    if (new Set(positions.map(p => p.split('/')[0])).size < 2) fail('LEAK: the right answer is always in the same place');
    if (firsts > positions.length * 0.6) fail('LEAK: the right answer is first in ' + firsts + ' of ' + positions.length + ' questions');
  }
  errors.forEach(m => fail('console: ' + m.slice(0, 200)));
  await b.close();
  const failed = fails.length > 0;
  if (CONTROL) {
    console.log(failed ? 'CONTROL OK: the walk failed with a drop zone removed, as it must.' : 'CONTROL BROKEN: the walk passed with a drop zone removed.');
    process.exit(failed ? 0 : 1);
  }
  console.log(failed ? 'WALK FAILED (' + fails.length + ')' : 'WALK PASSED at ' + W + 'x' + H);
  process.exit(failed ? 1 : 0);
})();
