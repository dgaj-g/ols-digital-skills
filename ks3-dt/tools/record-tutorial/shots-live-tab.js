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
    '1': [2, 60, 'bl=12/16|0121000000010000', '0', '222|0', tmin - 30, 46, 0, '', 7, 9],
    '2': [2, 50, 'ep=0', '1', '222|0', tmin - 5, 40, 0, '', 6, 7]
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
  await page.evaluate(stageInPage, opts);
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

  await browser.close();
  console.log('\nScreenshots in ' + OUT);
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
