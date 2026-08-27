/* PROTO-GATE v2 — the runner-v2 questions, answerable in ANY document that has
   Skulpt loaded. It is written as ONE function so the same bytes can be run in
   the real Apps Script sandbox origin (pasted into that document's console) and
   in a headless preview, and the two results compared (spec §B: "inside the
   real sandbox origin … then the preview").
   Every test resolves; nothing throws. The caller reads the returned rows. */
window.PROTO2 = function () {
  var rows = [];
  function row(id, name, pass, detail) { rows.push({ id: id, name: name, pass: !!pass, detail: String(detail) }); }

  function cfg(o) {
    o = o || {};
    var out = '';
    var conf = {
      output: function (t) { out += t; },
      read: function (x) {
        if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) throw 'File not found: ' + x;
        return Sk.builtinFiles.files[x];
      },
      execLimit: o.limit || 5000,
      __future__: Sk.python3
    };
    if (o.inputfun) { conf.inputfun = o.inputfun; conf.inputfunTakesPrompt = true; }
    Sk.configure(conf);
    return function () { return out; };
  }
  function run(code, o) {
    var get = cfg(o);
    return Sk.misceval.asyncToPromise(function () {
      return Sk.importMainWithBody('<stdin>', false, code, true);
    }).then(function () { return { ok: true, out: get(), err: '' }; },
            function (e) { return { ok: false, out: get(), err: String(e) }; });
  }

  /* B1 — a five-line program with TWO input() calls, answers resolved from a
     promise, exact stdout. The prompts are captured too: `inputfunTakesPrompt`
     is what lets the chat transcript show the bot's question. */
  var prompts = [];
  var t0 = Date.now();
  return run(
    'name = input("What is your name?")\n' +
    'colour = input("What colour do you like?")\n' +
    'print("Hello " + name)\n' +
    'print("Your colour is " + colour)\n' +
    'print("Bye " + name)\n',
    { inputfun: function (p) {
        prompts.push(String(p));
        return new Promise(function (res) { setTimeout(function () { res(prompts.length === 1 ? 'Anya' : 'green'); }, 30); });
      } }
  ).then(function (r) {
    var want = 'Hello Anya\nYour colour is green\nBye Anya\n';
    row('B1', 'two input() calls, promise-resolved, exact stdout',
      r.ok && r.out === want && prompts.length === 2,
      'ok=' + r.ok + ' out=' + JSON.stringify(r.out) + ' prompts=' + JSON.stringify(prompts) +
      ' ms=' + (Date.now() - t0) + (r.err ? ' err=' + r.err : ''));

    /* CONTROL for B1: a resolver that answers the WRONG thing must not match. */
    var p2 = [];
    return run('a = input("q")\nprint("Hi " + a)\n',
      { inputfun: function () { p2.push(1); return Promise.resolve('Sorcha'); } })
      .then(function (rc) {
        row('B1c', 'CONTROL: a wrong answer produces wrong stdout (the compare is real)',
          rc.ok && rc.out !== 'Hi Anya\n', 'out=' + JSON.stringify(rc.out));
      });
  }).then(function () {
    /* B2a — the timeout guard still fires on an infinite loop WITH suspensions on. */
    var t = Date.now();
    return run('while True:\n    pass\n', { limit: 3000, inputfun: function () { return Promise.resolve('x'); } })
      .then(function (r) {
        var ms = Date.now() - t;
        row('B2a', 'timeout guard fires on while True with suspensions enabled',
          !r.ok && /TimeLimit/i.test(r.err) && ms < 9000, 'ms=' + ms + ' err=' + r.err);
      });
  }).then(function () {
    /* B2b — an input() that is NEVER answered is abandoned cleanly: the caller
       rejects the promise (which is exactly what "she left the screen" does),
       the run settles, and nothing is left spinning. A never-resolving promise
       would hang forever — that is why abandonment REJECTS rather than waits. */
    var t = Date.now(), abandoned = null;
    var p = run('x = input("waiting")\nprint("never gets here")\n',
      { limit: 3000, inputfun: function () { return new Promise(function (_, rej) { abandoned = rej; }); } });
    setTimeout(function () { if (abandoned) abandoned(new Error('abandoned')); }, 200);
    return p.then(function (r) {
      row('B2b', 'an unanswered input() abandons cleanly (run settles, nothing spins)',
        !r.ok && r.out === '' && (Date.now() - t) < 9000,
        'ms=' + (Date.now() - t) + ' ok=' + r.ok + ' err=' + r.err);
    });
  }).then(function () {
    /* B3 — import random + random.seed determinism: two seeded runs byte-equal,
       and an UNSEEDED pair that differs (the control that proves the seed is
       what is doing the work, not a runtime that always returns the same list). */
    var code = 'import random\nrandom.seed(7)\nsongs = ["a","b","c","d","e"]\n' +
      'for i in range(5):\n    print(random.choice(songs))\n';
    return run(code).then(function (r1) {
      return run(code).then(function (r2) {
        row('B3', 'import random + random.seed(7): two runs byte-equal',
          r1.ok && r2.ok && r1.out === r2.out && r1.out.length > 4,
          'ok=' + r1.ok + '/' + r2.ok + ' equal=' + (r1.out === r2.out) + ' out=' + JSON.stringify(r1.out) +
          (r1.err ? ' err=' + r1.err : ''));
        var un = 'import random\nsongs=["a","b","c","d","e","f","g","h"]\n' +
          'for i in range(12):\n    print(random.choice(songs))\n';
        return run(un).then(function (u1) {
          return run(un).then(function (u2) {
            row('B3c', 'CONTROL: without a seed two runs differ (the seed is doing the work)',
              u1.ok && u2.ok && u1.out !== u2.out, 'differ=' + (u1.out !== u2.out));
          });
        });
      });
    });
  }).then(function () {
    /* B3b — .sort() returns None, .append grows, a slice prints three lines:
       the five observable effects j3's `features` checker will probe. Proved
       here so no card is ever authored on a claim the runtime does not make. */
    return run(
      'playlist = ["Song B", "Song A", "Song C"]\n' +
      'playlist.append("Song D")\n' +
      'print(len(playlist))\n' +
      'print(playlist[1])\n' +
      'back = playlist.sort()\n' +
      'print(back)\n' +
      'print(playlist[0])\n' +
      'for t in playlist[0:3]:\n    print(t)\n'
    ).then(function (r) {
      var want = '4\nSong A\nNone\nSong A\nSong A\nSong B\nSong C\n';
      row('B3b', 'list facts the J3 cards will claim: append/len/index/sort-returns-None/slice',
        r.ok && r.out === want, 'out=' + JSON.stringify(r.out) + (r.err ? ' err=' + r.err : ''));
    });
  }).then(function () {
    /* B4 — editor round-trip at class scale: 30 consecutive typed-program runs,
       stable output and no heap runaway. Two of them carry an input(). */
    var t = Date.now();
    var h0 = (performance.memory && performance.memory.usedJSHeapSize) || 0;
    var chain = Promise.resolve(), bad = 0;
    for (var i = 0; i < 30; i++) {
      (function (n) {
        chain = chain.then(function () {
          if (n % 10 === 3) {
            return run('who = input("name?")\nprint("run ' + n + ' " + who)\n',
              { inputfun: function () { return Promise.resolve('tester'); } })
              .then(function (r) { if (!r.ok || r.out !== 'run ' + n + ' tester\n') bad++; });
          }
          return run('total = ' + n + '\nprint("run " + str(total))\n')
            .then(function (r) { if (!r.ok || r.out !== 'run ' + n + '\n') bad++; });
        });
      })(i);
    }
    return chain.then(function () {
      var h1 = (performance.memory && performance.memory.usedJSHeapSize) || 0;
      row('B4', '30 consecutive editor runs stable (two with input())',
        bad === 0, 'bad=' + bad + ' ms=' + (Date.now() - t) +
        ' heap=' + Math.round(h0 / 1048576) + 'MB→' + Math.round(h1 / 1048576) + 'MB');
    });
  }).then(function () {
    /* B4b — WHAT SKULPT REALLY SAYS. §A5 asks for an authored line for "every
       error class these builds can actually produce", and the only honest way
       to know that list is to produce them. This is where the gate earned its
       place: CPython's IndentationError DOES NOT EXIST in Skulpt — a stray
       leading space, an unindented loop body and a missing colon all arrive as
       the SAME `SyntaxError: bad input`, while an inconsistent indent arrives as
       `SyntaxError: unindent does not match any outer indentation level`. Three
       more classes these two lessons can really produce (IndexError from a list
       position that is not there, AttributeError from .add instead of .append,
       ZeroDivisionError) had no kind at all in v1 and would have fallen to the
       generic. An authored line for a class the runtime never produces is a
       sentence no pupil can ever read (DFM 42's family); a class with no line is
       a pupil in front of raw Python. Both are fixed by measuring first. */
    var cases = [
      ['name',   'print("Hello " + naem)\n',                       /NameError/],
      ['type',   'score = 2\nprint("Score: " + score)\n',           /TypeError/],
      ['badin',  'print("hello)\n',                                 /SyntaxError: bad input/],
      ['badin2', 'x = 1\n  print(x)\n',                            /SyntaxError: bad input/],
      ['badin3', 'for t in ["a"]\n    print(t)\n',                  /SyntaxError: bad input/],
      ['eof',    'print("hello"\n',                                 /EOF in multi-line statement/],
      ['unind',  'for t in ["a","b"]:\n    print(t)\n  print(t)\n', /unindent does not match/],
      ['index',  'p=["a"]\nprint(p[5])\n',                          /IndexError/],
      ['attr',   'p=[]\np.add("x")\n',                              /AttributeError/],
      ['value',  'print(int("hello"))\n',                           /ValueError/],
      ['zero',   'print(1/0)\n',                                    /ZeroDivisionError/]
    ];
    var seen = {}, bad = [];
    return cases.reduce(function (ch, c) {
      return ch.then(function () {
        return run(c[1]).then(function (r) {
          seen[c[0]] = String(r.err);
          if (!c[2].test(String(r.err))) bad.push(c[0]);
        });
      });
    }, Promise.resolve()).then(function () {
      row('B4b', 'the error classes these builds really produce, measured not assumed',
        bad.length === 0, (bad.length ? 'unmatched=' + bad.join(',') + ' ' : '') + JSON.stringify(seen));
    });
  }).then(function () {
    /* B4c — CONTROL, and it is the finding: Skulpt NEVER produces the word
       IndentationError. A map that authored a line for it would have shipped a
       sentence no pupil could reach, and left the stray-space case reading the
       broken-quote line instead. */
    return run('x = 1\n  print(x)\n').then(function (r) {
      row('B4c', 'CONTROL: "IndentationError" is never produced (the CPython name is dead here)',
        !/IndentationError/.test(String(r.err)), 'err=' + r.err);
    });
  }).then(function () { return rows; })
    .catch(function (e) { row('X', 'the probe itself threw', false, String(e)); return rows; });
};
