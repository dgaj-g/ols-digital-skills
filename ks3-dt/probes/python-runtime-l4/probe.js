/* PROTO-GATE L4 — spec §C9.1 (b)/(c): the relay player, the path check and the floor's judge,
   answerable in ANY document that has Skulpt loaded. ONE file so the same bytes run in the
   real Apps Script sandbox origin (his Chrome, the userCodeAppPanel route proven 18 Aug) and
   in a headless preview. Everything below the marker is Fable's reference implementation,
   VERBATIM (K44/DFM 283) — run-py.js, paths.js, calls.js, relay-doors.js — followed by the
   gate's own questions. Every test resolves; nothing throws; the caller reads the rows. */
/* run-py.js — a minimal Skulpt runner with EXACTLY the shape of PyRun.start
 * (engines.js ~line 960): one configure per run, output captured, execLimit as
 * the guard, inputfun returning a Promise, and DFM 269's clock reset as each
 * answer arrives. It exists so the reference probes beside it can be PROVED
 * against real Python without loading the whole platform; at integration Opus
 * replaces `runPy` with `PyRun.run` and keeps everything else verbatim.
 *
 * runPy(code, { inputs: ['trolley'], limitMs: 5000, preamble, epilogue, ask, onOut })
 *   ask(prompt) → Promise<string>  a LIVE reply box (her own run); when given, the
 *                                  inputs queue is not used
 *   onOut(text)                    every fragment the program prints, as printed
 *   → Promise<{ ok, out, err, asks: [{ prompt, at }] }>
 * `asks` records every input( ) the program made: the prompt it showed and the
 * length of `out` at that moment — which is what lets a probe say what was
 * printed BEFORE the question (the scene) and what came after (the road).
 * An input with no answer left in the queue resolves '' (the program carries
 * on with an empty answer), which is the honest way to observe "asked more
 * questions than it should" without hanging.
 */
(function (global) {
  function runPy(code, opts) {
    opts = opts || {};
    var limit = Number(opts.limitMs || 5000);
    var inputs = (opts.inputs || []).slice();
    var out = '';
    var asks = [];
    return new Promise(function (resolve) {
      if (typeof Sk === 'undefined') { resolve({ ok: false, out: '', err: '', offline: true, asks: asks }); return; }
      var conf = {
        output: function (t) { out += t; if (opts.onOut) { try { opts.onOut(t); } catch (e) { /* a relay must never stop a run */ } } },
        read: function (x) {
          if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) throw 'File not found: ' + x;
          return Sk.builtinFiles.files[x];
        },
        execLimit: limit,
        __future__: Sk.python3,
        inputfunTakesPrompt: true,
        inputfun: function (prompt) {
          asks.push({ prompt: String(prompt == null ? '' : prompt), at: out.length });
          /* two resolvers, as PyRun.start has: a LIVE one (opts.ask — a real reply box,
             the pupil's own conversation) or the QUEUE (opts.inputs — a silent probe) */
          var answer = opts.ask ? Promise.resolve(opts.ask(String(prompt == null ? '' : prompt)))
                                : Promise.resolve(inputs.length ? inputs.shift() : '');
          return answer.then(function (v) {
            /* DFM 269: the run clock restarts as the answer arrives */
            try { Sk.execStart = Date.now(); if (typeof Sk.lastYield !== 'undefined') Sk.lastYield = Date.now(); } catch (e) {}
            return String(v == null ? '' : v);
          });
        }
      };
      Sk.configure(conf);
      var pre = opts.preamble ? String(opts.preamble) + '\n' : '';
      var post = opts.epilogue ? '\n' + String(opts.epilogue) : '';
      Sk.misceval.asyncToPromise(function () {
        return Sk.importMainWithBody('<stdin>', false, pre + code + post, true);
      }).then(function () {
        resolve({ ok: true, out: out, err: '', asks: asks });
      }, function (e) {
        resolve({ ok: false, out: out, err: String(e), asks: asks });
      });
    });
  }
  global.runPy = runPy;
  if (typeof module !== 'undefined') module.exports = runPy;
})(typeof window !== 'undefined' ? window : this);
/* paths.js — THE PATH CHECK (j2-04, spec §C1.2). Reference implementation.
 *
 * What it judges, and only from OBSERVABLE EFFECTS (the L3 probe law — no code
 * tracing, no injection): the room is RUN once per declared word and once with a
 * stranger word, each answered by a single input( ), and for each run it reads
 *   scene  — everything printed BEFORE the first question
 *   story  — everything printed AFTER it, minus the door line
 *   door   — the LAST line of the form  NEXT: door A  /  NEXT: door B   (or null)
 * The five features of `myroom` (and training-3's three-word variant) are then
 * decided from those rows:
 *   scene-ask  — scene non-empty AND exactly one question asked AND the question
 *                names both declared words
 *   path (w)   — the run for w reached a door AND printed a story
 *   catch-all  — the stranger's run reached a door
 *   different  — story(w1) !== story(w2)
 * A run that stops with an error yields a row with `err` and no door; every
 * feature that depends on that row is NOT YET and the console shows the error.
 *
 * checkPaths(code, { words: ['lamp','desk'], stranger: 'banana' }, runPy)
 *   → Promise<{ rows: [{word, kind, scene, story, door, err, asks}], features: {...} }>
 */
(function (global) {
  var DOOR_RX = /^NEXT: door ([AB])\s*$/;

  function tidy(s) {
    return String(s == null ? '' : s).replace(/\r/g, '')
      .split('\n').map(function (l) { return l.replace(/[ \t]+$/, ''); })
      .join('\n').replace(/\n+$/, '');
  }
  /* split a run's output into scene / story / door using the ask positions */
  function parseRun(res) {
    var out = String(res.out || '');
    var firstAsk = res.asks && res.asks.length ? res.asks[0].at : out.length;
    var scene = tidy(out.slice(0, firstAsk));
    var after = tidy(out.slice(firstAsk)).split('\n').filter(function (l) { return l.trim() !== ''; });
    var door = null;
    var story = [];
    after.forEach(function (l) {
      var m = DOOR_RX.exec(l.trim());
      if (m) door = m[1]; else story.push(l);
    });
    return { scene: scene, story: story.join('\n'), door: door, asks: (res.asks || []).map(function (a) { return a.prompt; }) };
  }
  function mentions(prompt, word) {
    return String(prompt || '').toLowerCase().indexOf(String(word || '').toLowerCase()) !== -1;
  }
  function checkPaths(code, cfg, runPy) {
    cfg = cfg || {};
    var words = (cfg.words || []).map(function (w) { return String(w || '').trim(); });
    var stranger = String(cfg.stranger || 'banana');
    var plan = words.map(function (w, i) { return { word: w, kind: 'word' + (i + 1) }; })
      .concat([{ word: stranger, kind: 'stranger' }]);
    var rows = [];
    return plan.reduce(function (chain, p) {
      return chain.then(function () {
        return runPy(code, { inputs: [p.word], limitMs: cfg.limitMs }).then(function (res) {
          var row = parseRun(res);
          row.word = p.word; row.kind = p.kind; row.ok = !!res.ok;
          row.err = res.ok ? '' : String(res.err || '');
          rows.push(row);
        });
      });
    }, Promise.resolve()).then(function () {
      var byKind = {}; rows.forEach(function (r) { byKind[r.kind] = r; });
      var w1 = byKind.word1, w2 = byKind.word2, st = byKind.stranger;
      var anyErr = rows.some(function (r) { return !r.ok; });
      var features = {};
      features['scene-ask'] = !anyErr && !!w1 && w1.scene.length > 0 && w1.asks.length === 1 &&
        words.length >= 2 && words.every(function (w) { return w && mentions(w1.asks[0], w); });
      features['path-1'] = !!(w1 && w1.ok && w1.door && w1.story.length > 0);
      features['path-2'] = !!(w2 && w2.ok && w2.door && w2.story.length > 0);
      features['catch-all'] = !!(st && st.ok && st.door);
      features['different'] = !!(w1 && w2 && w1.ok && w2.ok && w1.story !== w2.story);
      /* training-3's three-word variant asks for the same things under other names */
      features['paths-all'] = features['path-1'] && features['path-2'] && features['catch-all'] && features['different'];
      return { rows: rows, features: features };
    });
  }
  global.checkPaths = checkPaths;
  global.parseRoomRun = parseRun;
  if (typeof module !== 'undefined') module.exports = { checkPaths: checkPaths, parseRun: parseRun, DOOR_RX: DOOR_RX };
})(typeof window !== 'undefined' ? window : this);
/* calls.js — THE FACTORY FLOOR'S JUDGE (j3-04, spec §C1.3). Reference implementation.
 *
 * Her program is run ONCE with an EPILOGUE that drops every order into the named
 * machine and prints a marker line per order carrying the value handed back (its
 * repr) and its type; the hidden REFERENCE machine is run the same way; the two
 * marker sets are compared order by order. Nothing here reads her code — a
 * product is what the machine really handed back.
 *   product  — the value her machine returned, rendered the way a card shows it
 *              (strings without quotes, numbers as numbers, None as None)
 *   none     — true when her machine handed back nothing (printed instead of
 *              returning — the DFM/K keystone landing)
 *   defined  — false when the floor cannot find a machine of that name (NameError
 *              on the call), and then every order is "no machine"
 * A machine that raises on an order gives that order an `err` and no product.
 *
 * checkCalls(code, { fn: 'label', args: [['Aoife',2],['Ben',4]], reference: 'def label…' }, runPy)
 *   → Promise<{ defined, products: [{order, product, expected, ok, none, err}], ok, err }>
 */
(function (global) {
  var MARK = '@@L4CALL@@';

  function pyLiteral(v) {
    if (typeof v === 'number') return String(v);
    if (v === null || v === undefined) return 'None';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    return JSON.stringify(String(v));   /* a JSON string is a valid Python string literal for our names */
  }
  function epilogue(fn, args) {
    var lines = [];
    args.forEach(function (a, i) {
      var call = fn + '(' + a.map(pyLiteral).join(', ') + ')';
      lines.push('try:');
      lines.push('    __v = ' + call);
      lines.push('    print("' + MARK + '", ' + i + ', repr(__v), type(__v).__name__)');
      lines.push('except NameError as __e:');
      lines.push('    print("' + MARK + '", ' + i + ', "NOMACHINE", str(__e))');
      lines.push('except Exception as __e:');
      lines.push('    print("' + MARK + '", ' + i + ', "ERROR", type(__e).__name__ + ": " + str(__e))');
    });
    return lines.join('\n');
  }
  function parseMarks(out) {
    var got = {};
    String(out || '').split('\n').forEach(function (l) {
      if (l.indexOf(MARK) !== 0) return;
      var rest = l.slice(MARK.length).trim();
      var sp = rest.indexOf(' ');
      var i = Number(rest.slice(0, sp));
      var body = rest.slice(sp + 1);
      if (body.indexOf('NOMACHINE ') === 0) { got[i] = { none: false, noMachine: true, err: body.slice(10) }; return; }
      if (body.indexOf('ERROR ') === 0) { got[i] = { none: false, err: body.slice(6) }; return; }
      var last = body.lastIndexOf(' ');
      var repr = body.slice(0, last), type = body.slice(last + 1);
      got[i] = { repr: repr, type: type, none: type === 'NoneType' };
    });
    return got;
  }
  function display(m) {
    if (!m) return '';
    if (m.none) return 'None';
    if (m.type === 'str') { try { return JSON.parse(m.repr.replace(/^'(.*)'$/, function (_, s) { return '"' + s.replace(/"/g, '\\"') + '"'; })); } catch (e) { return m.repr.replace(/^['"]|['"]$/g, ''); } }
    return m.repr;
  }
  function checkCalls(code, cfg, runPy) {
    cfg = cfg || {};
    var fn = String(cfg.fn || '');
    var args = (cfg.args || []).map(function (a) { return Array.isArray(a) ? a : [a]; });
    var epi = epilogue(fn, args);
    var hers = null, ref = null;
    return runPy(code, { epilogue: epi, limitMs: cfg.limitMs }).then(function (r) {
      hers = r;
      return runPy(String(cfg.reference || ''), { epilogue: epi, limitMs: cfg.limitMs });
    }).then(function (r) {
      ref = r;
      var mine = parseMarks(hers.out), want = parseMarks(ref.out);
      var defined = !args.some(function (_, i) { return mine[i] && mine[i].noMachine; });
      var products = args.map(function (a, i) {
        var m = mine[i] || {}, w = want[i] || {};
        var ok = !!(m.repr && w.repr && m.repr === w.repr && m.type === w.type);
        return {
          order: a,
          product: m.noMachine ? '' : (m.err ? '' : display(m)),
          expected: display(w),
          ok: ok,
          none: !!m.none,
          noMachine: !!m.noMachine,
          err: m.err || ''
        };
      });
      /* her program may have died BEFORE the epilogue (a broken def, a stray line):
         then no marker exists at all and the honest answer is the real error */
      var ranAtAll = Object.keys(mine).length > 0;
      return {
        ok: hers.ok && ranAtAll,
        err: hers.ok ? '' : String(hers.err || ''),
        out: hers.out.split('\n').filter(function (l) { return l.indexOf(MARK) !== 0; }).join('\n'),
        defined: ranAtAll && defined,
        products: products,
        allOk: ranAtAll && defined && products.every(function (p) { return p.ok; })
      };
    });
  }
  global.checkCalls = checkCalls;
  if (typeof module !== 'undefined') module.exports = { checkCalls: checkCalls, epilogue: epilogue, parseMarks: parseMarks, MARK: MARK };
})(typeof window !== 'undefined' ? window : this);
/* relay-doors.js — DOOR RESOLUTION for the class adventure (j2-04, spec §C1.1).
 * Pure functions, no DOM, no network: the `relay` engine calls these with the
 * room list it fetched and the play so far.
 *
 * nextRoom(play, rooms, rng)
 *   play  — { visited: [n, n, …], limit: 5 }
 *   rooms — every room the class has published PLUS the house rooms, [{ n, house, mine }]
 *   rng   — a function returning [0,1); the walkers pass a seeded one (DFM 199)
 *   → { n } the next room, or null when the adventure has reached its end
 *     (limit reached, or no unvisited room is left — with fewer rooms than the
 *     limit the adventure simply ends early, which is the solo route by birth:
 *     three house rooms plus hers is a whole adventure for one pupil)
 * The door LETTER never changes the choice: A and B both mean "another room I
 * have not seen". The letters exist so the fork's consequence is visible on the
 * pupil's own card (a different story, a different door line), not to route.
 *
 * planPlay(rooms, limit, rng) → [n, …] the whole path at once, same rule, used by
 * the walkers and the deck capture so a play can be pinned.
 */
(function (global) {
  function nextRoom(play, rooms, rng) {
    rng = rng || Math.random;
    var limit = Number((play && play.limit) || 5);
    var visited = (play && play.visited) || [];
    if (visited.length >= limit) return null;
    var pool = (rooms || []).filter(function (r) { return visited.indexOf(r.n) === -1; });
    if (!pool.length) return null;
    var pick = pool[Math.floor(rng() * pool.length) % pool.length];
    return { n: pick.n };
  }
  function planPlay(rooms, limit, rng) {
    var play = { visited: [], limit: limit || 5 };
    var out = [];
    var next;
    while ((next = nextRoom(play, rooms, rng))) { out.push(next.n); play.visited.push(next.n); }
    return out;
  }
  /* a tiny seeded rng so a walk can be pinned (mulberry32) */
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  global.relayDoors = { nextRoom: nextRoom, planPlay: planPlay, seeded: seeded };
  if (typeof module !== 'undefined') module.exports = global.relayDoors;
})(typeof window !== 'undefined' ? window : this);

/* ═══════════════════════════ THE GATE'S QUESTIONS ═══════════════════════════ */
window.PROTO4 = function () {
  var rows = [];
  function row(id, name, pass, detail) { rows.push({ id: id, name: name, pass: !!pass, detail: String(detail) }); }
  var HOUSE = {
    1: 'print("You are in the canteen. Every chair is stacked on the tables.")\nprint("A lunch trolley rolls past by itself and stops at a door.")\nchoice = input("Do you follow the trolley, or open the window? Type trolley or window.")\nif choice == "trolley":\n    print("You follow the trolley through the door.")\n    print("NEXT: door A")\nelse:\n    print("You open the window and climb out into the yard.")\n    print("NEXT: door B")',
    2: 'print("You are in the long corridor. Every classroom door is shut.")\nchoice = input("Do you go left or right? Type left or right.")\nif choice == "left":\n    print("You turn left and find the music room open.")\n    print("NEXT: door A")\nelse:\n    print("You turn right and reach the stairs.")\n    print("NEXT: door B")',
    3: 'print("You are in the library. The lights are off, but one lamp is on.")\nchoice = input("Do you go to the lamp, the desk or the door? Type lamp, desk or door.")\nif choice == "lamp":\n    print("The lamp flickers. Under it is a book with your name on it.")\n    print("NEXT: door A")\nelif choice == "desk":\n    print("On the desk is a note in red pen: DO NOT OPEN THE DRAWER.")\n    print("NEXT: door B")\nelse:\n    print("You stand still. Somewhere, a chair scrapes.")\n    print("NEXT: door A")'
  };
  var REF_LABEL = 'def label(name, seats):\n    return name + " x " + str(seats)';
  var REF_COST = 'def cost(seats):\n    return seats * 4';
  var ORDERS = [['Aoife', 2], ['Ben', 4], ['Cara', 1], ['Dev', 3], ['Erin', 2], ['Finn', 5], ['Grace', 1], ['Hugo', 2], ['Isla', 6], ['Jack', 3], ['Kate', 2], ['Liam', 1]];
  var t0;

  /* ---- (b) THE RELAY: a room runs, a door resolves, five rooms chain ------- */
  var rooms = [{ n: 1, house: true }, { n: 2, house: true }, { n: 3, house: true }, { n: 7 }, { n: 12 }];
  var codeFor = function (n) { return n <= 3 ? HOUSE[n] : HOUSE[((n - 1) % 3) + 1]; };
  var play = { visited: [], limit: 5 };
  var rng = relayDoors.seeded(4);
  var doors = [], bubbles = 0, asks = 0;
  var answers = { 1: 'trolley', 2: 'left', 3: 'lamp' };
  function stepRoom() {
    var next = relayDoors.nextRoom(play, rooms, rng);
    if (!next) return Promise.resolve();
    play.visited.push(next.n);
    var door = null;
    return runPy(codeFor(next.n), {
      ask: function (p) { asks++; return new Promise(function (res) { setTimeout(function () { res(answers[((next.n - 1) % 3) + 1]); }, 40); }); },
      onOut: function (t) { t.split('\n').filter(Boolean).forEach(function (l) { var m = /^NEXT: door ([AB])$/.exec(l.trim()); if (m) door = m[1]; else bubbles++; }); }
    }).then(function (res) { doors.push(door + (res.ok ? '' : '!')); return stepRoom(); });
  }
  t0 = Date.now();
  return stepRoom().then(function () {
    var ms = Date.now() - t0;
    row('R1', 'RELAY: five rooms chain, each answered from a promise, a door read from every room',
      play.visited.length === 5 && doors.length === 5 && doors.every(function (d) { return d === 'A' || d === 'B'; }) && asks === 5,
      'visited=' + JSON.stringify(play.visited) + ' doors=' + JSON.stringify(doors) + ' bubbles=' + bubbles + ' ms=' + ms);
    row('R2', 'RELAY: no room twice, and the play is pinnable (seeded)',
      new Set(play.visited).size === 5 && JSON.stringify(relayDoors.planPlay(rooms, 5, relayDoors.seeded(4))) === JSON.stringify(play.visited),
      JSON.stringify(play.visited));
    row('R3', 'RELAY: after the limit, the next room is null (THE END)', relayDoors.nextRoom(play, rooms, rng) === null, 'visited ' + play.visited.length);
    /* a room whose program stops with an error still resolves: the play moves on */
    return runPy('print("You are in a broken room")\nchoice = input("Which way?")\nprint(undefined_box)', { ask: function () { return Promise.resolve('x'); } });
  }).then(function (res) {
    row('R4', 'RELAY: a room that dies mid-play settles with the real error, never a hang', !res.ok && /NameError/.test(res.err), res.err);

    /* ---- (c) THE PATH CHECK with three inputs ---------------------------- */
    t0 = Date.now();
    return checkPaths(HOUSE[3], { words: ['lamp', 'desk'], stranger: 'banana' }, runPy);
  }).then(function (r) {
    var ms = Date.now() - t0;
    var f = r.features;
    row('P1', 'PATHS: the house library ticks all five in three runs (three inputs answered)',
      f['scene-ask'] && f['path-1'] && f['path-2'] && f['catch-all'] && f['different'] && r.rows.length === 3,
      JSON.stringify(f) + ' doors=' + r.rows.map(function (x) { return x.door; }).join('/') + ' ms=' + ms);
    row('P1t', 'PATHS: the three runs together take under 1,500 ms (a check she waits on)', ms < 1500, ms + ' ms');
    return checkPaths(HOUSE[3].split('\n').slice(0, 8).join('\n'), { words: ['lamp', 'desk'], stranger: 'banana' }, runPy);
  }).then(function (r) {
    row('P2', 'CONTROL PATHS: no else → the stranger reaches no door, and only catch-all fails',
      !r.features['catch-all'] && r.features['path-1'] && r.features['path-2'] && r.rows[2].door === null, JSON.stringify(r.features));

    /* ---- (c) HUMAN PACE: the live run answered after 6.5 s completes (DFM 269) ---- */
    t0 = Date.now();
    return runPy(HOUSE[3], { ask: function () { return new Promise(function (res) { setTimeout(function () { res('desk'); }, 6500); }); } });
  }).then(function (res) {
    var ms = Date.now() - t0;
    row('H1', 'HUMAN PACE: a room answered after 6.5 s completes with the desk road (the input wait is not billed)',
      res.ok && /DO NOT OPEN THE DRAWER/.test(res.out) && /NEXT: door B/.test(res.out) && ms >= 6500, 'ok=' + res.ok + ' ms=' + ms + (res.err ? ' err=' + res.err : ''));
    t0 = Date.now();
    return runPy('while True:\n    pass\n', { limitMs: 3000 });
  }).then(function (res) {
    var ms = Date.now() - t0;
    row('H1c', 'CONTROL: a real runaway still dies at the limit', !res.ok && /TimeLimit/.test(res.err) && ms < 9000, 'ms=' + ms);

    /* ---- (c) THE FLOOR'S JUDGE: twelve orders × two machines, plus the references ---- */
    var HERS = REF_LABEL + '\n\n' + REF_COST + '\n\nprint(label("Aoife", 2))\nprint(cost(2))';
    t0 = Date.now();
    return runPy(HERS, {}).then(function (own) {
      return checkCalls(HERS, { fn: 'label', args: ORDERS, reference: REF_LABEL }, runPy).then(function (rl) {
        return checkCalls(HERS, { fn: 'cost', args: ORDERS.map(function (o) { return [o[1]]; }), reference: REF_COST }, runPy).then(function (rc) {
          return { own: own, rl: rl, rc: rc };
        });
      });
    });
  }).then(function (x) {
    var ms = Date.now() - t0;
    row('C1', 'CALLS: her run + twelve label orders + twelve cost orders + both references — every product matches',
      x.own.ok && x.rl.allOk && x.rc.allOk && x.rl.products.length === 12 && x.rc.products.length === 12 && x.rl.products[0].product === 'Aoife x 2' && x.rc.products[8].product === '24',
      'own=' + JSON.stringify(x.own.out) + ' label ok=' + x.rl.allOk + ' cost ok=' + x.rc.allOk + ' ms=' + ms);
    row('C1t', 'CALLS: the whole floor pass (five Skulpt runs) takes under 2,000 ms', ms < 2000, ms + ' ms');
    row('C1o', 'CALLS: her own test print survives and the marker lines never reach her console', x.rl.out.trim() === 'Aoife x 2\n8' && x.rl.out.indexOf('@@L4CALL@@') === -1, JSON.stringify(x.rl.out));
    return checkCalls('def label(name, seats):\n    print(name + " x " + str(seats))', { fn: 'label', args: ORDERS, reference: REF_LABEL }, runPy);
  }).then(function (rl) {
    row('C2', 'CONTROL CALLS: print instead of return stamps None on all twelve', !rl.allOk && rl.products.every(function (p) { return p.none; }), rl.products.length + ' products, none=' + rl.products.filter(function (p) { return p.none; }).length);
    /* class scale: thirty consecutive floor passes, heap flat */
    var heap0 = (performance && performance.memory) ? performance.memory.usedJSHeapSize : 0;
    t0 = Date.now();
    var chain = Promise.resolve(), okCount = 0;
    for (var i = 0; i < 30; i++) {
      chain = chain.then(function () {
        return checkCalls(REF_COST, { fn: 'cost', args: ORDERS.map(function (o) { return [o[1]]; }), reference: REF_COST }, runPy).then(function (r) { if (r.allOk) okCount++; });
      });
    }
    return chain.then(function () {
      var ms = Date.now() - t0;
      var heap1 = (performance && performance.memory) ? performance.memory.usedJSHeapSize : 0;
      row('S1', 'SCALE: thirty consecutive floor passes all correct, heap flat', okCount === 30, okCount + '/30 in ' + ms + ' ms, heap ' + Math.round(heap0 / 1048576) + 'MB → ' + Math.round(heap1 / 1048576) + 'MB');
      return rows;
    });
  }).catch(function (e) {
    row('X', 'the gate crashed', false, String(e && e.stack || e));
    return rows;
  });
};
