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
const WALK = require('./lib/walk-moves.js');

const NUM = String(process.argv[2] || '2').replace(/^J([23])-/i, 'j$1-');
/* YEAR-QUALIFIED KEYS FROM 16 AUG 2026 (see sit-wrongpath.js for the reason J1
   keeps its bare-number legacy keys). `j2-1` is J2's Lesson 1; '1' is J1's. */
const YEAR = /^j2-/.test(NUM) ? 'j2' : /^j3-/.test(NUM) ? 'j3' : 'j1';
const CLASS = { j1: 'Demo-8A', j2: 'Demo-9A', j3: 'Demo-10A' }[YEAR];
const DEFAULT_WHO = { j1: 'anya', j2: 'aoife', j3: 'orla' }[YEAR];
const PUPIL_KEY = { anya: 'anya.murphy@demo', aoife: 'aoife.mcgrath@demo', orla: 'orla.mccann@demo' };
const PUPIL_NAME = { anya: 'Anya Murphy', aoife: 'Aoife McGrath', orla: 'Orla McCann' };
const WHO = process.argv[3] || DEFAULT_WHO;
/* the port is overridable so the SAME walker can be pointed at the build he
   sat (the DFM 196 worktree on :8097) without editing this file — comparing a
   number against a different build is how this round proves things. */
const HOST = process.env.KS3DT_BASE || 'http://localhost:8121';
const BASE = HOST + '/ks3-dt/platform/index.html?class=' + CLASS + '&as=';
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
/* Lessons 1, 2, 3 and the side quest joined this table on 14 Aug 2026, closing
   their COVERAGE_DEBT rows (DFM 221). Each number below was MEASURED on two
   independent clean runs against `4ab8208` and was identical both times — the
   only property DFM 199 asks of a pinned number. Nothing here is estimated.
   L1's Vault is walked with auto-pairing OFF (the solo path), which is the
   only single-pupil-deterministic route through a paired activity; the paired
   path is covered by its own two-browser harnesses. */
const EXPECT = {
  '1': { xp: 95, chunks: 10, presses: 17, marks: 33, badges: 5 },
  '2': { xp: 43, chunks: 9, presses: 14, marks: 7, badges: 2 },
  '3': { xp: 51, chunks: 8, presses: 12, marks: 8, badges: 3 },
  '4': { xp: 42, chunks: 6, presses: 8, marks: 7, badges: 1 },
  '5': { xp: 42, chunks: 10, presses: 17, marks: 7, badges: 4 },
  'S1': { xp: 30, chunks: 6, presses: 6, marks: 1, badges: 1 },
  /* J2 Lesson 1, pinned from a real run on 16 Aug 2026 — deterministic values
     only (DFM 199). The turn count is still reported, never asserted. */
  'j2-1': { xp: 83, chunks: 8, presses: 8, marks: 19, badges: 4 },
  /* J3 Lesson 1, pinned from a real run on 16 Aug 2026, identical on a second.
     The Compass is deterministic here because the walker always takes the FIRST
     side of each pair — a clean sweep, so the result card is the same every run
     (DFM 199: pin only what does not move). */
  'j3-1': { xp: 62, chunks: 8, presses: 8, marks: 21, badges: 4 }
};
const OUT = path.join('/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform',
  'qa-l2-l5-review', 'l' + NUM.toLowerCase() + (WHO === 'anya' ? '' : '-' + WHO));
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GHOST_WAIT = 420;

/* Lesson 1 joined this table on 14 Aug 2026, closing its COVERAGE_DEBT row
   (DFM 221). It was the last J1 lesson no expert walker had ever driven — it
   shipped before this file existed and was never retro-fitted. */
const TITLES = { '1': 'Mission Control', '2': 'Make It Move', '3': 'Scoreboard Engineer', '4': 'The Broken Game', '5': 'Game Studio', 'S1': 'Files That Follow You',
  'j2-1': 'Welcome to the Workshop', 'j3-1': 'The Studio Opens' };

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
  /* cara is the SECOND pupil in the paired Vault run and keeps anya's world;
     every other persona (including J2's aoife and J3's orla) starts clean. */
  if (WHO !== 'cara') await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate((seed) => {
    const TARGET_NUM = seed.target;
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {};
    db.locks[seed.cls] = db.locks[seed.cls] || {};
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks[seed.cls][n] = { u: now, on: 1 };
    db.cfg[seed.cls] = db.cfg[seed.cls] || {};
    db.cfg[seed.cls].pairing = { on: 0 };
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
    const pk = seed.cls + ':' + seed.key;
    db.pupils[pk] = Object.assign(
      db.pupils[pk] || { n: seed.name, cn: '', j: 1, xp: 0, g: '' }, { L });
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, { cls: CLASS, key: PUPIL_KEY[WHO] || (WHO + '@demo'), name: PUPIL_NAME[WHO] || WHO,
       target: NUM === 'S1' ? 'S1' : Number(String(NUM).replace(/^j[23]-/, '')) });
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

    /* THE DETECTOR LIVES IN lib/walk-moves.js — one home, both walkers.
       It used to live inline here, and the day capture-deck-shots needed the
       same knowledge it wrote its own dumber copy instead, could not drag, and
       shipped the Vault under three other screens' names (DFM 225b). The
       proof this extraction is faithful is this file's own pinned shape: if a
       single screen were now read differently, the end-of-run numbers move. */
    const st = await page.evaluate(WALK.detectKind);

    const key = ck + ':' + st.kind + ':' + (st.label || '');
    same = key === lastKey ? same + 1 : 0;
    lastKey = key;
    if (same > 45) { note('!! WALKER STUCK on ' + JSON.stringify(st) + ' @ ' + ck); await shot('STUCK-' + ck); break; }

    switch (st.kind) {
      case 'badge':
        /* THE GHOST GUARD APPLIES HERE TOO (found 16 Aug 2026, while pinning
           J2 Lesson 1). This was the one case that clicked without waiting, so
           the pop's own 350ms mount guard (DFM 104) swallowed the click, the
           pop was still on screen next turn, and the SAME badge was counted
           twice — J2 Lesson 1 reported five badges for four. A harness that
           inflates its own number and then pins it is DFM 146a's fault, and it
           would have baked the wrong shape in for ever. */
        await sleep(GHOST_WAIT);
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

      /* THE EXPERT INSPECTOR. She reads the room correctly: every station that
         really breaks a rule gets a flag and no station that does not. The
         zones' truth is read from the CLIENT'S OWN chunk config, never from a
         copy in this file — the walker must not hold its own idea of which
         station is wrong, or it would keep passing after the content moved.
         She also TAKES the optional Hard Inspection (this is the expert walk;
         the floor path that sets the §4b threshold is arithmetic, not a walk),
         so the skip button is deliberately never pressed here — sit-wrongpath
         is what stands on it. */
      case 'insp-scene': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-inspect-scene');
        const flagged = await page.evaluate(() => {
          const s = window.App.state;
          const ch = s.chunks[s.chunkIdx];
          const scenes = (ch.config || {}).scenes || [];
          const tab = (document.querySelector('.insp-tab') || {}).textContent || '';
          const sc = scenes.find(x => (x.tab || '') === tab) || scenes[0];
          let n = 0;
          (sc.zones || []).forEach((z, i) => {
            if (!z.breaks) return;
            const b = document.querySelector('.insp-zone[data-z="' + i + '"]');
            if (b) { b.click(); n++; }
          });
          return n;
        });
        note('INSPECT: flagged ' + flagged + ' station(s) @ ' + ck);
        await sleep(400);
        await shot(ck + '-inspect-flagged');
        await sleep(GHOST_WAIT);
        await page.evaluate(() => document.querySelector('.insp-file').click());
        await sleep(900); break;
      }

      /* THE EXPERT TAKES THE OPTIONAL WORK. sit-review is the best-path walk,
         so it presses "Give them a go" and answers the Senior Cases; the floor
         path that sets the §4b threshold is arithmetic, and the REFUSAL is what
         sit-wrongpath stands on. */
      case 'stretch-gate':
        await sleep(GHOST_WAIT);
        await shot(ck + '-stretch-gate');
        note('STRETCH OFFERED @ ' + ck + ' — the expert walk takes it');
        await page.evaluate(() => document.querySelector('.stretch-go').click());
        await sleep(900); break;

      case 'cmp-pick': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-compass-board');
        /* one side per row, deterministically the FIRST side, so the pinned
           shape does not move between runs (DFM 199) */
        const picked = await page.evaluate(() => {
          let n = 0;
          document.querySelectorAll('.cmp-row').forEach(r => {
            if (r.querySelector('.cmp-side.on')) return;
            const b = r.querySelector('.cmp-side'); if (b) { b.click(); n++; }
          });
          return n;
        });
        note('COMPASS: picked ' + picked + ' side(s) @ ' + ck);
        await sleep(400); break;
      }

      case 'cmp-settle':
        await sleep(GHOST_WAIT);
        await shot(ck + '-compass-ready');
        await page.evaluate(() => document.querySelector('.cmp-settle').click());
        await sleep(1400); break;

      case 'cmp-done': {
        await sleep(GHOST_WAIT);
        const lean = await page.evaluate(() => ((document.querySelector('.cmp-result h2') || {}).textContent || '').trim());
        note('COMPASS RESULT @ ' + ck + ': ' + lean);
        await shot(ck + '-compass-result');
        await page.evaluate(() => document.querySelector('.cmp-done').click());
        await sleep(900); break;
      }

      case 'insp-next': {
        await sleep(GHOST_WAIT);
        const score = await page.evaluate(() => ((document.querySelector('.insp-score') || {}).textContent || '').trim());
        note('INSPECT REPORT @ ' + ck + ': ' + score);
        await shot(ck + '-inspect-report');
        await page.evaluate(() => document.querySelector('.insp-next').click());
        await sleep(900); break;
      }

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

      /* ---- LESSON 1's VAULT (added 14 Aug 2026, DFM 221) ----
         The filing game is a real pointer DRAG, and its answer key never
         reaches the client in plaintext: the engine compares a salted hash
         (`vhash(salt|fileId|folderId) === check[fileId]`), and the packed
         content carries `keysEnc`, not `keys`. So the walker cannot look the
         answer up, and it does not need to: it tries the folders in DOM order
         and stops at the one the Vault accepts. That is DETERMINISTIC — the
         same order, the same content, the same result every run — which is the
         only property DFM 199 asks of a pinned number. A wrong drop is a real
         part of this activity (it bounces back and hands the controls over),
         so the walk exercises the reject path as well as the accept path. */
      case 'vault': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-vault-stage');
        const filed = await page.evaluate(async () => {
          const sleep2 = ms => new Promise(r => setTimeout(r, ms));
          const centre = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
          const drag = async (fileEl, folderEl) => {
            const a = centre(fileEl), b = centre(folderEl);
            const ev = (type, pt) => fileEl.dispatchEvent(new PointerEvent(type, {
              bubbles: true, cancelable: true, pointerId: 1, isPrimary: true,
              clientX: pt.x, clientY: pt.y
            }));
            /* setPointerCapture would redirect the later events to the node;
               the engine calls it, so a stub keeps the synthetic drag alive */
            if (!fileEl.setPointerCapture) fileEl.setPointerCapture = () => {};
            ev('pointerdown', a);
            await sleep2(30);
            ev('pointermove', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
            await sleep2(30);
            ev('pointermove', b);
            await sleep2(30);
            ev('pointerup', b);
            await sleep2(320);
          };
          const report = [];
          for (let guard = 0; guard < 40; guard++) {
            const file = document.querySelector('.chunk-host .vault-file:not(.filed)');
            if (!file) break;
            const folders = Array.from(document.querySelectorAll('.chunk-host .vault-folder'));
            if (!folders.length) break;
            let tries = 0, done = false;
            for (const fo of folders) {
              tries++;
              await drag(file, fo);
              if (file.classList.contains('filed')) {
                report.push((file.getAttribute('data-id') || '?') + '->' +
                  (fo.getAttribute('data-id') || '?') + ' on try ' + tries);
                done = true;
                break;
              }
            }
            if (!done) { report.push((file.getAttribute('data-id') || '?') + ' REFUSED BY EVERY FOLDER'); break; }
          }
          return report;
        });
        filed.forEach(f => note('VAULT: ' + f));
        await sleep(1200);
        await shot(ck + '-vault-filed');
        break;
      }

      /* Lesson 1's codename signing is a PRESS AND HOLD (rule 104's family:
         nobody signs by accident). A click does nothing at all, which is
         correct behaviour and was the second place this walk stopped. */
      case 'hold-sign': {
        await sleep(GHOST_WAIT);
        await shot(ck + '-oath');
        await page.evaluate(async () => {
          const sleep2 = ms => new Promise(r => setTimeout(r, ms));
          const b = document.querySelector('.chunk-host .oath-sign, .chunk-host .hold-btn, .chunk-host [class*="hold"]');
          if (!b) return;
          const r = b.getBoundingClientRect();
          const pt = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
          const ev = (t) => b.dispatchEvent(new PointerEvent(t, Object.assign({
            bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }, pt)));
          if (!b.setPointerCapture) b.setPointerCapture = () => {};
          ev('pointerdown');
          await sleep2(1800);          /* the hold is 1200ms; hold past it */
          ev('pointerup');
        });
        await sleep(2200);
        await shot(ck + '-signed');
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
  /* A WALK THAT REACHED NOTHING IS NEVER A PASS, WHATEVER THE PIN SAYS
     (16 Aug 2026, and it caught itself). J3 Lesson 1 was pinned with a
     placeholder of all zeros while its numbers were still being measured; the
     lesson then failed to open at all, the walker visited 0 screens, and the
     run printed "the pinned shape holds". A gate that agrees with a walk that
     never happened is DFM 204's exact sin, inside the harness that exists to
     enforce it. Coverage is asserted, never merely compared. */
  if (got.chunks === 0) bad.push('the walk reached 0 screens — the lesson never opened, so nothing was tested');
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
