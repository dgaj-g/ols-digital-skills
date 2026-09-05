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
    write(dir, 'content-fixture.js', FIXTURE_BOOK);
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
    edit(dir, 'script.js', "    'staff-error': ['shown']", "    'staff-error': ['shown'],\n    'fixture-screen': ['never-rendered']");
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

  /* ── a stale walker sidecar: a walk done three changes ago ────────── */
  'sidecar.stale.json': (dir) => {
    write(dir, 'tools/qa/out/walk/sit-pupil-angles-1280.json', JSON.stringify({
      walker: 'sit-pupil', scope: 'angles', width: 1280, tier: 'preview',
      contentHash: 'staleaaaaaaa', when: '2026-01-01T00:00:00Z', states: [], consoleErrors: 0
    }, null, 1));
  },

  /* ── a deploy log that says the wrong thing about the manifest ────── */
  'DEPLOY_LOG.bad.md': (dir) => {
    write(dir, 'server/DEPLOY_LOG.md',
      '# control\n\n| date | deployment | version | executeAs (as READ from the manifest) | commit | md5 Index | md5 Code |\n|---|---|---|---|---|---|---|\n' +
      '| 2026-09-05 | DATA | 26 | USER_DEPLOYING | deadbee | aaa | bbb |\n' +
      '| 2026-09-05 | FRONT DOOR | 1 | USER_DEPLOYING | deadbee | aaa | bbb |\n');
  },

  /* ── a cold-read verdict filed against text that has since changed ── */
  'verdicts.bad.md': (dir) => {
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
const FIXTURE_BOOK = `/* content-fixture.js — THE BOOK NOBODY WALKS.
   Never in index.html, never in ACTIVITIES, never in the assembler's inputs:
   qa-build fails if a fixture file reaches the artefact, and only a control
   ever loads it. Every item below is a named fault a gate must condemn. */
(function () {
  var C = (window.GJ_CONTENT = window.GJ_CONTENT || {});
  C.fixture = {
    id: 'fixture',
    title: 'Fixture - never shipped',
    engine: 'stats',
    cover: { accent: 'moss', motif: 'curve' },
    sections: [{
      id: 's1',
      title: 'Six questions',                    /* numeral-tie: there are two */
      walt: 'A fixture exercise, never shipped.',
      movie: { title: 'Fixture film', steps: [{ say: 'A fixture caption.' }] },
      questions: [
        { id: 'fx1', kind: 'fixture', marks: [1, 1],
          prompt: 'Tap the values in order.',   /* a bare gesture, and a kind nobody lints */
          answer: { val: { n: 1, d: 1 } },
          dx: { '1': 'DX_NOT_REAL' } },
        { id: 'fx2', kind: 'fixture', marks: [9, 9],
          prompt: 'Plot at the upper class boundaries, then read off the median from the curve using the rule which is the thing that you slide up the axis until it meets the line you drew.',
          answer: { val: { n: 2, d: 1 } } }
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
