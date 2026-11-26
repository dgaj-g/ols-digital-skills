/* qa-walk-j2l4-26nov — the faults the live walk of J2 Lesson 4 found (26 Nov 2026), as a fresh pupil at 1366x625.
   1. TRAINING BUILD 3 GOES TO SLEEP. After the first pass its steps send her back to RUN the room with her
      other words, but RUN had been switched off under them. It must stay live in a room that asks.
   2. THE TWO WORDS. "Type both words first" stayed up in red after she typed. It must go on her first key.
   3. THE BENCH OPENS AT THE TOP. Start writing sits at the foot of a long plan; the bench drew under a page
      still scrolled down. It must open at the top.
   4. CAPITAL WORDS. A room still holding the shape's capitals is NOT FINISHED YET, and Publish stays off.
   5. HER ROOM SURVIVES A RELOAD. A reload half-way threw away her room and her two words.
   6. A PROPER ROOM passes, Publish switches on, and one path table is drawn (not one per RUN).
   7. THE TWIST BENCH has a way out (a skip button that moves her on), no empty jobs heading, and its pass
      says IT WORKS, not ALL FIVE JOBS DONE; once it works the skip button goes, leaving its Continue.
   8. THE CLASS ADVENTURE never promises more rooms than it holds ("Room 1 of 5" with four rooms).
   Content checks (marked [content]) read the lesson file, so they pass under CONTROL too; every
   [engine] check must FAIL under CONTROL=1 (origin/main's engines.js and style.css).
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-walk-j2l4-26nov.js [--port=8868] [--shots=DIR] */
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8868), CONTROL = process.env.CONTROL === '1';
const SHOTS = arg('shots', ''); if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let PASS = 0; const FAILS = [], ENGINE_RESULTS = [];
const check = (ok, msg, kind) => {
  kind = kind || 'engine';
  if (ok) PASS++; else FAILS.push(msg);
  if (kind === 'engine') ENGINE_RESULTS.push(!!ok);
  console.log((ok ? '  ok    ' : '  FAIL  ') + '[' + kind + '] ' + msg);
};
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
const OLD = CONTROL ? {
  'engines.js': execFileSync('git', ['show', 'origin/main:ks3-dt/platform/engines.js'], { cwd: ROOT, maxBuffer: 1 << 27 }),
  'style.css': execFileSync('git', ['show', 'origin/main:ks3-dt/platform/style.css'], { cwd: ROOT, maxBuffer: 1 << 27 })
} : null;
const URL = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=Demo-9A&as=aoife`;

async function newPage(browser) {
  const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 625 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.__errs = errs;
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => {
      const m = /\/platform\/(engines\.js|style\.css)(\?|$)/.exec(q.url());
      if (m) q.respond({ status: 200, contentType: m[1].endsWith('.js') ? 'text/javascript' : 'text/css', body: OLD[m[1]] });
      else q.continue();
    });
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  return page;
}
/* (re)load the page and open j2-04 as a pupil; storage is NOT cleared here, so a reload keeps her draft */
async function openLesson(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
  await sleep(500);
  await page.evaluate(() => {
    const past = Date.now() - 3 * 864e5, cls = 'Demo-9A';
    (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
    const s = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
    s.locks = s.locks || {}; s.locks[cls] = s.locks[cls] || {};
    (App.state.man.lessons || []).forEach(l => { s.locks[cls][String(l.num)] = { u: 1, on: 1 }; });
    localStorage.setItem('ks3dt-dev', JSON.stringify(s));
    App.state.absence = [];
    App.openLesson('j2-04', {});
  });
  await page.waitForFunction(() => App.state.lesson && !document.querySelector('#player').hidden && App.state.chunks && App.state.chunks.length, { timeout: 20000 });
  await sleep(800);
}
const curId = page => page.evaluate(() => App.state.chunks[App.state.chunkIdx].id);
const goTo = async (page, id) => {
  for (let n = 0; n < 12; n++) {
    if (await curId(page) === id) break;
    await page.evaluate(() => App.nextChunk()); await sleep(600);
  }
  await sleep(500);
  return (await curId(page)) === id;
};
/* a real click (App.armButton ignores synthetic ones, and any press inside GHOST_MS of the button appearing) */
const press = async (page, sel, wait) => {
  await sleep(wait == null ? 1600 : wait);
  const h = await page.$(sel); if (!h) return false;
  const vis = await page.evaluate(e => !!e.offsetParent && !e.disabled, h); if (!vis) return false;
  await h.click(); await sleep(500); return true;
};
const setCode = (page, code) => page.evaluate(code => {
  const t = document.querySelector('textarea.pye-code'); if (!t) return false;
  t.focus(); t.value = code; t.dispatchEvent(new Event('input', { bubbles: true })); return true;
}, code);
/* a room that asks waits for her word in The adventure box: type it and press Send */
const reply = async (page, word) => {
  await page.waitForFunction(() => { const i = document.querySelector('.pyx-reply'); return i && i.offsetParent; }, { timeout: 20000 }).catch(() => {});
  const i = await page.$('.pyx-reply'); if (!i) return false;
  await i.type(word); await page.evaluate(() => document.querySelector('.pyx-send').click()); await sleep(400); return true;
};
const waitVerdict = page => page.waitForFunction(() => { const v = document.querySelector('.pyrun-verdict'); return v && !v.hidden && v.textContent.trim().length > 4; }, { timeout: 30000 }).catch(() => {});
const verdict = page => page.evaluate(() => {
  const v = document.querySelector('.pyrun-verdict'), h = v && v.querySelector('h3, .pyrun-verdict-label, strong, b');
  return { text: v ? v.textContent.trim().replace(/\s+/g, ' ').slice(0, 200) : '', head: h ? h.textContent.trim() : '', matched: !!(v && /is-matched/.test(v.className)), cls: v ? v.className : '' };
});

const ROOM = (w1, w2, caps) => [
  caps ? 'print("You are in the PLACE. SAY WHAT THE PLAYER CAN SEE.")' : 'print("You are in a dusty attic. A lamp flickers beside an old rug.")',
  `choice = input("Do you lift the ${w1} or roll up the ${w2}? Type ${w1} or ${w2}.")`,
  `if choice == "${w1}":`,
  caps ? '    print("SAY WHAT HAPPENS ON THIS ROAD.")' : '    print("The lamp hides a tiny silver key.")',
  '    print("NEXT: door A")',
  `elif choice == "${w2}":`,
  caps ? '    print("SAY WHAT HAPPENS ON THE OTHER ROAD.")' : '    print("Under the rug is a trapdoor.")',
  '    print("NEXT: door B")',
  'else:',
  caps ? '    print("SAY WHAT HAPPENS IF THEY TYPE SOMETHING ELSE.")' : '    print("You sneeze in the dust and stay put.")',
  '    print("NEXT: door A")'
].join('\n');
const TWIST = [
  'print("You are in a dusty attic. A lamp flickers beside an old rug.")',
  'choice = input("Do you lift the lamp or roll up the rug? Type lamp or rug.")',
  'if choice == "lamp":',
  '    print("The lamp hides a tiny silver key.")',
  '    twist = input("Do you keep the key? Type yes or no.")',
  '    if twist == "yes":',
  '        print("You pocket the key.")',
  '        print("NEXT: door A")',
  '    else:',
  '        print("You put the key back.")',
  '        print("NEXT: door B")',
  'elif choice == "rug":',
  '    print("Under the rug is a trapdoor.")',
  '    print("NEXT: door B")',
  'else:',
  '    print("You sneeze in the dust and stay put.")',
  '    print("NEXT: door A")'
].join('\n');

(async () => {
  const srv = spawn('node', [path.join(ROOT, 'ks3-dt/tools/dev-static.js'), String(PORT), ROOT], { stdio: 'ignore' });
  await sleep(700);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'ks3-dt/content/j2/lessons/j2-04.json'), 'utf8'));
  const C = id => lesson.chunks.find(c => c.id === id).config;
  try {
    console.log(CONTROL ? '(CONTROL: origin/main engines.js + style.css — every [engine] check should FAIL)' : '');

    /* ---- 1. training build 3 stays runnable after it works ---- */
    console.log('\n== 1. training build 3: pass, then RUN again');
    let page = await newPage(browser); await openLesson(page);
    check(await goTo(page, 'training-3'), 'reached training build 3', 'setup');
    await press(page, '#player .primary-btn');   /* Open the room */
    const t3 = C('training-3').builds[0];
    const want = t3.lines.slice(0, 6).map(l => l.t);
    for (const w of want) {
      const ok = await page.evaluate(w => {
        const b = [...document.querySelectorAll('.pyrun-line.in-tray')].find(x => {
          const code = x.querySelector('code'); if (!code) return false;
          const clone = code.cloneNode(true); clone.querySelectorAll('input').forEach(i => i.replaceWith('____'));
          return clone.textContent.replace(/ /g, ' ') === w || clone.textContent.trim() === w.trim() && /^\s/.test(clone.textContent) === /^\s/.test(w);
        });
        if (!b) return false; b.click(); return true;
      }, w);
      if (!ok) { check(false, `tray line "${w}" was found`, 'setup'); break; }
      await sleep(250);
    }
    for (const [k, v] of [['t3_w2', 'desk'], ['t3_story', 'The desk drawer creaks open.']]) {
      const inp = await page.$(`.pyrun-line:not(.in-tray) input.pyrun-blank[data-key="${k}"], input.pyrun-blank[data-key="${k}"]`);
      if (inp) { await inp.click({ clickCount: 3 }); await inp.type(v); } else check(false, `gap ${k} was found`, 'setup');
    }
    await press(page, '.pyrun-run', 300);
    await reply(page, 'lamp');
    await waitVerdict(page);
    let v1 = await verdict(page);
    await shot(page, 'j2l4-1-training3');
    check(v1.matched, `training build 3 passes ("${v1.text.slice(0, 70)}")`, 'setup');
    const runLive = await page.evaluate(() => { const b = document.querySelector('.pyrun-run'); return !!b && !b.disabled; });
    check(runLive, 'after the pass, RUN is still switched on, so she can run it with her other words (step 6)');
    check(!page.__errs.length, `no page errors (${page.__errs.slice(0, 2).join(' | ')})`, 'setup');

    /* ---- 2–6. her own room ---- */
    console.log('\n== 2. the two words: the refusal goes when she types');
    check(await goTo(page, 'myroom'), 'reached her own room', 'setup');
    await press(page, '.pye-start');
    const refusal1 = await page.evaluate(() => { const s = document.querySelector('.pth-words-say'); return s && !s.hidden ? s.textContent.trim() : ''; });
    check(!!refusal1, `Start with no words is refused ("${refusal1.slice(0, 50)}")`, 'setup');
    const w1 = await page.$('.pth-words input[data-w="w1"]'); await w1.click(); await w1.type('l');
    const refusal2 = await page.evaluate(() => { const s = document.querySelector('.pth-words-say'); return !!s && !s.hidden; });
    check(!refusal2, 'the red "Type both words first" goes on her first key');
    await w1.type('amp');
    const w2 = await page.$('.pth-words input[data-w="w2"]'); await w2.click(); await w2.type('rug');

    console.log('\n== 3. Start writing opens the bench at the top');
    await press(page, '.pye-start');
    await sleep(600);
    const top = await page.evaluate(() => ({ y: scrollY, bench: !!document.querySelector('textarea.pye-code') }));
    await shot(page, 'j2l4-3-bench-top');
    check(top.bench, 'the bench opened', 'setup');
    check(top.y === 0, `the bench opens at the top of the page (scrollY ${top.y})`);

    console.log('\n== 4. a room still holding the CAPITAL words');
    const capsRoom = ROOM('lamp', 'rug', true);
    await setCode(page, capsRoom);
    await press(page, '.pyrun-run', 400);
    await reply(page, 'lamp');
    await waitVerdict(page); await sleep(1500);
    let v4 = await verdict(page);
    const pub4 = await page.evaluate(() => { const b = document.querySelector('.pth-publish-btn'); return b ? { on: !b.disabled, cls: b.className } : null; });
    await shot(page, 'j2l4-4-caps');
    check(/NOT FINISHED YET/.test(v4.text) && !v4.matched, `a room with the shape's capitals says NOT FINISHED YET ("${v4.text.slice(0, 60)}")`);
    check(!!pub4 && !pub4.on, `Publish stays off (${JSON.stringify(pub4)})`, 'setup');

    console.log('\n== 5. a reload keeps her room and her two words');
    await sleep(1200);
    await openLesson(page);
    check(await goTo(page, 'myroom'), 'back at her own room after the reload', 'setup');
    const kept = await page.evaluate(() => ({ w1: (document.querySelector('.pth-words input[data-w="w1"]') || {}).value, w2: (document.querySelector('.pth-words input[data-w="w2"]') || {}).value }));
    check(kept.w1 === 'lamp' && kept.w2 === 'rug', `her two words are still in the boxes (${JSON.stringify(kept)})`);
    await press(page, '.pye-start');
    const keptCode = await page.evaluate(() => (document.querySelector('textarea.pye-code') || {}).value || '');
    check(keptCode.trim() === capsRoom.trim(), `her room is still in the typing box (${keptCode.length} characters)`);

    console.log('\n== 6. a proper room passes; Publish on; one path table');
    await setCode(page, ROOM('lamp', 'rug', false));
    await press(page, '.pyrun-run', 400);
    await reply(page, 'rug');
    await page.waitForFunction(() => { const v = document.querySelector('.pyrun-verdict'); return v && /is-matched/.test(v.className); }, { timeout: 30000 }).catch(() => {});
    await sleep(1500);
    const v6 = await verdict(page);
    const st6 = await page.evaluate(() => { const b = document.querySelector('.pth-publish-btn'); return { pub: b ? !b.disabled : null, tables: document.querySelectorAll('#player .pth').length }; });
    await shot(page, 'j2l4-6-pass');
    check(v6.matched, `the proper room passes ("${v6.text.slice(0, 60)}")`, 'setup');
    check(st6.pub === true, 'Publish switches on', 'setup');
    check(st6.tables === 1, `one path table is on the card (${st6.tables})`, 'setup');

    console.log('\n== 7. publish, Carry on, the twist bench');
    await press(page, '.pth-publish-btn', 300);
    await page.waitForSelector('.pth-published-go', { timeout: 15000 }).catch(() => {});
    const goLabel = await page.evaluate(() => { const b = document.querySelector('.pth-published-go'); return b ? b.textContent.trim() : ''; });
    await shot(page, 'j2l4-7-published');
    check(goLabel === 'See the optional twist', `the published card's button says where it goes: "See the optional twist" (said "${goLabel}")`, 'content');
    await press(page, '.pth-published-go');
    const offer = await page.evaluate(() => !!document.querySelector('.py-offer-yes'));
    check(offer, 'the twist is offered, with a yes and a no', 'setup');
    await press(page, '.py-offer-yes');
    await sleep(800);
    const tw = await page.evaluate(() => {
      const brief = document.querySelector('#player .pye-bench-brief');
      const stop = document.querySelector('#player .pyrun-stop');
      const emptyJobs = [...document.querySelectorAll('#player h3, #player h4')].filter(h => /job/i.test(h.textContent) && h.offsetParent)
        .some(h => { const n = h.nextElementSibling; return !n || !n.textContent.trim(); });
      return { brief: brief ? getComputedStyle(brief).whiteSpace : '', stop: stop && stop.offsetParent ? stop.textContent.trim() : '', emptyJobs, code: (document.querySelector('textarea.pye-code') || {}).value || '' };
    });
    await shot(page, 'j2l4-7-twist-bench');
    check(tw.brief === 'pre-line', `the twist's numbered steps keep their own lines (white-space ${tw.brief || 'none'})`);
    check(/Skip the twist/.test(tw.stop), `the twist bench has a way out ("${tw.stop.slice(0, 60)}")`);
    check(!tw.emptyJobs, 'no empty jobs heading on the twist bench', 'setup');
    check(/lamp hides a tiny silver key/.test(tw.code), 'her room is already in the twist\'s typing box', 'setup');
    await setCode(page, TWIST);
    await press(page, '.pyrun-run', 400);
    await reply(page, 'lamp'); await reply(page, 'yes');
    await page.waitForFunction(() => { const v = document.querySelector('.pyrun-verdict'); return v && /is-matched/.test(v.className); }, { timeout: 30000 }).catch(() => {});
    await sleep(1200);
    const v7 = await verdict(page);
    await shot(page, 'j2l4-7-twist-pass');
    check(v7.matched && /IT WORKS/.test(v7.text) && !/ALL FIVE JOBS/i.test(v7.text), `the twist's pass says IT WORKS ("${v7.text.slice(0, 60)}")`);
    const skipGone = await page.evaluate(() => { const s = document.querySelector('#player .pyrun-stop'); return !s || !s.offsetParent; });
    check(!!tw.stop && skipGone, 'once the twist works, only its Continue is offered (the skip button has gone)');
    check(!page.__errs.length, `no page errors (${page.__errs.slice(0, 2).join(' | ')})`, 'setup');
    await page.close();

    /* ---- 7b. the stop button moves her on (a fresh pupil, published, says yes to the twist, then stops) ---- */
    console.log('\n== 7b. the twist\'s stop button moves her on');
    page = await newPage(browser); await openLesson(page);
    await goTo(page, 'myroom');
    for (const [k, v] of [['w1', 'lamp'], ['w2', 'rug']]) { const h = await page.$(`.pth-words input[data-w="${k}"]`); await h.click(); await h.type(v); }
    await press(page, '.pye-start');
    await setCode(page, ROOM('lamp', 'rug', false));
    await press(page, '.pyrun-run', 400);
    await reply(page, 'rug');
    await page.waitForFunction(() => { const b = document.querySelector('.pth-publish-btn'); return b && !b.disabled; }, { timeout: 30000 }).catch(() => {});
    await press(page, '.pth-publish-btn');
    await page.waitForSelector('.pth-published-go', { timeout: 15000 }).catch(() => {});
    await press(page, '.pth-published-go');
    await press(page, '.py-offer-yes');
    const stopped = await press(page, '.pyrun-stop');
    await sleep(900);
    /* the room's badge comes up first; Onward closes it and the lesson moves on */
    for (let n = 0; n < 3; n++) {
      await sleep(1600);
      const on = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.offsetParent && /^(Onward|Later)$/.test(b.textContent.trim())) || null);
      if (!on || !(await on.evaluate(x => !!x).catch(() => false))) break;
      await on.click(); await sleep(700);
    }
    await sleep(900);
    await shot(page, 'j2l4-7b-c');
    const after = await curId(page);
    check(stopped && after === 'classadventure', `pressing it goes on to the class adventure (now on "${after}")`);

    /* ---- 8. the class adventure's count ---- */
    console.log('\n== 8. the class adventure\'s room count');
    if (after !== 'classadventure') await goTo(page, 'classadventure');
    await press(page, '#player .primary-btn');
    await page.waitForFunction(() => { const c = document.querySelector('.rly-count'); return c && /\d/.test(c.textContent); }, { timeout: 15000 }).catch(() => {});
    const cnt = await page.evaluate(() => (document.querySelector('.rly-count') || {}).textContent || '');
    const pool = C('classadventure').houseRooms.length + 1;   /* the house rooms plus hers */
    const all = +((/of (\d+)/.exec(cnt) || [])[1] || 0);
    await shot(page, 'j2l4-8-count');
    check(all > 0 && all <= pool, `the count never promises more rooms than there are ("${cnt}", ${pool} rooms)`);
    check(!page.__errs.length, `no page errors (${page.__errs.slice(0, 2).join(' | ')})`, 'setup');
    await page.close();
  } finally { await browser.close(); srv.kill(); }
  const engFails = ENGINE_RESULTS.filter(x => !x).length;
  if (CONTROL) {
    console.log(`\nCONTROL: ${engFails} of ${ENGINE_RESULTS.length} [engine] checks failed (all must fail)`);
    process.exit(engFails === ENGINE_RESULTS.length ? 0 : 1);
  }
  console.log(FAILS.length ? `\nFAILED ${FAILS.length} of ${PASS + FAILS.length} checks` : `\nPASSED all ${PASS} checks`);
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
