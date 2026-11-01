/* usage: node ks3-dt/tools/record-tutorial/l5-walk-model.js [--control] [--write]
   TWO LIGHTS · gate A11 (hour length) and the four drift budgets B1–B4 (J3_L5_TWO_LIGHTS_SPEC.md §1, §12).
   Walks the REAL engine (assets/twolights/engine.js) on a virtual clock: two laptops (and a trio) on the local bus, each a
   pupil robot who reads every new bar line, red text, console, slip and poster at 0.35 s a word, types every fix at
   4 keys a second, clicks RUN in 1 s, and radios what the bar tells her to. Every room seed is walked (all 7 ch4
   variant bases), so the slower seat is the slowest in any room.
   B = slower seat × 1.25, never below 90 s. A11: Home by minute 47 with the help ladder never triggered; with every
   ladder step triggered once per chapter (each step waited out, its line read), by minute 52.
   --control: the radio is cut (no robot ever answers "Tell them"): a silent fault is never found, Home is never
   reached, and the gate must go red.
   --write: record B1–B4 in engine.js's BUDGETS (the lesson JSON takes the same numbers). */
const path = require('path'), fs = require('fs');
const TW = path.join(__dirname, '../../platform/assets/twolights');
const EN = require(TW + '/engine.js'), PR = require(TW + '/programs.js'), J = require(TW + '/judge.js'), TS = require(TW + '/strings.js');
const args = process.argv.slice(2), CONTROL = args.includes('--control');
const KEYS = 4, WORD = 0.35, CLICK = 1;
const words = t => String(t || '').split(/\s+/).filter(Boolean).length;
const read = t => words(t) * WORD;
function keys(a, b) {   // keystrokes to turn a into b: everything between the common head and the common tail, both ways
  let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0; while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return (a.length - p - s) + (b.length - p - s);
}
const POSTERS = ['name', 'type', 'indent', 'called', 'return'].map(k => TS.render('poster.' + k)).join(' ');

function clockMake() {
  let t = 1e12; const q = [];
  return { now: () => t, setTimeout: (f, ms) => q.push({ at: t + ms, f }),
    advance(ms) { t += ms; q.sort((x, y) => x.at - y.at); while (q.length && q[0].at <= t) q.shift().f(); } };
}
function nextProgram(c, s, E) {   // the program one fix closer: what the bar (or the slip) points her to
  const SEAT = PR.SEATS[s], L = E.S.L[s], cur = E.code(s, c);
  if (c === 'ch1') return cur.indexOf('lampp_on') >= 0 ? PR.ch1(SEAT, 1) : PR.ch1(SEAT, 2);
  if (c === 'ch2') return PR.ch2(SEAT, true);
  if (c === 'ch3') return PR.ch3(SEAT, 'after');
  const iss = E.topIssue(); const f = L.live[c] || J.judge(c, s, cur, { variant: L.variant });
  const left = Object.keys(f.faults).filter(id => f.faults[id].present && (!iss || id !== iss.id));
  return PR.ch4(SEAT, left);
}

/* the engine takes its bus at birth, so build each engine with its endpoint */
function room2(room, seats, c) {
  const clock = clockMake(), bus = EN.makeLocalBus(300, clock), E = {}, bot = {};
  seats.forEach(s => {
    const ep = bus.endpoint();
    E[s] = EN.makeEngine({ seat: s, seats, room, stage: c, mode: 'pair', bus: ep, clock, budgets: { ch1: 1e9, ch2: 1e9, ch3: 1e9, ch4: 1e9 } });
    ep.on(m => E[s].receive(m));
    bot[s] = { busy: 0, seen: '', doneAt: null, laddered: {}, slipsUsed: 0 };
  });
  return { clock, E, bot };
}

function chapterTime(room, seats, c, ladder) {
  const { clock, E, bot } = room2(room, seats, c);
  const t0 = clock.now();
  seats.forEach(s => { E[s].hello(); bot[s].busy = t0 + read(E[s].code(s)) * 1000; });   // she reads her program first
  for (let step = 0; step < 4 * 60 * 30; step++) {   // 30 min of 250 ms ticks at most
    clock.advance(250);
    const t = clock.now();
    seats.forEach(s => {
      const e = E[s], b = bot[s]; e.tick();
      if (b.doneAt == null && e.S.L[s].done[c] && !e.S.L[s].nameQ.length) b.doneAt = t;
      if (t < b.busy) return;
      const bar = e.bar() || {}, id = bar.id || '';
      const line = id ? TS.render(id, bar.vars || {}) : '';
      if (process.env.DBG && line + id !== b.seen) console.log(c, s, ((t - t0) / 1000).toFixed(1), id, JSON.stringify(bar.vars || ''), 'nameQ', e.S.L[s].nameQ.join());
      if (line + id !== b.seen) { b.seen = line + id; b.busy = t + read(line) * 1000; return; }   // a new bar line: read it
      const L = e.S.L[s], res = L.res[c];
      const mineSlips = e.S.slips.filter(x => x.ch === c && x.to === s);
      const wantsFix = id === 'bar.fixline' || id === 'bar.putback' || id === 'bar.extra' || /^solo\./.test(id) || ((id === 'bar.slip' || id === 'bar.hunt') && mineSlips.length > b.slipsUsed);
      if (ladder && wantsFix && !b.ladderDone) {   // once a chapter: wait out every step of the help ladder, reading each
        if (b.ladderFrom == null) b.ladderFrom = t;
        const h = e.help();
        if (h && !b.laddered[h.step]) { b.laddered[h.step] = 1; b.busy = t + read(TS.render(h.id, h.vars || {})) * 1000; }
        if (Object.keys(b.laddered).length >= 3 || t - b.ladderFrom > 240000) b.ladderDone = 1; else return;
      }
      let ms = 0;
      if (id === 'bar.run') { e.run(); ms = CLICK * 1000 + read(res && res.console ? [].concat(res.console).join(' ') : '') * 1000; }
      else if (id === 'bar.readred') { e.readRed(); ms = read(res && res.redText) * 1000; }
      else if (id === 'bar.fixline' || id === 'bar.putback' || id === 'bar.extra' || /^solo\./.test(id)) { fix(); }
      else if (/^bar\.tell\./.test(id) && !CONTROL) { e.radio(bar.seat, id.split('.')[2]); ms = CLICK * 1000; }
      else if (id === 'bar.name' && L.nameQ.length) { e.name(J.KIND[L.nameQ[0]]); ms = (read(POSTERS) + CLICK) * 1000; }
      else if (id === 'bar.slip' || id === 'bar.hunt') {
        const mine = e.S.slips.filter(x => x.ch === c && x.to === s);
        if (mine.length > b.slipsUsed) { b.slipsUsed = mine.length; ms = read(TS.render('slip.' + mine[mine.length - 1].slip, { SIGN: 'NORTH LIGHT' })) * 1000; fix(); }
      }
      if (ms) b.busy = t + ms;
      function fix() {
        const before = e.code(s), after = nextProgram(c, s, e);
        e.edit(after, 1); ms = keys(before, after) / KEYS * 1000; b.busy = t + ms;
        b.busy += CLICK * 1000; e.run(); ms = 0;
        const r = e.S.L[s].res[c]; b.busy += read(r && (r.redText || [].concat(r.console || []).join(' '))) * 1000;
      }
    });
    if (seats.every(s => bot[s].doneAt != null)) break;
  }
  const out = {}; seats.forEach(s => { out[s] = bot[s].doneAt == null ? Infinity : (bot[s].doneAt - t0) / 1000; }); return out;
}

/* ---- the walk ---- */
const CHS = ['ch1', 'ch2', 'ch3', 'ch4'];
const ROOMS = []; for (let i = 0; ROOMS.length < 7 && i < 500; i++) { const r = 'walk' + i, base = PR.hash(r) % 7; if (!ROOMS.some(x => PR.hash(x) % 7 === base)) ROOMS.push(r); }
const rows = []; let bad = 0;
function gate(name, ok, detail) { if (!ok) bad++; rows.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  · ' + detail : ''}`); }
const slow = {}, slowL = {}, worst = {};
CHS.forEach(c => {
  slow[c] = 0; slowL[c] = 0;
  ROOMS.forEach(r => [['A', 'B'], ['A', 'B', 'C']].forEach(seats => {
    const t = chapterTime(r, seats, c, false), tl = chapterTime(r, seats, c, true);
    seats.forEach(s => {
      if (t[s] > slow[c]) { slow[c] = t[s]; worst[c] = `${r} ${seats.join('')} seat ${s}`; }
      if (tl[s] > slowL[c]) slowL[c] = tl[s];
    });
  }));
});
const B = {}; CHS.forEach(c => { B[c] = Math.max(90, Math.ceil(slow[c] * 1.25)); });
// the minutes before ch1 (spec §1): Do-Now 3, the pairing 2, fog 1, the tour 2 → ch1 opens at minute 8; each chapter's
// turning beat is 3 s and the page's Next is one click
const pre = 8 * 60, turn = 3 + CLICK;
const home = pre + CHS.reduce((a, c) => a + slow[c] + turn, 0), homeL = pre + CHS.reduce((a, c) => a + slowL[c] + turn, 0);
CHS.forEach(c => gate(`walked ${c}`, isFinite(slow[c]), `slower seat ${slow[c].toFixed(1)} s (${worst[c]}) → B ${B[c]} s · with ladder ${slowL[c].toFixed(1)} s`));
gate('A11 Home by minute 47, ladder never triggered', home <= 47 * 60, `Home at ${(home / 60).toFixed(1)} min`);
gate('A11 Home by minute 52, every ladder step once a chapter', homeL <= 52 * 60, `Home at ${(homeL / 60).toFixed(1)} min`);
CHS.forEach(c => gate(`B ${c} fits its slot in §1`, B[c] <= ({ ch1: 8, ch2: 8, ch3: 9, ch4: 14 })[c] * 60, `${B[c]} s`));
// the stages before ch1 fit their targets (read at 0.35 s a word, films 1.2 s + 0.35 s a word)
const film = ids => ids.reduce((a, id) => a + 1.2 + read(TS.render(id, TS.S[id].ex || {})), 0);
const radioT = film(['cer.1', 'cer.2', 'cer.3', 'cer.4', 'cer.5']), fogT = film(['open.1', 'open.2', 'open.3', 'open.4']), tourT = film(['tour.1', 'tour.2', 'tour.3', 'tour.4', 'tour.5', 'tour.6', 'tour.last']);
gate('the pairing reads in 90 s or less', radioT <= 90, `${radioT.toFixed(1)} s`);
gate('the fog reads in 50 s or less', fogT <= 50, `${fogT.toFixed(1)} s`);
gate('the tour reads in 100 s or less', tourT <= 100, `${tourT.toFixed(1)} s`);
if (args.includes('--write') && !CONTROL && !bad) {
  const p = TW + '/engine.js'; let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/var BUDGETS = \{[^}]*\};/, `var BUDGETS = { ch1: ${B.ch1 * 1000}, ch2: ${B.ch2 * 1000}, ch3: ${B.ch3 * 1000}, ch4: ${B.ch4 * 1000} };`);
  fs.writeFileSync(p, s); rows.push(`wrote BUDGETS ${JSON.stringify(B)} (seconds) into engine.js`);
}
rows.forEach(r => console.log(r));
console.log(`B1–B4 = ${B.ch1}, ${B.ch2}, ${B.ch3}, ${B.ch4} s`);
console.log(bad ? `l5-walk-model: FAIL · ${bad} of ${rows.length}` : `l5-walk-model: PASS · ${rows.length} checks`);
process.exit(bad ? 1 : 0);
