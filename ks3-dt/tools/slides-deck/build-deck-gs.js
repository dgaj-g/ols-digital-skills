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
 *   exportDeckProofs     renders every slide of that deck to a picture in Drive
 *                        ("KS3 DT Deck Proofs"), so the built pixels are read
 *                        before anyone is told the deck is ready (DFM 225b).
 *                        Run it straight after the rebuild, every time.
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
  var sz = size || 13;
  for (var i = 0; i < arr.length; i++) {
    /* a small accent dot instead of a bullet glyph: it reads as design rather
       than as a word-processor list */
    var dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 46, y + 6, 7, 7);
    dot.getFill().setSolidFill(th.accent);
    dot.getBorder().setTransparent();
    var lines = lineCount_(arr[i], W - 66 - 44, sz);
    var t = text_(slide, tie_(arr[i]), 66, y - 2, W - 66 - 44, Math.max(40, lines * 19 + 10),
      { size: sz, color: '#FFFFFF', font: th.body, spacing: 108 });
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
    text_(slide, tie_(s.sub), 44, 248, W - 88, 40,
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
      var bs = s.size ? s.size - 2 : 11.5;
      var bl = lineCount_(arr[i], 330, bs);
      text_(slide, tie_(arr[i]), 62, y - 2, 330, Math.max(40, bl * 15 + 10),
        { size: bs, color: '#FFFFFF', font: th.body, spacing: 106 });
      y += Math.max(26, bl * 15 + 12);
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
  var y = 104;
  for (var i = 0; i < arr.length; i++) {
    var dot = slide.insertShape(SlidesApp.ShapeType.ELLIPSE, 46, y + 6, 6, 6);
    dot.getFill().setSolidFill(th.accent);
    dot.getBorder().setTransparent();
    var sl = lineCount_(arr[i], W - 62 - 44, 12.5);
    text_(slide, tie_(arr[i]), 62, y - 2, W - 62 - 44, Math.max(36, sl * 15 + 10),
      { size: 12.5, color: '#FFFFFF', font: th.body, spacing: 106 });
    y += Math.max(26, sl * 15 + 11);
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
  var BOX = W - 220, SZ = 13, LH = 19, GAP = 12;
  var heights = [], total = 0;
  for (var m = 0; m < arr.length; m++) {
    var h = lineCount_(arr[m], BOX, SZ) * LH;
    heights.push(h);
    total += h + GAP;
  }
  if (arr.length) total -= GAP;
  var BAND_TOP = 150, BAND_BOTTOM = H - 74;   /* 74 = the sign-off line's room */
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
  Logger.log('');
  Logger.log('NEXT, BEFORE ANYONE IS TOLD THIS DECK IS READY: run exportDeckProofs');
  Logger.log('from the dropdown. It renders every slide to a picture in Drive so the');
  Logger.log('BUILT PIXELS can be read, not the arithmetic that produced them.');
  return pres.getId();
}

function rebuildLesson1Deck() { return rebuildDeck_('j1-01'); }

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
`;

fs.writeFileSync(OUT, header + body);
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log('wrote ' + path.relative(ROOT, OUT) + '  (' + kb + ' KB)');
console.log('decks: ' + Object.keys(DATA).join(', '));
console.log('consent images embedded: ' + Object.keys(CONSENT).map(k => k + '=' + CONSENT[k].from).join(', ') || '(none found)');
