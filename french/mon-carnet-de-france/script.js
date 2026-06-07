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
  var CITIES = [
    { key: 'paris', name: 'Paris', x: 54.9, y: 25.6, fact: 'Paris is the capital of France and home to the Eiffel Tower, the most-visited paid monument in the world. When it was built it was the tallest structure on Earth for over 40 years.' },
    { key: 'marseille', name: 'Marseille', x: 77.4, y: 86.5, fact: "Marseille is France's oldest city, founded around 600 BC by Greek settlers who called it Massalia. It has been a busy Mediterranean port ever since." },
    { key: 'lyon', name: 'Lyon', x: 73.4, y: 59.5, fact: 'Lyon is the food capital of France, with thousands of restaurants. Its traditional cosy eateries are called bouchons.' },
    { key: 'toulouse', name: 'Toulouse', x: 48.2, y: 83.2, fact: "Toulouse is the 'Pink City' (la Ville Rose) for its rosy terracotta-brick buildings. It is also the home of Airbus, where giant passenger planes are built." },
    { key: 'nice', name: 'Nice', x: 91.4, y: 82.0, fact: 'Nice sits on the sunny French Riviera by the Mediterranean. Its seafront walkway, the Promenade des Anglais, is lined with famous blue chairs.' },
    { key: 'nantes', name: 'Nantes', x: 25.9, y: 43.5, fact: 'Nantes was the birthplace of the adventure writer Jules Verne. Visitors can ride a giant 12-metre mechanical elephant inspired by his stories.' },
    { key: 'strasbourg', name: 'Strasbourg', x: 95.1, y: 28.7, fact: 'Strasbourg, near the German border, is the official home of the European Parliament, and is famous for its beautiful Christmas market.' },
    { key: 'bordeaux', name: 'Bordeaux', x: 33.2, y: 69.6, fact: "Bordeaux is France's wine capital, surrounded by vineyards. Its riverside old town is a UNESCO World Heritage Site nicknamed the 'Port of the Moon'." },
    { key: 'lille', name: 'Lille', x: 60.2, y: 6.1, fact: "Lille, in the north, hosts the Braderie de Lille, Europe's largest flea market, every September." }
  ];
  function cityByKey(k) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i].key === k) return CITIES[i]; return null; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var s1 = { built: false, home: {}, occ: {} };   // home[city]='tray'|dotKey ; occ[dotKey]=city|null
  var drag = null;
  var DRAG_THRESH = 6;

  function st1El(sel) { return document.getElementById('st1').querySelector(sel); }
  function tagEl(city) { return document.getElementById('st1').querySelector('.tag[data-city="' + city + '"]'); }
  function dotEl(key) { return document.getElementById('carte-map').querySelector('.dot[data-dot="' + key + '"]'); }

  function openStation1() {
    show($('st1'));
    if (!s1.built) buildStation1();
  }
  function closeStation1() { hide($('st1')); }

  function buildStation1() {
    s1.built = true;
    var map = $('carte-map'), tray = $('carte-tray');
    map.querySelectorAll('.dot, .tag').forEach(function (e) { e.remove(); });
    tray.innerHTML = ''; $('carte-facts').innerHTML = '';
    s1.home = {}; s1.occ = {};
    var done = state.data['1'] && state.data['1'].complete;
    CITIES.forEach(function (c) {
      var d = document.createElement('div');
      d.className = 'dot'; d.dataset.dot = c.key; d.style.left = c.x + '%'; d.style.top = c.y + '%';
      map.appendChild(d); s1.occ[c.key] = null;
    });
    shuffle(CITIES).forEach(function (c) {
      var t = document.createElement('button');
      t.type = 'button'; t.className = 'tag'; t.dataset.city = c.key; t.textContent = c.name;
      t.addEventListener('pointerdown', onTagDown);
      tray.appendChild(t); s1.home[c.key] = 'tray';
    });
    if (done) {                       // restore completed state read-only
      CITIES.forEach(function (c) { s1.home[c.key] = c.key; s1.occ[c.key] = c.key; renderTag(c.key);
        tagEl(c.key).classList.add('correct'); dotEl(c.key).classList.add('correct'); addFact(c); });
      $('carte-check').hidden = true; $('carte-done').hidden = false;
      st1El('#st1-instr').textContent = 'You have placed all nine cities. Tap a fact to remind yourself.';
    }
    updateCount();
  }

  function onTagDown(e) {
    var el = e.currentTarget;
    if (el.classList.contains('correct')) return;     // locked
    e.preventDefault();
    var r = el.getBoundingClientRect();
    drag = { city: el.dataset.city, el: el, pid: e.pointerId, sx: e.clientX, sy: e.clientY,
      offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, moved: false };
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    el.addEventListener('pointermove', onTagMove);
    el.addEventListener('pointerup', onTagUp);
    el.addEventListener('pointercancel', onTagCancel);
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
    $('st1-count').textContent = placedCount() + ' / 9 placed';
    $('carte-check').disabled = placedCount() < 9;
  }
  function addFact(c) {
    var li = document.createElement('li'); li.innerHTML = '<b>' + c.name + '</b> &mdash; ' + escapeHtml(c.fact);
    $('carte-facts').appendChild(li);
  }
  function checkStation1() {
    var correct = 0;
    CITIES.forEach(function (c) {
      if (s1.home[c.key] === c.key) {
        correct++;
        var el = tagEl(c.key);
        if (!el.classList.contains('correct')) { el.classList.add('correct'); dotEl(c.key).classList.add('correct'); addFact(c); }
      }
    });
    CITIES.forEach(function (c) {
      var home = s1.home[c.key];
      if (home !== 'tray' && home !== c.key) {
        tagEl(c.key).classList.add('wrong');
        (function (city) { setTimeout(function () { sendToTray(city); updateCount(); }, 550); })(c.key);
      }
    });
    var msg = $('carte-msg');
    if (correct === 9) {
      msg.textContent = 'Parfait ! All nine cities in the right place.'; msg.className = 'sv-msg good';
      state.data['1'] = { correct: CITIES.map(function (c) { return c.key; }), complete: true };
      markStationDone(1);
      $('carte-check').hidden = true; $('carte-done').hidden = false;
    } else {
      msg.textContent = correct + ' of 9 correct. The ones in the wrong place have come back — try them again.'; msg.className = 'sv-msg';
      setTimeout(updateCount, 600);
    }
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
     Station 3 - Le 14 Juillet. BUILD THE CELEBRATION: drag the four
     parts of a 14 July night in Paris (parade, flypast, fireworks, fete)
     onto a real night scene of the Eiffel Tower. Each pops up a how/why
     fact and animates in; the fireworks set off a burst, and completing
     the scene triggers a fireworks finale. Then write how/why in own words.
     ============================================================ */
  var BD_ELEMS = [
    { key: 'flypast', emoji: '✈️', fr: 'Le défilé aérien', en: 'The flypast', x: 50, y: 12,
      fact: 'At the start of the parade, jets fly over Paris trailing blue, white and red smoke — the colours of the French flag.' },
    { key: 'fireworks', emoji: '🎆', fr: "Les feux d'artifice", en: 'The fireworks', x: 50, y: 26,
      fact: 'When night falls, a spectacular fireworks display lights up the sky around the Eiffel Tower.' },
    { key: 'parade', emoji: '🎖️', fr: 'Le défilé militaire', en: 'The military parade', x: 50, y: 86,
      fact: 'Every 14 July a grand military parade marches down the Champs-Élysées in Paris, watched by the President — one of the oldest regular military parades in Europe.' },
    { key: 'fete', emoji: '🎉', fr: 'La fête', en: 'Parties & dancing', x: 82, y: 72,
      fact: "All over France there are village fêtes, music and dancing, including the popular bals des pompiers (firefighters' balls) at local fire stations." }
  ];
  function bdByKey(k) { for (var i = 0; i < BD_ELEMS.length; i++) if (BD_ELEMS[i].key === k) return BD_ELEMS[i]; return null; }
  var BD_MIN = 80;
  var s3 = { built: false, placed: {} };
  var drag3 = null;

  function openStation3() { show($('st3')); if (!s3.built) buildStation3(); }
  function closeStation3() { captureBday(); persist(); hide($('bd-fact')); hide($('st3')); }
  function bdChip(key) { return document.getElementById('bd-tray').querySelector('.elem-chip[data-key="' + key + '"]'); }

  function buildStation3() {
    s3.built = true;
    var scene = $('bd-scene'); scene.querySelectorAll('.marker, .fw').forEach(function (e) { e.remove(); });
    var tray = $('bd-tray'); tray.innerHTML = '';
    s3.placed = {};
    BD_ELEMS.forEach(function (el) {
      var li = document.createElement('li'); li.className = 'elem-chip'; li.dataset.key = el.key;
      li.innerHTML = '<span class="c-emoji">' + el.emoji + '</span><span><span class="c-fr">' + escapeHtml(el.fr) + '</span><span class="c-en">' + escapeHtml(el.en) + '</span></span>';
      li.addEventListener('pointerdown', onElemDown);
      tray.appendChild(li);
    });
    var saved = state.data['3'];
    if (saved && saved.complete) {
      BD_ELEMS.forEach(function (el) { addMarker(el, true); s3.placed[el.key] = true; bdChip(el.key).classList.add('used'); });
      show($('bd-write')); $('bd-text').value = saved.writeup || ''; updateBdWrite();
      $('bd-msg').textContent = 'Joyeux 14 Juillet ! You have built the celebration.';
    }
    updateBdCount();
  }

  function onElemDown(e) {
    var li = e.currentTarget;
    if (li.classList.contains('used')) return;
    e.preventDefault();
    var r = li.getBoundingClientRect();
    drag3 = { key: li.dataset.key, el: li, pid: e.pointerId, sx: e.clientX, sy: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, moved: false };
    try { li.setPointerCapture(e.pointerId); } catch (x) {}
    li.addEventListener('pointermove', onElemMove);
    li.addEventListener('pointerup', onElemUp);
    li.addEventListener('pointercancel', onElemCancel);
  }
  function onElemMove(e) {
    if (!drag3) return;
    if (!drag3.moved) {
      if (Math.abs(e.clientX - drag3.sx) + Math.abs(e.clientY - drag3.sy) < DRAG_THRESH) return;
      drag3.moved = true; document.body.classList.add('dragging-active');
      drag3.el.classList.add('dragging'); drag3.el.style.width = drag3.w + 'px';
    }
    drag3.el.style.left = (e.clientX - drag3.offX) + 'px';
    drag3.el.style.top = (e.clientY - drag3.offY) + 'px';
    var over = overScene(e.clientX, e.clientY);
    $('bd-scene').classList.toggle('drop-hover', over);
  }
  function endElem(li) { li.removeEventListener('pointermove', onElemMove); li.removeEventListener('pointerup', onElemUp); li.removeEventListener('pointercancel', onElemCancel); }
  function onElemUp(e) {
    if (!drag3) return;
    var el = drag3.el, key = drag3.key, moved = drag3.moved;
    try { el.releasePointerCapture(drag3.pid); } catch (x) {}
    endElem(el);
    document.body.classList.remove('dragging-active');
    $('bd-scene').classList.remove('drop-hover');
    el.classList.remove('dragging'); el.style.width = ''; el.style.left = ''; el.style.top = '';
    if (moved && overScene(e.clientX, e.clientY) && !s3.placed[key]) placeElement(key);
    drag3 = null;
  }
  function onElemCancel() {
    if (!drag3) return;
    try { drag3.el.releasePointerCapture(drag3.pid); } catch (x) {}
    endElem(drag3.el);
    document.body.classList.remove('dragging-active');
    $('bd-scene').classList.remove('drop-hover');
    drag3.el.classList.remove('dragging'); drag3.el.style.width = ''; drag3.el.style.left = ''; drag3.el.style.top = '';
    drag3 = null;
  }
  function overScene(x, y) {
    var r = $('bd-scene').getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function addMarker(el) {
    var m = document.createElement('div'); m.className = 'marker'; m.dataset.key = el.key;
    m.style.left = el.x + '%'; m.style.top = el.y + '%';
    m.innerHTML = '<span class="m-emoji">' + el.emoji + '</span><span class="m-label">' + escapeHtml(el.fr) + '</span>';
    $('bd-scene').appendChild(m);
  }
  function placeElement(key) {
    var el = bdByKey(key);
    s3.placed[key] = true;
    bdChip(key).classList.add('used');
    addMarker(el);
    if (key === 'fireworks') fireworkBurst(el.x, el.y);
    showBdFact(el);
    updateBdCount();
    if (BD_ELEMS.every(function (e) { return s3.placed[e.key]; })) bdFinale();
  }
  function fireworkBurst(xPct, yPct) {
    var scene = $('bd-scene');
    var colors = ['#E4B824', '#ffffff', '#EF4135', '#4d8bff', '#ff7ad9', '#5ce1a6'];
    for (var i = 0; i < 18; i++) {
      var p = document.createElement('span'); p.className = 'fw';
      var ang = Math.random() * Math.PI * 2, dist = 28 + Math.random() * 70;
      p.style.left = xPct + '%'; p.style.top = yPct + '%';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * dist) + 'px');
      scene.appendChild(p);
      (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1000); })(p);
    }
  }
  function bdFinale() {
    for (var i = 0; i < 6; i++) { (function (n) { setTimeout(function () { fireworkBurst(15 + Math.random() * 70, 8 + Math.random() * 34); }, n * 300); })(i); }
    $('bd-msg').textContent = 'Joyeux 14 Juillet ! It all remembers the storming of the Bastille in 1789 and the ideas of liberte, egalite, fraternite.';
    $('bd-msg').className = 'sv-msg good';
    show($('bd-write')); updateBdWrite();
  }
  function showBdFact(el) {
    $('bd-fact-title').innerHTML = '<span style="font-style:normal">' + el.emoji + '</span>  ' + escapeHtml(el.fr) + ' / ' + escapeHtml(el.en);
    $('bd-fact-text').textContent = el.fact;
    show($('bd-fact'));
  }
  function bdCount() { var n = 0; BD_ELEMS.forEach(function (e) { if (s3.placed[e.key]) n++; }); return n; }
  function updateBdCount() { $('st3-count').textContent = bdCount() + ' / 4 added'; }
  function updateBdWrite() {
    var txt = ($('bd-text').value || '').trim();
    var ok = txt.length >= BD_MIN;
    $('bd-done').disabled = !ok;
    $('bd-wc').textContent = ok ? "Great — that's plenty for your project." : 'Write a little more (' + txt.length + '/' + BD_MIN + ' characters).';
    $('bd-wc').className = ok ? 'sv-msg good' : 'sv-msg';
  }
  function captureBday() {
    var built = BD_ELEMS.every(function (e) { return s3.placed[e.key]; });
    var writeup = ($('bd-text') ? $('bd-text').value : '').trim();
    state.data['3'] = { built: built, writeup: writeup, complete: built && writeup.length >= BD_MIN };
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
        s.docUrl = 'https://docs.google.com/document/d/PREVIEW_STUB/edit';
        offlineSave(s);
        return Promise.resolve({ ok: true, url: s.docUrl });
      case 'admin':
        if (String(p.passcode || '').trim().toLowerCase() !== 'demo') {
          return Promise.resolve({ ok: false, error: 'bad-passcode' });
        }
        return Promise.resolve({
          ok: true,
          rows: [{
            name: 'demo.pupil@offline', s1: !!(s.stations && s.stations[1]), s2: !!(s.stations && s.stations[2]),
            s3: !!(s.stations && s.stations[3]), s4: !!(s.stations && s.stations[4]), docUrl: s.docUrl || ''
          }]
        });
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
      create.disabled = c !== 4;
      var lock = create.querySelector('.lock');
      if (lock) lock.style.display = c === 4 ? 'none' : '';
      if (finish) finish.classList.toggle('ready', c === 4);
      if (hint) {
        if (state.docUrl) hint.textContent = 'Your project has been created. You can make changes to it any time.';
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
      '<p><a href="' + url + '" target="_blank" rel="noopener">Open my project to edit it</a></p>';
    show(box);
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

  function createProject() {
    var btn = $('create');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating your project...'; }
    call('makeDoc', {})
      .then(function (r) {
        if (r && r.ok && r.url) {
          state.docUrl = r.url;
          showResult(r.url);
          render();
        } else {
          alert('Sorry, the project could not be created just now. Please try again.');
        }
      })
      .catch(function () { alert('Sorry, the project could not be created just now. Please try again.'); })
      .then(function () {
        var b = $('create');
        if (b) b.innerHTML = 'Créer mon projet / Make my project';
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
      var doc = r.docUrl ? '<td><a href="' + r.docUrl + '" target="_blank" rel="noopener">Open</a></td>' : '<td class="no">–</td>';
      return '<tr><td>' + escapeHtml(r.name || '') + '</td>' + cell(r.s1) + cell(r.s2) + cell(r.s3) + cell(r.s4) + doc + '</tr>';
    }).join('');
    t.innerHTML = head + (body || '<tr><td colspan="6">No pupils yet.</td></tr>');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function staffOpen() {
    var pass = ($('staff-pass').value || '').trim();
    var msg = $('staff-msg');
    msg.textContent = '';
    $('staff-go').disabled = true;
    call('admin', { passcode: pass, sub: 'dashboard' })
      .then(function (r) {
        if (r && r.ok) {
          hide($('staff-gate'));
          show($('staff-board'));
          renderDash(r.rows);
        } else {
          msg.textContent = 'That passcode was not recognised. Try again.';
        }
      })
      .catch(function () { msg.textContent = 'Something went wrong. Please try again.'; })
      .then(function () { $('staff-go').disabled = false; });
  }
  function staffRefresh() {
    var pass = ($('staff-pass').value || '').trim();
    call('admin', { passcode: pass, sub: 'dashboard' })
      .then(function (r) { if (r && r.ok) renderDash(r.rows); })
      .catch(function () {});
  }

  /* ============================================================
     Boot
     ============================================================ */
  function boot() {
    // wire events
    $('welcome-start').addEventListener('click', function () { hide($('welcome')); show($('home')); });
    document.querySelectorAll('.station').forEach(function (btn) {
      btn.addEventListener('click', function () { openStationModal(Number(btn.getAttribute('data-station'))); });
    });
    $('sm-close').addEventListener('click', closeStationModal);
    $('sm-done').addEventListener('click', function () { if (openStation) markStationDone(openStation); closeStationModal(); });
    $('st1-back').addEventListener('click', closeStation1);
    $('carte-check').addEventListener('click', checkStation1);
    $('carte-done').addEventListener('click', closeStation1);
    $('st2-back').addEventListener('click', closeStation2);
    $('cuis-done').addEventListener('click', finishCuisine);
    $('dish-info-close').addEventListener('click', function () { hide($('dish-info')); });
    $('st3-back').addEventListener('click', closeStation3);
    $('bd-done').addEventListener('click', finishBday);
    $('bd-text').addEventListener('input', updateBdWrite);
    $('bd-fact-close').addEventListener('click', function () { hide($('bd-fact')); });
    $('st4-back').addEventListener('click', closeStation4);
    $('ppl-check').addEventListener('click', checkStation4);
    $('ppl-done').addEventListener('click', finishCeleb);
    $('ppl-text').addEventListener('input', updateCelebWrite);
    $('create').addEventListener('click', createProject);
    $('staff-key').addEventListener('click', function () { show($('staff-modal')); var p = $('staff-pass'); if (p) p.focus(); });
    $('staff-close').addEventListener('click', function () { hide($('staff-modal')); });
    $('staff-go').addEventListener('click', staffOpen);
    $('staff-refresh').addEventListener('click', staffRefresh);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeStationModal(); hide($('staff-modal')); }
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
