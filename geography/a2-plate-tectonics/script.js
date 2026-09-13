/* ============================================================
   TERRA MOBILIS — shell, router and block renderer.

   Content lives in topics/<slug>/content.js (see AUTHORING.md).
   This file renders it; it never contains subject content itself.
   ============================================================ */
(function () {
  'use strict';

  const Store = window.OLS_STORE;
  const TOPICS = window.OLS_A2PT_TOPICS || [];
  const main = document.getElementById('tm-main');
  const liveRegion = document.getElementById('tm-live');

  /* ---------- small helpers ---------- */

  const ASSESSED = ['mcq', 'cloze', 'match', 'sequence', 'classify', 'checkpoint', 'examq', 'marker'];

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  /* Author HTML is trusted-but-limited: only inline emphasis + lists. */
  function rich(s) { return String(s == null ? '' : s); }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function announce(msg) {
    liveRegion.textContent = '';
    setTimeout(() => { liveRegion.textContent = msg; }, 40);
  }
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/[^a-z0-9']+/g, '');
  }
  const prefersReduced = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.TM = { el, esc, rich, shuffle, announce, norm, prefersReduced, ASSESSED };

  /* ---------- icons ---------- */

  const ICONS = {
    keypoint:    '<path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z"/>',
    didyouknow:  '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .9 1.6h5.2c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3z"/>',
    examtip:     '<path d="M12 4 2 9l10 5 10-5-10-5z"/><path d="M6 11.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4.5"/>',
    howdoweknow: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.7-4.7"/>',
    thinkdiscuss:'<path d="M4 5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-5 4V5z"/><path d="M17 9h3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1v3l-3-3"/>',
    speclink:    '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    place:       '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'
  };
  const GENRE_LABEL = {
    keypoint: 'Key point', didyouknow: 'Did you know', examtip: 'Exam tip',
    howdoweknow: 'How do we know?', thinkdiscuss: 'Think & discuss',
    speclink: 'Specification', place: 'Place example'
  };
  function icon(genre) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[genre] || ICONS.keypoint) + '</svg>';
  }
  window.TM.icon = icon;

  /* ---------- topic / chapter model ---------- */

  const topic = TOPICS[0] || null;

  function chapterById(id) {
    return topic ? topic.chapters.find((c) => c.id === id) : null;
  }
  function activityKeys(ch) {
    const keys = [];
    (ch.blocks || []).forEach((b, i) => {
      if (ASSESSED.indexOf(b.type) >= 0) keys.push(b.type + ':' + i);
    });
    return keys;
  }
  function chapterProgress(ch) {
    const keys = activityKeys(ch);
    if (!keys.length) return Store.chapterProgress(ch.id, 0);
    let done = 0;
    keys.forEach((k) => { if (Store.isDone(ch.id, k)) done++; });
    return done / keys.length;
  }
  function overallProgress() {
    if (!topic) return 0;
    let total = 0, done = 0;
    topic.chapters.forEach((ch) => {
      const keys = activityKeys(ch);
      total += keys.length;
      keys.forEach((k) => { if (Store.isDone(ch.id, k)) done++; });
    });
    return total ? done / total : 0;
  }
  window.TM.chapterById = chapterById;
  window.TM.topic = () => topic;

  function refreshChrome() {
    const fill = document.getElementById('tm-ribbon-fill');
    if (fill) fill.style.width = Math.round(overallProgress() * 100) + '%';
    const bc = document.getElementById('bank-count');
    if (bc) bc.textContent = String(Store.bankCount());
  }
  window.TM.refreshChrome = refreshChrome;

  /* ============================================================
     BLOCK RENDERERS
     ============================================================ */

  const renderers = {};

  renderers.heading = (b) => {
    const w = el('div', 'block');
    w.appendChild(el('h2', 'tm-h', esc(b.text)));
    return w;
  };

  renderers.text = (b) => {
    const w = el('div', 'block prose');
    w.innerHTML = rich(b.html);
    return w;
  };

  renderers.steps = (b) => {
    const w = el('div', 'block prose');
    const ol = el('ol', 'steps');
    (b.items || []).forEach((it) => ol.appendChild(el('li', null, rich(it))));
    w.appendChild(ol);
    return w;
  };

  renderers.callout = (b) => {
    const genre = b.genre || 'keypoint';
    const w = el('div', 'block');
    const c = el('div', 'callout g-' + genre);
    const head = el('div', 'callout-head');
    head.innerHTML =
      '<span class="callout-ic">' + icon(genre) + '</span>' +
      '<span class="callout-genre">' + esc(GENRE_LABEL[genre] || genre) + '</span>' +
      (b.place ? '<span class="place-chip">' + esc(b.place) + '</span>' : '');
    c.appendChild(head);
    if (b.title) c.appendChild(el('p', 'callout-title', esc(b.title)));
    const body = el('div', 'prose');
    body.innerHTML = rich(b.html);
    c.appendChild(body);
    w.appendChild(c);
    return w;
  };

  renderers.keyterms = (b) => {
    const w = el('div', 'block');
    const grid = el('div', 'keyterms');
    (b.terms || []).forEach((t) => {
      const dl = el('dl', 'kt');
      dl.appendChild(el('dt', null, esc(t.term)));
      dl.appendChild(el('dd', null, rich(t.def)));
      grid.appendChild(dl);
    });
    w.appendChild(grid);
    return w;
  };

  renderers.note = (b) => {
    const w = el('div', 'block');
    const arrow =
      '<svg viewBox="0 0 44 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" aria-hidden="true">' +
      '<path d="M42 4C30 2 12 4 4 16"/><path d="M3 9.5 4 17l7-2.5"/></svg>';
    const gutter = el('div', 'note-gutter', arrow + esc(b.text));
    const btn = el('button', 'note-inline has-gutter');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="note-peek">a note from the margin</span>' +
      '<span class="note-body">' + esc(b.text) + '</span>';
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    w.appendChild(gutter);
    w.appendChild(btn);
    return w;
  };

  renderers.data = (b, ctx) => {
    const w = el('div', 'block');
    const grid = el('div', 'data-grid');
    (b.facts || []).forEach((f, i) => {
      const id = (ctx.ch.id + ':' + ctx.index + ':' + i);
      const tile = el('div', 'data-tile');
      tile.innerHTML =
        '<span class="data-val">' + esc(f.value) +
        (f.unit ? '<span class="unit">' + esc(f.unit) + '</span>' : '') + '</span>' +
        '<span class="data-label">' + esc(f.label) + '</span>' +
        (f.detail ? '<span class="data-detail">' + rich(f.detail) + '</span>' : '');
      const btn = el('button', 'bank-btn');
      btn.type = 'button';
      const inBank = Store.hasFact(id);
      btn.textContent = inBank ? '✓ In your Data Bank' : '+ Bank it';
      if (inBank) btn.dataset.in = '1';
      btn.addEventListener('click', () => {
        if (Store.hasFact(id)) return;
        Store.collectFact(id, {
          value: f.value, unit: f.unit || '', label: f.label,
          detail: f.detail || '', chapter: ctx.ch.title, chapterId: ctx.ch.id
        });
        btn.textContent = '✓ In your Data Bank';
        btn.dataset.in = '1';
        refreshChrome();
        announce(f.label + ' added to your Data Bank.');
      });
      tile.appendChild(btn);
      grid.appendChild(tile);
    });
    w.appendChild(grid);
    return w;
  };

  renderers.diagram = (b) => {
    const w = el('div', 'block block-wide');
    w.appendChild(window.TM_PLATES.mountFigure(b.id, b.caption));
    return w;
  };

  renderers.sim = (b) => {
    const w = el('div', 'block block-wide');
    w.appendChild(window.TM_SIMS.mount(b.id, b.title, b.caption));
    return w;
  };

  renderers.board = () => {
    const w = el('div', 'block block-wide');
    w.appendChild(window.TM_BOARD.mount());
    return w;
  };

  renderers.examq = (b, ctx) => {
    const w = el('div', 'block');
    w.appendChild(window.TM_FOLIO.card(b, ctx));
    return w;
  };

  renderers.marker = (b, ctx) => {
    const w = el('div', 'block');
    w.appendChild(window.TM_FOLIO.markerCard(b, ctx));
    return w;
  };

  /* ---------- shared activity chrome ---------- */

  function actShell(kind, title, extraClass) {
    const wrap = el('div', 'block');
    const act = el('section', 'act' + (extraClass ? ' ' + extraClass : ''));
    const head = el('div', 'act-head');
    head.innerHTML = '<span class="act-kind">' + esc(kind) + '</span>' +
      (title ? '<span class="act-title">' + esc(title) + '</span>' : '');
    const body = el('div', 'act-body');
    const foot = el('div', 'act-foot');
    act.appendChild(head); act.appendChild(body); act.appendChild(foot);
    wrap.appendChild(act);
    return { wrap, act, head, body, foot };
  }

  function markDone(ctx, act) {
    Store.markDone(ctx.ch.id, ctx.key);
    act.classList.add('done');
    refreshChrome();
    if (ctx.onDone) ctx.onDone();
  }

  /* ---------- MCQ ---------- */

  function buildMcq(b, ctx, opts) {
    opts = opts || {};
    const s = actShell(opts.kind || 'Check yourself', b.title || '');
    const { act, body, foot } = s;
    body.appendChild(el('p', 'prompt', rich(b.stem)));

    const list = el('div', 'opts');
    const order = shuffle((b.options || []).map((o, i) => i));
    const status = el('span', 'act-status');
    let answered = false;

    order.forEach((origIdx, pos) => {
      const o = b.options[origIdx];
      const btn = el('button', 'opt');
      btn.type = 'button';
      btn.innerHTML = '<span class="opt-key">' + String.fromCharCode(65 + pos) + '</span>' +
        '<span class="opt-text">' + rich(o.text) + '</span>';
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const isRight = !!o.correct;
        list.querySelectorAll('.opt').forEach((n) => { n.disabled = true; });
        btn.classList.add(isRight ? 'correct' : 'wrong');
        if (!isRight) {
          order.forEach((oi, p) => {
            if (b.options[oi].correct) {
              list.children[p].classList.add('correct');
            }
          });
        }
        order.forEach((oi, p) => {
          const why = b.options[oi].why;
          if (why && (b.options[oi].correct || oi === origIdx)) {
            const t = list.children[p].querySelector('.opt-text');
            t.appendChild(el('span', 'opt-why', rich(why)));
          }
        });
        status.textContent = isRight ? 'Correct.' : 'Not quite — the correct answer is shown.';
        status.className = 'act-status ' + (isRight ? 'ok' : 'bad');
        if (opts.onAnswer) opts.onAnswer(isRight);
        else markDone(ctx, act);
      });
      list.appendChild(btn);
    });

    body.appendChild(list);
    foot.appendChild(status);
    return s;
  }

  renderers.mcq = (b, ctx) => buildMcq(b, ctx).wrap;

  /* ---------- Cloze ---------- */

  function buildCloze(b, ctx, opts) {
    opts = opts || {};
    const s = actShell(opts.kind || 'Fill the gaps', b.title || '');
    const { act, body, foot } = s;
    if (b.prompt) body.appendChild(el('p', 'prompt', rich(b.prompt)));

    const p = el('p', 'cloze-text');
    const gaps = [];
    (b.segments || []).forEach((seg) => {
      if (seg.t === 'txt') {
        p.appendChild(document.createTextNode(seg.text));
      } else {
        const inp = el('input', 'gap');
        inp.type = 'text';
        inp.setAttribute('autocomplete', 'off');
        inp.setAttribute('autocapitalize', 'off');
        inp.setAttribute('spellcheck', 'false');
        const show = seg.show == null ? 1 : seg.show;
        const hint = String(seg.answer).slice(0, show);
        inp.placeholder = hint + '…';
        inp.setAttribute('aria-label', 'Missing word beginning with ' + hint);
        inp.dataset.answer = '';           // never store the answer in the DOM
        gaps.push({ input: inp, answer: seg.answer, alt: seg.alt || [], solved: false });
        p.appendChild(inp);
      }
    });
    body.appendChild(p);

    const status = el('span', 'act-status');
    const checkBtn = el('button', 'btn', 'Check');
    checkBtn.type = 'button';
    let attempts = 0;

    function matches(g, val) {
      const v = norm(val);
      if (!v) return false;
      if (v === norm(g.answer)) return true;
      return g.alt.some((a) => norm(a) === v);
    }
    function allSettled() { return gaps.every((g) => g.solved); }

    function updateEnabled() {
      checkBtn.disabled = gaps.every((g) => g.solved) ||
        gaps.some((g) => !g.solved && !g.input.value.trim());
    }
    gaps.forEach((g) => {
      g.input.addEventListener('input', () => {
        g.input.classList.remove('bad');
        updateEnabled();
      });
      g.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !checkBtn.disabled) { e.preventDefault(); checkBtn.click(); }
      });
    });
    updateEnabled();

    checkBtn.addEventListener('click', () => {
      attempts++;
      let right = 0;
      gaps.forEach((g) => {
        if (g.solved) { right++; return; }
        if (matches(g, g.input.value)) {
          g.solved = true; right++;
          g.input.classList.remove('bad');
          g.input.classList.add('ok');
          g.input.disabled = true;
          g.input.value = g.answer;
        } else {
          g.input.classList.add('bad');
        }
      });
      status.textContent = right + ' of ' + gaps.length + ' correct.';
      status.className = 'act-status ' + (right === gaps.length ? 'ok' : 'bad');

      if (attempts >= 3) {
        gaps.forEach((g) => {
          if (g.solved || g.input.nextElementSibling) return;
          const rev = el('button', 'reveal-gap', 'reveal');
          rev.type = 'button';
          rev.addEventListener('click', () => {
            g.input.value = g.answer;
            g.input.classList.remove('bad');
            g.input.classList.add('shown');
            g.input.disabled = true;
            g.solved = true;
            rev.remove();
            updateEnabled();
            if (allSettled()) finish();
          });
          g.input.after(rev);
        });
      }
      updateEnabled();
      if (allSettled()) finish();
    });

    function finish() {
      checkBtn.disabled = true;
      if (opts.onAnswer) opts.onAnswer(gaps.every((g) => !g.input.classList.contains('shown')));
      else markDone(ctx, act);
    }

    foot.appendChild(checkBtn);
    foot.appendChild(status);
    return s;
  }

  renderers.cloze = (b, ctx) => buildCloze(b, ctx).wrap;

  /* ---------- Drag activities: match / sequence / classify ---------- */

  function dragActivity(b, ctx, cfg) {
    const s = actShell(cfg.kind, b.title || '');
    const { act, body, foot } = s;
    if (b.prompt) body.appendChild(el('p', 'prompt', rich(b.prompt)));

    const zonesWrap = cfg.buildZones(body);
    const tray = el('div', 'tray sticky');
    tray.appendChild(el('span', 'tray-label', 'Drag these into place'));
    body.appendChild(tray);

    const chips = cfg.items.map((item) => {
      const chip = el('div', 'chip-d');
      chip.textContent = item.text;
      chip.__item = item;
      chip.__home = tray;
      return chip;
    });
    shuffle(chips).forEach((c) => tray.appendChild(c));

    const status = el('span', 'act-status');
    const checkBtn = el('button', 'btn', 'Check');
    checkBtn.type = 'button';
    checkBtn.disabled = true;
    let graded = false;

    function zoneList() {
      return Array.prototype.slice.call(zonesWrap.querySelectorAll(cfg.zoneSelector));
    }
    function placedCount() {
      return chips.filter((c) => !tray.contains(c)).length;
    }
    function updateCheck() {
      checkBtn.disabled = placedCount() < chips.length;
    }
    function slotHost(zone) {
      return cfg.slotHost ? cfg.slotHost(zone) : zone;
    }

    function place(chip, zone) {
      const host = slotHost(zone);
      if (cfg.single) {
        const occupant = Array.prototype.slice.call(host.children)
          .filter((n) => n.classList && n.classList.contains('chip-d') && n !== chip)[0];
        if (occupant) {
          // swap: the occupant goes where the incoming chip came from
          const from = chip.parentElement;
          if (from && from !== tray && from !== host) from.appendChild(occupant);
          else tray.appendChild(occupant);
        }
      }
      host.appendChild(chip);
    }

    chips.forEach((chip) => {
      window.OLS_DRAG.makeDraggable(chip, {
        canDrag: () => !chip.classList.contains('locked-ok'),
        zoneUnder: (x, y, c) => {
          const z = window.OLS_DRAG.zoneUnder(x, y, c, cfg.zoneSelector);
          if (z) return z;
          return window.OLS_DRAG.zoneUnder(x, y, c, '.tray');
        },
        hoverTarget: (z) => z,
        onDrop: (c, zone) => {
          if (!zone) { updateCheck(); return; }
          if (zone.classList.contains('tray')) tray.appendChild(c);
          else place(c, zone);
          c.classList.remove('mark-bad');
          if (graded) { graded = false; status.textContent = ''; status.className = 'act-status'; }
          updateCheck();
        },
        kbZones: () => zoneList().concat([tray]),
        announce,
        chipName: (c) => c.textContent
      });
    });

    checkBtn.addEventListener('click', () => {
      let right = 0;
      chips.forEach((chip) => {
        if (chip.classList.contains('locked-ok')) { right++; return; }
        const ok = cfg.isCorrect(chip, chips);
        if (ok) {
          right++;
          chip.classList.add('locked-ok');
          chip.classList.remove('mark-bad');
          chip.setAttribute('aria-disabled', 'true');
        } else {
          chip.classList.add('mark-bad');
        }
      });
      graded = true;
      const total = chips.length;
      status.textContent = right + ' of ' + total + ' in the right place.' +
        (right < total ? ' Move the red ones and check again.' : '');
      status.className = 'act-status ' + (right === total ? 'ok' : 'bad');
      announce(status.textContent);
      if (right === total) {
        checkBtn.disabled = true;
        markDone(ctx, act);
        if (cfg.onComplete) cfg.onComplete();
      }
    });

    foot.appendChild(checkBtn);
    foot.appendChild(status);
    return s;
  }

  renderers.match = (b, ctx) => {
    const pairs = b.pairs || [];
    const items = pairs.map((p, i) => ({ text: p.right, key: 'p' + i }));
    let rowsEl;
    return dragActivity(b, ctx, {
      kind: 'Match them up',
      items,
      zoneSelector: '.match-row',
      slotHost: (zone) => zone.querySelector('.match-zone'),
      single: true,
      buildZones: (body) => {
        rowsEl = el('div', 'match-rows');
        shuffle(pairs.map((p, i) => ({ p, i }))).forEach(({ p, i }) => {
          const row = el('div', 'match-row');
          row.dataset.key = 'p' + i;
          row.innerHTML = '<div class="match-def">' + rich(p.left) + '</div>';
          row.appendChild(el('div', 'match-zone'));
          rowsEl.appendChild(row);
        });
        body.appendChild(rowsEl);
        return rowsEl;
      },
      isCorrect: (chip) => {
        const row = chip.closest('.match-row');
        return !!row && row.dataset.key === chip.__item.key;
      }
    }).wrap;
  };

  renderers.sequence = (b, ctx) => {
    const items = (b.items || []).map((t, i) => ({ text: t, order: i }));
    let seqEl;
    return dragActivity(b, ctx, {
      kind: 'Put it in order',
      items,
      zoneSelector: '.seq-slot',
      single: true,
      buildZones: (body) => {
        seqEl = el('div', 'seq');
        items.forEach((_, i) => {
          const slot = el('div', 'seq-slot');
          slot.dataset.pos = String(i);
          seqEl.appendChild(slot);
        });
        body.appendChild(seqEl);
        return seqEl;
      },
      isCorrect: (chip) => {
        const slot = chip.closest('.seq-slot');
        return !!slot && Number(slot.dataset.pos) === chip.__item.order;
      }
    }).wrap;
  };

  renderers.classify = (b, ctx) => {
    const items = (b.items || []).map((it) => ({ text: it.text, col: it.col }));
    let colsEl;
    return dragActivity(b, ctx, {
      kind: 'Sort them',
      items,
      zoneSelector: '.col-zone',
      slotHost: (zone) => zone.querySelector('.col-items'),
      single: false,
      buildZones: (body) => {
        colsEl = el('div', 'cols');
        (b.columns || []).forEach((c) => {
          const z = el('div', 'col-zone');
          z.dataset.col = c;
          z.appendChild(el('div', 'col-head', esc(c)));
          z.appendChild(el('div', 'col-items'));
          colsEl.appendChild(z);
        });
        body.appendChild(colsEl);
        return colsEl;
      },
      isCorrect: (chip) => {
        const z = chip.closest('.col-zone');
        return !!z && z.dataset.col === chip.__item.col;
      }
    }).wrap;
  };

  /* ---------- Checkpoint ---------- */

  renderers.checkpoint = (b, ctx) => {
    const s = actShell('Checkpoint', b.title || 'Check your understanding', 'cp');
    const { act, body, foot } = s;
    const items = b.items || [];
    const total = items.length;
    let idx = 0, score = 0;
    const results = [];

    const counter = el('span', 'cp-progress');
    s.head.appendChild(counter);
    const stage = el('div');
    body.appendChild(stage);

    const prev = Store.checkpoint(ctx.ch.id);
    if (prev) {
      const note = el('p', 'act-status', 'Your best so far: ' + prev.score + ' of ' + prev.total + '.');
      foot.appendChild(note);
    }

    function step() {
      stage.innerHTML = '';
      counter.textContent = 'Question ' + (idx + 1) + ' of ' + total;
      const item = items[idx];
      const ctx2 = Object.assign({}, ctx, { onDone: null });
      const built = item.type === 'cloze'
        ? buildCloze(item, ctx2, { kind: 'Question ' + (idx + 1), onAnswer: onAnswer })
        : buildMcq(item, ctx2, { kind: 'Question ' + (idx + 1), onAnswer: onAnswer });
      // strip the nested shell chrome — the checkpoint owns it
      const inner = built.wrap.querySelector('.act');
      inner.style.border = '0';
      inner.style.boxShadow = 'none';
      inner.querySelector('.act-head').remove();
      stage.appendChild(built.wrap);

      function onAnswer(right) {
        if (right) score++;
        results.push({
          right,
          stem: item.stem || item.prompt || item.title || ('Question ' + (idx + 1)),
          teach: item.teach || ''
        });
        const nextBtn = el('button', 'btn btn-accent',
          idx + 1 < total ? 'Next question →' : 'See your score');
        nextBtn.type = 'button';
        nextBtn.addEventListener('click', () => {
          idx++;
          if (idx < total) step(); else finish();
        });
        built.wrap.querySelector('.act-foot').appendChild(nextBtn);
        nextBtn.focus();
      }
    }

    function finish() {
      counter.textContent = 'Complete';
      stage.innerHTML = '';
      const pct = total ? score / total : 0;
      const sc = el('div', 'cp-score');
      sc.innerHTML = '<div class="big' + (pct >= 0.8 ? ' good' : '') + '">' +
        score + ' / ' + total + '</div>' +
        '<p class="act-status">' + (
          pct === 1 ? 'Every one right. This chapter is secure.'
          : pct >= 0.6 ? 'A solid pass — review the ones you missed below.'
          : 'Worth another read of this chapter before you move on.'
        ) + '</p>';
      const rev = el('div', 'cp-review');
      results.forEach((r) => {
        const it = el('div', 'cp-rev-item ' + (r.right ? 'y' : 'n'));
        it.innerHTML = '<span class="mk">' + (r.right ? '✓' : '✗') + '</span>' +
          '<span>' + rich(r.stem) +
          (r.teach ? '<span class="lnk">' + rich(r.teach) + '</span>' : '') + '</span>';
        rev.appendChild(it);
      });
      sc.appendChild(rev);
      stage.appendChild(sc);

      Store.recordCheckpoint(ctx.ch.id, score, total);
      markDone(ctx, act);

      foot.innerHTML = '';
      const again = el('button', 'btn btn-ghost', 'Take it again');
      again.type = 'button';
      again.addEventListener('click', () => {
        idx = 0; score = 0; results.length = 0;
        foot.innerHTML = '';
        step();
      });
      foot.appendChild(again);
    }

    step();
    return s.wrap;
  };

  /* ============================================================
     VIEWS
     ============================================================ */

  function renderBlocks(ch, host) {
    (ch.blocks || []).forEach((b, i) => {
      const fn = renderers[b.type];
      if (!fn) return;
      const ctx = { ch, index: i, key: b.type + ':' + i };
      let node;
      try {
        node = fn(b, ctx);
      } catch (err) {
        console.error('Block failed to render', b.type, i, err);
        return;
      }
      if (node) host.appendChild(node);
    });
  }

  function ringSvg(frac) {
    const r = 22, c = 2 * Math.PI * r;
    const pct = Math.round(frac * 100);
    return '<svg class="ring" viewBox="0 0 54 54" role="img" aria-label="' + pct + '% complete">' +
      '<circle class="bg" cx="27" cy="27" r="' + r + '"/>' +
      '<circle class="fg" cx="27" cy="27" r="' + r +
      '" stroke-dasharray="' + (c * frac).toFixed(1) + ' ' + c.toFixed(1) + '"/>' +
      '<text x="27" y="32">' + pct + '</text></svg>';
  }

  function sealSvg() {
    return '<svg class="seal" viewBox="0 0 40 40" role="img" aria-label="Chapter complete">' +
      '<circle cx="20" cy="20" r="15" fill="#E1462C"/>' +
      '<circle cx="20" cy="20" r="11.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/>' +
      '<path d="M20 5.5 22.4 9 26.6 8 26.2 12.3 30 14.4 27.4 17.8 30 21.2 26.2 23.3 26.6 27.6 22.4 26.6 20 30.1 17.6 26.6 13.4 27.6 13.8 23.3 10 21.2 12.6 17.8 10 14.4 13.8 12.3 13.4 8 17.6 9z" fill="#E1462C" opacity=".85"/>' +
      '<text x="20" y="24.5" text-anchor="middle" font-family="Anton, sans-serif" font-size="10" fill="#fff">TM</text>' +
      '</svg>';
  }

  function viewContents() {
    const v = el('div', 'view');

    /* Frontispiece */
    const fr = el('div', 'frontis');
    fr.appendChild(window.TM_DIAGRAMS.frontispiece());
    fr.appendChild(el('span', 'frontis-cap', 'Simplified — plate boundaries shown schematically'));
    v.appendChild(fr);
    v.appendChild(window.TM_DIAGRAMS.frontispieceLegend((chId) => go('#/ch/' + chId)));

    const head = el('div', 'contents-head');
    head.innerHTML = '<h1 class="tm-h">' + esc(topic.title) + '</h1>' +
      '<p class="contents-sub">' + esc(topic.strap || '') + '</p>';
    v.appendChild(head);

    /* Resume */
    const last = Store.lastLoc();
    const lastCh = last && chapterById(last);
    if (lastCh && chapterProgress(lastCh) < 1) {
      const r = el('div', 'resume');
      r.innerHTML = '<div><div class="resume-label">You were reading</div>' +
        '<div class="resume-title">' + esc(lastCh.num + '. ' + lastCh.title) + '</div></div>';
      const b = el('button', 'btn btn-accent', 'Continue →');
      b.type = 'button';
      b.addEventListener('click', () => go('#/ch/' + lastCh.id));
      r.appendChild(b);
      v.appendChild(r);
    }

    /* Spec tracker */
    const st = el('div', 'spec-track');
    st.appendChild(el('h2', 'tm-h', 'What the specification asks of you'));
    (topic.spec || []).forEach((sp) => {
      const chs = topic.chapters.filter((c) => (c.specIds || []).indexOf(sp.id) >= 0);
      const frac = chs.length
        ? chs.reduce((a, c) => a + chapterProgress(c), 0) / chs.length : 0;
      const row = el('div', 'spec-item');
      row.innerHTML = '<span class="spec-roman">(' + esc(sp.id) + ')</span>' +
        '<span class="spec-text">' + rich(sp.text) +
        '<span class="spec-meta">' + Math.round(frac * 100) + '% of the work in ' +
        chs.length + ' chapter' + (chs.length === 1 ? '' : 's') + ' complete</span></span>';
      const rag = el('div', 'rag');
      rag.setAttribute('role', 'group');
      rag.setAttribute('aria-label', 'How confident are you with statement ' + sp.id + '?');
      [[1, '~', 'Still shaky'], [2, '✓', 'Secure']].forEach(([lvl, glyph, label]) => {
        const btn = el('button', null, glyph);
        btn.type = 'button';
        btn.dataset.level = String(lvl);
        btn.title = label;
        btn.setAttribute('aria-label', label);
        btn.setAttribute('aria-pressed', Store.specLevel(sp.id) === lvl ? 'true' : 'false');
        btn.addEventListener('click', () => {
          const cur = Store.specLevel(sp.id);
          const next = cur === lvl ? 0 : lvl;
          Store.setSpec(sp.id, next);
          rag.querySelectorAll('button').forEach((n) => {
            n.setAttribute('aria-pressed',
              Number(n.dataset.level) === next ? 'true' : 'false');
          });
          announce(next === 0 ? 'Cleared.' : label + ' recorded.');
        });
        rag.appendChild(btn);
      });
      row.appendChild(rag);
      st.appendChild(row);
    });
    v.appendChild(st);

    /* Chapter list */
    const tocHead = el('h2', 'tm-h col', 'The chapters');
    v.appendChild(tocHead);
    const ol = el('ol', 'toc');
    topic.chapters.forEach((ch) => {
      const frac = chapterProgress(ch);
      const li = el('li');
      const row = el('button', 'toc-row');
      row.type = 'button';
      row.innerHTML =
        '<span class="toc-num">' + String(ch.num).padStart(2, '0') + '</span>' +
        '<span class="toc-main"><span class="toc-title">' + esc(ch.title) + '</span>' +
        (ch.subtitle ? '<span class="toc-strap">' + esc(ch.subtitle) + '</span>' : '') + '</span>' +
        '<span class="toc-leader"><i style="width:' + Math.round(frac * 100) + '%"></i></span>' +
        '<span class="toc-pct">' + Math.round(frac * 100) + '%</span>' +
        (frac >= 1 ? sealSvg() : '<span class="seal-slot"></span>');
      row.addEventListener('click', () => go('#/ch/' + ch.id));
      li.appendChild(row);
      ol.appendChild(li);
    });
    v.appendChild(ol);

    /* Volume spines */
    const spines = el('div', 'spines');
    const vols = [
      { n: 'I', name: topic.volumeName || 'Margins & Landforms', live: true },
      { n: 'II', name: 'Volcanic Activity & Response', live: false },
      { n: 'III', name: 'Earthquake Activity & Response', live: false }
    ];
    vols.forEach((vol, i) => {
      const live = i < TOPICS.length;
      const d = el('div', 'spine ' + (live ? 'spine-live' : 'spine-soon'));
      d.innerHTML = '<span class="spine-vol">Volume ' + vol.n + '</span>' +
        '<span class="spine-name">' + esc(vol.name) + '</span>' +
        '<span class="spine-state">' + (live ? 'In this atlas' : 'In press') + '</span>';
      if (!live) d.setAttribute('aria-hidden', 'true');
      spines.appendChild(d);
    });
    v.appendChild(spines);

    return v;
  }

  function viewChapter(id) {
    const ch = chapterById(id);
    if (!ch) return viewContents();
    Store.markVisited(ch.id);
    Store.setLoc(ch.id);

    const v = el('div', 'view');
    const head = el('div', 'ch-head');
    head.innerHTML =
      '<span class="ch-bignum">' + String(ch.num).padStart(2, '0') + '</span>' +
      '<span class="ch-titles"><p class="tm-strap">' + esc(ch.subtitle || '') + '</p>' +
      '<h1 class="tm-h">' + esc(ch.title) + '</h1>' +
      '<span class="ch-chips">' + (ch.specIds || []).map((s) =>
        '<span class="chip">Spec (' + esc(s) + ')</span>').join('') + '</span></span>' +
      ringSvg(chapterProgress(ch));
    v.appendChild(head);

    const bodyHost = el('div');
    v.appendChild(bodyHost);
    renderBlocks(ch, bodyHost);

    /* footer nav */
    const i = topic.chapters.indexOf(ch);
    const nav = el('div', 'ch-nav');
    const prev = topic.chapters[i - 1], next = topic.chapters[i + 1];
    if (prev) {
      const b = el('button', 'btn btn-ghost', '← ' + prev.title);
      b.type = 'button';
      b.addEventListener('click', () => go('#/ch/' + prev.id));
      nav.appendChild(b);
    } else nav.appendChild(el('span'));
    const c = el('button', 'btn btn-ghost', 'Contents');
    c.type = 'button';
    c.addEventListener('click', () => go('#/contents'));
    nav.appendChild(c);
    if (next) {
      const b = el('button', 'btn', next.title + ' →');
      b.type = 'button';
      b.addEventListener('click', () => go('#/ch/' + next.id));
      nav.appendChild(b);
    } else nav.appendChild(el('span'));
    v.appendChild(nav);

    return v;
  }

  /* ---------- Search ---------- */

  let searchIndex = null;
  function buildSearchIndex() {
    if (searchIndex) return searchIndex;
    const idx = [];
    if (!topic) return (searchIndex = idx);
    topic.chapters.forEach((ch) => {
      idx.push({ ch, label: ch.title, kind: 'Chapter', text: ch.title + ' ' + (ch.subtitle || '') });
      (ch.blocks || []).forEach((b) => {
        /* PROMPT-SIDE TEXT ONLY — never index answers (see AUTHORING.md rule 3) */
        if (b.type === 'heading') idx.push({ ch, label: b.text, kind: 'Section', text: b.text });
        else if (b.type === 'text') idx.push({ ch, label: strip(b.html).slice(0, 90), kind: 'Notes', text: strip(b.html) });
        else if (b.type === 'steps') idx.push({ ch, label: strip((b.items || []).join(' ')).slice(0, 90), kind: 'Process', text: strip((b.items || []).join(' ')) });
        else if (b.type === 'callout') idx.push({ ch, label: b.title || GENRE_LABEL[b.genre] || 'Note', kind: GENRE_LABEL[b.genre] || 'Note', text: (b.title || '') + ' ' + strip(b.html) + ' ' + (b.place || '') });
        else if (b.type === 'keyterms') (b.terms || []).forEach((t) => idx.push({ ch, label: t.term, kind: 'Key term', text: t.term + ' ' + strip(t.def) }));
        else if (b.type === 'data') (b.facts || []).forEach((f) => idx.push({ ch, label: f.label, kind: 'Figure', text: f.label + ' ' + f.value + ' ' + (f.detail || '') }));
        else if (b.type === 'sim') idx.push({ ch, label: b.title, kind: 'Animation', text: b.title + ' ' + (b.caption || '') });
        else if (b.type === 'diagram') idx.push({ ch, label: b.caption || b.id, kind: 'Diagram', text: (b.caption || '') });
        else if (b.type === 'examq') idx.push({ ch, label: strip(b.question).slice(0, 90), kind: 'Exam question', text: strip(b.question) });
      });
    });
    return (searchIndex = idx);
  }
  function strip(html) {
    const d = document.createElement('div');
    d.innerHTML = String(html || '');
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function openSearch() {
    const idx = buildSearchIndex();
    const back = el('div', 'overlay');
    const panel = el('div', 'ov-panel ov-search');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Search the atlas');
    const input = el('input', 'search-input');
    input.type = 'search';
    input.placeholder = 'Search the atlas — a term, a place, a figure…';
    input.setAttribute('aria-label', 'Search the atlas');
    const results = el('div', 'search-results');
    panel.appendChild(input);
    panel.appendChild(results);
    back.appendChild(panel);
    document.body.appendChild(back);
    input.focus();

    function run() {
      const q = input.value.trim().toLowerCase();
      results.innerHTML = '';
      if (q.length < 2) {
        results.appendChild(el('p', 'search-hint', 'Type at least two letters.'));
        return;
      }
      const hits = idx.filter((r) => r.text.toLowerCase().indexOf(q) >= 0).slice(0, 40);
      if (!hits.length) {
        results.appendChild(el('p', 'search-hint', 'Nothing found for “' + esc(input.value) + '”.'));
        return;
      }
      hits.forEach((h) => {
        const b = el('button', 'search-hit');
        b.type = 'button';
        b.innerHTML = '<span class="hit-kind">' + esc(h.kind) + '</span>' +
          '<span class="hit-label">' + esc(h.label) + '</span>' +
          '<span class="hit-ch">' + esc(h.ch.num + '. ' + h.ch.title) + '</span>';
        b.addEventListener('click', () => { close(); go('#/ch/' + h.ch.id); });
        results.appendChild(b);
      });
    }
    function close() { back.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    input.addEventListener('input', run);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    run();
  }

  /* ---------- routing ---------- */

  let cleanup = [];
  function onLeave(fn) { cleanup.push(fn); }
  window.TM.onLeave = onLeave;

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }
  window.TM.go = go;

  function render() {
    cleanup.forEach((fn) => { try { fn(); } catch (_) {} });
    cleanup = [];

    /* Overlays (plate viewer, search) live on <body>, not inside the view, so
       a route change would otherwise leave one stranded over the new page. */
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    document.body.style.overflow = '';

    const h = location.hash || '#/contents';
    const m = h.match(/^#\/ch\/(.+)$/);
    let view, title = 'Terra Mobilis';

    if (!topic) {
      view = el('div', 'view');
      view.appendChild(el('h1', 'tm-h', 'No topic loaded'));
      view.appendChild(el('p', null,
        'This atlas has no content file registered. See ADDING_A_TOPIC.md.'));
    } else if (m) {
      const ch = chapterById(decodeURIComponent(m[1]));
      view = viewChapter(decodeURIComponent(m[1]));
      if (ch) title = ch.title + ' · Terra Mobilis';
    } else if (h === '#/plates') {
      view = window.TM_PLATES.gallery();
      title = 'The Plate Room · Terra Mobilis';
    } else if (h === '#/bank') {
      view = window.TM_FOLIO.bankView();
      title = 'Data Bank · Terra Mobilis';
    } else if (h === '#/folio') {
      view = window.TM_FOLIO.folioView();
      title = "The Examiner's Folio · Terra Mobilis";
    } else {
      view = viewContents();
      title = 'Terra Mobilis — Plate Tectonics · CCEA A2 Geography';
    }

    document.title = title;
    main.innerHTML = '';
    main.appendChild(view);
    refreshChrome();
    window.scrollTo({ top: 0, behavior: 'instant' });
    const h1 = main.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }

  window.addEventListener('hashchange', render);

  /* ---------- masthead wiring ---------- */

  document.getElementById('mh-brand').addEventListener('click', () => go('#/contents'));
  const toggle = document.getElementById('mh-toggle');
  const tools = document.getElementById('mh-tools');
  toggle.addEventListener('click', () => {
    const open = tools.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  tools.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tool]');
    if (!btn) return;
    tools.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    const t = btn.dataset.tool;
    if (t === 'search') openSearch();
    else go('#/' + t);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test((e.target.tagName || ''))) {
      e.preventDefault(); openSearch();
    }
  });

  render();
})();
