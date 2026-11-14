/* hub.js — v11 (11 Nov 2026): a topic's own page. Every Unit 1 topic now holds its slide sets, its activities, its exam
 * questions (the topics with a bank) and "How did this topic go?". The page is the parent of each activity: the activity
 * (on GitHub Pages, s1_platform/bridge.js) posts its score up, this page queues it and saves it with apiLessons, so a lost
 * connection never loses a score (the AS theory pattern: a queue kept in the browser, tried again every 15 seconds).
 * The server keeps the first score, the best score and the number of goes; the slide sets keep the last slide seen. */
var Hub = (function () {
  var L = S1L.S, T = App.t, h = T.h, fmt = T.fmt, el = T.el, wire = T.wire;
  var EPOCH = 1767225600000; // tmin_ in Code.gs counts minutes from 1 Jan 2026
  // the slides and activities come from GitHub Pages; on this computer's dev server ?actbase= may point at a local copy
  var BASE = S1L.base;
  try { var mb = /[?&]actbase=([^&#]+)/.exec(location.search); if (mb) { var b0 = decodeURIComponent(mb[1]); if (/^http:\/\/(localhost|127\.0\.0\.1):\d+\/$/.test(b0)) BASE = b0; } } catch (e) {}
  var ORIGIN = BASE.replace(/^(https?:\/\/[^\/]+).*$/, "$1");
  function LT(id) { return S1L.topics.filter(function (t) { return t.id === id; })[0]; }
  function pathIs(p, ap) { var want = "/" + ap; try { p = decodeURIComponent(String(p || "")); } catch (x) { return false; } return p.length >= want.length && p.slice(-want.length) === want; }
  function actByPath(p) { var o = null; S1L.topics.forEach(function (t) { t.acts.forEach(function (a) { if (!o && a.path && pathIs(p, a.path)) o = { t: t, a: a }; }); }); return o; }
  function actOf(id) { var o = null; S1L.topics.forEach(function (t) { t.acts.forEach(function (a) { if (a.id === id) o = { t: t, a: a }; }); }); return o; }
  function deckOf(id) { var o = null; S1L.topics.forEach(function (t) { t.decks.forEach(function (d) { if (d.id === id) o = { t: t, d: d }; }); }); return o; }
  function me() { return T.me(); }
  function LS() { var m = me(); if (!m.lessons) m.lessons = { a: {}, s: {}, p: {} }; ["a", "s", "p"].forEach(function (k) { if (!m.lessons[k]) m.lessons[k] = {}; }); return m.lessons; }
  function isOpen(id) { var c = (me().cat || []).filter(function (x) { return x.id === id; })[0]; return !!(c && c.open); }
  function bankOf(id) { return (me().topics || []).filter(function (t) { return t.id === id; })[0] || null; }
  function tmin() { return Math.floor((Date.now() - EPOCH) / 60000); }
  function day(t) { try { return new Date(EPOCH + t * 60000).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return ""; } }
  function pad2(i) { return (i < 10 ? "0" : "") + i; }
  function slideUrl(d, i, k) { return BASE + "s1_platform/decks/" + d + "/" + pad2(i) + (k == null ? "" : "-" + k) + ".webp"; } // k: the picture after k clicks
  function actUrl(a, embed) { return BASE + a.path + (embed ? "?embed=1" : ""); }
  function crumb(t, last) { return T.crumbHome() + ' · <a id="cHub">' + h(t.title) + '</a>' + (last ? ' · ' + h(last) : ''); }
  function wireCrumb(t) { wire("cHome", T.home); wire("cHub", function () { topic(t.id); }); }
  // the exam-question line for one topic's current round, on the home tile and the topic page
  function examSum(b) { var n = b.round, r = b.rounds[n] || { s: {} }, o = { n: n, a: 0, m: 0, x: 0, q: 0, done: !!r.done };
    Object.keys(r.s).forEach(function (st) { o.a += r.s[st].a; o.m += r.s[st].m; o.x += r.s[st].x; o.q += r.s[st].n; });
    o.line = fmt(n > 1 ? L.exRoundOpen : L.exRound, { n: n }) + " · " + (o.done ? fmt(L.exDone, { m: o.m, x: o.x }) : o.a ? fmt(L.exPart, { a: o.a, q: o.q }) : L.exNone); return o; }
  // Help: a link beside the job line opens the lines that say how this screen works
  function job(line, help) { return '<p class="sub job">' + h(line) + ' <button type="button" class="link hbtn" id="hbtn" aria-expanded="false">' + h(L.help) + '</button></p><div class="card tight helpbox" id="hbox" hidden><ul>' + help.map(function (x) { return '<li>' + h(x) + '</li>'; }).join("") + '</ul><button type="button" class="link" id="hclose">' + h(L.helpClose) + '</button></div>'; }
  function wireHelp() { var b = document.getElementById("hbtn"), x = document.getElementById("hbox"); if (!b || !x) return; function set(on) { x.hidden = !on; b.setAttribute("aria-expanded", on ? "true" : "false"); } b.onclick = function () { set(x.hidden); }; wire("hclose", function () { set(false); b.focus(); }); }

  // ---- the queue: every slide and score goes through it, so nothing is lost when the connection drops ----
  var MEM = [], INFL = [], qBusy = false, qT = null, onQ = null;
  function qKey() { return "s1q:" + (me().email || "") + ":" + (T.boot.cls || ""); }
  function qLoad() { try { var v = JSON.parse(localStorage.getItem(qKey()) || "null"); if (Array.isArray(v)) return v; } catch (e) {} return MEM.slice(); }
  function qSave(q) { q = q.slice(-80); MEM = q.slice(); try { localStorage.setItem(qKey(), JSON.stringify(q)); } catch (e) {} }
  function uid() { return ((Date.now() % 6e7).toString(36) + Math.random().toString(36).slice(2, 7)).slice(0, 10); } // short: the server keeps her last 40 to count a resent score once
  function applyLocal(o) { // the screen shows a score at once; the server's answer replaces this when it comes back
    var Ls = LS(), now = tmin();
    if (o.op === "finish") { var A = actOf(o.id); if (!A) return; var s = o.s, m = o.m, e = Ls.a[o.id];
      if (!e) e = Ls.a[o.id] = [s, m, s, m, 0, now]; else if (m && (!e[3] || s * e[3] > e[2] * m || (s * e[3] === e[2] * m && m > e[3]))) { e[2] = s; e[3] = m; }
      e[4] = (e[4] || 0) + 1; e[5] = now; }
    if (o.op === "slide") { var D = deckOf(o.deck); if (!D) return; var g = Ls.s[o.deck] || [1, 1, now]; g[0] = o.i; g[1] = Math.max(g[1] || 1, o.f || o.i); g[2] = now; Ls.s[o.deck] = g; Ls.p[D.t.id] = "d:" + o.deck; }
    if (o.op === "at") { var B = actOf(o.id); if (B) Ls.p[B.t.id] = "a:" + o.id; }
  }
  function push(o) {
    o.u = uid(); var q = qLoad();
    if (o.op === "slide" || o.op === "at") q = q.filter(function (x) { return INFL.indexOf(x.u) !== -1 || !(x.op === o.op && (o.op === "at" || x.deck === o.deck)); }); // only the newest place counts
    q.push(o); qSave(q); applyLocal(o);
    clearTimeout(qT); qT = setTimeout(flush, o.op === "finish" ? 0 : 1500);
    return o.u;
  }
  function waiting(u) { return qLoad().some(function (x) { return x.u === u; }); }
  function flush() {
    clearTimeout(qT); qT = null;
    if (qBusy) return; var q = qLoad(); if (!q.length) { if (onQ) onQ(); return; }
    qBusy = true; var batch = q.slice(0, 40); INFL = batch.map(function (x) { return x.u; });
    T.call("apiLessons", { ops: batch }, { quiet: true }).then(function (r) {
      qBusy = false; var sent = INFL; INFL = [];
      var left = qLoad().filter(function (x) { return sent.indexOf(x.u) === -1; }); qSave(left);
      me().lessons = r.lessons || me().lessons; left.forEach(applyLocal); // still waiting: keep showing it
      if (onQ) onQ();
      if ((r.res || []).indexOf("locked") !== -1) { T.reboot().then(T.home).catch(function () {}); return; } // the teacher locked the topic: home, where the tile says so
      if (left.length) flush();
    }, function () { qBusy = false; INFL = []; if (onQ) onQ(true); qT = setTimeout(flush, 15000); });
  }
  function start() { qLoad().forEach(applyLocal); if (qLoad().length) flush(); }
  setInterval(function () { if (!qBusy && !qT && T.me() && qLoad().length) flush(); }, 15000);
  window.addEventListener("pagehide", function () { if (qLoad().length) flush(); });

  // ---- what she has done (the lines on the topic page and the home tile) ----
  function deckLine(d) { var g = LS().s[d.id]; if (!g) return { t: L.deckNot, c: "", b: L.start, i: 1 }; if (g[1] >= d.n) return { t: fmt(L.deckAll, { n: d.n }), c: "done", b: L.again, i: 1 }; return { t: fmt(L.deckAt, { i: g[0], n: d.n }), c: "now", b: L.carry, i: g[0] }; }
  function actDone(a) { var e = LS().a[a.id]; return !!e; }
  function actLines(a) {
    var e = LS().a[a.id]; if (!e) return { t: L.actNot, c: "", s: "", b: L.play };
    var goes = e[4] === 1 ? L.actGoes1 : fmt(L.actGoesN, { n: e[4] });
    if (!a.scored || !e[3]) return { t: L.actDone, c: "done", s: goes, b: L.playAgain };
    return { t: fmt(L.actBest, { s: e[2], m: e[3], p: Math.round(100 * e[2] / e[3]) }), c: "done", s: fmt(L.actFirst, { s: e[0], m: e[1] }) + " · " + goes, b: L.playAgain };
  }
  function tileLine(t) { var d = t.acts.filter(actDone).length, seen = t.decks.some(function (x) { return LS().s[x.id]; }); if (!t.acts.length) return seen ? L.tileSeen : L.tileNone; return d || seen ? fmt(L.tileActs, { d: d, n: t.acts.length }) : L.tileNone; }
  function tileMeta(t) { var d = t.decks.length ? (t.decks.length === 1 ? L.deck1 : fmt(L.decksN, { n: t.decks.length })) : L.noDecks, a = !t.acts.length ? L.noActs : t.acts.length === 1 ? L.act1 : fmt(L.actsN, { n: t.acts.length }); return fmt(L.tileMeta, { d: d, a: a }); }

  // ---- the topic page ----
  // v13: the job line names only what the topic has (slides, activities, exam questions), then the topic check
  function jobLine(t, bank) {
    var p = [].concat(t.decks.length ? [L.jobSlides] : [], t.acts.length ? [L.jobActs] : [], bank ? [L.jobExam] : []);
    var s = p.length ? p.join(", ") + L.jobThen + L.jobEnd : L.jobEnd;
    return s.charAt(0).toUpperCase() + s.slice(1) + ".";
  }
  function topic(id) {
    var t = LT(id); if (!t || !isOpen(id)) return T.home();
    T.at({ screen: "hub", topic: id }); onQ = function () { if (T.cur().screen === "hub" && T.cur().topic === id) paintPend(); };
    var Ls = LS(), bank = bankOf(id), parts = [];
    // carry on where she left off: the last slide set or activity she opened in this topic
    var p = String(Ls.p[id] || ""), resume = "";
    if (p.indexOf("d:") === 0) { var D = deckOf(p.slice(2)); if (D && D.t.id === id) { var dl = deckLine(D.d); resume = '<div class="card tight resume"><button class="btn" id="resume" data-k="' + h(p) + '">' + h(fmt(L.resume, { w: D.d.title })) + '</button><span class="status">' + h(dl.t) + '</span></div>'; } }
    if (p.indexOf("a:") === 0) { var A = actOf(p.slice(2)); if (A && A.t.id === id) resume = '<div class="card tight resume"><button class="btn" id="resume" data-k="' + h(p) + '">' + h(fmt(L.resume, { w: A.a.title })) + '</button><span class="status">' + h(actLines(A.a).t) + '</span></div>'; }
    // 1 slides
    parts.push('<div class="card hubpart" data-hue="1"><h2>' + h(L.partSlides) + '</h2>' + (t.decks.length ? '<div class="stages">' + t.decks.map(function (d) { var x = deckLine(d); return '<div class="row"><div class="st">' + h(d.title) + '<small>' + h(fmt(L.slideCount, { n: d.n })) + '</small></div><div class="status ' + x.c + '">' + h(x.t) + '</div><button class="btn sm' + (x.c === "done" ? ' ghost' : '') + '" data-deck="' + h(d.id) + '" data-i="' + x.i + '">' + h(x.b) + '</button></div>'; }).join("") + '</div>' : '<p class="sub" style="margin:0">' + h(L.noDecksLine) + '</p>') + '</div>');
    // 2 activities
    var nd = t.acts.filter(actDone).length;
    if (!t.acts.length) parts.push('<div class="card hubpart" data-hue="2"><h2>' + h(L.partActs) + '</h2><p class="sub" style="margin:0" id="noActs">' + h(L.noActsLine) + '</p></div>');
    else parts.push('<div class="card hubpart" data-hue="2"><h2>' + h(L.partActs) + ' <small class="cnt">' + h(fmt(L.actsDone, { d: nd, n: t.acts.length })) + '</small></h2><div class="stages">' + t.acts.map(function (a) { var x = actLines(a); return '<div class="row"><div class="st">' + h(a.title) + (x.s ? '<small>' + h(x.s) + '</small>' : '') + '</div><div class="status ' + x.c + '">' + h(x.t) + '</div><button class="btn sm' + (x.c === "done" ? ' ghost' : '') + '" data-act="' + h(a.id) + '">' + h(x.b) + '</button></div>'; }).join("") + '</div></div>');
    // 3 exam questions (the topics with a question bank)
    if (bank) { var ex = examSum(bank);
      parts.push('<div class="card hubpart" data-hue="3"><h2>' + h(L.partExam) + '</h2><div class="stages"><div class="row"><div class="st">' + h(L.examLine) + '<small>' + h(fmt(L.examMeta, { s: bank.stages.length, q: ex.q, m: ex.x })) + '</small></div><div class="status' + (ex.done ? ' done' : ex.a ? ' now' : '') + '">' + h(ex.line) + '</div><button class="btn sm" id="hubExam">' + h(L.open) + '</button></div></div></div>'); }
    // 4 how did this topic go?
    var E = (me().checks || {})[id];
    parts.push('<div class="card hubpart" data-hue="4"><h2>' + h(L.partEval) + '</h2><div class="stages"><div class="row"><div class="st">' + h(L.evalLine) + '<small>' + h(fmt(L.evalParts, { n: t.parts.length })) + '</small></div><div class="status' + (E ? ' done' : '') + '">' + h(E ? fmt(L.evalSent, { d: day(E.t) }) : L.evalNot) + '</div><button class="btn sm' + (E ? ' ghost' : '') + '" id="hubEval">' + h(E ? L.evalChange : L.evalStart) + '</button></div></div></div>');
    var body = el('<div class="hub" style="max-width:920px"><h1>' + h(t.title) + '</h1>' + job(jobLine(t, bank), L.hubHelp) + '<div class="pend" id="pend" hidden>' + h(L.pending) + '</div>' + resume + parts.join("") + '</div>');
    T.shell(T.crumbHome(), body); wire("cHome", T.home); wireHelp(); paintPend();
    body.querySelectorAll("[data-deck]").forEach(function (b) { b.onclick = function () { slides(b.dataset.deck, +b.dataset.i || 1); }; });
    body.querySelectorAll("[data-act]").forEach(function (b) { b.onclick = function () { activity(b.dataset.act); }; });
    wire("hubExam", function () { T.pick(id); T.topic(); });
    wire("hubEval", function () { check(id); });
    wire("resume", function () { var k = document.getElementById("resume").dataset.k; if (k.indexOf("d:") === 0) { var d = deckOf(k.slice(2)).d; slides(d.id, deckLine(d).i); } else activity(k.slice(2)); });
  }
  function paintPend() { var x = document.getElementById("pend"); if (x) x.hidden = !qLoad().length; }

  // ---- a slide set ----
  var KEY = null;
  document.addEventListener("keydown", function (ev) { if (KEY && T.cur().screen === "slides" && !ev.altKey && !ev.metaKey && !ev.ctrlKey) KEY(ev); });
  function slides(deck, i) {
    var D = deckOf(deck); if (!D || !isOpen(D.t.id)) return T.home();
    var t = D.t, d = D.d; i = Math.min(Math.max(1, i || 1), d.n);
    T.at({ screen: "slides", deck: deck, i: i }); onQ = null;
    var body = el('<div class="slides">' + job(L.slideJob, L.slideHelp) + '<div class="slide" id="slide"><img id="simg" alt=""><div class="sfail" id="sfail" hidden><p>' + h(L.slideFail) + '</p><button class="btn sm" id="sretry">' + h(L.tryAgain) + '</button></div></div><p class="smore" id="smore" aria-live="polite"></p><div class="snav"><button class="btn ghost" id="sprev">' + h(L.prev) + '</button><span class="scount" id="scount"></span><button class="btn" id="snext">' + h(L.next) + '</button></div></div>');
    var bar = '<div class="stagebar" data-hue="1"><div class="t" id="sbar"></div><div class="line"><i id="sline"></i></div></div>';
    T.shell(crumb(t, d.title), body, bar); wireCrumb(t); wireHelp();
    // a slide with click animations shows one picture per click (NN-0 … NN-(c-1)) before the finished slide NN, so an
    // answer stays hidden until she presses Next, as in the slideshow; s = clicks shown on slide i
    var img = document.getElementById("simg"), pre = new Image(), tries = 0, s = 0;
    function clicks(j) { return (d.steps || {})[j] || 0; }
    function pic(j, k) { return k < clicks(j) ? slideUrl(deck, j, k) : slideUrl(deck, j); }
    function show(moved) {
      T.cur().i = i; tries = 0;
      document.getElementById("sfail").hidden = true; img.hidden = false;
      var more = s < clicks(i);
      img.src = pic(i, s); img.alt = fmt(L.slideOf, { i: i, n: d.n }) + ": " + d.title;
      document.getElementById("scount").textContent = fmt(L.slideOf, { i: i, n: d.n });
      document.getElementById("smore").textContent = more ? L.slideMore : "";
      document.getElementById("sbar").innerHTML = '<b>' + h(d.title) + '</b> · ' + h(fmt(L.slideOf, { i: i, n: d.n }));
      document.getElementById("sline").style.width = Math.round(100 * i / d.n) + "%";
      document.getElementById("sprev").disabled = i <= 1 && s === 0;
      var nx = document.getElementById("snext"); nx.textContent = i >= d.n && !more ? L.finish : L.next;
      if (more) pre.src = pic(i, s + 1); else if (i < d.n) pre.src = pic(i + 1, 0);
      if (moved) push({ op: "slide", deck: deck, i: i, f: Math.max(i, (LS().s[deck] || [1, 1])[1] || 1) }); // f: furthest seen, kept even if she steps back before this saves
    }
    img.onload = function () { document.getElementById("sfail").hidden = true; };
    img.onerror = function () { img.hidden = true; document.getElementById("sfail").hidden = false; };
    wire("sretry", function () { tries++; document.getElementById("sfail").hidden = true; img.hidden = false; img.src = pic(i, s) + "?r=" + tries + Date.now().toString(36); });
    function go(k) { if (k > d.n) { flush(); return topic(t.id); } if (k < 1) return; i = k; s = 0; show(true); }
    function next() { if (s < clicks(i)) { s++; show(false); } else go(i + 1); }
    function prev() { if (s > 0) { s--; show(false); } else if (i > 1) { i--; s = clicks(i); show(true); } } // back to a slide: as she left it, all shown
    wire("sprev", prev);
    wire("snext", next);
    KEY = function (ev) { if (ev.key === "ArrowRight" || ev.key === "PageDown") { ev.preventDefault(); if (i < d.n || s < clicks(i)) next(); } else if (ev.key === "ArrowLeft" || ev.key === "PageUp") { ev.preventDefault(); prev(); } };
    show(true);
  }

  // ---- an activity, played inside this page so its score comes back ----
  var MSG = null;
  window.addEventListener("message", function (e) { if (MSG) MSG(e); });
  function activity(aid) {
    var A = actOf(aid); if (!A || !isOpen(A.t.id)) return T.home();
    var t = A.t, a = A.a, url = actUrl(a, true), waitU = null, readyT = null, ready = false, sentAt = false;
    T.at({ screen: "activity", act: aid });
    var body = el('<div class="actscr">' + job(a.scored ? L.actJob : L.actJobDone, L.actHelp) + '<div class="actbar"><span class="status" id="asave" role="status"></span>' + (a.scored ? '' : '<button class="btn sm" id="afin">' + h(L.actFinished) + '</button>') + '<a class="link" id="afull" href="' + h(actUrl(a, false)) + '" target="_blank" rel="noopener">' + h(L.fullWindow) + '</a></div><div class="actframe"><iframe id="aframe" title="' + h(a.title) + '" allow="fullscreen; autoplay" src="' + h(url) + '"></iframe><div class="afail card" id="afail" hidden><p>' + h(L.loadFail) + '</p><div class="actions"><button class="btn" id="aretry">' + h(L.tryAgain) + '</button><a class="link" href="' + h(actUrl(a, false)) + '" target="_blank" rel="noopener">' + h(L.fullWindow) + '</a></div><p class="help">' + h(L.fullNote) + '</p></div></div><div class="actions"><button class="btn ghost" id="aback">' + h(L.back) + '</button></div></div>');
    T.shell(crumb(t, a.title), body); wireCrumb(t); wireHelp();
    var frame = document.getElementById("aframe");
    function status() {
      var x = document.getElementById("asave"); if (!x) return;
      var e = LS().a[aid];
      if (waitU && waiting(waitU)) { x.className = "status now"; x.textContent = qBusy || !(onQ && onQ.failed) ? L.actSaving : L.actRetry; return; }
      if (waitU && e) { x.className = "status done"; x.textContent = a.scored && e[3] ? fmt(L.actSaved, { s: e[2], m: e[3] }) : L.actSavedDone; return; }
      x.className = "status"; x.textContent = a.scored ? L.actWait : ""; // v14: a no-score activity has no score to save
    }
    onQ = function (failed) { onQ.failed = !!failed; if (T.cur().screen === "activity" && T.cur().act === aid) status(); };
    function armLoad() { clearTimeout(readyT); ready = false; readyT = setTimeout(function () { if (!ready && document.getElementById("afail")) document.getElementById("afail").hidden = false; }, 8000); }
    MSG = function (e) {
      if (T.cur().screen !== "activity" || T.cur().act !== aid) return;
      if (e.source !== frame.contentWindow || e.origin !== ORIGIN) return; // only this activity, from GitHub Pages
      var m = e.data; if (!m || m.t !== "s1act" || m.v !== 1) return;
      if (m.kind === "back") { topic(t.id); return; } // the activity's own "Back to HQ": the topic page is the HQ here
      if (!ownPage(m.path)) { // v16: the activity's own "Next" button opened another activity of the set inside this frame
        var B = actByPath(m.path); if (!B || B.a.id === aid || !isOpen(B.t.id)) return; // not one of ours: it never scores this activity
        if (m.kind === "ready") activity(B.a.id); // open it properly, so its screen, status and score are its own (it always says ready before it can finish)
        return;
      }
      if (m.kind === "ready") { ready = true; clearTimeout(readyT); document.getElementById("afail").hidden = true; if (!sentAt) { sentAt = true; push({ op: "at", id: aid }); } return; }
      if (m.kind === "finish") {
        if (!a.scored) { waitU = push({ op: "finish", id: aid, s: 0, m: 0 }); finBtn(); return status(); }
        var mx = Math.round(Number(m.max)), sc = Math.round(Number(m.score));
        if (!(mx > 0) || !isFinite(sc)) return; if (mx > 5000) return; sc = Math.min(Math.max(0, sc), mx);
        waitU = push({ op: "finish", id: aid, s: sc, m: mx }); status();
      }
    };
    function ownPage(p) { var want = "/" + a.path; try { p = decodeURIComponent(String(p || "")); } catch (x) { return false; } return p.length >= want.length && p.slice(-want.length) === want; }
    function finBtn() { var b = document.getElementById("afin"); if (b) { b.disabled = true; } }
    wire("afin", function () { waitU = push({ op: "finish", id: aid, s: 0, m: 0 }); finBtn(); status(); });
    wire("aretry", function () { document.getElementById("afail").hidden = true; armLoad(); frame.src = url + "&r=" + Date.now().toString(36); });
    wire("aback", function () { topic(t.id); });
    armLoad(); status();
  }

  // ---- How did this topic go? ----
  function check(id) {
    var t = LT(id); if (!t || !isOpen(id)) return T.home();
    T.at({ screen: "check", topic: id }); onQ = null;
    var E = (me().checks || {})[id], r = E ? E.r.slice() : t.parts.map(function () { return 0; }), MAX = 500;
    var rows = t.parts.map(function (p, k) { return '<div class="erow" data-k="' + k + '"><div class="et">' + h(p) + '</div><div class="eopts" role="radiogroup" aria-label="' + h(p) + '">' + S1L.rate.map(function (w, j) { return '<button type="button" class="tog" role="radio" data-v="' + (j + 1) + '" aria-checked="false">' + h(w) + '</button>'; }).join("") + '</div></div>'; }).join("");
    var body = el('<div class="evalf" style="max-width:860px">' + job(L.evalJob, L.evalHelp) + '<div class="card"><h2>' + h(fmt(L.evalHead, { t: t.title })) + '</h2><div class="erows">' + rows + '</div><div class="lead">' + h(L.evalBox) + '</div><textarea id="ec" maxlength="' + MAX + '" placeholder="' + h(L.evalPh) + '"></textarea><div class="help" id="eleft"></div><div class="err" id="eerr"></div><div class="actions"><button class="btn" id="esend">' + h(L.evalSend) + '</button><button class="btn ghost" id="eback">' + h(L.back) + '</button></div></div></div>');
    T.shell(crumb(t, L.partEval), body); wireCrumb(t); wireHelp();
    var ta = document.getElementById("ec"); ta.value = E ? E.c || "" : "";
    function left() { document.getElementById("eleft").textContent = fmt(L.evalLeft, { n: MAX - ta.value.length }); }
    function paint() { body.querySelectorAll(".erow").forEach(function (row) { var k = +row.dataset.k; row.classList.toggle("miss", false); row.querySelectorAll(".tog").forEach(function (b) { var on = +b.dataset.v === r[k]; b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false"); }); }); }
    body.querySelectorAll(".erow").forEach(function (row) { var k = +row.dataset.k; row.querySelectorAll(".tog").forEach(function (b) { b.onclick = function () { r[k] = +b.dataset.v; paint(); if (r.every(Boolean)) document.getElementById("eerr").textContent = ""; }; }); });
    ta.oninput = left; left(); paint();
    wire("eback", function () { topic(id); });
    wire("esend", function () {
      var b = document.getElementById("esend"), err = document.getElementById("eerr");
      if (!r.every(Boolean)) { err.textContent = L.evalNeed; body.querySelectorAll(".erow").forEach(function (row) { row.classList.toggle("miss", !r[+row.dataset.k]); }); var first = body.querySelector(".erow.miss"); if (first && first.scrollIntoView) first.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
      b.disabled = true;
      T.call("apiCheck", { topic: id, r: r, c: ta.value }, { save: true }).then(function (res) {
        if (!me().checks) me().checks = {}; me().checks[id] = res.e; checkDone(id);
      }, function (e) { b.disabled = false; if (e.code === "no-rating") err.textContent = L.evalNeed; });
    });
  }
  function checkDone(id) {
    var t = LT(id); T.at({ screen: "checkdone", topic: id });
    var body = el('<div style="max-width:760px">' + job(L.evalDoneJob, L.evalHelp) + '<div class="card done-card"><h2>' + h(L.evalDoneH) + '</h2><p>' + h(L.evalDoneP) + '</p><div class="actions"><button class="btn" id="eback">' + h(L.back) + '</button><button class="btn ghost" id="eagain">' + h(L.evalChange) + '</button></div></div></div>');
    T.shell(crumb(t, L.partEval), body); wireCrumb(t); wireHelp();
    wire("eback", function () { topic(id); }); wire("eagain", function () { check(id); });
  }
  return { topic: topic, slides: slides, activity: activity, check: check, start: start, flush: flush, tileLine: tileLine, tileMeta: tileMeta, examSum: examSum, queue: qLoad, base: function () { return BASE; } };
})();
