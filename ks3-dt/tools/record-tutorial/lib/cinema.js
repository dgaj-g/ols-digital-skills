/* Cinema layer for the OLS tutorial recorder.
   Everything visual is injected INTO the recorded page (cursor dot, lower-third
   captions, curtain title cards, callouts) so Playwright's recordVideo captures
   it pixel-perfect - no ffmpeg drawtext. All animation is rAF + element.style
   (no <style> tags, no keyframes) so page CSP cannot interfere.
   House style: navy #1A3A6B, gold #E4B824 (memory: reference_ols_slide_house_style),
   display font Space Grotesk (platform's vendored font, loaded via FontFace from
   base64 so it works on any origin). */
const fs = require('fs');
const path = require('path');

const NAVY = '#1A3A6B';
const NAVY_DEEP = '#122A4F';
const GOLD = '#E4B824';
const FONT_B64 = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'platform', 'assets', 'fonts', 'space-grotesk.woff2')
).toString('base64');

/* ---------- page-side runtime (stringified into the page) ---------- */
function pageRuntime() {
  /* eslint-disable no-var */
  const NAVY = '#1A3A6B', NAVY_DEEP = '#122A4F', GOLD = '#E4B824';
  const FONT = "'CineGrotesk','Trebuchet MS','Segoe UI',Calibri,'Helvetica Neue',Arial,sans-serif";
  const Z = 2147483000;
  const C = window.__cine = { marks: [] };

  function raf() { return new Promise(r => requestAnimationFrame(r)); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  C.animate = function (ms, step) {
    return new Promise(resolve => {
      const t0 = performance.now();
      (function frame(now) {
        const p = Math.min(1, (now - t0) / ms);
        step(ease(p), p);
        if (p < 1) requestAnimationFrame(frame); else resolve();
      })(performance.now());
    });
  };
  function el(tag, css, parent) {
    const e = document.createElement(tag);
    Object.assign(e.style, css);
    (parent || document.body).appendChild(e);
    return e;
  }
  C.mark = function (name) { C.marks.push({ name, ms: Math.round(performance.now()) }); };

  /* ================= THE FILM LAWS (DFM 201a/b/c, his 13 Aug L4 sit) =================
     He found a caption clipped by the bottom of the frame ("Down the left side live
     all the blocks Scratch knows,") and the cursor sitting on the words "the whole",
     and said both had been promised fixed. They had not: the 192e park law covered
     TITLE CARDS only, and nothing ever measured a drawn box against the frame.
     Two laws, in the shared library so EVERY film inherits them:
       A1 IN-FRAME  every drawn text box is placed AFTER its real size is known and
                    must sit wholly inside the viewport, or the take dies.
       A2 CURSOR    every text surface (caption, callout pill, tooltip) is tagged, and
                    the pointer is parked clear of all of them, or the take dies.
     C.lawMode: 'enforce' (default, ships) or 'report' (the DFM 196 control — no fit,
     no park, faults collected instead of thrown, so the PRE-FIX state can be
     enumerated in full against the build he sat). */
  C.lawMode = 'enforce';
  C.FIT_M = 10;                 // frame margin: no drawn text may come closer
  C.faults = [];
  C.lastFaults = [];
  C.tagText = function (el) { if (el) el.setAttribute('data-cine-text', '1'); return el; };
  /* Only text that is actually VISIBLE counts. A full-screen cover hides everything
     beneath it, so while one is up only its own text is on screen — without this the
     cursor guard would fail on a caption nobody can see. */
  C.textNodes = function () {
    var scope = C.cover || document.body;
    return Array.prototype.slice.call(scope.querySelectorAll('[data-cine-text]'))
      .filter(function (n) {
        var r = n.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
  };
  C.frameFault = function (el, what) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var m = C.FIT_M;
    var out = (r.left < m) || (r.top < m) || (r.right > innerWidth - m) || (r.bottom > innerHeight - m);
    if (!out) return null;
    return {
      law: 'IN-FRAME', what: what,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      viewport: [innerWidth, innerHeight]
    };
  };
  /* Place a pill so it FITS: try the author's side, flip to the other if it would
     leave the frame, and when the anchor is full-height (the palette, the code area —
     exactly the two that clipped on him) overlay it inside the anchor's own bottom
     edge rather than hanging it off the screen. Position AFTER measuring: the old
     code guessed a height of 84px for an "above" pill and never measured at all. */
  C.fitPill = function (pill, ax, ay, aw, ah, side) {
    var m = C.FIT_M, GAP = 18;
    /* FIRST kill the shrink-to-fit feedback loop, or no amount of clamping ever
       converges: the pill is `position:fixed` with a `left` and no `width`, so
       its width is shrink-to-fit against (viewport - left). Move it left to make
       room and the text RE-WRAPS WIDER and slides back out of the frame — which
       is precisely what the enforced take caught twice (644px at left 636, then
       654px at left 626). Measure the natural width once with the maximum room
       available, then FIX the width so geometry stops arguing with itself. */
    pill.style.left = m + 'px';
    var natural = pill.getBoundingClientRect();
    pill.style.boxSizing = 'border-box';
    pill.style.width = Math.min(natural.width, innerWidth - 2 * m) + 'px';
    var r = pill.getBoundingClientRect();
    var w = r.width, h = r.height;
    var left = Math.max(m, Math.min(innerWidth - w - m, ax + aw / 2 - w / 2));
    var below = ay + ah + GAP, above = ay - GAP - h;
    var fitsBelow = (below + h) <= (innerHeight - m), fitsAbove = above >= m;
    var top;
    if (side === 'above') top = fitsAbove ? above : (fitsBelow ? below : null);
    else top = fitsBelow ? below : (fitsAbove ? above : null);
    if (top === null) top = Math.min(innerHeight - h - m, Math.max(m, ay + ah - h - 12));
    pill.style.left = left + 'px';
    pill.style.top = top + 'px';
    /* SECOND PASS, and it earns its place: the first measurement is taken before
       the browser has settled the pill's final wrap, so a box measured at 620px
       can render at 644px and slide back out of the frame — which is exactly
       what the enforced take caught on the STAGE callout (right edge landing on
       1280.0 of a 1280 frame). Re-measure the REAL rect and clamp it hard.
       Measuring once and trusting it is the same mistake in miniature as the
       bug this whole law exists to fix. */
    var r2 = pill.getBoundingClientRect();
    var nl = Math.max(m, Math.min(innerWidth - r2.width - m, r2.left));
    var nt = Math.max(m, Math.min(innerHeight - r2.height - m, r2.top));
    if (Math.abs(nl - r2.left) > 0.5) pill.style.left = nl + 'px';
    if (Math.abs(nt - r2.top) > 0.5) pill.style.top = nt + 'px';
  };

  /* ---- font (FontFace from ArrayBuffer: CSP-immune) ---- */
  C.loadFont = function (b64) {
    try {
      const bin = atob(b64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const ff = new FontFace('CineGrotesk', buf.buffer, { weight: '300 800' });
      return ff.load().then(f => { document.fonts.add(f); return 'font-ok'; }).catch(e => 'font-fail ' + e.message);
    } catch (e) { return Promise.resolve('font-fail ' + e.message); }
  };

  /* ---- cursor dot ---- */
  C.ensureCursor = function (x, y) {
    if (C.dot) return;
    C.dot = el('div', {
      position: 'fixed', left: '0px', top: '0px', width: '22px', height: '22px',
      marginLeft: '-11px', marginTop: '-11px', borderRadius: '50%',
      background: 'rgba(26,58,107,0.92)', border: '2.5px solid ' + GOLD,
      boxShadow: '0 2px 10px rgba(0,0,0,0.45), 0 0 0 3px rgba(255,255,255,0.55)',
      zIndex: Z + 60, pointerEvents: 'none', transform: 'scale(1)',
      transition: 'transform 130ms ease'
    });
    C.cursor(x || innerWidth / 2, y || innerHeight / 2);
  };
  C.cursor = function (x, y) {
    if (!C.dot) C.ensureCursor(x, y);
    C.dot.style.left = x + 'px'; C.dot.style.top = y + 'px';
    C.cx = x; C.cy = y;
  };
  /* ---- THE CURSOR-PARKING LAW (DFM 192, his ch2 find) ----
     He saw the pointer sitting on a title word. The cause is not a stray move:
     curtain() hides the dot, but lift() un-hides it at the START of its 700ms
     fade, so for the whole fade the dot is drawn ON TOP of a title card that is
     still fully legible — and the recorder had parked it at (640,430), which is
     exactly where curtain titles draw.
     THE LAW: whenever a curtain, card or caption is on screen and no pointer
     work is in progress, the cursor is parked outside every text rectangle.
     One place, so every future film inherits it. */
  C.PARK = [1252, 706];
  /* DFM 201b: one fixed corner is not enough — the corner itself has to be CLEAR of
     whatever is currently drawn. Try each in turn and take the first that is. */
  C.PARK_CANDIDATES = [[1252, 706], [28, 706], [1252, 40], [28, 40]];
  C.pickPark = function (margin) {
    var m = margin == null ? 24 : margin;
    var rects = C.textNodes().map(function (n) { return n.getBoundingClientRect(); });
    for (var i = 0; i < C.PARK_CANDIDATES.length; i++) {
      var x = Math.min(C.PARK_CANDIDATES[i][0], innerWidth - 12);
      var y = Math.min(C.PARK_CANDIDATES[i][1], innerHeight - 12);
      var clash = rects.some(function (r) {
        return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
      });
      if (!clash) return [x, y];
    }
    return [Math.min(C.PARK[0], innerWidth - 12), Math.min(C.PARK[1], innerHeight - 12)];
  };
  C.park = function () {
    if (C.dragging) return null;           // never yank a drag mid-flight
    var p = C.pickPark();
    if (C.dot) C.cursor(p[0], p[1]);
    return p;
  };
  /* Record-time proof, not a promise: returns the first VISIBLE text rectangle the
     cursor is inside (with a margin), or null. The driver throws on a hit, so
     a regression fails in front of us and never on his screen.
     DFM 201b: this used to scan `C.cover` only — so a caption or a callout pill,
     which is where he actually saw the pointer, could never be reported. It scans
     every tagged surface now (see C.textNodes for the visibility rule). */
  C.cursorClear = function (margin) {
    if (!C.dot) return null;
    var m = margin == null ? 24 : margin;
    var hits = null;
    C.textNodes().forEach(function (n) {
      if (hits) return;
      var r = n.getBoundingClientRect();
      if (C.cx >= r.left - m && C.cx <= r.right + m && C.cy >= r.top - m && C.cy <= r.bottom + m) {
        hits = {
          law: 'CURSOR-ON-TEXT',
          text: (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
          rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
          cursor: [C.cx, C.cy]
        };
      }
    });
    return hits;
  };
  C.press = function () {
    if (!C.dot) return;
    C.dot.style.transform = 'scale(0.72)';
    const ring = el('div', {
      position: 'fixed', left: C.cx + 'px', top: C.cy + 'px', width: '10px', height: '10px',
      marginLeft: '-5px', marginTop: '-5px', borderRadius: '50%',
      border: '3px solid ' + GOLD, opacity: '0.95', zIndex: Z + 59, pointerEvents: 'none'
    });
    C.animate(520, e => {
      const s = 1 + e * 5.2;
      ring.style.transform = 'scale(' + s + ')';
      ring.style.opacity = String(0.95 * (1 - e));
    }).then(() => ring.remove());
  };
  C.release = function () { if (C.dot) C.dot.style.transform = 'scale(1)'; };

  /* ---- lower-third caption ---- */
  C.showCaption = function (text, opts) {
    opts = opts || {};
    C.hideCaptionNow();
    const wrap = el('div', {
      position: 'fixed', left: '50%', transform: 'translateX(-50%) translateY(14px)',
      bottom: opts.pos === 'top' ? '' : '26px', top: opts.pos === 'top' ? '22px' : '',
      maxWidth: '900px', minWidth: '340px', zIndex: Z + 40, pointerEvents: 'none',
      display: 'flex', alignItems: 'stretch', opacity: '0',
      borderRadius: '16px', overflow: 'hidden',
      boxShadow: '0 10px 34px rgba(9,20,40,0.5)'
    });
    el('div', { width: '9px', background: GOLD, flexShrink: '0' }, wrap);
    const body = el('div', {
      background: 'rgba(18,42,79,0.96)', padding: '17px 30px 18px 24px',
      color: '#FFFFFF', fontFamily: FONT, fontSize: '25px', lineHeight: '1.42',
      fontWeight: '500', letterSpacing: '0.2px'
    }, wrap);
    body.innerHTML = text; // recorder-authored HTML (gold <b> highlights)
    Array.from(body.querySelectorAll('b')).forEach(b => { b.style.color = GOLD; b.style.fontWeight = '700'; });
    C.tagText(body);
    C.lastFaults = [];
    var capFault = C.frameFault(wrap, 'caption');
    if (capFault) { C.lastFaults.push(capFault); C.faults.push(capFault); }
    C.cap = wrap;
    return C.animate(300, e => {
      wrap.style.opacity = String(e);
      wrap.style.transform = 'translateX(-50%) translateY(' + (14 * (1 - e)) + 'px)';
    });
  };
  C.hideCaption = function () {
    const c = C.cap; C.cap = null;
    if (!c) return Promise.resolve();
    return C.animate(260, e => { c.style.opacity = String(1 - e); }).then(() => c.remove());
  };
  C.hideCaptionNow = function () { if (C.cap) { C.cap.remove(); C.cap = null; } };

  /* ---- callout pill + focus ring (for the UI tour) ---- */
  C.callout = function (x, y, w, h, text, opts) {
    opts = opts || {};
    /* DFM 201a/A3: a callout must ring what is ACTUALLY ON SCREEN. Scratch's
       sprite panel and its palette both run past the bottom/left of a 1280x720
       frame, so the ring was being drawn partly outside the picture. Ring the
       visible part; only call it a fault when most of the anchor is off-screen,
       because THAT is a callout pointing at something the viewer cannot see. */
    var vx0 = Math.max(0, x), vy0 = Math.max(0, y);
    var vx1 = Math.min(innerWidth, x + w), vy1 = Math.min(innerHeight, y + h);
    var visW = Math.max(0, vx1 - vx0), visH = Math.max(0, vy1 - vy0);
    var visibleFrac = (w * h) > 0 ? (visW * visH) / (w * h) : 0;
    if (visibleFrac >= 0.6) { x = vx0; y = vy0; w = visW; h = visH; }
    const ring = el('div', {
      position: 'fixed', left: (x - 10) + 'px', top: (y - 10) + 'px',
      width: (w + 20) + 'px', height: (h + 20) + 'px', borderRadius: '18px',
      border: '3.5px solid ' + GOLD, boxShadow: '0 0 0 6px rgba(228,184,36,0.25), 0 0 30px rgba(228,184,36,0.35)',
      zIndex: Z + 30, pointerEvents: 'none', opacity: '0'
    });
    /* long labels wrap inside a max-width pill rather than running off the
       frame; text is recorder-authored HTML (gold <b>), same as captions */
    const PILL_MAX = 620;
    const pillW = Math.min(PILL_MAX, Math.max(240, text.replace(/<[^>]+>/g, '').length * 12));
    const pillTop = opts.side === 'above' ? (y - 84) : (y + h + 18);
    const pill = el('div', {
      position: 'fixed', left: Math.max(14, Math.min(innerWidth - pillW - 14, x + w / 2 - pillW / 2)) + 'px',
      top: pillTop + 'px', zIndex: Z + 31, pointerEvents: 'none', opacity: '0',
      background: NAVY_DEEP, color: '#fff', fontFamily: FONT, fontSize: '22px', fontWeight: '600',
      lineHeight: '1.35', maxWidth: PILL_MAX + 'px', textAlign: 'center',
      padding: '12px 22px', borderRadius: '22px', border: '2.5px solid ' + GOLD,
      boxShadow: '0 8px 26px rgba(9,20,40,0.5)'
    });
    pill.innerHTML = text;
    Array.from(pill.querySelectorAll('b')).forEach(b => { b.style.color = GOLD; b.style.fontWeight = '800'; });
    C.tagText(pill);
    /* DFM 201a — THE FIX FOR HIS CLIPPED CAPTION. `pillTop` above is a guess made
       before the pill has a height; on a full-height anchor (the palette, the code
       area) `y+h+18` is off the bottom of the frame. Measure, then place. In
       'report' mode the legacy guess is left in place on purpose: that is the
       control, and it must reproduce his clipping. */
    C.lastFaults = [];
    if (C.lawMode !== 'report') C.fitPill(pill, x, y, w, h, opts.side);
    var anchorOut = (C.lawMode === 'report')
      ? (x < 0 || y < 0 || (x + w) > innerWidth || (y + h) > innerHeight)
      : (visibleFrac < 0.6);
    if (anchorOut) {
      var af = {
        law: 'ANCHOR-OFF-FRAME', what: 'callout anchor',
        text: text.replace(/<[^>]+>/g, '').slice(0, 90),
        rect: [Math.round(x), Math.round(y), Math.round(w), Math.round(h)],
        viewport: [innerWidth, innerHeight]
      };
      C.lastFaults.push(af); C.faults.push(af);
    }
    var pf = C.frameFault(pill, 'callout pill');
    if (pf) { C.lastFaults.push(pf); C.faults.push(pf); }
    C.animate(280, e => { ring.style.opacity = String(e); pill.style.opacity = String(e); });
    return {
      remove: () => C.animate(240, e => {
        ring.style.opacity = String(1 - e); pill.style.opacity = String(1 - e);
      }).then(() => { ring.remove(); pill.remove(); })
    };
  };

  /* ---- tooltip: the app's OWN hover text, drawn as the browser would ----
     Half the Live tab's teaching lives in title attributes - why a flag fired,
     what Refresh does, which baseline questions she got wrong. A film that
     merely says "hover it" teaches nothing, and a caption RETYPING the text
     would be a copy that drifts (149's lesson). So this draws the real string,
     passed in from the element itself, in a box that looks like the tooltip a
     teacher will actually see. It never covers its own target (DFM 141a): the
     box sits below, or above when told to. */
  C.tooltip = function (x, y, w, h, text, opts) {
    opts = opts || {};
    const ring = el('div', {
      position: 'fixed', left: (x - 6) + 'px', top: (y - 6) + 'px',
      width: (w + 12) + 'px', height: (h + 12) + 'px', borderRadius: '14px',
      border: '3px solid ' + GOLD, boxShadow: '0 0 0 5px rgba(228,184,36,0.22)',
      zIndex: Z + 30, pointerEvents: 'none', opacity: '0'
    });
    const TIP_MAX = 460;
    const tipW = Math.min(TIP_MAX, Math.max(200, text.replace(/<[^>]+>/g, '').length * 8.2));
    const tip = el('div', {
      position: 'fixed',
      left: Math.max(12, Math.min(innerWidth - tipW - 12, x + Math.min(28, w / 2))) + 'px',
      top: (opts.side === 'above' ? (y - 12) : (y + h + 12)) + 'px',
      zIndex: Z + 31, pointerEvents: 'none', opacity: '0',
      background: '#FFFFEA', color: '#111', fontFamily: FONT, fontSize: '16px',
      fontWeight: '500', lineHeight: '1.45', width: tipW + 'px', textAlign: 'left',
      padding: '9px 12px', borderRadius: '6px', border: '1px solid #9AA5B5',
      boxShadow: '0 6px 18px rgba(9,20,40,0.35)'
    });
    tip.textContent = text;                       /* real title text: never HTML */
    if (opts.side === 'above') tip.style.transform = 'translateY(-100%)';
    C.tagText(tip);
    C.lastFaults = [];
    if (C.lawMode !== 'report') {
      /* the transform makes the measured rect the truth, so fit on the rect */
      var tr = tip.getBoundingClientRect();
      var tm = C.FIT_M;
      var ntop = Math.min(innerHeight - tr.height - tm, Math.max(tm, tr.top));
      var nleft = Math.min(innerWidth - tr.width - tm, Math.max(tm, tr.left));
      if (ntop !== tr.top || nleft !== tr.left) {
        tip.style.transform = 'none';
        tip.style.top = ntop + 'px';
        tip.style.left = nleft + 'px';
      }
    }
    var tf = C.frameFault(tip, 'tooltip');
    if (tf) { C.lastFaults.push(tf); C.faults.push(tf); }
    C.animate(280, e => { ring.style.opacity = String(e); tip.style.opacity = String(e); });
    return {
      remove: () => C.animate(240, e => {
        ring.style.opacity = String(1 - e); tip.style.opacity = String(1 - e);
      }).then(() => { ring.remove(); tip.remove(); })
    };
  };

  /* ---- curtain (chapter title card / scene-end fade) ---- */
  C.curtain = function (spec) {
    spec = spec || {};
    if (C.cover) C.cover.remove();
    C.park();                                   // cursor-parking law, before it shows
    if (C.dot) C.dot.style.opacity = '0';
    const cov = el('div', {
      position: 'fixed', inset: '0px', zIndex: Z + 50, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(150deg,' + NAVY + ' 0%,' + NAVY_DEEP + ' 78%)',
      fontFamily: FONT, color: '#fff', opacity: '1', pointerEvents: 'none'
    });
    // gold baseline rule, bottom brand strip (skipped on bare cards)
    if (!spec.bare) {
      el('div', {
        position: 'absolute', left: '0', right: '0', bottom: '64px', height: '3px',
        background: 'linear-gradient(90deg, transparent, ' + GOLD + ' 22%, ' + GOLD + ' 78%, transparent)'
      }, cov);
      const brand = el('div', {
        position: 'absolute', bottom: '26px', fontSize: '17px', letterSpacing: '3.5px',
        color: 'rgba(255,255,255,0.78)', fontWeight: '600'
      }, cov);
      brand.textContent = spec.brand || 'OLS DIGITAL TECHNOLOGY';
      brand.setAttribute('data-cine-text', '1');
    }
    if (spec.crest) {
      const img = el('img', { width: '108px', marginBottom: '26px', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.4))' }, cov);
      img.src = spec.crest;
    }
    if (spec.kicker) {
      const k = el('div', {
        fontSize: '21px', letterSpacing: '5px', color: GOLD, fontWeight: '700', marginBottom: '18px'
      }, cov);
      k.textContent = spec.kicker;
      k.setAttribute('data-cine-text', '1');
    }
    if (spec.title) {
      const t = el('div', {
        fontSize: '54px', fontWeight: '700', letterSpacing: '0.5px', textAlign: 'center',
        maxWidth: '980px', lineHeight: '1.14', textShadow: '0 3px 14px rgba(0,0,0,0.35)',
        whiteSpace: 'pre-line' // authored \n = controlled break (no dangling words)
      }, cov);
      t.textContent = spec.title;
      t.setAttribute('data-cine-text', '1');
    }
    if (spec.sub) {
      const s = el('div', {
        fontSize: '25px', color: 'rgba(255,255,255,0.85)', marginTop: '20px',
        maxWidth: '860px', textAlign: 'center', lineHeight: '1.45', fontWeight: '400'
      }, cov);
      s.textContent = spec.sub;
      s.setAttribute('data-cine-text', '1');
    }
    C.cover = cov;
    C.scanCover('title card');
    return 'curtain-up';
  };
  /* a full-screen card's own text must fit the frame too (long titles, long
     numbered lines) — same law, same reporting path */
  C.scanCover = function (what) {
    C.lastFaults = [];
    if (!C.cover) return;
    Array.prototype.forEach.call(C.cover.querySelectorAll('[data-cine-text]'), function (n) {
      var f = C.frameFault(n, what);
      if (f) { C.lastFaults.push(f); C.faults.push(f); }
    });
  };
  C.lift = function (ms) {
    const cov = C.cover; C.cover = null;
    if (!cov) return Promise.resolve();
    C.mark('lift');
    if (C.dot) C.dot.style.opacity = '1';
    return C.animate(ms || 700, e => { cov.style.opacity = String(1 - e); }).then(() => cov.remove());
  };
  C.drop = function (spec, ms) {
    C.curtain(spec || {});
    const cov = C.cover;
    cov.style.opacity = '0';
    return C.animate(ms || 650, e => { cov.style.opacity = String(e); }).then(() => C.mark('down'));
  };

  /* ---- full-screen instruction card (physical steps: photos + big text) ---- */
  C.card = function (spec) {
    C.park();                                   // cursor-parking law
    C.curtain({ bare: true });
    const cov = C.cover;
    cov.style.opacity = '0';
    if (spec.kicker) {
      const k = el('div', { fontSize: '20px', letterSpacing: '4.5px', color: GOLD, fontWeight: '700', marginBottom: '16px' }, cov);
      k.textContent = spec.kicker;
      k.setAttribute('data-cine-text', '1');
    }
    if (spec.title) {
      const t = el('div', { fontSize: '42px', fontWeight: '700', textAlign: 'center', maxWidth: '980px', lineHeight: '1.16' }, cov);
      t.textContent = spec.title;
      t.setAttribute('data-cine-text', '1');
    }
    if (spec.img) {
      const fr = el('div', {
        marginTop: '26px', padding: '10px', background: 'rgba(255,255,255,0.08)',
        border: '2.5px solid ' + GOLD, borderRadius: '18px', boxShadow: '0 14px 40px rgba(0,0,0,0.45)'
      }, cov);
      const img = el('img', { display: 'block', maxWidth: '560px', maxHeight: '300px', borderRadius: '10px' }, fr);
      img.src = spec.img;
      fr.setAttribute('data-cine-text', '1');
      if (spec.credit) {
        const cr = el('div', { marginTop: '7px', fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', textAlign: 'right' }, fr);
        cr.textContent = spec.credit;
      }
    }
    if (spec.lines && spec.lines.length) {
      const numbered = spec.lines.length > 1;
      const box = el('div', {
        marginTop: '26px', display: 'flex', flexDirection: 'column', gap: '13px',
        alignItems: numbered ? 'flex-start' : 'center'
      }, cov);
      spec.lines.forEach(function (ln, i) {
        const row = el('div', { display: 'flex', alignItems: 'center', gap: '16px' }, box);
        if (numbered) {
          const n = el('div', {
            width: '38px', height: '38px', borderRadius: '50%', background: GOLD, color: NAVY_DEEP,
            fontWeight: '800', fontSize: '21px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: '0'
          }, row);
          n.textContent = String(i + 1);
        }
        const tx = el('div', {
          fontSize: '25px', lineHeight: '1.4', maxWidth: '820px', fontWeight: '450',
          textAlign: numbered ? 'left' : 'center'
        }, row);
        tx.innerHTML = ln;
        tx.setAttribute('data-cine-text', '1');
        Array.from(tx.querySelectorAll('b')).forEach(b => { b.style.color = GOLD; b.style.fontWeight = '700'; });
      });
    }
    C.scanCover('instruction card');
    return C.animate(500, e => { cov.style.opacity = String(e); });
  };
  C.uncard = function () { return C.lift(500); };
}

/* ---------- driver-side wrapper ---------- */
/* THE FILM-LAW MODE (DFM 201a/b, DFM 196's control).
   'enforce' — the shipping mode: boxes are fitted, the cursor is parked, and any
               surviving violation kills the take.
   'report'  — the CONTROL: no fitting, no parking, nothing thrown; every violation
               is collected and printed, so the pre-fix build he sat can be
               enumerated in full rather than dying at its first fault. */
const LAW_MODE = (process.env.KS3DT_FILM_LAWS || 'enforce').toLowerCase();

class Cinema {
  constructor(page, log) {
    this.page = page;
    this.log = log || (() => {});
    this.t0 = Date.now();
    this.marks = [];
    this.cx = 640; this.cy = 360;
    this.lawMode = LAW_MODE;
    this.violations = [];
  }
  ms() { return Date.now() - this.t0; }
  mark(name) { this.marks.push({ name, ms: this.ms() }); this.log('mark ' + name + ' @' + this.ms()); }

  async install() {
    const src = '(' + pageRuntime.toString() + ')();';
    await this.page.evaluate(src);
    await this.page.evaluate(m => { window.__cine.lawMode = m; }, this.lawMode);
    const fontRes = await this.page.evaluate(b64 => window.__cine.loadFont(b64), FONT_B64);
    this.log('cinema installed, ' + fontRes + ', film-law mode=' + this.lawMode);
  }

  /* ---- the two guards. Both run on every drawn text surface. ---- */
  _violation(v, what) {
    const rec = Object.assign({ scene: what }, v);
    this.violations.push(rec);
    this.log('FILM-LAW VIOLATION [' + rec.law + '] ' + what + ' :: "' + (rec.text || '') +
      '" rect=' + JSON.stringify(rec.rect) + (rec.cursor ? ' cursor=' + JSON.stringify(rec.cursor) : '') +
      (rec.viewport ? ' viewport=' + JSON.stringify(rec.viewport) : ''));
  }
  /* A1/A3: the drawn box (and a callout's anchor) must be inside the frame. */
  async _frameGuard(what) {
    /* read AND clear: a stale list would be re-reported against the next surface */
    const faults = await this.page.evaluate(() => {
      const f = window.__cine.lastFaults || [];
      window.__cine.lastFaults = [];
      return f;
    });
    for (const f of faults) {
      this._violation(f, what);
      if (this.lawMode !== 'report') {
        throw new Error('IN-FRAME LAW BROKEN on ' + what + ' [' + f.law + ']: "' + f.text +
          '" drawn at ' + JSON.stringify(f.rect) + ' in a ' + JSON.stringify(f.viewport) +
          ' frame. Re-author the beat (a callout cannot point at something off screen).');
      }
    }
  }
  /* A2: the pointer may not sit on any visible text. Park first, then insist. */
  async _cursorGuard(what) {
    let hit = await this.page.evaluate(() => window.__cine.cursorClear());
    if (!hit) return;
    if (this.lawMode === 'report') { this._violation(hit, what); return; }
    const dragging = await this.page.evaluate(() => !!window.__cine.dragging);
    if (dragging) {
      throw new Error('CURSOR-PARK LAW: text drawn over a live drag on ' + what +
        ' — the pointer cannot be parked mid-drag, so re-author the beat.');
    }
    await this.park();
    hit = await this.page.evaluate(() => window.__cine.cursorClear());
    if (hit) {
      this._violation(hit, what);
      throw new Error('CURSOR-PARK LAW BROKEN on ' + what + ': the pointer sits on "' +
        hit.text + '" (cursor ' + hit.cursor.join(',') + ' inside rect ' + hit.rect.join(',') +
        ') and no park corner is clear.');
    }
  }
  /* re-install after a navigation, preserving cursor position */
  async reinstall() {
    await this.install();
    await this.page.evaluate(([x, y]) => window.__cine.ensureCursor(x, y), [this.cx, this.cy]);
  }
  async ensureCursor(x, y) {
    this.cx = x; this.cy = y;
    /* ensureCursor() only CREATES the dot — it returns early if one exists, so
       a second call moved the real mouse and left the dot where it was. That
       silent divergence is half of DFM 192's cursor find. Create, then place. */
    await this.page.evaluate(([a, b]) => { window.__cine.ensureCursor(a, b); window.__cine.cursor(a, b); }, [x, y]);
    await this.page.mouse.move(x, y);
  }

  /* THE CURSOR-PARKING LAW (DFM 192). Park BOTH the drawn dot and the real
     mouse in the dead corner before any full-screen text appears, so nothing
     is ever drawn on a word — including during lift()'s fade, which is where
     Damien actually saw it. */
  async park() {
    const p = await this.page.evaluate(() => window.__cine.park());
    if (!p) return null;                       // mid-drag: never yanked
    await this.page.mouse.move(p[0], p[1]).catch(() => {});
    this.cx = p[0]; this.cy = p[1];
    return p;
  }
  /* Proof, at record time, that the law held for THIS card. Throws in front of
     us rather than shipping a frame with a dot on a title (DFM 146b's family). */
  async assertCursorClear(what) {
    await this._cursorGuard(what);
    await this._frameGuard(what);
  }

  /* eased move: real mouse + dot in lockstep */
  async moveTo(x, y, opts) {
    opts = opts || {};
    const ms = opts.ms || Math.max(420, Math.min(1500, Math.hypot(x - this.cx, y - this.cy) * 1.35));
    const steps = Math.max(14, Math.round(ms / 16));
    const x0 = this.cx, y0 = this.cy;
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    for (let i = 1; i <= steps; i++) {
      const e = ease(i / steps);
      const nx = x0 + (x - x0) * e, ny = y0 + (y - y0) * e;
      await this.page.mouse.move(nx, ny);
      await this.page.evaluate(([a, b]) => window.__cine.cursor(a, b), [nx, ny]).catch(() => {});
      await new Promise(r => setTimeout(r, ms / steps));
    }
    this.cx = x; this.cy = y;
  }
  async click(x, y, opts) {
    opts = opts || {};
    await this.moveTo(x, y, opts);
    await this.pause(opts.settle != null ? opts.settle : 340);
    await this.page.evaluate(() => window.__cine.press());
    await this.page.mouse.down();
    await this.pause(150);
    await this.page.mouse.up();
    await this.page.evaluate(() => window.__cine.release());
    await this.pause(opts.after != null ? opts.after : 420);
  }
  async drag(fx, fy, tx, ty, opts) {
    opts = opts || {};
    await this.moveTo(fx, fy, { ms: opts.approachMs });
    await this.pause(360);
    /* the parking law must never yank a pointer that is holding something */
    await this.page.evaluate(() => { window.__cine.dragging = true; window.__cine.press(); });
    await this.page.mouse.down();
    await this.pause(opts.holdStart != null ? opts.holdStart : 380);
    const ms = opts.ms || Math.max(700, Math.min(1900, Math.hypot(tx - fx, ty - fy) * 2.1));
    const steps = Math.max(18, Math.round(ms / 16));
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    for (let i = 1; i <= steps; i++) {
      const e = ease(i / steps);
      const nx = fx + (tx - fx) * e, ny = fy + (ty - fy) * e;
      await this.page.mouse.move(nx, ny);
      await this.page.evaluate(([a, b]) => window.__cine.cursor(a, b), [nx, ny]).catch(() => {});
      await new Promise(r => setTimeout(r, ms / steps));
    }
    this.cx = tx; this.cy = ty;
    await this.pause(opts.holdEnd != null ? opts.holdEnd : 420);
    await this.page.mouse.up();
    await this.page.evaluate(() => { window.__cine.dragging = false; window.__cine.release(); });
    await this.pause(500);
  }

  /* captions: hold = long enough to read twice (no narration -> reading IS the pacing) */
  holdFor(text) {
    const words = String(text).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(2600, 900 + words * 520);
  }
  async caption(text, opts) {
    opts = opts || {};
    const what = 'caption "' + text.replace(/<[^>]+>/g, '').slice(0, 48) + '"';
    await this.page.evaluate(([t, o]) => window.__cine.showCaption(t, o), [text, { pos: opts.pos }]);
    await this._frameGuard(what);
    await this._cursorGuard(what);
    await this.pause(opts.hold != null ? opts.hold : this.holdFor(text));
    if (!opts.keep) await this.page.evaluate(() => window.__cine.hideCaption());
    await this.pause(240);
  }
  async captionShow(text, opts) {
    const what = 'caption "' + text.replace(/<[^>]+>/g, '').slice(0, 48) + '"';
    await this.page.evaluate(([t, o]) => window.__cine.showCaption(t, o), [text, opts || {}]);
    await this._frameGuard(what);
    await this._cursorGuard(what);
  }
  async captionHide() {
    await this.page.evaluate(() => window.__cine.hideCaption());
    await this.pause(200);
  }

  async callout(rect, text, opts) {
    opts = opts || {};
    const what = 'callout "' + text.replace(/<[^>]+>/g, '').slice(0, 48) + '"';
    const h = await this.page.evaluateHandle(
      ([r, t, o]) => window.__cine.callout(r.x, r.y, r.w, r.h, t, o),
      [rect, text, opts]
    );
    await this._frameGuard(what);
    await this._cursorGuard(what);
    await this.pause(opts.hold != null ? opts.hold : this.holdFor(text) + 400);
    await this.page.evaluate(c => c.remove(), h);
    await this.pause(280);
  }

  /* the app's own hover text, drawn as a tooltip. `text` MUST be the element's
     real title attribute, read in the page - see scenes/guide.js tip(). */
  async tooltip(rect, text, opts) {
    opts = opts || {};
    const what = 'tooltip "' + String(text).slice(0, 48) + '"';
    const h = await this.page.evaluateHandle(
      ([r, t, o]) => window.__cine.tooltip(r.x, r.y, r.w, r.h, t, o),
      [rect, text, opts]
    );
    await this._frameGuard(what);
    await this._cursorGuard(what);
    await this.pause(opts.hold != null ? opts.hold : this.holdFor(text) + 400);
    await this.page.evaluate(c => c.remove(), h);
    await this.pause(280);
  }

  /* A TITLE CARD IS PLAIN TEXT, NEVER HTML (his find, 9 Aug 2026). curtain()
     sets title/sub/kicker with textContent, so an HTML entity does not decode -
     it is shown to the viewer raw, exactly as "&mdash;" appeared on the Live:
     flags card. Captions and ring labels DO take HTML, which is why the habit
     leaks in. Caught here, at record time, rather than on his screen. */
  static assertPlainText(spec) {
    ['title', 'sub', 'kicker', 'brand'].forEach(k => {
      const v = spec && spec[k];
      if (typeof v === 'string' && /&[a-zA-Z]+;|&#\d+;/.test(v)) {
        throw new Error('TITLE CARD IS PLAIN TEXT: ' + k + ' contains an HTML entity that will be shown raw -> ' + v);
      }
    });
  }
  async curtain(spec) {
    Cinema.assertPlainText(spec);
    await this.park();
    await this.page.evaluate(s => window.__cine.curtain(s), spec);
    await this.assertCursorClear('curtain "' + (spec.title || spec.kicker || '') + '"');
  }
  async lift(ms) { this.mark('lift'); await this.page.evaluate(m => window.__cine.lift(m), ms || 700); }
  async drop(spec, ms) {
    await this.park();
    await this.page.evaluate(([s, m]) => window.__cine.drop(s, m), [spec || {}, ms || 650]);
    if (spec && (spec.title || spec.sub)) await this.assertCursorClear('drop "' + (spec.title || '') + '"');
    this.mark('down');
  }
  async card(spec, hold) {
    await this.park();
    await this.page.evaluate(s => window.__cine.card(s), spec);
    await this.assertCursorClear('card "' + (spec.title || spec.kicker || '') + '"');
    const textLen = (spec.title || '') + ' ' + (spec.lines || []).join(' ');
    await this.pause(hold != null ? hold : this.holdFor(textLen) + 1600);
    await this.page.evaluate(() => window.__cine.uncard());
    await this.pause(400);
  }
  pause(ms) { return new Promise(r => setTimeout(r, ms)); }
}

function dataUri(file) {
  const p = path.isAbsolute(file) ? file : path.join(__dirname, '..', 'assets', file);
  const ext = path.extname(p).slice(1).toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  return 'data:' + mime + ';base64,' + fs.readFileSync(p).toString('base64');
}

module.exports = { Cinema, dataUri, NAVY, GOLD };
