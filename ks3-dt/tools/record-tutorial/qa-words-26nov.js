/* qa-words-26nov — THE 25-WORD SCREEN, on every lesson part the platform draws (26 Nov 2026).
   His feedback, 26 Nov: "the pupils just don't bother reading long text, so if it can be super clear while
   being shorter, that would be great." The J3 L7 standard (j3l7see-words.js): no screen says more than 25
   words, no sentence more than 14.
   WHAT IS COUNTED: the reading words on the FIRST view of every drawn part (after a briefing has typed
   itself out), and every later card a part shows from its own list (each step of a steps part; each rung,
   case and stop) read from the packed content.
   V94 (26 Nov 2026): the exit check's OPENING card and the How did it go? card are counted too (his "pupils
   don't read long text" covers the last screens of the hour as much as the first). The questions themselves
   stay exempt (spec A19, as in J3 L7). The How did it go? "I can" rows are a list she answers row by row, held
   like the job list: at most 4 rows of 10 words or fewer, the rest of the card to the 25.
   FRAME HOURS (Rescue, Two Lights, Search, Headliner, Night Desk, See): the hour's FIRST screen inside its
   frame is counted. Their later screens are held by each hour's own words gate. Inside a frame the hour's own
   chrome is not counted, as the platform's own top bar is not: the stage strip or rail, the clock or minutes
   left, the small kicker above a title, the job line (held to 14 by the hour's gate), the spreadsheet grid and
   its tabs, and any words a full-screen card covers (checked with elementFromPoint).
   OPERATION (J1 L6) is EXEMPT: J1 L6 V2 (V95) replaces that hour and its own build gate holds its screens.
   NOT COUNTED: the exit questions; the help
   while it is open; button and link words; code (anything set in the code face: tray lines, programs,
   console, targets); the small labels above a title (kicker, clearance, "Step 2 of 5"); the job line, which
   qa-showme holds to 14 words.
   THE JOB LIST on a "write your own program" plan card (.pye-plan-list) is the task itself, a numbered
   checklist she ticks off on the bench: it is held to at most 5 jobs of 8 words or fewer each, and the rest of
   the card to the 25 (26 Nov 2026 ruling, V93_TRIMS_SPEC.md).
   THE RULES LIST on an inspection intro (.insp-rules) is taught content she checks the room against (DFM 171,
   teach before test): at most 6 rules of 8 words or fewer each, counted apart from the 25 in the same way.
   BENCH LISTS (V94, 26 Nov 2026): a numbered list of things she does at the bench, one at a time, is held like
   the job list, apart from the 25: at most 6 steps of 10 words or fewer each. They are the ladder's MakeCode
   set-up (its lead 6 words or fewer), the Drive steps on a save card (title and line together), the case
   board's close-a-case steps, the Rally rules, the Reviewer's Code rules and its two examples, and a rung's
   own build steps.
   THE RALLY CONSOLE (timer face, "Go 1 of 2", the go labels, "Run the timer first", "Your total") is the
   game's own scoreboard chrome, not reading, and is not counted; nor is the small "NOW SHOWING" label over a
   film (a kicker).
   CONTROL=1 serves origin/main's packed content: parts must be found over 25 words.
   Run: NODE_PATH=$(npm root -g) node tools/record-tutorial/qa-words-26nov.js [--port=8879] [--only=j3-02] */
const puppeteer = require('puppeteer'), path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith('--' + k + '=')); return m ? m.slice(k.length + 3) : d; };
const ROOT = path.resolve(__dirname, '../../..'), KS3 = path.join(ROOT, 'ks3-dt'), PORT = +arg('port', 8879);
const CONTROL = process.env.CONTROL === '1', ONLY = arg('only', ''), CONTROL_REF = process.env.CONTROL_REF || 'origin/main';
const FRAME = new Set(['operation', 'rescue', 'twolights', 'search', 'headliner', 'nightdesk', 'see']);
const EXEMPT = new Set(['operation']); /* J1 L6 V2 (V95) replaces this hour; its build gate holds it */
const MAXW = 25, MAXS = 14;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const readFile = rel => CONTROL ? execFileSync('git', ['show', CONTROL_REF + ':ks3-dt/' + rel], { cwd: ROOT, maxBuffer: 1 << 27 }).toString()
  : fs.readFileSync(path.join(KS3, rel), 'utf8');
const W = s => (String(s || '').replace(/<[^>]+>/g, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length;
const sentences = s => String(s || '').replace(/<[^>]+>/g, ' ').split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean);
let PASS = 0; const FAILS = [], REPORT = [];
const check = (ok, msg) => { if (ok) PASS++; else FAILS.push(msg); if (!ok || process.env.VERBOSE) console.log((ok ? '  ok    ' : '  FAIL  ') + msg); };

function lessons() {
  const out = [];
  for (const y of ['j1', 'j2', 'j3']) {
    const man = JSON.parse(readFile('content/' + y + '/manifest.json'));
    for (const le of man.lessons || []) {
      let L; try { L = JSON.parse(readFile('content/' + y + '/lessons/' + le.id + '.json')); } catch (e) { continue; }
      if (ONLY && !ONLY.split(',').includes(le.id)) continue;
      out.push({ id: le.id, L, chunks: (L.chunks || []).map((c, i) => ({ i, id: c.id, engine: c.engine, config: c.config || {} })) });
    }
  }
  return out;
}
/* the later cards a part draws from its own list: one card each */
function listCards(ch) {
  const c = ch.config, out = [];
  const add = (tag, parts) => out.push({ tag, text: parts.filter(Boolean).join(' \n') });
  if (ch.engine === 'steps') (c.steps || []).forEach((s, k) => add('step ' + (k + 1), [s.title, s.text, (s.lines || []).join(' \n'), s.note]));
  if (ch.engine === 'ladder') (c.rungs || []).forEach((r, k) => add('rung ' + (k + 1), [r.title, r.brief || r.text || r.intro, (r.steps || []).join(' \n')]));
  if (ch.engine === 'tour') (c.stops || []).forEach((s, k) => add('stop ' + (k + 1), [s.title, s.text || s.body]));
  return out;
}

async function openPage(browser) {
  const page = await browser.newPage(); await page.setViewport({ width: 1366, height: 681 });
  if (CONTROL) {
    await page.setRequestInterception(true);
    page.on('request', q => {
      const m = /\/ks3-dt\/(content\/[^?]+\.json)(\?|$)/.exec(q.url());
      if (m) { try { return q.respond({ status: 200, contentType: 'application/json', body: readFile(m[1]) }); } catch (e) { /* not on main */ } }
      q.continue();
    });
  }
  return page;
}
const CLASS_OF = { j1: 'Demo-8A', j2: 'Demo-9A', j3: 'Demo-10A' };
async function openLesson(page, id) {
  const url = `http://localhost:${PORT}/ks3-dt/platform/index.html?class=${CLASS_OF[id.slice(0, 2)]}&as=aoife`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App && App.state && App.state.man && document.querySelector('#hub') && !document.querySelector('#hub').hidden, { timeout: 25000 });
  await page.evaluate((id) => {
    const past = Date.now() - 3 * 864e5;
    (App.state.man.lessons || []).forEach(l => { App.state.locks[String(l.num)] = { u: past, on: 1 }; });
    App.state.absence = []; App.state.me = App.state.me || {}; App.state.me.L = {};
    if (window.PairKit && PairKit.stop) PairKit.stop();
    App.openLesson(id, {});
  }, id);
  await page.waitForFunction((id) => App.state.lesson && App.state.lesson.id === id && App.state.chunks && App.state.chunks.length && !document.querySelector('#player').hidden, { timeout: 20000 }, id);
  await sleep(400);
}
async function goChunk(page, idx, engine) {
  /* the old part leaves first: wait until the host holds a different part, then let it settle */
  const before = await page.evaluate(() => { const h = document.querySelector('#chunk-host'); return h ? h.innerHTML.length + '|' + h.innerHTML.slice(0, 400) : ''; });
  const at = await page.evaluate((id) => (App.state.chunks || []).findIndex(c => c.id === id), idx);
  if (at < 0) return false;
  await page.evaluate((idx) => { App.state.advancing = false; App.state.chunkIdx = idx; App.remountChunk(); }, at);
  try { await page.waitForFunction((b) => { const h = document.querySelector('#chunk-host'); return h && h.firstElementChild && (h.innerHTML.length + '|' + h.innerHTML.slice(0, 400)) !== b; }, { timeout: 6000 }, before); } catch (e) { }
  await sleep(500);
  if (FRAME.has(engine)) {
    /* the hour inside the frame: wait until its first screen has words, then let any typing finish */
    try { await page.waitForFunction(() => { const f = document.querySelector('#chunk-host iframe'); const d = f && f.contentDocument; return d && d.body && d.body.innerText.replace(/\s+/g, ' ').trim().length > 20; }, { timeout: 20000 }); } catch (e) { }
    await sleep(6000);
  }
  if (engine === 'briefing') { try { await page.waitForFunction(() => { const b = document.querySelector('#chunk-host .dossier-cta'); return b && !b.hidden; }, { timeout: 15000 }); } catch (e) { } }
  await sleep(engine === 'briefing' ? 300 : 700);
  return true;
}
/* the reading words on screen now: visible text in the part, not in a button, a link, a field or the code face */
/* [the list box, its items, its lead (held to 6 words)] */
const BENCH = [['.ladder-setup', 'ol > li', '.ladder-setup-lead'], ['.af-steps', ':scope > li', ''], ['.case-intro-steps', ':scope > li', ''],
  ['.rally-rules', ':scope > li', ''], ['.gal-code-rules', ':scope > li', ''], ['.gal-code-eg', ':scope > span', ''], ['.rung-steps', ':scope > li', '']];
const screenText = (page, inFrame) => page.evaluate(([inFrame, BENCH]) => {
  let host = document.querySelector('#chunk-host'); if (!host) return '';
  if (inFrame) { const f = host.querySelector('iframe'), d = f && f.contentDocument; if (!d || !d.body) return { text: '', jobs: [], rules: [], rows: [] }; host = d.body; }
  const cs = e => (e.ownerDocument.defaultView || window).getComputedStyle(e);
  const vis = e => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) && cs(e).visibility !== 'hidden' && cs(e).opacity !== '0';
  const SKIP = 'button,a,input,textarea,select,option,label.sr-only,video,code,pre,kbd,samp,.runner-progress,.pye-plan-list,.insp-rules,.se-rows,.intro-kicker,.dossier-clearance,.dossier-top,[role=button],[aria-hidden=true],.sm-tag,.now-showing,' +
    /* the rally console's own chrome */ '.rally-timer-head,.rally-timer-face,.rally-round-label,.rally-locked-tag,.rally-total-row,' +
    /* bench lists, held apart below */ BENCH.map(b => b[0]).join(',');
  /* inside a frame hour: its own chrome (strip, clock, kicker, job line, grid, tabs) and anything a full-screen card covers */
  const FRAME_SKIP = '.strip,#strip,#stripbox,#hstrip,.rail,.steps,.mins,#clock,.kick,.k,.kicker,.job,#job,.dock,table.grid,.tabs,.barlab';
  const covered = e => { if (!inFrame) return false; const r = e.getBoundingClientRect(), d = e.ownerDocument; const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = d.elementFromPoint(x, y); return !!top && top !== e && !e.contains(top) && !top.contains(e); };
  const blocks = new Map();
  const tw = document.createTreeWalker(host, NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue;
    const p = n.parentElement; if (!p || !vis(p) || p.closest(SKIP) || (inFrame && (p.closest(FRAME_SKIP) || covered(p)))) continue;
    const ff = cs(p).fontFamily.toLowerCase(); if (/mono|courier|consolas|menlo/.test(ff)) continue;
    const b = p.closest('p,li,h1,h2,h3,h4,figcaption,td,th,dd,dt,blockquote,div') || p;
    blocks.set(b, (blocks.get(b) || '') + ' ' + t);
  }
  const jobs = [...host.querySelectorAll('.pye-plan-list > li')].filter(vis).map(li => li.innerText.replace(/\s+/g, ' ').trim());
  const rules = [...host.querySelectorAll('.insp-rules > li')].filter(vis).map(li => li.innerText.replace(/\s+/g, ' ').trim());
  const rows = [...host.querySelectorAll('.se-rows .se-row > p')].filter(vis).map(p => p.innerText.replace(/\s+/g, ' ').trim());
  const bench = [];
  for (const [box, item, lead] of BENCH) for (const b of host.querySelectorAll(box)) {
    if (!vis(b)) continue;
    const items = [...b.querySelectorAll(item)].filter(vis).map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const ld = lead ? ((b.querySelector(lead) || {}).innerText || '').replace(/\s+/g, ' ').trim() : '';
    if (items.length || ld) bench.push({ box, items, lead: ld });
  }
  return { text: [...blocks.values()].map(s => s.trim()).join('\n'), jobs, rules, rows, bench };
}, [!!inFrame, BENCH]);

(async () => {
  let srv = null;
  try { execFileSync('curl', ['-sf', '-o', '/dev/null', `http://localhost:${PORT}/ks3-dt/platform/index.html`]); }
  catch (e) { srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' }); await sleep(1200); }
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  let over = 0;
  try {
    const page = await openPage(browser);
    for (const le of lessons()) {
      console.log('\n' + le.id);
      const drawn = le.chunks.filter(c => !EXEMPT.has(c.engine));
      let opened = false;
      if (drawn.length) { try { await openLesson(page, le.id); opened = true; } catch (e) { check(false, le.id + ': lesson would not open (' + e.message.slice(0, 60) + ')'); } }
      for (const ch of drawn) {
        if (opened) {
          if (!(await goChunk(page, ch.id, ch.engine))) { check(false, le.id + ' ' + ch.id + ': part not found in the lesson the platform drew'); continue; }
          const st = await screenText(page, FRAME.has(ch.engine)), t = st.text, n = W(t), longS = sentences(t).filter(s => W(s) > MAXS);
          REPORT.push({ id: le.id, part: ch.id, engine: ch.engine, screen: 'first view', words: n, longSentences: longS.length, text: t });
          if (n > MAXW) over++;
          check(n <= MAXW, le.id + ' ' + ch.id + ' (' + ch.engine + ') first view: ' + n + ' words (25 at most)');
          if (st.jobs.length) {
            REPORT.push({ id: le.id, part: ch.id, engine: ch.engine, screen: 'job list', words: Math.max(...st.jobs.map(W)), longSentences: 0, text: st.jobs.join('\n') });
            check(st.jobs.length <= 5 && st.jobs.every(j => W(j) <= 8), le.id + ' ' + ch.id + ' job list: ' + st.jobs.length + ' jobs, longest ' + Math.max(...st.jobs.map(W)) + ' words (5 jobs of 8 words at most)');
          }
          if (st.rules.length) {
            REPORT.push({ id: le.id, part: ch.id, engine: ch.engine, screen: 'rules list', words: Math.max(...st.rules.map(W)), longSentences: 0, text: st.rules.join('\n') });
            check(st.rules.length <= 6 && st.rules.every(j => W(j) <= 8), le.id + ' ' + ch.id + ' rules list: ' + st.rules.length + ' rules, longest ' + Math.max(...st.rules.map(W)) + ' words (6 rules of 8 words at most)');
          }
          if (st.rows && st.rows.length) {
            REPORT.push({ id: le.id, part: ch.id, engine: ch.engine, screen: 'I can rows', words: Math.max(...st.rows.map(W)), longSentences: 0, text: st.rows.join('\n') });
            check(st.rows.length <= 4 && st.rows.every(j => W(j) <= 10), le.id + ' ' + ch.id + ' I can rows: ' + st.rows.length + ' rows, longest ' + Math.max(...st.rows.map(W)) + ' words (4 rows of 10 words at most)');
            if (st.rows.some(j => W(j) > 10)) over++;
          }
          for (const bl of (st.bench || [])) {
            const longest = Math.max(0, ...bl.items.map(W));
            REPORT.push({ id: le.id, part: ch.id, engine: ch.engine, screen: 'bench list ' + bl.box, words: longest, longSentences: 0, text: (bl.lead ? bl.lead + '\n' : '') + bl.items.join('\n') });
            const ok = bl.items.length <= 6 && longest <= 10 && W(bl.lead) <= 6;
            if (!ok) over++;
            check(ok, le.id + ' ' + ch.id + ' bench list ' + bl.box + ': ' + bl.items.length + ' steps, longest ' + longest + ' words' + (bl.lead ? ', lead ' + W(bl.lead) : '') + ' (6 steps of 10 words at most, lead 6)');
          }
          check(!longS.length, le.id + ' ' + ch.id + ' first view: every sentence 14 words or fewer' + (longS.length ? ' — "' + longS[0].slice(0, 70) + '…"' : ''));
        }
        for (const card of listCards(ch)) {
          const n = W(card.text), longS = sentences(card.text).filter(s => W(s) > MAXS);
          REPORT.push({ id: le.id, part: ch.id, engine: ch.engine, screen: card.tag, words: n, longSentences: longS.length, text: card.text });
          if (n > MAXW) over++;
          check(n <= MAXW, le.id + ' ' + ch.id + ' ' + card.tag + ': ' + n + ' words (25 at most)');
          check(!longS.length, le.id + ' ' + ch.id + ' ' + card.tag + ': every sentence 14 words or fewer' + (longS.length ? ' — "' + longS[0].slice(0, 70) + '…"' : ''));
        }
      }
    }
    await page.close();
  } finally { await browser.close(); if (srv) srv.kill(); }
  if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify(REPORT, null, 1));
  console.log('\n' + PASS + ' passed, ' + FAILS.length + ' failed; screens over 25 words: ' + over + ' of ' + REPORT.length);
  if (CONTROL) { console.log('CONTROL (' + CONTROL_REF + ' content): ' + (over ? 'FAILS as it must' : 'DID NOT FAIL')); process.exit(over ? 0 : 1); }
  process.exit(FAILS.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
