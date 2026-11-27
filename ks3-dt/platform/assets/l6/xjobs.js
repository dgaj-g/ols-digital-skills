/* THE OPERATION V2 · the page's own help layer and top bar (spec §6, the 26 Nov help standard, DFM 265c).
   The platform's help layer (see/hour.html), as the contest page has it: a "Your job now:" line at the foot with
   a green "Stuck? Show me" beside it. The button opens a strip of numbered steps at the top and rings the thing
   to use next, with a short tag. 20 s with no click pulses the button; 40 s shows the ring by itself. Closing
   touches nothing she has done. Every word comes from cstrings.js (layer, job, help, top, hub).
   On the operating table the bar's own green button starts the spotlight tour instead (ui2.js).
   An extra job (the hash carries extras: {back, finish, title}) gets the fixed top bar: where she is, the way back
   to the list of jobs and the lesson's own finish, both live from the first frame. */
(function () {
  var C = window.L6C_STRINGS, Ly = C.layer, $ = function (id) { return document.getElementById(id); };
  var H = window.OPHASH || null;
  try { if (!H && location.hash.length > 1) H = JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch (e) { H = null; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function post(type) { if (window.parent === window) return; window.parent.postMessage({ op: 1, type: type }, '*'); }
  var st = { on: false, job: '', lines: [], target: null, open: false, idleRing: false, last: Date.now(), sig: '' };
  var IDLE = 20000;
  function apply() {
    if (!st.on) return;
    var html = '<b>' + esc(Ly.jobLead) + '</b>' + esc(st.job);
    if ($('job').innerHTML !== html) $('job').innerHTML = html;
    if (st.open) {
      var sig = st.job + '|' + st.lines.join('|');
      if (sig !== st.sig) { st.sig = sig; $('helpHow').textContent = Ly.jobLead + st.job; $('helpText').innerHTML = st.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join(''); }
    }
    if (st.open || st.idleRing) ring(); else unring();
    fitBar();
  }
  /* the screens above stop at the job bar's top, however many lines its words wrap to */
  function fitBar() { var h = $('jobbar').offsetHeight; if (h && document.body.style.getPropertyValue('--jbh') !== h + 'px') document.body.style.setProperty('--jbh', h + 'px'); }
  /* job(text, lines, target): target() returns {el, tag} or null; tag '' rings with no tag */
  function job(text, lines, target) {
    st.on = true; st.job = text || ''; st.lines = (lines || []).filter(Boolean); st.target = target || null;
    $('jobbar').classList.add('on'); document.body.classList.add('jb');
    apply();
  }
  function off() { st.on = false; close(); $('jobbar').classList.remove('on'); document.body.classList.remove('jb'); }
  function openHelp() { if (!st.on) return; st.open = true; st.sig = ''; st.idleRing = false; $('help').hidden = false; $('helpBtn').classList.remove('nudge'); apply(); }
  function close() { st.open = false; st.idleRing = false; $('help').hidden = true; unring(); }
  function unring() {
    Array.prototype.forEach.call(document.querySelectorAll('.spot'), function (el) { el.classList.remove('spot'); });
    $('tag').style.display = 'none';
  }
  function ring() {
    var t = st.target && st.target();
    Array.prototype.forEach.call(document.querySelectorAll('.spot'), function (el) { if (!t || el !== t.el) el.classList.remove('spot'); });
    var tg = $('tag');
    if (!t || !t.el) { tg.style.display = 'none'; return; }
    t.el.classList.add('spot');
    if (!t.tag) { tg.style.display = 'none'; return; }
    var r = t.el.getBoundingClientRect(), hb = st.open ? $('help').getBoundingClientRect().bottom : 0;
    tg.textContent = t.tag; tg.style.display = 'block';
    tg.style.left = Math.max(8, r.left + 10) + 'px'; tg.style.top = Math.max(hb + 4, r.top - 15) + 'px';
  }
  function poke() { st.last = Date.now(); $('helpBtn').classList.remove('nudge'); if (st.idleRing && !st.open) { st.idleRing = false; unring(); } }
  function tick() {
    if (!st.on) return;
    var idle = Date.now() - st.last;
    $('helpBtn').classList.toggle('nudge', !st.open && idle >= IDLE);
    if (!st.open && !st.idleRing && idle >= 2 * IDLE) st.idleRing = true;
    if (st.open || st.idleRing) ring();
  }
  /* the top bar of an extra job */
  function top(title) {
    var X = (window.OPHASH || H || {}).extras; if (!X) return false;
    $('xwhere').textContent = String(C.top.job).replace('{job}', title || X.title || '');
    $('xback').textContent = X.back; $('xfin').textContent = X.finish;
    $('xback').onclick = function () { post('xback'); };
    $('xfin').onclick = function () { post('xfinish'); };
    $('xtop').hidden = false; document.body.classList.add('x');
    return true;
  }
  function wire() {
    $('helpBtn').textContent = Ly.helpBtn; $('helpClose').textContent = Ly.helpBack; $('helpStuck').textContent = Ly.helpStuck;
    $('helpBtn').onclick = function () { if (st.open) close(); else openHelp(); };
    $('helpClose').onclick = close;
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (e) { document.addEventListener(e, poke, { passive: true, capture: true }); });
    window.addEventListener('resize', function () { if (st.on) fitBar(); if (st.open || st.idleRing) ring(); });
    if (window.ResizeObserver) new ResizeObserver(function () { if (st.on) fitBar(); }).observe($('jobbar'));
    setInterval(tick, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  window.OPLAYER = { job: job, off: off, open: openHelp, close: close, top: top, refresh: apply, isOpen: function () { return st.open; },
    setIdle: function (ms) { IDLE = Math.max(200, +ms || 20000); st.last = Date.now(); },
    press: function (el) { return function () { return el && !el.hidden && !el.disabled && el.offsetParent ? { el: el, tag: Ly.tagPress } : null; }; } };
})();
/* A screen's way on. On a lesson card it is "Continue". In an extra job the top bar carries Back and Finish, so the
   screen's own end button is "Back to the extra jobs" and posts 'next' (the platform ticks the job as done). */
window.OPCONT = function (btn, post) {
  var H = window.OPHASH || {}, X = H.extras;
  btn.hidden = false;
  btn.textContent = X ? X.back : 'Continue';
  btn.onclick = function () { post('next'); };
};
