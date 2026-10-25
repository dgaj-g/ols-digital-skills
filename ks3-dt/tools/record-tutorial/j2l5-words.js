/* J2 L5 THE SEARCH · gate 1, the words gate (spec §15.1, A14; DFM 292/294).
   Over every pupil string the lesson ships:
     - the hour's own table (assets/search/hour/strings.js, the SHIPPED copy),
     - the lesson JSON (every chunk config, the exit keys' explain lines; not teacherBrief, not _provenance),
     - the six recap items r-j2-501…506.
   Rules: ≤ 14 words a sentence (the design's wordsgate rule, code lines skipped), never "the ask".
   And the strings are the design's, byte for byte: the shipped table is the prototype's with ONLY the
   build's listed edits (DFM 334 / K83), the lesson's config.strings is the shipped table, and the exit
   questions, their lines and How it felt are the prototype's close.last5 / felt / feltDone.
   Controls (must FAIL): a planted 15-word sentence, a planted "the ask", one mutated string,
   one mutated exit line. usage: node ks3-dt/tools/record-tutorial/j2l5-words.js */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const KS3 = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform';
const PROTO = path.join(KS3, 'L5_PROTOTYPES/hour/strings.js');
const HOUR = process.env.J2L5_HOUR || path.join(ROOT, 'ks3-dt/platform/assets/search/hour');
const SRC = process.env.J2L5_SRC || path.join(KS3, 'content-src');
const LESSON = path.join(SRC, 'j2/lessons/j2-05.json');
const RECAP = path.join(SRC, 'j2/recap-pool.json');

let fails = 0, passes = 0;
function must(ok, what) { if (ok) passes++; else { fails++; console.log('FAIL ' + what); } }
function loadStrings(file) { if (!fs.existsSync(file)) return null; const w = {}; new Function('window', fs.readFileSync(file, 'utf8'))(w); return w.SearchStrings; }
function readJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } }
const clone = o => JSON.parse(JSON.stringify(o));
function canon(v) { if (Array.isArray(v)) return v.map(canon); if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach(k => { o[k] = canon(v[k]); }); return o; } return v; }
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/* the cold read's listed edits (DFM 193d, DFM 334 / K83): table = shipped-table path -> text, last5 = exit question -> {q, lines} */
const EDITS = (() => { const f = path.join(__dirname, 'j2l5/coldread-edits.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { table: {}, last5: {} }; })();
const keysOf = p => p.split(/\.|\[|\]/).filter(Boolean);
function setAt(o, p, v) { const k = keysOf(p), last = k.pop(), par = k.reduce((x, y) => x == null ? x : x[y], o); if (par == null || !(last in par)) throw new Error('a listed edit names a path the design does not have: ' + p); par[last] = v; }
/* the design's five questions and How it felt, with the same listed edits */
function withEdits(P) { const E = clone(P); Object.keys(EDITS.last5).forEach(i => { const e = EDITS.last5[i], x = E.close.last5[i]; if (e.q) x.q = e.q; (e.lines || []).forEach((l, k) => { if (l) x.opts[k][1] = l; }); }); if (EDITS.table['close.feltDone']) E.close.feltDone = EDITS.table['close.feltDone']; return E; }

/* the prototype table with the build's listed edits, and nothing else */
function expected(P) {
  const S = clone(P);
  delete S.doNow; delete S.close.last5; delete S.close.secondGo; /* the platform's Do-Now; the questions live in the exit chunk, their answers in keys */
  ['forOk', 'forNoBr', 'forNoI', 'forNoNum'].forEach(k => { S.ch1.j4[k] = S.ch1.j4[k].replace(/20/g, '{w}'); });
  S.ch3.j1.forN = 'The card says range({w}). Type that first.';
  S.ch3.j1.changeOk = 'range(5) means 5 times. Press Fly it.';
  ['forNoColon', 'forCap', 'forIndent', 'spaces'].forEach(k => { S.common[k] = S.ch1.j4[k]; delete S.ch1.j4[k]; });
  /* the one build change to a design string: "Tap" is the banned register (she has a mouse), so it reads "Click" */
  S.close.freeH = S.close.freeH.replace(/^Free flight\. Tap /, 'Free flight. Click ');
  /* and the cold read's: every string two separated readers both failed, rewritten once (j2l5/coldread-edits.json) */
  Object.keys(EDITS.table).forEach(p => setAt(S, p, EDITS.table[p]));
  return S;
}
const tryAgain = s => s.replace(/\s*Try again\.$/, '');

/* every pupil string in the lesson JSON, with a path */
function lessonStrings(L) {
  const out = [];
  function walk(v, p) {
    if (typeof v === 'string') out.push([p, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, p + '[' + i + ']'));
    else if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k], p + '.' + k));
  }
  Object.keys(L).forEach(k => {
    /* the tagline is the tracker's tile text, pinned by spec §19.3 and the manifest (pack-content's tile gate) */
    if (k === 'teacherBrief' || k === '_provenance' || k === 'keys' || k === 'id' || k === 'year' || k === 'tagline') return;
    walk(L[k], 'L.' + k);
  });
  Object.keys(L.keys || {}).forEach(id => { const k = L.keys[id]; if (k && typeof k.explain === 'string') { let arr; try { arr = JSON.parse(k.explain); } catch (e) { arr = [k.explain]; } walk(arr, 'keys.' + id + '.explain'); } });
  return out;
}
function sentenceFails(pairs) {
  const bad = []; let n = 0;
  pairs.forEach(([p, s]) => {
    if (/\bthe ask\b/i.test(s)) bad.push('"the ask" at ' + p);
    if (/^[\s\w()*:?]*$/.test(s) && /[()]/.test(s) && !/ [a-z]+ [a-z]+ /.test(s)) return; /* a code line, not prose */
    s.split(/(?<=[.!?])\s+/).forEach(sen => { const w = sen.trim().split(/\s+/).filter(Boolean).length; if (!w) return; n++; if (w > 14) bad.push(w + ' words at ' + p + ': ' + sen); });
  });
  return { bad, n };
}
function tableStrings(S) { const out = []; (function walk(v, p) { if (typeof v === 'string') out.push([p, v]); else if (Array.isArray(v)) v.forEach((x, i) => walk(x, p + '[' + i + ']')); else if (v && typeof v === 'object') Object.keys(v).forEach(k => walk(v[k], p + '.' + k)); })(S, 'S'); return out; }

/* the whole check: returns a list of failures (empty = green) */
function check(P, S, L, R) {
  const f = [];
  if (!S) return ['the shipped hour/strings.js is missing'];
  if (!L) return ['the lesson JSON content-src/j2/lessons/j2-05.json is missing'];
  if (!same(S, expected(P))) {
    const E = expected(P); tableStrings(E).forEach(([p, v]) => { const got = p.split(/\.|\[|\]/).filter(Boolean).slice(1).reduce((o, k) => o == null ? o : o[k], S); if (got !== v) f.push('shipped string differs from the design at ' + p); });
    tableStrings(S).forEach(([p]) => { const want = p.split(/\.|\[|\]/).filter(Boolean).slice(1).reduce((o, k) => o == null ? o : o[k], E); if (want === undefined) f.push('shipped string not in the design at ' + p); });
    if (!f.length) f.push('the shipped table is not the design table');
  }
  if (S.close && (S.close.last5 || S.close.secondGo)) f.push('the shipped table still carries the answers (close.last5 / secondGo)');
  const chunks = L.chunks || [], by = id => chunks.find(c => c.id === id) || { config: {} };
  const search = by('search'), exit = by('exit'), close = by('close');
  if (search.engine !== 'search') f.push('chunk "search" is not the search engine');
  if (!same(search.config.strings, S)) f.push('the search chunk config.strings is not the shipped table');
  if (exit.engine !== 'exitcheck') f.push('chunk "exit" is not an exitcheck');
  if (exit.config.kicker !== P.close.last5H) f.push('exit kicker is not close.last5H');
  const items = exit.config.items || [];
  if (items.length !== P.close.last5.length) f.push('exit has ' + items.length + ' items, the design has ' + P.close.last5.length);
  P.close.last5.forEach((x, i) => {
    const it = items[i] || {}, id = it.id || ('#' + i), k = (L.keys || {})[it.id];
    if (it.stem !== x.q) f.push('exit item ' + id + ' stem is not the design question');
    if (!same(it.options, x.opts.map(o => o[0]))) f.push('exit item ' + id + ' options are not the design options');
    if (it.code !== x.ev.join('\n')) f.push('exit item ' + id + ' code is not the design evidence');
    if (!k) { f.push('no key for exit item ' + id); return; }
    if (k.a !== x.opts.findIndex(o => o[2])) f.push('key ' + id + ' a is not the right option');
    let lines = null; try { lines = JSON.parse(k.explain); } catch (e) {}
    if (!same(lines, x.opts.map(o => tryAgain(o[1])))) f.push('key ' + id + ' explain lines are not the design lines');
  });
  if (close.engine !== 'selfeval') f.push('chunk "close" is not a selfeval');
  if (!same(close.config.statements, P.close.felt)) f.push('selfeval statements are not close.felt');
  if (close.config.doneTitle !== P.close.feltDone) f.push('selfeval doneTitle is not close.feltDone');
  if (!close.config.optionLines) f.push('selfeval optionLines is off, so a wrong pick would not get its own line');
  const b = search.config.badges || {}, names = Object.keys(b).map(k => b[k].name);
  if (!same(names, P.close.badges.map(x => x[0]))) f.push('badge names are not close.badges');
  const pairs = tableStrings(S).concat(lessonStrings(L));
  (R && R.items || []).filter(it => /^r-j2-50\d$/.test(it.id)).forEach(it => { pairs.push(['recap.' + it.id + '.stem', it.stem]); (it.options || []).forEach((o, i) => pairs.push(['recap.' + it.id + '.options[' + i + ']', o])); if (it.code) pairs.push(['recap.' + it.id + '.code', it.code]); });
  const sf = sentenceFails(pairs); sf.bad.forEach(x => f.push(x)); check.sentences = sf.n;
  return f;
}

const P = loadStrings(PROTO), S = loadStrings(path.join(HOUR, 'strings.js')), L = readJSON(LESSON), R = readJSON(RECAP);
must(!!P, 'the design table L5_PROTOTYPES/hour/strings.js loads');
const PE = P && withEdits(P);
const real = check(PE, S, L, R);
real.forEach(x => console.log('  ' + x));
must(real.length === 0, 'the shipped lesson passes the words gate (' + (check.sentences || 0) + ' sentences)');

/* CONTROLS: each must fail */
if (S && L) {
  const S1 = clone(S); S1.ch1.panel = 'BEEP flies one hop and lights one print and then he waits for you here.';
  must(check(PE, S1, Object.assign(clone(L), { chunks: L.chunks.map(c => c.id === 'search' ? Object.assign(clone(c), { config: Object.assign(clone(c.config), { strings: S1 }) }) : c) }), R).some(x => /15 words/.test(x)), 'CONTROL a planted 15-word sentence fails');
  const L2 = clone(L); L2.chunks.find(c => c.id === 'exit').config.intro += ' Read the ask first.';
  must(check(PE, S, L2, R).some(x => /the ask/.test(x)), 'CONTROL a planted "the ask" fails');
  const S3 = clone(S); S3.ch2.kicker = S3.ch2.kicker + '!';
  must(check(PE, S3, L, R).some(x => /differs from the design/.test(x)), 'CONTROL a mutated hour string fails');
  const L4 = clone(L); const k0 = Object.keys(L4.keys).find(k => /^j2x5-/.test(k)); if (k0) { const a = JSON.parse(L4.keys[k0].explain); a[1] += ' Try again.'; L4.keys[k0].explain = JSON.stringify(a); }
  must(check(PE, S, L4, R).some(x => /explain lines/.test(x)), 'CONTROL a mutated exit line fails');
}
console.log('\nj2l5-words: ' + (fails ? 'FAIL · ' + fails + ' of ' + (fails + passes) : 'PASS · ' + passes + ' checks'));
process.exit(fails ? 1 : 0);
