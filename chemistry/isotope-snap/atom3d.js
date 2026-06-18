/* ============================================================================
   Isotope Lab — Mode A: Build an Atom (Three.js 3D)
   Real WebGL atom: packed nucleus (protons + neutrons) and orbiting electron
   shells. Drag to rotate, wheel/pinch to zoom. Live element readout + isotope
   "build" challenges drawn from Data Bank 1.
   ============================================================================ */
(function (global) {
  'use strict';
  var Lab = global.Lab, D = global.ISO_DATA;

  var THREE = null;
  var renderer, scene, camera, atomGroup, nucleusGroup, shellsGroup;
  var raf = null, running = false, inited = false, webglOk = true;
  var spin = 0.0025, yaw = 0.4, pitch = -0.18, dist = 9;
  var stageEl;

  // build state
  var P = 0, N = 0, E = 0;
  var challenge = null, challengeIdx = -1, solved = {};

  // shared resources
  var geo = {}, mat = {};

  /* Challenge set — varied so each requires real isotope knowledge. */
  var CHALLENGES = [
    { kind: 'isotope', sym: 'Li', mass: 7,  label: 'lithium-7' },
    { kind: 'isotope', sym: 'C',  mass: 14, label: 'carbon-14' },
    { kind: 'isotope', sym: 'He', mass: 4,  label: 'helium-4' },
    { kind: 'isotope', sym: 'O',  mass: 18, label: 'oxygen-18' },
    { kind: 'isotope', sym: 'B',  mass: 11, label: 'boron-11' },
    { kind: 'isotope', sym: 'N',  mass: 15, label: 'nitrogen-15' }
  ];

  function zOf(sym) { return D.SYM_TO_Z[sym.toLowerCase()]; }

  /* ---------------- Three.js scene ---------------- */
  function initThree() {
    THREE = global.THREE;
    stageEl = Lab.$('#atom-stage');
    if (!THREE || !stageEl) { webglOk = false; return; }
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { webglOk = false; showFallback(); return; }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    sizeRenderer();
    stageEl.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(46, aspect(), 0.1, 100);

    atomGroup = new THREE.Group();
    nucleusGroup = new THREE.Group();
    shellsGroup = new THREE.Group();
    atomGroup.add(nucleusGroup); atomGroup.add(shellsGroup);
    scene.add(atomGroup);

    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    var key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(5, 7, 6); scene.add(key);
    var rim = new THREE.PointLight(0x8fd0ff, 0.7, 60); rim.position.set(-6, -3, 5); scene.add(rim);
    var warm = new THREE.PointLight(0xffd66b, 0.5, 60); warm.position.set(4, -5, -4); scene.add(warm);

    // shared geometry / materials
    geo.proton = new THREE.SphereGeometry(0.46, 22, 22);
    geo.neutron = new THREE.SphereGeometry(0.46, 22, 22);
    geo.electron = new THREE.SphereGeometry(0.17, 16, 16);
    mat.proton = new THREE.MeshStandardMaterial({ color: 0xE8553B, roughness: 0.35, metalness: 0.1 });
    mat.neutron = new THREE.MeshStandardMaterial({ color: 0x6B7A90, roughness: 0.45, metalness: 0.1 });
    mat.electron = new THREE.MeshStandardMaterial({ color: 0x38B6FF, emissive: 0x10527d, emissiveIntensity: 0.5, roughness: 0.3 });
    mat.ring = new THREE.MeshBasicMaterial({ color: 0x9bdcff, transparent: true, opacity: 0.32 });

    inited = true;
    bindControls();
    rebuild();
  }

  function showFallback() {
    if (!stageEl) stageEl = Lab.$('#atom-stage');
    if (stageEl) stageEl.innerHTML = '<div style="color:#fff;text-align:center;padding:40px 20px;font-size:.95rem;opacity:.9">Your browser could not start 3D graphics, but you can still use the buttons and the live readout to build atoms.</div>';
  }

  function aspect() { var r = stageEl.getBoundingClientRect(); return Math.max(0.6, r.width / Math.max(1, r.height)); }
  function sizeRenderer() {
    var r = stageEl.getBoundingClientRect();
    renderer.setSize(r.width, r.height);   // updateStyle:true -> canvas DISPLAY size matches the stage (buffer still 2x for crispness)
    if (camera) { camera.aspect = aspect(); camera.updateProjectionMatrix(); }
  }

  /* fibonacci-ish points filling a sphere (for the nucleus cluster) */
  function packSphere(count, R) {
    if (count <= 0) return [];
    if (count === 1) return [[0, 0, 0]];
    var pts = [], ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < count; i++) {
      var y = 1 - (i / (count - 1)) * 2;
      var rad = Math.sqrt(Math.max(0, 1 - y * y));
      var th = ga * i;
      var rr = R * (0.42 + 0.58 * Math.cbrt((i + 1) / count)); // fill volume, not just shell
      pts.push([Math.cos(th) * rad * rr, y * rr, Math.sin(th) * rad * rr]);
    }
    return pts;
  }

  function clearGroup(g) { while (g.children.length) { g.remove(g.children[0]); } }

  function rebuild() {
    if (!inited) return;
    clearGroup(nucleusGroup); clearGroup(shellsGroup);

    var total = P + N;
    var R = 0.55 + 0.32 * Math.cbrt(Math.max(1, total));
    var pts = packSphere(total, R);
    var types = Lab.shuffle(fillTypes(P, N));
    pts.forEach(function (pos, i) {
      var isP = types[i] === 'p';
      var m = new THREE.Mesh(isP ? geo.proton : geo.neutron, isP ? mat.proton : mat.neutron);
      m.position.set(pos[0], pos[1], pos[2]);
      m.userData.jit = Math.random() * Math.PI * 2;
      nucleusGroup.add(m);
    });

    // electron shells based on E electrons
    var shells = D.electronShells(E);
    var baseR = R + 1.2;
    shells.forEach(function (k, idx) {
      var sr = baseR + idx * 1.15;
      var shell = new THREE.Group();
      shell.userData.speed = 0.018 - idx * 0.003;
      shell.rotation.x = 1.2 + idx * 0.5;
      shell.rotation.y = idx * 0.7;
      // ring
      var ring = new THREE.Mesh(new THREE.TorusGeometry(sr, 0.012, 8, 96), mat.ring);
      shell.add(ring);
      // electrons on the clock convention (singles at 12/3/6/9, then pairs);
      // a pair is two electrons a small angle apart so they orbit side-by-side
      function addElectron(ang) {
        var el = new THREE.Mesh(geo.electron, mat.electron);
        el.userData.ang = ang; el.userData.r = sr;
        el.position.set(Math.cos(ang) * sr, Math.sin(ang) * sr, 0);
        shell.add(el);
      }
      D.electronLayout(idx, k).forEach(function (pos) {
        if (pos.count === 1) { addElectron(pos.ang); }
        else { addElectron(pos.ang - 0.17); addElectron(pos.ang + 0.17); }
      });
      shellsGroup.add(shell);
    });

    // frame the camera so it always fits
    var span = baseR + shells.length * 1.15 + 1.2;
    dist = Lab.clamp(span * 1.7, 6, 26);
    updateReadout();
  }

  function fillTypes(p, n) { var a = []; for (var i = 0; i < p; i++) a.push('p'); for (var j = 0; j < n; j++) a.push('n'); return a; }

  /* ---------------- animation loop ---------------- */
  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!Lab.$('#atom-stage').__dragging) { yaw += spin; }
    atomGroup.rotation.y = yaw;
    atomGroup.rotation.x = pitch;
    // electrons orbit
    shellsGroup.children.forEach(function (shell) {
      shell.children.forEach(function (c) {
        if (c.userData.ang != null) {
          c.userData.ang += shell.userData.speed;
          c.position.set(Math.cos(c.userData.ang) * c.userData.r, Math.sin(c.userData.ang) * c.userData.r, 0);
        }
      });
    });
    // nucleus shimmer
    var t = Date.now() * 0.003;
    nucleusGroup.children.forEach(function (m) {
      var s = 1 + Math.sin(t + m.userData.jit) * 0.03;
      m.scale.setScalar(s);
    });
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  function start() { if (running) return; running = true; loop(); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  /* ---------------- camera controls ---------------- */
  function bindControls() {
    var el = stageEl, pointers = {};
    var lastX = 0, lastY = 0, pinchD = 0;
    el.addEventListener('pointerdown', function (e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      el.__dragging = true; lastX = e.clientX; lastY = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });
    el.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length >= 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchD) { dist = Lab.clamp(dist * (pinchD / d), 5, 30); }
        pinchD = d;
      } else {
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        yaw += dx * 0.01; pitch = Lab.clamp(pitch + dy * 0.01, -1.3, 1.3);
        lastX = e.clientX; lastY = e.clientY;
      }
    });
    function release(e) { delete pointers[e.pointerId]; if (Object.keys(pointers).length < 2) pinchD = 0; if (!Object.keys(pointers).length) el.__dragging = false; }
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('wheel', function (e) { e.preventDefault(); dist = Lab.clamp(dist + (e.deltaY > 0 ? 1 : -1) * 0.8, 5, 30); }, { passive: false });
    global.addEventListener('resize', function () { if (inited) sizeRenderer(); });
  }

  /* ---------------- readout ---------------- */
  function updateReadout() {
    var el = D.ELEMENTS[P];
    Lab.$('#pc-p').textContent = P; Lab.$('#pc-n').textContent = N; Lab.$('#pc-e').textContent = E;
    Lab.$('#readout-p').textContent = P; Lab.$('#readout-n').textContent = N; Lab.$('#readout-e').textContent = E;
    Lab.$('#readout-symbol').textContent = el ? el.sym : '—';
    Lab.$('#readout-name').textContent = P === 0 ? 'No protons yet' : (el ? el.name : 'Beyond our table');
    // nuclide notation
    var mass = P + N;
    var notation = el ? '<span class="nuclide" style="font-size:1.4rem"><span class="nuc-numbers"><span class="nuc-mass">' + mass + '</span><span class="nuc-z">' + P + '</span></span><span class="nuc-sym">' + el.sym + '</span></span>' : '';
    Lab.$('#readout-notation').innerHTML = notation;
    // ion / charge flag
    var flag = '';
    if (P > 0) {
      var charge = P - E;
      if (charge === 0) flag = 'Neutral atom';
      else flag = 'Ion, charge ' + (charge > 0 ? '+' : '−') + Math.abs(charge);
    }
    Lab.$('#readout-flag').textContent = flag;
    // disable minus buttons at 0
    Lab.$$('.pc-btn').forEach(function (b) {
      var part = b.getAttribute('data-particle'), delta = +b.getAttribute('data-delta');
      var cur = part === 'p' ? P : part === 'n' ? N : E;
      var max = part === 'p' ? 20 : part === 'n' ? 30 : 20;
      b.disabled = (delta < 0 && cur <= 0) || (delta > 0 && cur >= max);
    });
  }

  function setCounts(p, n, e) { P = Lab.clamp(p, 0, 20); N = Lab.clamp(n, 0, 30); E = Lab.clamp(e, 0, 20); rebuild(); }

  /* ---------------- challenges ---------------- */
  function startChallenge() {
    challengeIdx = (challengeIdx + 1) % CHALLENGES.length;
    challenge = CHALLENGES[challengeIdx];
    var z = zOf(challenge.sym), neut = challenge.mass - z;
    challenge.target = { p: z, n: neut, e: z };
    setCounts(0, 0, 0);
    Lab.$('#atom-challenge-label').textContent = 'Challenge';
    Lab.$('#ac-prompt').innerHTML = 'Build <b>' + challenge.label + '</b> (' + challenge.sym + '). Work out the protons, neutrons and electrons for a neutral atom, then press Check.';
    Lab.$('#ac-check').hidden = false;
    Lab.$('#ac-start').hidden = true;
    Lab.$('#ac-next').hidden = true;
    Lab.$('#ac-result').hidden = true;
    Lab.narrate('atom_open');
  }
  function checkChallenge() {
    if (!challenge) return;
    var t = challenge.target, ok = (P === t.p && N === t.n && E === t.e);
    var res = Lab.$('#ac-result'); res.hidden = false;
    if (ok) {
      res.className = 'ac-result good';
      res.textContent = 'Correct! ' + challenge.label + ' has ' + t.p + ' protons, ' + t.n + ' neutrons and ' + t.e + ' electrons.';
      Lab.sound.correct(); Lab.narrate('atom_win');
      Lab.$('#ac-check').hidden = true; Lab.$('#ac-next').hidden = false;
      if (!solved[challenge.label]) {
        solved[challenge.label] = true;
        Lab.state.progress.atom.done = Object.keys(solved).length;
        Lab.state.progress.atom.best = Math.max(Lab.state.progress.atom.best, Lab.state.progress.atom.done);
        Lab.addXp(20); Lab.updateHubProgress();
      }
    } else {
      res.className = 'ac-result bad';
      var hint = [];
      if (P !== t.p) hint.push(P < t.p ? 'more protons' : 'fewer protons');
      if (N !== t.n) hint.push(N < t.n ? 'more neutrons' : 'fewer neutrons');
      if (E !== t.e) hint.push('electrons should equal protons for a neutral atom');
      res.textContent = 'Not yet — try ' + hint.join(', ') + '.';
      Lab.sound.wrong(); Lab.narrate('atom_miss');
    }
  }
  function freeBuild() {
    challenge = null;
    Lab.$('#atom-challenge-label').textContent = 'Free build';
    Lab.$('#ac-prompt').innerHTML = 'Free build — make any atom you like, then try a challenge.';
    Lab.$('#ac-check').hidden = true; Lab.$('#ac-next').hidden = true; Lab.$('#ac-start').hidden = false;
    Lab.$('#ac-result').hidden = true;
  }

  /* ---------------- public ---------------- */
  Lab.Atom = {
    enter: function () {
      Lab.showScreen('atom');
      if (!inited && webglOk) initThree();
      if (!webglOk) showFallback();
      if (challenge) { /* keep */ } else freeBuild();
      if (!P && !N && !E && !challenge) setCounts(6, 6, 6); // a friendly default carbon
      Lab.narrate('atom_open');
      start();
    },
    leave: function () { stop(); },
    onResize: function () { if (inited) sizeRenderer(); }
  };

  /* wire buttons once DOM is ready (app.js calls Lab.Atom.bind) */
  Lab.Atom.bind = function () {
    Lab.$$('.pc-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var part = b.getAttribute('data-particle'), delta = +b.getAttribute('data-delta');
        if (part === 'p') setCounts(P + delta, N, E);
        else if (part === 'n') setCounts(P, N + delta, E);
        else setCounts(P, N, E + delta);
        Lab.sound.pop();
      });
    });
    Lab.$('#ac-start').addEventListener('click', startChallenge);
    Lab.$('#ac-check').addEventListener('click', checkChallenge);
    Lab.$('#ac-next').addEventListener('click', startChallenge);
  };

})(typeof window !== 'undefined' ? window : this);
