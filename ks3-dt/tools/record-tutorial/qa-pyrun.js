/* qa-pyrun.js — THE PYTHON ENGINES, PROVED BY RUNNING PYTHON.
 *
 * WHY THIS EXISTS AND WHAT IT REFUSES TO TAKE ON TRUST.
 * `pyrun` decides MATCHED or NOT YET by really running a pupil's program and
 * comparing the console against the card's stated target. So every claim the
 * content makes is a claim about a runtime, and the only honest way to check it
 * is to run it: a target that no arrangement of the authored lines can produce
 * would be a card no pupil could ever finish, and nothing about the JSON would
 * look wrong (DFM 146b's rendered-result law, applied to a program's output).
 *
 * IT ALSO PROVES THE DECOYS ARE REAL. Spec §C asks for decoy lines that encode
 * REAL slips. A decoy that quietly produced the right answer would be a lie on
 * the card; a decoy that produced an error the lesson has no plain-words line
 * for would drop a pupil in front of raw Python with nothing underneath it. So
 * each decoy is SUBSTITUTED for its correct twin, run, and required to fail —
 * and the error kind it produces must have a plain-words line in that lesson's
 * own `errorWords`.
 *
 * CONTROLS (DFM 196 — a gate that cannot say no is not a gate):
 *   - a deliberately shuffled order must NOT match;
 *   - the ENGINE must not consult the answer key: with the key stripped, a
 *     correct build still MATCHES, which is what proves the verdict comes from
 *     the run and not from a lookup;
 *   - a console rendered without its plain-words line must fail section 4.
 *
 *   node qa-pyrun.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('./node_modules/playwright');

const SRC = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const ENGINES = path.join(__dirname, '..', '..', 'platform', 'engines.js');
const STYLE = path.join(__dirname, '..', '..', 'platform', 'style.css');
const SKULPT = path.join(__dirname, '..', '..', 'platform', 'assets', 'vendor', 'skulpt');

const FAILS = [];
const check = (c, m) => { console.log((c ? '  PASS ' : '  FAIL ') + m); if (!c) FAILS.push(m); };
const control = (failed, m) => { console.log((failed ? '  PASS ' : '  FAIL ') + 'CONTROL: ' + m); if (!failed) FAILS.push('CONTROL ' + m); };
const log = (m) => console.log(m);

/* ---- every lesson that uses either engine, found rather than listed -------
   DFM 206/K23's law: a thing that exists is a thing that is covered, and the
   list is DERIVED so a new lesson cannot exist without being measured. */
function lessons() {
  const out = [];
  for (const year of ['j1', 'j2', 'j3']) {
    const dir = path.join(SRC, year, 'lessons');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const uses = (j.chunks || []).filter(c => c.engine === 'pyrun' || c.engine === 'snap');
      if (uses.length) out.push({ year, file: f, lesson: j, uses });
    }
  }
  return out;
}

/* the tidy/compare rules, taken from the ENGINE itself rather than re-typed:
   a second copy of a comparison rule is a second chance for the gate and the
   app to disagree (DFM 144). */
const engSrc = fs.readFileSync(ENGINES, 'utf8');
function engineTidyRule() {
  const m = engSrc.match(/tidy: function \(s\) \{[\s\S]*?\n    \},/);
  return m ? m[0] : null;
}

(async () => {
  const found = lessons();
  log('=== 0. COVERAGE (derived, never listed) ===');
  check(found.length > 0, 'at least one lesson uses pyrun/snap (found ' + found.length + ': ' +
    found.map(x => x.lesson.id).join(', ') + ')');
  check(!!engineTidyRule(), 'the engine still owns the tidy/compare rule this gate reads');

  /* ---- 1/2/3: run real Python in a real browser ---------------------- */
  const page = await (await chromium.launch({ headless: true })).newPage();
  await page.goto('about:blank');
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt.min.js') });
  await page.addScriptTag({ path: path.join(SKULPT, 'skulpt-stdlib.js') });
  await page.evaluate(() => {
    window.RUN = function (code, limit) {
      var out = '';
      Sk.configure({
        output: function (t) { out += t; },
        read: function (x) {
          if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) throw 'File not found: ' + x;
          return Sk.builtinFiles.files[x];
        },
        execLimit: limit || 5000, __future__: Sk.python3
      });
      return Sk.misceval.asyncToPromise(function () {
        return Sk.importMainWithBody('<stdin>', false, code, true);
      }).then(function () { return { ok: true, out: out, err: '' }; },
              function (e) { return { ok: false, out: out, err: String(e) }; });
    };
    window.TIDY = function (s) {
      return String(s == null ? '' : s).replace(/\r/g, '')
        .split('\n').map(function (l) { return l.replace(/[ \t]+$/, ''); })
        .join('\n').replace(/\n+$/, '');
    };
  });
  const run = (code, limit) => page.evaluate(([c, l]) => window.RUN(c, l), [code, limit || 5000]);
  const tidy = (s) => page.evaluate((x) => window.TIDY(x), s);

  function assemble(lines, order, blanks) {
    return order.map(si => {
      let t = String(lines[si].t || '');
      (lines[si].blanks || []).forEach(bl => {
        t = t.replace(bl.slot || '____', String((blanks || {})[bl.key] == null ? '' : blanks[bl.key]));
      });
      return t;
    }).join('\n');
  }
  const ERRKIND = (s) => /TimeLimitError/i.test(s) ? 'timelimit'
    : /IndentationError|TabError/i.test(s) ? 'indent'
    : /NameError/i.test(s) ? 'name'
    : /SyntaxError/i.test(s) ? 'syntax'
    : /TypeError/i.test(s) ? 'type'
    : /ValueError/i.test(s) ? 'value' : 'other';

  /* which error kinds each chunk's own decoys really raise, filled by section 2
     and spent by section 5 */
  const raised = {};

  for (const L of found) {
    const keys = L.lesson.keys || {};
    for (const ch of L.uses) {
      if (ch.engine !== 'pyrun') continue;
      const cfg = ch.config || {};
      log('\n=== 1. ' + L.lesson.id + ' · ' + ch.id + ' — every build really produces its target ===');
      for (const b of (cfg.builds || [])) {
        const k = keys[b.id];
        if (!k || !k.order) { check(false, b.id + ': no answer key with an `order` — no machine can walk this build'); continue; }
        const code = assemble(b.lines, k.order, k.blanks);
        const res = await run(code, Number(cfg.limitMs) || 5000);
        const want = await tidy((b.target || []).join('\n'));
        const got = await tidy(res.out);
        check(res.ok && got === want,
          b.id + ': the authored order prints exactly the target' +
          (res.ok && got === want ? '' : '  [got ' + JSON.stringify(got) + (res.err ? ' err=' + res.err.slice(0, 70) : '') + ' want ' + JSON.stringify(want) + ']'));

        /* every blank the build declares must have a value in the key, or the
           walk stalls at a box it cannot fill */
        (b.lines || []).forEach(ln => (ln.blanks || []).forEach(bl => {
          check(k.blanks && k.blanks[bl.key] != null, b.id + ': the key supplies a value for blank "' + bl.key + '"');
        }));

        log('--- 2. its decoys are REAL slips, and every one has plain words waiting');
        const used = new Set(k.order);
        const decoys = (b.lines || []).map((_, i) => i).filter(i => !used.has(i));
        /* A BUILD MUST CARRY A GENUINE FAIL STATE — a decoy line, OR a blank
           whose wrong value fails. The first draft of this gate demanded a
           DECOY on every build and condemned `j3b-title`, which is one line
           with one box: the first thing a pupil ever writes in Python, whose
           real difficulty is typing it EXACTLY (the capitals are the lesson).
           Its fail state is proved by the control two lines below. A gate that
           reports a fault the lesson does not have is worse than no gate
           (DFM 146a), so the rule is the one that was actually meant. */
        const hasBlanks = (b.lines || []).some(l => (l.blanks || []).length);
        check(decoys.length > 0 || hasBlanks,
          b.id + ': carries a genuine fail state (' + decoys.length + ' decoy line(s)' +
          (hasBlanks ? ' + a typed box' : '') + ')');
        for (const d of decoys) {
          /* substitute the decoy for the LAST correct line, which is the one a
             decoy is written to be confused with, and require a real failure */
          const swapped = k.order.slice(0, -1).concat([d]);
          const dres = await run(assemble(b.lines, swapped, k.blanks), Number(cfg.limitMs) || 5000);
          const dgot = await tidy(dres.out);
          const failed = !dres.ok || dgot !== want;
          check(failed, b.id + ' decoy [' + String(b.lines[d].t).slice(0, 46) + ']: really fails');
          if (!dres.ok) {
            const kind = ERRKIND(dres.err);
            const rk = L.lesson.id + '·' + ch.id;
            (raised[rk] || (raised[rk] = [])).push(kind);
            check(!!(cfg.errorWords && cfg.errorWords[kind]),
              b.id + ' decoy raises ' + kind + ' — and this lesson has plain words for ' + kind);
          }
        }

        log('--- 3. CONTROLS');
        if (k.order.length > 1) {
          const rev = k.order.slice().reverse();
          const rres = await run(assemble(b.lines, rev, k.blanks), Number(cfg.limitMs) || 5000);
          const rgot = await tidy(rres.out);
          control(!rres.ok || rgot !== want, b.id + ': the reversed order does NOT match');
        } else {
          const empty = await run(assemble(b.lines, k.order, {}), Number(cfg.limitMs) || 5000);
          const egot = await tidy(empty.out);
          control(egot !== want, b.id + ': an unfilled blank does NOT match');
        }
      }
    }
  }
  await page.context().browser().close();

  /* ---- 4. the console is honest, and the snap desk reveals nothing ----- */
  log('\n=== 4. THE ENGINES, READ AT SOURCE ===');
  const con = engSrc.slice(engSrc.indexOf('console: function (host, labels)'), engSrc.indexOf('  /* ================= snap'));
  check(/pyc-err/.test(con) && /String\(res\.err\)/.test(con), 'the console prints the REAL Python error text');
  check(/pyc-plain/.test(con) && /PyRun\.plain\(res\.err, words\)/.test(con), 'and one plain-words line underneath it');
  const errIdx = con.indexOf('if (!res.ok)');
  check(errIdx > -1 && con.indexOf('pyc-err', errIdx) < con.indexOf('pyc-plain', errIdx),
    'the real error comes FIRST and the plain line second — never one instead of the other');
  control(!/pyc-plain[\s\S]{0,400}else\s*\{[\s\S]{0,120}pyc-err/.test(con),
    'the plain line is not an alternative branch to the real error');

  const snap = engSrc.slice(engSrc.indexOf('Engines.snap = {'), engSrc.indexOf('Engines.pyrun = {'));
  check(/bounce/.test(snap) && !/correctIdx/.test(snap),
    'a wrong pair bounces and the snap desk never reads correctIdx — nothing is revealed');
  check(/for \(var i = order\.length - 1; i > 0; i--\)/.test(snap), 'the Python side is shuffled at mount');

  const pyr = engSrc.slice(engSrc.indexOf('Engines.pyrun = {'));
  check(!/localKeys/.test(pyr) && !/markItem/.test(pyr),
    'THE ENGINE NEVER CONSULTS THE ANSWER KEY — the verdict comes from the run');
  check(/blankEmptySay/.test(pyr) && /inp\.focus\(\)/.test(pyr),
    'an empty blank refuses WITH A REASON and points at the box (DFM 205)');
  check(!/which line|line \d+ is wrong/i.test(pyr), 'NOT YET never names a line');

  /* ---- 5. what a lesson must supply, or a pupil meets an engine literal - */
  log('\n=== 5. EVERY LESSON SUPPLIES ITS OWN PUPIL SENTENCES (DFM 192g) ===');
  const NEED_PYRUN = ['targetLead', 'runLabel', 'howLine', 'lockedNote', 'matchedLabel', 'notYetLabel',
    'notYetSay', 'trayEmpty', 'progEmpty', 'consoleLabels', 'errorWords'];
  const NEED_SNAP = ['goalLine', 'howLine', 'pickBlockSay', 'pickPythonSay', 'rightSay', 'wrongSay', 'doneText'];
  for (const L of found) {
    for (const ch of L.uses) {
      const cfg = ch.config || {};
      const need = ch.engine === 'pyrun' ? NEED_PYRUN : NEED_SNAP;
      need.forEach(k => check(cfg[k] != null && String(cfg[k]).length > 0,
        L.lesson.id + ' · ' + ch.id + ': supplies ' + k));
      if (ch.engine === 'pyrun') {
        const hasBlank = (cfg.builds || []).some(b => (b.lines || []).some(l => (l.blanks || []).length));
        if (hasBlank) check(!!cfg.blankEmptySay, L.lesson.id + ' · ' + ch.id + ': uses blanks, so it must supply blankEmptySay');
        /* PLAIN WORDS FOR EVERY KIND THIS CHUNK CAN REALLY RAISE, AND NO MORE.
           The first version of this rule demanded all seven kinds on every
           pyrun chunk, and the separated cold read caught what that produces:
           J2's build is a drag-only tray of fixed lines, so it can never raise
           an IndentationError or a TimeLimitError — and the sentences the rule
           forced told a pupil to line lines up she cannot indent and to look
           for a loop she has never met. A gate that demands content which can
           never be true is manufacturing untruths (rule 35, arriving through
           the back door of a harness).
           The producible kinds are not guessed: they are the ones section 2
           actually SAW while running this chunk's own decoys, plus `other`,
           which is the catch-all any run can land on. */
        const canRaise = new Set(['other']);
        (raised[L.lesson.id + '·' + ch.id] || []).forEach(k => canRaise.add(k));
        Array.from(canRaise).sort().forEach(kd => check(!!(cfg.errorWords || {})[kd],
          L.lesson.id + ' · ' + ch.id + ': has plain words for a ' + kd + ' error (its decoys really raise it)'));
        const surplus = Object.keys(cfg.errorWords || {}).filter(k => !canRaise.has(k));
        if (surplus.length) {
          console.log('  NOTE  ' + L.lesson.id + ' · ' + ch.id + ': carries plain words for ' +
            surplus.join(', ') + ' — no decoy in it raises those, so they are unreachable on this ' +
            'card. Not a failure (a pupil may still find her own way to one), but worth reading: ' +
            'a sentence she can never see cannot be judged by anyone who has not gone looking for it.');
        }
      }
      if (ch.engine === 'snap') {
        (cfg.pairs || []).forEach(p => {
          check(!!p.gloss, L.lesson.id + ': block ' + p.id + ' is glossed at first meeting (K4)');
          check(!!p.imgAlt, L.lesson.id + ': block ' + p.id + ' has alt text');
          const img = path.join(__dirname, '..', '..', 'platform', p.img);
          check(fs.existsSync(img), L.lesson.id + ': block picture ' + p.img + ' really exists');
          /* THE PICTURE AND THE CARD CANNOT DRIFT APART. The capture script
             records what each photographed block really SAYS; the card's alt
             text has to account for every word of it. Without this the capture
             manifest was a promise nothing kept — a block could be re-cut, or
             the pairs re-ordered, and the only thing that would notice is a
             pupil looking at the wrong picture (DFM 225b's own class). */
          const man = path.join(path.dirname(img), 'manifest.json');
          if (fs.existsSync(man)) {
            const rec = (JSON.parse(fs.readFileSync(man, 'utf8')).blocks || [])
              .find(x => x.id === path.basename(p.img, '.png'));
            check(!!rec, L.lesson.id + ': ' + path.basename(p.img) + ' is in the capture manifest');
            if (rec) {
              const words = String(rec.text).split(/\s+/).filter(w => w.length > 1);
              const alt = String(p.imgAlt || '');
              const missing = words.filter(w => alt.indexOf(w) === -1);
              check(missing.length === 0,
                L.lesson.id + ': ' + p.id + '\'s alt text accounts for every word the photographed block says' +
                (missing.length ? '  [missing: ' + missing.join(' ') + ']' : '  [' + rec.text + ']'));
            }
          }
        });
        check((cfg.pairs || []).length === (cfg.pythons || []).length,
          L.lesson.id + ' · ' + ch.id + ': one Python line per block');
      }
    }
  }

  /* ---- 6. the console has its OWN ink on its OWN ground (DFM 207g) ----- */
  log('\n=== 6. THE CONSOLE SETS ITS OWN COLOURS ===');
  const css = fs.readFileSync(STYLE, 'utf8');
  const block = css.slice(css.indexOf('.pyc {'), css.indexOf('/* ---- the snap desk'));
  /* The rule that matters is that the PAIR is explicit: a ground under the whole
     console, and an ink on every surface that carries type. The first draft
     demanded both properties on every selector and condemned `.pyc`, which is a
     container with no text in it — the same DFM 146a fault as above, caught in
     the same run. What no skin may do is leave either half to inheritance, which
     is exactly how the studio QA desk became light-on-light (DFM 207g).
     qa-readability measures the RESULT in real pixels on every skin; this is the
     source ratchet underneath it. */
  /* MATCH AT THE START OF A LINE. The first version used a bare indexOf and
     found `.pyc-err {` INSIDE the combined `.pyc-out, .pyc-err {` selector
     above it, so it read the shared rule's body and condemned a declaration
     that is right there two lines down. Third instance of the same class in one
     run, and all three were mine, not the code's (DFM 146a). */
  const ruleFor = (sel) => {
    const i = block.startsWith(sel) ? 0 : block.indexOf('\n' + sel);
    return i > -1 ? block.slice(i, block.indexOf('}', i)) : null;
  };
  check(/background:\s*#/.test(ruleFor('.pyc {') || ''), '.pyc sets the console\'s own ground explicitly');
  ['.pyc-body {', '.pyc-idle,', '.pyc-lead {', '.pyc-plain {', '.pyc-title {'].forEach(sel => {
    const r = ruleFor(sel);
    check(!!r && /color:\s*#/.test(r), sel + ' sets its own ink explicitly (never inherits)');
  });
  ['.pyc-out {', '.pyc-err {'].forEach(sel => {
    const r = ruleFor(sel);
    check(!!r && /color:\s*#/.test(r) && /background:\s*#/.test(r),
      sel + ' sets BOTH its own ink and its own ground');
  });
  control(!/\.pyc-plain\s*\{[^}]*color:\s*inherit/.test(block), 'no console surface falls back to inherit');

  /* ---- 7. THE ENGINES REALLY MOUNT, AND THE CARD REALLY DRIVES ---------
     Sections 1-6 prove the Python and read the source. Neither of them would
     notice a crash on mount, a control that never arms, or a verdict that never
     renders — and "it looked right in the file" is the fault DFM 146b exists to
     stop. So the two engines are mounted for real, in a real browser, with the
     lesson's own config, and driven the way a pupil drives them. */
  log('\n=== 7. THE ENGINES, MOUNTED AND DRIVEN IN A REAL BROWSER ===');
  {
    const br = await chromium.launch({ headless: true });
    const pg = await br.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.goto('about:blank');
    await pg.addStyleTag({ path: STYLE });
    /* the smallest honest stand-in for the app: esc/asset/armButton and a ctx
       whose markItem answers from the LESSON'S OWN keys, exactly as the real
       one does off App.state.localKeys (rule 97). Nothing here re-implements
       an engine. */
    await pg.evaluate(() => {
      window.App = {
        esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
        asset: p => p,
        armButton: (b, fn) => { if (b) b.onclick = fn; }
      };
    });
    await pg.addScriptTag({ path: ENGINES });
    await pg.evaluate(([skulptDir]) => { window.__SK = skulptDir; }, [SKULPT]);
    /* PyRun must load Skulpt from where the app asks for it; in this bare page
       there is no server, so its two files are injected under the same globals. */
    await pg.addScriptTag({ path: path.join(SKULPT, 'skulpt.min.js') });
    await pg.addScriptTag({ path: path.join(SKULPT, 'skulpt-stdlib.js') });
    await pg.evaluate(() => { window.PyRun._p = Promise.resolve(true); });
    check(typeof await pg.evaluate(() => typeof window.Engines.pyrun) === 'string' &&
      await pg.evaluate(() => !!window.Engines.pyrun && !!window.Engines.snap && !!window.PyRun),
      'engines.js parses and registers PyRun, Engines.snap and Engines.pyrun');

    const j2 = JSON.parse(fs.readFileSync(path.join(SRC, 'j2', 'lessons', 'j2-02.json'), 'utf8'));
    const buildChunk = j2.chunks.find(c => c.engine === 'pyrun');
    const snapChunk = j2.chunks.find(c => c.engine === 'snap');
    const keys = j2.keys;

    /* --- the build card: assemble the right program and RUN it --- */
    const built = await pg.evaluate(async ([chunk, key]) => {
      document.body.innerHTML = '<div id="host"></div>';
      const host = document.getElementById('host');
      let finished = null;
      window.Engines.pyrun.mount(host, chunk, {
        chunk: chunk, review: false, catchup: false,
        awardBadge: (b, d) => { finished = d; return Promise.resolve({ ok: true }); },
        next: () => {}, saveEvent: () => Promise.resolve({ ok: true }),
        markItem: () => Promise.resolve({ ok: true })
      });
      const wait = ms => new Promise(r => setTimeout(r, ms));
      host.querySelector('.intro-card button.primary-btn').click();
      await wait(60);
      const before = { tray: host.querySelectorAll('.pyt-list .pyrun-line').length,
                       runDisabled: host.querySelector('.pyrun-run').disabled,
                       lockedNoteShown: !host.querySelector('.pyrun-locked-note').hidden,
                       consoleIdle: !!host.querySelector('.pyc-idle') };
      key.order.forEach(si => {
        const n = host.querySelector('.pyt-list .pyrun-line[data-si="' + si + '"]');
        if (n) n.click();
      });
      await wait(40);
      const placed = host.querySelectorAll('.pyp-list .pyrun-line').length;
      host.querySelector('.pyrun-run').click();
      for (let i = 0; i < 80 && !host.querySelector('.pyrun-verdict:not([hidden]) .pyrun-vtag'); i++) await wait(100);
      const tag = (host.querySelector('.pyrun-vtag') || {}).textContent || '';
      const printed = (host.querySelector('.pyc-out') || {}).textContent || '';
      return { before, placed, tag: tag.trim(), printed: printed.trim(), finished: finished };
    }, [buildChunk, keys[buildChunk.config.builds[0].id]]);

    check(built.before.tray === buildChunk.config.builds[0].lines.length,
      'the build card mounts with every line in the tray (' + built.before.tray + ')');
    check(built.before.runDisabled === true && built.before.lockedNoteShown === true,
      'RUN is born asleep AND says what wakes it — never a mute lock (DFM 205)');
    check(built.before.consoleIdle, 'the console says what it is before anything has run');
    check(built.placed === keys[buildChunk.config.builds[0].id].order.length,
      'clicking a line moves it into Your program (' + built.placed + ' placed)');
    check(built.tag === (buildChunk.config.matchedLabel || 'MATCHED'),
      'the correct program really runs and really MATCHES  [verdict: ' + built.tag + ']');
    check(built.printed === (buildChunk.config.builds[0].target || []).join('\n'),
      'and the console shows what it printed  [' + JSON.stringify(built.printed) + ']');

    /* --- the same card, driven WRONG: a real error, both halves shown --- */
    const wrong = await pg.evaluate(async ([chunk]) => {
      document.body.innerHTML = '<div id="host"></div>';
      const host = document.getElementById('host');
      window.Engines.pyrun.mount(host, chunk, {
        chunk: chunk, review: false, catchup: false,
        awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
        saveEvent: () => Promise.resolve({ ok: true }), markItem: () => Promise.resolve({ ok: true })
      });
      const wait = ms => new Promise(r => setTimeout(r, ms));
      host.querySelector('.intro-card button.primary-btn').click();
      await wait(60);
      /* the capital-S decoy on its own: a real NameError */
      const n = Array.from(host.querySelectorAll('.pyt-list .pyrun-line'))
        .find(x => /str\(Score\)/.test(x.textContent));
      if (n) n.click();
      await wait(40);
      host.querySelector('.pyrun-run').click();
      for (let i = 0; i < 80 && !host.querySelector('.pyrun-verdict:not([hidden]) .pyrun-vtag'); i++) await wait(100);
      return {
        tag: ((host.querySelector('.pyrun-vtag') || {}).textContent || '').trim(),
        realErr: ((host.querySelector('.pyc-err') || {}).textContent || '').trim(),
        plain: ((host.querySelector('.pyc-plain') || {}).textContent || '').trim(),
        trayBack: host.querySelectorAll('.pyt-list .pyrun-line').length,
        runArmedAgain: !host.querySelector('.pyrun-run').disabled
      };
    }, [buildChunk]);
    check(wrong.tag === (buildChunk.config.notYetLabel || 'NOT YET'), 'a wrong program gets NOT YET  [' + wrong.tag + ']');
    check(/NameError/.test(wrong.realErr), 'the console shows PYTHON\'S OWN words  [' + wrong.realErr.slice(0, 54) + ']');
    check(wrong.plain === buildChunk.config.errorWords.name,
      'and the lesson\'s own plain-words line underneath it, not the engine\'s fallback');
    check(wrong.runArmedAgain, 'RUN arms again so she can try once more — nothing auto-corrects');

    /* --- the snap desk: a WRONG pair must reveal nothing --- */
    const sn = await pg.evaluate(async ([chunk]) => {
      document.body.innerHTML = '<div id="host"></div>';
      const host = document.getElementById('host');
      window.Engines.snap.mount(host, chunk, {
        chunk: chunk, review: false, catchup: false,
        awardBadge: () => Promise.resolve({ ok: true }), next: () => {},
        saveEvent: () => Promise.resolve({ ok: true }),
        /* every answer is WRONG, on purpose */
        markItem: () => Promise.resolve({ ok: true, correct: false })
      });
      const wait = ms => new Promise(r => setTimeout(r, ms));
      host.querySelector('.intro-card button.primary-btn').click();
      await wait(60);
      const blocks = host.querySelectorAll('.snap-block').length;
      const glosses = host.querySelectorAll('.snap-gloss').length;
      host.querySelector('.snap-block').click();
      await wait(30);
      const picked = !!host.querySelector('.snap-block.picked');
      host.querySelector('.snap-py').click();
      await wait(120);
      return {
        blocks, glosses, picked,
        bounced: host.querySelectorAll('.bounce').length,
        stillThere: host.querySelectorAll('.snap-block').length,
        said: (host.querySelector('.snap-say') || {}).textContent || '',
        anySnapped: host.querySelectorAll('.snapped').length
      };
    }, [snapChunk]);
    check(sn.blocks === snapChunk.config.pairs.length, 'the snap desk mounts all ' + sn.blocks + ' blocks');
    check(sn.glosses === sn.blocks, 'every block carries its gloss on screen (K4)');
    check(sn.picked, 'clicking a block marks it picked');
    check(sn.bounced === 2, 'a wrong pair bounces BOTH cards back (' + sn.bounced + ')');
    check(sn.stillThere === sn.blocks && sn.anySnapped === 0, 'nothing leaves the desk and nothing is revealed');
    check(sn.said.trim() === snapChunk.config.wrongSay, 'and it says the lesson\'s own words, not the engine\'s');

    check(errs.length === 0, 'no uncaught page errors while driving either engine' +
      (errs.length ? '  [' + errs.slice(0, 2).join(' | ') + ']' : ''));
    await br.close();
  }

  console.log('\n' + (FAILS.length ? 'qa-pyrun: ' + FAILS.length + ' FAILURE(S)\n - ' + FAILS.join('\n - ')
    : 'qa-pyrun: ALL GREEN'));
  process.exit(FAILS.length ? 1 : 0);
})();
