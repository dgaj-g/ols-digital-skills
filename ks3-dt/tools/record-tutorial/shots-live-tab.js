/* shots-live-tab.js - the evidence set for the Live tab redesign (DFM 156).
   Same staging as qa-live-tab.js, but it photographs the screen instead of
   asserting about it, so Damien can see each view before he pastes anything.

     node shots-live-tab.js        (needs the dev server on :8096)
*/
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/qa-l2-l5-review/live-tab-redesign';
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=QA-Live';
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

/* the baseline answer strings, derived from the real key so the Licence Exam
   panel photographs real arithmetic rather than invented numbers */
const CONTENT = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/content-src/j1/lessons';
const L1 = JSON.parse(fs.readFileSync(path.join(CONTENT, 'j1-01.json'), 'utf8'));
const L1_EXAM = (L1.chunks || []).filter(c => c.engine === 'diagnostic')[0].config.items;
const L1_KEYS = JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/dev-keys.json'), 'utf8'))['j1/lessons/j1-01'];
function baselineString(wrongQs, blankQs) {
  return L1_EXAM.map((it, i) => {
    const q = i + 1;
    if (blankQs.indexOf(q) !== -1) return 'x';
    const a = Number(L1_KEYS[it.id].a);
    return wrongQs.indexOf(q) !== -1 ? String(a === 0 ? 1 : 0) : String(a);
  }).join('');
}
const BL = { anyaBl: '14/16|' + baselineString([3, 7], []), orlaBl: '15/16|' + baselineString([], [2]) };

function stageInPage(opts) {
  const CLS = 'QA-Live', STAFF = 'teacher@demo';
  const EPOCH = 1767225600000;
  const tmin = Math.floor((Date.now() - EPOCH) / 60000);
  const weekAgo = tmin - 7 * 1440;
  const s = {
    passcode: 'demo',
    classes: [{ name: CLS, owner: STAFF, year: 'j1', created: new Date(Date.now() - 7 * 864e5).toISOString() }],
    locks: {}, hods: [], cfg: {}, team: {}, pupils: {}, userProps: {}
  };
  s.locks[CLS] = {
    '1': { u: weekAgo, on: 1 },
    '2': { u: weekAgo + 1440, on: 1 },
    '3': { u: weekAgo + 2880, on: opts.l3On ? 1 : 0 }
  };
  s.cfg[CLS] = {
    lb: { mode: 'off', basis: 'xp', names: 'codename', topN: 0 },
    absDays: 5, cover: { on: 0, lesson: '', ts: 0 }, pairing: { on: 1 }, tn: { mode: 'team' }
  };
  function rec(name, cn, xp, L) { return { n: name, cn: cn, j: weekAgo, xp: xp, g: '', L: L }; }
  s.pupils[CLS + ':anya.murphy@demo'] = rec('Anya Murphy', 'Silver Fox', 110, {
    '1': [2, 60, 'bl=' + opts.anyaBl, '0', '222|2', tmin - 30, 46, 0, '', 7, 9],
    '2': [2, 50, 'ep=0', '1', '222|2', tmin - 5, 40, 0, '', 6, 7]
  });
  s.pupils[CLS + ':orla.devine@demo'] = rec('Orla Devine', 'Coral Tern', 40, {
    '1': [2, 40, 'bl=' + opts.orlaBl, '1', '222|1', tmin - 30, 40, 0, '', 6, 9],
    '2': [1, 10, '', '', '111|1', tmin - 60, 8, 0, '', 0, 0]
  });
  s.pupils[CLS + ':jarlath.gartland@demo'] = rec('Jarlath Gartland', 'Opal Heron', 96, {
    '1': [2, 46, 'bl=5/16|0121000000010000', '0', '221|1', tmin - 40, 44, 0, '', 6, 9],
    '2': [2, 50, 'ep=1', '0x', '210|1', tmin - 6, 42, 0, 'I got stuck on the download bit', 5, 7]
  });
  s.pupils[CLS + ':ciara.small@demo'] = rec('Ciara Small', 'Luna Heron', 20, {
    '1': [1, 20, '', '', '', tmin - 50, 12, 0, '', 1, 9]
  });
  s.pupils[CLS + ':mia.larkin@demo'] = rec('Mia Larkin', 'Coral Wren', 0, {});
  if (opts.l3Data) {
    s.pupils[CLS + ':jarlath.gartland@demo'].L['3'] = [2, 40, '', '1x2', '2210|2', tmin - 3, 30, 0, 'the rally was class', 4, 6];
    s.pupils[CLS + ':anya.murphy@demo'].L['3'] = [2, 44, 'ep=1', '110', '2221|1', tmin - 3, 32, 0, '', 5, 6];
  }
  localStorage.setItem('ks3dt-dev', JSON.stringify(s));
}

async function openLive(page, opts) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(stageInPage, Object.assign({}, BL, opts));
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
    const b = document.querySelector('#staff-modal [data-action="select-class"][data-class="QA-Live"]');
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
  await toTop(page);
}
/* the panel scrolls, and a shot taken mid-scroll shows the wrong thing - every
   view starts from the top of the tab */
const toTop = (page) => page.evaluate(() => {
  /* whichever ancestor is actually the scroller - do not guess at its id */
  Array.from(document.querySelectorAll('*')).forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  window.scrollTo(0, 0);
}).then(() => sleep(400));
const shot = (page, name) => page.locator('#staff-modal').screenshot({ path: path.join(OUT, name) })
  .then(() => console.log('  wrote ' + name));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });

  await openLive(page, { l3On: false });
  await toTop(page);
  await shot(page, '01-default-lesson2.png');          // opens on the lesson being taught
  await page.evaluate(() => {
    const el = document.querySelector('.live-legend');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await sleep(500);
  await shot(page, '02-legends-and-note.png');         // every symbol named, stems quoted

  await pick(page, '1');
  await shot(page, '03-lesson1-pairing.png');          // the pairing lens, named for its lesson
  await pick(page, '3');
  await shot(page, '04-lesson3-tournament.png');       // the rally row, and no pairing panel

  await openLive(page, { l3On: true, l3Data: true });
  await shot(page, '05-lesson3-unlocked-default.png'); // the default follows the room

  /* round 2 (DFM 157/159): the two flags, and the Licence Exam panel */
  await openLive(page, { l3On: false });
  await toTop(page);
  await shot(page, '06-two-flags-and-count.png');      // red = the marks, amber = her own words
  await pick(page, '1');
  await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll('h3')).filter(x => /Licence Exam/.test(x.textContent))[0];
    if (h) h.scrollIntoView({ block: 'start' });
  });
  await sleep(600);
  await shot(page, '07-licence-exam-panel.png');       // where the class started, question by question

  /* and the pupil's side of it: the comment box that now tells the truth */
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2200);
  await page.evaluate(async () => {
    const lesson = await App.fetchContent('j1/lessons/j1-02.json');
    const chunk = (lesson.chunks || []).filter(c => c.engine === 'selfeval')[0];
    document.querySelectorAll('.card').forEach(n => n.remove());
    const host = document.querySelector('#lesson-host') || document.body;
    Engines.selfeval.mount(host, chunk, { next: function () {}, saveEvent: function () {}, review: false });
    const box = document.querySelector('.se-comment');
    box.value = 'I did not understand the bit where we flashed the code onto it';
    box.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.se-card').scrollIntoView({ block: 'center' });
  });
  await sleep(700);
  await page.locator('.se-card').screenshot({ path: path.join(OUT, '08-pupil-comment-counter.png') });
  console.log('  wrote 08-pupil-comment-counter.png');

  await browser.close();
  console.log('\nScreenshots in ' + OUT);
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
