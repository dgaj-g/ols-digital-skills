#!/usr/bin/env node
/* qa-coverage.js — A SURFACE THAT EXISTS IS A SURFACE THAT IS COVERED.
 *
 * THE MACHINE OF PART 3, and the reason this whole system exists. Damien's
 * words, 13 Aug 2026, about the KS3 DT platform: "how can a harness fail to be,
 * well, harnessed? makes no sense and I'm very frustrated." Every checker had
 * been pointed at the fault that created it, and NOTHING mechanical demanded it
 * cover the rest. Coverage lived as a to-do, and a to-do is not a harness.
 *
 * So: the grid is DERIVED (L5) — the books, sections, questions, kinds and dx
 * codes from the packs themselves, unfiltered; the surfaces and states from the
 * app's own registry; what was actually reached from the walkers' sidecars; and
 * what each gate CLAIMS to cover from that gate's own source, comments
 * stripped, braces counted. There is no list to keep up to date, which is the
 * point: a list is the thing that goes stale.
 *
 * A cell nobody closes is a FAILURE naming the cell. A gate that cannot say
 * what it covers covers nothing. A gate with no control is a decoration.
 *
 * THE MATRIX PRINTS WHATEVER THE VERDICT. He reads the matrix.
 *
 * THIS GATE CANNOT BE SKIPPED AND HAS NO FLAG (Part 3.6).
 *
 * FROM: ks3-dt qa-harness-coverage.js (bdd8c5a) — the declaration parsers are
 * copied verbatim into lib/decl.js; the grid is maths' own (packs × surfaces).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const A = require('./lib/app.js');
const { Gate, matrix } = require('./lib/report.js');
const { coversOf, controlsOf, objectEntries, stripComments } = require('./lib/decl.js');
const { contentHash, fileHash, sha1 } = require('./lib/hash.js');
const TC = require('./lib/timeconsts.js');

const TIER = 'fast';
const ORDER = 11;
const COVERS = { books: '*', kinds: '*', surfaces: '*', widths: [375, 768, 1280], projector: true, tier: ['preview', 'built'], cells: ['coverage'] };
const CONTROLS = [
  { id: 'control-book', kind: 'fixture', plant: 'fixture-book', mustFail: /fixture .* x (truth|walk-right|verdict)/ },
  { id: 'control-surface', kind: 'fixture', plant: 'fixture-surface-ghost', mustFail: /fixture-screen/ },
  { id: 'control-declaration', kind: 'fixture', plant: 'fixture-gate-undeclared', mustFail: /no COVERS export/ },
  { id: 'control-declaration-comment', kind: 'fixture', plant: 'fixture-gate-commented', mustFail: /no COVERS export/ },
  { id: 'control-waiver', kind: 'fixture', plant: 'fixture-debt-edited', mustFail: /has been edited/ },
  { id: 'control-stale', kind: 'fixture', plant: 'sidecar.stale.json', mustFail: /nothing stood on/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const FULL = process.env.MS_TIER_RUN === 'full';
const g = new Gate('qa-coverage');
g.exempt([
  'at the --fast tier a walker sidecar may be older than the content and is REPORTED, not failed; at --full a stale sidecar counts as absent',
  'a cell with a row in MATHS_COVERAGE_DEBT.md is printed as debt on every run and is not counted as closed',
  'the fixture book is loaded only when a control asks for it, and never by the shipped app'
]);

const HASH = contentHash(A.APP);
g.note('content hash ' + HASH + (FULL ? '   (full tier: sidecars are required)' : '   (fast tier: sidecars are reported)'));

/* ═══════════════════════════════════════════ 1. the declarations ═══════ */
const gateFiles = fs.readdirSync(A.QA)
  .filter(f => /^(qa-|sit-|extract-).*\.js$/.test(f) && f !== 'qa-coverage.js')
  .sort();
const DECL = {};
gateFiles.forEach(f => {
  const p = A.qa(f);
  const name = f.replace(/\.js$/, '');
  const covers = coversOf(p);
  const controls = controlsOf(p);
  if (!covers) g.fail(name, 'declaration', 'no COVERS export — a gate that cannot say what it covers covers nothing');
  if (!controls || !controls.length) g.fail(name, 'declaration', 'no CONTROLS export — a gate that has never said no is a decoration');
  if (controls && controls.length) {
    const over = controls.some(c => c.mustPass || c.id === 'over-tightening');
    g.check(over, name, 'declaration',
      'no over-tightening control — every gate must name a correct thing it must PASS, or a rule narrowed to spare a real sentence has nothing holding it (L6)');
    controls.forEach(c => {
      if (c.mustPass) return;
      g.check(!!c.mustFail, name + '.' + c.id, 'declaration',
        'a control with no mustFail — a non-zero exit alone is not proof; the control must say WHICH sentence it expects');
    });
  }
  if (covers) DECL[name] = { covers, controls: controls || [] };
});
/* qa-coverage declares itself too, so the count in the matrix is honest */
DECL['qa-coverage'] = { covers: COVERS, controls: CONTROLS };

/* which gates claim a cell family, filtered by book/kind/surface */
function closers(cell, ctx) {
  return Object.keys(DECL).filter(name => {
    const c = DECL[name].covers;
    const cells = c.cells || [];
    if (!cells.includes(cell)) return false;
    if (ctx.book && c.books !== '*' && Array.isArray(c.books) && !c.books.includes(ctx.book)) return false;
    if (ctx.kind && c.kinds !== '*' && Array.isArray(c.kinds) && !c.kinds.includes(ctx.kind)) return false;
    if (ctx.surface && c.surfaces !== '*' && Array.isArray(c.surfaces) && !c.surfaces.includes(ctx.surface)) return false;
    if (ctx.width && Array.isArray(c.widths) && c.widths.length && !c.widths.includes(ctx.width)) return false;
    return true;
  });
}

/* ═══════════════════════════════════════════ 2. the debt ledger ════════ */
const debt = [];
if (A.exists(A.qa('MATHS_COVERAGE_DEBT.md'))) {
  A.read(A.qa('MATHS_COVERAGE_DEBT.md')).split('\n').forEach(l => {
    const cols = l.split('|').map(s => s.trim());
    if (cols.length < 7 || !/×/.test(cols[1])) return;
    debt.push({ cell: cols[1], reason: cols[2], owner: cols[3], file: cols[4], sha: cols[5], waiver: cols[6] });
  });
}
/* THE FREEZE: you may not change a thing whose coverage you owe. */
debt.forEach(d => {
  if (!d.file || d.file === '(any)' || !A.exists(A.app(d.file))) return;
  if (d.sha === '(any)') return;
  const now = fileHash(A.app(d.file));
  if (now !== d.sha) {
    if (/WAIVED BY HIS RULING/.test(d.waiver)) g.note('debt ' + d.cell + ': ' + d.file + ' has been edited but the row is waived — ' + d.waiver);
    else g.fail(d.cell, 'coverage-debt',
      d.file + ' has been edited (' + d.sha + ' -> ' + now + ') while its coverage is still owed — close the cell or record his waiver before changing the file');
  }
});
const owed = new Set(debt.map(d => d.cell));

/* ═══════════════════════════════════════════ 3. the sidecars ═══════════ */
const walkDir = A.out('walk');
const sidecars = [];
if (fs.existsSync(walkDir)) {
  fs.readdirSync(walkDir).filter(f => /\.json$/.test(f)).forEach(f => {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(walkDir, f), 'utf8')); } catch (e) { return; }
    const stale = j.contentHash !== HASH;
    if (stale && FULL) { g.note('sidecar ' + f + ' is STALE (' + j.contentHash + ' != ' + HASH + ') and counts as absent'); return; }
    if (stale) g.note('sidecar ' + f + ' is stale (reported, not failed, at the fast tier)');
    sidecars.push(j);
  });
}
const stood = new Set();          /* "surface:state" and "surface:state@width" */
const perQuestion = new Set();    /* "qid:state@width" */
const audits = new Map();         /* "surface:state@width" -> Set(audit names that PASSED) */
sidecars.forEach(j => {
  (j.states || []).forEach(s => {
    const base = s.surface + ':' + s.state;
    stood.add(base);
    stood.add(base + '@' + j.width);
    if (s.qid) perQuestion.add(s.qid + ':' + s.state + '@' + j.width);
    const key = base + '@' + j.width;
    if (!audits.has(key)) audits.set(key, new Set());
    Object.keys(s.audits || {}).forEach(a => { if (s.audits[a] === 'PASS') audits.get(key).add(a); });
  });
});

/* ═══════════════════════════════════════════ 4. the cells ══════════════ */
const rows = [];               /* the matrix */
const WIDTHS = [375, 768, 1280];
function cell(name, ctx, closedBy, note) {
  const key = (ctx.label || name);
  const isOwed = owed.has(key) || owed.has((ctx.book || '') + ' × ' + name);
  rows.push([name, key, closedBy && closedBy.length ? closedBy.join(' ') : (isOwed ? 'DEBT' : 'MISSING'), note || '']);
  if (closedBy && closedBy.length) return true;
  if (isOwed) return true;
  return false;
}

/* --- truth: every question, a lint branch AND a validate-all pair -------- */
const lintKinds = {};
['dev/lint-content-angles.js', 'dev/lint-content-algebra.js', 'dev/lint-content-stats.js', 'dev/validate-all.js'].forEach(rel => {
  const p = A.app(rel);
  if (!A.exists(p)) return;
  const src = stripComments(A.read(p));
  const m = /(?:const|var|let)\s+KINDS\s*=\s*\[([^\]]*)\]/.exec(src);
  lintKinds[rel] = m ? (m[1].match(/'([^']+)'/g) || []).map(s => s.slice(1, -1)) : null;
});
Object.keys(lintKinds).forEach(rel => {
  if (lintKinds[rel] === null) g.fail(rel, 'declaration',
    'no KINDS export — the lint cannot say which question kinds it re-derives, so nothing can prove a new kind was linted');
});
A.grid().forEach(q => {
  const label = q.book + ' > ' + q.section + ' > ' + q.qid + ' (' + q.kind + ')';
  const lintFor = Object.keys(lintKinds).filter(rel => rel !== 'dev/validate-all.js' && (lintKinds[rel] || []).includes(q.kind));
  const valFor = (lintKinds['dev/validate-all.js'] || []).includes(q.kind);
  const ok = cell('truth', { label: label + ' × truth', book: q.book, kind: q.kind },
    lintFor.length && valFor ? lintFor.concat(['validate-all']) : null,
    lintFor.length ? (valFor ? '' : 'no validate-all pair') : 'no lint re-derivation for this kind');
  if (!ok) g.fail(label, 'truth',
    (lintFor.length ? 'validate-all does not declare the kind "' + q.kind + '", so no model attempt is proved for it'
      : 'no content lint declares the kind "' + q.kind + '", so this question\'s answer is re-derived by nothing'));
});

/* --- walk-right / walk-wrong / movie ------------------------------------ */
A.grid().forEach(q => {
  WIDTHS.forEach(w => {
    const label = q.book + ' > ' + q.section + ' > ' + q.qid + ' (' + q.kind + ') @' + w;
    const right = perQuestion.has(q.qid + ':checked-right@' + w);
    const wrong = perQuestion.has(q.qid + ':checked-wrong-2@' + w);
    const okR = cell('walk-right', { label: label + ' × walk-right', book: q.book, kind: q.kind, width: w }, right ? ['sit-pupil'] : null);
    const okW = cell('walk-wrong', { label: label + ' × walk-wrong', book: q.book, kind: q.kind, width: w }, wrong ? ['sit-confused'] : null);
    if (FULL && !okR) g.fail(label, 'walk-right', 'nothing stood on this question answered right at this width');
    if (FULL && !okW) g.fail(label, 'walk-wrong', 'nothing stood on this question answered wrong twice at this width');
  });
});
A.movies().forEach(m => {
  ['end', 'instant', 'reduced-motion'].forEach(st => {
    const label = m.book + ' > ' + m.section + ' > movie:' + st;
    const ok = cell('movie', { label: label + ' × movie', book: m.book }, stood.has('movie:' + st) ? ['sit-pupil'] : null);
    if (FULL && !ok) g.fail(label, 'movie', 'nothing reached this film in this state');
  });
});

/* --- the surface × state × width families ------------------------------- */
const RIDERS = ['geometry', 'readability', 'colour', 'consequence', 'click-safety', 'empty', 'nested', 'strings'];
let REG = {};
if (A.exists(A.out('surfaces.json'))) REG = JSON.parse(A.read(A.out('surfaces.json')));
Object.keys(REG).forEach(surface => {
  (REG[surface] || []).forEach(state => {
    WIDTHS.forEach(w => {
      const key = surface + ':' + state + '@' + w;
      const got = audits.get(key) || new Set();
      RIDERS.forEach(r => {
        const label = surface + ':' + state + ' @' + w + ' × ' + r;
        const ok = cell(r, { label, surface, width: w }, got.has(r) ? ['walker'] : null);
        if (FULL && !ok) g.fail(surface + ':' + state + ' @' + w, r,
          got.size ? 'the walker stood here but the ' + r + ' audit did not report a pass' : 'nothing stood on this state at this width');
      });
    });
  });
});

/* --- human-pace: every clock has a row ---------------------------------- */
{
  const inv = A.exists(A.qa('MATHS_HUMAN_PACE_INVENTORY.md')) ? A.read(A.qa('MATHS_HUMAN_PACE_INVENTORY.md')) : '';
  TC.all(A.APP).forEach(c => {
    const ok = cell('human-pace', { label: c.key + ' × human-pace' }, inv.includes('`' + c.key + '`') ? ['qa-human-pace'] : null);
    if (!ok) g.fail(c.file + ' :: ' + c.fn + ' :: ' + c.value, 'human-pace', 'no inventory row');
  });
}

/* --- two-homes: every server action and every offline case -------------- */
{
  const tpl = A.exists(A.app('server/Code.gs.template')) ? stripComments(A.read(A.app('server/Code.gs.template'))) : '';
  const stub = stripComments(A.read(A.app('script.js')));
  const actions = new Set();
  let m;
  const reCase = /case\s+'([a-z]+)'\s*:/g;
  while ((m = reCase.exec(stub))) actions.add(m[1]);
  const reSub = /sub\s*===\s*'([a-z]+)'/g;
  while ((m = reSub.exec(tpl))) actions.add(m[1]);
  const reApi = /function\s+api([A-Z][A-Za-z]*)/g;
  while ((m = reApi.exec(tpl))) actions.add(m[1].toLowerCase());
  const matrixSrc = A.exists(A.qa('qa-two-homes.js')) ? stripComments(A.read(A.qa('qa-two-homes.js'))) : '';
  actions.forEach(a => {
    const named = new RegExp("'" + a + "'").test(matrixSrc);
    const ok = cell('two-homes', { label: a + ' × two-homes' }, named ? ['qa-two-homes'] : null);
    if (!ok) g.fail(a, 'two-homes', 'this server action appears in no row of qa-two-homes\'s matrix — a behaviour with two homes must be EXECUTED in both');
  });
}

/* --- deploy ------------------------------------------------------------- */
['qa-build', 'qa-manifest', 'qa-repo-prod'].forEach(name => {
  const ok = cell('deploy', { label: name + ' × deploy' }, DECL[name] ? [name] : null);
  if (!ok) g.fail(name, 'deploy', 'the deploy gate does not exist — the pair he pastes would be proved by nothing');
});

/* --- verdict: every string under review, every question ----------------- */
{
  const audit = A.exists(A.qa('MATHS_GATES_AUDIT.md')) ? A.read(A.qa('MATHS_GATES_AUDIT.md')) : '';
  const under = A.books().filter(b => {
    const re = new RegExp('^\\|\\s*' + b + '[^|]*\\|\\s*([^|]+)\\|', 'im');
    const m = re.exec(audit);
    return !(m && /APPROVED/i.test(m[1]));
  });
  under.forEach(b => {
    const vf = A.qa('MATHS_COLD_READ_VERDICTS_' + b + '.md');
    const ok = cell('verdict', { label: b + ' × verdict', book: b }, A.exists(vf) ? ['qa-cold-read'] : null);
    if (FULL && !ok) g.fail(b, 'verdict', 'this book is under review and has no filed cold-read verdict');
  });
  const tf = A.qa('MATHS_COLD_READ_VERDICTS_TEACHER.md');
  const ok = cell('verdict', { label: 'teacher × verdict' }, A.exists(tf) ? ['qa-cold-read'] : null);
  if (FULL && !ok) g.fail('teacher', 'verdict', 'the teacher layer has no filed cold-read verdict');
}

/* ═══════════════════════════════════════════ 5. the matrix ═════════════ */
const byFamily = {};
rows.forEach(r => {
  byFamily[r[0]] = byFamily[r[0]] || { closed: 0, missing: 0, debt: 0 };
  if (r[2] === 'MISSING') byFamily[r[0]].missing++;
  else if (r[2] === 'DEBT') byFamily[r[0]].debt++;
  else byFamily[r[0]].closed++;
});
const summary = matrix('COVERAGE MATRIX (content hash ' + HASH + ', tier ' + (FULL ? 'full' : 'fast') + ')',
  ['cell family', 'closed', 'missing', 'debt'],
  Object.keys(byFamily).sort().map(k => [k, byFamily[k].closed, byFamily[k].missing || '', byFamily[k].debt || '']));
const missingRows = rows.filter(r => r[2] === 'MISSING');
const detail = missingRows.length
  ? matrix('CELLS NOTHING CLOSES (' + missingRows.length + ')', ['family', 'cell', '', 'why'], missingRows.slice(0, 60))
  : '\n  every cell is closed.\n';
const debtRows = debt.map(d => [d.cell, d.owner, d.file, /WAIVED/.test(d.waiver) ? 'WAIVED' : 'OPEN']);
const debtOut = debtRows.length ? matrix('DEBT LEDGER (printed every run)', ['cell', 'owner / phase', 'file', 'state'], debtRows) : '';
A.ensureOut();
fs.writeFileSync(A.out('coverage-matrix.txt'), summary + detail + debtOut);
console.log(summary + detail + debtOut);

g.note(rows.length + ' cells; ' + missingRows.length + ' with nothing to close them; ' + debt.length + ' debt rows');
g.done();
