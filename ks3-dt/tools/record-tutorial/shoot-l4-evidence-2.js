#!/usr/bin/env node
/* Retake of evidence-c2 and evidence-c3 (L4 spec Part B4).
 *
 * The first pass dragged the shark blind and produced two pictures that did not
 * match their own captions: c2 had the shark NEAR a fish rather than on it, and
 * c3 — captioned "the whole ocean, empty" — still had a fish in shot. A picture
 * that contradicts its caption is rule 35 broken by the evidence itself.
 *
 * So this pass reads the REAL sprite positions out of the Scratch VM and works
 * from them: it drags the shark onto an actual fish clone for c2, and for c3 it
 * waits until the VM reports no visible fish left before it shoots.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { ScratchDriver, sleep } = require('./lib/driver');

const SB3 = path.join(process.env.HOME,
  'Desktop/Claude Work/KS3 DT Platform/sb3/shark-attack-broken-edition.sb3');
const OUT = path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'l4');
const EVID = path.join(__dirname, 'qa-l2-l5-review', 'l4-sit-fixes');

/* Scratch stage is 480x360 with (0,0) at the centre; the DOM canvas may be
   scaled, so convert through the measured stage rect. */
const toScreen = (st, sx, sy) => ({
  x: st.x + (sx + 240) * (st.w / 480),
  y: st.y + (180 - sy) * (st.h / 360),
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
  });
  const page = await ctx.newPage();
  const log = (m) => console.log('[evidence2] ' + m);
  const drv = new ScratchDriver(page, log);
  await drv.openEditor();
  await drv.loadProject(SB3);
  await drv.selectSprite('Shark');
  await sleep(1500);

  const st = await drv.stageArea();
  const clip = { x: Math.round(st.x), y: Math.round(st.y), width: Math.round(st.w), height: Math.round(st.h) };

  /* the VM is on window.vm in the Scratch GUI build */
  const sprites = () => page.evaluate(() => {
    const vm = window.vm;
    if (!vm) return null;
    return vm.runtime.targets
      .filter(t => !t.isStage && t.visible)
      .map(t => ({ name: t.sprite && t.sprite.name, original: t.isOriginal, x: t.x, y: t.y }));
  });
  const fish = async () => {
    const all = await sprites();
    if (!all) throw new Error('window.vm not reachable — cannot read real sprite positions');
    return all.filter(s => /fish/i.test(s.name || ''));
  };
  const shot = async (name) => {
    const p = path.join(OUT, name);
    await page.screenshot({ path: p, clip });
    fs.copyFileSync(p, path.join(EVID, name));
    log('wrote ' + name + ' (' + fs.statSync(p).size + ' bytes)');
  };
  const flag = async () => { const f = await drv.greenFlag(); await page.mouse.click(f.cx, f.cy); };
  const stop = async () => {
    await page.evaluate(() => { const s = document.querySelector('[class*="stop-all"]'); if (s) s.click(); });
    await sleep(400);
  };
  const dragSharkTo = async (sx, sy, ms) => {
    const all = await sprites();
    const sh = all.find(s => /shark/i.test(s.name || ''));
    const from = toScreen(st, sh.x, sh.y), to = toScreen(st, sx, sy);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
      await sleep((ms || 700) / steps);
    }
    await page.mouse.up();
  };

  /* ---- c2: the shark's mouth ON a fish, score still reading 0 ---- */
  await flag();
  await sleep(900);
  let f = await fish();
  log('c2 fish on stage: ' + JSON.stringify(f));
  if (!f.length) throw new Error('no fish on stage to bite');
  await dragSharkTo(f[0].x - 6, f[0].y, 700);      // land the shark right on it
  await sleep(60);
  await shot('evidence-c2.png');
  log('c2 monitor: ' + (await drv.monitorText()));
  await stop();

  /* ---- c3: keep eating until the VM reports the water genuinely empty ---- */
  await flag();
  await sleep(800);
  for (let i = 0; i < 14; i++) {
    const left = await fish();
    if (!left.length) break;
    await dragSharkTo(left[0].x, left[0].y, 420);
    await sleep(260);
  }
  const left = await fish();
  log('c3 fish remaining after the hunt: ' + left.length);
  if (left.length) throw new Error('c3 would still show ' + left.length + ' fish — the caption says the ocean is empty, so the picture must be');
  await dragSharkTo(120, 60, 600);                 // shark clear of the coral
  await sleep(400);
  await shot('evidence-c3.png');
  await stop();

  await ctx.close();
  await browser.close();
  console.log('RETAKES DONE — c2 and c3 now match their captions.');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
