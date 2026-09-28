/* staff.js — the staff page at the bare link (no class). Door (passcode, or let in by email), then five tabs:
 * Classes (A2's list: copy the link, delete a class; v4), Topics (open or lock each topic for the class; DECISIONS §16), Rounds (open the next round for the class
 * or one pupil), Tracker (v4, DECISIONS §17: graphs, a percentage beside every score, the rating in the pupil's own words, every card in "What pupils said",
 * and a pupil page that lists each answered question in words) and Export (CSV). */
var Staff = (function () {
  var S = S1S.S, X = S1S.X, T, TAB = 0, CLS = "", ROUND = 0, CLASSES = [], armed = false, OWN = false;
  var W = { none: "No classes yet. Add one below.", pupils: "Pupils", round: "Round", cls: "Class",
    noPupils: "No pupils have opened the class link yet.", taken: "That class name is taken.", rule: "Use 1 to 30 letters or digits, e.g. 11A DT.",
    copied: "Class link copied.", clearMine: "Clear my own record in this class", clearConfirm: "Clear your own record in {name}? Press again to confirm.",
    cleared: "Your own record in this class is cleared.", opened: "Round {n} is open.", pupil: "Pupil", topic: "Topic", flagged: "Flagged",
    seen: "Last used", today: "Today", yesterday: "Yesterday", daysAgo: "{n} days ago", lastUsed: "Last used: {when}", close: "Close", notDone: "{a} of {n} done",
    classLine: "{name} · {n} pupils · created {date}", classLine1: "{name} · 1 pupil · created {date}", by: "made by {who}", add: "Add class",
    copy: "Copy class link", del: "Delete class", delConfirm: "Delete {name} and every record in it? Press again to confirm.",
    glance: "Class at a glance", avgStage: "Average score in each stage", rated: "How pupils rated each stage", spread: "Spread of total scores",
    pupilsN: "{n} pupils", pupils1: "1 pupil", nobody: "No answers yet", noCards: "No cards saved yet",
    soFar: "Scores count the questions a pupil has answered so far. Click a name to see every answer.", total: "Total",
    said: "What pupils said", saidNote: "Every card a pupil saved at the end of a stage and of the topic, in their own words.",
    whole: "The whole topic", notTicked: "Did not tick: ", allTicked: "Ticked all of these", note: "Note: ", stillUnsure: "Still unsure about: ",
    back: "Back to the tracker", marksPc: "{m} of {x} marks · {p}%", answered: "{a} of {n} questions answered",
    theirCard: "Their card", notSaved: "Not saved yet", practice: "Practice question", question: "Question", answer: "Their answer", marks: "Marks",
    notYet: "Not answered yet: {n} questions.", skipped: "Skipped the writing", wrote: "Wrote: ", flaggedQ: "Flagged: I still don't get this one",
    archived: "This round's answers are in the archive Sheet; the marks and cards are below." };
  var RC = ["r1", "r2", "r3", "r4"]; // rating colours, 1 (couldn't do most) to 4 (could explain)
  function h(s) { return T.h(s); }
  function fail(e) { var c = e && e.code; if (c === "not-staff") return door(""); if (c === "unknown-class") { CLS = ""; TAB = 0; return tabs(); } }
  function page(body) { CUR(); T.bare(S.staff, body); }
  function CUR() { try { T.cur().screen = "staff"; } catch (e) {} }
  function start(boot, t) { T = t; check(""); }
  function check(pass) {
    return T.call("apiStaff", { op: "check", pass: pass }).then(function (r) { if (r.admitted) { OWN = !!r.owner; return tabs(); } door(pass ? X.badPass : ""); },
      function (e) { if (e.code === "bad-pass") return door(X.badPass); page(T.el('<div class="guard"><div class="card"><p>' + h(X.domain) + '</p></div></div>')); });
  }
  function door(msg) {
    var body = T.el('<div class="guard"><div class="card"><div class="srow"><label for="pw">' + X.pass + '</label><input type="password" id="pw" maxlength="60" autocomplete="off"><button class="btn sm" id="enter">' + X.enter + '</button></div><div class="err" id="err">' + h(msg || "") + '</div></div></div>');
    page(body);
    var pw = document.getElementById("pw"), go = function () { var v = pw.value.trim(); if (!v) return; document.getElementById("enter").disabled = true; check(v); };
    T.wire("enter", go); pw.onkeydown = function (ev) { if (ev.key === "Enter") go(); }; pw.focus();
  }
  function bar() { return '<div class="tabs">' + X.tabs.map(function (t, k) { return '<button class="tab' + (k === TAB ? ' on' : '') + '" data-tab="' + k + '">' + t + '</button>'; }).join("") + '</div>'; }
  function clsPick() { return CLASSES.length > 1 ? '<label for="cp">' + W.cls + '</label><select id="cp">' + CLASSES.map(function (c) { return '<option value="' + h(c.slug) + '"' + (c.slug === CLS ? ' selected' : '') + '>' + h(c.name) + '</option>'; }).join("") + '</select>' : '<b>' + h((CLASSES[0] || {}).name || "") + '</b>'; }
  function wireCommon(body) {
    body.querySelectorAll("[data-tab]").forEach(function (b) { b.onclick = function () { TAB = +b.dataset.tab; armed = false; tabs(); }; });
    var cp = body.querySelector("#cp"); if (cp) cp.onchange = function () { CLS = cp.value; ROUND = 0; armed = false; tabs(); };
  }
  function tabs() {
    return T.call("apiStaff", { op: "classes" }).then(function (r) {
      CLASSES = r.classes; if (!CLASSES.some(function (c) { return c.slug === CLS; })) CLS = CLASSES.length ? (CLASSES.filter(function (c) { return c.mine; })[0] || CLASSES[0]).slug : "";
      if (TAB && !CLS) TAB = 0;
      [classes, topics, rounds, tracker, exporter][TAB]();
    }).catch(fail);
  }
  function link(slug) { return T.boot.base + "?class=" + slug; }
  // ---- Classes (A2's list, v4): one line per class, Copy class link, Delete class with a second press ----
  function dateOf(iso) { return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""; }
  function twoPress(btn, confirmText, act) { // a destructive button asks once, in its own words, then acts on the second press (A2)
    var on = false, t = null, orig = btn.textContent;
    btn.onclick = function () {
      if (!on) { on = true; btn.textContent = confirmText; btn.classList.add("arm"); t = setTimeout(function () { on = false; btn.textContent = orig; btn.classList.remove("arm"); }, 5000); return; }
      clearTimeout(t); btn.disabled = true; act(function () { btn.disabled = false; on = false; btn.textContent = orig; btn.classList.remove("arm"); });
    };
  }
  function classes() {
    var list = CLASSES.length ? '<ul class="clist">' + CLASSES.map(function (c) {
      return '<li data-s="' + h(c.slug) + '"><b>' + h(T.fmt(c.pupils === 1 ? W.classLine1 : W.classLine, { name: c.name, n: c.pupils, date: dateOf(c.made) }) + (c.by ? ' · ' + T.fmt(W.by, { who: c.by }) : '')) + '</b>' +
        '<button class="btn sm ghost" data-copy>' + W.copy + '</button>' + (c.mine || OWN ? '<button class="btn sm ghost" data-del>' + W.del + '</button>' : '') + '</li>';
    }).join("") + '</ul>' : '<p class="sub">' + W.none + '</p>';
    var body = T.el('<div>' + bar() + list + '<div class="card"><h3 class="sh">' + W.add + '</h3><div class="srow"><label for="cn">' + X.className + '</label><input type="text" id="cn" maxlength="30" placeholder="' + X.classPh + '"><button class="btn sm" id="make">' + X.make + '</button></div><div class="err" id="err"></div><p class="hint">' + X.newLocked + '</p></div></div>');
    page(body); wireCommon(body);
    body.querySelectorAll("[data-copy]").forEach(function (b) { b.onclick = function () {
      var url = link(b.closest("li").dataset.s), done = function () { T.toast(W.copied); };
      try { navigator.clipboard.writeText(url).then(done, function () { window.prompt(W.copy, url); }); } catch (e) { window.prompt(W.copy, url); }
    }; });
    body.querySelectorAll("[data-del]").forEach(function (b) {
      var slug = b.closest("li").dataset.s, c = CLASSES.filter(function (x) { return x.slug === slug; })[0];
      twoPress(b, T.fmt(W.delConfirm, { name: c.name }), function (reset) { T.call("apiStaff", { op: "delete", cls: slug }).then(function () { if (CLS === slug) CLS = ""; tabs(); }, function (e) { reset(); fail(e); }); });
    });
    var cn = document.getElementById("cn"), make = function () {
      var v = cn.value.trim(), err = document.getElementById("err"), b = document.getElementById("make"); if (!v) return; b.disabled = true;
      T.call("apiStaff", { op: "create", name: v }).then(function (r) { CLS = r.slug; tabs(); }, function (e) { b.disabled = false; err.textContent = e.code === "taken" ? W.taken : e.code === "bad-name" ? W.rule : ""; });
    };
    T.wire("make", make); cn.onkeydown = function (ev) { if (ev.key === "Enter") make(); };
  }
  // ---- Topics: open or lock each built topic for the class; a topic not built yet says so and has no button ----
  function topics() {
    T.call("apiStaff", { op: "topics", cls: CLS }).then(function (r) {
      var on = {}; r.topics.forEach(function (t) { on[t.id] = t.open; });
      var rows = S1S.TOPICS.map(function (name, i) {
        var id = i === 0 ? "digital-data" : "", st = id in on ? '<span class="ts ' + (on[id] ? 'on">' + X.isOpen : 'off">' + X.isLocked) + '</span><button class="btn sm' + (on[id] ? ' ghost' : '') + '" data-t="' + id + '">' + (on[id] ? X.lock : X.openT) + '</button>' : '<span class="ts later">' + S.later + '</span><span></span>';
        return '<div class="trow"><span class="tn">1.' + (i + 1) + '</span><b>' + h(name) + '</b>' + st + '</div>';
      }).join("");
      var body = T.el('<div>' + bar() + '<div class="card"><div class="srow">' + clsPick() + '</div><h2>' + h(r.className) + '</h2><p class="hint">' + X.topicsNote + '</p><div class="tlist">' + rows + '</div></div></div>');
      page(body); wireCommon(body);
      body.querySelectorAll("[data-t]").forEach(function (b) { b.onclick = function () { b.disabled = true; T.call("apiStaff", { op: "setTopic", cls: CLS, topic: b.dataset.t, open: !on[b.dataset.t] }).then(topics).catch(fail); }; });
    }).catch(fail);
  }
  // ---- Rounds ----
  function rounds() {
    T.call("apiStaff", { op: "rounds", cls: CLS }).then(function (r) {
      var pup = r.pupils.map(function (p, k) { return '<option value="' + k + '">' + h(p.name) + ' · ' + S.round + p.round + '</option>'; }).join("");
      var body = T.el('<div>' + bar() + '<div class="card"><div class="srow">' + clsPick() + '</div><h2>' + T.fmt(X.roundOpen, { n: r.round }) + '</h2><div class="actions"><button class="btn" id="oc">' + T.fmt(X.openClass, { n: r.round + 1 }) + '</button></div></div><div class="card">' + (r.pupils.length ? '<div class="srow"><select id="pp">' + pup + '</select><button class="btn sm ghost" id="op"></button></div>' : '<p class="sub" style="margin:0">' + W.noPupils + '</p>') + '</div><span class="link" id="clr">' + W.clearMine + '</span></div>');
      page(body); wireCommon(body);
      var pp = document.getElementById("pp"), op = document.getElementById("op");
      function label() { if (op) op.textContent = T.fmt(X.openPupil, { n: r.pupils[+pp.value].round + 1 }); }
      if (pp) { pp.onchange = label; label(); }
      T.wire("oc", function () { this.disabled = true; T.call("apiStaff", { op: "openClass", cls: CLS }).then(function (x) { T.toast(T.fmt(W.opened, { n: x.round })); rounds(); }).catch(fail); });
      T.wire("op", function () { var p = r.pupils[+pp.value]; op.disabled = true; T.call("apiStaff", { op: "openPupil", cls: CLS, email: p.email }).then(function (x) { T.toast(T.fmt(W.opened, { n: x.round })); rounds(); }, function () { op.disabled = false; }); });
      T.wire("clr", function () {
        var x = document.getElementById("clr");
        if (!armed) { armed = true; x.textContent = T.fmt(W.clearConfirm, { name: r.className }); return; }
        armed = false; T.call("apiStaff", { op: "clearMe", cls: CLS }).then(function () { T.toast(W.cleared); rounds(); }).catch(fail);
      });
    }).catch(fail);
  }
  // ---- Tracker (v4, DECISIONS §17) ----
  function roundPick(max) { var o = ""; for (var k = 1; k <= max; k++) o += '<option' + (k === ROUND ? ' selected' : '') + '>' + k + '</option>'; return '<label for="rp">' + W.round + '</label><select id="rp">' + o + '</select>'; }
  function seen(iso, flat) { // Today 14:05 · Yesterday 09:12 · Mon 22 Sept 14:05 (6 days ago)
    if (!iso) return '—'; var d = new Date(iso), now = new Date(), day = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var n = Math.round((day(now) - day(d)) / 864e5), hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (n <= 0) return W.today + ' ' + hm; if (n === 1) return W.yesterday + ' ' + hm;
    var s = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).replace(",", "") + ' ' + hm, ago = T.fmt(W.daysAgo, { n: n });
    return flat ? s + ' (' + ago + ')' : s + '<br><small>' + ago + '</small>'; }
  function pc(m, x) { return x ? Math.round(100 * m / x) : 0; }
  function band(p) { return p >= 75 ? "hi" : p >= 50 ? "mid" : "lo"; }
  function score(m, x) { if (!x) return '<span class="sc">' + m + '</span>'; var p = pc(m, x); return '<span class="sc ' + band(p) + '">' + m + '/' + x + ' · ' + p + '%</span>'; } // every score has its percentage
  function rateChip(r) { return r ? '<span class="rchip ' + RC[r - 1] + '">' + h(S.rates[r - 1]) + '</span>' : ''; }
  function stTitle(st) { return st.n + ' · ' + st.title; }
  function tot(p, stages) { var m = 0, ax = 0, a = 0, n = 0; stages.forEach(function (st) { var c = p.s[st.n]; m += c.m; ax += c.ax; a += c.a; n += c.n; }); return { m: m, ax: ax, a: a, n: n }; }
  function hbar(label, p, tail) { return '<div class="hb"><span class="hl">' + h(label) + '</span><span class="ht">' + (p == null ? '' : '<i class="' + band(p) + '" style="width:' + Math.max(p, 1) + '%"></i>') + '</span><span class="hv">' + tail + '</span></div>'; } // p null = nothing to draw yet: an empty track, not a red sliver
  function graphs(r) {
    var avg = r.stages.map(function (st) {
      var ps = r.rows.filter(function (p) { return p.s[st.n].a && p.s[st.n].ax; }).map(function (p) { return pc(p.s[st.n].m, p.s[st.n].ax); });
      return hbar(stTitle(st), ps.length ? Math.round(ps.reduce(function (a, b) { return a + b; }, 0) / ps.length) : null, ps.length ? Math.round(ps.reduce(function (a, b) { return a + b; }, 0) / ps.length) + '% · ' + (ps.length === 1 ? W.pupils1 : T.fmt(W.pupilsN, { n: ps.length })) : W.nobody);
    }).join("");
    var rate = r.stages.map(function (st) {
      var k = [0, 0, 0, 0], n = 0; r.rows.forEach(function (p) { var e = p.s[st.n].e; if (e && e.rating) { k[e.rating - 1]++; n++; } });
      return '<div class="hb"><span class="hl">' + h(stTitle(st)) + '</span><span class="ht stack">' + (n ? k.map(function (c, i) { return c ? '<i class="' + RC[i] + '" style="width:' + (100 * c / n) + '%" title="' + h(S.rates[i]) + ': ' + c + '">' + c + '</i>' : ''; }).join("") : '') + '</span><span class="hv">' + (n ? (n === 1 ? W.pupils1 : T.fmt(W.pupilsN, { n: n })) : W.noCards) + '</span></div>';
    }).join("") + '<div class="key">' + S.rates.map(function (t, i) { return '<span><i class="' + RC[i] + '"></i>' + h(t) + '</span>'; }).join("") + '</div>';
    var bands = [0, 0, 0, 0], names = ["0–24%", "25–49%", "50–74%", "75–100%"], any = 0;
    r.rows.forEach(function (p) { var t = tot(p, r.stages); if (t.ax) { var q = pc(t.m, t.ax); bands[q >= 75 ? 3 : q >= 50 ? 2 : q >= 25 ? 1 : 0]++; any++; } });
    var top = Math.max(1, Math.max.apply(null, bands));
    var cols = '<div class="cols4">' + bands.map(function (c, i) { return '<div class="cb"><span class="cv">' + c + '</span><span class="ct"><i class="' + ["lo", "lo", "mid", "hi"][i] + '" style="height:' + (c ? Math.max(6, 100 * c / top) : 0) + '%"></i></span><span class="cl">' + names[i] + '</span></div>'; }).join("") + '</div>';
    return '<div class="card"><h2>' + W.glance + '</h2><div class="charts"><div><h3 class="sh">' + W.avgStage + '</h3>' + avg + '</div><div><h3 class="sh">' + W.rated + '</h3>' + rate + '</div><div><h3 class="sh">' + W.spread + '</h3>' + (any ? cols : '<p class="hint">' + W.nobody + '</p>') + '</div></div></div>';
  }
  function ticksLine(e, st) {
    var miss = st.outcomes.filter(function (_, k) { return !e.ticks[k]; });
    return miss.length ? '<div class="nt">' + W.notTicked + h(miss.join("; ")) + '</div>' : '<div class="nt ok">' + W.allTicked + '</div>';
  }
  function saidCard(r) { // every evaluation, stage by stage, then the topic card, in the pupils' words
    var title = function (n) { return r.stages[n - 1].title; };
    var parts = r.stages.map(function (st) {
      var ps = r.rows.filter(function (p) { return p.s[st.n].e; });
      return '<h3 class="sh">' + h(stTitle(st)) + '</h3>' + (ps.length ? ps.map(function (p) { var e = p.s[st.n].e;
        return '<div class="ev"><b>' + h(p.name) + '</b>' + rateChip(e.rating) + p.s[st.n].flags.map(function (f) { return '<span class="chip">' + h(f) + '</span>'; }).join("") + ticksLine(e, st) + (e.stageNote ? '<div class="nq">' + W.note + '“' + h(e.stageNote) + '”</div>' : '') + '</div>'; }).join("") : '<p class="hint">' + W.noCards + '</p>');
    }).join("");
    var ts = r.rows.filter(function (p) { return p.E; });
    parts += '<h3 class="sh">' + W.whole + '</h3>' + (ts.length ? ts.map(function (p) { var E = p.E;
      return '<div class="ev"><b>' + h(p.name) + '</b>' + rateChip(E.rating) + '<div class="nt' + (E.unsure.length && E.unsure[0] ? '' : ' ok') + '">' + (E.unsure.length && E.unsure[0] ? W.stillUnsure + h(E.unsure.map(function (u) { return u + ' · ' + title(u); }).join("; ")) : h(S.fine)) + '</div>' + (E.note ? '<div class="nq">' + W.note + '“' + h(E.note) + '”</div>' : '') + '</div>'; }).join("") : '<p class="hint">' + W.noCards + '</p>');
    return '<div class="card said"><h2>' + W.said + '</h2><p class="hint">' + W.saidNote + '</p>' + parts + '</div>';
  }
  function tracker() {
    T.call("apiStaff", { op: "tracker", cls: CLS, round: ROUND || undefined }).then(function (r) {
      ROUND = r.round;
      var rows = r.rows.map(function (p, k) {
        var t = tot(p, r.stages), fl = [];
        r.stages.forEach(function (st) { fl = fl.concat(p.s[st.n].fl); });
        var cells = r.stages.map(function (st) {
          var c = p.s[st.n], e = c.e;
          if (!c.a && !e) return '<td>—</td>';
          return '<td>' + score(c.m, c.ax) + (c.a < c.n ? '<br><small>' + T.fmt(W.notDone, { a: c.a, n: c.n }) + '</small>' : '') + (e ? '<br>' + rateChip(e.rating) : '') + c.flags.map(function (f) { return '<br><span class="chip">' + h(f) + '</span>'; }).join("") + '</td>';
        }).join("");
        return '<tr><td><span class="link" data-p="' + k + '">' + h(p.name) + '</span></td><td class="seen">' + seen(p.seen) + '</td><td>' + (t.a ? score(t.m, t.ax) + (t.a < t.n ? '<br><small>' + T.fmt(W.notDone, { a: t.a, n: t.n }) + '</small>' : '') : '—') + '</td>' + cells + '<td>' + (p.E ? rateChip(p.E.rating) : '—') + '</td><td>' + (fl.length ? h(fl.join(", ")) : '—') + '</td></tr>';
      }).join("");
      var body = T.el('<div>' + bar() + '<div class="srow">' + clsPick() + roundPick(r.maxRound) + '</div><h1>Tracker · ' + h(r.className) + ' · Digital Data · ' + S.round + r.round + '</h1>' +
        (r.rows.length ? graphs(r) : '') + '<div class="card">' + (r.rows.length ? '<p class="hint">' + W.soFar + '</p><div class="tscroll"><table class="track"><tr><th>' + W.pupil + '</th><th>' + W.seen + '</th><th>' + W.total + '</th>' + r.stages.map(function (st) { return '<th>' + h(stTitle(st)) + '</th>'; }).join("") + '<th>' + W.whole + '</th><th>' + W.flagged + '</th></tr>' + rows + '</table></div>' : '<p class="sub" style="margin:0">' + W.noPupils + '</p>') + '</div>' +
        (r.rows.length ? saidCard(r) : '') + '</div>');
      page(body); wireCommon(body);
      var rp = document.getElementById("rp"); rp.onchange = function () { ROUND = +rp.value; tracker(); };
      body.querySelectorAll("[data-p]").forEach(function (x) { x.onclick = function () { pupilPage(r.rows[+x.dataset.p]); }; });
    }).catch(fail);
  }
  // ---- One pupil (v4): totals and a chart, the topic card, then each stage with its card and every answered question in words ----
  function pupilPage(p) {
    T.call("apiStaff", { op: "pupil", cls: CLS, email: p.email, round: ROUND }).then(function (r) {
      var row = r.row, t = tot(row, r.stages), E = row.E, title = function (n) { return r.stages[n - 1].title; };
      var head = '<div class="card"><div class="phead"><h2>' + h(r.name) + ' · ' + S.round + r.round + '</h2><button class="btn sm ghost" id="back">' + W.back + '</button></div>' +
        '<p class="sub seen">' + T.fmt(W.lastUsed, { when: seen(row.seen, true) }) + '</p>' +
        '<p class="big">' + W.total + ': ' + (t.ax ? score(t.m, t.ax) : '—') + ' <small>' + T.fmt(W.answered, { a: t.a, n: t.n }) + '</small></p>' +
        r.stages.map(function (st) { var c = row.s[st.n]; return hbar(stTitle(st), c.a && c.ax ? pc(c.m, c.ax) : null, c.a ? pc(c.m, c.ax) + '% · ' + T.fmt(W.notDone, { a: c.a, n: c.n }) : W.nobody); }).join("") +
        '<h3 class="sh">' + W.whole + '</h3>' + (E ? '<div class="ev">' + rateChip(E.rating) + '<div class="nt' + (E.unsure.length && E.unsure[0] ? '' : ' ok') + '">' + (E.unsure.length && E.unsure[0] ? W.stillUnsure + h(E.unsure.map(function (u) { return u + ' · ' + title(u); }).join("; ")) : h(S.fine)) + '</div>' + (E.note ? '<div class="nq">' + W.note + '“' + h(E.note) + '”</div>' : '') + '</div>' : '<p class="hint">' + W.notSaved + '</p>') +
        (r.archived ? '<p class="hint">' + W.archived + '</p>' : '') + '</div>';
      var stages = r.stages.map(function (st) {
        var c = row.s[st.n], e = c.e, its = r.items.filter(function (it) { return it.st === st.n; });
        var card = '<div class="ev"><b>' + W.theirCard + '</b>' + (e ? rateChip(e.rating) + c.flags.map(function (f) { return '<span class="chip">' + h(f) + '</span>'; }).join("") + '<ul class="oc">' + st.outcomes.map(function (o, k) { return '<li class="' + (e.ticks[k] ? 'y' : 'n') + '">' + h(o) + '</li>'; }).join("") + '</ul>' + (e.stageNote ? '<div class="nq">' + W.note + '“' + h(e.stageNote) + '”</div>' : '') : ' <span class="hint">' + W.notSaved + '</span>') + '</div>';
        var tbl = its.length ? '<div class="tscroll"><table class="track qs"><tr><th>' + W.question + '</th><th>' + W.answer + '</th><th>' + W.marks + '</th></tr>' + its.map(function (it) {
          return '<tr' + (it.f ? ' class="fl"' : '') + '><td><b>' + it.i + ' · ' + h(it.src === 'new' ? W.practice : it.src) + '</b>' + (it.q ? '<div class="qq">' + h(it.q) + '</div>' : '') + (it.f ? '<span class="chip">' + W.flaggedQ + '</span>' : '') + '</td><td>' + (it.skipped ? '<div class="qq">' + W.skipped + '</div>' : it.text ? '<div class="qq">' + W.wrote + '“' + h(it.text) + '”</div>' : '') + h(it.ans) + '</td><td>' + score(it.m, it.max) + '</td></tr>';
        }).join("") + '</table></div>' : '';
        var left = c.n - its.length;
        return '<div class="card"><h2>' + h(stTitle(st)) + '</h2><p class="big">' + (c.a ? score(c.m, c.ax) + ' <small>' + T.fmt(W.notDone, { a: c.a, n: c.n }) + '</small>' : W.nobody) + '</p>' + card + tbl + (left > 0 && !r.archived ? '<p class="hint">' + T.fmt(W.notYet, { n: left }) + '</p>' : '') + '</div>';
      }).join("");
      var body = T.el('<div>' + bar() + '<div class="srow">' + clsPick() + '</div>' + head + stages + '</div>');
      page(body); wireCommon(body);
      T.wire("back", tracker);
      window.scrollTo(0, 0); var w = document.getElementById("work"); if (w) w.scrollTop = 0;
    }).catch(fail);
  }
  // ---- Export ----
  function exporter() {
    T.call("apiStaff", { op: "tracker", cls: CLS, round: ROUND || undefined }).then(function (r) {
      ROUND = r.round;
      var body = T.el('<div>' + bar() + '<div class="card"><div class="srow">' + clsPick() + roundPick(r.maxRound) + '</div><div class="actions"><button class="btn" id="csv">' + X.csv + '</button></div></div></div>');
      page(body); wireCommon(body);
      var rp = document.getElementById("rp"); rp.onchange = function () { ROUND = +rp.value; };
      T.wire("csv", function () {
        var b = document.getElementById("csv"); b.disabled = true;
        T.call("apiStaff", { op: "csv", cls: CLS, round: ROUND }).then(function (x) {
          b.disabled = false;
          var blob = new Blob(["﻿" + x.csv], { type: "text/csv;charset=utf-8" }), a = document.createElement("a");
          a.href = URL.createObjectURL(blob); a.download = x.filename; document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        }, function () { b.disabled = false; });
      });
    }).catch(fail);
  }
  return { start: start, flags: [X.flagHigh, X.flagLow] };
})();
