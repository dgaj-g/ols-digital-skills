/* THE OPERATION · the three short screens after the ward (spec §3.4, §3.6, §3.9 "Your own machine").
   Stages boss | names | machine. Same paper, same "Continue" back to the lesson. Nothing here is marked by
   the server: the marked questions are the platform's exit check. Place all, then check (genuine consequence). */
(function () {
  var H = window.OPHASH; if (!H || ['boss', 'names', 'machine'].indexOf(H.stage) === -1) return;
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
      tap: 'Tap a job, then tap its real name.', check: 'Check my answers',
      again: 'Not quite. Match the ones that came back again.', shown: 'These are the right names. Read them once more.', allRight: 'All seven names are right.' },
    machine: { head: 'Your own machine', cores: 'This laptop’s processor can do {n} things at once.', mem: 'This laptop has about {n} GB of memory.',
      screen: 'This laptop’s screen is {w} dots wide and {h} dots tall.', priv: 'Your browser keeps that private.' }
  };
  function post(type, data) { if (window.parent === window) return; var m = { op: 1, type: type }; for (var k in data || {}) m[k] = data[k]; window.parent.postMessage(m, '*'); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  $('lobby').classList.remove('on');
  var box = $('extra'); box.hidden = false;
  function cont() { var b = $('xnext'); b.hidden = false; b.textContent = 'Continue'; b.onclick = function () { post('next'); }; }
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

  if (H.stage === 'machine') {
    var M = X.machine, nav = window.navigator || {}, sc = window.screen || {};
    var c = nav.hardwareConcurrency, g = nav.deviceMemory;
    var rows = [c ? M.cores.replace('{n}', c) : M.priv, g ? M.mem.replace('{n}', g) : M.priv, (sc.width && sc.height) ? M.screen.replace('{w}', sc.width).replace('{h}', sc.height) : M.priv];
    $('xhead').textContent = M.head;
    $('xbody').innerHTML = '<div class="xtop"><div class="xface">' + face('happy') + '</div><div>' + rows.map(function (r) { return '<p class="xline">' + esc(r) + '</p>'; }).join('') + '</div></div>';
    cont();
  }
  post('ready', { stage: H.stage }); document.title = 'ready';
})();
