/* G1 step 10 — the lessons. Called by g1-judge.js; returns { checks, fails: [[what, id, detail]] }.
 * a. lessons.json and clusters.json lessonFor are what src/tools/build-lessons.js makes from lessons/*.js today.
 * b. Every grid variant holds on ten dates: each row is in the result of its SQL on the lesson's seed (all: exactly the
 *    result; ordered: in that order), numbers to 6 places, date tokens filled for that day.
 * c. For every part a lesson serves: each step statement runs on the seed (an UPDATE or INSERT changes a row); the whole
 *    step's marks lines add up to the part's marks; every other step has a quick check and no check hangs off a hidden step;
 *    a field or table check names a real table and field of the part's exam design, and so does every wrong key; a choose
 *    check has exactly one right option and a reason on every option; a highlight names a real lesson table and field;
 *    no date token or tag is left unfilled.
 * d. The detector (D38, D44, D47): the finished statement of every lesson, as each part sees it, scores at most half on
 *    every SQL part and practice question (SQL lessons), on every cloze blank taken from any piece of it (SQL lessons),
 *    and on every written part (text lessons: prose and short get the whole answer, rows get its lines as rows).
 * e. A part that leans on an earlier part prints that part's result above the question (lead, F36). */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const LV = require(path.join(ROOT, 'platform/lessonview.js'));
const { convert } = require(path.join(ROOT, 'tools/tsql2sqlite.js'));

const DAYS = ['2026-09-27', '2026-09-01', '2026-09-02', '2026-09-08', '2026-09-15', '2026-02-28', '2026-03-01', '2026-12-31', '2027-01-01', '2028-02-29'];
const TODAY = '2026-09-27';
// the answer is the construct itself, or the reason is the definition of the constraint (D47)
const EXCEPT = { 'PROSE-JOIN': ['2022-b-ii', 'T-PROSE-3'] };
const EXCEPT_MAPPED = { 'PROSE-KEYS': ['2021-a', 'T-PROSE-2'] };
const LEADS = ['2024-c-ii', '2026-c'];

const dateOf = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const sqlOf = (q) => (typeof q === 'string' ? q : q.sql || q.out);
function sqlite(input) {
  const out = execFileSync('/usr/bin/sqlite3', ['-json', ':memory:'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  return out ? JSON.parse(out.replace(/\]\s*\[/g, ',')) : [];
}
const cell = (v) => (v == null ? null : typeof v === 'number' ? String(+v.toFixed(6)) : String(v));

// mutate (controls only): (lessons) => void, changes a copy of lessons.json; only: the lessons to walk
module.exports = function lessonGate({ SRC, J, M, T, mutate, only }) {
  const fails = [];
  let checks = 0;
  const fail = (what, id, detail) => fails.push([what, id, detail]);
  const CONTENT = path.join(SRC, 'content');
  const L = JSON.parse(fs.readFileSync(path.join(CONTENT, 'lessons.json'), 'utf8'));
  const C = JSON.parse(fs.readFileSync(path.join(CONTENT, 'clusters.json'), 'utf8'));
  const papers = JSON.parse(fs.readFileSync(path.join(CONTENT, 'papers.json'), 'utf8')).papers;
  const sets = JSON.parse(fs.readFileSync(path.join(CONTENT, 'twins.json'), 'utf8'));
  const part = {}, design = {};
  for (const p of papers) for (const q of p.parts || []) { part[q.id] = q; design[q.id] = (p.tables || []).map((t) => [t.name, t.cols.map((c) => c.f)]); }
  if (mutate) mutate(L);
  const names = Object.keys(L).filter((k) => k !== 'note' && (!only || only.includes(k)));
  const question = {};   // what each part and practice question shows the pupil: its question and its stub
  for (const q of Object.values(part)) question[q.id] = (q.ask || '') + '\n' + (q.stub || '');
  for (const t of JSON.parse(fs.readFileSync(path.join(CONTENT, 'twins-fable.json'), 'utf8')).twins) question[t.id] = (t.ask || '') + '\n' + (t.stub || '');

  // a. built from the sources
  if (!mutate) {
    const dir = path.join(CONTENT, 'lessons');
    const files = fs.readdirSync(dir).filter((x) => /^[A-Z][\w-]*\.js$/.test(x)).map((x) => x.slice(0, -3)).sort();
    checks++;
    if (files.join() !== names.slice().sort().join()) fail('lessons.json is stale', '-', 'sources ' + files.join(' ') + ' / built ' + names.join(' '));
    const served = {};
    for (const n of files) {
      const f = path.join(dir, n + '.js');
      Object.keys(require.cache).filter((k) => k.startsWith(dir)).forEach((k) => delete require.cache[k]);
      const fresh = JSON.stringify(require(f));
      checks++;
      if (!L[n] || JSON.stringify(L[n]) !== fresh) fail('lessons.json is stale', n, 'run src/tools/build-lessons.js');
      for (const p of Object.keys(require(f).checks || {})) (served[p] = served[p] || []).push(n);
    }
    for (const c of Object.values(C.clusters)) for (const p of c.parts) {
      checks++;
      const s = served[p] || [];
      if (s.length !== 1 || C.lessonFor[p] !== s[0]) fail('lessonFor is stale', p, 'served by ' + (s.join(', ') || 'none') + ', lessonFor says ' + C.lessonFor[p]);
    }
  }

  const setTables = (n) => ((sets.find((s) => s.n === n) || {}).tables || []).map((t) => [t[0], t[1].map((f) => f[0])]);
  const seedFor = (l, day) => fs.readFileSync(path.join(ROOT, 'seeds', 'tinies-' + l.set + '.sql'), 'utf8').replace(/'now'/g, "'" + day + "'") + (l.gate || '').replace(/'now'/g, "'" + day + "'") + '\n';

  for (const n of names) {
    const l = L[n];
    const lessonTabs = setTables(l.set);
    checks++;
    if (!lessonTabs.length) { fail('lesson set has no tables', n, 'set ' + l.set); continue; }
    (l.focus || []).forEach((t) => { checks++; if (!lessonTabs.some(([x]) => x === t) && !(l.tables || []).some((x) => x.name === t)) fail('focus names a table neither the set nor the lesson has', n, t); });

    // b. grids on ten dates
    const grids = [].concat(...l.steps.map((s) => [].concat(s.grid || []).map((g, i) => ({ id: s.id + (Array.isArray(s.grid) ? '/' + i : ''), g }))));
    for (const day of DAYS) {
      const seed = seedFor(l, day), D = dateOf(day);
      for (const { id, g } of grids) {
        checks++;
        let rows;
        try { rows = sqlite(seed + sqlOf(convert(g.sql.replace(/GETDATE\(\)/gi, "'" + day + "'"))) + ';'); }
        catch (e) { fail('grid SQL fails', n + ' ' + id, day + ' ' + String(e.stderr || e.message).slice(0, 160)); continue; }
        const got = rows.map((r) => JSON.stringify(Object.values(r).map(cell)));
        const want = g.rows.map((r) => JSON.stringify(r.map((v) => (v == null ? null : typeof v === 'number' ? cell(v) : LV.tokens(String(v), D)))));
        const miss = want.filter((w) => !got.includes(w)), extra = g.all ? got.filter((x) => !want.includes(x)) : [];
        if (g.ordered && JSON.stringify(got) !== JSON.stringify(want)) miss.push('(order)');
        if (g.cols && g.rows.some((r) => r.length !== g.cols.length)) miss.push('(a row has the wrong number of columns)');
        if (miss.length || extra.length) fail('grid does not hold', n + ' ' + id, day + ' missing ' + miss.join(' ') + (extra.length ? ' extra ' + extra.join(' ') : ''));
      }
    }

    // c. every part the lesson serves
    const servedParts = Object.keys(l.checks || {});
    const finished = new Map();   // statement -> [part ids that see it]
    for (const pid of servedParts) {
      const q = part[pid];
      checks++;
      if (!q) { fail('check keyed by a part that does not exist', n, pid); continue; }
      const v = LV.view(l, q, dateOf(TODAY));
      const at = n + ' ' + pid;
      checks++;
      if (v.answer !== (l.answer || 'sql')) fail('view does not say what kind of answer', at, String(v.answer));
      const blob = JSON.stringify(v);
      checks++;
      const left = blob.match(/\{(?:today|som|mon1|wd|ago|ahead)\w*(?::[^}]*)?\}|[⟪⟫]/g);
      if (left) fail('token or tag left unfilled', at, [...new Set(left)].join(' '));
      checks++;
      if (!v.task) fail('no lesson task for the part', at, '');
      const tabs = lessonTabs.concat(v.tables.map((t) => [t.name, t.cols.map((c) => c[0])]));
      const whole = v.steps.filter((s) => s.whole);
      checks++;
      if (whole.length !== 1) { fail('lesson needs exactly one whole step', at, String(whole.length)); continue; }
      // marks lines add up
      checks++;
      const counted = whole[0].marks.filter((t) => /^\[\d+\]/.test(t));   // a line without [n] says what takes a mark off
      const sum = counted.reduce((a, t) => a + +/^\[(\d+)\]/.exec(t)[1], 0);
      if (sum !== q.marks || !counted.length) fail('marks lines do not add up to the part', at, sum + ' of ' + q.marks + ': ' + whole[0].marks.join(' | '));
      // checks on every step but the whole one, and none on a hidden step
      const shown = new Set(v.steps.map((s) => s.id));
      for (const s of v.steps.filter((x) => !x.whole)) { checks++; if (!s.check) fail('step has no quick check', at, s.id); }
      for (const sid of Object.keys(l.checks[pid])) { checks++; if (!shown.has(sid)) fail('quick check on a step the part does not show', at, sid); }
      const exam = design[pid] || [];
      const tableIn = (t) => exam.some(([x]) => x === t);
      const fieldIn = (tf) => { const [t, f] = tf.split('.'); return exam.some(([x, fs]) => x === t && fs.includes(f)); };
      for (const s of v.steps) {
        const c = s.check;
        if (c) {
          checks++;
          const cat = at + ' ' + s.id;
          if (!c.q || c.pane !== 'exam') fail('quick check must ask about the exam tables', cat, (c.q || '(no question)') + ' pane ' + c.pane);
          if (c.kind === 'field' || c.kind === 'table') {
            const ok = c.kind === 'field' ? fieldIn : tableIn;
            [].concat(c.answer).forEach((a) => { if (typeof a !== 'string' || !ok(a)) fail('quick check answer is not in the exam design', cat, String(a)); });   // a field check may accept more than one field
            Object.keys(c.wrong || {}).filter((k) => k !== '*').forEach((k) => { checks++; if (!ok(k)) fail('quick check wrong key is not in the exam design', cat, k); });
            checks++;
            if (!c.okwhy || !(c.wrong || {})['*']) fail('quick check needs a reason for right and for any other click', cat, '');
          } else if (c.kind === 'choose') {
            const oks = (c.opts || []).filter((o) => o.ok).length;
            if (oks !== 1 || (c.opts || []).length < 2) fail('choose check needs exactly one right option', cat, oks + ' of ' + (c.opts || []).length);
            (c.opts || []).forEach((o) => { checks++; if (!o.t || !o.why) fail('choose option without a reason', cat, o.t || '(blank)'); });
            checks++;
            if (new Set((c.opts || []).map((o) => o.t)).size !== (c.opts || []).length) fail('choose options repeat', cat, '');
          } else fail('quick check of an unknown kind', cat, String(c.kind));
        }
        if (s.hl) {
          checks++;
          const hat = at + ' ' + s.id + ' highlight';
          const pool = s.hl.pane === 'exam' ? exam : tabs;
          if (s.hl.t && !pool.some(([x]) => x === s.hl.t)) fail('highlight names a table that is not there', hat, s.hl.t);
          s.hl.f.forEach((tf) => { checks++; const [t, f] = tf.split('.'); if (!pool.some(([x, fs]) => x === t && fs.includes(f))) fail('highlight names a field that is not there', hat, tf); });
          checks++;
          if (!s.hl.say) fail('highlight without a line saying what it means', hat, '');
        }
      }
      // statements run
      if (v.answer === 'sql') {
        const seed = seedFor(l, TODAY);
        for (const s of v.steps) {
          if (!s.sql || /\.\.\./.test(s.sql)) continue;
          checks++;
          const writes = /^\s*(UPDATE|INSERT|DELETE)/i.test(s.sql);
          try {
            const q2 = sqlOf(convert(s.sql.replace(/GETDATE\(\)/gi, "'" + TODAY + "'")));
            const made = /^\s*CREATE\s+TABLE\s+\[?(\w+)/i.exec(s.sql);   // the lesson builds a table the seed already has: build it afresh
            const out = sqlite(seed + (made ? 'PRAGMA foreign_keys = OFF;\nDROP TABLE IF EXISTS "' + made[1] + '";\n' : '') + q2 + ';' + (writes ? '\nSELECT changes() AS changed;' : ''));
            if (writes && !(out.length && out[out.length - 1].changed > 0)) fail('step statement changes no row', at + ' ' + s.id, s.sql.replace(/\s+/g, ' '));
          } catch (e) { fail('step statement fails on the lesson database', at + ' ' + s.id, String(e.stderr || e.message).slice(0, 160) + ' — ' + s.sql.replace(/\s+/g, ' ')); }
        }
      }
      const st = whole[0].sql;
      if (!finished.has(st)) finished.set(st, []);
      finished.get(st).push(pid);
    }

    // d. the detector, once per statement a part can see
    for (const [st, seenBy] of finished) {
      const at = n + (finished.size > 1 ? ' (as ' + seenBy.join(', ') + ' sees it)' : '');
      const over = (id, got, of, how) => { checks++; if (got * 2 > of && !(EXCEPT[n] || []).includes(id)) fail('lesson hands over more than half', at, id + ' ' + got + '/' + of + (how ? ' ' + how : '')); };
      const all = [[M.parts, M.ids], [T.twins, T.ids]];
      if ((l.answer || 'sql') === 'text') {
        const lines = st.split('\n').map((x) => x.trim()).filter(Boolean);
        const rows = lines.map((x) => { const m = x.match(/^[^:]+:\s*([^.]+)\.\s*(.*)$/); return m ? { name: m[1], reason: m[2] } : { name: '', reason: x }; });
        const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.filter((_, j) => j !== i)).map((r) => [x, ...r])));
        for (const [parts, ids] of all) for (const id of ids) {
          const p = parts[id];
          if (p.type === 'prose' || p.type === 'short') { const r = J.judge(p, st); over(id, r.total, r.of); }
          else if (p.type === 'rows') {
            const r = J.judge(p, rows); over(id, r.total, r.of, 'copied');
            let best = 0; for (const x of perms(rows.slice(0, 5))) best = Math.max(best, J.judge(p, x).total);
            checks++;
            if (best * 2 > r.of && !(EXCEPT_MAPPED[n] || []).includes(id) && !(EXCEPT[n] || []).includes(id)) fail('lesson hands over more than half', at, id + ' ' + best + '/' + r.of + ' with its lines re-ordered');
          }
        }
      } else {
        // every piece of the statement a pupil could lift into a blank: each run of words on a line
        const pieces = new Set();
        st.split('\n').forEach((ln) => { const w = ln.trim().replace(/,$/, '').split(/\s+/).filter(Boolean); for (let i = 0; i < w.length; i++) for (let j = i + 1; j <= w.length; j++) pieces.add(w.slice(i, j).join(' ')); });
        // a piece the question already shows (a field in the stub's column list) or a lone digit (a 2 is in most statements) hands over nothing (D50)
        const shows = (p, x) => { const core = x.replace(/^as\s+/i, '').replace(/^'+|'+$/g, '').trim(); return /^\d$/.test(core) || new RegExp('(^|[^\\w])' + core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\w])', 'i').test(question[p.id] || ''); };
        for (const [parts, ids] of all) for (const id of ids) {
          const p = parts[id];
          if (p.type === 'sql') { const r = J.judge(p, st); over(id, r.total, r.of); }
          else if (p.type === 'cloze') {
            let got = 0;
            const best = p.points.map((pt, i) => { let b = 0; for (const x of pieces) { if (shows(p, x)) continue; const blanks = []; blanks[i] = x; const r = J.judge(p, blanks); b = Math.max(b, r.points[i].awarded); if (b >= pt.of) break; } return b; });
            got = best.reduce((a, b) => a + b, 0);
            over(id, got, p.points.reduce((a, pt) => a + pt.of, 0), 'blank by blank');
          }
        }
      }
    }
  }

  if (mutate) return { checks, fails };
  // e. leads
  for (const pid of LEADS) { checks++; if (!part[pid] || !part[pid].lead) fail('part leans on an earlier part but prints no lead', pid, ''); }
  for (const q of Object.values(part)) { checks++; if (/\bfrom part\b|\bin part \(/i.test(q.ask) && !q.lead) fail('part leans on an earlier part but prints no lead', q.id, q.ask.slice(0, 80)); }

  return { checks, fails };
};
