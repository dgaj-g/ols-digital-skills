/* OLS KS3 DT — activity engines. Each engine mounts one lesson chunk:
   Engines[type].mount(host, chunk, ctx). Engines call ctx.awardBadge(chunk.badge)
   when the chunk carries a badge, then ctx.next().
   Marking is ALWAYS server-side (ctx.markItem / recap / exit APIs) — no answer
   keys exist client-side (red team #1). */
(function (global) {
  'use strict';

  var Engines = global.Engines = {};
  var esc = function (s) { return App.esc(s); };

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function finishChunk(ctx, detail) {
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

    stop: function () {
      if (PairKit._pollT) { clearTimeout(PairKit._pollT); PairKit._pollT = null; }
      if (PairKit._chT) { clearTimeout(PairKit._chT); PairKit._chT = null; }
      PairKit._handler = null; PairKit._onPoll = null; PairKit._dock = null;
    },

    ensure: function (ctx, host, cb) {
      PairKit.stop();
      PairKit.st = null; PairKit._seen = {};
      if (ctx.review || ctx.catchup) { cb('solo'); return; }
      if (!Number(App.state.pairing)) { cb('social'); return; }
      var stageIdx = Number(App.state.chunkIdx);
      var began = Date.now();
      var box = null;
      function waitUi(r) {
        if (!box) {
          box = el('<div class="card pair-wait">' +
            '<div class="pw-radar"><span></span><span></span><span></span><i></i></div>' +
            '<h2>Opening a channel&hellip;</h2>' +
            '<p class="pw-status">HQ is matching you with a partner agent.</p>' +
            '<p class="pw-hint" hidden></p></div>');
          host.appendChild(box);
        }
        var stat = box.querySelector('.pw-status');
        if (Number(r.trioHold)) stat.textContent = 'The last three agents on a mission finish it together — holding this frequency for one more…';
        else if (Number(r.waiting) > 1) stat.textContent = 'Signal found — locking frequencies…';
        else stat.textContent = 'HQ is matching you with a partner agent…';
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
          if (r.state === 'solo') { if (box) box.remove(); cb('solo'); return; }
          if (r.state === 'paired') {
            PairKit.st = {
              pid: String(r.pid), mi: Number(r.mi), members: (r.members || []).map(String),
              trio: !!Number(r.trio), seq: 0,
              live: (r.members || []).map(function () { return 1; }),
              done: Number(r.done), rv: Number(r.rv), names: r.names || null
            };
            if (box) box.remove();
            PairKit._loop(ctx);
            cb('paired');
            return;
          }
          waitUi(r);
          PairKit._pollT = setTimeout(poll, 2000);
        });
      }
      poll();
    },

    onEvent: function (fn) { PairKit._handler = fn; },
    onPoll: function (fn) { PairKit._onPoll = fn; },

    _loop: function (ctx) {
      var st = PairKit.st;
      if (!st) return;
      ctx.call('pairChannel', { lessonId: ctx.lesson.id, pid: st.pid, since: st.seq }).then(function (r) {
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
          else App.toast('Message did not send (wifi?) — try again.');
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
      pop.querySelector('button').onclick = function () {
        pop.classList.remove('show');
        setTimeout(function () { pop.remove(); }, 250);
        cb();
      };
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

    function progress() {
      return opts.items.length > 1
        ? '<span class="runner-progress">' + (idx + 1) + ' of ' + opts.items.length + '</span>' : '';
    }

    /* stems may carry \n line breaks (e.g. numbered algorithm steps) */
    function stemHtml(s) { return esc(s).replace(/\n/g, '<br>'); }

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
      wrap.querySelectorAll('.q-opt').forEach(function (btn) {
        btn.onclick = function () { pick(Number(btn.getAttribute('data-i')), btn); };
      });
    }

    function lockOptions() {
      wrap.querySelectorAll('.q-opt').forEach(function (b) { b.disabled = true; });
    }

    function nextOrDone() {
      idx++;
      if (idx < opts.items.length) show();
      else opts.onDone({ right: right, total: opts.items.length, answers: answers });
    }

    function pick(i, btn) {
      var it = opts.items[idx];
      var srcIdx = curOrd[i]; // display position -> source index (contract unchanged)
      var ord = curOrd;       // capture: async marking must not race the next show()
      answers[it.id] = srcIdx;
      lockOptions();
      if (opts.mode === 'collect') { nextOrDone(); return; }
      if (opts.mode === 'neutral') {
        btn.classList.add('logged');
        btn.insertAdjacentHTML('beforeend', '<span class="q-logged">' + esc(opts.ackText || 'Logged') + ' &#10003;</span>');
        setTimeout(nextOrDone, 650);
        return;
      }
      // feedback mode: server marks (against the SOURCE index)
      btn.classList.add('checking');
      opts.markFn(it, srcIdx).then(function (r) {
        btn.classList.remove('checking');
        var fb = wrap.querySelector('.q-feedback');
        if (!r || !r.ok) {
          fb.hidden = false;
          fb.className = 'q-feedback neutral';
          fb.innerHTML = '<p>Hmm — could not check that one (wifi?). Moving on.</p>' +
            '<button class="primary-btn" type="button">Next</button>';
          fb.querySelector('button').onclick = nextOrDone;
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
        fb.querySelector('button').onclick = nextOrDone;
        fb.querySelector('button').focus();
      });
    }

    show();
  }

  function introCard(host, opts, beginLabel, onBegin) {
    var c = el('<div class="card intro-card">' +
      (opts.kicker ? '<span class="intro-kicker">' + esc(opts.kicker) + '</span>' : '') +
      '<h2>' + esc(opts.title) + '</h2>' +
      '<p class="intro-lead">' + esc(opts.text) + '</p>' +
      (opts.extra || '') +
      '<button class="primary-btn" type="button">' + esc(beginLabel) + '</button></div>');
    host.appendChild(c);
    c.querySelector('button').onclick = function () { host.innerHTML = ''; onBegin(); };
  }

  /* ================= briefing (cinematic dossier) ================= */
  Engines.briefing = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      // optional hook-photo strip (real images, credited in assets/img/CREDITS.md)
      var photoStrip = (cfg.images && cfg.images.length)
        ? '<div class="dossier-photos">' + cfg.images.map(function (im) {
            return '<figure><img src="' + esc(im.src) + '" alt="' + esc(im.alt || '') + '" loading="lazy">' +
              (im.caption ? '<figcaption>' + esc(im.caption) + '</figcaption>' : '') + '</figure>';
          }).join('') + '</div>'
        : '';
      var d = el('<div class="dossier">' +
        '<div class="dossier-top"><span class="dossier-stamp">CLASSIFIED</span><span class="dossier-clearance">' + esc(cfg.clearance || '') + '</span></div>' +
        '<h1 class="dossier-headline"></h1>' +
        '<div class="dossier-lines"></div>' +
        photoStrip +
        '<button class="primary-btn dossier-cta" type="button" hidden>' + esc(cfg.cta || 'Continue') + '</button>' +
        '<button class="dossier-skip" type="button">Skip &raquo;</button>' +
        '</div>');
      host.appendChild(d);
      var headline = d.querySelector('.dossier-headline');
      var linesBox = d.querySelector('.dossier-lines');
      var cta = d.querySelector('.dossier-cta');
      var timers = [];
      function reveal() {
        timers.forEach(clearTimeout);
        headline.textContent = cfg.headline;
        linesBox.innerHTML = (cfg.lines || []).map(function (l) { return '<p class="dossier-line show">' + esc(l) + '</p>'; }).join('');
        cta.hidden = false;
      }
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
              p.className = 'dossier-line'; p.textContent = l;
              linesBox.appendChild(p);
              /* capture p, never lastChild — throttled tabs batch rAF callbacks
                 and lastChild would point at the newest line for all of them */
              requestAnimationFrame(function () { p.classList.add('show'); });
              if (i === cfg.lines.length - 1) timers.push(setTimeout(function () { cta.hidden = false; }, 700));
            }, 900 * i));
          });
        }
      })();
      d.querySelector('.dossier-skip').onclick = reveal;
      cta.onclick = function () { finishChunk(ctx); };
    }
  };

  /* ================= items (calibration / rules checks) ================= */
  Engines.items = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      introCard(host, {
        kicker: chunk.title, title: cfg.variant === 'calibration' ? 'Console calibration' : 'Quick check',
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

      function showStep() {
        if (i >= cfg.steps.length) { rulesCheck(); return; }
        var st = cfg.steps[i];
        var c = el('<div class="card step-card">' +
          '<span class="runner-progress">Step ' + (i + 1) + ' of ' + cfg.steps.length + '</span>' +
          '<div class="step-head"><span class="step-icon">' + esc(st.icon || '') + '</span><h2>' + esc(st.title) + '</h2></div>' +
          '<p class="step-text">' + esc(st.text) + '</p>' +
          '<div class="step-action"></div></div>');
        host.innerHTML = '';
        host.appendChild(c);
        var action = c.querySelector('.step-action');
        if (st.sim === 'username') {
          action.innerHTML = '<div class="sim-login"><label>Practice console</label>' +
            '<input class="text-input sim-user" maxlength="40" autocomplete="off" spellcheck="false" placeholder="type your username here">' +
            '<p class="sim-msg"></p><button class="primary-btn" type="button">Check it</button></div>';
          var input = action.querySelector('input'), msg = action.querySelector('.sim-msg');
          action.querySelector('button').onclick = function () {
            var v = input.value;
            if (!v.trim()) { msg.textContent = 'Nothing typed yet — give it a go.'; return; }
            if (/\s/.test(v.trim())) { msg.textContent = 'Sneaky SPACE spotted — usernames never have spaces. Try again.'; return; }
            if (v === v.toUpperCase() && /[A-Z]/.test(v)) { msg.textContent = 'ALL CAPITALS? Check Caps Lock isn’t on — usernames are lowercase. Try again.'; return; }
            msg.textContent = '';
            input.disabled = true;
            action.querySelector('button').disabled = true;
            c.insertAdjacentHTML('beforeend', '<p class="step-done">&#10003; Smooth typing, Agent.</p>');
            setTimeout(function () { i++; showStep(); }, 900);
          };
          input.value = '';
        } else {
          action.innerHTML = '<button class="confirm-step" type="button"><span class="confirm-box"></span>' + esc(st.confirm || 'Done') + '</button>';
          action.querySelector('button').onclick = function () {
            action.querySelector('button').classList.add('ticked');
            setTimeout(function () { i++; showStep(); }, 550);
          };
        }
      }

      function rulesCheck() {
        host.innerHTML = '';
        if (!cfg.items || !cfg.items.length) { finishChunk(ctx); return; }
        introCard(host, { kicker: 'Seal the badge', title: 'Ground rules check', text: cfg.itemsIntro || '' }, 'Go', function () {
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
      introCard(host, { kicker: chunk.title, title: 'Learn your console', text: cfg.intro || '' }, 'Follow the beacon', startTour);

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
        }
        callout.querySelector('button').onclick = function () { si++; showStop(); };
        showStop();
      }

      function rulesCheck() {
        introCard(host, { kicker: 'Seal the badge', title: 'Navigator check', text: cfg.itemsIntro || '' }, 'Go', function () {
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
                else host.innerHTML = '<div class="card"><p>The Vault door is stuck (wifi?). Ask your teacher, then try again.</p></div>';
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
        var stage = el('<div class="vault-stage">' +
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
                PairKit.revealCard(function () { PairKit.stop(); debrief(); });
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
        function startHold() {
          if (signBtn.disabled) return;
          signBtn.classList.add('holding');
          holdTimer = setTimeout(function () {
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

      function belonging() {
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
                : 'The line to HQ dropped (wifi?). Nothing is lost — try again in a moment.') +
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
          text: 'A quick brain warm-up from past missions. Answer each one, see why, move on. Never graded, never public.'
        }, 'Warm up', function () {
          itemRunner(host, {
            items: r.items, mode: 'feedback',
            markFn: function (it, i) {
              return ctx.call('recapAnswer', { lessonNum: String(ctx.lessonEntry.num), itemId: it.id, choice: i });
            },
            onDone: function (res) {
              var c = el('<div class="card recap-done"><h2>Brain warmed up</h2><p class="recap-score">' + res.right + ' of ' + res.total + '</p>' +
                '<p>' + (res.right === res.total ? 'Perfect recall, Agent.' : 'The ones you missed will come back around — that’s how remembering works.') + '</p>' +
                '<button class="primary-btn" type="button">Start today’s mission</button></div>');
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

  Engines.selfeval = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var conf = [], diff = '';
      var c = el('<div class="card se-card"><h2>How did it go?</h2><div class="se-rows"></div>' +
        (cfg.difficulty ? '<div class="se-diff"><p>How did today feel?</p><div class="se-diff-chips">' +
          '<button class="se-chip" data-d="0" type="button">&#128994; Easy</button>' +
          '<button class="se-chip" data-d="1" type="button">&#128993; Just right</button>' +
          '<button class="se-chip" data-d="2" type="button">&#128308; Tricky</button></div></div>' : '') +
        (cfg.comment ? '<textarea class="se-comment" maxlength="80" placeholder="Anything you want your teacher to know? (optional)"></textarea>' : '') +
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
            var safe = el('<div class="card"><h2>Report saved on this machine</h2><p>The wifi is playing up, so your answers are safe here and will send automatically. Mission complete.</p>' +
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
            '<button class="primary-btn" type="button">Finish the mission</button></div>');
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
        '<p>No problem, Agent — the mission waited for you. Work through it at your own pace: the platform will guide you exactly like it guided the class. Ask your teacher if anything needs a real human.</p>' +
        '<button class="primary-btn" type="button">Start the catch-up</button></div>');
      host.appendChild(c);
      c.querySelector('button').onclick = function () { ctx.next(); };
    }
  };

  /* ================= ladder (L2+: physical-first challenge ladder) =========
     Rung cards for out-of-platform building (MakeCode/Scratch in another tab):
     each rung is a target behaviour the pair makes REAL, tested on the actual
     device - the platform never marks it, the physical result is the test
     (doc 07 L2). Debug Hints cost a signal point; the badge XP honours clean
     rungs. Progress survives refresh via the draft. */
  Engines.ladder = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var rungs = cfg.rungs || [];
      var draft = (ctx.draft && ctx.draft.ladder) || {};
      var done = draft.done || [];      // rung ids cleared
      var hinted = draft.hinted || [];  // rung ids where the hint was bought
      var stretchDone = !!draft.stretch;
      var idx = 0;
      while (idx < rungs.length && done.indexOf(String(rungs[idx].id)) !== -1) idx++;
      var unpluggedDone = !!draft.unplugged || idx > 0;

      function saveLadder() {
        if (ctx.review) return;
        App.state.draft = App.state.draft || {};
        App.state.draft.ladder = { done: done, hinted: hinted, unplugged: unpluggedDone ? 1 : 0, stretch: stretchDone ? 1 : 0 };
        ctx.saveEvent({ draft: App.state.draft });
      }

      function pointsBar() {
        var lit = rungs.map(function (r) {
          var isDone = done.indexOf(String(r.id)) !== -1;
          var isHint = hinted.indexOf(String(r.id)) !== -1;
          return '<span class="rung-dot' + (isDone ? ' lit' : '') + (isHint ? ' hinted' : '') + '" title="' + esc(r.title) + '">&#9889;</span>';
        }).join('');
        return '<div class="rung-bar">' + lit + (cfg.stretch ? '<span class="rung-dot stretch' + (stretchDone ? ' lit' : '') + '">&#11088;</span>' : '') + '</div>';
      }

      function openerRow() {
        return cfg.makecode
          ? '<p class="ladder-open"><a class="ghost-btn" href="' + esc(cfg.makecode.url) + '" target="_blank" rel="noopener">' + esc(cfg.makecode.label || 'Open MakeCode') + ' &#8599;</a>' +
            '<span class="ladder-open-note">keep it open in its own tab &mdash; you will hop between it and this ladder</span></p>'
          : '';
      }

      // Catch-up runs are SOLO: swap the pair framing out (Session B rule -
      // an absent pupil is never told to confer with a partner who isn't there)
      var solo = !!ctx.catchup;
      introCard(host, {
        kicker: chunk.title, title: cfg.title || 'The Challenge Ladder',
        text: (solo && cfg.introSolo) ? cfg.introSolo : (cfg.intro || ''),
        extra: pointsBar() + openerRow()
      }, unpluggedDone ? 'Back to the ladder' : 'Start climbing', function () {
        if (!unpluggedDone && cfg.unplugged) unplugged(); else showRung();
      });

      function unplugged() {
        var up = cfg.unplugged;
        var upLines = (solo && up.soloLines) ? up.soloLines : (up.lines || []);
        var upConfirm = (solo && up.soloConfirm) ? up.soloConfirm : (up.confirm || 'We both took a turn');
        var lines = upLines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('');
        var c = el('<div class="card ladder-card"><span class="intro-kicker">' + esc(up.title || 'Rung 1') + '</span>' +
          '<h2>&#128268; No screens yet &mdash; you two ARE the circuit</h2>' +
          '<ol class="ladder-script">' + lines + '</ol>' +
          '<button class="confirm-step" type="button"><span class="confirm-box"></span><span>' + esc(upConfirm) + '</span></button></div>');
        host.appendChild(c);
        c.querySelector('.confirm-step').onclick = function () {
          this.classList.add('ticked');
          unpluggedDone = true;
          saveLadder();
          setTimeout(function () { host.innerHTML = ''; showRung(); }, 550);
        };
      }

      function showRung() {
        if (idx >= rungs.length) { stretchOrFinish(); return; }
        var r = rungs[idx];
        var hintUsed = hinted.indexOf(String(r.id)) !== -1;
        var c = el('<div class="card ladder-card"><span class="intro-kicker">' + esc(r.title) + '</span>' +
          pointsBar() +
          '<h2 class="rung-target">' + esc(r.target) + '</h2>' +
          (r.img ? '<img class="rung-img" src="' + esc(r.img) + '" alt="The blocks for this rung">' : '') +
          '<div class="rung-test"><p>&#128293; <b>The real test:</b> ' + esc(r.test || 'Flash it to the device and make it happen for real.') + '</p></div>' +
          '<div class="rung-hint" hidden><p>&#128161; ' + esc(r.hint || '') + '</p></div>' +
          '<div class="rung-actions">' +
          '<button class="primary-btn rung-worked" type="button">It worked on the device! &#9889;</button>' +
          (r.hint && !hintUsed ? '<button class="ghost-btn rung-hint-btn" type="button">Debug Hint (costs a signal point)</button>' : '') +
          '</div></div>');
        host.innerHTML = '';
        host.appendChild(c);
        if (hintUsed) { c.querySelector('.rung-hint').hidden = false; }
        var hb = c.querySelector('.rung-hint-btn');
        if (hb) hb.onclick = function () {
          hinted.push(String(r.id));
          saveLadder();
          c.querySelector('.rung-hint').hidden = false;
          hb.remove();
        };
        c.querySelector('.rung-worked').onclick = function () {
          done.push(String(r.id));
          saveLadder();
          App.toast('Rung cleared &mdash; signal locked in.');
          idx++;
          showRung();
        };
      }

      function stretchOrFinish() {
        if (!cfg.stretch || stretchDone) { finishLadder(); return; }
        var s = cfg.stretch;
        var c = el('<div class="card ladder-card"><span class="intro-kicker">' + esc(s.title || 'Stretch') + '</span>' +
          pointsBar() +
          '<h2 class="rung-target">' + esc(s.target) + '</h2>' +
          (s.img ? '<img class="rung-img" src="' + esc(s.img) + '" alt="Stretch blocks">' : '') +
          '<div class="rung-actions">' +
          '<button class="primary-btn" type="button">We built it! &#11088;</button>' +
          '<button class="ghost-btn" type="button">Finish the ladder without it</button>' +
          '</div></div>');
        host.innerHTML = '';
        host.appendChild(c);
        var btns = c.querySelectorAll('button');
        btns[0].onclick = function () { stretchDone = true; saveLadder(); finishLadder(); };
        btns[1].onclick = function () { finishLadder(); };
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
     lexicographic index of the correct permutation, marked server-side via
     the ordinary apiMark call - no readable key ever reaches the client
     (red team #1 holds). One attempt, honest feedback, correct order revealed
     after, result recorded as a detail key (never blocks completion). */
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
      var placed = []; // source indices in the pupil's chosen order
      introCard(host, { kicker: 'Exit check — part 2', title: cfg.title || 'Build the program', text: cfg.intro || '' }, 'Ready', build);

      function build() {
        var c = el('<div class="card parsons-card">' +
          '<p class="parsons-goal">&#127919; ' + esc(it.prompt) + '</p>' +
          '<div class="parsons-cols">' +
          '<div class="parsons-tray"><h3>Blocks</h3><div class="pt-list"></div></div>' +
          '<div class="parsons-prog"><h3>Your program</h3><ol class="pp-list"></ol></div>' +
          '</div>' +
          '<p class="parsons-note">Tap a block to add it &mdash; tap it again in your program to send it back.</p>' +
          '<button class="primary-btn parsons-check" type="button" disabled>Check my program</button>' +
          '<div class="q-feedback" hidden></div></div>');
        host.appendChild(c);
        var tray = c.querySelector('.pt-list'), prog = c.querySelector('.pp-list');
        var checkBtn = c.querySelector('.parsons-check');

        function render() {
          tray.innerHTML = '';
          prog.innerHTML = '';
          it.blocks.forEach(function (b, si) {
            if (placed.indexOf(si) !== -1) return;
            var n = el('<button class="parsons-block" type="button">' + esc(b) + '</button>');
            n.onclick = function () { placed.push(si); render(); };
            tray.appendChild(n);
          });
          placed.forEach(function (si) {
            var n = el('<li><button class="parsons-block placed" type="button">' + esc(it.blocks[si]) + '</button></li>');
            n.querySelector('button').onclick = function () {
              placed.splice(placed.indexOf(si), 1);
              render();
            };
            prog.appendChild(n);
          });
          checkBtn.disabled = placed.length !== it.blocks.length;
        }
        render();

        checkBtn.onclick = function () {
          checkBtn.disabled = true;
          c.querySelectorAll('.parsons-block').forEach(function (b) { b.disabled = true; });
          ctx.markItem(it.id, permIndex(placed)).then(function (r) {
            var fb = c.querySelector('.q-feedback');
            fb.hidden = false;
            if (!r || !r.ok) {
              fb.className = 'q-feedback neutral';
              fb.innerHTML = '<p>Hmm &mdash; could not check that one (wifi?). Moving on.</p><button class="primary-btn" type="button">Continue</button>';
            } else if (r.correct) {
              fb.className = 'q-feedback good';
              fb.innerHTML = '<p class="q-verdict">Correct &mdash; that program does exactly what the mission asked.</p>' +
                (r.explain ? '<p class="q-explain">' + esc(r.explain) + '</p>' : '') +
                '<button class="primary-btn" type="button">Continue</button>';
            } else {
              var order = permFromIndex(Number(r.correctIdx), it.blocks.length);
              fb.className = 'q-feedback bad';
              fb.innerHTML = '<p class="q-verdict">Not quite &mdash; here is the working order:</p>' +
                '<ol class="parsons-answer">' + order.map(function (si) { return '<li>' + esc(it.blocks[si]) + '</li>'; }).join('') + '</ol>' +
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
      var c = el('<div class="card af-card"><span class="intro-kicker">' + esc(chunk.title) + '</span>' +
        '<h2>' + esc(cfg.title || 'Bank your build') + '</h2>' +
        '<p class="intro-lead">' + esc(cfg.intro || '') + '</p>' +
        '<ol class="af-steps">' + steps + '</ol>' +
        '<div class="rung-actions">' +
        '<button class="primary-btn" type="button">Run the HQ Inspection</button>' +
        '<button class="ghost-btn" type="button" hidden>Continue without banking (ask your teacher)</button>' +
        '</div><div class="af-result"></div></div>');
      host.appendChild(c);
      var runBtn = c.querySelectorAll('button')[0];
      var skipBtn = c.querySelectorAll('button')[1];
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
            box.innerHTML = '<div class="dc-row miss"><span class="dc-mark">&#10007;</span><span>The line to HQ dropped (wifi?) &mdash; try again in a moment.</span></div>';
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
              (r.noFolder ? 'HQ could not find your School &gt; DT Work folder &mdash; it is built in the Files That Follow You side quest.'
                : 'No freshly-saved build found in DT Work yet.') + '</span></div>' +
              '<p>' + esc(cfg.failText || 'Check each step above, then run the inspection again.') + '</p>';
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
      var c2 = el('<div class="card video-card"><h2>' + esc(chunk.title) + '</h2>' +
        '<video controls preload="metadata" playsinline ' + (cfg.poster ? 'poster="' + esc(cfg.poster) + '"' : '') + ' src="' + esc(cfg.src) + '"></video>' +
        (chapters ? '<div class="vid-chapters">' + chapters + '</div>' : '') +
        '<button class="primary-btn" type="button">Done watching</button></div>');
      host.appendChild(c2);
      var vid = c2.querySelector('video');
      c2.querySelectorAll('.vid-chapter').forEach(function (b) {
        b.onclick = function () { vid.currentTime = Number(b.getAttribute('data-t')); vid.play(); };
      });
      c2.querySelector('.primary-btn').onclick = function () { vid.pause(); finishChunk(ctx); };
    }
  };

})(window);
