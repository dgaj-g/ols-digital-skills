/* Mastering Socialisation — staff side (ported from S1 Unit 1 staff.js). Ops: check, classes, create, delete, lb, parts, setPart, tracker, pupil, csv, clearMe, archive. */
var Staff = (function(){
  var T, S, ME, PASS = "", CL = [], CUR = "", ROLE = "";
  function h(s){ return T.h(s); }
  function el(html){ return T.el(html); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // a server time (ISO) shown as a plain date and time in the teacher's own clock
  function when(iso){ if (!iso) return ""; var d = new Date(iso); if (isNaN(d.getTime())) return String(iso); return d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear() + ", " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function row(html){ var t = document.createElement("table"); t.innerHTML = "<tbody>" + html + "</tbody>"; return t.querySelector("tr"); }
  function api(op, more, opt){ return T.call("apiStaff", Object.assign({op: op, pass: PASS}, more || {}), opt || {}); }
  function start(me, t){ T = t; S = t.S; ME = me; check(""); }
  function check(pass){
    PASS = pass;
    api("check", {}, {quiet: true}).then(function(r){ if (!r.admitted) return door(pass ? S.staffWrong : ""); ROLE = r.role || "teacher"; CL = r.classes || []; tabs("classes"); }).catch(function(e){ if (!e || !e.code) { try { console.error("staff page", e); } catch (x) {} } door(e && e.code === "bad-pass" && pass ? S.staffWrong : ""); });
  }
  function door(err){
    var b = el('<div class="door"><div class="card acc"><h2>' + h(S.staffDoor) + '</h2><p>' + h(S.staffDoorSub) + '</p><div class="row"><input id="pw" type="password" autocomplete="current-password" aria-label="Staff passcode"><button class="btn acc" id="in">' + h(S.staffIn) + '</button></div><p class="small mute" id="pwErr">' + h(err || "") + '</p><p><a class="link" href="#home">' + h(S.staffPupilView) + '</a></p></div></div>');
    T.bare(b);
    var inp = document.getElementById("pw");
    inp.onkeydown = function(e){ if (e.key === "Enter") check(inp.value.trim()); };
    T.wire("in", function(){ check(inp.value.trim()); });
    inp.focus();
  }
  function tabs(which){
    CUR = which;
    var names = [["classes", S.staffTabClasses], ["parts", S.staffTabParts], ["tracker", S.staffTabTracker], ["csv", S.staffTabExport]];
    var main = T.frame({});
    main.appendChild(el('<nav class="crumb"><a href="#home">' + h(S.staffPupilView) + '</a> › <b>' + h(S.staffTitle) + '</b></nav>'));
    main.appendChild(el('<div class="tabs" role="tablist">' + names.map(function(n){ return '<button role="tab" data-t="' + n[0] + '" aria-pressed="' + (n[0] === which) + '">' + h(n[1]) + '</button>'; }).join("") + '</div>'));
    var box = el('<div class="stf" id="stf"></div>'); main.appendChild(box);
    main.querySelectorAll(".tabs button").forEach(function(b){ b.onclick = function(){ tabs(b.dataset.t); }; });
    ({classes: classes, parts: parts, tracker: tracker, csv: exporter})[which](box);
  }
  function clsPick(box, onPick){
    if (!CL.length){ box.appendChild(el('<p class="say">' + h(S.staffNoClass) + '</p>')); return null; }
    var sel = el('<p class="rowline"><label>' + h(S.staffClassPick) + ' <select id="cls">' + CL.map(function(c){ return '<option value="' + h(c.slug) + '">' + h(c.name) + '</option>'; }).join("") + '</select></label></p>');
    box.appendChild(sel);
    var s = sel.querySelector("select"); if (clsPick.last && CL.some(function(c){ return c.slug === clsPick.last; })) s.value = clsPick.last;
    s.onchange = function(){ clsPick.last = s.value; onPick(s.value); };
    clsPick.last = s.value; onPick(s.value);
    return s;
  }
  function twoPress(btn, confirmText, act){
    var t0 = btn.textContent, armed = null;
    btn.onclick = function(){
      if (armed){ clearTimeout(armed); armed = null; btn.textContent = t0; btn.classList.remove("arm"); return act(); }
      btn.textContent = confirmText; btn.classList.add("arm");
      armed = setTimeout(function(){ armed = null; btn.textContent = t0; btn.classList.remove("arm"); }, 5000);
    };
  }
  function copyLink(slug, btn){
    var url = T.boot.base + "?class=" + slug;
    function done(){ var t0 = btn.textContent; btn.textContent = S.staffCopied; setTimeout(function(){ btn.textContent = t0; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function(){ window.prompt(S.staffCopyManual, url); });
    else window.prompt(S.staffCopyManual, url);
  }
  function classes(box){
    box.innerHTML = '<h2>' + h(S.staffTabClasses) + '</h2><p>' + h(S.staffClassesLead) + '</p>';
    var tbl = el('<table><thead><tr><th>Class</th><th>Pupils</th><th>Leaderboard</th><th>Link</th><th></th></tr></thead><tbody></tbody></table>');
    var tb = tbl.querySelector("tbody");
    if (!CL.length) box.appendChild(el('<p class="say">' + h(S.staffNoClass) + '</p>'));
    CL.forEach(function(c){
      var mayDel = c.mine || ROLE === "owner" || ROLE === "hod";
      var tr = row('<tr><td><b>' + h(c.name) + '</b><br><span class="small mute">' + h(c.slug) + (c.mine ? '' : ' · ' + h(S.staffNotOwner) + (c.on ? ' (' + h(c.on) + ')' : '')) + '</span></td><td>' + h(c.n || 0) + '</td><td><button class="btn sm ghost lb">' + h(c.lb ? S.staffLbOn : S.staffLbOff) + '</button></td><td><button class="btn sm cp">' + h(S.staffCopy) + '</button></td><td>' + (mayDel ? '<button class="btn sm ghost del">' + h(S.staffDelete) + '</button>' : '') + '</td></tr>');
      tr.querySelector(".cp").onclick = function(){ copyLink(c.slug, tr.querySelector(".cp")); };
      tr.querySelector(".lb").onclick = function(){ api("lb", {slug: c.slug, lb: c.lb ? 0 : 1}, {save: true}).then(function(){ c.lb = c.lb ? 0 : 1; tr.querySelector(".lb").textContent = c.lb ? S.staffLbOn : S.staffLbOff; T.toast(S.saved); }).catch(function(){}); };
      var del = tr.querySelector(".del"); if (del) twoPress(del, S.staffDeleteSure, function(){ api("delete", {slug: c.slug}, {save: true}).then(function(){ CL = CL.filter(function(x){ return x.slug !== c.slug; }); tabs("classes"); T.toast(S.staffDeleted); }).catch(function(){}); });
      tb.appendChild(tr);
    });
    box.appendChild(tbl);
    var mk = el('<div class="card"><h3>' + h(S.staffNew) + '</h3><div class="row"><input id="cn" maxlength="40" aria-label="Class name" placeholder="' + h(S.staffNewEg) + '"><button class="btn acc" id="mkb">' + h(S.staffCreate) + '</button></div><p class="small mute" id="mkErr"></p></div>');
    box.appendChild(mk);
    var inp = mk.querySelector("#cn"), err = mk.querySelector("#mkErr");
    function create(){ var name = inp.value.trim(); if (!name) return; api("create", {name: name}, {save: true, btn: mk.querySelector("#mkb")}).then(function(r){ CL.push({slug: r.slug, name: name, o: ME.email, on: ME.name || "", mine: true, lb: 1, lock: [], n: 0}); tabs("classes"); T.toast(S.staffCreated); }).catch(function(e){ err.textContent = e.code === "taken" ? S.staffTaken : e.code === "bad-name" ? S.staffBadName : S.serverErr; }); }
    mk.querySelector("#mkb").onclick = create; inp.onkeydown = function(e){ if (e.key === "Enter") create(); };
  }
  function parts(box){
    box.innerHTML = '<h2>' + h(S.staffTabParts) + '</h2><p>' + h(S.staffPartsLead) + '</p>';
    clsPick(box, function(slug){
      var old = box.querySelector("#plist"); if (old) old.remove();
      var list = el('<ul id="plist" class="rowline"></ul>'); box.appendChild(list);
      api("parts", {slug: slug}).then(function(r){
        var lock = r.lock || [];
        list.innerHTML = "";
        T.PARTS.forEach(function(P){
          var on = lock.indexOf(P.id) >= 0;
          var li = el('<li><span>' + h("Part " + P.n + ": " + P.t) + '</span> <button class="btn sm ' + (on ? "" : "ghost") + '" aria-pressed="' + on + '">' + h(on ? S.staffLocked : S.staffOpen) + '</button></li>');
          li.querySelector("button").onclick = function(){ api("setPart", {slug: slug, part: P.id, locked: on ? 0 : 1}, {save: true, btn: li.querySelector("button")}).then(function(){ T.toast(S.saved); parts(box); }).catch(function(){}); };
          list.appendChild(li);
        });
      }).catch(function(){});
    });
  }
  function tracker(box){
    box.innerHTML = '<h2>' + h(S.staffTabTracker) + '</h2><p>' + h(S.staffTrackerLead) + '</p>';
    clsPick(box, function(slug){
      var old = box.querySelector("#trk"); if (old) old.remove();
      var wrap = el('<div id="trk"><p class="say">' + h(S.busy) + '</p></div>'); box.appendChild(wrap);
      api("tracker", {slug: slug}).then(function(r){
        var rows = r.rows || [];
        if (!rows.length){ wrap.innerHTML = '<p class="say">' + h(S.staffNoPupils) + '</p>'; return; }
        wrap.innerHTML = '<p>' + h(rows.length === 1 ? S.pupils1 : T.fmt(S.pupils, {n: rows.length})) + '</p>';
        var tbl = el('<div class="tw"><table aria-label="' + h(S.trackerHead) + '"><thead><tr><th>Pupil</th><th>Points</th><th>Badges</th><th>Streak</th>' + T.PARTS.filter(function(P){ return P.n <= 9; }).map(function(P){ return '<th>' + P.n + '</th>'; }).join("") + '<th>Last seen</th></tr></thead><tbody></tbody></table></div>');
        var tb = tbl.querySelector("tbody");
        rows.forEach(function(p){
          var tr = row('<tr><td><a class="link" href="#">' + h(p.n || p.email) + '</a><br><span class="small mute">' + h(p.email) + '</span>' + (p.flags || []).map(function(f){ return '<br><span class="flag">' + h(f) + '</span>'; }).join("") + '</td><td>' + h(p.pts || 0) + '</td><td>' + h(Array.isArray(p.bd) ? p.bd.length : (p.bd || 0)) + '</td><td>' + h(p.st && p.st.n != null ? p.st.n : (p.st || 0)) + '</td>' +
            T.PARTS.filter(function(P){ return P.n <= 9; }).map(function(P){ var x = (p.parts || {})[P.id] || [0, 0]; return '<td>' + h(x[0]) + '/' + h(x[1]) + '</td>'; }).join("") + '<td>' + h(when(p.last)) + '</td></tr>');
          tr.querySelector("a").onclick = function(e){ e.preventDefault(); pupil(box, slug, p); };
          tb.appendChild(tr);
        });
        wrap.appendChild(tbl);
      }).catch(function(){ wrap.innerHTML = '<p class="say">' + h(S.serverErr) + '</p>'; });
    });
  }
  function pupil(box, slug, p){
    box.innerHTML = '<p><a class="link" id="bk" href="#">' + h(S.staffBackTracker) + '</a></p><h2>' + h(p.n || p.email) + '</h2><p class="small mute">' + h(p.email) + '</p><div id="pp"><p class="say">' + h(S.busy) + '</p></div>';
    box.querySelector("#bk").onclick = function(e){ e.preventDefault(); tabs("tracker"); };
    api("pupil", {slug: slug, email: p.email}).then(function(r){
      var pp = box.querySelector("#pp"), H = r.hdr || {};
      var acts = (r.acts || []).filter(function(a){ return a.best != null; });
      var html = '<p>' + h(T.fmt(S.pts, {n: H.pts || 0})) + ' · ' + h((H.bd || []).length + " badges") + '</p>';
      html += '<h3>' + h(S.staffBuilds) + '</h3>' + (acts.length ? '<table><thead><tr><th>Activity</th><th>Best</th></tr></thead><tbody>' + acts.map(function(a){ return '<tr><td>' + h(a.title || T.titleOf(a.act) || a.act) + '</td><td>' + h(T.fmt(S.staffBestCell, {n: a.best, m: a.max})) + '</td></tr>'; }).join("") + '</tbody></table>' : '<p class="say">' + h(S.staffNoBuilds) + '</p>');
      html += '<h3>' + h(S.staffWrites) + '</h3>' + ((r.writes || []).length ? (r.writes || []).map(function(w){ return '<div class="card"><p><b>' + h(w.act) + '</b> · ' + h(w.n != null ? w.n + " of the checklist" : "") + (w.tmin ? ' · ' + h(w.tmin + " min") : '') + '</p><p>' + h(w.t || "") + '</p>' + (w.t2 ? '<p>' + h(w.t2) + '</p>' : '') + '</div>'; }).join("") : '<p class="say">' + h(S.staffNoWrites) + '</p>');
      pp.innerHTML = html;
    }).catch(function(){ box.querySelector("#pp").innerHTML = '<p class="say">' + h(S.serverErr) + '</p>'; });
  }
  function exporter(box){
    box.innerHTML = '<h2>' + h(S.staffTabExport) + '</h2><p>' + h(S.staffExportLead) + '</p>';
    clsPick(box, function(slug){
      var old = box.querySelector("#ex"); if (old) old.remove();
      var w = el('<div id="ex" class="row"><button class="btn acc" id="dl">' + h(S.staffCsv) + '</button></div>'); box.appendChild(w);
      w.querySelector("#dl").onclick = function(){
        api("csv", {slug: slug}, {btn: w.querySelector("#dl")}).then(function(r){
          var blob = new Blob([r.csv || ""], {type: "text/csv"}), a = document.createElement("a");
          a.href = URL.createObjectURL(blob); a.download = "socialisation-" + slug + ".csv"; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
        }).catch(function(){});
      };
    });
    var me = el('<div class="card"><h3>' + h(S.staffMe) + '</h3><p>' + h(S.staffMeSub) + '</p><button class="btn ghost" id="cm">' + h(S.staffClearMe) + '</button></div>'); box.appendChild(me);
    twoPress(me.querySelector("#cm"), S.staffClearSure, function(){ api("clearMe", {}, {save: true}).then(function(){ T.toast(S.staffCleared); T.reboot().catch(function(){}); }).catch(function(){}); });
    if (ROLE === "owner"){
      var ar = el('<div class="card"><h3>' + h(S.staffArchive) + '</h3><p>' + h(S.staffArchiveSub) + '</p><button class="btn ghost" id="arc">' + h(S.staffArchiveGo) + '</button><p class="small mute" id="arcOut"></p></div>'); box.appendChild(ar);
      twoPress(ar.querySelector("#arc"), S.staffArchiveSure, function(){ api("archive", {}, {save: true, btn: ar.querySelector("#arc")}).then(function(r){ ar.querySelector("#arcOut").textContent = r.url || S.saved; }).catch(function(){}); });
    }
  }
  return {start: start};
})();
