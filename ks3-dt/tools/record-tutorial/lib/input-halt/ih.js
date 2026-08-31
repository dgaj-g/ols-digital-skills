/* ih.js — WHAT input( ) DOES TO A RUNNING PROGRAM (spec §D5, K35(6)).

   HIS RULING, 26 Aug 2026: "absolutely build both animations to the highest of
   standards." K17's warning stands beside it — "get it right the first time" —
   and two animations have been rejected before this one, both for the same
   reason: actors too small to make out and too many ideas in one beat (DFM 192e,
   207d). So every actor here is a THING a twelve-year-old can name on sight —
   a slab of program, a glass box with a label on it, a keyboard, a console —
   nothing is a symbol standing in for something else, and each beat does ONE
   thing.

   THE IDEA IT HAS TO CARRY, and it is the only new idea in the hour: a program
   runs down the page, and at input( ) it STOPS DEAD until a person types. Not
   pauses, not waits in the background — stops. Then what was typed goes into a
   box with a name on it, and the program wakes up and carries on using it.

   The glass box is deliberately the SAME object as the variable animation J2
   met in Lesson 2 (lib/variable-box). A pupil should recognise it, because it
   is the same idea: this time the thing going into it comes from a person
   rather than from the program.

   RECORDING CONSTRAINTS (inherited from lib/variable-box/vb.js — read its
   header): filmed head-less through Playwright on a software renderer, so no
   shadow maps, no post-processing, modest geometry, glows are emissive + a
   sprite. Nothing animates itself: record.js calls window.ih.play(n) beat by
   beat, so captions and picture stay in step and a re-record is reproducible.
   No Math.random anywhere.

   window.ih.ready       resolves once the first frame has been drawn
   window.ih.play(n)     plays beat n (1..6), resolves when it finishes
   window.ih.probe()     pixel samples, so the recorder can PROVE the canvas is
                         not a black rectangle before it trusts the take
   window.ih.probeTokens() projects every VISIBLE actor's height to screen
                         pixels; record.js asserts >= 110px at every naming
                         pause and throws otherwise (DFM 207d, measured in real
                         pixels rather than judged by eye — DFM 146b). */
(function () {
  var W = 1280, H = 720;
  var NAVY = 0x060D1F, GOLD = 0xE4B824, GOLD_HI = 0xFFD84D;
  var CODE = 0xBFD8FF, OKGREEN = 0x8BE58B;

  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.Fog(NAVY, 18, 42);

  var camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
  camera.position.set(0, 1.2, 11.6);
  camera.lookAt(0, 0.1, 0);

  scene.add(new THREE.AmbientLight(0x8fa6d8, 0.6));
  var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 8, 7); scene.add(key);
  var warm = new THREE.PointLight(GOLD, 0.8, 26); warm.position.set(-5, 3, 5); scene.add(warm);

  /* ---------- helpers (the label/glow/box idiom the approved animations use) */
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
    /* the film law's eye: every label is a SUBJECT a caption must not cover.
       Tagged here, in the one factory all stage text is born from, so no
       scene and no beat can forget one (stage-subjects.js has the story). */
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

  /* A LINE OF THE PROGRAM IS A PHYSICAL SLAB, not a row of text floating in
     space. It has thickness, it catches the light, and when it runs it lights
     up gold — so "which line is running" is something a pupil SEES rather than
     something a caption asserts. */
  function makeLine(text, w, fs) {
    var g = new THREE.Group();
    var slabMat = new THREE.MeshStandardMaterial({ color: 0x102040, roughness: 0.55, metalness: 0.12 });
    var slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.98, 0.26), slabMat);
    g.add(slab);
    var edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.98, 0.26)),
      new THREE.LineBasicMaterial({ color: 0x22355F }));
    g.add(edge);
    var t = label(text, { colour: '#BFD8FF', h: 0.44, fs: fs || 92, mono: true });
    t.position.set(0, 0, 0.15);
    t.renderOrder = 2;
    g.add(t);
    var lit = glow('rgba(228,184,36,0.55)', w * 0.9);
    lit.position.set(0, 0, -0.3);
    lit.material.opacity = 0;
    g.add(lit);
    g.userData = { slab: slab, slabMat: slabMat, text: t, lit: lit, edge: edge, w: w };
    return g;
  }
  function litOn(line, on) {
    gsap.to(line.userData.slabMat.color, { duration: 0.35, r: on ? 0.13 : 0.06, g: on ? 0.20 : 0.13, b: on ? 0.38 : 0.25 });
    gsap.to(line.userData.lit.material, { duration: 0.35, opacity: on ? 0.85 : 0 });
    line.userData.edge.material.color.setHex(on ? GOLD : 0x22355F);
  }

  /* THE GLASS BOX WITH A NAME ON IT — the same object Lesson 2's film used, on
     purpose (DFM 144's spirit applied to a picture: one idea, one image). */
  function makeBox(size) {
    var g = new THREE.Group();
    var s = size || 2.1, h = s * 0.78;
    var glass = new THREE.MeshStandardMaterial({
      color: 0x1B3566, transparent: true, opacity: 0.38, roughness: 0.25, metalness: 0.1,
      depthWrite: false
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
    var lid = new THREE.Group();
    var lidMesh = new THREE.Mesh(new THREE.BoxGeometry(s, 0.09, s),
      new THREE.MeshStandardMaterial({ color: 0x24427A, roughness: 0.3, metalness: 0.2 }));
    lidMesh.position.set(0, 0, s / 2);
    lid.add(lidMesh);
    var lidEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s, 0.09, s)),
      new THREE.LineBasicMaterial({ color: GOLD_HI }));
    lidEdge.position.set(0, 0, s / 2);
    lid.add(lidEdge);
    lid.position.set(0, h, -s / 2);
    g.add(lid);
    g.userData = { size: s, height: h, lid: lid, body: body };
    return g;
  }

  /* A KEYBOARD, because "a person types" needs a person's THING on screen. It is
     a slab with real keys on it; three of them press in beat 3. */
  function makeKeyboard() {
    var g = new THREE.Group();
    var base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, 2.3),
      new THREE.MeshStandardMaterial({ color: 0x1A2540, roughness: 0.7, metalness: 0.08 }));
    g.add(base);
    var keyGeo = new THREE.BoxGeometry(0.42, 0.22, 0.42);
    var keyMat = new THREE.MeshStandardMaterial({ color: 0x2C3D66, roughness: 0.6 });
    var keys = [];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 10; c++) {
        var k = new THREE.Mesh(keyGeo, keyMat.clone());
        k.position.set((c - 4.5) * 0.48, 0.33, (r - 1) * 0.62);
        g.add(k); keys.push(k);
      }
    }
    g.userData = { keys: keys };
    return g;
  }

  /* ---------- the set ---------- */
  var PROG_X = -3.15;
  var lines = [
    makeLine('print("Hello!")', 7.4),
    makeLine('name = input("What is your name?")', 7.4, 74),
    makeLine('print("Hello " + name)', 7.4)
  ];
  lines.forEach(function (l, i) {
    l.position.set(PROG_X, 2.15 - i * 1.28, 0);
    l.scale.setScalar(0.01);
    l.visible = false;
    scene.add(l);
  });

  var box = makeBox(2.6);
  box.position.set(4.6, -1.05, 0);
  box.scale.setScalar(0.01);
  box.visible = false;
  scene.add(box);

  var namePlate = label('name', { plate: '#E4B824', colour: '#231A02', h: 0.56 });
  namePlate.renderOrder = 3;
  namePlate.position.set(4.6, -1.42, 1.36);
  namePlate.visible = false;
  scene.add(namePlate);

  var boxGlow = glow('rgba(228,184,36,0.5)', 6.4);
  boxGlow.position.set(4.6, 0.05, -1.4);
  boxGlow.material.opacity = 0;
  scene.add(boxGlow);

  var kb = makeKeyboard();
  kb.position.set(4.6, -2.62, 0.9);
  kb.visible = false;
  scene.add(kb);

  /* THE TYPED WORD EXISTS FROM THE START, hidden. A GSAP timeline builds all of
     its tweens the moment it is created, so an object made inside a .call()
     later in the same timeline does not exist yet when the tween that moves it
     is being built — the first take threw exactly that. */
  var typed = label('Anya', { plate: '#FFD84D', plateEdge: '#A8830F', colour: '#231A02', h: 0.72, fs: 120 });
  typed.position.set(4.6, -1.75, 2.1);
  typed.scale.setScalar(0.01);
  typed.renderOrder = 4;
  typed.visible = false;
  scene.add(typed);
  /* the copy that travels to the console in beat 6 (see the note there) */
  var copy = label('Anya', { plate: '#FFD84D', plateEdge: '#A8830F', colour: '#231A02', h: 0.72, fs: 120 });
  copy.renderOrder = 4;
  copy.visible = false;
  scene.add(copy);

  var waitRing = null;          /* the held pulse that says STOPPED */
  var waitWord = null;
  var consoleSlab = null, consoleText = null;

  /* the WAITING state gets its own object, because "everything stops" is the
     one thing the whole animation exists to show and a caption alone would be
     an assertion rather than a picture */
  (function () {
    var g = new THREE.Group();
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.075, 12, 44),
      new THREE.MeshBasicMaterial({ color: GOLD_HI, transparent: true, opacity: 0 }));
    g.add(ring);
    var bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.16),
      new THREE.MeshBasicMaterial({ color: GOLD_HI, transparent: true, opacity: 0 }));
    bar1.position.x = -0.26;
    var bar2 = bar1.clone(); bar2.material = bar1.material.clone(); bar2.position.x = 0.26;
    g.add(bar1); g.add(bar2);
    g.position.set(1.62, 2.62, 0.9);
    g.visible = false;
    scene.add(g);
    waitRing = g;
    waitRing.userData = { ring: ring, bars: [bar1, bar2] };
    waitWord = label('WAITING', { colour: '#FFD84D', h: 0.46, fs: 96 });
    waitWord.position.set(1.62, 1.28, 0.9);
    waitWord.visible = false;
    scene.add(waitWord);
  })();

  /* the console: where the program's words really come out */
  (function () {
    var g = new THREE.Group();
    var slab = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.5, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x060D1F, roughness: 0.8 }));
    g.add(slab);
    var edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(7.4, 1.5, 0.24)),
      new THREE.LineBasicMaterial({ color: 0x22355F }));
    g.add(edge);
    var head = label('The console', { colour: '#93A4C4', h: 0.26, fs: 64 });
    head.position.set(-2.6, 0.44, 0.14);
    g.add(head);
    /* THE LOWER THIRD BELONGS TO THE CAPTION (31 Aug 2026). At -2.95 the whole
       console — the thing the DOM-stage film law guards most jealously — sat
       inside the caption band on this canvas stage, and five ch2 captions
       covered its "Hello!" the moment the strengthened law could see it.
       A first lift to -2.38 cleared the two-line captions and left "Hello!"
       under every three-line one. The program above is fixed at three lines
       (its lowest slab bottoms out around -0.7), so the console sits at -1.95:
       its text clears the tallest caption band with margin, and its slab top
       stays half a unit under the program's last line. */
    g.position.set(PROG_X, -1.95, 0);
    g.visible = false;
    scene.add(g);
    consoleSlab = g;
  })();

  function setConsole(text) {
    if (consoleText) { consoleSlab.remove(consoleText); consoleText = null; }
    if (!text) return null;
    consoleText = label(text, { colour: '#8BE58B', h: 0.46, fs: 96, mono: true });
    consoleText.position.set(0, -0.12, 0.16);
    consoleText.renderOrder = 3;
    consoleSlab.add(consoleText);
    return consoleText;
  }

  /* ---------- beats ---------- */
  function rise(obj, to, dur) {
    obj.visible = true;
    return gsap.to(obj.scale, { duration: dur || 0.55, x: to, y: to, z: to, ease: 'back.out(1.5)' });
  }
  function tl() { return gsap.timeline(); }
  function done(t) { return new Promise(function (res) { t.eventCallback('onComplete', function () { res(true); }); }); }

  var beats = {
    /* 1 — a program is a list of lines, and it runs down the page */
    1: function () {
      var t = tl();
      lines.forEach(function (l, i) {
        t.add(rise(l, 1, 0.5), i * 0.28);
      });
      t.to({}, { duration: 0.35 });
      t.call(function () { litOn(lines[0], true); consoleSlab.visible = true; });
      t.to({}, { duration: 0.5 });
      t.call(function () { setConsole('Hello!'); });
      t.to({}, { duration: 0.9 });
      t.call(function () { litOn(lines[0], false); });
      return done(t);
    },
    /* 2 — line two lights, and EVERYTHING STOPS */
    2: function () {
      var t = tl();
      t.call(function () { litOn(lines[1], true); });
      t.to({}, { duration: 0.6 });
      t.call(function () {
        waitRing.visible = true; waitWord.visible = true;
        waitWord.scale.setScalar(0.01);
      });
      t.to(waitRing.userData.ring.material, { duration: 0.4, opacity: 0.95 });
      t.to(waitRing.userData.bars[0].material, { duration: 0.4, opacity: 0.95 }, '<');
      t.to(waitRing.userData.bars[1].material, { duration: 0.4, opacity: 0.95 }, '<');
      t.add(rise(waitWord, 1, 0.45), '<');
      /* the held pulse: it is a HOLD, not a spinner — a spinner reads as
         "working", and the whole point is that nothing is working */
      t.to(waitRing.scale, { duration: 0.75, x: 1.09, y: 1.09, z: 1.09, yoyo: true, repeat: 3, ease: 'sine.inOut' });
      t.call(function () { litOn(lines[2], false); });
      return done(t);
    },
    /* 3 — a PERSON types */
    3: function () {
      var t = tl();
      t.call(function () { kb.visible = true; kb.scale.setScalar(0.01); });
      t.add(rise(kb, 1, 0.5));
      var press = [11, 4, 22, 15];   /* four keys, in a fixed order — never random */
      press.forEach(function (idx, n) {
        var k = kb.userData.keys[idx];
        t.to(k.position, { duration: 0.11, y: 0.19, yoyo: true, repeat: 1, ease: 'power2.out' }, 0.55 + n * 0.2);
      });
      t.call(function () { typed.visible = true; }, null, 1.3);
      t.to(typed.scale, { duration: 0.5, x: 1, y: 1, z: 1, ease: 'back.out(1.5)' }, 1.35);
      t.to({}, { duration: 0.5 });
      return done(t);
    },
    /* 4 — what she typed goes INTO the box with the name on it */
    4: function () {
      var t = tl();
      t.call(function () { box.visible = true; namePlate.visible = true; namePlate.scale.setScalar(0.01); });
      t.add(rise(box, 1, 0.55));
      t.add(rise(namePlate, 1, 0.45), '<0.15');
      t.to(box.userData.lid.rotation, { duration: 0.5, x: -1.15, ease: 'power2.out' });
      t.to(typed.position, { duration: 0.85, x: 4.6, y: 1.15, z: 0.0, ease: 'power2.inOut' }, '<0.1');
      t.to(typed.scale, { duration: 0.85, x: 0.72, y: 0.72, z: 0.72, ease: 'power2.inOut' }, '<');
      t.to(typed.position, { duration: 0.5, y: -0.18, ease: 'power2.in' });
      t.to(box.userData.lid.rotation, { duration: 0.45, x: 0, ease: 'power2.inOut' });
      t.to(boxGlow.material, { duration: 0.5, opacity: 0.9 }, '<');
      t.to({}, { duration: 0.5 });
      return done(t);
    },
    /* 5 — the program WAKES UP */
    5: function () {
      var t = tl();
      t.to(waitRing.userData.ring.material, { duration: 0.4, opacity: 0 });
      t.to(waitRing.userData.bars[0].material, { duration: 0.4, opacity: 0 }, '<');
      t.to(waitRing.userData.bars[1].material, { duration: 0.4, opacity: 0 }, '<');
      t.to(waitWord.scale, { duration: 0.35, x: 0.01, y: 0.01, z: 0.01 }, '<');
      t.call(function () { waitRing.visible = false; waitWord.visible = false; litOn(lines[1], false); });
      t.to({}, { duration: 0.3 });
      t.call(function () { litOn(lines[2], true); });
      t.to({}, { duration: 0.9 });
      return done(t);
    },
    /* 6 — and the reply uses what she typed */
    6: function () {
      var t = tl();
      /* A COPY LEAVES THE BOX. THE ORIGINAL STAYS IN IT.
         The first cut of this beat moved the word itself out, which left an
         EMPTY box on screen at the end — and the lesson three cards later
         teaches, in as many words, that using a box does not empty it ("Using a
         box twice does not empty it. It keeps what is in it until the program
         ends."). An animation that showed the opposite would be the film
         contradicting the card, which is rule 35 on the one idea training build
         3 exists to prove. So a copy travels, the original stays, and what a
         pupil SEES is what she is about to be told. */
      t.call(function () { setConsole('Hello '); });
      t.call(function () {
        copy.visible = true;
        copy.position.copy(typed.position);
        copy.scale.copy(typed.scale);
      });
      t.to(copy.position, { duration: 0.9, x: PROG_X + 1.5, y: -3.05, z: 0.2, ease: 'power2.inOut' });
      t.to(copy.scale, { duration: 0.9, x: 0.5, y: 0.5, z: 0.5, ease: 'power2.inOut' }, '<');
      t.call(function () {
        copy.visible = false;
        setConsole('Hello Anya');
      });
      t.to({}, { duration: 0.4 });
      t.call(function () { litOn(lines[2], false); });
      t.to(boxGlow.material, { duration: 0.5, opacity: 0.35 });
      t.to({}, { duration: 0.7 });
      return done(t);
    }
  };

  /* ---------- render loop + the API record.js drives ---------- */
  var drawn = false;
  window.__installStageSubjects(THREE, scene, camera, renderer);
  function tick() { renderer.render(scene, camera); drawn = true; requestAnimationFrame(tick); }
  tick();

  function screenHeight(obj) {
    /* the object's own height projected to screen pixels — the honest measure
       DFM 207d asks for, taken from the real camera rather than from a guess */
    var b = new THREE.Box3().setFromObject(obj);
    if (!isFinite(b.min.y) || !isFinite(b.max.y)) return 0;
    var mid = b.getCenter(new THREE.Vector3());
    var top = new THREE.Vector3(mid.x, b.max.y, mid.z).project(camera);
    var bot = new THREE.Vector3(mid.x, b.min.y, mid.z).project(camera);
    return Math.abs(top.y - bot.y) * (H / 2);
  }

  window.ih = {
    ready: new Promise(function (res) {
      var iv = setInterval(function () { if (drawn) { clearInterval(iv); res(true); } }, 30);
    }),
    play: function (n) { return beats[n] ? beats[n]() : Promise.resolve(false); },
    probe: function () {
      var g = renderer.getContext();
      var px = new Uint8Array(4 * 6);
      /* sample points chosen from a real frame rather than guessed: three on the
         program slabs, one on the box, one on the console, one on the keyboard */
      var pts = [[300, 205], [300, 330], [300, 455], [820, 400], [300, 640], [820, 640]];
      var out = [];
      pts.forEach(function (p, i) {
        var one = new Uint8Array(4);
        g.readPixels(p[0], H - p[1], 1, 1, g.RGBA, g.UNSIGNED_BYTE, one);
        out.push([one[0], one[1], one[2]]);
      });
      return { samples: out, nonNavy: out.filter(function (c) { return c[0] + c[1] + c[2] > 90; }).length };
    },
    /* every actor that is on screen right now, with its real projected height.
       record.js asserts the named one is >= 110px at each naming pause. */
    probeTokens: function () {
      var out = {};
      /* measure the SLAB, not the group: a glow sprite is not the actor, and
         letting it inflate the number would be the gate flattering itself. */
      var named = {
        line1: lines[0].userData.slab, line2: lines[1].userData.slab, line3: lines[2].userData.slab,
        box: box.userData.body, namePlate: namePlate, keyboard: kb, waiting: waitRing, console: consoleSlab
      };
      if (typed && typed.visible) named.typed = typed;
      if (copy && copy.visible) named.copy = copy;
      Object.keys(named).forEach(function (k) {
        var o = named[k];
        if (!o || !o.visible) return;
        out[k] = Math.round(screenHeight(o));
      });
      return out;
    }
  };
})();
