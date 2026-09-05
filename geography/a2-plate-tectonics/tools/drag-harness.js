#!/usr/bin/env node
/* ============================================================
   REAL-INPUT DRAG HARNESS

   Why this exists
   ---------------
   Terra Mobilis shipped a drag engine that passed every scripted
   check and still did not work with a mouse. Synthetic
   `dispatchEvent(new PointerEvent(...))` never engages the
   browser's pointer-capture machinery, its hit-testing, or its
   native drag/selection behaviour — so a drag that dies under a
   real cursor looks perfectly healthy to a scripted test.

   This harness drives a REAL browser through the DevTools input
   pipeline (Puppeteer's mouse and touchscreen), which is the same
   path a human's hand takes. It exercises every drag activity in
   the atlas with both a mouse and a finger, and fails loudly.

   Run:
     node tools/drag-harness.js                 # starts its own server
     node tools/drag-harness.js --headful       # watch it happen
     node tools/drag-harness.js --url http://localhost:8099/geography/a2-plate-tectonics/

   Exits non-zero on any failure, so it can gate a build.
   ============================================================ */
'use strict';

const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');          // the activity folder
const REPO = path.resolve(ROOT, '..', '..');          // repo root (for ../../assets)
const ACTIVITY_PATH = '/' + path.relative(REPO, ROOT).split(path.sep).join('/') + '/';

const argv = process.argv.slice(2);
const HEADFUL = argv.includes('--headful');
const urlArg = argv.indexOf('--url');
const EXTERNAL_URL = urlArg >= 0 ? argv[urlArg + 1] : null;

let puppeteer;
try {
  puppeteer = require(path.join(
    require('child_process').execSync('npm root -g').toString().trim(), 'puppeteer'));
} catch (e) {
  console.error('\nThis harness needs puppeteer (installed globally on this Mac).');
  console.error('  npm i -g puppeteer\n');
  process.exit(2);
}

/* ---------- a tiny no-cache static server ---------- */

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };

function serve(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(rootDir, p);
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404).end('not found'); return; }
        res.writeHead(200, {
          'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-store'
        });
        res.end(buf);
      });
    });
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

/* ---------- assertions ---------- */

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (detail ? '  — ' + detail : ''));
}

/* ---------- the real drags ---------- */

/* A real mouse drag: press, several intermediate moves, release.
   The intermediate moves matter — a single jump does not reproduce the
   pointer-capture and hit-testing behaviour a human generates. */
async function mouseDrag(page, from, to, steps = 24) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  let worstDrift = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    await page.mouse.move(x, y);
    /* THE assertion that matters: is the thing the user grabbed actually
       under the cursor? Every CSS proxy (transition, position, transform)
       can look perfect while the element sits somewhere else entirely —
       which is what a fixed-position containing block does to it. */
    if (i % 6 === 0) worstDrift = Math.max(worstDrift, await pointerDrift(page, x, y));
  }
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
  return worstDrift;
}

/* How far is the dragged element's own box from the pointer, compared with
   where it was grabbed? Returns pixels of drift (0 = tracking perfectly). */
async function pointerDrift(page, x, y) {
  return page.evaluate((x, y) => {
    const c = document.querySelector('.chip-d.dragging');
    if (!c) return 0;
    const r = c.getBoundingClientRect();
    if (window.__grabOffset == null) {
      window.__grabOffset = { dx: x - (r.left + r.width / 2), dy: y - (r.top + r.height / 2) };
      return 0;
    }
    const g = window.__grabOffset;
    return Math.round(Math.hypot(
      x - (r.left + r.width / 2) - g.dx,
      y - (r.top + r.height / 2) - g.dy
    ));
  }, x, y);
}

/* A real touch drag through the same input pipeline. */
async function touchDrag(page, from, to, steps = 20) {
  const client = await page.target().createCDPSession();
  const pt = (x, y) => [{ x, y, radiusX: 12, radiusY: 12, force: 1 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from.x, from.y) });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: pt(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)
    });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

/* Find every drag activity on the current page, and for each one report a
   chip in the tray plus the CORRECT target for it, in viewport coordinates. */
async function surveyDragActivities(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.act').forEach((act, ai) => {
      const kind = act.querySelector('.cols') ? 'classify'
        : act.querySelector('.match-rows') ? 'match'
          : act.querySelector('.seq') ? 'sequence' : null;
      if (!kind) return;
      const chip = act.querySelector('.tray .chip-d');
      if (!chip) return;

      /* work out where this chip actually belongs */
      let target = null;
      const item = chip.__item || {};
      if (kind === 'classify') {
        target = [...act.querySelectorAll('.col-zone')].find((z) => z.dataset.col === item.col);
      } else if (kind === 'match') {
        target = [...act.querySelectorAll('.match-row')].find((r) => r.dataset.key === item.key);
      } else if (kind === 'sequence') {
        target = [...act.querySelectorAll('.seq-slot')].find((s) => Number(s.dataset.pos) === item.order);
      }
      if (!target) return;

      const c = chip.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      out.push({
        ai, kind, text: chip.textContent,
        from: { x: Math.round(c.left + c.width / 2), y: Math.round(c.top + c.height / 2) },
        to: { x: Math.round(t.left + t.width / 2), y: Math.round(t.top + t.height / 2) },
        onScreen: c.top > 60 && c.bottom < innerHeight && t.top > 60 && t.bottom < innerHeight
      });
    });
    return out;
  });
}

async function chipLanded(page, ai, kind) {
  return page.evaluate((ai, kind) => {
    const act = document.querySelectorAll('.act')[ai];
    const sel = kind === 'classify' ? '.col-zone' : kind === 'match' ? '.match-row' : '.seq-slot';
    const placed = [...act.querySelectorAll(sel + ' .chip-d')];
    return { placed: placed.length, texts: placed.map((c) => c.textContent) };
  }, ai, kind);
}

/* ---------- main ---------- */

(async () => {
  let server = null, base = EXTERNAL_URL;
  if (!base) {
    const s = await serve(REPO);
    server = s.server;
    base = 'http://localhost:' + s.port + ACTIVITY_PATH;
  }
  console.log('\nReal-input drag harness');
  console.log('  ' + base + '\n');

  const browser = await puppeteer.launch({
    headless: HEADFUL ? false : 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 2200 });
    page.on('pageerror', (e) => record('console: ' + e.message.slice(0, 70), false));

    /* Suppress the OLS intro overlay BEFORE any page script runs, on every
       navigation. It is full-screen, so if it is still up it swallows the
       pointerdown and the drag never starts — which is exactly what a broken
       drag looks like. (The key must match intro-loader.js's SESSION_KEY.) */
    await page.evaluateOnNewDocument(() => {
      try { sessionStorage.setItem('ols-intro-seen-v1', '1'); } catch (_) {}
    });

    /* every chapter that contains a drag activity */
    await page.goto(base, { waitUntil: 'networkidle0' });
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const chapters = await page.evaluate(() =>
      (window.OLS_A2PT_TOPICS[0].chapters || [])
        .filter((c) => (c.blocks || []).some((b) => ['match', 'sequence', 'classify'].includes(b.type)))
        .map((c) => ({ id: c.id, title: c.title })));

    console.log('Chapters with drag activities: ' + chapters.length + '\n');

    let totalDrags = 0;

    for (const ch of chapters) {
      console.log(ch.title);
      await page.goto(base + '#/' + 'ch/' + ch.id, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => new Promise((r) => setTimeout(r, 350)));

      /* belt and braces: nothing full-screen may be sitting over the page,
         or a failed drag would really be a blocked pointerdown */
      const blocked = await page.evaluate(() => {
        const o = document.querySelector('.ols-intro-overlay, .overlay');
        if (o) { o.remove(); return true; }
        return false;
      });
      if (blocked) record(ch.title + ' — an overlay was covering the page', false,
        'removed it so the drag could be tested, but find out why it was there');

      /* Static guard. Headless Chrome may not paint backdrop-filter, so the
         behavioural drift check can pass here and still fail on the teacher's
         actual machine. Check the CSS itself as well as the behaviour. */
      const badAncestors = await page.evaluate(() => {
        const found = [];
        document.querySelectorAll('.chip-d').forEach((chip) => {
          let n = chip.parentElement;
          while (n && n !== document.documentElement) {
            const s = getComputedStyle(n);
            const why = [];
            if (s.transform !== 'none') why.push('transform');
            if (s.filter !== 'none') why.push('filter');
            if (s.backdropFilter && s.backdropFilter !== 'none') why.push('backdrop-filter');
            if (s.perspective !== 'none') why.push('perspective');
            if (/paint|layout|strict|content/.test(s.contain || '')) why.push('contain');
            if (/transform|filter|perspective/.test(s.willChange || '')) why.push('will-change');
            if (why.length) {
              const id = (n.className || n.tagName) + ' [' + why.join(', ') + ']';
              if (!found.includes(id)) found.push(id);
            }
            n = n.parentElement;
          }
        });
        return found;
      });
      if (badAncestors.length) {
        record(ch.title + ' — no ancestor of a draggable chip creates a fixed-position containing block',
          false, badAncestors.join(' · ') +
          ' — this silently relocates the drag lift on a real GPU browser');
      }

      /* how many drag activities does this chapter have? */
      const count = await page.evaluate(() =>
        [...document.querySelectorAll('.act')]
          .filter((a) => a.querySelector('.cols, .match-rows, .seq')).length);

      for (let n = 0; n < count; n++) {
        /* bring the nth drag activity fully into view, then survey */
        await page.evaluate((n) => {
          const act = [...document.querySelectorAll('.act')]
            .filter((a) => a.querySelector('.cols, .match-rows, .seq'))[n];
          act.scrollIntoView({ block: 'center', behavior: 'instant' });
        }, n);
        await page.evaluate(() => new Promise((r) => setTimeout(r, 160)));

        const acts = await surveyDragActivities(page);
        const spec = acts.find((a) => a.onScreen);
        if (!spec) continue;

        for (const mode of ['mouse', 'touch']) {
          const before = await chipLanded(page, spec.ai, spec.kind);

          /* mid-drag style assertions, captured by a one-shot observer */
          await page.evaluate(() => {
            window.__dragProbe = null;
            const probe = () => {
              const c = document.querySelector('.chip-d.dragging');
              if (c && !window.__dragProbe) {
                const s = getComputedStyle(c);
                window.__dragProbe = {
                  transition: s.transitionDuration,
                  animation: s.animationName,
                  position: s.position,
                  bodyLocked: document.body.classList.contains('dragging-active')
                };
              }
              if (!window.__probeStop) requestAnimationFrame(probe);
            };
            window.__probeStop = false;
            requestAnimationFrame(probe);
          });

          const fresh = (await surveyDragActivities(page)).find((a) => a.ai === spec.ai);
          if (!fresh) break;

          await page.evaluate(() => { window.__grabOffset = null; });
          let drift = 0;
          if (mode === 'mouse') drift = await mouseDrag(page, fresh.from, fresh.to);
          else await touchDrag(page, fresh.from, fresh.to);

          await page.evaluate(() => { window.__probeStop = true; });
          await page.evaluate(() => new Promise((r) => setTimeout(r, 140)));

          const after = await chipLanded(page, spec.ai, spec.kind);
          const probe = await page.evaluate(() => window.__dragProbe);
          const label = ch.title + ' · ' + spec.kind + ' · ' + mode;

          totalDrags++;
          record(label + ' — chip lands in its target',
            after.placed > before.placed,
            after.placed > before.placed ? '"' + fresh.text + '"'
              : 'chip never left the tray (placed ' + before.placed + ' → ' + after.placed + ')');

          if (mode === 'mouse') {
            record(label + ' — the grabbed element stays under the cursor',
              drift <= 4, drift + 'px of drift' +
              (drift > 4 ? ' — the chip is not where the hand is. Check for a '
                + 'transform/filter/backdrop-filter on an ancestor: it becomes the '
                + 'containing block for position:fixed and moves the lift.' : ''));
          }

          if (probe) {
            record(label + ' — element follows the pointer (no transition/animation)',
              probe.transition === '0s' && probe.animation === 'none' && probe.position === 'fixed',
              'transition ' + probe.transition + ', animation ' + probe.animation +
              ', position ' + probe.position);
            record(label + ' — page text selection locked during the drag',
              probe.bodyLocked === true);
          } else {
            record(label + ' — drag actually started', false,
              'no element ever received the .dragging class');
          }

          const unlocked = await page.evaluate(() =>
            !document.body.classList.contains('dragging-active'));
          record(label + ' — selection lock released on drop', unlocked);
        }
      }
      console.log('');
    }

    /* the Plate Room's labelling drag uses the same engine — check one */
    console.log('The Plate Room (Test mode)');
    await page.goto(base + '#/plates', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
    await page.evaluate(() => window.TM_PLATES.open('p-constructive', 'test'));
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
    const plateSpec = await page.evaluate(() => {
      const chip = document.querySelector('.tray .chip-d');
      const row = document.querySelector('.pv-row');
      if (!chip || !row) return null;
      const c = chip.getBoundingClientRect(), t = row.getBoundingClientRect();
      return {
        from: { x: Math.round(c.left + c.width / 2), y: Math.round(c.top + c.height / 2) },
        to: { x: Math.round(t.left + t.width / 2), y: Math.round(t.top + t.height / 2) }
      };
    });
    if (plateSpec) {
      await mouseDrag(page, plateSpec.from, plateSpec.to);
      await page.evaluate(() => new Promise((r) => setTimeout(r, 140)));
      const landed = await page.evaluate(() => !!document.querySelector('.pv-zone .chip-d'));
      totalDrags++;
      record('Plate Room · label drag · mouse — chip lands on its number', landed);
    } else {
      record('Plate Room · label drag — could not find a chip and a target', false);
    }

    /* ---------- report ---------- */
    const failed = results.filter((r) => !r.ok);
    console.log('\n' + '─'.repeat(58));
    console.log(totalDrags + ' real drags · ' + results.length + ' assertions · ' +
      failed.length + ' failed');
    if (failed.length) {
      console.log('\nFAILURES');
      failed.forEach((f) => console.log('  ✗ ' + f.name + (f.detail ? '  — ' + f.detail : '')));
      console.log('');
      process.exitCode = 1;
    } else {
      console.log('Drag works with a real mouse and a real finger.\n');
    }
  } finally {
    await browser.close();
    if (server) server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
