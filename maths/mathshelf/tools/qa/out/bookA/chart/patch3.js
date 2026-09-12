const fs = require('fs');
const f = '/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/statchart.js';
let s = fs.readFileSync(f, 'utf8');
function rep(a, b) { if (s.indexOf(a) < 0) throw new Error('anchor not found: ' + a.slice(0, 60)); if (s.indexOf(a) !== s.lastIndexOf(a)) throw new Error('anchor not unique'); s = s.replace(a, b); }
rep(`    function relayout() {
      if (!HAS_DOM || !svg.getScreenCTM) return;
      svg.style.width = '100%';
      var ctm = svg.getScreenCTM();`,
`    /* THE LAPTOP MARGIN RECLAIM (12 Sept 2026, Book A cut). On a 1280 laptop
       a 0-60 scale board is 752 px at law 6 and the question body is 698, so
       54 px hid behind a sideways scroll while the question-number column to
       the host's LEFT sat empty. If the host is narrower than the board's
       law-6 width, the host is not already pulled left by the phone CSS (a
       negative computed margin at <= 480 px - left alone), and the deficit
       fits in the strip between the host and its question's left edge, the
       host takes exactly that strip. layoutLabels() reads the computed margin
       and keeps every label out of the reclaimed strip on its own. */
    function reclaimMargin() {
      try {
        var lawW = st.geo.vbw * (MIN_SQUARE_PX / SQ_UNIT) + 2;
        if (host.getAttribute('data-reclaimed') != null) { host.style.marginLeft = ''; host.removeAttribute('data-reclaimed'); }
        var ml = parseFloat(getComputedStyle(host).marginLeft || '0') || 0;
        if (ml < 0) return;
        var avail = host.clientWidth;
        if (!(avail > 0)) return;
        var deficit = Math.ceil(lawW - avail);
        if (deficit <= 0) return;
        var anc = host.closest ? host.closest('.jotter-q, [data-surface="question"]') : null;
        if (!anc) return;
        var room = host.getBoundingClientRect().left - anc.getBoundingClientRect().left - 8;
        if (deficit > room) return;
        host.style.marginLeft = (-deficit) + 'px';
        host.setAttribute('data-reclaimed', deficit);
      } catch (e) {}
    }
    function relayout() {
      if (!HAS_DOM || !svg.getScreenCTM) return;
      svg.style.width = '100%';
      reclaimMargin();
      var ctm = svg.getScreenCTM();`);
fs.writeFileSync(f, s);
console.log('ok');
