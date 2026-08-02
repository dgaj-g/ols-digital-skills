/* OLS KS3 Digital Technology — dev/preview FakeServer (ARCHITECTURE.md §7).
   Mirrors server/Code.gs.template's API surface + semantics so localhost and
   github.io preview behave like the real Apps Script deployment. Loaded only
   when window.OLS_TRANSPORT is absent (see app.js pickTransport) — the
   assembler (server/build-pathb.js) never ships this file to Apps Script.

   Storage: one localStorage blob, key 'ks3dt-dev' —
     { passcode, classes[{name,owner,year,created}],
       locks:{class:{"<num>":{u,on}}}, cfg:{class:{lb,absDays,cover}},
       team:{class:{groups,reveal}}, pupils:{"<class>:<email>": leanRec},
       userProps:{"<email>": {recap:{threads,seen}, rs:{"<num>":session}, draft:{"<num>":obj}}} }
   leanRec / Larr layout is identical to Code.gs.template §3.

   Identity: there is no real sign-in here, so two fixed personas stand in —
   PUPIL_EMAIL for every pupil-facing call (whoami/join/state/...) and
   STAFF_EMAIL for admin calls (matches the seeded class's owner, so
   deleteClass etc. behave the same as they would for their real owner).

   Marking: keys live in the git-ignored content/dev-keys.json. On github.io
   that file 404s (by design — it's never published), so every marking call
   degrades to a neutral "can't check that here" reply instead of failing —
   see FALLBACK_EXPLAIN and devKeysAll_(). Public content (manifest/lesson/
   recap-pool JSON) is NOT git-ignored, so failures fetching those propagate
   as real errors, same as UrlFetchApp throwing in the real server. */
(function (global) {
  'use strict';

  var STORE_KEY = 'ks3dt-dev';
  /* Per-TAB pupil identity (section 12 two-tab pairing): ?as=cara picks a
     persona, remembered in sessionStorage so each tab keeps its identity
     across reloads while every tab still shares the one localStorage store.
     Default stays Anya — existing preview flows are untouched. */
  var PERSONAS = {
    anya: { email: 'anya.murphy@demo', name: 'Anya Murphy' },
    cara: { email: 'cara.devlin@demo', name: 'Cara Devlin' },
    ryan: { email: 'ryan.fitzsimons@demo', name: 'Ryan Fitzsimons' },
    niamh: { email: 'niamh.quinn@demo', name: 'Niamh Quinn' },
    sean: { email: 'sean.ohagan@demo', name: "Sean O'Hagan" },
    erin: { email: 'erin.mallon@demo', name: 'Erin Mallon' }
  };
  function personaKey_() {
    var as = '';
    try { as = new URLSearchParams(global.location.search).get('as') || ''; } catch (e) {}
    try { if (!as) as = sessionStorage.getItem('ks3dt-dev-as') || ''; } catch (e) {}
    as = str_(as).toLowerCase();
    if (!PERSONAS[as]) as = 'anya';
    try { sessionStorage.setItem('ks3dt-dev-as', as); } catch (e) {}
    return as;
  }
  var PUPIL_EMAIL, PUPIL_NAME; // set at load (personaKey_ needs str_ below)
  var STAFF_EMAIL = 'teacher@demo';
  var BOT_EMAIL = 'bot@demo';  // the simulated partner (single-tab pairing demo)
  var EPOCH = 1767225600000; // 2026-01-01 UTC — same epoch as Code.gs.template's tmin_()
  var LATENCY = 180;         // simulated round-trip, ms
  var FALLBACK_EXPLAIN = 'PREVIEW ONLY — this answer was NOT marked. Every answer is accepted here, ' +
    'right or wrong. The live app would tell you the truth. (See the red banner at the top.)';

  /* ---------- tiny helpers (mirrors Code.gs.template) ---------- */
  function str_(v) { return String(v == null ? '' : v); }
  function mergeDetail_(existing, addition) {
    var map = {}, order = [];
    function take(seg) { if (!seg) return; var k = seg.split('=')[0]; if (!(k in map)) order.push(k); map[k] = seg; }
    String(existing || '').split(';').forEach(take);
    String(addition || '').split(';').forEach(take);
    return order.map(function (k) { return map[k]; }).join(';').slice(0, 220);
  }
  function num_(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function vhash_(x) {
    var h = 5381;
    for (var i = 0; i < x.length; i++) h = ((h * 33) ^ x.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }
  function detailKeys_(d) { return String(d || '').split(';').filter(Boolean).map(function (seg) { return seg.split('=')[0]; }); }
  function detailAddsNew_(existing, addition) {
    var have = detailKeys_(existing);
    return detailKeys_(addition).some(function (k) { return have.indexOf(k) === -1; });
  }
  function tmin_() { return Math.floor((Date.now() - EPOCH) / 60000); }
  function tminToDate_(m) { return new Date(EPOCH + m * 60000); }
  function today_() { return Math.floor(tmin_() / 1440); }
  function shuffle_(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
  }

  var PERSONA_KEY = personaKey_();
  PUPIL_EMAIL = PERSONAS[PERSONA_KEY].email;
  PUPIL_NAME = PERSONAS[PERSONA_KEY].name;

  /* ---------- persistent store ---------- */
  function load_() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var seeded = seed_();
    save_(seeded);
    return seeded;
  }
  function save_(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }

  /* ---------- emulated ScriptProperties, with the REAL per-value cap ----------
     AUDIT BLOCKER B-01 (27 Jul 2026). Everything in this FakeServer lives in one
     localStorage blob, and localStorage has NO per-key size limit. Apps Script
     caps a single ScriptProperties VALUE at 9,216 bytes and THROWS past it.
     That single difference is why five quality-gate runs, a full verify sweep
     and a nine-lens code audit all passed while Lesson 5's Press Night could
     not physically complete for a class of 30 on the real server.

     So: every store value that is one real ScriptProperties property on the
     deployment now goes through pSet_, which enforces 9,216 bytes exactly as
     Apps Script does. Preview is no longer more forgiving than production.

     Sharding helpers below mirror Code.gs.template one-for-one (same budget,
     same roll rule, same shard-first-then-head write order) so a bug in the
     sharding shows up here too. */
  var PROP_VALUE_MAX = 9216;    // Apps Script's hard per-value ceiling
  var SHARD_BYTES = 7000;       // roll to a fresh shard once a value passes this
  var SHARD_INPLACE_MAX = 8600; // an in-place edit past this moves the entry out
  function props_(s) { if (!s.props) s.props = {}; return s.props; }
  function storeFull_(key, len) {
    var e = new Error('Argument too large: value (' + len + ' bytes, limit ' +
      PROP_VALUE_MAX + ') for property "' + key + '"');
    e.ks3dtStoreFull = 1;
    return e;
  }
  function pGet_(s, key, fallback) {
    try { var raw = props_(s)[key]; return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function pSet_(s, key, obj) {
    var body = JSON.stringify(obj);
    if (body.length > PROP_VALUE_MAX) throw storeFull_(key, body.length);
    props_(s)[key] = body;
    return body.length;
  }
  function pDel_(s, key) { delete props_(s)[key]; }
  function shKey_(base, i) { return base + ':' + i; }
  function shList_(s, base, n) {
    var out = [], i, v;
    for (i = 0; i <= n; i++) { v = pGet_(s, shKey_(base, i), null); if (v && v.length) out = out.concat(v); }
    return out;
  }
  function shMap_(s, base, n) {
    var out = {}, i, v;
    for (i = 0; i <= n; i++) {
      v = pGet_(s, shKey_(base, i), null);
      if (!v) continue;
      Object.keys(v).forEach(function (k) { out[k] = v[k]; });
    }
    return out;
  }
  function shPush_(s, base, n, item) {
    var idx = n > 0 ? n - 1 : 0;
    var cur = pGet_(s, shKey_(base, idx), null);
    if (!(cur instanceof Array)) cur = [];
    cur.push(item);
    if (JSON.stringify(cur).length > SHARD_BYTES && cur.length > 1) {
      idx += 1;
      pSet_(s, shKey_(base, idx), [item]);
    } else {
      pSet_(s, shKey_(base, idx), cur);
    }
    return idx + 1;
  }
  function shPut_(s, base, n, key, val) {
    var i, v;
    for (i = 0; i < n; i++) {
      v = pGet_(s, shKey_(base, i), null);
      if (!v || v[key] === undefined) continue;
      v[key] = val;
      if (JSON.stringify(v).length <= SHARD_INPLACE_MAX) { pSet_(s, shKey_(base, i), v); return n; }
      delete v[key];
      pSet_(s, shKey_(base, i), v);
      break;
    }
    var idx = n > 0 ? n - 1 : 0;
    var obj = pGet_(s, shKey_(base, idx), null) || {};
    obj[key] = val;
    if (JSON.stringify(obj).length > SHARD_BYTES && Object.keys(obj).length > 1) {
      idx += 1;
      var fresh = {};
      fresh[key] = val;
      pSet_(s, shKey_(base, idx), fresh);
    } else {
      pSet_(s, shKey_(base, idx), obj);
    }
    return idx + 1;
  }
  function shEdit_(s, base, n, matchFn, editFn) {
    var i, j, v, hit = false;
    for (i = 0; i <= n; i++) {
      v = pGet_(s, shKey_(base, i), null);
      if (!(v instanceof Array)) continue;
      var touched = false;
      for (j = 0; j < v.length; j++) { if (matchFn(v[j])) { editFn(v[j]); touched = true; hit = true; } }
      if (touched) pSet_(s, shKey_(base, i), v);
    }
    return hit;
  }
  function shDrop_(s, base, n) { for (var i = 0; i <= n + 2; i++) pDel_(s, shKey_(base, i)); }

  /* Evidence hook for the scale harness (and for anyone poking at the console):
     every modelled property with its real byte size, so "does this fit on Apps
     Script?" is a measurement in preview, not a guess. */
  function storeReport_() {
    var s = load_(), out = { limit: PROP_VALUE_MAX, values: {}, max: 0, over: [] };
    Object.keys(props_(s)).forEach(function (k) { out.values[k] = props_(s)[k].length; });
    Object.keys(s.pupils || {}).forEach(function (k) {
      out.values['p:' + k] = JSON.stringify(s.pupils[k]).length;
    });
    Object.keys(out.values).forEach(function (k) {
      if (out.values[k] > out.max) out.max = out.values[k];
      if (out.values[k] > PROP_VALUE_MAX) out.over.push(k);
    });
    return out;
  }
  try { window.KS3DT_STORE_REPORT = storeReport_; } catch (e) {}

  /* Seed data: one demo class, the signed-in pupil (no record yet — she joins
     fresh through the normal boot flow) + five fake pupils that light up every
     dashboard row state: two completed, one started, one never-showed-up
     (absence flag), one already dismissed (flag suppressed). Lesson 1 is the
     only lesson with real content, so it's unlocked; Lesson 2 is ALSO unlocked
     purely so the absence demo has an eligible lesson to flag against — j1-01
     is absenceInferenceEligible:false in the manifest, j1-02 is not. */
  function seed_() {
    var now = tmin_();
    var tenDaysAgo = now - 10 * 1440; // safely 6+ school days under any weekend split
    var s = {
      passcode: 'demo',
      classes: [
        { name: 'Demo-8A', owner: STAFF_EMAIL, year: 'j1', created: tminToDate_(tenDaysAgo).toISOString() }
      ],
      locks: { 'Demo-8A': { '1': { u: tenDaysAgo, on: 1 }, '2': { u: tenDaysAgo, on: 1 } } },
      /* Head of Department register (Code.gs: Script Property `hods`). Empty by
         default so preview behaves like an ordinary teacher's panel; the video
         scene and the Guide harness put STAFF_EMAIL in here to film/assert the
         HoD-only section. */
      hods: [],
      archiveSheetUrl: '',
      cfg: {},
      team: {},
      pupils: {},
      userProps: {}
    };
    getCfg_(s, 'Demo-8A');
    getTeam_(s, 'Demo-8A');

    s.pupils['Demo-8A:cara.devlin@demo'] = {
      n: 'Cara Devlin', cn: 'Copper Falcon', j: tenDaysAgo, xp: 105, g: '',
      L: {
        '1': [2, 105, 'bl=11/16|0121000000010000', '1', '222|1', now - 9 * 1440, 42, 0, 'Loved the Vault bit!', 0, 0],
        '2': [0, 0, '', '', '', 0, 5, 0, '', 0, 0]
      }
    };
    s.pupils['Demo-8A:ryan.fitzsimons@demo'] = {
      n: 'Ryan Fitzsimons', cn: 'Silver Comet', j: tenDaysAgo, xp: 92, g: '',
      L: {
        '1': [2, 92, 'bl=8/16|1032000001000010', '1', '211|2', now - 8 * 1440, 38, 0, '', 0, 0],
        '2': [0, 0, '', '', '', 0, 4, 0, '', 0, 0]
      }
    };
    s.pupils['Demo-8A:niamh.quinn@demo'] = {
      n: 'Niamh Quinn', cn: '', j: tenDaysAgo, xp: 15, g: '',
      L: {
        '1': [1, 15, '', '', '', now - 9 * 1440, 6, 0, '', 0, 0],
        '2': [0, 0, '', '', '', 0, 3, 0, '', 0, 0]
      }
    };
    s.pupils["Demo-8A:sean.ohagan@demo"] = {
      n: "Sean O'Hagan", cn: '', j: tenDaysAgo, xp: 0, g: '', L: {} // no record anywhere -> absence flag on j1-02
    };
    s.pupils['Demo-8A:erin.mallon@demo'] = {
      n: 'Erin Mallon', cn: '', j: tenDaysAgo, xp: 0, g: '',
      L: { '2': [0, 0, '', '', '', 0, 0, 1, '', 0, 0] } // flags bit 1: teacher already dismissed
    };
    return s;
  }

  /* ---------- class registry / pupil records (mirrors Code.gs.template §3) ---------- */
  function getClasses_(s) {
    var raw = s.classes || [];
    return raw.map(function (c) {
      return { name: str_(c.name), owner: str_(c.owner), year: str_(c.year || 'j1'), created: str_(c.created) };
    }).filter(function (c) { return !!c.name; });
  }
  function realClass_(s, c) {
    c = str_(c).trim();
    if (!c) return '';
    var reg = getClasses_(s), lc = c.toLowerCase();
    for (var i = 0; i < reg.length; i++) if (reg[i].name.toLowerCase() === lc) return reg[i].name;
    return '';
  }
  function classYear_(s, cls) {
    var reg = getClasses_(s);
    for (var i = 0; i < reg.length; i++) if (reg[i].name === cls) return reg[i].year || 'j1';
    return 'j1';
  }
  function sanitizeClass_(name) {
    return str_(name).trim().replace(/[^A-Za-z0-9_\- ]/g, '').replace(/\s+/g, '-').slice(0, 40);
  }

  function pKey_(cls, email) { return cls + ':' + email; }
  function readPupil_(s, cls, email) { return s.pupils[pKey_(cls, email)] || null; }
  /* A pupil record is one real ScriptProperties value too, so it gets the same
     9,216-byte ceiling (audit B-01). The dispatcher turns the throw into the
     server's own {ok:false, error:'store-full'}, which app.js already treats as
     permanent - so preview now reproduces that path instead of hiding it. */
  function writePupil_(s, cls, email, rec) {
    var body = JSON.stringify(rec);
    if (body.length > PROP_VALUE_MAX) throw storeFull_(pKey_(cls, email), body.length);
    s.pupils[pKey_(cls, email)] = rec;
  }
  function allPupils_(s, cls) {
    var pre = cls + ':';
    var out = [];
    Object.keys(s.pupils).forEach(function (k) {
      if (k.indexOf(pre) !== 0) return;
      var clone = JSON.parse(JSON.stringify(s.pupils[k]));
      clone.email = k.slice(pre.length);
      out.push(clone);
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
  function lessonEntry_(man, lessonId) {
    var ls = (man && man.lessons) || [];
    for (var i = 0; i < ls.length; i++) if (str_(ls[i].id) === lessonId) return ls[i];
    return null;
  }
  function fileIdOf_(entry) { return (entry && entry.file) ? str_(entry.file).replace(/\.json$/, '') : ''; }

  /* ---------- locks / cfg / team (auto-vivify defaults into the blob) ---------- */
  function getResetsD_(s, cls) {
    if (!s.rst) s.rst = {};
    if (!s.rst[cls]) s.rst[cls] = {};
    return s.rst[cls];
  }
  function getLocks_(s, cls) {
    if (!s.locks) s.locks = {};
    if (!s.locks[cls]) s.locks[cls] = {};
    return s.locks[cls];
  }
  function getCfg_(s, cls) {
    if (!s.cfg) s.cfg = {};
    var c = s.cfg[cls];
    if (!c) c = s.cfg[cls] = {};
    if (!c.lb) c.lb = { mode: 'off', basis: 'xp', names: 'codename', topN: 0 };
    if (!c.absDays) c.absDays = 5;
    if (!c.cover) c.cover = { on: 0, lesson: '', ts: 0 };
    if (!c.pairing) c.pairing = { on: 1 }; // auto-pairing default ON (section 12)
    if (!c.tn) c.tn = { mode: 'team' }; // tournament reveal mode (section 13)
    return c;
  }
  function getTeam_(s, cls) {
    if (!s.team) s.team = {};
    if (!s.team[cls]) s.team[cls] = { groups: [], reveal: false };
    return s.team[cls];
  }
  function userProps_(s, email) {
    if (!s.userProps) s.userProps = {};
    if (!s.userProps[email]) s.userProps[email] = { recap: { threads: {}, seen: {} }, rs: {}, draft: {} };
    var up = s.userProps[email];
    if (!up.recap) up.recap = { threads: {}, seen: {} };
    if (!up.rs) up.rs = {};
    if (!up.draft) up.draft = {};
    return up;
  }
  /* AUDIT FIX B-05 (27 Jul 2026) - verbatim mirror of Code.gs.template. The
     `on` flag was computed and never read, so a re-lock was a no-op on BOTH
     layers. A pupil who already has a record keeps her access ("never kick
     anyone out"); a re-lock stops anyone NEW from starting. */
  function lessonAccessible_(s, cls, numStr) {
    var lk = getLocks_(s, cls)[numStr];
    if (!lk || !num_(lk.u)) return false;
    if (num_(lk.on)) return true;
    var rec = readPupil_(s, cls, PUPIL_EMAIL);
    return !!(rec && rec.L && rec.L[numStr]);
  }

  /* ---------- absence inference (verbatim mirror of Code.gs.template) ---------- */
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
  function meaningful_(a) { return !!a && (str_(a[3]) !== '' || str_(a[2]) !== '' || num_(a[6]) >= 3 || num_(a[10]) > 0); }
  function absenceFor_(cls, rec, locks, manifest, absDays) {
    var flags = [];
    var lessons = (manifest && manifest.lessons) || [];
    for (var i = 0; i < lessons.length; i++) {
      var le = lessons[i];
      if (le.absenceInferenceEligible === false) continue;
      if (str_(le.status) !== 'ready') continue; // parity: never flag unauthored lessons
      var lk = locks[str_(le.num)];
      if (!lk || !num_(lk.u)) continue;
      if (!num_(lk.on)) continue; // AUDIT FIX B-05: a locked lesson cannot be caught up on, so never flag it
      if (schoolDaysSince_(num_(lk.u)) < absDays) continue;
      var a = (rec.L || {})[str_(le.num)];
      if (meaningful_(a)) continue;
      if (a && (num_(a[7]) & 1)) continue; // teacher dismissed
      if (a && (num_(a[7]) & 2)) continue; // catch-up completed
      flags.push(str_(le.id));
    }
    return flags;
  }

  /* ---------- content fetch (relative to platform/, sibling ../content/) ----------
     fetchContent_ throws on failure (public JSON — a 404 here is a real bug,
     same as the real server's UrlFetchApp throw). devKeysAll_ never throws —
     dev-keys.json is the ONE file that's expected to 404 on github.io. */
  var contentCache = {};
  function fetchContent_(path) {
    if (Object.prototype.hasOwnProperty.call(contentCache, path)) {
      var hit = contentCache[path];
      if (hit.ok) return Promise.resolve(hit.data);
      return Promise.reject(new Error(hit.err));
    }
    return fetch('../content/' + path).then(function (r) {
      if (!r.ok) {
        var e = 'content fetch ' + path + ' HTTP ' + r.status;
        contentCache[path] = { ok: false, err: e };
        throw new Error(e);
      }
      return r.json();
    }).then(function (data) {
      contentCache[path] = { ok: true, data: data };
      return data;
    });
  }
  function devKeysAll_() {
    var CK = 'dev-keys.json';
    if (Object.prototype.hasOwnProperty.call(contentCache, CK)) {
      return Promise.resolve(contentCache[CK].ok ? contentCache[CK].data : null);
    }
    return fetch('../content/' + CK).then(function (r) {
      if (!r.ok) { contentCache[CK] = { ok: false }; return null; }
      return r.json();
    }).then(function (data) {
      contentCache[CK] = { ok: true, data: data };
      return data;
    }).catch(function () { contentCache[CK] = { ok: false }; return null; });
  }
  function yearManifest_(year) { return fetchContent_(year + '/manifest.json'); }
  function recapPoolPath_(man, year) { return str_((man && man.recapPool) || (year + '/recap-pool.json')); }

  /* ==================== PUPIL API ==================== */

  function doWhoAmI() {
    return Promise.resolve({ ok: true, email: PUPIL_EMAIL, name: PUPIL_NAME });
  }

  function doJoin(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var rec = readPupil_(s, cls, PUPIL_EMAIL) || { n: '', cn: '', j: tmin_(), xp: 0, g: '', L: {} };
    if (!rec.n) rec.n = str_(p.name || PUPIL_NAME);
    writePupil_(s, cls, PUPIL_EMAIL, rec);
    save_(s);
    return Promise.resolve({ ok: true, name: str_(rec.n) });
  }

  function doState(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var year = classYear_(s, cls);
    var rec = readPupil_(s, cls, PUPIL_EMAIL);
    var locks = getLocks_(s, cls);
    var cfg = getCfg_(s, cls);
    return yearManifest_(year).catch(function () { return null; }).then(function (man) {
      var absence = (rec && man) ? absenceFor_(cls, rec, locks, man, num_(cfg.absDays)) : [];
      var team = getTeam_(s, cls);
      var myTeam = null;
      if (rec && rec.g && cfg.lb.mode !== 'off') {
        var pupils = allPupils_(s, cls);
        var teamXp = 0, memberNames = [];
        pupils.forEach(function (pu) {
          if (str_(pu.g) === str_(rec.g)) {
            teamXp += num_(pu.xp);
            if (team.reveal) memberNames.push(str_(pu.n));
          }
        });
        var gname = '';
        team.groups.forEach(function (g) { if (str_(g.id) === str_(rec.g)) gname = str_(g.name); });
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
        cover: num_(cfg.cover.on),
        absence: absence,
        team: myTeam,
        resets: getResetsD_(s, cls),
        contentVersion: 'dev-preview'
      };
    });
  }

  function doRecapStart(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var year = classYear_(s, cls);
    var curNum = str_(p.lessonNum || '');
    return yearManifest_(year).then(function (man) {
      return fetchContent_(recapPoolPath_(man, year)).then(function (pool) {
        var poolItems = (pool && pool.items) || [];
        var idToNum = {};
        (man.lessons || []).forEach(function (l) { idToNum[str_(l.id)] = str_(l.num); });
        /* rule 134 mirror (2 Aug 2026): eligible = lessons THIS PUPIL has
           COMPLETED, never today's - the class-wide "delivered" filter let the
           warm-up serve untaught content. Matches apiRecapStart exactly. */
        var rec = readPupil_(s, cls, PUPIL_EMAIL);
        var done = {};
        if (rec && rec.L) Object.keys(rec.L).forEach(function (k) {
          if (num_((rec.L[k] || [])[0]) === 2) done[k] = 1;
        });
        var items = poolItems.filter(function (it) {
          var n = idToNum[str_(it.lesson)];
          return n && done[n] && n !== curNum;
        });
        if (!items.length) return { ok: true, items: [] };

        var up = userProps_(s, PUPIL_EMAIL);
        var hist = up.recap;
        var day = today_();

        // 1) Due keystone threads first.
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

        // 2) Fill to 5 with the 40/40/20 recency mix over COMPLETED lesson numbers.
        var rank_ = function (n) { return str_(n) === 'S1' ? 1.5 : num_(n); };
        var nums = Object.keys(done).map(rank_).sort(function (a, b) { return b - a; });
        var band = function (it) {
          var n = rank_(idToNum[str_(it.lesson)]);
          var back = 0;
          for (var i = 0; i < nums.length; i++) if (nums[i] === n) { back = i; break; }
          if (back === 0) return 'a';
          if (back >= 1 && back <= 3) return 'b';
          return 'c';
        };
        var pools = { a: [], b: [], c: [] };
        items.forEach(function (it) {
          if (chosen.indexOf(it) !== -1) return;
          var seenDay = hist.seen[str_(it.id)];
          if (seenDay === day) return;
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
        if (chosen.length < 3) {
          for (var r3 = 0; r3 < items.length && chosen.length < Math.min(3, items.length); r3++) {
            if (chosen.indexOf(items[r3]) === -1) chosen.push(items[r3]);
          }
        }

        // Shuffle each item's options; remember the order for marking.
        var session = { day: day, items: [] };
        var out = [];
        chosen.forEach(function (it) {
          var ord = it.options.map(function (_, i) { return i; });
          shuffle_(ord);
          session.items.push({ id: str_(it.id), ord: ord, thread: str_(it.thread || '') });
          out.push({ id: str_(it.id), topic: str_(it.topic), stem: str_(it.stem),
            options: ord.map(function (oi) { return str_(it.options[oi]); }) });
        });
        up.rs[curNum] = session;
        save_(s);
        /* rule 97 mirror: a/explain ride along so the Do-Now marks instantly. */
        return devKeysAll_().then(function (allKeys) {
          var poolId = recapPoolPath_(man, year).replace(/\.json$/, '');
          var rk = allKeys && allKeys[poolId];
          if (rk) {
            out.forEach(function (o, ix) {
              var key = rk[o.id];
              if (key && typeof key.a === 'number') {
                o.a = session.items[ix].ord.indexOf(num_(key.a));
                o.explain = str_(key.explain || '');
              }
            });
          }
          return { ok: true, items: out };
        });
      });
    });
  }

  function doRecapAnswer(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var year = classYear_(s, cls);
    var curNum = str_(p.lessonNum || '');
    var up = userProps_(s, PUPIL_EMAIL);
    var session = up.rs[curNum];
    if (!session) return Promise.resolve({ ok: false, error: 'no-session' });
    var entry = null;
    session.items.forEach(function (it) { if (it.id === str_(p.itemId)) entry = it; });
    if (!entry) return Promise.resolve({ ok: false, error: 'not-in-session' });
    var choice = num_(p.choice);

    return yearManifest_(year).then(function (man) {
      var fileId = recapPoolPath_(man, year).replace(/\.json$/, '');
      return devKeysAll_().then(function (allKeys) {
        var outcome;
        if (!allKeys) {
          outcome = { correct: true, correctShuffled: choice, explain: FALLBACK_EXPLAIN };
        } else {
          var keys = allKeys[fileId];
          var key = keys ? keys[str_(p.itemId)] : null;
          if (!key) return { ok: false, error: 'no-key' };
          var originalIdx = num_(entry.ord[choice]);
          var correct = originalIdx === num_(key.a);
          var correctShuffled = entry.ord.indexOf(num_(key.a));
          outcome = { correct: correct, correctShuffled: correctShuffled, explain: str_(key.explain || '') };
        }
        // History + pupil record update happens regardless of key availability.
        var hist = up.recap;
        var day = today_();
        hist.seen[str_(p.itemId)] = day;
        if (entry.thread) {
          var t = hist.threads[entry.thread] || { s: 0, d: -1, r: false };
          if (outcome.correct) { if (t.d !== day) { t.s = num_(t.s) + 1; t.d = day; } if (t.s >= 3) t.r = true; }
          else { t.s = 0; t.d = day; t.r = false; }
          hist.threads[entry.thread] = t;
        }
        var rec = readPupil_(s, cls, PUPIL_EMAIL);
        if (rec) {
          var a = larr_(rec, curNum);
          a[9] = num_(a[9]) + (outcome.correct ? 1 : 0);
          a[10] = num_(a[10]) + 1;
          if (num_(a[0]) < 1) a[0] = 1;
          a[5] = tmin_();
          writePupil_(s, cls, PUPIL_EMAIL, rec);
        }
        save_(s);
        return { ok: true, correct: !!outcome.correct, correctIdx: num_(outcome.correctShuffled), explain: outcome.explain };
      });
    });
  }

  function doMark(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var year = classYear_(s, cls);
    var lessonId = str_(p.lessonId);
    return yearManifest_(year).then(function (man) {
      var entry = lessonEntry_(man, lessonId);
      var numStr = entry ? str_(entry.num) : '';
      if (!lessonAccessible_(s, cls, numStr)) return { ok: false, error: 'locked' };
      var choice = num_(p.choice);
      return devKeysAll_().then(function (allKeys) {
        if (!allKeys) return { ok: true, correct: true, correctIdx: choice, explain: FALLBACK_EXPLAIN };
        var keys = allKeys[fileIdOf_(entry)];
        var key = keys ? keys[str_(p.itemId)] : null;
        if (!key) return { ok: false, error: 'no-key' };
        return { ok: true, correct: choice === num_(key.a), correctIdx: num_(key.a), explain: str_(key.explain || '') };
      });
    });
  }

  /* Mirror of apiLessonKeys (rule 97, instant marking) with the same filter:
     no _brief, no vault maps, no x-tagged keys (exit + baseline). On github.io
     dev-keys 404s, so this returns no-keys, the client falls back to per-tap
     doMark, and the C-14 "nothing is marked here" story is unchanged. */
  function doLessonKeys(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var year = classYear_(s, cls);
    var lessonId = str_(p.lessonId);
    return yearManifest_(year).then(function (man) {
      var entry = lessonEntry_(man, lessonId);
      var numStr = entry ? str_(entry.num) : '';
      if (!lessonAccessible_(s, cls, numStr)) return { ok: false, error: 'locked' };
      return devKeysAll_().then(function (allKeys) {
        if (!allKeys) return { ok: false, error: 'no-keys' };
        var keys = allKeys[fileIdOf_(entry)];
        if (!keys) return { ok: false, error: 'no-keys' };
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
      });
    });
  }

  /* Vault map is real filing data, not a correctness judgement — no fake-success
     fallback makes sense here (the client already shows a graceful "stuck" card
     when vaultInfo fails, same as any other wifi blip). */
  function doVaultInfo(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var year = classYear_(s, cls);
    var lessonId = str_(p.lessonId);
    return yearManifest_(year).then(function (man) {
      var entry = lessonEntry_(man, lessonId);
      var numStr = entry ? str_(entry.num) : '';
      if (!lessonAccessible_(s, cls, numStr)) return { ok: false, error: 'locked' };
      return devKeysAll_().then(function (allKeys) {
        if (!allKeys) return { ok: false, error: 'no-key' };
        var keys = allKeys[fileIdOf_(entry)];
        var v = keys ? keys[str_(p.keyId || 'vault')] : null;
        if (!v || !v.map) return { ok: false, error: 'no-key' };
        if (str_(p.mode) === 'explain') {
          var rec = readPupil_(s, cls, PUPIL_EMAIL);
          var a = rec ? larr_(rec, numStr) : null;
          var done = a && (detailKeys_(a[2]).indexOf('vp') !== -1 || detailKeys_(a[2]).indexOf(str_(p.keyId || 'vault')) !== -1 ||
            ((num_(a[7]) & 4) && num_(a[0]) === 2));
          if (!done) return { ok: false, error: 'not-finished' };
          return { ok: true, explain: v.explain || {} };
        }
        var salt = Math.random().toString(36).slice(2, 10);
        var check = {};
        Object.keys(v.map).forEach(function (fileId) {
          check[fileId] = vhash_(salt + '|' + fileId + '|' + str_(v.map[fileId]));
        });
        return { ok: true, salt: str_(salt), check: check };
      });
    });
  }

  function doSaveEvent(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var numStr = str_(p.lessonNum || '');
    if (!numStr) return Promise.resolve({ ok: false, error: 'no-lesson' });
    if (!lessonAccessible_(s, cls, numStr)) return Promise.resolve({ ok: false, error: 'locked' });
    var rec = readPupil_(s, cls, PUPIL_EMAIL);
    if (!rec) return Promise.resolve({ ok: false, error: 'not-joined' });
    var a = larr_(rec, numStr);
    // parity: archived lessons are sealed (ledger lives in the year archive)
    if ((num_(a[7]) & 4) && num_(a[0]) === 2) return Promise.resolve({ ok: true, xp: num_(rec.xp), sealed: true });
    if (num_(a[0]) < 1) a[0] = 1;
    var xpDelta = Math.max(0, Math.min(40, num_(p.xp)));
    var isNew = p.detail != null && detailAddsNew_(a[2], str_(p.detail));
    if (xpDelta && isNew) {
      xpDelta = Math.min(xpDelta, Math.max(0, 150 - num_(a[1])));
      a[1] = num_(a[1]) + xpDelta; rec.xp = num_(rec.xp) + xpDelta;
    }
    if (p.detail != null) a[2] = mergeDetail_(a[2], str_(p.detail).slice(0, 120));
    if (p.minDelta) a[6] = num_(a[6]) + Math.max(0, Math.min(10, num_(p.minDelta)));
    if (p.codename != null) rec.cn = str_(p.codename).slice(0, 40);
    a[5] = tmin_();
    writePupil_(s, cls, PUPIL_EMAIL, rec);
    if (p.draft != null) {
      var up = userProps_(s, PUPIL_EMAIL);
      var draftStr = str_(JSON.stringify(p.draft));
      if (draftStr.length < 8000) up.draft[numStr] = p.draft;
    }
    save_(s);
    return Promise.resolve({ ok: true, xp: num_(rec.xp) });
  }

  function doLoadDraft(p) {
    var s = load_();
    var numStr = str_((p || {}).lessonNum || '');
    var up = userProps_(s, PUPIL_EMAIL);
    var draft = (up.draft && up.draft[numStr] != null) ? up.draft[numStr] : null;
    return Promise.resolve({ ok: true, draft: draft });
  }

  function doSubmitExit(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var year = classYear_(s, cls);
    var lessonId = str_(p.lessonId);
    return yearManifest_(year).then(function (man) {
      var entry = lessonEntry_(man, lessonId);
      var numStr = entry ? str_(entry.num) : '';
      if (!lessonAccessible_(s, cls, numStr)) return { ok: false, error: 'locked' };
      return fetchContent_(str_(entry.file)).then(function (lesson) {
        var exitItems = (lesson.exit && lesson.exit.items) || [];
        if (!exitItems.length) {
          (lesson.chunks || []).forEach(function (ch) {
            if (ch.engine === 'exitcheck' && ch.config && ch.config.items) exitItems = ch.config.items;
          });
        }
        return devKeysAll_().then(function (allKeys) {
          var keys = allKeys ? allKeys[fileIdOf_(entry)] : null;
          var fallback = !allKeys;
          var answers = (p.answers || []).map(function (v) { return num_(v); });
          var chosenStr = '', right = 0;
          var fb = [];
          for (var i = 0; i < exitItems.length; i++) {
            var it = exitItems[i];
            var ch = (i < answers.length) ? answers[i] : -1;
            var ok, correctIdx, explain;
            if (fallback) {
              ok = true; correctIdx = ch; explain = FALLBACK_EXPLAIN;
            } else {
              var key = keys ? (keys[str_(it.id)] || {}) : {};
              ok = ch === num_(key.a); correctIdx = num_(key.a); explain = str_(key.explain || '');
            }
            if (ok) right++;
            chosenStr += (ch >= 0 && ch <= 9) ? String(ch) : 'x';
            fb.push({ id: str_(it.id), correct: !!ok, correctIdx: num_(correctIdx), explain: explain });
          }
          var se = p.selfEval || {};
          var rec = readPupil_(s, cls, PUPIL_EMAIL);
          if (!rec) return { ok: false, error: 'not-joined' };
          var a = larr_(rec, numStr);
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
          writePupil_(s, cls, PUPIL_EMAIL, rec);
          save_(s);
          return { ok: true, right: num_(right), total: num_(exitItems.length), feedback: fb, xp: num_(rec.xp) };
        });
      });
    });
  }

  /* Baseline: marked + stored, NEVER fed back (doc 07: neutral ack). If keys
     are unavailable we still log the chosen-answer string, just unscored —
     there's nothing to fake since correctness is never returned to the pupil. */
  function doSubmitBaseline(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var year = classYear_(s, cls);
    var lessonId = str_(p.lessonId);
    return yearManifest_(year).then(function (man) {
      var entry = lessonEntry_(man, lessonId);
      var numStr = entry ? str_(entry.num) : '';
      if (!lessonAccessible_(s, cls, numStr)) return { ok: false, error: 'locked' };
      return devKeysAll_().then(function (allKeys) {
        var keys = allKeys ? allKeys[fileIdOf_(entry)] : null;
        var answers = p.answers || {};
        var ids = Object.keys(answers).sort();
        var right = 0, chosen = '';
        ids.forEach(function (id) {
          var key = keys ? keys[id] : null;
          var ch = num_(answers[id]);
          if (key && ch === num_(key.a)) right++;
          chosen += (ch >= 0 && ch <= 9) ? String(ch) : 'x';
        });
        var rec = readPupil_(s, cls, PUPIL_EMAIL);
        if (!rec) return { ok: false, error: 'not-joined' };
        var a = larr_(rec, numStr);
        if (detailKeys_(a[2]).indexOf('bl') !== -1 || (num_(a[7]) & 4)) return { ok: true, already: true };
        a[2] = mergeDetail_(a[2], 'bl=' + right + '/' + ids.length + '|' + chosen);
        a[5] = tmin_();
        if (num_(a[0]) < 1) a[0] = 1;
        writePupil_(s, cls, PUPIL_EMAIL, rec);
        save_(s);
        return { ok: true };
      });
    });
  }


  /* Side-quest Drive inspection - the preview has no real Drive, so the check
     is SIMULATED (always passes, flagged so the engine says so on screen). */
  function doDriveCheck(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var numStr = str_(p.lessonNum || '');
    if (!lessonAccessible_(s, cls, numStr)) return Promise.resolve({ ok: false, error: 'locked' });
    return Promise.resolve({ ok: true, school: true, dtwork: true, simulated: true });
  }

  /* Agent Kit - mirrors apiSetKit (clearance-gated cosmetic equip; no XP). */
  function doSetKit(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    return fetchContent_('themes.json').catch(function () { return null; }).then(function (reg) {
      if (!reg) return { ok: false, error: 'no-registry' };
      function clearanceXp(level) {
        var cs = reg.clearances || [];
        for (var i = 0; i < cs.length; i++) if (num_(cs[i].level) === num_(level)) return num_(cs[i].xp);
        return 0;
      }
      var rec = readPupil_(s, cls, PUPIL_EMAIL);
      if (!rec) return { ok: false, error: 'not-joined' };
      var xp = num_(rec.xp);
      var themeId = p.themeId != null ? str_(p.themeId) : null;
      var insigniaId = p.insigniaId != null ? str_(p.insigniaId) : null;
      if (themeId != null) {
        if (themeId === '') { rec.th = ''; }
        else {
          var th = null;
          (reg.themes || []).forEach(function (t) { if (str_(t.id) === themeId) th = t; });
          if (!th) return { ok: false, error: 'unknown-theme' };
          if (xp < clearanceXp(th.clearance)) return { ok: false, error: 'kit-locked' };
          rec.th = themeId;
        }
      }
      if (insigniaId != null) {
        if (insigniaId === '') { rec.fx = ''; }
        else {
          var ins = null;
          (reg.insignia || []).forEach(function (g) { if (str_(g.id) === insigniaId) ins = g; });
          if (!ins) return { ok: false, error: 'unknown-insignia' };
          if (xp < clearanceXp(ins.clearance)) return { ok: false, error: 'kit-locked' };
          rec.fx = insigniaId;
        }
      }
      writePupil_(s, cls, PUPIL_EMAIL, rec);
      save_(s);
      return { ok: true, th: str_(rec.th || ''), fx: str_(rec.fx || '') };
    });
  }

  /* Public class board (decision #8) - mirrors apiBoard */
  function doBoard(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var cfg = getCfg_(s, cls);
    if (str_(cfg.lb.mode) !== 'public') return Promise.resolve({ ok: true, mode: str_(cfg.lb.mode), rows: [] });
    var rows = allPupils_(s, cls).filter(function (r) { return str_(r.n); }).map(function (r) {
      var doneCount = 0;
      Object.keys(r.L || {}).forEach(function (k) { if (num_((r.L[k] || [])[0]) === 2) doneCount++; });
      return {
        // DFM 124a: no codename yet -> real first name (mirrors Code.gs.template)
        label: (str_(cfg.lb.names) === 'real' || !str_(r.cn))
          ? str_(r.n).split(' ')[0]
          : ('Agent ' + str_(r.cn)),
        v: str_(cfg.lb.basis) === 'completion' ? num_(doneCount) : num_(r.xp),
        me: str_(r.email) === PUPIL_EMAIL
      };
    });
    rows.sort(function (a, b) { return b.v - a.v; });
    var topN = num_(cfg.lb.topN);
    if (topN > 0) rows = rows.slice(0, topN);
    return Promise.resolve({ ok: true, mode: 'public', basis: str_(cfg.lb.basis), rows: rows });
  }

  /* ---- Reaction Rally tournament (section 13) - mirrors tnAgg_/apiTournament ---- */
  function tnAggD_(s, cls, numStr) {
    var team = getTeam_(s, cls);
    var totals = {}, submitted = 0, roster = 0, rows = [];
    (team.groups || []).forEach(function (g) { totals[str_(g.id)] = 0; });
    allPupils_(s, cls).forEach(function (r) {
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
  function tnNumFor_(s, cls, lessonId) {
    return yearManifest_(classYear_(s, cls)).then(function (man) {
      var entry = lessonEntry_(man, str_(lessonId));
      return entry ? str_(entry.num) : '';
    });
  }
  function doTournament(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    return tnNumFor_(s, cls, p.lessonId).then(function (numStr) {
      if (!numStr) return { ok: false, error: 'unknown-lesson' };
      var agg = tnAggD_(s, cls, numStr);
      var out = { ok: true, n: num_(agg.submitted), revealed: !!agg.team.reveal };
      if (agg.team.reveal && (agg.team.groups || []).length) {
        var me = readPupil_(s, cls, PUPIL_EMAIL) || {};
        out.teams = agg.team.groups.map(function (g) {
          return { name: str_(g.name), total: num_(agg.totals[str_(g.id)]), mine: str_(me.g || '') === str_(g.id) ? 1 : 0 };
        });
      }
      return out;
    });
  }

  function doCatchup(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var numStr = str_(p.lessonNum || '');
    var rec = readPupil_(s, cls, PUPIL_EMAIL);
    if (!rec) return Promise.resolve({ ok: false, error: 'not-joined' });
    var a = larr_(rec, numStr);
    a[7] = num_(a[7]) | 2;
    a[5] = tmin_();
    writePupil_(s, cls, PUPIL_EMAIL, rec);
    save_(s);
    return Promise.resolve({ ok: true });
  }

  /* ==================== STAFF API ==================== */

  function doAdmin(p) {
    var s = load_();
    var got = str_(p.passcode).trim().toLowerCase();
    var want = str_(s.passcode || 'demo').trim().toLowerCase();
    if (!want || !got || got !== want) return Promise.resolve({ ok: false, error: 'bad-passcode' });
    var me = STAFF_EMAIL;
    var sub = str_(p.sub);
    var className = str_(p.className || '');
    var cls = className ? realClass_(s, className) : '';

    if (sub === 'check') return Promise.resolve({ ok: true, email: str_(me) });

    if (sub === 'classes') {
      var reg = getClasses_(s);
      var counts = {};
      Object.keys(s.pupils).forEach(function (k) {
        var c = k.split(':')[0];
        counts[c] = (counts[c] || 0) + 1;
      });
      var bytes = 0, pupilCount = 0;
      Object.keys(s.pupils).forEach(function (k) { bytes += k.length + JSON.stringify(s.pupils[k]).length; pupilCount++; });
      return Promise.resolve({
        ok: true, me: str_(me),
        classes: reg.map(function (c) {
          return { name: str_(c.name), owner: str_(c.owner), year: str_(c.year), created: str_(c.created), pupils: num_(counts[c.name] || 0) };
        }),
        store: { bytes: num_(bytes), limit: 500000, pupils: num_(pupilCount) },
        archive: s.archiveMeta || null,
        /* Mirrors Code.gs.template: the Guide tab's HoD-only section gates on
           this. In preview the register is s.hods (seeded empty), so the panel
           behaves like a normal teacher's until a scene/harness sets it. */
        isHod: (s.hods || []).indexOf(str_(me).toLowerCase()) !== -1 ? 1 : 0,
        archiveUrl: ((s.hods || []).indexOf(str_(me).toLowerCase()) !== -1 && s.archiveSheetUrl)
          ? str_(s.archiveSheetUrl) : ''
      });
    }

    /* Manual archive sweep - mirrors archiveSweep_ (archive "sheet" = an array
       in the dev blob; same completed + 28-day-old + not-yet-archived rules,
       same trim: detail -> 'arch', comment cleared, bit 4 set). */
    if (sub === 'archiveNow') {
      var ARCHIVE_AFTER_DAYS = 28;
      var cutoff = tmin_() - ARCHIVE_AFTER_DAYS * 1440;
      var meta = { t: tmin_(), rows: 0, pupils: 0, ok: true, error: '' };
      if (!s.archive) s.archive = [];
      Object.keys(s.pupils).forEach(function (k) {
        var rec = s.pupils[k];
        var any = false;
        Object.keys(rec.L || {}).forEach(function (numStr) {
          var a = rec.L[numStr];
          if (!a || num_(a[0]) !== 2) return;
          if (num_(a[5]) > cutoff) return;
          if (num_(a[7]) & 4) return;
          s.archive.push([tminToDate_(tmin_()).toISOString(), k.split(':')[0], k.split(':')[1], str_(rec.n), str_(rec.cn),
            str_(numStr), num_(a[1]), str_(a[2]), str_(a[3]), str_(a[4]), str_(a[8]), num_(a[6]), num_(a[9]), num_(a[10])]);
          a[2] = 'arch'; a[8] = ''; a[7] = num_(a[7]) | 4;
          meta.rows++; any = true;
        });
        if (any) meta.pupils++;
      });
      s.archiveMeta = meta;
      save_(s);
      return Promise.resolve({ ok: true, ran: true, rows: num_(meta.rows), pupils: num_(meta.pupils), okRun: true, error: '' });
    }

    if (sub === 'removePupil') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      delete s.pupils[pKey_(cls, str_(p.email).toLowerCase())];
      save_(s);
      return Promise.resolve({ ok: true });
    }

    if (sub === 'addClass') {
      var name = sanitizeClass_(p.name);
      if (!name) return Promise.resolve({ ok: false, error: 'bad-name' });
      var year = str_(p.year || 'j1').toLowerCase();
      if (['j1', 'j2', 'j3'].indexOf(year) === -1) year = 'j1';
      var reg2 = getClasses_(s);
      for (var i = 0; i < reg2.length; i++) {
        if (reg2[i].name.toLowerCase() === name.toLowerCase()) return Promise.resolve({ ok: false, error: 'exists', name: str_(reg2[i].name) });
      }
      reg2.push({ name: name, owner: me, year: year, created: new Date().toISOString() });
      s.classes = reg2;
      save_(s);
      return Promise.resolve({ ok: true, name: str_(name) });
    }

    if (sub === 'deleteClass') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var entry = null;
      getClasses_(s).forEach(function (c) { if (c.name === cls) entry = c; });
      if (entry && entry.owner && entry.owner !== me) return Promise.resolve({ ok: false, error: 'not-owner' });
      var pre = cls + ':';
      var removed = 0;
      Object.keys(s.pupils).forEach(function (k) { if (k.indexOf(pre) === 0) { delete s.pupils[k]; removed++; } });
      delete s.locks[cls]; delete s.cfg[cls]; delete s.team[cls];
      s.classes = getClasses_(s).filter(function (c) { return c.name !== cls; });
      save_(s);
      return Promise.resolve({ ok: true, removed: num_(removed) });
    }

    if (sub === 'setLock') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var numStr = str_(p.lessonNum);
      var on = p.on ? 1 : 0;
      var locks = getLocks_(s, cls);
      var cur = locks[numStr] || { u: 0, on: 0 };
      if (on && !num_(cur.u)) cur.u = tmin_(); // first unlock = delivered date
      cur.on = on;
      if (!on && num_(p.clear)) cur.u = 0;     // AUDIT FIX B-05: the teacher's undo
      locks[numStr] = cur;
      save_(s);
      return Promise.resolve({ ok: true, u: num_(cur.u), on: num_(cur.on) });
    }

    /* mirrors apiAdmin sub 'resetLesson' - see Code.gs.template for why a
       stamp is needed rather than a straight delete */
    if (sub === 'resetLesson') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var rsNum = str_(p.lessonNum);
      if (!rsNum) return Promise.resolve({ ok: false, error: 'bad-request' });
      var rsOne = str_(p.email || '').toLowerCase();
      var rsCleared = 0;
      var rsList = rsOne ? [{ email: rsOne }] : allPupils_(s, cls);
      rsList.forEach(function (row) {
        var rec2 = readPupil_(s, cls, str_(row.email));
        if (!rec2 || !rec2.L || !rec2.L[rsNum]) return;
        var rsXp = num_((rec2.L[rsNum] || [])[1]);
        delete rec2.L[rsNum];
        rec2.xp = Math.max(0, num_(rec2.xp) - rsXp);
        writePupil_(s, cls, str_(row.email), rec2);
        rsCleared++;
      });
      var rsAll = getResetsD_(s, cls);
      rsAll[rsNum] = tmin_();
      if (!s.rst) s.rst = {};
      s.rst[cls] = rsAll;
      if (s.pairing) Object.keys(s.pairing).forEach(function (k) { if (k.indexOf(cls + ':') === 0) delete s.pairing[k]; });
      if (s.pq) Object.keys(s.pq).forEach(function (k) { if (k.indexOf(cls + ':') === 0) delete s.pq[k]; });
      save_(s);
      return Promise.resolve({ ok: true, cleared: num_(rsCleared) });
    }

    if (sub === 'locks') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var lk = getLocks_(s, cls);
      var out = {};
      Object.keys(lk).forEach(function (k) { out[k] = { on: num_(lk[k].on), u: num_(lk[k].u) }; });
      return Promise.resolve({ ok: true, locks: out, year: str_(classYear_(s, cls)) });
    }

    if (sub === 'dashboard') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var year2 = classYear_(s, cls);
      var cfg2 = getCfg_(s, cls);
      var locks2 = getLocks_(s, cls);
      var team2 = getTeam_(s, cls);
      return yearManifest_(year2).catch(function () { return null; }).then(function (man2) {
        var rows = allPupils_(s, cls).map(function (r) {
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
        return {
          ok: true, year: str_(year2), rows: rows, locks: locksOut2,
          cfg: { lb: cfg2.lb, absDays: num_(cfg2.absDays), cover: num_(cfg2.cover.on), coverLesson: str_(cfg2.cover.lesson), pairing: { on: num_(cfg2.pairing.on) }, tn: { mode: str_(cfg2.tn.mode) } },
          groups: team2.groups.map(function (g) { return { id: str_(g.id), name: str_(g.name) }; }),
          reveal: !!team2.reveal
        };
      });
    }

    /* Teacher brief - mirrors apiAdmin sub 'brief' (reads _brief from dev keys;
       on github.io dev-keys 404s, so the panel explains briefs need the real app). */
    if (sub === 'brief') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var briefLessonId = str_(p.lessonId);
      var briefYear = classYear_(s, cls);
      return yearManifest_(briefYear).then(function (briefMan) {
        var briefEntry = lessonEntry_(briefMan, briefLessonId);
        if (!briefEntry || !briefEntry.file) return { ok: false, error: 'unknown-lesson' };
        return devKeysAll_().then(function (allKeys) {
          if (!allKeys) return { ok: false, error: 'preview-no-keys' };
          var briefKeys = allKeys[fileIdOf_(briefEntry)];
          var brief = briefKeys ? briefKeys._brief : null;
          if (!brief) return { ok: false, error: 'no-brief' };
          /* mirrors apiAdmin sub 'brief' — TEACHER BRIEF STANDARD sections,
             with the three legacy fields kept so a lesson not yet rewritten
             still renders */
          return {
            ok: true, num: str_(briefEntry.num), title: str_(briefEntry.title),
            purpose: (brief.purpose || []).map(str_),
            atAGlance: (brief.atAGlance || []).map(function (g) {
              return { part: str_(g.part), mins: num_(g.mins), what: str_(g.what), img: str_(g.img || ''), imgCap: str_(g.imgCap || '') };
            }),
            prepare: (brief.prepare || []).map(function (pr) {
              return { title: str_(pr.title), text: str_(pr.text), img: str_(pr.img || ''), imgCap: str_(pr.imgCap || '') };
            }),
            resources: (brief.resources || []).map(function (rs) {
              return { label: str_(rs.label), what: str_(rs.what), href: str_(rs.href || ''), where: str_(rs.where || ''), img: str_(rs.img || ''), imgCap: str_(rs.imgCap || '') };
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
        });
      });
    }

    if (sub === 'keyinfo') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var lessonId2 = str_(p.lessonId);
      var year3 = classYear_(s, cls);
      return yearManifest_(year3).then(function (man3) {
        var entry2 = lessonEntry_(man3, lessonId2);
        return devKeysAll_().then(function (allKeys) {
          var keys2 = allKeys ? allKeys[fileIdOf_(entry2)] : null;
          var out2 = {};
          if (keys2) {
            Object.keys(keys2).forEach(function (id) {
              var k = keys2[id];
              if (k && typeof k.a === 'number') out2[id] = { a: num_(k.a), mis: (k.mis || []).map(str_), explain: str_(k.explain || '') };
            });
          }
          return { ok: true, items: out2 };
        });
      });
    }

    if (sub === 'absenceDismiss') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var email2 = str_(p.email).toLowerCase();
      var num2 = str_(p.lessonNum);
      var rec2 = readPupil_(s, cls, email2);
      if (!rec2) return Promise.resolve({ ok: false, error: 'no-pupil' });
      var a2 = larr_(rec2, num2);
      a2[7] = num_(a2[7]) | 1;
      writePupil_(s, cls, email2, rec2);
      save_(s);
      return Promise.resolve({ ok: true });
    }

    if (sub === 'setConfig') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var cfg3 = getCfg_(s, cls);
      if (p.lb) {
        var mode = str_(p.lb.mode);
        if (['off', 'team', 'public'].indexOf(mode) !== -1) cfg3.lb.mode = mode;
        var basis = str_(p.lb.basis);
        if (['xp', 'completion'].indexOf(basis) !== -1) cfg3.lb.basis = basis;
        var names = str_(p.lb.names);
        if (['codename', 'real'].indexOf(names) !== -1) cfg3.lb.names = names;
        cfg3.lb.topN = Math.max(0, Math.min(50, num_(p.lb.topN)));
      }
      if (p.absDays != null) cfg3.absDays = Math.max(1, Math.min(20, num_(p.absDays)));
      if (p.pairing != null) cfg3.pairing = { on: num_(p.pairing.on) ? 1 : 0 };
      if (p.tn) {
        var tnMode = str_(p.tn.mode);
        if (['team', 'public'].indexOf(tnMode) !== -1) cfg3.tn.mode = tnMode;
      }
      save_(s);
      return Promise.resolve({ ok: true });
    }

    if (sub === 'setCover') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var cfg4 = getCfg_(s, cls);
      cfg4.cover = { on: p.on ? 1 : 0, lesson: str_(p.lessonId || ''), ts: tmin_() };
      save_(s);
      return Promise.resolve({ ok: true });
    }

    if (sub === 'createGroup') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var team3 = getTeam_(s, cls);
      var id = 'g' + (team3.groups.length + 1) + '-' + Math.floor(Math.random() * 9000 + 1000);
      team3.groups.push({ id: id, name: str_(p.name || 'Team ' + (team3.groups.length + 1)).slice(0, 24) });
      save_(s);
      return Promise.resolve({ ok: true, id: str_(id) });
    }
    if (sub === 'assignPupil') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var email3 = str_(p.email).toLowerCase();
      var rec3 = readPupil_(s, cls, email3);
      if (rec3) { rec3.g = str_(p.groupId || ''); writePupil_(s, cls, email3, rec3); }
      save_(s);
      return Promise.resolve({ ok: true });
    }
    if (sub === 'autoGroup') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var n = Math.min(10, Math.max(2, num_(p.n) || 4));
      var names = ['Lovelace', 'Hopper', 'Hamilton', 'Johnson', 'Clarke', 'Easley', 'Wilkes', 'Shaw', 'Coombs', 'Spence'];
      var team4 = { groups: [], reveal: false };
      for (var gi2 = 0; gi2 < n; gi2++) team4.groups.push({ id: 'g' + (gi2 + 1), name: names[gi2] });
      s.team[cls] = team4;
      var pupils2 = allPupils_(s, cls).filter(function (r) { return str_(r.n); });
      shuffle_(pupils2);
      pupils2.forEach(function (r, idx) {
        var rr = readPupil_(s, cls, str_(r.email));
        if (rr) { rr.g = 'g' + ((idx % n) + 1); writePupil_(s, cls, str_(r.email), rr); }
      });
      save_(s);
      return Promise.resolve({ ok: true });
    }
    if (sub === 'setReveal') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var team5 = getTeam_(s, cls);
      team5.reveal = !!p.revealed;
      save_(s);
      return Promise.resolve({ ok: true });
    }
    if (sub === 'deleteGroup') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var team6 = getTeam_(s, cls);
      team6.groups = team6.groups.filter(function (g) { return str_(g.id) !== str_(p.groupId); });
      allPupils_(s, cls).forEach(function (r) {
        if (str_(r.g) === str_(p.groupId)) {
          var rr2 = readPupil_(s, cls, str_(r.email));
          if (rr2) { rr2.g = ''; writePupil_(s, cls, str_(r.email), rr2); }
        }
      });
      save_(s);
      return Promise.resolve({ ok: true });
    }

    /* ---------- pairing lens mirror (section 12) ---------- */
    if (sub === 'pairs') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var plLessonId = str_(p.lessonId);
      var plYear = classYear_(s, cls);
      return yearManifest_(plYear).then(function (man) {
        var entry = lessonEntry_(man, plLessonId);
        var plNum = entry ? str_(entry.num) : '';
        var plCfg = getCfg_(s, cls);
        var plReg = pairRegD_(s, cls, plLessonId);
        var plQ = pqD_(s, cls, plLessonId);
        var nameOf = {};
        allPupils_(s, cls).forEach(function (r) { nameOf[str_(r.email)] = str_(r.n); });
        nameOf[BOT_EMAIL] = 'the Simulation';
        var plNow = tsecD_();
        var plAssigned = {};
        var pairsOut = Object.keys(plReg.P).map(function (pid) {
          var P = plReg.P[pid];
          if (!num_(P.dis)) (P.m || []).forEach(function (e) { plAssigned[str_(e)] = 1; });
          var ch = chD_(s, pid);
          var msgs = 0, lastMsg = '';
          (ch.ev || []).forEach(function (e2) {
            if (str_(e2[2]) === 'msg') { msgs++; lastMsg = str_(P.cn[num_(e2[1])]) + ': ' + str_(e2[3]); }
          });
          return {
            pid: str_(pid), trio: num_(P.trio), done: num_(P.done), dis: num_(P.dis), t: num_(P.t),
            cn: (P.cn || []).map(str_),
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
        var plPresent = presentOnD_(s, cls, plNum);
        var laggards = [];
        Object.keys(plPresent).forEach(function (e) {
          if (plAssigned[str_(e)]) return;
          if (plPresent[e].ci > num_(plQ.stage)) return;
          laggards.push({ name: str_(nameOf[str_(e)] || e), email: str_(e), ci: num_(plPresent[e].ci), cc: num_(plPresent[e].cc) });
        });
        laggards.sort(function (a, b) { return a.ci - b.ci; });
        save_(s);
        return {
          ok: true, on: num_(plCfg.pairing.on), stage: num_(plQ.stage),
          present: num_(Object.keys(plPresent).length),
          queue: queueOut, pairs: pairsOut, laggards: laggards,
          solo: (plReg.solo || []).map(function (e) { return { name: str_(nameOf[str_(e)] || e), email: str_(e) }; })
        };
      });
    }

    if (sub === 'pairTranscript') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var ptPid = str_(p.pid);
      var ptReg = pairRegD_(s, cls, str_(p.lessonId));
      var ptP = ptReg.P[ptPid];
      if (!ptP) return Promise.resolve({ ok: false, error: 'unknown-pair' });
      var ptCh = chD_(s, ptPid);
      if ((ptCh.ev || []).length) {
        var lines = ptCh.ev.filter(function (e) { return str_(e[2]) === 'msg'; }).map(function (e) {
          return { who: str_(ptP.cn[num_(e[1])]), text: str_(e[3]), t: num_(e[4]) };
        });
        return Promise.resolve({ ok: true, live: true, cn: ptP.cn, names: (ptP.m || []).map(str_), lines: lines });
      }
      var ptChat = chatGetD_(s, cls, str_(p.lessonId));
      var ptStored = ptChat[ptPid];
      if (ptStored) return Promise.resolve({ ok: true, live: false, cn: ptStored.cn, names: ptStored.n, tx: str_(ptStored.tx) });
      return Promise.resolve({ ok: true, live: false, cn: ptP.cn, names: [], tx: '' });
    }

    if (sub === 'pairRelease') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var prReg = pairRegD_(s, cls, str_(p.lessonId));
      var prEmail = str_(p.email).toLowerCase();
      if (pairOfD_(prReg, prEmail)) return Promise.resolve({ ok: false, error: 'already-paired' });
      if (prReg.solo.indexOf(prEmail) === -1) prReg.solo.push(prEmail);
      var prQ = pqD_(s, cls, str_(p.lessonId));
      prQ.q = (prQ.q || []).filter(function (w) { return str_(w.e) !== prEmail; });
      save_(s);
      return Promise.resolve({ ok: true });
    }

    if (sub === 'pairForce') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var pfReg = pairRegD_(s, cls, str_(p.lessonId));
      var pfQ = pqD_(s, cls, str_(p.lessonId));
      var pfNow = tsecD_();
      pfQ.q = (pfQ.q || []).filter(function (w) { return pfNow - num_(w.p) <= PAIR_QUEUE_STALE_S; });
      var made = 0;
      while (pfQ.q.length >= 2) {
        var take = pfQ.q.length === 3 ? 3 : 2;
        var formed = pfQ.q.splice(0, take);
        newPairD_(s, pfReg, formed.map(function (w) { return str_(w.e); }), callsignFillD_(formed), take === 3, false);
        made++;
      }
      if (pfQ.q.length === 1) {
        var lone = pfQ.q.splice(0, 1)[0];
        if (pfReg.solo.indexOf(str_(lone.e)) === -1) pfReg.solo.push(str_(lone.e));
      }
      save_(s);
      return Promise.resolve({ ok: true, made: num_(made) });
    }

    /* AUDIT FIX C-11 - mirrors apiAdmin sub 'pairReset'. Deleting the registry
       stranded every already-paired pupil on a channel that answered
       'not-your-pair' forever; nothing on her screen changed and only a reload
       recovered. Now each unfinished pair is DISSOLVED (P.dis) and its members
       are released to a solo run they can carry straight on with, finished
       pairs are left alone, and the queue is cleared so anyone stuck waiting
       re-joins and is matched again. */
    if (sub === 'pairReset') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var prReg2 = pairRegD_(s, cls, str_(p.lessonId));
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
      var prQ2 = pqD_(s, cls, str_(p.lessonId));
      prQ2.q = [];
      save_(s);
      return Promise.resolve({ ok: true, freed: num_(prFreed), sealed: num_(prSealed) });
    }

    /* Reaction Rally projector feed - mirrors apiAdmin sub 'tournament'.
       Preview extra: p.seed writes plausible rt scores onto every seeded
       persona missing one (single-machine demo of a full-class reveal); the
       staff overlay only offers that button when FakeServer is the transport. */
    if (sub === 'tournament') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      return tnNumFor_(s, cls, p.lessonId).then(function (numStr) {
        if (!numStr) return { ok: false, error: 'unknown-lesson' };
        if (p.seed) {
          var seedScores = [7, 9, 5, 8, 6, 4];
          allPupils_(s, cls).forEach(function (r, i) {
            if (!str_(r.n) || r.email === PUPIL_EMAIL) return;
            var rec = readPupil_(s, cls, r.email);
            var a = larr_(rec, numStr);
            if (/(?:^|;)rt=/.test(str_(a[2]))) return;
            var v = seedScores[i % seedScores.length];
            a[2] = mergeDetail_(a[2], 'rt=' + v + ';rr=' + Math.max(0, v - 2) + '.' + v + '.' + Math.max(0, v - 1));
            if (num_(a[0]) < 1) a[0] = 1;
            a[5] = tmin_();
            writePupil_(s, cls, r.email, rec);
          });
          save_(s);
        }
        var agg = tnAggD_(s, cls, numStr);
        var cfgT = getCfg_(s, cls);
        var out = {
          ok: true,
          revealed: !!agg.team.reveal,
          submitted: num_(agg.submitted),
          roster: num_(agg.roster),
          mode: str_(cfgT.tn.mode),
          unassigned: agg.rows.filter(function (r) { return agg.totals[r.g] == null; }).length,
          teams: (agg.team.groups || []).map(function (g) {
            var subCount = 0;
            agg.rows.forEach(function (r) { if (r.g === str_(g.id)) subCount++; });
            return { id: str_(g.id), name: str_(g.name), total: num_(agg.totals[str_(g.id)]), submitted: subCount };
          })
        };
        if (str_(cfgT.tn.mode) === 'public') {
          out.rows = agg.rows.map(function (r) { return { n: r.n, v: num_(r.v) }; })
            .sort(function (a, b) { return b.v - a.v; });
        }
        return out;
      });
    }

    /* Press Night lens mirror (section 14): full gallery with real names */
    if (sub === 'gallery') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      var gg = galGetD_(s, cls, str_(p.lessonId));
      var nameFor = function (e) {
        if (str_(e) === BOT_EMAIL || str_(e).indexOf('botsim') === 0) return 'the Simulation';
        var r = readPupil_(s, cls, str_(e));
        return str_(r && r.n || e);
      };
      var bySid = {};
      var gStudios = Object.keys(gg.studios).map(function (e) {
        var st = gg.studios[e];
        bySid[str_(st.sid)] = nameFor(e);
        return { sid: str_(st.sid), sn: str_(st.sn || st.cn), name: nameFor(e), cn: str_(st.cn),
          gt: str_(st.gt), gh: str_(st.gh), tpl: str_(st.tpl), rn: num_(st.rn),
          b: num_(st.b) || 0, h: num_(st.h) || 0 };
      });
      var gReviews = gg.reviews.map(function (r) {
        return { i: num_(r.i), byName: nameFor(str_(r.by)), bcn: str_(r.bcn),
          toName: str_(bySid[str_(r.to)] || r.to), toSid: str_(r.to),
          l: str_(r.l), w: str_(r.w), t: num_(r.t), rm: num_(r.rm) || 0, sim: num_(r.sim) || 0 };
      });
      return Promise.resolve({ ok: true, studios: gStudios, reviews: gReviews });
    }
    if (sub === 'galleryHideStudio') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      galMigrateD_(s, cls, str_(p.lessonId));
      var ghs = galGetD_(s, cls, str_(p.lessonId));
      var hitEmail = '';
      Object.keys(ghs.studios).forEach(function (e) { if (str_(ghs.studios[e].sid) === str_(p.sid)) hitEmail = e; });
      if (!hitEmail) return Promise.resolve({ ok: false, error: 'no-studio' });
      var hStu = ghs.studios[hitEmail];
      hStu.h = 1;
      var hNs = shPut_(s, galSBaseD_(cls, str_(p.lessonId)), ghs.ns, hitEmail, hStu);
      galSaveHeadD_(s, cls, str_(p.lessonId), ghs.seq, hNs, ghs.nr, ghs.bots);
      save_(s);
      return Promise.resolve({ ok: true });
    }
    if (sub === 'galleryRemove') {
      if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
      galMigrateD_(s, cls, str_(p.lessonId));
      var grmH = galHeadD_(s, cls, str_(p.lessonId));
      var wantI = num_(p.i);
      var hitRv = shEdit_(s, galRBaseD_(cls, str_(p.lessonId)), grmH.nr,
        function (r) { return num_(r.i) === wantI; },
        function (r) { r.rm = 1; });
      if (!hitRv) return Promise.resolve({ ok: false, error: 'no-review' });
      save_(s);
      return Promise.resolve({ ok: true });
    }

    return Promise.resolve({ ok: false, error: 'unknown-sub' });
  }

  /* Artifact inspection mirror: the preview has no real Drive, so the check is
     SIMULATED (always finds a plausible file, flagged so the engine says so). */
  function doArtifactCheck(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var kind = (Array.isArray(p.kinds) && p.kinds.length) ? str_(p.kinds[0]) : 'hex';
    return Promise.resolve({ ok: true, found: true, name: 'my-first-build.' + kind, ageMin: 2, simulated: true });
  }

  /* ==================== auto-pairing + Comms Channel mirror (section 12) ====
     Mirrors Code.gs.template's pairing surface against the shared localStorage
     blob, so two same-origin tabs (?as=anya / ?as=cara) are two REAL paired
     pupils. Waiting alone > 8s spawns a simulated partner bot ("Pixel") that
     chats, takes its turns via dev-keys, and fumbles one drop on purpose so
     the return path shows - single-tab demos stay complete. */
  var PAIR_PRESENT_MIN = 10, PAIR_QUEUE_STALE_S = 45, PAIR_MSG_MAX = 240, PAIR_EV_KEEP = 150, PAIR_TX_MAX = 500;
  var BOT_WAIT_S = 8;
  var PAIR_CALLSIGNS = ['Kestrel', 'Osprey', 'Merlin', 'Harrier', 'Nightjar', 'Skylark'];
  function tsecD_() { return Math.floor(Date.now() / 1000); }
  function plKey_(cls, lessonId) { return cls + '|' + lessonId; }
  function pairRegD_(s, cls, lessonId) {
    if (!s.pairing) s.pairing = {};
    var k = plKey_(cls, lessonId);
    if (!s.pairing[k]) s.pairing[k] = { P: {}, solo: [] };
    if (!s.pairing[k].P) s.pairing[k].P = {};
    if (!s.pairing[k].solo) s.pairing[k].solo = [];
    return s.pairing[k];
  }
  function pqD_(s, cls, lessonId) {
    if (!s.pq) s.pq = {};
    var k = plKey_(cls, lessonId);
    if (!s.pq[k]) s.pq[k] = { q: [], stage: 0 };
    return s.pq[k];
  }
  function chD_(s, pid) {
    if (!s.pch) s.pch = {};
    if (!s.pch[pid]) s.pch[pid] = { seq: 0, ev: [], ls: {}, bot: null };
    return s.pch[pid];
  }
  function presD_(s, cls) {
    if (!s.pres) s.pres = {};
    if (!s.pres[cls]) s.pres[cls] = {};
    return s.pres[cls];
  }
  /* AUDIT FIX C-11: mirrors Code.gs.template. pairAnyD_ still finds a pair the
     teacher has dissolved (the channel poll needs it, to TELL her); pairOfD_
     skips dissolved pairs so she is free to run solo / be re-matched. */
  function pairAnyD_(reg, email) {
    var pids = Object.keys(reg.P);
    for (var i = 0; i < pids.length; i++) {
      var m = reg.P[pids[i]].m || [];
      for (var j = 0; j < m.length; j++) if (str_(m[j]) === email) return { pid: pids[i], mi: j };
    }
    return null;
  }
  function pairOfD_(reg, email) {
    var hit = pairAnyD_(reg, email);
    if (hit && num_(reg.P[hit.pid].dis)) return null;
    return hit;
  }
  function presentOnD_(s, cls, numStr) {
    var pres = presD_(s, cls);
    var floor = tmin_() - PAIR_PRESENT_MIN;
    var out = {};
    Object.keys(pres).forEach(function (e) {
      var pr = pres[e];
      if (pr && num_(pr[0]) >= floor && str_(pr[1]) === numStr) out[e] = { ci: num_(pr[2]), cc: num_(pr[3]) };
    });
    return out;
  }
  function pairStateD_(reg, hit) {
    var P = reg.P[hit.pid];
    return {
      ok: true, state: 'paired', pid: str_(hit.pid), mi: num_(hit.mi),
      trio: num_(P.trio), done: num_(P.done), rv: num_(P.rv),
      members: (P.cn || []).map(str_),
      names: num_(P.rv) ? (P.n || []).map(str_) : null
    };
  }
  function callsignFillD_(formed) {
    var seed = Math.floor(Math.random() * PAIR_CALLSIGNS.length);
    return formed.map(function (w, i) { return str_(w.cn) || PAIR_CALLSIGNS[(seed + i) % PAIR_CALLSIGNS.length]; });
  }
  function newPairD_(s, reg, members, cns, trio, bot) {
    var pid = 'p' + tmin_() + '-' + Math.floor(Math.random() * 10000);
    reg.P[pid] = { m: members, cn: cns, t: tmin_(), trio: trio ? 1 : 0, done: 0, rv: 0, bot: bot ? 1 : 0 };
    var ch = chD_(s, pid);
    if (bot) ch.bot = { startS: tsecD_(), greeted: 0, wrongUsed: 0, msgKey: -1, msgAtS: 0, reactKey: -1, plan: null };
    return pid;
  }

  function doPing(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    presD_(s, cls)[PUPIL_EMAIL] = [tmin_(), str_(p.lessonNum || ''), num_(p.ci), num_(p.cc)];
    save_(s);
    return Promise.resolve({ ok: true });
  }

  function doPairJoin(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var cfg = getCfg_(s, cls);
    if (!num_(cfg.pairing.on)) { return Promise.resolve({ ok: true, state: 'off' }); }
    var lessonId = str_(p.lessonId);
    var year = classYear_(s, cls);
    return yearManifest_(year).then(function (man) {
      var entry = lessonEntry_(man, lessonId);
      var numStr = entry ? str_(entry.num) : '';
      if (!numStr || !lessonAccessible_(s, cls, numStr)) return { ok: false, error: 'locked' };
      var reg = pairRegD_(s, cls, lessonId);
      var hit = pairOfD_(reg, PUPIL_EMAIL);
      if (hit) { save_(s); return pairStateD_(reg, hit); }
      if (reg.solo.indexOf(PUPIL_EMAIL) !== -1) { save_(s); return { ok: true, state: 'solo' }; }
      var q = pqD_(s, cls, lessonId);
      q.stage = num_(p.stageIdx);
      var nowS = tsecD_();
      q.q = (q.q || []).filter(function (w) { return nowS - num_(w.p) <= PAIR_QUEUE_STALE_S; });
      var mine = null;
      q.q.forEach(function (w) { if (str_(w.e) === PUPIL_EMAIL) mine = w; });
      if (mine) mine.p = nowS;
      else {
        var rec = readPupil_(s, cls, PUPIL_EMAIL);
        mine = { e: PUPIL_EMAIL, cn: str_(rec && rec.cn || ''), t: nowS, p: nowS };
        q.q.push(mine);
      }
      // expected = queued + live-present pupils still short of the stage
      var assigned = {};
      Object.keys(reg.P).forEach(function (pid) {
        if (num_(reg.P[pid].dis)) return;   // dissolved (C-11): free again
        (reg.P[pid].m || []).forEach(function (e) { assigned[str_(e)] = 1; });
      });
      reg.solo.forEach(function (e) { assigned[str_(e)] = 1; });
      var expected = {};
      q.q.forEach(function (w) { expected[str_(w.e)] = 1; });
      var present = presentOnD_(s, cls, numStr);
      Object.keys(present).forEach(function (e) {
        if (assigned[e]) return;
        if (present[e].ci > num_(q.stage)) return;
        expected[e] = 1;
      });
      var E = Object.keys(expected).length;
      if (q.q.length >= 3 && E === 3) {
        var trioF = q.q.splice(0, 3);
        newPairD_(s, reg, trioF.map(function (w) { return str_(w.e); }), callsignFillD_(trioF), true, false);
      } else if (q.q.length >= 2 && E !== 3) {
        var pairF = q.q.splice(0, 2);
        newPairD_(s, reg, pairF.map(function (w) { return str_(w.e); }), callsignFillD_(pairF), false, false);
      } else if (q.q.length === 1 && E <= 1 && nowS - num_(mine.t) >= BOT_WAIT_S) {
        // preview twist: a lone agent gets the simulated partner, never insta-solo
        q.q.splice(0, 1);
        newPairD_(s, reg, [PUPIL_EMAIL, BOT_EMAIL], [callsignFillD_([mine])[0], 'Pixel (simulated)'], false, true);
      }
      save_(s);
      var hit2 = pairOfD_(reg, PUPIL_EMAIL);
      if (hit2) return pairStateD_(reg, hit2);
      var pos = 0;
      q.q.forEach(function (w, i) { if (str_(w.e) === PUPIL_EMAIL) pos = i + 1; });
      return { ok: true, state: 'wait', pos: num_(pos), waiting: num_(q.q.length), expected: num_(E), trioHold: E === 3 ? 1 : 0 };
    });
  }

  function appendEvD_(ch, mi, kind, text) {
    ch.seq = num_(ch.seq) + 1;
    ch.ev.push([ch.seq, num_(mi), str_(kind), str_(text), tsecD_()]);
    if (ch.ev.length > PAIR_EV_KEEP) ch.ev = ch.ev.slice(ch.ev.length - PAIR_EV_KEEP);
    return ch.seq;
  }

  function doPairSend(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var kind = str_(p.kind);
    if (kind !== 'msg' && kind !== 'drop' && kind !== 'done') return Promise.resolve({ ok: false, error: 'bad-kind' });
    var text = str_(p.text).replace(/[\u0000-\u001f]/g, ' ').slice(0, PAIR_MSG_MAX);
    if (kind === 'msg' && !text.trim()) return Promise.resolve({ ok: false, error: 'empty' });
    var reg = pairRegD_(s, cls, str_(p.lessonId));
    var hit = pairOfD_(reg, PUPIL_EMAIL);
    if (!hit || str_(hit.pid) !== str_(p.pid)) return Promise.resolve({ ok: false, error: 'not-your-pair' });
    var ch = chD_(s, str_(p.pid));
    if (kind === 'msg') {
      var last = num_(ch.ls[hit.mi]);
      if (last && tsecD_() - last < 1) return Promise.resolve({ ok: false, error: 'too-fast' });
      ch.ls[hit.mi] = tsecD_();
    }
    var seq = appendEvD_(ch, hit.mi, kind, text);
    save_(s);
    return Promise.resolve({ ok: true, seq: num_(seq) });
  }

  /* ---- the simulated partner's brain: runs inside the pupil's channel polls ---- */
  function botThink_(s, cls, lessonId, pid, P, ch, year) {
    if (!ch.bot) return Promise.resolve(false);
    var acted = false;
    var nowS = tsecD_();
    if (!ch.bot.greeted && nowS - num_(ch.bot.startS) >= 2) {
      ch.bot.greeted = 1;
      acted = true;
      appendEvD_(ch, 1, 'msg', 'Pixel here. HQ says we crack this Vault together - you take the first drop, talk me through it!');
    }
    var drops = ch.ev.filter(function (e) { return str_(e[2]) === 'drop'; });
    var dropCount = drops.length;
    var placed = {};
    drops.forEach(function (e) {
      var seg = str_(e[3]).split('|');
      if (num_(seg[2]) === 1) placed[str_(seg[0])] = true;
    });
    var lastDrop = drops[drops.length - 1] || null;
    // sympathy when the pupil's drop bounces
    if (lastDrop && num_(lastDrop[1]) === 0 && str_(lastDrop[3]).split('|')[2] === '0' && ch.bot.reactKey !== dropCount) {
      ch.bot.reactKey = dropCount;
      acted = true;
      appendEvD_(ch, 1, 'msg', 'The Vault bounced it! Hmm - read the label again, where else could it live?');
    }
    var botsTurn = dropCount % 2 === 1; // members: [pupil 0, bot 1]
    if (!botsTurn) {
      if (ch.bot.msgKey !== -1 || ch.bot.plan) { ch.bot.msgKey = -1; ch.bot.plan = null; acted = true; }
      return Promise.resolve(acted);
    }
    return vaultBotInfo_(s, year, lessonId).then(function (info) {
      if (!info || !info.map || !info.cfg) return acted;
      var files = info.cfg.files || [], folders = info.cfg.folders || [];
      var target = null;
      for (var i = 0; i < files.length; i++) if (!placed[str_(files[i].id)]) { target = files[i]; break; }
      if (!target) return acted;
      var correct = str_(info.map[str_(target.id)]);
      var wrongFolder = null;
      for (var j = 0; j < folders.length; j++) if (str_(folders[j].id) !== correct) { wrongFolder = folders[j]; break; }
      var goWrong = !ch.bot.wrongUsed && wrongFolder;
      var destId = goWrong ? str_(wrongFolder.id) : correct;
      var destLabel = '';
      folders.forEach(function (fo) { if (str_(fo.id) === destId) destLabel = str_(fo.label); });
      if (ch.bot.msgKey !== dropCount) {
        ch.bot.msgKey = dropCount;
        ch.bot.msgAtS = nowS;
        ch.bot.plan = { f: str_(target.id), d: destId, ok: !goWrong };
        appendEvD_(ch, 1, 'msg', (goWrong
          ? 'My turn! Maybe "' + str_(target.label) + '" goes in ' + destLabel + '? Dropping it - shout if you disagree!'
          : 'My turn. I reckon "' + str_(target.label) + '" belongs in ' + destLabel + ' - agree? Dropping it now.'));
        return true;
      }
      if (ch.bot.plan && nowS - num_(ch.bot.msgAtS) >= 3) {
        var plan = ch.bot.plan;
        ch.bot.plan = null;
        var att = 1;
        drops.forEach(function (e) {
          var seg = str_(e[3]).split('|');
          if (str_(seg[0]) === plan.f) att = Math.max(att, num_(seg[3]) + 1);
        });
        appendEvD_(ch, 1, 'drop', plan.f + '|' + plan.d + '|' + (plan.ok ? 1 : 0) + '|' + att);
        if (!plan.ok) {
          ch.bot.wrongUsed = 1;
          appendEvD_(ch, 1, 'msg', 'Ouch - the Vault said NO. Wrong shelf! Okay - read the label again... your go, Agent.');
        }
        return true;
      }
      return acted;
    });
  }
  var botInfoCache = null;
  function vaultBotInfo_(s, year, lessonId) {
    if (botInfoCache) return Promise.resolve(botInfoCache);
    return yearManifest_(year).then(function (man) {
      var entry = lessonEntry_(man, lessonId);
      if (!entry) return null;
      return fetchContent_(str_(entry.file)).then(function (lesson) {
        var vcfg = null;
        (lesson.chunks || []).forEach(function (chk) { if (str_(chk.engine) === 'vault') vcfg = chk.config; });
        return devKeysAll_().then(function (allKeys) {
          var keys = allKeys && allKeys[fileIdOf_(entry)];
          var map = keys && keys.vault && keys.vault.map || null;
          botInfoCache = { cfg: vcfg, map: map };
          return botInfoCache;
        });
      });
    }).catch(function () { return null; });
  }

  function doPairChannel(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var lessonId = str_(p.lessonId);
    var reg = pairRegD_(s, cls, lessonId);
    var hit = pairAnyD_(reg, PUPIL_EMAIL);   // C-11: a dissolved pair must still answer
    if (!hit || str_(hit.pid) !== str_(p.pid)) return Promise.resolve({ ok: false, error: 'not-your-pair' });
    if (num_(reg.P[hit.pid].dis)) {
      return Promise.resolve({ ok: true, dis: 1, seq: num_(p.since), ev: [], live: [], done: 0, rv: 0 });
    }
    var P = reg.P[hit.pid];
    var pid = str_(hit.pid);
    var ch = chD_(s, pid);
    // liveness beacons live OUTSIDE the blob: two tabs each rewrite the whole
    // blob on every poll, so in-blob beacons clobber each other (last-write-
    // wins) and partners flap "stale". Per-key writes never collide.
    try { localStorage.setItem('ks3dt-dev-pls:' + pid + ':' + hit.mi, String(tsecD_())); } catch (e) {}
    var year = classYear_(s, cls);
    return botThink_(s, cls, lessonId, pid, P, ch, year).then(function (botActed) {
      var since = num_(p.since);
      var ev = ch.ev.filter(function (e) { return num_(e[0]) > since; });
      var live = (P.m || []).map(function (m, mi2) {
        if (mi2 === hit.mi) return 1;
        if (num_(P.bot)) return 1; // the simulation never loses signal
        var b = 0;
        try { b = num_(localStorage.getItem('ks3dt-dev-pls:' + pid + ':' + mi2)); } catch (e) {}
        if (!b) return tmin_() - num_(P.t) <= 2 ? 1 : 0; // formation grace
        return tsecD_() - b <= 45 ? 1 : 0;
      });
      if (botActed) save_(s); // plain polls stay read-only on the shared blob
      return {
        ok: true, seq: num_(ch.seq), ev: ev, live: live,
        done: num_(P.done), rv: num_(P.rv),
        names: num_(P.rv) ? (P.n || []).map(str_) : null
      };
    });
  }

  function doPairComplete(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var lessonId = str_(p.lessonId);
    var reg = pairRegD_(s, cls, lessonId);
    var hit = pairOfD_(reg, PUPIL_EMAIL);
    if (!hit || str_(hit.pid) !== str_(p.pid)) return Promise.resolve({ ok: false, error: 'not-your-pair' });
    var P = reg.P[hit.pid];
    if (num_(P.done)) return Promise.resolve({ ok: true, names: (P.n || []).map(str_) });
    var names = (P.m || []).map(function (e) {
      if (str_(e) === BOT_EMAIL) return 'the Simulation';
      var r = readPupil_(s, cls, str_(e));
      return str_(r && r.n || '').split(' ')[0] || 'Agent';
    });
    P.done = 1; P.rv = 1; P.n = names;
    var ch = chD_(s, str_(hit.pid));
    var msgs = ch.ev.filter(function (e) { return str_(e[2]) === 'msg'; });
    var counts = (P.m || []).map(function () { return 0; });
    msgs.forEach(function (e) { counts[num_(e[1])] = num_(counts[num_(e[1])]) + 1; });
    var tx = msgs.map(function (e) { return str_(P.cn[num_(e[1])]) + ': ' + str_(e[3]); }).join(' / ');
    if (tx.length > PAIR_TX_MAX) tx = tx.slice(0, Math.floor(PAIR_TX_MAX * 0.6)) + ' [...] ' + tx.slice(tx.length - Math.floor(PAIR_TX_MAX * 0.35));
    /* AUDIT B-01: transcripts are sharded like the gallery - the old single
       value reached ~10 KB at 15 chatty pairs and its real-server write sits in
       a swallowing try/catch, so the last pairs' safeguarding records vanished
       with no error anywhere. */
    chatMigrateD_(s, cls, lessonId);
    var chH = chatHeadD_(s, cls, lessonId);
    if (shMap_(s, chatSBaseD_(cls, lessonId), chH.nc)[str_(hit.pid)] === undefined) {
      var nc = shPut_(s, chatSBaseD_(cls, lessonId), chH.nc, str_(hit.pid),
        { m: (P.m || []).map(str_), cn: (P.cn || []).map(str_), n: names, t: num_(P.t), c: counts, tx: tx });
      pSet_(s, chatKeyD_(cls, lessonId), { v: 2, nc: nc });
    }
    save_(s);
    return Promise.resolve({ ok: true, names: names });
  }

  /* ---------- section 14: Press Night gallery (mirrors Code.gs.template) ----------
     Two same-origin tabs (?as=anya / ?as=cara) are a REAL exhibitor + critic.
     Single-tab preview stays complete via SIMULATED studios (something to
     review) and a simulated critic that files kind/specific/helpful reviews
     against YOUR listing after a short delay - both flagged sim:1 on the wire
     and labelled on screen, same honesty rule as the section-12 partner bot. */
  var GAL_TITLE_MAX = 28, GAL_HOW_MAX = 90, GAL_REVIEW_MAX = 200, GAL_REVIEWS_PER_CRITIC = 3;
  /* AUDIT B-01: sharded exactly as Code.gs.template shards it -
       gal:<cls>:<lesson>      head    {v:2, seq, ns, nr, bots}
       gals:<cls>:<lesson>:<i> studios {email: studio}
       galr:<cls>:<lesson>:<i> reviews [review, ...]
     Legacy s.gal blobs from a browser that ran the pre-fix preview are read once
     and migrated into shards, so an open preview tab keeps its Press Night. */
  function chatKeyD_(cls, lessonId) { return 'chat:' + plKey_(cls, lessonId); }
  function chatSBaseD_(cls, lessonId) { return 'chats:' + plKey_(cls, lessonId); }
  function chatHeadD_(s, cls, lessonId) {
    var h = pGet_(s, chatKeyD_(cls, lessonId), null) || {};
    return { v: num_(h.v), nc: num_(h.nc), legacy: (s.chat || {})[plKey_(cls, lessonId)] || null };
  }
  function chatGetD_(s, cls, lessonId) {
    var h = chatHeadD_(s, cls, lessonId);
    var out = shMap_(s, chatSBaseD_(cls, lessonId), h.nc);
    if (h.legacy) Object.keys(h.legacy).forEach(function (p) { if (out[p] === undefined) out[p] = h.legacy[p]; });
    return out;
  }
  function chatMigrateD_(s, cls, lessonId) {
    var h = chatHeadD_(s, cls, lessonId);
    if (!h.legacy) return h;
    var base = chatSBaseD_(cls, lessonId), nc = h.nc;
    Object.keys(h.legacy).forEach(function (p) { nc = shPut_(s, base, nc, p, h.legacy[p]); });
    if (s.chat) delete s.chat[plKey_(cls, lessonId)];
    pSet_(s, chatKeyD_(cls, lessonId), { v: 2, nc: nc });
    return { v: 2, nc: nc, legacy: null };
  }
  function galKeyD_(cls, lessonId) { return 'gal:' + plKey_(cls, lessonId); }
  function galSBaseD_(cls, lessonId) { return 'gals:' + plKey_(cls, lessonId); }
  function galRBaseD_(cls, lessonId) { return 'galr:' + plKey_(cls, lessonId); }
  function galHeadD_(s, cls, lessonId) {
    var h = pGet_(s, galKeyD_(cls, lessonId), null) || {};
    var legacy = (s.gal || {})[plKey_(cls, lessonId)] || null;
    return {
      v: num_(h.v), seq: num_(h.seq), ns: num_(h.ns), nr: num_(h.nr), bots: num_(h.bots),
      legacy: legacy
    };
  }
  function galGetD_(s, cls, lessonId) {
    var h = galHeadD_(s, cls, lessonId);
    var studios = shMap_(s, galSBaseD_(cls, lessonId), h.ns);
    var reviews = shList_(s, galRBaseD_(cls, lessonId), h.nr);
    if (h.legacy) {
      Object.keys(h.legacy.studios || {}).forEach(function (e) {
        if (studios[e] === undefined) studios[e] = h.legacy.studios[e];
      });
      if ((h.legacy.reviews || []).length) reviews = h.legacy.reviews.concat(reviews);
      if (!h.seq) h.seq = num_(h.legacy.seq);
      if (!h.bots) h.bots = num_(h.legacy.bots);
    }
    return { seq: num_(h.seq), ns: h.ns, nr: h.nr, bots: num_(h.bots), studios: studios, reviews: reviews };
  }
  function galSaveHeadD_(s, cls, lessonId, seq, ns, nr, bots) {
    pSet_(s, galKeyD_(cls, lessonId), { v: 2, seq: num_(seq), ns: num_(ns), nr: num_(nr), bots: num_(bots) });
  }
  function galMigrateD_(s, cls, lessonId) {
    var h = galHeadD_(s, cls, lessonId);
    if (!h.legacy) return h;
    var sBase = galSBaseD_(cls, lessonId), rBase = galRBaseD_(cls, lessonId);
    var ns = h.ns, nr = h.nr;
    Object.keys(h.legacy.studios || {}).forEach(function (e) { ns = shPut_(s, sBase, ns, e, h.legacy.studios[e]); });
    (h.legacy.reviews || []).forEach(function (r) { nr = shPush_(s, rBase, nr, r); });
    var seq = num_(h.seq) || num_(h.legacy.seq);
    var bots = num_(h.bots) || num_(h.legacy.bots);
    if (s.gal) delete s.gal[plKey_(cls, lessonId)];
    galSaveHeadD_(s, cls, lessonId, seq, ns, nr, bots);
    return { v: 2, seq: seq, ns: ns, nr: nr, bots: bots, legacy: null };
  }
  function galCleanD_(v, max) {
    return str_(v).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function galSigD_(s, cls, email) {
    var rec = readPupil_(s, cls, email);
    var cn = str_(rec && rec.cn || '');
    return cn ? ('Agent ' + cn) : (str_(rec && rec.n || '').split(' ')[0] || 'A critic');
  }
  var GAL_BOT_STUDIOS = [
    { sid: 'simA', sn: 'Comet Collective', cn: 'Simulated studio', gt: 'Comet Catch', gh: 'Arrow keys move the tray. Catch comets, dodge nothing - yet.', tpl: 'catch' },
    { sid: 'simB', sn: 'Bramble Interactive', cn: 'Simulated studio', gt: 'Hedge Havoc', gh: 'Guide the snail out. Walls bite. Three dewdrops open the gate.', tpl: 'maze' },
    { sid: 'simC', sn: 'Quizzical Fox', cn: 'Simulated studio', gt: 'True Colours', gh: 'Read the claim, tap T or F. Three rounds, no second guesses.', tpl: 'quiz' }
  ];
  function galBotReviewsFor_(stu) {
    var tpl = str_(stu.tpl), gt = str_(stu.gt) || 'your game';
    if (tpl === 'maze') return [
      { l: 'how ' + gt + ' makes you plan a route instead of just wandering - the last star is hidden really cleverly', w: 'whether a timer would make escaping feel even more daring' },
      { l: 'that the door actually checks your stars before it opens - it feels like a real rule, not decoration', w: 'what a level 2 maze with a moving guard would be like' }
    ];
    if (tpl === 'quiz') return [
      { l: 'that the questions in ' + gt + ' sound like the maker wrote them - the wrong-answer reply made me laugh', w: 'what a super-hard final question would look like' },
      { l: 'how the score keeps up with every answer so you always know how you are doing', w: 'whether a two-player mode could work with a second set of tiles' }
    ];
    return [
      { l: 'how ' + gt + ' makes every drop feel urgent - losing a life for a miss is a real consequence', w: 'what a golden apple worth three points would do to the game' },
      { l: 'that the game actually ends when your lives run out instead of just going on forever', w: 'whether the falling could speed up as your score grows' }
    ];
  }
  /* the simulated room: bot studios appear once the gallery is first polled;
     two bot reviews land on YOUR studio ~10s and ~22s after you open it */
  function galBotThink_(s, cls, lessonId, g) {
    var changed = false;
    var sBase = galSBaseD_(cls, lessonId), rBase = galRBaseD_(cls, lessonId);
    var ns = g.ns, nr = g.nr, seq = num_(g.seq), bots = num_(g.bots);
    if (!bots) {
      GAL_BOT_STUDIOS.forEach(function (b) {
        seq += 1;
        var stu = { sid: b.sid, sn: b.sn, cn: b.cn, gt: b.gt, gh: b.gh, tpl: b.tpl,
          ts: tmin_(), rn: 0, sim: 1 };
        g.studios['bot' + b.sid + '@demo'] = stu;
        ns = shPut_(s, sBase, ns, 'bot' + b.sid + '@demo', stu);
      });
      bots = 1;
      changed = true;
    }
    var mine = g.studios[PUPIL_EMAIL];
    if (mine) {
      if (!mine.openedS) { mine.openedS = tsecD_(); changed = true; }
      var elapsed = tsecD_() - num_(mine.openedS);
      var botRevs = g.reviews.filter(function (r) { return num_(r.sim) && str_(r.to) === str_(mine.sid); });
      var wanted = galBotReviewsFor_(mine);
      var due = (elapsed >= 22 ? 2 : (elapsed >= 10 ? 1 : 0));
      for (var i = botRevs.length; i < due && i < wanted.length; i++) {
        seq += 1;
        var rev = {
          i: seq, by: BOT_EMAIL, bcn: 'Press Bot (simulated)', to: str_(mine.sid),
          l: wanted[i].l, w: wanted[i].w, t: tmin_(), rm: 0, sim: 1
        };
        g.reviews.push(rev);
        nr = shPush_(s, rBase, nr, rev);
        mine.rn = num_(mine.rn) + 1;
        changed = true;
      }
      if (changed) ns = shPut_(s, sBase, ns, PUPIL_EMAIL, mine);
    }
    if (changed) {
      g.seq = seq; g.ns = ns; g.nr = nr; g.bots = bots;
      galSaveHeadD_(s, cls, lessonId, seq, ns, nr, bots);
    }
    return changed;
  }
  function doGalleryOpen(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var lessonId = str_(p.lessonId);
    return tnNumFor_(s, cls, lessonId).then(function (numStr) {
      if (!numStr || !lessonAccessible_(s, cls, numStr)) return { ok: false, error: 'locked' };
      var gt = galCleanD_(p.gt, GAL_TITLE_MAX);
      var gh = galCleanD_(p.gh, GAL_HOW_MAX);
      var snIn = galCleanD_(p.sn, 24);
      if (!gt) return { ok: false, error: 'no-title' };
      galMigrateD_(s, cls, lessonId);
      var h = galHeadD_(s, cls, lessonId);
      var sBase = galSBaseD_(cls, lessonId);
      var mine = shMap_(s, sBase, h.ns)[PUPIL_EMAIL];
      var seq = num_(h.seq) + 1;
      var stu = {
        sid: str_(mine && mine.sid) || ('s' + seq),
        sn: snIn || galSigD_(s, cls, PUPIL_EMAIL),
        cn: galSigD_(s, cls, PUPIL_EMAIL),
        gt: gt, gh: gh, tpl: str_(p.tpl).slice(0, 8),
        b: num_(p.beta) ? 1 : 0,
        h: num_(mine && mine.h),
        ts: num_(mine && mine.ts) || tmin_(),
        rn: num_(mine && mine.rn),
        openedS: num_(mine && mine.openedS)
      };
      var ns = shPut_(s, sBase, h.ns, PUPIL_EMAIL, stu);   // shard first, then head
      galSaveHeadD_(s, cls, lessonId, seq, ns, h.nr, h.bots);
      save_(s);
      return { ok: true, sid: str_(stu.sid) };
    });
  }
  function doGalleryPost(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var lessonId = str_(p.lessonId);
    var like = galCleanD_(p.like, GAL_REVIEW_MAX);
    var wonder = galCleanD_(p.wonder, GAL_REVIEW_MAX);
    if (like.length < 8 || wonder.length < 8) return Promise.resolve({ ok: false, error: 'too-thin' });
    galMigrateD_(s, cls, lessonId);
    var g = galGetD_(s, cls, lessonId);
    var toSid = str_(p.to);
    var toEmail = '';
    Object.keys(g.studios).forEach(function (e) { if (str_(g.studios[e].sid) === toSid) toEmail = e; });
    if (!toEmail) return Promise.resolve({ ok: false, error: 'no-studio' });
    if (toEmail === PUPIL_EMAIL) return Promise.resolve({ ok: false, error: 'own-studio' });
    /* AUDIT FIX (26 Jul 2026): mirrors Code.gs.template - removed reviews must
       not burn a press pass (they are already skipped by the feed's 'given'). */
    var mine = g.reviews.filter(function (r) { return str_(r.by) === PUPIL_EMAIL && !num_(r.rm); });
    if (mine.length >= GAL_REVIEWS_PER_CRITIC) return Promise.resolve({ ok: false, error: 'passes-spent' });
    if (mine.some(function (r) { return str_(r.to) === toSid; })) return Promise.resolve({ ok: false, error: 'already-reviewed' });
    var seq = num_(g.seq) + 1;
    var review = {
      i: seq, by: PUPIL_EMAIL, bcn: galSigD_(s, cls, PUPIL_EMAIL),
      to: toSid, l: like, w: wonder, t: tmin_(), rm: 0
    };
    var maker = g.studios[toEmail];
    maker.rn = num_(maker.rn) + 1;
    var nrP = shPush_(s, galRBaseD_(cls, lessonId), g.nr, review);   // shards first
    var nsP = shPut_(s, galSBaseD_(cls, lessonId), g.ns, toEmail, maker);
    galSaveHeadD_(s, cls, lessonId, seq, nsP, nrP, g.bots);
    save_(s);
    return Promise.resolve({ ok: true, given: mine.length + 1 });
  }
  function doGalleryFeed(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    galMigrateD_(s, cls, str_(p.lessonId));
    var g = galGetD_(s, cls, str_(p.lessonId));
    if (galBotThink_(s, cls, str_(p.lessonId), g)) save_(s);
    var mySid = str_(g.studios[PUPIL_EMAIL] && g.studios[PUPIL_EMAIL].sid || '');
    var studios = [];
    Object.keys(g.studios).forEach(function (e) {
      var st = g.studios[e];
      var mine = e === PUPIL_EMAIL ? 1 : 0;
      if (num_(st.h) && !mine) return;
      studios.push({ sid: str_(st.sid), sn: str_(st.sn || st.cn), cn: str_(st.cn), gt: str_(st.gt), gh: str_(st.gh),
        tpl: str_(st.tpl), rn: num_(st.rn), mine: mine, sim: num_(st.sim) || 0,
        b: num_(st.b) || 0, hd: mine ? (num_(st.h) || 0) : 0 });
    });
    var myReviews = [];
    var total = 0, given = 0;
    g.reviews.forEach(function (r) {
      if (num_(r.rm)) return;
      total++;
      if (str_(r.by) === PUPIL_EMAIL) given++;
      if (mySid && str_(r.to) === mySid) {
        myReviews.push({ i: num_(r.i), bcn: str_(r.bcn), l: str_(r.l), w: str_(r.w), t: num_(r.t), sim: num_(r.sim) || 0 });
      }
    });
    return Promise.resolve({ ok: true, seq: num_(g.seq), open: mySid ? 1 : 0, studios: studios,
      myReviews: myReviews, total: total, given: given, studioCount: studios.length });
  }

  /* ---------- dispatcher ---------- */
  function route_(p) {
    switch (str_(p.action)) {
      case 'whoami': return doWhoAmI(p);
      case 'join': return doJoin(p);
      case 'state': return doState(p);
      case 'recapStart': return doRecapStart(p);
      case 'recapAnswer': return doRecapAnswer(p);
      case 'mark': return doMark(p);
      case 'lessonKeys': return doLessonKeys(p);
      case 'vaultInfo': return doVaultInfo(p);
      case 'board': return doBoard(p);
      case 'tournament': return doTournament(p);
      case 'saveEvent': return doSaveEvent(p);
      case 'loadDraft': return doLoadDraft(p);
      case 'submitExit': return doSubmitExit(p);
      case 'submitBaseline': return doSubmitBaseline(p);
      case 'catchup': return doCatchup(p);
      case 'setKit': return doSetKit(p);
      case 'driveCheck': return doDriveCheck(p);
      case 'artifactCheck': return doArtifactCheck(p);
      case 'ping': return doPing(p);
      case 'pairJoin': return doPairJoin(p);
      case 'pairSend': return doPairSend(p);
      case 'pairChannel': return doPairChannel(p);
      case 'pairComplete': return doPairComplete(p);
      case 'galleryOpen': return doGalleryOpen(p);
      case 'galleryPost': return doGalleryPost(p);
      case 'galleryFeed': return doGalleryFeed(p);
      case 'admin': return doAdmin(p);
      default: return Promise.resolve({ ok: false, error: 'unknown-action' });
    }
  }

  global.OLS_DEV_SERVER = {
    call: function (p) {
      p = p || {};
      return new Promise(function (resolve) {
        function respond(r) { setTimeout(function () { resolve(r); }, LATENCY); }
        /* AUDIT B-01: a value past the real 9,216-byte ScriptProperties ceiling
           throws on Apps Script and the caller returns store-full. Preview now
           does the same instead of accepting a write no real server would take -
           so an over-cap bug fails HERE, in a QA run, and not in the room. */
        function fail(err) {
          if (err && err.ks3dtStoreFull) {
            try { console.error('[FakeServer] ' + String(err.message)); } catch (e) {}
            return respond({ ok: false, error: 'store-full' });
          }
          respond({ ok: false, error: 'dev-server-exception', message: String(err && err.message || err) });
        }
        try {
          route_(p).then(respond, fail);
        } catch (err) {
          fail(err);
        }
      });
    }
  };

  /* ---------- PREVIEW pill: never let anyone mistake this for the live app ---------- */
  function injectPreviewPill_() {
    if (global.OLS_TRANSPORT && typeof global.OLS_TRANSPORT.call === 'function') return; // real transport present
    var pill = document.createElement('div');
    pill.textContent = 'PREVIEW \u00b7 ' + str_(PUPIL_NAME).split(' ')[0];
    pill.setAttribute('style',
      'position:fixed;left:12px;bottom:12px;z-index:99999;' +
      'background:#1A3A6B;color:#F4F6FA;font:600 11px/1 -apple-system,system-ui,sans-serif;' +
      'letter-spacing:.06em;padding:6px 10px;border-radius:999px;opacity:.82;' +
      'pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.25);');
    document.body.appendChild(pill);
  }
  global.addEventListener('DOMContentLoaded', injectPreviewPill_);

  /* ---------- AUDIT FIX C-14: say it out loud when nothing is being marked ----------
     dev-keys.json is git-ignored, so on the published github.io copy every
     marking call falls back to "correct" (see devKeysAll_ / FALLBACK_EXPLAIN).
     Until now that was SILENT: a teacher sent the github.io link instead of the
     /exec one would rehearse a whole lesson in which nobody can be wrong, see no
     fail states, and sign it off. The banner below is deliberately unmissable
     and cannot be dismissed - the only cure is the real app. */
  function injectNoKeysBanner_() {
    if (document.getElementById('ks3dt-nokeys')) return;
    var bar = document.createElement('div');
    bar.id = 'ks3dt-nokeys';
    bar.setAttribute('role', 'alert');
    bar.textContent = 'PREVIEW — answers are not being marked here. Every answer is accepted, ' +
      'right or wrong. This is NOT the live app.';
    bar.setAttribute('style',
      'position:fixed;top:0;left:0;right:0;z-index:100000;' +
      'background:#B3123B;color:#fff;font:800 13px/1.35 -apple-system,system-ui,sans-serif;' +
      'letter-spacing:.02em;text-align:center;padding:9px 14px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.3)');
    document.body.appendChild(bar);
    /* push the whole page down so the banner never sits on top of the lesson */
    var pad = document.createElement('style');
    pad.textContent = 'body{padding-top:38px!important}';
    document.head.appendChild(pad);
  }
  function checkKeys_() {
    if (global.OLS_TRANSPORT && typeof global.OLS_TRANSPORT.call === 'function') return; // real server marks for real
    devKeysAll_().then(function (keys) { if (!keys) injectNoKeysBanner_(); });
  }
  global.addEventListener('DOMContentLoaded', checkKeys_);

})(window);
