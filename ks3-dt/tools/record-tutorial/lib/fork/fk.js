/* fk.js — THE FORK: a program that CHOOSES which lines to run (j2-04, spec §C5 ch2).

   THE ONE NEW IDEA OF THE HOUR, and the picture it has to carry: a program is
   lines on a page and it runs down them — but a fork line is a SIGNPOST. It
   asks whether the word in the box (a variable) is the same as the word on the
   sign. If it is, the lamp lights TRUE and the road pushed in under that sign
   runs. If not, the lamp is FALSE and Python walks on to the next sign. `elif`
   is a second signpost, only ever looked at when the first stayed dark. `else`
   is the road with no sign at all: it is for everything else.

   EVERY ACTOR IS A THING A TWELVE-YEAR-OLD CAN NAME ON SIGHT — a slab of
   program, a glass box with a name on it, a signpost with a lamp, a road —
   and each beat does ONE thing (DFM 192e, 207d). The glass box is the same
   object the Lesson 2 and Lesson 3 films used, on purpose: the word going in
   is the pupil's own typed answer, exactly as in Lesson 3.

   THE LOWER THIRD BELONGS TO THE CAPTION, as on every stage: the program is
   seven lines tall, so the set runs from the very top of the frame down to
   the caption band and no further — everything readable stays ABOVE screen
   y ≈ 520px, and the film law (stage-subjects.js) measures that on every
   caption, so a stray label fails the render rather than shipping.

   RECORDING CONSTRAINTS (inherited from lib/input-halt/ih.js — read its header):
   head-less through Playwright on a software renderer, no shadow maps, glows
   are emissive + a sprite, nothing animates itself, no Math.random.

   window.fk.ready         resolves once the first frame has been drawn
   window.fk.play(n)       plays beat n (1..7), resolves when it finishes
   window.fk.probe()       pixel samples, so the recorder can PROVE the canvas
                           is not a navy rectangle before it trusts the take
   window.fk.probeTokens() every visible actor's real projected height in screen
                           pixels; the scene asserts the named one is >= 110px at
                           each naming pause (DFM 207d, measured — 146b). */
(function () {
  var W = 1280, H = 720;
  var NAVY = 0x060D1F, GOLD = 0xE4B824, GOLD_HI = 0xFFD84D;
  var TRUE_GREEN = 0x5FE08A, FALSE_RED = 0xE85C4A, LAMP_OFF = 0x2A3452;

  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.Fog(NAVY, 18, 42);

  var camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
  camera.position.set(0, 0, 12.2);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x8fa6d8, 0.6));
  var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 8, 7); scene.add(key);
  var warm = new THREE.PointLight(GOLD, 0.7, 26); warm.position.set(-5, 2, 5); scene.add(warm);

  /* ---------- helpers (the label/glow/box idiom the approved stages use) --- */
  function label(text, opts) {
    opts = opts || {};
    var pad = 24, fs = opts.fs || 96, weight = opts.weight || '700';
    var font = opts.mono
      ? weight + ' ' + fs + 'px Consolas, "Courier New", monospace'
      : weight + ' ' + fs + 'px "Helvetica Neue", Arial, sans-serif';
    var c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = font;
    var w = Math.ceil(g.measureText(text).width) + pad * 2;
    c.width = Math.max(8, w); c.height = fs + pad * 2;
    g = c.getContext('2d');
    if (opts.plate) {
      g.fillStyle = opts.plate;
      g.strokeStyle = opts.plateEdge || '#A8830F';
      g.lineWidth = 6;
      var r = 22;
      g.beginPath();
      g.moveTo(r, 3); g.lineTo(c.width - r, 3); g.quadraticCurveTo(c.width - 3, 3, c.width - 3, r);
      g.lineTo(c.width - 3, c.height - r); g.quadraticCurveTo(c.width - 3, c.height - 3, c.width - r, c.height - 3);
      g.lineTo(r, c.height - 3); g.quadraticCurveTo(3, c.height - 3, 3, c.height - r);
      g.lineTo(3, r); g.quadraticCurveTo(3, 3, r, 3); g.closePath();
      g.fill(); g.stroke();
    }
    g.font = font;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = opts.colour || '#231A02';
    g.fillText(text, c.width / 2, c.height / 2 + 2);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    var h = opts.h || 0.6;
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry((c.width / c.height) * h, h), mat);
    mesh.userData.aspect = c.width / c.height;
    mesh.userData.h = h;
    /* the film law's eye: every label is a SUBJECT a caption must not cover,
       tagged in the one factory all stage text is born from (stage-subjects.js) */
    mesh.userData.subjectText = text;
    return mesh;
  }
  function glow(colour, size) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, colour); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.9
    }));
    sp.scale.set(size, size, 1);
    return sp;
  }

  /* a line of the program is a physical slab; a pushed-in line sits to the
     right of the others by exactly its indent, so "pushed in" is a thing seen */
  function makeLine(text, w, fs, indent) {
    var g = new THREE.Group();
    var slabMat = new THREE.MeshStandardMaterial({ color: 0x102040, roughness: 0.55, metalness: 0.12 });
    var slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.74, 0.24), slabMat);
    g.add(slab);
    var edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.74, 0.24)),
      new THREE.LineBasicMaterial({ color: 0x22355F }));
    g.add(edge);
    var t = label(text, { colour: indent ? '#FFE9A8' : '#BFD8FF', h: 0.36, fs: fs || 84, mono: true });
    t.position.set(0, 0, 0.14);
    t.renderOrder = 2;
    g.add(t);
    var lit = glow('rgba(228,184,36,0.55)', 1);
    lit.scale.set(w * 1.05, 1.5, 1);   /* a flat glow behind the slab, not a ball of light under the caption */
    lit.position.set(0, 0, -0.3);
    lit.material.opacity = 0;
    g.add(lit);
    g.userData = { slab: slab, slabMat: slabMat, text: t, lit: lit, edge: edge, w: w };
    return g;
  }
  function litOn(line, on, colour) {
    var c = colour || GOLD;
    gsap.to(line.userData.slabMat.color, { duration: 0.35, r: on ? 0.13 : 0.06, g: on ? 0.20 : 0.13, b: on ? 0.38 : 0.25 });
    gsap.to(line.userData.lit.material, { duration: 0.35, opacity: on ? 0.85 : 0 });
    line.userData.edge.material.color.setHex(on ? c : 0x22355F);
  }

  /* THE GLASS BOX WITH A NAME ON IT — the same object Lesson 2's and Lesson 3's
     films used (one idea, one image) */
  function makeBox(size) {
    var g = new THREE.Group();
    var s = size || 2.1, h = s * 0.78;
    var glass = new THREE.MeshStandardMaterial({
      color: 0x1B3566, transparent: true, opacity: 0.38, roughness: 0.25, metalness: 0.1, depthWrite: false
    });
    var body = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), glass);
    body.position.y = h / 2; body.renderOrder = 1;
    g.add(body);
    var edgeMat = new THREE.MeshBasicMaterial({ color: GOLD });
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s, h, s)),
      new THREE.LineBasicMaterial({ color: GOLD }));
    edges.position.y = h / 2;
    g.add(edges);
    var post = new THREE.CylinderGeometry(0.033, 0.033, h, 8);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (p) {
      var m = new THREE.Mesh(post, edgeMat);
      m.position.set(p[0] * s / 2, h / 2, p[1] * s / 2);
      g.add(m);
    });
    g.userData = { size: s, height: h, body: body };
    return g;
  }

  /* A SIGNPOST: a post, a plate with the word on it, and a lamp on top that
     lights TRUE (green) or FALSE (red). Off, the lamp is a dull grey ball. */
  function makeSign(word) {
    /* the sign stands at its road's own end: a post as tall as the road, the
       lamp on top, the word on a plate hung on the post, and TRUE / FALSE
       written beside the lamp when it lights. One sign per row, so three rows
       stack without one sign's words landing on another's. */
    var g = new THREE.Group();
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 10),
      new THREE.MeshStandardMaterial({ color: 0x5B6B8C, roughness: 0.6, metalness: 0.25 }));
    post.position.set(0, -0.25, 0);
    g.add(post);
    var lampMat = new THREE.MeshStandardMaterial({ color: LAMP_OFF, roughness: 0.4, metalness: 0.1, emissive: 0x000000 });
    var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), lampMat);
    lamp.position.set(0, 0.34, 0);
    g.add(lamp);
    var halo = glow('rgba(95,224,138,0.75)', 2.4);
    halo.position.set(0, 0.34, -0.25);
    halo.material.opacity = 0;
    g.add(halo);
    var plate = label('"' + word + '"', { plate: '#E4B824', plateEdge: '#A8830F', colour: '#231A02', h: 0.46, fs: 96, mono: true });
    plate.position.set(0, -0.36, 0.14);
    plate.renderOrder = 3;
    g.add(plate);
    var verdict = label('TRUE', { colour: '#5FE08A', h: 0.46, fs: 96 });
    verdict.position.set(1.12, 0.36, 0.1);
    verdict.visible = false;
    g.add(verdict);
    g.userData = { post: post, plate: plate, lamp: lamp, lampMat: lampMat, halo: halo, verdict: verdict, word: word };
    return g;
  }
  function lampSet(sign, state) {
    /* 'true' | 'false' | 'off' */
    var u = sign.userData;
    var hex = state === 'true' ? TRUE_GREEN : state === 'false' ? FALSE_RED : LAMP_OFF;
    gsap.to(u.lampMat.color, { duration: 0.3, r: ((hex >> 16) & 255) / 255, g: ((hex >> 8) & 255) / 255, b: (hex & 255) / 255 });
    u.lampMat.emissive.setHex(state === 'off' ? 0x000000 : hex);
    u.lampMat.emissiveIntensity = 0.55;
    u.halo.material.map = glow(state === 'true' ? 'rgba(95,224,138,0.75)' : 'rgba(232,92,74,0.7)', 2.2).material.map;
    gsap.to(u.halo.material, { duration: 0.3, opacity: state === 'off' ? 0 : 0.95 });
    if (state === 'off') { u.verdict.visible = false; return; }
    /* the word TRUE / FALSE is its own label (a subject), swapped by texture */
    var v = label(state === 'true' ? 'TRUE' : 'FALSE', { colour: state === 'true' ? '#5FE08A' : '#FF8E80', h: 0.46, fs: 96 });
    v.position.copy(u.verdict.position);
    sign.remove(u.verdict);
    u.verdict = v;
    sign.add(v);
    v.visible = true;
  }

  /* A ROAD: a flat strip with the line it runs written along it. Dark until it
     is the road that runs; then it glows gold. */
  function makeRoad(text, w) {
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: 0x0E1B36, roughness: 0.85, metalness: 0.05 });
    var strip = new THREE.Mesh(new THREE.BoxGeometry(w, ROAD_H, 0.16), mat);
    g.add(strip);
    var edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, ROAD_H, 0.16)),
      new THREE.LineBasicMaterial({ color: 0x22355F }));
    g.add(edge);
    var t = label(text, { colour: '#6E819F', h: 0.42, fs: 84, mono: true });
    t.position.set(0, 0, 0.1);
    t.renderOrder = 2;
    g.add(t);
    var lit = glow('rgba(228,184,36,0.5)', 1);
    lit.scale.set(w * 1.1, ROAD_H * 1.7, 1);
    lit.position.set(0, 0, -0.3);
    lit.material.opacity = 0;
    g.add(lit);
    g.userData = { strip: strip, mat: mat, text: t, lit: lit, edge: edge, w: w, textStr: text };
    return g;
  }
  function roadOn(road, on) {
    var u = road.userData;
    gsap.to(u.mat.color, { duration: 0.4, r: on ? 0.18 : 0.055, g: on ? 0.22 : 0.105, b: on ? 0.36 : 0.21 });
    gsap.to(u.lit.material, { duration: 0.4, opacity: on ? 0.9 : 0 });
    u.edge.material.color.setHex(on ? GOLD_HI : 0x22355F);
    /* the road's own words brighten as it runs: read, not just lit */
    var t = label(u.textStr, { colour: on ? '#FFE9A8' : '#6E819F', h: 0.42, fs: 84, mono: true });
    t.position.copy(u.text.position); t.renderOrder = 2;
    road.remove(u.text); u.text = t; road.add(t);
  }

  /* ---------- the set: three columns, read left to right ----------
     the PROGRAM (seven slabs) · the BOX the typed word lands in · three ROWS,
     each a signpost and the road it guards (the else road has no sign).
     Everything sits above the caption band; the camera is straight on. */
  var PROG_X = -4.05, LINE_W = 4.9, STEP = 0.84, TOP_Y = 3.9;
  var ROAD_H = 1.5;
  var SRC = [
    ['choice = input("Left or right?")', 0],
    ['if choice == "left":', 0],
    ['    print("You go left.")', 1],
    ['elif choice == "right":', 0],
    ['    print("You go right.")', 1],
    ['else:', 0],
    ['    print("You stand still.")', 1]
  ];
  var lines = SRC.map(function (s, i) {
    var l = makeLine(s[0], LINE_W, 78, s[1]);
    l.position.set(PROG_X + (s[1] ? 0.35 : 0), TOP_Y - i * STEP, 0);
    l.scale.setScalar(0.01);
    l.visible = false;
    scene.add(l);
    return l;
  });
  var program = new THREE.Group();
  scene.add(program);

  var BOX_X = 0.05, BOX_Y = 1.15;
  var box = makeBox(1.8);
  box.position.set(BOX_X, BOX_Y, 0);
  box.scale.setScalar(0.01);
  box.visible = false;
  scene.add(box);
  var namePlate = label('choice', { plate: '#E4B824', colour: '#231A02', h: 0.46, fs: 96, mono: true });
  namePlate.renderOrder = 3;
  namePlate.position.set(BOX_X, BOX_Y - 0.2, 0.95);
  namePlate.visible = false;
  scene.add(namePlate);
  var boxGlow = glow('rgba(228,184,36,0.5)', 3.6);
  boxGlow.position.set(BOX_X, BOX_Y + 0.7, -1.4);
  boxGlow.material.opacity = 0;
  scene.add(boxGlow);

  var SIGN_X = 1.85, ROAD_W = 3.5, ROAD_X = SIGN_X + 0.95 + ROAD_W / 2;
  var roads = [
    makeRoad('You go left.', ROAD_W),
    makeRoad('You go right.', ROAD_W),
    makeRoad('You stand still.', ROAD_W)
  ];
  var ROAD_Y = [3.08, 1.23, -0.62];
  roads.forEach(function (r, i) {
    r.position.set(ROAD_X, ROAD_Y[i], 0);
    r.scale.setScalar(0.01);
    r.visible = false;
    scene.add(r);
  });
  var signs = [makeSign('left'), makeSign('right')];
  signs.forEach(function (s, i) {
    s.position.set(SIGN_X, ROAD_Y[i], 0.2);
    s.scale.setScalar(0.01);
    s.visible = false;
    scene.add(s);
  });
  /* the else road has NO sign: where a signpost would stand, the words say so */
  var elseTag = label('no sign', { colour: '#93A4C4', h: 0.36, fs: 80 });
  elseTag.position.set(SIGN_X, ROAD_Y[2] + 0.28, 0.1);
  elseTag.visible = false;
  scene.add(elseTag);
  var elseTag2 = label('everything else', { colour: '#93A4C4', h: 0.31, fs: 72 });
  elseTag2.position.set(SIGN_X, ROAD_Y[2] - 0.2, 0.1);
  elseTag2.visible = false;
  scene.add(elseTag2);

  /* the typed words, born hidden (a GSAP timeline needs its actors at build time) */
  function typedWord(text) {
    var t = label(text, { plate: '#FFD84D', plateEdge: '#A8830F', colour: '#231A02', h: 0.62, fs: 110, mono: true });
    t.position.set(BOX_X, BOX_Y + 3.0, 1.2);
    t.scale.setScalar(0.01);
    t.renderOrder = 4;
    t.visible = false;
    scene.add(t);
    return t;
  }
  var words = { left: typedWord('left'), right: typedWord('right'), banana: typedWord('banana') };
  var inBox = null;   /* the word currently sitting in the box */

  /* ---------- beats ---------- */
  function rise(obj, to, dur) {
    obj.visible = true;
    return gsap.to(obj.scale, { duration: dur || 0.55, x: to, y: to, z: to, ease: 'back.out(1.5)' });
  }
  function tl() { return gsap.timeline(); }
  function done(t) { return new Promise(function (res) { t.eventCallback('onComplete', function () { res(true); }); }); }
  function dropIn(t, word) {
    /* a typed word appears above the box, then goes INTO it; any word already
       there is pushed out and gone (a box holds one thing) */
    t.call(function () {
      if (inBox) { inBox.visible = false; inBox.scale.setScalar(0.01); inBox.position.set(BOX_X, BOX_Y + 3.0, 1.2); }
      inBox = word;
      word.position.set(BOX_X, BOX_Y + 3.0, 1.2);
      word.visible = true;
    });
    t.add(rise(word, 1, 0.45));
    t.to({}, { duration: 0.35 });
    t.to(word.position, { duration: 0.6, x: BOX_X, y: BOX_Y + 0.8, z: 0.0, ease: 'power2.in' });
    t.to(word.scale, { duration: 0.6, x: 0.8, y: 0.8, z: 0.8, ease: 'power2.in' }, '<');
    t.to(boxGlow.material, { duration: 0.4, opacity: 0.85 }, '<0.3');
  }
  function allDark(t) {
    t.call(function () {
      lines.forEach(function (l) { litOn(l, false); });
      roads.forEach(function (r) { roadOn(r, false); });
      signs.forEach(function (s) { lampSet(s, 'off'); });
    });
  }

  var beats = {
    /* 1 — the program appears: seven lines, three of them a fork */
    1: function () {
      var t = tl();
      lines.forEach(function (l, i) { t.add(rise(l, 1, 0.45), i * 0.16); });
      t.to({}, { duration: 0.6 });
      /* the three signpost lines stay lit at the end of the beat: the still a
         reader sees under "the fork is the line that starts with if" shows it */
      t.call(function () { [1, 3, 5].forEach(function (i) { litOn(lines[i], true); }); });
      t.to({}, { duration: 1.2 });
      return done(t);
    },
    /* 2 — the player types a word, and it goes into the box called choice */
    2: function () {
      var t = tl();
      t.call(function () { [1, 3, 5].forEach(function (i) { litOn(lines[i], false); }); litOn(lines[0], true); box.visible = true; namePlate.visible = true; namePlate.scale.setScalar(0.01); });
      t.add(rise(box, 1, 0.55));
      t.add(rise(namePlate, 1, 0.45), '<0.15');
      dropIn(t, words.left);
      t.to({}, { duration: 0.5 });
      t.call(function () { litOn(lines[0], false); });
      return done(t);
    },
    /* 3 — the signposts and the roads appear; the if signpost lights TRUE and
           its road runs */
    3: function () {
      var t = tl();
      t.call(function () { litOn(lines[1], true); });
      roads.forEach(function (r, i) { t.add(rise(r, 1, 0.45), 0.2 + i * 0.15); });
      signs.forEach(function (s, i) { t.add(rise(s, 1, 0.45), 0.35 + i * 0.15); });
      t.call(function () { elseTag.visible = true; elseTag2.visible = true; }, null, 0.7);
      t.to({}, { duration: 0.7 });
      t.call(function () { lampSet(signs[0], 'true'); });
      t.to({}, { duration: 0.6 });
      t.call(function () { litOn(lines[2], true); roadOn(roads[0], true); });
      t.to({}, { duration: 0.8 });
      return done(t);
    },
    /* 4 — the other roads stay dark: once a road has run, the rest of the fork
           is skipped */
    4: function () {
      var t = tl();
      t.call(function () { litOn(lines[1], false); litOn(lines[2], false); });
      t.to({}, { duration: 0.4 });
      /* a pass-over: the skipped lines flicker grey once, never gold */
      [3, 4, 5, 6].forEach(function (i, n) {
        t.to(lines[i].userData.slabMat.color, { duration: 0.18, r: 0.16, g: 0.19, b: 0.28, yoyo: true, repeat: 1 }, 0.5 + n * 0.22);
      });
      t.to({}, { duration: 0.8 });
      return done(t);
    },
    /* 5 — a different word: the if signpost is FALSE, the elif signpost is
           TRUE, and ITS road runs instead */
    5: function () {
      var t = tl();
      allDark(t);
      t.to({}, { duration: 0.3 });
      t.call(function () { litOn(lines[0], true); });
      dropIn(t, words.right);
      t.call(function () { litOn(lines[0], false); litOn(lines[1], true); });
      t.to({}, { duration: 0.5 });
      t.call(function () { lampSet(signs[0], 'false'); });
      t.to({}, { duration: 0.7 });
      t.call(function () { litOn(lines[1], false); litOn(lines[3], true); });
      t.to({}, { duration: 0.5 });
      t.call(function () { lampSet(signs[1], 'true'); });
      t.to({}, { duration: 0.6 });
      t.call(function () { litOn(lines[4], true); roadOn(roads[1], true); });
      t.to({}, { duration: 0.8 });
      return done(t);
    },
    /* 6 — a word nobody planned for: both signposts FALSE, and the road with no
           sign runs */
    6: function () {
      var t = tl();
      allDark(t);
      t.to({}, { duration: 0.3 });
      t.call(function () { litOn(lines[0], true); });
      dropIn(t, words.banana);
      t.call(function () { litOn(lines[0], false); litOn(lines[1], true); });
      t.to({}, { duration: 0.45 });
      t.call(function () { lampSet(signs[0], 'false'); });
      t.to({}, { duration: 0.6 });
      t.call(function () { litOn(lines[1], false); litOn(lines[3], true); });
      t.to({}, { duration: 0.45 });
      t.call(function () { lampSet(signs[1], 'false'); });
      t.to({}, { duration: 0.6 });
      t.call(function () { litOn(lines[3], false); litOn(lines[5], true); });
      t.to({}, { duration: 0.5 });
      t.call(function () { litOn(lines[6], true); roadOn(roads[2], true); });
      t.to({}, { duration: 0.8 });
      return done(t);
    },
    /* 7 — the same program, three words, three roads: the recap */
    7: function () {
      var t = tl();
      allDark(t);
      t.to({}, { duration: 0.3 });
      var seq = [[words.left, 0, 'true', null], [words.right, 1, 'false', 'true'], [words.banana, 2, 'false', 'false']];
      seq.forEach(function (s, n) {
        t.call(function () {
          if (inBox) { inBox.visible = false; }
          inBox = s[0]; inBox.visible = true; inBox.scale.setScalar(0.8); inBox.position.set(BOX_X, BOX_Y + 0.8, 0);
          lampSet(signs[0], s[2]); if (s[3]) lampSet(signs[1], s[3]); else lampSet(signs[1], 'off');
          roads.forEach(function (r, i) { roadOn(r, i === s[1]); });
          lines.forEach(function (l, i) { litOn(l, i === [2, 4, 6][s[1]] || i === [1, 3, 5][s[1]]); });
        }, null, 0.2 + n * 1.5);
      });
      t.to({}, { duration: 0.2 + 3 * 1.5 + 0.9 });
      return done(t);
    }
  };

  /* ---------- render loop + the API record.js drives ---------- */
  var drawn = false;
  window.__installStageSubjects(THREE, scene, camera, renderer);
  function tick() { renderer.render(scene, camera); drawn = true; requestAnimationFrame(tick); }
  tick();

  function screenHeight(obj) {
    var b = new THREE.Box3().setFromObject(obj);
    if (!isFinite(b.min.y) || !isFinite(b.max.y)) return 0;
    var mid = b.getCenter(new THREE.Vector3());
    var top = new THREE.Vector3(mid.x, b.max.y, mid.z).project(camera);
    var bot = new THREE.Vector3(mid.x, b.min.y, mid.z).project(camera);
    return Math.abs(top.y - bot.y) * (H / 2);
  }
  function groupHeight(objs) {
    /* the SLABS, never the glow sprites around them: a halo is not the actor,
       and letting it inflate the number would be the gate flattering itself */
    var b = new THREE.Box3();
    objs.forEach(function (o) { if (o.visible) b.union(new THREE.Box3().setFromObject(o.userData && o.userData.slab ? o.userData.slab : o)); });
    if (b.isEmpty()) return 0;
    var mid = b.getCenter(new THREE.Vector3());
    var top = new THREE.Vector3(mid.x, b.max.y, mid.z).project(camera);
    var bot = new THREE.Vector3(mid.x, b.min.y, mid.z).project(camera);
    return Math.abs(top.y - bot.y) * (H / 2);
  }

  window.fk = {
    ready: new Promise(function (res) {
      var iv = setInterval(function () { if (drawn) { clearInterval(iv); res(true); } }, 30);
    }),
    play: function (n) { return beats[n] ? beats[n]() : Promise.resolve(false); },
    probe: function () {
      var g = renderer.getContext();
      /* sample points on a real frame: three on the program, one on the box,
         one on a road, one on a signpost */
      var pts = [[300, 40], [300, 250], [300, 470], [645, 230], [1010, 110], [790, 110]];
      var out = [];
      pts.forEach(function (p) {
        var one = new Uint8Array(4);
        g.readPixels(p[0], H - p[1], 1, 1, g.RGBA, g.UNSIGNED_BYTE, one);
        out.push([one[0], one[1], one[2]]);
      });
      return { samples: out, nonNavy: out.filter(function (c) { return c[0] + c[1] + c[2] > 90; }).length };
    },
    probeTokens: function () {
      var out = {};
      var named = {
        program: null, fork: null, box: box.userData.body, namePlate: namePlate,
        sign1: null, sign2: null, road1: roads[0].userData.strip, road2: roads[1].userData.strip, road3: roads[2].userData.strip,
        road1pair: null, road2pair: null, road3pair: null
      };
      /* a sign is its lamp, its post and its plate together — the thing the
         caption names — never its halo */
      signs.forEach(function (sg, i) {
        if (!sg.visible) return;
        out['sign' + (i + 1)] = Math.round(groupHeight([sg.userData.lamp, sg.userData.post, sg.userData.plate, sg.userData.verdict]));
        out['row' + (i + 1)] = Math.round(groupHeight([sg.userData.lamp, sg.userData.post, sg.userData.plate, sg.userData.verdict, roads[i].userData.strip]));
      });
      if (roads[2].visible) out.row3 = Math.round(groupHeight([roads[2].userData.strip, elseTag, elseTag2]));
      if (roads[0].visible) out.roads = Math.round(groupHeight(roads.map(function (r) { return r.userData.strip; })));
      if (lines[0].visible) out.program = Math.round(groupHeight(lines));
      if (lines[1].visible) out.fork = Math.round(groupHeight([lines[1], lines[2], lines[3], lines[4], lines[5], lines[6]]));
      if (lines[1].visible) out.road1pair = Math.round(groupHeight([lines[1], lines[2]]));
      if (lines[3].visible) out.road2pair = Math.round(groupHeight([lines[3], lines[4]]));
      if (lines[5].visible) out.road3pair = Math.round(groupHeight([lines[5], lines[6]]));
      Object.keys(named).forEach(function (k) {
        var o = named[k];
        if (!o || !o.visible) return;
        out[k] = Math.round(screenHeight(o));
      });
      if (inBox && inBox.visible) out.word = Math.round(screenHeight(inBox));
      return out;
    }
  };
})();
