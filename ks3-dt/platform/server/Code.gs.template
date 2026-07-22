/**
 * OLS KS3 Digital Technology Platform - server (Architecture C, red-team-hardened).
 * Deploy: Execute as "User accessing the web app" / Access "Anyone within c2ken.net".
 * ASCII-only file by design (assembler guards this).
 *
 * Storage model (see ks3-dt/platform/ARCHITECTURE.md):
 *  ScriptProperties (shared):
 *    classes            [{name, owner, year, created}]
 *    lock:<class>       {"<lessonNum>": {u: firstUnlockMin, on: 0|1}}   u = delivered date
 *    cfg:<class>        {lb:{mode,basis,names,topN}, absDays, cover:{on,lesson,ts}}
 *    team:<class>       {groups:[{id,name}], reveal: bool}
 *    p:<class>:<email>  lean pupil record {n, cn, j, xp, g, th, fx, L:{"<num>": Larr}}
 *      th/fx = equipped Agent Kit theme/insignia ids (cosmetic, clearance-gated)
 *      Larr positions: 0 status(0/1/2)  1 xp  2 detail  3 exitChosen  4 selfEval
 *                      5 lastTmin  6 activeMin  7 flags(1=absDismiss 2=catchup)
 *                      8 comment  9 recapRight  10 recapTotal
 *    pair:<class>:<lessonId>  {P:{pid:{m,cn,t,trio,done,rv,n}}, solo:[emails]}  (section 12)
 *    chat:<class>:<lessonId>  {pid:{m,cn,n,t,c,tx}} compact monitored transcripts,
 *      swept to the Archive Sheet's Chat Archive tab after CHAT_ARCHIVE_AFTER_DAYS
 *  CacheService (ephemeral, no scope): ks3dt:pres:<class> presence beacons,
 *    ks3dt:pq:* pairing queues, ks3dt:pch:<pid> chat channels, ks3dt:pls:* liveness
 *  UserProperties (private per pupil):
 *    recap              {threads:{id:{s:streak, d:lastSessionDay, r:retired}},
 *                        seen:{itemId: lastDay}}
 *    rs:<lessonNum>     live recap session {items:[{id, ord:[..]}], day}
 *    draft:<lessonNum>  in-progress activity state
 *
 * Script Properties Damien sets once: KS3DT_SECRET (from .ks3dt-secret),
 * staffPasscode, contentBase (optional override).
 *
 * Red-team requirements implemented here:
 *  #1 server-side marking, keys never plaintext anywhere public (decryptKeys_)
 *  #2 absenceInferenceEligible honoured (manifest-driven, absence_())
 *  #3 jitter is client-side; locks here are ONLY on shared-key mutations
 *  #4 client outbox retries are idempotent-safe (writes are per-pupil upserts)
 *  #8 dashboard/staff calls passcode-gated server-side; pupils only read own record
 */

var CONTENT_BASE_DEFAULT = 'https://dgaj-g.github.io/ols-digital-skills/ks3-dt/content/';

/* ---------- tiny helpers ---------- */
function sp_() { return PropertiesService.getScriptProperties(); }
function up_() { return PropertiesService.getUserProperties(); }
function str_(v) { return String(v == null ? '' : v); }
function num_(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function tmin_() { return Math.floor((Date.now() - 1767225600000) / 60000); } // minutes since 2026-01-01 UTC
function tminToDate_(m) { return new Date(1767225600000 + m * 60000); }
function today_() { return Math.floor(tmin_() / 1440); }
function userEmail_() {
  try { return String(Session.getActiveUser().getEmail() || '').toLowerCase(); }
  catch (e) { return ''; }
}
function jget_(store, key, fallback) {
  try { var raw = store.getProperty(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function jset_(store, key, obj) { store.setProperty(key, JSON.stringify(obj)); }

/* ---------- auto-name (proven: probe P-B; pupils return full first name) ---------- */
function autoName_() {
  try {
    var resp = UrlFetchApp.fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) return '';
    var d = JSON.parse(resp.getContentText());
    var first = str_(d.given_name || '');
    var fam = str_(d.family_name || '');
    return (first + ' ' + fam).trim() || str_(d.name || '');
  } catch (e) { return ''; }
}

/* ---------- content fetch + key decryption (red team #1) ---------- */
function contentBase_() { return str_(sp_().getProperty('contentBase') || CONTENT_BASE_DEFAULT); }

function contentVersion_() {
  var cache = CacheService.getScriptCache();
  var v = cache.get('ks3dt:ver');
  if (v) return v;
  try {
    var r = UrlFetchApp.fetch(contentBase_() + 'index.json', { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) {
      v = str_(JSON.parse(r.getContentText()).contentVersion || 'v0');
      cache.put('ks3dt:ver', v, 300); // 5 min: a content push is live within 5 minutes
      return v;
    }
  } catch (e) {}
  return 'v0';
}

/* Fetch a content file (path relative to content/, no leading slash), cached by
   contentVersion. One real UrlFetch per file per 6h TOTAL across the school. */
function fetchContent_(path) {
  var cache = CacheService.getScriptCache();
  var key = 'ks3dt:f:' + contentVersion_() + ':' + path;
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var r = UrlFetchApp.fetch(contentBase_() + path, { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('content fetch ' + path + ' HTTP ' + r.getResponseCode());
  var text = r.getContentText();
  if (text.length < 90000) { try { cache.put(key, text, 21600); } catch (e) {} }
  return JSON.parse(text);
}

/* Mirror of tools/pack-content.js encryptKeys(): XOR keystream of
   SHA256(secret|fileId|blockIndex). fileId = path minus ".json". */
function decryptKeys_(b64, fileId) {
  var secret = str_(sp_().getProperty('KS3DT_SECRET'));
  if (!secret) throw new Error('KS3DT_SECRET not set');
  var data = Utilities.base64Decode(b64);
  var out = [];
  var ks = [];
  for (var i = 0; i < data.length; i++) {
    var block = Math.floor(i / 32);
    if (i % 32 === 0) {
      ks = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
        secret + '|' + fileId + '|' + block, Utilities.Charset.UTF_8);
    }
    out.push((data[i] & 255) ^ (ks[i % 32] & 255));
  }
  return JSON.parse(Utilities.newBlob(out).getDataAsString('UTF-8'));
}

function yearManifest_(year) { return fetchContent_(year + '/manifest.json'); }

function lessonEntry_(year, lessonId) {
  var man = yearManifest_(year);
  var ls = man.lessons || [];
  for (var i = 0; i < ls.length; i++) if (str_(ls[i].id) === lessonId) return ls[i];
  return null;
}

function lessonKeys_(year, lessonId) {
  var entry = lessonEntry_(year, lessonId);
  if (!entry || !entry.file) throw new Error('unknown lesson ' + lessonId);
  var lesson = fetchContent_(entry.file);
  if (!lesson.keysEnc) throw new Error('lesson has no keys');
  return decryptKeys_(lesson.keysEnc, str_(entry.file).replace(/\.json$/, ''));
}

function poolAndKeys_(year) {
  var man = yearManifest_(year);
  var pool = fetchContent_(str_(man.recapPool || (year + '/recap-pool.json')));
  var keys = decryptKeys_(pool.keysEnc, str_(man.recapPool || (year + '/recap-pool.json')).replace(/\.json$/, ''));
  return { pool: pool, keys: keys };
}

/* ---------- class registry (Mon Carnet model: owner + canonicalisation) ---------- */
function getClasses_() {
  var raw = jget_(sp_(), 'classes', []);
  return raw.map(function (c) {
    return { name: str_(c.name), owner: str_(c.owner), year: str_(c.year || 'j1'), created: str_(c.created) };
  }).filter(function (c) { return !!c.name; });
}
function realClass_(c) {
  c = str_(c).trim();
  if (!c) return '';
  var reg = getClasses_(), lc = c.toLowerCase();
  for (var i = 0; i < reg.length; i++) if (reg[i].name.toLowerCase() === lc) return reg[i].name;
  return '';
}
function classYear_(cls) {
  var reg = getClasses_();
  for (var i = 0; i < reg.length; i++) if (reg[i].name === cls) return reg[i].year || 'j1';
  return 'j1';
}
function sanitizeClass_(name) {
  return str_(name).trim().replace(/[^A-Za-z0-9_\- ]/g, '').replace(/\s+/g, '-').slice(0, 40);
}

/* ---------- pupil records ---------- */
function pKey_(cls, email) { return 'p:' + cls + ':' + email; }
function readPupil_(cls, email) { return jget_(sp_(), pKey_(cls, email), null); }
function writePupil_(cls, email, rec) { jset_(sp_(), pKey_(cls, email), rec); }
/* Store-full guard (review finding: the 500KB script-wide Properties quota is a
   real ceiling at whole-school scale). Callers return {ok:false, error:'store-full'}
   so the client can stop retrying and tell the pupil to flag the teacher. */
function tryWritePupil_(cls, email, rec) {
  try { writePupil_(cls, email, rec); return true; } catch (e) { return false; }
}
var STORE_FULL_ = { ok: false, error: 'store-full' };
/* Rough bytes used across the shared store - surfaced in the staff panel so the
   quota is monitored, never a surprise. (Nightly archival trigger = Session B.) */
function storeHealth_() {
  var all = sp_().getProperties();
  var total = 0, pupils = 0;
  Object.keys(all).forEach(function (k) {
    total += k.length + String(all[k]).length;
    if (k.indexOf('p:') === 0) pupils++;
  });
  return { bytes: num_(total), limit: 500000, pupils: num_(pupils) };
}
function allPupils_(cls) {
  // Lock-free bulk read (red team: dashboard reads must never take the lock).
  var all = sp_().getProperties();
  var pre = 'p:' + cls + ':';
  var out = [];
  Object.keys(all).forEach(function (k) {
    if (k.indexOf(pre) !== 0) return;
    try {
      var rec = JSON.parse(all[k]);
      rec.email = k.slice(pre.length);
      out.push(rec);
    } catch (e) {} // skip a corrupt record rather than dying (RPC-safety)
  });
  return out;
}
function larr_(rec, numStr) {
  if (!rec.L) rec.L = {};
  if (!rec.L[numStr]) rec.L[numStr] = [0, 0, '', '', '', 0, 0, 0, '', 0, 0];
  var a = rec.L[numStr];
  while (a.length < 11) a.push(a.length === 2 || a.length === 3 || a.length === 4 || a.length === 8 ? '' : 0);
  return a;
}
function lessonNum_(year, lessonId) {
  var e = lessonEntry_(year, lessonId);
  return e ? str_(e.num) : '';
}

/* ---------- locks / delivered dates ---------- */
function getLocks_(cls) { return jget_(sp_(), 'lock:' + cls, {}); }
function getCfg_(cls) {
  var c = jget_(sp_(), 'cfg:' + cls, {});
  if (!c.lb) c.lb = { mode: 'off', basis: 'xp', names: 'codename', topN: 0 };
  if (!c.absDays) c.absDays = 5;
  if (!c.cover) c.cover = { on: 0, lesson: '', ts: 0 };
  if (!c.pairing) c.pairing = { on: 1 }; // auto-pairing default ON (section 12)
  return c;
}
function getTeam_(cls) { return jget_(sp_(), 'team:' + cls, { groups: [], reveal: false }); }

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // stated + probe-tested value (P-D measured 358ms wait live)
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------- absence inference (decision #5 + red team #2) ----------
   delivered = first-unlock timestamp (primary; work-cluster fallback is computed
   dashboard-side from the same records). "Meaningful work" = exit attempted OR
   activity detail submitted OR >= 3 active minutes. A page-view never counts.
   Flag after N school days (weekdays). Dismissal writes a per-lesson override bit. */
function schoolDaysSince_(tminVal) {
  var from = tminToDate_(tminVal), now = new Date(), days = 0;
  var d = new Date(from.getTime());
  d.setHours(0, 0, 0, 0);
  while (d.getTime() < now.getTime()) {
    var dow = d.getDay();
    if (dow !== 0 && dow !== 6) days++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(0, days - 1);
}
/* Meaningful work = exit attempted OR activity detail OR >=3 active min OR any
   recap answers (a pupil who answered the Do-Now was demonstrably present -
   review finding: without this, the dashboard could show 'started, 80% recap'
   while the absence tab flagged the same pupil as absent). */
function meaningful_(a) {
  return !!a && (str_(a[3]) !== '' || str_(a[2]) !== '' || num_(a[6]) >= 3 || num_(a[10]) > 0);
}
function absenceFor_(cls, rec, locks, manifest, absDays) {
  var flags = [];
  var lessons = (manifest && manifest.lessons) || [];
  for (var i = 0; i < lessons.length; i++) {
    var le = lessons[i];
    if (le.absenceInferenceEligible === false) continue;
    // Never flag a lesson whose content isn't authored yet - an eager unlock of
    // a 'soon' lesson must not flood the class with false absence flags.
    if (str_(le.status) !== 'ready') continue;
    var lk = locks[str_(le.num)];
    if (!lk || !num_(lk.u)) continue;
    if (schoolDaysSince_(num_(lk.u)) < absDays) continue;
    var a = (rec.L || {})[str_(le.num)];
    if (meaningful_(a)) continue;
    if (a && (num_(a[7]) & 1)) continue;           // teacher dismissed
    if (a && (num_(a[7]) & 2)) continue;           // catch-up completed
    flags.push(str_(le.id));
  }
  return flags;
}

/* ---------- serve the page ---------- */
/* Sandboxed iframe cannot read its own /exec URL or ?class= - inject via OLS_BOOT. */
function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  t.classCode = (e && e.parameter && e.parameter['class']) ? String(e.parameter['class']) : '';
  t.baseUrl = ScriptApp.getService().getUrl();
  return t.evaluate()
    .setTitle('OLS KS3 Digital Technology')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/* ==================== PUPIL API ==================== */

function apiWhoAmI() {
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  return { ok: true, email: email, name: str_(autoName_()) };
}

function apiJoin(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var rec = readPupil_(cls, email) || { n: '', cn: '', j: tmin_(), xp: 0, g: '', L: {} };
  if (!rec.n) rec.n = str_(req.name || autoName_());
  writePupil_(cls, email, rec);
  return { ok: true, name: str_(rec.n) };
}

function apiState(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var year = classYear_(cls);
  var rec = readPupil_(cls, email);
  var locks = getLocks_(cls);
  var cfg = getCfg_(cls);
  var man = null;
  try { man = yearManifest_(year); } catch (e) {}
  var absence = (rec && man) ? absenceFor_(cls, rec, locks, man, num_(cfg.absDays)) : [];
  var team = getTeam_(cls);
  var myTeam = null;
  if (rec && rec.g && cfg.lb.mode !== 'off') {
    var pupils = allPupils_(cls);
    var teamXp = 0, memberNames = [];
    for (var i = 0; i < pupils.length; i++) {
      if (str_(pupils[i].g) === str_(rec.g)) {
        teamXp += num_(pupils[i].xp);
        if (team.reveal) memberNames.push(str_(pupils[i].n));
      }
    }
    var gname = '';
    for (var gi = 0; gi < team.groups.length; gi++) if (str_(team.groups[gi].id) === str_(rec.g)) gname = str_(team.groups[gi].name);
    myTeam = { name: gname, teamXp: teamXp, revealed: !!team.reveal, members: team.reveal ? memberNames : null };
  }
  var locksOut = {};
  Object.keys(locks).forEach(function (k) { locksOut[k] = { on: num_(locks[k].on), u: num_(locks[k].u) }; });
  return {
    ok: true,
    joined: !!rec,
    year: str_(year),
    me: rec ? JSON.parse(JSON.stringify(rec)) : null,
    locks: locksOut,
    lb: { mode: str_(cfg.lb.mode), basis: str_(cfg.lb.basis), names: str_(cfg.lb.names), topN: num_(cfg.lb.topN) },
    pairing: num_(cfg.pairing.on),
    cover: num_(getCfg_(cls).cover.on),
    absence: absence,
    team: myTeam,
    contentVersion: str_(contentVersion_())
  };
}

/* A lesson is accessible once DELIVERED (u set), even if currently re-locked:
   pupils can always revisit; a lock flip never kicks anyone out (decision #10). */
function lessonAccessible_(cls, numStr) {
  var lk = getLocks_(cls)[numStr];
  return !!(lk && num_(lk.u));
}

/* ---------- Do-Now recap engine (server-side selection + marking) ---------- */
function apiRecapStart(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var year = classYear_(cls);
  var curNum = str_(req.lessonNum || '');
  var pk = poolAndKeys_(year);
  var locks = getLocks_(cls);
  var man = yearManifest_(year);
  var idToNum = {};
  (man.lessons || []).forEach(function (l) { idToNum[str_(l.id)] = str_(l.num); });

  // Eligible = items from DELIVERED lessons that are not today's lesson.
  var delivered = {};
  Object.keys(locks).forEach(function (k) { if (num_(locks[k].u)) delivered[k] = num_(locks[k].u); });
  var items = (pk.pool.items || []).filter(function (it) {
    var n = idToNum[str_(it.lesson)];
    return n && delivered[n] && n !== curNum;
  });
  if (!items.length) return { ok: true, items: [] };

  var hist = jget_(up_(), 'recap:' + year, { threads: {}, seen: {} });
  var day = today_();

  // 1) Due keystone threads first (successive relearning: retire after 3 correct
  //    sessions; a thread already answered today is not due again today).
  var due = items.filter(function (it) {
    if (!it.thread) return false;
    var t = hist.threads[it.thread];
    return !(t && (t.r || t.d === day || num_(t.s) >= 3));
  });
  shuffle_(due);
  var chosen = [];
  var usedThreads = {};
  for (var d1 = 0; d1 < due.length && chosen.length < 2; d1++) {
    if (usedThreads[due[d1].thread]) continue;
    usedThreads[due[d1].thread] = 1;
    chosen.push(due[d1]);
  }

  // 2) Fill to 5 with the 40/40/20 recency mix over DELIVERED lesson numbers.
  var nums = Object.keys(delivered).map(Number).sort(function (a, b) { return b - a; });
  var last = nums[0] || 0;
  var band = function (it) {
    var n = num_(idToNum[str_(it.lesson)]);
    var back = 0;
    for (var i = 0; i < nums.length; i++) if (nums[i] === n) { back = i; break; }
    if (back === 0) return 'a';            // last delivered lesson
    if (back >= 1 && back <= 3) return 'b'; // 2-4 lessons back
    return 'c';
  };
  var pools = { a: [], b: [], c: [] };
  items.forEach(function (it) {
    if (chosen.indexOf(it) !== -1) return;
    var seenDay = hist.seen[str_(it.id)];
    if (seenDay === day) return;           // rotate: not the same item twice in a day
    pools[band(it)].push(it);
  });
  shuffle_(pools.a); shuffle_(pools.b); shuffle_(pools.c);
  // Round-robin the recency bands (review finding: a fixed a,a,b,b,c order let
  // due keystones starve band 'c' entirely, so the oldest material never
  // resurfaced). Order a,b,c,a,b keeps the 40/40/20 shape at every budget.
  var order = ['a', 'b', 'c', 'a', 'b'];
  for (var w = 0; w < order.length && chosen.length < 5; w++) {
    var take1 = pools[order[w]].splice(0, 1);
    if (take1.length) chosen.push(take1[0]);
  }
  var rest = pools.a.concat(pools.b, pools.c);
  for (var r2 = 0; r2 < rest.length && chosen.length < Math.min(5, items.length); r2++) chosen.push(rest[r2]);
  // If seen-today rotation leaves fewer than 3, serve what's left rather than
  // re-serving items answered today (review finding) - the client handles a
  // short or empty Do-Now gracefully.

  // Shuffle each item's options server-side; remember the order for marking.
  var session = { day: day, items: [] };
  var out = [];
  chosen.forEach(function (it) {
    var ord = it.options.map(function (_, i) { return i; });
    shuffle_(ord);
    session.items.push({ id: str_(it.id), ord: ord, thread: str_(it.thread || '') });
    out.push({ id: str_(it.id), topic: str_(it.topic), stem: str_(it.stem),
      options: ord.map(function (oi) { return str_(it.options[oi]); }) });
  });
  jset_(up_(), 'rs:' + year + ':' + curNum, session);
  return { ok: true, items: out };
}

function apiRecapAnswer(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var year = classYear_(cls);
  var curNum = str_(req.lessonNum || '');
  var session = jget_(up_(), 'rs:' + year + ':' + curNum, null);
  if (!session) return { ok: false, error: 'no-session' };
  var entry = null;
  for (var i = 0; i < session.items.length; i++) if (session.items[i].id === str_(req.itemId)) entry = session.items[i];
  if (!entry) return { ok: false, error: 'not-in-session' };
  var pk = poolAndKeys_(year);
  var key = pk.keys[str_(req.itemId)];
  if (!key) return { ok: false, error: 'no-key' };
  var choice = num_(req.choice);
  var originalIdx = num_(entry.ord[choice]);
  var correct = originalIdx === num_(key.a);
  var correctShuffled = entry.ord.indexOf(num_(key.a));

  // Update private history (threads: successive relearning; seen: daily rotation).
  var hist = jget_(up_(), 'recap:' + year, { threads: {}, seen: {} });
  var day = today_();
  hist.seen[str_(req.itemId)] = day;
  if (entry.thread) {
    var t = hist.threads[entry.thread] || { s: 0, d: -1, r: false };
    if (correct) { if (t.d !== day) { t.s = num_(t.s) + 1; t.d = day; } if (t.s >= 3) t.r = true; }
    else { t.s = 0; t.d = day; t.r = false; }
    hist.threads[entry.thread] = t;
  }
  jset_(up_(), 'recap:' + year, hist);

  // Roll accuracy into the lean record (dashboard stuck-pupil signal), under
  // the lock so a concurrent heartbeat save can't clobber the counters.
  withLock_(function () {
    var rec = readPupil_(cls, email);
    if (rec) {
      var a = larr_(rec, curNum);
      a[9] = num_(a[9]) + (correct ? 1 : 0);
      a[10] = num_(a[10]) + 1;
      if (num_(a[0]) < 1) a[0] = 1;
      a[5] = tmin_();
      tryWritePupil_(cls, email, rec);
    }
    return true;
  });
  return { ok: true, correct: !!correct, correctIdx: num_(correctShuffled), explain: str_(key.explain || '') };
}

/* ---------- in-lesson item marking (rules checks, calibration) ---------- */
function apiMark(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var year = classYear_(cls);
  var lessonId = str_(req.lessonId);
  var numStr = lessonNum_(year, lessonId);
  if (!lessonAccessible_(cls, numStr)) return { ok: false, error: 'locked' };
  var keys = lessonKeys_(year, lessonId);
  var key = keys[str_(req.itemId)];
  if (!key) return { ok: false, error: 'no-key' };
  var choice = num_(req.choice);
  return { ok: true, correct: choice === num_(key.a), correctIdx: num_(key.a), explain: str_(key.explain || '') };
}

/* Vault check served at runtime as SALTED HASHES, never the plaintext map
   (review finding: returning the map handed a DevTools pupil the full solution
   for zero effort). The client hashes each candidate drop and compares - drag
   stays lag-free, casual console cheating doesn't work. Explanations are only
   released AFTER the placement result has been recorded (mode:'explain'). */
function apiVaultInfo(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var year = classYear_(cls);
  var lessonId = str_(req.lessonId);
  var numStr = lessonNum_(year, lessonId);
  if (!lessonAccessible_(cls, numStr)) return { ok: false, error: 'locked' };
  var keys = lessonKeys_(year, lessonId);
  var keyId = str_(req.keyId || 'vault');
  var v = keys[keyId];
  if (!v || !v.map) return { ok: false, error: 'no-key' };
  if (str_(req.mode) === 'explain') {
    var rec = readPupil_(cls, email);
    var a = rec ? larr_(rec, numStr) : null;
    var done = a && (detailKeys_(a[2]).indexOf('vp') !== -1 || detailKeys_(a[2]).indexOf(keyId) !== -1 ||
      ((num_(a[7]) & 4) && num_(a[0]) === 2)); // archived completed lesson: ledger swept, review keeps its explains
    if (!done) return { ok: false, error: 'not-finished' };
    return { ok: true, explain: v.explain || {} };
  }
  var salt = Utilities.getUuid().slice(0, 8);
  var check = {};
  Object.keys(v.map).forEach(function (fileId) {
    check[fileId] = vhash_(salt + '|' + fileId + '|' + str_(v.map[fileId]));
  });
  return { ok: true, salt: str_(salt), check: check };
}

/* Lesson detail (Larr[2]) holds MULTIPLE engines' results as 'key=value' pairs
   joined by ';' (e.g. 'rules=3/3;vault=5/6;bl=11/16|0121...;cn=Pearl Breeze').
   Writes MERGE by key - without this, each badge stomped the previous one's
   result and the codename write erased the baseline (found in browser verify). */
function mergeDetail_(existing, addition) {
  var map = {}, order = [];
  function take(seg) {
    if (!seg) return;
    var k = seg.split('=')[0];
    if (!(k in map)) order.push(k);
    map[k] = seg;
  }
  String(existing || '').split(';').forEach(take);
  String(addition || '').split(';').forEach(take);
  return order.map(function (k) { return map[k]; }).join(';').slice(0, 180);
}
function detailKeys_(s) {
  return String(s || '').split(';').filter(Boolean).map(function (seg) { return seg.split('=')[0]; });
}
/* True when `addition` introduces at least one detail key not already stored -
   the idempotency test for XP grants (a replayed/retried event adds no new key). */
function detailAddsNew_(existing, addition) {
  var have = detailKeys_(existing);
  return detailKeys_(addition).some(function (k) { return have.indexOf(k) === -1; });
}
/* Tiny non-crypto hash for the vault placement check (client-side drag needs an
   instant verdict; hashing beats a zero-effort DevTools dump of the map). */
function vhash_(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/* ---------- progress events (badges, XP, drafts, active time) ---------- */
function apiSaveEvent(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var numStr = str_(req.lessonNum || '');
  if (!numStr) return { ok: false, error: 'no-lesson' };
  // Review findings: gate on delivered lessons; XP is granted ONLY when the
  // event's detail introduces a NEW key (idempotent under outbox retries and
  // console replays), capped per event AND per lesson. Same-pupil concurrent
  // RPCs (two tabs, heartbeat + badge) serialise under the lock.
  if (!lessonAccessible_(cls, numStr)) return { ok: false, error: 'locked' };
  var out = withLock_(function () {
    var rec = readPupil_(cls, email);
    if (!rec) return { ok: false, error: 'not-joined' };
    var a = larr_(rec, numStr);
    // Archived lessons are SEALED: their detail ledger (the XP idempotency
    // record) now lives in the year archive, so no further grants or writes.
    if ((num_(a[7]) & 4) && num_(a[0]) === 2) return { ok: true, xp: num_(rec.xp), sealed: true };
    if (num_(a[0]) < 1) a[0] = 1;
    var xpDelta = Math.max(0, Math.min(40, num_(req.xp)));
    var isNew = req.detail != null && detailAddsNew_(a[2], str_(req.detail));
    if (xpDelta && isNew) {
      xpDelta = Math.min(xpDelta, Math.max(0, 150 - num_(a[1]))); // per-lesson ceiling
      a[1] = num_(a[1]) + xpDelta;
      rec.xp = num_(rec.xp) + xpDelta;
    }
    if (req.detail != null) a[2] = mergeDetail_(a[2], str_(req.detail).slice(0, 120));
    if (req.minDelta) a[6] = num_(a[6]) + Math.max(0, Math.min(10, num_(req.minDelta)));
    if (req.codename != null) rec.cn = str_(req.codename).slice(0, 40);
    a[5] = tmin_();
    if (!tryWritePupil_(cls, email, rec)) return STORE_FULL_;
    return { ok: true, xp: num_(rec.xp) };
  });
  if (out.ok && req.draft != null) {
    var draft = str_(JSON.stringify(req.draft));
    if (draft.length < 8000) up_().setProperty('draft:' + classYear_(cls) + ':' + numStr, draft);
  }
  return out;
}

function apiLoadDraft(req) {
  req = req || {};
  var numStr = str_(req.lessonNum || '');
  var cls = realClass_(req.classCode);
  // Year-qualified key (review finding: bare lessonNum collides across years -
  // a J2 pupil would inherit her own J1 drafts for the same lesson numbers).
  var raw = up_().getProperty('draft:' + (cls ? classYear_(cls) : 'j1') + ':' + numStr);
  var draft = null;
  try { draft = raw ? JSON.parse(raw) : null; } catch (e) {}
  return { ok: true, draft: draft };
}

/* ---------- exit check + self-eval (server-marked, feedback returned) ---------- */
function apiSubmitExit(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var year = classYear_(cls);
  var lessonId = str_(req.lessonId);
  var numStr = lessonNum_(year, lessonId);
  if (!lessonAccessible_(cls, numStr)) return { ok: false, error: 'locked' };
  var entry = lessonEntry_(year, lessonId);
  var lesson = fetchContent_(str_(entry.file));
  var keys = lessonKeys_(year, lessonId);
  var exitItems = (lesson.exit && lesson.exit.items) || [];
  // Support lessons that define exit inside chunks (engine exitcheck).
  if (!exitItems.length) {
    (lesson.chunks || []).forEach(function (ch) {
      if (ch.engine === 'exitcheck' && ch.config && ch.config.items) exitItems = ch.config.items;
    });
  }
  var answers = (req.answers || []).map(function (v) { return num_(v); });
  var chosenStr = '', right = 0;
  var fb = [];
  for (var i = 0; i < exitItems.length; i++) {
    var it = exitItems[i];
    var key = keys[str_(it.id)] || {};
    var ch = (i < answers.length) ? answers[i] : -1;
    var ok = ch === num_(key.a);
    if (ok) right++;
    chosenStr += (ch >= 0 && ch <= 9) ? String(ch) : 'x';
    fb.push({ id: str_(it.id), correct: !!ok, correctIdx: num_(key.a), explain: str_(key.explain || '') });
  }
  var se = req.selfEval || {};
  return withLock_(function () {
    var rec = readPupil_(cls, email);
    if (!rec) return { ok: false, error: 'not-joined' };
    var a = larr_(rec, numStr);
    // First submission wins (review finding: resubmission farmed XP and let a
    // pupil overwrite her real result). A retry of a LOST response gets the
    // same feedback back, no double-write, no double-XP.
    if (str_(a[3]) !== '') {
      return { ok: true, already: true, right: num_(right), total: num_(exitItems.length), feedback: fb, xp: num_(rec.xp) };
    }
    a[0] = 2;
    a[3] = chosenStr;
    a[4] = str_(se.conf || '').slice(0, 6) + '|' + str_(se.diff || '');
    a[8] = str_(se.comment || '').slice(0, 60);
    a[5] = tmin_();
    var xpDelta = Math.min(10, Math.max(0, 150 - num_(a[1])));
    a[1] = num_(a[1]) + xpDelta; rec.xp = num_(rec.xp) + xpDelta;
    if (!tryWritePupil_(cls, email, rec)) return STORE_FULL_;
    return { ok: true, right: num_(right), total: num_(exitItems.length), feedback: fb, xp: num_(rec.xp) };
  });
}

/* Baseline (L1 Licence Exam): marked + stored, NEVER fed back (doc 07: neutral ack). */
function apiSubmitBaseline(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var year = classYear_(cls);
  var lessonId = str_(req.lessonId);
  var numStr = lessonNum_(year, lessonId);
  if (!lessonAccessible_(cls, numStr)) return { ok: false, error: 'locked' };
  var keys = lessonKeys_(year, lessonId);
  var answers = req.answers || {}; // {itemId: choiceIdx}
  var ids = Object.keys(answers).sort();
  var right = 0, chosen = '';
  ids.forEach(function (id) {
    var key = keys[id];
    var ch = num_(answers[id]);
    if (key && ch === num_(key.a)) right++;
    chosen += (ch >= 0 && ch <= 9) ? String(ch) : 'x';
  });
  return withLock_(function () {
    var rec = readPupil_(cls, email);
    if (!rec) return { ok: false, error: 'not-joined' };
    var a = larr_(rec, numStr);
    // The baseline is a one-off diagnostic: first submission is the record.
    // (An archived lesson's ledger is swept, so the archived bit also gates.)
    if (detailKeys_(a[2]).indexOf('bl') !== -1 || (num_(a[7]) & 4)) return { ok: true, already: true };
    a[2] = mergeDetail_(a[2], 'bl=' + right + '/' + ids.length + '|' + chosen);
    a[5] = tmin_();
    if (num_(a[0]) < 1) a[0] = 1;
    if (!tryWritePupil_(cls, email, rec)) return STORE_FULL_;
    return { ok: true }; // deliberately no marks: a diagnostic, not a quiz
  });
}

function apiCatchup(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var numStr = str_(req.lessonNum || '');
  return withLock_(function () {
    var rec = readPupil_(cls, email);
    if (!rec) return { ok: false, error: 'not-joined' };
    var a = larr_(rec, numStr);
    a[7] = num_(a[7]) | 2;
    a[5] = tmin_();
    if (!tryWritePupil_(cls, email, rec)) return STORE_FULL_;
    return { ok: true };
  });
}

/* ---------- Side-quest Drive inspection (execute-as-user, real folders) ----
   The "Files That Follow You" side quest asks the pupil to build School /
   DT Work in her REAL Google Drive; this call looks inside it (her own
   Drive, her own quota, drive scope already consented) and reports what
   exists. Read-only, no lock, no store writes - the badge itself is granted
   through the normal idempotent saveEvent path. Name matching is
   case-insensitive and trimmed; iteration is capped so a pathological
   root folder can't run away. */
function apiDriveCheck(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var numStr = str_(req.lessonNum || '');
  if (!lessonAccessible_(cls, numStr)) return { ok: false, error: 'locked' };
  try {
    var school = false, dtwork = false;
    var roots = DriveApp.getRootFolder().getFolders();
    var guard = 0;
    while (roots.hasNext() && guard < 800) {
      guard++;
      var f = roots.next();
      if (str_(f.getName()).trim().toLowerCase() !== 'school') continue;
      school = true;
      var subs = f.getFolders();
      var g2 = 0;
      while (subs.hasNext() && g2 < 400) {
        g2++;
        if (str_(subs.next().getName()).trim().toLowerCase() === 'dt work') { dtwork = true; break; }
      }
      if (dtwork) break;
    }
    return { ok: true, school: school, dtwork: dtwork };
  } catch (e) {
    return { ok: false, error: 'drive-error' };
  }
}

/* Artifact inspection (L2+ "bank your build"): genuinely looks inside the
   pupil's School > DT Work folder for a recently-modified file of the given
   kind (.hex, .sb3, ...). Read-only, capped iteration, execute-as-user - the
   same honesty contract as apiDriveCheck: the badge step only passes when the
   file is really there. Damien's condition (22 Jul): pupils save external-tool
   work to Drive PROVIDED the platform shows them how - this is the "show them
   how, then verify" half. */
function apiArtifactCheck(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var numStr = str_(req.lessonNum || '');
  if (!lessonAccessible_(cls, numStr)) return { ok: false, error: 'locked' };
  var kinds = [];
  (Array.isArray(req.kinds) ? req.kinds : []).slice(0, 4).forEach(function (k) {
    k = str_(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (k) kinds.push('.' + k);
  });
  if (!kinds.length) return { ok: false, error: 'no-kinds' };
  var hours = Math.max(1, Math.min(24, num_(req.hours) || 3));
  try {
    var dtFolder = null;
    var roots = DriveApp.getRootFolder().getFolders();
    var guard = 0;
    while (roots.hasNext() && guard < 800 && !dtFolder) {
      guard++;
      var f = roots.next();
      if (str_(f.getName()).trim().toLowerCase() !== 'school') continue;
      var subs = f.getFolders();
      var g2 = 0;
      while (subs.hasNext() && g2 < 400) {
        g2++;
        var sub = subs.next();
        if (str_(sub.getName()).trim().toLowerCase() === 'dt work') { dtFolder = sub; break; }
      }
    }
    if (!dtFolder) return { ok: true, found: false, noFolder: true };
    var cutoffMs = Date.now() - hours * 3600000;
    var files = dtFolder.getFiles();
    var g3 = 0, best = null, bestMs = 0;
    while (files.hasNext() && g3 < 200) {
      g3++;
      var file = files.next();
      var name = str_(file.getName());
      var lower = name.toLowerCase();
      var hit = false;
      for (var ki = 0; ki < kinds.length; ki++) if (lower.slice(-kinds[ki].length) === kinds[ki]) hit = true;
      if (!hit) continue;
      var ms = file.getLastUpdated().getTime();
      if (ms >= cutoffMs && ms > bestMs) { bestMs = ms; best = name; }
    }
    if (!best) return { ok: true, found: false, noFolder: false };
    return { ok: true, found: true, name: best.slice(0, 60), ageMin: num_(Math.round((Date.now() - bestMs) / 60000)) };
  } catch (e) {
    return { ok: false, error: 'drive-error' };
  }
}

/* ---------- Agent Kit (cosmetic themes + insignia, clearance-gated) ----------
   Cosmetic ONLY: never grants or touches XP, so it adds no farming surface.
   The registry is public content/themes.json (adding a theme = a git push, no
   redeploy); the server re-reads it here so a DevTools call cannot equip kit
   above the pupil's clearance. Clearance = total XP vs the registry ladder. */
function kitRegistry_() { return fetchContent_('themes.json'); }
function kitClearanceXp_(reg, level) {
  var cs = (reg && reg.clearances) || [];
  for (var i = 0; i < cs.length; i++) if (num_(cs[i].level) === num_(level)) return num_(cs[i].xp);
  return 0;
}
function apiSetKit(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var reg;
  try { reg = kitRegistry_(); } catch (e) { return { ok: false, error: 'no-registry' }; }
  var themeId = req.themeId != null ? str_(req.themeId) : null;
  var insigniaId = req.insigniaId != null ? str_(req.insigniaId) : null;
  return withLock_(function () {
    var rec = readPupil_(cls, email);
    if (!rec) return { ok: false, error: 'not-joined' };
    var xp = num_(rec.xp);
    if (themeId != null) {
      if (themeId === '') { rec.th = ''; }
      else {
        var th = null;
        (reg.themes || []).forEach(function (t) { if (str_(t.id) === themeId) th = t; });
        if (!th) return { ok: false, error: 'unknown-theme' };
        if (xp < kitClearanceXp_(reg, th.clearance)) return { ok: false, error: 'kit-locked' };
        rec.th = themeId;
      }
    }
    if (insigniaId != null) {
      if (insigniaId === '') { rec.fx = ''; }
      else {
        var ins = null;
        (reg.insignia || []).forEach(function (g) { if (str_(g.id) === insigniaId) ins = g; });
        if (!ins) return { ok: false, error: 'unknown-insignia' };
        if (xp < kitClearanceXp_(reg, ins.clearance)) return { ok: false, error: 'kit-locked' };
        rec.fx = insigniaId;
      }
    }
    if (!tryWritePupil_(cls, email, rec)) return STORE_FULL_;
    return { ok: true, th: str_(rec.th || ''), fx: str_(rec.fx || '') };
  });
}

/* Public class board (decision #8): pupil-readable ONLY when the teacher has
   deliberately switched the class to 'public'. Names honour the codename/real
   config; basis honours xp/completion; topN 0 = whole class. */
function apiBoard(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var cfg = getCfg_(cls);
  if (str_(cfg.lb.mode) !== 'public') return { ok: true, mode: str_(cfg.lb.mode), rows: [] };
  var rows = allPupils_(cls).filter(function (r) { return str_(r.n); }).map(function (r) {
    var doneCount = 0;
    Object.keys(r.L || {}).forEach(function (k) { if (num_((r.L[k] || [])[0]) === 2) doneCount++; });
    return {
      label: str_(cfg.lb.names) === 'real' ? str_(r.n).split(' ')[0] : ('Agent ' + (str_(r.cn) || 'Unnamed')),
      v: str_(cfg.lb.basis) === 'completion' ? num_(doneCount) : num_(r.xp),
      me: str_(r.email) === email
    };
  });
  rows.sort(function (a, b) { return b.v - a.v; });
  var topN = num_(cfg.lb.topN);
  if (topN > 0) rows = rows.slice(0, topN);
  return { ok: true, mode: 'public', basis: str_(cfg.lb.basis), rows: rows };
}

/* ==================== AUTO-PAIRING + MONITORED CHAT (ARCHITECTURE.md section 12) ====================
   FIFO stage-matched pairing with a last-three trio, plus a CacheService
   "Comms Channel" between partners. Queue + channel are ephemeral cache;
   formed pairs mirror to ScriptProperties pair:<cls>:<lessonId> (tiny) so a
   cache eviction can never orphan a live pair; compact transcripts land in
   chat:<cls>:<lessonId> at completion and sweep to the Archive Sheet's
   "Chat Archive" tab after CHAT_ARCHIVE_AFTER_DAYS. No new OAuth scopes:
   CacheService + LockService are scope-free. */
var PAIR_PRESENT_MIN = 10;     // live-present window, minutes (agreed spec)
var PAIR_QUEUE_STALE_S = 45;   // a waiter this silent is pruned (re-adds on next poll)
var PAIR_MSG_MAX = 240;        // chars per chat message
var PAIR_EV_KEEP = 150;        // channel events kept in cache
var PAIR_TX_MAX = 500;         // chars of compact stored transcript per pair
var CHAT_ARCHIVE_AFTER_DAYS = 7;
/* L1 pairs form BEFORE the codename badge exists, so members without a
   codename get a mission call sign - the identity-reveal fiction holds from
   the very first lesson. */
var PAIR_CALLSIGNS = ['Kestrel', 'Osprey', 'Merlin', 'Harrier', 'Nightjar', 'Skylark'];
function callsignFill_(formed) {
  var seed = Math.floor(Math.random() * PAIR_CALLSIGNS.length);
  return formed.map(function (w, i) {
    return str_(w.cn) || PAIR_CALLSIGNS[(seed + i) % PAIR_CALLSIGNS.length];
  });
}

function tsec_() { return Math.floor(Date.now() / 1000); }
function cache_() { return CacheService.getScriptCache(); }
function cGet_(key, fallback) {
  try { var raw = cache_().get(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function cPut_(key, obj, ttl) {
  try { cache_().put(key, JSON.stringify(obj), ttl || 21600); } catch (e) {}
}
function pairRegKey_(cls, lessonId) { return 'pair:' + cls + ':' + lessonId; }
function chatKey_(cls, lessonId) { return 'chat:' + cls + ':' + lessonId; }
function pqCacheKey_(cls, lessonId) { return 'ks3dt:pq:' + cls + ':' + lessonId; }
function chCacheKey_(pid) { return 'ks3dt:pch:' + pid; }
function presCacheKey_(cls) { return 'ks3dt:pres:' + cls; }

function pairReg_(cls, lessonId) {
  var reg = jget_(sp_(), pairRegKey_(cls, lessonId), null) || {};
  if (!reg.P) reg.P = {};
  if (!reg.solo) reg.solo = [];
  return reg;
}
function pairOf_(reg, email) {
  var pids = Object.keys(reg.P);
  for (var i = 0; i < pids.length; i++) {
    var m = reg.P[pids[i]].m || [];
    for (var j = 0; j < m.length; j++) if (str_(m[j]) === email) return { pid: pids[i], mi: j };
  }
  return null;
}

/* Presence beacon: piggybacked on the client heartbeat (~60s while a lesson is
   open, never in review/catch-up). Lock-free RMW - a lost update self-heals on
   the next ping, and all pairing DECISIONS happen under withLock_. */
function apiPing(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var pres = cGet_(presCacheKey_(cls), {});
  pres[email] = [tmin_(), str_(req.lessonNum || ''), num_(req.ci), num_(req.cc)];
  cPut_(presCacheKey_(cls), pres, 21600);
  return { ok: true };
}

function presentOn_(cls, numStr) {
  // emails live-present on this lesson, with their chunk positions
  var pres = cGet_(presCacheKey_(cls), {});
  var floor = tmin_() - PAIR_PRESENT_MIN;
  var out = {};
  Object.keys(pres).forEach(function (e) {
    var p = pres[e];
    if (p && num_(p[0]) >= floor && str_(p[1]) === numStr) out[e] = { ci: num_(p[2]), cc: num_(p[3]) };
  });
  return out;
}

function pairStateFor_(reg, hit) {
  var P = reg.P[hit.pid];
  return {
    ok: true, state: 'paired', pid: str_(hit.pid), mi: num_(hit.mi),
    trio: num_(P.trio), done: num_(P.done), rv: num_(P.rv),
    members: (P.cn || []).map(function (c) { return str_(c); }),
    names: num_(P.rv) ? (P.n || []).map(function (n) { return str_(n); }) : null
  };
}

/* Form pairs/trios from the queue under the agreed rules. Runs INSIDE the lock.
   E = pupils still expected to reach the stage (union of live-present pupils on
   this lesson who are not past the stage and not yet assigned, plus everyone
   actively queued). Pair FIFO while E > 3; hold for the TRIO when E == 3;
   pair the last two when E == 2; release solo when E <= 1. */
function pairMatch_(cls, lessonId, numStr, stageIdx, reg, q) {
  var nowS = tsec_();
  q.q = (q.q || []).filter(function (w) { return nowS - num_(w.p) <= PAIR_QUEUE_STALE_S; });
  var assigned = {};
  Object.keys(reg.P).forEach(function (pid) {
    (reg.P[pid].m || []).forEach(function (e) { assigned[str_(e)] = 1; });
  });
  (reg.solo || []).forEach(function (e) { assigned[str_(e)] = 1; });
  var expected = {};
  q.q.forEach(function (w) { expected[str_(w.e)] = 1; });
  var present = presentOn_(cls, numStr);
  Object.keys(present).forEach(function (e) {
    if (assigned[e]) return;
    if (present[e].ci > stageIdx) return; // already past the stage (never paired: solo path or old run)
    expected[e] = 1;
  });
  var E = Object.keys(expected).length;
  var formed = null;
  if (q.q.length >= 3 && E === 3) formed = q.q.splice(0, 3);
  else if (q.q.length >= 2 && E !== 3) formed = q.q.splice(0, 2);
  else if (q.q.length === 1 && E <= 1) {
    var lone = q.q.splice(0, 1)[0];
    reg.solo.push(str_(lone.e));
    return { E: E, solo: str_(lone.e) };
  }
  if (formed) {
    var pid = 'p' + tmin_() + '-' + Math.floor(Math.random() * 10000);
    reg.P[pid] = {
      m: formed.map(function (w) { return str_(w.e); }),
      cn: callsignFill_(formed),
      t: tmin_(), trio: formed.length === 3 ? 1 : 0, done: 0, rv: 0
    };
    cPut_(chCacheKey_(pid), { seq: 0, ev: [], ls: [] }, 21600);
  }
  return { E: E, solo: '' };
}

/* Join the pairing stage. Idempotent - doubles as the ~2s waiting poll. */
function apiPairJoin(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var cfg = getCfg_(cls);
  if (!num_(cfg.pairing.on)) return { ok: true, state: 'off' };
  var lessonId = str_(req.lessonId);
  var year = classYear_(cls);
  var numStr = lessonNum_(year, lessonId);
  if (!numStr || !lessonAccessible_(cls, numStr)) return { ok: false, error: 'locked' };
  var stageIdx = num_(req.stageIdx);
  return withLock_(function () {
    var reg = pairReg_(cls, lessonId);
    var hit = pairOf_(reg, email);
    if (hit) return pairStateFor_(reg, hit);
    if (reg.solo.indexOf(email) !== -1) return { ok: true, state: 'solo' };
    var q = cGet_(pqCacheKey_(cls, lessonId), { q: [], stage: stageIdx });
    q.stage = stageIdx;
    var mine = null;
    for (var i = 0; i < q.q.length; i++) if (str_(q.q[i].e) === email) mine = q.q[i];
    if (mine) mine.p = tsec_();
    else {
      var rec = readPupil_(cls, email);
      q.q.push({ e: email, cn: str_(rec && rec.cn || ''), t: tsec_(), p: tsec_() });
    }
    var res = pairMatch_(cls, lessonId, numStr, stageIdx, reg, q);
    jset_(sp_(), pairRegKey_(cls, lessonId), reg);
    cPut_(pqCacheKey_(cls, lessonId), q, 21600);
    var hit2 = pairOf_(reg, email);
    if (hit2) return pairStateFor_(reg, hit2);
    if (res.solo === email || reg.solo.indexOf(email) !== -1) return { ok: true, state: 'solo' };
    var pos = 0;
    for (var k = 0; k < q.q.length; k++) if (str_(q.q[k].e) === email) pos = k + 1;
    return { ok: true, state: 'wait', pos: num_(pos), waiting: num_(q.q.length), expected: num_(res.E), trioHold: res.E === 3 ? 1 : 0 };
  });
}

/* Append an event to the pair channel. kinds: msg (chat), drop (vault move,
   payload "fileId|folderId|ok|attempt"), done (activity finished). Appends run
   under the lock so concurrent sends can never lose each other. */
function apiPairSend(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var lessonId = str_(req.lessonId);
  var kind = str_(req.kind);
  if (kind !== 'msg' && kind !== 'drop' && kind !== 'done') return { ok: false, error: 'bad-kind' };
  var text = str_(req.text).replace(/[\u0000-\u001f]/g, ' ').slice(0, PAIR_MSG_MAX);
  if (kind === 'msg' && !text.trim()) return { ok: false, error: 'empty' };
  var reg = pairReg_(cls, lessonId);
  var hit = pairOf_(reg, email);
  if (!hit || str_(hit.pid) !== str_(req.pid)) return { ok: false, error: 'not-your-pair' };
  return withLock_(function () {
    var ch = cGet_(chCacheKey_(str_(req.pid)), { seq: 0, ev: [], ls: [] });
    if (kind === 'msg') {
      var last = num_((ch.ls || [])[hit.mi]);
      if (last && tsec_() - last < 1) return { ok: false, error: 'too-fast' };
      if (!ch.ls) ch.ls = [];
      ch.ls[hit.mi] = tsec_();
    }
    ch.seq = num_(ch.seq) + 1;
    ch.ev.push([ch.seq, num_(hit.mi), kind, text, tsec_()]);
    if (ch.ev.length > PAIR_EV_KEEP) ch.ev = ch.ev.slice(ch.ev.length - PAIR_EV_KEEP);
    cPut_(chCacheKey_(str_(req.pid)), ch, 21600);
    return { ok: true, seq: num_(ch.seq) };
  });
}

/* Poll the channel (~2s during a paired activity). Read-only on the channel
   blob; per-member liveness beacons are separate single-value cache puts so a
   poll can never race an append. */
function apiPairChannel(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var lessonId = str_(req.lessonId);
  var reg = pairReg_(cls, lessonId);
  var hit = pairOf_(reg, email);
  if (!hit || str_(hit.pid) !== str_(req.pid)) return { ok: false, error: 'not-your-pair' };
  var P = reg.P[hit.pid];
  var pid = str_(hit.pid);
  cPut_('ks3dt:pls:' + pid + ':' + hit.mi, { t: tsec_() }, 3600);
  var since = num_(req.since);
  var ch = cGet_(chCacheKey_(pid), { seq: 0, ev: [], ls: [] });
  var ev = [];
  for (var i = 0; i < ch.ev.length; i++) if (num_(ch.ev[i][0]) > since) ev.push(ch.ev[i]);
  var live = [];
  for (var mi = 0; mi < (P.m || []).length; mi++) {
    if (mi === hit.mi) { live.push(1); continue; }
    var b = cGet_('ks3dt:pls:' + pid + ':' + mi, null);
    if (!b) live.push(tmin_() - num_(P.t) <= 2 ? 1 : 0); // formation grace: no beacon until their first poll
    else live.push(tsec_() - num_(b.t) <= 45 ? 1 : 0);
  }
  return {
    ok: true, seq: num_(ch.seq), ev: ev, live: live,
    done: num_(P.done), rv: num_(P.rv),
    names: num_(P.rv) ? (P.n || []).map(function (n) { return str_(n); }) : null
  };
}

/* Completion: seal the pair, declassify first names, flush the compact
   monitored transcript to the store (idempotent; a store-full transcript skip
   never blocks the reveal). */
function apiPairComplete(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var lessonId = str_(req.lessonId);
  return withLock_(function () {
    var reg = pairReg_(cls, lessonId);
    var hit = pairOf_(reg, email);
    if (!hit || str_(hit.pid) !== str_(req.pid)) return { ok: false, error: 'not-your-pair' };
    var P = reg.P[hit.pid];
    if (num_(P.done)) return { ok: true, names: (P.n || []).map(function (n) { return str_(n); }) };
    var names = (P.m || []).map(function (e) {
      var r = readPupil_(cls, str_(e));
      return str_(r && r.n || '').split(' ')[0] || 'Agent';
    });
    P.done = 1; P.rv = 1; P.n = names;
    jset_(sp_(), pairRegKey_(cls, lessonId), reg);
    try {
      var ch = cGet_(chCacheKey_(str_(hit.pid)), { seq: 0, ev: [], ls: [] });
      var msgs = ch.ev.filter(function (e) { return str_(e[2]) === 'msg'; });
      var counts = (P.m || []).map(function () { return 0; });
      msgs.forEach(function (e) { counts[num_(e[1])] = num_(counts[num_(e[1])]) + 1; });
      var lines = msgs.map(function (e) { return str_(P.cn[num_(e[1])]) + ': ' + str_(e[3]); });
      var tx = lines.join(' / ');
      if (tx.length > PAIR_TX_MAX) {
        var head = tx.slice(0, Math.floor(PAIR_TX_MAX * 0.6));
        var tail = tx.slice(tx.length - Math.floor(PAIR_TX_MAX * 0.35));
        tx = head + ' [...] ' + tail;
      }
      var chat = jget_(sp_(), chatKey_(cls, lessonId), {});
      if (!chat[str_(hit.pid)]) {
        chat[str_(hit.pid)] = {
          m: (P.m || []).map(function (e) { return str_(e); }),
          cn: (P.cn || []).map(function (c) { return str_(c); }),
          n: names, t: num_(P.t), c: counts, tx: tx
        };
        jset_(sp_(), chatKey_(cls, lessonId), chat);
      }
    } catch (e) {} // transcript is best-effort; the reveal must never fail on it
    return { ok: true, names: names };
  });
}

/* ==================== STAFF API ==================== */

function apiAdmin(req) {
  req = req || {};
  var got = str_(req.passcode).trim().toLowerCase();
  var want = str_(sp_().getProperty('staffPasscode') || '').trim().toLowerCase();
  if (!want || !got || got !== want) return { ok: false, error: 'bad-passcode' };
  var me = userEmail_();
  var sub = str_(req.sub);
  var className = str_(req.className || '');
  var cls = className ? realClass_(className) : '';

  if (sub === 'check') return { ok: true, email: str_(me) };

  if (sub === 'classes') {
    var reg = getClasses_();
    var all = sp_().getProperties();
    var counts = {};
    Object.keys(all).forEach(function (k) {
      if (k.indexOf('p:') === 0) {
        var c = k.split(':')[1];
        counts[c] = (counts[c] || 0) + 1;
      }
    });
    var health = storeHealth_();
    return {
      ok: true, me: str_(me),
      classes: reg.map(function (c) {
        return { name: str_(c.name), owner: str_(c.owner), year: str_(c.year), created: str_(c.created), pupils: num_(counts[c.name] || 0) };
      }),
      store: { bytes: num_(health.bytes), limit: num_(health.limit), pupils: num_(health.pupils) },
      archive: jget_(sp_(), 'archiveMeta', null)
    };
  }

  /* Manual archive sweep (same routine the nightly trigger runs). Only the
     platform owner's account can open the archive Sheet, so anyone else gets
     a clear error back instead of a half-run. */
  if (sub === 'archiveNow') {
    var sweep = archiveSweep_();
    return { ok: true, ran: true, rows: num_(sweep.rows), pupils: num_(sweep.pupils), okRun: !!sweep.ok, error: str_(sweep.error || '') };
  }

  /* Remove one pupil's shared record from a class (wrong-class joins happen -
     the class link is the only gate by design). Her private UserProperties and
     Drive work are untouched; rejoining recreates a fresh record. */
  if (sub === 'removePupil') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var rpEmail = str_(req.email).toLowerCase();
    if (!rpEmail) return { ok: false, error: 'no-email' };
    sp_().deleteProperty(pKey_(cls, rpEmail));
    return { ok: true };
  }

  if (sub === 'addClass') {
    var name = sanitizeClass_(req.name);
    if (!name) return { ok: false, error: 'bad-name' };
    var year = str_(req.year || 'j1').toLowerCase();
    if (['j1', 'j2', 'j3'].indexOf(year) === -1) year = 'j1';
    return withLock_(function () {
      var reg2 = getClasses_();
      for (var i = 0; i < reg2.length; i++) {
        if (reg2[i].name.toLowerCase() === name.toLowerCase()) return { ok: false, error: 'exists', name: str_(reg2[i].name) };
      }
      reg2.push({ name: name, owner: me, year: year, created: new Date().toISOString() });
      jset_(sp_(), 'classes', reg2);
      return { ok: true, name: str_(name) };
    });
  }

  if (sub === 'deleteClass') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var entry = null;
    getClasses_().forEach(function (c) { if (c.name === cls) entry = c; });
    if (entry && entry.owner && entry.owner !== me) return { ok: false, error: 'not-owner' };
    return withLock_(function () {
      var spp = sp_();
      var props = spp.getProperties();
      var pre = 'p:' + cls + ':';
      var removed = 0;
      Object.keys(props).forEach(function (k) { if (k.indexOf(pre) === 0) { spp.deleteProperty(k); removed++; } });
      ['lock:' + cls, 'cfg:' + cls, 'team:' + cls].forEach(function (k) { spp.deleteProperty(k); });
      jset_(spp, 'classes', getClasses_().filter(function (c) { return c.name !== cls; }));
      return { ok: true, removed: num_(removed) };
    });
  }

  if (sub === 'setLock') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var numStr = str_(req.lessonNum);
    var on = req.on ? 1 : 0;
    return withLock_(function () {
      var locks = getLocks_(cls);
      var cur = locks[numStr] || { u: 0, on: 0 };
      if (on && !num_(cur.u)) cur.u = tmin_();  // first unlock = delivered date (never reset)
      cur.on = on;
      locks[numStr] = cur;
      jset_(sp_(), 'lock:' + cls, locks);
      return { ok: true, u: num_(cur.u), on: num_(cur.on) };
    });
  }

  if (sub === 'locks') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var lk = getLocks_(cls);
    var out = {};
    Object.keys(lk).forEach(function (k) { out[k] = { on: num_(lk[k].on), u: num_(lk[k].u) }; });
    return { ok: true, locks: out, year: str_(classYear_(cls)) };
  }

  if (sub === 'dashboard') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var year2 = classYear_(cls);
    var man2 = null;
    try { man2 = yearManifest_(year2); } catch (e) {}
    var cfg2 = getCfg_(cls);
    var locks2 = getLocks_(cls);
    var team2 = getTeam_(cls);
    var rows = allPupils_(cls).map(function (r) {
      var L = {};
      Object.keys(r.L || {}).forEach(function (k) {
        L[k] = (r.L[k] || []).map(function (v, i) { return (i === 2 || i === 3 || i === 4 || i === 8) ? str_(v) : num_(v); });
      });
      return {
        email: str_(r.email), name: str_(r.n), codename: str_(r.cn), xp: num_(r.xp),
        groupId: str_(r.g || ''), joined: num_(r.j), L: L,
        absence: man2 ? absenceFor_(cls, r, locks2, man2, num_(cfg2.absDays)) : []
      };
    });
    rows.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    var locksOut2 = {};
    Object.keys(locks2).forEach(function (k) { locksOut2[k] = { on: num_(locks2[k].on), u: num_(locks2[k].u) }; });
    return { ok: true, year: str_(year2), rows: rows, locks: locksOut2,
      cfg: { lb: cfg2.lb, absDays: num_(cfg2.absDays), cover: num_(cfg2.cover.on), coverLesson: str_(cfg2.cover.lesson), pairing: { on: num_(cfg2.pairing.on) } },
      groups: team2.groups.map(function (g) { return { id: str_(g.id), name: str_(g.name) }; }),
      reveal: !!team2.reveal };
  }

  /* Teacher brief for a lesson (staff-only by passcode). Authored as
     content-src teacherBrief, packed INSIDE the encrypted keys blob as
     "_brief" so the public JSON never carries the run sheet. */
  if (sub === 'brief') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var briefYear = classYear_(cls);
    var briefLessonId = str_(req.lessonId);
    var briefEntry = lessonEntry_(briefYear, briefLessonId);
    if (!briefEntry || !briefEntry.file) return { ok: false, error: 'unknown-lesson' };
    var briefKeys;
    try { briefKeys = lessonKeys_(briefYear, briefLessonId); } catch (e) { return { ok: false, error: 'no-brief' }; }
    var brief = briefKeys._brief;
    if (!brief) return { ok: false, error: 'no-brief' };
    return {
      ok: true, num: str_(briefEntry.num), title: str_(briefEntry.title),
      why: str_(brief.why || ''),
      minuteByMinute: (brief.minuteByMinute || []).map(str_),
      pitfalls: (brief.pitfalls || []).map(str_)
    };
  }

  /* Decrypted key info for the misconception dashboard (staff-only by passcode). */
  if (sub === 'keyinfo') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var lessonId2 = str_(req.lessonId);
    var keys2 = lessonKeys_(classYear_(cls), lessonId2);
    var out2 = {};
    Object.keys(keys2).forEach(function (id) {
      var k = keys2[id];
      if (k && typeof k.a === 'number') out2[id] = { a: num_(k.a), mis: (k.mis || []).map(str_), explain: str_(k.explain || '') };
    });
    return { ok: true, items: out2 };
  }

  if (sub === 'absenceDismiss') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var email2 = str_(req.email).toLowerCase();
    var num2 = str_(req.lessonNum);
    var rec2 = readPupil_(cls, email2);
    if (!rec2) return { ok: false, error: 'no-pupil' };
    var a2 = larr_(rec2, num2);
    a2[7] = num_(a2[7]) | 1;
    writePupil_(cls, email2, rec2);
    return { ok: true };
  }

  if (sub === 'setConfig') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      var cfg3 = getCfg_(cls);
      if (req.lb) {
        var mode = str_(req.lb.mode);
        if (['off', 'team', 'public'].indexOf(mode) !== -1) cfg3.lb.mode = mode;
        var basis = str_(req.lb.basis);
        if (['xp', 'completion'].indexOf(basis) !== -1) cfg3.lb.basis = basis;
        var names = str_(req.lb.names);
        if (['codename', 'real'].indexOf(names) !== -1) cfg3.lb.names = names;
        cfg3.lb.topN = Math.max(0, Math.min(50, num_(req.lb.topN)));
      }
      if (req.absDays != null) cfg3.absDays = Math.max(1, Math.min(20, num_(req.absDays)));
      if (req.pairing != null) cfg3.pairing = { on: num_(req.pairing.on) ? 1 : 0 };
      jset_(sp_(), 'cfg:' + cls, cfg3);
      return { ok: true };
    });
  }

  if (sub === 'setCover') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      var cfg4 = getCfg_(cls);
      cfg4.cover = { on: req.on ? 1 : 0, lesson: str_(req.lessonId || ''), ts: tmin_() };
      jset_(sp_(), 'cfg:' + cls, cfg4);
      return { ok: true };
    });
  }

  /* Teams (Isotope groups pattern: hidden by default, teacher reveal). */
  if (sub === 'createGroup') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      var team3 = getTeam_(cls);
      var id = 'g' + (team3.groups.length + 1) + '-' + Math.floor(Math.random() * 9000 + 1000);
      team3.groups.push({ id: id, name: str_(req.name || 'Team ' + (team3.groups.length + 1)).slice(0, 24) });
      jset_(sp_(), 'team:' + cls, team3);
      return { ok: true, id: str_(id) };
    });
  }
  if (sub === 'assignPupil') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var email3 = str_(req.email).toLowerCase();
    var rec3 = readPupil_(cls, email3);
    if (rec3) { rec3.g = str_(req.groupId || ''); writePupil_(cls, email3, rec3); }
    return { ok: true };
  }
  if (sub === 'autoGroup') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var n = Math.min(10, Math.max(2, num_(req.n) || 4));
    var names = ['Lovelace', 'Hopper', 'Hamilton', 'Johnson', 'Clarke', 'Easley', 'Wilkes', 'Shaw', 'Coombs', 'Spence'];
    return withLock_(function () {
      var team4 = { groups: [], reveal: false };
      for (var gi2 = 0; gi2 < n; gi2++) team4.groups.push({ id: 'g' + (gi2 + 1), name: names[gi2] });
      jset_(sp_(), 'team:' + cls, team4);
      var pupils2 = allPupils_(cls).filter(function (r) { return str_(r.n); });
      shuffle_(pupils2);
      pupils2.forEach(function (r, idx) {
        var rr = readPupil_(cls, str_(r.email));
        if (rr) { rr.g = 'g' + ((idx % n) + 1); writePupil_(cls, str_(r.email), rr); }
      });
      return { ok: true };
    });
  }
  if (sub === 'setReveal') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var team5 = getTeam_(cls);
    team5.reveal = !!req.revealed;
    jset_(sp_(), 'team:' + cls, team5);
    return { ok: true };
  }
  if (sub === 'deleteGroup') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      var team6 = getTeam_(cls);
      team6.groups = team6.groups.filter(function (g) { return str_(g.id) !== str_(req.groupId); });
      jset_(sp_(), 'team:' + cls, team6);
      allPupils_(cls).forEach(function (r) {
        if (str_(r.g) === str_(req.groupId)) {
          var rr2 = readPupil_(cls, str_(r.email));
          if (rr2) { rr2.g = ''; writePupil_(cls, str_(r.email), rr2); }
        }
      });
      return { ok: true };
    });
  }

  /* ---------- pairing lens (section 12): live queue / pairs / laggards ---------- */
  if (sub === 'pairs') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var plLessonId = str_(req.lessonId);
    var plYear = classYear_(cls);
    var plNum = lessonNum_(plYear, plLessonId);
    var plCfg = getCfg_(cls);
    var plReg = pairReg_(cls, plLessonId);
    var plQ = cGet_(pqCacheKey_(cls, plLessonId), { q: [], stage: 0 });
    var nameOf = {};
    allPupils_(cls).forEach(function (r) { nameOf[str_(r.email)] = str_(r.n); });
    var plNow = tsec_();
    var plAssigned = {};
    var pids2 = Object.keys(plReg.P);
    var chAll = {};
    try { chAll = cache_().getAll(pids2.map(function (p) { return chCacheKey_(p); })) || {}; } catch (e) {}
    var pairsOut = pids2.map(function (p) {
      var P = plReg.P[p];
      (P.m || []).forEach(function (e) { plAssigned[str_(e)] = 1; });
      var msgs = 0, lastMsg = '';
      try {
        var chRaw = chAll[chCacheKey_(p)];
        if (chRaw) {
          var ch2 = JSON.parse(chRaw);
          (ch2.ev || []).forEach(function (e2) {
            if (str_(e2[2]) === 'msg') { msgs++; lastMsg = str_(P.cn[num_(e2[1])]) + ': ' + str_(e2[3]); }
          });
        }
      } catch (e) {}
      return {
        pid: str_(p), trio: num_(P.trio), done: num_(P.done), t: num_(P.t),
        cn: (P.cn || []).map(function (c) { return str_(c); }),
        names: (P.m || []).map(function (e) { return str_(nameOf[str_(e)] || e); }),
        msgs: num_(msgs), last: str_(lastMsg).slice(0, 80)
      };
    });
    (plReg.solo || []).forEach(function (e) { plAssigned[str_(e)] = 1; });
    var queueOut = (plQ.q || []).filter(function (w) { return plNow - num_(w.p) <= PAIR_QUEUE_STALE_S; })
      .map(function (w) {
        plAssigned[str_(w.e)] = 1;
        return { name: str_(nameOf[str_(w.e)] || w.e), cn: str_(w.cn), wait: num_(plNow - num_(w.t)), email: str_(w.e) };
      });
    var plPresent = presentOn_(cls, plNum);
    var laggards = [];
    Object.keys(plPresent).forEach(function (e) {
      if (plAssigned[str_(e)]) return;
      if (plPresent[e].ci > num_(plQ.stage)) return;
      laggards.push({ name: str_(nameOf[str_(e)] || e), email: str_(e), ci: num_(plPresent[e].ci), cc: num_(plPresent[e].cc) });
    });
    laggards.sort(function (a, b) { return a.ci - b.ci; });
    return {
      ok: true, on: num_(plCfg.pairing.on), stage: num_(plQ.stage),
      present: num_(Object.keys(plPresent).length),
      queue: queueOut, pairs: pairsOut, laggards: laggards,
      solo: (plReg.solo || []).map(function (e) { return { name: str_(nameOf[str_(e)] || e), email: str_(e) }; })
    };
  }

  if (sub === 'pairTranscript') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var ptPid = str_(req.pid);
    var ptReg = pairReg_(cls, str_(req.lessonId));
    var ptP = ptReg.P[ptPid];
    if (!ptP) return { ok: false, error: 'unknown-pair' };
    var ptCh = cGet_(chCacheKey_(ptPid), null);
    if (ptCh && (ptCh.ev || []).length) {
      var lines = ptCh.ev.filter(function (e) { return str_(e[2]) === 'msg'; }).map(function (e) {
        return { who: str_(ptP.cn[num_(e[1])]), text: str_(e[3]), t: num_(e[4]) };
      });
      return { ok: true, live: true, cn: ptP.cn, names: (ptP.m || []).map(function (e) { return str_(e); }), lines: lines };
    }
    var ptChat = jget_(sp_(), chatKey_(cls, str_(req.lessonId)), {});
    var ptStored = ptChat[ptPid];
    if (ptStored) return { ok: true, live: false, cn: ptStored.cn, names: ptStored.n, tx: str_(ptStored.tx) };
    return { ok: true, live: false, cn: ptP.cn, names: [], tx: '' };
  }

  if (sub === 'pairRelease') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      var prReg = pairReg_(cls, str_(req.lessonId));
      var prEmail = str_(req.email).toLowerCase();
      if (pairOf_(prReg, prEmail)) return { ok: false, error: 'already-paired' };
      if (prReg.solo.indexOf(prEmail) === -1) prReg.solo.push(prEmail);
      jset_(sp_(), pairRegKey_(cls, str_(req.lessonId)), prReg);
      var prQ = cGet_(pqCacheKey_(cls, str_(req.lessonId)), { q: [], stage: 0 });
      prQ.q = (prQ.q || []).filter(function (w) { return str_(w.e) !== prEmail; });
      cPut_(pqCacheKey_(cls, str_(req.lessonId)), prQ, 21600);
      return { ok: true };
    });
  }

  /* Force-match whatever is queued right now (teacher unblocking the room):
     3 waiting -> trio, otherwise FIFO pairs, a final loner -> solo. */
  if (sub === 'pairForce') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      var pfReg = pairReg_(cls, str_(req.lessonId));
      var pfQ = cGet_(pqCacheKey_(cls, str_(req.lessonId)), { q: [], stage: 0 });
      var pfNow = tsec_();
      pfQ.q = (pfQ.q || []).filter(function (w) { return pfNow - num_(w.p) <= PAIR_QUEUE_STALE_S; });
      var made = 0;
      while (pfQ.q.length >= 2) {
        var take = pfQ.q.length === 3 ? 3 : 2;
        var formed = pfQ.q.splice(0, take);
        var pid2 = 'p' + tmin_() + '-' + Math.floor(Math.random() * 10000);
        pfReg.P[pid2] = {
          m: formed.map(function (w) { return str_(w.e); }),
          cn: callsignFill_(formed),
          t: tmin_(), trio: take === 3 ? 1 : 0, done: 0, rv: 0
        };
        cPut_(chCacheKey_(pid2), { seq: 0, ev: [], ls: [] }, 21600);
        made++;
      }
      if (pfQ.q.length === 1) {
        var lone2 = pfQ.q.splice(0, 1)[0];
        if (pfReg.solo.indexOf(str_(lone2.e)) === -1) pfReg.solo.push(str_(lone2.e));
      }
      jset_(sp_(), pairRegKey_(cls, str_(req.lessonId)), pfReg);
      cPut_(pqCacheKey_(cls, str_(req.lessonId)), pfQ, 21600);
      return { ok: true, made: num_(made) };
    });
  }

  /* Panic button: dissolve all pairs + queue for the stage so it can re-run.
     Stored transcripts are kept (audit); live channels simply expire. */
  if (sub === 'pairReset') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      sp_().deleteProperty(pairRegKey_(cls, str_(req.lessonId)));
      cPut_(pqCacheKey_(cls, str_(req.lessonId)), { q: [], stage: 0 }, 60);
      return { ok: true };
    });
  }

  return { ok: false, error: 'unknown-sub' };
}

/* ==================== NIGHTLY ARCHIVAL (the pre-scale housekeeping robot) ====================
   The shared ScriptProperties store is capped at 500KB script-wide (review
   finding, CRITICAL). This sweep keeps it lean forever: once a lesson is
   COMPLETED and ARCHIVE_AFTER_DAYS old, its verbose fields (detail ledger,
   comment) move to the "KS3 DT - Yearly Archive" Google Sheet in the owner's
   Drive - same Workspace tenancy, write-VERIFY-then-trim per class (red team
   #6). Runs as the OWNER via a time-driven trigger added in the editor UI
   (no scriptapp scope in the manifest; pupils never see a standing-access
   consent line). Google emails the owner automatically if a trigger run
   throws; the staff Classes tab shows the last-run summary either way.

   Owner one-time setup: run setupArchive() in the editor, then add the
   trigger: archiveSweep / time-driven / day timer / 2-3am (see recipe). */
var ARCHIVE_AFTER_DAYS = 28; // completed lessons keep full live detail this long
var ARCHIVE_HEADERS = ['archivedAt', 'class', 'email', 'name', 'codename', 'lesson', 'xp',
  'detail', 'exitChosen', 'selfEval', 'comment', 'activeMin', 'recapRight', 'recapTotal', 'lastActive'];
var CHAT_HEADERS = ['archivedAt', 'class', 'lesson', 'pair', 'members', 'names',
  'codenames', 'messages', 'transcript', 'formedAt'];

/* The pairing chat's audit tab (section 12). Self-heals: created on first use
   so a sheet made before the chat feature existed upgrades itself. */
function chatSheet_(ss) {
  var sh = ss.getSheetByName('Chat Archive');
  if (!sh) {
    sh = ss.insertSheet('Chat Archive');
    sh.appendRow(CHAT_HEADERS);
  }
  return sh;
}

function setupArchive() {
  var sp = sp_();
  var id = sp.getProperty('ARCHIVE_SHEET_ID');
  if (id) { Logger.log('Archive already set up: sheet ' + id); return; }
  var ss = SpreadsheetApp.create('KS3 DT - Yearly Archive');
  ss.getSheets()[0].setName('Archive');
  ss.getSheets()[0].appendRow(ARCHIVE_HEADERS);
  chatSheet_(ss);
  sp.setProperty('ARCHIVE_SHEET_ID', ss.getId());
  Logger.log('Archive sheet created: ' + ss.getUrl());
  Logger.log('NOW add the nightly trigger: Triggers > Add Trigger > archiveSweep > time-driven > day timer > 2am-3am.');
}

function archiveSweep() {
  var meta = archiveSweep_();
  // throwing makes Google's own trigger-failure email fire for the owner
  if (!meta.ok) throw new Error('KS3 DT archive sweep failed: ' + meta.error);
}

function archiveSweep_() {
  var sp = sp_();
  var meta = { t: tmin_(), rows: 0, pupils: 0, ok: true, error: '' };
  try {
    var id = sp.getProperty('ARCHIVE_SHEET_ID');
    if (!id) throw new Error('ARCHIVE_SHEET_ID not set - run setupArchive() once in the editor');
    var ss = SpreadsheetApp.openById(id);
    var sheet = ss.getSheets()[0];
    var cutoff = tmin_() - ARCHIVE_AFTER_DAYS * 1440;
    var classes = getClasses_();
    for (var ci = 0; ci < classes.length; ci++) {
      var cls = classes[ci].name;
      var pupils = allPupils_(cls); // lock-free snapshot
      var rows = [];
      var emails = [];
      for (var pi = 0; pi < pupils.length; pi++) {
        var rec = pupils[pi];
        var any = false;
        Object.keys(rec.L || {}).forEach(function (numStr) {
          var a = rec.L[numStr];
          if (!a || num_(a[0]) !== 2) return;   // completed lessons only
          if (num_(a[5]) > cutoff) return;      // too recent - teacher still reviewing detail
          if (num_(a[7]) & 4) return;           // already archived
          rows.push([new Date(), cls, str_(rec.email), str_(rec.n), str_(rec.cn), str_(numStr),
            num_(a[1]), str_(a[2]), str_(a[3]), str_(a[4]), str_(a[8]),
            num_(a[6]), num_(a[9]), num_(a[10]), tminToDate_(num_(a[5]))]);
          any = true;
        });
        if (any) emails.push(str_(rec.email));
      }
      if (!rows.length) continue;
      // WRITE - VERIFY - only then TRIM (never delete before a confirmed copy)
      var before = sheet.getLastRow();
      sheet.getRange(before + 1, 1, rows.length, ARCHIVE_HEADERS.length).setValues(rows);
      SpreadsheetApp.flush();
      if (sheet.getLastRow() !== before + rows.length) throw new Error('write verify failed for class ' + cls);
      meta.rows += rows.length;
      withLock_(function () {
        for (var ei = 0; ei < emails.length; ei++) {
          var fresh = readPupil_(cls, emails[ei]); // re-read: never clobber tonight's live activity
          if (!fresh) continue;
          Object.keys(fresh.L || {}).forEach(function (numStr) {
            var a = fresh.L[numStr];
            if (!a || num_(a[0]) !== 2) return;
            if (num_(a[5]) > cutoff) return;
            if (num_(a[7]) & 4) return;
            a[2] = 'arch';           // ledger swept (apiSaveEvent seals archived lessons)
            a[8] = '';               // comment swept
            a[7] = num_(a[7]) | 4;   // archived bit
          });
          if (tryWritePupil_(cls, emails[ei], fresh)) meta.pupils++;
        }
        return true;
      });
    }
    /* ---------- chat transcript sweep (section 12): 7-day horizon ----------
       A chat:<cls>:<lessonId> key sweeps once its NEWEST pair is old enough -
       one row per pair to the Chat Archive tab, write-VERIFY, then the store
       key (and its pair: registry twin) is deleted. Same discipline as above:
       never delete before a confirmed copy. */
    var chatCutoff = tmin_() - CHAT_ARCHIVE_AFTER_DAYS * 1440;
    var allProps = sp.getProperties();
    Object.keys(allProps).forEach(function (k) {
      if (k.indexOf('chat:') !== 0) return;
      var chat;
      try { chat = JSON.parse(allProps[k]); } catch (e) { return; }
      var pids = Object.keys(chat || {});
      if (!pids.length) { sp.deleteProperty(k); return; }
      var newest = 0;
      pids.forEach(function (p) { if (num_(chat[p].t) > newest) newest = num_(chat[p].t); });
      if (newest > chatCutoff) return;
      var parts = k.split(':'); // chat:<cls>:<lessonId>
      var cCls = str_(parts[1]), cLesson = parts.slice(2).join(':');
      var chatRows = pids.map(function (p) {
        var d = chat[p];
        return [new Date(), cCls, cLesson, str_(p),
          (d.m || []).join(' | '), (d.n || []).join(' | '), (d.cn || []).join(' | '),
          num_((d.c || []).reduce(function (s, x) { return s + num_(x); }, 0)),
          str_(d.tx), tminToDate_(num_(d.t))];
      });
      var chSheet = chatSheet_(ss);
      var chBefore = chSheet.getLastRow();
      chSheet.getRange(chBefore + 1, 1, chatRows.length, CHAT_HEADERS.length).setValues(chatRows);
      SpreadsheetApp.flush();
      if (chSheet.getLastRow() !== chBefore + chatRows.length) throw new Error('chat write verify failed for ' + k);
      sp.deleteProperty(k);
      sp.deleteProperty('pair:' + cCls + ':' + cLesson);
      meta.chatRows = num_(meta.chatRows) + chatRows.length;
    });
    // pair: registries whose chat twin never materialised (all-solo stage, or a
    // store-full transcript skip) still expire on the same horizon
    Object.keys(allProps).forEach(function (k) {
      if (k.indexOf('pair:') !== 0) return;
      var reg;
      try { reg = JSON.parse(allProps[k]); } catch (e) { sp.deleteProperty(k); return; }
      var newest2 = 0;
      Object.keys((reg && reg.P) || {}).forEach(function (p) { if (num_(reg.P[p].t) > newest2) newest2 = num_(reg.P[p].t); });
      if (!Object.keys((reg && reg.P) || {}).length && (reg.solo || []).length) newest2 = newest2 || 0;
      if (newest2 > chatCutoff) return;
      if (sp.getProperty('chat:' + k.slice(5))) return; // twin still live - swept together above
      sp.deleteProperty(k);
    });
  } catch (e) {
    meta.ok = false;
    meta.error = str_(e && e.message || e);
  }
  jset_(sp, 'archiveMeta', meta);
  return meta;
}

/* ---------- shared shuffle ---------- */
function shuffle_(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
}
