/**
 * ============================================================
 * US Constitution Class Board - Path B backend (named classes)
 * OLS Digital Skills - Government & Politics
 * ------------------------------------------------------------
 * Serves the activity from Apps Script (HtmlService), same origin as the data.
 * Pupils sign in with their C2k Google account and are identified by their
 * VERIFIED email; their work follows them to any device.
 *
 * Boards are organised by NAMED CLASS (e.g. L6Po26) - each class is its own
 * board with its own link  ...exec?class=L6Po26 . Staff manage the class list
 * from the Staff panel (passcode-gated).
 *
 * Two files: this Code.gs and an HTML file named "Index" (the activity page).
 * Deploy: Web app, Execute as Me, Anyone within your domain. Run initBoard() once.
 * ============================================================
 */

var DATA_TAB   = 'Data';
var CONFIG_TAB = 'Config';
var HEADERS    = ['Year', 'Class', 'Email', 'Name', 'NodeId', 'FieldKey', 'Text', 'Colour', 'Updated'];
var MAX_TEXT   = 6000;

/** Run ONCE from the editor to set the Sheet up. */
function initBoard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = ss.getSheetByName(DATA_TAB) || ss.insertSheet(DATA_TAB);
  if (data.getLastRow() === 0) data.appendRow(HEADERS);
  var cfg = ss.getSheetByName(CONFIG_TAB) || ss.insertSheet(CONFIG_TAB);
  if (cfg.getLastRow() === 0) {
    cfg.appendRow(['Key', 'Value']);
    cfg.appendRow(['staffPasscode', 'CHANGE-ME-' + Math.floor(Math.random() * 9000 + 1000)]);
    cfg.appendRow(['classes', '[]']);
  }
  return 'Board ready. Open the "Config" tab and set your own staffPasscode.';
}

/* ---------- serve the activity page ---------- */
/* The page runs in a sandboxed iframe, so it can't read its own /exec URL or the
   ?class= parameter. We capture both on the server and inject them into the page. */
function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  t.classCode = (e && e.parameter && e.parameter['class']) ? String(e.parameter['class']) : 'default';
  t.baseUrl = ScriptApp.getService().getUrl();
  return t.evaluate()
    .setTitle('The US Constitution Diagram')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/* ---------- identity (verified, from the signed-in C2k account) ---------- */
function userEmail_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

/* ============================================================
   API called from the page via google.script.run
   ============================================================ */

function apiWhoAmI() { return { ok: true, email: userEmail_() }; }

function apiLoad(req) {
  req = req || {};
  var cls = req.classCode || 'default';
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_TAB);
  var vals = sh.getDataRange().getValues();
  var recs = [];
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i];
    if (String(r[1]) === String(cls)) {
      recs.push({ email: r[2], name: r[3], nodeId: r[4], fieldKey: r[5], text: r[6], c: Number(r[7]) || 0 });
    }
  }
  return { ok: true, classCode: cls, me: userEmail_(), records: recs };
}

function apiSave(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  var cls = req.classCode || 'default';
  var nodeId = req.nodeId, fieldKey = req.fieldKey;
  if (!nodeId || !fieldKey) return { ok: false, error: 'missing-field' };
  var text   = (req.text == null ? '' : String(req.text)).slice(0, MAX_TEXT);
  var colour = Number(req.c) || 0;
  var name   = (req.name == null ? '' : String(req.name)).slice(0, 80);

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_TAB);
    var vals = sh.getDataRange().getValues();
    var row = -1;
    for (var i = 1; i < vals.length; i++) {
      var r = vals[i];
      if (String(r[1]) === String(cls) && String(r[2]) === who &&
          String(r[4]) === String(nodeId) && String(r[5]) === String(fieldKey)) { row = i + 1; break; }
    }
    var now = new Date();
    if (text === '') {
      if (row > 0) sh.deleteRow(row);
    } else if (row > 0) {
      sh.getRange(row, 4).setValue(name);
      sh.getRange(row, 7).setValue(text);
      sh.getRange(row, 8).setValue(colour);
      sh.getRange(row, 9).setValue(now);
    } else {
      sh.appendRow(['', cls, who, name, nodeId, fieldKey, text, colour, now]);   // col 1 (Year) unused
    }
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/** This user's display name, keyed by verified email, so it follows them to any device. */
function apiMyName(req) {
  req = req || {};
  var who = userEmail_();
  if (!who) return { ok: false, error: 'not-signed-in' };
  if (req.set) { var nm = String(req.set).slice(0, 80); setConfig_('name:' + who, nm); return { ok: true, name: nm }; }
  var stored = getConfig_('name:' + who);
  if (stored) return { ok: true, name: stored };
  var vals = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_TAB).getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) { if (String(vals[i][2]) === who && vals[i][3]) return { ok: true, name: String(vals[i][3]) }; }
  return { ok: true, name: '' };
}

/* ---------- staff-only class management (passcode checked here) ---------- */

function apiAdmin(req) {
  req = req || {};
  if (String(req.passcode || '') !== getConfig_('staffPasscode')) return { ok: false, error: 'bad-passcode' };
  var sub = req.sub || '';
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_TAB);

  if (sub === 'classes') {
    var counts = countByClass_(sh);
    var reg = getClasses_();
    // surface any class that has data but isn't registered, so nothing is hidden
    Object.keys(counts).forEach(function (c) { if (c && reg.indexOf(c) === -1) reg.push(c); });
    var list = reg.map(function (name) { return { name: name, count: counts[name] || 0 }; });
    list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return { ok: true, classes: list };
  }
  if (sub === 'addClass') {
    var name = sanitizeClass_(req.name);
    if (!name) return { ok: false, error: 'bad-name' };
    var reg = getClasses_();
    if (reg.indexOf(name) === -1) { reg.push(name); setClasses_(reg); }
    return { ok: true, name: name };
  }
  if (sub === 'deleteClass') {
    var del = String(req.name || '');
    if (!del) return { ok: false, error: 'no-name' };
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    var deleted = 0;
    try {
      var data = sh.getDataRange().getValues();
      for (var j = data.length - 1; j >= 1; j--) { if (String(data[j][1]) === del) { sh.deleteRow(j + 1); deleted++; } }
    } finally { lock.releaseLock(); }
    var reg2 = getClasses_(); var idx = reg2.indexOf(del);
    if (idx > -1) { reg2.splice(idx, 1); setClasses_(reg2); }
    return { ok: true, name: del, deleted: deleted };
  }
  return { ok: false, error: 'unknown-sub' };
}

/* ---------- helpers ---------- */

function countByClass_(sh) {
  var vals = sh.getDataRange().getValues(), counts = {};
  for (var i = 1; i < vals.length; i++) { var c = String(vals[i][1]); if (c) counts[c] = (counts[c] || 0) + 1; }
  return counts;
}
function sanitizeClass_(name) {
  return String(name || '').trim().replace(/[^A-Za-z0-9_\- ]/g, '').replace(/\s+/g, '-').slice(0, 40);
}
function getClasses_() { try { return JSON.parse(getConfig_('classes') || '[]'); } catch (e) { return []; } }
function setClasses_(arr) { setConfig_('classes', JSON.stringify(arr)); }

function getConfig_(key) {
  var cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_TAB);
  var vals = cfg.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) { if (vals[i][0] === key) return String(vals[i][1]); }
  return '';
}
function setConfig_(key, value) {
  var cfg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_TAB);
  var vals = cfg.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) { if (vals[i][0] === key) { cfg.getRange(i + 1, 2).setValue(value); return; } }
  cfg.appendRow([key, value]);
}
