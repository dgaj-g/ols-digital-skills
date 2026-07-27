/* qa-store-scale.js - the harness that would have caught audit blocker B-01.
 *
 * Runs the REAL server (ks3-dt/platform/server/Code.gs.template) inside a Node
 * VM against a mocked Apps Script whose ScriptProperties enforces the TRUE
 * per-value ceiling of 9,216 bytes - the limit the preview's localStorage does
 * not have, which is exactly why five quality-gate runs and a full verify sweep
 * never saw Lesson 5's Press Night fail.
 *
 * It drives a real class: 30 studios and 60 signed reviews (the quota Lesson 5
 * requires: 2 press passes x 30 pupils) with MAXIMUM-length pupil text, then
 * the monitored-chat transcripts for 15 pairs, then moderation, then the
 * 7-day archive sweep across every shard.
 *
 *   node qa-store-scale.js            run against the working tree
 *   node qa-store-scale.js --prefix   also run the gallery phase against the
 *                                     PRE-FIX server from git, to show it fails
 *
 * Exit code 0 = all checks passed.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');            // repo root
const SERVER = path.join(ROOT, 'ks3-dt/platform/server/Code.gs.template');
const CONTENT = path.join(ROOT, 'ks3-dt/content');

const PROP_VALUE_MAX = 9216;   // Apps Script's documented per-value ceiling
const PROP_TOTAL_MAX = 500000; // script-wide quota (the archive sweep's reason to exist)
const CLASS = 'Demo-8A';
const LESSON = 'j1-05';
const N_PUPILS = 30;
const REVIEWS_EACH = 2;

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ---------------- mock Apps Script ---------------- */
function makeEnv(opts) {
  opts = opts || {};
  const store = new Map();          // the ScriptProperties table: key -> string
  const userStore = new Map();
  const cache = new Map();
  const stats = { writes: 0, rejected: 0, maxValue: 0, maxKey: '' };

  function propsFor(map, enforce) {
    return {
      getProperty(k) { return map.has(k) ? map.get(k) : null; },
      setProperty(k, v) {
        const body = String(v);
        if (enforce && body.length > PROP_VALUE_MAX) {
          stats.rejected++;
          // Apps Script's own failure mode: setProperty THROWS past the cap.
          throw new Error('Argument too large: value (' + body.length + ' bytes > ' +
            PROP_VALUE_MAX + ') for property "' + k + '"');
        }
        stats.writes++;
        if (body.length > stats.maxValue) { stats.maxValue = body.length; stats.maxKey = k; }
        map.set(k, body);
        return this;
      },
      deleteProperty(k) { map.delete(k); return this; },
      getProperties() { const o = {}; map.forEach((v, k) => { o[k] = v; }); return o; },
      getKeys() { return Array.from(map.keys()); }
    };
  }

  const sheetRows = { Archive: [], 'Chat Archive': [], 'Gallery Archive': [] };
  function fakeSheet(name) {
    return {
      _name: name,
      getLastRow() { return sheetRows[name].length; },
      appendRow(r) { sheetRows[name].push(r); },
      setName(n) { this._name = n; return this; },
      getRange(row, col, nRows, nCols) {
        return { setValues(vals) { vals.forEach((v, i) => { sheetRows[name][row - 1 + i] = v; }); } };
      }
    };
  }

  const sandbox = {
    CURRENT_EMAIL: '',
    console,
    Date, Math, JSON, String, Number, Object, Array, isNaN, parseInt, parseFloat, Error,
    Logger: { log() {} },
    PropertiesService: {
      getScriptProperties: () => propsFor(store, true),
      getUserProperties: () => propsFor(userStore, true)
    },
    LockService: {
      getScriptLock: () => ({ waitLock() {}, releaseLock() {} })
    },
    CacheService: {
      getScriptCache: () => ({
        get(k) { return cache.has(k) ? cache.get(k) : null; },
        put(k, v) { cache.set(k, String(v)); },
        remove(k) { cache.delete(k); }
      })
    },
    Session: { getActiveUser: () => ({ getEmail: () => sandbox.CURRENT_EMAIL }) },
    UrlFetchApp: {
      fetch(url) {
        // serve the REAL packed content off disk instead of github.io
        const rel = url.replace(/^.*\/ks3-dt\/content\//, '');
        const p = path.join(CONTENT, rel);
        if (!fs.existsSync(p)) return { getResponseCode: () => 404, getContentText: () => '' };
        const text = fs.readFileSync(p, 'utf8');
        return { getResponseCode: () => 200, getContentText: () => text };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: () => new Array(32).fill(1),
      base64Decode: () => []
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheets: () => [fakeSheet('Archive')],
        getSheetByName: (n) => (sheetRows[n] ? fakeSheet(n) : null),
        insertSheet: (n) => { sheetRows[n] = sheetRows[n] || []; return fakeSheet(n); }
      }),
      flush() {}
    },
    DriveApp: {}, HtmlService: {}, ScriptApp: {}
  };
  sandbox.global = sandbox;

  const src = fs.readFileSync(opts.source || SERVER, 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'Code.gs.template' });
  return { sandbox, store, cache, stats, sheetRows };
}

/* ---------------- fixtures ---------------- */
const NAMES = ['Anya Murphy', 'Cara Devlin', 'Niamh Quinn', 'Erin Boyle', 'Orla Hughes',
  'Sinead Magee', 'Aoife Rice', 'Maeve Donnelly', 'Clodagh Kelly', 'Roisin Byrne',
  'Eimear Toner', 'Grainne Fox', 'Ciara Hearty', 'Shauna Bradley', 'Leah Campbell',
  'Katie McArdle', 'Lucy Fegan', 'Eve Traynor', 'Rachel Loughran', 'Hannah Rooney',
  'Amy Sheridan', 'Ellie Marmion', 'Zara Cunningham', 'Tara McShane', 'Beth Savage',
  'Nula Trainor', 'Faye Digney', 'Iona McKeown', 'Jodie Larkin', 'Kara Mallon'];
const pupils = NAMES.slice(0, N_PUPILS).map((n, i) => ({
  name: n, email: n.toLowerCase().replace(/[^a-z]+/g, '.') + '@demo',
  cn: 'Codename ' + (i + 1)
}));

const X = (n, seed) => (seed + ' ').repeat(Math.ceil(n / (seed.length + 1))).slice(0, n);
// deliberately MAX-length pupil free text - the audit's worst case, not a friendly one
const maxTitle = (i) => X(28, 'Gravity Grab ' + i);
const maxHow = (i) => X(90, 'Arrows move the tray and every miss costs a life so watch the timer ' + i);
const maxStem = (i) => X(200, 'the way the score updates the instant something lands which makes it feel alive ' + i);
const maxName = (i) => X(24, 'Studio ' + i);

function seedClass(env) {
  const sp = env.sandbox.PropertiesService.getScriptProperties();
  const tmin = env.sandbox.tmin_();
  sp.setProperty('classes', JSON.stringify([{ name: CLASS, owner: 'staff@demo', year: 'j1' }]));
  const locks = {};
  ['1', '2', '3', '4', '5'].forEach(n => { locks[n] = { u: tmin - 10, on: 1 }; });
  sp.setProperty('lock:' + CLASS, JSON.stringify(locks));
  pupils.forEach(p => {
    sp.setProperty('p:' + CLASS + ':' + p.email,
      JSON.stringify({ n: p.name, cn: p.cn, j: tmin - 10, xp: 40, g: '', L: {} }));
  });
}

function census(store, label) {
  let total = 0, max = 0, maxKey = '', over = [];
  const byPrefix = {};
  store.forEach((v, k) => {
    total += k.length + v.length;
    if (v.length > max) { max = v.length; maxKey = k; }
    if (v.length > PROP_VALUE_MAX) over.push(k + ' (' + v.length + ')');
    const pre = k.split(':')[0];
    byPrefix[pre] = (byPrefix[pre] || 0) + 1;
  });
  if (label) {
    console.log('  ' + label + ': ' + store.size + ' properties, ' + total + ' bytes total, ' +
      'largest value ' + max + ' bytes (' + maxKey + ')');
    console.log('  keys by prefix: ' + Object.keys(byPrefix).sort()
      .map(p => p + '=' + byPrefix[p]).join('  '));
  }
  return { total, max, maxKey, over };
}

/* ---------------- phase 1: the gallery at real class size ---------------- */
function runGallery(env, opts) {
  opts = opts || {};
  const S = env.sandbox;
  const failures = { open: [], post: [] };

  pupils.forEach((p, i) => {
    S.CURRENT_EMAIL = p.email;
    const r = S.apiGalleryOpen({
      classCode: CLASS, lessonId: LESSON, gt: maxTitle(i), gh: maxHow(i),
      sn: maxName(i), tpl: ['catch', 'maze', 'quiz'][i % 3], beta: 0
    });
    if (!r || !r.ok) failures.open.push({ i, name: p.name, r });
  });

  // every pupil files the 2 reviews the lesson requires, against the next
  // studios round-robin (never her own) - 60 reviews
  S.CURRENT_EMAIL = pupils[0].email;
  const feed0 = S.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON });
  const sids = (feed0.studios || []).map(s => s.sid);
  pupils.forEach((p, i) => {
    S.CURRENT_EMAIL = p.email;
    const mySid = sids[i];
    for (let k = 1; k <= REVIEWS_EACH; k++) {
      const target = sids[(i + k) % sids.length];
      if (!target || target === mySid) continue;
      const r = S.apiGalleryPost({
        classCode: CLASS, lessonId: LESSON, to: target,
        like: maxStem(i * 10 + k), wonder: maxStem(i * 10 + k + 5)
      });
      if (!r || !r.ok) failures.post.push({ i, k, name: p.name, r });
    }
  });
  return failures;
}

/* ================================================================= */
(function main() {
  const wantPreFix = process.argv.includes('--prefix');
  console.log('KS3 DT store scale harness - audit blocker B-01');
  console.log('Apps Script per-value cap enforced by the mock: ' + PROP_VALUE_MAX + ' bytes');
  console.log('Class size ' + N_PUPILS + ', ' + REVIEWS_EACH + ' required reviews each = ' +
    (N_PUPILS * REVIEWS_EACH) + ' reviews');

  /* ---------- the pre-fix server, for contrast (optional but the point) ---------- */
  if (wantPreFix) {
    section('CONTROL: the PRE-FIX server (git HEAD) at the same scale');
    const tmp = path.join(require('os').tmpdir(), 'ks3dt-prefix-Code.gs.js');
    try {
      execSync('git -C "' + ROOT + '" show HEAD:ks3-dt/platform/server/Code.gs.template > "' + tmp + '"');
      const envOld = makeEnv({ source: tmp });
      seedClass(envOld);
      const f = runGallery(envOld);
      const c = census(envOld.store, 'pre-fix store');
      console.log('  pre-fix: ' + f.open.length + ' studio writes REFUSED, ' +
        f.post.length + ' reviews REFUSED, ' + envOld.stats.rejected + ' writes hit the cap');
      check(f.open.length + f.post.length > 0,
        'CONTROL: the pre-fix server really does fail at class size (proves the harness bites)');
      if (f.post.length) {
        const first = f.post[0];
        console.log('  first refusal: pupil #' + (first.i + 1) + ' (' + first.name + '), review ' +
          first.k + ' -> ' + JSON.stringify(first.r));
      }
    } catch (e) {
      console.log('  (control skipped: ' + e.message + ')');
    }
  }

  /* ---------- the fixed server ---------- */
  const env = makeEnv();
  const S = env.sandbox;
  seedClass(env);
  const base = census(env.store);

  section('1. PRESS NIGHT AT CLASS SIZE - 30 studios + 60 reviews, max-length text');
  const fail = runGallery(env);
  check(fail.open.length === 0, 'all ' + N_PUPILS + ' studios published (' +
    fail.open.length + ' refused)');
  if (fail.open.length) console.log('    ' + JSON.stringify(fail.open[0]));
  check(fail.post.length === 0, 'all ' + (N_PUPILS * REVIEWS_EACH) + ' reviews filed (' +
    fail.post.length + ' refused)');
  if (fail.post.length) console.log('    ' + JSON.stringify(fail.post[0]));
  check(env.stats.rejected === 0, 'zero writes were refused by the 9,216-byte cap');

  const c1 = census(env.store, 'after Press Night');
  check(c1.over.length === 0, 'no single property value exceeds ' + PROP_VALUE_MAX +
    ' bytes (largest is ' + c1.max + ')');
  check(c1.total < PROP_TOTAL_MAX, 'store total ' + c1.total + ' bytes is inside the ' +
    PROP_TOTAL_MAX + '-byte script-wide quota');

  section('2. THE FEED REASSEMBLES ACROSS SHARDS');
  S.CURRENT_EMAIL = pupils[3].email;
  const feed = S.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON });
  check(feed.ok === true, 'feed returns ok');
  check(feed.studioCount === N_PUPILS, 'feed sees all ' + N_PUPILS +
    ' studios (' + feed.studioCount + ')');
  check(feed.total === N_PUPILS * REVIEWS_EACH, 'feed counts all ' +
    (N_PUPILS * REVIEWS_EACH) + ' live reviews (' + feed.total + ')');
  check(feed.given === REVIEWS_EACH, 'this pupil has given ' + REVIEWS_EACH +
    ' (' + feed.given + ') - the V2 gate can open');
  check(feed.myReviews.length === REVIEWS_EACH, 'she has RECEIVED ' + REVIEWS_EACH +
    ' reviews (' + feed.myReviews.length + ')');
  const uniqSids = new Set((feed.studios || []).map(s => s.sid));
  check(uniqSids.size === N_PUPILS, 'every studio id is unique across shards (' +
    uniqSids.size + ')');
  const distinctText = new Set((feed.studios || []).map(s => s.gt));
  check(distinctText.size === N_PUPILS, 'no studio listing was overwritten by another shard');
  const myRev = feed.myReviews.map(r => r.l).join('|');
  check(myRev.length > 300, 'received review text survived the round trip in full');

  section('3. THE 3-PASS CAP AND SELF-REVIEW STILL HOLD ACROSS SHARDS');
  S.CURRENT_EMAIL = pupils[5].email;
  const sids2 = (S.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON }).studios || []).map(s => s.sid);
  const third = S.apiGalleryPost({ classCode: CLASS, lessonId: LESSON, to: sids2[20],
    like: maxStem(901), wonder: maxStem(902) });
  check(third && third.ok === true, 'the 3rd (optional) press pass is allowed');
  const fourth = S.apiGalleryPost({ classCode: CLASS, lessonId: LESSON, to: sids2[21],
    like: maxStem(903), wonder: maxStem(904) });
  check(fourth && fourth.error === 'passes-spent', 'a 4th review is refused: ' +
    JSON.stringify(fourth));
  const dupe = S.apiGalleryPost({ classCode: CLASS, lessonId: LESSON, to: sids2[6],
    like: maxStem(905), wonder: maxStem(906) });
  check(dupe && (dupe.error === 'already-reviewed' || dupe.error === 'passes-spent'),
    'a second review of the same studio is refused: ' + JSON.stringify(dupe));
  const mySid5 = (S.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON }).studios || [])
    .find(s => s.mine).sid;
  S.CURRENT_EMAIL = pupils[6].email;
  const selfCheck = S.apiGalleryPost({ classCode: CLASS, lessonId: LESSON,
    to: (S.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON }).studios || []).find(s => s.mine).sid,
    like: maxStem(907), wonder: maxStem(908) });
  check(selfCheck && selfCheck.error === 'own-studio', 'self-review still refused: ' +
    JSON.stringify(selfCheck));

  section('4. STAFF MODERATION REACHES THE RIGHT SHARD');
  const sp = S.PropertiesService.getScriptProperties();
  sp.setProperty('staffPasscode', 'demo');
  const lens = S.apiAdmin({ sub: 'gallery', passcode: 'demo', className: CLASS, lessonId: LESSON });
  check(lens.ok === true && lens.studios.length === N_PUPILS,
    'Press Night lens sees all ' + N_PUPILS + ' studios with real names (' +
    (lens.studios || []).length + ')');
  check((lens.reviews || []).length === N_PUPILS * REVIEWS_EACH + 1,
    'lens sees every review incl. the 3rd pass (' + (lens.reviews || []).length + ')');
  const namedOk = (lens.studios || []).every(s => s.name && s.name.indexOf('@') < 0);
  check(namedOk, 'every studio row carries a real pupil name, not an email');

  // hide a studio that lives in a LATER shard, and remove a LATE review
  const hideSid = lens.studios[N_PUPILS - 2].sid;
  const hideRes = S.apiAdmin({ sub: 'galleryHideStudio', passcode: 'demo', className: CLASS,
    lessonId: LESSON, sid: hideSid });
  check(hideRes.ok === true, 'hide a listing from the LAST studio shard');
  const lateReview = lens.reviews[lens.reviews.length - 3];
  const rmRes = S.apiAdmin({ sub: 'galleryRemove', passcode: 'demo', className: CLASS,
    lessonId: LESSON, i: lateReview.i });
  check(rmRes.ok === true, 'remove a review from a LATE review shard');
  const rmMissing = S.apiAdmin({ sub: 'galleryRemove', passcode: 'demo', className: CLASS,
    lessonId: LESSON, i: 99999 });
  check(rmMissing.error === 'no-review', 'removing a review that does not exist still errors');

  S.CURRENT_EMAIL = pupils[0].email;
  const feed2 = S.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON });
  check(!(feed2.studios || []).some(s => s.sid === hideSid && !s.mine),
    'the hidden listing is gone from a classmate\'s marquee');
  check(feed2.total === N_PUPILS * REVIEWS_EACH + 1 - 1,
    'the removed review no longer counts (' + feed2.total + ')');

  section('5. THE MODERATED PUPIL IS NOT LOCKED OUT (audit C-13 across shards)');
  const victim = pupils.find(p => {
    S.CURRENT_EMAIL = p.email;
    return S.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON }).given < REVIEWS_EACH;
  });
  check(!!victim, 'the critic whose review was removed is below quota again (' +
    (victim ? victim.name : 'none') + ')');
  if (victim) {
    S.CURRENT_EMAIL = victim.email;
    const vf = S.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON });
    const free = (vf.studios || []).find(s => !s.mine && s.sid !== hideSid);
    const again = S.apiGalleryPost({ classCode: CLASS, lessonId: LESSON, to: free.sid,
      like: maxStem(911), wonder: maxStem(912) });
    check(again && (again.ok === true || again.error === 'already-reviewed'),
      'she can file again after moderation: ' + JSON.stringify(again));
  }

  section('6. MONITORED CHAT TRANSCRIPTS - 15 pairs, max-length messages');
  const cacheApi = S.CacheService.getScriptCache();
  const tmin = S.tmin_();
  const pairsReg = { q: [], P: {}, solo: [] };
  for (let i = 0; i < N_PUPILS; i += 2) {
    const pid = 'p' + (i / 2 + 1);
    pairsReg.P[pid] = {
      m: [pupils[i].email, pupils[i + 1].email],
      cn: [pupils[i].cn, pupils[i + 1].cn],
      t: tmin - 20, turn: 0, done: 0, rv: 0
    };
    // a genuinely chatty pair: 40 messages at the 240-char channel limit
    const ev = [];
    for (let m = 0; m < 40; m++) {
      ev.push([m + 1, m % 2, 'msg', X(240, 'ok so I think the folder goes inside School because ' + m), tmin]);
    }
    cacheApi.put('ks3dt:pch:' + pid, JSON.stringify({ seq: 40, ev: ev, ls: [] }));
  }
  sp.setProperty('pair:' + CLASS + ':' + 'j1-01', JSON.stringify(pairsReg));
  let chatFails = 0;
  Object.keys(pairsReg.P).forEach(pid => {
    S.CURRENT_EMAIL = pairsReg.P[pid].m[0];
    const r = S.apiPairComplete({ classCode: CLASS, lessonId: 'j1-01', pid: pid });
    if (!r || !r.ok) chatFails++;
  });
  check(chatFails === 0, 'all 15 pairs sealed and flushed a transcript (' + chatFails + ' failed)');
  const chatStored = S.chatGet_(CLASS, 'j1-01');
  check(Object.keys(chatStored).length === 15,
    'all 15 transcripts are readable back (' + Object.keys(chatStored).length + ')');
  const everyTx = Object.keys(chatStored).every(p => String(chatStored[p].tx || '').length > 100);
  check(everyTx, 'every stored transcript has real content - none silently dropped');
  const c2 = census(env.store, 'after 15 chat transcripts');
  check(c2.over.length === 0, 'still no property value over the cap (largest ' + c2.max + ')');

  section('7. THE ARCHIVE SWEEP CLEARS HEAD *AND* SHARDS - after write-verify');
  sp.setProperty('ARCHIVE_SHEET_ID', 'fake-sheet');
  // age everything past the 7-day horizon by winding the clock forward
  const realNow = Date.now;
  Date.now = () => realNow() + 9 * 24 * 3600 * 1000;
  const meta = S.archiveSweep_();
  Date.now = realNow;
  check(meta.ok === true, 'sweep completed without error (' + (meta.error || 'no error') + ')');
  check(env.sheetRows['Gallery Archive'].length >= N_PUPILS,
    'every studio reached the Gallery Archive tab before deletion (' +
    env.sheetRows['Gallery Archive'].length + ' rows)');
  check(env.sheetRows['Chat Archive'].length >= 15,
    'every transcript reached the Chat Archive tab before deletion (' +
    env.sheetRows['Chat Archive'].length + ' rows)');
  const leftovers = Array.from(env.store.keys()).filter(k =>
    /^gal:|^gals:|^galr:|^chat:|^chats:/.test(k));
  check(leftovers.length === 0, 'no gallery or chat key survives the sweep (' +
    (leftovers.join(', ') || 'none') + ')');
  const c3 = census(env.store, 'after the sweep');
  check(c3.total <= base.total + 60000, 'store returns to roughly its pre-lesson size');

  section('8. ORPHAN SHARDS ARE RECLAIMED');
  sp.setProperty('galr:' + CLASS + ':j1-05:0', JSON.stringify([{ i: 1, l: 'orphan', w: 'orphan' }]));
  sp.setProperty('chats:' + CLASS + ':j1-01:0', JSON.stringify({ pX: { tx: 'orphan' } }));
  const meta2 = S.archiveSweep_();
  check(meta2.ok === true, 'second sweep runs clean');
  check(!env.store.has('galr:' + CLASS + ':j1-05:0'), 'an orphaned review shard is deleted');
  check(!env.store.has('chats:' + CLASS + ':j1-01:0'), 'an orphaned transcript shard is deleted');

  section('9. THE PRE-FIX SHAPE STILL READS (no data loss on upgrade)');
  const env2 = makeEnv();
  seedClass(env2);
  const S2 = env2.sandbox;
  const sp2 = S2.PropertiesService.getScriptProperties();
  sp2.setProperty('gal:' + CLASS + ':' + LESSON, JSON.stringify({
    seq: 4,
    studios: { 'legacy.pupil@demo': { sid: 's1', sn: 'Legacy Studio', cn: 'Agent Old',
      gt: 'Old Game', gh: 'from before the fix', tpl: 'catch', ts: S2.tmin_() - 5, rn: 1 } },
    reviews: [{ i: 2, by: 'other@demo', bcn: 'Agent Two', to: 's1',
      l: 'the old review survived', w: 'whether it migrates', t: S2.tmin_() - 5, rm: 0 }]
  }));
  S2.CURRENT_EMAIL = pupils[0].email;
  const legacyFeed = S2.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON });
  check(legacyFeed.studioCount === 1, 'a v1 (inline) gallery is still readable');
  check(legacyFeed.total === 1, 'its reviews are still counted');
  S2.apiGalleryOpen({ classCode: CLASS, lessonId: LESSON, gt: 'New Game', gh: 'after the fix',
    sn: 'New Studio', tpl: 'maze' });
  const migFeed = S2.apiGalleryFeed({ classCode: CLASS, lessonId: LESSON });
  check(migFeed.studioCount === 2, 'the legacy studio survives the migrating write (' +
    migFeed.studioCount + ')');
  check(migFeed.total === 1, 'the legacy review survives the migrating write');
  const head = JSON.parse(env2.store.get('gal:' + CLASS + ':' + LESSON));
  check(head.v === 2 && !head.studios && !head.reviews,
    'the head is now v2 and holds only counters: ' + JSON.stringify(head));

  /* ---------------- verdict ---------------- */
  console.log('\n=========================================');
  console.log('CHECKS RUN: ' + (PASS + FAILS.length) + '   PASSED: ' + PASS + '   FAILED: ' + FAILS.length);
  if (FAILS.length) {
    FAILS.forEach(f => console.log('  FAILED: ' + f));
    console.log('STORE SCALE CHECKS FAILED');
    process.exit(1);
  }
  console.log('ALL STORE SCALE CHECKS PASSED');
})();
