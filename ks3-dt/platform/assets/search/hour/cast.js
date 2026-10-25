/* Bran the collie and the ewe: drawn from the frozen helpers (SearchChars), never touching chars.js. Both face us. */
(function () {
  'use strict'; var C = window.SearchChars, sh = C.sh, rr = C.rr, TAU = C.TAU;
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
  /* p: t, bark (0..1), lie (0..1). unit size ~ 2.4 tall; draw with ctx.scale */
  function bran(ctx, p) { var t = p.t || 0, bark = p.bark || 0, lie = p.lie || 0, bob = Math.sin(t * 6) * 0.02 * (1 - lie);
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = sh([28, 28, 34]); ell(ctx, 0, 1.3 - lie * 0.5, 1.0, 0.7 - lie * 0.25); /* body */
    ctx.fillStyle = sh([240, 240, 236]); ell(ctx, 0, 1.62 - lie * 0.5, 0.42, 0.42 - lie * 0.15); /* chest */
    ctx.fillStyle = sh([28, 28, 34]); [-0.55, -0.2, 0.2, 0.55].forEach(function (x) { rr(ctx, x - 0.1, 1.7 - lie * 0.6, 0.2, 0.5 - lie * 0.3, 0.08); ctx.fill(); });
    ctx.fillStyle = sh([240, 240, 236]); [-0.55, -0.2, 0.2, 0.55].forEach(function (x) { ell(ctx, x, 2.18 - lie * 0.9, 0.13, 0.08); }); /* socks */
    ctx.save(); ctx.translate(0.95, 1.1 - lie * 0.4); ctx.rotate(Math.sin(t * 7) * 0.5); ctx.fillStyle = sh([28, 28, 34]); rr(ctx, 0, -0.08, 0.6, 0.16, 0.08); ctx.fill(); ctx.fillStyle = sh([240, 240, 236]); ell(ctx, 0.58, 0, 0.1, 0.08); ctx.restore(); /* tail */
    ctx.fillStyle = sh([28, 28, 34]); ell(ctx, 0, 0.55, 0.62, 0.56); /* head */
    ctx.beginPath(); ctx.moveTo(-0.62, 0.3); ctx.lineTo(-0.5, -0.35); ctx.lineTo(-0.15, 0.2); ctx.closePath(); ctx.fill(); /* ear up */
    ctx.beginPath(); ctx.moveTo(0.62, 0.3); ctx.lineTo(0.62, -0.15); ctx.lineTo(0.2, 0.15); ctx.closePath(); ctx.fill(); /* ear folded */
    ctx.fillStyle = sh([240, 240, 236]); ctx.beginPath(); ctx.moveTo(-0.12, 0.05); ctx.lineTo(0.12, 0.05); ctx.lineTo(0.3, 1.0); ctx.lineTo(-0.3, 1.0); ctx.closePath(); ctx.fill(); /* blaze */
    ell(ctx, 0, 0.86, 0.34, 0.24); /* muzzle */
    ctx.fillStyle = sh([20, 16, 18]); ell(ctx, 0, 0.78, 0.1, 0.07); /* nose */
    ctx.strokeStyle = sh([20, 16, 18]); ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(0, 0.84); ctx.lineTo(0, 0.92); ctx.stroke();
    if (bark > 0) { ctx.fillStyle = sh([120, 50, 60]); ell(ctx, 0, 1.0, 0.14 * bark, 0.1 * bark); } else { ctx.beginPath(); ctx.arc(0, 0.9, 0.12, 0.15, Math.PI - 0.15); ctx.stroke(); }
    [-0.24, 0.24].forEach(function (x, i) { ctx.save(); ctx.translate(x, 0.5); C.eye(ctx, { rx: 0.11, ry: 0.11, side: i ? 1 : -1, look: p.look || [0, 0], blink: p.blink || 0, x: 0, y: 0, t: p.t || 0, soft: 1, wet: 0.2, pupil: 0.56, irisR: 0.86, rim: [26, 20, 18], lid: [38, 30, 26], white: [240, 238, 236], iris: [[70, 44, 30], [110, 74, 44], [150, 110, 70]] }); ctx.restore(); });
    ctx.restore(); }
  /* the ewe: the lamb's shapes at twice the size, calm. p: t */
  function ewe(ctx, p) { ctx.save(); ctx.scale(2, 2); C.lamb(ctx, { t: p.t || 0, fear: 0, safe: 1, cold: 0, blink: p.blink || 0, look: p.look || 0, breath: 1 }); ctx.restore(); }
  window.SearchCast = { bran: bran, ewe: ewe };
})();
