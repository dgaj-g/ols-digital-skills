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

  var KINDS = ['qlist', 'cftable', 'cfplot', 'cfread', 'boxplot', 'compare', 'judge', 'values',
    /* Book A - Collecting and displaying (12 Sept 2026) */
    'order', 'pick', 'stemleaf', 'pie', 'scatter'];
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
    values: ['empty', 'filling', 'ready'],
    /* Book A (DESIGN 17; the contract in tools/qa/out/bookA/CONTRACT_A.md) */
    order: ['tray', 'ordering', 'selected', 'ready'],
    pick: ['empty', 'picked', 'ready'],
    /* a leaf is "selected" whether it was lifted from the tray or from a
       stem; "key" exists only when the question asks her to write one */
    stemleaf: ['tray', 'leaf-selected', 'placing', 'key', 'ready'],
    pie: ['table', 'table-done', 'rim', 'bounds-done', 'drawn', 'ready'],
    scatter: ['plotting', 'plotted', 'line', 'estimate', 'corr', 'outlier', 'ready']
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
      /* "judging" - some judged, nothing open, the question not finished - is
         a board only when a claim that opens no reason picker is FOLLOWED by
         another claim: the press that judges the last claim finishes the
         question in the same tick (the walk, 12 Sept 2026: every Book A
         questionnaire put its one fair claim last) */
      var judgingReachable = claims.slice(0, -1).some(function (c) { return !!c.options || c.fair !== false; });
      if (!judgingReachable) drop('judging');
      /* IN THE ORDER SHE MEETS THEM. When the FIRST claim is one she has to
         give a reason for, the reason picker is the board she sees before any
         "some judged, nothing open" board exists. */
      else if (claims[0] && !claims[0].options && claims[0].fair === false) {
        var iJ = own.indexOf('judging'), iR = own.indexOf('reason-open');
        if (iJ > -1 && iR > -1) { own[iJ] = 'reason-open'; own[iR] = 'judging'; }
      }
    }
    if (q.kind === 'stemleaf' && !(q.key && q.key.ask)) drop('key');
    if (q.kind === 'scatter') {
      var asked = (q.asks || []).map(function (a) { return a && a.type; });
      if (asked.indexOf('lobf') === -1) drop('line');
      if (asked.indexOf('estimate') === -1) drop('estimate');
      if (asked.indexOf('corr') === -1) drop('corr');
      if (asked.indexOf('outlier') === -1) drop('outlier');
      /* with nothing after the points, "every point placed" IS the finished
         board: the Check lights on the last point */
      if (asked.length === 0) drop('plotted');
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
    judge: 'statCheckJudge', values: 'statCheckValues',
    order: 'statCheckOrder', pick: 'statCheckPick', stemleaf: 'statCheckStemleaf',
    pie: 'statCheckPie', scatter: 'statCheckScatter'
  };

  /* ── THE STAGE STRIP: the stages, SHOWN (DESIGN 4.0, Correction 11 Sept
     2026). His words: "it would be really helpful if I could see the clear
     stages and which stage I'm working on". A pill groups the boards a
     pupil experiences as ONE act (the ordered row is one act however many
     tiles are in it); the strip is derived from the SAME stage list the root
     declares, so the two can never disagree, and the walker asserts that the
     lit pill is the one the root's data-stage belongs to. A kind whose pills
     are its ASKS (cfread) or its SENTENCES (compare) lights them itself
     through ctx.setPill, because its boards are shared between the acts. */
  function pillsFor(q, stages) {
    var t = T();
    var out = [];
    function pill(name, list) { out.push({ name: name, stages: list.filter(function (s2) { return stages.indexOf(s2) > -1; }) }); }
    function has(s2) { return stages.indexOf(s2) > -1; }
    var kind = q.kind;
    if (kind === 'qlist') {
      /* the completed row IS the start of the cuts: the pick instruction is
         showing the moment the last tile lands, so that board is the cuts' */
      pill(t.statPillOrder, ['tray', 'ordering', 'selected'].concat(has('picking') ? [] : ['ordered']));
      if (has('picking')) pill(t.statPillCuts, ['ordered', 'picking', 'cut-committed']);
      if (has('iqr')) pill(t.statPillIqr, ['iqr']);
    } else if (kind === 'cftable') pill(t.statPillCftable, ['empty', 'filling']);
    else if (kind === 'values') pill(t.statPillValues, ['empty', 'filling']);
    else if (kind === 'cfplot') { pill(t.statPillPlot, ['empty', 'selected']); pill(t.statPillJoin, ['placed', 'joined']); }
    else if (kind === 'cfread') {
      (q.ask || []).forEach(function (a) {
        if (a === 'IQR') pill(t.statPillIqr, ['iqr']);
        else if (a && a.type === 'atX') pill(fill(t.statPillReadAt, { x: a.x }), ['at-x']);
        else pill(fill(t.statPillRead, { name: readName(a) }), ['parked', 'sliding', 'committed']);
      });
    }
    else if (kind === 'boxplot') { pill(t.statPillBoxPlace, ['tray', 'marker-selected', 'placing']); pill(t.statPillBoxDraw, ['placed', 'drawn']); }
    /* both sentences are "building" boards: the kind lights the pill itself */
    else if (kind === 'compare') { pill(t.statPillCompare1, ['empty', 'building']); pill(t.statPillCompare2, ['building']); }
    else if (kind === 'judge') pill(t.statPillJudge, ['empty', 'judging', 'reason-open']);
    /* Book A */
    else if (kind === 'order') pill(t.statPillOrder, ['tray', 'ordering', 'selected']);
    else if (kind === 'pick') { pill(t.statPillPickChoose, ['empty']); pill(t.statPillPickWhy, ['picked']); }
    else if (kind === 'stemleaf') { pill(t.statPillSlPlace, ['tray', 'leaf-selected', 'placing']); if (has('key')) pill(t.statPillSlKey, ['key']); }
    else if (kind === 'pie') { pill(t.statPillPieTable, ['table', 'table-done']); pill(t.statPillPieRim, ['rim', 'bounds-done']); pill(t.statPillPieLabels, ['drawn']); }
    else if (kind === 'scatter') {
      pill(t.statPillScPlot, ['plotting', 'plotted']);
      (q.asks || []).forEach(function (a) {
        if (!a) return;
        if (a.type === 'lobf') pill(t.statPillScLine, ['line']);
        else if (a.type === 'estimate') pill(fill(t.statPillScEst, { at: a.at }), ['estimate']);
        else if (a.type === 'corr') pill(t.statPillScCorr, ['corr']);
        else if (a.type === 'outlier') pill(t.statPillScOutlier, ['outlier']);
      });
    }
    /* the finished board belongs to the last act */
    if (out.length && has('ready')) out[out.length - 1].stages.push('ready');
    return out;
  }
  /* the plain name of a reading ask, shared by the pill and the instruction */
  function readName(a) {
    var t = T();
    var m = { median: t.statMedian, Q1: t.statLowerQuartile, Q2: t.statMedian, Q3: t.statUpperQuartile, IQR: t.statIqr };
    return (typeof a === 'string' && m[a]) || (typeof a === 'string' ? a : t.statReading);
  }

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
      ctx.setStage(ctx.selectedStage || 'selected');
      ctx.note(T().statPutBack);
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

    var wrap = el('div', 'jotter-q stat-q stat-q-' + q.kind);
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

    /* THE STRIP: numbered pills, the current one filled copper, done ones a
       copper ring with a tick, upcoming ones a pencil outline. It is READ,
       so it is not data-ornament. A two-stage item shows the first kind's
       pills then the second's (the prefixed stages map onto them). */
    var strip = null, pills = [], curPill = -1, beatTimer = null;
    function pillsOf() {
      if (q.kind === 'boxplot' && q.from) {
        var first = q.from === 'curve' ? 'cfread' : q.from;
        var stageQ = {}, k2;
        for (k2 in q) if (q.hasOwnProperty(k2) && k2 !== 'kind' && k2 !== 'from') stageQ[k2] = q[k2];
        stageQ.kind = first;
        var pre = pillsFor(stageQ, stages.filter(function (s2) { return s2.indexOf(first + ':') === 0; })
          .map(function (s2) { return s2.slice(first.length + 1); }));
        pre.forEach(function (p2) { p2.stages = p2.stages.map(function (s2) { return first + ':' + s2; }); });
        return pre.concat(pillsFor(q, stages));
      }
      return pillsFor(q, stages);
    }
    pills = pillsOf();
    if (pills.length > 1) {
      strip = el('div', 'stage-strip');
      strip.setAttribute('role', 'list');
      body.appendChild(strip);
    }
    function renderStrip() {
      if (!strip) return;
      strip.innerHTML = '';
      pills.forEach(function (p2, i) {
        var pl = el('span', 'stage-pill ' + (i < curPill ? 'is-done' : i === curPill ? 'is-now' : 'is-next'));
        pl.setAttribute('role', 'listitem');
        pl.setAttribute('data-pill-stages', p2.stages.join(' '));
        if (i === curPill) pl.setAttribute('aria-current', 'step');
        var n = el('span', 'stage-pill-n', i < curPill ? '\u2713' : String(i + 1));
        n.setAttribute('aria-hidden', 'true');
        pl.appendChild(n);
        pl.appendChild(el('span', 'stage-pill-name', esc(p2.name)));
        strip.appendChild(pl);
      });
    }
    /* ONE ATTENTION BEAT when a stage begins - two breaths, then still. A
       screen that nags is a screen she stops reading, so nothing pulses for
       ever; under prefers-reduced-motion the stylesheet skips the beat. */
    function beat() {
      var pl = strip && strip.querySelector('.stage-pill.is-now');
      [pl, msg].forEach(function (n) { if (n) { n.classList.remove('is-beat'); void n.offsetWidth; n.classList.add('is-beat'); } });
      clearTimeout(beatTimer);
      beatTimer = setTimeout(function () { [pl, msg].forEach(function (n) { if (n) n.classList.remove('is-beat'); }); }, 2500);
    }
    function pillOfStage(s2) {
      for (var i = 0; i < pills.length; i++) if (pills[i].stages.indexOf(s2) > -1) return i;
      return curPill < 0 ? 0 : curPill;
    }
    function setPill(i, quiet) {
      if (!pills.length) return;
      i = Math.max(0, Math.min(pills.length - 1, i));
      if (i === curPill) return;
      var first = curPill < 0;
      curPill = i;
      wrap.setAttribute('data-stage-label', pills[i].name);
      renderStrip();
      if (!first && !quiet) beat();
    }

    /* the one live message slot: a stage instruction REPLACES the last one
       rather than stacking, so no question ever says the same thing twice.
       It is the CURRENT INSTRUCTION - body size, a copper bar - and it names
       the whole act before the control that does it. */
    var msg = el('p', 'ui-msg stat-msg stage-now');
    body.appendChild(msg);
    /* A NOTE HAS ITS OWN LINE (ruling 45, 12 Sept 2026). "You have all the
       points you need - move one instead." had REPLACED the instruction, so a
       pupil who tapped once too often lost the sentence that told her what she
       was doing. Passing notes - enough points, put it back, try again - live
       here, under the stage line, in the pencil face, and go on the next state
       change; the stage line is written only by the stage table. */
    var note = el('p', 'ui-msg stat-note');
    note.setAttribute('role', 'status');
    body.appendChild(note);

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
      note: function (text) { note.textContent = text || ''; },
      setStage: function (s) {
        if (stages.indexOf(s) === -1) return;
        if (wrap.getAttribute('data-stage') !== s) note.textContent = '';   /* a state change clears the note */
        wrap.setAttribute('data-stage', s);
        setPill(pillOfStage(s));
      },
      setPill: function (i) { setPill(i); },
      changed: function () { onChange(); }
    };
    body.addEventListener('click', function () { ctx.clearSelection(); });

    var kind = BUILD[q.kind](ctx);
    setPill(pillOfStage(stages[0]), true);

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
      /* ONE GOLD GLOW when the Check lights, then still (DESIGN 4.0) */
      if (r.ok && checkBtn.disabled) {
        checkBtn.classList.remove('glow-once'); void checkBtn.offsetWidth; checkBtn.classList.add('glow-once');
        setTimeout(function () { checkBtn.classList.remove('glow-once'); }, 1300);
      }
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
        ctx.note(T().statTryAgain);
        wrap.setAttribute('data-stage', stages[0]);
        curPill = -1; setPill(pillOfStage(stages[0]), true);
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
    if (kind === 'order') return 'cycle';
    if (kind === 'pick') return 'pick';
    if (kind === 'stemleaf') return 'stemleaf';
    if (kind === 'pie') return 'pie';
    if (kind === 'scatter') return 'scatter';
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
        ctx.say(fill(T().statStageQlistOrder, { n: values().length - order.length }));
        return;
      }
      if (cutIdx < cuts.length) {
        window.GJ.setState(ctx.dock, 'dock', 'chips');
        ctx.say(fill(T().statStageQlistPick, { name: cutName(cuts[cutIdx]) }));
        var commit = el('button', 'btn-stage', fill(T().statQlistCommit, { name: cutName(cuts[cutIdx]) }));
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
        ctx.say(T().statStageIqr);
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
      start: function () { render(); },
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
      ctx.say(T().statStageCftable);
      if (open < 0) {
        window.GJ.setState(ctx.dock, 'dock', 'chips');
        return;
      }
      window.GJ.setState(ctx.dock, 'dock', 'numpad');
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
    /* THE FIGURE (Book A, DESIGN 17.1): a Venn diagram carries its boxes ON
       the regions - HTML buttons laid over the board at the region centres the
       chart reports, so the overlap and readability laws judge them as text;
       a given stem-and-leaf diagram or a printed list is drawn above the
       boxes. A slot with a `region` lives on the figure; every other slot
       stays in the list below. */
    var fig = q.fig || null;
    var isVenn = !!(fig && (fig.type === 'venn2' || fig.type === 'venn3'));
    var figHost = null, venn = null, overlay = null;
    if (fig) {
      figHost = el('div', 'stat-fig stat-fig-' + fig.type);
      figHost.setAttribute('data-work', '');
      ctx.boardHost.appendChild(figHost);
      if (isVenn && window.GJ_STATCHART && window.GJ_STATCHART.venn) {
        venn = window.GJ_STATCHART.venn(figHost, fig, {});
        overlay = el('div', 'stat-fig-overlay');
        (venn.frame || figHost).appendChild(overlay);
        if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { placeOverlay(); }).observe(venn.frame || figHost);
      } else if (fig.type === 'stemleaf') {
        figHost.appendChild(slTable({ stems: fig.stems || [], rows: fig.rows || {}, readOnly: true, given: {} }));
        if (fig.key) { var kl = el('p', 'stat-sl-key'); kl.textContent = slKeyLine(fig.key, fig.decimals === 1 ? 1 : 0, fig.unit); figHost.appendChild(kl); }
      } else if (fig.type === 'list') {
        figHost.appendChild(el('p', 'stat-list', esc((fig.values || []).join(', '))));
      }
    }
    var host = el('div', 'stat-slots');
    ctx.boardHost.appendChild(host);
    /* ON the figure for two circles; a three-circle diagram has eight regions
       and its boxes collided at 375 (the walk, 12 Sept 2026), so its slots
       stay in the list under the drawing, named in words */
    function onFig(id) { return !!(isVenn && venn && fig.type === 'venn2' && slot(id).region); }
    function cellFor(id, i) {
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
      return b;
    }
    function placeOverlay() {
      if (!overlay || !venn) return;
      /* a box stays INSIDE the frame: one that hung past the right edge made
         the frame hide 13 px behind its own overflow (the walk, 12 Sept 2026) */
      var fw = (venn.frame || figHost).clientWidth || 0, fh = (venn.frame || figHost).clientHeight || 0;
      overlay.querySelectorAll('.stat-fig-box').forEach(function (box) {
        var c = venn.regionCenter(box.getAttribute('data-region'));
        if (!c) return;
        var bw = box.offsetWidth || 44, bh = box.offsetHeight || 44;
        var x = fw ? Math.min(Math.max(c.x, bw / 2 + 1), fw - bw / 2 - 1) : c.x;
        var y = fh ? Math.min(Math.max(c.y, bh / 2 + 1), fh - bh / 2 - 1) : c.y;
        box.style.left = Math.round(x) + 'px';
        box.style.top = Math.round(y) + 'px';
      });
    }

    function slot(id) {
      var s = q.slots || [], i;
      for (i = 0; i < s.length; i++) if (s[i].id === id) return s[i];
      return { id: id, label: id };
    }
    function render() {
      stage();
      host.innerHTML = '';
      if (overlay) overlay.innerHTML = '';
      order.forEach(function (id, i) {
        if (onFig(id)) {
          var box = el('div', 'stat-fig-box');
          box.setAttribute('data-region', slot(id).region);
          box.appendChild(el('span', 'stat-fig-box-label', esc(slot(id).label)));
          box.appendChild(cellFor(id, i));
          overlay.appendChild(box);
          return;
        }
        var line = el('div', 'stat-slot');
        line.appendChild(el('span', 'stat-slot-label', esc(slot(id).label)));
        line.appendChild(cellFor(id, i));
        if (slot(id).unit) line.appendChild(el('span', 'stat-slot-unit', esc(slot(id).unit)));
        host.appendChild(line);
      });
      placeOverlay();
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
      order.forEach(function (id) {
        var cell = ctx.boardHost.querySelector('.stat-cell[aria-label="' + String(slot(id).label).replace(/"/g, '\\"') + '"]');
        if (!cell) return;
        cell.textContent = v[id] || '';
        if (v[id]) cell.setAttribute('data-placed', ''); else cell.removeAttribute('data-placed');
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
        ctx.boardHost.querySelectorAll('.stat-cell').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
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
    /* THE TABLE IS BESIDE THE CHART, NEVER BETWEEN THE CHART AND ITS
       CONTROLS (his Exercise 3, 11 Sept 2026: "a huge amount to scroll on
       the graph before I can join the dots"). It sits after the dock in the
       flow, so on a phone the Join button is directly under the board; from
       768px the stylesheet lifts it into a column beside the chart. */
    var tableWrap = el('div', 'stat-given');
    ctx.body.insertBefore(tableWrap, ctx.body.querySelector('.check-row'));
    /* THE CHART GETS THE WHOLE BODY BEFORE ANYTHING SITS BESIDE IT (steward
       re-cut, 11 Sept 2026). The stylesheet lifts the table beside the chart
       from 768px, but a chart keeps every small square at 12px (statchart law
       6) and so has a width of its own: when the body could not hold that
       width, the 20px gap and the table side by side, the grid was squeezed
       to 268 of its 347px at 1280 and 176 at 768, and the right-hand classes
       lived behind a sideways scroll nobody was told about. The decision is
       MEASURED, never a breakpoint: beside when the body can hold both, after
       the dock when it cannot, re-measured whenever the body's width changes.
       (`stat-stack` on the body turns the side column off; style.css.) */
    function layoutGiven() {
      var table = tableWrap.firstElementChild;
      if (!bd || !table || !ctx.body.clientWidth) return;
      var bcs = getComputedStyle(ctx.body);
      var inner = ctx.body.clientWidth - parseFloat(bcs.paddingLeft || 0) - parseFloat(bcs.paddingRight || 0);
      var need = bd.minWidth() + 20 + table.getBoundingClientRect().width;
      var stack = inner < need + 2;
      if (ctx.body.classList.contains('stat-stack') !== stack) ctx.body.classList.toggle('stat-stack', stack);
    }
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () { layoutGiven(); }).observe(ctx.body);
    }

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
        /* the board owns the swipe note (its own line under the grid, with the
           scroll track) - never the stage line (ruling 43/45) */
        scrollNote: T().statScrollGraph,
        onGridTap: function (x, y) {
          if (ctx.locked()) return;
          if (bd.points().length >= maxPts) { ctx.note(T().statPlotEnough); return; }
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
      layoutGiven();
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
      var join = el('button', 'btn-stage stat-join', T().statJoinPoints);
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
      ctx.say(n < maxPts ? fill(T().statStageCfplotPlace, nextPoint(n, maxPts)) : (joined ? '' : T().statStageCfplotJoin));
    }
    /* THE INSTRUCTION NAMES THE NEXT POINT (ruling 45): the first expected
       point, in x order, that is not yet on the board - "Next: across 15, up
       18" - read from the engine's own expectation, never from a table row
       the pupil has to find for herself. */
    function nextPoint(n, m) {
      /* the engine speaks in exact rationals ({n, d}); the board in numbers */
      var rv = function (r) { return (r && typeof r === 'object' && r.d) ? r.n / r.d : Number(r); };
      var want = (window.GJ_STATS.expectedPoints(q, packRulesOf(ctx) || window.GJ_STATS.DEFAULT_RULES) || [])
        .map(function (w) { return [rv(w[0]), rv(w[1])]; });
      var have = bd ? bd.points() : [];
      var miss = null;
      for (var i = 0; i < want.length && !miss; i++) {
        var w = want[i], on = false;
        for (var j = 0; j < have.length; j++) if (Math.abs(Number(have[j][0]) - w[0]) < 1e-9 && Math.abs(Number(have[j][1]) - w[1]) < 1e-9) { on = true; break; }
        if (!on) miss = w;
      }
      return { n: n, m: m, hi: miss ? window.GJ_STATCHART.fmtNum(miss[0]) : '', cf: miss ? window.GJ_STATCHART.fmtNum(miss[1]) : '' };
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
        scrollNote: T().statScrollGraph,
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
      /* A PARKED RULE READS NOTHING (12 Sept 2026). At the axis the drop met
         the curve's own start point and wrote its x on the scale - a stray
         "0" (or "70") on the opening screen of every reading question at
         375, before she had moved anything. The read-out exists once the
         rule is off the axis. */
      if (!(v > ((q.chart && q.chart.y && q.chart.y.min) || 0))) {
        if (bd.clearDrop) bd.clearDrop();
        return null;
      }
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
        ctx.say(T().statStageIqrCommit);
        var doneI = el('button', 'btn-stage', T().statThatsMine);
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
        ctx.say(fill(T().statStageCfreadAtX, { x: a.x }));
        var doneX = el('button', 'btn-stage', T().statThatsMine);
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
      ctx.say(fill(T().statStageCfread, { name: nameOf(a) }));
      var done = el('button', 'btn-stage', fill(T().statThatsMyOne, { name: nameOf(a) }));
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
        note: function (t) { ctx.note(t); },
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
      var next = el('button', 'btn-stage stat-next', T().statNextDrawBox);
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
        scrollNote: T().statScrollGraph,
        onGridTap: function (x) {
          if (ctx.locked()) return;
          /* a press on the scale with no marker chosen: the instruction
             already says "choose a marker, then..." - it stays, with its
             live count, rather than being replaced by a shorter hint */
          if (!sel) return;
          pos[sel] = x;
          sel = null;
          ctx.setStage(Object.keys(pos).length === 5 ? 'placed' : 'placing');
          paint(); ctx.changed();
        },
        onChange: function (evt) {
          if (!evt || ctx.locked()) return;
          if (evt.type === 'marker-move') { pos[evt.role] = evt.at; paint(); ctx.changed(); }
        }
      });
      fictionLine(ctx, T().statTrayFiction);
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
      var draw = el('button', 'btn-stage stat-draw', T().statDrawBoxPlot);
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
      if (Object.keys(pos).length < 5) ctx.say(fill(T().statStageBoxPlace, { n: Object.keys(pos).length }));
      else if (!drawn) ctx.say(T().statStageBoxDraw);
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
      ctx.setPill(ok1 ? 1 : 0);
      ctx.say(ok1 ? T().statStageCompare2 : T().statStageCompare1);
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
      var bank = (window.GJ_STATS && window.GJ_STATS.REASONS) || {};
      /* a question may name its bank as ids (Book A: the Q_* flaws it offers)
         or carry its own {id, text} rows when the source's wording differs */
      if (q.reasons && q.reasons.length) {
        return q.reasons.map(function (r) { return typeof r === 'string' ? { id: r, text: bank[r] || r } : r; });
      }
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
      start: function () {
        render();
        var allOptions = claims.length > 0 && claims.every(function (c) { return !!c.options; });
        ctx.say(allOptions ? T().statStageJudgeOptions : T().statStageJudge);
      },
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

  /* ══════════════════════ BOOK A — Collecting and displaying ══════════════ */

  /* ══ order — put the cards of a cycle in sequence ══════════════════════ */

  BUILD.order = function (ctx) {
    var q = ctx.q;
    var tiles = q.tiles || [];
    var seq = [];                              /* tile indices in the pupil's order */
    var host = el('div', 'stat-order');
    ctx.boardHost.appendChild(host);
    var trayWrap = el('div', 'stat-tray');
    trayWrap.setAttribute('data-tray', 'order-tiles-' + q.id);
    var rowWrap = el('div', 'stat-row stat-order-row');
    rowWrap.setAttribute('data-tray-row', '');
    host.appendChild(trayWrap); host.appendChild(rowWrap);

    function renderTray() {
      trayWrap.innerHTML = '';
      var left = [];
      tiles.forEach(function (t, i) { if (seq.indexOf(i) === -1) left.push({ t: t, i: i }); });
      /* the answer order is the cycle as authored; the tray never comes out
         in it (Part 8.2) */
      var answerKeys = (q.answer || []).map(function (i) { return tiles[i]; });
      derange(left, answerKeys, function (o) { return o.t; }, q.id).forEach(function (o) {
        var b = el('button', 'stat-tile stat-card');
        b.type = 'button';
        b.textContent = String(o.t);
        b.setAttribute('data-tray-item', '');
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked()) return;
          ctx.clearSelection();
          seq.push(o.i);
          ctx.setStage(seq.length === tiles.length ? 'ready' : 'ordering');
          render(); ctx.changed();
        });
        trayWrap.appendChild(b);
      });
    }
    function renderRow() {
      rowWrap.innerHTML = '';
      seq.forEach(function (ti, p) {
        var b = el('button', 'stat-tile stat-card stat-tile-placed');
        b.type = 'button';
        b.textContent = String(tiles[ti]);
        b.setAttribute('data-row-pos', String(p));
        ctx.selectedStage = 'selected';
        twoPress(ctx, b, function () {
          seq.splice(p, 1);
          ctx.setStage(seq.length ? 'ordering' : 'tray');
          render(); ctx.changed();
        });
        rowWrap.appendChild(b);
        if (p < seq.length - 1 || q.cyclic) {
          var arrow = el('span', 'stat-order-arrow', '→');
          arrow.setAttribute('aria-hidden', 'true');
          rowWrap.appendChild(arrow);
        }
      });
      if (q.cyclic && seq.length === tiles.length) {
        var back = el('span', 'stat-order-back', esc(String(tiles[seq[0]])));
        rowWrap.appendChild(back);
      }
    }
    function say() {
      if (seq.length === tiles.length) ctx.say(T().statStageOrderDone);
      else ctx.say(fill(T().statStageOrder, { n: tiles.length - seq.length }));
    }
    function render() { renderTray(); renderRow(); say(); window.GJ.setState(ctx.dock, 'dock', 'chips'); }

    return {
      start: function () { fictionLine(ctx, T().statTrayFictionOrder); ctx.setStage('tray'); render(); },
      reset: function () { seq = []; ctx.setStage('tray'); render(); },
      restore: function (S) {
        seq = ((S && S.seq) || []).filter(function (i) { return tiles[i] !== undefined; });
        ctx.setStage(!seq.length ? 'tray' : seq.length === tiles.length ? 'ready' : 'ordering');
        render();
      },
      state: function () { return { seq: seq.slice() }; },
      ready: function () {
        return seq.length === tiles.length ? { ok: true } : { ok: false, why: T().statOrderWhy };
      },
      lock: function () {
        host.querySelectorAll('button').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
      },
      showTruth: function () {
        var box = el('div', 'stat-truth');
        box.setAttribute('data-truth', '');
        box.textContent = (q.answer || []).map(function (i) { return tiles[i]; }).join(' → ') + (q.cyclic ? ' → …' : '');
        ctx.boardHost.appendChild(box);
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var g = el('div', 'stat-row struck');
        (((att.S || {}).seq) || []).forEach(function (i) {
          var t = el('span', 'stat-tile'); t.textContent = String(tiles[i]); g.appendChild(t);
        });
        holder.appendChild(g);
      }
    };
  };

  /* ══ pick — choose the better question, then say why the others fall short ═ */

  BUILD.pick = function (ctx) {
    var q = ctx.q;
    var options = q.options || [];
    var pick = null, why = null;
    var host = el('div', 'stat-pick');
    ctx.boardHost.appendChild(host);

    function bank() {
      var all = (window.GJ_STATS && window.GJ_STATS.REASONS) || {};
      var ids = q.reasons && q.reasons.length ? q.reasons.slice() : Object.keys(all).filter(function (id) { return id.indexOf('Q_') === 0; });
      return ids.map(function (id) { return typeof id === 'string' ? { id: id, text: all[id] || id } : id; });
    }
    function render() {
      host.innerHTML = '';
      var tray = el('div', 'stat-options');
      tray.setAttribute('data-tray', 'pick-options-' + q.id);
      /* the answer order is the authored order (the best one is where the
         source printed it); the tray never comes out in it */
      var laid = derange(options.map(function (o, i) { return { o: o, i: i }; }),
        options.map(function (o) { return o.text; }), function (x) { return x.o.text; }, q.id);
      laid.forEach(function (x) {
        var b = el('button', 'stat-option');
        b.type = 'button';
        b.setAttribute('data-tray-item', '');
        b.setAttribute('aria-pressed', pick === x.i ? 'true' : 'false');
        b.appendChild(el('span', 'stat-option-text', esc(x.o.text)));
        if (x.o.boxes && x.o.boxes.length) {
          var bx = el('span', 'stat-option-boxes');
          x.o.boxes.forEach(function (t) { bx.appendChild(el('span', 'stat-option-box', '☐ ' + esc(t))); });
          b.appendChild(bx);
        }
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked()) return;
          pick = x.i; why = null;
          ctx.setStage('picked');
          render(); ctx.changed();
        });
        tray.appendChild(b);
      });
      host.appendChild(tray);
      if (pick !== null) {
        var rg = el('div', 'stat-chips stat-reasons');
        rg.setAttribute('data-tray', 'pick-why-' + q.id);
        var bk = bank();
        derange(bk, bk.map(function (r) { return r.id; }), function (r) { return r.id; }, q.id + 'w').forEach(function (r) {
          var b = el('button', 'chip chip-reason');
          b.type = 'button';
          b.textContent = r.text;
          b.setAttribute('data-tray-item', '');
          b.setAttribute('data-reason', r.id);
          b.setAttribute('aria-pressed', why === r.id ? 'true' : 'false');
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (ctx.locked()) return;
            why = r.id;
            ctx.setStage('ready');
            render(); ctx.changed();
          });
          rg.appendChild(b);
        });
        host.appendChild(rg);
      }
      ctx.say(pick === null ? T().statStagePick : T().statStagePickWhy);
      window.GJ.setState(ctx.dock, 'dock', 'chips');
    }

    return {
      start: function () { ctx.setStage('empty'); render(); },
      reset: function () { pick = null; why = null; ctx.setStage('empty'); render(); },
      restore: function (S) {
        pick = (S && S.pick !== undefined && S.pick !== null && options[S.pick]) ? S.pick : null;
        why = (S && S.why) || null;
        ctx.setStage(pick === null ? 'empty' : (why ? 'ready' : 'picked'));
        render();
      },
      state: function () { return { pick: pick, why: why }; },
      ready: function () {
        if (pick === null) return { ok: false, why: T().statPickWhy };
        if (!why) return { ok: false, why: T().statPickWhyWhy };
        return { ok: true };
      },
      lock: function () {
        host.querySelectorAll('button').forEach(function (b) {
          b.disabled = true; setLockedWhy(b, T().statAlreadyMarked);
          if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('data-placed', '');
        });
      },
      showTruth: function () {
        var box = el('div', 'stat-truth');
        box.setAttribute('data-truth', '');
        var best = options.filter(function (o) { return o.best; })[0];
        box.textContent = best ? best.text : '';
        ctx.boardHost.appendChild(box);
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var g = el('div', 'stat-row struck');
        var S = att.S || {};
        var t = el('span', 'stat-tile');
        t.textContent = (options[S.pick] || {}).text || '—';
        g.appendChild(t);
        holder.appendChild(g);
      }
    };
  };

  /* ══ stemleaf — the shared diagram, then the kind ══════════════════════ */

  /* WHAT A VALUE'S STEM AND LEAF ARE. The engine's rule is the truth
     (GJ_STATS.stemLeafOf); this is the same split, kept here only so the
     board can draw before the engine has loaded in a scratch page. */
  function stemLeafOf(v, decimals) {
    if (window.GJ_STATS && window.GJ_STATS.stemLeafOf) return window.GJ_STATS.stemLeafOf(v, decimals);
    var n = Number(v);
    if (decimals === 1) { var st = Math.floor(n + 1e-9); return { stem: st, leaf: Math.round((n - st) * 10) }; }
    return { stem: Math.floor(n / 10), leaf: Math.round(n - Math.floor(n / 10) * 10) };
  }
  function slValueText(stem, leaf, decimals) {
    return decimals === 1 ? (stem + '.' + leaf) : String(stem * 10 + leaf);
  }
  function slMeans(stem, leaf, decimals, unit) {
    return slValueText(stem, leaf, decimals) + (unit ? ' ' + unit : '');
  }
  /* the diagram, as HTML (a table she reads; its digits are text the
     readability law measures). o.rows = the pupil's leaves per stem (buttons,
     two-press); o.given = locked leaves per stem (spans); o.back = the given
     other side, growing leftward; o.onZone(stem) = a press on a stem row. */
  function slTable(o) {
    var t = el('table', 'stat-sl');
    var tt = T();
    if (o.back) {
      var hr = el('tr');
      hr.appendChild(el('th', 'stat-sl-side', esc(o.back.label || '')));
      hr.appendChild(el('th', 'stat-sl-stem-head', esc(tt.statSlStem)));
      hr.appendChild(el('th', 'stat-sl-side', esc(o.mine || '')));
      t.appendChild(hr);
    }
    (o.stems || []).forEach(function (stem) {
      var tr = el('tr');
      tr.setAttribute('data-stem-row', String(stem));
      if (o.back) {
        var bc = el('td', 'stat-sl-back');
        /* leaves grow AWAY from the stem: smallest nearest it */
        ((o.back.rows || {})[String(stem)] || []).slice().reverse().forEach(function (d) {
          bc.appendChild(el('span', 'stat-sl-leaf stat-sl-given', esc(String(d))));
        });
        tr.appendChild(bc);
      }
      tr.appendChild(el('th', 'stat-sl-stem', esc(String(stem))));
      var cell = el('td', 'stat-sl-cell');
      ((o.given || {})[String(stem)] || []).forEach(function (d) {
        cell.appendChild(el('span', 'stat-sl-leaf stat-sl-given', esc(String(d))));
      });
      ((o.rows || {})[String(stem)] || []).forEach(function (d, idx) {
        if (o.readOnly) { cell.appendChild(el('span', 'stat-sl-leaf', esc(String(d)))); return; }
        var b = el('button', 'stat-sl-leaf');
        b.type = 'button';
        b.textContent = String(d);
        b.setAttribute('data-stem', String(stem));
        b.setAttribute('data-leaf-pos', String(idx));
        if (o.onLeaf) o.onLeaf(b, stem, idx);
        cell.appendChild(b);
      });
      if (o.onZone && !o.readOnly) {
        var z = el('button', 'stat-sl-zone');
        z.type = 'button';
        z.setAttribute('data-stem', String(stem));
        z.setAttribute('aria-label', tt.statSlStem + ' ' + stem);
        z.textContent = '+';
        z.addEventListener('click', function (e) { e.stopPropagation(); o.onZone(stem); });
        cell.appendChild(z);
      }
      tr.appendChild(cell);
      t.appendChild(tr);
    });
    return t;
  }
  function slKeyLine(key, decimals, unit) {
    var tt = T();
    if (!key || key.stem === undefined || key.stem === null || key.stem === '' || key.leaf === undefined || key.leaf === null || key.leaf === '') return '';
    var means = key.means || slMeans(Number(key.stem), Number(key.leaf), decimals, unit);
    return fill(tt.statSlKeyLine, { stem: key.stem, leaf: key.leaf, means: means });
  }

  BUILD.stemleaf = function (ctx) {
    var q = ctx.q;
    var decimals = q.decimals === 1 ? 1 : 0;
    var values = (q.values || []).slice();
    var stems = (q.stems || []).slice();
    var askKey = !!(q.key && q.key.ask);
    /* the GIVEN leaves: prefilled stems are drawn and locked, and the values
       they hold are not the pupil's to place */
    var given = {}, mine = [];
    var doneStems = (q.prefill && q.prefill.stemsDone) || [];
    values.forEach(function (v, i) {
      var sl = stemLeafOf(v, decimals);
      if (doneStems.indexOf(sl.stem) > -1) { (given[String(sl.stem)] = given[String(sl.stem)] || []).push(sl.leaf); }
      else mine.push(i);
    });
    Object.keys(given).forEach(function (k) { given[k].sort(function (a, b) { return a - b; }); });
    var backRows = null;
    if (q.back && q.back.values) {
      backRows = {};
      q.back.values.forEach(function (v) {
        var sl = stemLeafOf(v, decimals);
        (backRows[String(sl.stem)] = backRows[String(sl.stem)] || []).push(sl.leaf);
      });
      Object.keys(backRows).forEach(function (k) { backRows[k].sort(function (a, b) { return a - b; }); });
    }

    var rows = {};                 /* stem -> [{i (value index), leaf}] in placed order */
    var picked = null;             /* a tray value index waiting for a stem */
    var key = { stem: '', leaf: '' };
    var host = el('div', 'stat-stemleaf');
    ctx.boardHost.appendChild(host);
    var trayWrap = el('div', 'stat-tray');
    trayWrap.setAttribute('data-tray', 'stemleaf-leaves-' + q.id);
    var diagram = el('div', 'stat-sl-host');
    diagram.setAttribute('data-work', '');
    var keyWrap = el('div', 'stat-sl-keywrap');
    host.appendChild(trayWrap); host.appendChild(diagram); host.appendChild(keyWrap);

    function placedIdx() { var out = []; Object.keys(rows).forEach(function (k) { rows[k].forEach(function (r) { out.push(r.i); }); }); return out; }
    function allPlaced() { return placedIdx().length === mine.length; }
    function keyDone() { return key.stem !== '' && key.leaf !== ''; }
    function stage() {
      var n = placedIdx().length;
      if (picked !== null) return ctx.setStage('leaf-selected');
      if (!n) return ctx.setStage('tray');
      if (n < mine.length) return ctx.setStage('placing');
      if (askKey && !keyDone()) return ctx.setStage('key');
      ctx.setStage('ready');
    }
    function renderTray() {
      trayWrap.innerHTML = '';
      var left = mine.filter(function (i) { return placedIdx().indexOf(i) === -1; })
        .map(function (i) { return { i: i, v: values[i] }; });
      var answerKeys = ascendingKeys(left.map(function (o) { return o.v; }));
      derange(left, answerKeys, function (o) { return o.v; }, q.id).forEach(function (o) {
        var b = el('button', 'stat-tile' + (picked === o.i ? ' is-selected' : ''));
        b.type = 'button';
        b.textContent = String(o.v);
        b.setAttribute('data-tray-item', '');
        if (picked === o.i) b.setAttribute('aria-current', 'true');
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked()) return;
          ctx.clearSelection();
          picked = (picked === o.i) ? null : o.i;
          render(); ctx.changed();
        });
        trayWrap.appendChild(b);
      });
    }
    function renderDiagram() {
      diagram.innerHTML = '';
      var rowDigits = {};
      Object.keys(rows).forEach(function (k) { rowDigits[k] = rows[k].map(function (r) { return r.leaf; }); });
      diagram.appendChild(slTable({
        stems: stems, given: given, rows: rowDigits, back: backRows ? { label: q.back.label, rows: backRows } : null,
        mine: q.back ? (q.back.mine || '') : '',
        onZone: function (stem) {
          if (ctx.locked() || picked === null) { if (picked === null) ctx.note(T().statStageSlPlace ? '' : ''); return; }
          var sl = stemLeafOf(values[picked], decimals);
          (rows[String(stem)] = rows[String(stem)] || []).push({ i: picked, leaf: sl.leaf });
          picked = null;
          render(); ctx.changed();
        },
        onLeaf: function (b, stem, idx) {
          ctx.selectedStage = 'leaf-selected';
          twoPress(ctx, b, function () {
            rows[String(stem)].splice(idx, 1);
            if (!rows[String(stem)].length) delete rows[String(stem)];
            render(); ctx.changed();
          });
        }
      }));
    }
    function renderKey() {
      keyWrap.innerHTML = '';
      var line = el('p', 'stat-sl-key');
      line.setAttribute('data-board-label', '');
      if (askKey) {
        if (allPlaced()) {
          var ks = el('div', 'stat-chips stat-sl-keytray');
          ks.setAttribute('data-tray', 'stemleaf-keystem-' + q.id);
          ks.appendChild(el('span', 'stat-sl-keylabel', esc(T().statSlKeyStem)));
          derange(stems.map(function (x) { return { v: x }; }), stems.slice(), function (o) { return o.v; }, q.id + 'ks').forEach(function (o) {
            var b = el('button', 'chip');
            b.type = 'button'; b.textContent = String(o.v);
            b.setAttribute('data-tray-item', '');
            b.setAttribute('aria-pressed', String(key.stem) === String(o.v) ? 'true' : 'false');
            b.addEventListener('click', function (e) { e.stopPropagation(); if (ctx.locked()) return; key.stem = String(o.v); render(); ctx.changed(); });
            ks.appendChild(b);
          });
          var kl = el('div', 'stat-chips stat-sl-keytray');
          kl.setAttribute('data-tray', 'stemleaf-keyleaf-' + q.id);
          kl.appendChild(el('span', 'stat-sl-keylabel', esc(T().statSlKeyLeaf)));
          var digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
          derange(digits.map(function (x) { return { v: x }; }), digits.slice(), function (o) { return o.v; }, q.id + 'kl').forEach(function (o) {
            var b = el('button', 'chip');
            b.type = 'button'; b.textContent = String(o.v);
            b.setAttribute('data-tray-item', '');
            b.setAttribute('aria-pressed', String(key.leaf) === String(o.v) ? 'true' : 'false');
            b.addEventListener('click', function (e) { e.stopPropagation(); if (ctx.locked()) return; key.leaf = String(o.v); render(); ctx.changed(); });
            kl.appendChild(b);
          });
          keyWrap.appendChild(ks); keyWrap.appendChild(kl);
        }
        line.textContent = slKeyLine(key, decimals, q.unit);
      } else if (q.key && q.key.stem !== undefined) {
        line.textContent = slKeyLine(q.key, decimals, q.unit);
      }
      if (line.textContent) keyWrap.appendChild(line);
    }
    function say() {
      var n = placedIdx().length;
      if (n < mine.length) ctx.say(fill(T().statStageSlPlace, { n: n, m: mine.length }));
      else if (askKey && !keyDone()) ctx.say(T().statStageSlKey);
      else ctx.say(T().statStageSlDone);
    }
    function render() { stage(); renderTray(); renderDiagram(); renderKey(); say(); window.GJ.setState(ctx.dock, 'dock', 'chips'); }
    function stateRows() {
      var out = {};
      Object.keys(rows).forEach(function (k) { out[k] = rows[k].map(function (r) { return String(r.leaf); }); });
      return out;
    }

    return {
      start: function () { fictionLine(ctx, T().statTrayFictionLeaves); render(); },
      reset: function () { rows = {}; picked = null; key = { stem: '', leaf: '' }; render(); },
      restore: function (S) {
        rows = {}; picked = null;
        var used = [];
        Object.keys((S && S.rows) || {}).forEach(function (k) {
          S.rows[k].forEach(function (d) {
            /* find an unplaced value of mine with this stem and leaf */
            var found = mine.filter(function (i) {
              if (used.indexOf(i) > -1) return false;
              var sl = stemLeafOf(values[i], decimals);
              return String(sl.leaf) === String(d);
            })[0];
            if (found === undefined) return;
            used.push(found);
            (rows[k] = rows[k] || []).push({ i: found, leaf: Number(d) });
          });
        });
        key = { stem: (S && S.key && S.key.stem) || '', leaf: (S && S.key && S.key.leaf !== undefined && S.key.leaf !== null) ? String(S.key.leaf) : '' };
        if (key.stem !== '') key.stem = String(key.stem);
        render();
      },
      state: function () {
        var S = { rows: stateRows() };
        if (askKey) S.key = { stem: key.stem, leaf: key.leaf };
        return S;
      },
      ready: function () {
        if (!allPlaced()) return { ok: false, why: T().statSlWhy };
        if (askKey && !keyDone()) return { ok: false, why: T().statSlKeyWhy };
        return { ok: true };
      },
      lock: function () {
        host.querySelectorAll('button').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
      },
      showTruth: function () {
        var box = el('div', 'stat-truth');
        box.setAttribute('data-truth', '');
        var truth = {};
        mine.forEach(function (i) { var sl = stemLeafOf(values[i], decimals); (truth[String(sl.stem)] = truth[String(sl.stem)] || []).push(sl.leaf); });
        Object.keys(truth).forEach(function (k) { truth[k].sort(function (a, b) { return a - b; }); });
        /* the same scrolling host as the board's own diagram: at 375 a
           back-to-back table is wider than the paper (the walk, 12 Sept 2026) */
        var truthHost = el('div', 'stat-sl-host');
        truthHost.appendChild(slTable({ stems: stems, given: given, rows: truth, readOnly: true,
          back: backRows ? { label: q.back.label, rows: backRows } : null, mine: q.back ? (q.back.mine || '') : '' }));
        box.appendChild(truthHost);
        ctx.boardHost.appendChild(box);
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var S = att.S || {};
        var g = el('div', 'stat-row struck');
        Object.keys(S.rows || {}).forEach(function (k) {
          var t = el('span', 'stat-tile'); t.textContent = k + ' | ' + (S.rows[k] || []).join(' '); g.appendChild(t);
        });
        holder.appendChild(g);
      }
    };
  };

  /* ══ pie — the angle table, then the circle, then the labels ═══════════ */

  BUILD.pie = function (ctx) {
    var q = ctx.q;
    var cats = q.cats || [];
    var angles = {}, bounds = [], labels = {};      /* bounds: the n-1 placed, in cats order */
    var open = -1, pad = null, drawn = false, pickedLabel = null, selBound = -1, pieBd = null;
    var host = el('div', 'stat-pie');
    ctx.boardHost.appendChild(host);
    var tableWrap = el('div', 'stat-pie-table');
    var boardWrap = el('div', 'stat-board-host stat-pie-host');
    boardWrap.setAttribute('data-work', '');
    var labelTray = el('div', 'stat-tray stat-pie-labelwrap');
    labelTray.setAttribute('data-tray', 'pie-labels-' + q.id);
    host.appendChild(tableWrap); host.appendChild(boardWrap); host.appendChild(labelTray);
    var overlay = null;

    function nAng() { return cats.filter(function (c) { return !!angles[c.id]; }).length; }
    function tableDone() { return nAng() === cats.length; }
    function nBounds() { return bounds.length; }
    function boundsDone() { return nBounds() >= cats.length - 1; }
    function nLabels() { return Object.keys(labels).length; }
    function labelsDone() { return nLabels() === cats.length; }
    function inRim() { return tableDone() && stageIsRim; }
    var stageIsRim = false;

    function stage() {
      if (!stageIsRim) ctx.setStage(tableDone() ? 'table-done' : 'table');
      else if (!drawn) ctx.setStage(boundsDone() ? 'bounds-done' : 'rim');
      else ctx.setStage(labelsDone() ? 'ready' : 'drawn');
    }
    function renderTable() {
      tableWrap.innerHTML = '';
      var t = el('table', 'stat-table');
      var hr = el('tr');
      hr.appendChild(el('th', null, esc(q.catHead || T().statPieCategory)));
      hr.appendChild(el('th', null, esc(T().statPieNumber)));
      hr.appendChild(el('th', null, esc(T().statPieAngle)));
      t.appendChild(hr);
      cats.forEach(function (c, i) {
        var tr = el('tr');
        tr.appendChild(el('td', null, esc(c.label)));
        tr.appendChild(el('td', null, esc(String(c.f))));
        var td = el('td', 'stat-pie-angle');
        var b = el('button', 'stat-cell' + (open === i ? ' is-open' : ''));
        b.type = 'button';
        b.textContent = angles[c.id] ? angles[c.id] + '°' : '';
        if (angles[c.id]) b.setAttribute('data-placed', '');
        b.setAttribute('aria-label', fill(T().statPieAngleLabel, { label: c.label }));
        b.disabled = stageIsRim;
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked() || stageIsRim) return;
          open = i; render(); ctx.changed();
        });
        td.appendChild(b);
        tr.appendChild(td);
        t.appendChild(tr);
      });
      /* the totals row: the paper's total, and the running sum of HER angles -
         the self-check the SUM unit pays for, never the 360 it should be */
      var tot = el('tr', 'stat-pie-total');
      tot.appendChild(el('td', null, esc(T().statPieTotal)));
      tot.appendChild(el('td', null, esc(String(q.total))));
      var sum = 0, any = false;
      cats.forEach(function (c) { var v = Number(angles[c.id]); if (angles[c.id] && !isNaN(v)) { sum += v; any = true; } });
      var sumCell = el('td', 'stat-pie-sum', esc(any ? fill(T().statPieDegrees, { deg: Math.round(sum * 10) / 10 }) : T().statPieNoAngles));
      sumCell.setAttribute('data-board-label', '');
      tot.appendChild(sumCell);
      t.appendChild(tot);
      tableWrap.appendChild(t);
    }
    function buildBoard() {
      boardWrap.innerHTML = '';
      pieBd = null;
      if (!stageIsRim) return;
      pieBd = window.GJ_STATCHART.pie(boardWrap, {
        onRimTap: function (deg) {
          if (ctx.locked() || drawn) return;
          if (boundsDone()) { ctx.note(T().statStagePieBoundsDone); return; }
          deg = Math.round(deg);
          bounds.push(deg);
          selBound = bounds.length - 1;
          pieBd.boundary(deg, { placed: true });
          after();
        },
        onBoundaryMove: function (i, deg) {
          if (ctx.locked() || drawn) return;
          bounds[i] = Math.round(deg); selBound = i;
          after();
        },
        onBoundaryPress: function (i) {
          if (ctx.locked() || drawn) return;
          selBound = i; after();
        },
        onSectorPress: function (i) {
          if (ctx.locked() || !drawn || pickedLabel === null) return;
          /* one label per sector: the label moves if it was somewhere else */
          Object.keys(labels).forEach(function (k) { if (labels[k] === pickedLabel) delete labels[k]; });
          labels[String(i)] = pickedLabel;
          pickedLabel = null;
          after();
        }
      });
      overlay = el('div', 'stat-fig-overlay');
      pieBd.frame.appendChild(overlay);
      bounds.forEach(function (d) { pieBd.boundary(d, { placed: true }); });
      if (drawn) drawSectors(true);
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { placeLabels(); }).observe(pieBd.frame);
    }
    function runningBounds() {
      var out = [], acc = 0;
      bounds.forEach(function (b) { out.push(b); });
      return out;
    }
    function drawSectors(instant) {
      if (!pieBd) return;
      pieBd.clearSectors();
      var from = 0;
      var all = bounds.slice(0, cats.length - 1).concat([360]);
      all.forEach(function (to, i) {
        pieBd.sector(from, to, i, { instant: !!instant, press: true });
        from = to;
      });
    }
    function placeLabels() {
      if (!overlay || !pieBd) return;
      overlay.innerHTML = '';
      if (!drawn) return;
      var all = bounds.slice(0, cats.length - 1).concat([360]);
      var from = 0;
      all.forEach(function (to, i) {
        var cid = labels[String(i)];
        if (cid) {
          var cat = cats.filter(function (c) { return c.id === cid; })[0];
          var pt = pieBd.labelPoint(from, to);
          var lb = el('button', 'stat-pie-label');
          lb.type = 'button';
          lb.setAttribute('data-placed', '');
          lb.setAttribute('data-sector', String(i));
          lb.textContent = cat ? cat.label : cid;
          lb.style.left = Math.round(pt.x) + 'px'; lb.style.top = Math.round(pt.y) + 'px';
          ctx.selectedStage = 'drawn';
          twoPress(ctx, lb, function () { delete labels[String(i)]; after(); });
          overlay.appendChild(lb);
        }
        from = to;
      });
    }
    function renderLabelTray() {
      labelTray.innerHTML = '';
      if (!drawn) return;
      var used = Object.keys(labels).map(function (k) { return labels[k]; });
      var left = cats.filter(function (c) { return used.indexOf(c.id) === -1; });
      derange(left, cats.map(function (c) { return c.id; }), function (c) { return c.id; }, q.id + 'lb').forEach(function (c) {
        var b = el('button', 'stat-tile stat-card' + (pickedLabel === c.id ? ' is-selected' : ''));
        b.type = 'button';
        b.textContent = c.label;
        b.setAttribute('data-tray-item', '');
        if (pickedLabel === c.id) b.setAttribute('aria-current', 'true');
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked()) return;
          pickedLabel = pickedLabel === c.id ? null : c.id;
          renderLabelTray();
        });
        labelTray.appendChild(b);
      });
    }
    function renderDock() {
      ctx.dock.innerHTML = '';
      pad = null;
      if (!stageIsRim) {
        if (open > -1 && cats[open]) {
          var c = cats[open];
          window.GJ.setState(ctx.dock, 'dock', 'numpad-fraction');
          pad = makeNumPad(ctx.dock, {
            label: fill(T().statPieAngleLabel, { label: c.label }), fraction: false, decimal: true,
            onChange: function (val) { angles[c.id] = val; renderTable(); stage(); say(); ctx.changed(); }
          });
          pad.set(angles[c.id] || '');
          if (open < cats.length - 1) {
            var next = el('button', 'btn-quiet', T().statNextRow);
            next.type = 'button';
            next.addEventListener('click', function (e) { e.stopPropagation(); open++; render(); });
            ctx.dock.appendChild(next);
          }
        } else window.GJ.setState(ctx.dock, 'dock', 'chips');
        var go = el('button', 'btn-stage stat-next', T().statPieNextRim);
        go.type = 'button';
        go.disabled = !tableDone();
        if (go.disabled) setLockedWhy(go, T().statPieWhyTable);
        go.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked() || go.disabled) return;
          stageIsRim = true; open = -1;
          renderTable(); buildBoard(); after();
        });
        ctx.dock.appendChild(go);
        return;
      }
      if (!drawn) {
        if (selBound > -1 && bounds[selBound] !== undefined) {
          window.GJ.setState(ctx.dock, 'dock', 'nudge-pad');
          ctx.dock.appendChild(nudgePad(ctx, {
            onNudge: function (dx, dy) {
              var step = dx !== 0 ? dx : -dy;          /* right/up = clockwise one degree */
              var d = ((bounds[selBound] + step) % 360 + 360) % 360;
              bounds[selBound] = d;
              pieBd.boundary(d, { i: selBound });
              after();
            },
            onRemove: function () {
              pieBd.removeBoundary(selBound);
              bounds.splice(selBound, 1);
              selBound = -1;
              after();
            }
          }));
          if (pieBd) pieBd.readout(fill(T().statPieReadout, { deg: bounds[selBound] }));
        } else { window.GJ.setState(ctx.dock, 'dock', 'chips'); if (pieBd) pieBd.clearReadout(); }
        var draw = el('button', 'btn-stage stat-draw', T().statPieDraw);
        draw.type = 'button';
        draw.disabled = !boundsDone();
        if (draw.disabled) setLockedWhy(draw, T().statPieWhyRim);
        draw.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked() || draw.disabled) return;
          drawn = true; selBound = -1;
          if (pieBd) pieBd.clearReadout();
          drawSectors(false);
          after();
        });
        ctx.dock.appendChild(draw);
        return;
      }
      window.GJ.setState(ctx.dock, 'dock', 'chips');
    }
    function say() {
      if (!stageIsRim) ctx.say(tableDone() ? T().statStagePieTableDone : fill(T().statStagePieTable, { n: nAng(), m: cats.length }));
      else if (!drawn) ctx.say(boundsDone() ? T().statStagePieBoundsDone : fill(T().statStagePieRim, { n: nBounds(), m: cats.length - 1 }));
      else ctx.say(labelsDone() ? '' : fill(T().statStagePieLabels, { n: nLabels(), m: cats.length }));
    }
    function after() { stage(); placeLabels(); renderLabelTray(); renderDock(); say(); ctx.changed(); }
    function render() { stage(); renderTable(); renderDock(); say(); }

    return {
      start: function () { stageIsRim = false; render(); },
      reset: function () {
        angles = {}; bounds = []; labels = {}; open = -1; drawn = false; pickedLabel = null; selBound = -1; stageIsRim = false;
        buildBoard(); render();
      },
      restore: function (S) {
        S = S || {};
        angles = S.angles || {};
        bounds = (S.bounds || []).slice(0, cats.length - 1).map(Number).filter(function (x) { return !isNaN(x); });
        labels = S.labels || {};
        drawn = !!S.drawn;
        stageIsRim = drawn || bounds.length > 0 || !!S.rim;
        open = -1; selBound = -1; pickedLabel = null;
        renderTable(); buildBoard(); after();
      },
      state: function () {
        var S = { angles: angles, bounds: bounds.slice(0, cats.length - 1).concat([360]), labels: labels };
        if (drawn) S.drawn = true;
        if (stageIsRim) S.rim = true;
        return S;
      },
      ready: function () {
        if (!tableDone()) return { ok: false, why: T().statPieWhyTable };
        if (!boundsDone()) return { ok: false, why: T().statPieWhyRim };
        if (!drawn) return { ok: false, why: T().statPieWhyDraw };
        if (!labelsDone()) return { ok: false, why: T().statPieWhyLabels };
        return { ok: true };
      },
      lock: function () {
        ctx.dock.innerHTML = '';
        host.querySelectorAll('button').forEach(function (b) { b.disabled = true; setLockedWhy(b, T().statAlreadyMarked); });
      },
      showTruth: function () {
        var box = el('div', 'stat-truth');
        box.setAttribute('data-truth', '');
        var tot = Number(q.total) || cats.reduce(function (a, c) { return a + Number(c.f); }, 0);
        box.textContent = cats.map(function (c) { return c.label + ' ' + (Number(c.f) * 360 / tot) + '°'; }).join(' · ');
        ctx.boardHost.appendChild(box);
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var S = att.S || {};
        var g = el('div', 'stat-row struck');
        cats.forEach(function (c) { var t = el('span', 'stat-tile'); t.textContent = ((S.angles || {})[c.id] || '—') + '°'; g.appendChild(t); });
        holder.appendChild(g);
      },
      board: function () {
        if (!pieBd) return null;
        /* the drive channel speaks the SVG's own user units (pressGrid maps
           them to client px); rimUser/degAtUser are that space */
        return { toPx: function (deg) { return pieBd.rimUser(deg); }, toAxis: function (px, py) { return pieBd.degAtUser(px, py); }, snap: pieBd.snap, svg: pieBd.svg };
      }
    };
  };

  /* ══ scatter — plot, the line of best fit, an estimate, the correlation ══ */

  BUILD.scatter = function (ctx) {
    var q = ctx.q;
    var given = q.given || [], toPlot = q.toPlot || [];
    var asks = (q.asks || []).filter(Boolean);
    var askOf = function (t) { return asks.filter(function (a) { return a.type === t; })[0] || null; };
    var order = ['plotting'].concat(asks.map(function (a) { return a.type === 'lobf' ? 'line' : a.type === 'estimate' ? 'estimate' : a.type === 'corr' ? 'corr' : 'outlier'; }));
    var step = 0;                     /* index into `order` */
    var sel = -1, bd = null, est = '', corr = null, outlier = null, pad = null, lineDone = false;
    var boardWrap = el('div', 'stat-board-host stat-scatter');
    boardWrap.setAttribute('data-work', '');
    ctx.boardHost.appendChild(boardWrap);
    var tableWrap = el('div', 'stat-given');
    ctx.body.insertBefore(tableWrap, ctx.body.querySelector('.check-row'));
    var lines = el('div', 'wlines stat-lines');
    ctx.boardHost.appendChild(lines);
    var sq = q.chart && q.chart.sq ? q.chart.sq : { x: 1, y: 1 };

    function layoutGiven() {
      var table = tableWrap.firstElementChild;
      if (!bd || !table || !ctx.body.clientWidth) return;
      var bcs = getComputedStyle(ctx.body);
      var inner = ctx.body.clientWidth - parseFloat(bcs.paddingLeft || 0) - parseFloat(bcs.paddingRight || 0);
      var need = bd.minWidth() + 20 + table.getBoundingClientRect().width;
      var stack = inner < need + 2;
      if (ctx.body.classList.contains('stat-stack') !== stack) ctx.body.classList.toggle('stat-stack', stack);
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { layoutGiven(); }).observe(ctx.body);

    function givenTable() {
      tableWrap.innerHTML = '';
      if (!q.table) return;
      var t = el('table', 'stat-table');
      var hr = el('tr');
      (q.table.head || []).forEach(function (h) { hr.appendChild(el('th', null, esc(h))); });
      t.appendChild(hr);
      (q.table.rows || []).forEach(function (r) {
        var tr = el('tr');
        r.forEach(function (c) { tr.appendChild(el('td', null, esc(String(c)))); });
        t.appendChild(tr);
      });
      tableWrap.appendChild(t);
    }
    function cur() { return order[step]; }
    function plotted() { return bd ? bd.points().length : 0; }
    function allPlotted() { return plotted() >= toPlot.length; }
    function build() {
      boardWrap.innerHTML = '';
      bd = window.GJ_STATCHART.render(boardWrap, q.chart, {
        scrollNote: T().statScrollGraph,
        /* a chart may let a point sit on a half small square (chart.snap 2):
           the paper's 0.2 km squares with data to 0.1 km */
        snapDivisor: (q.chart && Number(q.chart.snap) >= 1) ? Number(q.chart.snap) : 1,
        onGridTap: function (x, y) {
          if (ctx.locked() || cur() !== 'plotting') return;
          if (allPlotted()) { ctx.note(T().statPlotEnough); return; }
          sel = bd.addPoint(x, y, { select: true });
          after();
        },
        onChange: function (evt) {
          if (!evt || ctx.locked()) return;
          if (evt.type === 'point-select' || evt.type === 'point-move') { if (cur() === 'plotting') sel = evt.i; }
          if (evt.type === 'lobf-move') { lineDone = true; }
          after();
        }
      });
      given.forEach(function (pt) { bd.addPoint(Number(pt[0]), Number(pt[1]), { given: true }); });
      layoutGiven();
    }
    function ensureLine() {
      if (!bd || bd.handles().length >= 2) return;
      /* a neutral flat line through the middle of the chart: no hint of the
         slope, both handles well inside the frame */
      var cx = q.chart.x, cy = q.chart.y;
      var xr = cx.max - cx.min, yr = cy.max - cy.min;
      var midY = cy.min + Math.round((yr / 2) / sq.y) * sq.y;
      var x1 = cx.min + Math.round((xr / 4) / sq.x) * sq.x, x2 = cx.min + Math.round((3 * xr / 4) / sq.x) * sq.x;
      bd.handleAt(x1, midY, 0);
      bd.handleAt(x2, midY, 1);
    }
    function estimateSetup() {
      var a = askOf('estimate');
      if (!a || !bd) return;
      if (a.from === 'y') bd.rule(Number(a.at)); else bd.ruleX(Number(a.at));
      bd.drop();
    }
    function stage() {
      var c = cur();
      /* the last ask, answered, IS the finished board */
      if (step >= order.length - 1 && stepDone()) { ctx.setStage('ready'); return; }
      if (c === 'plotting') ctx.setStage(allPlotted() && order.length > 1 ? 'plotted' : 'plotting');
      else if (c === 'line') ctx.setStage('line');
      else if (c === 'estimate') ctx.setStage('estimate');
      else if (c === 'corr') ctx.setStage('corr');
      else if (c === 'outlier') ctx.setStage('outlier');
      else ctx.setStage('ready');
    }
    function nextLabel() {
      var n = order[step + 1];
      return n === 'line' ? T().statScNextLine : n === 'estimate' ? T().statScNextEst : n === 'corr' ? T().statScNextCorr : n === 'outlier' ? T().statScNextOutlier : '';
    }
    function stepDone() {
      var c = cur();
      if (c === 'plotting') return allPlotted();
      if (c === 'line') return lineDone;
      if (c === 'estimate') return est !== '';
      if (c === 'corr') return !!corr;
      if (c === 'outlier') return outlier !== null;
      return true;
    }
    function advance() {
      if (step >= order.length - 1) { step = order.length; return; }
      step++;
      sel = -1;
      bd.enablePress(null);
      if (cur() === 'line') { ensureLine(); }
      if (cur() === 'estimate') { estimateSetup(); }
      if (cur() === 'outlier') { bd.enablePress(function (i) { if (ctx.locked()) return; outlier = i; bd.markOutlier(i); after(); }); }
    }
    function renderDock() {
      ctx.dock.innerHTML = '';
      pad = null;
      var c = cur();
      if (c === 'plotting' && sel > -1 && bd.points().length) {
        window.GJ.setState(ctx.dock, 'dock', 'nudge-pad');
        ctx.dock.appendChild(nudgePad(ctx, {
          onNudge: function (dx, dy) {
            var all = bd.allPoints().filter(function (p) { return p.i === sel; })[0];
            if (!all) return;
            bd.movePoint(sel, all.x + dx * sq.x, all.y + dy * sq.y);
            after();
          },
          onRemove: function () { bd.removePoint(sel); sel = -1; after(); }
        }));
      } else if (c === 'estimate') {
        var a = askOf('estimate');
        window.GJ.setState(ctx.dock, 'dock', 'numpad-fraction');
        pad = makeNumPad(ctx.dock, {
          label: T().statEstimateLabel, fraction: false, decimal: true,
          onChange: function (val) { est = val; writeEst(); stage(); say(); ctx.changed(); }
        });
        pad.set(est || '');
      } else if (c === 'corr') {
        window.GJ.setState(ctx.dock, 'dock', 'chips');
        var tray = el('div', 'stat-chips');
        tray.setAttribute('data-tray', 'scatter-corr-' + q.id);
        var opts = [{ v: 'positive', t: T().statScPositive }, { v: 'negative', t: T().statScNegative }, { v: 'none', t: T().statScNone }];
        derange(opts, opts.map(function (o) { return o.v; }), function (o) { return o.v; }, q.id + 'c').forEach(function (o) {
          var b = el('button', 'chip');
          b.type = 'button'; b.textContent = o.t;
          b.setAttribute('data-tray-item', '');
          b.setAttribute('aria-pressed', corr === o.v ? 'true' : 'false');
          b.addEventListener('click', function (e) { e.stopPropagation(); if (ctx.locked()) return; corr = o.v; after(); });
          tray.appendChild(b);
        });
        ctx.dock.appendChild(tray);
      } else window.GJ.setState(ctx.dock, 'dock', 'chips');
      if (step < order.length - 1) {
        var isLine = c === 'line';
        var nx = el('button', 'btn-stage stat-next', isLine ? T().statScThatsMyLine : nextLabel());
        nx.type = 'button';
        nx.disabled = !stepDone();
        if (nx.disabled) setLockedWhy(nx, whyFor(c));
        nx.addEventListener('click', function (e) {
          e.stopPropagation();
          if (ctx.locked() || nx.disabled) return;
          advance(); after();
        });
        ctx.dock.appendChild(nx);
      }
    }
    function whyFor(c) {
      return c === 'plotting' ? T().statScWhyPlot : c === 'line' ? T().statScWhyLine : c === 'estimate' ? T().statScWhyEst : c === 'corr' ? T().statScWhyCorr : T().statScWhyOutlier;
    }
    function writeEst() {
      lines.innerHTML = '';
      if (est === '') return;
      var a = askOf('estimate');
      var row = el('div', 'wline stat-wline stat-est-line');
      row.setAttribute('data-placed', '');
      row.textContent = T().statEstimateLabel + ' ' + (a ? 'at ' + a.at + ': ' : '') + est;
      lines.appendChild(row);
    }
    function say() {
      var c = cur(), a;
      if (c === 'plotting') ctx.say(allPlotted() ? (order.length > 1 ? T().statStageScPlotDone : '') : fill(T().statStageScPlot, { n: plotted(), m: toPlot.length }));
      else if (c === 'line') ctx.say(T().statStageScLine);
      else if (c === 'estimate') { a = askOf('estimate'); ctx.say(fill(T().statStageScEst, { at: a ? a.at : '' })); }
      else if (c === 'corr') ctx.say(T().statStageScCorr);
      else if (c === 'outlier') ctx.say(T().statStageScOutlier);
      else ctx.say('');
    }
    function after() { stage(); renderDock(); say(); ctx.changed(); }

    return {
      start: function () { givenTable(); build(); step = 0; after(); },
      reset: function () { step = 0; sel = -1; est = ''; corr = null; outlier = null; lineDone = false; build(); lines.innerHTML = ''; after(); },
      restore: function (S) {
        S = S || {};
        givenTable(); build();
        (S.pts || []).forEach(function (pt) { bd.addPoint(Number(pt[0]), Number(pt[1])); });
        est = S.est || ''; corr = S.corr || null; outlier = (S.outlier === undefined || S.outlier === null) ? null : Number(S.outlier);
        lineDone = !!(S.line && S.line.length === 2);
        step = 0;
        /* replay the steps she had completed, in order */
        if (allPlotted()) {
          while (step < order.length - 1) {
            var c = cur();
            var done = c === 'plotting' ? true : c === 'line' ? lineDone : c === 'estimate' ? est !== '' : c === 'corr' ? !!corr : outlier !== null;
            if (!done) break;
            advance();
          }
          if (step === order.length - 1 && stepDone()) { /* every stage complete: stay on the last board */ }
        }
        if (S.line && S.line.length === 2 && order.indexOf('line') > -1) {
          if (bd.handles().length < 2) { bd.handleAt(Number(S.line[0][0]), Number(S.line[0][1]), 0); bd.handleAt(Number(S.line[1][0]), Number(S.line[1][1]), 1); }
          else { bd.moveHandle(0, Number(S.line[0][0]), Number(S.line[0][1])); bd.moveHandle(1, Number(S.line[1][0]), Number(S.line[1][1])); }
        }
        if (outlier !== null && bd.allPoints()[outlier] !== undefined) bd.markOutlier(outlier);
        writeEst();
        after();
      },
      state: function () {
        var S = { pts: bd ? bd.points() : [] };
        if (askOf('lobf')) { var h = bd ? bd.handles() : []; if (h.length === 2) S.line = h; }
        if (askOf('estimate')) S.est = est;
        if (askOf('corr')) S.corr = corr;
        if (askOf('outlier')) S.outlier = outlier;
        return S;
      },
      ready: function () {
        if (!allPlotted()) return { ok: false, why: T().statScWhyPlot };
        for (var i = 1; i < order.length; i++) {
          var c = order[i];
          var done = c === 'line' ? lineDone : c === 'estimate' ? est !== '' : c === 'corr' ? !!corr : outlier !== null;
          if (!done) return { ok: false, why: whyFor(c) };
        }
        return { ok: true };
      },
      lock: function () { ctx.dock.innerHTML = ''; if (bd) bd.enablePress(null); },
      showTruth: function () {
        toPlot.forEach(function (pt) { bd.annotate('target', [Number(pt[0]), Number(pt[1])]); });
        if (askOf('lobf') && window.GJ_STATS.leastSquares) {
          var ls = window.GJ_STATS.leastSquares(given.concat(toPlot));
          var rv = function (r) { return (r && typeof r === 'object' && r.d) ? r.n / r.d : Number(r); };
          if (ls) {
            var m = rv(ls.m), c0 = rv(ls.c), x1 = q.chart.x.min, x2 = q.chart.x.max;
            bd.line([x1, m * x1 + c0], [x2, m * x2 + c0], { cls: 'stat-lobf stat-lobf-truth' });
          }
        }
      },
      ghost: function (holder, att) {
        holder.innerHTML = '';
        var pts = ((att.S || {}).pts) || [];
        pts.forEach(function (pt) { bd.addPoint(Number(pt[0]), Number(pt[1]), { ghost: true }); });
      },
      board: function () { return bd; }
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
    } else if (q.kind === 'scatter') {
      var b3 = el('div', 'stat-board stat-board-small');
      wrap.appendChild(b3);
      var bd3 = window.GJ_STATCHART.render(b3, q.chart, { readOnly: true });
      (q.given || []).forEach(function (pt) { bd3.addPoint(Number(pt[0]), Number(pt[1]), { given: true }); });
      (S.pts || []).forEach(function (pt) {
        bd3.addPoint(Number(pt[0]), Number(pt[1]));
        var hit = (q.toPlot || []).some(function (w) { return Number(w[0]) === Number(pt[0]) && Number(w[1]) === Number(pt[1]); });
        bd3.annotate(hit ? 'right' : 'wrong', [Number(pt[0]), Number(pt[1])]);
      });
      if (S.line && S.line.length === 2) bd3.line([Number(S.line[0][0]), Number(S.line[0][1])], [Number(S.line[1][0]), Number(S.line[1][1])], { instant: true });
      if (S.outlier !== undefined && S.outlier !== null) bd3.markOutlier(Number(S.outlier));
      var line3 = el('div', 'stat-row'); line3.textContent = summariseState(q, S); wrap.appendChild(line3);
    } else if (q.kind === 'pie') {
      var b4 = el('div', 'stat-board stat-board-small');
      wrap.appendChild(b4);
      var pb = window.GJ_STATCHART.pie(b4, { readOnly: true });
      var bs = (S.bounds || []).map(Number), from = 0;
      bs.forEach(function (to, i) { if (i < bs.length - 1) pb.boundary(to, { plain: true }); pb.sector(from, to, i, { instant: true }); from = to; });
      var line4 = el('div', 'stat-row'); line4.textContent = summariseState(q, S); wrap.appendChild(line4);
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
    if (q.kind === 'order') return (S.seq || []).map(function (i) { return (q.tiles || [])[i]; }).join(' → ');
    if (q.kind === 'pick') return ((q.options || [])[S.pick] || {}).text || '';
    if (q.kind === 'stemleaf') return Object.keys(S.rows || {}).map(function (k) { return k + ' | ' + (S.rows[k] || []).join(' '); }).join('   ');
    if (q.kind === 'pie') return (q.cats || []).map(function (c) { return c.label + ' ' + ((S.angles || {})[c.id] || '—') + '°'; }).join(' · ');
    if (q.kind === 'scatter') return [(S.pts || []).length + ' points', S.est !== undefined && S.est !== '' ? 'estimate ' + S.est : null, S.corr || null].filter(Boolean).join(' · ');
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
