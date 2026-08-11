/* hb.js — THE HAT BLOCK: why some code never runs (DFM 191c, on the DFM 174/180 pattern).

   DAMIEN, 11 Aug 2026: "could we add animations to aid understanding of concepts
   that they meet (I loved the variable one you did)?" — so Lesson 4 gets the
   concept its whole hour turns on: a stack of blocks runs only when something
   WAKES it, and a stack with no hat is perfect code that never runs at all.
   That is the training case (the right-arrow script), exit question ex4-1, and
   the sentence the film then proves in the real editor.

   The three stacks mirror the real Shark Attack: a flag script, a working
   arrow script, and the hatless right-arrow stack the pupil is about to fix.

   RECORDING CONSTRAINTS (inherited from lib/variable-box/vb.js — read its header):
   filmed head-less through Playwright on a software renderer, so no shadow maps,
   no post-processing, modest geometry, glows are emissive + sprite. Nothing
   animates itself: record.js calls window.hb.play(n) beat by beat so captions and
   picture stay in step and a re-record is reproducible. No Math.random anywhere.

   window.hb.ready   resolves once the first frame has been drawn
   window.hb.play(n) plays beat n (1..7), resolves when it finishes
   window.hb.probe() pixel samples, so the recorder can PROVE the canvas is not a
                     black rectangle before it trusts the take (DFM 146b)
   window.hb.probeTokens() projects each VISIBLE event token's height to screen
                     pixels. record.js asserts >= 110px at every naming pause and
                     throws otherwise — DFM 192e's legibility law, measured in
                     real pixels rather than judged by eye (146b). */
(function () {
  var W = 1280, H = 720;
  var NAVY = 0x060D1F;
  /* Scratch's own palette — the film cuts straight to the real editor, so the
     animation must not teach a colour the editor then contradicts (DFM 35). */
  var EVENTS = 0xFFBF00, MOTION = 0x4C97FF, LOOKS = 0x9966FF, CONTROL = 0xFFAB19;
  var GOLD_HI = 0xFFD84D, DEAD = 0x33415E;

  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.Fog(NAVY, 22, 46);

  var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 120);
  camera.position.set(0, 0.85, 13.8);
  camera.lookAt(0, 0.85, 0);

  scene.add(new THREE.AmbientLight(0x8fa6d8, 0.5));
  var key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(4, 8, 7); scene.add(key);
  var warm = new THREE.PointLight(GOLD_HI, 0.6, 30); warm.position.set(-5, 3, 6); scene.add(warm);

  /* ---------- helpers (same label recipe as vb.js) ---------- */
  function label(text, opts) {
    opts = opts || {};
    var pad = 22, fs = opts.fs || 96, weight = opts.weight || '700';
    var c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = weight + ' ' + fs + 'px "Helvetica Neue", Arial, sans-serif';
    var w = Math.ceil(g.measureText(text).width) + pad * 2;
    c.width = Math.max(8, w); c.height = fs + pad * 2;
    g = c.getContext('2d');
    g.font = weight + ' ' + fs + 'px "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = opts.colour || '#231A02';
    g.fillText(text, c.width / 2, c.height / 2 + 2);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    var h = opts.h || 0.34;
    var planeW = (c.width / c.height) * h;
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, h), mat);
    /* block text must never overrun its own block — at 720p an overhanging label
       reads as a neighbouring stack's word and the picture stops being truthful */
    if (opts.maxW && planeW > opts.maxW) {
      var k = opts.maxW / planeW;
      mesh.scale.set(k, k, 1);
    }
    mesh.renderOrder = 4;
    return mesh;
  }

  function glow(colour, size) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 3, 64, 64, 64);
    grd.addColorStop(0, colour); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.9
    }));
    sp.scale.set(size, size, 1);
    return sp;
  }

  var SLAB_W = 3.5, SLAB_H = 0.66, SLAB_D = 0.62, STEP = 0.72;

  /* one code slab: a coloured block with its own words on the front */
  function makeSlab(text, colour, live) {
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({
      color: live ? colour : DEAD, roughness: 0.45, metalness: 0.05,
      emissive: new THREE.Color(colour), emissiveIntensity: 0
    });
    var body = new THREE.Mesh(new THREE.BoxGeometry(SLAB_W, SLAB_H, SLAB_D), mat);
    g.add(body);
    /* the notch-and-bump that makes a Scratch block look like a Scratch block */
    var bump = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, SLAB_D * 0.9, 12), mat);
    bump.rotation.x = Math.PI / 2;
    bump.position.set(-SLAB_W / 2 + 0.62, -SLAB_H / 2 - 0.02, 0);
    g.add(bump);
    var txt = label(text, { colour: '#20160A', h: 0.3, fs: 90, maxW: SLAB_W - 0.34 });
    txt.position.set(0, 0, SLAB_D / 2 + 0.012);
    g.add(txt);
    g.userData = { mat: mat, colour: colour, live: !!live };
    return g;
  }

  /* the HAT: a slab whose top is a half-cylinder, exactly like Scratch draws it */
  function makeHat(text, live) {
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({
      color: live ? EVENTS : DEAD, roughness: 0.4, metalness: 0.05,
      emissive: new THREE.Color(EVENTS), emissiveIntensity: 0
    });
    var body = new THREE.Mesh(new THREE.BoxGeometry(SLAB_W, SLAB_H, SLAB_D), mat);
    g.add(body);
    /* THE SCRATCH DOME. Geometry maths, because guessing produced a vertical
       crescent slicing through the stack on the first take:
       a CylinderGeometry's axis is Y and its rim sits at x = r·sinθ, z = r·cosθ.
       rotation.x = π/2 sends the axis to Z (the block's depth) and maps geometry
       z → world −y. So the half we want on TOP (world y ≥ 0) is geometry z ≤ 0,
       i.e. θ ∈ [π/2, 3π/2] — hence thetaStart = π/2. Flattening the arch then
       means scaling geometry Z (scale is applied before the rotation), never Y. */
    var dome = new THREE.Mesh(
      new THREE.CylinderGeometry(SLAB_W / 2, SLAB_W / 2, SLAB_D, 28, 1, false, Math.PI / 2, Math.PI),
      mat);
    dome.rotation.x = Math.PI / 2;
    dome.scale.z = 0.32;                 /* a low, wide Scratch dome, not a barrel */
    dome.position.set(0, SLAB_H / 2, 0);
    g.add(dome);
    var bump = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, SLAB_D * 0.9, 12), mat);
    bump.rotation.x = Math.PI / 2;
    bump.position.set(-SLAB_W / 2 + 0.62, -SLAB_H / 2 - 0.02, 0);
    g.add(bump);
    var txt = label(text, { colour: '#20160A', h: 0.28, fs: 90, maxW: SLAB_W - 0.34 });
    txt.position.set(0, 0, SLAB_D / 2 + 0.012);
    g.add(txt);
    g.userData = { mat: mat, live: !!live };
    return g;
  }

  /* a stack = optional hat + slabs hanging under it */
  function makeStack(x, hatText, rows) {
    var g = new THREE.Group();
    g.position.set(x, 1.9, 0);
    var hat = null;
    if (hatText) { hat = makeHat(hatText, true); g.add(hat); }
    var slabs = rows.map(function (r, i) {
      var s = makeSlab(r[0], r[1], !!hatText);
      s.position.y = -(i + 1) * STEP;
      g.add(s);
      return s;
    });
    var halo = glow('rgba(255,216,77,0.42)', 7.4);
    halo.position.set(0, -1.1, -0.9);
    halo.material.opacity = 0;
    g.add(halo);
    scene.add(g);
    g.userData = { hat: hat, slabs: slabs, halo: halo, awake: !!hatText };
    return g;
  }

  /* ---------- the three stacks: Shark Attack's own scripts ---------- */
  var stackA = makeStack(-4.15, 'when green flag clicked', [
    ['go to x: 0 y: 0', MOTION],
    ['show', LOOKS]
  ]);
  var stackB = makeStack(0, 'when left arrow key pressed', [
    ['point in direction -90', MOTION],
    ['move 10 steps', MOTION],
    ['next costume', LOOKS]
  ]);
  var stackC = makeStack(4.15, null, [
    ['point in direction 90', MOTION],
    ['move 10 steps', MOTION],
    ['next costume', LOOKS]
  ]);

  /* the bare stack wears a question mark where its hat should be */
  var gapMark = label('?', { colour: '#5C6F94', h: 0.66, fs: 150 });
  gapMark.position.set(4.15, 2.16, 0.5);
  gapMark.material.opacity = 0;
  scene.add(gapMark);

  /* ---------- THE EVENT TOKENS ----------
     DAMIEN, 11 Aug 2026 (DFM 192e): "the little things flying across at the top
     can't hardly be seen… it wasn't a green flag that dropped in there. It
     wasn't an arrow key… the exact polar opposite of impressiveness to the
     variable animation."
     He is right, and it wrote the law: IN A CONCEPT ANIMATION, EVERY ACTOR MUST
     BE A PHYSICALLY RECOGNISABLE THING, LARGE ENOUGH TO READ, ON SCREEN LONG
     ENOUGH TO NAME. The 0.3-unit glyph orbs (⚑ ← ␣, about 40px on a 720p frame,
     three at once, crossing frame in 2.4s) are gone entirely. In their place:
     a real green flag on a pole, and real arrow KEYCAPS — the same keys she
     presses to play the game. One at a time, and each one pauses close to
     camera while the caption names it. Legibility is not asserted by eye: see
     window.hb.probeTokens(), which the recorder gates the take on. */

  /* An arrow drawn as CANVAS PATHS, never a glyph. A missing font renders a
     glyph as a tofu box and the take would still look "fine" to a pixel probe —
     and this film is recorded under a Windows UA on headless Chromium, where
     the available fonts are not ours to assume. Paths always draw. */
  function arrowTexture(dir) {
    var S = 256;
    var c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d');
    g.fillStyle = '#1B2740';
    g.translate(S / 2, S / 2);
    if (dir === 'left') g.rotate(Math.PI);
    /* shaft + head, drawn pointing RIGHT then rotated */
    var shaftH = S * 0.17, shaftW = S * 0.34, headW = S * 0.30, headH = S * 0.52;
    g.beginPath();
    g.moveTo(-S * 0.34, -shaftH / 2);
    g.lineTo(-S * 0.34 + shaftW, -shaftH / 2);
    g.lineTo(-S * 0.34 + shaftW, -headH / 2);
    g.lineTo(-S * 0.34 + shaftW + headW, 0);
    g.lineTo(-S * 0.34 + shaftW, headH / 2);
    g.lineTo(-S * 0.34 + shaftW, shaftH / 2);
    g.lineTo(-S * 0.34, shaftH / 2);
    g.closePath();
    g.fill();
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  /* A KEYCAP: skirt + raised pale key top + a huge dark arrow printed on it.
     1.35 units square — at its naming pause that is ~175px tall on the frame. */
  function makeKeycap(dir) {
    var g = new THREE.Group();
    var K = 1.35, D = 0.34;
    var skirt = new THREE.Mesh(new THREE.BoxGeometry(K, K, D),
      new THREE.MeshStandardMaterial({ color: 0xC7CFDE, roughness: 0.62, metalness: 0.04 }));
    g.add(skirt);
    var top = new THREE.Mesh(new THREE.BoxGeometry(K * 0.84, K * 0.84, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xF2F5FA, roughness: 0.5, metalness: 0.02 }));
    top.position.z = D / 2 + 0.04;
    g.add(top);
    var art = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92),
      new THREE.MeshBasicMaterial({ map: arrowTexture(dir), transparent: true, depthWrite: false }));
    art.position.z = D / 2 + 0.095;
    art.renderOrder = 5;
    g.add(art);
    var ha = glow('rgba(255,255,255,0.34)', 3.2);
    ha.position.z = -0.3;
    g.add(ha);
    g.visible = false;
    scene.add(g);
    g.userData = { halo: ha, kind: 'keycap' };
    return g;
  }

  /* THE GREEN FLAG: pole + flag mesh in Scratch's own green, ~1.7 units tall —
     the thing she clicks to start the game, not a symbol standing for it. */
  function makeGreenFlag() {
    var g = new THREE.Group();
    var poleMat = new THREE.MeshStandardMaterial({ color: 0xD8DEE9, roughness: 0.5, metalness: 0.25 });
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.7, 14), poleMat);
    pole.position.set(-0.44, 0, 0);
    g.add(pole);
    var foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.1, 18), poleMat);
    foot.position.set(-0.44, -0.85, 0);
    g.add(foot);
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.62, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x4CBB59, roughness: 0.42, metalness: 0.03,
        emissive: new THREE.Color(0x4CBB59), emissiveIntensity: 0.14 }));
    mesh.position.set(0.06, 0.5, 0);
    g.add(mesh);
    var ha = glow('rgba(120,235,140,0.42)', 3.4);
    ha.position.set(0, 0.2, -0.3);
    g.add(ha);
    g.visible = false;
    scene.add(g);
    g.userData = { halo: ha, kind: 'flag' };
    return g;
  }

  var tokFlag = makeGreenFlag();
  var tokLeft = makeKeycap('left');
  var tokRight = makeKeycap('right');
  var TOKENS = [
    { name: 'green flag', g: tokFlag },
    { name: 'left arrow keycap', g: tokLeft },
    { name: 'right arrow keycap', g: tokRight }
  ];

  /* where a token pauses to be NAMED: centre stage, close to camera, so it is
     the biggest thing on the frame while the caption says what it is */
  var NAME_SPOT = [0, 0.8, 6.6];

  /* the loose hat that lands in beat 6 */
  var looseHat = makeHat('when right arrow key pressed', true);
  looseHat.position.set(4.15, 8.4, 0.0);
  looseHat.visible = false;
  scene.add(looseHat);

  /* ---------- a still starfield (no animation loop cost) ---------- */
  var STARS = [
    [-8.2, 5.4, -12], [6.4, 6.1, -14], [-3.1, 6.8, -11], [8.9, 4.2, -13],
    [-9.6, 2.1, -15], [2.2, 7.4, -12], [9.8, 6.6, -16], [-6.3, 7.2, -13],
    [4.1, 5.0, -15], [-1.8, 7.9, -14], [7.2, 2.8, -12], [-7.7, 4.0, -16]
  ];
  var starMat = new THREE.MeshBasicMaterial({ color: 0xCFE0FF, transparent: true, opacity: 0.5 });
  var starGeo = new THREE.SphereGeometry(0.045, 6, 6);
  STARS.forEach(function (p) {
    var s = new THREE.Mesh(starGeo, starMat);
    s.position.set(p[0], p[1], p[2]);
    scene.add(s);
  });

  var floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30),
    new THREE.MeshStandardMaterial({ color: 0x0B1428, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5.4;
  scene.add(floor);

  function frame() {
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  var tl = function () { return gsap.timeline({ defaults: { ease: 'power3.out' } }); };

  /* light a stack slab by slab, top to bottom — the thing a hat block causes */
  function runStack(t, stack, at) {
    var parts = (stack.userData.hat ? [stack.userData.hat] : []).concat(stack.userData.slabs);
    t.to(stack.userData.halo.material, { opacity: 0.85, duration: 0.45 }, at);
    parts.forEach(function (p, i) {
      var m = p.userData.mat;
      t.to(m, { emissiveIntensity: 0.85, duration: 0.22 }, at + i * 0.26);
      t.to(m, { emissiveIntensity: 0.16, duration: 0.5 }, at + i * 0.26 + 0.24);
      t.to(p.scale, { x: 1.055, y: 1.055, duration: 0.14 }, at + i * 0.26);
      t.to(p.scale, { x: 1, y: 1, duration: 0.3, ease: 'elastic.out(1,0.45)' }, at + i * 0.26 + 0.14);
    });
    t.to(stack.userData.halo.material, { opacity: 0.3, duration: 0.9 }, at + parts.length * 0.26 + 0.3);
  }

  /* wake a dead stack's colours (beat 6) */
  function wakeColours(t, stack, at) {
    stack.userData.slabs.forEach(function (s, i) {
      t.to(s.userData.mat.color, {
        r: new THREE.Color(s.userData.colour).r,
        g: new THREE.Color(s.userData.colour).g,
        b: new THREE.Color(s.userData.colour).b,
        duration: 0.5
      }, at + i * 0.08);
    });
  }

  /* ---------- token motion (the pacing law lives here) ----------
     enter ~2.0s -> PAUSE ~1.8s at centre stage while the caption names it ->
     travel ~1.6s to its hat. Nothing on screen moves faster than a child can
     read it, and only ever ONE event is on screen (DFM 192e). */
  function enterAndName(t, tok, from, at) {
    t.call(function () {
      tok.visible = true;
      tok.position.set(from[0], from[1], from[2]);
      tok.scale.setScalar(1);
      tok.rotation.set(0, 0, 0);
    }, null, at);
    t.to(tok.position, { x: NAME_SPOT[0], y: NAME_SPOT[1], z: NAME_SPOT[2], duration: 2.0, ease: 'power2.out' }, at);
    /* a slow quarter-turn while it settles: it reads as a THING, not a sprite */
    t.fromTo(tok.rotation, { y: -0.5 }, { y: 0, duration: 2.0, ease: 'power2.out' }, at);
    return at + 2.0 + 1.8;                       // the naming pause is real time
  }
  /* the matching hat's label brightens BEFORE the catch: the match must be seen,
     not implied — and every other stack stays dark while it happens */
  function armHat(t, stack, at) {
    if (!stack.userData.hat) return;
    t.to(stack.userData.hat.userData.mat, { emissiveIntensity: 0.55, duration: 0.5 }, at);
  }
  function travelToHat(t, tok, stack, at, dur) {
    var p = stack.position;
    t.to(tok.position, { x: p.x, y: p.y + 0.44, z: 0.34, duration: dur || 1.6, ease: 'power2.inOut' }, at);
    t.to(tok.scale, { x: 0.72, y: 0.72, z: 0.72, duration: dur || 1.6, ease: 'power2.inOut' }, at);
    return at + (dur || 1.6);
  }
  /* THE CATCH, made visible: the dome flashes, the token sinks in and is gone */
  function catchAt(t, tok, stack, at) {
    var hatMat = stack.userData.hat && stack.userData.hat.userData.mat;
    if (hatMat) {
      t.to(hatMat, { emissiveIntensity: 1.0, duration: 0.16 }, at);
      t.to(hatMat, { emissiveIntensity: 0.2, duration: 0.55 }, at + 0.18);
    }
    t.to(tok.position, { y: stack.position.y - 0.1, z: -0.3, duration: 0.42, ease: 'power2.in' }, at);
    t.to(tok.scale, { x: 0.02, y: 0.02, z: 0.02, duration: 0.42, ease: 'power2.in' }, at);
    t.call(function () { tok.visible = false; tok.scale.setScalar(1); }, null, at + 0.46);
    return at + 0.5;
  }
  function driftPastAndFade(t, tok, at) {
    t.to(tok.position, { x: 11.5, y: -1.4, duration: 2.0, ease: 'power1.in' }, at);
    t.to(tok.rotation, { z: -0.5, duration: 2.0 }, at);
    tok.traverse(function (n) { if (n.material && n.material.transparent !== undefined) {} });
    t.to(tok.scale, { x: 0.35, y: 0.35, z: 0.35, duration: 2.0, ease: 'power1.in' }, at);
    t.call(function () { tok.visible = false; tok.scale.setScalar(1); tok.rotation.set(0, 0, 0); }, null, at + 2.05);
    return at + 2.1;
  }

  var beats = {
    /* 1 — three stacks, nothing moving. The stillness IS the point. */
    1: function () {
      var t = tl();
      [stackA, stackB, stackC].forEach(function (s, i) {
        s.scale.setScalar(0.01);
        t.to(s.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.3)' }, 0.15 + i * 0.28);
      });
      t.to(gapMark.material, { opacity: 0.75, duration: 0.6 }, 1.7);
      t.to({}, { duration: 3.6 });
      return t;
    },

    /* 2 — the GREEN FLAG arrives, and stops, and is named. */
    2: function () {
      var t = tl();
      var after = enterAndName(t, tokFlag, [-11, 4.4, 4.0], 0.2);
      t.to({}, { duration: 2.2 }, after);
      return t;
    },

    /* 3 — the hat CATCHES it, and everything under the hat runs */
    3: function () {
      var t = tl();
      armHat(t, stackA, 0.2);
      var landed = travelToHat(t, tokFlag, stackA, 0.6, 1.6);
      var done = catchAt(t, tokFlag, stackA, landed);
      runStack(t, stackA, done + 0.15);
      t.to({}, { duration: 3.2 });
      return t;
    },

    /* 4 — a different EVENT, a different hat */
    4: function () {
      var t = tl();
      var after = enterAndName(t, tokLeft, [-11, 3.4, 4.0], 0.2);
      armHat(t, stackB, after - 0.4);
      var landed = travelToHat(t, tokLeft, stackB, after, 1.6);
      var done = catchAt(t, tokLeft, stackB, landed);
      runStack(t, stackB, done + 0.15);
      t.to({}, { duration: 2.6 });
      return t;
    },

    /* 5 — the bare stack: the event arrives, hovers, and NOTHING catches it */
    5: function () {
      var t = tl();
      var after = enterAndName(t, tokRight, [-11, 3.2, 4.0], 0.2);
      /* it goes to the orphan and SLOWS — the beat where she expects a catch */
      t.to(tokRight.position, { x: stackC.position.x, y: 3.05, z: 1.0, duration: 1.8, ease: 'power2.out' }, after);
      t.to(tokRight.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 1.8 }, after);
      t.to(gapMark.scale, { x: 1.45, y: 1.45, duration: 0.35 }, after + 1.5);
      t.to(gapMark.scale, { x: 1, y: 1, duration: 0.8, ease: 'elastic.out(1,0.4)' }, after + 1.85);
      /* the dead stack does not even flicker: no emissive move, anywhere */
      t.to({}, { duration: 0.9 }, after + 1.8);
      driftPastAndFade(t, tokRight, after + 2.7);
      t.to({}, { duration: 2.0 });
      return t;
    },

    /* 6 — the fix: give the stack its hat, and its colours wake */
    6: function () {
      var t = tl();
      t.call(function () { looseHat.visible = true; }, null, 0);
      t.to(gapMark.material, { opacity: 0, duration: 0.4 }, 0.2);
      t.fromTo(looseHat.position, { y: 8.4 }, { y: 1.9, duration: 1.4, ease: 'power3.in' }, 0.5);
      t.to(looseHat.scale, { x: 1.09, y: 0.9, duration: 0.1 }, 1.9);
      t.to(looseHat.scale, { x: 1, y: 1, duration: 0.45, ease: 'elastic.out(1,0.4)' }, 2.0);
      t.to(looseHat.userData.mat, { emissiveIntensity: 1.0, duration: 0.14 }, 1.9);
      t.to(looseHat.userData.mat, { emissiveIntensity: 0.16, duration: 0.5 }, 2.06);
      wakeColours(t, stackC, 2.0);
      /* from here on the loose hat IS stack C's hat: beat 7's catch flashes
         it, and runStack lights it with the blocks it now owns. */
      t.call(function () { stackC.userData.hat = looseHat; stackC.userData.awake = true; }, null, 2.1);
      t.to({}, { duration: 3.4 });
      return t;
    },

    /* 7 — press it again: caught, and the stack runs. The shark swims right. */
    7: function () {
      var t = tl();
      t.call(function () {
        tokRight.visible = true;
        tokRight.position.set(-9, 3.4, 3.2);
        tokRight.scale.setScalar(1);
        tokRight.rotation.set(0, 0, 0);
      }, null, 0.2);
      t.to(tokRight.position, { x: -2.2, y: 3.2, z: 2.0, duration: 1.5, ease: 'power2.out' }, 0.2);
      armHat(t, stackC, 1.4);
      var landed = travelToHat(t, tokRight, stackC, 1.8, 1.6);
      var done = catchAt(t, tokRight, stackC, landed);
      runStack(t, stackC, done + 0.15);
      t.to({}, { duration: 3.0 });
      return t;
    }
  };

  window.__scene = scene; window.__cam = camera;
  window.hb = {
    ready: new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); }),
    play: function (n) {
      return new Promise(function (res) {
        var t = beats[n]();
        t.eventCallback('onComplete', res);
      });
    },
    /* DFM 192e, gated in pixels: "the little things flying across at the top
       can't hardly be seen". A number now decides that, not an opinion. */
    probeTokens: function () {
      var out = [];
      TOKENS.forEach(function (tk) {
        if (!tk.g.visible) return;
        /* MEASURE THE OBJECT, NOT ITS HALO. setFromObject swallows the glow
           Sprite (scale 3.4), which reported the green flag at 441px when the
           flag itself is 1.75 units — a gate that would have passed a 40px
           token, i.e. exactly the defect it exists to catch. Meshes only. */
        var box = new THREE.Box3();
        tk.g.traverse(function (n) {
          if (n.isMesh && n.geometry) box.expandByObject(n);
        });
        if (box.isEmpty()) return;
        var c = box.getCenter(new THREE.Vector3());
        var top = new THREE.Vector3(c.x, box.max.y, c.z).project(camera);
        var bot = new THREE.Vector3(c.x, box.min.y, c.z).project(camera);
        out.push({ name: tk.name, px: Math.round(Math.abs(top.y - bot.y) / 2 * H) });
      });
      return out;
    },
    probe: function () {
      var g = renderer.domElement.getContext('webgl2') || renderer.domElement.getContext('webgl');
      var px = new Uint8Array(4 * 40 * 40);
      var out = [];
      [[300, 330], [640, 330], [960, 330]].forEach(function (p) {
        g.readPixels(p[0], p[1], 40, 40, g.RGBA, g.UNSIGNED_BYTE, px);
        var max = 0, sum = 0;
        for (var i = 0; i < px.length; i += 4) {
          var v = px[i] + px[i + 1] + px[i + 2];
          sum += v; if (v > max) max = v;
        }
        out.push({ at: p, max: max, mean: Math.round(sum / (px.length / 4)) });
      });
      return out;
    }
  };
})();
