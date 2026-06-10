/**
 * ============================================================
 * Mon Carnet de France - Path B backend (login-gated)
 * OLS Digital Skills - French (J1 "La Belle France" project)
 * ------------------------------------------------------------
 * NEW deploy model vs the other OLS class boards:
 *   Deploy: Web app, Execute as: USER ACCESSING the web app,
 *           Who has access: within your domain (the sign-in gate).
 * "Execute as user accessing" is REQUIRED so DocumentApp.create() makes the
 * pupil's project Doc in the PUPIL'S OWN Drive. Because every call then runs
 * AS THE PUPIL (not the owner), we do NOT use a shared Google Sheet for data:
 *   - each pupil's working DRAFT  -> PropertiesService USER properties (private to that pupil)
 *   - per-pupil COMPLETION metadata + config -> PropertiesService SCRIPT properties
 *     (one shared store readable/writable by every user of the script, so the
 *      teacher panel can show "who has done what" without sharing any Sheet)
 *   - the finished prose -> the pupil's own Google Doc
 *
 * Two files go into the bound script of a Google Sheet (or a standalone script):
 *   * this Code.gs
 *   * an HTML file named exactly "Index" (paste the assembled Index.html into it)
 * Run initBoard() once, then set your staffPasscode (see below).
 *
 * Pure ASCII on purpose. Accented Doc text is added later via \u escapes or
 * passed from the client (which travels as real Unicode over google.script.run).
 * ============================================================ */

var P = PropertiesService;          // shorthand
var STATIONS = ['1', '2', '3', '4'];

/* ---------- one-time setup ---------- */
function initBoard() {
  var sp = P.getScriptProperties();
  if (!sp.getProperty('staffPasscode')) {
    sp.setProperty('staffPasscode', 'CHANGE-ME-' + Math.floor(Math.random() * 9000 + 1000));
  }
  if (!sp.getProperty('classes')) sp.setProperty('classes', '[]');
  if (sp.getProperty('teacherEmail') == null) sp.setProperty('teacherEmail', '');
  if (sp.getProperty('subject') == null) sp.setProperty('subject', 'French');
  if (sp.getProperty('yearGroup') == null) sp.setProperty('yearGroup', 'J1');
  return 'Ready. In Script Properties set staffPasscode + teacherEmail, and (optional) subject + yearGroup for the Drive folder path (OLS Digital Skills / <subject> / <yearGroup>).';
}

/* ---------- serve the page ---------- */
/* The page runs in a sandboxed iframe, so it cannot read its own /exec URL or
   the ?class= parameter. We capture both here and inject them via OLS_BOOT. */
function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  t.classCode = (e && e.parameter && e.parameter['class']) ? String(e.parameter['class']) : 'default';
  t.baseUrl = ScriptApp.getService().getUrl();
  return t.evaluate()
    .setTitle('Mon Carnet de France')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/* ---------- identity (verified, from the signed-in C2k account) ---------- */
function userEmail_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}
/* Canonicalise a class code against the registry (case-insensitive), so a
   hand-typed lowercase link can't split one class into two key prefixes. */
function realClass_(c) {
  c = String(c || '').trim();
  if (!c) return 'default';
  var reg = getClasses_(), lc = c.toLowerCase();
  for (var i = 0; i < reg.length; i++) if (reg[i].name.toLowerCase() === lc) return reg[i].name;
  return c;
}

/* ---------- key helpers ---------- */
function draftKey_(cls) { return 'draft:' + cls; }                    // user-properties (per pupil)
function pupilKey_(cls, email) { return 'p:' + cls + ':' + email; }   // script-properties (shared)

function blankStations_() { return { '1': false, '2': false, '3': false, '4': false }; }
function normStations_(obj) {
  var out = blankStations_();
  if (obj) STATIONS.forEach(function (n) { out[n] = !!obj[n]; });
  return out;
}

/* ============================================================
   API (called from the page via google.script.run)
   ============================================================ */

function apiWhoAmI() {
  return { ok: true, email: String(userEmail_()), effective: String((function () { try { return Session.getEffectiveUser().getEmail() || ''; } catch (e) { return ''; } })()) };
}

/* Load this pupil's private draft from user-properties. */
function apiLoad(req) {
  req = req || {};
  var cls = realClass_(req.classCode);
  var raw = P.getUserProperties().getProperty(draftKey_(cls));
  var d = {};
  try { d = raw ? JSON.parse(raw) : {}; } catch (e) { d = {}; }
  return {
    ok: true,
    name: String(d.name || ''),
    stations: normStations_(d.stations),
    docUrl: String(d.docUrl || ''),
    data: (d.data && typeof d.data === 'object') ? d.data : {}
  };
}

/* Save the draft (user-properties) AND mirror completion metadata to the
   shared script-properties store so the teacher panel can read it. */
function apiSave(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);

  var name = String(req.name || '').slice(0, 80);
  var stations = normStations_(req.stations);

  // 1) private draft
  var up = P.getUserProperties();
  var prevRaw = up.getProperty(draftKey_(cls));
  var prev = {};
  try { prev = prevRaw ? JSON.parse(prevRaw) : {}; } catch (e) { prev = {}; }
  var docUrl = String(prev.docUrl || '');
  // persist the per-station content too (cities/reasons/write-ups) so it survives
  // server-side and follows the pupil across devices. The shared dashboard store
  // (writeMeta_) deliberately does NOT get the content - it stays lean.
  var data = (req.data && typeof req.data === 'object') ? req.data : (prev.data || {});
  up.setProperty(draftKey_(cls), JSON.stringify({ name: name, stations: stations, docUrl: docUrl, data: data }));

  // 2) shared completion metadata (this pupil's own key only -> no write contention)
  writeMeta_(cls, who, { name: name, stations: stations, docUrl: docUrl });
  registerClass_(cls);
  return { ok: true };
}

/* Create the pupil's project Doc in their OWN Drive (Execute-as-user). */
function apiMakeDoc(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);

  // Build the pupil's project Doc from the structured payload the client composed
  // (title + deletable polish-checklist box + four HEADING1 sections in her own words).
  var doc = DocumentApp.create('La Belle France - my project');
  var body = doc.getBody();
  renderDocBody_(body, (req.doc && typeof req.doc === 'object') ? req.doc : null);

  // Best-effort: share this pupil-owned Doc with HER class's owning teacher
  // (multi-teacher model) - falling back to the global teacherEmail Script
  // Property if the class is unowned/unknown. Shares ONLY with that teacher,
  // never the domain. Wrapped so a sharing failure can NEVER block Doc
  // creation - the Doc still exists in the pupil's Drive and Google Classroom
  // remains the formal submission route.
  var shared = 'no-teacher-email';
  var teacher = classOwner_(cls) || String(P.getScriptProperties().getProperty('teacherEmail') || '').trim();
  if (teacher && teacher.indexOf('@') > 0) {
    try { doc.addViewer(teacher); shared = 'shared:' + teacher; }
    catch (e) { shared = 'share-failed: ' + (e && e.message ? e.message : e); }
  }

  doc.saveAndClose();
  var url = doc.getUrl();

  // Best-effort: file the Doc into a tidy, reusable structure in the PUPIL's OWN
  // Drive - "OLS Digital Skills / <subject> / <yearGroup>" - get-or-creating each
  // level. So a pupil builds a portfolio across OLS apps over time. Wrapped so a
  // Drive failure can NEVER block Doc creation (the Doc just stays in My Drive root).
  var filed = 'root';
  try {
    var sp2 = P.getScriptProperties();
    var folder = ensureFolderPath_(['OLS Digital Skills', sp2.getProperty('subject'), sp2.getProperty('yearGroup')]);
    var file = DriveApp.getFileById(doc.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    filed = folder.getName();
  } catch (e) { filed = 'file-failed: ' + (e && e.message ? e.message : e); }

  // record the Doc URL in both stores
  var up = P.getUserProperties();
  var raw = up.getProperty(draftKey_(cls));
  var d = {};
  try { d = raw ? JSON.parse(raw) : {}; } catch (e) { d = {}; }
  d.docUrl = url;
  d.stations = normStations_(d.stations);
  up.setProperty(draftKey_(cls), JSON.stringify(d));
  // The share/file outcomes are best-effort and invisible to the pupil, so make
  // them auditable: the owner can read them in the Executions log and in the
  // pupil's meta record (Project Settings -> Script Properties).
  console.log('makeDoc ' + who + ' [' + cls + '] ' + url + ' | ' + shared + ' | ' + filed);
  writeMeta_(cls, who, { name: String(d.name || ''), stations: d.stations, docUrl: url, shared: shared, filed: filed });
  return { ok: true, url: String(url), shared: String(shared), filed: String(filed) };
}

/* Render the client-composed project payload into the Doc body: a TITLE (+ optional
   SUBTITLE), a deletable shaded polish-checklist box (a 1-cell table the pupil can
   select and delete), then each section as a HEADING1 with paragraphs, an optional
   bullet list, and an italic-grey placeholder line. Falls back to a minimal Doc if
   no payload arrives. All accented text arrives as real Unicode from the client. */
function renderDocBody_(body, spec) {
  if (!spec) {
    body.appendParagraph('La Belle France').setHeading(DocumentApp.ParagraphHeading.TITLE);
    body.appendParagraph('Your project.');
    return;
  }
  body.appendParagraph(String(spec.title || 'La Belle France')).setHeading(DocumentApp.ParagraphHeading.TITLE);
  if (spec.subtitle) body.appendParagraph(String(spec.subtitle)).setHeading(DocumentApp.ParagraphHeading.SUBTITLE);

  renderBox_(body, spec.checklist, '#FCF3D9');   // gold: polish checklist
  renderBox_(body, spec.skills, '#E8F0FE');      // blue: digital-skills tasks

  var sections = spec.sections || [];
  for (var s = 0; s < sections.length; s++) {
    var sec = sections[s] || {};
    body.appendParagraph(String(sec.heading || '')).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    var paras = sec.paras || [];
    for (var p = 0; p < paras.length; p++) body.appendParagraph(String(paras[p]));
    var bullets = sec.bullets || [];
    for (var b = 0; b < bullets.length; b++) body.appendListItem(String(bullets[b])).setGlyphType(DocumentApp.GlyphType.BULLET);
    if (sec.placeholder) body.appendParagraph(String(sec.placeholder)).editAsText().setItalic(true).setForegroundColor('#888888');
  }
}

/* One shaded 1-cell-table box (deletable by the pupil: right-click -> Delete table). */
function renderBox_(body, box, bg) {
  if (!box || !box.items || !box.items.length) return;
  var table = body.appendTable();
  var cell = table.appendTableRow().appendTableCell();
  cell.setBackgroundColor(String(bg));
  /* Paragraph.setText() returns void and ListItem has no setBold() - chaining
     either throws mid-render and aborts the whole Doc. Bold via editAsText(). */
  var title = cell.getChild(0).asParagraph();
  title.setText(String(box.title || ''));
  title.editAsText().setBold(true);
  for (var i = 0; i < box.items.length; i++) {
    var li = cell.appendListItem(String(box.items[i]));
    li.setGlyphType(DocumentApp.GlyphType.BULLET);
    li.editAsText().setBold(false);
  }
}

/* Get-or-create a nested folder path in the user's OWN Drive; returns the leaf
   folder. Reusable across every OLS app that generates Docs, so pupil work files
   tidily into OLS Digital Skills / <Subject> / <Year>. Empty segments are skipped. */
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

/* ---------- shared metadata store (script-properties) ---------- */
function writeMeta_(cls, email, meta) {
  var rec = {
    name: String(meta.name || ''),
    email: String(email),
    s1: !!meta.stations['1'], s2: !!meta.stations['2'], s3: !!meta.stations['3'], s4: !!meta.stations['4'],
    docUrl: String(meta.docUrl || ''),
    updated: new Date().toISOString()
  };
  if (meta.shared != null) rec.shared = String(meta.shared);
  if (meta.filed != null) rec.filed = String(meta.filed);
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

  var me = userEmail_();                 // verified email of the TEACHER calling (Execute-as-user)
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
        s1: !!r.s1, s2: !!r.s2, s3: !!r.s3, s4: !!r.s4,
        docUrl: String(r.docUrl || '')
      });
    });
    rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    return { ok: true, classCode: cls, rows: rows };
  }

  /* List classes with owner + pupil count. The client shows the caller's own
     by default and the rest behind a "show all" toggle (HOD / cover view).
     Classes that have pupil data but were never registered are surfaced too. */
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
      if (!known[c]) reg.push({ name: c, owner: '', created: '' });
    });
    var list = reg.map(function (c) {
      return { name: c.name, owner: c.owner, mine: !!(c.owner && c.owner === me), pupils: counts[c.name] || 0 };
    });
    list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return { ok: true, me: me, classes: list };
  }

  if (sub === 'addClass') {
    var name = sanitizeClass_(req.name);
    if (!name || name === 'default') return { ok: false, error: 'bad-name' };
    if (!me) return { ok: false, error: 'not-signed-in' };
    var lock = LockService.getScriptLock();
    try { lock.waitLock(10000); } catch (e) { return { ok: false, error: 'busy' }; }
    try {
      var reg2 = getClasses_();
      for (var i = 0; i < reg2.length; i++) {
        if (reg2[i].name.toLowerCase() === name.toLowerCase()) return { ok: false, error: 'exists', name: reg2[i].name };
      }
      reg2.push({ name: name, owner: me, created: new Date().toISOString() });
      setClasses_(reg2);
    } finally { lock.releaseLock(); }
    return { ok: true, name: name, owner: me };
  }

  /* Delete a class you OWN (unowned/legacy classes can be cleaned up by any
     passcode-holder). Removes the registry entry and the shared dashboard
     records; pupils' private drafts (their UserProperties) are untouched. */
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
   Multi-teacher model: each class is OWNED by the teacher who created it
   (verified email). Entries are objects {name, owner, created}; the parser
   tolerates legacy plain-string entries (owner '' = unowned). One shared
   staff passcode gates the panel; ownership gates deletion + Doc sharing. */
function getClasses_() {
  var raw;
  try { raw = JSON.parse(P.getScriptProperties().getProperty('classes') || '[]'); } catch (e) { raw = []; }
  if (!raw || !raw.length) return [];
  return raw.map(function (c) {
    if (typeof c === 'string') return { name: c, owner: '', created: '' };
    return { name: String(c.name || ''), owner: String(c.owner || ''), created: String(c.created || '') };
  }).filter(function (c) { return !!c.name; });
}
function setClasses_(arr) { P.getScriptProperties().setProperty('classes', JSON.stringify(arr)); }
function findClass_(name) {
  var reg = getClasses_();
  for (var i = 0; i < reg.length; i++) if (reg[i].name === name) return reg[i];
  return null;
}
/* Owning teacher's email for a class ('' if unowned/unknown). */
function classOwner_(cls) {
  var c = findClass_(cls);
  return (c && c.owner.indexOf('@') > 0) ? c.owner : '';
}
/* Pupil-side safety net: auto-register a class a pupil arrives with (unowned). */
function registerClass_(name) {
  if (!name || name === 'default') return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return; }
  try {
    var reg = getClasses_(), lc = String(name).toLowerCase();
    for (var i = 0; i < reg.length; i++) if (reg[i].name.toLowerCase() === lc) return;
    reg.push({ name: name, owner: '', created: new Date().toISOString() });
    setClasses_(reg);
  } finally { lock.releaseLock(); }
}
function sanitizeClass_(name) {
  return String(name || '').trim().replace(/[^A-Za-z0-9_\- ]/g, '').replace(/\s+/g, '-').slice(0, 40);
}
