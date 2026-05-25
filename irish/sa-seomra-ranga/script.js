// Sa Seomra Ranga — J1 Irish classroom vocabulary
// Three modes: Identify (picture → Irish word), Bag (drag from desk into school bag),
// Memory match (flip pairs of picture + Irish word).
// Audio: optional per-item .m4a in /audio/<id>.m4a. Speaker buttons appear
// automatically only when the file is reachable, so dropping recordings in
// later "just lights them up".

// =================================================================
// Data: classroom items with inline SVG illustrations
// All SVGs use a consistent 100×100 viewBox and the page's
// parchment / Celtic-green palette.
// =================================================================

const SVG = {
  // --- Wooden wall clock with brass numerals & green hands ---
  clog: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="51" cy="92" rx="32" ry="3" fill="#3D2008" opacity="0.22"/>
    <circle cx="50" cy="50" r="42" fill="#8A6238" stroke="#3D2008" stroke-width="2.4"/>
    <circle cx="50" cy="50" r="40" fill="none" stroke="#5C3309" stroke-width="0.7" opacity="0.6"/>
    <circle cx="50" cy="50" r="36" fill="none" stroke="#C68B4B" stroke-width="1" opacity="0.7"/>
    <circle cx="50" cy="50" r="33" fill="#FBF6E1" stroke="#3D2008" stroke-width="1.6"/>
    <circle cx="50" cy="50" r="31" fill="none" stroke="#C9A227" stroke-width="0.7" opacity="0.6"/>
    <g stroke="#2A2218" stroke-width="2.2" stroke-linecap="round">
      <line x1="50" y1="22" x2="50" y2="28"/>
      <line x1="78" y1="50" x2="72" y2="50"/>
      <line x1="50" y1="78" x2="50" y2="72"/>
      <line x1="22" y1="50" x2="28" y2="50"/>
    </g>
    <g stroke="#5C3309" stroke-width="1.4" stroke-linecap="round">
      <line x1="64" y1="26" x2="62" y2="29"/><line x1="74" y1="36" x2="71" y2="38"/>
      <line x1="74" y1="64" x2="71" y2="62"/><line x1="64" y1="74" x2="62" y2="71"/>
      <line x1="36" y1="74" x2="38" y2="71"/><line x1="26" y1="64" x2="29" y2="62"/>
      <line x1="26" y1="36" x2="29" y2="38"/><line x1="36" y1="26" x2="38" y2="29"/>
    </g>
    <text x="50" y="35" text-anchor="middle" font-family="Georgia,serif" font-size="7.5" font-weight="700" fill="#2A2218">12</text>
    <text x="69" y="53" text-anchor="middle" font-family="Georgia,serif" font-size="7.5" font-weight="700" fill="#2A2218">3</text>
    <text x="50" y="73" text-anchor="middle" font-family="Georgia,serif" font-size="7.5" font-weight="700" fill="#2A2218">6</text>
    <text x="31" y="53" text-anchor="middle" font-family="Georgia,serif" font-size="7.5" font-weight="700" fill="#2A2218">9</text>
    <line x1="50" y1="50" x2="62" y2="38" stroke="#0E5F38" stroke-width="3.4" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="50" y2="28" stroke="#0E5F38" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="40" y2="62" stroke="#B23A3A" stroke-width="1.1" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="2.8" fill="#C9A227" stroke="#3D2008" stroke-width="1.1"/>
    <ellipse cx="38" cy="36" rx="7" ry="3" fill="#FFFFFF" opacity="0.4"/>
  </svg>`,

  // --- Pen: thin elongated ballpoint-style barrel with a clearly distinct
  //     cap section, a clip sticking off the cap, a tapered writing tip,
  //     resting on a sheet of paper with a small ink stroke beneath it.
  //     Drawn as a flat cylinder then rotated to look natural. ---
  peann: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="48" width="92" height="44" rx="2" fill="#FBF6E1" stroke="#3D2008" stroke-width="1.6"/>
    <line x1="14" y1="60" x2="14" y2="88" stroke="#B23A3A" stroke-width="0.7" opacity="0.7"/>
    <line x1="16" y1="66" x2="88" y2="66" stroke="#5C5C5C" stroke-width="0.7" opacity="0.55"/>
    <line x1="16" y1="74" x2="84" y2="74" stroke="#5C5C5C" stroke-width="0.7" opacity="0.55"/>
    <line x1="16" y1="82" x2="80" y2="82" stroke="#5C5C5C" stroke-width="0.7" opacity="0.55"/>
    <path d="M22,68 Q30,66 38,68 Q46,70 54,68 Q62,66 70,68" fill="none" stroke="#1A3A6B" stroke-width="1.5" stroke-linecap="round"/>
    <g transform="rotate(-32 50 50)">
      <ellipse cx="50" cy="58" rx="40" ry="3" fill="#0E1F3F" opacity="0.18"/>
      <path d="M8,50 L4,53 L4,57 L8,60 L14,57 L14,53 Z" fill="#C9A227" stroke="#8B6F0E" stroke-width="1.5" stroke-linejoin="round"/>
      <line x1="6" y1="55" x2="13" y2="55" stroke="#5C4500" stroke-width="0.7" opacity="0.7"/>
      <circle cx="5" cy="55" r="1.2" fill="#0E1F3F"/>
      <rect x="14" y="51" width="6" height="8" rx="1.5" fill="#3A5FA2" stroke="#0E1F3F" stroke-width="1.6"/>
      <rect x="20" y="50" width="3.5" height="10" fill="#C9A227" stroke="#8B6F0E" stroke-width="1.4"/>
      <rect x="23.5" y="50" width="38" height="10" rx="2.5" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="1.8"/>
      <rect x="26" y="52" width="34" height="2.2" rx="1" fill="#3A5FA2" opacity="0.85"/>
      <rect x="61.5" y="50" width="2.2" height="10" fill="#0A1530"/>
      <rect x="63.7" y="50" width="22" height="10" rx="2.5" fill="#0E1F3F" stroke="#000000" stroke-width="1.8"/>
      <rect x="66" y="52" width="18" height="2.2" rx="1" fill="#2A4F8F" opacity="0.85"/>
      <rect x="68" y="45" width="3.5" height="9" rx="1" fill="#C9A227" stroke="#8B6F0E" stroke-width="1.2"/>
      <ellipse cx="69.75" cy="46" rx="2" ry="1" fill="#C9A227" stroke="#8B6F0E" stroke-width="0.8"/>
      <ellipse cx="86" cy="55" rx="2" ry="3.5" fill="#0A1530" stroke="#000000" stroke-width="1.5"/>
    </g>
  </svg>`,

  // --- Wooden school chair, 3/4 view ---
  cathaoir: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="92" rx="32" ry="3" fill="#3D2008" opacity="0.22"/>
    <line x1="30" y1="54" x2="26" y2="90" stroke="#5C3309" stroke-width="4.2" stroke-linecap="round"/>
    <line x1="70" y1="54" x2="74" y2="90" stroke="#5C3309" stroke-width="4.2" stroke-linecap="round"/>
    <rect x="28" y="14" width="44" height="6" rx="2" fill="#A87C4F" stroke="#3D2008" stroke-width="2"/>
    <path d="M28,20 L72,20 L72,52 L28,52 Z" fill="#C68B4B" stroke="#3D2008" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="36" y1="24" x2="36" y2="48" stroke="#5C3309" stroke-width="1.6"/>
    <line x1="44" y1="24" x2="44" y2="48" stroke="#5C3309" stroke-width="1.6"/>
    <line x1="50" y1="24" x2="50" y2="48" stroke="#5C3309" stroke-width="1.6"/>
    <line x1="56" y1="24" x2="56" y2="48" stroke="#5C3309" stroke-width="1.6"/>
    <line x1="64" y1="24" x2="64" y2="48" stroke="#5C3309" stroke-width="1.6"/>
    <path d="M22,52 L78,52 L84,62 L16,62 Z" fill="#D4A571" stroke="#3D2008" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M16,62 L84,62 L82,67 L18,67 Z" fill="#A87C4F" stroke="#3D2008" stroke-width="1.8" stroke-linejoin="round"/>
    <line x1="22" y1="55" x2="78" y2="55" stroke="#E8C9A0" stroke-width="1" opacity="0.6"/>
    <rect x="18" y="67" width="5.5" height="23" rx="1.5" fill="#8A6238" stroke="#3D2008" stroke-width="1.8"/>
    <rect x="76.5" y="67" width="5.5" height="23" rx="1.5" fill="#8A6238" stroke="#3D2008" stroke-width="1.8"/>
  </svg>`,

  // --- Glowing light bulb with filament & rays ---
  solas: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#C9A227" stroke-width="2.6" stroke-linecap="round" opacity="0.85">
      <line x1="50" y1="2" x2="50" y2="9"/>
      <line x1="17" y1="20" x2="22" y2="25"/>
      <line x1="83" y1="20" x2="78" y2="25"/>
      <line x1="6" y1="42" x2="13" y2="42"/>
      <line x1="94" y1="42" x2="87" y2="42"/>
    </g>
    <path d="M50,10 Q73,10 75,34 Q75,48 64,57 L64,66 L36,66 L36,57 Q25,48 25,34 Q27,10 50,10 Z" fill="#F5D247" stroke="#5C4500" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M41,20 Q35,30 38,44" stroke="#FFF6B8" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M44,53 L44,46 Q44,42 50,42 Q56,42 56,46 L56,53" fill="none" stroke="#7A4A1A" stroke-width="1.6"/>
    <path d="M46,48 Q50,40 54,48" fill="none" stroke="#F39C12" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="50" cy="44" r="3" fill="#FFF6B8" opacity="0.55"/>
    <rect x="36" y="66" width="28" height="6" fill="#A88B14" stroke="#5C4500" stroke-width="1.8"/>
    <line x1="36" y1="68" x2="64" y2="68" stroke="#5C4500" stroke-width="0.8" opacity="0.6"/>
    <line x1="36" y1="70" x2="64" y2="70" stroke="#5C4500" stroke-width="0.8" opacity="0.6"/>
    <path d="M40,72 L60,72 L57,80 L43,80 Z" fill="#5C5C5C" stroke="#2A2218" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="50" cy="84" r="2.6" fill="#2A2218"/>
  </svg>`,

  // --- Pedal bin with lid and vertical ridges ---
  boscaBruscair: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="93" rx="28" ry="3" fill="#2A2218" opacity="0.22"/>
    <path d="M26,28 L74,28 L70,86 L30,86 Z" fill="#5C6B7C" stroke="#2A2218" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M30,30 L34,84" stroke="#9CADC2" stroke-width="3.2" stroke-linecap="round" opacity="0.55"/>
    <path d="M68,30 L72,84" stroke="#1F2A38" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    <line x1="42" y1="34" x2="40" y2="82" stroke="#2A2218" stroke-width="1.1" opacity="0.5"/>
    <line x1="50" y1="34" x2="50" y2="82" stroke="#2A2218" stroke-width="1.1" opacity="0.5"/>
    <line x1="58" y1="34" x2="60" y2="82" stroke="#2A2218" stroke-width="1.1" opacity="0.5"/>
    <path d="M30,82 L70,82 L72,86 L28,86 Z" fill="#404D5E" stroke="#2A2218" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="50" cy="28" rx="24" ry="4" fill="#7A8A9C" stroke="#2A2218" stroke-width="2"/>
    <path d="M24,22 L76,22 L72,28 L28,28 Z" fill="#404D5E" stroke="#1A2230" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="46" y="16" width="8" height="6" rx="1.5" fill="#404D5E" stroke="#1A2230" stroke-width="1.8"/>
    <rect x="44" y="11" width="12" height="3" rx="1.4" fill="#5C6B7C" stroke="#1A2230" stroke-width="1.4"/>
    <ellipse cx="34" cy="26" rx="3" ry="1.2" fill="#FFFFFF" opacity="0.3"/>
  </svg>`,

  // --- Wooden ruler with cm markings and brass end caps ---
  rialoir: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="68" rx="44" ry="3" fill="#5C4500" opacity="0.22"/>
    <rect x="6" y="36" width="88" height="26" rx="2" fill="#F5D247" stroke="#5C4500" stroke-width="2.2"/>
    <path d="M10,42 Q40,40 90,44" fill="none" stroke="#A88B14" stroke-width="0.6" opacity="0.55"/>
    <path d="M10,52 Q40,54 90,50" fill="none" stroke="#A88B14" stroke-width="0.6" opacity="0.55"/>
    <path d="M10,58 Q40,57 90,60" fill="none" stroke="#A88B14" stroke-width="0.6" opacity="0.45"/>
    <rect x="6" y="36" width="6" height="26" fill="#C9A227" stroke="#5C4500" stroke-width="1.8"/>
    <rect x="88" y="36" width="6" height="26" fill="#C9A227" stroke="#5C4500" stroke-width="1.8"/>
    <circle cx="9" cy="40" r="1" fill="#5C4500"/>
    <circle cx="91" cy="40" r="1" fill="#5C4500"/>
    <g stroke="#2A2218" stroke-linecap="round">
      <line x1="16" y1="36" x2="16" y2="46" stroke-width="1.6"/>
      <line x1="20" y1="36" x2="20" y2="41" stroke-width="0.9"/>
      <line x1="24" y1="36" x2="24" y2="43" stroke-width="1"/>
      <line x1="28" y1="36" x2="28" y2="41" stroke-width="0.9"/>
      <line x1="32" y1="36" x2="32" y2="46" stroke-width="1.6"/>
      <line x1="36" y1="36" x2="36" y2="41" stroke-width="0.9"/>
      <line x1="40" y1="36" x2="40" y2="43" stroke-width="1"/>
      <line x1="44" y1="36" x2="44" y2="41" stroke-width="0.9"/>
      <line x1="48" y1="36" x2="48" y2="46" stroke-width="1.6"/>
      <line x1="52" y1="36" x2="52" y2="41" stroke-width="0.9"/>
      <line x1="56" y1="36" x2="56" y2="43" stroke-width="1"/>
      <line x1="60" y1="36" x2="60" y2="41" stroke-width="0.9"/>
      <line x1="64" y1="36" x2="64" y2="46" stroke-width="1.6"/>
      <line x1="68" y1="36" x2="68" y2="41" stroke-width="0.9"/>
      <line x1="72" y1="36" x2="72" y2="43" stroke-width="1"/>
      <line x1="76" y1="36" x2="76" y2="41" stroke-width="0.9"/>
      <line x1="80" y1="36" x2="80" y2="46" stroke-width="1.6"/>
    </g>
    <text x="16" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="6" font-weight="700" fill="#2A2218">1</text>
    <text x="32" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="6" font-weight="700" fill="#2A2218">3</text>
    <text x="48" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="6" font-weight="700" fill="#2A2218">5</text>
    <text x="64" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="6" font-weight="700" fill="#2A2218">7</text>
    <text x="80" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="6" font-weight="700" fill="#2A2218">9</text>
  </svg>`,

  // --- Yellow #2 pencil with hex faceting, ferrule, eraser, sharpened tip ---
  peannLuaidhe: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="92" rx="38" ry="3" fill="#5C4500" opacity="0.22"/>
    <path d="M14,84 L22,76 L70,28 L80,38 L32,86 Z" fill="#F5D247" stroke="#5C4500" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M22,78 L66,34" stroke="#FFE680" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>
    <path d="M28,84 L74,38" stroke="#A88B14" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>
    <path d="M70,28 L80,38 L86,32 L76,22 Z" fill="#A8B0BC" stroke="#3D4452" stroke-width="2" stroke-linejoin="round"/>
    <line x1="72" y1="26" x2="82" y2="36" stroke="#3D4452" stroke-width="0.8" opacity="0.7"/>
    <line x1="75" y1="23" x2="85" y2="33" stroke="#3D4452" stroke-width="0.8" opacity="0.7"/>
    <line x1="78" y1="20" x2="88" y2="30" stroke="#3D4452" stroke-width="0.8" opacity="0.7"/>
    <path d="M76,22 L86,32 L90,28 L80,18 Z" fill="#E94B6F" stroke="#7A1A30" stroke-width="2" stroke-linejoin="round"/>
    <path d="M80,20 L88,28" stroke="#F8B4C4" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
    <path d="M14,84 L22,76 L18,72 L10,80 Z" fill="#E8B97A" stroke="#5C4500" stroke-width="1.8" stroke-linejoin="round"/>
    <line x1="14" y1="80" x2="18" y2="76" stroke="#A88B14" stroke-width="0.8"/>
    <path d="M14,84 L19,79 L13,84 L10,80 Z" fill="#2A2218" stroke="#1A1410" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`,

  // --- School desk in 3/4 view with drawer, knob and a notebook on top ---
  deasc: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="92" rx="42" ry="3" fill="#3D2008" opacity="0.22"/>
    <rect x="20" y="44" width="4" height="46" fill="#5C3309" stroke="#3D2008" stroke-width="1.5"/>
    <rect x="76" y="44" width="4" height="46" fill="#5C3309" stroke="#3D2008" stroke-width="1.5"/>
    <path d="M14,38 L86,38 L80,50 L20,50 Z" fill="#D4A571" stroke="#3D2008" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="20" y1="42" x2="80" y2="42" stroke="#E8C9A0" stroke-width="1" opacity="0.6"/>
    <path d="M14,38 L86,38 L88,42 L12,42 Z" fill="#8A6238" stroke="#3D2008" stroke-width="1.8" stroke-linejoin="round"/>
    <rect x="22" y="50" width="56" height="22" fill="#A87C4F" stroke="#3D2008" stroke-width="2"/>
    <rect x="26" y="54" width="48" height="14" fill="none" stroke="#5C3309" stroke-width="1" opacity="0.6"/>
    <circle cx="50" cy="61" r="3" fill="#C9A227" stroke="#3D2008" stroke-width="1.4"/>
    <circle cx="49" cy="60" r="1" fill="#FFFFFF" opacity="0.55"/>
    <rect x="22" y="72" width="6" height="18" rx="1" fill="#8A6238" stroke="#3D2008" stroke-width="1.8"/>
    <rect x="72" y="72" width="6" height="18" rx="1" fill="#8A6238" stroke="#3D2008" stroke-width="1.8"/>
    <rect x="30" y="32" width="22" height="8" rx="1" fill="#FBF6E1" stroke="#2A2218" stroke-width="1.1"/>
    <line x1="33" y1="36" x2="48" y2="36" stroke="#1A3A6B" stroke-width="0.9"/>
    <line x1="33" y1="38" x2="46" y2="38" stroke="#1A3A6B" stroke-width="0.7"/>
  </svg>`,

  // --- Eraser: the action of erasing. A pencil-written word on paper
  //     with half of it visibly rubbed out; the eraser caught mid-stroke
  //     (tilted as if moving), with pink eraser crumbs trailing behind. ---
  scriosan: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="18" width="92" height="74" rx="2" fill="#FBF6E1" stroke="#3D2008" stroke-width="1.6"/>
    <line x1="14" y1="28" x2="14" y2="88" stroke="#B23A3A" stroke-width="0.7" opacity="0.6"/>
    <line x1="18" y1="40" x2="86" y2="40" stroke="#5C5C5C" stroke-width="0.6" opacity="0.4"/>
    <line x1="18" y1="62" x2="86" y2="62" stroke="#5C5C5C" stroke-width="0.6" opacity="0.4"/>
    <line x1="18" y1="80" x2="86" y2="80" stroke="#5C5C5C" stroke-width="0.6" opacity="0.4"/>
    <text x="22" y="60" font-family="Georgia,serif" font-size="18" font-weight="700" fill="#5C5C5C">a</text>
    <text x="34" y="60" font-family="Georgia,serif" font-size="18" font-weight="700" fill="#5C5C5C">b</text>
    <text x="46" y="60" font-family="Georgia,serif" font-size="18" font-weight="700" fill="#5C5C5C" opacity="0.42">c</text>
    <text x="58" y="60" font-family="Georgia,serif" font-size="18" font-weight="700" fill="#5C5C5C" opacity="0.15">d</text>
    <text x="70" y="60" font-family="Georgia,serif" font-size="18" font-weight="700" fill="#5C5C5C" opacity="0.04">e</text>
    <ellipse cx="68" cy="56" rx="22" ry="2" fill="#FBF6E1" opacity="0.7"/>
    <ellipse cx="76" cy="62" rx="20" ry="3" fill="#5C0A20" opacity="0.18"/>
    <g transform="rotate(-14 76 56)">
      <path d="M50,46 L96,46 L96,60 L50,60 Z" fill="#E94B6F" stroke="#7A1A30" stroke-width="2" stroke-linejoin="round"/>
      <path d="M50,46 L50,60" stroke="#7A1A30" stroke-width="1.8"/>
      <path d="M50,52 L96,52" stroke="#7A1A30" stroke-width="1"/>
      <path d="M50,54 L96,54" stroke="#7A1A30" stroke-width="1"/>
      <rect x="50" y="51" width="46" height="4.5" fill="#FBF6E1" stroke="#3D2008" stroke-width="1"/>
      <path d="M58,53 Q64,52 70,53 Q76,54 82,53" fill="none" stroke="#1A3A6B" stroke-width="0.7" opacity="0.6"/>
      <ellipse cx="62" cy="48.5" rx="6" ry="1.2" fill="#FFFFFF" opacity="0.55"/>
      <path d="M44,53 Q40,50 36,53 Q40,56 44,53 Z" fill="#FFD1DC" stroke="#7A1A30" stroke-width="1.5" stroke-linejoin="round"/>
    </g>
    <ellipse cx="40" cy="74" rx="2.2" ry="1.2" fill="#E94B6F" stroke="#7A1A30" stroke-width="0.6" transform="rotate(-10 40 74)"/>
    <ellipse cx="34" cy="78" rx="1.8" ry="0.9" fill="#E94B6F" stroke="#7A1A30" stroke-width="0.6" transform="rotate(20 34 78)"/>
    <ellipse cx="46" cy="80" rx="1.6" ry="0.8" fill="#E94B6F" stroke="#7A1A30" stroke-width="0.6" transform="rotate(-25 46 80)"/>
    <ellipse cx="28" cy="80" rx="2" ry="1" fill="#E94B6F" stroke="#7A1A30" stroke-width="0.6" transform="rotate(-10 28 80)"/>
    <ellipse cx="22" cy="84" rx="1.5" ry="0.8" fill="#E94B6F" stroke="#7A1A30" stroke-width="0.6"/>
    <ellipse cx="38" cy="84" rx="1.4" ry="0.7" fill="#E94B6F" stroke="#7A1A30" stroke-width="0.6" transform="rotate(35 38 84)"/>
    <ellipse cx="50" cy="82" rx="1.6" ry="0.8" fill="#E94B6F" stroke="#7A1A30" stroke-width="0.6" transform="rotate(-15 50 82)"/>
    <ellipse cx="18" cy="78" rx="1.3" ry="0.7" fill="#E94B6F" stroke="#7A1A30" stroke-width="0.6"/>
    <path d="M52,40 Q56,46 52,52" fill="none" stroke="#7A1A30" stroke-width="0.9" stroke-linecap="round" opacity="0.5"/>
    <path d="M48,38 Q52,46 48,54" fill="none" stroke="#7A1A30" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/>
  </svg>`,

  // --- Sash window with frame, panes, sill and a wisp of sky ---
  fuinneog: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="12" width="68" height="74" fill="#FBF6E1" stroke="#3D2008" stroke-width="2.4"/>
    <rect x="20" y="16" width="60" height="66" fill="#A8C4DC" stroke="#3D2008" stroke-width="1.5"/>
    <rect x="20" y="16" width="60" height="28" fill="#C8DCEC"/>
    <ellipse cx="62" cy="28" rx="7" ry="3" fill="#FBF6E1" opacity="0.85"/>
    <ellipse cx="70" cy="30" rx="4" ry="2" fill="#FBF6E1" opacity="0.7"/>
    <ellipse cx="36" cy="26" rx="5" ry="2.4" fill="#FBF6E1" opacity="0.65"/>
    <line x1="50" y1="16" x2="50" y2="82" stroke="#3D2008" stroke-width="3"/>
    <line x1="20" y1="49" x2="80" y2="49" stroke="#3D2008" stroke-width="3"/>
    <path d="M24,20 L30,20 L24,44 Z" fill="#FFFFFF" opacity="0.45"/>
    <path d="M54,52 L60,52 L54,78 Z" fill="#FFFFFF" opacity="0.4"/>
    <rect x="10" y="84" width="80" height="6" fill="#A87C4F" stroke="#3D2008" stroke-width="2"/>
    <rect x="12" y="88" width="76" height="4" fill="#5C3309" stroke="#3D2008" stroke-width="1.5"/>
    <rect x="14" y="10" width="72" height="4" fill="#5C3309" stroke="#3D2008" stroke-width="1.5"/>
  </svg>`,

  // --- 4-panel wooden door with brass handle, key plate, hinges ---
  doras: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="94" rx="30" ry="2" fill="#3D2008" opacity="0.22"/>
    <rect x="16" y="6" width="68" height="86" fill="#5C3309" stroke="#3D2008" stroke-width="2"/>
    <rect x="22" y="10" width="56" height="82" fill="#8A6238" stroke="#3D2008" stroke-width="2"/>
    <line x1="30" y1="14" x2="30" y2="88" stroke="#5C3309" stroke-width="0.6" opacity="0.5"/>
    <line x1="50" y1="14" x2="50" y2="88" stroke="#5C3309" stroke-width="0.5" opacity="0.4"/>
    <line x1="70" y1="14" x2="70" y2="88" stroke="#5C3309" stroke-width="0.6" opacity="0.5"/>
    <rect x="28" y="16" width="20" height="28" fill="#A87C4F" stroke="#3D2008" stroke-width="1.8"/>
    <rect x="52" y="16" width="20" height="28" fill="#A87C4F" stroke="#3D2008" stroke-width="1.8"/>
    <rect x="30" y="18" width="16" height="24" fill="none" stroke="#C68B4B" stroke-width="0.8" opacity="0.7"/>
    <rect x="54" y="18" width="16" height="24" fill="none" stroke="#C68B4B" stroke-width="0.8" opacity="0.7"/>
    <rect x="28" y="50" width="20" height="36" fill="#A87C4F" stroke="#3D2008" stroke-width="1.8"/>
    <rect x="52" y="50" width="20" height="36" fill="#A87C4F" stroke="#3D2008" stroke-width="1.8"/>
    <rect x="30" y="52" width="16" height="32" fill="none" stroke="#C68B4B" stroke-width="0.8" opacity="0.7"/>
    <rect x="54" y="52" width="16" height="32" fill="none" stroke="#C68B4B" stroke-width="0.8" opacity="0.7"/>
    <rect x="67" y="52" width="6" height="14" rx="1.5" fill="#C9A227" stroke="#3D2008" stroke-width="1.2"/>
    <circle cx="70" cy="58" r="3" fill="#C9A227" stroke="#3D2008" stroke-width="1.5"/>
    <circle cx="70" cy="63" r="1" fill="#3D2008"/>
    <rect x="22" y="20" width="4" height="6" fill="#C9A227" stroke="#3D2008" stroke-width="1"/>
    <rect x="22" y="74" width="4" height="6" fill="#C9A227" stroke="#3D2008" stroke-width="1"/>
    <rect x="20" y="90" width="60" height="3" fill="#3D2008" opacity="0.5"/>
  </svg>`,

  // --- Backpack with flap, buckle, front pocket, side strap ---
  malaScoile: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="94" rx="34" ry="3" fill="#5C0A20" opacity="0.22"/>
    <path d="M44,16 Q50,10 56,16" fill="none" stroke="#5C0A20" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M22,28 L78,28 L82,86 Q82,90 78,90 L22,90 Q18,90 18,86 Z" fill="#A8344F" stroke="#5C0A20" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M24,32 L26,86" stroke="#D45A78" stroke-width="2.6" stroke-linecap="round" opacity="0.55"/>
    <path d="M76,32 L78,86" stroke="#5C0A20" stroke-width="2.6" stroke-linecap="round" opacity="0.5"/>
    <path d="M22,28 L78,28 L80,52 Q80,56 76,56 L24,56 Q20,56 20,52 Z" fill="#7A1A30" stroke="#5C0A20" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M24,30 L76,30" stroke="#A8344F" stroke-width="1" opacity="0.6"/>
    <rect x="46" y="40" width="8" height="14" fill="#5C0A20" stroke="#3D050D" stroke-width="1.2"/>
    <rect x="42" y="48" width="16" height="6" rx="1.5" fill="#C9A227" stroke="#5C0A20" stroke-width="1.5"/>
    <line x1="46" y1="51" x2="54" y2="51" stroke="#5C0A20" stroke-width="1.2"/>
    <circle cx="50" cy="51" r="0.9" fill="#5C0A20"/>
    <path d="M30,60 L70,60 L72,84 L28,84 Z" fill="#7A1A30" stroke="#5C0A20" stroke-width="2" stroke-linejoin="round"/>
    <path d="M30,60 L70,60 L72,72 L28,72 Z" fill="#A8344F" stroke="#5C0A20" stroke-width="1.8" stroke-linejoin="round"/>
    <rect x="46" y="66" width="8" height="3" rx="0.8" fill="#C9A227" stroke="#5C0A20" stroke-width="1"/>
    <path d="M82,36 Q92,52 80,76" fill="none" stroke="#5C0A20" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="32" cy="40" rx="3" ry="2" fill="#FFFFFF" opacity="0.3"/>
  </svg>`,

  // --- Modern silver laptop with screen showing a desktop ---
  riomhaire: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="86" rx="42" ry="3" fill="#0E1F3F" opacity="0.22"/>
    <path d="M14,72 L86,72 L92,82 L8,82 Z" fill="#C8CCD4" stroke="#3D4452" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M14,72 L86,72" stroke="#9AA0AC" stroke-width="1"/>
    <rect x="42" y="74" width="16" height="3.4" rx="0.6" fill="#A8B0BC" stroke="#3D4452" stroke-width="0.8"/>
    <rect x="14" y="18" width="72" height="54" rx="2" fill="#3D4452" stroke="#1A2230" stroke-width="2.4"/>
    <rect x="17" y="21" width="66" height="48" rx="1" fill="#1A2230"/>
    <rect x="19" y="23" width="62" height="44" rx="0.5" fill="#5BA6D8"/>
    <rect x="19" y="23" width="62" height="5" fill="#1A3A6B"/>
    <circle cx="22" cy="25.5" r="0.7" fill="#FBF6E1"/>
    <circle cx="25" cy="25.5" r="0.7" fill="#FBF6E1"/>
    <rect x="26" y="32" width="32" height="22" rx="1" fill="#FBF6E1" stroke="#3D4452" stroke-width="0.8"/>
    <circle cx="28.5" cy="34.5" r="0.8" fill="#E94B6F"/>
    <circle cx="30.5" cy="34.5" r="0.8" fill="#F5D247"/>
    <circle cx="32.5" cy="34.5" r="0.8" fill="#0E5F38"/>
    <line x1="28" y1="40" x2="54" y2="40" stroke="#5C5C5C" stroke-width="0.7"/>
    <line x1="28" y1="44" x2="50" y2="44" stroke="#5C5C5C" stroke-width="0.7"/>
    <line x1="28" y1="48" x2="52" y2="48" stroke="#5C5C5C" stroke-width="0.7"/>
    <line x1="28" y1="52" x2="46" y2="52" stroke="#5C5C5C" stroke-width="0.7"/>
    <rect x="62" y="32" width="14" height="10" rx="1" fill="#C9A227" stroke="#3D4452" stroke-width="0.8"/>
    <rect x="62" y="46" width="14" height="10" rx="1" fill="#0E5F38" stroke="#3D4452" stroke-width="0.8"/>
    <circle cx="50" cy="20" r="0.7" fill="#1A2230" stroke="#3D4452" stroke-width="0.4"/>
    <rect x="44" y="77" width="12" height="1.6" rx="0.5" fill="#9AA0AC" opacity="0.6"/>
  </svg>`,

  // --- Whiteboard on stand, with diagrams, marker tray, markers, eraser ---
  clarBan: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="94" rx="32" ry="3" fill="#2A2218" opacity="0.22"/>
    <rect x="8" y="10" width="84" height="56" rx="2" fill="#A8B0BC" stroke="#3D4452" stroke-width="2.4"/>
    <rect x="12" y="14" width="76" height="48" fill="#FBF6E1" stroke="#5C5C5C" stroke-width="1"/>
    <text x="18" y="24" font-family="Georgia,serif" font-style="italic" font-size="7" font-weight="700" fill="#1A3A6B">Gaeilge</text>
    <circle cx="32" cy="40" r="5" fill="none" stroke="#1A3A6B" stroke-width="1.6"/>
    <circle cx="50" cy="40" r="5" fill="none" stroke="#B23A3A" stroke-width="1.6"/>
    <circle cx="68" cy="40" r="5" fill="none" stroke="#0E5F38" stroke-width="1.6"/>
    <line x1="37" y1="40" x2="45" y2="40" stroke="#5C5C5C" stroke-width="1.1"/>
    <line x1="55" y1="40" x2="63" y2="40" stroke="#5C5C5C" stroke-width="1.1"/>
    <path d="M18,52 Q22,50 26,52 Q30,54 34,52" fill="none" stroke="#1A3A6B" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M40,54 Q44,52 48,54 Q52,56 56,54 Q60,52 64,54" fill="none" stroke="#1A3A6B" stroke-width="1.2" stroke-linecap="round"/>
    <rect x="6" y="64" width="88" height="6" rx="1.5" fill="#7A8A9C" stroke="#3D4452" stroke-width="2"/>
    <line x1="6" y1="66" x2="94" y2="66" stroke="#FBF6E1" stroke-width="0.6" opacity="0.5"/>
    <rect x="20" y="60" width="3.4" height="6" rx="0.8" fill="#B23A3A" stroke="#5C0000" stroke-width="0.8"/>
    <rect x="36" y="60" width="3.4" height="6" rx="0.8" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="0.8"/>
    <rect x="52" y="60" width="3.4" height="6" rx="0.8" fill="#0E5F38" stroke="#053D20" stroke-width="0.8"/>
    <rect x="68" y="60" width="10" height="6" rx="1" fill="#3D4452" stroke="#1A2230" stroke-width="0.8"/>
    <line x1="22" y1="70" x2="16" y2="92" stroke="#3D4452" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="78" y1="70" x2="84" y2="92" stroke="#3D4452" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="30" y1="82" x2="70" y2="82" stroke="#3D4452" stroke-width="2"/>
  </svg>`,

  // --- Hardcover open book with text lines and decorative initial ---
  leabhar: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="86" rx="44" ry="3" fill="#3D2008" opacity="0.22"/>
    <path d="M8,28 Q30,22 50,28 Q70,22 92,28 L92,82 Q70,76 50,82 Q30,76 8,82 Z" fill="#5C0A20" stroke="#3D050D" stroke-width="2" stroke-linejoin="round"/>
    <path d="M10,30 Q30,24 50,30 Q70,24 90,30 L90,80 Q70,74 50,80 Q30,74 10,80 Z" fill="#FBF6E1" stroke="#3D2008" stroke-width="2" stroke-linejoin="round"/>
    <text x="22" y="44" font-family="Georgia,serif" font-style="italic" font-size="12" font-weight="700" fill="#5C0A20" opacity="0.85">L</text>
    <line x1="30" y1="40" x2="44" y2="40" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="16" y1="48" x2="44" y2="48" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="16" y1="54" x2="44" y2="54" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="16" y1="60" x2="42" y2="60" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="16" y1="66" x2="44" y2="66" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="16" y1="72" x2="40" y2="72" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="56" y1="40" x2="84" y2="40" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="56" y1="46" x2="84" y2="46" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="56" y1="52" x2="82" y2="52" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="56" y1="58" x2="84" y2="58" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="56" y1="64" x2="80" y2="64" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <line x1="56" y1="70" x2="84" y2="70" stroke="#3D2008" stroke-width="0.7" opacity="0.7"/>
    <path d="M50,30 Q49,55 50,80" fill="none" stroke="#3D2008" stroke-width="2.2"/>
    <path d="M8,28 L92,28 L92,32 L8,32 Z" fill="#3D050D" opacity="0.5"/>
  </svg>`,

  // --- Teacher: adult professional with glasses, bun, burgundy outfit,
  //     clipboard in hand, pointing at a small whiteboard behind her ---
  muinteoir: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="40" cy="94" rx="20" ry="2.4" fill="#2A2218" opacity="0.22"/>
    <rect x="60" y="14" width="36" height="44" rx="1.5" fill="#A8B0BC" stroke="#3D4452" stroke-width="1.8"/>
    <rect x="62" y="16" width="32" height="40" fill="#FBF6E1" stroke="#5C5C5C" stroke-width="0.6"/>
    <text x="78" y="25" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="6.5" font-weight="700" fill="#1A3A6B">Gaeilge</text>
    <line x1="66" y1="32" x2="90" y2="32" stroke="#1A3A6B" stroke-width="1"/>
    <line x1="66" y1="38" x2="88" y2="38" stroke="#1A3A6B" stroke-width="0.9"/>
    <line x1="66" y1="44" x2="86" y2="44" stroke="#1A3A6B" stroke-width="0.9"/>
    <line x1="66" y1="50" x2="88" y2="50" stroke="#1A3A6B" stroke-width="0.9"/>
    <rect x="61" y="56" width="34" height="3" fill="#7A8A9C" stroke="#3D4452" stroke-width="0.8"/>
    <path d="M28,64 L52,64 L56,90 L24,90 Z" fill="#5C5C5C" stroke="#2A2218" stroke-width="2" stroke-linejoin="round"/>
    <line x1="34" y1="68" x2="32" y2="88" stroke="#2A2218" stroke-width="0.8" opacity="0.5"/>
    <line x1="40" y1="68" x2="40" y2="88" stroke="#2A2218" stroke-width="0.8" opacity="0.5"/>
    <line x1="46" y1="68" x2="48" y2="88" stroke="#2A2218" stroke-width="0.8" opacity="0.5"/>
    <path d="M30,44 L50,44 L54,66 L26,66 Z" fill="#FBF6E1" stroke="#3D2008" stroke-width="2" stroke-linejoin="round"/>
    <path d="M26,44 L30,44 L28,66 L24,66 Z" fill="#7A1A30" stroke="#5C0A20" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M50,44 L54,44 L56,66 L52,66 Z" fill="#7A1A30" stroke="#5C0A20" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M36,52 Q40,54 44,52" fill="none" stroke="#C9A227" stroke-width="0.9"/>
    <circle cx="40" cy="54" r="1.7" fill="#C9A227" stroke="#5C4500" stroke-width="0.7"/>
    <circle cx="38" cy="56" r="0.7" fill="#FBF6E1"/>
    <circle cx="42" cy="56" r="0.7" fill="#FBF6E1"/>
    <rect x="36" y="40" width="8" height="6" fill="#F5D8A8" stroke="#3D2008" stroke-width="1.2"/>
    <circle cx="40" cy="30" r="11" fill="#F5D8A8" stroke="#3D2008" stroke-width="2"/>
    <path d="M28,30 Q28,16 40,14 Q52,16 52,30 Q50,20 40,20 Q30,20 28,30 Z" fill="#7A6B4A" stroke="#3D2008" stroke-width="1.7" stroke-linejoin="round"/>
    <circle cx="52" cy="20" r="5" fill="#7A6B4A" stroke="#3D2008" stroke-width="1.6"/>
    <path d="M30,18 Q34,20 38,18" fill="none" stroke="#5C4A28" stroke-width="0.8"/>
    <path d="M42,18 Q46,20 50,18" fill="none" stroke="#5C4A28" stroke-width="0.8"/>
    <circle cx="36" cy="30" r="3.5" fill="#FBF6E1" fill-opacity="0.4" stroke="#2A2218" stroke-width="1.4"/>
    <circle cx="44" cy="30" r="3.5" fill="#FBF6E1" fill-opacity="0.4" stroke="#2A2218" stroke-width="1.4"/>
    <line x1="39.5" y1="30" x2="40.5" y2="30" stroke="#2A2218" stroke-width="1.2"/>
    <line x1="32.5" y1="29" x2="29.5" y2="28" stroke="#2A2218" stroke-width="1"/>
    <line x1="47.5" y1="29" x2="50.5" y2="28" stroke="#2A2218" stroke-width="1"/>
    <circle cx="36" cy="30" r="1.1" fill="#2A2218"/>
    <circle cx="44" cy="30" r="1.1" fill="#2A2218"/>
    <path d="M36,35 Q40,37 44,35" fill="none" stroke="#3D2008" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="33" cy="34" r="1.3" fill="#E8A8A8" opacity="0.55"/>
    <circle cx="47" cy="34" r="1.3" fill="#E8A8A8" opacity="0.55"/>
    <path d="M24,46 Q18,56 22,66 L26,66 Q24,56 28,46 Z" fill="#7A1A30" stroke="#5C0A20" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="22" cy="64" r="2.6" fill="#F5D8A8" stroke="#3D2008" stroke-width="1.2"/>
    <rect x="14" y="58" width="11" height="14" rx="0.6" fill="#FBF6E1" stroke="#3D2008" stroke-width="1.4"/>
    <rect x="16" y="56" width="7" height="3" rx="0.5" fill="#C9A227" stroke="#3D2008" stroke-width="1"/>
    <line x1="16" y1="62" x2="22" y2="62" stroke="#3D2008" stroke-width="0.6"/>
    <line x1="16" y1="65" x2="22" y2="65" stroke="#3D2008" stroke-width="0.6"/>
    <line x1="16" y1="68" x2="20" y2="68" stroke="#3D2008" stroke-width="0.6"/>
    <path d="M52,46 Q60,40 66,38 L68,42 Q60,46 56,52 Z" fill="#7A1A30" stroke="#5C0A20" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="68" cy="40" r="2.4" fill="#F5D8A8" stroke="#3D2008" stroke-width="1.2"/>
    <line x1="68" y1="40" x2="78" y2="30" stroke="#1A3A6B" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="77" y1="31" x2="79" y2="29" stroke="#0E1F3F" stroke-width="0.8"/>
    <ellipse cx="32" cy="93" rx="5.5" ry="2" fill="#2A2218" stroke="#1A1410" stroke-width="1"/>
    <ellipse cx="48" cy="93" rx="5.5" ry="2" fill="#2A2218" stroke="#1A1410" stroke-width="1"/>
    <path d="M29,93 L30,90" stroke="#2A2218" stroke-width="1"/>
    <path d="M45,93 L46,90" stroke="#2A2218" stroke-width="1"/>
  </svg>`,

  // --- Floor: looking straight down at long horizontal wood floor planks
  //     (no brick offset — real flooring runs continuously across).
  //     Actual shoe-shaped footprints (ball of foot + separate heel)
  //     with motion lines showing somebody has walked across it. ---
  urlar: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="100" height="100" fill="#D4A571"/>
    <line x1="0" y1="20" x2="100" y2="20" stroke="#5C3309" stroke-width="1.2"/>
    <line x1="0" y1="40" x2="100" y2="40" stroke="#5C3309" stroke-width="1.2"/>
    <line x1="0" y1="60" x2="100" y2="60" stroke="#5C3309" stroke-width="1.2"/>
    <line x1="0" y1="80" x2="100" y2="80" stroke="#5C3309" stroke-width="1.2"/>
    <path d="M8,10 Q14,12 22,10" fill="none" stroke="#A87C4F" stroke-width="0.7" opacity="0.55"/>
    <path d="M44,30 Q50,32 58,30" fill="none" stroke="#A87C4F" stroke-width="0.7" opacity="0.55"/>
    <path d="M76,50 Q82,52 90,50" fill="none" stroke="#A87C4F" stroke-width="0.7" opacity="0.55"/>
    <path d="M16,70 Q22,72 30,70" fill="none" stroke="#A87C4F" stroke-width="0.7" opacity="0.55"/>
    <path d="M58,90 Q64,92 72,90" fill="none" stroke="#A87C4F" stroke-width="0.7" opacity="0.55"/>
    <path d="M30,16 Q35,17 40,16" fill="none" stroke="#A87C4F" stroke-width="0.6" opacity="0.45"/>
    <path d="M62,36 Q67,37 72,36" fill="none" stroke="#A87C4F" stroke-width="0.6" opacity="0.45"/>
    <path d="M40,56 Q45,57 50,56" fill="none" stroke="#A87C4F" stroke-width="0.6" opacity="0.45"/>
    <path d="M70,76 Q75,77 80,76" fill="none" stroke="#A87C4F" stroke-width="0.6" opacity="0.45"/>
    <g transform="translate(22,30) rotate(-18)">
      <path d="M-3,-10 Q-5,-6 -5,-2 Q-5,2 -3,5 L3,5 Q5,2 5,-2 Q5,-6 3,-10 Q0,-12 -3,-10 Z" fill="#3D2008" stroke="#1A1410" stroke-width="1" opacity="0.6"/>
      <ellipse cx="0" cy="9" rx="3.2" ry="2.4" fill="#3D2008" stroke="#1A1410" stroke-width="1" opacity="0.6"/>
    </g>
    <g transform="translate(40,46) rotate(8)">
      <path d="M-3,-10 Q-5,-6 -5,-2 Q-5,2 -3,5 L3,5 Q5,2 5,-2 Q5,-6 3,-10 Q0,-12 -3,-10 Z" fill="#3D2008" stroke="#1A1410" stroke-width="1" opacity="0.7"/>
      <ellipse cx="0" cy="9" rx="3.2" ry="2.4" fill="#3D2008" stroke="#1A1410" stroke-width="1" opacity="0.7"/>
    </g>
    <g transform="translate(58,64) rotate(-14)">
      <path d="M-3.2,-11 Q-5.4,-6 -5.4,-2 Q-5.4,2.5 -3.2,5.5 L3.2,5.5 Q5.4,2.5 5.4,-2 Q5.4,-6 3.2,-11 Q0,-13 -3.2,-11 Z" fill="#3D2008" stroke="#1A1410" stroke-width="1" opacity="0.85"/>
      <ellipse cx="0" cy="10" rx="3.4" ry="2.6" fill="#3D2008" stroke="#1A1410" stroke-width="1" opacity="0.85"/>
    </g>
    <g transform="translate(76,82) rotate(12)">
      <path d="M-3.4,-11 Q-5.6,-6 -5.6,-2 Q-5.6,2.5 -3.4,5.5 L3.4,5.5 Q5.6,2.5 5.6,-2 Q5.6,-6 3.4,-11 Q0,-13 -3.4,-11 Z" fill="#3D2008" stroke="#1A1410" stroke-width="1.1"/>
      <ellipse cx="0" cy="10" rx="3.6" ry="2.6" fill="#3D2008" stroke="#1A1410" stroke-width="1.1"/>
    </g>
    <path d="M14,16 Q16,18 18,16" fill="none" stroke="#5C3309" stroke-width="0.7" opacity="0.5" stroke-dasharray="1.5 2"/>
    <path d="M30,38 Q32,40 34,38" fill="none" stroke="#5C3309" stroke-width="0.7" opacity="0.5" stroke-dasharray="1.5 2"/>
    <path d="M48,56 Q50,58 52,56" fill="none" stroke="#5C3309" stroke-width="0.7" opacity="0.5" stroke-dasharray="1.5 2"/>
    <path d="M66,74 Q68,76 70,74" fill="none" stroke="#5C3309" stroke-width="0.7" opacity="0.5" stroke-dasharray="1.5 2"/>
  </svg>`,

  // --- Schoolgirl: navy jumper, pleated skirt, tie, PIGTAILS with red ribbons ---
  cailin: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="94" rx="20" ry="2.5" fill="#2A2218" opacity="0.22"/>
    <rect x="42" y="74" width="6" height="18" rx="1.5" fill="#3D4452" stroke="#1A2230" stroke-width="1.5"/>
    <rect x="52" y="74" width="6" height="18" rx="1.5" fill="#3D4452" stroke="#1A2230" stroke-width="1.5"/>
    <ellipse cx="45" cy="93" rx="5" ry="2" fill="#2A2218" stroke="#1A1410" stroke-width="1"/>
    <ellipse cx="55" cy="93" rx="5" ry="2" fill="#2A2218" stroke="#1A1410" stroke-width="1"/>
    <path d="M34,58 L66,58 L70,76 L30,76 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="2" stroke-linejoin="round"/>
    <line x1="40" y1="60" x2="38" y2="74" stroke="#0E1F3F" stroke-width="1" opacity="0.7"/>
    <line x1="46" y1="60" x2="46" y2="74" stroke="#0E1F3F" stroke-width="1" opacity="0.7"/>
    <line x1="50" y1="60" x2="50" y2="74" stroke="#0E1F3F" stroke-width="1" opacity="0.7"/>
    <line x1="54" y1="60" x2="54" y2="74" stroke="#0E1F3F" stroke-width="1" opacity="0.7"/>
    <line x1="60" y1="60" x2="62" y2="74" stroke="#0E1F3F" stroke-width="1" opacity="0.7"/>
    <path d="M36,42 L64,42 L66,60 L34,60 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="2" stroke-linejoin="round"/>
    <rect x="34" y="58" width="32" height="3" fill="#0E1F3F" stroke="none"/>
    <path d="M44,40 L56,40 L54,46 L46,46 Z" fill="#FBF6E1" stroke="#3D2008" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M48,44 L52,44 L51.5,53 L48.5,53 Z" fill="#B23A3A" stroke="#5C0000" stroke-width="1"/>
    <line x1="48.2" y1="46" x2="51.8" y2="46" stroke="#5C0000" stroke-width="0.7"/>
    <line x1="48.4" y1="48" x2="51.6" y2="48" stroke="#5C0000" stroke-width="0.7"/>
    <rect x="46" y="36" width="8" height="6" fill="#F5D8A8" stroke="#3D2008" stroke-width="1.2"/>
    <circle cx="50" cy="26" r="11" fill="#F5D8A8" stroke="#3D2008" stroke-width="2"/>
    <path d="M38,26 Q38,12 50,10 Q62,12 62,26 Q60,16 50,16 Q40,18 38,26 Z" fill="#5C3309" stroke="#3D2008" stroke-width="1.8" stroke-linejoin="round"/>
    <line x1="44" y1="20" x2="56" y2="20" stroke="#3D2008" stroke-width="0.8" opacity="0.5"/>
    <path d="M30,28 Q26,38 30,46 L36,44 Q34,36 38,30 Z" fill="#5C3309" stroke="#3D2008" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M70,28 Q74,38 70,46 L64,44 Q66,36 62,30 Z" fill="#5C3309" stroke="#3D2008" stroke-width="1.6" stroke-linejoin="round"/>
    <line x1="32" y1="32" x2="34" y2="42" stroke="#3D2008" stroke-width="0.6" opacity="0.5"/>
    <line x1="68" y1="32" x2="66" y2="42" stroke="#3D2008" stroke-width="0.6" opacity="0.5"/>
    <path d="M28,46 Q24,50 26,54 Q30,52 32,48 Z" fill="#B23A3A" stroke="#5C0000" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M72,46 Q76,50 74,54 Q70,52 68,48 Z" fill="#B23A3A" stroke="#5C0000" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M28,46 Q31,46 32,48" fill="none" stroke="#5C0000" stroke-width="0.8"/>
    <path d="M72,46 Q69,46 68,48" fill="none" stroke="#5C0000" stroke-width="0.8"/>
    <circle cx="46" cy="26" r="1.2" fill="#2A2218"/>
    <circle cx="54" cy="26" r="1.2" fill="#2A2218"/>
    <path d="M46,31 Q50,33 54,31" fill="none" stroke="#3D2008" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="43" cy="30" r="1.4" fill="#E8A8A8" opacity="0.55"/>
    <circle cx="57" cy="30" r="1.4" fill="#E8A8A8" opacity="0.55"/>
    <path d="M34,44 Q30,52 32,60 L36,60 Q34,52 36,44 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M66,44 Q70,52 68,60 L64,60 Q66,52 64,44 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="34" cy="60" r="2.5" fill="#F5D8A8" stroke="#3D2008" stroke-width="1.2"/>
    <circle cx="66" cy="60" r="2.5" fill="#F5D8A8" stroke="#3D2008" stroke-width="1.2"/>
  </svg>`,

  // --- Schoolboy: clearly a child (bigger head than the teacher, softer
  //     features), full-length grey school trousers + black shoes + navy
  //     jumper + red tie. Holding a small school book in one hand as the
  //     "young pupil" cue. Simple dot eyes like the cailín. ---
  buachaill: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="94" rx="20" ry="2.4" fill="#2A2218" opacity="0.22"/>
    <rect x="41" y="66" width="8" height="26" rx="1.5" fill="#5C5C5C" stroke="#2A2218" stroke-width="1.7"/>
    <rect x="51" y="66" width="8" height="26" rx="1.5" fill="#5C5C5C" stroke="#2A2218" stroke-width="1.7"/>
    <line x1="45" y1="68" x2="45" y2="90" stroke="#2A2218" stroke-width="0.7" opacity="0.5"/>
    <line x1="55" y1="68" x2="55" y2="90" stroke="#2A2218" stroke-width="0.7" opacity="0.5"/>
    <ellipse cx="45" cy="93" rx="5.5" ry="2" fill="#2A2218" stroke="#1A1410" stroke-width="1"/>
    <ellipse cx="55" cy="93" rx="5.5" ry="2" fill="#2A2218" stroke="#1A1410" stroke-width="1"/>
    <path d="M32,48 L68,48 L70,68 L30,68 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="2" stroke-linejoin="round"/>
    <path d="M43,48 L50,58 L57,48 Z" fill="#FBF6E1" stroke="#3D2008" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M48,52 L52,52 L51.5,62 L48.5,62 Z" fill="#B23A3A" stroke="#5C0000" stroke-width="1"/>
    <line x1="48.2" y1="54" x2="51.8" y2="54" stroke="#5C0000" stroke-width="0.7"/>
    <line x1="48.4" y1="56" x2="51.6" y2="56" stroke="#5C0000" stroke-width="0.7"/>
    <line x1="48.6" y1="58" x2="51.4" y2="58" stroke="#5C0000" stroke-width="0.7"/>
    <rect x="30" y="66" width="40" height="2.5" fill="#0E1F3F" stroke="none"/>
    <rect x="46" y="38" width="8" height="10" fill="#F5D8A8" stroke="#3D2008" stroke-width="1.2"/>
    <circle cx="50" cy="26" r="13" fill="#F5D8A8" stroke="#3D2008" stroke-width="2"/>
    <path d="M36,24 Q36,11 50,9 Q64,11 64,24 Q62,15 50,15 Q38,15 36,24 Z" fill="#5C3309" stroke="#3D2008" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M40,16 Q46,20 50,18 Q54,20 60,16" fill="none" stroke="#3D2008" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M44,25 Q46,24 48,25" fill="none" stroke="#3D2008" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M52,25 Q54,24 56,25" fill="none" stroke="#3D2008" stroke-width="1.1" stroke-linecap="round"/>
    <circle cx="46" cy="29" r="1.4" fill="#2A2218"/>
    <circle cx="54" cy="29" r="1.4" fill="#2A2218"/>
    <circle cx="45.6" cy="28.6" r="0.4" fill="#FFFFFF"/>
    <circle cx="53.6" cy="28.6" r="0.4" fill="#FFFFFF"/>
    <path d="M45,34 Q50,37 55,34" fill="none" stroke="#3D2008" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="42" cy="33" r="1.4" fill="#E8A8A8" opacity="0.55"/>
    <circle cx="58" cy="33" r="1.4" fill="#E8A8A8" opacity="0.55"/>
    <path d="M32,50 Q28,58 30,68 L34,68 Q32,58 34,50 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M68,50 Q72,58 70,68 L66,68 Q68,58 66,50 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="1.7" stroke-linejoin="round"/>
    <circle cx="32" cy="68" r="2.4" fill="#F5D8A8" stroke="#3D2008" stroke-width="1.1"/>
    <circle cx="68" cy="68" r="2.4" fill="#F5D8A8" stroke="#3D2008" stroke-width="1.1"/>
    <rect x="63" y="64" width="13" height="9" rx="0.8" fill="#5C0A20" stroke="#3D050D" stroke-width="1.4" stroke-linejoin="round"/>
    <rect x="65" y="66" width="9" height="5" fill="none" stroke="#C9A227" stroke-width="0.7" opacity="0.7"/>
    <text x="69.5" y="70" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="3.5" font-weight="700" fill="#C9A227">A</text>
  </svg>`,
};

// ---- Vocabulary list ----
// 19 items pulled from Roisin's worksheet (15 classroom objects + 4 people/place).
// "scriosán" appeared twice in the source word bank; deduped here.
const ITEMS = [
  { id: "clog",         ga: "clog",         en: "clock",       svg: SVG.clog },
  { id: "peann",        ga: "peann",        en: "pen",         svg: SVG.peann },
  { id: "cathaoir",     ga: "cathaoir",     en: "chair",       svg: SVG.cathaoir },
  { id: "solas",        ga: "solas",        en: "light",       svg: SVG.solas },
  { id: "boscaBruscair",ga: "bosca bruscair",en: "bin",        svg: SVG.boscaBruscair },
  { id: "rialoir",      ga: "rialóir",      en: "ruler",       svg: SVG.rialoir },
  { id: "peannLuaidhe", ga: "peann luaidhe",en: "pencil",      svg: SVG.peannLuaidhe },
  { id: "deasc",        ga: "deasc",        en: "desk",        svg: SVG.deasc },
  { id: "scriosan",     ga: "scriosán",     en: "eraser",      svg: SVG.scriosan },
  { id: "fuinneog",     ga: "fuinneog",     en: "window",      svg: SVG.fuinneog },
  { id: "doras",        ga: "doras",        en: "door",        svg: SVG.doras },
  { id: "malaScoile",   ga: "mála scoile",  en: "school bag",  svg: SVG.malaScoile },
  { id: "riomhaire",    ga: "ríomhaire",    en: "computer",    svg: SVG.riomhaire },
  { id: "clarBan",      ga: "clár bán",     en: "whiteboard",  svg: SVG.clarBan },
  { id: "leabhar",      ga: "leabhar",      en: "book",        svg: SVG.leabhar },
  { id: "muinteoir",    ga: "múinteoir",    en: "teacher",     svg: SVG.muinteoir },
  { id: "urlar",        ga: "urlár",        en: "floor",       svg: SVG.urlar },
  { id: "cailin",       ga: "cailín",       en: "girl",        svg: SVG.cailin },
  { id: "buachaill",    ga: "buachaill",    en: "boy",         svg: SVG.buachaill },
];

const ITEM_BY_ID = Object.fromEntries(ITEMS.map(f => [f.id, f]));

// Packing-list rounds for the bag mode.
// Each round: 4 items the pupil must pack (drawn from the classroom-equipment subset,
// since you wouldn't "pack" a door or a teacher into a school bag).
const PACKABLE_IDS = [
  "peann", "rialoir", "peannLuaidhe", "scriosan",
  "leabhar", "clog", "boscaBruscair", "cathaoir",
  "deasc", "fuinneog", "doras", "malaScoile",
  "riomhaire", "clarBan", "solas",
];
const PACK_ROUNDS = [
  ["peann", "leabhar", "rialoir", "scriosan"],
  ["peannLuaidhe", "leabhar", "scriosan", "riomhaire"],
  ["peann", "peannLuaidhe", "rialoir", "leabhar"],
  ["rialoir", "scriosan", "peannLuaidhe", "riomhaire"],
];

// =================================================================
// Audio (subtle feedback tones + optional per-word recordings)
// =================================================================
let ac;
function tone(f, ms, type = "sine", g = 0.04) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const gn = ac.createGain();
    o.type = type; o.frequency.value = f; gn.gain.value = g;
    o.connect(gn); gn.connect(ac.destination); o.start();
    gn.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ms / 1000);
    o.stop(ac.currentTime + ms / 1000 + 0.02);
  } catch {}
}
function ding()    { tone(720, 80, "triangle", 0.04); setTimeout(() => tone(960, 100, "triangle", 0.04), 70); }
function buzz()    { tone(180, 200, "sawtooth", 0.04); }
function fanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 200, "triangle", 0.04), i * 110)); }

// ---- Per-word voice recordings ----
// audio/<id>.m4a is checked on first probe; if found, a speaker button is enabled
// for every appearance of that item. Voice Memos exports .m4a (AAC), playable
// natively by every modern browser, so files drop straight in with no conversion.
const AUDIO_PATH = (id) => `audio/${id}.m4a`;
const audioAvailable = new Set();
const audioElements = {};   // id → HTMLAudioElement (lazily created)
const audioProbed = {};     // id → Promise<boolean>

function probeAudio(id) {
  if (audioProbed[id]) return audioProbed[id];
  audioProbed[id] = new Promise((resolve) => {
    const a = new Audio();
    a.preload = "metadata";
    const onOk  = () => { audioAvailable.add(id); audioElements[id] = a; cleanup(); resolve(true); };
    const onErr = () => { cleanup(); resolve(false); };
    function cleanup() {
      a.removeEventListener("loadedmetadata", onOk);
      a.removeEventListener("canplaythrough", onOk);
      a.removeEventListener("error", onErr);
    }
    a.addEventListener("loadedmetadata", onOk);
    a.addEventListener("canplaythrough", onOk);
    a.addEventListener("error", onErr);
    a.src = AUDIO_PATH(id);
  });
  return audioProbed[id];
}

function playWord(id) {
  let a = audioElements[id];
  if (!a) { a = new Audio(AUDIO_PATH(id)); audioElements[id] = a; }
  try { a.currentTime = 0; a.play().catch(() => {}); } catch {}
}

const SPEAKER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M16 9a4 4 0 010 6"/><path d="M19 6a8 8 0 010 12"/></svg>`;

function makeAudioBtn(id, labelGa) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "audio-btn";
  btn.setAttribute("aria-label", `Éist le "${labelGa}" — listen to "${labelGa}"`);
  btn.innerHTML = SPEAKER_SVG;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    playWord(id);
  });
  probeAudio(id).then(ok => { if (ok) btn.classList.add("ready"); });
  return btn;
}

// =================================================================
// Utilities
// =================================================================
function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function sample(arr, n, exclude = []) {
  const pool = arr.filter(x => !exclude.includes(x));
  return shuffle(pool).slice(0, n);
}

// =================================================================
// MODE 1 — Aithin an Rud (Identify): picture shown, pick Irish word
// =================================================================
const idState = { queue: [], idx: 0, correct: 0, wrong: 0 };
const idSvgEl     = document.getElementById("idSvg");
const idOptionsEl = document.getElementById("idOptions");
const idFeedback  = document.getElementById("iFeedback");
const idResultEl  = document.getElementById("idResult");
const idTitleEl   = document.getElementById("idTitle");
const idMsgEl     = document.getElementById("idMsg");
const idIdxEl     = document.getElementById("iIdx");
const idTotalEl   = document.getElementById("iTotal");
const idCorrectEl = document.getElementById("iCorrect");
const idWrongEl   = document.getElementById("iWrong");

function idStart() {
  idState.queue = shuffle(ITEMS).slice(0, 10);
  idState.idx = 0;
  idState.correct = 0;
  idState.wrong = 0;
  idTotalEl.textContent = idState.queue.length;
  idCorrectEl.textContent = "0";
  idWrongEl.textContent = "0";
  idResultEl.hidden = true;
  idNextQuestion();
}

function idNextQuestion() {
  if (idState.idx >= idState.queue.length) return idFinish();
  const item = idState.queue[idState.idx];
  idIdxEl.textContent = idState.idx + 1;
  idSvgEl.innerHTML = item.svg;

  const distractorIds = sample(ITEMS.map(f => f.id), 3, [item.id]);
  const distractors = distractorIds.map(id => ITEM_BY_ID[id]);
  const options = shuffle([item, ...distractors]);

  idOptionsEl.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "id-opt";
    btn.dataset.id = opt.id;

    const wordSpan = document.createElement("span");
    wordSpan.textContent = opt.ga;
    btn.appendChild(wordSpan);

    const audioBtn = makeAudioBtn(opt.id, opt.ga);
    btn.appendChild(audioBtn);

    btn.addEventListener("click", (e) => {
      if (e.target.closest(".audio-btn")) return;
      idChoose(btn, opt, item);
    });
    idOptionsEl.appendChild(btn);
  });

  idFeedback.innerHTML = "Pick the Irish word that matches the picture.";
  idFeedback.className = "ga-feedback";
}

function idChoose(btn, chosen, correct) {
  idOptionsEl.querySelectorAll(".id-opt").forEach(b => b.disabled = true);

  if (chosen.id === correct.id) {
    btn.classList.add("correct");
    idState.correct++;
    idCorrectEl.textContent = idState.correct;
    idFeedback.innerHTML = `<strong>Tá an ceart agat — correct.</strong> <em>${correct.ga}</em> means "${correct.en}". <button class="qfb-next" type="button">Ar aghaidh — next &rarr;</button>`;
    idFeedback.className = "ga-feedback ok";
    ding();
    if (audioAvailable.has(correct.id)) setTimeout(() => playWord(correct.id), 220);
  } else {
    btn.classList.add("wrong");
    const correctBtn = idOptionsEl.querySelector(`.id-opt[data-id="${correct.id}"]`);
    if (correctBtn) correctBtn.classList.add("reveal");
    idState.wrong++;
    idWrongEl.textContent = idState.wrong;
    idFeedback.innerHTML = `<strong>Ní hea — not quite.</strong> You picked <em>${chosen.ga}</em> ("${chosen.en}"). The right word for this picture is <em>${correct.ga}</em> — "${correct.en}". <button class="qfb-next" type="button">Ar aghaidh — next &rarr;</button>`;
    idFeedback.className = "ga-feedback bad";
    buzz();
  }
  idFeedback.querySelector(".qfb-next")?.addEventListener("click", () => {
    idState.idx++;
    idNextQuestion();
  });
}

function idFinish() {
  idResultEl.hidden = false;
  const total = idState.queue.length;
  let title, msg;
  if (idState.correct === total) {
    title = "Iontach! — Excellent!";
    msg = `${idState.correct} / ${total} — every Irish word in the right place. Go hiontach.`;
    fanfare();
  } else if (idState.correct >= total - 2) {
    title = "Maith thú — Well done.";
    msg = `${idState.correct} / ${total}. Almost perfect — a quick review of the missed words and you're there.`;
    fanfare();
  } else {
    title = "Coinnigh ort — Keep going.";
    msg = `${idState.correct} / ${total}. Each wrong answer told you the right Irish word — try once more.`;
  }
  idTitleEl.textContent = title;
  idMsgEl.textContent = msg;
}

document.getElementById("idReset").addEventListener("click", idStart);
document.getElementById("idAgain").addEventListener("click", idStart);

// =================================================================
// MODE 2 — Líon an Mála Scoile (Fill the school bag)
// =================================================================
const bgState = { round: 0, listIds: [], poolIds: [], placed: [], correct: 0, wrong: 0, selectedId: null };
const bgListEl     = document.getElementById("bgList");
const bgBagDrop    = document.getElementById("bgBagDrop");
const bgPoolEl     = document.getElementById("bgPool");
const bgFeedback   = document.getElementById("bFeedback");
const bgResultEl   = document.getElementById("bgResult");
const bgTitleEl    = document.getElementById("bgTitle");
const bgMsgEl      = document.getElementById("bgMsg");
const bgRoundEl    = document.getElementById("bRound");
const bgTotalEl    = document.getElementById("bTotal");
const bgCorrectEl  = document.getElementById("bCorrect");
const bgWrongEl    = document.getElementById("bWrong");
bgTotalEl.textContent = PACK_ROUNDS.length;

function bgStart() {
  bgState.round = 0;
  bgState.correct = 0;
  bgState.wrong = 0;
  bgCorrectEl.textContent = "0";
  bgWrongEl.textContent = "0";
  bgResultEl.hidden = true;
  bgLoadRound();
}

function bgLoadRound() {
  bgState.placed = [];
  bgState.selectedId = null;
  bgRoundEl.textContent = bgState.round + 1;
  bgState.listIds = PACK_ROUNDS[bgState.round].slice();
  // Distractors drawn from the packable pool (no doors or floors on the desk).
  const distractors = sample(PACKABLE_IDS, 4, bgState.listIds);
  bgState.poolIds = shuffle([...bgState.listIds, ...distractors]);
  bgRenderList();
  bgRenderPool();
  bgBagDrop.innerHTML = "";
  bgFeedback.innerHTML = "Tap an item on the desk and then tap the bag — or drag it directly across. Items <em>not</em> on your <em>liosta</em> stay on the desk.";
  bgFeedback.className = "ga-feedback";
  bgResultEl.hidden = true;
}

function bgRenderList() {
  bgListEl.innerHTML = "";
  bgState.listIds.forEach((id, i) => {
    const f = ITEM_BY_ID[id];
    const li = document.createElement("li");
    li.dataset.id = id;
    if (bgState.placed.includes(id)) li.classList.add("done");

    const num = document.createElement("span");
    num.className = "bg-num";
    num.textContent = i + 1;
    li.appendChild(num);

    const word = document.createElement("span");
    word.className = "bg-word";
    word.textContent = f.ga;
    li.appendChild(word);

    const audioBtn = makeAudioBtn(id, f.ga);
    li.appendChild(audioBtn);

    const check = document.createElement("span");
    check.className = "bg-check";
    check.innerHTML = bgState.placed.includes(id) ? "&#x2713;" : "";
    li.appendChild(check);

    bgListEl.appendChild(li);
  });
}

function bgRenderPool() {
  bgPoolEl.innerHTML = "";
  bgState.poolIds.forEach(id => {
    const f = ITEM_BY_ID[id];
    const card = document.createElement("div");
    card.className = "item-card";
    card.dataset.id = id;
    card.innerHTML = `<div class="item-svg">${f.svg}</div>`;
    if (bgState.placed.includes(id)) card.classList.add("used");

    card.addEventListener("pointerdown", e => onCardPointerDown(e, card, id));

    card.addEventListener("click", () => {
      if (bgState._justDragged) return;
      if (bgState.placed.includes(id)) return;
      bgPoolEl.querySelectorAll(".item-card.selected").forEach(x => x.classList.remove("selected"));
      if (bgState.selectedId === id) {
        bgState.selectedId = null;
        bgFeedback.textContent = "Selection cleared.";
        bgFeedback.className = "ga-feedback";
        return;
      }
      bgState.selectedId = id;
      card.classList.add("selected");
      bgFeedback.innerHTML = `Item selected — now tap the school bag to place it.`;
      bgFeedback.className = "ga-feedback";
    });

    bgPoolEl.appendChild(card);
  });
}

// ---- Pointer-Events drag (mouse + touch + pen, one code path) ----
let _drag = null;
const DRAG_THRESHOLD = 6;

function onCardPointerDown(e, card, id) {
  if (bgState.placed.includes(id)) return;
  if (e.button !== undefined && e.button !== 0) return;
  _drag = {
    card, id, pointerId: e.pointerId,
    startX: e.clientX, startY: e.clientY,
    offsetX: 0, offsetY: 0,
    ghost: null, activated: false,
  };
  try { card.setPointerCapture(e.pointerId); } catch {}
  card.addEventListener("pointermove", onCardPointerMove);
  card.addEventListener("pointerup", onCardPointerUp);
  card.addEventListener("pointercancel", onCardPointerUp);
}

function onCardPointerMove(e) {
  if (!_drag || e.pointerId !== _drag.pointerId) return;
  const dx = e.clientX - _drag.startX;
  const dy = e.clientY - _drag.startY;
  if (!_drag.activated && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    const rect = _drag.card.getBoundingClientRect();
    const ghost = _drag.card.cloneNode(true);
    ghost.classList.add("dragging-ghost");
    ghost.style.position = "fixed";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "10000";
    document.body.appendChild(ghost);
    _drag.card.classList.add("dragging");
    _drag.ghost = ghost;
    _drag.activated = true;
    _drag.offsetX = e.clientX - rect.left;
    _drag.offsetY = e.clientY - rect.top;
  }
  if (_drag.activated) {
    _drag.ghost.style.left = (e.clientX - _drag.offsetX) + "px";
    _drag.ghost.style.top  = (e.clientY - _drag.offsetY) + "px";
    const under = document.elementFromPoint(e.clientX, e.clientY);
    bgBagDrop.classList.toggle("over", !!under?.closest("#bgBagDrop"));
  }
}

function onCardPointerUp(e) {
  if (!_drag || e.pointerId !== _drag.pointerId) return;
  const drag = _drag;
  _drag = null;
  drag.card.removeEventListener("pointermove", onCardPointerMove);
  drag.card.removeEventListener("pointerup", onCardPointerUp);
  drag.card.removeEventListener("pointercancel", onCardPointerUp);
  try { drag.card.releasePointerCapture(drag.pointerId); } catch {}

  if (drag.activated) {
    drag.ghost.style.display = "none";
    const under = document.elementFromPoint(e.clientX, e.clientY);
    drag.ghost.remove();
    drag.card.classList.remove("dragging");
    bgBagDrop.classList.remove("over");
    bgState._justDragged = true;
    setTimeout(() => { bgState._justDragged = false; }, 80);
    if (under && under.closest("#bgBagDrop")) {
      bgAttempt(drag.id);
    }
  }
}

bgBagDrop.addEventListener("click", () => {
  if (bgState.selectedId) bgAttempt(bgState.selectedId);
});

function bgAttempt(id) {
  if (bgState.placed.includes(id)) return;
  const f = ITEM_BY_ID[id];
  const onList = bgState.listIds.includes(id);

  if (onList) {
    bgState.placed.push(id);
    bgState.correct++;
    bgCorrectEl.textContent = bgState.correct;
    const card = document.createElement("div");
    card.className = "item-card in-bag";
    card.innerHTML = `<div class="item-svg">${f.svg}</div><div class="item-label">${f.ga}</div>`;
    bgBagDrop.appendChild(card);
    bgFeedback.innerHTML = `<strong>Maith thú —</strong> <em>${f.ga}</em> ("${f.en}") was on the list.`;
    bgFeedback.className = "ga-feedback ok";
    ding();
    if (audioAvailable.has(id)) setTimeout(() => playWord(id), 200);
    bgRenderList();
    bgRenderPool();
    if (bgState.placed.length === bgState.listIds.length) {
      setTimeout(bgFinishRound, 450);
    }
  } else {
    bgState.wrong++;
    bgWrongEl.textContent = bgState.wrong;
    const card = bgPoolEl.querySelector(`.item-card[data-id="${id}"]`);
    if (card) {
      card.classList.add("flash-bad");
      setTimeout(() => card.classList.remove("flash-bad"), 380);
    }
    bgFeedback.innerHTML = `<strong>Ní hea —</strong> <em>${f.ga}</em> ("${f.en}") isn't on the list. Leave it on the desk.`;
    bgFeedback.className = "ga-feedback bad";
    buzz();
  }
  bgState.selectedId = null;
  bgPoolEl.querySelectorAll(".item-card.selected").forEach(x => x.classList.remove("selected"));
}

function bgFinishRound() {
  bgResultEl.hidden = false;
  const isLast = bgState.round === PACK_ROUNDS.length - 1;
  bgTitleEl.textContent = isLast ? "Críochnaithe! — Finished!" : "Babhta críochnaithe — Round done.";
  bgMsgEl.textContent = isLast
    ? `All ${PACK_ROUNDS.length} packing lists complete. ${bgState.correct} correct items, ${bgState.wrong} wrong attempts overall.`
    : `Packing list ${bgState.round + 1} done. ${bgState.wrong === 0 ? "Perfect this round — no wrong items." : "Keep going."}`;
  document.getElementById("bgAgain").textContent = isLast ? "Tosaigh arís — Start over" : "Babhta nua — Next round";
  if (bgState.wrong === 0) fanfare();
}

document.getElementById("bgReset").addEventListener("click", bgStart);
document.getElementById("bgAgain").addEventListener("click", () => {
  if (bgState.round >= PACK_ROUNDS.length - 1) {
    bgStart();
  } else {
    bgState.round++;
    bgLoadRound();
  }
});

// =================================================================
// MODE 3 — Cluiche Cuimhne (Memory match)
// =================================================================
const memState = { cards: [], flipped: [], matched: 0, tries: 0, locked: false };
const memoryGrid = document.getElementById("memoryGrid");
const mPairsEl   = document.getElementById("mPairs");
const mTotalPairs= document.getElementById("mTotalPairs");
const mTriesEl   = document.getElementById("mTries");
const mFeedback  = document.getElementById("mFeedback");
const memResult  = document.getElementById("memoryResult");
const mTitleEl   = document.getElementById("mTitle");
const mMsgEl     = document.getElementById("mMsg");
const MEMORY_PAIRS = 8;

function memStart() {
  memState.matched = 0;
  memState.tries = 0;
  memState.flipped = [];
  memState.locked = false;
  mPairsEl.textContent = "0";
  mTotalPairs.textContent = MEMORY_PAIRS;
  mTriesEl.textContent = "0";
  memResult.hidden = true;
  mFeedback.innerHTML = "Flip two cards at a time — match each picture with its Irish word.";
  mFeedback.className = "ga-feedback";

  const picks = shuffle(ITEMS).slice(0, MEMORY_PAIRS);
  const cards = [];
  picks.forEach(f => {
    cards.push({ pairId: f.id, type: "pic", item: f });
    cards.push({ pairId: f.id, type: "word", item: f });
  });
  memState.cards = shuffle(cards);

  memoryGrid.innerHTML = "";
  memState.cards.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "mem-card";
    card.dataset.idx = i;
    const frontHtml = c.type === "pic"
      ? `<div class="mem-face mem-front">${c.item.svg}</div>`
      : `<div class="mem-face mem-front word">${c.item.ga}</div>`;
    card.innerHTML = `
      <div class="mem-inner">
        <div class="mem-face mem-back">?</div>
        ${frontHtml}
      </div>
    `;
    card.addEventListener("click", () => memFlip(i, card));
    memoryGrid.appendChild(card);
  });
}

function memFlip(idx, card) {
  if (memState.locked) return;
  if (card.classList.contains("flipped") || card.classList.contains("matched")) return;
  card.classList.add("flipped");
  memState.flipped.push({ idx, card });
  if (memState.flipped.length === 2) {
    memState.tries++;
    mTriesEl.textContent = memState.tries;
    const [a, b] = memState.flipped;
    const ca = memState.cards[a.idx];
    const cb = memState.cards[b.idx];
    if (ca.pairId === cb.pairId && ca.type !== cb.type) {
      a.card.classList.add("matched");
      b.card.classList.add("matched");
      memState.matched++;
      mPairsEl.textContent = memState.matched;
      mFeedback.innerHTML = `<strong>Maith thú —</strong> <em>${ca.item.ga}</em> means "${ca.item.en}".`;
      mFeedback.className = "ga-feedback ok";
      ding();
      if (audioAvailable.has(ca.item.id)) setTimeout(() => playWord(ca.item.id), 220);
      memState.flipped = [];
      if (memState.matched === MEMORY_PAIRS) setTimeout(memFinish, 450);
    } else {
      memState.locked = true;
      a.card.classList.add("mismatch");
      b.card.classList.add("mismatch");
      mFeedback.innerHTML = `Not a match — try again.`;
      mFeedback.className = "ga-feedback bad";
      buzz();
      setTimeout(() => {
        a.card.classList.remove("flipped", "mismatch");
        b.card.classList.remove("flipped", "mismatch");
        memState.flipped = [];
        memState.locked = false;
      }, 900);
    }
  }
}

function memFinish() {
  memResult.hidden = false;
  mTitleEl.textContent = "Críochnaithe! — Finished!";
  mMsgEl.textContent = `All ${MEMORY_PAIRS} pairs matched in ${memState.tries} tries. ${memState.tries <= MEMORY_PAIRS + 2 ? "Iontach — excellent memory." : "Try again to beat your score."}`;
  fanfare();
}

document.getElementById("mReset").addEventListener("click", memStart);
document.getElementById("mAgain").addEventListener("click", memStart);

// =================================================================
// Tabs
// =================================================================
const tabBtns = {
  identify: document.getElementById("tabIdentify"),
  bag:      document.getElementById("tabBag"),
  memory:   document.getElementById("tabMemory"),
};
const panes = {
  identify: document.getElementById("paneIdentify"),
  bag:      document.getElementById("paneBag"),
  memory:   document.getElementById("paneMemory"),
};
Object.entries(tabBtns).forEach(([key, btn]) => {
  btn.addEventListener("click", () => {
    Object.entries(tabBtns).forEach(([, b]) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    Object.entries(panes).forEach(([k, p]) => p.hidden = k !== key);
  });
});

// Boot
idStart();
bgStart();
memStart();

// Probe all audio up front so speaker buttons can wake up as soon
// as their parent elements render. (One HEAD-ish request per word.)
ITEMS.forEach(it => probeAudio(it.id));
