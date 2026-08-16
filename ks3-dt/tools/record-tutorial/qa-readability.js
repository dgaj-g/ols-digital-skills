#!/usr/bin/env node
/* qa-readability.js — CAN SHE READ IT? Measured in rendered pixels, on every skin.
 *
 * DAMIEN, 13 Aug 2026, sitting Lesson 5 (DFM 207g):
 *   "that text is very hard to read, where it says three, the QA desk. Also,
 *    ready for gallery is quite hard to read... I also can't read where it says
 *    what did the score actually do. That font is barely visible... there's
 *    general font issues here that I can't read. I don't know if it's because of
 *    the skin that I'm wearing and this, you know, agent kit, but it needs
 *    sorted. A HARNESS IS NEEDED FOR FONT READABILITY."
 *
 * His suspicion about the skin was the right instinct, and the mechanism is worse
 * than a skin bug: `.std-qa-row` paints a light parchment plate and never sets a
 * text colour, so everything inside it INHERITS THE DARK SHELL'S LIGHT TEXT.
 * Light text on a light plate. The row headings survive only because they set
 * their own ink; the question, the test panel and the answer buttons do not.
 *
 * WHY PIXELS AND NOT COMPUTED STYLE. A computed-style checker reads
 * `color: <inherited light>` against `background: transparent` and has to walk
 * ancestors guessing what is really behind the glyphs; gradients, overlays and
 * images defeat it. This screenshots the real screen and measures the actual
 * glyph pixels against the actual plate pixels — the same reason DFM 146b exists.
 * Chromium decodes its own screenshot inside the page, so there is no new
 * dependency and nothing between the measurement and what a child sees.
 *
 * THE FLOORS (WCAG 2.1 AA, which is also what themes.json already PROMISES in
 * its own registry comment — a promise nothing has ever measured, and a comment's
 * claim about behaviour is a hypothesis, never evidence, DFM 194c):
 *   normal text            >= 4.5:1
 *   large text             >= 3.0:1   (>=24px, or >=18.66px bold)
 * A deliberately dimmed control still has to clear the large-text floor: "dim"
 * must mean quieter, never unreadable.
 *
 *   node qa-readability.js [--base http://localhost:8096] [--expect-fail]
 *                          [--theme midnight] [--surface qadesk]
 *
 * --expect-fail is the DFM 196 control: pointed at the build he SAT, his four
 * surfaces must FAIL. A gate that cannot fail on his own screenshot is theatre.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const BASE = argOf('--base', 'http://localhost:8096');
const EXPECT_FAIL = process.argv.includes('--expect-fail');
const ONLY_THEME = argOf('--theme', null);
const ONLY_SURFACE = argOf('--surface', null);
const KS3 = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform');
const SHOTS = path.join(KS3, 'qa-l2-l5-review', 'l5-round');
const THEMES_JSON = path.join(KS3, 'content-src', 'themes.json');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const findings = [];
const log = (m) => console.log('  ' + m);

/* HIS FOUR SURFACES. Named individually because they are the control: pointed at
   the build he sat, each of these must be caught. Everything else on the screen
   is swept too, but these four are the ones he could not read. */
const HIS = [
  { sel: '.std-qa-q', what: 'the QA question ("What did the score actually do?")' },
  { sel: '.std-outcome', what: 'the answer buttons under a QA check' },
  { sel: '.std-qadesk .std-qa-tag', what: 'the "3 · THE QA DESK" heading' },
  { sel: '.std-ready-btn.dim', what: 'the dimmed READY FOR GALLERY button' }
];

/* ------------------------------------------------------------------ measuring */
/* Runs IN THE PAGE against a decoded screenshot. For each element rect: build a
   luminance histogram, take the modal bucket as the PLATE, then the farthest
   bucket holding a real share of pixels as the TEXT CORE. Anti-aliased edge
   pixels sit between the two and are ignored by construction. */
const MEASURE = async ([dataUri, rects]) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const dpr = img.width / window.innerWidth;

  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);

  return rects.map(R => {
    /* SAMPLE THE INTERIOR, NOT THE EDGES. A pill-shaped button's bounding box
       includes four corners that are NOT the button — they are whatever sits
       behind it — and on one skin those corners outvoted the button's own
       gradient, so the modal bucket came out as the panel and a perfectly
       legible violet pill was condemned at 1.22:1 while the browser's own
       colours give 6.55:1. Insetting by an eighth on each side keeps every
       glyph (text never reaches its own border) and drops the corners. */
    const inx = Math.round(R.w * dpr * 0.12), iny = Math.round(R.h * dpr * 0.12);
    const x = Math.max(0, Math.round(R.x * dpr) + inx), y = Math.max(0, Math.round(R.y * dpr) + iny);
    const w = Math.min(c.width - x, Math.round(R.w * dpr) - inx * 2);
    const h = Math.min(c.height - y, Math.round(R.h * dpr) - iny * 2);
    if (w < 2 || h < 2) return Object.assign({}, R, { skip: 'off screen' });
    const d = g.getImageData(x, y, w, h).data;
    const N = 48, buckets = [];
    for (let i = 0; i < N; i++) buckets.push({ n: 0, r: 0, g: 0, b: 0 });
    let total = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) continue;
      const L = lum(d[i], d[i + 1], d[i + 2]);
      const bi = Math.min(N - 1, Math.floor(L * N));
      const b = buckets[bi];
      b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; total++;
    }
    if (!total) return Object.assign({}, R, { skip: 'nothing drawn' });
    const meanOf = (b) => ({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n, L: lum(b.r / b.n, b.g / b.n, b.b / b.n) });
    let plateI = 0;
    buckets.forEach((b, i) => { if (b.n > buckets[plateI].n) plateI = i; });
    const plate = meanOf(buckets[plateI]);

    /* WHICH PIXELS ARE THE TEXT. The first cut took the bucket FARTHEST from the
       plate, and on a gold button with dark ink that is the white highlight line
       along its top edge — so it measured a bevel and called a perfectly readable
       button unreadable. The browser already knows what colour the glyphs are
       (including a colour inherited from four ancestors up), so computed colour
       says WHAT TO LOOK FOR and the screenshot still says WHAT IS ACTUALLY THERE:
       the contrast is measured between real plate pixels and real glyph pixels,
       never between two numbers out of the stylesheet. */
    const want = R.rgb || null;
    const floorN = Math.max(18, total * 0.002);
    let coreI = -1, best = 1e9;
    buckets.forEach((b, i) => {
      if (b.n < floorN || i === plateI) return;
      const m = meanOf(b);
      const d = want
        ? Math.abs(m.r - want[0]) + Math.abs(m.g - want[1]) + Math.abs(m.b - want[2])
        : -Math.abs(m.L - plate.L) * 1000;
      if (d < best) { best = d; coreI = i; }
    });
    /* the glyphs are not on screen at all (covered, clipped, or no text drawn) */
    if (coreI < 0) return Object.assign({}, R, { skip: 'no text pixels found' });
    /* and if the nearest cluster is nothing like the colour the browser says the
       text is, we are looking at something else — say so rather than invent a
       number (tolerance is generous: anti-aliasing pulls glyph pixels toward the
       plate, so a thin 11px face never renders at its pure colour) */
    if (want && best > 240) return Object.assign({}, R, { skip: 'text pixels not distinguishable' });
    const core = meanOf(buckets[coreI]);
    const hi = Math.max(plate.L, core.L), lo = Math.min(plate.L, core.L);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const hex = (p) => '#' + [p.r, p.g, p.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    return Object.assign({}, R, { ratio: Math.round(ratio * 100) / 100, plate: hex(plate), ink: hex(core) });
  });
};

/* the rects + type metrics of every text-bearing element now on screen */
const COLLECT = ([extraSels, hisSels, rootSel]) => {
  const out = [];
  const seen = new Set();
  const push = (el, forced) => {
    if (seen.has(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return;
    const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (!own && !forced) return;
    seen.add(el);
    const px = parseFloat(cs.fontSize) || 16;
    const weight = Number(cs.fontWeight) || 400;
    out.push({
      sel: el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : el.tagName.toLowerCase(),
      text: (own || el.textContent || '').trim().slice(0, 48),
      /* DOCUMENT coordinates, against a full-page screenshot. Viewport rects
         silently dropped everything below the fold — and the QA desk is a long
         screen, so his answer buttons and the READY button, the very surfaces he
         could not read, were never measured while the run printed a clean pass. */
      x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height,
      px: px, weight: weight,
      /* the colour the browser resolved for these glyphs, used only to FIND them */
      rgb: (cs.color.match(/\d+/g) || ['0', '0', '0']).slice(0, 3).map(Number),
      /* a glyph with no letters or digits in it is a MARK, not text — a star, a
         spanner, a dropdown arrow. Holding an unlit star to a text floor is the
         gate inventing a fault (DFM 146a); marks are judged at the 3:1 the
         non-text rule asks for, and reported apart. */
      icon: !/[a-z0-9]/i.test(own || el.textContent || ''),
      large: px >= 24 || (px >= 18.66 && weight >= 700),
      /* which of HIS named surfaces this element IS, decided by the browser's own
         selector matching rather than by fuzzy class-name comparison */
      his: (hisSels || []).filter(sel => { try { return el.matches(sel); } catch (e) { return false; } })
    });
  };
  /* the host area only — the top bar and starfield are chrome, not lesson text */
  const root = (rootSel && document.querySelector(rootSel)) ||
    document.querySelector('.chunk-host') || document.body;
  root.querySelectorAll('*').forEach(el => push(el, false));
  (extraSels || []).forEach(s => document.querySelectorAll(s).forEach(el => push(el, true)));
  return out;
};

/* ------------------------------------------------------------------- the run */
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  /* SKINS ARE YEAR-SCOPED NOW (his K1 ruling, and K11a's two year worlds). A
     J2 look on a J1 lesson screen is a combination no pupil can ever produce —
     the server refuses it and the wardrobe never offers it — so measuring it
     would let the gate invent a fault (DFM 146a) and block a pack over a screen
     that does not exist. Each surface says which year it belongs to and is
     measured under exactly the skins that year can wear. */
  const REGISTRY = JSON.parse(fs.readFileSync(THEMES_JSON, 'utf8')).themes;
  const themesForYear = (y) => REGISTRY
    .filter(t => (t.year == null ? 'j1' : String(t.year)) === 'all' || (t.year == null ? 'j1' : String(t.year)) === y)
    .map(t => t.id);
  const themesAll = REGISTRY.map(t => t.id);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  /* boot exactly as the other walkers do — a harness that reaches the screen a
     different way is testing a different screen */
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-8A&as=anya', { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: 0 };
    db.pupils = db.pupils || {};
    db.pupils['Demo-8A:anya.murphy@demo'] = Object.assign(
      db.pupils['Demo-8A:anya.murphy@demo'] || { n: 'Anya Murphy', cn: '', j: 1, xp: 0, g: '' }, { L: {} });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);

  /* the lesson tiles are button.tile (NOT .lesson-card — guessed once, and a
     guessed selector is how a walker ends up testing nothing, DFM 143b) */
  /* the lesson tiles are button.tile (NOT .lesson-card — guessed once, and a
     guessed selector is how a walker ends up testing nothing, DFM 143b). They
     also mount LATE: a fixed sleep found them on the first boot and missed them
     on the second, so this waits for the tile rather than assuming it is there. */
  const openLesson = async (num) => {
    await page.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null,
      { timeout: 15000 }).catch(() => { throw new Error('the lesson tiles never mounted'); });
    const hit = await page.evaluate((n) => {
      const tiles = Array.from(document.querySelectorAll('button.tile'));
      /* the tile's text runs together ("Lesson 5Game Studio"), so a \b after the
         number never matches — it is followed by a letter, not a boundary */
      const t = tiles.find(c => new RegExp('Lesson\\s*' + n + '(?![0-9])', 'i').test(c.textContent));
      if (!t) return 'no tile for lesson ' + n;
      if (/is-locked/.test(t.className)) return 'lesson ' + n + ' is locked';
      t.click(); return true;
    }, num);
    if (hit !== true) throw new Error(String(hit));
    await sleep(2000);
  };
  /* ADVANCE UNTIL THE TARGET IS ON SCREEN, never "click next N times". The
     briefing card TYPES ITSELF OUT, so for the first two or three looks there is
     no button at all — a fixed count lands mid-animation and measures a screen
     nobody is on. (Same lesson as DFM 199's turn count: wait for the thing, do
     not count the passes.) */
  /* A BADGE POPUP STANDS OVER THE SCREEN and must be dismissed before anything
     behind it can be clicked. It is position:fixed, so `offsetParent` is NULL on
     it and on its "Onward" button — the visibility test that skipped it for four
     runs. Visibility is a real rect from here on, never offsetParent. */
  const seen = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const dismissBadge = async () => {
    const gone = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
      const b = Array.from(document.querySelectorAll('button')).find(x =>
        vis(x) && /^(onward|continue|nice|got it)\b/i.test(x.textContent.trim()));
      if (b) { b.click(); return true; }
      return false;
    });
    if (gone) await sleep(900);
    return gone;
  };
  /* `via` widens what counts as "the way on" for ONE surface only. It defaults
     to the two controls every J1 drive has always used, so no existing surface
     changes what it clicks; J2 Lesson 1 adds `.confirm-step`, which is how a
     pupil advances a steps card and is the only control on its workbench. */
  const ADVANCE_DEFAULT = '.chunk-host .primary-btn, .chunk-host .dossier-cta';
  const advanceUntil = async (target, tries, via) => {
    for (let i = 0; i < (tries || 14); i++) {
      const there = await page.evaluate((t) => !!document.querySelector(t), target);
      if (there) return true;
      await dismissBadge();
      const again = await page.evaluate((t) => !!document.querySelector(t), target);
      if (again) return true;
      await page.evaluate((sel) => {
        const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
        const b = Array.from(document.querySelectorAll(sel))
          .find(x => !x.disabled && vis(x) && !x.classList.contains('ticked'));
        if (b) b.click();
      }, via || ADVANCE_DEFAULT);
      await sleep(1300);
    }
    return await page.evaluate((t) => !!document.querySelector(t), target);
  };
  const VIA_J2 = '.chunk-host .primary-btn, .chunk-host .dossier-cta, .chunk-host .confirm-step';
  /* J3 adds the compass's own controls and the optional-tail buttons, because
     neither is a primary button and the compass board sits between the drive
     and every screen after it. */
  const VIA_J3 = VIA_J2 + ', .chunk-host .stretch-go, .chunk-host .cmp-side, .chunk-host .cmp-done'
    /* and the question renderer itself: the compass sits BEHIND twenty answered
       questions, so a drive that cannot answer one never gets there */
    + ', .chunk-host .q-feedback button, .chunk-host .q-opt';
  const clickIn = async (sel, ms) => {
    await dismissBadge();
    const hit = await page.evaluate((s) => {
      const e = document.querySelector(s); if (!e || e.disabled) return false; e.click(); return true;
    }, sel);
    await sleep(ms || 900);
    return hit;
  };

  /* ---- the surfaces, each with the drive that reaches it ---- */
  const SURFACES = [
    {
      id: 'contract', lesson: '5', what: 'a contract, open (his sign/back buttons)',
      must: ['.std-contract-full', '.std-back'],
      drive: async () => {
        if (!await advanceUntil('.std-contract')) throw new Error('never reached the contracts desk');
        await clickIn('.std-contract', 1000);
      }
    },
    {
      id: 'qadesk', lesson: '5', what: 'the QA desk with a check OPEN (his three surfaces)',
      extras: ['.std-qa-q', '.std-outcome', '.std-qadesk .std-qa-tag', '.std-ready-btn'],
      must: ['.std-qa-q', '.std-outcome', '.std-qadesk .std-qa-tag', '.std-ready-btn.dim'],
      drive: async () => {
        if (!await advanceUntil('.std-contract')) throw new Error('never reached the contracts desk');
        await clickIn('.std-contract', 900);
        await page.evaluate(() => {
          const i = document.querySelector('.std-sig-input');
          if (i) { i.value = 'Golden Otter Games'; i.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        await sleep(400);
        if (!await clickIn('.std-sign', 1100)) throw new Error('the sign button never unlocked');
        if (!await clickIn('.std-enter', 1800)) throw new Error('no way out of the signed contract');
        if (!await advanceUntil('.std-kit-confirm, .std-qadesk')) throw new Error('never reached the studio desk');
        await clickIn('.std-kit-confirm', 1200);
        if (!await clickIn('.std-qa-row .std-qa-head', 900)) throw new Error('the QA rows never opened');
        await clickIn('.std-qa-run', 900);
      }
    },
    {
      id: 'caseboard', lesson: '4', what: 'Lesson 4 case board (LOCKED lesson — regression watch)',
      must: ['.case-file, .case-pin, .case-filecard'],
      drive: async () => {
        if (!await advanceUntil('.case-file, .case-pin, .case-filecard')) throw new Error('never reached the case board');
      }
    },
    /* ---- THE J1 HUB AND WARDROBE: the control for the two below -----------
       These have NEVER been measured. qa-readability was built for Lesson 5's
       QA desk and only ever walked lesson surfaces, so the screen every pupil
       of every year lands on was outside its coverage entirely (DFM 206's own
       class). They are here first so that any finding on a J2 or J3 world can
       be told apart from a finding that has been true of the hub all along. */
    {
      id: 'j1-hub', year: 'j1', cls: 'Demo-8A', as: 'anya', hub: true, root: '.hub',
      what: 'the J1 hub (the control for the two year worlds below)',
      must: ['button.tile'],
      drive: async () => { await page.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null, { timeout: 20000 }); }
    },
    {
      id: 'j1-kit', year: 'j1', cls: 'Demo-8A', as: 'anya', hub: true, root: '#kit-body',
      what: 'the Agent Kit, open (the control for the two wardrobes below)',
      extras: ['.kit-rank-name', '.kit-next-label', '.kit-theme-name', '.kit-theme-tag', '.kit-state', '.kit-foot', '.kit-chip-name'],
      must: ['.kit-rank-name', '.kit-foot', '.kit-theme-name'],
      drive: async () => {
        await page.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null, { timeout: 20000 });
        await page.evaluate(() => { if (window.App && App.openKit) App.openKit(); });
        await sleep(900);
      }
    },
    /* ---- THE TWO NEW YEAR WORLDS (K11a) ----------------------------------
       The hub she lands on and the wardrobe Lesson 1 tells her to open. Both
       are measured under that year's own skins only — a J2 look on a J1 lesson
       screen is a combination the server refuses and the wardrobe never offers,
       so measuring it could only ever invent a fault. J2's lesson surfaces
       follow below. */
    {
      id: 'j2-hub', year: 'j2', cls: 'Demo-9A', as: 'aoife', hub: true, root: '.hub',
      what: 'the J2 hub on The Workbench (her first-ever screen)',
      must: ['button.tile', '.hub-year, .year-title, h1'],
      drive: async () => { await page.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null, { timeout: 15000 }); }
    },
    {
      id: 'j2-kit', year: 'j2', cls: 'Demo-9A', as: 'aoife', hub: true, root: '#kit-body',
      what: 'The Kit Locker, open (every registry word she reads)',
      extras: ['.kit-rank-name', '.kit-next-label', '.kit-theme-name', '.kit-theme-tag', '.kit-state', '.kit-foot', '.kit-chip-name'],
      must: ['.kit-rank-name', '.kit-foot', '.kit-theme-name'],
      drive: async () => {
        await page.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null, { timeout: 15000 });
        await page.evaluate(() => { if (window.App && App.openKit) App.openKit(); });
        await sleep(900);
      }
    },
    {
      id: 'j3-hub', year: 'j3', cls: 'Demo-10A', as: 'orla', hub: true, root: '.hub',
      what: 'the J3 hub in The Screening Room (her first-ever screen)',
      must: ['button.tile', '.hub-year, .year-title, h1'],
      drive: async () => { await page.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null, { timeout: 15000 }); }
    },
    {
      id: 'j3-kit', year: 'j3', cls: 'Demo-10A', as: 'orla', hub: true, root: '#kit-body',
      what: 'Wardrobe, open (every registry word she reads)',
      extras: ['.kit-rank-name', '.kit-next-label', '.kit-theme-name', '.kit-theme-tag', '.kit-state', '.kit-foot', '.kit-chip-name'],
      must: ['.kit-rank-name', '.kit-foot', '.kit-theme-name'],
      drive: async () => {
        await page.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null, { timeout: 15000 });
        await page.evaluate(() => { if (window.App && App.openKit) App.openKit(); });
        await sleep(900);
      }
    },
    /* ---- J2 LESSON 1's OWN LANDMARK SCREENS (16 Aug 2026) ----------------
       Measured on BOTH new J2 themes as well as The Workbench, which is what
       §4b's readability clause asks for: a look she can equip at the end of
       this very lesson must not make the lesson she just did unreadable. */
    {
      id: 'j2-inspect-rules', year: 'j2', cls: 'Demo-9A', as: 'aoife', lesson: '1',
      what: 'the six room rules, stated before she is tested on them',
      extras: ['.insp-rules li', '.intro-lead', '.insp-how-lead', '.insp-intro-steps li'],
      must: ['.insp-rules', '.insp-intro-steps'],
      drive: async () => {
        if (!await advanceUntil('.insp-rules', 22, VIA_J2)) throw new Error('never reached the inspection rules card');
      }
    },
    {
      id: 'j2-inspect-scene', year: 'j2', cls: 'Demo-9A', as: 'aoife', lesson: '1',
      what: 'an inspection scene with nothing flagged (zone names, count, file note)',
      extras: ['.insp-tab', '.insp-lead', '.insp-count', '.insp-note', '.insp-zone-name', '.insp-file'],
      must: ['.insp-stage', '.insp-file', '.insp-note'],
      drive: async () => {
        if (!await advanceUntil('.insp-rules', 22, VIA_J2)) throw new Error('never reached the inspection rules card');
        if (!await clickIn('.chunk-host .primary-btn', 1600)) throw new Error('no way into the first scene');
        await page.waitForSelector('.insp-stage', { timeout: 8000 });
      }
    },
    {
      id: 'j2-inspect-report', year: 'j2', cls: 'Demo-9A', as: 'aoife', lesson: '1',
      what: 'the filed inspection report (every row she reads back)',
      extras: ['.insp-score', '.insp-row-tag', '.insp-row-name', '.insp-row-say', '.insp-next'],
      must: ['.insp-report', '.insp-rows', '.insp-score'],
      drive: async () => {
        if (!await advanceUntil('.insp-rules', 22, VIA_J2)) throw new Error('never reached the inspection rules card');
        if (!await clickIn('.chunk-host .primary-btn', 1200)) throw new Error('no way into the first scene');
        await page.waitForSelector('.insp-stage', { timeout: 8000 });
        await page.evaluate(() => { const z = document.querySelector('.insp-zone'); if (z) z.click(); });
        await sleep(300);
        await page.evaluate(() => document.querySelector('.insp-file').click());
        await page.waitForSelector('.insp-report', { timeout: 8000 });
      }
    },
    {
      id: 'j2-question', year: 'j2', cls: 'Demo-9A', as: 'aoife', lesson: '1',
      what: 'a Snapshot question card (the shared question renderer on a J2 skin)',
      extras: ['.q-stem', '.q-opt', '.runner-progress'],
      must: ['.q-stem', '.q-opt'],
      drive: async () => {
        if (!await advanceUntil('.q-opt', 60, VIA_J2)) throw new Error('never reached a question card');
      }
    },
    /* ---- J3 LESSON 1's OWN LANDMARK SCREENS (16 Aug 2026) ---------------
       Measured on The Screening Room and on both new J3 themes. The Compass
       result is the one screen in the lesson that could read as a verdict, so
       it is measured deliberately rather than swept up with the rest. */
    {
      id: 'j3-code', year: 'j3', cls: 'Demo-10A', as: 'orla', lesson: '1',
      what: 'a Studio Code case card (the shared question renderer on a J3 skin)',
      extras: ['.q-stem', '.q-opt', '.runner-progress'],
      must: ['.q-stem', '.q-opt'],
      drive: async () => {
        if (!await advanceUntil('.q-opt', 30, VIA_J2)) throw new Error('never reached a case card');
      }
    },
    {
      id: 'j3-compass-board', year: 'j3', cls: 'Demo-10A', as: 'orla', lesson: '1',
      what: 'the compass board before any tap (its settle button must explain itself)',
      extras: ['.cmp-q', '.cmp-side', '.cmp-locked-note', '.cmp-settle'],
      must: ['.cmp-rows', '.cmp-side', '.cmp-locked-note'],
      drive: async () => {
        if (!await advanceUntil('.cmp-rows', 90, VIA_J3)) throw new Error('never reached the compass board');
      }
    },
    {
      id: 'j3-compass-result', year: 'j3', cls: 'Demo-10A', as: 'orla', lesson: '1',
      what: 'the compass result (the one screen that could read as a verdict)',
      extras: ['.cmp-dial-a', '.cmp-dial-b', '.cmp-result h2', '.cmp-route', '.cmp-note', '.cmp-done'],
      must: ['.cmp-result', '.cmp-dial', '.cmp-route'],
      drive: async () => {
        if (!await advanceUntil('.cmp-rows', 90, VIA_J3)) throw new Error('never reached the compass board');
        await page.evaluate(() => document.querySelectorAll('.cmp-row').forEach(r => {
          const b = r.querySelector('.cmp-side'); if (b) b.click();
        }));
        await sleep(400);
        await page.evaluate(() => document.querySelector('.cmp-settle').click());
        await page.waitForSelector('.cmp-result', { timeout: 8000 });
        await sleep(1200);
      }
    },
    {
      id: 'j3-route-card', year: 'j3', cls: 'Demo-10A', as: 'orla', lesson: '1',
      what: 'the two-routes card and its picture caption',
      extras: ['.step-card h3, .step-title', '.step-body, .step-text', 'figcaption, .step-cap'],
      must: ['.confirm-step'],
      drive: async () => {
        if (!await advanceUntil('.cmp-rows', 90, VIA_J3)) throw new Error('never reached the compass board');
        await page.evaluate(() => document.querySelectorAll('.cmp-row').forEach(r => {
          const b = r.querySelector('.cmp-side'); if (b) b.click();
        }));
        await sleep(400);
        await page.evaluate(() => document.querySelector('.cmp-settle').click());
        await page.waitForSelector('.cmp-result', { timeout: 8000 });
        await clickIn('.cmp-done', 1400);
        if (!await advanceUntil('.confirm-step', 20, VIA_J3)) throw new Error('never reached the two-routes card');
      }
    }
  ];

  const rows = [];
  const gaps = [];
  for (const S of (ONLY_SURFACE ? SURFACES.filter(s => s.id === ONLY_SURFACE) : SURFACES)) {
    /* fresh route per surface: state from a previous drive is a different screen */
    await page.goto(BASE + '/ks3-dt/platform/index.html?class=' + (S.cls || 'Demo-8A') +
      '&as=' + (S.as || 'anya'), { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    /* UNLOCK THE LESSON THIS SURFACE LIVES IN. J1's demo class ships with its
       lessons delivered; J2's and J3's do not, so a lesson surface on those
       years opened onto "lesson 1 is locked" and the whole run crashed. The
       walkers already seed this the same way — one line, same dev store. */
    if (!S.hub && S.cls && S.cls !== 'Demo-8A') {
      await page.evaluate((cls) => {
        const db = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
        const now = Math.floor((Date.now() - 1767225600000) / 60000);
        db.locks = db.locks || {}; db.locks[cls] = db.locks[cls] || {};
        for (const n of ['1', '2', '3', '4', '5']) db.locks[cls][n] = { u: now, on: 1 };
        localStorage.setItem('ks3dt-dev', JSON.stringify(db));
      }, S.cls);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(1800);
    }
    await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
    await sleep(500);
    if (!S.hub) await openLesson(S.lesson);
    await S.drive();
    /* a hub surface has no .chunk-host — its "did we arrive" test is its own
       `must` list below, which is stricter anyway */
    const reached = S.hub ? true : await page.evaluate(() => !!document.querySelector('.chunk-host') &&
      document.querySelector('.chunk-host').textContent.trim().length > 40);
    if (!reached) { findings.push('could not reach the ' + S.id + ' surface — the walk stopped'); continue; }
    /* THE SURFACE MUST REALLY BE THE SURFACE (DFM 204's lesson at element scale):
       a drive that silently half-arrives measures a screen nobody is on, and
       prints a clean pass for surfaces it never saw. Each surface names what must
       be present, and a miss is a FAILURE, never a quiet skip. */
    if (S.must) {
      const missing = await page.evaluate((sels) => sels.filter(x => !document.querySelector(x)), S.must);
      if (missing.length) {
        findings.push(S.id + ': the drive never reached ' + missing.join(', ') +
          ' — the surface was not measured');
        console.log('  ✗ ' + S.id + ': never reached ' + missing.join(', '));
        continue;
      }
    }

    /* only the skins THIS year can wear (see the note at themesForYear) */
    const themes = ONLY_THEME ? [ONLY_THEME] : themesForYear(S.year || 'j1');
    for (const th of themes) {
      /* switch skins through the app's OWN code path, not by poking CSS */
      await page.evaluate((id) => {
        if (window.App && App.state && App.state.me) { App.state.me.th = id; App.applyKit(); }
      }, th);
      await sleep(420);
      /* AN ELEMENT BELOW AN INTERNAL SCROLL FOLD IS NOT MEASURABLE AGAINST A
         FULL-PAGE SHOT. The kit modal scrolls inside itself, so the "Done"
         button's document rect landed on the page background behind the modal
         and the gate reported dark ink at 1.39:1 on a perfectly good gold
         button — a fault the app does not have (DFM 146a). The modal is
         therefore laid out in full for the measurement: nothing about the
         COLOURS changes, only whether the glyphs are somewhere the camera can
         see them. */
      if (S.root) await page.addStyleTag({ content:
        '.ols-modal, .ols-modal-card, #kit-body { max-height: none !important; overflow: visible !important; }' });
      await sleep(200);
      const rects = await page.evaluate(COLLECT, [S.extras || [], HIS.map(h => h.sel), S.root || null]);
      const shot = await page.screenshot({ fullPage: true });
      const measured = await page.evaluate(MEASURE, ['data:image/png;base64,' + shot.toString('base64'), rects]);
      measured.forEach(m => { if (!m.skip) rows.push(Object.assign({ theme: th, surface: S.id, year: S.year || 'j1' }, m)); });
      /* A SURFACE THAT MEASURED NOTHING IS NOT A PASS (DFM 204). The J2 hub
         printed "ALL PASSED" on zero measurements the first time this ran,
         because the hub has an EMPTY .chunk-host and the collector rooted
         itself there. Silence read as cleanliness, which is the exact fault. */
      if (!rects.length) findings.push(S.id + ' (' + th + '): the collector found no text at all under "' +
        (S.root || '.chunk-host') + '" — the surface was not measured');

      /* THE CONTROL-GAP PROBE (his first finding, DFM 207a): "the sign the
         contract button touches the back to the desk button." Two controls that
         touch read as one control, and a child aiming for one hits the other.
         Measured on the rendered screen, once per surface — geometry does not
         change with the skin. */
      if (th === themes[0]) {
        const tight = await page.evaluate(() => {
          const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
          const ctrls = Array.from(document.querySelectorAll('.chunk-host button, .chunk-host input, .chunk-host select'))
            .filter(vis).map(el => ({ el: el, r: el.getBoundingClientRect(),
              name: (el.className || el.tagName) + ' :: ' + (el.textContent || '').trim().slice(0, 28) }));
          const out = [];
          for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) {
            const a = ctrls[i].r, b = ctrls[j].r;
            const overlapX = a.left < b.right && b.left < a.right;
            const overlapY = a.top < b.bottom && b.top < a.bottom;
            let gap = null;
            if (overlapX && !overlapY) gap = b.top >= a.bottom ? b.top - a.bottom : a.top - b.bottom;
            else if (overlapY && !overlapX) gap = b.left >= a.right ? b.left - a.right : a.left - b.right;
            /* A LIST IS NOT A CROWD. Stacked options (.std-outcome) and the
               contract cards sit 8px apart BY DESIGN and read as one group of
               like things. What he hit was two controls of DIFFERENT jobs —
               "Sign the contract" and "Back to the desk" — touching, where a
               near-miss press does something else entirely. So: same class AND
               same parent = a designed group; anything else needs room. */
            const sameKind = ctrls[i].el.parentElement === ctrls[j].el.parentElement &&
              ctrls[i].el.className === ctrls[j].el.className;
            if (gap !== null && gap < 10 && !sameKind) out.push({ a: ctrls[i].name, b: ctrls[j].name, gap: Math.round(gap * 10) / 10 });
          }
          return out;
        });
        tight.forEach(t => {
          gaps.push(S.id + ': "' + t.a + '" and "' + t.b + '" are ' + t.gap + 'px apart');
        });
      }
      if (th === themes[0]) {
        fs.writeFileSync(path.join(SHOTS, 'readability-' + S.id + '-' + th +
          (EXPECT_FAIL ? '-PREFIX' : '') + '.png'), shot);
      }
    }
    log('measured ' + S.id + ' (' + (S.year || 'j1') + ') across ' + themes.length + ' skin(s): ' + themes.join(', '));
  }

  await browser.close();

  /* ------------------------------------------------------------- the verdict */
  console.log('\nREADABILITY — rendered pixels, every skin (floors 4.5:1, or 3:1 for large text)\n');
  const floorFor = (r) => (r.icon || r.large) ? 3.0 : 4.5;
  const bad = rows.filter(r => r.ratio < floorFor(r) && !r.icon);
  const badMarks = rows.filter(r => r.icon && r.ratio < 3.0);
  /* group by element so twelve skins do not print as twelve separate faults */
  const byEl = {};
  bad.forEach(r => {
    const k = r.surface + ' ' + r.sel + ' :: "' + (r.text || '').slice(0, 34) + '"';
    (byEl[k] = byEl[k] || []).push(r);
  });
  Object.entries(byEl).sort((a, b) => a[1][0].ratio - b[1][0].ratio).forEach(([k, list]) => {
    const worst = list.reduce((a, b) => a.ratio < b.ratio ? a : b);
    const themesHit = [...new Set(list.map(r => r.theme))];
    console.log('  ✗ ' + k);
    console.log('      worst ' + worst.ratio + ':1 (needs ' + floorFor(worst) + ') — ink ' +
      worst.ink + ' on plate ' + worst.plate + ', ' + Math.round(worst.px) + 'px/' + worst.weight);
    const yearSkins = themesForYear(worst.year || 'j1').length;
    console.log('      skins affected: ' + (themesHit.length === yearSkins
      ? 'ALL ' + yearSkins + ' of that year\'s skins — this is not the skin, it is the surface'
      : themesHit.join(', ')));
    findings.push(k + ' — ' + worst.ratio + ':1 on ' + themesHit.length + ' skin(s)');
  });
  if (!bad.length) console.log('  every measured element clears its floor on every skin');
  if (badMarks.length) {
    const byMark = {};
    badMarks.forEach(r => { (byMark[r.surface + ' ' + r.sel] = byMark[r.surface + ' ' + r.sel] || []).push(r); });
    console.log('\n  NON-TEXT MARKS below 3:1 (stars, spanners, arrows — reported, not failed;');
    console.log('  a deliberately unlit star is MEANT to be quiet, and that is a judgement, not a gate):');
    Object.entries(byMark).forEach(([k, l]) => {
      const w = l.reduce((a, b) => a.ratio < b.ratio ? a : b);
      console.log('    · ' + k + ' — worst ' + w.ratio + ':1 on ' + [...new Set(l.map(x => x.theme))].length + ' skin(s)');
    });
  }

  /* his four, named individually whatever else happened */
  console.log('\n  HIS FOUR SURFACES (DFM 207g):');
  HIS.forEach(h => {
    const mine = rows.filter(r => (r.his || []).includes(h.sel));
    if (!mine.length) { console.log('    ?  ' + h.what + ' — not on any surface measured'); return; }
    const worst = mine.reduce((a, b) => a.ratio < b.ratio ? a : b);
    const pass = worst.ratio >= floorFor(worst);
    console.log('    ' + (pass ? '✓' : '✗') + '  ' + h.what + ' — worst ' + worst.ratio + ':1');
  });

  console.log('\n  CONTROL GAPS (two controls closer than 10px read as one):');
  if (!gaps.length) console.log('    every pair of controls has room between them');
  gaps.forEach(g => { console.log('    ✗ ' + g); findings.push(g); });

  console.log('\n  ' + rows.length + ' element/skin measurements, ' + Object.keys(byEl).length + ' failing element(s).');
  if (errors.length) console.log('  console errors: ' + errors.length);

  if (EXPECT_FAIL) {
    /* THE CONTROL (DFM 196): on the build he sat, his surfaces MUST be caught */
    const caught = Object.keys(byEl).length + gaps.length;
    console.log('\nCONTROL MODE — pointed at the build he sat.');
    if (caught > 0) { console.log('CONTROL PASSED — ' + caught + ' unreadable element(s) caught on his own build.'); process.exit(0); }
    console.log('CONTROL FAILED — his screen measured clean, so this gate proves nothing.');
    process.exit(1);
  }
  if (findings.length) { console.log('\nqa-readability: FAILED — ' + findings.length + ' finding(s).'); process.exit(1); }
  console.log('\nqa-readability: ALL PASSED');
})().catch(e => { console.error('qa-readability crashed: ' + e.message); process.exit(2); });
