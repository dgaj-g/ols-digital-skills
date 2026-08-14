/* cg.js — THE SNACK MACHINE: if/else, one question, two parts (DFM 207d / 209 / 210).
 *
 * WHY THIS WAS REBUILT FROM NOTHING.
 * DAMIEN, 13 Aug 2026, on the version this replaces: "I honestly have not got any
 * idea what it's actually supposed to be showing me. It looks terrible and it's
 * really disappointing... the whole animation needs a complete rethink."
 * The old picture was an ABSTRACT ARCHWAY with chutes and lamps STANDING IN for
 * the if/else block. Nothing on screen was a thing you could point at in Scratch,
 * so there was nothing to recognise later. This one shows the REAL BLOCK, at
 * billboard size, with a real decision happening beside it.
 *
 * WHY A SNACK MACHINE AND NOT THE APPLE AND BOWL (DFM 210, his find).
 * The old animation taught on an apple falling into a bowl — which is Catch It,
 * one of the three contracts a pupil chooses between. His question: "if that's
 * true, then that's a clear advantage for anybody who chooses that first game."
 * He is right. A snack machine belongs to none of the three, so every pupil
 * transfers the same distance and nobody is handed their own answer. It also
 * carries the lesson better: when the money is short the machine SAYS SO, which
 * is FALSE visibly doing something.
 *
 * WHY "IF PART" AND "ELSE PART" AND NOT "MOUTH" (DFM 209).
 * His words: "what on earth does top mouth and else mouth mean? no idea at all."
 * "Mouth" is not Scratch's own word — unlike "hat block", which earned its place
 * by being the real term. It is developer jargon. The block has two GAPS where
 * blocks go; the top one is the IF part and the one underneath is the ELSE part,
 * and the animation says so while pointing at them.
 *
 * RECORDING CONSTRAINTS (inherited — read lib/variable-box/vb.js's header):
 * filmed head-less through Playwright on a software renderer, so no shadow maps,
 * no post-processing, modest geometry, glows are emissive + sprite. Nothing
 * animates itself: record.js calls window.cg.play(n) beat by beat. No Math.random.
 *
 *   window.cg.ready        resolves once the first frame has been drawn
 *   window.cg.play(n)      plays beat n (1..6), resolves when it finishes
 *   window.cg.probe()      pixel samples, proving the canvas is not a black rectangle
 *   window.cg.probeTokens() projected pixel height of the snack and every teaching
 *                          label. The take is REFUSED below the floors: the actor
 *                          being taught >= 110px, every label >= 24px (the unified
 *                          animation law, DFM 207d — the old 90/18 floors passed
 *                          text nobody could read).
 */
(function () {
  var W = 1280, H = 720;
  var NAVY = 0x060D1F;
  /* Scratch's own palette, so the editor never contradicts the picture (DFM 35) */
  var CONTROL = 0xFFAB19;     /* the if/else block itself */
  var SENSING = 0x4C97FF;     /* the question that sits in the pointed slot */
  var LOOKS = 0x9966FF;       /* the blocks that do the doing */
  var TRUE_G = 0x4CBB59, FALSE_A = 0xF2A33C, GOLD_HI = 0xFFD84D;

  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.Fog(NAVY, 26, 52);

  var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 120);
  camera.position.set(0, 0, 12.2);
  camera.lookAt(0, -0.2, 0);

  scene.add(new THREE.AmbientLight(0x8fa6d8, 0.62));
  var key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(3, 8, 9); scene.add(key);
  var warm = new THREE.PointLight(GOLD_HI, 0.45, 30); warm.position.set(-6, 3, 7); scene.add(warm);

  /* ---------- helpers ---------- */
  var LABELS = [];   /* every text mesh, so the render loop can re-upload them */
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
    /* every light label carries a dark outline: the contrast floor is measured on
       rendered pixels now, and white-on-gold failed it without one */
    if (opts.outline !== false) {
      g.lineWidth = Math.round(fs * 0.16); g.strokeStyle = opts.outlineColour || '#0B1220';
      g.lineJoin = 'round'; g.strokeText(text, c.width / 2, c.height / 2 + 2);
    }
    g.fillStyle = opts.colour || '#FFFFFF';
    g.fillText(text, c.width / 2, c.height / 2 + 2);
    var tex = new THREE.CanvasTexture(c);
    /* NPOT-SAFE, AND THIS IS NOT A DETAIL. A label canvas is as wide as its text,
       so it is almost never a power of two. With three.js's default mipmapping and
       repeat wrapping, a non-power-of-two texture renders BLANK on some GL
       backends — and it did: a beat-5 frame came back with every word missing
       while probeTokens still reported 36px, because a mesh with no visible
       texture is still a mesh of the right size. Exactly the trap the law is
       written about: pixel size proves SIZE, never VISIBILITY. */
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 1;
    tex.needsUpdate = true;
    var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    var h = opts.h || 0.5;
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry((c.width / c.height) * h, h), mat);
    mesh.renderOrder = 6;
    /* hold the backing canvas so nothing can collect it out from under the texture */
    mesh.userData.labelCanvas = c;
    LABELS.push(mesh);
    return mesh;
  }
  function glow(colour, size) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 3, 64, 64, 64);
    grd.addColorStop(0, colour); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0
    }));
    sp.scale.set(size, size, 1);
    return sp;
  }
  function slab(w, h, colour, d) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d || 0.55),
      new THREE.MeshStandardMaterial({
        color: colour, roughness: 0.42, metalness: 0.04,
        emissive: new THREE.Color(colour), emissiveIntensity: 0.06
      }));
  }

  /* ================= THE IF/ELSE BLOCK — the hero of the picture =================
     Built to the real block's shape: a top bar carrying the question, a spine down
     the left, and TWO OPEN GAPS where blocks go. The gaps are the whole point, so
     they are wide, obvious, and named. */
  var block = new THREE.Group();
  block.position.set(1.5, 0.1, 0);
  scene.add(block);

  var BW = 7.2, SPINE = 0.75;
  var topBar = slab(BW, 1.35, CONTROL); topBar.position.set(0, 2.05, 0); block.add(topBar);
  var midBar = slab(BW, 1.2, CONTROL); midBar.position.set(0, -0.8, 0); block.add(midBar);
  var botBar = slab(BW, 0.5, CONTROL); botBar.position.set(0, -3.15, 0); block.add(botBar);
  var spine = slab(SPINE, 6.15, CONTROL); spine.position.set(-(BW / 2) + SPINE / 2, -0.55, 0); block.add(spine);

  /* the two gaps, each with its own halo so one can light alone */
  function gapHalo(y) {
    var h = glow('rgba(255,216,77,0.55)', 6.4);
    h.position.set(0.4, y, -0.5);
    block.add(h);
    return h;
  }
  var ifHalo = gapHalo(0.62), elseHalo = gapHalo(-2.0);

  /* the word "if" and the word "else", on the block itself */
  var ifWord = label('if', { colour: '#3B2A02', outline: false, h: 0.62, fs: 96 });
  ifWord.position.set(-2.65, 2.05, 0.32); block.add(ifWord);
  var thenWord = label('then', { colour: '#3B2A02', outline: false, h: 0.5, fs: 96 });
  thenWord.position.set(2.72, 2.05, 0.32); block.add(thenWord);
  var elseWord = label('else', { colour: '#3B2A02', outline: false, h: 0.58, fs: 96 });
  elseWord.position.set(-2.35, -0.8, 0.32); block.add(elseWord);

  /* ---------- the pointed slot, and the question that drops into it ---------- */
  var slotShape = new THREE.Shape();
  (function (w, h) {
    var p = h / 2;
    slotShape.moveTo(-w / 2, 0); slotShape.lineTo(-w / 2 + p, h / 2);
    slotShape.lineTo(w / 2 - p, h / 2); slotShape.lineTo(w / 2, 0);
    slotShape.lineTo(w / 2 - p, -h / 2); slotShape.lineTo(-w / 2 + p, -h / 2);
    slotShape.lineTo(-w / 2, 0);
  })(3.5, 0.95);
  var slotGeo = new THREE.ExtrudeGeometry(slotShape, { depth: 0.22, bevelEnabled: false });

  var emptySlot = new THREE.Mesh(slotGeo, new THREE.MeshStandardMaterial({
    color: 0x8A5E0E, roughness: 0.75, emissive: new THREE.Color(0x2A1B02), emissiveIntensity: 0.2
  }));
  emptySlot.position.set(0.35, 2.05, 0.18); block.add(emptySlot);
  var slotGlow = glow('rgba(255,255,255,0.55)', 4.4);
  slotGlow.position.set(0.35, 2.05, 0.5); block.add(slotGlow);

  var question = new THREE.Group();
  var qPlate = new THREE.Mesh(slotGeo, new THREE.MeshStandardMaterial({
    color: SENSING, roughness: 0.3, metalness: 0.08,
    emissive: new THREE.Color(SENSING), emissiveIntensity: 0.22
  }));
  question.add(qPlate);
  var qText = label('enough money?', { colour: '#FFFFFF', h: 0.44, fs: 96 });
  qText.position.set(0, 0, 0.32); question.add(qText);
  question.position.set(0.35, 2.05, 0.2);
  question.visible = false;
  block.add(question);

  /* the answer, shown ON the question where it is asked */
  var answerT = label('TRUE', { colour: '#DFFFE6', h: 0.5, fs: 96 });
  answerT.position.set(0.35, 3.15, 0.5); answerT.material.opacity = 0; block.add(answerT);
  var answerF = label('FALSE', { colour: '#FFE9C9', h: 0.5, fs: 96 });
  answerF.position.set(0.35, 3.15, 0.5); answerF.material.opacity = 0; block.add(answerF);

  /* ---------- the blocks that live in each gap ---------- */
  function innerBlock(text, y) {
    var g = new THREE.Group();
    var b = slab(4.5, 0.92, LOOKS, 0.4);
    g.add(b);
    var t = label(text, { colour: '#FFFFFF', h: 0.4, fs: 96 });
    t.position.set(0, 0, 0.26); g.add(t);
    g.position.set(0.4, y, 0.1);
    g.visible = false;
    block.add(g);
    return g;
  }
  var doGive = innerBlock('drop the snack', 0.62);
  var doSay = innerBlock('say “not enough”', -2.0);

  /* ---------- the two labels that name the parts ---------- */
  /* PLACED SO THEY FIT THE FRAME. The first cut put these at local x 5.35/5.55 and
     "ELSE PART" — the longer word — ran off the right edge of a 1280 frame. The
     film laws measure DRAWN TEXT BOXES, which these are not (they are meshes), so
     nothing would have caught it but looking at the rendered frame (DFM 146b). */
  var ifPart = label('IF PART', { colour: '#8CF0A6', h: 0.46, fs: 96 });
  ifPart.position.set(4.75, 0.62, 0.4); ifPart.material.opacity = 0; block.add(ifPart);
  var elsePart = label('ELSE PART', { colour: '#FFCE86', h: 0.46, fs: 96 });
  elsePart.position.set(4.95, -2.0, 0.4); elsePart.material.opacity = 0; block.add(elsePart);

  var title = label('if / else', { colour: '#FFD84D', h: 0.78, fs: 110 });
  title.position.set(1.5, -4.35, 0.4); title.material.opacity = 0; scene.add(title);

  /* ================= THE SNACK MACHINE — the story beside the block =============
     Belongs to none of the three contracts (DFM 210). Its two outcomes are both
     obviously real: a snack drops, or the machine says it cannot. */
  var machine = new THREE.Group();
  machine.position.set(-5.15, -0.1, 0);
  scene.add(machine);

  var body = slab(3.5, 6.4, 0x24406E, 1.0); body.position.set(0, 0, 0); machine.add(body);
  var window_ = slab(2.5, 3.0, 0x0E1B33, 0.2); window_.position.set(0, 1.35, 0.55); machine.add(window_);
  /* three snacks on the shelf, so the machine reads as a machine */
  [-0.75, 0, 0.75].forEach(function (x, i) {
    var s = slab(0.6, 0.85, [0xE8574A, 0xF2C044, 0x59C059][i], 0.14);
    s.position.set(x, 1.9, 0.66); machine.add(s);
  });
  var shelf = slab(2.5, 0.1, 0x40587F, 0.3); shelf.position.set(0, 1.35, 0.66); machine.add(shelf);

  /* the display panel — where FALSE speaks */
  var panel = slab(2.5, 0.8, 0x0B1220, 0.2); panel.position.set(0, -0.75, 0.56); machine.add(panel);
  var panelText = label('not enough', { colour: '#FF9E6B', h: 0.34, fs: 96 });
  panelText.position.set(0, -0.75, 0.7); panelText.material.opacity = 0; machine.add(panelText);

  /* the coin slot and the tray */
  var slotPlate = slab(1.0, 0.16, 0x9FB2D6, 0.2); slotPlate.position.set(0.95, 0.35, 0.56); machine.add(slotPlate);
  var tray = slab(2.4, 0.9, 0x16273F, 0.5); tray.position.set(0, -2.4, 0.5); machine.add(tray);

  var coin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 22),
    new THREE.MeshStandardMaterial({ color: GOLD_HI, roughness: 0.3, metalness: 0.5,
      emissive: new THREE.Color(GOLD_HI), emissiveIntensity: 0.25 }));
  coin.rotation.x = Math.PI / 2;
  coin.position.set(0.95, 2.6, 0.62);
  coin.visible = false;
  machine.add(coin);

  /* THE SNACK — the actor the law measures. Big enough to read as a thing. */
  var snack = new THREE.Group();
  var snackBody = slab(1.15, 1.55, 0xE8574A, 0.34);
  snack.add(snackBody);
  var snackBand = slab(1.19, 0.34, 0xFFD84D, 0.36); snackBand.position.set(0, 0.1, 0.02);
  snack.add(snackBand);
  snack.position.set(0, 1.0, 0.66);
  snack.visible = false;
  machine.add(snack);

  var machineGlow = glow('rgba(255,216,77,0.5)', 7.2);
  machineGlow.position.set(0, 0, -0.6); machine.add(machineGlow);

  var bigQ = label('?', { colour: '#FFD84D', h: 1.5, fs: 150 });
  bigQ.position.set(-5.15, 2.2, 1.4); bigQ.material.opacity = 0; scene.add(bigQ);

  /* ---------- animation plumbing ---------- */
  function tl() { return gsap.timeline({ paused: false }); }

  /* one coin, one decision. `ok` decides which part runs — and only one ever does. */
  function oneCoin(t, at, ok, hold) {
    hold = hold || 0;
    t.call(function () {
      coin.visible = true; coin.position.set(0.95, 2.6, 0.62);
      snack.visible = false; snack.position.set(0, 1.0, 0.66);
      panelText.material.opacity = 0;
      answerT.material.opacity = 0; answerF.material.opacity = 0;
      ifHalo.material.opacity = 0; elseHalo.material.opacity = 0;
    }, null, at);
    t.to(coin.position, { y: 0.35, duration: 0.55, ease: 'power2.in' }, at);
    t.call(function () { coin.visible = false; }, null, at + 0.55);
    /* the question is asked */
    t.to(qPlate.material, { emissiveIntensity: 0.85, duration: 0.2 }, at + 0.6);
    t.to(slotGlow.material, { opacity: 0.75, duration: 0.2 }, at + 0.6);
    if (hold) t.to({}, { duration: hold }, at + 0.8);
    t.to(qPlate.material, { emissiveIntensity: 0.22, duration: 0.4 }, at + 0.85 + hold);
    t.to(slotGlow.material, { opacity: 0.25, duration: 0.4 }, at + 0.85 + hold);
    /* the answer, then exactly ONE part */
    var ans = ok ? answerT : answerF;
    var halo = ok ? ifHalo : elseHalo;
    t.to(ans.material, { opacity: 1, duration: 0.22 }, at + 0.95 + hold);
    t.to(halo.material, { opacity: 0.9, duration: 0.3 }, at + 1.1 + hold);
    if (ok) {
      t.call(function () { snack.visible = true; }, null, at + 1.3 + hold);
      t.to(snack.position, { y: -2.25, duration: 0.75, ease: 'bounce.out' }, at + 1.3 + hold);
    } else {
      t.to(panelText.material, { opacity: 1, duration: 0.3 }, at + 1.3 + hold);
    }
    t.to(ans.material, { opacity: 0, duration: 0.4 }, at + 2.5 + hold);
    t.to(halo.material, { opacity: 0, duration: 0.5 }, at + 2.6 + hold);
    return t;
  }

  var beats = {
    /* 1 — a machine that has to choose */
    1: function () {
      var t = tl();
      machine.scale.setScalar(0.01); block.visible = false;
      t.to(machine.scale, { x: 1, y: 1, z: 1, duration: 1.0, ease: 'back.out(1.3)' }, 0.1);
      t.to(machineGlow.material, { opacity: 0.5, duration: 0.6 }, 0.7);
      t.call(function () { coin.visible = true; coin.position.set(0.95, 2.6, 0.62); }, null, 1.2);
      t.to(coin.position, { y: 0.35, duration: 0.7, ease: 'power2.in' }, 1.2);
      t.call(function () { coin.visible = false; }, null, 1.9);
      t.to(bigQ.material, { opacity: 1, duration: 0.5 }, 2.1);
      t.to({}, { duration: 2.4 });
      return t;
    },

    /* 2 — the real block arrives, and the question drops into the pointed slot */
    2: function () {
      var t = tl();
      t.to(bigQ.material, { opacity: 0, duration: 0.4 }, 0);
      t.call(function () { block.visible = true; block.scale.setScalar(0.01); }, null, 0.2);
      t.to(block.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.25)' }, 0.2);
      /* the empty slot asks to be filled */
      t.to(slotGlow.material, { opacity: 0.85, duration: 0.4 }, 1.2);
      t.to(emptySlot.material, { emissiveIntensity: 0.65, duration: 0.4 }, 1.2);
      /* the question flies in from the machine and snaps home */
      t.call(function () { question.visible = true; question.position.set(-6.4, 3.4, 0.9); }, null, 2.0);
      t.to(question.position, { x: 0.35, y: 2.05, z: 0.2, duration: 0.9, ease: 'back.out(1.6)' }, 2.0);
      t.to(slotGlow.material, { opacity: 0.3, duration: 0.5 }, 2.9);
      t.to({}, { duration: 3.6 });
      return t;
    },

    /* 3 — TRUE: the IF part runs, and the snack really drops */
    3: function () {
      var t = tl();
      t.to(ifPart.material, { opacity: 1, duration: 0.4 }, 0.2);
      t.call(function () { doGive.visible = true; doGive.scale.setScalar(0.01); }, null, 0.3);
      t.to(doGive.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.4)' }, 0.3);
      oneCoin(t, 0.9, true, 1.3);
      t.to({}, { duration: 5.4 });
      return t;
    },

    /* 4 — FALSE: the ELSE part runs. THE misconception, killed here: the machine
       SAYS something. FALSE is not nothing happening. */
    4: function () {
      var t = tl();
      t.to(elsePart.material, { opacity: 1, duration: 0.4 }, 0.2);
      t.call(function () { doSay.visible = true; doSay.scale.setScalar(0.01); }, null, 0.3);
      t.to(doSay.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.4)' }, 0.3);
      oneCoin(t, 0.9, false, 1.3);
      t.to({}, { duration: 5.4 });
      return t;
    },

    /* 5 — three coins: one part each time, never both */
    5: function () {
      var t = tl();
      oneCoin(t, 0.0, true);
      oneCoin(t, 2.9, false);
      oneCoin(t, 5.8, true);
      t.to({}, { duration: 8.6 });
      return t;
    },

    /* 6 — the whole block, named */
    6: function () {
      var t = tl();
      t.to(machine.scale, { x: 0.72, y: 0.72, z: 0.72, duration: 1.0, ease: 'sine.inOut' }, 0);
      t.to(machineGlow.material, { opacity: 0.18, duration: 0.8 }, 0);
      t.to(ifPart.material, { opacity: 1, duration: 0.4 }, 0.3);
      t.to(elsePart.material, { opacity: 1, duration: 0.4 }, 0.5);
      t.to(ifHalo.material, { opacity: 0.5, duration: 0.6 }, 0.7);
      t.to(elseHalo.material, { opacity: 0.5, duration: 0.6 }, 0.9);
      t.to(title.material, { opacity: 1, duration: 0.6 }, 1.1);
      t.to(camera.position, { z: 13.4, duration: 1.6, ease: 'sine.inOut',
        onUpdate: function () { camera.lookAt(0.6, -0.4, 0); } }, 0.4);
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
    /* THE UNIFIED ANIMATION LAW (DFM 207d). Projects the actor and every teaching
       label to screen pixels so the recorder can REFUSE a take, rather than anyone
       judging "big enough" by eye (DFM 146b/192e).
       MEASURE THE MESH, NOT ITS HALO: Box3.setFromObject swallows the glow Sprite
       and once reported a 1.75-unit flag at 441px — a gate that would have passed
       the very defect it exists to catch. */
    probeTokens: function () {
      var want = [
        { name: 'snack', obj: snack },
        { name: 'QUESTION', obj: qText },
        { name: 'TRUE', obj: answerT },
        { name: 'FALSE', obj: answerF },
        { name: 'IF PART', obj: ifPart },
        { name: 'ELSE PART', obj: elsePart }
      ];
      var out = [];
      want.forEach(function (w) {
        var o = w.obj;
        if (!o || !o.visible) return;
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
    /* THE VISIBILITY PROBE (DFM 146b). probeTokens measures how BIG a label is;
       this measures whether its words are actually drawn. Counts the label-coloured
       pixels inside each teaching label's own screen rect — a blank texture scores
       zero and the recorder refuses the take. */
    probeInk: function () {
      var g = renderer.domElement.getContext('webgl2') || renderer.domElement.getContext('webgl');
      var want = [{ name: 'QUESTION', obj: qText }, { name: 'IF PART', obj: ifPart },
        { name: 'ELSE PART', obj: elsePart }];
      var out = [];
      want.forEach(function (w) {
        var o = w.obj;
        if (!o.visible || (o.material && o.material.opacity < 0.05)) return;
        var box = new THREE.Box3().setFromObject(o);
        var a = new THREE.Vector3(box.min.x, box.min.y, box.max.z).project(camera);
        var b2 = new THREE.Vector3(box.max.x, box.max.y, box.max.z).project(camera);
        var x0 = Math.max(0, Math.round((Math.min(a.x, b2.x) + 1) / 2 * W));
        var y0 = Math.max(0, Math.round((Math.min(a.y, b2.y) + 1) / 2 * H));
        var w2 = Math.min(W - x0, Math.round(Math.abs(b2.x - a.x) / 2 * W));
        var h2 = Math.min(H - y0, Math.round(Math.abs(b2.y - a.y) / 2 * H));
        if (w2 < 2 || h2 < 2) return;
        var px = new Uint8Array(4 * w2 * h2);
        g.readPixels(x0, y0, w2, h2, g.RGBA, g.UNSIGNED_BYTE, px);
        /* the backdrop is near-black navy; ANY drawn glyph is far brighter than it.
           (The first cut tested r>150 AND g>150, which the green IF PART label
           fails on its red channel — a probe that reports zero for text that is
           plainly there is worse than no probe at all.) */
        var lit = 0;
        for (var i = 0; i < px.length; i += 4) {
          if (px[i] + px[i + 1] + px[i + 2] > 330) lit++;
        }
        out.push({ name: w.name, inkPixels: lit });
      });
      return out;
    },
    probe: function () {
      var g = renderer.domElement.getContext('webgl2') || renderer.domElement.getContext('webgl');
      var px = new Uint8Array(4 * 40 * 40);
      var out = [];
      /* one sample on the machine, one on the block's top bar, one on a gap */
      [[300, 360], [700, 240], [760, 420]].forEach(function (p) {
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

  /* THE TEXT RE-UPLOAD. A beat-5 frame came back with every word gone while the
     drawing buffer still contained them — the software renderer these films are
     recorded on evicts textures under pressure, and three.js will not re-upload a
     CanvasTexture unless it is told to. Re-flagging the label textures a few times
     a second is cheap (they are small) and makes the loss self-heal, instead of
     shipping a film with silent gaps where the teaching words should be. */
  var frame = 0;
  (function loop() {
    requestAnimationFrame(loop);
    if ((frame++ % 20) === 0) {
      for (var i = 0; i < LABELS.length; i++) {
        if (LABELS[i].material && LABELS[i].material.map) LABELS[i].material.map.needsUpdate = true;
      }
    }
    renderer.render(scene, camera);
  })();
})();
