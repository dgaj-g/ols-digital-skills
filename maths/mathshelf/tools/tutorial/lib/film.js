/* film.js — the MathShelf tutorial's own helpers, on top of the shared cinema
   layer (lib/cinema.js, the same overlay the KS3 DT films use).

   THE LAWS THIS FILE KEEPS (his, from the KS3 tutorial videos):
   - a caption never sits on the thing it is telling the viewer to look at
     (DFM 141a): every ring is drawn AFTER its target is scrolled into the
     frame, and refuses to draw if it is not (DFM 121a);
   - scrolling is SHOWN: the page is scrolled smoothly on camera, never jumped
     behind a curtain, so the viewer sees where the thing is;
   - every screen filmed is the screen a teacher or pupil gets: the preview's
     own banner and its practice identity are tidied before the take, and
     nothing else is touched.

   Filmed against the offline preview (localhost:8099), whose store is this
   browser's own localStorage — so what the teacher ticks in one chapter is
   what the pupil sees in the next, and what the pupil answers is what the
   markbook shows at the end. One browser context for the whole film. */
'use strict';
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');

const BASE = 'http://localhost:8099/maths/mathshelf/index.html';
/* the real front door: the address the film shows when a link is copied, so a
   teacher watching sees the link her pupils will actually open */
const LIVE = 'https://script.google.com/a/macros/c2ken.net/s/AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP/exec';
const TEACHER_EMAIL = 'demo.teacher@c2ken.net';   /* the preview's own practice teacher */
const PUPIL_NAME = 'Ciara Walsh';                 /* a made-up pupil; not in the practice class */
const FILM_CLASS = '10E-Maths';                   /* the class the teacher makes on camera */
const PRACTICE_CLASS = '10B Maths (demo)';        /* twelve made-up pupils with work in every book */
const VW = 1280, VH = 720;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- the tidy-up, applied before any page script runs ---------- */
function initScript() {
  /* runs in the page: strip the preview's banner the moment it appears, and
     show the practice teacher's address where the live site shows hers */
  const TEACHER = 'demo.teacher@c2ken.net';
  const fix = () => {
    const b = document.getElementById('gj-preview-banner');
    if (b) b.remove();
    document.documentElement.style.paddingTop = '';
    document.body && (document.body.style.paddingTop = '');
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && n.nodeValue.indexOf('you@offline.preview') > -1) {
        n.nodeValue = n.nodeValue.replace(/you@offline\.preview/g, TEACHER);
      }
    }
  };
  const mo = new MutationObserver(fix);
  document.addEventListener('DOMContentLoaded', () => { fix(); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); });
}

async function openBrowser(outDir) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VW, height: VH },
    /* the school's machines are Windows; film as they will see it (DFM 169) */
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    recordVideo: { dir: outDir, size: { width: VW, height: VH } }
  });
  await context.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'Win32' }); });
  await context.addInitScript(initScript);
  return { browser, context };
}

/* open a MathShelf page and make its copied links the real ones */
async function boot(page, query) {
  await page.goto(BASE + (query || '?nointro'), { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  await page.evaluate((live) => { if (window.GJ && window.GJ.app && window.GJ.app.boot) window.GJ.app.boot.baseUrl = live; }, LIVE);
  await page.evaluate(() => { const b = document.getElementById('gj-preview-banner'); if (b) b.remove(); });
}

/* ---------- geometry ---------- */
async function rect(page, sel, textRx, child) {
  const r = await page.evaluate(([s, rx, ch]) => {
    let nodes = Array.from(document.querySelectorAll(s));
    if (rx) { const re = new RegExp(rx, 'i'); nodes = nodes.filter(n => re.test((n.textContent || '').replace(/\s+/g, ' '))); }
    let n = nodes[0];
    if (n && ch) { const kid = n.querySelector(ch); if (!kid) return { missingChild: true }; n = kid; }
    if (!n) return null;
    const b = n.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  }, [sel, textRx || null, child || null]);
  if (!r) throw new Error('no element for ' + sel + (textRx ? ' /' + textRx + '/' : ''));
  if (r.missingChild) throw new Error('MISSING TARGET: ' + sel + ' has no ' + child);
  return r;
}
const mid = r => [Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2)];

/* SCROLLING IS SHOWN. A smooth scroll the viewer can follow, then a wait for
   it to settle, and a check that the target really is in the frame. */
async function scrollIntoFrame(page, sel, textRx, block) {
  await page.evaluate(([s, rx, blk]) => {
    let nodes = Array.from(document.querySelectorAll(s));
    if (rx) { const re = new RegExp(rx, 'i'); nodes = nodes.filter(n => re.test((n.textContent || '').replace(/\s+/g, ' '))); }
    const n = nodes[0];
    if (n) n.scrollIntoView({ block: blk || 'center', inline: 'nearest', behavior: 'smooth' });
  }, [sel, textRx || null, block || null]);
  await sleep(1100);
}
async function scrollWindowTo(page, y) {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y);
  await sleep(1100);
}
async function scrollTop(page) { await scrollWindowTo(page, 0); }

/* a gold ring with its label, on a target that is on screen — or a loud refusal */
async function ring(cine, page, sel, textRx, label, opts) {
  opts = opts || {};
  if (!opts.noScroll) await scrollIntoFrame(page, sel, textRx, opts.block);
  const r = await rect(page, sel, textRx, opts.child);
  const MARGIN = 4, pillRoom = opts.side === 'above' ? 100 : 110;
  const top = r.y - (opts.side === 'above' ? pillRoom : 0);
  const bottom = r.y + r.h + (opts.side === 'above' ? 0 : pillRoom);
  if (top < MARGIN || bottom > VH - MARGIN) {
    throw new Error('OFF-FRAME annotation: ' + sel + (textRx ? ' /' + textRx + '/' : '') + ' rect y=' + r.y + ' h=' + r.h + ' needs ' + top + '..' + bottom + ' of 0..' + VH);
  }
  await cine.callout(r, label, opts);
  return r;
}
async function clickAt(cine, page, sel, textRx, opts) {
  opts = opts || {};
  if (!opts.noScroll) await scrollIntoFrame(page, sel, textRx, opts.block);
  const r = await rect(page, sel, textRx, opts.child);
  await cine.click(...mid(r), opts);
  return r;
}
/* type on camera: the cursor goes to the box, then the words appear one by one */
async function typeInto(cine, page, sel, text, opts) {
  opts = opts || {};
  const r = await rect(page, sel);
  await cine.click(...mid(r), { after: 300 });
  await page.keyboard.type(text, { delay: opts.delay || 95 });
  await sleep(opts.after != null ? opts.after : 500);
}

/* ---------- the number pad, pressed key by key ---------- */
async function padPress(cine, page, rootSel, key) {
  const r = await rect(page, rootSel + ' .numpad button', '^' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
  await cine.click(...mid(r), { ms: 260, settle: 120, after: 160 });
}
async function padType(cine, page, rootSel, value) {
  for (const ch of String(value)) await padPress(cine, page, rootSel, ch);
}
async function padNext(cine, page, rootSel) {
  const r = await rect(page, rootSel + ' button', '^next');
  await cine.click(...mid(r), { ms: 300, settle: 140, after: 320 });
}

/* ---------- the graph board: a data point in screen pixels ---------- */
async function boardClient(page, qSel, x, y) {
  return page.evaluate(([s, xx, yy]) => {
    const root = document.querySelector(s);
    const bd = root && root.__statBoard;
    if (!bd || !bd.toPx || !bd.svg) return null;
    const px = bd.toPx(xx, yy);
    const pt = bd.svg.createSVGPoint(); pt.x = px[0]; pt.y = px[1];
    const sp = pt.matrixTransform(bd.svg.getScreenCTM());
    return { x: Math.round(sp.x), y: Math.round(sp.y), pageY: Math.round(sp.y + window.scrollY) };
  }, [qSel, x, y]);
}
/* bring a page-y into the middle of the frame, smoothly */
async function scrollPointIntoFrame(page, pageY) {
  const cur = await page.evaluate(() => window.scrollY);
  const want = Math.max(0, pageY - 380);
  if (Math.abs(cur - want) > 40) await scrollWindowTo(page, want);
}

/* ---------- the doors ---------- */
async function staffIn(page) {
  /* behind the curtain: the passcode typed and the markbook opened */
  await page.evaluate(() => document.getElementById('cover-staff').click());
  await sleep(700);
  await page.fill('#cover-pass', 'demo');
  await page.click('#cover-open');
  await sleep(1800);
}
async function pupilIn(page) {
  await page.evaluate(() => document.getElementById('cover-open').click());
  await sleep(1800);
}
/* A CLEAN BOOK FOR A CLEAN TAKE. A failed take has already saved the pupil's
   half-filled table, and a re-take that types into cells that still hold
   yesterday's digits films "1313". The book's saved state is dropped before
   any chapter that answers questions from scratch. */
async function resetPupilBook(page, cls, book) {
  await page.evaluate(([c, b]) => {
    try {
      const s = JSON.parse(localStorage.getItem('gj-offline-v1') || '{}');
      const email = 'you@offline.preview';
      if (s.data && s.data[c] && s.data[c][email]) delete s.data[c][email][b];
      localStorage.setItem('gj-offline-v1', JSON.stringify(s));
      Object.keys(localStorage).filter(k => k.indexOf('outbox:') === 0).forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }, [cls, book]);
}

/* the practice pupil's name, saved the way the app saves a name */
async function namePupil(page) {
  await page.evaluate((nm) => window.GJ.app.call('setname', { name: nm }), PUPIL_NAME);
  await sleep(300);
}
/* THE LIVE STORE TAKES A FEW SECONDS; the preview answers at once. A save is
   held for about the time the live store takes (measured 13 Sept 2026: 3-4 s),
   so the pupil's own "Saving…" line is on screen for the time she would
   actually see it. Nothing else about saving is changed. */
async function slowSaves(page, ms) {
  await page.evaluate((delay) => {
    /* the app's own call() looks for a transport first; this one hands every
       call straight back to the app's offline store and only holds a save */
    const orig = window.GJ.app.call;
    window.OLS_TRANSPORT = {
      call: function (p) {
        const t = window.OLS_TRANSPORT;
        window.OLS_TRANSPORT = undefined;
        let pr;
        try { pr = orig(p.action, p); } finally { window.OLS_TRANSPORT = t; }
        if (p.action !== 'save') return pr;
        return new Promise((res, rej) => setTimeout(() => pr.then(res, rej), delay));
      }
    };
  }, ms || 3200);
}

/* a chapter opens on its navy title card and closes back to navy */
const KICKER = 'OLS MATHEMATICS · MATHSHELF';
async function chapterOpen(cine, crest, n, title, sub) {
  await cine.install();
  await cine.curtain({ crest, kicker: KICKER, title, sub: 'Chapter ' + n + ' — ' + sub });
  await cine.pause(2800);
}
async function chapterClose(cine) {
  await cine.pause(800);
  await cine.drop({ bare: true });
  await cine.pause(900);
}

module.exports = {
  openBrowser, boot, resetPupilBook, rect, mid, scrollIntoFrame, scrollWindowTo, scrollTop, ring, clickAt, typeInto,
  padPress, padType, padNext, boardClient, scrollPointIntoFrame, staffIn, pupilIn, namePupil, slowSaves,
  chapterOpen, chapterClose, sleep, KICKER, BASE, LIVE, TEACHER_EMAIL, PUPIL_NAME, FILM_CLASS, PRACTICE_CLASS, VW, VH
};
