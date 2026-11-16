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
// a quote's label ("Item", "Your teacher's definition ...") sits on its own line above the passage, never run on after its full stop
{
  const app = fs.readFileSync(path.join(P, 'app.js'), 'utf8'), css = fs.readFileSync(path.join(P, 'style.css'), 'utf8');
  const labelFirst = (a) => /<blockquote class="say">' \+ \(b\.quote\.who \? '<cite>/.test(a);
  const ownLine = (c) => /\.say cite\{[^}]*display:\s*block/.test(c);
  const n = fs.readdirSync(path.join(REPO, 'content'), { recursive: true }).filter((f) => /\.json$/.test(f)).reduce((k, f) => k + (fs.readFileSync(path.join(REPO, 'content', f), 'utf8').match(/"who"\s*:/g) || []).length, 0);
  sh.check(labelFirst(app) && ownLine(css), 'quotes: the label stands on its own line above the passage (' + n + ' labelled quotes)', (labelFirst(app) ? '' : 'label drawn after the passage; ') + (ownLine(css) ? '' : 'no .say cite {display:block}'));
  const ctl = css.replace(/\.say cite\{[^}]*\}\n?/, '');
  sh.check(!ownLine(ctl), 'CONTROL: style.css without the .say cite rule is reported (the label would run on after the full stop)');
}
// after a mark, the "best" line at the top of an activity is brought into step (it was drawn before the mark; found live 16 Nov 2026)
{
  const eng = fs.readFileSync(path.join(P, 'engine.js'), 'utf8');
  const fixes = (e) => { const m = /function mark\(root, open[\s\S]*?\n  \}/.exec(e); return !!m && /querySelector\("\.act-head \.best"\)/.test(m[0]) && /textContent = fmt\(S\.best/.test(m[0]); };
  sh.check(fixes(eng), 'engine: mark() brings the top "best" line into step with the result');
  const ctl = eng.replace(/\n[^\n]*querySelector\("\.act-head \.best"\)[^\n]*\n[^\n]*\n/, '\n');
  sh.check(!fixes(ctl), 'CONTROL: engine.js without that update is reported (the top would still say "Not tried yet")');
}
// after a mark, the status line under a five- or ten-mark question is repainted (it was drawn before the mark; found live 16 Nov 2026)
{
  const app = fs.readFileSync(path.join(P, 'app.js'), 'utf8');
  const fixes = (a) => /class="small mute qstat" data-b="/.test(a) && /function paintStat\(\)\{[^\n]*querySelectorAll\("\.qstat"\)/.test(a) && /function marked\(r\)\{[^\n]*hdr\(r\.hdr\); paintStat\(\);/.test(a);
  sh.check(fixes(app), 'question status line: marked() repaints every .qstat from the new header');
  const ctl = app.replace('hdr(r.hdr); paintStat(); }', 'hdr(r.hdr); }');
  sh.check(!fixes(ctl), 'CONTROL: app.js with marked() not repainting is reported (the line would still say "Not tried yet")');
}
// five- and ten-mark question screens: the intro line is the how-to instruction, never the question again (found live 16 Nov 2026)
{
  const srv = fs.readFileSync(path.join(__dirname, '..', 'server', 'Code.gs.template'), 'utf8'), eng = fs.readFileSync(path.join(P, 'engine.js'), 'utf8');
  const blank = (s) => (s.match(/reg_\(\{ id: (d|'w5-' \+ nn|'d10-' \+ n_|'w10-' \+ n_)[^\n]*intro: '' \}\);/g) || []).length;
  const oneTen = (e) => /isTen \? \(v\.item \? S\.tenBuildIntro : S\.tenBuildOne\)/.test(e);
  sh.check(blank(srv) === 4 && oneTen(eng), 'question screens: the four question kinds send no intro, so the how-to line shows (and the no-item ten-mark build has its own)', blank(srv) + ' of 4 blank; no-item line ' + oneTen(eng));
  const ctl = srv.replace("intro: '' });", 'intro: str_(q.stem) });');
  sh.check(blank(ctl) !== 4, 'CONTROL: the server with the question sent as the intro again is reported');
  sh.check(/\.item \.ph\{margin:0 -3px\}/.test(fs.readFileSync(path.join(P, 'style.css'), 'utf8')), 'item phrases open no gap before a comma or full stop');
}
// the model panel promises underlined item phrases only when it underlines some (most model answers reword the item; found live 16 Nov 2026)
{
  const eng = fs.readFileSync(path.join(P, 'engine.js'), 'utf8'), str = fs.readFileSync(path.join(P, 'strings.js'), 'utf8');
  const honest = (e, t) => !/modelNote:[^\n]*underlined/.test(t) && /modelUnder:/.test(t) && /html\.indexOf\('<u>'\) >= 0 \? ' ' \+ h\(S\.modelUnder\)/.test(e);
  sh.check(honest(eng, str), 'model panel: the "underlined" sentence shows only when the answer has an underline');
  const ctl = str.replace(/modelNote: "([^"]*)",/, 'modelNote: "$1 The item phrases it uses are underlined.",');
  sh.check(!honest(eng, ctl), 'CONTROL: strings.js with the sentence always in modelNote is reported');
  const btn = (e) => /readyText: S\.writeGo/.test(e) && /\(o && o\.readyText\) \|\| S\.check/.test(e) && /bar\.btn\.textContent = S\.writeGo/.test(e);
  sh.check(btn(eng), 'write screens: the Check button names one answer ("' + 'Check my answer' + '"), not "answers"');
  sh.check(!btn(eng.replace('readyText: S.writeGo, ', '')), 'CONTROL: engine.js without readyText on the write screen is reported');
}
// the model answer on a ten-mark result: the three Explain sentences read as sentences (never "a.,b.,c."), and on question 6 (her own
// scheme) every sentence wears the label and colour of the part it earns, not the PEEL label of its position (found live 16 Nov 2026)
{
  const eng = fs.readFileSync(path.join(P, 'engine.js'), 'utf8'), strSrc = fs.readFileSync(path.join(P, 'strings.js'), 'utf8');
  const S = vm.runInNewContext(strSrc + '\n;SOCS.S');
  const fnSrc = (src, name) => { const at = src.indexOf('function ' + name + '('); if (at < 0) return null; let i = src.indexOf('{', at), d = 0, q = null;
    for (; i < src.length; i++){ const ch = src[i]; if (q){ if (ch === '\\') i++; else if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; } if (ch === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue; }
      if (ch === '{') d++; else if (ch === '}' && --d === 0) break; }
    return src.slice(at, i + 1); };
  const H = 'function h(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", \'"\': "&quot;"}[c]; }); }';
  const panelOf = (e) => { const mp = fnSrc(e, 'modelPanel'), un = fnSrc(e, 'underline'); if (!mp || !un) return null;
    return vm.runInNewContext(H + '\n' + un + '\n' + mp + '\n;modelPanel', { S }); };
  const ten = Object.entries(L.readBanks(DESIGN).banks).filter(([k]) => /^ten-q\d+$/.test(k));
  const strip = (x) => x.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const LBL = { how: 'How it works', example: 'Example', research: 'Research', shows: 'What it shows', conclusion: 'Conclusion' };
  function problems(e){
    const mp = panelOf(e); if (!mp) return ['modelPanel or underline not found in engine.js']; const out = [];
    ten.forEach(([k, q]) => {
      const html = mp({ model: q.model, ao: q.ao, why_marks: q.why_marks, phrases: q.phrases }, q.scheme);
      ['p1', 'p2'].forEach((p) => { const ex = (q.model[p] || {}).explain; if (Array.isArray(ex) && ex.length > 1 && strip(html).indexOf(ex.join(',')) >= 0) out.push(k + ' ' + p + ': Explain reads as "a.,b.,c."'); });
      if (q.scheme === '3+2+2+2+1') (q.slots || []).forEach((sl, i) => { if (sl.type !== 'pick') return; const said = sl.opts[sl.k], part = sl.part, a = q.ao[part], base = part.replace(/\d+$/, '');
        const ps = html.split('<p class="').slice(1).map((x) => ({ cls: x.slice(0, x.indexOf('"')), txt: strip('<p class="' + x) }));
        const hit = ps.find((x) => x.txt.indexOf(said) >= 0);
        if (!hit) out.push(k + ' slot' + i + ': its right sentence is not in the model');
        else if (hit.cls !== a.toLowerCase() || hit.txt.indexOf(LBL[base] + ' · ' + a) !== 0) out.push(k + ' slot' + i + ' (' + part + '): shown as "' + hit.txt.slice(0, hit.txt.indexOf(' · ') + 6) + '" in ' + hit.cls); });
    });
    return out;
  }
  const real = problems(eng);
  sh.check(!real.length, 'model answer: every ten-mark model reads as sentences, and question 6 labels each sentence by the part it earns', real.length ? real.slice(0, 4).join('; ') : ten.length + ' ten-mark models');
  const ctl = eng.replace('underline([].concat(text).join(" "), extra.phrases)', 'underline(text, extra.phrases)').replace('m.p1 && m.tags && m.tags.p1 && m.tags.p2', 'false');
  const cp = problems(ctl);
  sh.check(cp.some((x) => /a\.,b\.,c\./.test(x)) && cp.some((x) => /slot\d+ \(/.test(x)), 'CONTROL: engine.js with the old join and positional labels is reported (comma-joined Explain and wrong question 6 labels)', cp.length + ' problems, e.g. ' + (cp[0] || 'none'));
  // the lead line above a no-item ten-mark question does not tell her to use the item
  const app = fs.readFileSync(path.join(P, 'app.js'), 'utf8');
  const lead = (a, t) => /h\(q\.hasItem === false \? S\.tenLeadNoItem : S\.tenLead\)/.test(a) && /tenLeadNoItem: "[^"]+"/.test(t) && !/tenLeadNoItem: "[^"]*\bitem Applied/.test(t);
  sh.check(lead(app, strSrc), 'question 6 (no item): its lead line is its own, not "use the item"');
  sh.check(!lead(app.replace('h(q.hasItem === false ? S.tenLeadNoItem : S.tenLead)', 'h(S.tenLead)'), strSrc), 'CONTROL: app.js with the one lead for every ten-mark question is reported');
  // the marks strip under a model answer names the right number of marks (found live 16 Nov 2026: question 6 said "Earning the five marks")
  const five = (L.readBanks(DESIGN).banks.five || []).filter((q) => q && q.model && (q.why_marks || []).length);
  const strips = (e) => { const mp = panelOf(e); if (!mp) return ['modelPanel not found']; const bad = [];
    ten.forEach(([k, q]) => { const x = mp({ model: q.model, ao: q.ao, why_marks: q.why_marks, phrases: q.phrases }, q.scheme); if (x.indexOf('<b>' + S.tenMarkStrip + '</b>') < 0) bad.push(k); });
    five.forEach((q, i) => { const x = mp({ model: q.model, ao: q.ao, why_marks: q.why_marks, phrases: q.phrases }, q.scheme); if (x.indexOf('<b>' + S.markStrip + '</b>') < 0) bad.push('five[' + i + ']'); });
    return bad; };
  const sb = strips(eng);
  sh.check(!sb.length && five.length > 0, 'marks strip: every ten-mark model says "' + S.tenMarkStrip + '" and every five-mark model says "' + S.markStrip + '"', sb.length ? 'wrong on ' + sb.join(', ') : ten.length + ' ten-mark + ' + five.length + ' five-mark models');
  sh.check(strips(eng.replace('m.p1 ? S.tenMarkStrip : S.markStrip', 'S.markStrip')).length >= ten.length, 'CONTROL: engine.js with the one five-mark heading for every model is reported');
}
{ // ten-mark scores show back as tried: the page must look a build up under the id the server files it as (found live 16 Nov 2026:
  // the page read d10-06, the server filed d10-6, so every Build cell and status line stayed "Not tried yet")
  const app = fs.readFileSync(path.join(P, 'app.js'), 'utf8'), srv = fs.readFileSync(path.join(REPO, 'server', 'Code.gs.template'), 'utf8');
  const S = vm.runInNewContext(fs.readFileSync(path.join(P, 'strings.js'), 'utf8') + '\n;SOCS.S');
  const reg = /reg_\(\{ id: '(d10-)' \+ n_,[^\n]*form: 'builder'/.exec(srv) && /reg_\(\{ id: '(w10-)' \+ n_,/.exec(srv);
  sh.check(!!reg, 'the server files ten-mark builds as d10-<n> and writes as w10-<n> (no leading zero)');
  const K = (n) => ['d10-' + n, 'w10-' + n];
  function rows(src){ // run tenList() from app.js with a pupil who has built and written question 2, filed the server's way
    const a = src.indexOf('  function tenList(page){'), b = src.indexOf('  function question(part, n, mode, opts){'); if (a < 0 || b < a) return null;
    const hdr = { b: {}, w: {} }; hdr.b[K(2)[0]] = 7; hdr.w[K(2)[1]] = 1;
    const box = { S, ME: { hdr }, h: (x) => String(x), fmt: (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k]), out: null };
    const qs = [1, 2, 3].map((n) => ({ n, id: 'd10-0' + n, q: 'Q' + n, marks: 10 }));
    vm.runInNewContext(src.slice(a, b) + '\nout = tenList({qs: ' + JSON.stringify(qs) + '});', box);
    return (box.out.match(/<td class="st">[^<]*<\/td>/g) || []).map((t) => t.replace(/<[^>]+>/g, ''));
  }
  const want = fmt2(S.buildBest, { n: 7, m: 10 });
  function fmt2(t, o){ return String(t).replace(/\{(\w+)\}/g, (_, k) => o[k]); }
  const ok = (r) => !!r && r[2] === want && r[3] === S.writeDone && r[0] === S.first;
  const r = rows(app);
  sh.check(ok(r), 'Part 7 list: a built and written ten-mark question shows "' + want + '" and "' + S.writeDone + '"', r ? 'question 2 shows ' + r[2] + ' / ' + r[3] : 'tenList not found');
  const bact = /var buildAct = part === "p6" \? q\.id : "d10-" \+ n, writeAct = part === "p6" \? "w5-" \+ q\.id\.slice\(3\) : "w10-" \+ n;/.test(app);
  sh.check(bact, 'the question screen reads its build and write status under d10-<n> and w10-<n>');
  const old = app.replace('(H.b || {})["d10-" + q.n], w = (H.w || {})["w10-" + q.n]', '(H.b || {})[q.id], w = (H.w || {})["w10-" + q.n]');
  sh.check(old !== app && !ok(rows(old)), 'CONTROL: app.js looking builds up under the bank id (d10-02) is reported');
}
// an exam item is read before the model answer that uses it (under the "Question:" line when there is one), and every phrase the
// answer marks with « » is copied word for word from that item, because the steps tell her to quote the item (found live 16 Nov 2026)
{
  const app = fs.readFileSync(path.join(P, 'app.js'), 'utf8'), strSrc = fs.readFileSync(path.join(P, 'strings.js'), 'utf8');
  const S = vm.runInNewContext(strSrc + '\n;SOCS.S');
  const fnOf = (src, name) => { const at = src.indexOf('function ' + name + '('); if (at < 0) return null; let i = src.indexOf('{', at), d = 0, q = null;
    for (; i < src.length; i++){ const ch = src[i]; if (q){ if (ch === '\\') i++; else if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; } if (ch === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue; }
      if (ch === '{') d++; else if (ch === '}' && --d === 0) break; }
    return src.slice(at, i + 1); };
  const Hfn = 'function h(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", \'"\': "&quot;"}[c]; }); }';
  const C = L.readContent(REPO); // the copy the build ships (tools/build-server.js reads page content from the repo)
  const items = []; Object.keys(C).forEach((k) => (C[k].blocks || []).forEach((b, i) => { if (b.quote && b.quote.who === 'Item') items.push([k + ' block ' + (i + 1), b]); }));
  const late = (src) => { const f = ['md', 'blocks'].map((n) => fnOf(src, n)); if (f.some((x) => !x)) return ['md or blocks not found in app.js']; f.unshift(Hfn); // h() is written out: its regex holds a quote mark the brace reader would trip on
    const blocks = vm.runInNewContext(f.join('\n') + '\n;blocks', { S, img: (x) => x }), out = [];
    items.forEach(([where, b]) => { const html = blocks([b]), q = html.indexOf('<blockquote'), ps = html.split('<p>').slice(1);
      let at = html.indexOf('<p>'); ps.forEach((x) => { if (/^Question:/.test(x)) at = html.indexOf('<p>', at + 3); });
      if (q < 0 || (at >= 0 && q > at)) out.push(where); });
    return out; };
  const bad = late(app);
  sh.check(items.length >= 11 && !bad.length, 'every exam item shows before the model answer that uses it', bad.length ? 'after the answer: ' + bad.join(', ') : items.length + ' items');
  const NEWQ = /\n {6}\/\/ an exam item is read before[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n/;
  const OLDQ = "\n      (b.p || []).forEach(function(p, i){ out += '<p>' + ((b.new_p || []).indexOf(i) >= 0 ? '<span class=\"tag new\" aria-hidden=\"true\">' + h(S.newTag) + '</span> ' : '') + md(p) + '</p>'; });\n      if (b.quote) out += '<blockquote class=\"say\">' + (b.quote.who ? '<cite>' + h(b.quote.who) + '</cite>' : '') + h(b.quote.t) + '</blockquote>';\n";
  sh.check(NEWQ.test(app) && late(app.replace(NEWQ, OLDQ)).length >= 11, 'CONTROL: app.js drawing the item after the answer (as before) is reported', NEWQ.test(app) ? late(app.replace(NEWQ, OLDQ)).length + ' reported' : 'the fix was not found in app.js');
  const lc = (x) => String(x).toLowerCase().replace(/[‘’]/g, "'");
  const unquoted = (pairs) => { const out = []; pairs.forEach(([where, b]) => (b.p || []).forEach((x) => (x.match(/«[^»]*»/g) || []).forEach((m) => {
    const ph = lc(m.slice(1, -1)); if (!b.quote || b.quote.who !== 'Item' || lc(b.quote.t).indexOf(ph) < 0) out.push(where + ' ' + m); }))); return out; };
  const all = []; Object.keys(C).forEach((k) => (C[k].blocks || []).forEach((b, i) => all.push([k + ' block ' + (i + 1), b])));
  const marked = all.filter(([, b]) => (b.p || []).some((x) => /«/.test(x))).length, uq = unquoted(all);
  sh.check(marked > 0 && !uq.length, 'every phrase marked « » in a model answer is copied word for word from its item', uq.length ? 'not in the item: ' + uq.join('; ') : marked + ' blocks with marked phrases');
  const oldWE = all.filter(([w]) => /^p8\/s8 /.test(w)).map(([w, b]) => [w, Object.assign({}, b, { p: (b.p || []).map((x) => x.replace(/The item says «migration has contributed to the range of cultural traditions in the UK»/, 'The item describes «migration bringing traditions to the UK»')) })]);
  sh.check(unquoted(oldWE).length > 0, 'CONTROL: the old Part 8 wording («migration bringing traditions to the UK», not in the item) is reported', unquoted(oldWE).join('; ') || 'not reported');
}
// the phrases she can choose inside an item are marked before she chooses, not only when the mouse is over one (found live 16 Nov 2026)
{
  const css = fs.readFileSync(path.join(P, 'style.css'), 'utf8');
  // a rule on .item .ph in its resting state (states are only excluded with :not(...)) that draws a coloured underline
  const marked = (c) => c.replace(/\/\*[\s\S]*?\*\//g, '').split('}').some((r) => { const [sel, body] = r.split('{'); if (!body || !sel) return false;
    return sel.split(',').some((x) => { const bare = x.trim().replace(/:not\([^)]*\)/g, ''); return /^\.item\s+\.ph$/.test(bare); }) &&
      /border-bottom\s*:\s*\d+px\s+(dotted|dashed|solid)\s+#[0-9a-f]{3,6}\b/i.test(body); });
  sh.check(marked(css), 'the choosable phrases in an item carry a visible mark before she chooses one');
  const ctl = css.replace(/\n\.item \.ph:not\(\.done\):not\(\[aria-pressed="true"\]\)\{[^}]*\}/, '');
  sh.check(ctl !== css && !marked(ctl), 'CONTROL: style.css without that mark (hover only, as before) is reported');
}
// Part 8 find: the answer is the phrase that links the item to the term in its question (found live 16 Nov 2026: the norms item
// wanted "Parents and carers are important", which links to primary socialisation, not to norms). The answer must share at least as
// many word stems with the term's glossary definition (first sentence, the term's own words left out) as any other phrase does.
{
  const find = JSON.parse(fs.readFileSync(path.join(DESIGN, 'banks', 'p8', 'ao2-find.json'), 'utf8'));
  const gl = (L.readContent(REPO)['p5/cards'] || {}).terms || [];
  const STOP = new Set('about their there which where would could should these those other from into with what this that they them have being been were also through usually'.split(' '));
  const stems = (x) => (String(x).toLowerCase().replace(/’/g, "'").replace(/'s\b/g, '').match(/[a-z]+/g) || []).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.slice(0, 5));
  const keyFaults = (items) => items.map((it, i) => {
    const term = (/meaning of ([a-z ]+) \(/.exec(it.q || '') || [])[1], g = gl.find((t) => String(t.term).toLowerCase() === term);
    if (!g) return 'item ' + (i + 1) + ': no glossary term for "' + (it.q || '') + '"';
    const own = new Set(stems(term)), def = new Set(stems(g.def.split('. ')[0]).filter((x) => !own.has(x)));
    const sc = it.phrases.map((ph) => stems(ph).filter((x) => !own.has(x) && def.has(x)).length), best = Math.max.apply(null, sc);
    return (it.k || []).every((k) => sc[k] === best) ? '' : term + ': answer «' + it.phrases[it.k[0]] + '» scores ' + sc[it.k[0]] + ', «' + it.phrases[sc.indexOf(best)] + '» scores ' + best;
  }).filter(Boolean);
  const kf = keyFaults(find.items);
  sh.check(!kf.length, 'each Part 8 find answer is the phrase that links its item to the term in the question', kf.join('; ') || find.items.length + ' items');
  const old = JSON.parse(JSON.stringify(find.items)), ni = old.findIndex((it) => /of norms /.test(it.q));
  if (ni >= 0) old[ni].k = [old[ni].phrases.indexOf('Parents and carers are important')];
  sh.check(ni >= 0 && old[ni].k[0] >= 0 && keyFaults(old).length === 1, 'CONTROL: the old norms answer («Parents and carers are important») is reported', keyFaults(old).join('; ') || 'not caught');
}
// Part 9: the I (item link) line agrees with the rest of the site, where one item link carries two item details, one AO2 mark each
// (found live 16 Nov 2026: it told her to "aim for two explained item links", which reads as two separate links)
{
  const lineOf = (c) => ((c['p9/s9'] || {}).blocks || []).reduce((a, b) => a.concat(b.list || []), []).find((x) => /^I, Item link/.test(x)) || '';
  const iFault = (c) => { const x = lineOf(c); if (!x) return 'no I line in Part 9';
    if (/two (explained )?item links/i.test(x)) return 'says "two item links": ' + x;
    if (!/two details/i.test(x) || !/one sentence/i.test(x)) return 'does not say two details can sit in one item link: ' + x; return ''; };
  sh.check(!iFault(C), 'the Part 9 item-link line says one link carries two item details', iFault(C) || 'ok');
  const oldC = JSON.parse(JSON.stringify({ 'p9/s9': C['p9/s9'] }));
  (oldC['p9/s9'].blocks || []).forEach((b) => { if (b.list) b.list = b.list.map((x) => /^I, Item link/.test(x) ? 'I, Item link (AO2): the place where you apply the term to the item, using specific words from it. Aim for two explained item links; you do not need to quote the item twice.' : x); });
  sh.check(!!iFault(oldC), 'CONTROL: the old Part 9 line ("aim for two explained item links") is reported', iFault(oldC) || 'not caught');
}
// AI (found live 16 Nov 2026): the Family and Education pages had "New" on their titles, telling a pupil the whole page is not in
// her teacher's notes, when only one or three paragraphs on each are. The title carries the tag only when every block is written for the site.
{
  const whole = (b) => !!b.new || ((b.p || []).length + (b.list || []).length > 0 && (b.p || []).every((x, i) => (b.new_p || []).indexOf(i) >= 0) && (b.list || []).every((x, i) => (b.new_items || []).indexOf(i) >= 0));
  const overTagged = (c) => Object.keys(c).filter((k) => c[k] && c[k].new === true && Array.isArray(c[k].blocks) && !c[k].blocks.every(whole));
  const bad = overTagged(C);
  sh.check(!bad.length, 'a page title says "New" only when everything on the page is written for the site', bad.length ? 'over-tagged: ' + bad.join(', ') : Object.keys(C).filter((k) => C[k] && C[k].new === true).join(', ') + ' (all new)');
  const oldC = { 'p3/family': Object.assign({}, C['p3/family'], { new: true }) };
  sh.check(overTagged(oldC).length === 1, 'CONTROL: the Family page with "New" back on its title is reported', overTagged(oldC).join(', ') || 'not caught');
}
// AQ (found live 16 Nov 2026): Media, Peers, Religion, Workplace and Part 9 had "New" on whole blocks ("this was written for this site
// and is not in your teacher's notes") over paragraphs that quote her slides and notes. New marks only what she does not have.
{
  const ATTR = /\byour teacher(?:'|’)s (?!notes (?:do not|don't|give no))\w+|\byour teacher (?:says|lists|asks|uses|describes|gives|calls|explains)\b|\bher (?:slides?|notes|examples?|list|table|diagram)\b/i;
  const credits = (c) => { const out = []; Object.keys(c).forEach((k) => { const pg = c[k]; (pg && Array.isArray(pg.blocks) ? pg.blocks : []).forEach((b, bi) => {
    (b.p || []).forEach((x, i) => { if ((b.new || (b.new_p || []).indexOf(i) >= 0) && ATTR.test(String(x))) out.push(k + ' block ' + (bi + 1) + ' paragraph ' + (i + 1)); });
    (b.list || []).forEach((x, i) => { if ((b.new || (b.new_items || []).indexOf(i) >= 0) && ATTR.test(String(x))) out.push(k + ' block ' + (bi + 1) + ' item ' + (i + 1)); }); }); }); return out; };
  const bad = credits(C);
  sh.check(!bad.length, 'no text marked "New" says it comes from your teacher', bad.join('; ') || 'ok');
  const oldC = { 'p3/religion': JSON.parse(JSON.stringify(C['p3/religion'])) }; oldC['p3/religion'].blocks[0].new = true;
  sh.check(credits(oldC).length > 0, 'CONTROL: Religion "What this agent is" marked New again is reported', credits(oldC).join('; ') || 'not caught');
  const isAgent = (pg) => !!(pg && pg.agent && Array.isArray(pg.blocks) && pg.blocks[0] && pg.blocks[0].h === 'What this agent is');
  const agentNew = (c) => Object.keys(c).filter((k) => isAgent(c[k]) && (c[k].blocks[0].new || (c[k].blocks[0].new_p || []).indexOf(0) >= 0));
  const ab = agentNew(C), nAg = Object.keys(C).filter((k) => isAgent(C[k])).length;
  sh.check(!ab.length && nAg === 6, 'on all six agent pages the opening of "What this agent is" is not marked New', ab.join(', ') || nAg + ' agent pages');
  sh.check(agentNew(oldC).length === 1, 'CONTROL: the same old Religion block is reported by this check too', agentNew(oldC).join(', ') || 'not caught');
}
// AP (found live 16 Nov 2026): Religion said dietary laws "are things that cannot be eaten"; they are rules about things that cannot be eaten.
{
  const DIET = /dietary laws,? which are things that cannot be eaten|describes dietary laws as things/i;
  const files = L.walk(path.join(REPO, 'content'), '.json').concat(fs.existsSync(path.join(DESIGN, 'banks')) ? L.walk(path.join(DESIGN, 'banks'), '.json') : []);
  const hit = (txt) => DIET.test(txt);
  const bad = files.filter((f) => hit(fs.readFileSync(f, 'utf8'))).map((f) => path.basename(f));
  sh.check(!bad.length && files.length > 40, 'dietary laws are always called rules about food, never the food itself', bad.join(', ') || files.length + ' files read');
  sh.check(hit('Many religions have dress codes to follow and dietary laws, which are things that cannot be eaten.'), 'CONTROL: the old Religion line is reported', 'ok');
}
sh.finish();
