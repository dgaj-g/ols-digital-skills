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
  /* `bonus` is added to the badge's own XP — the standing +5 stretch pattern,
     for engines whose stretch is inside their own chunk. It is always OPTIONAL
     and defaults to 0, so every existing caller behaves identically. Anything
     that uses it must stay inside the server's 40-XP-per-event ceiling, which
     qa-xp-ceiling computes from the content and enforces at the pack. */
  /* `earned` defaults to TRUE and only the two paired set-pieces pass it false.
     THE FAULT IT FIXES: the Match and the Swap carry a way-out on every screen,
     including the very first, and pressing it called straight through to here —
     which awards the chunk's badge whenever the chunk has one. So a pupil could
     open the Prediction Match, press the way out, and be handed twelve XP and a
     badge for having predicted nothing, on a card whose own words say the Match
     pays "as long as you play all six rounds". That is a sentence the screen
     contradicts (DFM 35), and it is the kind of thing only a walk finds.
     Leaving early still WORKS — the way out is never a trap (DFM 265c) — it
     simply does not pay, it says so before she commits, and the detail is still
     recorded so the Live tab shows how far she really got. */
  function finishChunk(ctx, detail, bonus, earned) {
    if (ctx._finished) return;
    ctx._finished = true;
    if (earned === false) {
      var q = ctx.saveEvent({ xp: 0, detail: detail || '' });
      if (q && q.then) q.then(function () { ctx.next(); }, function () { ctx.next(); });
      else ctx.next();
      return;
    }
    if (ctx.chunk.badge) {
      var b = Number(bonus || 0)
        ? Object.assign({}, ctx.chunk.badge, { xp: Number(ctx.chunk.badge.xp || 0) + Number(bonus) })
        : ctx.chunk.badge;
      ctx.awardBadge(b, detail).then(function () { ctx.next(); });
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
    _onEnd: null, _hooks: null,
    /* ---- WHAT THE CHANNEL HAS SAID, KEPT (S6b, 28 Aug 2026) --------------
       A beat that arrived while no screen was listening used to be GONE. The
       channel dispatched it, `_seen` marked it, and if the pupil was between
       screens at that moment — still filling in her report while her partner's
       run had already started — she lost the start of her own bot's session
       for ever, with nothing on any screen to say so. There was no backfill
       because there was nothing to back-fill FROM.
       So the pairing keeps its own transcript, in sequence order, and a screen
       that registers late is handed the whole thing (see `onEvent`). It is the
       CLIENT route on purpose: the channel already stores the messages, the
       server's own history is what fills this after a reload, and nothing on
       the server side had to move for it. */
    _log: null,
    LOG_KEEP: 300,
    transcript: function () { return (PairKit._log || []).slice(); },

    /* ---- THE PACED SEND QUEUE (S6a) -------------------------------------
       THE ROOT CAUSE, found in the server and confirmed on both sides
       (dev-server.js `doPairSend`, PathB_Code.gs `apiPairSend`): a member may
       send at most ONE channel message per second, and the refusal is
       `{ok:false, error:'too-fast'}` — silent, because the Swap's relay never
       read the reply. A bot that asks two questions and prints three lines
       fires seven sends inside two seconds, so most of them never existed:
       that is his missing second question and every missing printed line.
       `send` is left exactly as it is, because the chat dock depends on its
       immediate answer and shows its own "one message a second" toast to a
       pupil who is TYPING — a deliberate act she can simply repeat. A machine
       relay is not: a beat that is refused must be sent, not lost. So machine
       traffic goes through `relay`, which holds one in flight at a time, waits
       out the server's own limit, and retries. Order is therefore the order it
       was queued, which is what makes the watch feed's sequence honest. */
    RELAY_GAP_MS: 1100,
    _q: null, _qT: null, _qBusy: false,
    relay: function (ctx, kind, text) {
      return new Promise(function (done) {
        PairKit._q = PairKit._q || [];
        PairKit._q.push({ ctx: ctx, kind: kind, text: String(text || ''), done: done, tries: 0 });
        PairKit._pump();
      });
    },
    _pump: function () {
      if (PairKit._qBusy || !PairKit._q || !PairKit._q.length) return;
      if (!PairKit.st) {                       /* the pair is gone: settle, never hang */
        PairKit._q.splice(0, PairKit._q.length).forEach(function (j) { j.done({ ok: false, error: 'no-pair' }); });
        return;
      }
      PairKit._qBusy = true;
      var j = PairKit._q[0];
      var again = function () {
        PairKit._qBusy = false;
        PairKit._qT = setTimeout(function () { PairKit._pump(); }, PairKit.RELAY_GAP_MS);
      };
      PairKit.send(j.ctx, j.kind, j.text).then(function (r) {
        if (r && r.ok) { PairKit._q.shift(); j.done(r); return again(); }
        /* the server's own rate limit: wait it out. Anything else is a real
           refusal and is reported rather than retried for ever — a queue that
           never empties is its own kind of silent failure (DFM 42). */
        if (r && r.error === 'too-fast' && ++j.tries < 12) return again();
        PairKit._q.shift(); j.done(r || { ok: false, error: 'transport' });
        return again();
      }, function () {
        if (++j.tries < 12) return again();
        PairKit._q.shift(); j.done({ ok: false, error: 'transport' });
        return again();
      });
    },

    stop: function () {
      if (PairKit._pollT) { clearTimeout(PairKit._pollT); PairKit._pollT = null; }
      if (PairKit._chT) { clearTimeout(PairKit._chT); PairKit._chT = null; }
      if (PairKit._qT) { clearTimeout(PairKit._qT); PairKit._qT = null; }
      PairKit._handler = null; PairKit._onPoll = null; PairKit._dock = null; PairKit._onEnd = null;
    },

    /* ---- THE FIRST-MEETING WORDINGS ARE THE LESSON'S, NOT THE ENGINE'S -----
       K32(b): J2 and J3 pupils never sat J1 Lesson 1, so their first paired
       lesson gets the FULL introduction treatment — and in its own year's voice,
       not the Vault's. Every sentence on the waiting card, the matched pop, the
       trio pop and the solo notice can be supplied by the lesson, which is what
       puts them through the language gate and the read-aloud ledger like every
       other pupil sentence (DFM 190d: a string hardcoded in an engine escapes
       that gate entirely).
       EVERY FALLBACK BELOW IS J1'S OWN SHIPPED WORDING, so a lesson that
       supplies nothing renders byte-identically to the Vault (qa-pairwords
       proves it against the pre-change engine). */
    _w: null,
    say: function (k, dflt) {
      var w = PairKit._w || {};
      return w[k] == null ? dflt : String(w[k]);
    },
    /* the HTML twin: a lesson's sentence is ESCAPED (it is content, and content
       is never markup), while the J1 default is passed through untouched so the
       Vault's own entities render exactly as they always have */
    sayHtml: function (k, dfltHtml) {
      var w = PairKit._w || {};
      return w[k] == null ? dfltHtml : esc(String(w[k]));
    },
    /* A lesson's sentence with a call sign dropped into it. The SENTENCE is
       escaped (it is content) and the call sign goes in as its own bold element,
       so no lesson can ever put markup on a pupil's screen and no call sign can
       ever break the sentence around it. */
    fill: function (k, dfltHtml, token, html) {
      var w = PairKit._w || {};
      if (w[k] == null) return dfltHtml;
      var parts = String(w[k]).split(token);
      var out = esc(parts[0] || '');
      for (var i = 1; i < parts.length; i++) out += html + esc(parts[i] || '');
      return out;
    },
    ensure: function (ctx, host, cb, words, hooks) {
      PairKit.stop();
      PairKit._w = words || null;
      PairKit._hooks = hooks || null;
      PairKit.st = null; PairKit._seen = {};
      PairKit._log = []; PairKit._q = []; PairKit._qBusy = false;
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
            '<div class="pw-side"></div>' +
            '<p class="pw-hint" hidden></p>' +
            '<div class="pw-out"></div></div>');
          host.appendChild(box);
          /* THE WAY OUT IS ON THE WAITING SCREEN (spec SS C3 phase 1). A pupil at
             five-to-bell is never trapped waiting for a partner who may not
             come: leaving forfeits only the paired half, and the card says so in
             the lesson's own words. J1 supplies none of this, so the Vault's
             waiting card renders exactly as it did. */
          if (PairKit.say('leaveLabel', '')) {
            var outBox = box.querySelector('.pw-out');
            outBox.innerHTML = '<p class="pw-out-say">' + esc(PairKit.say('leaveSay', '')) + '</p>' +
              '<button class="ghost-btn pw-leave" type="button">' + esc(PairKit.say('leaveLabel', '')) + '</button>';
            App.armButton(outBox.querySelector('.pw-leave'), function () {
              if (PairKit._hooks && PairKit._hooks.onWaitOver) PairKit._hooks.onWaitOver('left');
              PairKit.stop();
              if (box) box.remove();
              cb('left');
            });
          }
        }
        var head = box.querySelector('h2');
        var stat = box.querySelector('.pw-status');
        if (r.initial) {
          /* DAMIEN, 31 Jul 2026 (rule 100): this card is up from the very first
             moment - the old blank gap while the first reply travelled was
             exactly the silent wait rule 42 forbids. */
          head.textContent = PairKit.say('openingHead', 'Opening the Vault…');
          stat.textContent = PairKit.say('openingSay', 'Checking who else is at the Vault right now…');
        } else if (Number(r.trioHold)) {
          head.textContent = PairKit.say('trioHoldHead', 'You are one of the last three.');
          stat.textContent = PairKit.say('trioHoldSay', 'The last three pupils share one Vault as a three — waiting for your third partner to arrive…');
        } else {
          head.textContent = PairKit.say('waitHead', 'Waiting to be paired.');
          stat.textContent = PairKit.say('waitSay', 'You are in the queue. The website is waiting for another pupil in your class to reach the Vault — the moment one does, you become partners and this screen changes by itself. Nothing is wrong: stay on this screen.');
        }
        /* THE SIDE SHOW IS THE ENGINE'S, NOT THE WAITING ROOM'S (K36). PairKit
           says only "she is still waiting, and this is how long for"; whether
           anything entertaining happens, and what, belongs to the lesson. That
           is what keeps J1's Vault exactly as it was — it passes no hook. */
        if (PairKit._hooks && PairKit._hooks.onWaiting) {
          PairKit._hooks.onWaiting(box.querySelector('.pw-side'), Date.now() - began, box);
        }
        var hint = box.querySelector('.pw-hint');
        if (Date.now() - began > PairKit.WAIT_HINT_MS) {
          hint.hidden = false;
          hint.textContent = PairKit.say('waitLongSay', 'Waiting a while? Wave your teacher over — they can clear you for a solo run.');
          /* ⭐ HIS RULING, 28 Aug 2026 (S12). The Swap's long-wait hint told her
             to "press the button below and test your own bot instead" — and the
             only button below LEFT the Swap. A sentence that names a control
             that is not there is rule 35 broken by the screen itself, and it is
             worse than saying nothing, because she will look for it.
             The button is CONTENT-GATED: J1's Vault supplies no `waitOwnLabel`,
             so the Vault's waiting card renders byte for byte as it always has
             (the same gate that keeps every other lesson's wording its own). */
          if (PairKit.say('waitOwnLabel', '') && !box.querySelector('.pw-own')) {
            var ownBox = box.querySelector('.pw-out');
            ownBox.insertAdjacentHTML('afterbegin',
              '<button class="primary-btn pw-own" type="button">' +
              esc(PairKit.say('waitOwnLabel', '')) + '</button>');
            App.armButton(box.querySelector('.pw-own'), function () {
              if (PairKit._hooks && PairKit._hooks.onWaitOver) PairKit._hooks.onWaitOver('own');
              PairKit.stop();
              if (box) box.remove();
              cb('own');
            });
          }
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
            if (PairKit._hooks && PairKit._hooks.onWaitOver) PairKit._hooks.onWaitOver('solo');
            if (box) box.remove();
            // The gate released her alone: she is the last one at the Vault with
            // nobody left to match. Never silent - catch-up runs keep their own
            // banner and never reach here.
            PairKit._statePop({
              kicker: PairKit.say('soloKicker', 'NO PARTNER'),
              title: PairKit.say('soloTitle', 'Nobody left to pair with.'),
              lines: [PairKit.sayHtml('soloLine',
                'Everyone else in your class has already been through the Vault, so you are ' +
                'doing this one solo &mdash; you make the calls yourself, and everything else ' +
                'works the same.')],
              button: PairKit.say('soloButton', 'Open the Vault')
            }, function () { cb('solo'); });
            return;
          }
          if (r.state === 'paired') {
            if (PairKit._hooks && PairKit._hooks.onWaitOver) PairKit._hooks.onWaitOver('matched');
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
      var trio = st.members.length > 2;
      var partners = st.members.filter(function (_, i) { return i !== Number(st.mi); });
      var pre = PairKit.say('signPrefix', 'Agent ');
      var tags = partners.map(function (cn) { return '<b>' + esc(pre + String(cn)) + '</b>'; });
      /* HER OWN CALL SIGN IS SAID FIRST (DFM 103, and K35(3): "ok, but make sure
         they are told what their codename is"). J1 supplies no `mineLine`, so
         the Vault's pop is exactly the three paragraphs it has always been. */
      var mine = String(st.members[Number(st.mi)] || '');
      var mineTag = '<b class="pk-mysign">' + esc(pre + mine) + '</b>';
      var mineHtml = PairKit.fill('mineLine', '', '{sign}', mineTag);
      var secret = PairKit.sayHtml(trio ? 'secretTrio' : 'secretPair',
        'Who ' + (trio ? 'they really are stays' : 'she really is stays') +
        ' secret until the Vault is sealed &mdash; so keep real names out of the message box, ' +
        'including your own. Remember: your teacher can read every message.');
      var lead = trio
        ? PairKit.fill('trioLead',
            'Your partners for this Vault are ' + tags.join(' and ') + '. Your class has an odd ' +
            'number at the Vault, so the last three share one Vault together.',
            '{signs}', tags.join(' and '))
        : PairKit.fill('pairLead',
            'Your partner for this Vault is ' + (tags[0] || '<b>another agent</b>') +
            '. She is at another computer, looking at the same Vault as you.',
            '{sign}', tags[0] || '');
      var close = PairKit.sayHtml(trio ? 'trioClose' : 'pairClose',
        trio ? 'Talk it through, agree, and take turns at the controls.'
             : 'Talk it through, agree, then whoever holds the controls drops the file.');
      var lines = [lead];
      if (mineHtml) lines.push(mineHtml);
      lines.push(secret, close);
      PairKit._statePop({
        kicker: PairKit.say(trio ? 'trioKicker' : 'pairKicker', trio ? 'GROUP OF THREE' : 'PARTNER FOUND'),
        title: PairKit.say(trio ? 'trioTitle' : 'pairTitle', trio ? 'You’re a three!' : 'You’ve been paired!'),
        lines: lines,
        button: PairKit.say('matchButton', 'Open the Vault together')
      }, cb);
    },

    /* the long-wait threshold, named rather than buried, so it has one home,
       a row in HUMAN_PACE_INVENTORY.md, and a harness can wind it forward to
       stand on the state it produces instead of waiting three real minutes */
    WAIT_HINT_MS: 180000,

    /* A SCREEN THAT ARRIVES LATE IS TOLD WHAT IT MISSED (S6b). Registering a
       handler replays the pairing's transcript into it, in sequence order, so
       the watch feed is built from the same code path whether a beat arrived a
       minute ago or a moment ago. The caller de-duplicates by sequence, which
       is what makes "exactly once, in order" true of both halves at once. */
    onEvent: function (fn) {
      PairKit._handler = fn;
      if (!fn) return;
      (PairKit._log || []).forEach(function (e) { try { fn(e); } catch (err) { /* one bad beat never stops the rest */ } });
    },
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
      /* kept BEFORE it is delivered, so a screen that mounts one tick later
         gets it too — the whole of S6b in one line */
      PairKit._log = PairKit._log || [];
      PairKit._log.push(e);
      if (PairKit._log.length > PairKit.LOG_KEEP) PairKit._log = PairKit._log.slice(-PairKit.LOG_KEEP);
      if (PairKit._dock) PairKit._dock(e);
      if (PairKit._handler) PairKit._handler(e);
    },

    /* ---- pairBlob (spec SS C3): one thing travels once ---------------------
       `put` publishes as ME; `get` reads a named member of my own pair. The
       server refuses anything else, so this helper carries no rules of its own
       (DFM 144: the rule lives in one home, and it is the server's). */
    blob: function (ctx, op, slot, valueOrMi) {
      var st = PairKit.st;
      if (!st) return Promise.resolve({ ok: false, error: 'no-pair' });
      var req = { lessonId: ctx.lesson.id, pid: st.pid, op: op, slot: slot };
      if (op === 'put') req.v = String(valueOrMi == null ? '' : valueOrMi);
      else req.mi = Number(valueOrMi);
      return ctx.call('pairBlob', req);
    },
    /* the other members of my pair, in index order — the one derivation both the
       swap's round-robin and the duel's reveal need */
    others: function () {
      var st = PairKit.st;
      if (!st) return [];
      var out = [];
      for (var i = 0; i < st.members.length; i++) if (i !== Number(st.mi)) out.push(i);
      return out;
    },
    /* ROUND-ROBIN PARTNER: in a pair this is simply the other one; in a trio it
       is the NEXT member round, so A tests B, B tests C, C tests A — each tests
       once and each is tested once (SS C3 phase 4). */
    nextRound: function () {
      var st = PairKit.st;
      if (!st) return -1;
      var n = st.members.length;
      if (n < 2) return -1;
      return (Number(st.mi) + 1) % n;
    },
    prevRound: function () {
      var st = PairKit.st;
      if (!st) return -1;
      var n = st.members.length;
      if (n < 2) return -1;
      return (Number(st.mi) + n - 1) % n;
    },

    /* ---- ARRIVAL IS UNMISTAKABLE (K35(1b) / spec SS C5) -------------------
       His words: "there needs to be a big flash or something on the screen to
       signify that they have received a message, something unmistakable and
       eye-catching."
       Three things happen together, and they are one event: a bright SWEEP
       across the thing that arrived, the new content ANIMATING IN under it, and
       a GLOW that stays until she interacts with it. The glow is the half that
       matters — a flash she was not looking at is a flash that did not happen.
       K21 IS UNTOUCHED. That ruling bans ambient travelling motion as
       atmosphere; an arrival is an EVENT, and an event may flash. The two are
       distinguished by whether anything actually changed.
       REDUCED MOTION gets the same information with no movement at all: the
       banner swaps to a high-contrast state and the glow becomes a solid
       border. Not a degraded version — the same event, said differently. */
    arrive: function (node, opts) {
      if (!node) return;
      opts = opts || {};
      var quiet = false;
      try { quiet = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      node.classList.remove('pk-arrive', 'pk-arrive-quiet', 'pk-glow');
      /* force a reflow so a second arrival on the same node really replays */
      void node.offsetWidth;
      node.classList.add(quiet ? 'pk-arrive-quiet' : 'pk-arrive');
      node.classList.add('pk-glow');
      node.setAttribute('data-arrived', '1');
      var clear = function () {
        node.classList.remove('pk-glow');
        node.removeAttribute('data-arrived');
        node.removeEventListener('pointerdown', clear);
        node.removeEventListener('keydown', clear);
      };
      node.addEventListener('pointerdown', clear);
      node.addEventListener('keydown', clear);
      if (opts.announce !== false) {
        var live = node.querySelector('[data-arrive-live]');
        if (live) live.textContent = String(opts.announce || '');
      }
      return clear;
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
        '<div class="monitor-banner">&#128737;&#65039; ' +
        PairKit.sayHtml('monitorBanner', 'MONITORED CHANNEL &mdash; Mission Command (your teacher) can read every message.') +
        '</div>' +
        (PairKit.say('mineChip', '') ? '<div class="pk-mine-chip">' +
          PairKit.fill('mineChip', '', '{sign}',
            '<b>' + esc(PairKit.say('signPrefix', 'Agent ') + String((st.members || [])[Number(st.mi)] || '')) + '</b>') +
          '</div>' : '') +
        '<div class="turn-chip" hidden></div>' +
        '<div class="chat-log" aria-live="polite"></div>' +
        '<form class="chat-form">' +
        '<input class="chat-input" type="text" maxlength="240" autocomplete="off" placeholder="' +
        esc(PairKit.say('chatPlaceholder', 'Message your partner agent\u2026')) + '">' +
        '<button class="chat-send" type="submit">' + esc(PairKit.say('chatSend', 'Send')) + '</button></form></div>');
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
          '<span class="cm-who">' + esc(mine ? PairKit.say('meWho', 'You')
            : PairKit.say('signPrefix', 'Agent ') + (st.members[mi] || '?')) + '</span>' +
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
      sys(PairKit.sayHtml('chatOpenSay', 'Channel open. Say hello — and remember Mission Command can see this.'));
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
        /* stepsClass is OPT-IN and defaults to the class Lesson 4 already uses,
           so the locked case board renders byte-identically (DFM 176). The J2
           inspection asks for its own, because on a centred card the shared one
           strands every number away from its own sentence — rule 171 says a
           numbered sequence renders one per line, and a number that has floated
           off the line it belongs to has not. */
        ? '<ol class="' + (opts.stepsClass || 'case-intro-steps') + '">' +
          opts.steps.map(function (s) { return '<li>' + fmtBold(s) + '</li>'; }).join('') + '</ol>'
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

  /* ================= PyRun — THE PYTHON RUNTIME (runner spec §A, v1) =========
     Built 19 Aug 2026, after the prototype gate (spec §B) proved Skulpt runs
     inside the Apps Script sandbox: `eval`/`new Function` are allowed on the
     googleusercontent origin, a cross-origin <script src> from Pages loads the
     library in ~450ms, a five-line program returns exact stdout, the execLimit
     guard fires on `while True: pass`, and thirty consecutive runs cost +1.8MB
     of a 4GB heap. Because the script tag works, NOTHING is inlined: the paste
     does not grow by a byte (the costed fallback was +966,760, a 2.25x paste).

     V1 SCOPE, and it is deliberately small (the spec's own scope discipline):
     assembled or authored code, real stdout, an honest error, an expected-output
     comparison. NO turtle. NO input(). NO free-typing beyond single-line blanks.
     Those arrive with the lessons that need them (J2 L3 input, J2 L5 turtle).

     THE CONSOLE IS HONEST (rule 35, and DFM 214's "say what her job is").
     It shows what the program really printed. On an error it shows the REAL
     Python error AND one plain-words line underneath it — never a fake error,
     and never a hidden one. The plain-words lines are CONTENT, not engine
     literals, because a string hardcoded in an engine escapes the language gate
     entirely (DFM 190d/192g); the engine's own copies are fallbacks that the
     harness proves are never the ones a pupil reads. */
  var PyRun = global.PyRun = {
    /* one home for the library (DFM 144). The gate proved this exact pair. */
    SRC: ['assets/vendor/skulpt/skulpt.min.js', 'assets/vendor/skulpt/skulpt-stdlib.js'],
    DEFAULT_LIMIT_MS: 5000,
    _p: null,

    /* Lazily loaded, and memoised: a pupil who never reaches a run card never
       pays for the library, and a pupil who runs twenty programs pays once. */
    load: function () {
      if (PyRun._p) return PyRun._p;
      PyRun._p = PyRun.SRC.reduce(function (chain, src) {
        return chain.then(function () {
          return new Promise(function (res, rej) {
            var s = document.createElement('script');
            s.src = asset(src);
            s.async = false;
            s.onload = function () { res(); };
            s.onerror = function () { rej(new Error('pyrun-load-failed')); };
            document.head.appendChild(s);
            setTimeout(function () { rej(new Error('pyrun-load-timeout')); }, 30000);
          });
        });
      }, Promise.resolve()).then(function () {
        if (typeof Sk === 'undefined') throw new Error('pyrun-no-sk');
        return true;
      });
      return PyRun._p;
    },

    /* The shape the prototype gate proved, unchanged: one configure per run,
       output captured, execLimit as the guard. Resolves EITHER way — a program
       that fails is not an exception in this app, it is the lesson working. */
    run: function (code, opts) { return PyRun.start(code, opts).p; },

    /* v1's shape, plus the three things runner v2 needs, all OPT-IN so a v1
       caller (both Lesson 2s) configures Skulpt with exactly the same keys it
       configured yesterday:
         - opts.inputfun: a function(prompt) returning a PROMISE. Skulpt suspends
           the program while it is pending, which is what makes input() a real
           wait rather than a modal (proved in the sandbox at SS B1).
         - opts.preamble: lines run BEFORE her program and hidden from the count.
           The only caller is a harness walk seeding `random` so a pinned shape
           can exist at all (DFM 199 -- never pin a number that can move).
         - opts.epilogue: lines run AFTER, printing the probe block SS A4 reads.
         - opts.onOut: called with each fragment the program prints, as it is
           printed. The Swap uses it to relay a conversation in the order it
           really happened; everything else ignores it and is untouched.
       ABANDONMENT IS NEVER A TRAP (DFM 143/265c). `start` hands back an
       `abandon()` that REJECTS every pending input, so a pupil who leaves a
       screen mid-conversation settles the run instead of leaving a suspended
       program holding the page. It is why the resolver rejects rather than
       simply never resolving: a promise nobody settles waits for ever. */
    start: function (code, opts) {
      opts = opts || {};
      var limit = Number(opts.limitMs || PyRun.DEFAULT_LIMIT_MS);
      var pending = [], dead = false;
      function abandon() {
        dead = true;
        var q = pending.splice(0, pending.length);
        q.forEach(function (rej) { try { rej(new Error('left this screen')); } catch (e) { /* settled */ } });
      }
      var p = PyRun.load().then(function () {
        var out = '';
        var conf = {
          /* `onOut` IS OPT-IN, AND IT EXISTS FOR ONE REASON (S6a). The Chatbot
             Swap's builder watches her own bot being used on somebody else's
             machine, and until this round the printed lines only reached her as
             one clump AFTER the run finished — so the order she saw could never
             be the order it happened in. Skulpt calls `output` per write rather
             than per print, so the caller does the line-buffering; a caller that
             asks for nothing gets exactly the run it got yesterday. */
          output: function (t) {
            out += t;
            if (opts.onOut) { try { opts.onOut(t); } catch (e) { /* a relay must never stop a run */ } }
          },
          read: function (x) {
            if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) {
              throw 'File not found: ' + x;
            }
            return Sk.builtinFiles.files[x];
          },
          execLimit: limit,
          __future__: Sk.python3
        };
        if (opts.inputfun) {
          conf.inputfunTakesPrompt = true;
          conf.inputfun = function (prompt) {
            if (dead) return Promise.reject(new Error('left this screen'));
            return new Promise(function (res, rej) {
              pending.push(rej);
              Promise.resolve(opts.inputfun(String(prompt == null ? '' : prompt)))
                .then(function (v) {
                  var i = pending.indexOf(rej); if (i !== -1) pending.splice(i, 1);
                  /* ---- THE RUN CLOCK IS RESET AS THE ANSWER ARRIVES — DFM 269,
                     his J2 Lesson 3 sit, 27 Aug 2026 ------------------------
                     Skulpt's limit check is `Date.now() - Sk.execStart > Sk.execLimit`
                     on every pass of the compiled block-dispatch loop, and
                     `Sk.execStart` is set exactly ONCE per program. So while the
                     program stood suspended at input(), the five-second budget was
                     being spent on a twelve-year-old READING THE QUESTION AND
                     TYPING — and every conversation answered at human speed died
                     with TimeLimitError at whatever input line it was standing on.
                     His three screenshots are three CORRECT programs, killed at
                     lines 1, 2 and 3, his own pasted bot among them.
                     Restarting the clock HERE — in the same promise chain that
                     resolves the answer, before control goes back to the runtime —
                     means each stretch of ACTUAL EXECUTION gets the full budget and
                     none of the waiting is billed. The guard is not weakened: a
                     genuine `while True: pass` never resolves an input, so nothing
                     ever resets its clock and it still dies at the limit. That is
                     what the budget exists to measure, and now it is the only thing
                     it measures.
                     IT LIVES IN THE ENGINE, NOT IN A UI LAYER, so every caller —
                     worked, assemble, editor, the extras zone, and both Lesson 2s'
                     v1 paths — inherits it identically (DFM 144: one fact, one
                     home). `lastYield` is moved with it wherever the runtime is
                     using one, for the same reason and by the same argument.
                     Proved by RUNNING it: qa-pyrun §8 answers after 6.5 s and
                     2.5 s and requires exact stdout, requires a real runaway to
                     still die, and requires a 10,000-line loop to still finish —
                     with the engine he sat as the failing control. */
                  try {
                    if (typeof Sk !== 'undefined') {
                      Sk.execStart = Date.now();
                      if (typeof Sk.lastYield !== 'undefined') Sk.lastYield = Date.now();
                    }
                  } catch (e) { /* no runtime to re-clock: the run is already over */ }
                  res(String(v == null ? '' : v));
                }, function (e) {
                  var i = pending.indexOf(rej); if (i !== -1) pending.splice(i, 1);
                  rej(e);
                });
            });
          };
        }
        Sk.configure(conf);
        var pre = opts.preamble ? String(opts.preamble) + '\n' : '';
        var post = opts.epilogue ? '\n' + String(opts.epilogue) : '';
        var preLines = pre ? pre.split('\n').length - 1 : 0;
        return Sk.misceval.asyncToPromise(function () {
          return Sk.importMainWithBody('<stdin>', false, pre + code + post, true);
        }).then(function () {
          return { ok: true, out: out, err: '', limitMs: limit, preLines: preLines };
        }, function (e) {
          return { ok: false, out: out, err: String(e), limitMs: limit, preLines: preLines };
        });
      }, function () {
        return { ok: false, out: '', err: '', offline: true, limitMs: limit, preLines: 0 };
      });
      return { p: p, abandon: abandon };
    },

    /* Which plain-words line belongs to this error. The KEY is chosen here; the
       WORDS come from the lesson (cfg.errorWords), so every sentence a pupil
       reads has been through the gate and carries a read-aloud record. */
    errKind: function (errText) {
      var s = String(errText || '');
      if (/TimeLimitError/i.test(s)) return 'timelimit';
      if (/IndentationError|TabError/i.test(s)) return 'indent';
      if (/NameError/i.test(s)) return 'name';
      if (/SyntaxError/i.test(s)) return 'syntax';
      if (/TypeError/i.test(s)) return 'type';
      if (/ValueError/i.test(s)) return 'value';
      return 'other';
    },
    /* The engine's own words are a FALLBACK ONLY. qa-pyrun proves the lesson
       supplies every kind it can actually produce, so a pupil never reads one
       of these. They exist so a missing content key can never render a blank
       line where an explanation belongs (DFM 42: no silent nothing). */
    FALLBACK_WORDS: {
      timelimit: 'That program was still going after a few seconds, so it was stopped. Look for a loop that never ends.',
      indent: 'One of the lines is not lined up with the others. Lines inside a loop start four spaces in.',
      name: 'Python does not know that name. Check how it is spelled, and check you made it before you used it.',
      syntax: 'Python could not read that line. Look for a missing bracket or a missing speech mark.',
      type: 'You have joined a word to a number. Put str( ) around the number first.',
      value: 'Python understood the line, but not the value it was given.',
      other: 'Python stopped at the line named above. Read that line again, slowly.'
    },
    /* ---- v2: THE FINE KINDS, MEASURED IN THE SANDBOX (spec SS A5, K38a) ------
       The prototype gate ran every mistake these two builds can really produce,
       in the real serving origin, and the answer was not the one the design
       assumed: **Skulpt never says IndentationError.** A stray leading space, a
       loop body with no indent at all and a missing colon ALL arrive as the same
       `SyntaxError: bad input`, an unclosed bracket arrives as `EOF in multi-line
       statement`, and a mis-lined-up indent arrives as `unindent does not match`.
       Three more classes these lessons produce every day -- IndexError from a
       list position that is not there, AttributeError from `.add(` instead of
       `.append(`, ZeroDivisionError -- had no kind at all and fell to the
       generic. Authoring a line for IndentationError would have shipped a
       sentence no pupil could ever reach WHILE leaving the stray-space case
       reading the broken-quote line: wrong help, which is worse than none.
       THE FINE KIND IS TRIED FIRST AND THE COARSE KIND IS THE FALLBACK, which is
       what keeps j2-02 and j3-02 byte-identical: their `errorWords` maps carry
       only the v1 keys, no fine key is ever found in them, and the lookup lands
       exactly where it landed yesterday (qa-pyrun's control asserts it). */
    /* There is deliberately NO table of "which coarse kind does this fine kind
       fall back to". `errKind` already answers that question by running its own
       regexes over the same text, and a second copy of the answer is a second
       chance for the two to disagree (DFM 144) -- which is exactly what happened
       when this file first carried one: it said `unindent -> indent`, while the
       engine really returns `syntax` for Skulpt's own "unindent does not match"
       wording, because the `indent` branch tests for IndentationError and Skulpt
       never says it. The harness caught it before any content leaned on it, and
       the fix is the table's deletion, not its correction. */
    errKind2: function (errText) {
      var s = String(errText || '');
      if (/TimeLimitError/i.test(s)) return 'timelimit';
      if (/ExternalError/i.test(s)) return 'abandoned';
      if (/EOF in multi-line statement/i.test(s)) return 'eof';
      if (/unindent does not match/i.test(s)) return 'unindent';
      if (/IndentationError|TabError/i.test(s)) return 'unindent';
      if (/SyntaxError/i.test(s)) return 'badinput';
      if (/NameError/i.test(s)) return 'name';
      if (/TypeError/i.test(s)) return 'type';
      if (/IndexError/i.test(s)) return 'index';
      if (/AttributeError/i.test(s)) return 'attr';
      if (/ZeroDivisionError/i.test(s)) return 'zero';
      if (/ValueError/i.test(s)) return 'value';
      return 'other';
    },
    /* AND THERE IS DELIBERATELY NO SECOND FALLBACK TABLE FOR THE FINE KINDS.
       One was written, with six sentences in it, and it was deleted the same
       night: a new engine sentence that no gate reads is exactly the debt
       `ENGINE_STRINGS_DEBT.md` exists to stop growing, and this round's rule was
       that every string it adds is content-owned from birth. It costs nothing to
       drop, because qa-pyrun already proves -- by RUNNING each chunk's own
       decoys and watching what they raise -- that a lesson supplies words for
       every kind it can really produce. A fine kind a lesson forgot falls to its
       own COARSE sentence, which every chunk is likewise proved to carry, so the
       floor under a pupil is a real sentence either way and never a blank
       (DFM 42) and never raw Python. */
    plain: function (errText, words) {
      var fine = PyRun.errKind2(errText);
      var coarse = PyRun.errKind(errText);
      var w = (words && words[fine]) || (words && words[coarse]) ||
        PyRun.FALLBACK_WORDS[coarse] || PyRun.FALLBACK_WORDS.other;
      return { kind: fine, coarse: coarse, text: String(w) };
    },

    /* Expected-output comparison. Trailing spaces on a line and the final
       newline are forgiven, because neither is something a pupil can see on
       screen — comparing on invisible characters would be a fail state she
       could never diagnose (rule 35's family). Everything else must match. */
    tidy: function (s) {
      return String(s == null ? '' : s).replace(/\r/g, '')
        .split('\n').map(function (l) { return l.replace(/[ \t]+$/, ''); })
        .join('\n').replace(/\n+$/, '');
    },
    matches: function (actual, expected) {
      var want = Array.isArray(expected) ? expected.join('\n') : expected;
      return PyRun.tidy(actual) === PyRun.tidy(want);
    },

    /* a one-line reason parked directly after a control that has gone to
       sleep, and taken away the moment it wakes. Nothing else on the platform
       needed one until a program could stop halfway through and wait. */
    waitNote: function (btn, text) {
      if (!btn) return;
      var n = btn.parentNode && btn.parentNode.querySelector('.pyrun-waitnote');
      if (!n) {
        n = el('<p class="pyrun-waitnote" role="status"></p>');
        btn.insertAdjacentElement('afterend', n);
      }
      n.textContent = String(text || '');
      n.hidden = false;
      return n;
    },
    clearWaitNote: function (btn) {
      var n = btn && btn.parentNode && btn.parentNode.querySelector('.pyrun-waitnote');
      if (n) n.remove();
    },

    /* ---- the console surface -------------------------------------------
       A NEW pupil surface, so it sets its OWN ink on its OWN ground and never
       inherits the shell's light text (the exact fault DFM 207g found on the
       studio QA desk: a light plate inheriting light type). qa-readability
       measures it on every skin. */
    console: function (host, labels) {
      labels = labels || {};
      var box = el('<div class="pyc">' +
        '<div class="pyc-bar"><span class="pyc-dot"></span><span class="pyc-title">' +
        esc(labels.title || 'The console') + '</span></div>' +
        '<div class="pyc-body" role="status" aria-live="polite"></div></div>');
      host.appendChild(box);
      var body = box.querySelector('.pyc-body');
      var api = {
        node: box,
        idle: function () {
          box.className = 'pyc';
          body.innerHTML = '<p class="pyc-idle">' +
            esc(labels.idle || 'Nothing has run yet. Build your program, then press RUN.') + '</p>';
        },
        /* DFM 42/161: the control that starts a wait owns the waiting state. */
        running: function () {
          box.className = 'pyc is-running';
          body.innerHTML = '<p class="pyc-run"><span class="pyc-spin"></span>' +
            esc(labels.running || 'Running your program…') + '</p>';
        },
        show: function (res, words) {
          var printed = PyRun.tidy(res.out);
          var html = '';
          if (res.offline) {
            box.className = 'pyc is-bad';
            body.innerHTML = '<p class="pyc-plain">' +
              esc(labels.offline || 'Python did not load just now. Ask your teacher, and try RUN again in a moment.') +
              '</p>';
            return;
          }
          if (printed) {
            html += '<p class="pyc-lead">' + esc(labels.printedLead || 'Your program printed this:') + '</p>' +
              '<pre class="pyc-out">' + esc(printed) + '</pre>';
          } else if (res.ok) {
            html += '<p class="pyc-lead">' + esc(labels.nothingLead || 'Your program ran, and it printed nothing at all.') + '</p>';
          }
          if (!res.ok) {
            var p = PyRun.plain(res.err, words);
            /* the REAL error, then ONE plain line under it. Both, always. */
            html += '<p class="pyc-lead pyc-errlead">' + esc(labels.errorLead || 'Python stopped, and this is exactly what it said:') + '</p>' +
              '<pre class="pyc-err">' + esc(String(res.err).replace(/^Error:\s*/, '')) + '</pre>' +
              '<p class="pyc-plain">' + esc(p.text) + '</p>';
          }
          box.className = 'pyc ' + (res.ok ? 'is-ok' : 'is-bad');
          body.innerHTML = html;
        }
      };
      api.idle();
      return api;
    },

    /* ================= v2: THE CHAT TRANSCRIPT (spec SS A1a / K38e) ==========
       A conversation is not a console. When a program asks a question, the
       question and the answer belong in a labelled exchange the pupil can read
       back -- her bot on one side, the person answering on the other, and FRED
       in a bubble style of his own so a side show can never be mistaken for the
       lesson.
       THE REPLY BOX IS A SIBLING ROW AND NEVER NESTS (DFM 267f, his Space-bar
       find). It sits in its own row beside its own Send button; nothing here
       puts an <input> inside a <button> or an <a>, and qa-nested-interactive
       audits the RENDERED DOM of this surface like every other. */
    chat: function (host, labels) {
      labels = labels || {};
      var box = el('<div class="pyx">' +
        '<div class="pyx-bar"><span class="pyx-dot"></span><span class="pyx-title">' +
        esc(labels.title || 'The conversation') + '</span></div>' +
        '<div class="pyx-log" role="log" aria-live="polite"></div>' +
        '<div class="pyx-ask" hidden></div></div>');
      host.appendChild(box);
      var log = box.querySelector('.pyx-log');
      var askRow = box.querySelector('.pyx-ask');
      var api = {
        node: box,
        clear: function () {
          log.innerHTML = '<p class="pyx-idle">' +
            esc(labels.idle || 'Nothing has been said yet. Press RUN to start the conversation.') + '</p>';
          askRow.hidden = true; askRow.innerHTML = '';
        },
        /* who: 'bot' | 'user' | 'side' | 'note' */
        say: function (who, text, whoLabel) {
          var first = log.querySelector('.pyx-idle');
          if (first) log.innerHTML = '';
          log.insertAdjacentHTML('beforeend',
            '<div class="pyx-row is-' + esc(who) + '">' +
            '<span class="pyx-who">' + esc(whoLabel || '') + '</span>' +
            '<span class="pyx-text">' + esc(String(text)) + '</span></div>');
          log.scrollTop = log.scrollHeight;
        },
        /* Ask, and resolve when she presses Send (or Enter in the box). The
           returned promise is what the runtime suspends on. */
        ask: function (prompt, whoLabel, sendLabel) {
          api.say('bot', prompt, whoLabel || labels.botWho || 'The bot');
          return new Promise(function (res) {
            askRow.hidden = false;
            askRow.innerHTML =
              '<label class="pyx-ask-lab" for="pyx-reply">' + esc(labels.replyLabel || 'Your reply') + '</label>' +
              '<input id="pyx-reply" class="pyx-reply" type="text" autocomplete="off" spellcheck="false" maxlength="40">' +
              '<button class="primary-btn pyx-send" type="button">' + esc(sendLabel || labels.sendLabel || 'Send') + '</button>';
            var inp = askRow.querySelector('.pyx-reply');
            var btn = askRow.querySelector('.pyx-send');
            var done = false;
            function send() {
              if (done) return;
              var v = String(inp.value || '').trim();
              if (!v) { inp.classList.add('wants'); inp.focus(); return; }
              done = true;
              askRow.hidden = true; askRow.innerHTML = '';
              api.say('user', v, labels.userWho || 'You');
              res(v);
            }
            btn.addEventListener('click', send);
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
            inp.focus();
          });
        },
        closeAsk: function () { askRow.hidden = true; askRow.innerHTML = ''; }
      };
      api.clear();
      return api;
    },

    /* ================= v2: THE FEATURE PROBES (spec SS A4) ===================
       "the checker runs her program under seeded probes and ticks each of the
       five features only when its OBSERVABLE EFFECT is real."
       So nothing here reads her code to decide whether she got it right. Each
       probe is a fact about a RUN:
         inputs   -- the runtime really asked at least N questions
         echoes   -- every answer the tester typed came back out in the printing
         joins    -- one printed line carries ALL of the typed answers at once
         grew     -- with the marked lines neutralised, the list ends up SHORTER
         shrank   -- with the marked lines neutralised, the list ends up LONGER
         ordered  -- the list ends the run in order, and has more than one thing
         varies   -- two runs on two different seeds print different things
         block    -- a heading line, then exactly N lines, each one of her own
       `grew`/`shrank` neutralise a line by replacing it with `pass` at the same
       indent -- the same substitution qa-pyrun uses on decoys, and the reason it
       is a substitution and not a deletion is that deleting the only line in a
       loop body would break the program instead of testing it.
       WRONG STAYS WRONG. A probe that does not hold is NOT YET, and NOT YET
       never names the line to change (DFM 210's family). */
    PROBE_START: '<<<OLSPROBE>>>',
    PROBE_END: '<<<OLSEND>>>',
    EPILOGUE: [
      'print("<<<OLSPROBE>>>")',
      'for _olsk in globals():',
      '    if _olsk[0:1] != "_":',
      '        _olsv = globals()[_olsk]',
      '        if isinstance(_olsv, list):',
      '            print("L|" + _olsk + "|" + "~".join([str(_olsx) for _olsx in _olsv]))',
      'print("<<<OLSEND>>>")'
    ].join('\n'),

    /* Split a run's stdout into what SHE sees and what the probe reported. The
       pupil's console is never shown the probe block. */
    splitProbe: function (out) {
      var s = String(out == null ? '' : out);
      var i = s.indexOf(PyRun.PROBE_START);
      if (i === -1) return { text: s, lists: {} };
      var j = s.indexOf(PyRun.PROBE_END, i);
      var body = s.slice(i + PyRun.PROBE_START.length, j === -1 ? s.length : j);
      var lists = {};
      body.split('\n').forEach(function (line) {
        var m = /^L\|([^|]*)\|([\s\S]*)$/.exec(line);
        if (!m) return;
        lists[m[1]] = m[2] === '' ? [] : m[2].split('~');
      });
      return { text: s.slice(0, i), lists: lists };
    },

    /* Neutralise every line matching `re`, keeping the block valid. */
    neutralise: function (code, re) {
      return String(code).split('\n').map(function (l) {
        if (!re.test(l)) return l;
        var indent = (/^[ \t]*/.exec(l) || [''])[0];
        return indent + 'pass';
      }).join('\n');
    },

    seedPreamble: function (seed) { return 'import random\nrandom.seed(' + Number(seed) + ')'; },

    /* The biggest list a run ended with -- her playlist, whatever she named it. */
    biggestList: function (lists) {
      var best = null;
      Object.keys(lists || {}).forEach(function (k) {
        if (!best || lists[k].length > lists[best].length) best = k;
      });
      return best ? lists[best] : null;
    }
  };

  /* ---- the feature checker: one run, a handful of honest comparisons -------
     Every probe below answers a question about what HAPPENED, and the answers
     are computed here rather than read off her source. The base run is seeded
     so a harness walk can pin a shape (DFM 199); a pupil's own run is seeded
     too, because a checker whose verdict changed between two identical presses
     would be a fail state she could never diagnose (rule 35's family). The
     `varies` probe is the one place a SECOND seed is used, and it is the only
     honest way to observe that a program really picks at random. */
  PyRun.checkFeatures = function (code, features, opts) {
    opts = opts || {};
    features = features || [];
    var answers = (opts.answers || []).slice();
    var limitMs = Number(opts.limitMs || 0) || undefined;
    var seedA = Number(opts.seed == null ? 4 : opts.seed);
    var seedB = seedA + 101;
    var asked = [];
    function resolver() {
      var n = 0;
      return function (prompt) {
        asked.push(String(prompt));
        var v = answers.length ? answers[n % answers.length] : 'x';
        n++;
        return Promise.resolve(v);
      };
    }
    function once(src, seed) {
      return PyRun.run(src, {
        limitMs: limitMs,
        preamble: PyRun.seedPreamble(seed),
        epilogue: PyRun.EPILOGUE,
        inputfun: resolver()
      }).then(function (r) {
        var sp = PyRun.splitProbe(r.out);
        return { ok: r.ok, err: r.err, offline: r.offline, out: r.out, text: sp.text, lists: sp.lists };
      });
    }
    var wantVaries = features.some(function (f) { return f.probe === 'varies'; });
    var strips = features.filter(function (f) { return f.probe === 'grew' || f.probe === 'shrank'; });
    var base = null, alt = null, stripped = {};
    asked = [];
    return once(code, seedA).then(function (r) {
      base = r;
      /* a program that could not run at all has no observable effects: every
         feature is NOT YET and the console shows the real error (SS A5 level 0) */
      if (!base.ok) return null;
      if (!wantVaries) return null;
      return once(code, seedB).then(function (r2) { alt = r2; });
    }).then(function () {
      if (!base.ok) return null;
      return strips.reduce(function (ch, f) {
        return ch.then(function () {
          var re = new RegExp(String(f.mark || '\\.append\\('));
          var src = PyRun.neutralise(code, re);
          if (src === code) { stripped[f.id] = { same: true }; return; }
          return once(src, seedA).then(function (r3) { stripped[f.id] = r3; });
        });
      }, Promise.resolve());
    }).then(function () {
      var baseList = base.ok ? PyRun.biggestList(base.lists) : null;
      var results = features.map(function (f) {
        if (!base.ok) return { id: f.id, ok: false };
        var ok = false;
        if (f.probe === 'inputs') {
          ok = asked.length >= Number(f.min || 1);
        } else if (f.probe === 'echoes') {
          var wanted = (opts.answers || []).slice(0, Number(f.count || (opts.answers || []).length));
          ok = wanted.length > 0 && wanted.every(function (a) { return base.text.indexOf(a) !== -1; });
        } else if (f.probe === 'joins') {
          var all = (opts.answers || []).slice(0, Number(f.count || (opts.answers || []).length));
          ok = all.length > 1 && base.text.split('\n').some(function (line) {
            return all.every(function (a) { return line.indexOf(a) !== -1; });
          });
        } else if (f.probe === 'grew') {
          var g = stripped[f.id];
          var gl = (g && !g.same && g.ok) ? PyRun.biggestList(g.lists) : null;
          ok = !!(baseList && gl && baseList.length > gl.length);
        } else if (f.probe === 'shrank') {
          var h = stripped[f.id];
          var hl = (h && !h.same && h.ok) ? PyRun.biggestList(h.lists) : null;
          ok = !!(baseList && hl && baseList.length < hl.length);
        } else if (f.probe === 'ordered') {
          ok = !!(baseList && baseList.length > 1 && baseList.every(function (v, i) {
            return i === 0 || String(baseList[i - 1]).toLowerCase() <= String(v).toLowerCase();
          }));
        } else if (f.probe === 'varies') {
          ok = !!(alt && alt.ok && alt.text !== base.text);
        } else if (f.probe === 'block') {
          var head = String(f.head || '').toLowerCase();
          var n = Number(f.lines || 3);
          var rows = base.text.split('\n');
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].toLowerCase().indexOf(head) === -1) continue;
            var after = rows.slice(i + 1).filter(function (x) { return String(x).trim() !== ''; });
            if (after.length < n) continue;
            var take = after.slice(0, n);
            var fromList = baseList && take.every(function (x) { return baseList.indexOf(x.trim()) !== -1; });
            var distinct = {}; take.forEach(function (x) { distinct[x.trim()] = 1; });
            if (fromList && Object.keys(distinct).length === n) { ok = true; break; }
          }
        }
        return { id: f.id, ok: ok };
      });
      return { results: results, base: base, asked: asked.slice() };
    });
  };

  /* ---- the typed editor surface (spec SS A2) --------------------------------
     Monospace, line-numbered, a real Run and the same honest console. Tab puts
     four spaces in rather than leaving the box, because a pupil who tabs out of
     her own program mid-line has lost her place for a reason she cannot see.
     PASTE IS ALLOWED: typing practice is not the gate, and a pupil who copies a
     line she wrote two minutes ago is doing exactly what a programmer does. */
  PyRun.editor = function (host, cfg) {
    cfg = cfg || {};
    /* ---- SOFT WRAP, AND THE GUTTER STILL COUNTS LOGICAL LINES (K41b) -------
       His find, 27 Aug 2026: the editor column was too narrow for his own
       forty-character questions and they were CLIPPED SIDEWAYS — `wrap="off"`
       plus a half-width column, so the end of her own sentence was somewhere off
       the right of the box. Under the staged shape the editor is the full width
       of the card and the text WRAPS, which means one logical line can occupy
       two or three rows on screen. A gutter that prints one number per row would
       then lie about which line Python is talking about, so it measures how many
       rows each logical line really takes and pads itself to match: line 3 stays
       beside line 3, wherever the wrap falls.
       Gated, because a shape nothing is on should not change: an editor that
       does not ask for `softWrap` renders exactly as it did. */
    var soft = !!cfg.softWrap;
    var box = el('<div class="pye' + (soft ? ' is-soft' : '') + '">' +
      '<div class="pye-bar"><span class="pye-title">' + esc(cfg.title || 'Your program') + '</span>' +
      '<span class="pye-count" aria-live="polite"></span></div>' +
      '<div class="pye-body"><pre class="pye-nums" aria-hidden="true"></pre>' +
      '<textarea class="pye-code" spellcheck="false" autocomplete="off" autocapitalize="off" ' +
      'autocorrect="off" wrap="' + (soft ? 'soft' : 'off') + '" aria-label="' +
      esc(cfg.aria || 'Type your program here') + '"></textarea>' +
      (soft ? '<div class="pye-mirror" aria-hidden="true"></div>' : '') +
      '</div></div>');
    host.appendChild(box);
    var ta = box.querySelector('.pye-code');
    var nums = box.querySelector('.pye-nums');
    var count = box.querySelector('.pye-count');
    var mirror = box.querySelector('.pye-mirror');
    /* how many screen rows each logical line takes, measured rather than
       estimated — an estimated line count is the arithmetic DFM 164b names */
    function rowsPerLine(lines) {
      if (!mirror) return null;
      var cs = getComputedStyle(ta);
      mirror.style.font = cs.font;
      mirror.style.letterSpacing = cs.letterSpacing;
      mirror.style.padding = cs.padding;
      mirror.style.width = ta.clientWidth + 'px';
      mirror.innerHTML = '';
      var kids = [];
      lines.forEach(function (t) {
        var d = document.createElement('div');
        d.className = 'pye-mirror-line';
        d.textContent = t === '' ? '​' : t;
        mirror.appendChild(d);
        kids.push(d);
      });
      var lh = parseFloat(cs.lineHeight) || 20;
      return kids.map(function (d) { return Math.max(1, Math.round(d.offsetHeight / lh)); });
    }
    function paint() {
      var lines = ta.value.split('\n');
      var n = lines.length;
      var out = '';
      var rows = soft ? rowsPerLine(lines) : null;
      for (var i = 1; i <= n; i++) {
        out += i + '\n';
        if (rows) for (var k = 1; k < rows[i - 1]; k++) out += '\n';
      }
      nums.textContent = out;
      count.textContent = String(n) + ' ' + (n === 1 ? (cfg.lineWord || 'line') : (cfg.linesWord || 'lines'));
    }
    ta.addEventListener('input', paint);
    ta.addEventListener('scroll', function () { nums.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      var a = ta.selectionStart, b = ta.selectionEnd;
      ta.value = ta.value.slice(0, a) + '    ' + ta.value.slice(b);
      ta.selectionStart = ta.selectionEnd = a + 4;
      paint();
    });
    paint();
    return {
      node: box, area: ta,
      value: function () { return ta.value; },
      set: function (v) { ta.value = String(v == null ? '' : v); paint(); },
      /* insert AT THE CARET, and leave the caret after what landed, so the very
         next thing she types is the word she came to change (K38d's guided
         first insert depends on this) */
      insert: function (text) {
        var t = String(text);
        var a = ta.selectionStart, b = ta.selectionEnd;
        var before = ta.value.slice(0, a);
        var needsNl = before.length > 0 && !/\n$/.test(before);
        var add = (needsNl ? '\n' : '') + t + '\n';
        ta.value = before + add + ta.value.slice(b);
        var pos = before.length + add.length;
        ta.selectionStart = ta.selectionEnd = pos;
        paint();
        ta.focus();
        return pos;
      },
      focus: function () { ta.focus(); },
      lock: function () { ta.readOnly = true; box.classList.add('is-locked'); },
      unlock: function () { ta.readOnly = false; box.classList.remove('is-locked'); }
    };
  };

  /* ================= THE SIDE SHOW (K36, spec §C6) =========================
     HIS REDESIGN, 26 Aug 2026: "I think you should make it comical, to give them
     a giggle while they wait - it doesn't have to be about the lesson content,
     it's just a wee side show thing that appears while they wait and disappears
     when the message comes through and while they are working."
     So this is ENTERTAINMENT, and it is deliberately not teaching. It appears at
     GENUINE waits only — the pairing gate and the turn swap — never at the ~2s
     relays, where a character popping in and out would be noise rather than a
     giggle. It VANISHES the instant the match or the message lands, because the
     flash is the event and a comedian standing in front of it is in the way.
     SCRIPTED, NO AI (his standing ruling). Authored lines, plus the one trick
     that makes a scripted bot feel alive: her own words fed back into comic
     templates, on her own machine. NOTHING IS SAVED, NOTHING IS SENT, no XP —
     and the character says so in voice rather than in a notice, because a notice
     is the lesson talking and this is not the lesson.
     ONE MACHINERY, TWO BITS (K36d). `chat` is Fred: she types, he answers.
     `monologue` is Margo: she says nothing, the critic reviews the silence and
     gets steadily more theatrical. Same appear/vanish rules, same art states,
     same "I forget everything" honesty. */
  var SideShow = global.SideShow = {
    /* host: where it lives. cfg: the lesson's own content. */
    mount: function (host, cfg) {
      if (!host || !cfg) return { stop: function () {}, leave: function () {} };
      cfg = cfg || {};
      var art = cfg.art || {};
      var beat = 0, typing = null, timer = null, gone = false;
      var lines = (cfg.lines || []).slice();
      var box = el('<div class="sideshow" data-side="' + esc(cfg.id || 'side') + '">' +
        '<div class="ss-figure"><span class="ss-stage"><img class="ss-img" alt="' + esc(cfg.alt || '') + '" src="' +
        esc(asset(art.idle || '')) + '"></span><span class="ss-name">' + esc(cfg.name || '') + '</span></div>' +
        '<div class="ss-body"><div class="ss-log" role="log" aria-live="polite"></div>' +
        (cfg.mode === 'chat'
          ? '<div class="ss-ask"><label class="ss-ask-lab" for="ss-say">' + esc(cfg.replyLabel || 'Say something back') +
            '</label><input id="ss-say" class="ss-say" type="text" autocomplete="off" maxlength="40">' +
            '<button class="ghost-btn ss-send" type="button">' + esc(cfg.sendLabel || 'Say it') + '</button></div>'
          : '') +
        '</div></div>');
      host.appendChild(box);
      var log = box.querySelector('.ss-log');
      var img = box.querySelector('.ss-img');
      function face(state) {
        var src = art[state] || art.idle;
        if (src) img.src = asset(src);
        box.setAttribute('data-face', state);
      }
      function say(text, state) {
        if (gone) return;
        face('typing');
        clearTimeout(typing);
        typing = setTimeout(function () {
          if (gone) return;
          log.insertAdjacentHTML('beforeend',
            '<p class="ss-line">' + esc(String(text)) + '</p>');
          log.scrollTop = log.scrollHeight;
          face(state || 'idle');
        }, Number(cfg.typingMs == null ? 700 : cfg.typingMs));
      }
      /* HER OWN WORDS, FED BACK. The only "intelligence" here is a template with
         her sentence dropped into it, chosen in turn — which is exactly what a
         scripted bot is, and exactly what the lesson has just taught her a
         chatbot is. Nothing leaves this machine. */
      var herName = '';
      function fill(t, said) {
        /* a template never survives to the screen: an unfilled {you} or {name}
           is five characters of nonsense in front of a twelve-year-old */
        return String(t || '').replace(/\{you\}/g, said).replace(/\{name\}/g, herName || said);
      }
      function pick(list, at) {
        var a = list || [];
        return a.length ? a[at % a.length] : '';
      }
      say(cfg.open || '', 'idle');
      if (cfg.mode !== 'chat') {
        /* the critic reviews the silence, and gets worse about it */
        var every = Number(cfg.everyMs || 7000);
        timer = setInterval(function () {
          if (gone || beat >= lines.length) { clearInterval(timer); return; }
          /* THROUGH `fill` LIKE EVERY OTHER LINE. The monologue path used to
             say its line raw, so a `{you}` or `{name}` authored into a
             monologue would have rendered as those five or six characters on a
             pupil's screen. Nothing authors one today — Margo's lines are
             plain — and that is exactly the kind of thing that stays true until
             the day somebody adds one. There is no name in a monologue (she is
             never asked for one), so the placeholder resolves to nothing rather
             than to a stray word. */
          say(fill(lines[beat], ''), 'idle');
          beat++;
        }, every);
      } else {
        var inp = box.querySelector('.ss-say');
        var snd = box.querySelector('.ss-send');
        /* ---- V62/B5: THE FIRST REPLY ANSWERS THE QUESTION HE ASKED --------
           The opening line asks her one thing — "What should I call you?" —
           and the shipped rhythm was
             say(beat % 2 === 1 ? echo(v) : (next || echo(v)))
           with `beat` starting at 0. So her FIRST reply, the made-up name he
           has just asked for, took `lines[0]` — a canned sentence about not
           knowing what to do with that — EVERY SINGLE TIME, and the templates
           that actually carry her words fired on the 2nd, 4th and 6th. The one
           answer he asks for was the one answer he never used.
           Two counters rather than one parity test, which also fixes something
           nobody had filed: `lines[beat % lines.length]` on even beats only
           ever reached lines 0, 2 and 4, so half of the authored comedy — three
           of Fred's six lines — could not be reached at all. Each list now
           advances on its own, in the order it was written.
           The name is kept, so `{name}` can be spent once later in the script:
           a bot that asks your name and then never uses it is the fault he
           filed, and using it twice would be creepier than not asking. */
        var said = 0, lineAt = 0, echoAt = 0;
        var send = function () {
          var v = String(inp.value || '').trim();
          if (!v) { inp.classList.add('wants'); inp.focus(); return; }
          inp.value = '';
          log.insertAdjacentHTML('beforeend', '<p class="ss-line is-mine">' + esc(v) + '</p>');
          log.scrollTop = log.scrollHeight;
          var reply;
          if (said === 0) {
            herName = v;
            reply = fill(cfg.nameEcho || pick(cfg.echo, 0) || '{you}', v);
          } else if (said % 2 === 1) {
            reply = fill(pick(lines, lineAt++) || pick(cfg.echo, echoAt++) || '{you}', v);
          } else {
            reply = fill(pick(cfg.echo, echoAt++) || '{you}', v);
          }
          say(reply, 'idle');
          said++; beat = said;
        };
        snd.addEventListener('click', send);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
      }
      return {
        node: box,
        /* the match landed: one last line in character, then he is gone. The
           delay is short on purpose — the flash is the event, and the exit is a
           punchline, not a scene. */
        leave: function (why) {
          if (gone) return;
          gone = true;
          clearInterval(timer); clearTimeout(typing);
          var line = (why === 'matched' ? cfg.exitLine : (cfg.leaveLine || cfg.exitLine)) || '';
          var state = why === 'matched' ? (cfg.exitFace || 'devastated') : 'idle';
          if (line) {
            var src = art[state] || art.idle;
            if (src) img.src = asset(src);
            box.setAttribute('data-face', state);
            log.insertAdjacentHTML('beforeend', '<p class="ss-line is-exit">' + esc(line) + '</p>');
          }
          var ask = box.querySelector('.ss-ask');
          if (ask) ask.remove();
          box.classList.add('is-leaving');
          setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); },
            Number(cfg.exitMs == null ? 1400 : cfg.exitMs));
        },
        stop: function () {
          gone = true;
          clearInterval(timer); clearTimeout(typing);
          if (box.parentNode) box.parentNode.removeChild(box);
        }
      };
    }
  };

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
      /* AN OPTIONAL FILM, ABOVE THE LINES (DFM 253a, 23 Aug 2026). His find on the
         side quest's opening card: it "talks about clouds as if the pupils are
         going to know what the cloud means". The fix he ordered is a concept
         animation ON the card, so the briefing engine gains the film slot its
         `video` field had promised and never had — the field existed in content
         with ZERO readers in this engine, verified before it was wired.
         CONFIG-GATED: a briefing that names no `video` produces exactly the DOM
         it produced before, byte for byte, which is what keeps J1's five
         signed-off lessons and both Year-One Lesson 1s untouched (DFM 176's
         config-gate precedent, asserted by a control).
         The player is the platform's own: controls, preload=metadata, playsinline
         — the same element the video engine and every rung part player use, so a
         pupil meets one film player on this platform and not two. */
      var film = cfg.video
        ? '<div class="dossier-film"><video controls preload="metadata" playsinline src="' +
            esc(asset(cfg.video)) + '"></video></div>'
        : '';
      /* the card widens ONLY when it carries a film, by a class rather than by
         :has(), so nothing depends on a selector a school browser may not have —
         and a briefing with no film keeps the exact 660px card it has always
         had. Rule 127: his own note that the pupil's video window should be
         bigger; a 592px player inside the unwidened card would have been the
         narrowest film on the platform. */
      /* ---- AN OPTIONAL SCRIPTED DEMO (spec §D1: "the DEMO bot's 20-second
         turn on screen"). A briefing that TELLS a pupil what a chatbot is, on
         the screen right before she builds one, is doing half the job: the other
         half is twenty seconds of one actually happening. It is authored, it is
         the same transcript every time, and it types itself out under the lines
         so it reads as a demonstration rather than something she has to answer.
         EVERY QUESTION IT ASKS IS ONE AN ELEVEN-YEAR-OLD CAN ANSWER WITHOUT
         THINKING (K36a, his ruling: "make sure you don't ask questions that
         might confuse them"). CONFIG-GATED: a briefing with no `demo` produces
         exactly the DOM it produced before, byte for byte. */
      var demo = (cfg.demo && cfg.demo.length)
        ? '<div class="dossier-demo"><div class="pyx"><div class="pyx-bar">' +
          '<span class="pyx-dot"></span><span class="pyx-title">' + esc(cfg.demoTitle || '') + '</span></div>' +
          '<div class="pyx-log"></div></div>' +
          (cfg.demoNote ? '<p class="dossier-demo-note">' + esc(cfg.demoNote) + '</p>' : '') + '</div>'
        : '';
      var d = el('<div class="dossier' + (cfg.video ? ' has-film' : '') + '">' +
        '<div class="dossier-top"><span class="dossier-clearance">' + esc(cfg.clearance || '') + '</span></div>' +
        '<h1 class="dossier-headline"></h1>' +
        film +
        '<div class="dossier-lines"></div>' +
        demo +
        photoStrip +
        '<button class="primary-btn dossier-cta" type="button" hidden>' + esc(cfg.cta || 'Continue') + '</button>' +
        '</div>');
      host.appendChild(d);
      var headline = d.querySelector('.dossier-headline');
      var linesBox = d.querySelector('.dossier-lines');
      var cta = d.querySelector('.dossier-cta');
      var timers = [];
      /* DFM 42/143 - A DEAD PLAYER MUST STILL SAY SOMETHING. The video engine
         learned this on j3-02 (19 Aug 2026): a film that is SET and does not
         load gives a broken player and not one word, which on a cover day with
         nobody in the room is a dead screen. This card's own lines tell her to
         watch the film first, so silence here would be worse than most. The
         sentence is content-owned so it goes through the language gate and the
         read-aloud ledger like every other pupil sentence (the DFM 190d/192g
         precedent - a string hardcoded in an engine escapes both). */
      var filmEl = d.querySelector('.dossier-film video');
      if (filmEl) {
        filmEl.addEventListener('error', function () {
          if (d.querySelector('.dossier-film-failed')) return;
          var f = el('<p class="dossier-film-failed" role="status">' +
            esc((cfg.videoFilm && cfg.videoFilm.fallback) ||
              'The film will not play just now. Carry on reading below - everything the film shows is said again on the cards that follow.') +
            '</p>');
          filmEl.insertAdjacentElement('afterend', f);
        });
      }
      /* DFM 104: the button is built hidden and revealed later, so the guard
         window has to start when it APPEARS, not when the card was built. */
      function showCta() {
        if (!cta.hidden) return;
        cta.hidden = false;
        App.armButton(cta, function () { finishChunk(ctx); });
      }
      /* the demo runs on its own clock, under the lines, and the safety net
         reveals it whole if a throttled tab ever stalls the animation */
      var demoLog = d.querySelector('.dossier-demo .pyx-log');
      function demoRow(t) {
        return '<div class="pyx-row is-' + (String(t.who) === 'you' ? 'user' : 'bot') + '">' +
          '<span class="pyx-who">' + esc(t.label || '') + '</span>' +
          '<span class="pyx-text">' + esc(t.text || '') + '</span></div>';
      }
      function demoAll() {
        if (!demoLog) return;
        demoLog.innerHTML = (cfg.demo || []).map(demoRow).join('');
      }
      function playDemo() {
        if (!demoLog) return;
        (cfg.demo || []).forEach(function (t, i) {
          timers.push(setTimeout(function () {
            demoLog.insertAdjacentHTML('beforeend', demoRow(t));
            demoLog.scrollTop = demoLog.scrollHeight;
          }, Number(cfg.demoStepMs || 1600) * i));
        });
      }
      /* ---- THE DEMO SITS UNDER THE SENTENCE THAT POINTS AT IT (F2, DFM 269's
         round; rule 35 on POSITION) ----------------------------------------
         His find, 27 Aug 2026: line 6 of the workshop card reads "Here is a small
         one running. Watch it once before you build your own." — and the demo
         rendered at the BOTTOM of the card, after six more lines. The sentence
         pointed at something that was not there.
         `demoAfterLine` is a 1-based line number; the demo block is MOVED into
         the lines, directly under that line. A briefing that does not name it
         renders byte-identically, which is what keeps every other briefing on
         the platform exactly as it is (the config-gate precedent, asserted by a
         control). */
      var demoNode = d.querySelector('.dossier-demo');
      var afterLine = Number(cfg.demoAfterLine || 0);
      function positionDemo() {
        if (!demoNode || !afterLine) return;
        var ps = linesBox.querySelectorAll('.dossier-line');
        if (!ps.length) return;
        var anchor = ps[Math.min(afterLine, ps.length) - 1];
        if (!anchor) return;
        if (anchor.nextSibling === demoNode) return;
        anchor.parentNode.insertBefore(demoNode, anchor.nextSibling);
      }
      function reveal() {
        timers.forEach(clearTimeout);
        headline.textContent = cfg.headline;
        /* the demo is held OUT of the way while the lines are rebuilt, then put
           back where it belongs — otherwise setting innerHTML would delete it */
        if (demoNode && demoNode.parentNode === linesBox) linesBox.removeChild(demoNode);
        linesBox.innerHTML = (cfg.lines || []).map(function (l) { return '<p class="dossier-line show">' + fmtBold(l) + '</p>'; }).join('');
        positionDemo();
        demoAll();
        showCta();
      }
      /* Safety net: a backgrounded tab throttles timers, so the animation can
         stall and strand a pupil with no way on. Reveal everything regardless
         after the animation's own worst case. */
      timers.push(setTimeout(reveal, 900 * ((cfg.lines || []).length + 1) +
        Number(cfg.demoStepMs || 1600) * (cfg.demo || []).length + 6000));
      // typewriter headline
      var hl = String(cfg.headline || ''), pos = 0;
      (function type() {
        if (pos <= hl.length) {
          headline.textContent = hl.slice(0, pos) + (pos < hl.length ? '▍' : '');
          pos++;
          timers.push(setTimeout(type, 45));
        } else {
          /* ON A CARD WITH A DEMO, THE WAY ON IS THERE FROM THE START. Five
             lines animating in at 900ms each plus the demo behind them put the
             Continue button about six and a half seconds away, which the
             confused-pupil walk reports as a screen with nothing on it -- and
             it is right to: a pupil who has read the card is held on it by an
             animation she did not ask for. The lines still arrive one at a
             time; she is simply never waiting on them (DFM 42/205). Only the
             demo cards are affected, so every briefing already in a pupil's
             hands behaves exactly as it did. */
          /* AND A CAP ON EVERY BRIEFING, not just the demo ones. The lines
             arrive one at a time at 900ms each, and J3 Lesson 3's call room has
             ELEVEN of them — so its Continue button was twelve seconds away,
             which the confused-pupil walk reported as a card with nothing on
             it. It was right to. The lines still arrive at their own pace; the
             way on simply stops being hostage to the last one. Four lines'
             worth is the cap, which is under four seconds on every card in the
             platform and changes nothing about how any of them look. */
          var ctaAt = Math.min((cfg.lines || []).length, 4) * 900 + 700;
          if (demoLog) showCta(); else timers.push(setTimeout(showCta, ctaAt));
          (cfg.lines || []).forEach(function (l, i) {
            timers.push(setTimeout(function () {
              var p = document.createElement('p');
              p.className = 'dossier-line'; p.innerHTML = fmtBold(l);
              linesBox.appendChild(p);
              positionDemo();
              /* capture p, never lastChild — throttled tabs batch rAF callbacks
                 and lastChild would point at the newest line for all of them */
              requestAnimationFrame(function () { p.classList.add('show'); });
              /* THE DEMO STARTS WHEN ITS OWN SENTENCE ARRIVES, not when the card
                 finishes. A pupil who has just read "Here is a small one running"
                 is looking at the demo; holding it back until six more lines have
                 typed themselves out would point her at a still box. */
              if (demoLog && afterLine && i === afterLine - 1) {
                playDemo();
                timers.push(setTimeout(showCta, 700));
              }
              if (i === cfg.lines.length - 1) {
                if (demoLog && !afterLine) {
                  playDemo();
                  /* THE WAY ON ARRIVES WITH THE DEMO, NOT AFTER IT. Holding it
                     back until the last line had played left this card with
                     nothing to press for about eleven seconds -- long enough
                     that the confused-pupil walk gave up on it and called the
                     lesson over, and long enough to strand a pupil who has
                     already read the thing. The transcript keeps playing
                     behind her; she is simply never held on a screen with no
                     way off it (DFM 42/205). */
                  timers.push(setTimeout(showCta, 700));
                }   /* the non-demo CTA is armed above, on a cap */
              }
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
      }, cfg.startLabel || 'Start', function () { runFrom(0); });

      /* AN OPTIONAL TAIL (16 Aug 2026, for J3 Lesson 1's two Hard Cases).
         `stretchFrom` splits the item list: everything before it is the lesson,
         everything from it on is the extra challenge — offered on its own card,
         with a real way to decline, because "optional" with no button behind it
         is a promise the screen does not keep (the same fault the J2 inspection
         had). CONFIG-GATED: no existing chunk declares `stretchFrom`, so every
         J1 items chunk runs exactly as it always has (asserted). */
      function runFrom(start) {
        var split = Number(cfg.stretchFrom);
        var isStretch = start > 0;
        var end = (!isStretch && split > 0 && split < cfg.items.length) ? split : cfg.items.length;
        itemRunner(host, {
          items: cfg.items.slice(start, end), mode: 'feedback',
          markFn: function (it, i) { return ctx.markItem(it.id, i); },
          onDone: function () {
            if (!isStretch && end < cfg.items.length) { offerStretch(end); return; }
            finishChunk(ctx, isStretch ? 'stretch=1' : undefined,
              isStretch ? Number(cfg.stretchXp || 0) : 0);
          }
        });
      }

      function offerStretch(at) {
        host.innerHTML = '';
        var s = cfg.stretch || {};
        var c = el('<div class="card intro-card">' +
          '<span class="intro-kicker">' + esc(s.kicker || 'EXTRA CHALLENGE') + '</span>' +
          '<h2>' + esc(s.title || 'The hard ones') + '</h2>' +
          String(s.text || '').split(/\n\s*\n/).map(function (p) {
            return '<p class="intro-lead">' + esc(p.trim()) + '</p>';
          }).join('') +
          '<div class="confirm-actions">' +
          '<button class="primary-btn stretch-go" type="button">' + esc(s.goLabel || 'Give them a go') + '</button>' +
          '<button class="ghost-btn stretch-skip" type="button">' + esc(s.skipLabel || 'Stop here instead') + '</button>' +
          '</div></div>');
        host.appendChild(c);
        App.armButton(c.querySelector('.stretch-go'), function () { host.innerHTML = ''; runFrom(at); });
        App.armButton(c.querySelector('.stretch-skip'), function () { finishChunk(ctx); });
      }
    }
  };

  /* ================= THE FILM OVERLAY — ONE HOME (DFM 144) ==================
     DAMIEN, 3 Aug 2026 (rule 138.2): a step must never assume a digital skill a
     pupil may simply not have. Where a step needs one — opening a browser tab —
     the card carries a short clip that SHOWS it, and his follow-up note appears
     once the clip has played.

     HOISTED OUT OF `Engines.steps` ON 26 AUG 2026 (DFM 262). It was a closure
     inside that engine's mount, which meant no other engine could offer a film
     however badly a pupil needed one — and the Inspection is exactly that case:
     it blocks correctly until the folders are really there, and a pupil who has
     forgotten HOW cannot reach the build card's film again, because a live run
     has no back-navigation by design (DFM 142b). His words: "we should allow the
     pupil to rewatch the video on that card incase they've forgotten how to do
     it, because they can't go back to the previous step".
     NOTHING ABOUT ITS BEHAVIOUR CHANGES in the move — markup, the timing
     backstop, the note reveal and the DFM 104 arming are byte-for-byte what they
     were, and qa-clip-overlay proves the steps engine's cards identical against
     the pre-change engine pulled out of git. */
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
      /* THE BACKSTOP IS FOR "METADATA NEVER ARRIVES", AND ONLY THAT (fixed
         23 Aug 2026). It used to be a flat 30-second timer that ran whether
         metadata arrived or not - fine while the only clip was 13 seconds
         long, and wrong the moment the side quest's 1:53 and 2:27 films
         landed, because it popped the note halfway through the film and
         broke the rule stated directly above it. The moment the real length
         is known the guess is CANCELLED and replaced by it. A first attempt
         at this fix read vid.duration at mount, where it is NaN, and so
         changed nothing at all - caught before it shipped. */
      var backstop = setTimeout(showNote, 30000);
      vid.addEventListener('ended', showNote);
      vid.addEventListener('error', showNote);
      vid.addEventListener('loadedmetadata', function () {
        clearTimeout(backstop);
        var ms = ((vid.duration && isFinite(vid.duration)) ? vid.duration : 15) * 1000 + 1200;
        setTimeout(showNote, ms);
      });
    }
    App.armButton(ov.querySelector('.clip-close'), function () {   // DFM 104
      try { vid.pause(); } catch (e) {}
      ov.remove();
    });
  }

  /* THE GHOST CLIPROW, in one home too. The steps card has rendered this exact
     markup since 3 Aug; the Inspection now renders the SAME markup so a pupil
     meets a control she already recognises rather than a new one (138.1.3's
     spirit — a thing she has met is not a thing she has to decode). */
  function clipRowHtml(clip) {
    if (!clip || !clip.src) return '';
    return '<p class="step-cliprow"><button class="ghost-btn step-clip-btn" type="button">&#127909; ' +
      esc(clip.label || 'Show me how') + '</button></p>';
  }
  function wireClipRow(root, clip) {
    if (!root || !clip || !clip.src) return;
    var b = root.querySelector('.step-clip-btn');
    if (b) b.onclick = function () { openClip(clip); };
  }

  /* ================= steps (guided ladder, with practice sims) ============ */
  Engines.steps = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var i = 0;
      introCard(host, { kicker: chunk.title, title: chunk.badge ? chunk.badge.name : chunk.title, text: cfg.intro || '' }, 'Start', showStep);

      /* one home for the wiring too — this used to be the steps engine's own
         four lines, and two copies of a handler drift the first time one of them
         learns something (DFM 144) */
      function wireClip(card, st) { wireClipRow(card, st.clip); }

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
          clipRowHtml(st.clip) +
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
      /* EVERY WORD ON THIS SCREEN IS J1'S UNTIL A LESSON SAYS OTHERWISE.
         Found by the J2 Lesson 1 cold read, 16 Aug 2026, and it is the biggest
         thing that read found: this engine hardcoded "The Licence Exam", "Open
         my Agent File", "Sealing your Agent File", "Agent File sealed" and
         "Sixteen answers" — so J2's Skills Snapshot, a fifth of her first hour,
         rendered in J1's agent fiction AND told a pupil answering twelve
         questions that she had answered sixteen (rule 35). None of it was ever
         readable by the language gate, because the gate reads CONTENT and these
         were engine literals (DFM 207b's G1 class).
         Every string is content-owned now with J1's exact wording as the
         fallback, so J1 renders byte-identically (asserted by qa-j1-unchanged)
         and every new year has to write — and get judged on — its own.
         `solo` was worse than a literal: the engine used it as a truthy FLAG
         and threw the authored sentence away (DFM 155 — content that names a
         field the engine ignores fails silently and looks fine in the JSON). */
      introCard(host, {
        kicker: chunk.title, title: cfg.examTitle || 'The Licence Exam',
        text: cfg.intro || '',
        extra: cfg.solo
          ? '<div class="solo-banner">&#129323; ' +
            esc(typeof cfg.solo === 'string' ? cfg.solo : 'Solo mission — your own answers only.') +
            '</div>'
          : ''
      }, cfg.openLabel || 'Open my Agent File', function () {
        itemRunner(host, {
          items: cfg.items, mode: 'neutral', ackText: cfg.ackText || 'Logged',
          onDone: function (res) {
            host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>' +
              esc(cfg.sealingLabel || 'Sealing your Agent File…') + '</span></div>';
            var payload = { lessonId: ctx.lesson.id, answers: res.answers };
            // review mode: never overwrite the original baseline record
            var submit = ctx.review ? Promise.resolve({ ok: true }) : ctx.call('submitBaseline', payload);
            submit.then(function (r) {
              if (!ctx.review && (!r || !r.ok)) App.enqueue('submitBaseline', payload);
              host.innerHTML = '';
              var seal = el('<div class="card seal-card"><div class="seal">&#128736;</div>' +
                '<h2>' + esc(cfg.sealTitle || 'Agent File sealed') + '</h2><p>' +
                esc(cfg.sealBody || 'Sixteen answers, logged for the record. At the end of the year you’ll open this file again — and see how far you’ve come.') +
                '</p>' +
                '<button class="primary-btn" type="button">' + esc(cfg.claimLabel || 'Claim the badge') + '</button></div>');
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

  /* ================= drivecheck (the side quest inspects the REAL Drive) ==
     Genuine consequence: the badge is only claimable after the server has
     actually found the folders in the pupil's own Google Drive. In preview
     the FakeServer simulates a pass and says so on screen.

     ITS PUPIL SENTENCES ARE CONTENT-OWNED (the 190d timerSay / 192g precedent).
     DFM 223(b) took "HQ" out of the side quest because no lesson teaches the
     word until Lesson 4 - the CONTENT was fixed and these three engine literals
     survived it, so they were still saying it on her screen on 22 Aug 2026. A
     string hardcoded in an engine never meets the language gate or the
     read-aloud ledger, which is the whole G1 class. The fallbacks below are
     deliberately NEUTRAL, never the old wording: a fallback is what ships if
     content ever goes missing, so it must be safe on its own. */
  Engines.drivecheck = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      introCard(host, { kicker: chunk.title, title: cfg.cardTitle || 'The Inspection', text: cfg.intro || '' }, 'Run the inspection', run);
      /* ---- THE ROUTE BACK TO THE FILM (DFM 262, his find, 25 Aug 2026) -------
         The Inspection is right to block until the folders are really there, and
         that is not what he objected to. What he objected to is that a pupil who
         has forgotten HOW is stranded: a live run has no back-navigation by
         design (DFM 142b, review mode is post-completion), so the film on the
         previous card is out of reach at exactly the moment she needs it.
         The row is config-gated — a drivecheck chunk with no `cfg.clip` renders
         byte-identically to the engine he has already sat, and qa-clip-overlay
         proves that against the pre-change engine rather than asserting it.
         IT GOES ON THE INTRO **AND** ON THE FAILURE STATE, and the second half is
         the one that matters: `run()` replaces the whole host, so a film on the
         intro alone disappears the instant she presses the button and could never
         reach the point of need. */
      appendClipRow(host);

      function appendClipRow(root) {
        if (!cfg.clip || !cfg.clip.src) return;
        var card = root.querySelector('.intro-card');
        if (!card) return;
        var lead = card.querySelectorAll('.intro-lead');
        var row = el(clipRowHtml(cfg.clip));
        var after = lead.length ? lead[lead.length - 1] : null;
        if (after && after.parentNode) after.parentNode.insertBefore(row, after.nextSibling);
        else card.appendChild(row);
        wireClipRow(card, cfg.clip);
      }

      function run() {
        host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>' +
          esc(cfg.checking || 'Looking inside your Drive…') + '</span></div>';
        ctx.call('driveCheck', { lessonNum: String(ctx.lessonEntry.num) }).then(function (r) {
          host.innerHTML = '';
          if (!r || !r.ok) {
            var errC = el('<div class="card"><h2>The inspection could not run</h2><p>' +
              (r && r.error === 'locked' ? 'This side quest is not unlocked for your class yet — check with your teacher.'
                : esc(cfg.errorText || 'The website could not be reached just then. Nothing is lost — try again in a moment.')) +
              '</p><button class="primary-btn" type="button">Try again</button></div>');
            host.appendChild(errC);
            /* by class here too, for the same reason — this card carries one
               button today and "today" is exactly how the fault above got in */
            errC.querySelector('.primary-btn').onclick = function () { host.innerHTML = ''; run(); };
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
            /* THE FAIL STATE ONLY. Her reading order becomes: what failed → what
               to do → the route to being SHOWN → try again (138.1.11 — the
               instruction lives where the need is). The PASS card gets no row
               because she is through, and the could-not-run card gets none
               because that is a network matter rather than a knowledge one:
               offering a film to a pupil whose page cannot reach the server
               would answer a question she is not asking. */
            (pass ? '' : clipRowHtml(cfg.clip)) +
            '<button class="primary-btn" type="button">' + (pass ? 'Claim the badge' : 'Run the inspection again') + '</button></div>');
          host.appendChild(c2);
          if (!pass) wireClipRow(c2, cfg.clip);
          /* BY CLASS, NEVER BY POSITION — and this line is the reason the rule
             exists. It used to read `c2.querySelector('button')`, "the first
             button in the card", which was true for as long as the card had one.
             The film row lands ABOVE the button on the fail state, so the first
             button became "Show me how" and the retry handler was wired to the
             wrong control: "Run the inspection again" was left completely dead,
             and a pupil who failed the check could never run it a second time.
             That is DFM 143(a) word for word — the fault that killed "Start
             climbing" when the ladder gained its film button — repeated by me in
             the same file. The confused-pupil walker found it before it shipped:
             it clicked the primary button 100 times and the screen never moved. */
          c2.querySelector('.primary-btn').onclick = pass
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
      /* "Before you clock off…" was a raw engine literal on the exit check of
         EVERY lesson, and no gate has ever read it. Clocking off is workplace
         idiom (138.1.9): a twelve-year-old has never clocked off anything.
         Content-owned now, with the shipped wording as the fallback so J1's
         five signed-off lessons render byte-identically — J1's own wording is
         REPORTED to Damien as a proposed reword rather than changed under his
         lock (DFM 176/208). */
      introCard(host, {
        kicker: cfg.kicker || 'Exit check',
        title: cfg.cardTitle || 'Before you clock off…',
        text: cfg.intro || ''
      }, cfg.readyLabel || 'Ready', function () {
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
        /* DFM 204 — found by the confused-pupil walker once its coverage was
           asserted. This button is born `disabled` on the COMPULSORY closing
           screen of every lesson (rule 68), and nothing said what unlocks it:
           a pupil who pressed it first got silence. Same fault as the Case 01
           stamp (DFM 192f), on the one screen nobody may skip. */
        '<p class="case-locked-note se-locked-note">' + esc(cfg.lockedNote ||
          'Answer every sentence above — and how it felt — and this button wakes up.') + '</p>' +
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
        var seNote = c.querySelector('.se-locked-note');
        if (seNote) seNote.hidden = all;
      });
      c.querySelector('.se-submit').onclick = function () {
        if (ctx.review) {
          host.innerHTML = '';
          /* "mission report" and "Mission complete." below are J1's fiction and
             were reaching every year (found by the J2 L1 cold read). Both are
             content-owned now with J1's exact wording as the fallback. */
          var rv = el('<div class="card"><h2>Already filed</h2><p>' +
            esc(cfg.alreadyFiled || 'This mission report went to your teacher the first time — a review visit never overwrites it.') + '</p>' +
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
            var safe = el('<div class="card"><h2>Report saved on this machine</h2><p>' +
              esc(cfg.offlineSay || 'Your connection is playing up, so your answers are safe here and will send automatically. Mission complete.') + '</p>' +
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
          /* THE LAST CARD OF THE LESSON, and until 22 Aug 2026 it could say
             nothing a lesson had written for it. Config-gated: a lesson that
             names no closingNote renders byte-identically, which is what keeps
             J1's five signed-off lessons and both Year-One Lesson 1s untouched
             (DFM 176's config-gate precedent). Verified rather than assumed:
             this card IS the final surface a pupil sees - the drivecheck pass,
             the exit items and the self-eval all run before it. */
          var done = el('<div class="card exit-done"><h2>' + (r.right === r.total ? 'Nailed it.' : 'Report filed.') + '</h2>' + fbHtml +
            (cfg.closingNote ? '<p class="exit-closing-note">' + esc(cfg.closingNote) + '</p>' : '') +
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
      /* A PROGRAM WITH INDENTATION IN IT HAS TO SHOW ITS INDENTATION (26 Aug
         2026). HTML collapses leading spaces, so a block reading four spaces
         then `print(song)` drew flush left — and the card that then told a pupil
         the four spaces are what put the line inside the loop would have been
         pointing at something she could not see (rule 35). Config-gated: a
         puzzle that does not ask for `pre` renders exactly the markup every
         signed-off lesson's puzzle renders today. */
      var PRE = cfg.pre ? ' is-pre' : '';
      /* one box per stack; single-column mode is simply one box with no ceiling */
      var boxes = STACKS ? STACKS.map(function () { return []; }) : [[]];
      var capOf = function (k) { return STACKS ? Number(STACKS[k].size) || 0 : Infinity; };
      var flat = function () { return boxes.reduce(function (a, b) { return a.concat(b); }, []); };
      var boxOf = function (si) {
        for (var k = 0; k < boxes.length; k++) if (boxes[k].indexOf(si) !== -1) return k;
        return -1;
      };
      /* A NUMBERED SEQUENCE GETS ITS OWN LINES (DFM 171). The ordering cards were
         numbering their steps inside `intro`, which the card renders as one run-on
         paragraph — the fault the rule names. `introCard` has always been able to
         draw an <ol>; the parsons card just never handed it one. */
      /* ⭐ S1 — HIS SECOND SIT, AND THE ONE THAT SHOULD HAVE BEEN IMPOSSIBLE.
         "Exit check — part 2" was hard-coded here, and it had been sitting on
         line 119 of ENGINE_STRINGS_DEBT.md marked OUTSTANDING for days. On 27
         August a NEW card — j2-03's "Training build 2" — mounted this engine,
         and the parked string walked straight onto a pupil's screen saying she
         was in an exit check when she was in a training build. We knew, and
         knowing changed nothing: the ledger was a memo no gate read. It is a
         gate now (lib/ledger.js, both walkers, ratcheted per lesson).
         The kicker is the CONTENT'S, defaulting to the chunk's own title, so a
         card can never again be labelled by whichever lesson happened to mount
         the engine first. Lesson 3's exit check names its own kicker, so it
         renders exactly the words it renders today. */
      introCard(host, { kicker: cfg.introKicker || chunk.title || '',
        title: cfg.title || 'Build the program',
        text: cfg.intro || '', steps: cfg.steps || null, after: cfg.introAfter || null },
        cfg.readyLabel || 'Ready', build);

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
        /* CONTENT OWNS THESE TWO SENTENCES NOW (S1's ledger sweep). They named
           "blocks" while both L3 lessons call them LINES on every other surface,
           and they named "Your program" while the tray beside them is whatever
           `trayLabel` says — two more places for one screen to call one thing
           two names, which is the fault `trayLabel` was added to close. The
           count is TEMPLATED as {n} and never typed twice (DFM's numeral-tie
           law, J5: compute the count or template it, never author it). Both
           defaults are the shipped wording, so a lesson that names neither
           renders exactly as it does today. */
        /* THE LESSON'S SENTENCE IS ESCAPED; THE SHIPPED DEFAULT IS NOT. The
           same rule PairKit already uses for its own first-meeting wordings: a
           lesson may never put markup on a pupil's screen, and the default —
           which carries its own entities and its own <b> — renders exactly the
           markup every signed-off puzzle renders today (DFM 176). `**bold**`
           is the authoring form for a lesson that wants emphasis. */
        var own = function (v, dflt) {
          return v == null ? String(dflt) : fmtBold(String(v));
        };
        var fillN = function (t) { return String(t).replace(/\{n\}/g, String(howMany)); };
        var goalLine = STACKS
          ? fillN(own(cfg.goalLineStacks, 'Your challenge: build the program yourself. Move all {n}' +
            ' blocks across &mdash; this scoreboard is <b>TWO separate stacks</b>, so build each job in its own box:'))
          : fillN(own(cfg.goalLine, 'Your challenge: build the program yourself. Move all {n}' +
            ' blocks across into <em>Your program</em>, and put them in the order that makes this happen:'));
        /* the same sweep: content owns the how-to line, and the default is the
           shipped sentence word for word so no locked puzzle moves (DFM 176) */
        var howLine = STACKS
          ? own(cfg.howLineStacks, '<b>How to build it:</b> drag each block into the right job &mdash; or click it to drop it into ' +
            'the first empty space. Drag blocks up and down inside a job, and drag one back to <b>Blocks</b> ' +
            'to take it out again.')
          : own(cfg.howLine, '<b>How to build it:</b> drag a block from <b>Blocks</b> across into ' +
            '<b>Your program</b> &mdash; or just click it, if you prefer. Drag the blocks up and down to change ' +
            'the order, and drag one back to <b>Blocks</b> to take it out again.');
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
          /* THE TRAY HAS A NAME THE CONTENT OWNS (28 Aug 2026). It was hard-coded
             to "Blocks" while both L3 lessons call them LINES on every other
             surface, so the take-back button offered to send a line back to a place
             the screen did not name — the separated read's finding, and the same
             word that once had the walker pressing "Take it back to the bLOCKs".
             The default is what shipped, so no locked lesson moves (DFM 221). */
          '<div class="parsons-tray"><h3>' + esc(cfg.trayLabel || 'Blocks') + '</h3><div class="pt-list"></div></div>' +
          progSide +
          '</div>' +
          /* DFM 204, same family: born disabled with nothing saying why. */
          '<p class="case-locked-note parsons-locked-note">' + esc(cfg.lockedNote ||
            'Click every block from the tray into your program, then this button wakes up.') + '</p>' +
          /* THE CHECK BUTTON'S NAME IS THE CONTENT'S (29 Aug 2026, the cold
             reader's find). The help text tells her to press "Check my program"
             and the label was an engine literal, so the name she is sent to
             looking for appeared nowhere in the transcript anybody judges — the
             reader could not confirm the button exists, and neither could a
             machine. The default is the shipped wording, so no locked puzzle
             moves (DFM 176). */
          '<button class="primary-btn parsons-check" type="button" disabled>' +
          esc(cfg.checkLabel || 'Check my program') + '</button>' +
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
        /* DFM 272's config gate, default = the shipped behaviour, so every
           signed-off lesson using this engine renders and behaves exactly as it
           did until he says the word (DFM 221). */
        var clickEjects = cfg.trayClickEject !== false;
        /* ONE default, in one place (DFM 144): the parsons tray and the pyrun tray
           are the same button to a pupil, so they cannot drift apart in the source. */
        var takeBackLabel = String(cfg.takeBackLabel || PY_SAY.takeBack);

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
        /* ---- THE GEOMETRY IS READ ONCE, WHEN THE GESTURE STARTS ------------
           His 27 Aug 2026 find: this was the laggy one. `showDropTarget` ran on
           EVERY pointermove and, on every one of them, cleared and rebuilt the
           marker and read a fresh rect for each box and each placed row — a
           forced layout per block per mouse movement. Nothing moves under a
           dragged ghost, so all of it is read once here and answered from the
           cache for the rest of the gesture; the marker is then written ONLY
           when the target it points at actually changes. Measured, both ways, by
           `qa-drag-smooth` against the engine he sat. */
        var geo = null, raf = 0, ptrX = 0, ptrY = 0, lastTarget = '';
        function inRect(r, x, y) {
          return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        }
        function midsOf(listEl) {
          var out = [];
          if (!listEl) return out;
          Array.prototype.slice.call(listEl.querySelectorAll('li:not(.pp-empty)')).forEach(function (li) {
            var b = li.getBoundingClientRect();
            out.push(b.top + b.height / 2);
          });
          return out;
        }
        function snapGeometry() {
          var g = {
            tray: trayZone.getBoundingClientRect(),
            prog: progZone.getBoundingClientRect(),
            boxes: []
          };
          if (STACKS) {
            Array.prototype.slice.call(c.querySelectorAll('.pp-box')).forEach(function (b) {
              var k = Number(b.getAttribute('data-box'));
              var listEl = b.querySelector('.pp-list');
              g.boxes.push({ k: k, el: b, rect: b.getBoundingClientRect(), list: listEl, mids: midsOf(listEl) });
            });
          } else {
            g.boxes.push({ k: 0, el: progZone, rect: g.prog, list: prog, mids: midsOf(prog) });
          }
          return g;
        }
        function indexFromMids(mids, y) {
          for (var i = 0; i < mids.length; i++) if (y < mids[i]) return i;
          return mids.length;
        }
        function inside(el, x, y) {
          var r = el.getBoundingClientRect();
          return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        }
        /* which job is the pointer over? The whole labelled BOX is the target,
           not its inner list - his standing drag rule (DFM feedback_drag_quality:
           "drop on the WHOLE picture"), which is why single-column mode hit-tests
           the panel rather than the <ol> too. Answered from the cache during a
           drag; the live read stays for the paths that are not one. */
        function boxAt(x, y, g) {
          var hit = -1;
          if (g) {
            g.boxes.forEach(function (b) { if (inRect(b.rect, x, y)) hit = b.k; });
            return hit;
          }
          c.querySelectorAll('.pp-box').forEach(function (b) {
            if (inside(b, x, y)) hit = Number(b.getAttribute('data-box'));
          });
          return hit;
        }
        /* where the drop would land, as a value that can be COMPARED — so the
           marker is only written when it changes */
        function targetAt(x, y, g) {
          if (STACKS) {
            var k = boxAt(x, y, g);
            if (k !== -1) {
              var b = g.boxes.filter(function (bb) { return bb.k === k; })[0];
              if (!b) return { kind: 'none' };
              if (boxes[k].length >= capOf(k) && boxOf(dragSi) !== k) return { kind: 'full', k: k };
              if (!b.mids.length) return { kind: 'empty', k: k };
              return { kind: 'at', k: k, at: indexFromMids(b.mids, y) };
            }
          } else if (inRect(g.prog, x, y)) {
            var mids = g.boxes[0].mids;
            if (!mids.length) return { kind: 'empty', k: 0 };
            return { kind: 'at', k: 0, at: indexFromMids(mids, y) };
          }
          if (inRect(g.tray, x, y) && boxOf(dragSi) !== -1) return { kind: 'back' };
          return { kind: 'none' };
        }
        function drawTarget(t, g) {
          clearMarks();
          if (t.kind === 'full') {
            var bf = g.boxes.filter(function (b) { return b.k === t.k; })[0];
            if (bf) bf.el.classList.add('drop-full');
            return;
          }
          if (t.kind === 'empty') {
            var be = g.boxes.filter(function (b) { return b.k === t.k; })[0];
            if (be) (STACKS ? be.el : progZone).classList.add('drop-empty');
            return;
          }
          if (t.kind === 'at') {
            var ba = g.boxes.filter(function (b) { return b.k === t.k; })[0];
            if (!ba) return;
            var kl = ba.list.querySelectorAll('li:not(.pp-empty)');
            if (!kl.length) return;
            if (t.at >= kl.length) kl[kl.length - 1].classList.add('drop-after');
            else kl[t.at].classList.add('drop-before');
            return;
          }
          if (t.kind === 'back') trayZone.classList.add('drop-back');
        }
        function commitDrop(si, x, y, g) {
          var k = STACKS ? boxAt(x, y, g) : (inRect(g && g.prog, x, y) || (!g && inside(progZone, x, y)) ? 0 : -1);
          if (k !== -1) {
            var cached = g && g.boxes.filter(function (b) { return b.k === k; })[0];
            var listEl = STACKS ? c.querySelector('.pp-box[data-box="' + k + '"] .pp-list') : prog;
            var at = cached ? indexFromMids(cached.mids, y) : dropIndexAt(y, listEl);
            var from = boxOf(si);
            /* dropping BELOW its own old position IN THE SAME box: the index
               shifts by one once the block is lifted out, or it lands one place
               short every time */
            if (from === k) {
              var cur = boxes[k].indexOf(si);
              if (cur !== -1 && at > cur) at -= 1;
            }
            moveInto(si, at, k);
          } else if (g ? inRect(g.tray, x, y) : inside(trayZone, x, y)) {
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

            /* one write per frame, and the marker only when the target moves */
            function paint() {
              raf = 0;
              if (!ghost || !geo) return;
              moveGhost(ghost, ptrX, ptrY);
              var t = targetAt(ptrX, ptrY, geo);
              var key = t.kind + ':' + (t.k == null ? '' : t.k) + ':' + (t.at == null ? '' : t.at);
              if (key === lastTarget) return;
              lastTarget = key;
              drawTarget(t, geo);
            }
            function onMove(ev) {
              if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 5) return;
              if (!moved) {
                moved = true; dragSi = si;
                node.classList.add('dragging');
                ghost = makeGhost(node, ev.clientX, ev.clientY);
                /* `.dragging` only changes opacity, so nothing has moved and
                   these are the rects a live read would return */
                geo = snapGeometry();
                lastTarget = '';
              }
              ev.preventDefault();
              ptrX = ev.clientX; ptrY = ev.clientY;
              if (!raf) raf = requestAnimationFrame(paint);
            }
            function onUp(ev) {
              node.removeEventListener('pointermove', onMove);
              node.removeEventListener('pointerup', onUp);
              node.removeEventListener('pointercancel', onUp);
              try { node.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
              if (raf) { cancelAnimationFrame(raf); raf = 0; }
              if (ghost) { ghost.remove(); ghost = null; }
              node.classList.remove('dragging');
              clearMarks();
              lastTarget = '';
              var g = geo; geo = null;
              /* A drag ends here. A press that never moved is left to the CLICK
                 handler below, so that keyboard activation (Enter or Space fires
                 click with no pointer events at all) keeps working - handling it
                 here instead locked out anyone not using a mouse. */
              if (moved) { suppressClick = true; commitDrop(si, ev.clientX, ev.clientY, g); }
              dragSi = null;
            }
            node.addEventListener('pointermove', onMove);
            node.addEventListener('pointerup', onUp);
            node.addEventListener('pointercancel', onUp);
          });

          /* ENTER STAYS A DELIBERATE ACT (DFM 272). Where the body click no
             longer removes, the keyboard must still be able to: `preventDefault`
             cancels the button's own synthesised click so the block is taken out
             exactly once. */
          if (!clickEjects && isPlaced) {
            node.addEventListener('keydown', function (e) {
              if (locked || e.key !== 'Enter') return;
              e.preventDefault();
              takeOut(si);
            });
          }
          node.addEventListener('click', function () {
            if (locked) return;
            if (suppressClick) { suppressClick = false; return; }   // the tail of a drag
            /* A SINGLE CLICK NEVER DESTROYS PLACED WORK (DFM 272) — the same law
               and the same gate as the pyrun tray, because it is the same fault:
               one gesture that both builds and unbuilds. */
            if (isPlaced && !clickEjects) return;
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
            var n = el('<button class="parsons-block' + PRE + '" type="button" draggable="false">' + esc(b) + '</button>');
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
                '<button class="parsons-block placed' + PRE + '" type="button" draggable="false">' + esc(it.blocks[si]) + '</button></li>');
              wireDrag(n.querySelector('button'), si, true);
              /* the labelled way back, a SIBLING of the block (DFM 272 + 267f) */
              if (!clickEjects && !locked) {
                var tb = el('<button class="ghost-btn take-back" type="button" aria-label="' +
                  esc(takeBackLabel + ': ' + String(it.blocks[si])) + '">' + esc(takeBackLabel) + '</button>');
                tb.addEventListener('click', function (e) { e.stopPropagation(); if (!locked) takeOut(si); });
                n.appendChild(tb);
              }
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

  /* Pupil-facing fallbacks for the two Python engines. A lesson is REQUIRED to
     supply every one of these and qa-pyrun fails the build if it does not —
     these exist only so that a missing key can never render a mute control or
     an empty box where an explanation belongs (DFM 205's law, DFM 42's family).
     They are engine literals, which is exactly why they must never be the thing
     a pupil reads (DFM 192g); the harness proves they are not. */
  var PY_SAY = {
    pickBlockSay: 'Click a block on the left to start.',
    pickPythonSay: 'Now click the Python line you think does the same job.',
    wrongSay: 'Not a pair. Both go back — look at them again and try another one.',
    rightSay: 'That is a pair. Both are locked in.',
    lockedNote: 'Move at least one line into your program, then RUN wakes up.',
    /* S2(b), his second J2 L3 sit. A program holding two real input() lines
       died on a spliced line, and the checklist reported ALL THREE jobs "NOT
       WORKING YET" — including "Your bot asks two questions", which was TRUE.
       The probes never ran, because the probe pass dies on the same line the
       live run died on; so the card was not reporting a result, it was
       reporting the absence of one, in the words of a failure. A screen that
       blames a pupil for something it did not measure is rule 35's family at
       its worst. Nothing is claimed now: the run stopped, and the console says
       why. */
    runDiedSay: 'Your program stopped before it could be checked — read the console.',
    notCheckedLabel: 'not checked',
    blankEmptySay: 'One of the boxes is still empty. Type something into it, then press RUN.',
    trayEmpty: 'Every line is in your program.',
    progEmpty: 'Nothing here yet — drag or click a line across.',
    matchedSay: 'The console said exactly what the target asked for.',
    notYetSay: 'The console did not say what the target asked for. Read what it really printed, change your program, and run it again.',
    takeBack: 'Put this line back'
  };

  /* ================= snap — MATCH A BLOCK TO ITS PYTHON TWIN ================
     J2 Lesson 2, Phase 1 (runner spec §C). She taps a Scratch block she can
     read, then taps the Python line she believes is its twin. Right: they snap
     together and both leave the tray. Wrong: BOTH flash and bounce back, and
     nothing is revealed and nothing is named — the Isotope-Snap pattern, rebuilt
     small inside the platform.

     GENUINE CONSEQUENCE (feedback_genuine_consequence): no auto-correct, no
     telegraphing, no "not that one — try the third". The Python side is shuffled
     at mount, so a pupil who learns the order learns nothing.

     EVERY BLOCK IS GLOSSED AT FIRST MEETING (spec §C, his K4 taper): this
     cohort's Scratch is shaky and untrusted, so the picture on the card carries
     one plain line saying what the block does. Reading the blocks is TAUGHT in
     place, on the card, rather than assumed. */
  Engines.snap = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      introCard(host, {
        kicker: cfg.kicker, title: cfg.title, text: cfg.intro || '',
        steps: cfg.steps, stepsClass: 'snap-intro-steps'
      }, cfg.beginLabel || 'Open the desk', build);

      function build() {
        var pairs = cfg.pairs || [];
        var pys = cfg.pythons || [];
        /* the Python side is shuffled; the BLOCK side keeps its authored order,
           because the blocks are a taught sequence and the gloss on each one is
           written to be met in that order */
        var order = pys.map(function (_, i) { return i; });
        for (var i = order.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t;
        }
        var solved = {}, firstTry = 0, tries = {};
        var pickedBlock = null, pickedPy = null, busy = false;

        var c = el('<div class="card snap-card">' +
          '<h2 class="snap-goal">' + fmtBold(cfg.goalLine || '') + '</h2>' +
          '<p class="snap-how">' + fmtBold(cfg.howLine || '') + '</p>' +
          '<div class="snap-cols">' +
          '<div class="snap-side snap-blocks"><h3>' + esc(cfg.blocksLabel || 'The blocks') + '</h3><div class="snap-list"></div></div>' +
          /* DFM 138 (j2-02 cold read, 19 Aug 2026): `str( )` appears on this desk before
             anything explains it. `pythonNote` puts one line naming it as survivable at the
             top of the column she is actually reading, rather than a screen earlier. */
          '<div class="snap-side snap-pys"><h3>' + esc(cfg.pythonLabel || 'The Python lines') + '</h3>' +
          (cfg.pythonNote ? '<p class="snap-col-note">' + esc(cfg.pythonNote) + '</p>' : '') +
          '<div class="snap-list"></div></div>' +
          '</div>' +
          '<div class="snap-done" hidden></div>' +
          '<p class="snap-say" role="status" aria-live="polite">' + esc(cfg.pickBlockSay || PY_SAY.pickBlockSay) + '</p>' +
          '</div>');
        host.appendChild(c);
        var blockList = c.querySelector('.snap-blocks .snap-list');
        var pyList = c.querySelector('.snap-pys .snap-list');
        var say = c.querySelector('.snap-say');
        var doneBox = c.querySelector('.snap-done');

        function speak(t) { say.textContent = String(t || ''); }

        function render() {
          blockList.innerHTML = ''; pyList.innerHTML = '';
          pairs.forEach(function (p, bi) {
            if (solved[p.id]) return;
            var b = el('<button class="snap-block" type="button" data-b="' + bi + '">' +
              '<img class="snap-img" src="' + esc(asset(p.img)) + '" alt="' + esc(p.imgAlt || '') + '">' +
              '<span class="snap-gloss">' + esc(p.gloss || '') + '</span></button>');
            b.onclick = function () { onBlock(bi); };
            blockList.appendChild(b);
          });
          order.forEach(function (pi) {
            if (usedPython(pi)) return;
            var n = el('<button class="snap-py" type="button" data-p="' + pi + '"><code>' + esc(pys[pi]) + '</code></button>');
            n.onclick = function () { onPy(pi); };
            pyList.appendChild(n);
          });
          if (pickedBlock != null) {
            var sel = blockList.querySelector('[data-b="' + pickedBlock + '"]');
            if (sel) sel.classList.add('picked');
          }
          if (!blockList.children.length) finish();
        }
        function usedPython(pi) {
          return pairs.some(function (p) { return solved[p.id] && Number(p.py) === Number(pi); });
        }

        function onBlock(bi) {
          if (busy) return;
          pickedBlock = (pickedBlock === bi) ? null : bi;
          render();
          speak(pickedBlock == null ? (cfg.pickBlockSay || PY_SAY.pickBlockSay) : (cfg.pickPythonSay || PY_SAY.pickPythonSay));
        }
        function onPy(pi) {
          if (busy) return;
          if (pickedBlock == null) { speak(cfg.pickBlockFirstSay || cfg.pickBlockSay || PY_SAY.pickBlockSay); return; }
          var p = pairs[pickedBlock];
          busy = true; pickedPy = pi;
          tries[p.id] = (tries[p.id] || 0) + 1;
          ctx.markItem(p.id, pi).then(function (r) {
            var blockNode = blockList.querySelector('[data-b="' + pickedBlock + '"]');
            var pyNode = pyList.querySelector('[data-p="' + pi + '"]');
            if (r && r.ok && r.correct) {
              if (tries[p.id] === 1) firstTry++;
              if (blockNode) blockNode.classList.add('snapped');
              if (pyNode) pyNode.classList.add('snapped');
              solved[p.id] = 1; p.py = pi;
              speak(cfg.rightSay || PY_SAY.rightSay);
              setTimeout(function () { pickedBlock = null; busy = false; render(); }, 520);
            } else {
              /* BOTH bounce. Nothing is revealed, nothing is named, and the
                 block stays picked so the next tap is a real second guess. */
              if (blockNode) blockNode.classList.add('bounce');
              if (pyNode) pyNode.classList.add('bounce');
              speak(cfg.wrongSay || PY_SAY.wrongSay);
              setTimeout(function () {
                if (blockNode) blockNode.classList.remove('bounce');
                if (pyNode) pyNode.classList.remove('bounce');
                busy = false;
              }, 560);
            }
          });
        }

        function finish() {
          if (doneBox.hasAttribute('hidden') === false) return;
          /* ---- THE DESK ANNOUNCES ITSELF — his finding, 25 Aug 2026 --------
             Clearing the last pair used to set `hidden = false` and nothing
             else: no motion, no scroll, no change of weight. On a card as tall
             as this one the panel can appear entirely below the fold, so the
             moment the hour is built around could pass without the pupil
             seeing it happen. That is the DFM 42/146e family — a mode that
             changes announces itself on screen — applied to the one moment
             this activity exists for.
             The entrance is the badge-moment family already used elsewhere: a
             fade and a small rise, one gold border pulse, and the headline at
             card-title weight so the panel READS as an arrival rather than as
             more text. It is scrolled into view if any part of it is below the
             fold. Under prefers-reduced-motion there is no motion at all and
             the panel keeps exactly the same visual weight and the same
             scroll-into-view — reduced motion is not reduced information.
             The change is kept inside the snap card: snap is used by j2-02 and
             by nothing else (verified), so no other lesson can move. */
          doneBox.hidden = false;
          doneBox.innerHTML = '<p class="snap-verdict snap-verdict-head">' + fmtBold(cfg.doneText || '') + '</p>' +
            '<button class="primary-btn" type="button">' + esc(cfg.continueLabel || 'Continue') + '</button>';
          doneBox.classList.add('is-arriving');
          try {
            var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!reduced) {
              /* forcing layout before the class lands is what makes the
                 transition actually RUN rather than being coalesced away — the
                 fault a rendered-pixel probe catches and a source read cannot */
              void doneBox.offsetHeight;
              doneBox.classList.add('is-in');
            } else {
              doneBox.classList.add('is-in');
            }
            var r = doneBox.getBoundingClientRect();
            if (r.bottom > (window.innerHeight || 0) || r.top < 0) {
              doneBox.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
            }
          } catch (err) { doneBox.classList.add('is-in'); }
          speak(cfg.doneSay || '');
          var clean = firstTry;
          App.armButton(doneBox.querySelector('button'), function () {
            /* A STRING, NOT AN OBJECT — and it matters more than it looks.
               `finishChunk` hands its second argument straight to
               `ctx.awardBadge(badge, detail)`, which sends it to the server as
               the event's DETAIL KEY. The server grants XP only when the key is
               NEW (`detailAddsNew_`), which is the idempotency rule that stops a
               re-read paying twice. Passing `{ detail: '…' }` stringified to
               "[object Object]" — so the FIRST badge of the lesson wrote that,
               and every LATER badge in the same lesson was judged "not new" and
               ITS XP WAS SILENTLY DROPPED. Measured on the preview store, 25 Aug
               2026: j3-02's record read xp 31 (badge one, 21, plus the exit's
               flat 10) where the content promises 57 — and the badge pop had
               already told the pupil the full number. Rule 35 on her own points,
               and DFM 234's class exactly.
               It reached only `snap` and `pyrun`, the two engines written in the
               same 19 Aug round; every other finishChunk caller in this file
               already passes a string. */
            finishChunk(ctx, (chunk.id || 'snap') + '=' + clean + '/' + pairs.length,
              Math.min(Number(cfg.firstTryXp || 0) * clean, Number(cfg.firstTryXpCap || 0)));
          });
        }
        render();
      }
    }
  };

  /* ================= pyrun — BUILD IT, THEN MAKE THE CONSOLE SAY IT =========
     The card the runner spec commissions (§A/§C/§D). One engine, two very
     different jobs, because what varies between the years is the CARD and the
     cognitive frame, not the machinery:

       J2 Lesson 2, Phase 2 — one build, a tray carrying REAL SLIPS as decoys
       (no brackets, a capital S on Score, a duplicate line). She assembles the
       Python she has just learned to read, and the verifier console tells her
       what her program really did.

       J3 Lesson 2 — four builds in a ramp (exact print, two prints in order, a
       variable used twice, arithmetic in the output). Each build STATES its
       target output and she must MAKE THE CONSOLE SAY IT, typing into
       single-line blanks along the way.

     WHY THIS AND NOT AN EXTENSION OF `parsons` (a judgement call, recorded):
     the spec named parsons for Phase 2's assembly, written before this engine
     existed. Parsons is used by four lessons Damien has signed off (DFM
     176/203/218) and it LOCKS on check, which is the opposite of what a run
     card needs — a wrong program must hand the lines back and let her try
     again. Putting a retry loop, a runtime, a console and typed blanks inside
     it would have put all four locked lessons on the table for a mechanic none
     of them uses. So the assembly lives here, beside the run and the console it
     feeds, in ONE home; `parsons` is not touched by this round at all, and
     qa-j1-unchanged proves it.

     THE VERDICT IS MATCHED / NOT YET AND NEVER WHICH LINE TO FIX (spec §D).
     The console is honest about what happened; the diagnosis is hers. */
  Engines.pyrun = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var builds = cfg.builds || [];
      var at = 0, cleanFirst = 0, featureFirst = 0;
      var liveRun = null;      /* the run in flight, so leaving can abandon it */

      /* ---- THE EXTRA JOBS ZONE — DFM 265, HIS RULING, 26 Aug 2026 ---------
         His two sentences, and they are one design: "I'm not sure that we should
         offer extra XP for students who are naturally brighter, as this might
         seem unfair to a 'normal' student" and "the teacher says it's nearly
         time up and to finish — how can they leave their current task… so that
         they can still claim their badge, carry out the exit question(s) and
         completing their evaluation."
         The V54 in-chunk stretch OFFER is dead and its `stretch` field with it.
         An offer that interrupts the end of a badged chunk, promises points and
         has one way onward is the wrong shape for optional work: the promise is
         what makes leaving at time-up feel like a loss, and there was no way out
         of a half-done stretch at all.
         WHAT REPLACES IT is a zone of its own, AFTER the badge is banked, that
         pays nothing and traps nobody: a hub of jobs, and a "Finish the lesson"
         control on the hub AND inside every job, so the way out is on every
         screen she can reach. Nothing is written to her record from here — the
         chunk carries no badge, so `done` is `ctx.next()` and no more — which is
         also what makes the zone free to render LIVE in review mode (265d), so
         "come back when the lesson is finished" is true on screen rather than a
         promise.
         IT IS CONFIG-GATED, so a pyrun chunk without `extrasMode` renders
         byte-identically to the engine he has already sat (the drivecheck /
         briefing-film precedent), and qa-extras-zone proves that against the
         pre-change engine pulled out of git rather than asserting it. */
      var doneJobs = {};                 /* this sitting only — never a record */

      if (cfg.extrasMode) { hub(); return; }

      /* ---- A FILM AT THE POINT OF BUILDING (DFM 168, config-gated) --------
         "when a film teaches a build, the film is served in parts, at the point
         of building" — his own law from the Lesson 3 sit. This card's part is
         the one that shows the move she is about to make, so it sits ON the card
         that asks her to make it rather than eight minutes earlier. A pyrun
         chunk that names no `introVideo` renders exactly the intro card it
         rendered before, byte for byte. */
      var introFilm = cfg.introVideo
        ? '<div class="pyrun-intro-film"><video controls preload="metadata" playsinline src="' +
          esc(asset(cfg.introVideo)) + '"></video>' +
          (cfg.introVideoSay ? '<p class="pyrun-intro-film-say">' + esc(cfg.introVideoSay) + '</p>' : '') +
          '</div>'
        : '';
      /* A STAGED BUILD CARRIES ITS OWN FIRST FACE (K41b), so a generic intro
         card in front of it would be a second screen saying the same thing —
         which is the wall in miniature. The PLAN face holds the kicker, the
         title, the lead, the film and the three jobs, and it is the screen she
         lands on. */
      if ((builds[0] || {}).staged) { startBuild(); return; }
      introCard(host, {
        kicker: cfg.kicker, title: cfg.title, text: cfg.intro || '',
        steps: cfg.steps, stepsClass: 'pyrun-intro-steps', extra: introFilm
      }, cfg.beginLabel || 'Open the desk', function () { startBuild(); });

      /* THE HUB. The intro sits ABOVE the jobs, not under them: DFM 151 —
         "an instruction about HOW to interact belongs above the control, not
         below it" — and what the intro says (these pay nothing, nothing needs
         them, you can stop whenever your teacher calls time) is precisely what
         she has to know BEFORE she picks one, not after.
         In review mode the same card gains one sentence at the front, because
         a pupil who has finished the lesson is in a different situation from one
         who has just banked her badge, and the screen has to say which (DFM
         146e: a mode that changes the rules announces itself). */
      function hub() {
        host.innerHTML = '';
        var lead = (ctx.review && cfg.reviewIntro)
          ? cfg.reviewIntro + '\n\n' + (cfg.intro || '')
          : (cfg.intro || '');
        var jobs = builds.map(function (b) {
          return '<button class="pyrun-job" type="button" data-job="' + esc(b.id || '') + '">' +
            '<b class="pyrun-job-title">' + esc(b.title || b.tab || '') + '</b>' +
            '<span class="pyrun-job-whiff">' + esc(b.whiff || '') + '</span>' +
            (doneJobs[b.id] ? '<span class="pyrun-job-tick">' + esc(cfg.doneTick || 'job done') + '</span>' : '') +
            '</button>';
        }).join('');
        /* ---- S11(a): A FINISHED SET IS NOT A DEAD END --------------------
           His second sit: all three extra jobs ticked, and the only way onward
           was still a quiet grey line at the bottom that begins "Running out of
           time?" — a sentence written for a pupil who is ABANDONING the zone,
           offered to one who has finished it. She had done everything the
           screen asked and the screen had nothing to say about it.
           No silent auto-advance (that would take the choice off her, and this
           zone's whole promise is that she decides): the row PROMOTES. One
           primary button, saying what is true — that is all three — and one
           click. Content-gated on `allDoneLabel`, so a pyrun zone that does not
           supply one renders exactly the row it renders today. */
        var allDone = builds.length > 0 && builds.every(function (bb) { return doneJobs[bb.id]; });
        var promoted = allDone && (cfg.allDoneLabel || '');
        var c = el('<div class="card pyrun-hub">' +
          '<span class="intro-kicker">' + esc(cfg.kicker || '') + '</span>' +
          '<h2>' + esc(cfg.title || '') + '</h2>' +
          '<p class="intro-lead">' + fmtBold(lead) + '</p>' +
          '<div class="pyrun-jobs">' + jobs + '</div>' +
          (promoted ? '<p class="pyrun-alldone-say">' + fmtBold(cfg.allDoneSay || '') + '</p>' : '') +
          '<div class="rung-actions pyrun-exit-row' + (promoted ? ' is-alldone' : '') + '">' +
          '<button class="' + (promoted ? 'primary-btn' : 'ghost-btn') + ' pyrun-finish" type="button">' +
          esc(promoted ? cfg.allDoneLabel : finishLabel()) + '</button>' +
          '</div></div>');
        host.appendChild(c);
        c.querySelectorAll('.pyrun-job').forEach(function (btn) {
          App.armButton(btn, function () {
            var i = builds.findIndex(function (b) { return String(b.id) === btn.getAttribute('data-job'); });
            if (i < 0) return;
            at = i;
            startBuild();
          });
        });
        App.armButton(c.querySelector('.pyrun-finish'), function () { done(); });
      }
      function finishLabel() { return cfg.finishLabel || 'Finish the lesson'; }

      /* ---- THE REFUSABLE EXTRA BUILD (spec §D3/§E2, under DFM 259 + 265) ----
         DFM 265 killed the V54 stretch offer, and it named exactly what was
         wrong with it: it promised points, it had one way onward, and there was
         no way out of a half-done one. This is the same PLACE in the hour and
         none of those three faults. It pays NOTHING; refusing is a control of
         equal weight sitting beside accepting; and the extra build itself
         carries "finish this part" on its own card, so a pupil told "time up"
         half way through it banks her badge with one press. The extras hub
         (265's own shape) is still there afterwards, so this lesson carries a
         refusable stretch twice over. */
      function offerExtra() {
        var b = builds[at];
        host.innerHTML = '';
        var c = el('<div class="card py-offer-card">' +
          '<span class="intro-kicker">' + esc(b.offerKicker || cfg.offerKicker || '') + '</span>' +
          '<h2>' + esc(b.offerTitle || '') + '</h2>' +
          '<p class="intro-lead">' + fmtBold(b.offerLead || '') + '</p>' +
          '<p class="py-offer-free">' + fmtBold(b.offerFree || cfg.offerFree || '') + '</p>' +
          '<div class="rung-actions py-offer-row">' +
          '<button class="primary-btn py-offer-yes" type="button">' + esc(b.offerYes || cfg.offerYes || '') + '</button>' +
          '<button class="ghost-btn py-offer-no" type="button">' + esc(b.offerNo || cfg.offerNo || '') + '</button>' +
          '</div></div>');
        host.appendChild(c);
        App.armButton(c.querySelector('.py-offer-yes'), function () { startBuild(true); });
        App.armButton(c.querySelector('.py-offer-no'), function () { done(); });
      }

      function done() {
        if (liveRun) { try { liveRun.abandon(); } catch (e) { /* already settled */ } liveRun = null; }
        /* TWO WAYS TO EARN THE SAME BONUS, and which one applies is the chunk's
           own shape rather than a flag. An assemble/worked chunk pays per BUILD
           cleared first time (v1, untouched). A free build with feature probes
           pays per FEATURE that was real on the very first RUN — because there is
           only ever one "build" there, and paying it all-or-nothing would make a
           four-of-five program worth the same as an empty box. Clean-run
           weighting is what already pays first-try more, which is exactly why
           none of the help in these lessons carries a price (K38c). */
        var xp = Number(cfg.featureXp || 0)
          ? Math.min(Number(cfg.featureXp) * featureFirst, Number(cfg.featureXpCap || 0))
          : Math.min(Number(cfg.firstTryXp || 0) * cleanFirst, Number(cfg.firstTryXpCap || 0));
        /* AND THE KEY IS THE CHUNK'S OWN ID, not the engine's name. The server's
           idempotency rule keys on the text before the '=', so two chunks of the
           SAME engine in one lesson wrote the same key — and the second one was
           judged "not new", so its XP was dropped and its detail overwrote the
           first's. J3 Lesson 2 is exactly that shape: `callsheet-a` and
           `callsheet-b` are both pyrun, so the Call Sheet Printed badge has never
           granted a point, and the teacher's Live tab lost the first chunk's
           record as well. A chunk id is unique inside a lesson by construction,
           so this closes the CLASS and not just the instance (DFM 167b) — a
           lesson with two snap desks would have had the same fault. Nothing reads
           these keys but the server's idempotency check and the Live tab, both of
           which are better off with a name that says which activity it came
           from.
           CORRECTED 27 Aug 2026 (§F1): this comment used to say "the Live tab's
           RAW LEDGER", and there has never been a raw-ledger view in staff.js —
           it described a surface that did not exist, which is DFM 194(c)'s law
           in reverse (a code comment's claim is a hypothesis, never evidence).
           There IS a reader now: the Live tab renders one column per build
           chunk, named by the chunk's own title, and the CSV carries the same. */
        var detail = (chunk.id || 'py') + '=' + cleanFirst + '/' + builds.length;
        /* THE EXTRAS ZONE PAYS NOTHING AND RECORDS NOTHING (DFM 265a). No first-try
           counting, no bonus, and a detail string that says only that she passed
           through — the chunk carries no badge, so `finishChunk` takes the
           no-badge branch and this never reaches the server at all. That is the
           whole reason "Finish the lesson" is a free move at time-up: there is no
           promise on this screen for leaving to break. */
        if (cfg.extrasMode) { finishChunk(ctx, (chunk.id || 'extras') + '=extras', 0); return; }
        /* a STRING, for the reason spelled out on the snap desk's own call */
        finishChunk(ctx, detail, xp);
      }

      /* ================= THE HELP LADDER (spec SS A5 / K38) =================
         His direction, 26 Aug 2026: "There probably need to be a lot of hand
         holding with this lesson in terms of hints and help, and above all,
         clarity of instructions and interface."
         Three rungs, on EVERY build step of both hours, and every one of them
         FREE (K38c). There is no price label anywhere in these two lessons: the
         clean-run weighting already pays a first-try program more, so charging
         for help would be charging twice. J1's Debug Hint keeps its 2 XP where
         it shipped and is not touched.
           level 0  the honest console + the authored plain-words line (PyRun)
           level 1  "Show me the shape" -- the structural pattern with EMPTY
                    slots. Never her values, never the answer (DFM 210).
           level 2  "Show me how" -- the film clip for this exact move, opened
                    from wherever she is standing, INCLUDING the NOT YET state,
                    because that is the moment she needs it (DFM 262).
           level 3  (features only) a look-here nudge naming what to INSPECT.
         Both buttons are rendered as ghosts in one row, so a pupil meets the
         same two controls in the same place on every build step of both hours. */
      function helpRowHtml(b) {
        var bits = [];
        if (b && b.shape && b.shape.length) {
          bits.push('<button class="ghost-btn py-shape-btn" type="button">' +
            esc(cfg.shapeLabel || 'Show me the shape') + '</button>');
        }
        var clip = (b && b.clip) || cfg.clip;
        if (clip && clip.src) {
          bits.push('<button class="ghost-btn py-clip-btn" type="button">&#127909; ' +
            esc(clip.label || cfg.clipLabel || 'Show me how') + '</button>');
        }
        if (!bits.length) return '';
        return '<div class="py-help-row">' + bits.join('') + '</div>';
      }
      function wireHelpRow(card, b) {
        var sb = card.querySelector('.py-shape-btn');
        if (sb) sb.onclick = function () { openShape(b); };
        var cb = card.querySelector('.py-clip-btn');
        var clip = (b && b.clip) || cfg.clip;
        if (cb && clip) cb.onclick = function () { openClip(clip); };
      }
      function openShape(b) {
        var ov = el('<div class="ols-modal py-shape-modal"><div class="ols-modal-card">' +
          '<span class="intro-kicker">' + esc(cfg.shapeKicker || 'The shape') + '</span>' +
          '<h2>' + esc(b.shapeTitle || cfg.shapeTitle || 'What this looks like') + '</h2>' +
          '<p class="py-shape-lead">' + fmtBold(b.shapeLead || cfg.shapeLead || '') + '</p>' +
          '<pre class="py-shape-code">' + esc((b.shape || []).join('\n')) + '</pre>' +
          (b.shapeNote || cfg.shapeNote
            ? '<p class="py-shape-note">' + fmtBold(b.shapeNote || cfg.shapeNote) + '</p>' : '') +
          '<div class="confirm-actions"><button class="primary-btn py-shape-close" type="button">' +
          esc(cfg.shapeClose || 'Back to my program') + '</button></div>' +
          '</div></div>');
        document.body.appendChild(ov);
        App.armButton(ov.querySelector('.py-shape-close'), function () { ov.remove(); });
      }

      /* ================= WORKED MODE (spec SS D/E's stage-1 cards) ==========
         An authored program she can READ, with the gaps she has to put right,
         and a RUN that really runs it. When the program asks a question the
         answer is typed into a transcript beside the console rather than into a
         box that says "input" -- because what she is looking at IS a
         conversation, and calling it one is the whole point of the hour.
         The planted mistake is on the DEMO's program, never on her own build
         (DFM 210): she reads a real Python error, fixes it herself, and runs it
         clean. Nothing is pre-flagged and nothing auto-corrects. */
      function startWorked() {
        host.innerHTML = '';
        var b = builds[at];
        var picked = -1;
        var attempts = 0;
        var replies = [];
        if (b.styles && b.styles.length && picked < 0) { pickStyle(); return; }
        draw();

        function pickStyle() {
          var cards = b.styles.map(function (st, i) {
            return '<button class="py-style" type="button" data-i="' + i + '">' +
              '<b class="py-style-name">' + esc(st.name || '') + '</b>' +
              '<span class="py-style-whiff">' + esc(st.whiff || '') + '</span></button>';
          }).join('');
          var c = el('<div class="card py-style-card">' +
            '<span class="intro-kicker">' + esc(b.styleKicker || cfg.kicker || '') + '</span>' +
            '<h2>' + esc(b.styleTitle || '') + '</h2>' +
            '<p class="intro-lead">' + fmtBold(b.styleLead || '') + '</p>' +
            '<div class="py-styles">' + cards + '</div></div>');
          host.appendChild(c);
          c.querySelectorAll('.py-style').forEach(function (btn) {
            App.armButton(btn, function () { picked = Number(btn.getAttribute('data-i')); host.innerHTML = ''; draw(); });
          });
        }

        function programLines() {
          return (picked >= 0 ? b.styles[picked].lines : b.lines) || [];
        }

        function draw() {
          var lines = programLines();
          var vals = {};
          var html = lines.map(function (L, i) {
            var t = esc(String(L.t || ''));
            (L.blanks || []).forEach(function (bl) {
              /* A GAP CAN ARRIVE WITH SOMETHING ALREADY IN IT. That is how a
                 planted mistake gets onto the screen without being pointed at:
                 the demo program simply has a mis-typed box name in it, she
                 presses RUN, and Python tells her. Nothing is pre-flagged, and
                 the mistake is on the DEMO, never on her own build (DFM 210). */
              if (bl.pre != null && vals[bl.key] == null) vals[bl.key] = String(bl.pre);
              t = t.replace(esc(bl.slot || '____'),
                '<input class="pyrun-blank" type="text" spellcheck="false" autocomplete="off" ' +
                'data-key="' + esc(bl.key) + '" size="' + (Number(bl.size) || 8) + '" maxlength="' + (Number(bl.max) || 24) + '" ' +
                (bl.pre != null ? 'value="' + esc(String(bl.pre)) + '" ' : '') +
                'aria-label="' + esc(bl.label || 'type here') + '" placeholder="' + esc(bl.ph || '') + '">');
            });
            var hints = (L.blanks || []).map(function (bl) { return bl.label; }).filter(Boolean);
            /* a row, never a control: nothing here nests an input inside a
               button, and nothing here is clickable, so there is no keyboard
               behaviour to protect (DFM 267f) */
            return '<li class="pyw-line' + ((L.blanks || []).length ? ' has-blank' : '') + '">' +
              '<code>' + t + '</code>' +
              (hints.length ? '<span class="pyrun-blank-hint">' + esc(hints.join(' · ')) + '</span>' : '') +
              '</li>';
          }).join('');
          var c = el('<div class="card pyrun-card pyw-card" data-build="' + esc(b.id || '') + '">' +
            '<h2 class="pyrun-goal">' + fmtBold(b.goalLine || '') + '</h2>' +
            (b.brief ? '<p class="pyrun-brief">' + fmtBold(b.brief) + '</p>' : '') +
            (picked >= 0 && b.styles[picked].chosenSay
              ? '<p class="pyw-chosen">' + fmtBold(b.styles[picked].chosenSay) + '</p>' : '') +
            '<div class="pyw-prog"><h3>' + esc(cfg.progLabel || 'The program') + '</h3><ol class="pyw-list">' + html + '</ol></div>' +
            helpRowHtml(b) +
            '<button class="primary-btn pyrun-run" type="button">' + esc(cfg.runLabel || 'RUN this program') + '</button>' +
            '<div class="pyw-stage"></div>' +
            '<div class="pyrun-verdict" hidden></div>' +
            '</div>');
          host.appendChild(c);
          wireHelpRow(c, b);
          var stage = c.querySelector('.pyw-stage');
          var chat = b.chat === false ? null : PyRun.chat(stage, cfg.chatLabels || {});
          var con = PyRun.console(stage, cfg.consoleLabels || {});
          var runBtn = c.querySelector('.pyrun-run');
          var verdict = c.querySelector('.pyrun-verdict');
          PyRun.load().catch(function () { /* reported honestly at RUN */ });
          c.querySelectorAll('.pyrun-blank').forEach(function (inp) {
            var k = inp.getAttribute('data-key');
            inp.addEventListener('input', function () { vals[k] = inp.value; });
            inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') ev.preventDefault(); });
          });

          function codeOf() {
            return lines.map(function (L) {
              var t = String(L.t || '');
              (L.blanks || []).forEach(function (bl) {
                t = t.replace(bl.slot || '____', String(vals[bl.key] == null ? '' : vals[bl.key]));
              });
              return t;
            }).join('\n');
          }
          function emptyBlank() {
            for (var i = 0; i < lines.length; i++) {
              var bls = lines[i].blanks || [];
              for (var k = 0; k < bls.length; k++) {
                var v = vals[bls[k].key];
                if (v == null || !String(v).trim()) return bls[k];
              }
            }
            return null;
          }

          runBtn.onclick = function () {
            var miss = emptyBlank();
            if (miss) {
              verdict.hidden = false;
              verdict.className = 'pyrun-verdict is-note';
              verdict.innerHTML = '<p>' + esc(cfg.blankEmptySay || PY_SAY.blankEmptySay) + '</p>';
              var inp = c.querySelector('.pyrun-blank[data-key="' + miss.key + '"]');
              if (inp) { inp.classList.add('wants'); inp.focus(); }
              return;
            }
            verdict.hidden = true;
            runBtn.disabled = true;
            attempts++;
            replies = [];
            if (chat) chat.clear();
            con.running();
            /* A DISABLED RUN MUST SAY WHY IT IS DISABLED, AND SAY IT BESIDE
               ITSELF. While the program is stopped on an input( ) the button is
               asleep on purpose, and the confused-pupil walk found exactly what
               that looks like from a pupil's chair: a button that will not act
               with nothing next to it saying what to do (DFM 42/205). The first
               attempt put the sentence in the verdict block, which on this card
               sits UNDER the console and the conversation -- four hundred
               pixels away, which is the "note two steps away" the rule is
               written against. It goes immediately after the button. */
            if (chat && cfg.waitingSay) PyRun.waitNote(runBtn, cfg.waitingSay);
            liveRun = PyRun.start(codeOf(), {
              limitMs: Number(cfg.limitMs || 0) || undefined,
              inputfun: chat ? function (prompt) {
                return chat.ask(prompt, cfg.botWho || (cfg.chatLabels || {}).botWho, cfg.sendLabel)
                  .then(function (v) { replies.push(v); return v; });
              } : undefined
            });
            liveRun.p.then(function (res) {
              liveRun = null;
              PyRun.clearWaitNote(runBtn);
              if (chat) chat.closeAsk();
              con.show(res, cfg.errorWords || {});
              var ok = judge(res);
              verdict.hidden = false;
              verdict.className = 'pyrun-verdict ' + (ok ? 'is-matched' : 'is-notyet');
              verdict.innerHTML = '<p class="pyrun-vtag">' +
                esc(ok ? (cfg.matchedLabel || 'MATCHED') : (cfg.notYetLabel || 'NOT YET')) + '</p>' +
                '<p class="pyrun-vsay">' + esc(ok ? (b.matchedSay || cfg.matchedSay || PY_SAY.matchedSay)
                                                  : (b.notYetSay || cfg.notYetSay || PY_SAY.notYetSay)) + '</p>';
              if (!ok) { runBtn.disabled = false; return; }
              if (attempts === 1 && !b.optional) cleanFirst++;
              c.querySelectorAll('.pyrun-blank').forEach(function (n) { n.disabled = true; });
              var last = (at + 1 >= builds.length);
              var go = el('<button class="primary-btn" type="button">' +
                esc(last ? (cfg.continueLabel || 'Continue') : (cfg.nextBuildLabel || 'Next step')) + '</button>');
              verdict.appendChild(go);
              App.armButton(go, function () { at++; if (at < builds.length) startBuild(); else done(); });
            });
          };

          /* WHAT COUNTS AS RIGHT, and it is never "the program looked plausible".
             `target`  the exact printing, v1's rule, for a card with no typing;
             `clean`   it ran with no error at all -- the shape used where SHE
                       supplies words the card cannot know in advance;
             plus, on a conversation card, every answer she typed has to come
             back out in the printing, because a bot that ignores what you said
             is the fault the whole hour is about. */
          function judge(res) {
            if (!res.ok) return false;
            var kind = String((b.check && b.check.kind) || (b.target ? 'target' : 'clean'));
            if (kind === 'target') return PyRun.matches(res.out, b.target || []);
            if (b.check && b.check.usesReplies) {
              if (!replies.length) return false;
              var text = String(res.out || '');
              return replies.every(function (r) { return text.indexOf(r) !== -1; });
            }
            return true;
          }
        }
      }

      /* ================= EDITOR MODE (spec SS A2 / K35(5) / K38d,e) =========
         HIS DESIGN, RULED: "could we have template lines for j2 and pure typing
         for j3? there needs to be some progression between year groups don't you
         think?" So one editor, two entry styles, chosen by the lesson:
           palette  a bank of template lines. Clicking one puts it in AT THE
                    CARET and she edits the words. The bank is SHUFFLED at mount,
                    because a tray served in solution order is an answer sheet
                    (DFM 258, applied to a palette as a served tray).
           typed    plain typing. The scaffolding is the worked -> parsons ->
                    faded ladder she has just climbed, never autocomplete.
         NO BLANK PAGE (K38d). A typed build opens with a REFUSABLE one-click
         starter: the shape she has been taught, carrying her own names and empty
         slots. It is scaffolding, not the answer -- the finished house program
         never appears (DFM 210).
         THE CHECKLIST STAYS ON SCREEN BESIDE THE EDITOR (K38e), so what she is
         being asked for is never one screen behind what she is typing. */
      /* ---- ONE CHIP, ONE ROUTE IN (S2a, DFM 144) -------------------------
         Both editor faces draw the same palette chip and both wire it the same
         way, so the markup and the wiring live in ONE place. They did not, and
         the cost was exactly the fault he met: the fix would have had to be
         written twice and one of the two would have been missed. */
      function chipHtml(t, i) {
        /* DRAGGABLE="FALSE" IS THE FIX ON THIS SIDE. The chip was wired for
           CLICK only; a pupil who DRAGGED one handed the job to the browser's
           own text-drag, which splices the raw characters at the drop caret —
           straight through the middle of a working line, past `ed.insert()`'s
           newline discipline. That is his merged line 3 and the SyntaxError
           after it. Marking the chip and its parts undraggable stops the
           browser inventing a drag; the editor below accepts a real one. */
        return '<button class="pyp-chip" type="button" draggable="false" data-i="' + i + '">' +
          '<b class="pyp-chip-name" draggable="false">' + esc(t.label || '') + '</b>' +
          '<code class="pyp-chip-code" draggable="false">' + esc(t.line || '') + '</code></button>';
      }
      /* `put(i)` is the card's own insert-and-say-so; everything below just
         decides when to call it, so a click and a drag can never diverge. */
      function wireChips(card, ed, put) {
        var dragging = null;
        card.querySelectorAll('.pyp-chip').forEach(function (btn) {
          btn.onclick = function () { put(btn.getAttribute('data-i')); };
          btn.addEventListener('dragstart', function (e) {
            dragging = btn.getAttribute('data-i');
            try {
              e.dataTransfer.effectAllowed = 'copy';
              e.dataTransfer.setData('text/x-ols-chip', String(dragging));
            } catch (err) { /* a browser that refuses custom types still has `dragging` */ }
          });
          btn.addEventListener('dragend', function () { dragging = null; });
        });
        if (!ed || !ed.area) return;
        /* THE EDITOR TAKES THE DROP ITSELF. Without this the textarea's default
           handler runs, and the default handler IS the splice. A drop carrying
           anything else — a file, text from another page — is left alone: it is
           not a chip and this card has no business claiming it. */
        ['dragenter', 'dragover'].forEach(function (evt) {
          ed.area.addEventListener(evt, function (e) {
            if (dragging == null) return;
            e.preventDefault();
            try { e.dataTransfer.dropEffect = 'copy'; } catch (err) { /* older engine */ }
            ed.area.classList.add('is-chip-drop');
          });
        });
        ed.area.addEventListener('dragleave', function () { ed.area.classList.remove('is-chip-drop'); });
        ed.area.addEventListener('drop', function (e) {
          if (dragging == null) return;
          e.preventDefault();
          ed.area.classList.remove('is-chip-drop');
          var i = dragging; dragging = null;
          /* the caret may be sitting mid-line where the pointer left it;
             `insert()` normalises to whole-line boundaries either way */
          put(i);
        });
      }

      function startEditor() {
        host.innerHTML = '';
        var b = builds[at];
        var attempts = 0;
        var replies = [];
        var feats = b.features || [];
        var state = {};                       /* feature id -> true once matched */
        var trayOrder = derangedOrder((b.palette || []).length);

        var checklist = feats.map(function (f) {
          return '<li class="pyf-item" data-f="' + esc(f.id) + '">' +
            '<span class="pyf-tag">' + esc(b.pendingLabel || cfg.pendingLabel || 'not yet') + '</span>' +
            '<span class="pyf-say">' + esc(f.label || '') + '</span>' +
            '<span class="pyf-nudge" hidden></span></li>';
        }).join('');

        var paletteHtml = (b.palette && b.palette.length)
          ? '<div class="pyp-palette"><h3>' + esc(b.paletteLabel || cfg.paletteLabel || 'Lines you can use') + '</h3>' +
            '<p class="pyp-palette-lead">' + fmtBold(b.paletteLead || cfg.paletteLead || '') + '</p>' +
            '<div class="pyp-palette-list">' + trayOrder.map(function (i) {
              var t = b.palette[i];
              return chipHtml(t, i);
            }).join('') + '</div></div>'
          : '';

        var c = el('<div class="card pyrun-card pye-card" data-build="' + esc(b.id || '') + '">' +
          '<h2 class="pyrun-goal">' + fmtBold(b.goalLine || '') + '</h2>' +
          (b.brief ? '<p class="pyrun-brief">' + fmtBold(b.brief) + '</p>' : '') +
          '<div class="pye-cols">' +
          '<div class="pye-main"><div class="pye-host"></div>' + paletteHtml + '</div>' +
          '<aside class="pye-side"><h3>' + esc(b.checklistLabel || cfg.checklistLabel || 'What it has to do') + '</h3>' +
          '<ol class="pyf-list">' + checklist + '</ol>' +
          (b.starter && b.starter.length
            ? '<div class="pye-starter"><p class="pye-starter-say">' + fmtBold(b.starterSay || cfg.starterSay || '') + '</p>' +
              '<button class="ghost-btn pye-starter-btn" type="button">' + esc(b.starterLabel || cfg.starterLabel || 'Put the shape in for me') + '</button></div>'
            : '') +
          '</aside></div>' +
          helpRowHtml(b) +
          '<button class="primary-btn pyrun-run" type="button">' + esc(cfg.runLabel || 'RUN my program') + '</button>' +
          '<div class="pyw-stage"></div>' +
          '<div class="pyrun-verdict" hidden></div>' +
          '</div>');
        host.appendChild(c);
        wireHelpRow(c, b);

        var ed = PyRun.editor(c.querySelector('.pye-host'), b.editor || cfg.editor || {});
        var stage = c.querySelector('.pyw-stage');
        var chat = b.chat ? PyRun.chat(stage, cfg.chatLabels || {}) : null;
        var con = PyRun.console(stage, cfg.consoleLabels || {});
        var runBtn = c.querySelector('.pyrun-run');
        var verdict = c.querySelector('.pyrun-verdict');
        PyRun.load().catch(function () { /* reported honestly at RUN */ });

        /* THE GUIDED FIRST INSERT (K38d). The first chip she clicks says what
           just happened and what to do with it; after that they land quietly,
           because a tip repeated on every click is noise. */
        var firstInsert = true;
        function putChip(i) {
          var t = b.palette[Number(i)];
          if (!t) return;
          ed.insert(String(t.line || ''));
          if (firstInsert && (b.firstInsertSay || cfg.firstInsertSay)) {
            firstInsert = false;
            var note = c.querySelector('.pye-first-note');
            if (!note) {
              note = el('<p class="pye-first-note">' + fmtBold(b.firstInsertSay || cfg.firstInsertSay) + '</p>');
              c.querySelector('.pye-main').insertBefore(note, c.querySelector('.pyp-palette'));
            }
          }
        }
        wireChips(c, ed, putChip);
        var sb = c.querySelector('.pye-starter-btn');
        if (sb) {
          sb.onclick = function () {
            ed.set((b.starter || []).join('\n'));
            sb.disabled = true;
            var box = c.querySelector('.pye-starter');
            if (box && (b.starterDoneSay || cfg.starterDoneSay)) {
              box.insertAdjacentHTML('beforeend',
                '<p class="pye-starter-done">' + fmtBold(b.starterDoneSay || cfg.starterDoneSay) + '</p>');
            }
            ed.focus();
          };
        }

        function paintFeatures(results, ran, stopped) {
          feats.forEach(function (f) {
            var row = c.querySelector('.pyf-item[data-f="' + f.id + '"]');
            if (!row) return;
            var hit = (results || []).find(function (r) { return r.id === f.id; });
            var ok = !!(hit && hit.ok);
            if (ok) state[f.id] = true;
            row.className = 'pyf-item ' + (ok ? 'is-matched' : (stopped ? 'is-stopped' : (ran ? 'is-notyet' : '')));
            row.querySelector('.pyf-tag').textContent = ok
              ? (b.matchedLabel || cfg.matchedLabel || 'MATCHED')
              : (stopped ? (b.notCheckedLabel || cfg.notCheckedLabel || PY_SAY.notCheckedLabel)
                 : (ran ? (b.notYetLabel || cfg.notYetLabel || 'NOT YET')
                        : (b.pendingLabel || cfg.pendingLabel || 'not yet')));
            /* LEVEL 3 (K38b): a look-here nudge, and only ever a look-here. It
               names what to INSPECT and never the line to change. */
            var nu = row.querySelector('.pyf-nudge');
            /* a nudge on a run that never ran is a hint about a fault that has
               not been shown to exist — never on a stopped run */
            if (!ok && ran && !stopped && f.nudge) { nu.hidden = false; nu.textContent = f.nudge; }
            else { nu.hidden = true; nu.textContent = ''; }
          });
        }
        paintFeatures([], false);

        runBtn.onclick = function () {
          var code = ed.value();
          if (!String(code).trim()) {
            /* THE EMPTY BOX EXPLAINS ITSELF (DFM 205) — never a silent refusal */
            verdict.hidden = false;
            verdict.className = 'pyrun-verdict is-note';
            verdict.innerHTML = '<p>' + esc(b.emptySay || cfg.emptySay || PY_SAY.blankEmptySay) + '</p>';
            ed.focus();
            return;
          }
          verdict.hidden = true;
          runBtn.disabled = true;
          attempts++;
          replies = [];
          if (chat) chat.clear();
          con.running();
            /* A DISABLED RUN MUST SAY WHY IT IS DISABLED, AND SAY IT BESIDE
               ITSELF. While the program is stopped on an input( ) the button is
               asleep on purpose, and the confused-pupil walk found exactly what
               that looks like from a pupil's chair: a button that will not act
               with nothing next to it saying what to do (DFM 42/205). The first
               attempt put the sentence in the verdict block, which on this card
               sits UNDER the console and the conversation -- four hundred
               pixels away, which is the "note two steps away" the rule is
               written against. It goes immediately after the button. */
            if (chat && cfg.waitingSay) PyRun.waitNote(runBtn, cfg.waitingSay);
          /* HER RUN IS HER RUN. The conversation happens live, with her own
             answers, in her own transcript. The VERDICT then comes from a second,
             silent pass under fixed probe answers, so what the checklist reports
             is the same every time she presses RUN and can never turn on a word
             she happened to type (rule 35's family: a fail state she could not
             diagnose is a trap). */
          liveRun = PyRun.start(code, {
            limitMs: Number(cfg.limitMs || 0) || undefined,
            /* AND A PROGRAM THAT ASKS WHERE THERE IS NOWHERE TO ANSWER MUST
               STOP, NOT HANG. With no chat on the card, `inputfun` used to be
               left undefined, so the runtime suspended on the pupil's first
               input( ) and never came back: the console sat on "running", RUN
               stayed disabled, and there was no box anywhere on the screen to
               type into. A dead screen with a dead button is the mute lock DFM
               42/205 exist to forbid, and it is the exact state a pupil reaches
               by writing the one line this year is about. It now abandons
               immediately, which settles the run, re-arms RUN, and puts a real
               sentence in the console. */
            inputfun: chat ? function (prompt) {
              return chat.ask(prompt, cfg.botWho || (cfg.chatLabels || {}).botWho, cfg.sendLabel)
                .then(function (v) { replies.push(v); return v; });
            } : function () { return Promise.reject(new Error('no-answer-here')); }
          });
          liveRun.p.then(function (res) {
            liveRun = null;
            PyRun.clearWaitNote(runBtn);
            if (chat) chat.closeAsk();
            con.show(res, cfg.errorWords || {});
            /* THE RUN DIED, SO NOTHING WAS MEASURED, SO NOTHING IS CLAIMED
               (S2b). The probe pass runs the SAME source and dies on the SAME
               line, so every probe would come back false and the checklist
               would print three failures over work that was fine. */
            if (!res.ok) { runStopped(res); return; }
            if (!feats.length) { settle(res, PyRun.matches(res.out, b.target || []), []); return; }
            PyRun.checkFeatures(code, feats, {
              answers: b.probeAnswers || cfg.probeAnswers || [],
              limitMs: Number(cfg.limitMs || 0) || undefined,
              seed: Number(b.seed == null ? 4 : b.seed)
            }).then(function (out) {
              var results = out.results;
              paintFeatures(results, true);
              var all = results.every(function (r) { return r.ok; });
              /* an OPTIONAL build never touches the bonus. It pays nothing, so
                 letting its own first run overwrite the count would mean doing
                 the extra one could LOWER what she earned — the exact unfairness
                 DFM 265 exists to stop. */
              if (attempts === 1 && !b.optional) featureFirst = results.filter(function (r) { return r.ok; }).length;
              settle(res, all, results);
            });
          });
        };

        /* A RUN THAT NEVER RAN IS NOT AN ATTEMPT AGAINST HER. `attempts` was
           already counted when RUN was pressed, and the bonus is paid on what
           was real "on the very first RUN" — so leaving the count up would mean
           a syntax error on press one silently cost her the whole bonus for
           every press after it (DFM 265's family: never a price she cannot see
           and did not choose). */
        function runStopped(res) {
          attempts = Math.max(0, attempts - 1);
          paintFeatures([], false, true);
          verdict.hidden = false;
          verdict.className = 'pyrun-verdict is-note';
          verdict.innerHTML = '<p>' + esc(b.runDiedSay || cfg.runDiedSay || PY_SAY.runDiedSay) + '</p>';
          runBtn.disabled = false;
        }

        function settle(res, ok, results) {
          verdict.hidden = false;
          verdict.className = 'pyrun-verdict ' + (ok ? 'is-matched' : 'is-notyet');
          var n = (results || []).filter(function (r) { return r.ok; }).length;
          var say = ok ? (b.matchedSay || cfg.matchedSay || PY_SAY.matchedSay)
                       : (b.notYetSay || cfg.notYetSay || PY_SAY.notYetSay);
          verdict.innerHTML = '<p class="pyrun-vtag">' +
            esc(ok ? (cfg.matchedLabel || 'MATCHED') : (cfg.notYetLabel || 'NOT YET')) + '</p>' +
            (feats.length ? '<p class="pyf-count">' + esc(String(n) + ' / ' + String(feats.length)) + '</p>' : '') +
            '<p class="pyrun-vsay">' + esc(say) + '</p>';
          if (!ok) { runBtn.disabled = false; return; }
          if (attempts === 1 && !feats.length) cleanFirst++;
          /* HER PROGRAM HAS TO SURVIVE THE SCREEN IT WAS WRITTEN ON. The Swap is
             three chunks later and needs the bot she built; the draft is where a
             lesson's in-progress work already lives, it is class- and
             lesson-scoped, and it survives a reload — which a variable in this
             closure would not. The 8,000-character draft ceiling is the
             server's, and it drops an oversized draft SILENTLY, so the write is
             refused here where it can be seen rather than there where it cannot
             (DFM 157a: a limit that lives in two places is a contract). */
          if (b.saveAs && ctx.saveDraft) {
            var keep = String(ed.value());
            if (keep.length <= 3000) {
              var d = ctx.draft || {};
              d[String(b.saveAs)] = keep;
              ctx.saveDraft(d);
            }
          }
          ed.lock();
          c.querySelectorAll('.pyp-chip').forEach(function (n2) { n2.disabled = true; });
          var last = (at + 1 >= builds.length);
          var go = el('<button class="primary-btn" type="button">' +
            esc(last ? (cfg.continueLabel || 'Continue') : (cfg.nextBuildLabel || 'Next step')) + '</button>');
          verdict.appendChild(go);
          App.armButton(go, function () {
            if (b.onDone && typeof cfg.onDoneHook === 'string') { /* reserved */ }
            at++; if (at < builds.length) startBuild(); else done();
          });
          /* ---- THE CARD SEND (spec §E1's `card-send`, inside `engine`) ----
             One more thing once the program really works, on the SAME screen
             rather than a new one, because she is looking at the very thing she
             is about to send. It travels through the channel that is still open
             from the Match, and her partner's card arrives with the flash.
             A pupil with no partner (solo, catch-up, pairing off) is told so
             plainly and loses nothing — the card is hers either way. */
          if (b.sendCard) drawCardSend(verdict, res, b);
        }
      }

        /* the Now Playing block, taken out of what her program really printed —
           never re-composed from her list, so the card she sends is the card she
           made (rule 35 on a thing that travels to another pupil) */
        function cardText(res, b) {
          var head = String((b.sendCard || {}).head || '').toLowerCase();
          var rows = PyRun.tidy(res.out).split('\n');
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].toLowerCase().indexOf(head) === -1) continue;
            var after = rows.slice(i + 1).filter(function (x) { return String(x).trim() !== ''; });
            return [rows[i]].concat(after.slice(0, Number((b.sendCard || {}).lines || 3))).join('\n');
          }
          return PyRun.tidy(res.out).split('\n').slice(0, 4).join('\n');
        }
        function drawCardSend(into, res, b) {
          var sc = b.sendCard || {};
          var text = cardText(res, b);
          var box = el('<div class="pye-cardsend" data-arrive-live>' +
            '<h3>' + esc(sc.title || '') + '</h3>' +
            '<pre class="pye-card">' + esc(text) + '</pre>' +
            '<p class="pye-cardsay">' + fmtBold(PairKit.st ? (sc.lead || '') : (sc.noPartnerSay || '')) + '</p>' +
            (PairKit.st ? '<button class="ghost-btn pye-send-card" type="button">' + esc(sc.sendLabel || '') + '</button>' : '') +
            '<div class="pye-theirs"></div></div>');
          into.appendChild(box);
          if (!PairKit.st) return;
          var theirs = box.querySelector('.pye-theirs');
          var btn = box.querySelector('.pye-send-card');
          var pollT = null;
          App.armButton(btn, function () {
            btn.disabled = true;
            btn.textContent = sc.sendingLabel || sc.sendLabel || '';
            PairKit.blob(ctx, 'put', 'card', text).then(function () {
              btn.textContent = sc.sentLabel || '';
              theirs.innerHTML = '<p class="pye-waiting">' + esc(sc.waitSay || '') + '</p>';
              (function tick() {
                PairKit.blob(ctx, 'get', 'card', PairKit.nextRound()).then(function (r) {
                  if (r && r.ok && Number(r.has) && String(r.v).trim()) {
                    theirs.innerHTML = '<h3>' + esc(sc.theirsTitle || '') + '</h3>' +
                      '<pre class="pye-card is-theirs">' + esc(String(r.v)) + '</pre>';
                    PairKit.arrive(theirs, { announce: sc.arrivedSay || '' });
                    return;
                  }
                  pollT = setTimeout(tick, 2500);
                });
              })();
            });
          });
        }


      /* ================= THE STAGED EDITOR — K41, his 27 Aug 2026 order ======
         His words, sitting the mybot card: "The interface needs a LOT of work
         and a COMPLETE DESIGN RETHINK - it is a complete mess and a child in J2
         is not going to have an earthly clue what they are supposed to do." …
         "Put yourself in the position of a J2 student. This is just a wall, a
         wall of too much information."
         WHAT WAS ON THAT WALL, all at once: title, intro, film, palette, editor,
         side checklist, starter, RUN, conversation, console and verdict — on the
         platform's ONE dark card, because `.pye-card` is the class the sent-card
         <pre> uses and the editor card wore it too. That collision is where the
         navy-on-navy title and the invisible verdict text came from: the card
         painted itself #16253F and `.pyrun-goal` kept `var(--ink)`, which is
         #17223B. One class, two worlds (DFM 207g), and nothing measured it.
         THE CODE PITCH IS APPROVED and is unchanged (K41a): two questions, two
         variables, a reply that uses both. What changes is the SHAPE.

         ONE JOB ON SCREEN AT A TIME (K41b):
           FACE 1, THE PLAN — what she is making, the film that shows it, and the
             three jobs in her own words, rendered FROM the build's feature list
             so the plan and the checklist can never say different things (DFM
             144). One button.
           FACE 2, THE BENCH — the same three jobs as a compact strip that fills
             in as she runs, the editor at FULL CARD WIDTH with soft wrap so a
             sixty-character question is not clipped sideways, the refusable
             starter, at most four job-named template lines, and RUN.
           THE CONVERSATION EXISTS ONLY WHEN A RUN FIRST ASKS, and the console
             only once a run has ended. Before that they are not empty panels
             waiting to be understood; they are not there.
           THE VERDICT — one row per job in the SAME words, a heading COMPUTED
             from the feature list (never authored — his "ALL FOUR" over 3/3),
             and "Next step".
         LIGHT GROUND, DARK PANELS ONLY FOR CODE (K41c): the editor and the
         console are dark because they are code surfaces; everything a pupil
         READS is ink on the light card.
         CONFIG-GATED on `staged`, and it is the only shape either L3 editor
         build uses. Nothing else on the platform uses editor mode at all. */
      function startEditorStaged() {
        var b = builds[at];
        var feats = b.features || [];
        var firstInsert = true;
        var keptCode = '';
        var state = {};                       /* feature id -> true once matched */
        var attempts = 0;
        var replies = [];
        var starterUsed = false;              /* the offer is a first-visit thing */

        /* ---- THE COUNT IS COMPUTED, NEVER AUTHORED (J5, his "ALL FOUR" over
           3/3). The engine picks the word; the WORDS are content, so they go
           through the language gate like every other sentence a pupil reads
           (DFM 192g). A lesson that forgets them gets the digit, which is true
           and plain — a fallback nothing is meant to reach. */
        function countWord(n) {
          var words = cfg.countWords || b.countWords;
          if (words && words[n]) return String(words[n]);
          return String(n);
        }
        function fill(s, doneN) {
          return String(s == null ? '' : s)
            .replace(/\{n\}/g, countWord(feats.length))
            .replace(/\{done\}/g, countWord(doneN == null ? 0 : doneN));
        }

        /* ---------------------------- FACE 1: THE PLAN --------------------- */
        function plan() {
          host.innerHTML = '';
          var film = cfg.introVideo
            ? '<div class="pye-plan-film"><video controls preload="metadata" playsinline src="' +
              esc(asset(cfg.introVideo)) + '"></video>' +
              (cfg.introVideoSay ? '<p class="pye-plan-say">' + esc(cfg.introVideoSay) + '</p>' : '') +
              '</div>'
            : '';
          var jobs = feats.map(function (f) {
            return '<li>' + esc(f.label || '') + '</li>';
          }).join('');
          var c = el('<div class="card pyrun-card pye-plan" data-build="' + esc(b.id || '') + '">' +
            '<span class="intro-kicker">' + esc(cfg.kicker || '') + '</span>' +
            '<h2>' + esc(cfg.title || '') + '</h2>' +
            (cfg.intro ? '<p class="intro-lead">' + fmtBold(cfg.intro) + '</p>' : '') +
            film +
            '<h3 class="pye-plan-h">' + esc(cfg.planLabel || b.planLabel || '') + '</h3>' +
            '<p class="pye-plan-goal">' + fmtBold(b.goalLine || '') + '</p>' +
            '<ol class="pye-plan-list">' + jobs + '</ol>' +
            (b.brief ? '<p class="pye-plan-brief">' + fmtBold(b.brief) + '</p>' : '') +
            '<button class="primary-btn pye-start" type="button">' +
            esc(cfg.startLabel || b.startLabel || 'Start writing') + '</button>' +
            '</div>');
          host.appendChild(c);
          App.armButton(c.querySelector('.pye-start'), function () { bench(); });
        }

        /* ---------------------------- FACE 2: THE BENCH -------------------- */
        function bench() {
          host.innerHTML = '';
          /* AT MOST FOUR TEMPLATE LINES, EACH NAMED BY THE JOB IT DOES (K41b).
             The shipped palette was six lines of raw Python with no job on them —
             a wall inside the wall. The cap is the engine's, so no future build
             can quietly grow one back. Served shuffled, because a tray in
             solution order is an answer sheet (DFM 258). */
          var pal = (b.palette || []).slice(0, 4);
          var palOrder = derangedOrder(pal.length);
          var paletteHtml = pal.length
            ? '<div class="pyp-palette"><h3>' + esc(b.paletteLabel || cfg.paletteLabel || '') + '</h3>' +
              '<p class="pyp-palette-lead">' + fmtBold(b.paletteLead || cfg.paletteLead || '') + '</p>' +
              '<div class="pyp-palette-list">' + palOrder.map(function (i) {
                var t = pal[i];
                return chipHtml(t, i);
              }).join('') + '</div></div>'
            : '';
          /* THE JOBS ARE NUMBERED HERE TOO. The plan face numbers them 1, 2, 3
             and the template lines are named "Job 1", "Job 3" — so a strip with
             no numbers on it would leave those labels pointing at something this
             screen never names (rule 13 / 138.1.3). */
          var jobs = feats.map(function (f, i) {
            return '<li class="pyf-item" data-f="' + esc(f.id) + '">' +
              '<span class="pyf-tag"><span class="pyf-num">' + (i + 1) + '</span>' +
              esc(b.pendingLabel || cfg.pendingLabel || 'not yet') + '</span>' +
              '<span class="pyf-say">' + esc(f.label || '') + '</span>' +
              '<span class="pyf-nudge" hidden></span></li>';
          }).join('');
          var c = el('<div class="card pyrun-card pye-bench" data-build="' + esc(b.id || '') + '">' +
            '<h2 class="pyrun-goal">' + fmtBold(b.goalLine || '') + '</h2>' +
            '<h3 class="pye-strip-h">' + esc(b.checklistLabel || cfg.checklistLabel || '') + '</h3>' +
            '<ol class="pyf-list pye-strip">' + jobs + '</ol>' +
            '<div class="pye-host"></div>' +
            (b.starter && b.starter.length && !starterUsed
              ? '<div class="pye-starter"><p class="pye-starter-say">' + fmtBold(b.starterSay || cfg.starterSay || '') + '</p>' +
                '<button class="ghost-btn pye-starter-btn" type="button">' +
                esc(b.starterLabel || cfg.starterLabel || '') + '</button></div>'
              : '') +
            paletteHtml +
            helpRowHtml(b) +
            '<button class="primary-btn pyrun-run" type="button">' + esc(cfg.runLabel || 'RUN my program') + '</button>' +
            '<div class="pyw-stage"></div>' +
            '<div class="pyrun-verdict" hidden></div>' +
            '</div>');
          host.appendChild(c);
          wireHelpRow(c, b);

          var ed = PyRun.editor(c.querySelector('.pye-host'),
            Object.assign({ softWrap: true }, b.editor || cfg.editor || {}));
          if (keptCode) ed.set(keptCode);
          var stage = c.querySelector('.pyw-stage');
          var runBtn = c.querySelector('.pyrun-run');
          var verdict = c.querySelector('.pyrun-verdict');
          /* NOT CREATED YET, AND THAT IS THE POINT (K41b). A conversation panel
             with nothing in it and a console saying "nothing has run yet" are two
             more things to understand before she has written a line. */
          var chat = null, con = null;
          function needConsole() {
            if (!con) con = PyRun.console(stage, cfg.consoleLabels || {});
            return con;
          }
          function needChat() {
            if (!chat) {
              chat = PyRun.chat(stage, cfg.chatLabels || {});
              /* THE CONVERSATION HAPPENED FIRST, SO IT READS FIRST. The console
                 is created the moment RUN is pressed and the conversation only
                 when the program first asks, so appending in creation order put
                 the ANSWER above the questions that produced it — a transcript
                 out of order is a screen that has to be decoded. */
              if (con && con.node && chat.node) stage.insertBefore(chat.node, con.node);
            }
            return chat;
          }
          PyRun.load().catch(function () { /* reported honestly at RUN */ });

          wireChips(c, ed, function (i) {
            var t = pal[Number(i)];
            if (!t) return;
            ed.insert(String(t.line || ''));
            if (firstInsert && (b.firstInsertSay || cfg.firstInsertSay)) {
              firstInsert = false;
              if (!c.querySelector('.pye-first-note')) {
                var note = el('<p class="pye-first-note">' + fmtBold(b.firstInsertSay || cfg.firstInsertSay) + '</p>');
                c.querySelector('.pyp-palette').insertAdjacentElement('afterend', note);
              }
            }
          });
          var sb = c.querySelector('.pye-starter-btn');
          if (sb) {
            sb.onclick = function () {
              ed.set((b.starter || []).join('\n'));
              starterUsed = true;
              var box = c.querySelector('.pye-starter');
              if (box) {
                box.innerHTML = '<p class="pye-starter-done">' +
                  fmtBold(b.starterDoneSay || cfg.starterDoneSay || '') + '</p>';
              }
              ed.focus();
            };
          }

          function paintJobs(results, ran, stopped) {
            feats.forEach(function (f) {
              var row = c.querySelector('.pyf-item[data-f="' + f.id + '"]');
              if (!row) return;
              var hit = (results || []).find(function (r) { return r.id === f.id; });
              var ok = !!(hit && hit.ok);
              if (ok) state[f.id] = true;
              row.className = 'pyf-item ' + (ok ? 'is-matched' : (stopped ? 'is-stopped' : (ran ? 'is-notyet' : '')));
              var num = row.querySelector('.pyf-num');
              row.querySelector('.pyf-tag').textContent = ok
                ? (b.doneLabel || cfg.doneLabel || 'done')
                : (stopped ? (b.notCheckedLabel || cfg.notCheckedLabel || PY_SAY.notCheckedLabel)
                   : (ran ? (b.notYetLabel || cfg.notYetLabel || 'NOT YET')
                          : (b.pendingLabel || cfg.pendingLabel || 'not yet')));
              if (num) row.querySelector('.pyf-tag').insertBefore(num, row.querySelector('.pyf-tag').firstChild);
              var nu = row.querySelector('.pyf-nudge');
              if (!ok && ran && !stopped && f.nudge) { nu.hidden = false; nu.textContent = f.nudge; }
              else { nu.hidden = true; nu.textContent = ''; }
            });
          }
          paintJobs([], false);

          runBtn.onclick = function () {
            var code = ed.value();
            if (!String(code).trim()) {
              verdict.hidden = false;
              verdict.className = 'pyrun-verdict is-note';
              verdict.innerHTML = '<p>' + esc(b.emptySay || cfg.emptySay || PY_SAY.blankEmptySay) + '</p>';
              ed.focus();
              return;
            }
            keptCode = code;
            verdict.hidden = true;
            runBtn.disabled = true;
            attempts++;
            replies = [];
            if (chat) chat.clear();
            needConsole().running();
            if (cfg.waitingSay) PyRun.waitNote(runBtn, cfg.waitingSay);
            liveRun = PyRun.start(code, {
              limitMs: Number(cfg.limitMs || 0) || undefined,
              /* the conversation ARRIVES with the first question, which is also
                 the first moment its label ("The conversation") means anything */
              inputfun: function (prompt) {
                return needChat().ask(prompt, cfg.botWho || (cfg.chatLabels || {}).botWho, cfg.sendLabel)
                  .then(function (v) { replies.push(v); return v; });
              }
            });
            liveRun.p.then(function (res) {
              liveRun = null;
              PyRun.clearWaitNote(runBtn);
              if (chat) chat.closeAsk();
              needConsole().show(res, cfg.errorWords || {});
              /* S2(b) — HIS "FIXES NOT RECOGNISED". This is the card he sat.
                 The run died on the spliced line, the probe pass died with it,
                 and the strip told him three jobs were NOT WORKING YET while
                 two of them were plainly done. Nothing is measured here, so
                 nothing is claimed; the console already says exactly what
                 Python said and one plain line under it says what to look at. */
              if (!res.ok) {
                attempts = Math.max(0, attempts - 1);
                paintJobs([], false, true);
                verdict.hidden = false;
                verdict.className = 'pyrun-verdict is-note';
                verdict.innerHTML = '<p>' + esc(b.runDiedSay || cfg.runDiedSay || PY_SAY.runDiedSay) + '</p>';
                runBtn.disabled = false;
                return;
              }
              if (!feats.length) { settleStaged(res, PyRun.matches(res.out, b.target || []), [], c, verdict, ed, runBtn); return; }
              /* HER RUN IS HER RUN; the VERDICT is a second, silent pass under
                 fixed probe answers, so what the jobs strip reports is the same
                 every time and can never turn on a word she happened to type. */
              PyRun.checkFeatures(code, feats, {
                answers: b.probeAnswers || cfg.probeAnswers || [],
                limitMs: Number(cfg.limitMs || 0) || undefined,
                seed: Number(b.seed == null ? 4 : b.seed)
              }).then(function (out) {
                var results = out.results;
                paintJobs(results, true);
                var all = results.every(function (r) { return r.ok; });
                if (attempts === 1 && !b.optional) featureFirst = results.filter(function (r) { return r.ok; }).length;
                settleStaged(res, all, results, c, verdict, ed, runBtn);
              });
            });
          };
        }

        function settleStaged(res, ok, results, c, verdict, ed, runBtn) {
          var n = (results || []).filter(function (r) { return r.ok; }).length;
          /* ---- THE HEADING IS COMPUTED FROM THE FEATURE LIST (J5) ----------
             His exhibit: "ALL FOUR" printed over a count of 3/3, at the exact
             moment of her success. The label was AUTHORED and the count was
             derived, so the two could disagree and one day did. Now only one of
             them is a fact and the other is made from it. */
          var head = ok
            ? fill(cfg.matchedAllLabel || b.matchedAllLabel || cfg.matchedLabel || 'MATCHED', n)
            : fill(cfg.notYetLabel || 'NOT YET', n);
          var say = ok ? (b.matchedSay || cfg.matchedSay || PY_SAY.matchedSay)
                       : (b.notYetSay || cfg.notYetSay || PY_SAY.notYetSay);
          /* ONE ROW PER JOB, IN THE SAME WORDS AS THE PLAN AND THE STRIP — she
             reads the same sentence in all three places (DFM 144). */
          var rows = (results || []).map(function (r) {
            var fi = -1;
            var f = (b.features || []).filter(function (x, i) {
              if (x.id === r.id) { fi = i; return true; } return false;
            })[0] || {};
            return '<li class="pyv-row ' + (r.ok ? 'is-matched' : 'is-notyet') + '">' +
              '<span class="pyv-tag"><span class="pyf-num">' + (fi + 1) + '</span>' +
              esc(r.ok ? (b.doneLabel || cfg.doneLabel || 'done')
                : (b.notYetLabel || cfg.notYetLabel || 'NOT YET')) + '</span>' +
              '<span class="pyv-say">' + esc(f.label || '') + '</span></li>';
          }).join('');
          verdict.hidden = false;
          verdict.className = 'pyrun-verdict ' + (ok ? 'is-matched' : 'is-notyet');
          verdict.innerHTML = '<p class="pyrun-vtag">' + esc(head) + '</p>' +
            (rows ? '<ol class="pyv-list">' + rows + '</ol>' : '') +
            '<p class="pyrun-vsay">' + esc(fill(say, n)) + '</p>';
          if (!ok) { runBtn.disabled = false; return; }
          if (attempts === 1 && !(b.features || []).length) cleanFirst++;
          /* the Swap reads this draft — unchanged from the shape he approved */
          if (b.saveAs && ctx.saveDraft) {
            var keep = String(ed.value());
            if (keep.length <= 3000) {
              var d = ctx.draft || {};
              d[String(b.saveAs)] = keep;
              ctx.saveDraft(d);
            }
          }
          ed.lock();
          c.querySelectorAll('.pyp-chip').forEach(function (n2) { n2.disabled = true; });
          var last = (at + 1 >= builds.length);
          var go = el('<button class="primary-btn" type="button">' +
            esc(last ? (cfg.continueLabel || 'Continue') : (cfg.nextBuildLabel || 'Next step')) + '</button>');
          verdict.appendChild(go);
          App.armButton(go, function () {
            at++; if (at < builds.length) startBuild(); else done();
          });
          if (b.sendCard) drawCardSend(verdict, res, b);
        }

        /* THE OFFER CARD IS THE PLAN FOR AN OPTIONAL EXTRA (DFM 265's shape):
           it has already said what the job is and let her refuse it, so a second
           plan face would be a screen for nothing. */
        if (b.optional) bench(); else plan();
      }

      function startBuild(accepted) {
        /* leaving a card while a program is waiting at input() must settle that
           program, never leave it suspended under the next screen (DFM 143/265c) */
        if (liveRun) { try { liveRun.abandon(); } catch (e) { /* already settled */ } liveRun = null; }
        if (builds[at] && builds[at].optional && !accepted) { offerExtra(); return; }
        var mode = String((builds[at] || {}).mode || cfg.mode || 'assemble');
        if (mode === 'worked') { startWorked(); return; }
        if (mode === 'editor') {
          /* K41's staged shape, config-gated per build; the wall shape is what
             the unstaged path still renders, and nothing on the platform is on
             it any more. */
          if (builds[at] && builds[at].staged) { startEditorStaged(); return; }
          startEditor(); return;
        }
        host.innerHTML = '';
        var isExtra = !!cfg.extrasMode;
        var b = builds[at];
        var lines = b.lines || [];
        var placed = [];                 // source indices, in her order
        var vals = {};                   // blank key -> typed value
        var attempts = 0;
        /* ---- THE TRAY SHUFFLE — DFM 258, HIS RULING, 25 Aug 2026 -----------
           His words, sitting j2-02's build: "the first four lines were the
           correct ones for me, in that exact order, the lines on the left
           should be shuffled and you should know this and apply this for ALL
           similar activities."
           He was right and it was worse than he saw: this tray had NO shuffle
           at all — it rendered `lines[]` in authored order — while the snap
           desk shuffles its Python column, marked-question options have
           shuffled by law since 22 July, and parsons is authored-scrambled with
           a permutation key. The tray was the one assembly surface on the
           platform with no protection, and every build in BOTH Lesson 2s
           authors its correct lines first, in program order, because that is
           how the source stays readable.
           THE GUARANTEE IS A DERANGEMENT, not merely "not the same order", and
           the difference matters. A plain reshuffle can legitimately leave the
           first four lines first and in order — rare, but a blocking gate that
           fails once in a few hundred runs is a gate people learn to re-run
           (DFM 146a). Requiring that NO line is served at its authored index
           makes the property deterministic: the solution can never be served
           first, in order, whatever the draw, so the harness can assert it
           every time rather than usually.
           Marking is output-based, so display order is free (spec §D); blanks
           are keyed by `bl.key` and never by position, so nothing a pupil types
           moves with the shuffle. */
        var trayOrder = derangedOrder(lines.length);

        /* no step strip in the extras zone: three jobs in a row would read as a
           sequence she has to finish, and the whole point is that she may do one,
           or none, and leave whenever the room is told to finish */
        var stepStrip = (!isExtra && builds.length > 1)
          ? '<div class="pyrun-steps">' + builds.map(function (x, i) {
              return '<span class="pyrun-step' + (i < at ? ' done' : (i === at ? ' now' : '')) + '">' +
                esc(x.tab || String(i + 1)) + '</span>';
            }).join('') + '</div>'
          : '';

        var c = el('<div class="card pyrun-card" data-build="' + esc(b.id || '') + '">' +
          stepStrip +
          '<h2 class="pyrun-goal">' + fmtBold(b.goalLine || '') + '</h2>' +
          /* ---- THE ACTION COMES FIRST, AND IT IS A REAL NUMBERED LIST -------
             His verdict on training build 3a, 27 Aug 2026: "VERY confusing". The
             card opened with a paragraph that described the two planted MISTAKES
             before it had said what she was being asked to DO — DFM 151's own
             fault ("the card must say what she is being asked to do, how she does
             it, and what the finished thing should be", in that order), with a
             sequence buried in prose, which DFM 171 renders one-per-line.
             So the ACTIONS are a numbered list at the top of the card, and the
             description of the mistakes follows them. A build that authors no
             `actions` renders exactly as it did (config-gated, control asserted). */
          ((b.actions && b.actions.length)
            ? '<ol class="pyrun-actions">' +
              b.actions.map(function (a) { return '<li>' + fmtBold(a) + '</li>'; }).join('') + '</ol>'
            : '') +
          (b.brief ? '<p class="pyrun-brief">' + fmtBold(b.brief) + '</p>' : '') +
          /* ---- THE TARGET BLOCK RENDERS ONLY WHEN IT HAS SOMETHING IN IT ----
             His find, 27 Aug 2026: "a wee white line" at the top of training
             build 3a, right where a reader's eye starts. This block was drawn on
             EVERY build — a lead paragraph and an expected-output <pre> — and a
             build that is checked by RUNNING authors neither, so an empty orange
             shell with a blank white strip in it shipped above the instruction
             (DFM 42/184's empty-element class).
             AN ABSENCE IS NOT AN ANSWER, so where the block goes the card now
             SAYS, in words a pupil reads, that there is nothing to copy and how
             the build is checked instead. The sentence is content-owned, so it
             goes through the language gate and carries a read-aloud record like
             every other pupil sentence (DFM 190d/192g).
             A build that DOES author a target renders byte-identically — the
             control asserts it, and eleven signed-off lessons depend on it. */
          ((b.target && b.target.length)
            ? '<div class="pyrun-target"><p class="pyrun-target-lead">' + esc(cfg.targetLead || '') + '</p>' +
              '<pre class="pyrun-target-out">' + esc(b.target.join('\n')) + '</pre></div>'
            : ((b.runCheckedSay || cfg.runCheckedSay)
              ? '<p class="pyrun-runcheck">' + fmtBold(b.runCheckedSay || cfg.runCheckedSay) + '</p>'
              : '')) +
          /* ---- S10: A FREE-WRITING CARD SHOWS WHAT FINISHED LOOKS LIKE -----
             His second sit, on the weekend job: "unreadable as a task". The
             card had no picture of success. A build with a TARGET shows the
             exact output it is aiming at; a build whose words are HERS can show
             no such thing — and the answer had been to show nothing, so she was
             left with three gap labels floating over a program and no idea what
             a finished run was supposed to look like.
             So a free-writing card carries ONE WAY IT COULD GO: a short worked
             exchange in the same shape as the conversation panel below it, and
             labelled, unmissably, as one way and not the way (DFM 210 — the
             finished answer never appears, and this is somebody else's bot
             talking about somebody else's weekend). Content-owned and
             config-gated: a build that names no `example` renders byte for byte
             as it does today, which is what keeps eleven signed-off lessons
             where they are. */
          ((b.example && b.example.lines && b.example.lines.length)
            ? '<div class="pyrun-example">' +
              '<p class="pyrun-example-lead">' + fmtBold(b.example.lead || '') + '</p>' +
              '<div class="pyrun-example-log">' + b.example.lines.map(function (ln) {
                var mine = String(ln.who || 'bot') === 'you';
                return '<div class="pyx-row is-' + (mine ? 'user' : 'bot') + '">' +
                  '<span class="pyx-who">' + esc(mine
                    ? ((cfg.chatLabels || {}).userWho || 'You')
                    : ((cfg.chatLabels || {}).botWho || 'The bot')) + '</span>' +
                  '<span class="pyx-text">' + esc(String(ln.text || '')) + '</span></div>';
              }).join('') + '</div>' +
              (b.example.after ? '<p class="pyrun-example-after">' + fmtBold(b.example.after) + '</p>' : '') +
              '</div>'
            : '') +
          '<p class="pyrun-how">' + fmtBold(cfg.howLine || '') + '</p>' +
          '<div class="pyrun-cols">' +
          '<div class="pyrun-tray"><h3>' + esc(cfg.trayLabel || 'The lines') + '</h3><div class="pyt-list"></div></div>' +
          '<div class="pyrun-prog"><h3>' + esc(cfg.progLabel || 'Your program') + '</h3><ol class="pyp-list"></ol></div>' +
          '</div>' +
          '<p class="case-locked-note pyrun-locked-note">' + esc(cfg.lockedNote || PY_SAY.lockedNote) + '</p>' +
          '<button class="primary-btn pyrun-run" type="button" disabled>' + esc(cfg.runLabel || 'RUN my program') + '</button>' +
          '<div class="pyrun-console-host"></div>' +
          '<div class="pyrun-verdict" hidden></div>' +
          /* DFM 265(c): THE WAY OUT IS ON EVERY SCREEN. Not on the hub only, and
             not revealed once the job is finished — a pupil told "time up" is half
             way through a tray, and that is exactly the screen the control has to
             be on. Both controls are live from the moment the card mounts; neither
             is ever disabled. */
          (isExtra ? '<div class="rung-actions pyrun-exit-row">' +
            '<button class="ghost-btn pyrun-back" type="button">' + esc(cfg.backLabel || 'Back') + '</button>' +
            '<button class="ghost-btn pyrun-finish" type="button">' + esc(finishLabel()) + '</button>' +
            '</div>'
            /* AND THE SAME LAW ON A REFUSABLE EXTRA BUILD (265c): the way out is
               on the card itself, live from the moment it mounts, so "nearly time
               up" is one press away from the badge rather than a half-done tray */
            : (b.optional ? '<div class="rung-actions pyrun-exit-row">' +
              '<button class="ghost-btn pyrun-stop" type="button">' + esc(b.stopLabel || cfg.stopLabel || '') + '</button>' +
              '</div>' : '')) +
          '</div>');
        host.appendChild(c);
        if (isExtra) {
          App.armButton(c.querySelector('.pyrun-back'), function () { hub(); });
          App.armButton(c.querySelector('.pyrun-finish'), function () { done(); });
        }
        if (b.optional) App.armButton(c.querySelector('.pyrun-stop'), function () { done(); });

        var tray = c.querySelector('.pyt-list');
        var prog = c.querySelector('.pyp-list');
        var trayZone = c.querySelector('.pyrun-tray'), progZone = c.querySelector('.pyrun-prog');
        var runBtn = c.querySelector('.pyrun-run');
        var lockedNote = c.querySelector('.pyrun-locked-note');
        var verdict = c.querySelector('.pyrun-verdict');
        /* A FADED CARD CAN ALSO BE A CONVERSATION (opt-in, so both Lesson 2s
           render byte-identically). The third rung of a worked -> assemble ->
           faded ladder about a chatbot has to actually ask a question, or the
           ladder stops teaching the thing it was built for one step from the
           top. Where a card holds a conversation, what counts as RIGHT is that
           the program ran clean and used what the person typed — an exact
           expected-output compare cannot be authored against words she supplies. */
        var chatB = b.chat ? PyRun.chat(c.querySelector('.pyrun-console-host'), cfg.chatLabels || {}) : null;
        var repliesB = [];
        var con = PyRun.console(c.querySelector('.pyrun-console-host'), cfg.consoleLabels || {});
        /* warm the runtime while she is still reading, so RUN is not the first
           thing that ever waits on a megabyte (DFM 42's family) */
        PyRun.load().catch(function () { /* reported honestly at RUN, not here */ });

        /* ---- code assembly, blanks substituted where she typed them ---- */
        function codeOf() {
          return placed.map(function (si) {
            var L = lines[si];
            var t = String(L.t || '');
            (L.blanks || []).forEach(function (bl) {
              t = t.replace(bl.slot || '____', String(vals[bl.key] == null ? '' : vals[bl.key]));
            });
            return t;
          }).join('\n');
        }
        function emptyBlank() {
          for (var i = 0; i < placed.length; i++) {
            var bls = lines[placed[i]].blanks || [];
            for (var k = 0; k < bls.length; k++) {
              var v = vals[bls[k].key];
              if (v == null || !String(v).trim()) return bls[k];
            }
          }
          return null;
        }

        /* ---- DFM 272's config gate ------------------------------------
           The DEFAULT is the shipped behaviour, so every lesson that does not
           name the field renders and behaves exactly as it did — which is what
           keeps the two signed-off Lesson 2s untouched until he says the word
           (DFM 221's report-never-fix rule, and the config-gate precedent that
           has kept every locked lesson byte-identical since DFM 176). j2-03 and
           j3-03 set it to false. */
        var clickEjects = cfg.trayClickEject !== false;
        var takeBackLabel = String(cfg.takeBackLabel || PY_SAY.takeBack);

        /* ---- pointer drag, with click as an equal citizen -------------- */
        /* ---- AND IT IS MEASURED ON HOW IT FEELS (his 27 Aug 2026 find) ----
           The shipped gesture read `getBoundingClientRect()` on both zones on
           EVERY pointermove and wrote the ghost's transform synchronously on
           every event. Each rect read forces the browser to lay the whole page
           out again, mid-gesture, and a mouse reporting at 240 Hz then asks for
           240 layouts and 240 style writes a second inside a 60 Hz frame. That
           is the jank, and his question "was the harness shite?" was fair: the
           old gate proved the drag WORKED and measured nothing about how it
           felt, so it could never have failed on this.
           NOTHING MOVES UNDER A DRAGGED GHOST, so every rect this gesture will
           ever need is read ONCE, when the gesture starts, and the drop index is
           computed from those cached midpoints for the rest of it. The ghost is
           written inside requestAnimationFrame — one write per frame, whatever
           the mouse's report rate. `qa-drag-smooth` counts both, on both
           engines, with the engine he sat as the failing control, and proves in
           the same run that the row still lands in exactly the same place. */
        var ghost = null, suppressClick = false;
        var geo = null, raf = 0, ptrX = 0, ptrY = 0, lastZone = '';
        function inRect(r, x, y) {
          return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        }
        /* every rect the gesture needs, read once, at the moment it starts */
        function snapGeometry() {
          var mids = [];
          Array.prototype.slice.call(prog.querySelectorAll('li:not(.pyp-empty)')).forEach(function (li) {
            var b = li.getBoundingClientRect();
            mids.push(b.top + b.height / 2);
          });
          return { prog: progZone.getBoundingClientRect(), tray: trayZone.getBoundingClientRect(), mids: mids };
        }
        function indexFromMids(mids, clientY) {
          for (var i = 0; i < mids.length; i++) if (clientY < mids[i]) return i;
          return mids.length;
        }
        /* the live read, kept for the paths that are NOT a drag (there is no
           cached geometry when nothing is being dragged) */
        function dropIndexAt(clientY) {
          var lis = Array.prototype.slice.call(prog.querySelectorAll('li:not(.pyp-empty)'));
          for (var i = 0; i < lis.length; i++) {
            var r = lis[i].getBoundingClientRect();
            if (clientY < r.top + r.height / 2) return i;
          }
          return lis.length;
        }
        /* a finished card takes every line out of service. A real <button> has
           `disabled`; a gap-carrying row is a div and has nothing of the kind, so
           it says so the way an announced control must (aria-disabled) and every
           handler asks before it acts. */
        function outOfService(node) {
          return !!(node.disabled || node.getAttribute('aria-disabled') === 'true');
        }
        function wire(node, si, isPlaced) {
          /* ENTER PLACES; SPACE NEVER DOES (DFM 267f). Only the gap-carrying rows
             need this: a real <button> already does the right thing natively, and
             adding a second Enter here would fire it twice. */
          if (node.tagName !== 'BUTTON') {
            node.addEventListener('keydown', function (e) {
              if (outOfService(node)) return;
              if (e.target && /input|textarea/i.test(e.target.tagName)) return;   /* she is typing */
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (isPlaced) take(si); else put(si, null);
            });
          } else if (!clickEjects && isPlaced) {
            /* A REAL <button> WHOSE CLICK NO LONGER REMOVES STILL HAS TO ANSWER
               ENTER (DFM 272's own wording: Enter is a deliberate act and it
               stays). `preventDefault` on the keydown cancels the button's own
               synthesised click, so the row is taken back exactly once. */
            node.addEventListener('keydown', function (e) {
              if (outOfService(node)) return;
              if (e.target && /input|textarea/i.test(e.target.tagName)) return;
              if (e.key !== 'Enter') return;
              e.preventDefault();
              take(si);
            });
          }
          node.addEventListener('pointerdown', function (e) {
            /* a press on a typing blank is TYPING, never a drag */
            if (e.target && /input/i.test(e.target.tagName)) return;
            if (outOfService(node)) return;
            if (e.button != null && e.button !== 0) return;
            var sx = e.clientX, sy = e.clientY, moved = false;
            try { node.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            /* ONE WRITE PER FRAME, and the zone highlight only when the zone
               actually changes — a class written on every event is a style
               invalidation on every event, for a screen that already looks
               exactly like that. */
            function paint() {
              raf = 0;
              if (!ghost || !geo) return;
              ghost.style.transform = 'translate(' + (ptrX + Number(ghost.dataset.dx)) + 'px,' +
                (ptrY + Number(ghost.dataset.dy)) + 'px)';
              var zone = inRect(geo.prog, ptrX, ptrY) ? 'prog'
                : (inRect(geo.tray, ptrX, ptrY) ? 'tray' : '');
              if (zone === lastZone) return;
              lastZone = zone;
              progZone.classList.toggle('drop-here', zone === 'prog');
              trayZone.classList.toggle('drop-back', zone === 'tray');
            }
            function onMove(ev) {
              if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 6) return;
              if (!moved) {
                moved = true;
                node.classList.add('dragging');
                var r = node.getBoundingClientRect();
                ghost = node.cloneNode(true);
                ghost.className = 'pyrun-line pyrun-ghost';
                ghost.style.width = r.width + 'px';
                ghost.dataset.dx = String(r.left - ev.clientX);
                ghost.dataset.dy = String(r.top - ev.clientY);
                document.body.appendChild(ghost);
                /* `.dragging` only changes opacity, so nothing has moved and
                   these rects are the same ones a live read would return */
                geo = snapGeometry();
                lastZone = '';
              }
              ptrX = ev.clientX; ptrY = ev.clientY;
              if (!raf) raf = requestAnimationFrame(paint);
            }
            function onUp(ev) {
              node.removeEventListener('pointermove', onMove);
              node.removeEventListener('pointerup', onUp);
              node.removeEventListener('pointercancel', onUp);
              try { node.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
              if (raf) { cancelAnimationFrame(raf); raf = 0; }
              if (ghost) { ghost.remove(); ghost = null; }
              node.classList.remove('dragging');
              progZone.classList.remove('drop-here'); trayZone.classList.remove('drop-back');
              lastZone = '';
              var g = geo; geo = null;
              if (!moved) return;
              suppressClick = true;
              if (inRect(g && g.tray, ev.clientX, ev.clientY)) take(si);
              else if (inRect(g && g.prog, ev.clientX, ev.clientY)) {
                put(si, g ? indexFromMids(g.mids, ev.clientY) : dropIndexAt(ev.clientY));
              }
            }
            node.addEventListener('pointermove', onMove);
            node.addEventListener('pointerup', onUp);
            node.addEventListener('pointercancel', onUp);
          });
          node.addEventListener('click', function (e) {
            if (e.target && /input/i.test(e.target.tagName)) return;
            if (outOfService(node)) return;
            if (suppressClick) { suppressClick = false; return; }
            /* ---- A SINGLE CLICK NEVER DESTROYS PLACED WORK — DFM 272 -------
               His find, 27 Aug 2026, on training build 3b: "the third line was
               put back over to the left". He was typing into the gaps on the
               lines around it; one stray click on a placed line's BODY threw it
               back to the tray, silently, and the run then failed with an
               honest error about a box name he had never mistyped. Placing and
               removing were the same gesture, so the gesture that builds was
               the gesture that unbuilds.
               Removal is now a deliberate act: drag it back to the tray, press
               Enter on it, or press its own labelled control. The body click
               does nothing at all. */
            if (isPlaced && !clickEjects) return;
            if (isPlaced) take(si); else put(si, null);
          });
        }
        function put(si, at2) {
          var i = placed.indexOf(si);
          if (i !== -1) placed.splice(i, 1);
          if (at2 == null || at2 > placed.length) at2 = placed.length;
          placed.splice(at2, 0, si);
          render();
        }
        function take(si) {
          var i = placed.indexOf(si);
          if (i !== -1) { placed.splice(i, 1); render(); }
        }

        function lineHtml(L, cls, si) {
          var t = esc(String(L.t || ''));
          (L.blanks || []).forEach(function (bl) {
            var slot = esc(bl.slot || '____');
            t = t.replace(slot, '<input class="pyrun-blank" type="text" spellcheck="false" autocomplete="off" ' +
              'data-key="' + esc(bl.key) + '" size="' + (Number(bl.size) || 8) + '" maxlength="' + (Number(bl.max) || 24) + '" ' +
              'aria-label="' + esc(bl.label || 'type here') + '" placeholder="' + esc(bl.ph || '') + '">');
          });
          /* THE ONE SENTENCE THAT SAYS WHAT TO TYPE WAS INVISIBLE (j3-02 cold read, 19 Aug
             2026). `bl.label` reached the input's `aria-label` and nowhere else, so a sighted
             pupil with a mouse saw the placeholder and nothing more — "type it" for the
             theatre name, and a bare "0" for BOTH of build 4's numbers with nothing saying
             which was the price and which the seats. Four sentences written to the standard
             and then hidden. They now render as a caption on the line that owns the gap, and
             the aria-label stays exactly as it was for a screen reader. */
          var hints = (L.blanks || []).map(function (bl) { return bl.label; }).filter(Boolean);
          var hint = hints.length
            ? '<span class="pyrun-blank-hint">' + esc(hints.join(' · ')) + '</span>' : '';

          /* ---- THE SPACE BAR BELONGS TO TYPING — DFM 267(f), his find, 26 Aug 2026
             He typed THE HARBOUR LIGHT into build 3's gap and the whole line threw
             itself between The lines and Your program, twice — once per space.
             THE CAUSE WAS THIS TAG. A line rendered as a `<button>`, and a typed
             blank's `<input>` sat nested inside it: interactive content inside
             interactive content, which HTML's own content model forbids. A button
             owns the space bar, so Space activated the ANCESTOR, and the click it
             synthesises carries the button as `e.target` — so the guard four
             functions below ("a press on a typing blank is TYPING, never a drag"),
             which reads `e.target`, could never see the input at all. The guard was
             correct and unreachable.
             THE LAW IT WRITES: no interactive input is ever nested inside an
             interactive control. So a line that CARRIES A GAP is not a button: it is
             a row that is tabbable, announced as a button, and placed by Enter —
             while Space is left to the only thing a pupil could possibly mean by it
             while her caret is in a box. A line with NO gap stays a real `<button>`,
             because native keyboard behaviour is exactly right for those and there
             is nothing to protect. `qa-nested-interactive` audits the rendered DOM of
             every assembly card of every lesson (a grep cannot see this: the nesting
             happens at render) and types his own sentence with real key presses. */
          if ((L.blanks || []).length) {
            var say = String(L.t || '').replace(/\s+/g, ' ').trim();
            return '<div class="pyrun-line has-blank ' + cls + '" role="button" tabindex="0" ' +
              'draggable="false" data-si="' + si + '" ' +
              'aria-label="' + esc(say + ' — press Enter to move this line') + '">' +
              '<code>' + t + '</code>' + hint + '</div>';
          }
          return '<button class="pyrun-line ' + cls + '" type="button" draggable="false" data-si="' + si + '"><code>' + t + '</code>' + hint + '</button>';
        }
        function wireBlanks(root) {
          root.querySelectorAll('.pyrun-blank').forEach(function (inp) {
            var k = inp.getAttribute('data-key');
            if (vals[k] != null) inp.value = vals[k];
            inp.addEventListener('input', function () { vals[k] = inp.value; arm(); });
            inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') ev.preventDefault(); });
          });
        }
        function arm() {
          var enough = placed.length > 0;
          runBtn.disabled = !enough;
          lockedNote.hidden = enough;
        }
        function render() {
          tray.innerHTML = ''; prog.innerHTML = '';
          /* the tray is drawn in the SERVED order (DFM 258), not the authored
             one; `si` stays the authored index everywhere else, so placement,
             blanks and the assembled code are untouched by it */
          trayOrder.forEach(function (si) {
            var L = lines[si];
            if (!L || placed.indexOf(si) !== -1) return;
            var n = el(lineHtml(L, 'in-tray', si));
            wire(n, si, false); wireBlanks(n);
            tray.appendChild(n);
          });
          if (!tray.children.length) tray.appendChild(el('<p class="pt-empty">' + esc(cfg.trayEmpty || PY_SAY.trayEmpty) + '</p>'));
          placed.forEach(function (si, i) {
            var li = el('<li><span class="pyp-num">' + (i + 1) + '.</span>' + lineHtml(lines[si], 'placed', si) + '</li>');
            /* BY CLASS, never "the first button in the li" — a gap-carrying row is
               not a <button> any more (DFM 267f), and the same habit is what killed
               "Start climbing" and then "Run the inspection again" (DFM 143a). */
            wire(li.querySelector('.pyrun-line'), si, true); wireBlanks(li);
            /* THE LABELLED WAY BACK (DFM 272). It is a SIBLING of the row, never
               a child of it: the row is a real <button> where it has no gap, and
               a control inside a control is the fault 267(f) closed. It says what
               it removes — the label plus the row's own line — so it is announced
               rather than decoded (DFM 149's family). */
            if (!clickEjects) {
              var say = String(lines[si].t || '').replace(/\s+/g, ' ').trim();
              var tb = el('<button class="ghost-btn take-back" type="button" aria-label="' +
                esc(takeBackLabel + ': ' + say) + '">' + esc(takeBackLabel) + '</button>');
              tb.addEventListener('click', function (e) {
                e.stopPropagation();
                if (outOfService(li.querySelector('.pyrun-line'))) return;
                take(si);
              });
              li.appendChild(tb);
            }
            prog.appendChild(li);
          });
          if (!placed.length) prog.appendChild(el('<li class="pyp-empty">' + esc(cfg.progEmpty || PY_SAY.progEmpty) + '</li>'));
          arm();
        }
        render();

        runBtn.onclick = function () {
          /* THE BLANK REFUSAL EXPLAINS ITSELF (spec §D's landmark, DFM 205's
             law): an empty box never fails silently and never fails mutely. */
          var miss = emptyBlank();
          if (miss) {
            verdict.hidden = false;
            verdict.className = 'pyrun-verdict is-note';
            verdict.innerHTML = '<p>' + esc(cfg.blankEmptySay || PY_SAY.blankEmptySay) + '</p>';
            var inp = c.querySelector('.pyrun-blank[data-key="' + miss.key + '"]');
            if (inp) { inp.classList.add('wants'); inp.focus(); }
            return;
          }
          verdict.hidden = true;
          runBtn.disabled = true;
          repliesB = [];
          if (chatB) chatB.clear();
          con.running();
          /* the assemble card owns a conversation too, and it was the one the
             confused walk was actually standing on when it reported a sleeping
             RUN with nothing beside it */
          if (chatB && cfg.waitingSay) PyRun.waitNote(runBtn, cfg.waitingSay);
          attempts++;
          liveRun = PyRun.start(codeOf(), {
            limitMs: Number(cfg.limitMs || 0) || undefined,
            inputfun: chatB ? function (prompt) {
              return chatB.ask(prompt, cfg.botWho || (cfg.chatLabels || {}).botWho, cfg.sendLabel)
                .then(function (v) { repliesB.push(v); return v; });
            } : undefined
          });
          liveRun.p.then(function (res) {
            liveRun = null;
            PyRun.clearWaitNote(runBtn);
            if (chatB) chatB.closeAsk();
            con.show(res, cfg.errorWords || {});
            var kindB = String((b.check && b.check.kind) || (b.target ? 'target' : 'target'));
            var ok;
            if (kindB === 'clean') {
              ok = res.ok && (!(b.check && b.check.usesReplies) ||
                (repliesB.length > 0 && repliesB.every(function (r) { return String(res.out || '').indexOf(r) !== -1; })));
            } else ok = res.ok && PyRun.matches(res.out, b.target || []);
            verdict.hidden = false;
            verdict.className = 'pyrun-verdict ' + (ok ? 'is-matched' : 'is-notyet');
            verdict.innerHTML = '<p class="pyrun-vtag">' +
              esc(ok ? (cfg.matchedLabel || 'MATCHED') : (cfg.notYetLabel || 'NOT YET')) + '</p>' +
              '<p class="pyrun-vsay">' + esc(ok ? (b.matchedSay || cfg.matchedSay || PY_SAY.matchedSay) : (cfg.notYetSay || PY_SAY.notYetSay)) + '</p>';
            if (ok) {
              /* the extras zone counts nothing: no first-try score, no bonus, no
                 record (DFM 265a). The tick a finished job earns is on the hub, for
                 this sitting only, and it dies with the page. */
              if (attempts === 1 && !isExtra && !b.optional) cleanFirst++;
              c.querySelectorAll('.pyrun-line').forEach(function (n) {
                n.disabled = true;                       /* a real <button> */
                if (n.tagName !== 'BUTTON') {            /* a gap-carrying row (267f) */
                  n.setAttribute('aria-disabled', 'true');
                  n.removeAttribute('tabindex');
                }
              });
              c.querySelectorAll('.pyrun-blank').forEach(function (n) { n.disabled = true; });
              if (isExtra) {
                doneJobs[b.id] = true;
                /* ONE back control, not two. The ghost that has been sitting in the
                   exit row all along is PROMOTED to the primary action rather than a
                   second button being added beside it — she has just finished the
                   job, so going back to the list is the obvious next move, and a
                   success screen carrying two identical buttons is clutter. The
                   "Finish the lesson" ghost is untouched: both ways out stay live.
                   The handler is not re-armed and does not need to be: it was armed
                   BY CLASS at mount (DFM 143a — never "the first button in the
                   card", the fault that killed "Start climbing" and then "Run the
                   inspection again"), and only the class that styles it changes. */
                var back = c.querySelector('.pyrun-back');
                if (back) back.className = 'primary-btn pyrun-back';
                return;
              }
              var lastCore = (at + 1 >= builds.length);
              var moreLabel = lastCore ? (cfg.continueLabel || 'Continue')
                                       : (cfg.nextBuildLabel || 'Next build');
              var go = el('<button class="primary-btn" type="button">' + esc(moreLabel) + '</button>');
              verdict.appendChild(go);
              App.armButton(go, function () {
                at++;
                if (at < builds.length) startBuild();
                else done();
              });
            } else {
              runBtn.disabled = false;
            }
          });
        };
      }
    }
  };

  /* ================= chatswap — "The Chatbot Swap" (j2-03, spec §C3) =======
     K37 named it. The design decision it rests on is recorded in DFM's K37 row
     and worth restating where the code is: the bot's PROGRAM travels once and
     runs LOCALLY on the tester's machine, rather than every message being
     relayed through a channel that polls twice a second in each direction. A
     relayed conversation lands about four seconds after you type, which nobody
     would call a conversation; a local one answers instantly, and the builder
     watches the beats arrive at the channel's own cadence — which is exactly
     what a channel is good at.

     EACH TESTS ONCE AND EACH IS TESTED ONCE, and the shape of that differs by
     size, which is not an inconsistency: a PAIR takes two rounds (you test
     mine, then I test yours), a TRIO takes one (A tests B, B tests C, C tests
     A, all at the same moment). The invariant is the same either way.

     A BOT BREAKING IS THE MECHANIC WORKING. The tester sees the real error in
     the transcript, the report captures it, and the builder loses nothing for
     it — the swap pays FLAT, on phases done, never on how well the bot behaved.
     Nothing here is marked. */
  Engines.chatswap = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var W = cfg.words || {};
      var mode = null, side = null, sideAt = 0;
      var phases = 0;                 /* what the detail key records */
      var myCode = String((ctx.draft && ctx.draft.l3bot) || cfg.fallbackBot || '');
      var partnerReport = null;
      var reportSent = false;
      var pollT = null, liveRun = null;
      var sealed = false;

      introCard(host, {
        kicker: cfg.kicker, title: cfg.title, text: cfg.intro || '',
        steps: cfg.steps, stepsClass: 'swap-intro-steps'
      }, cfg.beginLabel || 'Open the door', gate);

      function stopSide(why) { if (side) { side.leave(why || 'matched'); side = null; } }
      /* an immediate removal with no exit line, for when the whole card is
         going anyway (DFM 275) */
      function dropSide() { if (side) { side.stop(); side = null; } }
      function clearAll() {
        if (pollT) { clearTimeout(pollT); pollT = null; }
        if (liveRun) { try { liveRun.abandon(); } catch (e) { /* settled */ } liveRun = null; }
      }
      function finish(earned) {
        clearAll(); stopSide('left'); PairKit.stop();
        finishChunk(ctx, (chunk.id || 'chatswap') + '=' + phases + '/' + Number(cfg.phaseCount || 4), 0, earned);
      }
      /* the same law as the Match's: the way out works from every screen, it
         says how far she has got before she commits to leaving, and a Swap she
         did not do does not pay for a Swap she did */
      function leave() {
        var all = Number(cfg.phaseCount || 4);
        if (phases >= all) { finish(true); return; }
        App.confirm(cfg.leaveTitle || '', String(cfg.leaveAsk || '')
          .replace('{done}', String(phases)).replace('{all}', String(all)),
          cfg.leaveYes || '', function (yes) { if (yes) finish(false); });
      }
      function finishRow(extra) {
        /* DFM 265(c) applied to a paired activity: the way out is on EVERY
           screen she can reach, live from the moment it mounts, never revealed
           only once something is finished. Leaving forfeits the swap and
           nothing else, and the sentence says so. */
        return '<div class="rung-actions swap-exit-row">' + (extra || '') +
          '<button class="ghost-btn swap-finish" type="button">' + esc(cfg.finishLabel || '') + '</button></div>';
      }
      function wireFinish(root) {
        var b = root.querySelector('.swap-finish');
        if (b) App.armButton(b, function () { leave(); });
      }

      function gate() {
        host.innerHTML = '';
        PairKit.ensure(ctx, host, onMode, W, {
          /* THE SIDE SHOW APPEARS AT A GENUINE WAIT AND NOWHERE ELSE (K36b).
             Eight seconds is the threshold: shorter and he would flicker in and
             out of a wait that was never long enough to be awkward, which is
             the opposite of the point. */
          onWaiting: function (slot, waitedMs) {
            if (!slot || side || waitedMs < Number(cfg.sideAfterMs == null ? 8000 : cfg.sideAfterMs)) return;
            sideAt = Date.now();
            side = SideShow.mount(slot, cfg.sideShow || {});
          },
          onWaitOver: function (why) { stopSide(why); }
        });
      }

      function onMode(m) {
        mode = m;
        if (m === 'left') { finish(false); return; }
        if (m === 'paired') { publish(); return; }
        /* S12: she stopped waiting and asked to test her own bot. It goes
           through the SOLO SEAT rather than straight into the test, because a
           mode that changes the rules announces itself (DFM 146e) — the card
           says what is happening before it happens, in the lesson's words. */
        if (m === 'own') { soloSeat(cfg.ownBotSay || ''); return; }
        soloSeat();
      }

      /* ---- phase 2: the handoff. One put, one get, no protocol. ---------- */
      function publish() {
        host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>' +
          esc(cfg.handingSay || '') + '</span></div>';
        PairKit.blob(ctx, 'put', 'bot', myCode).then(function (r) {
          if (r && r.ok) { phases = Math.max(phases, 1); rounds(); return; }
          /* honest, and never a dead end: a refused handoff leaves her testing
             her own bot rather than sitting on an error she cannot act on */
          soloSeat(cfg.handoffFailSay || '');
        });
      }

      /* Who tests whom, this round. A pair swaps; a trio goes round once. */
      function plan() {
        var st = PairKit.st;
        var n = st ? st.members.length : 0;
        if (n === 3) return [{ tester: Number(st.mi), builder: PairKit.nextRound() }];
        if (n === 2) {
          var other = PairKit.nextRound();
          return [{ tester: 0, builder: 1 }, { tester: 1, builder: 0 }].map(function (r) {
            return { tester: r.tester, builder: r.builder, other: other };
          });
        }
        return [];
      }
      var roundIdx = 0;
      function rounds() {
        var rs = plan();
        if (!rs.length) { soloSeat(); return; }
        if (roundIdx >= rs.length) { seal(); return; }
        var r = rs[roundIdx];
        var me = Number(PairKit.st.mi);
        if (Number(r.tester) === me) testerSeat(Number(r.builder));
        else builderSeat(Number(r.tester));
      }
      function nextRound() { roundIdx++; rounds(); }

      /* ---- phase 3: the tester's seat ----------------------------------- */
      function testerSeat(builderMi, soloCode) {
        clearAll();
        /* DFM 275's other half: she is about to WORK, so the side show ends
           here. `stop()` rather than `leave()` — the card is torn down in the
           next line, so an exit line would be written into a box nobody ever
           sees, and a handle left pointing at a removed node is how a side show
           fails to mount the next time one is wanted. */
        dropSide();
        host.innerHTML = '';
        var solo = soloCode != null;
        var code = solo ? soloCode : null;
        var c = el('<div class="card swap-card swap-test">' +
          '<span class="intro-kicker">' + esc(cfg.testKicker || '') + '</span>' +
          '<h2>' + esc(solo ? (cfg.soloTestTitle || '') : (cfg.testTitle || '')) + '</h2>' +
          '<p class="intro-lead">' + fmtBold(solo ? (cfg.soloTestLead || '') : (cfg.testLead || '')) + '</p>' +
          '<div class="swap-stage"></div>' +
          '<div class="swap-report" hidden></div>' +
          finishRow('<button class="ghost-btn swap-report-btn" type="button">' +
            esc(cfg.reportLabel || '') + '</button>') +
          '</div>');
        host.appendChild(c);
        wireFinish(c);
        var stage = c.querySelector('.swap-stage');
        var chat = PyRun.chat(stage, cfg.chatLabels || {});
        var con = PyRun.console(stage, cfg.consoleLabels || {});
        var reportBtn = c.querySelector('.swap-report-btn');
        reportBtn.disabled = true;

        function start(src) {
          chat.clear();
          con.running();
          /* ---- S6a: A PRINTED LINE IS RELAYED WHEN IT IS PRINTED -----------
             The shipped engine relayed every question as it was asked and every
             reply as it was typed, but split the WHOLE console output at the end
             of the run and sent it as one burst. So the builder's feed always
             read: both questions, both replies, then every printed sentence in a
             clump — and conversation order was structurally impossible for any
             bot that prints between questions, which is every bot this lesson
             teaches. Skulpt calls `output` per write, so the fragments are held
             until a newline and relayed a whole line at a time: what she reads
             on her own screen is what her partner reads on theirs. */
          var outBuf = '';
          liveRun = PyRun.start(src, {
            limitMs: Number(cfg.limitMs || 0) || undefined,
            onOut: function (chunk) {
              outBuf += String(chunk == null ? '' : chunk);
              var i;
              while ((i = outBuf.indexOf('\n')) !== -1) {
                var line = outBuf.slice(0, i);
                outBuf = outBuf.slice(i + 1);
                if (line.trim()) relay('bot', line);
              }
            },
            inputfun: function (prompt) {
              relay('bot', prompt);
              return chat.ask(prompt, cfg.botWho || (cfg.chatLabels || {}).botWho, cfg.sendLabel)
                .then(function (v) { relay('you', v); return v; });
            }
          });
          liveRun.p.then(function (res) {
            liveRun = null;
            chat.closeAsk();
            con.show(res, cfg.errorWords || {});
            /* a last line with no newline after it is still a line she read */
            if (outBuf.trim()) { relay('bot', outBuf); }
            outBuf = '';
            /* a bot that fell over is a FINDING, not a failure: the report is
               armed either way, and the card says so */
            reportBtn.disabled = false;
            phases = Math.max(phases, 2);
            var note = el('<p class="swap-done-say">' + fmtBold(res.ok ? (cfg.testDoneSay || '') : (cfg.testBrokeSay || '')) + '</p>');
            stage.appendChild(note);
          });
        }
        function relay(who, text) {
          if (solo || !PairKit.st) return;
          var t = String(text).slice(0, 100);
          /* THROUGH THE QUEUE, NEVER STRAIGHT AT THE CHANNEL. The server allows
             one message per member per second and refuses the rest silently;
             the queue holds one in flight, waits the limit out and retries, so
             the beats arrive in the order they happened and none is lost. */
          return PairKit.relay(ctx, 'msg',
            (who === 'bot' ? (cfg.relayBot || 'bot') : (cfg.relayYou || 'tester')) + ': ' + t);
        }

        if (solo) { start(code); }
        else {
          stage.insertAdjacentHTML('afterbegin',
            '<div class="panel-loading"><span class="panel-spinner"></span><span>' +
            esc(cfg.fetchingSay || '') + '</span></div>');
          waitForBot(builderMi, function (src) {
            var l = stage.querySelector('.panel-loading');
            if (l) l.remove();
            start(src);
          });
        }

        App.armButton(reportBtn, function () { reportForm(c, builderMi, solo); });
      }

      /* The partner may still be finishing her bot: poll until it arrives, and
         say so honestly while it does. NEVER-STRAND (spec §C3): after the held
         timeout the screen offers the solo seat or Finish — nothing owed is lost. */
      function waitForBot(builderMi, cb) {
        var began = Date.now();
        var hold = Number(cfg.holdMs == null ? 90000 : cfg.holdMs);
        (function tick() {
          PairKit.blob(ctx, 'get', 'bot', builderMi).then(function (r) {
            if (r && r.ok && Number(r.has) && String(r.v).trim()) { cb(String(r.v)); return; }
            if (Date.now() - began > hold) { stranded(); return; }
            pollT = setTimeout(tick, 2500);
          });
        })();
      }
      function stranded() {
        clearAll();
        host.innerHTML = '';
        var c = el('<div class="card swap-card swap-stranded">' +
          '<h2>' + esc(cfg.strandedTitle || '') + '</h2>' +
          '<p class="intro-lead">' + fmtBold(cfg.strandedSay || '') + '</p>' +
          finishRow('<button class="primary-btn swap-solo-btn" type="button">' +
            esc(cfg.strandedSoloLabel || '') + '</button>') + '</div>');
        host.appendChild(c);
        wireFinish(c);
        App.armButton(c.querySelector('.swap-solo-btn'), function () { testerSeat(-1, myCode); });
      }

      /* ---- the report: two short fields, honesty floors only ------------- */
      function reportForm(card, builderMi, solo) {
        var box = card.querySelector('.swap-report');
        box.hidden = false;
        box.innerHTML =
          '<h3>' + esc(cfg.reportTitle || '') + '</h3>' +
          '<p class="swap-report-lead">' + fmtBold(cfg.reportLead || '') + '</p>' +
          '<label class="swap-lab" for="swap-worked">' + esc(cfg.workedLabel || '') + '</label>' +
          '<input id="swap-worked" class="swap-field" type="text" maxlength="100" autocomplete="off">' +
          '<label class="swap-lab" for="swap-fix">' + esc(cfg.fixLabel || '') + '</label>' +
          '<input id="swap-fix" class="swap-field" type="text" maxlength="100" autocomplete="off">' +
          '<p class="swap-report-note">' + fmtBold(cfg.reportNote || '') + '</p>' +
          '<button class="primary-btn swap-send-report" type="button">' + esc(cfg.sendReportLabel || '') + '</button>' +
          /* ---- V62/B1: SOMETHING HAPPENS WHEN SHE PRESSES SEND -----------
             His words: "there should be a pulsing message to indicate that it
             is being sent, just to show the pupil that something is
             happening." Until now the press went straight into
             `PairKit.blob(put)` and then the paced channel queue with nothing
             on screen at all — and V61 made that gap LONGER, not shorter,
             because the report now waits its turn behind any beats still going
             out. A pupil who sees nothing move presses again.
             It is `aria-live="polite"`, so the sentence is spoken as well as
             pulsed; the pulse is decoration and is hidden from the reader that
             cannot see it. */
          '<p class="swap-sending" hidden aria-live="polite">' +
            '<span class="swap-sending-pulse" aria-hidden="true"></span>' +
            '<span class="swap-sending-text"></span></p>' +
          '<p class="swap-report-say" hidden></p>';
        var w = box.querySelector('#swap-worked'), f = box.querySelector('#swap-fix');
        var say = box.querySelector('.swap-report-say');
        var sending = box.querySelector('.swap-sending');
        var sendingText = box.querySelector('.swap-sending-text');
        var sendBtn = box.querySelector('.swap-send-report');
        function showSending(on) {
          sending.hidden = !on;
          if (on) sendingText.textContent = cfg.sendingSay || '';
          sendBtn.disabled = !!on;
          if (on) sendBtn.setAttribute('aria-busy', 'true');
          else sendBtn.removeAttribute('aria-busy');
        }
        App.armButton(sendBtn, function () {
          /* HONESTY FLOORS ONLY (DFM 193a). The machine never judges a pupil's
             own words for vocabulary or quality — it asks only that she wrote
             something. Judging what she wrote is the teacher's job at the desk. */
          var a = String(w.value || '').trim(), b = String(f.value || '').trim();
          if (a.length < 3 || b.length < 3) {
            say.hidden = false;
            say.textContent = cfg.reportShortSay || '';
            (a.length < 3 ? w : f).focus();
            return;
          }
          var text = (cfg.workedTag || 'worked') + ': ' + a.slice(0, 100) + ' | ' +
                     (cfg.fixTag || 'fix') + ': ' + b.slice(0, 100);
          reportSent = true;
          phases = Math.max(phases, 3);
          say.hidden = true;
          if (solo || !PairKit.st) { afterReport(); return; }
          showSending(true);
          /* the report travels TWICE, and each trip has its own reason: down the
             MONITORED channel so it arrives with the flash and the teacher can
             read it like every other thing one pupil sends another, and into the
             blob so it survives a reload (a channel keeps only its last events) */
          PairKit.blob(ctx, 'put', 'report', text).then(function () {
            /* THE REPORT QUEUES BEHIND THE BEATS, and that is the point: fired
               straight at the channel it could land inside the one-second
               window a relay had just used and be refused exactly as the beats
               were — leaving the partner watching a screen that would never
               advance. Same queue, same order, nothing lost. */
            return PairKit.relay(ctx, 'msg', (cfg.reportTag || 'REPORT') + ' ' + text);
          }).then(function () { showSending(false); afterReport(); })
            /* AND AN HONEST LINE IF IT DOES NOT GO. Before this there was no
               catch at all: a send that failed left her looking at a button she
               had already pressed, for ever, with no way to tell whether it had
               worked. She is told plainly, and the button comes back so she can
               press it again — the report she wrote is still in the two boxes,
               untouched (DFM 138.7: never an instruction she cannot obey where
               she sits, and never a dead end). */
            .catch(function () {
              showSending(false);
              say.hidden = false;
              say.textContent = cfg.sendFailSay || '';
              sendBtn.focus();
            });
        });
      }
      function afterReport() {
        if (mode !== 'paired' || !PairKit.st) { seal(); return; }
        var st = PairKit.st;
        if (st.members.length === 2 && roundIdx === 0) { watchWait(); return; }
        seal();
      }

      /* ---- phase 3b: the builder watches her own bot being used --------- */
      /* `last` says this watch is the one AFTER she has already filed her own
         report, so the Continue under the partner's report seals instead of
         asking `rounds()` where to go next. See the note on `watchWait`. */
      function builderSeat(testerMi, last) {
        clearAll();
        host.innerHTML = '';
        var c = el('<div class="card swap-card swap-watch">' +
          '<span class="intro-kicker">' + esc(cfg.watchKicker || '') + '</span>' +
          '<h2>' + esc(cfg.watchTitle || '') + '</h2>' +
          '<p class="intro-lead">' + fmtBold(cfg.watchLead || '') + '</p>' +
          '<div class="swap-feed" data-arrive-live aria-live="polite"><p class="swap-feed-idle">' +
          esc(cfg.watchIdleSay || '') + '</p></div>' +
          '<div class="swap-side"></div>' +
          finishRow() + '</div>');
        host.appendChild(c);
        wireFinish(c);
        var feed = c.querySelector('.swap-feed');
        /* the turn swap is the OTHER genuine wait (K36b): she has nothing to do
           but watch, and the beats arrive at the channel's own cadence */
        if (!side && cfg.sideShow) side = SideShow.mount(c.querySelector('.swap-side'), cfg.sideShow);
        /* ---- ONE BEAT, ONE PLACE, ONE TIME (S6) --------------------------
           The feed is built by SEQUENCE rather than by arrival: every beat
           carries the channel's own per-message number, so a beat replayed into
           a screen that mounted late lands where it belongs instead of at the
           bottom, and a beat delivered twice is drawn once. Appending on
           arrival was fine while arrival order was send order — and the paced
           queue is what makes that true again — but a feed that can only ever
           append cannot be back-filled, and being back-fillable is half of what
           S6 is for. */
        var beatSeen = {};
        function drawBeat(seq, t) {
          if (beatSeen[seq]) return;
          beatSeen[seq] = 1;
          var idle = feed.querySelector('.swap-feed-idle');
          if (idle) idle.remove();
          var isBot = t.indexOf(String(cfg.relayBot || 'bot') + ':') === 0;
          var node = el('<p class="swap-beat is-' + (isBot ? 'bot' : 'tester') + '" data-seq="' + seq + '">' + esc(t) + '</p>');
          var before = null;
          Array.prototype.some.call(feed.querySelectorAll('.swap-beat'), function (n) {
            if (Number(n.getAttribute('data-seq')) > seq) { before = n; return true; }
            return false;
          });
          feed.insertBefore(node, before);
          feed.scrollTop = feed.scrollHeight;
          /* ---- V62/B4, DFM 275: THE BEAT DOES NOT KILL THE SIDE SHOW ------
             This line used to call `stopSide('matched')`, so the FIRST beat of
             her partner's conversation ended the side show — at the exact
             moment her waiting began rather than ended. His K36b sentence
             ("vanishes the instant the match/message arrives") was written
             about the PAIRING MATCH, where the flash is the event and a
             comedian standing in front of it is in the way. Watching a feed
             tick along is waiting, not working. Refined by his ruling of
             29 Aug: the side show goes when she is WORKING (the tester's seat,
             which has never had one) or when an arrival is the thing she must
             look at (the match pop, where `onWaitOver` still ends it) — never
             merely because a message moved. */
          PairKit.arrive(feed, { announce: cfg.beatArrivedSay || '' });
        }
        PairKit.onEvent(function (e) {
          if (String(e[2]) !== 'msg') return;
          /* ---- V62/B2: WHOSE MESSAGE IS THIS? ASKED FIRST, ALWAYS ---------
             He sat the Swap and found his OWN report under "Their report on
             your bot". The whole fault was the order of these two lines: the
             REPORT branch returned before the skip-my-own filter ever ran, so
             her own report came back down the monitored channel and was stored
             as `partnerReport`. It then rendered under the partner's heading,
             was announced as "Their report has arrived", and poisoned the seal
             too — `seal()` re-fetches the real one only `if (!partnerReport)`,
             so the honest "their report did not arrive" line became
             unreachable as well.
             The filter is now the FIRST question asked of every message,
             because "is this mine?" is true of a report exactly as it is true
             of a beat, and a branch that answers before it has asked is a
             branch that will get it wrong again. Gated by S13/S13c in
             qa-swap-paired.js, which had never asked whose text it was. */
          if (Number(e[1]) === Number(PairKit.st.mi)) return;
          var t = String(e[3] || '');
          if (t.indexOf(String(cfg.reportTag || 'REPORT')) === 0) { partnerReport = t; return; }
          drawBeat(Number(e[0]), t);
        });
        /* ---- S8: EXACTLY ONCE, AND THEN STOP ASKING ----------------------
           His worst fault, and the mechanism was three lines: `onPoll` fired
           every two seconds, `reportArrived()` stayed true for ever once the
           report had landed, and `showMyReport` APPENDED a fresh card each
           time. Measured on V59: 2→13 cards on one screen and 1→12 on the
           other in twenty-four seconds, growing without limit, drowning the
           feed underneath. A latch, and the poll takes itself off the moment
           the card is drawn — a handler that has done its one job has no
           business still being registered (DFM 143's family). */
        var reportShown = false;
        PairKit.onPoll(function () {
          if (reportShown || !reportArrived()) return;
          reportShown = true;
          PairKit.onPoll(null);
          showMyReport(c, function () {
            if (last) { seal(); return; }
            roundIdx++; rounds();
          });
        });
      }
      /* ---- THE CONTINUE AFTER HER PARTNER'S REPORT SEALS, DIRECTLY -------
         The pupil who takes the TESTER'S seat first files her report and is
         sent here to watch her own bot being used — but `afterReport` reaches
         this by SHORT-CIRCUIT, so `roundIdx` is still 0. Without `last`, her
         Continue ran `roundIdx++; rounds()`, which resolved to round 1, where
         she is the BUILDER again, and re-mounted the watch screen. The poll
         there finds `partnerReport` already set, so it immediately draws the
         SAME report card a second time; her second Continue takes `roundIdx`
         past the end of the plan and seals. She gets there, by a route that
         shows her one card twice and one press that appears to do nothing.
         WHAT I FIRST WROTE HERE WAS WRONG, and it is worth leaving the
         correction visible. I called this a dead end the B2 fix had uncovered,
         and credited the harness with catching it — when what the harness had
         actually caught was ITSELF, pressing Fred's "Say it" button twenty
         times because DFM 275 had just put him on this screen above the
         Continue. **A control settled it: with this flag forced off, the paired
         sit still passes and both pupils still seal.** So this is a tidy-up of a
         redundant screen, not the repair of a fault, and it is not credited as
         one (DFM 196 — a fix nothing failed without is not a fix). */
      function watchWait() {
        var rs = plan();
        var r = rs[1];
        builderSeat(Number(r.tester), true);
      }
      function reportArrived() { return !!partnerReport; }

      function showMyReport(card, cb) {
        /* belt as well as braces: even if some future caller forgets the latch
           above, one card can only ever hold one report (DFM 144 — the fact has
           one home, and this is it) */
        if (card.querySelector('.swap-myreport')) return;
        var box = el('<div class="swap-myreport" data-arrive-live></div>');
        card.appendChild(box);
        box.innerHTML = '<h3>' + esc(cfg.gotReportTitle || '') + '</h3>' +
          '<p class="swap-report-text">' + esc(String(partnerReport).replace(String(cfg.reportTag || 'REPORT'), '').trim()) + '</p>' +
          '<button class="primary-btn swap-go" type="button">' + esc(cfg.afterReportLabel || '') + '</button>';
        PairKit.arrive(box, { announce: cfg.reportArrivedSay || '' });
        App.armButton(box.querySelector('.swap-go'), function () { cb(); });
      }

      /* ---- phase 5: seal + reveal --------------------------------------- */
      function seal() {
        if (sealed) return;
        sealed = true;
        clearAll();
        phases = Math.max(phases, Number(cfg.phaseCount || 4));
        host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>' +
          esc(cfg.sealingSay || '') + '</span></div>';
        var go = function (names) {
          host.innerHTML = '';
          var who = (names || []).filter(function (_, i) { return !PairKit.st || i !== Number(PairKit.st.mi); });
          var c = el('<div class="card swap-card swap-seal">' +
            '<span class="intro-kicker">' + esc(cfg.sealKicker || '') + '</span>' +
            '<h2>' + esc(cfg.sealTitle || '') + '</h2>' +
            (who.length ? '<p class="swap-reveal">' + fmtBold(String(cfg.revealSay || '').replace('{names}', who.join(' and '))) + '</p>' : '') +
            (partnerReport
              ? '<div class="swap-myreport"><h3>' + esc(cfg.gotReportTitle || '') + '</h3><p class="swap-report-text">' +
                esc(String(partnerReport).replace(String(cfg.reportTag || 'REPORT'), '').trim()) + '</p></div>'
              : '<p class="swap-noreport">' + fmtBold(cfg.noReportSay || '') + '</p>') +
            '<p class="swap-seal-say">' + fmtBold(cfg.sealSay || '') + '</p>' +
            '<button class="primary-btn swap-done" type="button">' + esc(cfg.doneLabel || '') + '</button>' +
            '</div>');
          host.appendChild(c);
          App.armButton(c.querySelector('.swap-done'), function () { finish(); });
        };
        if (mode === 'paired' && PairKit.st) {
          /* one last look for a report that may have landed while she was
             filing hers, then seal — the reveal never waits on it */
          PairKit.blob(ctx, 'get', 'report', PairKit.prevRound()).then(function (r) {
            if (!partnerReport && r && r.ok && Number(r.has)) partnerReport = String(r.v);
            return PairKit.complete(ctx);
          }).then(function (r) { go((r && r.names) || null); });
        } else go(null);
      }

      /* ---- solo / catch-up: the tester's seat, on her own bot ------------ */
      function soloSeat(why) {
        mode = mode === 'paired' ? mode : 'solo';
        host.innerHTML = '';
        var c = el('<div class="card swap-card swap-solo">' +
          '<span class="intro-kicker">' + esc(cfg.soloKicker || '') + '</span>' +
          '<h2>' + esc(cfg.soloTitle || '') + '</h2>' +
          '<p class="intro-lead">' + fmtBold((why ? why + ' ' : '') + (cfg.soloLead || '')) + '</p>' +
          finishRow('<button class="primary-btn swap-solo-go" type="button">' + esc(cfg.soloGoLabel || '') + '</button>') +
          '</div>');
        host.appendChild(c);
        wireFinish(c);
        App.armButton(c.querySelector('.swap-solo-go'), function () { testerSeat(-1, myCode); });
      }
    }
  };

  /* ================= duel — "The Prediction Match" (j3-03, spec §C4) =======
     Six rounds. Both screens show the same few lines of Python; each pupil
     commits privately; then the code REALLY RUNS and both predictions sit beside
     the real output. Being right before the reveal is a point, and the point is
     PRIVATE to the pair — never posted, never on a board.

     XP NEVER TOUCHES A PREDICTION. The match pays flat, on finishing the six
     rounds, and it says so before the first one. That is what makes a guess
     round safe to offer at all, and it is why a wrong prediction can be left
     standing: nothing is riding on it, so nothing has to be rescued. Nothing
     is corrected in advance and nothing is re-guessed (DFM 210's family).

     THE GUESS ROUNDS ANNOUNCE THEMSELVES (K35(4), his ruling: "ok but make it
     super clear that it hasn't been taught yet"). Rounds 5 and 6 are on ground
     nobody has taught, so before the snippet appears a full-width banner in its
     own colour says exactly that — and it STAYS for the whole round, because a
     mode that changes the rules announces itself for its duration and a toast
     that vanishes in three seconds is not an announcement (DFM 146e). */
  Engines.duel = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config;
      var W = cfg.words || {};
      var rounds = cfg.rounds || [];
      var at = 0, right = 0, done = 0;
      var mode = null, side = null;
      var pollT = null, sealed = false;
      var mine = {}, theirs = {};      /* round index -> commit text, per member */

      introCard(host, {
        kicker: cfg.kicker, title: cfg.title, text: cfg.intro || '',
        steps: cfg.steps, stepsClass: 'duel-intro-steps'
      }, cfg.beginLabel || 'Take my seat', gate);

      function stopSide(why) { if (side) { side.leave(why || 'matched'); side = null; } }
      function clearPoll() { if (pollT) { clearTimeout(pollT); pollT = null; } }
      function finish(earned) {
        clearPoll(); stopSide('left'); PairKit.stop();
        finishChunk(ctx, (chunk.id || 'duel') + '=' + done + '/' + rounds.length, 0, earned);
      }
      /* THE WAY OUT NEVER TRAPS HER AND NEVER LIES TO HER. It is on every screen
         because a pupil at time-up has to be able to leave; it asks first when
         rounds are still unplayed, says exactly how many she has done, and then
         lets her go without the badge she has not earned. */
      function leave() {
        if (done >= rounds.length) { finish(true); return; }
        App.confirm(cfg.leaveTitle || '', String(cfg.leaveAsk || '')
          .replace('{done}', String(done)).replace('{all}', String(rounds.length)),
          cfg.leaveYes || '', function (yes) { if (yes) finish(false); });
      }
      function finishRow(extra) {
        return '<div class="rung-actions duel-exit-row">' + (extra || '') +
          '<button class="ghost-btn duel-finish" type="button">' + esc(cfg.finishLabel || '') + '</button></div>';
      }
      function wireFinish(root) {
        var b = root.querySelector('.duel-finish');
        if (b) App.armButton(b, function () { leave(); });
      }

      function gate() {
        host.innerHTML = '';
        PairKit.ensure(ctx, host, onMode, W, {
          onWaiting: function (slot, waitedMs) {
            if (!slot || side || waitedMs < Number(cfg.sideAfterMs == null ? 8000 : cfg.sideAfterMs)) return;
            side = SideShow.mount(slot, cfg.sideShow || {});
          },
          onWaitOver: function (why) { stopSide(why); }
        });
      }
      function onMode(m) {
        mode = m;
        if (m === 'left') { finish(); return; }
        if (m === 'paired') { PairKit.onEvent(onChannel); }
        /* ---- SHE STOPPED WAITING AND ASKED TO PLAY THE COMPUTER -----------
           The one-player Match already existed and already worked: any mode
           that is not `paired` simply draws the rounds. What was missing was a
           way for her to REACH it. The long-wait card sent her to a teacher,
           and failing that to the exit — and the exit says the Match "does not
           count and there is no badge for it", after the lesson opened by
           promising her the badge for playing all six rounds. On a cover day,
           or catching up alone, that promise was unkeepable. The Swap has had
           this button since V61; the Match simply supplied no `waitOwnLabel`,
           which is the key PairKit gates it on.
           IT ANNOUNCES ITSELF (DFM 146e), because a mode that changes the rules
           always does — and in its OWN words, because the server-released solo
           card says "everybody else has already played", which is untrue here:
           nobody has, she just stopped waiting. Config-gated on `ownTitle`, so
           a lesson that supplies no such strings behaves exactly as before. */
        if (m === 'own' && PairKit.say('ownTitle', '')) {
          PairKit._statePop({
            kicker: PairKit.say('ownKicker', ''),
            title: PairKit.say('ownTitle', ''),
            lines: [PairKit.sayHtml('ownLine', '')],
            button: PairKit.say('ownButton', '')
          }, function () { drawRound(); });
          return;
        }
        drawRound();
      }

      /* commits cross the channel as their own kind of line: `C<round>|<text>` */
      function onChannel(e) {
        if (String(e[2]) !== 'msg') return;
        var t = String(e[3] || '');
        var m = /^C(\d+)\|([\s\S]*)$/.exec(t);
        if (!m) return;
        var idx = Number(m[1]);
        var who = Number(e[1]);
        if (who === Number(PairKit.st.mi)) return;
        if (!theirs[idx]) theirs[idx] = {};
        theirs[idx][who] = m[2];
        if (idx === at) maybeReveal();
      }

      function othersIn(idx) {
        if (mode !== 'paired' || !PairKit.st) return true;
        var need = PairKit.others();
        var got = theirs[idx] || {};
        for (var i = 0; i < need.length; i++) if (got[need[i]] == null) return false;
        return true;
      }

      var revealTimer = null, revealShown = false;
      /* THE REVEAL IS REACHED THROUGH A HANDLE, NOT BY NAME. `showReveal` is
         declared inside `drawRound` — it closes over that round's card — and
         this function lives one scope out, so calling it by name was a
         ReferenceError every single time a partner's answer arrived. The effect
         in a classroom: two pupils commit, the second one's answer lands, and
         NOTHING happens; both sit looking at "waiting for your partner" until
         the forty-five second timeout drags the round open. Every round, every
         pair. The round hands its own reveal out as it draws itself. */
      var revealNow = null;
      function maybeReveal() {
        if (revealShown) return;
        if (!othersIn(at)) return;
        if (!revealNow) return;
        revealShown = true;
        clearTimeout(revealTimer);
        revealNow(false);
      }

      function drawRound() {
        clearPoll();
        revealShown = false;
        clearTimeout(revealTimer);
        if (at >= rounds.length) { seal(); return; }
        var r = rounds[at];
        host.innerHTML = '';
        var guess = !!r.guess;
        var strip = rounds.map(function (_, i) {
          return '<span class="duel-pip' + (i < at ? ' done' : (i === at ? ' now' : '')) +
            (rounds[i].guess ? ' is-guess' : '') + '">' + (i + 1) + '</span>';
        }).join('');
        var opts = (r.options || []).length
          ? '<div class="duel-options">' + derangedOrder(r.options.length).map(function (i) {
              return '<button class="duel-option" type="button" data-v="' + esc(r.options[i]) + '">' +
                esc(r.options[i]) + '</button>';
            }).join('') + '</div>'
          : '<div class="duel-typed"><label class="duel-lab" for="duel-say">' + esc(cfg.typedLabel || '') + '</label>' +
            '<textarea id="duel-say" class="duel-say" rows="3" spellcheck="false" autocomplete="off"></textarea></div>';
        var c = el('<div class="card duel-card' + (guess ? ' is-guess' : '') + '" data-round="' + at + '">' +
          '<div class="duel-strip">' + strip + '</div>' +
          (guess
            ? '<div class="duel-guess-banner" role="note"><b>' + esc(cfg.guessTag || '') + '</b> ' +
              esc(cfg.guessSay || '') + '</div>'
            : '') +
          '<h2 class="duel-goal">' + fmtBold(r.ask || cfg.ask || '') + '</h2>' +
          (r.lead ? '<p class="duel-lead">' + fmtBold(r.lead) + '</p>' : '') +
          '<pre class="duel-code">' + esc((r.code || []).join('\n')) + '</pre>' +
          opts +
          '<button class="primary-btn duel-lock" type="button">' + esc(cfg.lockLabel || '') + '</button>' +
          '<p class="duel-locked-note">' + esc(cfg.lockedNote || '') + '</p>' +
          '<div class="duel-wait" hidden data-arrive-live></div>' +
          '<div class="duel-reveal" hidden data-arrive-live></div>' +
          finishRow() + '</div>');
        host.appendChild(c);
        wireFinish(c);
        var picked = null;
        c.querySelectorAll('.duel-option').forEach(function (b) {
          App.armButton(b, function () {
            c.querySelectorAll('.duel-option').forEach(function (o) { o.classList.remove('is-picked'); });
            b.classList.add('is-picked');
            picked = b.getAttribute('data-v');
          });
        });
        var lock = c.querySelector('.duel-lock');
        App.armButton(lock, function () {
          var v = (r.options || []).length ? picked : String((c.querySelector('.duel-say') || {}).value || '').trim();
          if (!v) {
            /* the empty refusal explains itself and points at itself (DFM 205) */
            var note = c.querySelector('.duel-locked-note');
            note.classList.add('is-wants');
            note.textContent = cfg.emptySay || '';
            var t = c.querySelector('.duel-say');
            if (t) t.focus();
            return;
          }
          mine[at] = v;
          lock.disabled = true;
          /* THE OPTIONS SAY WHY THEY HAVE STOPPED WORKING, and they say it where
             they are. Locking in disables all four of them, and the only
             sentence about it sat under the lock button — three hundred pixels
             from the option at the top, which is the "note two steps away" the
             mute-lock rule is written against. A pupil who clicks a dead button
             is owed a reason beside that button (DFM 42/205). */
          var optBox = c.querySelector('.duel-options') || c.querySelector('.duel-typed');
          if (optBox && !optBox.querySelector('.duel-optnote')) {
            var on = el('<p class="duel-optnote" role="status"></p>');
            on.textContent = cfg.lockedSay || '';
            optBox.insertBefore(on, optBox.firstChild);
          }
          c.querySelectorAll('.duel-option').forEach(function (o) { o.disabled = true; });
          var ta = c.querySelector('.duel-say');
          if (ta) ta.readOnly = true;
          var wait = c.querySelector('.duel-wait');
          wait.hidden = false;
          wait.innerHTML = '<p class="duel-wait-say">' + esc(waitSay()) + '</p>';
          if (mode === 'paired' && PairKit.st) {
            PairKit.send(ctx, 'msg', 'C' + at + '|' + String(v).slice(0, 120));
            /* REVEAL ON TIMEOUT, SAID HONESTLY (spec §C4). A partner who has
               wandered off must never freeze the room: after the held wait the
               reveal happens anyway and the screen says why. */
            revealTimer = setTimeout(function () {
              if (revealShown) return;
              revealShown = true;
              showReveal(true);
            }, Number(cfg.holdMs == null ? 45000 : cfg.holdMs));
            maybeReveal();
          } else {
            revealShown = true;
            setTimeout(function () { showReveal(false); }, 400);
          }
        });

        function waitSay() {
          if (mode !== 'paired' || !PairKit.st) return cfg.soloWaitSay || '';
          var pre = PairKit.say('signPrefix', '');
          var names = PairKit.others().map(function (i) { return pre + String(PairKit.st.members[i] || ''); });
          return String(cfg.waitSay || '').replace('{signs}', names.join(' and '));
        }

        revealNow = showReveal;
        function showReveal(timedOut) {
          clearTimeout(revealTimer);
          var box = c.querySelector('.duel-reveal');
          var wait = c.querySelector('.duel-wait');
          box.hidden = false;
          box.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>' +
            esc(cfg.runningSay || '') + '</span></div>';
          /* IT REALLY RUNS. The reveal is never an authored "answer" — the same
             snippet the pupils just read is handed to Python and whatever comes
             back is what the card shows. A seeded preamble keeps a walk pinnable
             (DFM 199) without touching what she can see. */
          PyRun.run((r.code || []).join('\n'), {
            limitMs: Number(cfg.limitMs || 0) || undefined,
            preamble: PyRun.seedPreamble(Number(r.seed == null ? 4 : r.seed))
          }).then(function (res) {
            wait.hidden = true;
            var real = res.ok ? PyRun.tidy(res.out) : String(res.err);
            var ok = judge(mine[at], real, r);
            if (!r.guess && ok) right++;
            done = at + 1;
            var rowsHtml = '';
            var pre = PairKit.say('signPrefix', '');
            rowsHtml += predRow(cfg.meWho || '', mine[at], ok, true);
            if (mode === 'paired' && PairKit.st) {
              PairKit.others().forEach(function (i) {
                var v = (theirs[at] || {})[i];
                rowsHtml += predRow(pre + String(PairKit.st.members[i] || ''),
                  v == null ? (cfg.noCommitSay || '') : v,
                  v == null ? null : judge(v, real, r), false);
              });
            }
            box.innerHTML =
              (timedOut ? '<p class="duel-timeout">' + fmtBold(cfg.timeoutSay || '') + '</p>' : '') +
              '<h3>' + esc(cfg.realTitle || '') + '</h3>' +
              '<pre class="duel-real' + (res.ok ? '' : ' is-err') + '">' + esc(real) + '</pre>' +
              '<div class="duel-preds">' + rowsHtml + '</div>' +
              '<p class="duel-teach">' + fmtBold(r.teach || '') + '</p>' +
              '<button class="primary-btn duel-next" type="button">' + esc(
                at + 1 >= rounds.length ? (cfg.lastLabel || '') : (cfg.nextLabel || '')) + '</button>';
            PairKit.arrive(box, { announce: cfg.revealArrivedSay || '' });
            App.armButton(box.querySelector('.duel-next'), function () { at++; drawRound(); });
          });
        }
      }

      function predRow(who, text, ok, isMine) {
        return '<div class="duel-pred' + (isMine ? ' is-mine' : '') +
          (ok == null ? '' : (ok ? ' is-right' : ' is-wrong')) + '">' +
          '<span class="duel-pred-who">' + esc(who) + '</span>' +
          '<span class="duel-pred-text">' + esc(String(text)) + '</span></div>';
      }

      /* Right BEFORE the reveal, and it is compared the way a person would:
         spaces and capitals forgiven, everything else exact. A typed prediction
         only has to say what the program prints, not how she formatted it —
         judging her on invisible characters would be a fail state she could
         never diagnose (rule 35's family). */
      function judge(said, real, r) {
        if (said == null) return null;
        var norm = function (x) {
          return String(x == null ? '' : x).replace(/\r/g, '').split('\n')
            .map(function (l) { return l.replace(/\s+/g, ' ').trim().toLowerCase(); })
            .filter(function (l) { return l !== ''; }).join('\n');
        };
        /* JUDGED AGAINST WHAT PYTHON ACTUALLY PRINTED, and against nothing
           else. This read `r.answer` first, with the real run only as a
           fallback -- two homes for one fact (DFM 144), and the wrong one
           winning: an author's typed answer that disagreed with the runtime
           would have told a pupil she was wrong while the console in front of
           her showed she was right. It also meant the six answers had to ship
           in the public content, where anyone with a browser's own inspector
           could read them BEFORE committing, which is the single thing this
           round is built to prevent. The reveal runs the line for real; the
           truth is what came out of it. */
        return norm(said) === norm(real);
      }

      function seal() {
        if (sealed) return;
        sealed = true;
        clearPoll();
        host.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>' +
          esc(cfg.sealingSay || '') + '</span></div>';
        var scored = rounds.filter(function (x) { return !x.guess; }).length;
        var go = function (names) {
          host.innerHTML = '';
          var who = (names || []).filter(function (_, i) { return !PairKit.st || i !== Number(PairKit.st.mi); });
          var c = el('<div class="card duel-card duel-seal">' +
            '<span class="intro-kicker">' + esc(cfg.sealKicker || '') + '</span>' +
            '<h2>' + esc(cfg.sealTitle || '') + '</h2>' +
            '<p class="duel-score">' + fmtBold(String(cfg.scoreSay || '')
              .replace('{right}', String(right)).replace('{of}', String(scored))) + '</p>' +
            (who.length ? '<p class="duel-reveal-names">' + fmtBold(String(cfg.revealSay || '').replace('{names}', who.join(' and '))) + '</p>' : '') +
            '<p class="duel-seal-say">' + fmtBold(cfg.sealSay || '') + '</p>' +
            '<button class="primary-btn duel-done" type="button">' + esc(cfg.doneLabel || '') + '</button></div>');
          host.appendChild(c);
          App.armButton(c.querySelector('.duel-done'), function () { finish(); });
        };
        if (mode === 'paired' && PairKit.st) {
          PairKit.complete(ctx).then(function (r) { go((r && r.names) || null); });
        } else go(null);
      }
    }
  };

  /* ================= artifact (bank your build: the website checks the REAL Drive) ==
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
        /* DFM 254, HIS RULING, 23 Aug 2026 ("i would have liked to fold it in"):
           this engine spoke as HQ to a pupil who does not meet the word until
           Lesson 4, and called her Drive folder "your Vault", which is Lesson 1's
           own activity — the DFM 192(g) collision whose sweep reached the casework
           engine and missed this one. Every replacement below is his, verbatim
           from that entry's from-to table, and every one now has a CONTENT DOOR in
           front of it (the drivecheck precedent), so the words a pupil reads meet
           the language gate and the read-aloud ledger like every other pupil
           sentence — a string hardcoded in an engine escapes both (DFM 190d/192g).
           SCOPE, stated because the same words live elsewhere: the casework SHIP
           block and Lesson 4's clue routine keep their HQ, because Lesson 4 is
           where HQ is taught; Lesson 1's Vault engine is REPORTED in 254 and NOT
           ruled on, so it is untouched. */
        '<button class="primary-btn" type="button">' + esc(cfg.checkLabel || 'Run the inspection') + '</button>' +
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
        box.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>' +
          esc(cfg.checking || 'Looking inside your Drive for your file\u2026') + '</span></div>';
        ctx.call('artifactCheck', { lessonNum: String(ctx.lessonEntry.num), kinds: cfg.kinds || ['hex'], hours: cfg.hours || 3 }).then(function (r) {
          runBtn.disabled = false;
          tries++;
          if (!r || !r.ok) {
            box.innerHTML = '<div class="dc-row miss"><span class="dc-mark">&#10007;</span><span>' +
              esc(cfg.errorText || 'The check could not reach your Drive \u2014 try again in a moment.') + '</span></div>';
            return;
          }
          if (r.found) {
            box.innerHTML = '<div class="dc-row ok"><span class="dc-mark">&#10003;</span><span>' +
              fmtBold(String(cfg.foundText || 'The website found **{name}** in your DT Work folder').replace('{name}', esc(r.name))) +
              (r.ageMin != null ? ' (saved ' + Number(r.ageMin) + ' min ago)' : '') + '.</span></div>' +
              (r.simulated ? '<p class="dc-sim">(Preview mode: this inspection is simulated &mdash; the live platform checks your real Drive.)</p>' : '') +
              '<p>' + esc(cfg.passText || 'Your build now follows your login anywhere. That is the whole point of the Vault.') + '</p>';
            runBtn.textContent = 'Claim the badge';
            runBtn.onclick = function () { finishChunk(ctx, 'bank=1'); };
            skipBtn.hidden = true;
          } else {
            box.innerHTML = '<div class="dc-row miss"><span class="dc-mark">&#10007;</span><span>' +
              (r.noFolder ? esc(cfg.noFolderText || 'The website could not find your School > DT Work folder. Build it right now in Drive \u2014 + New \u2192 Folder \u2192 "School", then "DT Work" inside it \u2014 and press the check button again. (The Files That Follow You side quest walks you through it too.)')
                : 'No freshly-saved build found in DT Work yet.') + '</span></div>' +
              '<p>' + esc(cfg.failText || 'Check each step above, then press ' + (cfg.checkLabel || 'Run the inspection') + ' again.') + '</p>';
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
      /* DFM 42/143 — A DEAD PLAYER MUST STILL SAY SOMETHING (j3-02 cold read, 19 Aug 2026).
         `cfg.fallback` used to render ONLY in the `!cfg.src` branch above, i.e. only when no
         film had been set at all. The case it is written for is the OTHER one: a film that is
         set and does not load. A 404 gave her a broken player and not one word, which on a
         cover day with nobody in the room is a dead screen. The film's own words now render
         underneath the player the moment the element reports it cannot play. */
      vid.addEventListener('error', function () {
        if (c2.querySelector('.video-failed')) return;
        var f = el('<p class="video-failed" role="status">' +
          esc(cfg.fallback || 'The film will not play just now. Carry on — everything it shows is written again on the cards that come next. Tell whoever is in the room that the film would not play.') +
          '</p>');
        vid.insertAdjacentElement('afterend', f);
      }, true);
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
        /* THE LOCKED NOTE (DFM 205's class, found on Lesson 3 by the confused-pupil
           walker on 14 Aug 2026 and fixed on his word, DFM 223). "Send in my
           scores" is born `disabled` and only wakes when the referee box is
           ticked, both goes have been played and both numbers are in — and
           nothing beside it said so, so a pupil who pressed it early got
           silence. The three things that would have explained it were all on
           screen and none was attached to the button: the rules list sits above
           the console, the tick is a control rather than a sentence, and the
           steppers' own tag speaks only about the steppers. Same shape as the
           closing screen and the ordering puzzle, which this rule already fixed. */
        '<p class="case-locked-note rally-locked-note">' + esc(cfg.lockedNote ||
          'This wakes up when both goes have been played, both scores are in, and you have ticked the box above.') + '</p>' +
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
        /* the note disappears the moment it is satisfied, and once she has sent
           her scores there is nothing left to unlock (DFM 205's own rule) */
        var txNote = c.querySelector('.rally-locked-note');
        if (txNote) txNote.hidden = ready || submitted;
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
          '<div class="rally-counter"><span class="panel-spinner"></span><span class="rally-counter-text">' + esc((cfg.suspense && cfg.suspense.waiting) || 'Scores are landing\u2026') + '</span></div>' +
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
          /* DFM 201e: "as I was finishing writing the log and clicking the button
             for case 02, it said something about three catches, but I couldn't go
             back and check what that meant." He was right that he could not: a
             closed case collapsed to ticket + stamp + log, so every instruction
             she had just followed vanished the moment she succeeded. A finished
             case now keeps its file readable — read-only, no inputs, no clue
             ladder (the ladder's price only makes sense on an OPEN case). */
          var recordBits =
            '<div class="case-record"><span class="case-step-tag">THE CASE FILE, FOR THE RECORD</span>' +
            '<p><b>What the player saw:</b> ' + esc(cs.symptom) + '</p>' +
            '<p><b>Where you looked:</b> ' + esc(cs.look) + '</p>' +
            (cs.mechanicSteps && cs.mechanicSteps.length
              ? '<p class="case-mechanic">&#128295; <b>Doing that in Scratch:</b></p><ol class="case-mech-steps">' +
                cs.mechanicSteps.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol>'
              : (cs.mechanic ? '<p class="case-mechanic">&#128295; <b>Doing that in Scratch:</b> ' + esc(cs.mechanic) + '</p>' : '')) +
            '<p><b>How you proved it:</b> ' + esc(cs.replay) + '</p>' +
            '<p class="case-record-tick">&#10003; ' + esc(cs.replayConfirm) + '</p></div>';
          var cDone = el('<div class="card case-filecard closed-file"><span class="intro-kicker">' + esc(cs.num) + '</span>' +
            '<h2>' + esc(cs.name) + '</h2>' +
            stampHtml(cs.id) +
            '<div class="case-ticket"><span class="case-stars">' + starsHtml(cs.stars) + '</span>' +
            '<p>&ldquo;' + esc(cs.ticket) + '&rdquo;</p><span class="case-player">&mdash; ' + esc(cs.player) + '</span></div>' +
            (logs[cs.id] ? '<div class="case-log-final"><b>Your case log:</b><p>&ldquo;' + esc(logs[cs.id]) + '&rdquo;</p></div>' : '') +
            recordBits +
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
              /* DFM 201f: "help step one costs nothing, but a student doesn't know
                 what you mean by costs nothing. Do you mean it doesn't cost any
                 XP?" The ladder's only price anywhere is the GOLD stamp, and no
                 surface said so where she reads it. It does now, first line. */
              (cfg.clueLadderCost ? '<p class="case-clue-price">' + fmtBold(cfg.clueLadderCost) + '</p>' : '') +
              '<p><b>' + esc(cfg.clueStep1Head || 'Help step 1 — re-read the ticket') + ':</b> ' + esc(clue.free || 'Re-read the ticket. What EXACTLY does the player say happens?') + '</p>' +
              '<p><b>' + esc(cfg.clueStep2Head || 'Help step 2 — ask another agency (another detective pair)') + ':</b> ' + esc(solo ? (clue.consultSolo || 'No other agencies are on shift today — you are the whole QA team. If re-reading the ticket didn’t crack it, go straight to HQ’s clue below.') : (clue.consult || 'Ask another agency — another detective pair — that has CLOSED this case. One question, detective to detective.')) + '</p>' +
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
  /* A SERVED ORDER IN WHICH NOTHING SITS WHERE IT WAS AUTHORED (DFM 258).
     Used by the pyrun tray. Re-draws until the permutation is a derangement,
     which a Fisher-Yates shuffle reaches about 37% of the time, so a handful of
     draws is plenty; the fallback is a rotation, which is a derangement by
     construction and can never loop. One or zero lines cannot be deranged and
     are returned as they are — there is nothing to hide in a tray of one. */
  function derangedOrder(n) {
    var idx = [], i;
    for (i = 0; i < n; i++) idx.push(i);
    if (n < 2) return idx;
    for (var tries = 0; tries < 32; tries++) {
      var o = stdShuffle(idx);
      var ok = true;
      for (i = 0; i < n; i++) { if (o[i] === i) { ok = false; break; } }
      if (ok) return o;
    }
    return idx.slice(1).concat(idx.slice(0, 1));
  }
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
            /* HIS FINDING (DFM 207b): "I'm not sure what it means by found the
               studio. What does that mean? do you mean that the studio has been
               created?" It meant FOUNDED — and to an 11-year-old "found" is the
               past tense of find. It was also a raw engine literal at three
               words, under the debt inventory's four-word floor, so no language
               gate ever read it. Content owns it now, and it says what the
               button does: pressing it opens the studio desk. */
            '<button class="primary-btn std-enter" type="button">' + (chunk.badge ? S('enterLabel', 'Open my studio') : S('enterContinue', 'Continue')) + '</button></div>';
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
        /* DFM 217, his find: the three desk steps were written into the intro
           PARAGRAPH ("STEP 1, THE KIT: ... STEP 2, ..."), which renders as run-on
           prose — the exact fault rule 171 exists to stop. introCard has taken a
           `steps` array since round 6 and this engine simply never passed one. */
        steps: cfg.introSteps || null,
        after: (solo && cfg.introSoloAfter) ? cfg.introSoloAfter : (cfg.introAfter || ''),
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

          /* HIS FIND (DFM 212): the zones are numbered 1-2-3, but only the QA
             desk is gated — the blueprint is live from the first render. The
             numbers promised a chain the screen does not follow. They now say
             WHEN each zone is used, which is the true relationship, rather than
             locking the plan away (a pupil must be able to read the plan). */
          '<div class="std-toolrow">' +
          '<div class="card std-tool' + (kit ? ' done' : '') + '"><span class="std-qa-tag">1 &middot; THE KIT</span>' +
          ((cfg.zoneWhen && cfg.zoneWhen.kit) ? '<p class="std-zone-when">' + esc(cfg.zoneWhen.kit) + '</p>' : '') +
          '<p>' + esc((cfg.kit && cfg.kit.intro) || 'Download your starter kit and load it at scratch.mit.edu.') + '</p>' +
          '<p class="case-getgame-btns"><a class="primary-btn" href="' + esc(asset(t.file)) + '" download>&#11015;&#65039; Download the ' + esc(t.name) + ' kit</a> ' +
          '<a class="ghost-btn" href="https://scratch.mit.edu/projects/editor/" target="_blank" rel="noopener">Open the Scratch editor &#8599;</a></p>' +
          /* HIS QUESTION (DFM 207f): "should we have a note to say that they have
             to click on the apple to see the studio code note? Or is that part of
             the task?" Ruled: it is NOT the task — the confirm is a setup step,
             and the card asked her to tick something it never told her how to do.
             The sprite is named per kit (Apple / Door / True Tile), and
             qa-kit-facts checks the named sprite really owns a comment in that
             .sb3, so this pointer can never drift from the file it describes. */
          (t.noteWhere ? '<p class="std-note-where">&#128205; ' + esc(t.noteWhere) + '</p>' : '') +
          '<button class="confirm-step std-kit-confirm" type="button"' + (kit ? ' disabled' : '') + '><span class="confirm-box' + (kit ? ' done' : '') + '"></span><span>' + esc((cfg.kit && cfg.kit.confirm) || 'The kit is open in Scratch and I can see its code') + '</span></button></div>' +

          '<div class="card std-tool"><span class="std-qa-tag">2 &middot; THE BLUEPRINT</span>' +
          ((cfg.zoneWhen && cfg.zoneWhen.blueprint) ? '<p class="std-zone-when">' + esc(cfg.zoneWhen.blueprint) + '</p>' : '') +
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
          ((cfg.zoneWhen && cfg.zoneWhen.qa) ? '<p class="std-zone-when">' + esc(cfg.zoneWhen.qa) + '</p>' : '') +
          '<p>' + esc(cfg.qaIntro || 'Four checks stand between your build and the gallery. Run each test in Scratch, then record what actually happened - crosses are QA doing its job.') + '</p>' +
          /* DFM 204 — FOUND BY THE CONFUSED-PUPIL WALKER, BEFORE HE SAT LESSON 5.
             Every check row is rendered `disabled` until the kit is confirmed, and
             the only sign of it was 60% opacity: a pupil who clicked a check got
             nothing, and nothing on screen told her why. That is exactly the Case
             01 experience he complained about (DFM 192f). The note is content, not
             an engine literal, so the language gate can see it (rule 172). */
          (kit ? '' : '<p class="case-locked-note">' + fmtBold(cfg.qaLockedNote ||
            'These four checks wake up the moment you tick step 1 above — the kit open in Scratch, with its STUDIO NOTE found. Until then there is nothing to test.') + '</p>') +
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
            /* V62 PART A: FOUR VISIBLE EMPTY BOXES (DFM 42/184). These three
               classes reserve a line of height so the card does not jump when a
               nudge appears — which is right, but it left 500-600px strips of
               nothing on screen with no way for anything to know they were
               deliberate. They are what they always were: STATUS LINES. Saying
               so out loud makes the reserved space declared rather than
               mysterious, and it means the nudge is now ANNOUNCED when it
               arrives instead of appearing in silence to a pupil using a
               reader. The empty-container law exempts a real live region for
               exactly this reason; it is a true label here, not a way round
               the gate. */
            '<p class="std-stretch-nudge" role="status" aria-live="polite"></p>' +
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
          '<p class="std-marquee-status" role="status" aria-live="polite"></p>' +
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
            '<p class="gal-v2-nudge" role="status" aria-live="polite"></p>' +
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
          '<p class="gal-v2-nudge" role="status" aria-live="polite"></p>' +
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
            '<p class="gal-v2-nudge" role="status" aria-live="polite"></p>' +
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


  /* ================= compass (J3 Lesson 1's Find Your Compass) ==============
     HER JOB: answer three either/or questions about the kind of work she
     ENJOYS, and watch a needle settle on the side she leans to.

     THE LAWS THIS ENGINE IS BUILT ON, and they are his (K12/K13):
       IT DECIDES NOTHING. It is where she is standing today, said on screen
         before she taps and again after. The GCSE options window is January's,
         Digital Technology is optional, and choosing neither is a fine answer.
       THE RESULT READS BOTH WAYS (K13d). First the KIND of digital work that
         suits her, in plain words — that answer is true for every girl,
         including one who will never pick DT. The route mapping comes second,
         and only as an if.
       UNDECIDED IS A REAL RESULT, never a failure. A pupil who splits her three
         answers gets a needle that stands up straight and a card that says so.
       SHE CAN CHANGE HER MIND before she commits: taps are free until she
         presses the settle button (the place-all-then-check law again).

     CONFIG-GATED: no other lesson declares a `compass` chunk. */
  Engines.compass = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config || {};
      var pairs = cfg.pairs || [];
      var picks = pairs.map(function () { return null; });

      introCard(host, {
        kicker: chunk.title,
        title: cfg.introTitle || chunk.title,
        text: cfg.intro || '',
        extra: cfg.note ? '<p class="cmp-note">' + esc(cfg.note) + '</p>' : ''
      }, cfg.begin || 'Start', board);

      function board() {
        host.innerHTML = '';
        var rows = pairs.map(function (p, i) {
          return '<div class="cmp-row" data-r="' + i + '">' +
            '<p class="cmp-q">' + esc(p.q || '') + '</p>' +
            '<div class="cmp-sides">' +
            '<button type="button" class="cmp-side" data-side="design" data-r="' + i + '">' + esc(p.design) + '</button>' +
            '<button type="button" class="cmp-side" data-side="build" data-r="' + i + '">' + esc(p.build) + '</button>' +
            '</div></div>';
        }).join('');
        var c = el('<div class="card cmp-card">' +
          '<h2>' + esc(cfg.boardTitle || 'Which one sounds more like you?') + '</h2>' +
          (cfg.boardLead ? '<p class="intro-lead">' + esc(cfg.boardLead) + '</p>' : '') +
          '<div class="cmp-rows">' + rows + '</div>' +
          '<p class="cmp-locked-note">' + esc(cfg.lockedNote ||
            'Answer all three and the button below wakes up.') + '</p>' +
          '<div class="confirm-actions"><button type="button" class="primary-btn cmp-settle" disabled>' +
            esc(cfg.settleLabel || 'Settle my compass') + '</button></div>' +
          '</div>');
        host.appendChild(c);

        c.querySelectorAll('.cmp-side').forEach(function (b) {
          b.onclick = function () {
            var r = Number(b.getAttribute('data-r'));
            picks[r] = b.getAttribute('data-side');
            c.querySelectorAll('.cmp-side[data-r="' + r + '"]').forEach(function (x) { x.classList.remove('on'); });
            b.classList.add('on');
            var all = picks.every(function (v) { return v !== null; });
            c.querySelector('.cmp-settle').disabled = !all;
            /* DFM 205: a locked control says what unlocks it, and the note goes
               the moment it is satisfied. */
            c.querySelector('.cmp-locked-note').hidden = all;
          };
        });
        App.armButton(c.querySelector('.cmp-settle'), settle);
      }

      function settle() {
        /* side 'a' is the designing-and-communicating side, 'b' is the
           building-and-problem-solving side.
           HOW THE FOUR RESULTS ARE REACHED, and why it is four and not three.
           The first cut had a/b/even and read `even` as an equal split — which
           with an ODD number of pairs can never happen, so the "undecided is a
           real answer" result his K13d ruling asks for was unreachable code.
           Found by the cold read of the built lesson, 16 Aug 2026.
           A CLEAN SWEEP (every pair to one side) is a clear lean. ANYTHING ELSE
           is a genuine middle — and it is the honest, common answer on day one —
           so it gets its own result that still tells her which way she tipped.
           Every outcome is a real answer about her; none of them is a failure. */
        /* THE FIELD NAMES ARE `design` / `build`, NEVER `a` / `b`. The packer's
           plaintext-leak guard forbids any `"a":` field in a public lesson file,
           because that is the shape of an answer key — and it caught this engine's
           first cut (16 Aug 2026). The guard is exactly right and was not touched;
           the naming is clearer anyway. */
        var a = picks.filter(function (v) { return v === 'design'; }).length;
        var b = pairs.length - a;
        var lean = a === pairs.length ? 'design' : b === pairs.length ? 'build'
          : a > b ? 'mixedDesign' : 'mixedBuild';
        var r = (cfg.results || {})[lean] || {};
        host.innerHTML = '';
        var deg = { design: -38, mixedDesign: -15, mixedBuild: 15, build: 38 }[lean] || 0;
        var c = el('<div class="card cmp-card cmp-result">' +
          '<div class="cmp-dial"><span class="cmp-dial-a">' + esc(cfg.designLabel || '') + '</span>' +
            '<span class="cmp-dial-b">' + esc(cfg.buildLabel || '') + '</span>' +
            '<span class="cmp-needle" style="--deg:' + deg + 'deg"></span></div>' +
          '<h2>' + esc(r.title || '') + '</h2>' +
          String(r.say || '').split(/\n\s*\n/).map(function (p) {
            return '<p class="intro-lead">' + esc(p.trim()) + '</p>';
          }).join('') +
          (r.route ? '<p class="cmp-route">' + esc(r.route) + '</p>' : '') +
          (cfg.resultNote ? '<p class="cmp-note">' + esc(cfg.resultNote) + '</p>' : '') +
          '<div class="confirm-actions"><button type="button" class="primary-btn cmp-done">' +
            esc(cfg.doneLabel || 'Keep going') + '</button></div>' +
          '</div>');
        host.appendChild(c);
        requestAnimationFrame(function () { c.querySelector('.cmp-needle').classList.add('settled'); });
        App.armButton(c.querySelector('.cmp-done'), function () {
          /* her lean is saved so the January checkpoint (K13a) and the re-aimed
             L14-16 lessons can read it back. It is her own record, nothing else. */
          finishChunk(ctx, 'compass=' + lean);
        });
      }
    }
  };

  /* ================= inspect (J2 Lesson 1's Workshop Safety Inspection) =====
     HER JOB: look at a drawn scene of a DT room, flag the places she thinks
     break a room rule, then FILE THE REPORT and find out.

     THE THREE LAWS THIS ENGINE IS BUILT ON, each of them his:
       PLACE ALL, THEN CHECK (his genuine-consequence law). Nothing is judged
         until she presses File my inspection report. She can flag and unflag
         freely until then, so the screen never force-corrects her and never
         telegraphs an answer by reacting to a click.
       A WRONG FLAG COSTS NOTHING AND EARNS NOTHING (the platform's
         no-punishment logic, experienced before it is described). She is told
         that before she starts, not after she is stung by it.
       EVERY LOCKED CONTROL SAYS WHAT UNLOCKS IT (DFM 205). File my inspection
         report is live from the first moment — filing nothing is a real answer,
         and a scene with nothing wrong in it is a scene she must be able to
         pass. The note under the button says what filing will do.

     CONFIG-GATED: no other lesson declares an `inspect` chunk, so nothing that
     exists today renders one line differently (asserted).
  */
  Engines.inspect = {
    mount: function (host, chunk, ctx) {
      var cfg = chunk.config || {};
      var scenes = cfg.scenes || [];
      var si = 0;
      /* XP IS CARRIED TO THE BADGE, NOT SPENT AS IT IS EARNED. The first cut
         called ctx.addXp() per scene — and the player's context has no such
         method, so every flag she got right would have scored nothing and
         nothing on screen would have said so. Content that names a field the
         engine ignores fails silently and looks fine in the JSON (DFM 155). It
         now accumulates and rides the chunk's own badge, the pattern every
         other scoring engine here uses. */
      var earned = 0;
      /* THE SIX RULES ARE STATED BEFORE SHE IS TESTED ON THEM. Found by the
         cold read, 16 Aug 2026: the inspection was asking her to judge a room
         against six rules the lesson had never put on a screen. That is rule 31
         (teach before test) broken by the activity the lesson is built around,
         and it is also the half of his K4 ruling that says the rules are
         RE-COVERED and then tested. `rules` renders as a real numbered list
         (DFM 171) and `after` is the prose that follows it. */
      introCard(host, {
        kicker: chunk.title,
        title: (cfg.introTitle || chunk.title),
        text: cfg.intro || '',
        steps: cfg.rules || null,
        stepsClass: 'insp-rules',
        /* `after` carries more than one paragraph, and introCard's own after
           field is a single <p> — so the paragraphs are built here rather than
           run together into one wall of text on the screen she reads first. */
        /* A CATCH-UP PUPIL HAS NOBODY BESIDE HER. `after` ends by telling her to
           talk it over with the pupil at the next machine — true in the room,
           false for a girl doing this alone days later (rule 35, and 138.1.6's
           "never an instruction the reader cannot obey where she sits"). Found
           by the cold read; the engine had never read ctx.catchup at all. */
        extra: String((ctx.catchup && cfg.afterSolo) || cfg.after || '').split(/\n\s*\n/).filter(Boolean)
          .map(function (para) { return '<p class="intro-lead">' + esc(para.trim()) + '</p>'; }).join('') +
          (cfg.steps && cfg.steps.length
            ? '<p class="insp-how-lead">' + esc(cfg.howLead || 'How the inspection works:') + '</p><ol class="insp-intro-steps">' +
              cfg.steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>'
            : '')
      }, cfg.begin || 'Start the inspection', showScene);

      function showScene() {
        host.innerHTML = '';
        var sc = scenes[si];
        if (!sc) {
          var badge = Object.assign({}, ctx.chunk.badge || {},
            { xp: Number((ctx.chunk.badge || {}).xp || 0) + earned });
          if (ctx.chunk.badge) {
            ctx._finished = true;
            ctx.awardBadge(badge, 'insp=' + earned).then(function () { ctx.next(); });
          } else finishChunk(ctx, 'insp=' + earned);
          return;
        }
        var flagged = {};
        var filed = false;

        var zones = (sc.zones || []).map(function (z, i) {
          return '<button type="button" class="insp-zone" data-z="' + i + '"' +
            ' style="left:' + z.x + '%;top:' + z.y + '%;width:' + z.w + '%;height:' + z.h + '%"' +
            ' aria-pressed="false">' +
            '<span class="insp-zone-frame"></span>' +
            '<span class="insp-zone-flag" aria-hidden="true">&#9873;</span>' +
            '<span class="insp-zone-name">' + esc(z.name) + '</span>' +
            '</button>';
        }).join('');

        var card = el('<div class="insp">' +
          '<div class="insp-head">' +
            '<span class="insp-tab">' + esc(sc.tab || ('SCENE ' + (si + 1))) + '</span>' +
            '<h2>' + esc(sc.title) + '</h2>' +
            '<p class="insp-lead">' + esc(sc.lead || '') + '</p>' +
          '</div>' +
          '<div class="insp-stage">' +
            '<img class="insp-art" src="' + esc(asset(sc.art)) + '" alt="' + esc(sc.alt || '') + '">' +
            '<div class="insp-zones">' + zones + '</div>' +
          '</div>' +
          '<p class="insp-count" aria-live="polite"></p>' +
          '<div class="insp-actions">' +
            '<button type="button" class="primary-btn insp-file">' + esc(sc.fileLabel || 'File my inspection report') + '</button>' +
            /* AN OPTIONAL SCENE MUST BE REFUSABLE. The stretch scene's own lead
               says "If you would rather stop here, that is fine" and the screen
               gave her no way to stop — a promise with no control behind it, and
               the fail state his K11d stretch depends on. The skip button is a
               real answer, so it sits beside the file button rather than hiding
               under it. */
            (sc.optional
              ? '<button type="button" class="ghost-btn insp-skip">' + esc(sc.skipLabel || 'Stop here') + '</button>'
              : '') +
          '</div>' +
          '<p class="insp-note">' + esc(sc.fileNote || '') + '</p>' +
          '</div>');
        host.appendChild(card);

        var countEl = card.querySelector('.insp-count');
        function paintCount() {
          var n = Object.keys(flagged).length;
          countEl.textContent = n === 0
            ? (sc.noneYet || 'Nothing flagged yet.')
            : (n === 1 ? (cfg.countOne || 'You have flagged 1 place.')
                       : String(cfg.countMany || 'You have flagged {n} places.').replace('{n}', n));
        }
        paintCount();

        card.querySelectorAll('.insp-zone').forEach(function (b) {
          b.onclick = function () {
            if (filed) return;
            var k = b.getAttribute('data-z');
            if (flagged[k]) { delete flagged[k]; b.classList.remove('is-flagged'); b.setAttribute('aria-pressed', 'false'); }
            else { flagged[k] = 1; b.classList.add('is-flagged'); b.setAttribute('aria-pressed', 'true'); }
            paintCount();
          };
        });

        App.armButton(card.querySelector('.insp-file'), function () {
          if (filed) return;
          filed = true;
          report(card, sc, flagged);
        });
        var skipBtn = card.querySelector('.insp-skip');
        if (skipBtn) App.armButton(skipBtn, function () {
          if (filed) return;
          filed = true;
          si = scenes.length;   // an optional scene refused ends the inspection
          showScene();
        });
      }

      /* THE REPORT CARD. Every zone gets a row, in the order she sees them on
         the bench, so nothing is hidden: a correct flag NAMES the rule it
         breaks, a missed one is revealed as missed, and a flag on a station
         that was fine is answered plainly rather than scored. */
      function report(card, sc, flagged) {
        var rows = (sc.zones || []).map(function (z, i) {
          var wasFlagged = !!flagged[i];
          var kind = z.breaks ? (wasFlagged ? 'found' : 'missed') : (wasFlagged ? 'clear' : 'ok');
          var label = {
            found: cfg.labelFound || 'You found it',
            missed: cfg.labelMissed || 'You missed this one',
            clear: cfg.labelClear || 'Nothing wrong here',
            ok: cfg.labelClear || 'Nothing wrong here'
          }[kind];
          return '<li class="insp-row is-' + kind + '">' +
            '<span class="insp-row-tag">' + label + '</span>' +
            '<span class="insp-row-name">' + esc(z.name) + '</span>' +
            '<span class="insp-row-say">' + esc(z.breaks ? z.rule : (wasFlagged ? z.clearSay : z.okSay || z.clearSay)) + '</span>' +
            '</li>';
        }).join('');
        var found = (sc.zones || []).filter(function (z, i) { return z.breaks && flagged[i]; }).length;
        var total = (sc.zones || []).filter(function (z) { return z.breaks; }).length;

        card.querySelectorAll('.insp-zone').forEach(function (b) {
          var i = Number(b.getAttribute('data-z'));
          var z = sc.zones[i];
          b.classList.add('is-done');
          b.classList.add(z.breaks ? (flagged[i] ? 'is-found' : 'is-missed') : (flagged[i] ? 'is-clear' : 'is-fine'));
          /* A FLAG MEANS "I FLAGGED THIS", AND IT MUST GO ON MEANING THAT. The
             first cut marked a MISSED violation with the same flag glyph, so the
             one screen that is supposed to teach her what she overlooked showed
             her a flag she never planted. A symbol a pupil has to decode is an
             undefined term (DFM 149's law, applied to a mark). Missed gets its
             own mark, and the label underneath says the word. */
          var mark = b.querySelector('.insp-zone-flag');
          if (mark && z.breaks && !flagged[i]) mark.textContent = '!';
          var nameEl = b.querySelector('.insp-zone-name');
          if (nameEl) {
            nameEl.textContent = z.breaks
              ? (flagged[i] ? (cfg.labelFound || 'You found it') : (cfg.markMissed || 'Missed'))
              : (flagged[i] ? (cfg.labelClear || 'Nothing wrong here') : '');
          }
          b.disabled = true;
        });
        card.querySelector('.insp-actions').innerHTML = '';
        card.querySelector('.insp-note').textContent = '';
        card.querySelector('.insp-count').textContent = '';

        var rep = el('<div class="insp-report">' +
          '<h3>' + esc(sc.reportTitle || 'Your inspection report') + '</h3>' +
          '<p class="insp-score">' + esc(
            found === total
              ? (total === 1
                  ? (cfg.scoreOne || 'You found the one thing that breaks a rule.')
                  : String(cfg.scoreAll || 'You found all {total} of them.').replace('{total}', total))
              : String(cfg.scoreSome || 'You found {found} of the {total} things that break a rule. The rest are named below.')
                  .replace('{found}', found).replace('{total}', total)) +
          '</p>' +
          '<ul class="insp-rows">' + rows + '</ul>' +
          '<div class="confirm-actions"><button type="button" class="primary-btn insp-next">' +
            esc(sc.nextLabel || 'Next') + '</button></div>' +
          '</div>');
        card.appendChild(rep);
        rep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        App.armButton(rep.querySelector('.insp-next'), function () {
          earned += found * (sc.xpPerFlag || 0) + (found === total ? (sc.xpClean || 0) : 0);
          si += 1;
          showScene();
        });
      }
    }
  };


})(window);
