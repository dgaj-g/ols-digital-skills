/* OLS KS3 DT — activity engines. Each engine mounts one lesson chunk:
   Engines[type].mount(host, chunk, ctx). Engines call ctx.awardBadge(chunk.badge)
   when the chunk carries a badge, then ctx.next().
   Marking is ALWAYS server-side (ctx.markItem / recap / exit APIs) — no answer
   keys exist client-side (red team #1). */
(function (global) {
  'use strict';

  var Engines = global.Engines = {};
  var esc = function (s) { return App.esc(s); };
  /* Resolve repo-relative asset paths through App.asset so engine-rendered media
     works under the hosted (googleusercontent) origin too. Absolute URLs pass through. */
  var asset = function (p) { return /^https?:/i.test(String(p)) ? p : App.asset(p); };

  /* DFM 192a — the ONLY markup a pupil string may carry, and the only formatter
     allowed to build it. Damien's hook-card ask was that key words stand out
     ("fault", "BUG", "QA"…), and briefing lines render as plain text today.
     ORDER MATTERS: escape the WHOLE line first, so nothing a content author
     types can become live HTML, THEN turn **paired** markers into <b>. An
     unmatched ** renders literally. Every line that carries no ** comes back
     byte-identical to esc(line) — that equality is the lock control (DFM 176)
     that keeps L1/L2/L3/L5's hooks unchanged, asserted in qa-l4-visual. */
  function fmtBold(s) {
    return esc(String(s == null ? '' : s)).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  /* exposed so the harness can run every other lesson's lines through the real
     function rather than a copy of it (a copy would pass while the engine drifts) */
  App.fmtBold = fmtBold;

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  /* LIVE BUG (30 Jul 2026): a chunk could be finished TWICE. On the real app a
     save takes a second or two, so after the badge pop closed the pupil was
     still looking at the old screen and its Finish button - and the second
     click advanced her a SECOND time, marking the NEXT chunk complete without
     ever showing it. Badge 2 and the whole Vault were lost that way, with no
     route back. One finish per mounted chunk, always. */
  function finishChunk(ctx, detail) {
    if (ctx._finished) return;
    ctx._finished = true;
    if (ctx.chunk.badge) {
      ctx.awardBadge(ctx.chunk.badge, detail).then(function () { ctx.next(); });
    } else ctx.next();
  }
  /* mirror of the server's vhash_ - the vault placement check compares salted
     hashes so the answer map never reaches the client in plaintext */
  function vhash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }

  /* ================= PairKit (ARCHITECTURE section 12) ======================
     Auto-pairing + the monitored "Comms Channel". Any engine can gate its
     activity on PairKit.ensure(): the callback gets 'social' (auto-pairing
     switched off for the class - one machine, the original prompts), 'solo'
     (catch-up / review / teacher release / last agent standing) or 'paired'
     (live pair or trio + a ~2s polled channel). The waiting room, chat dock
     and identity-reveal card all live here so every future paired engine
     reuses them wholesale. */
  var PairKit = global.PairKit = {
    st: null, _pollT: null, _chT: null, _handler: null, _onPoll: null, _dock: null, _seen: null,
    _onEnd: null,

    stop: function () {
      if (PairKit._pollT) { clearTimeout(PairKit._pollT); PairKit._pollT = null; }
      if (PairKit._chT) { clearTimeout(PairKit._chT); PairKit._chT = null; }
      PairKit._handler = null; PairKit._onPoll = null; PairKit._dock = null; PairKit._onEnd = null;
    },

    ensure: function (ctx, host, cb) {
      PairKit.stop();
      PairKit.st = null; PairKit._seen = {};
      if (ctx.review || ctx.catchup) { cb('solo'); return; }
      if (!Number(App.state.pairing)) { cb('social'); return; }
      var stageIdx = Number(App.state.chunkIdx);
      var began = Date.now();
      var box = null;
      /* DAMIEN, 31 Jul 2026: "the girls need to be clearly shown when they actually
         do enter the vault, whether they are still waiting for someone to be matched
         with or not... very, very clear." Three states, each unmistakable and in
         plain words: WAITING (here), PAIRED/TRIO (matchPop) and the rare SOLO
         release. The matching rules themselves are untouched - pairs form while more
         than three are expected, the last three are held back for a trio, the last
         two pair, and only a genuinely last pupil is released alone. */
      function waitUi(r) {
        if (!box) {
          box = el('<div class="card pair-wait">' +
            '<div class="pw-radar"><span></span><span></span><span></span><i></i></div>' +
            '<h2>Waiting to be paired.</h2>' +
            '<p class="pw-status"></p>' +
            '<p class="pw-hint" hidden></p></div>');
          host.appendChild(box);
        }
        var head = box.querySelector('h2');
        var stat = box.querySelector('.pw-status');
        if (r.initial) {
          /* DAMIEN, 31 Jul 2026 (rule 100): this card is up from the very first
             moment - the old blank gap while the first reply travelled was
             exactly the silent wait rule 42 forbids. */
          head.textContent = 'Opening the Vault…';
          stat.textContent = 'Checking who else is at the Vault right now…';
        } else if (Number(r.trioHold)) {
          head.textContent = 'You are one of the last three.';
          stat.textContent = 'The last three pupils share one Vault as a three — waiting for your third partner to arrive…';
        } else {
          head.textContent = 'Waiting to be paired.';
          stat.textContent = 'You are in the queue. The website is waiting for another pupil in your class to reach the Vault — the moment one does, you become partners and this screen changes by itself. Nothing is wrong: stay on this screen.';
        }
        var hint = box.querySelector('.pw-hint');
        if (Date.now() - began > 180000) {
          hint.hidden = false;
          hint.textContent = 'Waiting a while? Wave your teacher over — they can clear you for a solo run.';
        }
      }
      function poll() {
        ctx.call('pairJoin', { lessonId: ctx.lesson.id, stageIdx: stageIdx }).then(function (r) {
          if (!r || !r.ok) {
            // hard refusal degrades to the one-machine social mode; a wifi blip keeps listening
            if (r && r.error && r.error !== 'transport') { if (box) box.remove(); cb('social'); return; }
            PairKit._pollT = setTimeout(poll, 2500); return;
          }
          if (r.state === 'off') { if (box) box.remove(); cb('social'); return; }
          if (r.state === 'solo') {
            if (box) box.remove();
            // The gate released her alone: she is the last one at the Vault with
            // nobody left to match. Never silent - catch-up runs keep their own
            // banner and never reach here.
            PairKit._statePop({
              kicker: 'NO PARTNER',
              title: 'Nobody left to pair with.',
              lines: ['Everyone else in your class has already been through the Vault, so you are ' +
                      'doing this one solo &mdash; you make the calls yourself, and everything else ' +
                      'works the same.'],
              button: 'Open the Vault'
            }, function () { cb('solo'); });
            return;
          }
          if (r.state === 'paired') {
            PairKit.st = {
              pid: String(r.pid), mi: Number(r.mi), members: (r.members || []).map(String),
              trio: !!Number(r.trio), seq: 0,
              live: (r.members || []).map(function () { return 1; }),
              done: Number(r.done), rv: Number(r.rv), names: r.names || null
            };
            if (box) box.remove();
            PairKit._loop(ctx);   // channel stays live under the pop-up
            PairKit._matchPop(function () { cb('paired'); });
            return;
          }
          waitUi(r);
          PairKit._pollT = setTimeout(poll, 2000);
        });
      }
      waitUi({ initial: 1 });   // rule 100: on screen before the first reply, never a blank gate
      poll();
    },

    /* The shared modal behind the PAIRED / TRIO / SOLO states. `lines` are HTML
       so a call sign can be emphasised inside its own sentence - every call site
       below escapes anything that came from the server. */
    _statePop: function (o, cb) {
      var pop = el('<div class="badge-pop pair-pop"><div class="badge-pop-card">' +
        '<span class="reveal-kicker">' + esc(o.kicker) + '</span>' +
        '<h2>' + esc(o.title) + '</h2>' +
        o.lines.map(function (t) { return '<p class="pair-pop-line">' + t + '</p>'; }).join('') +
        '<button class="primary-btn" type="button">' + esc(o.button) + '</button>' +
        '</div></div>');
      document.body.appendChild(pop);
      requestAnimationFrame(function () { pop.classList.add('show'); });
      var btn = pop.querySelector('button');
      App.armButton(btn, function () {             // DFM 104 (one press only)
        btn.disabled = true;
        pop.classList.remove('show');
        setTimeout(function () { pop.remove(); }, 250);
        cb();
      });
      btn.focus();
    },

    /* DAMIEN, 31 Jul 2026 (rule 94): the pop names the partner(s) and carries his
       two standing warnings - the real identity stays secret until the Vault is
       sealed, and real names stay out of a channel the teacher reads. */
    _matchPop: function (cb) {
      var st = PairKit.st;
      if (!st) { cb(); return; }
      var partners = st.members.filter(function (_, i) { return i !== Number(st.mi); });
      var tags = partners.map(function (cn) { return '<b>Agent ' + esc(String(cn)) + '</b>'; });
      var secret = 'Who ' + (tags.length > 1 ? 'they really are stays' : 'she really is stays') +
        ' secret until the Vault is sealed &mdash; so keep real names out of the message box, ' +
        'including your own. Remember: your teacher can read every message.';
      PairKit._statePop({
        kicker: tags.length > 1 ? 'GROUP OF THREE' : 'PARTNER FOUND',
        title: tags.length > 1 ? 'You’re a three!' : 'You’ve been paired!',
        lines: tags.length > 1
          ? ['Your partners for this Vault are ' + tags.join(' and ') + '. Your class has an odd ' +
             'number at the Vault, so the last three share one Vault together.',
             secret,
             'Talk it through, agree, and take turns at the controls.']
          : ['Your partner for this Vault is ' + (tags[0] || '<b>another agent</b>') +
             '. She is at another computer, looking at the same Vault as you.',
             secret,
             'Talk it through, agree, then whoever holds the controls drops the file.'],
        button: 'Open the Vault together'
      }, cb);
    },

    onEvent: function (fn) { PairKit._handler = fn; },
    onPoll: function (fn) { PairKit._onPoll = fn; },
    /* AUDIT FIX C-11: the teacher's "Reset pairing" now DISSOLVES pairs instead
       of deleting the registry, and says so on the channel (dis:1). Without this
       the poll below just kept failing quietly and both agents sat on "not your
       turn" until the page was reloaded. */
    onEnd: function (fn) { PairKit._onEnd = fn; },

    _loop: function (ctx) {
      var st = PairKit.st;
      if (!st) return;
      ctx.call('pairChannel', { lessonId: ctx.lesson.id, pid: st.pid, since: st.seq }).then(function (r) {
        if (r && r.ok && Number(r.dis) && PairKit.st === st) {
          var end = PairKit._onEnd;
          PairKit.st = null;
          PairKit.stop();
          if (end) end('reset');
          return;
        }
        if (r && r.ok && PairKit.st === st) {
          st.seq = Math.max(Number(st.seq), Number(r.seq));
          st.live = r.live || st.live;
          st.done = Number(r.done); st.rv = Number(r.rv);
          if (r.names) st.names = r.names;
          (r.ev || []).forEach(function (e) { PairKit._dispatch(e); });
          if (PairKit._onPoll) PairKit._onPoll();
        }
        if (PairKit.st === st) PairKit._chT = setTimeout(function () { PairKit._loop(ctx); }, 2000);
      });
    },

    _dispatch: function (e) {
      var seq = Number(e[0]);
      if (PairKit._seen[seq]) return;
      PairKit._seen[seq] = 1;
      if (PairKit._dock) PairKit._dock(e);
      if (PairKit._handler) PairKit._handler(e);
    },

    send: function (ctx, kind, text) {
      var st = PairKit.st;
      if (!st) return Promise.resolve({ ok: false, error: 'no-pair' });
      return ctx.call('pairSend', { lessonId: ctx.lesson.id, pid: st.pid, kind: kind, text: String(text || '') });
    },

    complete: function (ctx) {
      var st = PairKit.st;
      if (!st) return Promise.resolve({ ok: false });
      return ctx.call('pairComplete', { lessonId: ctx.lesson.id, pid: st.pid }).then(function (r) {
        if (r && r.ok && PairKit.st === st) { st.done = 1; st.rv = 1; st.names = r.names || st.names; }
        return r;
      });
    },

    /* ---- chat dock: the monitored channel UI ---- */
    dock: function (mountEl, ctx) {
      var st = PairKit.st;
      var d = el('<div class="chat-dock">' +
        '<div class="monitor-banner">&#128737;&#65039; MONITORED CHANNEL &mdash; Mission Command (your teacher) can read every message.</div>' +
        '<div class="turn-chip" hidden></div>' +
        '<div class="chat-log" aria-live="polite"></div>' +
        '<form class="chat-form">' +
        '<input class="chat-input" type="text" maxlength="240" autocomplete="off" placeholder="Message your partner agent&hellip;">' +
        '<button class="chat-send" type="submit">Send</button></form></div>');
      mountEl.appendChild(d);
      var log = d.querySelector('.chat-log');
      var input = d.querySelector('.chat-input');
      var sendBtn = d.querySelector('.chat-send');
      var renderedSeq = {};
      function bubble(mi, text, seq) {
        if (seq != null) { if (renderedSeq[seq]) return; renderedSeq[seq] = 1; }
        var mine = mi === st.mi;
        log.insertAdjacentHTML('beforeend',
          '<div class="chat-msg' + (mine ? ' mine' : '') + '">' +
          '<span class="cm-who">' + esc(mine ? 'You' : 'Agent ' + (st.members[mi] || '?')) + '</span>' +
          '<span class="cm-text">' + esc(text) + '</span></div>');
        log.scrollTop = log.scrollHeight;
      }
      function sys(html) {
        log.insertAdjacentHTML('beforeend', '<div class="chat-sys">' + html + '</div>');
        log.scrollTop = log.scrollHeight;
      }
      PairKit._dock = function (e) {
        if (String(e[2]) === 'msg') bubble(Number(e[1]), String(e[3]), Number(e[0]));
      };
      d.querySelector('.chat-form').onsubmit = function (ev) {
        ev.preventDefault();
        var text = input.value.trim();
        if (!text) return;
        input.disabled = true; sendBtn.disabled = true;
        PairKit.send(ctx, 'msg', text).then(function (r) {
          input.disabled = false; sendBtn.disabled = false;
          if (r && r.ok) {
            bubble(st.mi, text, Number(r.seq));
            input.value = '';
          } else if (r && r.error === 'too-fast') App.toast('Easy, Agent — one message a second.');
          else App.toast('Message did not send — try again.');
          input.focus();
        });
      };
      sys('Channel open. Say hello — and remember Mission Command can see this.');
      return {
        sys: sys,
        setTurn: function (html, mine) {
          var chip = d.querySelector('.turn-chip');
          chip.hidden = false;
          chip.className = 'turn-chip' + (mine ? ' mine' : '');
          chip.innerHTML = html;
        }
      };
    },

    /* identity reveal - the badge-pop pattern from app.js */
    revealCard: function (cb) {
      var st = PairKit.st;
      var others = [];
      if (st) for (var i = 0; i < st.members.length; i++) {
        if (i === st.mi) continue;
        others.push({ cn: st.members[i], n: (st.names || [])[i] || '' });
      }
      var rows = others.map(function (o) {
        return '<p class="reveal-row"><span class="reveal-cn">Agent ' + esc(o.cn) + '</span>' +
          '<span class="reveal-arrow">&#9654;</span><span class="reveal-name">' + esc(o.n || 'a classmate') + '</span></p>';
      }).join('');
      var pop = el('<div class="badge-pop reveal-pop"><div class="badge-pop-card">' +
        '<span class="reveal-kicker">IDENTITY DECLASSIFIED</span>' +
        '<h2>Your partner ' + (others.length > 1 ? 'agents were' : 'agent was') + '&hellip;</h2>' +
        rows +
        '<button class="primary-btn" type="button">Debrief</button></div></div>');
      document.body.appendChild(pop);
      requestAnimationFrame(function () { pop.classList.add('show'); });
      App.armButton(pop.querySelector('button'), function () {   // DFM 104
        pop.classList.remove('show');
        setTimeout(function () { pop.remove(); }, 250);
        cb();
      });
    }
  };

  /* ================= shared item runner =================
     modes: 'feedback' (mark each tap, show why), 'neutral' (log + move on),
     'collect' (record silently).
     Options are ALWAYS shuffled at render (Damien, 22 Jul: authored keys
     clustered on A). curOrd maps display position -> source index, so every
     submit sends SOURCE indexes and the server contract is unchanged. This
     composes safely with the recap engine's server-side shuffle too: there the
     "source" is the server-sent order, and choices/correctIdx are mapped the
     same way. */
  function itemRunner(host, opts) {
    var idx = 0, right = 0, answers = {}, curOrd = [];
    var wrap = el('<div class="runner"></div>');
    host.appendChild(wrap);
    /* DAMIEN, 31 Jul 2026 (live run): opening the Licence Exam instantly answered
       question 1 on BOTH pupil accounts. The intro card's button and the first
       option render at the same screen position, so the tail of one click landed
       on an option that had not been on screen when the press began. The 26 Jul
       fix only guarded the graded exit check's question-to-question step; every
       mount had the same hole. Guard the render itself: an activation within
       GHOST_MS of a card appearing cannot have been aimed at it. */
    var GHOST_MS = 350;
    var shownAt = 0;

    function progress() {
      return opts.items.length > 1
        ? '<span class="runner-progress">' + (idx + 1) + ' of ' + opts.items.length + '</span>' : '';
    }

    /* Stems may carry \n line breaks (e.g. numbered algorithm steps), and a
       line written entirely inside backticks becomes a PROGRAM LINE on its own,
       centred and set apart.

       DAMIEN, 4 Aug 2026, on the exit check: the question ran the program the
       pupil had supposedly built into the same breath as the question about it,
       so neither read clearly. His shape: a lead-in line, a blank line, the
       program on its own line, a blank line, then the question. The backtick
       marker keeps that authorable from the lesson JSON instead of hard-coding
       one question's layout, so every lesson gets it. Everything stays escaped;
       only the line break and the code wrapper are markup. */
    function stemHtml(s) {
      return String(s == null ? '' : s).split('\n').map(function (line) {
        var m = /^\s*`(.+)`\s*$/.exec(line);
        if (m) return '<span class="q-code">' + esc(m[1]) + '</span>';
        return line.trim() ? '<span class="q-line">' + esc(line.trim()) + '</span>' : '';
      }).join('');
    }

    function show() {
      var it = opts.items[idx];
      curOrd = it.options.map(function (_, i) { return i; });
      for (var s = curOrd.length - 1; s > 0; s--) {
        var j = Math.floor(Math.random() * (s + 1));
        var t = curOrd[s]; curOrd[s] = curOrd[j]; curOrd[j] = t;
      }
      wrap.innerHTML =
        '<div class="card q-card">' +
        progress() +
        (it.topic ? '<span class="q-topic">' + esc(it.topic) + '</span>' : '') +
        '<h2 class="q-stem">' + stemHtml(it.stem) + '</h2>' +
        '<div class="q-options">' + curOrd.map(function (oi, i) {
          return '<button class="q-opt" type="button" data-i="' + i + '"><span class="q-letter">' +
            'ABCD'.charAt(i) + '</span><span>' + esc(it.options[oi]) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="q-feedback" hidden></div>' +
        '</div>';
      shownAt = Date.now();
      wrap.querySelectorAll('.q-opt').forEach(function (btn) {
        btn.onclick = function () { pick(Number(btn.getAttribute('data-i')), btn); };
      });
    }

    function lockOptions() {
      wrap.querySelectorAll('.q-opt').forEach(function (b) { b.disabled = true; });
    }

    /* Same live bug: the Next/Finish button stayed live while the badge pop and
       the save were in flight, so a second click ran this again. Guarded, and
       the button is disabled the moment it is used. */
    var advancing = false;
    function nextOrDone(e) {
      if (advancing) return;
      advancing = true;
      if (e && e.currentTarget && e.currentTarget.disabled !== undefined) e.currentTarget.disabled = true;
      idx++;
      if (idx < opts.items.length) { advancing = false; show(); }
      else opts.onDone({ right: right, total: opts.items.length, answers: answers });
    }

    function pick(i, btn) {
      if (Date.now() - shownAt < GHOST_MS) return;   // ghost click from the previous screen
      var it = opts.items[idx];
      var srcIdx = curOrd[i]; // display position -> source index (contract unchanged)
      var ord = curOrd;       // capture: async marking must not race the next show()
      answers[it.id] = srcIdx;
      lockOptions();
      // AUDIT FIX (26 Jul 2026): 'collect' (the GRADED exit check) used to advance
      // synchronously inside this click handler, so the next question's options
      // were live at the same screen coordinates within milliseconds - the second
      // half of an 11-year-old's double-click landed on a question she never saw
      // and was recorded as her answer to it (options are shuffled, so effectively
      // at random; submitExit is first-wins, so it could never be corrected).
      // 'neutral' already waits 650ms and 'feedback' waits for the server; the
      // graded path was the only unguarded one.
      if (opts.mode === 'collect') { setTimeout(nextOrDone, 400); return; }
      if (opts.mode === 'neutral') {
        btn.classList.add('logged');
        // DAMIEN, 31 Jul 2026: the words stay, the tick goes - a tick beside an
        // answer reads as "you got it right" to a 12-year-old, and nothing on the
        // baseline is marked at all.
        btn.insertAdjacentHTML('beforeend', '<span class="q-logged">' + esc(opts.ackText || 'Logged') + '</span>');
        setTimeout(nextOrDone, 650);
        return;
      }
      /* feedback mode: the verdict for the SOURCE index. Since rule 97 the
         normal path is LOCAL and instant (markFn resolves from keys fetched at
         lesson open), and a resolved promise settles before the next paint, so
         none of the Checking scaffolding below ever appears. It stays for the
         fallback - a tap that beat the key fetch, or wifi that ate it - where
         the old silent 5s wait and the NEW-16 hang (30s+, no way out but a
         reload) would otherwise return. */
      btn.classList.add('checking');
      btn.insertAdjacentHTML('beforeend', '<span class="q-checking"><i class="q-spin"></i>Checking&hellip;</span>');
      wrap.querySelector('.q-card').classList.add('is-checking');

      var resolved = false, slowT = null, stuckT = null;

      function saying(html) {
        var s = btn.querySelector('.q-checking');
        if (s) s.innerHTML = html;
      }
      function clearWaits() {
        clearTimeout(slowT); clearTimeout(stuckT);
        var s = btn.querySelector('.q-checking');
        if (s) s.remove();
        btn.classList.remove('checking');
        var card = wrap.querySelector('.q-card');
        if (card) card.classList.remove('is-checking');
      }
      /* Each attempt arms its own timers, so a retry that also stalls offers the
         way out again rather than leaving her on a spinner for ever. */
      function sendMark() {
        clearTimeout(slowT); clearTimeout(stuckT);
        saying('<i class="q-spin"></i>Checking&hellip;');
        slowT = setTimeout(function () {
          if (resolved) return;
          saying('<i class="q-spin"></i>Still checking &mdash; hold on&hellip;');
        }, 8000);
        stuckT = setTimeout(function () {
          if (resolved) return;
          var fbs = wrap.querySelector('.q-feedback');
          fbs.hidden = false;
          fbs.className = 'q-feedback neutral';
          fbs.innerHTML = '<p>This is taking longer than it should &mdash; your connection may have dropped. Your answer is safe.</p>' +
            '<button class="primary-btn" type="button">Try again</button>';
          App.armButton(fbs.querySelector('button'), function () {   // DFM 104
            fbs.hidden = true; fbs.innerHTML = '';
            sendMark();
          });
        }, 20000);

        opts.markFn(it, srcIdx).then(function (r) {
          // A retry can land while the stalled first attempt is still in flight.
          // Only the first reply through renders, so `right` can never count twice.
          if (resolved) return;
          resolved = true;
          clearWaits();
          var fb = wrap.querySelector('.q-feedback');
          if (!r || !r.ok) {
            fb.hidden = false;
            fb.className = 'q-feedback neutral';
            fb.innerHTML = '<p>Hmm — could not check that one. Moving on.</p>' +
              '<button class="primary-btn" type="button">Next</button>';
            App.armButton(fb.querySelector('button'), nextOrDone);   // DFM 104
            return;
          }
          var opts_ = wrap.querySelectorAll('.q-opt');
          if (r.correct) { right++; btn.classList.add('right'); }
          else {
            btn.classList.add('wrong');
            var revealPos = ord.indexOf(Number(r.correctIdx)); // source -> display position
            if (revealPos !== -1 && opts_[revealPos]) opts_[revealPos].classList.add('reveal');
          }
          fb.hidden = false;
          fb.className = 'q-feedback ' + (r.correct ? 'good' : 'bad');
          fb.innerHTML = '<p class="q-verdict">' + (r.correct ? 'Correct.' : 'Not this time.') + '</p>' +
            (r.explain ? '<p class="q-explain">' + esc(r.explain) + '</p>' : '') +
            '<button class="primary-btn" type="button">' + (idx === opts.items.length - 1 ? 'Finish' : 'Next') + '</button>';
          App.armButton(fb.querySelector('button'), nextOrDone);   // DFM 104
          fb.querySelector('button').focus();
        });
      }
      sendMark();
    }

    show();
  }

  function introCard(host, opts, beginLabel, onBegin) {
    var c = el('<div class="card intro-card">' +
      (opts.kicker ? '<span class="intro-kicker">' + esc(opts.kicker) + '</span>' : '') +
      '<h2>' + esc(opts.title) + '</h2>' +
      /* A blank line in the authored text becomes a real paragraph break.
         Added 4 Aug 2026: Lesson 2's rewritten ladder intro carries three
         distinct ideas (what the ladder is / how the pair works / who judges),
         and running them into one block is the wall of text rule 138.2 exists
         to prevent. Still escaped - only the break is markup. */
      String(opts.text || '').split(/\n\s*\n/).map(function (para) {
        return '<p class="intro-lead">' + esc(para.trim()) + '</p>';
      }).join('') +
      /* DFM 192b + 171: an intro that ends "every case is closed the same way:"
         must then SHOW the way as a real numbered list, one number per line —
         not as a chain of fragments buried in prose. Both fields are optional
         and no other engine passes them, so every other lesson's intro card
         renders byte-identically (locked in qa-l4-visual). */
      (opts.steps && opts.steps.length
        ? '<ol class="case-intro-steps">' + opts.steps.map(function (s) { return '<li>' + fmtBold(s) + '</li>'; }).join('') + '</ol>'
        : '') +
      (opts.after ? '<p class="case-intro-after">' + fmtBold(opts.after) + '</p>' : '') +
      (opts.extra || '') +
      '<button class="primary-btn" type="button">' + esc(beginLabel) + '</button></div>');
    host.appendChild(c);
    /* DFM 104: every intro card replaces the screen under the pupil's finger.
       Target the CTA by its own class, not "the first button in the card":
       `extra` can now contain buttons of its own (the ladder intro carries the
       film re-watch, 3 Aug 2026), and picking the first one armed the WRONG
       button and left the real CTA dead. Caught by qa-film-reachable.js. */
    App.armButton(c.querySelector('button.primary-btn'), function () { host.innerHTML = ''; onBegin(); });
  }

  /* ================= briefing (cinematic dossier) ================= */
  Engines.briefing = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      // optional hook-photo strip (real images, credited in assets/img/CREDITS.md)
      var photoStrip = (cfg.images && cfg.images.length)
        ? '<div class="dossier-photos">' + cfg.images.map(function (im) {
            /* DFM 192a: the strip crops every image to a 220x120 thumbnail, which
               reduced the 1947 moth to a sliver ("you can hardly make it out").
               `wide` is opt-in PER IMAGE so L2/L3/L5's hook strips, which are
               genuinely strips, render byte-identically (harness-locked). */
            return '<figure' + (im.wide ? ' class="wide"' : '') + '><img src="' + esc(asset(im.src)) + '" alt="' + esc(im.alt || '') + '" loading="lazy">' +
              (im.caption ? '<figcaption>' + esc(im.caption) + '</figcaption>' : '') + '</figure>';
          }).join('') + '</div>'
        : '';
      var d = el('<div class="dossier">' +
        '<div class="dossier-top"><span class="dossier-clearance">' + esc(cfg.clearance || '') + '</span></div>' +
        '<h1 class="dossier-headline"></h1>' +
        '<div class="dossier-lines"></div>' +
        photoStrip +
        '<button class="primary-btn dossier-cta" type="button" hidden>' + esc(cfg.cta || 'Continue') + '</button>' +
        '</div>');
      host.appendChild(d);
      var headline = d.querySelector('.dossier-headline');
      var linesBox = d.querySelector('.dossier-lines');
      var cta = d.querySelector('.dossier-cta');
      var timers = [];
      /* DFM 104: the button is built hidden and revealed later, so the guard
         window has to start when it APPEARS, not when the card was built. */
      function showCta() {
        if (!cta.hidden) return;
        cta.hidden = false;
        App.armButton(cta, function () { finishChunk(ctx); });
      }
      function reveal() {
        timers.forEach(clearTimeout);
        headline.textContent = cfg.headline;
        linesBox.innerHTML = (cfg.lines || []).map(function (l) { return '<p class="dossier-line show">' + fmtBold(l) + '</p>'; }).join('');
        showCta();
      }
      /* Safety net: a backgrounded tab throttles timers, so the animation can
         stall and strand a pupil with no way on. Reveal everything regardless
         after the animation's own worst case. */
      timers.push(setTimeout(reveal, 900 * ((cfg.lines || []).length + 1) + 6000));
      // typewriter headline
      var hl = String(cfg.headline || ''), pos = 0;
      (function type() {
        if (pos <= hl.length) {
          headline.textContent = hl.slice(0, pos) + (pos < hl.length ? '▍' : '');
          pos++;
          timers.push(setTimeout(type, 45));
        } else {
          (cfg.lines || []).forEach(function (l, i) {
            timers.push(setTimeout(function () {
              var p = document.createElement('p');
              p.className = 'dossier-line'; p.innerHTML = fmtBold(l);
              linesBox.appendChild(p);
              /* capture p, never lastChild — throttled tabs batch rAF callbacks
                 and lastChild would point at the newest line for all of them */
              requestAnimationFrame(function () { p.classList.add('show'); });
              if (i === cfg.lines.length - 1) timers.push(setTimeout(showCta, 700));
            }, 900 * i));
          });
        }
      })();
      /* The Skip button is gone (Damien, live test 30 Jul): it only ever
         fast-forwarded the typing, its label promised something else, and he
         does not want pupils skipping the briefing at all. `reveal` still runs
         if the animation is interrupted. */
    }
  };

  /* ================= items (calibration / rules checks) ================= */
  Engines.items = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      introCard(host, {
        /* The calibration card is named by the chunk itself ("Warm-up") - the old
           hardcoded "Console calibration" reintroduced the console vocabulary the
           Lesson 1 re-author removed (Damien, rule 25). */
        kicker: cfg.variant === 'calibration' ? '' : chunk.title,
        title: cfg.variant === 'calibration' ? chunk.title : 'Quick check',
        text: cfg.intro || ''
      }, 'Start', function () {
        itemRunner(host, {
          items: cfg.items, mode: 'feedback',
          markFn: function (it, i) { return ctx.markItem(it.id, i); },
          onDone: function () { finishChunk(ctx); }
        });
      });
    }
  };

  /* ================= steps (guided ladder, with practice sims) ============ */
  Engines.steps = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var i = 0;
      introCard(host, { kicker: chunk.title, title: chunk.badge ? chunk.badge.name : chunk.title, text: cfg.intro || '' }, 'Start', showStep);

      /* DAMIEN, 3 Aug 2026 (rule 138.2): a step must never assume a digital
         skill a pupil may simply not have. Where a step needs one - opening a
         browser tab - the card carries a short clip that SHOWS it, and his
         follow-up note appears once the clip has played. */
      function openClip(clip) {
        var ov = el('<div class="ols-modal film-modal">' +
          '<div class="ols-modal-card ols-modal-film">' +
          '<h2>&#127909; ' + esc(clip.title || clip.label || 'Show me how') + '</h2>' +
          '<video controls autoplay muted playsinline src="' + esc(asset(clip.src)) + '"></video>' +
          (clip.note ? '<p class="clip-note" hidden>' + esc(clip.note) + '</p>' : '') +
          '<div class="confirm-actions"><button class="primary-btn clip-close" type="button">' + esc(clip.close || 'Back to the step') + '</button></div>' +
          '</div></div>');
        document.body.appendChild(ov);
        var vid = ov.querySelector('video');
        var note = ov.querySelector('.clip-note');
        if (note) {
          /* his note goes on screen "after it plays" - but it must not depend on
             a clean `ended`. A pupil can pause, and a browser can refuse to play
             at all (autoplay/power policies). So: on ended, on error, and as a
             backstop once the clip's own running time has passed. Never before -
             that would give the tip away ahead of the demonstration. */
          var showNote = function () { note.hidden = false; };
          vid.addEventListener('ended', showNote);
          vid.addEventListener('error', showNote);
          vid.addEventListener('loadedmetadata', function () {
            var ms = ((vid.duration && isFinite(vid.duration)) ? vid.duration : 15) * 1000 + 1200;
            setTimeout(showNote, ms);
          });
          setTimeout(showNote, 30000);   // last resort if metadata never arrives
        }
        App.armButton(ov.querySelector('.clip-close'), function () {   // DFM 104
          try { vid.pause(); } catch (e) {}
          ov.remove();
        });
      }
      function wireClip(card, st) {
        var b = card.querySelector('.step-clip-btn');
        if (b) b.onclick = function () { openClip(st.clip); };
      }

      function showStep() {
        if (i >= cfg.steps.length) { rulesCheck(); return; }
        var st = cfg.steps[i];
        var c = el('<div class="card step-card">' +
          '<span class="runner-progress">Step ' + (i + 1) + ' of ' + cfg.steps.length + '</span>' +
          '<div class="step-head"><span class="step-icon">' + esc(st.icon || '') + '</span><h2>' + esc(st.title) + '</h2></div>' +
          '<p class="step-text">' + esc(st.text) + '</p>' +
          /* A step can now carry a NUMBERED list and a PICTURE. Added 8 Aug 2026
             for the end-of-lesson "switch your micro:bit off" card: the actions
             are a sequence, and rule 135 says a sequence is a numbered list, not
             prose; and she cannot be expected to find a small black button on the
             back of a board she has only ever seen from the front, so the card
             shows her exactly where it is (rule 138.2 - shown, not just named).
             Both are optional, so every existing step is unchanged. */
          (st.lines && st.lines.length
            ? '<ol class="step-lines">' + st.lines.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>'
            : '') +
          (st.img
            ? '<figure class="step-fig"><img class="step-img" src="' + esc(asset(st.img)) + '" alt="' + esc(st.imgAlt || '') + '">' +
              (st.imgCap ? '<figcaption>' + esc(st.imgCap) + '</figcaption>' : '') + '</figure>'
            : '') +
          /* a downloadable file the step needs her to fetch (the blank program
             that clears her micro:bit for the next class, 8 Aug 2026) */
          (st.link && st.link.href
            ? '<p class="step-linkrow"><a class="ghost-btn step-link" href="' + esc(asset(st.link.href)) +
              '" target="_blank" rel="noopener" download>' + esc(st.link.label || 'Download') + ' &#8595;</a></p>'
            : '') +
          (st.note ? '<p class="step-note">' + esc(st.note) + '</p>' : '') +
          (st.clip && st.clip.src ? '<p class="step-cliprow"><button class="ghost-btn step-clip-btn" type="button">&#127909; ' + esc(st.clip.label || 'Show me how') + '</button></p>' : '') +
          '<div class="step-action"></div></div>');
        host.innerHTML = '';
        host.appendChild(c);
        wireClip(c, st);
        var action = c.querySelector('.step-action');
        if (st.sim === 'username') {
          action.innerHTML = '<div class="sim-login"><label>Practice console</label>' +
            '<input class="text-input sim-user" maxlength="40" autocomplete="off" spellcheck="false" placeholder="type your username here">' +
            '<p class="sim-msg"></p><button class="primary-btn" type="button">Check it</button></div>';
          var input = action.querySelector('input'), msg = action.querySelector('.sim-msg');
          App.armButton(action.querySelector('button'), function () {   // DFM 104
            var v = input.value;
            if (!v.trim()) { msg.textContent = 'Nothing typed yet — give it a go.'; return; }
            if (/\s/.test(v.trim())) { msg.textContent = 'Sneaky SPACE spotted — usernames never have spaces. Try again.'; return; }
            if (v === v.toUpperCase() && /[A-Z]/.test(v)) { msg.textContent = 'ALL CAPITALS? Check Caps Lock isn’t on — usernames are lowercase. Try again.'; return; }
            msg.textContent = '';
            input.disabled = true;
            action.querySelector('button').disabled = true;
            c.insertAdjacentHTML('beforeend', '<p class="step-done">&#10003; Smooth typing, Agent.</p>');
            setTimeout(function () { i++; showStep(); }, 900);
          }, { repeat: true });   // a failed check must allow another go
          input.value = '';
        } else {
          action.innerHTML = '<button class="confirm-step" type="button"><span class="confirm-box"></span>' + esc(st.confirm || 'Done') + '</button>';
          /* DFM 104: this is the confirm Damien watched fire the NEXT card's
             button as well - the two sit at the same place on screen. */
          App.armButton(action.querySelector('button'), function () {
            action.querySelector('button').classList.add('ticked');
            setTimeout(function () { i++; showStep(); }, 550);
          });
        }
      }

      function rulesCheck() {
        host.innerHTML = '';
        if (!cfg.items || !cfg.items.length) { finishChunk(ctx); return; }
        introCard(host, { kicker: 'Nearly there', title: 'Check you have it', text: cfg.itemsIntro || '' }, 'Go', function () {
          itemRunner(host, {
            items: cfg.items, mode: 'feedback',
            markFn: function (it, ii) { return ctx.markItem(it.id, ii); },
            onDone: function (res) { finishChunk(ctx, 'rules=' + res.right + '/' + res.total); }
          });
        });
      }
    }
  };

  /* ================= tour (mini mission board + spotlight) ================= */
  Engines.tour = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      introCard(host, { kicker: chunk.title, title: 'Learn your way around', text: cfg.intro || '' }, 'Follow the light', startTour);

      function startTour() {
        var stage = el('<div class="tour-stage">' +
          '<div class="tour-board">' +
          '  <div class="tour-chip" data-t="progress"><span>Agent You</span><span class="tour-xp">45 XP</span></div>' +
          '  <div class="tour-tiles" data-t="grid">' +
          '    <div class="tile mini is-done"><span class="tile-icon">🛰️</span><span class="tile-title">Mission Control</span><span class="tile-state done">&#10003;</span></div>' +
          '    <div class="tile mini is-open"><span class="tile-icon">⚡</span><span class="tile-title">Make It Move</span><span class="tile-state open">Ready</span></div>' +
          '    <div class="tile mini is-locked" data-t="locks"><span class="tile-icon">🎯</span><span class="tile-title">Scoreboard Engineer</span><span class="tile-state lock">&#128274;</span></div>' +
          '  </div>' +
          '  <div class="tour-beacon" data-t="help">?</div>' +
          '</div>' +
          '<div class="tour-callout"><h3></h3><p></p><button class="primary-btn" type="button">Next</button></div>' +
          '</div>');
        host.appendChild(stage);
        var si = 0;
        var callout = stage.querySelector('.tour-callout');
        function showStop() {
          stage.querySelectorAll('.tour-spot').forEach(function (n) { n.classList.remove('tour-spot'); });
          if (si >= cfg.stops.length) { stage.remove(); rulesCheck(); return; }
          var stop = cfg.stops[si];
          var target = stage.querySelector('[data-t="' + stop.target + '"]') || stage.querySelector('.tour-tiles');
          target.classList.add('tour-spot');
          callout.querySelector('h3').textContent = stop.title;
          callout.querySelector('p').textContent = stop.text;
          callout.querySelector('button').textContent = si === cfg.stops.length - 1 ? 'Got it' : 'Next';
          /* DFM 104: the button stays put while the words under it change, so
             re-arm on every stop - a fresh guard window per stop is the point. */
          App.armButton(callout.querySelector('button'), function () { si++; showStop(); });
        }
        showStop();
      }

      function rulesCheck() {
        introCard(host, { kicker: 'Nearly there', title: 'Quick check', text: cfg.itemsIntro || '' }, 'Go', function () {
          itemRunner(host, {
            items: cfg.items, mode: 'feedback',
            markFn: function (it, i) { return ctx.markItem(it.id, i); },
            onDone: function (res) { finishChunk(ctx, 'nav=' + res.right + '/' + res.total); }
          });
        });
      }
    }
  };

  /* ================= vault (drag-drop filing, genuine fail state) ========== */
  Engines.vault = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var keyId = (cfg && cfg.keyId) || 'vault';
      var salt = null, check = null;
      // Fetch the SALTED placement hashes once at mount (never the plaintext map).
      ctx.call('vaultInfo', { lessonId: ctx.lesson.id, keyId: keyId }).then(function (r) {
        if (r && r.ok) { salt = r.salt; check = r.check; }
      });
      // Crew resolution (section 12): 'social' = auto-pairing off (one machine,
      // original prompts), 'solo' = catch-up/review/teacher release/last agent,
      // 'paired' = live pair or trio over the Comms Channel.
      var autoPair = !!(cfg.paired) && !ctx.catchup && !ctx.review && Number(App.state.pairing) !== 0;
      var mode = 'social';
      // Catch-up runs are SOLO by definition — swap the pair prompts out so an
      // absent pupil is never told to confer with a partner who isn't there.
      var pairBanner = ctx.catchup
        ? '<div class="pair-banner">&#127919; Catch-up solo mission: no partner needed. Before each drop, say your reason in your head — "it goes there because&hellip;"</div>'
        : autoPair
          ? '<div class="pair-banner">&#128225; ' + esc(cfg.channelPrompt || cfg.pairPrompt || '') + '</div>'
          : '<div class="pair-banner">&#129309; ' + esc(cfg.pairPrompt || '') + '</div>';
      introCard(host, {
        kicker: chunk.title, title: 'The Vault',
        text: cfg.intro || '',
        extra: pairBanner
      }, 'Open the Vault', gate);

      function gate() {
        if (!autoPair) { mode = (ctx.catchup || ctx.review) ? 'solo' : 'social'; begin(); return; }
        PairKit.ensure(ctx, host, function (m) { mode = m; begin(); });
      }

      function begin() {
        if (!check) { // hashes still loading: brief gold pulse, then retry
          host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Opening the Vault&hellip; this can take a moment</span></div>';
          var tries = 0;
          var t = setInterval(function () {
            tries++;
            if (check) { clearInterval(t); host.innerHTML = ''; begin(); }
            else if (tries > 40) {
              clearInterval(t);
              ctx.call('vaultInfo', { lessonId: ctx.lesson.id, keyId: keyId }).then(function (r) {
                if (r && r.ok) { salt = r.salt; check = r.check; host.innerHTML = ''; begin(); }
                else host.innerHTML = '<div class="card"><p>The Vault door is stuck. Ask your teacher, then try again.</p></div>';
              });
            }
          }, 250);
          return;
        }
        var placed = {}, firstTryRight = 0, attempts = {};
        var seenDrop = {};   // "fileId|attempt" - applies each shared drop exactly once
        var dropCount = 0;   // shared attempt counter - drives the turn rotation
        var finished = false;
        var dock = null;
        var pst = PairKit.st;
        var slimBanner =
          ctx.catchup ? '&#127919; Solo run &mdash; reason each drop out in your head first.' :
          mode === 'solo' ? '&#127919; Solo run cleared by HQ &mdash; reason each drop out in your head first.' :
          mode === 'paired' ? '&#128225; Agree in the channel first &mdash; then whoever is at the controls releases the file.' :
          '&#129309; Agree together before you release each file.';
        /* DFM 103 (1 Aug 2026). Everything on this screen named the PARTNER -
           the turn banner, the toast, the channel bubbles - and nothing ever
           told a pupil her OWN call sign, so "Agent Copper Heron is at the
           controls" was half a sentence and the reveal at the end landed
           sideways. His wording direction, verbatim. Shown whenever she has a
           call sign at all: pair, trio, and the released-solo run that keeps
           one. */
        var myCn = (pst && pst.members && pst.members[Number(pst.mi)]) ? String(pst.members[Number(pst.mi)]) : '';
        var meLine = myCn
          ? '<div class="vault-me">In this activity, your secret identity codename is ' +
            '<b>Agent ' + esc(myCn) + '</b></div>'
          : '';
        var stage = el('<div class="vault-stage">' +
          meLine +
          '<div class="pair-banner slim">' + slimBanner + '</div>' +
          '<div class="vault-score">' + esc(cfg.scoreLabel || 'Vault Integrity') + ': <b id="vault-score">&mdash;</b></div>' +
          '<div class="vault-inbox"><h3>Inbox</h3><div class="vault-tray"></div></div>' +
          '<div class="vault-folders"></div>' +
          '</div>');
        if (mode === 'paired') {
          var wrap = el('<div class="vault-wrap paired"><div class="vault-side"></div></div>');
          wrap.insertBefore(stage, wrap.firstChild);
          host.appendChild(wrap);
          dock = PairKit.dock(wrap.querySelector('.vault-side'), ctx);
        } else host.appendChild(stage);
        var tray = stage.querySelector('.vault-tray');
        var foldersBox = stage.querySelector('.vault-folders');
        cfg.folders.forEach(function (f) {
          foldersBox.insertAdjacentHTML('beforeend',
            '<div class="vault-folder" data-id="' + esc(f.id) + '" style="--fc:' + esc(f.color) + '">' +
            '<div class="folder-tab"></div><div class="folder-label">' + esc(f.label) + '</div><div class="folder-files"></div></div>');
        });
        cfg.files.forEach(function (f) { tray.appendChild(fileCard(f)); });

        function fileCard(f) {
          var c = el('<div class="vault-file" data-id="' + esc(f.id) + '">' +
            '<span class="vf-icon">' + esc(f.icon) + '</span><span class="vf-label">' + esc(f.label) + '</span></div>');
          makeDraggable(c, f);
          return c;
        }

        /* Lag-free pointer drag: transform only, no transition while dragging. */
        function makeDraggable(node, f) {
          var startX, startY, dx, dy, dragging = false;
          node.addEventListener('pointerdown', function (e) {
            if (placed[f.id]) return;
            if (mode === 'paired' && !myTurn()) {
              App.toast('Not your drop — Agent ' + driverCn() + ' is at the controls.');
              return;
            }
            dragging = true;
            node.setPointerCapture(e.pointerId);
            node.classList.add('dragging');
            startX = e.clientX; startY = e.clientY; dx = 0; dy = 0;
          });
          node.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            dx = e.clientX - startX; dy = e.clientY - startY;
            node.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0) scale(1.06)';
            hoverFolder(e.clientX, e.clientY);
          });
          node.addEventListener('pointerup', function (e) {
            if (!dragging) return;
            dragging = false;
            node.classList.remove('dragging');
            var folder = folderAt(e.clientX, e.clientY);
            clearHover();
            if (folder) drop(node, f, folder);
            else snapBack(node);
          });
          node.addEventListener('pointercancel', function () {
            dragging = false; node.classList.remove('dragging'); snapBack(node); clearHover();
          });
        }
        function folderAt(x, y) {
          var els = document.elementsFromPoint(x, y);
          for (var i = 0; i < els.length; i++) {
            var fo = els[i].closest && els[i].closest('.vault-folder');
            if (fo) return fo;
          }
          return null;
        }
        function hoverFolder(x, y) {
          clearHover();
          var fo = folderAt(x, y);
          if (fo) fo.classList.add('hover');
        }
        function clearHover() {
          stage.querySelectorAll('.vault-folder.hover').forEach(function (n) { n.classList.remove('hover'); });
        }
        function snapBack(node) {
          node.classList.add('snapback');
          node.style.transform = '';
          setTimeout(function () { node.classList.remove('snapback'); }, 300);
        }
        /* ---- turn rotation (paired): the controls change hands every ATTEMPT,
           round-robin among members whose channel signal is live, so both (or
           all three) hands touch the mouse and a wrong drop forces a handover
           and a real conversation. All clients derive the same driver from the
           shared drop count. ---- */
        function activeIdxs() {
          var act = [];
          for (var i = 0; i < pst.members.length; i++) {
            if (i === pst.mi || Number((pst.live || [])[i])) act.push(i);
          }
          return act.length ? act : [pst.mi];
        }
        function driverIdx() { var act = activeIdxs(); return act[dropCount % act.length]; }
        function myTurn() { return mode !== 'paired' || driverIdx() === pst.mi; }
        function driverCn() { return String(pst.members[driverIdx()] || '?'); }
        var lastLiveKey = '';
        function refreshTurn() {
          if (mode !== 'paired' || !dock || finished) return;
          stage.classList.toggle('not-my-turn', !myTurn());
          if (myTurn()) dock.setTurn('&#127918; YOU are at the controls &mdash; agree in the channel, then drag.', true);
          else dock.setTurn('&#128360; Agent ' + esc(driverCn()) + ' is at the controls &mdash; advise in the channel.', false);
          var key = (pst.live || []).join('');
          if (lastLiveKey && key !== lastLiveKey) {
            for (var i = 0; i < pst.members.length; i++) {
              if (i === pst.mi) continue;
              var was = lastLiveKey.charAt(i) === '1', is = key.charAt(i) === '1';
              if (was && !is) dock.sys('&#128246; Agent ' + esc(pst.members[i]) + '’s signal is weak &mdash; the controls pass on.');
              if (!was && is) dock.sys('Agent ' + esc(pst.members[i]) + ' is back on the channel.');
            }
          }
          lastLiveKey = key;
        }

        /* Apply one shared drop exactly once - locally-made or replayed from the
           channel. Score, rotation and completion all derive from this stream,
           so every member's screen and XP arithmetic agree.
           byMi = member index of the dropper, or null for a local drop. */
        function applyShared(fileId, folderId, ok, att, byMi) {
          var dk = fileId + '|' + att;
          if (seenDrop[dk]) return;
          seenDrop[dk] = 1;
          dropCount++;
          attempts[fileId] = Math.max(num(attempts[fileId]), att);
          var node = stage.querySelector('.vault-file[data-id="' + fileId + '"]');
          var folderEl = stage.querySelector('.vault-folder[data-id="' + folderId + '"]');
          var f = null;
          for (var i = 0; i < cfg.files.length; i++) if (String(cfg.files[i].id) === fileId) f = cfg.files[i];
          var who = byMi == null ? 'You' : 'Agent ' + String(pst.members[byMi] || '?');
          if (ok) {
            if (!placed[fileId]) {
              placed[fileId] = true;
              if (att === 1) firstTryRight++;
              if (node && folderEl) {
                node.style.transform = '';
                node.classList.add('filed');
                folderEl.querySelector('.folder-files').appendChild(node);
                folderEl.classList.add('accept');
                setTimeout(function () { folderEl.classList.remove('accept'); }, 500);
              }
            }
            updateScore();
            if (dock && f) dock.sys('&#128193; ' + esc(who) + ' filed “' + esc(f.label) + '”' + (att > 1 ? ' (attempt ' + att + ')' : '') + '.');
            if (Object.keys(placed).length === cfg.files.length) finishStage();
          } else {
            if (folderEl) {
              folderEl.classList.add('reject');
              setTimeout(function () { folderEl.classList.remove('reject'); }, 450);
            }
            if (node) {
              node.style.transform = '';
              node.classList.add('returned');
              setTimeout(function () { node.classList.remove('returned'); }, 700);
            }
            if (byMi == null) App.toast('Returned — the Vault disagrees. Talk it through and try again.');
            if (dock && f) dock.sys('&#8617;&#65039; The Vault returned “' + esc(f.label) + '” &mdash; talk it through, the controls change hands.');
          }
          refreshTurn();
        }
        function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }

        function drop(node, f, folderEl) {
          var fid = folderEl.getAttribute('data-id');
          var att = num(attempts[f.id]) + 1;
          var ok = vhash(salt + '|' + f.id + '|' + fid) === check[f.id];
          if (mode === 'paired') PairKit.send(ctx, 'drop', f.id + '|' + fid + '|' + (ok ? 1 : 0) + '|' + att);
          applyShared(String(f.id), fid, ok, att, null);
        }

        function finishStage() {
          if (finished) return;
          finished = true;
          if (mode === 'paired') {
            stage.classList.remove('not-my-turn');
            if (dock) dock.setTurn('&#128274; Vault sealed &mdash; stand by for the debrief.', true);
            PairKit.send(ctx, 'done', '');
            setTimeout(function () {
              PairKit.complete(ctx).then(function () {
                // C-11: if the channel was dissolved in this exact window there
                // is nobody left to declassify - never show an empty reveal
                if (PairKit.st) PairKit.revealCard(function () { PairKit.stop(); debrief(); });
                else { PairKit.stop(); debrief(); }
              });
            }, 700);
          } else setTimeout(debrief, 700);
        }

        function updateScore() {
          stage.querySelector('#vault-score').textContent = firstTryRight + '/' + cfg.files.length + ' first try';
        }

        function debrief() {
          var xp = 12 + firstTryRight * 3;
          // Record the placement result FIRST ('vp' key, no XP), which unlocks
          // the explanations server-side; explains are never sent pre-attempt.
          host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Sealing the Vault&hellip;</span></div>';
          var pre = ctx.review ? Promise.resolve({ ok: true })
            : ctx.saveEvent({ detail: 'vp=' + firstTryRight + '/' + cfg.files.length });
          pre.then(function () {
            return ctx.call('vaultInfo', { lessonId: ctx.lesson.id, keyId: keyId, mode: 'explain' });
          }).then(function (er) {
            var explains = (er && er.ok && er.explain) || {};
            renderDebrief(explains, xp);
          });
        }

        function renderDebrief(explains, xp) {
          var why = cfg.files.map(function (f) {
            return '<li><span class="vf-icon">' + esc(f.icon) + '</span> ' + esc(explains[f.id] || '') + '</li>';
          }).join('');
          host.innerHTML = '';
          var d = el('<div class="card debrief-card">' +
            '<h2>Vault secured &middot; ' + esc(cfg.scoreLabel || 'Vault Integrity') + ': ' + firstTryRight + '/' + cfg.files.length + '</h2>' +
            '<ul class="vault-why">' + why + '</ul>' +
            '<button class="primary-btn" type="button">One more thing&hellip;</button></div>');
          host.appendChild(d);
          d.querySelector('button').onclick = function () {
            host.innerHTML = '';
            // the debrief must narrate what ACTUALLY happened this run:
            // a live channel pair, a one-machine pair, or a solo mission
            var syncText =
              (ctx.catchup && cfg.debrief.syncCatchup) ? cfg.debrief.syncCatchup :
              (mode === 'paired' && cfg.debrief.syncLive) ? cfg.debrief.syncLive :
              (mode === 'solo' && cfg.debrief.syncCatchup) ? cfg.debrief.syncCatchup :
              cfg.debrief.sync;
            var s1 = el('<div class="card sync-card"><span class="sync-badge">SYNCHRONOUS</span><p>' + esc(syncText) + '</p><button class="primary-btn" type="button">And the flip side&hellip;</button></div>');
            host.appendChild(s1);
            s1.querySelector('button').onclick = function () {
              host.innerHTML = '';
              var s2 = el('<div class="card sync-card async"><span class="sync-badge">ASYNCHRONOUS</span><p>' + esc(cfg.debrief.async) + '</p><button class="primary-btn" type="button">Claim the badge</button></div>');
              host.appendChild(s2);
              s2.querySelector('button').onclick = function () {
                var badge = Object.assign({}, ctx.chunk.badge, { xp: xp });
                ctx.awardBadge(badge, 'vault=' + firstTryRight + '/' + cfg.files.length).then(function () { ctx.next(); });
              };
            };
          };
        }
        if (mode === 'paired') {
          // replay + live application of the shared stream; a partner's 'done'
          // is belt-and-braces (their final drop event already completes us)
          PairKit.onEvent(function (e) {
            var kind = String(e[2]);
            if (kind === 'drop') {
              var p = String(e[3]).split('|');
              applyShared(String(p[0]), String(p[1]), Number(p[2]) === 1, Number(p[3]), Number(e[1]));
            } else if (kind === 'done' && Object.keys(placed).length === cfg.files.length) finishStage();
          });
          PairKit.onPoll(refreshTurn);
          /* AUDIT FIX C-11: the teacher dissolved this pair (Reset pairing).
             Drop the channel and finish the Vault solo, in place: every file
             already filed stays filed, the turn lock lifts, and nothing needs a
             reload - which was the old bug's only escape route. */
          PairKit.onEnd(function () {
            if (finished) return;              // already sealed; the debrief owns the screen
            mode = 'solo';
            dock = null;
            var side = host.querySelector('.vault-side');
            if (side) side.remove();
            var wrapEl = host.querySelector('.vault-wrap');
            if (wrapEl) wrapEl.classList.remove('paired');
            stage.classList.remove('not-my-turn');
            var slim = stage.querySelector('.pair-banner.slim');
            if (slim) slim.innerHTML = '&#127919; HQ closed the channel &mdash; finish the Vault on your own. Everything you have filed is safe.';
            App.toast('HQ closed the channel &mdash; carry on solo, nothing is lost.', 4200);
          });
          refreshTurn();
        }
        updateScore();
      }
    }
  };

  /* ================= diagnostic (baseline: neutral ack, never marked) ====== */
  Engines.diagnostic = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      introCard(host, {
        kicker: chunk.title, title: 'The Licence Exam',
        text: cfg.intro || '',
        extra: cfg.solo ? '<div class="solo-banner">&#129323; Solo mission — your own answers only.</div>' : ''
      }, 'Open my Agent File', function () {
        itemRunner(host, {
          items: cfg.items, mode: 'neutral', ackText: cfg.ackText || 'Logged',
          onDone: function (res) {
            host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Sealing your Agent File&hellip;</span></div>';
            var payload = { lessonId: ctx.lesson.id, answers: res.answers };
            // review mode: never overwrite the original baseline record
            var submit = ctx.review ? Promise.resolve({ ok: true }) : ctx.call('submitBaseline', payload);
            submit.then(function (r) {
              if (!ctx.review && (!r || !r.ok)) App.enqueue('submitBaseline', payload);
              host.innerHTML = '';
              var seal = el('<div class="card seal-card"><div class="seal">&#128736;</div>' +
                '<h2>Agent File sealed</h2><p>Sixteen answers, logged for the record. At the end of the year you’ll open this file again — and see how far you’ve come.</p>' +
                '<button class="primary-btn" type="button">Claim the badge</button></div>');
              host.appendChild(seal);
              seal.querySelector('button').onclick = function () { finishChunk(ctx, undefined); };
            });
          }
        });
      });
    }
  };

  /* ================= codename (picker + oath + belonging) ================= */
  Engines.codename = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var current = pickName();
      function pickName() {
        var a = cfg.adjectives[Math.floor(Math.random() * cfg.adjectives.length)];
        var n = cfg.nouns[Math.floor(Math.random() * cfg.nouns.length)];
        return a + ' ' + n;
      }
      introCard(host, { kicker: chunk.title, title: 'Choose your codename', text: cfg.intro || '' }, 'Show me', picker);

      function picker() {
        var c = el('<div class="card codename-card">' +
          '<p class="codename-label">Your codename</p>' +
          '<div class="codename-display">Agent <b id="cn-name"></b></div>' +
          '<div class="codename-actions">' +
          '<button class="ghost-btn" id="cn-shuffle" type="button">&#127922; Shuffle</button>' +
          '<button class="primary-btn" id="cn-keep" type="button">Keep this name</button>' +
          '</div></div>');
        host.appendChild(c);
        var nameEl = c.querySelector('#cn-name');
        nameEl.textContent = current;
        c.querySelector('#cn-shuffle').onclick = function () {
          var spins = 7;
          var t = setInterval(function () {
            current = pickName();
            nameEl.textContent = current;
            if (--spins <= 0) clearInterval(t);
          }, 70);
        };
        c.querySelector('#cn-keep').onclick = function () { host.innerHTML = ''; oath(); };
      }

      function oath() {
        var c = el('<div class="card oath-card"><h2>The Agent Oath</h2><div class="oath-lines"></div>' +
          '<button class="oath-sign" type="button" disabled><span class="oath-ring"></span>Hold to sign as Agent ' + esc(current) + '</button></div>');
        host.appendChild(c);
        var box = c.querySelector('.oath-lines');
        var signBtn = c.querySelector('.oath-sign');
        (cfg.oath || []).forEach(function (l, i) {
          setTimeout(function () {
            var p = document.createElement('p');
            p.className = 'oath-line'; p.textContent = l;
            box.appendChild(p);
            requestAnimationFrame(function () { p.classList.add('show'); });
            if (i === cfg.oath.length - 1) signBtn.disabled = false;
          }, 700 * i);
        });
        var holdTimer = null;
        /* DAMIEN, 3 Aug 2026: "in the card that begins 'one last thing, before
           you go' ... when the text was loading, after a split second it
           started loading again from the start."
           Cause, reproduced: signing never took the button out of service. It
           kept its pointerdown listener and was never disabled, so a second
           press after signing started a SECOND hold, which 1200ms later ran
           `host.innerHTML = ''; belonging()` a second time - wiping the card
           mid-reveal and restarting the lines. Rule 104's family: one gesture
           must arm exactly one transition. */
        var signed = false;
        function startHold() {
          if (signBtn.disabled || signed) return;
          signBtn.classList.add('holding');
          holdTimer = setTimeout(function () {
            signed = true;
            signBtn.disabled = true;
            signBtn.classList.add('signed');
            signBtn.textContent = 'Signed — Agent ' + current;
            setTimeout(function () { host.innerHTML = ''; belonging(); }, 800);
          }, 1200);
        }
        function endHold() {
          signBtn.classList.remove('holding');
          clearTimeout(holdTimer);
        }
        // pointer events cover mouse AND touch (tap-and-hold on tablets);
        // pointercancel matters there — a stray scroll/rotate mustn't leave the
        // ring stuck; contextmenu is suppressed so a long-press can't interrupt.
        signBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); startHold(); });
        signBtn.addEventListener('pointerup', endHold);
        signBtn.addEventListener('pointerleave', endHold);
        signBtn.addEventListener('pointercancel', endHold);
        signBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      }

      var belongingShown = false;
      function belonging() {
        if (belongingShown) return;   // second guard: this card reveals ONCE
        belongingShown = true;
        var b = cfg.belonging || {};
        var c = el('<div class="card belonging-card"><span class="belonging-kicker">' + esc(b.title || '') + '</span><div class="belonging-lines"></div>' +
          '<button class="primary-btn" type="button" hidden>Claim the final badge</button></div>');
        host.appendChild(c);
        var box = c.querySelector('.belonging-lines');
        var btn = c.querySelector('button');
        (b.lines || []).forEach(function (l, i) {
          setTimeout(function () {
            var p = document.createElement('p');
            p.className = 'belonging-line'; p.textContent = l;
            box.appendChild(p);
            requestAnimationFrame(function () { p.classList.add('show'); });
            if (i === b.lines.length - 1) btn.hidden = false;
          }, 1100 * i);
        });
        btn.onclick = function () {
          ctx.saveEvent({ codename: current });
          finishChunk(ctx, 'cn=' + current);
        };
      }
    }
  };

  /* ================= drivecheck (side quest: HQ inspects the REAL Drive) ==
     Genuine consequence: the badge is only claimable after the server has
     actually found the folders in the pupil's own Google Drive. In preview
     the FakeServer simulates a pass and says so on screen. */
  Engines.drivecheck = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      introCard(host, { kicker: chunk.title, title: 'HQ Inspection', text: cfg.intro || '' }, 'Run the inspection', run);

      function run() {
        host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>HQ is looking inside your Drive&hellip;</span></div>';
        ctx.call('driveCheck', { lessonNum: String(ctx.lessonEntry.num) }).then(function (r) {
          host.innerHTML = '';
          if (!r || !r.ok) {
            var errC = el('<div class="card"><h2>The inspection could not run</h2><p>' +
              (r && r.error === 'locked' ? 'This side quest is not unlocked for your class yet — check with your teacher.'
                : 'The line to HQ dropped. Nothing is lost — try again in a moment.') +
              '</p><button class="primary-btn" type="button">Try again</button></div>');
            host.appendChild(errC);
            errC.querySelector('button').onclick = function () { host.innerHTML = ''; run(); };
            return;
          }
          var results = { school: !!r.school, dtwork: !!r.dtwork };
          var pass = results.school && results.dtwork;
          var rows = (cfg.checks || []).map(function (c) {
            var okc = !!results[c.id];
            return '<li class="dc-row ' + (okc ? 'ok' : 'miss') + '"><span class="dc-mark">' + (okc ? '&#10003;' : '&#10007;') + '</span><span>' + esc(c.label) + '</span></li>';
          }).join('');
          var c2 = el('<div class="card dc-card"><h2>' + (pass ? 'Inspection passed' : 'Not quite there yet') + '</h2>' +
            (r.simulated ? '<p class="dc-sim">(Preview mode: this inspection is simulated — the live platform checks your real Drive.)</p>' : '') +
            '<ul class="dc-list">' + rows + '</ul>' +
            '<p>' + esc(pass ? (cfg.passText || '') : (cfg.failText || '')) + '</p>' +
            '<button class="primary-btn" type="button">' + (pass ? 'Claim the badge' : 'Run the inspection again') + '</button></div>');
          host.appendChild(c2);
          c2.querySelector('button').onclick = pass
            ? function () { finishChunk(ctx, 'sqdrive=pass'); }
            : function () { host.innerHTML = ''; run(); };
        });
      }
    }
  };

  /* ================= recap (Do-Now engine, lessons 2+) ================= */
  Engines.recap = {
    mount: function (host, chunk, ctx) {
      if (ctx.review) { ctx.next(); return; } // a re-read never re-records recap data
      host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Warming up your brain&hellip;</span></div>';
      ctx.call('recapStart', { lessonNum: String(ctx.lessonEntry.num) }).then(function (r) {
        host.innerHTML = '';
        if (!r || !r.ok || !r.items || !r.items.length) { ctx.next(); return; }
        introCard(host, {
          kicker: 'Do-Now', title: 'While everyone logs in…',
          text: 'A quick brain warm-up from past lessons. Answer each one, see why, move on. Never graded, never public.'
        }, 'Warm up', function () {
          itemRunner(host, {
            items: r.items, mode: 'feedback',
            markFn: function (it, i) {
              /* rule 97: the verdict renders instantly from the answers that rode
                 along with recapStart; the recording write still goes to the
                 server, fire-and-forget. Deliberately NOT queued for retry - the
                 recap tallies increment on the server, so a blind retry could
                 count one answer twice. A lost blip costs one tally, never the
                 verdict. */
              var send = ctx.call('recapAnswer', { lessonNum: String(ctx.lessonEntry.num), itemId: it.id, choice: i });
              if (it.a != null && Number(it.a) >= 0) {
                return Promise.resolve({ ok: true, correct: Number(i) === Number(it.a),
                  correctIdx: Number(it.a), explain: String(it.explain || ''), local: 1 });
              }
              return send;
            },
            onDone: function (res) {
              host.innerHTML = ''; // replace the last item card - the done card must never hide below the fold
              var c = el('<div class="card recap-done"><h2>Brain warmed up</h2><p class="recap-score">' + res.right + ' of ' + res.total + '</p>' +
                '<p>' + (res.right === res.total ? 'Perfect recall.' : 'The ones you missed will come back around — that’s how remembering works.') + '</p>' +
                '<button class="primary-btn" type="button">Start today’s lesson</button></div>');
              host.appendChild(c);
              c.querySelector('button').onclick = function () { ctx.next(); };
            }
          });
        });
      });
    }
  };

  /* ================= exit check + self-eval ================= */
  Engines.exitcheck = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      introCard(host, { kicker: 'Exit check', title: 'Before you clock off…', text: cfg.intro || '' }, 'Ready', function () {
        itemRunner(host, {
          items: cfg.items, mode: 'collect',
          onDone: function (res) {
            App.state._exitAnswers = cfg.items.map(function (it) { return res.answers[it.id]; });
            App.state._exitItems = cfg.items;
            // survive a refresh between exit check and self-eval
            if (!ctx.review) {
              App.state.draft = App.state.draft || {};
              App.state.draft.exitAnswers = App.state._exitAnswers;
              ctx.saveEvent({ draft: App.state.draft });
            }
            ctx.next();
          }
        });
      });
    }
  };

  /* The private comment's one true length. The servers slice to this same
     number (Code.gs.template / dev-server.js); qa-comment-limit.js asserts all
     three agree, because a limit that lives in two places is a contract. */
  var SE_COMMENT_MAX = 60;

  Engines.selfeval = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var conf = [], diff = '';
      var c = el('<div class="card se-card"><h2>How did it go?</h2><div class="se-rows"></div>' +
        (cfg.difficulty ? '<div class="se-diff"><p>How did today feel?</p><div class="se-diff-chips">' +
          '<button class="se-chip" data-d="0" type="button">&#128994; Easy</button>' +
          '<button class="se-chip" data-d="1" type="button">&#128993; Just right</button>' +
          '<button class="se-chip" data-d="2" type="button">&#128308; Tricky</button></div></div>' : '') +
        /* DAMIEN, 8 Aug 2026 (DFM 157a). This box used to accept 80 characters
           while BOTH servers stored only the first 60 (slice(0, 60)) - so a
           pupil who filled it silently lost a fifth of what she wrote, on the
           one screen that promises her words reach her teacher. The box now
           tells the truth, and the countdown means she can see the limit
           coming instead of meeting it invisibly. */
        (cfg.comment ? '<textarea class="se-comment" maxlength="' + SE_COMMENT_MAX + '" placeholder="Anything you want your teacher to know? (optional)"></textarea>' +
          '<p class="se-count" aria-live="polite"></p>' : '') +
        '<button class="primary-btn se-submit" type="button" disabled>Send &amp; finish</button></div>');
      host.appendChild(c);
      var rows = c.querySelector('.se-rows');
      cfg.statements.forEach(function (st, i) {
        conf.push(null);
        rows.insertAdjacentHTML('beforeend', '<div class="se-row"><p>' + esc(st) + '</p><div class="se-chips" data-row="' + i + '">' +
          '<button class="se-chip" data-v="2" type="button">&#10003; I can</button>' +
          '<button class="se-chip" data-v="1" type="button">&#8776; Getting there</button>' +
          '<button class="se-chip" data-v="0" type="button">&#10007; Not yet</button></div></div>');
      });
      var commentBox = c.querySelector('.se-comment');
      if (commentBox) {
        var countEl = c.querySelector('.se-count');
        var showCount = function () {
          var left = SE_COMMENT_MAX - commentBox.value.length;
          if (left <= 0) {
            countEl.textContent = 'The box is full — 0 characters left.';
            countEl.classList.add('is-full');
          } else {
            countEl.textContent = left + ' characters left';
            countEl.classList.remove('is-full');
          }
        };
        commentBox.addEventListener('input', showCount);
        showCount();
      }
      c.addEventListener('click', function (e) {
        var chip = e.target.closest('.se-chip');
        if (!chip) return;
        var row = chip.closest('.se-chips');
        if (row) {
          row.querySelectorAll('.se-chip').forEach(function (x) { x.classList.remove('on'); });
          chip.classList.add('on');
          conf[Number(row.getAttribute('data-row'))] = chip.getAttribute('data-v');
        } else if (chip.getAttribute('data-d') != null) {
          c.querySelectorAll('.se-diff-chips .se-chip').forEach(function (x) { x.classList.remove('on'); });
          chip.classList.add('on');
          diff = chip.getAttribute('data-d');
        }
        var all = conf.every(function (v) { return v !== null; }) && (!cfg.difficulty || diff !== '');
        c.querySelector('.se-submit').disabled = !all;
      });
      c.querySelector('.se-submit').onclick = function () {
        if (ctx.review) {
          host.innerHTML = '';
          var rv = el('<div class="card"><h2>Already filed</h2><p>This mission report went to your teacher the first time — a review visit never overwrites it.</p>' +
            '<button class="primary-btn" type="button">Finish reviewing</button></div>');
          host.appendChild(rv);
          rv.querySelector('button').onclick = function () { ctx.next(); };
          return;
        }
        var commentEl = c.querySelector('.se-comment');
        var payload = {
          answers: App.state._exitAnswers || (App.state.draft && App.state.draft.exitAnswers) || [],
          selfEval: { conf: conf.join(''), diff: diff, comment: commentEl ? commentEl.value.trim() : '' }
        };
        host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Filing your report&hellip; this can take a moment</span></div>';
        App.submitExit(payload, function (r) {
          host.innerHTML = '';
          if (!r) {
            var safe = el('<div class="card"><h2>Report saved on this machine</h2><p>Your connection is playing up, so your answers are safe here and will send automatically. Mission complete.</p>' +
              '<button class="primary-btn" type="button">Finish</button></div>');
            host.appendChild(safe);
            safe.querySelector('button').onclick = function () { ctx.next(); };
            return;
          }
          var items = App.state._exitItems || [];
          var fbHtml = (r.feedback || []).map(function (f, i) {
            var it = items[i] || { stem: '', options: [] };
            return '<div class="exit-fb ' + (f.correct ? 'good' : 'bad') + '">' +
              '<p class="exit-fb-verdict">' + (f.correct ? '&#10003; Correct' : '&#10007; Not quite') + '</p>' +
              (!f.correct && it.options[f.correctIdx] ? '<p class="exit-fb-ans">The answer: ' + esc(it.options[f.correctIdx]) + '</p>' : '') +
              (f.explain ? '<p class="exit-fb-why">' + esc(f.explain) + '</p>' : '') + '</div>';
          }).join('');
          var done = el('<div class="card exit-done"><h2>' + (r.right === r.total ? 'Nailed it.' : 'Report filed.') + '</h2>' + fbHtml +
            '<button class="primary-btn" type="button">Finish the lesson</button></div>');
          host.appendChild(done);
          done.querySelector('button').onclick = function () { ctx.next(); };
        });
      };
    }
  };

  /* ================= catch-up intro ================= */
  Engines.catchupintro = {
    mount: function (host, chunk, ctx) {
      var c = el('<div class="card catchup-card"><span class="intro-kicker">Absent for this lesson?</span>' +
        '<h2>Here’s what you missed</h2>' +
        '<p>No problem — the lesson waited for you. Work through it at your own pace: the platform will guide you exactly like it guided the class. Ask your teacher if anything needs a real human.</p>' +
        '<button class="primary-btn" type="button">Start the catch-up</button></div>');
      host.appendChild(c);
      c.querySelector('button').onclick = function () { ctx.next(); };
    }
  };

  /* ================= ladder (L2+: physical-first challenge ladder) =========
     Rung cards for out-of-platform building (MakeCode/Scratch in another tab):
     each rung is a target behaviour the pair makes REAL, tested on the actual
     device - the platform never marks it, the physical result is the test
     (doc 07 L2). A Debug Hint costs 2 XP (a rung cleared clean scores 5, a
     hinted one 3); the badge XP honours clean
     rungs. Progress survives refresh via the draft. */
  Engines.ladder = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var rungs = cfg.rungs || [];
      /* DFM 175's arcade skin, opt-in per lesson. Lesson 2 names no skin, so
         every branch below it is skipped and its cards render byte-identically
         (DFM 176 keeps L1/L2 locked). */
      var skinned = !!(App.state.lesson && App.state.lesson.skin === 'arcade');
      var draft = (ctx.draft && ctx.draft.ladder) || {};
      var done = draft.done || [];      // rung ids cleared
      var hinted = draft.hinted || [];  // rung ids where the hint was bought
      var stretchDone = !!draft.stretch;
      var idx = 0;
      while (idx < rungs.length && done.indexOf(String(rungs[idx].id)) !== -1) idx++;
      var unpluggedDone = !!draft.unplugged || idx > 0;
      /* the rung (or the stretch) cleared a heartbeat ago, so the ladder that
         renders next can play the landing flash on it exactly once */
      var justCleared = null;

      function saveLadder() {
        if (ctx.review) return;
        App.state.draft = App.state.draft || {};
        App.state.draft.ladder = { done: done, hinted: hinted, unplugged: unpluggedDone ? 1 : 0, stretch: stretchDone ? 1 : 0 };
        ctx.saveEvent({ draft: App.state.draft });
      }

      /* THE PROGRESS LADDER. Damien, 4 Aug 2026, sitting Lesson 2: "the star and
         lightening icons are very hard to make out. is there a purpose to
         them?" - and then, on the prototype: "the ladder image and animation
         are perfect (and your recommendation); build it into the cards".
         So a drawn ladder replaces the row of bolts (DFM 149/152a). The rung
         she is ON glows, a rung she has cleared is gold for good, the rails
         gild as she climbs, and the STRETCH is a dashed rung with a star ABOVE
         the top - dashed while out of reach - which is also the answer to
         "I'm not sure which of the tasks I've done was the extra challenge?"

         The UNPLUGGED rung is drawn too, at the bottom. Lesson 2 calls it
         "Rung 1 - The Human Circuit" and the card promises "four small
         challenges, called rungs"; leaving it off put a four-rung promise above
         a three-rung drawing (rule 35). Lesson 3 has none and is unaffected. */
      function drawnRungs() {
        var list = rungs.map(function (r, i) {
          var isDone = done.indexOf(String(r.id)) !== -1;
          return { key: String(r.id), done: isDone, active: (i === idx) && !isDone };
        });
        if (cfg.unplugged) {
          list.unshift({ key: '__unplugged', done: unpluggedDone, active: !unpluggedDone });
        }
        /* exactly one rung ever glows: the lowest one not yet cleared */
        var seen = false;
        for (var i = 0; i < list.length; i++) {
          if (list[i].done) { list[i].active = false; continue; }
          list[i].active = !seen;
          seen = true;
        }
        return list;
      }

      function ladderSvg(withKey) {
        var drawn = drawnRungs();
        var n = drawn.length;
        if (!n) return '';
        var cleared = drawn.filter(function (d) { return d.done; }).length;
        var hasStretch = !!cfg.stretch;
        var GAP = 32, X1 = 22, X2 = 74, W = 96;
        /* laid out top-down: star, dashed stretch rung, then the real rungs */
        var topRungY = hasStretch ? 62 : 24;
        var railTop = topRungY - (hasStretch ? 40 : 14);
        var railBottom = topRungY + (n - 1) * GAP + 14;
        var H = railBottom + 8;

        var parts = ['<g class="lad-rails">' +
          '<line class="lad-rail" x1="' + X1 + '" y1="' + railTop + '" x2="' + X1 + '" y2="' + railBottom + '"/>' +
          '<line class="lad-rail" x1="' + X2 + '" y1="' + railTop + '" x2="' + X2 + '" y2="' + railBottom + '"/></g>'];

        if (hasStretch) {
          var allDone = cleared >= n;
          var state = stretchDone ? ' done' : (allDone ? ' offered' : '');
          parts.push('<line class="lad-bonus' + state + '" x1="' + X1 + '" y1="' + (topRungY - 28) +
            '" x2="' + X2 + '" y2="' + (topRungY - 28) + '"/>');
          parts.push('<polygon class="lad-star' + state + '" points="48,2 52,14 65,14 54,21 58,34 48,26 38,34 42,21 31,14 44,14"/>');
        }

        /* drawn top-first, so rung 1 sits at the BOTTOM the way a ladder is climbed.
           NO per-rung <title>: an SVG <title> is real text content, and naming each
           rung there put "Rung 4 - The Vanishing Ghost" into EVERY card's
           textContent, which made qa-l2-rung4 mistake the intro card for rung 4. */
        for (var i = n - 1; i >= 0; i--) {
          var d = drawn[i];
          var cls = 'lad-rung' + (d.done ? ' done' : (d.active ? ' active' : '')) +
            (justCleared === d.key ? ' landing' : '');
          var y = topRungY + (n - 1 - i) * GAP;
          parts.push('<line class="' + cls + '" x1="' + X1 + '" y1="' + y + '" x2="' + X2 + '" y2="' + y + '"/>');
        }

        var svg = '<svg class="lad' + (cleared ? ' lit' : '') + '" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(ladderAria()) + '">' + parts.join('') + '</svg>';

        /* rule 13: a ladder reads at a glance, but the dashed rung does not -
           so it is named where she first meets it, on the intro card only */
        var key = withKey
          ? '<p class="lad-key">This ladder is your progress. The rung you are on glows, and it turns gold for good once you have done it.' +
            (hasStretch ? ' The dashed rung with the star, above the top, is the extra challenge &mdash; it wakes up once all ' + n + ' rungs are gold.' : '') + '</p>'
          : '';
        return '<div class="lad-wrap">' + svg + '</div>' + key;
      }

      /* a screen reader is told what the drawing shows */
      function ladderAria() {
        var drawn = drawnRungs(), n = drawn.length;
        var d = drawn.filter(function (x) { return x.done; }).length;
        var s = 'Ladder progress: ' + d + ' of ' + n + ' rungs complete';
        if (cfg.stretch) s += stretchDone ? ', extra challenge complete' : (d >= n ? ', extra challenge now available' : '');
        return s;
      }

      /* DAMIEN, 2 Aug 2026 (rule 135c): "flash it to the device" pointed at a
         film the pupil could no longer reach. Every rung card now carries a
         button that replays the lesson's film in a popup - seeked to the
         copy-it-across chapter by default - without touching her ladder place. */
      function filmBtn() {
        return (cfg.film && cfg.film.src)
          ? '<button class="ghost-btn rung-film-btn" type="button">&#127909; Watch the film again</button>' : '';
      }
      /* startAt: rung cards want the copy-it-across chapter (that is the step
         they are on). The ladder INTRO and rung 1 come straight after the film,
         so a pupil who reached them by mis-clicking "Done watching" may not have
         seen ANY of it - those open at the beginning. */
      function openFilm(startAt) {
        var f = cfg.film; if (!f || !f.src) return;
        /* DFM 104's family, L3 pre-sit review: two quick presses on the film
           button stacked two modals, and closing one left the other over the
           card. One gesture, one modal. */
        if (document.querySelector('.film-modal')) return;
        var seek = (typeof startAt === 'number') ? startAt : Number(f.defaultT || 0);
        var chips = (f.chapters || []).map(function (ch) {
          return '<button class="vid-chapter" type="button" data-t="' + Number(ch.t) + '">' + esc(ch.label) + '</button>';
        }).join('');
        var ov = el('<div class="ols-modal film-modal">' +
          '<div class="ols-modal-card ols-modal-film">' +
          '<h2>&#127909; Watch the film again</h2>' +
          '<video controls preload="metadata" playsinline src="' + esc(asset(f.src)) + '"></video>' +
          '<div class="vid-chapters">' + chips + '</div>' +
          '<div class="confirm-actions"><button class="primary-btn film-close" type="button">Back to the ladder</button></div>' +
          '</div></div>');
        document.body.appendChild(ov);
        var vid = ov.querySelector('video');
        vid.addEventListener('loadedmetadata', function () { try { vid.currentTime = seek; } catch (e) {} });
        ov.querySelectorAll('.vid-chapter').forEach(function (b) {
          b.onclick = function () { try { vid.currentTime = Number(b.getAttribute('data-t')) || 0; vid.play(); } catch (e) {} };
        });
        App.armButton(ov.querySelector('.film-close'), function () {   // DFM 104
          try { vid.pause(); } catch (e) {}
          ov.remove();
        });
      }
      function wireFilmBtn(card, startAt) {
        var fb = card.querySelector('.rung-film-btn');
        if (fb) fb.onclick = function () { openFilm(startAt); };
      }

      /* DAMIEN, 9 Aug 2026 (DFM 168): "split up the video in parts, and after
         each wee bit, then make the pupil do it on their computer, then
         confirm it's done and move on to the next part of the video."
         Each card can now carry its own slice of the film: the player opens at
         the part's start and pauses itself at the part's end (crossing once,
         from below - a pupil who presses play again afterwards has CHOSEN to
         continue, and the full film is behind the film button regardless).
         Everything here is gated on the part config existing, so a ladder
         without parts (Lesson 2) renders byte-identically to before. */
      /* DAMIEN, 9 Aug 2026 (DFM 170), on seeing every rung's scrubber read 8:44:
         "I want it to be split into the section that it's dealing with ONLY
         within each rung - i know it jumps to the specific chapter, but the
         problem is that a student who wants to rewind or go forward might
         accidentally stray into another part of the video that isn't being
         dealt with that particular rung."
         So a part is now its OWN FILE. Seeking one long film and pausing it at a
         boundary was never going to hold: the scrubber still showed the whole
         film and the pupil could drag anywhere in it. The part files are the very
         segments the full film is concatenated from (assemble.js), so they cannot
         drift out of step with it, and the whole film stays one click away on
         every card (DFM 143 untouched). */
      /* DAMIEN, 10 Aug 2026 (DFM 182), on the message that appears when a part
         finishes: "the wording needs to change to 'You've watched the tutorial,
         now build it using the instructions below'. This is clearer and makes
         more sense for a child, rather than 'That's the part...'"
         His sentence, with two truths added and both reported to him: each rung
         serves ONE PART of the tutorial rather than the whole of it, and the
         ladder-intro card has no build underneath it - the set-up list follows
         instead - so telling her to build there would send her looking for
         something that is not on the screen (DFM 35). */
      function partDoneLine(isIntro) {
        return '<p class="rung-part-done" hidden>You&rsquo;ve watched this part of the tutorial &mdash; now ' +
          (isIntro ? 'get MakeCode set up' : 'build it') + ' using the instructions below.</p>';
      }
      function partHtml(part, isIntro) {
        if (!part || !part.src) return '';
        return '<div class="rung-part">' +
          (skinned ? '<p class="now-showing">&#9654; NOW SHOWING</p>' : '') +
          '<p class="rung-step-head">&#9312; Watch this part &mdash; <b>' + esc(part.label || 'the film') + '</b></p>' +
          '<video class="rung-part-video" controls preload="metadata" playsinline src="' + esc(asset(part.src)) + '"></video>' +
          '<p class="rung-part-note"><span class="rung-part-len"></span>' +
          ' <button class="ghost-btn rung-part-replay" type="button">&#8635; Watch this part again</button></p>' +
          partDoneLine(isIntro) +
          '</div>';
      }
      function wirePart(root, part) {
        var v = root.querySelector('.rung-part-video');
        if (!v || !part || !part.src) return;
        var doneLine = root.querySelector('.rung-part-done');
        var lenLine = root.querySelector('.rung-part-len');
        /* the length is read off the file itself - never a number typed into the
           content, which could quietly stop being true after a re-record (35) */
        v.addEventListener('loadedmetadata', function () {
          if (!lenLine || !isFinite(v.duration)) return;
          var m = Math.max(1, Math.round(v.duration / 60));
          lenLine.textContent = 'This part runs about ' + m + ' minute' + (m === 1 ? '' : 's') + '.';
        });
        v.addEventListener('ended', function () { if (doneLine) doneLine.hidden = false; });
        var rb = root.querySelector('.rung-part-replay');
        if (rb) rb.onclick = function () {
          if (doneLine) doneLine.hidden = true;
          try { v.currentTime = 0; v.play(); } catch (e) {}
        };
      }

      /* DFM 171, his layout law: "the numbers listed one after another, with the
         next number on a new line because it isn't really readable at the
         moment." A numbered sequence is an ARRAY in the content and a real <ol>
         on the screen - never digits buried in a paragraph. Gated on the array
         existing, so Lesson 2's cards render byte-identically. */
      function stepList(lead, items, cls) {
        if (!items || !items.length) return '';
        return (lead ? '<p class="rung-steps-lead">' + esc(lead) + '</p>' : '') +
          '<ol class="' + cls + '">' +
          items.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
          '</ol>';
      }
      /* a card being replaced takes its playing part with it - stop it first */
      function pausePart() {
        var v = host.querySelector('.rung-part-video');
        if (v) { try { v.pause(); } catch (e) {} }
      }

      function openerRow() {
        return cfg.makecode
          ? '<p class="ladder-open"><a class="ghost-btn" href="' + esc(cfg.makecode.url) + '" target="_blank" rel="noopener">' + esc(cfg.makecode.label || 'Open MakeCode') + ' &#8599;</a>' +
            '<span class="ladder-open-note">keep it open in its own tab &mdash; you will hop between it and this ladder</span></p>'
          : '';
      }

      /* DAMIEN, 4 Aug 2026 (DFM 152c): he asked whether pupils start a new
         MakeCode project per rung or keep overwriting one, and took the
         recommendation of ONE project that grows - the code accumulates, the
         hour has no spare minutes, and Bank Your Build wants a single sensibly
         named .hex. That has to be SAID, at the point she opens MakeCode, and
         as a numbered list rather than buried in prose (DFM 135/138.1.10). */
      function setupList() {
        var steps = cfg.setup || [];
        if (!steps.length) return '';
        return '<div class="ladder-setup"><p class="ladder-setup-lead">' +
          esc(cfg.setupLead || 'Before your first rung, set MakeCode up like this:') + '</p><ol>' +
          steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
          '</ol></div>';
      }

      // Catch-up runs are SOLO: swap the pair framing out (Session B rule -
      // an absent pupil is never told to confer with a partner who isn't there)
      var solo = !!ctx.catchup;
      /* DAMIEN, 3 Aug 2026: "the need to be able to watch the video again in case
         'Done watching' was pressed by mistake". The film button was only ever on
         the rung cards, so a mis-click on Done watching stranded her across the
         ladder intro AND the whole of rung 1 with no route back. It is on every
         ladder screen now, from the first one after the film. */
      introCard(host, {
        kicker: chunk.title, title: cfg.title || 'The Challenge Ladder',
        text: (solo && cfg.introSolo) ? cfg.introSolo : (cfg.intro || ''),
        extra: ladderSvg(true) + (cfg.introPart ? partHtml(cfg.introPart, true) : '') + openerRow() + setupList() + (cfg.film && cfg.film.src ? '<p class="ladder-open">' + filmBtn() + '</p>' : '')
      }, unpluggedDone ? 'Back to the ladder' : 'Start climbing', function () {
        if (!unpluggedDone && cfg.unplugged) unplugged(); else showRung();
      });
      wireFilmBtn(host, 0);
      wirePart(host, cfg.introPart);

      function unplugged() {
        var up = cfg.unplugged;
        var upLines = (solo && up.soloLines) ? up.soloLines : (up.lines || []);
        var upConfirm = (solo && up.soloConfirm) ? up.soloConfirm : (up.confirm || 'We both took a turn');
        var lines = upLines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
        var c = el('<div class="card ladder-card"><span class="intro-kicker">' + esc(up.title || 'Rung 1') + '</span>' +
          '<h2>&#128268; ' + (solo ? 'No screens yet &mdash; today YOU are the whole circuit' : 'No screens yet &mdash; you two ARE the circuit') + '</h2>' +
          '<ol class="ladder-script">' + lines + '</ol>' +
          '<button class="confirm-step" type="button"><span class="confirm-box"></span><span>' + esc(upConfirm) + '</span></button>' +
          (cfg.film && cfg.film.src ? '<p class="ladder-open">' + filmBtn() + '</p>' : '') +
          '</div>');
        host.appendChild(c);
        wireFilmBtn(c, 0);
        c.querySelector('.confirm-step').onclick = function () {
          this.classList.add('ticked');
          unpluggedDone = true;
          saveLadder();
          /* the unplugged rung is on the ladder too, so it gets the same
             landing flash as any other rung she clears */
          setTimeout(function () {
            host.innerHTML = '';
            justCleared = '__unplugged';
            showRung();
            justCleared = null;
          }, 550);
        };
      }

      /* DFM 175's arcade skin. The strip shows what is TRUE and nothing else
         (rule 35): which rung she is on, and how many she has actually cleared.
         Returns '' unless the lesson opted into the skin, so every other ladder
         renders the markup it always did. */
      function ledStrip(nowLabel, cleared) {
        if (!skinned) return '';
        /* the seven-segment face renders DIGITS - every word belongs in a label,
           or it comes out as nonsense on a real scoreboard font */
        return '<div class="led-strip">' +
          '<span class="led-cell"><span class="led-label">Rung</span>' +
          '<span class="led-digits led-now">' + esc(nowLabel) + '</span>' +
          '<span class="led-label">of ' + rungs.length + '</span></span>' +
          '<span class="led-cell"><span class="led-label">Rungs cleared</span>' +
          '<span class="led-digits led-cleared">' + esc(String(cleared)) + '</span></span>' +
          '</div>';
      }

      function showRung() {
        if (idx >= rungs.length) { stretchOrFinish(); return; }
        pausePart();
        var r = rungs[idx];
        var hintUsed = hinted.indexOf(String(r.id)) !== -1;
        var c = el('<div class="card ladder-card">' +
          ledStrip(String(idx + 1), done.length) +
          '<span class="intro-kicker">' + esc(r.title) + '</span>' +
          ladderSvg() +
          (r.part ? partHtml(r.part, false) : '') +
          (r.part ? '<p class="rung-step-head">&#9313; Build it yourself</p>' : '') +
          '<h2 class="rung-target">' + esc(r.target) + '</h2>' +
          /* DAMIEN, 4 Aug 2026: "might need to have a screenshot image in the
             card to show them what a ghost icon looks like in makcode because I
             really don't know which one it is myself without hovering over and
             waiting for the wee pop up to tell me!" So a card picture is no
             longer always the finished blocks - it can be a single icon she has
             to FIND, which needs its own alt text and a caption saying what it
             is. Showing her which icon to look for is not giving her the answer
             (C-04); building the program around it is still hers. */
          (r.img ? '<figure class="rung-fig"><img class="rung-img' + (r.imgSmall ? ' rung-img-sm' : '') +
            '" src="' + esc(asset(r.img)) + '" alt="' + esc(r.imgAlt || 'The blocks for this rung') + '">' +
            (r.imgCap ? '<figcaption>' + esc(r.imgCap) + '</figcaption>' : '') + '</figure>' : '') +
          stepList(r.stepsLead, r.steps, 'rung-steps') +
          (r.note ? '<p class="rung-note">' + esc(r.note) + '</p>' : '') +
          (r.testSteps && r.testSteps.length
            ? '<div class="rung-test"><p class="rung-test-head">&#128293; <b>' +
              (r.part ? '&#9314; Prove it' : 'The real test') + '</b>' +
              (r.testLead ? ' &mdash; ' + esc(r.testLead) : ':') + '</p>' +
              '<ol class="rung-proof">' + r.testSteps.map(function (s) {
                return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>'
            : '<div class="rung-test"><p>&#128293; <b>' + (r.part ? '&#9314; Prove it &mdash; the real test:' : 'The real test:') + '</b> ' + esc(r.test || 'Flash it to the device and make it happen for real.') + '</p></div>') +
          /* C-04, approved 2 Aug 2026: the finished-blocks picture used to sit
             on the card, above a hint that charged 2 XP for less
             than the picture gave away free - so the rung taught copying, not
             debugging. The picture now lives INSIDE the hint, which is what
             makes the hint worth its price. Cards that teach by example (L2
             rung 2, L3 rung 1) keep theirs on the card via `img`. */
          '<div class="rung-hint" hidden><p>&#128161; ' + esc(r.hint || '') + '</p>' +
          (r.hintImg ? '<img class="rung-img" src="' + esc(asset(r.hintImg)) + '" alt="The finished blocks for this rung">' : '') +
          '</div>' +
          '<div class="rung-actions">' +
          '<button class="primary-btn rung-worked" type="button">It worked! &#9889;</button>' +
          (r.hint && !hintUsed ? '<button class="ghost-btn rung-hint-btn" type="button">Debug Hint (costs 2 XP)</button>' : '') +
          filmBtn() +
          '</div></div>');
        host.innerHTML = '';
        host.appendChild(c);
        /* DFM 143's letter: the two screens straight after the film open it at
           the BEGINNING, because a pupil who mis-clicked "Done watching" may
           have seen none of it. On a ladder with an unplugged rung (L2) that
           second screen is the unplugged card, which already opens at 0; on a
           ladder without one (L3) it is rung 1, so rung 1 opens at 0 too. */
        wireFilmBtn(c, (idx === 0 && !cfg.unplugged) ? 0 : undefined);
        wirePart(c, r.part);
        if (hintUsed) { c.querySelector('.rung-hint').hidden = false; }
        var hb = c.querySelector('.rung-hint-btn');
        /* DFM 104, L3 pre-sit review: these two were bare onclicks. Clearing a
           rung renders the NEXT rung's identical button in the same spot under
           her finger, so a double-click cleared two rungs at once. */
        if (hb) App.armButton(hb, function () {
          hinted.push(String(r.id));
          saveLadder();
          c.querySelector('.rung-hint').hidden = false;
          hb.remove();
        });
        App.armButton(c.querySelector('.rung-worked'), function () {
          done.push(String(r.id));
          saveLadder();
          /* "signal locked in" is Lesson 2's Signal Relay fiction and was leaking
             into every ladder lesson. Content may name its own (DFM 25). */
          App.toast(cfg.clearToast || 'Rung cleared &mdash; signal locked in.');
          idx++;
          /* the next card's ladder plays the landing flash on the rung she just
             cleared, then the flag is dropped so it fires exactly once */
          justCleared = String(r.id);
          showRung();
          justCleared = null;
          if (skinned) {
            var card = host.querySelector('.ladder-card');
            var dig = host.querySelector('.led-cleared');
            if (card) { card.classList.add('rung-won'); }
            if (dig) { dig.classList.add('rolling'); }
          }
        });
      }

      function stretchOrFinish() {
        pausePart();
        if (!cfg.stretch || stretchDone) { finishLadder(); return; }
        var s = cfg.stretch;
        var c = el('<div class="card ladder-card">' +
          ledStrip('\u2605', done.length) +
          '<span class="intro-kicker">' + esc(s.title || 'Stretch') + '</span>' +
          ladderSvg() +
          '<h2 class="rung-target">' + esc(s.target) + '</h2>' +
          (s.img ? '<img class="rung-img" src="' + esc(asset(s.img)) + '" alt="Stretch blocks">' : '') +
          stepList(s.stepsLead, s.steps, 'rung-steps') +
          (s.note ? '<p class="rung-note">' + esc(s.note) + '</p>' : '') +
          (s.testSteps && s.testSteps.length
            ? '<div class="rung-test"><p class="rung-test-head">&#128293; <b>The real test</b>' +
              (s.testLead ? ' &mdash; ' + esc(s.testLead) : ':') + '</p><ol class="rung-proof">' +
              s.testSteps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>'
            : (s.test ? '<div class="rung-test"><p>&#128293; <b>The real test:</b> ' + esc(s.test) + '</p></div>' : '')) +
          '<div class="rung-actions">' +
          '<button class="primary-btn" type="button">We built it! &#11088;</button>' +
          '<button class="ghost-btn" type="button">Finish the ladder without it</button>' +
          filmBtn() +
          '</div></div>');
        host.innerHTML = '';
        host.appendChild(c);
        wireFilmBtn(c);
        /* same guard as the rung buttons: this card replaces the one she just
           pressed, and both of these end the ladder */
        var btns = c.querySelectorAll('button');
        App.armButton(btns[0], function () { stretchDone = true; saveLadder(); finishLadder(); });
        App.armButton(btns[1], function () { finishLadder(); });
      }

      function finishLadder() {
        var clean = 0;
        rungs.forEach(function (r) {
          if (done.indexOf(String(r.id)) !== -1 && hinted.indexOf(String(r.id)) === -1) clean++;
        });
        var cleared = done.length;
        var xp = 7 + clean * 5 + (cleared - clean) * 3 + (stretchDone ? 5 : 0);
        var badge = Object.assign({}, ctx.chunk.badge, { xp: xp });
        var detail = 'ladder=' + cleared + '/' + rungs.length + (stretchDone ? '+s' : '');
        ctx.awardBadge(badge, detail).then(function () { ctx.next(); });
      }
    }
  };

  /* ================= parsons (distractor-free ordering, exit part 2) =======
     Tap-to-build: blocks are AUTHORED scrambled; the answer key is the
     lexicographic index of the correct permutation, judged via the ordinary
     markItem path - since rule 97 that is local and instant when the lesson's
     keys arrived at open, with the apiMark round trip as the fallback. One
     attempt, honest feedback, correct order revealed after, result recorded
     as a detail key (never blocks completion). */
  function permIndex(perm) {
    var n = perm.length, idx = 0, used = [];
    for (var i = 0; i < n; i++) {
      var smaller = 0;
      for (var j = 0; j < perm[i]; j++) if (used.indexOf(j) === -1) smaller++;
      var f = 1;
      for (var k = 2; k <= n - 1 - i; k++) f *= k;
      idx += smaller * f;
      used.push(perm[i]);
    }
    return idx;
  }
  function permFromIndex(idx, n) {
    var pool = [], out = [];
    for (var i = 0; i < n; i++) pool.push(i);
    for (var p = n - 1; p >= 1; p--) {
      var f = 1;
      for (var k = 2; k <= p; k++) f *= k;
      var d = Math.floor(idx / f);
      idx = idx % f;
      out.push(pool.splice(d, 1)[0]);
    }
    out.push(pool[0]);
    return out;
  }

  Engines.parsons = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var it = cfg.item;
      /* DAMIEN, 10 Aug 2026 (DFM 186), on Lesson 3's build-the-scoreboard card:
         "even though they are presented with 4 lines, they are actually 2
         separate code blocks, one forever and the other the input, but the end
         result looks like one continuous program that shows no reflection of the
         2 different blocks. How can we fix this?"
         He is right, and the card was already saying so in words: its own
         explanation reads "Two stacks, two shapes of code" while the screen
         numbered them 1-4 as one program. So a card can now declare its STACKS
         and the program side becomes one labelled box per stack, numbered within
         each box. The marking is untouched: the boxes are flattened in order and
         checked exactly as before, which is the same permutation the answer key
         already holds. Gated on cfg.stacks, so every other lesson's puzzle keeps
         the single column it has today, markup for markup. */
      var STACKS = (cfg.stacks && cfg.stacks.length) ? cfg.stacks : null;
      /* one box per stack; single-column mode is simply one box with no ceiling */
      var boxes = STACKS ? STACKS.map(function () { return []; }) : [[]];
      var capOf = function (k) { return STACKS ? Number(STACKS[k].size) || 0 : Infinity; };
      var flat = function () { return boxes.reduce(function (a, b) { return a.concat(b); }, []); };
      var boxOf = function (si) {
        for (var k = 0; k < boxes.length; k++) if (boxes[k].indexOf(si) !== -1) return k;
        return -1;
      };
      introCard(host, { kicker: 'Exit check — part 2', title: cfg.title || 'Build the program', text: cfg.intro || '' }, 'Ready', build);

      function build() {
        /* DAMIEN, 4 Aug 2026 (DFM 151). Three faults, all his:
           - the card never said what she was being asked to DO. It showed a
             sentence, a tray of blocks and an unexplained gesture: three
             fragments she had to join up herself. The target is now woven INTO
             the instruction ("in the order that makes this happen:"), which is
             what he meant by "incorporate the existing text to explain what
             they'd be building".
           - the how-to line sat UNDERNEATH the blocks, so it was read after she
             had already tried. It is above them now, and it is not small print.
           - "Tap a block to add it" used the banned word (DFM 150), and he
             expected to DRAG. Dragging is built; clicking still works. */
        var howMany = it.blocks.length;
        var goalLine = STACKS
          ? 'Your challenge: build the program yourself. Move all ' + howMany +
            ' blocks across &mdash; this scoreboard is <b>TWO separate stacks</b>, so build each job in its own box:'
          : 'Your challenge: build the program yourself. Move all ' + howMany +
            ' blocks across into <em>Your program</em>, and put them in the order that makes this happen:';
        var howLine = STACKS
          ? '<b>How to build it:</b> drag each block into the right job &mdash; or click it to drop it into ' +
            'the first empty space. Drag blocks up and down inside a job, and drag one back to <b>Blocks</b> ' +
            'to take it out again.'
          : '<b>How to build it:</b> drag a block from <b>Blocks</b> across into ' +
            '<b>Your program</b> &mdash; or just click it, if you prefer. Drag the blocks up and down to change ' +
            'the order, and drag one back to <b>Blocks</b> to take it out again.';
        var progSide = STACKS
          ? '<div class="parsons-prog is-stacked"><h3>Your program</h3>' +
            STACKS.map(function (st, k) {
              return '<div class="pp-box" data-box="' + k + '">' +
                '<h4 class="pp-box-label">' + esc(st.label || ('Job ' + (k + 1))) + '</h4>' +
                '<ol class="pp-list" data-box="' + k + '"></ol></div>';
            }).join('') + '</div>'
          : '<div class="parsons-prog"><h3>Your program</h3><ol class="pp-list"></ol></div>';
        var c = el('<div class="card parsons-card">' +
          '<h2 class="parsons-goal">' + goalLine + '</h2>' +
          '<p class="parsons-target">&#127919; ' + esc(it.prompt) + '</p>' +
          '<p class="parsons-how">' + howLine + '</p>' +
          '<div class="parsons-cols">' +
          '<div class="parsons-tray"><h3>Blocks</h3><div class="pt-list"></div></div>' +
          progSide +
          '</div>' +
          '<button class="primary-btn parsons-check" type="button" disabled>Check my program</button>' +
          '<div class="q-feedback" hidden></div></div>');
        host.appendChild(c);
        var tray = c.querySelector('.pt-list');
        var progLists = Array.prototype.slice.call(c.querySelectorAll('.pp-list'));
        var prog = progLists[0];   /* single-column mode: the one and only list */
        /* The drop ZONES are the whole Blocks / Your program panels, not the
           inner lists. Hit-testing the lists made the target only as tall as the
           blocks already in it, so a drop onto the visible empty space of a
           panel did nothing - and the highlight classes went on the lists while
           the CSS styles the panels, so nothing lit up either. His standing drag
           rule: the whole thing you can see is the target. */
        var trayZone = c.querySelector('.parsons-tray'), progZone = c.querySelector('.parsons-prog');
        var checkBtn = c.querySelector('.parsons-check');

        var locked = false;          // set once she has checked - no more moving
        var dragSi = null;           // the block being dragged, by source index

        function moveInto(si, at, k) {
          k = k || 0;
          var from = boxOf(si);
          if (from !== -1) boxes[from].splice(boxes[from].indexOf(si), 1);
          /* A FULL JOB REFUSES A FIFTH BLOCK rather than silently swapping one
             out: a block that vanished from a box she had already filled would
             be a fault she could not see (DFM 43's family). It goes back where
             it came from and the tray keeps it. */
          if (boxes[k].length >= capOf(k)) {
            if (from !== -1) boxes[from].splice(Math.min(at == null ? boxes[from].length : at, boxes[from].length), 0, si);
            render();
            return;
          }
          if (at == null || at > boxes[k].length) at = boxes[k].length;
          boxes[k].splice(at, 0, si);
          render();
        }
        function firstOpenBox() {
          for (var k = 0; k < boxes.length; k++) if (boxes[k].length < capOf(k)) return k;
          return -1;
        }
        function takeOut(si) {
          var k = boxOf(si);
          if (k !== -1) { boxes[k].splice(boxes[k].indexOf(si), 1); render(); }
        }
        /* where would a drop at this pointer position land? Measured against the
           MIDPOINT of each placed block, so the whole block is a target rather
           than a thin seam between two of them. */
        function dropIndexAt(clientY, listEl) {
          var lis = Array.prototype.slice.call((listEl || prog).querySelectorAll('li:not(.pp-empty)'));
          for (var i = 0; i < lis.length; i++) {
            var r = lis[i].getBoundingClientRect();
            if (clientY < r.top + r.height / 2) return i;
          }
          return lis.length;
        }
        function clearMarks() {
          c.querySelectorAll('.pp-list li').forEach(function (li) { li.classList.remove('drop-before', 'drop-after'); });
          /* (the pp-empty placeholder never carries a mark - it is not a slot) */
          progZone.classList.remove('drop-empty');
          c.querySelectorAll('.pp-box').forEach(function (b) { b.classList.remove('drop-empty', 'drop-full'); });
          trayZone.classList.remove('drop-back');
        }

        /* POINTER-based drag, not HTML5 drag-and-drop. Two reasons, and the
           second is the one that decided it: HTML5 DnD cannot be driven by
           synthetic mouse input, so neither I nor a harness could ever prove it
           works - and a gesture I cannot test is a gesture I should not ship
           (DFM 146b). Pointer events also give a ghost that tracks the cursor
           with no transition, which is the lag-free feel his drag rule asks for.
           A press that never moves is still a CLICK, so both gestures work. */
        var ghost = null;
        var suppressClick = false;   // set by a completed drag, eaten by its own click

        function makeGhost(node, x, y) {
          var r = node.getBoundingClientRect();
          var g = node.cloneNode(true);
          g.className = 'parsons-block parsons-ghost';
          g.style.width = r.width + 'px';
          g.style.height = r.height + 'px';
          g.dataset.dx = String(r.left - x);
          g.dataset.dy = String(r.top - y);
          document.body.appendChild(g);
          moveGhost(g, x, y);
          return g;
        }
        function moveGhost(g, x, y) {
          g.style.transform = 'translate(' + (x + Number(g.dataset.dx)) + 'px,' + (y + Number(g.dataset.dy)) + 'px)';
        }
        function inside(el, x, y) {
          var r = el.getBoundingClientRect();
          return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        }
        /* which job is the pointer over? The whole labelled BOX is the target,
           not its inner list - his standing drag rule (DFM feedback_drag_quality:
           "drop on the WHOLE picture"), which is why single-column mode hit-tests
           the panel rather than the <ol> too. */
        function boxAt(x, y) {
          var hit = -1;
          c.querySelectorAll('.pp-box').forEach(function (b) {
            if (inside(b, x, y)) hit = Number(b.getAttribute('data-box'));
          });
          return hit;
        }
        function showDropTarget(x, y) {
          clearMarks();
          if (STACKS) {
            var k = boxAt(x, y);
            if (k !== -1) {
              var boxEl = c.querySelector('.pp-box[data-box="' + k + '"]');
              var full = boxes[k].length >= capOf(k) && boxOf(dragSi) !== k;
              if (full) { boxEl.classList.add('drop-full'); return; }
              var kl = boxEl.querySelectorAll('li:not(.pp-empty)');
              if (!kl.length) { boxEl.classList.add('drop-empty'); return; }
              var at2 = dropIndexAt(y, boxEl.querySelector('.pp-list'));
              if (at2 >= kl.length) kl[kl.length - 1].classList.add('drop-after');
              else kl[at2].classList.add('drop-before');
              return;
            }
          } else if (inside(progZone, x, y)) {
            var lis = prog.querySelectorAll('li:not(.pp-empty)');
            if (!lis.length) { progZone.classList.add('drop-empty'); return; }
            var at = dropIndexAt(y);
            if (at >= lis.length) lis[lis.length - 1].classList.add('drop-after');
            else lis[at].classList.add('drop-before');
            return;
          }
          if (inside(trayZone, x, y) && boxOf(dragSi) !== -1) {
            trayZone.classList.add('drop-back');
          }
        }
        function commitDrop(si, x, y) {
          var k = STACKS ? boxAt(x, y) : (inside(progZone, x, y) ? 0 : -1);
          if (k !== -1) {
            var listEl = STACKS ? c.querySelector('.pp-box[data-box="' + k + '"] .pp-list') : prog;
            var at = dropIndexAt(y, listEl);
            var from = boxOf(si);
            /* dropping BELOW its own old position IN THE SAME box: the index
               shifts by one once the block is lifted out, or it lands one place
               short every time */
            if (from === k) {
              var cur = boxes[k].indexOf(si);
              if (cur !== -1 && at > cur) at -= 1;
            }
            moveInto(si, at, k);
          } else if (inside(trayZone, x, y)) {
            takeOut(si);
          } else {
            render();            // dropped nowhere: put everything back as it was
          }
        }

        function wireDrag(node, si, isPlaced) {
          if (locked) return;
          node.addEventListener('pointerdown', function (e) {
            if (locked || (e.button !== undefined && e.button !== 0)) return;
            var sx = e.clientX, sy = e.clientY, moved = false;
            try { node.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }

            function onMove(ev) {
              if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) return;
              if (!moved) {
                moved = true; dragSi = si;
                node.classList.add('dragging');
                ghost = makeGhost(node, ev.clientX, ev.clientY);
              }
              ev.preventDefault();
              moveGhost(ghost, ev.clientX, ev.clientY);
              showDropTarget(ev.clientX, ev.clientY);
            }
            function onUp(ev) {
              node.removeEventListener('pointermove', onMove);
              node.removeEventListener('pointerup', onUp);
              node.removeEventListener('pointercancel', onUp);
              try { node.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
              if (ghost) { ghost.remove(); ghost = null; }
              node.classList.remove('dragging');
              clearMarks();
              /* A drag ends here. A press that never moved is left to the CLICK
                 handler below, so that keyboard activation (Enter or Space fires
                 click with no pointer events at all) keeps working - handling it
                 here instead locked out anyone not using a mouse. */
              if (moved) { suppressClick = true; commitDrop(si, ev.clientX, ev.clientY); }
              dragSi = null;
            }
            node.addEventListener('pointermove', onMove);
            node.addEventListener('pointerup', onUp);
            node.addEventListener('pointercancel', onUp);
          });

          node.addEventListener('click', function () {
            if (locked) return;
            if (suppressClick) { suppressClick = false; return; }   // the tail of a drag
            /* click-to-add drops into the first job with a space, box one first -
               which is also the order a keyboard user meets them in */
            if (isPlaced) takeOut(si);
            else { var k = firstOpenBox(); if (k !== -1) moveInto(si, null, k); }
          });
        }

        function render() {
          tray.innerHTML = '';
          progLists.forEach(function (l) { l.innerHTML = ''; });
          it.blocks.forEach(function (b, si) {
            if (boxOf(si) !== -1) return;
            var n = el('<button class="parsons-block" type="button" draggable="false">' + esc(b) + '</button>');
            wireDrag(n, si, false);
            tray.appendChild(n);
          });
          if (!tray.children.length) {
            tray.appendChild(el('<p class="pt-empty">All of them are in your program.</p>'));
          }
          /* DAMIEN, 8 Aug 2026: the numbers wandered left and right as blocks were
             added. Cause: .pp-list is a FLEX container, and a browser's automatic
             list marker (::marker) is not reliably positioned on a flex item - so
             "1." and "2." sat at different x. The number is now a real element in
             a fixed-width right-aligned column, which pins it exactly AND makes
             the alignment measurable, so a harness can hold it there. */
          /* numbering restarts INSIDE each job. Running 1-4 straight down two
             stacks is the very thing he caught: it draws one program where the
             micro:bit really has two. */
          boxes.forEach(function (list, k) {
            var listEl = progLists[k];
            list.forEach(function (si, i) {
              var n = el('<li><span class="pp-num">' + (i + 1) + '.</span>' +
                '<button class="parsons-block placed" type="button" draggable="false">' + esc(it.blocks[si]) + '</button></li>');
              wireDrag(n.querySelector('button'), si, true);
              listEl.appendChild(n);
            });
            if (!list.length) {
              listEl.appendChild(el('<li class="pp-empty">Nothing here yet &mdash; drag or click a block across.</li>'));
            }
          });
          checkBtn.disabled = flat().length !== it.blocks.length;
        }
        render();

        checkBtn.onclick = function () {
          checkBtn.disabled = true;
          locked = true;
          c.querySelectorAll('.parsons-block').forEach(function (b) { b.disabled = true; });
          /* the boxes are flattened in order, job one then job two, and marked
             exactly as a single column always was - so the answer key is
             untouched by this whole change */
          ctx.markItem(it.id, permIndex(flat())).then(function (r) {
            var fb = c.querySelector('.q-feedback');
            fb.hidden = false;
            if (!r || !r.ok) {
              fb.className = 'q-feedback neutral';
              fb.innerHTML = '<p>Hmm &mdash; could not check that one. Moving on.</p><button class="primary-btn" type="button">Continue</button>';
            } else if (r.correct) {
              fb.className = 'q-feedback good';
              fb.innerHTML = '<p class="q-verdict">' + esc(cfg.doneText || 'Correct \u2014 that program does exactly what the mission asked.') + '</p>' +
                (r.explain ? '<p class="q-explain">' + esc(r.explain) + '</p>' : '') +
                '<button class="primary-btn" type="button">Continue</button>';
            } else {
              var order = permFromIndex(Number(r.correctIdx), it.blocks.length);
              /* THE ANSWER IS SHOWN IN THE SAME TWO BOXES SHE BUILT IN. Printing
                 the working order as one flat 1-4 list would teach, at the exact
                 moment she is most likely to believe it, the very falsehood this
                 fix exists to kill (DFM 186). */
              var answerHtml;
              if (STACKS) {
                var cut = 0;
                answerHtml = STACKS.map(function (st, k) {
                  var size = Number(st.size) || 0;
                  var slice = order.slice(cut, cut + size);
                  cut += size;
                  return '<div class="pa-box"><h4 class="pp-box-label">' + esc(st.label || ('Job ' + (k + 1))) + '</h4>' +
                    '<ol class="parsons-answer">' + slice.map(function (si) { return '<li>' + esc(it.blocks[si]) + '</li>'; }).join('') + '</ol></div>';
                }).join('');
              } else {
                answerHtml = '<ol class="parsons-answer">' +
                  order.map(function (si) { return '<li>' + esc(it.blocks[si]) + '</li>'; }).join('') + '</ol>';
              }
              fb.className = 'q-feedback bad';
              fb.innerHTML = '<p class="q-verdict">Not quite &mdash; here is the working order:</p>' +
                answerHtml +
                (r.explain ? '<p class="q-explain">' + esc(r.explain) + '</p>' : '') +
                '<button class="primary-btn" type="button">Continue</button>';
            }
            if (!ctx.review && r && r.ok) ctx.saveEvent({ detail: 'ep=' + (r.correct ? 1 : 0) });
            fb.querySelector('button').onclick = function () { ctx.next(); };
            fb.querySelector('button').focus();
          });
        };
      }
    }
  };

  /* ================= artifact (bank your build: HQ checks the REAL Drive) ==
     Teaches the save-to-Drive flow for external tools (Damien's condition:
     pupils are SHOWN how), then genuinely verifies a fresh file of the right
     kind is inside School > DT Work. Never blocks the lesson - the badge is
     the honest reward; the fallback path continues without it. */
  Engines.artifact = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var steps = (cfg.steps || []).map(function (s, i) {
        return '<li><span class="af-icon">' + esc(s.icon || '') + '</span><div><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p></div></li>';
      }).join('');

      /* DAMIEN, 10 Aug 2026 (DFM 184/187). He asked at his Lesson 3 sit whether a
         film had ever been made showing how to save the .hex into Drive - there
         never had been - and then recorded one himself the same evening. It is
         one film with one home, shown two ways:
           Lesson 2, where saving to Drive is TAUGHT: open on the card.
           Lesson 3, where it is a REMINDER: behind a "Show me how" button, so a
           pupil who remembers is not made to sit through it (DFM 135c gives the
           route to being shown; it does not force it).
         Every line of this is gated on cfg.demo, so an artifact card without one
         - Lesson 5's ship desk - renders exactly as it did before. */
      function demoHtml() {
        var d = cfg.demo;
        if (!d || !d.src) return '';
        return '<div class="af-demo">' +
          '<p class="af-demo-head">Watch first: saving your program into Google Drive</p>' +
          '<video class="af-demo-video" controls preload="metadata" playsinline src="' + esc(asset(d.src)) + '"></video>' +
          '<p class="af-demo-len"></p>' +
          '<p class="af-demo-fallback">If the film won&rsquo;t load, the written steps below cover everything it shows.</p>' +
          (d.note ? '<p class="af-demo-note">' + esc(d.note) + '</p>' : '') +
          '</div>';
      }
      function wireDemo(root) {
        var v = root.querySelector('.af-demo-video');
        if (!v) return;
        var lenLine = root.querySelector('.af-demo-len');
        /* the length is measured off the file, never typed into content - a
           number in a card stops being true the day the film is rebuilt (35) */
        v.addEventListener('loadedmetadata', function () {
          if (!lenLine || !isFinite(v.duration)) return;
          var m = Math.floor(v.duration / 60), s = Math.round(v.duration % 60);
          lenLine.textContent = 'The film lasts about ' + (m ? m + ' minute' + (m === 1 ? '' : 's') + ' ' : '') +
            s + ' seconds. You can pause it at any point and catch up.';
        });
      }

      var c = el('<div class="card af-card"><span class="intro-kicker">' + esc(chunk.title) + '</span>' +
        '<h2>' + esc(cfg.title || 'Bank your build') + '</h2>' +
        '<p class="intro-lead">' + esc(cfg.intro || '') + '</p>' +
        (cfg.demo && cfg.demo.src
          ? (cfg.demo.open
              ? demoHtml()
              : '<p class="af-demo-ask"><button class="ghost-btn af-demo-btn" type="button">Show me how</button></p>')
          : '') +
        '<ol class="af-steps">' + steps + '</ol>' +
        '<div class="rung-actions">' +
        '<button class="primary-btn" type="button">' + esc(cfg.checkLabel || 'Run the HQ Inspection') + '</button>' +
        '<button class="ghost-btn" type="button" hidden>Continue without banking (ask your teacher)</button>' +
        '</div><div class="af-result"></div></div>');
      host.appendChild(c);
      wireDemo(c);
      var askBtn = c.querySelector('.af-demo-btn');
      if (askBtn) {
        App.armButton(askBtn, function () {
          /* she chose to be shown: the film REPLACES the button rather than
             toggling it, so the card cannot end up half-open behind her */
          var slot = c.querySelector('.af-demo-ask');
          slot.outerHTML = demoHtml();
          wireDemo(c);
        });
      }
      /* the run/skip buttons are found by CLASS now, not by position: the demo
         button lands before them in the card, and "the first button" would have
         picked it up - the exact fault DFM 143(a) caught on the ladder intro */
      var runBtn = c.querySelector('.rung-actions .primary-btn');
      var skipBtn = c.querySelector('.rung-actions .ghost-btn');
      var box = c.querySelector('.af-result');
      var tries = 0;
      skipBtn.onclick = function () { ctx.next(); };
      runBtn.onclick = function () {
        runBtn.disabled = true;
        box.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>HQ is looking inside your Vault&hellip;</span></div>';
        ctx.call('artifactCheck', { lessonNum: String(ctx.lessonEntry.num), kinds: cfg.kinds || ['hex'], hours: cfg.hours || 3 }).then(function (r) {
          runBtn.disabled = false;
          tries++;
          if (!r || !r.ok) {
            box.innerHTML = '<div class="dc-row miss"><span class="dc-mark">&#10007;</span><span>The line to HQ dropped &mdash; try again in a moment.</span></div>';
            return;
          }
          if (r.found) {
            box.innerHTML = '<div class="dc-row ok"><span class="dc-mark">&#10003;</span><span>HQ found <b>' + esc(r.name) + '</b> in your DT Work vault' +
              (r.ageMin != null ? ' (saved ' + Number(r.ageMin) + ' min ago)' : '') + '.</span></div>' +
              (r.simulated ? '<p class="dc-sim">(Preview mode: this inspection is simulated &mdash; the live platform checks your real Drive.)</p>' : '') +
              '<p>' + esc(cfg.passText || 'Your build now follows your login anywhere. That is the whole point of the Vault.') + '</p>';
            runBtn.textContent = 'Claim the badge';
            runBtn.onclick = function () { finishChunk(ctx, 'bank=1'); };
            skipBtn.hidden = true;
          } else {
            box.innerHTML = '<div class="dc-row miss"><span class="dc-mark">&#10007;</span><span>' +
              (r.noFolder ? 'HQ could not find your School &gt; DT Work folder. Build it right now in Drive &mdash; + New &rarr; Folder &rarr; "School", then "DT Work" inside it &mdash; and press the check button again. (The Files That Follow You side quest walks you through it too.)'
                : 'No freshly-saved build found in DT Work yet.') + '</span></div>' +
              '<p>' + esc(cfg.failText || 'Check each step above, then press ' + (cfg.checkLabel || 'Run the HQ Inspection') + ' again.') + '</p>';
            if (tries >= 2) skipBtn.hidden = false;
          }
        });
      };
    }
  };

  /* ================= video (chaptered; graceful before filming) ============ */
  Engines.video = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config || {};
      if (!cfg.src) {
        var c = el('<div class="card video-soon"><span class="intro-kicker">' + esc(chunk.title || 'Tutorial') + '</span>' +
          '<h2>&#127909; Video on its way</h2><p>' + esc(cfg.fallback || 'This tutorial video is being filmed. For now, your teacher will talk you through this bit.') + '</p>' +
          '<button class="primary-btn" type="button">Continue</button></div>');
        host.appendChild(c);
        c.querySelector('button').onclick = function () { finishChunk(ctx); };
        return;
      }
      var chapters = (cfg.chapters || []).map(function (ch) {
        return '<button class="vid-chapter" data-t="' + Number(ch.t) + '" type="button">' + esc(ch.label) + '</button>';
      }).join('');
      /* DAMIEN, 3 Aug 2026 (rule 138.1.11): the pair logistics have to be said
         ON the card where they change - who watches where, and whose computer
         sends the program to the one micro:bit the pair shares. */
      var c2 = el('<div class="card video-card"><h2>' + esc(chunk.title) + '</h2>' +
        (cfg.intro ? '<p class="video-intro">' + esc(cfg.intro) + '</p>' : '') +
        '<video controls preload="metadata" playsinline ' + (cfg.poster ? 'poster="' + esc(asset(cfg.poster)) + '"' : '') + ' src="' + esc(asset(cfg.src)) + '"></video>' +
        (chapters ? '<div class="vid-chapters">' + chapters + '</div>' : '') +
        /* DFM 168 (L5 spec Part B): when a film is SPLIT and half of it lives
           somewhere else, the screen has to say where the other half went — or a
           pupil who watched to the end believes she has seen it all. Rendered
           only when content asks for it, so every video chunk without a `note`
           (Lessons 2 and 3) is byte-identical to before. */
        (cfg.note ? '<p class="video-note">' + esc(cfg.note) + '</p>' : '') +
        '<button class="primary-btn" type="button">Done watching</button></div>');
      host.appendChild(c2);
      var vid = c2.querySelector('video');
      c2.querySelectorAll('.vid-chapter').forEach(function (b) {
        b.onclick = function () { vid.currentTime = Number(b.getAttribute('data-t')); vid.play(); };
      });
      c2.querySelector('.primary-btn').onclick = function () { vid.pause(); finishChunk(ctx); };
    }
  };

  /* ================= tournament (the Reaction Rally console) ===============
     L3's whole-class event.

     REBUILT 10 Aug 2026 TO HIS OWN MECHANIC (DFM 185). He sat the lesson and
     said: "I don't think this activity is very clear. I think a better idea
     would be to have a timer, and when the timer starts, the pupils have to
     press a as many times as possible until the timer stops, then record their
     score. Then the highest combined score for a team wins." And, on sharing one
     micro:bit: "should it be that they each get two chances against the clock
     and record their own two scores and send them in, so even though they're
     sharing a microbit, they are still playing independently? Yes, I like that,
     and the referee's job is the person in the pair who isn't using the microbit
     at a turn... Each person does the 2 goes before handing over."

     So: TWO timed goes each, the partner referees, and every pupil sends in her
     OWN total under her OWN name. Three design facts worth keeping written down:
       - The timer lives on the PLAYER'S screen, not the front of the room. A
         front-of-class timer would strand a cover class and a catch-up pupil
         (rule 53), and pairs finish at different speeds anyway.
       - Goes are FIVE seconds and a go is capped at 45. The deployed server
         clamps a submitted score to 0-99 (tnAgg_), and this job does not touch
         the server - so two goes must not be able to sum past 99, or a fast
         pupil's honest total would be silently truncated. 2 x 45 = 90. The
         harness pins that arithmetic (DFM 157a: a limit living in two places is
         a contract, and one of them is lying unless something checks).
       - "Highest combined score for a team wins" needs NO new server code: every
         pupil's rt= is already summed into her team's total.
     Scores still land as detail keys (rt=total, rr=go1.go2), teams stay SEALED
     until the teacher fires the projector reveal, and Continue is available from
     the moment the score is transmitted. */
  Engines.tournament = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config || {};
      var max = Number(cfg.maxScore) || 10;
      var solo = !!ctx.catchup;
      var draft = (ctx.draft && ctx.draft.rally) || {};
      var GOES = 2;
      var secs = Number(cfg.timerSeconds) || 5;
      /* a draft written by the OLD three-round rally is treated as empty: its
         numbers meant something else entirely, and only his own test accounts
         can be holding one */
      var rounds = (draft.r && draft.r.length === GOES) ? draft.r.slice(0, GOES) : [null, null];
      var timed = Math.max(0, Math.min(GOES, Number(draft.t) || 0));  // goes whose timer has run
      var ticked = !!draft.c;
      var submitted = !!draft.sub;
      var pollTimer = null;
      var running = false;

      /* 3x5 dot-matrix digit font - the console displays scores the way the
         micro:bit's own LED grid would */
      var FONT = {
        '0': '111101101101111', '1': '010110010010111', '2': '111001111100111',
        '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
        '6': '111100111101111', '7': '111001010010010', '8': '111101111101111',
        '9': '111101111001111', '-': '000000111000000'
      };
      function ledHtml(val) {
        var s = (val == null) ? '-' : String(val);
        var out = '';
        for (var d = 0; d < s.length; d++) {
          var bits = FONT[s[d]] || FONT['-'];
          var dots = '';
          for (var i = 0; i < 15; i++) dots += '<i class="' + (bits[i] === '1' ? 'on' : '') + '"></i>';
          out += '<span class="led-digit">' + dots + '</span>';
        }
        return out;
      }
      /* his ruling: the two goes are ADDED, and the team with the highest
         combined score wins. The server already sums one number per pupil, so
         the number we send is her total. */
      function total() {
        var t = 0, any = false;
        rounds.forEach(function (v) { if (v != null) { t += v; any = true; } });
        return any ? t : null;
      }
      function saveDraft() {
        if (ctx.review) return;
        App.state.draft = App.state.draft || {};
        App.state.draft.rally = { r: rounds, t: timed, c: ticked ? 1 : 0, sub: submitted ? 1 : 0 };
        ctx.saveEvent({ draft: App.state.draft });
      }

      /* review = a re-read: static summary, zero network */
      if (ctx.review) {
        var t0 = total();
        host.appendChild(el('<div class="card rally-card"><span class="intro-kicker">' + esc(chunk.title) + '</span>' +
          '<h2>' + esc(cfg.title || 'The Reaction Rally') + '</h2>' +
          /* review mode cannot know whether the run was solo, and "your two
             goes" is true either way (L3 pre-sit review) */
          '<p class="intro-lead">' + (draft.sub && t0 != null ? 'Rally logged — your two goes made <b>' + t0 + '</b> together. The reveal happened live in class.' : 'The Rally runs live, in class — nothing to replay here.') + '</p>' +
          '<button class="primary-btn" type="button">Continue</button></div>'));
        host.querySelector('button').onclick = function () { ctx.next(); };
        return;
      }

      var intro = solo ? (cfg.soloIntro || cfg.intro) : cfg.intro;
      var rules = solo ? (cfg.soloRules || cfg.rules) : cfg.rules;
      var confirmLabel = solo ? (cfg.soloConfirm || cfg.confirm) : cfg.confirm;
      var ruleRows = (rules || []).map(function (r, i) {
        return '<li><span class="rally-rule-n">' + (i + 1) + '</span><span>' + esc(r) + '</span></li>';
      }).join('');
      var labels = (cfg.roundsLabel || ['Go 1', 'Go 2']).slice(0, GOES);
      var slots = labels.map(function (lab, i) {
        return '<div class="rally-round" data-i="' + i + '">' +
          '<span class="rally-round-label">' + esc(lab) + '</span>' +
          '<div class="led-display"></div>' +
          '<div class="rally-steps">' +
          '<button class="rally-step" data-d="-10" type="button" aria-label="Down ten">&minus;10</button>' +
          '<button class="rally-step" data-d="-1" type="button" aria-label="Down one">&minus;</button>' +
          '<button class="rally-step" data-d="1" type="button" aria-label="Up one">+</button>' +
          '<button class="rally-step" data-d="10" type="button" aria-label="Up ten">+10</button>' +
          '</div><span class="rally-locked-tag">Run the timer first</span></div>';
      }).join('');

      /* THE TIMER. One button, pressed by the referee on the player's screen. */
      var timerHtml = '<div class="rally-timer">' +
        '<p class="rally-timer-head">Go ' + '<span class="rally-go-n">1</span> of ' + GOES + '</p>' +
        '<div class="rally-timer-face"><span class="rally-timer-num">' + secs + '</span></div>' +
        '<div class="rally-timer-bar"><span class="rally-timer-fill"></span></div>' +
        /* his 11 Aug find: "the referee presses the button" never said WHOSE
           screen this is, and the referee is standing at someone else's machine.
           Content-driven (so it goes through the language gate like every other
           pupil sentence) and solo-aware, because a catch-up pupil has no
           referee and must not be told to wait for one (rule 35). */
        '<p class="rally-timer-say">' + esc(solo
          ? (cfg.soloTimerSay || 'You are refereeing yourself today. When you are ready, click the button below to start your ' + secs + ' seconds.')
          : (cfg.timerSay || 'Referee — this screen belongs to the player, not to you. When she is ready, click the button below to start her ' + secs + ' seconds.')) + '</p>' +
        '<button class="primary-btn rally-timer-btn" type="button">Start the ' + secs + ' seconds</button>' +
        '</div>';

      var c = el('<div class="card rally-card"><span class="intro-kicker">' + esc(cfg.kicker || chunk.title) + '</span>' +
        '<h2>' + esc(cfg.title || 'The Reaction Rally') + '</h2>' +
        '<p class="intro-lead">' + esc(intro || '') + '</p>' +
        '<ol class="rally-rules">' + ruleRows + '</ol>' +
        timerHtml +
        '<div class="rally-console">' + slots + '</div>' +
        '<p class="rally-total-row">Your total: <span class="rally-total">—</span></p>' +
        '<button class="confirm-step rally-confirm" type="button"><span class="confirm-box"></span>' + esc(confirmLabel || 'We played it fair') + '</button>' +
        /* DFM 185: every pupil now sends in HER OWN two goes under her own name,
           so the old "our score" / "my score" split has nothing left to describe */
        '<div class="rung-actions"><button class="primary-btn rally-transmit" type="button" disabled>Send in my scores</button></div>' +
        '<div class="rally-after"></div></div>');
      host.appendChild(c);
      var confirmBtn = c.querySelector('.rally-confirm');
      var transmitBtn = c.querySelector('.rally-transmit');
      var afterBox = c.querySelector('.rally-after');

      var timerBtn = c.querySelector('.rally-timer-btn');
      var timerNum = c.querySelector('.rally-timer-num');
      var timerFill = c.querySelector('.rally-timer-fill');
      var timerSay = c.querySelector('.rally-timer-say');
      var goN = c.querySelector('.rally-go-n');
      var totalOut = c.querySelector('.rally-total');

      function paint() {
        c.querySelectorAll('.rally-round').forEach(function (slot) {
          var i = Number(slot.getAttribute('data-i'));
          /* a go's number cannot be typed until ITS timer has actually run:
             the score has to come off the micro:bit after a real five seconds,
             not out of thin air */
          var open = i < timed && !running && !submitted;
          slot.querySelector('.led-display').innerHTML = ledHtml(rounds[i]);
          slot.classList.toggle('is-locked-go', !open);
          slot.querySelectorAll('.rally-step').forEach(function (b) { b.disabled = !open; });
        });
        var t = total();
        totalOut.textContent = t == null ? '—' : String(t);
        if (ticked) confirmBtn.classList.add('ticked');
        var allIn = rounds.every(function (v) { return v != null; });
        var ready = ticked && allIn && timed >= GOES;
        transmitBtn.disabled = !ready || submitted;
        if (goN) goN.textContent = String(Math.min(GOES, timed + 1));
        if (timerBtn) {
          timerBtn.hidden = submitted || (timed >= GOES && allIn);
          timerBtn.disabled = running;
          timerBtn.textContent = timed >= GOES ? 'Run a go again' : 'Start the ' + secs + ' seconds';
        }
      }

      /* 3-2-1, then the five seconds, then hands off. Whole seconds only: a
         decimal counter would have her watching the screen instead of pressing. */
      function runTimer() {
        if (running || submitted) return;
        running = true;
        paint();
        var stage = 3;
        timerSay.textContent = 'Get ready…';
        c.querySelector('.rally-timer').classList.add('is-counting');
        var countIn = setInterval(function () {
          if (stage > 0) { timerNum.textContent = String(stage); stage--; return; }
          clearInterval(countIn);
          timerNum.textContent = 'GO!';
          timerSay.textContent = 'PRESS BUTTON A as fast as you can!';
          c.querySelector('.rally-timer').classList.add('is-live');
          var left = secs;
          timerFill.style.transition = 'none';
          timerFill.style.width = '100%';
          setTimeout(function () {
            timerFill.style.transition = 'width ' + secs + 's linear';
            timerFill.style.width = '0%';
          }, 30);
          var tick = setInterval(function () {
            left--;
            if (left > 0) { timerNum.textContent = String(left); return; }
            clearInterval(tick);
            timerNum.textContent = 'TIME!';
            timerSay.textContent = 'TIME! Hands off — read the number off the micro:bit.';
            c.querySelector('.rally-timer').classList.remove('is-live', 'is-counting');
            running = false;
            /* re-running before you submit is allowed and never re-locks a go -
               the referee is the one who decides a go was fair, not the app */
            if (timed < GOES) timed++;
            paint(); saveDraft();
          }, 1000);
        }, 700);
      }
      if (timerBtn) timerBtn.onclick = runTimer;

      c.querySelectorAll('.rally-step').forEach(function (btn) {
        btn.onclick = function () {
          if (submitted || running) return;
          var i = Number(btn.closest('.rally-round').getAttribute('data-i'));
          if (i >= timed) return;
          var v = rounds[i] == null ? 0 : rounds[i] + Number(btn.getAttribute('data-d'));
          rounds[i] = Math.max(0, Math.min(max, v));
          paint(); saveDraft();
        };
      });
      confirmBtn.onclick = function () {
        if (submitted) return;
        ticked = !ticked;
        confirmBtn.classList.toggle('ticked', ticked);
        paint(); saveDraft();
      };
      transmitBtn.onclick = function () {
        if (submitted) return;
        submitted = true;
        paint(); saveDraft();
        /* SAME KEYS as before, so the server, the CSV and the yearly archive are
           untouched: rt is now her TWO-GO TOTAL and rr its two parts. The total
           cannot pass the server's 0-99 clamp by construction (GOES x maxScore
           = 90) - qa pins that so a future maxScore edit cannot break it quietly. */
        var detail = 'rt=' + total() + ';rr=' + rounds.join('.');
        ctx.awardBadge(ctx.chunk.badge, detail).then(function () {
          /* S-1 (2 Aug 2026): awardBadge replaces the whole chunk host with the
             "Saving your badge..." panel, so this card - and afterBox with it -
             is already detached by the time we get here. Painting the suspense
             room into it left every pupil on a spinner for ever. Rebuild the
             screen the way a refresh does instead: the draft is saved above,
             so the fresh mount walks straight into afterTransmit() against a
             LIVE afterBox and startPoll() sees a box that is in the document. */
          if (App.remountChunk) App.remountChunk(); else afterTransmit();
        });
      };

      function lockConsole() {
        c.querySelector('.rally-rules').hidden = true;
        c.querySelector('.rally-console').classList.add('is-locked');
        var tb = c.querySelector('.rally-timer');
        if (tb) tb.hidden = true;                 /* the goes are over - the timer stops being an offer */
        confirmBtn.hidden = true;
        transmitBtn.parentNode.hidden = true;
      }

      /* post-transmit: solo logs and moves on; a live run holds the suspense */
      function afterTransmit() {
        lockConsole();
        if (solo) {
          afterBox.innerHTML = '<div class="rally-sealed"><p class="rally-sealed-line">Score banked. ' + esc((cfg.suspense && cfg.suspense.sealed) || 'Teams are SEALED.') + '</p>' +
            '<p class="rally-sub">The live reveal happened in class — your points still count for your hidden team.</p></div>' +
            '<div class="rally-reveal"></div>' +
            '<div class="rung-actions"><button class="primary-btn" type="button">Continue</button></div>';
          afterBox.querySelector('.primary-btn').onclick = function () { ctx.next(); };
          ctx.call('tournament', { lessonId: ctx.lesson.id }).then(function (r) {
            if (r && r.ok && r.revealed) paintReveal(afterBox.querySelector('.rally-reveal'), r);
          });
          return;
        }
        /* Continue stays a GHOST during the wait - the reveal is the star of
           this screen, not the exit door (gate finding, engagement lens) */
        afterBox.innerHTML = '<div class="rally-sealed">' +
          '<p class="rally-sealed-line">' + esc((cfg.suspense && cfg.suspense.sealed) || 'Teams are SEALED.') + '</p>' +
          '<div class="rally-counter"><span class="panel-spinner"></span><span class="rally-counter-text">' + esc((cfg.suspense && cfg.suspense.waiting) || 'Scores are landing at HQ…') + '</span></div>' +
          '<p class="rally-sub">' + esc((cfg.suspense && cfg.suspense.revealTease) || 'Eyes on the big screen.') + '</p></div>' +
          '<div class="rally-reveal"></div>' +
          '<div class="rung-actions"><button class="ghost-btn rally-continue" type="button">Continue to the exit check</button></div>';
        afterBox.querySelector('.rally-continue').onclick = function () { stopPoll(); ctx.next(); };
        startPoll();
      }

      function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
      function startPoll() {
        var tick = function () {
          if (!document.body.contains(afterBox)) { stopPoll(); return; }
          ctx.call('tournament', { lessonId: ctx.lesson.id }).then(function (r) {
            if (!r || !r.ok || !document.body.contains(afterBox)) return;
            var t = afterBox.querySelector('.rally-counter-text');
            if (t) t.textContent = Number(r.n) === 1 ? '1 rig reporting in…' : Number(r.n || 0) + ' rigs reporting in…';
            if (r.revealed) {
              stopPoll();
              var sealed = afterBox.querySelector('.rally-sealed');
              if (sealed) sealed.hidden = true;
              paintReveal(afterBox.querySelector('.rally-reveal'), r);
            }
          });
        };
        tick();
        pollTimer = setInterval(tick, 5000);
      }

      /* the pupil-side echo of the projector reveal: my team, my colours */
      function paintReveal(box, r) {
        if (!box || box.childNodes.length) return;
        var teams = (r.teams || []).slice().sort(function (a, b) { return Number(b.total) - Number(a.total); });
        var top = teams.length ? Number(teams[0].total) || 1 : 1;
        var place = 0, myRow = null;
        teams.forEach(function (t, i) { if (t.mine) { place = i + 1; myRow = t; } });
        var suffix = place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th';
        var bars = teams.map(function (t, i) {
          var w = Math.max(6, Math.round((Number(t.total) / (top || 1)) * 100));
          return '<div class="rally-team' + (t.mine ? ' is-mine' : '') + '">' +
            '<span class="rally-team-name">' + esc(t.name) + (t.mine ? ' — YOU' : '') + '</span>' +
            '<span class="rally-team-track"><span class="rally-team-fill" style="width:' + w + '%"></span></span>' +
            '<span class="rally-team-total">' + Number(t.total) + '</span></div>';
        }).join('');
        box.innerHTML = '<div class="rally-declass">' +
          '<span class="reveal-kicker">THE TEAMS &mdash; REVEALED!</span>' +
          (myRow ? '<h3>You were on Team ' + esc(myRow.name) + ' — ' + place + suffix + ' place</h3>'
                 : '<h3>The teams stand revealed</h3>') +
          bars + '</div>';
        requestAnimationFrame(function () { box.classList.add('show'); });
        setTimeout(function () { box.classList.add('show'); }, 120); // hidden-tab rAF fallback
        /* the payoff has landed - Continue steps back into the spotlight */
        var contBtn = host.querySelector('.rally-continue');
        if (contBtn) { contBtn.classList.remove('ghost-btn'); contBtn.classList.add('primary-btn'); }
      }

      /* resume: a reloaded pupil who already transmitted lands back in the
         suspense room, not on a dead console */
      paint();
      if (submitted) { transmitBtn.disabled = true; afterTransmit(); }
    }
  };

  /* ================= casework (L4's Case Board) ============================
     Bug Detective, staged as an evidence board — NOT a ladder (Session 9 gate
     binding: L4 breaks the ladder+costed-hint+retest rhythm). Four case files
     pinned to a board; the training case (c1) unseals the rest IN ANY ORDER.
     The clue routine is a peer-consult protocol, not a point cost: HQ's clue
     (sprite only, never the fix) downgrades that case's stamp GOLD -> SILVER.
     Verification is the binding one: every case closes ONLY by re-playing the
     actual fixed Scratch game against a case-specific re-play script + a one
     sentence case log. No confirm-card marking exists anywhere in this engine.
     The tutorial video lives ON the board (Detective's Handbook), and the
     Release Desk (full-game RC check + ship-the-build to Drive via the generic
     artifactCheck, kinds:['sb3']) is a coda INSIDE the chunk — deliberately
     not a separate bank chunk (L2's Drive-drag gate stays unique). */
  Engines.casework = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config || {};
      var cases = cfg.cases || [];
      var solo = !!ctx.catchup;
      var draft = (ctx.draft && ctx.draft.casework) || {};
      var closed = (draft.closed || []).slice();
      var silver = (draft.silver || []).slice();
      var logs = Object.assign({}, draft.logs || {});
      var gg = !!draft.gg;          // evidence intake confirmed
      var rcDone = !!draft.rc;      // release-candidate full run done
      var rcScoreVal = Number(draft.rcs || 0); // score the RC run finished on
      var shipped = !!draft.ship;   // .sb3 landed in Drive (HQ-verified)
      var shipSkipped = !!draft.sk; // teacher-sanctioned skip
      var stretchDone = !!draft.stretch;
      var stretchNote = String(draft.sn || '');

      function saveBoard() {
        if (ctx.review) return;
        App.state.draft = App.state.draft || {};
        App.state.draft.casework = {
          closed: closed, silver: silver, logs: logs, gg: gg ? 1 : 0,
          rc: rcDone ? 1 : 0, rcs: rcScoreVal, ship: shipped ? 1 : 0,
          sk: shipSkipped ? 1 : 0, stretch: stretchDone ? 1 : 0, sn: stretchNote
        };
        ctx.saveEvent({ draft: App.state.draft });
      }

      var isClosed = function (id) { return closed.indexOf(String(id)) !== -1; };
      var isSilver = function (id) { return silver.indexOf(String(id)) !== -1; };
      var allClosed = function () {
        return cases.length && cases.every(function (cs) { return isClosed(cs.id); });
      };
      var caseUnsealed = function (cs) {
        if (!gg) return false;
        if (cs.training) return true;
        var trainingId = (cases.filter(function (c) { return c.training; })[0] || cases[0]).id;
        return isClosed(trainingId);
      };

      function starsHtml(n) {
        var out = '';
        for (var i = 0; i < 5; i++) out += '<span class="case-star' + (i < n ? ' lit' : '') + '">&#9733;</span>';
        return out;
      }
      function spannersHtml(n) {
        var out = '';
        for (var i = 0; i < n; i++) out += '&#128295;';
        return '<span class="case-spanners" title="difficulty">' + out + '</span>';
      }
      function stampHtml(id, mini) {
        return '<span class="case-stamp ' + (isSilver(id) ? 'silver' : 'gold') + (mini ? ' mini' : '') + '">CASE CLOSED</span>';
      }

      /* ---------- review reopen: static stamped board + logs, zero writes ---------- */
      if (ctx.review) {
        var rows = cases.map(function (cs) {
          return '<div class="case-review-row">' +
            '<span class="case-tab">' + esc(cs.num) + '</span><b>' + esc(cs.name) + '</b>' +
            (isClosed(cs.id) ? stampHtml(cs.id, true) : '<span class="case-open-note">left open</span>') +
            (logs[cs.id] ? '<p class="case-log-quote">&ldquo;' + esc(logs[cs.id]) + '&rdquo;</p>' : '') +
            '</div>';
        }).join('');
        host.appendChild(el('<div class="card case-review"><span class="intro-kicker">' + esc(chunk.title) + '</span>' +
          '<h2>Your case files, on record</h2>' + rows +
          (stretchDone ? '<p class="case-review-extra">&#11088; The Jellyfish Job: taken and closed.' + (draft.sn ? ' &ldquo;' + esc(String(draft.sn)) + '&rdquo;' : '') + '</p>' : '') +
          /* DFM 167b: "Vault" is Lesson 1's machine. Calling Drive a vault here
             gave one name two meanings — Drive is Drive on every L4 surface. */
          '<p class="case-review-extra">' + (draft.ship ? 'The fixed game is saved in your Drive.' : 'The fixed build lives on in Scratch.') + '</p>' +
          '<button class="primary-btn" type="button">Continue</button></div>'));
        host.querySelector('button').onclick = function () { ctx.next(); };
        return;
      }

      /* ---------- intro ---------- */
      var began = gg || closed.length;
      introCard(host, {
        kicker: chunk.title,
        title: cfg.title || 'The Case Board',
        text: (solo && cfg.introSolo) ? cfg.introSolo : (cfg.intro || ''),
        steps: cfg.introSteps,
        after: cfg.introAfter,
        extra: (solo ? '' : (cfg.pairNote ? '<p class="case-pair-note">&#128101; ' + esc(cfg.pairNote) + '</p>' : ''))
      }, began ? 'Back to the board' : 'Open the case board', boardView);

      /* ---------- the board ---------- */
      function boardView() {
        host.innerHTML = '';
        var closedCount = cases.filter(function (cs) { return isClosed(cs.id); }).length;
        var releaseOpen = allClosed();
        var caseCards = cases.map(function (cs, i) {
          var sealed = !caseUnsealed(cs);
          var done = isClosed(cs.id);
          return '<button class="case-pin case-file tilt' + (i % 4) + (sealed ? ' sealed' : '') + (done ? ' closed' : '') + '" data-case="' + esc(cs.id) + '" type="button"' + (sealed ? ' disabled' : '') + '>' +
            '<span class="case-pin-dot"></span>' +
            '<span class="case-tab">' + esc(cs.num) + (cs.training ? ' &middot; TRAINING' : '') + '</span>' +
            '<b class="case-name">' + esc(cs.name) + '</b>' +
            '<span class="case-stars">' + starsHtml(cs.stars) + '</span>' +
            spannersHtml(cs.spanners) +
            /* "SEALED" is a STATE, not a reason — and a state with no reason is the exact
   fault Damien hit on the re-play stamp. The Release Desk pin two rows down
   already got this right ("SEALED UNTIL ALL 4 CLOSE"); the case pins did not,
   and sit-wrongpath caught it on its first run (12 Aug 2026). The wording is
   content's (rule 172), and it names the ONE thing that unseals it. */
            (done ? stampHtml(cs.id, true) : (sealed
              ? '<span class="case-sealed-ribbon">' + esc(!gg
                  ? (cfg.sealedNoKit || 'SEALED UNTIL YOU HAVE THE GAME')
                  : (cfg.sealedRibbon || 'SEALED UNTIL CASE 01 CLOSES')) + '</span>'
              : '<span class="case-open-chip">OPEN</span>')) +
            '</button>';
        }).join('');
        var stretchSealed = !gg || !caseUnsealed({ training: false });
        var stretchCard = cfg.stretchCase
          ? '<button class="case-pin case-file case-stretch tilt2' + (stretchSealed ? ' sealed' : '') + (stretchDone ? ' closed' : '') + '" type="button"' + (stretchSealed ? ' disabled' : '') + '>' +
            '<span class="case-pin-dot"></span>' +
            '<span class="case-tab">' + esc(cfg.stretchCase.num) + ' &middot; STRETCH</span>' +
            '<b class="case-name">' + esc(cfg.stretchCase.name) + '</b>' +
            '<span class="case-stars">' + starsHtml(cfg.stretchCase.stars) + '</span>' +
            (stretchDone ? '<span class="case-stamp gold mini">JOB DONE</span>' : (stretchSealed
              ? '<span class="case-sealed-ribbon">' + esc((cfg.stretchCase && cfg.stretchCase.sealedRibbon) ||
                  'SEALED UNTIL CASE 01 CLOSES') + '</span>'
              : '<span class="case-open-chip">FEATURE REQUEST</span>')) +
            '</button>'
          : '';
        var b = el('<div class="case-board">' +
          '<div class="case-board-head"><span class="case-board-brand">OLS GAMES &middot; QA DIVISION</span>' +
          '<h2>The Case Board</h2>' +
          '<span class="case-board-count">' + closedCount + ' of ' + cases.length + ' cases closed</span></div>' +
          '<div class="case-board-grid">' +
          '<button class="case-pin case-tool tilt1" data-view="handbook" type="button"><span class="case-pin-dot"></span>' +
          '<span class="case-tool-icon">&#127909;</span><b>Detective&rsquo;s Handbook</b><span class="case-tool-note">training film &middot; watch any time</span></button>' +
          '<button class="case-pin case-tool tilt3' + (gg ? ' done' : '') + '" data-view="intake" type="button"><span class="case-pin-dot"></span>' +
          '<span class="case-tool-icon">&#128229;</span><b>Evidence Intake</b><span class="case-tool-note">' + (gg ? 'broken game secured &#10003;' : 'START HERE &middot; get the broken game') + '</span></button>' +
          caseCards + stretchCard +
          '<button class="case-pin case-release tilt0' + (releaseOpen ? '' : ' sealed') + '" data-view="release" type="button"' + (releaseOpen ? '' : ' disabled') + '>' +
          '<span class="case-pin-dot"></span><span class="case-tab">RELEASE DESK</span>' +
          '<b class="case-name">Ship the fixed game</b>' +
          (releaseOpen ? '<span class="case-open-chip">' + (shipped || shipSkipped ? 'signed off' : 'ALL CASES CLOSED &mdash; GO') + '</span>' : '<span class="case-sealed-ribbon">SEALED UNTIL ALL 4 CLOSE</span>') +
          '</button>' +
          '</div>' +
          (cfg.boardTip ? '<p class="case-board-tip">' + cfg.boardTip + '</p>' : '') +
          '</div>');
        host.appendChild(b);
        b.querySelectorAll('.case-file[data-case]').forEach(function (btn) {
          btn.onclick = function () {
            var cs = cases.filter(function (c) { return String(c.id) === btn.getAttribute('data-case'); })[0];
            caseView(cs);
          };
        });
        var hb = b.querySelector('[data-view="handbook"]');
        hb.onclick = function () { handbookView(); };
        b.querySelector('[data-view="intake"]').onclick = function () { intakeView(); };
        var rel = b.querySelector('[data-view="release"]');
        if (releaseOpen) rel.onclick = function () { releaseView(); };
        var st = b.querySelector('.case-stretch');
        if (st && !stretchSealed) st.onclick = function () { stretchView(); };
      }

      function backRow(label) {
        return '<button class="ghost-btn case-back" type="button">&larr; ' + esc(label || 'Pin it back on the board') + '</button>';
      }
      function wireBack(card) {
        card.querySelector('.case-back').onclick = function () { host.innerHTML = ''; boardView(); };
      }

      /* ---------- evidence intake (get the broken game) ---------- */
      function intakeView() {
        host.innerHTML = '';
        var g = cfg.getgame || {};
        var steps = (g.steps || []).map(function (s) {
          return '<li><span class="af-icon">' + esc(s.icon || '') + '</span><div><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p></div></li>';
        }).join('');
        var c = el('<div class="card case-filecard"><span class="intro-kicker">EVIDENCE INTAKE</span>' +
          '<h2>Get the broken game</h2>' +
          '<p class="intro-lead">' + esc(g.intro || '') + '</p>' +
          '<p class="case-getgame-btns">' +
          '<a class="primary-btn case-dl" href="' + esc(asset(g.file || '')) + '" download>&#11015;&#65039; Download the broken game</a> ' +
          '<a class="ghost-btn" href="' + esc(g.url || 'https://scratch.mit.edu/projects/editor/') + '" target="_blank" rel="noopener">Open the Scratch editor &#8599;</a></p>' +
          '<ol class="af-steps">' + steps + '</ol>' +
          '<button class="confirm-step" type="button"' + (gg ? ' disabled' : '') + '><span class="confirm-box' + (gg ? ' done' : '') + '"></span><span>' + esc(g.confirm || 'The broken game is open in Scratch and I can see its code') + '</span></button>' +
          backRow() + '</div>');
        host.appendChild(c);
        wireBack(c);
        if (!gg) c.querySelector('.confirm-step').onclick = function () {
          this.classList.add('ticked');
          gg = true;
          saveBoard();
          App.toast('Evidence secured &mdash; Case 01 is unsealed.');
          setTimeout(function () { host.innerHTML = ''; boardView(); }, 650);
        };
      }

      /* ---------- the handbook (tutorial video, pinned to the board) ---------- */
      function handbookView() {
        host.innerHTML = '';
        var v = cfg.handbook || {};
        if (!v.src) {
          var c0 = el('<div class="card case-filecard"><span class="intro-kicker">DETECTIVE&rsquo;S HANDBOOK</span>' +
            '<h2>&#127909; Training film on its way</h2><p>' + esc(v.fallback || 'The handbook film is being made. Your teacher’s demo covers everything it will show.') + '</p>' +
            backRow() + '</div>');
          host.appendChild(c0);
          wireBack(c0);
          return;
        }
        var chapters = (v.chapters || []).map(function (ch) {
          return '<button class="vid-chapter" data-t="' + Number(ch.t) + '" type="button">' + esc(ch.label) + '</button>';
        }).join('');
        var c = el('<div class="card video-card case-filecard"><span class="intro-kicker">DETECTIVE&rsquo;S HANDBOOK</span>' +
          '<h2>' + esc(v.title || 'How to read someone else’s code') + '</h2>' +
          '<video controls preload="metadata" playsinline ' + (v.poster ? 'poster="' + esc(asset(v.poster)) + '"' : '') + ' src="' + esc(asset(v.src)) + '"></video>' +
          (chapters ? '<div class="vid-chapters">' + chapters + '</div>' : '') +
          '<p class="case-handbook-note">' + fmtBold(cfg.handbookNote || 'Come back to this film any time. Chapter 3 helps most while you are working on a case.') + '</p>' +
          backRow() + '</div>');
        host.appendChild(c);
        var vid = c.querySelector('video');
        c.querySelectorAll('.vid-chapter').forEach(function (bch) {
          bch.onclick = function () { vid.currentTime = Number(bch.getAttribute('data-t')); vid.play(); };
        });
        wireBack(c);
      }

      /* ---------- a case file ---------- */
      function caseView(cs) {
        host.innerHTML = '';
        var done = isClosed(cs.id);
        var wasSilver = isSilver(cs.id);
        var clue = cs.clue || {};

        if (done) {
          var cDone = el('<div class="card case-filecard closed-file"><span class="intro-kicker">' + esc(cs.num) + '</span>' +
            '<h2>' + esc(cs.name) + '</h2>' +
            stampHtml(cs.id) +
            '<div class="case-ticket"><span class="case-stars">' + starsHtml(cs.stars) + '</span>' +
            '<p>&ldquo;' + esc(cs.ticket) + '&rdquo;</p><span class="case-player">&mdash; ' + esc(cs.player) + '</span></div>' +
            (logs[cs.id] ? '<div class="case-log-final"><b>Your case log:</b><p>&ldquo;' + esc(logs[cs.id]) + '&rdquo;</p></div>' : '') +
            backRow() + '</div>');
          host.appendChild(cDone);
          wireBack(cDone);
          return;
        }

        var logText = logs[cs.id] || '';
        var c = el('<div class="card case-filecard"><span class="intro-kicker">' + esc(cs.num) + (cs.training ? ' &middot; TRAINING CASE' : '') + '</span>' +
          '<h2>' + esc(cs.name) + '</h2>' +
          '<div class="case-ticket"><span class="case-stars">' + starsHtml(cs.stars) + '</span>' +
          '<p>&ldquo;' + esc(cs.ticket) + '&rdquo;</p><span class="case-player">&mdash; ' + esc(cs.player) + '</span></div>' +
          (cs.img ? '<figure class="case-evidence"><img src="' + esc(asset(cs.img.src)) + '" alt="' + esc(cs.img.alt || '') + '" loading="lazy">' +
            (cs.img.caption ? '<figcaption>' + esc(cs.img.caption) + '</figcaption>' : '') + '</figure>' : '') +
          '<div class="case-step"><span class="case-step-tag">1 &middot; SEE IT HAPPEN</span><p>' + esc(cs.symptom) + '</p></div>' +
          '<div class="case-step"><span class="case-step-tag">2 &middot; READ THE CODE</span><p>' + esc(cs.look) + '</p>' +
          '<p class="case-one-thing">&#128269; Find the ONE thing wrong &mdash; don&rsquo;t rebuild the whole script.</p>' +
          '<div class="case-clue"></div></div>' +
          '<div class="case-step"><span class="case-step-tag">3 &middot; FIX IT &amp; FILE THE LOG</span>' +
          '<p>' + fmtBold(cfg.logLead || 'Make your fix in Scratch. Then write your case log in the box just below — one sentence with two halves: **what was wrong**, and **what you changed**.') + '</p>' +
          (cs.mechanicSteps && cs.mechanicSteps.length
            ? '<p class="case-mechanic">&#128295; <b>Doing that in Scratch:</b></p><ol class="case-mech-steps">' +
              cs.mechanicSteps.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol>'
            : (cs.mechanic ? '<p class="case-mechanic">&#128295; <b>Doing that in Scratch:</b> ' + esc(cs.mechanic) + '</p>' : '')) +
          '<textarea class="case-log-input" maxlength="200" placeholder="' + esc(cs.logHint || 'The bug was... so I...') + '">' + esc(logText) + '</textarea>' +
          '</div>' +
          '<div class="case-step"><span class="case-step-tag">4 &middot; RE-PLAY TO PROVE IT</span>' +
          '<p>' + esc(cs.replay) + '</p>' +
          '<p class="case-honesty">' + fmtBold(cfg.proofNote || 'This tick is a promise. It says: I played the game again, and I watched the bug NOT happen.') + '</p>' +
          /* DFM 192f/193a: the reason a control is locked lives AT the control.
             This note is rendered from the start and only removed when the tick
             genuinely unlocks — the shipped bug was that the explanation lived
             two steps away AND stayed blank while the log box was empty, which
             is the exact state Damien sat in. */
          '<p class="case-locked-note"></p>' +
          '<button class="confirm-step case-close-btn locked" type="button" aria-disabled="true"><span class="confirm-box"></span><span>' + esc(cs.replayConfirm) + '</span></button></div>' +
          '<div class="case-stampzone"></div>' +
          backRow() + '</div>');
        host.appendChild(c);
        wireBack(c);

        /* clue routine: free re-read -> peer consult -> HQ clue (stamp goes silver) */
        var clueBox = c.querySelector('.case-clue');
        function paintClue() {
          if (wasSilver || isSilver(cs.id)) {
            clueBox.innerHTML = '<div class="case-clue-open"><p><b>HQ&rsquo;s clue:</b> ' + esc(clue.hq || '') + '</p>' +
              '<p class="case-clue-cost">' + fmtBold(cfg.clueSilverNote || 'You took HQ’s clue, so this case stamps SILVER when it closes. A silver case still counts — solve the next one without the clue for GOLD.') + '</p></div>';
            return;
          }
          clueBox.innerHTML = '<button class="ghost-btn case-clue-btn" type="button">' + esc(cfg.clueButton || 'Stuck? Open the help steps') + '</button>';
          clueBox.querySelector('.case-clue-btn').onclick = function () {
            clueBox.innerHTML = '<div class="case-clue-open">' +
              '<p><b>' + esc(cfg.clueStep1Head || 'Help step 1 — costs nothing') + ':</b> ' + esc(clue.free || 'Re-read the ticket. What EXACTLY does the player say happens?') + '</p>' +
              '<p><b>' + esc(cfg.clueStep2Head || 'Help step 2 — ask another agency') + ':</b> ' + esc(solo ? (clue.consultSolo || 'No other agencies on shift right now — go straight to Step 3 if Step 1 didn’t crack it.') : (clue.consult || 'Consult another agency that has CLOSED this case. One question, detective to detective.')) + '</p>' +
              '<button class="ghost-btn case-hq-btn" type="button">' + esc(cfg.clueHqButton || 'Help step 3 — show HQ’s clue (this case will then stamp SILVER instead of GOLD)') + '</button></div>';
            clueBox.querySelector('.case-hq-btn').onclick = function () {
              if (!isSilver(cs.id)) { silver.push(String(cs.id)); saveBoard(); }
              paintClue();
            };
          };
        }
        paintClue();

        /* The log gates the close button - a case without a log isn't casework.
           WHAT THIS GATE MAY NOT DO (DFM 193a, written from Damien's own sit):
           it used to demand one of eight listed words (hat/trigger/event/when/
           key/top/arrow/start). That is a hidden vocabulary test on a child's
           own sentence, and it marked honest answers WRONG - "it was missing
           the block that makes it move, so I added one" failed it. The machine
           never vets a pupil's words. Only two honesty floors remain: enough of
           a sentence to be a log at all (>=6 words), and enough of it her own
           that the hint stem alone cannot clear it (>=3 words). Judging the
           log's QUALITY is the teacher's job at the desk, exactly as the brief
           says - and the real proof is still the re-play, not the text. */
        var ta = c.querySelector('.case-log-input');
        var closeBtn = c.querySelector('.case-close-btn');
        var lockedNote = c.querySelector('.case-locked-note');
        var stemWords = String(cs.logHint || '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
        function logProblem() {
          var raw = ta.value.trim();
          var low = raw.toLowerCase();
          var words = low.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
          if (words.length < 6) return fmtBold(cfg.nudgeShort || 'Your log needs both halves in one sentence: what was wrong, and what you changed.');
          var own = words.filter(function (w) { return stemWords.indexOf(w) === -1; });
          if (own.length < 3) return fmtBold(cfg.nudgeOwnWords || 'Say it in your OWN words — the grey line in the box is only a starter.');
          return '';
        }
        function gateClose() {
          var p = ta.value.trim()
            ? logProblem()
            : fmtBold(cfg.lockedNote || 'This stamp is locked until your case log in step 3 is written — both halves.');
          if (p) {
            closeBtn.classList.add('locked');
            closeBtn.setAttribute('aria-disabled', 'true');
            lockedNote.innerHTML = p;
            lockedNote.hidden = false;
          } else {
            closeBtn.classList.remove('locked');
            closeBtn.removeAttribute('aria-disabled');
            lockedNote.innerHTML = '';
            lockedNote.hidden = true;
          }
        }
        ta.oninput = function () {
          logs[cs.id] = ta.value.trim();
          gateClose();
        };
        ta.onblur = function () { saveBoard(); };
        gateClose();

        closeBtn.onclick = function () {
          /* Locked is not mute and not dead: the click gets an answer, and the
             answer points at the box that unlocks it. DFM 42/85/161. */
          if (closeBtn.classList.contains('locked')) {
            lockedNote.classList.remove('pulse');
            void lockedNote.offsetWidth;            // restart the animation
            lockedNote.classList.add('pulse');
            ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
            ta.classList.add('flash');
            setTimeout(function () { ta.classList.remove('flash'); }, 1000);
            ta.focus();
            return;
          }
          if (isClosed(cs.id)) return;          // double-tap / stale view guard
          /* Disabled AFTER a successful close is a finished control, not a mute
             lock: it ticks, the CASE CLOSED stamp lands beside it, and the board
             returns in 1.5s. qa-no-mute-locks exempts .ticked for that reason. */
          closeBtn.disabled = true;
          lockedNote.hidden = true;
          logs[cs.id] = ta.value.trim();
          closed.push(String(cs.id));
          saveBoard();
          closeBtn.classList.add('ticked');
          var zone = c.querySelector('.case-stampzone');
          zone.innerHTML = '<span class="case-stamp big ' + (isSilver(cs.id) ? 'silver' : 'gold') + '">CASE CLOSED</span>';
          var stamp = zone.firstChild;
          requestAnimationFrame(function () { stamp.classList.add('land'); });
          setTimeout(function () { stamp.classList.add('land'); }, 150); // hidden-tab rAF fallback
          var left = cases.filter(function (x) { return !isClosed(x.id); }).length;
          setTimeout(function () {
            App.toast(left ? (cs.training ? 'Training case closed &mdash; Cases 02&ndash;04 are UNSEALED. Take them in any order.' : left + ' case' + (left > 1 ? 's' : '') + ' still open.') : 'All four cases closed &mdash; the RELEASE DESK is open.');
            host.innerHTML = '';
            boardView();
          }, 1500);
        };
      }

      /* ---------- stretch: the feature-request job ---------- */
      function stretchView() {
        host.innerHTML = '';
        var s = cfg.stretchCase;
        var c = el('<div class="card case-filecard"><span class="intro-kicker">' + esc(s.num) + ' &middot; STRETCH &middot; FEATURE REQUEST</span>' +
          '<h2>' + esc(s.name) + '</h2>' +
          '<div class="case-ticket feature"><span class="case-stars">' + starsHtml(s.stars) + '</span>' +
          '<p>&ldquo;' + esc(s.ticket) + '&rdquo;</p><span class="case-player">&mdash; ' + esc(s.player) + '</span></div>' +
          '<div class="case-step"><span class="case-step-tag">THE JOB</span><p>' + esc(s.job) + '</p>' +
          (s.img ? '<img class="rung-img" src="' + esc(asset(s.img)) + '" alt="Starter blocks for the jellyfish">' : '') + '</div>' +
          '<div class="case-step"><span class="case-step-tag">PROVE IT</span><p>' + esc(s.test) + '</p>' +
          '<p class="case-rc-ask">' + esc(s.ask || 'One line for the release notes: what did you add, and what does it do to the player?') + '</p>' +
          '<textarea class="case-log-input case-stretch-note" maxlength="200" placeholder="' + esc(s.notePlaceholder || 'I added... and now...') + '"' + (stretchDone ? ' disabled' : '') + '>' + esc(stretchNote) + '</textarea>' +
          '<p class="case-locked-note"></p>' +
          '<button class="confirm-step' + (stretchDone ? '' : ' locked') + '" type="button"' + (stretchDone ? '' : ' aria-disabled="true"') + '><span class="confirm-box' + (stretchDone ? ' done' : '') + '"></span><span>' + esc(s.confirm) + '</span></button></div>' +
          backRow() + '</div>');
        host.appendChild(c);
        wireBack(c);
        var snBox = c.querySelector('.case-stretch-note');
        var snBtn = c.querySelector('.confirm-step');
        var snNote = c.querySelector('.case-locked-note');
        if (!stretchDone) {
          /* DFM 192f: same mute-lock family as the case tick — it now says what
             unlocks it, from the first render, with the box still empty. */
          snBox.oninput = function () {
            stretchNote = snBox.value.trim();
            var short = stretchNote.replace(/[^a-z0-9 ]/gi, ' ').split(/\s+/).filter(Boolean).length < 6;
            snBtn.classList.toggle('locked', short);
            if (short) snBtn.setAttribute('aria-disabled', 'true'); else snBtn.removeAttribute('aria-disabled');
            snNote.innerHTML = short ? fmtBold(s.lockedNote || 'This tick unlocks when your release note above is written — a full sentence.') : '';
            snNote.hidden = !short;
          };
          snBox.oninput();
        } else { snNote.hidden = true; }
        if (!stretchDone) c.querySelector('.confirm-step').onclick = function () {
          if (this.classList.contains('locked')) {
            snNote.classList.remove('pulse');
            void snNote.offsetWidth;
            snNote.classList.add('pulse');
            snBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            snBox.classList.add('flash');
            setTimeout(function () { snBox.classList.remove('flash'); }, 1000);
            snBox.focus();
            return;
          }
          this.classList.add('ticked');
          stretchDone = true;
          saveBoard();
          App.toast('Feature shipped. The players are thrilled (and in danger).');
          // if the build already shipped, the job was the last open file - clock off
          setTimeout(function () {
            host.innerHTML = '';
            if (shipped || shipSkipped) finishBoard(); else boardView();
          }, 700);
        };
      }

      /* ---------- release desk: RC check then ship-to-Drive ---------- */
      function releaseView() {
        host.innerHTML = '';
        var r = cfg.rc || {};
        var sh = cfg.ship || {};
        var c = el('<div class="card case-filecard"><span class="intro-kicker">RELEASE DESK</span>' +
          '<h2>' + esc(r.title || 'Release Candidate check') + '</h2>' +
          '<div class="case-step"><span class="case-step-tag">THE FULL RUN</span>' +
          '<p>' + esc(r.text || '') + '</p>' +
          '<ul class="case-rc-list">' + (r.watch || []).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
          /* the backstop must not be the easiest tap on the board (gate run):
             the score you finished on can only be known by actually running it */
          '<p class="case-rc-ask">' + esc(r.ask || 'What score did you finish the full run on?') + '</p>' +
          '<input class="case-rc-score" type="number" min="1" max="999" inputmode="numeric" placeholder="fish caught"' + (rcDone ? ' disabled value="' + Number(draft.rcs || 0) + '"' : '') + '>' +
          '<p class="case-locked-note"></p>' +
          '<button class="confirm-step case-rc-btn' + (rcDone ? '' : ' locked') + '" type="button"' + (rcDone ? '' : ' aria-disabled="true"') + '><span class="confirm-box' + (rcDone ? ' done' : '') + '"></span><span>' + esc(r.confirm || 'Full run clean — every fix held') + '</span></button></div>' +
          '<div class="case-ship" ' + (rcDone ? '' : 'hidden') + '></div>' +
          backRow() + '</div>');
        host.appendChild(c);
        wireBack(c);
        var shipBox = c.querySelector('.case-ship');

        function paintShip() {
          if (shipped || shipSkipped) {
            shipBox.innerHTML = '<div class="dc-row ok"><span class="dc-mark">&#10003;</span><span>' +
              (shipped ? 'Build shipped &mdash; the fixed game is in your Drive.' : 'Signed off without the Drive copy.') + '</span></div>' +
              '<button class="primary-btn case-finish-btn" type="button">Wrap up the board</button>';
            var fb = shipBox.querySelector('.case-finish-btn');
            fb.onclick = function () { maybeFinish(); };
            return;
          }
          var steps = (sh.steps || []).map(function (s) {
            return '<li><span class="af-icon">' + esc(s.icon || '') + '</span><div><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p></div></li>';
          }).join('');
          shipBox.innerHTML = '<span class="case-step-tag">SHIP IT</span>' +
            '<p>' + esc(sh.intro || '') + '</p>' +
            '<ol class="af-steps">' + steps + '</ol>' +
            '<div class="rung-actions">' +
            '<button class="primary-btn case-ship-btn" type="button">' + esc((cfg.ship && cfg.ship.checkLabel) || 'Run the HQ Inspection') + '</button>' +
            '<button class="ghost-btn case-ship-skip" type="button" hidden>Sign off without the Drive copy (ask your teacher first)</button>' +
            '</div><div class="af-result"></div>';
          var runBtn = shipBox.querySelector('.case-ship-btn');
          var skipBtn = shipBox.querySelector('.case-ship-skip');
          var box = shipBox.querySelector('.af-result');
          var tries = 0;
          skipBtn.onclick = function () { shipSkipped = true; saveBoard(); paintShip(); };
          runBtn.onclick = function () {
            runBtn.disabled = true;
            box.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>HQ is looking inside your Drive&hellip;</span></div>';
            ctx.call('artifactCheck', { lessonNum: String(ctx.lessonEntry.num), kinds: sh.kinds || ['sb3'], hours: sh.hours || 3 }).then(function (res) {
              runBtn.disabled = false;
              tries++;
              if (!res || !res.ok) {
                box.innerHTML = '<div class="dc-row miss"><span class="dc-mark">&#10007;</span><span>The line to HQ dropped &mdash; try again in a moment.</span></div>';
                return;
              }
              if (res.found) {
                shipped = true;
                saveBoard();
                box.innerHTML = '<div class="dc-row ok"><span class="dc-mark">&#10003;</span><span>HQ found <b>' + esc(res.name) + '</b> in your School &rarr; DT Work folder.</span></div>' +
                  (res.simulated ? '<p class="dc-sim">(Preview mode: this inspection is simulated &mdash; the live platform checks your real Drive.)</p>' : '');
                setTimeout(paintShip, 900);
              } else {
                box.innerHTML = '<div class="dc-row miss"><span class="dc-mark">&#10007;</span><span>' +
                  (res.noFolder ? 'HQ could not find your School &gt; DT Work folder in Drive &mdash; build it (+ New &rarr; Folder), then inspect again.'
                    : 'No freshly-saved .sb3 found in DT Work yet &mdash; check the save and the drag, then inspect again.') + '</span></div>';
                if (tries >= 2) skipBtn.hidden = false;
              }
            });
          };
        }

        var rcBtn = c.querySelector('.case-rc-btn');
        var rcScore = c.querySelector('.case-rc-score');
        var rcNote = c.querySelector('.case-locked-note');
        if (rcDone) { rcBtn.disabled = true; rcNote.hidden = true; paintShip(); }
        else {
          /* DFM 192f: third member of the mute-lock family — it announces its
             own unlock instead of sitting dead beside an empty number box. */
          rcScore.oninput = function () {
            var v = Number(rcScore.value);
            var bad = !(v >= 1 && v <= 999);
            rcBtn.classList.toggle('locked', bad);
            if (bad) rcBtn.setAttribute('aria-disabled', 'true'); else rcBtn.removeAttribute('aria-disabled');
            rcNote.innerHTML = bad ? fmtBold(r.lockedNote || 'This button unlocks when you type the number of fish you caught into the box above.') : '';
            rcNote.hidden = !bad;
          };
          rcScore.oninput();
          rcBtn.onclick = function () {
            if (rcBtn.classList.contains('locked')) {
              rcNote.classList.remove('pulse');
              void rcNote.offsetWidth;
              rcNote.classList.add('pulse');
              rcScore.scrollIntoView({ behavior: 'smooth', block: 'center' });
              rcScore.classList.add('flash');
              setTimeout(function () { rcScore.classList.remove('flash'); }, 1000);
              rcScore.focus();
              return;
            }
            rcBtn.classList.add('ticked');
            rcBtn.disabled = true;
            rcNote.hidden = true;
            rcScore.disabled = true;
            rcDone = true;
            rcScoreVal = Number(rcScore.value) || 0;
            saveBoard();
            shipBox.hidden = false;
            paintShip();
          };
        }
      }

      /* stretch nudge on the way out, then the badge */
      function maybeFinish() {
        if (cfg.stretchCase && !stretchDone) {
          host.innerHTML = '';
          var c = el('<div class="card case-filecard"><span class="intro-kicker">ONE FILE LEFT</span>' +
            '<h2>The Jellyfish Job is still pinned open</h2>' +
            '<p class="intro-lead">' + esc(cfg.stretchNudge || 'The build has shipped — but a five-star feature request is still on the board. Take the job, or clock off?') + '</p>' +
            '<div class="rung-actions">' +
            '<button class="primary-btn" type="button">Take the job &#11088;</button>' +
            '<button class="ghost-btn" type="button">Clock off</button></div></div>');
          host.appendChild(c);
          var btns = c.querySelectorAll('button');
          btns[0].onclick = function () { host.innerHTML = ''; stretchView(); };
          btns[1].onclick = function () { finishBoard(); };
          return;
        }
        finishBoard();
      }

      function finishBoard() {
        /* count from the CASE LIST, never from the closed array's length -
           a replayed/duplicated entry must never inflate the award */
        var gold = 0, closedCount = 0;
        cases.forEach(function (cs) {
          if (!isClosed(cs.id)) return;
          closedCount++;
          if (!isSilver(cs.id)) gold++;
        });
        var xp = 4 + closedCount * 4 + gold + (rcDone ? 2 : 0) + (shipped ? 3 : 0) + (stretchDone ? 3 : 0);
        var badge = Object.assign({}, ctx.chunk.badge, { xp: xp });
        var detail = 'cw=' + closedCount + '/' + cases.length +
          ';g=' + gold + ';rc=' + (rcDone ? 1 : 0) + ';ship=' + (shipped ? 1 : 0) + (stretchDone ? ';s=1' : '');
        ctx.awardBadge(badge, detail).then(function () { ctx.next(); });
      }
    }
  };

  /* ================= studio (L5 Game Studio: contracts + the QA Desk) =======
     Two chunks share this engine via config.phase.
     'sign'  - a genuine CHOICE with commitment: three contract cards, one
               studio founded and NAMED before any teaching lands (media-
               computation: "a programme about something you chose"). Re-sign
               is allowed only until QA work exists; the badge detail is
               phase-stable ('sign=1') so tearing up a contract can never
               re-award XP.
     'build' - the Studio Desk: get the kit, read the blueprint, build in
               Scratch, then THE QA DESK - the block's distinct verification
               UI (L4 gate binding): four brief criteria, each a concrete
               observable TEST + an observed-OUTCOME question whose
               distractors are the real failure states. A pass lights the
               tick; a fail sets the cross AND reveals that failure's fix
               card - crosses are the job ("FOUND BY QA"), not shame. The
               READY FOR GALLERY button physically lights on the 4th tick.
               Submission = publishing the marquee listing (galleryOpen) -
               deliberately NOT a Drive/artifactCheck step (L2/L3/L4 spent
               that interaction; gate binding).
     Honesty envelope (accepted, as L4): a pupil can lie-pick the pass
     outcome - mitigations are the QA-partner protocol (brief), teacher
     circulation, and Press Night itself: the class plays what you shipped. */
  function stdShuffle(a) {
    var out = a.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
  Engines.studio = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config || {};
      if (cfg.phase === 'build') return Engines.studio._build(host, chunk, ctx);
      return Engines.studio._sign(host, chunk, ctx);
    },

    /* ---------- phase 1: the contracts ---------- */
    _sign: function (host, chunk, ctx) {
      var cfg = chunk.config || {};
      /* ---- PUPIL SENTENCES LIVE IN CONTENT (rule 172; L5 spec Part D2) ----
         Damien met four engine literals on one Lesson 4 card that no gate could
         see, because the language harness reads CONTENT and these were code
         (DFM 192g). Casework's moved in the last round; the studio and gallery
         move now. `S(key, fallback)` keeps the engine's own words as the
         fallback, so nothing shifts on screen until content says otherwise, and
         the ledger and the banned-word sweep own every one of them the moment
         it does. */
      var S = function (k, d) { var t = (cfg.strings || {})[k]; return (typeof t === 'string' && t) ? t : d; };
      var solo = !!ctx.catchup;
      var draft = (ctx.draft && ctx.draft.studio) || {};
      var tpl = String(draft.tpl || '');
      var sn = String(draft.sn || '');
      var qaStarted = draft.qa && Object.keys(draft.qa).length;

      function saveStudio() {
        if (ctx.review) return;
        App.state.draft = App.state.draft || {};
        var d = App.state.draft.studio = App.state.draft.studio || {};
        d.tpl = tpl; d.sn = sn;
        ctx.saveEvent({ draft: App.state.draft });
      }
      function contractOf(id) {
        return (cfg.contracts || []).filter(function (c) { return String(c.id) === String(id); })[0] || null;
      }

      /* review reopen: the signed contract on record, zero writes */
      if (ctx.review) {
        var rc = contractOf(tpl);
        host.appendChild(el('<div class="card std-review"><span class="intro-kicker">' + esc(chunk.title) + '</span>' +
          '<h2>Contract on record</h2>' +
          (rc ? '<p class="intro-lead"><b>' + esc(sn || 'Your studio') + '</b> signed the <b>' + esc(rc.name) + '</b> contract.</p>'
              : '<p class="intro-lead">No contract was signed.</p>') +
          '<button class="primary-btn" type="button">Continue</button></div>'));
        host.querySelector('button').onclick = function () { ctx.next(); };
        return;
      }

      introCard(host, {
        kicker: chunk.title,
        title: cfg.title || 'Three contracts on the desk',
        text: (solo && cfg.introSolo) ? cfg.introSolo : (cfg.intro || '')
      }, tpl ? S('backToContracts', 'Back to the contracts') : S('seeContracts', 'See the contracts'), pickView);

      function pickView() {
        host.innerHTML = '';
        var cards = (cfg.contracts || []).map(function (c) {
          var signed = tpl === String(c.id);
          return '<button class="std-contract' + (signed ? ' signed' : '') + '" data-c="' + esc(c.id) + '" type="button">' +
            (c.img ? '<img class="std-contract-shot" src="' + esc(asset(c.img)) + '" alt="' + esc(c.imgAlt || c.name) + '" loading="lazy">' : '') +
            '<b class="std-contract-name">' + esc(c.name) + '</b>' +
            '<span class="std-contract-pitch">' + esc(c.pitch || '') + '</span>' +
            (signed ? '<span class="std-signed-chip">SIGNED' + (sn ? ' &middot; ' + esc(sn) : '') + '</span>' : '<span class="std-open-chip">OPEN</span>') +
            '</button>';
        }).join('');
        var briefItems = ((cfg.brief && cfg.brief.items) || []).map(function (it) {
          return '<li>' + esc(it) + '</li>';
        }).join('');
        var b = el('<div class="std-contracts">' +
          '<div class="std-head"><span class="std-brand">OLS GAMES &middot; COMMISSIONS</span>' +
          '<h2>' + esc((cfg.brief && cfg.brief.title) || 'Every contract carries the same brief') + '</h2>' +
          '<ul class="std-brief">' + briefItems + '</ul></div>' +
          '<div class="std-contract-row">' + cards + '</div>' +
          (cfg.signNote ? '<p class="std-note">' + esc(cfg.signNote) + '</p>' : '') +
          '</div>');
        host.appendChild(b);
        b.querySelectorAll('.std-contract').forEach(function (btn) {
          btn.onclick = function () { contractView(contractOf(btn.getAttribute('data-c'))); };
        });
      }

      function contractView(c) {
        if (!c) return;
        host.innerHTML = '';
        var mine = tpl === String(c.id);
        var ships = (c.ships || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
        var adds = (c.adds || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
        var signBlock;
        if (mine) {
          signBlock = '<div class="std-signature done"><span class="std-sig-name">' + esc(sn) + '</span><span class="std-sig-line"></span>' +
            '<p class="std-sig-note">Contract signed.</p>' +
            (qaStarted ? '' : '<button class="ghost-btn std-tearup" type="button">Tear it up &amp; choose again</button>') +
            '<button class="primary-btn std-enter" type="button">' + (chunk.badge ? 'Found the studio' : 'Continue') + '</button></div>';
        } else if (tpl && qaStarted) {
          signBlock = '<p class="std-note">Your studio already has QA work on the ' + esc((contractOf(tpl) || {}).name || 'other') + ' contract &mdash; finish that one.</p>';
        } else {
          signBlock = '<div class="std-signature">' +
            '<label class="std-sig-label" for="std-name">Sign with your studio name</label>' +
            '<input id="std-name" class="std-sig-input" maxlength="24" autocomplete="off" placeholder="' + esc(cfg.namePlaceholder || 'e.g. Golden Otter Games') + '" value="' + esc(sn) + '">' +
            '<p class="case-locked-note"></p>' +
            '<button class="primary-btn std-sign locked" type="button" aria-disabled="true">Sign the contract</button>' +
            (tpl ? '<p class="std-sig-note">Signing this tears up your ' + esc((contractOf(tpl) || {}).name || 'other') + ' contract.</p>' : '') +
            '</div>';
        }
        var card = el('<div class="card std-contract-full"><span class="intro-kicker">CONTRACT &middot; ' + esc(c.name) + '</span>' +
          '<h2>' + esc(c.headline || c.name) + '</h2>' +
          (c.img ? '<img class="std-contract-hero" src="' + esc(asset(c.img)) + '" alt="' + esc(c.imgAlt || c.name) + '" loading="lazy">' : '') +
          '<p class="intro-lead">' + esc(c.pitch || '') + '</p>' +
          '<div class="std-contract-cols"><div><b>The kit already does</b><ul>' + ships + '</ul></div>' +
          '<div><b>Your studio adds</b><ul>' + adds + '</ul></div></div>' +
          (c.theme ? '<p class="std-theme">&#127912; ' + esc(c.theme) + '</p>' : '') +
          signBlock +
          '<button class="ghost-btn std-back" type="button">&larr; Back to the desk</button></div>');
        host.appendChild(card);
        card.querySelector('.std-back').onclick = function () { host.innerHTML = ''; pickView(); };
        var input = card.querySelector('.std-sig-input');
        var signBtn = card.querySelector('.std-sign');
        var signNote = card.querySelector('.std-signature .case-locked-note');
        if (input && signBtn) {
          /* DFM 192f, the L4 pattern applied here: a control born disabled with
             no reason on screen is a dead end. It says what unlocks it. */
          input.oninput = function () {
            var short = input.value.trim().length < 3;
            signBtn.classList.toggle('locked', short);
            if (short) signBtn.setAttribute('aria-disabled', 'true'); else signBtn.removeAttribute('aria-disabled');
            if (signNote) {
              signNote.innerHTML = short ? fmtBold(cfg.signLockedNote || 'Type your studio name above — at least 3 letters — and the signing line unlocks.') : '';
              signNote.hidden = !short;
            }
          };
          input.oninput();
          signBtn.onclick = function () {
            if (signBtn.classList.contains('locked')) {
              if (signNote) { signNote.classList.remove('pulse'); void signNote.offsetWidth; signNote.classList.add('pulse'); }
              input.classList.add('flash');
              setTimeout(function () { input.classList.remove('flash'); }, 1000);
              input.focus();
              return;
            }
            tpl = String(c.id);
            sn = input.value.trim().slice(0, 24);
            saveStudio();
            host.innerHTML = '';
            contractView(c);
          };
        }
        var tear = card.querySelector('.std-tearup');
        if (tear) tear.onclick = function () {
          if (!tear.classList.contains('arm')) {
            tear.classList.add('arm');
            tear.textContent = S('tearArm', 'Click again to shred this contract');
            setTimeout(function () { tear.classList.remove('arm'); tear.innerHTML = S('tearIdle', 'Tear it up &amp; choose again'); }, 4000);
            return;
          }
          tpl = ''; sn = '';
          saveStudio();
          host.innerHTML = '';
          pickView();
        };
        var enter = card.querySelector('.std-enter');
        if (enter) enter.onclick = function () {
          /* phase-stable detail: re-signing can never mint a second award */
          finishChunk(ctx, 'sign=1');
        };
      }
    },

    /* ---------- phase 2: the Studio Desk + QA Desk ---------- */
    _build: function (host, chunk, ctx) {
      var cfg = chunk.config || {};
      /* ---- PUPIL SENTENCES LIVE IN CONTENT (rule 172; L5 spec Part D2) ----
         Damien met four engine literals on one Lesson 4 card that no gate could
         see, because the language harness reads CONTENT and these were code
         (DFM 192g). Casework's moved in the last round; the studio and gallery
         move now. `S(key, fallback)` keeps the engine's own words as the
         fallback, so nothing shifts on screen until content says otherwise, and
         the ledger and the banned-word sweep own every one of them the moment
         it does. */
      var S = function (k, d) { var t = (cfg.strings || {})[k]; return (typeof t === 'string' && t) ? t : d; };
      var solo = !!ctx.catchup;
      var draft = (ctx.draft && ctx.draft.studio) || {};
      var tpl = String(draft.tpl || '');
      var sn = String(draft.sn || '');
      var t = (cfg.templates || {})[tpl] || null;
      var kit = !!draft.kit;
      var qa = Object.assign({}, draft.qa || {});      // {cId: 'p'|'f'}
      var fq = Object.assign({}, draft.fq || {});      // found-by-QA tags
      var shipped = !!draft.ship;
      var beta = !!draft.beta;   // doors opened via the in-beta door (not all 4 ticks)
      var gt = String(draft.gt || '');
      var gh = String(draft.gh || '');
      var stretchDone = !!draft.stretch;
      var stretchNote = String(draft.stn || '');
      var crits = (t && t.criteria) || [];

      function saveDesk() {
        if (ctx.review) return;
        App.state.draft = App.state.draft || {};
        var d = App.state.draft.studio = App.state.draft.studio || {};
        d.tpl = tpl; d.sn = sn; d.kit = kit ? 1 : 0; d.qa = qa; d.fq = fq;
        d.ship = shipped ? 1 : 0; d.beta = beta ? 1 : 0; d.gt = gt; d.gh = gh;
        d.stretch = stretchDone ? 1 : 0; d.stn = stretchNote;
        ctx.saveEvent({ draft: App.state.draft });
      }
      var passCount = function () {
        return crits.filter(function (c) { return qa[c.id] === 'p'; }).length;
      };
      var fqCount = function () {
        return crits.filter(function (c) { return fq[c.id]; }).length;
      };
      var allPass = function () { return crits.length && passCount() === crits.length; };
      function buildXp() {
        /* XP from the AUTHORED criteria list, never array lengths (L4 law) */
        return passCount() * 4 + (shipped ? 3 : 0) + (stretchDone ? 3 : 0);
      }

      /* ---------- review reopen: the desk on record, zero writes ---------- */
      if (ctx.review) {
        var rows = crits.map(function (c) {
          var st = qa[c.id];
          return '<div class="std-review-row">' +
            '<span class="std-qa-state ' + (st === 'p' ? 'pass' : (st === 'f' ? 'fail' : '')) + '">' + (st === 'p' ? '&#10003;' : (st === 'f' ? '&#10007;' : '&middot;')) + '</span>' +
            '<b>' + esc(c.name) + '</b>' + (fq[c.id] ? '<span class="std-fq-chip">FOUND BY QA</span>' : '') + '</div>';
        }).join('');
        host.appendChild(el('<div class="card std-review"><span class="intro-kicker">' + esc(chunk.title) + '</span>' +
          '<h2>' + esc(sn || 'Your studio') + ' &mdash; on record</h2>' + rows +
          (shipped ? '<div class="gal-marquee-card mini"><span class="gal-mq-studio">' + esc(sn) + '</span><b class="gal-mq-title">' + esc(gt) + '</b><p class="gal-mq-how">' + esc(gh) + '</p></div>' : '<p class="intro-lead">The doors never opened.</p>') +
          (stretchDone ? '<p class="std-note">&#11088; Studio Note taken: &ldquo;' + esc(stretchNote) + '&rdquo;</p>' : '') +
          '<button class="primary-btn" type="button">Continue</button></div>'));
        host.querySelector('button').onclick = function () { ctx.next(); };
        return;
      }

      /* no contract on file (shouldn't happen on the normal rail): fall back
         to a plain template pick so nobody is ever stuck */
      if (!t) {
        var fallback = Object.keys(cfg.templates || {});
        var picks = fallback.map(function (k) {
          return '<button class="primary-btn std-fallback-pick" data-t="' + esc(k) + '" type="button">' + esc(cfg.templates[k].name) + '</button>';
        }).join(' ');
        host.appendChild(el('<div class="card"><h2>Pick your kit</h2><p class="intro-lead">Your contract went missing &mdash; choose the template you are building.</p><p>' + picks + '</p></div>'));
        host.querySelectorAll('.std-fallback-pick').forEach(function (btn) {
          btn.onclick = function () {
            tpl = btn.getAttribute('data-t');
            t = cfg.templates[tpl];
            crits = t.criteria || [];
            saveDesk();
            host.innerHTML = '';
            deskView();
          };
        });
        return;
      }

      var began = kit || Object.keys(qa).length;
      introCard(host, {
        kicker: chunk.title,
        title: (cfg.introTitle || 'The Studio Sprint'),
        text: (solo && cfg.introSolo) ? cfg.introSolo : (cfg.intro || ''),
        extra: (solo || !cfg.pairNote) ? '' : '<p class="case-pair-note">&#128101; ' + esc(cfg.pairNote) + '</p>'
      }, began ? S('backToDesk', 'Back to the desk') : S('openStudio', 'Open the studio'), deskView);

      /* one expanded QA row at a time; remembered across re-renders,
         never persisted (reload folds the desk tidy again) */
      var openCrit = null;
      var lastOutcome = {};

      function deskView() {
        host.innerHTML = '';
        var ticks = passCount();
        var qaRows = crits.map(function (c, i) {
          var st = qa[c.id] || '';
          var open = openCrit === c.id;
          var stateIcon = st === 'p' ? '&#10003;' : (st === 'f' ? '&#10007;' : String(i + 1));
          var row = '<div class="std-qa-row' + (open ? ' open' : '') + (st ? ' ' + (st === 'p' ? 'pass' : 'fail') : '') + (kit ? '' : ' locked') + '" data-crit="' + esc(c.id) + '">' +
            '<button class="std-qa-head" type="button"' + (kit ? '' : ' disabled') + '>' +
            '<span class="std-qa-state' + (st ? ' ' + (st === 'p' ? 'pass' : 'fail') : '') + '">' + stateIcon + '</span>' +
            '<b>' + esc(c.name) + '</b>' +
            (fq[c.id] && st === 'p' ? '<span class="std-fq-chip" title="a test failed, you fixed it, and it passed - that is QA working">FOUND BY QA</span>' : '') +
            '<span class="std-qa-arrow">' + (open ? '&#9650;' : '&#9660;') + '</span></button>';
          if (open) {
            row += '<div class="std-qa-body"><div class="std-qa-test"><span class="std-qa-tag">THE TEST</span><p>' + esc(c.test) + '</p></div>';
            if (st === 'f') {
              var lastIdx = lastOutcome[c.id];
              var oc = (typeof lastIdx === 'number') ? c.outcomes[lastIdx] : null;
              row += '<div class="std-fix-card"><span class="std-qa-tag fail">FOUND BY QA &mdash; THE FIX</span>' +
                '<p>' + esc(oc && oc.fix ? oc.fix : (c.retryFix || 'Make your fix in Scratch, then run the test again.')) + '</p>' +
                (oc && oc.mech ? '<p class="case-mechanic">&#128295; <b>Doing that in Scratch:</b> ' + esc(oc.mech) + '</p>' : '') +
                '</div>';
            }
            row += '<button class="primary-btn std-qa-run" type="button">' + (st === 'f' ? S('qaRunAgain', 'I made the fix &mdash; run the test again') : S('qaRunFirst', 'I ran the test &mdash; record what happened')) + '</button>' +
              '<div class="std-qa-outcomes" hidden></div></div>';
          }
          row += '</div>';
          return row;
        }).join('');

        var readyState = shipped ? 'shipped' : (allPass() ? 'lit' : 'dim');
        var d = el('<div class="std-desk">' +
          '<div class="std-head"><span class="std-brand">' + esc(sn || 'YOUR STUDIO') + ' &middot; ' + esc(t.name).toUpperCase() + ' CONTRACT</span>' +
          '<h2>The Studio Desk</h2>' +
          '<span class="std-count">' + ticks + ' of ' + crits.length + ' QA checks passed</span></div>' +

          '<div class="std-toolrow">' +
          '<div class="card std-tool' + (kit ? ' done' : '') + '"><span class="std-qa-tag">1 &middot; THE KIT</span>' +
          '<p>' + esc((cfg.kit && cfg.kit.intro) || 'Download your starter kit and load it at scratch.mit.edu.') + '</p>' +
          '<p class="case-getgame-btns"><a class="primary-btn" href="' + esc(asset(t.file)) + '" download>&#11015;&#65039; Download the ' + esc(t.name) + ' kit</a> ' +
          '<a class="ghost-btn" href="https://scratch.mit.edu/projects/editor/" target="_blank" rel="noopener">Open the Scratch editor &#8599;</a></p>' +
          '<button class="confirm-step std-kit-confirm" type="button"' + (kit ? ' disabled' : '') + '><span class="confirm-box' + (kit ? ' done' : '') + '"></span><span>' + esc((cfg.kit && cfg.kit.confirm) || 'The kit is open in Scratch and I can see its code') + '</span></button></div>' +

          '<div class="card std-tool"><span class="std-qa-tag">2 &middot; THE BLUEPRINT</span>' +
          '<p>' + esc((t.blueprint && t.blueprint.intro) || 'Exactly what your studio adds - in order.') + '</p>' +
          '<button class="ghost-btn std-blueprint-btn" type="button">&#128506;&#65039; Open the blueprint</button> ' +
          /* the label is content's, not the engine's (rule 172): after the DFM 168
             split this button no longer serves "the masterclass" — it serves the
             half of the film that belongs HERE, beside the blueprint it walks
             through. The old text stays as the fallback so nothing else moves. */
          (cfg.masterclass && cfg.masterclass.src ? '<button class="ghost-btn std-rewatch" type="button">&#127909; ' +
            esc((cfg.masterclass.button || 'Re-watch the masterclass')) + '</button>' : '') +
          /* AND THE WAY BACK TO THE OTHER HALF (DFM 143, and the L5 spec's own
             words: "BOTH are one click away from both places"). Splitting the
             film moved the concept chapters off this screen — so without this
             button, a pupil who pressed "Done watching" a second too early could
             never see them again. That is precisely the stranding rule 143
             exists to prevent, and qa-film-reachable now proves this route. */
          (cfg.masterclassAlt && cfg.masterclassAlt.src ? ' <button class="ghost-btn std-rewatch-alt" type="button">&#127909; ' +
            esc((cfg.masterclassAlt.button || 'Watch the first half again')) + '</button>' : '') +
          '</div></div>' +

          '<div class="std-qadesk' + (kit ? '' : ' locked') + '"><div class="std-qadesk-head"><span class="std-qa-tag">3 &middot; THE QA DESK</span>' +
          '<p>' + esc(cfg.qaIntro || 'Four checks stand between your build and the gallery. Run each test in Scratch, then record what actually happened - crosses are QA doing its job.') + '</p>' +
          (kit ? '' : '<span class="std-sealed-ribbon">SECURE THE KIT FIRST</span>') + '</div>' +
          qaRows + '</div>' +

          '<div class="std-ready-zone">' +
          '<button class="std-ready-btn ' + readyState + '" type="button"' + (readyState === 'lit' ? '' : ' disabled') + '>' +
          (shipped ? (beta ? S('doorsOpenBeta', 'DOORS OPEN &mdash; IN BETA') : S('doorsOpen', 'DOORS OPEN &mdash; SEE YOU AT PRESS NIGHT')) : S('readyLabel', 'READY FOR GALLERY')) + '</button>' +
          (shipped ? '' : '<p class="std-ready-note">' + (allPass() ? S('readyAllPass', 'All four checks passed &mdash; open your doors.') : S('readyNote', 'Lights up when all four QA checks pass.')) + '</p>') +
          /* DFM 192f's hidden-state half: the beta door used to APPEAR out of
             nowhere once two checks were attempted. A control that materialises
             unannounced is as bad as one that sits mute — so its own place on
             the screen now says, from the start, what makes it appear. */
          (!shipped && !allPass()
            ? (Object.keys(qa).length >= 2
                ? '<button class="ghost-btn std-beta-door" type="button">Out of time? Open in beta &mdash; ask your teacher first</button>'
                : '<p class="std-beta-hint">' + fmtBold(cfg.betaHint || "Out of time? An 'open in beta' door appears here once you have tried at least two QA checks.") + '</p>')
            : '') +
          '</div>' +

          '<div class="card std-stretch' + (stretchDone ? ' done' : '') + '"><span class="std-qa-tag">&#11088; STUDIO NOTE &middot; STRETCH</span>' +
          '<b>' + esc((t.stretch && t.stretch.title) || 'The second variable') + '</b>' +
          '<p>' + esc((t.stretch && t.stretch.text) || '') + '</p>' +
          (stretchDone ? '<p class="std-note">&#10003; Noted: &ldquo;' + esc(stretchNote) + '&rdquo;</p>' :
            '<textarea class="std-stretch-note" maxlength="140" placeholder="' + esc((t.stretch && t.stretch.placeholder) || 'What did you add, and what does it change?') + '"></textarea>' +
            '<p class="std-stretch-nudge"></p>' +
            '<button class="confirm-step std-stretch-confirm" type="button"><span class="confirm-box"></span><span>It works &mdash; I tested it</span></button>') +
          '</div>' +

          (shipped ? '<button class="primary-btn std-continue" type="button">Head to Press Night &rarr;</button>' : '') +
          '</div>');
        host.appendChild(d);

        if (!kit) {
          var kc = d.querySelector('.std-kit-confirm');
          kc.onclick = function () {
            this.classList.add('ticked');
            kit = true;
            saveDesk();
            App.toast(S('kitToast', 'Kit secured &mdash; the QA Desk is open.'));
            setTimeout(function () { host.innerHTML = ''; deskView(); }, 600);
          };
        }
        d.querySelector('.std-blueprint-btn').onclick = function () { blueprintView(); };
        var rw = d.querySelector('.std-rewatch');
        if (rw) rw.onclick = function () { masterclassView(cfg.masterclass); };
        var rwa = d.querySelector('.std-rewatch-alt');
        if (rwa) rwa.onclick = function () { masterclassView(cfg.masterclassAlt); };

        d.querySelectorAll('.std-qa-row').forEach(function (row) {
          var cid = row.getAttribute('data-crit');
          var head = row.querySelector('.std-qa-head');
          head.onclick = function () {
            openCrit = (openCrit === cid) ? null : cid;
            host.innerHTML = '';
            deskView();
          };
          var run = row.querySelector('.std-qa-run');
          if (run) run.onclick = function () {
            var c = crits.filter(function (x) { return x.id === cid; })[0];
            var box = row.querySelector('.std-qa-outcomes');
            var order = stdShuffle(c.outcomes.map(function (_, i) { return i; }));
            box.innerHTML = '<p class="std-qa-q">' + esc(c.ask || 'What did you actually see?') + '</p>' +
              order.map(function (oi) {
                return '<button class="std-outcome" data-oi="' + oi + '" type="button">' + esc(c.outcomes[oi].t) + '</button>';
              }).join('');
            box.hidden = false;
            run.hidden = true;
            box.querySelectorAll('.std-outcome').forEach(function (ob) {
              ob.onclick = function () {
                var oi = Number(ob.getAttribute('data-oi'));
                var oc = c.outcomes[oi];
                lastOutcome[cid] = oi;
                if (oc.pass) {
                  if (qa[cid] === 'f') fq[cid] = 1;
                  qa[cid] = 'p';
                  openCrit = null;
                } else {
                  qa[cid] = 'f';
                }
                saveDesk();
                host.innerHTML = '';
                deskView();
                if (oc.pass && allPass()) {
                  var btn = host.querySelector('.std-ready-btn');
                  if (btn) {
                    requestAnimationFrame(function () { btn.classList.add('just-lit'); });
                    setTimeout(function () { btn.classList.add('just-lit'); }, 150); // hidden-tab rAF fallback
                  }
                }
              };
            });
          };
        });

        var ready = d.querySelector('.std-ready-btn');
        if (!shipped && allPass()) ready.onclick = function () { marqueeView(false); };
        var betaDoor = d.querySelector('.std-beta-door');
        if (betaDoor) betaDoor.onclick = function () {
          if (!betaDoor.classList.contains('arm')) {
            betaDoor.classList.add('arm');
            betaDoor.innerHTML = S('betaArm', 'Click again &mdash; players will see IN BETA on your listing');
            setTimeout(function () { betaDoor.classList.remove('arm'); betaDoor.innerHTML = S('betaIdle', 'Out of time? Open in beta &mdash; ask your teacher first'); }, 4000);
            return;
          }
          marqueeView(true);
        };

        var sc = d.querySelector('.std-stretch-confirm');
        if (sc) sc.onclick = function () {
          var ta = d.querySelector('.std-stretch-note');
          var nudge = d.querySelector('.std-stretch-nudge');
          var words = ta.value.trim().split(/\s+/).filter(Boolean);
          if (words.length < 5) {
            nudge.textContent = S('stretchNudge', 'Say what you added AND what it changes - a real release note (5+ words).');
            return;
          }
          stretchNote = ta.value.trim().slice(0, 140);
          stretchDone = true;
          saveDesk();
          host.innerHTML = '';
          deskView();
        };

        var cont = d.querySelector('.std-continue');
        if (cont) cont.onclick = function () {
          var xp = buildXp();
          var badge = Object.assign({}, ctx.chunk.badge, { xp: xp });
          var detail = 'qa=' + passCount() + '/' + crits.length + ';ship=1' +
            (beta ? ';b=1' : '') + (fqCount() ? ';fq=' + fqCount() : '') + (stretchDone ? ';s=1' : '');
          ctx.awardBadge(badge, detail).then(function () { ctx.next(); });
        };
      }

      function blueprintView() {
        host.innerHTML = '';
        var bp = t.blueprint || {};
        var steps = (bp.steps || []).map(function (s) {
          return '<li><span class="af-icon">' + esc(s.icon || '') + '</span><div><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p></div></li>';
        }).join('');
        var c = el('<div class="card std-blueprint"><span class="intro-kicker">BLUEPRINT &middot; ' + esc(t.name) + '</span>' +
          '<h2>' + esc(bp.title || 'What your studio adds') + '</h2>' +
          '<ol class="af-steps">' + steps + '</ol>' +
          (bp.img ? '<figure class="std-blueprint-fig"><img src="' + esc(asset(bp.img)) + '" alt="' + esc(bp.imgAlt || 'The finished blocks') + '" loading="lazy">' +
            '<figcaption>' + esc(bp.imgCaption || 'The finished blocks - yours should read like this.') + '</figcaption></figure>' : '') +
          (bp.note ? '<p class="std-note">' + esc(bp.note) + '</p>' : '') +
          '<button class="ghost-btn std-back" type="button">&larr; Back to the desk</button></div>');
        host.appendChild(c);
        c.querySelector('.std-back').onclick = function () { host.innerHTML = ''; deskView(); };
      }

      function masterclassView(which) {
        host.innerHTML = '';
        var v = which || cfg.masterclass || {};
        var chapters = (v.chapters || []).map(function (ch) {
          return '<button class="vid-chapter" data-t="' + Number(ch.t) + '" type="button">' + esc(ch.label) + '</button>';
        }).join('');
        var c = el('<div class="card video-card std-blueprint"><span class="intro-kicker">THE MASTERCLASS &middot; ANY TIME</span>' +
          '<h2>' + esc(v.title || 'Making your game react') + '</h2>' +
          '<video controls preload="metadata" playsinline ' + (v.poster ? 'poster="' + esc(asset(v.poster)) + '"' : '') + ' src="' + esc(asset(v.src)) + '"></video>' +
          (chapters ? '<div class="vid-chapters">' + chapters + '</div>' : '') +
          '<button class="ghost-btn std-back" type="button">&larr; Back to the desk</button></div>');
        host.appendChild(c);
        var vid = c.querySelector('video');
        c.querySelectorAll('.vid-chapter').forEach(function (bch) {
          bch.onclick = function () { vid.currentTime = Number(bch.getAttribute('data-t')); vid.play(); };
        });
        c.querySelector('.std-back').onclick = function () { host.innerHTML = ''; deskView(); };
      }

      /* opening the doors = publishing the LISTING (never a file anywhere).
         asBeta = the in-beta door: an unfinished game still exhibits ("in
         beta" is a real studio state) - critics see the tag, honesty holds */
      function marqueeView(asBeta) {
        host.innerHTML = '';
        var m = cfg.marquee || {};
        var c = el('<div class="card std-marquee-form"><span class="intro-kicker">' + (asBeta ? 'OPENING IN BETA' : 'READY FOR GALLERY') + '</span>' +
          '<h2>' + esc(m.title || 'Open the doors') + '</h2>' +
          '<p class="intro-lead">' + esc(asBeta ? (m.betaIntro || 'In beta is a real studio state. Your listing goes up with an IN BETA tag - reviewers play what is there.') : (m.intro || 'Your listing goes up on the class marquee. Make it worth a visit.')) + '</p>' +
          '<label class="std-sig-label" for="std-gt">Game title</label>' +
          '<input id="std-gt" class="std-sig-input" maxlength="28" autocomplete="off" placeholder="' + esc(m.titlePlaceholder || 'e.g. Sushi Drop') + '" value="' + esc(gt) + '">' +
          '<label class="std-sig-label" for="std-gh">How to play &mdash; one line</label>' +
          /* 90, not 80: the server's GAL_HOW_MAX is 90 and a limit that lives in
             two places is a contract (DFM 157a). The box was the one lying. */
          '<input id="std-gh" class="std-sig-input" maxlength="90" autocomplete="off" placeholder="' + esc(m.howPlaceholder || 'e.g. Arrow keys to move. Catch sushi, dodge wasabi!') + '" value="' + esc(gh) + '">' +
          '<div class="gal-marquee-card preview"><span class="gal-mq-studio"></span><b class="gal-mq-title"></b><p class="gal-mq-how"></p></div>' +
          '<p class="std-marquee-status"></p>' +
          '<p class="case-locked-note"></p>' +
          '<button class="primary-btn std-doors locked" type="button" aria-disabled="true">' + esc(m.confirmLabel || 'OPEN THE DOORS') + '</button>' +
          '<button class="ghost-btn std-back" type="button">&larr; Back to the desk</button></div>');
        host.appendChild(c);
        c.querySelector('.std-back').onclick = function () { host.innerHTML = ''; deskView(); };
        var ti = c.querySelector('#std-gt'), hi = c.querySelector('#std-gh');
        var doors = c.querySelector('.std-doors');
        var doorsNote = c.querySelector('.std-marquee-form .case-locked-note');
        var status = c.querySelector('.std-marquee-status');
        function paintPreview() {
          c.querySelector('.gal-mq-studio').textContent = sn || 'Your studio';
          c.querySelector('.gal-mq-title').textContent = ti.value.trim() || 'Your game';
          c.querySelector('.gal-mq-how').textContent = hi.value.trim() || 'How to play...';
          var short = ti.value.trim().length < 2 || hi.value.trim().length < 8;
          doors.classList.toggle('locked', short);
          if (short) doors.setAttribute('aria-disabled', 'true'); else doors.removeAttribute('aria-disabled');
          doorsNote.innerHTML = short ? fmtBold(cfg.doorsLockedNote || 'The doors open when your game title and the how-to-play line are both filled in.') : '';
          doorsNote.hidden = !short;
        }
        ti.oninput = paintPreview; hi.oninput = paintPreview;
        paintPreview();
        doors.onclick = function () {
          if (doors.classList.contains('locked')) {
            doorsNote.classList.remove('pulse'); void doorsNote.offsetWidth; doorsNote.classList.add('pulse');
            (ti.value.trim().length < 2 ? ti : hi).focus();
            return;
          }
          doors.disabled = true;
          gt = ti.value.trim().slice(0, 28);
          gh = hi.value.trim().slice(0, 80);
          saveDesk(); // the listing text survives a failed call
          status.textContent = 'Raising the marquee...';
          ctx.call('galleryOpen', { lessonId: ctx.lesson.id, gt: gt, gh: gh, tpl: tpl, sn: sn, beta: asBeta ? 1 : 0 }).then(function (r) {
            if (!r || !r.ok) {
              status.textContent = S('marqueeNoAnswer', 'The marquee did not answer') + ' (' + esc((r && r.error) || 'no reply') + ') - ' + S('tryAgain', 'try again.');
              doors.disabled = false;
              return;
            }
            shipped = true;
            beta = !!asBeta;
            saveDesk();
            App.toast('&#127914; ' + S('doorsToast', 'Doors open - your game is on the marquee.'));
            host.innerHTML = '';
            deskView();
          }).catch(function () {
            status.textContent = S('noConnection', 'No connection - try again.');
            doors.disabled = false;
          });
        };
      }
    }
  };

  /* ================= gallery (L5 Press Night: peer critique) ================
     Designed from PEER-CRITIQUE references, deliberately NOT L3's reveal
     (gate binding): Berger/EL Education gallery-critique norms (KIND -
     SPECIFIC - HELPFUL, modelled before anyone writes), d.school "I like /
     I wonder" stems, a Two-Stars-and-a-Wish style QUOTA (exactly 2 press
     passes required, a 3rd allowed) so attention can't pile onto one
     popular studio - and the marquee surfaces "needs a critic" studios
     first. Reviews are SIGNED with the critic's codename (accountability,
     Berger), teacher-readable in the staff lens with one-tap removal, and
     the banner says so. The mandatory receive-and-respond step (the V2
     note) is what stops gallery feedback being write-only. No scores, no
     ranking, no bars - the class-level beat is collective. */
  Engines.gallery = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config || {};
      /* pupil sentences live in content (rule 172; L5 spec Part D2) — same
         helper and same law as the studio engine above. */
      var S = function (k, d) { var t = (cfg.strings || {})[k]; return (typeof t === 'string' && t) ? t : d; };
      var solo = !!ctx.catchup;
      var quota = Number(cfg.quota) || 2;
      var stems = cfg.stems || {};
      var stemLike = stems.like || 'I like...';
      var stemWonder = stems.wonder || 'I wonder...';
      var draftAll = ctx.draft || {};
      var draft = draftAll.gallery || {};
      var studioDraft = draftAll.studio || {};
      var v2 = String(draft.v2 || '');
      var v2ok = !!draft.v2ok;
      var feed = null;         // latest galleryFeed reply
      var seenReviews = {};    // for arrival animations + chime
      var firstPaint = true;
      var pollT = null;

      function saveGal() {
        if (ctx.review) return;
        App.state.draft = App.state.draft || {};
        App.state.draft.gallery = { v2: v2, v2ok: v2ok ? 1 : 0 };
        ctx.saveEvent({ draft: App.state.draft });
      }
      function chime() {
        try {
          var A = window.AudioContext || window.webkitAudioContext;
          if (!A) return;
          var ac = chime._ac = chime._ac || new A();
          var t0 = ac.currentTime;
          [660, 880].forEach(function (f, i) {
            var o = ac.createOscillator(), g = ac.createGain();
            o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t0 + i * 0.09);
            g.gain.exponentialRampToValueAtTime(0.05, t0 + i * 0.09 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.09 + 0.35);
            o.connect(g); g.connect(ac.destination);
            o.start(t0 + i * 0.09); o.stop(t0 + i * 0.09 + 0.4);
          });
        } catch (e) {}
      }

      /* ---------- review reopen: read-only (feed reads are safe; no writes) ---------- */
      if (ctx.review) {
        var rv = el('<div class="card gal-review"><span class="intro-kicker">' + esc(chunk.title) + '</span>' +
          '<h2>Your Press Night, on record</h2><p class="intro-lead gal-review-status">Fetching your reviews&hellip;</p>' +
          (v2 ? '<div class="gal-v2-final"><b>Your V2 note:</b><p>&ldquo;' + esc(v2) + '&rdquo;</p></div>' : '') +
          '<div class="gal-review-list"></div>' +
          '<button class="primary-btn" type="button">Continue</button></div>');
        host.appendChild(rv);
        rv.querySelector('button').onclick = function () { ctx.next(); };
        ctx.call('galleryFeed', { lessonId: ctx.lesson.id }).then(function (r) {
          var statusEl = rv.querySelector('.gal-review-status');
          var list = rv.querySelector('.gal-review-list');
          if (!r || !r.ok || !r.myReviews || !r.myReviews.length) {
            statusEl.innerHTML = S('archived', 'The gallery has been archived &mdash; your reviews live in the class record now.');
            return;
          }
          statusEl.textContent = S('yourReviews', 'The reviews your game received:');
          list.innerHTML = r.myReviews.map(function (x) {
            return '<div class="gal-review-item"><span class="gal-rev-by">' + esc(x.bcn) + (x.sim ? ' <em class="gal-sim">simulated</em>' : '') + '</span>' +
              '<p><b>' + esc(stemLike) + '</b> ' + esc(x.l) + '</p><p><b>' + esc(stemWonder) + '</b> ' + esc(x.w) + '</p></div>';
          }).join('');
        }).catch(function () {});
        return;
      }

      /* ---------- solo catch-up: the gallery has closed ---------- */
      if (solo) {
        var closed = cfg.closed || {};
        introCard(host, {
          kicker: chunk.title,
          title: closed.title || 'Press Night has closed',
          text: closed.note || 'The gallery ran live in class. You can still browse the marquee - and every studio still files a V2 note.'
        }, 'Browse the marquee', function () { soloView(); });
        function soloView() {
          host.innerHTML = '';
          var c = el('<div class="std-desk gal-floor"><div class="std-head"><span class="std-brand">PRESS NIGHT &middot; LATE EDITION</span>' +
            '<h2>The marquee</h2><span class="std-count gal-total"></span></div>' +
            '<div class="gal-marquee-grid"></div>' +
            '<div class="card gal-v2-card"><span class="std-qa-tag">YOUR V2 NOTE</span>' +
            '<p>' + esc((cfg.v2 && cfg.v2.promptNoReviews) || 'Every studio plans a version 2. What is the ONE thing yours would change, and why?') + '</p>' +
            '<textarea class="gal-v2-input" maxlength="200" placeholder="' + esc((cfg.v2 && cfg.v2.placeholder) || 'In version 2 I would... because...') + '">' + esc(v2) + '</textarea>' +
            '<p class="gal-v2-nudge"></p>' +
            '<button class="primary-btn gal-v2-save" type="button">File the note &amp; wrap up</button></div></div>');
          host.appendChild(c);
          ctx.call('galleryFeed', { lessonId: ctx.lesson.id }).then(function (r) {
            if (!r || !r.ok) return;
            c.querySelector('.gal-total').textContent = r.total + ' ' + S('filedOnNight', 'reviews were filed on the night');
            c.querySelector('.gal-marquee-grid').innerHTML = (r.studios || []).map(function (s) {
              return marqueeCardHtml(s, false);
            }).join('') || '<p class="std-note">The marquee is empty now.</p>';
          }).catch(function () {});
          c.querySelector('.gal-v2-save').onclick = function () {
            var ta = c.querySelector('.gal-v2-input');
            var nudge = c.querySelector('.gal-v2-nudge');
            var words = ta.value.trim().split(/\s+/).filter(Boolean);
            if (words.length < 6) {
              nudge.textContent = S('v2Nudge', 'A real design note names the change AND the reason (6+ words).');
              return;
            }
            v2 = ta.value.trim().slice(0, 200);
            v2ok = true;
            saveGal();
            var badge = Object.assign({}, ctx.chunk.badge, { xp: 7 });
            ctx.awardBadge(badge, 'rv=0;v2=1;sol=1').then(function () { ctx.next(); });
          };
        }
        return;
      }

      /* ---------- the Reviewer's Code, then the floor ---------- */
      var code = cfg.code || {};
      var rules = (code.rules || []).map(function (r2) { return '<li>' + esc(r2) + '</li>'; }).join('');
      introCard(host, {
        kicker: chunk.title,
        title: cfg.introTitle || 'Press Night',
        text: cfg.intro || '',
        extra: '<div class="gal-code"><b class="gal-code-head">The Reviewer&rsquo;s Code &mdash; kind &middot; specific &middot; helpful</b>' +
          '<ul class="gal-code-rules">' + rules + '</ul>' +
          (code.badExample ? '<p class="gal-code-eg"><span class="gal-eg-bad">&#10007; ' + esc(code.badExample) + '</span><br>' +
            '<span class="gal-eg-good">&#10003; ' + esc(code.goodExample || '') + '</span></p>' : '') +
          '<p class="gal-banner">&#128065;&#65039; Reviews are signed, and your teacher reads every one.</p></div>'
      }, 'Onto the floor', floorView);

      /* pupils never see review counts or a needs-a-critic tag (that would be
         a live popularity ranking - safety gate finding); the fairness lives
         in the SILENT fewest-first sort, and the teacher's lens keeps counts */
      function marqueeCardHtml(s, clickable) {
        var meta = s.mine ? ('YOUR STUDIO' + (s.b ? ' &middot; IN BETA' : '')) : (s.b ? 'IN BETA' : (s.tpl ? { catch: 'A CATCHING GAME', maze: 'A MAZE ESCAPE', quiz: 'A QUIZ SHOW' }[s.tpl] || 'ON SHOW' : 'ON SHOW'));
        return '<' + (clickable ? 'button type="button"' : 'div') + ' class="gal-marquee-card' + (s.mine ? ' mine' : '') + (clickable ? ' clickable' : '') + '" data-sid="' + esc(s.sid) + '">' +
          '<span class="gal-mq-studio">' + esc(s.sn || s.cn) + (s.sim ? ' <em class="gal-sim">simulated</em>' : '') + '</span>' +
          '<b class="gal-mq-title">' + esc(s.gt) + '</b>' +
          '<p class="gal-mq-how">' + esc(s.gh) + '</p>' +
          '<span class="gal-mq-meta">' + meta + '</span>' +
          '</' + (clickable ? 'button' : 'div') + '>';
      }

      function floorView() {
        host.innerHTML = '';
        var rounds = cfg.rounds || {};
        var c = el('<div class="std-desk gal-floor">' +
          '<div class="std-head"><span class="std-brand">OLS GAMES &middot; PRESS NIGHT</span>' +
          '<h2>The gallery floor</h2><span class="std-count gal-passes"></span></div>' +
          (rounds.note ? '<div class="gal-rounds"><p>' + esc(rounds.note) + '</p>' +
            (rounds.exhibitTip ? '<p class="gal-round-tip">&#127914; <b>Exhibiting?</b> ' + esc(rounds.exhibitTip) + '</p>' : '') +
            (rounds.tourTip ? '<p class="gal-round-tip">&#128584; <b>Touring?</b> ' + esc(rounds.tourTip) + '</p>' : '') + '</div>' : '') +
          '<div class="gal-mine-zone"><div class="gal-mine-card"></div><div class="gal-incoming"><b class="gal-incoming-head">Your reviews land here, live</b><div class="gal-incoming-list"></div></div></div>' +
          '<b class="gal-marquee-head">The marquee &mdash; pick a studio, play it at their desk, then review it here</b>' +
          '<div class="gal-marquee-grid"><p class="std-note">Raising the marquee&hellip;</p></div>' +
          '<div class="gal-v2-zone"></div>' +
          '</div>');
        host.appendChild(c);
        paintFeed();
        poll();
      }

      function applyFeed(r) {
        feed = r;
        if (!document.body.contains(host) || !host.querySelector('.gal-floor')) return;
        paintFeed();
      }

      function paintFeed() {
        var floor = host.querySelector('.gal-floor');
        if (!floor) return;
        var passes = floor.querySelector('.gal-passes');
        var given = feed ? feed.given : 0;
        /* DFM 35: the counter read "0 to spend" while a third review was still
           allowed, and the desk said so on the very next screen. Two surfaces,
           one truth — at quota it now states BOTH facts. */
        passes.innerHTML = given >= quota
          ? 'Press passes: <b>both spent</b> &#10003; &mdash; one bonus pass left'
          : 'Press passes: <b>' + Math.max(0, quota - given) + '</b> to spend';
        var mine = feed && feed.studios.filter(function (s) { return s.mine; })[0];
        floor.querySelector('.gal-mine-card').innerHTML = mine
          ? (marqueeCardHtml(mine, false) + (mine.hd ? '<p class="std-note">Your listing is hidden just now &mdash; have a word with your teacher.</p>' : ''))
          : '<p class="std-note">Your doors are not open yet &mdash; finish the Studio Desk first.</p>';
        var list = floor.querySelector('.gal-incoming-list');
        var myReviews = (feed && feed.myReviews) || [];
        if (!myReviews.length) {
          list.innerHTML = '<p class="gal-waiting">No reviews yet &mdash; reviewers are still playing&hellip;</p>';
        } else {
          var anyNew = false;
          list.innerHTML = myReviews.slice().reverse().map(function (x) {
            var isNew = !seenReviews[x.i] && !firstPaint;
            if (!seenReviews[x.i]) { if (!firstPaint) anyNew = true; }
            return '<div class="gal-review-item' + (isNew ? ' fresh' : '') + '"><span class="gal-rev-by">' + esc(x.bcn) + (x.sim ? ' <em class="gal-sim">simulated</em>' : '') + '</span>' +
              '<p><b>' + esc(stemLike) + '</b> ' + esc(x.l) + '</p><p><b>' + esc(stemWonder) + '</b> ' + esc(x.w) + '</p></div>';
          }).join('');
          myReviews.forEach(function (x) { seenReviews[x.i] = 1; });
          if (anyNew) {
            chime();
            list.querySelectorAll('.gal-review-item.fresh').forEach(function (n) {
              requestAnimationFrame(function () { n.classList.add('landed'); });
              setTimeout(function () { n.classList.add('landed'); }, 150); // hidden-tab rAF fallback
            });
          }
        }
        var grid = floor.querySelector('.gal-marquee-grid');
        var others = feed ? feed.studios.filter(function (s) { return !s.mine; }) : [];
        others.sort(function (a, b) { return (a.rn - b.rn) || String(a.gt).localeCompare(String(b.gt)); });
        grid.innerHTML = others.length ? others.map(function (s) { return marqueeCardHtml(s, true); }).join('')
          : '<p class="std-note">No other studios have opened yet &mdash; watch the marquee light up.</p>';
        grid.querySelectorAll('.gal-marquee-card.clickable').forEach(function (btn) {
          btn.onclick = function () {
            var s = others.filter(function (x) { return String(x.sid) === btn.getAttribute('data-sid'); })[0];
            if (s) reviewDesk(s);
          };
        });
        paintV2Zone(floor);
        if (feed) firstPaint = false; // reviews already waiting on arrival never chime
      }

      function paintV2Zone(floor) {
        var zone = floor.querySelector('.gal-v2-zone');
        var given = feed ? feed.given : 0;
        var received = (feed && feed.myReviews) || [];
        if (v2ok) {
          zone.innerHTML = '<div class="card gal-v2-card done"><span class="std-qa-tag">YOUR V2 NOTE &#10003;</span>' +
            '<p>&ldquo;' + esc(v2) + '&rdquo;</p></div>' +
            '<button class="primary-btn gal-wrap" type="button">Wrap Press Night &rarr;</button>';
          zone.querySelector('.gal-wrap').onclick = wrapView;
          return;
        }
        // AUDIT FIX (26 Jul 2026): the V2 note is the ONLY route out of Press
        // Night, and it used to lock on the full quota regardless of how many
        // other studios actually existed. If the lesson overran and only one
        // other pair opened their doors - or if a catch-up pupil arrived after
        // the 7-day archive sweep cleared the gallery - the chunk had no exit at
        // all, with no teacher override. Lock on what is ACHIEVABLE instead.
        // XP already scales with reviews given, so a short quota still scores honestly.
        var others = (feed && feed.studios || []).filter(function (s) { return !s.mine; }).length;
        var need = Math.min(quota, others);
        if (given < need) {
          zone.innerHTML = '<div class="card gal-v2-card locked"><span class="std-qa-tag">YOUR V2 NOTE</span>' +
            '<p>Unlocks when ' + (need === 1 ? S('passOne', 'your press pass is') : S('passBoth', 'both press passes are')) +
            ' spent &mdash; reviews first, your V2 note second.</p></div>';
          return;
        }
        var prompt = received.length
          ? ((cfg.v2 && cfg.v2.prompt) || 'Read your reviews. Pick ONE that sparked something - what will version 2 change, and why?')
          : ((cfg.v2 && cfg.v2.promptNoReviews) || 'While reviews come in: what is the ONE thing version 2 of your game would change, and why?');
        zone.innerHTML = '<div class="card gal-v2-card"><span class="std-qa-tag">YOUR V2 NOTE</span>' +
          '<p>' + esc(prompt) + '</p>' +
          '<textarea class="gal-v2-input" maxlength="200" placeholder="' + esc((cfg.v2 && cfg.v2.placeholder) || 'In version 2 I would... because a review said...') + '">' + esc(v2) + '</textarea>' +
          '<p class="gal-v2-nudge"></p>' +
          '<button class="primary-btn gal-v2-save" type="button">File the V2 note</button></div>';
        zone.querySelector('.gal-v2-save').onclick = function () {
          var ta = zone.querySelector('.gal-v2-input');
          var nudge = zone.querySelector('.gal-v2-nudge');
          var words = ta.value.trim().split(/\s+/).filter(Boolean);
          if (words.length < 6) {
            nudge.textContent = S('v2Nudge', 'A real design note names the change AND the reason (6+ words).');
            return;
          }
          v2 = ta.value.trim().slice(0, 200);
          v2ok = true;
          saveGal();
          paintFeed();
        };
      }

      function reviewDesk(s) {
        host.innerHTML = '';
        var given = feed ? feed.given : 0;
        var spent = given >= 3;
        var c = el('<div class="card gal-desk"><span class="intro-kicker">REVIEW DESK</span>' +
          marqueeCardHtml(s, false) +
          (spent ? '<p class="std-note">All three press passes are spent &mdash; head back to the floor.</p>' :
            '<p class="gal-desk-note">' + esc(cfg.deskNote || 'Play it at their desk first. Then write like a reviewer: kind, specific, helpful.') + '</p>' +
            '<label class="std-sig-label">' + esc(stemLike) + '</label>' +
            '<textarea class="gal-stem-input" data-stem="like" maxlength="200" placeholder="' + esc(cfg.likePlaceholder || 'name the exact bit you liked, and why it works') + '"></textarea>' +
            '<label class="std-sig-label">' + esc(stemWonder) + '</label>' +
            '<textarea class="gal-stem-input" data-stem="wonder" maxlength="200" placeholder="' + esc(cfg.wonderPlaceholder || 'a question or idea that could make version 2 even better') + '"></textarea>' +
            '<p class="gal-v2-nudge"></p>' +
            '<button class="primary-btn gal-file-btn" type="button">File the review &middot; signed</button>') +
          '<button class="ghost-btn std-back" type="button">&larr; Back to the floor</button></div>');
        host.appendChild(c);
        c.querySelector('.std-back').onclick = function () { host.innerHTML = ''; floorView(); };
        var fileBtn = c.querySelector('.gal-file-btn');
        if (fileBtn) fileBtn.onclick = function () {
          var likeTa = c.querySelector('[data-stem="like"]');
          var wonderTa = c.querySelector('[data-stem="wonder"]');
          var nudge = c.querySelector('.gal-v2-nudge');
          var lw = likeTa.value.trim().split(/\s+/).filter(Boolean);
          var ww = wonderTa.value.trim().split(/\s+/).filter(Boolean);
          if (lw.length < 5 || ww.length < 5) {
            nudge.textContent = S('specificNudge', 'Specific means at least 5 real words in each line - name the exact thing.');
            return;
          }
          fileBtn.disabled = true;
          ctx.call('galleryPost', {
            lessonId: ctx.lesson.id, to: s.sid,
            like: likeTa.value.trim().slice(0, 200), wonder: wonderTa.value.trim().slice(0, 200)
          }).then(function (r) {
            if (!r || !r.ok) {
              fileBtn.disabled = false;
              var msg = {
                'passes-spent': S('passesSpent', 'All three press passes are spent.'),
                'already-reviewed': S('alreadyReviewed', 'You already reviewed this studio - spread the passes around.'),
                'too-thin': S('tooThin', 'Too thin for print - name the exact thing.'),
                'own-studio': S('ownStudio', 'Nice try - you cannot review your own studio.')
              }[(r && r.error) || ''] || 'The review did not file - try again.';
              nudge.textContent = msg;
              return;
            }
            App.toast('&#128240; ' + S('reviewFiled', 'Review filed - signed and delivered.'));
            host.innerHTML = '';
            floorView();
          }).catch(function () {
            fileBtn.disabled = false;
            nudge.textContent = S('noConnection', 'No connection - try again.');
          });
        };
      }

      function wrapView() {
        if (pollT) { clearTimeout(pollT); pollT = null; }
        host.innerHTML = '';
        var total = feed ? feed.total : 0;
        var studios = feed ? feed.studioCount : 0;
        var given = feed ? Math.min(feed.given, quota) : 0;
        var wrap = cfg.wrap || {};
        var c = el('<div class="card gal-wrapcard"><span class="intro-kicker">PRESS NIGHT &middot; CLOSING</span>' +
          '<h2>' + esc(wrap.title || 'The presses roll') + '</h2>' +
          '<p class="gal-wrap-stat"><b>' + total + '</b> reviews filed across the class tonight &middot; <b>' + studios + '</b> studios opened their doors.</p>' +
          '<p class="intro-lead">' + esc(wrap.note || 'No scores. No rankings. Real games, real reviewers, real notes for version 2 - that is how studios grow.') + '</p>' +
          '<button class="primary-btn" type="button">Collect your press badge</button></div>');
        host.appendChild(c);
        c.querySelector('button').onclick = function () {
          var xp = 3 * given + (v2ok ? 1 : 0);
          var badge = Object.assign({}, ctx.chunk.badge, { xp: xp });
          ctx.awardBadge(badge, 'rv=' + (feed ? feed.given : 0) + ';v2=' + (v2ok ? 1 : 0)).then(function () { ctx.next(); });
        };
      }

      function poll() {
        /* single chain: re-entering the floor never stacks a second poller */
        if (pollT) { clearTimeout(pollT); pollT = null; }
        if (!document.body.contains(host) || !host.querySelector('.gal-floor')) return;
        ctx.call('galleryFeed', { lessonId: ctx.lesson.id }).then(function (r) {
          if (r && r.ok) applyFeed(r);
        }).catch(function () {}).then(function () {
          if (document.body.contains(host)) pollT = setTimeout(poll, 4000);
        });
      }
    }
  };

})(window);
