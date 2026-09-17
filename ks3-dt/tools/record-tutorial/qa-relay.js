#!/usr/bin/env node
/* qa-relay.js — THE CLASS ADVENTURE, PLAYED BY MACHINE (K44 / DFM 283 / spec §C8).
 *
 * Fable's relay-doors controls (L4_PROTOTYPES/probes/controls.html), VERBATIM
 * against `PyRun.relayDoors` as it lives in engines.js — then the `relay`
 * ENGINE mounted on j2-04's own chunk config with a fake room store, and
 * played to the end:
 *   · door resolution: a seeded play follows exactly the path
 *     `relayDoors.planPlay` predicts for the same seed (DFM 199)
 *   · the unvisited-room rule: five rooms, no room twice
 *   · the house rooms alone: with nothing published the adventure ends after
 *     three, and that play still earns (the solo route by birth)
 *   · a failing room's honest bubble: a published room whose program stops
 *     renders `brokenSay` and the play moves on
 *   · THE END card, and "Play again" is a fresh path
 *   · leave mid-play pays nothing, and asks first; leave after a whole play
 *     keeps the badge
 *   · every room starts a FRESH transcript (the scene is the first thing read)
 * CONTROL (DFM 196): the engine he sat has no `Engines.relay` and no
 * `PyRun.relayDoors`.
 *
 *   node qa-relay.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { enginePage } = require('./lib/l4-engine-page.js');
const BASE_REF = process.env.KS3DT_L4_BASE || '8f58434';
const SRC = process.env.KS3DT_SRC || path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const DRAFT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/L4_CONTENT_DRAFTS/j2-04.json');
const lessonFile = fs.existsSync(path.join(SRC, 'j2', 'lessons', 'j2-04.json')) ? path.join(SRC, 'j2', 'lessons', 'j2-04.json') : DRAFT;
const LESSON = JSON.parse(fs.readFileSync(lessonFile, 'utf8'));
const CHUNK = LESSON.chunks.find(c => c.engine === 'relay');
if (!CHUNK) { console.error('j2-04 has no relay chunk'); process.exit(2); }

let failures = 0;
const check = (ok, m, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m + (!ok && d ? '   [' + d + ']' : '')); if (!ok) failures++; };
const control = (ok, m, d) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m + (!ok && d ? '   [' + d + ']' : '')); if (!ok) failures++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the fake store: rooms 1..N with their server numbers, one of them broken */
const ROOMS = {
  1: 'print("You are in the gym. The lights hum.")\nchoice = input("Do you take the ball or the rope? Type ball or rope.")\nif choice == "ball":\n    print("You bounce it once.")\n    print("NEXT: door A")\nelse:\n    print("You climb three metres.")\n    print("NEXT: door B")',
  2: 'print("You are in the car park. One car is left.")\nchoice = input("Do you look inside or walk on? Type look or walk.")\nif choice == "look":\n    print("The keys are on the seat.")\n    print("NEXT: door A")\nelse:\n    print("You walk on. The car starts by itself.")\n    print("NEXT: door B")',
  3: 'print("You are on the stairs.")\nchoice = input("Up or down? Type up or down.")\nif choice == "up":\n    print("A door at the top is open.")\n    print("NEXT: door A")\nelse:\n    print(missing_name)\n    print("NEXT: door B")',
  4: 'print("You are in the ICT room. Every screen is on.")\nchoice = input("Sit or run? Type sit or run.")\nif choice == "sit":\n    print("The nearest screen says hello.")\n    print("NEXT: door A")\nelse:\n    print("You run. Every screen goes off.")\n    print("NEXT: door B")'
};

async function mount(page, opts) {
  return page.evaluate((a) => {
    window.__events = [];
    window.__badge = null;
    window.__nexts = 0;
    document.body.innerHTML = '<div id="host" class="chunk-host"></div>';
    const host = document.getElementById('host');
    const rooms = a.rooms;
    const ctx = {
      lesson: { id: 'j2-04', chunks: a.chunks },
      chunk: a.chunk,
      review: false, catchup: false, draft: {},
      call: function (verb, req) {
        if (a.serverDown) return Promise.reject(new Error('down'));
        if (verb === 'roomList') return Promise.resolve({ ok: true, rooms: Object.keys(rooms).map(n => ({ n: Number(n), h: 'h' + n })), count: Object.keys(rooms).length, mine: a.mine == null ? null : a.mine });
        if (verb === 'roomGet') return Promise.resolve(rooms[req.n] != null ? { ok: true, n: req.n, code: rooms[req.n] } : { ok: false, error: 'no-room' });
        return Promise.resolve({ ok: false, error: 'unknown-verb' });
      },
      saveEvent: function (e) { window.__events.push(e); return Promise.resolve(); },
      awardBadge: function (b, detail) { window.__badge = { badge: b, detail: detail }; return Promise.resolve(); },
      next: function () { window.__nexts++; }
    };
    if (a.seed != null) window.__relaySeed = a.seed; else delete window.__relaySeed;
    window.Engines.relay.mount(host, a.chunk, ctx);
    return true;
  }, opts);
}
async function clickText(page, rx) {
  return page.evaluate((r) => {
    const b = Array.from(document.querySelectorAll('button')).find(x => new RegExp(r, 'i').test(x.textContent || '') && x.offsetParent !== null && !x.disabled);
    if (b) { b.click(); return (b.textContent || '').trim(); }
    return null;
  }, rx.source);
}
/* answer the room's question when it asks; return the transcript the play showed */
async function playThrough(page, answers, maxMs) {
  const seen = [];
  const t0 = Date.now();
  let lastHead = '';
  while (Date.now() - t0 < (maxMs || 90000)) {
    const st = await page.evaluate(() => {
      const head = (document.querySelector('.rly-strip .rly-room') || {}).textContent || '';
      const end = !!document.querySelector('.rly-end');
      const ask = document.querySelector('.pyx-ask .pyx-reply');
      const rows = Array.from(document.querySelectorAll('.pyx-row')).map(r => r.className.replace('pyx-row ', '') + '|' + (r.querySelector('.pyx-text') || {}).textContent);
      return { head, end, ask: !!(ask && ask.offsetParent !== null), rows };
    });
    if (st.head && st.head !== lastHead) { lastHead = st.head; seen.push({ head: st.head, firstRow: st.rows[0] || '', rows: st.rows.slice() }); }
    else if (st.head && seen.length) { seen[seen.length - 1].rows = st.rows.slice(); }
    if (st.end) return { rooms: seen, ended: true };
    if (st.ask) {
      const word = answers.shift() || 'zzz';
      await page.evaluate((w) => {
        const inp = document.querySelector('.pyx-ask .pyx-reply');
        inp.value = w; inp.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.pyx-ask .pyx-send').click();
      }, word);
    }
    await sleep(250);
  }
  return { rooms: seen, ended: false };
}

(async () => {
  console.log('qa-relay — the class adventure, by machine\n');
  const { browser, page, errs } = await enginePage({});
  const W = CHUNK.config.words;

  /* ---- Fable's door controls, on the engine ---- */
  console.log('-- relay-doors (Fable\'s controls, verbatim) --');
  const doors = await page.evaluate(() => {
    const rooms = [{ n: 1, house: true }, { n: 2, house: true }, { n: 3, house: true }, { n: 7, mine: true }, { n: 12 }];
    const RD = window.PyRun.relayDoors;
    const path = RD.planPlay(rooms, 5, RD.seeded(4));
    const again = RD.planPlay(rooms, 5, RD.seeded(4));
    const three = RD.planPlay(rooms.slice(0, 3), 5, RD.seeded(1));
    const many = new Set(); for (let s = 1; s < 40; s++) many.add(RD.planPlay(rooms, 5, RD.seeded(s)).join(','));
    const after = RD.nextRoom({ visited: [1, 2, 3, 7, 12], limit: 5 }, rooms, RD.seeded(4));
    return { path, again, three: three.length, many: many.size, after };
  });
  check(doors.path.length === 5 && new Set(doors.path).size === 5, 'relay: five rooms, no room twice', JSON.stringify(doors.path));
  check(JSON.stringify(doors.again) === JSON.stringify(doors.path), 'relay: a seeded play is repeatable (DFM 199 — a pinnable shape)');
  check(doors.three === 3, 'relay: with only the three house rooms the adventure ends after three (the solo route)');
  check(doors.many > 10, 'relay: different seeds give different paths', doors.many + ' distinct of 39');
  check(doors.after === null, 'relay: after the limit, the next room is null (THE END)');

  /* ---- the ENGINE: a seeded play through the class pool ---- */
  console.log('\n-- the engine: a seeded play, five rooms --');
  const base = { chunks: LESSON.chunks, chunk: CHUNK, rooms: ROOMS, mine: 4, seed: 7 };
  await mount(page, base);
  await sleep(600);
  const countLine = await page.evaluate(() => (document.querySelector('.rly-count-line') || {}).textContent || '');
  check(countLine === W.roomsOpen.replace('{n}', '7'), 'the intro counts the pool: three house rooms + four published', countLine);
  const H = CHUNK.config.houseRooms.length;
  const expected = await page.evaluate((a) => {
    const RD = window.PyRun.relayDoors;
    const pool = a.house.map(n => ({ n })).concat(a.pub.map(n => ({ n: a.H + n })));
    return RD.planPlay(pool, 5, RD.seeded(a.seed));
  }, { house: CHUNK.config.houseRooms.map(r => r.n), pub: Object.keys(ROOMS).map(Number), H, seed: 7 });
  await clickText(page, /Start the adventure/);
  const play1 = await playThrough(page, ['trolley', 'ball', 'left', 'up', 'sit', 'lamp', 'look', 'run']);
  check(play1.ended, 'the play reaches THE END');
  const heads = play1.rooms.map(r => Number((r.head.match(/\d+/) || [0])[0]));
  check(JSON.stringify(heads) === JSON.stringify(expected), 'the rooms visited are exactly the seeded plan (door resolution is Fable\'s routine)', JSON.stringify(heads) + ' vs ' + JSON.stringify(expected));
  check(new Set(heads).size === 5, 'five distinct rooms — the unvisited-room rule');
  check(play1.rooms.every(r => /^is-note\|— /.test(r.firstRow)), 'every room starts a FRESH transcript: its heading is the first row she reads', JSON.stringify(play1.rooms.map(r => r.firstRow)));
  const mineHead = play1.rooms.find(r => Number((r.head.match(/\d+/) || [0])[0]) === H + 4);
  if (mineHead) check(mineHead.head === W.roomMine.replace('{n}', String(H + 4)), 'her own room is announced as hers, by number only', mineHead.head);
  else console.log('  ....  (her own room was not on this seeded path)');
  const doorRows = play1.rooms.map(r => r.rows.filter(x => /^is-door\|/.test(x)).length);
  check(doorRows.every(n => n >= 1) || play1.rooms.some(r => r.rows.some(x => x.indexOf(W.brokenSay.replace('{n}', '').trim().slice(0, 8)) !== -1)), 'a door line renders as the system line, never as story', JSON.stringify(doorRows));
  const endText = await page.evaluate(() => (document.querySelector('.rly-end') || {}).textContent || '');
  check(endText.indexOf(W.endKicker) !== -1 && endText.indexOf(W.endFirstSay) !== -1, 'THE END card carries the kicker and, on the first whole play, the badge line');
  const listed = await page.evaluate(() => Array.from(document.querySelectorAll('.rly-end .rly-room')).map(x => x.textContent));
  check(listed.length === 5, 'the END card lists the five rooms passed through', JSON.stringify(listed));

  /* the broken room (server n 3 → shown as H+3) — was it on the path? if not, force a path that includes it below */
  const broken = play1.rooms.find(r => Number((r.head.match(/\d+/) || [0])[0]) === H + 3);
  if (broken) check(broken.rows.some(x => x.indexOf(W.brokenSay.replace('{n}', String(H + 3))) !== -1), 'a room whose program stops renders the honest bubble and the play moves on', JSON.stringify(broken.rows));

  /* Play again → a fresh path (different seed → different rooms) */
  await page.evaluate(() => { window.__relaySeed = 11; });
  await clickText(page, /^Play again$/);
  const play2 = await playThrough(page, ['window', 'rope', 'right', 'down', 'run', 'desk', 'walk', 'sit']);
  const heads2 = play2.rooms.map(r => Number((r.head.match(/\d+/) || [0])[0]));
  check(play2.ended && JSON.stringify(heads2) !== JSON.stringify(heads), 'Play again is a fresh path', JSON.stringify(heads2));
  const endText2 = await page.evaluate(() => (document.querySelector('.rly-end') || {}).textContent || '');
  check(endText2.indexOf(W.endFirstSay) === -1, 'the badge line is said on the FIRST whole play only');
  await clickText(page, new RegExp('^' + W.finishLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  await sleep(300);
  const fin = await page.evaluate(() => ({ badge: window.__badge, events: window.__events, nexts: window.__nexts }));
  check(!!fin.badge && /classadventure=5\/5/.test(fin.badge.detail), 'Finish after a whole play awards the badge with classadventure=5/5', JSON.stringify(fin));

  /* ---- the broken room, on purpose: a pool of the three house rooms + the broken one ---- */
  console.log('\n-- a failing room --');
  await mount(page, Object.assign({}, base, { rooms: { 3: ROOMS[3] }, mine: null, seed: 3 }));
  await sleep(500);
  await clickText(page, /Start the adventure/);
  const play3 = await playThrough(page, ['down', 'trolley', 'left', 'lamp', 'down', 'down']);
  const br = play3.rooms.find(r => Number((r.head.match(/\d+/) || [0])[0]) === H + 3);
  check(play3.ended && !!br, 'the play with the broken room in the pool still reaches THE END', JSON.stringify(play3.rooms.map(r => r.head)));
  if (br) check(br.rows.some(x => x.indexOf(W.brokenSay.replace('{n}', String(H + 3))) !== -1), 'the broken room says so in the lesson\'s words (brokenSay) and the play moves on', JSON.stringify(br.rows));

  /* ---- the house rooms alone: the solo route ---- */
  console.log('\n-- the house rooms alone --');
  await mount(page, Object.assign({}, base, { rooms: {}, mine: null, seed: 2 }));
  await sleep(500);
  const count0 = await page.evaluate(() => (document.querySelector('.rly-count-line') || {}).textContent || '');
  check(count0 === W.roomsOpen.replace('{n}', String(H)), 'with nothing published the intro counts the house rooms only', count0);
  await clickText(page, /Start the adventure/);
  const play4 = await playThrough(page, ['trolley', 'left', 'lamp']);
  check(play4.ended && play4.rooms.length === H, 'three house rooms alone: the adventure ends after three', String(play4.rooms.length));
  const endText4 = await page.evaluate(() => (document.querySelector('.rly-end') || {}).textContent || '');
  check(endText4.indexOf(W.endFirstSay) !== -1, 'and that whole play earns (the solo route by birth)');
  await clickText(page, new RegExp('^' + W.finishLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  await sleep(300);
  const fin4 = await page.evaluate(() => window.__badge);
  check(!!fin4 && /classadventure=3\/5/.test(fin4.detail), 'the record says 3/5 and the badge is paid', JSON.stringify(fin4));

  /* ---- leaving mid-play pays nothing, and asks first ---- */
  console.log('\n-- leaving mid-play --');
  await mount(page, Object.assign({}, base, { seed: 5 }));
  await sleep(500);
  await clickText(page, /Start the adventure/);
  await sleep(1500);
  const leaveBtn = await clickText(page, new RegExp('^' + W.finishLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  await sleep(300);
  const ask = await page.evaluate(() => { const a = document.querySelector('.rly-leave-ask'); return a && !a.hidden ? a.textContent : ''; });
  check(!!leaveBtn && ask.indexOf(W.leaveTitle) !== -1 && ask.indexOf(W.leaveAsk.replace('{done}', '1').replace('{all}', '5')) !== -1, 'the way out asks first and says how far she has got', ask);
  await page.evaluate(() => document.querySelector('.rly-leave-no').click());
  await sleep(200);
  const stillOn = await page.evaluate(() => !!document.querySelector('.rly-card') && document.querySelector('.rly-leave-ask').hidden);
  check(stillOn, 'Keep going closes the ask and the play goes on');
  await clickText(page, new RegExp('^' + W.finishLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  await sleep(200);
  await clickText(page, /^Leave now$/);
  await sleep(300);
  const left = await page.evaluate(() => ({ badge: window.__badge, events: window.__events, nexts: window.__nexts }));
  check(!left.badge && left.events.length === 1 && left.events[0].xp === 0 && /classadventure=1\/5/.test(left.events[0].detail) && left.nexts === 1,
    'leaving mid-play pays nothing: no badge, an xp:0 event with the rooms played, and the lesson moves on', JSON.stringify(left));

  check(errs.length === 0, 'no page errors', errs.join(' | '));
  await page.close();

  console.log('\n-- CONTROL: the engine he sat has no class adventure --');
  const old = await enginePage({ browser, ref: BASE_REF });
  const has = await old.page.evaluate(() => ({ relay: typeof (window.Engines && Engines.relay), doors: typeof (window.PyRun && PyRun.relayDoors) }));
  control(has.relay === 'undefined' && has.doors === 'undefined', 'the pre-change engine (' + BASE_REF + ') has neither Engines.relay nor PyRun.relayDoors', JSON.stringify(has));
  await browser.close();
  console.log('');
  if (failures) { console.log('qa-relay: ' + failures + ' FAILURE(S)'); process.exit(1); }
  console.log('qa-relay: ALL GREEN');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
