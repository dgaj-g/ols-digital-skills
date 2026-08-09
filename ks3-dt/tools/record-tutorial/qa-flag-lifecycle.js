/* qa-flag-lifecycle.js - a flag is a to-do, not a verdict.
 *
 * DAMIEN, 8 Aug 2026: "does the 'needs you' appear permanently or is there a way
 * to indicate that the teacher has dealt with it?" ... "it really is a gap that
 * needs addressed and fixed." It WAS permanent: a pupil's exit answers are
 * written once and her warm-up counters only ever rise, so two of the three red
 * triggers could never clear, and the amber one never could either.
 *
 * Now the teacher clicks a flag twice and it becomes a quiet grey
 * acknowledgement - helped (red) or heard (her own voice) - reversible the same
 * way, dated on hover, and deleting nothing. This harness pins the part that
 * must not be improvised: WHEN a dealt-with flag is allowed to come back.
 *
 * THE RE-ARM LAW, in the sentence staff are taught: red only returns if she
 * works on the lesson again and gets stuck again.
 *
 *   node qa-flag-lifecycle.js        (needs the dev server on :8096)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../..');
const P = f => path.join(ROOT, 'ks3-dt/platform', f);
const PREFIX_REF = process.env.KS3DT_FLAGS_PREFIX_REF || '387e773';
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=QA-Flags';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

const staff = fs.readFileSync(P('staff.js'), 'utf8');
const server = fs.readFileSync(P('server/Code.gs.template'), 'utf8');
const dev = fs.readFileSync(P('dev-server.js'), 'utf8');
function atPrefix(rel) {
  try { return execFileSync('git', ['show', PREFIX_REF + ':ks3-dt/platform/' + rel], { cwd: ROOT, encoding: 'utf8' }); }
  catch (e) { return null; }
}
function ledgerCap(src) {
  const m = /join\(';'\)\.slice\(0, (\d+)\)/.exec(src);
  return m ? Number(m[1]) : null;
}
function subBlock(src, name) {
  const i = src.indexOf("sub === '" + name + "'");
  if (i === -1) return '';
  const j = src.indexOf("sub === '", i + 20);
  return src.slice(i, j === -1 ? i + 1600 : j);
}

section('A. THE SERVER - who may mark a flag handled');
const fh = subBlock(server, 'flagHandled');
check(!!fh, 'the flagHandled call exists');
check(/canManageClass_\(cls, me\)/.test(fh) && /error: 'not-owner'/.test(fh),
  'and is gated to the class’s own teacher or a Head of Department, like removePupil');
check(/fhKind !== 'red' && fhKind !== 'voice'/.test(fh), 'it refuses anything but the two real flag kinds');
check(/mergeDetail_\(fhArr\[2\], fhKey \+ '=' \+ fhAt\)/.test(fh),
  'the acknowledgement is written onto the lesson’s own detail ledger (so the archive keeps it)');
check(/withLock_/.test(fh), 'and under the lock, so a concurrent save cannot clobber it');

section('B. THE RIDER HE WAS TOLD ABOUT - absence dismissal was ungated');
const ad = subBlock(server, 'absenceDismiss');
check(/canManageClass_\(cls, me\)/.test(ad) && /error: 'not-owner'/.test(ad),
  'absenceDismiss now carries the same gate');
const oldServer = atPrefix('server/Code.gs.template');
if (!oldServer) {
  check(false, 'could not read the pre-fix commit ' + PREFIX_REF + ' - the controls cannot run');
} else {
  check(!/sub === 'flagHandled'/.test(oldServer), 'pre-fix: there was no way to mark a flag handled at all');
  check(!/canManageClass_/.test(subBlock(oldServer, 'absenceDismiss')),
    'pre-fix CONTROL: absenceDismiss had no ownership check - any passcode holder could clear another teacher’s flags');
}

section('C. THE LEDGER CAP IS ONE NUMBER, NOT TWO (DFM 157a)');
const capLive = ledgerCap(server), capPrev = ledgerCap(dev);
check(capLive !== null && capPrev !== null, 'both caps were found (live ' + capLive + ', preview ' + capPrev + ')');
check(capLive === capPrev, 'the real server and the preview agree on the ledger cap (' + capLive + ')');
if (oldServer) {
  const oldDev = atPrefix('dev-server.js');
  check(oldDev && ledgerCap(oldDev) !== ledgerCap(oldServer),
    'CONTROL: pre-fix they disagreed (' + (oldDev ? ledgerCap(oldDev) : '?') + ' v ' + ledgerCap(oldServer) + ')');
}

section('D. THE CLIENT - two presses, and never a one-way door');
check(/data-action="flag-toggle"/.test(staff), 'the flag is a real button');
check(/mark as helped\?/.test(staff) && /mark as heard\?/.test(staff) && /put the flag back\?/.test(staff),
  'with the arming words for both directions');
check(/function liveReasonsFor/.test(staff) && /nothing new has been saved/.test(staff),
  'and the re-arm rule lives in one named place');

/* ---------------- the real thing, in a real browser ---------------- */
const CLASS = 'QA-Flags';
/* a worst-case Lesson 1 ledger: every key a real pupil can carry at once */
const FAT_LEDGER = 'rules=3/3;vault=5/6;bl=14/16|0121000000010000;cn=Opal Heron;vp=4/4';

function stageInPage(opts) {
  const CLS = 'QA-Flags', STAFF = 'teacher@demo';
  const EPOCH = 1767225600000;
  const tmin = Math.floor((Date.now() - EPOCH) / 60000);
  const weekAgo = tmin - 7 * 1440;
  const s = {
    passcode: 'demo',
    classes: [{ name: CLS, owner: STAFF, year: 'j1', created: new Date(Date.now() - 7 * 864e5).toISOString() }],
    locks: {}, hods: [], cfg: {}, team: {}, pupils: {}, userProps: {}
  };
  s.locks[CLS] = { '1': { u: weekAgo, on: 1 }, '2': { u: weekAgo + 1440, on: 1 } };
  s.cfg[CLS] = {
    lb: { mode: 'off', basis: 'xp', names: 'codename', topN: 0 },
    absDays: 5, cover: { on: 0, lesson: '', ts: 0 }, pairing: { on: 1 }, tn: { mode: 'team' }
  };
  function rec(name, xp, L) { return { n: name, cn: name.split(' ')[0] + ' Heron', j: weekAgo, xp: xp, g: '', L: L }; }
  /* Larr: [status, xp, detail, exitChosen, selfEval, lastSeen, mins, flags, comment, recapRight, recapTotal] */

  /* Ella: exit all wrong (a marks reason) AND says Not yet - both flags at once.
     Her L1 ledger is the fat one, so a toggle has to survive the cap. */
  s.pupils[CLS + ':ella.doran@demo'] = rec('Ella Doran', 90, {
    '1': [2, 45, opts.fatLedger + (opts.ellaHf ? ';hf=' + (tmin - 5) : ''), '1', '210|2', tmin - 30, 44, 0, 'I got lost at the vault', 6, 9],
    '2': [2, 45, (opts.ellaHv ? 'hv=' + (tmin - 5) : ''), '01', '200|1', tmin - 20, 40, 0, '', 5, 7]
  });
  /* Nuala: STARTED and idle - the only reason that can ever re-arm.
     lastSeen is set relative to the acknowledgement by the options below. */
  s.pupils[CLS + ':nuala.reid@demo'] = rec('Nuala Reid', 25, {
    '2': [1, 25, opts.nualaHf ? 'hf=' + (tmin - 60) : '', '', '', tmin - (opts.nualaWorkedSince ? 30 : 90), 10, 0, '', 0, 0]
  });
  /* Aoife: flagged for nothing at all - the control that a moot acknowledgement
     shows no pill whatsoever */
  s.pupils[CLS + ':aoife.kane@demo'] = rec('Aoife Kane', 70, {
    '2': [2, 70, opts.aoifeHf ? 'hf=' + (tmin - 5) : '', '10', '222|0', tmin - 10, 40, 0, '', 6, 7]
  });
  localStorage.setItem('ks3dt-dev', JSON.stringify(s));
}

async function openLive(page, opts) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(stageInPage, Object.assign({ fatLedger: FAT_LEDGER }, opts));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate(() => window.Staff.open());
  await sleep(700);
  await page.evaluate(() => {
    const i = document.querySelector('#staff-modal input[type=password], #staff-modal input');
    if (i) { i.value = 'demo'; i.dispatchEvent(new Event('input', { bubbles: true })); }
    const b = Array.from(document.querySelectorAll('#staff-modal button')).find(x => /enter|unlock|go/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await sleep(1800);
  await page.evaluate(() => {
    const b = document.querySelector('#staff-modal [data-action="select-class"][data-class="QA-Flags"]');
    if (b) b.click();
  });
  await sleep(900);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('#staff-modal [data-action="switch-tab"]')).find(x => /^live$/i.test((x.textContent || '').trim()));
    if (t) t.click();
  });
  await sleep(3000);
}
async function pick(page, n) {
  await page.evaluate((num) => {
    const sel = document.querySelector('#live-lesson-sel');
    sel.value = num; sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, n);
  await sleep(1800);
}
function readRows(page) {
  return page.evaluate(() => {
    const body = document.getElementById('staff-body');
    const rowFor = (name) => Array.from(body.querySelectorAll('.dash-table tr'))
      .find(tr => (tr.querySelector('td') || {}).textContent && tr.querySelector('td').textContent.indexOf(name) !== -1);
    const flags = (name) => {
      const tr = rowFor(name); if (!tr) return null;
      return Array.from(tr.querySelectorAll('.pill.flag, .pill.voice, .pill.flag-done')).map(p => ({
        text: p.textContent.trim(),
        cls: p.className,
        title: p.getAttribute('title') || '',
        on: p.getAttribute('data-on'),
        tag: p.tagName
      }));
    };
    const cellsOf = (name) => {
      const tr = rowFor(name); if (!tr) return null;
      return Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
    };
    return {
      ella: flags('Ella Doran'), nuala: flags('Nuala Reid'), aoife: flags('Aoife Kane'),
      ellaCells: cellsOf('Ella Doran'),
      ellaStuck: (() => { const tr = rowFor('Ella Doran'); return tr ? tr.className : ''; })(),
      chips: Array.from(body.querySelectorAll('.staff-actions .pill')).map(p => p.textContent.trim()),
      strip: (body.querySelector('.live-elsewhere') || {}).textContent || '',
      legend: (body.querySelector('.live-legend') || {}).textContent || '',
      status: (body.querySelector('#live-status') || {}).textContent || ''
    };
  });
}
async function clickFlag(page, name, kind, times) {
  for (let i = 0; i < times; i++) {
    await page.evaluate(([n, k]) => {
      const tr = Array.from(document.querySelectorAll('#staff-body .dash-table tr'))
        .find(x => (x.querySelector('td') || {}).textContent && x.querySelector('td').textContent.indexOf(n) !== -1);
      const b = tr.querySelector('[data-action="flag-toggle"][data-kind="' + k + '"]');
      b.click();
    }, [name, kind]);
    await sleep(i === times - 1 ? 1800 : 250);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  section('E. ONE CLICK ARMS, AND ARMING ALONE CHANGES NOTHING');
  await openLive(page, {});
  await pick(page, '2');
  let r = await readRows(page);
  check(r.ella.length === 2 && r.ella[0].tag === 'BUTTON', 'Ella carries both flags, and they are buttons');
  await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('#staff-body .dash-table tr'))
      .find(x => x.textContent.indexOf('Ella Doran') !== -1);
    tr.querySelector('[data-action="flag-toggle"][data-kind="red"]').click();
  });
  await sleep(300);
  const armed = await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('#staff-body .dash-table tr'))
      .find(x => x.textContent.indexOf('Ella Doran') !== -1);
    const b = tr.querySelector('[data-action="flag-toggle"][data-kind="red"]');
    return { text: b.textContent.trim(), armed: b.getAttribute('data-armed') };
  });
  check(/mark as helped\?/.test(armed.text), 'one click asks first: "' + armed.text + '"');
  await sleep(4400);
  const afterTimeout = await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('#staff-body .dash-table tr'))
      .find(x => x.textContent.indexOf('Ella Doran') !== -1);
    return tr.querySelector('[data-action="flag-toggle"][data-kind="red"]').textContent.trim();
  });
  check(/needs you/.test(afterTimeout), 'CONTROL: left alone it disarms itself, having saved nothing');

  section('F2. THE SAVE SAYS IT IS HAPPENING (DFM 161, his live finding)');
  /* read the DOM in the SAME TICK as the confirming click - before any reply
     could have landed - because that instant is what he sits looking at */
  const saving = await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('#staff-body .dash-table tr'))
      .find(x => x.textContent.indexOf('Ella Doran') !== -1);
    const b = tr.querySelector('[data-action="flag-toggle"][data-kind="red"]');
    b.click();          // arms
    b.click();          // confirms - the round trip starts now
    return { html: b.innerHTML, text: b.textContent.trim(), disabled: b.disabled, spinner: !!b.querySelector('.pill-spinner') };
  });
  check(saving.spinner, 'the moment it is confirmed, the flag shows a spinner');
  check(/Saving/.test(saving.text), 'and says what is happening: "' + saving.text + '"');
  check(saving.disabled, 'and cannot be pressed twice while it saves');
  await sleep(1800);
  let mid = await readRows(page);
  check(mid.ella.some(f => f.text === 'helped'), 'and it lands on grey when the save returns');
  /* put it back so the rest of the section starts from the live state */
  await clickFlag(page, 'Ella Doran', 'red', 2);
  const savingBack = await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('#staff-body .dash-table tr'))
      .find(x => x.textContent.indexOf('Ella Doran') !== -1);
    const b = tr.querySelector('[data-action="flag-toggle"][data-kind="red"]');
    b.click(); b.click();
    return !!b.querySelector('.pill-spinner');
  });
  check(savingBack, 'and the same spinner shows when bringing a flag BACK (he asked for both)');
  await sleep(1800);
  /* leave it LIVE again, so the next section starts where it expects to */
  await clickFlag(page, 'Ella Doran', 'red', 2);
  const backToLive = await readRows(page);
  check(backToLive.ella.some(f => f.text === 'needs you'), 'and the flag is live again for the next check');

  section('F. TWO CLICKS MARK IT DEALT WITH');
  await clickFlag(page, 'Ella Doran', 'red', 2);
  r = await readRows(page);
  const helped = r.ella.filter(f => f.text === 'helped')[0];
  check(!!helped, 'the red flag becomes a quiet grey "helped"');
  check(/^Marked helped on /.test(helped.title), 'the hover remembers the day: "' + helped.title.slice(0, 40) + '..."');
  check(/still in her row/.test(helped.title), 'and says plainly that her marks are untouched');
  check(r.ellaStuck.indexOf('is-stuck') === -1, 'her row stops being highlighted - it is not outstanding any more');
  check(/A grey flag is one you have already dealt with/.test(r.legend), 'the key explains grey flags now that one is on screen');
  check(r.status === '', 'and nothing went wrong quietly (the status line is empty)');

  section('G. NOTHING IS DELETED - the marks and her words stay exactly as they were');
  check(!!r.ellaCells && r.ellaCells.length > 6, 'her row still renders every column (' + (r.ellaCells || []).length + ')');
  const ellaL2 = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    return db.pupils['QA-Flags:ella.doran@demo'].L['2'];
  });
  check(ellaL2[3] === '01' && ellaL2[4] === '200|1',
    'her exit answers and her ratings are byte-identical after the acknowledgement');
  check(/hf=\d+/.test(String(ellaL2[2])), 'and the acknowledgement itself is stored on the ledger');

  section('H. HER OWN VOICE IS ACKNOWLEDGED SEPARATELY');
  let before = (await readRows(page)).chips.filter(c => /not yet/.test(c))[0];
  check(/1 says not yet/.test(before || ''), 'the count chip shows her before: "' + before + '"');
  await clickFlag(page, 'Ella Doran', 'voice', 2);
  r = await readRows(page);
  const heard = r.ella.filter(f => f.text === 'heard')[0];
  check(!!heard, 'the amber flag becomes a quiet grey "heard"');
  check(/ratings and comment are still in her row/.test(heard.title), 'and says her words are untouched');
  check(!r.chips.some(c => /not yet/.test(c)), 'the count chip drops her - it counts what is still outstanding');
  const ellaAfter = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    return db.pupils['QA-Flags:ella.doran@demo'].L['2'];
  });
  check(ellaAfter[8] === '' || ellaAfter[8] === ellaL2[8], 'her comment is exactly as it was');

  section('I. NEVER A ONE-WAY DOOR');
  await clickFlag(page, 'Ella Doran', 'red', 2);
  r = await readRows(page);
  check(r.ella.some(f => f.text === 'needs you'), 'two clicks on the grey flag bring the red back');
  check(r.ella.filter(f => f.text === 'needs you')[0].title.indexOf('every exit question wrong') !== -1,
    'with its reasons back in the hover');
  check(r.ellaStuck.indexOf('is-stuck') !== -1, 'and her row is outstanding again');

  section('J. THE LEDGER SURVIVES IT (the fat Lesson 1 record)');
  await pick(page, '1');
  await clickFlag(page, 'Ella Doran', 'red', 2);
  await clickFlag(page, 'Ella Doran', 'red', 2);
  const fat = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    return db.pupils['QA-Flags:ella.doran@demo'].L['1'][2];
  });
  check(/bl=14\/16\|0121000000010000/.test(fat), 'her sixteen baseline answers survive two toggles byte-for-byte');
  check(/cn=Opal Heron/.test(fat), 'and so does her codename (nothing was sliced off the tail)');
  check(fat.length <= capLive, 'the whole ledger is still inside the cap (' + fat.length + ' of ' + capLive + ')');

  section('K. THE RE-ARM LAW - red only returns if she works again and gets stuck again');
  await openLive(page, { nualaHf: true, nualaWorkedSince: false });
  await pick(page, '2');
  r = await readRows(page);
  check(r.nuala.length === 1 && r.nuala[0].text === 'helped',
    'idle since the teacher dealt with it: stays grey');
  await openLive(page, { nualaHf: true, nualaWorkedSince: true });
  await pick(page, '2');
  r = await readRows(page);
  check(r.nuala.some(f => f.text === 'needs you'),
    'she worked on it again and stalled again: the red flag returns');
  check(/nothing new has been saved/.test(r.nuala.filter(f => f.text === 'needs you')[0].title),
    'naming only the reason that is live now');

  await openLive(page, { ellaHf: true });
  await pick(page, '1');
  r = await readRows(page);
  const ellaRed = r.ella.filter(f => /helped|needs you/.test(f.text))[0];
  check(ellaRed && ellaRed.text === 'helped',
    'CONTROL: a dealt-with MARKS reason never re-arms - a wrong exit answer cannot become news twice');
  check(!/exit question wrong/.test(ellaRed.title), 'and its sentence never reappears in the hover');

  await openLive(page, { aoifeHf: true });
  await pick(page, '2');
  r = await readRows(page);
  check(r.aoife.length === 0,
    'CONTROL: an acknowledgement on a pupil with nothing wrong shows no pill at all');

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL FLAG-LIFECYCLE CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
