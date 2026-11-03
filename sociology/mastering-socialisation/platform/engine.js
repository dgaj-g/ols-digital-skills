/* Mastering Socialisation — activity engine: every form the pupil answers.
   Views come from the server key-free; answers go to apiMark / apiWrite; marking comes back as `per`. */
var Engine = (function(){
  var T, S;
  function init(t){ T = t; S = t.S; }
  function h(s){ return T.h(s); }
  function fmt(s, o){ return T.fmt(s, o); }
  function el(html){ return T.el(html); }
  function q(root, sel){ return root.querySelector(sel); }
  function qa(root, sel){ return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function letter(i){ return "ABCDEFGH".charAt(i); }

  /* ---------- phrases inside an item ---------- */
  function markPhrases(text, phrases, cls){
    var out = "", pos = 0, i, at, missing = [];
    for (i = 0; i < phrases.length; i++){
      at = text.indexOf(phrases[i], pos);
      if (at < 0){ at = text.indexOf(phrases[i]); if (at < pos) { missing.push(i); continue; } }
      out += h(text.slice(pos, at)) + '<span class="ph ' + (cls||"") + '" role="button" tabindex="0" aria-pressed="false" data-i="' + i + '">' + h(phrases[i]) + '</span>';
      pos = at + phrases[i].length;
    }
    out += h(text.slice(pos));
    if (missing.length){
      out += '<span class="row" style="margin-top:8px">' + missing.map(function(i){ return '<span class="ph ' + (cls||"") + '" role="button" tabindex="0" aria-pressed="false" data-i="' + i + '">' + h(phrases[i]) + '</span>'; }).join("") + '</span>';
    }
    return out;
  }
  function itemBox(text, phrases, cls){
    if (!text) return "";
    return '<div class="item"><span class="ih">' + h(S.itemHead) + '</span>' + (phrases ? markPhrases(text, phrases, cls) : h(text)) + '</div>';
  }
  function underline(text, phrases){
    var out = h(text);
    (phrases||[]).forEach(function(p){ var hp = h(p); if (out.indexOf(hp) >= 0) out = out.split(hp).join("<u>" + hp + "</u>"); });
    return out;
  }

  /* ---------- drag core (Pointer Events; element follows the pointer 1:1; never re-parented mid-gesture) ---------- */
  function drag(root, o){
    var cur = null;
    function under(e){
      var c = cur.card, v = c.style.visibility; c.style.visibility = "hidden";
      var t = document.elementFromPoint(e.clientX, e.clientY); c.style.visibility = v; return t;
    }
    function start(e){
      var c = cur.card, r = c.getBoundingClientRect();
      cur.moved = true; cur.ox = e.clientX - r.left; cur.oy = e.clientY - r.top;
      c.style.setProperty("--w", r.width + "px");
      if (o.sort){ cur.ph = el('<li class="ph" style="height:' + r.height + 'px"></li>'); c.parentNode.insertBefore(cur.ph, c.nextSibling); }
      else { cur.ghost = c.cloneNode(true); cur.ghost.classList.add("ghost"); cur.ghost.removeAttribute("aria-pressed"); c.parentNode.insertBefore(cur.ghost, c.nextSibling); }
      c.classList.add("dragging"); c.style.left = r.left + "px"; c.style.top = r.top + "px";
      document.body.classList.add("dragging-active");
      if (o.onStart) o.onStart(c);
    }
    function move(e){
      var c = cur.card; c.style.left = (e.clientX - cur.ox) + "px"; c.style.top = (e.clientY - cur.oy) + "px";
      var H = window.innerHeight;
      if (e.clientY < 70) window.scrollBy({top: -14, behavior: "instant"}); else if (e.clientY > H - 70) window.scrollBy({top: 14, behavior: "instant"});
      var t = under(e);
      if (o.sort){
        var over = t && t.closest(o.cardSel);
        if (over && over !== c && !over.classList.contains("ghost") && o.sort.contains(over)){
          var r = over.getBoundingClientRect();
          if (e.clientY < r.top + r.height / 2) o.sort.insertBefore(cur.ph, over); else o.sort.insertBefore(cur.ph, over.nextSibling);
        }
        return;
      }
      var tg = t && t.closest(o.targetSel);
      if (tg && !root.contains(tg)) tg = null;
      if (cur.over && cur.over !== tg) cur.over.classList.remove("over");
      if (tg) tg.classList.add("over");
      cur.over = tg || null;
    }
    function finish(dropped){
      var c = cur.card;
      c.classList.remove("dragging"); c.style.left = ""; c.style.top = ""; c.style.removeProperty("--w");
      document.body.classList.remove("dragging-active");
      if (cur.over) cur.over.classList.remove("over");
      if (o.sort){ var ph = cur.ph; if (dropped) o.sort.insertBefore(c, ph); ph.parentNode && ph.parentNode.removeChild(ph); if (o.onSort) o.onSort(); return; }
      if (cur.ghost && cur.ghost.parentNode) cur.ghost.parentNode.removeChild(cur.ghost);
      if (dropped && cur.over) o.onDrop(c, cur.over);
    }
    root.addEventListener("pointerdown", function(e){
      var card = e.target.closest(o.cardSel);
      if (!card || !root.contains(card) || card.classList.contains("ghost")) return;
      if (e.button) return;
      if (o.canDrag && !o.canDrag(card)) return;
      cur = {card: card, id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false};
      try { card.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    });
    root.addEventListener("pointermove", function(e){
      if (!cur || e.pointerId !== cur.id) return;
      if (!cur.moved){ if (Math.abs(e.clientX - cur.sx) + Math.abs(e.clientY - cur.sy) < 6) return; start(e); }
      move(e);
    });
    root.addEventListener("pointerup", function(e){
      if (!cur || e.pointerId !== cur.id) return;
      if (cur.moved) finish(true); else if (o.onTap) o.onTap(cur.card);
      cur = null;
    });
    root.addEventListener("pointercancel", function(e){ if (cur && e.pointerId === cur.id){ if (cur.moved) finish(false); cur = null; } });
    if (o.targetSel && o.onTapTarget){
      root.addEventListener("click", function(e){
        if (e.target.closest(o.cardSel)) return;
        var tg = e.target.closest(o.targetSel); if (tg && root.contains(tg)) o.onTapTarget(tg);
      });
    }
    root.addEventListener("keydown", function(e){
      var card = e.target.closest && e.target.closest(o.cardSel);
      if (card && (e.key === "Enter" || e.key === " ") && o.onTap){ e.preventDefault(); o.onTap(card); }
    });
  }

  /* ---------- common pieces ---------- */
  function bestLine(open){
    if (open.attempts && open.best != null && open.attempts > 0) return fmt(S.best, {n: open.best, m: open.max});
    return S.first;
  }
  function checkBar(root, total, o){
    var bar = el('<div class="checkbar"><button class="btn big" id="ck" disabled>' + h(fmt(S.checkN, {m: total})) + '</button><span class="cnt" id="cnt"></span></div>');
    root.appendChild(bar);
    var btn = q(bar, "#ck"), cnt = q(bar, "#cnt");
    var api = {
      btn: btn,
      set: function(n){
        var ok = n >= total;
        btn.disabled = !ok; btn.textContent = ok ? S.check : fmt(S.checkN, {m: total});
        cnt.textContent = fmt(S.placed, {n: n, m: total});
        if (o && o.countText) cnt.textContent = o.countText(n, total);
      },
      done: function(){ btn.disabled = true; btn.textContent = S.checkDone; cnt.textContent = ""; }
    };
    btn.addEventListener("click", function(){ if (!btn.disabled && o && o.onCheck) o.onCheck(btn); });
    return api;
  }
  function resultCard(r, open, extraHtml){
    var full = r.score >= r.max;
    var html = '<div class="res' + (full ? " full" : "") + '" role="status">' +
      '<div class="score">' + h(fmt(S.result, {n: r.score, m: r.max})) + '</div>' +
      (full ? '<p class="line">' + h(S.full) + '</p>' : '<p class="line">' + h(S.resultLine) + '</p>') +
      '<p class="line">' + h(fmt(S.best, {n: r.best, m: r.max})) + (r.pts > 0 ? ' · +' + h(r.pts === 1 ? S.pts1 : fmt(S.pts, {n: r.pts})) : '') + '</p>' +
      (extraHtml || "") +
      '<div class="row"><button class="btn ghost" id="again">' + h(S.again) + '</button></div></div>';
    return el(html);
  }
  function mark(root, open, ans, o, btn, after){
    var req = {act: open.act, a: open.a, ans: ans};
    if (open.round) req.round = open.round;
    return T.call("apiMark", req, {save: true, btn: btn}).then(function(r){
      T.marked(r);
      after(r);
      return r;
    }).catch(function(e){ if (o && o.onErr) o.onErr(e); });
  }
  function wireAgain(card, o){ var b = q(card, "#again"); if (b) b.addEventListener("click", function(){ o.reopen(); }); }

  /* ---------- MCQ (also scenes, daily) ---------- */
  function mcq(root, open, o){
    var v = open.view, qs = v.qs || v.scenes, ans = {}, isScene = !!v.scenes;
    root.appendChild(el('<p class="intro">' + h(open.intro || (isScene ? S.scenesIntro : S.mcqIntro)) + '</p>'));
    var list = el('<div class="qs"></div>'); root.appendChild(list);
    qs.forEach(function(it, qi){
      var qt = it.q || it.t;
      var html = '<div class="q" data-q="' + qi + '"><div class="qn">' + h(fmt(S.qList, {n: qi + 1, m: qs.length})) + '</div>' +
        (it.img ? '<img src="' + h(T.img(it.img.file || it.img)) + '" alt="' + h(it.img.alt || "") + '">' : '') +
        '<div class="qt">' + h(qt) + '</div><div class="opts" role="group" aria-label="' + h(fmt(S.qList, {n: qi + 1, m: qs.length})) + '">' +
        it.opts.map(function(op, oi){ return '<button class="opt" aria-pressed="false" data-o="' + oi + '"><span class="k">' + letter(oi) + '</span><span>' + h(op) + '</span></button>'; }).join("") +
        '</div>' + (it.img && it.img.credit ? '<p class="small mute" style="margin:8px 0 0">' + h(it.img.credit) + '</p>' : '') + '</div>';
      list.appendChild(el(html));
    });
    var bar = checkBar(root, qs.length, {countText: function(n, m){ return n + " of " + m + " answered"; }, onCheck: function(btn){
      var arr = qs.map(function(_, i){ return ans[i]; });
      mark(root, open, arr, o, btn, function(r){
        bar.done();
        r.per.forEach(function(p, i){
          var qe = q(list, '[data-q="' + i + '"]'), opts = qa(qe, ".opt");
          opts.forEach(function(b, oi){ b.disabled = true; if (oi === p.k) b.classList.add("right"); else if (oi === ans[i]) b.classList.add("wrong"); });
          var why = '<div class="why ' + (p.ok ? "ok" : "no") + '"><span class="mark ' + (p.ok ? "ok" : "no") + '">' + (p.ok ? "✓" : "✗") + '</span> ' +
            (p.ok ? "" : '<b>' + h(fmt(S.rightWas, {k: qs[i].opts[p.k]})) + '</b> ') +
            (p.why ? '<span>' + h(S.whyLabel) + ' ' + h(p.why) + '</span>' : '') +
            (p.tag ? '<span class="tag" style="margin-left:8px">' + h(S.tagLabel) + ' ' + h(p.tag) + '</span>' : '') + '</div>';
          qe.appendChild(el(why));
        });
        var rc = resultCard(r, open); root.insertBefore(rc, bar.btn.parentNode); wireAgain(rc, o);
        rc.scrollIntoView({behavior: "smooth", block: "start"});
      });
    }});
    bar.set(0);
    list.addEventListener("click", function(e){
      var b = e.target.closest(".opt"); if (!b || b.disabled) return;
      var qe = b.closest(".q"), qi = +qe.dataset.q;
      qa(qe, ".opt").forEach(function(x){ x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true"); ans[qi] = +b.dataset.o;
      bar.set(Object.keys(ans).length);
    });
  }

  /* ---------- tick (A or B) ---------- */
  function tick(root, open, o){
    var v = open.view, ans = {};
    root.appendChild(el('<p class="intro">' + h(open.intro || S.tickIntro) + '</p>'));
    var list = el('<div class="qs"></div>'); root.appendChild(list);
    v.rows.forEach(function(r, i){
      list.appendChild(el('<div class="q" data-q="' + i + '"><div class="qn">' + (i + 1) + ' of ' + v.rows.length + '</div><div class="qt">' + h(r.t) + '</div><div class="ab" role="group">' +
        '<button class="opt" aria-pressed="false" data-o="0"><span class="k">A</span><span>' + h(v.a) + '</span></button>' +
        '<button class="opt" aria-pressed="false" data-o="1"><span class="k">B</span><span>' + h(v.b) + '</span></button></div></div>'));
    });
    var bar = checkBar(root, v.rows.length, {countText: function(n, m){ return n + " of " + m + " set"; }, onCheck: function(btn){
      mark(root, open, v.rows.map(function(_, i){ return ans[i]; }), o, btn, function(r){
        bar.done();
        r.per.forEach(function(p, i){
          var qe = q(list, '[data-q="' + i + '"]');
          qa(qe, ".opt").forEach(function(b, oi){ b.disabled = true; if (oi === p.k) b.classList.add("right"); else if (oi === ans[i]) b.classList.add("wrong"); });
          qe.appendChild(el('<div class="why ' + (p.ok ? "ok" : "no") + '"><span class="mark ' + (p.ok ? "ok" : "no") + '">' + (p.ok ? "✓" : "✗") + '</span> ' + (p.ok ? "" : '<b>' + h(fmt(S.rightWas, {k: p.k ? v.b : v.a})) + '</b> ') + (p.why ? h(S.whyLabel) + ' ' + h(p.why) : '') + '</div>'));
        });
        var rc = resultCard(r, open); root.insertBefore(rc, bar.btn.parentNode); wireAgain(rc, o); rc.scrollIntoView({behavior: "smooth", block: "start"});
      });
    }});
    bar.set(0);
    list.addEventListener("click", function(e){
      var b = e.target.closest(".opt"); if (!b || b.disabled) return;
      var qe = b.closest(".q"), qi = +qe.dataset.q;
      qa(qe, ".opt").forEach(function(x){ x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true"); ans[qi] = +b.dataset.o; bar.set(Object.keys(ans).length);
    });
  }

  /* ---------- branch (story, then five asks) ---------- */
  function branch(root, open, o){
    var v = open.view, step = 0;
    root.appendChild(el('<p class="intro">' + h(open.intro || S.branchIntro) + '</p>'));
    var story = el('<div class="story"></div>'); root.appendChild(story);
    function showStep(){
      var st = v.steps[step];
      var card = el('<div class="q"><div class="qn">Step ' + (step + 1) + ' of ' + v.steps.length + '</div><div class="qt">' + h(st.t) + '</div><div class="opts">' +
        st.choices.map(function(c, i){ return '<button class="opt" data-c="' + i + '"><span class="k">' + letter(i) + '</span><span>' + h(c.t) + '</span></button>'; }).join("") + '</div></div>');
      story.appendChild(card);
      card.addEventListener("click", function(e){
        var b = e.target.closest(".opt"); if (!b || b.disabled) return;
        qa(card, ".opt").forEach(function(x){ x.disabled = true; }); b.setAttribute("aria-pressed", "true");
        var then = st.choices[+b.dataset.c].then;
        var nx = el('<div class="why"><p>' + h(then) + '</p><button class="btn sm" id="go">' + h(step + 1 < v.steps.length ? S.branchNext : S.branchAsk) + '</button></div>');
        card.appendChild(nx);
        q(nx, "#go").addEventListener("click", function(){ this.disabled = true; step++; if (step < v.steps.length) showStep(); else asks(); });
        nx.scrollIntoView({behavior: "smooth", block: "nearest"});
      });
      card.scrollIntoView({behavior: "smooth", block: "nearest"});
    }
    function asks(){
      var sub = {act: open.act, a: open.a, max: open.max, best: open.best, attempts: open.attempts, intro: S.branchAsk, view: {qs: v.asks}};
      var box = el('<div class="asks"></div>'); root.appendChild(box);
      mcq(box, sub, o);
      box.scrollIntoView({behavior: "smooth", block: "start"});
    }
    showStep();
  }

  /* ---------- bins (drag cards into bins; rounds) ---------- */
  function bins(root, open, o){
    var v = open.view, n = v.cards.length, two = v.bins.length === 4 && /formal/i.test(v.bins[0].label) && /positive|negative/i.test(v.bins[0].label);
    root.appendChild(el('<p class="intro">' + h(v.rounds > 1 ? fmt(S.binsIntro, {n: v.round, r: v.rounds}) : (open.intro || fmt(S.binsIntro, {n: 1, r: 1}))) + '</p>'));
    var tray = el('<div class="tray"><h3>' + h(S.trayHead) + '<span class="cnt" id="tc"></span></h3><div class="in" id="tin"></div></div>');
    var grid = el('<div class="bins' + (v.bins.length === 2 || v.bins.length === 4 ? " two" : "") + '"></div>');
    v.cards.forEach(function(c){ q(tray, "#tin").appendChild(el('<div class="dcard" tabindex="0" role="button" aria-pressed="false" data-i="' + c.i + '">' + h(c.t) + '</div>')); });
    v.bins.forEach(function(b){ grid.appendChild(el('<div class="bin" data-bin="' + h(b.id) + '" role="group" aria-label="' + h(b.label) + '"><div class="bh">' + h(b.label) + '</div><div class="bt">' + h(b.hint || "") + '</div><div class="in"></div></div>')); });
    root.appendChild(tray); root.appendChild(grid);
    var sel = null, done = false;
    function count(){ var placed = qa(grid, ".dcard").length; q(tray, "#tc").textContent = fmt(S.placed, {n: placed, m: n}); tray.classList.toggle("empty", placed === n); bar.set(placed); }
    function place(card, bin){ q(bin, ".in").appendChild(card); card.setAttribute("aria-pressed", "false"); sel = null; count(); }
    drag(root, {cardSel: ".dcard", targetSel: ".bin, .tray", canDrag: function(){ return !done; },
      onDrop: function(card, tg){ if (tg.classList.contains("tray")) { q(tray, "#tin").appendChild(card); count(); } else place(card, tg); },
      onTap: function(card){ if (done) return; var on = card.getAttribute("aria-pressed") === "true"; qa(root, ".dcard").forEach(function(c){ c.setAttribute("aria-pressed", "false"); }); if (!on){ card.setAttribute("aria-pressed", "true"); sel = card; } else sel = null; },
      onTapTarget: function(tg){ if (done || !sel) return; if (tg.classList.contains("tray")) { q(tray, "#tin").appendChild(sel); sel.setAttribute("aria-pressed", "false"); sel = null; count(); } else place(sel, tg); }
    });
    var bar = checkBar(root, n, {onCheck: function(btn){
      var ans = {round: v.round || 1, bin: v.cards.map(function(c){ var e = q(grid, '.dcard[data-i="' + c.i + '"]'); return e ? e.closest(".bin").dataset.bin : null; })};
      mark(root, open, ans, o, btn, function(r){
        done = true; bar.done();
        var labels = {}; v.bins.forEach(function(b){ labels[b.id] = b.label; });
        r.per.forEach(function(p){ var e = q(grid, '.dcard[data-i="' + p.i + '"]'); if (!e) return; e.classList.add(p.ok ? "ok" : "no"); e.setAttribute("tabindex", "-1"); if (!p.ok) e.appendChild(el('<span class="fix">' + h(fmt(S.rightWas, {k: labels[p.bin] || p.bin})) + '</span>')); });
        var extra = "";
        if (v.rounds > 1){
          if ((v.round || 1) < v.rounds) extra = '<p><button class="btn acc" id="nr">' + h(fmt(S.roundDone, {n: v.round})) + '</button></p>';
          else extra = '<p><b>' + h(fmt(S.allRounds, {n: r.best, m: open.max})) + '</b></p>';
        }
        var rc = resultCard({score: r.score, max: v.cards.length, best: v.rounds > 1 ? (r.per.filter(function(p){ return p.ok; }).length) : r.best, pts: r.pts}, open, extra);
        if (v.rounds > 1) q(rc, ".line:nth-of-type(2)") && (q(rc, ".line:nth-of-type(2)").textContent = fmt(S.best, {n: r.best, m: open.max}) + (r.pts > 0 ? " · +" + fmt(S.pts, {n: r.pts}) : ""));
        root.insertBefore(rc, bar.btn.parentNode); wireAgain(rc, o);
        var nr = q(rc, "#nr"); if (nr) nr.addEventListener("click", function(){ o.reopen((v.round || 1) + 1); });
        rc.scrollIntoView({behavior: "smooth", block: "start"});
      });
    }});
    count();
  }

  /* ---------- match (drag a chip onto each example) ---------- */
  function match(root, open, o){
    var v = open.view, n = v.cards.length, done = false, sel = null;
    root.appendChild(el('<p class="intro">' + h(open.intro || S.matchIntro) + '</p>'));
    var tray = el('<div class="tray"><h3>' + h(S.chipTray) + '<span class="cnt" id="tc"></span></h3><div class="in" id="tin"></div></div>');
    v.chips.forEach(function(c, i){ q(tray, "#tin").appendChild(el('<div class="dcard chip" tabindex="0" role="button" aria-pressed="false" data-chip="' + h(c) + '">' + h(c) + '</div>')); });
    var list = el('<div class="matchlist"></div>');
    v.cards.forEach(function(c){ list.appendChild(el('<div class="mrow" data-i="' + c.i + '"><div class="mt">' + h(c.t) + '</div><div class="slot" role="group">' + h(S.drop) + '</div></div>')); });
    root.appendChild(tray); root.appendChild(list);
    function count(){ var placed = qa(list, ".slot .dcard").length; q(tray, "#tc").textContent = fmt(S.placed, {n: placed, m: n}); tray.classList.toggle("empty", placed === n); bar.set(placed); }
    function place(card, slot){
      var had = q(slot, ".dcard"); if (had) q(tray, "#tin").appendChild(had);
      slot.textContent = ""; slot.appendChild(card); card.setAttribute("aria-pressed", "false"); sel = null; count();
    }
    function toTray(card){ var slot = card.closest(".slot"); q(tray, "#tin").appendChild(card); if (slot && !q(slot, ".dcard")) slot.textContent = S.drop; card.setAttribute("aria-pressed", "false"); sel = null; count(); }
    function slotOf(tg){ return tg.classList.contains("mrow") ? q(tg, ".slot") : tg; }
    drag(root, {cardSel: ".dcard", targetSel: ".mrow, .tray", canDrag: function(){ return !done; },
      onStart: function(card){ var slot = card.closest(".slot"); if (slot) slot.dataset.from = "1"; },
      onDrop: function(card, tg){ tg = slotOf(tg); var from = card.closest(".slot"); if (tg.classList.contains("tray")) toTray(card); else { place(card, tg); } if (from && from !== tg && !q(from, ".dcard")) from.textContent = S.drop; },
      onTap: function(card){ if (done) return; var on = card.getAttribute("aria-pressed") === "true"; qa(root, ".dcard").forEach(function(c){ c.setAttribute("aria-pressed", "false"); }); if (!on){ card.setAttribute("aria-pressed", "true"); sel = card; } else sel = null; },
      onTapTarget: function(tg){ if (done || !sel) return; tg = slotOf(tg); var from = sel.closest(".slot"); if (tg.classList.contains("tray")) toTray(sel); else place(sel, tg); if (from && from !== tg && !q(from, ".dcard")) from.textContent = S.drop; }
    });
    var bar = checkBar(root, n, {onCheck: function(btn){
      var ans = v.cards.map(function(c){ var e = q(list, '.mrow[data-i="' + c.i + '"] .slot .dcard'); return e ? e.dataset.chip : null; });
      mark(root, open, ans, o, btn, function(r){
        done = true; bar.done();
        r.per.forEach(function(p){ var row = q(list, '.mrow[data-i="' + p.i + '"]'), slot = q(row, ".slot"); slot.classList.add(p.ok ? "ok" : "no"); qa(slot, ".dcard").forEach(function(c){ c.setAttribute("tabindex", "-1"); c.classList.add(p.ok ? "ok" : "no"); }); if (!p.ok) row.appendChild(el('<div class="fix">' + h(fmt(S.rightWas, {k: p.chip})) + '</div>')); });
        var rc = resultCard(r, open); root.insertBefore(rc, bar.btn.parentNode); wireAgain(rc, o); rc.scrollIntoView({behavior: "smooth", block: "start"});
      });
    }});
    count();
  }

  /* ---------- order (drag steps into order) ---------- */
  function orderList(root, steps, o){
    var list = el('<ol class="ordlist" aria-label="' + h(S.orderIntro) + '"></ol>');
    steps.forEach(function(s, i){ list.appendChild(el('<li class="dcard" tabindex="0" role="button" data-t="' + h(s) + '"><span class="n">' + (i + 1) + '</span><span class="t">' + h(s) + '</span><span class="grip" aria-hidden="true">⋮⋮</span></li>')); });
    root.appendChild(list);
    var done = false, sel = null;
    function renum(){ qa(list, ".dcard").forEach(function(c, i){ q(c, ".n").textContent = i + 1; }); if (o.onChange) o.onChange(); }
    drag(root, {cardSel: ".dcard", sort: list, canDrag: function(){ return !done; }, onSort: renum,
      onTap: function(card){ if (done) return; if (sel && sel !== card){ var a = sel, b = card; var an = a.nextSibling; var bn = b.nextSibling; if (an === b){ list.insertBefore(b, a); } else if (bn === a){ list.insertBefore(a, b); } else { list.insertBefore(a, bn); list.insertBefore(b, an); } a.setAttribute("aria-pressed", "false"); sel = null; renum(); return; }
        var on = card.getAttribute("aria-pressed") === "true"; qa(list, ".dcard").forEach(function(c){ c.setAttribute("aria-pressed", "false"); }); if (!on){ card.setAttribute("aria-pressed", "true"); sel = card; } else sel = null; }
    });
    return {list: list, get: function(){ return qa(list, ".dcard").map(function(c){ return c.dataset.t; }); }, lock: function(){ done = true; qa(list, ".dcard").forEach(function(c){ c.setAttribute("tabindex", "-1"); }); },
      show: function(per, whys){ qa(list, ".dcard").forEach(function(c, i){ var p = per[i]; c.classList.add(p.ok ? "ok" : "no"); if (!p.ok) c.appendChild(el('<span class="fix">' + h("Step " + p.pos) + '</span>')); if (whys && whys[i]) c.appendChild(el('<span class="fix" style="color:var(--mute)">' + h(whys[i]) + '</span>')); }); }};
  }
  function order(root, open, o){
    var v = open.view;
    root.appendChild(el('<p class="intro">' + h(open.intro || S.orderIntro) + '</p>'));
    var ol = orderList(root, v.steps, {});
    var bar = checkBar(root, v.steps.length, {onCheck: function(btn){
      mark(root, open, ol.get(), o, btn, function(r){
        bar.done(); ol.lock();
        var whys = (r.extra && r.extra.whys) || null;
        var byPos = {}; r.per.forEach(function(p){ byPos[p.t] = p; });
        ol.show(ol.get().map(function(t){ return byPos[t] || {ok: false, pos: "?"}; }), null);
        var rc = resultCard(r, open); root.insertBefore(rc, bar.btn.parentNode); wireAgain(rc, o); rc.scrollIntoView({behavior: "smooth", block: "start"});
      });
    }});
    bar.set(v.steps.length);
  }

  /* ---------- tap (one phrase per item) ---------- */
  function tap(root, open, o){
    var v = open.view, ans = {};
    root.appendChild(el('<p class="intro">' + h(open.intro || S.tapIntro) + '</p>'));
    var list = el('<div class="qs"></div>'); root.appendChild(list);
    v.items.forEach(function(it, i){
      list.appendChild(el('<div class="q" data-q="' + i + '"><div class="qn">' + h(fmt(S.qList, {n: i + 1, m: v.items.length})) + '</div>' + (it.q ? '<div class="qt">' + h(it.q) + '</div>' : '') + itemBox(it.item, it.phrases) + '</div>'));
    });
    var bar = checkBar(root, v.items.length, {countText: function(n, m){ return n + " of " + m + " tapped"; }, onCheck: function(btn){
      mark(root, open, v.items.map(function(_, i){ return ans[i] == null ? [] : [ans[i]]; }), o, btn, function(r){
        bar.done();
        r.per.forEach(function(p, i){
          var qe = q(list, '[data-q="' + i + '"]');
          qa(qe, ".ph").forEach(function(s){ var k = +s.dataset.i; s.classList.add("done"); s.setAttribute("tabindex", "-1"); if (p.k.indexOf(k) >= 0) s.classList.add("ok"); else if (ans[i] === k) s.classList.add("no"); });
          qe.appendChild(el('<div class="why ' + (p.ok ? "ok" : "no") + '"><span class="mark ' + (p.ok ? "ok" : "no") + '">' + (p.ok ? "✓" : "✗") + '</span> ' + (p.ok ? "" : '<b>' + h(fmt(S.rightWas, {k: p.k.map(function(k){ return v.items[i].phrases[k]; }).join(" / ")})) + '</b> ') + (p.why ? h(S.whyLabel) + ' ' + h(p.why) : '') + '</div>'));
        });
        var rc = resultCard(r, open); root.insertBefore(rc, bar.btn.parentNode); wireAgain(rc, o); rc.scrollIntoView({behavior: "smooth", block: "start"});
      });
    }});
    bar.set(0);
    function pick(s){
      if (s.classList.contains("done")) return;
      var qe = s.closest(".q"), qi = +qe.dataset.q, on = s.getAttribute("aria-pressed") === "true";
      qa(qe, ".ph").forEach(function(x){ x.setAttribute("aria-pressed", "false"); });
      if (on){ delete ans[qi]; } else { s.setAttribute("aria-pressed", "true"); ans[qi] = +s.dataset.i; }
      bar.set(Object.keys(ans).length);
    }
    list.addEventListener("click", function(e){ var s = e.target.closest(".ph"); if (s) pick(s); });
    list.addEventListener("keydown", function(e){ var s = e.target.closest(".ph"); if (s && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); pick(s); } });
  }

  /* ---------- builder (DIET five-mark; PEEL ten-mark) ---------- */
  function modelPanel(extra, scheme){
    if (!extra || !extra.model) return "";
    var m = extra.model, ao = extra.ao || {}, html = '<div class="model"><h3>' + h(S.modelHead) + '</h3><p class="small mute">' + h(S.modelNote) + '</p>';
    function para(obj, keys, labels){
      return keys.map(function(k){ if (!obj[k]) return ""; var a = (ao[k] || "AO1").toLowerCase(); return '<p class="' + a + '"><span class="lbl">' + h(labels[k] || k) + ' · ' + h(ao[k] || "AO1") + '</span> ' + underline(obj[k], extra.phrases) + '</p>'; }).join("");
    }
    if (m.d !== undefined){
      html += para(m, ["d", "i", "e", "t"], {d: "Define", i: "Item", e: "Example", t: "Theory"});
    } else if (m.p1){
      var L = {point: "Point", evidence: "Evidence", apply: "Apply the item", explain: "Explain", link: "Link back"};
      if (scheme === "3+2+2+2+1") L = {point: "How it works", evidence: "Example", apply: "Research", explain: "What it shows", link: "Conclusion"};
      html += '<h4>' + h(S.para1) + '</h4>' + para(m.p1, ["point", "evidence", "apply", "explain", "link"], L) + '<h4>' + h(S.para2) + '</h4>' + para(m.p2, ["point", "evidence", "apply", "explain", "link"], L);
    }
    if (extra.why_marks && extra.why_marks.length) html += '<div class="strip"><b>' + h(S.markStrip) + '</b><ul>' + extra.why_marks.map(function(w){ return '<li>' + h(w) + '</li>'; }).join("") + '</ul></div>';
    return html + '</div>';
  }
  function builderPanel(root, v, open){
    var slots = v.slots, ans = {}, orders = {}, moved = {}, isTen = !!v.scheme;
    var qq = v.q || v.stem; if (qq) root.appendChild(el('<div class="q"><div class="qn">' + h(S.questionHead) + '</div><div class="qt">' + h(qq) + (v.marks ? ' <span class="pill">' + h(fmt(S.qMarks, {m: v.marks})) + '</span>' : '') + '</div></div>'));
    if (v.item) root.appendChild(el(itemBox(v.item)));
    if (isTen && !v.item) root.appendChild(el('<p class="say">' + h(S.tenNoItem) + ' ' + h(S.schemeHer) + '</p>'));
    var list = el('<div class="slots"></div>'); root.appendChild(list);
    var lastPara = null;
    function want(sl){ return sl.pickN || sl.picks || (isTen ? 1 : 2); }
    slots.forEach(function(sl, si){
      if (isTen && sl.para && sl.para !== lastPara){ list.appendChild(el('<h3 class="para">' + h(sl.para === "1" || sl.para === 1 ? S.para1 : S.para2) + '</h3>')); lastPara = sl.para; }
      var head = '<div class="sl"><span class="let">' + h(sl.label || "") + '</span>' + (sl.ao ? ' <span class="tag ' + sl.ao.toLowerCase() + '">' + h(sl.ao) + '</span>' : '') + '</div>';
      var body = "";
      if (sl.type === "pick") body = '<p class="small mute">' + h(S.slotPick) + '</p><div class="opts">' + sl.opts.map(function(op, oi){ return '<button class="opt" aria-pressed="false" data-o="' + oi + '"><span class="k">' + letter(oi) + '</span><span>' + h(op) + '</span></button>'; }).join("") + '</div>';
      else if (sl.type === "tap") body = '<p class="small mute">' + h(want(sl) === 1 ? S.slotTapOne : S.slotTap) + '</p>' + itemBox(sl.item || v.item, sl.phrases);
      else if (sl.type === "order") body = '<p class="small mute">' + h(S.slotOrder) + '</p>';
      var c = el('<div class="slotc" data-s="' + si + '" data-type="' + h(sl.type) + '">' + head + body + '</div>');
      list.appendChild(c);
      if (sl.type === "order"){ orders[si] = orderList(c, sl.steps, {onChange: function(){ moved[si] = true; onChange(); }}); }
    });
    function filled(){ return slots.filter(function(sl, si){ return sl.type === "order" ? !!moved[si] : (sl.type === "tap" ? (ans[si] && ans[si].length === want(sl)) : ans[si] != null); }).length; }
    function get(){ return slots.map(function(sl, si){ return sl.type === "order" ? orders[si].get() : ans[si]; }); }
    function show(per, extra){
      (per || []).forEach(function(p, si){
        var c = q(list, '[data-s="' + si + '"]'), sl = slots[si]; if (!c || !sl) return;
        c.classList.add(p.ok ? "ok" : "no");
        if (sl.type === "pick"){ qa(c, ".opt").forEach(function(b, oi){ b.disabled = true; if (oi === p.k) b.classList.add("right"); else if (oi === ans[si]) b.classList.add("wrong"); }); }
        else if (sl.type === "tap"){ qa(c, ".ph").forEach(function(s){ var k = +s.dataset.i; s.classList.add("done"); s.setAttribute("tabindex", "-1"); if ((p.k || []).indexOf(k) >= 0) s.classList.add("ok"); else if ((ans[si] || []).indexOf(k) >= 0) s.classList.add("no"); }); }
        else if (sl.type === "order"){ orders[si].lock(); var byT = {}; (p.per || []).forEach(function(x){ byT[x.t] = x; }); orders[si].show(orders[si].get().map(function(t){ return byT[t] || {ok: p.ok, pos: ""}; }), null); }
        var line = '<div class="why ' + (p.ok ? "ok" : "no") + '"><span class="mark ' + (p.ok ? "ok" : "no") + '">' + (p.ok ? "✓" : "✗") + '</span> ';
        if (!p.ok && sl.type === "pick") line += '<b>' + h(fmt(S.rightWas, {k: sl.opts[p.k]})) + '</b> ';
        if (!p.ok && sl.type === "tap") line += '<b>' + h(S.phrasesRight) + ' ' + (p.k || []).map(function(k){ return (sl.phrases || [])[k]; }).join(" / ") + '</b> ';
        if (p.why) line += h(S.whyLabel) + ' ' + h(p.why);
        c.appendChild(el(line + '</div>'));
      });
      if (extra) root.appendChild(el('<div class="model-wrap">' + modelPanel(extra, v.scheme) + '</div>'));
    }
    var onChange = function(){};
    list.addEventListener("click", function(e){
      var b = e.target.closest(".opt"); var s = e.target.closest(".ph");
      if (b && !b.disabled){ var c = b.closest(".slotc"), si = +c.dataset.s; qa(c, ".opt").forEach(function(x){ x.setAttribute("aria-pressed", "false"); }); b.setAttribute("aria-pressed", "true"); ans[si] = +b.dataset.o; onChange(); }
      if (s && !s.classList.contains("done")) pickPh(s);
    });
    list.addEventListener("keydown", function(e){ var s = e.target.closest(".ph"); if (s && !s.classList.contains("done") && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); pickPh(s); } });
    function pickPh(s){
      var c = s.closest(".slotc"), si = +c.dataset.s, k = +s.dataset.i, w = want(slots[si]);
      var cur = (ans[si] || []).slice(), at = cur.indexOf(k);
      if (at >= 0) cur.splice(at, 1); else { if (cur.length >= w) { var old = cur.shift(); var oe = q(c, '.ph[data-i="' + old + '"]'); if (oe) oe.setAttribute("aria-pressed", "false"); } cur.push(k); }
      s.setAttribute("aria-pressed", at >= 0 ? "false" : "true"); ans[si] = cur; onChange();
    }
    return {need: slots.length, filled: filled, get: get, show: show, change: function(f){ onChange = f; }, isTen: isTen};
  }
  function builder(root, open, o){
    var v = open.view, isTen = !!v.scheme;
    root.appendChild(el('<p class="intro">' + h(open.intro || (isTen ? S.tenBuildIntro : S.buildIntro)) + '</p>'));
    var panel = builderPanel(root, v, open);
    var bar = checkBar(root, panel.need, {countText: function(n, m){ return n + " of " + m + " parts filled"; }, onCheck: function(btn){
      mark(root, open, panel.get(), o, btn, function(r){
        bar.done(); panel.show(r.per, null);
        var rc = resultCard(r, open, modelPanel(r.extra, v.scheme)); root.insertBefore(rc, bar.btn.parentNode); wireAgain(rc, o);
        var again = q(rc, "#again"); if (again) again.textContent = S.again;
        rc.scrollIntoView({behavior: "smooth", block: "start"});
      });
    }});
    panel.change(function(){ bar.set(panel.filled()); }); bar.set(panel.filled());
  }
  /* ---------- weekly mock: three builds (two five-mark, one ten-mark) checked together ---------- */
  function weekly(root, open, o){
    var builds = (open.view && open.view.builds) || [], panels = [], need = 0;
    root.appendChild(el('<p class="intro">' + h(open.intro || S.weeklyLead) + '</p>'));
    builds.forEach(function(v, i){
      var sec = el('<section class="wk-part" data-b="' + i + '"><h2>' + h(fmt(S.weeklyPart, {n: i + 1})) + '</h2></section>'); root.appendChild(sec);
      var p = builderPanel(sec, v, open); panels.push(p); need += p.need;
    });
    function filled(){ return panels.reduce(function(t, p){ return t + p.filled(); }, 0); }
    var bar = checkBar(root, need, {countText: function(n, m){ return n + " of " + m + " parts filled"; }, onCheck: function(btn){
      mark(root, open, {builds: panels.map(function(p){ return p.get(); })}, o, btn, function(r){
        bar.done();
        panels.forEach(function(p, i){ p.show((r.per || [])[i], (r.extra && r.extra.builds || [])[i]); });
        var rc = resultCard(r, open, ""); root.insertBefore(rc, bar.btn.parentNode);
        var again = q(rc, "#again"); if (again) again.remove();
        rc.scrollIntoView({behavior: "smooth", block: "start"});
      });
    }});
    panels.forEach(function(p){ p.change(function(){ bar.set(filled()); }); }); bar.set(filled());
  }

  /* ---------- write (judged free text; model after the attempt) ---------- */
  function write(root, open, o){
    var v = open.view, isTen = !!v.scheme, two = isTen && v.hasItem !== false && v.scheme !== "3+2+2+2+1";
    root.appendChild(el('<p class="intro">' + h(open.intro || (isTen ? (two ? S.tenWriteIntro : S.tenWriteOne) : S.writeIntro)) + '</p>'));
    var qq = v.q || v.stem; if (qq) root.appendChild(el('<div class="q"><div class="qn">' + h(S.questionHead) + '</div><div class="qt">' + h(qq) + (v.marks ? ' <span class="pill">' + h(fmt(S.qMarks, {m: v.marks})) + '</span>' : '') + '</div></div>'));
    if (v.item) root.appendChild(el(itemBox(v.item, v.phrases, "ins")));
    if (isTen && !v.item) root.appendChild(el('<p class="say">' + h(S.tenNoItem) + ' ' + h(S.schemeHer) + '</p>'));
    if (v.phrases && v.item) root.appendChild(el('<p class="small mute">' + h(S.writeBox) + '</p>'));
    var boxes = [];
    function box(label, id){
      var w = el('<div class="write"><label for="' + id + '"><b>' + h(label) + '</b></label><textarea id="' + id + '" maxlength="900" rows="7"></textarea><div class="cnt">' + h(fmt(S.writeCount, {n: 0})) + '</div></div>');
      root.appendChild(w); var ta = q(w, "textarea"), cnt = q(w, ".cnt");
      ta.addEventListener("input", function(){ cnt.textContent = fmt(S.writeCount, {n: ta.value.length}); update(); });
      ta.addEventListener("focus", function(){ last = ta; });
      boxes.push(ta); return ta;
    }
    var last = null;
    if (two){ box(S.para1, "w1"); box(S.para2, "w2"); } else box(isTen ? S.questionHead : S.writeBox, "w1");
    last = boxes[0];
    root.addEventListener("click", function(e){
      var s = e.target.closest(".ph.ins"); if (!s) return;
      var ta = last || boxes[0], t = s.textContent, st = ta.selectionStart || ta.value.length, en = ta.selectionEnd || st;
      var before = ta.value.slice(0, st), after = ta.value.slice(en);
      var ins = (before && !/\s$/.test(before) ? " " : "") + '"' + t + '"' + (after && !/^\s/.test(after) ? " " : "");
      ta.value = (before + ins + after).slice(0, 900); ta.focus(); ta.selectionStart = ta.selectionEnd = Math.min((before + ins).length, 900);
      ta.dispatchEvent(new Event("input"));
    });
    var bar = checkBar(root, boxes.length, {countText: function(){ return ""; }, onCheck: function(btn){
      var req = {act: open.act, text: boxes[0].value}; if (two) req.text2 = boxes[1].value;
      var hadBefore = !!((T.hdr() || {}).pr || {})[open.act];
      T.call("apiWrite", req, {save: true, btn: btn}).then(function(r){
        T.marked(r);
        show(r, hadBefore);
      }).catch(function(){});
    }});
    function update(){ var n = boxes.filter(function(b){ return b.value.trim().length >= 20; }).length; bar.set(n); }
    if (v.prev){ boxes[0].value = v.prev.t || ""; if (two && boxes[1]) boxes[1].value = v.prev.t2 || ""; boxes.forEach(function(b){ b.dispatchEvent(new Event("input")); }); if (v.prev.n != null) root.appendChild(el('<p class="say">' + h(fmt(S.lastWrite, {n: v.prev.n, m: open.max})) + '</p>')); }
    update();
    var out = el('<div class="writeout"></div>'); root.appendChild(out);
    function ckl(lines){ return '<ul class="ckl">' + lines.map(function(l){ return '<li><span class="st ' + (l.ok ? "ok" : "no") + '">' + h(l.ok ? S.found : S.missing) + '</span> <b>' + h(l.t) + '</b>' + (l.why ? '<br><span class="small mute">' + h(l.why) + '</span>' : '') + '</li>'; }).join("") + '</ul>'; }
    function show(r, hadBefore){
      out.innerHTML = "";
      var html = '<div class="res' + (r.n >= r.max ? " full" : "") + '" role="status"><div class="score">' + h(fmt(S.writeResult, {n: r.n, m: r.max})) + '</div><p class="line">' + h(S.checklistHead) + '</p>';
      if (r.lines) html += ckl(r.lines);
      if (r.paras) html += r.paras.map(function(p, i){ return '<h4>' + h(two ? (i ? S.para2 : S.para1) : S.questionHead) + '</h4>' + ckl(p.lines); }).join("");
      if (r.notes && r.notes.length) html += '<ul class="notes">' + r.notes.map(function(n){ return '<li>' + h(n) + '</li>'; }).join("") + '</ul>';
      if (r.newPractice) html += '<p class="line"><b>' + h(isTen ? fmt(S.practicePt10, {n: r.n, m: r.max}) : fmt(S.practicePt, {n: r.n})) + '</b></p>';
      else if (hadBefore || r.practice) html += '<p class="line">' + h(S.practiceHad) + '</p>';
      else html += '<p class="line">' + h(isTen ? fmt(S.practiceNo10, {n: r.n, m: r.max}) : fmt(S.practiceNo, {n: r.n})) + '</p>';
      html += modelPanel({model: r.model, ao: r.ao, why_marks: r.why_marks, phrases: v.phrases}, v.scheme);
      html += '<p class="line">' + h(S.writeDone) + '</p></div>';
      out.appendChild(el(html));
      bar.btn.disabled = false; bar.btn.textContent = S.check;
      out.scrollIntoView({behavior: "smooth", block: "start"});
    }
  }

  /* ---------- cards (flip; two piles kept on the server) ---------- */
  function cards(root, open, o){
    var v = open.view, deck = v.terms.slice(), piles = Object.assign({}, (T.hdr() && T.hdr().pile) || {}), known = 0, notYet = 0;
    root.appendChild(el('<p class="intro">' + h(open.intro || S.cardsIntro) + '</p>'));
    var wrap = el('<div class="fcwrap"></div>'), ctl = el('<div class="row"><button class="btn ghost" id="no">' + h(S.notYet) + '</button><button class="btn acc" id="yes">' + h(S.knew) + '</button></div>');
    var cnt = el('<p class="pilecnt" aria-live="polite"></p>');
    root.appendChild(wrap); root.appendChild(ctl); root.appendChild(cnt);
    var pilesEl = el('<div class="piles"><div class="card soft"><b>' + h(S.knew) + '</b><ul id="pk"></ul></div><div class="card soft"><b>' + h(S.notYet) + '</b><ul id="pn"></ul></div></div>'); root.appendChild(pilesEl);
    function addTo(which, term){ if (which === 1){ known++; q(pilesEl, "#pk").appendChild(el('<li>' + h(term) + '</li>')); } else { notYet++; q(pilesEl, "#pn").appendChild(el('<li>' + h(term) + '</li>')); } }
    deck.forEach(function(c){ if (piles[c.term] === 1 || piles[c.term] === 0) addTo(piles[c.term], c.term); });
    var todo = deck.filter(function(c){ return piles[c.term] !== 1 && piles[c.term] !== 0; });
    var notYetFirst = deck.filter(function(c){ return piles[c.term] === 0; });
    function save(){ T.call("apiPile", {pile: piles}, {save: true, quiet: true}).then(function(r){ if (r && r.hdr) T.hdr(r.hdr); }).catch(function(){}); }
    function paint(){
      wrap.innerHTML = "";
      if (!todo.length){
        var againBtn = notYet > 0 ? '<button class="btn acc" id="restart">' + h(S.cardsAgain) + ' (' + h(S.notYet) + ')</button> ' : '';
        wrap.appendChild(el('<div class="card acc"><p><b>' + h(S.cardsNone) + '</b></p><p>' + againBtn + '<button class="btn ghost" id="restartAll">' + h(S.cardsAgain) + '</button></p></div>'));
        var rs = q(wrap, "#restart"); if (rs) rs.addEventListener("click", function(){ deck.forEach(function(c){ if (piles[c.term] === 0) delete piles[c.term]; }); save(); o.reopen(); });
        q(wrap, "#restartAll").addEventListener("click", function(){ piles = {}; save(); o.reopen(); });
        ctl.style.display = "none"; cnt.textContent = ""; return;
      }
      var c = todo[0];
      var fc = el('<div class="fc" tabindex="0" role="button" aria-pressed="false"><div class="face front"><div class="term">' + h(c.term) + '</div><div class="hint">' + h(S.cardsFlip) + '</div></div><div class="face back"><p>' + h(c.def) + '</p>' + (c.exam ? '<p><b>' + h(S.cardsExam) + '</b> ' + h(c.exam) + '</p>' : '') + (c.eg ? '<p><b>' + h(S.cardsEg) + '</b> ' + h(c.eg) + '</p>' : '') + (c.mistake ? '<p><b>' + h(S.cardsMistake) + '</b> ' + h(c.mistake) + '</p>' : '') + '</div></div>');
      wrap.appendChild(fc);
      function flip(){ fc.classList.toggle("flip"); fc.setAttribute("aria-pressed", fc.classList.contains("flip") ? "true" : "false"); }
      fc.addEventListener("click", flip);
      fc.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); flip(); } });
      cnt.textContent = fmt(S.cardsLeft, {n: todo.length}) + " · " + h(S.knew) + ": " + known;
    }
    function pile(which){ var c = todo.shift(); if (!c) return; piles[c.term] = which; addTo(which, c.term); paint(); save(); }
    q(ctl, "#yes").addEventListener("click", function(){ pile(1); });
    q(ctl, "#no").addEventListener("click", function(){ pile(0); });
    paint();
  }

  /* ---------- mount ---------- */
  var FORMS = {mcq: mcq, bins: bins, match: match, tick: tick, scenes: mcq, branch: branch, order: order, tap: tap, builder: builder, weekly: weekly, write: write, cards: cards};
  function mount(root, open, o){
    root.innerHTML = "";
    if (open.form !== "write" && open.form !== "cards" && !open.noHead) root.appendChild(el('<div class="act-head"><div class="best">' + h(bestLine(open)) + '</div></div>'));
    var f = FORMS[open.form];
    if (!f){ root.appendChild(el('<p class="say">' + h(S.serverErr) + '</p>')); return; }
    f(root, open, o);
  }
  return {init: init, mount: mount, underline: underline, itemBox: itemBox};
})();
