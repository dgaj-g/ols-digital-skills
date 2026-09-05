/* audits.js — THE CHECKS THAT RIDE EVERY WALK.
 *
 * DFM 271, and the whole reason coverage is derived rather than listed: a law
 * asked of "the surfaces on a list" is only ever asked of the surfaces somebody
 * remembered. These are asked of every state either walker stands on, whatever
 * that state is, so a screen written next year is covered BY EXISTING.
 *
 * Each audit returns PASS or a list of findings. The walker records the verdict
 * into its sidecar under (surface, state, width), and qa-coverage reads those
 * sidecars back: a state the walker stood on with no verdict for an audit is a
 * cell nothing closed, and it fails by name.
 *
 * WHAT IS DELIBERATELY NOT MEASURED is declared by each borrowed module and
 * printed by the caller (DFM 213).
 */
'use strict';
const empty = require('./empty-elements.js');
const nested = require('./nested-interactive.js');
const stateAudit = require('./state-audit.js');
const placed = require('./placed-work.js');
const contrast = require('./contrast-audit.js');

/* the colour law, in computed pixels, over the whole rendered screen */
const COLOUR_LAW = `(() => {
  const MARK = ['rgb(200, 16, 46)', 'rgb(31, 122, 51)', 'rgb(176, 125, 16)'];   /* red, green, amber */
  const GOLD = ['rgb(228, 184, 36)', 'rgb(255, 216, 77)'];
  const SENTINEL = 'rgb(181, 0, 200)';
  const out = [];
  const seen = (el, prop, v) => {
    if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') return null;
    const m = /rgba?\\([^)]+\\)/.exec(v);
    return m ? m[0].replace(/rgba\\(([^,]+, [^,]+, [^,]+), [\\d.]+\\)/, 'rgb($1)') : null;
  };
  const name = (el) => el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    /* A COLOUR THAT PAINTS NOTHING IS NOT A COLOUR. The colour property on an
       element with no text of its own paints no glyph - the expand grid's empty
       product cells inherit a colour and draw nothing with it - so judging them
       was the gate inventing a fault (L6). Backgrounds, borders, fills and
       strokes are judged wherever they are, because those DO paint. */
    const ownText = [...el.childNodes].filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).join('').trim();
    ['color', 'backgroundColor', 'borderTopColor', 'fill', 'stroke'].forEach((prop) => {
      if (prop === 'color' && !ownText) return;
      const c = seen(el, prop, cs[prop]);
      if (!c) return;
      if (c === SENTINEL) out.push({ law: 'sentinel', sel: name(el), prop, colour: c });
      if (MARK.indexOf(c) >= 0 && !el.closest('[data-mark]')) {
        out.push({ law: 'marking-colour-outside-a-mark', sel: name(el), prop, colour: c });
      }
      /* GOLD IS PRESTIGE, NEVER A STATUS AND NEVER A MARK. The first cut of
         this law said "gold only inside [data-ornament] or [data-celebrate]",
         and on the first walk it condemned the wordmark's own second half, the
         focus ring and the primary button - chrome that is gold BY DESIGN and
         says nothing about anybody's work. What the law is actually for is
         stopping gold from meaning something: so gold is a fault when it lands
         on a reading surface, on a mark, or on a value. */
      if (GOLD.indexOf(c) >= 0) {
        const onWork = el.closest('[data-work]');
        const onMark = el.closest('[data-mark]');
        const text = (el.textContent || '').trim();
        const isValue = /^[-+]?[\d.,%\/]+$/.test(text) && text.length > 0;
        const allowed = el.closest('[data-ornament], [data-celebrate]');
        if (!allowed && (onWork || onMark)) {
          out.push({ law: 'gold-on-a-reading-surface-or-a-mark', sel: name(el), prop, colour: c });
        } else if (!allowed && isValue && prop === 'color') {
          out.push({ law: 'gold-used-as-a-value', sel: name(el), prop, colour: c, text: text.slice(0, 20) });
        }
      }
    });
  });
  /* every light work surface is light, whatever the shell does */
  const lum = (rgb) => {
    const m = (rgb.match(/\\d+/g) || []).slice(0, 3).map(Number);
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(m[0] || 0) + 0.7152 * f(m[1] || 0) + 0.0722 * f(m[2] || 0);
  };
  const ground = (el) => {
    let p = el;
    while (p && p !== document.documentElement) {
      const bg = getComputedStyle(p).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      p = p.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  document.querySelectorAll('[data-work]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const L = lum(ground(el));
    if (L < 0.85) out.push({ law: 'work-surface-not-light', sel: name(el), colour: ground(el), lum: Math.round(L * 100) / 100 });
  });
  return out;
})`;

/* a control that will not act says why, beside itself */
const MUTE_LOCKS = `(() => {
  const out = [];
  document.querySelectorAll('button, [role=button], input, select, textarea').forEach((el) => {
    const off = el.disabled || el.getAttribute('aria-disabled') === 'true';
    if (!off) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (el.getAttribute('data-locked-why')) return;
    const by = el.getAttribute('aria-describedby');
    if (by && document.getElementById(by) && (document.getElementById(by).textContent || '').trim()) return;
    /* or a visible sentence within 60px of it */
    let near = false;
    document.querySelectorAll('p, span, div').forEach((t) => {
      if (near || !t.textContent || t.textContent.trim().length < 6) return;
      const tr = t.getBoundingClientRect();
      if (tr.width < 2) return;
      const dx = Math.max(0, Math.max(r.left - tr.right, tr.left - r.right));
      const dy = Math.max(0, Math.max(r.top - tr.bottom, tr.top - r.bottom));
      if (dx <= 60 && dy <= 60) near = true;
    });
    if (!near) out.push({ sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(/\\s+/)[0] : ''), text: (el.textContent || '').trim().slice(0, 40) });
  });
  return out;
})`;

/* the consequence laws that can be read off the DOM without moving anything */
const CONSEQUENCE = `(() => {
  const out = [];
  document.querySelectorAll('[data-surface="question"], .jotter-q').forEach((root) => {
    const state = root.getAttribute('data-state') || '';
    const locked = /checked-wrong-2|locked|checked-right/.test(state);
    /* the truth is never on the page before the question locks */
    if (!locked && root.querySelector('[data-truth]')) {
      out.push({ law: 'truth-before-lock', qid: root.getAttribute('data-qid') });
    }
    /* no option is pressed for her at mount */
    if (/fresh/.test(state)) {
      root.querySelectorAll('[data-tray] [aria-pressed="true"], .chip[aria-pressed="true"]').forEach(() => {
        out.push({ law: 'option-pressed-at-mount', qid: root.getAttribute('data-qid') });
      });
    }
    /* every option in a group looks the same: colour never hints */
    root.querySelectorAll('[data-tray], .jq-options, .classify-row').forEach((tray) => {
      const items = [...tray.children].filter(c => c.getBoundingClientRect().width > 2);
      const colours = new Set(items.map(c => getComputedStyle(c).backgroundColor + '|' + getComputedStyle(c).borderTopColor));
      if (items.length > 1 && colours.size > 1) {
        out.push({ law: 'options-do-not-look-alike', qid: root.getAttribute('data-qid'), n: colours.size });
      }
    });
  });
  return out;
})`;

/* every round trip owns its waiting state, in the same tick as the press */
const BUSY_CONTRACT = `(() => {
  const out = [];
  document.querySelectorAll('[data-busy-for]').forEach((el) => {
    if (!el.getAttribute('data-busy-for').trim()) out.push({ sel: el.className, why: 'empty data-busy-for' });
  });
  return out;
})`;

async function run(page, opts) {
  opts = opts || {};
  const verdicts = {};
  const findings = {};
  async function q(name, src) {
    try {
      const r = await page.evaluate(s => eval(s)(), src);
      const list = Array.isArray(r) ? r : (r && r.findings) || [];
      verdicts[name] = list.length ? 'FAIL' : 'PASS';
      if (list.length) findings[name] = list.slice(0, 6);
    } catch (e) {
      verdicts[name] = 'CRASH';
      findings[name] = [{ error: String(e && e.message || e) }];
    }
  }
  await q('empty', empty.QUERY);
  await q('nested', nested.QUERY);
  await q('geometry', stateAudit.FITS_QUERY);
  await q('steps', stateAudit.STEPS_QUERY);
  await q('colour', COLOUR_LAW);
  await q('mute-locks', MUTE_LOCKS);
  await q('consequence', CONSEQUENCE);
  await q('waits', BUSY_CONTRACT);
  if (opts.clickSafety) await q('click-safety', placed.QUERY);
  return { verdicts, findings };
}

/* the readability audit needs a picture, so it is its own call: the caller
   decides how often it is worth taking one */
async function readability(page) {
  try {
    const rects = await page.evaluate((s) => eval(s)([[], [], '[data-surface]']), contrast.COLLECT.toString());
    if (!rects.length) return { verdict: 'PASS', findings: [] };
    const shot = await page.screenshot({ encoding: 'base64' });
    const measured = await page.evaluate(async (args) => {
      const fn = eval('(' + args[0] + ')');
      return await fn(['data:image/png;base64,' + args[1], args[2]]);
    }, [contrast.MEASURE.toString(), shot, rects]);
    const bad = measured.filter(r => r.ratio != null && r.ratio < contrast.floorFor(r));
    return { verdict: bad.length ? 'FAIL' : 'PASS', findings: bad.slice(0, 8), measured: measured.length };
  } catch (e) {
    return { verdict: 'CRASH', findings: [{ error: String(e && e.message || e) }] };
  }
}

module.exports = { run, readability, COLOUR_LAW, MUTE_LOCKS, CONSEQUENCE, BUSY_CONTRACT,
  EXEMPTIONS: [].concat(empty.EXEMPTIONS || [], stateAudit.EXEMPTIONS || [], placed.EXEMPTIONS || [], contrast.EXEMPTIONS || []) };
