/* platform/lessonview.js — one lesson as one part sees it (D35). Public: lessons carry no exam answers.
 * A lesson holds ONE annotated whole statement (src). Its fragments are tagged with step ids:
 *   ⟪id|text⟫        the text shows once step id is visible for this part AND reached
 *   ⟪id|then|else⟫   else shows while step id is hidden for this part or not yet reached
 *   ⟪<id|text⟫       the text shows only until step id is reached (a placeholder, e.g. a cloze blank)
 *   ⟪@id⟫            a line guard: the whole line shows only once step id is visible and reached
 *   ⟪@a,b⟫           a line guard naming several steps: the line shows once ANY of them is visible and reached
 * Untagged text always shows. Fragments never nest and never cross a line. A line its fragments empty is dropped;
 * a trailing comma before a closing bracket, a clause keyword or the end is dropped, so every step's statement is well formed.
 * A step shows for a part when it has no `need`, or `need` meets the part's skills, no skill of the part is in `not`,
 * and (if given) `parts` names the part. teach / why / marks / example / task / banner items are a string or {t, need?, not?, parts?};
 * task and banner may be one string or a list of items joined with spaces; a step's title and shape may be a list of items too. hl.extra = [{need?, not?, parts?, f:[...]}] adds fields; hl.t (the table lit whole) may be a list of items, the first that meets the part wins.
 * src may be one string or a list of variants [{src, need?, not?, parts?}]: the first variant that meets the part is used.
 * tables = [{name, cols:[[field, type]], pk?, fk?, need?, not?, parts?}] replaces the lesson-set table of that name in the lesson pane
 * (e.g. to print a DEFAULT) or, when the set has no table of that name, adds it; the gate runs the lesson on the seed with the
 * lesson's `gate` SQL applied first.
 * grid = {cap, cols:[...], rows:[[...]], sql, all?} shows a few rows of a result (null prints as NULL); the gate runs sql on the seed and
 * checks every row is in its result (all: the rows are the whole result, in any order). grid may be a list of variants
 * [{need?, not?, parts?, cap, cols, rows, sql, all?}]: the first that meets the part is shown, and none shows when none meets.
 * Tokens in any string: {todayIso} 2026-09-27 · {todayUK} 27/09/2026 · {todayLong} 27 September 2026 · {todayDay} Sunday.
 * {mon1Iso} 2026-09-07 · {mon1Long} 7 September 2026: the first Monday of this month, the seed's date('now','start of month','weekday 1').
 * {agoIso:N} the date N days before today, 2026-09-15 for {agoIso:12}: the seed's date('now','-N days'), for grid rows.
 * {aheadIso:N} the date N days after today, 2026-10-07 for {aheadIso:10}: the seed's date('now','+N days').
 * {wdIso:W,K} the first date on weekday W (0 Sunday to 6 Saturday) at least K days after today: the seed's date('now','+K days','weekday W').
 * UMD: window.LessonView / require('./lessonview.js'). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LessonView = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TAG = /⟪(<?)([\w-]+)\|([^⟪⟫\n]*)⟫/g;
  const GUARD = /⟪@([\w,-]+)⟫/g;
  // a keyword only when it is a whole word: OrderDate and Settings are field names, not ORDER and SET (F32)
  const CLOSER = /^(?:(?:FROM|WHERE|GROUP|ORDER|HAVING|JOIN|LEFT|RIGHT|INNER|FULL|OUTER|VALUES|SET|INSERT|SELECT|UPDATE|CREATE|ALTER)\b|\))/i;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const pad = (n) => String(n).padStart(2, '0');

  function tokens(s, today) {
    if (s == null || typeof s !== 'string') return s;
    const d = today instanceof Date ? today : new Date();
    const iso = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    return s.replace(/\{todayIso\}/g, iso).replace(/\{todayUK\}/g, pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear())
      .replace(/\{todayLong\}/g, d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear()).replace(/\{todayDay\}/g, DAYS[d.getDay()])
      .replace(/\{somIso\}/g, d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-01')
      .replace(/\{mon1(Iso|Long)\}/g, (x, k) => { const m = 1 + ((8 - new Date(d.getFullYear(), d.getMonth(), 1).getDay()) % 7);
        return k === 'Iso' ? d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(m) : m + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); })
      .replace(/\{wdIso:(\d),(\d+)\}/g, (x, w, k) => { const a = new Date(d.getFullYear(), d.getMonth(), d.getDate() + Number(k)); a.setDate(a.getDate() + (Number(w) - a.getDay() + 7) % 7); return a.getFullYear() + '-' + pad(a.getMonth() + 1) + '-' + pad(a.getDate()); })
      .replace(/\{(ago|ahead)Iso:(\d+)\}/g, (x, w, n) => { const a = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (w === 'ago' ? -1 : 1) * Number(n)); return a.getFullYear() + '-' + pad(a.getMonth() + 1) + '-' + pad(a.getDate()); });
  }
  const has = (part, k) => (part.skills || []).includes(k);
  const meets = (x, part) => (!x.need || x.need.some((k) => has(part, k))) && (!x.not || !x.not.some((k) => has(part, k))) && (!x.parts || x.parts.includes(part.id));
  const stepShows = (s, part) => meets(s, part);
  function items(list, part) { return (list || []).filter((it) => typeof it === 'string' || meets(it, part)).map((it) => (typeof it === 'string' ? it : it.t)); }

  // resolve the fragments of one line against the reached step ids
  function line(text, reach) {
    let shut = false;
    text = text.replace(GUARD, (m, ids) => { if (!ids.split(',').some((id) => reach.has(id))) shut = true; return ''; });
    if (shut) return '';
    return text.replace(TAG, (m, before, id, body) => {
      if (before) return reach.has(id) ? '' : body;
      const bar = body.indexOf('|');
      const then = bar < 0 ? body : body.slice(0, bar), els = bar < 0 ? '' : body.slice(bar + 1);
      return reach.has(id) ? then : els;
    });
  }
  // the statement at one point in the lesson: fragments resolved, emptied lines dropped, commas repaired
  function statement(src, reach) {
    const raw = src.split('\n'), kept = [];
    raw.forEach((r) => { const l = line(r, reach).replace(/\s+$/, ''); if (!l.trim() && r.trim()) return; kept.push(l); });
    while (kept.length && !kept[0].trim()) kept.shift();
    while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
    const out = kept.filter((l, i) => l.trim() || (kept[i - 1] || '').trim());
    for (let i = 0; i < out.length; i++) {
      if (!/,\s*$/.test(out[i])) continue;
      let j = i + 1; while (j < out.length && !out[j].trim()) j++;
      if (j >= out.length || CLOSER.test(out[j].trim())) out[i] = out[i].replace(/\s*,\s*$/, '');
    }
    return out.join('\n');
  }
  // which lines of sql are new since prev (a line that only gained or lost its trailing comma is not new)
  const key = (l) => l.trim().replace(/\s*,$/, '');
  function newLines(sql, prev) {
    if (prev == null) return sql.split('\n').map(() => false);
    const had = new Set(prev.split('\n').map(key).filter(Boolean));
    return sql.split('\n').map((l) => !!key(l) && !had.has(key(l)));
  }

  // the lesson as part sees it: visible steps only, each with its statement, previous statement and quick check
  const gridFor = (s, part) => (Array.isArray(s.grid) ? s.grid.find((g) => meets(g, part)) || null : s.grid || null);
  const srcFor = (lesson, part) => (Array.isArray(lesson.src) ? ((lesson.src.find((v) => meets(v, part)) || {}).src || '') : lesson.src || '');
  function view(lesson, part, today) {
    const T = (s) => tokens(s, today), TT = (a) => a.map(T), src = srcFor(lesson, part);
    const joined = (x) => (Array.isArray(x) ? items(x, part).join(' ').replace(/\s+([,.;:])/g, '$1') : x || '');
    const one = (x) => (Array.isArray(x) ? items(x, part).join('\n') : x || '');
    const vis = lesson.steps.filter((s) => stepShows(s, part));
    const all = new Set(vis.map((s) => s.id)), reach = new Set();
    const checks = (lesson.checks || {})[part.id] || {};
    let prev = null;
    const steps = vis.map((s) => {
      reach.add(s.id);
      const sql = s.sql != null ? T(s.sql) : src ? T(statement(src, s.whole ? all : reach)) : '';
      const hl = s.hl ? { pane: s.hl.pane || 'lesson', t: (Array.isArray(s.hl.t) ? items(s.hl.t, part)[0] : s.hl.t) || null, f: (s.hl.f || []).concat(...(s.hl.extra || []).filter((x) => meets(x, part)).map((x) => x.f)), say: T(line(joined(s.hl.say), all)) } : null;
      const out = { id: s.id, name: T(s.name), title: T(one(s.title)), teach: TT(items(s.teach, part)), shape: one(s.shape) ? T(one(s.shape)) : null, sql, prev: s.whole ? null : prev, hl, whole: !!s.whole,
        why: TT(items(s.why, part)), marks: TT(items(s.marks, part)), write: s.write ? TT(items(s.write, part)) : null, example: s.example ? TT(items(s.example, part)) : null, grid: gridFor(s, part) ? { cap: T(one(gridFor(s, part).cap)), cols: gridFor(s, part).cols.slice(), rows: gridFor(s, part).rows.map((r) => r.map((c) => (c == null ? null : T(String(c))))) } : null, check: checks[s.id] ? JSON.parse(T(JSON.stringify(checks[s.id]))) : null };
      if (sql) prev = sql;
      return out;
    });
    const task = T(line(joined(lesson.task), all));
    const tables = (lesson.tables || []).filter((t) => meets(t, part)).map((t) => ({ name: t.name, cols: t.cols.map((c) => [c[0], T(c[1])]), pk: t.pk || null, fk: t.fk || null }));
    return { title: T(lesson.title), set: lesson.set, answer: lesson.answer || 'sql', focus: lesson.focus || null, tables, banner: T(line(joined(lesson.banner), all)), task, steps };
  }
  // every tag in a string, for the gate
  function tags(s) {
    const out = [];
    String(s || '').replace(TAG, (m, before, id, body) => { out.push({ id, before: !!before, body, m }); return m; });
    String(s || '').replace(GUARD, (m, ids) => { ids.split(',').forEach((id) => out.push({ id, guard: true, body: '', m })); return m; });
    return out;
  }

  return { view, statement, newLines, tokens, tags, stepShows, items, meets, srcFor, gridFor, TAG, GUARD };
});
