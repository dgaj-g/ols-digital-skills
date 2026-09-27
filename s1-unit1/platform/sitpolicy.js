/* sitpolicy.js — the scripted pupil's answers for the sit run (G2 on the harness, G4 on /dev). Deterministic and key-free:
 * it sees only the drawn view, never a mark scheme, so it mixes right and wrong answers the way a real pupil would.
 * The same file runs in node (gates compare the page's marks with the judge on the same seed and policy) and in the page. */
(function (root) {
  'use strict';
  var WORDS = ['binary', '8', '1024', 'lossy', 'pixel', 'bit', 'byte', 'integer', 'ASCII', 'sample rate', '2', 'Unicode', 'resolution', 'hexadecimal'];
  function h32(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pickN(options, n, seed) {
    var ranked = options.map(function (o, i) { return { o: o, k: h32(seed + '|' + i + '|' + o) }; }).sort(function (a, b) { return a.k - b.k; });
    return ranked.slice(0, n).map(function (x) { return x.o; });
  }
  function answer(v, seed) {
    var s = String(seed) + '|' + v.id, h = h32(s);
    if (v.form === 'pick1' || v.form === 'pickN') return { picks: pickN(v.options, v.n, s) };
    if (v.form === 'writepick') {
      var skip = h % 3 === 0;
      return { text: skip ? '' : 'It uses bits to store the data so the computer can work with it', skipped: skip,
        parts: v.parts.map(function (p, k) { return { picks: pickN(p.options, p.n, s + '|' + k) }; }) };
    }
    if (v.form === 'type') {
      if (h % 5 === 0) return { texts: v.items.map(function () { return ''; }), idk: true };
      return { texts: v.items.map(function (_, k) { return WORDS[h32(s + '|t' + k) % WORDS.length]; }) };
    }
    if (v.form === 'pairs') return { map: v.left.map(function (_, k) { return v.right[(h + k * 7) % v.right.length]; }) };
    if (v.form === 'choose') return { choices: v.items.map(function (it, k) { return it.opts[h32(s + '|c' + k) % it.opts.length]; }) };
    if (v.form === 'gaps') {
      var fills = [];
      for (var i = 0; i < v.gapCount; i++) fills.push(v.pool ? v.pool[h32(s + '|g' + i) % v.pool.length] : WORDS[h32(s + '|g' + i) % WORDS.length]);
      return { fills: fills };
    }
    return {};
  }
  var API = { answer: answer, h32: h32, flagEvery: 7 };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SitPolicy = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
