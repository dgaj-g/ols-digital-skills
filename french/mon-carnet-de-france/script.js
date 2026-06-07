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
     Station 3 - Le 14 Juillet. Order 5 story cards into slots (same
     place-on-target + swap model, genuine fail state, date-free fronts
     so dates don't give away the order), then write how/why in own words.
     ============================================================ */
  var BDAY = [
    { key: 'storming', pos: 1, short: 'The storming of the Bastille', full: "On 14 July 1789, crowds of Parisians marched on the Bastille, an old royal fortress and prison, looking for gunpowder and weapons. People saw the prison as a symbol of the king's harsh rule, so its fall became a huge moment at the start of the French Revolution." },
    { key: 'symbol', pos: 2, short: 'A symbol of freedom', full: 'The fall of the Bastille became a symbol of people standing up to unfair rule, and of the ideas France still values: liberté, égalité, fraternité (liberty, equality, brotherhood). Exactly one year later, on 14 July 1790, France held the Fête de la Fédération, a huge peaceful celebration of national unity.' },
    { key: 'holiday', pos: 3, short: "It becomes France's national day", full: 'It took almost a hundred years for 14 July to become an official holiday. A French law made official on 6 July 1880 turned it into the country\'s annual national celebration, remembering both 1789 and the unity festival of 1790.' },
    { key: 'parade', pos: 4, short: 'The grand military parade in Paris', full: 'Every year on the morning of 14 July, Paris holds a famous military parade. Since just after the First World War it has marched down the Champs-Élysées, from the Arc de Triomphe to the Place de la Concorde, where the President watches, with thousands of troops, bands and a flypast.' },
    { key: 'fireworks', pos: 5, short: 'Fireworks and celebrations today', full: "When night falls, the celebrations continue across France. In Paris a spectacular fireworks display lights up the sky around the Eiffel Tower. All over the country there are village fêtes, music and dancing, including the popular bals des pompiers (firefighters' balls)." }
  ];
  function bdByKey(k) { for (var i = 0; i < BDAY.length; i++) if (BDAY[i].key === k) return BDAY[i]; return null; }
  var BD_MIN = 80;   // min characters for the own-words write-up
  var s3 = { built: false, home: {}, occ: {} };
  var drag3 = null;

  function openStation3() { show($('st3')); if (!s3.built) buildStation3(); }
  function closeStation3() { captureBday(); persist(); hide($('st3')); }
  function bdCardEl(key) { return document.getElementById('st3').querySelector('.bd-card[data-key="' + key + '"]'); }
  function slotElByPos(pos) { return document.getElementById('bd-slots').querySelector('.slot[data-pos="' + pos + '"]'); }

  function buildStation3() {
    s3.built = true;
    var tray = $('bd-tray'); tray.innerHTML = '';
    for (var p = 1; p <= 5; p++) { var sl = slotElByPos(p); var card = sl.querySelector('.bd-card'); if (card) card.remove(); sl.classList.remove('correct'); }
    s3.home = {}; s3.occ = { 1: null, 2: null, 3: null, 4: null, 5: null };
    var saved = state.data['3'];
    shuffle(BDAY).forEach(function (c) {
      var li = document.createElement('li'); li.className = 'bd-card'; li.dataset.key = c.key;
      li.innerHTML = '<span class="bd-short">' + escapeHtml(c.short) + '</span><span class="bd-full">' + escapeHtml(c.full) + '</span>';
      li.addEventListener('pointerdown', onBdDown);
      tray.appendChild(li); s3.home[c.key] = 'tray';
    });
    if (saved && saved.complete) {
      BDAY.forEach(function (c) { s3.home[c.key] = c.pos; s3.occ[c.pos] = c.key; renderBdCard(c.key);
        bdCardEl(c.key).classList.add('correct'); slotElByPos(c.pos).classList.add('correct'); });
      show($('bd-write')); $('bd-text').value = saved.writeup || ''; updateBdWrite();
      $('bd-check').hidden = true;
    }
    updateBdCount();
  }

  function onBdDown(e) {
    var li = e.currentTarget;
    if (li.classList.contains('correct')) return;
    e.preventDefault();
    var r = li.getBoundingClientRect();
    drag3 = { key: li.dataset.key, el: li, pid: e.pointerId, sx: e.clientX, sy: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, moved: false };
    try { li.setPointerCapture(e.pointerId); } catch (x) {}
    li.addEventListener('pointermove', onBdMove);
    li.addEventListener('pointerup', onBdUp);
    li.addEventListener('pointercancel', onBdCancel);
  }
  function onBdMove(e) {
    if (!drag3) return;
    if (!drag3.moved) {
      if (Math.abs(e.clientX - drag3.sx) + Math.abs(e.clientY - drag3.sy) < DRAG_THRESH) return;
      drag3.moved = true; document.body.classList.add('dragging-active');
      drag3.el.classList.add('dragging'); drag3.el.style.width = drag3.w + 'px';
    }
    drag3.el.style.left = (e.clientX - drag3.offX) + 'px';
    drag3.el.style.top = (e.clientY - drag3.offY) + 'px';
    bdHover(e.clientX, e.clientY);
  }
  function endBd(li) { li.removeEventListener('pointermove', onBdMove); li.removeEventListener('pointerup', onBdUp); li.removeEventListener('pointercancel', onBdCancel); }
  function onBdUp(e) {
    if (!drag3) return;
    var el = drag3.el, key = drag3.key, moved = drag3.moved;
    try { el.releasePointerCapture(drag3.pid); } catch (x) {}
    endBd(el); bdClearHover();
    document.body.classList.remove('dragging-active');
    el.classList.remove('dragging'); el.style.width = ''; el.style.left = ''; el.style.top = '';
    if (moved) {
      var t = bdTargetAt(e.clientX, e.clientY, el);
      if (t && t.type === 'slot') placeInSlot(key, t.pos);
      else if (t && t.type === 'tray') sendBdToTray(key);
      else renderBdCard(key);
      updateBdCount();
    }
    drag3 = null;
  }
  function onBdCancel() {
    if (!drag3) return;
    try { drag3.el.releasePointerCapture(drag3.pid); } catch (x) {}
    endBd(drag3.el); bdClearHover();
    document.body.classList.remove('dragging-active');
    drag3.el.classList.remove('dragging'); drag3.el.style.width = ''; drag3.el.style.left = ''; drag3.el.style.top = '';
    renderBdCard(drag3.key); drag3 = null;
  }
  function bdTargetAt(x, y, exclude) {
    exclude.style.pointerEvents = 'none';
    var els = document.elementsFromPoint(x, y), res = null;
    for (var i = 0; i < els.length; i++) {
      var slot = els[i].closest && els[i].closest('.slot');
      if (slot) { res = { type: 'slot', pos: Number(slot.dataset.pos) }; break; }
      var tray = els[i].closest && els[i].closest('#bd-tray');
      if (tray) { res = { type: 'tray' }; break; }
    }
    exclude.style.pointerEvents = '';
    return res;
  }
  function bdHover(x, y) {
    bdClearHover(); if (!drag3) return;
    drag3.el.style.pointerEvents = 'none';
    var els = document.elementsFromPoint(x, y);
    drag3.el.style.pointerEvents = '';
    for (var i = 0; i < els.length; i++) { var sl = els[i].closest && els[i].closest('.slot'); if (sl) { sl.classList.add('drop-hover'); break; } }
  }
  function bdClearHover() { document.querySelectorAll('#st3 .drop-hover').forEach(function (e) { e.classList.remove('drop-hover'); }); }
  function placeInSlot(key, pos) {
    var prev = s3.home[key], occ = s3.occ[pos];
    if (occ && occ !== key) {
      if (prev && prev !== 'tray') { s3.occ[prev] = occ; s3.home[occ] = prev; } else { s3.home[occ] = 'tray'; }
    } else if (prev && prev !== 'tray' && prev !== pos) { s3.occ[prev] = null; }
    s3.occ[pos] = key; s3.home[key] = pos;
    renderBdCard(key); if (occ && occ !== key) renderBdCard(occ);
  }
  function sendBdToTray(key) { var prev = s3.home[key]; if (prev && prev !== 'tray') s3.occ[prev] = null; s3.home[key] = 'tray'; renderBdCard(key); }
  function renderBdCard(key) {
    var el = bdCardEl(key), home = s3.home[key];
    el.classList.remove('wrong'); el.style.left = ''; el.style.top = '';
    if (home === 'tray') $('bd-tray').appendChild(el);
    else slotElByPos(home).appendChild(el);
  }
  function bdPlaced() { var n = 0; BDAY.forEach(function (c) { if (s3.home[c.key] !== 'tray') n++; }); return n; }
  function updateBdCount() { $('st3-count').textContent = bdPlaced() + ' / 5 placed'; $('bd-check').disabled = bdPlaced() < 5; }
  function checkStation3() {
    var correct = 0;
    BDAY.forEach(function (c) {
      if (s3.home[c.key] === c.pos) { correct++; var el = bdCardEl(c.key); el.classList.add('correct'); slotElByPos(c.pos).classList.add('correct'); }
    });
    BDAY.forEach(function (c) {
      var home = s3.home[c.key];
      if (home !== 'tray' && home !== c.pos) { bdCardEl(c.key).classList.add('wrong'); (function (k) { setTimeout(function () { sendBdToTray(k); updateBdCount(); }, 550); })(c.key); }
    });
    var msg = $('bd-msg');
    if (correct === 5) {
      msg.textContent = 'Exactly right — that is the story of Bastille Day.'; msg.className = 'sv-msg good';
      $('bd-check').hidden = true; show($('bd-write')); updateBdWrite();
    } else {
      msg.textContent = correct + ' of 5 in the right place. The others have come back — read them again and re-order.'; msg.className = 'sv-msg';
      setTimeout(updateBdCount, 600);
    }
  }
  function updateBdWrite() {
    var txt = ($('bd-text').value || '').trim();
    var ok = txt.length >= BD_MIN;
    $('bd-done').disabled = !ok;
    $('bd-wc').textContent = ok ? 'Great — that\'s plenty to put in your project.' : 'Write a little more (' + txt.length + '/' + BD_MIN + ' characters).';
    $('bd-wc').className = ok ? 'sv-msg good' : 'sv-msg';
  }
  function captureBday() {
    var ordered = BDAY.every(function (c) { return s3.home[c.key] === c.pos; });
    var writeup = ($('bd-text') ? $('bd-text').value : '').trim();
    state.data['3'] = { ordered: ordered, writeup: writeup, complete: ordered && writeup.length >= BD_MIN };
    return state.data['3'].complete;
  }
  function finishBday() { if (captureBday()) markStationDone(3); closeStation3(); }

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
    $('bd-check').addEventListener('click', checkStation3);
    $('bd-done').addEventListener('click', finishBday);
    $('bd-text').addEventListener('input', updateBdWrite);
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
