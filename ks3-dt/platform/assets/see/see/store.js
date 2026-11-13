/* Teach It To See · the save. A kept drawing is stored as what the learner sees: 28 x 28 numbers.
   Each number is rounded to one of 2^bits levels, runs of empty squares are counted, and the lot is packed into text.
   The first character says how many bits. Runs in the page and in the node gates. */
(function (g) {
  var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function enc(v, bits) {
    bits = bits || 4;
    var L = (1 << bits) - 1, sym = [], i = 0, n = v.length, out = String(bits), acc = 0, k = 0;
    while (i < n) {
      var q = Math.max(0, Math.min(L, Math.round(v[i] * L)));
      if (q) { sym.push(q); i++; continue; }
      var run = 0;
      while (i < n && run <= L && Math.round(v[i] * L) <= 0) { run++; i++; }
      sym.push(0, run - 1);
    }
    sym.forEach(function (s) { acc = (acc << bits) | s; k += bits; while (k >= 6) { k -= 6; out += A[(acc >> k) & 63]; } acc &= (1 << k) - 1; });
    if (k) out += A[(acc << (6 - k)) & 63];
    return out;
  }
  function dec(t, size) {
    var bits = +t[0], L = (1 << bits) - 1, n = size || 784, v = new Float32Array(n), i = 0, acc = 0, k = 0, p = 1, zero = false;
    while (i < n && (p < t.length || k >= bits)) {
      while (k < bits && p < t.length) { acc = (acc << 6) | A.indexOf(t[p++]); k += 6; }
      if (k < bits) break;
      k -= bits; var s = (acc >> k) & L; acc &= (1 << k) - 1;
      if (zero) { i += s + 1; zero = false; } else if (s) v[i++] = s / L; else zero = true;
    }
    return v;
  }
  g.SeeStore = { enc: enc, dec: dec };
})(typeof window !== 'undefined' ? window : module.exports);
