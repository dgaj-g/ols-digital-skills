/* qa-rung-bar.js - the ladder's progress symbols must be legible AND explained.
 *
 * DAMIEN, 4 Aug 2026, mid Lesson-2 verification: "on the signal relay ladder
 * badge, the star and lightening icons are very hard to make out. is there a
 * purpose to them?"
 *
 * There is a purpose - one lightning bolt per rung she BUILDS, lit when it
 * works, plus a star for the stretch challenge - but two things were wrong:
 *   1. the not-yet-earned state was greyscale(1) at 0.35 opacity, i.e. a pale
 *      smudge on a light card. He could barely see them; a pupil had no chance.
 *   2. nothing on screen ever said what they MEAN. The only explanation was a
 *      title tooltip, which needs a hover a twelve-year-old will never find.
 *      A symbol she has to decode is rule 13 / 138.1.3 all over again.
 *
 * This guard measures the REAL computed style in a real browser (rule 146b -
 * assert the rendered result, never the source; the re-watch width took three
 * attempts because two source "fixes" changed no pixels at all), and asserts
 * the key line is present where she first meets the symbols and absent where
 * it would be clutter. Both controls prove the assertions can actually fail.
 *
 * Needs the static server on 8096 (config digital-skills-l4).
 *   node qa-rung-bar.js
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const VIEWPORTS = [{ w: 1440, h: 900 }, { w: 1280, h: 800 }];

/* legibility floor. The pre-fix state was opacity 0.35 at 1.15rem (18.4px);
   it now sits at 0.8 and 1.35rem (21.6px). These floors sit between the two,
   so the old state fails and the new one passes with room to spare. */
const MIN_OPACITY = 0.6;
const MIN_PX = 20;

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}

/* Mount the ladder straight from real lesson content, on the INTRO card and
   then on a RUNG card, and read back what actually rendered. */
async function probe(page, lessonFile) {
  return page.evaluate(async (file) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const lesson = await (await fetch('/ks3-dt/content/j1/lessons/' + file)).json();
    const ladder = lesson.chunks.find(c => c.engine === 'ladder');

    document.body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:20px';
    const host = document.createElement('div');
    host.className = 'chunk-host'; host.id = 'chunk-host';
    wrap.appendChild(host); document.body.appendChild(wrap);

    /* the INTRO card, with the unplugged rung already behind her so the CTA
       goes straight on to a rung card when we click it below */
    const draft = { ladder: { done: [], hinted: [], unplugged: 1, stretch: 0 } };
    window.Engines.ladder.mount(host, ladder, { draft: draft, catchup: false, review: true, chunk: ladder });
    await sleep(400);

    const dots = Array.from(host.querySelectorAll('.rung-dot'));
    const unlit = dots.find(d => !d.classList.contains('lit'));
    const cs = unlit ? getComputedStyle(unlit) : null;
    const keyEl = host.querySelector('.rung-bar-key');

    const intro = {
      dots: dots.length,
      bolts: dots.filter(d => !d.classList.contains('stretch')).length,
      stars: dots.filter(d => d.classList.contains('stretch')).length,
      opacity: cs ? Number(cs.opacity) : -1,
      px: cs ? parseFloat(cs.fontSize) : -1,
      keyText: keyEl ? (keyEl.textContent || '').trim() : '',
      keyVisible: keyEl ? keyEl.getBoundingClientRect().width > 0 : false,
      /* the rungs live under chunk.config, not on the chunk itself - reading
         the wrong path printed "3 bolts for 0 rungs", which is exactly the kind
         of untrue line rule 146a is about, even in my own harness output */
      rungTitles: ((ladder.config || {}).rungs || []).map(r => r.title),
      introText: String((ladder.config || {}).intro || '')
    };

    /* now on to a RUNG card - the key must NOT repeat there */
    const cta = host.querySelector('button.primary-btn');
    if (cta) cta.click();
    await sleep(450);
    const rung = {
      hasBar: !!host.querySelector('.rung-bar'),
      hasKey: !!host.querySelector('.rung-bar-key')
    };

    return { intro, rung };
  }, lessonFile);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const v of VIEWPORTS) {
    for (const [file, label, expectBolts] of [['j1-02.json', 'Lesson 2 (Signal Relay)', 3], ['j1-03.json', 'Lesson 3 (Scoreboard)', 3]]) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await sleep(2200);
      const r = await probe(page, file);
      const i = r.intro;
      console.log('\n== ' + label + ' at ' + v.w + 'x' + v.h + ' == ' + i.bolts + ' bolt(s) + ' + i.stars +
        ' star | unlit opacity ' + i.opacity + ' at ' + i.px + 'px');

      check(i.dots > 0, 'the progress bar rendered');
      check(i.bolts === expectBolts, 'one bolt per built rung (' + i.bolts + ' bolts for ' + i.rungTitles.length + ' rungs)');
      check(i.stars === 1, 'the stretch challenge has its own star');

      /* HIS COMPLAINT: legibility, measured in rendered pixels */
      check(i.opacity >= MIN_OPACITY,
        'a not-yet-earned symbol is legible: opacity ' + i.opacity + ' >= ' + MIN_OPACITY);
      check(i.px >= MIN_PX,
        'and big enough to read: ' + i.px + 'px >= ' + MIN_PX + 'px');

      /* RULE 13: the symbols name themselves where she first meets them */
      check(i.keyVisible, 'the intro card carries a visible line explaining the symbols');
      check(/rung you build/i.test(i.keyText), 'the key says the bolts are the rungs she BUILDS');
      check(/extra challenge/i.test(i.keyText), 'the key says the star is the extra challenge');

      /* RULE 35: the key must reconcile with what the intro promises. L2 says
         "four ... rungs" over three bolts because Rung 1 is the unplugged Human
         Circuit - so the key has to say "build", or the two contradict. */
      if (/four small challenges/i.test(i.introText)) {
        check(/build on the micro:bit/i.test(i.keyText),
          'L2 promises FOUR rungs over three bolts, so the key names the built ones explicitly');
      }

      /* no clutter: the key is the intro card's job only */
      check(r.rung.hasBar, 'a rung card still shows the bar');
      check(!r.rung.hasKey, 'but does not repeat the key');

      await page.close();
    }
  }

  /* CONTROL 1: the pre-fix styling must FAIL the legibility floors, or those
     two checks would pass against any stylesheet at all. */
  console.log('\n== CONTROL 1: the pre-fix pale smudge must fail this ==');
  const c1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await c1.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await c1.addStyleTag({ content: '.rung-dot { opacity: 0.35 !important; font-size: 1.15rem !important; }' });
  const pre = await probe(c1, 'j1-02.json');
  check(pre.intro.opacity < MIN_OPACITY && pre.intro.px < MIN_PX,
    'pre-fix: opacity ' + pre.intro.opacity + ' and ' + pre.intro.px + 'px really were below the floors');
  await c1.close();

  /* CONTROL 2: strip the key and the rule-13 checks must fail, proving they
     are reading the real element and not passing vacuously. */
  console.log('\n== CONTROL 2: with the explaining line removed, the rule-13 checks must fail ==');
  const c2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await c2.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await c2.addStyleTag({ content: '.rung-bar-key { display: none !important; }' });
  const nokey = await probe(c2, 'j1-02.json');
  check(!nokey.intro.keyVisible,
    'pre-fix: with no explaining line on screen, the symbols really were unexplained');
  await c2.close();

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL RUNG-BAR CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
