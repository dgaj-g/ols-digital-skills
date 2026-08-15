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
 *   rebuildLesson1Deck   rebuilds Lesson 1's deck IN PLACE, keeping its file id
 *                        so the two links in the Lesson 1 teacher brief and the
 *                        department's shared copy keep working.
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

function bullets_(slide, d, arr, top, size) {
  var th = themeOf_(d);
  var y = top;
  for (var i = 0; i < arr.length; i++) {
    /* a small accent dot instead of a bullet glyph: it reads as design rather
       than as a word-processor list */
    var dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 46, y + 6, 7, 7);
    dot.getFill().setSolidFill(th.accent);
    dot.getBorder().setTransparent();
    var t = text_(slide, arr[i], 66, y - 2, W - 66 - 44, 40,
      { size: size || 13, color: '#FFFFFF', font: th.body, spacing: 108 });
    var lines = Math.ceil(String(arr[i]).length / 78);
    y += Math.max(30, lines * 19 + 12);
  }
  return y;
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
    text_(slide, s.sub, 44, 248, W - 88, 40,
      { size: 13, color: th.dim, font: th.body, align: SlidesApp.ParagraphAlignment.CENTER });
  }
}

function slideObjectives_(slide, d, s) {
  var th = themeOf_(d);
  bgImage_(slide, d, s.bg || 'section');
  kicker_(slide, d, 'LESSON 1');
  text_(slide, s.heading, 44, 52, W - 88, 34,
    { size: 27, bold: true, color: '#FFFFFF', font: th.display });
  bullets_(slide, d, s.bullets || [], 108, 13.5);
}

function slideBullets_(slide, d, s, label) {
  var th = themeOf_(d);
  bgImage_(slide, d, s.bg || 'section');
  kicker_(slide, d, label);
  text_(slide, s.heading, 44, 52, W - 88, 32,
    { size: 25, bold: true, color: '#FFFFFF', font: th.display });
  var hasShot = !!s.shot;
  var arr = s.bullets || [];
  if (hasShot) {
    /* text left, her real screen right — the two-column shape */
    var y = 104;
    for (var i = 0; i < arr.length; i++) {
      var dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 46, y + 6, 6, 6);
      dot.getFill().setSolidFill(th.accent);
      dot.getBorder().setTransparent();
      text_(slide, arr[i], 62, y - 2, 330, 40,
        { size: s.size ? s.size - 2 : 11.5, color: '#FFFFFF', font: th.body, spacing: 106 });
      y += Math.max(26, Math.ceil(String(arr[i]).length / 44) * 15 + 12);
    }
    try {
      var img = slide.insertImage(shotUrl_(d, s.shot));
      var ratio = img.getWidth() / img.getHeight();
      var maxW = 250, maxH = H - 120 - 34;
      var w = maxW, h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      img.setWidth(w).setHeight(h).setLeft(W - 44 - w).setTop(104);
    } catch (e) { }
  } else {
    bullets_(slide, d, arr, 104, s.size ? s.size - 2 : 13);
  }
}

function slideStep_(slide, d, s, label) {
  var th = themeOf_(d);
  bgImage_(slide, d, s.bg || 'section');
  kicker_(slide, d, label);
  text_(slide, s.heading, 44, 52, W - 88, 30,
    { size: 21, bold: true, color: '#FFFFFF', font: th.display });
  text_(slide, s.text || '', 44, 96, 300, H - 130,
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
  var y = 104;
  for (var i = 0; i < arr.length; i++) {
    var dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 46, y + 6, 6, 6);
    dot.getFill().setSolidFill(th.accent);
    dot.getBorder().setTransparent();
    text_(slide, arr[i], 62, y - 2, W - 62 - 44, 36,
      { size: 12.5, color: '#FFFFFF', font: th.body, spacing: 106 });
    y += Math.max(26, Math.ceil(String(arr[i]).length / 82) * 15 + 11);
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
  var arr = s.bullets || [];
  var y = 168;
  for (var i = 0; i < arr.length; i++) {
    text_(slide, arr[i], 110, y, W - 220, 30,
      { size: 13, color: '#FFFFFF', font: th.body,
        align: SlidesApp.ParagraphAlignment.CENTER });
    y += 30;
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
  var pres;
  if (d.driveFileId) {
    /* IN PLACE: the brief prints two links to this file id and the department
       already has it shared. A new file would break both (DFM 111/62). */
    pres = SlidesApp.openById(d.driveFileId);
  } else {
    var folder, it = DriveApp.getFoldersByName(FOLDER_NAME);
    folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
    pres = SlidesApp.create(d.deckName);
    DriveApp.getFileById(pres.getId()).moveTo(folder);
  }
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
  return pres.getId();
}

function rebuildLesson1Deck() { return rebuildDeck_('j1-01'); }
`;

fs.writeFileSync(OUT, header + body);
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log('wrote ' + path.relative(ROOT, OUT) + '  (' + kb + ' KB)');
console.log('decks: ' + Object.keys(DATA).join(', '));
console.log('consent images embedded: ' + Object.keys(CONSENT).map(k => k + '=' + CONSENT[k].from).join(', ') || '(none found)');
