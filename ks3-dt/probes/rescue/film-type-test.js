/* Real keys into the real box, all the way through: the long way, the function, the call, the three closing screens.
   Every must-fail control is typed and must fail. Every screen is counted against the words gate:
   no sentence over 14 words, no more than 40 words of prose on a screen. Feedback lines, code and buttons are not prose. */
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } }); p.setDefaultTimeout(6000);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const url = q => require('./hour-walk.js').ART + '?mute=1&' + q;
  const out = []; let fails = 0;
  const must = (c, m) => { if (!c) { fails++; out.push('FAIL: ' + m); } else out.push('  ok  ' + m); };
  const st = () => p.evaluate(() => {
    const P = __film.P, g = id => document.getElementById(id), shown = e => { const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.5; };
    return { phase: P.phase, mode: __film.mode(), lines: P.lines, rungs: +P.rungs.toFixed(2), latch: +P.latch.toFixed(2), defn: P.defn, typed2: P.typed2, why: P.why, round: P.round, xt: P.xt, lt: P.lt, done2: P.done2, again: P.again, demo: P.demo, typed1: P.typed1, first3: P.first3,
      fb: g('fb').textContent, cls: g('fb').className, ck: g('ck').textContent, ch: g('ch').textContent, cnt: g('cnt').textContent, pr: g('pr').textContent, val: g('inp').value, clock: P.clockOn, focus: document.activeElement && document.activeElement.id,
      sign: P.sign.map(e => e.text).join(' '), say: shown(g('speech')) ? g('say').textContent : '', cap: shown(g('cap')) ? g('cap').textContent : '', l2: g('l2').textContent, next: shown(g('next')), back: shown(g('back')), fn: shown(g('fn')),
      w1a: g('w1a').textContent, w1b: g('w1b').textContent, hers: g('w1long').querySelectorAll('.hers').length, calls: g('w1calls').children.length, w3fb: g('w3fb').textContent, w3seen: g('w3seen').textContent, tbw: parseFloat(g('tb').style.width) || 0, tbt: g('tb').style.transform || '', barh: g('tb').parentElement.getBoundingClientRect().height, tbh: g('tb').getBoundingClientRect().height, endmsg: g('endmsg').textContent, lesson: shown(g('lesson')), slow: shown(g('slow')) };
  });
  /* a page load from this synced folder stalls now and then: try again before failing */
  const load = async (u) => { for (let i = 0; ; i++) { try { await p.goto(u, { timeout: 15000 }); return; } catch (e) { if (i >= 3) throw e; } } };
  const type = async (t, wait) => { await p.keyboard.type(t); await p.keyboard.press('Enter'); await p.waitForTimeout(wait || 130); return st(); };
  const until = async (fn, ms, arg) => { try { await p.waitForFunction(fn, arg, { timeout: ms || 9000 }); return true; } catch (e) { return false; } };
  const gate = async (label) => {
    const w = await p.evaluate(() => {
      const vis = e => { for (let n = e; n && n !== document.documentElement; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; } const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const count = t => t.trim().split(/\s+/).filter(Boolean).length;
      const els = [...document.querySelectorAll('#cap, #l1, #l2, #speech .who, #say, #p32 .k, #fn .k, #ck, #ch, #hint, #card .tl, #cnt, .wp h2, .col .k, .sum, .pin, .defn, .seen, .opt, #endmsg')].filter(vis);
      const texts = els.map(e => e.textContent.trim()).filter(Boolean), sent = [];
      texts.forEach(t => t.split(/(?<=[.!?])\s+/).forEach(x => sent.push(count(x))));
      return { total: texts.reduce((a, t) => a + count(t), 0), longest: Math.max(0, ...sent), n: texts.length };
    });
    must(w.total <= 40 && w.longest <= 14 && w.n > 0, 'words gate, ' + label + ': ' + w.total + ' words, longest sentence ' + w.longest);
  };
  let s;
  try {

  /* ---------- A. the long way ---------- */
  out.push('A. the long way');
  await load(url('phase=typing&clock=600')); await p.waitForTimeout(700);
  s = await st(); must(s.focus === 'inp' && s.mode === 'long', 'the box has the cursor at the start'); must(!s.clock, 'the clock has not started before a key');
  must(s.ck === 'RUNG 1 OF 8' && s.ch === 'Type these 4 lines to push the ladder up 1 rung.', 'the card names the rung and the job');
  s = await type('print("push")'); must(s.lines === 0 && /needs the word unlock/.test(s.fb), 'a line out of order does not count and names the word'); must(s.clock, 'the clock starts at her first key');
  s = await type('Print("unlock")'); must(s.lines === 0 && /print in small letters/.test(s.fb), 'a capital P does not count');
  s = await type('print(unlock)'); must(s.lines === 0 && /speech marks round it/.test(s.fb), 'no speech marks does not count');
  s = await type('print("unlock)'); must(s.lines === 0 && /speech marks on both sides/.test(s.fb), 'one speech mark does not count');
  s = await type('print "unlock"'); must(s.lines === 0 && /brackets round the word/.test(s.fb), 'no brackets does not count');
  s = await type('print("unlock"'); must(s.lines === 0 && /closing bracket/.test(s.fb), 'no closing bracket does not count');
  s = await type('unlock()'); must(s.lines === 0 && /next line to type is print\("unlock"\)/.test(s.fb), 'the old function-style line does not count');
  s = await type('rung()'); must(s.lines === 0, 'rung() does nothing before the function exists');
  await p.keyboard.press('Enter'); s = await st(); must(s.lines === 0, 'an empty line is ignored');
  s = await type(" print ( 'unlock' ) ", 300); must(s.lines === 1 && s.latch > 0.5 && s.sign === 'unlock', 'the line counts with spaces and single speech marks, the latch opens, the lift screen shows unlock');
  s = await type('print(“push”)', 700); must(s.lines === 2 && s.rungs === 1 && s.sign === 'unlock push', 'curly speech marks are read, push lifts the ladder one rung');
  s = await type('print("check")'); must(s.lines === 2 && /needs the word lock/.test(s.fb), 'check before lock does not count');
  s = await type('print("lock")', 300); must(s.lines === 3 && s.latch < 0.5, 'lock closes the latch');
  s = await type('print("check")', 200); must(s.lines === 4 && s.ck === 'RUNG 2 OF 8' && /Rung 1 is done. Now the same 4 lines again for rung 2\./.test(s.fb) && s.cnt === 'You have typed 4 of the 32 lines.', 'rung 1 done, the card moves to rung 2 and counts 4 of the 32 lines');
  must(s.tbw > 5 && s.tbw < 100 && s.tbt === '' && s.tbh > 4 && s.tbh < s.barh, 'the timer is a gauge: the fill gets shorter inside its own outline and is never squashed: ' + s.tbw + '% wide, ' + s.tbh.toFixed(1) + ' of ' + s.barh.toFixed(1) + ' px');
  await p.evaluate(() => { const e = new ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true }); e.clipboardData.setData('text/plain', 'print("unlock")'); window.__pasteBlocked = !document.getElementById('inp').dispatchEvent(e); });
  must(await p.evaluate(() => window.__pasteBlocked), 'paste is blocked');
  const guard = await p.evaluate(() => { const i = document.getElementById('inp');
    const drop = !i.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));
    const ins = t => !i.dispatchEvent(new InputEvent('beforeinput', { inputType: t, data: 'print("unlock")', bubbles: true, cancelable: true }));
    return { drop, paste: ins('insertFromPaste'), dropIn: ins('insertFromDrop'), swap: ins('insertReplacementText'), typed: ins('insertText'), sel: getComputedStyle(document.getElementById('four')).userSelect || getComputedStyle(document.getElementById('four')).webkitUserSelect, auto: i.getAttribute('autocomplete'), val: i.value }; });
  must(guard.drop && guard.paste && guard.dropIn && guard.swap, 'dropped text, pasted text and suggested text are all refused');
  must(!guard.typed, 'typed text is still let in');
  must(guard.sel === 'none' && guard.auto === 'off' && guard.val === '', 'the lines on the card cannot be selected, and the box offers no remembered text');
  await p.keyboard.press('Meta+v'); await p.keyboard.press('Control+v'); s = await st(); must(s.val === '' && s.lines === 4, 'the paste keys put nothing in the box');
  await p.mouse.click(300, 300); await p.waitForTimeout(150); s = await st(); must(s.focus === 'inp', 'the cursor comes back after a click elsewhere');
  await gate('the long-way card');
  await p.screenshot({ path: __dirname + '/shots/at-typed.png' });
  /* the honest win is still there for a very fast typist */
  await load(url('phase=typing&clock=600&lines=28')); await p.waitForTimeout(500);
  for (const w of ['unlock', 'push', 'lock', 'check']) s = await type('print("' + w + '")');
  must(s.phase === 'win', 'all 32 lines in time wins the long way');
  await until(() => __film.P.phase === 'end', 8000); s = await st(); must(s.slow && /slower typist/.test(s.endmsg), 'the win ends with a way to watch the other ending');
  await p.click('#slow'); s = await st(); must(s.phase === 'fall' && s.demo && s.typed1 === 9, 'the other ending is the fall of a slower typist with 9 lines');

  /* ---------- B. Blink's lesson: she writes the function ---------- */
  out.push('B. writing the function');
  await load(url('phase=learn&lt=22.4&typed=9&clock=600')); await p.waitForTimeout(500);
  s = await st(); must(s.mode === null && /That is a function. Its name will be rung\./.test(s.say), 'Blink names the function before the card opens');
  await gate('Blink names the function');
  await until(() => __film.mode() === 'def', 6000); await p.waitForTimeout(700);
  s = await st(); must(s.mode === 'def' && s.focus === 'inp' && s.ck === 'A NEW FUNCTION' && s.cnt === 'You have typed 0 of the 5 lines.', 'the function card opens with the cursor in the box');
  await gate('the function card');
  s = await type('Def rung():'); must(s.defn === 0 && /def in small letters/.test(s.fb), 'Def with a capital does not count');
  s = await type('def Rung():'); must(s.defn === 0 && /name in small letters/.test(s.fb), 'Rung with a capital does not count');
  s = await type('def ladder():'); must(s.defn === 0 && /Name the function rung this time/.test(s.fb), 'another name does not count');
  s = await type('def rung:'); must(s.defn === 0 && /brackets after the name/.test(s.fb), 'no brackets does not count');
  s = await type('def rung()'); must(s.defn === 0 && /colon at the end/.test(s.fb), 'no colon does not count');
  s = await type('rung()'); must(s.defn === 0 && /next line to type is def rung\(\):/.test(s.fb), 'using the name before it is made does not count');
  s = await type('def  rung ( ) :'); must(s.defn === 1 && /def is short for define. You are defining a function called rung\./.test(s.fb) && s.val === '    ' && s.pr === '...' && !s.clock, 'the def line counts, the next line starts four spaces in, no clock runs');
  s = await type('print("push")'); must(s.defn === 1 && /needs the word unlock/.test(s.fb), 'a line out of order does not go inside');
  s = await type('print("unlock")'); must(s.defn === 2 && s.fb === 'unlock is inside rung now.', 'unlock goes inside rung');
  for (let i = 0; i < 4; i++) await p.keyboard.press('Backspace');
  s = await type('print("push")'); must(s.defn === 3, 'a line with its spaces rubbed out still goes inside');
  s = await type('print("lock")'); s = await type('print("check")');
  must(s.defn === 5 && /check is inside rung now. rung is ready\./.test(s.fb) && s.mode === null, 'the fifth line finishes the function and the box closes');
  must(s.rungs === 0 && s.lines === 0 && s.sign === '', 'making the function moved nothing');
  await p.keyboard.type('rung()'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  s = await st(); must(s.typed2 === 0 && s.phase === 'learn' && /Nothing moved. A function waits until you use its name\./.test(s.say), 'Blink says a function waits, and typing is ignored while he speaks');
  await gate('the function is made');
  await p.screenshot({ path: __dirname + '/shots/at-def.png' });

  /* ---------- C. using it ---------- */
  out.push('C. using the function');
  must(await until(() => __film.P.phase === 'go2', 8000), 'the second go starts by itself');
  await p.waitForTimeout(900); s = await st();
  must(s.mode === 'call' && s.focus === 'inp' && !s.clock && s.fn && s.ch === 'Type rung() to push the ladder up 1 rung.' && /Now use it. Type rung\(\) and watch all 4 lines run\./.test(s.say), 'the call card opens, her function stays on screen, the clock waits');
  await gate('the call card with Blink');
  s = await type('rung'); must(s.lines === 0 && /Add the brackets to make it run/.test(s.fb), 'the name without brackets does nothing'); must(s.clock, 'the clock starts at her first key');
  s = await type('Rung()'); must(s.lines === 0 && /exactly as you wrote it/.test(s.fb), 'the name with a capital does nothing');
  s = await type('def rung():'); must(s.lines === 0 && /already made/.test(s.fb), 'making it again does nothing');
  s = await type('rung(', 130); must(s.lines === 0 && /both brackets/.test(s.fb), 'one bracket does nothing');
  s = await type('rung( )', 800); must(s.lines === 4 && s.typed2 === 1 && s.rungs === 1 && s.sign === 'unlock push lock check', 'rung() runs all 4 lines: the lift screen shows 4 words and the ladder climbs 1 rung');
  must(s.fb === 'rung() ran all 4 of its lines. Rung 1 of 8 is done.' && s.cnt === 'Your 1 line did the work of 4 lines.' && s.ck === 'RUNG 2 OF 8', 'the card says what the 1 line did');
  must(await until(() => document.getElementById('say').textContent === 'That 1 line did the work of 4 lines.' && +getComputedStyle(document.getElementById('speech')).opacity > 0.9, 9000), 'Blink says the 1 line did the work of 4');
  await gate('the call card after the first call');
  await p.screenshot({ path: __dirname + '/shots/at-call.png' });
  for (const w of ['unlock', 'push', 'lock', 'check']) s = await type('print("' + w + '")', 160);
  must(s.lines === 8 && s.typed2 === 5 && /rung\(\) would do those 4 lines for you/.test(s.fb) && s.cnt === 'Your 5 lines did the work of 8 lines.', 'the long way still works beside the function, and the count stays true');
  for (let i = 0; i < 6; i++) s = await type('rung()', 520);
  must(s.lines === 32 && s.typed2 === 11 && s.done2, 'six more calls finish all 8 rungs');
  await p.keyboard.type('rung()', { delay: 70 }); await p.keyboard.press('Enter');
  must(await until(() => __film.P.phase === 'safe', 4000), 'the rescue plays');
  await p.keyboard.type('rung()', { delay: 70 }); await p.keyboard.press('Enter'); s = await st(); must(s.phase === 'safe' && s.typed2 === 11, 'typing on after the last call changes nothing and the rescue keeps playing');
  must(await until(() => +getComputedStyle(document.getElementById('next')).opacity > 0.9 && getComputedStyle(document.getElementById('next')).display !== 'none', 9000), 'Next appears after the rescue');
  await p.waitForTimeout(500); s = await st(); must(/^Billy and Bobby are safe\. You reached them with \d+ seconds to spare\.$/.test(s.cap), 'the caption gives her own seconds to spare: ' + s.cap);
  await gate('the rescue');

  /* ---------- D. what it saved, what it is, one question ---------- */
  out.push('D. the closing screens');
  await p.click('#next'); await p.waitForTimeout(300); s = await st();
  must(s.phase === 'why' && s.why === 1 && s.w1a === '8 rungs needed 32 lines. You had time for 9 lines.' && /^8 rungs needed 16 lines\. You had \d+ seconds to spare\.$/.test(s.w1b) && s.hers === 9 && s.calls === 11, 'screen 1 sets her own two sets of lines side by side: ' + s.w1b);
  await gate('what it saved'); await p.screenshot({ path: __dirname + '/shots/at-why1.png' });
  await p.click('#next'); await p.waitForTimeout(300); s = await st(); must(s.why === 2 && s.back, 'screen 2 opens with a way back');
  await gate('what a function is');
  await p.click('#back'); await p.waitForTimeout(200); s = await st(); must(s.why === 1, 'Back returns to screen 1');
  await p.click('#next'); await p.click('#next'); await p.waitForTimeout(300); s = await st(); must(s.why === 3 && !s.next, 'screen 3 has no Next until the question is answered');
  must(s.w3seen === 'This tree needed 8 rungs. Each rung() you typed climbed 1 rung.', 'the question screen shows what her own calls did, so the answer is worked out and never guessed: ' + s.w3seen);
  must(await p.evaluate(() => [...document.querySelectorAll('.opt')].map(e => e.textContent).sort().join('|')) === '20 times|5 times|80 times', 'the three answers count calls of rung(), the thing the question asks about');
  await gate('the question');
  await p.click('.opt[data-v="80"]'); await p.waitForTimeout(150); s = await st(); must(/80 is the long way, 4 lines for every rung/.test(s.w3fb) && !s.next, 'a wrong answer shows its reason and does not move on');
  must(await p.evaluate(() => document.querySelector('.opt[data-v="80"]').disabled), 'the wrong answer cannot be picked twice');
  await p.click('.opt[data-v="5"]'); await p.waitForTimeout(150); s = await st(); must(/5 lines made your function\. You type rung\(\) once for every rung\./.test(s.w3fb) && !s.next, 'the other wrong answer shows its own reason');
  await p.click('.opt[data-v="20"]'); await p.waitForTimeout(150); s = await st(); must(/^Yes\. Each rung\(\) climbs 1 rung\. 20 short lines do the work of 80 lines\.$/.test(s.w3fb) && s.next && s.first3 === '80', 'the right answer opens Next, and her first answer is the one kept');
  await p.click('#next'); await p.waitForTimeout(300); s = await st(); must(s.phase === 'end' && s.endmsg === 'This is the end of the art test.' && s.lesson, 'the end card offers the lesson again');
  await p.click('#lesson'); await p.waitForTimeout(300); s = await st(); must(s.phase === 'learn' && s.lt < 1 && s.defn === 0, 'the lesson starts again from the top');

  /* ---------- E. running out of time with the function ---------- */
  out.push('E. the clock runs out in the second go');
  await load(url('phase=go2&clock=3&speed=4')); await p.waitForTimeout(400);
  s = await type('rung()', 100); must(s.lines === 4, 'one call before the clock runs out');
  must(await until(() => __film.P.phase === 'fall' && __film.P.round === 2 && __film.P.xt > 13 && __film.P.xt < 16.5, 9000), 'the branch still breaks if she is too slow');
  s = await st(); must(s.l2 === 'It only had time to climb 1 rung.', 'the white line counts rungs: ' + s.l2);
  await gate('the second fall');
  must(await until(() => __film.P.phase === 'fall' && __film.P.xt > 19.6 && __film.P.xt < 22, 5000), 'Blink comes back');
  s = await st(); must(s.say === 'Your function is still here. Try again!', 'Blink says the function is kept');
  must(await until(() => __film.P.phase === 'go2', 9000), 'the second go starts again');
  await p.waitForTimeout(300); s = await st(); must(s.again && s.lines === 0 && s.typed2 === 0 && s.defn === 5 && s.fn && s.mode === 'call', 'she keeps her function and starts from rung 1');

  /* ---------- F. she is still typing when the clock runs out ---------- */
  out.push('F. typing through the end of the clock');
  await load(url('phase=typing&clock=4')); await p.waitForTimeout(600);
  for (let i = 0; i < 6; i++) { await p.keyboard.type(['print("unlock")', 'print("push")', 'print("lock")', 'print("check")'][i % 4], { delay: 90 }); await p.keyboard.press('Enter'); }
  s = await st(); must(s.phase === 'fall' && s.round === 1 && s.xt > 2, 'the fall plays on while she is still typing, at ' + s.xt.toFixed(1) + ' seconds in');
  await p.keyboard.type('r0189R', { delay: 60 }); s = await st(); must(s.phase === 'fall', 'no key she presses in the first seconds of the fall jumps anywhere');
  must(await until(() => __film.P.phase === 'fall' && __film.P.xt > 8.2 && __film.P.xt < 16, 12000), 'the fall reaches the empty stump');
  s = await st(); must(/^You only had time to write \d+ of those 32 lines\.$|^You did not have time to write any of those lines\.$/.test(s.l2), 'the white line gives her own count: ' + s.l2);
  /* the jump keys still work for the person judging, once nobody is typing */
  await load(url('phase=fall&xt=9&lines=9')); await p.waitForTimeout(1500);
  await p.keyboard.press('0'); await p.waitForTimeout(200); s = await st(); must(s.phase === 'learn', 'key 0 still jumps to Blink when no card has been live');
  await p.waitForTimeout(1400); await p.keyboard.press('r'); await p.waitForTimeout(200); s = await st(); must(s.phase === 'call', 'key R still returns to the first screen');

  } catch (e) { fails++; out.push('STOPPED: ' + String(e).split('\n')[0]); try { out.push('state: ' + JSON.stringify(await st())); } catch (e2) {} }
  console.log(out.join('\n')); console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await b.close();
})();
