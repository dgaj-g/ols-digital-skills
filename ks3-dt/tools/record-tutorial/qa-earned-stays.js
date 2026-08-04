/* qa-earned-stays.js - once earned, always hers.
 *
 * DAMIEN'S OWN TEST CASE, 3 Aug 2026, verbatim: "let's say lesson 1 - 3 have been
 * unlocked by a teacher and pupils have completed them all. then... the teacher
 * decides to wipe the lesson 2 data by clicking start again. How does this affect
 * XP, is the lesson 2 XP deducted from the pupil's points? What if they were in a
 * costume from the agent file that was selected because it was unlocked the time
 * they finished lesson 3 (before the start again for lesson 2 happened)? Do they
 * automatically default to the original skin?"
 *
 * The answers, before this harness existed: XP yes (deliberate), costume no - she
 * kept wearing it but the Kit showed it padlocked, and changing kit meant she
 * could never get it back. His ruling: "once earned always hers."
 *
 * So: the reset still DEDUCTS XP (the work no longer exists and the total must
 * tell the truth), but `mx` - the highest XP she has ever reached - never falls,
 * and the Agent Kit unlocks from that. This walks the whole scenario against the
 * real server logic, including the CONTROL that the old rule would have failed.
 *
 * Needs the static server on 8096 (config digital-skills-l4).
 *   node qa-earned-stays.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../..');
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let PASS = 0;
const FAILS = [];
function check(cond, msg) {
  if (cond) { PASS++; console.log('  PASS  ' + msg); }
  else { FAILS.push(msg); console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ---- source: production and preview must agree, or preview lies to us ---- */
section('A. the rule lives on the single write path, in BOTH servers');
const prod = fs.readFileSync(path.join(ROOT, 'ks3-dt/platform/server/Code.gs.template'), 'utf8');
const prev = fs.readFileSync(path.join(ROOT, 'ks3-dt/platform/dev-server.js'), 'utf8');
[['production Code.gs', prod], ['preview dev-server', prev]].forEach(([name, src]) => {
  const wp = src.slice(src.indexOf('function writePupil_'), src.indexOf('function writePupil_') + 700);
  check(/rec\.mx = num_\(rec\.xp\)/.test(wp),
    name + ': writePupil_ raises `mx` itself, so no caller can forget it');
  check(/function everXp_/.test(src) && /everXp_\(rec\)/.test(src),
    name + ': the kit gate uses everXp_, not the current total');
});
/* the reset must deduct xp and must NOT touch mx */
const rs = prod.slice(prod.indexOf("if (sub === 'resetLesson')"), prod.indexOf("if (sub === 'resetLesson')") + 1400);
check(/rsRec\.xp = Math\.max\(0, num_\(rsRec\.xp\) - rsXp\)/.test(rs),
  'resetLesson still DEDUCTS the lesson XP - the total tells the truth');
check(!/rsRec\.mx/.test(rs), 'and it never writes `mx`, so what she unlocked stays unlocked');

/* ---- live: his scenario, start to finish ---- */
async function scenario(page, opts) {
  return page.evaluate(async (o) => {
    const num = v => Number(v) || 0;
    const KEY = 'ks3dt-dev';
    const db = JSON.parse(localStorage.getItem(KEY));
    const email = 'Demo-8A:anya.murphy@demo';
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    ['1', '2', '3'].forEach(n => { db.locks['Demo-8A'][n] = { u: now, on: 1 }; });
    /* lessons 1-3 all completed. L1 95, L2 45, L3 50 = 190 XP, which is
       clearance 4 (185). The theme she picks needs clearance 3 (140). */
    db.pupils = db.pupils || {};
    db.pupils[email] = {
      n: 'Anya Murphy', cn: 'Scarlet Cascade', j: 1, xp: 190, mx: 190, g: '', th: o.theme, fx: '',
      L: {
        '1': [2, 95, 'sit1=1', '1', '222|0', 100, 8, 0, '', 0, 0],
        '2': [2, 45, 'sit2=1', '1', '222|0', 101, 8, 0, '', 0, 0],
        '3': [2, 50, 'sit3=1', '1', '222|0', 102, 8, 0, '', 0, 0]
      }
    };
    localStorage.setItem(KEY, JSON.stringify(db));

    /* THE TEACHER PRESSES START AGAIN ON LESSON 2 - the real server path */
    const before = JSON.parse(localStorage.getItem(KEY)).pupils[email];
    await window.App.call('admin', { passcode: 'demo', sub: 'resetLesson', className: 'Demo-8A', lessonNum: '2' });
    const after = JSON.parse(localStorage.getItem(KEY)).pupils[email];

    /* can she still equip the clearance-3 theme afterwards? ask the SERVER. */
    const re = await window.App.call('setKit', { themeId: o.theme });
    return {
      xpBefore: num(before.xp), xpAfter: num(after.xp),
      mxBefore: num(before.mx), mxAfter: num(after.mx),
      lesson2Gone: !after.L['2'], lesson3Kept: !!after.L['3'],
      themeStillOn: String(after.th || ''),
      reEquip: re
    };
  }, opts);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2200);

  /* Pick the theme from the LIVE registry so the test still crosses a real
     threshold if the XP economy is ever re-tiered (it was on 2 Aug). She reaches
     190 across lessons 1-3 and drops to 145 when lesson 2 (45 XP) is wiped, so
     the costume must be one that 190 unlocks and 145 does not - i.e. "unlocked
     the time they finished lesson 3", which is exactly his scenario. */
  const BEFORE_XP = 190, AFTER_XP = 145;
  const pick = await page.evaluate(async (o) => {
    const reg = await (await fetch('/ks3-dt/content/themes.json')).json();
    const xpFor = lvl => {
      const c = (reg.clearances || []).find(x => Number(x.level) === Number(lvl));
      return Number(c && c.xp);
    };
    const candidates = (reg.themes || [])
      .map(t => ({ id: t.id, need: xpFor(t.clearance), clearance: Number(t.clearance) }))
      .filter(t => t.need > o.after && t.need <= o.before)
      .sort((a, b) => b.need - a.need);
    return candidates[0] || null;
  }, { before: BEFORE_XP, after: AFTER_XP });
  check(!!pick, 'found a costume that ' + BEFORE_XP + ' XP unlocks and ' + AFTER_XP + ' does not: ' +
    JSON.stringify(pick));
  if (!pick) { console.log('\nFAILED - cannot run the scenario'); process.exit(1); }
  const theme = pick.id;
  const NEED = pick.need;

  section('B. HIS SCENARIO - lessons 1-3 done, then Start again on lesson 2');
  const r = await scenario(page, { theme: theme });
  console.log('    xp ' + r.xpBefore + ' -> ' + r.xpAfter + ' | mx ' + r.mxBefore + ' -> ' + r.mxAfter);
  check(r.lesson2Gone, 'lesson 2 is wiped');
  check(r.lesson3Kept, 'lesson 3 is untouched');
  check(r.xpAfter === r.xpBefore - 45, 'her XP IS deducted by exactly lesson 2 (' + r.xpBefore + ' -> ' + r.xpAfter + ')');
  check(r.xpAfter < NEED, 'which really does drop her below the clearance that unlocked the costume (' +
    r.xpAfter + ' < ' + NEED + ')');
  check(r.mxAfter === r.mxBefore, 'but the highest she ever reached does NOT move (' + r.mxAfter + ')');
  check(r.themeStillOn === theme, 'she is still wearing the costume, not reset to the default skin');
  check(r.reEquip && r.reEquip.ok === true,
    'and the SERVER still lets her equip it — once earned, always hers (' + JSON.stringify(r.reEquip) + ')');

  section('C. the Agent Kit says so, and says why');
  const kit = await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 400));
    location.reload();
  }).catch(() => {});
  await sleep(2600);
  const kitState = await page.evaluate(async (themeId) => {
    const s = window.App.state;
    window.App.openKit();
    await new Promise(r => setTimeout(r, 700));
    const btn = document.querySelector('.kit-theme[data-theme="' + themeId + '"]');
    return {
      xp: Number(s.xp), ever: window.App.everXp(),
      locked: btn ? btn.classList.contains('is-locked') : null,
      equipped: btn ? btn.classList.contains('is-equipped') : null,
      keepsNote: (document.querySelector('.kit-keeps') || {}).textContent || null
    };
  }, theme);
  check(kitState.ever > kitState.xp,
    'the Kit knows she once had more (' + kitState.ever + ' ever vs ' + kitState.xp + ' now)');
  check(kitState.locked === false, 'the costume is NOT padlocked against her');
  check(kitState.equipped === true, 'and is shown as equipped');
  check(!!kitState.keepsNote && /still yours to keep/i.test(kitState.keepsNote),
    'and the Kit explains why she can see it: ' + JSON.stringify((kitState.keepsNote || '').slice(0, 60)));

  section('D. CONTROL - the OLD rule (gate on current XP) must fail this');
  const oldWay = await page.evaluate((themeId) => {
    const s = window.App.state;
    const reg = s.kit || {};
    const t = (reg.themes || []).find(x => String(x.id) === themeId);
    const cl = (reg.clearances || []).find(c => Number(c.level) === Number(t.clearance));
    const need = Number(cl && cl.xp);
    return { need: need, byCurrentXp: Number(s.xp) >= need, byEver: window.App.everXp() >= need };
  }, theme);
  check(oldWay.byCurrentXp === false,
    'pre-fix: gating on her CURRENT xp would have locked her out (' + oldWay.need + ' XP needed)');
  check(oldWay.byEver === true, 'the new rule lets her keep it');

  await browser.close();
  console.log('\n' + (FAILS.length ? 'FAILED ' + FAILS.length : 'ALL EARNED-STAYS CHECKS PASSED') + '  (' + PASS + ' checks)');
  if (FAILS.length) { FAILS.forEach(f => console.log('   - ' + f)); process.exit(1); }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
