/* qa-film-reachable.js - "Done watching" must never be a one-way door.
 *
 * DAMIEN, 3 Aug 2026: "the need to be able to watch the video again in case
 * 'Done watching' was pressed by mistake".
 *
 * The film button existed only on rung cards, so one mis-click on Done watching
 * stranded a pupil across the ladder intro AND the whole of rung 1 with no route
 * back to the film. This asserts there is a way back on EVERY screen from the
 * moment the film ends, in every lesson that has a film - and that the two
 * screens right after the film open it at the BEGINNING, because a pupil who
 * mis-clicked may not have seen any of it.
 *
 * Needs the static server on 8096 (config digital-skills-l4).
 *   node qa-film-reachable.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const SRC = path.resolve(__dirname, '../../../../../Desktop/Claude Work/KS3 DT Platform/content-src');
const ALT = path.resolve(__dirname, '../../content');
const CONTENT = fs.existsSync(path.join(SRC, 'j1/lessons/j1-02.json')) ? SRC : ALT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}

/* ---------- static half: every lesson with a film has a route back ---------- */
function staticChecks() {
  console.log('\n== A. every film has a re-watch route on the screens that follow it ==');
  ['j1-02', 'j1-03', 'j1-04', 'j1-05'].forEach(id => {
    const d = JSON.parse(fs.readFileSync(path.join(CONTENT, 'j1/lessons/' + id + '.json'), 'utf8'));
    const videoChunk = d.chunks.find(c => c.engine === 'video');
    if (!videoChunk) { console.log('  --    ' + id + ' has no standalone film chunk'); return; }
    const src = videoChunk.config.src;
    /* the chunk AFTER the film must carry the same film, so its screens can offer
       it: the ladder does that via config.film, the studio via config.masterclass */
    const i = d.chunks.indexOf(videoChunk);
    const next = d.chunks[i + 1];
    const nextCfg = (next && next.config) || {};
    /* RE-STAGED 12 Aug 2026 for the DFM 168 split. Lesson 5's film is served in
       two halves in two places, so the desk's MAIN film button now serves the
       second half — and the rule this check enforces is not "the same button",
       it is "she is never stranded away from the film she was just watching".
       So the screen after Done watching must carry THAT film somewhere: the
       ladder's `film`, the desk's `masterclass`, or the desk's second player
       `masterclassAlt`, which exists for exactly this reason. */
    const carries = (nextCfg.film && nextCfg.film.src === src) ||
      (nextCfg.masterclass && nextCfg.masterclass.src === src) ||
      (nextCfg.masterclassAlt && nextCfg.masterclassAlt.src === src);
    check(carries, id + ': the screen after "Done watching" (' + (next && next.id) +
      ') carries the film, so it can offer a way back');
  });
}

/* ---------- live half: the buttons are really on the L2 screens ---------- */
async function liveChecks(browser) {
  console.log('\n== B. Lesson 2, live: a mis-click on Done watching is recoverable ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    ['1', '2'].forEach(n => { db.locks['Demo-8A'][n] = { u: now, on: 1 }; });
    db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: 0 };
    db.pupils = db.pupils || {};
    db.pupils['Demo-8A:anya.murphy@demo'] = { n: 'Anya Murphy', cn: 'Scarlet Cascade', j: 1, xp: 20, g: '',
      L: { '1': [2, 20, 'sit1=1', '1', '222|0', 100, 8, 0, '', 0, 0] } };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(700);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Make It Move/.test(e.textContent));
    if (t) t.click();
  });
  await sleep(3000);

  const chunkId = () => page.evaluate(() => {
    const s = window.App.state;
    return s.chunks[s.chunkIdx] && s.chunks[s.chunkIdx].id;
  });
  const advance = async (re) => {
    for (let i = 0; i < 40; i++) {
      const clicked = await page.evaluate((src) => {
        const rx = new RegExp(src, 'i');
        const b = Array.from(document.querySelectorAll('#chunk-host button'))
          .find(x => rx.test(x.textContent || '') && !x.disabled && x.offsetParent !== null);
        if (!b) return false;
        b.click(); return true;
      }, re.source);
      if (clicked) { await sleep(1500); return true; }
      await sleep(500);
    }
    return false;
  };

  /* walk to the film and press Done watching - the mis-click he described.
     A generic walker: answer anything answerable, otherwise press the one button
     that moves on. Stops the moment the film chunk is on screen. */
  let ck = await chunkId();
  for (let step = 0; step < 90 && ck !== 'howto'; step++) {
    const acted = await page.evaluate(() => {
      const host = document.querySelector('#chunk-host');
      if (!host) return false;
      const opt = Array.from(host.querySelectorAll('.q-opt')).filter(x => x.offsetParent !== null && !x.disabled);
      if (opt.length) { opt[0].click(); return true; }
      const btn = Array.from(host.querySelectorAll('button'))
        .find(x => x.offsetParent !== null && !x.disabled &&
          /start|continue|next|finish|go\b|begin|warm up|got it/i.test(x.textContent || ''));
      if (btn) { btn.click(); return true; }
      return false;
    });
    await sleep(acted ? 1100 : 500);
    ck = await chunkId();
  }
  check(ck === 'howto', 'reached the film chunk (' + ck + ')');

  const pressed = await advance(/done watching/i);
  check(pressed, 'pressed "Done watching" - the mis-click he described');
  await sleep(1800);
  ck = await chunkId();
  check(ck === 'ladder', 'it moved her straight on to the ladder (' + ck + ')');

  const introBtn = await page.evaluate(() => {
    const b = document.querySelector('#chunk-host .rung-film-btn');
    return b ? b.textContent.trim() : null;
  });
  check(!!introBtn, 'THE LADDER INTRO offers a way back to the film: ' + JSON.stringify(introBtn));

  /* and it opens at the START, not at the copy-it-across chapter */
  await page.evaluate(() => document.querySelector('#chunk-host .rung-film-btn').click());
  await sleep(2000);
  const modal = await page.evaluate(() => {
    const v = document.querySelector('.film-modal video');
    return v ? { open: true, t: v.currentTime, chips: document.querySelectorAll('.film-modal .vid-chapter').length } : { open: false };
  });
  check(modal.open, 'the film popup opens from that button');
  check(modal.open && modal.t < 5, 'and it starts at the BEGINNING (t=' + (modal.t || 0).toFixed(1) + 's), not mid-film');
  check(modal.chips >= 4, 'with the chapter buttons available (' + modal.chips + ')');
  await page.evaluate(() => {
    const b = document.querySelector('.film-modal .film-close');
    if (b) b.click();
  });
  await sleep(900);
  check(!(await page.evaluate(() => !!document.querySelector('.film-modal'))), 'and closes again cleanly');

  /* rung 1 is the unplugged card - the other screen she was stranded on.
     Assert we REALLY got there (its own heading), or this passes on the intro
     card, which we have already checked. */
  await advance(/start climbing|back to the ladder/i);
  await sleep(2200);
  const rung1 = await page.evaluate(() => {
    const host = document.querySelector('#chunk-host');
    const h = host.querySelector('h2');
    return {
      btn: !!host.querySelector('.rung-film-btn'),
      head: h ? h.textContent.trim() : null,
      isUnplugged: /circuit/i.test(host.textContent || '')
    };
  });
  check(rung1.isUnplugged, 'walked on to RUNG 1, the unplugged card ("' + rung1.head + '")');
  check(rung1.isUnplugged && rung1.btn, 'and rung 1 offers the film too - she is never stranded');

  await page.close();
}

(async () => {
  staticChecks();
  const browser = await chromium.launch({ headless: true });
  await liveChecks(browser);
  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL FILM-REACHABLE CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
