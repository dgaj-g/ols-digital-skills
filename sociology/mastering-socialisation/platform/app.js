/* Mastering Socialisation — pupil app: boot, sign-in guards, routing, learn pages, hub, print pages.
   Server contract: API.md (design folder). Activities: engine.js. Staff side: staff.js. */
var App = (function(){
  var S = SOCS.S, PARTS = SOCS.PARTS, AGENTS = SOCS.AGENTS, BADGES = SOCS.BADGES, BOOT = window.SOCBOOT || {}, C = window.CONTENT || {};
  var ME = null, CUR = "", pingT = null, used = Date.now();
  function h(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
  function md(s){ return h(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); } // **Label:** in a content paragraph renders bold; everything else is escaped text
  function fmt(s, o){ return String(s).replace(/\{(\w+)\}/g, function(_, k){ return o[k]; }); }
  function el(html){ var d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; }
  function img(f){ return (BOOT.img || "../img/") + f; }
  function emoji(hex){ return img("emoji/" + hex + ".svg"); }

  // ---- server (as S1 Unit 1: sys bar, saving bar, busy pulse, offline retry) ----
  var SYS = {msg: "", retry: null}, saving = 0, savingT = null;
  function paintSys(){
    var x = document.getElementById("sys"); if (!x) return;
    if (SYS.msg === "expired"){ x.className = "on bad"; x.innerHTML = '<span>' + h(S.expired) + '</span>'; }
    else if (SYS.msg === "offline"){ x.className = "on bad"; x.innerHTML = '<span>' + h(S.offline) + '</span><button class="btn sm" id="retry">' + h(S.retry) + '</button>'; document.getElementById("retry").onclick = function(){ var f = SYS.retry; SYS.msg = ""; SYS.retry = null; paintSys(); if (f) f(); }; }
    else { x.className = ""; x.innerHTML = ""; }
  }
  function paintSaving(){ var x = document.getElementById("saving"); if (x) x.classList.toggle("on", saving > 0 && savingT === "shown"); }
  function savingOn(){ saving++; if (saving === 1){ savingT = setTimeout(function(){ if (saving > 0){ savingT = "shown"; paintSaving(); } }, 300); } }
  function savingOff(){ saving = Math.max(0, saving - 1); if (!saving){ if (savingT && savingT !== "shown") clearTimeout(savingT); savingT = null; paintSaving(); } }
  var TAP = null, BUSY = null, PEND = 0;
  document.addEventListener("click", function(ev){ var b = ev.target && ev.target.closest ? ev.target.closest("button, .tab, .link, .tile") : null; TAP = b; setTimeout(function(){ if (TAP === b) TAP = null; }, 0); used = Date.now(); }, true);
  document.addEventListener("keydown", function(){ used = Date.now(); }, true);
  function unbusy(){ if (BUSY){ BUSY.classList.remove("busy"); BUSY.removeAttribute("aria-busy"); BUSY = null; } }
  function busyOn(b){ PEND++; var t = b || TAP; if (t && t !== BUSY){ unbusy(); BUSY = t; BUSY.classList.add("busy"); BUSY.setAttribute("aria-busy", "true"); } }
  function busyOff(){ PEND = Math.max(0, PEND - 1); if (!PEND) setTimeout(function(){ if (!PEND) unbusy(); }, 60); }
  function gs(fn, req){ return new Promise(function(res, rej){ google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](req); }); }
  function call(fn, req, opt){
    req = Object.assign({cls: BOOT.cls}, req || {}); opt = opt || {};
    return new Promise(function(resolve, reject){
      function failed(){ if (opt.quiet){ var e = new Error("offline"); e.code = "offline"; return reject(e); } SYS.msg = "offline"; SYS.retry = attempt; paintSys(); }
      function attempt(){
        if (opt.save) savingOn();
        if (!opt.quiet) busyOn(opt.btn);
        gs(fn, req).then(function(r){
          if (opt.save) savingOff();
          if (!opt.quiet) busyOff();
          if (r && r.ok === false && (r.error === "server" || r.error === "busy")) return failed();
          if (SYS.msg === "offline"){ SYS.msg = ""; paintSys(); }
          if (!r || r.ok === false){
            var code = (r && r.error) || "error";
            if (code === "not-signed-in"){ SYS.msg = "expired"; paintSys(); }
            if (code === "locked"){ reboot().then(function(){ go("home"); toast(S.locked); }).catch(function(){}); }
            var e = new Error(code); e.code = code; return reject(e);
          }
          resolve(r);
        }, function(){ if (opt.save) savingOff(); if (!opt.quiet) busyOff(); failed(); });
      }
      attempt();
    });
  }
  // the server sends max as {acts:{act:max}, parts:{p1:20,...}}; the page keeps one flat map with parts alongside
  function flatMax(r){ if (r && r.max && r.max.acts){ var M = {}; Object.keys(r.max.acts).forEach(function(a){ M[a] = r.max.acts[a]; }); M.parts = r.max.parts || {}; r.max = M; } return r; }
  function reboot(){ return call("apiBoot", {}).then(function(r){ ME = flatMax(r); return r; }); }
  function hdr(v){ if (v){ ME.hdr = v; paintWho(); } return ME ? ME.hdr : null; }
  function marked(r){ if (r && r.hdr) hdr(r.hdr); (r && r.badges || []).forEach(function(id, i){ var b = badge(id); setTimeout(function(){ toast(fmt(S.badgeToast, {n: b ? b.t : id}), true); }, 1900 * i + 400); }); }
  function badge(id){ return BADGES.filter(function(b){ return b.id === id; })[0]; }

  // ---- parts, pages, acts ----
  var PAGES = {
    p1: ["s1", "s1/primary", "s1/secondary", "s1/formal", "s1/informal", "s1/checklist"],
    p2: ["s2", "s2/material", "s2/nonmaterial", "s2/values", "s2/norms", "s2/customs", "s2/beliefs", "s2/traditions", "s2/sorter"],
    p3: ["s3", "s3/family", "s3/education", "s3/peers", "s3/media", "s3/religion", "s3/religion/examples", "s3/workplace"],
    p4: ["s4", "s4/sorter"], p5: ["s5", "s5/cards", "s5/quiz"], p6: ["s6"], p7: ["s7"], p8: ["s8", "s8/find"], p9: ["s9", "s9/eye"],
    p10: ["hub", "daily", "weekly", "badges", "board", "progress"],
    p11: ["s11", "s11/mat", "s11/organiser", "s11/mindmap", "s11/cards", "s11/quiz", "s11/checklist", "s11/lastminute"]
  };
  for (var i6 = 1; i6 <= 26; i6++) PAGES.p6.push("s6/" + i6);
  for (var i7 = 1; i7 <= 7; i7++) PAGES.p7.push("s7/" + i7);
  var TESTS = {
    "s1/primary/test": {act: "t1p", t: "Five questions on primary socialisation"}, "s1/secondary/test": {act: "t1s", t: "Five questions on secondary socialisation"},
    "s1/formal/test": {act: "t1f", t: "Five questions on formal socialisation"}, "s1/informal/test": {act: "t1i", t: "Five questions on informal socialisation"},
    "s2/material/quiz": {act: "c-mat", t: "Four questions on material culture"}, "s2/nonmaterial/quiz": {act: "c-non", t: "Four questions on non-material culture"},
    "s2/values/quiz": {act: "c-val", t: "Four questions on values"}, "s2/norms/quiz": {act: "c-nor", t: "Four questions on norms"}, "s2/customs/quiz": {act: "c-cus", t: "Four questions on customs"},
    "s2/beliefs/quiz": {act: "c-bel", t: "Four questions on beliefs"}, "s2/traditions/quiz": {act: "c-tra", t: "Four questions on traditions"}, "s2/sorter": {act: "c-sort", t: "Culture Sorter: 21 cards into seven bins"},
    "s3/family/match": {act: "f-match", t: "Match the eight ways the family socialises"}, "s3/family/scenarios": {act: "f-scen", t: "Six family scenes: name the idea at work"}, "s3/family/apply": {act: "f-apply", t: "Use the item: two family questions"},
    "s3/education/spot": {act: "e-spot", t: "Formal or hidden curriculum? Twelve things schools do"}, "s3/education/school": {act: "e-school", t: "Eight questions on education"},
    "s3/peers/decide": {act: "p-decide", t: "Peer pressure: a story with choices"},
    "s3/media/images": {act: "m-images", t: "Six pictures: what the media teaches"}, "s3/media/stereotypes": {act: "m-stereo", t: "Stereotype or not? Ten media lines"},
    "s3/religion/test": {act: "r-test", t: "Five questions on religion"},
    "s3/workplace/firstday": {act: "w-first", t: "Your first day: put the six steps in order"}, "s3/workplace/test": {act: "w-test", t: "Five questions on the workplace"},
    "s4/sorter": {act: "sc-sort", t: "Sanction Sorter: 16 cards into four bins"}, "s5/quiz": {act: "vquiz", t: "Key words quiz: ten questions"}, "s5/cards": {act: "cards", t: "Flashcards: 17 key words"},
    "s8/find": {act: "ao2-find", t: "Find the phrase that earns the AO2 mark"}, "s9/eye": {act: "ex-eye", t: "Examiner's eye: six answers to judge"}
  };
  function partOf(route){ var m = /^s(\d+)/.exec(route); if (m) return "p" + m[1]; if (/^(hub|daily|weekly|badges|board|progress)$/.test(route)) return "p10"; return null; }
  function partOfAct(a){
    if (/^t1/.test(a)) return "p1"; if (/^c-/.test(a)) return "p2"; if (/^(f-|e-|p-|m-|r-|w-first|w-test)/.test(a)) return "p3"; if (a === "sc-sort") return "p4"; if (a === "vquiz") return "p5";
    if (/^d5-/.test(a)) return "p6"; if (/^d10-/.test(a)) return "p7"; if (a === "ao2-find") return "p8"; if (a === "ex-eye") return "p9"; return null;
  }
  function partInfo(id){ return PARTS.filter(function(p){ return p.id === id; })[0]; }
  function partEarned(pid){ var b = (ME.hdr && ME.hdr.b) || {}, got = 0, max = 0, M = ME.max || {}; Object.keys(M).forEach(function(a){ if (a === "parts") return; if (partOfAct(a) === pid){ max += M[a]; got += b[a] || 0; } }); if (ME.max && ME.max.parts && ME.max.parts[pid]) max = ME.max.parts[pid]; return {got: got, max: max}; }
  function locked(pid){ return !!(ME && ME.cls && (ME.cls.lock || []).indexOf(pid) >= 0); }
  function pageIndex(route){ var pid = partOf(route); if (!pid) return null; var list = PAGES[pid] || [], base = route; while (base && list.indexOf(base) < 0 && base.indexOf("/") > 0) base = base.slice(0, base.lastIndexOf("/")); var n = list.indexOf(base); return {pid: pid, n: n < 0 ? 1 : n + 1, m: list.length, list: list, base: base}; }
  function contentKey(route){ var m = /^s(\d+)(?:\/(.+))?$/.exec(route); if (!m) return null; var rest = m[2]; if (!rest) return "p" + m[1] + "/s" + m[1]; return "p" + m[1] + "/" + rest.replace(/\//g, "-"); }

  // ---- shell ----
  function paintWho(){
    var w = document.getElementById("who"); if (!w || !ME) return;
    var H = ME.hdr || {}, st = H.st || {};
    w.innerHTML = '<span class="nm">' + h(ME.name ? fmt(S.hi, {name: ME.name}) : "") + '</span><span class="pts">' + h(H.pts === 1 ? S.pts1 : fmt(S.pts, {n: H.pts || 0})) + '</span>' +
      (st.n > 0 ? '<span class="stk"><span class="fl" aria-hidden="true">🔥</span>' + h(st.n === 1 ? S.streak1 : fmt(S.streak, {n: st.n})) + '</span>' : '') +
      (ME.staff ? '<a class="staff link" href="#staff">Staff</a>' : '');
  }
  function frame(opt){
    opt = opt || {};
    var app = document.getElementById("app");
    app.innerHTML = '<header class="top"><a class="brand" href="#home">' + h(S.title) + '<small>' + h(S.sub) + '</small></a><div class="who" id="who"></div></header>' +
      '<div class="rainbow" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div id="sys" role="status"></div><div id="toast" role="status" aria-live="polite"></div><div class="savebar" id="saving">' + h(S.saving) + '</div>' +
      '<main class="wrap" id="main"></main>' +
      '<footer class="ft">Our Lady&#8217;s Grammar School, Newry · Digital Skills' + (BOOT.sb === "1" ? ' · ' + h(BOOT.build || "") : '') + (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? '<br>' + h(S.reduced) : '') + '</footer>';
    if (opt.part) app.setAttribute("data-part", opt.part); else app.removeAttribute("data-part");
    paintWho(); paintSys(); paintSaving();
    return document.getElementById("main");
  }
  function shell(route, body, opt){
    opt = opt || {};
    var pi = pageIndex(route), part = opt.part || (pi && pi.pid) || null;
    var main = frame({part: opt.colour || part});
    var crumb = '<nav class="crumb" aria-label="Where you are"><a href="#home">' + h(S.crumbHome) + '</a>';
    if (part){ var P = partInfo(part); crumb += ' › <a href="#' + h(P.route) + '">' + h(P.t) + '</a>'; }
    if (opt.crumb) crumb += ' › <b>' + h(opt.crumb) + '</b>';
    crumb += '</nav>';
    main.appendChild(el(crumb));
    if (pi && part && part !== "p10") main.appendChild(el('<p class="stage">' + h(fmt(S.stage, {p: partInfo(part).n, t: partInfo(part).t, n: pi.n, m: pi.m})) + '</p>'));
    main.appendChild(body);
    if (opt.bar !== false){
      var bar = el('<div class="bn"></div>');
      var back = opt.back != null ? opt.back : (pi && pi.n > 1 ? pi.list[pi.n - 2] : "home");
      bar.appendChild(el('<a class="btn ghost" href="#' + h(back) + '">' + h(S.back) + '</a>'));
      if (opt.next) bar.appendChild(el('<a class="btn acc" href="#' + h(opt.next.route) + '">' + h(opt.next.label || S.next) + '</a>'));
      main.appendChild(bar);
    }
    window.scrollTo(0, 0);
    return main;
  }
  function bare(body){ var main = frame({}); main.appendChild(body); return main; }
  function guard(line){ CUR = "guard"; bare(el('<div class="guard"><div class="card"><p>' + h(line) + '</p></div></div>')); }
  function toast(t, isBadge){ var x = document.getElementById("toast"); if (!x) return; x.textContent = t; x.className = "on" + (isBadge ? " badge" : ""); clearTimeout(toast.t); toast.t = setTimeout(function(){ x.className = ""; }, isBadge ? 2600 : 1800); }
  function wire(id, fn){ var e = document.getElementById(id); if (e) e.onclick = fn; }
  function go(r){ try { sessionStorage.setItem("soc-route", r); } catch (x) {} if (("#" + r) !== location.hash){ try { location.hash = "#" + r; return; } catch (x) {} } route(r); }
  window.addEventListener("hashchange", function(){ var r = location.hash.slice(1); if (r !== CUR) route(r); });

  // ---- screens ----
  function nameScreen(){
    CUR = "name";
    var b = el('<div class="gate"><div class="card acc"><h2>' + h(S.nameAsk) + '</h2><div class="row"><input id="nm" maxlength="40" autocomplete="given-name" aria-label="Your first name"><button class="btn acc" id="go" disabled>' + h(S.nameGo) + '</button></div><p class="small mute" id="nmErr"></p></div></div>');
    bare(b);
    var inp = document.getElementById("nm"), btn = document.getElementById("go");
    inp.oninput = function(){ btn.disabled = !inp.value.trim(); };
    inp.onkeydown = function(e){ if (e.key === "Enter" && !btn.disabled) btn.click(); };
    btn.onclick = function(){ call("apiName", {name: inp.value.trim()}, {save: true}).then(function(r){ ME.name = r.name; ME.named = true; go("home"); }).catch(function(e){ document.getElementById("nmErr").textContent = e.code === "bad-name" ? "Letters only, please (up to 40)." : S.serverErr; }); };
    inp.focus();
  }
  function ring(pid){
    if (pid === "p10" || pid === "p11") return '<span class="ring" aria-hidden="true"></span>';
    var e = partEarned(pid), pct = e.max ? Math.round(100 * e.got / e.max) : 0, dash = Math.round(113 * pct / 100);
    return '<span class="ring" title="' + h(pct ? fmt(S.ring, {n: pct}) : S.ringNone) + '"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="bg" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18" stroke-dasharray="' + dash + ' 113"/></svg><b>' + pct + '%</b></span>';
  }
  function home(){
    CUR = "home";
    var home = C["home"] || {tiles: {}}, body = el('<div><p class="lead">' + h(S.homeLead) + '</p><div class="tiles"></div></div>');
    var tiles = body.querySelector(".tiles");
    PARTS.forEach(function(P){
      var lk = locked(P.id);
      var t = el('<a class="tile' + (lk ? " lock" : "") + '" data-part="' + P.id + '" href="#' + h(lk ? "home" : P.route) + '" aria-label="' + h(S.stage.split(" ·")[0].replace("{p}", P.n) + ": " + P.t) + '"><span class="tn">' + P.n + '</span><span class="tt">' + h(P.t) + '</span><span class="tl">' + h(lk ? S.locked + " " + S.lockedSub : (home.tiles[P.id] || "")) + '</span>' + ring(P.id) + '</a>');
      tiles.appendChild(t);
    });
    shell("home", body, {bar: false});
  }
  function blocks(bs){
    return (bs || []).map(function(b){
      var out = '<section class="blk">';
      if (b.h) out += '<h2>' + h(b.h) + (b.new ? ' <span class="tag new" aria-hidden="true">' + h(S.newTag) + '</span>' : '') + '</h2>';
      (b.p || []).forEach(function(p, i){ out += '<p>' + ((b.new_p || []).indexOf(i) >= 0 ? '<span class="tag new" aria-hidden="true">' + h(S.newTag) + '</span> ' : '') + md(p) + '</p>'; });
      if (b.quote) out += '<blockquote class="say">' + h(b.quote.t) + (b.quote.who ? '<cite>' + h(b.quote.who) + '</cite>' : '') + '</blockquote>';
      if (b.list) out += '<ul>' + b.list.map(function(li, i){ return '<li>' + (Array.isArray(li) ? '<ul>' + li.map(function(x){ return '<li>' + h(x) + '</li>'; }).join("") + '</ul>' : (((b.new_items || []).indexOf(i) >= 0 ? '<span class="tag new" aria-hidden="true">' + h(S.newTag) + '</span> ' : '') + h(li))) + '</li>'; }).join("") + '</ul>';
      if (b.writers) out += '<table class="tbl"><thead><tr><th>Writer</th><th>What they say</th></tr></thead><tbody>' + b.writers.map(function(w){ return '<tr><td><b>' + h(w.name) + '</b></td><td>' + h(w.says) + '</td></tr>'; }).join("") + '</tbody></table>';
      if (b.table) out += '<table class="tbl"><thead><tr>' + b.table.head.map(function(x){ return '<th>' + h(x) + '</th>'; }).join("") + '</tr></thead><tbody>' + b.table.rows.map(function(r){ return '<tr>' + r.map(function(x){ return '<td>' + h(x) + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table>';
      if (b.img) out += '<figure class="figure"><img src="' + h(img(b.img.file)) + '" alt="' + h(b.img.alt || "") + '"><figcaption class="cap">' + h(b.img.credit || "") + '</figcaption></figure>';
      return out + '</section>';
    }).join("");
  }
  function bestOf(act){ var H = ME.hdr || {}, b = (H.b || {})[act], m = (ME.max || {})[act]; if (act === "cards") return ""; return b == null ? S.first : fmt(S.best, {n: b, m: m || "?"}); }
  function testsFor(route){
    var keys = Object.keys(TESTS).filter(function(k){ return k.indexOf(route + "/") === 0 && k.slice(route.length + 1).indexOf("/") < 0; });
    if (!keys.length) return "";
    return '<section class="blk"><h2>' + h(S.learnTest) + '</h2><div class="row">' + keys.map(function(k){ var t = TESTS[k]; return '<a class="btn acc big" href="#' + h(k) + '">' + h(t.t) + '</a><span class="small mute">' + h(bestOf(t.act)) + '</span>'; }).join("") + '</div></section>';
  }
  // Photos on the six agent pages and three culture pages (Wikimedia Commons; credits in img/CREDITS.md)
  var HERO = {
    "s3/family": {f: "agent-family.jpg", alt: "A family sitting together around a table sharing a meal.", cap: "A family meal: where much primary socialisation happens. Photo: National Cancer Institute, public domain, Wikimedia Commons.", w: 1200, h: 800},
    "s3/education": {f: "agent-education.jpg", alt: "Pupils sitting at desks in a classroom during a lesson.", cap: "A lesson in progress. Photo: Zaqwsxcde123, CC BY-SA 3.0, Wikimedia Commons.", w: 1200, h: 675},
    "s3/peers": {f: "agent-peers.jpg", alt: "A group of young people together at a festival.", cap: "Friends of the same age at a festival. Photo: Stig Nygaard, CC BY 2.0, Wikimedia Commons.", w: 1200, h: 800},
    "s3/media": {f: "agent-media.jpg", alt: "Journalists at work in a newspaper office.", cap: "A newspaper office. Photo: Rob Hendriks, CC0, Wikimedia Commons.", w: 1200, h: 857},
    "s3/religion": {f: "agent-religion.jpg", alt: "A congregation seated inside a chapel during a service.", cap: "A congregation at a service. Photo: Wilfredor, CC0, Wikimedia Commons.", w: 1200, h: 797},
    "s3/workplace": {f: "agent-workplace.jpg", alt: "Workers at their stations on a factory floor.", cap: "Workers on a factory floor. Photo: YeraC, CC BY-SA 4.0, Wikimedia Commons.", w: 1200, h: 900},
    "s2/material": {f: "culture-material.jpg", alt: "Household goods laid out for sale at a market stall.", cap: "Objects a society makes and uses: a market stall. Photo: Kolforn, CC BY-SA 4.0, Wikimedia Commons.", w: 1200, h: 900},
    "s2/traditions": {f: "culture-tradition.jpg", alt: "A lion dance performed in a Paris street.", cap: "A tradition passed down the generations: a lion dance. Photo: Lasupremevie, CC BY-SA 4.0, Wikimedia Commons.", w: 1200, h: 800},
    "s2/customs": {f: "culture-custom.jpg", alt: "Two women bowing to each other in Japan, about 1880.", cap: "A custom: bowing to greet, Japan around 1880. Photo: author unknown, public domain, Wikimedia Commons.", w: 831, h: 1200}
  };
  function learn(route){
    var key = contentKey(route), page = C[key];
    if (!page) return go("home");
    var pid = partOf(route);
    if (locked(pid)) return lockedScreen(route, pid);
    var agent = page.agent ? AGENTS.filter(function(a){ return a.id === page.agent; })[0] : null;
    var html = '<h1>' + (agent ? '<img class="ico" src="' + h(emoji(agent.emoji)) + '" alt="" width="40" height="40"> ' : '') + h(page.title) + (page.new ? ' <span class="tag new" aria-hidden="true">' + h(S.newTag) + '</span>' : '') + '</h1>' + (page.lead ? '<p class="lead">' + h(page.lead) + '</p>' : '');
    if (page.new || (page.blocks || []).some(function(b){ return b.new || (b.new_items && b.new_items.length) || (b.new_p && b.new_p.length); })) html += '<p class="small mute">' + h(S.newNote) + '</p>';
    var hero = HERO[route]; if (hero) html += '<figure class="hero"><img src="' + h(img(hero.f)) + '" alt="' + h(hero.alt) + '" width="' + hero.w + '" height="' + hero.h + '" loading="lazy"><figcaption class="cap">' + h(hero.cap) + '</figcaption></figure>';
    if (route === "s3") html += '<div class="agents">' + AGENTS.map(function(a){ return '<a class="tile" data-part="' + a.id + '" href="#s3/' + a.id + '"><img src="' + h(emoji(a.emoji)) + '" alt="" width="48" height="48"><span class="tt">' + h(a.t) + '</span></a>'; }).join("") + '</div>';
    html += blocks(page.blocks);
    if (page.check) html += '<section class="blk"><h2>' + h(S.learnSay) + '</h2><ul class="cklist">' + page.check.map(function(c){ return '<li><span class="mark ok" aria-hidden="true">✓</span> ' + h(c) + '</li>'; }).join("") + '</ul></section>';
    if (route === "s6") html += fiveList(page); else if (route === "s7") html += tenList(page); else html += testsFor(route);
    if (route === "s1") html += '<section class="blk"><div class="row"><a class="btn ghost" href="#s1/checklist">Tick the 12-line checklist for this part</a></div></section>';
    var body = el('<div data-part="' + h(agent ? agent.id : "") + '">' + html + '</div>');
    shell(route, body, {crumb: page.title, next: page.next, colour: agent ? agent.id : null});
  }
  function lockedScreen(route, pid){ shell(route, el('<div class="card"><h2>' + h(S.locked) + '</h2><p>' + h(S.lockedSub) + '</p></div>'), {crumb: S.locked, bar: true, back: "home"}); }
  function checklist(){
    var items = (C["p1/checklist"] || {items: []}).items, H = ME.hdr || {}, ck = (H.ck || []).slice(); while (ck.length < 12) ck.push(0);
    var body = el('<div><h1>Checklist: twelve things you should be able to do</h1><p class="lead">Tick each line when you can do it. Each line has a test beside it. Your ticks are saved.</p><ul class="cklist" id="ck"></ul><p class="small mute" id="ckn"></p></div>');
    var ul = body.querySelector("#ck");
    items.forEach(function(it, i){ ul.appendChild(el('<li><label><input type="checkbox" data-i="' + i + '"' + (ck[i] ? ' checked' : '') + '> <span>' + h(it.t) + '</span></label>' + (it.test ? '<a class="test btn sm ghost" href="#' + h(Object.keys(TESTS).filter(function(k){ return TESTS[k].act === it.test; })[0] || "s1") + '">Test it</a>' : '') + '</li>')); });
    function count(){ body.querySelector("#ckn").textContent = ck.filter(Boolean).length + " of 12 ticked"; }
    ul.addEventListener("change", function(e){ var c = e.target; if (c.type !== "checkbox") return; ck[+c.dataset.i] = c.checked ? 1 : 0; count(); call("apiTick", {ck: ck}, {save: true, quiet: true}).then(function(r){ if (r.hdr) hdr(r.hdr); }).catch(function(){}); });
    count();
    shell("s1/checklist", body, {crumb: "Checklist", next: {route: "s2", label: "Go on to Part 2: Culture"}});
  }
  function act(route, opts){
    var t = TESTS[route]; if (!t) return go("home");
    var pid = partOfAct(t.act); if (locked(pid)) return lockedScreen(route, pid);
    var body = el('<div><h1>' + h(t.t) + '</h1><div id="act"><p class="say">' + h(S.busy) + '</p></div></div>');
    var pi = pageIndex(route);
    shell(route, body, {crumb: t.t, back: pi.base, next: nextAfter(route)});
    if (t.act === "cards"){ Engine.mount(body.querySelector("#act"), {act: "cards", form: "cards", part: "p5", title: t.t, intro: "", view: {terms: (C["p5/cards"] || {terms: []}).terms}}, {reopen: function(){ act(route); }}); return; }
    var req = {act: t.act}; if (opts && opts.round) req.round = opts.round;
    call("apiOpen", req).then(function(r){
      r.max = r.max || (ME.max || {})[t.act]; r.intro = r.intro || "";
      Engine.mount(body.querySelector("#act"), r, {reopen: function(round){ act(route, {round: round}); }});
      var h1 = body.querySelector("h1"); if (r.title) h1.textContent = r.title;
    }).catch(function(e){ if (e.code && e.code !== "locked" && e.code !== "offline") body.querySelector("#act").innerHTML = '<p class="say">' + h(S.serverErr) + '</p>'; });
  }
  function nextAfter(route){
    var pi = pageIndex(route), keys = Object.keys(TESTS).filter(function(k){ return k.indexOf(pi.base + "/") === 0; }), at = keys.indexOf(route);
    if (at >= 0 && at < keys.length - 1) return {route: keys[at + 1], label: TESTS[keys[at + 1]].t};
    var page = C[contentKey(pi.base)]; if (page && page.next) return page.next;
    if (pi.n < pi.m) return {route: pi.list[pi.n], label: S.next};
    return {route: "home", label: S.home};
  }
  // ---- Part 5: key words ----
  function keywords(){
    var terms = (C["p5/cards"] || {terms: []}).terms;
    var body = el('<div><h1>Key words</h1><p class="lead">Seventeen words every answer in this section leans on. Flip the cards until every one is in "I knew it", then take the quiz.</p><div class="row"><a class="btn acc big" href="#s5/cards">' + h(TESTS["s5/cards"].t) + '</a><a class="btn acc big" href="#s5/quiz">' + h(TESTS["s5/quiz"].t) + '</a><span class="small mute">' + h(bestOf("vquiz")) + '</span></div><table class="tbl"><thead><tr><th>Word</th><th>What it means</th></tr></thead><tbody>' + terms.map(function(t){ return '<tr><td><b>' + h(t.term) + '</b></td><td>' + h(t.def) + '</td></tr>'; }).join("") + '</tbody></table></div>');
    shell("s5", body, {crumb: "Key words", next: {route: "s5/cards", label: "Start the flashcards"}});
  }
  // ---- Parts 6 and 7: question lists and build / write screens ----
  function fiveList(page){
    var H = ME.hdr || {};
    return '<section class="blk"><p class="diet">' + h(S.dietLabel) + '</p><table class="tbl qtable"><thead><tr><th>No.</th><th>Term</th><th>Build</th><th>Write</th></tr></thead><tbody>' + page.qs.map(function(q){
      var b = (H.b || {})[q.id], w = (H.w || {})["w5-" + q.id.slice(3)];
      return '<tr><td>' + q.n + '</td><td><a class="link" href="#s6/' + q.n + '">' + h(q.term) + '</a>' + (q.new ? ' <span class="tag new" aria-hidden="true">' + h(S.newTag) + '</span>' : '') + '</td><td class="st">' + h(b == null ? S.first : fmt(S.buildBest, {n: b, m: 5})) + '</td><td class="st">' + h(w ? S.writeDone : S.writeNot) + '</td></tr>';
    }).join("") + '</tbody></table></section>';
  }
  function tenList(page){
    var H = ME.hdr || {};
    return '<section class="blk"><table class="tbl qtable"><thead><tr><th>No.</th><th>Question</th><th>Build</th><th>Write</th></tr></thead><tbody>' + page.qs.map(function(q){
      var b = (H.b || {})[q.id], w = (H.w || {})["w10-" + q.n];
      return '<tr><td>' + q.n + '</td><td><a class="link" href="#s7/' + q.n + '">' + h(q.q) + '</a> <span class="pill">' + h(fmt(S.qMarks, {m: q.marks})) + '</span>' + (q.new ? ' <span class="tag new" aria-hidden="true">' + h(S.newTag) + '</span>' : '') + '</td><td class="st">' + h(b == null ? S.first : fmt(S.buildBest, {n: b, m: 10})) + '</td><td class="st">' + h(w ? S.writeDone : S.writeNot) + '</td></tr>';
    }).join("") + '</tbody></table></section>';
  }
  function question(part, n, mode, opts){
    var page = C[part === "p6" ? "p6/s6" : "p7/s7"], qs = page.qs, q = qs[n - 1]; if (!q) return go(part === "p6" ? "s6" : "s7");
    if (locked(part)) return lockedScreen(part === "p6" ? "s6" : "s7", part);
    var base = (part === "p6" ? "s6/" : "s7/") + n, route = base + (mode === "write" ? "/write" : "");
    var buildAct = q.id, writeAct = part === "p6" ? "w5-" + q.id.slice(3) : "w10-" + n;
    var title = part === "p6" ? "Question " + n + " of " + qs.length + ": " + q.term : "Question " + n + " of " + qs.length;
    var body = el('<div><h1>' + h(title) + '</h1>' + (part === "p6" ? '<p class="lead">' + h(S.fiveLead) + '</p>' : '<p class="lead">' + h(S.tenLead) + '</p>') +
      '<div class="modes" role="tablist"><button class="btn" role="tab" id="mb" aria-pressed="' + (mode !== "write") + '">' + h(S.modeBuild) + '</button><button class="btn" role="tab" id="mw" aria-pressed="' + (mode === "write") + '">' + h(S.modeWrite) + '</button></div>' +
      '<p class="small mute">' + h(bestOf(buildAct)) + ' · ' + h(((ME.hdr || {}).w || {})[writeAct] ? S.writeDone : S.writeNot) + '</p><div id="act"><p class="say">' + h(S.busy) + '</p></div></div>');
    var next = n < qs.length ? {route: (part === "p6" ? "s6/" : "s7/") + (n + 1), label: "Question " + (n + 1)} : (part === "p6" ? {route: "s7", label: "Go on to Part 7: Ten-mark questions"} : {route: "s8", label: "Go on to Part 8: The Secret to AO2 Marks"});
    shell(route, body, {crumb: title, back: part === "p6" ? "s6" : "s7", next: next});
    wire("mb", function(){ go(base); }); wire("mw", function(){ go(base + "/write"); });
    var a = mode === "write" ? writeAct : buildAct, box = body.querySelector("#act");
    var req = {act: a};
    var p = call("apiOpen", req);
    if (mode === "write") p = p.then(function(r){ if (r.written && r.written.t){ r.view.prev = r.written; return r; } return call("apiWritten", {act: a}, {quiet: true}).then(function(w){ if (w && w.t){ r.view.prev = w; } return r; }, function(){ return r; }); });
    p.then(function(r){
      r.max = r.max || (ME.max || {})[a] || (part === "p6" ? 5 : 10); r.intro = r.intro || "";
      if (part === "p7"){ r.view.scheme = r.view.scheme || q.scheme; r.view.marks = r.view.marks || q.marks; r.view.hasItem = q.hasItem; r.view.q = r.view.q || q.q; }
      r.noHead = true; // the line above the box already says the best score and the writing state
      Engine.mount(box, r, {reopen: function(){ question(part, n, mode); }});
    }).catch(function(e){ if (e.code && e.code !== "locked" && e.code !== "offline") box.innerHTML = '<p class="say">' + h(S.serverErr) + '</p>'; });
  }
  // ---- Part 10: hub ----
  function hub(){
    var tiles = [["daily", S.hubDaily, "1F4C5"], ["weekly", S.hubWeekly, "1F4DD"], ["badges", S.hubBadges, "1F3C5"], ["board", S.hubBoard, "1F4CA"], ["progress", S.hubProgress, "1F4C8"]];
    var body = el('<div><h1>' + h(partInfo("p10").t) + '</h1><p class="lead">Points come from every check. Badges are earned once and kept. The daily five and the weekly mock are the same for everyone in your class.</p><div class="hub">' + tiles.map(function(t){ return '<a class="tile" href="#' + t[0] + '"><img src="' + h(emoji(t[2])) + '" alt="" width="40" height="40"><span class="tt">' + h(t[1]) + '</span></a>'; }).join("") + '</div></div>');
    shell("hub", body, {crumb: null, next: {route: "s11", label: "Go on to Part 11: Revision sheets"}});
  }
  function badges(){
    var H = ME.hdr || {}, have = H.bd || [], when = H.bdt || {};
    var body = el('<div><h1>' + h(S.hubBadges) + '</h1><p class="lead">' + h(S.badgesLead) + '</p><div class="badges">' + BADGES.map(function(b){ var on = have.indexOf(b.id) >= 0; return '<div class="badge ' + (on ? "on" : "off") + '"><span class="ic"><img src="' + h(emoji(b.emoji)) + '" alt="" width="56" height="56"></span><span class="bt">' + h(b.t) + '</span><span class="bl">' + h(on ? fmt(S.badgeOn, {d: when[b.id] || ""}) : fmt(S.badgeOff, {r: b.rule})) + '</span></div>'; }).join("") + '</div></div>');
    shell("badges", body, {crumb: S.hubBadges, back: "hub"});
  }
  function board(){
    var body = el('<div><h1>' + h(S.hubBoard) + '</h1><p class="lead">' + h(S.boardLead) + '</p><div id="bd"><p class="say">' + h(S.busy) + '</p></div></div>');
    shell("board", body, {crumb: S.hubBoard, back: "hub"});
    call("apiBoard", {}).then(function(r){
      var box = body.querySelector("#bd");
      if (!r.lb){ box.innerHTML = '<p class="say">' + h(S.boardOff) + '</p>'; return; }
      if (!r.rows || !r.rows.length){ box.innerHTML = '<p class="say">' + h(S.boardEmpty) + '</p>'; return; }
      var rows = r.rows.map(function(x, i){ return '<tr' + (x.me ? ' class="me"' : '') + '><td class="rk">' + (x.rank || i + 1) + '</td><td>' + h(x.n) + (x.me ? ' <span class="pill">' + h(S.boardYou) + '</span>' : '') + '</td><td>' + h(x.pts) + '</td><td>' + h(x.bd != null ? x.bd : "") + '</td></tr>'; }).join("");
      box.innerHTML = '<table class="tbl board" aria-label="' + h(S.boardHead) + '"><thead><tr><th>Rank</th><th>Name</th><th>Points</th><th>Badges</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        (r.me && r.me.rank ? '<p><b>' + h(fmt(S.boardMe, {r: r.me.rank, t: r.total != null ? r.total : "?", p: r.me.pts})) + '</b></p>' : '') + (r.sum != null ? '<p>' + h(fmt(S.boardTotal, {n: r.sum})) + '</p>' : '');
    }).catch(function(){});
  }
  function progress(){
    var H = ME.hdr || {}, tot = 0, max = 0;
    var rows = PARTS.filter(function(P){ return P.n <= 9; }).map(function(P){ var e = partEarned(P.id); tot += e.got; max += e.max; var pct = e.max ? Math.round(100 * e.got / e.max) : 0; return '<li><span>' + h(fmt(S.progressRow, {t: P.t, n: e.got, m: e.max})) + '</span><span class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span></li>'; }).join("");
    var body = el('<div><h1>' + h(S.hubProgress) + '</h1><p class="lead">' + h(S.progressLead) + '</p><ul class="prog">' + rows + '</ul><p><b>' + h(fmt(S.progressTotal, {n: tot, m: max, p: H.pts || 0})) + '</b></p><p class="small mute">Practice points from written answers, the daily five and the weekly mock are in the points total.</p></div>');
    shell("progress", body, {crumb: S.hubProgress, back: "hub"});
  }
  function daily(){
    var body = el('<div><h1>' + h(S.hubDaily) + '</h1><p class="lead">' + h(S.dailyLead) + '</p><div id="act"><p class="say">' + h(S.busy) + '</p></div></div>');
    shell("daily", body, {crumb: S.hubDaily, back: "hub"});
    call("apiDaily", {}).then(function(r){
      var box = body.querySelector("#act"); box.innerHTML = "";
      Engine.mount(box, {act: "daily", form: "mcq", view: r.view, max: 5, best: r.done, attempts: r.done != null ? 1 : 0, intro: S.mcqIntro}, {reopen: daily});
      if (r.done != null) box.insertBefore(el('<p class="say"><b>' + h(fmt(S.dailyDone, {n: r.done})) + '</b></p>'), box.firstChild);
    }).catch(function(){});
  }
  function weekly(){
    var body = el('<div><h1>' + h(S.hubWeekly) + '</h1><p class="lead">' + h(S.weeklyLead) + '</p><div id="act"><p class="say">' + h(S.busy) + '</p></div></div>');
    shell("weekly", body, {crumb: S.hubWeekly, back: "hub"});
    call("apiWeekly", {}).then(function(r){
      var box = body.querySelector("#act"); box.innerHTML = "";
      Engine.mount(box, {act: "weekly", form: "weekly", view: r.view, max: r.max || 20, best: r.done, attempts: r.done != null ? 1 : 0, intro: S.weeklyLead}, {reopen: weekly});
      if (r.done != null) box.insertBefore(el('<p class="say"><b>' + h(fmt(S.weeklyDone, {n: r.done})) + '</b></p>'), box.firstChild);
    }).catch(function(){});
  }
  // ---- Part 11: revision sheets (on screen, printable) ----
  var SHEETS = [["mat", "Study material: the whole section on one sheet"], ["organiser", "Graphic organiser"], ["mindmap", "Mind map"], ["cards", "Flashcards to cut out"], ["quiz", "Revision quiz with answers"], ["checklist", "Exam checklist"], ["lastminute", "Last-minute revision sheet"]];
  function sheets(){
    var body = el('<div><h1>' + h(partInfo("p11").t) + '</h1><p class="lead">' + h(S.printLead) + '</p><ul class="hub">' + SHEETS.map(function(s){ return '<li><a class="tile" href="#s11/' + s[0] + '"><span class="tt">' + h(s[1]) + '</span></a></li>'; }).join("") + '</ul></div>');
    shell("s11", body, {crumb: null, next: null});
  }
  function sheet(id){
    var sh = SHEETS.filter(function(s){ return s[0] === id; })[0]; if (!sh) return go("s11");
    var html = '<div class="print-page"><div class="row right no-print"><button class="btn acc" id="pr">' + h(S.print) + '</button></div><h1>' + h(sh[1]) + '</h1>';
    if (id === "cards"){
      var terms = (C["p5/cards"] || {terms: []}).terms;
      html += '<p class="lead">Cut along the lines. The word is on the left and its meaning on the right.</p><table class="tbl"><tbody>' + terms.map(function(t){ return '<tr><td><b>' + h(t.term) + '</b></td><td>' + h(t.def) + (t.exam ? '<br><i>' + h(S.cardsExam) + ' ' + h(t.exam) + '</i>' : '') + '</td></tr>'; }).join("") + '</tbody></table>';
    } else {
      var page = C["p11/" + id] || {sections: []};
      html += (page.sections || []).map(function(s){ return '<section class="sec">' + blocks([s]) + '</section>'; }).join("");
    }
    var body = el(html + '</div>');
    shell("s11/" + id, body, {crumb: sh[1], back: "s11"});
    wire("pr", function(){ window.print(); });
  }
  // ---- router ----
  function route(r){
    r = r || "home"; CUR = r; try { sessionStorage.setItem("soc-route", r); } catch (x) {}
    if (!ME) return boot();
    if (!ME.cls){ if (window.Staff){ CUR = "staff"; return Staff.start(ME, T); } return guard(S.noClass); }
    if (r === "staff"){ if (window.Staff) return Staff.start(ME, T); return go("home"); }
    if (!ME.named) return nameScreen();
    if (r === "home") return home();
    if (TESTS[r]) return act(r);
    var m;
    if (r === "s1/checklist") return checklist();
    if (r === "s5") return keywords();
    if ((m = /^s6\/(\d+)(\/write)?$/.exec(r))) return question("p6", +m[1], m[2] ? "write" : "build");
    if ((m = /^s7\/(\d+)(\/write)?$/.exec(r))) return question("p7", +m[1], m[2] ? "write" : "build");
    if (r === "hub") return hub(); if (r === "badges") return badges(); if (r === "board") return board(); if (r === "progress") return progress(); if (r === "daily") return daily(); if (r === "weekly") return weekly();
    if (r === "s11") return sheets();
    if ((m = /^s11\/(\w+)$/.exec(r))) return sheet(m[1]);
    if (C[contentKey(r)]) return learn(r);
    go("home");
  }
  function titleOf(act){ // a plain title for an act id: the page's own TESTS table first, then the five- and ten-mark ids (staff pages use it when the server sends no title)
    for (var k in TESTS) if (TESTS[k].act === act) return TESTS[k].t;
    var m = /^([dw])(5|10)-0?(\d+)$/.exec(act || "");
    if (m) return (m[2] === "5" ? "Five-mark question " : "Ten-mark question ") + m[3] + (m[1] === "w" ? " (written)" : " (built)");
    return "";
  }
  var T = {S: S, fmt: fmt, titleOf: titleOf, h: h, el: el, call: call, toast: toast, img: img, emoji: emoji, hdr: hdr, marked: marked, boot: BOOT, me: function(){ return ME; }, go: go, frame: frame, bare: bare, guard: guard, wire: wire, home: function(){ go("home"); }, reboot: reboot, PARTS: PARTS};
  var BOOTED = false;
  function boot(){
    if (BOOTED) return; BOOTED = true;
    guard(S.signing);
    call("apiBoot", {}).then(function(r){
      ME = flatMax(r); Engine.init(T);
      // a link with no class on it is the staff page (the door, or straight in for staff), as on the S1 Unit 1 shell
      if (!r.cls){ if (window.Staff){ CUR = "staff"; return Staff.start(r, T); } return guard(S.noClass); }
      var start = location.hash.slice(1); if (!start){ try { start = sessionStorage.getItem("soc-route") || ""; } catch (x) {} }
      if (r.staff && (!start || start === "staff" || start === "home") && window.Staff){ CUR = "staff"; return Staff.start(r, T); }
      if (!r.named) return nameScreen();
      route(start || "home");
      if (!pingT) pingT = setInterval(function(){ if (document.visibilityState === "visible" && Date.now() - used < 120000) call("apiPing", {}, {quiet: true}).catch(function(){}); }, 60000);
      if (BOOT.sit && window.Sit) Sit.run(T);
    }).catch(function(e){
      BOOTED = false;
      if (e.code === "domain") guard(S.domain); else if (e.code === "unknown-class") guard(S.noClass); else if (e.code === "not-signed-in") guard(S.expired); else if (e.code !== "offline") guard(S.serverErr);
    });
  }
  // the built page calls App.boot() on DOMContentLoaded (tools/build-server.js); no second listener here
  return {T: T, go: go, boot: boot, route: route};
})();
