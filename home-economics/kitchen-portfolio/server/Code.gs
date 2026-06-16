/**
 * ============================================================
 * My Kitchen Portfolio - Path B backend (login-gated)
 * OLS Digital Skills - Home Economics (KS3 digital portfolio)
 * ------------------------------------------------------------
 * Deploy: Web app, Execute as: USER ACCESSING the web app,
 *         Who has access: within your domain (the sign-in gate).
 *
 * "Execute as user accessing" means every call runs AS THE PUPIL:
 *   - her portfolio Google Doc is created in HER OWN Drive (she owns it)
 *   - her photos/videos land in HER OWN Drive, tidily foldered
 *   - her working draft  -> PropertiesService USER properties (private)
 *   - completion metadata for the teacher dashboard -> SCRIPT properties
 *     (the one shared store a pupil-context call can write and a
 *      teacher-context call can read - no shared Sheet needed)
 *
 * The portfolio model (differs from the one-shot Mon Carnet build):
 *   ONE Doc per pupil per class, created on her FIRST submitted entry and
 *   auto-shared with her class's owning teacher. Every later practical
 *   reflection APPENDS a new dated page to the same Doc. Photos are
 *   embedded; videos are linked (and live in her Evidence folder).
 *
 * Drive layout created automatically in the pupil's Drive:
 *   OLS Digital Skills / Home Economics / <Year> /            (the Doc)
 *   OLS Digital Skills / Home Economics / <Year> / Evidence / <date dish> /
 *
 * Classes carry a YEAR GROUP (J1/J2/J3), chosen by the teacher when the
 * class is created. doGet injects it (OLS_BOOT.classYear) so the page
 * shows that year's focus areas and colour tone.
 *
 * Two files go into the Apps Script project:
 *   * this Code.gs
 *   * an HTML file named exactly "Index" (paste the assembled Index.html)
 * Run initBoard() once, then set staffPasscode + teacherEmail in
 * Project Settings -> Script Properties.
 *
 * Pure ASCII on purpose. Accented/emoji text arrives from the client as
 * real Unicode over google.script.run, which is safe.
 * ============================================================ */

var P = PropertiesService;
var YEARS = ['J1', 'J2', 'J3'];
var MAX_PROP = 8800;        // stay safely under the 9 KB per-property limit
var MAX_ENTRIES = 60;       // summaries kept per pupil per class

/* ---------- one-time setup ---------- */
function initBoard() {
  var sp = P.getScriptProperties();
  if (!sp.getProperty('staffPasscode')) {
    sp.setProperty('staffPasscode', 'CHANGE-ME-' + Math.floor(Math.random() * 9000 + 1000));
  }
  if (!sp.getProperty('classes')) sp.setProperty('classes', '[]');
  if (sp.getProperty('teacherEmail') == null) sp.setProperty('teacherEmail', '');
  if (sp.getProperty('subject') == null) sp.setProperty('subject', 'Home Economics');
  return 'Ready. In Script Properties set staffPasscode and (fallback) teacherEmail. Classes are created in the app itself, each with its year group.';
}

/* ---------- serve the page ---------- */
/* The page runs in a sandboxed iframe, so it cannot read its own /exec URL
   or the ?class= parameter. Capture both here and inject them via OLS_BOOT,
   along with the class's year group from the registry. */
function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  var cls = (e && e.parameter && e.parameter['class']) ? String(e.parameter['class']) : 'default';
  cls = realClass_(cls);
  t.classCode = cls;
  t.baseUrl = ScriptApp.getService().getUrl();
  var entry = findClass_(cls);
  t.classYear = (entry && YEARS.indexOf(entry.year) !== -1) ? entry.year : '';
  return t.evaluate()
    .setTitle('My Kitchen Portfolio')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/* ---------- identity ---------- */
function userEmail_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}
/* The signed-in pupil's REAL name, read once from Google's OIDC userinfo
   endpoint with HER OWN short-lived OAuth token (we run execute-as-user, so
   ScriptApp.getOAuthToken() is the pupil's token). Needs the userinfo.profile
   + script.external_request scopes (see appsscript.json). C2k pupil accounts
   expose the full first name + surname, so she never types her name. Returns
   '' on any failure, and the front-end falls back to the type-once form. */
function autoName_() {
  try {
    var resp = UrlFetchApp.fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) return '';
    var data = JSON.parse(resp.getContentText());
    var first = String(data.given_name || '');
    var surname = String(data.family_name || '');
    return (first + ' ' + surname).trim() || String(data.name || '');
  } catch (e) {
    return '';
  }
}
/* Canonicalise a class code against the registry (case-insensitive). */
function realClass_(c) {
  c = String(c || '').trim();
  if (!c) return 'default';
  var reg = getClasses_(), lc = c.toLowerCase();
  for (var i = 0; i < reg.length; i++) if (reg[i].name.toLowerCase() === lc) return reg[i].name;
  return c;
}

/* ---------- key helpers ---------- */
function coreKey_(cls) { return 'kp:' + cls; }       // user-properties: name/year/doc/entries
function draftKey_(cls) { return 'kpd:' + cls; }     // user-properties: in-progress reflection
function pupilKey_(cls, email) { return 'p:' + cls + ':' + email; }   // script-properties (shared)

function readCore_(cls) {
  var raw = P.getUserProperties().getProperty(coreKey_(cls));
  var d = {};
  try { d = raw ? JSON.parse(raw) : {}; } catch (e) { d = {}; }
  return {
    name: String(d.name || ''),
    year: (YEARS.indexOf(d.year) !== -1) ? d.year : '',
    docUrl: String(d.docUrl || ''),
    docId: String(d.docId || ''),
    shared: String(d.shared || ''),
    entries: (d.entries && d.entries.length) ? d.entries : []
  };
}
function writeCore_(cls, core) {
  var s = JSON.stringify(core);
  // never let one oversized write brick the pupil's store: drop oldest summaries
  while (s.length > MAX_PROP && core.entries.length > 5) {
    core.entries = core.entries.slice(1);
    s = JSON.stringify(core);
  }
  P.getUserProperties().setProperty(coreKey_(cls), s);
}

/* Year resolution: the class registry (teacher's choice) always wins; then
   whatever the pupil saved; then a value passed with the call; else 'KS3'
   (used only for the Drive folder name, never for content). */
function yearFor_(cls, core, reqYear) {
  var entry = findClass_(cls);
  if (entry && YEARS.indexOf(entry.year) !== -1) return entry.year;
  if (core && YEARS.indexOf(core.year) !== -1) return core.year;
  if (YEARS.indexOf(String(reqYear || '')) !== -1) return String(reqYear);
  return 'KS3';
}

/* ============================================================
   API (called from the page via google.script.run)
   ============================================================ */

/* whoami -- called on page load, before any name entry. Auto-name is read
   here so the page can sign the pupil straight in (no form) when C2k gives
   us her name; a null name tells the client to use the type-once fallback. */
function apiWhoAmI() {
  return { ok: true, email: String(userEmail_()), name: autoName_() || null };
}

function apiLoad(req) {
  req = req || {};
  var cls = realClass_(req.classCode);
  var core = readCore_(cls);
  var draftRaw = P.getUserProperties().getProperty(draftKey_(cls));
  var draft = null;
  try { draft = draftRaw ? JSON.parse(draftRaw) : null; } catch (e) { draft = null; }
  return {
    ok: true,
    name: core.name,
    year: core.year,
    docUrl: core.docUrl,
    entries: core.entries,
    draft: draft
  };
}

/* Save name/year + the in-progress draft, and mirror lean completion
   metadata to the shared store for the teacher dashboard. */
function apiSave(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);

  var core = readCore_(cls);
  if (req.name != null) core.name = String(req.name).slice(0, 60);
  if (req.year != null && YEARS.indexOf(String(req.year)) !== -1) core.year = String(req.year);
  writeCore_(cls, core);

  /* Only an EXPLICIT clearDraft may delete the stored draft. A null draft in a
     save (e.g. a client that booted while load failed) must never wipe work. */
  var up = P.getUserProperties();
  if (req.draft && typeof req.draft === 'object') {
    var s = JSON.stringify(req.draft);
    if (s.length > MAX_PROP) return { ok: false, error: 'draft-too-big' };
    up.setProperty(draftKey_(cls), s);
  } else if (req.clearDraft === true) {
    up.deleteProperty(draftKey_(cls));
  }

  writeMeta_(cls, who, core, {});
  registerClass_(cls);
  return { ok: true };
}

/* ---------- Drive foldering ---------- */
/* Get-or-create a nested folder path in the pupil's OWN Drive. Reusable
   across every OLS app that generates files (the portfolio habit). */
function ensureFolderPath_(segments) {
  var parent = DriveApp.getRootFolder();
  for (var i = 0; i < segments.length; i++) {
    var name = String(segments[i] == null ? '' : segments[i]).trim();
    if (!name) continue;
    var it = parent.getFoldersByName(name);
    parent = it.hasNext() ? it.next() : parent.createFolder(name);
  }
  return parent;
}
function safeName_(s, max) {
  return String(s || '').replace(/[\\\/:*?"<>|#\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 60);
}
/* The per-practical Evidence folder. A cached folderId from the client is
   reused (and validated); otherwise the path is built and the folder is
   best-effort shared with the class's teacher so video links open for her. */
function entryFolder_(cls, core, req) {
  if (req.folderId) {
    try { return DriveApp.getFolderById(String(req.folderId)); } catch (e) {}
  }
  var sp = P.getScriptProperties();
  var yr = yearFor_(cls, core, req.year);
  var leaf = safeName_(String(req.date || '').slice(0, 10) + ' ' + (req.dish || 'Practical'), 60);
  var folder = ensureFolderPath_(['OLS Digital Skills', sp.getProperty('subject') || 'Home Economics', yr, 'Evidence', leaf]);
  var teacher = classOwner_(cls) || String(sp.getProperty('teacherEmail') || '').trim();
  if (teacher && teacher.indexOf('@') > 0) {
    try { folder.addViewer(teacher); } catch (e) {}
  }
  return folder;
}

/* Photo upload: the client downscales to <=1600px JPEG, so this stays well
   inside google.script.run limits. The file lands in the pupil's Evidence
   folder; it is embedded into the Doc later, at submit time. */
function apiUploadPhoto(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  if (!req.b64) return { ok: false, error: 'no-data' };
  var cls = realClass_(req.classCode);
  var core = readCore_(cls);
  var folder;
  try { folder = entryFolder_(cls, core, req); } catch (e) { return { ok: false, error: 'folder: ' + (e && e.message ? e.message : e) }; }
  try {
    var name = safeName_(String(req.date || '').slice(0, 10) + ' ' + (req.dish || 'Practical') + ' ' + (req.n || 'photo'), 80) + '.jpg';
    var blob = Utilities.newBlob(Utilities.base64Decode(String(req.b64)), 'image/jpeg', name);
    var file = folder.createFile(blob);
    return { ok: true, id: String(file.getId()), folderId: String(folder.getId()) };
  } catch (e2) {
    return { ok: false, error: 'create: ' + (e2 && e2.message ? e2.message : e2) };
  }
}

/* Video, the direct route: hand the page the PUPIL'S OWN short-lived OAuth
   token (this script runs as her, so it is her token and her privileges -
   nothing she could not already do) plus the Evidence folder id. The browser
   then streams the file straight to the Drive API with a resumable upload,
   which big phone videos need (google.script.run cannot carry them). */
function apiGetUpload(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  var core = readCore_(cls);
  var folder;
  try { folder = entryFolder_(cls, core, req); } catch (e) { return { ok: false, error: 'folder: ' + (e && e.message ? e.message : e) }; }
  return { ok: true, token: ScriptApp.getOAuthToken(), folderId: String(folder.getId()) };
}

/* Video, the backup route for small files when the direct route is blocked. */
function apiUploadVideo(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  if (!req.b64) return { ok: false, error: 'no-data' };
  var cls = realClass_(req.classCode);
  var core = readCore_(cls);
  var folder;
  try { folder = entryFolder_(cls, core, req); } catch (e) { return { ok: false, error: 'folder: ' + (e && e.message ? e.message : e) }; }
  try {
    var name = safeName_(String(req.n || 'video'), 90);
    var blob = Utilities.newBlob(Utilities.base64Decode(String(req.b64)), String(req.mime || 'video/mp4'), name);
    var file = folder.createFile(blob);
    return { ok: true, id: String(file.getId()), url: 'https://drive.google.com/file/d/' + file.getId() + '/view', folderId: String(folder.getId()) };
  } catch (e2) {
    return { ok: false, error: 'create: ' + (e2 && e2.message ? e2.message : e2) };
  }
}

/* After a direct upload: best-effort share the file with the teacher and
   hand back a clean view link for the Doc. */
function apiRegisterMedia(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  var id = String(req.fileId || '');
  if (!id) return { ok: false, error: 'no-id' };
  var cls = realClass_(req.classCode);
  var teacher = classOwner_(cls) || String(P.getScriptProperties().getProperty('teacherEmail') || '').trim();
  if (teacher && teacher.indexOf('@') > 0) {
    try { DriveApp.getFileById(id).addViewer(teacher); } catch (e) {}
  }
  return { ok: true, url: 'https://drive.google.com/file/d/' + id + '/view' };
}

/* Remove a photo/video the pupil deleted from her reflection. Execute-as-user
   means this can only ever touch HER OWN files; it goes to her Drive bin
   (recoverable for 30 days), never a hard delete. Best-effort. */
function apiDeleteMedia(req) {
  req = req || {};
  if (!userEmail_()) return { ok: false, error: 'not-signed-in' };
  var id = String((req && req.fileId) || '');
  if (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
  return { ok: true };
}

/* ============================================================
   The portfolio Doc: created on first entry, appended ever after
   ============================================================ */
function apiSubmitEntry(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  var spec = (req.spec && typeof req.spec === 'object') ? req.spec : null;
  var entry = spec && spec.entry && typeof spec.entry === 'object' ? spec.entry : null;
  if (!entry || !entry.dish) return { ok: false, error: 'no-entry' };
  var cls = realClass_(req.classCode);
  var core = readCore_(cls);
  if (spec.pupil) core.name = String(spec.pupil).slice(0, 60);
  var yr = yearFor_(cls, core, spec.year);

  // 0) idempotency: a lost response + "press it again" must never append the
  // same page twice. The entry id is generated once per draft on the client.
  var sid = String((req.summary && req.summary.id) || entry.id || '');
  if (sid) {
    for (var dup = 0; dup < core.entries.length; dup++) {
      if (String(core.entries[dup].id) === sid) {
        return { ok: true, url: core.docUrl, created: false, duplicate: true, shared: core.shared, filed: '' };
      }
    }
  }

  // 1) open the existing portfolio Doc, or create it (first entry)
  var doc = null, created = false;
  if (core.docId) {
    try { doc = DocumentApp.openById(core.docId); } catch (e) { doc = null; }
  }
  var shared = String(core.shared || ''), filed = '';
  var teacher = classOwner_(cls) || String(P.getScriptProperties().getProperty('teacherEmail') || '').trim();
  if (!doc) {
    created = true;
    var title = 'Home Economics Portfolio - ' + (core.name || 'My work') + (yr !== 'KS3' ? ' (' + yr + ')' : '');
    doc = DocumentApp.create(title);
    renderDocHead_(doc.getBody(), core.name, yr);

    // best-effort share with the class's owning teacher (retry once - Drive
    // hiccups transiently). A share failure never blocks creation.
    shared = 'no-teacher-email';
    if (teacher && teacher.indexOf('@') > 0) {
      for (var t = 0; t < 2; t++) {
        try { doc.addViewer(teacher); shared = 'shared:' + teacher; break; }
        catch (e1) { shared = 'share-failed: ' + (e1 && e1.message ? e1.message : e1); if (t === 0) Utilities.sleep(600); }
      }
    }
  } else if (shared.indexOf('shared:') !== 0 && teacher && teacher.indexOf('@') > 0) {
    // the Doc exists but never successfully shared (or the class has only just
    // gained an owner) - addViewer is idempotent and cheap, so heal it now.
    try { doc.addViewer(teacher); shared = 'shared:' + teacher; }
    catch (e5) { shared = 'share-failed: ' + (e5 && e5.message ? e5.message : e5); }
  }

  // 2) append this practical's page
  try {
    renderEntry_(doc.getBody(), entry, !created);
    doc.saveAndClose();
  } catch (e2) {
    try { doc.saveAndClose(); } catch (e3) {}
    return { ok: false, error: 'render: ' + (e2 && e2.message ? e2.message : e2) };
  }
  var url = String(doc.getUrl());

  // 3) file a NEW Doc into the pupil's portfolio folder (best-effort, retried)
  if (created) {
    filed = 'root';
    for (var f = 0; f < 2; f++) {
      try {
        var sp = P.getScriptProperties();
        var folder = ensureFolderPath_(['OLS Digital Skills', sp.getProperty('subject') || 'Home Economics', yr]);
        var file = DriveApp.getFileById(doc.getId());
        folder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
        filed = folder.getName();
        break;
      } catch (e4) { filed = 'file-failed: ' + (e4 && e4.message ? e4.message : e4); if (f === 0) Utilities.sleep(600); }
    }
  }

  // 4) update the pupil's stores + the shared dashboard record
  core.docId = String(doc.getId());
  core.docUrl = url;
  core.shared = String(shared || '');
  if (YEARS.indexOf(yr) !== -1) core.year = yr;
  var summary = (req.summary && typeof req.summary === 'object') ? req.summary : {
    id: String(entry.id || ''), dish: String(entry.dish), date: String(entry.date || ''), focus: [], photos: 0, videos: 0, thumbId: ''
  };
  core.entries.push(summary);
  if (core.entries.length > MAX_ENTRIES) core.entries = core.entries.slice(core.entries.length - MAX_ENTRIES);
  writeCore_(cls, core);
  P.getUserProperties().deleteProperty(draftKey_(cls));

  var audit = {};
  if (created) audit.filed = filed;
  writeMeta_(cls, who, core, audit);
  registerClass_(cls);
  console.log('submitEntry ' + who + ' [' + cls + '] ' + entry.dish + ' | created=' + created + (created ? (' | ' + shared + ' | ' + filed) : '') + ' | ' + url);
  return { ok: true, url: url, created: created, shared: String(shared), filed: String(filed) };
}

/* The Doc's opening page (first entry only): title, name line and a
   deletable shaded guidance box (a 1-cell table). */
function renderDocHead_(body, name, yr) {
  body.appendParagraph('My Home Economics Portfolio').setHeading(DocumentApp.ParagraphHeading.TITLE);
  var sub = (name ? name : 'My practical cooking journal') + (yr && yr !== 'KS3' ? ' \u00b7 ' + yr : '');
  body.appendParagraph(sub).setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  renderBox_(body, {
    title: 'About this portfolio (you can delete this box)',
    items: [
      'Every practical you cook in Home Economics adds a new page here automatically - your photos, your thoughts and your evaluation.',
      'It is YOUR document, in YOUR Google Drive. Improve it whenever you like: fix spellings, add detail, make the photos bigger.',
      'Your teacher can see this document too, so always keep it your best work.',
      'To delete this box: right-click on it and choose Delete table.'
    ]
  }, '#FCF3D9');
}

/* One shaded 1-cell-table box. NOTE: Paragraph.setText() returns void and
   ListItem has no setBold() - chaining either throws mid-render and aborts
   the whole Doc. Bold via editAsText(). (Hard-won lesson.) */
function renderBox_(body, box, bg) {
  if (!box || !box.items || !box.items.length) return;
  var table = body.appendTable();
  var cell = table.appendTableRow().appendTableCell();
  cell.setBackgroundColor(String(bg));
  var title = cell.getChild(0).asParagraph();
  title.setText(String(box.title || ''));
  title.editAsText().setBold(true);
  for (var i = 0; i < box.items.length; i++) {
    var li = cell.appendListItem(String(box.items[i]));
    li.setGlyphType(DocumentApp.GlyphType.BULLET);
    li.editAsText().setBold(false);
  }
}

/* Render one practical's page from the client-composed spec. All prose
   arrives as real Unicode (stars, dashes, accents) - only THIS source file
   must stay ASCII. */
function renderEntry_(body, e, divider) {
  if (divider) body.appendHorizontalRule();

  body.appendParagraph(String(e.dish) + ' \u2014 ' + String(e.dateNice || e.date || ''))
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  var focusNames = e.focusNames || [];
  if (focusNames.length) {
    var fl = body.appendParagraph('Focus: ' + focusNames.map(String).join(' \u00b7 '));
    fl.editAsText().setItalic(true).setForegroundColor('#888888');
  }

  // photos: embedded from the pupil's own Drive files, scaled to the page
  var photos = e.photos || [];
  for (var p = 0; p < photos.length; p++) {
    try {
      var blob = DriveApp.getFileById(String(photos[p].id)).getBlob();
      var img = body.appendImage(blob);
      var w = Number(photos[p].w) || img.getWidth() || 440;
      var h = Number(photos[p].h) || img.getHeight() || 330;
      var maxW = 440;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      img.setWidth(w).setHeight(h);
    } catch (ePhoto) {
      var miss = body.appendParagraph('[One of your photos could not be added - it is still safe in your Drive Evidence folder.]');
      miss.editAsText().setItalic(true).setForegroundColor('#888888');
    }
  }

  // videos: linked (a Doc cannot embed playback)
  var videos = e.videos || [];
  for (var v = 0; v < videos.length; v++) {
    var url = String(videos[v].url || (videos[v].id ? 'https://drive.google.com/file/d/' + videos[v].id + '/view' : ''));
    var para = body.appendParagraph('My video: ' + String(videos[v].n || 'video'));
    if (url) para.editAsText().setLinkUrl(url);
  }

  // the focus sections, each: heading + the question (small italic) + her answer
  var sections = e.sections || [];
  for (var s = 0; s < sections.length; s++) {
    var sec = sections[s] || {};
    body.appendParagraph(String(sec.h || '')).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    if (sec.q) {
      var q = body.appendParagraph(String(sec.q));
      q.editAsText().setItalic(true).setForegroundColor('#888888');
    }
    if (sec.table && sec.table.rows) {
      var data = [sec.table.head.map(String)];
      sec.table.rows.forEach(function (r) { data.push(r.map(String)); });
      (sec.table.foot || []).forEach(function (r) { data.push(r.map(String)); });
      if (data.length > 1) {
        var tbl = body.appendTable(data);
        // bold the header row + the footer labels
        try {
          var hr = tbl.getRow(0);
          for (var c = 0; c < hr.getNumCells(); c++) hr.getCell(c).editAsText().setBold(true);
          var footStart = 1 + sec.table.rows.length;
          for (var fr = footStart; fr < tbl.getNumRows(); fr++) tbl.getRow(fr).getCell(0).editAsText().setBold(true);
        } catch (eTbl) {}
      }
    }
    if (sec.a) body.appendParagraph(String(sec.a));
  }

  // evaluation
  body.appendParagraph('My evaluation').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  var lines = e.evalLines || [];
  for (var l = 0; l < lines.length; l++) body.appendParagraph(String(lines[l]));

  appendLabelled_(body, 'What went well', e.www);
  appendLabelled_(body, 'Even better if...', e.ebi);
  if (e.next) appendLabelled_(body, 'Next time I will...', e.next);
}
function appendLabelled_(body, label, text) {
  body.appendParagraph(String(label)).setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph(String(text || ''));
}

/* ---------- shared metadata store (script-properties) ---------- */
function writeMeta_(cls, email, core, extra) {
  var n = core.entries.length;
  var lastE = n ? core.entries[n - 1] : null;
  var rec = {
    name: String(core.name || ''),
    email: String(email),
    entries: n,
    last: lastE ? (String(lastE.dish || '') + ' \u00b7 ' + String(lastE.date || '')) : '',
    docUrl: String(core.docUrl || ''),
    shared: String(core.shared || ''),
    updated: new Date().toISOString()
  };
  if (extra && extra.filed != null) rec.filed = String(extra.filed);
  P.getScriptProperties().setProperty(pupilKey_(cls, email), JSON.stringify(rec));
}

/* ============================================================
   Staff (passcode checked server-side; forgiving compare)
   ============================================================ */
function apiAdmin(req) {
  req = req || {};
  var got = String(req.passcode == null ? '' : req.passcode).trim().toLowerCase();
  var want = String(P.getScriptProperties().getProperty('staffPasscode') || '').trim().toLowerCase();
  if (!want || got !== want) return { ok: false, error: 'bad-passcode' };

  var me = userEmail_();
  var cls = realClass_(req.classCode);
  var sub = req.sub || 'dashboard';

  if (sub === 'dashboard') {
    var all = P.getScriptProperties().getProperties();
    var prefix = 'p:' + cls + ':';
    var rows = [];
    Object.keys(all).forEach(function (k) {
      if (k.indexOf(prefix) !== 0) return;
      var r = {};
      try { r = JSON.parse(all[k]); } catch (e) { return; }
      rows.push({
        name: String(r.name || r.email || ''),
        entries: Number(r.entries) || 0,
        last: String(r.last || ''),
        docUrl: String(r.docUrl || ''),
        shared: String(r.shared || '')
      });
    });
    rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    return { ok: true, classCode: cls, rows: rows };
  }

  if (sub === 'classes') {
    var reg = getClasses_();
    var props = P.getScriptProperties().getProperties();
    var counts = {};
    Object.keys(props).forEach(function (k) {
      if (k.indexOf('p:') !== 0) return;
      var rest = k.slice(2), cut = rest.lastIndexOf(':');
      if (cut <= 0) return;
      var c = rest.slice(0, cut);
      counts[c] = (counts[c] || 0) + 1;
    });
    var known = {};
    reg.forEach(function (c) { known[c.name] = true; });
    Object.keys(counts).forEach(function (c) {
      if (!known[c]) reg.push({ name: c, owner: '', created: '', year: '' });
    });
    var list = reg.map(function (c) {
      return { name: c.name, owner: c.owner, year: c.year || '', mine: !!(c.owner && c.owner === me), pupils: counts[c.name] || 0 };
    });
    list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return { ok: true, me: me, classes: list };
  }

  if (sub === 'addClass') {
    var name = sanitizeClass_(req.name);
    if (!name || name === 'default') return { ok: false, error: 'bad-name' };
    var year = String(req.year || '');
    if (YEARS.indexOf(year) === -1) return { ok: false, error: 'bad-year' };
    if (!me) return { ok: false, error: 'not-signed-in' };
    var lock = LockService.getScriptLock();
    try { lock.waitLock(10000); } catch (e) { return { ok: false, error: 'busy' }; }
    var claimed = false, finalName = name;
    try {
      var reg2 = getClasses_();
      for (var i = 0; i < reg2.length; i++) {
        if (reg2[i].name.toLowerCase() === name.toLowerCase()) {
          /* An OWNED class is a genuine duplicate. An UNOWNED one is a ghost a
             pupil auto-registered (link opened before the class was created, or
             a deleted class resurrected by an autosave) - claim it, otherwise
             the teacher could never attach the year group. */
          if (reg2[i].owner) return { ok: false, error: 'exists', name: reg2[i].name };
          reg2[i].owner = me; reg2[i].year = year; reg2[i].created = new Date().toISOString();
          claimed = true; finalName = reg2[i].name;
          break;
        }
      }
      if (!claimed) reg2.push({ name: name, owner: me, created: new Date().toISOString(), year: year });
      setClasses_(reg2);
    } finally { lock.releaseLock(); }
    return { ok: true, name: finalName, owner: me, year: year, claimed: claimed };
  }

  if (sub === 'deleteClass') {
    var del = String(req.name || '');
    if (!del) return { ok: false, error: 'no-name' };
    var entry = findClass_(del);
    if (entry && entry.owner && entry.owner !== me) return { ok: false, error: 'not-owner', owner: entry.owner };
    var lock2 = LockService.getScriptLock();
    try { lock2.waitLock(10000); } catch (e) { return { ok: false, error: 'busy' }; }
    var removed = 0;
    try {
      var sp = P.getScriptProperties();
      var props2 = sp.getProperties();
      var pre = 'p:' + del + ':';
      Object.keys(props2).forEach(function (k) { if (k.indexOf(pre) === 0) { sp.deleteProperty(k); removed++; } });
      var reg3 = getClasses_().filter(function (c) { return c.name !== del; });
      setClasses_(reg3);
    } finally { lock2.releaseLock(); }
    return { ok: true, name: del, removed: removed };
  }

  return { ok: false, error: 'unknown-sub' };
}

/* ---------- class registry (shared, lock on read-modify-write) ----------
   Each class is OWNED by the teacher who created it (verified email) and
   carries its YEAR GROUP. One shared staff passcode gates the panel;
   ownership gates deletion + decides who pupils' Docs are shared with. */
function getClasses_() {
  var raw;
  try { raw = JSON.parse(P.getScriptProperties().getProperty('classes') || '[]'); } catch (e) { raw = []; }
  if (!raw || !raw.length) return [];
  return raw.map(function (c) {
    if (typeof c === 'string') return { name: c, owner: '', created: '', year: '' };
    return { name: String(c.name || ''), owner: String(c.owner || ''), created: String(c.created || ''), year: String(c.year || '') };
  }).filter(function (c) { return !!c.name; });
}
function setClasses_(arr) { P.getScriptProperties().setProperty('classes', JSON.stringify(arr)); }
function findClass_(name) {
  var reg = getClasses_();
  for (var i = 0; i < reg.length; i++) if (reg[i].name === name) return reg[i];
  return null;
}
function classOwner_(cls) {
  var c = findClass_(cls);
  return (c && c.owner.indexOf('@') > 0) ? c.owner : '';
}
/* Pupil-side safety net: auto-register a class a pupil arrives with. Refuse
   junk: an over-long or unsanitisable ?class= from a mangled URL must not
   pollute the shared registry (the pupil's own data still saves regardless). */
function registerClass_(name) {
  if (!name || name === 'default') return;
  if (String(name).length > 40 || sanitizeClass_(name) !== String(name)) return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return; }
  try {
    var reg = getClasses_(), lc = String(name).toLowerCase();
    for (var i = 0; i < reg.length; i++) if (reg[i].name.toLowerCase() === lc) return;
    reg.push({ name: name, owner: '', created: new Date().toISOString(), year: '' });
    setClasses_(reg);
  } finally { lock.releaseLock(); }
}
function sanitizeClass_(name) {
  return String(name || '').trim().replace(/[^A-Za-z0-9_\- ]/g, '').replace(/\s+/g, '-').slice(0, 40);
}
