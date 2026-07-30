/* qa-predeploy.js - the four pre-deploy fixes (27 Jul 2026), one section each.
 *
 *   E-08  Lesson 1's teacher brief never said how to START the lesson
 *   C-08  the staff panel never re-locked once opened
 *   C-11  "Reset pairing" deleted the registry and deadlocked every paired pupil
 *   C-14  the published github.io copy marks every answer correct, silently
 *
 * Every section carries a CONTROL against the PINNED pre-fix commit or the
 * pre-fix condition, so a check that cannot fail is never counted as a pass.
 *
 *   node qa-predeploy.js             all four
 *   node qa-predeploy.js --server    content + server only (no browser)
 *   node qa-predeploy.js e08|c08|c11|c14
 * Browser sections need the preview server on 8096 (config digital-skills-l4).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const SERVER = path.join(ROOT, 'ks3-dt/platform/server/Code.gs.template');
const CONTENT = path.join(ROOT, 'ks3-dt/content');
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=';
const CLASS = 'Demo-8A';
/* pinned, for the same reason as qa-relock.js: a relative ref stops being
   pre-fix code the moment these fixes land on top of it */
const PREFIX_REF = process.env.KS3DT_PREDEPLOY_PREFIX_REF || '8e86295';
const ONLY = (process.argv[2] || '').replace(/^-+/, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }
function gitShow(ref, rel) {
  return execSync('git -C "' + ROOT + '" show ' + ref + ':' + rel, { maxBuffer: 40 * 1024 * 1024 }).toString('utf8');
}

/* ================= E-08 - the brief must be usable at 8:59am =================
   The brief is staff-only, so pack-content.js folds it into the encrypted keys
   blob as "_brief". These checks decrypt the PACKED file rather than reading
   content-src, so they test what actually ships. */
const crypto = require('crypto');
const SECRET_FILE = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/.ks3dt-secret');
function decryptKeys(b64, fileId) {
  const sec = fs.readFileSync(SECRET_FILE, 'utf8').trim();
  const data = Buffer.from(b64, 'base64');
  const out = Buffer.alloc(data.length);
  for (let block = 0; block * 32 < data.length; block++) {
    const ks = crypto.createHash('sha256').update(sec + '|' + fileId + '|' + block).digest();
    for (let i = 0; i < 32 && block * 32 + i < data.length; i++) {
      out[block * 32 + i] = data[block * 32 + i] ^ ks[i];
    }
  }
  return JSON.parse(out.toString('utf8'));
}
function briefOf(lessonJson) {
  if (lessonJson.teacherBrief) return lessonJson.teacherBrief;      // unpacked source
  return decryptKeys(lessonJson.keysEnc, 'j1/lessons/j1-01')._brief; // what ships
}
function briefText(lessonJson) {
  const tb = briefOf(lessonJson) || {};
  return [tb.why || ''].concat(tb.minuteByMinute || [], tb.pitfalls || []).join('\n');
}
/* The four things a teacher cannot start the hour without. Each is a predicate
   over the brief, so it reads the same for the fixed and the pre-fix copy. */
const E08 = [
  { id: 'unlock', ok: t => /unlock/i.test(t) && /lessons tab/i.test(t),
    what: 'says to UNLOCK Lesson 1, and where (Lessons tab)' },
  { id: 'link', ok: t => /class(es)? tab/i.test(t) && /copy link/i.test(t) && /\bQR\b/.test(t),
    what: 'says where the CLASS LINK comes from (Classes tab, Copy link / QR)' },
  { id: 'reach', ok: t => /(paste|board|scan|projector)/i.test(t),
    what: 'says how pupils actually RECEIVE that link' },
  { id: 'passcode', ok: t => /passcode/i.test(t) && /(head of department|department passcode)/i.test(t) && /not your c2k/i.test(t),
    what: 'says where the staff PASSCODE comes from (and what it is not)' }
];

function e08Section() {
  section('E-08 - Lesson 1\'s brief tells a cover teacher how to start the hour');
  const packed = JSON.parse(fs.readFileSync(path.join(CONTENT, 'j1/lessons/j1-01.json'), 'utf8'));
  const brief = briefOf(packed);
  /* The brief was restructured on 30 Jul to the TEACHER BRIEF STANDARD, so the
     four start steps now live in "Preparing for this lesson" and "Resources"
     rather than in a minute-by-minute list. The FACTS being checked are the
     same four - that is the point of scoring predicates rather than wording. */
  const prep = (brief.prepare || []).map(p => p.title + ' ' + p.text).join('\n') +
    '\n' + (brief.resources || []).map(r => r.label + ' ' + r.what + ' ' + (r.where || '')).join('\n');
  E08.forEach(c => check(c.ok(prep), 'the packed brief\'s preparation section ' + c.what));

  check((brief.purpose || []).length > 0, 'it opens with a plain-English PURPOSE, not design rationale');
  check(!/why the lesson is built/i.test(JSON.stringify(brief)), 'the old "why it is built this way" framing is gone');
  check((brief.atAGlance || []).length >= 10,
    'every part of the hour is introduced BEFORE the instructions use its name (' + (brief.atAGlance || []).length + ' entries)');
  check((brief.runningTheHour || []).filter(h => h.say).length >= 8,
    'the teacher is given words to say, not just things to do (' + (brief.runningTheHour || []).filter(h => h.say).length + ')');
  check((brief.goesWrong || []).length >= 6, 'and a what-goes-wrong section (' + (brief.goesWrong || []).length + ')');

  /* No preparation TIMINGS - Damien's rule: how long a teacher takes to feel
     ready is her call, and "three minutes" undermined it. */
  const prepText = (brief.prepare || []).map(p => p.title + ' ' + p.text).join(' ');
  check(!/\b(one|two|three|four|five|\d+)\s*(minute|min)\b/i.test(prepText),
    'no timing is put on PREPARATION: ' + (prepText.match(/\b\w+\s*minutes?\b/i) || ['none found'])[0]);

  /* The Pairing panel could not be used as a prep check - it only renders for a
     delivered lesson - and the brief must say when it DOES appear. */
  check(!/(check|look for|find)[^.]{0,60}pairing panel/i.test(prepText),
    'the prep steps no longer send the teacher hunting for the Pairing panel');
  check(/pairing panel/i.test(JSON.stringify(brief)) && /only appears/i.test(JSON.stringify(brief)),
    'and the brief says WHEN that panel appears instead');

  /* Two claims that were simply untrue and must never come back: there is no
     Mission Briefing video to play, and no audio in the closing message. */
  const all = JSON.stringify(brief);
  check(!/play the mission briefing/i.test(all), 'it no longer tells the teacher to PLAY the Mission Briefing (there is no video)');
  check(!/headphones/i.test(all), 'and no longer implies the closing message has audio');
  check(/no video for this lesson/i.test(all), 'it says plainly that this lesson has no video, so nothing looks missing');

  /* E-07: the old overrun plan named two levers the built platform cannot do.
     It is gone; what replaced it must be achievable. */
  check(!!brief.ifBehind, 'there is an "if you fall behind" section');
  check(!/run badge 2 as a (whole-class )?(projector )?demo/i.test(all) && !/shorten badge 5/i.test(all),
    'the two impossible overrun levers (E-07) are gone rather than repeated');
  check(/licence exam/i.test(brief.ifBehind || ''), 'and it protects the Licence Exam, which is the one thing that cannot be rushed');

  section('E-08 CONTROL - the same checks against the pre-fix brief');
  try {
    const old = JSON.parse(gitShow(PREFIX_REF, 'ks3-dt/content/j1/lessons/j1-01.json'));
    const ob = briefOf(old);
    const ot = (ob.minuteByMinute || [])[0] || '';
    const missed = E08.filter(c => !c.ok(ot)).map(c => c.id);
    check(missed.length === E08.length,
      'CONTROL: pre-fix, ALL FOUR start steps were missing (' + JSON.stringify(missed) + ')');
    check(/pairing panel/i.test(ot),
      'CONTROL: pre-fix, the one prep check offered WAS the Pairing panel');
    check(!ob.purpose && !ob.runningTheHour,
      'CONTROL: pre-fix, the brief had none of the sections a teacher needs');
    check(/play the mission briefing/i.test(JSON.stringify(ob)),
      'CONTROL: pre-fix, it told the teacher to play a video that does not exist');
  } catch (e) {
    check(false, 'CONTROL could not read the pinned pre-fix content: ' + e.message);
  }
}

/* ================= mocked Apps Script (same shape as qa-relock.js) ========== */
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
    CacheService: {
      getScriptCache: () => ({
        get: k => (cache.has(k) ? cache.get(k) : null),
        put: (k, v) => cache.set(k, String(v)),
        remove: k => cache.delete(k),
        getAll: ks => { const o = {}; ks.forEach(k => { if (cache.has(k)) o[k] = cache.get(k); }); return o; }
      })
    },
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
  vm.runInContext(fs.readFileSync(source, 'utf8'), sandbox, { filename: path.basename(source) });
  return { sandbox, store, cache };
}

/* Seed a class where two pupils are live-present on Lesson 1's pairing stage. */
function seedPairing(S, store) {
  const sp = S.PropertiesService.getScriptProperties();
  const tmin = S.tmin_();
  sp.setProperty('classes', JSON.stringify([{ name: CLASS, owner: 'staff@demo', year: 'j1' }]));
  sp.setProperty('staffPasscode', 'demo');
  sp.setProperty('lock:' + CLASS, JSON.stringify({ '1': { u: tmin - 60, on: 1 } }));
  ['anya.murphy@demo', 'cara.devlin@demo', 'erin.mallon@demo', 'niamh.quinn@demo'].forEach((e, i) => {
    sp.setProperty('p:' + CLASS + ':' + e, JSON.stringify({
      n: ['Anya Murphy', 'Cara Devlin', 'Erin Mallon', 'Niamh Quinn'][i],
      cn: ['Amber Kite', 'Bright Comet', 'Copper Fox', 'Dawn Otter'][i],
      j: tmin - 60, xp: 10, g: '', L: { '1': [1, 10, '', '', '', tmin - 5, 3, 0, '', 0, 0] }
    }));
  });
  return tmin;
}
const LESSON = 'j1-01';
const STAGE = 4;
const ROOM = ['anya.murphy@demo', 'cara.devlin@demo', 'erin.mallon@demo', 'niamh.quinn@demo'];

/* Everyone in the room is live on the stage. Without this the FIRST pupil to
   join is the only one "expected", and pairMatch_ correctly releases her solo -
   which would make this harness test a one-pupil class, not a room. */
function pingRoom(S, extra) {
  ROOM.concat(extra || []).forEach(e => {
    S.CURRENT_EMAIL = e;
    S.apiPing({ classCode: CLASS, lessonNum: '1', ci: STAGE, cc: 9 });
  });
}

function joinAs(S, email) {
  S.CURRENT_EMAIL = email;
  S.apiPing({ classCode: CLASS, lessonNum: '1', ci: STAGE, cc: 9 });
  return S.apiPairJoin({ classCode: CLASS, lessonId: LESSON, stageIdx: STAGE });
}
function channelAs(S, email, pid, since) {
  S.CURRENT_EMAIL = email;
  return S.apiPairChannel({ classCode: CLASS, lessonId: LESSON, pid: pid, since: since || 0 });
}

/* ================= C-11 - Reset pairing must dissolve, not deadlock ========= */
function c11Section() {
  section('C-11 - "Reset pairing" releases pupils instead of deadlocking them');
  const env = makeEnv(SERVER);
  const S = env.sandbox;
  seedPairing(S, env.store);

  const A = ROOM[0], B = ROOM[1], C = ROOM[2], D = ROOM[3];
  pingRoom(S);
  joinAs(S, A);
  const rb = joinAs(S, B);
  check(rb.state === 'paired', 'two pupils at the stage form a pair (' + rb.state + ')');
  const pid = String(rb.pid);
  check(channelAs(S, A, pid).ok === true, 'both halves can poll the channel before the reset');

  // a chat message, so there is something a dissolve must not destroy
  S.CURRENT_EMAIL = A;
  S.apiPairSend({ classCode: CLASS, lessonId: LESSON, pid: pid, kind: 'msg', text: 'the payslip goes in Admin, agreed?' });

  // a SECOND pair that has already finished - history, not a deadlock
  pingRoom(S);
  joinAs(S, C);
  const rd = joinAs(S, D);
  check(rd.state === 'paired', 'a second pair forms (' + rd.state + ')');
  const donePid = String(rd.pid);
  S.CURRENT_EMAIL = C;
  S.apiPairComplete({ classCode: CLASS, lessonId: LESSON, pid: donePid });

  // the teacher presses the panic button
  const reset = S.apiAdmin({ sub: 'pairReset', passcode: 'demo', className: CLASS, lessonId: LESSON });
  check(reset.ok === true, 'pairReset returns ok: ' + JSON.stringify(reset));
  check(Number(reset.freed) === 2, 'it reports the 2 agents it released (freed=' + reset.freed + ')');
  check(Number(reset.sealed) === 1, 'and leaves the finished pair sealed (sealed=' + reset.sealed + ')');

  // THE BUG: the pupil's next poll must TELL her, not fail forever
  const pa = channelAs(S, A, pid);
  const pb = channelAs(S, B, pid);
  check(pa.ok === true && Number(pa.dis) === 1,
    'the very next channel poll tells agent A the channel closed: ' + JSON.stringify(pa).slice(0, 90));
  check(pb.ok === true && Number(pb.dis) === 1, 'and tells her partner too');

  // ...and she is genuinely free, without a reload
  const rejoinA = S.apiPairJoin.call(null, (S.CURRENT_EMAIL = A, { classCode: CLASS, lessonId: LESSON, stageIdx: STAGE }));
  check(rejoinA.ok === true && rejoinA.state === 'solo',
    'a re-join now returns SOLO - she carries on where she stands: ' + JSON.stringify(rejoinA));
  S.CURRENT_EMAIL = A;
  const sendAfter = S.apiPairSend({ classCode: CLASS, lessonId: LESSON, pid: pid, kind: 'msg', text: 'hello?' });
  check(sendAfter.ok === false, 'the dissolved channel accepts no new messages: ' + JSON.stringify(sendAfter));

  // the finished pair is untouched
  const doneState = (S.CURRENT_EMAIL = C, S.apiPairJoin({ classCode: CLASS, lessonId: LESSON, stageIdx: STAGE }));
  check(doneState.state === 'paired' && Number(doneState.done) === 1,
    'the pair that had already finished is left alone: ' + JSON.stringify(doneState).slice(0, 90));

  // the safeguarding record survives - the old delete destroyed the lens's key
  const tx = S.apiAdmin({ sub: 'pairTranscript', passcode: 'demo', className: CLASS, lessonId: LESSON, pid: pid });
  check(tx.ok === true && ((tx.lines || []).length > 0 || String(tx.tx || '').length > 0),
    'the dissolved pair\'s chat transcript is still readable by the teacher: ' + JSON.stringify(tx).slice(0, 110));

  // the lens tells the truth about what it is showing
  const lens = S.apiAdmin({ sub: 'pairs', passcode: 'demo', className: CLASS, lessonId: LESSON });
  const dissolved = (lens.pairs || []).filter(p => Number(p.dis));
  check(lens.ok === true && dissolved.length === 1, 'the staff lens marks the dissolved pair (dis=1)');
  check((lens.solo || []).length === 2, 'and lists both released agents as solo runs: ' +
    JSON.stringify((lens.solo || []).map(s => s.name)));

  // a stuck WAITER is still unstuck - the button's actual purpose
  const waiter = 'ryan.fitzsimons@demo';
  S.PropertiesService.getScriptProperties().setProperty('p:' + CLASS + ':' + waiter,
    JSON.stringify({ n: 'Ryan Fitzsimons', cn: 'Ember Hawk', j: S.tmin_() - 60, xp: 0, g: '', L: { '1': [1, 0, '', '', '', S.tmin_(), 1, 0, '', 0, 0] } }));
  const w1 = joinAs(S, waiter);
  check(w1.state === 'wait' || w1.state === 'solo', 'a lone late arrival queues: ' + w1.state);
  S.apiAdmin({ sub: 'pairReset', passcode: 'demo', className: CLASS, lessonId: LESSON });
  const w2 = joinAs(S, waiter);
  check(w2.ok === true && w2.state !== 'paired',
    'after a reset she is back in the queue rather than stranded: ' + w2.state);

  section('C-11 CONTROL - the pre-fix server really did deadlock');
  const tmp = path.join(require('os').tmpdir(), 'ks3dt-prefix-pairreset.js');
  try {
    fs.writeFileSync(tmp, gitShow(PREFIX_REF, 'ks3-dt/platform/server/Code.gs.template'));
    const old = makeEnv(tmp);
    const O = old.sandbox;
    seedPairing(O, old.store);
    pingRoom(O);
    joinAs(O, A);
    const orb = joinAs(O, B);
    const opid = String(orb.pid);
    check(orb.state === 'paired', 'CONTROL: pre-fix, the pair forms the same way');
    O.apiAdmin({ sub: 'pairReset', passcode: 'demo', className: CLASS, lessonId: LESSON });
    const opoll = channelAs(O, A, opid);
    check(opoll && opoll.ok === false && opoll.error === 'not-your-pair',
      'CONTROL: pre-fix, her next poll just FAILED, with nothing on screen to act on - ' + JSON.stringify(opoll));
    const opoll2 = channelAs(O, A, opid);
    check(opoll2 && opoll2.ok === false,
      'CONTROL: pre-fix, it kept failing - the deadlock the audit describes (only a reload recovered)');
    const otx = O.apiAdmin({ sub: 'pairTranscript', passcode: 'demo', className: CLASS, lessonId: LESSON, pid: opid });
    check(otx && otx.ok === false,
      'CONTROL: pre-fix, the delete also lost the pair\'s transcript for the teacher - ' + JSON.stringify(otx));
  } catch (e) {
    check(false, 'CONTROL could not run against ' + PREFIX_REF + ': ' + e.message);
  }
}

/* ================= browser halves ================= */
async function openStaffPanel(page) {
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button, a')).find(x => /^Staff$/i.test((x.textContent || '').trim()));
    if (b) b.click();
  });
  await sleep(700);
  await page.evaluate(() => {
    const i = document.querySelector('#sf-pass');
    if (i) i.value = 'demo';
    const go = document.querySelector('[data-action="gate-go"]');
    if (go) go.click();
  });
  await sleep(1500);
}
async function bootPupil(ctx, as) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + as, { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(800);
  return { page, errs };
}

async function c08Browser(ctx) {
  section('C-08 - the staff panel re-locks the moment it closes');
  const { page, errs } = await bootPupil(ctx, 'anya');
  await openStaffPanel(page);

  const opened = await page.evaluate(() => ({
    tabs: document.querySelectorAll('#staff-body .staff-tab').length,
    gate: !!document.querySelector('#sf-pass')
  }));
  check(opened.tabs > 3 && !opened.gate, 'the passcode opens the panel (' + opened.tabs + ' tabs)');

  // load a tab that actually holds pupil identity, so the close has something to protect
  await page.evaluate(() => { const b = document.querySelector('[data-action="select-class"]'); if (b) b.click(); });
  await sleep(1200);
  const hadNames = await page.evaluate(() => /Demo-8A/.test(document.querySelector('#staff-body').textContent));
  check(hadNames, 'the Classes tab is showing real class data');

  // close with the x, exactly as the audit did
  await page.evaluate(() => { const x = document.querySelector('[data-close="staff-modal"]'); if (x) x.click(); });
  await sleep(500);
  const afterClose = await page.evaluate(() => ({
    hidden: document.getElementById('staff-modal').hidden,
    bodyLen: document.querySelector('#staff-body').innerHTML.length,
    leftover: /Demo-8A|@demo/.test(document.querySelector('#staff-body').textContent)
  }));
  check(afterClose.hidden, 'the x hides the panel');
  check(afterClose.bodyLen === 0 && !afterClose.leftover,
    'and empties it - no keys, names or transcripts left in the DOM (' + afterClose.bodyLen + ' chars)');

  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button, a')).find(x => /^Staff$/i.test((x.textContent || '').trim())); if (b) b.click(); });
  await sleep(700);
  const reopened = await page.evaluate(() => ({
    gate: !!document.querySelector('#sf-pass'),
    tabs: document.querySelectorAll('#staff-body .staff-tab').length
  }));
  check(reopened.gate && reopened.tabs === 0, 'RE-OPENING ASKS FOR THE PASSCODE AGAIN (the audit\'s C-08 repro)');

  // the Escape path must re-lock too
  await page.evaluate(() => {
    const i = document.querySelector('#sf-pass'); if (i) i.value = 'demo';
    const go = document.querySelector('[data-action="gate-go"]'); if (go) go.click();
  });
  await sleep(1400);
  check(await page.evaluate(() => !document.querySelector('#sf-pass')), 'it opens again with the right passcode');
  await page.keyboard.press('Escape');
  await sleep(400);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button, a')).find(x => /^Staff$/i.test((x.textContent || '').trim())); if (b) b.click(); });
  await sleep(600);
  check(await page.evaluate(() => !!document.querySelector('#sf-pass')), 'closing with Escape re-gates it as well');

  // the wrong passcode still gets nowhere
  await page.evaluate(() => {
    const i = document.querySelector('#sf-pass'); if (i) i.value = 'nope';
    const go = document.querySelector('[data-action="gate-go"]'); if (go) go.click();
  });
  await sleep(1400);
  const wrong = await page.evaluate(() => ({
    gate: !!document.querySelector('#sf-pass'),
    msg: (document.querySelector('#sf-msg') || {}).textContent || ''
  }));
  check(wrong.gate && /not recognised/i.test(wrong.msg), 'a wrong passcode is refused: ' + wrong.msg);

  check(errs.length === 0, 'zero console errors on the staff tab: ' + JSON.stringify(errs));
  await page.close();

  /* The idle clock, run at 2 seconds instead of 15 minutes. Only the constant is
     rewritten - the timer, the close and the re-gate are the shipped code. */
  section('C-08 - a panel left open on a pupil\'s machine locks itself');
  const fast = await ctx.newPage();
  const ferrs = [];
  fast.on('pageerror', e => ferrs.push('PAGEERROR ' + e.message));
  await fast.route('**/platform/staff.js', async route => {
    const body = fs.readFileSync(path.join(ROOT, 'ks3-dt/platform/staff.js'), 'utf8')
      .replace('var IDLE_LOCK_MS = 900000;', 'var IDLE_LOCK_MS = 2000;')
      .replace('}, 30000);', '}, 500);');
    route.fulfill({ status: 200, contentType: 'application/javascript', body: body });
  });
  await fast.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await fast.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(700);
  await openStaffPanel(fast);
  check(await fast.evaluate(() => !document.querySelector('#sf-pass')), 'the panel is open and unlocked');
  await sleep(4500);   // longer than the (accelerated) idle limit, no interaction
  const idled = await fast.evaluate(() => ({
    hidden: document.getElementById('staff-modal').hidden,
    body: document.querySelector('#staff-body').innerHTML.length
  }));
  check(idled.hidden, 'it closes itself once nobody has touched it');
  await fast.evaluate(() => { const b = Array.from(document.querySelectorAll('button, a')).find(x => /^Staff$/i.test((x.textContent || '').trim())); if (b) b.click(); });
  await sleep(600);
  const idleGate = await fast.evaluate(() => ({
    gate: !!document.querySelector('#sf-pass'),
    msg: (document.querySelector('#sf-msg') || {}).textContent || ''
  }));
  check(idleGate.gate, 'and demands the passcode again');
  check(/15 minutes/.test(idleGate.msg), 'telling the teacher why: ' + idleGate.msg);
  check(ferrs.length === 0, 'no page errors on the idle path: ' + JSON.stringify(ferrs));
  await fast.close();

  /* CONTROL: the same clicks against the PINNED pre-fix staff.js + app.js. It
     must walk straight back in - otherwise the checks above prove nothing. */
  section('C-08 CONTROL - the pre-fix panel really did stay open');
  const old = await ctx.newPage();
  const oldStaff = gitShow(PREFIX_REF, 'ks3-dt/platform/staff.js');
  const oldApp = gitShow(PREFIX_REF, 'ks3-dt/platform/app.js');
  await old.route('**/platform/staff.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: oldStaff }));
  await old.route('**/platform/app.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: oldApp }));
  await old.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await old.evaluate(() => { const b = document.querySelector('.intro-skip, .intro-overlay button'); if (b) b.click(); });
  await sleep(700);
  await openStaffPanel(old);
  check(await old.evaluate(() => document.querySelectorAll('#staff-body .staff-tab').length > 3),
    'CONTROL: the pre-fix panel opens the same way');
  await old.evaluate(() => { const b = document.querySelector('[data-action="select-class"]'); if (b) b.click(); });
  await sleep(1200);
  await old.evaluate(() => { const x = document.querySelector('[data-close="staff-modal"]'); if (x) x.click(); });
  await sleep(500);
  const oldLeft = await old.evaluate(() => document.querySelector('#staff-body').innerHTML.length);
  await old.evaluate(() => { const b = Array.from(document.querySelectorAll('button, a')).find(x => /^Staff$/i.test((x.textContent || '').trim())); if (b) b.click(); });
  await sleep(700);
  const oldReopen = await old.evaluate(() => ({
    gate: !!document.querySelector('#sf-pass'),
    tabs: document.querySelectorAll('#staff-body .staff-tab').length
  }));
  check(!oldReopen.gate && oldReopen.tabs > 3,
    'CONTROL: pre-fix, re-opening walked STRAIGHT BACK IN with no passcode (' + oldReopen.tabs + ' tabs)');
  check(oldLeft > 0, 'CONTROL: pre-fix, the closed panel still held its rendered contents (' + oldLeft + ' chars in the DOM)');
  await old.close();
}

async function c11Browser(ctx) {
  section('C-11 (browser) - the FakeServer mirror and the client teardown');
  const { page, errs } = await bootPupil(ctx, 'anya');

  // FakeServer mirror: pair with the simulated partner, then dissolve
  const mirror = await page.evaluate(async () => {
    const call = (a, p) => window.App.call(a, p);
    await call('ping', { lessonNum: '1', ci: 4, cc: 9 });
    let j = await call('pairJoin', { lessonId: 'j1-01', stageIdx: 4 });
    for (let i = 0; i < 12 && j.state !== 'paired'; i++) {
      await new Promise(r => setTimeout(r, 900));
      j = await call('pairJoin', { lessonId: 'j1-01', stageIdx: 4 });
    }
    if (j.state !== 'paired') return { paired: false, state: j.state };
    const before = await call('pairChannel', { lessonId: 'j1-01', pid: j.pid, since: 0 });
    const reset = await call('admin', { passcode: 'demo', sub: 'pairReset', className: 'Demo-8A', lessonId: 'j1-01' });
    const after = await call('pairChannel', { lessonId: 'j1-01', pid: j.pid, since: 0 });
    const rejoin = await call('pairJoin', { lessonId: 'j1-01', stageIdx: 4 });
    const lens = await call('admin', { passcode: 'demo', sub: 'pairs', className: 'Demo-8A', lessonId: 'j1-01' });
    return { paired: true, pid: j.pid, before: before, reset: reset, after: after, rejoin: rejoin, lens: lens };
  });
  check(mirror.paired === true, 'the FakeServer pairs the pupil with the simulated partner (' + (mirror.state || 'paired') + ')');
  if (mirror.paired) {
    check(mirror.before.ok === true, 'the channel polls fine before the reset');
    check(mirror.reset.ok === true && Number(mirror.reset.freed) >= 1,
      'preview pairReset reports what it released: ' + JSON.stringify(mirror.reset));
    check(mirror.after.ok === true && Number(mirror.after.dis) === 1,
      'PREVIEW MIRRORS PRODUCTION: the next poll answers dis:1, not not-your-pair - ' + JSON.stringify(mirror.after).slice(0, 90));
    check(mirror.rejoin.state === 'solo', 'and a re-join returns solo: ' + mirror.rejoin.state);
    check((mirror.lens.pairs || []).some(p => Number(p.dis)), 'the preview lens marks it dissolved too');
  }

  /* client teardown: the REAL PairKit loop against the REAL FakeServer. This is
     the half the old code got wrong - the poll failed and nothing happened.
     Phase 1 released this pupil to solo, so the pairing store is reset first. */
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
    delete db.pairing; delete db.pq; delete db.pch; delete db.pres;
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  const teardown = await page.evaluate(async () => {
    const ctx2 = {
      lesson: { id: 'j1-01' }, review: false, catchup: false,
      call: (a, p) => window.App.call(a, Object.assign({ lessonId: 'j1-01' }, p))
    };
    let j = await ctx2.call('pairJoin', { stageIdx: 4 });
    for (let i = 0; i < 12 && j.state !== 'paired'; i++) {
      await new Promise(r => setTimeout(r, 900));
      j = await ctx2.call('pairJoin', { stageIdx: 4 });
    }
    if (j.state !== 'paired') return { ok: false, state: j.state };
    window.PairKit.st = {
      pid: String(j.pid), mi: Number(j.mi), members: (j.members || []).map(String),
      trio: false, seq: 0, live: (j.members || []).map(() => 1), done: 0, rv: 0, names: null
    };
    let ended = '';
    window.PairKit.onEnd(function (why) { ended = String(why || 'end'); });
    window.PairKit._loop(ctx2);
    await window.App.call('admin', { passcode: 'demo', sub: 'pairReset', className: 'Demo-8A', lessonId: 'j1-01' });
    for (let i = 0; i < 20 && !ended; i++) await new Promise(r => setTimeout(r, 500));
    return { ok: true, ended: ended, st: window.PairKit.st, polling: !!window.PairKit._chT };
  });
  check(teardown.ok === true, 'PairKit reached the paired state (' + (teardown.state || 'paired') + ')');
  if (teardown.ok) {
    check(teardown.ended === 'reset',
      'THE CLIENT IS TOLD: PairKit fires onEnd within a poll, with no reload (' + JSON.stringify(teardown.ended) + ')');
    check(teardown.st === null, 'it drops the dead pair state');
    check(teardown.polling === false, 'and stops polling a channel that no longer exists');
  }
  check(errs.length === 0, 'zero console errors: ' + JSON.stringify(errs));
  await page.close();
  await c11Vault(ctx);
}

/* The half the pupil actually sees: a live paired VAULT, dissolved under her. */
async function c11Vault(ctx) {
  section('C-11 (vault) - the pupil\'s screen recovers itself, with her work intact');
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
    delete db.pairing; delete db.pq; delete db.pch; delete db.pres;
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await page.evaluate(() => { const x = document.querySelector('.intro-skip, .intro-overlay button'); if (x) x.click(); });
  await sleep(600);
  await page.evaluate(() => window.App.openLesson('j1-01'));
  await sleep(2500);
  await page.evaluate(() => { window.App.state.chunkIdx = 3; window.App.nextChunk(); });  // -> the Vault
  await sleep(1500);
  for (let i = 0; i < 8; i++) {
    const hit = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Open the Vault/i.test(x.textContent));
      if (b) { b.click(); return true; }
      return false;
    });
    if (hit) break;
    await sleep(700);
  }
  let paired = false;
  for (let i = 0; i < 40; i++) {
    paired = await page.evaluate(() => !!document.querySelector('.vault-wrap.paired .chat-dock'));
    if (paired) break;
    await sleep(800);
  }
  check(paired, 'the pupil reaches a LIVE paired Vault with the chat dock open');
  if (paired) {
    // file one document first, so the dissolve has work it could destroy
    const filedBefore = await page.evaluate(async () => {
      const info = await window.App.call('vaultInfo', { lessonId: 'j1-01', keyId: 'vault' });
      return document.querySelectorAll('.vault-folder .vault-file').length;
    });
    await page.evaluate(() => window.App.call('admin', { passcode: 'demo', sub: 'pairReset', className: 'Demo-8A', lessonId: 'j1-01' }));
    await sleep(4200);
    const after = await page.evaluate(() => ({
      dock: !!document.querySelector('.chat-dock'),
      wrap: !!document.querySelector('.vault-wrap.paired'),
      banner: (document.querySelector('.pair-banner.slim') || {}).textContent || '',
      stuck: !!document.querySelector('.vault-stage.not-my-turn'),
      filed: document.querySelectorAll('.vault-folder .vault-file').length,
      tray: document.querySelectorAll('.vault-tray .vault-file').length,
      toast: (document.querySelector('#toast') || {}).textContent || ''
    }));
    check(after.dock === false && after.wrap === false,
      'the chat dock and the paired layout come down BY THEMSELVES - no reload');
    check(/on your own/i.test(after.banner), 'the banner tells her what happened: ' + after.banner);
    check(/carry on solo/i.test(after.toast), 'and so does the toast: ' + after.toast);
    check(after.stuck === false, 'the turn lock is lifted (no "not your turn" left on screen)');
    check(after.filed >= filedBefore && after.tray > 0, 'nothing she had filed was lost');

    // she can genuinely act alone now: a real drag reaches the Vault's judgement
    const box = await page.evaluate(() => {
      const f = document.querySelector('.vault-tray .vault-file');
      const fo = document.querySelector('.vault-folder');
      const a = f.getBoundingClientRect(), b2 = fo.getBoundingClientRect();
      return { fx: a.x + a.width / 2, fy: a.y + a.height / 2, tx: b2.x + b2.width / 2, ty: b2.y + b2.height / 2 };
    });
    await page.mouse.move(box.fx, box.fy);
    await page.mouse.down();
    await page.mouse.move(box.tx, box.ty, { steps: 12 });
    await page.mouse.up();
    await sleep(1000);
    const drag = await page.evaluate(() => ({
      toast: (document.querySelector('#toast') || {}).textContent || '',
      filed: document.querySelectorAll('.vault-folder .vault-file').length
    }));
    check(!/Not your drop/i.test(drag.toast),
      'she is no longer told "Not your drop" by a partner who is gone: ' + drag.toast);
    check(/Vault disagrees/i.test(drag.toast) || drag.filed > filedBefore,
      'her drag reaches the Vault\'s real judgement - filed or returned, but ANSWERED: ' + drag.toast);
  }
  check(errs.length === 0, 'zero console errors through the whole recovery: ' + JSON.stringify(errs));
  await page.close();
}

async function c14Browser(ctx) {
  section('C-14 - the published preview says out loud that nothing is marked');
  // 1. the honest case: keys present locally, no banner
  const withKeys = await bootPupil(ctx, 'anya');
  const noBanner = await withKeys.page.evaluate(() => !document.getElementById('ks3dt-nokeys'));
  check(noBanner, 'with dev-keys present (localhost) there is NO banner - it is not noise');
  await withKeys.page.close();

  // 2. github.io, reproduced exactly: dev-keys.json 404s
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.route('**/content/dev-keys.json', route => route.fulfill({ status: 404, body: 'Not Found' }));
  const realErrs = () => errs.filter(e => !/404|dev-keys/i.test(e));   // the 404 IS the scenario
  await page.goto(BASE + 'cara', { waitUntil: 'domcontentloaded' });
  await sleep(2600);

  const bar = await page.evaluate(() => {
    const b = document.getElementById('ks3dt-nokeys');
    if (!b) return null;
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    return {
      text: (b.textContent || '').replace(/\s+/g, ' ').trim(),
      pos: cs.position, z: Number(cs.zIndex), top: r.top, width: r.width,
      vis: cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.5,
      bodyPad: getComputedStyle(document.body).paddingTop
    };
  });
  check(!!bar, 'a banner appears the moment dev-keys.json 404s');
  if (bar) {
    check(/not being marked/i.test(bar.text) && /NOT the live app/i.test(bar.text),
      'it says both halves of the truth: ' + bar.text);
    check(/every answer is accepted/i.test(bar.text), 'and that every answer is accepted, right or wrong');
    check(bar.pos === 'fixed' && bar.top === 0 && bar.z >= 99999 && bar.vis,
      'it is pinned to the top of the viewport above everything (' + bar.pos + ', z=' + bar.z + ')');
    check(parseFloat(bar.bodyPad) >= 30, 'the page is pushed down so it never covers the lesson (' + bar.bodyPad + ')');
    check(bar.width > 400, 'it spans the page rather than hiding in a corner (' + Math.round(bar.width) + 'px)');
  }
  // it cannot be dismissed by scrolling away
  await page.evaluate(() => window.scrollTo(0, 400));
  await sleep(400);
  check(await page.evaluate(() => {
    const b = document.getElementById('ks3dt-nokeys');
    return !!b && b.getBoundingClientRect().top === 0;
  }), 'and it stays put when the page scrolls');

  // the marking reply itself is honest, not just the banner
  const marked = await page.evaluate(() => window.App.call('mark', { lessonId: 'j1-01', itemId: 'nope', choice: 0 }).then(r => r));
  check(marked && marked.ok === true && /NOT marked/i.test(String(marked.explain)),
    'the marking reply itself admits it was not marked: ' + String(marked && marked.explain).slice(0, 80));
  check(realErrs().length === 0, 'no console errors beyond the deliberate 404: ' + JSON.stringify(realErrs()));

  section('C-14 CONTROL - the pre-fix build was silent about it');
  try {
    const oldDev = gitShow(PREFIX_REF, 'ks3-dt/platform/dev-server.js');
    check(oldDev.indexOf('ks3dt-nokeys') === -1,
      'CONTROL: pre-fix, dev-server.js had no banner at all - the trap was invisible');
    check(/preview marking unavailable on this host/.test(oldDev),
      'CONTROL: pre-fix, the only hint was a parenthetical in the explain line');
  } catch (e) {
    check(false, 'CONTROL could not read the pinned pre-fix dev-server: ' + e.message);
  }
  await page.close();
}

(async () => {
  console.log('KS3 DT pre-deploy harness - E-08, C-08, C-11, C-14  (pre-fix control ref ' + PREFIX_REF + ')');
  if (!ONLY || ONLY === 'e08' || ONLY === 'server') e08Section();
  if (!ONLY || ONLY === 'c11' || ONLY === 'server') c11Section();
  if (ONLY !== 'server' && ONLY !== 'e08') {
    let browser;
    try {
      const { chromium } = require('./node_modules/playwright');
      browser = await chromium.launch({ headless: true });
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      if (!ONLY || ONLY === 'c08') await c08Browser(ctx);
      if (!ONLY || ONLY === 'c11') await c11Browser(ctx);
      if (!ONLY || ONLY === 'c14') await c14Browser(ctx);
    } catch (e) {
      check(false, 'browser half threw: ' + e.message);
    } finally {
      if (browser) await browser.close();
    }
  }
  console.log('\n=========================================');
  console.log('CHECKS RUN: ' + (PASS + FAILS.length) + '   PASSED: ' + PASS + '   FAILED: ' + FAILS.length);
  if (FAILS.length) { FAILS.forEach(f => console.log('  FAILED: ' + f)); console.log('PRE-DEPLOY CHECKS FAILED'); process.exit(1); }
  console.log('ALL PRE-DEPLOY CHECKS PASSED');
})();
