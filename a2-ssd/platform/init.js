// init.js — Reasons for systems development (A2 1, bullets 1–3). Generic until March; in March the staff add the case study and pupils tie their points to it.
(function () {
  const IC = window.A2CONTENT.init; if (!IC) return;
  const PART = {}; IC.parts.forEach((p) => { PART[p.id] = p; });
  const ORDER = IC.parts.map((p) => p.id);
  const BULLETS = IC.bullets, BY = {}; BULLETS.forEach((b) => { BY[b.id] = b; });
  const LINE = {}; Object.keys(IC.pages).forEach((b) => IC.pages[b].sections.forEach((s) => s.lines.forEach((l) => { LINE[l[0]] = l[1]; })));
  const JOB = IC.JOB, HELP = IC.HELP;
  const NSLIDES = (IC.deckStates && IC.deckStates.length) || 46;
  const STATES = IC.deckStates || Array.from({ length: NSLIDES }, (_, i) => ({ slide: i + 1, states: 1 }));
  let A = null, IREC = { P: {}, G: {}, E: {} }, CS = null, EMAIL = '';
  const ST = {};      // per part, from the server: { text, labels, ttext, tie }
  const DOOR = {};    // door chosen before the lock: 1 = write it now
  let cur = null;     // what is on screen
  const root = () => document.getElementById('app');
  const app = { set innerHTML(v) { A.paint(v); }, get innerHTML() { return root().innerHTML; }, querySelector: (s) => root().querySelector(s), querySelectorAll: (s) => root().querySelectorAll(s) };
  const h = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // this topic's Help button says "Stuck? Show me" (audit Q25), not the other topics' label
  const header = (crumbs) => A.header(crumbs, true).replace(/(<button class="helpbtn"[^>]*>)[^<]*(<\/button>)/, '$1' + h(HELP.button) + '$2') + '<div id="sys"></div>';
  const C0 = () => [{ t: A.T('cw.crumbHome'), go: '#home' }, { t: IC.topic.tile, go: '#init' }];
  const rec = (id) => IREC.P[id] || {};
  const isInitHash = () => /^#(init|ipage|ipart|ieval|icase)(\/|$)/.test(location.hash);
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  // ---------- server ----------
  function busy(el) {
    if (!el) return () => {};
    el.disabled = true; el.setAttribute('aria-busy', 'true'); el.classList.add('busy');
    return () => { if (!el.isConnected) return; el.disabled = false; el.removeAttribute('aria-busy'); el.classList.remove('busy'); };
  }
  function take(r, req) {
    if (!r) return;
    if (r.rec) IREC = r.rec;
    if (r.cs !== undefined) CS = r.cs || null;
    if (r.part && req && req.part) IREC.P[req.part] = r.part;
  }
  function icall(req, btn) {
    const done = busy(btn), t0 = Date.now();
    const hold = (x) => new Promise((res) => setTimeout(() => res(x), Math.max(0, 300 - (Date.now() - t0))));
    return A.call('apiInit', req).then((r) => hold(r).then(() => { take(r, req); done(); return r; }), (e) => hold().then(() => { done(); throw e; }));
  }
  function fail(e) {
    const el = app.querySelector('[data-err]'); if (!el) return;
    el.textContent = e && e.code === 'offline' ? 'No connection. Try again in a moment.' : 'Something went wrong. Try again.';
  }
  // the server's copy of a part: her locked words, the point labels, her tie text
  function fetchState(id) {
    return icall({ op: 'state', part: id }).then((r) => { ST[id] = { text: r.text || '', labels: r.labels || null, ttext: r.ttext || '', tie: r.tie || null }; return ST[id]; });
  }

  // ---------- the deck ----------
  const DECKS = () => window.A2_DECKS || '';
  const deckKey = () => 'a2init:deck:' + EMAIL;
  function deckPos() { try { const v = JSON.parse(localStorage.getItem(deckKey()) || 'null'); if (v && v.s >= 1 && v.s <= NSLIDES) return v; } catch (e) { /* no storage */ } return { s: 1, k: 0 }; }
  function deckSave(p) { try { localStorage.setItem(deckKey(), JSON.stringify(p)); } catch (e) { /* no storage */ } }
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const slideSrc = (s, k) => DECKS() + pad(s) + (k ? '-' + k : '') + '.webp';
  const statesOf = (s) => (STATES[s - 1] && STATES[s - 1].states) || 1;
  function deckStep(dir) {
    const p = deckPos(); let s = p.s, k = p.k;
    if (dir > 0) { if (k + 1 < statesOf(s)) k++; else if (s >= NSLIDES) { const pl = app.querySelector('.ipages'); if (pl) pl.scrollIntoView({ behavior: 'smooth' }); return; } else { s = s + 1; k = 0; } }
    else { if (k > 0) k--; else { s = s <= 1 ? NSLIDES : s - 1; k = statesOf(s) - 1; } }
    deckSave({ s, k }); paintDeck();
  }
  function deckJump(s) { deckSave({ s, k: 0 }); paintDeck(); }
  const atEnd = (p) => p.s >= NSLIDES && p.k + 1 >= statesOf(p.s);
  function capText(p, n) { return atEnd(p) ? 'That’s the slides done. Now open page 1 below.' : 'Slide ' + p.s + ' of ' + NSLIDES + (n > 1 ? ' · ' + p.k + ' of ' + (n - 1) + ' reveals shown' : ''); }
  const nextText = (p) => (atEnd(p) ? 'Go to the pages' : 'Next');
  function deckHtml() {
    const p = deckPos(), n = statesOf(p.s);
    const dots = STATES.map((x) => '<span class="dot' + (x.slide === p.s ? ' on' : '') + '" data-dot="' + x.slide + '" role="button" tabindex="0" aria-label="Slide ' + x.slide + '"></span>').join('');
    return '<section class="card deck"><h2>' + h(IC.topic.deck) + '</h2>'
      + '<img class="slide" src="' + h(slideSrc(p.s, p.k)) + '" alt="Slide ' + p.s + ' of ' + NSLIDES + '">'
      + '<div class="row deckrow"><button class="btn sec" data-deck-back>Back</button><span class="cap" data-cap>' + capText(p, n) + '</span><button class="btn" data-deck-next>' + nextText(p) + '</button></div>'
      + '<div class="dots">' + dots + '</div></section>';
  }
  function paintDeck() {
    const img = app.querySelector('.deck img.slide'); if (!img) return;
    const p = deckPos(), n = statesOf(p.s);
    img.src = slideSrc(p.s, p.k); img.alt = 'Slide ' + p.s + ' of ' + NSLIDES;
    const cap = app.querySelector('[data-cap]'); if (cap) cap.textContent = capText(p, n);
    const nb = app.querySelector('[data-deck-next]'); if (nb) nb.textContent = nextText(p);
    app.querySelectorAll('.deck [data-dot]').forEach((d) => d.classList.toggle('on', +d.dataset.dot === p.s));
    // warm the next image
    const nx = new Image(); nx.src = p.k + 1 < n ? slideSrc(p.s, p.k + 1) : slideSrc(p.s >= NSLIDES ? 1 : p.s + 1, 0);
  }
  function wireDeck() {
    const b = app.querySelector('[data-deck-back]'), f = app.querySelector('[data-deck-next]');
    if (b) b.addEventListener('click', () => deckStep(-1));
    if (f) f.addEventListener('click', () => deckStep(1));
    app.querySelectorAll('.deck [data-dot]').forEach((d) => d.addEventListener('click', () => deckJump(+d.dataset.dot)));
  }
  document.addEventListener('keydown', (e) => {
    if (!cur || cur.k !== 'init' || cur.room !== 'know') return;
    const t = e.target;
    if (t && t.matches && t.matches('input, textarea, select')) return;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.matches && t.matches('[data-dot]')) { e.preventDefault(); t.click(); return; }
    if (e.key === 'ArrowRight') deckStep(1); else if (e.key === 'ArrowLeft') deckStep(-1);
  });

  // ---------- shared pieces ----------
  function marksLine(q) {
    // every kind is marked out of pm now; tm more come in March (A8, A11, A12)
    return q.tm ? plural(q.pm, 'mark', 'marks') + ' now, plus ' + q.tm + ' more in March' : plural(q.pm, 'mark', 'marks') + (q.kind === 'match' ? ' · choose the answers' : ' · tick the points');
  }
  function stateOf(q) {
    const p = rec(q.id);
    if (p.a) { const N = q.pm; return p.f === p.b ? 'First try ' + p.f + ' of ' + N : 'First try ' + p.f + ' of ' + N + ' · best ' + p.b + ' of ' + N; }
    if (p.k) return 'Written, not marked yet';
    return 'Not tried';
  }
  const srcLine = (q) => q.src + ' · ' + marksLine(q);
  // q given: only the cards from the year this question was asked (A1), and the cards with no year
  function sectionsHtml(b, q) {
    const all = IC.pages[b].sections, yr = q && (String(q.src).match(/\d{4}/) || [])[0];
    const mine = yr ? all.filter((s) => !s.yrs || String(s.yrs).indexOf(yr) >= 0) : all;
    return (mine.some((s) => s.yrs) ? mine : all).map((s) => '<section class="card psec"><h2>' + h(s.h) + (s.yrs ? ' <small class="yrs">' + h(s.yrs) + '</small>' : '') + '</h2><ul class="plines">'
      + s.lines.map((l) => '<li class="pline" data-line="' + h(l[0]) + '">' + h(l[1]) + '</li>').join('') + '</ul></section>').join('');
  }
  function askCard(q, withTie) {
    return '<div class="card askcard"><p class="meta">Question ' + (ORDER.indexOf(q.id) + 1) + ' of ' + ORDER.length + ' · ' + h(BY[q.b].short) + ' · ' + h(srcLine(q)) + '</p><q>' + h(q.ask) + '</q>'
      + (withTie && q.tie ? '<p class="tienote">' + h(q.tie) + '</p>' : '') + '</div>';
  }
  const errLine = () => '<p class="err" data-err></p>';
  const BANDS = [
    [3, '5–6', 'A full range of points, each explained clearly, in good English.'],
    [2, '3–4', 'Several points, most of them explained.'],
    [1, '1–2', 'A few points named, with little explanation.'],
    [0, '0', 'Nothing that earns a mark.']];
  function bandsHtml(band) {
    return '<table class="bands"><tr><th>Level</th><th>Marks</th><th>What the examiner looks for</th></tr>' + BANDS.map((r) => '<tr' + (r[0] === band ? ' class="on"' : '') + '><td>' + (r[0] ? 'Level ' + r[0] : 'Level 0') + '</td><td>' + r[1] + '</td><td>' + h(r[2]) + '</td></tr>').join('') + '</table>';
  }
  function flagBtn(q) {
    const on = !!rec(q.id).fl;
    return '<button class="flag' + (on ? ' on' : '') + '" data-flag>' + (on ? 'Your teacher will see you asked about ' + h(q.src) + ' ✓' : 'Ask your teacher about this question') + '</button>';
  }
  function wireFlag(q, beat) {
    const fl = app.querySelector('[data-flag]'); if (!fl) return;
    fl.addEventListener('click', () => { const on = rec(q.id).fl ? 0 : 1; icall({ op: 'flag', part: q.id, on, beat }, fl).then(() => { if (cur && cur.id === q.id) render(); }, fail); });
  }

  // ---------- views ----------
  const V = {};
  function render() { if (!cur) return; V[cur.k](); }

  // #init — three rooms
  V.init = () => {
    const room = cur.room;
    const pagesDone = BULLETS.filter((b) => IREC.G && IREC.G[b.id]).length;
    const tried = ORDER.filter((id) => rec(id).a).length;
    const rooms = '<div class="rooms" role="tablist">'
      + '<button class="room' + (room === 'know' ? ' on' : '') + '" role="tab" aria-selected="' + (room === 'know') + '" data-room="know" data-go="#init">' + h(IC.topic.rooms.know) + '<small>' + pagesDone + ' of 3 pages ticked</small></button>'
      + '<button class="room' + (room === 'apply' ? ' on' : '') + '" role="tab" aria-selected="' + (room === 'apply') + '" data-room="apply" data-go="#init/apply">' + h(IC.topic.rooms.apply) + '<small>' + tried + ' of ' + ORDER.length + ' questions tried</small></button>'
      + '<button class="room' + (room === 'march' ? ' on' : '') + '" role="tab" aria-selected="' + (room === 'march') + '" data-room="march" data-go="#init/march">' + h(IC.topic.rooms.march) + '<small>' + (CS ? h(CS.org) : 'opens in March') + '</small></button></div>';
    let body = '';
    if (room === 'know') {
      body = deckHtml() + '<h2 class="sect">The examiner’s points: three pages</h2><ul class="parts ipages">' + BULLETS.map((b, i) => {
        const done = !!(IREC.G && IREC.G[b.id]);
        return '<li' + (done ? ' class="done"' : '') + ' data-go="#ipage/' + b.id + '" tabindex="0" role="button"><span class="n">' + (i + 1) + '</span><span class="name"><b>' + h(b.short) + '</b><small>' + h(b.plain) + '</small></span><span class="state' + (done ? ' done' : '') + '">' + (done ? 'Ticked ✓' : 'Not ticked yet') + '</span></li>';
      }).join('') + '</ul>';
    } else if (room === 'apply') {
      body = BULLETS.map((b, i) => '<h2 class="sect">Page ' + (i + 1) + ' · ' + h(b.short) + '</h2><ul class="parts qs">' + IC.parts.filter((q) => q.b === b.id).map((q) =>
        '<li' + (rec(q.id).a || rec(q.id).k ? '' : ' class="nt"') + ' data-go="#ipart/' + q.id + '" tabindex="0" role="button"><span class="src">' + h(q.src) + '</span><span class="name">' + h(q.ask) + '</span><span class="marks">' + h(marksLine(q)) + '</span><span class="state">' + h(stateOf(q)) + '</span></li>').join('') + '</ul>').join('');
    } else {
      if (!CS) body = '<div class="card"><p class="marchempty">' + h(IC.topic.marchEmpty) + '</p></div>';
      else {
        body = '<div class="card cs"><h2>' + h(CS.org) + '</h2><div class="cstext">' + h(CS.text) + '</div></div>'
          + '<h2 class="sect">The exam tasks in March</h2><div class="tasks">' + IC.tasks.map((t) => '<div class="card task"><p class="meta">' + plural(t.marks, 'mark', 'marks') + '</p><p>' + h(t.ask) + '</p></div>').join('') + '</div>'
          + '<h2 class="sect">Tie your answers to ' + h(CS.org) + '</h2><ul class="parts qs">' + IC.parts.filter((q) => q.kind !== 'match').map((q) => {
            const p = rec(q.id);
            const st = p.ta ? 'Marked in March: first try ' + p.tf + ' of ' + q.marks + (p.tb !== p.tf ? ' · best ' + p.tb + ' of ' + q.marks : '') : p.k ? 'Ready to tie' : 'Write it first, in Apply it';
            return '<li data-go="#icase/' + q.id + '" tabindex="0" role="button"><span class="src">' + h(q.src) + '</span><span class="name">' + h(q.ask) + '</span><span class="marks">' + plural(q.marks, 'mark', 'marks') + '</span><span class="state">' + h(st) + '</span></li>';
          }).join('') + '</ul>';
      }
    }
    const job = room === 'know' ? JOB.know : room === 'apply' ? JOB.apply : CS ? JOB.march : JOB.marchEmpty;
    app.innerHTML = header(C0().slice(0, 1).concat([{ t: IC.topic.tile }])) + '<main class="init"><h1>' + h(IC.topic.tile) + '</h1><p class="sub">' + h(IC.topic.sub) + '</p>' + rooms + '<p class="job">' + h(job) + '</p>' + body + '</main>';
    if (room === 'know') { wireDeck(); paintDeck(); }
    // "Back to the pages" lands on the list, not the top of the deck (K4)
    if (room === 'know' && cur.toPages) { cur.toPages = false; const pl = app.querySelector('.ipages'); if (pl) pl.scrollIntoView(); }
  };

  // #ipage/<b> — the examiner's points and the quick check
  function drawQuick(b, exclude) {
    const all = IC.quick[b].map((_, i) => i);
    if (exclude && exclude.length === 3) return all.filter((i) => !exclude.includes(i)).sort(() => Math.random() - 0.5).slice(0, 3);
    return all.sort(() => Math.random() - 0.5).slice(0, 3);
  }
  V.ipage = () => {
    const b = cur.b, page = IC.pages[b], Q = cur.quick;
    let foot;
    if (!Q) foot = '<div class="card quickcard"><h2>Quick check</h2><p>' + h(IC.quickRule.line) + '</p><div class="row"><button class="btn" data-quick>Start the quick check</button></div></div>';
    else {
      const items = Q.items.map((qi, k) => { const q = IC.quick[b][qi]; return '<div class="item" data-i="' + qi + '"><p class="q"><b>' + (k + 1) + '.</b> ' + h(q.q) + '</p><div class="opts">' + q.o.map((o, j) => '<label><input type="radio" name="q' + k + '" value="' + j + '"' + (Q.picks[k] === j ? ' checked' : '') + (Q.result ? ' disabled' : '') + '> ' + h(o) + '</label>').join('') + '</div></div>'; }).join('');
      const ready = Q.picks.every((x) => x != null);
      let res = '';
      if (Q.result) {
        const bi = BULLETS.findIndex((x) => x.id === b), nb = BULLETS[bi + 1];
        const nextBtn = nb ? '<button class="btn" data-go="#ipage/' + nb.id + '">Next page: ' + h(nb.short) + '</button>' : '<button class="btn" data-go="#init/apply">Try a past question</button>';
        res = Q.result.pass ? '<div class="qresult"><p class="pass">All 3 right. This page is ticked ✓</p><div class="row">' + nextBtn + '<button class="btn sec" data-go="#init/pages">Back to the pages</button><button class="btn ghost" data-qmore>Three more questions</button></div></div>'
          : '<div class="qresult"><p class="miss">' + (3 - Q.result.wrong.length) + ' of 3 right. Read the line, then try three more.</p><ul class="wrong">' + Q.result.wrong.map((w) => '<li>Question ' + (Q.items.indexOf(w.i) + 1) + ': not right. See the line: “' + h(LINE[w.L] || '') + '”</li>').join('') + '</ul><div class="row"><button class="btn" data-qmore>Three more questions</button><button class="btn sec" data-go="#init/pages">Back to the pages</button></div></div>';
      }
      foot = '<div class="card quick"><h2>Quick check</h2>' + items + (Q.result ? '' : '<div class="row"><button class="btn" data-qcheck' + (ready ? '' : ' disabled') + '>Check my three answers</button>' + (ready ? '' : '<span class="why">Pick one answer for each question first.</span>') + '</div>') + errLine() + res + '</div>';
    }
    app.innerHTML = header(C0().concat([{ t: BY[b].short }])) + '<main class="init ipage"><h1>Page ' + b.slice(1) + ' of 3 · ' + h(BY[b].short) + '</h1><p class="spec">CCEA’s name for it: ' + h(BY[b].spec) + '</p><p class="job">' + h(Q ? JOB.quick : JOB.page) + '</p>' + sectionsHtml(b) + foot + (Q && Q.result && Q.result.pass ? '' : '<p class="pagefoot"><button class="btn ghost" data-go="#init/pages">Back to the pages</button></p>') + '</main>';
    const start = app.querySelector('[data-quick]'); if (start) start.addEventListener('click', () => { cur.quick = { items: drawQuick(b), picks: [null, null, null], result: null }; render(); app.querySelector('.quick').scrollIntoView(); });
    if (Q) {
      app.querySelectorAll('.quick input[type=radio]').forEach((r) => r.addEventListener('change', () => { Q.picks[+r.name.slice(1)] = +r.value; const btn = app.querySelector('[data-qcheck]'); if (btn && Q.picks.every((x) => x != null)) { btn.disabled = false; const w = btn.parentElement.querySelector('.why'); if (w) w.remove(); } }));
      const chk = app.querySelector('[data-qcheck]'); if (chk) chk.addEventListener('click', () => { icall({ op: 'quick', b, items: Q.items, picks: Q.picks }, chk).then((r) => { Q.result = { pass: !!r.pass, wrong: r.wrong || [] }; render(); app.querySelector('.qresult').scrollIntoView(); }, fail); });
      const more = app.querySelector('[data-qmore]'); if (more) more.addEventListener('click', () => { cur.quick = { items: drawQuick(b, Q.items), picks: [null, null, null], result: null }; render(); app.querySelector('.quick').scrollIntoView(); });
    }
  };

  // #ipart/<id> — the question, the doors, the lesson, the turn, another question
  function otherOf(id) {
    const q = PART[id], same = ORDER.filter((x) => PART[x].b === q.b);
    return same[(same.indexOf(id) + 1) % same.length];
  }
  function partCrumbs(q, more) {
    return C0().concat([{ t: IC.topic.rooms.apply, go: '#init/apply' }], more ? [{ t: PART[more].src, go: '#ipart/' + more }, { t: q.src }] : [{ t: q.src }]);
  }
  V.ipart = () => {
    const id = cur.id, q = PART[id], beat = cur.beat;
    if (beat === 'lesson') return vLesson(q);
    if (beat === 'turn') return vTurn(q);
    const p = rec(id);
    let doors;
    if (p.k || p.a) doors = '<div class="row"><button class="btn" data-go="#ipart/' + id + '/turn">' + (q.kind === 'match' ? 'See your answer' : 'See your answer and marks') + '</button><button class="btn sec" data-go="#ipart/' + id + '/lesson">The lesson</button></div>';
    else doors = '<div class="doors"><button class="door" data-door="learn"><b>Learn it first</b><span>Read the examiner’s points, then answer.</span></button><button class="door" data-door="write"><b>' + (q.kind === 'match' ? 'Answer it now' : 'Write it now') + '</b><span>' + (q.kind === 'match' ? 'Choose your answers, then check them.' : 'Write as in the exam, then tick your points.') + '</span></button></div>';
    const back = cur.more ? '<p><button class="btn ghost" data-go="#ipart/' + h(cur.more) + '">Back to the question you did</button></p>' : '';
    app.innerHTML = header(partCrumbs(q, cur.more)) + '<main class="init ipart"><h1>' + h(q.src) + '</h1><p class="job">' + h(cur.more ? JOB.beat4 : (p.k || p.a) ? JOB.beat1done : JOB.beat1) + '</p>' + askCard(q, true) + doors + back + '</main>';
    app.querySelectorAll('[data-door]').forEach((d) => d.addEventListener('click', () => { DOOR[id] = d.dataset.door === 'write' ? 1 : 0; A.go('#ipart/' + id + (d.dataset.door === 'write' ? '/turn' : '/lesson')); }));
  };
  function vLesson(q) {
    app.innerHTML = header(partCrumbs(q).concat([{ t: 'The lesson' }])) + '<main class="init ipage"><h1>The lesson · ' + h(BY[q.b].short) + '</h1><p class="job">' + h(JOB.beat2) + '</p>' + askCard(q, false) + sectionsHtml(q.b, q)
      + '<div class="row foot"><button class="btn" data-go="#ipart/' + q.id + '/turn">' + (q.kind === 'match' ? 'Answer it now' : 'Write it now') + '</button></div></main>';
  }
  // drafts before the lock live in this browser only
  const draftKey = (id) => 'a2init:draft:' + EMAIL + ':' + id;
  function draftGet(id) { try { return JSON.parse(localStorage.getItem(draftKey(id)) || 'null') || []; } catch (e) { return []; } }
  function draftPut(id, arr) { try { localStorage.setItem(draftKey(id), JSON.stringify(arr)); } catch (e) { /* no storage */ } }
  function storyText(q, boxes) { return q.fields.map((f, k) => f.lead + ' ' + (boxes[k] || '').trim()).join('\n'); }
  function vTurn(q) {
    const id = q.id, p = rec(id), crumbs = partCrumbs(q).concat([{ t: q.kind === 'match' ? 'Your answer' : 'Your writing' }]);
    const shell = (job, inner) => { app.innerHTML = header(crumbs) + '<main class="init iturn"><h1>' + h(q.src) + '</h1><p class="job">' + h(job) + '</p>' + askCard(q, true) + inner + '</main>'; };
    if (q.kind === 'match') return vMatch(q, shell);
    if (p.k && !ST[id]) { shell(JOB.marks, '<div class="card"><p>Loading your answer<span class="dots"></span></p></div>'); fetchState(id).then(() => { if (cur && cur.id === id && cur.beat === 'turn') render(); }, () => { if (cur && cur.id === id) fail({}); }); return; }
    const S = ST[id];
    if (!(p.k && S && S.labels)) {
      // before the lock: write
      const d = draftGet(id);
      let boxes;
      if (q.kind === 'story') boxes = q.fields.map((f, k) => '<div class="story"><p class="lead">' + h(f.lead) + '</p><textarea class="prose" data-write data-k="' + k + '" rows="3" placeholder="I want …, so that …">' + h(d[k] || '') + '</textarea></div>').join('');
      else boxes = '<label class="lbl" for="w0">Your answer</label><textarea class="prose" id="w0" data-write data-k="0" rows="9" placeholder="Write as you would on the exam paper.">' + h(d[0] || '') + '</textarea>';
      const full = () => [...app.querySelectorAll('textarea[data-write]')].every((t) => t.value.trim().length > 0);
      shell(JOB.beat3, '<div class="card write">' + boxes + '<div class="row"><button class="btn" data-lock disabled>I’ve written my answer</button><span class="why">Write your answer first.</span></div>' + errLine() + '</div>' + flagBtn(q));
      const lock = app.querySelector('[data-lock]'), why = lock.parentElement.querySelector('.why');
      const sync = () => { const ok = full(); lock.disabled = !ok; why.hidden = ok; };
      app.querySelectorAll('textarea[data-write]').forEach((t) => t.addEventListener('input', () => { draftPut(id, [...app.querySelectorAll('textarea[data-write]')].map((x) => x.value)); sync(); }));
      sync();
      lock.addEventListener('click', () => {
        const vals = [...app.querySelectorAll('textarea[data-write]')].map((x) => x.value);
        const text = q.kind === 'story' ? storyText(q, vals) : vals[0];
        icall({ op: 'lock', part: id, text, door: DOOR[id] || 0 }, lock).then((r) => { ST[id] = { text, labels: r.labels || [], ttext: '', tie: null }; cur.ticks = []; cur.verdict = null; try { localStorage.removeItem(draftKey(id)); } catch (e) { /* fine */ } render(); }, fail);
      });
      wireFlag(q, 'turn');
      return;
    }
    // after the lock: her words read-only, the tick list, marks
    try { localStorage.removeItem(draftKey(id)); } catch (e) { /* fine */ }
    if (!cur.ticks) cur.ticks = (p.t || []).slice();
    const marked = !!cur.verdict;
    const waits = (l) => l.tie && !CS;   // a case-study point cannot be ticked before March (A9)
    cur.ticks = cur.ticks.filter((i) => !(S.labels[i] && waits(S.labels[i])));
    const ticks = '<ul class="ticks">' + S.labels.map((l, i) => '<li' + (waits(l) ? ' class="waits"' : '') + '><label data-tick="' + i + '"><input type="checkbox" value="' + i + '"' + (cur.ticks.includes(i) ? ' checked' : '') + (marked || waits(l) ? ' disabled' : '') + '> <span>' + h(l.l) + (l.tie ? ' <small class="tag">' + (CS ? 'March' : 'March: tick it then') + '</small>' : '') + (l.auto ? ' <small class="tag">read from your words</small>' : '') + '</span></label></li>').join('') + '</ul>';
    let marks = '';
    if (marked) {
      const v = cur.verdict;
      const isLv = q.kind === 'levels';
      const score = isLv ? v.mark + ' <small>of 6 marks</small>' : v.pts + ' <small>of ' + q.pm + ' marks for the points</small>';
      const march = q.tm ? 'In March this question is worth ' + q.marks + ' marks: ' + q.tm + ' more for tying your points to the case study.' : '';
      marks = '<div class="card marks"><h2>Your examiner’s marks</h2><p class="score">' + score + '</p>' + (isLv ? bandsHtml(v.band) : '') + (march ? '<p class="march">' + h(march) + '</p>' : '') + '<p class="hist">' + (p.a === 1 ? 'Marked once.' : 'Marked ' + p.a + ' times · first ' + p.f + ' · best ' + p.b + '.') + '</p>'
        + '<div class="row"><button class="btn sec" data-fix>Fix my ticks</button><button class="btn sec" data-show>Show the examiner’s answer</button><button class="btn ghost" data-go="#ipart/' + id + '/more">Another question</button><button class="btn ghost" data-go="#ieval/' + id + '">How did it go?</button></div>' + errLine() + '</div>';
      if (cur.model) marks += '<div class="card exampl"><h2>The examiner’s answer</h2><p class="model">' + h(cur.model) + '</p></div>';
    } else if (p.a) marks = '<p class="hist">Marked ' + (p.a === 1 ? 'once' : p.a === 2 ? 'twice' : p.a + ' times') + ' before: first try ' + p.f + ' of ' + q.pm + ' · best ' + p.b + ' of ' + q.pm + '.</p>';
    const lockedBox = '<p class="lockedtext">' + h(S.text) + '</p>';
    shell(JOB.marks, '<div class="card write locked"><p class="meta">Your answer, locked</p>' + lockedBox + '</div><div class="card tickcard"><h2>Tick the points you made</h2>' + ticks + (marked ? '' : '<div class="row"><button class="btn" data-mark>Mark my ticks</button><span class="why" data-noticks' + (cur.ticks.length ? ' hidden' : '') + '>No ticks yet: check your writing against each point.</span></div>' + errLine()) + '</div>' + marks + flagBtn(q));
    app.querySelectorAll('.ticks input').forEach((c) => c.addEventListener('change', () => { const i = +c.value; cur.ticks = cur.ticks.filter((x) => x !== i); if (c.checked) cur.ticks.push(i); const nt = app.querySelector('[data-noticks]'); if (nt) nt.hidden = cur.ticks.length > 0; }));
    const mk = app.querySelector('[data-mark]'); if (mk) mk.addEventListener('click', () => { icall({ op: 'mark', part: id, ticks: cur.ticks.slice().sort((a, b) => a - b) }, mk).then((r) => { cur.verdict = r.verdict; render(); app.querySelector('.card.marks').scrollIntoView(); }, fail); });
    const fx = app.querySelector('[data-fix]'); if (fx) fx.addEventListener('click', () => { cur.verdict = null; cur.model = null; render(); const tc = app.querySelector('.tickcard'); if (tc) tc.scrollIntoView(); });
    const sh = app.querySelector('[data-show]'); if (sh) sh.addEventListener('click', () => { icall({ op: 'answer', part: id }, sh).then((r) => { cur.model = r.model || ''; render(); app.querySelector('.card.exampl').scrollIntoView(); }, fail); });
    wireFlag(q, 'turn');
  }
  function vMatch(q, shell) {
    const id = q.id, p = rec(id), picks = cur.picks || (cur.picks = q.rows.map(() => null));
    if (cur.verdict) {
      const v = cur.verdict;
      shell(JOB.checked, '<div class="card marks"><h2>Your marks</h2><p class="score">' + v.score + ' <small>of ' + q.pm + ' marks</small></p><ul class="check">' + q.rows.map((r, i) => '<li class="' + (v.ok[i] ? 'hit' : 'miss') + '"><b>' + h(r.text) + ':</b> ' + h(r.opts[picks[i]]) + (v.ok[i] ? '' : (v.hints && v.hints[i] ? ' — ' + h(v.hints[i]) : '')) + '</li>').join('') + '</ul>'
        + '<p class="hist">' + (p.a === 1 ? 'Checked once.' : 'Checked ' + p.a + ' times · first try ' + p.f + ' of ' + q.pm + ' · best ' + p.b + ' of ' + q.pm + '.') + '</p>'
        + '<div class="row"><button class="btn sec" data-again>Try again</button><button class="btn ghost" data-go="#ipart/' + id + '/more">Another question</button><button class="btn ghost" data-go="#ieval/' + id + '">How did it go?</button></div></div>' + flagBtn(q));
      app.querySelector('[data-again]').addEventListener('click', () => { const ok = v.ok || []; cur.verdict = null; cur.picks = picks.map((x, i) => (ok[i] ? x : null)); render(); });
      wireFlag(q, 'turn'); return;
    }
    const rows = q.rows.map((r, i) => '<div class="mrow"><label for="m' + i + '">' + h(r.text) + '</label><select data-row="' + i + '" id="m' + i + '"><option value="">Choose…</option>' + r.opts.map((o, j) => '<option value="' + j + '"' + (picks[i] === j ? ' selected' : '') + '>' + h(o) + '</option>').join('') + '</select></div>').join('');
    const ready = picks.every((x) => x != null);
    shell(JOB.choose, '<div class="card match">' + rows + '<div class="row"><button class="btn" data-check' + (ready ? '' : ' disabled') + '>Check my choices</button><span class="why"' + (ready ? ' hidden' : '') + '>Choose one option for each row first.</span></div>' + errLine() + (p.a ? '<p class="hist">Checked ' + (p.a === 1 ? 'once' : p.a + ' times') + ' before: first try ' + p.f + ' of ' + q.pm + ' · best ' + p.b + ' of ' + q.pm + '.</p>' : '') + '</div>' + flagBtn(q));
    const chk = app.querySelector('[data-check]'), why = chk.parentElement.querySelector('.why');
    app.querySelectorAll('select[data-row]').forEach((s) => s.addEventListener('change', () => { picks[+s.dataset.row] = s.value === '' ? null : +s.value; const ok = picks.every((x) => x != null); chk.disabled = !ok; why.hidden = ok; }));
    chk.addEventListener('click', () => { icall({ op: 'check', part: id, picks, door: DOOR[id] || 0 }, chk).then((r) => { cur.verdict = r.verdict; render(); }, fail); });
    wireFlag(q, 'turn');
  }

  // #icase/<id> — March: tie the generic answer to the case study
  V.icase = () => {
    const id = cur.id, q = PART[id], p = rec(id);
    const crumbs = C0().concat([{ t: IC.topic.rooms.march, go: '#init/march' }, { t: q.src }]);
    const shell = (inner) => { app.innerHTML = header(crumbs) + '<main class="init icase"><h1>' + h(q.src) + '</h1><p class="job">' + h(JOB.march) + '</p>' + inner + '</main>'; };
    if (!CS) { shell('<div class="card"><p class="marchempty">' + h(IC.topic.marchEmpty) + '</p><div class="row"><button class="btn" data-go="#init">Back to the topic</button></div></div>'); return; }
    if (!p.k) { shell(askCard(q, false) + '<div class="card"><p>Write your answer first, in Apply it. Then come back here and tie it to ' + h(CS.org) + '.</p><div class="row"><button class="btn" data-go="#ipart/' + id + '">Open the question</button></div></div>'); return; }
    if (!ST[id]) { shell('<div class="card"><p>Loading your answer<span class="dots"></span></p></div>'); fetchState(id).then(() => { if (cur && cur.id === id && cur.k === 'icase') render(); }, () => fail({})); return; }
    const S = ST[id];
    const csCard = '<div class="card cs"><h2>' + h(CS.org) + '</h2><div class="cstext">' + h(CS.text) + '</div></div>';
    const mine = '<div class="card mine"><h2>Your answer from before March</h2><p>' + h(S.text) + '</p></div>';
    let tie;
    if (!S.ttext) {
      tie = '<div class="card tiecard"><p class="lead">' + h(IC.marchBox.replace('{org}', CS.org)) + '</p><textarea class="prose" data-tiebox rows="7" placeholder="Name the people, documents, places and numbers from the case study."></textarea><div class="row"><button class="btn" data-tielock disabled>I’ve tied my points</button><span class="why">Write your ties first.</span></div>' + errLine() + '</div>';
    } else {
      if (!cur.tieTicks) cur.tieTicks = (p.tt || []).slice();
      const genTicks = p.t || [];
      const n = S.tie ? S.tie.n : 0, used = S.tie ? S.tie.used : [];
      const counter = n ? IC.marchCount.replace('{n}', n).replace('details', n === 1 ? 'detail' : 'details').replace('{list}', used.join(', ')) : 'You used 0 details from the case study yet. Name people, documents, places or numbers.';
      const marked = !!cur.tverdict;
      const list = '<ul class="ticks tieticks">' + S.labels.map((l, i) => '<li><label data-tie="' + i + '"><input type="checkbox" value="' + i + '"' + (cur.tieTicks.includes(i) ? ' checked' : '') + (marked ? ' disabled' : '') + '> <span>' + h(l.l) + '</span></label><span class="gen' + (genTicks.includes(i) ? ' on' : '') + '">' + (genTicks.includes(i) ? 'Made before March ✓' : 'Not ticked before') + '</span></li>').join('') + '</ul>';
      let marks = '';
      if (marked) {
        const v = cur.tverdict, isLv = q.kind === 'levels';
        marks = '<div class="card marks"><h2>Your March marks</h2><p class="score">' + (isLv ? v.mark : v.total) + ' <small>of ' + q.marks + ' marks</small></p>' + (isLv ? bandsHtml(v.band) : '<p class="meta">' + (v.pts) + ' for the points + ' + (v.tie || 0) + ' for tying them to ' + h(CS.org) + '.</p>') + '<p class="hist">' + (p.ta === 1 ? 'Marked once in March.' : 'Marked ' + (p.ta === 2 ? 'twice' : p.ta + ' times') + ' in March: first try ' + p.tf + ' of ' + q.marks + ' · best ' + p.tb + ' of ' + q.marks + '.') + '</p><div class="row"><button class="btn sec" data-tiefix>Fix my ties</button><button class="btn ghost" data-go="#init/march">Back to the case study</button></div></div>';
      }
      tie = '<div class="card tiecard"><h2>Your answer about ' + h(CS.org) + '</h2><p class="counter">' + h(counter) + '</p><p class="tied">' + h(S.ttext) + '</p><h2>Tick each point you tied to the case study</h2>' + list + (marked ? '' : '<div class="row"><button class="btn" data-tiemark>Mark me in March</button></div>' + errLine()) + '</div>' + marks;
    }
    shell(csCard + askCard(q, false) + mine + tie);
    const tb = app.querySelector('textarea[data-tiebox]'), tl = app.querySelector('[data-tielock]');
    if (tb && tl) {
      const why = tl.parentElement.querySelector('.why');
      tb.addEventListener('input', () => { const ok = tb.value.trim().length > 0; tl.disabled = !ok; why.hidden = ok; });
      tl.addEventListener('click', () => { const text = tb.value; icall({ op: 'tielock', part: id, text }, tl).then((r) => { S.ttext = text; S.tie = { n: r.n | 0, used: r.used || [] }; if (r.labels) S.labels = r.labels; cur.tieTicks = []; cur.tverdict = null; render(); }, fail); });
    }
    app.querySelectorAll('.tieticks input').forEach((c) => c.addEventListener('change', () => { const i = +c.value; cur.tieTicks = cur.tieTicks.filter((x) => x !== i); if (c.checked) cur.tieTicks.push(i); }));
    const tm = app.querySelector('[data-tiemark]'); if (tm) tm.addEventListener('click', () => { icall({ op: 'tie', part: id, text: S.ttext, ticks: (p.t || []).slice(), tieTicks: cur.tieTicks.slice().sort((a, b) => a - b) }, tm).then((r) => { cur.tverdict = r.verdict; render(); app.querySelector('.card.marks').scrollIntoView(); }, fail); });
    const tf = app.querySelector('[data-tiefix]'); if (tf) tf.addEventListener('click', () => { cur.tverdict = null; render(); });
  };

  // #ieval/<id> — one line to the teacher, once per question
  V.ieval = () => {
    const id = cur.id, q = PART[id], sent = IREC.E && IREC.E[id];
    const crumbs = partCrumbs(q).concat([{ t: 'How did it go?' }]);
    const shell = (inner) => { app.innerHTML = header(crumbs) + '<main class="init ev"><h1>How did it go?</h1><p class="job">' + h(JOB.verdict) + '</p>' + askCard(q, false) + inner + '</main>'; };
    const VW = { can: 'I can', getting: 'Getting there', not: 'Not yet' };
    if (sent) { const fresh = cur.justSent; shell('<div class="card sentcard"><p>' + (fresh ? 'Sent to your teacher ✓ ' : 'You sent this already: ') + '<b>' + h(VW[sent.v] || sent.v) + '</b>' + (sent.c ? ' — “' + h(sent.c) + '”' : '') + '</p><p class="meta">' + (fresh ? 'Your teacher can see it now. You send it once for each question.' : 'Your teacher saw it the first time. You send it once for each question.') + '</p><div class="row"><button class="btn" data-go="#ipart/' + id + '/more">Another question</button><button class="btn sec" data-go="#init/apply">Back to Apply it</button></div></div>'); return; }
    const ans = cur.ans || (cur.ans = { v: null, c: '' });
    shell('<div class="card"><div class="line"><span>Could you answer this question in the exam?</span><span class="seg">' + Object.keys(VW).map((k) => '<button data-v="' + k + '"' + (ans.v === k ? ' class="on"' : '') + '>' + VW[k] + '</button>').join('') + '</span></div>'
      + '<label class="lbl">One line to your teacher<textarea class="comment" data-c maxlength="60" rows="2" placeholder="Up to 60 letters">' + h(ans.c) + '</textarea><span class="count" data-count>' + ans.c.length + ' / 60</span></label>'
      + '<div class="row"><button class="btn" data-send' + (ans.v ? '' : ' disabled') + '>Send to my teacher</button><span class="why"' + (ans.v ? ' hidden' : '') + '>Choose I can, Getting there or Not yet first.</span></div>' + errLine() + '</div>');
    const send = app.querySelector('[data-send]'), why = send.parentElement.querySelector('.why');
    app.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { ans.v = b.dataset.v; app.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); send.disabled = false; why.hidden = true; }));
    const c = app.querySelector('[data-c]'); c.addEventListener('input', () => { ans.c = c.value.slice(0, 60); app.querySelector('[data-count]').textContent = ans.c.length + ' / 60'; });
    send.addEventListener('click', () => { icall({ op: 'eval', part: id, v: ans.v, c: ans.c }, send).then(() => { cur.ans = null; cur.justSent = true; render(); }, fail); });
  };

  // ---------- help (the same panel as the other topics, with this topic's lines) ----------
  function helpKey() {
    if (!cur) return 'home';
    if (cur.k === 'init') return cur.room === 'apply' ? 'apply' : cur.room === 'march' ? (CS ? 'march' : 'marchEmpty') : 'know';
    if (cur.k === 'ieval') return IREC.E && IREC.E[cur.id] ? 'sent' : 'verdict';
    if (cur.k === 'ipage') return cur.quick ? 'quick' : 'page';
    if (cur.k === 'icase') return CS ? 'march' : 'marchEmpty';
    if (cur.k === 'ipart') {
      const kind = PART[cur.id] ? PART[cur.id].kind : 'prose';
      if (cur.beat === 'lesson') return 'lesson';
      if (cur.beat === 'turn') return kind === 'story' ? 'story' : kind === 'match' ? 'match' : 'beat3';
      return 'door';
    }
    return 'apply';
  }
  // the thing to press next gets a gold ring while the help is open
  const RING = {
    know: ['[data-deck-next]', '.ipages li:not(.done)'], page: ['[data-quick]'],
    quick: ['[data-qmore]', '.qresult .btn', '[data-qcheck]:not([disabled])', '.quick .item'],
    apply: ['.qs li.nt', '.qs li'], door: ['[data-door=learn]'], lesson: ['.foot .btn'],
    beat3: ['[data-lock]:not([disabled])', 'textarea[data-write]:not([readonly])', '[data-mark]', '[data-show]'],
    story: ['[data-lock]:not([disabled])', 'textarea[data-write]:not([readonly])', '[data-mark]', '[data-show]'],
    match: ['[data-check]:not([disabled])', 'select[data-row]', '[data-again]'],
    march: ['.tasks', '[data-tielock]', '[data-tiemark]'], marchEmpty: ['[data-room=know]'],
    verdict: ['.seg button', '[data-send]'], sent: ['.sentcard .btn'], home: ['[data-room=know]']
  };
  function ringOn(key) {
    const sels = RING[key] || [];
    for (const sel of sels) { const el = app.querySelector(sel); if (el) { el.classList.add('helpring'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; } }
  }
  function ringOff() { document.querySelectorAll('.helpring').forEach((e) => e.classList.remove('helpring')); }
  function closeHelp() { ringOff(); const p = document.querySelector('.helppanel'); if (p) p.remove(); const b = document.querySelector('[data-help]'); if (b) b.setAttribute('aria-expanded', 'false'); }
  function toggleHelp() {
    if (document.querySelector('.helppanel')) return closeHelp();
    const hd = document.querySelector('header.bar'); if (!hd) return;
    hd.insertAdjacentHTML('afterend', '<aside class="helppanel" role="region" aria-label="Help"><ul>' + (HELP[helpKey()] || HELP.home).map((l) => '<li>' + h(l) + '</li>').join('') + '</ul><div class="row"><button class="btn sec" data-helpclose>' + h(HELP.close) + '</button></div></aside>');
    const b = document.querySelector('[data-help]'); if (b) b.setAttribute('aria-expanded', 'true');
    ringOn(helpKey());
  }
  // capture phase, so the other topics' help listeners never see a click on this topic's screens
  document.addEventListener('click', (e) => {
    if (!isInitHash()) return;
    const hb = e.target.closest('[data-help]'), hc = e.target.closest('[data-helpclose]');
    if (!hb && !hc) return;
    e.stopPropagation(); e.preventDefault();
    if (hb) toggleHelp(); else closeHelp();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isInitHash()) closeHelp(); });

  // ---------- routing ----------
  function route(k, bits) {
    closeHelp();
    const same = cur && cur.k === k && cur.id === bits[1] && cur.beat === (bits[2] || null);
    if (k === 'init') { cur = { k, room: bits[1] === 'apply' ? 'apply' : bits[1] === 'march' ? 'march' : 'know', toPages: bits[1] === 'pages' }; render(); icall({ op: 'state' }).then(() => { if (cur && cur.k === 'init') render(); }, () => {}); return; }
    if (k === 'ipage') { if (!IC.pages[bits[1]]) return A.go('#init'); cur = { k, b: bits[1], quick: null }; return render(); }
    if (!PART[bits[1]]) return A.go('#init/apply');
    if (k === 'ipart') {
      if (bits[2] === 'more') { const o = otherOf(bits[1]); cur = { k, id: o, beat: null, more: bits[1] }; return render(); }
      const beat = bits[2] === 'lesson' || bits[2] === 'turn' ? bits[2] : null;
      if (!same) cur = { k, id: bits[1], beat, ticks: null, verdict: null, model: null, picks: null };
      return render();
    }
    if (k === 'icase') { if (!same) cur = { k, id: bits[1], beat: null, tieTicks: null, tverdict: null }; return render(); }
    if (k === 'ieval') { cur = { k, id: bits[1], beat: null, ans: null }; return render(); }
  }
  function tileHtml() {
    const pages = BULLETS.filter((b) => IREC.G && IREC.G[b.id]).length, tried = ORDER.filter((id) => rec(id).a).length;
    const state = !pages && !tried ? A.T('home.notStarted') : pages + ' of 3 pages ticked · ' + tried + ' of ' + ORDER.length + ' questions tried';
    return '<button class="tile live" data-go="#init"><h2>' + h(IC.topic.tile) + '</h2><p>' + h(IC.topic.sub) + '</p><span class="state">' + h(state) + '</span></button>';
  }
  function mount(api, boot, email) { A = api; EMAIL = email || ''; if (boot) take(boot, {}); }
  window.INIT = { mount, route, tileHtml, take, helpLines: () => HELP[helpKey()] || [] };
})();
