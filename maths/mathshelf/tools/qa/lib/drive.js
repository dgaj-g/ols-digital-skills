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
  const [qid, wrong] = args;
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
