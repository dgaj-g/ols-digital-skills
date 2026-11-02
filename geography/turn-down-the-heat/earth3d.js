/* The 3D Earth (Three.js r149). Pattern from chemistry/isotope-snap atom3d.js: one renderer per mount,
   custom drag spin, render only while on screen, flat-image fallback when WebGL is missing.
   Textures are data URIs (window.TDTH_EARTH, window.TDTH_WARM) so it works from file://. */
(function () {
  var DEG = Math.PI / 180;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function webglOK() {
    if (/[?&]flat=1/.test(location.search)) return false;
    try { var c = document.createElement('canvas'); return !!(window.THREE && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }

  function flat(container, opts) {
    var box = document.createElement('div');
    box.className = 'earth-flat';
    var base = document.createElement('img');
    base.alt = opts.alt || 'A flat map of the Earth';
    base.src = window.TDTH_EARTH || '';
    var map = document.createElement('div');
    map.className = 'earth-flat-map';
    map.appendChild(base);
    box.appendChild(map);
    var over = null;
    if (opts.overlay && window.TDTH_WARM) {
      over = document.createElement('img');
      over.alt = ''; over.className = 'earth-flat-over'; over.src = window.TDTH_WARM;
      over.style.opacity = opts.opacity == null ? 0.85 : opts.opacity;
      map.appendChild(over);
    }
    if (opts.flatNote) { var n = document.createElement('p'); n.className = 'earth-flat-note'; n.textContent = opts.flatNote; box.appendChild(n); }
    container.appendChild(box);
    container.classList.add('is-flat');
    return { flat: true, setOpacity: function (v) { if (over) over.style.opacity = v; }, face: function () {}, dispose: function () { box.remove(); } };
  }

  function mount(container, opts) {
    opts = opts || {};
    if (!webglOK()) return flat(container, opts);
    var T = window.THREE, renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { return flat(container, opts); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    var canvas = renderer.domElement;
    canvas.className = 'earth-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', opts.alt || 'A globe of the Earth that you can spin');
    container.appendChild(canvas);

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, opts.distance || 4.2);
    scene.add(new T.AmbientLight(0xffffff, 0.62));
    var sun = new T.DirectionalLight(0xfff3d6, 0.85);
    sun.position.set(-3, 2, 4);
    scene.add(sun);

    var tilt = new T.Group(), spin = new T.Group();
    tilt.add(spin); scene.add(tilt);
    var loader = new T.TextureLoader();
    var earthMat = new T.MeshLambertMaterial({ color: window.TDTH_EARTH ? 0xffffff : 0x2a6db5 });
    if (window.TDTH_EARTH) { var tx = loader.load(window.TDTH_EARTH, function () { draw(); }); tx.encoding = T.sRGBEncoding; tx.anisotropy = 4; earthMat.map = tx; }
    var earth = new T.Mesh(new T.SphereGeometry(1, 96, 64), earthMat);
    spin.add(earth);

    var overMat = null;
    if (opts.overlay && window.TDTH_WARM) {
      var ox = loader.load(window.TDTH_WARM, function () { draw(); }); ox.encoding = T.sRGBEncoding;
      overMat = new T.MeshBasicMaterial({ map: ox, transparent: true, opacity: opts.opacity == null ? 0.85 : opts.opacity, depthWrite: false });
      spin.add(new T.Mesh(new T.SphereGeometry(1.004, 96, 64), overMat));
    }

    var glow = new T.Mesh(new T.SphereGeometry(1.13, 64, 48), new T.ShaderMaterial({
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.68 - dot(vN, vec3(0.0,0.0,1.0)), 2.4); gl_FragColor = vec4(0.36,0.66,1.0,1.0) * i; }',
      side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false
    }));
    scene.add(glow);

    if (opts.stars !== false) {
      var g = new T.BufferGeometry(), pts = [];
      for (var i = 0; i < 900; i++) {
        var u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 30, s = Math.sqrt(1 - u * u);
        pts.push(r * s * Math.cos(a), r * u, r * s * Math.sin(a) - 10);
      }
      g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
    }

    function face(lat, lon) { tilt.rotation.x = lat * DEG; spin.rotation.y = -(lon + 90) * DEG; draw(); }
    face(opts.lat == null ? 25 : opts.lat, opts.lon == null ? -10 : opts.lon);

    // drag to spin, with a little inertia
    var drag = null, vel = 0, idle = 0;
    canvas.style.touchAction = 'pan-y';
    canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; vel = 0; idle = 0; canvas.setPointerCapture(e.pointerId); container.classList.add('spinning'); if (opts.onSpin) opts.onSpin(); });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      spin.rotation.y += dx * 0.0075; vel = dx * 0.0075;
      tilt.rotation.x = Math.max(-1.25, Math.min(1.25, tilt.rotation.x + dy * 0.006));
      draw();
    });
    function up() { drag = null; container.classList.remove('spinning'); }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft') spin.rotation.y -= 0.2; else if (k === 'ArrowRight') spin.rotation.y += 0.2;
      else if (k === 'ArrowUp') tilt.rotation.x = Math.min(1.25, tilt.rotation.x + 0.15);
      else if (k === 'ArrowDown') tilt.rotation.x = Math.max(-1.25, tilt.rotation.x - 0.15);
      else return;
      e.preventDefault(); draw(); if (opts.onSpin) opts.onSpin();
    });
    canvas.tabIndex = 0;

    var visible = true, raf = null, alive = true;
    function size() {
      var w = container.clientWidth || 300, h = container.clientHeight || w;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix(); draw();
    }
    function draw() { renderer.render(scene, camera); }
    function loop() {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      if (!drag) {
        if (Math.abs(vel) > 0.0002) { spin.rotation.y += vel; vel *= 0.94; }
        else if (opts.autoRotate && !reduce) { idle++; if (idle > 90) spin.rotation.y += 0.0016; }
      }
      draw();
    }
    var ro = window.ResizeObserver ? new ResizeObserver(size) : null;
    if (ro) ro.observe(container); else window.addEventListener('resize', size);
    var io = window.IntersectionObserver ? new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }) : null;
    if (io) io.observe(container);
    size(); loop();

    return {
      flat: false,
      setOpacity: function (v) { if (overMat) { overMat.opacity = v; draw(); } },
      face: face,
      dispose: function () {
        alive = false; cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); if (io) io.disconnect();
        renderer.dispose(); canvas.remove();
      }
    };
  }

  window.TDTH_EARTH3D = { mount: mount, webglOK: webglOK };
})();
