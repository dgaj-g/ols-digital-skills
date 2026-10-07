/* The Rescue, the whole hour: THE TYPED TEST. Run: node hour-type-test.js
   It plays the hour after chapter 1 the way a pupil does, with real keys, at 1366 x 768, sound off,
   story speed 4. It covers acceptance tests A2 to A12, A14 and A15 of J3_L4_RESCUE_SPEC.md, and it runs
   the WORDS GATE (DFM 292) on every distinct screen it meets: no sentence over 14 words, no more than
   40 words of prose on a screen. Feedback lines, code and buttons are not prose. Answer options are.
   Every screen's prose is written to hour-screens.json for the cold readers. */
const R = __dirname + '/', fs = require('fs'), path = require('path');
const Q = '&mute&hspeed=4', PAGE = require(R + 'hour-walk.js').PAGE;

/* the sampler (what counts as prose, the limits) lives in hour-words.js, shared with hour-gates-test.js */
const WORDS = require(R + 'hour-words.js');

(async () => {
  /* THE LOOK (off unless asked): LOOK_DIR=<folder> LOOK_SIZE=1920x1080 node hour-type-test.js
     plays the same hour at that window size, takes a picture of every distinct screen and checks its layout:
     nothing off the window, no text cut off inside its box, no two panels on top of each other.
     A look run writes look.txt in that folder and does NOT rewrite hour-screens.json. */
  const LOOK = process.env.LOOK_DIR || '', LSIZE = (process.env.LOOK_SIZE || '1366x768').split('x').map(Number);
  const W = await require(R + 'hour-walk.js').open(LOOK ? { out: LOOK, size: LSIZE } : { out: R + 'typed-test-pictures' });
  const p = W.p, out = [], screens = new Map(), reqs = [], lookLines = [], lookJobs = [];
  let loadedAt = 0, lookN = 0;
  const GEOMETRY = () => {
    const VW = innerWidth, VH = innerHeight, bad = [], boxes = [];
    const BY_CLASS = ['hcap', 'hsay', 'hfn', 'hcard', 'hover', 'hprints', 'hlane', 'hwelcome', 'hnav', 'hlast', 'hstrip', 'hpaused', 'hbadge'];
    const FULL = ['hover', 'hwelcome', 'hpaused', 'hbadge'];
    BY_CLASS.concat(['hmenu', 'hpause']).forEach(id => {
      const e = document.getElementById(id); if (!e) return;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (BY_CLASS.includes(id) && !e.classList.contains('on')) return;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      boxes.push({ id, r });
      if (r.left < -1 || r.top < -1 || r.right > VW + 1 || r.bottom > VH + 1) bad.push(id + ' runs off the window: ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(','));
      /* the prototype's jump menu, when it is closed, has nothing showing inside it */
      if (id === 'hmenu' && !e.open) return;
      e.querySelectorAll('*').forEach(x => {
        const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden') return;
        const q = x.getBoundingClientRect(); if (!q.width || !q.height) return;
        const what = (x.id ? '#' + x.id : x.className ? '.' + String(x.className).split(' ')[0] : x.tagName.toLowerCase());
        if (x.tagName !== 'INPUT' && ((c.overflowX !== 'visible' && x.scrollWidth > x.clientWidth + 1) || (c.overflowY !== 'visible' && x.scrollHeight > x.clientHeight + 1)))
          bad.push(id + ' ' + what + ' cuts off its content: ' + x.scrollWidth + ' wide in ' + x.clientWidth + ', ' + x.scrollHeight + ' tall in ' + x.clientHeight);
        if (x.childElementCount === 0 && x.textContent.trim() && (q.left < -1 || q.right > VW + 1 || q.top < -1 || q.bottom > VH + 1))
          bad.push(id + ' ' + what + ' has text off the window: ' + x.textContent.trim().slice(0, 40));
      });
    });
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (FULL.includes(a.id) || FULL.includes(b.id)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 2 && h > 2) bad.push(a.id + ' and ' + b.id + ' overlap by ' + Math.round(w) + ' x ' + Math.round(h));
    }
    return { id: window.Hour && Hour.id, page: window.Hour && Hour.pageAt ? Hour.pageAt() : -1, bad };
  };
  const look = async c => {
    const n = String(++lookN).padStart(3, '0');
    await p.waitForTimeout(450);
    try {
      const g = await p.evaluate(GEOMETRY);
      const name = n + '-' + c.id + (c.page >= 0 ? '-p' + (c.page + 1) : '') + (g.id !== c.id ? '-moved' : '');
      await p.screenshot({ path: path.join(LOOK, name + '.png') });
      lookLines.push(name + (g.id !== c.id ? '   (the story had moved on to ' + g.id + ')' : '') + (g.bad.length ? '\n    ' + [...new Set(g.bad)].join('\n    ') : '   clean'));
    } catch (e) { lookLines.push(n + '-' + c.id + '   LOOK ERROR ' + String(e).slice(0, 120)); }
  };
  await p.exposeFunction('__screen', c => { const k = c.id + '#' + c.blocks.join(' | ') + '#' + c.fb.join(' | '); if (!screens.has(k)) { screens.set(k, c); if (LOOK) lookJobs.push(look(c)); } });
  await p.addInitScript(WORDS.SAMPLER);
  p.on('request', r => reqs.push({ url: r.url(), late: loadedAt ? Date.now() - loadedAt : 0 }));
  const must = (ok, what) => { W.must(!!ok, what); if (ok) out.push('  ok  ' + what); else out.push('  FAIL ' + what); };
  const head = t => out.push(t);
  const go = async q => { loadedAt = 0; await W.go(q + Q); loadedAt = Date.now(); };
  const fresh = q => go(q + '&hfresh');
  const ev = (fn, arg) => p.evaluate(fn, arg);
  const winched = (text, ms) => W.until(t => Hour.V.winch.lines.map(l => l.text).join(' ') === t, ms || 20000, text);
  const xOf = who => ev(w => Math.round(Hour.V.chars[w].x), who);
  const lines = () => ev(() => [...document.querySelectorAll('#hlines li')].map(x => x.textContent.trim()).filter(Boolean));
  const panel = () => ev(() => document.getElementById('hfnl').innerText.replace(/\n/g, ' / '));
  const runBtn = () => ev(() => { const b = document.getElementById('hrun'); return { on: b.classList.contains('on'), off: b.disabled }; });
  const next = async () => { await p.click('#hnext'); await W.sleep(160); };
  const nextOff = () => ev(() => document.getElementById('hnext').disabled);
  const pageText = () => ev(() => document.getElementById('hp').innerText.replace(/\n+/g, ' / '));
  const nextOn = () => W.until(() => !document.getElementById('hnext').disabled, 20000);
  /* his look, 6 Oct 2026: before her first loop, three pages remind her of lists and Lesson 3's loop. Once per pupil. */
  const toLoop = async () => {
    const seen = [];
    for (let i = 0; i < 3; i++) {
      must(await nextOn(), 'reminder page ' + (i + 1) + ' opens Next after its reading time');
      seen.push(await ev(() => ({ say: document.getElementById('hsay').textContent, fn: document.getElementById('hfnl').innerText, btn: document.getElementById('hnext').textContent })));
      await next(); await W.sleep(200);
    }
    must(/gang is a list/.test(seen[0].say) && /for song in playlist/.test(seen[1].fn) && /Try hard yourself first/.test(seen[2].say) && seen[2].btn === 'Write my loop', 'the three pages: the list, Lesson 3\'s loop, then Write my loop');
    must(await W.step('d_loop', 8000) && await ev(() => Hour.save.data.reminded === true), 'the reminder ends at her loop and is marked seen');
  };
  const orders = {};
  /* a closing question: tap every option, wrong ones first where we can tell. Next opens only on the right one. */
  async function question(tag) {
    const n = await p.$$eval('#hp .opts button', b => b.length);
    const order = await p.$$eval('#hp .opts button', b => b.map(x => x.textContent).join(' ; '));
    (orders[tag] = orders[tag] || []).push(order);
    must(n >= 3 && await nextOff(), tag + ': ' + n + ' options and Next is off before an answer');
    const fbs = []; let good = -1, rule = true;
    for (let i = 0; i < n; i++) {
      await p.click('#hp .opts button >> nth=' + i); await W.sleep(90);
      const f = await p.$eval('#hp .qfb', e => ({ t: e.textContent, good: e.classList.contains('good') }));
      fbs.push(f); if (f.good) good = i;
      if ((await nextOff()) !== (good < 0)) rule = false;
    }
    const wrong = fbs.filter(f => !f.good).map(f => f.t);
    must(good >= 0 && fbs.filter(f => f.good).length === 1, tag + ': exactly one option is right');
    must(rule, tag + ': Next opens only once the right option has been tapped');
    must(wrong.every(t => t.length > 8) && new Set(wrong).size === wrong.length, tag + ': each wrong option shows its own line');
  }
  /* his look, 6 Oct 2026: a badge card with its XP before each chapter's closing screens; Onward opens them. Once earned, never shown again. */
  const badge = async (name, xp) => {
    must(await W.until(() => document.getElementById('hbadge').classList.contains('on'), 5000), 'the badge card comes up: ' + name);
    const b = await ev(() => ({ name: document.getElementById('hbname').textContent, xp: document.getElementById('hbxp').textContent }));
    must(b.name === name && b.xp === '+' + xp + ' XP', 'the card names the badge and its XP: ' + b.name + ' ' + b.xp);
    must((await ev(() => window.__rescueSent.filter(t => t === 'badge').length)) >= 1, 'the badge is sent to the platform to record: ' + name);
    await p.click('#hbgo'); await W.sleep(300);
    must(!(await ev(() => document.getElementById('hbadge').classList.contains('on'))), 'Onward closes the card');
  };
  async function welcomeBack(tag, want) {
    loadedAt = 0; await p.goto(PAGE + '?mute&hspeed=4'); loadedAt = Date.now();
    const ok = await W.until(() => document.getElementById('hwelcome').classList.contains('on'), 6000);
    const msg = ok ? await p.$eval('#hwmsg', e => e.textContent) : '';
    must(ok && msg.indexOf(want) >= 0, tag + ': the Carry on card says "' + msg + '"');
    await W.sleep(250); await p.click('#hwgo'); await W.until(() => window.Hour && Hour.id, 5000); await W.sleep(350);
  }

  try {
  /* ================= A2. the join from chapter 1 ================= */
  head('A2. the join from chapter 1');
  await p.goto(PAGE + '?phase=end&of=win&mute'); await W.sleep(900);
  let s = await ev(() => { const b = document.getElementById('slow'), r = b.getBoundingClientRect(); return { win: document.body.classList.contains('h-win'), text: b.textContent, seen: r.width > 0 && getComputedStyle(b).display !== 'none' }; });
  must(s.win && s.seen && s.text === 'Watch the other ending', 'the fast typist is offered "Watch the other ending"');
  await p.click('#slow'); await W.sleep(300);
  must(await ev(() => __film.P.phase === 'fall' && __film.P.demo), 'that button plays the slow ending, which leads to Blink and the function');
  loadedAt = 0; await p.goto(PAGE + '?phase=end&mute&hfresh&hspeed=4'); loadedAt = Date.now();
  must(await W.until(() => window.Hour && Hour.id === 'filmA', 6000), 'from the safe ending the film of the ground starts');
  s = await ev(() => [...document.body.children].filter(e => !/^h/.test(e.id) && e.id !== 'snd' && !/CANVAS|SCRIPT|STYLE|LINK/.test(e.tagName)).filter(e => {
    const c = getComputedStyle(e), r = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.01 && r.width * r.height > 0; }).map(e => e.id || e.tagName));
  must(s.length === 0, 'no chapter 1 screen is left visible' + (s.length ? ': ' + s.join(', ') : ''));
  const ph = await ev(() => __film.P.phase);
  for (const k of ['0', 'r', '5', '1']) await p.keyboard.press(k);
  await W.sleep(200);
  must(await ev(a => __film.P.phase === a && Hour.id === 'filmA', ph), 'no chapter 1 key is still live');

  /* ================= the river ================= */
  head('A3. the river: make and call');
  must(await W.step('r_make', 60000), 'the film of the ground ends at the river');
  for (const l of ['def cross():', 'print("Billy")', 'print("pull")', 'print("tip")']) s = await W.type(l);
  must(await W.step('r_call1', 15000), 'four typed lines make cross');
  const b0 = await xOf('billy');
  await W.type('cross()');
  must(await winched('Billy pull tip'), 'the winch screen shows Billy, pull, tip');
  must(await W.step('r_bobby', 30000), 'Billy is carried over');
  const b1 = await xOf('billy'), bob0 = await xOf('bobby');
  must(Math.abs(b1 - b0) > 150, 'Billy is on the far bank (x ' + b0 + ' to ' + b1 + ')');

  head('A4. the river: the empty bucket');
  await W.type('cross()');
  must(await winched('Billy pull tip'), 'the winch calls Billy again, because Billy is written inside cross');
  must(await W.step('r_lesson', 40000), 'cross() is carried out as written');
  must(Math.abs((await xOf('bobby')) - bob0) < 5, 'Bobby is still on the near bank: the bucket crossed empty');

  head('A5. the river: Blink explains the gap, then the gap');
  /* his look, 6 Oct 2026: six short pages, each opening its Next after its reading time. Back works. */
  const says = [];
  for (let i = 0; i < 6; i++) {
    must(await nextOn(), 'gap page ' + (i + 1) + ' opens Next after its reading time');
    says.push((await W.st()).say);
    if (i === 1) { await p.click('#hback'); await W.sleep(200); must((await W.st()).say === says[0], 'Back returns to the first page'); await nextOn(); await next(); await W.sleep(200); await nextOn(); }
    await next(); await W.sleep(200);
  }
  must(/Look inside cross/.test(says[0]) && /I call the gap who/.test(says[3]) && /sends the name Bobby/.test(says[4]) && /carries Billy too/.test(says[5]), 'the six pages tell the gap: ' + says.map(x => x.split('.')[0]).join(' / '));
  must(await W.step('r_gap', 10000), 'Blink\'s lesson ends at the gap');
  s = await W.type('def cross():'); must(s.fbk.indexOf('bad') >= 0 && s.fb, 'the old def line is refused: ' + s.fb);
  s = await W.type('def cross(who)'); must(s.fbk.indexOf('bad') >= 0, 'no colon is refused: ' + s.fb);
  s = await W.type('def cross(who):'); must(s.fbk.indexOf('bad') < 0, 'def cross(who): passes');
  s = await W.type('print("who")'); must(s.fbk.indexOf('bad') >= 0, 'print("who") is refused: ' + s.fb);
  await W.type('print(who)');
  must(await W.step('r_call2', 15000), 'print(who) passes');
  await W.type('cross("Bobby")');
  must(await W.step('r_hogfilm', 40000), 'cross("Bobby") carries Bobby');
  must(Math.abs((await xOf('bobby')) - b1) < 220 && Math.abs((await xOf('bobby')) - bob0) > 150, 'Bobby is on the far bank beside Billy');

  head('A6. the river: the hedgehog, a right name in time');
  must(await W.step('r_hog', 40000), 'the squeak leads to the timed call');
  await W.asking(); await W.sleep(300);
  s = await ev(() => ({ sub: document.getElementById('hsub').textContent, label: document.getElementById('hgl').textContent, on: document.getElementById('hgauge').classList.contains('on') }));
  must(s.on && s.sub === 'The clock starts when you type.' && s.label === 'Time left before the river covers the rock', 'the gauge has its label and waits for her first key');
  await W.type('cross("Conker")', 30);
  must(await winched('Conker pull tip', 30000), 'the winch screen shows the name she chose: Conker, pull, tip');
  must(await W.step('r_close', 40000), 'the hedgehog crosses inside 35 seconds');
  must((await W.st()).name === 'Conker', 'her name for the hedgehog is kept');

  head('A9. the river: closing screens');
  await badge('Winch Hand', 12); s = await pageText(); must(/Conker/.test(s), 'the first closing screen uses her name');
  await next(); await next(); await question('river question');
  await next();

  /* ================= the lane ================= */
  head('A7. the lane');
  must(await W.step('l_make', 90000), 'the film and Blink lead to the lane');
  for (const l of ['def dash():', 'print("run")', 'print("run")']) await W.type(l);
  must(await W.step('l_plan', 15000), 'three typed lines make dash');
  for (let i = 0; i < 4; i++) await W.type('dash()');
  s = await runBtn(); must(s.on && s.off, 'with 4 calls the Run button cannot be pressed yet');
  await W.type('dash()');
  s = await runBtn(); must(s.on && !s.off, 'five calls give a Run button');
  await p.click('#hrun');
  must(await W.until(() => !!document.querySelector('#hprints .row span.bad'), 30000), 'the first run hits a fallen tree');
  s = await ev(() => { const a = [...document.querySelectorAll('#hprints .row span')]; return a.findIndex(x => x.classList.contains('bad')); });
  must(s === 5, 'the bonk is in the third dash, at printed word ' + (s + 1) + ' of 6');
  must(await W.step('l_mend', 90000), 'Blink\'s lesson ends at the mend');
  await W.asking(); await W.type('print("jump")');
  await p.click('#hrun');
  must(await W.until(() => [...document.querySelectorAll('#hprints .row span')].filter(x => x.textContent === 'jump').length === 3, 60000), 'the mended plan prints jump 3 times, once in each dash ahead');
  must(await W.step('l_close', 60000), 'print("jump") then Run reaches the gate');

  head('A9. the lane: closing screens');
  await badge('Lane Runner', 12); await next(); await question('lane question'); await next();

  /* ================= the door ================= */
  head('A8. the door: the right function and loop');
  must(await W.step('d_def', 90000), 'the film leads to the door');
  await W.type('def rescue(who):');
  must(await W.step('d_body', 10000), 'the def line passes');
  for (const l of ['print("open")', 'print(who)', 'print("shut")']) await W.type(l);
  await W.asking(); await W.sleep(200);
  must(await ev(() => { const b = document.getElementById('hrun'); return b.textContent.trim() === 'My function is finished' && !b.disabled; }), 'the button My function is finished is lit after her lines');
  await p.click('#hrun');
  must(await W.step('d_remind', 10000), 'the button My function is finished leads to the reminder of lists and loops');
  await toLoop();
  await W.type('for who in gang:'); await W.type('rescue(who)');
  await W.sleep(200); await p.click('#hrun');
  must(await W.step('d_run', 5000), 'Run starts her code');
  const dWin = await W.until(() => Hour.id === 'd_close' || Hour.id === 'd_fail', 40000);
  must(dWin && (await W.st()).id === 'd_close', 'the right function and loop finish inside 12 seconds');
  must(/Conker/.test(await ev(() => JSON.stringify(Hour.save.data.door || {}) + Hour.name())), 'her hedgehog is in the gang');

  head('A9. the door: closing screens');
  await badge('Door Keeper', 15); await next(); await question('door question'); await next();

  /* ================= the close ================= */
  head('A10. the close');
  must(await W.step('fire', 8000), 'the fire follows the door');
  must(await W.step('recap', 120000), 'the fire ends at the recap');
  await W.sleep(300);
  s = await ev(() => document.querySelectorAll('#hp .recrow').length); must(s === 4, 'the recap has four rows (' + s + ')');
  /* the story ends on the recap; Blink's 5 questions and How did it go? are the platform's own steps after it
     (qa-rescue-platform.js gates them on the lesson). Here: the recap's Next hands the lesson back to the platform. */
  await next(); await W.sleep(300);
  s = await ev(() => ({ sent: window.__rescueSent.slice(-1)[0], ended: !!Hour.save.data.ended }));
  must(s.sent === 'done' && s.ended, 'the recap\'s Next tells the platform the story is over (' + s.sent + ')');

  /* ================= fail paths ================= */
  head('A6. the river: the clock runs out');
  await fresh('h=r_hog'); await W.asking(); await W.sleep(1200);
  must((await W.st()).id === 'r_hog' && await ev(() => Hour.V.water) < 0.2, 'before her first key the river does not rise');
  await p.keyboard.type('c'); let t0 = Date.now();
  must(await W.step('r_fail', 15000), 'with no call typed the river covers the rock');
  let took = (Date.now() - t0) / 1000; must(took > 8.2 && took < 9.6, 'the 35 second clock took ' + (took * 4).toFixed(1) + ' story seconds');
  must(await W.until(() => Hour.V.scene === 'black' && !!Hour.V.owl, 8000), 'the fail ends at Blink\'s turned head');
  must(await W.step('r_hog', 20000), 'the storm rewinds to the same step'); await W.asking(); await W.sleep(300);
  s = await W.st(); must(s.help === 'You typed cross("Bobby") before. Put a new name in the speech marks.', 'the second attempt shows the help line: ' + s.help);
  must(await ev(() => Hour.save.fails.river) === 1, 'the fail is counted');
  await W.type('cross("Pip")'); must(await W.step('r_close', 40000), 'the second attempt succeeds');

  head('A4. the river: she thinks ahead');
  await fresh('h=r_bobby'); const bobA = await xOf('bobby');
  await W.type('cross("Bobby")');
  must(await W.until(() => /cannot take a name in its brackets yet/.test(document.getElementById('hfb').textContent), 4000), 'cross("Bobby") before the gap gets its own line: ' + (await W.st()).fb);
  must(await W.step('r_lesson', 30000) && Math.abs((await xOf('bobby')) - bobA) < 5, 'it is not carried out: Bobby has not moved, and the lesson starts');

  head('A7. the lane: the storm catches them');
  await fresh('h=l_mend'); await W.asking(); await W.sleep(1000);
  await p.keyboard.type('print("ju'); t0 = Date.now();
  must(await W.step('l_fail', 15000), 'waiting past 40 seconds fails');
  took = (Date.now() - t0) / 1000; must(took > 9.3 && took < 10.9, 'the 40 second clock took ' + (took * 4).toFixed(1) + ' story seconds');
  must(await W.until(() => Hour.V.scene === 'black' && !!Hour.V.owl, 8000), 'the fail ends at Blink\'s turned head');
  must(await W.step('l_mend', 20000), 'the storm rewinds to the same step'); await W.asking(); await W.sleep(300);
  s = await panel(); must(/def dash\(\):/.test(s) && (s.match(/dash\(\)/g) || []).length >= 6, 'her function and her 5 calls are still there');
  await W.type('print("jump")'); await p.click('#hrun');
  must(await W.step('l_close', 60000), 'the second attempt reaches the gate');

  head('A8. the door: each fail line comes from a real wrong program');
  const wrongs = [
    { tag: 'no shut', body: ['print("open")', 'print(who)'], use: ['for who in gang:', 'rescue(who)'], line: 'Everyone was inside, but the door was still open.', back: 'd_body' },
    { tag: 'who before open', body: ['print(who)', 'print("open")', 'print("shut")'], use: ['for who in gang:', 'rescue(who)'], line: 'The door was shut when Billy ran at it.', back: 'd_body' },
    { tag: 'two calls', body: ['print("open")', 'print(who)', 'print("shut")'], use: ['rescue("Billy")', 'rescue("Bobby")'], line: 'The door never asked for Spike, so Spike stayed outside.', back: 'd_loop' },
    { tag: 'a wrong name', body: ['print("open")', 'print(who)', 'print("shut")'], use: ['rescue("Billy")', 'rescue("Bobby")', 'rescue("Spik")'], line: 'The door asked for Spik. Nobody has that name.', back: 'd_loop' }];
  for (const w of wrongs) {
    await fresh('h=d_def'); await W.type('def rescue(who):'); await W.step('d_body', 8000);
    for (const l of w.body) await W.type(l);
    await W.asking(); await p.keyboard.press('Enter'); await W.step('d_remind', 8000); await toLoop();
    for (const l of w.use) s = await W.type(l);
    await W.sleep(200); await p.click('#hrun');
    const failed = await W.step('d_fail', 40000);
    must(failed && await W.until(() => Hour.V.scene === 'black' && !!Hour.V.owl, 12000), w.tag + ': the run fails and ends at Blink\'s turned head');
    must(await W.step(w.back, 30000), w.tag + ': she goes back to ' + (w.back === 'd_body' ? 'her function' : 'the code that uses it'));
    await W.sleep(500); s = await W.st();
    must(s.fb === w.line, w.tag + ': the line is "' + s.fb + '"');
    if (w.tag === 'no shut') {
      await welcomeBack('A11 door', 'chapter 4, the door');
      s = await W.st(); must(s.id === 'd_body' && s.fb === w.line, 'A11 door: she is back at her function with the same line');
    }
  }

  head('A8. the door: three failed runs in a row, then the right lines');
  await fresh('h=d_def'); await W.type('def rescue(who):'); await W.step('d_body', 8000);
  for (let n = 1; n <= 3; n++) {
    for (const l of ['print("open")', 'print(who)']) await W.type(l);
    await W.asking(); await p.keyboard.press('Enter'); if (n === 1) { await W.step('d_remind', 8000); await toLoop(); } else must(await W.step('d_loop', 8000), 'failed run ' + n + ': the reminder does not come a second time');
    if (n === 1) { await W.type('for who in gang:'); await W.type('rescue(who)'); }
    await W.sleep(250); await p.click('#hrun');
    await W.step('d_fail', 40000); await W.step('d_body', 40000); await W.asking(); await W.sleep(400);
    s = await W.st();
    if (n === 1) must(!s.help && /faded lines/.test(await ev(() => document.getElementById('hsub').textContent)), 'after one failed run her last lines are shown faded');
    if (n === 2) must(/Print the word open first/.test(s.help), 'after two failed runs Blink adds the order: ' + s.help);
    if (n === 3) must((await lines()).length === 3, 'after three failed runs the exact lines are shown: ' + (await lines()).join(' / '));
  }
  for (const l of ['print("open")', 'print(who)', 'print("shut")']) await W.type(l);
  await W.asking(); await p.keyboard.press('Enter'); await W.step('d_loop', 8000);
  await W.sleep(250); await p.click('#hrun');
  must(await W.step('d_close', 60000), 'her kept loop and the mended function get everyone inside');

  /* ================= her place ================= */
  head('A11. her place');
  await fresh('h=r_make'); await W.type('def cross():'); await W.type('print("Billy")');
  await welcomeBack('river', 'chapter 2, the river');
  s = await W.st(); const kept = await panel();
  must(s.id === 'r_make' && /def cross\(\):/.test(kept) && /print\("Billy"\)/.test(kept), 'river: her two typed lines are still there: ' + kept);
  await fresh('h=r_hog'); await W.type('cross("Conker")'); await W.step('r_close', 40000); await W.sleep(300);
  await welcomeBack('river end', 'chapter 2, the river');
  must((await W.st()).name === 'Conker' && /Conker/.test(await pageText()), 'the hedgehog\'s name is restored');
  await fresh('h=l_plan'); for (let i = 0; i < 3; i++) await W.type('dash()');
  await welcomeBack('lane', 'chapter 3, the lane');
  s = await ev(() => ({ id: Hour.id, sub: document.getElementById('hsub').textContent }));
  must(s.id === 'l_plan' && /^3 of 5 dashes/.test(s.sub), 'lane: her 3 calls are still in the plan: ' + s.sub);

  /* ================= the last minutes ================= */
  head('A12. the last minutes');
  await fresh('h=l_plan&hmin=47'); await W.asking(); await W.sleep(400);
  must(!(await ev(() => document.getElementById('hlast').classList.contains('on'))), 'at minute 47 there is no button');
  await fresh('h=l_plan&hmin=49'); await W.type('dash()'); await W.type('dash()'); await W.sleep(300);
  s = await ev(() => ({ on: document.getElementById('hlast').classList.contains('on'), t: document.getElementById('hlast').textContent }));
  must(s.on && /5 questions Blink asks at the end/.test(s.t), 'at minute 48 the button appears: ' + s.t);
  const before = await ev(() => Hour.id);
  await p.click('#hlast'); await W.sleep(200);
  s = await ev(() => ({ sent: window.__rescueSent.slice(-1)[0], step: Hour.save.step, d: Hour.save.data.dash }));
  must(s.sent === 'done' && s.step === before, 'the button hands her to the platform\'s 5 questions, with her place kept at ' + s.step);

  /* ================= A12: the pause button (his look, 6 Oct 2026) ================= */
  head('A12. the pause button');
  await fresh('h=d_def'); await W.asking(); await p.keyboard.type('def res', { delay: 0 });
  must(await ev(() => getComputedStyle(document.getElementById('hpause')).visibility === 'visible'), 'the pause button is on the page while she types');
  await p.click('#hpause'); await W.sleep(100);
  const pa = await ev(() => ({ paused: Hour.paused, t: Hour.t, on: document.getElementById('hpaused').classList.contains('on'), v: document.getElementById('hinp').value }));
  await p.keyboard.type('cue(who):', { delay: 0 }); await W.sleep(600);
  const pb = await ev(() => ({ paused: Hour.paused, t: Hour.t, id: Hour.id, v: document.getElementById('hinp').value, cur: document.querySelector('#hpaused p').textContent, focus: document.activeElement === document.getElementById('hpgo') }));
  must(pa.paused && pa.on && pb.paused && pb.t === pa.t && pb.id === 'd_def' && pb.v === 'def res' && pb.focus, 'paused: the curtain is up, the clock stands still, typed letters change nothing, Carry on holds the keys: "' + pb.cur + '"');
  /* Enter presses the Carry on button that holds the keys */
  await p.keyboard.press('Enter'); await W.sleep(300);
  const pc = await ev(() => ({ paused: Hour.paused, t: Hour.t, v: document.getElementById('hinp').value, focus: document.activeElement === document.getElementById('hinp') }));
  must(!pc.paused && pc.t > pb.t && pc.v === 'def res' && pc.focus, 'Enter is Carry on: the clock moves again, her half line is still in the box and the box has the keys');
  await p.keyboard.type('cue(who):', { delay: 0 }); await p.keyboard.press('Enter');
  must(await W.step('d_body', 8000), 'the finished line passes after the pause');
  /* chapter 1 pauses too: its own clock stands still. Its call screen has nothing to pause, so the pill shows from the film on. */
  loadedAt = 0; await p.goto(PAGE + '?phase=typing&clock=600&mute&hfresh'); loadedAt = Date.now();
  must(await W.until(() => window.__film && window.__film.P.rt > 1 && getComputedStyle(document.getElementById('hpause')).visibility === 'visible', 15000), 'chapter 1 is running and shows the pause button');
  await p.click('#hpause'); await W.sleep(100);
  const f1 = await ev(() => window.__film.P.rt); await W.sleep(500); const f2 = await ev(() => ({ rt: window.__film.P.rt, on: document.getElementById('hpaused').classList.contains('on') }));
  must(f2.on && f2.rt === f1, 'chapter 1 paused: its clock stands at ' + f1.toFixed(2) + ' seconds');
  await p.click('#hpgo');
  must(await W.until(x => window.__film.P.rt > x + 0.3, 3000, f1) && !(await ev(() => Hour.paused)), 'Carry on: chapter 1 runs again');

  /* ================= A14: size and network ================= */
  head('A14. size and network');
  const web = reqs.filter(r => /^https?:/.test(r.url) && new URL(r.url).host !== new URL(PAGE).host), late = reqs.filter(r => r.late > 1500);
  must(web.length === 0, 'nothing is asked of the internet (' + reqs.length + ' file requests in all)');
  must(late.length === 0, 'nothing is requested after the page has loaded' + (late.length ? ': ' + late.slice(0, 3).map(r => path.basename(r.url)).join(', ') : ''));
  const SHIP = path.join(R, '..', '..', 'platform', 'assets', 'rescue'), html = fs.readFileSync(path.join(SHIP, 'hour.html'), 'utf8'), files = new Set(['hour.html']);
  let m; const re = /(?:src|href)="(rescue\/[^"]+)"|url\("(rescue\/[^"]+)"\)/g; while ((m = re.exec(html))) files.add(m[1] || m[2]);
  let bytes = 0; files.forEach(f => { bytes += fs.statSync(path.join(SHIP, f)).size; });
  must(bytes < 1048576, 'the lesson is ' + files.size + ' files, ' + Math.round(bytes / 1024) + ' KB in all (limit 1024 KB)');

  /* ================= A15: sound off ================= */
  head('A15. sound off');
  must(await ev(() => Hour.OPT.mute === true), 'every step above was completed with the sound switched off');

  } catch (e) { W.fails++; out.push('STOPPED: ' + String(e).split('\n')[0]); try { out.push('state: ' + JSON.stringify(await W.st())); await W.shot('stopped'); } catch (e2) {} }

  /* ================= the words gate ================= */
  head('WORDS GATE (DFM 292) on every screen met');
  const all = [...screens.values()], over = all.filter(WORDS.over);
  const worstT = all.reduce((a, c) => c.total > a.total ? c : a, { total: 0 }), worstS = all.reduce((a, c) => c.longest > a.longest ? c : a, { longest: 0 });
  const steps = new Set(all.map(c => c.id));
  must(all.length > 60, all.length + ' distinct screens were counted, across ' + steps.size + ' steps');
  must(over.length === 0, 'no screen is over 40 words of prose, no sentence is over 14 words, and prose with feedback is never over 60');
  const worstA = all.reduce((a, c) => WORDS.allWords(c) > WORDS.allWords(a) ? c : a, { total: 0, fb: [] });
  out.push('  most words with feedback: ' + WORDS.allWords(worstA) + ' (' + worstA.id + ')');
  const bare = WORDS.bareNumbers([].concat(...all.map(c => c.blocks.concat(c.fb))));
  must(bare.length === 0, 'no sentence ends on a number without its thing' + (bare.length ? ': ' + [...new Set(bare)].slice(0, 4).join(' | ') : ''));
  out.push('  most words on one screen: ' + worstT.total + ' (' + worstT.id + (worstT.page >= 0 ? ', closing screen ' + (worstT.page + 1) : '') + ')');
  out.push('  longest sentence: ' + worstS.longest + ' words: "' + worstS.longText + '" (' + worstS.id + ')');
  over.forEach(c => out.push('  OVER  ' + c.id + (c.page >= 0 ? ' page ' + (c.page + 1) : '') + ': ' + c.total + ' words (' + WORDS.allWords(c) + ' with feedback), longest ' + c.longest + ': "' + c.longText + '" || ' + c.blocks.join(' | ')));
  if (LOOK) { await Promise.all(lookJobs); fs.writeFileSync(path.join(LOOK, 'look.txt'), 'THE LOOK at ' + LSIZE.join(' x ') + ': ' + lookN + ' screens\n' + lookLines.sort().join('\n') + '\n'); }
  else fs.writeFileSync(R + 'hour-screens.json', JSON.stringify(all.map(c => ({ step: c.id, page: c.page, words: c.total, longest: c.longest, prose: c.blocks, feedback: c.fb, x: c.x })), null, 1));

  console.log(out.join('\n'));
  console.log(W.checks + ' checks, ' + W.fails + ' failed. ' + (W.errs.length ? 'PAGE ERRORS: ' + W.errs.join(' | ') : 'No page errors.'));
  console.log(W.fails || W.errs.length ? 'NOT PASSED' : 'ALL PASS');
  await W.close();
})();
