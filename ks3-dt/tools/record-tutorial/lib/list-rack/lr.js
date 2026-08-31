/* lr.js — A LIST IS A RACK OF BOXES (spec §E5, K35(6)).

   HIS RULING, 26 Aug 2026: "absolutely build both animations to the highest of
   standards." The J1 variable animation he loved is a BOX WITH A NAME ON IT; a
   list is the same idea, once — one name over a whole rack of them — so this
   animation starts on that exact box and grows it into a rack in front of her.
   A pupil who watched Lesson 2's film should recognise beat 1 immediately, and
   that recognition is the teaching: she is not meeting a new thing, she is
   meeting more of a thing she has.

   THE FOUR IDEAS IT HAS TO CARRY, one per beat, in the order the film needs:
     · one name can sit over a whole rack;
     · the boxes are NUMBERED, and the numbering starts at 0;
     · len( ) counts the boxes, and the count and the last number differ by one;
     · append slides a new box onto the END, and the numbers do not shuffle.
   And then, for film part 2, the one that catches everybody:
     · sort rearranges the rack ITSELF and hands back NOTHING.

   The sort beat has a HAND in it on purpose. "It hands nothing back" is an
   abstraction; an open palm with the word None dropped into it is a picture, and
   the trap is a thing she watched rather than a sentence she was told.

   RECORDING CONSTRAINTS (inherited from lib/variable-box/vb.js — read its
   header): head-less through Playwright on a software renderer, so no shadow
   maps, no post-processing, modest geometry, glows are emissive + a sprite.
   Nothing animates itself: record.js calls window.lr.play(n) beat by beat. No
   Math.random anywhere.

   window.lr.ready       resolves once the first frame has been drawn
   window.lr.play(n)     plays beat n (1..7), resolves when it finishes
   window.lr.probe()     pixel samples, so the recorder can PROVE the canvas is
                         not a black rectangle before it trusts the take
   window.lr.probeTokens() every visible actor's real projected height in screen
                         pixels; record.js asserts the named one is >= 110px at
                         each naming pause (DFM 207d, measured — 146b). */
(function () {
  var W = 1280, H = 720;
  var NAVY = 0x060D1F, GOLD = 0xE4B824, GOLD_HI = 0xFFD84D;

  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.Fog(NAVY, 20, 46);

  var camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
  camera.position.set(0, 1.35, 11.4);
  camera.lookAt(0, -0.05, 0);

  scene.add(new THREE.AmbientLight(0x8fa6d8, 0.62));
  var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 8, 7); scene.add(key);
  var warm = new THREE.PointLight(GOLD, 0.75, 30); warm.position.set(-5, 3, 5); scene.add(warm);

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
      g.fillStyle = opts.plate; g.strokeStyle = opts.plateEdge || '#A8830F'; g.lineWidth = 6;
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
    var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    var h = opts.h || 0.6;
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry((c.width / c.height) * h, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
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

  /* ONE BOX — the same glass box with gold edges she met in Lesson 2's film */
  function makeBox(s) {
    var g = new THREE.Group();
    var h = s * 0.8;
    var body = new THREE.Mesh(new THREE.BoxGeometry(s, h, s * 0.8),
      new THREE.MeshStandardMaterial({ color: 0x1B3566, transparent: true, opacity: 0.4,
        roughness: 0.25, metalness: 0.1, depthWrite: false }));
    body.position.y = h / 2; body.renderOrder = 1;
    g.add(body);
    var edgeMat = new THREE.MeshBasicMaterial({ color: GOLD });
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s, h, s * 0.8)),
      new THREE.LineBasicMaterial({ color: GOLD })).translateY(h / 2));
    var post = new THREE.CylinderGeometry(0.028, 0.028, h, 8);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (p) {
      var m = new THREE.Mesh(post, edgeMat);
      m.position.set(p[0] * s / 2, h / 2, p[1] * s * 0.4);
      g.add(m);
    });
    g.userData = { size: s, height: h, body: body };
    return g;
  }

  /* A NUMBERED SLOT IN THE RACK: the box, the title inside it, and the position
     number stencilled UNDER it — the numbering has to be part of the furniture,
     not a caption, or "counting starts at 0" is a claim rather than a picture. */
  function makeSlot(title, s) {
    var g = new THREE.Group();
    var box = makeBox(s);
    g.add(box);
    var t = label(title, { colour: '#FFD84D', h: 0.36, fs: 92 });
    /* A TITLE THAT RUNS PAST ITS OWN BOX IS NOT IN THE BOX. "The Long Way Round"
       overflowed at a fixed size, so every title is scaled to fit the box it
       sits in — the picture has to be true before the caption can be. */
    var wide = t.geometry.parameters.width;
    var room = s * 0.9;
    if (wide > room) t.scale.setScalar(room / wide);
    t.position.set(0, s * 0.44, s * 0.42);
    t.renderOrder = 3;
    g.add(t);
    var lit = glow('rgba(255,216,77,0.55)', s * 2.6);
    lit.position.set(0, s * 0.4, -s * 0.7);
    lit.material.opacity = 0;
    g.add(lit);
    g.userData = { box: box, title: t, lit: lit, text: title };
    return g;
  }

  var SLOT_W = 2.05, GAP = 2.35;
  var rack = new THREE.Group();
  rack.position.set(0, -0.55, 0);
  scene.add(rack);

  var TITLES = ['Opening Night', 'Curtain Up', 'Last Bus Home', 'The Long Way Round'];
  var slots = [];
  var shown = 0;          /* how many of them the film has revealed so far */
  function slotX(i, n) { return (i - (n - 1) / 2) * GAP; }
  function layout(dur, n) {
    n = n || shown;
    var t = gsap.timeline();
    for (var i = 0; i < n; i++) {
      t.to(slots[i].position, { duration: dur || 0.5, x: slotX(i, n), ease: 'power2.inOut' }, 0);
    }
    return t;
  }

  /* the rack's own shelf — one physical thing under all the boxes, which is what
     makes "one name over the whole rack" a picture and not a caption */
  var shelf = new THREE.Mesh(new THREE.BoxGeometry(GAP * 4.35, 0.22, SLOT_W * 1.05),
    new THREE.MeshStandardMaterial({ color: 0x16294F, roughness: 0.6, metalness: 0.15 }));
  shelf.position.set(0, -0.72, 0);
  shelf.visible = false;
  scene.add(shelf);
  var shelfEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(GAP * 4.35, 0.22, SLOT_W * 1.05)),
    new THREE.LineBasicMaterial({ color: 0x2E4A80 }));
  shelfEdge.position.copy(shelf.position);
  shelfEdge.visible = false;
  scene.add(shelfEdge);

  var posNums = [];
  for (var pn = 0; pn < 4; pn++) {
    var nm = label(String(pn), { colour: '#B9C8E2', h: 0.5, fs: 120, mono: true });
    nm.position.set(0, -1.35, SLOT_W * 0.56);
    nm.visible = false;
    scene.add(nm);
    posNums.push(nm);
  }
  function placeNums(n) {
    for (var i = 0; i < posNums.length; i++) {
      posNums[i].visible = i < n;
      posNums[i].position.x = slotX(i, n);
    }
  }

  var rackPlate = label('playlist', { plate: '#E4B824', colour: '#231A02', h: 0.5, fs: 128 });
  /* THE LOWER THIRD BELONGS TO THE CAPTION (31 Aug 2026). At -2.45 this tag
     projected into the caption band, and sixteen captions across five chapters
     sat on top of it — including the very sentences describing it. Damien
     caught it on screen; the strengthened film law now catches it in the
     render (16 of the 17 collisions in the report sweep were this one mesh).
     A first lift to -2.05 cleared the two-line captions and still collided
     with every three-line one (13 hits, one unmoving rect), and there is no
     honest slot between the numbers row and the caption band. So the tag now
     hangs ON the shelf edge itself — which is exactly what the narration
     calls it: "one label on the front of it". */
  /* at the shelf's LEFT END, like a real rack label: -1.55 parked it on the
     "0" and still clipped the "1" (the STAGE-TEXT-OVER-TEXT law caught both).
     And ch4's append RE-SPACES the numbers ("0" slides to -3.53), so the tag
     is sized at h 0.5 and tucked at -4.5: on the board, clear of the numbers
     in BOTH the three-box and four-box layouts. The overlap law proved each
     wrong placement before this one. */
  rackPlate.position.set(-4.5, -0.88, 1.3);
  rackPlate.renderOrder = 4;
  rackPlate.scale.setScalar(0.01);
  rackPlate.visible = false;
  scene.add(rackPlate);

  /* beat 1's single box, the Lesson 2 recap */
  var one = makeBox(2.4);
  one.position.set(0, -1.0, 0);
  one.scale.setScalar(0.01);
  scene.add(one);
  var oneWord = label('The Harbour Light', { colour: '#FFD84D', h: 0.4, fs: 96 });
  oneWord.position.set(0, 0.05, 1.05);
  oneWord.renderOrder = 3;
  oneWord.visible = false;
  scene.add(oneWord);
  var onePlate = label('venue', { plate: '#E4B824', colour: '#231A02', h: 0.6, fs: 110 });
  onePlate.position.set(0, -1.42, 1.28);
  onePlate.renderOrder = 4;
  onePlate.visible = false;
  scene.add(onePlate);
  var oneNote = label('a box with a name on it (a variable)', { colour: '#93A4C4', h: 0.36, fs: 74 });
  oneNote.position.set(0, -2.12, 1.2);   /* same band, same reason as rackPlate */
  oneNote.visible = false;
  scene.add(oneNote);

  /* the counting pointer — a real arrow that travels along the rack */
  /* every slot exists from the start, hidden and flat, for the reason in the
     TITLES note above */
  TITLES.forEach(function (title, i) {
    var sl = makeSlot(title, SLOT_W);
    sl.position.set(0, 0, 0);
    sl.scale.setScalar(0.01);
    sl.visible = false;
    rack.add(sl);
    slots.push(sl);
  });

  var pointer = new THREE.Group();
  (function () {
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.05, 10),
      new THREE.MeshBasicMaterial({ color: GOLD_HI }));
    shaft.position.y = 0.62;
    pointer.add(shaft);
    var head = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 14),
      new THREE.MeshBasicMaterial({ color: GOLD_HI }));
    head.rotation.x = Math.PI;
    head.position.y = -0.14;
    pointer.add(head);
  })();
  pointer.position.set(-GAP, 1.02, 1.2);
  pointer.visible = false;
  scene.add(pointer);

  var callLine = label('playlist[1]', { colour: '#BFD8FF', h: 0.5, fs: 108, mono: true });
  callLine.position.set(0, 2.42, 0.6);
  callLine.visible = false;
  scene.add(callLine);

  var answer = label('Curtain Up', { plate: '#FFD84D', plateEdge: '#A8830F', colour: '#231A02', h: 0.6, fs: 118 });
  answer.position.set(4.6, 2.85, 0.9);
  answer.visible = false;
  answer.renderOrder = 5;
  scene.add(answer);

  /* the hand for the sort beat: a palm, open, waiting to be given something */
  var hand = new THREE.Group();
  (function () {
    var palm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.26, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xE8B98F, roughness: 0.75 }));
    hand.add(palm);
    var fingerGeo = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.13, 0.62, 4, 8)
                                              : new THREE.CylinderGeometry(0.13, 0.13, 0.8, 8);
    var skin = new THREE.MeshStandardMaterial({ color: 0xE8B98F, roughness: 0.75 });
    for (var i = 0; i < 4; i++) {
      var f = new THREE.Mesh(fingerGeo, skin);
      f.rotation.z = Math.PI / 2;
      f.position.set(1.05, 0.02, (i - 1.5) * 0.28);
      hand.add(f);
    }
    var thumb = new THREE.Mesh(fingerGeo, skin);
    thumb.rotation.x = Math.PI / 2;
    thumb.position.set(0.1, 0.02, 0.72);
    hand.add(thumb);
    var cuff = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x2E4A80, roughness: 0.6 }));
    cuff.position.set(-0.95, 0.02, 0);
    hand.add(cuff);
  })();
  hand.scale.setScalar(1.7);
  hand.rotation.z = -0.12;
  hand.position.set(-4.15, -1.62, 2.1);
  hand.visible = false;
  scene.add(hand);

  var noneWord = label('None', { plate: '#FF9A8F', plateEdge: '#8A2010', colour: '#3A0C06', h: 0.6, fs: 118 });
  noneWord.position.set(-4.0, 0.15, 2.6);
  noneWord.visible = false;
  noneWord.renderOrder = 5;
  scene.add(noneWord);

  var lenWord = label('3', { plate: '#FFD84D', plateEdge: '#A8830F', colour: '#231A02', h: 0.8, fs: 150 });
  lenWord.position.set(4.9, 1.05, 1.0);
  lenWord.visible = false;
  lenWord.renderOrder = 5;
  scene.add(lenWord);

  var lenLine = label('len(playlist)', { colour: '#BFD8FF', h: 0.5, fs: 108, mono: true });
  lenLine.position.set(0, 2.42, 0.6);
  lenLine.visible = false;
  scene.add(lenLine);

  var appendLine = label('playlist.append("The Long Way Round")', { colour: '#BFD8FF', h: 0.42, fs: 84, mono: true });
  appendLine.position.set(0, 2.42, 0.6);
  appendLine.visible = false;
  scene.add(appendLine);

  var sortLine = label('playlist.sort()', { colour: '#BFD8FF', h: 0.5, fs: 108, mono: true });
  sortLine.position.set(0, 2.42, 0.6);
  sortLine.visible = false;
  scene.add(sortLine);

  /* ---------- beats ---------- */
  function done(t) { return new Promise(function (res) { t.eventCallback('onComplete', function () { res(true); }); }); }
  function rise(o, to, d) { o.visible = true; return gsap.to(o.scale, { duration: d || 0.5, x: to, y: to, z: to, ease: 'back.out(1.5)' }); }
  function litSlot(i, on) {
    slots.forEach(function (sl, k) {
      gsap.to(sl.userData.lit.material, { duration: 0.3, opacity: (on && k === i) ? 0.95 : 0 });
    });
  }
  function eachShown(fn) { for (var i = 0; i < shown; i++) fn(slots[i], i); }

  var beats = {
    /* 1 — one box, with a name on it: exactly what Lesson 2 taught */
    1: function () {
      var t = gsap.timeline();
      t.add(rise(one, 1, 0.6));
      t.call(function () { oneWord.visible = true; onePlate.visible = true; });
      t.fromTo(oneWord.material, { opacity: 0 }, { duration: 0.45, opacity: 1 }, '<0.15');
      t.fromTo(onePlate.material, { opacity: 0 }, { duration: 0.45, opacity: 1 }, '<');
      t.to({}, { duration: 0.5 });
      t.call(function () { oneNote.visible = true; });
      t.fromTo(oneNote.material, { opacity: 0 }, { duration: 0.4, opacity: 1 });
      t.to({}, { duration: 0.9 });
      return done(t);
    },
    /* 2 — a whole RACK of them, and ONE name over all of it */
    2: function () {
      var t = gsap.timeline();
      t.to([oneWord.material, onePlate.material, oneNote.material], { duration: 0.35, opacity: 0 });
      t.to(one.scale, { duration: 0.4, x: 0.01, y: 0.01, z: 0.01 }, '<');
      t.call(function () {
        one.visible = false; oneWord.visible = false; onePlate.visible = false; oneNote.visible = false;
        shelf.visible = true; shelfEdge.visible = true;
        shown = 3;
        for (var i = 0; i < 3; i++) slots[i].position.x = slotX(i, 3);
        placeNums(3);
      });
      for (var i = 0; i < 3; i++) {
        (function (k) { t.add(rise(slots[k], 1, 0.5), 0.55 + k * 0.22); })(i);
      }
      t.to({}, { duration: 0.35 });
      t.call(function () { rackPlate.visible = true; });
      t.add(rise(rackPlate, 1, 0.55));
      t.to({}, { duration: 0.9 });
      return done(t);
    },
    /* 3 — the boxes are NUMBERED, and the numbering starts at 0 */
    3: function () {
      var t = gsap.timeline();
      t.call(function () { callLine.visible = true; pointer.visible = true; });
      t.fromTo(callLine.material, { opacity: 0 }, { duration: 0.4, opacity: 1 });
      /* the pointer counts along OUT LOUD: 0, then 1 — the count is the point,
         so it is walked rather than jumped */
      t.fromTo(pointer.position, { x: -GAP }, { duration: 0.01, x: -GAP });
      t.call(function () { litSlot(0, true); });
      t.to({}, { duration: 0.7 });
      t.to(pointer.position, { duration: 0.6, x: 0, ease: 'power2.inOut' });
      t.call(function () { litSlot(1, true); });
      t.to({}, { duration: 0.7 });
      t.call(function () { answer.visible = true; answer.scale.setScalar(0.01); });
      t.add(rise(answer, 1, 0.5));
      t.to({}, { duration: 0.9 });
      return done(t);
    },
    /* 4 — len( ) counts the boxes */
    4: function () {
      var t = gsap.timeline();
      t.to([callLine.material, answer.material], { duration: 0.3, opacity: 0 });
      t.call(function () {
        callLine.visible = false; answer.visible = false; pointer.visible = false;
        litSlot(-1, false);
        lenLine.visible = true;
      });
      t.fromTo(lenLine.material, { opacity: 0 }, { duration: 0.4, opacity: 1 });
      for (var i = 0; i < 3; i++) {
        (function (k) { t.call(function () { litSlot(k, true); }, null, 0.7 + k * 0.42); })(i);
      }
      t.to({}, { duration: 0.55 }, 2.1);
      t.call(function () { litSlot(-1, false); lenWord.visible = true; lenWord.scale.setScalar(0.01); });
      t.add(rise(lenWord, 1, 0.5));
      t.to({}, { duration: 1.0 });
      return done(t);
    },
    /* 5 — append slides a new box onto the END, and the numbers stay put */
    5: function () {
      var t = gsap.timeline();
      t.to([lenLine.material, lenWord.material], { duration: 0.3, opacity: 0 });
      t.call(function () { lenLine.visible = false; lenWord.visible = false; appendLine.visible = true; });
      t.fromTo(appendLine.material, { opacity: 0 }, { duration: 0.4, opacity: 1 });
      t.call(function () {
        shown = 4;
        placeNums(4);
        slots[3].position.set(GAP * 3.4, 0, 0);
        slots[3].visible = true;
        slots[3].scale.setScalar(1);
      });
      t.to({}, { duration: 0.25 });
      t.add(layout(0.8, 4));
      t.call(function () { litSlot(3, true); });
      t.to({}, { duration: 1.0 });
      t.call(function () { litSlot(-1, false); });
      return done(t);
    },
    /* 6 — and the whole rack still answers to ONE name */
    6: function () {
      var t = gsap.timeline();
      t.to([appendLine.material], { duration: 0.3, opacity: 0 });
      t.call(function () { appendLine.visible = false; });
      t.to(rackPlate.scale, { duration: 0.5, x: 1.28, y: 1.28, z: 1.28, ease: 'power2.out' });
      for (var i = 0; i < 4; i++) {
        (function (k) { t.call(function () { litSlot(k, true); }, null, 0.5 + k * 0.2); })(i);
      }
      t.call(function () {
        eachShown(function (sl) { gsap.to(sl.userData.lit.material, { duration: 0.3, opacity: 0.85 }); });
      }, null, 1.35);
      t.to({}, { duration: 1.1 });
      t.to(rackPlate.scale, { duration: 0.4, x: 1, y: 1, z: 1 });
      t.call(function () { litSlot(-1, false); });
      return done(t);
    },
    /* 7 — the trap: sort rearranges the rack ITSELF, and hands back NOTHING */
    7: function () {
      var t = gsap.timeline();
      t.call(function () { sortLine.visible = true; hand.visible = true; hand.scale.setScalar(0.01); });
      t.fromTo(sortLine.material, { opacity: 0 }, { duration: 0.4, opacity: 1 });
      t.add(rise(hand, 1, 0.5), '<0.1');
      /* the boxes really move, in place, into alphabetical order:
         Opening Night, Curtain Up, Last Bus Home, The Long Way Round
         ->  Curtain Up, Last Bus Home, Opening Night, The Long Way Round */
      t.call(function () {
        var order = [1, 2, 0, 3];
        order.forEach(function (from, to) {
          gsap.to(slots[from].position, { duration: 0.9, x: slotX(to, 4), ease: 'power2.inOut' });
        });
      });
      t.to({}, { duration: 1.25 });
      /* and the hand gets nothing — which is the whole beat */
      t.call(function () { noneWord.visible = true; noneWord.scale.setScalar(0.01); });
      t.add(rise(noneWord, 1, 0.55));
      t.to(noneWord.position, { duration: 0.55, y: -1.22, ease: 'power2.in' });
      t.to({}, { duration: 1.2 });
      return done(t);
    }
  };

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

  window.lr = {
    ready: new Promise(function (res) {
      var iv = setInterval(function () { if (drawn) { clearInterval(iv); res(true); } }, 30);
    }),
    play: function (n) { return beats[n] ? beats[n]() : Promise.resolve(false); },
    probe: function () {
      var g = renderer.getContext();
      var pts = [[640, 300], [360, 300], [920, 300], [640, 520], [640, 170], [200, 300]];
      var out = [];
      pts.forEach(function (p) {
        var one2 = new Uint8Array(4);
        g.readPixels(p[0], H - p[1], 1, 1, g.RGBA, g.UNSIGNED_BYTE, one2);
        out.push([one2[0], one2[1], one2[2]]);
      });
      return { samples: out, nonNavy: out.filter(function (c) { return c[0] + c[1] + c[2] > 90; }).length };
    },
    probeTokens: function () {
      var out = {};
      var named = { oneBox: one.visible ? one.userData.body : null, rackPlate: rackPlate, num0: posNums[0],
                    shelf: shelf, pointer: pointer, answer: answer, len: lenWord,
                    hand: hand, none: noneWord };
      for (var i = 0; i < shown; i++) named['slot' + i] = slots[i].userData.box.userData.body;
      Object.keys(named).forEach(function (k) {
        var o = named[k];
        if (!o) return;
        var vis = o.visible;
        var par = o.parent;
        while (vis && par) { vis = par.visible; par = par.parent; }
        if (!vis) return;
        var hgt = Math.round(screenHeight(o));
        if (hgt > 2) out[k] = hgt;
      });
      return out;
    },
    /* the rack's order, read off the real scene — the recorder asserts the sort
       beat really re-ordered the boxes rather than merely animating something */
    order: function () {
      return slots.slice(0, shown).sort(function (a, b) { return a.position.x - b.position.x; })
        .map(function (sl) { return sl.userData.text; });
    }
  };
})();
