#!/usr/bin/env node
/* capture-deck-shots.js — the pupil screens that go ON the teacher deck
 * (DFM 219b: "screenshots on the presentations would be necessary... the
 * teacher saying 'you're going to see this, which means...' and can actually
 * point to the screenshot on the board so that it becomes familiar to the
 * students when they see it for themselves").
 *
 * Every shot is taken from the RUNNING app on the current build — never reused
 * from an older set (DFM 219h). Each one is then framed in the lesson's own
 * theme colour by make-deck-art's frameShot, so a screenshot on the board looks
 * deliberate rather than pasted.
 *
 * The Vault's MATCHED pop needs two pupils, so it drives two browser contexts
 * at once, the way qa-l5-sweep does for Press Night.
 *
 * Usage: node capture-deck-shots.js [--base http://localhost:8140]
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('../record-tutorial/node_modules/playwright');
const { THEMES, frameShot } = require('./make-deck-art.js');

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8140');
const OUT = path.join(__dirname, '..', '..', 'platform', 'assets', 'img', 'deck', 'j1-01');
const RAW = path.join(OUT, '_raw');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const theme = THEMES['j1-01'];

fs.mkdirSync(RAW, { recursive: true });

/* stage a fresh pupil exactly as the walkers do */
async function pupil(ctx, who, pairing, fresh) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-8A&as=' + who,
    { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  /* THE PREVIEW "SERVER" IS localStorage, SO TWO PUPILS MUST SHARE ONE BROWSER
     CONTEXT — a second context is a second world, and the two can never see
     each other's queue entry. (That is why the first attempt kept pairing
     Anya with the simulated bot: Cara was in a different universe.) So only
     the FIRST pupil clears the store; the second joins the one already there. */
  if (fresh !== false) {
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(1800);
  }
  await page.evaluate((p) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: p };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, pairing);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile'))
      .find(e => /Lesson\s*1(?!\d)/i.test(e.textContent));
    if (t) t.click();
  });
  await sleep(2600);
  return page;
}

/* shoot the CARD, not the whole browser: a deck slide wants the thing itself */
async function shootCard(page, name, sel) {
  /* the MATCHED state is a pop-up (`.badge-pop.pair-pop`), not a card, and it
     sits OVER the vault door — so a shot of `.chunk-host .card` catches the
     wrong thing, or nothing at all when the card behind is inert. Callers name
     the element they actually mean. */
  const el = (sel && await page.$(sel)) ||
    await page.$('.chunk-host .card') || await page.$('.chunk-host');
  const raw = path.join(RAW, name + '.png');
  await el.screenshot({ path: raw });
  const framed = path.join(OUT, 'shot-' + name + '.png');
  const size = await frameShot(raw, framed, theme);
  console.log('  shot-' + name + '.png  ' + size.w + 'x' + size.h);
}

/* click forward until a predicate says we have arrived */
async function advanceTo(page, test, budget) {
  for (let i = 0; i < (budget || 90); i++) {
    if (await page.evaluate(test)) return true;
    await page.evaluate(() => {
      const vis = e => e && e.offsetParent !== null;
      const host = document.querySelector('.chunk-host');
      if (!host) return;
      const pop = document.querySelector('.badge-pop button'); if (pop) return pop.click();
      const nx = Array.from(host.querySelectorAll('.q-feedback button')).filter(vis)[0]; if (nx) return nx.click();
      const o = Array.from(host.querySelectorAll('.q-opt:not([disabled])')).filter(vis)[0]; if (o) return o.click();
      const c = host.querySelector('.confirm-step:not(.ticked):not([disabled]):not(.locked)'); if (c) return c.click();
      const d = document.querySelector('.dossier-cta'); if (vis(d)) return d.click();
      const tour = host.querySelector('.tour-callout button'); if (vis(tour)) return tour.click();
      const b = Array.from(host.querySelectorAll('.primary-btn:not([disabled])')).filter(vis)[0]; if (b) return b.click();
    });
    await sleep(650);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const ONLY = argOf('--only', '');

  /* ---- 1. the solo shots (pairing off, so the Vault is reachable alone) ---- */
  if (ONLY !== 'paired') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 940 }, deviceScaleFactor: 2 });
  const page = await pupil(ctx, 'anya', 0);

  await advanceTo(page, () => !!document.querySelector('.chunk-host .q-opt:not([disabled])'));
  /* answer one so the verdict + reason are on screen — that IS the teaching point */
  await page.evaluate(() => {
    const o = Array.from(document.querySelectorAll('.chunk-host .q-opt:not([disabled])'))
      .filter(e => e.offsetParent !== null)[0];
    if (o) o.click();
  });
  await sleep(1200);
  await shootCard(page, 'warmup');

  await advanceTo(page, () => !!document.querySelector('.chunk-host .vault-file'));
  await shootCard(page, 'vault-door');

  await advanceTo(page, () => {
    const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
    return s && s.id === 'realvault';
  }, 140);
  await shootCard(page, 'realvault');

  await advanceTo(page, () => {
    const s = window.App && App.state && App.state.chunks[App.state.chunkIdx];
    return s && s.id === 'b4-exam' && !!document.querySelector('.chunk-host .q-opt');
  }, 140);
  await shootCard(page, 'exam-question');
  /* and the "Answer saved" state, which is the one that worries them */
  await page.evaluate(() => {
    const o = Array.from(document.querySelectorAll('.chunk-host .q-opt:not([disabled])'))
      .filter(e => e.offsetParent !== null)[0];
    if (o) o.click();
  });
  await sleep(1100);
  await shootCard(page, 'exam-saved');

  await advanceTo(page, () => !!document.querySelector('.chunk-host .codename-card'), 200);
  await shootCard(page, 'codename');

  await advanceTo(page, () => !!document.querySelector('.chunk-host .se-card'), 260);
  await shootCard(page, 'selfeval');
  await ctx.close();
  }

  /* ---- 2. the paired Vault states: two real pupils, two contexts ----
     ORDER MATTERS AND IT IS NOT ARBITRARY. The preview spawns a simulated
     partner ("Pixel (simulated)") for anyone left waiting alone for eight
     seconds — a kindness for one-tab testing, and poison for a deck slide: a
     screenshot projected to a class must not name a partner who does not
     exist (rule 35, eight feet wide). So BOTH pupils are staged at the Vault
     gate BEFORE either presses Open, and the second presses within the window.
     Then the pop names a real classmate's codename, which is what a pupil will
     actually see. */
  const cPair = await browser.newContext({ viewport: { width: 1280, height: 940 }, deviceScaleFactor: 2 });
  const pA = await pupil(cPair, 'anya', 1);
  const pB = await pupil(cPair, 'cara', 1, false);
  /* the gate is identified by the CHUNK, never by the word "Vault" — the
     briefing and the tour both mention the Vault, so a text match stopped
     Cara three screens early, and the "press Open" that followed pressed
     whatever primary button happened to be on that screen instead. Anya then
     waited alone past the eight-second bot timer, every time. */
  const atGate = (p) => advanceTo(p, () => {
    const st = window.App && App.state && App.state.chunks[App.state.chunkIdx];
    if (!st || st.id !== 'b3-vault') return false;
    const h = document.querySelector('.chunk-host');
    return !!h && !!h.querySelector('.primary-btn');
  }, 160);
  await atGate(pA);
  await atGate(pB);
  /* press the door BY ITS NAME. The Vault chunk opens on an intro card whose
     own primary button is "Show me" — so "the first primary button" queued
     nobody, and Anya sat alone until the bot arrived. Keep clicking forward
     until the real door button is on screen, then press that. */
  const press = async (p) => {
    for (let i = 0; i < 8; i++) {
      const hit = await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.chunk-host button'))
          .filter(e => e.offsetParent !== null && !e.disabled);
        const door = btns.find(e => /open the vault/i.test(e.textContent || ''));
        if (door) { door.click(); return 'door'; }
        const on = btns.find(e => e.classList.contains('primary-btn'));
        if (on) { on.click(); return 'forward'; }
        return 'none';
      });
      if (hit === 'door') return true;
      await sleep(700);
    }
    return false;
  };
  /* THE TWO PRESSES MUST BE CLOSE TOGETHER. Taking the waiting shot between
     them cost several seconds (screenshot + framing), which pushed Cara's
     press past the eight-second bot timer — so Anya kept being paired with
     the simulated partner no matter how the queue was staged. The waiting
     state is captured on its own afterwards, from a lone pupil, which is
     exactly the state it depicts. */
  await press(pA);
  await sleep(900);
  await press(pB);
  let matched = false;
  for (let i = 0; i < 25 && !matched; i++) {
    await sleep(800);
    /* a modal is position:fixed, so offsetParent is null on it — asking that
       question reported "never paired" on runs that had in fact paired */
    matched = await pA.evaluate(() => {
      const pop = document.querySelector('.pair-pop');
      return !!pop && (pop.textContent || '').trim().length > 20;
    });
  }
  await shootCard(pA, 'vault-matched', '.pair-pop .badge-pop-card');
  const who = await pA.evaluate(() => {
    const pop = document.querySelector('.pair-pop');
    return pop ? (pop.textContent.match(/Agent [A-Za-z ()]+/) || [''])[0] : '';
  });
  console.log(matched ? '  (paired: ' + who + ')' : '  !! never paired — check the shot before using it');
  /* now the waiting state, on its own: a third pupil at the gate with nobody
     left to pair with sees exactly this */
  const pC = await pupil(cPair, 'anya2', 1, false);
  await atGate(pC);
  await press(pC);
  await sleep(2200);
  await shootCard(pC, 'vault-waiting');
  if (/simulated/i.test(who)) {
    console.error('  !! the partner is the PREVIEW BOT — that name cannot go on a slide.');
    await browser.close();
    process.exit(4);
  }
  await browser.close();
  if (!matched) process.exit(3);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
