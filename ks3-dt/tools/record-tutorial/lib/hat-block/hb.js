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
   window.hb.play(n) plays beat n (1..6), resolves when it finishes
   window.hb.probe() pixel samples, so the recorder can PROVE the canvas is not a
                     black rectangle before it trusts the take (DFM 146b) */
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

  /* ---------- the events ---------- */
  function makeOrb(colour, glyph) {
    var g = new THREE.Group();
    var core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14),
      new THREE.MeshBasicMaterial({ color: colour }));
    g.add(core);
    var ha = glow('rgba(255,255,255,0.5)', 2.1);
    g.add(ha);
    var t = label(glyph, { colour: '#0B1730', h: 0.3, fs: 110 });
    t.position.set(0, 0, 0.32);
    g.add(t);
    g.visible = false;
    scene.add(g);
    g.userData = { halo: ha };
    return g;
  }
  var orbFlag = makeOrb(0x4CBB59, '⚑');
  var orbLeft = makeOrb(0x4C97FF, '←');
  var orbRight = makeOrb(0x4C97FF, '→');
  var orbSpace = makeOrb(0xB48CFF, '␣');

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

  /* an orb flying an arc from a to b; lands = it drops INTO the hat */
  function flyOrb(t, orb, from, to, at, dur, arc) {
    t.call(function () { orb.visible = true; orb.position.set(from[0], from[1], from[2]); }, null, at);
    t.to(orb.position, { x: to[0], duration: dur, ease: 'none' }, at);
    t.to(orb.position, { y: from[1] + (arc || 1.2), duration: dur / 2, ease: 'sine.out' }, at);
    t.to(orb.position, { y: to[1], duration: dur / 2, ease: 'sine.in' }, at + dur / 2);
    t.to(orb.position, { z: to[2], duration: dur, ease: 'none' }, at);
  }
  function hideOrb(t, orb, at) {
    t.to(orb.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3 }, at);
    t.call(function () { orb.visible = false; orb.scale.setScalar(1); }, null, at + 0.32);
  }

  var beats = {
    /* 1 — three stacks, nothing moving. The stillness IS the point. */
    1: function () {
      var t = tl();
      [stackA, stackB, stackC].forEach(function (s, i) {
        s.scale.setScalar(0.01);
        t.to(s.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.3)' }, 0.15 + i * 0.22);
      });
      t.to(gapMark.material, { opacity: 0.75, duration: 0.6 }, 1.5);
      t.to({}, { duration: 2.2 });
      return t;
    },

    /* 2 — events exist, and they keep happening */
    2: function () {
      var t = tl();
      flyOrb(t, orbFlag, [-12, 5.2, 1.5], [12, 5.2, 1.5], 0.0, 2.4, 0.8);
      flyOrb(t, orbLeft, [-12, 6.0, 0.5], [12, 6.0, 0.5], 0.7, 2.4, 0.8);
      flyOrb(t, orbSpace, [-12, 4.6, 2.0], [12, 4.6, 2.0], 1.4, 2.4, 0.8);
      hideOrb(t, orbFlag, 2.4);
      hideOrb(t, orbLeft, 3.1);
      hideOrb(t, orbSpace, 3.8);
      t.to({}, { duration: 4.4 });
      return t;
    },

    /* 3 — a hat CATCHES its event, and everything under it runs */
    3: function () {
      var t = tl();
      t.to(camera.position, { x: -1.7, duration: 1.0, ease: 'sine.inOut',
        onUpdate: function () { camera.lookAt(-1.9, 0.85, 0); } }, 0);
      flyOrb(t, orbFlag, [-12, 5.6, 1.6], [-4.15, 2.34, 0.0], 0.5, 1.5, 0.7);
      t.to(orbFlag.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.28 }, 1.95);
      t.call(function () { orbFlag.visible = false; orbFlag.scale.setScalar(1); }, null, 2.25);
      t.to(stackA.userData.hat.userData.mat, { emissiveIntensity: 1.0, duration: 0.2 }, 1.95);
      runStack(t, stackA, 2.2);
      t.to({}, { duration: 4.6 });
      return t;
    },

    /* 4 — a different hat, a different event */
    4: function () {
      var t = tl();
      t.to(camera.position, { x: 0, duration: 1.0, ease: 'sine.inOut',
        onUpdate: function () { camera.lookAt(0, 0.85, 0); } }, 0);
      flyOrb(t, orbLeft, [-12, 5.9, 1.4], [0, 2.34, 0.0], 0.5, 1.5, 0.7);
      t.to(orbLeft.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.28 }, 1.95);
      t.call(function () { orbLeft.visible = false; orbLeft.scale.setScalar(1); }, null, 2.25);
      t.to(stackB.userData.hat.userData.mat, { emissiveIntensity: 1.0, duration: 0.2 }, 1.95);
      runStack(t, stackB, 2.2);
      t.to({}, { duration: 4.4 });
      return t;
    },

    /* 5 — the bare stack: events fly straight past it, twice */
    5: function () {
      var t = tl();
      t.to(camera.position, { x: 1.7, duration: 1.0, ease: 'sine.inOut',
        onUpdate: function () { camera.lookAt(1.9, 0.85, 0); } }, 0);
      /* aimed AT it, and nothing catches them */
      flyOrb(t, orbRight, [-9, 5.4, 1.6], [13, 3.2, 1.6], 0.6, 2.0, 0.5);
      flyOrb(t, orbSpace, [-9, 4.4, 2.2], [13, 2.6, 2.2], 1.5, 2.0, 0.5);
      t.to(gapMark.scale, { x: 1.5, y: 1.5, duration: 0.3 }, 1.9);
      t.to(gapMark.scale, { x: 1, y: 1, duration: 0.7, ease: 'elastic.out(1,0.4)' }, 2.2);
      /* it does not even flicker: the dead stack's emissive never moves */
      hideOrb(t, orbRight, 2.7);
      hideOrb(t, orbSpace, 3.6);
      t.to({}, { duration: 4.6 });
      return t;
    },

    /* 6 — the fix: give the stack its trigger, and it wakes */
    6: function () {
      var t = tl();
      t.to(camera.position, { x: 0.9, duration: 1.2, ease: 'sine.inOut',
        onUpdate: function () { camera.lookAt(1.0, 0.85, 0); } }, 0);
      t.call(function () { looseHat.visible = true; }, null, 0);
      t.to(gapMark.material, { opacity: 0, duration: 0.4 }, 0.2);
      t.fromTo(looseHat.position, { y: 8.4 }, { y: 1.9, duration: 1.1, ease: 'power3.in' }, 0.4);
      /* the snap: a squash, a flash, and the stack is whole */
      t.to(looseHat.scale, { x: 1.09, y: 0.9, duration: 0.1 }, 1.5);
      t.to(looseHat.scale, { x: 1, y: 1, duration: 0.45, ease: 'elastic.out(1,0.4)' }, 1.6);
      t.to(looseHat.userData.mat, { emissiveIntensity: 1.0, duration: 0.14 }, 1.5);
      t.to(looseHat.userData.mat, { emissiveIntensity: 0.16, duration: 0.5 }, 1.66);
      wakeColours(t, stackC, 1.6);
      flyOrb(t, orbRight, [-10, 5.4, 1.6], [4.15, 2.34, 0.0], 2.3, 1.3, 0.6);
      t.to(orbRight.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.26 }, 3.55);
      t.call(function () { orbRight.visible = false; orbRight.scale.setScalar(1); }, null, 3.85);
      /* the loose hat runs with the stack it just joined */
      t.to(looseHat.userData.mat, { emissiveIntensity: 0.9, duration: 0.22 }, 3.8);
      t.to(looseHat.userData.mat, { emissiveIntensity: 0.16, duration: 0.5 }, 4.04);
      runStack(t, stackC, 4.06);
      t.to({}, { duration: 5.0 });
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
