/* Coursework guide renderer, version 2 (screens, walkthroughs, marked screenshots).
   CW.mount(host, {base, api, go}) then CW.show('#cw' | '#cw/07' | '#cw/07/2-3').
   api = {open(ch), screen(ch, key), tick(ch, id, on), copy(ch, id), reveal(ch, id), done(ch, on), download(file)} — all optional. */
window.CW = (function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var S = { host: null, base: 'content/coursework/', api: {}, go: null, ch: null, ticks: null, seen: null, root: null, flat: [], cur: -1, collect: null };

  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function md(s) { return h(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function call(fn) { try { var f = S.api[fn]; if (f) return f.apply(null, [].slice.call(arguments, 1)); } catch (e) { console.warn('api.' + fn, e); } }
  function getJSON(name) { return fetch(S.base + name, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + name); return r.json(); }); }
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function mainEl() { return S.host.closest('main') || null; }

  /* ---------- ticks and seen screens ---------- */
  function tickKey(ch) { return 'cw:ticks:' + ch; }
  function loadTicks(ch) { return new Set(load(tickKey(ch), [])); }
  function saveTicks() { store(tickKey(S.ch.id), Array.from(S.ticks)); }
  function setTick(id, on) {
    if (on) S.ticks.add(id); else S.ticks.delete(id);
    saveTicks(); call('tick', S.ch.id, id, on); paintStages();
  }
  function loadSeen(ch) { return new Set(load('cw:seen:' + ch, [])); }

  /* ---------- a small highlighter (keywords, strings, comments, numbers, @variables) ---------- */
  var KW = {
    sql: /\b(CREATE|OR|ALTER|PROCEDURE|AS|BEGIN|END|SET|ON|OFF|DECLARE|SELECT|FROM|WHERE|AND|NOT|EXISTS|IF|ELSE|INSERT|INTO|VALUES|UPDATE|DELETE|JOIN|LEFT|INNER|ORDER|BY|GROUP|RETURN|OUTPUT|IN|IS|NULL|TOP|PRINT|EXEC|CAST|ISNULL|COUNT|SUM|MAX|MIN|ROUND|GETDATE|DATEADD|DATEDIFF|DATENAME|SCOPE_IDENTITY|INT|VARCHAR|DECIMAL|DATETIME|DATE|TIME|BIT|MONEY|WEEKDAY|MINUTE|HOUR|DAY|DESC|ASC|HAVING|LIKE|BETWEEN|DISTINCT|USE|GO|TABLE|PRIMARY|KEY|FOREIGN|REFERENCES|IDENTITY|DEFAULT|UNIQUE|CHECK|CONSTRAINT|DROP|ADD|WITH)\b/y,
    cs: /\b(using|namespace|public|private|static|readonly|class|partial|void|int|string|bool|new|return|if|else|foreach|for|in|try|catch|finally|this|null|true|false|is|as|override|base|get|set|DateTime|List|TimeSpan|Convert|decimal|double|object|const|event|delegate|protected|virtual|break|continue|while|switch|case|default|sealed)\b/y
  };
  function hl(lang, line) {
    var out = '', i = 0, n = line.length;
    while (i < n) {
      var rest = line.slice(i), m;
      if (lang === 'sql' && rest.slice(0, 2) === '--') { out += '<span class="tok-c">' + h(rest) + '</span>'; break; }
      if (lang === 'cs' && rest.slice(0, 2) === '//') { out += '<span class="tok-c">' + h(rest) + '</span>'; break; }
      if ((m = /^(N?'(?:[^']|'')*'|"(?:[^"\\]|\\.)*"|@"(?:[^"]|"")*")/.exec(rest))) { out += '<span class="tok-s">' + h(m[1]) + '</span>'; i += m[1].length; continue; }
      if ((m = /^(@@?\w+)/.exec(rest)) && lang === 'sql') { out += '<span class="tok-v">' + h(m[1]) + '</span>'; i += m[1].length; continue; }
      if ((m = /^(\d+(?:\.\d+)?[mMfF]?)\b/.exec(rest)) && (i === 0 || !/[\w@]/.test(line[i - 1]))) { out += '<span class="tok-n">' + m[1] + '</span>'; i += m[1].length; continue; }
      if ((m = /^([A-Za-z_]\w*)/.exec(rest))) {
        var w = m[1]; KW[lang].lastIndex = 0;
        out += (KW[lang].test(w) && w.length === KW[lang].lastIndex) ? '<span class="tok-k">' + h(w) + '</span>' : h(w);
        i += w.length; continue;
      }
      out += h(rest[0]); i++;
    }
    return out;
  }

  /* ---------- clipboard ---------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, no) {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { no(e); } document.body.removeChild(ta);
    });
  }
  function copyButton(label, text, blockId) {
    var b = el('<button class="btn sec sm" type="button">' + h(label) + '</button>');
    b.addEventListener('click', function () {
      copyText(text).then(function () {
        b.textContent = 'Copied'; b.classList.add('copied'); call('copy', S.ch.id, blockId);
        setTimeout(function () { b.textContent = label; b.classList.remove('copied'); }, 1600);
      }, function () { b.textContent = 'Select the lines and press Ctrl+C'; });
    });
    return b;
  }

  /* ---------- simple blocks ---------- */
  function rP(b) { return el('<p>' + md(b.p) + '</p>'); }
  function rBox(b) {
    var x = b.box, inner = x.text ? '<p>' + md(x.text) + '</p>' : '';
    var node = x.fold
      ? el('<details class="card cw-box"><summary>' + h(x.title) + '</summary><div>' + inner + '</div></details>')
      : el('<div class="card cw-box"><h3>' + h(x.title) + '</h3>' + inner + '</div>');
    (x.blocks || []).forEach(function (sub) { var r = render(sub); if (r) (node.querySelector('div') || node).appendChild(r); });
    return node;
  }
  function rRule(b) {
    var names = { double: 'No double booking', stock: 'Stock is always right' };
    return el('<div class="cw-rule"><b>Rule that never breaks · ' + h(names[b.rule.which] || '') + '</b><span>' + md(b.rule.text) + '</span></div>');
  }
  function rNeed(b) { return el('<div class="card cw-need"><h3>Before you start</h3><ul>' + b.need.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div>'); }
  function rWords(b) { return el('<div class="card cw-words"><h3>Words used in this chapter</h3><dl>' + b.words.map(function (w) { return '<dt>' + h(w[0]) + '</dt><dd>' + md(w[1]) + '</dd>'; }).join('') + '</dl></div>'); }
  function rWrongList(list) {
    var wrap = el('<div class="cw-wrongs"></div>');
    list.forEach(function (w) {
      var q = Array.isArray(w) ? w[0] : w.q, a = Array.isArray(w) ? w[1] : w.a;
      wrap.appendChild(el('<details class="cw-wrong"><summary><b>If it goes wrong</b><span>' + md(q) + '</span></summary><div>' + md(a) + '</div></details>'));
    });
    return wrap;
  }

  /* ---------- marked screenshots ---------- */
  function markList(marks) {
    return '<ol class="mk-list">' + marks.map(function (m) { return '<li><i>' + h(m.n) + '</i><span>' + md(m.say) + '</span></li>'; }).join('') + '</ol>';
  }
  function rShot(x, cls) {
    var w = x.w || 800, hh = x.h || 450, marks = x.marks || [];
    var fig = el('<figure class="cw-shot ' + (cls || '') + '"></figure>');
    if (x.missing) {
      fig.appendChild(el('<div class="frame" style="max-width:' + w + 'px;aspect-ratio:' + w + '/' + hh + '"><div><b>Screenshot to come</b>' + h(x.alt) + '</div></div>'));
    } else {
      var pic = el('<div class="pic" style="max-width:' + w + 'px"><img src="' + h(S.base + x.img) + '" alt="' + h(x.alt) + '"></div>');
      marks.forEach(function (m) {
        var box = m.w != null;
        pic.appendChild(el('<span class="mk ' + (box ? 'box' + (+m.y < 5 ? (+m.x < 4 ? ' corner' : ' side') : '') : 'ring') + '" style="left:' + (+m.x) + '%;top:' + (+m.y) + '%' + (box ? ';width:' + (+m.w) + '%;height:' + (+m.h) + '%' : '') + '"><i>' + h(m.n) + '</i></span>'));
      });
      fig.appendChild(pic);
    }
    if (x.cap) fig.appendChild(el('<figcaption class="cap">' + md(x.cap) + '</figcaption>'));
    if (marks.length) fig.appendChild(el(markList(marks)));
    return fig;
  }

  /* ---------- steps ---------- */
  function tickButton(id, on) {
    var n = id.split('.').pop();
    return el('<button class="tick" type="button" aria-pressed="' + (on ? 'true' : 'false') + '" title="Tick this step when you have done it"><span>' + h(n) + '</span></button>');
  }
  function rSteps(b) {
    var ol = el('<ol class="cw-steps"></ol>');
    b.steps.forEach(function (s) {
      var on = S.ticks.has(s.id);
      var li = el('<li data-id="' + h(s.id) + '"' + (on ? ' class="on"' : '') + '></li>');
      var tb = tickButton(s.id, on);
      var body = el('<div></div>');
      body.appendChild(el('<div class="do">' + md(s.do) + '</div>'));
      if (s.copy) { var cb = findCode(s.copy); if (cb) { var w = el('<div class="cw-step-copy"></div>'); w.appendChild(stepCopyButton(cb)); body.appendChild(w); } }
      if (s.img) body.appendChild(rShot(s.img));
      if (s.see) body.appendChild(el('<div class="cw-see"><b>You should see</b>' + md(s.see) + '</div>'));
      if (s.wrong) body.appendChild(rWrongList(s.wrong));
      tb.addEventListener('click', function () { var now = !li.classList.contains('on'); li.classList.toggle('on', now); tb.setAttribute('aria-pressed', now); setTick(s.id, now); });
      li.appendChild(tb); li.appendChild(body); ol.appendChild(li);
    });
    return ol;
  }

  /* ---------- code ---------- */
  function findCode(id) {
    var found = null;
    (S.ch && S.ch.stages || []).forEach(function (st) { (st.screens || []).forEach(function (sc) { (sc.blocks || []).forEach(function (b) {
      if (b.code && b.code.id === id) found = b.code;
      if (b.box && b.box.blocks) b.box.blocks.forEach(function (x) { if (x.code && x.code.id === id) found = x.code; });
    }); }); });
    return found;
  }
  function stepCopyLabel(c) {
    /* "Copy usp_BookAppointment" / "Copy Forms/frmDiary.cs" when the title starts with a name;
       "Copy the test" / "Copy the code" when it starts with a sentence. */
    var name = c.title.split(':')[0].trim();
    if (/\s/.test(name) && !/\.(cs|sql|config)$/i.test(name)) name = /test/i.test(name) ? 'the test' : 'the code';
    return 'Copy ' + name;
  }
  function stepCopyButton(c) {
    if (c.kind === 'type' && c.focusLines && c.focusLines.length) return copyButton(stepCopyLabel(c) + ', with a gap for the yellow lines', codeWithGap(c), c.id);
    return copyButton(stepCopyLabel(c), c.text, c.id);
  }
  /* ids of code blocks that a step on this screen carries a Copy button for: the block header then shows none */
  function stepCopyIds(blocks, acc) {
    (blocks || []).forEach(function (b) {
      if (b.steps) b.steps.forEach(function (st) { if (st.copy) acc[st.copy] = true; });
      if (b.box && b.box.blocks) stepCopyIds(b.box.blocks, acc);
    });
    return acc;
  }
  function inFocus(ranges, ln) { return (ranges || []).some(function (r) { return ln >= r[0] && ln <= r[1]; }); }
  function codeWithGap(c) {
    var lines = c.text.split('\n'), out = [], mark = c.lang === 'sql' ? '-- YOU TYPE THIS PART' : '// YOU TYPE THIS PART';
    for (var i = 1; i <= lines.length; i++) {
      var r = (c.focusLines || []).filter(function (x) { return x[0] === i; })[0];
      if (r) { var ind = (lines[i - 1].match(/^\s*/) || [''])[0]; out.push(ind + mark + ' (' + (r[1] - r[0] + 1) + ' lines)'); i = r[1]; continue; }
      if (!inFocus(c.focusLines, i)) out.push(lines[i - 1]);
    }
    return out.join('\n');
  }
  function rPre(c) {
    var pre = el('<pre class="cw-pre" tabindex="0"></pre>');
    c.text.split('\n').forEach(function (line, i) {
      var ln = i + 1, cls = 'ln' + (inFocus(c.focusLines, ln) ? ' f' : '');
      pre.appendChild(el('<span class="' + cls + '" data-l="' + ln + '">' + (hl(c.lang, line) || ' ') + '</span>'));
    });
    return pre;
  }

  /* The walkthrough: code on the left, one card per part on the right, level with its lines and joined by a leader line.
     "Walk me through it" lights one part at a time. Under 860 px the cards stack beneath the code. */
  function rWalk(c, pre) {
    var parts = c.partLines, st = { walking: false, cur: -1, stacked: false };
    var wrap = el('<div class="cw-walk"></div>');
    var top = el('<div class="wtop"><span class="q">What is going on here?</span><span class="hint">Point at a line, or at a card, to see what goes with what.</span></div>');
    var walkBtn = el('<button class="btn sm" type="button">Walk me through it</button>');
    top.appendChild(walkBtn); wrap.appendChild(top);
    var grid = el('<div class="wgrid"></div>'), left = el('<div class="code"></div>'), cards = el('<div class="cards"></div>');
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'leads'); svg.setAttribute('aria-hidden', 'true');
    left.appendChild(pre); grid.appendChild(left); grid.appendChild(svg); grid.appendChild(cards); wrap.appendChild(grid);
    var bar = el('<div class="wbar" hidden><button class="btn sec sm prev" type="button">‹ Back a part</button><span class="n"></span><button class="btn sm next" type="button">Next part ›</button><button class="btn ghost sm all" type="button">Show everything</button></div>');
    wrap.appendChild(bar);
    var prevB = bar.querySelector('.prev'), nextB = bar.querySelector('.next'), nTxt = bar.querySelector('.n');

    function partOf(l) { for (var i = 0; i < parts.length; i++) if (l >= parts[i][0] && l <= parts[i][1]) return i; return -1; }
    function lineEls(i) { var out = [], p = parts[i]; for (var l = p[0]; l <= p[1]; l++) { var s = pre.querySelector('[data-l="' + l + '"]'); if (s) out.push(s); } return out; }
    var cardEls = parts.map(function (p, i) {
      var span = p[1] > p[0] ? 'Lines ' + p[0] + ' to ' + p[1] : 'Line ' + p[0];
      var cd = el('<div class="wcard" data-i="' + i + '" tabindex="0"><b><i>' + (i + 1) + '</i>' + h(p[2]) + '</b><span class="ls">' + span + '</span><p>' + md(p[3]) + '</p></div>');
      cd.addEventListener('mouseenter', function () { if (!st.walking) hi(i, true); });
      cd.addEventListener('mouseleave', function () { if (!st.walking) hi(i, false); });
      cd.addEventListener('focus', function () { if (!st.walking) hi(i, true); });
      cd.addEventListener('blur', function () { if (!st.walking) hi(i, false); });
      cd.addEventListener('click', function () { if (st.walking) setCur(i); else { start(i); } });
      cards.appendChild(cd); return cd;
    });
    var hovered = -1;
    pre.addEventListener('mouseover', function (e) { var ln = e.target.closest('.ln'); if (!ln || st.walking) return; var i = partOf(+ln.dataset.l); if (i !== hovered) { if (hovered >= 0) hi(hovered, false); hovered = i; if (i >= 0) hi(i, true); } });
    pre.addEventListener('mouseleave', function () { if (hovered >= 0 && !st.walking) hi(hovered, false); hovered = -1; });
    pre.addEventListener('click', function (e) { var ln = e.target.closest('.ln'); if (!ln) return; var i = partOf(+ln.dataset.l); if (i < 0) return; if (st.walking) setCur(i); else start(i); });
    function hi(i, on) {
      cardEls[i].classList.toggle('hi', on);
      lineEls(i).forEach(function (s) { s.classList.toggle('hi', on); });
      var g = svg.querySelector('g[data-i="' + i + '"]'); if (g) g.classList.toggle('hi', on);
    }
    function start(i) { if (hovered >= 0) { hi(hovered, false); hovered = -1; } st.walking = true; st.cur = i == null ? 0 : i; paint(); }
    function stop() { st.walking = false; st.cur = -1; paint(); }
    function setCur(i) { st.cur = Math.max(0, Math.min(parts.length - 1, i)); paint(); }
    function paint() {
      pre.querySelectorAll('.ln').forEach(function (s) { var p = partOf(+s.dataset.l); s.classList.toggle('dim', st.walking && p !== st.cur); s.classList.toggle('lit', st.walking && p === st.cur); s.classList.remove('hi'); });
      cardEls.forEach(function (cd, i) { cd.classList.toggle('on', st.walking && i === st.cur); cd.classList.toggle('off', st.walking && i !== st.cur); cd.classList.remove('hi'); });
      svg.querySelectorAll('g').forEach(function (g) { var i = +g.dataset.i; g.classList.toggle('on', st.walking && i === st.cur); g.classList.toggle('off', st.walking && i !== st.cur); g.classList.remove('hi'); });
      wrap.classList.toggle('walking', st.walking);
      bar.hidden = !st.walking; walkBtn.textContent = st.walking ? 'Show everything' : 'Walk me through it';
      if (st.walking) {
        nTxt.textContent = 'Part ' + (st.cur + 1) + ' of ' + parts.length;
        prevB.disabled = st.cur === 0; nextB.textContent = st.cur === parts.length - 1 ? 'Finish ✓' : 'Next part ›';
        var tgt = st.stacked ? cardEls[st.cur] : lineEls(st.cur)[0];
        if (tgt && tgt.scrollIntoView) tgt.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
    walkBtn.addEventListener('click', function () { if (st.walking) stop(); else start(0); });
    bar.querySelector('.all').addEventListener('click', stop);
    prevB.addEventListener('click', function () { setCur(st.cur - 1); });
    nextB.addEventListener('click', function () { if (st.cur === parts.length - 1) stop(); else setCur(st.cur + 1); });
    wrap.step = function (d) { if (!st.walking) return false; if (d > 0 && st.cur === parts.length - 1) stop(); else setCur(st.cur + d); return true; };

    function layout() {
      var W = grid.clientWidth; st.stacked = W < 860;
      grid.classList.toggle('stacked', st.stacked);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (st.stacked) { cardEls.forEach(function (cd) { cd.style.top = ''; }); grid.style.height = ''; return; }
      var gr = grid.getBoundingClientRect(), lr = left.getBoundingClientRect();
      var head = cards.querySelector('.cards-h'); var prevBottom = head ? head.offsetHeight + 6 : 0;
      var x = lr.right - gr.left + 2;
      parts.forEach(function (p, i) {
        var a = pre.querySelector('[data-l="' + p[0] + '"]'), b = pre.querySelector('[data-l="' + p[1] + '"]'); if (!a || !b) return;
        var y1 = a.getBoundingClientRect().top - gr.top + 1, y2 = b.getBoundingClientRect().bottom - gr.top - 1;
        var cd = cardEls[i], top = Math.max(y1 - 6, prevBottom + 8);
        cd.style.top = top + 'px'; prevBottom = top + cd.offsetHeight;
        var cx = cd.getBoundingClientRect().left - gr.left, cy = top + 20, ym = (y1 + y2) / 2, mx = x + (cx - x) * 0.55;
        var g = document.createElementNS(NS, 'g'); g.setAttribute('data-i', i);
        var br = document.createElementNS(NS, 'path'); br.setAttribute('class', 'br'); br.setAttribute('d', 'M' + (x + 4) + ' ' + y1 + ' H' + (x + 9) + ' V' + y2 + ' H' + (x + 4));
        var ld = document.createElementNS(NS, 'path'); ld.setAttribute('class', 'ld'); ld.setAttribute('d', 'M' + (x + 9) + ' ' + ym + ' C ' + mx + ' ' + ym + ' ' + mx + ' ' + cy + ' ' + (cx - 2) + ' ' + cy);
        g.appendChild(br); g.appendChild(ld); svg.appendChild(g);
      });
      var hgt = Math.max(left.offsetHeight, prevBottom + 8);
      grid.style.height = hgt + 'px'; svg.setAttribute('width', W); svg.setAttribute('height', hgt);
    }
    wrap.layout = layout;
    if (S.collect) S.collect.push(layout);
    return wrap;
  }
  function codeBody(c) {
    var pre = rPre(c);
    if (c.partLines && c.partLines.length) return rWalk(c, pre);
    return pre;
  }
  function rCode(b) {
    var c = b.code, kindText = { copy: 'Copy this one', type: 'Type this one', turn: 'Your turn', read: 'Read this one' }[c.kind];
    var box = el('<div class="cw-code' + (c.kind === 'type' && c.focusLines ? ' greyed' : '') + '" id="b' + h(c.id) + '"></div>');
    var head = el('<div class="cw-code-head"><span class="kind ' + c.kind + '">' + kindText + '</span><span class="t">' + h(c.title) + '</span><span class="lang">' + (c.lang === 'cs' ? 'C#' : 'SQL') + '</span></div>');
    box.appendChild(head);
    if (c.kind === 'turn') {
      var t = el('<div class="cw-turn"></div>');
      t.appendChild(el('<ol>' + (c.task || []).map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ol>'));
      if (c.test) t.appendChild(el('<div class="tst"><b class="lab">The test</b>' + md(c.test) + '</div>'));
      if (c.expect) t.appendChild(el('<div class="exp"><b class="lab">You should see</b>' + md(c.expect) + '</div>'));
      if (c.hint) t.appendChild(el('<div class="hint"><b class="lab">Hint</b>' + md(c.hint) + '</div>'));
      box.appendChild(t);
      var d = el('<details class="reveal"><summary>Stuck? Show me the finished ' + (/^sql_table:/.test(c.src || '') ? 'table' : c.lang === 'cs' ? 'code' : 'procedure') + '</summary></details>');
      var inner = el('<div class="cw-code"></div>');
      inner.appendChild(el('<div class="cw-code-head"><span class="kind type">Read it, then write yours</span><span class="t">' + h(c.title.split(':')[0]) + '</span><span class="lang">SQL</span></div>'));
      inner.appendChild(codeBody(c)); d.appendChild(inner);
      var revealed = false;
      d.addEventListener('toggle', function () { if (d.open && !revealed) { revealed = true; call('reveal', S.ch.id, c.id); } if (d.open) { var w = inner.querySelector('.cw-walk'); if (w && w.layout) w.layout(); } });
      box.appendChild(d);
      return box;
    }
    var stepHasCopy = !!(S.stepCopies && S.stepCopies[c.id]);
    if (c.kind === 'copy' && !stepHasCopy) head.appendChild(copyButton('Copy it', c.text, c.id));
    else if (c.kind === 'type' && c.focusLines && !stepHasCopy) head.appendChild(copyButton('Copy it, with a gap for the yellow lines', codeWithGap(c), c.id));
    box.appendChild(codeBody(c));
    if (c.why) box.appendChild(el('<div class="cw-why"><b>Why you type it</b><span>' + md(c.why) + '</span></div>'));
    return box;
  }

  /* ---------- the controls table ---------- */
  function rControls(b) {
    var x = b.controls, wrap = el('<div class="cw-controls"></div>');
    var props = ['Text = ' + x.title, 'Size = ' + x.size[0] + ', ' + x.size[1], 'FormBorderStyle = ' + x.border, 'StartPosition = CenterParent', 'MaximizeBox = False'];
    if (x.border === 'FixedDialog') props.push('MinimizeBox = False', 'ShowInTaskbar = False');
    if (x.acceptButton) props.push('AcceptButton = ' + x.acceptButton + ' (after you add it)');
    if (x.cancelButton) props.push('CancelButton = ' + x.cancelButton + ' (after you add it)');
    wrap.appendChild(el('<p class="fp">' + md(x.formNote) + '</p>'));
    wrap.appendChild(el('<div class="fp-props"><b>Click the form itself, then set these in the Properties window</b><ul>' + props.map(function (p) { var kv = p.split(' = '); return '<li><span>' + h(kv[0]) + '</span><code>' + h(kv.slice(1).join(' = ')) + '</code></li>'; }).join('') + '</ul></div>'));
    if (x.img) wrap.appendChild(rShot(x.img));
    var rows = x.rows.map(function (r) {
      return '<tr><td>' + h(r.toolbox) + '</td><td class="nm">' + h(r.name) + '</td><td>' + (r.settings.length ? r.settings.map(function (s) { return '<span class="set">' + h(s) + '</span>'; }).join('') : '<span class="note">nothing else</span>') + (r.note ? '<span class="note">' + md(r.note) + '</span>' : '') + '</td><td>' + (r.then ? md(r.then) : '') + '</td></tr>';
    }).join('');
    wrap.appendChild(el('<table><thead><tr><th>Drag this from the Toolbox</th><th>Name it (the Name property)</th><th>Set these in the Properties window</th><th>Then</th></tr></thead><tbody>' + rows + '</tbody></table>'));
    return wrap;
  }

  /* ---------- the test table ---------- */
  function rCheck(b) {
    var t = el('<table class="cw-check"><thead><tr><th></th><th>The test</th><th>What must happen</th><th>How to do it, and what you should see</th></tr></thead><tbody></tbody></table>');
    var tb = t.querySelector('tbody');
    b.check.forEach(function (r) {
      var on = S.ticks.has(r.id);
      var tr = el('<tr data-id="' + h(r.id) + '"' + (on ? ' class="on"' : '') + '><td class="t"></td><td>' + md(r.what) + '</td><td><span class="ex ' + r.expect + '">' + (r.expect === 'control' ? 'Must be refused' : 'Must be allowed') + '</span></td><td>' + md(r.how) + '</td></tr>');
      var btn = el('<button class="tick" type="button" aria-pressed="' + on + '" title="Tick this test when it has passed"></button>');
      btn.addEventListener('click', function () { var now = !tr.classList.contains('on'); tr.classList.toggle('on', now); btn.setAttribute('aria-pressed', now); setTick(r.id, now); });
      tr.firstElementChild.appendChild(btn); tb.appendChild(tr);
    });
    return t;
  }

  /* ---------- the drawn picture of the overlap rule ---------- */
  function mins(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function hhmm(m) { var hh = Math.floor(m / 60), mm = m % 60; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  function rOverlap(b) {
    var o = b.overlap, open = mins(o.open), close = mins(o.close), total = close - open;
    var W = 760, L = 40, R = 720, X = function (t) { return L + (mins(t) - open) / total * (R - L); };
    var root = el('<div class="cw-overlap" id="b' + h(o.id) + '"></div>');
    var s = '<svg viewBox="0 0 ' + W + ' 300" role="img" aria-label="' + h(o.alt || 'Two bookings drawn on one time line') + '">';
    for (var m = Math.ceil(open / 60) * 60; m <= close; m += 60) { var x = L + (m - open) / total * (R - L); s += '<line class="tick" x1="' + x + '" y1="30" x2="' + x + '" y2="250"/><text class="ax" x="' + x + '" y="22">' + hhmm(m) + '</text>'; }
    // The two time labels of one booking. A wide booking carries them inside its span; a narrow one
    // (under 300 picture units, about two hours) hangs each label just outside its own time line,
    // because side by side they would print on top of each other.
    function labels(x1, x2, cls, pre, t1, t2, y) {
      var out = (x2 - x1) < 300;
      return '<text class="tl ' + cls + '" x="' + (out ? x1 - 5 : x1) + '" y="' + y + '" text-anchor="' + (out ? 'end' : 'start') + '">' + pre + 'StartTime ' + h(t1) + '</text>' +
             '<text class="tl ' + cls + '" x="' + (out ? x2 + 5 : x2) + '" y="' + y + '" text-anchor="' + (out ? 'start' : 'end') + '">' + pre + 'EndTime ' + h(t2) + '</text>';
    }
    var a1 = X(o.old.start), a2 = X(o.old.end), b1 = X(o.new.start), b2 = X(o.new.end);
    s += '<rect class="old" x="' + a1 + '" y="60" width="' + (a2 - a1) + '" height="44" rx="7"/>';
    s += '<text class="in" x="' + ((a1 + a2) / 2) + '" y="87">' + h(o.old.label) + '</text>';
    s += labels(a1, a2, 'old', '', o.old.start, o.old.end, 52);
    s += '<rect class="new" x="' + b1 + '" y="130" width="' + (b2 - b1) + '" height="44" rx="7"/>';
    s += '<text class="in" x="' + ((b1 + b2) / 2) + '" y="157">' + h(o.new.label) + '</text>';
    s += labels(b1, b2, 'new', '@', o.new.start, o.new.end, 194);
    var pts = { 'old.start': a1, 'old.end': a2, 'new.start': b1, 'new.end': b2 };
    (o.halves || []).forEach(function (hf, i) {
      var y = 222 + i * 30, xa = pts[hf.a], xb = pts[hf.b], lo = Math.min(xa, xb), hi2 = Math.max(xa, xb);
      s += '<g class="half" data-h="' + i + '"><line class="guide" x1="' + xa + '" y1="' + (hf.a.indexOf('old') === 0 ? 104 : 174) + '" x2="' + xa + '" y2="' + y + '"/><line class="guide" x1="' + xb + '" y1="' + (hf.b.indexOf('old') === 0 ? 104 : 174) + '" x2="' + xb + '" y2="' + y + '"/>';
      s += '<line class="span" x1="' + lo + '" y1="' + y + '" x2="' + hi2 + '" y2="' + y + '"/><circle cx="' + lo + '" cy="' + y + '" r="4"/><circle cx="' + hi2 + '" cy="' + y + '" r="4"/>';
      s += '<circle class="bd" cx="' + ((lo + hi2) / 2) + '" cy="' + y + '" r="11"/><text class="bn" x="' + ((lo + hi2) / 2) + '" y="' + (y + 4) + '">' + (i + 1) + '</text></g>';
    });
    s += '</svg>';
    root.appendChild(el(s));
    var list = el('<ol class="halves"></ol>');
    (o.halves || []).forEach(function (hf, i) {
      var li = el('<li data-h="' + i + '"><i>' + (i + 1) + '</i><div><code>' + h(hf.sql) + '</code><p>' + md(hf.say) + '</p></div></li>');
      li.addEventListener('mouseenter', function () { var g = root.querySelector('g.half[data-h="' + i + '"]'); if (g) g.classList.add('hi'); li.classList.add('hi'); });
      li.addEventListener('mouseleave', function () { var g = root.querySelector('g.half[data-h="' + i + '"]'); if (g) g.classList.remove('hi'); li.classList.remove('hi'); });
      list.appendChild(li);
    });
    root.appendChild(list);
    if (o.after) root.appendChild(el('<p class="after">' + md(o.after) + '</p>'));
    return root;
  }

  /* ---------- the clash timeline (drag a booking about) ---------- */
  function rClash(b) {
    var c = b.clash, open = mins(c.open), close = mins(c.close), total = close - open, snap = c.snap || 15;
    var fx = { s: mins(c.fixed.start), e: mins(c.fixed.end) };
    var st = { s: mins(c.new.start), len: c.new.len };
    var root = el('<div class="clash" id="b' + h(c.id) + '"></div>');
    root.appendChild(el('<div class="lane-h"><span>' + h(c.lane) + '’s day, ' + h(c.open) + ' to ' + h(c.close) + '</span><span>Drag the gold block marked New booking to a different time. Drag its right edge to make it longer or shorter.</span></div>'));
    var axis = el('<div class="axis"></div>'), lane = el('<div class="lane"></div>'), grid = el('<div class="grid"></div>');
    for (var m = Math.ceil(open / 60) * 60; m <= close; m += 60) {
      var pc = (m - open) / total * 100;
      axis.appendChild(el('<span style="left:' + pc + '%">' + hhmm(m) + '</span>'));
      grid.appendChild(el('<i style="left:' + pc + '%"></i>'));
    }
    lane.appendChild(grid);
    var old = el('<div class="blk old" title="' + h(c.fixed.label) + '"><span class="nm">Already booked</span><span class="lbl">' + h(c.fixed.label) + '</span></div>');
    var nw = el('<div class="blk new" tabindex="0" role="application" aria-label="New booking. The left and right arrow keys move it. Hold Shift to change its length."><span class="nm">New booking</span><span class="lbl"></span><span class="h" aria-hidden="true"></span></div>');
    lane.appendChild(old); lane.appendChild(nw);
    root.appendChild(axis); root.appendChild(lane);
    var now = el('<p class="now-line"></p>'); root.appendChild(now);
    var read = el('<div class="read"><div class="cmp c1"><span class="q"></span><span class="num"></span><span class="v"></span><code></code></div><div class="cmp c2"><span class="q"></span><span class="num"></span><span class="v"></span><code></code></div><div class="res"></div></div>');
    root.appendChild(read);
    var jumps = el('<div class="jumps"><span>Try these:</span></div>');
    (c.jumps || []).forEach(function (j) {
      var btn = el('<button type="button">' + h(j.label) + '</button>');
      btn.addEventListener('click', function () { st.s = mins(j.start); st.len = j.len; paint(); nw.focus(); });
      jumps.appendChild(btn);
    });
    root.appendChild(jumps);
    if (c.help) root.appendChild(el('<p class="help">' + md(c.help) + '</p>'));
    function pct(m) { return (m - open) / total * 100; }
    function paint() {
      st.s = Math.max(open, Math.min(close - st.len, st.s)); st.len = Math.max(snap, Math.min(close - st.s, st.len));
      var ne = st.s + st.len;
      old.style.left = pct(fx.s) + '%'; old.style.width = (pct(fx.e) - pct(fx.s)) + '%';
      nw.style.left = pct(st.s) + '%'; nw.style.width = (pct(ne) - pct(st.s)) + '%';
      nw.querySelector('.lbl').textContent = hhmm(st.s) + '–' + hhmm(ne);
      now.innerHTML = 'The new booking for ' + h(c.lane) + ' would run from <b>' + hhmm(st.s) + ' to ' + hhmm(ne) + '</b> (' + st.len + ' minutes). The booking already in the Appointment table runs from <b>' + hhmm(fx.s) + ' to ' + hhmm(fx.e) + '</b>.';
      var a = st.s < fx.e, bb = ne > fx.s, clash = a && bb;
      var c1 = read.querySelector('.c1'), c2 = read.querySelector('.c2'), res = read.querySelector('.res');
      c1.className = 'cmp c1 ' + (a ? 't' : 'f'); c2.className = 'cmp c2 ' + (bb ? 't' : 'f');
      c1.querySelector('.q').textContent = 'Question 1. Does the new booking start before the old one ends?';
      c1.querySelector('.num').textContent = 'Is ' + hhmm(st.s) + ' before ' + hhmm(fx.e) + '?';
      c1.querySelector('.v').textContent = a ? 'Yes' : 'No';
      c1.querySelector('code').textContent = '@StartTime < EndTime';
      c2.querySelector('.q').textContent = 'Question 2. Does the new booking end after the old one starts?';
      c2.querySelector('.num').textContent = 'Is ' + hhmm(ne) + ' after ' + hhmm(fx.s) + '?';
      c2.querySelector('.v').textContent = bb ? 'Yes' : 'No';
      c2.querySelector('code').textContent = '@EndTime > StartTime';
      res.className = 'res ' + (clash ? 'bad' : 'ok');
      res.innerHTML = clash
        ? '<b>Refused</b><small>Both answers are Yes, so the two bookings overlap. The stored procedure says: That mechanic already has a booking in that time.</small>'
        : '<b>Allowed</b><small>' + (st.s === fx.e || ne === fx.s ? 'One answer is No. The two bookings touch, but touching is not overlapping, so the booking is saved.' : 'One answer is No, so the two bookings do not overlap and the booking is saved.') + '</small>';
      nw.classList.toggle('bad', clash); nw.classList.toggle('ok', !clash);
    }
    function pxToMin(x) { var r = lane.getBoundingClientRect(); return open + (x - r.left) / r.width * total; }
    function rnd(m) { return Math.round(m / snap) * snap; }
    var drag = null;
    nw.addEventListener('pointerdown', function (e) {
      var resize = e.target.classList.contains('h');
      drag = { resize: resize, off: pxToMin(e.clientX) - st.s };
      nw.setPointerCapture(e.pointerId); nw.style.cursor = resize ? 'ew-resize' : 'grabbing'; e.preventDefault(); nw.focus();
    });
    nw.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var m = pxToMin(e.clientX);
      if (drag.resize) st.len = rnd(m - st.s); else st.s = rnd(m - drag.off);
      paint();
    });
    function up(e) { if (!drag) return; drag = null; nw.style.cursor = ''; try { nw.releasePointerCapture(e.pointerId); } catch (x) { } }
    nw.addEventListener('pointerup', up); nw.addEventListener('pointercancel', up);
    nw.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowLeft' ? -snap : e.key === 'ArrowRight' ? snap : 0; if (!d) return;
      if (e.shiftKey) st.len += d; else st.s += d; paint(); e.preventDefault(); e.stopPropagation();
    });
    paint();
    return root;
  }

  /* ---------- LEDGER: a stock count row by row, with and without the guard ---------- */
  /* b.ledger = {id, item, rows:[{what, change, refused}], off, offLine}; the first row's change is the starting count */
  function ledgerRows(L, guard) {
    var q = 0, out = [];
    L.rows.forEach(function (r, i) {
      if (i === 0) { q = r.change; out.push({ what: r.what, change: '', q: q, state: '' }); return; }
      if (guard && q + r.change < 0) { out.push({ what: r.what, change: (r.change > 0 ? '+' : '') + r.change, q: q, state: 'refused', msg: r.refused }); return; }
      q += r.change; out.push({ what: r.what, change: (r.change > 0 ? '+' : '') + r.change, q: q, state: q < 0 ? 'neg' : '' });
    });
    return out;
  }
  function ledgerTable(L, guard) {
    var t = el('<table class="lg-t"><thead><tr><th>What happens</th><th>Change</th><th>' + h(L.item) + ' in stock after it</th></tr></thead><tbody></tbody></table>');
    ledgerRows(L, guard).forEach(function (r, i) {
      var tr = el('<tr class="' + r.state + '" style="--i:' + i + '"><td>' + md(r.what) + (r.msg ? '<span class="msg">' + md(r.msg) + '</span>' : '') + '</td><td class="ch">' + h(r.change) + '</td><td class="q">' + h(r.q) + '</td></tr>');
      t.querySelector('tbody').appendChild(tr);
    });
    return t;
  }
  function rLedger(b) {
    var L = b.ledger, guard = true;
    var root = el('<div class="cw-ledger" id="b' + h(L.id) + '"><div class="lg-h"><span class="lg-mode"></span><button type="button" class="lg-sw" aria-pressed="false"></button></div><div class="lg-body"></div><p class="lg-line" hidden></p><div class="lg-print"></div></div>');
    var sw = root.querySelector('.lg-sw'), body = root.querySelector('.lg-body'), line = root.querySelector('.lg-line');
    function paint() {
      root.classList.toggle('off', !guard);
      root.querySelector('.lg-mode').textContent = guard ? 'With the guard in the stored procedure.' : L.off + '.';
      sw.textContent = guard ? L.off : 'Put the guard back';
      sw.setAttribute('aria-pressed', guard ? 'false' : 'true');
      body.innerHTML = ''; body.appendChild(ledgerTable(L, guard));
      var neg = !guard && ledgerRows(L, false).some(function (r) { return r.q < 0; });
      line.hidden = !neg; line.innerHTML = md(L.offLine);
    }
    sw.addEventListener('click', function () { guard = !guard; paint(); });
    var pr = root.querySelector('.lg-print');
    pr.appendChild(el('<p class="lg-pt">' + h(L.off) + ':</p>')); pr.appendChild(ledgerTable(L, false)); pr.appendChild(el('<p class="lg-pl">' + md(L.offLine) + '</p>'));
    paint();
    return root;
  }

  /* ---------- DIAGRAM: tables as boxes, keys joined by lines ---------- */
  /* b.diagram = {id, alt, tables:[{name, x, y, cols:[[name, 'PK'|'FK'|'']]}], links:[['Child.Col', 'Parent.Col']]} — x, y in pixels on a 1000-wide canvas */
  function rDiagram(b) {
    var D = b.diagram, W = 190, RH = 22, HH = 28, pos = {}, maxY = 0;
    D.tables.forEach(function (t) {
      t.cols.forEach(function (c, i) { pos[t.name + '.' + c[0]] = { t: t, y: t.y + HH + i * RH + RH / 2 }; });
      maxY = Math.max(maxY, t.y + HH + t.cols.length * RH);
    });
    var s = ['<svg viewBox="0 0 1000 ' + (maxY + 12) + '" role="img" aria-label="' + h(D.alt) + '">'];
    D.links.forEach(function (l) {
      var a = pos[l[0]], z = pos[l[1]]; if (!a || !z) return;
      var ax = a.t.x < z.t.x ? a.t.x + W : a.t.x, zx = a.t.x < z.t.x ? z.t.x : z.t.x + W;
      if (Math.abs(a.t.x - z.t.x) < W) { ax = a.t.x + W; zx = z.t.x + W; var mx = Math.max(ax, zx) + 26; s.push('<path class="ln" d="M' + ax + ' ' + a.y + ' H' + mx + ' V' + z.y + ' H' + zx + '"/>'); }
      else { var m = (ax + zx) / 2; s.push('<path class="ln" d="M' + ax + ' ' + a.y + ' H' + m + ' V' + z.y + ' H' + zx + '"/>'); }
      s.push('<circle class="end" cx="' + zx + '" cy="' + z.y + '" r="3.5"/>');
    });
    D.tables.forEach(function (t) {
      var hgt = HH + t.cols.length * RH;
      s.push('<g><rect class="bx" x="' + t.x + '" y="' + t.y + '" width="' + W + '" height="' + hgt + '" rx="6"/><rect class="hd" x="' + t.x + '" y="' + t.y + '" width="' + W + '" height="' + HH + '" rx="6"/><rect class="hd" x="' + t.x + '" y="' + (t.y + HH - 6) + '" width="' + W + '" height="6"/>');
      s.push('<text class="tn" x="' + (t.x + 10) + '" y="' + (t.y + 19) + '">' + h(t.name) + '</text>');
      t.cols.forEach(function (c, i) {
        var y = t.y + HH + i * RH + 15;
        s.push('<text class="cn ' + (c[1] || '').toLowerCase() + '" x="' + (t.x + 10) + '" y="' + y + '">' + h(c[0]) + '</text>');
        if (c[1]) s.push('<text class="k" x="' + (t.x + W - 10) + '" y="' + y + '">' + h(c[1]) + '</text>');
      });
      s.push('</g>');
    });
    s.push('</svg>');
    return el('<figure class="cw-diagram" id="b' + h(D.id) + '">' + s.join('') + (D.cap ? '<figcaption>' + md(D.cap) + '</figcaption>' : '') + '</figure>');
  }

  function render(b) {
    if (b.p != null) return rP(b);
    if (b.box) return rBox(b);
    if (b.rule) return rRule(b);
    if (b.need) return rNeed(b);
    if (b.words) return rWords(b);
    if (b.steps) return rSteps(b);
    if (b.code) return rCode(b);
    if (b.controls) return rControls(b);
    if (b.check) return rCheck(b);
    if (b.screenshot) return rShot(b.screenshot);
    if (b.wrong) return rWrongList(b.wrong);
    if (b.overlap) return rOverlap(b);
    if (b.clash) return rClash(b);
    if (b.ledger) return rLedger(b);
    if (b.diagram) return rDiagram(b);
    console.warn('unknown block', b); return null;
  }

  /* ---------- stages strip (stage pills with one dot per screen) ---------- */
  function tickIds(node) {
    var ids = [];
    (function walk(n) { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object') { if (n.steps) n.steps.forEach(function (s) { ids.push(s.id); }); if (n.check) n.check.forEach(function (r) { ids.push(r.id); }); Object.keys(n).forEach(function (k) { if (k !== 'steps' && k !== 'check') walk(n[k]); }); } })(node);
    return ids;
  }
  function allTicked(ids) { return ids.length > 0 && ids.every(function (i) { return S.ticks.has(i); }); }
  function paintStages() {
    if (!S.ch || !S.root) return;
    S.ch.stages.forEach(function (st) {
      var li = S.root.querySelector('.cw-stages li[data-s="' + st.id + '"]'); if (!li) return;
      li.classList.toggle('ok', allTicked(tickIds(st.screens)));
      st.screens.forEach(function (sc) {
        var dot = li.querySelector('.dot[data-k="' + sc.id + '"]'); if (!dot) return;
        var ids = tickIds(sc.blocks);
        dot.classList.toggle('ok', ids.length ? allTicked(ids) : S.seen.has(st.id + '-' + sc.id));
      });
    });
    var all = tickIds(S.ch.stages);
    S.root.querySelectorAll('.cnt').forEach(function (n) { n.textContent = all.filter(function (i) { return S.ticks.has(i); }).length + ' of ' + all.length + ' steps ticked in this chapter'; });
  }
  function paintNow() {
    if (!S.root) return;
    var f = S.flat[S.cur]; if (!f) return;
    S.root.querySelectorAll('.cw-stages li').forEach(function (li) { li.classList.toggle('now', li.dataset.s === f.st.id); });
    S.root.querySelectorAll('.cw-stages .dot').forEach(function (d) { d.classList.toggle('now', d.dataset.s === f.st.id && d.dataset.k === f.sc.id); });
  }

  /* ---------- screens ---------- */
  function href(f) { return '#cw/' + S.ch.id + '/' + f.st.id + '-' + f.sc.id; }
  function findScreen(s, k) {
    for (var i = 0; i < S.flat.length; i++) if (S.flat[i].st.id === String(s) && S.flat[i].sc.id === String(k)) return i;
    return -1;
  }
  function screenNode(f, idx) {
    var sec = el('<section class="cw-screen" data-s="' + h(f.st.id) + '" data-k="' + h(f.sc.id) + '" hidden></section>');
    sec.appendChild(el('<p class="cw-where">Stage ' + h(f.st.id) + ' of ' + S.ch.stages.length + ' · ' + h(f.st.title) + ' · screen ' + h(f.sc.id) + ' of ' + f.st.screens.length + '</p>'));
    sec.appendChild(el('<h2>' + h(f.sc.title) + '</h2>'));
    f.layouts = []; S.collect = f.layouts; S.stepCopies = stepCopyIds(f.sc.blocks, {});
    f.sc.blocks.forEach(function (b) { var r = render(b); if (r) sec.appendChild(r); });
    S.collect = null; S.stepCopies = null;
    var nav = el('<div class="cw-nav"></div>'), prev = S.flat[idx - 1], next = S.flat[idx + 1];
    if (prev) nav.appendChild(el('<a class="btn sec back" href="' + href(prev) + '"><span>‹ Back</span><small>' + h(prev.sc.title) + '</small></a>'));
    else if (S.ch.prev) nav.appendChild(el('<a class="btn sec back" href="#cw/' + h(S.ch.prev.id) + '"><span>‹ Back</span><small>Chapter ' + h(S.ch.prev.n || +S.ch.prev.id) + ' · ' + h(S.ch.prev.title) + '</small></a>'));
    nav.appendChild(el('<span class="sp"></span>'));
    if (next) nav.appendChild(el('<a class="btn next" href="' + href(next) + '"><span>Next ›</span><small>' + h(next.sc.title) + '</small></a>'));
    else {
      var done = !!load('cw:done:' + S.ch.id, false);
      var end = el('<div class="cw-end"><span class="note cnt"></span></div>');
      var clr = el('<button class="clear" type="button">Clear my ticks</button>'), ask = el('<span class="ask" hidden>Clear every tick in this chapter? <button class="btn sec sm" type="button">Yes, clear them</button><button class="btn ghost sm" type="button">No, keep them</button></span>');
      clr.addEventListener('click', function () { ask.hidden = false; clr.hidden = true; });
      ask.children[0].addEventListener('click', function () { S.ticks = new Set(); saveTicks(); S.root.querySelectorAll('.cw-steps li.on, .cw-check tr.on').forEach(function (n) { n.classList.remove('on'); n.querySelector('.tick').setAttribute('aria-pressed', 'false'); }); call('tick', S.ch.id, '*', false); paintStages(); ask.hidden = true; clr.hidden = false; });
      ask.children[1].addEventListener('click', function () { ask.hidden = true; clr.hidden = false; });
      end.appendChild(clr); end.appendChild(ask);
      var dn = el('<button class="btn' + (done ? ' done' : '') + '" type="button">' + (done ? '✓ Chapter ' + S.ch.n + ' is done' : 'Mark chapter ' + S.ch.n + ' as done') + '</button>');
      dn.addEventListener('click', function () { done = !done; store('cw:done:' + S.ch.id, done); dn.className = 'btn' + (done ? ' done' : ''); dn.textContent = done ? '✓ Chapter ' + S.ch.n + ' is done' : 'Mark chapter ' + S.ch.n + ' as done'; call('done', S.ch.id, done); });
      end.appendChild(dn);
      if (S.ch.next) end.appendChild(el('<a class="btn sec" href="#cw/' + h(S.ch.next.id) + '">Go on to chapter ' + h(S.ch.next.n || +S.ch.next.id) + ' · ' + h(S.ch.next.title) + ' ›</a>'));
      nav.appendChild(end);
    }
    sec.appendChild(nav);
    return sec;
  }
  function showScreen(idx) {
    if (idx < 0 || idx >= S.flat.length) idx = 0;
    S.flat.forEach(function (f, i) { f.node.hidden = i !== idx; });
    S.cur = idx;
    var f = S.flat[idx], key = f.st.id + '-' + f.sc.id;
    if (!S.seen.has(key)) { S.seen.add(key); store('cw:seen:' + S.ch.id, Array.from(S.seen)); call('screen', S.ch.id, key); }
    store('cw:at:' + S.ch.id, key);
    var want = href(f); if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { } }
    paintNow(); paintStages();
    var m = mainEl(); if (m) m.scrollTop = 0; else window.scrollTo(0, 0);
    requestAnimationFrame(function () { (f.layouts || []).forEach(function (fn) { fn(); }); });
  }
  function relayout() { var f = S.flat[S.cur]; if (f) (f.layouts || []).forEach(function (fn) { fn(); }); }
  function go(d) {
    var f = S.flat[S.cur]; if (!f) return;
    var w = f.node.querySelector('.cw-walk.walking'); if (w && w.step && w.step(d)) return;
    var n = S.cur + d; if (n < 0 || n >= S.flat.length) return;
    location.hash = href(S.flat[n]);
  }

  /* ---------- pages ---------- */
  function chapter(id, s, k) {
    if (S.ch && S.ch.id === id && S.root && S.root.isConnected) {
      var at = s != null ? findScreen(s, k) : -1;
      if (at < 0) { var last = load('cw:at:' + id, null); at = last ? findScreen(last.split('-')[0], last.split('-')[1]) : 0; }
      showScreen(at); return Promise.resolve(S.ch);
    }
    S.host.innerHTML = '<p class="note">Loading chapter ' + h(id) + '…</p>';
    return getJSON('ch' + id + '.json').then(function (ch) {
      S.ch = ch; S.ticks = loadTicks(ch.id); S.seen = loadSeen(ch.id); call('open', ch.id);
      ch.stages.forEach(function (st) { if (!st.screens) st.screens = [{ id: '1', title: st.title, blocks: st.blocks || [] }]; });
      var root = el('<article class="cw"></article>'); S.root = root;
      root.appendChild(el('<p class="cw-num">Chapter ' + ch.n + ' of 12</p>'));
      root.appendChild(el('<h1>' + h(ch.title) + '</h1>'));
      if (ch.one) root.appendChild(el('<p class="sub">' + md(ch.one) + '</p>'));
      var strip = el('<ol class="cw-stages" aria-label="Stages in this chapter"></ol>');
      S.flat = [];
      ch.stages.forEach(function (st) {
        var li = el('<li data-s="' + h(st.id) + '"><button type="button" class="cw-pill"><i><span>' + h(st.id) + '</span></i><span class="tt">' + h(st.title) + '</span></button><span class="cw-dots"></span></li>');
        li.querySelector('.cw-pill').addEventListener('click', function () { location.hash = href(S.flat[findScreen(st.id, st.screens[0].id)]); });
        st.screens.forEach(function (sc) {
          var dot = el('<button type="button" class="dot" data-s="' + h(st.id) + '" data-k="' + h(sc.id) + '" title="' + h(sc.title) + '" aria-label="Screen ' + h(sc.id) + ': ' + h(sc.title) + '"></button>');
          dot.addEventListener('click', function () { location.hash = '#cw/' + ch.id + '/' + st.id + '-' + sc.id; });
          li.querySelector('.cw-dots').appendChild(dot);
          S.flat.push({ st: st, sc: sc, node: null, layouts: [] });
        });
        strip.appendChild(li);
      });
      root.appendChild(strip);
      var screens = el('<div class="cw-screens"></div>');
      S.flat.forEach(function (f, i) { f.node = screenNode(f, i); screens.appendChild(f.node); });
      root.appendChild(screens);
      S.host.innerHTML = ''; S.host.appendChild(root);
      var at = s != null ? findScreen(s, k) : -1;
      if (at < 0) { var last = load('cw:at:' + id, null); at = last ? findScreen(last.split('-')[0], last.split('-')[1]) : 0; }
      showScreen(at < 0 ? 0 : at);
      return ch;
    }, function (e) { S.host.innerHTML = '<div class="banner">That chapter could not be loaded (' + h(e.message) + '). Check your connection and try again.</div>'; });
  }

  function list() {
    S.ch = null; S.root = null; S.flat = []; S.cur = -1;
    S.host.innerHTML = '<p class="note">Loading…</p>';
    return getJSON('index.json').then(function (ix) {
      var root = el('<article class="cw"></article>');
      root.appendChild(el('<h1>Coursework guide</h1>'));
      root.appendChild(el('<p class="sub">Build a bike shop system one chapter at a time, then turn it into your own system. Each chapter is one sitting. Tick the steps as you do them. Your ticks are saved.</p>'));
      var ol = el('<ol class="cw-list"></ol>');
      ix.chapters.forEach(function (c) {
        var ticks = loadTicks(c.id).size, done = !!load('cw:done:' + c.id, false), at = load('cw:at:' + c.id, null);
        var link = '#cw/' + c.id + (at ? '/' + at : '');
        var state = !c.built ? '<span class="cw-pill">Coming</span>' : done ? '<span class="pill done">Done</span>' : '<a class="btn sec sm" href="' + link + '">' + (at ? 'Carry on' : 'Open') + '</a>';
        ol.appendChild(el('<li class="' + (c.built ? 'live' : 'soon') + '"><span class="n">' + c.n + '</span><div><h3>' + h(c.title) + '</h3><p>' + h(c.one) + (c.built && ticks ? ' · ' + ticks + ' steps ticked' : '') + '</p></div><span class="st">' + state + '</span></li>'));
      });
      root.appendChild(ol);
      var files = el('<div class="card cw-files"><h3>Sample data</h3><p class="note">Download this inside the Programming Environment and keep it in your OneDrive folder for the coursework.</p><ul></ul></div>');
      ix.files.forEach(function (f) {
        var li = el('<li><a href="' + h(S.base) + 'files/' + h(f.name) + '" download>' + h(f.name) + '</a><span>' + h(f.what) + '</span></li>');
        li.querySelector('a').addEventListener('click', function () { call('download', f.name); });
        files.querySelector('ul').appendChild(li);
      });
      root.appendChild(files);
      S.host.innerHTML = ''; S.host.appendChild(root);
      var m = mainEl(); if (m) m.scrollTop = 0;
    }, function (e) { S.host.innerHTML = '<div class="banner">The guide could not be loaded (' + h(e.message) + ').</div>'; });
  }

  function show(hash) {
    var m = /^#cw(?:\/(\d\d)(?:\/(\d+)-(\d+))?)?/.exec(hash || '');
    if (!m) return list();
    return m[1] ? chapter(m[1], m[2], m[3]) : list();
  }
  function typingSomewhere() {
    var a = document.activeElement; if (!a) return false;
    return /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(a.tagName) || a.isContentEditable || a.classList.contains('new') || a.classList.contains('cw-pre');
  }
  function mount(host, opts) {
    S.host = host; opts = opts || {}; S.base = opts.base || S.base; S.api = opts.api || {}; S.go = opts.go || null;
    window.addEventListener('beforeprint', function () { host.querySelectorAll('details').forEach(function (d) { if (!d.open) { d.open = true; d.dataset.wasClosed = '1'; } }); });
    window.addEventListener('afterprint', function () { host.querySelectorAll('details[data-was-closed]').forEach(function (d) { d.open = false; delete d.dataset.wasClosed; }); });
    document.addEventListener('keydown', function (e) {
      if (!S.flat.length || !S.host.isConnected || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (typingSomewhere()) return;
      go(e.key === 'ArrowRight' ? 1 : -1); e.preventDefault();
    });
    // Hash links stay inside the page: the served page has <base target="_top">, which would send them to the sandbox frame's own address.
    host.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault(); location.hash = a.getAttribute('href');
    });
    var t = null; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(relayout, 120); });
  }
  return { mount: mount, show: show, chapter: chapter, list: list, relayout: relayout };
})();
