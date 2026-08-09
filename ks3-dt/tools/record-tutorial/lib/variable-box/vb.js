/* vb.js — THE VARIABLE BOX (DFM 174).

   DAMIEN, 9 Aug 2026: "your explanation of a variable should be more visually
   understandable for a child. Create an impressive 3d animation... The animation
   should be of a box or container that has a name on it (the name of the
   variable) and then something like a number is being put into it, explaining
   whats happening as you go. this can replace the current slide in the video that
   explains a variable (and it's more than just a number that can be put in a
   variable, unlike your explanation, but I understand you were probably trying to
   simplify things). then the video can start after that."

   His correction is beat 5's whole reason for existing: a second box called
   `team` takes in the WORD gold. Simplify without teaching a falsehood (DFM 35).

   RECORDING CONSTRAINTS - this is filmed head-less through Playwright, so the GPU
   is usually SwiftShader (software). Hence: no shadow maps, no post-processing,
   modest geometry, and every glow done with emissive material + a sprite, not a
   bloom pass. The scene DRIVES nothing itself: record.js calls window.vb.play(n)
   beat by beat, so caption timing and the recording stay in step and a re-record
   is reproducible (no Math.random anywhere - the dust positions are a fixed table).

   window.vb.ready   resolves when the first frame has been drawn
   window.vb.play(n) plays beat n (1..6) and resolves when it finishes
   window.vb.probe() returns pixel samples, so the recorder can PROVE the canvas
                     is not a black rectangle before it trusts the take */
(function () {
  var W = 1280, H = 720;
  var NAVY = 0x060D1F, GOLD = 0xE4B824, GOLD_HI = 0xFFD84D, INK = 0x17223B;

  var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.Fog(NAVY, 14, 34);

  var camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(0, 1.6, 9.2);
  camera.lookAt(0, 0.2, 0);

  scene.add(new THREE.AmbientLight(0x8fa6d8, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(4, 7, 6); scene.add(key);
  var warm = new THREE.PointLight(GOLD, 0.85, 22); warm.position.set(-4, 2.5, 4); scene.add(warm);

  /* ---------- helpers ---------- */
  function label(text, opts) {
    opts = opts || {};
    var pad = 24, fs = opts.fs || 96, weight = opts.weight || '700';
    var c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = weight + ' ' + fs + 'px "Helvetica Neue", Arial, sans-serif';
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
    g.font = weight + ' ' + fs + 'px "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = opts.colour || '#231A02';
    g.fillText(text, c.width / 2, c.height / 2 + 2);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    var mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry((c.width / c.height) * (opts.h || 0.6), opts.h || 0.6), mat);
    mesh.userData.aspect = c.width / c.height;
    return mesh;
  }

  /* a glass box with gold edges. The lid is its own mesh so it can hinge open. */
  function makeBox(size) {
    var g = new THREE.Group();
    var s = size || 2.4, h = s * 0.78;
    var glass = new THREE.MeshStandardMaterial({
      color: 0x1B3566, transparent: true, opacity: 0.38, roughness: 0.25, metalness: 0.1,
      depthWrite: false   /* glass you can see INTO: with depthWrite on, the front
                             face hid the number sitting inside the box */
    });
    var body = new THREE.Mesh(new THREE.BoxGeometry(s, h, s), glass);
    body.position.y = h / 2;
    body.renderOrder = 1;
    g.add(body);
    var edgeMat = new THREE.MeshBasicMaterial({ color: GOLD });
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s, h, s)),
      new THREE.LineBasicMaterial({ color: GOLD }));
    edges.position.y = h / 2;
    g.add(edges);
    /* corner posts give the gold some thickness at 720p, where a 1px line vanishes */
    var post = new THREE.CylinderGeometry(0.035, 0.035, h, 8);
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
    lid.position.set(0, h, -s / 2);      /* hinge at the back edge */
    g.add(lid);
    g.userData = { size: s, height: h, lid: lid, body: body };
    return g;
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

  /* ---------- the scene ---------- */
  var scoreBox = makeBox(2.4);
  scoreBox.position.set(0, -0.9, 0);
  scene.add(scoreBox);
  scoreBox.scale.setScalar(0.01);

  var boxGlow = glow('rgba(228,184,36,0.55)', 7);
  boxGlow.position.set(0, 0.3, -1.6);
  boxGlow.material.opacity = 0;
  scene.add(boxGlow);

  var plate = label('score', { plate: '#E4B824', colour: '#231A02', h: 0.62 });
  plate.renderOrder = 3;
  plate.position.set(0, -0.34, 1.24);   /* low on the front, like a real label - it used to sit where the number lives */
  plate.scale.setScalar(0.01);
  scene.add(plate);

  var teamBox = makeBox(2.0);
  teamBox.position.set(6.4, -0.9, -0.6);
  teamBox.visible = false;
  scene.add(teamBox);
  var teamWord = null;
  var teamPlate = label('team', { plate: '#E4B824', colour: '#231A02', h: 0.52 });
  teamPlate.renderOrder = 3;
  teamPlate.position.set(6.4, -0.42, 0.45);
  teamPlate.visible = false;
  scene.add(teamPlate);

  /* the value living inside the box */
  var value = null;
  function makeValue(text, colour) {
    var m = label(text, { colour: colour || '#FFD84D', h: 1.3, fs: 150 });
    m.renderOrder = 2;
    m.position.set(0, 3.4, 0.02);
    scene.add(m);
    return m;
  }

  /* button-A badge (beat 4) */
  var badge = new THREE.Group();
  var badgeRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 10, 28),
    new THREE.MeshBasicMaterial({ color: GOLD_HI }));
  badge.add(badgeRing);
  var badgeA = label('A', { colour: '#FFD84D', h: 0.5, fs: 120 });
  badge.add(badgeA);
  badge.position.set(3.5, 2.2, 0.5);
  badge.visible = false;
  scene.add(badge);

  /* micro:bit (beat 6): board + a real 5x5 LED grid */
  var mb = new THREE.Group();
  var board = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.5, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.6 }));
  mb.add(board);
  var leds = [];
  var ledOn = new THREE.MeshBasicMaterial({ color: 0xFF3B2F });
  var ledOff = new THREE.MeshBasicMaterial({ color: 0x2A1412 });
  var ledGeo = new THREE.BoxGeometry(0.12, 0.22, 0.04);
  for (var r = 0; r < 5; r++) {
    for (var c2 = 0; c2 < 5; c2++) {
      var led = new THREE.Mesh(ledGeo, ledOff);
      led.position.set((c2 - 2) * 0.32, (2 - r) * 0.34, 0.08);
      mb.add(led); leds.push(led);
    }
  }
  mb.position.set(6.6, 0.2, -0.4);
  mb.visible = false;
  scene.add(mb);

  /* the micro:bit's own 5x5 digit glyphs (its real font, not an invention) */
  var GLYPH = {
    3: ['11110', '00010', '01100', '00010', '11110'],
    4: ['10010', '10010', '11110', '00010', '00010']
  };
  function showDigit(n) {
    var g = GLYPH[n];
    leds.forEach(function (led, i) {
      var row = Math.floor(i / 5), col = i % 5;
      led.material = (g && g[row][col] === '1') ? ledOn : ledOff;
    });
  }

  /* star dust - fixed positions, because Math.random would break a re-record */
  var DUST = [[-7.2,3.9,-6],[6.1,4.4,-7],[-4.4,-2.8,-5],[3.3,4.9,-8],[-8.1,1.2,-7],
    [7.7,-1.9,-6],[1.1,5.4,-9],[-2.2,4.1,-7],[5.2,2.2,-8],[-6.3,-1.1,-6],
    [2.8,-3.2,-5],[-1.4,5.9,-8],[8.3,3.1,-9],[-5.1,2.7,-7],[4.1,-2.4,-6]];
  var dust = new THREE.Group();
  DUST.forEach(function (p) {
    var d = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x9FB6E8 }));
    d.position.set(p[0], p[1], p[2]);
    dust.add(d);
  });
  scene.add(dust);

  var clock = 0;
  function frame() {
    clock += 0.016;
    dust.rotation.y = clock * 0.012;
    dust.position.y = Math.sin(clock * 0.25) * 0.12;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  var tl = function () { return gsap.timeline({ defaults: { ease: 'power3.out' } }); };
  function orbit(t, to, dur) { t.to(camera.position, { x: to, duration: dur, ease: 'sine.inOut',
    onUpdate: function () { camera.lookAt(0, 0.2, 0); } }, 0); }

  var beats = {
    /* 1 — the box appears */
    1: function () {
      var t = tl();
      t.to(scoreBox.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: 'back.out(1.4)' }, 0.2);
      t.to(boxGlow.material, { opacity: 0.85, duration: 1.0 }, 0.5);
      t.to(boxGlow.material, { opacity: 0.45, duration: 1.4 }, 1.6);
      t.to({}, { duration: 2.4 });
      return t;
    },
    /* 2 — the name stamps on */
    2: function () {
      var t = tl();
      plate.position.set(-3.6, 2.2, 1.24);
      plate.rotation.z = -0.5;
      t.to(plate.scale, { x: 1, y: 1, z: 1, duration: 0.5 }, 0);
      t.to(plate.position, { x: 0, y: -0.34, duration: 1.1, ease: 'power4.in' }, 0.1);
      t.to(plate.rotation, { z: 0, duration: 1.1, ease: 'power4.in' }, 0.1);
      t.to(plate.scale, { x: 1.16, y: 1.16, duration: 0.12 }, 1.2);
      t.to(plate.scale, { x: 1, y: 1, duration: 0.5, ease: 'elastic.out(1,0.4)' }, 1.32);
      orbit(t, 2.4, 4.2);
      t.to({}, { duration: 2.2 });
      return t;
    },
    /* 3 — a value drops in */
    3: function () {
      var t = tl();
      var lid = scoreBox.userData.lid;
      value = makeValue('0');
      t.to(camera.position, { x: 0, duration: 1.1, ease: 'sine.inOut',
        onUpdate: function () { camera.lookAt(0, 0.2, 0); } }, 0);
      t.to(lid.rotation, { x: -1.15, duration: 0.8 }, 0.2);
      t.to(value.position, { y: 0.42, duration: 1.0, ease: 'bounce.out' }, 1.0);
      t.to(lid.rotation, { x: 0, duration: 0.7 }, 2.2);
      t.to(boxGlow.material, { opacity: 0.8, duration: 0.4 }, 2.2);
      t.to(boxGlow.material, { opacity: 0.45, duration: 0.8 }, 2.6);
      t.to({}, { duration: 2.6 });
      return t;
    },
    /* 4 — the value CHANGES; the name does not */
    4: function () {
      var t = tl();
      badge.visible = true;
      badge.scale.setScalar(0.01);
      t.to(badge.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(2)' }, 0);
      [1, 2, 3].forEach(function (n, i) {
        var at = 0.9 + i * 1.5;
        t.to(badge.scale, { x: 1.3, y: 1.3, duration: 0.12 }, at);
        t.to(badge.scale, { x: 1, y: 1, duration: 0.3, ease: 'elastic.out(1,0.4)' }, at + 0.12);
        t.call(function () {
          var old = value;
          gsap.to(old.position, { y: 2.4, duration: 0.45, ease: 'power2.in' });
          gsap.to(old.material, { opacity: 0, duration: 0.45,
            onComplete: function () { scene.remove(old); } });
          value = makeValue(String(n));
          value.position.y = 3.2;
          gsap.to(value.position, { y: 0.42, duration: 0.55, ease: 'bounce.out' });
        }, null, at + 0.15);
        /* the NAME never moves - it only catches the light */
        t.to(plate.scale, { x: 1.05, y: 1.05, duration: 0.18 }, at + 0.2);
        t.to(plate.scale, { x: 1, y: 1, duration: 0.4 }, at + 0.38);
      });
      t.to({}, { duration: 1.6 });
      return t;
    },
    /* 5 — HIS CORRECTION: a variable holds more than numbers */
    5: function () {
      var t = tl();
      teamBox.visible = true; teamPlate.visible = true;
      teamBox.scale.setScalar(0.01); teamPlate.scale.setScalar(0.01);
      t.to(camera.position, { x: 2.6, duration: 1.2, ease: 'sine.inOut',
        onUpdate: function () { camera.lookAt(1.6, 0.2, 0); } }, 0);
      t.to(teamBox.position, { x: 3.9, duration: 1.3 }, 0.2);
      t.to(teamPlate.position, { x: 3.9, duration: 1.3 }, 0.2);
      t.to(teamBox.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.4)' }, 0.3);
      t.to(teamPlate.scale, { x: 1, y: 1, z: 1, duration: 0.9 }, 0.4);
      t.call(function () {
        var word = label('GOLD', { colour: '#FFD84D', h: 0.56, fs: 120 });
        word.renderOrder = 2;
        teamWord = word;
        word.position.set(3.9, 3.6, 0.5);
        scene.add(word);
        gsap.to(teamBox.userData.lid.rotation, { x: -1.1, duration: 0.6 });
        gsap.to(word.position, { y: 0.34, duration: 0.9, ease: 'bounce.out', delay: 0.5 });
        gsap.to(teamBox.userData.lid.rotation, { x: 0, duration: 0.6, delay: 1.6 });
      }, null, 1.3);
      t.to({}, { duration: 4.6 });
      return t;
    },
    /* 6 — the payoff: this is what you are about to build */
    6: function () {
      var t = tl();
      t.to(teamBox.position, { x: 14.5, duration: 1.0, ease: "power2.in" }, 0);
      t.to(teamPlate.position, { x: 14.5, duration: 1.0, ease: "power2.in" }, 0);
      /* the word rode in with the box, so it has to ride out with it - it used to
         stay behind and hang over the micro:bit */
      if (teamWord) t.to(teamWord.position, { x: 14.5, duration: 1.0, ease: "power2.in" }, 0);
      t.to(badge.scale, { x: 0.01, y: 0.01, duration: 0.5 }, 0);
      t.call(function () { mb.visible = true; showDigit(3); }, null, 0.9);
      t.fromTo(mb.position, { x: 8.4 }, { x: 3.6, duration: 1.2, ease: 'power3.out' }, 0.9);
      t.to(camera.position, { x: 1.4, duration: 1.4, ease: 'sine.inOut',
        onUpdate: function () { camera.lookAt(1.2, 0.2, 0); } }, 0.6);
      /* the box ticks 3 -> 4, and the micro:bit follows half a second later */
      t.call(function () {
        var old = value;
        gsap.to(old.material, { opacity: 0, duration: 0.4,
          onComplete: function () { scene.remove(old); } });
        value = makeValue('4');
        value.position.y = 3.0;
        gsap.to(value.position, { y: 0.42, duration: 0.5, ease: 'bounce.out' });
        setTimeout(function () { showDigit(4); }, 500);
      }, null, 3.4);
      t.to({}, { duration: 4.2 });
      return t;
    }
  };

  /* value starts hidden until beat 3 mounts it */
  /* exposed for the frame audit and for probing the scene from Playwright */
  window.__scene = scene; window.__cam = camera;
  window.vb = {
    ready: new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); }),
    play: function (n) {
      return new Promise(function (res) {
        var t = beats[n]();
        t.eventCallback('onComplete', res);
      });
    },
    /* the recorder's proof that WebGL really drew something (a black canvas means
       the software renderer fell over, and the take must be thrown away) */
    probe: function () {
      var g = renderer.domElement.getContext('webgl2') || renderer.domElement.getContext('webgl');
      var px = new Uint8Array(4 * 40 * 40);
      var out = [];
      [[540, 300], [640, 420], [300, 360]].forEach(function (p) {
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
