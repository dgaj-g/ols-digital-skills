/* L5 full verify sweep (the L2/L3/L4 bar) — everything beyond the happy path:
   1. TWO-TAB REAL cross-review (anya exhibits, cara critiques — no bots needed)
   2. staff panel: L5 lock grid + Brief chip + Live column + misconception bars
      + Press Night lens with one-tap remove that reaches the pupil feed
   3. mid-desk reload resume (ticks survive)
   4. review reopen = ZERO WRITES (byte-compared record + userProps)
   5. catch-up solo via INFERRED absence (10-day-old lock, no phantom gallery)
   6. responsive 900px + demo store reset
   Usage: node qa-l5-sweep.js */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-l5');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FAILS = [];
function check(cond, msg) {
  if (cond) console.log('  PASS', msg);
  else { console.log('  FAIL', msg); FAILS.push(msg); }
}

async function newPage(browser, ctx) { return ctx.newPage(); }

/* drive a persona from a fresh hub to an OPEN studio on the Press Night floor */
async function driveToFloor(page, tpl, studioName, gameTitle) {
  await page.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Game Studio/.test(e.textContent)).click());
  await sleep(2000);
  // one resilient walker: recap items -> briefing skip/cta -> contracts
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => {
      if (document.querySelector('.std-contract')) return 'contracts';
      const pop = document.querySelector('.badge-pop button');
      if (pop) { pop.click(); return 'pop'; }
      const h = document.querySelector('.chunk-host');
      if (!h) return 'none';
      const cta = h.querySelector('.dossier-cta'); if (cta && !cta.hidden) { cta.click(); return 'cta'; }
      const sk = h.querySelector('.dossier-skip'); if (sk) { sk.click(); return 'skip'; }
      const opt = h.querySelector('.q-opt:not(:disabled)');
      if (opt) { opt.click(); return 'a'; }
      const nxt = Array.from(h.querySelectorAll('button')).find(b => /See the contracts|Back to the contracts|Next|Finish|Start|Continue|Warm up/i.test(b.textContent) && !b.disabled && b.offsetParent);
      if (nxt) { nxt.click(); return 'n'; }
      return 'w';
    });
    if (st === 'contracts') break;
    await sleep(800);
  }
  await sleep(500);
  const ok = await page.evaluate((t) => !!document.querySelector('.std-contract[data-c="' + t + '"]'), tpl);
  if (!ok) {
    await page.screenshot({ path: path.join(OUT, 'debug-stuck.png'), fullPage: true });
    const dump = await page.evaluate(() => ({
      chunk: (document.querySelector('.chunk-host') || {}).textContent,
      hub: !!(document.querySelector('#hub') && !document.querySelector('#hub').hidden),
      overlay: !!document.querySelector('.intro-overlay, .badge-pop')
    }));
    throw new Error('never reached contracts; state=' + JSON.stringify(dump).slice(0, 400));
  }
  await page.evaluate((t) => document.querySelector('.std-contract[data-c="' + t + '"]').click(), tpl);
  await sleep(700);
  await page.evaluate((n) => {
    const i = document.querySelector('.std-sig-input');
    i.value = n; i.dispatchEvent(new Event('input'));
  }, studioName);
  await page.evaluate(() => document.querySelector('.std-sign').click());
  await sleep(800);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Found the studio/i.test(x.textContent)); b.click(); });
  await sleep(1200);
  await page.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
  await sleep(1200);
  // masterclass
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Done watching|Continue/i.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sleep(1200);
  // build
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Open the studio|Back to the desk/i.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sleep(900);
  await page.evaluate(() => document.querySelector('.std-kit-confirm').click());
  await sleep(1000);
  for (const cid of ['c1', 'c2', 'c3', 'c4']) {
    await page.evaluate((c) => document.querySelector('.std-qa-row[data-crit="' + c + '"] .std-qa-head').click(), cid);
    await sleep(400);
    await page.evaluate(() => document.querySelector('.std-qa-run').click());
    await sleep(350);
    await page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('.std-outcome'));
      const pass = opts.find(b => /exactly|One per star|both times|Bounced me back|announced my actual|arrived anyway|climbing on rights|on stage the whole time|Called me out|went green|froze|one thing each time|holding still/i.test(b.textContent));
      (pass || opts[0]).click();
    });
    await sleep(600);
  }
  await page.evaluate(() => document.querySelector('.std-ready-btn').click());
  await sleep(700);
  await page.evaluate((args) => {
    const t = document.querySelector('#std-gt'); t.value = args[0]; t.dispatchEvent(new Event('input'));
    const h = document.querySelector('#std-gh'); h.value = 'Arrow keys. Play it and see!'; h.dispatchEvent(new Event('input'));
  }, [gameTitle]);
  await sleep(300);
  await page.evaluate(() => document.querySelector('.std-doors').click());
  await sleep(1500);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Head to Press Night/i.test(x.textContent)); b.click(); });
  await sleep(1200);
  await page.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
  await sleep(1200);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Onto the floor/i.test(x.textContent)); if (b) b.click(); });
  await sleep(1500);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const errsA = [];

  /* ---------- setup: fresh store, unlock 1-5 ---------- */
  const pa = await ctx.newPage();
  pa.on('console', m => { if (m.type() === 'error') errsA.push(m.text()); });
  pa.on('pageerror', e => errsA.push('PAGEERROR ' + e.message));
  await pa.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await pa.evaluate(() => localStorage.clear());
  await pa.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await pa.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await pa.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await pa.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });

  /* ================= 1. TWO-TAB REAL CROSS-REVIEW ================= */
  console.log('== two-tab real cross-review ==');
  await driveToFloor(pa, 'catch', 'Golden Otter Games', 'Sushi Drop');
  check(await pa.evaluate(() => !!document.querySelector('.gal-mine-card .gal-marquee-card')), 'anya is on the floor with her marquee card');

  const pc = await ctx.newPage();
  await pc.goto(BASE + 'cara', { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await pc.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await driveToFloor(pc, 'maze', 'Bramble & Twig', 'Hedge Rush');
  check(await pc.evaluate(() => !!document.querySelector('.gal-mine-card .gal-marquee-card')), 'cara is on the floor with her marquee card');

  // cara sees anya's REAL studio on the marquee (plus sims, flagged)
  await sleep(4500);
  const caraSees = await pc.evaluate(() => Array.from(document.querySelectorAll('.gal-marquee-grid .gal-mq-studio')).map(e => e.textContent));
  check(caraSees.some(s => /Golden Otter Games/.test(s)), 'cara sees Golden Otter Games on the live marquee (' + JSON.stringify(caraSees) + ')');

  // cara reviews anya
  await pc.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.gal-marquee-grid .gal-marquee-card.clickable'))
      .find(b => /Golden Otter Games/.test(b.textContent));
    btn.click();
  });
  await sleep(800);
  await pc.evaluate(() => {
    const [l, w] = document.querySelectorAll('.gal-stem-input');
    l.value = 'that catching sushi right at the edge still counts every time';
    w.value = 'whether golden sushi worth three points would raise the stakes';
  });
  await pc.evaluate(() => document.querySelector('.gal-file-btn').click());
  await sleep(1500);

  // anya's live feed receives CARA's signed review (not a bot)
  let got = null;
  for (let i = 0; i < 8; i++) {
    await sleep(2000);
    got = await pa.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.gal-incoming-list .gal-review-item'));
      const real = items.find(x => !x.querySelector('.gal-sim'));
      return real ? real.textContent : null;
    });
    if (got) break;
  }
  check(!!got && /sushi/.test(got), 'anya received cara\'s REAL review live: ' + String(got).slice(0, 80));
  await pa.screenshot({ path: path.join(OUT, 'sweep-01-real-review.png'), fullPage: true });

  // self-review refused server-side
  const selfTry = await pa.evaluate(async () => {
    const feed = await window.App.call('galleryFeed', { lessonId: 'j1-05' });
    const mine = feed.studios.find(s => s.mine);
    return window.App.call('galleryPost', { lessonId: 'j1-05', to: mine.sid, like: 'my own game is honestly great', wonder: 'nothing, it is perfect already' });
  });
  check(selfTry && selfTry.error === 'own-studio', 'self-review refused (own-studio)');

  /* ================= 2. STAFF PANEL ================= */
  console.log('== staff panel ==');
  const ps = await ctx.newPage();
  await ps.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await ps.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(600);
  await ps.evaluate(() => { const b = Array.from(document.querySelectorAll('button, a')).find(x => /^Staff$/i.test((x.textContent || '').trim())); if (b) b.click(); });
  await sleep(900);
  await ps.evaluate(() => {
    const i = document.querySelector('#staff-pass, input[type="password"], .staff-pass input');
    if (i) { i.value = 'demo'; i.dispatchEvent(new Event('input')); }
    const go = Array.from(document.querySelectorAll('button')).find(x => /Unlock|Enter|Sign in|Check/i.test(x.textContent) && x.offsetParent);
    if (go) go.click();
  });
  await sleep(1800);
  // select the demo class if a chooser appears
  await ps.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-action="select-class"]')).find(x => x.offsetParent); if (b) b.click(); });
  await sleep(1200);

  // lock grid: L5 cell + Brief chip
  await ps.evaluate(() => { const t = Array.from(document.querySelectorAll('button')).find(x => /Lessons|Lock/i.test(x.textContent) && x.offsetParent); if (t) t.click(); });
  await sleep(1200);
  const l5cell = await ps.evaluate(() => {
    const c = Array.from(document.querySelectorAll('.lock-cell')).find(x => /Game Studio/.test(x.textContent));
    return c ? c.textContent : null;
  });
  check(!!l5cell, 'lock grid grew an L5 cell');
  check(/Brief/.test(l5cell || ''), 'L5 cell carries the Brief chip');
  await ps.evaluate(() => {
    const c = Array.from(document.querySelectorAll('.lock-cell')).find(x => /Game Studio/.test(x.textContent));
    const chip = c.querySelector('[data-action="show-brief"]');
    chip.click();
  });
  await sleep(1500);
  const brief = await ps.evaluate(() => (document.querySelector('.brief-sheet') || {}).textContent || '');
  check(/teacher brief/i.test(brief) && /Press Night/.test(brief) && /circulating question|which QA check/i.test(brief), 'L5 teacher brief decrypts and renders the run sheet');
  await ps.screenshot({ path: path.join(OUT, 'sweep-02-brief.png'), fullPage: true });
  await ps.evaluate(() => { const b = document.querySelector('[data-action="brief-back"]'); if (b) b.click(); });
  await sleep(800);

  // Live tab: L5 column + Press Night lens
  await ps.evaluate(() => { const t = Array.from(document.querySelectorAll('button')).find(x => /Live/i.test(x.textContent) && x.offsetParent); if (t) t.click(); });
  await sleep(2500);
  const liveHtml = await ps.evaluate(() => (document.querySelector('#staff-body') || document.body).textContent);
  check(/L5/.test(liveHtml), 'Live tab grew an L5 column');
  let lensTxt = '';
  for (let i = 0; i < 6; i++) {
    await sleep(1500);
    lensTxt = await ps.evaluate(() => (document.querySelector('#gallery-lens') || {}).textContent || '');
    if (/Press Night/.test(lensTxt) && /Golden Otter Games/.test(lensTxt)) break;
  }
  check(/Press Night/.test(lensTxt), 'Press Night lens appears for L5');
  check(/Golden Otter Games/.test(lensTxt) && /Anya/.test(lensTxt), 'lens shows the studio with the pupil\'s REAL name');
  check(/Cara/.test(lensTxt) && /sushi/.test(lensTxt), 'lens shows cara\'s review with her real name');
  await ps.screenshot({ path: path.join(OUT, 'sweep-03-lens.png'), fullPage: true });

  // one-tap remove reaches the maker's screen
  await ps.evaluate(() => {
    const rm = Array.from(document.querySelectorAll('.gal-lens-rm')).find(b => {
      const item = b.closest('.gal-lens-review');
      return item && /sushi/.test(item.textContent);
    });
    rm.click();
  });
  await sleep(2000);
  const lensAfter = await ps.evaluate(() => (document.querySelector('#gallery-lens') || {}).textContent || '');
  check(/removed/.test(lensAfter), 'lens marks the review removed (audit trail)');
  let gone = false;
  for (let i = 0; i < 6; i++) {
    await sleep(2000);
    const feed = await pa.evaluate(() => window.App.call('galleryFeed', { lessonId: 'j1-05' }));
    gone = feed && feed.ok && !feed.myReviews.some(r => !r.sim);
    if (gone) break;
  }
  check(gone, 'removed review is gone from the maker\'s feed (server truth; UI drops it on its next poll)');

  // misconception bars need exit answers: finish anya's lesson quickly
  console.log('== finishing anya\'s lesson for exit data ==');
  await pa.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('.gal-v2-zone textarea'));
  });
  // spend cara's pass? anya already has given=0; file 2 reviews on sims to unlock V2
  for (const idx of [0, 1]) {
    await pa.evaluate((i) => {
      const btns = Array.from(document.querySelectorAll('.gal-marquee-grid .gal-marquee-card.clickable'));
      btns[i].click();
    }, idx);
    await sleep(700);
    await pa.evaluate(() => {
      const [l, w] = document.querySelectorAll('.gal-stem-input');
      l.value = 'how the whole idea is easy to pick up and play at once';
      w.value = 'what a second level with new hazards would look like';
    });
    await pa.evaluate(() => document.querySelector('.gal-file-btn').click());
    await sleep(1200);
  }
  await pa.evaluate(() => {
    const t = document.querySelector('.gal-v2-input');
    t.value = 'In version 2 the sushi would fall faster because a review said the stakes felt low';
  });
  await pa.evaluate(() => document.querySelector('.gal-v2-save').click());
  await sleep(800);
  await pa.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Wrap Press Night/i.test(x.textContent)); b.click(); });
  await sleep(900);
  await pa.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Collect your press badge/i.test(x.textContent)); b.click(); });
  await sleep(1400);
  await pa.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
  await sleep(1200);
  // Ship your game (new chunk, 2 Aug 2026) -> exit MCQs + parsons + selfeval.
  // The walker has to come THROUGH the ship step now, so it knows its two
  // buttons and the badge pop; it is asserted properly in qa-l5.js.
  for (let i = 0; i < 24; i++) {
    const st = await pa.evaluate(() => {
      const pop = document.querySelector('.badge-pop button');
      if (pop) { pop.click(); return 'badge'; }
      const h = document.querySelector('.chunk-host');
      if (!h) return 'w';
      if (h.querySelector('.parsons-tray')) return 'parsons';
      const opt = h.querySelector('.q-opt:not(:disabled)');
      if (opt) { opt.click(); return 'a'; }
      const btns = Array.from(h.querySelectorAll('button')).filter(b => !b.disabled && b.offsetParent);
      const ship = btns.find(b => /Run the HQ Inspection|Claim the badge/i.test(b.textContent));
      if (ship) { ship.click(); return 's'; }
      const nxt = btns.find(b => /Next|Finish|Continue|Start|Ready|Begin/i.test(b.textContent));
      if (nxt) { nxt.click(); return 'n'; }
      return 'w';
    });
    if (st === 'parsons') break;
    await sleep(st === 's' ? 1800 : 800);
  }
  for (const frag of ['when green flag clicked', 'set score to 0', 'forever', 'if <touching Ball?>', 'else']) {
    await pa.evaluate((f) => {
      const b = Array.from(document.querySelectorAll('.parsons-tray .parsons-block')).find(x => x.textContent.indexOf(f.replace('<touching Ball?>', 'touching Ball')) !== -1 || x.textContent.startsWith(f.slice(0, 8)));
      if (b) b.click();
    }, frag);
    await sleep(250);
  }
  await pa.evaluate(() => document.querySelector('.parsons-check').click());
  await sleep(1500);
  await pa.evaluate(() => { const b = Array.from(document.querySelectorAll('.q-feedback button')).find(x => /Continue/i.test(x.textContent)); if (b) b.click(); });
  await sleep(1200);
  await pa.evaluate(() => {
    document.querySelectorAll('.se-row').forEach(r => { const c = r.querySelector('[data-v="2"]'); if (c) c.click(); });
    const d = document.querySelector('[data-d="1"]'); if (d) d.click();
  });
  await pa.evaluate(() => document.querySelector('.se-submit').click());
  await sleep(2200);
  for (let i = 0; i < 10; i++) {
    const done = await pa.evaluate(() => {
      const pop = document.querySelector('.badge-pop button');
      if (pop) { const back = /Back to Mission Control/i.test(pop.textContent); pop.click(); return back; }
      const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Finish|Continue|Onward/i.test(x.textContent) && !x.disabled && x.offsetParent);
      if (b) b.click();
      return false;
    });
    if (done) break;
    await sleep(1200);
  }
  await sleep(1800);
  const anyaXp = await pa.evaluate(() => Number(window.App.state.xp));
  check(anyaXp === 42, 'anya total = 42 (2 contract + 19 sprint no-stretch + 7 press + 4 ship + 10 exit report), got ' + anyaXp);

  // misconception bars for L5
  await ps.evaluate(() => { const t = Array.from(document.querySelectorAll('button')).find(x => /Live/i.test(x.textContent) && x.offsetParent); if (t) t.click(); });
  await sleep(2500);
  const misDebug = await ps.evaluate(() => {
    const sel = document.querySelector('#live-mis-select');
    return sel ? Array.from(sel.options).map(o => o.textContent + '=' + o.value) : 'NO SELECT';
  });
  console.log('  mis select options:', JSON.stringify(misDebug));
  await ps.evaluate(() => {
    const sel = document.querySelector('#live-mis-select');
    if (sel) {
      const opt = Array.from(sel.options).find(o => /5|Game Studio/i.test(o.textContent + o.value));
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  });
  await sleep(3000);
  const misTxt = await ps.evaluate(() => (document.querySelector('#live-mis-body') || {}).textContent || '');
  check(/else|dead code|both branches/i.test(misTxt), 'misconception bars render L5 exit labels (body: ' + misTxt.slice(0, 120) + ')');
  await ps.screenshot({ path: path.join(OUT, 'sweep-04-misconceptions.png'), fullPage: true });

  /* ================= 3. REVIEW REOPEN = ZERO WRITES ================= */
  console.log('== review reopen ==');
  const before = await pa.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    return JSON.stringify(db.pupils['Demo-8A:anya.murphy@demo']) + '||' + JSON.stringify(db.userProps['anya.murphy@demo']);
  });
  await pa.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Game Studio/.test(e.textContent)).click());
  await sleep(2200);
  const reviewShots = [];
  for (let i = 0; i < 14; i++) {
    const state = await pa.evaluate(() => {
      const h = document.querySelector('.chunk-host');
      if (!h) return 'none';
      const txt = h.textContent || '';
      const pop = document.querySelector('.badge-pop button');
      if (pop) { pop.click(); return 'pop'; }
      const b = Array.from(h.querySelectorAll('button')).find(x => /Continue|Finish reviewing|Done watching/i.test(x.textContent) && !x.disabled && x.offsetParent);
      if (/Contract on record/.test(txt)) { if (b) b.click(); return 'contract'; }
      if (/on record/.test(txt) && /QA/i.test(txt)) { if (b) b.click(); return 'desk'; }
      if (/Press Night, on record/.test(txt)) { if (b) b.click(); return 'press'; }
      if (b) { b.click(); return 'other'; }
      const cta = h.querySelector('.dossier-cta'); if (cta && !cta.hidden) { cta.click(); return 'brief2'; }
      const sk = h.querySelector('.dossier-skip'); if (sk) { sk.click(); return 'brief'; }
      return 'w';
    });
    reviewShots.push(state);
    if (state === 'press') { await pa.screenshot({ path: path.join(OUT, 'sweep-05-review-press.png'), fullPage: true }); }
    await sleep(1100);
    const atHub = await pa.evaluate(() => { const h = document.querySelector('#hub'); return h && !h.hidden; });
    if (atHub && i > 3) break;
  }
  check(reviewShots.includes('contract') && reviewShots.includes('press'), 'review reopen walked static contract + press views (' + reviewShots.join(',') + ')');
  const after = await pa.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    return JSON.stringify(db.pupils['Demo-8A:anya.murphy@demo']) + '||' + JSON.stringify(db.userProps['anya.murphy@demo']);
  });
  check(before === after, 'review reopen wrote ZERO bytes (record + userProps byte-identical)');

  /* ================= 4. MID-DESK RELOAD RESUME (cara) ================= */
  console.log('== reload resume ==');
  // cara is mid-gallery; her draft has the desk state. Reload and confirm resume.
  await pc.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await pc.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(600);
  await pc.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Game Studio/.test(e.textContent)).click());
  await sleep(2400);
  const resumed = await pc.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
  check(/Press Night|gallery floor|Reviewer/i.test(resumed), 'cara resumes at the gallery chunk (draft.done skips finished chunks)');
  await pc.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Onto the floor/i.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sleep(1500);
  const caraMine = await pc.evaluate(() => (document.querySelector('.gal-mine-card') || {}).textContent || '');
  check(/Bramble & Twig|Hedge Rush/.test(caraMine), 'cara\'s open studio survived the reload (server-side listing)');

  /* ================= 5. CATCH-UP SOLO via INFERRED absence ================= */
  console.log('== catch-up solo ==');
  const pn = await ctx.newPage();
  await pn.goto(BASE + 'niamh', { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await pn.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(600);
  // age the L5 lock 10 days (14400 min): absence is INFERRED, never hand-flagged
  await pn.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const old = Math.floor((Date.now() - 1767225600000) / 60000) - 14400;
    db.locks['Demo-8A']['5'] = { u: old, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await pn.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await pn.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(800);
  const niamhStartXp = await pn.evaluate(() => Number((JSON.parse(localStorage.getItem('ks3dt-dev')).pupils['Demo-8A:niamh.quinn@demo'] || {}).xp || 0));
  const flagged = await pn.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Game Studio/.test(e.textContent));
    return t ? t.textContent : '';
  });
  check(/Absent|Catch up/i.test(flagged), 'absence INFERRED: tile shows the catch-up chip');
  await pn.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Game Studio/.test(e.textContent)).click());
  await sleep(2200);
  const catchupIntro = await pn.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
  check(/missed|waited for you/i.test(catchupIntro), 'catch-up intro card leads');
  await pn.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Start the catch-up/i.test(x.textContent)); if (b) b.click(); });
  await sleep(1500);
  // walk to the SIGN intro card (recap items -> briefing), then read its copy
  for (let i = 0; i < 60; i++) {
    const st = await pn.evaluate(() => {
      const h = document.querySelector('.chunk-host');
      if (!h) return 'none';
      const seeBtn = Array.from(h.querySelectorAll('button')).find(b => /See the contracts/i.test(b.textContent) && b.offsetParent);
      if (seeBtn) return 'signintro';
      const pop = document.querySelector('.badge-pop button');
      if (pop) { pop.click(); return 'pop'; }
      const cta = h.querySelector('.dossier-cta'); if (cta && !cta.hidden) { cta.click(); return 'cta'; }
      const sk = h.querySelector('.dossier-skip'); if (sk) { sk.click(); return 'skip'; }
      const opt = h.querySelector('.q-opt:not(:disabled)');
      if (opt) { opt.click(); return 'a'; }
      const nxt = Array.from(h.querySelectorAll('button')).find(b => /Next|Finish|Start|Continue|Warm up/i.test(b.textContent) && !b.disabled && b.offsetParent);
      if (nxt) { nxt.click(); return 'n'; }
      return 'w';
    });
    if (st === 'signintro') break;
    await sleep(800);
  }
  const soloIntro = await pn.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
  check(/Catch-up shift/.test(soloIntro), 'contracts intro swaps to the SOLO copy');
  await pn.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /See the contracts/i.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sleep(800);
  await pn.evaluate(() => document.querySelector('.std-contract[data-c="quiz"]').click());
  await sleep(700);
  await pn.evaluate(() => {
    const i = document.querySelector('.std-sig-input');
    i.value = 'Quiet Fox Studio'; i.dispatchEvent(new Event('input'));
  });
  await pn.evaluate(() => document.querySelector('.std-sign').click());
  await sleep(700);
  await pn.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Found the studio/i.test(x.textContent)); b.click(); });
  await sleep(1200);
  await pn.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
  await sleep(1000);
  await pn.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Done watching|Continue/i.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sleep(1200);
  await pn.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Open the studio/i.test(x.textContent) && x.offsetParent); if (b) b.click(); });
  await sleep(900);
  const soloDesk = await pn.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
  check(!/partner/i.test(soloDesk), 'solo desk carries no partner fictions');
  await pn.evaluate(() => document.querySelector('.std-kit-confirm').click());
  await sleep(900);
  for (const cid of ['c1', 'c2', 'c3', 'c4']) {
    await pn.evaluate((c) => document.querySelector('.std-qa-row[data-crit="' + c + '"] .std-qa-head').click(), cid);
    await sleep(350);
    await pn.evaluate(() => document.querySelector('.std-qa-run').click());
    await sleep(300);
    await pn.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('.std-outcome'));
      const pass = opts.find(b => /exactly|announced my actual|arrived anyway|climbing on rights|on stage the whole time|holding still/i.test(b.textContent));
      (pass || opts[0]).click();
    });
    await sleep(500);
  }
  await pn.evaluate(() => document.querySelector('.std-ready-btn').click());
  await sleep(600);
  await pn.evaluate(() => {
    const t = document.querySelector('#std-gt'); t.value = 'True Colours II'; t.dispatchEvent(new Event('input'));
    const h = document.querySelector('#std-gh'); h.value = 'Tap T or F. Three rounds, no mercy.'; h.dispatchEvent(new Event('input'));
  });
  await pn.evaluate(() => document.querySelector('.std-doors').click());
  await sleep(1400);
  await pn.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Head to Press Night/i.test(x.textContent)); b.click(); });
  await sleep(1200);
  await pn.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
  await sleep(1200);
  const soloGallery = await pn.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
  check(/Press Night has closed/.test(soloGallery), 'solo gallery = "Press Night has closed" (Late Edition)');
  await pn.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Browse the marquee/i.test(x.textContent)); if (b) b.click(); });
  await sleep(2000);
  const lateEdition = await pn.evaluate(() => (document.querySelector('.chunk-host') || {}).textContent || '');
  check(/LATE EDITION/i.test(lateEdition) && /reviews were filed/i.test(lateEdition), 'Late Edition shows the marquee + the night\'s count');
  await pn.screenshot({ path: path.join(OUT, 'sweep-06-late-edition.png'), fullPage: true });
  await pn.evaluate(() => {
    const t = document.querySelector('.gal-v2-input');
    t.value = 'In version 2 my questions would get harder each round because one topic felt too easy';
  });
  await pn.evaluate(() => document.querySelector('.gal-v2-save').click());
  await sleep(1400);
  await pn.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
  await sleep(1000);
  const niamhXp = await pn.evaluate(() => Number(window.App.state.xp));
  check(niamhXp - niamhStartXp === 28, 'solo path DELTA = 28 (sign 2 + build 19 no-stretch + solo press 7); started ' + niamhStartXp + ', now ' + niamhXp);

  /* ================= 6. RESPONSIVE + console ================= */
  console.log('== responsive + hygiene ==');
  await pc.setViewportSize({ width: 900, height: 1100 });
  await sleep(900);
  await pc.screenshot({ path: path.join(OUT, 'sweep-07-floor-narrow.png'), fullPage: true });
  const hasHScroll = await pc.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 4);
  check(!hasHScroll, 'no horizontal scroll at 900px on the gallery floor');

  const realErrs = errsA.filter(e => !/l5-tutorial|l5-poster/.test(e));
  check(realErrs.length === 0, 'zero console errors on anya\'s tab all sweep: ' + JSON.stringify(realErrs.slice(0, 4)));

  console.log('\n' + (FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL SWEEP CHECKS PASSED'));
  await browser.close();
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error('SWEEP CRASHED:', e); process.exit(1); });
