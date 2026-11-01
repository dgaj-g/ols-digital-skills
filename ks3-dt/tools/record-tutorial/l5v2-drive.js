/* J3 L5 V2 SAME LIGHT · the hour driver, shared by l5v2-walk.js (the bare hour page, puppeteer) and qa-l5-paired.js
   (the platform's frames, playwright). pages = {seat: page-like}: evaluate(fn, arg), click(sel), waitForSelector(sel,
   {visible, timeout}), screenshot({path}), reload(), goto(), url(), $(sel). Drives from the sound check to Home.
   o = {SEATS, PATH, RELOAD, CONTROL, MODE, W, SHOTS, fails, log, sleep}. Returns the timings. */
const path = require('path');
const FIX = {
  S1: s => s.replace(/lampp_on\(\)|lamp_oon\(\)/, 'lamp_on()'),
  S2: s => s.replace('" + beam)', '" + str(beam))'),
  S3: s => s.replace(/\nprint\(name/, '\n    print(name'),
  Q1: s => s.includes('b = bearing()') ? s.replace('b = bearing()', 'fog_horn()\nb = bearing()') : s + '\nfog_horn()',
  Q2: s => s.replace('    print("Bearing " + str(channel))', '    print("Bearing " + str(channel))\n    return channel'),
  Q3: s => s.includes('fog_horn()\nb') ? s.replace('fog_horn()\nb', 'lamp_on()\nfog_horn()\nb') : s.replace('b = bearing()', 'lamp_on()\nb = bearing()')
};

async function drive(pages, o) {
  const { SEATS, PATH, RELOAD, CONTROL, MODE, W, SHOTS, fails, log, sleep } = o;
  const st = async (s = SEATS[0]) => pages[s].evaluate(() => { const x = SameLightDebug.state(); const f = x.ch && x.ch.fault; return { phase: x.phase, stage: x.local[SameLightDebug.seat].stage, now: x.now, coins: x.coins, fixed: x.fixedCount, badges: x.badges, paused: x.paused, bay: x.bay,
    f: f ? { no: f.no, id: f.id, kind: f.kind, step: f.step, right: f.right, fixer: f.fixerNow, readers: f.readersNow, picks: f.picks, src: f.src, runAt: f.runAt, fixedAt: f.fixedAt, helpShown: f.helpShown, lookoutShown: f.lookoutShown, lookout: f.lookout, awake: f.awake, name: f.name, boat: f.boat, wrongAgreed: f.wrongAgreed, stepAt: f.stepAt } : null }; });
  const until = async (fn, what, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { const x = await st(); if (await fn(x)) return x; await sleep(80); } throw new Error('timeout waiting for ' + what + ' · ' + JSON.stringify(await st()).slice(0, 300)); };
  const click = async (s, sel, ms = 8000) => { const p = pages[s]; await p.waitForSelector(sel, { timeout: ms, visible: true }); await p.click(sel); };
  let shotN = 0;
  const shot = async (tag) => { if (!SHOTS) return; for (const s of SEATS) await pages[s].screenshot({ path: path.join(process.env.SHOTDIR || '/tmp',  `${SHOTS}-${String(++shotN).padStart(2, '0')}-${tag}-${s}.png`) }); };
  const clear = async (s) => { const end = Date.now() + 8000; while (Date.now() < end) { if (!(await pages[s].evaluate(() => document.getElementById('card').classList.contains('show')))) return; await sleep(50); } };
  const text = async (s, sel) => pages[s].evaluate(sel => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; }, sel);
  const jobs = async () => { const o = {}; for (const s of SEATS) o[s] = await text(s, '#job'); return o; };


  const a12 = async () => { const j = await jobs(); for (const s of SEATS) if (!j[s] && !(await pages[s].evaluate(() => document.getElementById('app').classList.contains('hide') && /\S/.test((document.querySelector('#page .pg') || {}).textContent || '')))) { const x = await st(s); fails.push(`FAIL A12 ${W}px ${MODE} seat ${s}: empty job line at ${x.phase} ${x.f ? 'f' + x.f.no + ' ' + x.f.step : ''}`); } };
  const snap = async (s) => pages[s].evaluate(() => { const x = SameLightDebug.state(), f = x.ch && x.ch.fault; return JSON.stringify({ phase: x.phase, stage: x.local[SameLightDebug.seat].stage, no: f && f.no, step: f && f.step, coins: x.coins, src: f && f.src, seat: SameLightDebug.seat, room: new URLSearchParams(location.search).get('room') }); });
  let reloads = 0;
  const a13 = async (s, where) => {
    await sleep(300); const before = await snap(s);
    // the control: the reload loses the room (a fresh room name), as a page that restarted the chapter would
    if (CONTROL) await pages[s].goto(pages[s].url().replace(/room=([A-Z0-9]+)/, 'room=$1Z'), { waitUntil: 'load' });
    else await pages[s].reload({ waitUntil: 'load' }); reloads++;
    await pages[s].waitForFunction(() => window.SameLightDebug && SameLightDebug.state().phase, { timeout: 10000 }).catch(() => {});
    await sleep(600);
    // a reload may ask for the sound again (the browser needs a click); that is the same place, not a restart
    for (const a of ['horn', 'yes']) { const b = await pages[s].$('button[data-act="' + a + '"]'); if (b && await b.isIntersectingViewport()) { await b.click(); await sleep(150); } }
    await sleep(400); let after; try { after = await snap(s); } catch (e) { after = 'no state: ' + e.message; }
    if (after !== before) fails.push(`FAIL A13 ${W}px ${MODE} seat ${s} reload at ${where}: before ${before.slice(0, 160)} · after ${String(after).slice(0, 160)}`);
    else log('  reload ok', s, where);
    if (CONTROL) { fails.forEach(f => console.log(f)); console.log(`A13 (CONTROL) · ${fails.length ? 'RED ' + fails.length : 'PASS'}`); process.exit(fails.length ? 1 : 0); }
    const vis = await pages[s].evaluate(() => !document.getElementById('app').classList.contains('hide') || document.querySelector('#page.show') != null);
    if (!vis) fails.push(`FAIL A13 ${W}px ${MODE} seat ${s} reload at ${where}: blank screen`);
  };
  // ---- the local pages, all seats together
  await Promise.all(SEATS.map(async s => {
    if (!o.soundDone) { await click(s, 'button[data-act="horn"]'); await click(s, 'button[data-act="yes"]'); } // the platform gate pairs before the hour, so it has done the sound already
    await click(s, 'button[data-act="pair"]', 10000);
    await click(s, 'button[data-act="cold"]', 10000);
    for (let i = 0; i < 4; i++) { await click(s, '#tcard button'); await sleep(60); }
    await click(s, '.prog.ask .ln[data-n="' + (PATH === 'wrong' ? 1 : 4) + '"]');
    if (PATH === 'wrong') { log('r1 verdict', s, await text(s, '.verdict')); }
    await click(s, 'button[data-act="r1"]');
  }));
  await shot('r1-done'); if (RELOAD) await a13(SEATS[0], 'pre1 done');
  log('pre1 done', JSON.stringify(await st()).slice(0, 120));
  const watch = async (id) => {
    // a slow driver (three frames on the platform) can land after a fast-clock example has already ended
    const ORDER = ['pre1', 'w1', 'ch1', 'pre2', 'w2', 'ch2', 'pre3', 'w3', 'ch3', 'ch4', 'home'];
    const at = await until(x => ORDER.indexOf(x.phase) >= ORDER.indexOf(id), 'phase ' + id);
    if (at.phase !== id) { log('  ' + id + ' over before the driver looked'); return; }
    await shot(id); log('watching', id);
    if (PATH !== 'fast') await sleep(1000); // let the first beats show
    // at a fast clock the example (34 s / t) can end by itself before Skip lands: either way the hour moves on
    try { await Promise.all(SEATS.map(s => click(s, 'button[data-act="skip"]', 3000))); } catch (e) { log('  ' + id + ' ended by itself'); }
    await until(x => x.phase !== id, 'end of ' + id);
  };
  await watch('w1');
  const timings = [];
  const chapter = async (id) => {
    await until(x => x.phase === id, 'phase ' + id);
    log('chapter', id);
    if (o.onChapter) await o.onChapter(id, st); // the platform gate's hook: a pupil reloads or leaves here
    let guard = 0, lastKey = '', lastStep = '';
    while (guard++ < 400) {
      const x = await st();
      if (x.phase !== id) break;
      const f = x.f; if (!f) { await sleep(100); continue; }
      const key = f.no + f.step + (f.picks ? JSON.stringify(f.picks) : '') + f.helpShown + (f.lookout && f.lookout.answered) + !!f.name;
      if (key !== lastKey) { await a12(); if (RELOAD && f.step !== lastStep) { lastStep = f.step; await a13(f.step === 'run' || f.step === 'point' ? (f.readers[0] || f.fixer) : f.fixer, id + ' f' + f.no + ' ' + f.step); continue; } log(id, 'fault', f.no, f.id, f.kind, 'step', f.step, 'fixer', f.fixer, 'right', f.right, JSON.stringify(await jobs())); lastKey = key; }
      const reader = f.readers[0] || f.fixer, fixer = f.fixer;
      if (f.step === 'run') {
        if (lastKey.indexOf('run-shot') < 0) { await shot(id + '-f' + f.no + '-run'); lastKey += 'run-shot'; }
        const who = SEATS.length > 1 ? reader : fixer;
        await clear(who); const ok = await pages[who].evaluate(() => !document.getElementById('run').disabled);
        if (ok) { await pages[who].click('#run'); await until(y => y.f && y.f.step !== 'run', 'point'); await shot(id + '-f' + f.no + '-point'); }
        else await sleep(100);
      } else if (f.step === 'point') {
        if (PATH === 'wrong' && !f.wrongAgreed && Object.keys(f.picks).length === 0) {
          const wrong = f.right === 1 ? 2 : 1;
          for (const s of SEATS) { if ((await st()).f.step !== 'point') break; await pages[s].click('#view .ln[data-n="' + wrong + '"]'); }
          await until(y => y.f && y.f.wrongAgreed, 'wrong agreement');
          await shot(id + '-f' + f.no + '-wrong'); log('  wrong agreed', JSON.stringify(await jobs()));
          if (f.no === 1) { await pages[reader].click('#helpbtn'); await until(y => y.f && y.f.helpShown >= 1, 'help 1'); await shot(id + '-f' + f.no + '-help'); log('  help', await text(reader, '#help')); }
        }
        for (const s of SEATS) await clear(s);
        // a trio agrees on any two clicks, so stop clicking once the step has moved on
        const order = PATH === 'fast' ? [fixer].concat(SEATS.filter(s => s !== fixer)) : SEATS;
        for (const s of order) { if ((await st()).f.step !== 'point') break; const ln = '#view .ln[data-n="' + f.right + '"]';
          // on the live link one seat's screen can already have moved on (or not yet arrived): skip it, the loop comes back
          if (!(await pages[s].evaluate(q => { const e = document.querySelector(q); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility === 'visible'; }, ln))) { log('  point: seat ' + s + ' not showing the line yet'); continue; }
          try { await pages[s].click(ln, { timeout: 3000 }); } catch (e) { log('point: seat ' + s + ' click missed (' + String(e.message).slice(0, 60) + ')'); continue; } await sleep(PATH === 'wrong' ? 300 : 0); if (s === order[0] && SEATS.length > 1) log('  one picked', JSON.stringify(await jobs())); }
        await until(y => y.f && (y.f.step === 'fix' || y.f.no !== f.no), 'fix');
        await shot(id + '-f' + f.no + '-fix');
      } else if (f.step === 'fix') {
        if (PATH === 'wrong' && f.no === 2 && SEATS.length > 1) {
          // the reader waits for the lookout question, answers it wrong, then right next time
          if (!f.lookoutShown) { await sleep(100); continue; }
          if (!f.lookout.answered) { await shot(id + '-f' + f.no + '-lookout'); const want = await pages[reader].evaluate(() => { const L = SameLight.LOOK[SameLightDebug.state().ch.id]; return L; }); log('  lookout', await text(reader, '#look')); await pages[reader].click('#view .ln[data-n="1"]'); await until(y => y.f.lookout.answered, 'lookout answered'); log('  lookout answered', await text(reader, '#look')); await shot(id + '-f' + f.no + '-lookout-answered'); }
        }
        if (PATH === 'wrong' && f.no === 3 && SEATS.length > 1 && !f.awake) { await sleep(100); if (await (async () => (await st()).f.awake)()) continue; else continue; }
        const src = FIX[f.id](f.src);
        if (src === f.src) throw new Error('no fix rule changed the source for ' + f.id);
        const who = (PATH === 'wrong' && f.no === 3 && SEATS.length > 1) ? reader : fixer;
        if (PATH === 'wrong' && f.no === 1) { // a wrong fix first: run unchanged
          await pages[who].click('#run'); await sleep(200); log('  still red', JSON.stringify(await jobs())); await shot(id + '-f' + f.no + '-stillred');
        }
        await pages[who].evaluate(src => { const e = document.getElementById('ed'); e.focus(); e.value = src; e.dispatchEvent(new Event('input')); }, src);
        await sleep(250);
        if (PATH === 'wrong') log('  typing', JSON.stringify(await (async () => { const o = {}; for (const s of SEATS) o[s] = await text(s, '#partner'); return o; })()));
        await pages[who].click('#run');
        await until(y => y.f && (y.f.step === 'name' || y.f.step === 'swap' || y.f.no !== f.no) || y.phase !== id, 'name');
        const y = await st(); if (y.f) timings.push({ ch: id, no: f.no, id: f.id, secs: Math.round((y.f.fixedAt - y.f.runAt) / 1000) });
        await sleep(200); await shot(id + '-f' + f.no + '-clean'); log('  clean', JSON.stringify(await jobs()), 'bay', JSON.stringify(y.bay));
      } else if (f.step === 'name') {
        if (f.name) { await sleep(60); continue; }
        if (x.now < f.stepAt + 2300) { await sleep(50); continue; }
        await clear(reader); const who = SEATS.length > 1 ? reader : fixer, card = PATH === 'wrong' ? (f.kind === 'red' ? 'silent' : 'red') : f.kind;
        await pages[who].click('.fcard.pick[data-card="' + card + '"]');
        await until(y => !y.f || y.f.no !== f.no || y.f.name, 'named'); await shot(id + '-f' + f.no + '-named'); log('  named', card, JSON.stringify(await jobs()), 'coins', (await st()).coins);
        await until(y => !y.f || y.f.no !== f.no || y.phase !== id || y.f.step === 'swap', 'swap');
        await sleep(100); await shot(id + '-f' + f.no + '-swap'); log('  swap card', await text(SEATS[0], '#card.show .big'), '|', SEATS[1] ? await text(SEATS[1], '#card.show .big') : '');
      } else await sleep(80);
    }
    log('chapter', id, 'over', JSON.stringify((await st()).badges));
  };
  await chapter('ch1');
  await until(x => x.phase === 'pre2', 'pre2'); await shot('r2'); if (RELOAD) await a13(SEATS[SEATS.length - 1], 'pre2');
  await Promise.all(SEATS.map(async s => { await click(s, 'button[data-opt="r2.opt.' + (PATH === 'wrong' ? 2 : 1) + '"]'); await click(s, 'button[data-act="r2"]'); }));
  await watch('w2'); await chapter('ch2');
  await until(x => x.phase === 'pre3', 'pre3'); await shot('t3'); if (RELOAD) await a13(SEATS[0], 'pre3');
  await Promise.all(SEATS.map(async s => { await click(s, 'button[data-act="t3next"]'); await click(s, 'button[data-opt="t3.opt.1"]'); await click(s, 'button[data-act="t3"]'); }));
  await watch('w3'); await chapter('ch3'); await chapter('ch4');
  await until(x => x.phase === 'home', 'home'); await shot('home'); if (RELOAD) { await a13(SEATS[0], 'home'); await a12(); }
  return { timings, reloads };
}
module.exports = { drive, FIX };
