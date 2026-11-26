/* qa-walk-j2l4b-26nov — the second batch of faults the live walk of J2 Lesson 4 found on Version 87
   (26 Nov 2026), as a fresh pupil at 1366x625.
   1. BACKSPACE IN THE INDENT. The typing box adds four spaces after a colon, but Backspace took
      them back one at a time. On a line of only spaces it must take a whole step of four.
   2. JOB 5 SPOKE TOO SOON. "Both roads print the same words" showed while her second road had
      never run at all. Until jobs 2 and 3 are done, job 5 must say it is waiting for them.
   3. AN OLD ANSWER LOOKED NEW. After she edited, the last run's verdict and adventure stayed bright
      as if they described the new code. They must dim, with a line telling her to press RUN again,
      and go bright again if she puts the code back.
   4. THE PUBLISHED CARD OPENED OFF THE SCREEN. After Publish it must be in view.
   5. A SILENT WAIT. A classmate's room loads from the internet; the adventure box said nothing.
      It must say the room is opening (a ready-made room needs no wait, so says nothing).
   6. LINES STACKED UNDER THEIR NUMBERS. On the code-ordering cards at school-PC width the number,
      the line and its button must share a row, on a card wide enough for two columns.
   Content checks ([content]) read the lesson file, so they pass under CONTROL too; every [engine]
   check must FAIL under CONTROL=1 (origin/main's engines.js and style.css).
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-walk-j2l4b-26nov.js [--port=8878] [--shots=DIR] */
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), PORT = +arg('port', 8878), CONTROL = process.env.CONTROL === '1';
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
  for (let n = 0; n < 14; n++) {
    if (await curId(page) === id) break;
    await page.evaluate(() => App.nextChunk()); await sleep(600);
  }
  await sleep(500);
  return (await curId(page)) === id;
};
const press = async (page, sel, wait) => {
  await sleep(wait == null ? 1600 : wait);
  const h = await page.$(sel); if (!h) return false;
  const vis = await page.evaluate(e => !!e.offsetParent && !e.disabled, h); if (!vis) return false;
  await h.click(); await sleep(500); return true;
};
const setCode = (page, code) => page.evaluate(code => {
  const t = document.querySelector('textarea.pye-code'); if (!t) return false;
  t.focus(); t.value = code; t.selectionStart = t.selectionEnd = code.length;
  t.dispatchEvent(new Event('input', { bubbles: true })); return true;
}, code);
const caretToEnd = page => page.evaluate(() => { const t = document.querySelector('textarea.pye-code'); t.focus(); t.selectionStart = t.selectionEnd = t.value.length; });
const reply = async (page, word) => {
  await page.waitForFunction(() => { const i = document.querySelector('.pyx-reply'); return i && i.offsetParent && !i.disabled; }, { timeout: 20000 }).catch(() => {});
  const i = await page.$('.pyx-reply'); if (!i) return false;
  await i.type(word); await page.evaluate(() => document.querySelector('.pyx-send').click()); await sleep(400); return true;
};
const ROOM = (w1, w2, opts) => {
  opts = opts || {};
  return [
    'print("You are in a dusty attic. A lamp flickers beside an old rug.")',
    `choice = input("Do you lift the ${w1} or roll up the ${w2}? Type ${w1} or ${w2}.")`,
    `if choice == "${w1}":`,
    '    print("The lamp hides a tiny silver key.")',
    '    print("NEXT: door A")',
    /* the waiting room: her elif word is misspelt, so her SECOND word falls to the else road, which
       tells road 1's story — job 3 is not done and the two words print the same words */
    `elif choice == "${opts.misspelt ? w2 + 'g' : w2}":`,
    '    print("Under the rug is a trapdoor.")',
    '    print("NEXT: door B")',
    'else:',
    opts.misspelt ? '    print("The lamp hides a tiny silver key.")' : '    print("You sneeze in the dust and stay put.")',
    '    print("NEXT: door A")'
  ].join('\n');
};

(async () => {
  const srv = spawn('node', [path.join(ROOT, 'ks3-dt/tools/dev-static.js'), String(PORT), ROOT], { stdio: 'ignore' });
  await sleep(700);
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
  const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, 'ks3-dt/content/j2/lessons/j2-04.json'), 'utf8'));
  const C = id => lesson.chunks.find(c => c.id === id).config;
  try {
    console.log(CONTROL ? '(CONTROL: origin/main engines.js + style.css — every [engine] check should FAIL)' : '');

    console.log('\n== 0. the words the engine needs are in the lesson');
    const STALE = C('myroom').staleSay, J5 = C('myroom').builds[0].features[4], OPEN = (C('classadventure').words || {}).openingSay;
    check(['training-1', 'training-3', 'myroom', 'extras'].every(id => /Press RUN again/.test(C(id).staleSay || '')), 'all four run screens carry a staleSay line', 'content');
    check(J5.id === 'different' && JSON.stringify(J5.waitFor) === '["path-1","path-2"]' && !!J5.waitNudge, 'job 5 waits for jobs 2 and 3 and has its own waiting line', 'content');
    check(!!OPEN, 'the class adventure has an opening line for a room that loads', 'content');
    check(/up to five rooms/.test(C('classadventure').intro) && /last room/.test(C('classadventure').steps[2]), 'the adventure promises up to five rooms and ends after the last one', 'content');

    let page = await newPage(browser); await openLesson(page);
    check(await goTo(page, 'myroom'), 'reached her own room', 'setup');
    for (const [k, v] of [['w1', 'lamp'], ['w2', 'rug']]) { const h = await page.$(`.pth-words input[data-w="${k}"]`); await h.click(); await h.type(v); }
    await press(page, '.pye-start');
    await page.waitForSelector('textarea.pye-code', { timeout: 10000 }).catch(() => {});

    console.log('\n== 1. Backspace on a line of only spaces takes a whole step');
    await setCode(page, 'if choice == "lamp":\n        ');
    await caretToEnd(page);
    await page.keyboard.press('Backspace');
    const bs1 = await page.evaluate(() => { const v = document.querySelector('textarea.pye-code').value; return v.slice(v.lastIndexOf('\n') + 1).length; });
    await page.keyboard.press('Backspace');
    const bs2 = await page.evaluate(() => { const v = document.querySelector('textarea.pye-code').value; return v.slice(v.lastIndexOf('\n') + 1).length; });
    check(bs1 === 4 && bs2 === 0, `eight spaces, Backspace, Backspace leaves 4 then 0 (left ${bs1} then ${bs2})`);
    await setCode(page, 'print("hi")');
    await caretToEnd(page);
    await page.keyboard.press('Backspace');
    const bs3 = await page.evaluate(() => document.querySelector('textarea.pye-code').value);
    check(bs3 === 'print("hi"', `on a line with words, Backspace still takes one letter ("${bs3}")`, 'setup');

    console.log('\n== 2. job 5 waits while job 3 is not done');
    await setCode(page, ROOM('lamp', 'rug', { misspelt: true }));
    await press(page, '.pyrun-run', 400);
    await reply(page, 'lamp');
    await page.waitForFunction(() => { const v = document.querySelector('.pyrun-verdict'); return v && !v.hidden && v.textContent.trim().length > 4; }, { timeout: 30000 }).catch(() => {});
    await sleep(2500);
    const jobs = await page.evaluate(() => [...document.querySelectorAll('.pyf-item')].map(r => ({ f: r.dataset.f, cls: r.className, nudge: (r.querySelector('.pyf-nudge') || {}).textContent || '' })));
    const verdictText = await page.evaluate(() => (document.querySelector('.pyrun-verdict') || {}).textContent || '');
    await shot(page, 'j2l4b-2-waiting');
    const j3 = jobs.find(j => j.f === 'path-2') || {}, j5 = jobs.find(j => j.f === 'different') || {};
    console.log('        jobs: ' + jobs.map(j => j.f + '=' + j.cls.replace('pyf-item ', '')).join(', '));
    check(/is-notyet/.test(j3.cls || '') && /is-notyet/.test(j5.cls || ''), 'the misspelt room leaves job 3 and job 5 not done', 'setup');
    check(j5.nudge === J5.waitNudge, `job 5's hint says it is waiting ("${j5.nudge.slice(0, 60)}")`);
    check(verdictText.includes(J5.waitNudge) && !verdictText.includes(J5.nudge), 'the result box says the same, and not "Both roads print the same words"');

    console.log('\n== 3. after an edit the old answer dims and says to press RUN again');
    await caretToEnd(page);
    await page.keyboard.type(' ');
    await sleep(300);
    const st1 = await page.evaluate(() => {
      const v = document.querySelector('.pyrun-verdict'), s = document.querySelector('.pyw-stage');
      const n = v && v.querySelector('.pyrun-stale');
      return { v: !!v && v.classList.contains('is-stale'), stage: !!s && s.classList.contains('is-stale'), note: n ? n.textContent : '', noteOp: n ? getComputedStyle(n).opacity : '' };
    });
    await shot(page, 'j2l4b-3-stale');
    check(st1.v && st1.stage, `the verdict and the adventure both dim (${JSON.stringify({ v: st1.v, stage: st1.stage })})`);
    check(st1.note === STALE && st1.noteOp === '1', `the line "${STALE.slice(0, 40)}…" shows at full strength`);
    await page.keyboard.press('Backspace');
    await sleep(300);
    const st2 = await page.evaluate(() => { const v = document.querySelector('.pyrun-verdict'); return { v: v.classList.contains('is-stale'), note: !!v.querySelector('.pyrun-stale') }; });
    check(st1.v && !st2.v && !st2.note, 'putting the code back as it ran makes it bright again, without the line');

    console.log('\n== 4. the published card opens in view');
    await setCode(page, ROOM('lamp', 'rug'));
    await press(page, '.pyrun-run', 400);
    await reply(page, 'rug');
    await page.waitForFunction(() => { const b = document.querySelector('.pth-publish-btn'); return b && !b.disabled; }, { timeout: 30000 }).catch(() => {});
    const runCleared = await page.evaluate(() => !document.querySelector('.pyrun-verdict').classList.contains('is-stale'));
    check(runCleared, 'pressing RUN clears the dim', 'setup');
    await press(page, '.pth-publish-btn');
    await page.waitForSelector('.pth-published-go', { timeout: 15000 }).catch(() => {});
    await sleep(1500);
    const pubBox = await page.evaluate(() => {
      const p = document.querySelector('.pth-published'), g = document.querySelector('.pth-published-go');
      if (!p || !g) return null;
      const r = p.getBoundingClientRect(), rg = g.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), goBottom: Math.round(rg.bottom), h: innerHeight };
    });
    await shot(page, 'j2l4b-4-published');
    check(!!pubBox && pubBox.top >= 0 && pubBox.top < pubBox.h - 60 && pubBox.goBottom <= pubBox.h, `the PUBLISHED card and its button are on the screen (${JSON.stringify(pubBox)})`);
    check(!page.__errs.length, `no page errors (${page.__errs.slice(0, 2).join(' | ')})`, 'setup');

    console.log('\n== 5. a classmate\'s room says it is opening');
    check(await goTo(page, 'classadventure'), 'reached the class adventure', 'setup');
    /* every room starts a fresh transcript (chat.clear), so the lines are caught as they arrive */
    await page.evaluate(() => {
      window.__said = [];
      new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
        const t = (n.textContent || '').trim(); if (t && n.nodeType === 1) window.__said.push(t);
      }))).observe(document.querySelector('#player'), { childList: true, subtree: true });
    });
    await press(page, '#player .primary-btn');
    let ended = false, sent = 0;
    for (let n = 0; n < 40 && !ended; n++) {
      await sleep(900);
      const s = await page.evaluate(() => {
        const i = document.querySelector('.pyx-reply');
        return { ask: !!(i && i.offsetParent && !i.disabled), end: /You reached the end/.test(document.querySelector('#player').textContent) };
      });
      if (s.end) { ended = true; break; }
      if (s.ask) { await reply(page, 'zzz'); sent++; }
    }
    const rel = await page.evaluate(open => {
      const said = window.__said.filter(t => t.length < 200);
      const seq = []; let last = '';
      said.forEach(t => {
        if (/^— .* —$/.test(t) && t !== last) { seq.push({ head: t, open: false }); last = t; }
        else if (t === open && seq.length) seq[seq.length - 1].open = true;
      });
      return { seq, opens: seq.filter(r => r.open).length, heads: seq.length };
    }, OPEN);
    console.log('        rooms: ' + rel.seq.map(r => r.head + (r.open ? ' [opening line]' : '')).join(', '));
    const houseN = C('classadventure').houseRooms.length;
    await shot(page, 'j2l4b-5-adventure');
    check(ended, `the adventure reached its end (${sent} replies, ${rel.heads} room headings)`, 'setup');
    /* a ready-made room is in the lesson itself and opens at once; every other room (a
       classmate's, or her own published one) is fetched from the server, so it says it is opening */
    const house = r => /one of the rooms from the training builds/.test(r.head);
    const fetched = rel.seq.filter(r => !house(r));
    check(fetched.length >= 1, `the play reached at least one room fetched from the server (${fetched.length} of ${rel.heads} rooms)`, 'setup');
    check(fetched.length >= 1 && fetched.every(r => r.open) && rel.seq.filter(house).every(r => !r.open),
      `"${OPEN}" showed for every fetched room and for no ready-made room (${rel.opens} of ${rel.heads} rooms, ${houseN} ready-made)`);
    check(!page.__errs.length, `no page errors (${page.__errs.slice(0, 2).join(' | ')})`, 'setup');
    await page.close();

    console.log('\n== 6. code-ordering cards: number, line and button share a row');
    page = await newPage(browser); await openLesson(page);
    const rowCheck = async (id, extras) => {
      check(await goTo(page, id), `reached ${id}`, 'setup');
      await page.evaluate(() => { const b = [...document.querySelectorAll('#player .primary-btn')].find(x => x.offsetParent && !x.disabled); if (b) b.click(); });
      await sleep(1000);
      if (extras) { await page.evaluate(() => { const b = [...document.querySelectorAll('#player button')].find(x => x.offsetParent && /^Job 1/.test(x.textContent.trim())); if (b) b.click(); }); await sleep(1000); }
      for (let k = 0; k < 3; k++) { await page.evaluate(() => { const b = document.querySelector('.pyt-list .pyrun-line, .pt-list .parsons-block'); if (b) b.click(); }); await sleep(350); }
      return page.evaluate(() => {
        const card = document.querySelector('#player .parsons-card, #player .pyrun-card');
        const lis = [...document.querySelectorAll('.pyp-list li, .pp-list li')].filter(li => li.offsetParent);
        const rows = lis.map(li => {
          const kids = [...li.children].filter(k => k.offsetParent);
          const tops = kids.map(k => { const r = k.getBoundingClientRect(); return r.top + r.height / 2; });
          return { n: kids.length, spread: tops.length ? Math.round(Math.max(...tops) - Math.min(...tops)) : 99 };
        });
        return { card: card ? Math.round(card.getBoundingClientRect().width) : 0, rows };
      });
    };
    const ex = await rowCheck('exitp', false);
    await shot(page, 'j2l4b-6-exitp');
    check(ex.rows.length >= 3 && ex.rows.every(r => r.spread <= 8), `the exit check's placed lines each sit on one row (${JSON.stringify(ex.rows)})`, 'setup');   /* its short lines fitted before the fix too: a guard, not proof */
    check(ex.card >= 990, `its card is wide enough for two columns (${ex.card}px)`);
    const xt = await rowCheck('extras', true);
    await shot(page, 'j2l4b-6-extras');
    check(xt.rows.length >= 3 && xt.rows.every(r => r.spread <= 8), `the extras' placed lines each sit on one row (${JSON.stringify(xt.rows)})`);
    check(xt.card >= 990, `its card is wide enough for two columns (${xt.card}px)`);
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
