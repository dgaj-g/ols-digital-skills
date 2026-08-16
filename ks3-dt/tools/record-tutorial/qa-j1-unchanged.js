#!/usr/bin/env node
/* qa-j1-unchanged.js — J1 RENDERS BYTE-IDENTICALLY, PROVED IN PIXELS.
 *
 * THE RISK THIS EXISTS FOR. The J2/J3 year-worlds round (K11a) changes how the
 * shell resolves "the default look": today a pupil whose record holds th='' is
 * given NO theme object at all and the stylesheet's own :root values paint the
 * screen; afterwards she is given her YEAR's base look by name. For J1 that
 * name is midnight, and midnight is supposed to BE the shell defaults — but
 * "supposed to" is exactly the kind of claim DFM 194c calls a hypothesis. Five
 * signed-off lessons read this registry. If one knob differs, every J1 screen
 * shifts colour and no lesson harness would notice.
 *
 * So this compares RENDERED PIXELS at pinned landmark surfaces, before and
 * after — the standing control named in the design proposals §A, and the same
 * discipline as DFM 146b (a guard asserts the rendered result, never the source).
 *
 *   node qa-j1-unchanged.js --pin      capture the baseline (run BEFORE the change)
 *   node qa-j1-unchanged.js            compare against it (run AFTER)
 *
 * A missing baseline is a FAILURE, never a skip: a comparison that quietly has
 * nothing to compare against prints a pass it has not earned (DFM 204).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const BASE = argOf('--base', 'http://localhost:8121');
const PIN = process.argv.includes('--pin');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform',
  'qa-l2-l5-review', 'j1-unchanged');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const sha = (b) => crypto.createHash('sha1').update(b).digest('hex').slice(0, 16);

const FAILS = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) FAILS.push(m); };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  /* THE STARFIELD IS DRAWN WITH Math.random, so two runs of the SAME build
     produce two different pictures. Pinning that would be DFM 199's exact
     fault — a pass/fail gate built on a number that is not deterministic — and
     it would fail noisily while proving nothing. So the page gets a seeded
     generator before any script runs: the starfield still draws through its own
     real code path with its own real knobs (density, base, accent, ratio), it
     just draws the SAME stars twice. A theme knob that moves still moves the
     picture; only the dice are held still. */
  await page.addInitScript(() => {
    let s = 0x2f6e2b1;
    Math.random = function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s |= 0;
      return ((s >>> 0) % 1000000) / 1000000;
    };
  });
  /* AND THE SECOND SOURCE OF DRIFT: the ambient layers drift on 40–64 second CSS
     loops, so the phase they are caught at depends on how long the walk happened
     to take. Two runs of one build differ, and the gate cries wolf. They are
     stopped for the shot — which does NOT weaken the control, because an fx
     layer's EXISTENCE and its colours are captured by the shell signature below,
     value by value, and that is the thing a theme change actually moves. */
  const FREEZE = '*, *::before, *::after { animation: none !important; transition: none !important; }';
  const freeze = async () => { await page.addStyleTag({ content: FREEZE }); await sleep(250); };

  /* A SHOT IS ONLY TAKEN WHILE THE SCREEN IS FINISHED (DFM 225b: a capture that
     photographs whatever happens to be there, and labels it as the target, is
     how three deck slides shipped with the wrong screenshot).
     The first cut of this waited for the card's TEXT to stop growing — and the
     text was stable while the moth photograph was still sizing, so it pinned a
     card cut off mid-image. Two things now have to be true together: every image
     in the page has loaded, and the document has stopped changing height. */
  const settle = async () => {
    /* (1) THE CARD'S OWN FINISHED SIGNAL. A stable height is not the same thing
       as a finished card: the briefing types itself out paragraph by paragraph,
       and BETWEEN paragraphs the height and the character count both sit still
       for a moment. Two pins were taken in exactly that gap, one of them
       missing a whole paragraph of a signed-off lesson. The briefing reveals its
       Continue button only when the reveal is done, so THAT is the predicate. */
    await page.waitForFunction(() => {
      const d = document.querySelector('.dossier');
      if (!d) return true;                       // not a briefing card; nothing to wait for
      const cta = d.querySelector('.dossier-cta');
      return !!cta && !cta.hidden;
    }, null, { timeout: 25000 });
    /* (2) LAZY IMAGES. The hook photographs carry loading="lazy", so one below
       the fold has not even started while `complete` is already true of the
       rest. Walk the page to the bottom and back to make them all load. */
    await page.evaluate(async () => {
      const H = document.documentElement.scrollHeight;
      for (let y = 0; y <= H; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
    });
    await page.waitForFunction(() => Array.from(document.images).every(i => i.complete && i.naturalWidth > 0),
      null, { timeout: 20000 }).catch(() => {});
    /* (3) AND ONLY THEN, a settled height. */
    let last = -1, still = 0;
    for (let i = 0; i < 40; i++) {
      const h = await page.evaluate(() => document.documentElement.scrollHeight +
        ':' + ((document.querySelector('.chunk-host') || {}).textContent || '').length);
      still = (h === last) ? still + 1 : 0;
      if (still >= 3) return true;
      last = h; await sleep(350);
    }
    throw new Error('the screen never settled — refusing to pin a shot of a page still moving');
  };

  console.log('qa-j1-unchanged — ' + (PIN ? 'PINNING the baseline' : 'comparing against the baseline'));
  console.log('  base: ' + BASE + '\n  shots: ' + OUT + '\n');

  /* boot exactly as the other walkers do, on a fresh record, default look */
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-8A&as=anya', { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    db.pupils = db.pupils || {};
    /* 235 XP: the top of the ladder, so the kit modal renders EVERY rank row,
       every unlocked swatch and the "top clearance" line — the surface with the
       most registry-driven words on it is the one worth pinning. */
    db.pupils['Demo-8A:anya.murphy@demo'] = Object.assign(
      db.pupils['Demo-8A:anya.murphy@demo'] || { n: 'Anya Murphy', cn: 'Kestrel', j: 1, g: '' },
      { xp: 235, mx: 235, th: '', fx: '', L: {} });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(900);

  const SURFACES = [];

  /* 1 — THE HUB at the default look: the starfield, the gradient, the tiles */
  await page.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null, { timeout: 15000 });
  await settle();
  await freeze();
  SURFACES.push({ id: 'hub-default', shot: await page.screenshot({ fullPage: true }) });

  /* 1b — THE SHELL SIGNATURE: every theme knob as the BROWSER resolved it, plus
     which ambient layers exist. This is what the resolution change could break,
     read from the live document rather than from the stylesheet, and it is
     immune to animation phase and to the starfield's dice. */
  SURFACES.push({
    id: 'shell-signature',
    text: await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const KNOBS = ['--space-0', '--space-1', '--space-2', '--space-3', '--glass-d', '--glass-d-solid',
        '--line-d', '--text-d', '--muted-d', '--panel', '--panel-hover', '--topbar-bg', '--toast-bg',
        '--aurora-b-color', '--bg-glow-b', '--gold', '--gold-hi', '--gold-deep', '--gold-rgb',
        '--gold-hi-rgb', '--accent-ink', '--space-deep'];
      const lines = KNOBS.map(k => k + ' = ' + cs.getPropertyValue(k).trim());
      const fx = document.getElementById('fx-layer');
      lines.push('fx-layer = ' + (fx ? fx.className + ' [' + fx.children.length + ']' : 'none'));
      lines.push('body background = ' + getComputedStyle(document.body).backgroundColor);
      lines.push('body::before background = ' + getComputedStyle(document.body, '::before').backgroundImage);
      const c = document.getElementById('stars');
      lines.push('stars canvas = ' + (c ? c.width + 'x' + c.height : 'none'));
      return lines.join('\n');
    })
  });

  /* 2 — THE KIT MODAL: every rank name, every swatch, the footer sentence, the
     lock captions. If one registry word moved, it moved here. */
  await page.evaluate(() => { if (window.App && App.openKit) App.openKit(); });
  await settle();
  await freeze();
  SURFACES.push({ id: 'kit-modal', shot: await page.screenshot({ fullPage: true }) });
  const kitText = await page.evaluate(() => {
    const b = document.querySelector('#kit-body');
    return b ? b.textContent.replace(/\s+/g, ' ').trim() : '';
  });
  SURFACES.push({ id: 'kit-modal-text', text: kitText });
  await page.evaluate(() => { if (window.App && App.closeModal) App.closeModal('kit-modal'); });
  await sleep(500);

  /* 3 — A LESSON CARD: the reading surface inside a locked, signed-off lesson */
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('button.tile'))
      .find(c => /Lesson\s*4(?![0-9])/i.test(c.textContent));
    if (t) t.click();
  });
  await sleep(2400);
  await settle();
  await freeze();
  SURFACES.push({ id: 'lesson4-open', shot: await page.screenshot({ fullPage: true }) });

  await browser.close();

  check(errors.length === 0, 'zero console errors on the J1 walk' +
    (errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''));

  /* ------------------------------------------------------------- verdict */
  const manPath = path.join(OUT, 'baseline.json');
  if (PIN) {
    const man = {};
    SURFACES.forEach(S => {
      if (S.shot) { fs.writeFileSync(path.join(OUT, S.id + '.png'), S.shot); man[S.id] = sha(S.shot); }
      else { fs.writeFileSync(path.join(OUT, S.id + '.txt'), S.text); man[S.id] = sha(Buffer.from(S.text, 'utf8')); }
      console.log('  PIN   ' + S.id + ' → ' + man[S.id]);
    });
    fs.writeFileSync(manPath, JSON.stringify({ pinnedAt: 'pre-change', shots: man }, null, 1));
    console.log('\nqa-j1-unchanged: baseline pinned (' + SURFACES.length + ' surfaces). Re-run without --pin after the change.');
    process.exit(0);
  }

  if (!fs.existsSync(manPath)) {
    console.log('  FAIL  there is no pinned baseline to compare against — run --pin on the pre-change tree first');
    console.log('\nqa-j1-unchanged: 1 FAILURE(S)');
    process.exit(1);
  }
  const man = JSON.parse(fs.readFileSync(manPath, 'utf8')).shots || {};
  const names = Object.keys(man);
  check(names.length === SURFACES.length,
    'the run reached all ' + names.length + ' pinned surfaces (reached ' + SURFACES.length + ')');
  SURFACES.forEach(S => {
    const now = S.shot ? sha(S.shot) : sha(Buffer.from(S.text, 'utf8'));
    const was = man[S.id];
    const ok = was === now;
    if (ok) { check(true, S.id + ' renders identically to the pre-change build (' + was + ')'); return; }

    /* THE SHELL SIGNATURE IS COMPARED KEY BY KEY, NOT BY HASH — because the two
       ways it can move are not the same thing. A knob whose VALUE changed, or a
       knob that VANISHED, changes what a J1 pupil sees and is a failure. A knob
       that is NEWLY DECLARED cannot change her screen on its own: nothing reads
       it unless the stylesheet reads it too, and if it does, the pixel shots
       above would catch it. So an addition is allowed — and PRINTED, loudly,
       because an allowance nobody can see is the silent exemption DFM 213 bans. */
    if (S.id === 'shell-signature') {
      const pairs = (t) => Object.fromEntries(String(t).split('\n').map(l => {
        const i = l.indexOf(' = ');
        return i < 0 ? [l, ''] : [l.slice(0, i), l.slice(i + 3)];
      }));
      const wasTxt = fs.existsSync(path.join(OUT, 'shell-signature.txt'))
        ? fs.readFileSync(path.join(OUT, 'shell-signature.txt'), 'utf8') : '';
      const A = pairs(wasTxt), B = pairs(S.text);
      const moved = Object.keys(A).filter(k => A[k] !== '' && B[k] !== A[k]);
      const lost = Object.keys(A).filter(k => !(k in B));
      const added = Object.keys(B).filter(k => !(k in A) || (A[k] === '' && B[k] !== ''));
      added.forEach(k => console.log('  NOTE  a knob is newly declared this round: ' + k +
        ' = ' + B[k] + ' (adding a custom property cannot move a pixel on its own; the shots above are the proof that nothing did)'));
      check(moved.length === 0, 'no existing theme knob changed value' +
        (moved.length ? ' — MOVED: ' + moved.map(k => k + ' ' + A[k] + ' → ' + B[k]).join(', ') : ''));
      check(lost.length === 0, 'and none disappeared' + (lost.length ? ' — LOST: ' + lost.join(', ') : ''));
      fs.writeFileSync(path.join(OUT, 'shell-signature.AFTER.txt'), S.text);
      return;
    }

    check(false, S.id + ' renders identically to the pre-change build (' + (was || 'not pinned') +
      ' → ' + now + ')');
    if (S.shot) fs.writeFileSync(path.join(OUT, S.id + '.AFTER.png'), S.shot);
    if (S.text) fs.writeFileSync(path.join(OUT, S.id + '.AFTER.txt'), S.text);
  });

  console.log('');
  if (FAILS.length) {
    console.log('qa-j1-unchanged: ' + FAILS.length + ' FAILURE(S)');
    FAILS.forEach(f => console.log('   ' + f));
    process.exit(1);
  }
  console.log('qa-j1-unchanged: ALL GREEN — every pinned J1 landmark surface is pixel-identical.');
})();
