/* The Rescue, the whole hour: THE GATES TEST. Run: node hour-gates-test.js [1|3|6|7|8|13|dump]
   It runs the gates of J3_L4_RESCUE_SPEC.md section 15 that the typed test does not: every gate here has a
   CONTROL, a fault planted on purpose that the gate must catch. A gate that cannot fail proves nothing.
     gate 1   the words law at its worst: every typing step after wrong lines, with help and Blink's hint up
     gate 3   honest fails: each timed beat can really be lost and can really be won near the end of its clock
     gate 6   no shortcuts: no paste, no drop, no suggested text, no jump keys; Enter still presses a lit Run
     gate 7   faces: no animal smiles while it is in danger; everyone smiles once a chapter's danger is over
     gate 8   gauges: every timer is a whole outlined gauge with a label in words; no number without its thing
     A13      a slow computer drops picture detail and the story clock still keeps real time
   Gates 2, 4 and 5 have their own files. Gate 9 is film-type-test.js and frame-hash.js on chapter 1.
   "dump" prints every animal's face numbers at every held step, to read the gate 7 table against. */
const R = __dirname + '/', path = require('path');
const WORDS = require(R + 'hour-words.js');
const ONLY = process.argv[2] || '', PAGE = require(R + 'hour-walk.js').PAGE;
const want = g => !ONLY || ONLY === String(g);

(async () => {
  const W = await require(R + 'hour-walk.js').open({ out: R + 'gates-test-pictures' });
  const p = W.p, screens = new Map();
  await p.exposeFunction('__screen', c => { const k = c.id + '#' + c.blocks.join(' | ') + '#' + c.fb.join(' | '); if (!screens.has(k)) screens.set(k, c); });
  await p.addInitScript(WORDS.SAMPLER);
  const must = (ok, what) => { W.must(!!ok, what); if (ok) console.log('  ok  ' + what); };
  const head = t => console.log(t);
  const note = t => console.log('  ..  ' + t);
  const ev = (fn, arg) => p.evaluate(fn, arg);
  /* one retry: a page load that stalls once is the machine, not the lesson. A second stall stops the test. */
  const go = async q => { try { return await W.go(q + '&mute'); } catch (e) { console.log('  ..  a page load stalled once and was tried again (' + q + ')'); await W.sleep(1500); return W.go(q + '&mute'); } };
  const fresh = q => go(q + '&hfresh');
  const count = () => ev(() => window.__count());
  /* a wait that may run out on purpose (a control), so it does not count as a page error */
  const waitFor = async (fn, ms, arg) => { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 40 }); return true; } catch (e) { return false; } };
  /* every change of step, with the story second it happened at */
  const track = () => ev(() => {
    if (Hour.__og) return; Hour.__og = Hour.go; window.__went = [];
    Hour.go = function (id, arg) { window.__went.push({ from: Hour.id, to: id, t: Hour.t }); return Hour.__og.call(Hour, id, arg); };
  });
  /* the story second of her first key in the box: the same event the lesson starts its clock on */
  const armKey = () => ev(() => { window.__k = null; document.getElementById('hinp').addEventListener('keydown', function () { if (window.__k == null) window.__k = Hour.t; }, true); });
  const went = to => ev(t => (window.__went || []).filter(g => g.to === t).map(g => +(g.t - (g.from === Hour.id ? 0 : 0)).toFixed(2)), to);
  const frozen = async (step, ht, extra) => {
    await p.goto(PAGE + '?h=' + step + '&hfreeze&ht=' + ht + '&mute&hfresh' + (extra || ''));
    await waitFor(() => window.__hready, 8000); await W.sleep(120);
  };

  const TYPING = ['r_make', 'r_call1', 'r_bobby', 'r_gap', 'r_call2', 'r_hog', 'l_make', 'l_plan', 'l_mend', 'd_def', 'd_body', 'd_loop'];

  /* =====================================================================================================
     GATE 1. The words law (DFM 292) at its worst
     ===================================================================================================== */
  if (want(1)) {
    head('GATE 1. the words law at its worst');
    const WRONG = ['banana', 'print(', 'cross', 'for', 'def'];
    const worst = {};
    const mark = async step => { const c = await count(); const w = worst[step] = worst[step] || { prose: 0, all: 0, long: 0 }; w.prose = Math.max(w.prose, c.total); w.all = Math.max(w.all, WORDS.allWords(c)); w.long = Math.max(w.long, c.longest); };
    /* every typing step: five wrong lines one after another, so every level of help comes up */
    for (const step of TYPING) {
      await fresh('h=' + step + '&hspeed=6');
      if (!(await W.asking(40000))) { must(false, step + ' never asked for a line'); continue; }
      await mark(step);
      for (const w of WRONG) {
        if ((await ev(() => Hour.id)) !== step || !(await ev(() => !!Hour.input))) break;
        await p.keyboard.type(w, { delay: 0 }); await p.keyboard.press('Enter'); await W.sleep(140); await mark(step);
      }
    }
    /* help a rung at a time (his look, 6 Oct 2026): a line in the help box by story second 30 with no accepted line, more by 60 and 90,
       on top of the feedback for one wrong line. The def step's last two rungs say the same line. */
    for (const step of ['d_def', 'd_body', 'd_loop']) {
      await fresh('h=' + step + '&hspeed=8'); await W.asking(20000);
      await p.keyboard.type('banana', { delay: 0 }); await p.keyboard.press('Enter'); await W.sleep(150);
      const rungs = [];
      for (const at of [31, 61, 91]) {
        await waitFor(a => Hour.t >= a, 16000, at); await W.sleep(120);
        rungs.push(await ev(() => document.getElementById('hhelp').textContent.replace(/\s+/g, ' ').trim())); await mark(step);
      }
      must(rungs[0] && rungs[1] !== rungs[0] && (rungs[2] !== rungs[1] || step === 'd_def'), step + ': help comes a rung at a time by story seconds 30, 60 and 90: ' + rungs.map(r => '"' + r + '"').join(' / '));
    }
    /* the hedgehog step's help that comes by itself at 12 seconds */
    await fresh('h=r_hog&hspeed=5'); await W.asking(); await p.keyboard.type('c');
    must(await waitFor(() => /new name in the speech marks/.test(document.getElementById('hhelp').textContent), 6000), 'r_hog: the help line comes by itself 12 story seconds into the clock');
    await mark('r_hog');
    /* the door after 1, 2 and 3 failed runs: a fault in her function, then a fault in the code that uses it */
    const sites = {};
    for (const prog of ['noshut', 'name', 'direct2', 'typo']) for (const n of [1, 2, 3]) {
      /* the fail step itself, so the lesson decides which step she is sent back to */
      await fresh('h=d_fail&hspeed=6&dprog=' + prog);
      await ev(k => { Hour.save.fails.door = k; }, n);
      if (!(await W.asking(40000))) { must(false, 'door retry (' + prog + ', ' + n + ' failed runs) never asked for a line'); continue; }
      const step = await ev(() => Hour.id); sites[prog] = step; await W.sleep(200); await mark(step + ' retry');
      for (const w of WRONG.slice(0, 4)) {
        if (!(await ev(() => !!Hour.input))) break;
        await p.keyboard.type(w, { delay: 0 }); await p.keyboard.press('Enter'); await W.sleep(140); await mark(step + ' retry');
      }
    }
    must(sites.noshut === 'd_body' && sites.name === 'd_body' && sites.direct2 === 'd_loop' && sites.typo === 'd_loop', 'door retry: a fault in her function sends her back to the function, a fault in her calls sends her back to the calls');
    const all = [...screens.values()], over = all.filter(WORDS.over);
    over.forEach(c => console.log('  OVER ' + c.id + ': ' + c.total + ' words of prose, ' + WORDS.allWords(c) + ' with feedback, longest sentence ' + c.longest + ' words: ' + c.longText));
    must(all.length > 40 && !over.length, all.length + ' worst-case screens: none over 40 words of prose, none with a sentence over 14 words, none over 60 with feedback');
    const bare = WORDS.bareNumbers([].concat(...all.map(c => c.blocks.concat(c.fb))));
    must(!bare.length, 'no sentence on those screens ends on a number without its thing' + (bare.length ? ': ' + bare.join(' | ') : ''));
    Object.keys(worst).forEach(s => note(s + ': most prose ' + worst[s].prose + ', most with feedback ' + worst[s].all + ', longest sentence ' + worst[s].long));
    /* controls */
    await fresh('h=r_hog'); await W.asking();
    const base = await count();
    const c15 = await ev(() => { document.getElementById('hsub').textContent = 'The river is rising and you will need to type one new line very soon.'; return window.__count(); });
    must(!WORDS.over(base) && WORDS.over(c15) && c15.longest === 15, 'control: a planted sentence of 15 words is caught (the screen was clean before it)');
    await fresh('h=r_hog'); await W.asking();
    const c41 = await ev(() => { Hour.say('One two three four five six seven eight nine ten eleven twelve thirteen fourteen. One two three four five six seven eight nine ten eleven twelve thirteen fourteen. One two three four five six seven eight nine ten eleven twelve thirteen.'); return window.__count(); });
    must(WORDS.over(c41) && c41.longest <= 14 && c41.total > 40, 'control: a planted screen over 40 words is caught, with no sentence over 14 words');
    must(!WORDS.over({ total: 40, longest: 14, fb: [] }) && WORDS.over({ total: 41, longest: 14, fb: [] }) && WORDS.over({ total: 12, longest: 15, fb: [] }), 'control: 40 words and 14 words pass, 41 words and 15 words do not');
    await fresh('h=r_hog'); await W.asking();
    const c61 = await ev(() => { document.getElementById('hhelp').innerHTML = '<span>' + new Array(13).join('Type the line now. ') + '</span>'; return window.__count(); });
    must(WORDS.over(c61) && c61.total <= 40, 'control: help lines that take a screen past 60 words are caught, though its prose is under 40');
    must(WORDS.bareNumbers(['It took you 32 lines. You had time for 9.']).length === 1 && !WORDS.bareNumbers(['You only had time to write 9 lines.']).length, 'control: "You had time for 9." is caught and "9 lines" is not');
  }

  /* =====================================================================================================
     GATE 3. Honest fails: every timed beat can be lost, and can be won near the end of its clock
     ===================================================================================================== */
  if (want(3)) {
    head('GATE 3. honest fails');
    const lost = (to, ms) => waitFor(t => (window.__went || []).some(g => g.to === t), ms, to);
    const lostAt = to => ev(t => { const g = (window.__went || []).filter(x => x.to === t)[0]; return g ? +(g.t - window.__k).toFixed(2) : -1; }, to);
    const sawStep = to => ev(t => (window.__went || []).some(g => g.to === t), to);

    /* ---- the river: 35 story seconds from her first key ---- */
    await fresh('h=r_hog&hspeed=5'); await W.asking(); await track(); await armKey();
    const still = await ev(() => { const a = Hour.V.water, t = Hour.t; return new Promise(r => setTimeout(() => r({ rose: Hour.V.water - a, t: Hour.t - t }), 1500)); });
    must(still.t > 5 && Math.abs(still.rose) < 1e-6, 'the river: the clock has not started before her first key (' + still.t.toFixed(1) + ' story seconds passed, the water did not rise)');
    await p.keyboard.type('c');
    must(await lost('r_fail', 12000), 'the river: with no valid line the hedgehog step is lost');
    const rAt = await lostAt('r_fail');
    must(rAt >= 35 && rAt < 35.7, 'the river: it is lost at story second 35 of 35 after her first key (measured ' + rAt + ')');
    must(await waitFor(() => Hour.V.owl && Hour.V.owl.turn > 0.95, 9000), "the river: the fail ends at Blink's turned head");
    must(await waitFor(() => Hour.id === 'r_hog' && !!Hour.input, 15000), 'the river: the storm rewinds to the same step');
    const rBack = await ev(() => ({ fn: document.getElementById('hfnl').innerText, help: document.getElementById('hhelp').textContent, fails: Hour.save.fails.river, sub: document.getElementById('hsub').textContent }));
    must(/def cross\(who\):/.test(rBack.fn) && rBack.fails === 1, 'the river: her function is still on the panel after the rewind');
    must(/Put a new name in the speech marks/.test(rBack.help) && /starts when you type/.test(rBack.sub), 'the river: the second try opens with the help line, and the clock waits for her first key again');
    /* a wrong line does not stop the clock */
    await fresh('h=r_hog&hspeed=5'); await W.asking(); await track(); await armKey();
    await p.keyboard.type('cross(Pip)', { delay: 0 }); await p.keyboard.press('Enter');
    must(await lost('r_fail', 12000) && (await lostAt('r_fail')) < 35.7, 'the river: a wrong line does not stop the clock');
    /* the right line late in the clock still wins */
    await fresh('h=r_hog&hspeed=2'); await W.asking(); await track(); await armKey();
    await p.keyboard.type('c');
    await waitFor(() => Hour.t - window.__k >= 33.6, 30000);
    await p.keyboard.type('ross("Pip")', { delay: 0 }); await p.keyboard.press('Enter');
    const rLate = await ev(() => +(Hour.t - window.__k).toFixed(2));
    const rWon = await waitFor(() => Hour.id === 'r_close', 40000);
    must(rLate < 35 && rWon && !(await sawStep('r_fail')), 'the river: the right line finished at story second ' + rLate + ' of 35 carries the hedgehog over');

    /* ---- the lane: 40 story seconds from her first key, stopped only by Run ---- */
    await fresh('h=l_mend&hspeed=5'); await W.asking(); await track(); await armKey();
    await p.keyboard.type('p');
    must(await lost('l_fail', 14000), 'the lane: with no line the mend step is lost');
    const lAt = await lostAt('l_fail');
    must(lAt >= 40 && lAt < 40.7, 'the lane: it is lost at story second 40 of 40 after her first key (measured ' + lAt + ')');
    must(await waitFor(() => Hour.V.owl && Hour.V.owl.turn > 0.95, 9000), "the lane: the fail ends at Blink's turned head");
    must(await waitFor(() => Hour.id === 'l_mend' && !!Hour.input, 15000), 'the lane: the storm rewinds to the same step');
    const lBack = await ev(() => ({ fn: document.getElementById('hfnl').innerText, help: document.getElementById('hhelp').textContent }));
    must(/def dash\(\):/.test(lBack.fn) && (lBack.fn.match(/dash\(\)/g) || []).length >= 6 && /Type print\("jump"\)/.test(lBack.help), 'the lane: her plan is still on the panel after the rewind, and the exact line is given');
    await fresh('h=l_mend&hspeed=5'); await W.asking(); await track(); await armKey();
    await p.keyboard.type('print("jump")', { delay: 0 }); await p.keyboard.press('Enter');
    must(await lost('l_fail', 14000), 'the lane: the right line with Run never pressed is still lost. Only Run stops the clock.');
    await fresh('h=l_mend&hspeed=2'); await W.asking(); await track(); await armKey();
    await p.keyboard.type('print("jump")', { delay: 0 }); await p.keyboard.press('Enter');
    await waitFor(() => Hour.t - window.__k >= 38.6, 40000);
    await p.click('#hrun');
    const lLate = await ev(() => { const g = window.__went.filter(x => x.to === 'l_run2')[0]; return g ? +(g.t - window.__k).toFixed(2) : -1; });
    const lWon = await waitFor(() => Hour.id === 'l_close', 60000);
    must(lLate > 38 && lLate < 40 && lWon && !(await sawStep('l_fail')), 'the lane: Run pressed at story second ' + lLate + ' of 40 gets everyone to the gate');

    /* ---- the door: her own code is the clock. Every program she can write, run by the judge. ---- */
    const door = await ev(() => {
      const J = HourJudge, gang = ['Billy', 'Bobby', 'Pip'];
      const K = [{ k: 'open', w: 'open' }, { k: 'shut', w: 'shut' }, { k: 'gap', w: 'who' }, { k: 'word', w: 'Billy' }, { k: 'word', w: 'Rex' }];
      const CALLS = [gang, gang.slice().reverse(), ['Billy'], ['Billy', 'Bobby'], ['Billy', 'Bobby', 'Rex']];
      let n = 0, safe = 0, slow = 0, slowBody = '', late = 0; const fails = {};
      (function walk(body) {
        if (body.length) CALLS.forEach(calls => {
          const s = J.simDoor(body, calls, gang); n++;
          if (s.safe) { safe++; if (s.time > slow) { slow = s.time; slowBody = body.map(J.pyLine).join(' ; '); } }
          else { const f = s.fail.replace(/Billy|Bobby|Pip|Rex/g, 'NAME'); fails[f] = (fails[f] || 0) + 1; }
          if (!s.open && !s.outside.length && s.time > J.T.clock) late++;
        });
        if (body.length < 6) K.forEach(k => walk(body.concat([k])));
      })([]);
      const right = [K[0], K[2], K[1]];
      const tight = J.simDoor(right, gang, gang, { door: 0.5, enter: 1, bonk: 0.5, none: 0.3, clock: 2 });
      return { n, safe, slow: +slow.toFixed(2), slowBody, fails, late, clock: J.T.clock, rightTime: J.simDoor(right, gang, gang).time, tightSafe: tight.safe, tightLine: tight.fail };
    });
    must(door.safe > 0 && door.n - door.safe > 0, 'the door: of ' + door.n + ' programs she can write, ' + door.safe + ' get everyone in and ' + (door.n - door.safe) + ' do not');
    must(door.late === 0 && door.slow <= door.clock, 'the door: no right program is beaten by the clock. The slowest right one takes ' + door.slow + ' of ' + door.clock + ' seconds (' + door.slowBody + ')');
    const fl = Object.keys(door.fails);
    must(fl.length >= 4, 'the door: ' + fl.length + ' different fail lines can really be reached');
    fl.forEach(f => note(door.fails[f] + ' programs: ' + f));
    must(!door.tightSafe && /storm arrived/.test(door.tightLine), 'control: with the door clock cut to 2 seconds the right program is lost, so the clock is real');

    /* ---- control: a clock that never ends must be caught ---- */
    await fresh('h=r_hog&hspeed=5'); await W.asking(); await track(); await armKey();
    await p.keyboard.type('c'); await ev(() => { Hour.OPT.speed = 0; });
    must(!(await lost('r_fail', 10000)), 'control: with the story clock stopped, this gate reports that the hedgehog step can never be lost');
  }

  /* =====================================================================================================
     GATE 6. No shortcuts
     ===================================================================================================== */
  if (want(6)) {
    head('GATE 6. no shortcuts');
    const probe = () => ev(() => {
      const i = document.getElementById('hinp'), before = i.value, res = {}, TEXT = 'cross("Pip")';
      const dt = new DataTransfer(); dt.setData('text/plain', TEXT);
      const evs = {
        paste: new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
        drop: new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }),
        insertFromPaste: new InputEvent('beforeinput', { inputType: 'insertFromPaste', data: TEXT, bubbles: true, cancelable: true }),
        insertFromDrop: new InputEvent('beforeinput', { inputType: 'insertFromDrop', data: TEXT, bubbles: true, cancelable: true }),
        insertFromYank: new InputEvent('beforeinput', { inputType: 'insertFromYank', data: TEXT, bubbles: true, cancelable: true }),
        insertReplacementText: new InputEvent('beforeinput', { inputType: 'insertReplacementText', data: TEXT, bubbles: true, cancelable: true })
      };
      for (const k in evs) { i.dispatchEvent(evs[k]); res[k] = evs[k].defaultPrevented; }
      const typing = new InputEvent('beforeinput', { inputType: 'insertText', data: 'c', bubbles: true, cancelable: true }); i.dispatchEvent(typing);
      return { open: Object.keys(res).filter(k => !res[k]), same: i.value === before, typingAllowed: !typing.defaultPrevented,
        attrs: [i.getAttribute('autocomplete'), i.getAttribute('autocorrect'), i.getAttribute('autocapitalize'), i.getAttribute('spellcheck')].join(',') };
    });
    let shut = 0; const openAt = [];
    for (const step of TYPING) {
      await fresh('h=' + step + '&hspeed=6');
      if (!(await W.asking(40000))) { must(false, step + ' never asked for a line'); continue; }
      const r = await probe();
      if (!r.open.length && r.same && r.typingAllowed) shut++; else openAt.push(step + ' (' + r.open.join(', ') + (r.same ? '' : ', the box changed') + ')');
      if (step === 'r_hog') note('the box is marked ' + r.attrs + ' (autocomplete, autocorrect, autocapitalize, spellcheck)');
    }
    must(shut === TYPING.length, 'paste, drop and suggested text are refused in all ' + TYPING.length + ' typing steps, and ordinary typing is not' + (openAt.length ? ': OPEN at ' + openAt.join('; ') : ''));
    /* a real paste from the real clipboard, where this browser lets the test drive one */
    await fresh('h=r_hog'); await W.asking();
    await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const wrote = await ev(async () => { try { await navigator.clipboard.writeText('cross("Pip")'); return true; } catch (e) { return String(e); } });
    const PASTE = process.platform === 'darwin' ? 'Meta+V' : 'Control+V';
    if (wrote === true) {
      await p.focus('#hinp'); await p.keyboard.press(PASTE); await W.sleep(150);
      const v1 = await ev(() => document.getElementById('hinp').value);
      await ev(() => { window.__plant = function (e) { document.getElementById('hinp').value += e.clipboardData.getData('text/plain'); }; document.addEventListener('paste', window.__plant, true); });
      await p.keyboard.press(PASTE); await W.sleep(150);
      const v2 = await ev(() => { document.removeEventListener('paste', window.__plant, true); const v = document.getElementById('hinp').value; document.getElementById('hinp').value = ''; return v; });
      if (v2 === 'cross("Pip")') must(v1 === '' && (await ev(() => Hour.id)) === 'r_hog', 'a real paste from the clipboard into the timed box leaves it empty (the same key press fills it once a paste handler is planted)');
      else note('this browser did not deliver a real clipboard paste to the page, so the real-paste check could not run here');
    } else note('this browser would not let the test write to the clipboard (' + wrote + '), so the real-paste check could not run here');
    /* control: a planted paste handler must be caught */
    await fresh('h=r_hog'); await W.asking();
    await ev(() => { document.addEventListener('paste', function (e) { document.getElementById('hinp').value += e.clipboardData.getData('text/plain'); }, true); });
    const planted = await probe();
    must(!planted.same, 'control: a planted paste handler that fills the box is caught');
    /* control: a box with the refusals taken off must be caught */
    await fresh('h=r_hog'); await W.asking();
    await ev(() => { const i = document.getElementById('hinp'), c = i.cloneNode(true); i.parentNode.replaceChild(c, i); });
    const bare = await probe();
    must(bare.open.length === 6, 'control: a box with its refusals taken off is caught (' + bare.open.length + ' of 6 ways open)');

    /* no jump keys: chapter 1's judging keys and the usual skip keys do nothing */
    const KEYS = ['1', '2', '5', '9', '0', 'r', 'R', 'Escape', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'PageDown', 'End', 'Tab', ' ', 'n', 's', 'Enter'];
    for (const step of ['r_lesson', 'r_hogfilm', 'filmB', 'd_open']) {
      await fresh('h=' + step); await W.sleep(500); await track();
      await ev(() => { if (document.activeElement) document.activeElement.blur(); });
      const a = await ev(() => ({ t: Hour.t, n: performance.now(), pg: Hour.pageAt ? Hour.pageAt() : -1 }));
      for (const k of KEYS) await p.keyboard.press(k);
      await W.sleep(200);
      const b = await ev(() => ({ t: Hour.t, n: performance.now(), id: Hour.id, on: document.body.classList.contains('h-on'), went: window.__went.length, pg: Hour.pageAt ? Hour.pageAt() : -1 }));
      const real = (b.n - a.n) / 1000;
      must(b.on && b.went === 0 && b.id === step && b.t - a.t < real + 0.4, step + ': ' + KEYS.length + ' stray keys change nothing (' + (b.t - a.t).toFixed(1) + ' story seconds in ' + real.toFixed(1) + ' real seconds, same step)');
    }
    /* Enter must still press a lit Run button when the box is waiting (her line is in, the clock is running) */
    await fresh('h=l_mend&hspeed=2'); await W.asking(); await track();
    await p.keyboard.type('print("jump")', { delay: 0 }); await p.keyboard.press('Enter'); await W.sleep(300);
    const lit = await ev(() => { const b = document.getElementById('hrun'); return b.classList.contains('on') && !b.disabled; });
    await p.keyboard.press('Enter');
    must(lit && await waitFor(() => window.__went.some(g => g.to === 'l_run2'), 3000), 'the lane: after her line, Enter presses the lit Run button');
    await fresh('h=d_loop&hspeed=2'); await W.asking(); await track();
    await p.keyboard.type('for who in gang:', { delay: 0 }); await p.keyboard.press('Enter'); await W.sleep(200);
    await p.keyboard.type('rescue(who)', { delay: 0 }); await p.keyboard.press('Enter'); await W.sleep(300);
    await p.keyboard.press('Enter');
    must(await waitFor(() => window.__went.some(g => g.to === 'd_run'), 3000), 'the door: after her loop, Enter presses the lit Run button');
    note('the prototype menu and the h= jumps in the address are for judging only. The build has neither.');
  }

  /* =====================================================================================================
     GATE 7. Faces match the story in every held frame
     ===================================================================================================== */
  const faces = async (step, ht, extra) => {
    await frozen(step, ht, extra);
    return ev(() => { const o = {}; for (const k in Hour.V.chars) { const c = Hour.V.chars[k]; if (c && c.p && c.p.fear != null) o[k] = { fear: +(+c.p.fear).toFixed(2), joy: +(+(c.p.joy || 0)).toFixed(2), tears: +(+(c.p.tears || 0)).toFixed(2) }; } return { id: Hour.id, scene: Hour.V.scene, o: o }; });
  };
  /* afraid: no smile at all, and fear showing. relief: across, but a friend is still in danger: no full smile.
     safe: the danger is over. calm: settled by the fire, a small smile and no fear. */
  const RULE = {
    afraid: f => f.joy <= 0.1 && f.fear >= 0.5,
    relief: f => f.joy <= 0.5 && f.fear <= 0.5,
    safe: f => f.joy >= 0.9 && f.fear <= 0.1 && f.tears <= 0.1,
    calm: f => f.joy >= 0.3 && f.fear <= 0.1 && f.tears <= 0.1
  };
  const ALL = m => ({ billy: m, bobby: m, hog: m });
  const TABLE = [
    ['r_make', 0, { billy: 'afraid', bobby: 'afraid' }], ['r_call1', 0, { billy: 'afraid', bobby: 'afraid' }],
    ['r_bobby', 0, { billy: 'afraid', bobby: 'afraid' }], ['r_lesson', 0, { billy: 'afraid', bobby: 'afraid' }], ['r_lesson', 9, { billy: 'afraid', bobby: 'afraid' }],
    ['r_gap', 0, { billy: 'afraid', bobby: 'afraid' }], ['r_call2', 0, { billy: 'afraid', bobby: 'afraid' }],
    ['r_hogfilm', 0, { billy: 'relief', bobby: 'relief', hog: 'afraid' }], ['r_hogfilm', 6, ALL('afraid')],
    ['r_hog', 0, ALL('afraid')], ['r_hog', 20, ALL('afraid')], ['r_retry', 0, ALL('afraid')], ['r_close', 0, ALL('safe')],
    ['filmB', 14, ALL('afraid')], ['l_mode', 0, ALL('afraid')], ['l_make', 0, ALL('afraid')], ['l_plan', 0, ALL('afraid')],
    ['l_run1', 2, ALL('afraid')], ['l_lesson', 0, ALL('afraid')], ['l_mend', 0, ALL('afraid')], ['l_mend', 30, ALL('afraid')],
    ['l_run2', 2, ALL('afraid')], ['l_retry', 0, ALL('afraid')], ['l_close', 0, ALL('safe')],
    ['d_open', 0, ALL('afraid')], ['d_def', 0, ALL('afraid')], ['d_body', 0, ALL('afraid')], ['d_loop', 0, ALL('afraid')],
    ['d_run', 3, ALL('afraid')], ['d_retry', 0, ALL('afraid')], ['d_close', 0, ALL('safe')], ['fire', 0, ALL('safe')], ['recap', 0, ALL('calm')]
  ];
  if (ONLY === 'dump') {
    for (const row of TABLE) {
      const f = await faces(row[0], row[1]);
      console.log((row[0] + ' @' + row[1]).padEnd(16) + f.scene.padEnd(8) + Object.keys(f.o).map(k => k + ' fear ' + f.o[k].fear + ' joy ' + f.o[k].joy + ' tears ' + f.o[k].tears).join(' | '));
    }
  }
  if (want(7)) {
    head('GATE 7. faces match the story');
    let good = 0; const bad = [];
    for (const row of TABLE) {
      const f = await faces(row[0], row[1]);
      for (const who in row[2]) {
        const face = f.o[who];
        if (face && RULE[row[2][who]](face)) good++;
        else bad.push(row[0] + ' at second ' + row[1] + ': ' + who + ' should be ' + row[2][who] + ', found ' + (face ? 'fear ' + face.fear + ' joy ' + face.joy + ' tears ' + face.tears : 'no animal'));
      }
    }
    bad.forEach(b => console.log('  FACE ' + b));
    must(!bad.length, good + ' faces across ' + TABLE.length + ' held frames match the story: nobody in danger smiles, and everyone smiles once a chapter is won');
    /* control: a planted smile on the rock */
    await frozen('r_hog', 0);
    const planted = await ev(() => { Hour.V.chars.hog.p.joy = 1; const q = Hour.V.chars.hog.p; return { fear: q.fear, joy: q.joy, tears: q.tears }; });
    must(!RULE.afraid(planted), 'control: a planted smile on the hedgehog on its rock is caught');
    must(!RULE.safe({ fear: 0, joy: 1, tears: 1 }) && !RULE.safe({ fear: 0.5, joy: 1, tears: 0 }), 'control: a smile with tears, and a smile with fear, are caught at a chapter close');
  }

  /* =====================================================================================================
     GATE 8. Gauges: whole, outlined, labelled in words
     ===================================================================================================== */
  if (want(8)) {
    head('GATE 8. gauges');
    const gauge = () => ev(() => {
      const g = document.getElementById('hgauge'), l = document.getElementById('hgl'), b = g.querySelector('.hbar'), i = document.getElementById('hgb');
      const cs = getComputedStyle(b), r = b.getBoundingClientRect(), ri = i.getBoundingClientRect(), rl = l.getBoundingClientRect();
      const a = /rgba?\(([^)]+)\)/.exec(cs.borderTopColor), al = a ? (a[1].split(',')[3] == null ? 1 : parseFloat(a[1].split(',')[3])) : 0;
      const inner = r.width - 2 * (parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft));
      return { on: g.classList.contains('on') && r.width > 0 && r.height > 0, label: l.textContent.trim(), labelSeen: rl.height > 0 && rl.bottom <= r.top + 1,
        border: parseFloat(cs.borderTopWidth), alpha: al, w: Math.round(r.width), fill: +(ri.width / inner).toFixed(3), inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight };
    });
    const whole = (g, text) => g.on && g.inView && g.labelSeen && g.label === text && WORDS.words(g.label) >= 5 && !/\d/.test(g.label) && g.border >= 1 && g.alpha >= 0.3 && g.w >= 200;
    await frozen('r_hog', 10);
    const g1 = await gauge();
    must(whole(g1, 'Time left before the river covers the rock'), 'the river gauge is a whole outlined bar ' + g1.w + ' pixels wide with its label above it: "' + g1.label + '"');
    must(Math.abs(g1.fill - (1 - 10 / 35)) < 0.03, 'the river gauge shows what is left: 10 of 35 seconds used, ' + Math.round(g1.fill * 100) + ' in 100 of the bar still lit');
    await frozen('d_run', 7);
    const g2 = await gauge();
    must(whole(g2, 'Time left before the storm reaches the house'), 'the door gauge is a whole outlined bar ' + g2.w + ' pixels wide with its label above it: "' + g2.label + '"');
    must(g2.fill > 0.5 && g2.fill < 1, 'the door gauge has started to run down while her code runs (' + Math.round(g2.fill * 100) + ' in 100 still lit)');
    const strip = () => ev(() => {
      const s = document.getElementById('hlane'), l = s.querySelector('.tl'), t = s.querySelector('.trk'), sto = s.querySelector('.sto'), ends = [...s.querySelectorAll('.ends span')].map(x => x.textContent);
      const cs = getComputedStyle(t), r = t.getBoundingClientRect();
      return { on: s.classList.contains('on') && r.width > 0, label: l.textContent.trim(), border: parseFloat(cs.borderTopWidth), w: Math.round(r.width), storm: Math.round(sto.getBoundingClientRect().right - r.left), ends: ends.join(' / '), inView: r.left >= 0 && r.right <= innerWidth && s.getBoundingClientRect().bottom <= innerHeight };
    });
    await frozen('l_mend', 2); const s1 = await strip();
    await frozen('l_mend', 30); const s2 = await strip();
    must(s1.on && s1.inView && s1.label === 'Time left before the storm catches them' && s1.border >= 1 && s1.w >= 300 && s1.ends === 'The river / Home', 'the lane strip is a whole outlined track ' + s1.w + ' pixels wide, labelled "' + s1.label + '", with its two ends named');
    must(s2.storm > s1.storm + 40, 'the lane strip shows the storm coming: its front moved ' + (s2.storm - s1.storm) + ' pixels between second 2 and second 30');
    /* controls */
    await frozen('r_hog', 10);
    await ev(() => { document.getElementById('hgl').textContent = '25'; });
    must(!whole(await gauge(), 'Time left before the river covers the rock'), 'control: a gauge with a bare number for a label is caught');
    await frozen('r_hog', 10);
    await ev(() => { document.querySelector('#hgauge .hbar').style.border = '0'; });
    must(!whole(await gauge(), 'Time left before the river covers the rock'), 'control: a gauge with no outline is caught');
    await frozen('r_hog', 10);
    await ev(() => { document.getElementById('hgl').style.display = 'none'; });
    must(!whole(await gauge(), 'Time left before the river covers the rock'), 'control: a gauge with its label hidden is caught');
  }

  /* =====================================================================================================
     A13. A slow computer
     ===================================================================================================== */
  if (want(13)) {
    head('A13. a slow computer');
    const cdp = await p.context().newCDPSession(p);
    const clock = async (rate, secs) => {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await go('h=r_hog&hfresh'); await W.asking(); await armKey();
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: rate });
      await p.keyboard.type('c'); await W.sleep(400);
      const a = await ev(() => ({ t: Hour.t, n: performance.now(), f: window.__frames = 0 }));
      await ev(() => { (function tick() { window.__frames++; requestAnimationFrame(tick); })(); });
      await W.sleep(secs * 1000);
      const b = await ev(() => ({ t: Hour.t, n: performance.now(), frames: window.__frames, step: RescuePerf.step, median: RescuePerf.median, dpr: RescueScene.maxDpr, id: Hour.id,
        frac: parseFloat(document.getElementById('hgb').style.width) / 100, k: window.__k }));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const real = (b.n - a.n) / 1000;
      return { rate: rate, real: real, story: b.t - a.t, pace: (b.t - a.t) / real, fps: b.frames / real, step: b.step, median: b.median, dpr: b.dpr, frac: b.frac, used: (b.t - b.k) / 35, id: b.id };
    };
    const fast = await clock(1, 6);
    note('full speed: ' + fast.fps.toFixed(0) + ' frames a second, middle frame ' + fast.median.toFixed(1) + ' ms, detail step ' + fast.step + ', ' + fast.pace.toFixed(3) + ' story seconds for each real second');
    must(fast.step === 0 && Math.abs(fast.pace - 1) < 0.03, 'at full speed the picture stays at full detail and the clock keeps real time');
    let slow = null;
    for (const rate of [6, 12, 20]) {
      slow = await clock(rate, 9);
      note('processor slowed ' + rate + ' times: ' + slow.fps.toFixed(0) + ' frames a second, middle frame ' + slow.median.toFixed(1) + ' ms, detail step ' + slow.step + ', ' + slow.pace.toFixed(3) + ' story seconds for each real second');
      if (slow.step > 0) break;
    }
    must(slow.step > 0 && slow.dpr < 1, 'on a slowed processor the picture detail drops by itself (step ' + slow.step + ', detail ' + slow.dpr + ')');
    must(Math.abs(slow.pace - 1) < 0.05, 'the 35-second clock still keeps real time on the slowed processor (' + slow.pace.toFixed(3) + ' story seconds for each real second)');
    must(Math.abs(slow.frac - (1 - slow.used)) < 0.03 && slow.id === 'r_hog', 'the gauge still shows the true time left on the slowed processor');
    await go('h=r_hog&hfresh'); await W.asking();
    const forced = await ev(() => new Promise(done => {
      const c = document.querySelector('canvas'), w0 = c.width, t0 = Hour.t; RescuePerf.force(2);
      setTimeout(() => { const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 30) lit++;
        done({ w0: w0, w1: c.width, low: RescueScene.maxDpr, step: RescuePerf.step, lit: lit, ran: Hour.t - t0 }); }, 600);
    }));
    must(forced.step === 2 && forced.w1 < forced.w0 && forced.lit > 200 && forced.ran > 0.4, 'the lowest detail step still draws the scene and the story still runs (picture ' + forced.w0 + ' pixels wide down to ' + forced.w1 + ')');
  }

  console.log(W.checks + ' checks, ' + W.fails + ' failed.' + (W.errs.length ? '' : ' No page errors.'));
  console.log(W.fails || W.errs.length ? 'NOT PASSED' : 'ALL PASS');
  await W.close();
})().catch(e => { console.log('TEST CRASHED: ' + (e && e.stack || e)); process.exit(1); });
