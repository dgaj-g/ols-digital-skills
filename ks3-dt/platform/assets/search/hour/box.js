/* PROTOTYPE. The box (spec §5.3) and the run view (§5.4).
   Box.make(container, o) builds the box inside container. o: {rows, readyAt (complete lines that make the task ready),
   onFirstKey, onRun(lines)}. It gives back the calls the hour uses: lines, under, mark, lock, run, endRun, clear. */
(function () {
  'use strict';
  var Box = {}, LH = 39, TOP = 8;
  function lineY(i) { return TOP + LH * i + LH / 2; }

  Box.make = function (container, o) {
    o = o || {};
    var rows = o.rows || 4, first = true, bad = -1;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="boxwrap"><svg class="loopsvg hide" viewBox="0 0 44 ' + (TOP * 2 + LH * rows) + '"><path></path><circle r="5" fill="#ffe8a8" class="hide"></circle></svg>' +
      '<div class="hl"></div><div class="runv hide"></div>' +
      '<textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" rows="' + rows + '" style="height:' + (TOP * 2 + LH * rows) + 'px"></textarea></div>' +
      '<div class="runrow"><button class="btn pri run">Run</button><div class="under"></div></div>' +
      '<div class="note hide"></div>';
    container.appendChild(wrap);
    var bw = wrap.querySelector('.boxwrap'), ta = wrap.querySelector('textarea'), hl = wrap.querySelector('.hl'), rv = wrap.querySelector('.runv'),
      svg = wrap.querySelector('.loopsvg'), path = svg.querySelector('path'), dot = svg.querySelector('circle'),
      und = wrap.querySelector('.under'), runB = wrap.querySelector('.run'), note = wrap.querySelector('.note');
    var api = { el: wrap, ta: ta, runB: runB };

    function paint() {
      var ls = ta.value.split('\n');
      hl.innerHTML = ls.map(function (l, i) { var h = U.code(l); return i === bad ? '<span class="bad">' + h + '</span>' : h; }).join('\n') + '\n ';
      hl.scrollTop = ta.scrollTop;
    }
    api.lines = function () { return ta.value.split('\n'); };
    api.set = function (text) { ta.value = text; bad = -1; paint(); };
    api.focus = function () { ta.focus(); };
    api.under = function (text, kind) { und.textContent = text || ''; und.className = 'under' + (kind ? ' ' + kind : ''); };
    api.mark = function (i) { bad = i == null ? -1 : i; paint(); };
    api.note = function (text) { note.textContent = text; note.classList.remove('hide'); };
    api.lock = function (b) { ta.readOnly = !!b; runB.disabled = !!b; runB.style.opacity = b ? 0.4 : 1; bw.classList.toggle('locked', !!b); if (b) ta.blur(); };
    api.hideRun = function () { runB.classList.add('hide'); };

    /* typing */
    function complete() { return ta.value.split('\n').filter(function (l) { return l.trim(); }).length; }
    ta.addEventListener('keydown', function (e) {
      if (U.paused || ta.readOnly) { if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Tab') e.preventDefault(); return; }
      var v = ta.value, a = ta.selectionStart, b = ta.selectionEnd, ls = v.lastIndexOf('\n', a - 1) + 1, cur = v.slice(ls, a);
      if (e.key === 'Enter') {
        e.preventDefault();
        if (o.readyAt && complete() >= o.readyAt && a === b && !v.slice(a).trim()) { api.under('Your lines are ready. Click Run to send them to BEEP.'); return; }
        var ind = /:\s*$/.test(cur) ? 4 : (/^ {4}\S/.test(cur) ? 4 : 0);
        document.execCommand('insertText', false, '\n' + '    '.slice(0, ind));
        if (ind && !Box.noted) { Box.noted = true; api.note('The box moved your line in by 4 spaces. Those spaces make it part of the loop\'s job.'); }
        return;
      }
      if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); return; }
      if (e.key === 'Backspace' && a === b && cur === '    ') { e.preventDefault(); ta.setSelectionRange(a - 4, a); document.execCommand('delete'); return; }
    });
    ta.addEventListener('input', function () {
      if (first) { first = false; if (o.onFirstKey) o.onFirstKey(); }
      if (bad > -1) bad = -1;
      paint();
    });
    ta.addEventListener('scroll', function () { hl.scrollTop = ta.scrollTop; rv.scrollTop = ta.scrollTop; });
    ['paste', 'drop', 'dragover'].forEach(function (ev) { ta.addEventListener(ev, function (e) { e.preventDefault(); }); });
    runB.onclick = function () { if (U.paused || runB.disabled) return; note.classList.add('hide'); if (o.onRun) o.onRun(api.lines()); };
    paint();

    /* the run view (spec 5.4) */
    var forLine = -1;
    api.showRun = function () {
      var ls = ta.value.split('\n');
      rv.innerHTML = ls.map(function (l, i) { return '<div class="rl" data-i="' + i + '">' + U.code(l) + ' </div>'; }).join('');
      rv.classList.remove('hide'); hl.classList.add('hide'); ta.style.color = 'transparent'; ta.style.caretColor = 'transparent';
      rv.scrollTop = ta.scrollTop;
    };
    api.light = function (i) {
      [].forEach.call(rv.querySelectorAll('.rl'), function (r) { r.classList.toggle('lit', +r.dataset.i === i); });
      var r = rv.querySelector('.rl[data-i="' + i + '"]'); if (r && (r.offsetTop < rv.scrollTop || r.offsetTop + LH > rv.scrollTop + rv.clientHeight)) rv.scrollTop = r.offsetTop - LH;
    };
    /* the round counter: a badge at the right end of the for line, hanging off the box edge so it never covers the code */
    api.pill = function (i, text) {
      var p = bw.querySelector('.pill'); if (!p) { p = document.createElement('div'); p.className = 'pill'; bw.appendChild(p); }
      p.style.top = (TOP + LH * i + 5 - rv.scrollTop) + 'px';
      if (p.textContent !== text) { p.textContent = text; p.classList.remove('pulse'); void p.offsetWidth; p.classList.add('pulse'); }
    };
    function dropPill() { var p = bw.querySelector('.pill'); if (p) p.remove(); [].forEach.call(bw.querySelectorAll('.chip'), function (c) { c.remove(); }); }
    /* what a line's number is this round (chapter 3): a gold chip at the right of the job line, gone when the run ends */
    api.chip = function (i, text) {
      var p = bw.querySelector('.chip'); if (!p) { p = document.createElement('div'); p.className = 'chip'; bw.appendChild(p); }
      p.style.top = (TOP + LH * i + 5 - rv.scrollTop) + 'px'; p.textContent = text;
    };
    api.loop = function (f, last) {
      forLine = f; var y0 = lineY(f), y1 = lineY(last);
      path.setAttribute('d', 'M38 ' + y1 + ' H20 Q12 ' + y1 + ' 12 ' + (y1 - 8) + ' V' + (y0 + 8) + ' Q12 ' + y0 + ' 20 ' + y0 + ' H34 M28 ' + (y0 - 6) + ' L35 ' + y0 + ' L28 ' + (y0 + 6));
      svg.classList.remove('hide'); svg._y0 = y0; svg._y1 = y1;
    };
    api.flashLoop = function () {
      svg.classList.add('flash'); dot.classList.remove('hide');
      U.tween(0.32, function (k) { dot.setAttribute('cx', 12); dot.setAttribute('cy', U.lerp(svg._y1, svg._y0, k)); }).then(function () { svg.classList.remove('flash'); dot.classList.add('hide'); });
    };
    api.endRun = function () {
      rv.classList.add('hide'); svg.classList.add('hide'); dropPill(); hl.classList.remove('hide'); ta.style.color = ''; ta.style.caretColor = ''; forLine = -1;
    };
    /* play a trace: each step lights its line for its time; stepFn(step, dur) moves the picture (it may return a promise) */
    api.run = function (trace, stepFn, o2) {
      o2 = o2 || {};
      api.lock(true); api.showRun();
      var loops = {}; trace.forEach(function (s) { if (s.loopLine != null) loops[s.loopLine] = Math.max(loops[s.loopLine] || s.loopLine, s.line); });
      var i = 0;
      return new Promise(function (res) {
        function next() {
          if (i >= trace.length) { api.light(-1); res(); return; }
          var s = trace[i++], slow = s.round == null || s.round <= 2 || s.round === s.of, dur = (slow ? 0.9 : 0.35) * (o2.pace || 1);
          api.light(s.line);
          if (s.op === 'round') {
            if (forLine !== s.loopLine) api.loop(s.loopLine, loops[s.loopLine]);
            api.pill(s.line, o2.pillText ? o2.pillText(s) : 'round ' + s.round + ' of ' + s.of);
            if (s.back) api.flashLoop();
          }
          Promise.all([U.wait(dur), Promise.resolve(stepFn ? stepFn(s, dur) : null)]).then(function (r) { if (r[1] === 'stop') { api.light(-1); res('stop'); } else next(); });
        }
        next();
      });
    };
    api.clear = function () { ta.value = ''; bad = -1; paint(); };
    api.ta = ta; api.runB = runB;
    return api;
  };
  window.Box = Box;
})();
