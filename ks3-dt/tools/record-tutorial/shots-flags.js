/* shots-flags.js - the flag lifecycle, photographed (DFM 160).
   Same staging as qa-flag-lifecycle.js; this one shows Damien the three states
   before he pastes anything.

     node shots-flags.js        (needs the dev server on :8096)
*/
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/qa-l2-l5-review/live-tab-redesign';
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=QA-Flags';
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
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
  s.pupils[CLS + ':ella.doran@demo'] = rec('Ella Doran', 90, {
    '1': [2, 45, opts.fatLedger, '1', '210|2', tmin - 30, 44, 0, 'I got lost at the vault', 6, 9],
    '2': [2, 45, '', '01', '200|1', tmin - 20, 40, 0, 'the flashing bit was hard', 5, 7]
  });
  s.pupils[CLS + ':nuala.reid@demo'] = rec('Nuala Reid', 25, {
    '2': [1, 25, 'hf=' + (tmin - 60), '', '', tmin - 90, 10, 0, '', 0, 0]
  });
  s.pupils[CLS + ':aoife.kane@demo'] = rec('Aoife Kane', 70, {
    '2': [2, 70, '', '10', '221|0', tmin - 10, 40, 0, '', 6, 7]
  });
  localStorage.setItem('ks3dt-dev', JSON.stringify(s));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(stageInPage, { fatLedger: FAT_LEDGER });
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
  const toTop = () => page.evaluate(() => {
    Array.from(document.querySelectorAll('*')).forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
    window.scrollTo(0, 0);
  }).then(() => sleep(400));

  const clickFlag = async (name, kind, times) => {
    for (let i = 0; i < times; i++) {
      await page.evaluate(([n, k]) => {
        const tr = Array.from(document.querySelectorAll('#staff-body .dash-table tr'))
          .find(x => (x.querySelector('td') || {}).textContent && x.querySelector('td').textContent.indexOf(n) !== -1);
        tr.querySelector('[data-action="flag-toggle"][data-kind="' + k + '"]').click();
      }, [name, kind]);
      await sleep(i === times - 1 ? 1600 : 250);
    }
  };

  await toTop();
  await page.locator('#staff-modal').screenshot({ path: path.join(OUT, '09-flags-before.png') });
  console.log('  wrote 09-flags-before.png   (Nuala already helped; Ella outstanding on both counts)');

  /* one click = the question, so he can see the two-press guard */
  await page.evaluate(() => {
    const tr = Array.from(document.querySelectorAll('#staff-body .dash-table tr'))
      .find(x => x.textContent.indexOf('Ella Doran') !== -1);
    tr.querySelector('[data-action="flag-toggle"][data-kind="red"]').click();
  });
  await sleep(400);
  await page.locator('#staff-modal').screenshot({ path: path.join(OUT, '10-flag-asks-first.png') });
  console.log('  wrote 10-flag-asks-first.png (one click asks "mark as helped?")');

  await sleep(4300);            // let it disarm, then do it properly
  await clickFlag('Ella Doran', 'red', 2);
  await clickFlag('Ella Doran', 'voice', 2);
  await toTop();
  await page.locator('#staff-modal').screenshot({ path: path.join(OUT, '11-flags-dealt-with.png') });
  console.log('  wrote 11-flags-dealt-with.png (helped + heard, row calm, count chip gone)');

  await browser.close();
  console.log('\nScreenshots in ' + OUT);
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
