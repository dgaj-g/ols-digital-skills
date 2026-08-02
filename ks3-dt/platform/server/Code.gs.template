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
/* CLASS OWNER (30 Jul 2026 - Damien's rule, supersedes the earlier "exclude all
   staff" proposal). Anyone who joins a class can be paired EXCEPT the teacher
   who OWNS it. She must be able to sit her own lesson as a pupil - the brief
   tells her to, and it is the single most useful preparation there is - without
   taking a real pupil's partner slot, without being paired WITH a pupil, and
   without her own answers entering her class's roster, baseline or absence.
   Staff who join somebody else's class are ordinary participants. */
function classOwner_(cls) {
  var reg = getClasses_();
  for (var i = 0; i < reg.length; i++) if (reg[i].name === cls) return str_(reg[i].owner);
  return '';
}
function isClassOwner_(cls, email) {
  var ow = str_(classOwner_(cls)).toLowerCase();
  var me = str_(email).toLowerCase();
  return !!ow && !!me && ow === me;
}
/* HEAD OF DEPARTMENT (30 Jul 2026 - Damien's requirement, built to Claude's
   recommended shape and agreed by him). He needs control of EVERY class so he
   can unlock a lesson on behalf of a teacher who is off sick and could not
   leave cover. Deliberately NOT modelled as co-ownership: `owner` must keep
   meaning "the teacher of THIS class", because isClassOwner_ also decides who
   is excluded from pairing and from class statistics. A HoD is therefore a
   separate role that can MANAGE any class without being counted as anybody's
   class teacher.
   Set up: Script Property `hods` = JSON array of lower-case emails, e.g.
   ["dgartland123@c2ken.net"]. Same place as `staffPasscode`. */
function hodList_() {
  var raw = jget_(sp_(), 'hods', []);
  if (!raw || !raw.length) return [];
  return raw.map(function (e) { return str_(e).trim().toLowerCase(); }).filter(function (e) { return !!e; });
}
function isHod_(email) {
  var me = str_(email).trim().toLowerCase();
  if (!me) return false;
  return hodList_().indexOf(me) !== -1;
}
/* Who may MANAGE a class: unlock/re-lock its lessons, reset one, run cover,
   and see it in the register. The class's own teacher, or a HoD. */
function canManageClass_(cls, email) {
  return isClassOwner_(cls, email) || isHod_(email);
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

/* ---------- sharded store values (audit blocker B-01, 27 Jul 2026) ----------
   Apps Script caps a SINGLE ScriptProperties value at 9,216 bytes, and a write
   that passes it THROWS. Two stores grow with class size: Press Night's gallery
   (section 14) and the monitored-chat transcripts (section 12). Measured before
   the fix: 30 studios alone were 6.3-8.2 KB, and the 60 reviews Lesson 5
   requires took the single gal: value to 21-38 KB - 2.3x to 4.1x the ceiling.
   Every write after about the fifth review failed, permanently, for the rest of
   the class. The preview never showed it because localStorage has no per-value
   cap (dev-server.js now enforces the real one).

   Both stores are now SHARDED. A tiny HEAD key keeps the sequence counter and
   the shard COUNTS; the payload lives in numbered shards under sibling
   prefixes:

     gal:<cls>:<lesson>       head    {v:2, seq, ns, nr}
     gals:<cls>:<lesson>:<i>  studios {email: studio}
     galr:<cls>:<lesson>:<i>  reviews [review, ...]
     chat:<cls>:<lesson>      head    {v:2, nc}
     chats:<cls>:<lesson>:<i> transcripts {pid: transcript}

   The sibling prefixes deliberately do NOT match the head's own prefix test
   ('gals:'.indexOf('gal:') !== 0), so the archive sweep's key scan still selects
   exactly one key per class-lesson and shards are swept with their head.

   Write order is always SHARD FIRST, then the head. A lock-free reader that
   caught a stale head therefore misses at most the newest shard and can never
   follow a dangling reference; readers also probe one shard PAST the head's
   count, which closes even that window. Reads stay lock-free (tnAgg_
   discipline); every write runs inside withLock_. */
var PROP_VALUE_MAX_ = 9216;   // Apps Script's hard per-value ceiling
var SHARD_BYTES_ = 7000;      // roll to a fresh shard once a value passes this
var SHARD_INPLACE_MAX_ = 8600; // an in-place edit past this moves the entry out
function shardKey_(base, i) { return base + ':' + i; }

/* Read a sharded LIST back in shard order (0..n inclusive - see the probe note
   above). Lock-free. */
function shardList_(base, n) {
  var out = [], i, v;
  for (i = 0; i <= n; i++) {
    v = jget_(sp_(), shardKey_(base, i), null);
    if (v && v.length) out = out.concat(v);
  }
  return out;
}

/* Read a sharded MAP back as one object. Lock-free. */
function shardMap_(base, n) {
  var out = {}, i, v;
  for (i = 0; i <= n; i++) {
    v = jget_(sp_(), shardKey_(base, i), null);
    if (!v) continue;
    Object.keys(v).forEach(function (k) { out[k] = v[k]; });
  }
  return out;
}

/* Append one item to a sharded LIST; returns the new shard count. Under lock.
   The over-budget body is never written: on a roll the fresh shard gets the new
   item and the full shard is left exactly as it already was on disk. */
function shardPush_(base, n, item) {
  var idx = n > 0 ? n - 1 : 0;
  var cur = jget_(sp_(), shardKey_(base, idx), null);
  if (!(cur instanceof Array)) cur = [];
  cur.push(item);
  var body = JSON.stringify(cur);
  if (body.length > SHARD_BYTES_ && cur.length > 1) {
    idx += 1;
    sp_().setProperty(shardKey_(base, idx), JSON.stringify([item]));
  } else {
    sp_().setProperty(shardKey_(base, idx), body);
  }
  return idx + 1;
}

/* Insert or update one entry of a sharded MAP; returns the new shard count.
   Under lock. An existing entry is rewritten in its own shard unless that would
   take the value near the ceiling, in which case it is lifted out and re-appended
   (delete-then-append, never a duplicate). */
function shardPut_(base, n, key, val) {
  var sp = sp_(), i, v, body;
  for (i = 0; i < n; i++) {
    v = jget_(sp, shardKey_(base, i), null);
    if (!v || v[key] === undefined) continue;
    v[key] = val;
    body = JSON.stringify(v);
    if (body.length <= SHARD_INPLACE_MAX_) { sp.setProperty(shardKey_(base, i), body); return n; }
    delete v[key];                                     // lift out, then fall through to append
    sp.setProperty(shardKey_(base, i), JSON.stringify(v));
    break;
  }
  var idx = n > 0 ? n - 1 : 0;
  var obj = jget_(sp, shardKey_(base, idx), null) || {};
  obj[key] = val;
  body = JSON.stringify(obj);
  if (body.length > SHARD_BYTES_ && Object.keys(obj).length > 1) {
    idx += 1;
    var fresh = {};
    fresh[key] = val;
    sp.setProperty(shardKey_(base, idx), JSON.stringify(fresh));
  } else {
    sp.setProperty(shardKey_(base, idx), body);
  }
  return idx + 1;
}

/* Edit items of a sharded LIST in place (moderation flags). Rewrites only the
   shards that actually changed. Under lock. */
function shardEdit_(base, n, matchFn, editFn) {
  var sp = sp_(), i, j, v, hit = false;
  for (i = 0; i <= n; i++) {
    v = jget_(sp, shardKey_(base, i), null);
    if (!(v instanceof Array)) continue;
    var touched = false;
    for (j = 0; j < v.length; j++) {
      if (matchFn(v[j])) { editFn(v[j]); touched = true; hit = true; }
    }
    if (touched) sp.setProperty(shardKey_(base, i), JSON.stringify(v));
  }
  return hit;
}

/* Delete every shard of a base (plus a couple past the count, so an orphan left
   by a head write that never landed is cleaned up too). */
function shardDrop_(base, n) {
  var sp = sp_();
  for (var i = 0; i <= n + 2; i++) sp.deleteProperty(shardKey_(base, i));
}
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
/* Pupils for STATISTICS - roster counts, leaderboards, the class baseline and
   absence inference (30 Jul 2026). Identical to allPupils_ but with the class
   OWNER removed, so a teacher who sits her own lesson as a pupil (which the
   brief tells her to do) never pollutes her own class's data. Deliberately NOT
   used by reset or archive: her record still gets cleared and tidied like
   anyone else's. See isClassOwner_. */
function statsPupils_(cls) {
  var ow = str_(classOwner_(cls)).toLowerCase();
  var rows = allPupils_(cls);
  if (!ow) return rows;
  return rows.filter(function (r) { return str_(r.email).toLowerCase() !== ow; });
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
/* Per-class lesson RESET stamps (30 Jul 2026). A pupil's resume position lives
   in her OWN UserProperties, which no teacher can reach, so "put this lesson
   back to the start" cannot be done by deleting anything server-side. Instead
   the teacher stamps the lesson here; each pupil's own client sees a stamp
   newer than her saved draft and starts the lesson fresh. Needed because a
   chunk skipped by accident was otherwise unrecoverable, forever. */
function getResets_(cls) { return jget_(sp_(), 'rst:' + cls, {}); }
function stampReset_(cls, numStr) {
  var r = getResets_(cls);
  r[str_(numStr)] = tmin_();
  jset_(sp_(), 'rst:' + cls, r);
  return r;
}

function getCfg_(cls) {
  var c = jget_(sp_(), 'cfg:' + cls, {});
  if (!c.lb) c.lb = { mode: 'off', basis: 'xp', names: 'codename', topN: 0 };
  if (!c.absDays) c.absDays = 5;
  if (!c.cover) c.cover = { on: 0, lesson: '', ts: 0 };
  if (!c.pairing) c.pairing = { on: 1 }; // auto-pairing default ON (section 12)
  if (!c.tn) c.tn = { mode: 'team' }; // tournament reveal: 'team' totals only (default) | 'public' adds pair scores
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
    /* AUDIT FIX B-05: never infer absence from a lesson that is currently
       LOCKED. The half of this bug that reached pupil records was a teacher
       mis-tapping a cell, seeing it unlock, tapping again to re-lock - and five
       school days later every girl who had (correctly) not opened it being
       flagged absent from a lesson that never happened, with no undo short of
       deleting the class.
       This is coherent, not just defensive: an absence flag exists to ROUTE a
       pupil into catch-up, and catch-up opens the lesson - which a locked lesson
       refuses. Flagging her for a lesson she cannot then open would be an
       instruction she has no way to follow. A delivered lesson's normal resting
       state on this platform is unlocked (that is what makes catch-up work), so
       this costs nothing in the ordinary case. */
    if (!num_(lk.on)) continue;
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
    var pupils = statsPupils_(cls);
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
    resets: getResets_(cls),
    contentVersion: str_(contentVersion_())
  };
}

/* A lesson is accessible once DELIVERED (u set), even if currently re-locked:
   pupils can always revisit; a lock flip never kicks anyone out (decision #10). */
/* AUDIT FIX B-05 (27 Jul 2026): access used to be granted on the delivered
   timestamp ALONE - the lock's own `on` flag was computed and then never read,
   so after the first unlock the toggle was decorative on both layers while the
   staff grid still said "Locked". Reproduced live during the audit: setLock
   on:0 returned ok and the pupil's very next saveEvent still succeeded.

   Now the `on` flag decides, with one deliberate exception: a pupil who ALREADY
   has a record for this lesson keeps her access. That is the standing "pupils
   who already opened a lesson are never kicked out" rule the staff grid states
   in so many words - a teacher locking up at the end of the hour must not strand
   a girl mid-chunk. A re-lock therefore stops anyone NEW from starting, which is
   what the mis-tap case needs, and undoing the delivery (setLock clear:1) is the
   full undo. */
function lessonAccessible_(cls, numStr, email) {
  var lk = getLocks_(cls)[numStr];
  if (!lk || !num_(lk.u)) return false;
  if (num_(lk.on)) return true;
  if (!email) return false;
  var rec = readPupil_(cls, str_(email));
  return !!(rec && rec.L && rec.L[numStr]);
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
    /* a/explain ride along so the Do-Now marks instantly on the pupil's machine
       (rule 97); apiRecapAnswer still records the result in the background. A
       missing key attaches nothing, so the client falls back to the server for
       that one item rather than judging against a made-up answer. */
    var key = pk.keys[str_(it.id)];
    var row = { id: str_(it.id), topic: str_(it.topic), stem: str_(it.stem),
      options: ord.map(function (oi) { return str_(it.options[oi]); }) };
    if (key && typeof key.a === 'number') {
      row.a = ord.indexOf(num_(key.a));
      row.explain = str_(key.explain || '');
    }
    out.push(row);
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
  if (!lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
  var keys = lessonKeys_(year, lessonId);
  var key = keys[str_(req.itemId)];
  if (!key) return { ok: false, error: 'no-key' };
  var choice = num_(req.choice);
  return { ok: true, correct: choice === num_(key.a), correctIdx: num_(key.a), explain: str_(key.explain || '') };
}

/* INSTANT MARKING (Damien, 31 Jul 2026): "it needs fixed, on all lessons on the
   entire platform. sort it out." The lesson's answer key is handed to the
   signed-in pupil's page ONCE, in the background at lesson open, behind exactly
   the gates apiMark applies per tap - so every tap is then checked on her own
   machine with no round trip. His ruling on the trade: the DevTools read-ahead
   risk is negligible for this population, and speed wins (master file rule 97,
   superseding the earlier red-team stance). What still never ships: the teacher
   brief (_brief), vault maps (served as salted hashes by apiVaultInfo), and
   keys tagged x at pack time (the exit check and the baseline exam, whose
   verdicts are deliberately withheld on screen - handing those out would gain
   no speed, so they keep their integrity for free). apiMark stays: it is the
   wifi-blip fallback and the path for pages loaded before this shipped. */
function apiLessonKeys(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var year = classYear_(cls);
  var lessonId = str_(req.lessonId);
  var numStr = lessonNum_(year, lessonId);
  if (!lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
  var keys = lessonKeys_(year, lessonId);
  var out = {};
  Object.keys(keys).forEach(function (id) {
    var k = keys[id];
    if (!k || id === '_brief') return;
    if (k.map) return;
    if (num_(k.x)) return;
    if (typeof k.a !== 'number') return;
    out[id] = { a: num_(k.a), explain: str_(k.explain || '') };
  });
  return { ok: true, keys: out };
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
  if (!lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
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
  if (!lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
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
  if (!lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
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
  if (!lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
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
  if (!lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
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
  if (!lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
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
  var rows = statsPupils_(cls).filter(function (r) { return str_(r.n); }).map(function (r) {
    var doneCount = 0;
    Object.keys(r.L || {}).forEach(function (k) { if (num_((r.L[k] || [])[0]) === 2) doneCount++; });
    return {
      /* DFM 124a (1 Aug 2026, found by driving the board as a pupil): codenames
         are earned at the END of Lesson 1, so a board switched on before that
         showed the whole class as an identical "Agent Unnamed" - and an absent
         pupil stayed that way. A pupil with no codename has no pseudonym to
         protect, so she is listed by her real first name until she earns one. */
      label: (str_(cfg.lb.names) === 'real' || !str_(r.cn))
        ? str_(r.n).split(' ')[0]
        : ('Agent ' + str_(r.cn)),
      v: str_(cfg.lb.basis) === 'completion' ? num_(doneCount) : num_(r.xp),
      me: str_(r.email) === email
    };
  });
  rows.sort(function (a, b) { return b.v - a.v; });
  var topN = num_(cfg.lb.topN);
  if (topN > 0) rows = rows.slice(0, topN);
  return { ok: true, mode: 'public', basis: str_(cfg.lb.basis), rows: rows };
}

/* ==================== REACTION RALLY TOURNAMENT (section 13, L3+) ====================
   Zero new storage: pair scores live on each pupil's lesson detail as rt=<best>
   (written through the normal idempotent apiSaveEvent path when the tournament
   chunk's badge lands), and teams are the existing hidden-groups infra
   (team:<cls> + rec.g + the reveal flag). Aggregation is computed on demand,
   lock-free (dashboard convention): every named pupil's rt counts for HER team. */
function tnAgg_(cls, numStr) {
  var team = getTeam_(cls);
  var totals = {}, submitted = 0, roster = 0, rows = [];
  (team.groups || []).forEach(function (g) { totals[str_(g.id)] = 0; });
  statsPupils_(cls).forEach(function (r) {
    if (!str_(r.n)) return;
    roster++;
    var a = (r.L || {})[numStr];
    if (!a) return;
    var m = /(?:^|;)rt=(\d+)/.exec(str_(a[2]));
    if (!m) return;
    var v = Math.max(0, Math.min(99, num_(m[1])));
    submitted++;
    var g = str_(r.g || '');
    if (totals[g] != null) totals[g] += v;
    rows.push({ n: str_(r.n), v: v, g: g });
  });
  return { team: team, totals: totals, submitted: submitted, roster: roster, rows: rows };
}

/* Pupil read: live submit count while teams stay SEALED; team totals (never
   individual scores) once the teacher fires the reveal. Deliberately NOT gated
   on cfg.lb.mode - the tournament reveal is its own moment, the leaderboard is
   a separate feature. */
function apiTournament(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var numStr = lessonNum_(classYear_(cls), str_(req.lessonId));
  if (!numStr) return { ok: false, error: 'unknown-lesson' };
  var agg = tnAgg_(cls, numStr);
  var out = { ok: true, n: num_(agg.submitted), revealed: !!agg.team.reveal };
  if (agg.team.reveal && (agg.team.groups || []).length) {
    var me = readPupil_(cls, email) || {};
    out.teams = agg.team.groups.map(function (g) {
      return { name: str_(g.name), total: num_(agg.totals[str_(g.id)]), mine: str_(me.g || '') === str_(g.id) ? 1 : 0 };
    });
  }
  return out;
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
function chatSBase_(cls, lessonId) { return 'chats:' + cls + ':' + lessonId; }
/* Head + shards, same shape as the gallery (audit B-01). v1 heads held the
   transcripts inline; they are read in place until the next write moves them. */
function chatHead_(cls, lessonId) {
  var h = jget_(sp_(), chatKey_(cls, lessonId), null) || {};
  var inline = null;
  if (!num_(h.v)) {
    Object.keys(h).forEach(function (k) {
      if (k === 'v' || k === 'nc') return;
      if (!inline) inline = {};
      inline[k] = h[k];
    });
  }
  return { v: num_(h.v), nc: num_(h.nc), oldChat: inline };
}
function chatGet_(cls, lessonId) {
  var h = chatHead_(cls, lessonId);
  var out = shardMap_(chatSBase_(cls, lessonId), h.nc);
  if (h.oldChat) {
    Object.keys(h.oldChat).forEach(function (p) { if (out[p] === undefined) out[p] = h.oldChat[p]; });
  }
  return out;
}
function chatMigrate_(cls, lessonId) {
  var h = chatHead_(cls, lessonId);
  if (!h.oldChat) return h;
  var base = chatSBase_(cls, lessonId), nc = h.nc;
  Object.keys(h.oldChat).forEach(function (p) { nc = shardPut_(base, nc, p, h.oldChat[p]); });
  jset_(sp_(), chatKey_(cls, lessonId), { v: 2, nc: nc });
  return { v: 2, nc: nc, oldChat: null };
}
function pqCacheKey_(cls, lessonId) { return 'ks3dt:pq:' + cls + ':' + lessonId; }
function chCacheKey_(pid) { return 'ks3dt:pch:' + pid; }
function presCacheKey_(cls) { return 'ks3dt:pres:' + cls; }

function pairReg_(cls, lessonId) {
  var reg = jget_(sp_(), pairRegKey_(cls, lessonId), null) || {};
  if (!reg.P) reg.P = {};
  if (!reg.solo) reg.solo = [];
  return reg;
}
/* AUDIT FIX C-11 (27 Jul 2026): pairAny_ finds a pupil's pair EVEN IF it has
   been dissolved by the teacher's Reset; pairOf_ (used by join/send/complete)
   skips dissolved pairs so she is free to be re-matched. The channel poll uses
   pairAny_, which is how a dissolved pupil is TOLD - see apiPairChannel. */
function pairAny_(reg, email) {
  var pids = Object.keys(reg.P);
  for (var i = 0; i < pids.length; i++) {
    var m = reg.P[pids[i]].m || [];
    for (var j = 0; j < m.length; j++) if (str_(m[j]) === email) return { pid: pids[i], mi: j };
  }
  return null;
}
function pairOf_(reg, email) {
  var hit = pairAny_(reg, email);
  if (hit && num_(reg.P[hit.pid].dis)) return null;
  return hit;
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
   pair the last two when E == 2; release solo when E <= 1.
   The CLASS OWNER is excluded throughout (30 Jul 2026): she is never queued,
   never counted in E, and never matched - see isClassOwner_. */
function pairMatch_(cls, lessonId, numStr, stageIdx, reg, q) {
  var nowS = tsec_();
  var owner = str_(classOwner_(cls)).toLowerCase();
  q.q = (q.q || []).filter(function (w) { return nowS - num_(w.p) <= PAIR_QUEUE_STALE_S; });
  /* Defensive: apiPairJoin sends the owner straight to solo so she should never
     reach the queue, but an older cached client could still have queued her.
     Drop her here rather than risk pairing a teacher with a pupil. */
  if (owner) q.q = q.q.filter(function (w) { return str_(w.e).toLowerCase() !== owner; });
  var assigned = {};
  Object.keys(reg.P).forEach(function (pid) {
    if (num_(reg.P[pid].dis)) return;   // dissolved (C-11): its members are free again
    (reg.P[pid].m || []).forEach(function (e) { assigned[str_(e)] = 1; });
  });
  (reg.solo || []).forEach(function (e) { assigned[str_(e)] = 1; });
  var expected = {};
  q.q.forEach(function (w) { expected[str_(w.e)] = 1; });
  var present = presentOn_(cls, numStr);
  Object.keys(present).forEach(function (e) {
    if (assigned[e]) return;
    if (owner && str_(e).toLowerCase() === owner) return; // the owner is never "expected" to pair
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
  if (!numStr || !lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
  var stageIdx = num_(req.stageIdx);
  return withLock_(function () {
    var reg = pairReg_(cls, lessonId);
    var hit = pairOf_(reg, email);
    if (hit) return pairStateFor_(reg, hit);
    if (reg.solo.indexOf(email) !== -1) return { ok: true, state: 'solo' };
    /* The CLASS OWNER never pairs (30 Jul 2026). She is encouraged to sit her
       own lesson as a pupil, so she goes straight to a solo run: she can never
       take a real pupil's partner slot, and no pupil is ever paired with her
       teacher. Staff joining somebody ELSE's class pair normally. */
    if (isClassOwner_(cls, email)) {
      if (reg.solo.indexOf(email) === -1) {
        reg.solo.push(email);
        jset_(sp_(), pairRegKey_(cls, lessonId), reg);
      }
      return { ok: true, state: 'solo' };
    }
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
  /* pairAny_, not pairOf_ (C-11): a pupil whose pair the teacher just dissolved
     is still polling this channel, and this response is the ONLY place she can
     be told. Answering ok:false left her polling a dead channel forever. */
  var hit = pairAny_(reg, email);
  if (!hit || str_(hit.pid) !== str_(req.pid)) return { ok: false, error: 'not-your-pair' };
  if (num_(reg.P[hit.pid].dis)) return { ok: true, dis: 1, seq: num_(req.since), ev: [], live: [], done: 0, rv: 0 };
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
      /* AUDIT FIX B-01 (27 Jul 2026): the transcript store is sharded exactly
         like the gallery. It used to be one value per class-lesson that reached
         ~10 KB at 15 chatty pairs, and its write is inside this swallowing
         try/catch - so the LAST pairs' safeguarding records vanished silently,
         with no error anywhere. */
      var chHead = chatMigrate_(cls, lessonId);
      var chBase = chatSBase_(cls, lessonId);
      var chat = shardMap_(chBase, chHead.nc);
      if (!chat[str_(hit.pid)]) {
        var nc = shardPut_(chBase, chHead.nc, str_(hit.pid), {
          m: (P.m || []).map(function (e) { return str_(e); }),
          cn: (P.cn || []).map(function (c) { return str_(c); }),
          n: names, t: num_(P.t), c: counts, tx: tx
        });
        jset_(sp_(), chatKey_(cls, lessonId), { v: 2, nc: nc });
      }
    } catch (e) {} // transcript is best-effort; the reveal must never fail on it
    return { ok: true, names: names };
  });
}

/* ==================== section 14: Press Night gallery (L5) ====================
   The first cross-pupil CONTENT since pairing: pupils publish a marquee
   listing (studio + game title + how-to-play) and file signed peer reviews
   ("I like... / I wonder...") against other studios. One compact store key
   per class-lesson, gal:<cls>:<lessonId> - appends under withLock_, reads
   lock-free (chat-digest discipline, section 12). Reviews are quota-capped
   per critic (anti-pile-on, Two-Stars-and-a-Wish lineage), rate-limited,
   length-capped, signed with the critic's codename, and teacher-removable
   (admin sub) - a removed review vanishes from the maker's screen on the
   next poll. No pupil email ever crosses the wire: studios travel as opaque
   sids. Swept to the Archive Sheet's Gallery Archive tab on the chat
   horizon. No new OAuth scopes. */
var GAL_TITLE_MAX = 28;        // game title chars
var GAL_HOW_MAX = 90;          // how-to-play chars
var GAL_REVIEW_MAX = 200;      // chars per stem ("I like" / "I wonder")
var GAL_REVIEWS_PER_CRITIC = 3; // 2 press passes required, a 3rd allowed
function galKey_(cls, lessonId) { return 'gal:' + cls + ':' + lessonId; }
function galSBase_(cls, lessonId) { return 'gals:' + cls + ':' + lessonId; }
function galRBase_(cls, lessonId) { return 'galr:' + cls + ':' + lessonId; }

/* The head only. v1 heads (pre-audit) carried studios/reviews inline; they are
   read in place until the next write migrates them out. */
function galHead_(cls, lessonId) {
  var h = jget_(sp_(), galKey_(cls, lessonId), null) || {};
  return {
    v: num_(h.v), seq: num_(h.seq), ns: num_(h.ns), nr: num_(h.nr),
    oldStudios: h.studios || null, oldReviews: h.reviews || null
  };
}

/* The whole gallery, reassembled from head + shards. Lock-free. */
function galGet_(cls, lessonId) {
  var h = galHead_(cls, lessonId);
  var studios = shardMap_(galSBase_(cls, lessonId), h.ns);
  var reviews = shardList_(galRBase_(cls, lessonId), h.nr);
  if (h.oldStudios) {
    Object.keys(h.oldStudios).forEach(function (e) {
      if (studios[e] === undefined) studios[e] = h.oldStudios[e];
    });
  }
  if (h.oldReviews && h.oldReviews.length) reviews = h.oldReviews.concat(reviews);
  return { seq: h.seq, ns: h.ns, nr: h.nr, studios: studios, reviews: reviews };
}

/* One-shot migration off the v1 inline shape. Returns the current head. Under
   lock; a no-op (one cheap read) once a class-lesson is already v2. */
function galMigrate_(cls, lessonId) {
  var h = galHead_(cls, lessonId);
  if (!h.oldStudios && !h.oldReviews) return h;
  var sBase = galSBase_(cls, lessonId), rBase = galRBase_(cls, lessonId);
  var ns = h.ns, nr = h.nr;
  Object.keys(h.oldStudios || {}).forEach(function (e) { ns = shardPut_(sBase, ns, e, h.oldStudios[e]); });
  (h.oldReviews || []).forEach(function (r) { nr = shardPush_(rBase, nr, r); });
  jset_(sp_(), galKey_(cls, lessonId), { v: 2, seq: h.seq, ns: ns, nr: nr });
  return { v: 2, seq: h.seq, ns: ns, nr: nr, oldStudios: null, oldReviews: null };
}
function galSaveHead_(cls, lessonId, seq, ns, nr) {
  jset_(sp_(), galKey_(cls, lessonId), { v: 2, seq: num_(seq), ns: num_(ns), nr: num_(nr) });
}
function galClean_(s, max) {
  return str_(s).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function galSignatureFor_(cls, email) {
  var rec = readPupil_(cls, email);
  var cn = str_(rec && rec.cn || '');
  return cn ? ('Agent ' + cn) : (str_(rec && rec.n || '').split(' ')[0] || 'A critic');
}

/* Publish (or refresh) my marquee listing. Idempotent: re-opening updates the
   listing text but keeps the sid and the reviews already received. */
function apiGalleryOpen(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var lessonId = str_(req.lessonId);
  var numStr = lessonNum_(classYear_(cls), lessonId);
  if (!lessonAccessible_(cls, numStr, email)) return { ok: false, error: 'locked' };
  var gt = galClean_(req.gt, GAL_TITLE_MAX);
  var gh = galClean_(req.gh, GAL_HOW_MAX);
  var sn = galClean_(req.sn, 24);
  var tpl = str_(req.tpl).slice(0, 8);
  if (!gt) return { ok: false, error: 'no-title' };
  return withLock_(function () {
    var h = galMigrate_(cls, lessonId);
    var sBase = galSBase_(cls, lessonId);
    var mine = shardMap_(sBase, h.ns)[email];
    var seq = num_(h.seq) + 1;
    var stu = {
      sid: str_(mine && mine.sid) || ('s' + seq),
      sn: sn || galSignatureFor_(cls, email),
      cn: galSignatureFor_(cls, email),
      gt: gt, gh: gh, tpl: tpl,
      b: num_(req.beta) ? 1 : 0,
      h: num_(mine && mine.h),
      ts: num_(mine && mine.ts) || tmin_(),
      rn: num_(mine && mine.rn)
    };
    try {
      var ns = shardPut_(sBase, h.ns, email, stu);   // shard first, then the head
      galSaveHead_(cls, lessonId, seq, ns, h.nr);
    } catch (e) { return STORE_FULL_; }
    return { ok: true, sid: str_(stu.sid) };
  });
}

/* File a signed review against another studio (by sid, never email). */
function apiGalleryPost(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var lessonId = str_(req.lessonId);
  var like = galClean_(req.like, GAL_REVIEW_MAX);
  var wonder = galClean_(req.wonder, GAL_REVIEW_MAX);
  if (like.length < 8 || wonder.length < 8) return { ok: false, error: 'too-thin' };
  return withLock_(function () {
    var h = galMigrate_(cls, lessonId);
    var sBase = galSBase_(cls, lessonId), rBase = galRBase_(cls, lessonId);
    var g = { seq: h.seq, studios: shardMap_(sBase, h.ns), reviews: shardList_(rBase, h.nr) };
    var toSid = str_(req.to);
    var toEmail = '';
    Object.keys(g.studios).forEach(function (e) {
      if (str_(g.studios[e].sid) === toSid) toEmail = e;
    });
    if (!toEmail) return { ok: false, error: 'no-studio' };
    if (toEmail === email) return { ok: false, error: 'own-studio' };
    // Spam brakes: hard per-critic cap (the quota IS the rate limit at 3 max)
    // + one review per critic per studio.
    // AUDIT FIX (26 Jul 2026): count only LIVE reviews toward the 3-pass cap.
    // Removed reviews were counted here but skipped by apiGalleryFeed's 'given',
    // so a teacher moderating an unkind review took the pupil's press pass away
    // AND re-locked her V2 note - permanently unable to finish Press Night, with
    // an on-screen reason that was wrong.
    var mine = g.reviews.filter(function (r) { return str_(r.by) === email && !num_(r.rm); });
    if (mine.length >= GAL_REVIEWS_PER_CRITIC) return { ok: false, error: 'passes-spent' };
    if (mine.some(function (r) { return str_(r.to) === toSid; })) return { ok: false, error: 'already-reviewed' };
    var seq = num_(g.seq) + 1;
    var review = {
      i: seq, by: email, bcn: galSignatureFor_(cls, email),
      to: toSid, l: like, w: wonder, t: tmin_(), rm: 0
    };
    var maker = g.studios[toEmail];
    maker.rn = num_(maker.rn) + 1;
    try {
      var nr = shardPush_(rBase, h.nr, review);      // shards first, then the head
      var ns = shardPut_(sBase, h.ns, toEmail, maker);
      galSaveHead_(cls, lessonId, seq, ns, nr);
    } catch (e) { return STORE_FULL_; }
    return { ok: true, given: mine.length + 1 };
  });
}

/* Poll the marquee + my own reviews. Lock-free derived read (tnAgg_
   discipline): a racing append self-heals on the next poll. */
function apiGalleryFeed(req) {
  req = req || {};
  var email = userEmail_();
  if (!email) return { ok: false, error: 'not-signed-in' };
  var cls = realClass_(req.classCode);
  if (!cls) return { ok: false, error: 'unknown-class' };
  var g = galGet_(cls, str_(req.lessonId));
  var mySid = str_(g.studios[email] && g.studios[email].sid || '');
  /* hidden listings (teacher moderation) never reach other pupils; the maker
     still sees her own card, flagged, so the quiet word has a shared anchor */
  var studios = [];
  Object.keys(g.studios).forEach(function (e) {
    var s = g.studios[e];
    var mine = e === email ? 1 : 0;
    if (num_(s.h) && !mine) return;
    studios.push({
      sid: str_(s.sid), sn: str_(s.sn || s.cn), cn: str_(s.cn), gt: str_(s.gt),
      gh: str_(s.gh), tpl: str_(s.tpl), rn: num_(s.rn), mine: mine,
      b: num_(s.b) || 0, hd: mine ? (num_(s.h) || 0) : 0
    });
  });
  var myReviews = [];
  var total = 0, given = 0;
  g.reviews.forEach(function (r) {
    if (num_(r.rm)) return;
    total++;
    if (str_(r.by) === email) given++;
    if (mySid && str_(r.to) === mySid) {
      myReviews.push({ i: num_(r.i), bcn: str_(r.bcn), l: str_(r.l), w: str_(r.w), t: num_(r.t), sim: num_(r.sim) || 0 });
    }
  });
  return { ok: true, seq: num_(g.seq), open: mySid ? 1 : 0, studios: studios,
    myReviews: myReviews, total: total, given: given, studioCount: studios.length };
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
    /* SECURITY (30 Jul 2026, finding NEW-18). The passcode alone used to return
       EVERY class in the school plus each owner's email to anyone who typed it -
       and a pupil account CAN reach this panel. "Show all teachers' classes" was
       only ever a client-side filter, so the data had already left the server.
       Now: you must actually own a class to see the register at all. A caller
       who owns nothing gets an empty list, so a leaked passcode reveals no class
       names, no owner addresses and no roster counts. */
    var meLc = str_(me).toLowerCase();
    var ownsAny = isHod_(me); // a HoD sees every class - that is the point of the role
    if (!ownsAny) {
      for (var oi = 0; oi < reg.length; oi++) {
        if (str_(reg[oi].owner).toLowerCase() === meLc) { ownsAny = true; break; }
      }
    }
    /* The Guide tab's HoD-only section (DFM 116) gates on this flag, and the
       archive Sheet's link goes with it: the sweep can only ever complete on
       the platform owner's account, so the link is useless to anyone else and
       is not sent to them. Both ride on the register call the panel already
       makes - no extra round trip. */
    var meIsHod = isHod_(me);
    var hodExtras = meIsHod
      ? { isHod: 1, archiveUrl: archiveSheetUrl_() }
      : { isHod: 0, archiveUrl: '' };
    if (!ownsAny) {
      return {
        ok: true, me: str_(me), classes: [],
        store: { bytes: 0, limit: 500000, pupils: 0 },
        archive: null,
        isHod: hodExtras.isHod, archiveUrl: hodExtras.archiveUrl
      };
    }
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
      archive: jget_(sp_(), 'archiveMeta', null),
      isHod: hodExtras.isHod, archiveUrl: hodExtras.archiveUrl
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
    /* Deletion is owner-or-HoD (30 Jul 2026). Damien asked for FULL control of
       every class as Head of Department, deletion included, and reaffirmed it
       when told it was irreversible - so it is his call and it is settled. */
    if (entry && entry.owner && !canManageClass_(cls, me)) return { ok: false, error: 'not-owner' };
    return withLock_(function () {
      var spp = sp_();
      var props = spp.getProperties();
      var pre = 'p:' + cls + ':';
      var removed = 0;
      Object.keys(props).forEach(function (k) { if (k.indexOf(pre) === 0) { spp.deleteProperty(k); removed++; } });
      ['lock:' + cls, 'cfg:' + cls, 'team:' + cls].forEach(function (k) { spp.deleteProperty(k); });
      /* AUDIT B-01: the class's social stores are per-class-LESSON keys, so they
         were never caught by the p: prefix and survived a deleted class. Now
         that a gallery is a head PLUS shards, leaving them behind would leak
         several KB per lesson against the 500 KB script-wide quota. */
      ['gal:', 'gals:', 'galr:', 'chat:', 'chats:', 'pair:'].forEach(function (p) {
        var pre2 = p + cls + ':';
        Object.keys(props).forEach(function (k) { if (k.indexOf(pre2) === 0) spp.deleteProperty(k); });
      });
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
      if (on && !num_(cur.u)) cur.u = tmin_();  // first unlock = delivered date
      cur.on = on;
      /* AUDIT FIX B-05: the teacher's UNDO. Before this there was no control
         anywhere that could reset a delivered date, so one mis-tap on the lock
         grid marked a lesson as taught forever. clear:1 (staff panel: "Undo
         delivery") puts the cell back to never-delivered. Pupil work is never
         touched - only the class-level claim that this lesson was taught. */
      if (!on && num_(req.clear)) cur.u = 0;
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
    var rows = statsPupils_(cls).map(function (r) {
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
      cfg: { lb: cfg2.lb, absDays: num_(cfg2.absDays), cover: num_(cfg2.cover.on), coverLesson: str_(cfg2.cover.lesson), pairing: { on: num_(cfg2.pairing.on) }, tn: { mode: str_(cfg2.tn.mode) } },
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
    /* TEACHER BRIEF STANDARD (28 Jul 2026, LESSON_QUALITY_GATE.md): a brief is
       written for a colleague who teaches another subject and has never seen
       this platform, so it carries a purpose, a plain-English tour of the
       lesson's parts BEFORE any of them are named in instructions, a
       preparation checklist, every resource with a route to it, the hour step
       by step, and what to do when it goes wrong. The three old fields are
       still returned so a lesson not yet rewritten keeps rendering. */
    /* img/imgCap ride each section entry: the screenshots Damien asked for
       three times (28 Jul) render inline, at the point in the brief they
       illustrate. Paths are repo-relative; the shell resolves them. */
    return {
      ok: true, num: str_(briefEntry.num), title: str_(briefEntry.title),
      purpose: (brief.purpose || []).map(str_),
      atAGlance: (brief.atAGlance || []).map(function (g) {
        return { part: str_(g.part), mins: num_(g.mins), what: str_(g.what), img: str_(g.img || ''), imgCap: str_(g.imgCap || '') };
      }),
      prepare: (brief.prepare || []).map(function (p) {
        return { title: str_(p.title), text: str_(p.text), img: str_(p.img || ''), imgCap: str_(p.imgCap || '') };
      }),
      resources: (brief.resources || []).map(function (r) {
        return { label: str_(r.label), what: str_(r.what), href: str_(r.href || ''), where: str_(r.where || ''), img: str_(r.img || ''), imgCap: str_(r.imgCap || '') };
      }),
      runningTheHour: (brief.runningTheHour || []).map(function (h) {
        return { part: str_(h.part), mins: num_(h.mins), text: str_(h.text), say: str_(h.say || ''), img: str_(h.img || ''), imgCap: str_(h.imgCap || '') };
      }),
      goesWrong: (brief.goesWrong || []).map(function (w) {
        return { q: str_(w.q), a: str_(w.a), img: str_(w.img || ''), imgCap: str_(w.imgCap || '') };
      }),
      ifBehind: str_(brief.ifBehind || ''),
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
      if (req.tn) {
        var tnMode = str_(req.tn.mode);
        if (['team', 'public'].indexOf(tnMode) !== -1) cfg3.tn.mode = tnMode;
      }
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

  /* Put a lesson back to the start (30 Jul 2026). Two reasons this exists:
     an accidental double-click used to skip a chunk permanently (fixed, but a
     class can still need a re-run), and a teacher may simply want to re-teach.
     Clearing the shared record is not enough on its own - a pupil's resume
     position lives in her own UserProperties, out of reach - so this also
     stamps the lesson, and each pupil's client starts fresh on her next visit.
     Pairing state for the lesson is wiped too, so the Vault can pair again. */
  if (sub === 'resetLesson') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var rsNum = str_(req.lessonNum);
    if (!rsNum) return { ok: false, error: 'bad-request' };
    var rsOne = str_(req.email || '').toLowerCase();
    var rsCleared = 0;
    return withLock_(function () {
      var rsPupils = rsOne ? [{ email: rsOne }] : allPupils_(cls);
      for (var ri = 0; ri < rsPupils.length; ri++) {
        var rsRec = readPupil_(cls, str_(rsPupils[ri].email));
        if (!rsRec || !rsRec.L || !rsRec.L[rsNum]) continue;
        var rsXp = num_((rsRec.L[rsNum] || [])[1]);
        delete rsRec.L[rsNum];
        rsRec.xp = Math.max(0, num_(rsRec.xp) - rsXp);   // the XP came from work that no longer exists
        /* DAMIEN, 31 Jul 2026 (rule 99): the codename is Lesson 1's own output,
           so resetting Lesson 1 resets it too - otherwise a re-run greets the
           pupil by a codename the reset was supposed to unmake. Other lessons
           never touch it. */
        if (rsNum === '1') rsRec.cn = '';
        writePupil_(cls, str_(rsPupils[ri].email), rsRec);
        rsCleared++;
      }
      stampReset_(cls, rsNum);
      var rsYear = classYear_(cls);
      var rsMan = yearManifest_(rsYear);
      (rsMan && rsMan.lessons || []).forEach(function (le) {
        if (str_(le.num) !== rsNum) return;
        sp_().deleteProperty(pairRegKey_(cls, str_(le.id)));
        cPut_(pqCacheKey_(cls, str_(le.id)), { q: [], stage: 0 }, 60);
      });
      return { ok: true, cleared: num_(rsCleared) };
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
      /* dissolved pairs (C-11) stay listed so their transcript is still
         reachable, but their members are free, not assigned */
      if (!num_(P.dis)) (P.m || []).forEach(function (e) { plAssigned[str_(e)] = 1; });
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
        pid: str_(p), trio: num_(P.trio), done: num_(P.done), dis: num_(P.dis), t: num_(P.t),
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
    var ptChat = chatGet_(cls, str_(req.lessonId));
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

  /* Panic button, rewritten for audit C-11 (27 Jul 2026).
     It used to DELETE the registry. Pupils already paired had long left the join
     loop, so nothing ever told them: their channel polls answered
     'not-your-pair' forever, the turn counter froze, and both halves of every
     pair sat on "not your turn" until someone reloaded the page - which no Year
     8 works out. The button offered for unblocking a stuck room deadlocked
     everyone who was working fine.
     It now DISSOLVES instead:
       - each unfinished pair is flagged (P.dis) and its members are released to
         a solo run, exactly the state the per-pupil "Solo run" button produces.
         They keep their work and carry on where they stand - no reload.
       - the flag is observable: their very next channel poll (~2s) returns
         dis:1, which is how the client knows to drop the dock and go solo.
       - finished pairs are left alone. They are history, not a deadlock, and
         their names/callsigns are what the staff transcript viewer reads.
       - the QUEUE is cleared, so anyone stuck waiting re-joins within ~2s and is
         matched again. That is the button's real purpose, preserved. */
  if (sub === 'pairReset') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      var prLesson = str_(req.lessonId);
      var prReg2 = pairReg_(cls, prLesson);
      var prFreed = 0, prSealed = 0;
      Object.keys(prReg2.P).forEach(function (pid3) {
        var P3 = prReg2.P[pid3];
        if (num_(P3.done) || num_(P3.dis)) { prSealed++; return; }
        P3.dis = tmin_() || 1;
        (P3.m || []).forEach(function (e3) {
          var em3 = str_(e3);
          if (prReg2.solo.indexOf(em3) === -1) prReg2.solo.push(em3);
          prFreed++;
        });
      });
      jset_(sp_(), pairRegKey_(cls, prLesson), prReg2);
      cPut_(pqCacheKey_(cls, prLesson), { q: [], stage: 0 }, 60);
      return { ok: true, freed: num_(prFreed), sealed: num_(prSealed) };
    });
  }

  /* Reaction Rally projector feed (section 13): full aggregation for the staff
     Tournament overlay - live submit counter, per-team totals, and (only when
     cfg.tn.mode === 'public') the ranked individual scores. The reveal itself
     is the existing 'setReveal' sub - one reveal flag, one source of truth. */
  if (sub === 'tournament') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var tnNum = lessonNum_(classYear_(cls), str_(req.lessonId));
    if (!tnNum) return { ok: false, error: 'unknown-lesson' };
    var tnAgg = tnAgg_(cls, tnNum);
    var tnCfg = getCfg_(cls);
    var tnOut = {
      ok: true,
      revealed: !!tnAgg.team.reveal,
      submitted: num_(tnAgg.submitted),
      roster: num_(tnAgg.roster),
      mode: str_(tnCfg.tn.mode),
      unassigned: tnAgg.rows.filter(function (r) { return tnAgg.totals[r.g] == null; }).length,
      teams: (tnAgg.team.groups || []).map(function (g) {
        var subCount = 0;
        tnAgg.rows.forEach(function (r) { if (r.g === str_(g.id)) subCount++; });
        return { id: str_(g.id), name: str_(g.name), total: num_(tnAgg.totals[str_(g.id)]), submitted: subCount };
      })
    };
    if (str_(tnCfg.tn.mode) === 'public') {
      tnOut.rows = tnAgg.rows.map(function (r) { return { n: r.n, v: num_(r.v) }; })
        .sort(function (a, b) { return b.v - a.v; });
    }
    return tnOut;
  }

  /* Press Night lens (section 14): the full gallery with REAL names - the
     duty-of-care view. Removed reviews stay listed (struck through client-
     side) so the teacher can see what was removed and by implication why. */
  if (sub === 'gallery') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    var gg = galGet_(cls, str_(req.lessonId));
    var bySid = {};
    var gStudios = Object.keys(gg.studios).map(function (e) {
      var s = gg.studios[e];
      var r = readPupil_(cls, e);
      bySid[str_(s.sid)] = str_(r && r.n || e);
      return { sid: str_(s.sid), sn: str_(s.sn || s.cn), name: str_(r && r.n || e), cn: str_(s.cn),
        gt: str_(s.gt), gh: str_(s.gh), tpl: str_(s.tpl), rn: num_(s.rn),
        b: num_(s.b) || 0, h: num_(s.h) || 0 };
    });
    var byEmail = {};
    var gReviews = gg.reviews.map(function (r) {
      if (!byEmail[str_(r.by)]) {
        var rp = readPupil_(cls, str_(r.by));
        byEmail[str_(r.by)] = str_(rp && rp.n || r.by);
      }
      return { i: num_(r.i), byName: byEmail[str_(r.by)], bcn: str_(r.bcn),
        toName: str_(bySid[str_(r.to)] || r.to), toSid: str_(r.to),
        l: str_(r.l), w: str_(r.w), t: num_(r.t), rm: num_(r.rm) || 0, sim: num_(r.sim) || 0 };
    });
    return { ok: true, studios: gStudios, reviews: gReviews };
  }

  /* Hide a LISTING (studio name / game title / how-to-play are pupil-authored
     free text too - safety gate finding): the listing vanishes from every
     other pupil's marquee on their next poll; the maker sees her own card
     flagged "hidden - talk to your teacher". Hide, never delete. */
  if (sub === 'galleryHideStudio') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      var hLes = str_(req.lessonId);
      var hHead = galMigrate_(cls, hLes);
      var hBase = galSBase_(cls, hLes);
      var hStudios = shardMap_(hBase, hHead.ns);
      var hitEmail = '';
      Object.keys(hStudios).forEach(function (e) {
        if (str_(hStudios[e].sid) === str_(req.sid)) hitEmail = e;
      });
      if (!hitEmail) return { ok: false, error: 'no-studio' };
      var hStu = hStudios[hitEmail];
      hStu.h = 1;
      try {
        var hNs = shardPut_(hBase, hHead.ns, hitEmail, hStu);
        galSaveHead_(cls, hLes, hHead.seq, hNs, hHead.nr);
      } catch (e) { return STORE_FULL_; }
      return { ok: true };
    });
  }

  /* One-tap removal: the review vanishes from the maker's screen on their
     next feed poll (~4s). Never deleted - rm flags keep the audit trail. */
  if (sub === 'galleryRemove') {
    if (!cls) return { ok: false, error: 'unknown-class' };
    return withLock_(function () {
      var rLes = str_(req.lessonId);
      var rHead = galMigrate_(cls, rLes);
      var want = num_(req.i);
      var hitRv = false;
      try {
        hitRv = shardEdit_(galRBase_(cls, rLes), rHead.nr,
          function (r) { return num_(r.i) === want; },
          function (r) { r.rm = 1; });
      } catch (e) { return STORE_FULL_; }
      if (!hitRv) return { ok: false, error: 'no-review' };
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
var GAL_HEADERS = ['archivedAt', 'class', 'lesson', 'email', 'name', 'studio',
  'gameTitle', 'howToPlay', 'template', 'reviewsReceived', 'reviewsText', 'openedAt'];

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

/* Press Night's audit tab (section 14). Same self-healing pattern. */
function galSheet_(ss) {
  var sh = ss.getSheetByName('Gallery Archive');
  if (!sh) {
    sh = ss.insertSheet('Gallery Archive');
    sh.appendRow(GAL_HEADERS);
  }
  return sh;
}

/* The archive Sheet's own link, for the Guide tab's HoD-only section. Empty
   until setupArchive() has run, and never sent to a non-HoD caller. */
function archiveSheetUrl_() {
  var id = str_(sp_().getProperty('ARCHIVE_SHEET_ID'));
  return id ? ('https://docs.google.com/spreadsheets/d/' + id + '/edit') : '';
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
      var parts0 = k.split(':'); // chat:<cls>:<lessonId>
      var kCls = str_(parts0[1]), kLesson = parts0.slice(2).join(':');
      var chatHd = chatHead_(kCls, kLesson);       // AUDIT B-01: transcripts are sharded now
      var chat = chatGet_(kCls, kLesson);
      var pids = Object.keys(chat || {});
      if (!pids.length) { sp.deleteProperty(k); shardDrop_(chatSBase_(kCls, kLesson), chatHd.nc); return; }
      var newest = 0;
      pids.forEach(function (p) { if (num_(chat[p].t) > newest) newest = num_(chat[p].t); });
      if (newest > chatCutoff) return;
      var cCls = kCls, cLesson = kLesson;
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
      shardDrop_(chatSBase_(cCls, cLesson), chatHd.nc);  // head AND every shard, only after verify
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
    /* ---------- Press Night sweep (section 14): same 7-day horizon ----------
       One row per studio to the Gallery Archive tab, with its received
       reviews joined compact. Write-VERIFY, then delete the gal: key. */
    Object.keys(allProps).forEach(function (k) {
      if (k.indexOf('gal:') !== 0) return;
      var parts2 = k.split(':'); // gal:<cls>:<lessonId>
      var gCls = str_(parts2[1]), gLesson = parts2.slice(2).join(':');
      /* AUDIT B-01: the gallery is sharded, so the row data is reassembled from
         head + shards and EVERY shard is dropped with the head - after the
         write-verify, never before. */
      var galHd = galHead_(gCls, gLesson);
      var gal = galGet_(gCls, gLesson);
      var dropGal = function () {
        sp.deleteProperty(k);
        shardDrop_(galSBase_(gCls, gLesson), galHd.ns);
        shardDrop_(galRBase_(gCls, gLesson), galHd.nr);
      };
      var emails2 = Object.keys(gal.studios || {});
      if (!emails2.length && !(gal.reviews || []).length) { dropGal(); return; }
      var newest3 = 0;
      emails2.forEach(function (e) { if (num_(gal.studios[e].ts) > newest3) newest3 = num_(gal.studios[e].ts); });
      (gal.reviews || []).forEach(function (r) { if (num_(r.t) > newest3) newest3 = num_(r.t); });
      if (newest3 > chatCutoff) return;
      var galRows = emails2.map(function (e) {
        var s = gal.studios[e];
        var r2 = readPupil_(gCls, e);
        var revs = (gal.reviews || []).filter(function (r) { return str_(r.to) === str_(s.sid) && !num_(r.rm); })
          .map(function (r) { return str_(r.bcn) + ': I like ' + str_(r.l) + ' / I wonder ' + str_(r.w); })
          .join(' || ').slice(0, 900);
        return [new Date(), gCls, gLesson, str_(e), str_(r2 && r2.n || ''), str_(s.sn || s.cn),
          str_(s.gt), str_(s.gh), str_(s.tpl), num_(s.rn), revs, tminToDate_(num_(s.ts))];
      });
      if (galRows.length) {
        var gSheet = galSheet_(ss);
        var gBefore = gSheet.getLastRow();
        gSheet.getRange(gBefore + 1, 1, galRows.length, GAL_HEADERS.length).setValues(galRows);
        SpreadsheetApp.flush();
        if (gSheet.getLastRow() !== gBefore + galRows.length) throw new Error('gallery write verify failed for ' + k);
        meta.galRows = num_(meta.galRows) + galRows.length;
      }
      dropGal();
    });
    /* Orphan pass: a shard whose head never landed (a crash between the two
       writes) would otherwise sit in the store forever, and the store-wide
       500 KB quota is the thing this whole sweep exists to protect. A shard is
       an orphan only if its head key is gone. */
    Object.keys(allProps).forEach(function (k) {
      var pre = '';
      if (k.indexOf('gals:') === 0 || k.indexOf('galr:') === 0) pre = 'gal:';
      else if (k.indexOf('chats:') === 0) pre = 'chat:';
      else return;
      var rest = k.slice(k.indexOf(':') + 1);          // <cls>:<lessonId>:<i>
      var cut = rest.lastIndexOf(':');
      if (cut < 0) return;
      if (sp.getProperty(pre + rest.slice(0, cut))) return;  // head still live
      if (!sp.getProperty(k)) return;                        // already dropped with its head
      sp.deleteProperty(k);
      meta.orphans = num_(meta.orphans) + 1;
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
