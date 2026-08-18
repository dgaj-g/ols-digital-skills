#!/usr/bin/env node
/* build-deck-gs.js — emit the Apps Script file Damien pastes, from PACKED
 * deck content (DFM 219d + the DFM 147 rot fix).
 *
 * WHY THIS EXISTS. The old OLS_KS3_DT_Slide_Decks.gs carried every slide's
 * WORDS by hand, in a file no gate could read. Three separate rulings that
 * swept a wording across the platform sailed straight past it, and by 14 Aug
 * 2026 its Lesson 2 deck still taught the dead pair model, its Lesson 3 deck
 * described a game that no longer exists, and its Lesson 5 deck said "two
 * mouths" — a word killed everywhere else five days earlier. A generator whose
 * output nobody can grep is where dead wordings go to survive.
 *
 * So the words now live in content-src/<year>/decks/*.deck.json, they are
 * packed like all content, they go through the language gate at pupil register,
 * and THIS file turns them into a renderer plus a data blob. Nobody types a
 * slide's words into a .gs again.
 *
 * Usage: node build-deck-gs.js            (writes OLS_KS3_DT_Slide_Decks.gs)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PACKED = path.join(ROOT, 'content');
const OUT = path.join(__dirname, 'OLS_KS3_DT_Slide_Decks.gs');
const PAGES = 'https://dgaj-g.github.io/ols-digital-skills/ks3-dt/platform/assets/img/';

function decks() {
  const out = {};
  for (const year of fs.readdirSync(PACKED)) {
    const dir = path.join(PACKED, year, 'decks');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.deck.json')) continue;
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      out[d.lesson] = d;
    }
  }
  return out;
}

const DATA = decks();
if (!Object.keys(DATA).length) { console.error('no packed decks found — run pack-content first'); process.exit(1); }

/* the consent screenshots are HIS OWN captures and are embedded as base64,
   because they are the one set that can never be re-taken from the preview
   (they are Google's screens, on his real account, DFM 119). Everything else
   is fetched from Pages by URL, which keeps this file small. */
/* THE FOUR CONSENT PICTURES ARE HIS OWN, ALREADY APPROVED, AND ALREADY NAVY-
   BARRED over each pupil's name and email. They are kept as committed files
   beside this script — extracted byte-for-byte from the deck that has been in
   the department's hands since 1 August — rather than re-derived from the raw
   capture folder, because the raw shots carry real names and the cropping and
   bar placement were his. A rebuild must reproduce the approved picture, not a
   fresh guess at it. */
const CONSENT_DIR = path.join(__dirname, 'consent');
function consentB64() {
  const map = {};
  if (!fs.existsSync(CONSENT_DIR)) return map;
  for (const key of ['c1', 'c2', 'c3', 'c4']) {
    const hit = fs.readdirSync(CONSENT_DIR).find(f => f.replace(/\.[^.]+$/, '') === key);
    if (!hit) continue;
    const buf = fs.readFileSync(path.join(CONSENT_DIR, hit));
    map[key] = { b64: buf.toString('base64'),
      mime: /\.png$/i.test(hit) ? 'image/png' : 'image/jpeg', from: hit };
  }
  return map;
}
const CONSENT = consentB64();

const header = `/**
 * OLS KS3 DT — TEACHER SLIDE DECKS
 * GENERATED FILE. Do not edit by hand: run
 *   node ks3-dt/tools/slides-deck/build-deck-gs.js
 * after editing content-src/<year>/decks/*.deck.json, and paste the result.
 *
 * Every word on every slide comes from packed content, so the language gate
 * reads it (DFM 219d) and a platform-wide wording sweep reaches it (DFM 147).
 *
 * TO RUN, ONE FUNCTION AT A TIME, from the toolbar dropdown:
 *   runDeckRound         THE WHOLE ROUND, ONE BUTTON: rebuilds every deck
 *                        that exists, then exports every proof set. Resumable
 *                        — if it says PAUSED, press Run again. It is the first
 *                        function in the file, so a fresh page selects it.
 *   createLesson2Deck    creates that deck ONCE, shares it read-only, and
 *   createLesson3Deck    LOGS ITS FILE ID. Read that id back: it is written into
 *   createLesson4Deck    the deck data and into the brief's two resource links
 *   createLesson5Deck    BEFORE the content is packed, so no teacher ever meets
 *   createJ2Lesson1Deck  a link that leads nowhere. Refuses to run twice.
 *   createJ3Lesson1Deck
 *   rebuildLesson1Deck   rebuilds a deck IN PLACE, keeping its file id so the
 *   rebuildLesson2Deck   two links in that lesson's teacher brief and the
 *   …3, …4, …5           department's shared copy keep working. Refuses to run
 *   rebuildJ2Lesson1Deck on a lesson whose deck has not been created yet.
 *   rebuildJ3Lesson1Deck
 *   exportDeckProofs     renders every slide of that deck to a picture in Drive
 *                        ("KS3 DT Deck Proofs"), so the built pixels are read
 *                        before anyone is told the deck is ready (DFM 225b).
 *                        Run it straight after the rebuild, every time.
 *   exportLesson2Proofs  the same, per lesson; exportAllDeckProofs does the set.
 *   …3, …4, …5
 *   exportJ2Lesson1Proofs / exportJ3Lesson1Proofs
 *
 * EVERY FUNCTION NAME CARRIES ITS YEAR FROM THE J2/J3 ROUND ON (K26, 17 Aug
 * 2026). "Lesson 1" is now three different lessons, so a dropdown entry reading
 * only rebuildLesson1Deck would be a coin toss in front of him. J1's five keep
 * their existing names exactly — they are in his run log and in the handover
 * file — and every new year is named for its year.
 *
 * Built ${new Date().toISOString().slice(0, 10)} from contentVersion ${JSON.parse(fs.readFileSync(path.join(PACKED, 'index.json'), 'utf8')).contentVersion}.
 */

var PAGES_IMG = ${JSON.stringify(PAGES)};
var DECKS = ${JSON.stringify(DATA, null, 1)};
var CONSENT = ${JSON.stringify(CONSENT, null, 1)};
var W = 720, H = 405;
var FOLDER_NAME = 'KS3 DT Teacher Slide Decks';
`;

const body = String.raw`
/* ============================ the renderer ============================ */

function themeOf_(d) { return d.theme || {}; }

function bgImage_(slide, d, which) {
  var url = PAGES_IMG + 'deck/' + d.lesson + '/' + which + '-bg.png';
  var img = slide.insertImage(url);
  img.setLeft(0).setTop(0).setWidth(W).setHeight(H);
  img.sendToBack();
  return img;
}

function text_(slide, str, x, y, w, h, o) {
  o = o || {};
  var t = slide.insertTextBox(str, x, y, w, h);
  var st = t.getText().getTextStyle();
  st.setForegroundColor(o.color || '#FFFFFF');
  st.setFontSize(o.size || 16);
  st.setFontFamily(o.font || 'Inter');
  st.setBold(!!o.bold);
  if (o.spacing) t.getText().getParagraphStyle().setLineSpacing(o.spacing);
  if (o.align) t.getText().getParagraphStyle().setParagraphAlignment(o.align);
  return t;
}

/* the kicker label every slide carries, so a teacher always knows where she is */
function kicker_(slide, d, label) {
  if (!label) return;
  var t = text_(slide, String(label).toUpperCase(), 44, 22, W - 88, 20,
    { size: 9, bold: true, color: themeOf_(d).accent, font: themeOf_(d).body });
  t.getText().getTextStyle().setBold(true);
}

/* THE ONE PLACE A LINE COUNT IS WORKED OUT (DFM 225e).
   Every block that advances down the slide asks this, and nothing anywhere
   advances by a fixed amount per item. The old closer added a flat 30pt a
   bullet, which was an ESTIMATED line count wearing layout clothes — so the
   moment a bullet wrapped, its second line landed under the next one and the
   word "you." was left orphaned on Slide 17.
   The calibration is bullets_'s own, kept: 78 characters filled a 610pt box at
   13pt, i.e. 0.60 x font size per character. Wrapping is worked out WORD by
   word rather than by dividing the length, because a long word straddling the
   end of a line is exactly the case a division misses. */
function lineCount_(str, boxW, size) {
  var perChar = 0.60 * (size || 13);
  var perLine = Math.max(8, Math.floor(boxW / perChar));
  var words = String(str == null ? '' : str).split(/\s+/);
  var lines = 1, cur = 0;
  for (var i = 0; i < words.length; i++) {
    if (!words[i]) continue;
    var add = words[i].length + (cur ? 1 : 0);
    if (cur > 0 && cur + add > perLine) { lines++; cur = words[i].length; }
    else cur += add;
  }
  return lines;
}

/* NO LONE LAST WORD (read off the proofs, 15 Aug 2026).
   His find on Slide 17 was the word "you." sitting by itself on the last line.
   Fixing the line ADVANCE fixed the spacing but not the orphan, and the proofs
   showed four more of them — "who." on the Vault slide, "else." on the last-two-
   screens slide, "year." and "ranked." in the two-column list. No amount of
   arithmetic prevents this, because it depends on where the renderer breaks.
   So the last two words are tied together with a non-breaking space: whatever
   the box width, whatever the font does, they wrap as a pair and a single word
   can never be stranded. It costs nothing and it is true of every future deck.
   The AUTHORED sentence is untouched — this is a rendering nicety, so the
   language ledger's hash of the real text still matches. */
function tie_(s) {
  var t = String(s == null ? '' : s);
  var i = t.replace(/\s+$/, '').lastIndexOf(' ');
  if (i < 1) return t;
  return t.slice(0, i) + '\u00A0' + t.slice(i + 1);   /* the non-breaking space, written as an escape so the generated file stays plain ASCII */
}

function bullets_(slide, d, arr, top, size) {
  var th = themeOf_(d);
  var y = top;
  var fit = fitSize_(arr, W - 66 - 44, (H - 24) - top, size || 13, 1.462, 12);
  var sz = fit.size, LH = fit.lh;
  for (var i = 0; i < arr.length; i++) {
    /* a small accent dot instead of a bullet glyph: it reads as design rather
       than as a word-processor list */
    var dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 46, y + 6, 7, 7);
    dot.getFill().setSolidFill(th.accent);
    dot.getBorder().setTransparent();
    var lines = lineCount_(arr[i], W - 66 - 44, sz);
    var t = text_(slide, tie_(arr[i]), 66, y - 2, W - 66 - 44, Math.max(40, lines * LH + 10),
      { size: sz, color: '#FFFFFF', font: th.body, spacing: 108 });
    y += Math.max(LH + 11, lines * LH + 12);
  }
  return y;
}

/* WHICH LESSON THIS IS, TAKEN FROM THE DECK'S OWN ID (read off the proofs,
   16 Aug 2026). The objectives slide used to say the words "LESSON 1" no matter
   whose deck it was, and on Lesson 1 that was true — which is exactly why it
   survived his style gate and every machine check: the one deck a human had
   looked at was the one the hardcoded answer happened to fit. A label that
   names a slide's own lesson is derived, never typed. */
function lessonKicker_(d) {
  var m = String(d.lesson || '').match(/(\d+)\s*$/);
  return m ? 'LESSON ' + parseInt(m[1], 10) : 'THIS LESSON';
}

/* WHERE THE CONTENT MAY START, given a heading that might wrap (read off the
   proofs, 16 Aug 2026). Lesson 4's "Stuck? Help that is free - and help that
   costs" wrapped to a second line and the word "costs" landed underneath the
   first bullet, because the heading was drawn in a fixed box and the bullets
   began at a fixed y. lineCount_ has existed since DFM 225(e); it was simply
   never asked about the heading. */
function headFloor_(heading, boxW, size, top, floor) {
  var lines = lineCount_(heading, boxW, size);
  return Math.max(floor, top + lines * (size * 1.25) + 18);
}

/* NOTHING RUNS OFF THE BOTTOM OF A SLIDE (read off the proofs, 16 Aug 2026).
   Lesson 5's Studio Sprint lost its last line - "only when all four tests are
   green" - over the bottom edge, and a bullet a class cannot read is worse than
   a bullet a class has to squint at. The type steps down half a point at a time
   until the block fits the room it actually has; a slide that already fits is
   rendered at exactly the size it was before, so approved decks are untouched. */
function fitSize_(arr, boxW, avail, base, lhFactor, gap) {
  for (var s = base; s >= base - 3.5; s -= 0.5) {
    if (s < 9) break;
    var lh = s * lhFactor, tot = 0;
    for (var i = 0; i < arr.length; i++) {
      tot += Math.max(gap + lh, lineCount_(arr[i], boxW, s) * lh + gap);
    }
    if (tot <= avail) return { size: s, lh: lh };
  }
  var sm = Math.max(9, base - 3.5);
  return { size: sm, lh: sm * lhFactor };
}

function shotUrl_(d, name) {
  return PAGES_IMG + 'deck/' + d.lesson + '/shot-' + name + '.png';
}

/* place N framed screenshots in a row, sized to fit the space left under the
   text — never stretched, because a squashed screenshot of her own screen is
   worse than none */
function shots_(slide, d, names, top, maxH) {
  if (!names || !names.length) return;
  var gap = 12;
  var cellW = (W - 88 - gap * (names.length - 1)) / names.length;
  for (var i = 0; i < names.length; i++) {
    try {
      var img = slide.insertImage(shotUrl_(d, names[i]));
      var ratio = img.getWidth() / img.getHeight();
      var h = maxH, w = h * ratio;
      if (w > cellW) { w = cellW; h = w / ratio; }
      img.setWidth(w).setHeight(h);
      img.setLeft(44 + i * (cellW + gap) + (cellW - w) / 2).setTop(top);
    } catch (e) { /* a missing shot must never stop the whole deck building */ }
  }
}

function slideTitle_(slide, d, s) {
  var th = themeOf_(d);
  bgImage_(slide, d, s.bg || 'title');
  if (s.kicker) {
    text_(slide, s.kicker, 44, 96, W - 88, 20,
      { size: 9.5, bold: true, color: th.accent2, font: th.body, align: SlidesApp.ParagraphAlignment.CENTER });
  }
  text_(slide, s.heading, 44, 130, W - 88, 70,
    { size: 40, bold: true, color: '#FFFFFF', font: th.display, align: SlidesApp.ParagraphAlignment.CENTER });
  if (s.sub) {
    text_(slide, tie_(s.sub), 44, 248, W - 88, 40,
      { size: 13, color: th.dim, font: th.body, align: SlidesApp.ParagraphAlignment.CENTER });
  }
}

function slideObjectives_(slide, d, s) {
  var th = themeOf_(d);
  bgImage_(slide, d, s.bg || 'section');
  kicker_(slide, d, lessonKicker_(d));
  text_(slide, s.heading, 44, 52, W - 88, 34,
    { size: 27, bold: true, color: '#FFFFFF', font: th.display });
  bullets_(slide, d, s.bullets || [], headFloor_(s.heading, W - 88, 27, 52, 108), 13.5);
}

function slideBullets_(slide, d, s, label) {
  var th = themeOf_(d);
  bgImage_(slide, d, s.bg || 'section');
  kicker_(slide, d, label);
  text_(slide, s.heading, 44, 52, W - 88, 32,
    { size: 25, bold: true, color: '#FFFFFF', font: th.display });
  var hasShot = !!s.shot;
  var arr = s.bullets || [];
  var top = headFloor_(s.heading, W - 88, 25, 52, 104);
  if (hasShot) {
    /* text left, her real screen right — the two-column shape */
    var y = top;
    var fit = fitSize_(arr, 330, (H - 22) - top, s.size ? s.size - 2 : 11.5, 1.304, 12);
    for (var i = 0; i < arr.length; i++) {
      var dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 46, y + 6, 6, 6);
      dot.getFill().setSolidFill(th.accent);
      dot.getBorder().setTransparent();
      var bl = lineCount_(arr[i], 330, fit.size);
      text_(slide, tie_(arr[i]), 62, y - 2, 330, Math.max(40, bl * fit.lh + 10),
        { size: fit.size, color: '#FFFFFF', font: th.body, spacing: 106 });
      y += Math.max(fit.lh + 11, bl * fit.lh + 12);
    }
    try {
      var img = slide.insertImage(shotUrl_(d, s.shot));
      var ratio = img.getWidth() / img.getHeight();
      var maxW = 250, maxH = H - (top + 16) - 34;
      var w = maxW, h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      img.setWidth(w).setHeight(h).setLeft(W - 44 - w).setTop(top);
    } catch (e) { }
  } else {
    bullets_(slide, d, arr, top, s.size ? s.size - 2 : 13);
  }
}

function slideStep_(slide, d, s, label) {
  var th = themeOf_(d);
  bgImage_(slide, d, s.bg || 'section');
  kicker_(slide, d, label);
  text_(slide, s.heading, 44, 52, W - 88, 30,
    { size: 21, bold: true, color: '#FFFFFF', font: th.display });
  text_(slide, tie_(s.text || ''), 44, 96, 300, H - 130,
    { size: 12.5, color: '#FFFFFF', font: th.body, spacing: 112 });
  var c = CONSENT[s.img];
  if (c) {
    var blob = Utilities.newBlob(Utilities.base64Decode(c.b64), c.mime, s.img + '.png');
    var img = slide.insertImage(blob);
    var ratio = img.getWidth() / img.getHeight();
    var maxH = H - 100 - 28, maxW = 320;
    var h = maxH, w = h * ratio;
    if (w > maxW) { w = maxW; h = w / ratio; }
    img.setWidth(w).setHeight(h).setLeft(W - 44 - w).setTop(96);
  }
}

/* THE STOP SLIDE — the one a teacher puts up when the room must face front.
   Deliberately unmistakable from the back row: the beacon number, a heading
   that says STOP, and her pupils' own screens underneath. */
function slideStop_(slide, d, s, label) {
  var th = themeOf_(d);
  bgImage_(slide, d, s.bg || 'stop');
  kicker_(slide, d, label);
  if (s.beacon) {
    var ring = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 44, 46, 42, 42);
    ring.getFill().setSolidFill(th.accent);
    ring.getBorder().setTransparent();
    var n = text_(slide, String(s.beacon), 44, 54, 42, 26,
      { size: 20, bold: true, color: th.ground, font: th.display,
        align: SlidesApp.ParagraphAlignment.CENTER });
    n.getText().getTextStyle().setBold(true);
  }
  text_(slide, s.heading, s.beacon ? 100 : 44, 50, W - (s.beacon ? 100 : 44) - 44, 34,
    { size: 24, bold: true, color: '#FFFFFF', font: th.display });
  var arr = s.bullets || [];
  var top = headFloor_(s.heading, W - (s.beacon ? 100 : 44) - 44, 24, 50, 104);
  var y = top;
  /* a stop slide that carries her screens keeps room for them; one that does
     not may use the whole page */
  var room = (H - (s.shots && s.shots.length ? 120 : 22)) - top;
  var fit = fitSize_(arr, W - 62 - 44, room, 12.5, 1.2, 11);
  for (var i = 0; i < arr.length; i++) {
    var dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 46, y + 6, 6, 6);
    dot.getFill().setSolidFill(th.accent);
    dot.getBorder().setTransparent();
    var sl = lineCount_(arr[i], W - 62 - 44, fit.size);
    text_(slide, tie_(arr[i]), 62, y - 2, W - 62 - 44, Math.max(36, sl * fit.lh + 10),
      { size: fit.size, color: '#FFFFFF', font: th.body, spacing: 106 });
    y += Math.max(fit.lh + 11, sl * fit.lh + 11);
  }
  shots_(slide, d, s.shots, Math.max(y + 8, 214), H - Math.max(y + 8, 214) - 26);
}

function slideCloser_(slide, d, s, label) {
  var th = themeOf_(d);
  bgImage_(slide, d, s.bg || 'closer');
  kicker_(slide, d, label);
  text_(slide, s.heading, 44, 92, W - 88, 44,
    { size: 34, bold: true, color: '#FFFFFF', font: th.display,
      align: SlidesApp.ParagraphAlignment.CENTER });
  /* THE CENTRED 500pt BOX. Each line is measured before anything is placed, so
     a wrapped bullet takes the room it actually needs and the block sits
     balanced between the heading and the sign-off line, whatever the words are
     (DFM 225e — layout arithmetic is never an estimate). */
  var arr = s.bullets || [];
  var BOX = W - 220, GAP = 12;
  var BAND_TOP = 150, BAND_BOTTOM = H - 74;   /* 74 = the sign-off line's room */
  /* AND THE BAND IS A CEILING, NOT A HOPE (read off the proofs, 16 Aug 2026).
     Lesson 3's closer ran four paragraphs, one of them wrapping to three lines,
     and the block simply grew past the band until "See you in a fortnight." was
     printed on top of "waiting for you." Measuring every line was only half the
     job (DFM 225e); the other half is doing something when the measurement does
     not fit. */
  var cf = fitSize_(arr, BOX, (BAND_BOTTOM - BAND_TOP), 13, 1.462, GAP);
  var SZ = cf.size, LH = cf.lh;
  var heights = [], total = 0;
  for (var m = 0; m < arr.length; m++) {
    var h = lineCount_(arr[m], BOX, SZ) * LH;
    heights.push(h);
    total += h + GAP;
  }
  if (arr.length) total -= GAP;
  var y = Math.max(BAND_TOP, BAND_TOP + ((BAND_BOTTOM - BAND_TOP) - total) / 2);
  for (var i = 0; i < arr.length; i++) {
    text_(slide, tie_(arr[i]), 110, y, BOX, heights[i] + 6,
      { size: SZ, color: '#FFFFFF', font: th.body,
        align: SlidesApp.ParagraphAlignment.CENTER });
    y += heights[i] + GAP;
  }
  if (s.sub) {
    text_(slide, s.sub, 44, H - 62, W - 88, 26,
      { size: 13, bold: true, color: th.accent2, font: th.body,
        align: SlidesApp.ParagraphAlignment.CENTER });
  }
}

function renderSlide_(pres, d, s, label) {
  var slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  if (s.kind === 'title') slideTitle_(slide, d, s);
  else if (s.kind === 'objectives') slideObjectives_(slide, d, s);
  else if (s.kind === 'step') slideStep_(slide, d, s, label);
  else if (s.kind === 'stop') slideStop_(slide, d, s, label);
  else if (s.kind === 'closer') slideCloser_(slide, d, s, label);
  else slideBullets_(slide, d, s, label);
  /* THE SCRIPT: the teacher's own words, in presenter view, on every slide
     (DFM 220b — one source, two renderings; the brief prints the same text) */
  if (s.notes) {
    var np = slide.getNotesPage().getSpeakerNotesShape();
    if (np) np.getText().setText(s.notes);
  }
  return slide;
}

/* =================== rebuild a deck IN PLACE, keeping its id =============== */
function rebuildDeck_(lessonId) {
  var d = DECKS[lessonId];
  if (!d) throw new Error('no deck data for ' + lessonId);
  if (!d.driveFileId) {
    /* A REBUILD NEVER CREATES. If this deck has no id recorded yet, silently
       making a new file here would leave TWO decks in his Drive with the same
       name and no way to tell which one the brief links to. Creation is its own
       named function, run once, and it prints the id he reads back. */
    throw new Error(lessonId + ' has no driveFileId yet — run create' +
      lessonLabel_(lessonId) + 'Deck first, then record the id it logs.');
  }
  /* IN PLACE: the brief prints two links to this file id and the department
     already has it shared. A new file would break both (DFM 111/62). */
  var pres = SlidesApp.openById(d.driveFileId);
  var old = pres.getSlides();
  for (var i = 0; i < old.length; i++) old[i].remove();
  var n = 0;
  for (var si = 0; si < d.sections.length; si++) {
    var sec = d.sections[si];
    for (var sl = 0; sl < sec.slides.length; sl++) {
      renderSlide_(pres, d, sec.slides[sl], sec.label);
      n++;
    }
  }
  pres.saveAndClose();
  var file = DriveApp.getFileById(pres.getId());
  try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  Logger.log('================ DECK REBUILT ================');
  Logger.log(d.deckName);
  Logger.log(n + ' slides written from contentVersion-packed data');
  Logger.log('Read-only link : https://docs.google.com/presentation/d/' + pres.getId() + '/edit');
  Logger.log('Make-a-copy    : https://docs.google.com/presentation/d/' + pres.getId() + '/copy');
  Logger.log('');
  Logger.log('NEXT, BEFORE ANYONE IS TOLD THIS DECK IS READY: run exportDeckProofs');
  Logger.log('from the dropdown. It renders every slide to a picture in Drive so the');
  Logger.log('BUILT PIXELS can be read, not the arithmetic that produced them.');
  return pres.getId();
}

/* THE NAME OF THE FUNCTION HE RUNS, DERIVED FROM THE DECK'S OWN ID.
   It used to be 'Lesson' + the number, which was right while J1 was the only
   year on the platform and wrong the moment J2 arrived: j1-01 and j2-01 both
   produced "Lesson1", so an error message would have told him to run a function
   that rebuilds a different year's deck. J1's five names are unchanged — they are
   in his own run log — and every other year is qualified by its year. */
function lessonLabel_(lessonId) {
  var parts = String(lessonId).split('-');
  var year = parts[0], num = String(Number(parts[1]));
  if (year === 'j1') return 'Lesson' + num;
  return year.toUpperCase() + 'Lesson' + num;
}

/* ============ create a deck ONCE, and print the id he reads back ==========
   Lessons 2-5 have no deck in his Drive yet. Creation is deliberately separate
   from rebuilding, and deliberately refuses to run twice, because the ORDER of
   this round depends on it: he creates each deck, reads its id back, the id is
   written into the deck data AND into the brief's two resource links, and only
   THEN is the content packed — so every link in every shipped brief is born
   live instead of pointing at nothing (L2 spec §7). */
function createDeck_(lessonId) {
  var d = DECKS[lessonId];
  if (!d) throw new Error('no deck data for ' + lessonId);
  if (d.driveFileId) {
    throw new Error(d.deckName + ' already exists (file id ' + d.driveFileId +
      '). Creating it again would leave two decks with the same name and the ' +
      'brief pointing at the wrong one. Run rebuild' + lessonLabel_(lessonId) +
      'Deck instead — it rebuilds in place and keeps every link working.');
  }
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  var pres = SlidesApp.create(d.deckName);
  DriveApp.getFileById(pres.getId()).moveTo(folder);
  /* SlidesApp.create() opens with one default slide; it is removed so the deck
     starts on the title slide the data describes */
  var seeded = pres.getSlides();
  for (var i = 0; i < seeded.length; i++) seeded[i].remove();

  var n = 0;
  for (var si = 0; si < d.sections.length; si++) {
    var sec = d.sections[si];
    for (var sl = 0; sl < sec.slides.length; sl++) {
      renderSlide_(pres, d, sec.slides[sl], sec.label);
      n++;
    }
  }
  pres.saveAndClose();
  var file = DriveApp.getFileById(pres.getId());
  /* read-only to everyone who has the link, so any DT teacher opens it without
     asking for access (DFM 62) */
  try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }

  Logger.log('================ DECK CREATED ================');
  Logger.log(d.deckName);
  Logger.log(n + ' slides written from contentVersion-packed data');
  Logger.log('Folder         : ' + FOLDER_NAME);
  Logger.log('');
  Logger.log('>>> THE FILE ID — READ THIS LINE BACK, IT IS THE ONE THING NEEDED <<<');
  Logger.log('>>> ' + pres.getId());
  Logger.log('');
  Logger.log('Read-only link : https://docs.google.com/presentation/d/' + pres.getId() + '/edit');
  Logger.log('Make-a-copy    : https://docs.google.com/presentation/d/' + pres.getId() + '/copy');
  Logger.log('');
  Logger.log('The brief\'s two links are filled in from that id, and the content is');
  Logger.log('packed AFTER it — so no teacher ever meets a resource row that leads');
  Logger.log('nowhere. From now on this deck is updated with rebuild' +
    lessonLabel_(lessonId) + 'Deck,');
  Logger.log('which keeps this id and therefore keeps every link working.');
  return pres.getId();
}

/* ═══════════ ONE BUTTON FOR A WHOLE ROUND (18 Aug 2026) ═══════════════════
   THIS IS THE FIRST PUBLIC FUNCTION IN THE FILE ON PURPOSE: a freshly loaded
   project selects it by default, so a whole round can be run without ever
   touching the function picker.

   WHY IT EXISTS. A round is now seven decks: rebuild each, then export each
   deck's proof set for the eyes-on-pixels read (DFM 225b). That was fourteen
   dropdown selections, each one a chance to run the wrong year's function in
   front of him — the exact risk the year-qualified names (template §7) were
   introduced to reduce. One entry point removes the choice entirely.

   IT IS RESUMABLE, because fourteen jobs do not fit in Apps Script's six
   minutes. It stops at four, records where it got to in a script property, and
   says so; pressing Run again picks up at the next job. Nothing is repeated and
   nothing is skipped — and because the position is stored rather than assumed,
   a browser crash or a closed tab costs one job, not the round.

   THE LIST IS DERIVED from the deck data, never typed (K23): a deck that exists
   is a deck this round covers, because existing is what puts it on the list. */
function runDeckRound() {
  var props = PropertiesService.getScriptProperties();
  var KEY = 'ks3dt.round.at';
  var ids = Object.keys(DECKS).sort().filter(function (id) {
    return DECKS[id] && DECKS[id].driveFileId;
  });
  var jobs = [], i;
  for (i = 0; i < ids.length; i++) jobs.push({ kind: 'rebuild', id: ids[i] });
  for (i = 0; i < ids.length; i++) jobs.push({ kind: 'proof', id: ids[i] });

  var at = Number(props.getProperty(KEY) || 0);
  if (!(at >= 0) || at >= jobs.length) at = 0;
  var started = new Date().getTime();
  var BUDGET_MS = 4 * 60 * 1000;

  Logger.log('================ DECK ROUND ================');
  Logger.log(ids.length + ' deck(s): ' + ids.join(', '));
  Logger.log(jobs.length + ' jobs — every deck rebuilt, then every proof set exported');
  Logger.log('starting at job ' + (at + 1) + ' of ' + jobs.length);
  Logger.log('');

  while (at < jobs.length && (new Date().getTime() - started) < BUDGET_MS) {
    var job = jobs[at];
    Logger.log('---------- job ' + (at + 1) + ' of ' + jobs.length + ': ' +
      job.kind + ' ' + job.id + ' ----------');
    if (job.kind === 'rebuild') rebuildDeck_(job.id);
    else exportDeckProofs_(job.id);
    at++;
    props.setProperty(KEY, String(at));
  }

  Logger.log('');
  if (at >= jobs.length) {
    props.deleteProperty(KEY);
    Logger.log('================ ROUND COMPLETE ================');
    Logger.log('Every deck rebuilt in place and every proof set exported.');
    Logger.log('The proofs are now read, slide by slide, before any deck is called ready.');
  } else {
    Logger.log('================ PAUSED, NOT FINISHED ================');
    Logger.log(at + ' of ' + jobs.length + ' jobs done. It stopped short of the six-minute');
    Logger.log('limit on purpose. PRESS RUN AGAIN — it starts at job ' + (at + 1) + '.');
  }
  return at + '/' + jobs.length;
}

/* Start the round again from job 1 — only needed if a round is abandoned
   half-way and the next one should not resume into it. */
function resetDeckRound() {
  PropertiesService.getScriptProperties().deleteProperty('ks3dt.round.at');
  Logger.log('The round position is cleared. runDeckRound starts at job 1.');
}

function createLesson2Deck() { return createDeck_('j1-02'); }
function createLesson3Deck() { return createDeck_('j1-03'); }
function createLesson4Deck() { return createDeck_('j1-04'); }
function createLesson5Deck() { return createDeck_('j1-05'); }
/* THE TWO NEW YEARS. Created ONCE each, then rebuilt in place for ever after —
   the same contract J1's decks live under (template §7). */
function createJ2Lesson1Deck() { return createDeck_('j2-01'); }
function createJ3Lesson1Deck() { return createDeck_('j3-01'); }

function rebuildLesson1Deck() { return rebuildDeck_('j1-01'); }
function rebuildLesson2Deck() { return rebuildDeck_('j1-02'); }
function rebuildLesson3Deck() { return rebuildDeck_('j1-03'); }
function rebuildLesson4Deck() { return rebuildDeck_('j1-04'); }
function rebuildLesson5Deck() { return rebuildDeck_('j1-05'); }
function rebuildJ2Lesson1Deck() { return rebuildDeck_('j2-01'); }
function rebuildJ3Lesson1Deck() { return rebuildDeck_('j3-01'); }

/* ===================== the proofs (DFM 225b, standing) ====================
   A deck is never handed over on the strength of the code that built it. Slide
   17 shipped with the word "you." stranded on its own line, and nothing in the
   build could have said so: the arithmetic believed itself. So every slide is
   rendered to a picture and READ, eyes on pixels, before the deck is declared
   ready — DFM 194c, extended from the platform to decks.

   Rendering uses the Slides API's own thumbnail, taken through the advanced
   service when the project has it switched on and through a plain authorised
   request when it does not, so the proofs never depend on a setting somebody
   forgot to tick. */
var PROOFS_ROOT = 'KS3 DT Deck Proofs';

function subFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function thumbUrl_(presId, pageId) {
  /* the advanced service, if this project has Slides switched on */
  try {
    if (typeof Slides !== 'undefined' && Slides.Presentations && Slides.Presentations.Pages) {
      var r = Slides.Presentations.Pages.getThumbnail(presId, pageId,
        { 'thumbnailProperties.thumbnailSize': 'LARGE' });
      if (r && r.contentUrl) return r.contentUrl;
    }
  } catch (e) { /* fall through to the request below */ }
  var url = 'https://slides.googleapis.com/v1/presentations/' + presId +
    '/pages/' + pageId + '/thumbnail?thumbnailProperties.thumbnailSize=LARGE';
  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('could not render slide ' + pageId + ' — ' +
      res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
  }
  return JSON.parse(res.getContentText()).contentUrl;
}

function exportDeckProofs_(lessonId) {
  var d = DECKS[lessonId];
  if (!d) throw new Error('no deck data for ' + lessonId);
  if (!d.driveFileId) throw new Error(lessonId + ' has no driveFileId — build the deck first');
  var pres = SlidesApp.openById(d.driveFileId);
  var slides = pres.getSlides();
  if (!slides.length) throw new Error('the deck has no slides — run its rebuild function first');

  var root = subFolder_(DriveApp.getRootFolder(), PROOFS_ROOT);
  var folder = subFolder_(root, d.deckName);
  /* a proof set is a photograph of ONE build: last round's pictures are cleared
     so nobody can read a stale slide and think it is the current one */
  var old = folder.getFiles(), cleared = 0;
  while (old.hasNext()) { old.next().setTrashed(true); cleared++; }

  Logger.log('================ DECK PROOFS ================');
  Logger.log(d.deckName);
  Logger.log(slides.length + ' slides · folder "' + PROOFS_ROOT + '/' + d.deckName + '"' +
    (cleared ? ' (' + cleared + ' old proof(s) cleared)' : ''));
  var urls = [];
  for (var i = 0; i < slides.length; i++) {
    var num = (i + 1 < 10 ? '0' : '') + (i + 1);
    var name = 'proof-' + num + '.png';
    var blob = UrlFetchApp.fetch(thumbUrl_(pres.getId(), slides[i].getObjectId()))
      .getBlob().setName(name);
    var file = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
    catch (e) { /* a domain that forbids link sharing still keeps the file */ }
    var link = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    urls.push(link);
    Logger.log('  slide ' + num + '  ' + link);
  }
  Logger.log('');
  Logger.log('Folder: ' + folder.getUrl());
  Logger.log('THESE ARE READ BEFORE THE DECK IS DECLARED READY. Every slide, every');
  Logger.log('line — an orphaned word or a wrong screenshot only ever shows here.');
  return urls;
}

function exportDeckProofs() { return exportDeckProofs_('j1-01'); }
function exportLesson2Proofs() { return exportDeckProofs_('j1-02'); }
function exportLesson3Proofs() { return exportDeckProofs_('j1-03'); }
function exportLesson4Proofs() { return exportDeckProofs_('j1-04'); }
function exportLesson5Proofs() { return exportDeckProofs_('j1-05'); }
function exportJ2Lesson1Proofs() { return exportDeckProofs_('j2-01'); }
function exportJ3Lesson1Proofs() { return exportDeckProofs_('j3-01'); }

/* EVERY PROOF SET IN ONE RUN, and the list is DERIVED from the deck data rather
   than typed. It used to be a hardcoded array of five, which was true on the day
   it was written and would have silently skipped both new decks — the exact
   shape of K23's complaint ("a hardcoded list closes today's instance and
   nothing else"). A deck that exists is a deck whose proofs get exported,
   because existing is what puts it on the list. */
function exportAllDeckProofs() {
  var out = {}, ids = Object.keys(DECKS).sort(), done = 0;
  for (var i = 0; i < ids.length; i++) {
    if (!DECKS[ids[i]] || !DECKS[ids[i]].driveFileId) {
      Logger.log('(skipped ' + ids[i] + ' — no deck created yet)');
      continue;
    }
    out[ids[i]] = exportDeckProofs_(ids[i]);
    done++;
  }
  Logger.log('');
  Logger.log(done + ' of ' + ids.length + ' deck(s) had proofs exported. Any line above that');
  Logger.log('says "skipped" is a deck that has not been created yet — run its create function.');
  return out;
}
`;

fs.writeFileSync(OUT, header + body);
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log('wrote ' + path.relative(ROOT, OUT) + '  (' + kb + ' KB)');
console.log('decks: ' + Object.keys(DATA).join(', '));
console.log('consent images embedded: ' + Object.keys(CONSENT).map(k => k + '=' + CONSENT[k].from).join(', ') || '(none found)');
