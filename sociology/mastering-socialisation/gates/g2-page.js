#!/usr/bin/env node
/* g2-page — static checks on the pupil page: every route has its content and every content file has a route, every
   picture the page asks for exists, PARTS/AGENTS/BADGES match SPEC.md, the print and reduced-motion rules, index.html.
   CONTROL: a copy of app.js with one route removed must be reported. No browser. Run: node gates/g2-page.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { sheet, L } = require('./common.js');
const REPO = path.join(__dirname, '..'), P = path.join(REPO, 'platform');
const DESIGN = process.env.SOC_DESIGN || '/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/Sociology';
const sh = sheet('g2-page');

// pull one `var NAME = {...};` or `[...]` literal out of app.js source and evaluate it alone
function literal(src, name){
  const at = src.indexOf('var ' + name + ' = '); if (at < 0) return null;
  let i = src.indexOf('=', at) + 1; while (/\s/.test(src[i])) i++;
  const open = src[i], close = open === '{' ? '}' : ']'; let d = 0, j = i, q = null;
  for (; j < src.length; j++){
    const ch = src[j];
    if (q){ if (ch === '\\') j++; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === open) d++; else if (ch === close && --d === 0) break;
  }
  return vm.runInNewContext('(' + src.slice(i, j + 1) + ')');
}
function tables(src){
  const PAGES = literal(src, 'PAGES'), TESTS = literal(src, 'TESTS'), HERO = literal(src, 'HERO'), SHEETS = literal(src, 'SHEETS');
  if (PAGES){ const m6 = /i6 <= (\d+)/.exec(src), m7 = /i7 <= (\d+)/.exec(src);
    for (let i = 1; m6 && i <= +m6[1]; i++) PAGES.p6.push('s6/' + i); for (let i = 1; m7 && i <= +m7[1]; i++) PAGES.p7.push('s7/' + i); }
  return { PAGES, TESTS, HERO, SHEETS };
}
function contentKey(route){ const m = /^s(\d+)(?:\/(.+))?$/.exec(route); if (!m) return null; return m[2] ? 'p' + m[1] + '/' + m[2].replace(/\//g, '-') : 'p' + m[1] + '/s' + m[1]; }
const SPECIAL = /^(hub|daily|weekly|badges|board|progress|s5|s6\/\d+|s7\/\d+|s11|s11\/\w+)$/; // routes with their own screen
// every problem with the route tables, as a list of strings
function routeProblems(T, C){
  const out = []; if (!T.PAGES || !T.TESTS || !T.SHEETS) return ['a route table is missing from app.js'];
  const routes = [].concat.apply([], Object.keys(T.PAGES).map((k) => T.PAGES[k]));
  const reached = new Set(['home']);
  routes.forEach((r) => { if (SPECIAL.test(r) || T.TESTS[r]) return; const k = contentKey(r); reached.add(k); if (!C[k]) out.push('page ' + r + ' has no content ' + k); });
  Object.keys(T.TESTS).forEach((r) => { const base = r.replace(/\/[^/]+$/, ''); if (!T.TESTS[r].act) out.push('test ' + r + ' has no act');
    if (!routes.includes(r) && !routes.includes(base)) out.push('test ' + r + ' hangs off no page'); });
  T.SHEETS.forEach((s) => { const k = s[0] === 'cards' ? 'p5/cards' : 'p11/' + s[0]; reached.add(k); if (!C[k]) out.push('sheet ' + s[0] + ' has no content ' + k); if (!routes.includes('s11/' + s[0])) out.push('sheet ' + s[0] + ' has no s11 page'); });
  ['p6/s6', 'p7/s7', 'p1/checklist', 'p5/cards'].forEach((k) => reached.add(k));
  Object.keys(C).forEach((k) => { if (!reached.has(k)) out.push('content ' + k + ' has no route'); });
  Object.keys(T.HERO || {}).forEach((r) => { if (!routes.includes(r)) out.push('hero ' + r + ' is on no page'); });
  return out;
}

const app = fs.readFileSync(path.join(P, 'app.js'), 'utf8'), strs = fs.readFileSync(path.join(P, 'strings.js'), 'utf8');
const C = L.readContent(REPO), T = tables(app);
const probs = routeProblems(T, C);
sh.check(probs.length === 0, 'routes: every page and test has its content, every content file a route', probs.slice(0, 8).join('; ') || (Object.keys(C).length + ' content files'));

// pictures
const IMG = path.join(REPO, 'img'), want = new Set();
Object.keys(T.HERO || {}).forEach((r) => want.add(T.HERO[r].f));
const SOCS = vm.runInNewContext(strs + ';SOCS');
SOCS.AGENTS.concat(SOCS.BADGES).forEach((a) => a.emoji && want.add('emoji/' + a.emoji + '.svg'));
for (const f of ['app.js', 'engine.js', 'staff.js']){ const s = fs.readFileSync(path.join(P, f), 'utf8'); let m; const re = /emoji\(\s*"([0-9A-F]+)"\s*\)|\["\w+", S\.\w+, "([0-9A-F]{4,6})"\]|img\(\s*"([^"]+)"\s*\)/g; while ((m = re.exec(s))) want.add(m[1] ? 'emoji/' + m[1] + '.svg' : m[2] ? 'emoji/' + m[2] + '.svg' : m[3]); }
(function walk(o){ if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk);
  Object.keys(o).forEach((k) => { const v = o[k]; if ((k === 'img' || k === 'file' || k === 'emoji') && typeof v === 'string') want.add(k === 'emoji' ? 'emoji/' + v + '.svg' : v); else walk(v); }); })(C);
const missing = [...want].filter((f) => !fs.existsSync(path.join(IMG, f)));
sh.check(missing.length === 0, 'pictures: every img()/emoji() file exists in img/', missing.join(', ') || want.size + ' files');

// PARTS / AGENTS / BADGES against SPEC.md
const spec = fs.readFileSync(path.join(DESIGN, 'SPEC.md'), 'utf8');
const rows = spec.split('\n').filter((l) => /^\| p\d+ \| \d+ · /.test(l)).map((l) => { const c = l.split('|').map((x) => x.trim()); return { id: c[1], t: c[2].replace(/^\d+ · /, ''), pages: c[3] }; });
const pbad = []; if (rows.length !== 11) pbad.push('SPEC has ' + rows.length + ' part rows');
if (SOCS.PARTS.length !== 11) pbad.push('strings has ' + SOCS.PARTS.length + ' parts');
rows.forEach((r, i) => { const p = SOCS.PARTS[i] || {}; if (p.id !== r.id || p.t !== r.t || p.n !== i + 1) pbad.push(r.id + ' "' + p.t + '" vs SPEC "' + r.t + '"'); });
sh.check(pbad.length === 0, 'PARTS: 11 parts in SPEC order with SPEC titles', pbad.join('; '));
const p3 = (rows[2] || {}).pages || '', agents = [...new Set((p3.match(/`s3\/(\w+)`/g) || []).map((x) => x.slice(4, -1)))];
const abad = []; if (SOCS.AGENTS.length !== 6) abad.push(SOCS.AGENTS.length + ' agents');
SOCS.AGENTS.forEach((a, i) => { if (a.id !== agents[i]) abad.push(a.id + ' vs SPEC ' + agents[i]); });
sh.check(abad.length === 0, 'AGENTS: the six agents in SPEC order', abad.join('; ') || agents.join(' '));
const s8 = spec.slice(spec.indexOf('## 8.'), spec.indexOf('## 9.')), bnames = s8.split('\n').filter((l) => /^\| [A-Z]/.test(l) && !/^\| badge/.test(l)).map((l) => l.split('|')[1].trim());
const bbad = []; if (SOCS.BADGES.length !== 6 || bnames.length !== 6) bbad.push(SOCS.BADGES.length + ' badges, SPEC ' + bnames.length);
SOCS.BADGES.forEach((b, i) => { if (b.t !== bnames[i] && b.name !== bnames[i]) bbad.push('"' + (b.t || b.name) + '" vs SPEC "' + bnames[i] + '"'); });
sh.check(bbad.length === 0, 'BADGES: the teacher\'s six names in SPEC order', bbad.join('; '));
const p7n = /`s7\/<n>` ×(\d+)/.exec(spec), p7a = T.PAGES.p7.length - 1;
if (p7n && +p7n[1] !== p7a) sh.info('SPEC §3 says ten-mark ×' + p7n[1] + '; app and banks have ' + p7a + ' (banks/p7 has ' + fs.readdirSync(path.join(DESIGN, 'banks/p7')).filter((f) => /^ten-q\d+\.json$/.test(f)).length + ' questions) — SPEC wording to settle');

// style.css
const css = fs.readFileSync(path.join(P, 'style.css'), 'utf8');
const prints = css.match(/@media print\s*\{[^}]*\{[^}]*\}/g) || [];
const hides = ['.top', '.bn', '.savebar'].filter((c) => !prints.some((p) => new RegExp('\\' + c + '\\b[^{]*\\{[^}]*display:\\s*none').test(p)));
sh.check(hides.length === 0, 'print rule hides .top, .bn and .savebar', hides.length ? 'not hidden: ' + hides.join(' ') : '');
sh.check(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*animation:\s*none/.test(css), 'reduced motion turns animation off');

// index.html
const idx = fs.readFileSync(path.join(P, 'index.html'), 'utf8');
sh.check(/<html[^>]*\slang="en(-GB)?"/.test(idx), 'index.html has lang');
sh.check(/<meta[^>]*name="viewport"/.test(idx), 'index.html has a viewport meta');
sh.check(/<meta[^>]*charset=/i.test(idx), 'index.html has a charset');
sh.check((idx.match(/id="app"/g) || []).length === 1, 'index.html has a single #app');

// CONTROL: drop one route from a copy of app.js
const victim = 's3/religion/examples', copy = app.replace('"' + victim + '", ', '');
const cprobs = copy === app ? [] : routeProblems(tables(copy), C);
sh.check(cprobs.some((x) => x.indexOf('p3/religion-examples') >= 0), 'CONTROL: app.js with ' + victim + ' removed is reported', cprobs.join('; ') || 'not reported');

// bold labels: a content paragraph may carry **Label:** pairs; app.js must render them bold and every pair must close
{ const bad = []; let pairs = 0;
  Object.keys(C).forEach((k) => { JSON.stringify(C[k]).replace(/"((?:[^"\\]|\\.)*)"/g, (m, str) => { const n = (str.match(/\*\*/g) || []).length; if (n % 2) bad.push(k + ': ' + str.slice(0, 40)); pairs += n / 2; return m; }); });
  sh.check(bad.length === 0, 'content: every ** bold label closes (' + pairs + ' pairs)', bad.slice(0, 4).join('; '));
  sh.check(/function md\(/.test(app) && /md\(p\)/.test(app) && /<b>\$1<\/b>/.test(app), 'app.js renders **label** paragraphs as <b>, never raw asterisks');
  const ctrl = app.replace('md(p)', 'h(p)'); sh.check(!/md\(p\)/.test(ctrl) && !(/function md\(/.test(ctrl) && /md\(p\)/.test(ctrl)), 'CONTROL: app.js without md(p) is reported'); }
sh.finish();
