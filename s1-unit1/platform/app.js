/* app.js — the pupil page. The prototype's app.js (DESIGN/prototype, passed his look 27 Sep 2026) with its local record
 * swapped for the server (build/ARCH.md): apiBoot gives the rounds, apiStage the drawn views of one stage (no keys),
 * apiMark the marks and the mark scheme. Layout, strings and behaviour are the prototype's. */
var App = (function () {
  var S = S1S.S, X = S1S.X, TOPICS = S1S.TOPICS, BOOT = window.S1BOOT || {}, TOPIC = "digital-data";
  var app, ME = null, CACHE = {}, PROM = {}, CUR = { screen: "" }, draftT = null, pingT = null;
  function h(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; }
  // ---- server ----
  var SYS = { msg: "", retry: null }, saving = 0, savingT = null;
  function paintSys() {
    var x = document.getElementById("sys"); if (!x) return;
    if (SYS.msg === "expired") { x.className = "sysbar bad"; x.innerHTML = '<span>' + h(X.expired) + '</span>'; }
    else if (SYS.msg === "locked") { x.className = "sysbar bad"; x.innerHTML = '<span>' + h(X.lockedMark) + '</span>'; }
    else if (SYS.msg === "offline") { x.className = "sysbar bad"; x.innerHTML = '<span>' + h(X.offline) + '</span><button class="btn sm" id="retry">' + X.retry + '</button>'; document.getElementById("retry").onclick = function () { var f = SYS.retry; SYS.msg = ""; SYS.retry = null; paintSys(); if (f) f(); }; }
    else { x.className = ""; x.innerHTML = ""; }
  }
  function paintSaving() { var x = document.getElementById("saving"); if (x) x.style.display = saving > 0 && savingT === "shown" ? "block" : "none"; }
  function savingOn() { saving++; if (saving === 1) { savingT = setTimeout(function () { if (saving > 0) { savingT = "shown"; paintSaving(); } }, 300); } }
  function savingOff() { saving = Math.max(0, saving - 1); if (!saving) { if (savingT && savingT !== "shown") clearTimeout(savingT); savingT = null; paintSaving(); } }
  // v4 (his ruling 28 Sep 2026): the button or link that started a server call pulses until the answer is back, so a click never looks ignored
  var TAP = null, BUSY = null, PEND = 0;
  document.addEventListener("click", function (ev) { var b = ev.target && ev.target.closest ? ev.target.closest("button, .tab, .link") : null; TAP = b; setTimeout(function () { if (TAP === b) TAP = null; }, 0); }, true);
  function unbusy() { if (BUSY) { BUSY.classList.remove("busy"); BUSY.removeAttribute("aria-busy"); BUSY = null; } }
  function busyOn() { PEND++; if (TAP && TAP !== BUSY) { unbusy(); BUSY = TAP; BUSY.classList.add("busy"); BUSY.setAttribute("aria-busy", "true"); } } // the latest click always pulses
  function busyOff() { PEND = Math.max(0, PEND - 1); if (!PEND) setTimeout(function () { if (!PEND) unbusy(); }, 60); }
  function gs(fn, req) { return new Promise(function (res, rej) { google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](req); }); }
  function call(fn, req, opt) { // resolves with {ok:true,…}; rejects with e.code; a lost connection waits for Try again
    req = Object.assign({ cls: BOOT.cls, topic: TOPIC }, req || {}); opt = opt || {};
    return new Promise(function (resolve, reject) {
      function failed() { if (opt.quiet) { var e = new Error("offline"); e.code = "offline"; return reject(e); } SYS.msg = "offline"; SYS.retry = attempt; paintSys(); }
      function attempt() {
        if (opt.save) savingOn();
        if (!opt.quiet) busyOn();
        gs(fn, req).then(function (r) {
          if (opt.save) savingOff();
          if (!opt.quiet) busyOff();
          if (r && r.ok === false && (r.error === "server" || r.error === "busy")) return failed();
          if (SYS.msg === "offline") { SYS.msg = ""; paintSys(); }
          if (!r || r.ok === false) { var code = (r && r.error) || "error"; if (code === "not-signed-in") { SYS.msg = "expired"; paintSys(); }
            if (code === "locked") { if (fn === "apiMark") SYS.msg = "locked"; reboot().then(home).catch(function () {}); } // the teacher locked the topic: back home, where the tile says so
            var e = new Error(code); e.code = code; return reject(e); }
          resolve(r);
        }, function () { if (opt.save) savingOff(); if (!opt.quiet) busyOff(); failed(); });
      }
      attempt();
    });
  }
  // ---- record (from apiBoot / apiStage) ----
  function roundNo() { return ME.topic.round; }
  function RS(n) {
    n = n || roundNo(); var r = ME.topic.rounds[n];
    if (!r) { r = ME.topic.rounds[n] = { s: {}, E: false, done: false, z: false }; ME.topic.stages.forEach(function (t) { r.s[t.n] = { a: 0, m: 0, n: t.q, x: t.x, e: false, f: [] }; }); }
    return r;
  }
  function stage(st) { return ME.topic.stages[st - 1]; }
  function TOT() { return ME.topic.stages.reduce(function (t, s) { return t + s.x; }, 0); }
  function QN() { return ME.topic.stages.reduce(function (t, s) { return t + s.q; }, 0); }
  function stageTotals(st, n) { var g = RS(n).s[st]; return { a: g.a, m: g.m, n: g.n, x: g.x }; }
  function loadStage(n, st, fresh) {
    var k = n + "|" + st; if (CACHE[k] && !fresh) return Promise.resolve(CACHE[k]);
    if (PROM[k] && !fresh) return PROM[k];
    PROM[k] = call("apiStage", { round: n, stage: st }).then(function (r) { CACHE[k] = r; delete PROM[k]; return r; }, function (e) { delete PROM[k]; throw e; });
    return PROM[k];
  }
  function reboot() { return call("apiBoot", {}).then(function (r) { ME = r; CACHE = {}; PROM = {}; return r; }); }
  function closed(e) { if (e && e.code === "round-closed") reboot().then(topic).catch(function () {}); }
  // ---- shell ----
  function shell(crumb, body, bar) {
    app.innerHTML = '<header class="bar"><span class="title">' + S.app + '</span>' + (crumb ? '<span class="crumb">· ' + crumb + '</span>' : '') + '<span class="who">' + S.hello + h(ME.name) + '</span><a class="staff" id="staffLink" href="' + h(BOOT.base) + '" target="_top">' + S.staff + '</a></header><div id="sys"></div>' + (bar || '') + '<div class="work" id="work"></div><div class="toast" id="toast"></div><div class="saving" id="saving">' + X.saving + '</div>';
    document.getElementById("work").appendChild(body); paintSys(); paintSaving();
  }
  function bare(crumb, body) { // guard, name and staff screens: no pupil name; the build token at the foot only when the link carries ?build
    app.innerHTML = '<header class="bar"><span class="title">' + S.app + '</span>' + (crumb ? '<span class="crumb">· ' + crumb + '</span>' : '') + '</header><div id="sys"></div><div class="work" id="work"></div><div class="toast" id="toast"></div><div class="saving" id="saving">' + X.saving + '</div>';
    if (BOOT.sb === "1") body.appendChild(el('<div class="build">' + h(BOOT.build) + '</div>'));
    document.getElementById("work").appendChild(body); paintSys(); paintSaving();
  }
  function guard(line) { CUR = { screen: "guard", line: line }; bare("", el('<div class="guard"><div class="card"><p>' + h(line) + '</p></div></div>')); }
  function toast(t) { var x = document.getElementById("toast"); x.textContent = t; x.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(function () { x.style.display = "none"; }, 1800); }
  function crumbHome() { return '<a id="cHome">' + S.home + '</a>'; }
  function wire(id, fn) { var e = document.getElementById(id); if (e) e.onclick = fn; }
  // ---- name ----
  function nameScreen() { // as A2: Continue waits for a name; a refused name leaves the box for another try
    CUR = { screen: "name" };
    bare("", el('<div class="guard"><div class="card"><p>' + h(X.nameAsk) + '</p><input type="text" id="nm" maxlength="40" autocomplete="given-name"><button class="btn" id="go" disabled>' + X.nameGo + '</button></div></div>'));
    var nm = document.getElementById("nm"), b = document.getElementById("go");
    function send() { var v = nm.value.trim(); if (!v || b.disabled) return; b.disabled = true; call("apiName", { name: v }, { save: true }).then(function (r) { ME.name = r.name; ME.needName = false; home(); }, function () { b.disabled = false; }); }
    nm.oninput = function () { b.disabled = !nm.value.trim(); }; nm.onkeydown = function (ev) { if (ev.key === "Enter") send(); }; b.onclick = send; nm.focus();
  }
  // ---- home ----
  function home() {
    CUR = { screen: "home" };
    var n = roundNo(), r = RS(n), a = 0, m = 0; [1, 2, 3, 4].forEach(function (st) { var t = stageTotals(st, n); a += t.a; m += t.m; });
    var line = S.round + n + (n > 1 ? " open" : "") + " · " + (r.done ? "done · " + m + " of " + TOT() + " marks" : a ? a + " of " + QN() + " questions done" : "not started");
    if (ME.topic.open && SYS.msg === "locked") SYS.msg = "";
    var shut = !ME.topic.open, foot = shut ? '<span class="lk">' + h(X.locked) + '</span><span>' + h(X.lockedSub) + '</span>' : '<button class="btn sm" id="openLive">' + S.open + '</button><span>' + h(line) + '</span>';
    var tiles = TOPICS.map(function (t, i) { var live = i === 0; return '<div class="topic' + (live ? (shut ? ' shut' : '') : ' off') + '"><div class="n">1.' + (i + 1) + '</div><div class="name">' + h(t) + '</div><div class="meta">' + (live ? S.liveMeta : '') + '</div><div class="foot">' + (live ? foot : S.later) + '</div></div>'; }).join("");
    shell("", el('<div><h1>' + S.home + '</h1><div class="tiles">' + tiles + '</div></div>')); wire("openLive", topic);
  }
  // ---- topic front ----
  function topic() {
    CUR = { screen: "topic" };
    var n = roundNo(), rows = [1, 2, 3, 4].map(function (st) {
      var t = stageTotals(st, n), s = RS(n).s[st], status, cls, btn;
      if (s.e) { status = fmt(S.done, { m: t.m, x: t.x }); cls = "done"; btn = S.lookback; }
      else if (t.a) { status = t.a === t.n ? fmt(S.done, { m: t.m, x: t.x }) : fmt(S.inProg, { a: t.a, b: t.n }); cls = "now"; btn = S.carry; }
      else { status = S.notStarted; cls = ""; btn = S.start; }
      return '<div class="row" data-hue="' + st + '"><div class="st">Stage ' + st + ' · ' + h(stage(st).title) + '<small>' + t.n + ' questions · ' + t.x + ' marks</small></div><div class="status ' + cls + '">' + h(status) + '</div><button class="btn sm' + (s.e ? ' ghost' : '') + '" data-st="' + st + '">' + btn + '</button></div>';
    }).join("");
    var earlier = Object.keys(ME.topic.rounds).filter(function (k) { return +k < n; }).sort(function (x, y) { return x - y; }).map(function (k) { var m = 0; [1, 2, 3, 4].forEach(function (st) { m += stageTotals(st, +k).m; }); return '<div class="r"><span>' + S.round + k + ' · ' + m + ' of ' + TOT() + ' marks</span><span class="link" data-lb="' + k + '">' + S.lookback + '</span></div>'; }).join("");
    var body = el('<div><h1>Digital Data</h1><p class="sub">' + S.topicLine + '</p><div class="card"><h2>' + S.round + n + (n > 1 ? S.openedBy : '') + '</h2><div class="stages">' + rows + '</div></div>' + (earlier ? '<div class="card tight"><h2>' + S.earlier + '</h2><div class="sumrows">' + earlier + '</div></div>' : '') + (RS(n).done ? '<span class="link" id="seeSum">' + S.round + n + ' · see my marks</span>' : '') + '</div>');
    shell(crumbHome(), body); wire("cHome", home); wire("seeSum", function () { summary(n); });
    body.querySelectorAll("button[data-st]").forEach(function (b) {
      b.onclick = function () {
        var st = +b.dataset.st; b.disabled = true;
        loadStage(n, st).then(function (D) { var ids = D.order, s = RS(n).s[st]; if (s.e) return lookback(n, st, 0); var i = 0; while (i < ids.length && D.done[ids[i]]) i++; if (i >= ids.length) return stagecard(st); question(st, i); }, function () { b.disabled = false; });
      };
    });
    body.querySelectorAll("[data-lb]").forEach(function (x) { x.onclick = function () { summary(+x.dataset.lb); }; });
    [1, 2, 3, 4].forEach(function (st) { if (!RS(n).s[st].e) loadStage(n, st).catch(function () {}); }); // warm the stages she is likely to open
  }
  // ---- question ----
  function stagebar(st, i, n) { var t = stage(st); return '<div class="stagebar" data-hue="' + st + '"><div class="t">' + fmt(S.stagebar, { s: st, name: '<b>' + h(t.title) + '</b>', i: Math.min(i + 1, t.q), n: t.q }) + '</div><div class="line"><i style="width:' + Math.round(100 * i / t.q) + '%;--from:' + Math.round(100 * Math.max(0, i - 1) / t.q) + '%"></i></div></div>'; }
  // a phone cannot show a long choice whole in the closed list, so the chosen words are repeated under it (shown by style.css on narrow screens only)
  function said(body) { body.querySelectorAll(".pairs select[data-k]").forEach(function (x) { var o = x.parentNode.querySelector(".said"); if (o) o.textContent = x.value ? x.options[x.selectedIndex].text : ""; }); }
  function figureHtml(f) { return '<div class="figure"><h4>' + h(f.title) + '</h4><table><tr>' + f.head.map(function (x) { return '<th>' + h(x) + '</th>'; }).join("") + '</tr>' + f.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + h(c) + '</td>'; }).join("") + '</tr>'; }).join("") + '</table></div>'; }
  function tiles(options, n, lead, partIdx) { return '<div class="lead">' + lead + '</div><div class="opts" data-part="' + (partIdx == null ? '' : partIdx) + '" data-n="' + n + '">' + options.map(function (o) { return '<div class="opt" data-t="' + h(o) + '"><i></i><span>' + h(o) + '</span><span class="mk"></span></div>'; }).join("") + '</div>'; }
  function leadFor(n) { return n === 1 ? S.pick1 : n === 2 ? S.pick2 : S.pick3; }
  function complete(view, answer) { // the judge's complete(), key-free: Check waits for every part
    answer = answer || {};
    function picksOk(n, picks) { return Array.isArray(picks) && picks.length === n; }
    if (view.form === "pick1" || view.form === "pickN") return picksOk(view.n, answer.picks);
    if (view.form === "writepick") return view.parts.every(function (p, i) { return picksOk(p.n, ((answer.parts || [])[i] || {}).picks); });
    if (view.form === "type") return view.items.every(function (_, i) { return !!((answer.texts || [])[i] || "").trim(); });
    if (view.form === "pairs") return view.left.every(function (_, i) { return !!(answer.map || [])[i]; });
    if (view.form === "choose") return view.items.every(function (_, i) { return (answer.choices || [])[i] != null; });
    if (view.form === "gaps") { var f = answer.fills || []; for (var i = 0; i < view.gapCount; i++) if (!(f[i] || "").trim()) return false; return true; }
    return false;
  }
  function question(st, i, replay, n) {
    n = n || roundNo(); clearTimeout(draftT);
    var D = CACHE[n + "|" + st], ids = D.order, qid = ids[i], v = D.views[i], src = D.src[i], stored = D.done[qid], ctl = "", sending = false;
    CUR = { screen: "question", st: st, i: i, n: n, v: v, qid: qid, replay: !!replay, r: null };
    if (v.form === "pick1" || v.form === "pickN") ctl = tiles(v.options, v.n, leadFor(v.n));
    else if (v.form === "writepick") ctl = '<div class="lead">' + S.writeFirst + '</div><textarea id="wtext" maxlength="200" placeholder="' + S.writePh + '"></textarea><div class="help" id="wnote">' + S.writeNote + '</div><div class="help"><button class="btn sm" id="wdone" disabled>' + S.writeDone + '</button> <span class="link" id="skipW">' + S.skipWrite + '</span></div><div id="parts" style="display:none">' + v.parts.map(function (p, k) { return (p.label ? '<div class="lead">' + h(p.label) + '</div>' : '') + (p.stem ? '<p class="qtext stem">' + h(p.stem) + '</p>' : '') + tiles(p.options, p.n, leadFor(p.n), k); }).join("") + '</div>';
    else if (v.form === "type") ctl = '<div class="lead">' + S.typeIt + '</div><div class="items">' + v.items.map(function (it, k) { return '<div class="item">' + (it.label ? '<label>' + h(it.label) + '</label>' : '') + '<input type="text" maxlength="80" data-k="' + k + '"><span class="mk"></span></div>'; }).join("") + '</div><div class="help"><span class="link" id="idk">' + S.idk + '</span></div>';
    else if (v.form === "pairs") ctl = '<div class="lead">' + S.pairs + '</div><div class="pairs' + (v.right.some(function (r) { return r.length > 28; }) ? ' wide' : '') + '">' + v.left.map(function (l, k) { return '<div class="pr"><span>' + h(l) + '</span><span class="arrow">→</span><span><select data-k="' + k + '"><option value="">' + S.choose + '</option>' + v.right.map(function (r) { return '<option>' + h(r) + '</option>'; }).join("") + '</select><span class="said"></span> <span class="mk"></span></span></div>'; }).join("") + '</div>';
    else if (v.form === "choose") ctl = '<div class="lead">' + S.chooseLine + '</div><div class="choose">' + v.items.map(function (it, k) { return '<div class="ch" data-k="' + k + '"><span>' + h(it.stem) + '</span>' + it.opts.map(function (o) { return '<button class="tog" data-t="' + h(o) + '">' + h(o) + '</button>'; }).join("") + '<span class="mk"></span></div>'; }).join("") + '</div>';
    else if (v.form === "gaps") { var k = 0; ctl = '<div class="lead">' + (v.pool ? S.gapsPool : S.gapsType) + '</div><p class="gapsent">' + v.text.split("___").map(h).reduce(function (acc, piece, idx) { if (idx === 0) return piece; var g = k++; return acc + (v.pool ? '<select data-k="' + g + '"><option value="">' + S.choose + '</option>' + v.pool.map(function (w) { return '<option>' + h(w) + '</option>'; }).join("") + '</select>' : '<input type="text" maxlength="30" data-k="' + g + '" placeholder="' + h(v.labels[g] || '') + '">') + '<span class="mk" data-g="' + g + '"></span>' + piece; }, "") + '</p>'; }
    var card = '<div class="card" id="qcard"><div class="qhead"><span class="marks">' + v.marks + (v.marks === 1 ? ' mark' : ' marks') + '</span><span class="src">' + h(src) + '</span></div>' + (v.q ? '<p class="qtext">' + h(v.q) + '</p>' : '') + ctl + '<div class="actions"><button class="btn" id="check" disabled>' + S.check + '</button><span class="help" id="help">' + S.help + '</span></div><div id="after"></div></div>';
    var body = el('<div>' + (v.figure ? '<div class="cols">' + figureHtml(v.figure) + card + '</div>' : '<div style="max-width:860px">' + card + '</div>') + '</div>');
    shell(crumbHome() + ' · <a id="cTopic">Digital Data</a>', body, stagebar(st, i, n)); wire("cHome", home); wire("cTopic", topic);
    var ans = { picks: [], parts: v.parts ? v.parts.map(function () { return { picks: [] }; }) : null, texts: [], map: [], choices: [], fills: [], text: "" };
    function refresh() { var a = collect(); document.getElementById("check").disabled = sending || !complete(v, a); }
    function collect() {
      var a = {};
      if (v.form === "pick1" || v.form === "pickN") a.picks = ans.picks.slice();
      if (v.form === "writepick") { a.text = (document.getElementById("wtext") || {}).value || ""; a.parts = ans.parts.map(function (p) { return { picks: p.picks.slice() }; }); a.skipped = !!ans.skipped; }
      if (v.form === "type") a.texts = [].map.call(body.querySelectorAll("input[data-k]"), function (x) { return x.value; });
      if (v.form === "pairs") a.map = [].map.call(body.querySelectorAll("select[data-k]"), function (x) { return x.value; });
      if (v.form === "choose") a.choices = ans.choices.slice();
      if (v.form === "gaps") a.fills = [].map.call(body.querySelectorAll("[data-k]"), function (x) { return x.value; });
      return a;
    }
    function draft() { // the writing she has typed so far survives a reload (ARCH: UserProperties, deleted once marked)
      if (stored || replay || (v.form !== "writepick" && v.form !== "type")) return;
      var a = collect(), t = v.form === "writepick" ? a.text : (a.texts.some(function (x) { return x.trim(); }) ? JSON.stringify(a.texts) : "");
      if (t) D.drafts[qid] = t; else delete D.drafts[qid];
      clearTimeout(draftT); draftT = setTimeout(function () { call("apiDraft", { round: n, qid: qid, text: t }, { quiet: true }).catch(function () {}); }, 1200);
    }
    body.querySelectorAll(".opts").forEach(function (grp) {
      var nn = +grp.dataset.n, part = grp.dataset.part === "" ? null : +grp.dataset.part, bucket = part == null ? ans : ans.parts[part];
      grp.querySelectorAll(".opt").forEach(function (o) { o.onclick = function () { if (grp.classList.contains("locked")) return; var t = o.dataset.t, at = bucket.picks.indexOf(t); if (at !== -1) { bucket.picks.splice(at, 1); o.classList.remove("on"); } else if (nn === 1) { bucket.picks = [t]; grp.querySelectorAll(".opt").forEach(function (x) { x.classList.remove("on"); }); o.classList.add("on"); } else if (bucket.picks.length >= nn) { toast(nn === 2 ? S.only2 : S.only3); return; } else { bucket.picks.push(t); o.classList.add("on"); } refresh(); }; });
    });
    body.querySelectorAll(".ch").forEach(function (ch) { var k = +ch.dataset.k; ch.querySelectorAll(".tog").forEach(function (b) { b.onclick = function () { if (ch.classList.contains("locked")) return; ans.choices[k] = b.dataset.t; ch.querySelectorAll(".tog").forEach(function (x) { x.classList.toggle("on", x === b); }); refresh(); }; }); });
    body.querySelectorAll("input,select,textarea").forEach(function (x) { x.oninput = x.onchange = function () { said(body); if (v.form === "writepick" && x.id === "wtext" && !ans.revealed) { document.getElementById("wdone").disabled = !x.value.trim(); document.getElementById("skipW").style.display = x.value.trim() ? "none" : ""; } refresh(); draft(); }; });
    function reveal(skipped) { var w = document.getElementById("wtext"); w.readOnly = true; if (!skipped) document.getElementById("wnote").textContent = S.writeKept; document.getElementById("wdone").style.display = "none"; document.getElementById("skipW").style.display = "none"; document.getElementById("parts").style.display = ""; ans.skipped = !!skipped; ans.revealed = true; refresh(); }
    wire("wdone", function () { reveal(false); });
    wire("skipW", function () { reveal(true); });
    wire("idk", function () { if (sending || stored) return; body.querySelectorAll("input[data-k]").forEach(function (x) { x.value = ""; }); submit(true); });
    if (v.form === "writepick") refresh = function () { var a = collect(); var ok = a.parts.every(function (p, k) { return p.picks.length === v.parts[k].n; }) && (a.text.trim() || ans.skipped); document.getElementById("check").disabled = sending || !ok; };
    function submit(idk) {
      if (sending) return;
      var a = collect(); if (idk) a.texts = a.texts.map(function () { return ""; });
      if (stored) return show(stored.r, stored.a);
      sending = true; clearTimeout(draftT); document.getElementById("check").disabled = true;
      call("apiMark", { round: n, qid: qid, answer: a, idk: !!idk }, { save: true }).then(function (res) {
        var g = RS(n).s[st];
        if (!D.done[qid]) { g.a++; g.m += res.r.marks; }
        D.done[qid] = stored = { a: res.a, r: res.r, f: !!res.f }; delete D.drafts[qid];
        if (CUR.qid === qid) show(res.r, res.a);
      }, function (e) { sending = false; if (e.code === "round-closed") return closed(e); if (e.code === "locked") return draft(); refresh(); });
    }
    function show(r, a) {
      CUR.r = r;
      body.querySelectorAll(".opts,.ch").forEach(function (g) { g.classList.add("locked"); });
      body.querySelectorAll("input,select,textarea,.tog").forEach(function (x) { x.disabled = true; });
      var parts = r.parts ? r.parts : [r];
      parts.forEach(function (pr, k) { var grp = body.querySelector('.opts[data-part="' + (r.parts ? k : '') + '"]'); if (!grp || !pr.options) return; pr.options.forEach(function (o) { var t = grp.querySelector('.opt[data-t="' + h(o.text).replace(/"/g, '&quot;') + '"]'); if (!t) return; var picked = t.classList.contains("on"); t.classList.remove("on"); if (picked && o.key) { t.classList.add("hit"); t.querySelector(".mk").textContent = "✓"; } else if (picked) { t.classList.add("miss"); t.querySelector(".mk").textContent = "✗"; } else if (o.key) { t.classList.add("key"); t.querySelector(".mk").textContent = "✓"; } }); });
      if (v.form === "type") body.querySelectorAll(".item").forEach(function (it, k) { var p = r.per[k]; it.querySelector(".mk").textContent = p && p.hit ? " ✓" : " ✗"; it.querySelector(".mk").style.color = p && p.hit ? "var(--ok)" : "var(--bad)"; });
      if (v.form === "pairs" || v.form === "choose") body.querySelectorAll(".pr,.ch").forEach(function (row, k) { var p = r.per[k]; row.querySelector(".mk").innerHTML = p.hit ? '<span style="color:var(--ok)">✓</span>' : '<span style="color:var(--bad)">✗ ' + h(p.want) + '</span>'; });
      if (v.form === "gaps") r.per.forEach(function (p) { (p.gaps || [p.gap]).forEach(function (g, j) { var m = body.querySelector('.mk[data-g="' + g + '"]'); if (m) m.innerHTML = p.hit ? '<span style="color:var(--ok)">✓</span>' : '<span style="color:var(--bad)">✗ ' + h(p.gaps ? p.want[j] : p.want) + '</span>'; }); });
      var cls = r.marks === r.max ? "ok" : r.marks ? "part" : "bad";
      var lines = r.scheme.lines.map(function (l) { return '<li>' + h(l.text) + (l.marks ? ' <span class="src">(' + l.marks + (l.marks === 1 ? ' mark' : ' marks') + ')</span>' : '') + '</li>'; }).join("");
      var wrote = (v.form === "writepick" || v.form === "type") ? '<div class="lead">' + S.wrote + '</div><div class="wrote">' + h(v.form === "type" ? a.texts.filter(Boolean).join(" · ") : a.text) + '</div>' + (v.form === "writepick" && a.text ? '<div class="help">' + S.wroteHint + '</div>' : '') : '';
      document.getElementById("after").innerHTML = '<p class="result ' + cls + '">' + fmt(S.got, { m: r.marks, x: r.max, w: r.max === 1 ? S.mark : S.marks }) + '</p><div class="card scheme"><h3>' + S.scheme + '</h3><ul>' + lines + '</ul>' + (r.scheme.note ? '<div class="note">' + h(r.scheme.note) + '</div>' : '') + '</div>' + wrote + '<div class="actions"><span class="flag' + (stored.f ? ' on' : '') + '" id="flag"><i></i>' + S.flag + '</span><button class="btn" id="next" style="margin-left:auto">' + (i + 1 < ids.length ? S.next : S.finish) + '</button></div>';
      document.getElementById("check").parentNode.style.display = "none";
      wire("flag", function () { // saved at once; put back if the server says no
        var on = !stored.f, box = document.getElementById("flag"); stored.f = on; box.classList.toggle("on", on);
        call("apiFlag", { round: n, qid: qid, on: on }, { save: true }).then(function (res) {
          stored.f = !!res.f; if (box.isConnected) box.classList.toggle("on", stored.f);
          var g = RS(n).s[st]; g.f = g.f.filter(function (x) { return x.id !== qid; }); if (stored.f) g.f.push({ id: qid, src: src });
        }, function () { stored.f = !on; if (box.isConnected) box.classList.toggle("on", stored.f); });
      });
      wire("next", function () { if (replay) return i + 1 < ids.length ? lookback(n, st, i + 1) : topic(); i + 1 < ids.length ? question(st, i + 1) : stagecard(st); });
    }
    wire("check", function () { submit(false); });
    if (stored) { // refresh or look back: restore the picks then show the marked state
      var a = stored.a; ans.picks = a.picks || []; ans.choices = a.choices || []; if (a.parts) ans.parts = a.parts.map(function (p) { return { picks: p.picks.slice() }; });
      body.querySelectorAll(".opts").forEach(function (grp) { var part = grp.dataset.part === "" ? null : +grp.dataset.part, picks = (part == null ? a.picks : a.parts[part].picks) || []; grp.querySelectorAll(".opt").forEach(function (o) { if (picks.indexOf(o.dataset.t) !== -1) o.classList.add("on"); }); });
      if (a.text != null && document.getElementById("wtext")) { document.getElementById("wtext").value = a.text; document.getElementById("wtext").readOnly = true; document.getElementById("wdone").style.display = "none"; document.getElementById("skipW").style.display = "none"; document.getElementById("parts").style.display = ""; }
      if (a.texts) body.querySelectorAll("input[data-k]").forEach(function (x, k) { x.value = a.texts[k] || ""; });
      if (a.map) { body.querySelectorAll("select[data-k]").forEach(function (x, k) { x.value = a.map[k] || ""; }); said(body); }
      if (a.fills) body.querySelectorAll("[data-k]").forEach(function (x, k) { x.value = a.fills[k] || ""; });
      body.querySelectorAll(".ch").forEach(function (ch, k) { ch.querySelectorAll(".tog").forEach(function (b) { b.classList.toggle("on", b.dataset.t === (a.choices || [])[k]); }); });
      show(stored.r, a);
    } else if (D.drafts[qid] && !replay) { // her unmarked writing comes back; nothing is revealed until she says she has finished
      var d = D.drafts[qid];
      if (v.form === "writepick") { document.getElementById("wtext").value = d; document.getElementById("wdone").disabled = !d.trim(); document.getElementById("skipW").style.display = d.trim() ? "none" : ""; }
      if (v.form === "type") { try { var t = JSON.parse(d); body.querySelectorAll("input[data-k]").forEach(function (x, k) { x.value = t[k] || ""; }); } catch (e) {} }
      refresh();
    }
  }
  function lookback(n, st, i) { var D = CACHE[n + "|" + st]; while (i < D.order.length && !D.done[D.order[i]]) i++; if (i >= D.order.length) return topic(); question(st, i, true, n); }
  // ---- cards ----
  function rateHtml(id) { return '<div class="lead">' + S.closest + '</div><div class="opts rate" id="' + id + '">' + S.rates.map(function (t, k) { return '<div class="opt" data-r="' + (k + 1) + '"><i></i><span>' + t + '</span></div>'; }).join("") + '</div>'; }
  function wireRate(box, cb) { box.querySelectorAll(".opt").forEach(function (o) { o.onclick = function () { box.querySelectorAll(".opt").forEach(function (x) { x.classList.toggle("on", x === o); }); cb(+o.dataset.r); }; }); }
  function stagecard(st) {
    CUR = { screen: "stagecard", st: st };
    var n = roundNo(), t = stage(st), D = CACHE[n + "|" + st], rating = 0;
    var body = el('<div style="max-width:760px"><div class="card"><h2>' + S.howGo + '</h2><p class="sub">Stage ' + st + ' · ' + h(t.title) + '</p>' + rateHtml("rate") + '<div class="lead">' + S.tick + '</div><div class="ticks">' + D.stage.outcomes.map(function (o, k) { return '<label><input type="checkbox" data-k="' + k + '"><span>' + h(o) + '</span></label>'; }).join("") + '</div><div class="lead">' + S.added + '</div><input type="text" id="conf" maxlength="100" placeholder="' + S.addPh + '"><div class="err" id="err"></div><div class="actions"><button class="btn" id="save">' + S.saveCarry + '</button></div></div></div>');
    shell(crumbHome() + ' · <a id="cTopic">Digital Data</a>', body, stagebar(st, t.q, n)); wire("cHome", home); wire("cTopic", topic);
    wireRate(document.getElementById("rate"), function (r) { rating = r; });
    wire("save", function () {
      var conf = document.getElementById("conf").value.trim(), err = document.getElementById("err"), b = document.getElementById("save"); if (!rating) { err.textContent = S.rateErr; return; }
      b.disabled = true;
      call("apiEval", { round: n, stage: st, payload: { rating: rating, ticks: [].map.call(body.querySelectorAll("input[type=checkbox]"), function (x) { return x.checked ? 1 : 0; }), stageNote: conf } }, { save: true }).then(function (res) {
        var r = RS(n); r.s[st].e = true; D.e = res.e; if (res.done) r.done = true; res.allCards && !r.E ? topiccard() : topic();
      }, function (e) { b.disabled = false; if (e.code === "round-closed") return closed(e); if (e.code === "no-rating") err.textContent = S.rateErr; else if (e.code === "not-finished") topic(); });
    });
  }
  function topiccard() {
    CUR = { screen: "topiccard" };
    var n = roundNo(), rating = 0;
    var body = el('<div style="max-width:760px"><div class="card"><h2>' + S.howGo + '</h2><p class="sub">' + S.wholeTopic + '</p>' + rateHtml("rate") + '<div class="lead">' + S.unsure + '</div><div class="ticks"><label><input type="checkbox" data-u="0"><span>' + S.fine + '</span></label>' + [1, 2, 3, 4].map(function (st) { return '<label><input type="checkbox" data-u="' + st + '"><span>' + h(stage(st).title) + '</span></label>'; }).join("") + '</div><div class="lead">' + S.anything + '</div><input type="text" id="note" maxlength="100"><div class="err" id="err"></div><div class="actions"><button class="btn" id="save">' + S.saveSee + '</button></div></div></div>');
    shell(crumbHome() + ' · <a id="cTopic">Digital Data</a>', body); wire("cHome", home); wire("cTopic", topic);
    wireRate(document.getElementById("rate"), function (r) { rating = r; });
    body.querySelectorAll("input[data-u]").forEach(function (x) { x.onchange = function () { if (x.dataset.u === "0" && x.checked) body.querySelectorAll("input[data-u]").forEach(function (y) { if (y !== x) y.checked = false; }); else if (x.checked) body.querySelector('input[data-u="0"]').checked = false; }; });
    wire("save", function () {
      var err = document.getElementById("err"), b = document.getElementById("save"); if (!rating) { err.textContent = S.rateErr; return; }
      b.disabled = true;
      call("apiEval", { round: n, stage: "topic", payload: { rating: rating, unsure: [].filter.call(body.querySelectorAll("input[data-u]"), function (x) { return x.checked; }).map(function (x) { return +x.dataset.u; }), note: document.getElementById("note").value.trim() } }, { save: true }).then(function () {
        var r = RS(n); r.E = true; r.done = true; summary(n);
      }, function (e) { b.disabled = false; if (e.code === "round-closed") return closed(e); if (e.code === "no-rating") err.textContent = S.rateErr; else if (e.code === "not-finished") topic(); });
    });
  }
  function summary(n) {
    CUR = { screen: "summary", n: n };
    var R = RS(n), m = 0, rows = [1, 2, 3, 4].map(function (st) { var t = stageTotals(st, n); m += t.m; return '<div class="r" data-hue="' + st + '"><span>' + h(stage(st).title) + '</span><b>' + t.m + ' of ' + t.x + '</b><div class="bar"><i style="--p:' + Math.round(100 * t.m / t.x) + '%"></i></div></div>'; }).join("");
    var flagged = []; [1, 2, 3, 4].forEach(function (st) {
      var D = CACHE[n + "|" + st], f = R.s[st].f.slice();
      if (D) f.sort(function (x, y) { return D.order.indexOf(x.id) - D.order.indexOf(y.id); });
      f.forEach(function (x) { flagged.push('<div class="r">' + (R.z ? '<span>' + h(x.src) + ' · Stage ' + st + '</span>' : '<span class="link" data-st="' + st + '" data-id="' + h(x.id) + '">' + h(x.src) + ' · Stage ' + st + '</span>') + '</div>'); });
    });
    var tot = TOT();
    var body = el('<div style="max-width:760px"><h1>' + S.round + n + ' · Digital Data</h1><div class="card"><h2>' + fmt(S.scored, { m: m, x: tot, p: Math.round(100 * m / tot) }) + '</h2><div class="meter"><i style="--p:' + Math.round(100 * m / tot) + '%"></i></div><div class="sumrows">' + rows + '</div></div><div class="card tight"><h2>' + S.flagged + '</h2>' + (flagged.length ? '<div class="sumrows">' + flagged.join("") + '</div>' : '<p class="sub" style="margin:0">' + S.noFlag + '</p>') + '</div><button class="btn" id="back">' + S.back + '</button></div>');
    shell(crumbHome(), body); wire("cHome", home); wire("back", home);
    body.querySelectorAll("[data-st]").forEach(function (x) { x.onclick = function () { var st = +x.dataset.st, id = x.dataset.id; loadStage(n, st).then(function (D) { lookback(n, st, Math.max(0, D.order.indexOf(id))); }).catch(function () {}); }; });
  }
  // ---- boot ----
  function boot() {
    app = document.getElementById("app");
    guard(X.signing);
    call("apiBoot", {}).then(function (r) {
      if (r.staff) { ME = r; return Staff.start(r, T); }
      ME = r; r.needName ? nameScreen() : home();
      if (!pingT) { var act = Date.now(), touch = function () { act = Date.now(); }; document.addEventListener("pointerdown", touch, true); document.addEventListener("keydown", touch, true);
        pingT = setInterval(function () { if (document.visibilityState === "visible" && Date.now() - act < 120000) call("apiPing", {}, { quiet: true }).catch(function () {}); }, 60000); } // "last used" = last real use, not a tab left open
      if (BOOT.sit === "1" && window.Sit && (r.owner || window.__DEV_USER)) Sit.run(T);
    }, function (e) { guard(e.code === "unknown-class" ? X.noClass : X.domain); });
  }
  var T = { h: h, fmt: fmt, el: el, call: call, bare: bare, wire: wire, toast: toast, boot: BOOT,
    me: function () { return ME; }, cur: function () { return CUR; }, cache: function () { return CACHE; },
    reboot: reboot, loadStage: loadStage, home: home, topic: topic, question: question, summary: summary, stagecard: stagecard, topiccard: topiccard };
  return { boot: boot, t: T };
})();
