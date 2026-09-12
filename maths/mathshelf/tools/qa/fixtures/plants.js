/* plants.js — THE FAULTS THE CONTROLS PLANT, AND WHERE.
 *
 * A gate that has never said no is a decoration (Part 5.1). So every gate names
 * its CONTROLS, and every control names a PLANT: a fault, put into a SANDBOX
 * COPY of the tree, that the gate must condemn by name. Never into the tree
 * itself - a control that edits the thing it is testing is how a build ends up
 * shipping its own test scaffolding.
 *
 * Four kinds, and each is here for a reason:
 *   fixture   a file written into the sandbox (a book nobody walks, CSS that
 *             breaks a law, a renderer that gives the answer away)
 *   ref       a PINNED pre-fix state, fetched with `git show <hash>:<path>` and
 *             served in place of the shipped file. Pinned by hash, never by
 *             HEAD or a branch - a "before" that moves is not a before.
 *   mutation  the shipped source, string-replaced, ASSERTED to have really
 *             changed (a replace that silently matched nothing would make the
 *             control pass by doing nothing at all)
 *   self-probe the gate proves its own detector both ways in the same run
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function gitify(dir) {
  /* A CONTROL THAT CANNOT RUN IS RED, and every question qa-repo-prod asks is
     a question about a git repository - so the sandbox has to be one. The copy
     carries no .git (cp -R of the app folder never could), so the plant makes
     the sandbox a repository of its own and commits the tree as it stands.
     What each plant does AFTER this call is what the gate is being asked to
     see: an edit left uncommitted, or a built pair committed already stale. */
  const G = ['-c', 'user.email=control@mathshelf.invalid', '-c', 'user.name=control'];
  /* the repository is initialised at the SANDBOX ROOT, not at the app folder,
     because a gate that resolves anything from the repo root (the assembler's
     shared style.css, for one) would otherwise resolve it inside the app and
     quietly read the wrong file */
  const up = path.resolve(dir, '..', '..');
  const root = /mathshelf-control-/.test(path.basename(up)) ? up : dir;
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', G.concat(['add', '-A']), { cwd: root });
  execFileSync('git', G.concat(['commit', '-q', '-m', 'control sandbox']), { cwd: root });
}

function write(dir, rel, text) {
  const p = path.join(dir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
}
function edit(dir, rel, from, to) {
  const p = path.join(dir, rel);
  const s = fs.readFileSync(p, 'utf8');
  if (s.indexOf(from) < 0) throw new Error('the plant found nothing to replace in ' + rel + ': ' + from.slice(0, 60));
  fs.writeFileSync(p, s.replace(from, to));
}
function fromRef(dir, repoRoot, ref, repoPath, rel) {
  const text = execFileSync('git', ['show', ref + ':' + repoPath], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32e6 });
  write(dir, rel, text);
}

/* the stats controls walk Book C, not the battery's default first book */
const BOOK_C = { MS_BOOK: 'stats-quartiles' };

const PLANTS = {

  /* ── a book nobody walks, and a kind nobody lints ────────────────── */
  'fixture-book': (dir) => {
    write(dir, 'tools/qa/fixtures/content-fixture.js', FIXTURE_BOOK);
    /* the fixture pack is loaded ONLY when MS_FIXTURE_BOOK=1, and it is never in
       index.html, never in ACTIVITIES and never in the assembler's inputs */
    return { env: { MS_FIXTURE_BOOK: '1' } };
  },

  /* ── a screen with no name, and a name with no screen ────────────── */
  'fixture-surface-root': (dir) => {
    edit(dir, 'index.html',
      '<section id="scr-shelf" class="gj-screen scr-shelf" data-surface="shelf" data-state="some-ticked" hidden>',
      '<section id="scr-shelf" class="gj-screen scr-shelf" hidden>');
  },
  'fixture-surface-ghost': (dir) => {
    edit(dir, 'script.js', "    slips: ['ranked', 'starter-board'],",
      "    slips: ['ranked', 'starter-board'],\n    'fixture-screen': ['never-rendered'],");
    /* two different laws are broken by one ghost: the registry OVER-CLAIMS (a
       name with no screen behind it) and the coverage matrix gains a row no
       walk can ever close. The second is only a fault at the tier that
       requires the walk, so the plant runs the gate there. */
    return { env: { MS_TIER_RUN: 'full' } };
  },

  /* ── a gate that cannot say what it covers ───────────────────────── */
  'fixture-gate-undeclared': (dir) => {
    edit(dir, 'tools/qa/qa-notation.js', 'const COVERS =', 'const NOT_COVERS =');
  },
  /* ...and the one a COMMENT nearly fooled, on 16 Aug 2026 */
  'fixture-gate-commented': (dir) => {
    edit(dir, 'tools/qa/qa-notation.js', 'const COVERS =', '/* const COVERS = { books: "*" }; */\nconst NOT_COVERS =');
  },

  /* ── a file whose coverage is owed, edited anyway ─────────────────── */
  'fixture-debt-edited': (dir) => {
    const led = path.join(dir, 'tools/qa/MATHS_COVERAGE_DEBT.md');
    const s = fs.readFileSync(led, 'utf8');
    fs.writeFileSync(led, s.replace(
      '| angles × source |',
      '| angles × walk-right | a cell owed on purpose, to prove the freeze | control | style.css | deadbeef0000 | |\n| angles × source |'));
  },

  /* ── CSS that breaks a law the pixels are measured against ────────── */
  /* ── a lit book, painted near-invisible on its own cover (ruling 36,
     11 Sept 2026) ────────────────────────────────────────────────────
     The locked spine is retired: a book the class does not have is absent
     from the shelf outright, so there is no card left to mis-colour. The risk
     moves onto the cards that DO render — a legible-looking but near-invisible
     ink on a ticked book's own series/band row. This plant puts exactly that
     back, on `.book`, not on the retired `.book.not-set`. */
  'fixture-css-lit-spine': (dir) => {
    fs.appendFileSync(path.join(dir, 'shell.css'),
      '\n/* planted by a control, never shipped */\n' +
      '.book .series, .book .band { color: #C9D2DF !important; }\n');
  },

  /* ── a glyph drawn in SVG, in almost the colour of its own plate ─────
     The emblem on a locked spine is an <svg><text>, and a glyph in SVG is
     painted with `fill`, not `color`. The sampler was reading `color` - which
     on that element is only whatever it inherited - so it hunted for the wrong
     pixels and reported the emblem at 1.01:1 whatever colour it was really
     drawn in: it said the same thing about a legible dark "x" as it would
     about an invisible one. This plant draws the emblem in #C9D2DF, one step
     off the plate it sits on, and the gate has to say so. */
  'fixture-css-svg-glyph-in-plate': (dir) => {
    fs.appendFileSync(path.join(dir, 'shell.css'),
      '\n/* planted by a control, never shipped */\n' +
      /* the locked spine is retired (ruling 36, 11 Sept 2026): the glyph
         is drawn on the LIT plum cover (the one whose motif is a glyph), one step off its own plate */
      '.book.lit-plum .motif text { fill: #7E4293 !important; }\n');
  },

  /* ── the link-and-QR modal's message slot, as it was ──────────────────
     Written with innerHTML rather than through el(), so the helper that stamps
     role="status" on a live region never ran: an empty <p> with no role is a
     hole in the page as far as any audit can tell, and it sat in the one modal
     a teacher opens to get a class link. */
  'fixture-staff-qr-live-region': (dir) => {
    edit(dir, 'staff.js',
      '<p class="ui-msg" id="st-qmsg" role="status"></p>',
      '<p class="ui-msg" id="st-qmsg"></p>');
  },

  'fixture-css': (dir) => {
    fs.appendFileSync(path.join(dir, 'shell.css'), FIXTURE_CSS);
  },

  /* ── a sentence no gate reads, and a dead name split in two ──────── */
  'fixture-strings': (dir) => {
    edit(dir, 'script.js',
      "  var T = (window.GJ_STRINGS && window.GJ_STRINGS.pupil) || {};",
      "  var T = (window.GJ_STRINGS && window.GJ_STRINGS.pupil) || {};\n" +
      "  function __fixtureLiteral(el) { el.textContent = 'Tap the values in order, smallest first.'; }\n" +
      "  function __fixtureDeadName(el) { el.textContent = 'The Glass' + ' Jotter'; }");
    /* THE SPLIT IS THE WHOLE POINT. Neither half of 'The Glass' + ' Jotter'
       is a dead name on its own, so a gate that only reads string literals
       finds nothing; the phrase exists only once the two halves have been
       rendered whole. The plant therefore also puts the rendered result into
       the BUILT artefact's markup, which is where such a phrase actually
       surfaces, and which is why qa-voice reads server/Index.html at all. */
    edit(dir, 'server/Index.html', '<body class="activity gj">',
      '<body class="activity gj">\n<p class="fixture-dead-name">The Glass Jotter</p>');
  },

  /* ── a renderer that gives the answer away, or destroys placed work ─ */
  'fixture-renderers': (dir) => {
    write(dir, 'fixture-renderers.js', FIXTURE_RENDERERS);
    edit(dir, 'index.html', '  <script src="strings.js"></script>', '  <script src="strings.js"></script>\n  <script src="fixture-renderers.js"></script>');
  },

  /* ── a server that trusts anybody, and a stub that serves a closed book ── */
  'fixture-server': (dir) => {
    /* the guard has two doors since the store cut (secret OR token); the
       plant takes the lock off both, so a call with nothing at all walks in */
    edit(dir, 'server/Code.gs.template',
      "    if (!sameString_(body.secret, secret)) return { ok: false, error: 'bad-secret' };",
      "    /* THE GUARD, REMOVED: this is what the control proves the gate catches. */");
    edit(dir, 'server/Code.gs.template',
      "  } else {\n    return { ok: false, error: 'bad-secret' };\n  }",
      "  } else {\n    email = normEmail_(body.email);   /* planted: no credentials, still served */\n  }");
    edit(dir, 'script.js',
      "        var regL = s.classes.filter(function (c) { return c.name === cls; })[0];\n        if (regL && regL.acts && !regL.acts[p.act]) return Promise.resolve({ ok: false, error: 'not-set' });",
      "        /* THE STUB'S TICKBOX GATE, REMOVED. */");
  },

  /* ── a sentence that names a gesture as if there were one way in ── */
  'fixture-strings-table': (dir) => {
    edit(dir, 'strings.js', '    pupil: {',
      "    pupil: {\n      __plantedGesture: 'Tap the values in order, smallest first.',");
  },

  /* ── a word the film never explains, with a vocabulary that says so ── */
  'fixture-vocab': (dir) => {
    write(dir, 'tools/qa/vocab/angles.json', JSON.stringify({
      angle: { phrase: 'the amount of turn between two lines that meet' }
    }, null, 1));
  },

  /* ── a flag that stays up after she has put the thing right ─────── */
  'fixture-needs-you-sticky': (dir) => {
    edit(dir, 'staff-pages.js', "        if (st === 'err' && (c.at || 0) >= 2) {",
      "        if ((c.at || 0) >= 1) {   /* planted: the flag never clears */");
  },

  /* ── an admin sub that reads a class name and never checks whose ── */
  'fixture-staff-no-guard': (dir) => {
    edit(dir, 'server/Code.gs.template',
      'function adminDeleteClass_(req, ctx) {\n  var g = guardClass_(req.className, ctx); if (!g.ok) return g;\n  var del = String(g.rec.name);',
      'function adminDeleteClass_(req, ctx) {\n  /* THE GUARD, REMOVED: planted */\n  var g = { ok: true, rec: { name: req.className } };\n  var del = String(g.rec.name);');
  },

  /* ── a clock that times the pupil on the path that marks her work ── */
  'fixture-pace-budget': (dir) => {
    edit(dir, 'jotter.js',
      '    function runCheck() {\n      if (rec.lock) return;',
      '    function runCheck() {\n      if (rec.lock) return;\n      if (Date.now() - t0 > 60000) { rec.lock = true; return; }   /* planted: a budget on a child */');
  },

  /* ── a new book that arrives already ticked for every old class ──── */
  'fixture-server-default-true': (dir) => {
    edit(dir, 'server/Code.gs.template',
      '  for (var i = 0; i < ACTS.length; i++) out[ACTS[i]] = !!a[ACTS[i]];',
      '  for (var i = 0; i < ACTS.length; i++) out[ACTS[i]] = a[ACTS[i]] !== false;   /* planted: true unless explicitly false */');
  },

  /* ── THE 9 SEPT FAULT: the pupil's own page reads the deployer's Sheet. The
     pre-fix line, put back exactly as it was. ── */
  'fixture-front-door-reads-sheet': (dir) => {
    edit(dir, 'server/Code.gs.template', "  t.firstVisit = 'no';",
      "  t.firstVisit = (who && !getName_(who)) ? 'yes' : 'no';   /* planted: the front door reads Config as the pupil */");
  },

  /* ── a relay that hands the shared secret back to the caller ─────── */
  'fixture-server-secret-leak': (dir) => {
    /* the leak has to survive the front door's belt-and-braces strip, because
       a leak that the strip catches is the strip working, not the gate */
    edit(dir, 'server/Code.gs.template',
      "      case 'hello':   return apiHello({ classCode: p.classCode });",
      "      case 'hello':   var h = apiHello({ classCode: p.classCode }); h.secret = secret; return h;   /* planted */");
    edit(dir, 'server/Code.gs.template',
      "    if (out && typeof out === 'object') { delete out.secret; delete out.dataUrl; }",
      "    /* THE STRIP, REMOVED: planted */");
  },

  /* ── the work surface, made dark ─────────────────────────────────
     An EDIT, not an append: edit() throws if the line it is replacing is not
     there, so the plant cannot quietly do nothing. An appended !important rule
     had been landing somewhere the page never read. */
  'fixture-css-dark-work': (dir) => {
    edit(dir, 'shell.css', '.act-paper { background: var(--paper); color: var(--ink); }',
      '.act-paper { background: #07100F; color: var(--ink); }   /* planted: a dark work surface */');
  },

  /* ── a state the registry claims and no file ever writes ────────── */
  'fixture-surface-dead-state': (dir) => {
    edit(dir, 'script.js', "    slips: ['ranked', 'starter-board'],",
      "    slips: ['ranked', 'starter-board', 'never-written-anywhere'],");
  },

  /* ── THE STORE CUT (ruling 51, 12 Sept 2026): six ways the direct path
     could be wrong, each planted back into the template ──────────────── */
  /* a store that takes any signature: the compare is skipped */
  'fixture-token-any-sig': (dir) => {
    edit(dir, 'server/Code.gs.template',
      "  if (!sameString_(storeSign_(email, exp, secret), sig)) return { ok: false, error: 'token-bad' };",
      "  /* planted: any signature will do */");
  },
  /* a token that never expires: the clock is not read */
  'fixture-token-never-expires': (dir) => {
    edit(dir, 'server/Code.gs.template',
      "  if (exp < Math.floor(Date.now() / 1000)) return { ok: false, error: 'token-expired' };",
      "  /* planted: a token is forever */");
  },
  /* a signature over the expiry alone: swap the email and it still verifies */
  'fixture-token-unsigned-email': (dir) => {
    edit(dir, 'server/Code.gs.template',
      "  var bytes = Utilities.computeHmacSha256Signature(String(email) + '|' + String(exp), String(secret));",
      "  var bytes = Utilities.computeHmacSha256Signature('|' + String(exp), String(secret));   /* planted: the email is not signed */");
  },
  /* the secret itself printed into the page beside the token */
  'fixture-boot-carries-secret': (dir) => {
    edit(dir, 'server/Code.gs.template',
      "  t.storeSig = String(st.sig || '');",
      "  t.storeSig = String(st.sig || '');\n  t.storeKey = relaySecret_();   /* planted: the secret in BOOT */");
  },
  /* the bearer back on the relay fetch: the 404 maker */
  'fixture-relay-bearer': (dir) => {
    edit(dir, 'server/Code.gs.template',
      "      contentType: 'application/json',\n      payload: JSON.stringify(payload),",
      "      contentType: 'application/json',\n      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },   /* planted */\n      payload: JSON.stringify(payload),");
  },
  /* script.js's shaping drifts from the shim's: the save loses its summary */
  'fixture-store-payload-drift': (dir) => {
    edit(dir, 'script.js',
      "      case 'save':    return { classCode: cls, act: p.act, state: p.state, summary: p.summary };",
      "      case 'save':    return { classCode: cls, act: p.act, state: p.state };   /* planted: one road drops the summary */");
  },

  /* ── a data deployment that serves a book the class does not have ── */
  'fixture-data-no-tickgate': (dir) => {
    const src = path.join(dir, 'server/Code.gs.template');
    const before = fs.readFileSync(src, 'utf8');
    const after = before.split("  if (!actTicked_(rec, act)) return { ok: false, error: 'not-set' };")
      .join('  /* THE TICKBOX GATE, REMOVED: planted */');
    if (after === before) throw new Error('the plant found no actTicked_ guard to remove');
    fs.writeFileSync(src, after);
  },

  /* ── an offline stub that serves a book the class does not have ──── */
  'fixture-stub-no-tickbox': (dir) => {
    edit(dir, 'script.js',
      "        var regL = s.classes.filter(function (c) { return c.name === cls; })[0];\n        if (regL && regL.acts && !regL.acts[p.act]) return Promise.resolve({ ok: false, error: 'not-set' });",
      "        /* THE STUB'S TICKBOX GATE, REMOVED. */");
  },

  /* ── an engine that no longer passes its own cases ───────────────── */
  'fixture-engine-broken': (dir) => {
    edit(dir, 'mathcore.js',
      '  function radd(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }',
      '  function radd(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }   /* planted: addition, doing subtraction */');
  },

  /* ── a book so long that one pupil cannot fit in one cell ────────── */
  'fixture-book-huge': (dir) => {
    write(dir, 'tools/qa/fixtures/content-fixture.js', hugeBook(600));
    return { env: { MS_FIXTURE_BOOK: '1' } };
  },

  /* ── a summary fat enough to make the wall crawl ─────────────────── */
  'fixture-fat-summary': (dir) => {
    edit(dir, 'script.js',
      "    var sum = { v: 1, act: actId, name: name || '', marks: [0, 0], done: 0, total: 0, upd: Math.floor(Date.now() / 1000), qs: {} };",
      "    var sum = { v: 1, act: actId, name: name || '', marks: [0, 0], done: 0, total: 0, upd: Math.floor(Date.now() / 1000), qs: {} };\n" +
      "    sum.planted = new Array(400).join('a padding field nobody needs on a wall that polls every twenty seconds. ');");
  },

  /* ── a clock nobody wrote down, and a row for a clock that has gone ── */
  'fixture-pace-planted': (dir) => {
    edit(dir, 'script.js', '  /* boot */', '  setTimeout(function () { /* a clock with no inventory row */ }, 4000);\n  /* boot */');
  },
  'fixture-pace-stale': (dir) => {
    fs.appendFileSync(path.join(dir, 'tools/qa/MATHS_HUMAN_PACE_INVENTORY.md'),
      '| `script.js :: aFunctionThatDoesNotExist :: 9999` | a row for a clock that is not in the code |\n');
  },

  /* ── a language ledger that has drifted from the text ─────────────── */
  'fixture-ledger': (dir) => {
    write(dir, 'tools/qa/language-ledger.json', JSON.stringify({
      'strings.js > pupil > coverOpen': { sha: '000000000000', when: '2026-09-05', by: 'control' }
    }, null, 1));
    write(dir, 'tools/qa/MATHS_STRINGS_LEDGER.md',
      '# control\n\n| status | where | sentence |\n|---|---|---|\n' +
      '| WAIVED BY HIS RULING 1 Jan 2026 | nowhere.js :: gone | `a sentence that is no longer anywhere in the client` |\n');
  },

  /* ── the engines' own contracts, mutated ──────────────────────────── */
  'fixture-engine': (dir) => {
    edit(dir, 'staff.js', "    ALT_CORR_SWAP: 'Mixed up alternate and corresponding angles',",
      "    ALT_CORR_SWAP: 'Mixed up alternate and corresponding angles',\n    DX_NOBODY_CAN_TRIGGER: 'A code no engine emits and no pack authors',");
  },

  /* ── a markbook that hides its key, and a stat with no home ───────── */
  'fixture-staff': (dir) => {
    edit(dir, 'staff.js', "    legend.setAttribute('data-mark', '');\n    legend.innerHTML =",
      "    legend.setAttribute('data-mark', '');\n    legend.setAttribute('title', 'the key is only on hover');\n    legend.innerHTML = '';   /* the key, hidden */ var _unused =");
  },

  /* ── THE FAULT HE FOUND HIMSELF: a light ground that inherits the shell's
     own text colour, so the markbook's class names are white on white. This is
     the exact fault of 6 Sept 2026, planted so the readability audit has to
     prove it can still see it. ─────────────────────────────────────────── */
  'fixture-invisible-text': (dir) => {
    /* IT HAS TO STILL PLANT THE FAULT. This used to delete `color: var(--ink)`
       from .ledger, which was exactly the fault on 6 September - a light ground
       with no ink, inheriting the shell's near-white chalk. Then the relight
       gave seventeen light grounds an ink of their own, so the table inherited
       a dark colour from elsewhere and deleting this line changed nothing: the
       control ran GREEN against a fault it was no longer planting, and read as
       "the gate passed a planted fault" when the gate was fine. The plant now
       states the fault outright - the words the same colour as the table they
       are on - which is what a reader actually meets. */
    edit(dir, 'style.css', "  background: #FFFEFA;\n  color: var(--ink);", "  background: #FFFEFA;\n  color: #FFFEFA;");
  },

  /* ── a chip that floats over its neighbour: the band put back into the
     corner it used to occupy, where a long series name runs underneath it ── */
  'fixture-overlapping-chip': (dir) => {
    edit(dir, 'shell.css', ".bcover .band {\n  flex: 0 0 auto;",
      ".bcover .band {\n  position: absolute; top: 18px; right: 16px;");
  },

  /* ── THE ONE HE FOUND HIMSELF (F39). The substitution board told her to work
     it out in the instruction line at the top AND again beside the number pad,
     in two different wordings. This puts the top line back. ── */
  'fixture-said-twice': (dir) => {
    edit(dir, 'jotter.js',
      "        instr.remove();\n        exprBox.style.display = 'none'; givenRow.style.display = 'none';\n        showAnswer();",
      "        instr.textContent = 'Now work it out, then write the value:';\n        exprBox.style.display = 'none'; givenRow.style.display = 'none';\n        showAnswer();");
    /* THE PLANT HAS TO MATCH THE CODE IT PLANTS INTO. This anchored on
       `instr.textContent = ''` and the fix for the empty-paragraph fault
       changed that line to `instr.remove()`, so the edit silently found
       nothing, the control errored before it ever ran the gate, and no log was
       written at all. A plant that no longer applies is a control that has
       quietly stopped existing. */
  },

  /* ── A SCREEN THE APP CLAIMS AND THE WALK CAN NEVER REACH. The card still
     renders; it simply stops declaring itself, so `GJ.app.surfaces` still lists
     self-eval and no walk ever stands on it. This is the fault the settle-up
     check exists for, and it is the one the old plant here could not produce:
     `fixture-book` adds a whole extra BOOK, and the walk's check is about
     SURFACES, so the control ran green for four months while saying nothing. ── */
  'fixture-unreachable-surface': (dir) => {
    edit(dir, 'script.js', "    surface(card, 'self-eval', 'open');", "    /* plant: never declared */");
  },

  /* ── an exercise card that names no exercise: the number with no home ── */
  'fixture-unlabelled-stat': (dir) => {
    edit(dir, 'staff.js', "'<span class=\"exno\">Ex ' + (si + 1) + ' \\u00b7 ' + esc(bookTitle(view.act)) + '</span>' +",
      "'<span class=\"exno\">' + esc(bookTitle(view.act)) + '</span>' +");
  },

  /* ── HELP THAT IS NOT EARNED. "Want to see how?" is built hidden and shown
     only after two wrong attempts; this shows it from the start, which is the
     fault the confused walk exists to catch. It replaces a control that planted
     a script.js from `792870c^` - a commit from before the v4 rebuild. That
     file no longer belongs with the rest of the tree, and the walk hung on it
     for twenty minutes at nought per cent, which is why the confused battery
     had never once finished. A plant belongs in the code as it is today. ── */
  'fixture-help-always-on': (dir) => {
    edit(dir, 'script.js', "    wrap.hidden = true;                          // earned (2 wrong attempts) or nudged before it appears",
      "    wrap.hidden = false;   /* plant: help given away before it is earned */");
  },

  /* ── A THIRD GO. The attempt cap is `rec.att.length >= 2`; this pushes it to
     three, so a pupil can guess once more. It replaces `fixture-renderers` on
     this control - that plant mounts a whole fixture question which is
     deliberately faulty in half a dozen other ways, and the confused walk
     reported those instead of the one the control is asking about. A control
     should plant ONE fault, or it cannot tell you which one it caught. ── */
  'fixture-third-attempt': (dir) => {
    /* THE STATE MUST STILL BE REACHABLE. Pushing the cap to three stopped the
       walk ever standing on checked-wrong-2 - and the attempt checks LIVE at
       that state, so the gate reported a coverage miss instead of the fault.
       A plant that removes the screen the law is written on has not planted the
       fault; it has hidden the law. The board is left pressable instead: the
       question is marked as usual and the Check row simply does not retire.
       AND THE WORKING AREA HAS TO SURVIVE WITH IT. Leaving the row on screen
       while `ui.innerHTML = ''` still wiped the board gave a Check button with
       nothing to check - pressable, useless, and invisible to a law that asks
       whether a third attempt was ACCEPTED. A faithful plant leaves her able to
       do the thing the law forbids, or the law has nothing to refuse. */
    edit(dir, 'jotter.js', "          rec.lock = true;\n          rec.fin = attempt.fin || null;",
      "          rec.lock = false;   /* plant: a third go */\n          rec.fin = attempt.fin || null;");
    edit(dir, 'jotter.js', "          ui.innerHTML = '';\n          checkRow.hidden = true;\n          dock.hidden = true;",
      "          /* plant: the working area is left standing */\n          checkRow.hidden = false;   /* plant: the board never retires */\n          dock.hidden = false;");
  },

  /* ── a per-user cache holding something two people must both see ─── */
  'fixture-cacheservice': (dir) => {
    edit(dir, 'server/Code.gs.template', 'function apiWhoAmI() {',
      "function apiWhoAmI() {\n  CacheService.getUserCache().put('who', userEmail_(), 60);");
  },
  /* ── an offline key that forgets which class it belongs to ────────── */
  'fixture-key-without-class': (dir) => {
    edit(dir, 'script.js',
      "    return 'outbox:' + BOOT.classCode + ':' + (me.email || 'anon') + ':' + actId;",
      "    return 'outbox:' + (me.email || 'anon') + ':' + actId;");
  },

  /* ── a state too big for the cell it has to live in ──────────────── */
  'fixture-state-huge': () => ({ env: { MS_FIXTURE_HUGE_STATE: '1' } }),

  /* ── a flag with no reason, and one that never clears ─────────────── */
  'fixture-needs-you': (dir) => {
    edit(dir, 'staff-pages.js', "            why: T('needsYouWrongTwice', where), rank: 3 });",
      "            why: '', rank: 3 });");
  },

  /* ── the record itself, broken two ways ──────────────────────────── */
  'fixture-audit-orphan': (dir) => {
    const f = path.join(dir, 'tools/qa/MATHS_FEEDBACK_MASTER.md');
    fs.appendFileSync(f, '\n99. **A ruling with no home anywhere.** Planted by a control.\n');
  },
  'fixture-audit-ghost': (dir) => {
    edit(dir, 'tools/qa/MATHS_GATES_AUDIT.md', '| 1 | qa-language | must-fail-exhibits, must-pass-exemplars |',
      '| 1 | qa-a-gate-that-does-not-exist | must-fail-exhibits |');
  },

  /* ── a book loaded by the page and forgotten by the assembler ─────── */
  'fixture-build-missing-input': (dir) => {
    write(dir, 'content-fixture-book.js', '(function(){})();');
    edit(dir, 'index.html', '  <script src="strings.js"></script>',
      '  <script src="content-fixture-book.js"></script>\n  <script src="strings.js"></script>');
  },

  /* ── a server that loses her work, or re-keys her row ─────────────── */
  'fixture-server-wipe': (dir) => {
    edit(dir, 'server/Code.gs.template', 'function adminSetActs_(req, ctx) {',
      'function adminSetActs_(req, ctx) {\n  /* planted: unticking deletes the rows */\n  try { var sh = dataSheet_(); for (var z = sh.getLastRow(); z > 1; z--) sh.deleteRow(z); } catch (e) {}');
  },
  'fixture-server-rekey': (dir) => {
    /* the row is re-keyed to a new email as she is renamed, so her work is
       still in the sheet and no longer hers */
    edit(dir, 'server/Code.gs.template',
      "          var rng = sh.getRange(i + 1, 3); rng.setNumberFormat('@'); rng.setValue(name);",
      "          var rng = sh.getRange(i + 1, 3); rng.setNumberFormat('@'); rng.setValue(name);\n          sh.getRange(i + 1, 2).setValue(name.toLowerCase().replace(/ /g, '.') + '@nowhere.invalid');   /* planted: re-keyed */");
  },
  /* ── and one that lets a pupil's save carry the teacher's mark away ── */
  'fixture-server-clobber': (dir) => {
    edit(dir, 'server/Code.gs.template', '    if (found) {\n      var prev = parseJson_(found.vals[5]);',
      '    if (false) {\n      var prev = parseJson_(found.vals[5]);');
  },

  /* ── a face that will not load, and a dead one still named ────────── */
  'fixture-font-missing': (dir) => {
    const f = path.join(dir, 'assets/fonts/fonts.css');
    const css = fs.readFileSync(f, 'utf8');
    fs.writeFileSync(f, css.replace(/@font-face\s*\{[^}]*Schibsted[^}]*\}/g, '/* planted: the face is gone */'));
  },
  'fixture-dead-font': (dir) => {
    fs.appendFileSync(path.join(dir, 'shell.css'), "\n.planted { font-family: 'Caveat', cursive; }\n");
  },

  /* ── a dock pinned over the board ────────────────────────────────── */
  'fixture-css-sticky-dock': (dir) => {
    fs.appendFileSync(path.join(dir, 'shell.css'), '\n.dock { position: sticky !important; bottom: 0; }\n');
  },

  /* ── a preview that says nothing, and a live tier that answers for her ── */
  'fixture-no-banner': (dir) => {
    edit(dir, 'script.js', "    b.id = 'gj-preview-banner';", "    return;   /* planted: no banner */\n    b.id = 'gj-preview-banner';");
  },
  'fixture-live-channel': (dir) => {
    edit(dir, 'script.js', '  if (!window.OLS_TRANSPORT) {\n    GJ.app.__prime', '  if (true) {\n    GJ.app.__prime');
  },
  'fixture-no-outbox': (dir) => {
    edit(dir, 'script.js', '  function outboxReplay(actId, serverState) {', '  function outboxReplayDISABLED(actId, serverState) {');
    edit(dir, 'script.js', '      var held = outboxReplay(a.id, raw);', '      var held = null;');
  },

  /* ── a tree nobody can name, and a pair that is not the tree's ────── */
  'fixture-dirty-tree': (dir) => {
    gitify(dir);
    fs.appendFileSync(path.join(dir, 'style.css'), '\n/* planted: an uncommitted edit */\n');
  },
  'fixture-stale-pair': (dir) => {
    /* committed WITH the damage, so the tree is clean and the only thing wrong
       is that the built pair no longer matches a fresh build of its own source
       - which is the question the fresh-build comparison exists to ask, and it
       is only asked at the tier that asks it */
    fs.appendFileSync(path.join(dir, 'server/Index.html'), '<!-- planted: the built pair is stale -->\n');
    gitify(dir);
    return { env: { MS_TIER_RUN: 'full' } };
  },

  /* ── the two leashes of the polish cut (11 Sept 2026) ─────────────── */
  'fixture-scope-breach': (dir) => {
    /* a cut whose scope does not name lib/contrast-audit.js, and an edit to
       it anyway: the sampler is exactly the file the 8 Sept build kept
       "fixing" instead of filing a debt row */
    gitify(dir);
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
    write(dir, 'tools/qa/CUT_SCOPE.txt', 'jotter-stats.js\nstrings.js\ntools/qa/CUT_SCOPE.txt\ntools/qa/out/*\n');
    write(dir, 'tools/qa/out/cut-start.json', JSON.stringify({ start: new Date().toISOString(), budgetMin: 180, startCommit: head }));
    fs.appendFileSync(path.join(dir, 'tools/qa/lib/contrast-audit.js'), '\n/* planted: an edit outside the scope */\n');
  },
  'fixture-budget-spent': (dir) => {
    /* a stamp from four hours ago on a three-hour budget: run.js --full and
       control.js must refuse, and qa-scope at the full tier must quote it */
    gitify(dir);
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
    write(dir, 'tools/qa/CUT_SCOPE.txt', 'tools/qa/CUT_SCOPE.txt\ntools/qa/out/*\n');
    write(dir, 'tools/qa/out/cut-start.json', JSON.stringify({ start: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), budgetMin: 180, startCommit: head }));
    return { env: { MS_TIER_RUN: 'full' } };
  },

  /* ── an exercise pushed onto the generic self-evaluation chips ────── */
  'fixture-selfeval-fallback': (dir) => {
    edit(dir, 'script.js', "  var SELF_EVAL_TRIPS = {", "  var SELF_EVAL_TRIPS = {\n    _planted: {},");
    edit(dir, 'script.js', "    angles: {", "    anglesPLANTED: {");
  },

  /* ── a floor quietly lowered ─────────────────────────────────────── */
  'fixture-floor-drop': (dir) => {
    edit(dir, 'tools/qa/MATHS_GATES_AUDIT.md', '| mathcore.selfTest | 73 |', '| mathcore.selfTest | 999 |');
  },

  /* ── a markbook that does not re-lock, and one that remembers the passcode ── */
  'fixture-no-relock': (dir) => {
    edit(dir, 'staff.js', '    passcode = null;', '    /* planted: the passcode is kept */');
  },
  'fixture-persist-passcode': (dir) => {
    edit(dir, 'staff.js', '  function closeMarkbook(why) {', "  function closeMarkbook(why) {\n    try { localStorage.setItem('staffPasscode', passcode); } catch (e) {}   /* planted */");
  },

  /* ── a locked renderer whose marking moved ───────────────────────── */
  'fixture-engine-mark': (dir) => {
    const f = path.join(dir, 'tools/qa/fixtures/v3-shape.json');
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    const k = Object.keys(j)[0];
    if (j[k] && j[k].mk) j[k].mk = [99, 99];
    fs.writeFileSync(f, JSON.stringify(j, null, 1));
  },

  /* ── a stale walker sidecar: a walk done three changes ago ────────── */
  'sidecar.stale.json': (dir) => {
    write(dir, 'tools/qa/out/walk/sit-pupil-angles-1280.json', JSON.stringify({
      walker: 'sit-pupil', scope: 'angles', width: 1280, tier: 'preview',
      contentHash: 'staleaaaaaaa', when: '2026-01-01T00:00:00Z', states: [], consoleErrors: 0
    }, null, 1));
    /* staleness is only a FAULT at the tier that requires a fresh walk: at
       --fast a sidecar older than the content is reported, not failed, and the
       gate says so in its own exemption. So the control runs the gate at the
       tier the rule lives at, which is the only tier the rule can be tested at */
    return { env: { MS_TIER_RUN: 'full' } };
  },

  /* ── a deploy log that says the wrong thing about the manifest ────── */
  'DEPLOY_LOG.bad.md': (dir) => {
    /* the log's paired-row law is asked POST-DEPLOY, which is the only moment
       it can be asked at: before the cut there are no rows to pair */
    write(dir, 'server/DEPLOY_LOG.md',
      '# control\n\n| date | deployment | version | executeAs (as READ from the manifest) | commit | md5 Index | md5 Code |\n|---|---|---|---|---|---|---|\n' +
      '| 2026-09-05 | DATA | 26 | USER_DEPLOYING | deadbee | aaa | bbb |\n' +
      '| 2026-09-05 | FRONT DOOR | 1 | USER_DEPLOYING | deadbee | aaa | bbb |\n');
    return { env: { MS_POST_DEPLOY: '1' } };
  },
  /* a FRONT DOOR re-cut on a later commit whose Code.gs is not the one the
     DATA row was cut with - the page would call a server that does not know
     it (12 Sept 2026, the front-door-only release rule) */
  'DEPLOY_LOG.stale-data.md': (dir) => {
    write(dir, 'server/DEPLOY_LOG.md',
      '# control\n\n| date | deployment | version | executeAs (as READ from the manifest) | commit | md5 Index | md5 Code |\n|---|---|---|---|---|---|---|\n' +
      '| 2026-09-05 | DATA | 25 | USER_DEPLOYING | deadbee | aaa | bbb |\n' +
      '| 2026-09-05 | FRONT DOOR | 26 | USER_ACCESSING | deadbee | aaa | bbb |\n' +
      '| 2026-09-06 | FRONT DOOR | 27 | USER_ACCESSING | cafef00 | ddd | ccc |\n' +
      'Proof row, quoted from the Executions log: doGet Completed.\nProof row, quoted from the Executions log: apiCall Completed.\n');
    return { env: { MS_POST_DEPLOY: '1' } };
  },

  /* ══ THE STATS CONTROLS TABLE (DESIGN §11.3, [Review, 7 Sept 2026]) ═════
     One fault each, in today's jotter-stats.js / statcore.js / statchart.js
     / style.css / lib/drive.js, on the sandbox copy only. Every plant here
     leaves the screen the law is written on reachable (rule 4 of the four
     rules for writing controls): a wrong point still gets placed, a chip
     still gets pressed, a Check still gets reached - only the one thing the
     law forbids is now also true. ─────────────────────────────────────── */

  /* ── engine contract: a follow-through tick that should not earn, now does ── */
  'stats-ftearns-flipped': (dir) => {
    edit(dir, 'statcore.js',
      "if (c === 'IQR') out.push(U('IQR', CUT_LABEL.IQR, 'accuracy', 1, false));",
      "if (c === 'IQR') out.push(U('IQR', CUT_LABEL.IQR, 'accuracy', 1, true));   /* planted: ftEarns flipped */");
  },

  /* ── the marking engine that agrees with any attempt at all ────────── */
  'stats-accepts-everything': (dir) => {
    edit(dir, 'statcore.js',
      "  function check(q, att, rules) {\n    var r = rulesOf(q, rules);",
      "  function check(q, att, rules) {\n    var u2 = unitsOf(q, rulesOf(q, rules));\n    return settle(q, u2.map(function (u) { return row(u, 1, null, null); }), u2);   /* planted: accepts everything */\n    var r = rulesOf(q, rules);");
  },

  /* ── the hollow true-position rings drawn at mount, before she has tried ── */
  'stats-truth-before-lock': (dir) => {
    edit(dir, 'jotter-stats.js',
      "    } else {\n      kind.start();\n      var r0 = kind.ready();\n      setLockedWhy(checkBtn, r0.why);\n    }",
      "    } else {\n      kind.start();\n      if (kind.showTruth) kind.showTruth();   /* planted: the truth is drawn before she has tried */\n      var r0 = kind.ready();\n      setLockedWhy(checkBtn, r0.why);\n    }");
  },

  /* ── a tray marker tinted so it stands out before she has chosen anything ── */
  'stats-colour-hint': (dir) => {
    edit(dir, 'jotter-stats.js',
      "        b.setAttribute('aria-pressed', sel === o.role ? 'true' : 'false');",
      "        b.setAttribute('aria-pressed', sel === o.role ? 'true' : 'false');\n        if (o.role === 'Q2') b.style.background = '#FFE9A8';   /* planted: colour hints the median marker */");
  },

  /* ── a comparison chip pressed for her before she has touched the board ── */
  'stats-option-pressed': (dir) => {
    edit(dir, 'jotter-stats.js',
      "          b.setAttribute('aria-pressed', current === x.o ? 'true' : 'false');",
      "          b.setAttribute('aria-pressed', (current === x.o || x.o === options[0]) ? 'true' : 'false');   /* planted: one chip pressed at mount */");
  },

  /* ── a wrong plotted point that quietly snaps to the nearest true boundary ── */
  'stats-snap-back': (dir) => {
    edit(dir, 'jotter-stats.js',
      "        onGridTap: function (x, y) {\n          if (ctx.locked()) return;\n          if (bd.points().length >= maxPts) { ctx.say(T().statPlotEnough); return; }\n          sel = bd.addPoint(x, y, { select: true });\n          after('placing');\n        },",
      "        onGridTap: function (x, y) {\n          if (ctx.locked()) return;\n          if (bd.points().length >= maxPts) { ctx.say(T().statPlotEnough); return; }\n          sel = bd.addPoint(x, y, { select: true });\n          (function (i, px, py) {   /* planted: a wrong point snaps to the nearest true boundary a moment later */\n            setTimeout(function () {\n              var xs = (q.classes || []).map(function (c) { return Number(c.hi); });\n              if (!xs.length || !bd.points()[i]) return;\n              var nearest = xs.reduce(function (p, c) { return Math.abs(c - px) < Math.abs(p - px) ? c : p; }, xs[0]);\n              if (nearest !== px) { bd.movePoint(i, nearest, py); after(null); }\n            }, 200);\n          })(sel, x, y);\n          after('placing');\n        },");
  },

  /* ── a tray shuffle disabled, so it comes out in the answer order ────── */
  'stats-sorted-tray': (dir) => {
    edit(dir, 'jotter-stats.js',
      "  function derange(items, answerKeys, key, seed) {\n    if (items.length < 2) return items.slice();",
      "  function derange(items, answerKeys, key, seed) {\n    return items.slice();   /* planted: shuffle disabled */\n    if (items.length < 2) return items.slice();");
  },

  /* ── the read-out printing the first true coordinate before she has placed one ── */
  'stats-signature-leak': (dir) => {
    edit(dir, 'jotter-stats.js',
      "      if (sel > -1 && bd.points()[sel]) {\n        var p = bd.points()[sel];\n        bd.readout(fill(T().statPointReadout, { x: p[0], y: p[1] }), p);\n        ctx.setStage('selected');\n      } else bd.clearReadout();",
      "      if (sel > -1 && bd.points()[sel]) {\n        var p = bd.points()[sel];\n        bd.readout(fill(T().statPointReadout, { x: p[0], y: p[1] }), p);\n        ctx.setStage('selected');\n      } else {\n        var want0 = window.GJ_STATS.expectedPoints(q, packRulesOf(ctx) || window.GJ_STATS.DEFAULT_RULES)[0];   /* planted: leaks the first true point at mount */\n        if (want0) bd.readout(fill(T().statPointReadout, { x: want0[0].n / want0[0].d, y: want0[1].n / want0[1].d }), null);\n        else bd.clearReadout();\n      }");
  },

  /* ── the select-on-first-press branch made a return-to-tray ──────────── */
  'stats-single-press-lift': (dir) => {
    edit(dir, 'jotter-stats.js',
      "    node.addEventListener('click', function (e) {\n      if (ctx.locked()) return;\n      e.stopPropagation();\n      if (ctx.selected === node) {\n        ctx.clearSelection();\n        onReturn();\n        return;\n      }",
      "    node.addEventListener('click', function (e) {\n      if (ctx.locked()) return;\n      e.stopPropagation();\n      onReturn();   /* planted: a single press destroys placed work */\n      return;\n      if (ctx.selected === node) {\n        ctx.clearSelection();\n        onReturn();\n        return;\n      }");
  },

  /* ── a free-text box on the IQR line, where only a number pad may be ─── */
  'stats-free-text': (dir) => {
    edit(dir, 'jotter-stats.js',
      "        pad = makeNumPad(ctx.dock, {\n          label: T().statIqr, fraction: true,\n          onChange: function (v) { iqr = v; ctx.changed(); }\n        });\n        pad.set(iqr);\n        return;\n      }",
      "        pad = makeNumPad(ctx.dock, {\n          label: T().statIqr, fraction: true,\n          onChange: function (v) { iqr = v; ctx.changed(); }\n        });\n        pad.set(iqr);\n        var free = document.createElement('input');   /* planted: a free-text box on the IQR line */\n        free.type = 'text';\n        free.className = 'fx-free-iqr';\n        ctx.dock.appendChild(free);\n        return;\n      }");
  },

  /* ── the lock left false and the board left standing after two wrong goes ── */
  'stats-third-attempt': (dir) => {
    edit(dir, 'jotter-stats.js',
      "      if (verdict.res === 'OK' || rec.att.length >= 2) rec.lock = true;",
      "      if (verdict.res === 'OK') rec.lock = true;   /* planted: never locks after two wrong attempts */");
  },

  /* ── a disabled Join button that says nothing about why ──────────────── */
  'stats-mute-lock': (dir) => {
    edit(dir, 'jotter-stats.js',
      "      if (join.disabled) setLockedWhy(join, n < maxPts ? T().statPlotPlaceWhy : T().statPlotJoinedAlready);",
      "      /* planted: no reason given for the disabled Join button */");
  },

  /* ── a small board label inked in the glow, not the ink, of copper ───── */
  'stats-label-fill-light': (dir) => {
    edit(dir, 'style.css',
      '.stat-label[data-label-kind="readout"], .stat-label[data-label-kind="drop"] { color: var(--copper-ink); }',
      '.stat-label[data-label-kind="readout"], .stat-label[data-label-kind="drop"] { color: var(--copper-glow); }   /* planted: light ink on a small label */');
  },

  /* ── the label stagger disabled, so board labels sit on top of one another ── */
  'stats-labels-unstaggered': (dir) => {
    edit(dir, 'statchart.js',
      'var row = 0, collided = true;',
      'var row = 0, collided = false;   /* planted: stagger disabled */');
  },

  /* ── the fiction line's own guard removed, so it can be told twice ───── */
  'stats-told-twice': (dir) => {
    edit(dir, 'jotter-stats.js',
      "    if (ctx.body.querySelector('[data-fiction]')) return;",
      "    /* planted: the guard removed, so the fiction line can be told twice */");
  },

  /* ── the major gridline painted the colour of the paper it sits on ───── */
  'stats-grid-invisible': (dir) => {
    edit(dir, 'style.css',
      '  --grid-major: #979083;',
      '  --grid-major: var(--panel);   /* planted: the grid cannot be seen */');
  },

  /* ── the strip lit one stage behind the board (ruling 40, 11 Sept 2026) ─ */
  'stats-strip-behind': (dir) => {
    edit(dir, 'jotter-stats.js',
      "      var first = curPill < 0;\n      curPill = i;",
      "      var first = curPill < 0;\n      curPill = first ? i : Math.max(0, i - 1);   /* planted: the strip lags one pill behind */");
    return { env: BOOK_C };
  },

  'stats-table-between': (dir) => {
    /* the given table put back between the chart and its controls (his
       Exercise 3 of 11 Sept 2026) */
    edit(dir, 'jotter-stats.js',
      "    ctx.body.insertBefore(tableWrap, ctx.body.querySelector('.check-row'));",
      "    ctx.boardHost.appendChild(tableWrap);   /* planted: the table sits between the board and the dock again */");
    edit(dir, 'style.css',
      "  .stat-q-cfplot > .jq-body > .stat-given { grid-column: 2; grid-row: 5 / span 3; align-self: start; margin-top: 6px; }",
      "  /* planted: no side column */");
    return { env: BOOK_C };
  },
  'stats-board-squeezed': (dir) => {
    /* the side column back to a bare breakpoint: the table lifted beside the
       chart from 768px whether or not the body can hold them both (the polish
       cut as it shipped on 11 Sept 2026: 268 of the grid's 347px at 1280) */
    edit(dir, 'style.css',
      "  .stat-q-cfplot > .jq-body:not(.stat-stack) { display: grid;",
      "  .stat-q-cfplot > .jq-body { display: grid;   /* planted: beside whether it fits or not */");
    return { env: BOOK_C };
  },
  /* ── the board on a phone (rulings 43/44, 12 Sept 2026) ─────────────── */
  'stats-board-no-pan': (dir) => {
    /* touch-action none back on the whole SVG: the polish cut as he met it on
       his iPhone - no swipe could move the board, (25, 100) out of reach */
    edit(dir, 'statchart.js', "svg.style.touchAction = 'pan-x pan-y';", "svg.style.touchAction = 'none';   /* planted: the whole board refuses the pan */");
    return { env: { MS_BOOK: 'stats-quartiles', MS_WIDTHS: '375' } };
  },
  'stats-axis-number-on-the-line': (dir) => {
    /* the x numbers seated by the old constant - 16 user units below the axis
       whatever the counter-scaled font - so at phone scale the digits' tops
       stand on the line */
    edit(dir, 'statchart.js',
      "for (k = 0; k < xs.length; k++) xs[k].setAttribute('y', (Number(xs[k].getAttribute('data-line')) + f + css(4)).toFixed(2));",
      "for (k = 0; k < xs.length; k++) xs[k].setAttribute('y', (Number(xs[k].getAttribute('data-line')) + 16).toFixed(2));   /* planted: the +16 constant */");
    return { env: { MS_BOOK: 'stats-quartiles', MS_WIDTHS: '375' } };
  },

  'stats-stage-line-replaced': (dir) => {
    /* the old single-slot say(): a passing note written over the stage line */
    edit(dir, 'jotter-stats.js', "note: function (text) { note.textContent = text || ''; },", "note: function (text) { msg.textContent = text || ''; },   /* planted: one slot */");
    return { env: BOOK_C };
  },

  /* ── a film that does not draw what its caption says (ruling 39) ──────── */
  'film-ring-draws-nothing': (dir) => {
    edit(dir, 'player.js', "if (op.ring && movie.mode === 'paper') return paperRing(op, instant);", '/* planted: the ring op draws nothing again */');
    return { env: BOOK_C };
  },
  /* ── RULING 50: ONE PLANT PER OP KIND ─────────────────────────────────
     The fault of 12 September 2026, replanted a kind at a time: the op is
     named by the film, the player has no branch for it any more, and it falls
     through applyOp to the diagram-only tail and draws NOTHING — exactly how
     five of Book C's six films came to be shipped. Each of these must make
     `sit-pupil`'s film-draws law say no, by name. Book C at one width: the
     question a control asks is answered no better by walking three books. */
  'film-no-table': (dir) => {
    edit(dir, 'player.js', "      if (op.table) return paperTable(op, instant);",
      '      /* planted: the `table` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-tcell': (dir) => {
    edit(dir, 'player.js', "      if (op.tcell) return paperTcell(op, instant);",
      '      /* planted: the `tcell` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-chart': (dir) => {
    edit(dir, 'player.js', "      if (op.chart) return paperChart(op, instant);",
      '      /* planted: the `chart` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-plot': (dir) => {
    edit(dir, 'player.js', "      if (op.plot) return paperPlot(op, instant);",
      '      /* planted: the `plot` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-curve': (dir) => {
    edit(dir, 'player.js', "      if (op.curve) return paperCurve(op, instant);",
      '      /* planted: the `curve` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-rule': (dir) => {
    edit(dir, 'player.js', "      if (op.rule) return paperRule(op, instant);",
      '      /* planted: the `rule` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-drop': (dir) => {
    edit(dir, 'player.js', "      if (op.drop) return paperDrop(op, instant);",
      '      /* planted: the `drop` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-scale': (dir) => {
    edit(dir, 'player.js', "      if (op.scale) return paperScale(op, instant);",
      '      /* planted: the `scale` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-marker': (dir) => {
    edit(dir, 'player.js', "      if (op.marker) return paperMarker(op, instant);",
      '      /* planted: the `marker` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-stamp': (dir) => {
    edit(dir, 'player.js', "      if (op.stamp) return doStamp(op, instant);",
      '      /* planted: the `stamp` op draws nothing again */');
    return { env: BOOK_C };
  },
  'film-no-boxplot': (dir) => {
    edit(dir, 'player.js', "      if (op.box) return paperBoxPlot(op, instant);",
      '      /* planted: the `boxplot` op draws nothing again */');
    return { env: BOOK_C };
  },

  'film-box-on-the-glyphs': (dir) => {
    /* the box drawn from the 8 Sept guess: no padding from the text */
    edit(dir, 'player.js', '      var pad = 8;', '      var pad = 0;   /* planted: the box sits on the glyphs */');
    return { env: BOOK_C };
  },

  /* ── a film paced for the machine, not the reader (ruling 38) ────────── */
  'fixture-pace-fast-film': (dir) => {
    edit(dir, 'player.js', 'var delayMs = Math.min(8000, Math.max(1200, words * 350));',
      'var delayMs = Math.min(3600, Math.max(850, words * 200));   /* planted: the 8 Sept pace */');
  },
  'stats-no-beat': (dir) => {
    edit(dir, 'jotter-stats.js', "      if (!first && !quiet) beat();", "      /* planted: no beat */");
    return { env: BOOK_C };
  },
  'stats-no-glow': (dir) => {
    edit(dir, 'jotter-stats.js', "      if (r.ok && checkBtn.disabled) {", "      if (false) {   /* planted: no glow */");
    return { env: BOOK_C };
  },

  /* ── the drive that stops before the last stage and records nothing ──── */
  'stats-stage-skipped': (dir) => {
    edit(dir, 'tools/qa/lib/drive.js',
      "      if (S.joined) {\n        const join = one('.stat-join');\n        if (!join) return { ok: false, why: 'no Join button on ' + qid };\n        if (!join.disabled) join.click();                          /* disabled here means already joined */\n      }\n      return null;\n    }",
      "      return null;   /* planted: the drive stops before \"joined\" and records nothing */\n      if (S.joined) {\n        const join = one('.stat-join');\n        if (!join) return { ok: false, why: 'no Join button on ' + qid };\n        if (!join.disabled) join.click();                          /* disabled here means already joined */\n      }\n      return null;\n    }");
  },

  /* ── a book the class does not have, drawn on the shelf anyway (ruling 36,
     11 Sept 2026) ────────────────────────────────────────────────────────
     renderShelf() (script.js) skips an unticked book before it makes any
     element at all — `if (!out) return;`, straight after `var out =
     !!me.acts[a.id];`. This plant removes exactly that skip, so an unticked
     book is drawn again, and qa-tickbox's source check has to catch it. */
  'fixture-shelf-shows-unticked': (dir) => {
    edit(dir, 'script.js',
      '      if (!out) return;\n      anyOut = true;',
      '      anyOut = anyOut || out;   /* planted: the skip is gone, an unticked book is drawn */');
  },

  /* ── the two waits polish rulings 34/35/37 (11 Sept 2026) ─────────── */
  /* a card that never moves: the exact fault he saw, planted directly rather
     than by removing the CSS this cut adds - so the plant survives whichever
     of gj-breathe / gj-breathe-card ends up carrying the animation. */
  'fixture-wait-card-still': (dir) => {
    fs.appendFileSync(path.join(dir, 'style.css'), '\n.panel-loading { animation: none !important; }\n');
  },
  /* the box waits for the server before it moves, instead of flipping in the
     same tick as the change event - the fault ruling 37 named. */
  'fixture-tick-waits': (dir) => {
    edit(dir, 'staff.js',
      "          cb.addEventListener('change', function () {\n            /* the box has already flipped",
      "          cb.addEventListener('change', function () {\n            cb.checked = !cb.checked;   /* planted: undo the flip until the server answers */\n            /* the box has already flipped");
  },
  /* ruling 46, 12 Sept 2026: the passcode line stops breathing - same fault
     as fixture-wait-card-still, aimed at the pupil's own is-waiting line the
     staff cover now wears instead of the gold card. */
  'fixture-passcode-line-still': (dir) => {
    fs.appendFileSync(path.join(dir, 'style.css'), '\n#st-msg.is-waiting, #st-msg.is-waiting::before { animation: none !important; }\n');
  },
  /* ruling 48, 12 Sept 2026: the old eight-second clock, replanted, so the
     gate can prove it condemns a card that comes back too soon on a save that
     is genuinely just live. */
  'fixture-outbox-warns-at-eight': (dir) => {
    edit(dir, 'script.js', 'var OUTBOX_WARN = 30000;', 'var OUTBOX_WARN = 8000;   /* planted: the 8 s card */');
  },
  /* ruling 51, 12 Sept 2026: the OLD outbox card, replanted - the one that
     only ever came down on a tap. Neutering startOutboxRetry alone gets both
     halves of that fault back at once: nothing re-sends on her behalf, so
     nothing she did not press herself ever clears the card either. The 30 s
     appearance and the immediate refusal sentence are untouched, because
     this plant is about the healing, not the naming. */
  'fixture-outbox-card-tap-only': (dir) => {
    edit(dir, 'script.js',
      '  function startOutboxRetry() {\n    if (outboxRetryTimer) return;\n    outboxRetryTimer = setInterval(outboxRetryTick, OUTBOX_RETRY_MS);\n    outboxRetryTick();\n  }',
      '  function startOutboxRetry() { /* planted: the old tap-only card - no self re-send at all */ }');
  },

  /* ── THE STORE CUT (ruling 51): four ways the page's own road could fail her ── */
  'fixture-store-no-direct': (dir) => {
    edit(dir, 'script.js', '      if (hasStore()) return storeCall(p);\n', '      /* planted: the direct path is never taken */\n');
  },
  'fixture-store-no-fallback': (dir) => {
    edit(dir, 'script.js',
      "    return window.OLS_TRANSPORT.call(p);\n  }\n  /* a fresh token from the front door",
      "    return Promise.reject(new Error('planted: no road home'));\n  }\n  /* a fresh token from the front door");
  },
  'fixture-store-no-refresh': (dir) => {
    edit(dir, 'script.js',
      "        if (out.error === 'token-expired' || out.error === 'token-bad') {",
      "        if (false) {   /* planted: an old token is never refreshed */");
  },
  'fixture-store-no-timeout': (dir) => {
    edit(dir, 'script.js',
      "    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, STORE_TIMEOUT_MS);",
      "    var timer = 0;   /* planted: a silent store is waited on forever */");
  },

  /* ── a cold-read verdict filed against text that has since changed ── */
  'verdicts.bad.md': (dir) => {
    /* the sandbox is wiped of evidence, so the control supplies BOTH halves:
       a transcript with a hash of its own, and a verdict filed against a
       different one, carrying no judged row. Without the transcript the gate
       would fail for having nothing to be handed, which is a different no. */
    write(dir, 'tools/qa/out/transcript/_teacher.md',
      '# the teacher transcript (control)\n\nTRANSCRIPT HASH: abc123abc123abc1\n\nThe markbook opens on the class page.\n');
    write(dir, 'tools/qa/MATHS_COLD_READ_VERDICTS_TEACHER.md',
      '# control\n\nTRANSCRIPT HASH: 0000000000000000\n\n| VERDICT | where | the sentence | why |\n|---|---|---|---|\n');
  }
};

/* a pinned pre-fix state, served in place of the shipped file */
function plantRef(dir, repoRoot, ref, rel) {
  const repoPath = 'maths/mathshelf/' + rel;
  try { fromRef(dir, repoRoot, ref, repoPath, rel); return true; }
  catch (e) {
    /* the folder was renamed at v4: the same file lived at the old path before */
    try { fromRef(dir, repoRoot, ref, 'maths/glass-jotter/' + rel, rel); return true; }
    catch (e2) { throw new Error('cannot fetch ' + rel + ' at ' + ref + ': ' + e2.message); }
  }
}

/* ------------------------------------------------------------- the plants */
function hugeBook(n) {
  /* ONE PUPIL'S WHOLE BOOK LIVES IN ONE 50,000-CHARACTER CELL, so the fault
     this plants is a book long enough that a thorough pupil stops being able
     to save. It is generated rather than written out because the fault IS the
     length: 600 questions is a book nobody would set, and that is the point. */
  var qs = [];
  for (var i = 1; i <= n; i++) {
    qs.push("        { id: 'hx" + i + "', kind: 'fixture', marks: [1, 1], src: 'MEP fixture', " +
      "prompt: 'Fixture question " + i + " of " + n + ".', answer: { val: { n: " + i + ", d: 1 } } }");
  }
  return "/* content-fixture.js — THE BOOK TOO LONG TO SAVE. Generated by a plant,\n" +
    "   never shipped, loaded only when MS_FIXTURE_BOOK=1. */\n" +
    "(function () {\n  var C = (window.GJ_CONTENT = window.GJ_CONTENT || {});\n" +
    "  C.fixture = {\n    id: 'fixture',\n    title: 'Fixture - too long to save',\n" +
    "    engine: 'stats',\n    authoredNarration: [],\n    cover: { accent: 'moss', motif: 'curve' },\n" +
    "    sections: [{\n      id: 's1',\n      title: 'A very long exercise',\n" +
    "      walt: 'A fixture exercise, never shipped.',\n      questions: [\n" +
    qs.join(',\n') + "\n      ]\n    }]\n  };\n})();\n";
}

const FIXTURE_BOOK = `/* content-fixture.js — THE BOOK NOBODY WALKS.
   Never in index.html, never in ACTIVITIES, never in the assembler's inputs.
   It lives in tools/qa/fixtures/ and is loaded ONLY when a control sets
   MS_FIXTURE_BOOK=1, so it can never reach a build. Every item below is a
   named fault a gate must condemn, and the comment beside it says which. */
(function () {
  var C = (window.GJ_CONTENT = window.GJ_CONTENT || {});
  C.fixture = {
    id: 'fixture',
    title: 'Fixture - never shipped',
    engine: 'stats',
    cover: { accent: 'moss', motif: 'curve' },
    /* the "rules" fault of the ten below: curveStyle differs from the real
       stats-quartiles pack's default ('smooth') on purpose. Every OTHER key
       matches the real pack, so it never perturbs the qlist/cfread fixture
       questions' own arithmetic (curveStyle is cosmetic, read nowhere in the
       lint's re-derivation) - only the whole-pack deep-equal check sees it. */
    rules: { quartileRule: 'n+1', curveRule: 'split50', startPoint: true, curveStyle: 'linear', readTol: 1, plotTol: 0 },
    /* no authoredNarration: the pack narrates a method and declares nothing */
    sections: [{
      id: 's1',
      title: 'Six questions',                    /* numeral-tie: there are three */
      walt: '... and then read the median off the curve.',   /* tail-verbatim */
      movie: { title: 'Fixture film', steps: [{ say: 'A fixture caption.' }] },
      /* no src on the movie, and none on any question below */
      questions: [
        { id: 'fx1', kind: 'fixture', marks: [1, 1],
          prompt: 'Tap the values in order.',    /* a bare gesture, and a kind nobody lints */
          answer: { val: { n: 1, d: 1 } },
          dx: { '1': 'DX_NOT_REAL' } },          /* a code that is not in DX_NAMES */
        { id: 'fx2', kind: 'fixture', marks: [9, 9],     /* marks out of range */
          prompt: 'Solve 3x + 12 - 5 = 7 and then work out 3 x 4.',
          /* an ASCII hyphen doing a minus sign, and a letter x doing multiplication */
          answer: { val: { n: 2, d: 1 } } },
        { id: 'fx3', kind: 'fixture', marks: [4, 5],     /* marks out of range, and it takes the book over its period */
          prompt: 'Draw the line and then read the median from the curve and then read the median from the curve.',
          /* splice duplication: the same six words twice inside one sentence */
          answer: { val: { n: 3, d: 1 } } }
      ]
    }, {
      /* ── §11.1's ten single-fault stats questions ─────────────────────
         Every one of the ten sentences dev/lint-content-stats.js prints
         (§11.1's own list, quoted in the DESIGN table) is planted here, once,
         each on a fixture question with a real stats kind so the stats lint
         actually reaches it (fx1-fx3 above carry kind:'fixture', which this
         lint does not know - they are a different lint's fixture and are not
         touched). Eight of the ten are per-question; the "movie" sentence is
         a fault about THIS section's own film (it never names a question id)
         and the "rules" sentence is a fault about the whole PACK's rules
         object (§ below) - both are still exactly one planted cause each. */
      id: 's2',
      title: 'Ten single-fault stats questions (DESIGN §11.1)',
      walt: 'Every question below carries exactly one authoring fault, matching one of the ten sentences dev/lint-content-stats.js prints.',
      movie: {
        title: 'Fixture film with a bad rule height',
        /* fault 6: "movie: rule op at h = ... is not a convention height".
           The table op gives the movie its own n (running total 20, via the
           plot op that reads it); split50's convention heights for n=20 are
           10, 5 and 15 - the rule op below sits at 7, none of them. */
        steps: [
          { say: 'A fixture table of ages.', do: [{ table: { head: ['Age', 'Frequency'], rows: [['1', 5], ['2', 5], ['3', 5], ['4', 5]] } }] },
          { say: 'Plot the running total.', do: [{ plot: { x: 4, y: 20 } }] },
          { say: 'A second point, for padding.' },
          { say: 'Move the rule to a height that is not a convention height.', do: [{ rule: { h: 7 } }] },
          { say: 'A padding caption.' },
          { say: 'The last padding caption.' }
        ]
      },
      questions: [
        /* fault 1: "answer: authored ... but re-derived ...". n=7 under the
           default n+1 rule puts Q1 at the 2nd ordered value (5); the authored
           answer says 999. */
        { id: 'q101', kind: 'qlist', marks: [1, 1], src: 'fixture',
          prompt: 'Order the list and find the lower quartile.',
          values: [3, 5, 7, 9, 11, 13, 15], ask: ['Q1'],
          answer: { Q1: { n: 999, d: 1 } } },
        /* fault 2: "dx: \\"READ_HALF_AXIS\\" equals the truth". n=100 (>50, so
           split50's base is n itself), median height = n/2 = 50, and the
           y-axis maximum is also 100 - so half the axis exactly equals the
           true convention height, and a pupil reading the axis midpoint by
           habit could not be told apart from one reading it correctly. */
        { id: 'q102', kind: 'cfread', marks: [0, 1], src: 'fixture',
          prompt: 'Estimate the median from the curve.',
          n: 100, ask: ['median'],
          chart: { x: { min: 0, max: 100, step: 25 }, y: { min: 0, max: 100, step: 25 }, sq: { x: 1, y: 1 } },
          curve: [[0, 0], [25, 25], [50, 50], [75, 75], [100, 100]] },
        /* fault 3: "qlist: n = ... leaves a quartile between two tiles".
           n=6 (6 mod 4 = 2): the median's (n+1)/2 = 3.5 position is fine, but
           a quartile position falls a quarter of the way between two tiles,
           which no pair of adjacent tiles can express. */
        { id: 'q103', kind: 'qlist', marks: [1, 1], src: 'fixture',
          prompt: 'Order the list and find the median.',
          values: [1, 2, 3, 4, 5, 6], ask: ['Q2'] },
        /* fault 4: "plot: (..., ...) is off the grid". sq.x = 2 but the class
           boundaries (15, 31) are odd - neither true point lands on a grid
           intersection a pupil could actually tap. */
        { id: 'q104', kind: 'cfplot', marks: [1, 1], src: 'fixture',
          prompt: 'Plot the cumulative frequency curve.',
          classes: [{ lo: 0, hi: 15, f: 5 }, { lo: 15, hi: 31, f: 8 }],
          chart: { x: { min: 0, max: 32, step: 8 }, y: { min: 0, max: 20, step: 5 }, sq: { x: 2, y: 1 }, major: 4 } },
        /* fault 5: "curve: too bendy at h = ...". A wild jump between two of
           the authored curve points (5 to 90) pulls the independent monotone
           spline more than half a square away from the straight chord at the
           asked height - the curve she is shown could not be re-derived from
           a re-drawing of her own authored points. (The added atX ask costs
           the same half-unit q104's cfplot does, so the fixture book's own
           period-budget total - a whole number before these ten questions
           existed - stays a whole number; it asks nothing this fault needs
           and, with no q.answer authored, the atX re-derivation is a no-op.) */
        { id: 'q105', kind: 'cfread', marks: [0, 1], src: 'fixture',
          prompt: 'Estimate the lower quartile from the curve.',
          n: 100, ask: ['Q1', { type: 'atX', x: 20, want: 'countBelow' }],
          chart: { x: { min: 0, max: 40, step: 10 }, y: { min: 0, max: 120, step: 20 }, sq: { x: 1, y: 1 } },
          curve: [[0, 0], [10, 5], [20, 90], [30, 95], [40, 100]] },
        /* fault 7: "prompt: telegraphs \\"...\\"". The banned phrase "n/2" is
           spelled out for her, which the marking already does for itself. */
        { id: 'q106', kind: 'values', marks: [0, 1], src: 'fixture',
          prompt: 'Find the median (use n/2 to find its position).',
          slots: [{ id: 'a', label: 'Median', answer: { n: 5, d: 1 } }] },
        /* fault 8: "values: a non-terminating answer with no dp". 1/3 never
           terminates in decimal, and no slot or question dp is given. */
        { id: 'q107', kind: 'values', marks: [0, 1], src: 'fixture',
          prompt: 'Work out the mean.',
          slots: [{ id: 'a', label: 'Mean', answer: { n: 1, d: 3 } }] },
        /* fault 10: "marks: [m,a] cannot be earned". One accuracy-band slot
           can earn at most 1 mark; the question claims 3. */
        { id: 'q108', kind: 'values', marks: [0, 3], src: 'fixture',
          prompt: 'Work out the total.',
          slots: [{ id: 'a', label: 'Total', answer: { n: 5, d: 1 } }] }
      ]
    }]
  };
})();
`;

const FIXTURE_CSS = `
/* fixture.css — planted by a control, never shipped */
.excard { --fixture: 1; }
@keyframes fixture-expensive { from { background: #fff; } to { background: #000; } }
.book { background-attachment: fixed; }
/* the work surface, made dark - named three ways so no later rule can win it
   back, because a plant that is quietly overridden proves nothing */
[data-work], .act-paper, .jq-body { background-color: #07100F !important; background-image: none !important; }
.stat-chip b { color: #C8102E; }
/* and a marking colour on a decoration the PUPIL sees: the markbook chip above
   is only on a teacher's screen, and the colour law walks her screens too */
.contents-chip { color: #C8102E; }
.gj-wordmark { color: #C8102E; }
`;

const FIXTURE_RENDERERS = `/* fixture-renderers.js — planted by a control, never shipped.
   Each of these is a law broken on purpose, so the gate that owns the law can
   be seen to say no. */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var d = document.createElement('div');
    d.setAttribute('data-surface', 'question');
    d.setAttribute('data-state', 'fresh');
    d.setAttribute('data-qid', 'fixture-q');
    d.className = 'jotter-q';
    /* the answer, on the page, before she has done anything */
    d.innerHTML = '<span data-truth>42</span>' +
      '<div data-tray="fx"><span data-tray-item style="background:#1F7A33">right</span><span data-tray-item>wrong</span></div>' +
      /* a free-text box where a maths answer is typed */
      '<input type="text" class="fx-free" value="">' +
      /* placed work a SINGLE press throws away */
      '<div data-tray="fx2" class="fx-board"><span class="fx-placed" data-placed data-from="fx2">3</span></div>' +
      '<p class="ui-msg"></p>' +
      '<button disabled>Check</button>';
    document.body.appendChild(d);
    var placed = d.querySelector('.fx-placed');
    if (placed) placed.addEventListener('click', function () { placed.remove(); });
    console.error('fixture-renderers planted a console error');
  });
})();
`;

module.exports = { PLANTS, plantRef, write, edit };
