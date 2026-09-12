const fs = require('fs');
const f = '/Users/damiengartland/Sites/ols-wt-maths/maths/mathshelf/statchart.js';
let s = fs.readFileSync(f, 'utf8');
function rep(a, b) { if (s.indexOf(a) < 0) throw new Error('anchor not found: ' + a.slice(0, 60)); if (s.indexOf(a) !== s.lastIndexOf(a)) throw new Error('anchor not unique'); s = s.replace(a, b); }
rep(`    function drop(o) {
      o = o || {};
      gDrop.innerHTML = '';
      removeLabelsByPrefix('drop:');`,
`    /* the read-out comes OFF when the rule is parked at the axis (the stray "0"
       on Exercise 4's opening at 375, 12 Sept 2026) - clearing without drawing */
    function clearDrop() {
      gDrop.innerHTML = '';
      removeLabelsByPrefix('drop:');
    }
    function drop(o) {
      o = o || {};
      clearDrop();`);
rep(`      rule: rule,
      ruleX: ruleX,
      drop: drop,`,
`      rule: rule,
      ruleX: ruleX,
      drop: drop,
      clearDrop: clearDrop,`);
fs.writeFileSync(f, s);
console.log('ok');
