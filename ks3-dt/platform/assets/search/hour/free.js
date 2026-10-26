/* J2 L5 THE SEARCH — the free flight (spec 10.7): six minutes in the open field, nothing marked. The judge's J.free says
   whether BEEP can fly it; real Python (Skulpt, loaded on first use) runs it, and the drone draws what Python printed.
   window.SearchFree.last = { done, src, acts: ['forward 80', …], error } after each Run (the walker reads it). */
(function () {
  'use strict';
  var U = window.SearchUI, J = window.SearchJudge, P = window.SearchPics, S = window.SearchStrings, Snd = window.SearchSound, S2 = window.SearchSound2, B = S.btn, H = window.SearchHour;
  var PRE = 'def forward(n): print("forward", n)\ndef left(n): print("left", n)\ndef right(n): print("right", n)\ndef say(n): print("say", n)\ndef look(): print("look", 0)\n';
  var CAP = 400, F = window.SearchFree = { last: null }, sk = null;
  function load(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function skulpt() { if (!sk) sk = window.Sk && Sk.importMainWithBody ? Promise.resolve() : load('../vendor/skulpt/skulpt.min.js').then(function () { return load('../vendor/skulpt/skulpt-stdlib.js'); }); return sk; }
  /* her program through Python: resolves { out, error } and never rejects; error 'offline' if Skulpt would not load */
  function python(src) { return skulpt().then(function () { var out = '';
      Sk.configure({ output: function (t) { out += t; }, read: function (x) { if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) throw 'File not found: ' + x; return Sk.builtinFiles.files[x]; }, execLimit: 4000, __future__: Sk.python3 });
      return Sk.misceval.asyncToPromise(function () { return Sk.importMainWithBody('<stdin>', false, PRE + src + '\n', true); }).then(function () { return { out: out, error: '' }; }, function (e) { return { out: out, error: String(e) }; }); },
    function () { sk = null; return { out: '', error: 'offline' }; }); }
  function acts(out, per) { return out.split('\n').map(function (l) { var m = /^(forward|left|right|say|look) (-?[\d.]+)$/.exec(l.trim()); return m ? { op: m[1], v: +m[2] } : null; }).filter(Boolean).map(function (a, k) { a.i = Math.floor(k / per); return a; }); }
  H.free = function () { var fst = { tr: null, upto: 0 }, over = false, clock;
    U.sheetOff(); U.strip(5, [0, 1, 2, 3, 4]); U.show('hour', true); U.draw(function (t) { P.open(t, { tr: fst.tr, upto: fst.upto, dark: 0 }); });
    U.panel({ kicker: S.close.kicker, head: S.close.freeH }); U.box('plan'); clock = U.clock(360, function () { over = true; }); clock.start(); U.gauge('', false); skulpt().catch(function () {});
    U.html('above', S.close.freeStarters.map(function (s, i) { return '<button type="button" class="starter" data-i="' + i + '">' + U.esc(s[0]) + '</button>'; }).join('')); U.show('above', true);
    U.$('above').querySelectorAll('.starter').forEach(function (b) { b.addEventListener('click', function () { S2.click(); U.under('', ''); U.box('plan', S.close.freeStarters[+b.dataset.i][1].join('\n')); }); });
    function go() { if (over) return null; H.want = { kind: 'free', at: U.now() };
      return Promise.race([U.buttons([{ id: 'run', label: B.run, primary: true }, { id: 'finish', label: B.finish }]), new Promise(function (res) { var off = U.onFrame(function () { if (over) { off(); res('finish'); } }); })]).then(function (id) { H.want = null; if (id === 'finish') return null; Snd.start(); S2.start();
        var lines = U.lines(), src = lines.join('\n'), plan = J.free(lines); F.last = { done: false, src: src, acts: [], error: '' };
        if (!plan) { U.under(S.close.freeNotRun, 'bad'); F.last = { done: true, src: src, acts: [], error: 'not a loop BEEP can fly' }; return go(); }
        U.under('', ''); U.$('pbtn').innerHTML = '';
        return python(src).then(function (r) { var per = Math.max(1, plan.body.length), cap = J.expand(plan, CAP).length, a = r.error === 'offline' ? J.expand(plan, CAP).map(function (x) { return { op: x.op, v: x.op === 'look' ? 0 : x.v, i: x.i }; }) : acts(r.out, per).slice(0, cap);
          F.last = { done: true, src: src, acts: a.map(function (x) { return x.op + ' ' + x.v; }), error: r.error === 'offline' ? '' : r.error };
          if (r.error && r.error !== 'offline') { U.under(S.close.freeNotRun, 'bad'); return go(); }
          fst.tr = P.turtle(500, 470, 90, a, 2.2); fst.upto = 0; var len = P.ribbonLen(fst.tr), t0 = U.now(), secs = Math.max(2, len / 400); U.things += a.length; Snd.rotor(0.8, 0.3);
          return new Promise(function (res) { if (!len) return res(); var off = U.onFrame(function () { fst.upto = Math.min(len, (U.now() - t0) / secs * len); if (fst.upto >= len || over) { off(); res(); } }); }).then(function () { Snd.rotor(0.3, 0.3); return go(); }); }); }); }
    return U.wait(0.05).then(go).then(function () { clock.stop(); U.show('above', false); U.html('above', ''); U.under('', ''); U.box('off'); U.$('pbtn').innerHTML = ''; U.panel({ kicker: '', head: '' }); U.sheet('<h2>' + U.esc(S.close.finished) + '</h2>'); U.strip(5, [0, 1, 2, 3, 4, 5]); return U.wait(2.5); })
      .then(function () { window.SearchBridge.done('end'); }); };
})();
