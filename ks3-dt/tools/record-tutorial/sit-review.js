/* SIT-REVIEW: walk a J1 lesson as a pupil and capture EVERYTHING for the
   L2-L5 review (DFM 127). Screenshots every distinct card/state, captures the
   ? help modal once per chunk, measures the video player, and dumps every
   visible string to a text log for the register/claims review.

   Usage: node sit-review.js <lessonNum: 2|3|4|5|S1> [persona]
   Server: expects dev-static on :8121 (launch config "ks3dt-review").
   Output: Claude Work/KS3 DT Platform/qa-l2-l5-review/l<num>/
   Reuses the qa-j1-l1.js walker pattern (GHOST_WAIT click-like-a-person). */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');

const NUM = String(process.argv[2] || '2');
const WHO = process.argv[3] || 'anya';
/* the port is overridable so the SAME walker can be pointed at the build he
   sat (the DFM 196 worktree on :8097) without editing this file — comparing a
   number against a different build is how this round proves things. */
const HOST = process.env.KS3DT_BASE || 'http://localhost:8121';
const BASE = HOST + '/ks3-dt/platform/index.html?class=Demo-8A&as=';
/* ------------------------------------------------------------------ *
 * WHAT THIS RUN MUST PROVE (DFM 199 — his ruling, 13 Aug 2026:
 * "pin the stable numbers and carry on with the rest").
 *
 * The old gate pinned the TURN COUNT, and the turn count is this file's own
 * loop counter: it counts the passes where the walker WAITS for an animation
 * exactly as it counts the passes where it acts. Lesson 5's Mission Briefing
 * types itself out, so whether a look lands during the typing or just after it
 * depends on machine load — the same build measured 61, then 62. A pass/fail
 * gate built on a number that moves on its own is a false alarm waiting to
 * happen, which is the very fault this round exists to remove.
 *
 * So the turn count is REPORTED, and these are ASSERTED. Every one of them was
 * identical across every run of both builds: what the pupil actually does.
 * ------------------------------------------------------------------ */
const EXPECT = {
  '4': { xp: 42, chunks: 6, presses: 8, marks: 7, badges: 1 },
  '5': { xp: 42, chunks: 10, presses: 17, marks: 7, badges: 4 }
};
const OUT = path.join('/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform',
  'qa-l2-l5-review', 'l' + NUM.toLowerCase() + (WHO === 'anya' ? '' : '-' + WHO));
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GHOST_WAIT = 420;

const TITLES = { '2': 'Make It Move', '3': 'Scoreboard Engineer', '4': 'The Broken Game', '5': 'Game Studio', 'S1': 'Files That Follow You' };

let shotN = 0;
const log = [];
function note(s) { log.push(s); console.log(s); }

/* term-rich case-log sentences for L4 (logTerms gating) */
const CASE_LOGS = {
  c1: 'The right-arrow script had no hat block at the top, so it never started. I added the when right arrow key pressed event trigger.',
  c2: 'The change score block said 0 not 1, so eating a fish added zero points. I changed the number to 1 so each fish scores one point.',
  c3: 'The fish-maker script only ran once with no forever loop, so I wrapped the spawn blocks in a forever loop so fish keep coming again and again.',
  c4: 'The stage script switched to the white backdrop and waited before showing the sea, so I moved the ocean switch first in the order.'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const u = (m.location() && m.location().url) || '';
    if (/intro\.mp4|intro-portrait\.mp4|crest\.png/.test(u)) return;
    errs.push(m.text() + (u ? ' @ ' + u : ''));
  });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  async function shot(tag) {
    shotN++;
    const name = String(shotN).padStart(3, '0') + '-' + tag.replace(/[^a-z0-9-]/gi, '_').slice(0, 60) + '.png';
    await page.screenshot({ path: path.join(OUT, name) });
    return name;
  }
  async function hostText() {
    return page.evaluate(() => {
      const h = document.querySelector('.chunk-host');
      return h ? (h.innerText || '').trim() : '(no host)';
    });
  }
  async function chunkId() {
    return page.evaluate(() => {
      const s = window.App && window.App.state;
      return s && s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : '(none)';
    });
  }

  /* ---------- boot: fresh pupil, all lessons delivered NOW, pairing off ---------- */
  await page.goto(BASE + WHO, { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  if (WHO === 'anya') await page.evaluate(() => localStorage.clear()); // cara keeps anya's world
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate((TARGET_NUM) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: 0 };
    /* rule 134 (2 Aug 2026): the Do-Now serves only lessons this pupil has
       COMPLETED, so a fresh persona would get no warm-up at all. Stage the
       sitting pupil the way a real one arrives: every lesson BEFORE the one
       being sat already complete (plus the side quest from L3 onward, which
       is when it is due). Keeps the Do-Now on screen with honest content. */
    const target = TARGET_NUM;
    const done = {};
    if (typeof target === 'number') {
      for (let n = 1; n < target; n++) done[String(n)] = 1;
      if (target >= 3) done['S1'] = 1;
    } else if (target === 'S1') { done['1'] = 1; }
    const L = {};
    Object.keys(done).forEach((k, ix) => { L[k] = [2, 10, 'sit' + k + '=1', '1', '222|1', 100 + ix, 10, 0, '', 0, 0]; });
    db.pupils = db.pupils || {};
    db.pupils['Demo-8A:anya.murphy@demo'] = Object.assign(
      db.pupils['Demo-8A:anya.murphy@demo'] || { n: 'Anya Murphy', cn: '', j: 1, xp: 0, g: '' }, { L });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, NUM === 'S1' ? 'S1' : Number(NUM));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(700);
  await shot('hub');

  /* open the lesson tile */
  const title = TITLES[NUM];
  await page.evaluate(t => {
    const tile = Array.from(document.querySelectorAll('.tile')).find(e => e.textContent.includes(t));
    if (tile) tile.click();
  }, title);
  await sleep(2400);
  note('OPENED ' + title + ' as ' + WHO);

  /* ---------- the walker ---------- */
  const helpSeen = new Set();
  let lastKey = '', same = 0, turns = 0;
  const seen = { chunks: new Set(), presses: 0, marks: 0, badges: 0 };
  const askedTexts = new Set();

  for (turns = 0; turns < 400; turns++) {
    const done = await page.evaluate(() => !!document.querySelector('.badge-pop-card.finish'));
    if (done) { await shot('LESSON-COMPLETE'); note('LESSON COMPLETE at turn ' + turns); break; }

    const ck = await chunkId();

    /* once per chunk: capture the ? help modal */
    if (ck !== '(none)' && !helpSeen.has(ck)) {
      helpSeen.add(ck);
      seen.chunks.add(ck);
      const t = await hostText();
      note('\n==== CHUNK ' + ck + ' ====\n' + t.slice(0, 3000));
      await shot(ck + '-enter');
      const helped = await page.evaluate(() => {
        const b = document.querySelector('#help-beacon');
        if (b && !b.hidden) { b.click(); return true; }
        return false;
      });
      if (helped) {
        await sleep(500);
        const ht = await page.evaluate(() => {
          const m = document.querySelector('#help-modal');
          return m ? (m.innerText || '').trim() : '(no modal)';
        });
        note('HELP[' + ck + ']: ' + ht.replace(/\s+/g, ' ').slice(0, 300));
        await shot(ck + '-help');
        await page.evaluate(() => { const c = document.querySelector('#help-close'); if (c) c.click(); });
        await sleep(400);
      }
      /* video metrics if a player is on screen */
      const vm = await page.evaluate(() => {
        const v = document.querySelector('.chunk-host video');
        if (!v) return null;
        const r = v.getBoundingClientRect();
        const card = v.closest('.card');
        const cr = card ? card.getBoundingClientRect() : null;
        return { video: { w: Math.round(r.width), h: Math.round(r.height) }, card: cr && { w: Math.round(cr.width), h: Math.round(cr.height) }, viewport: { w: innerWidth, h: innerHeight } };
      });
      if (vm) note('VIDEO METRICS[' + ck + ']: ' + JSON.stringify(vm));
    }

    const st = await page.evaluate(() => {
      const q = s => document.querySelector(s);
      const vis = e => e && e.offsetParent !== null && !e.disabled;
      if (q('.badge-pop button')) return { kind: 'badge', label: (q('.badge-pop-card h2') || q('.badge-pop-card h3') || {}).textContent || '' };
      if (vis(q('.dossier-cta'))) return { kind: 'dossier-cta' };
      if (q('.se-card')) return { kind: 'selfeval' };
      /* studio QA desk: expand row -> run test -> pick the pass outcome -> ready */
      if (q('.std-qa-row')) {
        if (q('.std-qa-outcomes:not([hidden]) .std-outcome')) return { kind: 'std-outcome' };
        if (Array.from(document.querySelectorAll('.std-qa-run')).some(b => vis(b))) return { kind: 'std-run' };
        const head = Array.from(document.querySelectorAll('.std-qa-row:not(.pass) .std-qa-head:not([disabled])')).find(vis);
        if (head) return { kind: 'std-expand', label: (head.textContent || '').trim().slice(0, 30) };
        if (q('.std-ready-btn.lit:not([disabled])')) return { kind: 'std-ready' };
      }
      /* studio sign phase: the three contract cards are on screen */
      {
        const host1 = q('.chunk-host');
        if (q('.std-sig-input') && vis(q('.std-sig-input')) && !q('.std-qa-row') &&
            host1 && /Maze Escape/.test(host1.textContent) && /Quiz Master/.test(host1.textContent)) {
          return { kind: 'std-sign' };
        }
      }
      if (q('.rally-transmit')) {
        const after = q('.rally-after');
        if (after && after.textContent.trim()) return { kind: 'rally-after', revealed: !!q('.rally-reveal .reveal-row, .rally-reveal [class*="bar"]') };
        return { kind: 'rally' };
      }
      if (q('.q-feedback button') && vis(q('.q-feedback button'))) return { kind: 'q-next' };
      if (q('.q-opt:not(:disabled)')) return { kind: 'q-opt' };
      /* L4 case board: drive the PIN BUTTONS by priority — intake first, then
         open cases, then stretch, then the release desk. Handbook skipped
         (film audited separately). Closed pins carry a .case-stamp child. */
      if (q('.case-board')) {
        const pins = Array.from(document.querySelectorAll('button.case-pin:not([disabled])'));
        const intake = pins.find(p => p.getAttribute('data-view') === 'intake' && !p.classList.contains('done'));
        const openCase = pins.find(p => p.hasAttribute('data-case') && !p.querySelector('.case-stamp'));
        const stretch = pins.find(p => p.classList.contains('case-stretch') && !p.querySelector('.case-stamp'));
        const release = pins.find(p => p.getAttribute('data-view') === 'release' && !/signed off/i.test(p.textContent));
        const pick = intake || openCase || stretch || release;
        if (pick) {
          const label = (pick.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
          return { kind: 'case-pin', label };
        }
        /* board exhausted — fall through to generic (a Continue should exist) */
      }
      if (q('.parsons-card')) return { kind: 'parsons' };
      /* L4 case file open: explicit protocol — fill the log, then the armed close */
      if (q('.case-close-btn')) {
        const btn = q('.case-close-btn');
        const ta = q('.case-log-input');
        if (q('.case-stamp.big')) return { kind: 'case-stamped' };
        if (ta && !ta.value) return { kind: 'case-log' };
        if (!btn.disabled && !btn.classList.contains('ticked')) return { kind: 'case-close' };
        return { kind: 'case-wait' };
      }
      /* an empty gating textarea/input outranks a pending confirm — logs and
         notes must be written before their confirms arm */
      {
        const host0 = q('.chunk-host');
        if (host0) {
          const ta0 = Array.from(host0.querySelectorAll('textarea, input[type=text], input[type=number], input:not([type])')).filter(vis).filter(e => !e.value);
          if (ta0.length) return { kind: 'input', ph: ta0.map(e => e.placeholder || e.className).join(' | ') };
        }
      }
      /* :not(.locked) added 12 Aug 2026. The casework gate redesign replaced
         `disabled` with a `.locked` class + aria-disabled (so a locked control
         can still be CLICKED and answer why it is locked). The walker fills
         every input before it reads button state, so this never changed a turn
         — but a walker that CAN click a locked control is a walker whose 48/42
         means less than it looks. */
      var CONFIRM_OPEN = '.confirm-step:not(.ticked):not([disabled]):not(.locked)';
      if (q(CONFIRM_OPEN)) return { kind: 'confirm', label: (q(CONFIRM_OPEN) || {}).textContent || '' };
      if (q('.tour-callout button')) return { kind: 'tour' };
      if (q('.panel-loading')) return { kind: 'loading' };
      const host = q('.chunk-host');
      if (!host) return { kind: 'nohost' };
      /* generic text inputs that gate progress (case log, marquee, RC ask, v2) */
      const ta = Array.from(host.querySelectorAll('textarea, input[type=text], input[type=number], input:not([type])')).filter(vis).filter(e => !e.value);
      if (ta.length) return { kind: 'input', ph: ta.map(e => e.placeholder || e.className).join(' | ') };
      const b = Array.from(host.querySelectorAll('button')).filter(vis);
      if (!b.length) return { kind: 'stuck', text: (host.textContent || '').replace(/\s+/g, ' ').slice(0, 160) };
      const pri = b.find(x => x.classList.contains('primary-btn')) || b[0];
      return { kind: 'button', label: (pri.textContent || '').trim().slice(0, 40), all: b.map(x => (x.textContent || '').trim().slice(0, 30)) };
    });

    const key = ck + ':' + st.kind + ':' + (st.label || '');
    same = key === lastKey ? same + 1 : 0;
    lastKey = key;
    if (same > 45) { note('!! WALKER STUCK on ' + JSON.stringify(st) + ' @ ' + ck); await shot('STUCK-' + ck); break; }

    switch (st.kind) {
      case 'badge':
        await shot(ck + '-badge-pop');
        seen.badges++;
        note('BADGE POP @ ' + ck + ': ' + (st.label || '').trim());
        await page.evaluate(() => document.querySelector('.badge-pop button').click());
        await sleep(600); break;

      case 'dossier-cta':
        await sleep(GHOST_WAIT);
        await shot(ck + '-briefing-full');
        await page.evaluate(() => document.querySelector('.dossier-cta').click());
        await sleep(1100); break;

      case 'confirm':
        await sleep(GHOST_WAIT);
        /* the same guard as the selector that decided this turn — clicking a
           control the walker just declared unavailable is how a harness quietly
           starts testing a screen no pupil can reach */
        await page.evaluate(() => document.querySelector('.confirm-step:not(.ticked):not([disabled]):not(.locked)').click());
        await sleep(700); break;

      case 'tour':
        await sleep(GHOST_WAIT);
        await page.evaluate(() => document.querySelector('.tour-callout button').click());
        await sleep(600); break;

      case 'q-opt': {
        await sleep(GHOST_WAIT);
        const qt = await page.evaluate(() => (document.querySelector('.q-stem') || {}).textContent || '');
        if (!askedTexts.has(qt)) { askedTexts.add(qt); await shot(ck + '-question'); }
        const t0 = Date.now();
        await page.evaluate(() => {
          const o = document.querySelectorAll('.q-opt:not(:disabled)');
          o[0].click();
        });
        /* measure marking latency: wait for verdict/ack */
        let latency = -1;
        for (let w = 0; w < 40; w++) {
          const got = await page.evaluate(() => !!document.querySelector('.q-verdict, .q-ack, .q-feedback'));
          if (got) { latency = Date.now() - t0; break; }
          await sleep(50);
        }
        seen.marks++;
        note('MARKING LATENCY @ ' + ck + ': ' + latency + 'ms');
        await shot(ck + '-answered');
        await sleep(500); break;
      }

      case 'q-next':
        await sleep(GHOST_WAIT);
        await page.evaluate(() => document.querySelector('.q-feedback button').click());
        await sleep(700); break;

      case 'parsons': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-parsons');
        for (let i = 0; i < 8; i++) {
          const moved = await page.evaluate(() => {
            const t = document.querySelector('.parsons-tray .parsons-block');
            if (t) { t.click(); return true; }
            return false;
          });
          if (!moved) break;
          await sleep(350);
        }
        await shot(ck + '-parsons-placed');
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /check|lock|submit/i.test(x.textContent) && !x.disabled);
          if (b) b.click();
        });
        await sleep(1300);
        await shot(ck + '-parsons-checked');
        break;
      }

      case 'selfeval': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-selfeval');
        await page.evaluate(() => {
          document.querySelectorAll('.se-chips').forEach(r => r.querySelector('.se-chip').click());
          const d = document.querySelector('.se-diff-chips .se-chip'); if (d) d.click();
          const c = document.querySelector('.se-card textarea'); if (c) { c.value = 'Preview sit-through - review run.'; c.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        await sleep(400);
        await page.evaluate(() => { const b = document.querySelector('.se-submit'); if (b && !b.disabled) b.click(); });
        await sleep(6000);
        await shot(ck + '-selfeval-done');
        break;
      }

      case 'std-sign': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-contracts');
        await page.evaluate(() => {
          const card = Array.from(document.querySelectorAll('.chunk-host [class*="contract"], .chunk-host .card')).find(c => /Catch It/.test(c.textContent));
          const pick = card && card.querySelector('button');
          if (pick) pick.click();
        });
        await sleep(700);
        await page.evaluate(() => {
          const i = document.querySelector('.std-sig-input');
          if (i) { i.value = 'Golden Otter Games'; i.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        await sleep(300);
        await shot(ck + '-signed-name');
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /sign/i.test(x.textContent) && !x.disabled);
          if (b) b.click();
        });
        await sleep(1100); break;
      }

      case 'std-expand': {
        await sleep(GHOST_WAIT);
        await page.evaluate(() => {
          const vis = e => e && e.offsetParent !== null;
          const head = Array.from(document.querySelectorAll('.std-qa-row:not(.pass) .std-qa-head:not([disabled])')).find(vis);
          if (head) head.click();
        });
        await sleep(700);
        await shot(ck + '-qa-expanded');
        break;
      }
      case 'std-run': {
        await sleep(GHOST_WAIT);
        await page.evaluate(() => {
          const vis = e => e && e.offsetParent !== null;
          const run = Array.from(document.querySelectorAll('.std-qa-run')).find(vis);
          if (run) run.click();
        });
        await sleep(700);
        await shot(ck + '-qa-outcomes-open');
        break;
      }
      case 'std-outcome': {
        await sleep(GHOST_WAIT);
        await page.evaluate(() => {
          /* data-oi=0 is the authored PASS outcome on every criterion */
          const o = document.querySelector('.std-qa-outcomes:not([hidden]) .std-outcome[data-oi="0"]') ||
                    document.querySelector('.std-qa-outcomes:not([hidden]) .std-outcome');
          if (o) o.click();
        });
        await sleep(900);
        await shot(ck + '-qa-pass-recorded');
        break;
      }
      case 'std-ready': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-READY-lit');
        await page.evaluate(() => document.querySelector('.std-ready-btn.lit').click());
        await sleep(1200);
        await shot(ck + '-doors');
        break;
      }

      case 'input': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-input-' + (st.ph || '').slice(0, 20));
        await page.evaluate(logs => {
          const vis = e => e && e.offsetParent !== null && !e.disabled;
          const host = document.querySelector('.chunk-host');
          const hostText = (host.innerText || '');
          const tas = Array.from(host.querySelectorAll('textarea, input[type=text], input[type=number], input:not([type])')).filter(vis).filter(e => !e.value);
          for (const ta of tas) {
            let v = 'Tested and working - review run.';
            const ph = (ta.placeholder || '') + ' ' + (ta.className || '');
            /* authored examples are the best fill: "e.g. Sushi Drop" -> "Sushi Drop" */
            const eg = /^e\.g\.\s+(.+)$/.exec((ta.placeholder || '').trim());
            if (eg) {
              ta.value = eg[1];
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              continue;
            }
            let cid = null;
            const caseCard = ta.closest('[data-case]');
            if (caseCard) cid = caseCard.getAttribute('data-case');
            if (!cid) {
              if (/Frozen Shark/i.test(hostText)) cid = 'c1';
              else if (/Broken Scoreboard/i.test(hostText)) cid = 'c2';
              else if (/Vanishing Fish/i.test(hostText)) cid = 'c3';
              else if (/White Void/i.test(hostText)) cid = 'c4';
            }
            if (cid && logs[cid] && ta.tagName === 'TEXTAREA') v = logs[cid];
            else if (/marquee|title/i.test(ph)) v = 'Sushi Drop';
            else if (/how|play/i.test(ph)) v = 'Arrow keys to move. Catch sushi, dodge the wasabi!';
            else if (/fish|number|score/i.test(ph)) v = '7';
            else if (/wrong|changed|log/i.test(ph)) v = logs.c1;
            else if (/version 2|v2|review said/i.test(ph)) v = 'In version 2 I would add a golden apple worth 3 points because a review said the scoring felt flat.';
            else if (/like/i.test(ph)) v = 'I like how the lives counter makes every drop feel risky - the wasabi got me twice.';
            else if (/wonder/i.test(ph)) v = 'I wonder what a golden apple worth 3 points would add to the late game.';
            else if (/added|variable/i.test(ph)) v = 'I added a timer variable that counts down from 60 - tested and working.';
            ta.value = v;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, CASE_LOGS);
        await sleep(400);
        /* after filling, press ONLY a primary or a now-armed confirm — never
           a ghost/back button (that's how the L4 loop happened) */
        await page.evaluate(() => {
          const host = document.querySelector('.chunk-host');
          const b = Array.from(host.querySelectorAll('button')).filter(x => x.offsetParent && !x.disabled);
          const pick = b.find(x => x.classList.contains('primary-btn')) ||
                       b.find(x => x.classList.contains('confirm-step') && !x.classList.contains('ticked'));
          if (pick) pick.click();
        });
        await sleep(1000); break;
      }

      case 'button': {
        await sleep(GHOST_WAIT);
        seen.presses++;
        note('BUTTONS @ ' + ck + ': [' + (st.all || []).join(' | ') + '] -> pressing "' + st.label + '"');
        await shot(ck + '-btn-' + st.label);
        await page.evaluate(() => {
          const host = document.querySelector('.chunk-host');
          const b = Array.from(host.querySelectorAll('button')).filter(x => x.offsetParent && !x.disabled);
          const pri = b.find(x => x.classList.contains('primary-btn')) || b[0];
          pri.click();
        });
        await sleep(1000); break;
      }

      case 'rally': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-rally-console');
        /* DFM 185: each go's score box unlocks only after THAT go's five-second
           timer has run, so the walker plays the goes like a pupil - about
           fifteen seconds of real waiting, which is the price of a real timer. */
        const goes = await page.evaluate(() => document.querySelectorAll('.rally-round').length);
        const targets = [23, 27];
        for (let i = 0; i < goes; i++) {
          await page.evaluate(() => {
            const b = document.querySelector('.rally-timer-btn');
            if (b && !b.disabled && !b.hidden) b.click();
          });
          if (i === 0) { await sleep(3200); await shot(ck + '-rally-timer-running'); }
          let open = false;
          for (let t = 0; t < 40 && !open; t++) {
            await sleep(500);
            open = await page.evaluate((n) => {
              const slot = document.querySelectorAll('.rally-round')[n];
              const plus = slot && slot.querySelector('.rally-step[data-d="1"]');
              return !!plus && !plus.disabled;
            }, i);
          }
          await page.evaluate(([n, want]) => {
            const slot = document.querySelectorAll('.rally-round')[n];
            const up10 = slot.querySelector('.rally-step[data-d="10"]');
            const up1 = slot.querySelector('.rally-step[data-d="1"]');
            for (let k = 0; k < Math.floor(want / 10); k++) up10.click();
            for (let k = 0; k < want % 10; k++) up1.click();
          }, [i, targets[i] || 20]);
        }
        await page.evaluate(() => {
          const tick = document.querySelector('.rally-confirm');
          if (tick && !tick.classList.contains('ticked')) tick.click();
        });
        await sleep(500);
        await shot(ck + '-rally-filled');
        await page.evaluate(() => {
          const t = document.querySelector('.rally-transmit');
          if (t && !t.disabled) t.click();
        });
        await sleep(1500);
        break;
      }
      case 'rally-after': {
        await shot(ck + '-rally-sealed');
        /* staff moment: assign hidden teams, then fire the reveal */
        await page.evaluate(async () => {
          const S = window.OLS_DEV_SERVER;
          await S.call({ action: 'admin', sub: 'autoGroup', passcode: 'demo', className: 'Demo-8A', n: 4 });
          await S.call({ action: 'admin', sub: 'setReveal', passcode: 'demo', className: 'Demo-8A', revealed: true });
        });
        note('STAFF: autoGroup + setReveal fired');
        /* wait for the pupil screen to paint the reveal (poll is 5s) */
        let revealed = false;
        for (let w = 0; w < 30; w++) {
          revealed = await page.evaluate(() => !!document.querySelector('.rally-reveal') && document.querySelector('.rally-reveal').textContent.trim().length > 0);
          if (revealed) break;
          await sleep(700);
        }
        await sleep(2500); /* bar animation */
        await shot(ck + '-rally-REVEAL' + (revealed ? '' : '-MISSING'));
        note('RALLY REVEAL on pupil screen: ' + revealed);
        const revealText = await page.evaluate(() => {
          const r = document.querySelector('.rally-reveal');
          return r ? (r.innerText || '').trim().slice(0, 600) : '(none)';
        });
        note('REVEAL TEXT:\n' + revealText);
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /continue/i.test(x.textContent) && x.offsetParent && !x.disabled);
          if (b) b.click();
        });
        await sleep(1200);
        break;
      }
      case 'case-log': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-case-file');
        await page.evaluate(logs => {
          const hostText = (document.querySelector('.chunk-host').innerText || '');
          let cid = 'c1';
          if (/Broken Scoreboard/i.test(hostText)) cid = 'c2';
          else if (/Vanishing Fish/i.test(hostText)) cid = 'c3';
          else if (/White Void/i.test(hostText)) cid = 'c4';
          const ta = document.querySelector('.case-log-input');
          ta.value = logs[cid];
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }, CASE_LOGS);
        await sleep(400);
        await shot(ck + '-case-log-filled');
        break;
      }
      case 'case-close': {
        await sleep(GHOST_WAIT);
        await page.evaluate(() => document.querySelector('.case-close-btn').click());
        await sleep(1000);
        await shot(ck + '-case-stamped');
        await sleep(1400); /* auto-return to board */
        break;
      }
      case 'case-stamped': case 'case-wait': await sleep(700); break;
      case 'case-pin': {
        await sleep(GHOST_WAIT);
        note('OPENING PIN: ' + st.label);
        await page.evaluate(() => {
          const pins = Array.from(document.querySelectorAll('button.case-pin:not([disabled])'));
          const intake = pins.find(p => p.getAttribute('data-view') === 'intake' && !p.classList.contains('done'));
          const openCase = pins.find(p => p.hasAttribute('data-case') && !p.querySelector('.case-stamp'));
          const stretch = pins.find(p => p.classList.contains('case-stretch') && !p.querySelector('.case-stamp'));
          const release = pins.find(p => p.getAttribute('data-view') === 'release' && !/signed off/i.test(p.textContent));
          const pick = intake || openCase || stretch || release;
          if (pick) pick.click();
        });
        await sleep(1000);
        await shot(ck + '-pin-' + st.label.slice(0, 24));
        break;
      }
      case 'loading':
        /* CONFIRMED DEFECT (2 Aug review): after the rally's transmit badge,
           "Saving your badge..." never clears — the engine paints its suspense
           room into a detached node (awardBadge wiped the host). The pupil-side
           recovery is a refresh (the designed resume path). Use it, and record
           that we did. */
        if (same === 8) {
          const isWedge = await page.evaluate(() => {
            const p = document.querySelector('#chunk-host .panel-loading');
            return p && /Saving your badge/i.test(p.textContent || '');
          });
          if (isWedge) {
            note('!! CONFIRMED WEDGE: "Saving your badge..." never clears @ ' + ck + ' — refreshing (the designed resume path)');
            await shot(ck + '-WEDGE-saving-badge');
            await page.reload({ waitUntil: 'domcontentloaded' });
            await sleep(2400);
            await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
            await sleep(1200);
            await page.evaluate(t => {
              const tile = Array.from(document.querySelectorAll('.tile')).find(e => e.textContent.includes(t));
              if (tile) tile.click();
            }, TITLES[NUM]);
            await sleep(2600);
            await shot(ck + '-after-refresh-resume');
            same = 0; lastKey = '';
          }
        }
        await sleep(700); break;
      default:
        note('STATE ' + st.kind + ' @ ' + ck + (st.text ? ' :: ' + st.text : ''));
        await sleep(800);
    }
  }

  /* final XP + record */
  const xp = await page.evaluate(() => window.App && window.App.state ? Number(window.App.state.xp) : -1);
  note('\nFINAL XP: ' + xp);
  note('TURNS: ' + turns + '  (reported, asserted by nothing — DFM 199: this is the walker\'s own ' +
    'loop counter and it counts the passes where it waits for an animation)');
  note('CONSOLE ERRORS: ' + (errs.length ? '\n' + errs.join('\n') : 'none'));

  /* ---- THE GATE (DFM 199): only what holds steady ---- */
  /* CONTROL (DFM 146a/196): a gate nobody has ever seen fail is a decoration.
     KS3DT_CONTROL=1 moves one expected number by one and the run MUST then
     fail — proof the counters are real and the comparison bites.
     Run it after any change here:  KS3DT_CONTROL=1 node sit-review.js 5   */
  const CONTROL = process.env.KS3DT_CONTROL === '1';
  const want = EXPECT[NUM] && (CONTROL
    ? Object.assign({}, EXPECT[NUM], { presses: EXPECT[NUM].presses + 1 })
    : EXPECT[NUM]);
  const got = { xp: xp, chunks: seen.chunks.size, presses: seen.presses, marks: seen.marks, badges: seen.badges };
  let bad = [];
  if (want) {
    Object.keys(want).forEach(k => {
      if (got[k] !== want[k]) bad.push(k + ': expected ' + want[k] + ', got ' + got[k]);
    });
  }
  if (errs.length) bad.push('console errors: expected none, got ' + errs.length);
  const line = 'SHAPE  xp=' + got.xp + '  screens=' + got.chunks + '  presses=' + got.presses +
    '  marking=' + got.marks + '  badges=' + got.badges + '  errors=' + errs.length;
  note(line);
  if (!want) note('(no pinned shape for lesson ' + NUM + ' — reported only)');
  else if (bad.length) {
    note('\nSIT-REVIEW ' + NUM + ': FAILED THE PINNED SHAPE');
    bad.forEach(b => note('  x ' + b));
  } else {
    note('\nSIT-REVIEW ' + NUM + ': the pinned shape holds — every number a pupil moves is exactly as expected.');
  }

  fs.writeFileSync(path.join(OUT, '_log.md'), log.join('\n'));
  await browser.close();
  console.log('\n' + line);
  if (bad.length) { bad.forEach(b => console.error('  x ' + b)); }
  console.log('DONE -> ' + OUT + '  (' + shotN + ' screenshots)');
  if (CONTROL) {
    if (bad.length) { console.log('CONTROL OK — a shape that is wrong by ONE press fails the gate.'); process.exit(0); }
    console.error('CONTROL FAILED — the gate did not notice a wrong number. It is decoration.');
    process.exit(1);
  }
  if (bad.length) process.exit(1);
})().catch(e => { console.error('DRIVER CRASH', e); process.exit(1); });
