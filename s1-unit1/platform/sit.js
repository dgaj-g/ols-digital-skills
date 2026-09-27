/* sit.js — the scripted sit (G2 on the harness, G4 on the live /dev link). Runs only with ?sit=1 for the owner (or the
 * harness's dev user). It clears the owner's own record in the class, then plays all four stages through the page itself
 * (tiles, boxes, lists, toggles, Check, Next) with SitPolicy's answers, flags every 7th question, reloads mid-stage, saves
 * every card, checks the summary, restores all 82 marked questions, tries a repeat mark, and opens round 2 for itself.
 * The report is a <pre id="sitReport"> (SIT PASS/FAIL lines, MARKS, a MARKS# hash the gate recomputes in node). */
var Sit = (function () {
  var T, S = S1S.S, lines = [], fails = 0, errors = [];
  function ok(name, good, detail) { if (!good) fails++; lines.push("SIT " + (good ? "PASS " : "FAIL ") + name + (detail ? " · " + detail : "")); paint(); }
  function paint() {
    var p = document.getElementById("sitReport");
    if (!p) { p = document.createElement("pre"); p.id = "sitReport"; p.style.cssText = "position:fixed;right:8px;top:60px;z-index:9;max-width:520px;max-height:70vh;overflow:auto;background:#fff;border:2px solid #1A3A6B;padding:8px;font:12px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap;margin:0"; document.body.appendChild(p); }
    p.textContent = lines.join("\n");
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function until(fn, ms, what) {
    var t0 = Date.now(); ms = ms || 30000;
    return new Promise(function (res, rej) { (function go() { var v; try { v = fn(); } catch (e) { v = false; } if (v) return res(v); if (Date.now() - t0 > ms) return rej(new Error("timeout: " + (what || ""))); setTimeout(go, 60); })(); });
  }
  function $(sel) { return document.querySelector(sel); }
  function all(sel) { return [].slice.call(document.querySelectorAll(sel)); }
  function cur() { return T.cur(); }
  function set(x, v) { x.value = v; x.dispatchEvent(new Event("input", { bubbles: true })); x.dispatchEvent(new Event("change", { bubbles: true })); }
  function tile(part, text) { var t = all('.opts[data-part="' + part + '"] .opt').filter(function (o) { return o.dataset.t === text; })[0]; if (t) t.click(); return !!t; }
  function layout(where) { // nothing spills sideways and nothing is cut off
    var bad = [], work = $("#work");
    if (work && work.scrollWidth > work.clientWidth + 1) bad.push("work scrolls sideways");
    all("header.bar, .stagebar, .card, .opt, .figure, .items .item, .pairs .pr, .choose .ch, .gapsent, .scheme, .wrote, .actions, .sumrows .r, .row, .figure td, .figure th, .ticks label, .item label, .opt span, .tog, .btn, .qtext, .lead").forEach(function (e) {
      if (e.clientWidth && e.scrollWidth > e.clientWidth + 1) bad.push((e.className || e.tagName) + " " + e.scrollWidth + ">" + e.clientWidth);
    });
    all("select").forEach(function (x) { // the chosen words must show whole in the closed list
      if (!x.value || !x.clientWidth) return; var cs = getComputedStyle(x), cv = layout.cv || (layout.cv = document.createElement("canvas").getContext("2d"));
      cv.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      if (cv.measureText(x.options[x.selectedIndex].text).width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 18 <= x.clientWidth) return;
      var said = x.parentNode.querySelector(".said"); // on a phone the chosen words may show whole in the line under the list instead
      if (said && said.clientWidth && said.textContent === x.options[x.selectedIndex].text && said.scrollWidth <= said.clientWidth + 1) return;
      bad.push("list text cut off: " + x.value.slice(0, 30));
    });
    if (document.documentElement.scrollWidth > window.innerWidth + 1) bad.push("page scrolls sideways");
    if (document.documentElement.scrollHeight > window.innerHeight + 1) bad.push("the frame scrolls");
    if (bad.length) ok("layout " + where, false, bad.slice(0, 3).join("; "));
    return !bad.length;
  }
  function rendered(v) { // every part the question asks about is on screen
    var miss = [], qt = $("#qcard > .qtext");
    if (v.q && !(qt && qt.textContent === v.q)) miss.push("wording");
    if (v.figure && !($(".figure table") && $(".figure table").offsetHeight)) miss.push("figure");
    if (v.form === "pairs") { var sels = all("select[data-k]"); if (sels.length !== v.left.length) miss.push("pairs"); sels.forEach(function (s) { if (s.options.length !== v.right.length + 1) miss.push("spare"); }); }
    if (v.form === "gaps" && all("[data-k]").length !== v.gapCount) miss.push("gaps");
    if (v.form === "type") v.items.forEach(function (it, k) { if (it.label && !all(".item label")[k]) miss.push("label " + k); });
    if (v.form === "choose" && all(".ch").length !== v.items.length) miss.push("choose");
    if ((v.form === "pick1" || v.form === "pickN") && all('.opts[data-part=""] .opt').length !== v.options.length) miss.push("tiles");
    return miss;
  }
  var MARKS = {}, FLAGS = [], G = 0, reloaded = false, email, n;
  function answerOne() { // fills the question on screen the way a pupil would, then presses Check (or I don't know)
    var c = cur(), v = c.v, a = SitPolicy.answer(v, email + "|" + n), miss = rendered(v);
    if (miss.length) ok("rendered " + c.qid, false, miss.join(","));
    layout("before " + c.qid);
    if (v.form === "pick1" || v.form === "pickN") a.picks.forEach(function (p) { tile("", p); });
    if (v.form === "writepick") {
      if (a.skipped) $("#skipW").click(); else { set($("#wtext"), a.text); $("#wdone").click(); }
      a.parts.forEach(function (p, k) { p.picks.forEach(function (t) { tile(k, t); }); });
    }
    if (v.form === "type") { if (a.idk) { $("#idk").click(); return; } all("input[data-k]").forEach(function (x, k) { set(x, a.texts[k]); }); }
    if (v.form === "pairs") all("select[data-k]").forEach(function (x, k) { set(x, a.map[k]); });
    if (v.form === "choose") all(".ch").forEach(function (ch, k) { var b = [].filter.call(ch.querySelectorAll(".tog"), function (t) { return t.dataset.t === a.choices[k]; })[0]; if (b) b.click(); });
    if (v.form === "gaps") all("[data-k]").forEach(function (x, k) { set(x, a.fills[k]); });
    var chk = $("#check");
    if (chk.disabled) ok("check enabled " + c.qid, false, v.form);
    chk.click();
  }
  function playStage(st) {
    var b = $('button[data-st="' + st + '"]');
    ok("stage " + st + " button", b && b.textContent === S.start, b && b.textContent);
    b.click();
    return until(function () { return cur().screen === "question" && cur().st === st; }, 30000, "stage " + st).then(function loop() {
      if (cur().screen !== "question") return;
      var c = cur(); G++;
      answerOne();
      return until(function () { return $("#after .result") && cur().r; }, 45000, "marks " + c.qid).then(function () {
        var r = cur().r; MARKS[c.qid] = r.marks;
        var want = T.fmt(S.got, { m: r.marks, x: r.max, w: r.max === 1 ? S.mark : S.marks });
        if ($("#after .result").textContent !== want) ok("result line " + c.qid, false, $("#after .result").textContent);
        if (!$(".scheme li")) ok("scheme " + c.qid, false, "no mark scheme lines");
        layout("after " + c.qid);
        var flag = G % SitPolicy.flagEvery === 0 ? (function () {
          $("#flag").click(); FLAGS.push(c.qid);
          return until(function () { return T.me().topic.rounds[n].s[st].f.some(function (x) { return x.id === c.qid; }); }, 30000, "flag " + c.qid);
        })() : Promise.resolve();
        return flag.then(function () {
          if (st === 2 && c.i === 4 && !reloaded) { // a reload in the middle of a stage: Carry on lands on question 6
            reloaded = true;
            return T.reboot().then(function () {
              T.topic(); var b2 = $('button[data-st="2"]');
              ok("reload shows Carry on", b2 && b2.textContent === S.carry, b2 && b2.textContent);
              b2.click();
              return until(function () { return cur().screen === "question"; }, 30000, "reload").then(function () {
                ok("reload lands on question 6", cur().i === 5 && /Question 6 of/.test($(".stagebar .t").textContent), $(".stagebar .t").textContent);
                return loop();
              });
            });
          }
          $("#next").click();
          return loop();
        });
      });
    }).then(function () {
      ok("stage " + st + " card", cur().screen === "stagecard", cur().screen);
      layout("stage card " + st);
      $("#save").click(); // no rating yet: the card must refuse
      ok("stage card needs a rating", $("#err").textContent === S.rateErr && cur().screen === "stagecard");
      var rating = 1 + SitPolicy.h32(email + "|" + st) % 4;
      $('.rate .opt[data-r="' + rating + '"]').click();
      var tick = $('.ticks input[type=checkbox]'); if (tick) tick.click();
      set($("#conf"), "sit run " + st);
      $("#save").click();
      return until(function () { return cur().screen === (st < 4 ? "topic" : "topiccard"); }, 30000, "card " + st);
    });
  }
  function run(t) {
    T = t; window.addEventListener("error", function (e) { errors.push(String(e.message)); });
    window.addEventListener("unhandledrejection", function (e) { errors.push("promise: " + String(e.reason && (e.reason.code || e.reason.message) || e.reason)); });
    ok("started", true, T.boot.build);
    var me = T.me(); email = me.email;
    var fresh = me.topic.round === 1 && Object.keys(me.topic.rounds).every(function (k) { var r = me.topic.rounds[k]; return Object.keys(r.s).every(function (s) { return !r.s[s].a && !r.s[s].e; }); });
    (fresh ? Promise.resolve() : T.call("apiStaff", { op: "clearMe", cls: T.boot.cls }).then(T.reboot)).then(function () {
      me = T.me(); n = me.topic.round;
      ok("fresh record", n === 1 && !me.needName, "round " + n);
      T.home(); layout("home");
      ok("home line", (($(".topic .foot span") || {}).textContent || "") === S.round + "1 · not started", ($(".topic .foot span") || {}).textContent);
      $("#openLive").click(); layout("topic");
      return [1, 2, 3, 4].reduce(function (p, st) { return p.then(function () { return playStage(st); }); }, Promise.resolve());
    }).then(function () {
      layout("topic card");
      $('.rate .opt[data-r="2"]').click(); $('input[data-u="0"]').click(); set($("#note"), "sit run");
      $("#save").click();
      return until(function () { return cur().screen === "summary"; }, 30000, "summary");
    }).then(function () {
      var tot = 0, qs = Object.keys(MARKS); qs.forEach(function (k) { tot += MARKS[k]; });
      var x = me.topic.stages.reduce(function (s, st) { return s + st.x; }, 0);
      ok("82 questions answered", qs.length === 82, qs.length);
      ok("summary total", $(".card h2").textContent === T.fmt(S.scored, { m: tot, x: x, p: Math.round(100 * tot / x) }), $(".card h2").textContent);
      ok("summary flagged", all(".sumrows .link[data-id]").length === FLAGS.length, all(".sumrows .link[data-id]").length + " of " + FLAGS.length);
      layout("summary");
      lines.push("TOTAL " + tot + " of " + x);
      // every marked question comes back after a reload
      return T.reboot().then(function () {
        var bad = [], seen = 0;
        return [1, 2, 3, 4].reduce(function (p, st) { return p.then(function () { return T.loadStage(n, st).then(function (D) {
          D.order.forEach(function (qid, i) { T.question(st, i, true, n); seen++; var r = $("#after .result"); if (!r || cur().r.marks !== MARKS[qid]) bad.push(qid); });
        }); }); }, Promise.resolve()).then(function () {
          ok("all marked questions restore", seen === 82 && !bad.length, seen + " seen" + (bad.length ? ", wrong " + bad.slice(0, 4).join(",") : ""));
          T.home();
          ok("home line done", $(".topic .foot span").textContent === S.round + "1 · done · " + tot + " of " + x + " marks", $(".topic .foot span").textContent);
          return tot;
        });
      });
    }).then(function (tot) { // first answer wins
      var D = T.cache()[n + "|1"], qid = D.order[0], v = D.views[0];
      return T.call("apiMark", { round: n, qid: qid, answer: SitPolicy.answer(v, "another pupil") }).then(function (r) {
        ok("repeat mark keeps the first", r.repeat === true && r.r.marks === MARKS[qid], "repeat " + r.repeat + " · " + r.r.marks + " vs " + MARKS[qid]);
        return T.call("apiStaff", { op: "openPupil", cls: T.boot.cls, email: email });
      }).then(function (x) {
        ok("teacher opens round 2", x.round === 2, x.round);
        return T.reboot();
      }).then(function () {
        var m2 = T.me();
        var r1 = [1, 2, 3, 4].reduce(function (s, st) { return s + m2.topic.rounds[1].s[st].m; }, 0);
        ok("round 1 kept", r1 === tot, r1 + " vs " + tot);
        ok("round 2 current", m2.topic.round === 2);
        T.home();
        ok("home line round 2", $(".topic .foot span").textContent === S.round + "2 open · not started", $(".topic .foot span").textContent);
        return T.loadStage(2, 1).then(function (D2) { ok("round 2 new order", D2.order.join() !== D.order.join()); T.topic(); layout("topic round 2"); });
      });
    }).catch(function (e) { ok("run", false, e && (e.code || e.message)); }).then(function () {
      ok("no page errors", !errors.length, errors.slice(0, 3).join(" | "));
      var ms = Object.keys(MARKS).sort().map(function (k) { return k + ":" + MARKS[k]; }).join(",");
      lines.push("MARKS " + ms);
      lines.push("MARKS# " + SitPolicy.h32(ms).toString(16) + " · " + Object.keys(MARKS).length + " questions · flags " + FLAGS.length);
      lines.push("SIT RESULT " + (fails ? "FAIL (" + fails + ")" : "PASS"));
      paint(); window.__SIT = { done: true, pass: !fails, lines: lines.slice() };
    });
  }
  return { run: run };
})();
