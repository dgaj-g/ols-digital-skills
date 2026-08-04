/* qa-staff-authority.js - who can delete what, and who is even told they can.
 *
 * DAMIEN, 3 Aug 2026, five questions before a redeploy. Three of the answers
 * were wrong and are fixed here:
 *   - removePupil was gated on the staff passcode ALONE. Deleting a whole class
 *     has been owner-or-HoD since 30 Jul; removing ONE pupil was not gated at
 *     all, so a passcode holder who knew another teacher's class name could wipe
 *     a pupil's record out of a class that was nothing to do with them.
 *   - "Show all teachers' classes" was drawn for EVERY staff member. It leaked
 *     nothing (the server only ever sends a teacher her own classes) but it
 *     advertised a power only he has. His words: "they shouldn't see that, just me".
 *   - a HoD could delete any class on the server but the button was only ever
 *     drawn on his own rows, so the power was unreachable (DFM 120 E3).
 *
 * Every check has a CONTROL: the pre-fix source must fail it, or the check is
 * decoration. Source-level, so it needs no server.
 *
 *   node qa-staff-authority.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const P = f => path.join(ROOT, 'ks3-dt/platform', f);
/* pinned pre-fix commit: a relative ref stops being pre-fix the moment this lands */
const PREFIX_REF = process.env.KS3DT_AUTH_PREFIX_REF || '7c3ddeb';

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

const server = fs.readFileSync(P('server/Code.gs.template'), 'utf8');
const staff = fs.readFileSync(P('staff.js'), 'utf8');

function atPrefix(rel) {
  try {
    return execFileSync('git', ['show', PREFIX_REF + ':ks3-dt/platform/' + rel],
      { cwd: ROOT, encoding: 'utf8' });
  } catch (e) { return null; }
}

/* the removePupil handler body, from `if (sub === 'removePupil')` to the next `if (sub ===` */
function removePupilBlock(src) {
  const i = src.indexOf("if (sub === 'removePupil')");
  if (i === -1) return '';
  const j = src.indexOf("if (sub === '", i + 30);
  return src.slice(i, j === -1 ? i + 1200 : j);
}

section('A. REMOVING ONE PUPIL is gated like deleting a class');
const rp = removePupilBlock(server);
check(!!rp, 'the removePupil handler was found');
check(/canManageClass_\(cls, me\)/.test(rp),
  'removePupil now checks canManageClass_ - the class’s own teacher, or a HoD');
check(/error: 'not-owner'/.test(rp), 'and refuses with not-owner, the same answer deleteClass gives');
/* it must be the SAME gate as deleteClass, not a weaker lookalike */
const dc = server.slice(server.indexOf("if (sub === 'deleteClass')"));
check(/canManageClass_\(cls, me\)/.test(dc.slice(0, 900)),
  'deleteClass still uses that same gate (they must not drift apart)');

section('B. THE CLASSES TAB tells the truth about who you are');
check(/var meIsHod = !!Number\(classesData\.isHod\)/.test(staff),
  'the Classes tab reads the server’s isHod flag');
check(/if \(!meIsHod\) showAllTeachers = false;/.test(staff),
  'a non-HoD can never be left with the all-classes filter switched on');
check(/var html =\s*\(meIsHod[\s\S]{0,400}cls-showall/.test(staff),
  '"Show all teachers’ classes" is rendered only for a Head of Department');
check(/meIsHod[\s\S]{0,200}data-action="delete-class"[\s\S]{0,200}data-owner=/.test(staff),
  'a HoD gets a Delete button on OTHER teachers’ classes too, and it carries the owner');
check(/Delete \(' \+ App\.esc\(ownerLabel\)/.test(staff),
  'and that button names whose class it is, so it can never be pressed by accident');
check(/belongs to ' \+ owner/.test(staff) && /you are in the Head of Department register/.test(staff),
  'deleting someone else’s class asks for a full named confirmation, not the two-press arm');
check(/Only the class\\u2019s own teacher, or a Head of Department, can delete it\./.test(staff) ||
      /Only the class’s own teacher, or a Head of Department, can delete it\./.test(staff),
  'the refusal message names both routes, not just "the owner"');

section('C. CONTROL - the pre-fix source must FAIL every one of those');
const oldServer = atPrefix('server/Code.gs.template');
const oldStaff = atPrefix('staff.js');
if (!oldServer || !oldStaff) {
  check(false, 'could not read the pinned pre-fix commit ' + PREFIX_REF + ' - the controls cannot run');
} else {
  const oldRp = removePupilBlock(oldServer);
  check(!!oldRp && !/canManageClass_/.test(oldRp),
    'pre-fix: removePupil had NO ownership check at all (this is the hole he asked about)');
  check(!/var meIsHod = !!Number\(classesData\.isHod\)/.test(oldStaff),
    'pre-fix: the Classes tab did not know whether you were a HoD');
  check(/id="cls-showall"/.test(oldStaff) &&
        !/var html =\s*\(meIsHod[\s\S]{0,400}cls-showall/.test(oldStaff),
    'pre-fix: the all-classes checkbox was drawn for every staff member');
  check(!/data-owner=/.test(oldStaff),
    'pre-fix: no Delete button was ever drawn on another teacher’s class');
}

/* ---------------- live half: what each teacher actually SEES ---------------- */
const { chromium } = require('playwright');
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=teacher';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function classesTabAs(page, isHod) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1800);
  /* two classes: one his own, one a colleague's - and the HoD register seeded or not */
  await page.evaluate((hod) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const me = db.classes[0].owner;
    if (!db.classes.some(c => c.name === 'Demo-8B')) {
      db.classes.push({ name: 'Demo-8B', owner: 'mmckeever@c2ken.net', year: 'j1', created: new Date(0).toISOString() });
    }
    db.hods = hod ? [String(me).toLowerCase()] : [];
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, isHod);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate(() => window.Staff.open());
  await sleep(900);
  await page.evaluate(() => {
    const i = document.querySelector('#staff-modal input[type=password], #staff-modal input');
    if (i) { i.value = 'demo'; i.dispatchEvent(new Event('input', { bubbles: true })); }
    const b = Array.from(document.querySelectorAll('#staff-modal button')).find(x => /enter|unlock|go/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await sleep(2200);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('#staff-modal [data-tab], #staff-modal button')).find(x => /^classes$/i.test((x.textContent || '').trim()));
    if (t) t.click();
  });
  await sleep(1600);
  return page.evaluate(() => ({
    checkbox: !!document.querySelector('#cls-showall'),
    deleteButtons: Array.from(document.querySelectorAll('[data-action="delete-class"]'))
      .map(b => ({ cls: b.getAttribute('data-class'), owner: b.getAttribute('data-owner') || '', label: (b.textContent || '').trim() })),
    rows: document.querySelectorAll('.staff-row').length
  }));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  section('D. LIVE - an ORDINARY teacher');
  const plain = await classesTabAs(page, false);
  check(!plain.checkbox, 'she does NOT see the "Show all teachers\u2019 classes" checkbox');
  check(plain.deleteButtons.length === 1 && plain.deleteButtons[0].cls === 'Demo-8A',
    'and she gets a Delete button on her OWN class only (' + JSON.stringify(plain.deleteButtons.map(b => b.cls)) + ')');

  section('E. LIVE - the HEAD OF DEPARTMENT');
  const hod = await classesTabAs(page, true);
  check(hod.checkbox, 'he DOES see the checkbox');
  const other = hod.deleteButtons.filter(b => b.owner);
  check(hod.deleteButtons.length >= 1, 'he gets Delete on his own class');
  check(other.length === 0 || /\u2019s\)$|'s\)$/.test(other[0].label),
    'and where a colleague\u2019s class is shown, its Delete button names the owner');

  await browser.close();

  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL STAFF-AUTHORITY CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
