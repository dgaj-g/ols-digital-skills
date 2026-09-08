/* drive.js — ANSWERING A QUESTION THE WAY SHE ANSWERS IT.
 *
 * Every question in this book is answered on a scaffold: tiles sorted into
 * family bins, a product picked per cell of a grid, a move chip and a number,
 * letters tapped into an expression, an arc tapped on a diagram. Only two
 * kinds (classify and protractor) are a single press.
 *
 * The walker used to "prime" the written kinds: it pushed a model attempt
 * straight into the record and re-rendered. That put an attempt in the model
 * the renderer never showed and the Check never saw, so the Check stayed
 * correctly disabled ("Write a line of working first."), the question stayed
 * fresh, and the walk wrote down a state nobody had stood on. Five of the
 * seven kinds were never actually answered by any walk.
 *
 * So this file drives the real controls. What it needs to know beyond the
 * model attempt it reads from the app's own content pack in the page, never
 * from a copy: the correct product for a grid cell, the text of a reason. A
 * walker holding its own copy of the answers is a walker that can be right
 * about a question the app has changed.
 */
'use strict';

const ANSWER = `((args) => {
  const [qid, wrong, uptoStage] = args;
  const attempt = window.__modelAttempt(qid, wrong);
  if (!attempt) return { ok: false, why: 'no model attempt for ' + qid };
  const rootOf = (id) => [...document.querySelectorAll('[data-surface="question"], .jotter-q')]
    .filter((r) => (r.getAttribute('data-qid') || (r.id || '').replace(/^jq-/, '')) === id)[0];
  const root = rootOf(qid);
  if (!root) return { ok: false, why: qid + ' is not on screen' };
  const kind = root.getAttribute('data-kind');
  const book = root.getAttribute('data-book') || '';
  const dock = document.querySelector('[data-surface="dock"]');
  /* the dock is rendered INSIDE the question root, so searching both scopes
     returned every control twice and "the other bin" was the same bin again */
  const scope = () => (dock && !root.contains(dock) ? [root, dock] : [root]);
  const all = (sel) => scope().reduce((acc, s) => acc.concat([...s.querySelectorAll(sel)]), []);
  const one = (sel) => all(sel)[0] || null;
  const T = (window.GJ_STRINGS && window.GJ_STRINGS.pupil) || {};
  const txt = (e) => (e && e.textContent || '').replace(/\\s+/g, ' ').trim();
  const same = (a, b) => String(a).replace(/[\\s]/g, '').replace(/-/g, '\\u2212').replace(/\\^2/g, '\\u00b2')
                     === String(b).replace(/[\\s]/g, '').replace(/-/g, '\\u2212').replace(/\\^2/g, '\\u00b2');
  const byText = (sel, want) => all(sel).filter((b) => same(txt(b), want))[0] || null;

  /* the question, from the app's own pack */
  const packQ = (() => {
    try {
      const pack = window.GJ.app.content(book);
      let found = null;
      (pack.sections || []).forEach((s) => (s.questions || []).forEach((x) => { if (x.id === qid) found = x; }));
      return found;
    } catch (e) { return null; }
  })();

  /* press a number pad, digit by digit, the way a finger does */
  const padType = (host, value) => {
    if (!host) return false;
    const keys = [...host.querySelectorAll('.keypad button, button.key')];
    if (!keys.length) return false;
    const press = (label) => {
      const k = keys.filter((x) => txt(x) === label)[0];
      if (!k) return false;
      k.click();
      return true;
    };
    let ok = true;
    String(value).split('').forEach((ch) => {
      if (ch === '-' || ch === '\\u2212') ok = press('\\u2212') && ok;
      else if (ch === ' ') return;
      else ok = press(ch) && ok;
    });
    return ok;
  };

  /* ── STATS: the board is answered by pressing the app's own controls,
       never by writing state (DESIGN §4.0 "the drive channel"). A stats
       question can sit at any of its declared stages, so every kind's press
       loop checks after each atomic press whether the walker only asked to be
       driven up to a named stage, and stops there. ───────────────────────── */
  const STAT_KINDS = ['qlist', 'cftable', 'cfplot', 'cfread', 'boxplot', 'compare', 'judge', 'values'];
  if (STAT_KINDS.indexOf(kind) > -1) {
    const curStage = () => root.getAttribute('data-stage');
    const stagesOfRoot = () => (root.getAttribute('data-stages') || '').split(' ').filter(Boolean);
    /* a stage is "reached" once the board has moved to it or past it - the
       stage list is in order, so an index comparison is enough, and it means
       a walker that asks for an EARLIER stage than the one already showing
       (a re-drive on a partly-answered board) is told it is already there */
    const reachedStage = (target) => {
      if (!target) return false;
      const list = stagesOfRoot();
      const ci = list.indexOf(curStage()), ti = list.indexOf(target);
      return ci > -1 && ti > -1 && ci >= ti;
    };
    const maybeStop = (how) => (reachedStage(uptoStage) ? { ok: true, how: how, stage: curStage() } : null);
    if (reachedStage(uptoStage)) return { ok: true, how: 'already standing on ' + uptoStage, stage: curStage() };

    /* the SVG board's own geometry, replicated ONLY for the case the drive
       channel cannot reach: a two-stage boxplot's final scale is built after
       mount (jotter-stats.js snapshots root.__statBoard once, at mount, and a
       two-stage item has not built its plot board yet at that moment) so this
       is worked out from the pack's own scale spec instead - the same formula
       statchart.js uses for a 1-D scale (buildScaleGeometry + toPx) */
    const SQ_UNIT = 24;
    const scaleGeom = (c) => {
      const min = (c && c.min != null) ? Number(c.min) : 0;
      const sq = (c && c.sq != null) ? Number(c.sq) : ((c && c.step != null) ? Number(c.step) : 1);
      return { min: min, sq: sq || 1, plotX0: 30, trackY: 96 };
    };
    const toPxScale = (g, x) => [g.plotX0 + (x - g.min) / g.sq * SQ_UNIT, g.trackY];
    const svgPointToClient = (svg, x, y) => {
      const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const p = pt.matrixTransform(ctm);
      return { x: p.x, y: p.y };
    };
    /* a real pointer press on the board itself - the SVG's own pointerdown
       listener (statchart.js onGridTap) does the rest, including the snap */
    const pressGrid = (svg, x, y) => {
      const c = svgPointToClient(svg, x, y);
      if (!c) return false;
      svg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: c.x, clientY: c.y, pointerId: 1, isPrimary: true, button: 0 }));
      return true;
    };
    /* MOVING THE RULE IS A SCREEN OF ITS OWN. "sliding" - the rule moved, the
       drop line and the read-out showing, nothing committed - is a board a
       pupil sits at and a stage the kind declares, and it exists only BETWEEN
       presses. So the stop is checked after every press, not only after every
       commit; otherwise the walk blows through it inside one call and the
       settle-up rightly says it was never stood on. */
    const nudge = (glyph, times) => {
      for (let i = 0; i < times; i++) {
        const b = all('.nudge-pad button').filter((x) => txt(x) === glyph)[0];
        if (!b) return 'no "' + glyph + '" nudge key on ' + qid;
        b.click();
        if (reachedStage(uptoStage)) return 'STOP';
      }
      return null;
    };
    const thatsMine = () => all('.btn-quiet').filter((b) => /that.?s my/i.test(txt(b)))[0];

    /* ── qlist: tray tiles smallest first, then the cuts, then the IQR ──── */
    /* THE DRIVE IS RESUMABLE. It is called once per declared stage on the SAME
       board, so every press is "do what is not yet done": a tile already in the
       row is skipped, a cut already committed is skipped, a value already keyed
       is not keyed twice. Without this, the second call replays the first from
       the beginning and fails looking for a tile that is no longer in the tray
       - which is exactly what the first pooled walk of Book C reported. */
    function pressQlist(S, pq) {
      const values = (pq && pq.values) || [];
      const order = S.order || [];
      for (let oi = 0; oi < order.length; oi++) {
        if (all('[data-row-pos]').length > oi) continue;          /* already placed */
        const want = String(values[order[oi]]);
        const tile = all('[data-tray^="qlist-tiles-"] [data-tray-item]').filter((b) => txt(b) === want)[0];
        if (!tile) return { ok: false, why: 'no tray tile reads "' + want + '" on ' + qid };
        tile.click();
        const s1 = maybeStop('placed the tile "' + want + '"'); if (s1) return s1;
      }
      /* the row complete, nothing chosen yet - and, where the only ask is the
         interquartile range, the pad open with nothing in it. Both are boards
         she sits at, and both live between two presses. */
      const sOrdered = maybeStop('placed every value in the row'); if (sOrdered) return sOrdered;
      const picks = S.picks || {};
      const askOrder = (pq && pq.ask) ? pq.ask.filter((a) => a !== 'IQR') : Object.keys(picks);
      for (let ci = 0; ci < askOrder.length; ci++) {
        if (all('.stat-wline').length > ci) continue;              /* already committed */
        const cutName = askOrder[ci];
        const pos = picks[cutName];
        if (!pos || !pos.length) continue;
        for (let pi = 0; pi < pos.length; pi++) {
          const rowBtn = all('[data-row-pos]').filter((b) => Number(b.getAttribute('data-row-pos')) === pos[pi])[0];
          if (!rowBtn) return { ok: false, why: 'no row tile at position ' + pos[pi] + ' on ' + qid };
          rowBtn.click();
          /* "picking" - one value chosen, the read-out showing, nothing
             committed - is a board of its own and lives only between these
             two presses */
          const sp = maybeStop('chose a value for ' + cutName); if (sp) return sp;
        }
        const commit = all('.btn-quiet').filter((b) => !b.classList.contains('stat-undo'))[0];
        if (!commit) return { ok: false, why: 'no commit button for ' + cutName + ' on ' + qid };
        commit.click();
        const s2 = maybeStop('committed ' + cutName); if (s2) return s2;
      }
      if (S.iqr) {
        const pad = one('.numpad');
        if (!pad) return { ok: false, why: 'could not key the IQR on ' + qid };
        const slot = pad.querySelector('.numpad-slot');
        if (!slot || txt(slot) !== String(S.iqr)) {
          if (!padType(pad, S.iqr)) return { ok: false, why: 'could not key the IQR on ' + qid };
        }
      }
      return null;
    }

    /* ── cftable: open each editable row and key its running total ──────── */
    function pressCftable(S, pq) {
      const cf = S.cf || [];
      const classes = (pq && pq.classes) || [];
      const pre = (pq && pq.prefill) || [];
      for (let i = 0; i < classes.length; i++) {
        if (pre.indexOf(i) > -1) continue;
        if (cf[i] == null || cf[i] === '') continue;
        let k = 0;
        for (let j = 0; j < i; j++) if (pre.indexOf(j) === -1) k++;
        const btn = all('.stat-table .stat-cell')[k];
        if (!btn) return { ok: false, why: 'no cell for row ' + i + ' on ' + qid };
        if (txt(btn) === String(cf[i])) continue;                  /* already keyed */
        btn.click();
        const pad = one('.numpad');
        if (!pad || !padType(pad, cf[i])) return { ok: false, why: 'could not key row ' + i + ' on ' + qid };
        const s = maybeStop('filled row ' + i); if (s) return s;
      }
      return null;
    }

    /* ── values: open each labelled box and key its value ───────────────── */
    function pressValues(S, pq) {
      const v = S.v || {};
      const order = (pq && (pq.order || (pq.slots || []).map((s2) => s2.id))) || Object.keys(v);
      for (let i = 0; i < order.length; i++) {
        const id = order[i];
        if (v[id] == null || v[id] === '') continue;
        const btn = all('.stat-slots .stat-cell')[i];
        if (!btn) return { ok: false, why: 'no slot for "' + id + '" on ' + qid };
        if (txt(btn) === String(v[id])) continue;                  /* already keyed */
        btn.click();
        const pad = one('.numpad');
        if (!pad || !padType(pad, v[id])) return { ok: false, why: 'could not key "' + id + '" on ' + qid };
        const s = maybeStop('filled "' + id + '"'); if (s) return s;
      }
      return null;
    }

    /* ── cfplot: press the grid at every point, then join them ──────────── */
    function pressCfplot(S) {
      const pts = S.pts || [];
      const bd = root.__statBoard;
      if (!bd || !bd.toPx || !bd.svg) return { ok: false, why: 'no board handle for ' + qid };
      for (let i = 0; i < pts.length; i++) {
        const on = (bd.points && bd.points()) || [];
        if (on.some((p) => Number(p[0]) === Number(pts[i][0]) && Number(p[1]) === Number(pts[i][1]))) continue;
        const px = bd.toPx(Number(pts[i][0]), Number(pts[i][1]));
        if (!pressGrid(bd.svg, px[0], px[1])) return { ok: false, why: 'the board has no screen transform yet for ' + qid };
        const s = maybeStop('placed point ' + i); if (s) return s;
      }
      if (S.joined) {
        const join = one('.stat-join');
        if (!join) return { ok: false, why: 'no Join button on ' + qid };
        if (!join.disabled) join.click();                          /* disabled here means already joined */
      }
      return null;
    }

    /* ── cfread: nudge the rule to each convention height, commit, repeat ── */
    function pressCfread(S, pq) {
      const asks = (pq && pq.ask) || [];
      const sq = (pq && pq.chart && pq.chart.sq) || { x: 1, y: 1 };
      const xMin = (pq && pq.chart && pq.chart.x && pq.chart.x.min) || 0;
      for (let ai = 0; ai < asks.length; ai++) {
        if (all('.stat-wline').length > ai) continue;               /* already committed */
        /* the board for THIS ask, before anything is done on it */
        const sAsk = maybeStop('reached the next reading'); if (sAsk) return sAsk;
        const a = asks[ai];
        /* a commit button is only genuinely pressed if the app has actually
           enabled it - clicking a disabled button fires no handler at all,
           and a walker that clicks it anyway and calls that success has
           reported a screen it never really stood on. Where it never enables
           after the value it is asking for has been keyed, that is the
           app's own bug (its onChange never re-renders the dock to re-read
           its own disabled flag), not a route this drive can take round. */
        const clickCommit = (why) => {
          const commit = thatsMine();
          if (!commit) return 'no commit ' + why + ' on ' + qid;
          if (commit.disabled) return 'the commit ' + why + ' never enables on ' + qid + ' after the value was keyed - jotter-stats.js never re-renders the dock on that pad onChange';
          commit.click();
          return null;
        };
        if (a === 'IQR') {
          const pad = one('.numpad');
          if (!pad || !padType(pad, S.iqr || '')) return { ok: false, why: 'could not key the IQR on ' + qid };
          const bad = clickCommit('for the IQR');
          if (bad) return { ok: false, why: bad };
        } else if (a && typeof a === 'object' && a.type === 'atX') {
          const targetX = Number(a.x);
          const stepsX = Math.round((targetX - Number(xMin)) / (Number(sq.x) || 1));
          const bad0 = nudge(stepsX < 0 ? '◀' : '▶', Math.abs(stepsX));
          if (bad0 === 'STOP') return { ok: true, how: 'moved the rule across', stage: curStage() };
          if (bad0) return { ok: false, why: bad0 };
          const pad = one('.stat-answer .numpad') || one('.numpad');
          if (!pad || !padType(pad, S.answer || '')) return { ok: false, why: 'could not key the reading on ' + qid };
          const bad = clickCommit('for the reading');
          if (bad) return { ok: false, why: bad };
        } else {
          const read = (S.reads || {})[a];
          const targetH = read ? Number(read.h) : 0;
          const stepsY = Math.round(targetH / (Number(sq.y) || 1));
          const bad0 = nudge(stepsY < 0 ? '▼' : '▲', Math.abs(stepsY));
          if (bad0 === 'STOP') return { ok: true, how: 'moved the rule up the frequency axis', stage: curStage() };
          if (bad0) return { ok: false, why: bad0 };
          const bad = clickCommit('for "' + a + '"');
          if (bad) return { ok: false, why: bad };
        }
        const s = maybeStop('committed the "' + (typeof a === 'string' ? a : a.type) + '" ask'); if (s) return s;
      }
      return null;
    }

    /* THE SELECTION STAGES. "selected" and "marker-selected" are the boards the
       two-press law lives on: the first press on placed work SELECTS it and
       says "press it again to put it back". No route through answering ever
       lands there, so when the walk asks for one, the drive makes the
       selection deliberately - one press, which changes nothing - and stops. */
    const wantsSelection = /(^|:)(selected|marker-selected)$/.test(String(uptoStage || ''));
    if (wantsSelection) {
      const placed = all('[data-placed]').filter((e) => e.tagName === 'BUTTON' && !e.disabled)[0];
      if (placed) {
        placed.click();
        return { ok: true, how: 'pressed placed work once, which selects it', stage: curStage() };
      }
      /* a box plot's "marker-selected" comes BEFORE anything is placed: she
         chooses a marker out of the tray, and that choice is the board */
      const trayItem = all('[data-tray^="boxplot-markers-"] [data-tray-item]').filter((e) => !e.disabled)[0];
      if (trayItem) {
        trayItem.click();
        return { ok: true, how: 'chose a marker out of the tray', stage: curStage() };
      }
      /* a plotted point selects ITSELF the moment it is placed, so there is
         nothing to press first: fall through and answer normally */
    }

    if (kind === 'qlist') {
      const r = pressQlist((attempt.S || {}), packQ);
      if (r) return r;
      return { ok: true, how: 'ordered the row smallest first, picked every cut, keyed the IQR', stage: curStage() };
    }
    if (kind === 'cftable') {
      const r = pressCftable((attempt.S || {}), packQ);
      if (r) return r;
      return { ok: true, how: 'opened each row and keyed its running total', stage: curStage() };
    }
    if (kind === 'values') {
      const r = pressValues((attempt.S || {}), packQ);
      if (r) return r;
      return { ok: true, how: 'opened every box and keyed its value', stage: curStage() };
    }
    if (kind === 'cfplot') {
      const r = pressCfplot(attempt.S || {});
      if (r) return r;
      return { ok: true, how: 'pressed the grid at every point, then joined them', stage: curStage() };
    }
    if (kind === 'cfread') {
      const r = pressCfread((attempt.S || {}), packQ);
      if (r) return r;
      return { ok: true, how: 'nudged the rule to each convention height and committed every reading', stage: curStage() };
    }
    if (kind === 'boxplot') {
      const S = attempt.S || {};
      const stageKind = packQ && packQ.from ? (packQ.from === 'curve' ? 'cfread' : packQ.from) : null;
      if (stageKind && !root.querySelector('.stat-plot svg.stat-board')) {
        const stageS = S.stage || {};
        const r = stageKind === 'qlist' ? pressQlist(stageS, packQ)
          : stageKind === 'values' ? pressValues(stageS, packQ)
          : pressCfread(stageS, packQ);
        if (r) return r;
        const s0 = maybeStop('finished the "' + stageKind + '" stage'); if (s0) return s0;
        const next = one('.stat-next');
        if (!next) return { ok: false, why: 'no "Next: draw the box plot" button on ' + qid };
        if (next.disabled) return { ok: false, why: 'the stage is not ready to move on for ' + qid };
        next.click();
      }
      const s1 = maybeStop('reached the box-plot board'); if (s1) return s1;
      const MARKER_LABEL = { min: T.statLowest, Q1: T.statLowerQuartile, Q2: T.statMedian, Q3: T.statUpperQuartile, max: T.statHighest };
      const pos = S.pos || {};
      const svg = one('.stat-plot svg.stat-board');
      if (!svg) return { ok: false, why: 'no box-plot board on ' + qid };
      const geom = scaleGeom((packQ && packQ.scale) || {});
      const roles = ['min', 'Q1', 'Q2', 'Q3', 'max'];
      for (let ri = 0; ri < roles.length; ri++) {
        const role = roles[ri];
        if (pos[role] == null || pos[role] === '') continue;
        const wantLabel = MARKER_LABEL[role];
        const inTray = all('[data-tray^="boxplot-markers-"] [data-tray-item]');
        const already = inTray.filter((b) => txt(b).indexOf(wantLabel) === 0 && /\u2713/.test(txt(b)))[0];
        if (already) continue;                                     /* already on the scale */
        const marker = inTray.filter((b) => txt(b) === wantLabel)[0];
        if (!marker) return { ok: false, why: 'no tray marker reads "' + wantLabel + '" on ' + qid };
        marker.click();
        const px = toPxScale(geom, Number(pos[role]));
        if (!pressGrid(svg, px[0], px[1])) return { ok: false, why: 'the box-plot scale has no screen transform yet for ' + qid };
        const s2 = maybeStop('placed the "' + role + '" marker'); if (s2) return s2;
      }
      const draw = one('.stat-draw');
      if (!draw) return { ok: false, why: 'no "Draw the box plot" button on ' + qid };
      if (draw.disabled) return { ok: false, why: 'the box plot is not ready to draw on ' + qid };
      draw.click();
      return { ok: true, how: 'placed every marker on the scale, then drew the box plot', stage: curStage() };
    }
    if (kind === 'compare') {
      const S = attempt.S || {};
      const s1 = S.s1 || {}, s2 = S.s2 || {};
      const clickChip = (trayId, wantText) => {
        const tray = root.querySelector('[data-tray="' + trayId + '"]');
        if (!tray) return 'no chip group "' + trayId + '" on ' + qid;
        const chip = [...tray.querySelectorAll('[data-tray-item]')].filter((b) => txt(b) === wantText)[0];
        if (!chip) return 'no chip reads "' + wantText + '" in "' + trayId + '" on ' + qid;
        chip.click();
        return null;
      };
      const cell = (si, ci) => {
        const s3 = root.querySelectorAll('.stat-sentence')[si];
        return s3 ? s3.querySelectorAll('.stat-cell')[ci] : null;
      };
      const keyCell = (si, ci, val) => {
        const b = cell(si, ci);
        if (!b) return 'no value box ' + (ci + 1) + ' in sentence ' + (si + 1) + ' on ' + qid;
        b.click();
        const pad = one('.numpad');
        if (!pad || !padType(pad, val || '')) return 'could not key value ' + (ci + 1) + ' of sentence ' + (si + 1) + ' on ' + qid;
        return null;
      };
      let err;
      if ((err = clickChip('compare-who1-' + qid, s1.who))) return { ok: false, why: err };
      if ((err = clickChip('compare-who1b-' + qid, s1.who2))) return { ok: false, why: err };
      if ((err = clickChip('compare-ctx-' + qid, s1.ctx))) return { ok: false, why: err };
      if ((err = keyCell(0, 0, (s1.v || [])[0]))) return { ok: false, why: err };
      if ((err = keyCell(0, 1, (s1.v || [])[1]))) return { ok: false, why: err };
      const s5 = maybeStop('finished the first sentence'); if (s5) return s5;
      if ((err = clickChip('compare-who2-' + qid, s2.who))) return { ok: false, why: err };
      if ((err = clickChip('compare-size-' + qid, s2.size === 'larger' ? T.statCmpLarger : T.statCmpSmaller))) return { ok: false, why: err };
      if ((err = clickChip('compare-meas-' + qid, s2.meas === 'range' ? T.statRange : T.statIqr))) return { ok: false, why: err };
      if ((err = keyCell(1, 0, (s2.v || [])[0]))) return { ok: false, why: err };
      if ((err = keyCell(1, 1, (s2.v || [])[1]))) return { ok: false, why: err };
      if ((err = clickChip('compare-cons-' + qid, s2.cons === 'more' ? T.statCmpMore : T.statCmpLess))) return { ok: false, why: err };
      return { ok: true, how: 'pressed one chip per bracket and keyed both values in each sentence', stage: curStage() };
    }
    if (kind === 'judge') {
      const S = attempt.S || {};
      const j = S.j || [];
      const claims = (packQ && packQ.claims) || [];
      const reasons = (packQ && packQ.reasons) || [];
      for (let ci = 0; ci < j.length; ci++) {
        const want = j[ci] || {};
        const claim = claims[ci] || {};
        const tray = root.querySelector('[data-tray="judge-' + ci + '-' + qid + '"]');
        if (!tray) return { ok: false, why: 'no chip group for claim ' + ci + ' on ' + qid };
        const wantText = claim.options ? want.v : (want.fair ? T.statFairToSay : T.statNotFair);
        const chip = [...tray.querySelectorAll('[data-tray-item]')].filter((b) => txt(b) === wantText)[0];
        if (!chip) return { ok: false, why: 'no chip reads "' + wantText + '" for claim ' + ci + ' on ' + qid };
        chip.click();
        /* "reason-open" - a claim called not fair, its reason picker open and
           nothing chosen - is a board of its own, and it lives only between
           these two presses */
        if (!claim.options && want.fair === false && want.why) {
          const sr = maybeStop('called claim ' + ci + ' not fair'); if (sr) return sr;
        }
        if (!claim.options && want.fair === false && want.why) {
          const rtray = root.querySelector('[data-tray="judge-why-' + ci + '-' + qid + '"]');
          if (!rtray) return { ok: false, why: 'no reason bank for claim ' + ci + ' on ' + qid };
          /* the chips carry their id, so the drive never has to match a
             sentence; the bank itself is the engine's unless the question
             authored its own (DESIGN 6.6, one home) */
          let rchip = [...rtray.querySelectorAll('[data-tray-item]')]
            .filter((b) => b.getAttribute('data-reason') === want.why)[0];
          if (!rchip) {
            const bank = (reasons && reasons.length) ? reasons
              : Object.keys((window.GJ_STATS && window.GJ_STATS.REASONS) || {})
                  .map((id) => ({ id: id, text: window.GJ_STATS.REASONS[id] }));
            const rsn = bank.filter((r) => r.id === want.why)[0];
            if (!rsn) return { ok: false, why: 'the reason bank has no "' + want.why + '" on ' + qid };
            rchip = [...rtray.querySelectorAll('[data-tray-item]')].filter((b) => txt(b) === rsn.text)[0];
          }
          if (!rchip) return { ok: false, why: 'no reason chip for "' + want.why + '" on ' + qid };
          rchip.click();
        }
        const s6 = maybeStop('judged claim ' + ci); if (s6) return s6;
      }
      return { ok: true, how: 'judged every claim, and gave a reason where it was called not fair', stage: curStage() };
    }
  }

  /* ── ONE PRESS: the option card ───────────────────────────────── */
  if (kind === 'classify' && attempt.pick) {
    const card = all('button').filter((b) => txt(b).toLowerCase() === String(attempt.pick).toLowerCase())[0];
    if (!card) return { ok: false, why: 'no option card reads "' + attempt.pick + '" on ' + qid };
    card.click();
    return { ok: true, how: 'pressed the option card' };
  }

  /* ── THE READING, typed on the pad ────────────────────────────── */
  if (kind === 'protractor' && attempt.read != null) {
    const host = one('.compose') ? root : dock;
    const keys = all('button').filter((b) => /^[0-9]$/.test(txt(b)));
    if (!keys.length) return { ok: false, why: 'no number pad on ' + qid };
    String(attempt.read).split('').forEach((d) => {
      const k = keys.filter((b) => txt(b) === d)[0];
      if (k) k.click();
    });
    return { ok: true, how: 'typed the reading on the pad' };
  }

  /* ── SUBSTITUTION: tap every letter, then key the value ───────── */
  if (kind === 'subst') {
    let guard = 0;
    while (guard++ < 20) {
      const tok = all('.subst-tok[data-tray-item]').filter((t) => !t.hasAttribute('data-placed'))[0];
      if (!tok) break;
      tok.click();
    }
    const pad = one('.subst-answer .numpad') || one('.numpad');
    if (!pad) return { ok: false, why: 'the value pad never appeared on ' + qid };
    if (!padType(pad, attempt.fin)) return { ok: false, why: 'could not key "' + attempt.fin + '" on the pad' };
    return { ok: true, how: 'tapped each letter, then keyed the value' };
  }

  /* ── COLLECTING LIKE TERMS: sort each tile into a family bin ──── */
  if (kind === 'simplify') {
    const famOf = (s) => (/\\u00b2|\\^2/.test(s) ? 'x\\u00b2 terms' : /x/.test(s) ? 'x terms' : 'numbers');
    const binFor = (label) => all('.simp-bins > div').filter((b) => txt(b).toLowerCase().indexOf(String(label).toLowerCase()) === 0)[0]
      || all('.simp-bins > div').filter((b) => txt(b).toLowerCase().indexOf(String(label).toLowerCase()) >= 0)[0];
    let missorted = false, guard = 0;
    while (guard++ < 30) {
      const tile = all('[data-tray^="simplify-tray-"] button')[0];
      if (!tile) break;
      const want = famOf(txt(tile));
      let bin = binFor(want);
      if (!bin) return { ok: false, why: 'no "' + want + '" bin on ' + qid };
      /* the bins are re-created after every placement, so "the other bin" has
         to be looked up NOW: holding the list from before the first placement
         meant the mis-sort clicked a detached node, did nothing at all, and
         the walk reported a wrong answer it had never given */
      if (wrong && !missorted) {
        const other = all('.simp-bins > div').filter((b) => b !== bin)[0];
        if (other) { bin = other; missorted = true; }
      }
      tile.click();
      bin.click();
    }
    const combine = byText('.btn-stamp', T.combineTermsBtn || 'Combine terms')
      || all('.btn-stamp').filter((b) => /combine/i.test(txt(b)))[0];
    if (!combine) return { ok: false, why: 'the combine button never appeared on ' + qid };
    combine.click();
    if (wrong && !missorted) return { ok: true, wrongNotPossible: true, how: 'every term is the same family here, so a mis-sort is not a mistake this screen allows' };
    return { ok: true, how: wrong ? 'mis-sorted one tile, then combined' : 'sorted every tile, then combined' };
  }

  /* ── EXPANDING: one product per cell, from the tile palette ───── */
  if (kind === 'expand') {
    const cells = (packQ && packQ.fc && packQ.fc.cells) || null;
    if (!cells) return { ok: false, why: 'the pack has no expansion grid for ' + qid };
    let spoiled = false;
    for (let i = 0; i < cells.length; i++) {
      const tray = all('[data-tray^="expand-tray-' + qid + '-"]')[i];
      if (!tray) return { ok: false, why: 'cell ' + i + ' has no tray on ' + qid };
      const btns = [...tray.querySelectorAll('button')];
      const right = btns.filter((b) => same(txt(b), cells[i].answer))[0];
      let pick = right;
      if (wrong && !spoiled) {
        const other = btns.filter((b) => b !== right)[0];
        if (other) { pick = other; spoiled = true; }
      }
      if (!pick) return { ok: false, why: 'no tile reads "' + cells[i].answer + '" in cell ' + i + ' of ' + qid };
      pick.click();
    }
    if (wrong && !spoiled) return { ok: true, wrongNotPossible: true, how: 'the grid offered no wrong product to pick' };
    return { ok: true, how: wrong ? 'picked one wrong product' : 'picked the right product for each cell' };
  }

  /* ── SOLVING: the move rail, one chip and one number at a time ── */
  if (kind === 'solve' || kind === 'form') {
    const right = window.__modelAttempt(qid, false) || {};
    const moves = right.moves;
    if (!moves || !moves.length) return { ok: false, why: 'no move route for ' + qid };
    const LABEL = {
      '-': T.chipSubtract || '\\u2212 subtract', '+': T.chipAdd || '+ add',
      '/': T.chipDivide || '\\u00f7 divide', '*': T.chipMultiply || '\\u00d7 multiply',
      expand: T.chipExpandBrackets || 'expand the brackets', subx: T.chipTakeXBothSides || ''
    };
    const play = (m) => {
      if (m.kind === 'form') {
        const choice = all('[data-tray^="form-choices-"] button').filter((b) => same(txt(b), m.operand))[0];
        if (!choice) return 'no equation choice reads "' + m.operand + '"';
        choice.click();
        return null;
      }
      const chip = byText('.chip, [data-tray^="solve-moves-"] button', LABEL[m.kind]);
      if (!chip) return 'no move chip reads "' + LABEL[m.kind] + '"';
      chip.click();
      if (m.operand == null) return null;
      const pad = one('.solve-op .numpad') || one('.numpad');
      if (!pad) return 'the number pad never appeared for the "' + LABEL[m.kind] + '" move';
      if (!padType(pad, m.operand)) return 'could not key "' + m.operand + '" on the pad';
      const apply = byText('.btn-stamp', T.applyBtn || 'Apply') || all('.btn-stamp').filter((b) => /apply/i.test(txt(b)))[0];
      if (!apply) return 'no apply button after the "' + LABEL[m.kind] + '" move';
      apply.click();
      return null;
    };
    if (wrong) {
      /* the classic slip on this rail: the right move with the wrong number */
      const first = moves[0];
      const spoiled = first.kind === 'form'
        ? { kind: 'form', operand: ((packQ && packQ.fc && packQ.fc.choices) || []).filter((c) => !same(c, first.operand))[0] }
        : { kind: first.kind, operand: first.operand == null ? null : String(Number(String(first.operand).replace('\\u2212', '-')) + 1) };
      if (spoiled.operand == null && spoiled.kind !== 'expand') return { ok: true, wrongNotPossible: true, how: 'this move takes no number, so there is no number to get wrong' };
      const bad = play(spoiled);
      if (bad) return { ok: false, why: bad };
      return { ok: true, how: 'played the right move with the wrong number' };
    }
    for (const m of moves) {
      const bad = play(m);
      if (bad) return { ok: false, why: bad };
    }
    return { ok: true, how: 'played the whole route on the move rail' };
  }

  /* ── AN ANGLES ROUTE: tap the arc, key the size, choose the reason ── */
  if (kind === 'reasoned' && attempt.steps && attempt.steps.length) {
    let bank = [];
    try { bank = window.GJ_CONTENT.angles.reasonBank || []; } catch (e) {}
    for (let i = 0; i < attempt.steps.length; i++) {
      const st = attempt.steps[i];
      const lbl = root.querySelector('[data-anglabel="' + st.ang + '"]');
      const arc = lbl && lbl.closest ? lbl.closest('.ang-arc') : null;
      if (!arc) return { ok: false, why: 'no tappable arc for angle ' + st.ang + ' on ' + qid };
      arc.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const card = one('.step-card');
      if (!card || card.hidden) return { ok: false, why: 'the step card never opened for angle ' + st.ang };
      const compose = card.querySelector('.compose');
      if (!compose) return { ok: false, why: 'no size field in the step card for ' + st.ang };
      String(st.val).split('').forEach((ch) => {
        compose.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
      });
      const rsn = bank.filter((r) => r.id === st.rsn)[0];
      if (!rsn) return { ok: false, why: 'the reason bank has no "' + st.rsn + '"' };
      const rcard = [...card.querySelectorAll('.reason-card')].filter((b) => txt(b) === String(rsn.text).replace(/\\s+/g, ' ').trim())[0];
      if (!rcard) return { ok: false, why: 'no reason card reads "' + rsn.text + '"' };
      rcard.click();
      const add = [...card.querySelectorAll('.btn-stamp')][0];
      if (!add) return { ok: false, why: 'no button to add the step for ' + st.ang };
      const marked = /mark/i.test(txt(add));
      add.click();
      if (marked) return { ok: true, checked: true, how: 'built the route; the last step marks it in one press' };
    }
    return { ok: true, how: 'built the angle route step by step' };
  }

  /* ── anything else with a written line: type it, line by line ─── */
  if (attempt.L && attempt.L.length) {
    const compose = one('.compose');
    if (!compose) return { ok: false, why: 'no compose box for ' + qid + ' in the question or the dock' };
    const host = compose.closest('[data-surface]') || root;
    const padKey = (label) => [...host.querySelectorAll('.keypad button')].filter((b) => txt(b) === label)[0];
    const key = (k) => compose.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    compose.focus();
    attempt.L.forEach((line) => {
      const t = String(line.t == null ? '' : line.t).replace(/\\^2/g, '\\u00b2');
      for (let i = 0; i < t.length; i++) {
        if (t[i] === 'x' && t[i + 1] === '\\u00b2') { const sq = padKey('x\\u00b2'); if (sq) { sq.click(); i++; continue; } }
        key(t[i]);
      }
      key('Enter');
    });
    return { ok: true, how: 'typed the working, line by line' };
  }

  return { ok: false, why: 'no route to answer a "' + kind + '" question' };
})`;

module.exports = { ANSWER };
