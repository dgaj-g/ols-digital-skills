/* L5 "Game Studio" happy-path QA: real-viewport walk of the whole lesson with
   assertions (XP arithmetic exact, READY button gating, fail->fix->pass flow,
   bot critics, V2 gate, badge chain 2+22+7+10 = 41).
   Usage: node qa-l5.js [tplId]  (default catch) */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-l5');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const TPL = process.argv[2] || 'catch';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const FAILS = [];
function check(cond, msg) {
  if (cond) console.log('  PASS', msg);
  else { console.log('  FAIL', msg); FAILS.push(msg); }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const u = (m.location() && m.location().url) || '';
    if (/l5-tutorial\.mp4|l5-poster\.jpg/.test(u)) return; // video ships later this session
    errs.push(m.text() + (u ? ' @ ' + u : ''));
  });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const shot = n => page.screenshot({ path: path.join(OUT, n + '.png'), fullPage: true });
  /* DFM 104 (1 Aug 2026): card mounts ignore presses for 350ms so a ghost click
     cannot activate the button that lands under the finger. A driver clicks the
     instant an element exists - no hand is that fast - so wait the window out
     and click like a person. Assertions unchanged. */
  const GHOST_WAIT = 420;
  const clickText = async (rx) => {
    await sleep(GHOST_WAIT);
    return page.evaluate((r) => {
      const re = new RegExp(r, 'i');
      const b = Array.from(document.querySelectorAll('button, a.primary-btn')).find(x => re.test(x.textContent) && !x.disabled && x.offsetParent);
      if (b) { b.click(); return true; }
      return false;
    }, rx);
  };
  const xp = () => page.evaluate(() => Number(window.App.state.xp));
  const dismissBadge = async () => {
    for (let i = 0; i < 14; i++) {
      await sleep(GHOST_WAIT);
      const hit = await page.evaluate(() => {
        const b = document.querySelector('.badge-pop button');
        if (b) { b.click(); return true; }
        return false;
      });
      if (hit) { await sleep(600); return true; }
      await sleep(400);
    }
    return false;
  };

  /* ---------- clean store + unlock 1-5 ---------- */
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    /* STALE SINCE 2 Aug 2026, fixed 3 Aug: rule 134 made the Do-Now serve only
       lessons this pupil has COMPLETED, so a freshly-staged pupil correctly got
       an empty warm-up and this harness asserted the impossible. sit-review.js
       was updated in the same commit; this one was missed. Stage her the way a
       real Lesson 5 pupil arrives - lessons 1-4 and the side quest behind her. */
    db.pupils = db.pupils || {};
    const L = {};
    ['1', '2', '3', '4', 'S1'].forEach((n, ix) => { L[n] = [2, 10, 'sit' + n + '=1', '1', '222|1', 100 + ix, 10, 0, '', 0, 0]; });
    db.pupils['Demo-8A:anya.murphy@demo'] = Object.assign(
      db.pupils['Demo-8A:anya.murphy@demo'] || { n: 'Anya Murphy', cn: '', j: 1, xp: 0, g: '' }, { L: L });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(800);
  check(await page.evaluate(() => !!Array.from(document.querySelectorAll('.tile')).find(t => /Game Studio/.test(t.textContent) && !t.classList.contains('is-locked'))), 'hub shows Game Studio unlocked');
  check((await xp()) === 0, 'XP starts at 0');
  await shot('01-hub');

  /* ---------- open L5 + recap ---------- */
  await page.evaluate(() => Array.from(document.querySelectorAll('.tile')).find(e => /Game Studio/.test(e.textContent)).click());
  await sleep(2200);
  let recapItems = 0;
  for (let i = 0; i < 40; i++) {
    const state = await page.evaluate(() => {
      const h = document.querySelector('.chunk-host');
      if (!h) return 'none';
      if (h.querySelector('.dossier')) return 'briefing';
      const opt = h.querySelector('.q-opt:not(:disabled)');
      if (opt) { opt.click(); return 'answered'; }
      const nxt = Array.from(h.querySelectorAll('button')).find(b => /Next|Finish|Start|Warm up|Continue/i.test(b.textContent) && !b.disabled && b.offsetParent);
      if (nxt) { nxt.click(); return 'next'; }
      return 'waiting';
    });
    if (state === 'answered') recapItems++;
    if (state === 'briefing') break;
    await sleep(1000);
  }
  check(recapItems >= 3, 'recap served + answered items (' + recapItems + ')');
  await shot('02-recap-done');

  /* ---------- briefing ---------- */
  /* the briefing's Skip button was removed on 30 Jul - wait for its Continue to
     appear, the way a pupil does, instead of assuming it is already there */
  /* DFM 104: the CTA is revealed after the typing animation and armed at that
     moment, so a click inside the next 350ms is a ghost and is ignored. This
     used to click the instant it appeared and BREAK on "I clicked it", which
     after the guard shipped meant walking on while the briefing was still up.
     Now: wait the window out, click, and only stop once it has actually gone. */
  for (let i = 0; i < 40; i++) {
    const visible = await page.evaluate(() => {
      const c = document.querySelector('.dossier-cta');
      return !!(c && c.offsetParent !== null);
    });
    if (visible) {
      await sleep(GHOST_WAIT);
      await page.evaluate(() => { const c = document.querySelector('.dossier-cta'); if (c) c.click(); });
      await sleep(700);
      const gone = await page.evaluate(() => !document.querySelector('.dossier-cta'));
      if (gone) break;
    }
    await sleep(400);
  }
  await sleep(1600);

  /* ---------- SIGN: contracts ---------- */
  for (let i = 0; i < 10; i++) {
    if (await clickText('See the contracts|Back to the contracts')) break;
    await sleep(700);
  }
  await sleep(900);
  check(await page.evaluate(() => document.querySelectorAll('.std-contract').length === 3), 'three contract cards render');
  await shot('03-contracts');
  await page.evaluate((t) => { document.querySelector('.std-contract[data-c="' + t + '"]').click(); }, TPL);
  await sleep(800);
  await shot('04-contract-full');
  await page.evaluate(() => {
    const i = document.querySelector('.std-sig-input');
    i.value = 'Golden Otter Games';
    i.dispatchEvent(new Event('input'));
  });
  await sleep(300);
  check(await page.evaluate(() => !document.querySelector('.std-sign').disabled), 'sign button enables with a name');
  await page.evaluate(() => document.querySelector('.std-sign').click());
  await sleep(900);
  check(await page.evaluate(() => !!document.querySelector('.std-signature.done')), 'signature lands on the contract');
  await shot('05-signed');
  await clickText('Found the studio');
  await dismissBadge();
  check((await xp()) === 2, 'Founder badge = +2 XP (total 2), got ' + (await xp()));

  /* ---------- MASTERCLASS (video not filmed yet in this run) ---------- */
  await sleep(1200);
  await clickText('Done watching|Continue');
  await sleep(1200);

  /* ---------- BUILD: the Studio Desk ---------- */
  await clickText('Open the studio|Back to the desk');
  await sleep(1000);
  check(await page.evaluate(() => { const b = document.querySelector('.std-ready-btn'); return b && b.classList.contains('dim'); }), 'READY FOR GALLERY starts dim');
  check(await page.evaluate(() => !!document.querySelector('.std-qadesk.locked')), 'QA desk locked until the kit is secured');
  await shot('06-desk-locked');
  await page.evaluate(() => document.querySelector('.std-kit-confirm').click());
  await sleep(1100);
  check(await page.evaluate(() => !document.querySelector('.std-qadesk.locked')), 'kit confirm unlocks the QA desk');

  // blueprint view opens + returns
  await page.evaluate(() => document.querySelector('.std-blueprint-btn').click());
  await sleep(800);
  check(await page.evaluate(() => !!document.querySelector('.std-blueprint img')), 'blueprint shows the blocks image');
  await shot('07-blueprint');
  await page.evaluate(() => document.querySelector('.std-back').click());
  await sleep(800);

  /* c1: FAIL first (fix card), then PASS (FOUND BY QA) */
  await page.evaluate(() => document.querySelector('.std-qa-row[data-crit="c1"] .std-qa-head').click());
  await sleep(600);
  await page.evaluate(() => document.querySelector('.std-qa-run').click());
  await sleep(500);
  check(await page.evaluate(() => document.querySelectorAll('.std-outcome').length >= 3), 'outcome options render');
  await shot('08-outcomes');
  await page.evaluate(() => {
    const fails = Array.from(document.querySelectorAll('.std-outcome'));
    const wrong = fails.find(b => /MISSED|climbing|per miss|ignored|0 stars|still scored|never moved|no reply|stayed on 0/i.test(b.textContent));
    (wrong || fails[0]).click();
  });
  await sleep(900);
  check(await page.evaluate(() => !!document.querySelector('.std-qa-row[data-crit="c1"].fail')), 'fail outcome sets the cross');
  check(await page.evaluate(() => !!document.querySelector('.std-fix-card')), 'cross reveals the fix card');
  await shot('09-fix-card');
  await page.evaluate(() => document.querySelector('.std-qa-run').click());
  await sleep(500);
  await page.evaluate(() => {
    const pass = Array.from(document.querySelectorAll('.std-outcome')).find(b => /exactly 1|exactly one|One per star|0 → 1|Correct!.*climbed|both times|Bounced me back/i.test(b.textContent));
    pass.click();
  });
  await sleep(900);
  check(await page.evaluate(() => !!document.querySelector('.std-qa-row[data-crit="c1"].pass')), 'pass outcome flips cross to tick');
  check(await page.evaluate(() => !!document.querySelector('.std-fq-chip')), 'FOUND BY QA chip shows after fail->pass');

  /* c2-c4: straight passes */
  for (const cid of ['c2', 'c3', 'c4']) {
    await page.evaluate((c) => document.querySelector('.std-qa-row[data-crit="' + c + '"] .std-qa-head').click(), cid);
    await sleep(500);
    await page.evaluate(() => document.querySelector('.std-qa-run').click());
    await sleep(400);
    await page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('.std-outcome'));
      const pass = opts.find(b => /exactly|One per star|0 → 1|both times|Bounced me back|announced my actual|arrived anyway|climbing on rights|on stage the whole time|Called me out|went green|froze|one thing each time|holding still/i.test(b.textContent));
      (pass || opts[0]).click();
    });
    await sleep(800);
  }
  const ticks = await page.evaluate(() => document.querySelectorAll('.std-qa-row.pass').length);
  check(ticks === 4, 'all four QA rows ticked (' + ticks + ')');
  check(await page.evaluate(() => { const b = document.querySelector('.std-ready-btn'); return b && (b.classList.contains('lit') || b.classList.contains('just-lit')); }), 'READY FOR GALLERY lights on the 4th tick');
  await shot('10-ready-lit');

  /* marquee form + open the doors */
  await page.evaluate(() => document.querySelector('.std-ready-btn').click());
  await sleep(800);
  await page.evaluate(() => {
    const t = document.querySelector('#std-gt'); t.value = 'Sushi Drop'; t.dispatchEvent(new Event('input'));
    const h = document.querySelector('#std-gh'); h.value = 'Arrow keys to move. Catch the sushi, dodge the wasabi!'; h.dispatchEvent(new Event('input'));
  });
  await sleep(400);
  check(await page.evaluate(() => document.querySelector('.gal-mq-title').textContent === 'Sushi Drop'), 'marquee preview paints live');
  await shot('11-marquee-form');
  await page.evaluate(() => document.querySelector('.std-doors').click());
  await sleep(1500);
  check(await page.evaluate(() => { const b = document.querySelector('.std-ready-btn'); return b && b.classList.contains('shipped'); }), 'doors open - button shows shipped state');

  /* stretch note then continue */
  await page.evaluate(() => {
    const t = document.querySelector('.std-stretch-note');
    t.value = 'I added a level variable that speeds the fall every five points';
    t.dispatchEvent(new Event('input'));
  });
  await page.evaluate(() => document.querySelector('.std-stretch-confirm').click());
  await sleep(800);
  check(await page.evaluate(() => !!document.querySelector('.std-stretch.done')), 'stretch note accepted');
  await shot('12-desk-shipped');
  await clickText('Head to Press Night');
  await dismissBadge();
  check((await xp()) === 24, 'Shipped badge = +22 (total 24), got ' + (await xp()));

  /* ---------- PRESS NIGHT ---------- */
  await sleep(1200);
  await shot('13-reviewers-code');
  await clickText('Onto the floor');
  await sleep(1500);
  check(await page.evaluate(() => !!document.querySelector('.gal-mine-card .gal-marquee-card')), 'my marquee card renders on the floor');
  check(await page.evaluate(() => document.querySelectorAll('.gal-marquee-grid .gal-marquee-card').length >= 3), 'simulated studios fill the marquee');
  await shot('14-floor');

  /* wait for bot reviews to land (10s + 22s marks) */
  let landed = 0;
  for (let i = 0; i < 16; i++) {
    await sleep(2000);
    landed = await page.evaluate(() => document.querySelectorAll('.gal-incoming-list .gal-review-item').length);
    if (landed >= 2) break;
  }
  check(landed >= 2, 'two Press Bot reviews landed live (' + landed + ')');
  await shot('15-reviews-landing');

  /* file review 1 - but first prove the substance gate blocks thin reviews */
  await page.evaluate(() => document.querySelectorAll('.gal-marquee-grid .gal-marquee-card.clickable')[0].click());
  await sleep(800);
  await page.evaluate(() => {
    const [l, w] = document.querySelectorAll('.gal-stem-input');
    l.value = 'good'; w.value = 'nice';
  });
  await page.evaluate(() => document.querySelector('.gal-file-btn').click());
  await sleep(700);
  check(await page.evaluate(() => /5 real words|Specific/i.test(document.querySelector('.gal-v2-nudge').textContent)), 'thin review blocked by the substance gate');
  await page.evaluate(() => {
    const [l, w] = document.querySelectorAll('.gal-stem-input');
    l.value = 'how the catching gets faster near the end of a run';
    w.value = 'whether a bigger bowl powerup would change the whole game';
  });
  await page.evaluate(() => document.querySelector('.gal-file-btn').click());
  await sleep(1400);
  check(await page.evaluate(() => /1<\/b>/.test(document.querySelector('.gal-passes').innerHTML)), 'press pass counter drops to 1');

  /* review 2 */
  await page.evaluate(() => document.querySelectorAll('.gal-marquee-grid .gal-marquee-card.clickable')[0].click());
  await sleep(800);
  await page.evaluate(() => {
    const [l, w] = document.querySelectorAll('.gal-stem-input');
    l.value = 'that the door only opens when every star is collected first';
    w.value = 'what a moving guard patrolling the middle lane would add';
  });
  await page.evaluate(() => document.querySelector('.gal-file-btn').click());
  await sleep(1400);
  check(await page.evaluate(() => !!document.querySelector('.gal-v2-zone .gal-v2-input')), 'V2 note unlocks after both passes are spent');
  await shot('16-v2-unlocked');

  /* V2 note: thin first, then real */
  await page.evaluate(() => {
    const t = document.querySelector('.gal-v2-input'); t.value = 'make it better';
  });
  await page.evaluate(() => document.querySelector('.gal-v2-save').click());
  await sleep(500);
  check(await page.evaluate(() => /6\+ words|reason/.test(document.querySelector('.gal-v2-nudge').textContent)), 'thin V2 note blocked');
  await page.evaluate(() => {
    const t = document.querySelector('.gal-v2-input');
    t.value = 'In version 2 the wasabi would move sideways because a review said the ending felt too easy';
  });
  await page.evaluate(() => document.querySelector('.gal-v2-save').click());
  await sleep(900);
  check(await page.evaluate(() => !!document.querySelector('.gal-v2-card.done')), 'V2 note filed');
  await clickText('Wrap Press Night');
  await sleep(900);
  check(await page.evaluate(() => /reviews filed across the class/.test(document.body.textContent)), 'wrap card shows the collective count');
  await shot('17-wrap');
  await clickText('Collect your press badge');
  await dismissBadge();
  check((await xp()) === 31, 'Press badge = +7 (total 31), got ' + (await xp()));

  /* ---------- SHIP YOUR GAME (new chunk, approved 2 Aug 2026) ----------
     The one lesson where a pupil authors something of her own had no save
     step: thirty pupils closed a tab and their games were gone. It sits
     between Press Night and the exit check, so the exit walk below now has to
     come through it - and the harness ASSERTS it rather than stepping over
     it. */
  await sleep(1400);
  const shipCard = await page.evaluate(() => {
    const h = document.querySelector('.chunk-host');
    return h ? (h.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 220) : '';
  });
  check(/Ship your game/i.test(shipCard), 'the Ship your game step is on screen after Press Night: ' + JSON.stringify(shipCard.slice(0, 60)));
  check(/Drive|DT Work/i.test(shipCard), 'it names the Drive folder the .sb3 goes into');
  /* the artifact button is content-named now (cfg.checkLabel): Lesson 5's ship
     step reads "Check my Drive", because "Run the HQ Inspection" never matched
     what the card told her to press. A renamed control re-stages every walker
     that clicks it - DFM 143(b), the same miss as the rally walker. */
  await clickText('Check my Drive|Run the HQ Inspection');
  await sleep(1800);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Claim the badge/i.test(x.textContent) && !x.disabled);
    if (b) b.click();
  });
  await dismissBadge();
  check((await xp()) === 35, 'Shipped Home badge = +4 (total 35), got ' + (await xp()));

  /* ---------- EXIT: 2 MCQs (collect mode), then reach the parsons tray ---------- */
  await sleep(1400);
  for (let i = 0; i < 16; i++) {
    const st = await page.evaluate(() => {
      const h = document.querySelector('.chunk-host');
      if (h.querySelector('.parsons-tray')) return 'parsons';
      const opt = h.querySelector('.q-opt:not(:disabled)');
      if (opt) { opt.click(); return 'answered'; }
      const nxt = Array.from(h.querySelectorAll('button')).find(b => /Next|Finish|Continue|Start|Ready|Begin/i.test(b.textContent) && !b.disabled && b.offsetParent);
      if (nxt) { nxt.click(); return 'next'; }
      return 'wait';
    });
    if (st === 'parsons') break;
    await sleep(900);
  }
  check(await page.evaluate(() => !!document.querySelector('.parsons-tray')), 'parsons tray reached after both exit MCQs');
  await sleep(400);
  const order = ['when green flag clicked', 'set score to 0', 'forever', 'if <touching Ball?>', 'else'];
  for (const frag of order) {
    await page.evaluate((f) => {
      const b = Array.from(document.querySelectorAll('.parsons-tray .parsons-block')).find(x => x.textContent.indexOf(f.replace('<touching Ball?>', 'touching Ball')) !== -1 || x.textContent.startsWith(f.slice(0, 8)));
      if (b) b.click();
    }, frag);
    await sleep(300);
  }
  check(await page.evaluate(() => !document.querySelector('.parsons-check').disabled), 'all five parsons blocks placed');
  await page.evaluate(() => document.querySelector('.parsons-check').click());
  await sleep(1600);
  check(await page.evaluate(() => /Correct — that program|Correct &mdash;|Correct/.test((document.querySelector('.q-feedback') || {}).textContent || '')), 'parsons marks Correct LIVE (a:39 verified in-app)');
  await shot('18-parsons-correct');
  await clickText('Continue');
  await sleep(1200);

  /* ---------- SELFEVAL ---------- */
  await page.evaluate(() => {
    document.querySelectorAll('.se-row').forEach(r => { const c = r.querySelector('[data-v="2"]'); if (c) c.click(); });
    const d = document.querySelector('[data-d="1"]'); if (d) d.click();
  });
  await sleep(500);
  await shot('19-selfeval');
  await page.evaluate(() => document.querySelector('.se-submit').click());
  // wait for the Mission complete overlay, then take the door back to the hub
  let overlayReached = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const clicked = await page.evaluate(() => {
      const pop = document.querySelector('.badge-pop button');   // overlay always wins
      if (pop) { const back = /Back to Mission Control/i.test(pop.textContent); pop.click(); return back; }
      const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x =>
        /Onward|Continue|Finish/i.test(x.textContent) && !x.disabled && x.offsetParent);
      if (b) b.click();
      return false;
    });
    if (clicked) { overlayReached = true; break; }
  }
  check(overlayReached, 'Mission complete overlay reached and dismissed');
  // hub re-renders after refreshState
  for (let i = 0; i < 10; i++) {
    await sleep(900);
    const hubUp = await page.evaluate(() => { const h = document.querySelector('#hub'); return h && !h.hidden; });
    if (hubUp) break;
  }
  const finalXp = await xp();
  check(finalXp === 45, 'FINAL XP = 45 EXACT (2 contract + 22 sprint + 7 press + 4 ship + 10 exit report), got ' + finalXp);
  check(await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.tile')).find(e => /Game Studio/.test(e.textContent)); return t && t.classList.contains('is-done'); }), 'Game Studio tile is-done');
  await shot('20-hub-done');

  const realErrs = errs;
  check(realErrs.length === 0, 'zero console errors (video 404s excluded this run): ' + JSON.stringify(realErrs.slice(0, 5)));

  console.log('\n' + (FAILS.length ? 'FAILURES:\n- ' + FAILS.join('\n- ') : 'ALL CHECKS PASSED'));
  await browser.close();
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error('QA CRASHED:', e.message); process.exit(1); });
