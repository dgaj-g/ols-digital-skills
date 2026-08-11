#!/usr/bin/env node
/* shoot-l4-evidence.js — the four case evidence photos (L4 spec Part B4).
 *
 * WHY: the deeper pass found that no case file carried an image, though the
 * casework engine has supported one all along — four walls of text with no
 * visual anchor. Each ticket now shows the player's own screenshot of the
 * symptom they are complaining about.
 *
 * RULE 35 — these are REAL captures of the REAL broken game, never mock-ups.
 * Every one is taken by loading shark-attack-broken-edition.sb3 into the real
 * Scratch editor, staging the actual moment, and cropping the stage area.
 *
 * Usage: node shoot-l4-evidence.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { ScratchDriver, sleep } = require('./lib/driver');

const SB3 = path.join(process.env.HOME,
  'Desktop/Claude Work/KS3 DT Platform/sb3/shark-attack-broken-edition.sb3');
const OUT = path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'l4');
const EVID = path.join(__dirname, 'qa-l2-l5-review', 'l4-sit-fixes');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(EVID, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
  });
  const page = await ctx.newPage();
  const log = (m) => console.log('[evidence] ' + m);
  const drv = new ScratchDriver(page, log);

  await drv.openEditor();
  await drv.loadProject(SB3);
  await drv.selectSprite('Shark');
  await sleep(1500);

  const st = await drv.stageArea();
  if (!st) throw new Error('stage canvas not found');
  const clip = { x: Math.round(st.x), y: Math.round(st.y), width: Math.round(st.w), height: Math.round(st.h) };
  log('stage area ' + JSON.stringify(clip));

  const shot = async (name) => {
    const p = path.join(OUT, name);
    await page.screenshot({ path: p, clip });
    fs.copyFileSync(p, path.join(EVID, name));
    log('wrote ' + name + ' (' + fs.statSync(p).size + ' bytes)');
  };
  const flag = async () => {
    const f = await drv.greenFlag();
    await page.mouse.click(f.cx, f.cy);
  };
  const stop = async () => {
    await page.evaluate(() => {
      const s = document.querySelector('[class*="stop-all"]');
      if (s) s.click();
    });
    await sleep(400);
  };
  /* drag the shark across the stage with the real mouse (the broken build's
     right arrow does nothing, which is the whole point of case 01) */
  const dragShark = async (toXFrac, toYFrac, ms) => {
    const box = await drv.stageArea();
    const fx = box.x + box.w / 2, fy = box.y + box.h / 2;
    const tx = box.x + box.w * toXFrac, ty = box.y + box.h * toYFrac;
    await page.mouse.move(fx, fy);
    await page.mouse.down();
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(fx + (tx - fx) * i / steps, fy + (ty - fy) * i / steps);
      await sleep((ms || 900) / steps);
    }
    await page.mouse.up();
    await sleep(300);
  };

  /* ---- c4 FIRST: the white void only exists for the first second ---- */
  await flag();
  await sleep(320);                       // inside the white-backdrop window
  await shot('evidence-c4.png');
  await sleep(1600);
  await stop();

  /* ---- c1: the shark hard against the right wall ---- */
  await flag();
  await sleep(900);
  await dragShark(0.955, 0.55, 1100);     // press it to the right-hand wall
  await sleep(400);
  await shot('evidence-c1.png');
  await stop();

  /* ---- c2: a fish being eaten while the score sits on 0 ---- */
  await flag();
  await sleep(700);
  let mon = '';
  for (let pass = 0; pass < 6; pass++) {
    await dragShark(pass % 2 ? 0.12 : 0.88, 0.3 + (pass % 3) * 0.22, 800);
    mon = await drv.monitorText();
    if (/score\s*0/i.test(mon || '')) {
      /* the bite is happening somewhere on this sweep; grab it mid-sweep */
      await shot('evidence-c2.png');
      break;
    }
  }
  log('c2 monitor read: ' + mon);
  if (!fs.existsSync(path.join(OUT, 'evidence-c2.png'))) await shot('evidence-c2.png');
  await stop();

  /* ---- c3: the ocean empty — no fish respawn in the broken build ---- */
  await flag();
  await sleep(700);
  for (let i = 0; i < 5; i++) await dragShark(i % 2 ? 0.1 : 0.9, 0.25 + i * 0.14, 700);
  await sleep(2500);                      // let the water clear
  await dragShark(0.5, 0.5, 600);
  await sleep(400);
  await shot('evidence-c3.png');
  await stop();

  /* every capture must be a real, non-blank image */
  for (const n of ['evidence-c1.png', 'evidence-c2.png', 'evidence-c3.png', 'evidence-c4.png']) {
    const sz = fs.statSync(path.join(OUT, n)).size;
    if (sz < 3000) throw new Error(n + ' is only ' + sz + ' bytes — that is not a real capture');
  }
  await ctx.close();
  await browser.close();
  console.log('ALL FOUR EVIDENCE PHOTOS CAPTURED -> ' + OUT);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
