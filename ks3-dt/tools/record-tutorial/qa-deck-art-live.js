#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   qa-deck-art-live.js — IS EVERY PICTURE THE DECK ASKS FOR ACTUALLY THERE?
   ═══════════════════════════════════════════════════════════════════════════
   Written 18 Aug 2026, the moment `createJ2Lesson1Deck` threw on his screen:

     Exception: The image at URL .../deck/j2-01/title-bg.png could not be
     retrieved. Please make sure the URL is valid and publicly accessible.

   THE CAUSE, and it is a sequencing fault in the round's own plan rather than
   a fault in any file. The deck renderer does not embed its art; it hands
   Google Slides a PUBLIC URL on GitHub Pages and lets Slides fetch it
   (template §4 — "no base64 megafile pastes"). So a deck can only be built
   from art that is ALREADY PUSHED. This round's charter put the push LAST,
   because the briefs' deck links are born in the final pack — and every one of
   the twenty-two new J2/J3 images was committed locally and had never left the
   machine. Nothing was broken; the pictures simply did not exist yet at the
   only address the generator knows.

   THE LAW IT WRITES (DFM 189's family, applied to a generator instead of a
   browser): SHIPPING IS NOT DEPLOYING — and a generator that pulls its assets
   from the public site is a READER of that site, so the push comes before the
   run, not after it.

   AND THE HALF THAT WOULD HAVE BEEN SILENT. `bgImage_` throws, which is why he
   saw this one. `shots_` does NOT — it wraps each insert in a try/catch on
   purpose, so "a missing shot must never stop the whole deck building". A
   missing SCREENSHOT therefore produces a deck that builds perfectly and comes
   out with a hole where the pupil's own screen should be. The proof read would
   catch it eventually; this gate catches it before he presses Run.

   WHAT IT DOES. It reads the BUILT .gs — the artefact he actually pastes, not
   the source it was built from (DFM 162b) — pulls the DECKS blob out of it,
   re-derives every image URL the renderer will request for every slide of every
   deck, and asks the live site for each one. It fails naming the missing files
   and the slides that wanted them.

   CONTROL: a URL known not to exist is probed in the same run and must be
   reported missing, so a green result can never mean "the probe answered yes
   to everything".
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const GS = path.join(__dirname, '..', 'slides-deck', 'OLS_KS3_DT_Slide_Decks.gs');
const CONCURRENCY = 8;

/* ── the DECKS blob, read out of the built file ─────────────────────────────
   Brace-matched rather than regexed: the data contains braces inside strings
   only as literal text, and a counter that ignores string bodies is exact. */
function readDecks(src) {
  const start = src.indexOf('var DECKS = {');
  if (start === -1) throw new Error('qa-deck-art-live: no DECKS blob in ' + GS);
  const open = src.indexOf('{', start);
  let i = open, depth = 0, inStr = false, quote = '', esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return new Function('return ' + src.slice(open, i))();
}

/* ── the URL builders, mirrored from the renderer ───────────────────────────
   bgImage_ / shotUrl_ in the .gs. The default background per slide kind comes
   from renderSlide_'s dispatch, and every one of those defaults is asserted
   below against the renderer's own source, so this mirror cannot drift. */
const BG_BY_KIND = {
  title: 'title',
  objectives: 'section',
  step: 'section',
  stop: 'stop',
  closer: 'closer',
};
const BG_DEFAULT = 'section';           /* slideBullets_, the fall-through */

function pagesBase(src) {
  const m = src.match(/var PAGES_IMG\s*=\s*"([^"]+)"/);
  if (!m) throw new Error('qa-deck-art-live: no PAGES_IMG in ' + GS);
  return m[1];
}

/* Proves the mirror above still matches the renderer, so this gate can never
   quietly check the wrong filenames after someone edits a slide function. */
function assertMirror(src, fails) {
  const want = [
    [/function slideTitle_[\s\S]{0,200}?bgImage_\(slide, d, s\.bg \|\| 'title'\)/, "slideTitle_ → 'title'"],
    [/function slideObjectives_[\s\S]{0,200}?bgImage_\(slide, d, s\.bg \|\| 'section'\)/, "slideObjectives_ → 'section'"],
    [/function slideBullets_[\s\S]{0,200}?bgImage_\(slide, d, s\.bg \|\| 'section'\)/, "slideBullets_ → 'section'"],
    [/function slideStep_[\s\S]{0,200}?bgImage_\(slide, d, s\.bg \|\| 'section'\)/, "slideStep_ → 'section'"],
    [/function slideStop_[\s\S]{0,300}?bgImage_\(slide, d, s\.bg \|\| 'stop'\)/, "slideStop_ → 'stop'"],
    [/function slideCloser_[\s\S]{0,200}?bgImage_\(slide, d, s\.bg \|\| 'closer'\)/, "slideCloser_ → 'closer'"],
    [/function bgImage_[\s\S]{0,200}?PAGES_IMG \+ 'deck\/' \+ d\.lesson \+ '\/' \+ which \+ '-bg\.png'/, 'bgImage_ URL shape'],
    [/function shotUrl_[\s\S]{0,200}?PAGES_IMG \+ 'deck\/' \+ d\.lesson \+ '\/shot-' \+ name \+ '\.png'/, 'shotUrl_ URL shape'],
  ];
  want.forEach(([re, what]) => {
    if (!re.test(src)) fails.push('MIRROR DRIFT: ' + what + ' no longer reads as this gate assumes');
  });
}

function urlsFor(base, decks) {
  const rows = [];
  Object.keys(decks).forEach(id => {
    const d = decks[id];
    (d.sections || []).forEach(sec => {
      (sec.slides || []).forEach((s, i) => {
        const which = s.bg || BG_BY_KIND[s.kind] || BG_DEFAULT;
        const where = id + ' · ' + (sec.label || '?') + ' · slide "' + (s.heading || s.kind) + '"';
        rows.push({ url: base + 'deck/' + d.lesson + '/' + which + '-bg.png', where, what: 'background' });
        const shots = [].concat(s.shot ? [s.shot] : [], s.shots || []);
        shots.forEach(n => rows.push({
          url: base + 'deck/' + d.lesson + '/shot-' + n + '.png', where,
          what: 'screenshot (a missing one builds SILENTLY — shots_ swallows it)',
        }));
      });
    });
  });
  /* one URL per address; a background is shared by many slides */
  const seen = new Map();
  rows.forEach(r => {
    if (!seen.has(r.url)) seen.set(r.url, { url: r.url, what: r.what, wanted: [] });
    seen.get(r.url).wanted.push(r.where);
  });
  return [...seen.values()];
}

async function head(url) {
  try {
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    /* some static hosts answer HEAD oddly; a GET settles it before we condemn */
    if (!r.ok) r = await fetch(url, { method: 'GET', redirect: 'follow' });
    return r.status;
  } catch (e) {
    return 'network error: ' + e.message;
  }
}

async function probeAll(rows) {
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
    while (next < rows.length) {
      const r = rows[next++];
      out.push({ ...r, status: await head(r.url) });
    }
  }));
  return out;
}

(async () => {
  const src = fs.readFileSync(GS, 'utf8');
  const base = pagesBase(src);
  const decks = readDecks(src);
  const fails = [];
  assertMirror(src, fails);

  const rows = urlsFor(base, decks);
  console.log('qa-deck-art-live — ' + Object.keys(decks).length + ' decks, ' +
    rows.length + ' distinct images, against ' + base);

  const results = await probeAll(rows);
  results.sort((a, b) => a.url.localeCompare(b.url));
  let ok = 0;
  results.forEach(r => {
    if (r.status === 200) { ok++; return; }
    fails.push('MISSING (' + r.status + ') ' + r.what + '\n    ' + r.url +
      '\n    wanted by: ' + r.wanted.slice(0, 3).join(' | ') +
      (r.wanted.length > 3 ? ' | +' + (r.wanted.length - 3) + ' more' : ''));
  });

  /* THE CONTROL (DFM 196): an address that cannot exist must be reported
     missing, or a green run proves nothing about the probe. */
  const ctrlUrl = base + 'deck/j0-00/qa-control-this-file-does-not-exist.png';
  const ctrl = await head(ctrlUrl);
  const ctrlOk = ctrl !== 200;
  console.log('CTRL  a deliberately absent image answers ' + ctrl +
    (ctrlOk ? '  ✔ the probe can see a missing file' : '  ✘ THE PROBE IS BLIND'));
  if (!ctrlOk) fails.push('CONTROL FAILED: the probe reported 200 for a file that does not exist');

  console.log('LIVE  ' + ok + ' of ' + results.length + ' images present');
  if (fails.length) {
    console.log('\n' + fails.length + ' FAILURE' + (fails.length === 1 ? '' : 'S') + ':');
    fails.forEach(f => console.log('  ✘ ' + f));
    console.log('\nA deck cannot be created or rebuilt until these are live: the generator');
    console.log('hands Slides a public URL, so the PUSH comes before the run.');
    process.exit(1);
  }
  console.log('\nALL GREEN — every image the two create runs will ask for is live.');
})();
