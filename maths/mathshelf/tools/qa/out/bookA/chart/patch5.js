const fs = require('fs');
const f = '/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/player.js';
let s = fs.readFileSync(f, 'utf8');
function rep(a, b) { if (s.indexOf(a) < 0) throw new Error('anchor not found: ' + a.slice(0, 60)); if (s.indexOf(a) !== s.lastIndexOf(a)) throw new Error('anchor not unique'); s = s.replace(a, b); }

// state reset
rep(`      chart = null; scaleBd = null; tableEl = null;
      if (movie.mode === 'diagram' && movie.diagram) {`,
`      chart = null; scaleBd = null; tableEl = null;
      vennBd = null; pieBd = null; slBd = null;
      if (movie.mode === 'diagram' && movie.diagram) {`);

// new op functions before paperBalance
rep(`    function paperBalance(op, instant) {`,
`    /* ═════ BOOK A (12 Sept 2026): the Venn, pie, stem-and-leaf and line-of-
       best-fit beats (DESIGN §19 A·s2-A·s5). The three boards are drawn by
       GJ_STATCHART (the same paper every question board is drawn on), each in
       a host div carrying its op's ml- class so the film-draws law can count
       it; the values, sectors, leaves and key each carry their own ml- class
       on the SVG element that has the pixels. Every op replays instantly from
       the op history (goto) and instantly under reduced motion. */
    var vennBd = null, pieBd = null, slBd = null;
    var SC = window.GJ_STATCHART || null;
    function boardHost(cls) {
      var h = el('div', 'ml-board ' + cls);
      h.style.cssText = 'margin:8px auto;max-width:100%';
      stage.appendChild(h);
      return h;
    }
    function paperVenn(op, instant) {
      if (!SC || !SC.venn) return Promise.resolve();
      var spec = op.venn || {};
      var host = boardHost('ml-venn');
      vennBd = SC.venn(host, { circles: spec.circles || [], n: spec.n }, { append: true });
      vennBd.relayout();
      return fadeIn(host, instant, 300);
    }
    function paperVfill(op, instant) {
      if (!vennBd) return Promise.resolve();
      var v = op.vfill || {};
      var r = vennBd.fill(v.region, v.text, { instant: instant, cls: 'ml-vfill' });
      return r ? r.done : Promise.resolve();
    }
    function paperPie(op, instant) {
      if (!SC || !SC.pie) return Promise.resolve();
      var host = boardHost('ml-pie');
      pieBd = SC.pie(host, { readOnly: true, append: true });
      pieBd.__angle = 0;      /* the running angle the sectors sweep from */
      pieBd.__i = 0;
      pieBd.relayout();
      return fadeIn(host, instant, 300);
    }
    /* the NEXT sector clockwise from the last boundary: from the running angle
       through op.sector.deg; its label lands at the mid-angle once the sweep
       has finished; the new boundary is drawn as a radius */
    function paperSector(op, instant) {
      if (!pieBd) return Promise.resolve();
      var sct = op.sector || {};
      var deg = Number(sct.deg) || 0;
      var from = pieBd.__angle, to = from + deg;
      var i = pieBd.__i++;
      pieBd.__angle = to;
      var r = pieBd.sector(from, to, i, { instant: instant });
      r.el.classList.add('ml-sector');
      return r.done.then(function () {
        if (to < 360 - 1e-6) pieBd.boundary(to, { placed: false });
        if (sct.label != null && sct.label !== '') {
          var L = pieBd.sectorLabel(from, to, sct.label, { instant: instant, cls: 'ml-sector-label' });
          return L.done;
        }
      });
    }
    function paperStemleaf(op, instant) {
      if (!SC || !SC.stemleafFilm) return Promise.resolve();
      var spec = op.stemleaf || {};
      var host = boardHost('ml-stemleaf');
      slBd = SC.stemleafFilm(host, { stems: spec.stems || [], decimals: spec.decimals, unit: spec.unit, back: !!spec.back, sides: spec.sides, title: spec.title }, { append: true });
      slBd.relayout();
      return fadeIn(host, instant, 300);
    }
    function paperLeaf(op, instant) {
      if (!slBd) return Promise.resolve();
      var lf = op.leaf || {};
      var r = slBd.addLeaf(lf.stem, lf.leaf, lf.side || 'right', { instant: instant, cls: 'ml-leaf', ms: 180 });
      return r ? r.done : Promise.resolve();
    }
    function paperKey(op, instant) {
      if (!slBd) return Promise.resolve();
      var k = op.key || {};
      var r = slBd.key(k.stem, k.leaf, k.means, { instant: instant, cls: 'ml-key' });
      return r ? r.done : Promise.resolve();
    }
    /* the line of best fit on the film's OWN chart (the one \`chart\`/\`plot\`
       drew): through the two given axis points, extended to the plot edges
       and clipped there, drawn at pen speed. \`rule\`/\`drop\` then read against
       it (paperDrop below reads the line when there is no curve). */
    function paperLobf(op, instant) {
      if (!chart) return Promise.resolve();
      var th = (op.lobf && op.lobf.through) || [];
      if (th.length < 2) return Promise.resolve();
      var a = [chart.px(th[0][0]), chart.py(th[0][1])], b = [chart.px(th[1][0]), chart.py(th[1][1])];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return Promise.resolve();
      var t0 = -Infinity, t1 = Infinity;
      function clipDim(p, d, lo, hi) {
        if (Math.abs(d) < 1e-12) return p >= lo && p <= hi;
        var ta = (lo - p) / d, tb = (hi - p) / d;
        if (ta > tb) { var tmp = ta; ta = tb; tb = tmp; }
        if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
        return t0 <= t1;
      }
      if (!clipDim(a[0], dx, CH.L, CH.W - CH.R) || !clipDim(a[1], dy, CH.T, CH.H - CH.B) || t0 > t1) return Promise.resolve();
      var e1 = [a[0] + t0 * dx, a[1] + t0 * dy], e2 = [a[0] + t1 * dx, a[1] + t1 * dy];
      var old = chart.svg.querySelector('.ml-lobf');
      if (old) old.remove();
      var path = sv('path', { d: 'M ' + e1[0].toFixed(1) + ' ' + e1[1].toFixed(1) + ' L ' + e2[0].toFixed(1) + ' ' + e2[1].toFixed(1),
        class: 'ml-lobf', fill: 'none', stroke: 'var(--copper, #A8572A)', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
      chart.ink.appendChild(path);
      /* the line in AXIS units, as a two-point chord the drop can read */
      var inv = function (p) { return [chart.xs.min + (p[0] - CH.L) / (CH.W - CH.L - CH.R) * (chart.xs.max - chart.xs.min),
                                       chart.ys.min + ((CH.H - CH.B) - p[1]) / (CH.H - CH.B - CH.T) * (chart.ys.max - chart.ys.min)]; };
      chart.lobf = [inv(e1), inv(e2)].sort(function (p, q) { return p[0] - q[0]; });
      return drawStroke(path, instant);
    }
    /* a VERTICAL rule at x (the scatter estimate: "from 60 on the x axis, up
       to the line") - \`rule {x}\`; the horizontal \`rule {h}\` is untouched */
    function paperRuleX(op, instant) {
      if (!chart) return Promise.resolve();
      var x = op.rule.x;
      var xTo = chart.px(x);
      var xFrom = chart.ruleX == null ? CH.L : chart.px(chart.ruleX);
      var r = chart.svg.querySelector('.ml-rule[data-axis="x"]');
      if (!r) {
        r = sv('path', { class: 'ml-rule', 'data-axis': 'x', fill: 'none',
          stroke: 'var(--copper, #A8572A)', 'stroke-width': 1.8, 'stroke-dasharray': '6 4' });
        chart.ink.appendChild(r);
      }
      r.setAttribute('d', 'M ' + xTo.toFixed(1) + ' ' + (CH.H - CH.B) + ' V ' + CH.T);
      chart.ruleX = x;
      chart.ruleH = null;
      if (instant || REDUCED) { r.style.transition = 'none'; r.style.transform = 'none'; return Promise.resolve(); }
      r.style.transition = 'none';
      r.style.transform = 'translateX(' + (xFrom - xTo).toFixed(1) + 'px)';
      r.getBoundingClientRect();
      r.style.transition = 'transform 520ms ease-in-out';
      r.style.transform = 'translateX(0px)';
      return new Promise(function (res) { setTimeout(res, 560); });
    }
    function yAtX(pts, x) {
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        if ((x >= a[0] && x <= b[0]) || (x <= a[0] && x >= b[0])) {
          if (b[0] === a[0]) return a[1];
          return a[1] + (x - a[0]) * (b[1] - a[1]) / (b[0] - a[0]);
        }
      }
      return null;
    }
    /* the drop from a VERTICAL rule: up the rule to the line, across to the y axis, the y read out */
    function paperDropX(op, instant) {
      if (!chart || chart.ruleX == null) return Promise.resolve();
      var pts = chart.curve || chart.lobf;
      if (!pts) return Promise.resolve();
      var x = chart.ruleX;
      var y = yAtX(pts, x);
      if (y == null) return Promise.resolve();
      var g = sv('g', { class: 'ml-drop' });
      var up = sv('path', { d: 'M ' + chart.px(x).toFixed(1) + ' ' + (CH.H - CH.B) + ' V ' + chart.py(y).toFixed(1),
        fill: 'none', stroke: 'var(--copper, #A8572A)', 'stroke-width': 1.7, 'stroke-linecap': 'round' });
      var across = sv('path', { d: 'M ' + chart.px(x).toFixed(1) + ' ' + chart.py(y).toFixed(1) + ' H ' + CH.L,
        fill: 'none', stroke: 'var(--copper, #A8572A)', 'stroke-width': 1.7, 'stroke-linecap': 'round' });
      g.appendChild(up); g.appendChild(across);
      var lbl = sv('text', { x: (CH.L - 7).toFixed(1), y: (chart.py(y) - 6).toFixed(1), 'text-anchor': 'end', class: 'ml-read' });
      lbl.textContent = tidy(y);
      g.appendChild(lbl);
      chart.ink.appendChild(g);
      return drawStroke(up, instant)
        .then(function () { return drawStroke(across, instant); })
        .then(function () { return fadeIn(lbl, instant, 200); });
    }

    function paperBalance(op, instant) {`);

// paperDrop: read the lobf when there is no curve (additive)
rep(`    function paperDrop(op, instant) {
      if (!chart || chart.ruleH == null || !chart.curve) return Promise.resolve();
      var h = chart.ruleH;
      var x = xAtHeight(chart.curve, h);`,
`    function paperDrop(op, instant) {
      if (chart && chart.ruleH == null && chart.ruleX != null) return paperDropX(op, instant);
      if (!chart || chart.ruleH == null || !(chart.curve || chart.lobf)) return Promise.resolve();
      var h = chart.ruleH;
      var x = xAtHeight(chart.curve || chart.lobf, h);`);

// applyOp: new branches (before the existing rule branch for rule.x; the rest after drop)
rep(`      if (op.rule) return paperRule(op, instant);
      if (op.drop) return paperDrop(op, instant);`,
`      if (op.rule && op.rule.h == null && op.rule.x != null) return paperRuleX(op, instant);
      if (op.rule) return paperRule(op, instant);
      if (op.drop) return paperDrop(op, instant);
      /* Book A (12 Sept 2026) */
      if (op.venn) return paperVenn(op, instant);
      if (op.vfill) return paperVfill(op, instant);
      if (op.pie) return paperPie(op, instant);
      if (op.sector) return paperSector(op, instant);
      if (op.stemleaf) return paperStemleaf(op, instant);
      if (op.leaf) return paperLeaf(op, instant);
      if (op.key) return paperKey(op, instant);
      if (op.lobf) return paperLobf(op, instant);`);

fs.writeFileSync(f, s);
console.log('ok');
