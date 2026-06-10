/* ============================================================
   Mon Carnet de France  -  front-end (shell slice)
   ------------------------------------------------------------
   ONE codebase, two homes:
   - On the Apps Script page, window.OLS_TRANSPORT routes calls through
     google.script.run (same-origin, carries the verified C2k sign-in).
   - On github.io / local preview, OLS_TRANSPORT is absent, so we fall back
     to an offline stub backed by localStorage. This lets the visuals and the
     whole journey be tested without deploying.
   The four stations are placeholders here; the real content comes later.
   ============================================================ */
(function () {
  'use strict';

  var BOOT = window.OLS_BOOT || { classCode: 'default', baseUrl: '' };
  // Asset base: '' on github.io (relative), absolute github.io URL when served by
  // Apps Script (injected by the assembler) so JS-built <img> paths resolve there.
  var ASSET = window.OLS_ASSET_BASE || '';
  var STATIONS = [1, 2, 3, 4];
  var STATION_NAMES = {
    1: 'La Carte — The map of France',
    2: 'La Cuisine — French food',
    3: 'Le 14 Juillet — Bastille Day',
    4: 'Les Personnes Célèbres — Famous French people'
  };

  // ---- local state ----
  var state = { email: '', name: '', stations: { 1: false, 2: false, 3: false, 4: false }, docUrl: '', data: {} };
  var openStation = null;

  /* ============================================================
     Station 1 - La Carte (drag-and-place map). Reference drag engine:
     Pointer Events only, place-all-then-Check, genuine fail state,
     swap-on-occupied, randomised tray, facts revealed only after Check.
     ============================================================ */
  // facts are the verified, signed-off content-pack text; credit = the Commons
  // attribution for assets/carte/<key>.jpg (sourced + adversarially licence-checked).
  var CITIES = [
    { key: 'paris', name: 'Paris', x: 54.9, y: 25.6,
      fact: "Paris is the capital of France and home to the Eiffel Tower, the most-visited paid monument in the world, with around 6 to 7 million visitors a year. When it was built it was the tallest structure on Earth for over 40 years, until the Chrysler Building was completed in New York in 1930.",
      credit: 'Photo: Guilhem Vellut, via Wikimedia Commons (CC BY 2.0)' },
    { key: 'marseille', name: 'Marseille', x: 77.4, y: 86.5,
      fact: "Marseille is France's oldest city. It was founded around 600 BC by Greek settlers who called it Massalia, and it has been a busy Mediterranean trading port ever since.",
      credit: 'Photo: Ingo Mehling, via Wikimedia Commons (CC BY-SA 3.0)' },
    { key: 'lyon', name: 'Lyon', x: 73.4, y: 59.5,
      fact: "Lyon is famous as the food capital of France. It has thousands of restaurants, and its traditional cosy eateries are called bouchons.",
      credit: 'Photo: Krzysztof Golik, via Wikimedia Commons (CC BY 4.0)' },
    { key: 'toulouse', name: 'Toulouse', x: 48.2, y: 83.2,
      fact: "Toulouse is nicknamed 'the Pink City' (la Ville Rose) because so many of its buildings are made of rosy-pink terracotta brick. It is also the home of Airbus, where giant passenger planes are built.",
      credit: 'Photo: PierreSelim, via Wikimedia Commons (CC BY 3.0)' },
    { key: 'nice', name: 'Nice', x: 91.4, y: 82.0,
      fact: "Nice sits on the sunny French Riviera (the Côte d'Azur) by the sparkling blue Mediterranean Sea. Its long seafront walkway, the Promenade des Anglais, is lined with famous blue chairs.",
      credit: 'Photo: Kristoffer Trolle, via Wikimedia Commons (CC BY 2.0)' },
    { key: 'nantes', name: 'Nantes', x: 25.9, y: 43.5,
      fact: "Nantes was the birthplace of the adventure writer Jules Verne. Today visitors can ride a giant 12-metre mechanical elephant called Les Machines de l'île, inspired by his stories.",
      credit: 'Photo: Mechtraveller, via Wikimedia Commons (CC BY-SA 4.0)' },
    { key: 'strasbourg', name: 'Strasbourg', x: 95.1, y: 28.7,
      fact: "Strasbourg, near the German border, is the official home of the European Parliament, where politicians from across Europe meet. It is also famous for its beautiful Christmas market.",
      credit: 'Photo: Gzen92, via Wikimedia Commons (CC BY-SA 4.0)' },
    { key: 'bordeaux', name: 'Bordeaux', x: 33.2, y: 69.6,
      fact: "Bordeaux is France's wine capital, surrounded by world-famous vineyards. Its grand riverside old town is a UNESCO World Heritage Site nicknamed the 'Port of the Moon' because the river curves like a crescent.",
      credit: "Photo: AlineRockstud68, via Wikimedia Commons (CC BY-SA 4.0)" },
    { key: 'lille', name: 'Lille', x: 60.2, y: 6.1,
      fact: "Lille, in the north of France, hosts the Braderie de Lille, Europe's largest flea market. Every September the whole city fills with thousands of stalls and millions of visitors.",
      credit: 'Photo: Velvet, via Wikimedia Commons (CC BY-SA 3.0)' }
  ];
  function cityByKey(k) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i].key === k) return CITIES[i]; return null; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var s1 = { built: false, home: {}, occ: {}, cards: [], idx: 0, mapDone: false };   // home[city]='tray'|dotKey ; occ[dotKey]=city|null ; cards=revealed cities (first-correct order)
  var drag = null;
  var DRAG_THRESH = 6;

  function st1El(sel) { return document.getElementById('st1').querySelector(sel); }
  function tagEl(city) { return document.getElementById('st1').querySelector('.tag[data-city="' + city + '"]'); }
  function dotEl(key) { return document.getElementById('carte-map').querySelector('.dot[data-dot="' + key + '"]'); }

  function openStation1() {
    show($('st1'));
    if (!s1.built) buildStation1();
  }
  function closeStation1() { if (s1.built) { captureCarte(); persist(); } closeCarousel(); hide($('st1')); }

  function buildStation1() {
    s1.built = true;
    var map = $('carte-map'), tray = $('carte-tray');
    map.querySelectorAll('.dot, .tag').forEach(function (e) { e.remove(); });
    tray.innerHTML = '';
    s1.home = {}; s1.occ = {}; s1.cards = []; s1.idx = 0; s1.mapDone = false;
    CITIES.forEach(function (c) {
      var d = document.createElement('div');
      d.className = 'dot'; d.dataset.dot = c.key; d.style.left = c.x + '%'; d.style.top = c.y + '%';
      map.appendChild(d); s1.occ[c.key] = null;
    });
    shuffle(CITIES).forEach(function (c) {
      var t = document.createElement('button');
      t.type = 'button'; t.className = 'tag'; t.dataset.city = c.key; t.textContent = c.name;
      t.addEventListener('pointerdown', onTagDown);
      t.addEventListener('click', onTagClick);
      tray.appendChild(t); s1.home[c.key] = 'tray';
    });

    // Restore any previously-correct cities (partial OR complete): they lock back
    // in place and their cards rebuild, in the saved first-correct order. This lets
    // map progress and the discovered-city carousel survive a close/reopen.
    var saved = state.data['1'] || {};
    var correctKeys = (saved.correct || []).filter(function (k) { return cityByKey(k); });
    correctKeys.forEach(function (key) {
      s1.home[key] = key; s1.occ[key] = key; renderTag(key);
      tagEl(key).classList.add('correct'); dotEl(key).classList.add('correct');
    });
    s1.cards = correctKeys.slice();
    buildCarousel(); updateCardsBtn();

    if (saved.complete || correctKeys.length === 9) {
      s1.mapDone = true;
      $('carte-check').hidden = true; show($('carte-write'));
      if ($('carte-text')) $('carte-text').value = saved.writeup || '';
      updateCarteWrite();
      st1El('#st1-instr').textContent = 'All nine cities placed! Tap any city (or "Mes villes") to revisit its facts, then add your last sentence below.';
    }
    updateCount();
  }

  function onTagDown(e) {
    var el = e.currentTarget;
    if (el.classList.contains('correct')) return;     // locked
    e.preventDefault();
    document.body.classList.add('dragging-active');   // lock selection from the first touch (stops stray highlighting)
    var r = el.getBoundingClientRect();
    drag = { city: el.dataset.city, el: el, pid: e.pointerId, sx: e.clientX, sy: e.clientY,
      offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, moved: false };
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    el.addEventListener('pointermove', onTagMove);
    el.addEventListener('pointerup', onTagUp);
    el.addEventListener('pointercancel', onTagCancel);
  }
  // A correctly-placed (locked) city is tappable: open its card, so the pupil can
  // re-read its facts any time - including while writing the end piece.
  function onTagClick(e) {
    var el = e.currentTarget;
    if (!el.classList.contains('correct')) return;
    var idx = s1.cards.indexOf(el.dataset.city);
    if (idx >= 0) openCarousel(idx);
  }
  function onTagMove(e) {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < DRAG_THRESH) return;
      drag.moved = true;
      document.body.classList.add('dragging-active');
      drag.el.classList.add('dragging');
      drag.el.style.width = drag.w + 'px';
    }
    drag.el.style.left = (e.clientX - drag.offX) + 'px';
    drag.el.style.top = (e.clientY - drag.offY) + 'px';
  }
  function endDragListeners(el) {
    el.removeEventListener('pointermove', onTagMove);
    el.removeEventListener('pointerup', onTagUp);
    el.removeEventListener('pointercancel', onTagCancel);
  }
  function onTagUp(e) {
    if (!drag) return;
    var el = drag.el, city = drag.city, moved = drag.moved;
    try { el.releasePointerCapture(drag.pid); } catch (x) {}
    endDragListeners(el);
    document.body.classList.remove('dragging-active');
    el.classList.remove('dragging'); el.style.width = '';
    if (moved) {
      var target = nearestDot(e.clientX, e.clientY);
      if (target) placeOnDot(city, target); else sendToTray(city);
      updateCount();
    }
    drag = null;
  }
  function onTagCancel() {
    if (!drag) return;
    try { drag.el.releasePointerCapture(drag.pid); } catch (x) {}
    endDragListeners(drag.el);
    document.body.classList.remove('dragging-active');
    drag.el.classList.remove('dragging'); drag.el.style.width = '';
    renderTag(drag.city);
    drag = null;
  }
  function nearestDot(cx, cy) {
    var r = $('carte-map').getBoundingClientRect();
    var px = (cx - r.left) / r.width * 100, py = (cy - r.top) / r.height * 100;
    var best = null, bestD = 1e9;
    CITIES.forEach(function (c) { var dd = (c.x - px) * (c.x - px) + (c.y - py) * (c.y - py); if (dd < bestD) { bestD = dd; best = c.key; } });
    return bestD <= 90 ? best : null;     // generous catch radius (~9.5%)
  }
  function placeOnDot(city, dot) {
    var prev = s1.home[city], occ = s1.occ[dot];
    if (occ && occ !== city) {
      if (prev && prev !== 'tray') { s1.occ[prev] = occ; s1.home[occ] = prev; }
      else { s1.home[occ] = 'tray'; }
    } else if (prev && prev !== 'tray' && prev !== dot) {
      s1.occ[prev] = null;
    }
    s1.occ[dot] = city; s1.home[city] = dot;
    renderTag(city);
    if (occ && occ !== city) renderTag(occ);
  }
  function sendToTray(city) {
    var prev = s1.home[city];
    if (prev && prev !== 'tray') s1.occ[prev] = null;
    s1.home[city] = 'tray';
    renderTag(city);
  }
  function renderTag(city) {
    var el = tagEl(city), home = s1.home[city];
    el.classList.remove('wrong');
    if (home === 'tray') {
      el.classList.remove('placed'); el.style.left = ''; el.style.top = '';
      $('carte-tray').appendChild(el);
    } else {
      var c = cityByKey(home);
      el.classList.add('placed'); el.style.left = c.x + '%'; el.style.top = c.y + '%';
      $('carte-map').appendChild(el);
    }
    refreshDots();
  }
  function refreshDots() {
    CITIES.forEach(function (c) {
      var d = dotEl(c.key);
      if (!d) return;
      d.classList.toggle('occupied', s1.occ[c.key] != null && !d.classList.contains('correct'));
    });
  }
  function placedCount() { var n = 0; CITIES.forEach(function (c) { if (s1.home[c.key] !== 'tray') n++; }); return n; }
  function updateCount() {
    var p = placedCount();
    $('st1-count').textContent = p + ' / 9 placed';
    $('carte-check').disabled = p < 9;
    var stage = document.querySelector('#st1 .carte-stage');
    if (stage) stage.classList.toggle('no-tray', p === 9);   // empty tray -> collapse the column, centre the map
  }
  /* ---- discovered-city cards: a swipeable carousel revealed on Check ---- */
  var cdrag = null;
  function cardHtml(c) {
    return '<article class="city-card">' +
      '<div class="city-card-photo">' +
        '<img src="' + ASSET + 'assets/carte/' + c.key + '.jpg" alt="' + escapeHtml(c.name) + '" draggable="false">' +
        (c.credit ? '<span class="city-card-credit">' + escapeHtml(c.credit) + '</span>' : '') +
      '</div>' +
      '<div class="city-card-flag" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<div class="city-card-body">' +
        '<h3><span class="pin" aria-hidden="true">📍</span>' + escapeHtml(c.name) + '</h3>' +
        '<p>' + escapeHtml(c.fact) + '</p>' +
      '</div>' +
    '</article>';
  }
  function buildCarousel() {
    var track = $('carte-track'); if (!track) return;
    track.innerHTML = s1.cards.map(function (k) { return cardHtml(cityByKey(k)); }).join('');
    $('carte-dots').innerHTML = s1.cards.map(function () { return '<b></b>'; }).join('');
    if (s1.idx > s1.cards.length - 1) s1.idx = Math.max(0, s1.cards.length - 1);
    layoutCarousel(false);
  }
  function layoutCarousel(animate) {
    var track = $('carte-track'); if (!track) return;
    track.classList.toggle('animate', !!animate);
    track.style.transform = 'translateX(' + (-s1.idx * 100) + '%)';
    var dots = $('carte-dots').children;
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === s1.idx);
    if ($('carte-prev')) $('carte-prev').disabled = s1.idx <= 0;
    if ($('carte-next')) $('carte-next').disabled = s1.idx >= s1.cards.length - 1;
  }
  function openCarousel(i) {
    if (!s1.cards.length) return;
    s1.idx = Math.max(0, Math.min(i || 0, s1.cards.length - 1));
    show($('carte-carousel'));
    layoutCarousel(false);
  }
  function closeCarousel() { hide($('carte-carousel')); }
  function gotoCard(i) { s1.idx = Math.max(0, Math.min(i, s1.cards.length - 1)); layoutCarousel(true); }
  function updateCardsBtn() {
    var btn = $('carte-cards-btn'); if (!btn) return;
    btn.hidden = s1.cards.length === 0;
    if ($('carte-cards-n')) $('carte-cards-n').textContent = '(' + s1.cards.length + ')';
  }
  function carouselVp() { return document.querySelector('#carte-carousel .carousel-viewport'); }
  function carouselDown(e) {
    if (!s1.cards.length) return;
    var vp = carouselVp();
    cdrag = { x: e.clientX, w: vp.getBoundingClientRect().width || 1, pid: e.pointerId };
    $('carte-track').classList.remove('animate');
    vp.addEventListener('pointermove', carouselMove);
    vp.addEventListener('pointerup', carouselUp);
    vp.addEventListener('pointercancel', carouselUp);
    try { vp.setPointerCapture(e.pointerId); } catch (x) {}
  }
  function carouselMove(e) {
    if (!cdrag) return;
    var dx = e.clientX - cdrag.x;
    $('carte-track').style.transform = 'translateX(' + (-s1.idx * 100 + dx / cdrag.w * 100) + '%)';
  }
  function carouselUp(e) {
    if (!cdrag) return;
    var vp = carouselVp();
    vp.removeEventListener('pointermove', carouselMove);
    vp.removeEventListener('pointerup', carouselUp);
    vp.removeEventListener('pointercancel', carouselUp);
    try { vp.releasePointerCapture(cdrag.pid); } catch (x) {}
    var dx = e.clientX - cdrag.x, thr = cdrag.w * 0.18, ni = s1.idx;
    if (dx <= -thr) ni = s1.idx + 1; else if (dx >= thr) ni = s1.idx - 1;
    cdrag = null;
    gotoCard(ni);
  }

  /* ---- own-words write-up (revealed once the map is complete) ---- */
  function carteWords() { var s = ($('carte-text') ? $('carte-text').value : '').trim(); return s ? s.split(/\s+/).length : 0; }
  function updateCarteWrite() {
    var w = carteWords(), ok = s1.mapDone && w >= 5;
    if ($('carte-done')) $('carte-done').disabled = !ok;
    if ($('carte-wc')) $('carte-wc').textContent = w >= 5 ? (w + ' words') : ('Write a sentence or two (' + w + '/5+ words)');
  }
  function captureCarte() {
    var w = carteWords();
    state.data['1'] = { correct: s1.cards.slice(), writeup: ($('carte-text') ? $('carte-text').value : '').trim(), complete: s1.mapDone && w >= 5 };
    return state.data['1'].complete;
  }
  function finishCarte() { if (captureCarte()) markStationDone(1); closeStation1(); }
  function checkStation1() {
    // 1) lock the correct ones; remember which are newly-correct this round
    var newly = [];
    CITIES.forEach(function (c) {
      if (s1.home[c.key] === c.key) {
        var el = tagEl(c.key);
        if (!el.classList.contains('correct')) { el.classList.add('correct'); dotEl(c.key).classList.add('correct'); }
        if (s1.cards.indexOf(c.key) === -1) newly.push(c.key);
      }
    });
    // 2) bounce the wrong ones back to the tray (genuine fail state, no giveaway)
    CITIES.forEach(function (c) {
      var home = s1.home[c.key];
      if (home !== 'tray' && home !== c.key) {
        tagEl(c.key).classList.add('wrong');
        (function (city) { setTimeout(function () { sendToTray(city); updateCount(); }, 550); })(c.key);
      }
    });
    var correct = 0; CITIES.forEach(function (c) { if (s1.home[c.key] === c.key) correct++; });

    // 3) CELEBRATE the newly-correct cities ON THE MAP first - a staggered pop on
    //    each - so the pupil sees which ones she got right and forms the visual
    //    link. ONLY THEN (after the celebration) reveal their cards in the carousel.
    if (newly.length) {
      var firstNew = s1.cards.length;
      var stagger = Math.min(110, Math.round(700 / newly.length));
      newly.forEach(function (k, i) {
        var el = tagEl(k);
        el.style.animationDelay = (i * stagger) + 'ms';
        el.classList.add('just-correct');
        setTimeout(function () { el.classList.remove('just-correct'); el.style.animationDelay = ''; }, i * stagger + 650);
        s1.cards.push(k);
      });
      buildCarousel(); updateCardsBtn();
      var lastPopEnds = (newly.length - 1) * stagger + 550;   // 550 = pop animation duration
      var openDelay = lastPopEnds + 1000;                      // hold on the green map so the pupil can take in what she got right
      setTimeout(function () { if (!$('st1').hidden) openCarousel(firstNew); }, openDelay);
    }

    var msg = $('carte-msg');
    if (correct === 9) {
      msg.textContent = 'Parfait ! All nine cities in the right place.'; msg.className = 'sv-msg good';
      s1.mapDone = true;
      $('carte-check').hidden = true; show($('carte-write'));
      st1El('#st1-instr').textContent = 'All nine cities placed! Tap any city to revisit its facts, then add your last sentence below.';
      updateCarteWrite();
    } else {
      msg.textContent = correct + ' of 9 correct. The ones in the wrong place have come back — try them again.'; msg.className = 'sv-msg';
      setTimeout(updateCount, 600);
    }
    captureCarte(); persist();   // persist correct list so the carousel survives a reopen
  }

  /* ============================================================
     Station 2 - La Cuisine. Same Pointer Events drag model, but drop
     targets are containers (.dropzone). Opinion task (no right/wrong);
     the gate is a typed reason for every sorted dish.
     ============================================================ */
  var DISHES = [
    { key: 'croissant', name: 'Croissant', desc: 'A flaky, buttery pastry shaped like a crescent moon, usually eaten at breakfast. It is made from many thin folded layers of dough.' },
    { key: 'crepe', name: 'Crêpe', desc: 'A very thin pancake that can be sweet or savoury. Sweet crêpes are often filled with chocolate spread, sugar and lemon, or jam.' },
    { key: 'quiche', name: 'Quiche lorraine', desc: 'A savoury open tart with a pastry case filled with baked eggs, cream and pieces of bacon. Served warm or cold, often for lunch.' },
    { key: 'ratatouille', name: 'Ratatouille', desc: 'A colourful vegetable stew of aubergine, courgette, peppers, onion and tomato, cooked slowly with herbs. Suitable for vegetarians.' },
    { key: 'steakfrites', name: 'Steak-frites', desc: 'A steak served with a generous helping of French fries (chips). One of the most common meals in French cafés and bistros.' },
    { key: 'macaron', name: 'Macaron', desc: 'A small, round, brightly coloured sandwich biscuit made from ground almonds, with a soft creamy filling. Flavours like raspberry, chocolate and pistachio.' },
    { key: 'camembert', name: 'Camembert', desc: "A soft, creamy cow's-milk cheese with a white rind, sold as a round wheel. It becomes gooey in the middle and is often spread on bread." },
    { key: 'tartetatin', name: 'Tarte Tatin', desc: 'An upside-down apple tart. The apples are caramelised in butter and sugar, covered with pastry, and turned over after baking.' },
    { key: 'bouillabaisse', name: 'Bouillabaisse', desc: 'A rich fish stew from Marseille, made with several kinds of fish and shellfish in a herb-and-spice broth, usually served with bread.' },
    { key: 'escargots', name: 'Escargots', desc: 'Cooked snails served hot in their shells with garlic-and-parsley butter, eaten as a starter with a small fork. The most adventurous dish here!' }
  ];
  function dishByKey(k) { for (var i = 0; i < DISHES.length; i++) if (DISHES[i].key === k) return DISHES[i]; return null; }

  var s2 = { built: false, zone: {}, reason: {} };
  var drag2 = null;

  function openStation2() { show($('st2')); if (!s2.built) buildStation2(); }
  function closeStation2() { captureCuisine(); persist(); hide($('dish-info')); hide($('st2')); }

  function dishEl(key) { return document.getElementById('st2').querySelector('.dish[data-key="' + key + '"]'); }

  function buildStation2() {
    s2.built = true;
    $('cuis-tray').innerHTML = '';
    $('basket-yes').querySelector('.basket-list').innerHTML = '';
    $('basket-no').querySelector('.basket-list').innerHTML = '';
    s2.zone = {}; s2.reason = {};
    var saved = state.data['2'];
    shuffle(DISHES).forEach(function (d) {
      var li = document.createElement('li'); li.className = 'dish'; li.dataset.key = d.key;
      var grip = document.createElement('button'); grip.type = 'button'; grip.className = 'dish-grip';
      grip.innerHTML = '<img src="' + ASSET + 'assets/cuisine/' + d.key + '.jpg" alt="' + escapeHtml(d.name) + '"><span class="dish-name">' + escapeHtml(d.name) + '</span>';
      grip.addEventListener('pointerdown', onDishDown);
      var why = document.createElement('input'); why.className = 'dish-why'; why.type = 'text'; why.maxLength = 160; why.placeholder = 'because…'; why.hidden = true;
      why.addEventListener('input', function () { s2.reason[d.key] = why.value; refreshWhy(d.key); checkCuisineDone(); });
      li.appendChild(grip); li.appendChild(why);
      $('cuis-tray').appendChild(li);
      s2.zone[d.key] = 'tray'; s2.reason[d.key] = '';
    });
    if (saved && saved.items) {
      saved.items.forEach(function (it) {
        s2.zone[it.key] = it.basket || 'tray'; s2.reason[it.key] = it.reason || '';
        var el = dishEl(it.key); if (el) { el.querySelector('.dish-why').value = it.reason || ''; renderDish(it.key); }
      });
    }
    updateCuisineCount(); checkCuisineDone();
  }

  function onDishDown(e) {
    var li = e.currentTarget.parentElement;
    e.preventDefault();
    document.body.classList.add('dragging-active');   // lock selection from the very first touch, not just after the drag threshold (stops stray text/element highlighting in Safari)
    var r = li.getBoundingClientRect();
    drag2 = { key: li.dataset.key, el: li, grip: e.currentTarget, pid: e.pointerId, sx: e.clientX, sy: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {}
    e.currentTarget.addEventListener('pointermove', onDishMove);
    e.currentTarget.addEventListener('pointerup', onDishUp);
    e.currentTarget.addEventListener('pointercancel', onDishCancel);
  }
  function onDishMove(e) {
    if (!drag2) return;
    if (!drag2.moved) {
      if (Math.abs(e.clientX - drag2.sx) + Math.abs(e.clientY - drag2.sy) < DRAG_THRESH) return;
      drag2.moved = true; document.body.classList.add('dragging-active');
      drag2.el.classList.add('dragging'); drag2.el.style.width = drag2.w + 'px';
    }
    drag2.el.style.left = (e.clientX - drag2.offX) + 'px';
    drag2.el.style.top = (e.clientY - drag2.offY) + 'px';
    hoverZone(e.clientX, e.clientY);
  }
  function endDish(grip) { grip.removeEventListener('pointermove', onDishMove); grip.removeEventListener('pointerup', onDishUp); grip.removeEventListener('pointercancel', onDishCancel); }
  function onDishUp(e) {
    if (!drag2) return;
    var key = drag2.key, moved = drag2.moved, el = drag2.el, grip = drag2.grip;
    try { grip.releasePointerCapture(drag2.pid); } catch (x) {}
    endDish(grip); clearHover();
    document.body.classList.remove('dragging-active');
    el.classList.remove('dragging'); el.style.width = ''; el.style.left = ''; el.style.top = '';
    if (!moved) { drag2 = null; showDishInfo(key); return; }
    var zone = zoneAt(e.clientX, e.clientY, el);
    if (zone) s2.zone[key] = zone;
    renderDish(key); updateCuisineCount(); checkCuisineDone();
    drag2 = null;
  }
  function onDishCancel() {
    if (!drag2) return;
    try { drag2.grip.releasePointerCapture(drag2.pid); } catch (x) {}
    endDish(drag2.grip); clearHover();
    document.body.classList.remove('dragging-active');
    drag2.el.classList.remove('dragging'); drag2.el.style.width = ''; drag2.el.style.left = ''; drag2.el.style.top = '';
    renderDish(drag2.key); drag2 = null;
  }
  function zoneAt(x, y, exclude) {
    exclude.style.pointerEvents = 'none';
    var els = document.elementsFromPoint(x, y), zone = null;
    for (var i = 0; i < els.length; i++) { var z = els[i].closest && els[i].closest('.dropzone'); if (z) { zone = z.dataset.zone; break; } }
    exclude.style.pointerEvents = '';
    return zone;
  }
  function hoverZone(x, y) {
    clearHover(); if (!drag2) return;
    drag2.el.style.pointerEvents = 'none';
    var els = document.elementsFromPoint(x, y);
    drag2.el.style.pointerEvents = '';
    for (var i = 0; i < els.length; i++) { var z = els[i].closest && els[i].closest('.dropzone'); if (z) { z.classList.add('drop-hover'); break; } }
  }
  function clearHover() { document.querySelectorAll('#st2 .drop-hover').forEach(function (e) { e.classList.remove('drop-hover'); }); }

  function renderDish(key) {
    var el = dishEl(key), zone = s2.zone[key], why = el.querySelector('.dish-why');
    el.style.left = ''; el.style.top = '';
    if (zone === 'tray') { $('cuis-tray').appendChild(el); why.hidden = true; }
    else { (zone === 'yes' ? $('basket-yes') : $('basket-no')).querySelector('.basket-list').appendChild(el); why.hidden = false; }
    refreshWhy(key);
  }
  function refreshWhy(key) {
    var why = dishEl(key).querySelector('.dish-why');
    if (why.hidden) return;
    var has = (s2.reason[key] || '').trim().length > 0;
    why.classList.toggle('needed', !has); why.classList.toggle('ok', has);
  }
  function sortedCount() { var n = 0; DISHES.forEach(function (d) { if (s2.zone[d.key] !== 'tray') n++; }); return n; }
  function updateCuisineCount() { $('st2-count').textContent = sortedCount() + ' / 10 sorted'; }
  function captureCuisine() {
    var allSorted = sortedCount() === 10;
    var allReasons = DISHES.every(function (d) { return s2.zone[d.key] === 'tray' || (s2.reason[d.key] || '').trim().length > 0; });
    state.data['2'] = { items: DISHES.map(function (d) { return { key: d.key, basket: s2.zone[d.key], reason: (s2.reason[d.key] || '').trim() }; }), complete: allSorted && allReasons };
    return state.data['2'].complete;
  }
  function checkCuisineDone() {
    var done = captureCuisine();
    $('cuis-done').disabled = !done;
    var msg = $('cuis-msg');
    if (done) { msg.textContent = 'All sorted with a reason for each — magnifique !'; msg.className = 'sv-msg good'; }
    else if (sortedCount() === 10) { msg.textContent = 'Almost! Add a reason (because…) for every dish.'; msg.className = 'sv-msg'; }
    else { msg.textContent = 'Sort all 10 dishes into a basket, then give a reason for each.'; msg.className = 'sv-msg'; }
  }
  function showDishInfo(key) {
    var d = dishByKey(key);
    $('dish-info-name').textContent = d.name; $('dish-info-text').textContent = d.desc;
    show($('dish-info'));
  }
  function finishCuisine() {
    if (captureCuisine()) markStationDone(2);
    closeStation2();
  }

  /* ============================================================
     Station 3 - Le 14 Juillet. "ALLUME LE CIEL" / Light up the sky.
     A short how/why quiz over a real night photo of the Eiffel Tower:
     each correct answer launches a real (CSS-animated) firework that
     arcs up and bursts in colour; a wrong answer fires nothing (a real
     consequence) and you try again. All six fills the sky, then a
     finale, then the own-words how/why write-up that feeds the Doc.
     ============================================================ */
  var BD_Q = [
    { q: 'Why do French people celebrate on 14 July?',
      opts: ['It remembers the storming of the Bastille in 1789, at the start of the French Revolution', "It is the King of France's birthday", 'It is the day France won the football World Cup', 'It marks the end of the school year'],
      correct: 0, explain: 'On 14 July 1789 the people of Paris stormed the Bastille, a royal prison that stood for unfair rule. It became the symbol of the Revolution and of liberty.' },
    { q: 'What happens in Paris on the morning of 14 July?',
      opts: ['A grand military parade down the Champs-Élysées', 'A big city marathon', 'A hot-air balloon race', 'A flower market'],
      correct: 0, explain: 'A famous military parade marches down the Champs-Élysées, watched by the President — one of the oldest regular parades in Europe.' },
    { q: 'What do the jets trail across the sky in the flypast?',
      opts: ['Blue, white and red — the colours of the French flag', 'Green, white and orange', 'Just plain white smoke', 'Gold sparkles'],
      correct: 0, explain: 'Jets fly over Paris trailing blue, white and red smoke — the three colours of the French tricolore flag.' },
    { q: 'Where is the famous fireworks display held at night?',
      opts: ['Around the Eiffel Tower', 'Inside the Louvre museum', 'On the roof of Notre-Dame', 'At Disneyland Paris'],
      correct: 0, explain: 'When night falls, a spectacular fireworks display lights up the sky around the Eiffel Tower.' },
    { q: 'Which French motto is remembered on this day?',
      opts: ['Liberté, égalité, fraternité (liberty, equality, brotherhood)', 'Bonjour, merci, au revoir', 'Vive le roi (long live the king)', 'Allez les Bleus'],
      correct: 0, explain: 'Liberté, égalité, fraternité — liberty, equality and brotherhood — are the ideals of the Revolution and the motto of France.' },
    { q: 'What are the "bals des pompiers"?',
      opts: ['Parties with music and dancing held at local fire stations', 'A type of French firework', 'A military march', 'A famous French cake'],
      correct: 0, explain: "All over France there are village fêtes and the popular bals des pompiers — firefighters' balls — with music and dancing at local fire stations." }
  ];
  var BD_MIN = 80;
  var FW_COLORS = ['#E4B824', '#ffffff', '#EF4135', '#4d8bff', '#ff7ad9', '#5ce1a6'];
  var s3 = { built: false, qi: 0, done: 0 };

  function openStation3() { show($('st3')); if (!s3.built) buildStation3(); }
  function closeStation3() { captureBday(); persist(); hide($('st3')); }

  function buildStation3() {
    s3.built = true; s3.qi = 0; s3.done = 0;
    $('bd-sky').querySelectorAll('.rocket, .spark, .flash').forEach(function (e) { e.remove(); });
    var saved = state.data['3'];
    if (saved && saved.complete) {
      s3.done = BD_Q.length;
      hide($('bd-quiz')); $('st3-count').textContent = BD_Q.length + ' / ' + BD_Q.length + ' fireworks';
      $('bd-msg').textContent = 'Joyeux 14 Juillet ! You lit up the whole sky.'; $('bd-msg').className = 'sv-msg good';
      show($('bd-write')); $('bd-text').value = saved.writeup || ''; updateBdWrite();
      return;
    }
    show($('bd-quiz')); hide($('bd-write'));
    $('bd-msg').textContent = ''; $('bd-msg').className = 'sv-msg';
    updateBdCount(); showQuestion(0);
  }

  function updateBdCount() { $('st3-count').textContent = s3.done + ' / ' + BD_Q.length + ' fireworks'; }

  function showQuestion(i) {
    s3.qi = i; var q = BD_Q[i];
    $('q-num').textContent = 'Question ' + (i + 1) + ' of ' + BD_Q.length;
    $('q-prompt').textContent = q.q;
    $('q-feedback').textContent = ''; $('q-feedback').className = 'q-feedback';
    var box = $('q-options'); box.innerHTML = '';
    shuffle(q.opts.map(function (_, idx) { return idx; })).forEach(function (idx) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'q-opt'; b.textContent = q.opts[idx];
      b.addEventListener('click', function () { onOption(b, idx, q); });
      box.appendChild(b);
    });
  }

  function onOption(btn, idx, q) {
    if (btn.disabled) return;
    if (idx === q.correct) {
      btn.classList.add('correct');
      $('q-options').querySelectorAll('.q-opt').forEach(function (b) { b.disabled = true; });
      $('q-feedback').textContent = 'Correct! ' + q.explain; $('q-feedback').className = 'q-feedback good';
      s3.done++; updateBdCount();
      launchFirework();
      setTimeout(function () { if (s3.done >= BD_Q.length) bdFinale(); else showQuestion(s3.qi + 1); }, 1700);
    } else {
      btn.classList.add('wrong-locked'); btn.disabled = true;
      $('q-feedback').textContent = 'Not quite — try another answer.'; $('q-feedback').className = 'q-feedback bad';
    }
  }

  /* ---- fireworks ---- */
  function launchFirework() {
    fireRocket(20 + Math.random() * 60, 14 + Math.random() * 24, FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)]);
  }
  function fireRocket(xPct, yPct, color) {
    var sky = $('bd-sky'); var h = sky.getBoundingClientRect().height || 320;
    var rocket = document.createElement('div'); rocket.className = 'rocket'; rocket.style.left = xPct + '%';
    sky.appendChild(rocket);
    var rise = (100 - yPct) / 100 * h;
    setTimeout(function () { rocket.style.transform = 'translateY(-' + rise + 'px)'; }, 20);
    setTimeout(function () { if (rocket.parentNode) rocket.parentNode.removeChild(rocket); burst(xPct, yPct, color); }, 650);
  }
  function burst(xPct, yPct, color) {
    var sky = $('bd-sky');
    var flash = document.createElement('div'); flash.className = 'flash'; flash.style.left = xPct + '%'; flash.style.top = yPct + '%';
    sky.appendChild(flash); setTimeout(function () { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 520);
    for (var i = 0; i < 26; i++) {
      var s = document.createElement('span'); s.className = 'spark';
      var ang = (i / 26) * Math.PI * 2, dist = 36 + Math.random() * 46;
      s.style.left = xPct + '%'; s.style.top = yPct + '%'; s.style.background = color; s.style.color = color;
      s.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px'); s.style.setProperty('--dy', (Math.sin(ang) * dist) + 'px');
      sky.appendChild(s);
      (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1100); })(s);
    }
  }
  function bdFinale() {
    hide($('bd-quiz'));
    for (var i = 0; i < 8; i++) { (function (n) { setTimeout(launchFirework, n * 260); })(i); }
    $('bd-msg').textContent = 'Joyeux 14 Juillet ! You lit up the whole sky. It all remembers the storming of the Bastille in 1789 and the ideas of liberte, egalite, fraternite.';
    $('bd-msg').className = 'sv-msg good';
    show($('bd-write')); updateBdWrite();
  }

  function updateBdWrite() {
    var txt = ($('bd-text').value || '').trim();
    var ok = txt.length >= BD_MIN;
    $('bd-done').disabled = !ok;
    $('bd-wc').textContent = ok ? "Great — that's plenty for your project." : 'Write a little more (' + txt.length + '/' + BD_MIN + ' characters).';
    $('bd-wc').className = ok ? 'sv-msg good' : 'sv-msg';
  }
  function captureBday() {
    var quizDone = s3.done >= BD_Q.length;
    var writeup = ($('bd-text') ? $('bd-text').value : '').trim();
    state.data['3'] = { quizDone: quizDone, writeup: writeup, complete: quizDone && writeup.length >= BD_MIN };
    return state.data['3'].complete;
  }
  function finishBday() { if (captureBday()) markStationDone(3); closeStation3(); }

  /* ============================================================
     Station 4 - Les Personnes Célèbres. Match each achievement chip to
     the right person (place-on-target + swap engine, fail state), then
     pick a favourite and write <=100 words on why you admire them.
     ============================================================ */
  var PEOPLE = [
    { key: 'curie', name: 'Marie Curie', short: 'Won Nobel Prizes in two different sciences', full: 'A Polish-born French scientist who studied radioactivity — the only person to win Nobel Prizes in two different sciences (Physics 1903, Chemistry 1911), and the first woman ever to win a Nobel Prize.' },
    { key: 'monet', name: 'Claude Monet', short: 'Helped start Impressionist painting', full: "A painter who helped start Impressionism — his painting 'Impression, Sunrise' gave the movement its name. Famous for his water-lily paintings at Giverny." },
    { key: 'pasteur', name: 'Louis Pasteur', short: 'Showed that germs cause disease', full: "A scientist who showed that tiny germs cause many diseases. He developed vaccines, including the first against rabies, and invented 'pasteurisation' to keep milk and drinks safe." },
    { key: 'piaf', name: 'Édith Piaf', short: "One of France's best-loved singers", full: "One of France's most beloved singers, famous for 'La Vie en Rose' and 'Non, je ne regrette rien'. She rose from a very poor childhood to worldwide fame." },
    { key: 'joan', name: "Jeanne d'Arc", short: 'Led French soldiers to victory in 1429', full: "A teenage girl who, believing she was guided by her faith, led French soldiers to victory at Orléans in 1429 during the Hundred Years' War. A patron saint of France, made a saint in 1920." },
    { key: 'germain', name: 'Sophie Germain', short: 'A self-taught mathematician', full: 'A mathematician who taught herself maths in secret as a girl, when women were not allowed to study it — the first woman to win a top prize from the French Academy of Sciences.' }
  ];
  function personByKey(k) { for (var i = 0; i < PEOPLE.length; i++) if (PEOPLE[i].key === k) return PEOPLE[i]; return null; }
  function wordCount(s) { s = (s || '').trim(); return s ? s.split(/\s+/).length : 0; }
  var s4 = { built: false, occ: {}, chipHome: {}, pick: false, fav: '' };
  var drag4 = null;

  function openStation4() { show($('st4')); if (!s4.built) buildStation4(); }
  function closeStation4() { captureCeleb(); persist(); hide($('st4')); }
  function rowEl(key) { return document.getElementById('ppl-rows').querySelector('.match-row[data-row="' + key + '"]'); }
  function chipEl(key) { return document.getElementById('ppl-rows').querySelector('.match-chip[data-chip="' + key + '"]'); }
  function derange(keys) { var a, t = 0; do { a = shuffle(keys); t++; } while (t < 60 && a.some(function (k, i) { return k === keys[i]; })); return a; }

  function buildStation4() {
    s4.built = true;
    var list = $('ppl-rows'); list.innerHTML = '';
    s4.occ = {}; s4.chipHome = {}; s4.pick = false; s4.fav = '';
    var order = PEOPLE.map(function (p) { return p.key; });
    var saved = state.data['4'];
    var chipForRow = (saved && saved.complete) ? order.slice() : derange(order);
    PEOPLE.forEach(function (p, i) {
      var row = document.createElement('div'); row.className = 'match-row'; row.dataset.row = p.key; row.setAttribute('role', 'listitem');
      row.innerHTML = '<img class="match-thumb" src="' + ASSET + 'assets/people/' + p.key + '.jpg" alt="' + escapeHtml(p.name) + '">' +
        '<span class="match-name">' + escapeHtml(p.name) + '<span class="match-full">' + escapeHtml(p.full) + '</span></span>' +
        '<div class="chip-hold"></div>';
      row.addEventListener('click', function () { if (s4.pick) selectFav(p.key); });
      list.appendChild(row);
      var ck = chipForRow[i];
      var chip = document.createElement('button'); chip.type = 'button'; chip.className = 'match-chip'; chip.dataset.chip = ck;
      chip.textContent = personByKey(ck).short;
      chip.addEventListener('pointerdown', onChipDown);
      row.querySelector('.chip-hold').appendChild(chip);
      s4.occ[p.key] = ck; s4.chipHome[ck] = p.key;
    });
    $('ppl-check').disabled = false; $('ppl-check').hidden = false;
    if (saved && saved.complete) {
      PEOPLE.forEach(function (p) { rowEl(p.key).classList.add('correct'); chipEl(p.key).classList.add('correct'); });
      enterPickMode(); s4.fav = saved.favourite || ''; if (s4.fav) selectFav(s4.fav, true);
      $('ppl-text').value = saved.writeup || ''; updateCelebWrite(); $('ppl-check').hidden = true;
    }
  }

  function onChipDown(e) {
    var chip = e.currentTarget;
    if (chip.classList.contains('correct')) return;
    e.preventDefault();
    document.body.classList.add('dragging-active');   // lock selection from the first touch (stops stray highlighting)
    var r = chip.getBoundingClientRect();
    drag4 = { chip: chip, key: chip.dataset.chip, pid: e.pointerId, sx: e.clientX, sy: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, moved: false };
    try { chip.setPointerCapture(e.pointerId); } catch (x) {}
    chip.addEventListener('pointermove', onChipMove);
    chip.addEventListener('pointerup', onChipUp);
    chip.addEventListener('pointercancel', onChipCancel);
  }
  function onChipMove(e) {
    if (!drag4) return;
    if (!drag4.moved) {
      if (Math.abs(e.clientX - drag4.sx) + Math.abs(e.clientY - drag4.sy) < DRAG_THRESH) return;
      drag4.moved = true; document.body.classList.add('dragging-active');
      drag4.chip.classList.add('dragging'); drag4.chip.style.width = drag4.w + 'px';
    }
    drag4.chip.style.left = (e.clientX - drag4.offX) + 'px';
    drag4.chip.style.top = (e.clientY - drag4.offY) + 'px';
    celebHover(e.clientX, e.clientY);
  }
  function endChip(chip) { chip.removeEventListener('pointermove', onChipMove); chip.removeEventListener('pointerup', onChipUp); chip.removeEventListener('pointercancel', onChipCancel); }
  function onChipUp(e) {
    if (!drag4) return;
    var chip = drag4.chip, key = drag4.key, moved = drag4.moved;
    try { chip.releasePointerCapture(drag4.pid); } catch (x) {}
    endChip(chip); celebClearHover();
    document.body.classList.remove('dragging-active');
    chip.classList.remove('dragging'); chip.style.width = ''; chip.style.left = ''; chip.style.top = '';
    if (moved) {
      var targetRow = rowAt(e.clientX, e.clientY, chip);
      if (targetRow && targetRow !== s4.chipHome[key]) swapChips(s4.chipHome[key], targetRow);
      else renderChip(key);
    }
    drag4 = null;
  }
  function onChipCancel() {
    if (!drag4) return;
    try { drag4.chip.releasePointerCapture(drag4.pid); } catch (x) {}
    endChip(drag4.chip); celebClearHover();
    document.body.classList.remove('dragging-active');
    drag4.chip.classList.remove('dragging'); drag4.chip.style.width = ''; drag4.chip.style.left = ''; drag4.chip.style.top = '';
    renderChip(drag4.key); drag4 = null;
  }
  function rowAt(x, y, exclude) {
    exclude.style.pointerEvents = 'none';
    var els = document.elementsFromPoint(x, y), row = null;
    for (var i = 0; i < els.length; i++) { var r = els[i].closest && els[i].closest('.match-row'); if (r) { row = r.dataset.row; break; } }
    exclude.style.pointerEvents = '';
    if (row && rowEl(row).classList.contains('correct')) return null;   // can't displace a locked match
    return row;
  }
  function celebHover(x, y) {
    celebClearHover(); if (!drag4) return;
    drag4.chip.style.pointerEvents = 'none';
    var els = document.elementsFromPoint(x, y);
    drag4.chip.style.pointerEvents = '';
    for (var i = 0; i < els.length; i++) { var r = els[i].closest && els[i].closest('.match-row'); if (r) { if (!r.classList.contains('correct')) r.classList.add('drop-hover'); break; } }
  }
  function celebClearHover() { document.querySelectorAll('#st4 .drop-hover').forEach(function (e) { e.classList.remove('drop-hover'); }); }
  function swapChips(rowA, rowB) {
    var a = s4.occ[rowA], b = s4.occ[rowB];
    s4.occ[rowA] = b; s4.occ[rowB] = a; s4.chipHome[a] = rowB; s4.chipHome[b] = rowA;
    renderChip(a); renderChip(b);
  }
  function renderChip(key) {
    var chip = chipEl(key), home = s4.chipHome[key];
    chip.classList.remove('wrong'); chip.style.left = ''; chip.style.top = '';
    rowEl(home).querySelector('.chip-hold').appendChild(chip);
  }
  function checkStation4() {
    var correct = 0;
    PEOPLE.forEach(function (p) {
      if (s4.occ[p.key] === p.key) { correct++; if (!rowEl(p.key).classList.contains('correct')) { rowEl(p.key).classList.add('correct'); chipEl(p.key).classList.add('correct'); } }
    });
    PEOPLE.forEach(function (p) {
      if (s4.occ[p.key] !== p.key) { var c = chipEl(s4.occ[p.key]); if (c) { c.classList.add('wrong'); (function (cc) { setTimeout(function () { cc.classList.remove('wrong'); }, 650); })(c); } }
    });
    $('st4-count').textContent = correct + ' / 6 matched';
    var msg = $('ppl-msg');
    if (correct === 6) { msg.textContent = 'All matched — now choose your favourite below.'; msg.className = 'sv-msg good'; $('ppl-check').hidden = true; enterPickMode(); }
    else { msg.textContent = correct + ' of 6 matched. Swap the others around and check again.'; msg.className = 'sv-msg'; }
  }
  function enterPickMode() { s4.pick = true; $('ppl-rows').classList.add('picking'); show($('ppl-pick')); $('ppl-instr').textContent = 'Great matching! Now tap the person you most admire, and write why.'; }
  function selectFav(key, silent) {
    s4.fav = key;
    document.querySelectorAll('#st4 .match-row').forEach(function (e) { e.classList.toggle('selected', e.dataset.row === key); });
    var ta = $('ppl-text'); ta.hidden = false; if (!silent) ta.focus();
    updateCelebWrite();
  }
  function updateCelebWrite() {
    var w = wordCount($('ppl-text').value);
    var ok = s4.fav && w >= 5 && w <= 100;
    $('ppl-done').disabled = !ok;
    var wc = $('ppl-wc');
    if (!s4.fav) { wc.textContent = 'Tap a person above first.'; wc.className = 'sv-msg'; }
    else if (w > 100) { wc.textContent = w + ' / 100 words — a little too long, trim it down.'; wc.className = 'sv-msg bad'; }
    else if (w < 5) { wc.textContent = w + ' / 100 words — write a little more.'; wc.className = 'sv-msg'; }
    else { wc.textContent = w + ' / 100 words — perfect.'; wc.className = 'sv-msg good'; }
  }
  function captureCeleb() {
    var matched = PEOPLE.every(function (p) { return s4.occ[p.key] === p.key; });
    var w = wordCount($('ppl-text') ? $('ppl-text').value : '');
    state.data['4'] = { matched: matched, favourite: s4.fav, writeup: ($('ppl-text') ? $('ppl-text').value : '').trim(), complete: matched && !!s4.fav && w >= 5 && w <= 100 };
    return state.data['4'].complete;
  }
  function finishCeleb() { if (captureCeleb()) markStationDone(4); closeStation4(); }

  // ---- tiny DOM helpers ----
  function $(id) { return document.getElementById(id); }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function doneCount() { return STATIONS.filter(function (n) { return state.stations[n]; }).length; }

  /* ============================================================
     Transport: OLS_TRANSPORT (Path B) or an offline localStorage stub
     ============================================================ */
  var LS_KEY = 'mcdf-shell-' + BOOT.classCode;

  function offlineStore() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function offlineSave(obj) { try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch (e) {} }

  function offlineCall(p) {
    var s = offlineStore();
    switch (p.action) {
      case 'whoami':
        return Promise.resolve({ ok: true, email: 'demo.pupil@offline (preview)' });
      case 'load':
        return Promise.resolve({
          ok: true,
          name: s.name || '',
          stations: s.stations || { 1: false, 2: false, 3: false, 4: false },
          docUrl: s.docUrl || '',
          data: s.data || {}
        });
      case 'save':
        s.name = p.name || s.name || '';
        s.stations = p.stations || s.stations || {};
        s.data = p.data || s.data || {};
        offlineSave(s);
        return Promise.resolve({ ok: true });
      case 'makeDoc':
        // offline/preview: there is no Drive here - signal the client to render a
        // local preview of the composed doc (p.doc) instead of opening a real Doc.
        return Promise.resolve({ ok: true, preview: true });
      case 'admin': {
        // preview staff panel: passcode "demo"; demo.teacher owns 8A, another
        // teacher owns 8B (to demo the "show all" toggle + ownership rules)
        if (String(p.passcode || '').trim().toLowerCase() !== 'demo') {
          return Promise.resolve({ ok: false, error: 'bad-passcode' });
        }
        var ME = 'demo.teacher@c2ken.net';
        var reg = s.staffClasses || [
          { name: '8A-French', owner: ME },
          { name: '8B-French', owner: 'other.teacher@c2ken.net' }
        ];
        s.staffClasses = reg; offlineSave(s);
        if (p.sub === 'classes') {
          return Promise.resolve({
            ok: true, me: ME,
            classes: reg.map(function (c) {
              return { name: c.name, owner: c.owner || '', mine: c.owner === ME, pupils: c.name === '8A-French' ? 1 : 0 };
            })
          });
        }
        if (p.sub === 'addClass') {
          var nm = String(p.name || '').trim().replace(/[^A-Za-z0-9_\- ]/g, '').replace(/\s+/g, '-').slice(0, 40);
          if (!nm || nm === 'default') return Promise.resolve({ ok: false, error: 'bad-name' });
          for (var i = 0; i < reg.length; i++) if (reg[i].name.toLowerCase() === nm.toLowerCase()) return Promise.resolve({ ok: false, error: 'exists', name: reg[i].name });
          reg.push({ name: nm, owner: ME }); s.staffClasses = reg; offlineSave(s);
          return Promise.resolve({ ok: true, name: nm, owner: ME });
        }
        if (p.sub === 'deleteClass') {
          var found = null;
          reg.forEach(function (c) { if (c.name === p.name) found = c; });
          if (found && found.owner && found.owner !== ME) return Promise.resolve({ ok: false, error: 'not-owner', owner: found.owner });
          s.staffClasses = reg.filter(function (c) { return c.name !== p.name; }); offlineSave(s);
          return Promise.resolve({ ok: true, name: p.name, removed: 0 });
        }
        return Promise.resolve({
          ok: true,
          rows: [{
            name: 'demo.pupil@offline', s1: !!(s.stations && s.stations[1]), s2: !!(s.stations && s.stations[2]),
            s3: !!(s.stations && s.stations[3]), s4: !!(s.stations && s.stations[4]), docUrl: s.docUrl || ''
          }]
        });
      }
      default:
        return Promise.reject(new Error('unknown action ' + p.action));
    }
  }

  function call(action, payload) {
    var p = payload || {};
    p.action = action;
    p['class'] = BOOT.classCode;
    if (window.OLS_TRANSPORT && typeof window.OLS_TRANSPORT.call === 'function') {
      return window.OLS_TRANSPORT.call(p);
    }
    return offlineCall(p);
  }

  /* ============================================================
     Render
     ============================================================ */
  function render() {
    STATIONS.forEach(function (n) {
      var btn = document.querySelector('.station[data-station="' + n + '"]');
      var status = $('st' + n + '-status');
      if (!btn) return;
      if (state.stations[n]) {
        btn.classList.add('done');
        if (status) status.textContent = 'Done';
      } else {
        btn.classList.remove('done');
        if (status) status.textContent = 'Start';
      }
      var stamp = document.querySelector('.stamps li[data-stamp="' + n + '"]');
      if (stamp) stamp.classList.toggle('done', !!state.stations[n]);
    });

    var c = doneCount();
    var count = $('passport-count');
    if (count) count.textContent = c + ' of 4 stops done' + (c === 4 ? ' — très bien !' : '');

    var create = $('create');
    var finish = create ? create.closest('.finish') : null;
    var hint = $('finish-hint');
    if (create) {
      var ready = c === 4 && !state.docUrl;
      create.disabled = c !== 4 || creating;
      var lock = create.querySelector('.lock');
      if (lock) lock.style.display = c === 4 ? 'none' : '';
      if (finish) finish.classList.toggle('ready', c === 4);
      if (hint) {
        if (creating) hint.textContent = 'Un instant… Google is creating your Doc — this can take a few seconds.';
        else if (createErr) hint.textContent = 'Sorry — your project could not be created just now. Please press the button to try again.';
        else if (state.docUrl) hint.textContent = 'Your project has been created. You can make changes to it any time.';
        else if (ready) hint.textContent = 'All four stops done. Make your project!';
        else hint.textContent = 'Finish all four stops to unlock this.';
      }
    }
  }

  function showResult(url) {
    var box = $('result');
    if (!box) return;
    box.innerHTML =
      '<h2>Now make it brilliant</h2>' +
      '<p>Your project is now a Google Doc in your own Drive. It is your <strong>first draft</strong> ' +
      '- open it and make it even better:</p>' +
      '<ul>' +
        '<li>Read it aloud. Does every sentence start with a capital and end with a full stop?</li>' +
        '<li>Swap one dull word for a more interesting one in each part.</li>' +
        '<li>Add one extra sentence to each section.</li>' +
        '<li>Check your spelling, and make sure every opinion has a <em>because</em>.</li>' +
      '</ul>' +
      '<p><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Open my project to edit it</a></p>' +
      '<p class="result-guide-hint">Then show off your <strong>digital skills</strong> — colour, bold, fonts and your map picture. The guide walks you through it:</p>' +
      '<button id="open-docs-guide" class="btn btn-blue" type="button">&#128214; Mon guide Google Docs</button>' +
      '<p class="result-guide-hint">Ready to turn your project into a website? This guide builds your <strong>Google Site</strong> step by step:</p>' +
      '<button id="open-sites-guide" class="btn btn-blue" type="button">&#127760; Mon guide Google Sites</button>';
    show(box);
    var g = $('open-docs-guide');
    if (g) g.addEventListener('click', docsGuide.open);
    var gs = $('open-sites-guide');
    if (gs) gs.addEventListener('click', sitesGuide.open);
  }

  /* ============================================================
     Actions
     ============================================================ */
  function persist() {
    return call('save', { name: state.name, stations: state.stations, data: state.data }).catch(function () {});
  }

  function markStationDone(n) {
    state.stations[n] = true;
    render();
    persist();
  }

  // Build the structured project Doc from the four stations' saved content. The
  // CLIENT composes it (it holds the city/dish/person names + the pupil's own
  // words); the server just renders this payload into a Google Doc, and the
  // offline build renders it as a local preview. One source of truth - and the
  // accents travel as real Unicode over google.script.run.
  function listToProse(a) {
    if (!a.length) return '';
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }
  function composeDoc() {
    var d1 = state.data['1'] || {}, d2 = state.data['2'] || {}, d3 = state.data['3'] || {}, d4 = state.data['4'] || {};

    var cityNames = (d1.correct || []).map(function (k) { var c = cityByKey(k); return c ? c.name : k; });
    var sec1 = [cityNames.length
      ? ('On my map of France I found and labelled these main cities: ' + listToProse(cityNames) + '.')
      : 'I labelled the main cities of France on my map.'];
    if ((d1.writeup || '').trim()) sec1.push((d1.writeup || '').trim());

    var bullets2 = (d2.items || []).filter(function (it) { return it.basket === 'yes' || it.basket === 'no'; }).map(function (it) {
      var dish = dishByKey(it.key), nm = dish ? dish.name : it.key;
      var lead = it.basket === 'yes' ? 'I would like to try ' : 'I would not like to try ';
      var reason = (it.reason || '').trim();
      return lead + nm + (reason ? ' — because ' + reason : '') + '.';
    });

    var sec3 = (d3.writeup || '').trim() ? [(d3.writeup || '').trim()] : ['(Write about how and why France celebrates Bastille Day.)'];

    var fav = d4.favourite ? personByKey(d4.favourite) : null;
    var sec4 = [];
    if (fav) sec4.push('The famous French person I admire most is ' + fav.name + '.');
    if ((d4.writeup || '').trim()) sec4.push((d4.writeup || '').trim());
    if (!sec4.length) sec4.push('(Write about the famous French person you admire most.)');

    return {
      title: 'La Belle France',
      subtitle: 'My Term 1 culture project',
      checklist: {
        title: 'Make it brilliant, then delete this box',
        items: [
          'Read it aloud. Does every sentence start with a capital and end with a full stop?',
          'Swap one dull word for a more interesting one in each part.',
          'Add one extra sentence to each section.',
          'Check your spelling, and make sure every opinion has a "because".'
        ]
      },
      skills: {
        title: 'Show off your digital skills — then delete this box too',
        items: [
          'Give your title and the four headings a colour you like (select the words, then the A button with the colour strip).',
          'Make every dish name bold — and your favourite person\'s name too (select, then the B button).',
          'Choose a different font for your big title (the toolbar box that says Arial).',
          'Swap the grey "[Paste your map of France here]" line for a real picture of your map (Insert → Image → Upload from computer).',
          'Not sure how? Tap "Mon guide Google Docs" in the app — it shows you every step.'
        ]
      },
      sections: [
        { heading: '1. Ma Carte de France', paras: sec1, bullets: [], placeholder: '[Paste your map of France here]' },
        { heading: '2. La Cuisine', paras: ['I looked at ten famous French dishes and decided which I would like to try.'], bullets: bullets2, placeholder: '' },
        { heading: '3. Le 14 Juillet', paras: sec3, bullets: [], placeholder: '' },
        { heading: '4. Les Personnes Célèbres', paras: sec4, bullets: [], placeholder: '' }
      ]
    };
  }
  function renderDocPreview(doc) {
    var h = '<div class="doc-paper">';
    h += '<h1 class="doc-title">' + escapeHtml(doc.title) + '</h1>';
    if (doc.subtitle) h += '<p class="doc-subtitle">' + escapeHtml(doc.subtitle) + '</p>';
    if (doc.checklist && doc.checklist.items) {
      h += '<div class="doc-checklist"><b>' + escapeHtml(doc.checklist.title) + '</b><ul>';
      doc.checklist.items.forEach(function (it) { h += '<li>' + escapeHtml(it) + '</li>'; });
      h += '</ul></div>';
    }
    if (doc.skills && doc.skills.items) {
      h += '<div class="doc-checklist doc-skills"><b>' + escapeHtml(doc.skills.title) + '</b><ul>';
      doc.skills.items.forEach(function (it) { h += '<li>' + escapeHtml(it) + '</li>'; });
      h += '</ul></div>';
    }
    (doc.sections || []).forEach(function (s) {
      h += '<h2 class="doc-h">' + escapeHtml(s.heading) + '</h2>';
      (s.paras || []).forEach(function (p) { h += '<p>' + escapeHtml(p) + '</p>'; });
      if (s.bullets && s.bullets.length) { h += '<ul>'; s.bullets.forEach(function (b) { h += '<li>' + escapeHtml(b) + '</li>'; }); h += '</ul>'; }
      if (s.placeholder) h += '<p class="doc-placeholder">' + escapeHtml(s.placeholder) + '</p>';
    });
    h += '</div>';
    $('doc-preview-body').innerHTML = h;
  }

  /* ============================================================
     "Mon guide Google Docs" - a step-by-step card guide that shows
     pupils HOW to do each digital-skills task on their Doc (select,
     bold, colour, font, insert their map). Screenshot per step from
     assets/guide/docs/ (captured on a real C2k account); until a
     screenshot exists the card shows a friendly placeholder.
     Reuses the city-card carousel look; own tiny engine (static deck).
     ============================================================ */
  var GUIDE_DOCS = [
    { img: 'open.jpg', step: 1, title: 'Open your project',
      text: 'Tap "Open my project to edit it" in the app — or in Google Drive, look inside OLS Digital Skills → French → J1 and double-click your project.',
      task: 'Open your La Belle France document.' },
    { img: 'select.jpg', step: 2, title: 'Select before you style',
      text: 'To change how words look, first select them: click at the start of the words, hold the mouse button, and drag across. The words turn blue — now any button you press changes just those words.',
      task: 'Try it: select your big title, La Belle France.' },
    { img: 'bold.jpg', step: 3, title: 'Make it bold',
      text: 'With your words selected, click the B in the toolbar (or press Ctrl and B together). Bold makes important words stand out.',
      task: 'Make every dish name bold in La Cuisine — and your favourite person’s name too.' },
    { img: 'colour.jpg', step: 4, title: 'Add some colour',
      text: 'Select your words, then find the A with the little colour strip under it, just right of the B, I and U buttons — it is called "Text colour". Click it and a palette pops up — click any colour you like.',
      task: 'Give your title and the four section headings a colour that suits France.' },
    { img: 'font.jpg', step: 5, title: 'Choose your font',
      text: 'The toolbar box that says Arial is the font menu. Select your title, click the box, and try a few fonts until one feels right. Next to it is a number with − and + either side: click + to make your letters bigger.',
      task: 'Pick a different font for your big title, and make it a little bigger.' },
    { img: 'image.jpg', step: 6, title: 'Put in your map',
      text: 'Click on the grey line that says [Paste your map of France here]. Then choose Insert → Image → Upload from computer and pick your map. (You can also copy a picture and paste it straight in.)',
      task: 'Swap the grey line for your real map of France.' },
    { img: 'finish.jpg', step: 7, title: 'Finishing touches',
      text: 'Read your project aloud one last time. Happy with it? Delete the two helper boxes at the top: right-click on a box and choose Delete table. Then it’s ready for your Google Site!',
      task: 'Delete the yellow and blue boxes when every task is done.' }
  ];
  /* The Google Sites walkthrough reuses this exact engine as a SECOND deck
     (own data array + assets/guide/sites/). Shown after the Doc is made, it
     teaches the pupil to build her Google Site screen by screen. */
  var GUIDE_SITES = [
    { img: 'new.jpg', step: 1, title: 'Make a new Google Site',
      text: 'In Google Drive, click New, then More, then Google Sites. A blank website opens — this is where you will show off your project.',
      task: 'Open Google Drive and start a new Google Site.' },
    { img: 'name.jpg', step: 2, title: 'Name your site',
      text: 'At the top left it says "Untitled site". Click it and type a name, like La Belle France. Google Sites saves your work for you as you go.',
      task: 'Name your site La Belle France.' },
    { img: 'editor.jpg', step: 3, title: 'Look around the editor',
      text: 'Your page is in the middle. On the right is the Insert panel (text boxes, images and more). At the top right are the Preview and Publish buttons.',
      task: 'Find the Insert panel on the right-hand side.' },
    { img: 'banner.jpg', step: 4, title: 'Add your big title',
      text: 'Click the words on the banner at the very top and type your title, for example La Belle France. This is the first thing visitors see.',
      task: 'Type your title onto the banner.' },
    { img: 'textbox.jpg', step: 5, title: 'Add a text box',
      text: 'From the Insert panel on the right, click Text box. A box appears on your page — this is where your writing will go.',
      task: 'Insert your first text box.' },
    { img: 'copy.jpg', step: 6, title: 'Copy from your Doc',
      text: 'Open your La Belle France Google Doc. Select one section — for example La Cuisine — then press Ctrl and C together to copy it.',
      task: 'Copy your first section from the Doc.' },
    { img: 'paste.jpg', step: 7, title: 'Paste it in',
      text: 'Back on your Site, click inside your text box and press Ctrl and V to paste. Do the same for each of your four sections.',
      task: 'Paste your section into the text box.' },
    { img: 'imageup.jpg', step: 8, title: 'Add your map picture',
      text: 'From the Insert panel, click Images, then Upload, and choose your map of France. Drag the corners to make it the right size.',
      task: 'Upload your map of France.' },
    { img: 'themes.jpg', step: 9, title: 'Pick a theme',
      text: 'Click Themes at the top right to choose colours and fonts for your whole site in one go. Pick one that suits France.',
      task: 'Choose a theme you like.' },
    { img: 'preview.jpg', step: 10, title: 'Preview your site',
      text: 'Click the Preview button (the little screen at the top right) to see how your site looks on a phone, a tablet and a computer.',
      task: 'Preview your site on a phone and a computer.' },
    { img: 'publish.jpg', step: 11, title: 'Publish it',
      text: 'When you are happy, click Publish at the top right. Type a short web address, choose who can see it, then click Publish.',
      task: 'Publish your finished site.' },
    { img: 'done.jpg', step: 12, title: 'Hand it in',
      text: 'Your site is live! Copy its web address and hand it in on Google Classroom, exactly the way your teacher showed you.',
      task: 'Copy your site link into Google Classroom.' }
  ];

  /* One reusable card-deck engine, instanced per guide (Docs, Sites). cfg names
     the element ids + the assets/guide/<dir>/ folder + the step data array. */
  function makeGuide(cfg) {
    var st = { built: false, idx: 0 };
    var dr = null;
    function cardHtml(s) {
      return '<article class="city-card guide-card">' +
        '<div class="guide-shot">' +
          '<img src="' + ASSET + 'assets/guide/' + cfg.dir + '/' + s.img + '" alt="" draggable="false" onerror="this.parentElement.classList.add(\'no-shot\')">' +
          '<div class="guide-shot-soon" aria-hidden="true"><span>&#128247;</span>Picture coming soon</div>' +
        '</div>' +
        '<div class="city-card-flag" aria-hidden="true"><i></i><i></i><i></i></div>' +
        '<div class="city-card-body">' +
          '<p class="guide-step">&Eacute;tape ' + s.step + ' / Step ' + s.step + '</p>' +
          '<h3>' + escapeHtml(s.title) + '</h3>' +
          '<p>' + escapeHtml(s.text) + '</p>' +
          (s.task ? '<p class="guide-task"><b>&#9989; Your turn:</b> ' + escapeHtml(s.task) + '</p>' : '') +
        '</div>' +
      '</article>';
    }
    function build() {
      st.built = true;
      $(cfg.track).innerHTML = cfg.data.map(cardHtml).join('');
      $(cfg.dots).innerHTML = cfg.data.map(function () { return '<b></b>'; }).join('');
    }
    function layout(animate) {
      var track = $(cfg.track);
      track.classList.toggle('animate', !!animate);
      track.style.transform = 'translateX(' + (-st.idx * 100) + '%)';
      var dots = $(cfg.dots).children;
      for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === st.idx);
      $(cfg.prev).disabled = st.idx <= 0;
      $(cfg.next).disabled = st.idx >= cfg.data.length - 1;
    }
    function open() { if (!st.built) build(); st.idx = 0; show($(cfg.modal)); layout(false); }
    function close() { hide($(cfg.modal)); }
    function go(i) { st.idx = Math.max(0, Math.min(i, cfg.data.length - 1)); layout(true); }
    function move(e) {
      if (!dr) return;
      var dx = e.clientX - dr.x;
      $(cfg.track).style.transform = 'translateX(' + (-st.idx * 100 + dx / dr.w * 100) + '%)';
    }
    function up(e) {
      if (!dr) return;
      var vp = $(cfg.vp);
      vp.removeEventListener('pointermove', move);
      vp.removeEventListener('pointerup', up);
      vp.removeEventListener('pointercancel', up);
      try { vp.releasePointerCapture(dr.pid); } catch (x) {}
      var dx = e.clientX - dr.x, thr = dr.w * 0.18, ni = st.idx;
      if (dx <= -thr) ni = st.idx + 1; else if (dx >= thr) ni = st.idx - 1;
      dr = null;
      go(ni);
    }
    function down(e) {
      var vp = $(cfg.vp);
      dr = { x: e.clientX, w: vp.getBoundingClientRect().width || 1, pid: e.pointerId };
      $(cfg.track).classList.remove('animate');
      vp.addEventListener('pointermove', move);
      vp.addEventListener('pointerup', up);
      vp.addEventListener('pointercancel', up);
      try { vp.setPointerCapture(e.pointerId); } catch (x) {}
    }
    function isOpen() { var m = $(cfg.modal); return !!(m && !m.hidden); }
    function wire() {
      $(cfg.cx).addEventListener('click', close);
      $(cfg.scrim).addEventListener('click', close);
      $(cfg.prev).addEventListener('click', function () { go(st.idx - 1); });
      $(cfg.next).addEventListener('click', function () { go(st.idx + 1); });
      $(cfg.vp).addEventListener('pointerdown', down);
    }
    return { open: open, close: close, go: go, isOpen: isOpen, wire: wire, idx: function () { return st.idx; } };
  }
  var docsGuide = makeGuide({ dir: 'docs', data: GUIDE_DOCS, modal: 'docs-guide', track: 'guide-track', dots: 'guide-dots', prev: 'guide-prev', next: 'guide-next', vp: 'guide-vp', cx: 'guide-cx', scrim: 'guide-scrim' });
  var sitesGuide = makeGuide({ dir: 'sites', data: GUIDE_SITES, modal: 'sites-guide', track: 'sguide-track', dots: 'sguide-dots', prev: 'sguide-prev', next: 'sguide-next', vp: 'sguide-vp', cx: 'sguide-cx', scrim: 'sguide-scrim' });

  /* alert() is blocked inside the Apps Script sandbox iframe, so failures are
     surfaced through the finish-hint line instead; the reset handler is attached
     to both outcomes so the button can never stay stuck on "Creating...". While
     the server builds the Doc (10-20s on a cold run) the button shows a spinner
     and the hint reassures - both clear automatically on success OR failure. */
  var createErr = false;
  var creating = false;
  function createProject() {
    var btn = $('create');
    createErr = false;
    creating = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn-spin" aria-hidden="true"></span>Creating your project…'; }
    render();
    var payload = composeDoc();
    call('makeDoc', { doc: payload })
      .then(function (r) {
        if (r && r.ok && r.preview) { renderDocPreview(payload); show($('doc-preview')); }
        else if (r && r.ok && r.url) { state.docUrl = r.url; showResult(r.url); }
        else { createErr = true; }
      }, function () { createErr = true; })
      .then(function () {
        creating = false;
        var b = $('create');
        if (b) { b.innerHTML = 'Créer mon projet / Make my project'; b.disabled = false; }
        render();
      });
  }

  /* ============================================================
     Station modal
     ============================================================ */
  function openStationModal(n) {
    if (n === 1) { openStation1(); return; }
    if (n === 2) { openStation2(); return; }
    if (n === 3) { openStation3(); return; }
    if (n === 4) { openStation4(); return; }
    openStation = n;
    $('sm-title').textContent = STATION_NAMES[n] || ('Stop ' + n);
    var done = $('sm-done');
    if (done) done.style.display = state.stations[n] ? 'none' : '';
    show($('station-modal'));
  }
  function closeStationModal() { openStation = null; hide($('station-modal')); }

  /* ============================================================
     Staff panel
     ============================================================ */
  function renderDash(rows) {
    var t = $('dash');
    if (!t) return;
    var head = '<tr><th>Pupil</th><th>1 Carte</th><th>2 Cuisine</th><th>3 Juillet</th><th>4 Célèbres</th><th>Project</th></tr>';
    var body = (rows || []).map(function (r) {
      function cell(v) { return v ? '<td class="yes">✓</td>' : '<td class="no">–</td>'; }
      var doc = r.docUrl ? '<td><a href="' + escapeHtml(r.docUrl) + '" target="_blank" rel="noopener">Open</a></td>' : '<td class="no">–</td>';
      return '<tr><td>' + escapeHtml(r.name || '') + '</td>' + cell(r.s1) + cell(r.s2) + cell(r.s3) + cell(r.s4) + doc + '</tr>';
    }).join('');
    t.innerHTML = head + (body || '<tr><td colspan="6">No pupils yet.</td></tr>');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  /* Multi-teacher class manager. One shared passcode unlocks the panel; the
     SERVER identifies the teacher by their verified C2k email (Execute-as-user).
     Each class is owned by the teacher who created it: you see your own classes
     by default (a "show all" toggle covers HOD/cover), each class offers copy
     link / in-page QR / dashboard (+ CSV) / delete (own classes only), and each
     pupil's Doc auto-shares to her class's owning teacher. */
  var staff = { pass: '', me: '', all: false, classes: [], current: '', rows: [] };
  var dashSeq = 0;   // discards superseded/out-of-order dashboard responses

  function staffView(id) {
    ['staff-gate', 'staff-classes', 'staff-dash', 'staff-qr'].forEach(function (v) { hide($(v)); });
    show($(id));
  }
  function classLink(name) {
    var base = (BOOT.baseUrl && BOOT.baseUrl.indexOf('http') === 0) ? BOOT.baseUrl : (location.origin + location.pathname);
    return base + '?class=' + encodeURIComponent(name);
  }
  function copyText(text, msgEl, doneMsg, failMsg) {
    function done() { if (msgEl) msgEl.textContent = doneMsg || 'Copied.'; }
    // navigator.clipboard can be permission-blocked inside the Apps Script
    // sandboxed iframe - fall back to a hidden-textarea execCommand copy,
    // and only then to showing the text (or a task-appropriate failMsg).
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      if (ok) done();
      else if (msgEl) msgEl.textContent = failMsg || ('Copy this by hand: ' + text);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, legacy);
    else legacy();
  }

  function staffUnlock() {
    if ($('staff-go').disabled) return;   // Enter on the field must respect the in-flight state
    var pass = ($('staff-pass').value || '').trim();
    var msg = $('staff-msg');
    msg.textContent = '';
    $('staff-go').disabled = true;
    call('admin', { passcode: pass, sub: 'classes' })
      .then(function (r) {
        if (r && r.ok) {
          staff.pass = pass; staff.me = r.me || ''; staff.classes = r.classes || [];
          $('staff-me').textContent = staff.me || 'your school account';
          staffView('staff-classes');
          renderClasses();
        } else {
          msg.textContent = (r && r.error === 'bad-passcode')
            ? 'That passcode was not recognised. Try again.'
            : 'Could not open the teacher area. Please try again.';
        }
      })
      .catch(function () { msg.textContent = 'Something went wrong. Please try again.'; })
      .then(function () { $('staff-go').disabled = false; });
  }
  function staffReloadClasses() {
    return call('admin', { passcode: staff.pass, sub: 'classes' })
      .then(function (r) {
        if (r && r.ok) { staff.me = r.me || staff.me; staff.classes = r.classes || []; renderClasses(); }
        else if (r && r.error === 'bad-passcode') {
          staff.pass = '';
          staffView('staff-gate');
          $('staff-msg').textContent = 'The staff passcode has changed — enter the new one.';
        }
        else $('staff-cmsg').textContent = 'The class list may be out of date — close and reopen the teacher area.';
      })
      .catch(function () { $('staff-cmsg').textContent = 'The class list may be out of date — close and reopen the teacher area.'; });
  }
  function renderClasses() {
    var ul = $('staff-class-list');
    var list = staff.all ? staff.classes : staff.classes.filter(function (c) { return c.mine; });
    ul.innerHTML = list.map(function (c) {
      var who = c.mine ? '' : (c.owner ? '<span class="cls-owner">' + escapeHtml(c.owner) + '</span>' : '<span class="cls-owner">unowned</span>');
      return '<li class="cls-row" data-cls="' + escapeHtml(c.name) + '">' +
        '<div class="cls-info"><b>' + escapeHtml(c.name) + '</b>' +
          '<span class="cls-meta">' + c.pupils + (c.pupils === 1 ? ' pupil' : ' pupils') + '</span>' + who + '</div>' +
        '<div class="cls-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="dash">Dashboard</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="link">Copy link</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="qr">QR</button>' +
          ((c.mine || !c.owner) ? '<button type="button" class="btn btn-ghost btn-sm cls-del" data-act="del" aria-label="Delete ' + escapeHtml(c.name) + '">&times;</button>' : '') +
        '</div></li>';
    }).join('') || '<li class="cls-empty">No classes of your own yet — type a class name above and tap <b>Add class</b>, then share its link (or QR) with that class. (Tick &ldquo;Show all teachers&rsquo; classes&rdquo; to see everyone else&rsquo;s.)</li>';
  }
  function addClass() {
    if ($('staff-add').disabled) return;   // double-tap / double-Enter guard
    var input = $('staff-newclass'), name = (input.value || '').trim(), msg = $('staff-cmsg');
    if (!name) { input.focus(); return; }
    msg.textContent = 'Adding…';
    $('staff-add').disabled = true;
    call('admin', { passcode: staff.pass, sub: 'addClass', name: name })
      .then(function (r) {
        if (r && r.ok) {
          input.value = '';
          msg.textContent = 'Added ' + r.name + '. Copy its link (or show the QR) to share with that class.';
          // optimistic local update so the row appears even if the reload fails
          staff.classes.push({ name: r.name, owner: r.owner || staff.me, mine: true, pupils: 0 });
          renderClasses();
          staffReloadClasses();
        }
        else if (r && r.error === 'exists') msg.textContent = 'A class called ' + (r.name || name) + ' already exists.';
        else if (r && r.error === 'busy') msg.textContent = 'The board is busy right now — try again in a moment.';
        else if (r && r.error === 'not-signed-in') msg.textContent = 'Your sign-in has expired — refresh the page and try again.';
        else msg.textContent = 'Could not add that class — try a simpler name (letters and numbers).';
      })
      .catch(function () { msg.textContent = 'Could not add the class. Please try again.'; })
      .then(function () { $('staff-add').disabled = false; });
  }
  function onClassListClick(e) {
    var btn = e.target.closest ? e.target.closest('button[data-act]') : null;
    if (!btn) return;
    var row = btn.closest('.cls-row'), name = row && row.getAttribute('data-cls');
    if (!name) return;
    var act = btn.getAttribute('data-act'), msg = $('staff-cmsg');
    if (act === 'dash') { openDash(name); return; }
    if (act === 'link') { copyText(classLink(name), msg, 'Link for ' + name + ' copied — paste it into Google Classroom.'); return; }
    if (act === 'qr') { openQr(name); return; }
    if (act === 'del') {
      // two-tap confirm (native confirm() is unreliable in the sandboxed iframe)
      if (!btn.classList.contains('arm')) {
        btn.classList.add('arm'); btn.textContent = 'Sure?';
        msg.textContent = 'Tap again to delete ' + name + ' — this removes its dashboard records (pupils’ own Docs are untouched).';
        setTimeout(function () {
          btn.classList.remove('arm'); btn.innerHTML = '&times;';
          if (msg.textContent.indexOf('Tap again') === 0) msg.textContent = '';   // clear the stale prompt on disarm
        }, 4000);
        return;
      }
      btn.disabled = true;
      msg.textContent = 'Deleting ' + name + '…';
      call('admin', { passcode: staff.pass, sub: 'deleteClass', name: name })
        .then(function (r) {
          if (r && r.ok) {
            msg.textContent = 'Deleted ' + name + '.';
            // optimistic local update so the row disappears even if the reload fails
            staff.classes = staff.classes.filter(function (c) { return c.name !== name; });
            renderClasses();
            staffReloadClasses();
          }
          else if (r && r.error === 'not-owner') { btn.disabled = false; msg.textContent = 'Only ' + (r.owner || 'its owner') + ' can delete ' + name + '.'; }
          else { btn.disabled = false; msg.textContent = 'Could not delete ' + name + '.'; }
        })
        .catch(function () { btn.disabled = false; msg.textContent = 'Could not delete ' + name + '. Please try again.'; });
    }
  }
  function openDash(name) {
    staff.current = name;
    staff.rows = [];                       // never show (or CSV-export) another class's rows
    $('dash').innerHTML = '';
    $('dash-title').textContent = name;
    staffView('staff-dash');
    $('staff-dmsg').textContent = 'Loading…';
    var token = ++dashSeq;                 // a superseded slow response must not repopulate
    call('admin', { passcode: staff.pass, sub: 'dashboard', classCode: name })
      .then(function (r) {
        if (token !== dashSeq) return;
        if (r && r.ok) { staff.rows = r.rows || []; renderDash(staff.rows); $('staff-dmsg').textContent = ''; }
        else $('staff-dmsg').textContent = 'Could not load the class. Please try again.';
      })
      .catch(function () { if (token === dashSeq) $('staff-dmsg').textContent = 'Could not load the class. Please try again.'; });
  }
  function dashCsv() {
    function q(s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }
    function yn(v) { return v ? 'done' : '-'; }
    var head = 'Pupil,La Carte,La Cuisine,Le 14 Juillet,Personnes Celebres,Project link';
    var lines = staff.rows.map(function (r) {
      return [q(r.name), yn(r.s1), yn(r.s2), yn(r.s3), yn(r.s4), q(r.docUrl || '')].join(',');
    });
    copyText([head].concat(lines).join('\n'), $('staff-dmsg'), 'CSV copied — paste it into Excel or Sheets.',
      'Could not copy here — try again, or read the table on screen.');   // never dump multi-line CSV into the message line
  }
  function openQr(name) {
    var link = classLink(name);
    $('qr-title').textContent = name;
    $('qr-link').textContent = link;
    $('staff-qmsg').textContent = '';
    staffView('staff-qr');
    var canvas = $('qr-canvas');
    if (window.QRCode && window.QRCode.toCanvas) {
      window.QRCode.toCanvas(canvas, link, { width: 260, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#122a4f', light: '#ffffff' } }, function (err) {
        if (err) $('staff-qmsg').textContent = 'Could not draw the QR code — use Copy link instead.';
      });
    } else {
      $('staff-qmsg').textContent = 'QR unavailable here — use Copy link instead.';
    }
    $('qr-copy').onclick = function () { copyText(link, $('staff-qmsg'), 'Link for ' + name + ' copied.'); };
  }
  function staffOpenModal() {
    show($('staff-modal'));
    if (staff.pass) { staffView('staff-classes'); staffReloadClasses(); }
    else { staffView('staff-gate'); var p = $('staff-pass'); if (p) p.focus(); }
  }

  /* ============================================================
     Boot
     ============================================================ */
  function boot() {
    // Preview-only convenience: visiting the page with "?reset" wipes saved progress
    // for a fresh run. GUARDED to offline/preview (no OLS_TRANSPORT) so it can NEVER
    // clear a pupil's saved work on the deployed Apps Script app.
    if (!window.OLS_TRANSPORT && /(^|[?&])reset(=|&|$)/.test(location.search)) {
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      if (window.history && history.replaceState) history.replaceState({}, '', location.pathname);
    }

    // wire events
    $('welcome-start').addEventListener('click', function () { hide($('welcome')); show($('home')); });
    document.querySelectorAll('.station').forEach(function (btn) {
      btn.addEventListener('click', function () { openStationModal(Number(btn.getAttribute('data-station'))); });
    });
    $('sm-close').addEventListener('click', closeStationModal);
    $('sm-done').addEventListener('click', function () { if (openStation) markStationDone(openStation); closeStationModal(); });
    $('st1-back').addEventListener('click', closeStation1);
    $('carte-check').addEventListener('click', checkStation1);
    $('carte-done').addEventListener('click', finishCarte);
    $('carte-text').addEventListener('input', updateCarteWrite);
    $('carte-cards-btn').addEventListener('click', function () { openCarousel(s1.idx); });
    $('carte-cx').addEventListener('click', closeCarousel);
    $('carte-scrim').addEventListener('click', closeCarousel);
    $('carte-prev').addEventListener('click', function () { gotoCard(s1.idx - 1); });
    $('carte-next').addEventListener('click', function () { gotoCard(s1.idx + 1); });
    carouselVp().addEventListener('pointerdown', carouselDown);
    $('st2-back').addEventListener('click', closeStation2);
    $('cuis-done').addEventListener('click', finishCuisine);
    $('dish-info-close').addEventListener('click', function () { hide($('dish-info')); });
    $('dish-info-scrim').addEventListener('click', function () { hide($('dish-info')); });
    $('st3-back').addEventListener('click', closeStation3);
    $('bd-done').addEventListener('click', finishBday);
    $('bd-text').addEventListener('input', updateBdWrite);
    $('st4-back').addEventListener('click', closeStation4);
    $('ppl-check').addEventListener('click', checkStation4);
    $('ppl-done').addEventListener('click', finishCeleb);
    $('ppl-text').addEventListener('input', updateCelebWrite);
    $('create').addEventListener('click', createProject);
    $('doc-preview-close').addEventListener('click', function () { hide($('doc-preview')); });
    $('guide-from-preview').addEventListener('click', docsGuide.open);
    $('sites-from-preview').addEventListener('click', sitesGuide.open);
    docsGuide.wire();
    sitesGuide.wire();
    $('staff-key').addEventListener('click', staffOpenModal);
    $('staff-close').addEventListener('click', function () { hide($('staff-modal')); });
    $('staff-go').addEventListener('click', staffUnlock);
    $('staff-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') staffUnlock(); });
    $('staff-add').addEventListener('click', addClass);
    $('staff-newclass').addEventListener('keydown', function (e) { if (e.key === 'Enter') addClass(); });
    $('staff-all').addEventListener('change', function () { staff.all = $('staff-all').checked; renderClasses(); });
    $('staff-class-list').addEventListener('click', onClassListClick);
    $('dash-back').addEventListener('click', function () { staffView('staff-classes'); staffReloadClasses(); });
    $('qr-back').addEventListener('click', function () { staffView('staff-classes'); });
    $('staff-refresh').addEventListener('click', function () { if (staff.current) openDash(staff.current); });
    $('staff-csv').addEventListener('click', dashCsv);
    document.addEventListener('keydown', function (e) {
      if ($('carte-carousel') && !$('carte-carousel').hidden) {
        if (e.key === 'ArrowLeft') { gotoCard(s1.idx - 1); return; }
        if (e.key === 'ArrowRight') { gotoCard(s1.idx + 1); return; }
        if (e.key === 'Escape') { closeCarousel(); return; }
      }
      var og = docsGuide.isOpen() ? docsGuide : (sitesGuide.isOpen() ? sitesGuide : null);
      if (og) {
        if (e.key === 'ArrowLeft') { og.go(og.idx() - 1); return; }
        if (e.key === 'ArrowRight') { og.go(og.idx() + 1); return; }
        if (e.key === 'Escape') { og.close(); return; }
      }
      if (e.key === 'Escape') { closeStationModal(); hide($('staff-modal')); hide($('dish-info')); hide($('doc-preview')); }
    });

    // identity + saved state
    call('whoami', {})
      .then(function (r) { state.email = (r && r.email) || ''; })
      .catch(function () {})
      .then(function () { return call('load', {}); })
      .then(function (r) {
        if (r && r.ok) {
          state.name = r.name || '';
          state.stations = r.stations || state.stations;
          state.docUrl = r.docUrl || '';
          state.data = r.data || {};
        }
      })
      .catch(function () {})
      .then(function () {
        var firstVisit = doneCount() === 0 && !state.docUrl;
        if (firstVisit) {
          var hello = $('welcome-hello');
          if (hello) hello.textContent = state.email ? ('Signed in as ' + state.email) : 'Signed in with your school account';
          show($('welcome'));
        } else {
          show($('home'));
        }
        if (state.docUrl) showResult(state.docUrl);
        render();
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
