#!/usr/bin/env node
/* qa-l4-cards.js — EVERY NEW PYRUN CARD OF THE TWO L4s, MOUNTED AND DRIVEN (§C1 / §C13).
 *
 * The pyrun engine's L4 increments, proved on the lessons' OWN configs (read
 * from content-src once the content has landed, from the drafts before) with a
 * fake ctx whose server is a few lines of JavaScript:
 *   J2 · training-1: the worked card with the planted `=` — the run stops with
 *        the real SyntaxError; `==` in the gap and an answered question → IT WORKS
 *        (check.kind clean + uses)
 *      · training-3: fixedTop lines locked at the top of Your program and in
 *        the run; check.kind paths with `{t3_w2}` read from her gap; the path
 *        table under the console; no else road → banana reaches NO door → NOT YET
 *      · myroom: the two words on the PLAN (empty / same refusals), pinned on the
 *        BENCH; the untouched palette fails scene-ask and the verdict repeats the
 *        nudges; a correct room ticks all five, the publish button wakes, roomPut
 *        is called, the PUBLISHED card names her number (server n + the house
 *        rooms), and its button carries on to the twist's offer
 *      · extras job 2: fixedBlanks — one key fills both gaps of the fixed question
 *   J3 · machine-1: the bloat meter's two counts are the two programs' lengths
 *      · machine-3: check.kind calls — the floor's three product cards; a wrong
 *        slot name → NameError per order in the reject bin → NOT YET
 *      · factory: the spec card on both faces; the empty starter → all-None
 *        collapses to one sentence; a correct factory → BOTH MACHINES WORK; the
 *        chain's bench starts from her saved factory (`from`)
 * CONTROL (DFM 196): the engine he sat, mounted on the same myroom config, draws
 * no words box and no publish row; on training-3 it renders no fixed lines.
 *
 *   node qa-l4-cards.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { enginePage } = require('./lib/l4-engine-page.js');
const BASE_REF = process.env.KS3DT_L4_BASE || '8f58434';
const SRC = process.env.KS3DT_SRC || path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const DRAFTS = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/L4_CONTENT_DRAFTS');
function lesson(id) {
  const y = id.slice(0, 2);
  const inSrc = path.join(SRC, y, 'lessons', id + '.json');
  return JSON.parse(fs.readFileSync(fs.existsSync(inSrc) ? inSrc : path.join(DRAFTS, id + '.json'), 'utf8'));
}
const J2 = lesson('j2-04'), J3 = lesson('j3-04');
const chunkOf = (L, id) => L.chunks.find(c => c.id === id);

let failures = 0;
const check = (ok, m, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m + (!ok && d ? '   [' + String(d).slice(0, 300) + ']' : '')); if (!ok) failures++; };
const control = (ok, m, d) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m + (!ok && d ? '   [' + d + ']' : '')); if (!ok) failures++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function mount(page, L, chunkId, opts) {
  return page.evaluate((a) => {
    window.__events = []; window.__badge = null; window.__nexts = 0; window.__calls = [];
    document.body.innerHTML = '<div id="host" class="chunk-host"></div>';
    const host = document.getElementById('host');
    const ctx = {
      lesson: { id: a.L.id, chunks: a.L.chunks },
      chunk: a.chunk, review: false, catchup: false,
      draft: a.draft || {},
      saveDraft: function (d) { ctx.draft = d; window.__draft = d; },
      call: function (verb, req) {
        window.__calls.push({ verb, req });
        if (verb === 'roomPut') return Promise.resolve(a.putFails ? { ok: false, error: 'store-full' } : { ok: true, n: 4, h: 'abc', replaced: 0 });
        return Promise.resolve({ ok: false, error: 'unknown-verb' });
      },
      saveEvent: function (e) { window.__events.push(e); return Promise.resolve(); },
      awardBadge: function (b, detail) { window.__badge = { badge: b, detail }; return Promise.resolve(); },
      next: function () { window.__nexts++; }
    };
    window.Engines.pyrun.mount(host, a.chunk, ctx);
    return true;
  }, { L, chunk: chunkOf(L, chunkId), draft: opts && opts.draft, putFails: opts && opts.putFails });
}
const clickText = (page, rx) => page.evaluate((r) => {
  const b = Array.from(document.querySelectorAll('button')).find(x => new RegExp(r, 'i').test((x.textContent || '').trim()) && x.offsetParent !== null && !x.disabled);
  if (b) { b.click(); return (b.textContent || '').trim(); } return null;
}, rx.source);
const click = (page, sel) => page.evaluate((s) => { const b = document.querySelector(s); if (b && !b.disabled) { b.click(); return true; } return false; }, sel);
const text = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).textContent || '', sel);
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const setBlank = (page, key, v) => page.evaluate(([k, val]) => {
  document.querySelectorAll('.pyrun-blank[data-key="' + k + '"]').forEach(i => { i.value = val; i.dispatchEvent(new Event('input', { bubbles: true })); });
}, [key, v]);
const placeSi = (page, si) => page.evaluate((i) => { const n = document.querySelector('.pyt-list .pyrun-line[data-si="' + i + '"]'); if (!n) return false; (n.querySelector('code') || n).click(); return true; }, si);
/* press RUN, answer the conversation with the given words, wait for the verdict */
async function run(page, answers, maxMs) {
  await click(page, '.pyrun-run:not([disabled])');
  const left = (answers || []).slice();
  const t0 = Date.now();
  while (Date.now() - t0 < (maxMs || 25000)) {
    const st = await page.evaluate(() => {
      const ask = document.querySelector('.pyx-ask .pyx-reply');
      const v = document.querySelector('.pyrun-verdict');
      return { ask: !!(ask && ask.offsetParent !== null), verdict: v && !v.hidden ? v.className : '' };
    });
    if (st.ask) {
      await page.evaluate((w) => { const inp = document.querySelector('.pyx-ask .pyx-reply'); inp.value = w; inp.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.pyx-ask .pyx-send').click(); }, left.shift() || 'zzz');
      await sleep(150); continue;
    }
    if (st.verdict) return st.verdict;
    await sleep(120);
  }
  return 'timeout';
}
const setEditor = (page, code) => page.evaluate((c) => { const ta = document.querySelector('.pye-code'); ta.value = c; ta.dispatchEvent(new Event('input', { bubbles: true })); }, code);

(async () => {
  console.log('qa-l4-cards — every new card, mounted on its own config\n');
  const { browser, page, errs } = await enginePage({});

  /* ───────────── J2 training-1: the worked card with the planted = ───────────── */
  console.log('-- j2-04 training-1 (worked, the planted =) --');
  await mount(page, J2, 'training-1');
  await clickText(page, /Open the room/);
  await sleep(300);
  check(await has(page, '.pyw-card'), 'the worked card mounts from the intro');
  let v = await run(page, ['trolley']);
  const con1 = await text(page, '.pyc');
  check(/is-note|is-notyet/.test(v) && /SyntaxError/.test(con1), 'RUN with the planted = stops with the real SyntaxError in the console', v + ' ' + con1.slice(0, 120));
  await setBlank(page, 't1a', '==');
  v = await run(page, ['trolley']);
  const rows1 = await page.evaluate(() => Array.from(document.querySelectorAll('.pyx-row')).map(x => x.className.replace('pyx-row ', '') + '|' + (x.querySelector('.pyx-text') || {}).textContent));
  check(/is-matched/.test(v) && rows1.some(r => /follow the trolley/.test(r)) && /^is-bot\|You are in the canteen/.test(rows1[0]) && rows1[rows1.length - 1] === 'is-door|You go through door A.',
    '== in the gap, the question answered → IT WORKS; the story reads scene, question, answer, road, door', v + ' ' + JSON.stringify(rows1));

  /* ───────────── J2 training-3: fixedTop + paths ───────────── */
  console.log('\n-- j2-04 training-3 (fixedTop + the path check) --');
  await mount(page, J2, 'training-3');
  await clickText(page, /Open the room/);
  await sleep(300);
  const fixed = await page.evaluate(() => Array.from(document.querySelectorAll('.pyp-fixed-line code')).map(c => c.textContent));
  check(fixed.length === 5 && /^if choice == "lamp":$/.test(fixed[2]) && /^    print\("NEXT: door A"\)$/.test(fixed[4]), 'five lines already in place, locked, with their indents', JSON.stringify(fixed));
  check((await text(page, '.pyp-fixed-label')) === chunkOf(J2, 'training-3').config.builds[0].fixedTopLabel, 'the fixed block carries its content label');
  check(await page.evaluate(() => document.querySelector('.pyrun-run').disabled), 'RUN is asleep until a line is moved (the fixed lines do not count)');
  /* the six keepers, in order: elif, story, door B, else, story, door A */
  for (const si of [0, 1, 2, 3, 4, 5]) await placeSi(page, si);
  await setBlank(page, 't3_w2', 'desk');
  await setBlank(page, 't3_story', 'On the desk is a note in red pen.');
  v = await run(page, ['lamp']);
  const tbl = await page.evaluate(() => Array.from(document.querySelectorAll('.pth tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())));
  check(/is-matched/.test(v), 'a complete room: IT WORKS', v);
  check(tbl.length === 3 && tbl[0][0] === 'lamp' && tbl[1][0] === 'desk' && /banana/.test(tbl[2][0]) && tbl[0][2] === 'door A' && tbl[1][2] === 'door B' && tbl[2][2] === 'door A',
    'the path table: lamp → door A, desk → door B, banana → door A (the {t3_w2} gap read as the second word)', JSON.stringify(tbl));
  /* negative: no else road */
  await mount(page, J2, 'training-3');
  await clickText(page, /Open the room/);
  await sleep(300);
  for (const si of [0, 1, 2]) await placeSi(page, si);
  await setBlank(page, 't3_w2', 'desk');
  await setBlank(page, 't3_story', 'A note.');
  v = await run(page, ['desk']);
  const tbl2 = await page.evaluate(() => Array.from(document.querySelectorAll('.pth tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())));
  check(/is-notyet/.test(v) && tbl2[2] && tbl2[2][2] === chunkOf(J2, 'training-3').config.pathTable.noneWord, 'no else road: banana reaches NO door, the table says so, NOT YET', v + ' ' + JSON.stringify(tbl2));

  /* ───────────── J2 myroom: words, palette, publish ───────────── */
  console.log('\n-- j2-04 myroom (the two words, the path check, publish) --');
  await mount(page, J2, 'myroom');
  await sleep(300);
  const Wd = chunkOf(J2, 'myroom').config.words;
  check(await has(page, '.pye-plan .pth-words input[data-w="w1"]') && await has(page, '.pye-plan .pth-words input[data-w="w2"]'), 'the PLAN carries the two word boxes');
  await click(page, '.pye-start');
  check((await text(page, '.pth-words-say')) === Wd.emptySay && await has(page, '.pye-plan'), 'Start with empty boxes: the refusal says so and the PLAN stays');
  await page.evaluate(() => { document.querySelector('[data-w="w1"]').value = 'Lamp'; document.querySelector('[data-w="w2"]').value = 'lamp'; });
  await click(page, '.pye-start');
  check((await text(page, '.pth-words-say')) === Wd.sameSay, 'two words the same (capitals ignored): the refusal says so');
  await page.evaluate(() => { document.querySelector('[data-w="w1"]').value = 'lamp'; document.querySelector('[data-w="w2"]').value = 'desk'; });
  await click(page, '.pye-start');
  await sleep(300);
  const pinned = await page.evaluate(() => Array.from(document.querySelectorAll('.pth-words-pinned code')).map(c => c.textContent));
  check(await has(page, '.pye-bench') && JSON.stringify(pinned) === '["lamp","desk"]' && (await text(page, '.pth-words-pinned span')) === Wd.pinnedLabel, 'the BENCH pins her two words above the strip', JSON.stringify(pinned));
  check(await page.evaluate(() => document.querySelector('.pth-publish-btn').disabled && !document.querySelector('.pth-publish-note').hidden), 'the publish button sleeps with its note showing');
  await click(page, '.pye-starter-btn');
  v = await run(page, ['lamp']);
  const jobs = await page.evaluate(() => Array.from(document.querySelectorAll('.pyf-item')).map(li => li.className.replace('pyf-item ', '')));
  const nudges = await page.evaluate(() => Array.from(document.querySelectorAll('.pyv-nudges li')).map(li => li.textContent));
  check(/is-notyet/.test(v) && jobs[0] === 'is-notyet' && jobs[3] === 'is-matched', 'the untouched palette: scene-ask NOT YET (the question does not say her words), catch-all done', JSON.stringify(jobs));
  check(nudges.length >= 1 && /Job 1:/.test(nudges[0]) && nudges[0].indexOf(chunkOf(J2, 'myroom').config.builds[0].features[0].nudge) !== -1, 'the verdict repeats every NOT YET job\'s nudge beneath it', JSON.stringify(nudges));
  check(await has(page, '.pth tbody tr') && await page.evaluate(() => document.querySelector('.pth-publish-btn').disabled), 'the path table is drawn and publish still sleeps');
  const LIB = chunkOf(J2, 'classadventure').config.houseRooms[2].lines.map(l => l.t).join('\n');
  await setEditor(page, LIB);
  v = await run(page, ['lamp']);
  check(/is-matched/.test(v) && (await text(page, '.pyrun-vtag')) === chunkOf(J2, 'myroom').config.matchedAllLabel, 'the library room ticks all five: ALL FIVE JOBS DONE', v);
  check(await page.evaluate(() => !document.querySelector('.pth-publish-btn').disabled && /primary-btn/.test(document.querySelector('.pth-publish-btn').className)), 'the publish button wakes, promoted to primary');
  check(!(await has(page, '.pyrun-verdict > .primary-btn')), 'no Continue of its own while the publish is owed');
  await click(page, '.pth-publish-btn');
  await sleep(400);
  const put = await page.evaluate(() => window.__calls.filter(c => c.verb === 'roomPut'));
  check(put.length === 1 && put[0].req.code === LIB, 'roomPut is called once with her room', JSON.stringify(put).slice(0, 120));
  const pubText = await text(page, '.pth-published');
  check(pubText.indexOf(chunkOf(J2, 'myroom').config.publish.doneSay.replace('{n}', '7')) !== -1, 'the PUBLISHED card names her number: server 4 + three house rooms = room 7', pubText);
  await click(page, '.pth-published-go');
  await sleep(300);
  check(await has(page, '.py-offer-card'), 'the way on from the PUBLISHED card is the twist\'s offer');
  await clickText(page, /Add a twist/);
  await sleep(300);
  const twistCode = await page.evaluate(() => (document.querySelector('.pye-code') || {}).value || '');
  check(await has(page, '.pye-bench') && twistCode === LIB, 'the twist starts from her saved room (from: l4room)', twistCode.slice(0, 40));
  /* publish that fails: the button comes back and a way on is offered */
  await mount(page, J2, 'myroom', { putFails: true });
  await sleep(200);
  await page.evaluate(() => { document.querySelector('[data-w="w1"]').value = 'lamp'; document.querySelector('[data-w="w2"]').value = 'desk'; });
  await click(page, '.pye-start'); await sleep(200);
  await setEditor(page, LIB);
  v = await run(page, ['lamp']);
  await click(page, '.pth-publish-btn'); await sleep(400);
  check((await text(page, '.pth-fail')) === chunkOf(J2, 'myroom').config.publish.failSay && await has(page, '.pth-publish-btn:not([disabled])') && await has(page, '.pth-publish-skip'),
    'a refused publish says so, brings the button back, and offers a way on that pays nothing');

  /* ───────────── J2 extras job 2: fixedBlanks ───────────── */
  console.log('\n-- j2-04 extras job 2 (fixedBlanks) --');
  await mount(page, J2, 'extras');
  await sleep(200);
  await page.evaluate(() => { const jobs = document.querySelectorAll('.pyrun-hub .pyrun-job'); jobs[1].click(); });
  await sleep(300);
  const fb = await page.evaluate(() => document.querySelectorAll('.pyp-fixed .pyrun-blank[data-key="f4q"]').length);
  check(fb === 2, 'the fixed question carries the same gap twice (one key, two slots)', String(fb));
  await setBlank(page, 'f4q', 'mat');
  const mirrored = await page.evaluate(() => Array.from(document.querySelectorAll('.pyp-fixed .pyrun-blank[data-key="f4q"]')).map(i => i.value));
  check(JSON.stringify(mirrored) === '["mat","mat"]', 'typing in one slot fills both');
  for (const si of [0, 1, 2, 3, 4, 5]) await placeSi(page, si);
  await setBlank(page, 'f4w', 'mat'); await setBlank(page, 'f4s', 'You lie down on the mat and count the lights.');
  v = await run(page, ['mat']);
  const rowsX = await page.evaluate(() => Array.from(document.querySelectorAll('.pyx-row')).map(x => x.className.replace('pyx-row ', '') + '|' + (x.querySelector('.pyx-text') || {}).textContent));
  check(/is-matched/.test(v) && rowsX.some(r => /count the lights/.test(r)) && rowsX.some(r => /^is-door\|You go through door A\.$/.test(r)) && /^is-bot\|You are in the gym/.test(rowsX[0]),
    'the fourth road runs with the fixed question filled: IT WORKS — and the story reads in order in the conversation, the door as a system line', v + ' ' + JSON.stringify(rowsX));

  /* ───────────── J2 extras job 3: name the player — usesReplies by POSITION ───────────── */
  console.log('\n-- j2-04 extras job 3 (usesReplies: [0] — the name must echo, the choice word need not) --');
  await mount(page, J2, 'extras');
  await sleep(200);
  await page.evaluate(() => { const jobs = document.querySelectorAll('.pyrun-hub .pyrun-job'); jobs[2].click(); });
  await sleep(300);
  for (const si of [0, 1, 2, 3, 4, 5, 6, 7, 8]) await placeSi(page, si);
  v = await run(page, ['Aoife', 'run']);
  check(/is-matched/.test(v), 'the name comes back out and the choice word does not: IT WORKS (the choice is a road, not an echo)', v);
  const echoCtl = await page.evaluate(() => window.PyRun.repliesToEcho(true, ['Aoife', 'run']).length === 2 && window.PyRun.repliesToEcho([0], ['Aoife', 'run']).join() === 'Aoife');
  control(echoCtl, 'usesReplies: true still means EVERY reply (the Lesson 3 chatbot rule is untouched); [0] means the first');

  /* ───────────── J2 extras job 4: a room from a blank box, INSIDE the hub ───────────── */
  console.log('\n-- j2-04 extras job 4 (the typed editor inside the hub: light card, the two ways out, a tick) --');
  await mount(page, J2, 'extras');
  await sleep(200);
  await page.evaluate(() => { const jobs = document.querySelectorAll('.pyrun-hub .pyrun-job'); jobs[3].click(); });
  await sleep(400);
  const wall = await page.evaluate(() => {
    const c = document.querySelector('.pyrun-card');
    const lum = (rgb) => { const m = rgb.match(/\d+/g).map(Number); return (m[0] * 299 + m[1] * 587 + m[2] * 114) / 1000; };
    return { cls: c.className, plate: lum(getComputedStyle(c).backgroundColor), side: !!c.querySelector('.pye-side'),
      back: !!c.querySelector('.pyrun-exit-row .pyrun-back'), finish: !!c.querySelector('.pyrun-exit-row .pyrun-finish') };
  });
  check(/pye-wall/.test(wall.cls) && !/pye-card/.test(wall.cls) && wall.plate > 200, 'the typed-editor card is a LIGHT card (no .pye-card collision with the sent-card block)', JSON.stringify(wall));
  check(!wall.side, 'no empty "What it has to do" panel when the job lists no jobs');
  check(wall.back && wall.finish, 'the two ways out are on the card from the moment it mounts (DFM 265c)');
  await setEditor(page, 'print("You are in the gym.")\nchoice = input("Type rope or ball.")\nif choice == "rope":\n    print("You climb.")\n    print("NEXT: door A")\nelse:\n    print("You bounce it.")\n    print("NEXT: door B")');
  v = await run(page, ['rope']);
  const after = await page.evaluate(() => { const c = document.querySelector('.pyrun-card'); return { back: (c.querySelector('.pyrun-back') || {}).className, cont: !!c.querySelector('.pyrun-verdict .primary-btn'), hub: !!document.querySelector('.pyrun-hub') }; });
  check(/is-matched/.test(v) && /primary-btn/.test(after.back) && !after.cont, 'a working room ticks the job and promotes the way back — no Continue that would end the zone', v + ' ' + JSON.stringify(after));
  await page.evaluate(() => document.querySelector('.pyrun-card .pyrun-back').click());
  await sleep(300);
  const ticked = await page.evaluate(() => Array.from(document.querySelectorAll('.pyrun-hub .pyrun-job')).map(j => !!j.querySelector('.pyrun-job-tick')));
  check(ticked[3] === true && ticked.filter(Boolean).length === 1, 'back on the hub, job 4 is ticked and the others are not', JSON.stringify(ticked));

  /* ───────────── J3 extras job 1: the swap — a gap that ARRIVES wrong ───────────── */
  console.log('\n-- j3-04 extras job 1 (the swap: fixedTop + a pre-filled gap) --');
  await mount(page, J3, 'extras');
  await sleep(200);
  await page.evaluate(() => { const jobs = document.querySelectorAll('.pyrun-hub .pyrun-job'); jobs[0].click(); });
  await sleep(300);
  const swapTop = await page.evaluate(() => document.querySelectorAll('.pyp-fixed-list li, .pyp-fixed .pyrun-line').length);
  check(swapTop === 3, 'the machine and the first call are locked at the top (three fixed lines)', String(swapTop));
  await placeSi(page, 0);
  const arrived = await page.evaluate(() => (document.querySelector('.pyp-list .pyrun-blank[data-key="swap"]') || {}).value);
  check(arrived === '2, "Aoife"', 'the gap ARRIVES with the orders the wrong way round (pre)', JSON.stringify(arrived));
  v = await run(page, []);
  const swapCon = await page.evaluate(() => (document.querySelector('.chunk-host .pyc') || {}).textContent || '');
  check(/is-notyet/.test(v) && /TypeError|line 4/.test(swapCon), 'run as it is: Python stops at the last line (the point of the job), NOT YET', v + ' ' + swapCon.slice(0, 160));
  await setBlank(page, 'swap', '"Aoife", 2');
  v = await run(page, []);
  check(/is-matched/.test(v), 'orders the right way round: it runs clean and the job is done', v);
  const tick = await page.evaluate(() => { const b = document.querySelector('.pyrun-card .pyrun-back'); return b ? b.className : ''; });
  check(/primary-btn/.test(tick), 'the way back to the hub is the primary button once the job is done', tick);

  /* ───────────── J3 machine-1: the meter ───────────── */
  console.log('\n-- j3-04 machine-1 (the bloat meter) --');
  await mount(page, J3, 'machine-1');
  await clickText(page, /Open the machine/);
  await sleep(300);
  const M = chunkOf(J3, 'machine-1').config.meter;
  const meter = await page.evaluate(() => Array.from(document.querySelectorAll('.fac-meter-row b')).map(b => b.textContent));
  check(meter.length === 2 && meter[0] === M.linesWord.replace('{n}', String(M.before.lines.length)) && meter[1] === M.linesWord.replace('{n}', String(M.after.lines.length)),
    'the meter\'s two counts are the two programs\' lengths (' + M.before.lines.length + ' / ' + M.after.lines.length + ')', JSON.stringify(meter));
  await setBlank(page, 'm1a', 'return');
  v = await run(page, []);
  check(/is-matched/.test(v), 'return in the gap: three signs, IT WORKS', v);

  /* ───────────── J3 machine-3: calls ───────────── */
  console.log('\n-- j3-04 machine-3 (the floor on an assembly card) --');
  await mount(page, J3, 'machine-3');
  await clickText(page, /Open the machine/);
  await sleep(300);
  await placeSi(page, 0); await placeSi(page, 1);
  await setBlank(page, 'm3a', 'seats'); await setBlank(page, 'm3b', 'x');
  v = await run(page, []);
  const bin = await text(page, '.fac-reject');
  check(/is-notyet/.test(v) && /NameError/.test(bin), 'a wrong slot name inside the machine: NameError per order in the reject bin, NOT YET', v + ' ' + bin.slice(0, 100));
  await setBlank(page, 'm3b', 'seats');
  v = await run(page, []);
  const prods = await page.evaluate(() => Array.from(document.querySelectorAll('.fac-order .fac-product')).map(x => x.textContent));
  check(/is-matched/.test(v) && JSON.stringify(prods) === '["8","20","4"]', 'the right machine: 8 / 20 / 4 on three product cards, IT WORKS', v + ' ' + JSON.stringify(prods));

  /* ───────────── J3 factory: spec, floor, chain ───────────── */
  console.log('\n-- j3-04 factory (spec card, the floor, the chain) --');
  await mount(page, J3, 'factory');
  await sleep(300);
  const S = chunkOf(J3, 'factory').config.spec;
  const specRows = await page.evaluate(() => document.querySelectorAll('.pye-plan .fac-spec tbody tr').length);
  check(specRows === S.rows.length && (await text(page, '.pye-plan .fac-spec-note')) === S.note, 'the PLAN face carries the whole spec card');
  await click(page, '.pye-start'); await sleep(300);
  check(await page.evaluate(() => document.querySelectorAll('.pye-bench .fac-spec tbody tr').length) === S.rows.length, 'the BENCH carries the compact spec');
  await click(page, '.pye-starter-btn');
  v = await run(page, []);
  const allNone = await text(page, '.fac-reject-all');
  check(/is-notyet/.test(v) && allNone.indexOf('None') !== -1, 'the empty starter: every product None collapses to one sentence naming return', allNone.slice(0, 100));
  const F = chunkOf(J3, 'factory').config.builds[0].features;
  await setEditor(page, F[0].reference + '\n' + F[1].reference + '\nprint(label("Aoife", 2))');
  v = await run(page, []);
  check(/is-matched/.test(v) && (await text(page, '.pyrun-vtag')) === chunkOf(J3, 'factory').config.matchedAllLabel && await page.evaluate(() => document.querySelectorAll('.fac').length === 2),
    'two correct machines: BOTH MACHINES WORK, two floors drawn', v);
  await page.evaluate(() => document.querySelector('.pyrun-verdict .primary-btn').click()); await sleep(300);
  check(await has(page, '.py-offer-card'), 'the verdict\'s Continue offers the chain');
  await clickText(page, /Build the chain/); await sleep(300);
  const chainCode = await page.evaluate(() => (document.querySelector('.pye-code') || {}).value || '');
  check(/def label/.test(chainCode) && /def cost/.test(chainCode), 'the chain starts from her saved factory (from: l4factory)');
  await setEditor(page, chainCode + '\ndef receipt(name, seats):\n    return label(name, seats) + " - " + str(cost(seats)) + " pounds"');
  v = await run(page, []);
  check(/is-matched/.test(v), 'the receipt machine matches on the chain\'s three orders', v);

  check(errs.length === 0, 'no page errors', errs.join(' | '));
  await page.close();

  console.log('\n-- CONTROL: the engine he sat on the same configs --');
  const old = await enginePage({ browser, ref: BASE_REF });
  await mount(old.page, J2, 'myroom');
  await sleep(300);
  const oldPlan = await old.page.evaluate(() => ({ words: !!document.querySelector('.pth-words'), publish: !!document.querySelector('.pth-publish'), plan: !!document.querySelector('.pye-plan') }));
  control(oldPlan.plan && !oldPlan.words && !oldPlan.publish, 'the pre-change engine draws the PLAN with no words box and no publish row', JSON.stringify(oldPlan));
  await mount(old.page, J2, 'training-3');
  await old.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Open the room/.test(x.textContent)); if (b) b.click(); });
  await sleep(300);
  control(!(await has(old.page, '.pyp-fixed')), 'the pre-change engine renders no fixed lines on training-3');
  await browser.close();
  console.log('');
  if (failures) { console.log('qa-l4-cards: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-l4-cards: ALL GREEN');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
