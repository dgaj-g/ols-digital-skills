const fs = require('fs');
let f = '/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/player.js';
let s = fs.readFileSync(f, 'utf8');
function rep(a, b) { if (s.indexOf(a) < 0) throw new Error('anchor not found: ' + a.slice(0, 60)); if (s.indexOf(a) !== s.lastIndexOf(a)) throw new Error('anchor not unique'); s = s.replace(a, b); }
rep(`    var SC = window.GJ_STATCHART || null;
    function boardHost(cls) {`,
`    function SCH() { return window.GJ_STATCHART || null; }
    function boardHost(cls) {`);
rep(`      if (!SC || !SC.venn) return Promise.resolve();
      var spec = op.venn || {};
      var host = boardHost('ml-venn');
      vennBd = SC.venn(host,`, `      var SC = SCH();
      if (!SC || !SC.venn) return Promise.resolve();
      var spec = op.venn || {};
      var host = boardHost('ml-venn');
      vennBd = SC.venn(host,`);
rep(`      if (!SC || !SC.pie) return Promise.resolve();
      var host = boardHost('ml-pie');
      pieBd = SC.pie(host,`, `      var SC = SCH();
      if (!SC || !SC.pie) return Promise.resolve();
      var host = boardHost('ml-pie');
      pieBd = SC.pie(host,`);
rep(`      if (!SC || !SC.stemleafFilm) return Promise.resolve();
      var spec = op.stemleaf || {};`, `      var SC = SCH();
      if (!SC || !SC.stemleafFilm) return Promise.resolve();
      var spec = op.stemleaf || {};`);
rep(`        if (to < 360 - 1e-6) pieBd.boundary(to, { placed: false });`, `        if (to < 360 - 1e-6) pieBd.boundary(to, { plain: true });`);
fs.writeFileSync(f, s);

f = '/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/statchart.js';
s = fs.readFileSync(f, 'utf8');
rep(`    function boundary(deg, o) {
      o = o || {};
      if (o.i != null && bounds[o.i]) { setBoundary(bounds[o.i], deg); return o.i; }
      var g = sv('g', { class: 'stat-pie-bound-g' });`,
`    function boundary(deg, o) {
      o = o || {};
      if (o.i != null && bounds[o.i]) { setBoundary(bounds[o.i], deg); return o.i; }
      if (o.plain) {
        /* the FILM's boundary: a radius line and nothing to press */
        var u0 = rimUser(normDeg(deg));
        var pl = sv('line', { x1: CX, y1: CY, x2: u0[0].toFixed(2), y2: u0[1].toFixed(2), stroke: 'var(--copper)', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', class: 'stat-pie-bound-line' });
        gBounds.appendChild(pl);
        return -1;
      }
      var g = sv('g', { class: 'stat-pie-bound-g' });`);
fs.writeFileSync(f, s);
console.log('ok');
