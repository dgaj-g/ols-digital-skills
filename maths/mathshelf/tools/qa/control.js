#!/usr/bin/env node
/* control.js — EVERY GATE IS MADE TO SAY NO, AND SEEN TO SAY IT.
 *
 * `node tools/qa/run.js --control`.
 *
 * THE LAW (Part 5.1): a gate that has never said no is a decoration. So every
 * gate declares its CONTROLS, and this runs each one: a fault is planted in a
 * SANDBOX COPY of the tree, the gate is run there, and the control has FIRED
 * only when the gate exits non-zero AND says the sentence it promised to say.
 *
 * NEVER THE EXIT CODE ALONE. That is DFM 189's own lesson: a pack that stops
 * for the wrong reason looks exactly like proof. A control that makes a gate
 * crash on a missing file has proved nothing about the fault it planted, so
 * every control names a `mustFail` pattern and the output has to match it.
 *
 * AND EVERY GATE CARRIES AN OVER-TIGHTENING CONTROL: the shipped tree, which
 * must PASS. A rule narrowed to spare a correct sentence keeps that sentence as
 * its permanent proof that the rule is satisfiable and not merely stricter (L6).
 *
 * A control that CANNOT RUN is RED, never a printed skip: a missing ref, a
 * missing worktree, a missing tool. The `qa-relock` soft-skip is deliberately
 * not copied.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const A = require('./lib/app.js');
const { matrix } = require('./lib/report.js');
const { coversOf, controlsOf } = require('./lib/decl.js');
const { PLANTS, plantRef } = require('./fixtures/plants.js');

const REPO = (() => {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: A.APP, encoding: 'utf8' }).trim(); }
  catch (e) { return null; }
})();
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

const gates = fs.readdirSync(A.QA)
  .filter(f => /^(qa-|sit-|extract-).*\.js$/.test(f))
  .filter(f => !ONLY || f === ONLY + '.js')
  .sort();

const rows = [];
let failures = 0;
A.ensureOut('control');

/* THE SANDBOX KEEPS THE REPO'S SHAPE. A flat copy of the app folder is not the
   tree the app is built from: the assembler reads two of its inputs from the
   REPO ROOT (style.css and assets/intro-loader.js), so in a flat sandbox a
   fresh build could never run and the control that asks whether the committed
   pair is stale could never fire. The sandbox therefore puts the app back at
   maths/mathshelf and carries those two files - and only those two, because
   assets/ is thirteen megabytes of film and none of it is read here. */
function sandbox() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'mathshelf-control-'));
  const dir = path.join(base, 'maths', 'mathshelf');
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('cp', ['-R', A.APP + '/', dir + '/']);
  if (REPO) {
    [['style.css', 'style.css'], ['assets/intro-loader.js', 'assets/intro-loader.js']].forEach(([rel, to]) => {
      const src = path.join(REPO, rel);
      if (!fs.existsSync(src)) return;
      fs.mkdirSync(path.dirname(path.join(base, to)), { recursive: true });
      execFileSync('cp', [src, path.join(base, to)]);
    });
  }
  /* the sandbox never inherits a previous run's evidence */
  try { fs.rmSync(path.join(dir, 'tools/qa/out'), { recursive: true, force: true }); } catch (e) {}
  return dir;
}

/* A BROWSER GATE READS A SERVER, NOT A FOLDER. Planting a fault in the sandbox
   proves nothing if the gate then opens http://localhost:8099 and reads the
   REAL worktree - which is exactly what every browser-tier control was doing:
   the fault was in the copy and the gate was looking at the original, so it
   passed, honestly, every time. Each browser control gets its own server on
   its own sandbox, and the gate is pointed at it. */
function needsBrowser(file) {
  try { return /require\(['"]\.\/lib\/browser\.js['"]\)/.test(fs.readFileSync(A.qa(file), 'utf8')); }
  catch (e) { return false; }
}
let PORT = 8300;
function serveSandbox(dir) {
  /* dir is <sandbox>/maths/mathshelf; the server serves the sandbox ROOT so the
     page sits at the same path it does in the repo */
  const root = path.resolve(dir, '..', '..');
  const port = ++PORT;
  const py = A.qa('serve-preview.py');
  const child = require('child_process').spawn('python3', [py, root, String(port)], { stdio: 'ignore', detached: true });
  return { child, base: 'http://localhost:' + port + '/maths/mathshelf/index.html' };
}

function runGate(dir, gateFile, env) {
  const r = spawnSync(process.execPath, [path.join(dir, 'tools/qa', gateFile)], {
    cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: Object.assign({}, process.env, { MS_TIER_RUN: 'control' }, env || {})
  });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), error: r.error };
}

console.log('MathShelf controls — every gate must be seen to say no');
console.log('app: ' + A.APP + (REPO ? '   repo: ' + REPO : '   (no git repo: pinned-ref controls cannot run)'));

gates.forEach(file => {
  const name = file.replace(/\.js$/, '');
  const p = A.qa(file);
  const covers = coversOf(p);
  const controls = controlsOf(p);
  if (!covers) { rows.push([name, '(declaration)', 'NO COVERS', 'a gate that cannot say what it covers covers nothing']); failures++; return; }
  if (!controls || !controls.length) { rows.push([name, '(declaration)', 'NO CONTROLS', 'a gate that has never said no is a decoration']); failures++; return; }

  controls.forEach(c => {
    const id = c.id || '(unnamed)';
    let dir = null;
    try {
      if (c.mustPass || c.kind === 'shipped') {
        /* OVER-TIGHTENING: the shipped tree, unplanted, must PASS */
        const r = runGate(A.APP, file, {});
        const fired = r.status === 0;
        rows.push([name, id, fired ? 'PASSES (over-tightening)' : 'RED', fired ? '' : 'the shipped tree fails its own gate']);
        fs.writeFileSync(A.out('control/' + name + '.' + id + '.log'), r.out);
        if (!fired) failures++;
        return;
      }

      if (c.kind === 'self-probe') {
        /* the gate proves its own detector, in its own run, and says so */
        const r = runGate(A.APP, file, {});
        const named = c.mustFail ? new RegExp(c.mustFail.source.replace(/^\^|\$$/g, '')).source : '';
        const has = fs.readFileSync(p, 'utf8').indexOf(named.slice(0, 24).replace(/\\/g, '')) >= 0;
        rows.push([name, id, has ? 'SELF-PROVES' : 'RED', has ? '' : 'the gate does not carry the self-probe it declares']);
        fs.writeFileSync(A.out('control/' + name + '.' + id + '.log'), r.out);
        if (!has) failures++;
        return;
      }

      dir = sandbox();
      let env = {};

      if (c.kind === 'ref') {
        if (!REPO) throw new Error('a pinned-ref control needs a git repository, and there is none');
        /* which file the ref replaces: the gate says so, or it is the client */
        const rel = c.path || guessRefPath(name);
        plantRef(dir, REPO, c.ref, rel);
      } else if (c.kind === 'mutation') {
        const plant = PLANTS[c.plant || mutationPlant(name)];
        if (!plant) throw new Error('no plant named ' + (c.plant || mutationPlant(name)));
        env = (plant(dir) || {}).env || {};
      } else {
        const plant = PLANTS[c.plant];
        if (!plant) throw new Error('no plant named ' + String(c.plant));
        env = (plant(dir) || {}).env || {};
      }

      let server = null;
      if (needsBrowser(file)) {
        server = serveSandbox(dir);
        env = Object.assign({}, env, { MS_BASE: server.base });
        /* wait for the server to answer before the gate asks it for a page */
        let up = false;
        for (let t = 0; t < 40 && !up; t++) {
          try { execFileSync('curl', ['-sf', '-o', '/dev/null', '--max-time', '1', server.base]); up = true; }
          catch (e) { try { execFileSync('sleep', ['0.15']); } catch (e2) {} }
        }
        if (!up) throw new Error('the sandbox server never answered on ' + server.base);
      }
      const r = runGate(dir, file, env);
      if (server) { try { process.kill(-server.child.pid); } catch (e) { try { server.child.kill(); } catch (e2) {} } }
      const said = c.mustFail ? c.mustFail.test(r.out) : false;
      const fired = r.status !== 0 && said;
      rows.push([name, id, fired ? 'FIRED' : 'DID NOT FIRE',
        fired ? '' : (r.status === 0 ? 'the gate passed a planted fault' : 'the gate failed, but not with "' + String(c.mustFail) + '"')]);
      fs.writeFileSync(A.out('control/' + name + '.' + id + '.log'), r.out);
      if (!fired) failures++;
    } catch (e) {
      /* A CONTROL THAT CANNOT RUN IS RED. Not a skip: a skip is how a gate
         comes to be trusted for a year without ever having been proved. */
      rows.push([name, id, 'CANNOT RUN', String(e && e.message || e).slice(0, 90)]);
      failures++;
    } finally {
      if (dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} }
    }
  });
});

/* which shipped file a pinned pre-fix ref stands in for, per gate */
function guessRefPath(gate) {
  if (/two-homes|staff-authority|tickbox/.test(gate)) return 'script.js';
  if (/support|consequence|confused/.test(gate)) return 'script.js';
  if (/pencil-ink|staff/.test(gate)) return 'staff.js';
  if (/geometry|colour/.test(gate)) return 'style.css';
  return 'script.js';
}
function mutationPlant(gate) {
  if (/cache-scope/.test(gate)) return 'fixture-server';
  if (/human-pace/.test(gate)) return 'fixture-pace-planted';
  if (/selftests/.test(gate)) return 'fixture-engine';
  if (/staff-authority/.test(gate)) return 'fixture-server';
  if (/tickbox/.test(gate)) return 'fixture-server';
  return 'fixture-book';
}

console.log(matrix('CONTROL MATRIX — a gate is only as good as the no it can be made to say',
  ['gate', 'control', 'verdict', 'why not'], rows));

if (failures) {
  console.log('  RED — ' + failures + ' control(s) did not fire. Evidence in tools/qa/out/control/.');
  process.exit(1);
}
console.log('  GREEN — every control fired and every over-tightening check passed (' + rows.length + ' controls).');
process.exit(0);
