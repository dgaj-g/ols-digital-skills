/* =========================================================================
   UK Coastal Adventure — ambient scenery (redesign pass)
   Injects the living-sea backdrops (layered waves, clouds, gull silhouettes,
   sun glow) and provides the illustrated boat + atlas ornaments used by the
   map builder in script.js. Pure decoration: everything is aria-hidden and
   pointer-events:none; all motion is transform/opacity only and is disabled
   under prefers-reduced-motion (see style.css).
   ========================================================================= */
window.OLS_DECOR = (function () {
  'use strict';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* A seamless sine wave band: spans 2×W user units so a translateX(-W)
     loop tiles perfectly. Returns a filled path string. */
  function wavePath(W, y, amp, cycles, depth) {
    const half = W / (cycles * 2);
    let d = 'M0,' + y;
    let x = 0, up = true;
    while (x < 2 * W - 1) {
      d += ' q' + (half / 2) + ',' + (up ? -amp : amp) + ' ' + half + ',0';
      x += half; up = !up;
    }
    d += ' L' + (2 * W) + ',' + (y + depth) + ' L0,' + (y + depth) + ' Z';
    return d;
  }

  /* A classic curved-M gull silhouette, ~26 units wide, origin at centre. */
  function gullPath() {
    return 'M-13,0 Q-8,-7 -1,-1.5 Q0,-1 1,-1.5 Q8,-7 13,0 Q7,-4 1,0.5 Q0,1 -1,0.5 Q-7,-4 -13,0 Z';
  }

  /* One soft cloud cluster built from overlapping ellipses. */
  function cloud(cx, cy, s, o) {
    return '<g transform="translate(' + cx + ',' + cy + ') scale(' + s + ')" fill="#ffffff" opacity="' + o + '">' +
      '<ellipse cx="0" cy="0" rx="46" ry="15"/>' +
      '<ellipse cx="-26" cy="4" rx="26" ry="11"/>' +
      '<ellipse cx="24" cy="3" rx="30" ry="12"/>' +
      '<ellipse cx="4" cy="-8" rx="24" ry="11"/></g>';
  }

  /* ---------------------------------------------------------------
     The full-bleed scene injected behind .sea-bg screens.
     variant: 'full' (sun, clouds, gulls, 3 wave bands)
              'sky'  (clouds + gulls only — used behind the voyage map)
              'shore'(waves + gulls, no sun — over the briefing photo)
     --------------------------------------------------------------- */
  function seaScene(section, variant) {
    if (!section || section.querySelector('.sea-scene')) return;
    const W = 1200, H = 240;
    const scene = document.createElement('div');
    scene.className = 'sea-scene sea-scene-' + variant;
    scene.setAttribute('aria-hidden', 'true');

    let sky = '';
    if (variant === 'full') {
      sky =
        '<svg class="scene-sky" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMin slice">' +
        '<defs><radialGradient id="sunG" cx="0.5" cy="0.5" r="0.5">' +
        '<stop offset="0" stop-color="#fff6d8" stop-opacity="0.95"/>' +
        '<stop offset="0.45" stop-color="#f5d45e" stop-opacity="0.34"/>' +
        '<stop offset="1" stop-color="#f5d45e" stop-opacity="0"/></radialGradient></defs>' +
        '<circle cx="1010" cy="58" r="150" fill="url(#sunG)"/>' +
        '<circle cx="1010" cy="58" r="34" fill="#fdf3cf" opacity="0.9"/>' +
        '<g class="cloud-row cloud-row-a">' + cloud(140, 70, 1, 0.75) + cloud(690, 40, 0.8, 0.6) + cloud(1180, 96, 1.15, 0.7) + '</g>' +
        '<g class="cloud-row cloud-row-b">' + cloud(420, 120, 0.62, 0.5) + cloud(930, 140, 0.5, 0.42) + '</g>' +
        '</svg>';
    }
    if (variant === 'sky') {
      sky =
        '<svg class="scene-sky" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMin slice">' +
        '<g class="cloud-row cloud-row-a">' + cloud(150, 64, 0.9, 0.65) + cloud(700, 36, 0.7, 0.5) + cloud(1150, 90, 1, 0.6) + '</g>' +
        '</svg>';
    }

    let gulls = '';
    if (variant !== 'none') {
      gulls =
        '<svg class="scene-gulls" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMin slice">' +
        '<g class="gull gull-a" fill="#2a4467" opacity="0.55"><path d="' + gullPath() + '"/></g>' +
        '<g class="gull gull-b" fill="#2a4467" opacity="0.4"><path transform="scale(0.72)" d="' + gullPath() + '"/></g>' +
        '<g class="gull gull-c" fill="#2a4467" opacity="0.3"><path transform="scale(0.55)" d="' + gullPath() + '"/></g>' +
        '</svg>';
    }

    let waves = '';
    if (variant === 'full' || variant === 'shore') {
      waves =
        '<svg class="scene-waves" viewBox="0 0 1200 240" preserveAspectRatio="none">' +
        '<g class="wave-layer wave-far"><path fill="#9ecbe6" opacity="0.55" d="' + wavePath(W, 78, 9, 5, H) + '"/></g>' +
        '<g class="wave-layer wave-mid"><path fill="#6fa8cf" opacity="0.6" d="' + wavePath(W, 116, 12, 4, H) + '"/></g>' +
        '<g class="wave-layer wave-near"><path fill="#3f7fb0" opacity="0.72" d="' + wavePath(W, 158, 15, 3, H) + '"/>' +
        '<path class="wave-foam" fill="none" stroke="#f7fbff" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 26" opacity="0.85" d="' + wavePath(W, 155, 15, 3, 0).replace(/ L.*Z$/, '') + '"/></g>' +
        '</svg>';
    }

    scene.innerHTML = sky + gulls + waves;
    /* Prepend: the scene carries z-index 1, so it paints above the full-bleed
       hero photo (z 0) but below the content cards (z 2) and any sibling
       content that follows it in the DOM at the same z level. */
    section.insertBefore(scene, section.firstChild);
    return scene;
  }

  /* ---------------------------------------------------------------
     Illustrated sailing boat (SVG group markup). ~46 units wide, the
     waterline sits at y=0 and x=0 is the mast. script.js positions the
     group with transform=translate(x,y).
     --------------------------------------------------------------- */
  function boatMarkup(cls) {
    return '<g class="' + (cls || 'uk-boat') + '">' +
      '<ellipse class="boat-shadow" cx="0" cy="3.5" rx="20" ry="3.6" fill="#0c2340" opacity="0.18"/>' +
      '<path class="boat-hull" d="M-19,-1 L19,-1 L13,8 Q0,11 -13,8 Z" fill="#1a3a6b" stroke="#0e2a4c" stroke-width="1"/>' +
      '<path d="M-19,-1 L19,-1 L17.6,1.4 L-17.6,1.4 Z" fill="#E4B824"/>' +
      '<rect x="-1.1" y="-30" width="2.2" height="29" rx="1" fill="#5c4326"/>' +
      '<path class="boat-sail-main" d="M1.5,-28.5 Q13,-20 15.5,-3.5 L1.5,-3.5 Z" fill="#f7fbff" stroke="#d5e2ee" stroke-width="0.8"/>' +
      '<path class="boat-sail-jib" d="M-1.8,-24.5 Q-12,-16 -14,-3.5 L-1.8,-3.5 Z" fill="#f0e2c0" stroke="#dcc99a" stroke-width="0.8"/>' +
      '<path d="M-0.4,-30 L-9,-27.4 L-0.4,-24.6 Z" fill="#C0392B"/>' +
      '</g>';
  }

  /* ---------------------------------------------------------------
     Atlas ornaments for the UK map: faint graticule + compass rose.
     Injected as an SVG string that buildMapSVG prepends behind the land.
     viewBox of the map is  -96 -26 836 884.
     --------------------------------------------------------------- */
  function mapGraticule() {
    let g = '<g class="uk-graticule" opacity="0.35">';
    for (let x = -40; x <= 780; x += 120) g += '<line x1="' + x + '" y1="-26" x2="' + x + '" y2="858" stroke="#8fb6d4" stroke-width="0.7"/>';
    for (let y = 30; y <= 858; y += 120) g += '<line x1="-96" y1="' + y + '" x2="740" y2="' + y + '" stroke="#8fb6d4" stroke-width="0.7"/>';
    return g + '</g>';
  }

  function compassRose(cx, cy, r) {
    function pt(ang, rad) { const a = (ang - 90) * Math.PI / 180; return (cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1); }
    let g = '<g class="uk-compass">';
    g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#f7fbff" opacity="0.75" stroke="#9dbdd8" stroke-width="1"/>';
    g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 7) + '" fill="none" stroke="#9dbdd8" stroke-width="0.8" stroke-dasharray="2 4"/>';
    // 4 minor points (NE/SE/SW/NW)
    [45, 135, 225, 315].forEach(a => {
      g += '<path d="M' + pt(a, r - 9) + ' L' + pt(a + 14, 6) + ' L' + pt(a - 14, 6) + ' Z" fill="#9dbdd8"/>';
    });
    // 4 cardinal points, two-tone
    [0, 90, 180, 270].forEach(a => {
      g += '<path d="M' + pt(a, r - 3) + ' L' + pt(a + 11, 7) + ' L' + pt(a, 0) + ' Z" fill="#1A3A6B"/>' +
           '<path d="M' + pt(a, r - 3) + ' L' + pt(a - 11, 7) + ' L' + pt(a, 0) + ' Z" fill="#E4B824"/>';
    });
    g += '<circle cx="' + cx + '" cy="' + cy + '" r="3.2" fill="#1A3A6B" stroke="#E4B824" stroke-width="1.4"/>';
    g += '<text x="' + cx + '" y="' + (cy - r - 6) + '" text-anchor="middle" font-size="15" font-weight="800" fill="#1A3A6B" font-family="Georgia,serif">N</text>';
    return g + '</g>';
  }

  return { seaScene, boatMarkup, mapGraticule, compassRose };
})();
