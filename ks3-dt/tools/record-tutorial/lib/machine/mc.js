/* mc.js — THE MACHINE: a function is built once and used again and again (j3-04, spec §C5 ch2).

   THE ONE NEW IDEA OF THE HOUR, and the picture it has to carry: `def` does not
   RUN anything — it BUILDS a machine, with one slot in the top labelled with the
   slot's name, and the machine then sits there doing nothing. A CALL drops a card
   into the slot; the machine works; `return` pushes a product out of the chute
   into an outstretched hand. A second call, a second product, the same machine.
   Then the trap: a machine with `print` inside and no `return` SHOUTS the words
   into the air — and the hand receives… None. The hand and the None plate are
   the Lesson 3 rack animation's own, on purpose (one idea, one image).

   EVERY ACTOR IS A THING A THIRTEEN-YEAR-OLD CAN NAME ON SIGHT — a slab of
   program, a machine with a slot in its top, a card, a chute, a hand, a ticket —
   and each beat does ONE thing (DFM 192e, 207d).

   THE LOWER THIRD BELONGS TO THE CAPTION: everything readable stays ABOVE screen
   y ≈ 500px, and the film law (stage-subjects.js) measures that on every caption.

   RECORDING CONSTRAINTS (inherited from lib/input-halt/ih.js — read its header):
   head-less through Playwright on a software renderer, no shadow maps, glows
   are emissive + a sprite, nothing animates itself, no Math.random.

   window.mc.ready         resolves once the first frame has been drawn
   window.mc.play(n)       plays beat n (1..6), resolves when it finishes
   window.mc.probe()       pixel samples, so the recorder can PROVE the canvas
                           is not a navy rectangle before it trusts the take
   window.mc.probeTokens() every visible actor's real projected height in screen
                           pixels (slabs and bodies, never glow sprites); the
                           scene asserts the named one at each naming pause
                           (DFM 207d, measured — 146b). */
(function () {
  var W = 1280, H = 720;
  var NAVY = 0x060D1F, GOLD = 0xE4B824, GOLD_HI = 0xFFD84D;
  var STEEL = 0x55627C, DARK = 0x2B3550, PLATE = 0x3A4766, LAMP_OFF = 0x2A3452, LAMP_ON = 0xFFB347;

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

  /* ---------- helpers (the label/glow/slab idiom the approved stages use) --- */
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
      if (opts.ticket) {
        /* a ticket has a perforated stub: a dashed line near its left end */
        g.setLineDash([10, 10]); g.lineWidth = 4; g.strokeStyle = opts.plateEdge || '#A8830F';
        g.beginPath(); g.moveTo(52, 10); g.lineTo(52, c.height - 10); g.stroke(); g.setLineDash([]);
      }
    }
    g.font = font;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = opts.colour || '#231A02';
    g.fillText(text, c.width / 2 + (opts.ticket ? 20 : 0), c.height / 2 + 2);
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
    lit.scale.set(w * 1.05, 1.5, 1);
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
  function std(colour, extra) {
    var o = { color: colour, roughness: 0.6, metalness: 0.25 };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return new THREE.MeshStandardMaterial(o);
  }

  /* ---------- the set: the PROGRAM on the left, the MACHINE on the right ---- */
  var PROG_X = -3.55, LINE_W = 5.3, STEP = 0.84, TOP_Y = 3.7;
  function lineAt(text, row, indent) {
    var l = makeLine(text, LINE_W, 78, indent);
    l.position.set(PROG_X + (indent ? 0.35 : 0), TOP_Y - row * STEP, 0);
    l.scale.setScalar(0.01);
    l.visible = false;
    scene.add(l);
    return l;
  }
  var defLine = lineAt('def ticket(name):', 0, 0);
  var retLine = lineAt('    return "Ticket for " + name', 1, 1);
  var prnLine = lineAt('    print("Ticket for " + name)', 1, 1);   /* the trap's inside, same row */
  var call1 = lineAt('ticket("Aoife")', 3, 0);
  var call2 = lineAt('ticket("Ben")', 4, 0);
  var call3 = lineAt('ticket("Cara")', 3, 0);                        /* the trap's call, same row as call 1 */

  /* THE MACHINE: a body with a slot in its top, a lamp, a cog, and a chute */
  var MX = 1.75, MY = 0.95;
  var machine = new THREE.Group();
  var bodyMat = std(STEEL);
  var body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 1.6), bodyMat);
  machine.add(body);
  var facePlate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 0.06), std(PLATE));
  facePlate.position.set(0, -0.1, 0.83);
  machine.add(facePlate);
  var rivetGeo = new THREE.SphereGeometry(0.06, 8, 8);
  [[-1.45, 1.05], [1.45, 1.05], [-1.45, -1.05], [1.45, -1.05]].forEach(function (p) {
    var r = new THREE.Mesh(rivetGeo, std(0x8A97B2)); r.position.set(p[0], p[1], 0.82); machine.add(r);
  });
  /* the lamp: off while nothing runs, amber while the machine works */
  var lampMat = std(LAMP_OFF, { emissive: 0x000000 });
  var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), lampMat);
  lamp.position.set(-0.95, 0.45, 0.9);
  machine.add(lamp);
  var lampHalo = glow('rgba(255,179,71,0.8)', 1.5);
  lampHalo.position.set(-0.95, 0.45, 0.7);
  lampHalo.material.opacity = 0;
  machine.add(lampHalo);
  /* the cog: turns while the machine works */
  var cog = new THREE.Group();
  var cogBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 24), std(0x9AA7C2));
  cogBody.rotation.x = Math.PI / 2;
  cog.add(cogBody);
  for (var i = 0; i < 8; i++) {
    var tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.12), std(0x9AA7C2));
    var a = i / 8 * Math.PI * 2;
    tooth.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0);
    tooth.rotation.z = a;
    cog.add(tooth);
  }
  var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12), std(DARK));
  hub.rotation.x = Math.PI / 2;
  cog.add(hub);
  cog.position.set(0.45, -0.25, 0.9);
  machine.add(cog);
  /* THE SLOT: a hopper in the top, and the plate that names it */
  var hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.42, 0.95, 4, 1, true), std(0x6B7A96, { side: THREE.DoubleSide }));
  hopper.rotation.y = Math.PI / 4;
  hopper.position.set(0, 1.65, 0);
  machine.add(hopper);
  var hopperRim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.06, 8, 4), std(0x9AA7C2));
  hopperRim.rotation.x = Math.PI / 2; hopperRim.rotation.z = Math.PI / 4;
  hopperRim.position.set(0, 2.12, 0);
  machine.add(hopperRim);
  var slotPlate = label('name', { plate: '#E4B824', plateEdge: '#A8830F', colour: '#231A02', h: 0.46, fs: 96, mono: true });
  slotPlate.position.set(0, 1.62, 0.75);
  slotPlate.renderOrder = 3;
  machine.add(slotPlate);
  /* THE CHUTE: a trough out of the machine's right side, sloping down to the hand */
  var chute = new THREE.Group();
  var trough = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.0), std(0x8A97B2));
  chute.add(trough);
  var lip1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.1), std(0x6B7A96)); lip1.position.set(0, 0.15, 0.5); chute.add(lip1);
  var lip2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.1), std(0x6B7A96)); lip2.position.set(0, 0.15, -0.5); chute.add(lip2);
  chute.position.set(2.3, -0.7, 0.1);
  chute.rotation.z = -0.26;
  machine.add(chute);
  /* the chute's shutter: slides down over the mouth in the trap beats */
  var shutter = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 1.0), std(0xC94F3F));
  shutter.position.set(1.66, 0.35, 0.1);
  shutter.visible = false;
  machine.add(shutter);
  /* the horn: the trap machine SHOUTS through it */
  var horn = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 20, 1, true), std(0xC94F3F, { side: THREE.DoubleSide }));
  horn.rotation.z = -0.9;
  horn.position.set(1.85, 1.55, 0.2);
  horn.visible = false;
  machine.add(horn);
  machine.position.set(MX, MY, 0);
  machine.scale.setScalar(0.01);
  machine.visible = false;
  scene.add(machine);
  var machineGlow = glow('rgba(228,184,36,0.35)', 6.5);
  machineGlow.position.set(MX, MY + 0.3, -2.0);
  machineGlow.material.opacity = 0;
  scene.add(machineGlow);

  /* THE HAND (Lesson 3's, on purpose): a palm, open, under the chute */
  var hand = new THREE.Group();
  (function () {
    var skin = std(0xE8B98F, { roughness: 0.75, metalness: 0 });
    var palm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.26, 1.1), skin);
    hand.add(palm);
    var fingerGeo = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.13, 0.62, 4, 8)
                                              : new THREE.CylinderGeometry(0.13, 0.13, 0.8, 8);
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
    var cuff = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 1.3), std(0x2E4A80, { roughness: 0.6, metalness: 0 }));
    cuff.position.set(-0.95, 0.02, 0);
    hand.add(cuff);
  })();
  var HAND_X = 4.55, HAND_Y = -1.55;
  hand.scale.setScalar(1.15);
  hand.rotation.z = -0.1;
  hand.position.set(HAND_X, HAND_Y, 0.9);
  hand.visible = false;
  scene.add(hand);

  /* the cards that go IN (the arguments) and the tickets that come OUT (the products) */
  function card(text) {
    var t = label('"' + text + '"', { plate: '#FFD84D', plateEdge: '#A8830F', colour: '#231A02', h: 0.6, fs: 110, mono: true });
    t.renderOrder = 5; t.visible = false; t.scale.setScalar(0.01);
    scene.add(t);
    return t;
  }
  function ticket(text) {
    var t = label(text, { plate: '#FFF4D6', plateEdge: '#A8830F', colour: '#231A02', h: 0.56, fs: 96, ticket: true });
    t.renderOrder = 5; t.visible = false; t.scale.setScalar(0.01);
    scene.add(t);
    return t;
  }
  var cards = { aoife: card('Aoife'), ben: card('Ben'), cara: card('Cara') };
  var tickets = { aoife: ticket('Ticket for Aoife'), ben: ticket('Ticket for Ben') };
  var shout = label('Ticket for Cara', { plate: '#FF9A8F', plateEdge: '#8A2010', colour: '#3A0C06', h: 0.62, fs: 104 });
  shout.renderOrder = 6; shout.visible = false; shout.scale.setScalar(0.01);
  scene.add(shout);
  var noneWord = label('None', { plate: '#FF9A8F', plateEdge: '#8A2010', colour: '#3A0C06', h: 0.6, fs: 118 });
  noneWord.renderOrder = 6; noneWord.visible = false; noneWord.scale.setScalar(0.01);
  scene.add(noneWord);

  /* ---------- beats ---------- */
  function rise(obj, to, dur) {
    obj.visible = true;
    return gsap.to(obj.scale, { duration: dur || 0.55, x: to, y: to, z: to, ease: 'back.out(1.5)' });
  }
  function tl() { return gsap.timeline(); }
  function done(t) { return new Promise(function (res) { t.eventCallback('onComplete', function () { res(true); }); }); }
  function lampOn(on) {
    gsap.to(lampMat.color, { duration: 0.25, r: on ? 1 : 0.16, g: on ? 0.70 : 0.20, b: on ? 0.28 : 0.32 });
    lampMat.emissive.setHex(on ? LAMP_ON : 0x000000);
    lampMat.emissiveIntensity = 0.7;
    gsap.to(lampHalo.material, { duration: 0.25, opacity: on ? 0.95 : 0 });
    gsap.to(machineGlow.material, { duration: 0.35, opacity: on ? 0.8 : 0 });
  }
  /* a card flies from beside its call line to the hopper and drops in */
  function feed(t, line, c) {
    t.call(function () {
      c.position.set(line.position.x + LINE_W / 2 + 0.9, line.position.y, 1.0);
      c.visible = true;
    });
    t.add(rise(c, 1, 0.4));
    t.to({}, { duration: 0.35 });
    t.to(c.position, { duration: 0.75, x: MX, y: MY + 3.1, z: 0.6, ease: 'power2.inOut' });
    t.to(c.position, { duration: 0.45, y: MY + 1.9, z: 0.2, ease: 'power2.in' });
    t.to(c.scale, { duration: 0.3, x: 0.3, y: 0.3, z: 0.3, ease: 'power2.in' }, '<0.15');
    t.call(function () { c.visible = false; });
  }
  /* the machine works: lamp on, cog turning, body jiggling */
  function work(t, secs) {
    t.call(function () { lampOn(true); });
    t.to(cog.rotation, { duration: secs, z: '-=' + (secs * 4.2), ease: 'none' }, '<');
    t.to(machine.position, { duration: 0.08, x: MX + 0.04, yoyo: true, repeat: Math.round(secs / 0.08) - 1, ease: 'none' }, '<');
    t.to({}, { duration: secs });
    /* the lamp STAYS on: the still at the end of a working beat shows a
       machine at work; the delivery (or the None) is what switches it off */
    t.call(function () { machine.position.x = MX; });
  }
  /* return: a ticket comes out of the chute and lands in the hand */
  function deliver(t, tk) {
    t.call(function () {
      tk.position.set(MX + 1.6, MY - 0.35, 0.9);
      tk.visible = true;
      tk.scale.setScalar(0.85);
    });
    t.to(tk.position, { duration: 0.6, x: MX + 3.05, y: MY - 0.95, ease: 'power1.in' });
    t.to(tk.position, { duration: 0.45, x: HAND_X + 0.1, y: HAND_Y + 0.5, z: 1.6, ease: 'power2.in' });
    t.to(tk.scale, { duration: 0.45, x: 1, y: 1, z: 1 }, '<');
    t.call(function () { lampOn(false); });
  }

  var beats = {
    /* 1 — def BUILDS the machine: two lines, one machine with one slot, and
           nothing runs */
    1: function () {
      var t = tl();
      t.add(rise(defLine, 1, 0.45));
      t.add(rise(retLine, 1, 0.45), '<0.16');
      t.to({}, { duration: 0.5 });
      t.call(function () { litOn(defLine, true); litOn(retLine, true); });
      t.add(rise(machine, 1, 0.8), '<0.1');
      t.to({}, { duration: 0.9 });
      t.call(function () { litOn(defLine, false); litOn(retLine, false); });
      /* it sits there. The lamp is off. That IS the beat. */
      t.to({}, { duration: 1.1 });
      return done(t);
    },
    /* 2 — a call drops a card into the slot, and the machine works */
    2: function () {
      var t = tl();
      t.add(rise(call1, 1, 0.45));
      t.call(function () { litOn(call1, true); });
      feed(t, call1, cards.aoife);
      work(t, 1.3);
      t.to({}, { duration: 0.2 });
      return done(t);
    },
    /* 3 — return pushes the product out of the chute into the hand */
    3: function () {
      var t = tl();
      t.call(function () { hand.visible = true; hand.scale.setScalar(0.01); });
      t.add(rise(hand, 1.15, 0.5));
      t.call(function () { litOn(retLine, true); });
      t.to({}, { duration: 0.35 });
      deliver(t, tickets.aoife);
      t.to({}, { duration: 0.5 });
      t.call(function () { litOn(retLine, false); litOn(call1, false); });
      t.to({}, { duration: 0.6 });
      return done(t);
    },
    /* 4 — a second call, a second product, the SAME machine */
    4: function () {
      var t = tl();
      t.add(rise(call2, 1, 0.45));
      t.call(function () { litOn(call2, true); });
      /* the first ticket moves aside in the hand, so the second can land */
      t.to(tickets.aoife.position, { duration: 0.5, x: HAND_X + 1.0, y: HAND_Y + 1.25, z: 0.8, ease: 'power2.out' }, '<');
      t.to(tickets.aoife.scale, { duration: 0.5, x: 0.8, y: 0.8, z: 0.8 }, '<');
      feed(t, call2, cards.ben);
      work(t, 1.1);
      t.call(function () { litOn(retLine, true); });
      t.to({}, { duration: 0.3 });
      deliver(t, tickets.ben);
      t.to({}, { duration: 0.5 });
      t.call(function () { litOn(retLine, false); litOn(call2, false); });
      t.to({}, { duration: 0.5 });
      return done(t);
    },
    /* 5 — THE TRAP: print inside, no return. The chute is shut, the machine
           gets a horn, and when the card goes in it SHOUTS the words */
    5: function () {
      var t = tl();
      t.call(function () {
        /* the program changes: the inside line now says print, and the calls
           and tickets of the working machine clear away */
        retLine.visible = false; call1.visible = false; call2.visible = false;
        tickets.aoife.visible = false; tickets.ben.visible = false;
      });
      t.add(rise(prnLine, 1, 0.45));
      t.call(function () { litOn(defLine, true); litOn(prnLine, true); });
      t.call(function () { shutter.visible = true; shutter.position.y = 0.35; horn.visible = true; horn.scale.setScalar(0.01); });
      t.to(shutter.position, { duration: 0.45, y: -0.45, ease: 'power2.in' });
      t.to(horn.scale, { duration: 0.45, x: 1, y: 1, z: 1, ease: 'back.out(1.5)' }, '<0.1');
      t.to({}, { duration: 0.6 });
      t.call(function () { litOn(defLine, false); litOn(prnLine, false); });
      t.add(rise(call3, 1, 0.45));
      t.call(function () { litOn(call3, true); });
      feed(t, call3, cards.cara);
      work(t, 0.9);
      t.call(function () { litOn(prnLine, true); shout.position.set(MX + 2.2, MY + 1.9, 1.2); });
      t.add(rise(shout, 1, 0.5));
      t.to(shout.position, { duration: 0.5, x: MX + 3.3, y: MY + 2.45, ease: 'power1.out' }, '<');
      t.to(shout.rotation, { duration: 0.12, z: 0.05, yoyo: true, repeat: 3 }, '<');
      t.to({}, { duration: 0.9 });
      return done(t);
    },
    /* 6 — and the hand gets… None */
    6: function () {
      var t = tl();
      t.call(function () { litOn(prnLine, false); litOn(call3, false); lampOn(false); });
      t.to({}, { duration: 0.5 });
      t.call(function () { noneWord.position.set(HAND_X + 0.1, MY - 0.5, 1.6); });
      t.add(rise(noneWord, 1, 0.5));
      t.to(noneWord.position, { duration: 0.55, y: HAND_Y + 0.5, ease: 'power2.in' });
      t.to({}, { duration: 1.2 });
      return done(t);
    }
  };

  /* ---------- render loop + the API record.js drives ---------- */
  var drawn = false;
  window.__installStageSubjects(THREE, scene, camera, renderer);
  function tick() { renderer.render(scene, camera); drawn = true; requestAnimationFrame(tick); }
  tick();

  function boxOf(objs) {
    var b = new THREE.Box3();
    objs.forEach(function (o) {
      if (!o.visible) return;
      b.union(new THREE.Box3().setFromObject(o.userData && o.userData.slab ? o.userData.slab : o));
    });
    return b;
  }
  function pxHeight(b) {
    if (b.isEmpty() || !isFinite(b.min.y) || !isFinite(b.max.y)) return 0;
    var mid = b.getCenter(new THREE.Vector3());
    var top = new THREE.Vector3(mid.x, b.max.y, mid.z).project(camera);
    var bot = new THREE.Vector3(mid.x, b.min.y, mid.z).project(camera);
    return Math.abs(top.y - bot.y) * (H / 2);
  }
  function groupHeight(objs) { return pxHeight(boxOf(objs)); }

  window.mc = {
    ready: new Promise(function (res) {
      var iv = setInterval(function () { if (drawn) { clearInterval(iv); res(true); } }, 30);
    }),
    play: function (n) { return beats[n] ? beats[n]() : Promise.resolve(false); },
    probe: function () {
      var g = renderer.getContext();
      /* sample points on a real frame: two on the program, two on the machine,
         one on the hand's row */
      var pts = [[300, 60], [300, 130], [780, 230], [780, 320], [1010, 470], [640, 600]];
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
      /* the machine is its body and its hopper — never its glow */
      if (machine.visible) {
        out.machine = Math.round(groupHeight([body, hopper, hopperRim]));
        out.slot = Math.round(groupHeight([hopper, hopperRim, slotPlate]));
        out.slotPlate = Math.round(groupHeight([slotPlate]));
        out.chute = Math.round(groupHeight([trough, lip1, lip2]));
        if (horn.visible) out.horn = Math.round(groupHeight([horn]));
      }
      if (defLine.visible) out.def = Math.round(groupHeight([defLine, retLine, prnLine]));
      if (call1.visible) out.call1 = Math.round(groupHeight([call1]));
      if (call2.visible) out.call2 = Math.round(groupHeight([call2]));
      if (call3.visible) out.call3 = Math.round(groupHeight([call3]));
      if (hand.visible) out.hand = Math.round(groupHeight([hand]));
      Object.keys(cards).forEach(function (k) { if (cards[k].visible) out['card_' + k] = Math.round(groupHeight([cards[k]])); });
      Object.keys(tickets).forEach(function (k) { if (tickets[k].visible) out['ticket_' + k] = Math.round(groupHeight([tickets[k]])); });
      if (shout.visible) out.shout = Math.round(groupHeight([shout]));
      if (noneWord.visible) out.none = Math.round(groupHeight([noneWord]));
      return out;
    }
  };
})();
