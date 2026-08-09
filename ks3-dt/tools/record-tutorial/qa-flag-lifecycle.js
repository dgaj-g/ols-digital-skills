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
/* round 3 (DFM 162) landed on top of the lifecycle build, so its controls need
   their own pre-fix ref - the commit that was live when he found the masking bug */
const FLAGS2_REF = process.env.KS3DT_FLAGS2_PREFIX_REF || 'cfc3cbf';
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
  /* Lesson 3 is the only built lesson with THREE exit questions, so the
     under-half boundary (DFM 162b) and the multi-lesson strip both need it */
  if (opts.l3) s.locks[CLS]['3'] = { u: weekAgo + 2880, on: 1 };
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
  /* DFM 162(a) - the masking bug. She is genuinely live in Lesson 1 AND
     Lesson 2 at the same time, and fine in Lesson 3, which is the case the old
     code could not display: it named only the first lesson it found, and
     acknowledging that one made her look dealt with while the other was still
     live. Named after his own test account, because that is where he asked. */
  if (opts.multi) {
    s.pupils[CLS + ':g.gartland@demo'] = rec('g Gartland', 88, {
      '1': [2, 40, '', '1', '222|1', tmin - 45, 40, 0, '', 7, 9],       // exit 0 of 1 -> live red
      '2': [2, 28, '', '01', '222|1', tmin - 35, 38, 0, '', 6, 7],      // exit 0 of 2 -> live red
      '3': [2, 20, '', '100', '222|1', tmin - 5, 30, 0, '', 5, 6]       // exit 2 of 3 -> nothing at all
    });
  }
  /* DFM 162(b) - the under-half boundary, one pupil per case. Every one of them
     is FINISHED with a healthy warm-up, so the exit check is the only thing that
     could possibly raise a flag and a pass or fail is unambiguous.
     L1 key: 0. L2 keys: 1, 0. L3 keys: 1, 0, 1. */
  if (opts.threshold) {
    var exitOnly = function (name, lessonNum, chosen) {
      var L = {};
      L[lessonNum] = [2, 40, '', chosen, '222|1', tmin - 5, 35, 0, '', 6, 7];
      s.pupils[CLS + ':' + name.toLowerCase().replace(/ /g, '.') + '@demo'] = rec(name, 55, L);
    }
    exitOnly('Roisin Quinn', '1', '1');      // 0 of 1  -> flags, single-question sentence
    exitOnly('Maeve Toner', '2', '00');      // 1 of 2  -> half is NOT under half, no flag
    exitOnly('Sorcha Hughes', '2', '01');    // 0 of 2  -> flags, "(0 of 2)"
    exitOnly('Niamh Casey', '3', '110');     // 1 of 3  -> flags, "(1 of 3)"  - NEW behaviour
    exitOnly('Eimear Walsh', '3', '100');    // 2 of 3  -> Jarlath's case, still no flag
  }
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
/* the strip and any named pupil's row, read off the real screen (DFM 146b) */
function readTab2(page, names) {
  return page.evaluate((who) => {
    const body = document.getElementById('staff-body');
    const rowFor = (name) => Array.from(body.querySelectorAll('.dash-table tr'))
      .find(tr => (tr.querySelector('td') || {}).textContent && tr.querySelector('td').textContent.indexOf(name) !== -1);
    const pills = {};
    who.forEach(n => {
      const tr = rowFor(n);
      pills[n] = tr ? Array.from(tr.querySelectorAll('.pill.flag, .pill.voice, .pill.flag-done'))
        .map(p => ({ text: p.textContent.trim(), title: p.getAttribute('title') || '' })) : null;
    });
    const strip = body.querySelector('.live-elsewhere');
    /* the strip lists SEVERAL pupils, so every assertion has to be about one of
       them: walk the line in order and hand each lesson button to the pupil
       whose name was last read out */
    const byPupil = {};
    if (strip) {
      let current = '';
      Array.from(strip.childNodes).forEach(node => {
        if (node.nodeType === 3) {
          const m = /(?:^|[:,])\s*([^:,(]+?)\s*\($/.exec(node.textContent);
          if (m) { current = m[1].trim(); byPupil[current] = byPupil[current] || []; }
          return;
        }
        if (node.classList && node.classList.contains('strip-jump') && current) {
          byPupil[current].push({
            label: node.textContent.trim(), lesson: node.getAttribute('data-lesson'),
            title: node.getAttribute('title') || '', tag: node.tagName,
            underlined: getComputedStyle(node).textDecorationLine.indexOf('underline') !== -1,
            pointer: getComputedStyle(node).cursor === 'pointer'
          });
        }
      });
    }
    return {
      pills: pills,
      stripText: strip ? strip.textContent.trim() : '',
      stripFor: byPupil,
      stripButtons: strip ? Array.from(strip.querySelectorAll('.strip-jump')).map(b => ({
        label: b.textContent.trim(), lesson: b.getAttribute('data-lesson'),
        title: b.getAttribute('title') || '', tag: b.tagName,
        underlined: getComputedStyle(b).textDecorationLine.indexOf('underline') !== -1,
        pointer: getComputedStyle(b).cursor === 'pointer'
      })) : [],
      picked: (body.querySelector('#live-lesson-sel') || {}).value || '',
      heading: (Array.from(body.querySelectorAll('h3')).map(h => h.textContent.trim())
        .filter(t => !/Pairing|Press Night|Reaction|Misconception|Licence/.test(t))[0]) || '',
      legend: (body.querySelector('.live-legend') || {}).textContent || '',
      allText: body.textContent
    };
  }, names);
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
  /* re-staged 9 Aug to the under-half sentence (DFM 162b): her two Lesson 2 exit
     answers are both wrong, which is 0 of 2 either way (143b - a rule change
     re-stages every harness that walks the thing it changed) */
  check(r.ella.filter(f => f.text === 'needs you')[0].title.indexOf('Under half her exit answers were right (0 of 2)') !== -1,
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

  /* ============================================================
     ROUND 3 (DFM 162) - one pill one lesson, a complete clickable strip, and
     the under-half exit threshold.
     ============================================================ */
  const G = 'g Gartland';
  section('L. THE MASKING BUG IS DEAD - one pill, one lesson (DFM 162a)');
  await openLive(page, { multi: true, l3: true });
  await pick(page, '3');
  let m = await readTab2(page, [G]);
  check(m.pills[G] && m.pills[G].length === 0,
    'viewing Lesson 3, where she is fine, her row carries no pill at all (' + JSON.stringify(m.pills[G]) + ')');
  let gs = m.stripFor[G] || [];
  check(gs.length === 2, 'the strip names BOTH lessons she is live in, not just the first (' + gs.length + ')');
  check(gs.map(b => b.label).join(' + ') === 'Lesson 1 + Lesson 2',
    'and names them plainly: "' + m.stripText + '"');
  check(gs.every(b => b.tag === 'BUTTON'), 'each named lesson is a real button');
  check(gs.every(b => b.underlined && b.pointer),
    'and LOOKS pressable in rendered pixels - underlined, pointer cursor (DFM 146b)');
  check(/Click to show this lesson\.$/.test(gs[0].title), 'whose hover says what it does: "' + gs[0].title + '"');
  check(/She got the exit question wrong\./.test(gs[0].title) &&
        /Under half her exit answers were right \(0 of 2\)\./.test(gs[1].title),
    'and each button carries ITS OWN lesson’s reason, not the first lesson’s');
  check(/needs you/.test(m.legend), 'the red key renders even though no red pill is in the table - the strip is a red flag too');

  section('M. THE STRIP IS A WAY IN - clicking a lesson jumps the whole tab (DFM 162a)');
  /* same-tick read, 161's pattern: the loading state must be painted BEFORE the
     fetch, because the first visit to a lesson pays a real round trip */
  const jump = await page.evaluate(() => {
    /* HER Lesson 2 button, not the first one on the line - several pupils are named */
    const b = Array.from(document.querySelectorAll('#staff-body .live-elsewhere .strip-jump'))
      .filter(x => x.getAttribute('data-lesson') === '2').pop();
    b.click();
    const body = document.getElementById('staff-body');
    return {
      busy: !!body.querySelector('.panel-loading'),
      busyText: (body.querySelector('.panel-loading') || {}).textContent || '',
      picker: (body.querySelector('#live-lesson-sel') || {}).value || ''
    };
  });
  check(jump.busy && /Lesson 2/.test(jump.busyText),
    'the instant the button is clicked the screen says it is loading, by name: "' + jump.busyText.trim() + '"');
  check(jump.picker === '2', 'and the Showing picker has already moved to Lesson 2, so nothing jumps under him');
  await sleep(2000);
  m = await readTab2(page, [G]);
  check(m.picked === '2' && /Lesson 2/.test(m.heading), 'the tab lands on Lesson 2: "' + m.heading + '"');
  check(m.pills[G].some(p => p.text === 'needs you'), 'and her live red flag is right there, in the lesson it belongs to');
  check(/Under half her exit answers were right \(0 of 2\)/.test(m.pills[G].filter(p => p.text === 'needs you')[0].title),
    'with that lesson’s own reason on it');
  gs = m.stripFor[G] || [];
  check(gs.length === 1 && gs[0].label === 'Lesson 1',
    'and the strip now names only the OTHER lesson she is live in');

  section('N. ACKNOWLEDGING ONE LESSON CAN NEVER HIDE ANOTHER (the bug’s exact shape)');
  await pick(page, '1');
  await clickFlag(page, G, 'red', 2);
  m = await readTab2(page, [G]);
  check(m.pills[G].some(p => p.text === 'helped'), 'Lesson 1 is marked helped, in Lesson 1’s own view');
  gs = m.stripFor[G] || [];
  check(gs.length === 1 && gs[0].label === 'Lesson 2',
    'and Lesson 2 is STILL named in the strip - this is the fault he found, dead: "' + m.stripText + '"');
  await pick(page, '3');
  m = await readTab2(page, [G]);
  check(m.pills[G].length === 0, 'back on Lesson 3 her row is still clean');
  gs = m.stripFor[G] || [];
  check(gs.length === 1 && gs[0].label === 'Lesson 2',
    'and the strip names the one lesson that is genuinely still outstanding');
  await pick(page, '2');
  await clickFlag(page, G, 'red', 2);
  await pick(page, '3');
  m = await readTab2(page, [G]);
  check(!m.stripFor[G], 'deal with the second one too and she drops out of the strip altogether');
  check(/Ella Doran/.test(m.stripText),
    'CONTROL: the strip is still there for the pupils who ARE outstanding - only she left it');

  section('N2. SOURCE CONTROL - the pre-fix code really did drop the second lesson');
  const preFlags = (() => {
    try {
      return execFileSync('git', ['show', FLAGS2_REF + ':ks3-dt/platform/staff.js'], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) { return null; }
  })();
  if (!preFlags) {
    check(false, 'could not read the pre-fix commit ' + FLAGS2_REF + ' - these controls cannot run');
  } else {
    check(/var eSrc = hits\[0\]/.test(preFlags),
      'pre-fix: the cross-lesson line was built from hits[0] only - the first flagged lesson won and the rest vanished');
    check(/var src = hereHit \|\| hits\[0\]/.test(preFlags),
      'pre-fix: the row pill could be about a DIFFERENT lesson than the one on screen');
    check(/needs you' \+ \(hereHit \? '' : ' \(' \+ App\.esc\(lessonNameFor/.test(preFlags),
      'pre-fix: which is why the pill had to carry a "(Lesson n)" suffix');
    check(!/hits\[0\]/.test(staff), 'now: nothing anywhere reads only the first hit');
    check(!/needs you \(/.test(staff) && !/lessonLabelFor\(src\.num\) \+ ': '/.test(staff),
      'and the pill suffix and the "Lesson n: " title prefix are both gone');
    check(!/data-lesson="' \+ App\.esc\(src\.num\)/.test(staff) && /data-action="strip-jump"/.test(staff),
      'the flag button always acts on the shown lesson, and jumping lessons is the strip’s job');
  }

  section('O. THE EXIT THRESHOLD IS UNDER HALF RIGHT (DFM 162b, his ruling)');
  await openLive(page, { threshold: true, l3: true });
  await pick(page, '1');
  let th = await readTab2(page, ['Roisin Quinn']);
  check(th.pills['Roisin Quinn'].some(p => p.text === 'needs you'), 'one question, answered wrongly: flagged (0 of 1)');
  check(/She got the exit question wrong\./.test(th.pills['Roisin Quinn'].filter(p => p.text === 'needs you')[0].title),
    'and the single-question sentence is unchanged: "' + th.pills['Roisin Quinn'][0].title + '"');
  await pick(page, '2');
  th = await readTab2(page, ['Maeve Toner', 'Sorcha Hughes']);
  check(th.pills['Maeve Toner'].length === 0,
    'CONTROL: one of two right is NOT under half - no flag (half is not under half)');
  check(th.pills['Sorcha Hughes'].some(p => p.text === 'needs you'), 'none of two right: flagged');
  check(/Under half her exit answers were right \(0 of 2\)\./.test(th.pills['Sorcha Hughes'].filter(p => p.text === 'needs you')[0].title),
    'with the new sentence and the real count: "' + th.pills['Sorcha Hughes'][0].title + '"');
  await pick(page, '3');
  th = await readTab2(page, ['Niamh Casey', 'Eimear Walsh']);
  check(th.pills['Niamh Casey'].some(p => p.text === 'needs you'),
    'THE ONE BEHAVIOUR CHANGE: one of three right now flags - she was missed before');
  check(/Under half her exit answers were right \(1 of 3\)\./.test(th.pills['Niamh Casey'].filter(p => p.text === 'needs you')[0].title),
    'saying so in the same words as the warm-up: "' + th.pills['Niamh Casey'][0].title + '"');
  check(th.pills['Eimear Walsh'].length === 0,
    'CONTROL: two of three right still does NOT flag - Jarlath’s case, exactly as he was told');
  if (preFlags) {
    check(/rc\.total > 0 && rc\.right === 0/.test(preFlags),
      'CONTROL: pre-fix the trigger was right === 0, so 1 of 3 could never have flagged');
    check(/rc\.right \/ rc\.total\) < 0\.5/.test(staff), 'now it is the same under-half test the warm-up uses');
  }

  section('P. THE OLD WORDING IS GONE FROM EVERY SURFACE (DFM 150)');
  check(!/every exit question wrong/.test(th.allText), 'no rendered text on the Live tab says "every exit question wrong"');
  check(/under half her exit answers were right/i.test(th.legend), 'and the key under the table teaches the new rule');
  const guideText = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('#staff-modal [data-action="switch-tab"]')).find(x => /^guide$/i.test((x.textContent || '').trim()));
    if (t) t.click();
    return document.getElementById('staff-body').textContent;
  });
  check(!/every exit question wrong/.test(guideText) && !/exit check all wrong/.test(guideText),
    'the Guide tab says neither old wording');
  check(/under half her exit answers were right/i.test(guideText), 'it teaches the new trigger');
  check(/click one to jump straight to it/.test(guideText), 'and it teaches that the strip’s lessons are clickable');
  check(!/every exit question wrong/.test(staff) && !/exit check all wrong/.test(staff),
    'and neither wording survives anywhere in staff.js');
  /* A phrase broken across two JS string literals renders perfectly and greps to
     nothing - which is how a source-level check passed while the wording had
     moved. All three homes of this sentence stay in ONE literal each, so the
     mechanical guard rule 150 asks for actually works. */
  const oneLiteral = (staff.match(/under half her exit answers were right/gi) || []).length;
  check(oneLiteral === 3,
    'the new sentence is greppable in all three homes - the reason, the key and the Guide (' + oneLiteral + ' of 3)');
  const builtIdx = fs.readFileSync(P('server/PathB_Index.html'), 'utf8');
  check((builtIdx.match(/under half her exit answers were right/gi) || []).length === 3 &&
        !/every exit question wrong|exit check all wrong/.test(builtIdx),
    'and the BUILT Index.html he actually pastes carries all three and neither old wording');

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL FLAG-LIFECYCLE CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
