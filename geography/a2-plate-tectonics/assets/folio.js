/* ============================================================
   THE EXAMINER'S FOLIO — exam questions, mark schemes, model
   answers with animated red examiner ink, and Second Marking
   (grade a real pupil script).

   One renderer, two mounts: cards appear inline in the chapter
   where the workbook sets them, and again aggregated at #/folio.

   Nothing on the answer side is written into the DOM until the
   pupil commits — no mark scheme, no model, no verdict.
   ============================================================ */
(function () {
  'use strict';

  const Store = window.OLS_STORE;
  /* window.TM is defined by script.js, which loads after this file, so these
     forward to it at call time rather than binding at load time. */
  const el = (...a) => window.TM.el(...a);
  const esc = (s) => window.TM.esc(s);
  const rich = (s) => window.TM.rich(s);
  const shuffle = (a) => window.TM.shuffle(a);
  const announce = (m) => window.TM.announce(m);

  /* ---------- gather every exam block across the atlas ---------- */

  function allExamBlocks() {
    const topic = window.TM.topic();
    const out = [];
    if (!topic) return out;
    topic.chapters.forEach((ch) => {
      (ch.blocks || []).forEach((b, i) => {
        if (b.type === 'examq' || b.type === 'marker') {
          out.push({ block: b, ch, index: i, key: b.type + ':' + i });
        }
      });
    });
    return out;
  }

  /* ============================================================
     EXAM QUESTION CARD
     ============================================================ */

  function card(b, ctx) {
    const wrap = el('div', 'folio-card');
    const done = Store.isDone(ctx.ch.id, ctx.key);

    const head = el('div', 'fc-head');
    head.innerHTML =
      '<span class="fc-marks">' + esc(b.marks) + ' mark' + (b.marks === 1 ? '' : 's') + '</span>' +
      '<span class="fc-prov">' + esc(b.source || 'Exam practice') + '</span>';
    wrap.appendChild(head);

    const q = el('p', 'fc-question');
    q.innerHTML = rich(b.question);
    wrap.appendChild(q);

    if (b.resource) {
      const r = el('div', 'fc-resource');
      r.innerHTML = '<span class="fc-res-label">' + esc(b.resource.label || 'Resource') + '</span>' +
        '<div class="fc-res-body">' + rich(b.resource.html) + '</div>';
      wrap.appendChild(r);
    }

    /* Drafting Desk — sentence starters, tapped to build a plan */
    if (b.plan && b.plan.length) {
      const desk = el('details', 'fc-desk');
      const sum = el('summary', null, 'The Drafting Desk — plan it first');
      desk.appendChild(sum);
      const inner = el('div', 'fc-desk-body');
      inner.appendChild(el('p', 'fc-desk-hint',
        'Tap a starter to drop it into your answer below.'));
      const chips = el('div', 'fc-starters');
      b.plan.forEach((p) => {
        const c = el('button', 'fc-starter', esc(p));
        c.type = 'button';
        c.addEventListener('click', () => {
          ta.value = (ta.value ? ta.value.replace(/\s*$/, '\n\n') : '') + p + ' ';
          ta.focus();
          ta.selectionStart = ta.selectionEnd = ta.value.length;
          saveDraft();
        });
        chips.appendChild(c);
      });
      inner.appendChild(chips);
      desk.appendChild(inner);
      wrap.appendChild(desk);
    }

    const ta = el('textarea', 'fc-answer');
    ta.rows = Math.max(6, Math.round(b.marks * 1.8));
    ta.placeholder = 'Write your answer here. Nothing is marked until you commit it — and ' +
      'what you type stays on this device.';
    ta.setAttribute('aria-label', 'Your answer to this question');
    ta.value = Store.draft(b.qid);
    let saveTimer = null;
    function saveDraft() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => Store.saveDraft(b.qid, ta.value), 400);
    }
    ta.addEventListener('input', () => { saveDraft(); commit.disabled = !ta.value.trim(); });
    wrap.appendChild(ta);

    const actions = el('div', 'fc-actions');
    const commit = el('button', 'btn', 'Commit my answer and see the mark scheme');
    commit.type = 'button';
    commit.disabled = !ta.value.trim();
    actions.appendChild(commit);
    const skip = el('button', 'btn btn-ghost btn-sm', 'Show me the mark scheme');
    skip.type = 'button';
    actions.appendChild(skip);
    wrap.appendChild(actions);

    const reveal = el('div', 'fc-reveal');
    wrap.appendChild(reveal);

    function open(selfMarked) {
      commit.disabled = true; skip.disabled = true;
      ta.readOnly = true;
      actions.style.display = 'none';
      buildScheme(reveal, b, ctx, selfMarked);
      Store.markDone(ctx.ch.id, ctx.key);
      window.TM.refreshChrome();
      reveal.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    commit.addEventListener('click', () => open(true));
    skip.addEventListener('click', () => open(false));

    if (done && ta.value.trim()) {
      /* returning pupil — show it already opened */
      open(true);
    }
    return wrap;
  }

  function buildScheme(host, b, ctx, selfMarked) {
    host.innerHTML = '';

    const sch = el('div', 'fc-scheme');
    sch.appendChild(el('h4', 'fc-sub', 'The mark scheme'));
    if (b.schemeNote) sch.appendChild(el('p', 'fc-note', rich(b.schemeNote)));
    sch.appendChild(el('p', 'fc-desk-hint',
      selfMarked
        ? 'Tick every point you actually made. Be strict with yourself — the examiner will be.'
        : 'These are the points the examiner is looking for.'));

    const list = el('div', 'fc-points');
    const tally = el('span', 'fc-tally');
    let ticked = 0;
    (b.scheme || []).forEach((pt, i) => {
      const row = el('label', 'fc-point');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.addEventListener('change', () => {
        ticked += cb.checked ? 1 : -1;
        row.classList.toggle('got', cb.checked);
        tally.textContent = ticked + ' of ' + b.scheme.length + ' points made';
      });
      row.appendChild(cb);
      row.appendChild(el('span', null, rich(pt.point || pt)));
      list.appendChild(row);
    });
    sch.appendChild(list);
    tally.textContent = '0 of ' + (b.scheme || []).length + ' points made';
    sch.appendChild(tally);
    host.appendChild(sch);

    if (b.model) {
      const mBtn = el('button', 'btn btn-accent', 'Show the model answer');
      mBtn.type = 'button';
      host.appendChild(mBtn);
      const mBox = el('div', 'fc-model');
      host.appendChild(mBox);
      mBtn.addEventListener('click', () => {
        mBtn.remove();
        renderModel(mBox, b);
      });
    }

    if (b.examiner) {
      const ex = el('div', 'fc-examiner');
      ex.innerHTML = '<span class="fc-ex-label">The examiner would say</span>' +
        '<p>' + rich(b.examiner) + '</p>';
      host.appendChild(ex);
    }
  }

  /* Model answer with animated red examiner ink */
  function renderModel(host, b) {
    host.innerHTML = '';
    host.appendChild(el('h4', 'fc-sub', 'Model answer'));
    if (b.modelNote) host.appendChild(el('p', 'fc-note', rich(b.modelNote)));

    const paper = el('div', 'fc-paper');
    /* the author marks scheme-hitting phrases with <mark>…</mark> */
    paper.innerHTML = rich(b.model);
    host.appendChild(paper);

    const marks = paper.querySelectorAll('mark');
    const count = el('p', 'fc-inkcount');
    host.appendChild(count);

    let shown = 0;
    function tick() {
      shown++;
      count.textContent = shown + ' of ' + marks.length + ' mark-scheme points hit';
    }

    if (window.gsap && !window.TM.prefersReduced() && marks.length) {
      count.textContent = '0 of ' + marks.length + ' mark-scheme points hit';
      window.gsap.set(marks, { '--ink': 0 });
      Array.prototype.forEach.call(marks, (m, i) => {
        window.gsap.to(m, {
          '--ink': 1, duration: .45, delay: .28 + i * 0.34, ease: 'power2.out',
          onStart: tick
        });
      });
      /* Safety net: if frames are throttled (background tab, some embeds) the
         timeline never completes and the pupil is left looking at an unmarked
         model answer. Force the finished state once the run should be over. */
      const runMs = (0.28 + marks.length * 0.34 + 0.6) * 1000;
      setTimeout(() => {
        Array.prototype.forEach.call(marks, (m) => m.style.setProperty('--ink', '1'));
        shown = marks.length;
        count.textContent = marks.length + ' of ' + marks.length + ' mark-scheme points hit';
      }, runMs);
    } else {
      Array.prototype.forEach.call(marks, (m) => m.style.setProperty('--ink', '1'));
      count.textContent = marks.length + ' of ' + marks.length + ' mark-scheme points hit';
    }
  }

  /* ============================================================
     SECOND MARKING — grade a real pupil script
     ============================================================ */

  function markerCard(b, ctx) {
    const wrap = el('div', 'folio-card fc-marker');

    const head = el('div', 'fc-head');
    head.innerHTML =
      '<span class="fc-marks">' + esc(b.marks) + ' marks</span>' +
      '<span class="fc-prov">Second marking</span>';
    wrap.appendChild(head);

    wrap.appendChild(el('p', 'fc-question', rich(b.question)));
    if (b.intro) wrap.appendChild(el('p', 'fc-note', rich(b.intro)));

    const script = el('div', 'fc-script');
    script.innerHTML = '<span class="fc-script-label">A real pupil\'s answer</span>' +
      '<div class="fc-script-body">' + rich(b.answer) + '</div>';
    if (b.teacherNote) {
      script.appendChild(el('p', 'fc-teacher-ink', b.teacherNote));
    }
    wrap.appendChild(script);

    wrap.appendChild(el('h4', 'fc-sub', 'What mark would you give it?'));
    const bands = el('div', 'fc-bands');
    let chosenBand = null, chosenMark = null;
    (b.bands || []).forEach((band) => {
      const btn = el('button', 'fc-band');
      btn.type = 'button';
      btn.innerHTML = '<span class="fc-band-name">' + esc(band.band) + '</span>' +
        '<span class="fc-band-range">' + esc(band.range) + '</span>' +
        '<span class="fc-band-desc">' + rich(band.descriptor) + '</span>';
      btn.addEventListener('click', () => {
        chosenBand = band.band;
        Array.prototype.forEach.call(bands.children, (n) =>
          n.setAttribute('aria-pressed', n === btn ? 'true' : 'false'));
        submit.disabled = false;
      });
      btn.setAttribute('aria-pressed', 'false');
      bands.appendChild(btn);
    });
    wrap.appendChild(bands);

    const markRow = el('div', 'fc-markrow');
    markRow.innerHTML = '<label for="mk-' + esc(b.qid) + '">Your mark out of ' + esc(b.marks) + '</label>';
    const num = el('input', 'fc-marknum');
    num.type = 'number'; num.min = '0'; num.max = String(b.marks); num.id = 'mk-' + b.qid;
    num.addEventListener('input', () => { chosenMark = num.value; });
    markRow.appendChild(num);
    wrap.appendChild(markRow);

    const submit = el('button', 'btn', 'Give my verdict');
    submit.type = 'button';
    submit.disabled = true;
    wrap.appendChild(submit);

    const out = el('div', 'fc-verdict-box');
    wrap.appendChild(out);

    submit.addEventListener('click', () => {
      submit.disabled = true;
      bands.querySelectorAll('button').forEach((n) => { n.disabled = true; });
      num.disabled = true;

      const v = b.verdict || {};
      const agreed = chosenBand === v.band;
      out.innerHTML =
        '<div class="fc-verdict' + (agreed ? ' agreed' : '') + '">' +
        '<span class="fc-verdict-label">' +
        (agreed ? 'You marked it the same way' : 'Our marking differs from yours') +
        '</span>' +
        '<p class="fc-verdict-line"><strong>' + esc(v.band) + ' — ' + esc(v.mark) +
        ' out of ' + esc(b.marks) + '</strong>' +
        (chosenBand ? ' <span class="fc-yours">(you said ' + esc(chosenBand) +
          (chosenMark ? ', ' + esc(chosenMark) + ' marks' : '') + ')</span>' : '') + '</p>' +
        '<div class="fc-verdict-body">' + rich(v.commentary) + '</div>' +
        (v.caveat ? '<p class="fc-caveat">' + rich(v.caveat) + '</p>' : '') +
        '</div>';
      Store.markDone(ctx.ch.id, ctx.key);
      window.TM.refreshChrome();
      announce('Verdict revealed.');
      out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    return wrap;
  }

  /* ============================================================
     THE FOLIO VIEW
     ============================================================ */

  function folioView() {
    const v = el('div', 'view');
    const items = allExamBlocks();

    const head = el('div', 'contents-head');
    const doneCount = items.filter((i) => Store.isDone(i.ch.id, i.key)).length;
    head.innerHTML = '<h1 class="tm-h">The Examiner\'s Folio</h1>' +
      '<p class="contents-sub">' + items.length + ' questions · ' + doneCount + ' attempted</p>';
    v.appendChild(head);

    if (!items.length) {
      v.appendChild(el('p', 'col', 'No exam questions are registered yet.'));
      return v;
    }

    const intro = el('div', 'col');
    intro.appendChild(el('p', null,
      'Every exam question in the atlas, gathered in one place. Each one shows its ' +
      'tariff and where it came from. Nothing is revealed until you commit an answer.'));
    v.appendChild(intro);

    const filters = el('div', 'plate-filters');
    let active = 'all';
    const list = el('div', 'folio-list');

    function draw() {
      list.innerHTML = '';
      items.filter((i) => active === 'all' || i.ch.id === active).forEach((i) => {
        const holder = el('div', 'folio-holder');
        const crumb = el('button', 'folio-crumb',
          'Chapter ' + i.ch.num + ' · ' + esc(i.ch.title));
        crumb.type = 'button';
        crumb.addEventListener('click', () => window.TM.go('#/ch/' + i.ch.id));
        holder.appendChild(crumb);
        holder.appendChild(i.block.type === 'marker'
          ? markerCard(i.block, i)
          : card(i.block, i));
        list.appendChild(holder);
      });
    }

    const chapterIds = [];
    items.forEach((i) => { if (chapterIds.indexOf(i.ch.id) < 0) chapterIds.push(i.ch.id); });
    [{ id: 'all', label: 'Every question' }].concat(
      chapterIds.map((id) => {
        const ch = window.TM.chapterById(id);
        return { id, label: ch.title };
      })
    ).forEach((o) => {
      const b = el('button', 'plate-filter', esc(o.label));
      b.type = 'button';
      b.setAttribute('aria-pressed', o.id === 'all' ? 'true' : 'false');
      b.addEventListener('click', () => {
        active = o.id;
        Array.prototype.forEach.call(filters.children, (n) =>
          n.setAttribute('aria-pressed', n === b ? 'true' : 'false'));
        draw();
      });
      filters.appendChild(b);
    });
    v.appendChild(filters);
    v.appendChild(list);
    draw();

    const nav = el('div', 'ch-nav');
    const bb = el('button', 'btn btn-ghost', 'Back to the contents');
    bb.type = 'button';
    bb.addEventListener('click', () => window.TM.go('#/contents'));
    nav.appendChild(bb);
    v.appendChild(nav);
    return v;
  }

  /* ============================================================
     THE DATA BANK
     ============================================================ */

  function bankView() {
    const v = el('div', 'view');
    const facts = Store.bankFacts();

    const head = el('div', 'contents-head');
    head.innerHTML = '<h1 class="tm-h">Your Data Bank</h1>' +
      '<p class="contents-sub">' + facts.length + ' figure' + (facts.length === 1 ? '' : 's') +
      ' collected — tap a card to turn it over</p>';
    v.appendChild(head);

    if (!facts.length) {
      const empty = el('div', 'bank-empty col');
      empty.innerHTML =
        '<p><strong>Nothing banked yet.</strong> As you read, you will meet key figures — ' +
        'the depth of a trench, the speed of a plate, the size of an eruption. Every one ' +
        'has a <em>Bank it</em> button. Collect them here and they become a set of ' +
        'flashcards to test yourself on.</p>';
      const b = el('button', 'btn', 'Start at the contents');
      b.type = 'button';
      b.addEventListener('click', () => window.TM.go('#/contents'));
      empty.appendChild(b);
      v.appendChild(empty);
      return v;
    }

    const grid = el('div', 'bank-grid');
    shuffle(facts).forEach((f) => {
      const cardEl = el('button', 'bank-card');
      cardEl.type = 'button';
      cardEl.setAttribute('aria-pressed', 'false');
      cardEl.innerHTML =
        '<span class="bank-inner">' +
        '<span class="bank-face bank-front">' +
        '<span class="bank-q">' + esc(f.label) + '</span>' +
        '<span class="bank-ch">' + esc(f.chapter || '') + '</span>' +
        '<span class="bank-hint">tap to turn over</span></span>' +
        '<span class="bank-face bank-back">' +
        '<span class="bank-a">' + esc(f.value) +
        (f.unit ? '<span class="unit">' + esc(f.unit) + '</span>' : '') + '</span>' +
        (f.detail ? '<span class="bank-d">' + rich(f.detail) + '</span>' : '') +
        '</span></span>';
      cardEl.addEventListener('click', () => {
        const on = cardEl.getAttribute('aria-pressed') === 'true';
        cardEl.setAttribute('aria-pressed', on ? 'false' : 'true');
      });
      grid.appendChild(cardEl);
    });
    v.appendChild(grid);

    const nav = el('div', 'ch-nav');
    const bb = el('button', 'btn btn-ghost', 'Back to the contents');
    bb.type = 'button';
    bb.addEventListener('click', () => window.TM.go('#/contents'));
    nav.appendChild(bb);
    const clear = el('button', 'btn btn-ghost btn-sm', 'Empty the bank');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      Store.clearBank();
      window.TM.refreshChrome();
      window.TM.go('#/bank');
    });
    nav.appendChild(clear);
    v.appendChild(nav);
    return v;
  }

  window.TM_FOLIO = { card, markerCard, folioView, bankView };
})();
