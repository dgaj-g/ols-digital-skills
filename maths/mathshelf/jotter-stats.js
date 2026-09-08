/* MathShelf — jotter-stats.js
   window.GJ_JOTTER_STATS: the Handling Data question renderers.

   One mount() per question, dispatched from jotter.js. Everything a pupil
   builds here — an ordered row, a running total, a set of plotted points, a
   curve, a read-off, a box plot, a comparison, a judgement — is built by
   pressing, never by free typing, and nothing is judged until she presses the
   Check. The marking is GJ_STATS.check's, one row per marking unit.

   The laws this file is written to (each is measured by a gate):
   - PLACE ALL, THEN CHECK. Wrong placements are accepted silently and stay
     movable; nothing snaps back; the true positions are drawn only after the
     question locks, as hollow targets.
   - A PLACED THING SURVIVES A SINGLE PRESS. The first press on placed work
     SELECTS it and says so; the second press puts it back.
   - EVERY TRAY IS A DERANGEMENT of the answer order, on every mount.
   - EVERY STAGE SAYS WHICH ONE IT IS (data-stage), and the list of stages the
     kind can show is on the root (data-stages), so a walk can stand on all of
     them and coverage can derive a cell per stage.
   - A DISABLED CHECK SAYS WHAT IT IS WAITING FOR (data-locked-why), and where
     a hint is shown, the hint IS that sentence, rendered once.
   - NOTHING THAT IS READ IS FADED, and no sentence lives in this file: every
     one comes from GJ_STRINGS.pupil or the pack.
*/
(function () {
  'use strict';

  var KINDS = ['qlist', 'cftable', 'cfplot', 'cfread', 'boxplot', 'compare', 'judge', 'values'];
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function T() { return (window.GJ_STRINGS && window.GJ_STRINGS.pupil) || {}; }
  function fill(s, o) {
    var f = window.GJ_STRINGS && window.GJ_STRINGS.fill;
    return f ? f(s, o) : String(s == null ? '' : s);
  }
  /* the helpers jotter.js exports — resolved at call time so load order in
     index.html is the only contract between the two files */
  function H() { return window.GJ_JOTTER || {}; }
  function el(t, c, h) { return H().el(t, c, h); }
  function esc(s) { return H().esc(s); }
  function drawMark(holder, kind) { return H().drawMark(holder, kind); }
  function commentFor(qid, bucket, kind) { return H().commentFor(qid, bucket, kind); }
  function makeNumPad(host, opts) { return H().makeNumPad(host, opts); }
  function setLockedWhy(node, why) { return H().setLockedWhy(node, why); }
  function tagQuestionRoot(wrap, q, hooks) { return H().tagQuestionRoot(wrap, q, hooks); }
  function shuffle(arr, seed) { return H().shuffle(arr, seed); }

  function handles(kind) { return KINDS.indexOf(kind) > -1; }

  /* ── the stages each kind can show, in order (DESIGN 4.0) ───────────── */
  var STAGES = {
    qlist: ['tray', 'ordering', 'selected', 'ordered', 'picking', 'cut-committed', 'iqr', 'ready'],
    cftable: ['empty', 'filling', 'ready'],
    /* a point is SELECTED the moment it is placed (that is what lets her nudge
       it), so "some points, nothing selected" is not a board this kind shows */
    cfplot: ['empty', 'selected', 'placed', 'joined'],
    cfread: ['parked', 'sliding', 'committed', 'at-x', 'iqr', 'ready'],
    boxplot: ['tray', 'marker-selected', 'placing', 'placed', 'drawn'],
    compare: ['empty', 'building', 'ready'],
    judge: ['empty', 'judging', 'reason-open', 'ready'],
    values: ['empty', 'filling', 'ready']
  };
  /* WHAT THIS QUESTION CAN ACTUALLY SHOW. The kind's list above is every board
     the kind HAS; a particular question shows only the ones its own data
     reaches - a reading question with one ask never sits at "committed", a
     judge question whose every claim is a three-way choice never opens a
     reason picker - and declaring a board that cannot happen would have the
     coverage matrix demand a screen nobody can stand on. */
  function stagesFor(q) {
    var own = (STAGES[q.kind] || []).slice();
    function drop(name) { var i = own.indexOf(name); if (i > -1) own.splice(i, 1); }
    if (q.kind === 'qlist') {
      var cuts = (q.ask || ['Q1', 'Q2', 'Q3', 'IQR']).filter(function (a) { return a !== 'IQR'; });
      if (!cuts.length) {
        drop('picking'); drop('cut-committed');
        /* with no cuts to mark, the pad opens the moment the last value lands:
           "the row complete and nothing else yet" is not a board that happens */
        drop('ordered');
      }
      else if (cuts.length < 2) drop('cut-committed');
      if ((q.ask || []).indexOf('IQR') === -1) drop('iqr');
    }
    if (q.kind === 'cfread') {
      /* IN THE ORDER SHE MEETS THEM. A reading question's boards are its own
         asks, one after another - the rule sliding, a value keyed, a rule
         moved across - so the list is built from `ask` rather than from the
         kind's general order, or the walk would go looking for a board three
         asks further on than the one she is sitting at. */
      var asks = q.ask || [];
      /* a question that opens on a read AT a value never parks the rule on the
         frequency axis: the vertical rule is the tool from the first moment */
      var firstIsAtX = asks[0] && asks[0].type === 'atX';
      var out = firstIsAtX ? [] : ['parked'], seenRead = 0;
      asks.forEach(function (a, i) {
        if (a === 'IQR') { if (out.indexOf('iqr') === -1) out.push('iqr'); }
        else if (a && a.type === 'atX') { if (out.indexOf('at-x') === -1) out.push('at-x'); }
        else {
          if (out.indexOf('sliding') === -1) out.push('sliding');
          seenRead++;
          /* a committed reading is a board of its own only when another
             READING follows it - otherwise the next ask's own board is what
             she is looking at the moment she commits */
          if (seenRead > 1 && out.indexOf('committed') === -1) out.splice(out.indexOf('sliding') + 1, 0, 'committed');
        }
      });
      out.push('ready');
      own = out;
    }
    if (q.kind === 'values') {
      var slotCount = (q.order || (q.slots || [])).length;
      if (slotCount < 2) drop('filling');
    }
    if (q.kind === 'judge') {
      var claims = q.claims || [];
      var anyReason = claims.some(function (c) { return !c.options && c.fair === false; });
      if (!anyReason) drop('reason-open');
      /* "judging" - a claim decided and nothing else open - is only a board of
         its own when some claim does NOT open a reason picker the moment it is
         pressed; where every claim is a not-fair one, the reason picker is
         what she sees and "judging" never happens */
      var everyClaimAsksWhy = claims.length > 0 &&
        claims.every(function (c) { return !c.options && c.fair === false; });
      if (everyClaimAsksWhy) drop('judging');
      /* IN THE ORDER SHE MEETS THEM. When the FIRST claim is one she has to
         give a reason for, the reason picker is the board she sees before any
         "some judged, nothing open" board exists. */
      else if (claims[0] && !claims[0].options && claims[0].fair === false) {
        var iJ = own.indexOf('judging'), iR = own.indexOf('reason-open');
        if (iJ > -1 && iR > -1) { own[iJ] = 'reason-open'; own[iR] = 'judging'; }
      }
    }
    if (q.kind === 'boxplot' && q.from) {
      var first = q.from === 'curve' ? 'cfread' : q.from;
      var stageQ = {}, k;
      for (k in q) if (q.hasOwnProperty(k) && k !== 'kind' && k !== 'from') stageQ[k] = q[k];
      stageQ.kind = first;
      var pre = stagesFor(stageQ).map(function (s2) { return first + ':' + s2; });
      return pre.concat(own);
    }
    return own;
  }

  /* ── the Check button's label and the sentence it waits with ────────── */
  var CHECK_LABEL = {
    qlist: 'statCheckQlist', cftable: 'statCheckCftable', cfplot: 'statCheckCfplot',
    cfread: 'statCheckCfread', boxplot: 'statCheckBoxplot', compare: 'statCheckCompare',
    judge: 'statCheckJudge', values: 'statCheckValues'
  };

  /* ── derangement: a tray never comes out in the answer order ────────── */
  /* `items` are objects; `key` returns the value the ANSWER order is written
     in. A derangement is the strong form of the law: no item may sit in the
     position the answer would put it in. */
  function derange(items, answerKeys, key, seed) {
    if (items.length < 2) return items.slice();
    function inPlace(list) {
      var hits = [];
      for (var k = 0; k < list.length; k++) {
        if (answerKeys[k] !== undefined && key(list[k]) === answerKeys[k]) hits.push(k);
      }
      return hits;
    }
    var out = shuffle(items, seed), tries;
    /* A SHUFFLE, THEN A REPAIR. A list with four equal values (three nines and
       a nine, in one of Colette's own puzzle-time lists) has four positions the
       answer order would accept, so a random shuffle keeps landing on one and
       sixty more shuffles do not help. So: shuffle once, then walk the
       positions that DID land in the answer order and swap each with a
       position where neither item would then be in place. That finds a
       derangement whenever one exists, and never ships the answer order. */
    for (tries = 0; tries < 8; tries++) {
      var hits = inPlace(out);
      if (!hits.length) return out;
      var moved = false;
      for (var h = 0; h < hits.length; h++) {
        var i = hits[h];
        for (var j = 0; j < out.length; j++) {
          if (j === i) continue;
          var a = out[i], b = out[j];
          if (answerKeys[j] !== undefined && key(a) === answerKeys[j]) continue;
          if (answerKeys[i] !== undefined && key(b) === answerKeys[i]) continue;
          out[i] = b; out[j] = a; moved = true;
          break;
        }
      }
      if (!moved) break;
    }
    /* every arrangement leaves at least one item where the answer would put it
       (a tray of two equal values, say): the shuffle stands, never the answer
       order, and the gate will say so rather than this pretending otherwise */
    return out;
  }
  function ascendingKeys(values) {
    return values.slice().sort(function (a, b) { return Number(a) - Number(b); });
  }

  /* A PRESS ANYWHERE ELSE CLEARS THE SELECTION, and it has to be heard on the
     DOCUMENT, not on the question's own body: the press that clears it may
     land anywhere on the page, and the placed-work audit clears its own
     selection by clicking document.body. Heard only on the question body, that
     clearing never arrived - so the audit's NEXT press landed on a tile this
     file still thought was selected, and the second press of a two-press put
     it back. One listener for the whole page, holding whichever question owns
     the live selection. */
  var SELECTED_CTX = null;
  var CLEAR_INSTALLED = false;
  function installClear() {
    if (CLEAR_INSTALLED || typeof document === 'undefined') return;
    CLEAR_INSTALLED = true;
    document.addEventListener('click', function () {
      if (SELECTED_CTX) SELECTED_CTX.clearSelection();
    });
  }

  /* ── two-press on placed work (Part 8.1) ────────────────────────────── */
  /* The first press SELECTS and says so beside the thing; the second press
     puts it back; a press anywhere else clears the selection. A single press
     never destroys placed work. */
  function twoPress(ctx, node, onReturn) {
    installClear();
    node.setAttribute('data-placed', '');
    node.addEventListener('click', function (e) {
      if (ctx.locked()) return;
      e.stopPropagation();
      if (ctx.selected === node) {
        ctx.clearSelection();
        onReturn();
        return;
      }
      ctx.clearSelection();
      ctx.selected = node;
      SELECTED_CTX = ctx;
      node.classList.add('is-selected');
      /* aria-CURRENT: this is the item she has picked up, not an answer she
         has pressed - the consequence law watches aria-pressed for the latter */
      node.setAttribute('aria-current', 'true');
      ctx.say(T().statPutBack);
      ctx.setStage(ctx.selectedStage || 'selected');
    });
  }

  /* a named fiction gets ONE plain-words line where the pupil meets it, in
     its own element, so it never competes with the stage instruction */
  function fictionLine(ctx, text) {
    if (ctx.body.querySelector('[data-fiction]')) return;
    var p = el('p', 'ui-msg stat-fiction', null);
    p.setAttribute('data-fiction', '');
    p.textContent = text;
    ctx.boardHost.parentNode.insertBefore(p, ctx.boardHost);
  }

  /* ── the shared question frame ──────────────────────────────────────── */

  function mount(host, q, savedRec, hooks) {
    var rec = savedRec || { att: [], lock: false, ovr: null };
    if (!rec.att) rec.att = [];
    var t0 = Date.now();

    var wrap = el('div', 'jotter-q stat-q');
    wrap.id = 'jq-' + q.id;
    tagQuestionRoot(wrap, q, hooks);
    var stages = stagesFor(q);
    wrap.setAttribute('data-stages', stages.join(' '));
    wrap.setAttribute('data-stage', stages[0]);

    var margin = el('div', 'jq-margin', 'Q' + hooks.number);
    margin.setAttribute('data-mark', '');
    var body = el('div', 'jq-body');
    body.setAttribute('data-work', '');
    wrap.appendChild(margin); wrap.appendChild(body);
    host.appendChild(wrap);

    var marksTotal = (q.marks[0] || 0) + (q.marks[1] || 0);
    body.appendChild(el('p', 'jq-prompt',
      esc(q.prompt) + ' <span class="q-marks">[' + marksTotal + (marksTotal === 1 ? ' mark' : ' marks') + ']</span>'));

    /* the one live message slot: a stage instruction REPLACES the last one
       rather than stacking, so no question ever says the same thing twice */
    var msg = el('p', 'ui-msg stat-msg');
    body.appendChild(msg);

    var ghost = el('div', 'stat-ghost');           /* attempt 1, struck through */
    body.appendChild(ghost);

    var boardHost = el('div', 'stat-boards');
    body.appendChild(boardHost);

    var unitsHost = el('div', 'stat-units');       /* the marked rows, after Check */
    body.appendChild(unitsHost);

    var dock = el('div', 'dock stat-dock');
    window.GJ.surface(dock, 'dock', 'tray');
    body.appendChild(dock);

    var checkRow = el('div', 'check-row');
    var checkBtn = el('button', 'btn-stamp', T()[CHECK_LABEL[q.kind]] || T().statCheckValues);
    checkBtn.type = 'button';
    checkBtn.disabled = true;
    checkRow.appendChild(checkBtn);
    body.appendChild(checkRow);

    var feedback = el('div', 'jq-feedback');
    body.appendChild(feedback);

    var ctx = {
      q: q, hooks: hooks, wrap: wrap, body: body, boardHost: boardHost,
      dock: dock, msg: msg, selected: null, selectedStage: null,
      locked: function () { return !!rec.lock; },
      clearSelection: function () {
        if (SELECTED_CTX === ctx) SELECTED_CTX = null;
        if (!ctx.selected) return;
        ctx.selected.classList.remove('is-selected');
        ctx.selected.removeAttribute('aria-current');
        ctx.selected = null;
      },
      say: function (text) { msg.textContent = text || ''; },
      setStage: function (s) { if (stages.indexOf(s) > -1) wrap.setAttribute('data-stage', s); },
      changed: function () { onChange(); }
    };
    body.addEventListener('click', function () { ctx.clearSelection(); });

    var kind = BUILD[q.kind](ctx);

    /* ── the open attempt, so a reload lands on resume-mid ───────────── */
    var saveTimer = null;
    function saveOpen() {
      if (rec.lock) return;
      var open = { S: kind.state(), t0: t0 };
      var fresh = !(rec.att.length && !rec.att[rec.att.length - 1].res);
      if (fresh) rec.att.push(open); else rec.att[rec.att.length - 1] = open;
      /* THE FIRST MARK ON A BOARD IS SAVED AT ONCE. Everything after it is on a
         400 ms debounce so a run of presses is not a run of requests - but if
         the very first press waits too, a pupil whose Chromebook drops out
         between placing her first value and her second comes back to a blank
         board, and the app has no record that she ever started. It is also why
         a reload before Check drew "fresh" and never "resume-mid". */
      if (saveTimer) clearTimeout(saveTimer);
      if (fresh) { hooks.onSave(q.id, rec); return; }
      saveTimer = setTimeout(function () { hooks.onSave(q.id, rec); }, 400);
    }
    var settling = false;      /* true while a verdict is being drawn */
    function onChange() {
      if (rec.lock || settling) return;
      var r = kind.ready();
      checkBtn.disabled = !r.ok;
      setLockedWhy(checkBtn, r.ok ? null : r.why);
      /* WHICH BOARD SHE IS LOOKING AT IS THE KIND'S OWN BUSINESS. This used to
         stamp the last stage the moment the Check lit, which wrote "ready" over
         "filling" on the first cell of a table and made every board between
         them unreachable - and a stage nothing can stand on is a coverage cell
         nothing can close. */
      window.GJ.setState(wrap, 'question', 'mid-attempt');
      saveOpen();
    }

    /* ── the verdict ─────────────────────────────────────────────────── */
    function renderUnits(verdict, holder) {
      holder.innerHTML = '';
      verdict.perLine.forEach(function (u) {
        var row = el('div', 'stat-unit');
        var mk = el('span', 'wl-mark');
        mk.setAttribute('data-mark', '');
        row.appendChild(mk);
        drawMark(mk, u.ok === 1 ? 'tick' : u.ok === 2 ? 'tick-hollow' : 'cross');
        row.appendChild(el('span', 'stat-unit-label', esc(u.label)));
        if (u.note) row.appendChild(el('span', 'stat-unit-note', esc(u.note)));
        holder.appendChild(row);
      });
    }
    function finish(att, instant) {
      var verdict = window.GJ_STATS.check(q, att, packRules());
      var right = verdict.res === 'OK';
      feedback.innerHTML = '';
      renderUnits(verdict, unitsHost);

      /* A BAND WORTH NOTHING IS NOT SHOWN. "Reasons 0/0" is a line a pupil has
         to read and then discard; a question that pays no method mark simply
         has no method line. */
      var bands = [];
      /* "3 of 3", not "3/3": a slash between two numbers on a maths screen is
         read once as a fraction before it is read as a score (the separated
         read, 8 Sept 2026). The engine says which form its book wants. */
      var sep = verdict.mkOf ? ' of ' : '/';
      if (verdict.mkMax[0] > 0) bands.push(esc(verdict.mkLabels[0]) + ' ' + verdict.mk[0] + sep + verdict.mkMax[0]);
      if (verdict.mkMax[1] > 0) bands.push(esc(verdict.mkLabels[1]) + ' ' + verdict.mk[1] + sep + verdict.mkMax[1]);
      var tally = el('div', 'mk-tally ' + (right ? 'mk-correct' : 'mk-wrong'), bands.join(' · '));
      tally.setAttribute('data-mark', '');
      feedback.appendChild(tally);

      if (rec.lock) {
        settling = true;
        window.GJ.setState(wrap, 'question',
          right ? 'checked-right' : (rec.att.length >= 2 ? 'checked-wrong-2' : 'checked-wrong-1'));
        var comment = el('p', 'mk-comment ' + (right ? 'mk-correct' : 'mk-wrong'),
          commentFor(q.id, right ? 'perfect' : 'fail', commentKind(q.kind)));
        comment.setAttribute('data-mark', '');
        feedback.appendChild(comment);
        margin.innerHTML = 'Q' + hooks.number + '<div class="mk-tally ' +
          (right ? 'mk-correct' : 'mk-wrong') + '" data-mark style="font-size:18px">' +
          (verdict.mk[0] + verdict.mk[1]) + '/' + (verdict.mkMax[0] + verdict.mkMax[1]) + '</div>';
        checkRow.hidden = true;
        kind.lock(verdict);
        /* the truth appears ONLY now, and never before */
        try { if (kind.showTruth) kind.showTruth(); } finally { settling = false; }
        ctx.say('');
      } else if (!instant) {
        /* THE VERDICT IS THE STATE. Building the fresh board for her second go
           runs the kind's own change handler, which would stamp "mid-attempt"
           over the verdict that has just been drawn - so the state is set once
           the board is settled, and the handler is held while it settles. */
        settling = true;
        try {
          kind.reset();
          if (kind.ghost) kind.ghost(ghost, att);
        } finally {
          /* WHATEVER HAPPENS, THE BOARD COMES BACK TO LIFE. The flag that
             holds the change handler while a verdict is drawn must be cleared
             even if drawing the struck first attempt throws - otherwise her
             second go is on a board that has stopped listening, and the Check
             never lights again. */
          settling = false;
        }
        window.GJ.setState(wrap, 'question', 'checked-wrong-1');
        checkBtn.disabled = true;
        setLockedWhy(checkBtn, kind.ready().why);
        ctx.say(T().statTryAgain);
        wrap.setAttribute('data-stage', stages[0]);
      }
      if (!instant) {
        var fr = feedback.getBoundingClientRect();
        if (fr.bottom > window.innerHeight || fr.top < 0) {
          feedback.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
        }
      }
      return verdict;
    }
    function packRules() {
      var pack = window.GJ_CONTENT && window.GJ_CONTENT[hooks.actId];
      return (pack && pack.rules) || null;
    }

    checkBtn.addEventListener('click', function () {
      if (rec.lock || checkBtn.disabled) return;
      var att = { S: kind.state(), dur: Math.round((Date.now() - t0) / 1000) };
      var verdict = window.GJ_STATS.check(q, att, packRules());
      att.res = verdict.res;
      if (rec.att.length && !rec.att[rec.att.length - 1].res) rec.att[rec.att.length - 1] = att;
      else rec.att.push(att);
      if (verdict.res === 'OK' || rec.att.length >= 2) rec.lock = true;
      finish(att);
      hooks.onSave(q.id, rec);
      checkBtn.disabled = true;
    });

    /* ── restore ─────────────────────────────────────────────────────── */
    if (rec.lock && rec.att.length) {
      window.GJ.setState(wrap, 'question', 'locked-restore');
      var finalAtt = rec.att[rec.att.length - 1];
      kind.restore(finalAtt.S);
      if (rec.att.length > 1 && kind.ghost) kind.ghost(ghost, rec.att[0]);
      finish(finalAtt, true);
      setLockedWhy(checkBtn, T().statAlreadyMarked);
    } else if (rec.att.length && !rec.att[rec.att.length - 1].res) {
      window.GJ.setState(wrap, 'question', 'resume-mid');
      kind.restore(rec.att[rec.att.length - 1].S);
      onChange();
    } else {
      kind.start();
      var r0 = kind.ready();
      setLockedWhy(checkBtn, r0.why);
    }

    /* ── the drive channel (preview tier only, exactly as GJ.app.__state) ─
       A GETTER, not a snapshot: her second attempt is drawn on a NEW board, and
       a handle taken once at mount goes on answering questions about the board
       she has finished with - which is how a walk came to believe every point
       was already placed and press nothing. */
    if (!window.OLS_TRANSPORT && kind.board) {
      Object.defineProperty(wrap, '__statBoard', { get: function () { return kind.board(); }, configurable: true });
    }

    return { qid: q.id };
  }

  /* WHAT SHE ACTUALLY DID. A comment bank keyed by kind is the whole of rule 9:
     a pupil who put seven numbers in order must never be told her curve was
     smooth, and one who filled a table must never be praised for her points. */
  function commentKind(kind) {
    if (kind === 'cfplot') return 'plot';
    if (kind === 'cfread') return 'read';
    if (kind === 'boxplot' || kind === 'compare') return 'box';
    if (kind === 'judge') return 'judge';
    if (kind === 'qlist') return 'order';
    if (kind === 'cftable') return 'table';
    return 'values';
  }

  var BUILD = {};

  /* ══ qlist — order the list, mark the cuts, work out the IQR ═════════ */

  BUILD.qlist = function (ctx) {
    var q = ctx.q;
    var asks = (q.ask || ['Q1', 'Q2', 'Q3', 'IQR']).slice();
    var cuts = asks.filter(function (a) { return a !== 'IQR'; });
    var wantsIqr = asks.indexOf('IQR') > -1;

    var trayWrap = el('div', 'stat-tray');
    var trayId = 'qlist-tiles-' + q.id;
    trayWrap.setAttribute('data-tray', trayId);
    var rowWrap = el('div', 'stat-row');
    rowWrap.setAttribute('data-tray-row', '');
    var readout = el('div', 'stat-readout');
    readout.setAttribute('data-board-label', '');
    var lines = el('div', 'wlines stat-lines');
    ctx.boardHost.appendChild(trayWrap);
    ctx.boardHost.appendChild(rowWrap);
    ctx.boardHost.appendChild(readout);
    ctx.boardHost.appendChild(lines);

    var order = [];              /* original indices, in the pupil's row order */
    var picks = {};              /* cut -> [row positions] */
    var iqr = '';
    var pending = [];            /* the row positions pressed for the open cut */
    var cutIdx = 0;              /* which of `cuts` is being asked */
    var pad = null;
    var committed = [];          /* for ↶ remove last */

    function values() { return q.values || []; }
    function rowVal(p) { return values()[order[p]]; }

    function renderTray() {
      trayWrap.innerHTML = '';
      var left = [];
      values().forEach(function (v, i) { if (order.indexOf(i) === -1) left.push({ v: v, i: i }); });
      var answerKeys = ascendingKeys(values());
      var laid = derange(left, answerKeys, function (o) { return o.v; }, q.id);
      laid.forEach(function (o) {
        var b = el('button', 'stat-tile');
        b.type = 'button';
        b.textContent = String(o.v);
        b.setAttribute('data-tray-item', '');
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked()) return;
          ctx.clearSelection();
          order.push(o.i);
          /* the stage BEFORE the render, so the dock - which knows whether the
             next board is the cuts, the pad or the finished row - has the last
             word rather than being overwritten by this line */
          ctx.setStage(order.length === values().length ? 'ordered' : 'ordering');
          render();
          ctx.changed();
        });
        trayWrap.appendChild(b);
      });
    }
    function renderRow() {
      rowWrap.innerHTML = '';
      order.forEach(function (vi, p) {
        var b = el('button', 'stat-tile stat-tile-placed');
        b.type = 'button';
        b.textContent = String(values()[vi]);
        b.setAttribute('data-row-pos', String(p));
        if (pending.indexOf(p) > -1) b.classList.add('is-picked');
        if (usedPositions().indexOf(p) > -1) b.classList.add('is-cut');
        if (stageIsPicking()) {
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (ctx.locked()) return;
            pressForCut(p);
          });
          b.setAttribute('data-placed', '');
        } else {
          ctx.selectedStage = 'selected';
          twoPress(ctx, b, function () {
            order.splice(p, 1);
            render();
            ctx.setStage(order.length ? 'ordering' : 'tray');
            ctx.changed();
          });
        }
        rowWrap.appendChild(b);
      });
      var undo = el('button', 'btn-quiet stat-undo', T().statRemoveLast);
      undo.type = 'button';
      undo.hidden = !(order.length || committed.length);
      undo.addEventListener('click', function (e) {
        e.stopPropagation();
        if (ctx.locked()) return;
        if (committed.length) {
          var last = committed.pop();
          if (last === 'IQR') { iqr = ''; } else { delete picks[last]; cutIdx = Math.max(0, cutIdx - 1); }
        } else if (order.length) {
          order.pop();
        }
        pending = [];
        render();
        ctx.changed();
      });
      rowWrap.appendChild(undo);
    }
    function usedPositions() {
      var out = [];
      Object.keys(picks).forEach(function (k) { out = out.concat(picks[k]); });
      return out;
    }
    function stageIsPicking() { return order.length === values().length && cutIdx < cuts.length; }
    function pressForCut(p) {
      if (pending.length === 1 && Math.abs(pending[0] - p) === 1) pending = [Math.min(pending[0], p), Math.max(pending[0], p)];
      else if (pending.length === 1 && pending[0] === p) pending = [];
      else pending = [p];
      ctx.setStage('picking');
      render();
      ctx.changed();
    }
    function renderReadout() {
      readout.textContent = '';
      if (!stageIsPicking() || !pending.length) return;
      var name = cuts[cutIdx];
      if (pending.length === 1) {
        readout.textContent = fill(T().statPickOne, { name: cutName(name), value: rowVal(pending[0]) });
      } else {
        var a = rowVal(pending[0]), b = rowVal(pending[1]);
        readout.textContent = fill(T().statPickPair,
          { name: cutName(name), a: a, b: b, value: fmt((Number(a) + Number(b)) / 2) });
      }
    }
    function fmt(x) { return String(Math.round(x * 1000) / 1000); }
    function cutName(c) {
      var m = { Q1: T().statLowerQuartile, Q2: T().statMedian, Q3: T().statUpperQuartile, IQR: T().statIqr };
      return m[c] || c;
    }
    function renderDock() {
      ctx.dock.innerHTML = '';
      pad = null;
      if (order.length < values().length) {
        window.GJ.setState(ctx.dock, 'dock', 'tray');
        ctx.say(T().statQlistOrder);
        return;
      }
      if (cutIdx < cuts.length) {
        window.GJ.setState(ctx.dock, 'dock', 'chips');
        ctx.say(fill(T().statQlistPick, { name: cutName(cuts[cutIdx]) }));
        var commit = el('button', 'btn-quiet', fill(T().statQlistCommit, { name: cutName(cuts[cutIdx]) }));
        commit.type = 'button';
        commit.disabled = !pending.length;
        if (!pending.length) setLockedWhy(commit, T().statQlistCommitWhy);
        commit.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked() || !pending.length) return;
          picks[cuts[cutIdx]] = pending.slice();
          committed.push(cuts[cutIdx]);
          writeLine(cuts[cutIdx]);
          pending = [];
          cutIdx++;
          ctx.setStage('cut-committed');
          render();
          ctx.changed();
        });
        ctx.dock.appendChild(commit);
        return;
      }
      if (wantsIqr) {
        window.GJ.setState(ctx.dock, 'dock', 'numpad-fraction');
        /* the last board: the pad is open and, once a value is in it, the
           Check is lit and she is ready */
        ctx.setStage(iqr ? 'ready' : 'iqr');
        ctx.say(T().statQlistIqr);
        pad = makeNumPad(ctx.dock, {
          label: T().statIqr, fraction: true, decimal: true,
          onChange: function (v) { iqr = v; ctx.setStage(v ? 'ready' : 'iqr'); ctx.changed(); }
        });
        pad.set(iqr);
        return;
      }
      window.GJ.setState(ctx.dock, 'dock', 'chips');
      ctx.setStage('ready');
    }
    function writeLine(cut) {
      var row = el('div', 'wline stat-wline');
      row.setAttribute('data-placed', '');
      var p = picks[cut];
      row.textContent = p.length === 1
        ? fill(T().statLineOne, { name: cutName(cut), value: rowVal(p[0]) })
        : fill(T().statLinePair, { name: cutName(cut), a: rowVal(p[0]), b: rowVal(p[1]),
            value: fmt((Number(rowVal(p[0])) + Number(rowVal(p[1]))) / 2) });
      lines.appendChild(row);
    }
    function render() { renderTray(); renderRow(); renderReadout(); renderDock(); }

    return {
      start: function () { render(); ctx.say(T().statQlistOrder); },
      reset: function () { order = []; picks = {}; pending = []; iqr = ''; cutIdx = 0; committed = []; lines.innerHTML = ''; render(); },
      restore: function (S) {
        S = S || {};
        order = (S.order || []).slice();
        picks = S.picks || {};
        iqr = S.iqr || '';
        cutIdx = cuts.filter(function (c) { return picks[c]; }).length;
        committed = cuts.filter(function (c) { return picks[c]; });
        lines.innerHTML = '';
        committed.forEach(writeLine);
        render();
      },
      state: function () { return { order: order.slice(), picks: picks, iqr: iqr }; },
      ready: function () {
        if (order.length < values().length) return { ok: false, why: T().statQlistOrderWhy };
        if (cutIdx < cuts.length) return { ok: false, why: T().statQlistPickWhy };
        if (wantsIqr && !iqr) return { ok: false, why: T().statQlistIqrWhy };
        return { ok: true };
      },
      lock: function () {
        ctx.dock.innerHTML = '';
        rowWrap.querySelectorAll('button').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
        trayWrap.querySelectorAll('button').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
      },
      showTruth: function () {
        var truth = window.GJ_STATS.quartiles(values(), (packRulesOf(ctx) || {}).quartileRule || 'n+1');
        if (!truth) return;
        var box = el('div', 'stat-truth');
        box.setAttribute('data-truth', '');
        box.textContent = fill(T().statQlistTruth, {
          list: truth.sorted.map(function (r) { return window.GJ.app.fmtRat ? window.GJ.app.fmtRat(r) : (r.n / r.d); }).join(', ')
        });
        ctx.boardHost.appendChild(box);
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var g = el('div', 'stat-row struck');
        ((att.S && att.S.order) || []).forEach(function (vi) {
          var t = el('span', 'stat-tile');
          t.textContent = String(values()[vi]);
          g.appendChild(t);
        });
        holder.appendChild(g);
      }
    };
  };

  function packRulesOf(ctx) {
    var pack = window.GJ_CONTENT && window.GJ_CONTENT[ctx.hooks.actId];
    return (pack && pack.rules) || null;
  }

  /* ══ cftable — fill the cumulative frequency column ══════════════════ */

  BUILD.cftable = function (ctx) {
    var q = ctx.q;
    var classes = q.classes || [];
    var pre = q.prefill || [];
    var truth = window.GJ_STATS.cumulate(classes);
    var cf = classes.map(function (c, i) { return pre.indexOf(i) > -1 ? String(truth[i]) : ''; });
    var open = -1, pad = null;

    var table = el('table', 'stat-table');
    ctx.boardHost.appendChild(table);

    function classText(c) {
      return c.text || (c.lo + ' < ' + (q.symbol || 'x') + ' ≤ ' + c.hi);
    }
    /* A COLUMN WITH NO HEADING IS A COLUMN SHE HAS TO GUESS AT, and an empty
       <th> is a hole in the table the empty-elements audit rightly names. The
       pack's own wording first, then the chart's axis label, then the plain
       word. */
    function classHead() {
      return q.classHead || (q.chart && q.chart.x && q.chart.x.label) || T().statClassColumn;
    }
    function render() {
      stage();
      table.innerHTML = '';
      var thead = el('thead');
      var hr = el('tr');
      hr.appendChild(el('th', null, esc(classHead())));
      hr.appendChild(el('th', null, esc(T().statFrequency)));
      hr.appendChild(el('th', null, esc(T().statCumulativeFrequency)));
      thead.appendChild(hr); table.appendChild(thead);
      var tb = el('tbody');
      classes.forEach(function (c, i) {
        var tr = el('tr');
        tr.appendChild(el('td', null, esc(classText(c))));
        tr.appendChild(el('td', null, esc(String(c.f))));
        var td = el('td');
        if (pre.indexOf(i) > -1) {
          var fixed = el('span', 'stat-cell-fixed', esc(String(truth[i])));
          td.appendChild(fixed);
        } else {
          var b = el('button', 'stat-cell' + (open === i ? ' is-open' : ''));
          b.type = 'button';
          b.textContent = cf[i] || '';
          if (cf[i]) b.setAttribute('data-placed', '');
          b.setAttribute('aria-label', rowLabel(i));
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (ctx.locked()) return;
            open = i; render(); ctx.changed();
          });
          td.appendChild(b);
        }
        tr.appendChild(td);
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      renderDock();
    }
    function rowLabel(i) {
      return fill(T().statCftableRow, { value: classes[i].hi, unit: q.unit || '' });
    }
    function renderDock() {
      ctx.dock.innerHTML = '';
      pad = null;
      if (open < 0) {
        window.GJ.setState(ctx.dock, 'dock', 'chips');
        ctx.say(T().statCftableStart);
        return;
      }
      window.GJ.setState(ctx.dock, 'dock', 'numpad');
      ctx.say(rowLabel(open));
      pad = makeNumPad(ctx.dock, {
        label: rowLabel(open), decimal: true,
        onChange: function (v) { cf[open] = v; paint(); ctx.changed(); }
      });
      pad.set(cf[open] || '');
      var next = el('button', 'btn-quiet', T().statNextRow);
      next.type = 'button';
      next.addEventListener('click', function (e) {
        e.stopPropagation();
        var i = open + 1;
        while (i < classes.length && pre.indexOf(i) > -1) i++;
        open = i < classes.length ? i : -1;
        render();
      });
      ctx.dock.appendChild(next);
    }
    function stage() {
      var filled = 0, openRows = 0;
      classes.forEach(function (c, i) {
        if (pre.indexOf(i) > -1) return;
        openRows++;
        if (cf[i]) filled++;
      });
      ctx.setStage(!filled ? 'empty' : (filled < openRows ? 'filling' : 'ready'));
    }
    function paint() {
      stage();
      var cells = table.querySelectorAll('.stat-cell');
      var k = 0;
      classes.forEach(function (c, i) {
        if (pre.indexOf(i) > -1) return;
        var b = cells[k++];
        if (!b) return;
        b.textContent = cf[i] || '';
        if (cf[i]) b.setAttribute('data-placed', ''); else b.removeAttribute('data-placed');
      });
    }

    return {
      start: function () { render(); },
      reset: function () { cf = classes.map(function (c, i) { return pre.indexOf(i) > -1 ? String(truth[i]) : ''; }); open = -1; render(); },
      restore: function (S) { cf = ((S && S.cf) || cf).slice(); open = -1; render(); },
      state: function () { return { cf: cf.slice() }; },
      ready: function () {
        var any = classes.some(function (c, i) { return pre.indexOf(i) === -1 && cf[i]; });
        return any ? { ok: true } : { ok: false, why: T().statCftableWhy };
      },
      lock: function () {
        ctx.dock.innerHTML = '';
        table.querySelectorAll('button').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
      },
      showTruth: function () {
        var box = el('div', 'stat-truth');
        box.setAttribute('data-truth', '');
        box.textContent = fill(T().statCftableTruth, { list: truth.join(', ') });
        ctx.boardHost.appendChild(box);
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var g = el('div', 'stat-row struck');
        (((att.S || {}).cf) || []).forEach(function (v) {
          var t = el('span', 'stat-tile'); t.textContent = v || '—'; g.appendChild(t);
        });
        holder.appendChild(g);
      }
    };
  };

  /* ══ values — labelled number-pad slots ═════════════════════════════ */

  BUILD.values = function (ctx) {
    var q = ctx.q;
    var order = q.order || (q.slots || []).map(function (s) { return s.id; });
    var v = {}, open = -1, pad = null;
    var host = el('div', 'stat-slots');
    ctx.boardHost.appendChild(host);

    function slot(id) {
      var s = q.slots || [], i;
      for (i = 0; i < s.length; i++) if (s[i].id === id) return s[i];
      return { id: id, label: id };
    }
    function render() {
      stage();
      host.innerHTML = '';
      order.forEach(function (id, i) {
        var line = el('div', 'stat-slot');
        line.appendChild(el('span', 'stat-slot-label', esc(slot(id).label)));
        var b = el('button', 'stat-cell' + (open === i ? ' is-open' : ''));
        b.type = 'button';
        b.textContent = v[id] || '';
        if (v[id]) b.setAttribute('data-placed', '');
        b.setAttribute('aria-label', slot(id).label);
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked()) return;
          open = i; render(); ctx.changed();
        });
        line.appendChild(b);
        if (slot(id).unit) line.appendChild(el('span', 'stat-slot-unit', esc(slot(id).unit)));
        host.appendChild(line);
      });
      renderDock();
    }
    function renderDock() {
      ctx.dock.innerHTML = '';
      pad = null;
      if (open < 0) {
        window.GJ.setState(ctx.dock, 'dock', 'chips');
        ctx.say(T().statValuesStart);
        return;
      }
      var id = order[open];
      window.GJ.setState(ctx.dock, 'dock', 'numpad-fraction');
      ctx.say(slot(id).label);
      pad = makeNumPad(ctx.dock, {
        label: slot(id).label, fraction: true, decimal: true,
        onChange: function (val) { v[id] = val; paint(); ctx.changed(); }
      });
      pad.set(v[id] || '');
      if (open < order.length - 1) {
        var next = el('button', 'btn-quiet', T().statNextRow);
        next.type = 'button';
        next.addEventListener('click', function (e) { e.stopPropagation(); open++; render(); });
        ctx.dock.appendChild(next);
      }
    }
    function stage() {
      var filled = order.filter(function (id) { return !!v[id]; }).length;
      ctx.setStage(!filled ? 'empty' : (filled < order.length ? 'filling' : 'ready'));
    }
    function paint() {
      stage();
      var cells = host.querySelectorAll('.stat-cell');
      order.forEach(function (id, i) {
        if (!cells[i]) return;
        cells[i].textContent = v[id] || '';
        if (v[id]) cells[i].setAttribute('data-placed', ''); else cells[i].removeAttribute('data-placed');
      });
    }

    return {
      start: function () { render(); },
      reset: function () { v = {}; open = -1; render(); },
      restore: function (S) { v = (S && S.v) || {}; open = -1; render(); },
      state: function () { return { v: v }; },
      ready: function () {
        var any = order.some(function (id) { return !!v[id]; });
        return any ? { ok: true } : { ok: false, why: T().statValuesWhy };
      },
      lock: function () {
        ctx.dock.innerHTML = '';
        host.querySelectorAll('button').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
      },
      showTruth: function () {
        var box = el('div', 'stat-truth');
        box.setAttribute('data-truth', '');
        box.textContent = order.map(function (id) {
          var s = slot(id);
          var a = s.answer && s.answer.n !== undefined ? (s.answer.d === 1 ? s.answer.n : s.answer.n + '/' + s.answer.d) : '';
          return s.label + ' ' + a;
        }).join(' · ');
        ctx.boardHost.appendChild(box);
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var g = el('div', 'stat-row struck');
        order.forEach(function (id) {
          var t = el('span', 'stat-tile');
          t.textContent = ((att.S || {}).v || {})[id] || '—';
          g.appendChild(t);
        });
        holder.appendChild(g);
      }
    };
  };

  /* ══ the shared nudge pad (one small square a press) ═════════════════ */

  function nudgePad(ctx, opts) {
    var pad = el('div', 'nudge-pad');
    pad.setAttribute('role', 'group');
    pad.setAttribute('aria-label', T().statNudgeLabel);
    [['◀', -1, 0, T().statNudgeLeft], ['▲', 0, 1, T().statNudgeUp],
     ['▼', 0, -1, T().statNudgeDown], ['▶', 1, 0, T().statNudgeRight]].forEach(function (k) {
      if (opts.axis === 'y' && k[1] !== 0) return;
      if (opts.axis === 'x' && k[2] !== 0) return;
      var b = el('button', 'key');
      b.type = 'button';
      b.textContent = k[0];
      b.setAttribute('aria-label', k[3]);
      b.addEventListener('click', function (e) { e.stopPropagation(); if (!ctx.locked()) opts.onNudge(k[1], k[2]); });
      pad.appendChild(b);
    });
    if (opts.onRemove) {
      var x = el('button', 'key key-del');
      x.type = 'button';
      x.textContent = '✕';
      x.setAttribute('aria-label', T().statRemovePoint);
      x.addEventListener('click', function (e) { e.stopPropagation(); if (!ctx.locked()) opts.onRemove(); });
      pad.appendChild(x);
    }
    return pad;
  }

  /* ══ cfplot — plot the points, then join them ════════════════════════ */

  BUILD.cfplot = function (ctx) {
    var q = ctx.q;
    var rules = packRulesOf(ctx) || {};
    var startPoint = (q.startPoint === undefined) ? (rules.startPoint !== false) : q.startPoint;
    var maxPts = (q.classes || []).length + (startPoint ? 1 : 0);
    var joined = false, sel = -1, bd = null;

    var boardWrap = el('div', 'stat-board-host');
    boardWrap.setAttribute('data-work', '');
    ctx.boardHost.appendChild(boardWrap);
    var tableWrap = el('div', 'stat-given');
    ctx.boardHost.appendChild(tableWrap);

    function givenTable() {
      tableWrap.innerHTML = '';
      var t = el('table', 'stat-table');
      var hr = el('tr');
      hr.appendChild(el('th', null, esc(q.classHead || (q.chart && q.chart.x && q.chart.x.label) || T().statClassColumn)));
      hr.appendChild(el('th', null, esc(T().statFrequency)));
      hr.appendChild(el('th', null, esc(T().statCumulativeFrequency)));
      t.appendChild(hr);
      var cf = window.GJ_STATS.cumulate(q.classes || []);
      (q.classes || []).forEach(function (c, i2) {
        var tr = el('tr');
        tr.appendChild(el('td', null, esc(c.text || (c.lo + ' < ' + (q.symbol || 'x') + ' ≤ ' + c.hi))));
        tr.appendChild(el('td', null, esc(String(c.f))));
        tr.appendChild(el('td', null, esc(String(cf[i2]))));
        t.appendChild(tr);
      });
      tableWrap.appendChild(t);
    }
    function build() {
      boardWrap.innerHTML = '';
      bd = window.GJ_STATCHART.render(boardWrap, q.chart, {
        onGridTap: function (x, y) {
          if (ctx.locked()) return;
          if (bd.points().length >= maxPts) { ctx.say(T().statPlotEnough); return; }
          sel = bd.addPoint(x, y, { select: true });
          after();
        },
        onChange: function (evt) {
          if (!evt) return;
          if (evt.type === 'point-select') sel = evt.i;
          if (evt.type === 'point-move') sel = evt.i;
          after();
        }
      });
      if (bd.needsScroll()) ctx.say(T().statScrollGraph);
      after();
    }
    function after() {
      var n = bd.points().length;
      if (joined) bd.curveThrough('all');
      var selected = sel > -1 && bd.points()[sel];
      if (selected) {
        var p = bd.points()[sel];
        bd.readout(fill(T().statPointReadout, { x: p[0], y: p[1] }), p);
      } else bd.clearReadout();
      /* ONE ANSWER, not three overwriting each other */
      ctx.setStage(joined ? 'joined'
        : n >= maxPts ? 'placed'
        : selected ? 'selected'
        : n ? 'selected' : 'empty');
      renderDock();
      ctx.changed();
    }
    function renderDock() {
      ctx.dock.innerHTML = '';
      var n = bd.points().length;
      if (sel > -1 && bd.points()[sel]) {
        window.GJ.setState(ctx.dock, 'dock', 'nudge-pad');
        ctx.dock.appendChild(nudgePad(ctx, {
          onNudge: function (dx, dy) {
            var sq = (q.chart.sq || { x: 1, y: 1 });
            var p = bd.points()[sel];
            bd.movePoint(sel, p[0] + dx * sq.x, p[1] + dy * sq.y);
            if (joined) bd.curveThrough('all');
            after();
          },
          onRemove: function () {
            bd.removePoint(sel);
            sel = -1; joined = false; bd.clearCurve();
            after();
          }
        }));
      } else {
        window.GJ.setState(ctx.dock, 'dock', 'chips');
      }
      var join = el('button', 'btn-quiet stat-join', T().statJoinPoints);
      join.type = 'button';
      join.disabled = n < maxPts || joined;
      if (join.disabled) setLockedWhy(join, n < maxPts ? T().statPlotPlaceWhy : T().statPlotJoinedAlready);
      join.addEventListener('click', function (e) {
        e.stopPropagation();
        if (ctx.locked() || join.disabled) return;
        joined = true;
        bd.curveThrough('all');
        after();
      });
      ctx.dock.appendChild(join);
      ctx.say(n < maxPts ? T().statPlotPlaceWhy : (joined ? '' : T().statPlotJoinWhy));
    }

    return {
      start: function () { givenTable(); build(); },
      reset: function () { joined = false; sel = -1; build(); },
      restore: function (S) {
        S = S || {};
        givenTable(); build();
        (S.pts || []).forEach(function (pt) { bd.addPoint(Number(pt[0]), Number(pt[1])); });
        joined = !!S.joined;
        sel = -1;
        after();
      },
      state: function () { return { pts: bd ? bd.points() : [], joined: joined }; },
      ready: function () {
        var n = bd ? bd.points().length : 0;
        if (n < maxPts) return { ok: false, why: T().statPlotPlaceWhy };
        if (!joined) return { ok: false, why: T().statPlotJoinWhy };
        return { ok: true };
      },
      lock: function () { ctx.dock.innerHTML = ''; },
      showTruth: function () {
        var want = window.GJ_STATS.expectedPoints(q, packRulesOf(ctx) || window.GJ_STATS.DEFAULT_RULES);
        want.forEach(function (pt) {
          bd.annotate('target', [pt[0].n / pt[0].d, pt[1].n / pt[1].d]);
        });
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var pts = ((att.S || {}).pts) || [];
        pts.forEach(function (pt) { bd.addPoint(Number(pt[0]), Number(pt[1]), { ghost: true }); });
        if ((att.S || {}).joined && pts.length > 1) bd.curveThrough(pts, { ghost: true, instant: true });
      },
      board: function () { return bd; }
    };
  };

  /* ══ cfread — move the rule, read the value ══════════════════════════ */

  BUILD.cfread = function (ctx) {
    var q = ctx.q;
    var asks = (q.ask || []).slice();
    /* `answers` and the `atX@<x>` keys, because one question may ask for two
       reads at two different values (the CF notes ask at 167 cm and at 153) */
    var idx = 0, reads = {}, answers = {}, iqr = '', h = 0, ax = null, bd = null, pad = null;
    var answer = '';

    var boardWrap = el('div', 'stat-board-host');
    boardWrap.setAttribute('data-work', '');
    ctx.boardHost.appendChild(boardWrap);
    var lines = el('div', 'wlines stat-lines');
    ctx.boardHost.appendChild(lines);

    function current() { return asks[idx]; }
    function isAtX(a) { return a && typeof a === 'object' && a.type === 'atX'; }
    function build() {
      boardWrap.innerHTML = '';
      bd = window.GJ_STATCHART.render(boardWrap, q.chart, {
        snapDivisor: 2,                       /* the convention height can be a half */
        onChange: function (evt) {
          if (!evt || ctx.locked()) return;
          if (evt.type === 'rule') { h = evt.v; ctx.setStage('sliding'); paint(); ctx.changed(); }
          if (evt.type === 'rulex') { ax = evt.v; ctx.setStage('at-x'); paint(); ctx.changed(); }
        }
      });
      bd.curveThrough(q.curve || [], { instant: true });
      paint();
    }
    /* where the rule meets the curve, read on the board itself */
    function dropRule(v) {
      bd.rule(v);
      var d = bd.drop();
      return d ? d.x : null;
    }
    function dropAcross(v) {
      bd.ruleX(v);
      var d = bd.drop();
      return d ? d.y : null;
    }
    function paint() {
      var a = current();
      if (isAtX(a)) { ctx.setStage('at-x'); dropAcross(ax == null ? q.chart.x.min : ax); }
      else if (a && a !== 'IQR') { dropRule(h); }
      renderDock();
    }
    function writeLine(name, value) {
      var row = el('div', 'wline stat-wline');
      row.setAttribute('data-placed', '');
      /* the board's own number, not the raw intersection behind it */
      var F = (window.GJ_STATCHART && window.GJ_STATCHART.fmtNum) || String;
      row.textContent = fill(T().statLineOne, { name: name, value: (typeof value === 'number' ? F(value) : value) });
      lines.appendChild(row);
    }
    function nameOf(a) {
      if (isAtX(a)) return T().statReading;
      var m = { median: T().statMedian, Q1: T().statLowerQuartile, Q3: T().statUpperQuartile, IQR: T().statIqr };
      return m[a] || a;
    }
    function wantLabel(a) {
      var m = { countAbove: T().statHowManyAbove, countBelow: T().statHowManyBelow,
                pctAbove: T().statPctAbove, pctBelow: T().statPctBelow };
      return m[a.want] || T().statReading;
    }
    function renderDock() {
      ctx.dock.innerHTML = '';
      pad = null;
      var a = current();
      if (!a) { window.GJ.setState(ctx.dock, 'dock', 'chips'); ctx.say(''); ctx.setStage('ready'); return; }
      if (a === 'IQR') {
        ctx.setStage('iqr');
        window.GJ.setState(ctx.dock, 'dock', 'numpad-fraction');
        ctx.say(T().statReadIqr);
        var doneI = el('button', 'btn-quiet', T().statThatsMine);
        pad = makeNumPad(ctx.dock, { label: T().statIqr, fraction: true, decimal: true,
          onChange: function (v) {
            iqr = v;
            /* THE COMMIT HAS TO NOTICE. It used to be disabled at render time
               and never looked at again, so keying the value left the button
               dead and the question could not be finished at all. */
            doneI.disabled = !iqr;
            setLockedWhy(doneI, iqr ? null : T().statQlistIqrWhy);
            ctx.changed();
          } });
        pad.set(iqr);
        doneI.type = 'button';
        doneI.disabled = !iqr;
        if (!iqr) setLockedWhy(doneI, T().statQlistIqrWhy);
        doneI.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!iqr) return;
          writeLine(T().statIqr, iqr);
          idx++; ctx.setStage('committed'); paint(); ctx.changed();
        });
        ctx.dock.appendChild(doneI);
        return;
      }
      if (isAtX(a)) {
        window.GJ.setState(ctx.dock, 'dock', 'nudge-pad');
        ctx.say(fill(T().statReadAtX, { x: a.x }));
        var doneX = el('button', 'btn-quiet', T().statThatsMine);
        /* THE COMMIT KEEPS LOOKING. It was judged once, when the dock was
           built, and never again - so moving the rule and keying the answer
           left it dead and the question could not be finished at all. And the
           dock is NOT rebuilt while she is working in it: moving the rule
           redraws the BOARD, because rebuilding the dock would throw away the
           pad she is typing into, mid-number. */
        var syncX = function () {
          doneX.disabled = (ax == null || !answers['atX@' + a.x]);
          setLockedWhy(doneX, doneX.disabled ? T().statReadAtXWhy : null);
        };
        ctx.dock.appendChild(nudgePad(ctx, { axis: 'x', onNudge: function (dx) {
          var sq = (q.chart.sq || { x: 1 }).x || 1;
          /* and the same at both ends of the other axis */
          var xA = q.chart.x || {};
          var xLo = Number(xA.min != null ? xA.min : 0), xHi = Number(xA.max != null ? xA.max : 0);
          ax = Math.max(xLo, Math.min(xHi, (ax == null ? xLo : ax) + dx * sq));
          dropAcross(ax);
          syncX();
          ctx.changed();
        } }));
        var padWrap = el('div', 'stat-answer');
        ctx.dock.appendChild(padWrap);
        pad = makeNumPad(padWrap, { label: wantLabel(a), decimal: true, onChange: function (v) {
          answer = v; answers['atX@' + a.x] = v; syncX(); ctx.changed();
        } });
        pad.set(answers['atX@' + a.x] || '');
        doneX.type = 'button';
        syncX();
        doneX.addEventListener('click', function (e) {
          e.stopPropagation();
          if (doneX.disabled) return;
          var cfAt = dropAcross(ax);
          reads['atX@' + a.x] = { x: ax, cf: cfAt };
          reads.atX = { x: ax, cf: cfAt };
          writeLine(wantLabel(a), answers['atX@' + a.x]);
          idx++; ctx.setStage('committed'); paint(); ctx.changed();
        });
        ctx.dock.appendChild(doneX);
        return;
      }
      window.GJ.setState(ctx.dock, 'dock', 'nudge-pad');
      ctx.say(fill(T().statReadFind, { name: nameOf(a) }));
      var done = el('button', 'btn-quiet', fill(T().statThatsMyOne, { name: nameOf(a) }));
      /* THE DOCK IS NOT REBUILT WHILE SHE IS WORKING IN IT. Moving the rule
         redraws the BOARD and re-reads the commit; rebuilding the whole dock
         would throw away the pad she was typing into mid-number, and it was
         also how a commit button came to be judged once at render time and
         never again. */
      ctx.dock.appendChild(nudgePad(ctx, { axis: 'y', onNudge: function (dx, dy) {
        var sq = (q.chart.sq || { y: 1 }).y || 1;
        /* THE RULE STOPS AT THE EDGE OF THE GRAPH. It did not: holding the down
           arrow at the bottom carried the rule off the board into negative
           frequencies, where it meets no curve at all - so the reading came back
           empty and the working line she had just written read
           "median = {value}", a sentence with a hole in it on a pupil's screen.
           A rule you can push off the paper is not a rule. */
        var yA = q.chart.y || {};
        var yLo = Number(yA.min != null ? yA.min : 0), yHi = Number(yA.max != null ? yA.max : h);
        h = Math.max(yLo, Math.min(yHi, h + dy * sq));
        ctx.setStage('sliding');
        dropRule(h);
        done.disabled = !h;
        setLockedWhy(done, h ? null : T().statReadMoveWhy);
        ctx.changed();
      } }));
      done.type = 'button';
      done.disabled = !h;
      if (done.disabled) setLockedWhy(done, T().statReadMoveWhy);
      done.addEventListener('click', function (e) {
        e.stopPropagation();
        if (done.disabled) return;
        var x = dropRule(h);
        reads[a] = { h: h, x: x };
        bd.annotate('tick', [x, q.chart.y.min]);
        writeLine(nameOf(a), x);
        idx++; h = 0;
        ctx.setStage('committed');
        paint(); ctx.changed();
      });
      ctx.dock.appendChild(done);
    }

    return {
      start: function () {
        ctx.setStage('parked');
        fictionLine(ctx, T().statRuleFiction);
        build();                       /* paint() then says which ask she is on */
      },
      reset: function () { idx = 0; reads = {}; iqr = ''; answer = ''; h = 0; ax = null; lines.innerHTML = ''; build(); },
      restore: function (S) {
        S = S || {};
        reads = S.reads || {}; answers = S.answers || {}; iqr = S.iqr || ''; answer = S.answer || '';
        idx = asks.filter(function (a) {
          if (a === 'IQR') return !!iqr;
          if (isAtX(a)) return !!reads['atX@' + a.x];
          return !!reads[a];
        }).length;
        lines.innerHTML = '';
        build();
        asks.slice(0, idx).forEach(function (a) {
          if (a === 'IQR') writeLine(T().statIqr, iqr);
          else if (isAtX(a)) writeLine(wantLabel(a), answers['atX@' + a.x] || answer);
          else if (reads[a]) { writeLine(nameOf(a), reads[a].x); bd.annotate('tick', [reads[a].x, q.chart.y.min]); }
        });
        paint();
      },
      state: function () { return { reads: reads, answers: answers, iqr: iqr, answer: answer }; },
      ready: function () {
        if (idx < asks.length) return { ok: false, why: T().statReadWhy };
        return { ok: true };
      },
      lock: function () { ctx.dock.innerHTML = ''; },
      showTruth: function () {
        var rules = packRulesOf(ctx) || window.GJ_STATS.DEFAULT_RULES;
        var heights = window.GJ_STATS.readHeights(Number(q.n) || 0, rules.curveRule);
        asks.forEach(function (a) {
          if (typeof a !== 'string' || a === 'IQR') return;
          var wantH = heights[a === 'median' ? 'median' : a];
          var x = window.GJ_STATS.curveX(q.curve, wantH);
          if (x) bd.annotate('target', [x.n / x.d, q.chart.y.min]);
        });
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var g = el('div', 'stat-row struck');
        var r = (att.S || {}).reads || {};
        Object.keys(r).forEach(function (k) {
          if (k === 'atX') return;
          var t = el('span', 'stat-tile');
          t.textContent = nameOf(k) + ' ' + (r[k] && r[k].x);
          g.appendChild(t);
        });
        holder.appendChild(g);
      },
      board: function () { return bd; }
    };
  };

  /* ══ boxplot — five markers, then the plot (one Check, even in two stages) ═ */

  var FIVE = ['min', 'Q1', 'Q2', 'Q3', 'max'];

  BUILD.boxplot = function (ctx) {
    var q = ctx.q;
    var stageKind = q.from ? (q.from === 'curve' ? 'cfread' : q.from) : null;
    var stageHost = el('div', 'stat-stage');
    var plotHost = el('div', 'stat-plot');
    ctx.boardHost.appendChild(stageHost);
    ctx.boardHost.appendChild(plotHost);

    var pos = {}, drawn = false, sel = null, bd = null, stage = null, stageDone = !stageKind;

    /* the first stage, when there is one — its board stays on the page */
    if (stageKind) {
      var stageQ = {}, k;
      for (k in q) if (q.hasOwnProperty(k)) stageQ[k] = q[k];
      stageQ.kind = stageKind;
      delete stageQ.from;
      var subCtx = {
        q: stageQ, hooks: ctx.hooks, wrap: ctx.wrap, body: ctx.body,
        boardHost: stageHost, dock: ctx.dock, msg: ctx.msg,
        get selected() { return ctx.selected; },
        set selected(v) { ctx.selected = v; },
        get selectedStage() { return ctx.selectedStage; },
        set selectedStage(v) { ctx.selectedStage = v; },
        locked: ctx.locked,
        clearSelection: function () { ctx.clearSelection(); },
        say: function (t) { ctx.say(t); },
        setStage: function (s) { ctx.setStage(stageKind + ':' + s); },
        changed: function () { onStageChange(); }
      };
      stage = BUILD[stageKind](subCtx);
    }

    function onStageChange() {
      if (stageDone) return;
      var r = stage.ready();
      /* the first stage FINISHED but not yet moved on from is a board of its
         own - "Next: draw the box plot" lit, her working still on the page */
      if (r.ok) ctx.setStage(stageKind + ':ready');
      renderStageGate(r);
      ctx.changed();
    }
    function renderStageGate(r) {
      var old = ctx.dock.querySelector('.stat-next');
      if (old) old.parentNode.removeChild(old);
      var next = el('button', 'btn-quiet stat-next', T().statNextDrawBox);
      next.type = 'button';
      next.disabled = !r.ok;
      if (!r.ok) setLockedWhy(next, r.why);
      next.addEventListener('click', function (e) {
        e.stopPropagation();
        if (next.disabled) return;
        stageDone = true;
        if (stage.lock) stage.lock();
        buildPlot();
        ctx.changed();
      });
      ctx.dock.appendChild(next);
    }

    /* the plot itself */
    var trayWrap = el('div', 'stat-tray');
    trayWrap.setAttribute('data-tray', 'boxplot-markers-' + q.id);
    var boardWrap = el('div', 'stat-board');
    boardWrap.setAttribute('data-work', '');

    function markerLabel(role) {
      var m = { min: T().statLowest, Q1: T().statLowerQuartile, Q2: T().statMedian,
                Q3: T().statUpperQuartile, max: T().statHighest };
      return m[role] || role;
    }
    function buildPlot() {
      plotHost.innerHTML = '';
      plotHost.appendChild(trayWrap);
      plotHost.appendChild(boardWrap);
      boardWrap.innerHTML = '';
      bd = window.GJ_STATCHART.render(boardWrap, q.scale, {
        onGridTap: function (x) {
          if (ctx.locked()) return;
          if (!sel) { ctx.say(T().statBoxChooseMarker); return; }
          pos[sel] = x;
          var placed = sel;
          sel = null;
          ctx.setStage(Object.keys(pos).length === 5 ? 'placed' : 'placing');
          paint(); ctx.changed();
          ctx.say(fill(T().statBoxPlaced, { name: markerLabel(placed), value: x }));
        },
        onChange: function (evt) {
          if (!evt || ctx.locked()) return;
          if (evt.type === 'marker-move') { pos[evt.role] = evt.at; paint(); ctx.changed(); }
        }
      });
      fictionLine(ctx, T().statTrayFiction);
      ctx.say(T().statBoxChooseMarker);
      ctx.setStage('tray');
      paint();
    }
    function renderTray() {
      trayWrap.innerHTML = '';
      var left = FIVE.filter(function (r) { return pos[r] === undefined; })
        .map(function (r) { return { role: r }; });
      var answerKeys = FIVE.slice();      /* the ANSWER order is smallest to largest */
      var laid = derange(left, answerKeys, function (o) { return o.role; }, q.id);
      laid.forEach(function (o) {
        var b = el('button', 'stat-tray-marker' + (sel === o.role ? ' is-selected' : ''));
        b.type = 'button';
        b.textContent = markerLabel(o.role);
        b.setAttribute('data-tray-item', '');
        /* aria-CURRENT, not aria-pressed: choosing which marker to place next
           is picking the current item out of a set, not pressing an answer.
           The consequence law watches aria-pressed inside a tray because a
           pressed option at mount is an answer given away, and a marker she
           has picked up is not one. */
        if (sel === o.role) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked()) return;
          sel = (sel === o.role) ? null : o.role;
          ctx.setStage('marker-selected');
          renderTray();
        });
        trayWrap.appendChild(b);
      });
      FIVE.filter(function (r) { return pos[r] !== undefined; }).forEach(function (r) {
        var b = el('button', 'stat-tray-marker is-placed');
        b.type = 'button';
        b.textContent = markerLabel(r) + ' ✓';
        b.setAttribute('data-tray-item', '');
        ctx.selectedStage = 'marker-selected';
        twoPress(ctx, b, function () {
          delete pos[r];
          drawn = false;
          paint(); ctx.changed();
        });
        trayWrap.appendChild(b);
      });
    }
    function paint() {
      var placedCount = FIVE.filter(function (r) { return pos[r] !== undefined; }).length;
      ctx.setStage(drawn ? 'drawn'
        : placedCount === 5 ? 'placed'
        : sel ? 'marker-selected'
        : placedCount ? 'placing' : 'tray');
      renderTray();
      var on = bd.markers();
      FIVE.forEach(function (r) {
        if (pos[r] === undefined) { if (on[r] !== undefined) bd.removeMarker(r); return; }
        if (on[r] === undefined) bd.marker(r, pos[r], { label: markerLabel(r) });
        else if (on[r] !== pos[r]) bd.moveMarker(r, pos[r]);
      });
      if (drawn) bd.box({ instant: true }); else bd.clearBox();
      renderDock();
    }
    function renderDock() {
      ctx.dock.innerHTML = '';
      window.GJ.setState(ctx.dock, 'dock', 'tray');
      var draw = el('button', 'btn-quiet stat-draw', T().statDrawBoxPlot);
      draw.type = 'button';
      draw.disabled = Object.keys(pos).length < 5 || drawn;
      if (draw.disabled) setLockedWhy(draw, Object.keys(pos).length < 5 ? T().statBoxPlaceWhy : T().statBoxDrawnAlready);
      draw.addEventListener('click', function (e) {
        e.stopPropagation();
        if (draw.disabled) return;
        drawn = true;
        ctx.setStage('drawn');
        paint(); ctx.changed();
      });
      ctx.dock.appendChild(draw);
      if (Object.keys(pos).length < 5) ctx.say(sel ? T().statBoxPlaceOnScale : T().statBoxChooseMarker);
      else if (!drawn) ctx.say(T().statBoxDrawWhy);
    }

    return {
      start: function () {
        if (stage) { stage.start(); renderStageGate(stage.ready()); }
        else buildPlot();
      },
      reset: function () {
        pos = {}; drawn = false; sel = null;
        if (stage) { stageDone = false; stage.reset(); plotHost.innerHTML = ''; renderStageGate(stage.ready()); }
        else buildPlot();
      },
      restore: function (S) {
        S = S || {};
        pos = S.pos ? JSON.parse(JSON.stringify(S.pos)) : {};
        Object.keys(pos).forEach(function (k2) { pos[k2] = Number(pos[k2]); });
        drawn = !!S.drawn;
        if (stage) {
          stage.restore(S.stage || {});
          stageDone = stage.ready().ok;
          if (stageDone) { if (stage.lock) stage.lock(); buildPlot(); }
          else renderStageGate(stage.ready());
        } else buildPlot();
      },
      state: function () {
        var out = { pos: {}, drawn: drawn };
        Object.keys(pos).forEach(function (k2) { out.pos[k2] = String(pos[k2]); });
        if (stage) out.stage = stage.state();
        return out;
      },
      ready: function () {
        if (stage && !stageDone) return { ok: false, why: stage.ready().why || T().statBoxStageWhy };
        if (Object.keys(pos).length < 5) return { ok: false, why: T().statBoxPlaceWhy };
        if (!drawn) return { ok: false, why: T().statBoxDrawWhy };
        return { ok: true };
      },
      lock: function () {
        ctx.dock.innerHTML = '';
        trayWrap.querySelectorAll('button').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
        if (stage && stage.lock) stage.lock();
      },
      showTruth: function () {
        var truth = q.given || (q.answer || null);
        if (!truth && q.from === 'qlist') {
          var f = window.GJ_STATS.fiveNumber(q.values || [], (packRulesOf(ctx) || {}).quartileRule || 'n+1');
          truth = f && { min: f.min, Q1: f.Q1, Q2: f.Q2, Q3: f.Q3, max: f.max };
        }
        if (!truth || !bd) return;
        FIVE.forEach(function (r) {
          var val = truth[r];
          var v = (val && val.n !== undefined) ? val.n / val.d : Number(val);
          if (!isNaN(v)) bd.annotate('target', [v, 0]);
        });
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var was = ((att.S || {}).pos) || {};
        if (!bd) return;
        FIVE.forEach(function (r) {
          if (was[r] === undefined || was[r] === '') return;
          bd.marker(r + ':ghost', Number(was[r]), { ghost: true });
        });
      },
      board: function () { return bd; }
    };
  };

  /* ══ compare — two box plots, two sentences ═════════════════════════ */

  BUILD.compare = function (ctx) {
    var q = ctx.q;
    var plots = q.plots || [];
    var labels = plots.map(function (p) { return p.label; });
    var s1 = {}, s2 = {}, bd = null;
    var pads = {};

    var boardWrap = el('div', 'stat-board');
    boardWrap.setAttribute('data-work', '');
    ctx.boardHost.appendChild(boardWrap);
    var sentences = el('div', 'stat-sentences');
    ctx.boardHost.appendChild(sentences);

    function words() { return (q.context && q.context.words) || []; }
    function chipGroup(host, id, options, current, onPick) {
      var g = el('span', 'stat-chips');
      g.setAttribute('data-tray', 'compare-' + id + '-' + q.id);
      derange(options.map(function (o) { return { o: o }; }), options, function (x) { return x.o; }, q.id + id)
        .forEach(function (x) {
          var b = el('button', 'chip');
          b.type = 'button';
          b.textContent = x.o;
          b.setAttribute('data-tray-item', '');
          b.setAttribute('aria-pressed', current === x.o ? 'true' : 'false');
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (ctx.locked()) return;
            onPick(x.o);
            ctx.setStage('building');
            render(); ctx.changed();
          });
          g.appendChild(b);
        });
      host.appendChild(g);
    }
    function valueBox(host, key, store, i) {
      var b = el('button', 'stat-cell');
      b.type = 'button';
      b.textContent = (store.v && store.v[i]) || '';
      if (store.v && store.v[i]) b.setAttribute('data-placed', '');
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (ctx.locked()) return;
        openPad(key, store, i);
      });
      host.appendChild(b);
    }
    function openPad(key, store, i) {
      ctx.dock.innerHTML = '';
      window.GJ.setState(ctx.dock, 'dock', 'numpad-fraction');
      var pad = makeNumPad(ctx.dock, {
        label: T().statCompareValue, fraction: true, decimal: true,
        onChange: function (val) {
          store.v = store.v || [];
          store.v[i] = val;
          render(); ctx.changed();
        }
      });
      pad.set((store.v && store.v[i]) || '');
      pads[key] = pad;
    }
    function render() {
      var ok1 = s1.who && s1.who2 && s1.ctx && s1.v && s1.v[0] && s1.v[1];
      var ok2 = s2.who && s2.size && s2.meas && s2.cons && s2.v && s2.v[0] && s2.v[1];
      var touched = s1.who || s2.who || (s1.v && s1.v[0]) || (s2.v && s2.v[0]);
      ctx.setStage((ok1 && ok2) ? 'ready' : (touched ? 'building' : 'empty'));
      sentences.innerHTML = '';
      var l1 = el('p', 'stat-sentence');
      l1.appendChild(document.createTextNode(''));
      chipGroup(l1, 'who1', labels, s1.who, function (o) { s1.who = o; });
      l1.appendChild(document.createTextNode(' ' + T().statCmpHigherMedian + ' ('));
      valueBox(l1, 'v1a', s1, 0);
      l1.appendChild(document.createTextNode(' ' + T().statCmpAgainst + ' '));
      valueBox(l1, 'v1b', s1, 1);
      l1.appendChild(document.createTextNode('), ' + T().statCmpSoOnAverage + ' '));
      chipGroup(l1, 'who1b', labels, s1.who2, function (o) { s1.who2 = o; });
      l1.appendChild(document.createTextNode(' ' + T().statCmpWere + ' '));
      chipGroup(l1, 'ctx', words(), s1.ctx, function (o) { s1.ctx = o; });
      l1.appendChild(document.createTextNode('.'));
      sentences.appendChild(l1);

      var l2 = el('p', 'stat-sentence');
      chipGroup(l2, 'who2', labels, s2.who, function (o) { s2.who = o; });
      l2.appendChild(document.createTextNode(' ' + T().statCmpHadThe + ' '));
      chipGroup(l2, 'size', [T().statCmpLarger, T().statCmpSmaller], s2.sizeWord, function (o) {
        s2.sizeWord = o;
        s2.size = (o === T().statCmpLarger) ? 'larger' : 'smaller';
      });
      chipGroup(l2, 'meas', [T().statIqr, T().statRange], s2.measWord, function (o) {
        s2.measWord = o;
        s2.meas = (o === T().statRange) ? 'range' : 'iqr';
      });
      l2.appendChild(document.createTextNode(' ('));
      valueBox(l2, 'v2a', s2, 0);
      l2.appendChild(document.createTextNode(' ' + T().statCmpAgainst + ' '));
      valueBox(l2, 'v2b', s2, 1);
      l2.appendChild(document.createTextNode('), ' + T().statCmpSoTheirs + ' '));
      chipGroup(l2, 'cons', [T().statCmpMore, T().statCmpLess], s2.consWord, function (o) {
        s2.consWord = o;
        s2.cons = (o === T().statCmpMore) ? 'more' : 'less';
      });
      l2.appendChild(document.createTextNode(' ' + T().statCmpConsistent + '.'));
      sentences.appendChild(l2);
    }
    function build() {
      boardWrap.innerHTML = '';
      bd = [];
      plots.forEach(function (p) {
        var lab = el('p', 'stat-plot-label', esc(p.label));
        var host = el('div', 'stat-board-host');
        host.setAttribute('data-work', '');
        boardWrap.appendChild(lab);
        boardWrap.appendChild(host);
        var b = window.GJ_STATCHART.render(host, q.scale, { readOnly: true });
        b.box({ values: p.summary, instant: true });
        bd.push(b);
      });
      render();
      window.GJ.setState(ctx.dock, 'dock', 'chips');
      ctx.say(T().statCompareStart);
    }

    return {
      start: function () { build(); },
      reset: function () { s1 = {}; s2 = {}; build(); },
      restore: function (S) { S = S || {}; s1 = S.s1 || {}; s2 = S.s2 || {}; build(); },
      state: function () { return { s1: s1, s2: s2 }; },
      ready: function () {
        var ok1 = s1.who && s1.who2 && s1.ctx && s1.v && s1.v[0] && s1.v[1];
        var ok2 = s2.who && s2.size && s2.meas && s2.cons && s2.v && s2.v[0] && s2.v[1];
        return (ok1 && ok2) ? { ok: true } : { ok: false, why: T().statCompareWhy };
      },
      lock: function () {
        ctx.dock.innerHTML = '';
        sentences.querySelectorAll('button').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var g = el('div', 'stat-row struck');
        var S = att.S || {};
        g.textContent = [(S.s1 || {}).who, (S.s1 || {}).ctx, (S.s2 || {}).who, (S.s2 || {}).size].filter(Boolean).join(' · ');
        holder.appendChild(g);
      },
      board: function () { return bd && bd[0]; }
    };
  };

  /* ══ judge — weigh each claim, and say why when it is not fair ═══════ */

  BUILD.judge = function (ctx) {
    var q = ctx.q;
    var claims = q.claims || [];
    var j = claims.map(function () { return {}; });
    var host = el('div', 'stat-claims');
    ctx.boardHost.appendChild(host);

    /* THE REASON BANK IS THE ENGINE'S, unless this question authored its own.
       DESIGN 6.6 fixes the ids and the plain-words sentences in one place; a
       pack that repeated them in every judge question would be eight copies to
       go stale. A question may still carry its own bank when the source's
       wording differs. */
    function reasonBank() {
      if (q.reasons && q.reasons.length) return q.reasons.slice();
      var bank = (window.GJ_STATS && window.GJ_STATS.REASONS) || {};
      return Object.keys(bank).map(function (id) { return { id: id, text: bank[id] }; });
    }
    function render() {
      host.innerHTML = '';
      claims.forEach(function (c, i) {
        var card = el('div', 'stat-claim');
        card.appendChild(el('p', 'stat-claim-text', esc(c.text)));
        var opts = c.options || [T().statFairToSay, T().statNotFair];
        var g = el('div', 'stat-chips');
        g.setAttribute('data-tray', 'judge-' + i + '-' + q.id);
        var answerOrder = c.options ? c.options.slice() : [T().statFairToSay, T().statNotFair];
        derange(opts.map(function (o) { return { o: o }; }), answerOrder, function (x) { return x.o; }, q.id + i)
          .forEach(function (x) {
            var b = el('button', 'chip');
            b.type = 'button';
            b.textContent = x.o;
            b.setAttribute('data-tray-item', '');
            b.setAttribute('aria-pressed', pressed(i, x.o) ? 'true' : 'false');
            b.addEventListener('click', function (e) {
              e.stopPropagation();
              if (ctx.locked()) return;
              if (c.options) j[i] = { v: x.o };
              else j[i] = { fair: x.o === T().statFairToSay, why: null };
              ctx.setStage(c.options ? 'judging' : (j[i].fair === false ? 'reason-open' : 'judging'));
              render(); ctx.changed();
            });
            g.appendChild(b);
          });
        card.appendChild(g);
        if (!c.options && j[i].fair === false) {
          var rg = el('div', 'stat-chips stat-reasons');
          rg.setAttribute('data-tray', 'judge-why-' + i + '-' + q.id);
          var bank = reasonBank();
          derange(bank, bank.map(function (r) { return r.id; }), function (r) { return r.id; }, q.id + 'w' + i)
            .forEach(function (r) {
              var b = el('button', 'chip chip-reason');
              b.type = 'button';
              b.textContent = r.text;
              b.setAttribute('data-tray-item', '');
              b.setAttribute('data-reason', r.id);
              b.setAttribute('aria-pressed', j[i].why === r.id ? 'true' : 'false');
              b.addEventListener('click', function (e) {
                e.stopPropagation();
                if (ctx.locked()) return;
                j[i].why = r.id;
                render(); ctx.changed();
              });
              rg.appendChild(b);
            });
          card.appendChild(rg);
        }
        host.appendChild(card);
      });
      window.GJ.setState(ctx.dock, 'dock', 'chips');
      var done = claims.every(function (c, i) {
        if (c.options) return !!j[i].v;
        if (j[i].fair === undefined || j[i].fair === null) return false;
        return j[i].fair !== false || !!j[i].why;
      });
      if (done) ctx.setStage('ready');
    }
    function pressed(i, text) {
      var c = claims[i];
      if (c.options) return j[i].v === text;
      if (j[i].fair === undefined || j[i].fair === null) return false;
      return (text === T().statFairToSay) === j[i].fair;
    }

    return {
      start: function () { render(); ctx.say(T().statJudgeStart); },
      reset: function () { j = claims.map(function () { return {}; }); render(); },
      restore: function (S) { j = (S && S.j) || claims.map(function () { return {}; }); render(); },
      state: function () { return { j: j }; },
      ready: function () {
        var i;
        for (i = 0; i < claims.length; i++) {
          var c = claims[i];
          if (c.options) { if (!j[i].v) return { ok: false, why: T().statJudgeDecideWhy }; }
          else if (j[i].fair === undefined || j[i].fair === null) return { ok: false, why: T().statJudgeDecideWhy };
          else if (j[i].fair === false && !j[i].why) return { ok: false, why: T().statJudgeReasonWhy };
        }
        return { ok: true };
      },
      lock: function () {
        ctx.dock.innerHTML = '';
        host.querySelectorAll('button').forEach(function (b) {
          b.disabled = true;
          setLockedWhy(b, T().statAlreadyMarked);
          if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('data-placed', '');
        });
      },
      showTruth: function () {
        var box = el('div', 'stat-truth');
        box.setAttribute('data-truth', '');
        box.textContent = claims.map(function (c, i) {
          return (i + 1) + ' ' + (c.options ? c.verdict : (c.fair ? T().statFairToSay : T().statNotFair));
        }).join(' · ');
        ctx.boardHost.appendChild(box);
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var g = el('div', 'stat-row struck');
        (((att.S || {}).j) || []).forEach(function (x, i) {
          var t = el('span', 'stat-tile');
          t.textContent = (i + 1) + ' ' + (x.v || (x.fair === true ? T().statFairToSay : x.fair === false ? T().statNotFair : '—'));
          g.appendChild(t);
        });
        holder.appendChild(g);
      }
    };
  };

  /* ══ the teacher's read-only view of one pupil's artefact ════════════ */

  function renderReadOnly(host, q, att, verdict) {
    host.innerHTML = '';
    var wrap = el('div', 'stat-readonly');
    wrap.setAttribute('data-kind', q.kind);
    wrap.setAttribute('data-qid', q.id);
    host.appendChild(wrap);
    var S = (att && att.S) || {};
    var v = verdict || (window.GJ_STATS && window.GJ_STATS.check(q, att));

    if (q.kind === 'cfplot' || q.kind === 'cfread') {
      var b = el('div', 'stat-board stat-board-small');
      wrap.appendChild(b);
      var bd = window.GJ_STATCHART.render(b, q.chart, { readOnly: true });
      if (q.kind === 'cfplot') {
        (S.pts || []).forEach(function (pt) { bd.addPoint(Number(pt[0]), Number(pt[1])); });
        if (S.joined) bd.curveThrough('all');
        /* the app's first-pass marks, drawn ON her artefact as annotations */
        var want = window.GJ_STATS.expectedPoints(q, q.rules || window.GJ_STATS.DEFAULT_RULES)
          .map(function (pt) { return [pt[0].n / pt[0].d, pt[1].n / pt[1].d]; });
        (S.pts || []).forEach(function (pt) {
          var hit = want.some(function (w) { return Number(w[0]) === Number(pt[0]) && Number(w[1]) === Number(pt[1]); });
          bd.annotate(hit ? 'right' : 'wrong', [Number(pt[0]), Number(pt[1])]);
        });
      } else {
        bd.curveThrough(q.curve || [], { instant: true });
        Object.keys(S.reads || {}).forEach(function (k) {
          var r = S.reads[k];
          if (r && r.x !== undefined && r.x !== null) bd.annotate('tick', [Number(r.x), q.chart.y.min]);
        });
      }
    } else if (q.kind === 'boxplot') {
      var b2 = el('div', 'stat-board stat-board-small');
      wrap.appendChild(b2);
      var bd2 = window.GJ_STATCHART.render(b2, q.scale, { readOnly: true });
      var pos = S.pos || {};
      FIVE.forEach(function (r) {
        if (pos[r] === undefined || pos[r] === '') return;
        bd2.marker(r, Number(pos[r]), { label: r });
      });
      if (S.drawn) bd2.box({ instant: true });
    } else {
      var line = el('div', 'stat-row');
      line.textContent = summariseState(q, S);
      wrap.appendChild(line);
    }

    var units = el('div', 'stat-units');
    wrap.appendChild(units);
    (v ? v.perLine : []).forEach(function (u) {
      var row = el('div', 'stat-unit');
      var mk = el('span', 'wl-mark');
      mk.setAttribute('data-mark', '');
      row.appendChild(mk);
      drawMark(mk, u.ok === 1 ? 'tick' : u.ok === 2 ? 'tick-hollow' : 'cross');
      row.appendChild(el('span', 'stat-unit-label', esc(u.label)));
      if (u.note) row.appendChild(el('span', 'stat-unit-note', esc(u.note)));
      units.appendChild(row);
    });
    return wrap;
  }
  function summariseState(q, S) {
    if (q.kind === 'qlist') {
      return (S.order || []).map(function (i) { return (q.values || [])[i]; }).join(', ');
    }
    if (q.kind === 'cftable') return (S.cf || []).join(', ');
    if (q.kind === 'values') return Object.keys(S.v || {}).map(function (k) { return k + ' ' + S.v[k]; }).join(' · ');
    if (q.kind === 'judge') {
      return ((S.j) || []).map(function (x, i) { return (i + 1) + ' ' + (x.v || (x.fair ? '✓' : '✗')); }).join(' · ');
    }
    if (q.kind === 'compare') {
      var a = S.s1 || {}, b = S.s2 || {};
      return [a.who, a.ctx, '·', b.who, b.size].filter(Boolean).join(' ');
    }
    return '';
  }

  window.GJ_JOTTER_STATS = {
    KINDS: KINDS,
    STAGES: STAGES,
    stagesFor: stagesFor,
    handles: handles,
    mount: mount,
    renderReadOnly: renderReadOnly
  };
})();
