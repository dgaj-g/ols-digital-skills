/* ============================================================
   My Kitchen Portfolio - front-end
   ------------------------------------------------------------
   ONE codebase, two homes:
   - On the Apps Script page, window.OLS_TRANSPORT routes calls through
     google.script.run (same-origin, carries the verified C2k sign-in),
     and video files stream straight to Drive with a resumable upload.
   - On github.io / local preview, OLS_TRANSPORT is absent, so we fall
     back to an offline stub backed by localStorage (photos keep a local
     thumbnail; the Doc becomes an in-page preview). This lets the whole
     journey be reviewed without deploying.

   The pupil's year group (J1/J2/J3) decides which focus areas she sees
   AND the kitchen colour tone. It comes from the class the teacher
   created (injected by the server as OLS_BOOT.classYear); if the class
   has no year (bare /exec or legacy), the pupil picks once on welcome.
   ============================================================ */
(function () {
  'use strict';

  var BOOT = window.OLS_BOOT || { classCode: 'default', baseUrl: '', classYear: '' };
  var ASSET = window.OLS_ASSET_BASE || '';
  var ONLINE = !!(window.OLS_TRANSPORT && typeof window.OLS_TRANSPORT.call === 'function');

  /* ============================================================
     The focus areas - straight from the department's Schemes of Work
     (Helena's brief). Keys are unique per year so saved answers can
     never collide. costing:true switches on the recipe-costing table.
     ============================================================ */
  var FOCUS = {
    J1: [
      { key: 'hygiene', icon: '\u{1F9FC}', term: 'Term 1', name: 'Hygiene and Safety',
        prompt: 'What did you do to keep yourself and your food safe in this practical?',
        hint: 'Think about: washing your hands, tying hair back, your apron, clean worktops, and using knives and the cooker safely.',
        ph: 'Before I started cooking, I…' },
      { key: 'skills', icon: '\u{1F52A}', term: 'Term 1', name: 'Skills and Equipment',
        prompt: 'Which skills and pieces of equipment did you use today?',
        hint: 'Name the skills (chopping, rubbing in, simmering…) and the equipment that went with them. Which skill are you proudest of, and which needs more practice?',
        ph: 'Today I practised…' },
      { key: 'foodgroups', icon: '\u{1F957}', term: 'Terms 2–3', name: 'Food Groups',
        prompt: 'Which food groups from the Eatwell Guide are in your dish?',
        hint: 'Go through your ingredients one by one. Is your dish balanced? What could you add or swap to make it more balanced?',
        ph: 'My dish contains…' },
      { key: 'provenance', icon: '\u{1F69C}', term: 'Terms 2–3', name: 'Food Provenance',
        prompt: 'Where do the main ingredients in your dish come from?',
        hint: 'Pick two ingredients and tell their farm-to-fork story. Were they grown, reared or caught? Did they come from Northern Ireland or further away?',
        ph: 'The flour in my dish comes from…' }
    ],
    J2: [
      { key: 'hygiene2', icon: '\u{1F9FC}', term: 'Term 1', name: 'Hygiene and Safety',
        prompt: 'How did you keep your food safe to eat in this practical?',
        hint: 'Think about personal hygiene, your work area, and how you stored, prepared and cooked your ingredients.',
        ph: 'To keep my food safe, I…' },
      { key: 'skills2', icon: '\u{1F52A}', term: 'Term 1', name: 'Skills and Equipment',
        prompt: 'Which skills and equipment did you use today — and what was new?',
        hint: 'Which technique was the trickiest, and how did you manage it? What would you like to perfect next time?',
        ph: 'The trickiest part was…' },
      { key: 'nutrients', icon: '\u{1F4AA}', term: 'Term 1', name: 'Nutrients',
        prompt: 'Which nutrients does your dish provide, and what does each one do for your body?',
        hint: 'Think protein, carbohydrates, fats, vitamins, minerals and fibre — and which ingredient provides each one.',
        ph: 'My dish is a good source of…' },
      { key: 'label', icon: '\u{1F3F7}️', term: 'Term 1', name: 'Exploring a Food Label',
        prompt: 'Look closely at the label on one of your ingredients. What does it tell you?',
        hint: 'Traffic-light colours, the ingredients list, allergy advice, portion size, storage instructions — did anything surprise you?',
        ph: 'I looked at the label on…' },
      { key: 'health', icon: '❤️', term: 'Terms 2–3', name: 'Priority Health Issues',
        prompt: 'How could your recipe be adapted for a specific health condition?',
        hint: 'Choose a condition — for example heart disease, obesity, type 2 diabetes or anaemia. Say exactly what you would change in the recipe, and why it helps.',
        ph: 'To adapt this recipe for…, I would…' }
    ],
    J3: [
      { key: 'crosscon', icon: '⚠️', term: 'Term 1', name: 'Hygiene: Cross-Contamination',
        prompt: 'What were the cross-contamination risks in this practical, and how did you control them?',
        hint: 'Think raw and cooked foods, colour-coded chopping boards, cloths and tea towels, washing hands between tasks, and how things were stored in the fridge.',
        ph: 'The biggest cross-contamination risk today was…' },
      { key: 'appliances', icon: '⚡', term: 'Term 1', name: 'Skills: Electrical Appliances',
        prompt: 'Which electrical appliances did you use, and how did you use them safely and effectively?',
        hint: 'Food processor, blender, hand mixer, microwave… What did each appliance add to your dish that hand tools could not?',
        ph: 'I used the… to…' },
      { key: 'explorefood', icon: '\u{1F52C}', term: 'Term 1', name: 'Nutritional Analysis (Explore Food)',
        prompt: 'What did the Explore Food program show you about your dish?',
        hint: 'Run your recipe through Explore Food, then comment on the energy, fat, saturates, sugars, salt and fibre. Was anything higher or lower than you expected?',
        ph: 'The analysis showed that my dish…' },
      { key: 'costing', icon: '\u{1F4B7}', term: 'Term 1', name: 'Costing of Recipe', costing: true,
        prompt: 'Cost your recipe below — then, was your dish good value for money?',
        hint: 'How does the cost per portion compare with a shop-bought version or a takeaway?',
        ph: 'Compared with buying it ready-made…' },
      { key: 'lifecycle', icon: '\u{1F9D2}', term: 'Terms 2–3', name: 'Adapting for Life-Cycle Stages',
        prompt: 'Which stage of the life cycle could your recipe be adapted for, and how?',
        hint: 'Choose a stage — toddlers, teenagers, pregnancy or older adults. What would you change about the ingredients, portion size or texture, and why?',
        ph: 'To adapt this dish for…, I would…' }
    ]
  };
  var YEARS = ['J1', 'J2', 'J3'];
  var YEAR_LABEL = { J1: 'J1 · Year 8', J2: 'J2 · Year 9', J3: 'J3 · Year 10' };

  var STAR_CATS = [
    { key: 'appearance', label: 'How did it look?' },
    { key: 'taste', label: 'How did it taste?' },
    { key: 'texture', label: 'How was the texture?' }
  ];
  var STAR_WORDS = ['', 'Needs work', 'Getting there', 'Good', 'Really good', 'Restaurant standard'];
  var OUTCOMES = [
    'Even better than I hoped',
    'Just as I planned',
    'Good, with a few hiccups along the way',
    'Not as planned — but I know what I would change'
  ];
  var CONFIDENCE = [
    'I worked independently',
    'I needed a little help',
    'I needed quite a lot of help — and that is how you learn'
  ];
  var LEVELS = [
    { n: 1, name: 'Apprentice Chef' },
    { n: 3, name: 'Confident Cook' },
    { n: 5, name: 'Sous Chef' },
    { n: 8, name: 'Head Chef' },
    { n: 12, name: 'Executive Chef' }
  ];

  var MAX_PHOTOS = 6;
  var MAX_VIDEOS = 2;
  var MIN_WORDS_FOCUS = 8;
  var MIN_WORDS_OPEN = 5;

  // ---- local state ----
  var state = { email: '', name: '', year: '', docUrl: '', entries: [], draft: null };
  var step = 1;

  // ---- tiny DOM helpers ----
  function $(id) { return document.getElementById(id); }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function wordCount(s) { s = (s || '').trim(); return s ? s.split(/\s+/).length : 0; }
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function niceDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return String(iso || '');
    return Number(m[3]) + ' ' + (MONTHS[Number(m[2]) - 1] || '') + ' ' + m[1];
  }
  function focusList() { return FOCUS[state.year] || FOCUS.J1; }
  function focusByKey(k) {
    var list = focusList();
    for (var i = 0; i < list.length; i++) if (list[i].key === k) return list[i];
    return null;
  }
  function uid() { return 'e' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ============================================================
     Transport: OLS_TRANSPORT (Path B) or an offline localStorage stub
     ============================================================ */
  var LS_KEY = 'kp-' + BOOT.classCode;
  var LS_THUMBS = 'kp-thumbs-' + BOOT.classCode;

  function offlineStore() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function offlineSave(obj) { try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch (e) {} }
  function thumbsStore() {
    try { return JSON.parse(localStorage.getItem(LS_THUMBS) || '{}'); } catch (e) { return {}; }
  }
  function saveThumb(id, dataUrl) {
    try {
      var t = thumbsStore();
      t[id] = dataUrl;
      var keys = Object.keys(t);
      if (keys.length > 40) { keys.sort(); for (var i = 0; i < keys.length - 40; i++) delete t[keys[i]]; }
      localStorage.setItem(LS_THUMBS, JSON.stringify(t));
    } catch (e) {}
  }
  function getThumb(id) { return thumbsStore()[id] || ''; }

  function offlineCall(p) {
    var s = offlineStore();
    switch (p.action) {
      case 'whoami':
        return Promise.resolve({ ok: true, email: 'demo.pupil@offline (preview)' });
      case 'load':
        return Promise.resolve({
          ok: true,
          name: s.name || '',
          year: s.year || '',
          docUrl: s.docUrl || '',
          entries: s.entries || [],
          draft: s.draft || null
        });
      case 'save':
        s.name = p.name != null ? p.name : (s.name || '');
        s.year = p.year != null ? p.year : (s.year || '');
        // same contract as the server: a null draft never wipes a stored one
        if (p.draft && typeof p.draft === 'object') s.draft = p.draft;
        else if (p.clearDraft === true) s.draft = null;
        offlineSave(s);
        return Promise.resolve({ ok: true });
      case 'uploadPhoto': {
        var pid = 'offp' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
        return new Promise(function (resolve) {
          setTimeout(function () { resolve({ ok: true, id: pid }); }, 700);
        });
      }
      case 'getUpload':
        // offline: no Drive - the caller falls back to a simulated upload
        return Promise.resolve({ ok: false, error: 'offline' });
      case 'uploadVideo': {
        var vid = 'offv' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
        return new Promise(function (resolve) {
          setTimeout(function () { resolve({ ok: true, id: vid, url: '' }); }, 1200);
        });
      }
      case 'registerMedia':
        return Promise.resolve({ ok: true, url: '' });
      case 'deleteMedia':
        return Promise.resolve({ ok: true });
      case 'submitEntry': {
        s.entries = s.entries || [];
        s.entries.push(p.summary);
        s.draft = null;
        offlineSave(s);
        // preview:true tells the client to render the entry locally instead of a real Doc
        return Promise.resolve({ ok: true, preview: true, url: '', entries: s.entries });
      }
      case 'admin': {
        if (String(p.passcode || '').trim().toLowerCase() !== 'demo') {
          return Promise.resolve({ ok: false, error: 'bad-passcode' });
        }
        var ME = 'demo.teacher@c2ken.net';
        var reg = s.staffClasses || [
          { name: '8A-HE', owner: ME, year: 'J1' },
          { name: '9C-HE', owner: 'other.teacher@c2ken.net', year: 'J2' }
        ];
        s.staffClasses = reg; offlineSave(s);
        if (p.sub === 'classes') {
          return Promise.resolve({
            ok: true, me: ME,
            classes: reg.map(function (c) {
              return { name: c.name, owner: c.owner || '', year: c.year || '', mine: c.owner === ME, pupils: c.name === '8A-HE' ? 1 : 0 };
            })
          });
        }
        if (p.sub === 'addClass') {
          var nm = String(p.name || '').trim().replace(/[^A-Za-z0-9_\- ]/g, '').replace(/\s+/g, '-').slice(0, 40);
          if (!nm || nm === 'default') return Promise.resolve({ ok: false, error: 'bad-name' });
          if (YEARS.indexOf(String(p.year || '')) === -1) return Promise.resolve({ ok: false, error: 'bad-year' });
          for (var i = 0; i < reg.length; i++) if (reg[i].name.toLowerCase() === nm.toLowerCase()) return Promise.resolve({ ok: false, error: 'exists', name: reg[i].name });
          reg.push({ name: nm, owner: ME, year: p.year }); s.staffClasses = reg; offlineSave(s);
          return Promise.resolve({ ok: true, name: nm, owner: ME, year: p.year });
        }
        if (p.sub === 'deleteClass') {
          var found = null;
          reg.forEach(function (c) { if (c.name === p.name) found = c; });
          if (found && found.owner && found.owner !== ME) return Promise.resolve({ ok: false, error: 'not-owner', owner: found.owner });
          s.staffClasses = reg.filter(function (c) { return c.name !== p.name; }); offlineSave(s);
          return Promise.resolve({ ok: true, name: p.name, removed: 0 });
        }
        // dashboard
        var last = (s.entries && s.entries.length)
          ? (s.entries[s.entries.length - 1].dish + ' · ' + niceDate(s.entries[s.entries.length - 1].date))
          : '';
        return Promise.resolve({
          ok: true, classCode: p.classCode || '8A-HE',
          rows: [{ name: s.name || 'demo.pupil@offline', entries: (s.entries || []).length, last: last, docUrl: s.docUrl || '' }]
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
    if (ONLINE) return window.OLS_TRANSPORT.call(p);
    return offlineCall(p);
  }

  /* ============================================================
     Saving (quiet background autosave with a visible "Saved" dot)
     ============================================================ */
  var saveTimer = null;
  var savePending = false;
  function persistSoon() {
    savePending = true;
    setSaveDot('saving');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, 1200);
  }
  function persistNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!savePending) return Promise.resolve();
    savePending = false;
    return call('save', { name: state.name, year: state.year, draft: state.draft })
      .then(function (r) {
        // the RPC can succeed while the server still refuses the save - never
        // show "Saved" unless it really was
        if (r && r.ok) { setSaveDot('saved'); return; }
        savePending = true;
        if (r && r.error === 'draft-too-big') setSaveDot('error', 'Not saved — your answers are very long. Trim a little.');
        else if (r && r.error === 'not-signed-in') setSaveDot('error', 'Not saved — refresh this page to sign back in.');
        else setSaveDot('error');
      })
      .catch(function () { setSaveDot('error'); savePending = true; });
  }
  var saveDotTimer = null;
  function setSaveDot(mode, text) {
    var el = $('save-dot');
    if (!el) return;
    if (saveDotTimer) { clearTimeout(saveDotTimer); saveDotTimer = null; }
    if (mode === 'saving') { el.textContent = 'Saving…'; el.style.color = ''; }
    else if (mode === 'saved') {
      el.textContent = 'Saved ✓'; el.style.color = '';
      saveDotTimer = setTimeout(function () { el.textContent = ''; }, 2600);
    } else if (mode === 'error') { el.textContent = text || 'Not saved yet'; el.style.color = '#b04a3a'; }
    else el.textContent = '';
  }

  /* ============================================================
     Year + theming
     ============================================================ */
  function applyYear() {
    if (YEARS.indexOf(state.year) !== -1) document.body.setAttribute('data-year', state.year);
    else document.body.removeAttribute('data-year');
    var badge = $('year-badge');
    if (badge) badge.textContent = state.year ? YEAR_LABEL[state.year] : '';
  }

  /* ============================================================
     Welcome
     ============================================================ */
  var pickedYear = '';
  function wireWelcome() {
    document.querySelectorAll('#year-pick .year-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        pickedYear = b.getAttribute('data-year');
        document.querySelectorAll('#year-pick .year-chip').forEach(function (x) {
          x.classList.toggle('on', x === b);
        });
      });
    });
    $('welcome-start').addEventListener('click', function () {
      var name = ($('kp-name').value || '').trim();
      var msg = $('welcome-msg');
      if (name.length < 2) { msg.textContent = 'Type your name first — it goes on your portfolio.'; return; }
      var needYear = !state.year;
      if (needYear && YEARS.indexOf(pickedYear) === -1) { msg.textContent = 'And pick your year group.'; return; }
      msg.textContent = '';
      state.name = name;
      if (needYear) state.year = pickedYear;
      applyYear();
      var btn = $('welcome-start');
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-spin" aria-hidden="true"></span>Setting up your kitchen…';
      savePending = true;
      persistNow().then(function () {
        btn.disabled = false; btn.textContent = 'Open my portfolio';
        hide($('welcome')); show($('home'));
        renderHome();
      });
    });
  }

  /* ============================================================
     Home (shelf): chef level, portfolio card, timeline
     ============================================================ */
  function chefLevel(n) {
    var name = 'New to the kitchen', next = LEVELS[0], prevN = 0;
    for (var i = 0; i < LEVELS.length; i++) {
      if (n >= LEVELS[i].n) { name = LEVELS[i].name; prevN = LEVELS[i].n; next = LEVELS[i + 1] || null; }
      else { next = LEVELS[i]; break; }
    }
    return { name: name, next: next, prevN: prevN };
  }
  function renderChef() {
    var n = state.entries.length;
    var lv = chefLevel(n);
    $('chef-level').textContent = lv.name;
    var prog = $('chef-progress'), fill = $('chef-bar-fill');
    if (n === 0) {
      prog.textContent = 'No practicals yet — your first one starts your journey.';
      fill.style.width = '0%';
    } else if (lv.next) {
      var need = lv.next.n - n;
      prog.textContent = n + (n === 1 ? ' practical' : ' practicals') + ' · ' + need + ' more to become ' + lv.next.name;
      fill.style.width = Math.min(100, Math.round(n / lv.next.n * 100)) + '%';
    } else {
      prog.textContent = n + ' practicals · top of the kitchen!';
      fill.style.width = '100%';
    }
  }
  function entryThumbHtml(e) {
    var inner = '<span aria-hidden="true">\u{1F37D}️</span>';
    if (e.thumbId) {
      var src = ONLINE
        ? ('https://drive.google.com/thumbnail?id=' + encodeURIComponent(e.thumbId) + '&sz=w400')
        : getThumb(e.thumbId);
      if (src) inner = '<img src="' + escapeHtml(src) + '" alt="" onerror="this.remove()">' + inner;
    }
    return '<div class="tl-thumb">' + inner + '</div>';
  }
  function renderTimeline() {
    var ul = $('timeline');
    var entries = state.entries.slice().reverse();   // newest first
    ul.innerHTML = entries.map(function (e) {
      var tags = (e.focus || []).map(function (k) {
        var f = focusByKey(k);
        return '<span class="tl-tag">' + escapeHtml(f ? f.name : k) + '</span>';
      }).join('');
      var media = [];
      if (e.photos) media.push(e.photos + (e.photos === 1 ? ' photo' : ' photos'));
      if (e.videos) media.push(e.videos + (e.videos === 1 ? ' video' : ' videos'));
      var open = state.docUrl
        ? '<a class="btn btn-ghost btn-sm tl-open" href="' + escapeHtml(state.docUrl) + '" target="_blank" rel="noopener">Open</a>'
        : '';
      return '<li class="tl-card">' +
        entryThumbHtml(e) +
        '<div class="tl-body">' +
          '<span class="tl-dish">' + escapeHtml(e.dish) + '</span>' +
          '<span class="tl-date">' + escapeHtml(niceDate(e.date)) + '</span>' +
          (media.length ? '<span class="tl-media">\u{1F4F8} ' + media.join(' · ') + '</span>' : '') +
          (tags ? '<div class="tl-tags">' + tags + '</div>' : '') +
        '</div>' + open +
      '</li>';
    }).join('');
    var any = entries.length > 0;
    $('tl-h').hidden = !any;
    $('tl-empty').hidden = any;
  }
  function renderHome() {
    $('home-name').textContent = state.name || 'my cooking journal';
    applyYear();
    var cb = $('class-badge');
    if (cb) cb.textContent = (BOOT.classCode && BOOT.classCode !== 'default') ? BOOT.classCode : '';
    // the year is teacher-set via the class link when present; only a self-picked
    // year is the pupil's to change
    var ys = $('year-switch');
    if (ys) ys.hidden = !!BOOT.classYear || !state.year;
    renderChef();
    renderTimeline();
    var pc = $('portfolio-card');
    if (state.docUrl) { show(pc); $('portfolio-open').href = state.docUrl; }
    else hide(pc);
    var resume = !!(state.draft && (state.draft.dish || (state.draft.focus || []).length));
    $('new-entry').innerHTML = resume
      ? '<span aria-hidden="true">✏️</span> Continue my reflection (' + escapeHtml(state.draft.dish || 'unnamed dish') + ')'
      : '<span aria-hidden="true">+</span> New practical reflection';
  }

  /* ============================================================
     Entry wizard
     ============================================================ */
  function blankDraft() {
    return {
      id: uid(), dish: '', date: todayIso(), media: [], folderId: '',
      focus: [], answers: {}, costing: { rows: [{ item: '', cost: '' }, { item: '', cost: '' }, { item: '', cost: '' }], serves: 4 },
      stars: { appearance: 0, taste: 0, texture: 0 }, outcome: '', conf: '',
      www: '', ebi: '', next: ''
    };
  }
  function draft() { return state.draft; }

  function openEntry() {
    if (!state.draft) state.draft = blankDraft();
    if (!state.draft.costing) state.draft.costing = blankDraft().costing;
    // a draft begun under another year group (class link changed, year switched)
    // may hold focus keys that no longer exist - prune them so validation and
    // the Doc can never see a stale key
    state.draft.focus = (state.draft.focus || []).filter(function (k) { return !!focusByKey(k); });
    ['media-msg', 'focus-msg', 'eval-msg', 'entry-msg'].forEach(function (id) {
      var el = $(id); if (el) { el.textContent = ''; el.className = 'sv-msg'; }
    });
    step = 1;
    $('dish-name').value = state.draft.dish || '';
    $('dish-date').value = state.draft.date || todayIso();
    $('www-text').value = state.draft.www || '';
    $('ebi-text').value = state.draft.ebi || '';
    $('next-text').value = state.draft.next || '';
    renderMediaStrip();
    renderFocusChips();
    renderFocusPanels();
    renderStars();
    renderMcq();
    updateOpenWc();
    hide($('home')); show($('entry'));
    showStep(1);
  }
  function closeEntry() {
    persistSoon(); persistNow();
    hide($('entry')); show($('home'));
    renderHome();
  }

  var STEP_NAMES = { 1: "Today's dish", 2: 'My focus', 3: 'The taste test', 4: 'My reflection' };
  function showStep(n) {
    step = n;
    for (var i = 1; i <= 4; i++) {
      var panel = $('step-' + i);
      if (panel) panel.hidden = i !== n;
      var dot = document.querySelector('.wiz-dots li[data-step="' + i + '"]');
      if (dot) {
        dot.classList.toggle('on', i === n);
        dot.classList.toggle('done', i < n);
      }
    }
    $('entry-sub').textContent = 'Step ' + n + ' of 4 — ' + STEP_NAMES[n];
    $('wiz-prev').hidden = n === 1;
    $('wiz-next').hidden = n === 4;
    if (n === 4) renderSubmitCheck();
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'auto' : 'auto' });
  }
  function stepError(n) {
    var d = draft();
    if (n === 1) {
      if (!(d.dish || '').trim()) return 'Type the name of your dish first.';
      return '';
    }
    if (n === 2) {
      if (!d.focus.length) return 'Pick at least one focus area.';
      for (var i = 0; i < d.focus.length; i++) {
        var f = focusByKey(d.focus[i]);
        if (!f) continue;
        if (f.costing) {
          if (!costingComplete(d)) return 'Add at least one ingredient with its cost (and how many it serves).';
          if (wordCount(d.answers[f.key]) < MIN_WORDS_OPEN) return 'Add a sentence about whether your dish was good value.';
        } else if (wordCount(d.answers[f.key]) < MIN_WORDS_FOCUS) {
          return 'Write a little more for “' + f.name + '” (at least ' + MIN_WORDS_FOCUS + ' words).';
        }
      }
      return '';
    }
    if (n === 3) {
      if (!(d.stars.appearance && d.stars.taste && d.stars.texture)) return 'Give your dish a star rating for look, taste and texture.';
      if (!d.outcome) return 'Choose how your dish turned out.';
      if (!d.conf) return 'Choose how much help you needed.';
      return '';
    }
    return '';
  }
  function nextStep() {
    var msgEl = { 1: $('media-msg'), 2: $('focus-msg'), 3: $('eval-msg') }[step];
    if (mediaBusy) {
      if (msgEl) { msgEl.textContent = 'One moment — your photos or video are still saving to your Drive.'; msgEl.className = 'sv-msg'; }
      return;
    }
    var err = stepError(step);
    if (err) { if (msgEl) { msgEl.textContent = err; msgEl.className = 'sv-msg bad'; } return; }
    if (msgEl) { msgEl.textContent = ''; msgEl.className = 'sv-msg'; }
    persistSoon();
    showStep(Math.min(4, step + 1));
  }
  function prevStep() { showStep(Math.max(1, step - 1)); }

  // ---- step 1: dish + media ----
  function mediaCounts() {
    var d = draft(), p = 0, v = 0;
    (d.media || []).forEach(function (m) { if (m.k === 'p') p++; else v++; });
    return { p: p, v: v };
  }
  function renderMediaStrip() {
    var d = draft();
    var ul = $('media-strip');
    ul.innerHTML = (d.media || []).map(function (m, i) {
      var inner;
      if (m.k === 'p') {
        var src = ONLINE
          ? ('https://drive.google.com/thumbnail?id=' + encodeURIComponent(m.id) + '&sz=w400')
          : getThumb(m.id);
        inner = src ? '<img src="' + escapeHtml(src) + '" alt="Photo ' + (i + 1) + '" onerror="this.remove()">' : '<span aria-hidden="true">\u{1F4F7}</span>';
      } else {
        inner = '<span class="mi-video"><em aria-hidden="true">\u{1F39E}️</em>' + escapeHtml(m.n || 'video') + '</span>';
      }
      return '<li class="media-item">' + inner +
        '<button type="button" class="mi-x" data-mi="' + i + '" aria-label="Remove this">&times;</button></li>';
    }).join('');
  }
  function onMediaStripClick(e) {
    var btn = e.target.closest ? e.target.closest('.mi-x') : null;
    if (!btn) return;
    var i = Number(btn.getAttribute('data-mi'));
    var d = draft();
    var m = d.media[i];
    if (!m) return;
    d.media.splice(i, 1);
    renderMediaStrip();
    persistSoon();
    // best-effort: tidy the file out of Drive too (it is the pupil's own file)
    call('deleteMedia', { fileId: m.id }).catch(function () {});
  }

  var mediaBusy = false;   // blocks Next/submit while photos or a video are still saving
  function setBusyMedia(busy, label) {
    mediaBusy = busy;
    $('add-photo').disabled = busy;
    $('add-video').disabled = busy;
    var msg = $('media-msg');
    if (busy) { msg.textContent = label || ''; msg.className = 'sv-msg'; }
    if (!$('step-4').hidden) renderSubmitCheck();
  }

  // Downscale a photo in the browser (max 1600px, JPEG) so uploads are quick
  // and the Doc stays light. Also makes a small thumbnail for the timeline.
  function processPhoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) throw new Error('empty');
          var scale = Math.min(1, 1600 / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement('canvas');
          canvas.width = cw; canvas.height = ch;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, cw, ch);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          // thumbnail (longest edge 320) for the local preview timeline
          var ts = Math.min(1, 320 / Math.max(cw, ch));
          var tc = document.createElement('canvas');
          tc.width = Math.max(1, Math.round(cw * ts)); tc.height = Math.max(1, Math.round(ch * ts));
          tc.getContext('2d').drawImage(canvas, 0, 0, tc.width, tc.height);
          var thumb = tc.toDataURL('image/jpeg', 0.7);
          URL.revokeObjectURL(url);
          resolve({ b64: dataUrl.split(',')[1], w: cw, h: ch, thumb: thumb });
        } catch (err) { URL.revokeObjectURL(url); reject(err); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
      img.src = url;
    });
  }

  function onPhotosChosen(files) {
    var d = draft();
    if (!d) return;
    var msg = $('media-msg');
    if (!(d.dish || '').trim()) {
      msg.textContent = 'Name your dish first — it names your photo folder in Drive.';
      msg.className = 'sv-msg bad';
      return;
    }
    var room = MAX_PHOTOS - mediaCounts().p;
    var picked = Array.prototype.slice.call(files);
    var list = picked.slice(0, Math.max(0, room));
    var dropped = picked.length - list.length;
    if (!list.length) {
      msg.textContent = 'That is the maximum of ' + MAX_PHOTOS + ' photos for one practical.';
      msg.className = 'sv-msg bad';
      return;
    }
    var done = 0, failed = 0;
    setBusyMedia(true, 'Saving your photo' + (list.length > 1 ? 's' : '') + ' into your Drive — this can take a few seconds…');
    function one(i) {
      if (state.draft !== d) { setBusyMedia(false); return; }   // entry was submitted/closed mid-upload
      if (i >= list.length) {
        setBusyMedia(false);
        var parts = [];
        parts.push(done === 1 ? 'Photo saved into your Drive ✓' : done + ' photos saved into your Drive ✓');
        if (failed) parts.push(failed + ' could not be saved — try those again.');
        if (dropped) parts.push('Only ' + MAX_PHOTOS + ' photos fit on one practical, so ' + dropped + ' of your selection ' + (dropped === 1 ? 'was' : 'were') + ' not added.');
        msg.textContent = parts.join(' ');
        msg.className = (failed || dropped) ? 'sv-msg bad' : 'sv-msg good';
        persistSoon();
        return;
      }
      processPhoto(list[i])
        .then(function (ph) {
          return call('uploadPhoto', {
            b64: ph.b64, w: ph.w, h: ph.h,
            dish: d.dish || 'Practical', date: d.date || todayIso(),
            entryId: d.id, folderId: d.folderId || '',
            n: 'photo ' + (mediaCounts().p + 1)
          }).then(function (r) {
            if (!(r && r.ok && r.id)) throw new Error((r && r.error) || 'upload');
            if (r.folderId) d.folderId = r.folderId;
            saveThumb(r.id, ph.thumb);
            if (state.draft !== d) return;   // submitted while this photo was in flight
            d.media.push({ k: 'p', id: r.id, w: ph.w, h: ph.h });
            done++;
            renderMediaStrip();
          });
        })
        .catch(function () { failed++; })
        .then(function () { one(i + 1); });
    }
    one(0);
  }

  /* ---- video: resumable upload straight into the pupil's Drive ----
     google.script.run tops out well below phone-video sizes, so the file
     streams browser -> Drive REST API using the pupil's own OAuth token
     (handed over by the server). Small files fall back to the simple
     base64 path if the direct route is blocked. */
  var VIDEO_HARD_CAP = 200 * 1024 * 1024;   // 200 MB - keep clips short
  var VIDEO_B64_CAP = 15 * 1024 * 1024;     // fallback path limit

  function setProgress(frac, label) {
    show($('up-wrap'));
    $('up-fill').style.width = Math.round(frac * 100) + '%';
    $('up-label').textContent = label;
  }
  function clearProgress() { hide($('up-wrap')); $('up-fill').style.width = '0%'; }

  function putChunks(location, file, onProgress) {
    var CHUNK = 8 * 1024 * 1024;   // multiple of 256 KB, as Drive requires
    return new Promise(function (resolve, reject) {
      function sendFrom(start) {
        var end = Math.min(start + CHUNK, file.size);
        var xhr = new XMLHttpRequest();
        xhr.open('PUT', location);
        xhr.setRequestHeader('Content-Range', 'bytes ' + start + '-' + (end - 1) + '/' + file.size);
        xhr.upload.onprogress = function (ev) {
          if (ev.lengthComputable) onProgress((start + ev.loaded) / file.size);
        };
        xhr.onload = function () {
          if (xhr.status === 308) { sendFrom(end); }
          else if (xhr.status >= 200 && xhr.status < 300) {
            var resp = {};
            try { resp = JSON.parse(xhr.responseText || '{}'); } catch (e) {}
            resolve(resp);
          } else reject(new Error('chunk ' + xhr.status));
        };
        xhr.onerror = function () { reject(new Error('network')); };
        xhr.send(file.slice(start, end));
      }
      sendFrom(0);
    });
  }
  function resumableUpload(file, token, folderId, name, onProgress) {
    return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': file.type || 'video/mp4',
        'X-Upload-Content-Length': String(file.size)
      },
      body: JSON.stringify({ name: name, parents: folderId ? [folderId] : undefined, mimeType: file.type || 'video/mp4' })
    }).then(function (r) {
      if (!r.ok) throw new Error('init ' + r.status);
      var loc = r.headers.get('Location') || r.headers.get('location');
      if (!loc) throw new Error('no-location');
      return putChunks(loc, file, onProgress);
    });
  }
  function b64OfFile(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1] || ''); };
      fr.onerror = function () { reject(new Error('read')); };
      fr.readAsDataURL(file);
    });
  }
  function videoName(d) {
    var n = mediaCounts().v + 1;
    return (d.date || todayIso()) + ' ' + (d.dish || 'Practical') + ' video ' + n + '.mp4';
  }
  function onVideoChosen(file) {
    var d = draft();
    if (!d) return;
    var msg = $('media-msg');
    if (!(d.dish || '').trim()) {
      msg.textContent = 'Name your dish first — it names your video folder in Drive.';
      msg.className = 'sv-msg bad';
      return;
    }
    if (mediaCounts().v >= MAX_VIDEOS) {
      msg.textContent = 'That is the maximum of ' + MAX_VIDEOS + ' videos for one practical.'; msg.className = 'sv-msg bad';
      return;
    }
    if (!file || !file.size) {
      msg.textContent = 'That video could not be read — try recording or choosing it again.'; msg.className = 'sv-msg bad';
      return;
    }
    if (file.size > VIDEO_HARD_CAP) {
      msg.textContent = 'That video is too big (over 200 MB) — trim it shorter and try again. Short clips work best.'; msg.className = 'sv-msg bad';
      return;
    }
    var name = videoName(d);
    setBusyMedia(true, 'Sending your video to your Drive — this can take a little while for big files…');
    setProgress(0, 'Getting your Drive ready…');

    function ok(id, url) {
      clearProgress();
      setBusyMedia(false);
      if (state.draft !== d) return;   // entry was submitted/closed mid-upload
      d.media.push({ k: 'v', id: id, n: file.name || 'video', url: url || '' });
      renderMediaStrip();
      msg.textContent = 'Video saved into your Drive ✓'; msg.className = 'sv-msg good';
      persistSoon();
    }
    function fail(t) {
      clearProgress();
      setBusyMedia(false);
      if (state.draft !== d) return;
      msg.textContent = t || 'Your video could not be uploaded just now — try again, or use a shorter clip.';
      msg.className = 'sv-msg bad';
    }

    if (!ONLINE) {
      // preview: simulate the journey so the UX is reviewable
      var f = 0;
      var t = setInterval(function () {
        f = Math.min(1, f + 0.18);
        setProgress(f, 'Uploading… ' + Math.round(f * 100) + '%');
        if (f >= 1) {
          clearInterval(t);
          call('uploadVideo', {}).then(function (r) { ok(r.id, ''); });
        }
      }, 260);
      return;
    }

    call('getUpload', { dish: d.dish || 'Practical', date: d.date || todayIso(), entryId: d.id, folderId: d.folderId || '' })
      .then(function (r) {
        if (!(r && r.ok && r.token)) throw new Error('no-token');
        if (r.folderId) d.folderId = r.folderId;
        return resumableUpload(file, r.token, r.folderId, name, function (frac) {
          setProgress(frac, 'Uploading your video… ' + Math.round(frac * 100) + '%');
        });
      })
      .then(function (resp) {
        if (!resp || !resp.id) throw new Error('no-id');
        setProgress(1, 'Nearly there — filing it in your Drive…');
        // the upload itself SUCCEEDED: a registerMedia (teacher-share) hiccup
        // must not fall through to the fallback and upload the video twice.
        return call('registerMedia', { fileId: resp.id, kind: 'video' }).then(
          function (r2) { ok(resp.id, (r2 && r2.url) || ''); },
          function () { ok(resp.id, ''); }
        );
      })
      .catch(function () {
        // fall back to the simple path for small files
        if (file.size <= VIDEO_B64_CAP) {
          setProgress(0.4, 'Trying another route… this can take a few seconds');
          b64OfFile(file)
            .then(function (b64) {
              return call('uploadVideo', {
                b64: b64, mime: file.type || 'video/mp4', n: name,
                dish: d.dish || 'Practical', date: d.date || todayIso(), entryId: d.id, folderId: d.folderId || ''
              });
            })
            .then(function (r) {
              if (!(r && r.ok && r.id)) throw new Error('fallback');
              if (r.folderId) d.folderId = r.folderId;
              ok(r.id, r.url || '');
            })
            .catch(function () { fail(); });
        } else {
          fail('That upload route is blocked here and the file is too big for the backup route — try a shorter clip.');
        }
      });
  }

  // ---- step 2: focus chips + panels ----
  function renderFocusChips() {
    var d = draft();
    var box = $('focus-chips');
    box.innerHTML = focusList().map(function (f) {
      var on = d.focus.indexOf(f.key) !== -1;
      return '<button type="button" class="focus-chip' + (on ? ' on' : '') + '" data-fk="' + f.key + '" aria-pressed="' + on + '">' +
        '<span class="fc-icon" aria-hidden="true">' + f.icon + '</span>' +
        '<span><span class="fc-name">' + escapeHtml(f.name) + '</span>' +
        '<span class="fc-term">' + escapeHtml(f.term) + '</span></span>' +
      '</button>';
    }).join('');
    $('focus-hint').textContent = state.year
      ? 'Pick what this practical was about — these are your ' + (YEAR_LABEL[state.year] || state.year) + ' focus areas. Choose at least one.'
      : 'Pick what this practical was about — choose at least one.';
  }
  function onFocusChipClick(e) {
    var btn = e.target.closest ? e.target.closest('.focus-chip') : null;
    if (!btn) return;
    var key = btn.getAttribute('data-fk');
    var d = draft();
    var i = d.focus.indexOf(key);
    if (i === -1) d.focus.push(key); else d.focus.splice(i, 1);
    renderFocusChips();
    renderFocusPanels();
    persistSoon();
  }
  function renderFocusPanels() {
    var d = draft();
    var box = $('focus-panels');
    box.innerHTML = d.focus.map(function (k) {
      var f = focusByKey(k);
      if (!f) return '';
      var h = '<div class="focus-panel" data-fp="' + f.key + '">' +
        '<h4><span aria-hidden="true">' + f.icon + '</span>' + escapeHtml(f.name) + '</h4>' +
        '<p class="fp-prompt">' + escapeHtml(f.prompt) + '</p>' +
        '<p class="fp-hint">' + escapeHtml(f.hint) + '</p>';
      if (f.costing) h += costingHtml(d);
      h += '<textarea rows="' + (f.costing ? 2 : 4) + '" maxlength="700" data-fa="' + f.key + '" placeholder="' + escapeHtml(f.ph) + '">' + escapeHtml(d.answers[f.key] || '') + '</textarea>' +
        '<span class="wc" data-fwc="' + f.key + '"></span>' +
      '</div>';
      return h;
    }).join('');
    d.focus.forEach(function (k) { updateFocusWc(k); });
    wireCosting();
  }
  function updateFocusWc(key) {
    var el = document.querySelector('[data-fwc="' + key + '"]');
    if (!el) return;
    var f = focusByKey(key);
    var min = (f && f.costing) ? MIN_WORDS_OPEN : MIN_WORDS_FOCUS;
    var w = wordCount(draft().answers[key]);
    if (w >= min) { el.textContent = w + ' words ✓'; el.className = 'wc good'; }
    else { el.textContent = w + ' / ' + min + '+ words'; el.className = 'wc'; }
  }
  function onFocusInput(e) {
    var ta = e.target;
    var key = ta.getAttribute && ta.getAttribute('data-fa');
    if (!key) return;
    draft().answers[key] = ta.value;
    updateFocusWc(key);
    persistSoon();
  }

  // ---- the recipe-costing widget (J3) ----
  function money(n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); }
  function costingTotals(d) {
    var total = 0, rows = 0;
    (d.costing.rows || []).forEach(function (r) {
      var c = parseFloat(r.cost);
      if ((r.item || '').trim() && !isNaN(c) && c > 0) { total += c; rows++; }
    });
    var serves = Math.max(1, parseInt(d.costing.serves, 10) || 1);
    return { total: total, rows: rows, serves: serves, per: total / serves };
  }
  function costingComplete(d) { var t = costingTotals(d); return t.rows >= 1 && t.total > 0; }
  function costingHtml(d) {
    var rows = d.costing.rows.map(function (r, i) {
      return '<tr>' +
        '<td><input class="field" type="text" maxlength="60" data-ci="' + i + '" placeholder="e.g. 500g minced beef" value="' + escapeHtml(r.item || '') + '"></td>' +
        '<td><input class="field cost-cost" type="number" min="0" step="0.01" inputmode="decimal" data-cc="' + i + '" placeholder="0.00" value="' + escapeHtml(r.cost || '') + '"></td>' +
        '<td><button type="button" class="cost-del" data-cd="' + i + '" aria-label="Remove this ingredient">&times;</button></td>' +
      '</tr>';
    }).join('');
    return '<table class="cost-table" id="cost-table">' +
      '<thead><tr><th>Ingredient</th><th>Cost (£)</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<div class="cost-foot">' +
        '<button type="button" class="btn btn-soft btn-sm" id="cost-add">+ Add ingredient</button>' +
        '<label class="cost-serves">Serves <input class="field" type="number" min="1" max="20" id="cost-serves" value="' + escapeHtml(String(d.costing.serves || 4)) + '"></label>' +
        '<div class="cost-totals"><b id="cost-total">' + money(costingTotals(d).total) + '</b>' +
        '<span id="cost-per">' + money(costingTotals(d).per) + ' per portion</span></div>' +
      '</div>';
  }
  function refreshCostTotals() {
    var d = draft();
    var t = costingTotals(d);
    var tot = $('cost-total'), per = $('cost-per');
    if (tot) tot.textContent = money(t.total);
    if (per) per.textContent = money(t.per) + ' per portion';
  }
  function wireCosting() {
    var panel = document.querySelector('[data-fp="costing"]');
    if (!panel) return;
    panel.addEventListener('input', function (e) {
      var d = draft();
      var ci = e.target.getAttribute('data-ci'), cc = e.target.getAttribute('data-cc');
      if (ci != null) d.costing.rows[Number(ci)].item = e.target.value;
      if (cc != null) d.costing.rows[Number(cc)].cost = e.target.value;
      if (e.target.id === 'cost-serves') d.costing.serves = e.target.value;
      refreshCostTotals();
      persistSoon();
    });
    panel.addEventListener('click', function (e) {
      var d = draft();
      if (e.target.id === 'cost-add') {
        if (d.costing.rows.length < 20) d.costing.rows.push({ item: '', cost: '' });
        renderFocusPanels();
        persistSoon();
        return;
      }
      var cd = e.target.getAttribute && e.target.getAttribute('data-cd');
      if (cd != null) {
        d.costing.rows.splice(Number(cd), 1);
        if (!d.costing.rows.length) d.costing.rows.push({ item: '', cost: '' });
        renderFocusPanels();
        persistSoon();
      }
    });
  }

  // ---- step 3: stars + multiple choice ----
  function renderStars() {
    var d = draft();
    $('stars-wrap').innerHTML = STAR_CATS.map(function (c) {
      var v = d.stars[c.key] || 0;
      var btns = '';
      for (var i = 1; i <= 5; i++) {
        btns += '<button type="button" class="star-btn' + (i <= v ? ' on' : '') + '" data-sc="' + c.key + '" data-sv="' + i + '" aria-label="' + escapeHtml(c.label) + ' ' + i + ' of 5">' + (i <= v ? '★' : '☆') + '</button>';
      }
      return '<div class="star-row"><span class="sr-label">' + escapeHtml(c.label) + '</span>' +
        '<span class="stars" role="group" aria-label="' + escapeHtml(c.label) + '">' + btns + '</span>' +
        '<span class="sr-word">' + escapeHtml(STAR_WORDS[v] || '') + '</span></div>';
    }).join('');
  }
  function onStarsClick(e) {
    var b = e.target.closest ? e.target.closest('.star-btn') : null;
    if (!b) return;
    var sc = b.getAttribute('data-sc'), sv = b.getAttribute('data-sv');
    draft().stars[sc] = Number(sv);
    renderStars();
    // re-rendering destroyed the focused node - put keyboard focus back
    var again = document.querySelector('.star-btn[data-sc="' + sc + '"][data-sv="' + sv + '"]');
    if (again) again.focus();
    persistSoon();
  }
  function renderMcq() {
    var d = draft();
    $('outcome-opts').innerHTML = OUTCOMES.map(function (t) {
      var on = d.outcome === t;
      return '<button type="button" class="mc-opt' + (on ? ' on' : '') + '" data-mo="' + escapeHtml(t) + '" aria-pressed="' + on + '"><span class="mc-dot" aria-hidden="true"></span>' + escapeHtml(t) + '</button>';
    }).join('');
    $('conf-opts').innerHTML = CONFIDENCE.map(function (t) {
      var on = d.conf === t;
      return '<button type="button" class="mc-opt' + (on ? ' on' : '') + '" data-mc="' + escapeHtml(t) + '" aria-pressed="' + on + '"><span class="mc-dot" aria-hidden="true"></span>' + escapeHtml(t) + '</button>';
    }).join('');
  }
  function onMcqClick(e) {
    var b = e.target.closest ? e.target.closest('.mc-opt') : null;
    if (!b) return;
    var d = draft();
    var attr = b.hasAttribute('data-mo') ? 'data-mo' : (b.hasAttribute('data-mc') ? 'data-mc' : '');
    if (!attr) return;
    var val = b.getAttribute(attr);
    if (attr === 'data-mo') d.outcome = val; else d.conf = val;
    renderMcq();
    var again = document.querySelector('.mc-opt[' + attr + '="' + val.replace(/"/g, '\\"') + '"]');
    if (again) again.focus();
    persistSoon();
  }

  // ---- step 4: open reflection + submit ----
  function updateOpenWc() {
    var d = draft();
    [['www', 'www-text', 'www-wc'], ['ebi', 'ebi-text', 'ebi-wc']].forEach(function (x) {
      var w = wordCount($(x[1]).value);
      var el = $(x[2]);
      if (w >= MIN_WORDS_OPEN) { el.textContent = w + ' words ✓'; el.className = 'wc good'; }
      else { el.textContent = w + ' / ' + MIN_WORDS_OPEN + '+ words'; el.className = 'wc'; }
    });
  }
  function submitChecks() {
    var d = draft();
    if (!d) return [];   // a late render after submit cleared the draft
    var focusOk = !!d.focus.length && !stepError(2);
    return [
      { ok: !!(d.dish || '').trim(), label: 'My dish has a name' },
      { ok: focusOk, label: 'My focus areas are answered' },
      { ok: !stepError(3), label: 'The taste test is complete' },
      { ok: wordCount(d.www) >= MIN_WORDS_OPEN, label: 'What went well (' + MIN_WORDS_OPEN + '+ words)' },
      { ok: wordCount(d.ebi) >= MIN_WORDS_OPEN, label: 'Even better if… (' + MIN_WORDS_OPEN + '+ words)' },
      { ok: mediaCounts().p > 0, label: 'A photo of my dish (optional — but it makes your page)', soft: true }
    ];
  }
  function renderSubmitCheck() {
    if (!draft()) return;
    var checks = submitChecks();
    $('submit-check').innerHTML = checks.map(function (c) {
      return '<li class="' + (c.ok ? 'ok' : '') + '">' + escapeHtml(c.label) + '</li>';
    }).join('');
    var ready = checks.every(function (c) { return c.ok || c.soft; });
    $('entry-submit').disabled = !ready || submitting || mediaBusy;
  }

  /* Compose the structured portfolio-page payload the server renders into
     the Google Doc (and the offline build renders as a local preview).
     The CLIENT owns the words; the server just renders the spec. */
  function composeEntry() {
    var d = draft();
    var sections = d.focus.map(function (k) {
      var f = focusByKey(k);
      if (!f) return null;
      var sec = { h: f.name, q: f.prompt, a: (d.answers[k] || '').trim() };
      if (f.costing) {
        var t = costingTotals(d);
        sec.table = {
          head: ['Ingredient', 'Cost'],
          rows: d.costing.rows
            .filter(function (r) { return (r.item || '').trim(); })
            .map(function (r) {
              var c = parseFloat(r.cost);
              return [r.item.trim(), isNaN(c) ? '' : money(c)];
            }),
          foot: [
            ['Total', money(t.total)],
            ['Serves', String(t.serves)],
            ['Cost per portion', money(t.per)]
          ]
        };
      }
      return sec;
    }).filter(Boolean);

    function starLine(c) {
      var v = d.stars[c.key] || 0, s = '';
      for (var i = 1; i <= 5; i++) s += i <= v ? '★' : '☆';
      return c.label + '  ' + s + '  (' + v + '/5 — ' + (STAR_WORDS[v] || '') + ')';
    }

    return {
      pupil: state.name,
      year: state.year,
      classCode: BOOT.classCode,
      entry: {
        id: d.id,
        dish: (d.dish || '').trim(),
        date: d.date || todayIso(),
        dateNice: niceDate(d.date || todayIso()),
        focusNames: d.focus.map(function (k) { var f = focusByKey(k); return f ? f.name : null; }).filter(Boolean),
        photos: d.media.filter(function (m) { return m.k === 'p'; }).map(function (m) { return { id: m.id, w: m.w || 0, h: m.h || 0 }; }),
        videos: d.media.filter(function (m) { return m.k === 'v'; }).map(function (m) { return { id: m.id, n: m.n || 'video', url: m.url || '' }; }),
        sections: sections,
        evalLines: [
          starLine(STAR_CATS[0]), starLine(STAR_CATS[1]), starLine(STAR_CATS[2]),
          'How it turned out: ' + d.outcome,
          'Help needed: ' + d.conf
        ],
        www: (d.www || '').trim(),
        ebi: (d.ebi || '').trim(),
        next: (d.next || '').trim()
      }
    };
  }
  function entrySummary(spec) {
    var d = draft();
    var firstPhoto = (spec.entry.photos[0] || {}).id || '';
    return {
      id: spec.entry.id,
      dish: spec.entry.dish,
      date: spec.entry.date,
      focus: d.focus.slice(),
      photos: spec.entry.photos.length,
      videos: spec.entry.videos.length,
      thumbId: firstPhoto
    };
  }

  var submitting = false;
  function submitEntry() {
    if (submitting) return;
    var msg0 = $('entry-msg');
    if (mediaBusy) {
      msg0.textContent = 'One moment — your photos or video are still saving to your Drive.';
      msg0.className = 'sv-msg';
      return;
    }
    var checks = submitChecks();
    if (!checks.length || !checks.every(function (c) { return c.ok || c.soft; })) { renderSubmitCheck(); return; }
    submitting = true;
    var btn = $('entry-submit'), msg = $('entry-msg');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spin" aria-hidden="true"></span>Adding to your portfolio…';
    msg.textContent = 'Google is writing your portfolio page — this can take a few seconds. Stay on this screen.';
    msg.className = 'sv-msg';

    var spec = composeEntry();
    var summary = entrySummary(spec);

    persistNow()
      .then(function () { return call('submitEntry', { spec: spec, summary: summary }); })
      .then(function (r) {
        if (!(r && r.ok)) throw new Error((r && r.error) || 'submit');
        // (covers duplicate:true retries too - never list the same entry twice)
        var have = state.entries.some(function (e) { return e.id === summary.id; });
        if (!have) state.entries.push(summary);
        state.draft = null;
        savePending = false;             // server already cleared the draft
        if (r.url) state.docUrl = r.url;
        hide($('entry')); show($('home'));
        renderHome();
        openHooray(r.preview ? spec : null);
      })
      .catch(function (e) {
        if (e && e.message === 'not-signed-in') {
          msg.textContent = 'Your sign-in has expired. Refresh this page to sign back in — your work is saved, then press the button again.';
        } else {
          msg.textContent = 'Sorry — that did not save just now. Nothing is lost: please press the button to try again.';
        }
        msg.className = 'sv-msg bad';
      })
      .then(function () {
        submitting = false;
        btn.innerHTML = 'Add to my portfolio';
        renderSubmitCheck();
      });
  }

  /* ============================================================
     Celebration + offline Doc preview
     ============================================================ */
  function confettiBurst() {
    var box = $('hooray-burst');
    box.innerHTML = '';
    var colors = ['#c07a2c', '#67874f', '#b55a38', '#e4b824', '#8a5418', '#fff'];
    for (var i = 0; i < 26; i++) {
      var c = document.createElement('i');
      c.className = 'confetto';
      c.style.left = (4 + Math.random() * 92) + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.5) + 's';
      c.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
      box.appendChild(c);
    }
  }
  var previewSpec = null;
  function openHooray(specForPreview) {
    previewSpec = specForPreview || null;
    var a = $('hooray-open');
    if (previewSpec) {
      a.textContent = 'See my portfolio page';
      a.removeAttribute('target');
      a.href = '#';
      $('hooray-text').textContent = 'Your reflection is on the shelf. On the school app this page is written into your portfolio Google Doc — here in the preview you can see exactly what it will look like.';
    } else {
      a.textContent = 'Open my portfolio';
      a.setAttribute('target', '_blank');
      a.href = state.docUrl || '#';
      $('hooray-text').textContent = 'Your reflection has been added to your portfolio document, with your photos — and your teacher can see it too.';
    }
    confettiBurst();
    show($('hooray'));
    var ho = $('hooray-open');
    if (ho) ho.focus();
  }
  function renderEntryPreview(spec) {
    var e = spec.entry;
    var h = '<div class="doc-paper">';
    h += '<h1 class="doc-title">' + escapeHtml(e.dish) + '</h1>';
    h += '<p class="doc-subtitle">' + escapeHtml(e.dateNice) + ' · ' + escapeHtml(spec.pupil) + '</p>';
    if (e.focusNames.length) h += '<p class="doc-focusline">Focus: ' + escapeHtml(e.focusNames.join(' · ')) + '</p>';
    if (e.photos.length) {
      h += '<div class="doc-photos">';
      e.photos.forEach(function (p) {
        var src = ONLINE ? '' : getThumb(p.id);
        if (src) h += '<img src="' + escapeHtml(src) + '" alt="">';
      });
      h += '</div>';
    }
    e.videos.forEach(function (v) {
      h += '<p class="doc-link">\u{1F39E}️ My video: ' + escapeHtml(v.n) + (v.url ? ' — ' + escapeHtml(v.url) : '') + '</p>';
    });
    e.sections.forEach(function (s) {
      h += '<h2 class="doc-h">' + escapeHtml(s.h) + '</h2>';
      h += '<p class="doc-focusline">' + escapeHtml(s.q) + '</p>';
      if (s.table) {
        h += '<table class="doc-table"><tr>' + s.table.head.map(function (x) { return '<th>' + escapeHtml(x) + '</th>'; }).join('') + '</tr>';
        s.table.rows.forEach(function (r) { h += '<tr>' + r.map(function (x) { return '<td>' + escapeHtml(x) + '</td>'; }).join('') + '</tr>'; });
        s.table.foot.forEach(function (r) { h += '<tr><th>' + escapeHtml(r[0]) + '</th><td>' + escapeHtml(r[1]) + '</td></tr>'; });
        h += '</table>';
      }
      if (s.a) h += '<p>' + escapeHtml(s.a) + '</p>';
    });
    h += '<h2 class="doc-h">My evaluation</h2>';
    e.evalLines.forEach(function (l) { h += '<p>' + escapeHtml(l) + '</p>'; });
    h += '<h2 class="doc-h2">What went well</h2><p>' + escapeHtml(e.www) + '</p>';
    h += '<h2 class="doc-h2">Even better if…</h2><p>' + escapeHtml(e.ebi) + '</p>';
    if (e.next) h += '<h2 class="doc-h2">Next time I will…</h2><p>' + escapeHtml(e.next) + '</p>';
    h += '<hr class="doc-hr"></div>';
    $('doc-preview-body').innerHTML = h;
  }

  /* ============================================================
     Staff panel (multi-teacher class manager + per-class dashboard).
     Same proven model as the other OLS boards, with one addition:
     every class is created WITH a year group (J1/J2/J3), which the
     server injects into pupils' pages to pick their focus areas.
     ============================================================ */
  var staff = { pass: '', me: '', all: false, classes: [], current: '', rows: [] };
  var dashSeq = 0;

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
    if ($('staff-go').disabled) return;
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
      var yr = c.year ? '<span class="cls-yr">' + escapeHtml(c.year) + '</span>' : '';
      return '<li class="cls-row" data-cls="' + escapeHtml(c.name) + '">' +
        '<div class="cls-info"><b>' + escapeHtml(c.name) + '</b>' + yr +
          '<span class="cls-meta">' + c.pupils + (c.pupils === 1 ? ' pupil' : ' pupils') + '</span>' + who + '</div>' +
        '<div class="cls-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="dash">Dashboard</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="link">Copy link</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="qr">QR</button>' +
          ((c.mine || !c.owner) ? '<button type="button" class="btn btn-ghost btn-sm cls-del" data-act="del" aria-label="Delete ' + escapeHtml(c.name) + '">&times;</button>' : '') +
        '</div></li>';
    }).join('') || '<li class="cls-empty">No classes of your own yet — type a class name above, choose its year group, and tap <b>Add class</b>. Then share its link (or QR) with that class. (Tick &ldquo;Show all teachers&rsquo; classes&rdquo; to see everyone else&rsquo;s.)</li>';
  }
  function chosenYear() {
    var r = document.querySelector('input[name="staff-year"]:checked');
    return r ? r.value : '';
  }
  function addClass() {
    if ($('staff-add').disabled) return;
    var input = $('staff-newclass'), name = (input.value || '').trim(), msg = $('staff-cmsg');
    if (!name) { input.focus(); return; }
    var year = chosenYear();
    if (YEARS.indexOf(year) === -1) { msg.textContent = 'Choose the year group for this class first — it picks which focus areas the pupils see.'; return; }
    msg.textContent = 'Adding…';
    $('staff-add').disabled = true;
    call('admin', { passcode: staff.pass, sub: 'addClass', name: name, year: year })
      .then(function (r) {
        if (r && r.ok) {
          input.value = '';
          msg.textContent = r.claimed
            ? ('Added ' + r.name + ' (' + year + '). Some pupils had already opened its link — the class is now yours, with its year group set, and their work is all there.')
            : ('Added ' + r.name + ' (' + year + '). Copy its link (or show the QR) to share with that class.');
          // claimed classes were hidden under "show all" as unowned - replace, don't duplicate
          staff.classes = staff.classes.filter(function (c) { return c.name.toLowerCase() !== r.name.toLowerCase(); });
          staff.classes.push({ name: r.name, owner: r.owner || staff.me, year: year, mine: true, pupils: 0 });
          renderClasses();
          staffReloadClasses();
        }
        else if (r && r.error === 'exists') msg.textContent = 'A class called ' + (r.name || name) + ' already exists.';
        else if (r && r.error === 'bad-year') msg.textContent = 'Choose the year group for this class first.';
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
      if (!btn.classList.contains('arm')) {
        btn.classList.add('arm'); btn.textContent = 'Sure?';
        msg.textContent = 'Tap again to delete ' + name + ' — this removes its dashboard records (pupils’ own portfolios and photos are untouched).';
        setTimeout(function () {
          btn.classList.remove('arm'); btn.innerHTML = '&times;';
          if (msg.textContent.indexOf('Tap again') === 0) msg.textContent = '';
        }, 4000);
        return;
      }
      btn.disabled = true;
      msg.textContent = 'Deleting ' + name + '…';
      call('admin', { passcode: staff.pass, sub: 'deleteClass', name: name })
        .then(function (r) {
          if (r && r.ok) {
            msg.textContent = 'Deleted ' + name + '.';
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
  /* "Spag bol · 2026-06-11" (server record) -> "Spag bol · 11 June 2026" */
  function niceLast(last) {
    var s = String(last || '');
    var cut = s.lastIndexOf(' · ');
    if (cut === -1) return s;
    return s.slice(0, cut) + ' · ' + niceDate(s.slice(cut + 3));
  }
  function renderDash(rows) {
    var t = $('dash');
    if (!t) return;
    var head = '<tr><th>Pupil</th><th>Practicals</th><th>Last cooked</th><th>Portfolio</th></tr>';
    var body = (rows || []).map(function (r) {
      var doc;
      if (r.docUrl) {
        // surface a share that never succeeded - otherwise the teacher only
        // finds out via "Request access" pages at marking time
        var warn = (r.shared && r.shared.indexOf('shared:') !== 0)
          ? ' <span class="share-warn" title="This portfolio may ask you to request access — it could not be shared automatically.">⚠ not shared</span>' : '';
        doc = '<td><a href="' + escapeHtml(r.docUrl) + '" target="_blank" rel="noopener">Open</a>' + warn + '</td>';
      } else doc = '<td class="no">–</td>';
      var n = Number(r.entries) || 0;
      return '<tr><td>' + escapeHtml(r.name || '') + '</td>' +
        '<td class="' + (n ? 'yes' : 'no') + '">' + n + '</td>' +
        '<td>' + escapeHtml(niceLast(r.last) || '–') + '</td>' + doc + '</tr>';
    }).join('');
    t.innerHTML = head + (body || '<tr><td colspan="4">No pupils yet.</td></tr>');
  }
  function openDash(name) {
    staff.current = name;
    staff.rows = [];
    $('dash').innerHTML = '';
    $('dash-title').textContent = name;
    staffView('staff-dash');
    $('staff-dmsg').textContent = 'Loading…';
    var token = ++dashSeq;
    call('admin', { passcode: staff.pass, sub: 'dashboard', classCode: name })
      .then(function (r) {
        if (token !== dashSeq) return;
        if (r && r.ok) { staff.rows = r.rows || []; renderDash(staff.rows); $('staff-dmsg').textContent = ''; }
        else $('staff-dmsg').textContent = 'Could not load the class. Please try again.';
      })
      .catch(function () { if (token === dashSeq) $('staff-dmsg').textContent = 'Could not load the class. Please try again.'; });
  }
  function dashCsv() {
    function q(s) {
      s = String(s == null ? '' : s);
      // neutralise spreadsheet formula injection from pupil-typed names/dishes
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    }
    var head = 'Pupil,Practicals,Last cooked,Portfolio link';
    var lines = staff.rows.map(function (r) {
      return [q(r.name), Number(r.entries) || 0, q(niceLast(r.last)), q(r.docUrl || '')].join(',');
    });
    copyText([head].concat(lines).join('\n'), $('staff-dmsg'), 'CSV copied — paste it into Excel or Sheets.',
      'Could not copy here — try again, or read the table on screen.');
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
    // Preview-only conveniences (guarded to offline so they can never touch
    // a pupil's saved work on the deployed app):
    //   ?reset       wipe saved progress for a fresh run
    //   ?year=J2     preview a year group's tone + focus areas
    var previewYear = '';
    if (!ONLINE) {
      var qs = location.search;   // capture before ?reset strips the query string
      var ym = /[?&]year=(J[123])/.exec(qs);
      if (ym) previewYear = ym[1];
      if (/(^|[?&])reset(=|&|$)/.test(qs)) {
        try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_THUMBS); } catch (e) {}
        if (window.history && history.replaceState) history.replaceState({}, '', location.pathname + (previewYear ? '?year=' + previewYear : ''));
      }
    }

    // wire events
    wireWelcome();
    document.querySelectorAll('#year-switch .ys-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var y = b.getAttribute('data-year');
        if (y === state.year || YEARS.indexOf(y) === -1) return;
        state.year = y;
        // answers for areas that exist only in another year stay saved in the
        // draft but are pruned from the focus list at openEntry
        applyYear();
        persistSoon();
        renderHome();
        $('home-msg').textContent = 'Year group switched to ' + (YEAR_LABEL[y] || y) + ' — your focus areas have updated.';
      });
    });
    $('new-entry').addEventListener('click', openEntry);
    $('entry-back').addEventListener('click', closeEntry);
    $('wiz-prev').addEventListener('click', prevStep);
    $('wiz-next').addEventListener('click', nextStep);
    $('dish-name').addEventListener('input', function () { draft().dish = $('dish-name').value; persistSoon(); });
    $('dish-date').addEventListener('input', function () { draft().date = $('dish-date').value || todayIso(); persistSoon(); });
    $('media-strip').addEventListener('click', onMediaStripClick);
    $('add-photo').addEventListener('click', function () { $('photo-input').click(); });
    $('add-video').addEventListener('click', function () { $('video-input').click(); });
    $('photo-input').addEventListener('change', function () {
      if (this.files && this.files.length) onPhotosChosen(this.files);
      this.value = '';
    });
    $('video-input').addEventListener('change', function () {
      if (this.files && this.files[0]) onVideoChosen(this.files[0]);
      this.value = '';
    });
    $('focus-chips').addEventListener('click', onFocusChipClick);
    $('focus-panels').addEventListener('input', onFocusInput);
    $('stars-wrap').addEventListener('click', onStarsClick);
    $('outcome-opts').addEventListener('click', onMcqClick);
    $('conf-opts').addEventListener('click', onMcqClick);
    ['www-text', 'ebi-text', 'next-text'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        var d = draft();
        d.www = $('www-text').value; d.ebi = $('ebi-text').value; d.next = $('next-text').value;
        updateOpenWc();
        renderSubmitCheck();
        persistSoon();
      });
    });
    $('entry-submit').addEventListener('click', submitEntry);
    $('hooray-close').addEventListener('click', function () { hide($('hooray')); });
    $('hooray-open').addEventListener('click', function (e) {
      if (previewSpec) {
        e.preventDefault();
        renderEntryPreview(previewSpec);
        hide($('hooray'));
        show($('doc-preview'));
        $('doc-preview-close').focus();
      }
    });
    $('doc-preview-close').addEventListener('click', function () { hide($('doc-preview')); });
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
      if (e.key === 'Escape') { hide($('staff-modal')); hide($('doc-preview')); hide($('hooray')); }
    });
    window.addEventListener('beforeunload', function () { if (savePending) persistNow(); });
    // phones rarely fire beforeunload - flush whenever the app goes to the background
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && savePending) persistNow();
    });

    // identity + saved state
    call('whoami', {})
      .then(function (r) { state.email = (r && r.email) || ''; })
      .catch(function () {})
      .then(function () { return call('load', {}); })
      .then(function (r) {
        if (r && r.ok) {
          state.name = r.name || '';
          state.year = r.year || '';
          state.docUrl = r.docUrl || '';
          state.entries = r.entries || [];
          state.draft = r.draft || null;
        }
      })
      .catch(function () {})
      .then(function () {
        // the class's year (set by the teacher) always wins over a self-pick
        if (BOOT.classYear && YEARS.indexOf(BOOT.classYear) !== -1) state.year = BOOT.classYear;
        else if (previewYear) state.year = previewYear;
        applyYear();
        if (!state.name) {
          var hello = $('welcome-hello');
          if (hello) hello.textContent = state.email ? ('Signed in as ' + state.email) : 'Signed in with your school account';
          if (!state.year) show($('year-pick'));
          show($('welcome'));
        } else {
          show($('home'));
          renderHome();
        }
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
