/* The Rescue, chapters 2 to 4: the line judge.
   Pure functions. No page, no story, no clock. The story (hour.js) asks; this answers.
   Every sentence here is the wording of J3_L4_RESCUE_SPEC.md sections 6, 8 and 9.
   The same file is read by the page and by the gates (node hour-judge-test.js). */
(function (root) {
  'use strict';

  /* how long each printed word takes at the door, in seconds, and the door's clock */
  var T = { door: 0.5, enter: 1.0, bonk: 0.5, none: 0.3, clock: 12 };
  var KEYWORDS = ['def', 'for', 'in', 'print', 'if', 'else', 'elif', 'while', 'return', 'and', 'or', 'not', 'True', 'False', 'None', 'import', 'from', 'class', 'pass', 'break', 'continue', 'is', 'as', 'with', 'try', 'del', 'global', 'lambda', 'yield'];
  var TAKEN = ['who', 'gang', 'pull', 'tip', 'open', 'shut', 'run', 'jump', 'cross', 'dash', 'rescue', 'inside', 'rung', 'print', 'def', 'blink', 'name'];
  var BLOCK = ['fuck', 'shit', 'cunt', 'piss', 'wank', 'dick', 'cock', 'twat', 'bitch', 'arse', 'slut', 'whore', 'nigg', 'rape', 'nazi', 'hitler', 'penis', 'vagin', 'porn', 'boob', 'bastard', 'bollock', 'fanny', 'tosser', 'prick', 'pussy', 'retard', 'spastic', 'paki', 'kill', 'dead', 'die'];
  var BLOCK_WHOLE = ['ass', 'cum', 'tit', 'tits', 'sex', 'sexy', 'fag', 'poo', 'wee', 'bum', 'bra', 'hell', 'damn', 'crap', 'god'];

  function norm(t) { return String(t).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim(); }
  function printWord(t) { var m = /^print\s*\(\s*(["'])(\w+)\1\s*\)$/.exec(t); return m ? m[2] : null; }
  function printBare(t) { var m = /^print\s*\(\s*([A-Za-z_]\w*)\s*\)$/.exec(t); return m ? m[1] : null; }
  function good(msg, more) { var o = { ok: true, msg: msg }, k; if (more) for (k in more) o[k] = more[k]; return o; }
  function bad(msg) { return { ok: false, msg: msg }; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

  /* what is wrong with a print line, in chapter 1's words; null when the shape is sound */
  function printFault(t) {
    if (/^print\b/i.test(t) && !/^print\b/.test(t)) return 'Python needs print in small letters.';
    if (/^print\s*\(\s*\)$/.test(t)) return 'The brackets are empty. Put a word in them.';
    if (/^print\s*\(\s*(["'])\w+\1$/.test(t) || /^print\s*\(\s*\w+$/.test(t)) return 'The line needs a closing bracket at the end.';
    if (/^print\s*\(\s*(["']\w+|\w+["'])\s*\)?$/.test(t)) return 'The word needs speech marks on both sides.';
    if (/^print\s*\(\s*["']\w+["']\s*\)$/.test(t) && printWord(t) == null) return 'The word needs the same speech marks on both sides.';
    if (/^print\s*\(\s*(["'])[^"']*\s[^"']*\1\s*\)$/.test(t)) return 'Use one word inside the speech marks.';
    if (/^print\s*["'\w]/.test(t) && t.indexOf('(') < 0) return 'print needs brackets round the word.';
    return null;
  }
  /* what is wrong with a def line; null when it names the function and has brackets and a colon */
  function defFault(t, name) {
    var m;
    if (/^def\b/i.test(t) && !/^def\b/.test(t)) return 'Python needs def in small letters.';
    if (new RegExp('^def' + name, 'i').test(t)) return 'The def line needs a space after def.';
    m = /^def\s+([A-Za-z_]\w*)/.exec(t);
    if (!m) return null;
    if (m[1] !== name) return m[1].toLowerCase() === name ? 'Python needs the name in small letters.' : 'Name the function ' + name + ' this time.';
    if (/^def\s+\w+\s*:?$/.test(t)) return 'The def line needs brackets after the name.';
    if (/^def\s+\w+\s*\([^()]*\)$/.test(t)) return 'The def line needs a colon at the end.';
    if (/^def\s+\w+\s*\([^()]*:?$/.test(t)) return 'The def line needs a closing bracket before the colon.';
    return null;
  }
  /* a call line: name(args). Returns { name, raw } or null */
  function callOf(t) { var m = /^([A-Za-z_]\w*)\s*\(\s*(.*?)\s*\)$/.exec(t); return m ? { name: m[1], raw: m[2] } : null; }
  function quoted(raw) { var m = /^(["'])([^"']*)\1$/.exec(raw); return m ? m[2] : null; }

  /* ---------- chapter 2: the river ---------- */

  var MAKE = ['def cross():', 'print("Billy")', 'print("pull")', 'print("tip")'];
  var MAKE_OK = ['def is short for define. You are defining a function called cross.', 'The winch will ask for Billy. Billy will come to the bucket.', 'pull will haul the bucket across the river.', 'tip will set Billy down on the far bank.'];
  /* 6.1: the four lines of cross. n is the line she is on, 0 to 3. */
  function make(n, text) {
    var t = norm(text), f, w, want;
    if (n === 0) {
      if (/^def\s+cross\s*\(\s*\)\s*:$/.test(t)) return good(MAKE_OK[0]);
      f = defFault(t, 'cross');
      if (!f && /^def\s+cross\s*\(.+\)\s*:?$/.test(t)) f = 'The brackets stay empty this time.';
      return bad(f ? f + ' Type ' + MAKE[0] : 'That line did not work. The next line to type is ' + MAKE[0]);
    }
    want = ['Billy', 'pull', 'tip'][n - 1]; w = printWord(t);
    if (w != null && (n === 1 ? w.toLowerCase() === 'billy' : w === want)) return good(MAKE_OK[n], { word: w });
    if (w != null) return bad('This line needs the word ' + want + '. Type ' + MAKE[n]);
    f = printFault(t);
    if (!f && printBare(t) != null) f = 'The word needs speech marks round it.';
    return bad(f ? f + ' Type ' + MAKE[n] : 'That line did not work. The next line to type is ' + MAKE[n]);
  }
  /* 6.1: the first call */
  function call1(text) {
    var t = norm(text), c = callOf(t);
    if (/^cross\s*\(\s*\)$/.test(t)) return good('cross() ran all 3 of its lines. Billy is across.');
    if (t === 'cross') return bad('cross on its own does nothing. Add the brackets to make it run: cross()');
    if (/^cross\s*\(\s*\)$/i.test(t)) return bad('Python needs the name in small letters, as in your def line: cross()');
    if (/^(print|def)\b/i.test(t)) return bad('The function is already made. Type its name to use it: cross()');
    if (c && c.name === 'cross' && c.raw !== '') return bad('The brackets stay empty this time. Type cross()');
    if (/^cross\b/.test(t)) return bad('cross needs both brackets after it to run: cross()');
    return bad('That line did not work. The next line to type is cross()');
  }
  /* 6.2: Bobby next. cross() runs honestly and carries nobody. kind says which. */
  function bobby(text) {
    var t = norm(text), c = callOf(t);
    if (/^cross\s*\(\s*\)$/.test(t)) return good('The winch asked for Billy again. Bobby is still on this bank.', { kind: 'empty' });
    if (c && c.name === 'cross' && c.raw !== '') return good('Good thinking. cross cannot take a name in its brackets yet.', { kind: 'ahead' });
    if (/^print\b/i.test(t)) return bad('The function is already made. Use it to carry Bobby.');
    if (/^bobby\s*\(.*\)?$/i.test(t)) return bad('There is no function called Bobby. Your function is called cross.');
    if (t === 'cross') return bad('cross on its own does nothing. Add the brackets to make it run.');
    if (/^cross\s*\(\s*\)$/i.test(t)) return bad('Your function is called cross, in small letters.');
    return bad('That line did not work. Your function is called cross. Type its name with the brackets.');
  }
  /* 6.4: she makes the gap. n = 0 the def line, 1 the first print line. */
  function gap(n, text) {
    var t = norm(text), f, m, b, w;
    if (n === 0) {
      if (/^def\s+cross\s*\(\s*who\s*\)\s*:$/.test(t)) return good('cross now has a gap called who.');
      f = defFault(t, 'cross'); if (f) return bad(f);
      m = /^def\s+cross\s*\(\s*(.*?)\s*\)\s*:$/.exec(t);
      if (m && m[1] === '') return bad('The brackets are empty. Put the name of the gap in them.');
      if (m && quoted(m[1]) != null) return bad('who is the name of the gap, not a word to print. Take the speech marks away.');
      if (m && m[1].toLowerCase() === 'who') return bad('Python treats ' + m[1] + ' and who as two different names. This gap is called who in small letters, so type who.');
      if (m && /^[A-Za-z_]\w*$/.test(m[1])) return bad('A gap called ' + m[1] + ' would work in Python. This gap is called who, so type who.');
      return bad('That line did not work. The def line needs who in its brackets.');
    }
    b = printBare(t); w = printWord(t);
    if (b === 'who') return good('The winch will ask for whatever name is in the gap.');
    if (w != null && w.toLowerCase() === 'who') return bad('With speech marks the winch would ask for someone named who. Take them away.');
    if (w != null && w.toLowerCase() === 'billy') return bad('Billy is the stuck name again. Put who in the brackets instead.');
    if (b != null && b.toLowerCase() === 'who') return bad('Python needs who in small letters, the same as the def line.');
    if (b != null || w != null) return bad('The gap is called who. Put who in the brackets.');
    f = printFault(t); if (f) return bad(f);
    return bad('That line did not work. The print line needs who in its brackets.');
  }
  /* 6.5: fill the gap with Bobby's name */
  function call2(text) {
    var t = norm(text), c = callOf(t), q;
    if (c && c.name === 'cross') {
      q = quoted(c.raw);
      if (c.raw === '') return bad('The gap is empty. Put a name in the brackets.');
      if (q != null && q.toLowerCase() === 'bobby') return good('"' + q + '" went into the gap. Bobby is across.', { shown: q });
      if (q != null && q.toLowerCase() === 'billy') return bad('Billy is already across. Bobby is the one waiting.');
      if (q != null) return bad('Nobody on this bank has that name. Bobby is waiting.');
      if (/^bobby$/i.test(c.raw)) return bad('Bobby is a word, so it needs speech marks round it.');
      if (/^(["']\w+|\w+["'])$/.test(c.raw)) return bad('The word needs speech marks on both sides.');
      if (/^[A-Za-z_]\w*$/.test(c.raw)) return bad('A name is a word, so it needs speech marks round it.');
      return bad('That line did not work. The next line to type is cross("Bobby")');
    }
    if (t === 'cross') return bad('cross on its own does nothing. Add the brackets and the name.');
    if (/^cross\s*\(\s*["']?\w*["']?$/.test(t)) return bad('The line needs a closing bracket at the end.');
    if (c && c.name.toLowerCase() === 'cross') return bad('Your function is called cross, in small letters.');
    if (/^(print|def)\b/i.test(t)) return bad('The function is already made. Type its name to use it.');
    return bad('That line did not work. The next line to type is cross("Bobby")');
  }
  /* a name she may give the hedgehog: letters only, 2 to 10, nothing rude, nothing the story already uses */
  function nameOK(q) {
    var l = q.toLowerCase(), i;
    if (!/^[A-Za-z]{2,10}$/.test(q)) return false;
    if (TAKEN.indexOf(l) >= 0 || BLOCK_WHOLE.indexOf(l) >= 0) return false;
    for (i = 0; i < BLOCK.length; i++) if (l.indexOf(BLOCK[i]) >= 0) return false;
    return true;
  }
  /* 6.6: the hedgehog. Returns her name for it when the line is right. */
  function hog(text) {
    var t = norm(text), c = callOf(t), q, l;
    if (c && c.name === 'cross') {
      q = quoted(c.raw);
      if (c.raw === '') return bad('The gap is empty. Who is crossing?');
      if (q != null) {
        l = q.toLowerCase();
        if (l === 'billy' || l === 'bobby') return bad(cap(l) + ' is already across. Choose a new name for the hedgehog.');
        if (!nameOK(q)) return bad('Choose a different name. Use 2 to 10 letters.');
        return good('cross("' + q + '") carried ' + q + '. You used the same function with a new name.', { name: q });
      }
      if (/^(["'][^"']*|[^"']*["'])$/.test(c.raw)) return bad('The word needs speech marks on both sides.');
      if (/^[A-Za-z_]\w*$/.test(c.raw)) return bad('A name is a word, so it needs speech marks round it.');
      return bad('Choose a different name. Use 2 to 10 letters.');
    }
    if (t === 'cross') return bad('cross on its own does nothing. Add the brackets and a name.');
    if (/^cross\s*\(\s*["']?\w*["']?$/.test(t)) return bad('The line needs a closing bracket at the end.');
    if (c && c.name.toLowerCase() === 'cross') return bad('Your function is called cross, in small letters.');
    if (/^(print|def)\b/i.test(t)) return bad('The function is already made. Type its name to use it.');
    return bad('That line did not work. Your function is called cross.');
  }

  /* ---------- chapter 3: the lane ---------- */

  var DASH = ['def dash():', 'print("run")', 'print("run")'];
  var DASH_OK = ['You are defining a function called dash.', 'Your first print line is inside dash now. Type the second print line.', 'dash is made. Each time you call dash, it prints the word run 2 times.'];
  /* 8.2: make dash. No line is shown, so a fault never ends with the line. */
  function dashMake(n, text) {
    var t = norm(text), f, w;
    if (n === 0) {
      if (/^def\s+dash\s*\(\s*\)\s*:$/.test(t)) return good(DASH_OK[0]);
      f = defFault(t, 'dash'); if (f) return bad(f);
      if (/^def\s+dash\s*\(.+\)\s*:?$/.test(t)) return bad('dash needs no gap. Leave its brackets empty.');
      if (/^print\b/i.test(t)) return bad('Start with the def line. It names the function dash.');
      return bad('That line did not work. Start with the def line for dash.');
    }
    w = printWord(t);
    if (w === 'run') return good(DASH_OK[n]);
    if (w != null) return bad('This line needs the word run.');
    f = printFault(t); if (f) return bad(f);
    if (printBare(t) != null) return bad('The word needs speech marks round it.');
    if (/^def\b/i.test(t)) return bad('The def line is done. Now type a print line that prints the word run.');
    return bad('That line did not work. Type a print line that prints the word run.');
  }
  /* 8.3: the plan. count = dashes already in her plan. */
  function plan(count, text) {
    var t = norm(text);
    if (/^dash\s*\(\s*\)$/.test(t)) return count >= 5 ? bad('Your plan already has 5 dashes. Press Run the plan.') : good('');
    if (t === 'dash') return bad('dash on its own does nothing. Add the brackets: dash()');
    if (/^dash\s*\(\s*\)$/i.test(t)) return bad('Python needs the name in small letters, as in your def line: dash()');
    if (/^(print|def)\b/i.test(t)) return bad('The function is already made. Type its name to use it: dash()');
    if (/^dash\b/.test(t)) return bad('dash needs both brackets after it to run: dash()');
    return bad('That line did not work. The next line to type is dash()');
  }
  /* 8.6: the mend, one new line inside dash */
  function mend(text) {
    var t = norm(text), w = printWord(t), f, c = callOf(t);
    if (w === 'jump') return good('Your new line is inside dash now. Press Run the plan.');
    if (c && c.name.toLowerCase() === 'jump') return bad('jump is not a function. Put the word in a print line.');
    if (c && c.name.toLowerCase() === 'dash') return bad('Your plan already has its dashes. Add the new line inside dash.');
    if (w != null) return bad('The animals jump over a fallen tree. Print the word jump.');
    f = printFault(t); if (f) return bad(f);
    if (printBare(t) != null) return bad('The word needs speech marks round it.');
    return bad('That line did not work. The new line goes inside dash.');
  }

  /* ---------- chapter 4: the door ---------- */

  /* 9.2: her own def line. Any sound gap name is taken and used from then on. */
  function doorDef(text) {
    var t = norm(text), f, m, g;
    m = /^def\s+rescue\s*\(\s*([A-Za-z_]\w*)\s*\)\s*:$/.exec(t);
    if (m) {
      g = m[1];
      if (KEYWORDS.indexOf(g) >= 0) return bad('Python already uses that word. Name the gap who.');
      if (g === 'gang') return bad('gang is the name of the list. Name the gap who.');
      if (g === 'rescue') return bad('rescue is the name of the function. Name the gap who.');
      return good('rescue has a gap called ' + g + '.' + (g === 'who' ? '' : ' That works too. From now on, type ' + g + ' wherever a card or help line says who.'), { gap: g });
    }
    f = defFault(t, 'rescue'); if (f) return bad(f);
    m = /^def\s+rescue\s*\(\s*(.*?)\s*\)\s*:$/.exec(t);
    if (m && m[1] === '') return bad('rescue needs a gap for the name. Put who in the brackets.');
    if (m && quoted(m[1]) != null) return bad('who is the name of the gap, not a word to print. Take the speech marks away.');
    if (m) return bad('The gap is one word with no spaces. Name it who.');
    return bad('That line did not work. A def line starts with the word def.');
  }
  /* 9.3: one line inside her function. count = lines she already has. gapName from her def line.
     Returns finish:true for the empty line. Nothing is judged for order; the run judges it. */
  function doorBody(count, text, gapName) {
    var t = norm(text), w = printWord(t), b = printBare(t), c = callOf(t), f;
    if (t === '') return count === 0 ? bad('Your function has no lines in it yet. Type a print line first.') : { ok: true, finish: true, msg: '' };
    if (count >= 6) return bad('Your function already has 6 lines. That is the most it can hold. Press the button My function is finished.');
    if (w === 'open') return good('The door will open.', { line: { k: 'open', w: 'open' } });
    if (w === 'shut') return good('The door will shut.', { line: { k: 'shut', w: 'shut' } });
    if (b === gapName) return good('The door will ask for the name in the gap.', { line: { k: 'gap', w: gapName } });
    if (w != null) return good(w === gapName ? 'This line prints the word ' + w + ', with speech marks. The door will ask for the word ' + w + ' every time, not a name.' : 'The door will ask for ' + w + ' every time.', { line: { k: 'word', w: w } });
    if (b != null && b.toLowerCase() === gapName.toLowerCase()) return bad('Python needs ' + gapName + ' in small letters, the same as the def line.');
    if (b != null) return bad('The word needs speech marks round it.');
    if (c && /^(open|shut)$/i.test(c.name)) return bad(c.name.toLowerCase() + ' is not a function. Put the word in a print line.');
    f = printFault(t); if (f) return bad(f);
    return bad('That line did not work. Each line in here is a print line.');
  }
  /* 9.4: the code that uses her function. st = { mode: null | 'loop' | 'direct', v: loop name, n: lines so far, calls: [names] }
     Returns the new state in .st and ready:true when Run may light. */
  function doorLoop(st, text, gang) {
    var t = norm(text), c = callOf(t), m, q, i, hit;
    st = st || { mode: null, v: null, n: 0, calls: [] };
    function next(o) { var s = { mode: st.mode, v: st.v, n: st.n, calls: st.calls.slice() }, k; for (k in o) s[k] = o[k]; return s; }
    if (st.mode === 'loop' && st.n >= 2) return bad('Your loop is finished. Press Run my code.');
    if (st.mode === 'loop') {
      if (c && c.name === 'rescue') {
        if (c.raw === '') return bad('The gap is empty. Put the word after for in the brackets.');
        if (c.raw === st.v) return good('Each name will go into the gap of rescue.', { st: next({ n: 2 }), ready: true });
        return bad('Your for line puts each name into ' + st.v + '. Put ' + st.v + ' in the brackets.');
      }
      if (c && c.name.toLowerCase() === 'rescue') return bad('Your function is called rescue, in small letters.');
      if (t === 'rescue') return bad('rescue on its own does nothing. Add brackets and put ' + st.v + ' in them.');
      if (/^print\b/i.test(t)) return bad('The loop must use your function. Your function is called rescue.');
      return bad('This line must call your function. Your function is called rescue.');
    }
    /* the first line, or more direct calls */
    m = /^for\s+([A-Za-z_]\w*)\s+in\s+([A-Za-z_]\w*)\s*(:?)$/.exec(t);
    if (st.mode === 'direct' && /^for\b/i.test(t)) return bad('Your code already calls rescue. Add another call or press Run my code.');
    if (m) {
      if (KEYWORDS.indexOf(m[1]) >= 0 || m[1] === 'gang' || m[1] === 'rescue') return bad('The word after for must be a new name. Use the word who.');
      if (m[2] !== 'gang') return bad('The list is called gang. Put gang at the end of the for line.');
      if (m[3] !== ':') return bad('The for line needs a colon at the end.');
      return good('The loop will take the names in gang one at a time.', { st: next({ mode: 'loop', v: m[1], n: 1 }) });
    }
    if (/^for\b/i.test(t) && !/^for\b/.test(t)) return bad('Python needs for in small letters.');
    if (c && c.name === 'rescue') {
      q = quoted(c.raw);
      if (c.raw === '') return bad('The gap is empty. Put a name in the brackets.');
      if (q != null && /^\w+$/.test(q)) {
        if (st.calls.length >= 3) return bad('Your code already has 3 calls. Press Run my code.');
        return good('"' + q + '" will go into the gap of rescue.', { st: next({ mode: 'direct', n: st.n + 1, calls: st.calls.concat([q]) }), ready: true });
      }
      hit = null; for (i = 0; i < gang.length; i++) if (gang[i].toLowerCase() === c.raw.toLowerCase()) hit = gang[i];
      if (hit) return bad(hit + ' is a word, so it needs speech marks round it.');
      if (/^[A-Za-z_]\w*$/.test(c.raw)) return bad('Nothing has put a name into ' + c.raw + ' yet. Write the loop line first.');
      return bad('A loop line looks like this: for name in list:');
    }
    if (c && c.name.toLowerCase() === 'rescue') return bad('Your function is called rescue, in small letters.');
    return bad('A loop line looks like this: for name in list:');
  }

  /* the door, run exactly as written. body = [{k:'open'|'shut'|'gap'|'word', w}], calls = the names her code passes in order.
     Returns every printed word with its time and what happened, the end state, and the one line she is told on a fail. */
  function simDoor(body, calls, gang, times) {
    var tm = times || T, at = 0, open = false, inSet = {}, ev = [], bonked = {}, called = {}, unknown = null, i, j, ln, word, who, e, d;
    function find(w) { for (var k = 0; k < gang.length; k++) if (gang[k].toLowerCase() === String(w).toLowerCase()) return gang[k]; return null; }
    for (i = 0; i < calls.length; i++) {
      for (j = 0; j < body.length; j++) {
        ln = body[j]; word = ln.k === 'gap' ? calls[i] : ln.w;
        e = { at: at, word: word, call: i, line: j };
        if (ln.k === 'open') { open = true; e.what = 'open'; d = tm.door; }
        else if (ln.k === 'shut') { open = false; e.what = 'shut'; d = tm.door; }
        else {
          who = find(word);
          if (!who) { e.what = 'nobody'; d = tm.none; if (unknown == null) unknown = word; }
          else if (inSet[who]) { e.what = 'already'; e.who = who; d = tm.none; }
          else if (open) { inSet[who] = true; called[who] = true; e.what = 'enter'; e.who = who; d = tm.enter; }
          else { bonked[who] = true; called[who] = true; e.what = 'bonk'; e.who = who; d = tm.bonk; }
        }
        e.dur = d; at += d; ev.push(e);
      }
    }
    var out = [], allIn = true, fail = '';
    for (i = 0; i < gang.length; i++) if (!inSet[gang[i]]) { allIn = false; out.push(gang[i]); }
    var safe = allIn && !open && at <= tm.clock + 1e-9;
    if (!safe) {
      if (allIn && open) fail = 'Everyone was inside, but the door was still open.';
      else if (allIn) fail = 'The storm arrived before your code had finished.';
      else if (bonked[out[0]]) fail = 'The door was shut when ' + out[0] + ' ran at it.';
      else if (unknown != null) fail = 'The door asked for ' + unknown + '. Nobody has that name.';
      else fail = 'The door never asked for ' + out[0] + ', so ' + out[0] + ' stayed outside.';
    }
    return { events: ev, time: at, open: open, inside: gang.filter(function (g) { return inSet[g]; }), outside: out, safe: safe, fail: fail, words: ev.map(function (x) { return x.word; }) };
  }
  /* where the fault is: her function (step B) or the code that uses it (step C) */
  function doorSite(body, gang, times) { return simDoor(body, gang, gang, times).safe ? 'loop' : 'body'; }

  /* ---------- the same programs as real Python, for the real-Python gate ---------- */
  function pyLine(ln) { return ln.k === 'gap' ? 'print(' + ln.w + ')' : 'print("' + ln.w + '")'; }
  function doorSource(gapName, body, loop, gang) {
    var s = 'gang = [' + gang.map(function (g) { return '"' + g + '"'; }).join(', ') + ']\n' + 'def rescue(' + gapName + '):\n';
    body.forEach(function (ln) { s += '    ' + pyLine(ln) + '\n'; });
    if (loop.mode === 'loop') s += 'for ' + loop.v + ' in gang:\n    rescue(' + loop.v + ')\n';
    else loop.calls.forEach(function (c) { s += 'rescue("' + c + '")\n'; });
    return s;
  }

  var api = {
    T: T, norm: norm, printWord: printWord, printFault: printFault, defFault: defFault, nameOK: nameOK,
    MAKE: MAKE, DASH: DASH,
    make: make, call1: call1, bobby: bobby, gap: gap, call2: call2, hog: hog,
    dashMake: dashMake, plan: plan, mend: mend,
    doorDef: doorDef, doorBody: doorBody, doorLoop: doorLoop, simDoor: simDoor, doorSite: doorSite, doorSource: doorSource, pyLine: pyLine
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.HourJudge = api;
})(typeof window !== 'undefined' ? window : null);
