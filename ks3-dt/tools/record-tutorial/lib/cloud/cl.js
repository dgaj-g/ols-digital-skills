/* cl.js — WHAT THE CLOUD ACTUALLY IS (DFM 253a, SIDEQUEST_ROUND2_SPEC Job 1).
 *
 * WHY IT EXISTS. Damien sat the finished side quest on 23 Aug 2026 and found the
 * opening card "talks about clouds as if the pupils are going to know what the
 * cloud means", and that it names Google Drive but never OneDrive. His fix, and
 * his bar: the variable-box animation (DFM 174/180). His warning, of record:
 * "since then, I've had to ask you to redo any other ones that you've done for
 * me. So get it right the first time."
 *
 * SO EVERY ACCUMULATED ANIMATION LAW IS BAKED IN HERE, not remembered:
 *  · DFM 192e — every actor is a PHYSICALLY RECOGNISABLE THING, large enough to
 *    read, on screen long enough to be named. No abstract orbs, no archways
 *    standing in for ideas: a monitor, a keyboard, a document, a building with
 *    lit windows and a sign, a laptop, a phone, folders.
 *  · DFM 207d — ONE legibility law, MEASURED at each teaching moment, never
 *    judged by eye: the actor being taught >= 110px, every teaching label
 *    >= 24px, and the contrast of every teaching label >= 4.5:1. The scene file
 *    refuses the take below any of the three.
 *  · DFM 121a/141a — nothing that names a thing may sit on top of the thing it
 *    names, and everything a caption points at is in frame while it shows.
 *  · One new actor or idea per beat, six beats, in the order the spec fixes.
 *  · DFM 174/35 — simplified WITHOUT teaching a falsehood. Data centres really
 *    do not switch off; the cloud SHOWS you your work rather than sending your
 *    file away; a cloud-made document really is not inside her computer.
 *
 * TWO MEASUREMENT DECISIONS THAT ARE EASY TO GET WRONG, MADE DELIBERATELY:
 *
 * 1. THE LABEL FLOOR IS MEASURED ON THE LETTERS, NOT ON THE PLANE. A label mesh
 *    is a canvas with padding round the text, so the mesh is about half again as
 *    tall as the writing on it. Reporting the mesh height would have let a 24px
 *    floor pass 16px letters — the exact shape of the fault DFM 207d exists to
 *    stop. probeTokens reports the height of ONE LINE OF TEXT.
 *
 * 2. CONTRAST IS MEASURED HERE FOR THE FIRST TIME, AND THAT CHANGED THE PALETTE.
 *    Until this round the 4.5:1 half of DFM 207d was designed in (the choice-gate
 *    gives every light label a dark outline) and asserted nowhere. Measuring it
 *    means an outline would make the measurement LIE: the probe would read the
 *    dark stroke against the light fill and report a fine ratio for text nobody
 *    can read. So there are NO outlines here. Every colour is chosen to clear the
 *    floor against the plate it actually sits on, and every teaching label sits
 *    on a solid plate rather than on whatever happens to be behind it.
 *    THE CONSEQUENCE FOR THE TWO BRAND NAMES, stated rather than buried: Google's
 *    #4285F4 and OneDrive's #0078D4 do not clear 4.5:1 on a dark scene (about 4.8
 *    and 3.2 against this navy, and worse on a building front). The dark-theme
 *    variants of the SAME hues do — Google's own #8AB4F8 and a light Microsoft
 *    blue — so those are used. They still read as "the Google blue" and "the
 *    Microsoft blue", nothing is a logo redraw (they are TEXT, per the spec), and
 *    legibility outranks an exact brand hex (rule 52).
 *
 * RECORDING CONSTRAINTS (inherited — read lib/variable-box/vb.js's header):
 * filmed head-less through Playwright on a software renderer, so no shadow maps,
 * no post-processing, modest geometry, glows are sprites. Nothing animates
 * itself: record.js calls window.cloud.play(n) beat by beat, so a re-record is
 * reproducible. No Math.random anywhere — the window-light pattern, the dust and
 * the travel path are fixed tables.
 *
 *   window.cloud.ready          resolves once the first frame has been drawn
 *   window.cloud.play(n)        plays beat n (1..6), resolves when it finishes
 *   window.cloud.probe()        pixel samples proving the canvas is not black
 *   window.cloud.probeTokens()  on-screen height of every actor and label
 *   window.cloud.probeInk()     lit pixels inside each label, so a texture that
 *                               failed to upload cannot pass as "the right size"
 *   window.cloud.probeContrast() measured WCAG ratio of each label against its
 *                               own ground, in rendered pixels
 */
(function () {
  var W = 1280, H = 720;
  var NAVY = 0x060D1F;
  var GOLD = 0xE4B824, GOLD_HI = 0xFFD84D;
  var CASE = 0x2A3550;          /* monitor / laptop / phone shell */
  var KEYCAP = 0x54659B;
  var SCREEN_OFF = 0x0C1730;
  var PAPER = 0xF7FAFF;
  var INK_LINE = 0x8FA3C4;
  var BRICK = 0x22314E;         /* the building */
  var BRICK_FRONT = 0x1A2540;
  var PANEL = 0x0A1224;         /* the inset the document sits in */
  var SIGN = 0x101C36;          /* the sign plates every teaching label sits on */
  var WINDOW_LIT = 0xFFD277;
  var WINDOW_DARK = 0x2C3B5C;
  var GOOGLE_BLUE = '#8AB4F8';  /* Google's own dark-theme blue — see the header */
  var MS_BLUE = '#50B0F0';

  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.Fog(NAVY, 32, 68);

  var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 140);
  /* the opening frame: the whole desk, sitting in the TOP of the frame, because
     the burned caption owns the bottom sixth of it and a caption may not cover
     the thing it is naming (DFM 141a) */
  camera.position.set(-5.4, -0.09, 9.2);
  camera.lookAt(-5.4, -0.09, 0);

  scene.add(new THREE.AmbientLight(0x8fa6d8, 0.68));
  var key = new THREE.DirectionalLight(0xffffff, 0.95); key.position.set(2, 9, 11); scene.add(key);
  var warm = new THREE.PointLight(GOLD_HI, 0.32, 44); warm.position.set(6, 3, 8); scene.add(warm);

  /* ---------------------------------------------------------------- helpers */
  var LABELS = [];   /* every text mesh, so the render loop can re-upload them */

  /* A label is text drawn on a canvas, optionally on a solid plate. Multi-line
     via \n, because "A BUILDING FULL OF COMPUTERS" on one line at a readable
     size is wider than the building it names.
     `h` is the height of ONE LINE OF TEXT in world units — the number the 24px
     floor is about — and the mesh is taller than that by its padding, which is
     why the mesh remembers the ratio for the probe. */
  function label(text, opts) {
    opts = opts || {};
    var fs = opts.fs || 96, weight = opts.weight || '700';
    var lines = String(text).split('\n');
    var padX = opts.padX != null ? opts.padX : 26, padY = opts.padY != null ? opts.padY : 16;
    var lh = Math.round(fs * 1.16);
    var c = document.createElement('canvas'), g = c.getContext('2d');
    var font = weight + ' ' + fs + 'px "Helvetica Neue", Arial, sans-serif';
    g.font = font;
    var wid = 0;
    lines.forEach(function (l) { wid = Math.max(wid, Math.ceil(g.measureText(l).width)); });
    c.width = Math.max(8, wid + padX * 2);
    c.height = lh * lines.length + padY * 2;
    g = c.getContext('2d');
    if (opts.plate) {
      g.fillStyle = opts.plate;
      var r = Math.min(20, c.height / 3);
      g.beginPath();
      g.moveTo(r, 0); g.lineTo(c.width - r, 0); g.quadraticCurveTo(c.width, 0, c.width, r);
      g.lineTo(c.width, c.height - r); g.quadraticCurveTo(c.width, c.height, c.width - r, c.height);
      g.lineTo(r, c.height); g.quadraticCurveTo(0, c.height, 0, c.height - r);
      g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.closePath();
      g.fill();
    }
    g.font = font;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    /* NO OUTLINE, DELIBERATELY — the header says why. */
    g.fillStyle = opts.colour || '#FFFFFF';
    lines.forEach(function (l, i) { g.fillText(l, c.width / 2, padY + lh * i + lh / 2); });
    var tex = new THREE.CanvasTexture(c);
    /* NPOT-SAFE (the choice-gate's own hard-won note): a label canvas is as wide
       as its text, so it is almost never a power of two, and with mipmapping and
       repeat wrapping a NPOT texture renders BLANK on some GL backends while
       still measuring the right size. */
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 1;
    tex.needsUpdate = true;
    var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    var lineH = opts.h || 0.5;
    var meshH = lineH * (c.height / lh);
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry((c.width / c.height) * meshH, meshH), mat);
    mesh.renderOrder = opts.order || 8;
    mesh.userData.labelCanvas = c;                 /* hold it so nothing collects it */
    mesh.userData.glyphFraction = lineH / meshH;   /* how much of the mesh is writing */
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

  function slab(w, h, d, colour, rough) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: colour, roughness: rough == null ? 0.55 : rough, metalness: 0.06 }));
  }
  function flat(w, h, colour, opacity) {
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: colour, transparent: opacity != null, opacity: opacity == null ? 1 : opacity }));
  }

  /* ---- a document: a white card with grey writing on it ---- */
  function makeDoc(w, h) {
    var g = new THREE.Group();
    g.add(flat(w, h, PAPER));
    var head = flat(w * 0.44, h * 0.072, 0x3E5FA0);
    head.position.set(-(w * 0.7 - w * 0.44) / 2, h * 0.34, 0.006);
    g.add(head);
    var lineW = w * 0.7, gap = h * 0.108;
    for (var i = 0; i < 5; i++) {
      var ln = flat(i === 4 ? lineW * 0.55 : lineW, h * 0.04, INK_LINE);
      ln.position.set(i === 4 ? -(lineW - lineW * 0.55) / 2 : 0, h * 0.18 - i * gap, 0.006);
      g.add(ln);
    }
    return g;
  }

  /* ---- a desktop monitor with a stand, and a keyboard in front of it ---- */
  function makeMonitor() {
    var g = new THREE.Group();
    g.add(slab(3.9, 2.7, 0.22, CASE, 0.5));
    var glass = flat(3.5, 2.3, SCREEN_OFF);
    glass.position.z = 0.12;
    g.add(glass);
    var neck = slab(0.42, 0.85, 0.34, CASE, 0.5); neck.position.set(0, -1.72, 0); g.add(neck);
    var base = slab(1.7, 0.16, 0.9, CASE, 0.5); base.position.set(0, -2.2, 0.1); g.add(base);
    g.userData = { glass: glass };
    return g;
  }
  function makeKeyboard() {
    var g = new THREE.Group();
    /* the body is DARKER than the shell so the keycaps read as separate keys at
       film size — at 1280x720 a keyboard the colour of its own keys is a plank */
    g.add(slab(3.2, 0.17, 1.15, 0x1B2440, 0.6));
    var keys = [];
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 12; c++) {
        var k = flat(0.175, 0.125, KEYCAP);
        k.rotation.x = -Math.PI / 2;
        k.position.set(-1.4 + c * 0.255, 0.10, -0.38 + r * 0.235);
        g.add(k); keys.push(k);
      }
    }
    /* propped up like a keyboard on a desk, and tilted far enough that the
       CAPS are visible at film size: at a shallow angle the whole thing
       foreshortens into a plain bar and stops being recognisable (DFM 192e —
       an actor has to be readable as the thing it is) */
    g.rotation.x = 0.55;
    g.userData = { keys: keys };
    return g;
  }

  /* ---- a laptop and a phone ---- */
  function makeLaptop() {
    var g = new THREE.Group();
    var lid = slab(3.2, 2.0, 0.14, CASE, 0.5); lid.position.y = 1.0; g.add(lid);
    var glass = flat(2.9, 1.7, SCREEN_OFF); glass.position.set(0, 1.0, 0.08); g.add(glass);
    var deck = slab(3.2, 0.12, 2.0, CASE, 0.55); deck.position.set(0, 0.0, 1.0); deck.rotation.x = 0.06; g.add(deck);
    var pad = flat(0.95, 0.62, 0x3B4A78); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.08, 1.55); g.add(pad);
    g.userData = { glass: glass };
    return g;
  }
  function makePhone() {
    var g = new THREE.Group();
    g.add(slab(1.3, 2.5, 0.16, CASE, 0.45));
    var glass = flat(1.1, 2.18, SCREEN_OFF); glass.position.z = 0.09; g.add(glass);
    var home = flat(0.36, 0.05, 0x5A6C9E); home.position.set(0, -1.12, 0.1); g.add(home);
    g.userData = { glass: glass };
    return g;
  }

  /* ---- the building: a plain block, rows of lit windows, a sign on the roof,
          and a clear inset panel where the document can be SEEN to live.
          The sign is on the ROOF and on its own solid plate for two reasons that
          are both laws: a name written across the windows sat on top of the very
          thing it was naming (DFM 141a), and a measured contrast ratio only
          means something when the ground under the letters is one known colour. */
  var WINDOWS = ['11011101', '10111011', '11101110', '01110111'];
  function makeBuilding(w, h) {
    var g = new THREE.Group();
    g.add(slab(w, h, 2.3, BRICK, 0.72));
    var front = flat(w * 0.995, h * 0.995, BRICK_FRONT);
    front.position.z = 1.16;
    g.add(front);

    var lights = [];
    var cols = WINDOWS[0].length, rows = WINDOWS.length;
    var cw = (w * 0.78) / cols, ch = (h * 0.30) / rows;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var lit = WINDOWS[r][c] === '1';
        var win = flat(cw * 0.52, ch * 0.4, lit ? WINDOW_LIT : WINDOW_DARK, lit ? 0.9 : 1);
        win.position.set((c - (cols - 1) / 2) * cw, -h * 0.30 + (rows - 1 - r) * ch, 1.17);
        g.add(win);
        if (lit) lights.push(win);
      }
    }
    /* the inset the document lives in — a clear, windowless well, so nothing is
       ever read against a field of flashing lights */
    /* the well the document sits in, with its own lit frame — without the frame
       the document read as though it were stuck on the outside of the building */
    /* HIGH ON THE FRONT, not low. A three-line burned caption reaches a third of
       the way up the frame, and low on the building the document sat behind it —
       DFM 141a, on the thing the beat had just delivered. */
    var frame = flat(w * 0.56, h * 0.62, 0x33477A);
    frame.position.set(0, h * 0.16, 1.168);
    g.add(frame);
    var panel = flat(w * 0.52, h * 0.58, PANEL);
    panel.position.set(0, h * 0.16, 1.17);
    g.add(panel);
    var door = flat(w * 0.10, h * 0.11, 0x0A1224);
    door.position.set(0, -h / 2 + h * 0.055, 1.18);
    g.add(door);
    var roof = slab(w * 1.03, 0.16, 2.4, 0x2E3F63, 0.7);
    roof.position.y = h / 2 + 0.06;
    g.add(roof);
    g.userData = { lights: lights, w: w, h: h, panel: panel };
    return g;
  }
  /* a roof sign: a solid plate, its own post, and the words on top of it */
  function makeSign(w, hh) {
    var g = new THREE.Group();
    g.add(flat(w, hh, SIGN));
    var edge = flat(w, 0.05, 0x3A4E7C); edge.position.set(0, -hh / 2 - 0.02, 0.002); g.add(edge);
    return g;
  }

  /* ---- the folder pair: DT Work sitting INSIDE School ---- */
  function makeFolderPair(w) {
    var g = new THREE.Group();
    var h = w * 0.72;
    /* back panel of the School folder, plus its tab */
    var back = flat(w, h, GOLD);
    g.add(back);
    var tab = flat(w * 0.40, h * 0.17, GOLD);
    tab.position.set(-(w - w * 0.40) / 2, h / 2 + h * 0.075, 0);
    g.add(tab);
    /* the DT Work folder, standing INSIDE it — drawn between the back panel and
       the front flap, so it is physically inside the way a real file is */
    var iw = w * 0.62, ih = iw * 0.72;
    var inner = flat(iw, ih, GOLD_HI);
    inner.position.set(w * 0.05, h * 0.30, 0.01);
    g.add(inner);
    var innerTab = flat(iw * 0.40, ih * 0.17, GOLD_HI);
    innerTab.position.set(w * 0.05 - (iw - iw * 0.40) / 2, h * 0.30 + ih / 2 + ih * 0.075, 0.01);
    g.add(innerTab);
    var dtLbl = label('DT Work', { colour: '#231A02', h: 0.36, fs: 78, order: 9 });
    dtLbl.position.set(w * 0.05, h * 0.34, 0.02);
    g.add(dtLbl);
    /* the front flap, a shade lighter, hiding the bottom of the inner folder */
    var front = flat(w, h * 0.78, 0xEFC63A);
    front.position.set(0, -h * 0.11, 0.03);
    g.add(front);
    var schoolLbl = label('School', { colour: '#231A02', h: 0.46, fs: 92, order: 9 });
    schoolLbl.position.set(0, -h * 0.11, 0.04);
    g.add(schoolLbl);
    g.userData = { schoolLbl: schoolLbl, dtLbl: dtLbl };
    return g;
  }

  /* ------------------------------------------------------------- the scene */
  var monitor = makeMonitor();
  monitor.position.set(-5.4, 1.35, 0);
  scene.add(monitor);

  var keyboard = makeKeyboard();
  keyboard.position.set(-5.4, -1.30, 1.6);
  scene.add(keyboard);

  var doc = makeDoc(1.0, 1.3);
  doc.position.set(-5.4, 1.77, 0.16);
  doc.scale.setScalar(0.01);
  scene.add(doc);

  var docGlow = glow('rgba(255,216,77,0.55)', 3.6);
  docGlow.position.set(-5.4, 1.77, 0.06);
  scene.add(docGlow);

  /* the name of the thing on the screen, BELOW it, never over it (DFM 141a) */
  var docLabel = label('my work', { plate: '#E4B824', colour: '#231A02', h: 0.40, fs: 82 });
  docLabel.position.set(-5.4, 0.63, 0.30);
  docLabel.scale.setScalar(0.01);
  scene.add(docLabel);

  /* the drawn journey — fixed points, revealed one by one */
  var PATH = [];
  for (var pi = 0; pi <= 22; pi++) {
    var pt = pi / 22;
    PATH.push([-3.5 + pt * 7.5, 1.9 + Math.sin(pt * Math.PI) * 1.5, 0.5]);
  }
  var pathDots = new THREE.Group();
  PATH.forEach(function (p) {
    var d = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8),
      new THREE.MeshBasicMaterial({ color: GOLD }));
    d.position.set(p[0], p[1], p[2]);
    d.scale.setScalar(0.01);
    pathDots.add(d);
  });
  scene.add(pathDots);

  /* THE BUILDING. Beat 5 splits it in two: bldgB is built now and hidden, then
     slides out of bldgA, so one building visibly becomes two. */
  var BW = 4.6, BH = 4.0, BY = -0.4;
  var bldgA = makeBuilding(BW, BH);
  bldgA.position.set(4.5, BY, -0.8);
  bldgA.scale.setScalar(0.01);
  scene.add(bldgA);

  var bldgB = makeBuilding(BW, BH);
  bldgB.position.set(4.5, BY, -0.8);
  bldgB.visible = false;
  scene.add(bldgB);

  /* the cloud's own sign, on the roof */
  /* TWO LINES, not one. On one line "A BUILDING FULL OF COMPUTERS" ran off the
     right-hand edge of the frame at the size the floor demands — DFM 201a's own
     fault (a caption clipped by the frame), on a sign instead of a caption. */
  var cloudSign = makeSign(4.35, 1.95);
  cloudSign.position.set(4.5, 2.65, 1.20);
  cloudSign.children.forEach(function (m) { m.material.transparent = true; m.material.opacity = 0; });
  scene.add(cloudSign);
  var cloudName = label('THE CLOUD', { colour: '#FFFFFF', h: 0.52, fs: 104 });
  cloudName.position.set(4.5, 3.06, 1.22);
  cloudName.material.opacity = 0;
  scene.add(cloudName);
  var cloudSub = label('A BUILDING FULL\nOF COMPUTERS', { colour: '#FFD277', h: 0.36, fs: 74 });
  cloudSub.position.set(4.5, 2.28, 1.22);
  cloudSub.material.opacity = 0;
  scene.add(cloudSub);

  /* the document, once it lives in the building — in the clear inset panel */
  var docInside = makeDoc(1.35, 1.75);
  docInside.position.set(4.5, BY + BH * 0.16, 1.24);
  docInside.visible = false;
  scene.add(docInside);
  var insideGlow = glow('rgba(255,216,77,0.7)', 3.4);
  insideGlow.position.set(4.5, BY + BH * 0.16, 1.20);
  scene.add(insideGlow);

  /* beat 4 — the same work, on her other devices */
  var laptop = makeLaptop();
  laptop.position.set(-5.2, -1.2, 1.6);
  laptop.visible = false;
  scene.add(laptop);
  var phone = makePhone();
  phone.position.set(-2.2, -1.15, 2.2);
  phone.visible = false;
  scene.add(phone);

  var laptopDoc = makeDoc(0.66, 0.86);
  laptopDoc.position.set(-5.2, -0.2, 1.70);
  laptopDoc.visible = false;
  scene.add(laptopDoc);
  var phoneDoc = makeDoc(0.5, 0.65);
  phoneDoc.position.set(-2.2, -1.05, 2.32);
  phoneDoc.visible = false;
  scene.add(phoneDoc);

  var signIn = [];
  [[-5.2, -0.2, 2.0], [-2.2, -1.05, 2.6]].forEach(function (p) {
    var s = glow('rgba(143,196,255,0.75)', 3.0);
    s.position.set(p[0], p[1], p[2]);
    scene.add(s);
    signIn.push(s);
  });

  /* beat 5 — the two names, as TEXT in each brand's colour (no logo redraws),
     each on its own roof sign so the contrast measurement means something */
  var driveSign = makeSign(3.9, 1.05);
  driveSign.position.set(-3.7, 2.30, 1.20);
  driveSign.children.forEach(function (m) { m.material.transparent = true; m.material.opacity = 0; });
  scene.add(driveSign);
  var driveName = label('Google Drive', { colour: GOOGLE_BLUE, h: 0.54, fs: 100 });
  driveName.position.set(-3.7, 2.30, 1.22);
  driveName.material.opacity = 0;
  scene.add(driveName);

  var oneSign = makeSign(3.9, 1.05);
  oneSign.position.set(3.7, 2.30, 1.20);
  oneSign.children.forEach(function (m) { m.material.transparent = true; m.material.opacity = 0; });
  scene.add(oneSign);
  var oneName = label('OneDrive', { colour: MS_BLUE, h: 0.54, fs: 100 });
  oneName.position.set(3.7, 2.30, 1.22);
  oneName.material.opacity = 0;
  scene.add(oneName);

  /* beat 6 — the identical folder pair, one for each building */
  var pairA = makeFolderPair(2.0);
  pairA.position.set(-3.7, 5.6, 1.30);
  pairA.visible = false;
  scene.add(pairA);
  var pairB = makeFolderPair(2.0);
  pairB.position.set(3.7, 5.6, 1.30);
  pairB.visible = false;
  scene.add(pairB);

  /* star dust — fixed positions (Math.random would break a re-record) */
  var DUST = [[-9.2, 4.6, -9], [7.4, 5.2, -10], [-5.6, -3.4, -8], [4.2, 5.6, -11], [-10.1, 2.0, -9],
    [9.3, -2.2, -8], [1.4, 6.2, -12], [-2.8, 5.0, -10], [6.4, 2.8, -11], [-7.8, -1.4, -8],
    [3.4, -3.8, -7], [-1.8, 6.6, -11], [10.1, 3.8, -12], [-6.3, 3.4, -10], [5.1, -2.9, -8]];
  var dust = new THREE.Group();
  DUST.forEach(function (p) {
    var d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x9FB6E8 }));
    d.position.set(p[0], p[1], p[2]);
    dust.add(d);
  });
  scene.add(dust);

  /* --------------------------------------------------------------- motion */
  var tl = function () { return gsap.timeline({ defaults: { ease: 'power3.out' } }); };
  function moveCam(t, x, y, z, lookX, lookY, dur, at) {
    t.to(camera.position, {
      x: x, y: y, z: z, duration: dur, ease: 'sine.inOut',
      onUpdate: function () { camera.lookAt(lookX, lookY, 0); }
    }, at == null ? 0 : at);
  }
  function fadeGroup(t, grp, to, dur, at) {
    grp.children.forEach(function (m) { t.to(m.material, { opacity: to, duration: dur }, at); });
  }

  var beats = {
    /* 1 — the school computer, and the work she makes on it (7.0s) */
    1: function () {
      var t = tl();
      monitor.scale.setScalar(0.01); keyboard.scale.setScalar(0.01);
      t.to(monitor.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'back.out(1.3)' }, 0.1);
      t.to(keyboard.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.3)' }, 0.45);
      t.to(monitor.userData.glass.material.color, { r: 0.118, g: 0.243, b: 0.467, duration: 0.7 }, 1.0);
      t.to(doc.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.5)' }, 1.5);
      t.to(docGlow.material, { opacity: 0.45, duration: 0.8 }, 1.7);
      t.to(docLabel.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(2)' }, 2.5);
      t.to({}, { duration: 4.0 });
      return t;
    },

    /* 2 — the journey, and the building it goes to (11.2s) */
    2: function () {
      var t = tl();
      moveCam(t, 0, 0.86, 12.4, 0, 0.86, 1.7, 0);
      t.to(docLabel.material, { opacity: 0, duration: 0.5 }, 0.2);
      t.to(bldgA.scale, { x: 1, y: 1, z: 1, duration: 1.4, ease: 'back.out(1.2)' }, 0.9);
      /* the line is DRAWN, dot by dot, so the journey is something she watches
         happen rather than a thing that is suddenly there */
      pathDots.children.forEach(function (d, i) {
        t.to(d.scale, { x: 1, y: 1, z: 1, duration: 0.22 }, 2.4 + i * 0.072);
      });
      t.to(doc.position, { x: PATH[0][0], y: PATH[0][1], z: PATH[0][2], duration: 0.7 }, 2.3);
      t.to(docGlow.position, { x: PATH[0][0], y: PATH[0][1], duration: 0.7 }, 2.3);
      /* THE DOCUMENT TRAVELS THE DRAWN LINE — along the same fixed PATH the dots
         were drawn from, so what she watched being drawn is exactly what the
         work then follows. */
      t.call(function () {
        gsap.to({ p: 0 }, {
          p: 1, duration: 2.2, ease: 'sine.inOut',
          onUpdate: function () {
            var k = this.targets()[0].p * (PATH.length - 1);
            var i = Math.min(PATH.length - 2, Math.floor(k)), f = k - i;
            var a = PATH[i], b = PATH[i + 1];
            doc.position.set(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
            docGlow.position.set(doc.position.x, doc.position.y, doc.position.z - 0.1);
          }
        });
      }, null, 4.0);
      t.call(function () {
        doc.visible = false; docGlow.material.opacity = 0;
        docInside.visible = true;
        docInside.scale.setScalar(0.01);
        gsap.to(docInside.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.6)' });
        gsap.to(insideGlow.material, { opacity: 0.62, duration: 0.7 });
      }, null, 6.3);
      fadeGroup(t, cloudSign, 1, 0.6, 6.8);
      t.to(cloudName.material, { opacity: 1, duration: 0.6 }, 7.0);
      t.to(cloudSub.material, { opacity: 1, duration: 0.6 }, 7.5);
      t.to({}, { duration: 3.6 });
      return t;
    },

    /* 3 — her computer switches off; the work does not (8.0s) */
    3: function () {
      var t = tl();
      /* the camera stays SQUARE ON and only pushes in: panning right cut the
         monitor in half at the frame edge, and this is the beat whose caption
         says "your computer switches off" — the thing being named has to be
         whole and in frame while it is named (DFM 121a/201a) */
      moveCam(t, 0, 0.86, 12.0, 0, 0.86, 1.4, 0);
      t.to(monitor.userData.glass.material.color, { r: 0.047, g: 0.090, b: 0.188, duration: 1.1 }, 1.0);
      /* the keys go dark with it — a switched-off computer is dark all over */
      keyboard.userData.keys.forEach(function (k) {
        t.to(k.material.color, { r: 0.10, g: 0.13, b: 0.22, duration: 0.8 }, 1.1);
      });
      /* and the work keeps glowing, inside the building */
      t.to(insideGlow.material, { opacity: 0.95, duration: 0.7 }, 2.3);
      t.to(insideGlow.material, { opacity: 0.6, duration: 1.0 }, 3.2);
      t.to(insideGlow.material, { opacity: 0.95, duration: 0.9 }, 4.4);
      t.to(insideGlow.material, { opacity: 0.68, duration: 0.9 }, 5.4);
      t.to({}, { duration: 3.2 });
      return t;
    },

    /* 4 — sign in anywhere, and the cloud shows you your work (8.0s) */
    4: function () {
      var t = tl();
      /* her school computer leaves the frame as her other devices arrive. It has
         already taught what it had to teach (beat 3), and a frame with
         everything still in it is a frame with nothing being taught. */
      t.to(monitor.position, { x: -13.5, duration: 1.2, ease: 'power2.in' }, 0);
      t.to(keyboard.position, { x: -13.5, duration: 1.2, ease: 'power2.in' }, 0);
      /* wide enough that BOTH new actors are whole in frame — the first cut
         sliced the laptop at the left edge, and a caption may not name a thing
         the frame has cut in half (DFM 121a/201a) */
      moveCam(t, -0.2, 0.4, 14.0, -0.2, 0.4, 1.5, 0);
      t.call(function () { laptop.visible = true; phone.visible = true; }, null, 0.9);
      t.fromTo(laptop.position, { x: -13.5 }, { x: -5.2, duration: 1.4, ease: 'power3.out' }, 0.9);
      t.fromTo(phone.position, { x: -13.5 }, { x: -2.2, duration: 1.5, ease: 'power3.out' }, 1.3);
      /* the soft sign-in glow on each */
      t.to(signIn[0].material, { opacity: 0.85, duration: 0.5 }, 2.5);
      t.to(signIn[1].material, { opacity: 0.85, duration: 0.5 }, 2.8);
      t.to(signIn[0].material, { opacity: 0.2, duration: 0.8 }, 3.2);
      t.to(signIn[1].material, { opacity: 0.2, duration: 0.8 }, 3.5);
      t.to(laptop.userData.glass.material.color, { r: 0.118, g: 0.243, b: 0.467, duration: 0.6 }, 3.0);
      t.to(phone.userData.glass.material.color, { r: 0.118, g: 0.243, b: 0.467, duration: 0.6 }, 3.3);
      /* the building BEAMS it onto both screens — it SHOWS her the work; it does
         not send the file away (the move-semantics falsehood the spec forbids) */
      t.call(function () { beam(4.5, BY + BH * 0.16, -5.2, -0.2, 1.70); }, null, 3.9);
      t.call(function () { beam(4.5, BY + BH * 0.16, -2.2, -1.05, 2.32); }, null, 4.3);
      t.call(function () {
        laptopDoc.visible = true; laptopDoc.scale.setScalar(0.01);
        gsap.to(laptopDoc.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.8)' });
      }, null, 5.0);
      t.call(function () {
        phoneDoc.visible = true; phoneDoc.scale.setScalar(0.01);
        gsap.to(phoneDoc.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.8)' });
      }, null, 5.4);
      t.to({}, { duration: 2.6 });
      return t;
    },

    /* 5 — one building becomes two, and both are hers (10.6s) */
    5: function () {
      var t = tl();
      t.to(laptop.position, { x: -14.5, duration: 1.1, ease: 'power2.in' }, 0);
      t.to(laptopDoc.position, { x: -14.5, duration: 1.1, ease: 'power2.in' }, 0);
      t.to(phone.position, { x: -14.5, duration: 1.1, ease: 'power2.in' }, 0.1);
      t.to(phoneDoc.position, { x: -14.5, duration: 1.1, ease: 'power2.in' }, 0.1);
      t.to(signIn[0].material, { opacity: 0, duration: 0.5 }, 0);
      t.to(signIn[1].material, { opacity: 0, duration: 0.5 }, 0);
      pathDots.children.forEach(function (d, i) {
        t.to(d.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3 }, 0.1 + i * 0.02);
      });
      moveCam(t, 0, 0.21, 12.2, 0, 0.21, 1.8, 0.3);
      /* the split itself */
      t.call(function () { bldgB.visible = true; }, null, 1.9);
      t.to(bldgA.position, { x: -3.7, duration: 1.9, ease: 'power2.inOut' }, 1.9);
      t.to(bldgB.position, { x: 3.7, duration: 1.9, ease: 'power2.inOut' }, 1.9);
      /* the single cloud's sign goes with the single cloud: from here on the two
         buildings carry their own names, which is the whole point of the beat */
      fadeGroup(t, cloudSign, 0, 0.6, 1.9);
      t.to(cloudName.material, { opacity: 0, duration: 0.6 }, 1.9);
      t.to(cloudSub.material, { opacity: 0, duration: 0.6 }, 1.9);
      /* the one document leaves with it: keeping it in ONE of the two buildings
         would say one cloud has her work and the other does not, on the beat
         whose whole job is that they are equals (DFM 252) */
      t.to(insideGlow.material, { opacity: 0, duration: 0.8 }, 1.9);
      t.call(function () { docInside.visible = false; }, null, 2.9);
      fadeGroup(t, driveSign, 1, 0.6, 4.0);
      fadeGroup(t, oneSign, 1, 0.6, 4.3);
      t.to(driveName.material, { opacity: 1, duration: 0.7 }, 4.1);
      t.to(oneName.material, { opacity: 1, duration: 0.7 }, 4.4);
      t.to({}, { duration: 5.6 });
      return t;
    },

    /* 6 — the quest: the same two folders, built in both (10.8s) */
    6: function () {
      var t = tl();
      moveCam(t, 0, 0.21, 12.2, 0, 0.21, 1.2, 0);
      t.call(function () { pairA.visible = true; pairB.visible = true; }, null, 0.5);
      /* they land IN the well, not on the wall below it. "Drops into each
         building" is the spec's own word, and a folder pair sitting under an
         empty well says the opposite of what the beat is for. */
      t.fromTo(pairA.position, { y: 5.6 }, { y: BY + BH * 0.14, duration: 1.5, ease: 'bounce.out' }, 0.6);
      t.fromTo(pairB.position, { y: 5.6 }, { y: BY + BH * 0.14, duration: 1.5, ease: 'bounce.out' }, 1.2);
      /* BOTH buildings light up as the folders land — the payoff is that both get
         exactly the same thing (DFM 252: neither cloud is steered over) */
      bldgA.userData.lights.forEach(function (w, i) {
        t.to(w.material, { opacity: 1, duration: 0.3 }, 2.4 + (i % 8) * 0.05);
      });
      bldgB.userData.lights.forEach(function (w, i) {
        t.to(w.material, { opacity: 1, duration: 0.3 }, 3.0 + (i % 8) * 0.05);
      });
      t.to({}, { duration: 6.6 });
      return t;
    }
  };

  /* a travelling dot of light: the cloud SHOWING her the work on another screen */
  function beam(fromX, fromY, toX, toY, toZ) {
    var d = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10),
      new THREE.MeshBasicMaterial({ color: GOLD_HI }));
    d.position.set(fromX, fromY, 1.3);
    scene.add(d);
    var g2 = glow('rgba(255,216,77,0.8)', 1.6);
    g2.position.copy(d.position);
    g2.material.opacity = 0.9;
    scene.add(g2);
    gsap.to(d.position, {
      x: toX, y: toY, z: toZ, duration: 1.0, ease: 'power2.inOut',
      onUpdate: function () { g2.position.copy(d.position); },
      onComplete: function () { scene.remove(d); scene.remove(g2); }
    });
  }

  /* ------------------------------------------------------------- the probes */
  /* THE TOKENS the take gate samples, by the name the scene file uses. Renaming
     one here re-stages the scene file (DFM 143b), which is why they are listed
     in one place. */
  function tokenTable() {
    return [
      { name: 'monitor', obj: monitor, actor: true },
      { name: 'my work', obj: docLabel },
      { name: 'document', obj: doc, actor: true },
      { name: 'building', obj: bldgA, actor: true },
      { name: 'THE CLOUD', obj: cloudName },
      { name: 'A BUILDING FULL OF COMPUTERS', obj: cloudSub },
      { name: 'document in the cloud', obj: docInside, actor: true },
      { name: 'laptop', obj: laptop, actor: true },
      { name: 'phone', obj: phone, actor: true },
      { name: 'Google Drive', obj: driveName },
      { name: 'OneDrive', obj: oneName },
      { name: 'second building', obj: bldgB, actor: true },
      { name: 'School', obj: pairA.userData.schoolLbl },
      { name: 'DT Work', obj: pairA.userData.dtLbl }
    ];
  }
  function shown(o) {
    if (!o) return false;
    var vis = o.visible;
    o.traverseAncestors(function (a) { if (a.visible === false) vis = false; });
    if (!vis) return false;
    if (o.material && o.material.transparent && o.material.opacity < 0.06) return false;
    if (o.scale && o.scale.x < 0.05) return false;
    return true;
  }
  function screenRect(o) {
    var box = new THREE.Box3();
    o.traverse(function (n) { if (n.isMesh && n.geometry) box.expandByObject(n); });
    if (box.isEmpty()) return null;
    var c = box.getCenter(new THREE.Vector3());
    var a = new THREE.Vector3(box.min.x, box.min.y, box.max.z).project(camera);
    var b = new THREE.Vector3(box.max.x, box.max.y, box.max.z).project(camera);
    var top = new THREE.Vector3(c.x, box.max.y, c.z).project(camera);
    var bot = new THREE.Vector3(c.x, box.min.y, c.z).project(camera);
    var x0 = Math.round((Math.min(a.x, b.x) + 1) / 2 * W);
    var y0 = Math.round((Math.min(a.y, b.y) + 1) / 2 * H);
    var w = Math.round(Math.abs(b.x - a.x) / 2 * W);
    var h = Math.round(Math.abs(b.y - a.y) / 2 * H);
    return {
      px: Math.round(Math.abs(top.y - bot.y) / 2 * H),
      x0: x0, y0: y0, w: w, h: h,
      /* OFF-FRAME IS NOT ON SCREEN. Beats 4 and 5 slide furniture out to x=-13.5;
         without this a probe would keep reporting a monitor nobody can see, and
         a gate that says a thing is on screen when it is not is the DFM 204
         fault in miniature. */
      onFrame: (x0 + w) > 8 && x0 < (W - 8) && (y0 + h) > 8 && y0 < (H - 8)
    };
  }
  function clipRect(r) {
    var x0 = Math.max(0, r.x0), y0 = Math.max(0, r.y0);
    return { x0: x0, y0: y0, w: Math.min(W - x0, r.w - (x0 - r.x0)), h: Math.min(H - y0, r.h - (y0 - r.y0)) };
  }
  /* READ A FRAME YOU HAVE JUST DRAWN. `preserveDrawingBuffer` keeps the buffer
     only until the compositor takes it, and a head-less page that is not being
     recorded is composited on its own schedule — so readPixels came back EMPTY on
     some runs and full on others, with the same code and the same scene. The probe
     therefore reported "nothing is drawn in it" for words that were plainly there,
     which is the DFM 146(a) fault: a gate that invents a fault is worse than none.
     Rendering immediately before the read removes the dependency entirely. */
  function freshFrame() {
    /* AND PROVE THE BUFFER IS LIVE BEFORE BELIEVING WHAT COMES OUT OF IT. Even
       with a render forced immediately before the read, some runs came back
       ALL ZERO — every label reporting "nothing is drawn in it" while the same
       code on the same scene had reported thousands of lit pixels a minute
       earlier. The background of this scene is navy (6,13,31), never black, so a
       block of pure zeros is not a picture of anything: it is a dead read. Two
       more attempts, and then the numbers are what they are — a probe that
       cannot tell a dead read from a blank label is the DFM 146(a) fault, and a
       probe that silently retries for ever would hide a real failure. */
    var g = renderer.domElement.getContext('webgl2') || renderer.domElement.getContext('webgl');
    var px = new Uint8Array(4 * 8 * 8);
    for (var attempt = 0; attempt < 3; attempt++) {
      renderer.render(scene, camera);
      g.readPixels(W / 2 - 4, H / 2 - 4, 8, 8, g.RGBA, g.UNSIGNED_BYTE, px);
      var max = 0;
      for (var i = 0; i < px.length; i += 4) {
        var v = px[i] + px[i + 1] + px[i + 2];
        if (v > max) max = v;
      }
      if (max >= 10) return true;
    }
    return false;
  }
  function readRect(r) {
    freshFrame();
    var g = renderer.domElement.getContext('webgl2') || renderer.domElement.getContext('webgl');
    var c = clipRect(r);
    if (c.w < 2 || c.h < 2) return null;
    var px = new Uint8Array(4 * c.w * c.h);
    g.readPixels(c.x0, c.y0, c.w, c.h, g.RGBA, g.UNSIGNED_BYTE, px);
    return px;
  }
  function lum(r, g, b) {
    function ch(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  }

  window.__scene = scene; window.__cam = camera;
  window.cloud = {
    ready: new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); }),
    play: function (n) {
      return new Promise(function (res) {
        var t = beats[n]();
        t.eventCallback('onComplete', res);
      });
    },

    /* THE UNIFIED ANIMATION LAW, half one (DFM 207d): on-screen height of every
       actor and every teaching label that is really on screen right now.
       TWO THINGS THAT LOOK LIKE DETAIL AND ARE NOT:
       · a LABEL is reported by the height of ONE LINE OF WRITING, not of its
         padded plane, because "24px" is a claim about the letters;
       · the mesh is measured, never its halo — Box3.setFromObject swallows a
         glow Sprite and once reported a 1.75-unit flag at 441px, which would
         have passed the very defect the law exists to catch. */
    probeTokens: function () {
      var out = [];
      tokenTable().forEach(function (w) {
        if (!shown(w.obj)) return;
        var r = screenRect(w.obj);
        if (!r || !r.onFrame) return;
        var px = w.actor ? r.px : Math.round(r.px * (w.obj.userData.glyphFraction || 1));
        out.push({ name: w.name, px: px, actor: !!w.actor });
      });
      return out;
    },

    /* Half two — SIZE IS NOT VISIBILITY (DFM 146b). Counts lit pixels inside each
       label's own screen rect: a texture that failed to upload measures the right
       size and draws nothing. */
    probeInk: function () {
      var out = [];
      tokenTable().forEach(function (w) {
        if (w.actor || !shown(w.obj)) return;
        var r = screenRect(w.obj);
        if (!r || !r.onFrame) return;
        var px = readRect(r);
        if (!px) return;
        var lit = 0;
        for (var i = 0; i < px.length; i += 4) {
          if (px[i] + px[i + 1] + px[i + 2] > 330) lit++;
        }
        out.push({ name: w.name, inkPixels: lit });
      });
      return out;
    },

    /* Half three, and it has never been measured on an animation before this
       round: the CONTRAST of each teaching label against its own ground, in
       rendered pixels. The 10th and 90th percentile luminances inside the
       label's rect are its ground and its ink — percentiles rather than min and
       max, so one stray antialiased pixel cannot decide the number. Reported as
       the WCAG ratio; the floor is 4.5:1 (DFM 207d). */
    probeContrast: function () {
      var out = [];
      tokenTable().forEach(function (w) {
        if (w.actor || !shown(w.obj)) return;
        var r = screenRect(w.obj);
        if (!r || !r.onFrame) return;
        var px = readRect(r);
        if (!px) return;
        var ls = [];
        for (var i = 0; i < px.length; i += 4) ls.push(lum(px[i], px[i + 1], px[i + 2]));
        if (ls.length < 40) return;
        ls.sort(function (a, b) { return a - b; });
        var lo = ls[Math.floor(ls.length * 0.10)];
        var hi = ls[Math.floor(ls.length * 0.90)];
        var ratio = (Math.max(hi, lo) + 0.05) / (Math.min(hi, lo) + 0.05);
        out.push({ name: w.name, ratio: Math.round(ratio * 100) / 100 });
      });
      return out;
    },

    /* the recorder's proof that WebGL really drew something: a black canvas means
       the software renderer fell over, and a black canvas records perfectly
       happily (DFM 146b — verify the PIXELS, not the absence of an error) */
    probe: function () {
      freshFrame();
      var g = renderer.domElement.getContext('webgl2') || renderer.domElement.getContext('webgl');
      var px = new Uint8Array(4 * 40 * 40);
      var out = [];
      [[300, 380], [900, 400], [640, 300]].forEach(function (p) {
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

  /* THE TEXT RE-UPLOAD (inherited from the choice-gate, and it earned itself
     there): the software renderer these films are recorded on evicts textures
     under pressure, and three.js will not re-upload a CanvasTexture unless it is
     told to. Re-flagging the small label textures a few times a second makes the
     loss self-heal instead of shipping a film with silent gaps where the
     teaching words should be. */
  var frameNo = 0;
  (function loop() {
    requestAnimationFrame(loop);
    frameNo++;
    dust.rotation.y = frameNo * 0.0002;
    if ((frameNo % 20) === 0) {
      for (var i = 0; i < LABELS.length; i++) {
        if (LABELS[i].material && LABELS[i].material.map) LABELS[i].material.map.needsUpdate = true;
      }
    }
    renderer.render(scene, camera);
  })();
})();
