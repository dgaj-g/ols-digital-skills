/* J3 L5 V2 SAME LIGHT · gates A12 (no dead screen) and A13 (reload and her place), on the BUILT hour page.
   Adapted from the prototype walker. Every state it sees: each seat's job line must be non-empty (A12).
   --reload=1: at every new stage and step one seat reloads; phase, stage, fault, step, coins, source, room and seat
   must come back the same (A13). CONTROL=1: the reload clears the page's local log first, so the gate must go RED.
   NODE_PATH=$(npm root -g) node tools/record-tutorial/l5v2-walk.js --mode=pair --w=760 --h=900 --reload=1
   NODE_PATH=$(npm root -g) node tools/walk.js --path=right|wrong|fast --mode=pair|solo|trio --t=20 --shots=prefix --w=760 --h=900 --url=http://localhost:8765
   right: everyone right first time · wrong: wrong line, wrong card, help, lookout, 90 s wake · fast: the fixer alone, reader idle. */
const puppeteer = require('puppeteer');
const path = require('path');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const PATH = arg('path', 'right'), MODE = arg('mode', 'pair'), K = +arg('t', 20), SHOTS = arg('shots', ''), W = +arg('w', 760), H = +arg('h', 900), URL = arg('url', 'http://localhost:8783/assets/twolights'), RELOAD = arg('reload', '0') === '1', CONTROL = process.env.CONTROL === '1';
const { serve } = require('./l5v2-serve');
const fails = [];
const SEATS = MODE === 'solo' ? ['A'] : MODE === 'trio' ? ['A', 'B', 'C'] : ['A', 'B'];
const ROOM = 'W' + Math.random().toString(36).slice(2, 7).toUpperCase();
const t0 = Date.now(), log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { drive } = require('./l5v2-drive');
const errors = [];
async function main() {
  SRV = await serve(8783);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', `--window-size=${W},${H}`] });
  const pages = {};
  for (const s of SEATS) {
    const p = await browser.newPage(); await p.setViewport({ width: W, height: H });
    p.on('pageerror', e => { errors.push(s + ': ' + e.message); log('PAGEERROR', s, e.message); });
    p.on('console', m => { if (m.type() === 'error') { errors.push(s + ': ' + m.text()); log('CONSOLE', s, m.text()); } });
    await p.goto(`${URL}/hour.html?room=${ROOM}&seat=${s}&mode=${MODE}&t=${K}`, { waitUntil: 'load' });
    pages[s] = p;
  }
  PAGES = pages;
  const { timings, reloads } = await drive(pages, { SEATS, PATH, RELOAD, CONTROL, MODE, W, SHOTS, fails, log, sleep });
  const st = async (s = SEATS[0]) => pages[s].evaluate(() => { const x = SameLightDebug.state(); return { coins: x.coins, fixed: x.fixedCount, badges: x.badges }; });
  const click = async (s, sel, ms = 8000) => { const p = pages[s]; await p.waitForSelector(sel, { timeout: ms, visible: true }); await p.click(sel); };
  const text = async (s, sel) => pages[s].evaluate(sel => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; }, sel);
  const shot = async () => {};
  const end = await st(); log('HOME', JSON.stringify({ coins: end.coins, fixed: end.fixed, badges: end.badges }));
  for (const s of SEATS) log('home page', s, (await text(s, '.pg')).slice(0, 200).replace(/\s+/g, ' '));
  await click(SEATS[0], 'button[data-act="extras"]'); await sleep(200); await shot('extras');
  await click(SEATS[0], 'button[data-x="x1"]'); await pages[SEATS[0]].evaluate(() => { const e = document.getElementById('xed'); e.value = e.value.replace('bel()', 'bell()'); }); await click(SEATS[0], 'button[data-act="xrun"]'); await sleep(300); await shot('extra-x1');
  log('extra x1', await text(SEATS[0], '.verdict'), '| coins', (await st()).coins);
  log('TIMINGS', JSON.stringify(timings));
  log('ERRORS', errors.length, errors.slice(0, 5));
  await browser.close(); SRV.close();
  errors.forEach(e => fails.push('FAIL page error ' + e));
  fails.forEach(f => console.log(f));
  console.log(`A12${RELOAD ? '+A13' : ''}${CONTROL ? ' (CONTROL)' : ''} walk ${MODE} ${W}x${H}${RELOAD ? ' · ' + reloads + ' reloads' : ''} · ${fails.length ? 'RED ' + fails.length : 'PASS'}`);
  process.exit(fails.length ? 1 : 0);
}
let PAGES = null, SRV = null;
main().catch(async e => { log('FAILED', e.message); process.exitCode = 2; if (PAGES) for (const s of Object.keys(PAGES)) { try { log('DUMP', s, await PAGES[s].evaluate(() => { const st = SameLightDebug.state(); const pg = document.querySelector('#page.show .pg'); return JSON.stringify({ phase: st.phase, stage: st.local[SameLightDebug.seat].stage, ready: st.local[SameLightDebug.seat].ready, page: pg ? pg.textContent.replace(/\s+/g, ' ').slice(0, 300) : null, job: document.getElementById('job').textContent, last: SameLightDebug.log().slice(-4).map(e => e.seat + ':' + e.k + ':' + JSON.stringify(e.d)) }); })); } catch (x) { log('dump failed', s, x.message); } } process.exit(1); });
