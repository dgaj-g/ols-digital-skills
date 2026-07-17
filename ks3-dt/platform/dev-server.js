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
  var PUPIL_EMAIL = 'anya.murphy@demo';
  var STAFF_EMAIL = 'teacher@demo';
  var EPOCH = 1767225600000; // 2026-01-01 UTC — same epoch as Code.gs.template's tmin_()
  var LATENCY = 180;         // simulated round-trip, ms
  var FALLBACK_EXPLAIN = '(preview marking unavailable on this host — run locally)';

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
  function writePupil_(s, cls, email, rec) { s.pupils[pKey_(cls, email)] = rec; }
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
  function lessonAccessible_(s, cls, numStr) {
    var lk = getLocks_(s, cls)[numStr];
    return !!(lk && num_(lk.u));
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
    return Promise.resolve({ ok: true, email: PUPIL_EMAIL, name: 'Anya Murphy' });
  }

  function doJoin(p) {
    var s = load_();
    var cls = realClass_(s, p.classCode);
    if (!cls) return Promise.resolve({ ok: false, error: 'unknown-class' });
    var rec = readPupil_(s, cls, PUPIL_EMAIL) || { n: '', cn: '', j: tmin_(), xp: 0, g: '', L: {} };
    if (!rec.n) rec.n = str_(p.name || 'Anya Murphy');
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
        cover: num_(cfg.cover.on),
        absence: absence,
        team: myTeam,
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
        var locks = getLocks_(s, cls);
        var delivered = {};
        Object.keys(locks).forEach(function (k) { if (num_(locks[k].u)) delivered[k] = num_(locks[k].u); });
        var items = poolItems.filter(function (it) {
          var n = idToNum[str_(it.lesson)];
          return n && delivered[n] && n !== curNum;
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

        // 2) Fill to 5 with the 40/40/20 recency mix over DELIVERED lesson numbers.
        var nums = Object.keys(delivered).map(Number).sort(function (a, b) { return b - a; });
        var band = function (it) {
          var n = num_(idToNum[str_(it.lesson)]);
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
        return { ok: true, items: out };
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
          var done = a && (detailKeys_(a[2]).indexOf('vp') !== -1 || detailKeys_(a[2]).indexOf(str_(p.keyId || 'vault')) !== -1);
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
        if (detailKeys_(a[2]).indexOf('bl') !== -1) return { ok: true, already: true };
        a[2] = mergeDetail_(a[2], 'bl=' + right + '/' + ids.length + '|' + chosen);
        a[5] = tmin_();
        if (num_(a[0]) < 1) a[0] = 1;
        writePupil_(s, cls, PUPIL_EMAIL, rec);
        save_(s);
        return { ok: true };
      });
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
        label: str_(cfg.lb.names) === 'real' ? str_(r.n).split(' ')[0] : ('Agent ' + (str_(r.cn) || 'Unnamed')),
        v: str_(cfg.lb.basis) === 'completion' ? num_(doneCount) : num_(r.xp),
        me: str_(r.email) === PUPIL_EMAIL
      };
    });
    rows.sort(function (a, b) { return b.v - a.v; });
    var topN = num_(cfg.lb.topN);
    if (topN > 0) rows = rows.slice(0, topN);
    return Promise.resolve({ ok: true, mode: 'public', basis: str_(cfg.lb.basis), rows: rows });
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
        store: { bytes: num_(bytes), limit: 500000, pupils: num_(pupilCount) }
      });
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
      if (on && !num_(cur.u)) cur.u = tmin_(); // first unlock = delivered date (never reset)
      cur.on = on;
      locks[numStr] = cur;
      save_(s);
      return Promise.resolve({ ok: true, u: num_(cur.u), on: num_(cur.on) });
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
          cfg: { lb: cfg2.lb, absDays: num_(cfg2.absDays), cover: num_(cfg2.cover.on), coverLesson: str_(cfg2.cover.lesson) },
          groups: team2.groups.map(function (g) { return { id: str_(g.id), name: str_(g.name) }; }),
          reveal: !!team2.reveal
        };
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

    return Promise.resolve({ ok: false, error: 'unknown-sub' });
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
      case 'vaultInfo': return doVaultInfo(p);
      case 'board': return doBoard(p);
      case 'saveEvent': return doSaveEvent(p);
      case 'loadDraft': return doLoadDraft(p);
      case 'submitExit': return doSubmitExit(p);
      case 'submitBaseline': return doSubmitBaseline(p);
      case 'catchup': return doCatchup(p);
      case 'admin': return doAdmin(p);
      default: return Promise.resolve({ ok: false, error: 'unknown-action' });
    }
  }

  global.OLS_DEV_SERVER = {
    call: function (p) {
      p = p || {};
      return new Promise(function (resolve) {
        function respond(r) { setTimeout(function () { resolve(r); }, LATENCY); }
        try {
          route_(p).then(respond, function (err) {
            respond({ ok: false, error: 'dev-server-exception', message: String(err && err.message || err) });
          });
        } catch (err) {
          respond({ ok: false, error: 'dev-server-exception', message: String(err && err.message || err) });
        }
      });
    }
  };

  /* ---------- PREVIEW pill: never let anyone mistake this for the live app ---------- */
  function injectPreviewPill_() {
    if (global.OLS_TRANSPORT && typeof global.OLS_TRANSPORT.call === 'function') return; // real transport present
    var pill = document.createElement('div');
    pill.textContent = 'PREVIEW';
    pill.setAttribute('style',
      'position:fixed;left:12px;bottom:12px;z-index:99999;' +
      'background:#1A3A6B;color:#F4F6FA;font:600 11px/1 -apple-system,system-ui,sans-serif;' +
      'letter-spacing:.06em;padding:6px 10px;border-radius:999px;opacity:.82;' +
      'pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.25);');
    document.body.appendChild(pill);
  }
  global.addEventListener('DOMContentLoaded', injectPreviewPill_);

})(window);
