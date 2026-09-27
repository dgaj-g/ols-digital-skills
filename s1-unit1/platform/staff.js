/* staff.js — the staff page at the bare link (no class). Door (passcode, or let in by email), then four tabs:
 * Classes (make a class, its link), Rounds (open the next round for the class or one pupil), Tracker (the prototype's
 * table, pupil x stage, rating, flags, notes, flagged questions, topic card, last seen) and Export (CSV). */
var Staff = (function () {
  var S = S1S.S, X = S1S.X, T, TAB = 0, CLS = "", ROUND = 0, CLASSES = [], armed = false;
  var W = { none: "No classes yet. Add one below.", pupils: "Pupils", link: "Class link", round: "Round", cls: "Class",
    noPupils: "No pupils have opened the class link yet.", taken: "That class name is taken.", rule: "Use 1 to 30 letters or digits, e.g. 11A DT.",
    copied: "Class link copied.", clearMine: "Clear my own record in this class", clearConfirm: "Clear your own record in {name}? Press again to confirm.",
    cleared: "Your own record in this class is cleared.", opened: "Round {n} is open.", pupil: "Pupil", topic: "Topic", flagged: "Flagged",
    seen: "Last seen", close: "Close", notDone: "{a} of {n} done", unsure: "unsure: ", rating: "rating " };
  function h(s) { return T.h(s); }
  function fail(e) { var c = e && e.code; if (c === "not-staff") return door(""); if (c === "unknown-class") { CLS = ""; TAB = 0; return tabs(); } }
  function page(body) { CUR(); T.bare(S.staff, body); }
  function CUR() { try { T.cur().screen = "staff"; } catch (e) {} }
  function start(boot, t) { T = t; check(""); }
  function check(pass) {
    return T.call("apiStaff", { op: "check", pass: pass }).then(function (r) { if (r.admitted) return tabs(); door(pass ? X.badPass : ""); },
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
      [classes, rounds, tracker, exporter][TAB]();
    }).catch(fail);
  }
  function link(slug) { return T.boot.base + "?class=" + slug; }
  // ---- Classes ----
  function classes() {
    var rows = CLASSES.map(function (c) { return '<tr><td><b>' + h(c.name) + '</b></td><td><span class="cls-link" data-copy="' + h(link(c.slug)) + '">' + h(link(c.slug)) + '</span></td><td>' + c.pupils + '</td><td>' + c.round + '</td></tr>'; }).join("");
    var body = T.el('<div>' + bar() + '<div class="card">' + (CLASSES.length ? '<table class="list"><tr><th>' + W.cls + '</th><th>' + W.link + '</th><th>' + W.pupils + '</th><th>' + W.round + '</th></tr>' + rows + '</table>' : '<p class="sub" style="margin:0">' + W.none + '</p>') + '</div><div class="card"><div class="srow"><label for="cn">' + X.className + '</label><input type="text" id="cn" maxlength="30" placeholder="' + X.classPh + '"><button class="btn sm" id="make">' + X.make + '</button></div><div class="err" id="err"></div></div></div>');
    page(body); wireCommon(body);
    body.querySelectorAll("[data-copy]").forEach(function (x) { x.onclick = function () { var s = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(x); s.removeAllRanges(); s.addRange(rg); try { navigator.clipboard.writeText(x.dataset.copy).then(function () { T.toast(W.copied); }, function () {}); } catch (e) {} }; });
    var cn = document.getElementById("cn"), make = function () {
      var v = cn.value.trim(), err = document.getElementById("err"), b = document.getElementById("make"); if (!v) return; b.disabled = true;
      T.call("apiStaff", { op: "create", name: v }).then(function (r) { CLS = r.slug; tabs(); }, function (e) { b.disabled = false; err.textContent = e.code === "taken" ? W.taken : e.code === "bad-name" ? W.rule : ""; });
    };
    T.wire("make", make); cn.onkeydown = function (ev) { if (ev.key === "Enter") make(); };
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
  // ---- Tracker ----
  function roundPick(max) { var o = ""; for (var k = 1; k <= max; k++) o += '<option' + (k === ROUND ? ' selected' : '') + '>' + k + '</option>'; return '<label for="rp">' + W.round + '</label><select id="rp">' + o + '</select>'; }
  function seen(iso) { if (!iso) return '—'; var d = new Date(iso); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function tracker() {
    T.call("apiStaff", { op: "tracker", cls: CLS, round: ROUND || undefined }).then(function (r) {
      ROUND = r.round;
      var title = function (n) { return r.stages[n - 1].title; };
      var rows = r.rows.map(function (p, k) {
        var cells = r.stages.map(function (st) {
          var c = p.s[st.n], e = c.e;
          if (!c.a && !e) return '<td>—</td>';
          return '<td>' + c.m + '/' + c.x + (c.a < c.n ? '<br><small>' + T.fmt(W.notDone, { a: c.a, n: c.n }) + '</small>' : '') + (e ? '<br><span class="chip blue">' + W.rating + e.rating + '</span>' : '') + (e && e.stageNote ? '<br><small>' + h(e.stageNote) + '</small>' : '') + c.flags.map(function (f) { return '<br><span class="chip">' + h(f) + '</span>'; }).join("") + '</td>';
        }).join("");
        var E = p.E, fl = [];
        r.stages.forEach(function (st) { fl = fl.concat(p.s[st.n].fl); });
        return '<tr><td><span class="link" data-p="' + k + '">' + h(p.name) + '</span></td>' + cells + '<td>' + (E ? W.rating + E.rating + (E.unsure.length ? '<br>' + W.unsure + E.unsure.map(function (u) { return h(u ? title(u) : S.fine); }).join(", ") : '') + (E.note ? '<br><small>' + h(E.note) + '</small>' : '') : '—') + '</td><td>' + (fl.length ? h(fl.join(", ")) : '—') + '</td><td>' + seen(p.seen) + '</td></tr>';
      }).join("");
      var body = T.el('<div>' + bar() + '<div class="srow">' + clsPick() + roundPick(r.maxRound) + '</div><h1>Tracker · ' + h(r.className) + ' · Digital Data · ' + S.round + r.round + '</h1><div class="card">' + (r.rows.length ? '<table class="track"><tr><th>' + W.pupil + '</th>' + r.stages.map(function (st) { return '<th>' + h(st.title) + '</th>'; }).join("") + '<th>' + W.topic + '</th><th>' + W.flagged + '</th><th>' + W.seen + '</th></tr>' + rows + '</table>' : '<p class="sub" style="margin:0">' + W.noPupils + '</p>') + '</div><div id="drawer"></div></div>');
      page(body); wireCommon(body);
      var rp = document.getElementById("rp"); rp.onchange = function () { ROUND = +rp.value; tracker(); };
      body.querySelectorAll("[data-p]").forEach(function (x) { x.onclick = function () { drawer(r.rows[+x.dataset.p]); }; });
    }).catch(fail);
  }
  function drawer(p) {
    T.call("apiStaff", { op: "pupil", cls: CLS, email: p.email, round: ROUND }).then(function (r) {
      var d = document.getElementById("drawer"); if (!d) return;
      d.innerHTML = '<div class="card drawer"><h2>' + h(r.name) + ' · ' + S.round + r.round + '</h2>' + r.items.map(function (it) { return '<div class="it"><b>Stage ' + it.st + ' · ' + h(it.src) + '</b> · ' + it.m + '/' + it.max + (it.f ? ' <span class="chip">' + S.flag + '</span>' : '') + (it.text ? '<div class="w">' + h(it.text) + '</div>' : '') + '</div>'; }).join("") + '<div class="actions"><button class="btn sm ghost" id="shut">' + W.close + '</button></div></div>';
      T.wire("shut", function () { d.innerHTML = ""; }); d.scrollIntoView({ block: "start" });
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
