/* ss.js — FRED and MARGO, the two side-show characters (K36c).

   HIS RULING, 26 Aug 2026: "There should be a hilarious picture of 'Fred' (not
   the awful SGV one's you create, something genuinely funny looking that blinks
   and reacts)."

   SO THEY ARE RENDERED, NOT DRAWN, and they are built to be read at the size
   they are actually shown -- about 260 pixels down the side of a card. That size
   is the whole design brief. At 260 pixels a subtle expression is no expression:
   what carries is the SHAPE of the eyes, the SHAPE of the mouth, and the tilt of
   the whole body. So every state changes at least two of those three, and the
   happy states swap the eyeballs out for arcs, because "^ ^" reads as delight
   from across a classroom and a slightly-wider smile does not.

   THREE THINGS MAKE THEM LOOK DRAWN RATHER THAN RENDERED:
     - a toon outline on every solid part (a back-facing shell in near-black),
       which is what stops a lit sphere reading as a grey blob;
     - lighting kept deliberately low, so the cream stays cream instead of
       blowing out to white;
     - dark sockets behind the eyes, so the whites have something to be white
       against.

   THE CAMERA FRAMES ITSELF from the character's own bounding box, so no part is
   ever cropped -- the first cut of this file cropped Fred's aerial and Margo's
   bun, and framing by hand is exactly the kind of thing that silently regresses.

   window.ss.ready          resolves once the first frame is drawn
   window.ss.set(who,state,t)  poses the character; t (0..1) drives the blink and
                            any per-state motion, so a frame is a pure function
                            of t and a re-render is reproducible
   window.ss.probe()        painted pixels, so a capture cannot save a ghost
   window.ss.measure()      projected pixel sizes of the features that carry the
                            expression, so legibility is asserted and not hoped
                            for (the animation law, DFM 192e/207d) */
(function () {
  var W = 900, H = 980;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);

  /* LOW AND SOFT. The first cut ran ambient 0.85 plus three directionals over
     1.0 each, and every colour in both characters clipped to white. */
  scene.add(new THREE.AmbientLight(0xFFFFFF, 0.52));
  var key = new THREE.DirectionalLight(0xFFF4E0, 0.72); key.position.set(3.2, 5.5, 6.5); scene.add(key);
  var fill = new THREE.DirectionalLight(0xC8DCFF, 0.3); fill.position.set(-5, 1.5, 4); scene.add(fill);
  var rim = new THREE.DirectionalLight(0xFFE9A8, 0.34); rim.position.set(-2.5, 3.5, -6); scene.add(rim);

  var INK = 0x141C2E;

  function pbr(hex, rough) {
    return new THREE.MeshStandardMaterial({ color: hex, roughness: rough == null ? 0.62 : rough, metalness: 0.0 });
  }
  /* a solid part plus its outline: a copy of the same geometry, grown a little
     and turned inside out, painted flat near-black */
  function solid(geo, hex, opts) {
    opts = opts || {};
    var g = new THREE.Group();
    var m = new THREE.Mesh(geo, pbr(hex, opts.rough));
    g.add(m);
    if (opts.outline !== false) {
      var o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
      o.scale.setScalar(opts.grow || 1.045);
      g.add(o);
    }
    g.userData.skin = m;
    return g;
  }
  function flat(geo, hex) { return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hex })); }
  function at(node, x, y, z) { node.position.set(x, y, z); return node; }

  /* ---- an eye that can be a ball, a happy arc, or shut ------------------- */
  function makeEye(r, socketHex) {
    var g = new THREE.Group();
    var socket = new THREE.Mesh(new THREE.SphereGeometry(r * 1.16, 22, 16), pbr(socketHex, 0.8));
    socket.scale.z = 0.5; socket.position.z = -r * 0.1;
    g.add(socket);
    var ball = new THREE.Group();
    var white = new THREE.Mesh(new THREE.SphereGeometry(r, 26, 20), pbr(0xFFFFFF, 0.24));
    ball.add(white);
    var pupil = at(new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 20, 16), pbr(0x111A2E, 0.2)), 0, 0, r * 0.66);
    ball.add(pupil);
    ball.add(at(flat(new THREE.SphereGeometry(r * 0.16, 10, 8), 0xFFFFFF), r * 0.2, r * 0.26, r * 0.94));
    g.add(ball);
    /* the lid: a cap of the SAME colour as the face, driven down over the ball */
    var lid = new THREE.Mesh(new THREE.SphereGeometry(r * 1.09, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
                             pbr(socketHex, 0.7));
    lid.rotation.x = Math.PI;          /* the dome faces DOWN, like an eyelid */
    lid.position.y = r * 1.2;
    lid.visible = false;
    g.add(lid);
    /* the happy arc, shown INSTEAD of the ball when she is delighted */
    var arc = new THREE.Mesh(new THREE.TorusGeometry(r * 0.82, r * 0.2, 8, 22, Math.PI), pbr(0x111A2E, 0.35));
    arc.position.z = r * 0.5;
    arc.visible = false;
    g.add(arc);
    g.userData = { r: r, ball: ball, pupil: pupil, lid: lid, arc: arc, socket: socket };
    return g;
  }
  function eyeState(eye, opts) {
    var u = eye.userData, r = u.r;
    u.arc.visible = !!opts.happy;
    u.ball.visible = !opts.happy;
    u.lid.visible = !opts.happy && (opts.shut || 0) > 0.03;
    u.lid.position.y = r * (1.2 - 1.34 * (opts.shut || 0));
    u.pupil.position.x = r * 0.34 * (opts.lookX || 0);
    u.pupil.position.y = r * 0.32 * (opts.lookY || 0);
  }
  function makeMouth(r, tube, hex) {
    return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 30, Math.PI), pbr(hex, 0.5));
  }

  /* ====================================================================== */
  /*  FRED -- a chatbot somebody built in a shed                             */
  /* ====================================================================== */
  var fred = new THREE.Group();
  (function () {
    var CREAM = 0xE9D6A6, MINT = 0x4FB39C, GOLD = 0xE4B824, STEEL = 0x7C8AA8, GRILLE = 0x2C6B60;

    var head = at(solid(new THREE.BoxGeometry(3.4, 2.85, 2.25), CREAM, { grow: 1.035 }), 0, 0.95, 0);
    fred.add(head);
    head.add(at(solid(new THREE.BoxGeometry(3.46, 0.4, 2.3), MINT, { grow: 1.03 }), 0, 1.24, 0));
    /* two rivets, because a box with rivets is a machine and a box is a box */
    [-1.42, 1.42].forEach(function (x) {
      head.add(at(solid(new THREE.SphereGeometry(0.13, 12, 10), STEEL, { grow: 1.16 }), x, -1.0, 1.14));
    });

    var aerial = new THREE.Group();
    aerial.add(at(solid(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 10), STEEL, { grow: 1.14 }), 0, 0.6, 0));
    var ballG = at(solid(new THREE.SphereGeometry(0.31, 20, 16), GOLD, { grow: 1.09 }), 0, 1.28, 0);
    aerial.add(ballG);
    aerial.position.set(-0.9, 2.4, 0);
    fred.add(aerial);

    var eL = at(makeEye(0.53, CREAM), -0.78, 1.02, 1.02);
    var eR = at(makeEye(0.53, CREAM), 0.78, 1.02, 1.02);
    fred.add(eL); fred.add(eR);

    var browL = at(solid(new THREE.BoxGeometry(1.0, 0.19, 0.19), 0x3B2A18, { grow: 1.1 }), -0.78, 1.8, 1.14);
    var browR = at(solid(new THREE.BoxGeometry(1.0, 0.19, 0.19), 0x3B2A18, { grow: 1.1 }), 0.78, 1.8, 1.14);
    fred.add(browL); fred.add(browR);

    var mouth = at(makeMouth(0.44, 0.14, 0x3B2A18), 0, 0.13, 1.16);
    mouth.rotation.z = Math.PI;
    fred.add(mouth);
    /* the open mouth for delight: a filled dish, shown only when he beams */
    var gob = at(new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
                                pbr(0x2A1520, 0.5)), 0, 0.15, 1.1);
    gob.visible = false;
    fred.add(gob);

    var body = at(solid(new THREE.BoxGeometry(2.5, 2.0, 1.85), MINT, { grow: 1.04 }), 0, -1.25, 0);
    fred.add(body);
    body.add(at(solid(new THREE.BoxGeometry(1.5, 1.1, 0.12), CREAM, { grow: 1.05 }), 0, 0.02, 0.93));
    for (var i = 0; i < 4; i++) {
      body.add(at(flat(new THREE.BoxGeometry(1.16, 0.11, 0.05), GRILLE), 0, 0.35 - i * 0.22, 1.02));
    }

    var arms = [];
    [-1, 1].forEach(function (sgn) {
      var arm = new THREE.Group();
      var CapG = THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.2, 1.15, 6, 14)
                                       : new THREE.CylinderGeometry(0.2, 0.2, 1.5, 14);
      arm.add(at(solid(CapG, CREAM, { grow: 1.1 }), 0, -0.62, 0));
      arm.add(at(solid(new THREE.SphereGeometry(0.31, 18, 14), GOLD, { grow: 1.1 }), 0, -1.36, 0));
      arm.position.set(sgn * 1.52, -0.8, -0.05);
      arm.rotation.z = sgn * 0.5;
      arm.userData = { sgn: sgn };
      fred.add(arm); arms.push(arm);
    });

    var dots = new THREE.Group();
    for (var d = 0; d < 3; d++) {
      dots.add(at(solid(new THREE.SphereGeometry(0.21, 14, 10), 0x8FA0C4, { grow: 1.16 }), (d - 1) * 0.64, 0, 0));
    }
    dots.position.set(2.1, 2.3, 0.55);
    dots.visible = false;
    fred.add(dots);

    fred.userData = { head: head, aerial: aerial, ball: ballG.userData.skin.material, eyes: [eL, eR],
                      brows: [browL, browR], mouth: mouth, gob: gob, dots: dots, arms: arms };
  })();
  scene.add(fred);

  /* ====================================================================== */
  /*  MARGO -- a theatre critic who has seen everything and enjoyed little   */
  /* ====================================================================== */
  var margo = new THREE.Group();
  (function () {
    var SKIN = 0xEBB68F, HAIR = 0x4E2E24, FUR = 0xEFE8D9, DRESS = 0x71203F, GOLD = 0xE4B824, RED = 0xB3242F;

    var head = at(solid(new THREE.SphereGeometry(1.45, 32, 26), SKIN, { grow: 1.035 }), 0, 1.15, 0);
    head.children.forEach(function (m) { m.scale.set(m.scale.x * 1, m.scale.y * 1.1, m.scale.z * 0.95); });
    margo.add(head);

    /* a hair helmet that frames the face, and the bun that is half the joke */
    var helmet = at(solid(new THREE.SphereGeometry(1.5, 30, 22, 0, Math.PI * 2, 0, Math.PI * 0.6), HAIR, { grow: 1.03 }), 0, 1.15, 0);
    helmet.children.forEach(function (m) { var k = m.scale.x; m.scale.set(k * 1.03, k * 1.14, k * 1.0); });
    margo.add(helmet);
    var bun = at(solid(new THREE.SphereGeometry(0.85, 24, 18), HAIR, { grow: 1.05 }), 0, 3.0, -0.3);
    margo.add(bun);
    margo.add(at(solid(new THREE.TorusGeometry(0.86, 0.09, 8, 26), 0x3A2018, { grow: 1.2 }), 0, 3.0, -0.3));

    var eL = at(makeEye(0.36, SKIN), -0.5, 1.28, 1.2);
    var eR = at(makeEye(0.36, SKIN), 0.5, 1.28, 1.2);
    margo.add(eL); margo.add(eR);
    var nose = at(solid(new THREE.SphereGeometry(0.24, 16, 12), SKIN, { grow: 1.1 }), 0, 0.85, 1.32);
    margo.add(nose);

    /* HALF-MOON GLASSES, and the first cut got these badly wrong: the arc was
       drawn below the eyes, so it read as a second yellow smile. A half-moon is
       a FLAT TOP with a curve under it, and it sits ACROSS the eyes so she can
       look over the top -- which is the entire posture of the character. */
    var glasses = new THREE.Group();
    [-1, 1].forEach(function (sgn) {
      var rim2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 8, 24, Math.PI), pbr(RED, 0.4));
      rim2.rotation.z = Math.PI;                     /* the curve hangs downward */
      rim2.position.x = sgn * 0.5;
      glasses.add(rim2);
      var bar = at(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.075, 0.075), pbr(RED, 0.4)), sgn * 0.5, 0, 0);
      glasses.add(bar);                              /* the flat top edge */
      var lens = at(new THREE.Mesh(new THREE.CircleGeometry(0.4, 24, Math.PI, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xD8ECFF, transparent: true, opacity: 0.22, roughness: 0.1 })),
        sgn * 0.5, 0, -0.02);
      glasses.add(lens);
      /* a beaded chain, because a critic's glasses are on a chain */
      for (var b = 0; b < 5; b++) {
        glasses.add(at(flat(new THREE.SphereGeometry(0.055, 8, 6), GOLD),
          sgn * (1.0 + b * 0.015), -0.05 - b * 0.3, -0.62 - b * 0.2));
      }
    });
    glasses.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.06), pbr(RED, 0.4)), 0, 0, 0));
    glasses.position.set(0, 1.12, 1.44);
    margo.add(glasses);

    /* thin, high, permanently unimpressed */
    var brL = at(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.052, 8, 18, Math.PI * 0.62), pbr(0x3A2018, 0.5)), -0.5, 1.72, 1.3);
    brL.rotation.z = 0.2;
    var brR = at(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.052, 8, 18, Math.PI * 0.62), pbr(0x3A2018, 0.5)), 0.5, 1.72, 1.3);
    brR.rotation.z = Math.PI - 0.82;
    margo.add(brL); margo.add(brR);

    var mouth = at(makeMouth(0.3, 0.1, 0x8E2340), 0, 0.55, 1.32);
    mouth.rotation.z = Math.PI;
    margo.add(mouth);
    var gob = at(new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
                                pbr(0x59152A, 0.5)), 0, 0.57, 1.26);
    gob.visible = false;
    margo.add(gob);
    [-1, 1].forEach(function (s) {
      margo.add(at(solid(new THREE.SphereGeometry(0.14, 12, 10), 0xF3ECDC, { grow: 1.18 }), s * 1.46, 0.98, 0.25));
    });

    var stole = new THREE.Group();
    for (var i = 0; i < 14; i++) {
      var a = (i / 14) * Math.PI * 2;
      stole.add(at(solid(new THREE.SphereGeometry(0.3 + (i % 3) * 0.04, 14, 10), FUR, { grow: 1.09 }),
        Math.cos(a) * 1.2, Math.sin(a) * 0.12, Math.sin(a) * 0.72));
    }
    stole.position.y = -0.42;
    margo.add(stole);
    margo.add(at(solid(new THREE.CylinderGeometry(1.1, 1.55, 2.4, 24), DRESS, { grow: 1.04 }), 0, -1.75, 0));

    var board = new THREE.Group();
    board.add(solid(new THREE.BoxGeometry(1.1, 1.45, 0.08), 0xF6F2E6, { grow: 1.05 }));
    board.add(at(solid(new THREE.BoxGeometry(0.5, 0.18, 0.14), 0x8E99AE, { grow: 1.1 }), 0, 0.76, 0.03));
    for (var ln = 0; ln < 4; ln++) {
      board.add(at(flat(new THREE.BoxGeometry(0.72, 0.055, 0.02), 0x9AA4B8), -0.06, 0.35 - ln * 0.3, 0.06));
    }
    board.position.set(1.55, -1.1, 1.05);
    board.rotation.set(-0.16, -0.42, 0.1);
    margo.add(board);

    /* real arms, because a hand on its own is a balloon */
    var ArmG = THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.17, 0.85, 6, 12)
                                     : new THREE.CylinderGeometry(0.17, 0.17, 1.2, 12);
    var handR = at(solid(new THREE.SphereGeometry(0.27, 16, 12), SKIN, { grow: 1.1 }), 1.32, -1.55, 1.3);
    var handL = at(solid(new THREE.SphereGeometry(0.27, 16, 12), SKIN, { grow: 1.1 }), -1.36, -1.55, 1.2);
    var armR = solid(ArmG, DRESS, { grow: 1.11 }), armL = solid(ArmG, DRESS, { grow: 1.11 });
    margo.add(armR); margo.add(armL); margo.add(handR); margo.add(handL);
    /* and a pen, because she is always about to write something unkind */
    var pen = solid(new THREE.CylinderGeometry(0.045, 0.045, 0.62, 8), 0x1C2436, { grow: 1.2 });
    handR.add(at(pen, 0.02, 0.26, 0.16));
    pen.rotation.z = 0.4;
    var SHO_R = new THREE.Vector3(0.95, -0.72, 0.55), SHO_L = new THREE.Vector3(-0.95, -0.72, 0.5);
    function hangArm(arm, hand, shoulder) {
      var mid = shoulder.clone().add(hand.position).multiplyScalar(0.5);
      arm.position.copy(mid);
      var d = hand.position.clone().sub(shoulder);
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.clone().normalize());
      var k = d.length() / 1.19;
      arm.scale.set(1, Math.max(0.5, k), 1);
    }

    /* five stars for the rave, in an arc over her head */
    var rave = new THREE.Group();
    for (var rv = 0; rv < 5; rv++) {
      var st = new THREE.Group();
      st.add(solid(new THREE.SphereGeometry(0.26, 14, 10), 0xFFD84D, { grow: 1.14 }));
      for (var sp = 0; sp < 5; sp++) {
        var ang = sp * (Math.PI * 2 / 5) - Math.PI / 2;
        var spike = at(solid(new THREE.ConeGeometry(0.11, 0.3, 8), 0xFFD84D, { grow: 1.16 }),
          Math.cos(ang) * 0.3, Math.sin(ang) * 0.3, 0);
        spike.rotation.z = -ang + Math.PI / 2;
        st.add(spike);
      }
      st.position.set((rv - 2) * 0.82, -Math.abs(rv - 2) * 0.09, 0);
      rave.add(st);
    }
    rave.position.set(0, 4.42, 1.35);
    rave.visible = false;
    margo.add(rave);

    margo.userData = { head: head, eyes: [eL, eR], brows: [brL, brR], mouth: mouth, gob: gob,
                       board: board, rave: rave, handL: handL, handR: handR, glasses: glasses, bun: bun,
                       armL: armL, armR: armR, hangArm: hangArm, shoL: SHO_L, shoR: SHO_R };
  })();
  margo.visible = false;
  scene.add(margo);

  /* ---- framing --------------------------------------------------------
     The character decides the camera, not the other way round -- but ONE camera
     for all of that character's states, taken from the union of every pose at
     every t. Framing each state on its own would make him jump around the panel
     as he bobs; framing by hand is how the first cut cropped Fred's aerial and
     Margo's bun clean off. */
  var box = new THREE.Box3(), sizeV = new THREE.Vector3(), midV = new THREE.Vector3();
  var STATES_ALL = ['idle', 'typing', 'delighted', 'offended', 'devastated'];
  /* a deliberate, declared bottom crop in world units -- null means "show all" */
  var CROP = { fred: null, margo: -1.95 };
  var CAM = {};
  function computeCam(who) {
    var g = (who === 'fred') ? fred : margo;
    var was = g.visible; g.visible = true;
    var union = new THREE.Box3(); union.makeEmpty();
    var tmp = new THREE.Box3();
    STATES_ALL.forEach(function (st) {
      for (var i = 0; i < 8; i++) {
        (who === 'fred' ? poseFred : poseMargo)(st, i / 8);
        g.updateMatrixWorld(true);
        tmp.setFromObject(g);
        union.union(tmp);
      }
    });
    if (CROP[who] != null) union.min.y = Math.max(union.min.y, CROP[who]);
    union.getSize(sizeV); union.getCenter(midV);
    var fov = camera.fov * Math.PI / 180;
    var margin = 1.03;
    var d = Math.max(sizeV.y / 2, (sizeV.x / 2) / camera.aspect) * margin / Math.tan(fov / 2);
    g.visible = was;
    return { y: midV.y, z: union.max.z + d, fillY: sizeV.y, dist: d };
  }
  function frame(who) {
    var c = CAM[who] || (CAM[who] = computeCam(who));
    camera.position.set(0, c.y, c.z);
    camera.lookAt(0, c.y, 0);
    camera.updateProjectionMatrix();
  }

  /* ---------- posing ---------- */
  var BLINK = function (t, at2) { return (t > at2 && t < at2 + 0.1) ? Math.sin((t - at2) / 0.1 * Math.PI) : 0; };
  /* THE SLOW BLINK OF DISDAIN. The first cut left both offended poses with no
     blink at all, and img2webp -- correctly -- collapsed thirty identical frames
     into a still photograph. A character who freezes solid the moment he is
     insulted is not reacting, he is a JPEG. A slow lid is also simply funnier
     than a fast one. */
  var SLOW = function (t, a, w) { return (t > a && t < a + w) ? Math.sin((t - a) / w * Math.PI) : 0; };

  function poseFred(state, t) {
    var u = fred.userData, wob = Math.sin(t * Math.PI * 2);
    u.dots.visible = (state === 'typing');
    u.gob.visible = (state === 'delighted');
    u.mouth.visible = (state !== 'delighted');
    fred.rotation.set(0, 0, 0); fred.position.set(0, 0, 0);
    u.aerial.rotation.z = 0;
    u.brows[0].rotation.z = 0; u.brows[1].rotation.z = 0;
    u.brows[0].position.y = 1.8; u.brows[1].position.y = 1.8;
    u.mouth.rotation.z = Math.PI; u.mouth.position.y = 0.13; u.mouth.scale.set(1, 1, 1);
    u.arms.forEach(function (a) { a.rotation.z = a.userData.sgn * 0.5; a.position.y = -0.8; });
    u.ball.color.setHex(0xE4B824);

    if (state === 'idle') {
      u.eyes.forEach(function (e) { eyeState(e, { shut: BLINK(t, 0.72) }); });

    } else if (state === 'typing') {
      /* eyes DOWN on the work, brows in, three dots bouncing */
      u.eyes.forEach(function (e) { eyeState(e, { shut: BLINK(t, 0.74), lookY: -0.8, lookX: -0.2 }); });
      u.brows[0].rotation.z = -0.07; u.brows[1].rotation.z = 0.07;
      u.brows[0].position.y = 1.68; u.brows[1].position.y = 1.68;
      u.mouth.scale.set(0.55, 0.4, 1);
      u.dots.children.forEach(function (d, i) { d.position.y = Math.sin(t * Math.PI * 2 + i * 0.95) * 0.18; });
      u.arms[1].rotation.z = 0.85 + Math.sin(t * Math.PI * 6) * 0.12;

    } else if (state === 'delighted') {
      /* "^ ^" and a wide open gob: the two things that read at 260 pixels */
      u.eyes.forEach(function (e) { eyeState(e, { happy: true }); });
      u.brows[0].position.y = 1.96; u.brows[1].position.y = 1.96;
      u.gob.scale.set(1 + Math.abs(wob) * 0.12, 1.1 + Math.abs(wob) * 0.2, 1);
      u.aerial.rotation.z = wob * 0.34;
      u.ball.color.setHex(0xFFE566);
      u.arms.forEach(function (a) { a.rotation.z = a.userData.sgn * 2.2; a.position.y = -0.45; });
      fred.position.y = Math.abs(Math.sin(t * Math.PI)) * 0.22;

    } else if (state === 'offended') {
      /* ONE eyebrow up in the roof, eyes narrowed, mouth a pursed little line,
         head cocked. Nothing here is subtle, on purpose. */
      var sb = SLOW(t, 0.46, 0.3);
      u.eyes.forEach(function (e, i) {
        var base = (i === 0) ? 0.1 : 0.42;
        eyeState(e, { shut: base + (1 - base) * sb, lookX: 0.55 });
      });
      u.brows[0].rotation.z = 0.5; u.brows[0].position.y = 2.06;
      u.brows[1].rotation.z = -0.1; u.brows[1].position.y = 1.68;
      u.mouth.rotation.z = Math.PI * 0.55;
      u.mouth.scale.set(0.42, 0.34, 1);
      u.mouth.position.y = 0.1;
      fred.rotation.z = 0.11;
      u.arms[0].rotation.z = -1.3; u.arms[1].rotation.z = 1.3;

    } else if (state === 'devastated') {
      /* everything falls: eyes, brows, mouth, arms, and the aerial gives up */
      u.eyes.forEach(function (e) { eyeState(e, { shut: 0.4 + 0.16 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2)), lookY: -0.5 }); });
      u.brows[0].rotation.z = 0.36; u.brows[1].rotation.z = -0.36;   /* inner ends UP */
      u.brows[0].position.y = 1.6; u.brows[1].position.y = 1.6;
      u.mouth.rotation.z = 0; u.mouth.position.y = -0.16; u.mouth.scale.set(1.05, 0.95, 1);
      u.aerial.rotation.z = 1.15;
      u.arms.forEach(function (a) { a.rotation.z = a.userData.sgn * 0.08; a.position.y = -1.0; });
      fred.position.y = -0.16;
      fred.rotation.z = -0.03;
    }
  }

  function poseMargo(state, t) {
    var u = margo.userData, wob = Math.sin(t * Math.PI * 2);
    u.rave.visible = (state === 'delighted');
    u.gob.visible = (state === 'delighted');
    u.mouth.visible = (state !== 'delighted');
    margo.rotation.set(0, 0, 0); margo.position.set(0, 0, 0);
    u.mouth.rotation.z = Math.PI; u.mouth.scale.set(1, 1, 1); u.mouth.position.y = 0.55;
    u.brows[0].position.y = 1.72; u.brows[1].position.y = 1.72;
    u.brows[0].rotation.z = 0.2; u.brows[1].rotation.z = Math.PI - 0.82;
    u.board.position.set(1.55, -1.1, 1.05);
    u.board.rotation.set(-0.16, -0.42, 0.1);
    u.handL.position.set(-1.36, -1.55, 1.2);
    u.handR.position.set(1.32, -1.55, 1.3);

    if (state === 'idle') {
      /* peering over the top of the glasses, which is her whole posture */
      u.eyes.forEach(function (e) { eyeState(e, { shut: BLINK(t, 0.7), lookY: 0.25 }); });

    } else if (state === 'typing') {
      u.eyes.forEach(function (e) { eyeState(e, { shut: BLINK(t, 0.72), lookY: -0.85, lookX: 0.5 }); });
      u.brows[0].position.y = 1.6; u.brows[1].position.y = 1.6;
      u.mouth.scale.set(0.6, 0.5, 1);
      u.board.position.set(1.4, -0.5, 1.3);
      u.board.rotation.set(-0.1, -0.34, 0.06 + Math.sin(t * Math.PI * 4) * 0.04);
      u.handR.position.set(1.18 + Math.sin(t * Math.PI * 6) * 0.12, -0.72 + Math.cos(t * Math.PI * 6) * 0.14, 1.5);

    } else if (state === 'delighted') {
      u.eyes.forEach(function (e) { eyeState(e, { happy: true }); });
      u.brows[0].position.y = 1.92; u.brows[1].position.y = 1.92;
      u.gob.scale.set(1.1 + Math.abs(wob) * 0.15, 1.25 + Math.abs(wob) * 0.2, 1);
      u.handL.position.set(-1.75, -0.15, 1.0);
      u.handR.position.set(1.75, -0.15, 1.0);
      u.board.position.set(1.95, -1.5, 0.7);
      u.board.rotation.set(-0.16, -0.42, -0.5);
      margo.position.y = Math.abs(Math.sin(t * Math.PI)) * 0.13;
      u.rave.children.forEach(function (s, i) {
        s.scale.setScalar(1 + Math.sin(t * Math.PI * 2 + i * 0.72) * 0.2);
      });

    } else if (state === 'offended') {
      /* one brow into orbit, mouth pursed to nothing, chin up, board raised */
      var sbm = SLOW(t, 0.44, 0.3);
      u.eyes.forEach(function (e, i) {
        var base = (i === 0) ? 0.06 : 0.4;
        eyeState(e, { shut: base + (1 - base) * sbm, lookX: 0.5, lookY: 0.2 });
      });
      u.brows[0].position.y = 2.18; u.brows[0].rotation.z = 0.62;
      u.brows[1].position.y = 1.66;
      u.mouth.rotation.z = Math.PI * 0.6;
      u.mouth.scale.set(0.42, 0.34, 1);
      u.board.position.set(1.5, -0.55, 1.15);
      u.board.rotation.set(-0.1, -0.3, -0.28);
      u.handR.position.set(1.28, -1.05, 1.36);
      margo.rotation.z = -0.11;

    } else if (state === 'devastated') {
      u.eyes.forEach(function (e) { eyeState(e, { shut: 0.34 + 0.2 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2)), lookY: -0.6 }); });
      u.brows[0].position.y = 1.56; u.brows[1].position.y = 1.56;
      u.mouth.rotation.z = 0; u.mouth.position.y = 0.36; u.mouth.scale.set(1.1, 1, 1);
      u.board.position.set(1.5, -1.65, 0.95);
      u.board.rotation.set(-0.16, -0.42, 0.55);
      margo.position.y = -0.16;
      margo.rotation.z = -0.04;
    }
    u.hangArm(u.armR, u.handR, u.shoR);
    u.hangArm(u.armL, u.handL, u.shoL);
  }

  var drawn = false;
  function tick() { renderer.render(scene, camera); drawn = true; requestAnimationFrame(tick); }
  tick();

  /* ---- measuring, so legibility is asserted rather than hoped for ------- */
  var pv = new THREE.Vector3(), pbox = new THREE.Box3(), pv2 = new THREE.Vector3();
  function pxHeight(node) {
    pbox.setFromObject(node); pbox.getSize(pv2); pbox.getCenter(pv);
    var top = pv.clone(); top.y += pv2.y / 2;
    var bot = pv.clone(); bot.y -= pv2.y / 2;
    top.project(camera); bot.project(camera);
    return Math.round(Math.abs(top.y - bot.y) * H / 2);
  }

  window.ss = {
    ready: new Promise(function (res) {
      var iv = setInterval(function () { if (drawn) { clearInterval(iv); res(true); } }, 30);
    }),
    set: function (who, state, t) {
      fred.visible = (who === 'fred');
      margo.visible = (who === 'margo');
      frame(who);   /* FIRST: computeCam walks every pose, so it must not be last */
      if (who === 'fred') poseFred(state, t == null ? 0 : t); else poseMargo(state, t == null ? 0 : t);
      renderer.render(scene, camera);
      return true;
    },
    probe: function () {
      var g = renderer.getContext();
      var px = new Uint8Array(4 * 40 * 40);
      g.readPixels(Math.floor(W / 2) - 20, Math.floor(H / 2) - 20, 40, 40, g.RGBA, g.UNSIGNED_BYTE, px);
      var opaque = 0;
      for (var i = 3; i < px.length; i += 4) if (px[i] > 40) opaque++;
      return { opaqueOf1600: opaque };
    },
    /* the features that carry the expression, in pixels of a 980-tall frame.
       These are the numbers a shrink-to-260 has to survive. */
    measure: function (who) {
      var u = (who === 'fred' ? fred : margo).userData;
      pbox.setFromObject(who === 'fred' ? fred : margo); pbox.getSize(pv2);
      var c = CAM[who] || (CAM[who] = computeCam(who));
      /* what the UNION frame claims of the panel: the number that says whether
         the framing is tight, independent of a state that happens to slump */
      var fillPx = Math.round(c.fillY / (2 * c.dist * Math.tan(camera.fov * Math.PI / 360)) * H);
      var u2 = (who === 'fred' ? fred : margo).userData;
      var headBox = new THREE.Box3().setFromObject(u2.head);
      if (u2.bun) headBox.union(new THREE.Box3().setFromObject(u2.bun));
      var hTop = new THREE.Vector3(0, headBox.max.y, headBox.max.z).project(camera);
      var hBot = new THREE.Vector3(0, headBox.min.y, headBox.max.z).project(camera);
      return {
        head: Math.round(Math.abs(hTop.y - hBot.y) * H / 2),
        headCut: (hTop.y > 0.995 || hBot.y < -0.995),
        fill: fillPx,
        whole: pxHeight(who === 'fred' ? fred : margo),
        eye: pxHeight(u.eyes[0]),
        mouth: pxHeight(u.mouth.visible ? u.mouth : u.gob),
        brow: pxHeight(u.brows[0]),
        cropped: (pxHeight(who === 'fred' ? fred : margo) > H - 6)
      };
    }
  };
})();
