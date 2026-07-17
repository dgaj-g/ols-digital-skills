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

  /* ================= shared item runner =================
     modes: 'feedback' (mark each tap, show why), 'neutral' (log + move on),
     'collect' (record silently). */
  function itemRunner(host, opts) {
    var idx = 0, right = 0, answers = {};
    var wrap = el('<div class="runner"></div>');
    host.appendChild(wrap);

    function progress() {
      return opts.items.length > 1
        ? '<span class="runner-progress">' + (idx + 1) + ' of ' + opts.items.length + '</span>' : '';
    }

    function show() {
      var it = opts.items[idx];
      wrap.innerHTML =
        '<div class="card q-card">' +
        progress() +
        (it.topic ? '<span class="q-topic">' + esc(it.topic) + '</span>' : '') +
        '<h2 class="q-stem">' + esc(it.stem) + '</h2>' +
        '<div class="q-options">' + it.options.map(function (o, i) {
          return '<button class="q-opt" type="button" data-i="' + i + '"><span class="q-letter">' +
            'ABCD'.charAt(i) + '</span><span>' + esc(o) + '</span></button>';
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
      answers[it.id] = i;
      lockOptions();
      if (opts.mode === 'collect') { nextOrDone(); return; }
      if (opts.mode === 'neutral') {
        btn.classList.add('logged');
        btn.insertAdjacentHTML('beforeend', '<span class="q-logged">' + esc(opts.ackText || 'Logged') + ' &#10003;</span>');
        setTimeout(nextOrDone, 650);
        return;
      }
      // feedback mode: server marks
      btn.classList.add('checking');
      opts.markFn(it, i).then(function (r) {
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
          if (opts_[r.correctIdx]) opts_[r.correctIdx].classList.add('reveal');
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
      var d = el('<div class="dossier">' +
        '<div class="dossier-top"><span class="dossier-stamp">CLASSIFIED</span><span class="dossier-clearance">' + esc(cfg.clearance || '') + '</span></div>' +
        '<h1 class="dossier-headline"></h1>' +
        '<div class="dossier-lines"></div>' +
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
            onDone: function (res) { finishChunk(ctx, 'rules:' + res.right + '/' + res.total); }
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
            onDone: function (res) { finishChunk(ctx, 'nav:' + res.right + '/' + res.total); }
          });
        });
      }
    }
  };

  /* ================= vault (drag-drop filing, genuine fail state) ========== */
  Engines.vault = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var map = null, explains = {};
      // Fetch the filing map ONCE at mount (runtime-only; never in the public repo).
      ctx.call('vaultInfo', { lessonId: ctx.lesson.id }).then(function (r) {
        if (r && r.ok) { map = r.map; explains = r.explain || {}; }
      });
      introCard(host, {
        kicker: chunk.title, title: 'The Vault',
        text: cfg.intro || '',
        extra: '<div class="pair-banner">&#129309; ' + esc(cfg.pairPrompt || '') + '</div>'
      }, 'Open the Vault', begin);

      function begin() {
        if (!map) { // map still loading: brief gold pulse, then retry
          host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Opening the Vault&hellip; this can take a moment</span></div>';
          var tries = 0;
          var t = setInterval(function () {
            tries++;
            if (map) { clearInterval(t); host.innerHTML = ''; begin(); }
            else if (tries > 40) {
              clearInterval(t);
              ctx.call('vaultInfo', { lessonId: ctx.lesson.id }).then(function (r) {
                if (r && r.ok) { map = r.map; explains = r.explain || {}; host.innerHTML = ''; begin(); }
                else host.innerHTML = '<div class="card"><p>The Vault door is stuck (wifi?). Ask your teacher, then try again.</p></div>';
              });
            }
          }, 250);
          return;
        }
        var placed = {}, firstTryRight = 0, attempts = {};
        var stage = el('<div class="vault-stage">' +
          '<div class="pair-banner slim">&#129309; Agree together before you release each file.</div>' +
          '<div class="vault-score">' + esc(cfg.scoreLabel || 'Vault Integrity') + ': <b id="vault-score">&mdash;</b></div>' +
          '<div class="vault-inbox"><h3>Inbox</h3><div class="vault-tray"></div></div>' +
          '<div class="vault-folders"></div>' +
          '</div>');
        host.appendChild(stage);
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
        function drop(node, f, folderEl) {
          var fid = folderEl.getAttribute('data-id');
          attempts[f.id] = (attempts[f.id] || 0) + 1;
          if (map[f.id] === fid) {
            placed[f.id] = true;
            if (attempts[f.id] === 1) firstTryRight++;
            node.style.transform = '';
            node.classList.add('filed');
            folderEl.querySelector('.folder-files').appendChild(node);
            folderEl.classList.add('accept');
            setTimeout(function () { folderEl.classList.remove('accept'); }, 500);
            updateScore();
            if (Object.keys(placed).length === cfg.files.length) setTimeout(debrief, 700);
          } else {
            // Genuine fail state: returned, no reveal, no hint — reason it out.
            folderEl.classList.add('reject');
            setTimeout(function () { folderEl.classList.remove('reject'); }, 450);
            node.style.transform = '';
            node.classList.add('returned');
            App.toast('Returned — the Vault disagrees. Talk it through and try again.');
            setTimeout(function () { node.classList.remove('returned'); }, 700);
          }
        }
        function updateScore() {
          stage.querySelector('#vault-score').textContent = firstTryRight + '/' + cfg.files.length + ' first try';
        }

        function debrief() {
          var xp = 12 + firstTryRight * 3;
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
            var s1 = el('<div class="card sync-card"><span class="sync-badge">SYNCHRONOUS</span><p>' + esc(cfg.debrief.sync) + '</p><button class="primary-btn" type="button">And the flip side&hellip;</button></div>');
            host.appendChild(s1);
            s1.querySelector('button').onclick = function () {
              host.innerHTML = '';
              var s2 = el('<div class="card sync-card async"><span class="sync-badge">ASYNCHRONOUS</span><p>' + esc(cfg.debrief.async) + '</p><button class="primary-btn" type="button">Claim the badge</button></div>');
              host.appendChild(s2);
              s2.querySelector('button').onclick = function () {
                var badge = Object.assign({}, ctx.chunk.badge, { xp: xp });
                ctx.awardBadge(badge, 'vault:' + firstTryRight + '/' + cfg.files.length).then(function () { ctx.next(); });
              };
            };
          };
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
        signBtn.addEventListener('pointerdown', startHold);
        signBtn.addEventListener('pointerup', endHold);
        signBtn.addEventListener('pointerleave', endHold);
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
          finishChunk(ctx, 'cn:' + current);
        };
      }
    }
  };

  /* ================= recap (Do-Now engine, lessons 2+) ================= */
  Engines.recap = {
    mount: function (host, chunk, ctx) {
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
