/* cg.js — THE CHOICE GATE: if/else, one question, two mouths (DFM 191c,
   on the DFM 174/180 pattern).

   DAMIEN, 11 Aug 2026: "could we add animations to aid understanding of concepts
   that they meet (I loved the variable one you did)?" — so Lesson 5 gets the
   block its whole hour turns on. The lesson's own words: selection "is the
   difference between a slideshow and a game".

   The thing an 11-year-old gets wrong about if/else is FALSE. They read it as
   "nothing happens". So the gate has TWO lit chutes and an amber lamp, never a
   red cross: FALSE is not failure, it is the else mouth doing its job. Beat 4
   exists for that sentence alone, and beat 5 proves "exactly one, never both".

   RECORDING CONSTRAINTS (inherited from lib/variable-box/vb.js — read its header):
   filmed head-less through Playwright on a software renderer, so no shadow maps,
   no post-processing, modest geometry, glows are emissive + sprite. Nothing
   animates itself: record.js calls window.cg.play(n) beat by beat. No Math.random.

   window.cg.ready   resolves once the first frame has been drawn
   window.cg.play(n) plays beat n (1..6), resolves when it finishes
   window.cg.probe() pixel samples, proving the canvas is not a black rectangle
   window.cg.probeTokens() projected pixel height of the apple and the four
                     teaching labels; record refuses a take below the floors
                     (apple >= 90px, labels >= 18px) — L5 spec Part C. */
(function () {
  var W = 1280, H = 720;
  var NAVY = 0x060D1F;
  /* Scratch's own palette, so the editor never contradicts the picture (DFM 35) */
  var CONTROL = 0xFFAB19, SENSING = 0x4C97FF, VARS = 0xFF8C1A, OPS = 0x59C059;
  var YES = 0x4CBB59, NO = 0xF2A33C, GOLD_HI = 0xFFD84D;

  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.Fog(NAVY, 20, 44);

  var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 120);
  camera.position.set(0, 0.9, 12.2);
  camera.lookAt(0, 0.1, 0);

  scene.add(new THREE.AmbientLight(0x8fa6d8, 0.5));
  var key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(3, 8, 7); scene.add(key);
  var warm = new THREE.PointLight(GOLD_HI, 0.5, 28); warm.position.set(-5, 3, 6); scene.add(warm);

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
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry((c.width / c.height) * h, h), mat);
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

  /* ---------- the gate ---------- */
  var gate = new THREE.Group();
  gate.position.set(0, 1.5, 0);
  scene.add(gate);

  var gateMat = new THREE.MeshStandardMaterial({
    color: CONTROL, roughness: 0.42, metalness: 0.05,
    emissive: new THREE.Color(CONTROL), emissiveIntensity: 0.06
  });
  var arch = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.5, 1.2), gateMat);
  gate.add(arch);
  var postGeo = new THREE.BoxGeometry(0.5, 2.2, 1.2);
  [-2.55, 2.55].forEach(function (x) {
    var p = new THREE.Mesh(postGeo, gateMat);
    p.position.set(x, -1.85, 0);
    gate.add(p);
  });

  /* the QUESTION, in a Sensing-blue diamond window */
  var diamond = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.86, 0.34),
    new THREE.MeshStandardMaterial({
      color: SENSING, roughness: 0.3, metalness: 0.1,
      emissive: new THREE.Color(SENSING), emissiveIntensity: 0.18
    }));
  diamond.position.set(0, 0, 0.66);
  gate.add(diamond);
  var qText = label('touching Bowl?', { colour: '#FFFFFF', h: 0.34, fs: 92 });
  qText.position.set(0, 0, 0.85);
  gate.add(qText);
  var diamondGlow = glow('rgba(76,151,255,0.6)', 5.2);
  diamondGlow.position.set(0, 0, 0.4);
  diamondGlow.material.opacity = 0;
  gate.add(diamondGlow);

  /* the two answer lamps — amber, never red: FALSE is not failure.
     POLISHED 12 Aug 2026 (L5 spec Part C, judged from the beat stills): the
     lamps were "near-invisible until lit" and their labels too small to read on
     a projector. Bulb 0.26 -> 0.40, halo 2.6 -> 3.6, and the YES/NO labels 0.26
     -> 0.42 units (1.6x, the spec's floor). The label also drops clear of the
     bigger bulb, and the unlit label is brighter (#9FB4D8 -> #C6D6F0), because a
     lamp you cannot read before it lights teaches nothing about the choice that
     is about to be made.
     AND THE THING THE NUMBERS COULD NOT SEE: at 1.6x the label no longer fitted
     the dark gap — it landed half on the gold arch, pale blue on gold, which is
     LESS readable than the small version it replaced. Measuring pixel height
     proves size, not contrast. So each label now carries its own dark plate,
     exactly as the score/lives counters do, and reads on any background. */
  function lamp(x, colour, text) {
    var g = new THREE.Group();
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.40, 20, 16),
      new THREE.MeshStandardMaterial({
        color: 0x2A3550, roughness: 0.4,
        emissive: new THREE.Color(colour), emissiveIntensity: 0
      }));
    g.add(bulb);
    var ha = glow(colour === YES ? 'rgba(76,187,89,0.75)' : 'rgba(242,163,60,0.75)', 3.6);
    ha.material.opacity = 0;
    g.add(ha);
    var t = label(text, { colour: '#C6D6F0', h: 0.42, fs: 96 });
    var tw = t.geometry.parameters.width;
    var plate = new THREE.Mesh(new THREE.PlaneGeometry(tw + 0.26, 0.62),
      new THREE.MeshBasicMaterial({ color: 0x0B1428, transparent: true, opacity: 0.92 }));
    plate.position.set(0, -0.80, -0.01);
    plate.renderOrder = 3;
    g.add(plate);
    t.position.set(0, -0.80, 0);
    g.add(t);
    g.position.set(x, 0.05, 0.9);
    g.userData = { bulb: bulb, halo: ha, txt: t, plate: plate };
    gate.add(g);
    return g;
  }
  /* pushed out from ±2.0 so the bigger bulbs clear the question diamond */
  var lampYes = lamp(-2.25, YES, 'YES');
  var lampNo = lamp(2.25, NO, 'NO');

  /* ---------- the two chutes ---------- */
  function chute(x, colour, blockText, counterName, startVal) {
    var g = new THREE.Group();
    g.position.set(x, -1.9, 0);
    var blockMat = new THREE.MeshStandardMaterial({
      color: colour, roughness: 0.42, metalness: 0.05,
      emissive: new THREE.Color(colour), emissiveIntensity: 0
    });
    var block = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.62, 0.6), blockMat);
    g.add(block);
    var bt = label(blockText, { colour: '#20160A', h: 0.28, fs: 90 });
    bt.position.set(0, 0, 0.32);
    g.add(bt);
    /* the counter this branch moves */
    /* the counter reads like a Scratch STAGE MONITOR, and it lives high in the
       frame: a caption band sits across the bottom ~130px, and DFM 141(a) forbids
       a caption covering the thing it points at. The frame audit caught it. */
    var cy = 5.35, cx = (x < 0 ? -1.15 : 1.15);
    var plate = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x14213C, roughness: 0.5 }));
    plate.position.set(cx, cy, 0);
    g.add(plate);
    var nameT = label(counterName, { colour: '#9FB4D8', h: 0.26, fs: 80 });
    nameT.position.set(cx - 0.55, cy, 0.14);
    g.add(nameT);
    var numT = label(String(startVal), { colour: '#FFD84D', h: 0.42, fs: 110 });
    numT.position.set(cx + 0.6, cy, 0.14);
    g.add(numT);
    var ha = glow(colour === VARS ? 'rgba(255,140,26,0.5)' : 'rgba(255,140,26,0.5)', 5.0);
    ha.position.set(0, -0.3, -0.6);
    ha.material.opacity = 0;
    g.add(ha);
    scene.add(g);
    g.userData = { mat: blockMat, halo: ha, num: numT, val: startVal, nameT: nameT, numPos: { x: cx + 0.6, y: cy, z: 0.14 } };
    return g;
  }
  var chuteTop = chute(-3.3, VARS, 'change score by 1', 'score', 0);
  var chuteElse = chute(3.3, VARS, 'change lives by -1', 'lives', 3);

  /* 0.22 -> 0.34 units (1.55x): these two labels carry the whole vocabulary
     of the lesson's QA outcomes, and they were the smallest text in the frame. */
  var mouthTop = label('TOP MOUTH', { colour: '#7FE39A', h: 0.34, fs: 92 });
  mouthTop.position.set(-3.80, -1.10, 0.7);
  mouthTop.material.opacity = 0;
  scene.add(mouthTop);
  var mouthElse = label('ELSE MOUTH', { colour: '#F2C67C', h: 0.34, fs: 92 });
  mouthElse.position.set(3.80, -1.10, 0.7);
  mouthElse.material.opacity = 0;
  scene.add(mouthElse);

  function setCounter(chuteG, v) {
    var old = chuteG.userData.num;
    chuteG.remove(old);
    var n = label(String(v), { colour: '#FFD84D', h: 0.42, fs: 110 });
    var np = chuteG.userData.numPos;
    n.position.set(np.x, np.y, np.z);
    chuteG.add(n);
    chuteG.userData.num = n;
    chuteG.userData.val = v;
    gsap.fromTo(n.scale, { x: 1.6, y: 1.6 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2)' });
  }

  /* ---------- the apple, and the bowl ---------- */
  /* THE APPLE IS THE STAR AND IT READ SMALL (~60px) — L5 spec Part C. Scaled
     x1.5 in the GEOMETRY, not with apple.scale: the beats animate that channel
     (they shrink it to 0.01 as it lands), so a base scale would be wiped by the
     first tween. Radius 0.42 -> 0.63, and the stalk with it. */
  var apple = new THREE.Group();
  var appleBody = new THREE.Mesh(new THREE.SphereGeometry(0.63, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xE23B2E, roughness: 0.35 }));
  apple.add(appleBody);
  var stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0x6B4A2B, roughness: 0.7 }));
  stalk.position.y = 0.69;
  apple.add(stalk);
  /* THE APPLE FLIES IN FRONT OF THE GATE, AND PAUSES ABOVE IT.
     Scaling it x1.5 made it bigger and STILL invisible: it fell to y=1.5, which
     is dead centre of the arch beam (world y 0.75..2.25, depth z -0.6..0.6), so
     the star of the animation spent its naming pause INSIDE the gate with only
     its stalk showing. probeTokens measured 120px of apple that nobody could
     see — pixel height proves size, never visibility, and the rendered frame is
     what caught it (DFM 146b). It now travels at z = 1.05, clear of the arch,
     the diamond and the lamps, and pauses at y = 3.05 against the dark sky. */
  apple.position.set(0, 6.4, 1.05);
  apple.visible = false;
  scene.add(apple);

  var bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.55, 0.62, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x4C97FF, roughness: 0.4, side: THREE.DoubleSide }));
  bowl.position.set(0, -0.75, 0.4);
  scene.add(bowl);

  /* the real Scratch if/else outline that materialises in beat 6 */
  var realBlock = new THREE.Group();
  var rbMat = new THREE.LineBasicMaterial({ color: CONTROL });
  function outline(w, h, x, y) {
    var geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, 1.3));
    var m = new THREE.LineSegments(geo, rbMat);
    m.position.set(x, y, 0);
    realBlock.add(m);
  }
  outline(9.6, 1.5, 0, 1.5);        /* the if/else header, around the gate */
  outline(9.6, 1.4, 0, -1.9);       /* the top mouth */
  outline(9.6, 1.4, 0, -3.6);       /* the else mouth */
  realBlock.visible = false;
  scene.add(realBlock);
  var rbLabel = label('if / else', { colour: '#FFAB19', h: 0.42, fs: 110 });
  rbLabel.position.set(-4.2, 2.55, 0.8);
  rbLabel.material.opacity = 0;
  scene.add(rbLabel);

  var STARS = [
    [-8.6, 5.0, -13], [7.1, 5.8, -14], [-3.4, 6.4, -12], [9.2, 3.9, -13],
    [-9.9, 1.8, -15], [2.6, 7.0, -12], [10.2, 6.2, -16], [-6.7, 6.9, -13],
    [4.6, 4.7, -15], [-2.1, 7.5, -14], [7.6, 2.5, -12], [-8.0, 3.7, -16]
  ];
  var starMat = new THREE.MeshBasicMaterial({ color: 0xCFE0FF, transparent: true, opacity: 0.5 });
  var starGeo = new THREE.SphereGeometry(0.045, 6, 6);
  STARS.forEach(function (p) {
    var s = new THREE.Mesh(starGeo, starMat);
    s.position.set(p[0], p[1], p[2]);
    scene.add(s);
  });

  function frame() {
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  var tl = function () { return gsap.timeline({ defaults: { ease: 'power3.out' } }); };

  /* one apple: falls to the gate, the gate answers, the apple takes ONE chute.
     `hold` is the NAMING PAUSE (L5 spec Part C, the hat-block's pacing law): the
     apple stops at the gate long enough for the caption to name what is being
     decided, before anything moves. Beats 3 and 4 use it — they are the teaching
     moments. Beat 5 passes 0 on purpose: its whole point is the RHYTHM of apple
     after apple, and a pause in each would turn it into three slow repeats. */
  function oneApple(t, at, caught, endVal, hold) {
    hold = hold || 0;
    var lampG = caught ? lampYes : lampNo;
    var chuteG = caught ? chuteTop : chuteElse;
    t.call(function () {
      apple.visible = true;
      apple.position.set(0, 6.4, 1.05);
      apple.scale.setScalar(1);
      bowl.visible = false;   /* the chutes tell the story from beat 3 on */
    }, null, at);
    t.to(apple.position, { y: 3.05, duration: 0.75, ease: 'power2.in' }, at);
    /* the question pulses as it is asked */
    t.to(diamondGlow.material, { opacity: 0.9, duration: 0.18 }, at + 0.7);
    if (hold) t.to({}, { duration: hold }, at + 0.88);   /* the naming pause */
    t.to(diamondGlow.material, { opacity: 0.25, duration: 0.5 }, at + 0.9 + hold);
    /* the answer */
    t.to(lampG.userData.bulb.material, { emissiveIntensity: 1.6, duration: 0.16 }, at + 0.95 + hold);
    t.to(lampG.userData.halo.material, { opacity: 0.95, duration: 0.16 }, at + 0.95 + hold);
    t.to(lampG.userData.txt.material, { opacity: 1, duration: 0.16 }, at + 0.95 + hold);
    /* down exactly one chute */
    t.to(apple.position, { x: chuteG.position.x, duration: 0.5, ease: 'power2.inOut' }, at + 1.1 + hold);
    t.to(apple.position, { y: -1.9, duration: 0.5, ease: 'power2.in' }, at + 1.2 + hold);
    t.to(chuteG.userData.mat, { emissiveIntensity: 0.9, duration: 0.18 }, at + 1.7 + hold);
    t.to(chuteG.userData.halo.material, { opacity: 0.85, duration: 0.2 }, at + 1.7 + hold);
    t.call(function () { setCounter(chuteG, endVal); }, null, at + 1.82 + hold);
    t.to(apple.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3 }, at + 1.85 + hold);
    t.to(chuteG.userData.mat, { emissiveIntensity: 0, duration: 0.6 }, at + 2.1 + hold);
    t.to(chuteG.userData.halo.material, { opacity: 0, duration: 0.6 }, at + 2.1 + hold);
    t.to(lampG.userData.bulb.material, { emissiveIntensity: 0, duration: 0.5 }, at + 2.2 + hold);
    t.to(lampG.userData.halo.material, { opacity: 0, duration: 0.5 }, at + 2.2 + hold);
    t.call(function () { apple.visible = false; }, null, at + 2.3 + hold);
  }

  var beats = {
    /* 1 — the moment every game is full of */
    1: function () {
      var t = tl();
      gate.scale.setScalar(0.01);
      chuteTop.scale.setScalar(0.01);
      chuteElse.scale.setScalar(0.01);
      t.to(gate.scale, { x: 1, y: 1, z: 1, duration: 1.0, ease: 'back.out(1.3)' }, 0.1);
      t.call(function () { apple.visible = true; apple.position.set(0, 6.4, 1.05); }, null, 0.9);
      t.to(apple.position, { y: 3.3, duration: 1.1, ease: 'power2.in' }, 0.9);
      t.to(apple.position, { y: 3.0, duration: 0.9, ease: 'sine.inOut' }, 2.0);
      t.to({}, { duration: 2.2 });
      return t;
    },

    /* 2 — ONE question, and it only ever answers yes or no */
    2: function () {
      var t = tl();
      t.to(diamondGlow.material, { opacity: 0.9, duration: 0.5 }, 0.1);
      t.to(diamond.scale, { x: 1.08, y: 1.18, duration: 0.28 }, 0.1);
      t.to(diamond.scale, { x: 1, y: 1, duration: 0.6, ease: 'elastic.out(1,0.45)' }, 0.4);
      t.to(diamond.material, { emissiveIntensity: 0.6, duration: 0.4 }, 0.1);
      /* both lamps introduce themselves, then go dark again */
      [lampYes, lampNo].forEach(function (l, i) {
        t.to(l.userData.bulb.material, { emissiveIntensity: 1.4, duration: 0.3 }, 1.2 + i * 0.5);
        t.to(l.userData.halo.material, { opacity: 0.85, duration: 0.3 }, 1.2 + i * 0.5);
        t.to(l.userData.bulb.material, { emissiveIntensity: 0, duration: 0.5 }, 2.5 + i * 0.3);
        t.to(l.userData.halo.material, { opacity: 0, duration: 0.5 }, 2.5 + i * 0.3);
      });
      t.to(diamondGlow.material, { opacity: 0.25, duration: 0.6 }, 3.1);
      t.to({}, { duration: 3.6 });
      return t;
    },

    /* 3 — TRUE: the top mouth runs */
    3: function () {
      var t = tl();
      t.to(chuteTop.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(1.3)' }, 0);
      t.to(mouthTop.material, { opacity: 1, duration: 0.4 }, 0.5);
      oneApple(t, 0.9, true, 1, 1.2);
      t.to({}, { duration: 5.2 });
      return t;
    },

    /* 4 — FALSE: the else mouth runs. THE misconception, killed here. */
    4: function () {
      var t = tl();
      t.to(chuteElse.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(1.3)' }, 0);
      t.to(mouthElse.material, { opacity: 1, duration: 0.4 }, 0.5);
      oneApple(t, 0.9, false, 2, 1.2);
      t.to({}, { duration: 5.2 });
      return t;
    },

    /* 5 — every apple, exactly ONE mouth. Never both. */
    5: function () {
      var t = tl();
      oneApple(t, 0.0, true, 2);
      oneApple(t, 2.5, false, 1);
      oneApple(t, 5.0, true, 3);
      t.to({}, { duration: 7.6 });
      return t;
    },

    /* 6 — the picture becomes the real block */
    6: function () {
      var t = tl();
      t.call(function () { realBlock.visible = true; }, null, 0.2);
      realBlock.children.forEach(function (o, i) {
        o.scale.setScalar(0.01);
        t.to(o.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(1.2)' }, 0.2 + i * 0.22);
      });
      t.to(rbLabel.material, { opacity: 1, duration: 0.5 }, 1.0);
      t.to(camera.position, { z: 13.6, y: 0.4, duration: 1.6, ease: 'sine.inOut',
        onUpdate: function () { camera.lookAt(0, -0.5, 0); } }, 0.6);
      t.to(gateMat, { emissiveIntensity: 0.35, duration: 0.6 }, 1.4);
      t.to(diamondGlow.material, { opacity: 0.7, duration: 0.6 }, 1.4);
      [chuteTop, chuteElse].forEach(function (c, i) {
        t.to(c.userData.halo.material, { opacity: 0.55, duration: 0.5 }, 1.6 + i * 0.2);
      });
      t.to({}, { duration: 4.4 });
      return t;
    }
  };

  window.__scene = scene; window.__cam = camera;
  window.cg = {
    ready: new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); }),
    play: function (n) {
      return new Promise(function (res) {
        var t = beats[n]();
        t.eventCallback('onComplete', res);
      });
    },
    /* THE LEGIBILITY GATE (L5 spec Part C; same contract as hb.probeTokens).
       Projects the apple and the four teaching labels to screen pixels so the
       recorder can REFUSE a take, rather than anyone judging "big enough" by eye
       (DFM 146b/192e).
       MEASURE THE OBJECT, NOT ITS HALO: Box3.setFromObject swallows the glow
       Sprite and reported the hat-block's green flag at 441px when the flag is
       1.75 units — a gate that would have passed the very defect it exists to
       catch. Meshes only, exactly as hb.probeTokens() does. */
    probeTokens: function () {
      var want = [
        { name: 'apple', obj: apple },
        { name: 'YES', obj: lampYes.userData.txt },
        { name: 'NO', obj: lampNo.userData.txt },
        { name: 'TOP MOUTH', obj: mouthTop },
        { name: 'ELSE MOUTH', obj: mouthElse }
      ];
      var out = [];
      want.forEach(function (w) {
        var o = w.obj;
        if (!o || !o.visible) return;
        /* a label that has faded to nothing is not on screen, whatever its box says */
        if (o.material && o.material.transparent && o.material.opacity < 0.05) return;
        var box = new THREE.Box3();
        o.traverse(function (n) { if (n.isMesh && n.geometry) box.expandByObject(n); });
        if (box.isEmpty()) return;
        var c = box.getCenter(new THREE.Vector3());
        var top = new THREE.Vector3(c.x, box.max.y, c.z).project(camera);
        var bot = new THREE.Vector3(c.x, box.min.y, c.z).project(camera);
        out.push({ name: w.name, px: Math.round(Math.abs(top.y - bot.y) / 2 * H) });
      });
      return out;
    },
    probe: function () {
      var g = renderer.domElement.getContext('webgl2') || renderer.domElement.getContext('webgl');
      var px = new Uint8Array(4 * 40 * 40);
      var out = [];
      [[420, 380], [640, 400], [860, 380]].forEach(function (p) {
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
