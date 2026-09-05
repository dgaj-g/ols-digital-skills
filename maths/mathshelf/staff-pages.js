/* MathShelf — the markbook's three new screens.
 *
 * WHY THIS FILE EXISTS. The first markbook answered every question a teacher
 * has with ONE instrument: a pupils-by-24-questions grid of glyphs. It was
 * judged "not fit for purpose", and the diagnosis is that a teacher's questions
 * come in an order and that grid answers none of them first:
 *
 *     how did my class do?   ->  the CLASS PAGE      (this file)
 *     who needs me?          ->  the same page, at the top, by name
 *     show me this exercise  ->  the EXERCISE VIEW   (this file)
 *     show me this question  ->  the QUESTION VIEW   (this file)
 *     show me this pupil     ->  the book view       (staff.js, unchanged)
 *
 * The old grid survives as "Full grid", one press away, for the teacher who
 * wants the whole thing at once.
 *
 * EVERYTHING HERE IS CLIENT-SIDE. staff.js already computes it all: it re-marks
 * every attempt with the real engines, names the misconceptions, and flags who
 * is struggling. Nothing new is asked of the server.
 *
 * THE LAWS THIS FILE IS WRITTEN UNDER:
 *   - every number sits in a region labelled with its BOOK and its EXERCISE
 *     (DFM 156c: a stat with no home is unreadable the moment two books are on)
 *   - the legend is visible without hovering (a smartboard has no hover)
 *   - every control that will not act says why, beside itself
 *   - every screen declares itself (data-surface / data-state)
 *   - the teacher register: economy by CUTTING sentences, never by compressing
 *     one into a fragment; no "she" for a pupil, name her.
 */
(function () {
  'use strict';

  var S = window.GJ_STAFF_PAGES = {};

  function T(k, vals) {
    var t = (window.GJ_STRINGS && window.GJ_STRINGS.teacher && window.GJ_STRINGS.teacher[k]) || '';
    return (window.GJ_STRINGS && window.GJ_STRINGS.fill) ? window.GJ_STRINGS.fill(t, vals) : t;
  }

  /* ═══ THE FLAGS — a to-do with a reason, that clears itself ══════════
     Three triggers, and each one is a sentence a teacher can act on without
     decoding anything:
       - wrong twice on a question
       - used the method help and is still wrong
       - nothing saved for a while, with the question open
     A chip disappears on the next poll after its condition ends: that is what
     makes it a to-do rather than a notice (DFM 160).
     Exported so a gate can run it against synthetic cells under node. */
  var STUCK_MINUTES = 8;
  S.needsYou = function (pupils, qlist, bookTitle, now) {
    now = now || Math.floor(Date.now() / 1000);
    var out = [];
    (pupils || []).forEach(function (p) {
      var sum = p.summary || {};
      var qs = sum.qs || {};
      qlist.forEach(function (item) {
        var c = qs[item.q.id];
        if (!c) return;
        var st = c.ovr === 1 ? 'ok' : c.ovr === 0 ? 'err' : c.st;
        var where = { book: bookTitle, exercise: item.exLabel, question: item.qLabel };
        if (st === 'err' && (c.at || 0) >= 2) {
          out.push({ email: p.email, name: p.name || p.email, qid: item.q.id,
            why: T('needsYouWrongTwice', where), rank: 3 });
          return;
        }
        if (c.help && st === 'err') {
          out.push({ email: p.email, name: p.name || p.email, qid: item.q.id,
            why: T('needsYouPulledHelp', where), rank: 4 });
          return;
        }
        if (st === 'open' && sum.upd && (now - sum.upd) > STUCK_MINUTES * 60) {
          out.push({ email: p.email, name: p.name || p.email, qid: item.q.id,
            why: T('needsYouStuck', { book: where.book, exercise: where.exercise, question: where.question,
              minutes: Math.floor((now - sum.upd) / 60) }), rank: 2 });
        }
      });
    });
    /* one chip per pupil: the most pressing reason wins, because a teacher with
       four chips for one girl has a list, not a flag */
    var best = {};
    out.forEach(function (f) { if (!best[f.email] || best[f.email].rank < f.rank) best[f.email] = f; });
    return Object.keys(best).map(function (k) { return best[k]; })
      .sort(function (a, b) { return b.rank - a.rank || a.name.localeCompare(b.name); });
  };

  /* ═══ the shape of one exercise, from the cheap summary ═════════════ */
  S.exerciseStats = function (pupils, sec, si, dxNames) {
    var out = { started: 0, ok: 0, amber: 0, err: 0, open: 0, un: 0, slip: null, slipN: 0, dots: [] };
    var dxCount = {};
    sec.questions.forEach(function (q, qi) {
      var dot = { label: 'Q' + (qi + 1), ok: 0, bad: 0, mixed: 0, seen: 0 };
      (pupils || []).forEach(function (p) {
        var c = ((p.summary || {}).qs || {})[q.id];
        if (!c) { out.un++; return; }
        dot.seen++;
        var st = c.ovr === 1 ? 'ok' : c.ovr === 0 ? 'err' : c.st;
        if (st === 'ok') { out.ok++; dot.ok++; }
        else if (st === 'amber') { out.amber++; dot.mixed++; }
        else if (st === 'err') { out.err++; dot.bad++; if (c.dx) dxCount[c.dx] = (dxCount[c.dx] || 0) + 1; }
        else { out.open++; }
      });
      out.dots.push(dot);
    });
    out.started = out.ok + out.amber + out.err + out.open;
    var top = Object.keys(dxCount).sort(function (a, b) { return dxCount[b] - dxCount[a]; })[0];
    if (top) { out.slip = (dxNames && dxNames[top]) || top; out.slipN = dxCount[top]; }
    return out;
  };

  S.STUCK_MINUTES = STUCK_MINUTES;
})();
