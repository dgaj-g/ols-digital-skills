/* prove.js — CHART-A scratch proof. Serves the mathshelf root, loads the scratch
   page at 375 (reduced motion, instant goto) and 1280 (animated advance), and
   asserts what CHART_NOTES.md claims. Run: NODE_PATH="$(npm root -g)" node prove.js */
'use strict';
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const ROOT = path.resolve(__dirname, '../../../../../');
const { launch, newPage } = require(path.join(ROOT, 'tools/qa/lib/browser.js'));

function freePort() { return new Promise((res, rej) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); s.on('error', rej); }); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

const KIND = {
  write: '.movie-line .ml-eq', ring: '.ml-ring', tick: '.mark-tick', note: '.ml-note, .ui-msg',
  stamp: '.ml-stamp', table: '.ml-table', tcell: '.ml-tcell', chart: '.ml-chart',
  plot: '.ml-plot', curve: '.ml-curve', rule: '.ml-rule', drop: '.ml-drop',
  scale: '.ml-scale', marker: '.ml-marker', grid: '.movie-grid', balance: '.movie-balance', sub: '.movie-line .ml-eq',
  /* Book A additions (the KIND map entries the law needs) */
  venn: '.ml-venn', vfill: '.ml-vfill', pie: '.ml-pie', sector: '.ml-sector',
  stemleaf: '.ml-stemleaf', leaf: '.ml-leaf', key: '.ml-key', lobf: '.ml-lobf'
};

async function main() {
  const port = await freePort();
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await wait(700);
  const browser = await launch();
  const out = [];
  let fails = 0;
  const ok = (cond, msg) => { out.push((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
  try {
    for (const width of [375, 1280]) {
      const reduced = width === 375;
      const page = await newPage(browser, { width, reducedMotion: reduced });
      await page.goto(`http://127.0.0.1:${port}/tools/qa/out/bookA/chart/scratch.html`, { waitUntil: 'load' });
      await wait(300);
      const n = await page.evaluate(() => window.__scratch.movie.steps.length);
      if (reduced) {
        await page.evaluate(async (k) => { await window.__scratch.player.goto(k, true); }, n - 1);
        await wait(200);
      } else {
        /* advance until the last caption shows; a press while the player is busy is ignored, so retry */
        const t0 = Date.now();
        while (Date.now() - t0 < 60000) {
          const cur = await page.evaluate(() => +document.querySelector('.cap-num').textContent);
          if (cur >= n) break;
          await page.evaluate(() => window.__scratch.player.step(1));
          await wait(900);
        }
        await wait(2500);   /* the last step's strokes */
      }
      const r = await page.evaluate((KIND) => {
        const stage = document.querySelector('.movie-stage');
        const res = { kinds: {}, missing: [], texts: [], smallTexts: [], regions: [], pie: {}, hits: [], rig: {}, capStep: document.querySelector('.cap-num').textContent };
        const live = [];
        window.__scratch.movie.steps.forEach(s => s.do.forEach(op => live.push(Object.keys(op)[0])));
        const kinds = {};
        live.forEach(k => { kinds[k] = (kinds[k] || 0) + 1; });
        const vis = n => { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') < 0.05) return false; const b = n.getBoundingClientRect(); return Math.max(b.width, b.height) > 2; };
        Object.keys(kinds).forEach(k => {
          const sel = KIND[k];
          if (!sel) { res.missing.push(k + ' (no selector)'); return; }
          const found = [...stage.querySelectorAll(sel)].filter(vis);
          res.kinds[k] = found.length;
          if (!found.length) res.missing.push(k);
        });
        /* every SVG text on a stat board: rendered size >= 13 */
        document.querySelectorAll('svg.stat-board text').forEach(t => {
          const fs = parseFloat(getComputedStyle(t).fontSize) || parseFloat(t.getAttribute('font-size')) || 0;
          const a = t.ownerSVGElement.getScreenCTM().a;
          const px = fs * a;
          const b = t.getBoundingClientRect();
          res.texts.push(+px.toFixed(2));
          if (px < 13 || b.height < 8) res.smallTexts.push({ text: t.textContent, px: +px.toFixed(2), h: +b.height.toFixed(1), cls: t.getAttribute('class') });
        });
        /* the player's own chart text (pre-existing style.css sizes) reported, not asserted */
        res.mlChartText = [...document.querySelectorAll('.ml-chart text')].map(t => +(parseFloat(getComputedStyle(t).fontSize) * t.ownerSVGElement.getScreenCTM().a).toFixed(1));
        /* region centres inside their regions: film venn2 (hosted in .ml-venn) + venn3 */
        const v3 = window.__scratch.venn3;
        const checkVenn = (h, name) => h.regions().forEach(reg => {
          const u = h.regionCenterUser(reg);
          const c = h.regionCenter(reg);
          /* CSS -> user back through the frame, then containment */
          const fr = h.frame.getBoundingClientRect(), sr = h.svg.getBoundingClientRect();
          const sc = sr.width / h.geometry().rect.w > 0 ? sr.width / (h.geometry().rect.w + 24) : 1;
          const ux = (c.x - (sr.left - fr.left)) / sc, uy = (c.y - (sr.top - fr.top)) / sc;
          res.regions.push({ board: name, reg, inside: h.contains(reg, u.x, u.y), insideCss: h.contains(reg, ux, uy), css: [Math.round(c.x), Math.round(c.y)] });
        });
        checkVenn(v3, 'venn3');
        /* the film's venn: find its handle via the value elements' regions */
        const filmVenn = stage.querYselectorAll ? null : null;
        /* pie */
        const p = window.__scratch.pie;
        const ctr = p.centre();
        const r90 = p.rimPoint(90);
        res.pie.rightOfCentre = r90[0] > ctr[0] + 10 && Math.abs(r90[1] - ctr[1]) < 1;
        res.pie.roundTrip = [];
        for (let d = 0; d < 360; d += 37) { const rp = p.rimPoint(d); const back = p.degAt(rp[0], rp[1]); res.pie.roundTrip.push([d, back]); }
        res.pie.roundTripOk = res.pie.roundTrip.every(([d, b]) => Math.abs(((b - d + 540) % 360) - 180) <= 1);
        res.pie.bounds = p.boundaries();
        res.pie.sectors = document.querySelectorAll('#pie path.stat-sector[data-sector]').length;
        res.pie.boundEls = [...document.querySelectorAll('#pie .stat-pie-bound[data-hit][data-placed]')].map(e => e.getBoundingClientRect().width.toFixed(1));
        const lp = p.labelPoint(0, 156);
        res.pie.labelPoint = [Math.round(lp.x), Math.round(lp.y)];
        /* hits >= 44, lobf handles >= 48 */
        document.querySelectorAll('[data-hit]').forEach(h => {
          const b = h.getBoundingClientRect();
          const need = h.classList.contains('stat-lobf-handle') ? 48 : 44;
          const size = h.classList.contains('stat-pie-rim') ? parseFloat(getComputedStyle(h).strokeWidth) * h.ownerSVGElement.getScreenCTM().a : Math.min(b.width, b.height);
          if (size < need - 0.5) res.hits.push({ kind: h.getAttribute('data-hit'), size: +size.toFixed(1), need });
        });
        /* grid: given points read-only, lobf, handles, outlier, drop at 60 */
        const g = window.__scratch.grid;
        res.grid = {
          given: document.querySelectorAll('#grid .stat-pt.is-given').length,
          givenPlaced: document.querySelectorAll('#grid .stat-pt.is-given [data-placed], #grid .stat-pt.is-given [data-hit]').length,
          placed: g.points().length, all: g.allPoints().length,
          lobf: document.querySelectorAll('#grid .stat-lobf').length,
          handles: document.querySelectorAll('#grid circle.stat-lobf-handle[data-hit][data-handle]').length,
          outlier: document.querySelectorAll('#grid .stat-pt.is-outlier').length,
          dropAt60: window.__scratch.dropAt60, ends: window.__scratch.lobfEnds,
          yBreak: document.querySelectorAll('#grid [data-role="break"] path').length,
          lobfBox: (() => { const l = document.querySelector('#grid .stat-lobf'); const b = l.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; })()
        };
        /* rig */
        const rh = document.getElementById('rigHost'); const rf = rh.querySelector('.stat-board-frame');
        res.rig = { hostW: rh.clientWidth, hidden: rf.scrollWidth - rf.clientWidth, reclaimed: rh.getAttribute('data-reclaimed'), marginLeft: getComputedStyle(rh).marginLeft, lawW: Math.ceil(window.__scratch.rig.minWidth()) + 2 };
        /* the film's venn value boxes: each .ml-vfill sits inside its region (via the circles drawn) */
        const fv = stage.querySelector('.ml-venn svg');
        if (fv) {
          const circles = [...fv.querySelectorAll('circle.stat-venn-circle')].map(c => ({ id: c.getAttribute('data-circle'), cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy'), r: +c.getAttribute('r') }));
          res.filmVenn = [...fv.querySelectorAll('text.ml-vfill')].map(t => {
            const x = +t.getAttribute('x'), y = +t.getAttribute('y');
            const inside = circles.filter(c => (x - c.cx) ** 2 + (y - c.cy) ** 2 < c.r * c.r).map(c => c.id).join('') || 'out';
            return { region: t.getAttribute('data-region'), at: inside, ok: inside === t.getAttribute('data-region'), text: t.textContent };
          });
        }
        res.errors = (window.__errs || []);
        return res;
      }, KIND);
      out.push(`\n== width ${width} (${reduced ? 'reduced motion, goto instant' : 'animated advance'}) — film ended on step ${r.capStep}/${n}`);
      ok(r.missing.length === 0, `film-draws: every op kind drawn — ${JSON.stringify(r.kinds)}${r.missing.length ? ' MISSING ' + r.missing.join(',') : ''}`);
      ok(r.smallTexts.length === 0, `stat-board SVG text >= 13 CSS px rendered (${r.texts.length} texts, min ${Math.min(...r.texts).toFixed(2)})${r.smallTexts.length ? ' small: ' + JSON.stringify(r.smallTexts.slice(0, 5)) : ''}`);
      out.push(`     (player's own .ml-chart text sizes, pre-existing style.css: ${JSON.stringify([...new Set(r.mlChartText)])} — not mine, noted)`);
      ok(r.regions.every(x => x.inside && x.insideCss), `venn3 region centres inside their regions (user + CSS round-trip): ${r.regions.map(x => x.reg + (x.inside && x.insideCss ? '✓' : '✗')).join(' ')}`);
      ok(r.filmVenn && r.filmVenn.length === 4 && r.filmVenn.every(x => x.ok), `film venn2: four vfills each inside its region: ${JSON.stringify(r.filmVenn)}`);
      ok(r.pie.rightOfCentre, `pie rimPoint(90) is to the right of centre, level with it`);
      ok(r.pie.roundTripOk, `pie degAt(rimPoint(d)) ≈ d for d = 0..359 step 37: ${r.pie.roundTrip.map(x => x.join('→')).join(' ')}`);
      ok(r.pie.sectors === 2 && r.pie.boundEls.length === 2, `pie question board: 2 sectors, 2 placed boundaries (hit widths ${r.pie.boundEls.join(',')} px), bounds ${JSON.stringify(r.pie.bounds)}, labelPoint(0,156)=${r.pie.labelPoint}`);
      ok(r.hits.length === 0, `every [data-hit] >= 44 px (lobf handles >= 48)${r.hits.length ? ' small: ' + JSON.stringify(r.hits) : ''}`);
      ok(r.grid.given === 5 && r.grid.givenPlaced === 0 && r.grid.placed === 1 && r.grid.all === 6, `grid: 5 given (.is-given, no data-placed/hit), points()=${r.grid.placed} hers, allPoints()=${r.grid.all}`);
      ok(r.grid.lobf === 1 && r.grid.handles === 2 && r.grid.outlier === 1, `grid: lobf line ${r.grid.lobf} (box ${r.grid.lobfBox}), handles ${r.grid.handles}, outlier ${r.grid.outlier}, ends ${JSON.stringify(r.grid.ends)}`);
      ok(r.grid.dropAt60 && Math.abs(r.grid.dropAt60.y - (30 + 40 * 50 / 60)) < 1e-6, `grid: ruleX(60) + drop() reads the LOBF: ${JSON.stringify(r.grid.dropAt60)} (line through (20,30),(80,80) gives y=63.33 at x=60)`);
      ok(r.grid.yBreak === 1, `grid: y.min=20 draws the y-axis break glyph (${r.grid.yBreak} break path; x.min=0 draws none)`);
      if (width === 1280) ok(r.rig.hidden === 0 && r.rig.reclaimed != null, `laptop reclaim: host ${r.rig.hostW} px vs law-6 ${r.rig.lawW} px → reclaimed ${r.rig.reclaimed} px (margin-left ${r.rig.marginLeft}), hidden width now ${r.rig.hidden} px`);
      else out.push(`     rig at 375: hidden ${r.rig.hidden}, reclaimed ${r.rig.reclaimed}, margin ${r.rig.marginLeft} (phone: not asserted)`);
      ok(page.__errors.length === 0, `zero console errors${page.__errors.length ? ': ' + page.__errors.join(' | ') : ''}`);
      await page.screenshot({ path: path.join(__dirname, `scratch-${width}.png`), fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(out.join('\n'));
  console.log(`\n${fails ? fails + ' FAIL' : 'ALL PASS'}`);
  process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error('CRASH', e); process.exit(2); });
