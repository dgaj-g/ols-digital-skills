/* platform/lesson.js — Beat 2, the lesson (§12a; his prototype look, 26 Sep 2026). Ported from prototype/lesson.js.
 * The lesson announces itself, teaches on the Tinies tables one step per skill, and each step ends in a quick check that reads
 * the EXAM design (never a line of the exam answer). Input is LessonView.view(lesson, part, today): only this part's steps.
 * window.Lesson.render(host, o) -> {destroy}
 *   o: { view, state:{step, done:{id:{how,msg}}, tries:{id:n}, wrong:{id:[picked]}, seed, finished}, save(), onOut(beat), T(key, vars),
 *        figure: { examHtml(), showPane(id), highlight(spec), pickable(pane, kind, cb, otherCb) } }
 * Checks: choose (options shuffled once per state) · field (click a field; answer may be a list, D53) · table (click a table).
 * A wrong pick shows wrong[picked], then outside, then wrong['*'] (D62) and stays struck out; after two wrong the answer is shown,
 * with every wrong pick still struck. Next opens once the check is settled; Back is always there. */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // the statement, one line per row; new lines since the last step marked .new; text answers are not coloured
  function blockHtml(text, prev, isText, extra) {
    const lines = String(text || '').split('\n'), fresh = prev == null ? lines.map(() => false) : LessonView.newLines(text, prev);
    return '<pre class="lsql' + (isText ? ' txt' : '') + (extra ? ' ' + extra : '') + '">' + lines.map((line, i) =>
      '<div class="ln' + (fresh[i] ? ' new' : '') + '">' + (isText ? esc(line) : SqlEditor.html(line).replace(/\n$/, '')) + '</div>').join('') + '</pre>';
  }
  function shuffled(arr, seed) { // stable shuffle per lesson state, so a reload keeps the order
    const a = arr.slice(); let s = seed || 1;
    for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const answers = (c) => [].concat(c.answer);
  const tableOf = (f) => String(f).split('.')[0];

  function render(host, o) {
    const V = o.view, T = o.T, st = o.state, steps = V.steps, n = steps.length, isText = V.answer === 'text';
    st.step = Math.min(Math.max(st.step || 0, 0), n - 1);
    st.done = st.done || {}; st.tries = st.tries || {}; st.wrong = st.wrong || {};
    if (!st.seed) st.seed = 1 + (Date.now() % 100000);
    let pickOff = null;

    const settled = (k) => !steps[k].check || !!st.done[steps[k].id];
    function maxReach() { let m = 0; while (m < n - 1 && settled(m)) m++; return m; }

    function strip() {
      const reach = maxReach();
      return '<ol class="steps">' + steps.map((s, k) => {
        const ok = !!st.done[s.id] || (!s.check && k < st.step);
        return '<li class="' + (k < st.step ? 'done' : k === st.step ? 'now' : '') + (ok ? ' ok' : '') + '"' + (k <= reach && k !== st.step ? ' data-step="' + k + '" role="button" tabindex="0"' : '') +
          '><i>' + (ok && k !== st.step ? '✓' : k + 1) + '</i><span>' + esc(s.name) + '</span></li>';
      }).join('') + '</ol>';
    }

    function checkHtml(s) {
      const c = s.check; if (!c) return '';
      const done = st.done[s.id], tries = st.tries[s.id] || 0, wrong = st.wrong[s.id] || [];
      const tryLine = tries && !done ? ' <small>' + esc(tries === 1 ? T('lesson.try1') : T('lesson.tries', { n: tries })) + '</small>' : '';
      let inner = '<p class="q">' + esc(c.q) + '</p>';
      const design = o.figure && o.figure.examHtml ? '<div class="qfig" data-qfig><p class="cap">' + esc(T('lesson.qfigCap', { year: o.year })) + '</p>' + o.figure.examHtml() + '</div>' : '';
      if (c.kind === 'choose') {
        const opts = shuffled(c.opts.map((op, i) => Object.assign({ i }, op)), st.seed + steps.indexOf(s) * 7);
        inner += design + '<div class="opts">' + opts.map((op) => {
          const struck = wrong.includes(op.i), cls = struck ? ' wrong' : done && op.ok ? ' right' : '';
          return '<button class="opt' + cls + '" data-opt="' + op.i + '"' + (done || struck ? ' disabled' : '') + '>' + esc(op.t) + '</button>';
        }).join('') + '</div>';
      } else {
        inner += (done ? '' : '<p class="note">' + esc(T('lesson.clickDesign')) + '</p>') + design;
      }
      inner += '<div class="fb" data-fb>' + (done ? '<p class="' + (done.how === 'right' ? 'okline' : 'revealed') + '">' + esc(done.msg) + '</p>' : '') + '</div>';
      return '<div class="qcheck' + (done ? ' settled' : '') + '"><h4>' + esc(T('lesson.quick')) + tryLine + '</h4>' + inner + '</div>';
    }

    function gridHtml(g) {
      return '<div class="lgrid"><span class="lab">' + esc(g.cap) + '</span><table><tr>' + g.cols.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr>' +
        g.rows.map((r) => '<tr>' + r.map((c) => (c == null ? '<td class="null">' + esc(T('lesson.nullCell')) + '</td>' : '<td>' + esc(c) + '</td>')).join('') + '</tr>').join('') + '</table></div>';
    }

    function stepHtml(k) {
      const s = steps[k];
      let html = '<div class="lstep"><div class="lhead"><span class="lnum">' + esc(T('lesson.step', { k: k + 1, n })) + '</span><h3>' + esc(s.title) + '</h3></div>';
      html += '<div class="teach">' + s.teach.map((p) => '<p>' + esc(p) + '</p>').join('') + '</div>';
      if (s.hl && s.hl.say) html += '<p class="say">' + esc(s.hl.say) + '</p>';
      if (s.write && s.write.length) html += '<span class="lab">' + esc(T('lesson.write')) + '</span><ul class="lwrite">' + s.write.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ul>';
      if (s.shape) html += '<div class="shape"><span class="lab">' + esc(T('lesson.shape')) + '</span>' + blockHtml(s.shape, null, isText, 'shp') + '</div>';
      if (s.example && s.example.length) html += '<span class="lab">' + esc(T('lesson.example')) + '</span>' + blockHtml(s.example.join('\n'), null, isText);
      if (s.sql) {
        const lab = s.whole ? T(isText ? 'lesson.wholeText' : 'lesson.whole') : s.prev != null ? T(isText ? 'lesson.soFarTextNew' : 'lesson.soFarNew') : T(isText ? 'lesson.soFarText' : 'lesson.soFar');
        html += '<div class="grow"><span class="lab">' + esc(lab) + '</span>' + blockHtml(s.sql, s.whole ? null : s.prev, isText) + '</div>';
      }
      if (s.grid) html += gridHtml(s.grid);
      if (s.whole && (s.why.length || s.marks.length)) {
        html += '<div class="whycard">' + (s.why.length ? '<h4>' + esc(T('lesson.why')) + '</h4><ol>' + s.why.map((w) => '<li>' + esc(w) + '</li>').join('') + '</ol>' : '') +
          (s.marks.length ? '<h4>' + esc(T('lesson.marks')) + '</h4><ul class="marklist">' + s.marks.map((m) => { const mm = /^\[([^\]]+)\]\s*(.*)$/.exec(m); return '<li><span>' + esc(mm ? mm[2] : m) + '</span>' + (mm ? '<span class="mk">' + esc(mm[1]) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      }
      html += checkHtml(s);
      html += '<div class="row lnav">' + (k > 0 ? '<button class="btn ghost" data-back>' + esc(T('lesson.back')) + '</button>' : '<button class="btn ghost" data-out="ask">' + esc(T('lesson.backQ')) + '</button>') +
        (k < n - 1 ? '<button class="btn" data-next' + (settled(k) ? '' : ' disabled') + '>' + esc(T('lesson.next', { name: steps[k + 1].name })) + '</button>' + (settled(k) ? '' : '<span class="note">' + esc(T('lesson.answerFirst')) + '</span>')
          : '<button class="btn" data-out="turn"' + (settled(k) ? '' : ' disabled') + '>' + esc(T('lesson.toTurn')) + '</button>' + (settled(k) ? '' : '<span class="note">' + esc(T('lesson.answerFirst')) + '</span>')) + '</div></div>';
      return html;
    }

    // light the answer, in the side figure and in the design inside the check
    function lightAnswer(c) {
      const spec = { pane: c.pane || 'exam', f: c.kind === 'field' ? answers(c) : [], t: c.kind === 'table' ? c.answer : null, strong: true };
      if (o.figure) o.figure.highlight(spec);
      const qf = host.querySelector('[data-qfig]'); if (!qf) return;
      if (c.kind === 'table') qf.querySelectorAll('.tbl[data-t]').forEach((t) => { if (t.dataset.t === c.answer) t.classList.add('hl', 'strong'); });
      else qf.querySelectorAll('tr[data-f]').forEach((r) => { if (answers(c).includes(r.dataset.f)) { r.classList.add('hl', 'strong'); const t = r.closest('.tbl'); if (t) t.classList.add('hl2'); } });
    }

    function paint(scroll) {
      if (pickOff) { pickOff(); pickOff = null; }
      const s = steps[st.step], c = s.check, d = c && st.done[s.id];
      host.innerHTML = '<div class="banner"><b>' + esc(T('lesson.banner')) + '</b> ' + esc(V.banner) + '</div><div class="card lesson"><div class="ltask">' + esc(V.task) + '</div>' + strip() + stepHtml(st.step) + '</div>';
      if (o.figure) {
        if (c && d && c.kind !== 'choose') lightAnswer(c);
        else { o.figure.highlight(s.hl ? { pane: s.hl.pane || 'lesson', t: s.hl.t, f: s.hl.f } : null); if (!s.hl) o.figure.showPane('lesson'); }
      }
      wire();
      if (c && !d && c.kind !== 'choose') {
        const qf = host.querySelector('[data-qfig]');
        if (qf) {
          qf.classList.add(c.kind === 'table' ? 'pick-tables' : 'pick-fields');
          qf.addEventListener('click', (e) => { const hit = c.kind === 'table' ? e.target.closest('.tbl[data-t]') : e.target.closest('tr[data-f]'); if (hit) answer(c.kind === 'table' ? hit.dataset.t : hit.dataset.f); });
        }
        // the side figure answers too: a click on the exam pane counts; a click on the lesson pane is told so and switched over
        if (o.figure) pickOff = o.figure.pickable(c.pane || 'exam', c.kind, (picked) => answer(picked), () => {
          const fb = host.querySelector('[data-fb]'); if (fb) fb.innerHTML = '<p class="notthat">' + esc(T('lesson.otherPane')) + '</p>'; o.figure.showPane(c.pane || 'exam');
        });
      }
      if (scroll !== false) { const w = host.closest('.work'); if (w) w.scrollTop = 0; }
    }

    function answer(picked) {
      const s = steps[st.step], c = s.check, fb = host.querySelector('[data-fb]');
      if (!c || st.done[s.id]) return;
      let right, why;
      if (c.kind === 'choose') { const op = c.opts[picked]; if (!op) return; right = !!op.ok; why = op.why || (right ? T('lesson.yes') : T('lesson.notThatOne')); }
      else {
        right = answers(c).includes(picked);
        if (right) why = c.okwhy || T('lesson.yes');
        else {
          const outside = c.kind === 'field' && !answers(c).some((a) => tableOf(a) === tableOf(picked));
          why = (c.wrong && c.wrong[picked]) || (outside && c.outside) || (c.wrong && c.wrong['*']) || T('lesson.notThatOne');
        }
      }
      if (right) { st.done[s.id] = { how: 'right', msg: why }; o.save(); paint(false); return; }
      const wrong = (st.wrong[s.id] = st.wrong[s.id] || []);
      if (!wrong.includes(picked)) wrong.push(picked);
      st.tries[s.id] = (st.tries[s.id] || 0) + 1;
      if (st.tries[s.id] >= 2) {
        let reveal;
        if (c.kind === 'choose') { const ans = c.opts.find((x) => x.ok); reveal = T('lesson.answerIs', { a: ans.t, why: ans.why || '' }); }
        else if (c.kind === 'table') reveal = T('lesson.answerIs', { a: c.answer, why: c.okwhy || '' });
        else if (answers(c).length > 1) reveal = T('lesson.answerIsFields', { list: answers(c).join(T('lesson.or')), why: c.okwhy || '' });
        else reveal = T('lesson.answerIsField', { f: c.answer.replace(/^.*\./, ''), t: tableOf(c.answer), why: c.okwhy || '' });
        st.done[s.id] = { how: 'revealed', msg: (why + ' ' + reveal).trim() };
        o.save(); paint(false);
        return;
      }
      o.save();
      fb.innerHTML = '<p class="notthat">' + esc(T('lesson.notThat', { why })) + '</p>';
      if (c.kind === 'choose') { const b = host.querySelector('[data-opt="' + picked + '"]'); if (b) { b.classList.add('wrong'); b.disabled = true; } }
      const h4 = host.querySelector('.qcheck h4'); if (h4) h4.innerHTML = esc(T('lesson.quick')) + ' <small>' + esc(st.tries[s.id] === 1 ? T('lesson.try1') : T('lesson.tries', { n: st.tries[s.id] })) + '</small>';
    }

    function go(k) { st.step = k; o.save(); paint(); }
    function wire() {
      host.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => answer(+b.dataset.opt)));
      host.querySelectorAll('[data-step]').forEach((li) => {
        li.addEventListener('click', () => go(+li.dataset.step));
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(+li.dataset.step); } });
      });
      const nx = host.querySelector('[data-next]'); if (nx) nx.addEventListener('click', () => { if (settled(st.step)) go(st.step + 1); });
      const bk = host.querySelector('[data-back]'); if (bk) bk.addEventListener('click', () => go(st.step - 1));
      host.querySelectorAll('[data-out]').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.out === 'turn') st.finished = true;
        o.save(); if (pickOff) { pickOff(); pickOff = null; } o.onOut(b.dataset.out);
      }));
    }

    paint();
    return { destroy: () => { if (pickOff) { pickOff(); pickOff = null; } } };
  }
  window.Lesson = { render };
})();
