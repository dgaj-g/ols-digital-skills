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
 *    p:<class>:<email>  lean pupil record {n, cn, j, xp, g, L:{"<num>": Larr}}
 *      Larr positions: 0 status(0/1/2)  1 xp  2 detail  3 exitChosen  4 selfEval
 *                      5 lastTmin  6 activeMin  7 flags(1=absDismiss 2=catchup)
 *                      8 comment  9 recapRight  10 recapTotal
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
function meaningful_(a) { return !!a && (str_(a[3]) !== '' || str_(a[2]) !== '' || num_(a[6]) >= 3); }
function absenceFor_(cls, rec, locks, manifest, absDays) {
  var flags = [];
  var lessons = (manifest && manifest.lessons) || [];
  for (var i = 0; i < lessons.length; i++) {
    var le = lessons[i];
    if (le.absenceInferenceEligible === false) continue;
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

  var hist = jget_(up_(), 'recap', { threads: {}, seen: {} });
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
  var want = [['a', 2], ['b', 2], ['c', 1]];
  for (var w = 0; w < want.length && chosen.length < 5; w++) {
    var take = pools[want[w][0]].splice(0, want[w][1]);
    for (var t2 = 0; t2 < take.length && chosen.length < 5; t2++) chosen.push(take[t2]);
  }
  var rest = pools.a.concat(pools.b, pools.c);
  for (var r2 = 0; r2 < rest.length && chosen.length < Math.min(5, items.length); r2++) chosen.push(rest[r2]);
  if (chosen.length < 3) { // never a 1-2 question recap if more exist
    for (var r3 = 0; r3 < items.length && chosen.length < Math.min(3, items.length); r3++) {
      if (chosen.indexOf(items[r3]) === -1) chosen.push(items[r3]);
    }
  }

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
  jset_(up_(), 'rs:' + curNum, session);
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
  var session = jget_(up_(), 'rs:' + curNum, null);
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
  var hist = jget_(up_(), 'recap', { threads: {}, seen: {} });
  var day = today_();
  hist.seen[str_(req.itemId)] = day;
  if (entry.thread) {
    var t = hist.threads[entry.thread] || { s: 0, d: -1, r: false };
    if (correct) { if (t.d !== day) { t.s = num_(t.s) + 1; t.d = day; } if (t.s >= 3) t.r = true; }
    else { t.s = 0; t.d = day; t.r = false; }
    hist.threads[entry.thread] = t;
  }
  jset_(up_(), 'recap', hist);

  // Roll accuracy into the lean record (dashboard stuck-pupil signal).
  var rec = readPupil_(cls, email);
  if (rec) {
    var a = larr_(rec, curNum);
    a[9] = num_(a[9]) + (correct ? 1 : 0);
    a[10] = num_(a[10]) + 1;
    if (num_(a[0]) < 1) a[0] = 1;
    a[5] = tmin_();
    writePupil_(cls, email, rec);
  }
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

/* Vault map served at runtime (never in the public repo); drag stays lag-free
   because the client holds it in memory after one fetch. */
function apiVaultInfo(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var year = classYear_(cls);
  var lessonId = str_(req.lessonId);
  if (!lessonAccessible_(cls, lessonNum_(year, lessonId))) return { ok: false, error: 'locked' };
  var keys = lessonKeys_(year, lessonId);
  var v = keys[str_(req.keyId || 'vault')];
  if (!v) return { ok: false, error: 'no-key' };
  return { ok: true, map: v.map || {}, explain: v.explain || {} };
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
  return order.map(function (k) { return map[k]; }).join(';').slice(0, 220);
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
  var rec = readPupil_(cls, email);
  if (!rec) return { ok: false, error: 'not-joined' };
  var a = larr_(rec, numStr);
  if (num_(a[0]) < 1) a[0] = 1;
  var xpDelta = Math.max(0, Math.min(40, num_(req.xp)));   // server-side cap per event
  if (xpDelta) { a[1] = num_(a[1]) + xpDelta; rec.xp = num_(rec.xp) + xpDelta; }
  if (req.detail != null) a[2] = mergeDetail_(a[2], str_(req.detail).slice(0, 120));
  if (req.minDelta) a[6] = num_(a[6]) + Math.max(0, Math.min(10, num_(req.minDelta)));
  if (req.codename != null) rec.cn = str_(req.codename).slice(0, 40);
  a[5] = tmin_();
  writePupil_(cls, email, rec);
  if (req.draft != null) {
    var draft = str_(JSON.stringify(req.draft));
    if (draft.length < 8000) up_().setProperty('draft:' + numStr, draft);
  }
  return { ok: true, xp: num_(rec.xp) };
}

function apiLoadDraft(req) {
  req = req || {};
  var numStr = str_((req || {}).lessonNum || '');
  var raw = up_().getProperty('draft:' + numStr);
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
  var rec = readPupil_(cls, email);
  if (!rec) return { ok: false, error: 'not-joined' };
  var a = larr_(rec, numStr);
  a[0] = 2;
  a[3] = chosenStr;
  a[4] = str_(se.conf || '').slice(0, 6) + '|' + str_(se.diff || '');
  a[8] = str_(se.comment || '').slice(0, 80);
  a[5] = tmin_();
  var xpDelta = 10;
  a[1] = num_(a[1]) + xpDelta; rec.xp = num_(rec.xp) + xpDelta;
  writePupil_(cls, email, rec);
  return { ok: true, right: num_(right), total: num_(exitItems.length), feedback: fb, xp: num_(rec.xp) };
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
  var rec = readPupil_(cls, email);
  if (!rec) return { ok: false, error: 'not-joined' };
  var a = larr_(rec, numStr);
  a[2] = mergeDetail_(a[2], 'bl=' + right + '/' + ids.length + '|' + chosen);
  a[5] = tmin_();
  if (num_(a[0]) < 1) a[0] = 1;
  writePupil_(cls, email, rec);
  return { ok: true }; // deliberately no marks: a diagnostic, not a quiz
}

function apiCatchup(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var numStr = str_(req.lessonNum || '');
  var rec = readPupil_(cls, email);
  if (!rec) return { ok: false, error: 'not-joined' };
  var a = larr_(rec, numStr);
  a[7] = num_(a[7]) | 2;
  a[5] = tmin_();
  writePupil_(cls, email, rec);
  return { ok: true };
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
    return {
      ok: true, me: str_(me),
      classes: reg.map(function (c) {
        return { name: str_(c.name), owner: str_(c.owner), year: str_(c.year), created: str_(c.created), pupils: num_(counts[c.name] || 0) };
      })
    };
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
      cfg: { lb: cfg2.lb, absDays: num_(cfg2.absDays), cover: num_(cfg2.cover.on), coverLesson: str_(cfg2.cover.lesson) },
      groups: team2.groups.map(function (g) { return { id: str_(g.id), name: str_(g.name) }; }),
      reveal: !!team2.reveal };
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

  return { ok: false, error: 'unknown-sub' };
}

/* ---------- shared shuffle ---------- */
function shuffle_(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
}
