/* ============================================================================
   Isotope Lab — Staff panel + pupil leaderboard + My Group
   Class management, per-pupil dashboard, CSV, in-page QR, and the NEW
   collaborative groups manager (assign / auto-shuffle / hidden-or-reveal).
   ============================================================================ */
(function (global) {
  'use strict';
  var Lab = global.Lab;
  var pass = '';
  var curDash = [], curGroups = null;

  /* ===================== pupil: leaderboard ===================== */
  function openLeaderboard() {
    Lab.openModal('leaderboard-modal');
    var body = Lab.$('#lb-body'); body.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Loading&hellip;</span></div>';
    Lab.$('#lb-me').hidden = true;
    Lab.call('leaderboard').then(function (r) {
      if (!r || !r.ok) { body.innerHTML = '<p class="lb-empty">Could not load the leaderboard.</p>'; return; }
      if (!r.top.length) { body.innerHTML = '<p class="lb-empty">No scores yet &mdash; be the first to play!</p>'; return; }
      body.innerHTML = r.top.map(function (row) {
        return '<div class="lb-row' + (row.isMe ? ' me' : '') + (row.rank === 1 ? ' top1' : '') + '">' +
          '<span class="lb-rank">' + (row.rank === 1 ? '🏆' : row.rank) + '</span>' +
          '<span class="lb-name">' + Lab.esc(row.name) + (row.isMe ? ' (you)' : '') + '</span>' +
          '<span class="lb-score">' + row.xp + ' XP</span></div>';
      }).join('');
      if (r.me && r.me.pos) {
        var me = Lab.$('#lb-me'); me.hidden = false;
        me.textContent = 'You are ' + ordinal(r.me.pos) + ' of ' + r.me.total + ' with ' + r.me.xp + ' XP.';
      }
    });
  }
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  /* ===================== pupil: My Group ===================== */
  function openMyGroup() {
    Lab.openModal('group-modal');
    var body = Lab.$('#group-body'); body.innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Loading&hellip;</span></div>';
    Lab.call('myGroup').then(function (r) {
      if (!r || !r.ok) { body.innerHTML = '<p class="lb-empty">Could not load your group.</p>'; return; }
      if (!r.inGroup) { body.innerHTML = '<p class="lb-empty">Your teacher has not put you into a group yet. Check back later!</p>'; return; }
      var html = '<div class="group-hero"><div>Your group</div><div class="gname">' + Lab.esc(r.groupName) + '</div></div>';
      html += '<p class="group-team-score">Team XP: <b>' + r.teamXp + '</b> &middot; your XP: ' + r.myXp + '</p>';
      if (r.revealed && r.members) {
        html += '<h3 style="color:var(--ols-blue);margin:4px 0 0;font-size:1rem">Your team-mates</h3>';
        html += '<div class="group-members">' + r.members.map(function (m) {
          return '<span class="group-member' + (m.isMe ? ' me' : '') + '">' + Lab.esc(m.name) + (m.isMe ? ' (you)' : '') + '</span>';
        }).join('') + '</div>';
      } else {
        html += '<div class="group-hidden-note"><img src="assets/characters/static_09_safety_goggles.png" alt=""/>' +
          '<span>There ' + (r.memberCount === 1 ? 'is 1 member' : 'are ' + r.memberCount + ' members') + ' in your group, but who they are stays secret until your teacher reveals it. Earn XP &mdash; it all counts for your team!</span></div>';
      }
      body.innerHTML = html;
    });
  }

  /* ===================== staff: unlock + panel ===================== */
  function openStaff() {
    Lab.openModal('staff-modal');
    Lab.$('#staff-locked').hidden = false;
    Lab.$('#staff-panel').hidden = true;
    Lab.$('#staff-locknote').hidden = true;
    Lab.$('#staff-pass').value = '';
    Lab.$('#staff-pass').focus();
  }
  function unlock() {
    var p = Lab.$('#staff-pass').value, note = Lab.$('#staff-locknote');
    var btn = Lab.$('#staff-unlock'), orig = btn.textContent;
    note.hidden = true; btn.disabled = true; btn.textContent = 'Checking…';
    Lab.call('admin', { passcode: p, sub: 'classes' }).then(function (r) {
      btn.disabled = false; btn.textContent = orig;
      if (!r || !r.ok) {
        note.hidden = false;
        note.textContent = r && r.error === 'bad-passcode' ? 'That passcode was not recognised.' : 'Could not open the teacher area.';
        return;
      }
      pass = p;
      Lab.$('#staff-locked').hidden = true;
      Lab.$('#staff-panel').hidden = false;
      populateClassSelects(r.classes);
      switchTab('classes');
    });
  }
  function adminCall(sub, extra) { return Lab.call('admin', Object.assign({ passcode: pass, sub: sub }, extra || {})); }

  function populateClassSelects(classes) {
    var opts = classes.length
      ? classes.map(function (c) { return '<option value="' + Lab.esc(c.name) + '">' + Lab.esc(c.name) + ' (' + c.count + ' played)</option>'; }).join('')
      : '<option value="">— no classes yet —</option>';
    ['#cm-select', '#dash-class', '#grp-class'].forEach(function (sel) {
      var el = Lab.$(sel), keep = el.value; el.innerHTML = opts; if (keep) el.value = keep;
    });
  }
  function reloadClasses(cb) { adminCall('classes').then(function (r) { if (r && r.ok) populateClassSelects(r.classes); if (cb) cb(); }); }

  function switchTab(name) {
    closeChipMenu();
    Lab.$$('.staff-tab').forEach(function (t) { t.classList.toggle('is-active', t.dataset.tab === name); });
    Lab.$$('.staff-tabpane').forEach(function (p) { p.hidden = (p.dataset.pane !== name); p.classList.toggle('is-active', p.dataset.pane === name); });
    if (name === 'results') loadDashboard();
    if (name === 'groups') loadGroups();
  }

  /* ===================== classes tab ===================== */
  function cmAdd() {
    var name = Lab.$('#cm-name').value.trim();
    if (!name) return;
    var btn = Lab.$('#cm-add'); btn.disabled = true;
    busyStatus('cm-status', 'Adding the class&hellip; this can take a moment');
    adminCall('addClass', { name: name }).then(function (r) {
      btn.disabled = false;
      Lab.$('#cm-name').value = '';
      status('cm-status', r && r.ok ? 'Class added.' : 'Could not add the class.');
      reloadClasses();
    });
  }
  function cmDelete() {
    var n = Lab.$('#cm-select').value; if (!n) return;
    Lab.confirm('Delete class "' + n + '"?', 'This removes the class and all its pupils’ results. This cannot be undone.', 'Delete', function (ok) {
      if (!ok) return;
      busyStatus('cm-status', 'Deleting the class&hellip; this can take a moment');
      adminCall('deleteClass', { name: n }).then(function () { status('cm-status', 'Class deleted.'); reloadClasses(); });
    });
  }
  function cmLink() { var n = Lab.$('#cm-select').value; if (n) copy(Lab.classLink(n), 'cm-status'); }
  function cmGo() {
    var n = Lab.$('#cm-select').value; if (!n) return;
    var a = document.createElement('a'); a.href = Lab.classLink(n); a.target = '_top'; document.body.appendChild(a); a.click(); a.remove();
  }
  function showQr(name) {
    if (!name) return;
    var link = Lab.classLink(name);
    Lab.$('#qr-title').textContent = 'Link for ' + name;
    Lab.$('#qr-link').textContent = link;
    Lab.openModal('qr-modal');
    if (global.QRCode && global.QRCode.toCanvas) {
      global.QRCode.toCanvas(Lab.$('#qr-canvas'), link, { width: 240, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1A3A6B', light: '#ffffff' } }, function () {});
    }
    Lab.$('#qr-copy').onclick = function () { copy(link, null); };
  }

  /* ===================== results tab (dashboard) ===================== */
  function loadDashboard() {
    var cls = Lab.$('#dash-class').value;
    Lab.$('#dash-empty').hidden = true;
    Lab.$('#dash-stats').innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Loading the class&hellip; this can take a moment</span></div>';
    Lab.$('#dash-tbody').innerHTML = '';
    adminCall('data', { className: cls }).then(function (r) {
      if (!r || !r.ok) { Lab.$('#dash-stats').innerHTML = '<p class="lb-empty">Could not load this class. Tap Refresh to try again.</p>'; return; }
      curDash = (r.participants || []).slice().sort(function (a, b) { return b.xp - a.xp; });
      renderDashboard();
    });
  }
  function renderDashboard() {
    var tb = Lab.$('#dash-tbody'); tb.innerHTML = '';
    var empty = Lab.$('#dash-empty');
    if (!curDash.length) { empty.hidden = false; Lab.$('#dash-stats').innerHTML = ''; renderStats(); return; }
    empty.hidden = true;
    curDash.forEach(function (p, i) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="num">' + (i + 1) + '</td><td>' + Lab.esc(p.name) + '</td>' +
        '<td class="num">' + (p.atomDone || 0) + '</td>' +
        '<td class="num">' + (p.snapStreak || 0) + '</td>' +
        '<td class="num">' + (p.massCorrect || 0) + '/' + Math.max(p.massDone || 0, p.massCorrect || 0) + '</td>' +
        '<td class="num pct-cell">' + (p.xp || 0) + '</td>';
      tb.appendChild(tr);
    });
    renderStats();
  }
  function renderStats() {
    var n = curDash.length;
    var avg = n ? Math.round(curDash.reduce(function (s, p) { return s + (p.xp || 0); }, 0) / n) : 0;
    var top = n ? curDash[0].xp : 0;
    Lab.$('#dash-stats').innerHTML =
      stat(n, 'Pupils played') + stat(avg, 'Average XP') + stat(top, 'Top XP');
  }
  function stat(v, l) { return '<div class="dash-stat"><b>' + v + '</b><span>' + l + '</span></div>'; }
  function exportCsv() {
    var head = ['Rank', 'Pupil', 'Atoms built', 'Best snap streak', 'Mass spec correct', 'XP'];
    var lines = [head.join(',')];
    curDash.forEach(function (p, i) {
      lines.push([i + 1, '"' + String(p.name).replace(/"/g, '""') + '"', p.atomDone || 0, p.snapStreak || 0, p.massCorrect || 0, p.xp || 0].join(','));
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'isotope-lab-' + (Lab.$('#dash-class').value || 'class') + '.csv'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  /* ===================== groups tab (the new feature) ===================== */
  function loadGroups() {
    var cls = Lab.$('#grp-class').value;
    Lab.$('#grp-groups').innerHTML = '<div class="panel-loading"><span class="panel-spinner"></span><span>Loading&hellip; this can take a moment</span></div>';
    Lab.$('#grp-pool').innerHTML = '';
    adminCall('groups', { className: cls }).then(function (r) {
      if (!r || !r.ok) {
        Lab.$('#grp-groups').innerHTML = '<p class="lb-empty">Could not load groups. Tap Refresh to try again.</p>';
        return;
      }
      curGroups = r;
      Lab.$('#grp-reveal-toggle').checked = !!r.groupsRevealed;
      renderGroups();
    });
  }
  function renderGroups() {
    closeChipMenu();
    var r = curGroups; if (!r) return;
    var assigned = {};
    r.groups.forEach(function (g) { g.members.forEach(function (m) { assigned[m.email] = true; }); });
    var unassigned = r.pupils.filter(function (p) { return !assigned[p.email]; });

    var pool = Lab.$('#grp-pool'); pool.innerHTML = '';
    if (!r.pupils.length) {
      pool.innerHTML = '<span class="lb-empty" style="padding:6px;font-size:.82rem">No pupils have opened this class yet. Share the class link &mdash; everyone who signs in appears here, ready to put into groups.</span>';
    } else if (!unassigned.length) {
      pool.innerHTML = '<span class="lb-empty" style="padding:6px;font-size:.82rem">Everyone is assigned.</span>';
    } else {
      unassigned.forEach(function (p) { pool.appendChild(chip(p)); });
    }

    var box = Lab.$('#grp-groups'); box.innerHTML = '';
    if (!r.groups.length) { box.innerHTML = '<p class="lb-empty" style="font-size:.85rem">No groups yet. Add one, or use Auto-make.</p>'; }
    r.groups.forEach(function (g) {
      var teamXp = g.members.reduce(function (s, m) { return s + (m.xp || 0); }, 0); // recompute so it stays right after an instant move
      var col = document.createElement('div');
      col.className = 'grp-group'; col.dataset.groupId = g.id;
      col.innerHTML = '<h4><span>' + Lab.esc(g.name) + ' <span class="grp-group-team">' + teamXp + ' XP</span></span>' +
        '<button class="grp-group-del" title="Delete group" data-del="' + g.id + '">&times;</button></h4>' +
        '<div class="grp-group-members"></div>';
      var mem = col.querySelector('.grp-group-members');
      g.members.forEach(function (m) { mem.appendChild(chip(m)); });
      box.appendChild(col);
    });
  }
  function chip(p) {
    var c = document.createElement('span');
    c.className = 'grp-chip'; c.dataset.email = p.email;
    c.title = 'Tap to choose a group';
    c.innerHTML = Lab.esc(p.name) + ' <span class="chip-xp">' + (p.xp || 0) + '</span>';
    Lab.makeDraggable(c, {
      onTap: function (node) { openChipMenu(node, p); },
      getDropTarget: function (x, y, node) {
        var els = document.elementsFromPoint(x, y);
        for (var i = 0; i < els.length; i++) {
          var el = els[i].closest && els[i].closest('.grp-group, .grp-unassigned');
          if (el) return el;
        }
        return null;
      },
      onDrop: function (node, target) {
        if (!target) return;
        var gid = target.classList.contains('grp-group') ? target.dataset.groupId : null;
        assign(node.dataset.email, gid);
      }
    });
    return c;
  }

  /* Tap a pupil chip -> a small menu of groups. Works on phones where dragging
     is awkward; the live save is optimistic so the board updates instantly. */
  var chipMenuEl = null;
  function closeChipMenu() {
    if (!chipMenuEl) return;
    chipMenuEl.remove(); chipMenuEl = null;
    document.removeEventListener('click', onDocClickForMenu, true);
  }
  function onDocClickForMenu(e) { if (chipMenuEl && !chipMenuEl.contains(e.target)) closeChipMenu(); }
  function openChipMenu(anchor, p) {
    closeChipMenu();
    if (!curGroups) return;
    var curGid = null;
    curGroups.groups.forEach(function (g) { if (g.members.some(function (m) { return m.email === p.email; })) curGid = g.id; });
    var rows = '<div class="grp-menu-title">Move ' + Lab.esc(p.name) + ' to</div>' +
      '<button class="grp-menu-item" data-gid="">&mdash; Unassigned &mdash;</button>';
    curGroups.groups.forEach(function (g) {
      rows += '<button class="grp-menu-item' + (g.id === curGid ? ' current' : '') + '" data-gid="' + Lab.esc(g.id) + '">' +
        Lab.esc(g.name) + (g.id === curGid ? ' ✓' : '') + '</button>';
    });
    if (!curGroups.groups.length) rows += '<div class="grp-menu-empty">Add a group first.</div>';
    var menu = document.createElement('div');
    menu.className = 'grp-menu'; menu.innerHTML = rows;
    document.body.appendChild(menu);
    var rect = anchor.getBoundingClientRect();
    var mw = menu.offsetWidth, mh = menu.offsetHeight;
    var left = Math.max(8, Math.min(rect.left, global.innerWidth - mw - 8));
    var top = rect.bottom + 6;
    if (top + mh > global.innerHeight - 8) top = Math.max(8, rect.top - mh - 6);
    menu.style.left = left + 'px'; menu.style.top = top + 'px';
    menu.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.grp-menu-item'); if (!btn) return;
      var gid = btn.getAttribute('data-gid') || null;
      closeChipMenu();
      assign(p.email, gid);
    });
    chipMenuEl = menu;
    setTimeout(function () { document.addEventListener('click', onDocClickForMenu, true); }, 0);
  }

  function assign(email, groupId) {
    // optimistic: move the chip in our local model and re-render at once, so the
    // teacher never waits on a spinner (the live server can take a moment).
    if (curGroups) {
      var pu = curGroups.pupils.filter(function (x) { return x.email === email; })[0];
      curGroups.groups.forEach(function (g) { g.members = g.members.filter(function (m) { return m.email !== email; }); });
      if (groupId && pu) {
        var g = curGroups.groups.filter(function (x) { return x.id === groupId; })[0];
        if (g) g.members.push({ email: pu.email, name: pu.name, xp: pu.xp || 0 });
      }
      renderGroups();
    }
    adminCall('assignPupil', { className: Lab.$('#grp-class').value, email: email, groupId: groupId }).then(function (r) {
      if (!r || !r.ok) { status('grp-status', 'Could not save that move &mdash; reloading.'); loadGroups(); }
    });
  }
  function grpAdd() {
    var name = Lab.$('#grp-new-name').value.trim(); if (!name) return;
    var btn = Lab.$('#grp-add'); btn.disabled = true;
    busyStatus('grp-status', 'Adding the group&hellip; this can take a moment');
    adminCall('createGroup', { className: Lab.$('#grp-class').value, name: name }).then(function (r) {
      btn.disabled = false;
      if (!r || !r.ok) { status('grp-status', 'Could not add the group &mdash; please try again.'); return; }
      Lab.$('#grp-new-name').value = '';
      status('grp-status', 'Group “' + name + '” added.');  // clears the spinner
      loadGroups();
    });
  }
  function grpAuto() {
    var n = parseInt(Lab.$('#grp-auto-n').value, 10) || 3;
    Lab.confirm('Auto-make ' + n + ' groups?', 'This clears any existing groups for this class and shuffles every pupil into ' + n + ' new groups.', 'Shuffle', function (ok) {
      if (!ok) return;
      busyStatus('grp-status', 'Shuffling the class into teams&hellip; this can take a moment');
      adminCall('autoGroup', { className: Lab.$('#grp-class').value, n: n }).then(function (r) {
        status('grp-status', (r && r.ok) ? 'Groups shuffled.' : 'Could not shuffle &mdash; please try again.');
        loadGroups();
      });
    });
  }
  function setReveal() {
    var on = Lab.$('#grp-reveal-toggle').checked;
    busyStatus('grp-status', 'Updating&hellip;');
    adminCall('setReveal', { className: Lab.$('#grp-class').value, revealed: on }).then(function (r) {
      if (!r || !r.ok) {
        Lab.$('#grp-reveal-toggle').checked = !on;  // revert the toggle
        status('grp-status', 'Could not update &mdash; please try again.');
        return;
      }
      status('grp-status', on ? 'Pupils can now see who is in their group.' : 'Group members are now hidden from pupils.');
    });
  }
  function grpDelete(id) {
    Lab.confirm('Delete this group?', 'Pupils in it become unassigned. This cannot be undone.', 'Delete', function (ok) {
      if (!ok) return;
      busyStatus('grp-status', 'Deleting the group&hellip;');
      adminCall('deleteGroup', { className: Lab.$('#grp-class').value, groupId: id }).then(function (r) {
        status('grp-status', (r && r.ok) ? 'Group deleted.' : 'Could not delete &mdash; please try again.');
        loadGroups();
      });
    });
  }

  /* ===================== helpers ===================== */
  function status(id, msg) { var el = Lab.$('#' + id); if (!el) return; el.hidden = false; el.className = 'form-note'; el.textContent = msg; clearTimeout(el._t); el._t = setTimeout(function () { el.hidden = true; }, 2600); }
  function busyStatus(id, msg) { var el = Lab.$('#' + id); if (!el) return; clearTimeout(el._t); el.hidden = false; el.className = 'panel-loading'; el.innerHTML = '<span class="panel-spinner"></span><span>' + msg + '</span>'; }
  function copy(text, statusId) {
    function done() { if (statusId) status(statusId, 'Link copied.'); else status('cm-status', 'Copied.'); }
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { if (statusId) status(statusId, text); }
      ta.remove();
    }
  }

  /* ===================== public + bind ===================== */
  Lab.Staff = { openLeaderboard: openLeaderboard, openMyGroup: openMyGroup, openStaff: openStaff };
  Lab.Staff.bind = function () {
    Lab.$('#staff-unlock').addEventListener('click', unlock);
    Lab.$('#staff-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });
    Lab.$$('.staff-tab').forEach(function (t) { t.addEventListener('click', function () { switchTab(t.dataset.tab); }); });

    Lab.$('#cm-add').addEventListener('click', cmAdd);
    Lab.$('#cm-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') cmAdd(); });
    Lab.$('#cm-link').addEventListener('click', cmLink);
    Lab.$('#cm-qr').addEventListener('click', function () { showQr(Lab.$('#cm-select').value); });
    Lab.$('#cm-go').addEventListener('click', cmGo);
    Lab.$('#cm-delete').addEventListener('click', cmDelete);

    Lab.$('#dash-class').addEventListener('change', loadDashboard);
    Lab.$('#dash-refresh').addEventListener('click', loadDashboard);
    Lab.$('#dash-csv').addEventListener('click', exportCsv);

    Lab.$('#grp-class').addEventListener('change', loadGroups);
    Lab.$('#grp-refresh').addEventListener('click', loadGroups);
    Lab.$('#grp-add').addEventListener('click', grpAdd);
    Lab.$('#grp-auto').addEventListener('click', grpAuto);
    Lab.$('#grp-reveal-toggle').addEventListener('change', setReveal);
    Lab.$('#grp-groups').addEventListener('click', function (e) {
      var del = e.target.closest && e.target.closest('[data-del]');
      if (del) grpDelete(del.getAttribute('data-del'));
    });

    // close-modal buttons (shared)
    Lab.$$('[data-close-modal]').forEach(function (b) {
      b.addEventListener('click', function () { Lab.closeModal(b.getAttribute('data-close-modal')); });
    });
  };

})(typeof window !== 'undefined' ? window : this);
