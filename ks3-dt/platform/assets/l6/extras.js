/* THE OPERATION · short screens in the same frame.
   V2 (spec §5.8, D8): the extra jobs find | customers | own, each with the page's own help layer (xjobs.js: the fixed
   top bar with Back and Finish, the "Your job now:" line and the green Stuck? Show me). Every word is cstrings.js.
   V1 stages boss | names | machine are kept one version for a lesson opened before the update (machine = own). */
(function () {
  var H = window.OPHASH; if (!H || ['boss', 'names', 'machine', 'find', 'customers', 'own'].indexOf(H.stage) === -1) return;
  if (H.stage === 'machine') H.stage = 'own';
  var $ = function (id) { return document.getElementById(id); }, face = window.OPFACE;
  var X = window.OPEXTRA_LINES = {
    boss: { lines: ['Seven parts. Who tells them what to do?', 'The operating system is the boss. It runs the whole machine.', 'Windows, ChromeOS, iPadOS and Android are all operating systems.'],
      ask: 'Which one is the boss that tells the parts what to do?',
      opts: ['The operating system', 'The fan', 'The keyboard', 'The screen'], right: 0,
      wrong: 'Not that one. The boss is a program, not a part.' },
    names: { head: 'You know the jobs. Now the real names.', short: 'RAM, CPU, GPU and PSU are the short names you will hear.',
      pairs: [['Remembers what she is doing right now', 'memory (RAM)'], ['Keeps her files, even when she is off', 'storage (SSD or hard drive)'],
        ['Does all her thinking', 'processor (CPU)'], ['Draws the picture on her screen', 'graphics card (GPU)'], ['Stops her getting too hot', 'fan'],
        ['Brings the electricity in from the wall', 'power supply (PSU)'], ['Joins all the other parts together', 'motherboard']],
      tap: 'Click a job, then click its real name.', check: 'Check my answers',
      again: 'Not quite. Some of your matches are wrong. Match those ones again.', shown: 'These are the right names. Read them once more.', allRight: 'All seven names are right.' }
  };
  function post(type, data) { if (window.parent === window) return; var m = { op: 1, type: type }; for (var k in data || {}) m[k] = data[k]; window.parent.postMessage(m, '*'); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  $('lobby').classList.remove('on');
  var box = $('extra'); box.hidden = false;
  function cont() { OPCONT($('xnext'), post); }
  $('xnext').hidden = true;

  if (H.stage === 'boss') {
    var B = X.boss, tries = 0, over = false;
    $('xhead').textContent = 'Who is in charge?';
    $('xbody').innerHTML = '<div class="xtop"><div class="xface">' + face('happy') + '</div><div>' + B.lines.map(function (l) { return '<p class="xline">' + esc(l) + '</p>'; }).join('') + '</div></div>' +
      '<p class="xask">' + esc(B.ask) + '</p><div class="xopts">' + shuffle([0, 1, 2, 3]).map(function (i) { return '<button class="xopt" type="button" data-i="' + i + '">' + esc(B.opts[i]) + '</button>'; }).join('') + '</div><p class="xsay" id="xsay"></p>';
    $('xbody').querySelector('.xopts').addEventListener('click', function (e) {
      var b = e.target.closest('.xopt'); if (!b || over || b.disabled) return;
      if (+b.dataset.i === B.right) { b.classList.add('right'); over = true; $('xsay').textContent = ''; cont(); return; }
      tries++; b.classList.add('wrong'); b.disabled = true;
      if (tries < 2) { $('xsay').textContent = B.wrong; return; }
      over = true; $('xsay').textContent = ''; $('xbody').querySelector('.xopt[data-i="' + B.right + '"]').classList.add('right', 'told'); cont();
    });
  }

  if (H.stage === 'names') {
    var N = X.names, round = 0, pick = null, placed = {}, locked = {};
    var jobs = shuffle(N.pairs.map(function (_, i) { return i; })), names = shuffle(N.pairs.map(function (_, i) { return i; }));
    $('xhead').textContent = 'The real names';
    $('xbody').innerHTML = '<p class="xline"><b>' + esc(N.head) + '</b> ' + esc(N.short) + '</p><p class="xsay" id="xsay">' + esc(N.tap) + '</p>' +
      '<div class="xmatch"><div class="xcol" id="xjobs"></div><div class="xcol" id="xnames"></div></div><button class="btn" id="xcheck" type="button">' + esc(N.check) + '</button>';
    function draw() {
      var used = {}; Object.keys(placed).forEach(function (j) { used[placed[j]] = j; });
      $('xjobs').innerHTML = jobs.map(function (j) {
        var n = placed[j];
        return '<button class="xjob' + (pick === j ? ' pick' : '') + (locked[j] ? ' right' : '') + (n != null ? ' set' : '') + '" type="button" data-j="' + j + '"><span>' + esc(N.pairs[j][0]) + '</span>' +
          (n != null ? '<b>' + esc(N.pairs[n][1]) + '</b>' : '') + '</button>';
      }).join('');
      $('xnames').innerHTML = names.map(function (n) { return '<button class="xname" type="button" data-n="' + n + '"' + (used[n] != null ? ' hidden' : '') + '>' + esc(N.pairs[n][1]) + '</button>'; }).join('');
      $('xcheck').disabled = Object.keys(placed).length < N.pairs.length;
    }
    $('xjobs').addEventListener('click', function (e) {
      var b = e.target.closest('.xjob'); if (!b) return; var j = +b.dataset.j; if (locked[j]) return;
      if (placed[j] != null) { delete placed[j]; pick = j; } else pick = pick === j ? null : j; draw();
    });
    $('xnames').addEventListener('click', function (e) {
      var b = e.target.closest('.xname'); if (!b) return;
      if (pick == null) { var free = jobs.filter(function (j) { return placed[j] == null; })[0]; if (free == null) return; pick = free; }
      placed[pick] = +b.dataset.n; pick = jobs.filter(function (j) { return placed[j] == null; })[0]; if (pick === undefined) pick = null; draw();
    });
    $('xcheck').addEventListener('click', function () {
      round++; var bad = jobs.filter(function (j) { return placed[j] !== j; });
      jobs.forEach(function (j) { if (placed[j] === j) locked[j] = 1; });
      if (!bad.length) { $('xsay').textContent = N.allRight; $('xcheck').hidden = true; draw(); cont(); return; }
      if (round >= 2) { jobs.forEach(function (j) { placed[j] = j; locked[j] = 1; }); $('xsay').textContent = N.shown; $('xcheck').hidden = true; draw(); cont(); return; }
      draw(); bad.forEach(function (j) { var el = $('xjobs').querySelector('.xjob[data-j="' + j + '"]'); el.classList.add('shake'); });
      setTimeout(function () { bad.forEach(function (j) { delete placed[j]; }); pick = bad[0]; $('xsay').textContent = N.again; draw(); }, 700);
    });
    pick = jobs[0]; draw();
  }

  /* ================= V2 extra jobs (spec §5.8, D8) ================= */
  var C = window.L6C_STRINGS, LY = window.OPLAYER, PN = C.parts, V2 = ['find', 'customers', 'own'].indexOf(H.stage) !== -1;
  function jobBar(text, lines, target) { if (LY) LY.job(text, lines, target); }
  /* the job is finished: its end button (Back to the extra jobs, which ticks the job) and the bar that names it */
  function endJob() { cont(); jobBar(C.job.intro.replace('{btn}', $('xnext').textContent), [], LY && LY.press($('xnext'))); }
  if (V2) { if (LY) LY.top(); $('xhead').hidden = true; $('xpaper').classList.add('v2', 'x-' + H.stage); }

  /* FIND THE PARTS IN A REAL PC: one photo, a line names one part, she clicks it in the photo. Boxes are % of the
     photo (case.jpg, 640 × 480, checked by overlay in tools/record-tutorial/l6-jobs-look.js). The cooler sits on the
     processor and is a fan too, so it counts for both. The motherboard comes last: by then every other part is named. */
  var BOX = { psu: [[4, 0, 33, 9]], fan: [[3, 9, 13, 50], [20, 27, 17, 20]], cpu: [[20, 27, 17, 20]], mem: [[17, 20, 27, 8]],
    gpu: [[6, 66, 26, 12]], drive: [[57, 63, 15, 9], [57, 84, 15, 14]], board: [[13, 19, 43, 77]] };
  window.OPFIND_BOX = BOX;
  if (H.stage === 'find') {
    var F = C.find, order = shuffle(['mem', 'drive', 'cpu', 'gpu', 'fan', 'psu']).concat(['board']), at = 0, miss = 0, busy = false;
    $('xbody').innerHTML = '<div class="xfind"><div class="xphoto" id="xphoto"><img src="../img/l6/case.jpg" alt="" draggable="false"></div><div class="xfside"><p class="xask" id="xask"></p><p class="xsay" id="xsay"></p></div></div>';
    var inBox = function (p, x, y) { return BOX[p].some(function (b) { return x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3]; }); };
    var spot = function (p, cls, label) {
      var b = BOX[p][0], d = document.createElement('div'); d.className = 'xspot ' + cls; d.dataset.p = p;
      d.style.left = b[0] + '%'; d.style.top = b[1] + '%'; d.style.width = b[2] + '%'; d.style.height = b[3] + '%';
      if (label) { var l = document.createElement('span'); l.className = 'xlab'; l.textContent = PN[p]; d.appendChild(l); }
      $('xphoto').appendChild(d); return d;
    };
    var ask = function () {
      var line = F.ask.replace('{part}', PN[order[at]]); $('xask').textContent = line;
      jobBar(line, C.help.find, function () { return { el: $('xphoto'), tag: '' }; });
    };
    $('xphoto').addEventListener('click', function (e) {
      if (at >= order.length || busy) return;
      var r = $('xphoto').querySelector('img').getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100, p = order[at];
      if (inBox(p, x, y)) {
        busy = true; miss = 0; at++;
        Array.prototype.forEach.call($('xphoto').querySelectorAll('.xspot.show'), function (s) { s.remove(); });
        spot(p, 'found', true).classList.add('flash');
        $('xsay').className = 'xsay good'; $('xsay').textContent = F.right.replace('{part}', PN[p]);
        setTimeout(function () {
          busy = false;
          if (at < order.length) { $('xsay').textContent = ''; ask(); return; }
          $('xask').hidden = true; $('xsay').textContent = F.done; $('xbody').querySelector('.xfside').appendChild($('xnext')); endJob();
        }, 1500);
        return;
      }
      miss++; $('xsay').className = 'xsay'; $('xsay').textContent = F.wrong;
      var ph = $('xphoto'); ph.classList.remove('shake'); void ph.offsetWidth; ph.classList.add('shake');
      /* genuine consequence, never a dead end: after two misses the part is outlined, and she still clicks it */
      if (miss === 2) spot(p, 'show', false);
    });
    ask();
  }

  /* THE RIGHT PART FOR THREE CUSTOMERS: one customer at a time, a tray of the seven parts. One line under the quote
     changes: the question, then the wrong line, then the right line (25 words a screen). */
  if (H.stage === 'customers') {
    var K = C.cust, who = 0, solved = false, TRAY = shuffle(['mem', 'drive', 'cpu', 'gpu', 'fan', 'psu', 'board']);
    $('xbody').innerHTML = '<div class="xcust"><span class="kicker" id="xwho"></span><p class="xline xneed" id="xneed"></p><p class="xask" id="xstat"></p></div>' +
      '<div class="xtray" id="xtray">' + TRAY.map(function (p) { return '<button class="xpart" type="button" data-p="' + p + '"><img src="../img/l6/' + p + '.jpg" alt=""><span>' + esc(PN[p]) + '</span></button>'; }).join('') + '</div>' +
      '<button class="btn" id="xcnext" type="button" hidden></button>';
    var person = function () {
      var c = K.people[who]; solved = false;
      $('xwho').hidden = false; $('xneed').hidden = false;
      $('xwho').textContent = K.says.replace('{customer}', c.who); $('xneed').textContent = '“' + c.need + '”';
      $('xstat').className = 'xask'; $('xstat').textContent = K.question; $('xcnext').hidden = true;
      Array.prototype.forEach.call($('xtray').querySelectorAll('.xpart'), function (b) { b.disabled = false; b.classList.remove('right', 'wrong'); });
      jobBar(C.help.cust[1], C.help.cust, function () { return { el: $('xtray'), tag: C.layer.tagChoose }; });
    };
    $('xtray').addEventListener('click', function (e) {
      var b = e.target.closest('.xpart'); if (!b || b.disabled || solved) return;
      var c = K.people[who];
      if (b.dataset.p !== c.right) { b.classList.add('wrong'); b.disabled = true; $('xstat').className = 'xsay'; $('xstat').textContent = K.wrong; return; }
      solved = true; b.classList.add('right');
      Array.prototype.forEach.call($('xtray').querySelectorAll('.xpart'), function (x) { if (x !== b) x.disabled = true; });
      $('xstat').className = 'xsay good'; $('xstat').textContent = K.right.replace('{why}', c.why);
      var more = c.more ? [c.more] : [];
      if (who < K.people.length - 1) {
        $('xcnext').textContent = K.next; $('xcnext').hidden = false;
        jobBar(C.job.intro.replace('{btn}', K.next), more, LY && LY.press($('xcnext')));
        return;
      }
      /* the last customer: the end button at once; the done line takes the quote's place after a beat */
      endJob();
      setTimeout(function () { $('xwho').hidden = true; $('xneed').textContent = K.done; $('xneed').classList.add('xdone'); }, 5000);
    });
    $('xcnext').onclick = function () { if (!solved) return; who++; person(); };
    person();
  }

  /* YOUR OWN PC: three facts read from the PC she sits at, one at a time */
  if (H.stage === 'own') {
    var O = C.fixes, nav = window.navigator || {}, sc = window.screen || {}, facts = [], fi = 0;
    if (nav.hardwareConcurrency) facts.push({ img: 'cpu', t: O.ownCores.replace('{n}', nav.hardwareConcurrency) });
    facts.push({ img: 'mem', t: nav.deviceMemory ? O.ownMem.replace('{n}', nav.deviceMemory) : O.ownUnknown });
    if (sc.width && sc.height) facts.push({ img: '', t: O.ownScreen.replace('{w}', sc.width).replace('{h}', sc.height) });
    $('xbody').innerHTML = '<div class="xfact"><div class="xfimg" id="xfimg"></div><p class="xline xbig" id="xfact"></p></div><button class="btn" id="xfnext" type="button" hidden></button>';
    var fact = function () {
      var f = facts[fi];
      $('xfimg').innerHTML = f.img ? '<img src="../img/l6/' + f.img + '.jpg" alt="">' : '';
      $('xfact').textContent = f.t;
      if (fi < facts.length - 1) {
        $('xfnext').textContent = L2.tourNext; $('xfnext').hidden = false;
        jobBar(C.job.intro.replace('{btn}', L2.tourNext), C.help.own, LY && LY.press($('xfnext')));
      } else { $('xfnext').hidden = true; endJob(); }
    };
    var L2 = (window.LINES && LINES.ui2) || { tourNext: 'Next' };
    $('xfnext').onclick = function () { if (fi < facts.length - 1) { fi++; fact(); } };
    fact();
  }

  post('ready', { stage: H.stage }); document.title = 'ready';
})();
