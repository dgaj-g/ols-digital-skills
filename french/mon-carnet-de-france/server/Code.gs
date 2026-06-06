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
  return 'Ready. Open Project Settings > Script Properties and set your own staffPasscode.';
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
function realClass_(c) { c = String(c || '').trim(); return c || 'default'; }

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
    docUrl: String(d.docUrl || '')
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
  up.setProperty(draftKey_(cls), JSON.stringify({ name: name, stations: stations, docUrl: docUrl }));

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

  // SHELL STUB: a minimal Doc that proves creation in the pupil's Drive.
  // The real generator (four formatted sections from the pupil's own words)
  // replaces this body once the stations are built.
  var doc = DocumentApp.create('La Belle France - my project');
  var body = doc.getBody();
  body.appendParagraph('La Belle France').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('This is your project, created in your own Google Drive. (Preview build - the four sections will appear here in the finished activity.)');
  doc.saveAndClose();
  var url = doc.getUrl();

  // record the Doc URL in both stores
  var up = P.getUserProperties();
  var raw = up.getProperty(draftKey_(cls));
  var d = {};
  try { d = raw ? JSON.parse(raw) : {}; } catch (e) { d = {}; }
  d.docUrl = url;
  d.stations = normStations_(d.stations);
  up.setProperty(draftKey_(cls), JSON.stringify(d));
  writeMeta_(cls, who, { name: String(d.name || ''), stations: d.stations, docUrl: url });
  return { ok: true, url: String(url) };
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
  return { ok: false, error: 'unknown-sub' };
}

/* ---------- class registry (shared, lock on read-modify-write) ---------- */
function getClasses_() { try { return JSON.parse(P.getScriptProperties().getProperty('classes') || '[]'); } catch (e) { return []; } }
function registerClass_(name) {
  if (!name || name === 'default') return;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return; }
  try {
    var reg = getClasses_();
    if (reg.indexOf(name) === -1) { reg.push(name); P.getScriptProperties().setProperty('classes', JSON.stringify(reg)); }
  } finally { lock.releaseLock(); }
}
