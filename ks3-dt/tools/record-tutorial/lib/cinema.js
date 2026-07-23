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
    const ring = el('div', {
      position: 'fixed', left: (x - 10) + 'px', top: (y - 10) + 'px',
      width: (w + 20) + 'px', height: (h + 20) + 'px', borderRadius: '18px',
      border: '3.5px solid ' + GOLD, boxShadow: '0 0 0 6px rgba(228,184,36,0.25), 0 0 30px rgba(228,184,36,0.35)',
      zIndex: Z + 30, pointerEvents: 'none', opacity: '0'
    });
    const pillTop = opts.side === 'above' ? (y - 74) : (y + h + 18);
    const pill = el('div', {
      position: 'fixed', left: Math.max(14, Math.min(innerWidth - 380, x + w / 2 - 180)) + 'px',
      top: pillTop + 'px', zIndex: Z + 31, pointerEvents: 'none', opacity: '0',
      background: NAVY_DEEP, color: '#fff', fontFamily: FONT, fontSize: '22px', fontWeight: '600',
      padding: '12px 22px', borderRadius: '999px', border: '2.5px solid ' + GOLD,
      boxShadow: '0 8px 26px rgba(9,20,40,0.5)', whiteSpace: 'nowrap'
    });
    pill.textContent = text;
    C.animate(280, e => { ring.style.opacity = String(e); pill.style.opacity = String(e); });
    return {
      remove: () => C.animate(240, e => {
        ring.style.opacity = String(1 - e); pill.style.opacity = String(1 - e);
      }).then(() => { ring.remove(); pill.remove(); })
    };
  };

  /* ---- curtain (chapter title card / scene-end fade) ---- */
  C.curtain = function (spec) {
    spec = spec || {};
    if (C.cover) C.cover.remove();
    if (C.dot) C.dot.style.opacity = '0';
    const cov = el('div', {
      position: 'fixed', inset: '0px', zIndex: Z + 50, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(150deg,' + NAVY + ' 0%,' + NAVY_DEEP + ' 78%)',
      fontFamily: FONT, color: '#fff', opacity: '1', pointerEvents: 'none'
    });
    // gold baseline rule, bottom brand strip
    el('div', {
      position: 'absolute', left: '0', right: '0', bottom: '64px', height: '3px',
      background: 'linear-gradient(90deg, transparent, ' + GOLD + ' 22%, ' + GOLD + ' 78%, transparent)'
    }, cov);
    const brand = el('div', {
      position: 'absolute', bottom: '26px', fontSize: '17px', letterSpacing: '3.5px',
      color: 'rgba(255,255,255,0.78)', fontWeight: '600'
    }, cov);
    brand.textContent = spec.brand || 'OLS DIGITAL TECHNOLOGY';
    if (spec.crest) {
      const img = el('img', { width: '108px', marginBottom: '26px', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.4))' }, cov);
      img.src = spec.crest;
    }
    if (spec.kicker) {
      const k = el('div', {
        fontSize: '21px', letterSpacing: '5px', color: GOLD, fontWeight: '700', marginBottom: '18px'
      }, cov);
      k.textContent = spec.kicker;
    }
    if (spec.title) {
      const t = el('div', {
        fontSize: '54px', fontWeight: '700', letterSpacing: '0.5px', textAlign: 'center',
        maxWidth: '980px', lineHeight: '1.14', textShadow: '0 3px 14px rgba(0,0,0,0.35)'
      }, cov);
      t.textContent = spec.title;
    }
    if (spec.sub) {
      const s = el('div', {
        fontSize: '25px', color: 'rgba(255,255,255,0.85)', marginTop: '20px',
        maxWidth: '860px', textAlign: 'center', lineHeight: '1.45', fontWeight: '400'
      }, cov);
      s.textContent = spec.sub;
    }
    C.cover = cov;
    return 'curtain-up';
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
    C.curtain({ brand: spec.brand });
    const cov = C.cover;
    cov.style.opacity = '0';
    if (spec.kicker) {
      const k = el('div', { fontSize: '20px', letterSpacing: '4.5px', color: GOLD, fontWeight: '700', marginBottom: '16px' }, cov);
      k.textContent = spec.kicker;
    }
    if (spec.title) {
      const t = el('div', { fontSize: '42px', fontWeight: '700', textAlign: 'center', maxWidth: '980px', lineHeight: '1.16' }, cov);
      t.textContent = spec.title;
    }
    if (spec.img) {
      const fr = el('div', {
        marginTop: '26px', padding: '10px', background: 'rgba(255,255,255,0.08)',
        border: '2.5px solid ' + GOLD, borderRadius: '18px', boxShadow: '0 14px 40px rgba(0,0,0,0.45)'
      }, cov);
      const img = el('img', { display: 'block', maxWidth: '560px', maxHeight: '300px', borderRadius: '10px' }, fr);
      img.src = spec.img;
      if (spec.credit) {
        const cr = el('div', { marginTop: '7px', fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', textAlign: 'right' }, fr);
        cr.textContent = spec.credit;
      }
    }
    if (spec.lines && spec.lines.length) {
      const box = el('div', { marginTop: '26px', display: 'flex', flexDirection: 'column', gap: '13px', alignItems: 'flex-start' }, cov);
      spec.lines.forEach(function (ln, i) {
        const row = el('div', { display: 'flex', alignItems: 'center', gap: '16px' }, box);
        const n = el('div', {
          width: '38px', height: '38px', borderRadius: '50%', background: GOLD, color: NAVY_DEEP,
          fontWeight: '800', fontSize: '21px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: '0'
        }, row);
        n.textContent = String(i + 1);
        const tx = el('div', { fontSize: '25px', lineHeight: '1.4', maxWidth: '820px', fontWeight: '450' }, row);
        tx.innerHTML = ln;
        Array.from(tx.querySelectorAll('b')).forEach(b => { b.style.color = GOLD; b.style.fontWeight = '700'; });
      });
    }
    return C.animate(500, e => { cov.style.opacity = String(e); });
  };
  C.uncard = function () { return C.lift(500); };
}

/* ---------- driver-side wrapper ---------- */
class Cinema {
  constructor(page, log) {
    this.page = page;
    this.log = log || (() => {});
    this.t0 = Date.now();
    this.marks = [];
    this.cx = 640; this.cy = 360;
  }
  ms() { return Date.now() - this.t0; }
  mark(name) { this.marks.push({ name, ms: this.ms() }); this.log('mark ' + name + ' @' + this.ms()); }

  async install() {
    const src = '(' + pageRuntime.toString() + ')();';
    await this.page.evaluate(src);
    const fontRes = await this.page.evaluate(b64 => window.__cine.loadFont(b64), FONT_B64);
    this.log('cinema installed, ' + fontRes);
  }
  /* re-install after a navigation, preserving cursor position */
  async reinstall() {
    await this.install();
    await this.page.evaluate(([x, y]) => window.__cine.ensureCursor(x, y), [this.cx, this.cy]);
  }
  async ensureCursor(x, y) {
    this.cx = x; this.cy = y;
    await this.page.evaluate(([a, b]) => window.__cine.ensureCursor(a, b), [x, y]);
    await this.page.mouse.move(x, y);
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
    await this.page.evaluate(() => window.__cine.press());
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
    await this.page.evaluate(() => window.__cine.release());
    await this.pause(500);
  }

  /* captions: hold = long enough to read twice (no narration -> reading IS the pacing) */
  holdFor(text) {
    const words = String(text).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(2600, 900 + words * 520);
  }
  async caption(text, opts) {
    opts = opts || {};
    await this.page.evaluate(([t, o]) => window.__cine.showCaption(t, o), [text, { pos: opts.pos }]);
    await this.pause(opts.hold != null ? opts.hold : this.holdFor(text));
    if (!opts.keep) await this.page.evaluate(() => window.__cine.hideCaption());
    await this.pause(240);
  }
  async captionShow(text, opts) {
    await this.page.evaluate(([t, o]) => window.__cine.showCaption(t, o), [text, opts || {}]);
  }
  async captionHide() {
    await this.page.evaluate(() => window.__cine.hideCaption());
    await this.pause(200);
  }

  async callout(rect, text, opts) {
    opts = opts || {};
    const h = await this.page.evaluateHandle(
      ([r, t, o]) => window.__cine.callout(r.x, r.y, r.w, r.h, t, o),
      [rect, text, opts]
    );
    await this.pause(opts.hold != null ? opts.hold : this.holdFor(text) + 400);
    await this.page.evaluate(c => c.remove(), h);
    await this.pause(280);
  }

  async curtain(spec) { await this.page.evaluate(s => window.__cine.curtain(s), spec); }
  async lift(ms) { this.mark('lift'); await this.page.evaluate(m => window.__cine.lift(m), ms || 700); }
  async drop(spec, ms) {
    await this.page.evaluate(([s, m]) => window.__cine.drop(s, m), [spec || {}, ms || 650]);
    this.mark('down');
  }
  async card(spec, hold) {
    await this.page.evaluate(s => window.__cine.card(s), spec);
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
