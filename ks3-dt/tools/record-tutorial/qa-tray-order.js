/* qa-tray-order.js — AN ASSEMBLY TRAY IS NEVER SERVED IN SOLUTION ORDER.
 *
 * DFM 258, HIS RULING, 25 August 2026, sitting J2 Lesson 2's build:
 *   "the first four lines were the correct ones for me, in that exact order,
 *    the lines on the left should be shuffled and you should know this and
 *    apply this for ALL similar activities."
 *
 * HE WAS RIGHT, AND IT WAS WORSE THAN HE SAW. The pyrun tray had NO shuffle at
 * all: it rendered `lines[]` in authored order, and every build in BOTH Lesson
 * 2s authors its correct lines first, in program order, because that is how the
 * source stays readable. Meanwhile the snap desk shuffles its Python column,
 * marked-question options have shuffled by law since 22 July (engines.js:361),
 * and parsons is authored-scrambled with a permutation key. The tray was the
 * one assembly surface on the platform with no protection.
 *
 * WHAT THIS GATE ASSERTS, in the order it asserts it:
 *   (a) EVERY pyrun chunk in EVERY year, mounted N times in a real browser,
 *       serves a tray whose order is a DERANGEMENT of the authored order — no
 *       line sits where it was written. That is a stronger promise than "not
 *       the same order", and deliberately so: a plain reshuffle can leave the
 *       solution first and in order (about 1 in 840 for a seven-line tray), and
 *       a blocking gate that fails once in a few hundred runs is a gate people
 *       learn to re-run rather than read (DFM 146a). A derangement makes the
 *       property deterministic, so the tray can never present the solution
 *       first however the dice fall.
 *   (b) No ordering item's answer key is the IDENTITY permutation. Parsons is
 *       authored-scrambled by design; this pins that design so it cannot drift
 *       into "authored in solution order" the way the tray did.
 *   (c) The snap engine still shuffles its Python column — the surface that was
 *       already right, held so a future edit cannot quietly take it away.
 *
 * CONTROLS (DFM 196 — a gate that cannot say no is not a gate):
 *   - the shuffle is stubbed out of the engine and (a) must FAIL on the real,
 *     shipped, solution-order content;
 *   - a planted identity-key ordering item must FAIL (b);
 *   - the snap shuffle is stubbed out and (c) must FAIL;
 *   - and each of the three must PASS on the shipped code, so the gate is not
 *     merely strict.
 *
 *   node qa-tray-order.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('./node_modules/playwright');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const ENGINES = path.join(__dirname, '..', '..', 'platform', 'engines.js');
const MOUNTS = Number(process.env.KS3DT_TRAY_MOUNTS || 5);

const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };
const control = (failed, m) => {
  console.log((failed ? '  CTRL ' : '  FAIL ') + 'CONTROL: ' + m);
  if (!failed) FAILS.push('CONTROL ' + m);
};

/* every lesson of every year, DERIVED rather than listed (DFM 206/K23) */
function lessons() {
  const out = [];
  const idx = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8'));
  (idx.years || []).forEach(y => {
    const yid = typeof y === 'string' ? y : y.id;
    const dir = path.join(SRC, yid, 'lessons');
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter(f => /\.json$/.test(f) && !f.includes('.bak')).sort().forEach(f => {
      out.push({ id: f.replace(/\.json$/, ''), year: yid,
        json: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) });
    });
  });
  return out;
}

/* every pyrun BUILD in the platform, core builds and stretch tails alike — a
   tail that served its lines in order would be the same fault in a card he is
   less likely to sit, which is exactly where a fault survives */
function pyrunBuilds() {
  const out = [];
  lessons().forEach(L => {
    (L.json.chunks || []).forEach(ch => {
      if (ch.engine !== 'pyrun') return;
      const cfg = ch.config || {};
      (cfg.builds || []).forEach((b, i) => out.push({
        lesson: L.id, chunk: ch.id, build: b.id || ('builds[' + i + ']'),
        chunkJson: ch, index: i, stretch: false, lines: (b.lines || []).length
      }));
      /* THE V54 STRETCH TAIL IS GONE (DFM 265, 26 Aug 2026). Its jobs live in an
         `extras` chunk now, as ordinary entries in `builds`, which is why they are
         already enumerated by the loop above and need nothing special here — K23's
         law working as intended: derive the list, never type it. What DOES need
         saying is how to reach one, and that is `trayOrder` below. */
      if (cfg.stretch) out.push({
        lesson: L.id, chunk: ch.id, build: cfg.stretch.id || 'stretch',
        chunkJson: ch, index: -1, stretch: true, lines: (cfg.stretch.lines || []).length
      });
    });
  });
  return out;
}

async function newPage(browser, engineSrc) {
  const pg = await browser.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto('about:blank');
  await pg.evaluate(() => {
    window.App = {
      esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      asset: p => p,
      armButton: (b, fn) => { if (b) b.onclick = fn; }
    };
  });
  await pg.addScriptTag({ content: engineSrc });
  /* PyRun.load() is warmed on mount and would reach for Skulpt; nothing here
     runs a program, so it is answered rather than loaded. */
  await pg.evaluate(() => { if (window.PyRun) window.PyRun._p = Promise.resolve(true); });
  /* the parsons permutation decoder, taken OUT OF THE ENGINE rather than
     re-implemented here: two copies of that arithmetic would drift the first
     time one of them was corrected (DFM 144) */
  await pg.addScriptTag({ content: engineSrc.slice(
    engineSrc.indexOf('function permFromIndex('),
    engineSrc.indexOf('Engines.parsons = {')) + '\nwindow.__permFromIndex = permFromIndex;' });
  return { pg, errs };
}

/* mount ONE build and read back the order the tray really drew, by the
   data-si the engine writes on each line — the authored index, so the served
   order is directly comparable with 0,1,2,… (DFM 146b: the rendered result) */
async function trayOrder(pg, chunk, buildIndex, stretch) {
  return pg.evaluate(async ([ch, bi, isStretch]) => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host');
    /* a chunk carrying only the build under test, so the card that opens IS the
       one being measured (the engine walks builds in order) */
    const cfg = JSON.parse(JSON.stringify(ch.config));
    if (isStretch) { cfg.builds = [cfg.stretch]; delete cfg.stretch; }
    else { cfg.builds = [cfg.builds[bi]]; delete cfg.stretch; }
    const one = Object.assign({}, ch, { config: cfg });
    window.Engines.pyrun.mount(host, one, {
      chunk: one, review: false, catchup: false,
      awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
      saveEvent: () => Promise.resolve({ ok: true }), markItem: () => Promise.resolve({ ok: true })
    });
    const wait = ms => new Promise(r => setTimeout(r, ms));
    await wait(40);
    /* HOW A BUILD IS REACHED DEPENDS ON THE CHUNK (DFM 238a's law: recognising a
       screen and being able to ACT on it are one fact). A core chunk opens on an
       intro card with one button; the extras zone (DFM 265) opens on a HUB and the
       job is behind its own button. Reading an empty tray and calling it a failed
       derangement would be this gate reporting a fault the app does not have. */
    const job = host.querySelector('.pyrun-hub .pyrun-job');
    if (job) job.click();
    else {
      const open = host.querySelector('.intro-card button.primary-btn');
      if (open) open.click();
    }
    await wait(50);
    return Array.prototype.slice.call(host.querySelectorAll('.pyt-list .pyrun-line'))
      .map(n => Number(n.getAttribute('data-si')));
  }, [chunk, buildIndex, !!stretch]);
}

async function snapShuffles(pg, chunk) {
  return pg.evaluate(async (ch) => {
    const seen = [];
    for (let r = 0; r < 8; r++) {
      document.body.innerHTML = '<div id="host"></div>';
      const host = document.getElementById('host');
      window.Engines.snap.mount(host, ch, {
        chunk: ch, review: false, catchup: false,
        awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
        saveEvent: () => Promise.resolve({ ok: true }), markItem: () => Promise.resolve({ ok: true })
      });
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const open = host.querySelector('.intro-card button.primary-btn');
      if (open) open.click();
      await wait(40);
      seen.push(Array.prototype.slice.call(host.querySelectorAll('.snap-py'))
        .map(n => (n.textContent || '').trim()).join('|'));
    }
    return seen;
  }, chunk);
}

const isDerangement = (order) => order.length > 1 && order.every((v, i) => v !== i);

async function run() {
  console.log('qa-tray-order — an assembly tray is never served in solution order (DFM 258)\n');
  const shipped = fs.readFileSync(ENGINES, 'utf8');
  const browser = await chromium.launch({ headless: true });
  try {
    const { pg, errs } = await newPage(browser, shipped);

    /* ---------------- (a) every pyrun tray, every year ---------------- */
    console.log('=== (a) THE PYRUN TRAY ===');
    const builds = pyrunBuilds();
    check(builds.length > 0, 'there are pyrun builds to measure at all (' + builds.length + ' found) — a walk that finds nothing must never read as a pass (DFM 204)');
    for (const b of builds) {
      const orders = [];
      for (let n = 0; n < MOUNTS; n++) {
        orders.push(await trayOrder(pg, b.chunkJson, b.index, b.stretch));
      }
      const drawn = orders.filter(o => o.length === b.lines);
      const allDeranged = drawn.length === MOUNTS && drawn.every(isDerangement);
      const label = b.lesson + ' › ' + b.chunk + ' › ' + b.build + (b.stretch ? ' (stretch tail)' : '') +
        ', ' + b.lines + ' line(s), mounted ' + MOUNTS + '×';
      if (b.lines < 2) {
        console.log('  n/a  ' + label + ' — one line cannot be deranged, and there is nothing to hide in a tray of one');
        continue;
      }
      check(allDeranged, label + ': every mount serves a tray in which NO line sits at its ' +
        'authored index' + (allDeranged ? '' : ' — served ' + JSON.stringify(orders)));
    }
    check(errs.length === 0, 'no page error while mounting any build' + (errs.length ? ': ' + errs[0] : ''));

    /* ------------- (b) no ordering key is the identity permutation ------------- */
    console.log('\n=== (b) THE ORDERING PUZZLES (parsons is authored-scrambled by design) ===');
    /* A parsons key stores its permutation as a SINGLE NUMBER (`a: 15`), not as
       an array — the Lehmer index the engine decodes with permFromIndex. The
       first version of this section looked for an `order` array, found none, and
       reported "0 ordering puzzles found", which is the DFM 204 fault in the one
       gate written to stop it: a walk that finds nothing must never read as a
       pass. It now decodes the number the way the engine does, using the ENGINE'S
       OWN function pulled out of the page rather than a second copy of the
       arithmetic (DFM 144). */
    let ordering = 0;
    for (const L of lessons()) {
      for (const ch of (L.json.chunks || [])) {
        if (ch.engine !== 'parsons') continue;
        const item = (ch.config || {}).item || {};
        const blocks = item.blocks || [];
        const key = (L.json.keys || {})[item.id];
        if (!key || blocks.length < 2 || typeof key.a !== 'number') continue;
        ordering++;
        const perm = await pg.evaluate(([idx, n]) => window.__permFromIndex(idx, n),
          [key.a, blocks.length]);
        const identity = perm.every((v, i) => v === i);
        check(!identity, L.id + ' › ' + ch.id + ' › ' + item.id + ': its answer key (a=' + key.a +
          ' → ' + JSON.stringify(perm) + ') is not the identity permutation — the blocks are ' +
          'authored scrambled, so the order she is shown is not the order she needs');
      }
    }
    check(ordering > 0, 'there are ordering puzzles to measure at all (' + ordering + ' found) — ' +
      'a walk that finds nothing must never read as a pass (DFM 204)');

    /* ---------------- (c) the snap desk still shuffles ---------------- */
    console.log('\n=== (c) THE SNAP DESK (the surface that was already right) ===');
    let snapChunks = 0;
    for (const L of lessons()) {
      for (const ch of (L.json.chunks || [])) {
        if (ch.engine !== 'snap') continue;
        snapChunks++;
        const seen = await snapShuffles(pg, ch);
        const authored = (ch.config.pythons || []).join('|');
        check(new Set(seen).size > 1,
          L.id + ' › ' + ch.id + ': the Python column is drawn in a different order across 8 mounts');
        check(!seen.every(s => s === authored),
          L.id + ' › ' + ch.id + ': and it is not simply the authored order every time');
      }
    }
    check(snapChunks > 0, 'there is a snap desk to measure at all (' + snapChunks + ' found)');
    await pg.close();

    /* ============================ CONTROLS ============================ */
    console.log('\n=== CONTROLS — the gate proves it can say no ===');

    /* (1) the tray shuffle stubbed out: the shipped content must FAIL */
    const noTrayShuffle = shipped.replace(
      'var trayOrder = derangedOrder(lines.length);',
      'var trayOrder = lines.map(function (_, i) { return i; });');
    check(noTrayShuffle !== shipped, 'the tray-shuffle stub really patched the engine (a control that ' +
      'silently failed to change anything would prove nothing)');
    {
      const { pg: p2 } = await newPage(browser, noTrayShuffle);
      const b = pyrunBuilds().find(x => x.lines >= 4);
      const o = await trayOrder(p2, b.chunkJson, b.index, b.stretch);
      control(!isDerangement(o),
        'with the shuffle removed, ' + b.lesson + ' › ' + b.build + ' serves its tray in AUTHORED order ' +
        JSON.stringify(o) + ' — which is exactly what he sat: the correct lines first, in order');
      await p2.close();
    }

    /* (2) a planted identity ordering key must FAIL, decoded the engine's own way */
    {
      const { pg: p4 } = await newPage(browser, shipped);
      /* Lehmer index 0 IS the identity permutation, whatever the length */
      const idPerm = await p4.evaluate(() => window.__permFromIndex(0, 4));
      control(idPerm.every((v, i) => v === i),
        'a planted key of a=0 decodes to ' + JSON.stringify(idPerm) + ' — the identity permutation, ' +
        'which is a puzzle already in its answer, and rule (b) condemns it');
      const real = await p4.evaluate(() => window.__permFromIndex(15, 4));
      control(!real.every((v, i) => v === i),
        'while the shipped j1-03 key a=15 decodes to ' + JSON.stringify(real) + ' and passes — the ' +
        'rule is not merely strict');
      await p4.close();
    }

    /* (3) the snap shuffle stubbed out: the desk must FAIL */
    const noSnapShuffle = shipped.replace(
      'var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t;',
      '/* control: shuffle removed */');
    check(noSnapShuffle !== shipped, 'the snap-shuffle stub really patched the engine');
    {
      const { pg: p3 } = await newPage(browser, noSnapShuffle);
      const L = lessons().find(x => (x.json.chunks || []).some(c => c.engine === 'snap'));
      const ch = L.json.chunks.find(c => c.engine === 'snap');
      const seen = await snapShuffles(p3, ch);
      control(new Set(seen).size === 1,
        'with its shuffle removed, the snap desk draws the SAME column every time — so rule (c) is ' +
        'holding a real behaviour rather than describing one');
      await p3.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\n' + (FAILS.length
    ? 'qa-tray-order: ' + FAILS.length + ' FAILURE(S)'
    : 'qa-tray-order: ALL GREEN — no assembly surface serves its answer in order'));
  process.exit(FAILS.length ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
