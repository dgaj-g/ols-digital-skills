#!/usr/bin/env node
/* run.js — ONE COMMAND, THREE TIERS, TWO MATRICES.
 *
 * MATHS_GATES_DESIGN Part 6.1. Run from anywhere:
 *     node tools/qa/run.js            (--fast, the pre-commit tier)
 *     node tools/qa/run.js --full     (before every deploy)
 *     node tools/qa/run.js --control  (every control must FIRE)
 *     node tools/qa/run.js --book angles      (scopes the WALKERS to one book)
 *
 * Exit 0 green, 1 red. A CRASH OF ANY GATE IS RED, with the gate named — age of
 * the fault is no excuse and a harness that dies is a harness that measured
 * nothing (L11 / DFM 200).
 *
 * THE GATE LIST IS DERIVED, NEVER TYPED (L5). Every `qa-*.js` and `sit-*.js` in
 * this directory declares its own `TIER` and `ORDER` at the top of its source,
 * and this runner reads them the same way qa-coverage reads COVERS: from the
 * source, comments stripped. So writing a gate registers it — there is no
 * registry to forget to update (Part 6.4 step 4). A gate file with no TIER is a
 * failure named here, not a file that quietly never runs.
 *
 * SCOPING NEVER SILENCES (L3). `--book` narrows what the WALKERS walk; every
 * other gate still runs over every book, and qa-coverage still reports the whole
 * grid and still fails for the cells the scoped run did not close.
 *
 * BOTH MATRICES PRINT WHATEVER THE VERDICT — he reads the matrix, not only the
 * fails (Part 3.4).
 *
 * ───────────────────────── MS_WORKERS (package SPEED, 8 Sept 2026) ─────────
 * At the --full tier, everything after the fast-cheap-disqualifying gates run
 * through a pool of MS_WORKERS processes (default 6 — both his Macs are Apple
 * silicon with memory to spare; a headless shell is ~200 MB). qa-coverage still
 * runs LAST, alone (ORDER 95 — it judges what the walkers closed, and it needs
 * every sidecar written first). The three walkers are SHARDED across the pool
 * by book × width (sit-pupil, sit-confused) or width alone (sit-teacher, which
 * is not book-scoped) — MS_BOOK/MS_WIDTHS narrowed per shard, exactly the knobs
 * they already read — and every worker gets its OWN preview server on its own
 * port, so nothing collides. REPORTING ORDER NEVER MOVES: every gate's row in
 * the results matrix is looked up by name and printed in the SAME order the
 * serial run always used, regardless of which order the pool actually finished
 * them in — that is what makes the pooled matrix diffable against a serial
 * baseline at all.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync, spawn, execFileSync } = require('child_process');
const { stripComments } = require('./lib/decl.js');
const { matrix } = require('./lib/report.js');

const QA = __dirname;
const APP = path.resolve(QA, '../..');
const OUT = path.join(QA, 'out');
const SERVE_ROOT = path.resolve(APP, '..', '..');   /* the worktree root — what the preview server serves */
fs.mkdirSync(OUT, { recursive: true });

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const TIER = has('--control') ? 'control' : has('--full') ? 'full' : 'fast';
const BOOK = valOf('--book');
const ONLY = valOf('--only');            /* one gate, for developing it */
const WORKERS = Math.max(1, parseInt(process.env.MS_WORKERS || '6', 10));
const WIDTHS = [375, 768, 1280];
const WALKER_NAMES = ['sit-pupil', 'sit-confused', 'sit-teacher'];

/* which books the walkers cover — the SAME derivation qa-coverage itself uses.
   A broken/mid-build content pack must not crash the SCHEDULER; the walker
   process it is handed to will fail on its own, honestly, which is not this
   file's fault to hide or to fix (Part 3 note, 8 Sept). */
function booksToShard() {
  if (BOOK) return [BOOK];
  try { return require('./lib/app.js').books(); } catch (e) { return null; /* null = do not shard */ }
}

/* ------------------------------------------------------- the derived list */
function declared(file) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const t = /(?:^|\n)\s*(?:const|let|var)\s+TIER\s*=\s*'([a-z]+)'/.exec(src);
  const o = /(?:^|\n)\s*(?:const|let|var)\s+ORDER\s*=\s*(\d+)/.exec(src);
  const hasCovers = /(?:^|\n)\s*(?:const|let|var)\s+COVERS\s*=/.test(src);
  const hasControls = /(?:^|\n)\s*(?:const|let|var)\s+CONTROLS\s*=/.test(src);
  return { tier: t ? t[1] : null, order: o ? Number(o[1]) : 9999, hasCovers, hasControls };
}
function gateFiles() {
  return fs.readdirSync(QA)
    .filter(f => /^(qa-|sit-|extract-).*\.js$/.test(f))
    .map(f => {
      const d = declared(path.join(QA, f));
      return { file: f, name: f.replace(/\.js$/, ''), ...d };
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

const ALL = gateFiles();
const undeclared = ALL.filter(g => !g.tier);
/* fast ⊂ full: a gate declared for the fast tier runs in the full tier too */
const inTier = (g) => TIER === 'full' ? (g.tier === 'fast' || g.tier === 'full')
  : TIER === 'fast' ? g.tier === 'fast' : true;

/* ------------------------------------------------------------- the runner */
const results = [];              /* filled in DECLARATION order, never completion order */
const resultByName = new Map();

/* ONE SYNCHRONOUS GATE RUN (the --fast tier, and every gate before pooling
   existed). Unchanged from before MS_WORKERS. */
function runGateSync(g, extraArgs, env) {
  const started = Date.now();
  console.log('');
  console.log('==== ' + g.name + ' ' + '='.repeat(Math.max(0, 62 - g.name.length)));
  const r = spawnSync(process.execPath, [path.join(QA, g.file)].concat(extraArgs || []), {
    cwd: APP, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: Object.assign({}, process.env, env || {})
  });
  const outText = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(outText);
  const verdict = verdictOf(r, outText);
  const row = { name: g.name, verdict, secs: Math.round((Date.now() - started) / 100) / 10,
    fails: (outText.match(/^\s*FAIL\s/gm) || []).length, covers: g.hasCovers, controls: g.hasControls };
  resultByName.set(g.name, row);
  fs.writeFileSync(path.join(OUT, g.name + '.log'), outText);
  return row;
}

function verdictOf(r, outText) {
  let verdict;
  if (r.error) verdict = 'CRASH';
  else if (r.status === 0) verdict = 'GREEN';
  else if (r.signal) verdict = 'CRASH';
  else verdict = 'RED';
  /* a gate that exits non-zero without ever printing a FAIL line died rather
     than judged; say so, because "red" and "dead" are different repairs */
  if (verdict === 'RED' && !/\bFAIL\b/.test(outText)) verdict = 'CRASH';
  return verdict;
}

/* ONE ASYNC GATE RUN, for the pool. Same verdict rule as the sync path. */
function runGateAsync(file, args, env) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [path.join(QA, file)].concat(args || []), {
      cwd: APP, env: Object.assign({}, process.env, env || {})
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', (e) => resolve({ status: null, error: e, out, secs: (Date.now() - started) / 1000 }));
    child.on('close', (code, signal) => resolve({ status: code, signal, error: null, out, secs: (Date.now() - started) / 1000 }));
  });
}

/* A TINY POOL. N workers pull the next task off a shared queue; a task does
   not start until a worker is free. Task order is irrelevant to correctness —
   REPORTING order is fixed up afterwards from `list`, never from completion
   order (see file header). */
async function runPool(tasks, n, workerFn) {
  let i = 0;
  const lane = async () => { while (i < tasks.length) { const t = tasks[i++]; await workerFn(t); } };
  await Promise.all(new Array(Math.min(n, Math.max(1, tasks.length))).fill(0).map(lane));
}

/* ---- a preview server per worker, so nothing they walk collides ------- */
function waitUp(base, tries) {
  for (let t = 0; t < (tries || 100); t++) {
    try { execFileSync('curl', ['-sf', '-o', '/dev/null', '--max-time', '1', base]); return true; }
    catch (e) { try { execFileSync('sleep', ['0.15']); } catch (e2) {} }
  }
  return false;
}
function startWorkerServers(n) {
  const servers = [];
  for (let i = 0; i < n; i++) {
    let port = 8420 + i, taken = true;
    for (let guard = 0; guard < 60 && taken; guard++, port++) {
      try { execFileSync('curl', ['-sf', '-o', '/dev/null', '--max-time', '1', 'http://localhost:' + port + '/']); taken = true; }
      catch (e) { taken = false; }
    }
    const child = spawn('python3', [path.join(QA, 'serve-preview.py'), SERVE_ROOT, String(port)], { stdio: 'ignore', detached: true });
    const base = 'http://localhost:' + port + '/maths/mathshelf/index.html';
    servers.push({ child, port, base });
  }
  servers.forEach(s => { if (!waitUp(s.base.split('/maths')[0] + '/')) console.log('  ..    worker preview server on ' + s.port + ' never answered'); });
  return servers;
}
function stopWorkerServers(servers) {
  servers.forEach(s => { try { process.kill(-s.child.pid); } catch (e) { try { s.child.kill(); } catch (e2) {} } });
}

/* ---- merge N shard runs of one walker into the ONE row it always had ---- */
function mergeShardRows(name, g, shardResults, logLines) {
  const verdicts = shardResults.map(r => verdictOf(r, r.out));
  const order = { CRASH: 3, RED: 2, GREEN: 1 };
  const worst = verdicts.reduce((a, b) => (order[b] > order[a] ? b : a), 'GREEN');
  const fails = shardResults.reduce((sum, r) => sum + (r.out.match(/^\s*FAIL\s/gm) || []).length, 0);
  const secs = Math.round(Math.max(0, ...shardResults.map(r => r.secs)) * 10) / 10;
  const row = { name, verdict: worst, secs, fails, covers: g.hasCovers, controls: g.hasControls };
  resultByName.set(name, row);
  fs.writeFileSync(path.join(OUT, name + '.log'), logLines.join('\n\n'));
  return row;
}

/* ------------------------------------------------------------------- main */
async function main() {
  console.log('MathShelf gates — tier ' + TIER + (BOOK ? '  (walkers scoped to ' + BOOK + ')' : '') +
    (TIER === 'full' ? '  MS_WORKERS=' + WORKERS : '') +
    '   ' + new Date().toISOString().slice(0, 19).replace('T', ' '));
  console.log('app: ' + APP);

  if (undeclared.length) {
    undeclared.forEach(g => console.log('  FAIL  ' + g.name + ' x registration: no TIER declared — a gate nothing runs is not a gate'));
  }

  if (TIER === 'control') {
    const r = spawnSync(process.execPath, [path.join(QA, 'control.js')].concat(BOOK ? ['--book', BOOK] : []), {
      cwd: APP, stdio: 'inherit', maxBuffer: 64 * 1024 * 1024,
      env: Object.assign({}, process.env)
    });
    process.exit(r.status === 0 && !undeclared.length ? 0 : 1);
  }

  let list = ALL.filter(inTier);
  if (ONLY) list = ALL.filter(g => g.name === ONLY);
  const baseEnv = { MS_TIER_RUN: TIER };
  if (BOOK) baseEnv.MS_BOOK = BOOK;

  if (TIER !== 'full') {
    /* --fast: exactly as before pooling existed — serial, cheap, done in ~a second */
    list.forEach(g => runGateSync(g, [], baseEnv));
  } else {
    /* --full: fast-tier gates first (cheap, disqualifying), then everything
       else through the pool, then qa-coverage alone, last. */
    const fastFirst = list.filter(g => g.tier === 'fast');
    const coverage = list.filter(g => g.name === 'qa-coverage');
    const pooled = list.filter(g => g.tier === 'full' && g.name !== 'qa-coverage');

    fastFirst.forEach(g => runGateSync(g, [], baseEnv));

    if (pooled.length) {
      const servers = startWorkerServers(WORKERS);
      const nonWalker = pooled.filter(g => !WALKER_NAMES.includes(g.name));
      const walkers = pooled.filter(g => WALKER_NAMES.includes(g.name));

      /* every task carries a worker-slot-agnostic env; MS_BASE is stamped on
         by the pool worker that actually picks it up */
      const tasks = [];
      nonWalker.forEach(g => tasks.push({ kind: 'single', g, env: {} }));
      const books = booksToShard();
      walkers.forEach(g => {
        if (g.name === 'sit-teacher') {
          WIDTHS.forEach(w => tasks.push({ kind: 'shard', g, shard: String(w), env: { MS_WIDTHS: String(w) } }));
        } else if (books) {
          books.forEach(b => WIDTHS.forEach(w =>
            tasks.push({ kind: 'shard', g, shard: b + '-' + w, env: { MS_BOOK: b, MS_WIDTHS: String(w) } })));
        } else {
          /* content pack unreadable right now: run the walker whole, once,
             so it can report the real reason itself rather than the
             scheduler guessing at a book list that doesn't exist yet */
          tasks.push({ kind: 'single', g, env: {} });
        }
      });

      const shardsByGate = new Map();   /* name -> [{result, label}] */
      let nextWorker = 0;
      const workerOf = () => { const w = nextWorker; nextWorker = (nextWorker + 1) % servers.length; return w; };

      await runPool(tasks, WORKERS, async (t) => {
        const wi = workerOf();
        const env = Object.assign({}, baseEnv, t.env, { MS_BASE: servers[wi].base });
        const started = Date.now();
        console.log('');
        console.log('==== ' + t.g.name + (t.shard ? ' [' + t.shard + ']' : '') + ' (worker ' + wi + ') ' +
          '='.repeat(Math.max(0, 40 - t.g.name.length)));
        const r = await runGateAsync(t.g.file, [], env);
        process.stdout.write(r.out);
        if (t.kind === 'single') {
          const row = { name: t.g.name, verdict: verdictOf(r, r.out),
            secs: Math.round((Date.now() - started) / 100) / 10,
            fails: (r.out.match(/^\s*FAIL\s/gm) || []).length, covers: t.g.hasCovers, controls: t.g.hasControls };
          resultByName.set(t.g.name, row);
          fs.writeFileSync(path.join(OUT, t.g.name + '.log'), r.out);
        } else {
          if (!shardsByGate.has(t.g.name)) shardsByGate.set(t.g.name, []);
          shardsByGate.get(t.g.name).push({ result: r, label: t.shard });
        }
      });

      shardsByGate.forEach((shards, name) => {
        const g = walkers.find(w => w.name === name);
        const logLines = shards.map(s => '---- ' + name + ' [' + s.label + '] ----\n' + s.result.out);
        mergeShardRows(name, g, shards.map(s => s.result), logLines);
      });

      stopWorkerServers(servers);
    }

    coverage.forEach(g => runGateSync(g, [], baseEnv));
  }

  /* THE RESULTS MATRIX, in DECLARATION order — never completion order */
  list.forEach(g => { if (!resultByName.has(g.name)) return; results.push(resultByName.get(g.name)); });

  /* ---- THE RESULTS MATRIX ------------------------------------------- */
  console.log(matrix('RESULTS — ' + TIER, ['gate', 'verdict', 'fails', 'secs', 'COVERS', 'CONTROLS'],
    results.map(r => [r.name, r.verdict, r.fails || '', r.secs, r.covers ? 'yes' : 'MISSING', r.controls ? 'yes' : 'MISSING'])));

  /* ---- THE COVERAGE MATRIX, whatever the verdict --------------------- */
  const cov = path.join(OUT, 'coverage-matrix.txt');
  if (fs.existsSync(cov)) console.log(fs.readFileSync(cov, 'utf8'));
  else console.log('  (no coverage matrix written — qa-coverage did not run)');

  const red = results.filter(r => r.verdict !== 'GREEN');
  console.log('');
  if (red.length || undeclared.length) {
    console.log('RED — ' + red.map(r => r.name + ' (' + r.verdict + ')').concat(undeclared.map(g => g.name + ' (undeclared)')).join(', '));
    process.exit(1);
  }
  console.log('GREEN — ' + results.length + ' gates, tier ' + TIER);
  process.exit(0);
}
main();
