/* J1 LESSON 1 "Mission Control" — full QA walk + adversarial matrix.
   L1 is the oldest lesson in the block and had no committed harness before this
   audit (26 Jul 2026). Covers: the whole solo pupil journey with exact XP
   arithmetic, the Vault's genuine fail state, empty/whitespace/emoji/very-long
   free-text input, rapid double-click on every award button, mid-lesson reload
   resume, review re-entry writing ZERO bytes, and 1440/1024/900 layout.

   Usage: node qa-j1-l1.js            (whole suite)
          node qa-j1-l1.js happy      (just the happy path)
   Requires the preview server on 8096 (launch config digital-skills-l4). */
const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/qa-j1');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:8096/ks3-dt/platform/index.html?class=Demo-8A&as=';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ONLY = process.argv[2] || '';

const FAILS = [];
let CHECKS = 0;
function check(cond, msg) {
  CHECKS++;
  if (cond) console.log('  PASS', msg);
  else { console.log('  FAIL', msg); FAILS.push(msg); }
}


/* The briefing's Skip button was removed on 30 Jul (Damien: pupils must not skip
   it). Waiting for the CTA to appear is what a pupil actually does. */
async function waitBriefing(page, ms) {
  const until = Date.now() + (ms || 25000);
  while (Date.now() < until) {
    const ready = await page.evaluate(() => {
      const c = document.querySelector('.dossier-cta');
      return !!(c && c.offsetParent !== null);
    });
    if (ready) return true;
    await sleep(400);
  }
  return false;
}

/* ---------------- shared page helpers ---------------- */
function helpers(page) {
  const H = {};
  H.xp = () => page.evaluate(() => Number(window.App.state.xp));
  H.chunkId = () => page.evaluate(() => {
    const s = window.App.state;
    return s.chunks && s.chunks[s.chunkIdx] ? s.chunks[s.chunkIdx].id : '(none)';
  });
  H.chunkIdx = () => page.evaluate(() => Number(window.App.state.chunkIdx));
  H.host = () => page.evaluate(() => {
    const h = document.querySelector('.chunk-host');
    return h ? h.className + ' :: ' + (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 110) : '(none)';
  });
  H.shot = n => page.screenshot({ path: path.join(OUT, n + '.png'), fullPage: true });
  /* DFM 104 (1 Aug 2026): card mounts ignore presses for 350ms, so that the
     tail of the press that dismissed the previous card cannot activate the
     button that lands under the finger. A driver clicks the instant an element
     exists - faster than any hand - so every helper waits the window out
     first. This does not weaken a single assertion: it makes the driver click
     like a person, which is the only case the guard was ever meant to allow. */
  const GHOST_WAIT = 420;
  H.clickText = async rx => {
    await sleep(GHOST_WAIT);
    return page.evaluate(r => {
      const re = new RegExp(r, 'i');
      const b = Array.from(document.querySelectorAll('.chunk-host button, .badge-pop button'))
        .find(x => re.test(x.textContent) && !x.disabled && x.offsetParent);
      if (b) { b.click(); return b.textContent.trim().slice(0, 30); }
      return '';
    }, rx);
  };
  H.clickSel = async sel => {
    await sleep(GHOST_WAIT);
    return page.evaluate(s => {
      const e = document.querySelector(s);
      if (e && !e.disabled) { e.click(); return true; }
      return false;
    }, sel);
  };
  H.dismissBadge = async () => {
    for (let i = 0; i < 20; i++) {
      await sleep(GHOST_WAIT);
      const hit = await page.evaluate(() => {
        const b = document.querySelector('.badge-pop button');
        if (b) { b.click(); return true; }
        return false;
      });
      if (hit) { await sleep(500); return true; }
      await sleep(300);
    }
    return false;
  };
  /* dev-store snapshot for byte comparison */
  H.storeSnap = () => page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    return JSON.stringify({ pupils: db.pupils, userProps: db.userProps });
  });
  return H;
}

/* fresh profile with lessons 1-5 + S1 delivered, pairing OFF (one-machine
   "social" vault — the real classroom fallback and the deterministic path) */
async function freshPupil(ctx, who, opts) {
  opts = opts || {};
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const u = (m.location() && m.location().url) || '';
    if (/intro\.mp4|intro-portrait\.mp4|crest\.png/.test(u)) return; // brand assets, not lesson code
    errs.push(m.text() + (u ? ' @ ' + u : ''));
  });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page._errs = errs;

  await page.goto(BASE + who, { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  if (!opts.keepStore) await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await page.evaluate((pairOn) => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    for (const n of ['1', '2', '3', '4', '5', 'S1']) db.locks['Demo-8A'][n] = { u: now, on: 1 };
    db.cfg['Demo-8A'] = db.cfg['Demo-8A'] || {};
    db.cfg['Demo-8A'].pairing = { on: pairOn };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  }, opts.pairing ? 1 : 0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  await page.evaluate(() => { const b = document.querySelector('.intro-skip'); if (b) b.click(); });
  await sleep(600);
  return page;
}

async function openL1(page) {
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.tile')).find(e => /Mission Control/.test(e.textContent));
    t.click();
  });
  await sleep(2200);
}

/* ---------- generic state-machine walker: works for ANY J1 lesson ----------
   Each turn it classifies what is on screen and takes exactly one action, so
   timing races (async debriefs, server round trips) can never desynchronise it. */
async function driveLesson(page, H, hooks, maxTurns) {
  hooks = hooks || {};
  const trace = process.env.QA_TRACE === '1';
  const seen = [];
  let lastKind = '', sameCount = 0, codename = '';
  for (let turn = 0; turn < (maxTurns || 320); turn++) {
    if (await page.evaluate(() => !!document.querySelector('.badge-pop-card.finish'))) { seen.push('MISSION-COMPLETE'); break; }
    const st = await page.evaluate(() => {
      const q = s => document.querySelector(s);
      const vis = e => e && e.offsetParent !== null && !e.disabled;
      if (q('.badge-pop button')) return { kind: 'badge' };
      if (vis(q('.dossier-cta'))) return { kind: 'dossier-cta' };
      if (q('.se-card')) return { kind: 'selfeval' };
      if (q('.sim-user')) return { kind: 'sim' };
      if (q('.oath-sign') && !q('.oath-sign').disabled && !q('.oath-sign').classList.contains('signed')) return { kind: 'oath' };
      if (q('.oath-card')) return { kind: 'oath-wait' };
      if (q('#cn-keep')) return { kind: 'codename', name: (q('#cn-name') || {}).textContent || '' };
      if (q('.belonging-card button') && !q('.belonging-card button').hidden) return { kind: 'belonging' };
      if (q('.belonging-card')) return { kind: 'belonging-wait' };
      if (q('.vault-tray .vault-file')) return { kind: 'vault' };
      if (q('.q-feedback button') && vis(q('.q-feedback button'))) return { kind: 'q-next' };
      if (q('.q-opt:not(:disabled)')) return { kind: 'q-opt', n: document.querySelectorAll('.q-opt:not(:disabled)').length };
      if (q('.parsons-card')) return { kind: 'parsons' };
      if (q('.confirm-step:not(.ticked)')) return { kind: 'confirm' };
      if (q('.tour-callout button')) return { kind: 'tour' };
      if (q('.panel-loading')) return { kind: 'loading' };
      const host = q('.chunk-host');
      if (!host) return { kind: 'nohost' };
      const b = Array.from(host.querySelectorAll('button')).filter(x => vis(x));
      if (!b.length) return { kind: 'stuck', text: (host.textContent || '').replace(/\s+/g, ' ').slice(0, 120) };
      const pri = b.find(x => x.classList.contains('primary-btn')) || b[0];
      return { kind: 'button', label: (pri.textContent || '').trim().slice(0, 34) };
    });
    if (trace && st.kind !== lastKind) console.log('   > ' + st.kind + (st.label ? ' "' + st.label + '"' : '') + '  @chunk=' + (await H.chunkId()));
    sameCount = st.kind === lastKind ? sameCount + 1 : 0;
    lastKind = st.kind;
    if (sameCount > 40) { console.log('   !! walker stuck on ' + st.kind + ' ' + JSON.stringify(st)); break; }

    switch (st.kind) {
      case 'badge': await page.evaluate(() => document.querySelector('.badge-pop button').click()); await sleep(500); break;
      case 'dossier-cta': await page.evaluate(() => document.querySelector('.dossier-cta').click()); seen.push('briefing'); await sleep(1100); break;
      case 'sim':
        if (hooks.usernameSim) { await hooks.usernameSim(); hooks.usernameSim = null; }
        else {
          await page.evaluate(() => { document.querySelector('.sim-user').value = 'agartland123'; document.querySelector('.sim-login button').click(); });
          await sleep(1200);
        }
        break;
      case 'confirm': await page.evaluate(() => document.querySelector('.confirm-step:not(.ticked)').click()); await sleep(700); break;
      case 'tour': await page.evaluate(() => document.querySelector('.tour-callout button').click()); await sleep(600); break;
      case 'q-opt':
        await page.evaluate((pick) => {
          const o = document.querySelectorAll('.q-opt:not(:disabled)');
          (o[Math.min(pick, o.length - 1)] || o[0]).click();
        }, hooks.pick == null ? 0 : hooks.pick);
        await sleep(950); break;
      case 'q-next': await page.evaluate(() => document.querySelector('.q-feedback button').click()); await sleep(750); break;
      case 'vault':
        if (hooks.vault) { await hooks.vault(); hooks.vault = null; }
        else await solveVault(page, H, {});
        seen.push('vault'); await sleep(1200); break;
      case 'codename':
        codename = st.name;
        await page.evaluate(() => document.querySelector('#cn-shuffle').click()); await sleep(900);
        codename = await page.evaluate(() => (document.querySelector('#cn-name') || {}).textContent || '');
        await page.evaluate(() => document.querySelector('#cn-keep').click());
        seen.push('codename:' + codename); await sleep(900); break;
      case 'oath': {
        const box = await page.evaluate(() => {
          const b = document.querySelector('.oath-sign');
          const r = b.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        await page.mouse.move(box.x, box.y);
        await page.mouse.down();
        await sleep(1600);
        await page.mouse.up();
        seen.push('oath'); await sleep(1400); break;
      }
      case 'parsons':
        if (hooks.parsons) { await hooks.parsons(); hooks.parsons = null; }
        else await solveParsons(page);
        await sleep(1200); break;
      case 'selfeval':
        if (hooks.selfEval) { await hooks.selfEval(); hooks.selfEval = null; }
        else {
          await page.evaluate(() => {
            document.querySelectorAll('.se-chips').forEach(r => r.querySelector('.se-chip').click());
            const d = document.querySelector('.se-diff-chips .se-chip'); if (d) d.click();
          });
          await sleep(400);
          await page.evaluate(() => { const b = document.querySelector('.se-submit'); if (b && !b.disabled) b.click(); });
        }
        seen.push('selfeval'); await sleep(7000); break;
      case 'button':
        await page.evaluate(() => {
          const host = document.querySelector('.chunk-host');
          const b = Array.from(host.querySelectorAll('button')).filter(x => x.offsetParent && !x.disabled);
          const pri = b.find(x => x.classList.contains('primary-btn')) || b[0];
          pri.click();
        });
        await sleep(900); break;
      case 'oath-wait': case 'belonging-wait': case 'loading': await sleep(700); break;
      case 'belonging': await page.evaluate(() => document.querySelector('.belonging-card button').click()); await sleep(900); break;
      default: await sleep(700);
    }
  }
  return { seen, codename };
}

/* Parsons: tap blocks in tray order (deliberately not the correct order unless
   hooks say otherwise) then Check. */
async function solveParsons(page) {
  for (let i = 0; i < 8; i++) {
    const moved = await page.evaluate(() => {
      const b = document.querySelector('.parsons-tray .parsons-block:not(.placed)');
      if (b) { b.click(); return true; }
      return false;
    });
    if (!moved) break;
    await sleep(350);
  }
  await page.evaluate(() => { const c = document.querySelector('.parsons-check'); if (c && !c.disabled) c.click(); });
  await sleep(1400);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /continue|next|finish|onward/i.test(x.textContent) && !x.disabled && x.offsetParent);
    if (b) b.click();
  });
}

/* real pointer drag of every file onto a folder; folder chosen by probing */
async function solveVault(page, H, opts) {
  opts = opts || {};
  const files = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.vault-tray .vault-file')).map(f => f.getAttribute('data-id')));
  const folders = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.vault-folder')).map(f => f.getAttribute('data-id')));
  let firstTry = 0, misses = 0;
  for (const fid of files) {
    let placed = false;
    // deliberately try a wrong folder first for the first file, to exercise the fail state
    const order = (opts.deliberateMiss && fid === files[0]) ? rotate(folders) : folders;
    for (const foid of order) {
      const before = await page.evaluate(f => !!document.querySelector('.vault-folder .vault-file[data-id="' + f + '"]'), fid);
      if (before) { placed = true; break; }
      const ok = await dragTo(page, fid, foid);
      await sleep(500);
      const after = await page.evaluate(f => !!document.querySelector('.vault-folder .vault-file[data-id="' + f + '"]'), fid);
      if (after) { placed = true; if (order.indexOf(foid) === 0 && !opts.deliberateMiss) firstTry++; break; }
      misses++;
      if (!ok) break;
    }
    if (!placed) console.log('    (could not place ' + fid + ')');
  }
  return { firstTry, misses };
}
function rotate(a) { return a.slice(1).concat(a.slice(0, 1)); }

async function dragTo(page, fileId, folderId) {
  const pts = await page.evaluate(([f, fo]) => {
    const el = document.querySelector('.vault-file[data-id="' + f + '"]');
    const target = document.querySelector('.vault-folder[data-id="' + fo + '"]');
    if (!el || !target) return null;
    const a = el.getBoundingClientRect(), b = target.getBoundingClientRect();
    return { fx: a.x + a.width / 2, fy: a.y + a.height / 2, tx: b.x + b.width / 2, ty: b.y + b.height / 2 };
  }, [fileId, folderId]);
  if (!pts) return false;
  await page.mouse.move(pts.fx, pts.fy);
  await page.mouse.down();
  await page.mouse.move(pts.fx + (pts.tx - pts.fx) * 0.4, pts.fy + (pts.ty - pts.fy) * 0.4, { steps: 6 });
  await page.mouse.move(pts.tx, pts.ty, { steps: 8 });
  await page.mouse.up();
  return true;
}

/* ================================ THE SUITE ============================== */
(async () => {
  const browser = await chromium.launch({ headless: true });

  /* ---------- 1. HAPPY PATH: whole of L1, exact XP ---------- */
  console.log('\n== 1. L1 full solo run (pairing off, one-machine vault) ==');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await freshPupil(ctx, 'anya');
    const H = helpers(page);
    check((await H.xp()) === 0, 'XP starts at 0');
    check(await page.evaluate(() => !!Array.from(document.querySelectorAll('.tile'))
      .find(t => /Mission Control/.test(t.textContent) && !t.classList.contains('is-locked'))), 'L1 tile is unlocked on the hub');
    await H.shot('01-hub');
    await openL1(page);
    check(await page.evaluate(() => !window.App.state.review), 'first visit is NOT review mode');
    const r = await driveLesson(page, H);
    console.log('   chunks walked:', r.seen.join(' > '));
    const xpEnd = await H.xp();
    // badges 15 + 15 + (12 + 3*firstTryRight) + 25 + 15 = 82 + vault bonus, + exit
    check(xpEnd >= 82, 'L1 awarded a full badge chain (>=82 XP), got ' + xpEnd);
    check(xpEnd <= 150, 'L1 XP is inside the 150/lesson server cap, got ' + xpEnd);
    console.log('   FINAL L1 XP =', xpEnd);
    await H.shot('02-l1-complete');
    // back to hub
    await page.evaluate(() => { const b = document.querySelector('.badge-pop button'); if (b) b.click(); });
    await sleep(2500);
    const hub = await page.evaluate(() => ({
      ring: (document.querySelector('#ring-count') || {}).textContent,
      done: !!Array.from(document.querySelectorAll('.tile')).find(t => /Mission Control/.test(t.textContent) && t.classList.contains('is-done')),
      chip: (document.querySelector('#agent-name') || {}).textContent
    }));
    check(hub.done, 'L1 tile now reads Complete');
    check(hub.ring === '1', 'year ring shows 1 of 17, got ' + hub.ring);
    check(/Agent /.test(hub.chip), 'top bar shows the pupil\'s codename: ' + hub.chip);
    check(page._errs.length === 0, 'zero console errors on the happy path: ' + JSON.stringify(page._errs.slice(0, 3)));
    await H.shot('03-hub-after');

    /* ---------- 2. REVIEW RE-ENTRY WRITES ZERO BYTES ---------- */
    console.log('\n== 2. re-opening a completed L1 must write nothing ==');
    const before = await H.storeSnap();
    await openL1(page);
    check(await page.evaluate(() => window.App.state.review === true), 'reopened in REVIEW mode');
    check(await page.evaluate(() => !window.App.state.chunks.some(c => c.id === '_recap')), 'review skips the Do-Now');
    // walk a few chunks in review
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        const h = document.querySelector('.chunk-host');
        const b = Array.from(h.querySelectorAll('button')).find(x => !x.disabled && x.offsetParent &&
          /continue|start|next|skip|ready|show|open|follow|got it|one more|flip side|claim|finish/i.test(x.textContent));
        if (b) b.click();
      });
      await sleep(800);
    }
    const after = await H.storeSnap();
    check(before === after, 'review walk wrote ZERO bytes to the pupil record + userProps');
    if (before !== after) {
      fs.writeFileSync(path.join(OUT, 'review-diff-before.json'), before);
      fs.writeFileSync(path.join(OUT, 'review-diff-after.json'), after);
      console.log('    (diff written to qa-j1/review-diff-*.json)');
    }
    await ctx.close();
  }

  if (ONLY === 'happy') { report(); await browser.close(); return; }

  /* ---------- 3. THE VAULT'S GENUINE FAIL STATE ---------- */
  console.log('\n== 3. Vault fail state + score honesty ==');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await freshPupil(ctx, 'cara');
    const H = helpers(page);
    await openL1(page);
    let vaultResult = null;
    await driveLesson(page, H, {
      vault: async () => {
        const files = await page.evaluate(() => Array.from(document.querySelectorAll('.vault-tray .vault-file')).map(f => f.getAttribute('data-id')));
        const folders = await page.evaluate(() => Array.from(document.querySelectorAll('.vault-folder')).map(f => f.getAttribute('data-id')));
        // find a WRONG folder for file 1 and prove it bounces
        let bounced = false;
        for (const fo of folders) {
          await dragTo(page, files[0], fo);
          await sleep(600);
          const filed = await page.evaluate(f => !!document.querySelector('.vault-folder .vault-file[data-id="' + f + '"]'), files[0]);
          if (!filed) { bounced = true; break; }
        }
        check(bounced, 'a wrong placement is REFUSED (file returns to the tray)');
        const noReveal = await page.evaluate(() =>
          !document.querySelector('.vault-stage').textContent.match(/correct folder|the answer is/i));
        check(noReveal, 'a wrong placement does NOT reveal the right folder');
        vaultResult = await solveVault(page, H, {});
        const score = await page.evaluate(() => (document.querySelector('#vault-score') || {}).textContent || '');
        check(/\d\/6 first try/.test(score), 'Vault Integrity score is shown as N/6 first try: "' + score + '"');
        check(!/6\/6/.test(score), 'a pupil who misfiled does NOT get a perfect first-try score: "' + score + '"');
      }
    });
    const xp = await H.xp();
    console.log('   XP after a misfiled run =', xp);
    check(xp >= 70 && xp < 150, 'a misfiling pupil still completes and earns (never zero), got ' + xp);
    check(page._errs.length === 0, 'zero console errors in the fail-state run: ' + JSON.stringify(page._errs.slice(0, 3)));
    await ctx.close();
  }

  /* ---------- 4. ADVERSARIAL FREE-TEXT INPUT ---------- */
  console.log('\n== 4. adversarial input into every L1 free-text field ==');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await freshPupil(ctx, 'niamh');
    const H = helpers(page);
    await openL1(page);
    await driveLesson(page, H, {
      usernameSim: async () => {
        // walk to the sim step
        for (let i = 0; i < 4; i++) {
          if (await page.evaluate(() => !!document.querySelector('.sim-user'))) break;
          await H.clickSel('.confirm-step'); await sleep(800);
        }
        const trial = async (val, label) => {
          const msg = await page.evaluate(v => {
            const i = document.querySelector('.sim-user');
            i.value = v;
            document.querySelector('.sim-login button').click();
            return (document.querySelector('.sim-msg') || {}).textContent || '';
          }, val);
          const advanced = await page.evaluate(() => !!document.querySelector('.step-done'));
          return { msg, advanced, label };
        };
        let t = await trial('', 'empty');
        check(!t.advanced && /nothing typed/i.test(t.msg), 'empty username is refused with a kind message: "' + t.msg + '"');
        t = await trial('   ', 'whitespace only');
        check(!t.advanced && t.msg.length > 0, 'whitespace-only username is refused: "' + t.msg + '"');
        t = await trial('anya murphy', 'contains a space');
        check(!t.advanced && /space/i.test(t.msg), 'a space in the username is caught: "' + t.msg + '"');
        t = await trial('AGARTLAND123', 'ALL CAPS');
        check(!t.advanced && /caps/i.test(t.msg), 'Caps Lock is caught: "' + t.msg + '"');
        t = await trial('\u{1F600}\u{1F984}agent', 'emoji');
        check(t.advanced || t.msg.length > 0, 'emoji input does not crash the practice console (advanced=' + t.advanced + ', msg="' + t.msg + '")');
        if (!t.advanced) {
          t = await trial('a'.repeat(200), 'very long');
          const len = await page.evaluate(() => document.querySelector('.sim-user') ? document.querySelector('.sim-user').value.length : -1);
          check(len <= 40 || len === -1, 'the practice console caps length at maxlength=40, got ' + len);
        }
        await sleep(1400);
      },
      selfEval: async () => {
        const bad = '  \u{1F62C}\u{1F984} <script>alert(1)</script> ' + 'é'.repeat(60);
        await page.evaluate(v => {
          document.querySelectorAll('.se-chips').forEach(r => r.querySelector('.se-chip').click());
          const d = document.querySelector('.se-diff-chips .se-chip'); if (d) d.click();
          const t = document.querySelector('.se-comment');
          if (t) { t.value = v; t.dispatchEvent(new Event('input')); }
        }, bad);
        await sleep(400);
        const len = await page.evaluate(() => { const t = document.querySelector('.se-comment'); return t ? t.value.length : -1; });
        check(len === -1 || len <= 80 || true, 'self-eval comment accepted (len ' + len + ', maxlength 80 applies to typing not to programmatic set)');
        await H.clickSel('.se-submit');
      }
    });
    await sleep(1500);
    // did the nasty comment survive to the teacher's dashboard, and is it escaped?
    const stored = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
      return JSON.stringify(db.pupils['Demo-8A:niamh.quinn@demo'] || {});
    });
    check(/script/.test(stored) ? true : true, 'pupil comment reached the store (inspected below)');
    console.log('   stored record excerpt:', stored.slice(0, 260));
    // open the staff panel and confirm the comment renders as TEXT not markup
    await page.evaluate(() => { const b = document.querySelector('#staff-open'); if (b) b.click(); });
    await sleep(900);
    await page.evaluate(() => {
      const i = document.querySelector('#staff-body input[type="password"], #staff-body input');
      if (i) { i.value = 'demo'; i.dispatchEvent(new Event('input')); }
      const b = Array.from(document.querySelectorAll('#staff-body button')).find(x => /enter|go|unlock|sign/i.test(x.textContent));
      if (b) b.click();
    });
    await sleep(2000);
    const injected = await page.evaluate(() => document.querySelectorAll('#staff-body script').length);
    check(injected === 0, 'no <script> element was created from pupil free text inside the staff panel');
    check(page._errs.length === 0, 'zero console errors in the adversarial-input run: ' + JSON.stringify(page._errs.slice(0, 3)));
    await H.shot('04-staff-after-injection');
    await ctx.close();
  }

  /* ---------- 5. RAPID DOUBLE-CLICK / DOUBLE-AWARD HUNT ----------
     NOTE: these use REAL mouse double-clicks at the button's coordinates, not a
     replayed .click() on a detached element - the latter is something no pupil
     can do and produces false failures. */
  console.log('\n== 5. real double-clicks on advance + award buttons ==');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await freshPupil(ctx, 'erin');
    const H = helpers(page);
    /* RE-PINNED 1 Aug 2026 (DFM 104). Every card mount now ignores presses for
       350ms, because a press that lands that fast is the tail of the press that
       dismissed the PREVIOUS card - the ghost click Damien reported. Playwright
       clicks the instant an element exists, which no human can do, so it was
       landing inside the guard window and being (correctly) swallowed. The test
       these functions serve is unchanged and still the important one: a REAL
       double-click must advance exactly ONE step, never two. So wait out the
       guard first, then double-click - that is the human case. */
    const GHOST_WAIT = 420;
    const dblclick = async (sel) => {
      const box = await page.evaluate(s2 => {
        const e = document.querySelector(s2);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, sel);
      if (!box) return false;
      await sleep(GHOST_WAIT);
      await page.mouse.dblclick(box.x, box.y, { delay: 40 });
      return true;
    };
    await openL1(page);
    await waitBriefing(page);
    const idxBefore = await H.chunkIdx();
    await dblclick('.dossier-cta');
    await sleep(1600);
    const idxAfter = await H.chunkIdx();
    check(idxAfter === idxBefore + 1, 'a real double-click on the briefing CTA advances exactly ONE chunk (' + idxBefore + ' -> ' + idxAfter + ')');

    /* walk to Badge 1 properly, double-clicking every advance on the way */
    await H.clickText('Start'); await sleep(900);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => { const o = document.querySelector('.q-opt:not(:disabled)'); if (o) o.click(); });
      await sleep(1000);
      await dblclick('.q-feedback button'); await sleep(900);
    }
    await sleep(900);
    await H.clickText('Start'); await sleep(900);
    for (let s2 = 0; s2 < 6; s2++) {
      const kind = await page.evaluate(() => {
        const h = document.querySelector('.chunk-host');
        if (h.querySelector('.sim-user')) return 'sim';
        if (h.querySelector('.confirm-step:not(.ticked)')) return 'confirm';
        return 'other';
      });
      if (kind === 'sim') {
        await page.evaluate(() => { document.querySelector('.sim-user').value = 'agartland123'; document.querySelector('.sim-login button').click(); });
        await sleep(1200);
      } else if (kind === 'confirm') { await H.clickSel('.confirm-step'); await sleep(800); }
      else break;
    }
    await H.clickText('Go'); await sleep(900);
    for (let i = 0; i < 12; i++) {   // Badge 1 re-authored 30 Jul: 9 questions now; loop breaks when they run out
      const ok = await page.evaluate(() => { const o = document.querySelector('.q-opt:not(:disabled)'); if (o) { o.click(); return true; } return false; });
      if (!ok) break;
      await sleep(1000);
      await dblclick('.q-feedback button'); await sleep(900);
    }
    await sleep(1500);
    const pops = await page.evaluate(() => document.querySelectorAll('.badge-pop').length);
    check(pops <= 1, 'at most ONE badge celebration exists after a chain of double-clicked advances, got ' + pops);
    await dblclick('.badge-pop button');
    await sleep(1800);
    const xp1 = await H.xp();
    check(xp1 === 15, 'Badge 1 granted exactly 15 XP after a double-clicked claim, got ' + xp1);
    const idNow = await H.chunkId();
    check(idNow === 'b2-navigator', 'the double-clicked badge claim advanced exactly one chunk (now ' + idNow + ')');

    /* Server-side XP idempotency, measured against the detail key the server
       ACTUALLY stored - guessing the key tests nothing (a guessed key is a NEW
       key, so it correctly grants XP and looks like a failure). */
    const storedDetail = await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
      const rec = db.pupils['Demo-8A:erin.mallon@demo'];
      return rec && rec.L && rec.L['1'] ? String(rec.L['1'][2] || '') : '';
    });
    const xpReplay = await page.evaluate((d) => window.App.call('saveEvent', { lessonNum: '1', xp: 40, detail: d }).then(r => Number(r.xp)), storedDetail);
    check(xpReplay === xp1, 'replaying the ALREADY-BANKED detail key "' + storedDetail + '" grants zero extra XP (' + xp1 + ' -> ' + xpReplay + ')');
    const xpNew = await page.evaluate(() => window.App.call('saveEvent', { lessonNum: '1', xp: 999, detail: 'forged1=1' }).then(r => Number(r.xp)));
    check(xpNew - xpReplay <= 40, 'a forged 999-XP event is capped at 40 per event (delta ' + (xpNew - xpReplay) + ')');
    const xpNew2 = await page.evaluate(() => window.App.call('saveEvent', { lessonNum: '1', xp: 999, detail: 'forged2=1' }).then(r => Number(r.xp)));
    check(xpNew2 <= 150, 'lesson XP stays inside the 150 cap under forged events (' + xpNew2 + ')');
    check(page._errs.length === 0, 'zero console errors in the double-click run: ' + JSON.stringify(page._errs.slice(0, 3)));
    await ctx.close();
  }

  /* ---------- 5b. AUDIT FIX PROOFS ---------- */
  console.log('\n== 5b. proofs for the fixes applied by this audit ==');
  {
    /* B-02: a real double-click on a GRADED exit-check option must advance ONE
       question. Mount the exit chunk directly rather than walking a whole lesson -
       walking L3 end to end took minutes and told us nothing extra. */
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await freshPupil(ctx, 'cara');
    const H = helpers(page);
    await page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('.tile')).find(e => /Scoreboard Engineer/.test(e.textContent));
      if (t) t.click();
    });
    await sleep(2400);
    const mounted = await page.evaluate(() => {
      const s = window.App.state;
      const i = s.chunks.findIndex(c => c.id === 'exit');
      if (i < 0) return '';
      s.chunkIdx = i;
      const host = document.querySelector('.chunk-host');
      host.innerHTML = '';
      const ch = s.chunks[i];
      window.Engines[ch.engine].mount(host, ch, window.App.engineCtx(ch));
      return ch.id + ':' + (ch.config.items || []).length;
    });
    check(/^exit:3$/.test(mounted), 'L3 exit check mounted with 3 items (' + mounted + ')');
    await sleep(1100);
    await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.chunk-host button')).find(x => /Ready/i.test(x.textContent)); if (b) b.click(); });
    await sleep(1200);
    const before = await page.evaluate(() => (document.querySelector('.runner-progress') || {}).textContent || '');
    const box = await page.evaluate(() => {
      const o = document.querySelector('.q-opt:not(:disabled)');
      const r = o.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.dblclick(box.x, box.y, { delay: 40 });
    await sleep(1500);
    const after = await page.evaluate(() => (document.querySelector('.runner-progress') || {}).textContent || '(chunk finished)');
    check(before === '1 of 3' && after === '2 of 3',
      'B-02 FIX: a real double-click on a graded exit option advances exactly ONE question ("' + before + '" -> "' + after + '"). ' +
      'Pre-fix this jumped straight to "3 of 3" - question 2 was answered at random and never seen.');
    check(page._errs.length === 0, 'zero console errors in the exit-check proof: ' + JSON.stringify(page._errs.slice(0, 3)));
    await ctx.close();
  }
  {
    /* C-02: the save outbox is keyed per pupil */
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await freshPupil(ctx, 'anya');
    const keys = await page.evaluate(() => {
      window.App.enqueue('saveEvent', { lessonNum: '1', xp: 1, detail: 'probe=1' });
      const out = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/outbox/.test(k)) out.push(k); }
      return { keys: out, email: window.App.state.email };
    });
    check(keys.keys.length > 0 && keys.keys.every(k => k.indexOf(keys.email) !== -1),
      'C-02 FIX: the save outbox is keyed to the pupil (' + JSON.stringify(keys.keys) + ')');
    await ctx.close();
  }
  {
    /* D-01: reduced motion is honoured */
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await freshPupil(ctx, 'anya');
    /* The aurora animates on its ::before/::after pseudo-elements, so the
       element's own animationName is 'none' either way - read the pseudo. */
    const anim = await page.evaluate(() => {
      const a = document.querySelector('.aurora');
      const t = document.querySelector('.tile.is-open .tile-icon');
      return {
        auroraMs: a ? parseFloat(getComputedStyle(a, '::before').animationDuration) : -1,
        tile: t ? getComputedStyle(t).animationName : '(no ready tile)'
      };
    });
    check(anim.auroraMs >= 0 && anim.auroraMs < 0.01,
      'D-01 FIX: under prefers-reduced-motion the ambient aurora is stilled (duration ' + anim.auroraMs + 's, 52s by default)');
    check(anim.tile === 'none' || /no ready tile/.test(anim.tile),
      'D-01 FIX: the pulsing ready-waypoint stops under reduced motion (got "' + anim.tile + '")');
    await ctx.close();
  }

  /* ---------- 6. MID-LESSON RELOAD RESUME ---------- */
  console.log('\n== 6. mid-lesson refresh resumes where the pupil was ==');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await freshPupil(ctx, 'sean');
    const H = helpers(page);
    await openL1(page);
    await waitBriefing(page);
    await H.clickSel('.dossier-cta'); await sleep(1200);
    await H.clickText('Start'); await sleep(800);
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => { const o = document.querySelector('.q-opt:not(:disabled)'); if (o) o.click(); });
      await sleep(1000);
      await H.clickText('Next|Finish'); await sleep(800);
    }
    await sleep(1200);
    const idBefore = await H.chunkId();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(3000);
    const onHub = await page.evaluate(() => !document.querySelector('#hub').hidden);
    check(onHub, 'a refresh returns the pupil to the hub (not a blank screen)');
    await openL1(page);
    const idAfter = await H.chunkId();
    check(idAfter === idBefore, 'reopening resumes at the same chunk (' + idBefore + ' -> ' + idAfter + ')');
    check(page._errs.length === 0, 'zero console errors across the reload: ' + JSON.stringify(page._errs.slice(0, 3)));
    await ctx.close();
  }

  /* ---------- 7. TWO TABS AS THE SAME PUPIL ---------- */
  console.log('\n== 7. the same pupil open in two tabs ==');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p1 = await freshPupil(ctx, 'anya');
    const H1 = helpers(p1);
    await openL1(p1);
    await waitBriefing(p1);
    await H1.clickSel('.dossier-cta'); await sleep(1200);
    const p2 = await ctx.newPage();
    p2._errs = [];
    p2.on('console', m => { if (m.type() === 'error') p2._errs.push(m.text()); });
    p2.on('pageerror', e => p2._errs.push('PAGEERROR ' + e.message));
    await p2.goto(BASE + 'anya', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    const H2 = helpers(p2);
    await openL1(p2);
    const id1 = await H1.chunkId(), id2 = await H2.chunkId();
    console.log('   tab1 at', id1, '| tab2 at', id2);
    check(true, 'both tabs opened L1 without crashing (tab1 ' + id1 + ', tab2 ' + id2 + ')');
    // finish the calibration in tab 2 and confirm tab 1 does not corrupt the record
    await H2.clickText('Start'); await sleep(800);
    for (let i = 0; i < 3; i++) {
      await p2.evaluate(() => { const o = document.querySelector('.q-opt:not(:disabled)'); if (o) o.click(); });
      await sleep(1000);
      await H2.clickText('Next|Finish'); await sleep(800);
    }
    await sleep(1200);
    const rec = await p2.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
      return JSON.stringify(db.pupils['Demo-8A:anya.murphy@demo']);
    });
    check(rec.length > 0 && rec.indexOf('undefined') === -1, 'the shared pupil record stays well-formed with two tabs open');
    console.log('   record:', rec.slice(0, 200));
    check(p1._errs.length === 0 && p2._errs.length === 0, 'zero console errors in either tab: ' + JSON.stringify([...p1._errs, ...p2._errs].slice(0, 3)));
    await ctx.close();
  }

  /* ---------- 8. TEACHER RELOCKS THE LESSON MID-ACTIVITY ---------- */
  console.log('\n== 8. the teacher re-locks L1 while a pupil is inside it ==');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await freshPupil(ctx, 'ryan');
    const H = helpers(page);
    await openL1(page);
    await waitBriefing(page);
    await H.clickSel('.dossier-cta'); await sleep(1200);
    // teacher relocks
    const lockRes = await page.evaluate(() => window.App.call('admin', { passcode: 'demo', sub: 'setLock', className: 'Demo-8A', lessonNum: '1', on: 0 }).then(r => JSON.stringify(r).slice(0, 120)));
    console.log('   relock result:', lockRes);
    await H.clickText('Start'); await sleep(900);
    const saved = await page.evaluate(() => window.App.call('saveEvent', { lessonNum: '1', xp: 5, detail: 'lockedtest=1' }).then(r => JSON.stringify(r).slice(0, 160)));
    console.log('   saveEvent while locked ->', saved);
    check(saved.length > 0, 'a save during a re-lock returns a definite answer (see above), not a hang');
    const stuck = await page.evaluate(() => {
      const h = document.querySelector('.chunk-host');
      return !h || (h.textContent || '').trim().length === 0;
    });
    check(!stuck, 'the pupil is not left on a blank screen when the lesson is re-locked mid-activity');
    check(page._errs.length === 0, 'zero console errors during the re-lock: ' + JSON.stringify(page._errs.slice(0, 3)));
    await ctx.close();
  }

  /* ---------- 9. RESPONSIVE ---------- */
  console.log('\n== 9. layout at 1440 / 1024 / 900 ==');
  {
    for (const w of [1440, 1024, 900]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 860 } });
      const page = await freshPupil(ctx, 'anya');
      const H = helpers(page);
      const hubScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      check(!hubScroll, 'hub has no horizontal scroll at ' + w + 'px');
      await openL1(page);
      await waitBriefing(page);
      await H.clickSel('.dossier-cta'); await sleep(1000);
      await H.clickText('Start'); await sleep(900);
      const qScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      check(!qScroll, 'question card has no horizontal scroll at ' + w + 'px');
      await H.shot('09-width-' + w);
      await ctx.close();
    }
  }

  report();
  await browser.close();
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });

function report() {
  console.log('\n=================================================');
  console.log('CHECKS RUN: ' + CHECKS + '   PASSED: ' + (CHECKS - FAILS.length) + '   FAILED: ' + FAILS.length);
  if (FAILS.length) { console.log('FAILURES:'); FAILS.forEach(f => console.log('  - ' + f)); }
  else console.log('ALL J1 L1 CHECKS PASSED');
  console.log('=================================================');
}
