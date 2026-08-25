/* qa-desk-clear.js — "THE DESK IS CLEAR" ANNOUNCES ITSELF, PROVED IN PIXELS.
 *
 * HIS FINDING, 25 August 2026, sitting J2 Lesson 2: the matching desk is the
 * first half of the hour and clearing it is the moment it builds to — and the
 * panel that says so appeared with `hidden = false` and nothing else. No
 * motion, no scroll, no change of weight. On a card this tall the panel can
 * render entirely below the fold, so the moment can pass without being seen.
 *
 * DFM 146(b) is why this is a PIXEL probe and not a source read: two CSS
 * "fixes" to the re-watch width once looked right in the file and did nothing,
 * and it shipped correctly only because something measured the real element in
 * a real browser. A transition that is coalesced away, or a scroll that never
 * happens, looks identical in the source to one that works.
 *
 * WHAT IT MEASURES, on the real engine with the real stylesheet:
 *   (a) THE ENTRANCE RUNS — the panel's computed opacity is genuinely partway
 *       between 0 and 1 while the transition is in flight, and reaches 1 after.
 *       Reading the class list would prove nothing; reading the computed value
 *       mid-flight is the only thing that distinguishes a transition that runs
 *       from one the browser folded away.
 *   (b) IT IS FULLY VISIBLE — the probe deliberately puts the panel BELOW THE
 *       FOLD (the exact condition his sit met) and requires it to be on screen
 *       once the desk is cleared.
 *   (c) REDUCED MOTION KEEPS THE ANNOUNCEMENT — with prefers-reduced-motion
 *       reduce, there is no movement, and the panel still carries the same gold
 *       border, the same headline weight and the same scroll-into-view. Reduced
 *       motion removes the movement, never the information.
 *
 * CONTROL (DFM 196): the PRE-FIX engine — `doneBox.hidden = false` and nothing
 * else, and the headline at ordinary body weight — must FAIL (a), (b) and (c).
 * The control is built by patching the shipped source back to what he sat, so
 * it cannot drift away from the fault it reproduces.
 *
 *   node qa-desk-clear.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('./node_modules/playwright');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const ENGINES = path.join(__dirname, '..', '..', 'platform', 'engines.js');
const STYLE = path.join(__dirname, '..', '..', 'platform', 'style.css');

const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };
const control = (failed, m) => {
  console.log((failed ? '  CTRL ' : '  FAIL ') + 'CONTROL: ' + m);
  if (!failed) FAILS.push('CONTROL ' + m);
};

/* the lesson that owns the desk, found rather than named */
function snapChunk() {
  const idx = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8'));
  for (const y of (idx.years || [])) {
    const yid = typeof y === 'string' ? y : y.id;
    const dir = path.join(SRC, yid, 'lessons');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(x => /\.json$/.test(x) && !x.includes('.bak'))) {
      const L = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const ch = (L.chunks || []).find(c => c.engine === 'snap');
      if (ch) return { lesson: f.replace(/\.json$/, ''), chunk: ch, keys: L.keys || {} };
    }
  }
  return null;
}

/* Drive the desk to clear and measure. `reduced` emulates the media query at
   BROWSER level, which is the only honest way to test it — a stubbed
   matchMedia would test the stub. */
async function measure(browser, engineSrc, chunk, keys, reduced) {
  const ctx = await browser.newContext({
    viewport: { width: 1100, height: 420 },     /* short on purpose: the panel starts below the fold */
    reducedMotion: reduced ? 'reduce' : 'no-preference'
  });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  await pg.goto('about:blank');
  await pg.addStyleTag({ path: STYLE });
  await pg.evaluate(() => {
    window.App = {
      esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      asset: p => p,
      armButton: (b, fn) => { if (b) b.onclick = fn; }
    };
  });
  await pg.addScriptTag({ content: engineSrc });
  const out = await pg.evaluate(async (ch) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host');
    window.Engines.snap.mount(host, ch, {
      chunk: ch, review: false, catchup: false,
      awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
      saveEvent: () => Promise.resolve({ ok: true }),
      /* the desk's verdict comes from the LESSON'S OWN key, exactly as the real
         ctx.markItem answers off App.state.localKeys (rule 97). Nothing here
         re-implements the engine, and a probe that decided its own answers
         would be measuring itself. */
      markItem: (id, choice) => Promise.resolve({ ok: true, correct: Number((ch.__keys || {})[id] || {}).valueOf === undefined ? false : Number(((ch.__keys || {})[id] || {}).a) === Number(choice) })
    });
    const open = host.querySelector('.intro-card button.primary-btn');
    if (open) open.click();
    await wait(60);

    /* Clear the desk honestly: pick the first block still on the desk, read its
       pair id out of the content, and click the Python line whose authored index
       IS that pair's key. The Python column is shuffled, so the node is found by
       its data-p rather than by position — which is also a small proof that the
       shuffle is real. */
    const pairs = ch.config.pairs || [];
    for (let i = 0; i < pairs.length + 2; i++) {
      const b = host.querySelector('.snap-blocks .snap-block');
      if (!b) break;
      const bi = Number(b.getAttribute('data-b'));
      const want = Number(((ch.__keys || {})[pairs[bi].id] || {}).a);
      b.click();
      await wait(30);
      const py = host.querySelector('.snap-pys .snap-py[data-p="' + want + '"]');
      if (!py) break;
      py.click();
      await wait(640);
    }

    const done = host.querySelector('.snap-done');
    if (!done) return { error: 'the done panel never appeared at all' };

    /* (a) mid-flight opacity — read a few frames in, while the transition runs */
    await wait(90);
    const mid = Number(getComputedStyle(done).opacity);
    const midTransform = getComputedStyle(done).transform;
    /* let it finish */
    await wait(900);
    const end = Number(getComputedStyle(done).opacity);
    const r = done.getBoundingClientRect();
    const head = host.querySelector('.snap-verdict');
    const headWeight = head ? Number(getComputedStyle(head).fontWeight) : 0;
    const headSize = head ? parseFloat(getComputedStyle(head).fontSize) : 0;
    const border = getComputedStyle(done).borderTopWidth;
    return {
      mid: mid, midTransform: midTransform, end: end,
      top: r.top, bottom: r.bottom, viewportH: window.innerHeight,
      headWeight: headWeight, headSize: headSize, border: parseFloat(border) || 0,
      hidden: done.hasAttribute('hidden')
    };
  }, Object.assign({}, chunk, { __keys: keys }));
  await ctx.close();
  return { out, errs };
}

async function run() {
  console.log('qa-desk-clear — the desk-clear panel announces itself, measured in pixels (DFM 42/146b/146e)\n');
  const found = snapChunk();
  if (!found) { console.error('no snap chunk found — nothing to measure'); process.exit(1); }
  console.log('  measuring ' + found.lesson + ' › ' + found.chunk.id + ', viewport 1100×420 (the panel starts below the fold)\n');

  const shipped = fs.readFileSync(ENGINES, 'utf8');
  const browser = await chromium.launch({ headless: true });
  try {
    /* ---------------- the shipped engine ---------------- */
    console.log('=== THE SHIPPED ENGINE ===');
    const { out: m, errs } = await measure(browser, shipped, found.chunk, found.keys, false);
    if (m.error) { check(false, m.error); }
    else {
      check(!m.hidden, 'the panel is on the page once the last pair leaves the desk');
      check(m.mid > 0.02 && m.mid < 0.98,
        '(a) the entrance really RUNS — computed opacity mid-flight is ' + m.mid.toFixed(2) +
        ', which is neither 0 nor 1, so the transition was not folded away');
      check(m.midTransform !== 'none',
        '    and it is really moving — the computed transform mid-flight is ' + m.midTransform);
      check(m.end > 0.98, '    and it settles fully opaque (' + m.end.toFixed(2) + ')');
      check(m.top >= 0 && m.bottom <= m.viewportH + 1,
        '(b) it is FULLY VISIBLE after the desk clears — top ' + Math.round(m.top) + ', bottom ' +
        Math.round(m.bottom) + ', viewport ' + m.viewportH + ' — on a viewport chosen so that it ' +
        'would otherwise have been below the fold, which is his own case');
      check(m.headWeight >= 700, '    the headline is at card-title weight (' + m.headWeight + ')');
      check(m.headSize >= 1.15 * 16, '    and at card-title size (' + m.headSize.toFixed(1) + 'px)');
      check(m.border >= 1.5, '    and the panel carries its gold border (' + m.border + 'px)');
    }
    check(errs.length === 0, 'no page error while driving the desk' + (errs.length ? ': ' + errs[0] : ''));

    /* ---------------- reduced motion ---------------- */
    console.log('\n=== prefers-reduced-motion: reduce ===');
    const { out: rm } = await measure(browser, shipped, found.chunk, found.keys, true);
    if (rm.error) check(false, rm.error);
    else {
      check(rm.mid > 0.98,
        '(c) there is NO motion — the panel is fully opaque from the first frame (' + rm.mid.toFixed(2) + ')');
      check(rm.top >= 0 && rm.bottom <= rm.viewportH + 1,
        '    and it is still scrolled into view — top ' + Math.round(rm.top) + ', bottom ' + Math.round(rm.bottom));
      check(rm.headWeight >= 700 && rm.headSize >= 1.15 * 16 && rm.border >= 1.5,
        '    and it keeps the SAME weight, size and border as the animated version — reduced motion ' +
        'removes the movement, never the announcement');
    }

    /* ============================ THE CONTROL ============================ */
    console.log('\n=== CONTROL — the engine he actually sat ===');
    const preFix = shipped
      .replace(/          doneBox\.classList\.add\('is-arriving'\);[\s\S]*?\} catch \(err\) \{ doneBox\.classList\.add\('is-in'\); \}\n/,
        '          /* control: the pre-fix engine did nothing at all here */\n')
      .replace("'<p class=\"snap-verdict snap-verdict-head\">'", "'<p class=\"snap-verdict\">'");
    check(preFix !== shipped, 'the pre-fix patch really changed the engine (a control that silently ' +
      'failed to patch would prove nothing — DFM 189\'s own lesson)');
    check(preFix.indexOf("classList.add('is-arriving')") === -1,
      'and the entrance is genuinely gone from the control build, not merely renamed');
    const { out: p } = await measure(browser, preFix, found.chunk, found.keys, false);
    if (p.error) check(false, p.error);
    else {
      control(!(p.mid > 0.02 && p.mid < 0.98),
        '(a) FAILS against the pre-fix engine: opacity mid-flight is ' + p.mid.toFixed(2) +
        ' — the panel simply appears, with no entrance at all');
      control(!(p.top >= 0 && p.bottom <= p.viewportH + 1),
        '(b) FAILS against the pre-fix engine: the panel sits at top ' + Math.round(p.top) +
        ' on a ' + p.viewportH + '-pixel viewport — BELOW THE FOLD, unseen, which is exactly ' +
        'what he sat');
      control(!(p.headWeight >= 700 && p.headSize >= 1.15 * 16),
        '(c) FAILS against the pre-fix engine: the headline is ' + p.headWeight + ' weight at ' +
        p.headSize.toFixed(1) + 'px — ordinary body text, indistinguishable from the card around it');
    }
  } finally {
    await browser.close();
  }

  console.log('\n' + (FAILS.length
    ? 'qa-desk-clear: ' + FAILS.length + ' FAILURE(S)'
    : 'qa-desk-clear: ALL GREEN — the moment the activity builds to is seen, in both motion settings'));
  process.exit(FAILS.length ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
