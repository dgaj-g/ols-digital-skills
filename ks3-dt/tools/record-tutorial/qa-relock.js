/* qa-relock.js - audit blocker B-05: re-locking a lesson was a no-op AND it
 * manufactured false absence flags for a lesson that never ran.
 *
 * Two halves, because the bug has two layers:
 *   A) SERVER, in Node against the real Code.gs.template with a mocked Apps
 *      Script - the layer the audit reproduced live (setLock on:0 returned ok
 *      and the pupil's next saveEvent still succeeded).
 *   B) BROWSER, against the FakeServer at localhost:8096 - the pupil's hub tile
 *      and the teacher's undo control.
 *
 *   node qa-relock.js            both halves
 *   node qa-relock.js --server   server only (no browser needed)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../../..');
const SERVER = path.join(ROOT, 'ks3-dt/platform/server/Code.gs.template');
const CONTENT = path.join(ROOT, 'ks3-dt/content');
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=';
const CLASS = 'Demo-8A';
const PREFIX_REF = process.env.KS3DT_PREFIX_REF || '3341be0'; // last commit before the B-05 fix
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ---------------- mocked Apps Script (same shape as qa-store-scale.js) ------- */
function makeEnv(source) {
  const store = new Map(), userStore = new Map(), cache = new Map();
  function propsFor(map) {
    return {
      getProperty: k => (map.has(k) ? map.get(k) : null),
      setProperty(k, v) {
        const b = String(v);
        if (b.length > 9216) throw new Error('Argument too large: value');
        map.set(k, b); return this;
      },
      deleteProperty(k) { map.delete(k); return this; },
      getProperties() { const o = {}; map.forEach((v, k) => { o[k] = v; }); return o; }
    };
  }
  const sandbox = {
    CURRENT_EMAIL: '', console, Date, Math, JSON, String, Number, Object, Array,
    isNaN, parseInt, parseFloat, Error,
    Logger: { log() {} },
    PropertiesService: { getScriptProperties: () => propsFor(store), getUserProperties: () => propsFor(userStore) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)), remove: k => cache.delete(k) }) },
    Session: { getActiveUser: () => ({ getEmail: () => sandbox.CURRENT_EMAIL }) },
    UrlFetchApp: {
      fetch(url) {
        const p = path.join(CONTENT, url.replace(/^.*\/ks3-dt\/content\//, ''));
        if (!fs.existsSync(p)) return { getResponseCode: () => 404, getContentText: () => '' };
        return { getResponseCode: () => 200, getContentText: () => fs.readFileSync(p, 'utf8') };
      }
    },
    Utilities: { DigestAlgorithm: { SHA_256: 'S' }, Charset: { UTF_8: 'U' }, computeDigest: () => new Array(32).fill(1), base64Decode: () => [] },
    SpreadsheetApp: { openById: () => ({ getSheets: () => [], getSheetByName: () => null, insertSheet: () => null }), flush() {} },
    DriveApp: {}, HtmlService: {}, ScriptApp: {}
  };
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(source, 'utf8'), sandbox, { filename: 'Code.gs.template' });
  return { sandbox, store };
}

function serverHalf() {
  section('A. SERVER - the audit\'s live repro, re-run');
  const env = makeEnv(SERVER);
  const S = env.sandbox;
  const sp = S.PropertiesService.getScriptProperties();
  const tmin = S.tmin_();
  const ANYA = 'anya.murphy@demo', NEW = 'brand.new@demo';
  sp.setProperty('classes', JSON.stringify([{ name: CLASS, owner: 'staff@demo', year: 'j1' }]));
  sp.setProperty('staffPasscode', 'demo');
  // Lesson 2 delivered 12 days ago and never locked since; anya has a record, the
  // new girl has none. j1-02 is absence-inference eligible.
  sp.setProperty('lock:' + CLASS, JSON.stringify({ '1': { u: tmin - 20 * 1440, on: 1 }, '2': { u: tmin - 12 * 1440, on: 1 } }));
  sp.setProperty('p:' + CLASS + ':' + ANYA, JSON.stringify({
    n: 'Anya Murphy', cn: 'Amber Kite', j: tmin - 20 * 1440, xp: 60, g: '',
    L: { '2': [1, 20, 'b1=1', '', '', tmin - 12 * 1440, 12, 0, '', 0, 0] }
  }));
  sp.setProperty('p:' + CLASS + ':' + NEW, JSON.stringify({
    n: 'Brand New', cn: 'Bright Comet', j: tmin - 20 * 1440, xp: 0, g: '', L: {}
  }));

  const setLock = (num, on, clear) => S.apiAdmin({ sub: 'setLock', passcode: 'demo', className: CLASS, lessonNum: num, on: on, clear: clear });
  const saveAs = (email) => { S.CURRENT_EMAIL = email; return S.apiSaveEvent({ classCode: CLASS, lessonNum: '2', kind: 'badge', detail: 'rung' + Math.floor(Math.random()*1e9) + '=1', xp: 5 }); };
  const stateAs = (email) => { S.CURRENT_EMAIL = email; return S.apiState({ classCode: CLASS }); };

  // baseline: unlocked, everything works
  check(saveAs(ANYA).ok === true, 'baseline: an unlocked lesson accepts a save');
  check(saveAs(NEW).ok === true, 'baseline: a pupil with no record can start it');

  // the teacher re-locks
  const lockRes = setLock('2', 0);
  check(lockRes.ok === true && lockRes.on === 0, 'setLock on:0 returns ok (' + JSON.stringify(lockRes) + ')');

  // THE BUG, half one: the re-lock must now actually bite for anyone new
  const newRec = JSON.parse(env.store.get('p:' + CLASS + ':' + NEW));
  delete newRec.L['2'];                       // she never really started it
  sp.setProperty('p:' + CLASS + ':' + NEW, JSON.stringify(newRec));
  const blocked = saveAs(NEW);
  check(blocked && blocked.ok === false && blocked.error === 'locked',
    'a pupil with NO record is now refused: ' + JSON.stringify(blocked));
  const stillIn = saveAs(ANYA);
  check(stillIn && stillIn.ok === true,
    'a pupil who ALREADY started keeps her place (never kick anyone out): ' + JSON.stringify(stillIn));

  // THE BUG, half two: no false absence flags from a locked lesson
  const newState = stateAs(NEW);
  check(newState.ok === true, 'getState still works for the new pupil');
  check((newState.absence || []).indexOf('j1-02') === -1,
    'a LOCKED lesson produces no absence flag (' + JSON.stringify(newState.absence) + ')');

  // ...but a genuinely delivered, still-open lesson does
  setLock('2', 1);
  const openState = stateAs(NEW);
  check((openState.absence || []).indexOf('j1-02') !== -1,
    'unlocked again, the real absence flag comes back (' + JSON.stringify(openState.absence) + ') - the fix did not just switch the feature off');

  // the teacher's undo
  setLock('2', 0, 1);
  const locks = JSON.parse(env.store.get('lock:' + CLASS));
  check(Number(locks['2'].u) === 0, 'undo clears the delivered date (u=' + locks['2'].u + ')');
  check(Number(locks['2'].on) === 0, 'and leaves it locked (on=' + locks['2'].on + ')');
  const afterUndo = stateAs(NEW);
  check((afterUndo.absence || []).indexOf('j1-02') === -1, 'no absence flag survives the undo');
  const anyaRec = JSON.parse(env.store.get('p:' + CLASS + ':' + ANYA));
  check(!!(anyaRec.L && anyaRec.L['2']) && Number(anyaRec.L['2'][1]) > 0,
    'the undo did NOT touch pupil work (anya still has ' + (anyaRec.L['2'] || [])[1] + ' XP recorded)');

  // unlocking for real afterwards sets a fresh delivered date
  const relock = setLock('2', 1);
  check(Number(relock.u) > 0, 'unlocking again sets a fresh delivered date (' + relock.u + ')');
  check(Number(relock.u) >= tmin - 1, 'and it is TODAY, not the mis-tap day');

  // guard: clear is ignored while unlocking, so it can never wipe a live lesson
  const sneaky = setLock('2', 1, 1);
  check(Number(sneaky.u) > 0, 'clear:1 is ignored on an UNLOCK (delivered date survives)');

  section('A2. CONTROL - the pre-fix server really did fail here');
  const { execSync } = require('child_process');
  const tmp = path.join(require('os').tmpdir(), 'ks3dt-prefix-relock.js');
  try {
    /* PINNED, for the same reason as qa-store-scale.js: a relative ref stops
       being the pre-fix code as soon as more commits land on top. */
    execSync('git -C "' + ROOT + '" show ' + PREFIX_REF + ':ks3-dt/platform/server/Code.gs.template > "' + tmp + '"');
    const old = makeEnv(tmp);
    const O = old.sandbox;
    const osp = O.PropertiesService.getScriptProperties();
    const ot = O.tmin_();
    osp.setProperty('classes', JSON.stringify([{ name: CLASS, owner: 'staff@demo', year: 'j1' }]));
    osp.setProperty('staffPasscode', 'demo');
    osp.setProperty('lock:' + CLASS, JSON.stringify({ '2': { u: ot - 12 * 1440, on: 1 } }));
    osp.setProperty('p:' + CLASS + ':' + NEW, JSON.stringify({ n: 'Brand New', cn: 'B', j: ot - 20 * 1440, xp: 0, g: '', L: {} }));
    O.apiAdmin({ sub: 'setLock', passcode: 'demo', className: CLASS, lessonNum: '2', on: 0 });
    O.CURRENT_EMAIL = NEW;
    const oldSave = O.apiSaveEvent({ classCode: CLASS, lessonNum: '2', kind: 'badge', detail: 'x=1', xp: 5 });
    check(oldSave && oldSave.ok === true,
      'CONTROL: pre-fix, a re-locked lesson STILL accepted the write - ' + JSON.stringify(oldSave));
    // wipe the work that write just created, so this is the "never opened it" girl
    osp.setProperty('p:' + CLASS + ':' + NEW, JSON.stringify({ n: 'Brand New', cn: 'B', j: ot - 20 * 1440, xp: 0, g: '', L: {} }));
    const oldState = O.apiState({ classCode: CLASS });
    check((oldState.absence || []).indexOf('j1-02') !== -1,
      'CONTROL: pre-fix, the locked lesson STILL manufactured an absence flag - ' + JSON.stringify(oldState.absence));
  } catch (e) {
    console.log('  (control skipped: ' + e.message + ')');
  }
}

/* ---------------- browser half ---------------- */
async function browserHalf() {
  const { chromium } = require('./node_modules/playwright');
  section('B. BROWSER - the pupil hub tile and the teacher\'s undo');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pa = await ctx.newPage();
  const errs = [];
  pa.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  pa.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await pa.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await pa.evaluate(() => localStorage.clear());
  await pa.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);

  const waitTiles = async () => {
    for (let i = 0; i < 40; i++) {
      const n = await pa.evaluate(() => {
        const b = document.querySelector('.intro-skip, .intro-overlay button');
        if (b) b.click();
        return document.querySelectorAll('.tile').length;
      });
      if (n > 1) return n;
      await sleep(400);
    }
    return 0;
  };
  const tileState = () => pa.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Signal and Sequence|Lesson 2|micro:bit/i.test(e.textContent));
    const all = Array.from(document.querySelectorAll('.tile'));
    const el = t || all[1];
    return { cls: el ? el.className : '', text: el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : '' };
  });

  const setLock = (num, on, clear) => pa.evaluate(([n, o, c]) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const cur = db.locks['Demo-8A'][n] || { u: 0, on: 0 };
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    if (o && !cur.u) cur.u = now;
    cur.on = o;
    if (!o && c) cur.u = 0;
    db.locks['Demo-8A'][n] = cur;
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, [num, on, clear]);

  check((await waitTiles()) > 1, 'the hub rendered its tiles');
  const before = await tileState();
  check(/is-open/.test(before.cls), 'an unlocked delivered lesson reads Ready: ' + before.cls);

  await setLock('2', 0, 0);
  await pa.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200); await waitTiles();
  const after = await tileState();
  check(/is-locked/.test(after.cls) && !/is-open/.test(after.cls),
    'after a re-lock the pupil hub shows it LOCKED, not Ready: ' + after.cls);
  check(!/Ready/.test(after.text), 'and the tile no longer says "Ready": ' + after.text);

  // a pupil who already has a record keeps her place
  await pa.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const k = Object.keys(db.pupils).find(x => /anya/.test(x));
    if (k) { db.pupils[k].L = db.pupils[k].L || {}; db.pupils[k].L['2'] = [1, 10, '', '', '', 0, 4, 0, '', 0, 0]; }
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await pa.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200); await waitTiles();
  const kept = await tileState();
  check(/is-open|is-done/.test(kept.cls),
    'a pupil who already started keeps her place after the re-lock: ' + kept.cls);

  section('C. STAFF PANEL - the confirm and the undo');
  const ps = await ctx.newPage();
  const serrs = [];
  ps.on('console', m => { if (m.type() === 'error') serrs.push(m.text()); });
  ps.on('pageerror', e => serrs.push('PAGEERROR ' + e.message));
  await ps.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  // leave Lesson 2 in exactly the state a mis-tap produces: delivered, then locked
  await ps.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks['Demo-8A']['2'] = { u: now - 12 * 1440, on: 0 };
    db.locks['Demo-8A']['1'] = { u: now - 20 * 1440, on: 1 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await ps.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await ps.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(600);
  await ps.evaluate(() => { const b = Array.from(document.querySelectorAll('button, a')).find(x => /^Staff$/i.test((x.textContent || '').trim())); if (b) b.click(); });
  await sleep(900);
  await ps.evaluate(() => {
    const i = document.querySelector('#staff-pass, input[type="password"], .staff-pass input');
    if (i) { i.value = 'demo'; i.dispatchEvent(new Event('input')); }
    const go = Array.from(document.querySelectorAll('button')).find(x => /Unlock|Enter|Sign in|Check/i.test(x.textContent) && x.offsetParent);
    if (go) go.click();
  });
  await sleep(1800);
  await ps.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-action="select-class"]')).find(x => x.offsetParent); if (b) b.click(); });
  await sleep(1200);
  await ps.evaluate(() => { const t = Array.from(document.querySelectorAll('button')).find(x => /Lessons|Lock/i.test(x.textContent) && x.offsetParent); if (t) t.click(); });
  await sleep(1600);

  const grid = await ps.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('.lock-cell')).map(c => ({
      num: c.getAttribute('data-num'),
      state: (c.querySelector('.lc-state') || {}).textContent || '',
      undo: !!c.querySelector('.lc-undo')
    }));
    return { n: cells.length, undoNums: cells.filter(c => c.undo).map(c => c.num) };
  });
  check(grid.n > 10, 'the lock grid rendered (' + grid.n + ' cells)');
  check(grid.undoNums.length === 1 && grid.undoNums[0] === '2',
    'the undo chip appears on exactly the locked-but-delivered cell: ' + JSON.stringify(grid.undoNums));

  // re-locking a live lesson now asks first
  await ps.evaluate(() => { const c = document.querySelector('.lock-cell[data-num="1"]'); if (c) c.click(); });
  await sleep(700);
  const relockTxt = await ps.evaluate(() => {
    const m = document.body.textContent.match(/Lock Lesson 1 again\?[\s\S]{0,220}/);
    return m ? m[0].replace(/\s+/g, ' ') : '';
  });
  check(/Lock Lesson 1 again\?/.test(relockTxt), 'a re-lock asks for confirmation first');
  check(/keep their place/.test(relockTxt) && /Nobody new/.test(relockTxt),
    'and the confirm says what actually happens: ' + relockTxt.slice(0, 120));
  await ps.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find(e => /Cancel|No,|Back/i.test(e.textContent) && e.offsetParent); if (x) x.click(); });
  await sleep(600);
  const stillOn = await ps.evaluate(() => JSON.parse(localStorage.getItem('ks3dt-dev')).locks['Demo-8A']['1'].on);
  check(Number(stillOn) === 1, 'cancelling the confirm leaves the lesson unlocked');

  // the undo
  await ps.evaluate(() => { const u = document.querySelector('.lock-cell[data-num="2"] .lc-undo'); if (u) u.click(); });
  await sleep(700);
  const undoTxt = await ps.evaluate(() => {
    const m = document.body.textContent.match(/Mark Lesson 2 as never taught\?[\s\S]{0,260}/);
    return m ? m[0].replace(/\s+/g, ' ') : '';
  });
  check(/never taught/.test(undoTxt), 'the undo asks for confirmation');
  check(/work a pupil already saved is kept/.test(undoTxt),
    'and promises pupil work is kept: ' + undoTxt.slice(0, 140));
  await ps.evaluate(() => { const x = Array.from(document.querySelectorAll('button')).find(e => /Clear it/i.test(e.textContent) && e.offsetParent); if (x) x.click(); });
  await sleep(2200);
  const afterUndo = await ps.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const c = document.querySelector('.lock-cell[data-num="2"]');
    return {
      lock: db.locks['Demo-8A']['2'],
      state: c ? ((c.querySelector('.lc-state') || {}).textContent || '') : 'gone',
      chipGone: !!(c && !c.querySelector('.lc-undo')),
      status: (document.querySelector('#lock-status') || {}).textContent || ''
    };
  });
  check(Number(afterUndo.lock.u) === 0, 'the delivered date is cleared (u=' + afterUndo.lock.u + ')');
  check(afterUndo.state.trim() === 'Locked', 'the cell reads plain "Locked" again: ' + JSON.stringify(afterUndo.state));
  check(afterUndo.chipGone, 'the undo chip disappears once there is nothing to undo');
  check(/never delivered/.test(afterUndo.status), 'the teacher is told what happened: ' + afterUndo.status);
  await ps.screenshot({ path: path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-l5/relock-undo-grid.png'), fullPage: true });

  check(errs.length === 0, 'zero console errors on the pupil tab: ' + JSON.stringify(errs));
  check(serrs.length === 0, 'zero console errors on the staff tab: ' + JSON.stringify(serrs));
  await browser.close();
}

(async () => {
  console.log('KS3 DT re-lock harness - audit blocker B-05');
  serverHalf();
  if (!process.argv.includes('--server')) {
    try { await browserHalf(); }
    catch (e) { check(false, 'browser half threw: ' + e.message); }
  }
  console.log('\n=========================================');
  console.log('CHECKS RUN: ' + (PASS + FAILS.length) + '   PASSED: ' + PASS + '   FAILED: ' + FAILS.length);
  if (FAILS.length) { FAILS.forEach(f => console.log('  FAILED: ' + f)); console.log('RE-LOCK CHECKS FAILED'); process.exit(1); }
  console.log('ALL RE-LOCK CHECKS PASSED');
})();
