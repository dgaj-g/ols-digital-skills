#!/usr/bin/env node
/* qa-reply-verdict.js — THE WAIT NOTE POINTS WHERE THE REPLY SPACE REALLY IS, AND A
 * SWALLOWED ANSWER GETS ITS OWN SENTENCE.
 *
 * HIS CLASS, 8 October 2026 (J2 Lesson 3, the colour card, training-3): a pupil's
 * bot "responds and then just stays there saying that it's running ... it looks
 * as if they have to reply but nothing works." Two slips reproduced the exact
 * screen (DIAGNOSIS_J2_L3_COLOUR_WAIT_8OCT.md): a colour typed into the QUESTION
 * gap, and the decoy input( ) line dragged in beside the real one. The engine was
 * right both times. What was wrong was what the card SAID:
 *   (1) The wait note beside RUN told her to type "in the reply space just above
 *       the RUN button". On every conversation card the reply space is BELOW the
 *       button, inside the conversation pane. A pupil who looks up finds nothing,
 *       and "nothing works" is the honest report of that.
 *   (2) When every answer she typed did not come back out in the printing — two
 *       input( ) lines, or a line that fills the box after the question — the
 *       card said "Read the console" about a run that had printed no error at
 *       all. There was nothing to read. The verdict needs a sentence of its own,
 *       owned by the lesson (check.repliesSay), for exactly this state.
 *
 * COVERAGE IS DERIVED FROM THE CONTENT TREE, never listed by hand:
 *   A. every pyrun chunk with a `waitingSay`: the card is run to its first
 *      question, the reply space and the RUN button are MEASURED in the rendered
 *      page, and the note's direction word has to agree with the measurement;
 *   B. every build with `check.usesReplies`: the lesson must own a
 *      `check.repliesSay`, and a program that runs clean yet swallows a typed
 *      answer — FOUND by running the build's own lines through Python, no slip
 *      listed by hand — is played through the card and must be told THAT
 *      sentence, not the generic not-working line. A clean program found the
 *      same way must still be told it works.
 * CONTROLS (DFM 196): the same checks run against Version 70, pinned at
 * BASE_REF — the engine and content live when his class hit it — where they
 * must FAIL.
 *
 *   node qa-reply-verdict.js            (everything, plus controls)
 *   node qa-reply-verdict.js --quick    (one wait card per lesson, plus controls)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('./node_modules/playwright');

const BASE_REF = '09cf228';          /* Version 70 — live on 8 Oct 2026. PINNED. */
const REPO = path.resolve(__dirname, '..', '..', '..');
const ENGINES = path.join(REPO, 'ks3-dt', 'platform', 'engines.js');
const STYLE = path.join(REPO, 'ks3-dt', 'platform', 'style.css');
const SKULPT = path.join(REPO, 'ks3-dt', 'platform', 'assets', 'vendor', 'skulpt');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const QUICK = process.argv.includes('--quick');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);   /* a label fragment */
const DBG = !!process.env.DBG;

let failures = 0;
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};
const note = (m) => console.log('  ....  ' + m);
const git = (ref, p) => execFileSync('git', ['show', ref + ':' + p], { cwd: REPO, maxBuffer: 64 << 20 }).toString();
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/* ---- the engine's own fallback sentence, read from the source ------------- */
function pySay(engineSrc, key) {
  const m = new RegExp('^\\s*' + key + ":\\s*'((?:[^'\\\\]|\\\\.)*)'", 'm').exec(engineSrc);
  return m ? m[1].replace(/\\'/g, "'") : null;
}

/* ---- coverage ------------------------------------------------------------- */
function lessonFiles() {
  const out = [];
  for (const y of ['j1', 'j2', 'j3']) {
    const d = path.join(SRC, y, 'lessons');
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(f => /^j\d-\d\d\.json$/.test(f)).sort()) {
      out.push({ id: f.replace('.json', ''), rel: 'ks3-dt/content/' + y + '/lessons/' + f, file: path.join(d, f) });
    }
  }
  return out;
}
function loadLessons(ref) {
  return lessonFiles().map(f => {
    let text;
    if (ref) { try { text = git(ref, f.rel); } catch (e) { return null; } }
    else text = fs.readFileSync(f.file, 'utf8');
    return { id: f.id, lesson: JSON.parse(text) };
  }).filter(Boolean);
}
function waitCases(lessons) {
  const out = [];
  for (const L of lessons) for (const c of (L.lesson.chunks || [])) {
    if (c.engine !== 'pyrun' || !c.config || !c.config.waitingSay) continue;
    out.push({ label: L.id + ' › ' + c.id, lessonId: L.id, chunk: c });
  }
  return out;
}
function replyCases(lessons) {
  const out = [];
  for (const L of lessons) for (const c of (L.lesson.chunks || [])) {
    if (c.engine !== 'pyrun' || !c.config) continue;
    (c.config.builds || []).forEach((b, i) => {
      if (!(b.check && b.check.usesReplies)) return;
      out.push({ label: L.id + ' › ' + c.id + ' › ' + (b.id || ('build ' + (i + 1))), lessonId: L.id, chunk: c, build: b, at: i });
    });
  }
  return out;
}

/* ---- the page ------------------------------------------------------------- */
async function makePage(browser, engineSrc, styleSrc) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e.message)));
  if (DBG) pg.on('console', m => console.log('        [page] ' + m.text()));
  await pg.goto('about:blank');
  await pg.addStyleTag({ content: styleSrc });
  await pg.evaluate(() => {
    window.App = {
      esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      asset: p => p,
      armButton: (b, fn) => { if (b) b.onclick = fn; },
      toast: () => {},
      state: { pairing: 0 }
    };
  });
  await pg.addScriptTag({ content: engineSrc });
  await pg.addScriptTag({ path: path.join(SKULPT, 'skulpt.min.js') });
  await pg.addScriptTag({ path: path.join(SKULPT, 'skulpt-stdlib.js') });
  await pg.evaluate((d) => { if (window.PyRun) window.PyRun._p = Promise.resolve(true); window.__DBG = d; }, DBG);
  return { pg, errs, ctx };
}


/* run one of the in-page function strings with its arguments */
const ev = (pg, src, ...args) =>
  pg.evaluate(([s, a]) => (new Function('return (' + s + ')')()).apply(null, a), [src, args]);

/* mount one chunk and open the named build (or the first) */
const MOUNT = `(async function (chunk, buildId) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  document.body.innerHTML = '<div id="host" style="padding:24px"></div>';
  document.body.style.margin = '0';
  window.scrollTo(0, 0);
  var host = document.getElementById('host');
  window.Engines.pyrun.mount(host, chunk, {
    chunk: chunk, review: false, catchup: false, lesson: { id: 'qa' },
    call: function () { return Promise.resolve({ ok: true, salt: 'qa', check: {} }); },
    awardBadge: function () { return Promise.resolve({ ok: true }); },
    next: function () {}, saveEvent: function () { return Promise.resolve({ ok: true }); },
    markItem: function () { return Promise.resolve({ ok: true, correct: false }); }
  });
  await wait(200);
  var go = document.querySelector('#host .primary-btn');
  if (go && !go.disabled && !go.classList.contains('pyrun-run')) { go.click(); await wait(400); }
  var job = buildId ? document.querySelector('#host .pyrun-job[data-job="' + buildId + '"]') : document.querySelector('#host .pyrun-job');
  if (job) { job.click(); await wait(300); }
  var style = document.querySelector('#host .py-style');
  if (style) { style.click(); await wait(300); }
  return { tray: document.querySelectorAll('#host .pyt-list .pyrun-line').length,
           editor: !!document.querySelector('#host .pye-code'),
           blanks: document.querySelectorAll('#host .pyrun-blank').length };
})`;

/* the program a pupil would hand in: lines by index, blanks by key */
const PLACE = `(async function (specs) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  var placed = [];
  for (var k = 0; k < specs.length; k++) {
    var sp = specs[k];
    var node = Array.prototype.find.call(document.querySelectorAll('#host .pyt-list .pyrun-line'), function (n) {
      var txt = (n.textContent || '').replace(/\\s+/g, ' ');
      return sp.pieces.every(function (p) { return txt.indexOf(p) !== -1; });
    });
    if (!node) { placed.push('MISSING ' + sp.pieces[0]); continue; }
    (node.querySelector('button') || node).click();
    placed.push('ok');
    await wait(120);
  }
  return placed;
})`;
const FILL = `(function (vals) {
  document.querySelectorAll('#host .pyrun-blank').forEach(function (i) {
    var k = i.getAttribute('data-key');
    if (vals[k] != null) { i.value = vals[k]; i.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  return document.querySelectorAll('#host .pyrun-blank').length;
})`;
const TYPE = `(function (code) {
  var ta = document.querySelector('#host .pye-code');
  if (!ta) return false;
  ta.value = code; ta.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})`;

/* press RUN, answer every question with zzq0, zzq1, ..., and report what the card
   showed: the wait note, where the reply space and the button were while she was
   being asked, and the verdict */
const RUN = `(async function (maxMs) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rect = n => { if (!n) return null; var r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height, w: r.width }; };
  const vis = n => !!n && !n.hidden && !n.closest('[hidden]') && n.getBoundingClientRect().height > 0;
  var runBtn = document.querySelector('#host .pyrun-run') || Array.prototype.find.call(document.querySelectorAll('#host button'), function (b) {
    return !b.closest('.pyx') && !b.classList.contains('pyrun-line') && /\\bRUN\\b/.test(b.textContent);
  });
  if (!runBtn) return { error: 'no RUN button' };
  if (runBtn.disabled) return { error: 'RUN is asleep: ' + ((document.querySelector('#host .pyrun-locknote') || {}).textContent || '') };
  runBtn.click();
  var out = { asks: 0, replies: [], waitNote: null, runRect: null, replyRect: null, replySel: null, vsay: null, vtag: null, cls: null, pyErr: false, consoleText: null };
  var t0 = Date.now(), lastAsk = -1;
  while (Date.now() - t0 < maxMs) {
    var v = document.querySelector('#host .pyrun-verdict');
    if (v && !v.hidden && v.querySelector('.pyrun-vsay')) {
      out.vsay = (v.querySelector('.pyrun-vsay').textContent || '').replace(/\\s+/g, ' ').trim();
      out.vtag = ((v.querySelector('.pyrun-vtag') || {}).textContent || '').replace(/\\s+/g, ' ').trim();
      out.cls = v.className;
      break;
    }
    var reply = Array.prototype.find.call(document.querySelectorAll('#host input[type="text"], #host input:not([type]), #host textarea'), function (n) {
      return vis(n) && !n.classList.contains('pyrun-blank') && !n.classList.contains('pye-code');
    });
    if (reply && lastAsk !== out.asks) {
      lastAsk = out.asks;
      var noteN = document.querySelector('#host .pyrun-waitnote');
      out.waitNote = noteN && !noteN.hidden ? (noteN.textContent || '').replace(/\\s+/g, ' ').trim() : null;
      out.runRect = rect(runBtn); out.replyRect = rect(reply); out.replySel = reply.className || reply.tagName;
      var val = 'zzq' + out.asks;
      reply.value = val; reply.dispatchEvent(new Event('input', { bubbles: true }));
      out.replies.push(val);
      var send = reply.closest('.pyx-ask') ? reply.closest('.pyx-ask').querySelector('button') : (reply.parentNode && reply.parentNode.querySelector('button'));
      if (send) send.click(); else reply.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      out.asks++;
      await wait(250);
      continue;
    }
    await wait(100);
  }
  out.pyErr = !!document.querySelector('#host .pyc-err');
  var con = document.querySelector('#host .pyrun-console, #host .pyc');
  out.consoleText = con ? (con.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 300) : null;
  return out;
})`;

/* ---- finding a program that runs clean and swallows an answer --------------
   Every ordered selection of the build's own lines, largest first, is run
   through Python with the replies zzq0, zzq1, ... The first that runs clean
   and leaves a required reply out of the printing is the slip; the first
   that runs clean and echoes every one is the working program. Runs in the
   page, against the engine under test, using its own runner and its own
   reply rule. */
const SEARCH = `(async function (lines, fills, want, maxRuns, fixedTop) {
  function fillLine(L) {
    var t = String(L.t || '');
    (L.blanks || []).forEach(function (bl) { t = t.replace(bl.slot || '____', String(fills[bl.key] == null ? '' : fills[bl.key])); });
    return t;
  }
  var n = lines.length, subsets = [];
  for (var mask = (1 << n) - 1; mask >= 1; mask--) {
    var idx = []; for (var i = 0; i < n; i++) if (mask & (1 << i)) idx.push(i);
    subsets.push(idx);
  }
  subsets.sort(function (a, b) { return b.length - a.length; });
  var hit = { missing: null, clean: null, runs: 0 };
  for (var s = 0; s < subsets.length && hit.runs < maxRuns; s++) {
    var idx = subsets[s];
    var code = (fixedTop || []).concat(idx.map(function (i) { return fillLine(lines[i]); })).join('\\n');
    var replies = [];
    hit.runs++;
    var res;
    try {
      res = await PyRun.runPy(code, { limitMs: 1500, ask: function () { var v = 'zzq' + replies.length; replies.push(v); return v; } });
    } catch (e) { if (window.__DBG) console.log('SEARCH threw ' + e); continue; }
    if (window.__DBG) console.log(JSON.stringify({ idx: idx, ok: res.ok, err: String(res.err).slice(0, 120), out: String(res.out).slice(0, 80), replies: replies, code: code.slice(0, 160) }));
    if (!res.ok) continue;
    if (!replies.length) continue;
    var must = PyRun.repliesToEcho(want, replies);
    if (!must.length) continue;
    var missing = must.some(function (r) { return String(res.out).indexOf(r) === -1; });
    var rec = { idx: idx, code: code, out: String(res.out), replies: replies };
    if (missing && !hit.missing) hit.missing = rec;
    if (!missing && !hit.clean) hit.clean = rec;
    if (hit.missing && hit.clean) break;
  }
  return hit;
})`;

/* how the gate fills a gap: a box-name gap gets the box named on the build's
   own fixed input( ) line (or box1), every other gap gets words */
function fillsFor(b) {
  const all = (b.fixedTop || []).map(t => ({ t: t })).concat(b.lines || []);
  /* the box named on a FIXED input( ) line — one with no gap in it (a gap marker is
     made of underscores, which are word characters, so gapped lines are skipped) */
  const fixed = all.filter(l => !(l.blanks && l.blanks.length))
    .map(l => /^\s*([A-Za-z]\w*)\s*=\s*input\(/.exec(String(l.t || ''))).filter(Boolean)[0];
  const boxName = fixed ? fixed[1] : 'box1';
  const fills = {};
  (b.lines || []).forEach(l => {
    const t = String(l.t || '');
    let pos = 0;                                   /* the gaps sit in the line in order */
    (l.blanks || []).forEach(bl => {
      const slot = bl.slot || '____';
      const at = t.indexOf(slot, pos);
      pos = at + slot.length;
      const before = t.slice(0, at), after = t.slice(at + slot.length);
      if (/\bbox\b/i.test(bl.label || '')) fills[bl.key] = boxName;             /* a box name */
      else if (/^\s*(if|elif)\b/.test(t) && /^\s*["']/.test(after)) fills[bl.key] = '==';   /* the sign on a fork line */
      else if (/["']\s*$/.test(before) && /^\s*["']/.test(after)) fills[bl.key] = 'q words';  /* words inside speech marks */
      else fills[bl.key] = 'words';
    });
  });
  return fills;
}
/* what a tray line shows: its fixed text, with each gap's label where the gap is */
function piecesOf(L) {
  const pieces = String(L.t || '').split(L.blanks && L.blanks[0] && L.blanks[0].slot || '____')
    .map(norm).filter(p => p.length >= 3);
  (L.blanks || []).forEach(bl => { if (bl.label) pieces.push(norm(bl.label)); });
  return pieces.length ? pieces : [norm(L.t)];
}
function oneBuild(c, b) {
  return Object.assign({}, c, { config: Object.assign({}, c.config, { builds: [b] }) });
}

/* ---- A. the wait note vs the measured reply space -------------------------- */
async function waitCase(pg, wc, engineSrc) {
  const c = wc.chunk, cfg = c.config, b = (cfg.builds || [])[0];
  if (!b) return { skip: 'no build' };
  const isExtras = !!cfg.extrasMode;
  const chunk = isExtras ? c : oneBuild(c, b);
  const m = await ev(pg, MOUNT, chunk, isExtras ? b.id : null).catch(e => ({ error: String(e) }));
  if (m.error) return { skip: 'mount failed: ' + m.error };
  if (m.editor) {
    await ev(pg, TYPE, 'answer = input("What do you say?")\nprint(answer)\n');
  } else if (m.tray) {
    /* enough of the program to reach its first question: every line up to and
       including the first one with input( ) in it (the fixed top lines come first by themselves) */
    const lines = b.lines || [];
    let upto = lines.findIndex(L => /input\s*\(/.test(String(L.t || '')));
    if (upto === -1) upto = (b.fixedTop || []).some(t => /input\s*\(/.test(t)) ? lines.length - 1 : lines.length - 1;
    await ev(pg, PLACE, lines.slice(0, upto + 1).map(L => ({ pieces: piecesOf(L) })));
    await ev(pg, FILL, fillsFor(b));
  } else {
    await ev(pg, FILL, fillsFor(b));   /* a worked card: fixed lines, maybe a pre-filled gap */
  }
  const r = await ev(pg, RUN, 6000);
  if (r.error) return { skip: r.error };
  if (!r.asks) return { skip: 'the card never asked (' + (r.consoleText || '').slice(0, 120) + ')' };
  return r;
}
function judgeWait(label, cfg, r, isControl) {
  const text = cfg.waitingSay;
  const below = r.replyRect.top >= r.runRect.bottom - 2;
  const above = r.replyRect.bottom <= r.runRect.top + 2;
  const saysAbove = /\babove\b/i.test(text);
  const saysBelow = /\b(below|under|underneath|beneath)\b/i.test(text);
  const where = below ? 'BELOW' : above ? 'ABOVE' : 'BESIDE';
  const ok = !(below && saysAbove) && !(above && saysBelow) && (below ? saysBelow : above ? saysAbove : true);
  const shown = r.waitNote === norm(text);
  if (isControl) return { ok: ok, shown: shown, where: where };
  check(shown, label + ': the wait note on screen is the lesson\'s waitingSay');
  check(ok, label + ': the wait note points the way the reply space really is (' + where + ' the button; note says ' +
    (saysAbove ? '"above"' : saysBelow ? '"below"' : 'no direction') + ')');
  return { ok: ok, shown: shown, where: where };
}

/* ---- B. the swallowed answer and its sentence ------------------------------ */
async function replyCase(pg, rc, engineSrc, isControl) {
  const c = rc.chunk, cfg = c.config, b = rc.build;
  const isExtras = !!cfg.extrasMode;
  const expectReplies = (b.check && b.check.repliesSay) || cfg.repliesSay || pySay(engineSrc, 'repliesSay');
  const generic = b.notYetSay || cfg.notYetSay || pySay(engineSrc, 'notYetSay');
  const genericCfg = cfg.notYetSay || pySay(engineSrc, 'notYetSay');   /* the extras site's own chain (no b.notYetSay) */
  const out = { expectReplies: expectReplies, generic: generic, genericCfg: genericCfg };
  if (!b.lines || !b.lines.length) { out.skip = 'no lines to arrange (a worked or typed card)'; return out; }

  /* mount once so the engine under test does the searching */
  const chunk = isExtras ? c : oneBuild(c, b);
  const m = await ev(pg, MOUNT, chunk, isExtras ? b.id : null).catch(e => ({ error: String(e) }));
  if (m.error) { out.skip = 'mount failed: ' + m.error; return out; }
  if (!m.tray) { out.skip = 'no tray on this card'; return out; }
  const fills = fillsFor(b);
  const hit = await ev(pg, SEARCH, b.lines, fills, b.check.usesReplies, 600, b.fixedTop || []);
  out.runs = hit.runs;
  out.hit = hit;
  async function play(rec) {
    await ev(pg, MOUNT, chunk, isExtras ? b.id : null);
    const placed = await ev(pg, PLACE, rec.idx.map(i => ({ pieces: piecesOf(b.lines[i]) })));
    await ev(pg, FILL, fills);
    const r = await ev(pg, RUN, 8000);
    r.placed = placed;
    return r;
  }
  if (hit.missing) out.missing = await play(hit.missing);
  if (hit.clean) out.clean = await play(hit.clean);
  return out;
}
function judgeReply(label, rc, res, base) {
  const b = rc.build;
  check(typeof (b.check && b.check.repliesSay) === 'string' && b.check.repliesSay.trim().length > 20,
    label + ': the lesson owns a check.repliesSay for the swallowed-answer state');
  if (res.skip) { note(label + ': ' + res.skip); return; }
  if (!res.hit.missing) {
    note(label + ': no arrangement of its ' + b.lines.length + ' lines runs clean and swallows an answer (' + res.runs + ' runs) — nothing to prove here');
  } else {
    const r = res.missing;
    note(label + ': slip found after ' + res.runs + ' runs: lines ' + res.hit.missing.idx.map(i => i + 1).join(',') +
      ' → printed "' + norm(res.hit.missing.out).slice(0, 90) + '"');
    check(r.placed.every(p => p === 'ok'), label + ': every line of the slip was placed through the tray (' + r.placed.join(' ') + ')');
    check(!r.pyErr && r.vsay != null, label + ': the slip ran clean on the card and reached a verdict' +
      (!r.pyErr && r.vsay != null ? '' : ' (asked ' + r.asks + ', error ' + (r.error || 'none') + ', console: ' + String(r.consoleText || '').slice(0, 160) + ')'));
    check(/is-notyet/.test(r.cls || ''), label + ': the slip is NOT marked as working');
    check(r.vsay === norm(res.expectReplies), label + ': the verdict is the card\'s own swallowed-answer sentence' +
      (r.vsay === norm(res.expectReplies) ? '' : '\n          got:  "' + r.vsay + '"\n          want: "' + norm(res.expectReplies) + '"'));
    if (base && base.missing) {
      control(base.missing.vsay !== norm(res.expectReplies) && !base.missing.pyErr && /is-notyet/.test(base.missing.cls || ''),
        label + ': at ' + BASE_REF + ' the same clean slip is told a generic not-working line ("' + String(base.missing.vsay).slice(0, 60) + '…")');
    } else if (base) note(label + ': control could not reach the slip at ' + BASE_REF + (base.skip ? ' (' + base.skip + ')' : ''));
  }
  if (res.hit.clean) {
    const r = res.clean;
    check(!r.pyErr && /is-matched/.test(r.cls || ''), label + ': the working program is still told it works (lines ' +
      res.hit.clean.idx.map(i => i + 1).join(',') + ')' +
      (!r.pyErr && /is-matched/.test(r.cls || '') ? '' : ' (asked ' + r.asks + ', verdict "' + r.vsay + '", error ' + (r.error || 'none') + ', console: ' + String(r.consoleText || '').slice(0, 160) + ')'));
  }
}

/* ---- main ------------------------------------------------------------------ */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const cur = { engine: fs.readFileSync(ENGINES, 'utf8'), style: fs.readFileSync(STYLE, 'utf8'), lessons: loadLessons(null) };
  const base = { engine: git(BASE_REF, 'ks3-dt/platform/engines.js'), style: git(BASE_REF, 'ks3-dt/platform/style.css'), lessons: loadLessons(BASE_REF) };

  console.log('\n== A. THE WAIT NOTE POINTS WHERE THE REPLY SPACE IS ==');
  check(pySay(cur.engine, 'repliesSay') != null, 'the engine carries a fallback sentence for a swallowed answer (PY_SAY.repliesSay)');
  control(pySay(base.engine, 'repliesSay') == null, 'at ' + BASE_REF + ' the engine has no such sentence');
  let wcs = waitCases(cur.lessons).filter(w => !ONLY || w.label.indexOf(ONLY) !== -1);
  const P = await makePage(browser, cur.engine, cur.style);
  const measured = {};
  const doneLesson = {};
  for (const wc of wcs) {
    if (QUICK && doneLesson[wc.lessonId]) continue;     /* --quick: the first card per lesson that can be measured */
    const r = await waitCase(P.pg, wc, cur.engine);
    if (r.skip) { note(wc.label + ': ' + r.skip); continue; }
    measured[wc.label] = judgeWait(wc.label, wc.chunk.config, r, false);
    doneLesson[wc.lessonId] = true;
  }
  /* control: the same cards at BASE_REF, judged the same way, must fail somewhere */
  const PB = await makePage(browser, base.engine, base.style);
  const baseWait = waitCases(base.lessons).filter(w => measured[w.label]);
  let fired = 0, tried = 0;
  for (const wc of baseWait) {
    const r = await waitCase(PB.pg, wc, base.engine);
    if (r.skip) continue;
    tried++;
    const j = judgeWait(wc.label, wc.chunk.config, r, true);
    if (!j.ok) fired++;
  }
  if (tried || !ONLY) control(tried > 0 && fired > 0, 'at ' + BASE_REF + ' ' + fired + ' of ' + tried + ' wait notes point the wrong way (the J2 cards said "above")');

  console.log('\n== B. A SWALLOWED ANSWER GETS ITS OWN SENTENCE ==');
  const rcs = replyCases(cur.lessons).filter(w => !ONLY || w.label.indexOf(ONLY) !== -1);
  const baseRcs = replyCases(base.lessons);
  for (const rc of rcs) {
    const res = await replyCase(P.pg, rc, cur.engine, false);
    const brc = baseRcs.find(x => x.label === rc.label);
    let bres = null;
    if (brc && !res.skip && res.hit && res.hit.missing) {
      /* play the SAME slip on the old engine and old content */
      const chunkB = brc.chunk.config.extrasMode ? brc.chunk : oneBuild(brc.chunk, brc.build);
      const mB = await ev(PB.pg, MOUNT, chunkB, brc.chunk.config.extrasMode ? brc.build.id : null).catch(e => ({ error: String(e) }));
      if (!mB.error) {
        await ev(PB.pg, PLACE, res.hit.missing.idx.map(i => ({ pieces: piecesOf(brc.build.lines[i]) })));
        await ev(PB.pg, FILL, fillsFor(brc.build));
        bres = { missing: await ev(PB.pg, RUN, 8000) };
      } else bres = { skip: mB.error };
    }
    judgeReply(rc.label, rc, res, bres);
    control(!(brc && brc.build.check && brc.build.check.repliesSay), rc.label + ': at ' + BASE_REF + ' the lesson had no check.repliesSay');
  }

  const errs = P.errs.concat(PB.errs);
  check(errs.length === 0, 'no page errors while the cards ran' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'ALL PASS'));
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('HARNESS FAILED', e); process.exit(2); });
