#!/usr/bin/env node
/* qa-swap-paired.js — TWO REAL PUPILS, GENUINELY PAIRED, DOOR TO SEAL.
 *
 * WHY IT EXISTS. Every walker this platform has walks ALONE. sit-review crosses
 * the Chatbot Swap solo by construction (`ctx.review` -> cb('solo')), and
 * sit-wrongpath never asked for the readability law at all. So the Swap's
 * paired half — the tester's seat, the watch feed, the report that travels, the
 * seal — was measured by NOTHING, and that is where five of the eleven faults
 * from his 28 August two-account sit were living. A gate that cannot pair
 * cannot see a paired activity: this one runs two browser contexts against one
 * dev store and drives them both.
 *
 * IT IS THE ROUND'S EXIT BAR. Its controls were filed against V59 BEFORE any
 * fix (DFM 196) — the evidence is `qa-l2-l5-review/sit2-repro-v59/` — and every
 * assertion below FAILED on that build. Point it at the worktree to prove the
 * control has not gone stale:
 *
 *   node qa-swap-paired.js --base http://localhost:8097 --expect-fail
 *   node qa-swap-paired.js                                  (the fixed build)
 *
 * WHAT IT ASSERTS, and each line names the fault it was written from:
 *   S2  a chip DRAGGED into the editor lands on whole lines, never spliced
 *       into the middle of one — and a run that dies before the probes never
 *       tells her three true things are "NOT WORKING YET"
 *   S3  the offer card is readable, and it says the Swap is next either way
 *   S4  every rendered numbered list is left-aligned (DFM 274)
 *   S5  the tester's finished-with-their-bot line is readable
 *   S6  the builder's watch feed equals the tester's real conversation, IN
 *       ORDER, prints included — and the channel transcript behind it is
 *       complete, so a feed mounted late can be filled in
 *   S7  the report's second box allows a clean bill
 *   S8  each report renders EXACTLY ONCE on each side, and both sides SEAL
 *   S9  nothing renders outside its own card
 *   S12 the waiting screen's long-wait hint has the button it promises
 *   plus: readability measured on EVERY distinct state either pupil stands on
 *
 * It writes to the dev store only (Demo-9A, two seeded demo pupils).
 */
const RT = __dirname;
const { chromium } = require(RT + '/node_modules/playwright');
const WALK = require(RT + '/lib/walk-moves.js');
const CA = require(RT + '/lib/contrast-audit.js');
const SA = require(RT + '/lib/state-audit.js');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const BASE = argOf('--base', 'http://localhost:8121');
const EXPECT_FAIL = args.includes('--expect-fail');
const OUT = path.join(RT, 'out', 'swap-paired');
fs.mkdirSync(OUT, { recursive: true });

const LOG = [];
const log = (s) => { const l = new Date().toISOString().slice(11, 19) + '  ' + s; console.log(l); LOG.push(l); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
/* the platform's own one-press guard: `App.armButton` ignores a click in the
   first 350 ms after a control mounts (DFM 104). A harness that does not wait it
   out is testing its own reflexes, not the lesson. */
const GUARD_MS = 700;
const findings = [];
const fail = (code, msg) => { findings.push(code + ': ' + msg); log('  ✗ ' + code + ' — ' + msg); };
const pass = (code, msg) => log('  ✓ ' + code + ' — ' + msg);

/* The two bots are FIXED, so the expected conversation is arithmetic rather
   than a guess. B's bot is the one A tests, and its beat order is the thing
   S6 is about: a print, a question, an answer, a question, an answer, then two
   more prints — the builder's feed has to show exactly that, in that order. */
const BOT_A = 'print("Hello. Two quick questions.")\nfood = input("What is your favourite food?")\nteam = input("What team do you support?")\nprint("Right: " + food + " it is.")\nprint("Verdict: " + food + " and " + team + " - that is a good pair.")';
const BOT_B = 'print("Hiya. Answer me these.")\nfilm = input("What is the best film you have seen?")\nsubject = input("What is your favourite subject?")\nprint("Good shout - " + film + ".")\nprint("So: " + film + " and " + subject + ". Sorted.")';
const A_ANSWERS = ['The Quiet Girl', 'DT'];
const B_ANSWERS = ['pizza', 'Armagh'];
/* what A's screen really says, in the order A meets it, when A tests B's bot */
const EXPECTED_BEATS = [
  ['bot', 'Hiya. Answer me these.'],
  ['bot', 'What is the best film you have seen?'],
  ['you', 'The Quiet Girl'],
  ['bot', 'What is your favourite subject?'],
  ['you', 'DT'],
  ['bot', 'Good shout - The Quiet Girl.'],
  ['bot', 'So: The Quiet Girl and DT. Sorted.']
];

async function shot(page, name) {
  try { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); } catch (e) {}
}

/* ---- READABILITY, KEYED BY STATE (the second-sit fix) ------------------- */
const stateSeen = new Set();
const contrastHits = [], stepsHits = [], fitsHits = [];
async function auditState(page, tag) {
  try {
    const sig = await page.evaluate(q => eval(q)(), SA.SIG);
    const steps = await page.evaluate(q => eval(q)(), SA.STEPS_QUERY);
    steps.forEach(f => {
      const line = tag + ': ' + SA.describeSteps(f);
      if (stepsHits.indexOf(line) === -1) { stepsHits.push(line); log('  STEPS-NOT-LEFT ' + line); }
    });
    const fits = await page.evaluate(q => eval(q)(), SA.FITS_QUERY);
    fits.forEach(f => {
      const line = tag + ': ' + SA.describeFits(f);
      if (fitsHits.indexOf(line) === -1) { fitsHits.push(line); log('  OVERFLOWS-CARD ' + line); }
    });
    if (stateSeen.has(sig)) return;
    stateSeen.add(sig);
    await SA.settle(page);
    const overlay = await SA.overlayRoot(page);
    const rects = await page.evaluate(CA.COLLECT, [[], [], overlay]);
    if (!rects.length) return;
    const png = await SA.measureShot(page, overlay);
    const measured = await page.evaluate(CA.MEASURE, ['data:image/png;base64,' + png.toString('base64'), rects]);
    measured.forEach(m => {
      if (m.skip || m.icon) return;
      const floor = CA.floorFor(m);
      if (m.ratio >= floor) return;
      const line = tag + ': ' + m.sel + ' — ' + m.ratio + ':1 (needs ' + floor + '), ink ' + m.ink +
        ' on ' + m.plate + '  "' + String(m.text || '').slice(0, 44) + '"' +
        '   [overlay=' + String(overlay) + ']';
      if (contrastHits.indexOf(line) === -1) {
        contrastHits.push(line); log('  UNREADABLE ' + line);
        shot(page, 'unreadable-' + String(tag).replace(/[^\w-]/g, '_') + '-' + contrastHits.length);
      }
    });
  } catch (e) { log('  state audit could not run at ' + tag + ': ' + e.message); }
}

/* ---- the two pupils ------------------------------------------------------ */
async function open(ctx, persona) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/ks3-dt/platform/index.html?class=Demo-9A&as=' + persona, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  return page;
}
async function seed(page) {
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks['Demo-9A'] = db.locks['Demo-9A'] || {};
    for (const n of ['1', '2', '3']) db.locks['Demo-9A'][n] = { u: now, on: 1 };
    db.cfg['Demo-9A'] = db.cfg['Demo-9A'] || {};
    db.cfg['Demo-9A'].pairing = { on: 1 };
    const L = { '1': [2, 10, 'sit1=1', '1', '222|1', 100, 10, 0, '', 0, 0], '2': [2, 10, 'sit2=1', '1', '222|1', 101, 10, 0, '', 0, 0] };
    db.pupils = db.pupils || {};
    for (const [k, n] of [['aoife.mcgrath@demo', 'Aoife McGrath'], ['leah.hughes@demo', 'Leah Hughes']]) {
      const kk = 'Demo-9A:' + k;
      db.pupils[kk] = Object.assign(db.pupils[kk] || { n: n, cn: '', j: 1, xp: 0, g: '' }, { L: JSON.parse(JSON.stringify(L)) });
    }
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
}
async function openLesson3(page, tag) {
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(800);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Lesson\s*3/i.test(e.textContent));
    if (t) t.click();
  });
  await sleep(3000);
  await WALK.primeDevKeys(page, BASE);
  log('[' + tag + '] opened Lesson 3');
}
const chunkNow = (page) => page.evaluate(WALK.chunkNow);

async function advance(page, tag, target, maxTurns) {
  for (let i = 0; i < maxTurns; i++) {
    const ck = await chunkNow(page);
    if (ck === target) { log('[' + tag + '] reached ' + target + ' after ' + i + ' turns'); return true; }
    await auditState(page, tag + ':' + ck);
    const st = await page.evaluate(WALK.detectKind);
    const mv = st && WALK.MOVES[st.kind];
    if (mv) {
      await page.evaluate(([src]) => { (new Function('return (' + src + ')')())(); }, [String(mv)]);
      await sleep(WALK.SETTLE[st.kind] || 600);
      continue;
    }
    if (st && WALK.ACTIONS && WALK.ACTIONS[st.kind]) { try { await WALK.ACTIONS[st.kind](page); } catch (e) {} await sleep(800); continue; }
    await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const vis = (e) => e && e.offsetParent !== null && !e.disabled;
      const pop = q('.badge-pop button'); if (vis(pop)) { pop.click(); return; }
      const skip = q('.intro-skip'); if (vis(skip)) { skip.click(); return; }
      const opt = q('.chunk-host .q-opt'); if (vis(opt)) { opt.click(); return; }
      for (const b of document.querySelectorAll('.chunk-host button.primary-btn, .chunk-host button.ghost-btn')) {
        if (vis(b) && !/Running out of time|leave/i.test(b.textContent)) { b.click(); return; }
      }
      const ta = q('.chunk-host textarea');
      if (vis(ta) && !ta.value) { ta.value = 'A paired-harness answer, long enough to pass the floor.'; ta.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await sleep(700);
    if (i > 6 && i % 12 === 0) log('[' + tag + '] still at ' + ck + ' (kind=' + (st && st.kind) +
      ' label=' + JSON.stringify(String((st && st.label) || '').slice(0, 40)) + ') turn ' + i);
  }
  log('[' + tag + '] FAILED to reach ' + target + ' — stuck at ' + (await chunkNow(page)));
  return false;
}

async function fillEditor(page, code) {
  await page.evaluate((c) => {
    const ta = document.querySelector('.chunk-host .pye-code');
    ta.value = c; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
  }, code);
}

async function runAndConverse(page, tag, replies) {
  await page.evaluate(() => { for (const b of document.querySelectorAll('.chunk-host button')) if (/RUN my bot/i.test(b.textContent) && !b.disabled) { b.click(); return; } });
  const left = replies.slice();
  for (let i = 0; i < 16; i++) {
    await sleep(1300);
    const state = await page.evaluate(() => {
      const inp = document.querySelector('.chunk-host .pyx-reply');
      const v = document.querySelector('.chunk-host .pyrun-verdict:not([hidden])');
      return { ask: !!(inp && inp.offsetParent !== null && !inp.disabled), verdict: v ? v.textContent.slice(0, 40) : null };
    });
    if (state.ask) {
      const word = left.shift() || 'chips';
      await page.evaluate((w) => {
        const inp = document.querySelector('.chunk-host .pyx-reply');
        inp.value = w; inp.dispatchEvent(new Event('input', { bubbles: true }));
        const btn = inp.closest('div').querySelector('button') || inp.parentElement.querySelector('button');
        if (btn) btn.click();
      }, word);
      continue;
    }
    if (state.verdict) { log('[' + tag + '] verdict: ' + state.verdict.replace(/\s+/g, ' ')); return true; }
  }
  return false;
}

/* ================= THE RUN ================================================ */
(async () => {
  log('=== qa-swap-paired — two pupils, one Swap, ' + BASE + ' ===');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const A = await open(ctx, 'aoife');
  await seed(A);
  const B = await open(ctx, 'leah');
  await A.reload({ waitUntil: 'domcontentloaded' }); await sleep(2000);
  await openLesson3(A, 'A'); await openLesson3(B, 'B');

  const okA = await advance(A, 'A', 'mybot', 170);
  const okB = await advance(B, 'B', 'mybot', 170);
  if (!okA || !okB) {
    fail('SETUP', 'could not reach the mybot card on both accounts');
    await shot(A, 'stuck-A'); await shot(B, 'stuck-B');
    return finish(browser);
  }

  /* ---- S2(a): A DRAGGED CHIP LANDS ON ITS OWN LINE ---------------------
     His merged line 3 and the SyntaxError that followed. The chips were wired
     for CLICK only, so dragging one handed the job to the browser's native
     text-drag, which splices raw characters at the drop caret — straight
     through the middle of a working line, bypassing the editor's own newline
     discipline. The control performs a REAL HTML5 drag of the chip onto the
     textarea with the caret parked mid-line, and then asks Python. */
  await A.evaluate(() => { const b = document.querySelector('.chunk-host .pye-start'); if (b && b.offsetParent !== null) b.click(); });
  await B.evaluate(() => { const b = document.querySelector('.chunk-host .pye-start'); if (b && b.offsetParent !== null) b.click(); });
  await sleep(900);
  const dragged = await A.evaluate(() => {
    const ta = document.querySelector('.chunk-host .pye-code');
    const chip = document.querySelector('.chunk-host .pyp-chip');
    if (!ta || !chip) return { ran: false, why: 'no chip or no editor on this card' };
    const before = 'answer1 = input("age?")\nanswer2 = input("colour?")\nprint("Verdict: " + answer1 + " and " + answer2 + ".")';
    ta.value = before;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    /* the caret parked INSIDE line 3, just before its closing bracket — exactly
       where a pointer leaves it, and exactly where a native drop splices */
    const pos = ta.value.lastIndexOf(')');
    ta.focus(); ta.setSelectionRange(pos, pos);
    const code = (chip.querySelector('.pyp-chip-code') || {}).textContent || '';
    const dt = new DataTransfer();
    try { dt.setData('text/plain', code); } catch (e) {}
    const r = chip.getBoundingClientRect(), t = ta.getBoundingClientRect();
    const at = { clientX: t.left + t.width / 2, clientY: t.top + 14 };
    chip.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt,
      clientX: r.left + 6, clientY: r.top + 6 }));
    ta.dispatchEvent(new DragEvent('dragenter', Object.assign({ bubbles: true, cancelable: true, dataTransfer: dt }, at)));
    const over = new DragEvent('dragover', Object.assign({ bubbles: true, cancelable: true, dataTransfer: dt }, at));
    ta.dispatchEvent(over);
    const drop = new DragEvent('drop', Object.assign({ bubbles: true, cancelable: true, dataTransfer: dt }, at));
    ta.dispatchEvent(drop);
    chip.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return {
      ran: true,
      chip: String(code).trim(),
      draggable: chip.getAttribute('draggable'),
      /* THE MEASUREMENT THAT MATTERS. A synthetic drop cannot make headless
         Chromium perform its own text insertion, so asking "did the text get
         spliced?" would pass on any build and prove nothing. What CAN be asked,
         and is the whole mechanism, is whether the page CANCELLED the browser's
         default drop. Uncancelled, the default IS the splice — raw characters at
         the drop caret, mid-line, past the editor's newline discipline. That is
         his merged line 3. */
      prevented: drop.defaultPrevented,
      overPrevented: over.defaultPrevented,
      value: ta.value
    };
  });
  if (!dragged.ran) fail('S2a', dragged.why);
  else {
    log('[A] chip drag: draggable=' + dragged.draggable + ' drop cancelled=' + dragged.prevented);
    const lines = String(dragged.value).split('\n');
    const merged = lines.filter(l => (l.match(/input\(/g) || []).length > 1 ||
      (l.match(/print\(/g) || []).length > 1);
    if (!dragged.prevented)
      fail('S2a', 'the editor does not cancel a chip drop, so the browser splices the raw line at ' +
        'the drop caret — mid-line, past ed.insert(). draggable=' + dragged.draggable);
    else if (merged.length)
      fail('S2a', 'a dragged chip merged two statements onto one line: ' + JSON.stringify(merged[0]).slice(0, 140));
    else if (lines.indexOf(dragged.chip) === -1)
      fail('S2a', 'the dragged chip did not land on a line of its own — lines: ' + JSON.stringify(lines).slice(0, 200));
    else pass('S2a', 'a dragged chip is cancelled by the editor and lands on a whole line of its own');
    await shot(A, '01-drag-A');
  }

  /* ---- S2(b): A RUN THAT DIED NEVER BLAMES HER INPUTS ------------------
     Measured on V59: a program holding two real input() lines, killed by a
     SyntaxError on the spliced line, rendered ALL THREE checklist items as
     "NOT WORKING YET" — including "Your bot asks two questions", which was
     true. The checklist has to say the run stopped, not that her work failed. */
  await A.evaluate(() => {
    const ta = document.querySelector('.chunk-host .pye-code');
    ta.value = 'answer1 = input("age?")\nanswer2 = input("colour?")\nprint("Verdict: " + answer1 + " and " + answer2 + " - that is" a good pair.")';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await A.evaluate(() => { for (const b of document.querySelectorAll('.chunk-host button')) if (/RUN my bot/i.test(b.textContent) && !b.disabled) { b.click(); return; } });
  await sleep(5000);
  const died = await A.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.chunk-host .pyf-item'));
    return {
      err: !!document.querySelector('.chunk-host .pyc-err, .chunk-host .pyc.is-bad'),
      inputs: (document.querySelector('.chunk-host .pye-code').value.match(/input\(/g) || []).length,
      notyet: items.filter(x => /is-notyet/.test(x.className)).length,
      total: items.length,
      nudges: items.filter(x => { const n = x.querySelector('.pyf-nudge'); return n && !n.hidden; }).length,
      verdict: (document.querySelector('.chunk-host .pyrun-verdict:not([hidden])') || {}).textContent || ''
    };
  });
  log('[A] dead run: error=' + died.err + ' inputs=' + died.inputs + ' notyet=' + died.notyet + '/' + died.total + ' nudges=' + died.nudges);
  await shot(A, '02-dead-run-A');
  if (!died.err) fail('S2b', 'the control program did not actually die — the check proves nothing');
  else if (died.notyet > 0 || died.nudges > 0)
    fail('S2b', 'a run that died before the probes still marked ' + died.notyet + ' of ' + died.total +
      ' checklist items NOT WORKING YET (' + died.nudges + ' counting nudges) — two of them were true');
  else if (!/stopped/i.test(String(died.verdict)))
    fail('S2b', 'the card never said the program stopped before it could be checked: ' +
      JSON.stringify(String(died.verdict).replace(/\s+/g, ' ').slice(0, 120)));
  else pass('S2b', 'a dead run says it stopped and blames nothing');
  await auditState(A, 'A:mybot-dead-run');

  /* ---- both write real bots and converse ---- */
  await fillEditor(A, BOT_A);
  await runAndConverse(A, 'A', ['pizza', 'Down']);
  await fillEditor(B, BOT_B);
  await B.evaluate(() => { const b = document.querySelector('.chunk-host .pye-start'); if (b && b.offsetParent !== null) b.click(); });
  await runAndConverse(B, 'B', ['Up', 'Maths']);
  await auditState(A, 'A:mybot-verdict');

  /* ---- S3: the offer card ---------------------------------------------- */
  for (const [P, tag] of [[A, 'A'], [B, 'B']]) {
    await P.evaluate(() => { for (const b of document.querySelectorAll('.chunk-host button')) if (/Next step|Continue/i.test(b.textContent) && !b.disabled && b.offsetParent !== null) { b.click(); return; } });
    await sleep(1400);
    const offer = await P.evaluate(() => {
      const c = document.querySelector('.chunk-host .py-offer-card');
      return c ? { text: (c.innerText || '').replace(/\s+/g, ' ') } : null;
    });
    if (!offer) { fail('S3', '[' + tag + '] the offer card never appeared'); continue; }
    await auditState(P, tag + ':offer-card');
    await shot(P, '03-offer-' + tag);
    if (!/Swap/i.test(offer.text))
      fail('S3', '[' + tag + '] the offer card never says the Chatbot Swap is next either way: ' +
        JSON.stringify(offer.text.slice(0, 140)));
    else pass('S3', '[' + tag + '] the offer card keeps the briefing\'s promise about the Swap');
    await P.evaluate(() => { const b = document.querySelector('.py-offer-no'); if (b) b.click(); });
    await sleep(1300);
  }

  /* ---- into the Swap ---------------------------------------------------- */
  await advance(A, 'A', 'chatswap', 30); await advance(B, 'B', 'chatswap', 30);
  await auditState(A, 'A:chatswap-intro');

  /* ---- S12: the waiting screen keeps its own promise -------------------
     Only A opens the door first, so A really waits. The long-wait hint says
     "press the button below and test your own bot instead"; until this round
     the only button there LEFT the Swap. The wait is 3 minutes in the shipped
     build, so the clock is wound forward in the page rather than slept through:
     the assertion is about what the card offers, not about how long it took. */
  /* the wait is three real minutes in the shipped build, so the CLOCK is wound
     forward and the real code path runs: real hint, real button, real handler,
     real click. That is what `PairKit.WAIT_HINT_MS` is a named constant for
     (and it has its own row in HUMAN_PACE_INVENTORY.md). A build that has no
     such constant simply never reaches the state, and the check says so. */
  await A.evaluate(() => { if (window.PairKit) PairKit.WAIT_HINT_MS = 1500; });
  await A.evaluate(() => { for (const b of document.querySelectorAll('.chunk-host button')) if (/Open the door|Open the workshop door/i.test(b.textContent) && !b.disabled) { b.click(); return; } });
  await sleep(6000);
  const waitCard = await A.evaluate(() => {
    const box = document.querySelector('.chunk-host .pair-wait');
    return box ? { has: true } : null;
  });
  if (waitCard) {
    await sleep(600);
    const waitState = await A.evaluate(() => {
      const box = document.querySelector('.chunk-host .pair-wait');
      const hint = box.querySelector('.pw-hint');
      return {
        hint: hint && !hint.hidden ? (hint.textContent || '').trim() : '',
        buttons: Array.from(box.querySelectorAll('button')).map(b => (b.textContent || '').trim())
      };
    });
    log('[A] waiting card hint: ' + JSON.stringify(waitState.hint.slice(0, 90)) + '  buttons: ' + JSON.stringify(waitState.buttons));
    await auditState(A, 'A:pair-wait');
    await shot(A, '04-wait-A');
    if (/test your own bot|your own bot/i.test(waitState.hint) &&
        !waitState.buttons.some(b => /own bot/i.test(b)))
      fail('S12', 'the long-wait hint promises a button that tests her own bot and no such button exists — ' +
        JSON.stringify(waitState.buttons));
    else if (waitState.buttons.some(b => /own bot/i.test(b)))
      pass('S12', 'the waiting screen carries the button its hint promises');
    else log('  (S12 not applicable on this build: the hint names no button)');
  } else log('  (A did not land on the waiting card — pairing was immediate)');

  await B.evaluate(() => { for (const b of document.querySelectorAll('.chunk-host button')) if (/Open the door|Open the workshop door/i.test(b.textContent) && !b.disabled) { b.click(); return; } });
  await sleep(1500);
  for (const [P, tag] of [[A, 'A'], [B, 'B']]) {
    for (let i = 0; i < 25; i++) {
      const hit = await P.evaluate(() => { const b = document.querySelector('.pair-pop button.primary-btn'); if (b && !b.disabled) { b.click(); return true; } return false; });
      if (hit) { log('[' + tag + '] PARTNER FOUND -> started'); break; }
      await sleep(1000);
    }
  }
  await sleep(3500);

  /* ---- phase 3: A is the tester, B watches ------------------------------ */
  async function testPartnerBot(P, tag, replies) {
    const left = replies.slice();
    for (let i = 0; i < 40; i++) {
      const st = await P.evaluate(() => {
        const inp = document.querySelector('.chunk-host .pyx-reply');
        const rep = Array.from(document.querySelectorAll('.chunk-host button')).find(b => /Write the report/i.test(b.textContent) && !b.disabled && b.offsetParent !== null);
        return { ask: !!(inp && inp.offsetParent !== null && !inp.disabled), report: !!rep,
                 watching: !!document.querySelector('.chunk-host .swap-watch'),
                 testing: !!document.querySelector('.chunk-host .swap-test') };
      });
      if (st.report) { log('[' + tag + '] finished with the partner bot'); return 'tester'; }
      if (st.watching && !st.testing && i > 3) return 'builder';
      if (st.ask) {
        const w = left.shift() || 'chips';
        await P.evaluate((word) => {
          const inp = document.querySelector('.chunk-host .pyx-reply');
          inp.value = word; inp.dispatchEvent(new Event('input', { bubbles: true }));
          const btn = inp.closest('div').querySelector('button') || inp.parentElement.querySelector('button');
          if (btn) btn.click();
        }, w);
        log('[' + tag + '] answered the partner bot: ' + w);
      }
      await sleep(1500);
    }
    return 'stuck';
  }
  const roleA = await testPartnerBot(A, 'A', A_ANSWERS);
  const roleB = await testPartnerBot(B, 'B', B_ANSWERS);
  log('roles: A=' + roleA + ' B=' + roleB);
  const tester = roleA === 'tester' ? A : B;
  const builder = roleA === 'tester' ? B : A;
  const testerTag = roleA === 'tester' ? 'A' : 'B';
  const builderTag = roleA === 'tester' ? 'B' : 'A';
  if (roleA === roleB) { fail('SETUP', 'both accounts took the same seat (' + roleA + ') — the pair never formed'); return finish(browser); }

  /* ---- S5: the finished-with-their-bot line ---------------------------- */
  await auditState(tester, testerTag + ':test-done');
  await shot(tester, '05-testdone-' + testerTag);

  /* ---- S6: the watch feed equals the tester's own conversation, IN ORDER -
     The fault, measured on V59: the builder's feed showed
       bot: Q1 · tester: reply1 · tester: reply2
     — the second question never arrived and not one printed line ever did. Two
     causes: prints were relayed only as an end-of-run burst, and the channel
     refuses more than one message per member per second, silently. */
  await sleep(9000);
  const feed = await builder.evaluate(() => Array.from(document.querySelectorAll('.swap-beat'))
    .map(x => (x.textContent || '').replace(/\s+/g, ' ').trim()));
  log('[' + builderTag + '] watch feed: ' + JSON.stringify(feed));
  await auditState(builder, builderTag + ':watch');
  await shot(builder, '06-watch-' + builderTag);
  const wantBeats = EXPECTED_BEATS.map(([who, t]) => (who === 'bot' ? 'bot' : 'tester') + ': ' + t);
  if (JSON.stringify(feed) !== JSON.stringify(wantBeats)) {
    fail('S6', 'the watch feed is not the tester\'s conversation in order.\n      wanted: ' +
      JSON.stringify(wantBeats) + '\n      got:    ' + JSON.stringify(feed));
  } else pass('S6', 'the watch feed is the tester\'s conversation, in order, prints included');

  /* S6(b): the transcript behind the feed is complete, so a feed mounted late
     can be filled in. On V59 there was no transcript at all — a beat that
     arrived while the watch screen was not mounted was gone for good. */
  const tx = await builder.evaluate(() => (window.PairKit && typeof PairKit.transcript === 'function')
    ? PairKit.transcript().map(e => String(e[3] || '')) : null);
  if (!tx) fail('S6b', 'PairKit keeps no replayable transcript — a beat that arrives while the watch ' +
    'screen is not mounted is lost for good, and a pupil who finishes late loses the start of her own bot\'s session');
  else {
    const missing = wantBeats.filter(w => !tx.some(t => t.indexOf(w) !== -1));
    if (missing.length) fail('S6b', 'the channel transcript is missing ' + missing.length + ' beat(s): ' + JSON.stringify(missing));
    else pass('S6b', 'the channel transcript holds every beat, so a late mount can be filled in');
  }

  /* ---- S7: the report's second box allows a clean bill ------------------ */
  await tester.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Write the report/i.test(x.textContent) && !x.disabled); if (b) b.click(); });
  await sleep(1100);
  const labels = await tester.evaluate(() => {
    const lab = Array.from(document.querySelectorAll('.chunk-host .swap-lab')).map(l => (l.textContent || '').trim());
    return lab;
  });
  log('[' + testerTag + '] report labels: ' + JSON.stringify(labels));
  await auditState(tester, testerTag + ':report-form');
  const second = labels[1] || '';
  if (!/if you would change nothing|change nothing/i.test(second))
    fail('S7', 'the report\'s second box still forces a criticism: ' + JSON.stringify(second));
  else pass('S7', 'the report\'s second box allows a clean bill');

  /* ---- both file reports ----------------------------------------------- */
  async function sendReport(P, tag, worked, fix) {
    await sleep(GUARD_MS);
    await P.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Write the report/i.test(x.textContent) && !x.disabled); if (b) b.click(); });
    await sleep(1200);
    let ok = await P.evaluate(([w, f]) => {
      const a = document.querySelector('#swap-worked'), b2 = document.querySelector('#swap-fix');
      if (!a || !b2) return false;
      a.value = w; a.dispatchEvent(new Event('input', { bubbles: true }));
      b2.value = f; b2.dispatchEvent(new Event('input', { bubbles: true }));
      const s = document.querySelector('.swap-send-report');
      if (s && !s.disabled) { s.click(); return true; }
      return false;
    }, [worked, fix]);
    if (!ok) {
      /* one retry, and only one: a form that is not there after two honest
         attempts is a finding, not a flake */
      await sleep(2000);
      await P.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Write the report/i.test(x.textContent) && !x.disabled); if (b) b.click(); });
      await sleep(1200);
      ok = await P.evaluate(([w, f]) => {
        const a = document.querySelector('#swap-worked'), b2 = document.querySelector('#swap-fix');
        if (!a || !b2) return false;
        a.value = w; a.dispatchEvent(new Event('input', { bubbles: true }));
        b2.value = f; b2.dispatchEvent(new Event('input', { bubbles: true }));
        const sBtn = document.querySelector('.swap-send-report');
        if (sBtn && !sBtn.disabled) { sBtn.click(); return true; }
        return false;
      }, [worked, fix]);
    }
    log('[' + tag + '] report ' + (ok ? 'sent' : 'COULD NOT BE SENT'));
    return ok;
  }
  await sendReport(tester, testerTag, 'It asked two easy questions and used both answers.', 'Nothing — it worked exactly as it should.');
  /* THE BUILDER READS HER REPORT AND TAKES THE TESTER'S SEAT — and the press has
     to wait out the platform's OWN one-press guard. `App.armButton` ignores a
     click in the first 350 ms after a control mounts (DFM 104, so a pupil cannot
     double-fire a card that has just appeared under her finger), and a harness
     that clicks the instant a button exists has its press swallowed roughly one
     run in three. That is what the third consecutive run caught: B never left
     the watch screen, so it never tested, so it never sealed — the rig's fault,
     not the build's. It now presses only after the guard, and keeps pressing
     until the screen has actually changed. */
  let moved = false;
  for (let i = 0; i < 30; i++) {
    const st = await builder.evaluate(() => ({
      go: !!Array.from(document.querySelectorAll('.swap-go')).find(b => b.offsetParent !== null),
      testing: !!document.querySelector('.chunk-host .swap-test')
    }));
    if (st.testing) { moved = true; break; }
    if (st.go) {
      await sleep(GUARD_MS);
      await builder.evaluate(() => {
        const g = Array.from(document.querySelectorAll('.swap-go')).find(b => b.offsetParent !== null && !b.disabled);
        if (g) g.click();
      });
    }
    await sleep(1400);
  }
  log('[' + builderTag + '] ' + (moved ? 'read the report and took the tester\'s seat' : 'NEVER LEFT THE WATCH SCREEN'));
  await sleep(1500);
  await testPartnerBot(builder, builderTag, roleA === 'tester' ? B_ANSWERS : A_ANSWERS);
  await auditState(builder, builderTag + ':test-done');
  await sendReport(builder, builderTag, 'Both questions were easy to answer.', 'A full stop after the answers.');

  /* ---- S8: EXACTLY ONCE, ON EACH SIDE ---------------------------------
     Measured on V59: report cards multiplied 2→13 and 1→12 in 24 seconds, one
     per poll, for ever. `onPoll` called `showMyReport` on every tick with no
     shown-latch. Counted here over the same 24 seconds. */
  log('--- S8: counting report cards over 24s on both sides ---');
  let maxA = 0, maxB = 0;
  for (let t = 0; t <= 24; t += 4) {
    const nA = await A.evaluate(() => document.querySelectorAll('.swap-myreport').length);
    const nB = await B.evaluate(() => document.querySelectorAll('.swap-myreport').length);
    maxA = Math.max(maxA, nA); maxB = Math.max(maxB, nB);
    log('  t=' + t + 's   A ' + nA + ' report card(s), B ' + nB);
    await sleep(4000);
  }
  await shot(A, '08-reports-A'); await shot(B, '08-reports-B');
  if (maxA > 1 || maxB > 1)
    fail('S8', 'a report card rendered more than once (A peaked at ' + maxA + ', B at ' + maxB +
      ') — one new card per poll tick is his infinite loop');
  else pass('S8', 'each report rendered exactly once on each side (A ' + maxA + ', B ' + maxB + ')');

  /* ---- S8(b): the seal, on BOTH screens -------------------------------- */
  for (const [P, tag] of [[A, 'A'], [B, 'B']]) {
    for (let i = 0; i < 20; i++) {
      const sealed = await P.evaluate(() => !!document.querySelector('.swap-seal'));
      if (sealed) break;
      await sleep(GUARD_MS);
      await P.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.chunk-host button, .swap-go'))
          .find(x => x.offsetParent !== null && !x.disabled && !/Running out of time|leave/i.test(x.textContent));
        if (b) b.click();
      });
      await sleep(1400);
    }
    const sealed = await P.evaluate(() => !!document.querySelector('.swap-seal'));
    if (!sealed) fail('S8c', '[' + tag + '] never reached the seal card');
    else {
      pass('S8c', '[' + tag + '] reached the seal');
      await auditState(P, tag + ':seal');
      await shot(P, '09-seal-' + tag);
    }
  }

  return finish(browser);

  async function finish(br) {
    if (contrastHits.length) contrastHits.forEach(h => findings.push('CONTRAST: ' + h));
    if (stepsHits.length) stepsHits.forEach(h => findings.push('S4: ' + h));
    if (fitsHits.length) fitsHits.forEach(h => findings.push('S9: ' + h));
    log('\nDERIVED AUDITS — ' + stateSeen.size + ' distinct screen state(s) measured across both accounts');
    log('  contrast exemptions, declared: ' + CA.EXEMPTIONS.join(' · '));
    log('  state-audit exemptions, declared: ' + SA.EXEMPTIONS.join(' · '));
    fs.writeFileSync(path.join(OUT, '_swap-paired.log'), LOG.join('\n') + '\n');
    fs.writeFileSync(path.join(OUT, '_swap-paired.json'), JSON.stringify({
      base: BASE, states: stateSeen.size, findings: findings,
      contrast: contrastHits, steps: stepsHits, fits: fitsHits
    }, null, 1) + '\n');
    try { await br.close(); } catch (e) {}
    if (EXPECT_FAIL) {
      if (!findings.length) {
        console.error('\nCONTROL FAILED: --expect-fail was asked for and this build passed every ' +
          'assertion. A harness cannot be credited with catching what it does not catch (DFM 196).');
        process.exit(1);
      }
      console.log('\nCONTROL OK — the pre-fix build fails the paired sit. ' + findings.length + ' finding(s):');
      findings.forEach(f => console.log('  ✗ ' + f));
      process.exit(0);
    }
    if (findings.length) {
      console.log('\nqa-swap-paired: FAILED — ' + findings.length + ' finding(s)');
      findings.forEach(f => console.log('  ✗ ' + f));
      process.exit(1);
    }
    console.log('\nqa-swap-paired: PASS — the two-account Swap is clean end to end (' +
      stateSeen.size + ' states measured)');
    process.exit(0);
  }
})().catch(e => { console.error('CRASH: ' + e.stack); process.exit(1); });
