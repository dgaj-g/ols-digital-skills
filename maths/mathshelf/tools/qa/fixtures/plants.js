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
    edit(dir, 'server/Code.gs.template',
      "  if (String(body.secret || '') !== secret) return { ok: false, error: 'bad-secret' };",
      "  /* THE GUARD, REMOVED: this is what the control proves the gate catches. */");
    edit(dir, 'script.js',
      "        var regL = s.classes.filter(function (c) { return c.name === cls; })[0];\n        if (regL && regL.acts && !regL.acts[p.act]) return Promise.resolve({ ok: false, error: 'not-set' });",
      "        /* THE STUB'S TICKBOX GATE, REMOVED. */");
  },

  /* ── a new book that arrives already ticked for every old class ──── */
  'fixture-server-default-true': (dir) => {
    edit(dir, 'server/Code.gs.template',
      '  for (var i = 0; i < ACTS.length; i++) out[ACTS[i]] = !!a[ACTS[i]];',
      '  for (var i = 0; i < ACTS.length; i++) out[ACTS[i]] = a[ACTS[i]] !== false;   /* planted: true unless explicitly false */');
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
    edit(dir, 'server/Code.gs.template', "        if (String(vals[i][1]).toLowerCase() === who.toLowerCase() && String(vals[i][2]) !== name) {",
      "        if (String(vals[i][1]).toLowerCase() === who.toLowerCase()) {\n          sh.getRange(i + 1, 2).setValue(name + '@nowhere');   /* planted: the row is re-keyed */\n        }\n        if (false) {");
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
    }]
  };
})();
`;

const FIXTURE_CSS = `
/* fixture.css — planted by a control, never shipped */
.excard { --fixture: 1; }
@keyframes fixture-expensive { from { background: #fff; } to { background: #000; } }
.book { background-attachment: fixed; }
[data-work] { background: #07100F !important; }
.stat-chip b { color: #C8102E; }
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
      '<p class="ui-msg"></p>' +
      '<button disabled>Check</button>';
    document.body.appendChild(d);
    console.error('fixture-renderers planted a console error');
  });
})();
`;

module.exports = { PLANTS, plantRef, write, edit };
