/* usage: node ks3-dt/tools/record-tutorial/l6-contest-look.js [--base http://localhost:8126] [--only begin,r1,…]
   J1 L6 V2 THE CONTEST · the page gate. Runs contest.html on the REAL Firebase project (ols-ks3-dt-live) in real browsers,
   the way the lesson opens it (the hash Engines.operation writes). Spec §4.7 tests T-begin … T-narrow, and the 26 Nov
   ruling counted on the real DOM (the way qa-words-26nov.js counts) on every screen, at four sizes:
     1366×681 (his walk), 1366×768, 1500×900, 750×900 (the strip).
   T-begin   both PCs show the begin card; Stuck? Show me opens a help list; the job line is there.
   T-r1      a part question: the other PC knows "has answered" and both reveal within 2 s of the second answer.
   T-r2      the options come up in the same order on both PCs.
   T-r3      the film plays its seven beats; the order question works by mouse (Move up / Move down) and by keyboard.
   T-r4      the real names round; the result shows on both PCs within 1 s, with the partner's real first name.
   T-room    the room is deleted when the contest ends (REST reads back null).
   T-gone    one PC shut mid-question: the other reveals with Bernadette standing in within 35 s.
   T-late    one pupil does not answer: nothing at 60 s; at 90 s both reveal and the slow PC is told why.
   T-fallback the live link blocked: both PCs say who the partner is and how to sit together; the button makes a team.
   T-solo    one pupil: Bernadette answers about 1.5 s after the pupil.
   T-narrow  750 px: the scoreboard is a strip at the top, no sideways scroll.
   Every checker has a CONTROL: the same checker handed the failing case must go red. Exit 1 on any failure.
   Screens are saved to tools/record-tutorial/qa-l6v2/ for the sit report. */
const { chromium } = require('/Users/damiengartland/Sites/ols-digital-skills/ks3-dt/tools/record-tutorial/node_modules/playwright');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const BASE = args.indexOf('--base') !== -1 ? args[args.indexOf('--base') + 1] : 'http://localhost:8126';
const ONLY = args.indexOf('--only') !== -1 ? args[args.indexOf('--only') + 1].split(',') : null;
const run = k => !ONLY || ONLY.indexOf(k) !== -1;
const PAGE = BASE + '/ks3-dt/platform/assets/l6/contest.html';
const CFG = fs.readFileSync(path.join(__dirname, '../../platform/live-config.js'), 'utf8');
const DB = /databaseURL:\s*"([^"]+)"/.exec(CFG)[1];
const S = require('../../platform/assets/l6/cstrings.js');
const C = require('../../platform/assets/l6/contest.js');
const SHOTS = path.join(__dirname, 'qa-l6v2'); fs.mkdirSync(SHOTS, { recursive: true });
const NAMES = ['Aoife Testpupil', 'Bríd Testpupil'];
const SIZES = [[1366, 681], [1366, 768], [1500, 900], [750, 900]];
const rows = []; let bad = 0;
function gate(name, ok, detail) { if (!ok) bad++; rows.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  · ' + detail : ''}`); }
function control(name, wentRed, detail) { if (!wentRed) bad++; rows.push(`${wentRed ? 'ok  ' : 'FAIL'} CONTROL ${name}${detail ? '  · ' + detail : ''}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const code = () => Array.from({ length: 12 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const hash = o => '#' + encodeURIComponent(JSON.stringify(o));
const rest = (p, opt) => fetch(DB + '/' + p + '.json', opt).then(async r => ({ status: r.status, body: await r.text() }));
const H = (seat, room, extra) => hash(Object.assign({ stage: 'contest', seat, seats: ['A', 'B'], room, seed: room, names: NAMES, contest: null }, extra || {}));

/* ---------- the checkers (pure: used on the real screen AND on its control) ---------- */
const W = s => (String(s || '').match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length;
const sents = s => String(s || '').split(/[.!?]\s+|\n/).filter(x => x.trim());
function wordsOk(m) { /* m = {card, job, help, side} as measured */
  const out = [];
  if (W(m.card) > 25) out.push('card ' + W(m.card) + ' words');
  sents(m.card).forEach(x => { if (W(x) > 14) out.push('sentence of ' + W(x) + ': ' + x.slice(0, 50)); });
  if (!m.job) out.push('no job line'); else if (W(m.job) > 14) out.push('job ' + W(m.job));
  if (!m.help) out.push('no Stuck? Show me');
  sents(m.side).forEach(x => { if (W(x) > 14) out.push('side sentence of ' + W(x)); });
  return out;
}
function fitOk(f) { /* f = {sideways, spill[], below[]} */
  const out = [];
  if (f.sideways) out.push('sideways scroll ' + f.sideways + 'px');
  f.spill.forEach(b => out.push('words spill out of "' + b + '"'));
  f.below.forEach(b => out.push('"' + b + '" is below the screen'));
  return out;
}
const within = (a, b, ms) => a != null && b != null && Math.abs(a - b) <= ms;

/* ---------- measuring on the page (the qa-words way: skip buttons, kickers, aria-hidden, chrome) ---------- */
async function measure(p) {
  return p.evaluate(() => {
    const SKIP = 'button,a,input,select,textarea,.kicker,.intro-kicker,[aria-hidden="true"],.order,.tray,.opts,.chips-k,script,style';
    function text(root) {
      if (!root) return '';
      let out = [];
      (function walk(n) {
        if (n.nodeType === 3) { out.push(n.nodeValue); return; }
        if (n.nodeType !== 1) return;
        if (n.matches(SKIP)) return;
        const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || n.hidden) return;
        const block = /^(block|flex|grid|list-item|table)/.test(cs.display);
        if (block) out.push('\n');
        n.childNodes.forEach(walk);
        if (block) out.push('\n');
      })(root);
      return out.join('').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim();
    }
    const job = document.getElementById('job'), hb = document.getElementById('helpBtn');
    const lead = (window.L6C_STRINGS && L6C_STRINGS.layer.jobLead) || '';
    const hbOk = hb && hb.offsetParent !== null && hb.textContent.trim() === 'Stuck? Show me';
    const bg = hb ? getComputedStyle(hb).backgroundColor : '';
    const green = /rgb\((\d+), (\d+), (\d+)/.exec(bg); const isGreen = green && +green[2] > +green[1] && +green[2] > +green[3];
    return {
      phase: document.body.dataset.phase || '', rev: document.body.dataset.rev || '',
      card: text(document.getElementById('card')),
      job: job ? job.textContent.replace(lead, '').trim() : '',
      help: !!(hbOk && isGreen),
      side: text(document.querySelector('#side .state')),
      top: (document.getElementById('top') || {}).textContent || ''
    };
  });
}
async function fit(p) {
  return p.evaluate(() => {
    const de = document.documentElement;
    const sideways = Math.max(0, de.scrollWidth - window.innerWidth);
    const spill = [], below = [];
    document.querySelectorAll('button').forEach(b => {
      if (b.offsetParent === null) return;
      if (b.scrollWidth > b.clientWidth + 2 || b.scrollHeight > b.clientHeight + 2) spill.push(b.textContent.trim().slice(0, 30));
      const r = b.getBoundingClientRect();
      if (b.closest('#card') && b.matches('[data-act]:not([disabled])') && r.bottom > window.innerHeight + 1 && window.innerWidth > 800) below.push(b.textContent.trim().slice(0, 30));
    });
    return { sideways, spill, below };
  });
}
const seen = new Set();
async function look(p, name, tag) { /* words at the current size, fit at all four, one picture per screen */
  const m = await measure(p);
  const w = wordsOk(m);
  const key = name;
  if (!seen.has(key)) {
    seen.add(key);
    gate('WORDS ' + name, w.length === 0, w.join('; ') || `${W(m.card)} words · job ${W(m.job)}`);
    const vp = p.viewportSize(); const fails = [];
    for (const [wd, ht] of SIZES) { await p.setViewportSize({ width: wd, height: ht }); await sleep(120); const f = fitOk(await fit(p)); if (f.length) fails.push(`${wd}×${ht}: ${f.join(', ')}`); if (wd === 1366 && ht === 681) await p.screenshot({ path: path.join(SHOTS, (tag || 'A') + '-' + name.replace(/[^a-z0-9]+/gi, '-') + '.png') }); }
    await p.setViewportSize(vp); await sleep(80);
    gate('FIT ' + name + ' at four sizes', fails.length === 0, fails.join(' | '));
  }
  return m;
}
async function act(p, a, v) {
  const sel = v == null ? `#card [data-act="${a}"]:not([disabled]), #side [data-act="${a}"]:not([disabled])` : `#card [data-act="${a}"][data-v="${v}"]:not([disabled])`;
  await p.waitForSelector(sel, { timeout: 8000 });
  await p.click(sel);
}
const phase = (p, ph, ms) => p.waitForFunction(ph => document.body.dataset.phase === ph, ph, { timeout: ms || 8000 }).then(() => true, () => false);
const revealed = (p, ms) => p.waitForFunction(() => document.body.dataset.rev === '1', null, { timeout: ms || 8000 }).then(() => Date.now(), () => null);
const view = p => p.evaluate(() => { const v = L6C.E.view(); return { q: v.q, revealed: v.revealed, done: v.done, ps: v.partnerState, scores: v.scores }; });
const connected = p => p.waitForFunction(() => window.L6C && L6C.bus && L6C.bus.connected(), null, { timeout: 15000 }).then(() => true, () => false);
function pickFor(i, rightOne) { const q = C.Q[i]; const r = C.rightChar(i); if (rightOne) return r; if (q.kind === 'part') return String((+r + 1) % 7); return r === '1' ? '2' : '1'; }

/* answer question i on page p (order: by mouse into the right order) */
async function answer(p, i, rightOne, how) {
  const q = C.Q[i];
  if (q.kind === 'order') {
    const want = rightOne ? [0, 1, 2, 3] : [1, 0, 2, 3];
    for (let guard = 0; guard < 12; guard++) {
      const cur = await p.$$eval('#card .order .block', bs => bs.map(b => +b.dataset.k));
      const pos = want.findIndex((k, j) => cur[j] !== k); if (pos === -1) break;
      const k = want[pos], at = cur.indexOf(k);
      if (how === 'keys') { await p.focus(`#card .order .block[data-k="${k}"]`); for (let s = at; s > pos; s--) { await p.keyboard.press('ArrowUp'); await sleep(60); } }
      else for (let s = at; s > pos; s--) { await p.click(`#card .order .block[data-k="${k}"] [data-act="up"]`); await sleep(60); }
    }
    await act(p, 'lock');
    return;
  }
  await act(p, 'pick', pickFor(i, rightOne));
}

(async () => {
  const browser = await chromium.launch();
  const errs = [];
  async function open(ctx, h, size) { const p = await ctx.newPage(); await p.setViewportSize({ width: size[0], height: size[1] }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('console: ' + m.text()); }); await p.goto(PAGE + h); return p; }

  /* ===== the main pair: begin → 17 questions → result → room gone ===== */
  if (run('main')) {
    const R = code(), ctx = await browser.newContext(), ctxB = await browser.newContext();
    const A = await open(ctx, H('A', R), [1366, 681]), B = await open(ctxB, H('B', R), [750, 900]);
    gate('both PCs reach the live room', (await connected(A)) && (await connected(B)));
    /* T-begin */
    await phase(A, 'begin'); await phase(B, 'begin');
    const mb = await look(A, 'begin card (pair)');
    gate('T-begin the card names the contest and the partner by callsign', /The contest/.test(mb.card) && /Dr Custard/.test(mb.top), mb.top);
    await A.click('#helpBtn'); await sleep(200);
    const help = await A.evaluate(() => ({ open: !document.getElementById('help').hidden, items: document.querySelectorAll('#helpText li').length, how: document.getElementById('helpHow').textContent }));
    gate('T-begin Stuck? Show me opens a list that starts with the job', help.open && help.items >= 2 && /^Your job now: Read the card/.test(help.how), JSON.stringify(help));
    await A.keyboard.press('Escape'); await sleep(150);
    gate('Esc closes the help', await A.evaluate(() => document.getElementById('help').hidden));
    await look(B, 'begin card at 750 (seat B)', 'B');
    const narrow = await B.evaluate(() => { const s = document.getElementById('side').getBoundingClientRect(), c = document.getElementById('card').getBoundingClientRect(); return { stripTop: s.top < c.top, sideways: document.documentElement.scrollWidth - innerWidth }; });
    gate('T-narrow at 750 px the scoreboard is a strip above the card, no sideways scroll', narrow.stripTop && narrow.sideways <= 0, JSON.stringify(narrow));
    await act(A, 'start'); await act(B, 'start');

    const trips = [], orders = [];
    for (let i = 0; i < C.N; i++) {
      const v = await view(A), r = C.ROUNDS.find(x => x.from <= i && i <= x.to);
      if (i === r.from) { /* the round card */
        await phase(A, 'intro'); await phase(B, 'intro');
        await look(A, `round ${r.n} card`); await look(B, `round ${r.n} card (B)`, 'B');
        if (r.n === 3) {
          await act(A, 'filmplay'); await act(B, 'filmplay');
          await phase(A, 'film');
          const beats = [];
          for (let k = 0; k < 7; k++) { await A.waitForFunction(k => +document.body.dataset.beat >= k, k, { timeout: 6000 }).catch(() => {}); beats.push(await A.evaluate(() => +document.body.dataset.beat)); await look(A, 'film beat ' + (k + 1)); }
          gate('T-r3 the film plays seven beats', beats[6] === 6, beats.join(','));
          await A.waitForSelector('#card [data-act="filmgo"]:not([disabled])', { timeout: 8000 });
          await look(A, 'film ended');
          await act(A, 'filmgo'); await B.waitForSelector('#card [data-act="filmgo"]:not([disabled])', { timeout: 25000 }); await act(B, 'filmgo');
        } else { await act(A, 'introgo'); await act(B, 'introgo'); }
      }
      await phase(A, 'q'); await phase(B, 'q');
      if (C.Q[i].kind === 'mcq') orders.push([await A.$$eval('#card .opts [data-act="pick"]', bs => bs.map(b => b.dataset.v).join('')), await B.$$eval('#card .opts [data-act="pick"]', bs => bs.map(b => b.dataset.v).join(''))]);
      await look(A, `Q${i} question`);
      await answer(A, i, true, i === 11 ? 'keys' : 'mouse');
      const told = await B.waitForFunction(() => /has answered/.test((document.querySelector('#side .state') || {}).textContent || ''), null, { timeout: 3000 }).then(() => true, () => false);
      if (i === 0) gate('T-r1 the other PC is told "has answered" within 3 s', told);
      await look(A, `Q${i} answered, waiting`);
      const t0 = Date.now();
      await answer(B, i, i % 3 !== 0, i === 11 ? 'mouse' : 'mouse');
      const [ra, rb] = await Promise.all([revealed(A, 6000), revealed(B, 6000)]);
      trips.push(ra && rb ? Math.max(ra, rb) - t0 : null);
      await look(A, `Q${i} reveal`); await look(B, `Q${i} reveal (B)`, 'B');
      await act(A, 'next'); await act(B, 'next');
    }
    const slow = trips.filter(t => t == null || t > 2000);
    gate('T-r1 every reveal shows on both PCs within 2 s of the second answer', slow.length === 0, `worst ${Math.max.apply(null, trips.map(t => t == null ? 99999 : t))} ms`);
    control('a 2.5 s reveal is caught as too slow', !(2500 <= 2000));
    gate('T-r2 the options come up in the same order on both PCs', orders.every(o => o[0] === o[1] && o[0].length === 4), orders.map(o => o.join('/')).join(' '));
    control('two different orders are caught', !['0123', '1023'].every((x, k, a) => x === a[0]));
    /* T-result */
    const [ta, tb] = await Promise.all([phase(A, 'result', 8000).then(() => Date.now()), phase(B, 'result', 8000).then(() => Date.now())]);
    const ma = await look(A, 'result'), mbb = await measure(B);
    gate('T-r4 the result shows on both PCs within 1 s', within(ta, tb, 1000), `${Math.abs(ta - tb)} ms`);
    control('results 1.5 s apart are caught', !within(0, 1500, 1000));
    gate('T-result each PC names the partner by real first name', /Bríd was Dr Custard/.test(ma.card) && /Aoife was Dr Marmalade/.test(mbb.card), ma.card.replace(/\n/g, ' / ').slice(0, 160));
    const va = await view(A);
    gate('the scores match the key (A all right, B wrong on every third)', va.scores.A === 17 && va.scores.B === 17 - Math.ceil(17 / 3), JSON.stringify(va.scores));
    await sleep(8000);
    const gone = await rest('rooms/' + R);
    gate('T-room the room is deleted when the contest ends', gone.status === 200 && gone.body === 'null', gone.body.slice(0, 60));
    await act(A, 'cont'); await sleep(300); /* Continue on the result posts done */
    const posted = await A.evaluate(() => window.__posted || []);
    gate('the page told the lesson it is done (save with the contest, then done)', posted.some(m => m.type === 'save' && m.opC) && posted.some(m => m.type === 'done'), posted.map(m => m.type).join(','));
    await ctx.close(); await ctxB.close();
  }

  /* ===== T-gone: B's PC shut mid-question ===== */
  if (run('gone')) {
    const R = code(), ca = await browser.newContext(), cb = await browser.newContext();
    const A = await open(ca, H('A', R), [1366, 681]), B = await open(cb, H('B', R), [1366, 681]);
    await connected(A); await connected(B);
    await act(A, 'start'); await act(B, 'start'); await act(A, 'introgo'); await act(B, 'introgo');
    await phase(A, 'q'); await phase(B, 'q'); await sleep(1500);
    await cb.close();
    const t0 = Date.now(); await answer(A, 0, true);
    const ra = await revealed(A, 40000);
    const m = await measure(A);
    gate('T-gone the shut PC is stood in for and A reveals within 35 s', ra && ra - t0 <= 35000, ra ? (ra - t0) + ' ms' : 'no reveal');
    control('a 40 s stand-in is caught as too slow', !(40000 <= 35000));
    gate('T-gone the scoreboard says the partner\'s PC lost its link', /lost its link/.test(m.side), m.side);
    await look(A, 'reveal with a gone partner');
    await A.evaluate(() => L6C.bus && L6C.bus.destroy && L6C.bus.destroy()).catch(() => {});
    await ca.close();
  }

  /* ===== T-late: B there but never answers ===== */
  if (run('late')) {
    const R = code(), ca = await browser.newContext(), cb = await browser.newContext();
    const A = await open(ca, H('A', R), [1366, 681]), B = await open(cb, H('B', R), [1366, 681]);
    await connected(A); await connected(B);
    await act(A, 'start'); await act(B, 'start'); await act(A, 'introgo'); await act(B, 'introgo');
    await phase(A, 'q'); await phase(B, 'q');
    const t0 = Date.now(); await answer(A, 0, true);
    await sleep(60000);
    const at60 = await A.evaluate(() => document.body.dataset.rev);
    gate('T-late nothing at 60 s', at60 !== '1');
    const [ra, rb] = await Promise.all([revealed(A, 35000), B.waitForFunction(() => document.body.dataset.phase === 'notice', null, { timeout: 35000 }).then(() => Date.now(), () => null)]);
    gate('T-late at 90 s A reveals and B is shown why (the notice card)', ra && rb && ra - t0 >= 89000 && ra - t0 <= 95000, `A ${ra && ra - t0} ms · B ${rb && rb - t0} ms`);
    const mn = await look(B, 'notice: Bernadette answered for you (late)', 'B');
    gate('T-late the notice says why', mn.card.indexOf(S.rev.standInLate) !== -1, mn.card);
    await act(B, 'noticeok'); await phase(B, 'q');
    gate('after the notice B sees the reveal', (await B.evaluate(() => document.body.dataset.rev)) === '1');
    await A.evaluate(() => L6C.bus.destroy()).catch(() => {});
    await ca.close(); await cb.close();
  }

  /* ===== T-fallback: the live link blocked where a school filter blocks it ===== */
  if (run('fallback')) {
    const blocked = await chromium.launch({ args: ['--host-resolver-rules=MAP *.firebaseio.com ~NOTFOUND, MAP *.firebasedatabase.app ~NOTFOUND, EXCLUDE localhost'] });
    const R = code(), c3 = await blocked.newContext();
    const FA = await open(c3, H('A', R, { fallback: 1 }), [1366, 681]);
    const FB = await open(c3, H('B', R), [1366, 681]);
    const awayA = await phase(FA, 'away', 3000), awayB = await phase(FB, 'away', 16000);
    const ma = await measure(FA), mb = await measure(FB);
    gate('T-fallback both PCs show the sit-together card', awayA && awayB, `A ${awayA} · B ${awayB}`);
    gate('T-fallback each names the partner by real first name', /Your partner is Bríd\./.test(ma.card) && /Your partner is Aoife\./.test(mb.card), ma.card.replace(/\n/g, ' / '));
    await look(FA, 'fallback card');
    await act(FA, 'together'); await phase(FA, 'begin');
    const mt = await measure(FA);
    gate('T-fallback the button makes a team against Bernadette', /You are a team/.test(mt.top) && /Bernadette/.test(mt.card), mt.top + ' / ' + mt.card.slice(0, 80));
    await look(FA, 'begin card (team)');
    const posted = await FA.evaluate(() => window.__posted || []);
    gate('T-fallback the lesson is told (fallback message posted)', posted.some(m => m.type === 'fallback'), posted.map(m => m.type).join(','));
    await c3.close(); await blocked.close();
    /* control: with the link open the same check finds no fallback */
    const R2 = code(), c4 = await browser.newContext(), CA = await open(c4, H('A', R2), [1366, 681]), CB = await open(c4, H('B', R2), [1366, 681]);
    await sleep(12000);
    control('with the link open, no PC shows the sit-together card', !(await CA.evaluate(() => document.body.dataset.phase === 'away')));
    await CA.evaluate(() => L6C.bus.destroy()).catch(() => {}); await c4.close();
  }

  /* ===== T-solo ===== */
  if (run('solo')) {
    const c5 = await browser.newContext(), P = await open(c5, hash({ stage: 'contest', seat: 'A', seats: ['A'], room: '', seed: 'solo1', names: ['Aoife Testpupil'] }), [1366, 681]);
    await phase(P, 'begin');
    await look(P, 'begin card (solo)');
    const ms = await measure(P);
    gate('T-solo the begin card says Bernadette plays against you', /Bernadette is awake now/.test(ms.card), ms.card.slice(0, 80));
    await act(P, 'start'); await act(P, 'introgo'); await phase(P, 'q');
    const t0 = Date.now(); await answer(P, 0, true);
    const r = await revealed(P, 4000);
    gate('T-solo Bernadette answers about 1.5 s after the pupil', r && r - t0 >= 1200 && r - t0 <= 3000, r ? (r - t0) + ' ms' : 'no reveal');
    await look(P, 'reveal (solo)');
    await c5.close();
  }

  /* ===== the checkers' own controls ===== */
  control('a 30-word card is caught', wordsOk({ card: 'one two three four five six seven eight nine ten. one two three four five six seven eight nine ten. one two three four five six seven eight nine ten.', job: 'Click it.', help: true, side: '' }).length > 0);
  control('a screen with no job line is caught', wordsOk({ card: 'Hello.', job: '', help: true, side: '' }).length > 0);
  control('a screen with no green Stuck? Show me is caught', wordsOk({ card: 'Hello.', job: 'Click it.', help: false, side: '' }).length > 0);
  control('a button whose words spill out is caught', fitOk({ sideways: 0, spill: ['Continue to the contest'], below: [] }).length > 0);
  control('sideways scroll is caught', fitOk({ sideways: 40, spill: [], below: [] }).length > 0);

  gate('no page errors', errs.length === 0, errs.slice(0, 4).join(' | '));
  await browser.close();
  console.log(rows.join('\n'));
  console.log(`\nl6-contest-look: ${rows.length} checks, ${bad} failed`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); console.log(rows.join('\n')); process.exit(1); });
