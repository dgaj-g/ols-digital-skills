const fs = require('fs');
let f = '/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/statchart.js';
let s = fs.readFileSync(f, 'utf8');
function rep(a, b) { if (s.indexOf(a) < 0) throw new Error('anchor not found: ' + a.slice(0, 60)); if (s.indexOf(a) !== s.lastIndexOf(a)) throw new Error('anchor not unique'); s = s.replace(a, b); }
rep(`        var byx = g.plotX0, byy = g.plotY1;
        var zzy = 'M ' + (byx - 6) + ' ' + (byy + 4) + ' l 5 -3 l -8 -4 l 8 -4 l -5 -3';`,
`        /* ON the axis line just above the origin (the textbook glyph), so it
           never touches the first y number, which sits 6 CSS px left of the axis */
        var byx = g.plotX0, byy = g.plotY1;
        var zzy = 'M ' + byx + ' ' + (byy - 3) + ' l -5 -3 l 10 -5 l -10 -5 l 5 -3';`);
fs.writeFileSync(f, s);
f = '/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/player.js';
s = fs.readFileSync(f, 'utf8');
rep(`      vennBd = SC.venn(host, { circles: spec.circles || [], n: spec.n }, { append: true });
      vennBd.relayout();`,
`      vennBd = SC.venn(host, { circles: spec.circles || [], n: spec.n }, { append: true });
      host.style.maxWidth = vennBd.frame.style.maxWidth;   /* the host shrinks to the board so margin:auto centres it on the paper */
      vennBd.relayout();`);
rep(`      pieBd.__i = 0;
      pieBd.relayout();`,
`      pieBd.__i = 0;
      host.style.maxWidth = pieBd.frame.style.maxWidth;
      pieBd.relayout();`);
rep(`      slBd = SC.stemleafFilm(host, { stems: spec.stems || [], decimals: spec.decimals, unit: spec.unit, back: !!spec.back, sides: spec.sides, title: spec.title }, { append: true });
      slBd.relayout();`,
`      slBd = SC.stemleafFilm(host, { stems: spec.stems || [], decimals: spec.decimals, unit: spec.unit, back: !!spec.back, sides: spec.sides, title: spec.title }, { append: true });
      host.style.maxWidth = slBd.frame.style.maxWidth;
      slBd.relayout();`);
fs.writeFileSync(f, s);
console.log('ok');
