/* The Rescue, the whole hour: THE WORDS SAMPLER, shared by hour-type-test.js and hour-gates-test.js.
   SAMPLER runs inside the page (add it with page.addInitScript). It reads what is ON THE RENDERED PAGE:
   every visible text node under a container that is shown, grouped into blocks, split into sentences.
   The rule is DFM 292: no sentence over 14 words, no more than 40 words of prose on a screen.
   Feedback lines, code and buttons are NOT prose (they are kept apart in c.fb). Answer options ARE prose.
   A help line (#hhelp) is a feedback line: it only ever appears after her wrong tries or a failed run.
   So that help can never become a way round the law, there is a second limit: prose and feedback TOGETHER
   may not pass 60 words on one screen.
   window.__count() gives { id, page, blocks, total, longest, longText, fb } for the screen as it stands.
   Each new screen is reported once through window.__screen(c) if the test has exposed that function. */
function SAMPLER() {
  var ON = ['hcap', 'hsay', 'hfn', 'hcard', 'hover', 'hprints', 'hlane', 'hwelcome', 'hpaused', 'hbadge'];
  var SKIP = '#hfb, #hhelp, .qfb, #hlines, #hfnl, .hstack, #hinp, #hpr, canvas, button:not(.hopt), .hopt.code, #hprints .row, .hbar, [data-platform]';
  var seen = {};
  function hidden(x, stop) {
    for (; x && x !== stop; x = x.parentElement) { var cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return true; }
    return false;
  }
  function blocks(root, mark) {
    var out = [], map = new Map(), w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n, x, cs, skip, block, code;
    while ((n = w.nextNode())) {
      /* a line break starts a new line on screen, so it starts a new block here */
      if (n.nodeType === 1) { if (n.tagName === 'BR') map.clear(); continue; }
      if (!n.nodeValue.trim()) continue;
      skip = false; block = null; code = false;
      for (x = n.parentElement; x && x !== root.parentElement; x = x.parentElement) {
        cs = getComputedStyle(x);
        if (cs.display === 'none' || cs.visibility === 'hidden' || x.matches(SKIP)) { skip = true; break; }
        if (x.matches('code, .hcode') && cs.display.indexOf('inline') !== 0) { skip = true; break; }
        if (x.tagName === 'CODE') code = true;
        if (!block && cs.display.indexOf('inline') !== 0) block = x;
      }
      if (skip) continue;
      block = block || root;
      if (!map.has(block)) { map.set(block, out.length); out.push(''); }
      out[map.get(block)] += mark && code ? '`' + n.nodeValue + '`' : n.nodeValue;
    }
    return out.map(function (t) { t = t.replace(/\s+/g, ' ').trim(); return mark ? t.replace(/``/g, '') : t; }).filter(Boolean);
  }
  /* the feedback lines that are showing now: not prose, but the number rule and the cold readers want them */
  function feedback() {
    var out = [];
    ON.forEach(function (id) {
      var e = document.getElementById(id); if (!e || !e.classList.contains('on')) return;
      [].forEach.call(e.querySelectorAll('#hfb, #hhelp, .qfb'), function (f) {
        var t = f.textContent.replace(/\s+/g, ' ').trim(); if (t && !hidden(f, e.parentElement)) out.push(t);
      });
    });
    return out;
  }
  /* FOR THE COLD-READ TRANSCRIPT ONLY (never counted): the code she can see, the typing box, the buttons, the prints */
  function extras() {
    var x = { code: [], box: '', btn: [], opts: [], prints: '', marked: [], platform: '' };
    try {
      /* the platform's own step (How did it go?), mirrored: shown to the reader, never counted */
      [].forEach.call(document.querySelectorAll('[data-platform]'), function (e) {
        if (getComputedStyle(e).display === 'none' || !e.getClientRects().length) return;
        x.platform += (x.platform ? '\n' : '') + 'THE PLATFORM\'S OWN ' + e.getAttribute('data-platform').toUpperCase() + ' STEP, MIRRORED:\n' + e.innerText.replace(/\n{2,}/g, '\n');
      });
      ON.forEach(function (id) { var e = document.getElementById(id); if (e && e.classList.contains('on')) x.marked = x.marked.concat(blocks(e, true)); });
      ON.concat(['hnav']).forEach(function (id) {
        var e = document.getElementById(id); if (!e || !e.classList.contains('on')) return;
        [].forEach.call(e.querySelectorAll('#hlines, #hfnl, .hstack'), function (c) {
          if (hidden(c, e.parentElement) || !c.getClientRects().length) return;
          var k = c.id === 'hlines' ? 'LINES TO TYPE' : c.id === 'hfnl' ? (document.getElementById('hfnk').textContent || '') :
            (c.previousElementSibling && c.previousElementSibling.classList.contains('k') ? c.previousElementSibling.textContent : '');
          var lines = c.id === 'hlines' ? [].map.call(c.children, function (li) { return (li.className === 'done' ? '[typed] ' : li.className === 'now' ? '[next]  ' : '        ') + li.textContent; }) :
            (function () {
              /* read the LIVE panel, so that a block element starts a new line here as it does on the screen */
              var out = '';
              (function walk(n) {
                [].forEach.call(n.childNodes, function (k) {
                  if (k.nodeType === 3) { out += k.nodeValue; return; }
                  if (k.nodeType !== 1) return;
                  var cs = getComputedStyle(k); if (cs.display === 'none') return;
                  var blk = cs.display.indexOf('inline') !== 0;
                  if (blk && out && !/\n$/.test(out)) out += '\n';
                  if (k.classList.contains('gap') && !k.textContent.trim()) out += '____';
                  else if (k.classList.contains('chip')) out += '      [a label beside the line: ' + k.textContent + ']';
                  else { walk(k); if (k.classList.contains('dim')) out += '      [faded: from her last try]'; }
                  if (blk && !/\n$/.test(out)) out += '\n';
                });
              })(c);
              return out.split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).filter(function (l) { return l.trim(); });
            })();
          if (lines.length) x.code.push({ k: k.trim(), lines: lines });
        });
        [].forEach.call(e.querySelectorAll('button'), function (b) {
          if (hidden(b, e.parentElement) || !b.getClientRects().length) return;
          /* a sleeping button still shows its label, so the cold readers see it too (6 Oct 2026) */
          var t = b.textContent.replace(/\s+/g, ' ').trim(); if (!t) return; if (b.disabled) t += ' [asleep]';
          if (b.classList.contains('hopt')) { if (b.classList.contains('code')) x.opts.push(t); } else x.btn.push(t);
        });
        var pr = e.querySelector('#hprompt');
        if (pr && !hidden(pr, e.parentElement) && pr.getClientRects().length) x.box = document.getElementById('hpr').textContent + (document.getElementById('hinp').disabled ? ' (the box is waiting)' : '');
        var row = e.querySelector('#hprints .row') || (e.id === 'hprints' ? e.querySelector('.row') : null);
        if (row) x.prints = [].map.call(row.children, function (sp) { return sp.textContent; }).join(' ');
      });
    } catch (err) { x.err = String(err); }
    return x;
  }
  window.__count = function () {
    var all = [], total = 0, longest = 0, longText = '';
    /* the pause curtain is near-opaque (hour.css): while it is up, it is the whole screen she sees (6 Oct 2026) */
    var pz = document.getElementById('hpaused');
    (pz && pz.classList.contains('on') ? ['hpaused'] : ON).forEach(function (id) { var e = document.getElementById(id); if (e && e.classList.contains('on')) all = all.concat(blocks(e)); });
    all.forEach(function (b) {
      b.split(/(?<=[.!?])\s+/).forEach(function (s) {
        var n = s.split(/\s+/).filter(Boolean).length; total += n;
        if (n > longest) { longest = n; longText = s; }
      });
    });
    return { id: window.Hour && Hour.id ? Hour.id : 'welcome', page: window.Hour && Hour.pageAt ? Hour.pageAt() : -1,
      blocks: all, total: total, longest: longest, longText: longText, fb: feedback(), x: extras() };
  };
  setInterval(function () {
    if (!document.body || !document.body.classList.contains('h-on')) return;
    var c = window.__count(), sig = c.id + '#' + c.blocks.join(' | ') + '#' + c.fb.join(' | ') + '#' + (c.x.platform || '');
    /* a screen that is only the platform's mirrored step counts no words, but the cold readers still see it (6 Oct 2026) */
    if ((!c.blocks.length && !c.x.platform) || seen[sig]) return;
    seen[sig] = true; if (window.__screen) window.__screen(c);
  }, 80);
}

var LIMIT = { screen: 40, sentence: 14, withFeedback: 60 };
function words(t) { return String(t).split(/\s+/).filter(Boolean).length; }
function allWords(c) { return c.total + (c.fb || []).reduce(function (a, t) { return a + words(t); }, 0); }
function over(c) { return c.total > LIMIT.screen || c.longest > LIMIT.sentence || allWords(c) > LIMIT.withFeedback; }

/* THE NUMBER RULE (DFM 294 and 298): a number is never without its thing. Here: a sentence may not END on a bare
   number, and may not BE a bare number. A number that is the name of a thing is allowed: "Question 2 of 5",
   "Lesson 3". Returns the sentences at fault. */
function bareNumbers(lines) {
  var bad = [];
  (lines || []).forEach(function (b) {
    String(b).split(/(?<=[.!?])\s+/).forEach(function (s) {
      var t = s.trim(); if (!t || /^Question \d+ of \d+$/.test(t)) return;
      if (/\b(Lesson|Chapter|Question) \d+[.!?]*$/i.test(t)) return;  /* a small-caps label like FROM LESSON 3 names its thing too */
      if (/(^|\s)\d+[.!?]*$/.test(t)) bad.push(t);
    });
  });
  return bad;
}

module.exports = { SAMPLER: SAMPLER, LIMIT: LIMIT, over: over, allWords: allWords, words: words, bareNumbers: bareNumbers };
