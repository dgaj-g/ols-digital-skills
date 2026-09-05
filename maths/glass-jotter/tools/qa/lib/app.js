/* app.js — WHERE THINGS ARE, AND HOW THE CONTENT IS LOADED UNDER NODE.
 *
 * Every gate resolves its paths from ITS OWN directory, never from the process's
 * cwd and never from an absolute path typed into a file. That is what lets the
 * whole tree be copied to a sandbox and the gates run there against a planted
 * fixture: `node <sandbox>/tools/qa/qa-thing.js` reads the sandbox, because the
 * gate's idea of "the app" is "two directories above me".
 *
 * The packs are loaded exactly as the lints load them (global.window = global;
 * require) so that what a gate reads is what the browser will read (L5, and the
 * simple fact that a second loader is a second truth).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { objectBody, stripComments } = require('./decl.js');

const QA = path.resolve(__dirname, '..');
const APP = path.resolve(QA, '../..');
const OUT = path.join(QA, 'out');
const FIXTURES = path.join(QA, 'fixtures');

function app(...p) { return path.join(APP, ...p); }
function qa(...p) { return path.join(QA, ...p); }
function out(...p) { return path.join(OUT, ...p); }
function ensureOut(sub) { const d = sub ? out(sub) : OUT; fs.mkdirSync(d, { recursive: true }); return d; }

/* ------------------------------------------------------------ the packs */
let LOADED = null;
function content() {
  if (LOADED) return LOADED;
  global.window = global;
  require(app('mathcore.js'));
  require(app('anglecore.js'));
  fs.readdirSync(APP).filter(f => /^content-.*\.js$/.test(f)).sort()
    .forEach(f => require(app(f)));
  /* a fixture pack is loaded ONLY when a control asks for it, and it is loaded
     from the sandbox's own fixtures directory — never from index.html, never
     from ACTIVITIES, never from the assembler's inputs */
  if (process.env.MS_FIXTURE_BOOK === '1') require(path.join(FIXTURES, 'content-fixture.js'));
  LOADED = global.GJ_CONTENT || {};
  return LOADED;
}

/* ACTIVITIES is the shelf's own manifest and lives in script.js. It is READ
   from that source rather than required, because requiring script.js means
   booting the app. Both directions are checked by qa-coverage. */
function activities() {
  const src = stripComments(fs.readFileSync(app('script.js'), 'utf8'));
  const m = /var\s+ACTIVITIES\s*=\s*\[/.exec(src);
  if (!m) return null;
  let i = src.indexOf('[', m.index), depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '[' || src[j] === '{') depth++;
    else if (src[j] === ']' || src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end < 0) return null;
  const list = [];
  const body = src.slice(i, end + 1);
  const re = /id\s*:\s*'([^']+)'/g; let g;
  while ((g = re.exec(body))) list.push(g[1]);
  const meta = [];
  body.split(/\},\s*\{/).forEach(chunk => {
    const id = /id\s*:\s*'([^']+)'/.exec(chunk);
    if (!id) return;
    const grab = (k) => { const r = new RegExp(k + "\\s*:\\s*'([^']*)'").exec(chunk); return r ? r[1] : null; };
    meta.push({ id: id[1], title: grab('title'), sub: grab('sub'), meta: grab('meta'), band: grab('band'), series: grab('series'), motif: grab('motif') });
  });
  return { ids: list, meta };
}

/* the kind of a question, one home: a pack that names no kind is the angles
   pack's `reasoned` (the lint's own vocabulary — 4 classify, 2 protractor,
   18 reasoned) */
function kindOf(q) { return q.kind || q.type || 'reasoned'; }

/* THE CONTENT GRID, DERIVED (L5). Unfiltered: a reserve question is a question
   the lints and validate-all prove, though the shelf hides it. */
function grid() {
  const C = content();
  const rows = [];
  Object.keys(C).forEach(book => {
    const pack = C[book];
    if (!pack || !Array.isArray(pack.sections)) return;
    pack.sections.forEach(sec => {
      (sec.questions || []).forEach(q => {
        rows.push({
          book, section: sec.id, qid: q.id, kind: kindOf(q),
          reserve: !!q.reserve, marks: q.marks || null, question: q, sectionObj: sec
        });
      });
    });
  });
  return rows;
}
function books() { return Object.keys(content()).filter(b => Array.isArray(content()[b].sections)); }
function movies() {
  const C = content(); const out = [];
  Object.keys(C).forEach(book => (C[book].sections || []).forEach(sec => {
    if (sec.movie) out.push({ book, section: sec.id, movie: sec.movie });
  }));
  return out;
}

/* the app's own client sources, in one list, so the text gates cannot disagree
   about what "the client" is */
function clientFiles() {
  return fs.readdirSync(APP)
    .filter(f => /\.js$/.test(f) && !/^qrcode\.min\.js$/.test(f))
    .map(f => app(f));
}
function renderFiles() {
  return ['script.js', 'jotter.js', 'staff.js', 'player.js', 'strings.js', 'jotter-stats.js', 'statchart.js']
    .map(f => app(f)).filter(p => fs.existsSync(p));
}

function read(p) { return fs.readFileSync(p, 'utf8'); }
function exists(p) { try { fs.accessSync(p); return true; } catch (e) { return false; } }

module.exports = {
  APP, QA, OUT, FIXTURES, app, qa, out, ensureOut,
  content, activities, grid, books, movies, kindOf, clientFiles, renderFiles, read, exists,
  objectBody, stripComments
};
