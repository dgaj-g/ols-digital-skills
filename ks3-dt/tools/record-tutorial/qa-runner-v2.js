/* qa-runner-v2.js — RUNNER v2, PROVED BY RUNNING PYTHON (spec §A, harness-first).
 *
 * WHAT THIS REFUSES TO TAKE ON TRUST.
 * v2 adds three things that decide what a stuck pupil reads and whether her work
 * is judged fairly: the FINE error kinds (measured in the sandbox at §B, not
 * assumed from CPython), the input() suspension, and the feature probes that say
 * MATCHED or NOT YET on a free build. Each is checked by producing the real
 * behaviour, and each carries a CONTROL that must FAIL (DFM 196).
 *
 * THE CONTROL THAT MATTERS MOST is the byte-identical one: j2-02 and j3-02 carry
 * only v1's coarse error keys, and DFM 176's lock says their screens may not
 * move. So a v1-shaped `errorWords` map must still win the lookup for every
 * error those lessons can produce — proved here, not asserted.
 *
 *   node qa-runner-v2.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('./node_modules/playwright');

const PLAT = path.join(__dirname, '..', '..', 'platform');
const SKULPT = path.join(PLAT, 'assets', 'vendor', 'skulpt');
const ENGINES = path.join(PLAT, 'engines.js');

const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };
const control = (failed, m) => { console.log((failed ? '  PASS ' : '  FAIL ') + 'CONTROL: ' + m); if (!failed) FAILS.push('CONTROL ' + m); };

/* The engine is loaded as the app loads it — the real file, not a re-typed copy
   of its rules (DFM 144: a second copy is a second chance to disagree). */
const HARNESS_PAGE = `<!doctype html><meta charset="utf-8"><body>
<div id="host"></div>
<script>window.OLS_ASSET_BASE='';</script>
</body>`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('    [page error] ' + m.text()); });
  await page.setContent(HARNESS_PAGE);
  await page.addScriptTag({ path: path.join(PLAT, 'app.js') });
  await page.addScriptTag({ path: ENGINES });
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt.min.js') });
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt-stdlib.js') });
  /* the library is already in the page, so PyRun.load() must not fetch it again */
  await page.evaluate(() => { window.PyRun._p = Promise.resolve(true); });

  console.log('=== 1. THE FINE ERROR KINDS (measured at §B, resolved here) ===');
  const kinds = await page.evaluate(async () => {
    const cases = {
      name:     'print("Hello " + naem)\n',
      type:     'score = 2\nprint("Score: " + score)\n',
      badinput: 'x = 1\n  print(x)\n',
      eof:      'print("hello"\n',
      unindent: 'for t in ["a","b"]:\n    print(t)\n  print(t)\n',
      index:    'p=["a"]\nprint(p[5])\n',
      attr:     'p=[]\np.add("x")\n',
      value:    'print(int("hello"))\n',
      zero:     'print(1/0)\n',
      timelimit:'while True:\n    pass\n'
    };
    const out = {};
    for (const k of Object.keys(cases)) {
      const r = await PyRun.run(cases[k], { limitMs: 2500 });
      out[k] = { err: r.err, fine: PyRun.errKind2(r.err), coarse: PyRun.errKind(r.err) };
    }
    return out;
  });
  for (const k of Object.keys(kinds)) {
    check(kinds[k].fine === k, `a real ${k} mistake is classified as "${k}" (Python said: ${kinds[k].err.slice(0, 60)})`);
  }
  /* The coarse parent is whatever the UNCHANGED v1 classifier really returns for
     the same text — asserted here so a future edit to either classifier that
     moved a locked lesson's line would fail loudly. Note `unindent -> syntax`,
     not `indent`: Skulpt's wording is a SyntaxError, and v1's `indent` branch
     only ever matched CPython's IndentationError. */
  check(kinds.badinput.coarse === 'syntax' && kinds.eof.coarse === 'syntax' &&
        kinds.unindent.coarse === 'syntax' && kinds.index.coarse === 'other' &&
        kinds.attr.coarse === 'other' && kinds.zero.coarse === 'other',
    'every fine kind falls back to the coarse kind v1 itself computes');

  console.log('\n=== 2. THE LOCKED LESSONS ARE UNTOUCHED (DFM 176) ===');
  const v1 = await page.evaluate(async () => {
    /* exactly the shape j2-02 and j3-02 author: v1 keys only, no fine keys */
    const words = { name: 'V1-NAME', type: 'V1-TYPE', syntax: 'V1-SYNTAX', indent: 'V1-INDENT',
                    timelimit: 'V1-TIME', value: 'V1-VALUE', other: 'V1-OTHER' };
    const out = {};
    for (const [k, code] of Object.entries({
      name: 'print(naem)\n', type: 's=2\nprint("x"+s)\n', syntaxA: 'print("hi)\n',
      syntaxB: 'print("hi"\n', indent: 'for t in ["a","b"]:\n    print(t)\n  print(t)\n',
      other: 'p=["a"]\nprint(p[5])\n'
    })) {
      const r = await PyRun.run(code, { limitMs: 2500 });
      out[k] = PyRun.plain(r.err, words).text;
    }
    return out;
  });
  check(v1.name === 'V1-NAME' && v1.type === 'V1-TYPE', 'a v1 map still answers NameError and TypeError');
  check(v1.syntaxA === 'V1-SYNTAX' && v1.syntaxB === 'V1-SYNTAX', 'both syntax shapes still land on the v1 "syntax" line');
  /* ⚠ A FINDING IN A LOCKED LESSON, reported and NOT fixed (DFM 221).
     j3-02 authors an `indent` line — "One of the lines has spaces at the front
     that should not be there" — and Skulpt can never produce the error that
     reads it, because the `indent` branch matches only CPython's
     IndentationError/TabError. The sentence is unreachable, and a mis-typed
     blank lands on the `syntax` line instead, which talks about brackets and
     speech marks. It is his call, so it is asserted AS IT IS and printed, not
     changed: this check pins today's real behaviour so nobody "fixes" it into a
     lock break by accident. */
  check(v1.indent === 'V1-SYNTAX',
    'a mis-lined-up indent lands on the v1 "syntax" line (LOCKED-LESSON FINDING: j3-02’s "indent" line is unreachable — reported, his call)');
  check(v1.other === 'V1-OTHER', 'an IndexError still lands on the v1 "other" line');

  const v2 = await page.evaluate(async () => {
    const words = { syntax: 'COARSE', badinput: 'FINE-BADINPUT', index: 'FINE-INDEX' };
    const a = await PyRun.run('print("hi)\n', { limitMs: 2500 });
    const b = await PyRun.run('p=["a"]\nprint(p[5])\n', { limitMs: 2500 });
    return { a: PyRun.plain(a.err, words).text, b: PyRun.plain(b.err, words).text };
  });
  check(v2.a === 'FINE-BADINPUT', 'a lesson that authors the FINE key gets the fine line, not the coarse one');
  check(v2.b === 'FINE-INDEX', 'a fine key with no coarse parent in the map still wins');
  control(v1.other !== 'FINE-INDEX', 'a lesson without the fine key never reads another lesson’s fine line');

  console.log('\n=== 3. input() IS A REAL WAIT, AND LEAVING IS NEVER A TRAP ===');
  const inp = await page.evaluate(async () => {
    const seen = [];
    const r = await PyRun.run(
      'a = input("What is your name?")\nb = input("What is your favourite food?")\nprint("Hi " + a + ", you like " + b)\n',
      { inputfun: p => { seen.push(p); return new Promise(res => setTimeout(() => res(seen.length === 1 ? 'Anya' : 'chips'), 20)); } });
    /* abandonment: reject the pending answer, the way leaving the screen does */
    const s = PyRun.start('x = input("waiting")\nprint("never")\n',
      { inputfun: () => new Promise(() => {}) });
    setTimeout(() => s.abandon(), 60);
    const ab = await s.p;
    return { ok: r.ok, out: r.out, prompts: seen, abOk: ab.ok, abErr: ab.err, abOut: ab.out };
  });
  check(inp.ok && inp.out === 'Hi Anya, you like chips\n', 'two input() calls run to the right printing');
  check(inp.prompts.length === 2 && inp.prompts[0] === 'What is your name?',
    'the bot’s own question reaches the transcript (inputfunTakesPrompt)');
  check(!inp.abOk && inp.abOut === '', 'abandoning a waiting program settles it, printing nothing');
  control(inp.abOk === false, 'a run left waiting does not report success');

  console.log('\n=== 4. THE FEATURE PROBES, BOTH WAYS (spec §A4) ===');
  const F = [
    { id: 'append', probe: 'grew', mark: '\\.append\\(' },
    { id: 'remove', probe: 'shrank', mark: '\\.remove\\(' },
    { id: 'shuffle', probe: 'varies' },
    { id: 'sort', probe: 'ordered' },
    { id: 'top3', probe: 'block', head: 'now playing', lines: 3 }
  ];
  const GOOD =
    'import random\n' +
    'playlist = ["Zebra Song", "Mango Beat", "Apple Tune"]\n' +
    'playlist.append("New One")\n' +
    'playlist.remove("Mango Beat")\n' +
    'print(random.choice(playlist))\n' +
    'playlist.sort()\n' +
    'print("Now Playing - Top 3")\n' +
    'for t in playlist[0:3]:\n    print(t)\n';
  const feat = await page.evaluate(async ([F, GOOD]) => {
    const outs = {};
    outs.good = await PyRun.checkFeatures(GOOD, F, { seed: 4 });
    /* each MISSING variant removes exactly one feature and nothing else */
    const miss = {
      append: GOOD.replace('playlist.append("New One")\n', ''),
      remove: GOOD.replace('playlist.remove("Mango Beat")\n', ''),
      shuffle: GOOD.replace('print(random.choice(playlist))\n', 'print("always the same")\n'),
      sort: GOOD.replace('playlist.sort()\n', ''),
      top3: GOOD.replace('for t in playlist[0:3]:\n    print(t)\n', 'print(playlist[0])\n')
    };
    for (const k of Object.keys(miss)) outs[k] = await PyRun.checkFeatures(miss[k], F, { seed: 4 });
    outs.broken = await PyRun.checkFeatures('playlist = ["a"\nplaylist.append("b")\n', F, { seed: 4 });
    return outs;
  }, [F, GOOD]);
  const tick = (o, id) => (o.results.find(r => r.id === id) || {}).ok;
  check(F.every(f => tick(feat.good, f.id)), 'a program that really does all five ticks all five');
  for (const f of F) {
    control(!tick(feat[f.id], f.id), `removing "${f.id}" makes exactly that feature NOT YET`);
    const others = F.filter(x => x.id !== f.id);
    /* removing sort also unorders the Top-3 block's own list, so `top3` is
       allowed to move with it; nothing else may. */
    const allowed = f.id === 'sort' ? ['top3'] : (f.id === 'append' || f.id === 'remove' ? ['top3'] : []);
    const collateral = others.filter(x => !tick(feat[f.id], x.id) && allowed.indexOf(x.id) === -1);
    check(collateral.length === 0, `removing "${f.id}" does not knock out ${collateral.length ? collateral.map(c => c.id).join(', ') : 'anything else'}`);
  }
  control(F.every(f => !tick(feat.broken, f.id)), 'a program that cannot run at all ticks nothing');

  console.log('\n=== 5. THE BOT PROBES (j2’s free build) ===');
  const BF = [
    { id: 'asks', probe: 'inputs', min: 2 },
    { id: 'stores', probe: 'echoes' },
    { id: 'verdict', probe: 'joins' }
  ];
  const bot = await page.evaluate(async (BF) => {
    const answers = ['ZZTOPTEST', 'QQCHIPTEST'];
    const good =
      'print("Hello! I am the bench bot.")\n' +
      'band = input("What band do you like?")\n' +
      'food = input("What is your favourite food?")\n' +
      'print("Nice, I have heard of " + band)\n' +
      'print("And " + food + " is a good shout")\n' +
      'print("Verdict: anyone who likes " + band + " and " + food + " is alright by me")\n';
    const one = good.replace('food = input("What is your favourite food?")\n', 'food = "chips"\n');
    const mute = good.replace('print("Nice, I have heard of " + band)\n', 'print("Nice")\n')
                     .replace('print("And " + food + " is a good shout")\n', 'print("Ok")\n')
                     .replace(/print\("Verdict.*\n/, 'print("Verdict: fine")\n');
    const nojoin = good.replace(/print\("Verdict.*\n/, 'print("Verdict: " + band)\n');
    return {
      good: await PyRun.checkFeatures(good, BF, { answers: answers }),
      one: await PyRun.checkFeatures(one, BF, { answers: answers }),
      mute: await PyRun.checkFeatures(mute, BF, { answers: answers }),
      nojoin: await PyRun.checkFeatures(nojoin, BF, { answers: answers })
    };
  }, BF);
  check(BF.every(f => tick(bot.good, f.id)), 'a real two-question bot ticks asks, stores and verdict');
  control(!tick(bot.one, 'asks'), 'a bot that only asks once does not tick "asks"');
  control(!tick(bot.mute, 'stores'), 'a bot that never prints what she typed does not tick "stores"');
  control(!tick(bot.nojoin, 'verdict'), 'a verdict naming only one answer does not tick "verdict"');
  check(tick(bot.nojoin, 'stores'), 'and that same bot still ticks the feature it DOES have');

  console.log('\n=== 6. THE PROBE BLOCK NEVER REACHES HER CONSOLE ===');
  const hid = await page.evaluate(async () => {
    const r = await PyRun.checkFeatures('p = ["a","b"]\nprint("hello")\n',
      [{ id: 'x', probe: 'ordered' }], { seed: 4 });
    return { text: r.base.text, raw: r.base.out, lists: r.base.lists };
  });
  check(hid.text === 'hello\n', 'the console shows only what her program printed');
  check(hid.raw.indexOf('OLSPROBE') !== -1, 'the probe really ran (it is in the raw output)');
  check(JSON.stringify(hid.lists.p) === '["a","b"]', 'the probe reported her list by its own name');

  await browser.close();
  console.log(FAILS.length ? `\nqa-runner-v2 FAILED (${FAILS.length})\n  - ` + FAILS.join('\n  - ')
                           : '\nqa-runner-v2 GREEN');
  process.exit(FAILS.length ? 1 : 0);
})();
