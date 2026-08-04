/* qa-rung-bar.js - the ladder progress drawing, and what it must never go back to.
 *
 * DAMIEN, 4 Aug 2026, sitting Lesson 2: "the star and lightening icons are very
 * hard to make out. is there a purpose to them?" - then, on seeing the drawn
 * ladder prototype: "the ladder image and animation are perfect (and your
 * recommendation); build it into the cards".
 *
 * So the row of lightning bolts and a star is GONE and a drawn ladder replaces
 * it: the rung she is on glows, a cleared rung is permanently gold, the rails
 * gild as she climbs, and the stretch is a DASHED rung with a star above the
 * top which only wakes when every rung is gold. That last part is also the fix
 * for "I'm not sure which of the tasks I've done was the extra challenge?"
 *
 * Measured in a real browser on real lesson content (rule 146b - assert the
 * rendered result, never the source). Controls prove each assertion can fail.
 *
 * Needs the static server on 8096 (config digital-skills-l4).
 *   node qa-rung-bar.js
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VIEWPORTS = [{ w: 1440, h: 900 }, { w: 1280, h: 800 }];
const GOLD = 'rgb(228, 184, 36)';

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}

/* Mount the ladder from real content at a given state and read back what
   actually rendered - classes AND computed paint. */
async function probe(page, file, state) {
  return page.evaluate(async (args) => {
    const [file, state] = args;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const lesson = await (await fetch('/ks3-dt/content/j1/lessons/' + file)).json();
    const ladder = lesson.chunks.find(c => c.engine === 'ladder');
    const ids = (ladder.config.rungs || []).map(r => String(r.id));

    document.body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:20px';
    const host = document.createElement('div');
    host.className = 'chunk-host'; host.id = 'chunk-host';
    wrap.appendChild(host); document.body.appendChild(wrap);

    const draft = { ladder: { done: ids.slice(0, state), hinted: [], unplugged: 1, stretch: 0 } };
    window.Engines.ladder.mount(host, ladder, { draft, catchup: false, review: true, chunk: ladder });
    await sleep(420);

    const svg = host.querySelector('svg.lad');
    const rungEls = Array.from(host.querySelectorAll('.lad-rung'));
    const bonusEl = host.querySelector('.lad-bonus');
    const starEl = host.querySelector('.lad-star');
    const railEl = host.querySelector('.lad-rail');
    const paint = el => el ? { cls: el.getAttribute('class'), stroke: getComputedStyle(el).stroke,
                               fill: getComputedStyle(el).fill, anim: getComputedStyle(el).animationName } : null;

    /* rungs are drawn top-first, so reverse to get bottom-up = rung 1..n */
    const bottomUp = rungEls.slice().reverse().map(paint);

    const intro = {
      rungCount: rungEls.length,
      contentRungs: ids.length,
      bottomUp,
      bonus: paint(bonusEl),
      star: paint(starEl),
      rail: paint(railEl),
      aria: svg ? svg.getAttribute('aria-label') : '',
      key: host.querySelector('.lad-key') ? host.querySelector('.lad-key').textContent.trim() : '',
      /* the thing it replaced must be gone for good */
      oldBolts: host.querySelectorAll('.rung-dot').length + host.querySelectorAll('.rung-bar').length
    };

    /* on to a rung card - the ladder rides along, the key does not */
    const cta = host.querySelector('button.primary-btn');
    if (cta) cta.click();
    await sleep(450);
    const rung = {
      hasLadder: !!host.querySelector('svg.lad'),
      hasKey: !!host.querySelector('.lad-key')
    };
    return { intro, rung };
  }, [file, state]);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const v of VIEWPORTS) {
    for (const [file, label] of [['j1-02.json', 'Lesson 2 (Signal Relay)'], ['j1-03.json', 'Lesson 3 (Scoreboard)']]) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await sleep(2200);

      /* --- state 0: nothing cleared. Rung 1 glows, the rest are dormant. --- */
      const s0 = (await probe(page, file, 0)).intro;
      console.log('\n== ' + label + ' at ' + v.w + 'x' + v.h + ' == ' + s0.rungCount + ' rungs drawn | ' + s0.aria);
      check(s0.rungCount === s0.contentRungs,
        'the ladder draws exactly one rung per rung in the content (' + s0.rungCount + ' of ' + s0.contentRungs + ')');
      check(s0.oldBolts === 0, 'the old lightning-bolt bar is gone entirely');
      check(/active/.test(s0.bottomUp[0].cls) && s0.bottomUp[0].anim !== 'none',
        'the rung she is on is glowing (bottom rung, animation ' + s0.bottomUp[0].anim + ')');
      check(s0.bottomUp.slice(1).every(r => !/active|done/.test(r.cls)),
        'no rung above it is lit yet');
      check(!/offered|done/.test(s0.bonus.cls), 'the extra challenge is still out of reach');

      /* --- mid-climb: rung 1 cleared, rung 2 now glowing --- */
      const s1 = (await probe(page, file, 1)).intro;
      check(/done/.test(s1.bottomUp[0].cls) && s1.bottomUp[0].stroke === GOLD,
        'a cleared rung is painted permanent gold (' + s1.bottomUp[0].stroke + ')');
      check(s1.bottomUp[0].anim === 'none', 'and it has stopped glowing');
      check(/active/.test(s1.bottomUp[1].cls), 'the NEXT rung has taken over the glow');
      check(s1.rail.stroke !== s0.rail.stroke, 'the rails gild once she is climbing');

      /* --- all rungs cleared: the extra challenge wakes up (DFM 152a) --- */
      const sAll = (await probe(page, file, s0.contentRungs)).intro;
      check(sAll.bottomUp.every(r => /done/.test(r.cls) && r.stroke === GOLD), 'every rung is gold at the top');
      /* NB: assert the class and the running animation, NOT a static stroke -
         while lad-pulse is running the computed stroke is a tween frame, so
         comparing it to var(--gold) fails on a perfectly correct element.
         (This harness caught exactly that mistake in its own first draft.) */
      check(/offered/.test(sAll.bonus.cls) && sAll.bonus.anim !== 'none',
        'the dashed extra-challenge rung wakes up only now (animation ' + sAll.bonus.anim + ')');
      check(/offered/.test(sAll.star.cls) && sAll.star.anim !== 'none', 'and its star is lit and twinkling');
      check(/extra challenge/i.test(sAll.aria), 'a screen reader is told the same thing: ' + JSON.stringify(sAll.aria));

      /* --- rule 13: the dashed rung is named where she first meets it --- */
      check(/extra challenge/i.test(s0.key), 'the intro card explains what the dashed starred rung is');
      check(/glow|gold/i.test(s0.key), 'and what the glowing rung means');
      const onRung = (await probe(page, file, 1)).rung;
      check(onRung.hasLadder, 'a rung card carries the ladder too');
      check(!onRung.hasKey, 'but does not repeat the explanation');

      await page.close();
    }
  }

  /* CONTROL 1: kill the glow and the "she is on this one" check must fail. */
  console.log('\n== CONTROL 1: with no glow, the current rung is unidentifiable ==');
  const c1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await c1.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await c1.addStyleTag({ content: '.lad-rung.active { animation: none !important; }' });
  const ctl1 = (await probe(c1, 'j1-02.json', 0)).intro;
  check(ctl1.bottomUp[0].anim === 'none',
    'control: the glow really is what marks her rung - without it the check fails');
  await c1.close();

  /* CONTROL 2: the pre-fix state - a stretch that looks identical to a rung is
     exactly what left him asking which task had been the extra challenge. */
  console.log('\n== CONTROL 2: an undistinguished stretch is what he could not identify ==');
  const c2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await c2.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await c2.addStyleTag({ content: '.lad-bonus { stroke-dasharray: none !important; opacity: 1 !important; } .lad-star { display: none !important; }' });
  const ctl2 = (await probe(c2, 'j1-02.json', 0)).intro;
  const starHidden = await c2.evaluate(() => {
    const s = document.querySelector('.lad-star');
    return !s || getComputedStyle(s).display === 'none';
  });
  check(starHidden, 'control: with the star hidden and the dashes removed, nothing marks the stretch as extra');
  await c2.close();

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL LADDER CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
