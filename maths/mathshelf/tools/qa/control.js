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
const { spawnSync, spawn, execFile, execFileSync } = require('child_process');
const A = require('./lib/app.js');
const { matrix } = require('./lib/report.js');
const { coversOf, controlsOf } = require('./lib/decl.js');
const { bookHash } = require('./lib/hash.js');
const { PLANTS, plantRef } = require('./fixtures/plants.js');

const REPO = (() => {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: A.APP, encoding: 'utf8' }).trim(); }
  catch (e) { return null; }
})();
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const CHANGED = process.argv.includes('--changed');
const WORKERS = Math.max(1, parseInt(process.env.MS_WORKERS || '6', 10));

const gates = fs.readdirSync(A.QA)
  .filter(f => /^(qa-|sit-|extract-).*\.js$/.test(f))
  .filter(f => !ONLY || f === ONLY + '.js')
  .sort();

/* ═══════════════════════════ --changed (package SPEED, 8 Sept 2026) ═══════
 * "Runs only the controls that this commit could have affected." Never a
 * typed list (L5): derived from `git diff --name-only <last recorded green>`
 * against three signals a gate's own source already carries — its own file,
 * what it requires (lib/, fixtures/plants.js — a plant changing can change
 * what every mutation-kind control does), and what its COVERS names. With no
 * recorded green (the line `controls: green <date> <commit>` in PROGRESS.md,
 * read-only from here — see HANDOVER.md) it runs everything, same as today. */
function lastRecordedGreen() {
  let txt = '';
  try { txt = fs.readFileSync(A.app('PROGRESS.md'), 'utf8'); } catch (e) { return null; }
  const m = /controls:\s*green\s+(\S+)\s+([0-9a-f]{6,40})/i.exec(txt);
  return m ? { date: m[1], commit: m[2] } : null;
}
function changedFilesSince(commit) {
  if (!REPO) return null;
  try {
    const raw = execFileSync('git', ['diff', '--name-only', commit], { cwd: A.APP, encoding: 'utf8' });
    const appRel = path.relative(REPO, A.APP).split(path.sep).join('/') + '/';
    return raw.split('\n').map(s => s.trim()).filter(Boolean)
      .filter(p => p.startsWith(appRel)).map(p => p.slice(appRel.length));
  } catch (e) { return null; }
}
/* the file set one book's walk depends on — the SAME derivation bookHash uses,
   read back out rather than re-typed, so the two can never disagree */
function bookFileSet(bookId) {
  const shared = ['script.js', 'jotter.js', 'player.js', 'strings.js', 'style.css', 'shell.css', 'index.html'];
  let packName = 'content-' + bookId + '.js';
  try {
    fs.readdirSync(A.APP).filter(f => /^content-.*\.js$/.test(f)).forEach(f => {
      const src = fs.readFileSync(A.app(f), 'utf8');
      if (new RegExp('GJ_CONTENT(?:\\.' + bookId + '\\b|\\[[\'"]' + bookId + '[\'"]\\])').test(src)) packName = f;
    });
  } catch (e) {}
  const set = new Set([packName].concat(shared));
  if (/angle/.test(packName)) set.add('anglecore.js');
  else if (/stat/.test(packName)) { set.add('statcore.js'); set.add('statchart.js'); set.add('jotter-stats.js'); }
  else set.add('mathcore.js');
  return set;
}
function requiresOf(file) {
  let src = ''; try { src = fs.readFileSync(A.qa(file), 'utf8'); } catch (e) { return []; }
  const out = [];
  (src.match(/require\(\s*'\.\/[^']+'\s*\)/g) || []).forEach(m => {
    const rel = m.slice(m.indexOf("'./") + 2, -2);   /* './lib/foo.js' -> 'lib/foo.js' */
    out.push(rel.replace(/^\.\//, ''));
  });
  return out;
}
function gateAffected(file, covers, changed) {
  if (changed === null) return true;                       /* can't compute the diff: run it */
  if (changed.includes('tools/qa/' + file)) return true;
  if (requiresOf(file).some(r => changed.includes('tools/qa/' + r))) return true;
  if (changed.includes('tools/qa/fixtures/plants.js')) return true;   /* a plant changed: every mutation control is in question */
  if (covers) {
    const books = (covers.books === '*') ? (A.books ? (() => { try { return A.books(); } catch (e) { return []; } })() : []) : (covers.books || []);
    if (books.some(b => { const fs2 = bookFileSet(b); return changed.some(c => fs2.has(c)); })) return true;
  }
  return false;
}
const CHANGE_BASE = CHANGED ? lastRecordedGreen() : null;
const CHANGED_FILES = CHANGE_BASE ? changedFilesSince(CHANGE_BASE.commit) : null;
if (CHANGED) {
  console.log(CHANGE_BASE
    ? '--changed: diffing against controls: green ' + CHANGE_BASE.date + ' ' + CHANGE_BASE.commit +
      (CHANGED_FILES === null ? '  (diff failed — running everything)' : '  (' + CHANGED_FILES.length + ' file(s) changed)')
    : '--changed: no recorded green in PROGRESS.md — running everything');
}

const rows = [];   /* filled by JOB INDEX, never by completion order — see runPool below */
let failures = 0;
A.ensureOut('control');

/* THE SANDBOX KEEPS THE REPO'S SHAPE. A flat copy of the app folder is not the
   tree the app is built from: the assembler and the page both read inputs from
   the REPO ROOT (style.css, assets/), so in a flat sandbox a fresh build could
   never run and the control that asks whether the committed pair is stale could
   never fire. The sandbox therefore puts the app back at maths/mathshelf and
   carries what the page names, plus the folders those named files live in. */
function sandbox() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'mathshelf-control-'));
  const dir = path.join(base, 'maths', 'mathshelf');
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('cp', ['-R', A.APP + '/', dir + '/']);
  if (REPO) {
    /* THE PAGE SAYS WHAT IT NEEDS; DO NOT KEEP A SECOND LIST. This was two
       hardcoded paths, and index.html quietly grew a third - ../../assets/
       crest.png - so every browser control ran against a page that 404'd on the
       crest. Seven console errors, on every state, on every control: the walk
       failed for the missing file instead of for the planted fault, and three
       controls read DID NOT FIRE while the laws they guard were working
       perfectly. A control that fails for the wrong reason is worse than no
       control, because it looks like the gate is broken. The list is now read
       out of the page itself, so it cannot fall behind it again. */
    const idx = fs.readFileSync(path.join(A.APP, 'index.html'), 'utf8');
    const wanted = new Set();
    (idx.match(/(?:src|href)="\.\.\/\.\.\/[^"]+"/g) || []).forEach(m => {
      wanted.add(m.replace(/^(?:src|href)="\.\.\/\.\.\//, '').replace(/"$/, '').split(/[?#]/)[0]);
    });
    /* AND A LOADER FETCHES ITS NEIGHBOURS. assets/intro-loader.js asks for
       intro.mp4 and intro-portrait.mp4 by bare filename - they are named
       nowhere in index.html, so a list built from the page alone misses them,
       and every walk in every sandbox logged a 404 for the film. The comment
       that used to sit here said assets/ was "thirteen megabytes of film and
       none of it is read here". It is read. Carrying the whole folder costs a
       local copy of 13MB per control - milliseconds - and buys a sandbox that
       is actually the tree the gate is written against. A named file brings its
       folder with it; a file at the root comes on its own. */
    const carry = new Set();
    wanted.forEach(rel => {
      const dirOf = path.dirname(rel);
      carry.add(dirOf === '.' ? rel : dirOf);
    });
    carry.forEach(rel => {
      const src = path.join(REPO, rel);
      if (!fs.existsSync(src)) return;
      const dest = path.join(base, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      execFileSync('cp', ['-R', src, dest]);
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
  /* A PORT SOMETHING ELSE IS ALREADY ANSWERING ON IS NOT OUR PORT. The counter
     restarts at 8300 every run, and a battery that was interrupted leaves its
     detached servers behind - so the next run's server failed to bind, the
     "is it up?" curl succeeded against the STALE one, and the walk tested a
     sandbox from hours earlier. Two teacher controls read DID NOT FIRE for
     exactly that: one was talking to a tree with another control's fixture
     renderers in it. Step over anything already listening. */
  let port = ++PORT;
  for (let guard = 0; guard < 60; guard++) {
    let taken = false;
    try { execFileSync('curl', ['-sf', '-o', '/dev/null', '--max-time', '1', 'http://localhost:' + port + '/']); taken = true; }
    catch (e) { taken = false; }
    if (!taken) break;
    port = ++PORT;
  }
  /* AND PROVE IT IS OURS. A free port can still be claimed between the check
     and the spawn. The sandbox carries a token nobody else's copy has, and the
     server does not count as up until it hands that token back. */
  const token = 'mz-' + Math.random().toString(36).slice(2) + '-' + port;
  try { fs.writeFileSync(path.join(dir, 'mz-sandbox-token.txt'), token); } catch (e) {}
  const py = A.qa('serve-preview.py');
  const child = require('child_process').spawn('python3', [py, root, String(port)], { stdio: 'ignore', detached: true });
  return { child, token: token,
    tokenUrl: 'http://localhost:' + port + '/maths/mathshelf/mz-sandbox-token.txt',
    base: 'http://localhost:' + port + '/maths/mathshelf/index.html' };
}

/* ASYNC gate run, for the pool — spawnSync would block every other worker in
   this single-threaded process, which is the whole difference between a pool
   and a queue with extra steps. */
function runGateAsync(dir, gateFile, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(dir, 'tools/qa', gateFile)], {
      cwd: dir, env: Object.assign({}, process.env, { MS_TIER_RUN: 'control' }, env || {})
    });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('error', (e) => resolve({ status: null, out, error: e }));
    child.on('close', (code) => resolve({ status: code, out, error: null }));
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function curlOkAsync(args) {
  return new Promise((resolve) => execFile('curl', args, (err, stdout) => resolve(err ? null : stdout)));
}

console.log('MathShelf controls — every gate must be seen to say no');
console.log('app: ' + A.APP + (REPO ? '   repo: ' + REPO : '   (no git repo: pinned-ref controls cannot run)') +
  '   MS_WORKERS=' + WORKERS);

/* ═══════════════════════════════ THE JOB LIST, in DECLARATION ORDER ═══════ */
const jobs = [];   /* each job writes to rows[job.rowIndex] — never rows.push from inside the pool */
gates.forEach(file => {
  const name = file.replace(/\.js$/, '');
  const p = A.qa(file);
  const covers = coversOf(p);
  const controls = controlsOf(p);
  if (!covers) { rows.push([name, '(declaration)', 'NO COVERS', 'a gate that cannot say what it covers covers nothing']); failures++; return; }
  if (!controls || !controls.length) { rows.push([name, '(declaration)', 'NO CONTROLS', 'a gate that has never said no is a decoration']); failures++; return; }

  const affected = !CHANGED || gateAffected(file, covers, CHANGED_FILES);
  controls.forEach(c => {
    const id = c.id || '(unnamed)';
    if (!affected) { rows.push([name, id, 'SKIPPED (--changed)', 'neither this gate, what it requires, nor a book it covers changed since the recorded green']); return; }
    const rowIndex = rows.length;
    rows.push(null);   /* reserved: filled by this job, wherever in the pool it actually runs */
    jobs.push({ file, name, p, c, id, rowIndex });
  });
});

/* ═══════════════════════════════════ ONE JOB, run async ═══════════════════ */
async function runJob(job) {
  const { file, name, p, c, id, rowIndex } = job;
  let dir = null;
  const setRow = (arr) => { rows[rowIndex] = arr; };
  try {
    if (c.mustPass || c.kind === 'shipped') {
      /* OVER-TIGHTENING: the shipped tree, unplanted, must PASS */
      const r = await runGateAsync(A.APP, file, {});
      const fired = r.status === 0;
      setRow([name, id, fired ? 'PASSES (over-tightening)' : 'RED', fired ? '' : 'the shipped tree fails its own gate']);
      fs.writeFileSync(A.out('control/' + name + '.' + id + '.log'), r.out);
      if (!fired) failures++;
      return;
    }

    if (c.kind === 'self-probe') {
      /* the gate proves its own detector, in its own run, and says so */
      const r = await runGateAsync(A.APP, file, {});
      const named = c.mustFail ? new RegExp(c.mustFail.source.replace(/^\^|\$$/g, '')).source : '';
      const has = fs.readFileSync(p, 'utf8').indexOf(named.slice(0, 24).replace(/\\/g, '')) >= 0;
      setRow([name, id, has ? 'SELF-PROVES' : 'RED', has ? '' : 'the gate does not carry the self-probe it declares']);
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

    /* A WALKER'S CONTROL IS PROVED ON ONE BOOK AT ONE WIDTH. The battery asks
       one question - can this gate be made to say no? - and a walk of every
       book at every width answers it no better than a walk of one, while
       costing half an hour a control. The FULL walk is what `run.js --full`
       is for, and it is a different question. */
    if (/^sit-/.test(file)) env = Object.assign({ MS_WIDTHS: '1280', MS_BOOK: A.books()[0] }, env);
    let server = null;
    if (needsBrowser(file)) {
      server = serveSandbox(dir);
      env = Object.assign({}, env, { MS_BASE: server.base });
      /* wait for the server to answer before the gate asks it for a page —
         ASYNC, so a slow-to-bind sandbox stalls only this job's worker slot,
         never the other MS_WORKERS jobs running alongside it. Thirty seconds,
         same budget as before pooling, and it says so if it never comes. */
      let up = false;
      for (let t = 0; t < 100 && !up; t++) {
        const got = await curlOkAsync(['-sf', '--max-time', '2', server.tokenUrl]);
        if (got && got.trim() === server.token) up = true;
        else await sleep(300);
      }
      if (!up) throw new Error('the sandbox server never answered on ' + server.base);
    }
    let r = await runGateAsync(dir, file, env);
    /* ONE RETRY, AND ONLY FOR A RIG FAILURE. A control that could not open a
       page has told us nothing about the gate; a control that opened one and
       did not fire has. The retry is for the first kind only, and it is
       named in the log so a flaky rig cannot hide behind it. */
    if (server && /Navigation timeout|ERR_CONNECTION|Target closed|detached Frame/i.test(r.out)) {
      r.out += '\n  ..    the page did not open; the control was run a second time\n';
      r = await runGateAsync(dir, file, env);
    }
    if (server) { try { process.kill(-server.child.pid); } catch (e) { try { server.child.kill(); } catch (e2) {} } }
    const said = c.mustFail ? c.mustFail.test(r.out) : false;
    const fired = r.status !== 0 && said;
    setRow([name, id, fired ? 'FIRED' : 'DID NOT FIRE',
      fired ? '' : (r.status === 0 ? 'the gate passed a planted fault' : 'the gate failed, but not with "' + String(c.mustFail) + '"')]);
    fs.writeFileSync(A.out('control/' + name + '.' + id + '.log'), r.out);
    if (!fired) failures++;
  } catch (e) {
    /* A CONTROL THAT CANNOT RUN IS RED. Not a skip: a skip is how a gate
       comes to be trusted for a year without ever having been proved. */
    setRow([name, id, 'CANNOT RUN', String(e && e.message || e).slice(0, 90)]);
    failures++;
  } finally {
    if (dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} }
  }
}

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

/* ═══════════════════ THE POOL: MS_WORKERS jobs at a time ══════════════════
 * Every job writes to its own reserved rows[rowIndex], so the matrix prints
 * in the exact order it always did regardless of which order the pool
 * actually finishes them in — that is what makes it diffable against a
 * serial baseline (package SPEED, 8 Sept 2026). */
async function runPool(list, n, workerFn) {
  let i = 0;
  const lane = async () => { while (i < list.length) { const job = list[i++]; await workerFn(job); } };
  await Promise.all(new Array(Math.min(n, Math.max(1, list.length))).fill(0).map(lane));
}

(async () => {
  await runPool(jobs, WORKERS, runJob);

  console.log(matrix('CONTROL MATRIX — a gate is only as good as the no it can be made to say',
    ['gate', 'control', 'verdict', 'why not'], rows));

  if (failures) {
    console.log('  RED — ' + failures + ' control(s) did not fire. Evidence in tools/qa/out/control/.');
    process.exit(1);
  }
  console.log('  GREEN — every control fired and every over-tightening check passed (' + rows.length + ' controls).' +
    (CHANGED ? '' : '  Record this as `controls: green ' + new Date().toISOString().slice(0, 10) + ' <this commit>` in PROGRESS.md to enable --changed.'));
  process.exit(0);
})();
