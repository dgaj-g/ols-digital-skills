/* TWO LIGHTS: the bay at night, drawn in code on one Canvas 2D context. No image files.
   Lighthouses: origin = centre of the lamp room (the head); 1 unit = half the head's width; y runs down.
   Puffins: origin = centre of the body; 1 unit = the body's radius. The caller translates and scales. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var C = { sea: '#0B1B33', fog: [184, 196, 214], tower: '#F2F2F2', band: '#C8352E', beam: [242, 193, 78],
    orange: '#F08A24', iron: '#2B2F3A', glassOff: '#26324C', glassOn: '#FFD978', oil: '#F4C430', oilDark: '#C99A12' };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }

  /* ---------- the bay ---------- */
  function sea(c, w, h, horizon, t) {
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#060E1E'); g.addColorStop(horizon / h, '#0F2340'); g.addColorStop(1, C.sea);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(150,180,220,0.10)'; c.lineWidth = 1.2;
    for (var i = 0; i < 14; i++) {
      var y = horizon + (h - horizon) * (i / 14) + 6, amp = 1.5 + i * 0.25;
      c.beginPath();
      for (var x = 0; x <= w; x += 10) c.lineTo(x, y + Math.sin(x * 0.045 + t * 1.3 + i * 1.7) * amp);
      c.stroke();
    }
  }
  function rocks(c, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    var r = rng(7);
    c.fillStyle = '#141820';
    for (var k = 0; k < 4; k++) {
      var bx = k * 0.9 - 1.2, bh = 0.9 + r() * 0.9;
      c.beginPath(); c.moveTo(bx - 0.6, 0.3); c.lineTo(bx - 0.35, -bh * 0.6); c.lineTo(bx, -bh); c.lineTo(bx + 0.3, -bh * 0.55);
      c.lineTo(bx + 0.62, 0.3); c.closePath(); c.fill();
    }
    c.strokeStyle = 'rgba(230,240,255,' + (0.35 + Math.sin(t * 2) * 0.15) + ')'; c.lineWidth = 0.08;
    c.beginPath();
    for (var u = -2; u <= 2.4; u += 0.2) c.lineTo(u, 0.28 + Math.sin(u * 5 + t * 3) * 0.06);
    c.stroke(); c.restore();
  }
  /* fog banks: soft drawn bands that roll; amount 0..1 */
  function fog(c, w, h, t, amount) {
    if (amount <= 0) return;
    var r = rng(11);
    for (var i = 0; i < 9; i++) {
      var fx = ((r() * w * 1.6 + t * (8 + r() * 10)) % (w * 1.6)) - w * 0.3, fy = h * (0.15 + r() * 0.75);
      var rx = w * (0.25 + r() * 0.3), ry = h * (0.06 + r() * 0.06);
      var g = c.createRadialGradient(fx, fy, 0, fx, fy, rx);
      g.addColorStop(0, 'rgba(184,196,214,' + (0.35 * amount) + ')'); g.addColorStop(1, 'rgba(184,196,214,0)');
      c.save(); c.translate(fx, fy); c.scale(1, ry / rx); c.translate(-fx, -fy);
      c.fillStyle = g; c.beginPath(); c.arc(fx, fy, rx, 0, TAU); c.fill(); c.restore();
    }
  }

  /* ---------- the beam: a wedge that sweeps once every 4 s ---------- */
  function beam(c, x, y, len, t, on, dir) {
    if (on <= 0) return;
    var ph = Math.sin(t * TAU / 4), ang = (dir < 0 ? Math.PI : 0) + ph * 0.55, spread = 0.13 + (1 - Math.abs(ph)) * 0.05;
    var g = c.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, 'rgba(255,236,170,' + 0.75 * on + ')'); g.addColorStop(0.35, 'rgba(242,193,78,' + 0.35 * on + ')');
    g.addColorStop(1, 'rgba(242,193,78,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g;
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, len, ang - spread, ang + spread); c.closePath(); c.fill();
    var h = c.createRadialGradient(x, y, 0, x, y, len * 0.22);
    h.addColorStop(0, 'rgba(255,230,150,' + 0.5 * on + ')'); h.addColorStop(1, 'rgba(255,230,150,0)');
    c.fillStyle = h; c.beginPath(); c.arc(x, y, len * 0.22, 0, TAU); c.fill(); c.restore();
  }

  /* ---------- a lighthouse face (the lamp room is the head) ----------
     st: { awake 0..1, smile 0..1, blink 0..1 (1 = shut), t, drip 0..1 } */
  function head(c, st) {
    var aw = st.awake || 0, sm = st.smile || 0, t = st.t || 0;
    // roof + finial
    c.fillStyle = C.band; c.beginPath(); c.moveTo(-1.12, -0.92); c.quadraticCurveTo(0, -1.85, 1.12, -0.92); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.moveTo(0.2, -1.48); c.quadraticCurveTo(0.8, -1.2, 1.12, -0.92); c.lineTo(0.3, -0.92); c.closePath(); c.fill();
    c.fillStyle = C.iron; c.beginPath(); c.arc(0, -1.55, 0.13, 0, TAU); c.fill();
    // lamp-room frame
    c.fillStyle = C.iron; rrect(c, -1.05, -0.98, 2.1, 1.78, 0.3); c.fill();
    // inner glow of the lamp behind the glass
    var gl = c.createRadialGradient(0, -0.25, 0.1, 0, -0.25, 1.3);
    gl.addColorStop(0, aw > 0 ? 'rgba(255,240,190,' + aw + ')' : 'rgba(0,0,0,0)'); gl.addColorStop(1, 'rgba(242,193,78,' + 0.55 * aw + ')');
    // two tall windows = the eyes
    var shut = Math.max(1 - aw, st.blink || 0);
    [-0.47, 0.47].forEach(function (ex) {
      c.save();
      rrect(c, ex - 0.29, -0.8, 0.58, 1.02, 0.26); c.fillStyle = C.glassOff; c.fill();
      c.clip();
      if (aw > 0) { c.fillStyle = gl; c.fillRect(ex - 0.3, -0.85, 0.6, 1.1); }
      // pupil: a big round dark eye with two shines, looking slightly toward the bay
      var open = 1 - shut;
      if (sm > 0.5 && open > 0.5) { // smile: happy crescent eyes
        c.strokeStyle = '#1B1A2A'; c.lineWidth = 0.13; c.lineCap = 'round';
        c.beginPath(); c.arc(ex, -0.18, 0.17, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        open = 0;
      }
      if (open > 0.02) {
        c.fillStyle = '#1B1A2A'; ell(c, ex - 0.02, -0.25 + (1 - open) * 0.12, 0.2, 0.27 * open, 0); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.arc(ex + 0.05, -0.36, 0.075 * open, 0, TAU); c.fill();
        c.beginPath(); c.arc(ex - 0.08, -0.15, 0.035 * open, 0, TAU); c.fill();
      }
      // the lid comes down from the top
      if (shut > 0.02) {
        var ly = -0.85 + 1.07 * shut;
        c.fillStyle = '#4A5574'; c.fillRect(ex - 0.32, -0.85, 0.64, 1.07 * shut);
        if (shut > 0.9) { // asleep: a big closed-eye curve with lashes, drawn bright so it reads at any size
          ly = -0.3;
          c.strokeStyle = '#DCE4F4'; c.lineWidth = 0.1; c.lineCap = 'round';
          c.beginPath(); c.moveTo(ex - 0.2, ly - 0.06); c.quadraticCurveTo(ex, ly + 0.2, ex + 0.2, ly - 0.06); c.stroke();
          c.lineWidth = 0.06;
          [-0.13, 0, 0.13].forEach(function (lx) { c.beginPath(); c.moveTo(ex + lx, ly + 0.06 + (lx ? 0 : 0.03)); c.lineTo(ex + lx * 1.5, ly + 0.2 + (lx ? 0 : 0.03)); c.stroke(); });
        } else {
          c.strokeStyle = '#0E1220'; c.lineWidth = 0.07; c.lineCap = 'round';
          c.beginPath(); c.moveTo(ex - 0.22, ly - 0.08); c.quadraticCurveTo(ex, ly + 0.08, ex + 0.22, ly - 0.08); c.stroke();
        }
      }
      c.restore();
      c.strokeStyle = '#11141C'; c.lineWidth = 0.06; rrect(c, ex - 0.29, -0.8, 0.58, 1.02, 0.26); c.stroke();
    });
    // nose: a little brass knob between the eyes
    c.fillStyle = '#C08A3A'; c.beginPath(); c.arc(0, 0.2, 0.11, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,240,200,0.6)'; c.beginPath(); c.arc(-0.03, 0.17, 0.035, 0, TAU); c.fill();
    // fog drip off the nose while asleep
    if (aw < 0.5) {
      var d = ((t * 0.45) % 1), dy = 0.3 + d * 0.5;
      c.fillStyle = 'rgba(200,214,232,' + (0.85 * (1 - d * 0.7)) + ')';
      c.beginPath(); c.moveTo(0, dy - 0.12); c.quadraticCurveTo(0.08, dy, 0, dy + 0.06); c.quadraticCurveTo(-0.08, dy, 0, dy - 0.12); c.fill();
    }
    // cheeks
    c.fillStyle = 'rgba(255,120,140,' + (0.25 + 0.35 * aw) + ')';
    ell(c, -0.78, 0.4, 0.16, 0.1); c.fill(); ell(c, 0.78, 0.4, 0.16, 0.1); c.fill();
    // mouth
    c.strokeStyle = '#F2D9A8'; c.lineWidth = 0.075; c.lineCap = 'round';
    if (sm > 0.05) {
      c.fillStyle = '#5A1E22'; c.beginPath(); c.moveTo(-0.5, 0.36); c.quadraticCurveTo(0, 0.36 + 0.7 * sm, 0.5, 0.36); c.closePath(); c.fill();
      c.fillStyle = '#E86A7A'; c.beginPath(); c.ellipse(0, 0.36 + 0.42 * sm, 0.2, 0.1 * sm, 0, 0, TAU); c.fill();
      c.lineWidth = 0.09; c.beginPath(); c.moveTo(-0.5, 0.36); c.quadraticCurveTo(0, 0.36 + 0.7 * sm, 0.5, 0.36); c.closePath(); c.stroke();
      c.fillStyle = 'rgba(255,240,180,0.9)'; [[-1.35, -0.9], [1.4, -0.6], [1.25, -1.3]].forEach(function (p, i) { var k = 0.12 + 0.06 * Math.sin(t * 4 + i * 2); c.beginPath(); c.moveTo(p[0], p[1] - k * 2); c.lineTo(p[0] + k * 0.5, p[1]); c.lineTo(p[0], p[1] + k * 2); c.lineTo(p[0] - k * 0.5, p[1]); c.closePath(); c.fill(); c.beginPath(); c.moveTo(p[0] - k * 2, p[1]); c.lineTo(p[0], p[1] + k * 0.5); c.lineTo(p[0] + k * 2, p[1]); c.lineTo(p[0], p[1] - k * 0.5); c.closePath(); c.fill(); });
    } else if (aw > 0.5) {
      c.lineWidth = 0.1; c.beginPath(); c.moveTo(-0.3, 0.4); c.quadraticCurveTo(0, 0.62, 0.3, 0.4); c.stroke();
    } else {
      c.beginPath(); c.ellipse(0, 0.5, 0.07, 0.05, 0, 0, TAU); c.stroke();
    }
    // gallery collar + rail
    c.fillStyle = '#1E222C'; rrect(c, -1.34, 0.78, 2.68, 0.18, 0.06); c.fill();
    c.strokeStyle = '#5B6274'; c.lineWidth = 0.05;
    c.beginPath(); c.moveTo(-1.3, 0.55); c.lineTo(-1.05, 0.55); c.moveTo(1.05, 0.55); c.lineTo(1.3, 0.55); c.stroke();
    [-1.28, -1.15, 1.15, 1.28].forEach(function (px) { c.beginPath(); c.moveTo(px, 0.55); c.lineTo(px, 0.8); c.stroke(); });
  }
  function zzz(c, t) {
    c.fillStyle = 'rgba(220,230,255,0.75)'; c.font = '700 0.42px "Space Grotesk", sans-serif';
    for (var i = 0; i < 2; i++) {
      var p = (t * 0.3 + i * 0.5) % 1;
      c.globalAlpha = Math.sin(p * Math.PI); c.fillText('z', 1.0 + p * 0.6, -1.0 - p * 0.9);
    }
    c.globalAlpha = 1;
  }
  function tower(c) {
    var top = 0.95, bot = 5.4, wt = 0.95, wb = 1.42;
    function hw(y) { return wt + (wb - wt) * (y - top) / (bot - top); }
    var g = c.createLinearGradient(-wb, 0, wb, 0);
    g.addColorStop(0, '#C9CFDA'); g.addColorStop(0.35, C.tower); g.addColorStop(1, '#8E96A6');
    c.fillStyle = g; c.beginPath(); c.moveTo(-wt, top); c.lineTo(wt, top); c.lineTo(wb, bot); c.lineTo(-wb, bot); c.closePath(); c.fill();
    [[1.75, 2.5], [3.35, 4.1]].forEach(function (b) {
      var gb = c.createLinearGradient(-wb, 0, wb, 0);
      gb.addColorStop(0, '#9E2A25'); gb.addColorStop(0.35, C.band); gb.addColorStop(1, '#7A1F1B');
      c.fillStyle = gb; c.beginPath(); c.moveTo(-hw(b[0]), b[0]); c.lineTo(hw(b[0]), b[0]); c.lineTo(hw(b[1]), b[1]); c.lineTo(-hw(b[1]), b[1]); c.closePath(); c.fill();
    });
    c.fillStyle = C.iron; rrect(c, -0.28, 4.6, 0.56, 0.8, 0.26); c.fill();
    c.fillStyle = '#FFD978'; rrect(c, -0.12, 2.85, 0.24, 0.32, 0.1); c.fill();
  }
  /* st.awake etc. as head(); draws the whole lighthouse with its beam at (x, y) scale s */
  function lighthouse(c, x, y, s, st) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(0,0,0,0.35)'; ell(c, 0, 5.45, 2.0, 0.28); c.fill();
    tower(c); head(c, st);
    if ((st.awake || 0) < 0.5) zzz(c, st.t || 0);
    c.restore();
  }
  function lightship(c, x, y, s, st) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.translate(0, Math.sin((st.t || 0) * 1.6) * 0.08);
    // mast under the head
    c.fillStyle = '#4A505E'; c.fillRect(-0.18, 0.9, 0.36, 2.0);
    // hull
    var g = c.createLinearGradient(0, 2.6, 0, 4.1); g.addColorStop(0, '#D8443C'); g.addColorStop(1, '#8E241F');
    c.fillStyle = g; c.beginPath(); c.moveTo(-2.9, 2.75); c.lineTo(2.9, 2.75); c.quadraticCurveTo(2.6, 4.0, 1.8, 4.15); c.lineTo(-1.8, 4.15); c.quadraticCurveTo(-2.6, 4.0, -2.9, 2.75); c.closePath(); c.fill();
    c.fillStyle = '#F2F2F2'; c.fillRect(-2.75, 2.75, 5.5, 0.16);
    c.fillStyle = '#F2F2F2'; c.font = '700 0.5px "Space Grotesk", sans-serif'; c.textAlign = 'center'; c.fillText('LIGHTSHIP', 0, 3.6);
    head(c, st); if ((st.awake || 0) < 0.5) zzz(c, st.t || 0);
    c.restore();
  }

  /* ---------- puffins in oilskins ----------
     who: 'pip' | 'nuala' | 'finn'; mood: 'worried' | 'cheer' | 'calm' */
  function puffin(c, x, y, s, who, mood, t) {
    var big = who === 'pip' ? 1.25 : who === 'finn' ? 0.8 : 1, cheer = mood === 'cheer', worried = mood === 'worried';
    var hop = cheer ? Math.abs(Math.sin(t * 6 + (who === 'finn' ? 1 : who === 'pip' ? 2 : 0))) * 0.35 : 0;
    c.save(); c.translate(x, y - hop * s); c.scale(s, s);
    // feet
    c.fillStyle = C.orange; ell(c, -0.35, 1.02, 0.28, 0.1); c.fill(); ell(c, 0.35, 1.02, 0.28, 0.1); c.fill();
    // oilskin body
    var g = c.createLinearGradient(-1, 0, 1, 0); g.addColorStop(0, C.oilDark); g.addColorStop(0.4, C.oil); g.addColorStop(1, C.oilDark);
    c.fillStyle = g; ell(c, 0, 0.15, 0.95, 0.95); c.fill();
    c.strokeStyle = 'rgba(120,80,0,0.6)'; c.lineWidth = 0.05; c.beginPath(); c.moveTo(0, -0.6); c.lineTo(0, 1.0); c.stroke();
    c.fillStyle = '#8A6408'; [0.0, 0.35, 0.7].forEach(function (by) { c.beginPath(); c.arc(0.12, by - 0.2, 0.05, 0, TAU); c.fill(); });
    // flippers: down, or up when cheering
    c.fillStyle = '#16171C';
    var up = cheer ? 1 : 0;
    [-1, 1].forEach(function (side) {
      c.save(); c.translate(side * 0.85, -0.05); c.rotate(side * (0.35 + up * (-2.2 + Math.sin(t * 9) * 0.25)));
      ell(c, 0, 0.35, 0.18, 0.45); c.fill(); c.restore();
    });
    // head
    var hy = -1.0;
    c.fillStyle = '#16171C'; c.beginPath(); c.arc(0, hy, 0.78, 0, TAU); c.fill();
    c.fillStyle = '#F4F1EA'; ell(c, 0.05, hy + 0.08, 0.6, 0.55); c.fill();
    // eyes
    var ex = [-0.2, 0.3], ey = hy - 0.05;
    c.lineCap = 'round';
    ex.forEach(function (px) {
      if (cheer) {
        c.strokeStyle = '#16171C'; c.lineWidth = 0.08; c.beginPath(); c.arc(px, ey + 0.05, 0.11, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      } else {
        if (worried) {
          c.fillStyle = '#fff'; c.strokeStyle = '#16171C'; c.lineWidth = 0.05; c.beginPath(); c.arc(px, ey, 0.17, 0, TAU); c.fill(); c.stroke();
          c.fillStyle = '#16171C'; c.beginPath(); c.arc(px + 0.07, ey + 0.03, 0.075, 0, TAU); c.fill();
          c.lineWidth = 0.12; c.beginPath(); c.moveTo(px - 0.2, ey - 0.24 - (px < 0 ? 0 : 0.18)); c.lineTo(px + 0.2, ey - 0.24 - (px < 0 ? 0.18 : 0)); c.stroke();
        } else {
          c.fillStyle = '#16171C'; c.beginPath(); c.arc(px, ey, 0.12, 0, TAU); c.fill();
          c.fillStyle = '#fff'; c.beginPath(); c.arc(px + 0.04, ey - 0.05, 0.045, 0, TAU); c.fill();
        }
      }
    });
    // cheeks
    c.fillStyle = 'rgba(255,130,150,0.45)'; ell(c, -0.36, hy + 0.2, 0.1, 0.06); c.fill(); ell(c, 0.48, hy + 0.2, 0.1, 0.06); c.fill();
    // beak: tall, striped; open when cheering, pinched when worried
    var bl = 0.55 * big, bx = 0.42, by = hy + 0.18;
    c.save(); c.translate(bx, by);
    var open = cheer ? 0.18 : 0;
    c.fillStyle = '#4C5A70'; c.beginPath(); c.moveTo(0, -0.24 * big); c.lineTo(0.1, -0.24 * big); c.lineTo(0.1, 0.22 * big); c.lineTo(0, 0.22 * big); c.closePath(); c.fill();
    c.fillStyle = C.orange; c.beginPath(); c.moveTo(0.1, -0.26 * big); c.quadraticCurveTo(bl, -0.18 * big, bl, 0.0 - open); c.lineTo(0.1, -open * 0.3); c.closePath(); c.fill();
    c.fillStyle = '#E2572B'; c.beginPath(); c.moveTo(0.1, open * 0.3); c.lineTo(bl * 0.92, open); c.quadraticCurveTo(bl * 0.7, 0.22 * big, 0.1, 0.24 * big); c.closePath(); c.fill();
    if (open) { c.fillStyle = '#8A2A30'; c.beginPath(); c.moveTo(0.12, -open * 0.3); c.lineTo(bl * 0.9, -open + 0.02); c.lineTo(bl * 0.9, open - 0.02); c.lineTo(0.12, open * 0.3); c.closePath(); c.fill(); }
    c.strokeStyle = '#F7D24A'; c.lineWidth = 0.045; c.beginPath(); c.moveTo(0.2, -0.22 * big); c.lineTo(0.2, -open * 0.2); c.stroke();
    c.restore();
    // a worried bead of sweat and a wobbly mouth line under the beak
    if (worried) {
      var sw = (t * 0.7) % 1;
      c.fillStyle = 'rgba(170,215,255,' + (1 - sw * 0.6) + ')'; c.beginPath(); c.moveTo(-0.66, hy - 0.45 + sw * 0.3); c.quadraticCurveTo(-0.5, hy - 0.2 + sw * 0.3, -0.66, hy - 0.1 + sw * 0.3); c.quadraticCurveTo(-0.82, hy - 0.2 + sw * 0.3, -0.66, hy - 0.45 + sw * 0.3); c.fill();
      c.strokeStyle = '#16171C'; c.lineWidth = 0.07; c.beginPath(); c.moveTo(-0.15, hy + 0.42); c.quadraticCurveTo(-0.05, hy + 0.34, 0.05, hy + 0.42); c.quadraticCurveTo(0.15, hy + 0.5, 0.25, hy + 0.42); c.stroke();
    }
    // sou'wester: on the head, or thrown up when cheering
    var hl = cheer ? 0.55 + Math.abs(Math.sin(t * 6)) * 0.35 : 0;
    c.save(); c.translate(0, hy - 0.55 - hl); c.rotate(cheer ? Math.sin(t * 6) * 0.3 : -0.08);
    c.fillStyle = C.oil; c.beginPath(); c.ellipse(0, 0.08, 0.95, 0.2, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-0.55, 0.05); c.quadraticCurveTo(-0.5, -0.5, 0, -0.52); c.quadraticCurveTo(0.5, -0.5, 0.55, 0.05); c.closePath(); c.fill();
    c.fillStyle = C.oilDark; c.fillRect(-0.55, -0.02, 1.1, 0.08);
    c.restore();
    c.restore();
    if (who === 'nuala') return;
  }
  function lantern(c, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s, s);
    var g = c.createRadialGradient(0, 0, 0, 0, 0, 1.4); g.addColorStop(0, 'rgba(255,220,140,0.55)'); g.addColorStop(1, 'rgba(255,220,140,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1.4 + Math.sin(t * 5) * 0.05, 0, TAU); c.fill();
    c.fillStyle = '#2B2F3A'; c.fillRect(-0.22, -0.4, 0.44, 0.08); c.fillRect(-0.22, 0.3, 0.44, 0.08);
    c.fillStyle = '#FFE39A'; rrect(c, -0.18, -0.32, 0.36, 0.62, 0.08); c.fill();
    c.strokeStyle = '#2B2F3A'; c.lineWidth = 0.05; c.beginPath(); c.arc(0, -0.45, 0.14, Math.PI, 0); c.stroke();
    c.restore();
  }
  /* Marigold with her crew. mood as puffin(). tilt in radians. */
  function boat(c, x, y, s, mood, t, tilt) {
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate((tilt || 0) + Math.sin(t * 1.7) * 0.05);
    // crew behind the gunwale: Finn (bow, left), Nuala (middle, lantern up), Pip (stern, tiller)
    puffin(c, -1.55, -0.65, 0.5, 'finn', mood, t);
    puffin(c, 0.05, -0.85, 0.6, 'nuala', mood, t);
    puffin(c, 1.65, -0.9, 0.66, 'pip', mood, t);
    lantern(c, mood === 'cheer' ? 0.1 : 0.62, mood === 'cheer' ? -2.05 : -1.75, 0.55, t);
    if (mood !== 'cheer') { c.strokeStyle = '#16171C'; c.lineWidth = 0.09; c.beginPath(); c.moveTo(0.4, -0.9); c.lineTo(0.62, -1.45); c.stroke(); }
    // Finn's cup
    if (mood !== 'cheer') { c.fillStyle = '#9AA3B5'; rrect(c, -1.1, -0.6 + Math.abs(Math.sin(t * 3)) * -0.2, 0.22, 0.24, 0.05); c.fill(); }
    // hull
    var g = c.createLinearGradient(0, -0.4, 0, 0.8); g.addColorStop(0, '#B07A45'); g.addColorStop(1, '#6A4325');
    c.fillStyle = g; c.beginPath(); c.moveTo(-2.6, -0.45); c.lineTo(2.5, -0.45); c.quadraticCurveTo(2.4, 0.55, 1.6, 0.7); c.lineTo(-1.5, 0.7); c.quadraticCurveTo(-2.4, 0.5, -2.6, -0.45); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(60,35,15,0.6)'; c.lineWidth = 0.04;
    [-0.1, 0.25].forEach(function (py) { c.beginPath(); c.moveTo(-2.45, py); c.lineTo(2.35, py); c.stroke(); });
    c.fillStyle = '#E8B04A'; c.fillRect(-2.65, -0.52, 5.2, 0.12);
    c.fillStyle = '#F6E7C8'; c.font = '700 0.32px "Space Grotesk", sans-serif'; c.textAlign = 'center'; c.fillText('MARIGOLD', 0, 0.48);
    // tiller
    c.strokeStyle = '#6A4325'; c.lineWidth = 0.1; c.beginPath(); c.moveTo(2.45, -0.3); c.lineTo(2.85, 0.6); c.stroke();
    c.restore();
  }
  /* the coastguard: a speaker grille that glows while it speaks */
  function grille(c, x, y, s, glow) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (glow > 0) { var g = c.createRadialGradient(0, 0, 0, 0, 0, 1.6); g.addColorStop(0, 'rgba(120,220,255,' + 0.45 * glow + ')'); g.addColorStop(1, 'rgba(120,220,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1.6, 0, TAU); c.fill(); }
    c.fillStyle = '#20252F'; rrect(c, -1, -0.65, 2, 1.3, 0.3); c.fill();
    c.fillStyle = glow > 0 ? 'rgba(150,230,255,' + (0.4 + 0.6 * glow) + ')' : '#3B4252';
    for (var i = 0; i < 5; i++) { rrect(c, -0.75, -0.45 + i * 0.2, 1.5, 0.1, 0.05); c.fill(); }
    c.restore();
  }

  window.TwoArt = { C: C, rng: rng, smooth: smooth, sea: sea, rocks: rocks, fog: fog, beam: beam, head: head,
    lighthouse: lighthouse, lightship: lightship, puffin: puffin, boat: boat, lantern: lantern, grille: grille, rrect: rrect };
})();
