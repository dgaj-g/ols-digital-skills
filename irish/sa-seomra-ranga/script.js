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
  clog: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="38" fill="#FBF6E1" stroke="#2A2218" stroke-width="3.5"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="#C9A227" stroke-width="1.5" stroke-dasharray="2 4"/>
    <text x="50" y="22" text-anchor="middle" font-family="Georgia,serif" font-size="9" font-weight="700" fill="#2A2218">12</text>
    <text x="79" y="54" text-anchor="middle" font-family="Georgia,serif" font-size="9" font-weight="700" fill="#2A2218">3</text>
    <text x="50" y="84" text-anchor="middle" font-family="Georgia,serif" font-size="9" font-weight="700" fill="#2A2218">6</text>
    <text x="21" y="54" text-anchor="middle" font-family="Georgia,serif" font-size="9" font-weight="700" fill="#2A2218">9</text>
    <line x1="50" y1="50" x2="50" y2="28" stroke="#0E5F38" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="68" y2="50" stroke="#0E5F38" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="2.5" fill="#0E5F38"/>
  </svg>`,

  peann: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M18,82 L26,74 L70,30 L82,42 L38,86 L26,82 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M68,32 L80,44" stroke="#C9A227" stroke-width="2"/>
    <path d="M70,30 L82,42 L88,36 L76,24 Z" fill="#C9A227" stroke="#8B6F0E" stroke-width="2" stroke-linejoin="round"/>
    <path d="M18,82 L22,86 L26,82 L24,78 Z" fill="#2A2218"/>
    <line x1="58" y1="42" x2="62" y2="46" stroke="#C9A227" stroke-width="1.5"/>
  </svg>`,

  cathaoir: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="30" y="20" width="42" height="32" rx="3" fill="#A87C4F" stroke="#5C3309" stroke-width="2.5"/>
    <rect x="26" y="50" width="50" height="10" rx="2" fill="#C68B4B" stroke="#5C3309" stroke-width="2.5"/>
    <line x1="30" y1="60" x2="26" y2="90" stroke="#5C3309" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="72" y1="60" x2="76" y2="90" stroke="#5C3309" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="36" y1="28" x2="36" y2="50" stroke="#5C3309" stroke-width="1.5" opacity="0.6"/>
    <line x1="66" y1="28" x2="66" y2="50" stroke="#5C3309" stroke-width="1.5" opacity="0.6"/>
    <line x1="50" y1="28" x2="50" y2="50" stroke="#5C3309" stroke-width="1.5" opacity="0.6"/>
  </svg>`,

  solas: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50,12 Q70,12 72,32 Q72,46 62,54 L62,66 L38,66 L38,54 Q28,46 28,32 Q30,12 50,12 Z" fill="#F5D247" stroke="#5C4500" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="40" y="66" width="20" height="8" fill="#A88B14" stroke="#5C4500" stroke-width="2"/>
    <rect x="42" y="74" width="16" height="4" fill="#7A6438" stroke="#5C4500" stroke-width="2"/>
    <path d="M44,40 Q44,30 50,28" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
    <line x1="50" y1="6" x2="50" y2="2" stroke="#C9A227" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="20" x2="16" y2="16" stroke="#C9A227" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="80" y1="20" x2="84" y2="16" stroke="#C9A227" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="10" y1="40" x2="6" y2="40" stroke="#C9A227" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="90" y1="40" x2="94" y2="40" stroke="#C9A227" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,

  boscaBruscair: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="38" y="14" width="24" height="6" rx="1.5" fill="#5C5C5C" stroke="#2A2218" stroke-width="2"/>
    <path d="M28,22 L72,22 L68,90 L32,90 Z" fill="#7A8A9C" stroke="#2A2218" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="22" rx="22" ry="4" fill="#5C6B7C" stroke="#2A2218" stroke-width="2"/>
    <line x1="40" y1="32" x2="38" y2="84" stroke="#2A2218" stroke-width="1.5" opacity="0.4"/>
    <line x1="50" y1="32" x2="50" y2="84" stroke="#2A2218" stroke-width="1.5" opacity="0.4"/>
    <line x1="60" y1="32" x2="62" y2="84" stroke="#2A2218" stroke-width="1.5" opacity="0.4"/>
    <path d="M44,8 Q50,4 56,8" stroke="#2A2218" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,

  rialoir: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="38" width="80" height="24" fill="#FBF6E1" stroke="#2A2218" stroke-width="2.5"/>
    <line x1="20" y1="38" x2="20" y2="50" stroke="#2A2218" stroke-width="1.5"/>
    <line x1="30" y1="38" x2="30" y2="46" stroke="#2A2218" stroke-width="1.2"/>
    <line x1="40" y1="38" x2="40" y2="50" stroke="#2A2218" stroke-width="1.5"/>
    <line x1="50" y1="38" x2="50" y2="46" stroke="#2A2218" stroke-width="1.2"/>
    <line x1="60" y1="38" x2="60" y2="50" stroke="#2A2218" stroke-width="1.5"/>
    <line x1="70" y1="38" x2="70" y2="46" stroke="#2A2218" stroke-width="1.2"/>
    <line x1="80" y1="38" x2="80" y2="50" stroke="#2A2218" stroke-width="1.5"/>
    <text x="20" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="6" fill="#2A2218">1</text>
    <text x="40" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="6" fill="#2A2218">3</text>
    <text x="60" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="6" fill="#2A2218">5</text>
    <text x="80" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="6" fill="#2A2218">7</text>
  </svg>`,

  peannLuaidhe: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,86 L24,76 L72,28 L84,40 L36,88 Z" fill="#F5D247" stroke="#5C4500" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M72,28 L84,40 L86,36 L78,20 L74,20 Z" fill="#E8B97A" stroke="#5C4500" stroke-width="2.2"/>
    <rect x="74.5" y="22" width="11" height="3.5" fill="#7A4A1A" stroke="#5C3309" stroke-width="1.5" transform="rotate(45 80 23.5)"/>
    <path d="M14,86 L20,90 L26,84 L22,80 Z" fill="#2A2218" stroke="#1A1410" stroke-width="2" stroke-linejoin="round"/>
    <line x1="32" y1="48" x2="44" y2="60" stroke="#A88B14" stroke-width="1.2" opacity="0.6"/>
    <line x1="48" y1="32" x2="60" y2="44" stroke="#A88B14" stroke-width="1.2" opacity="0.6"/>
  </svg>`,

  deasc: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,38 L86,38 L78,52 L22,52 Z" fill="#C68B4B" stroke="#5C3309" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M22,52 L26,86 L34,86 L32,52" fill="#A87C4F" stroke="#5C3309" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M78,52 L74,86 L66,86 L68,52" fill="#A87C4F" stroke="#5C3309" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="36" y="56" width="28" height="18" rx="1.5" fill="#8A6238" stroke="#5C3309" stroke-width="2"/>
    <circle cx="50" cy="65" r="1.5" fill="#2A2218"/>
    <line x1="14" y1="38" x2="86" y2="38" stroke="#2A2218" stroke-width="1" opacity="0.4"/>
  </svg>`,

  scriosan: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M20,40 L72,40 L80,48 L80,64 L72,72 L20,72 L12,64 L12,48 Z" fill="#E94B6F" stroke="#7A1A30" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M20,56 L72,56 L80,64 L72,72 L20,72 L12,64 Z" fill="#A8344F" stroke="#7A1A30" stroke-width="2.5" stroke-linejoin="round"/>
    <line x1="20" y1="40" x2="20" y2="72" stroke="#7A1A30" stroke-width="1.5"/>
    <line x1="72" y1="40" x2="72" y2="72" stroke="#7A1A30" stroke-width="1.5"/>
    <ellipse cx="40" cy="48" rx="6" ry="2.5" fill="#FBF6E1" opacity="0.7"/>
  </svg>`,

  fuinneog: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="18" y="12" width="64" height="76" fill="#7A8A9C" stroke="#2A2218" stroke-width="3"/>
    <rect x="22" y="16" width="56" height="68" fill="#A8C4DC"/>
    <line x1="50" y1="16" x2="50" y2="84" stroke="#2A2218" stroke-width="2.5"/>
    <line x1="22" y1="50" x2="78" y2="50" stroke="#2A2218" stroke-width="2.5"/>
    <path d="M30,76 L36,30 L42,76" fill="none" stroke="#FBF6E1" stroke-width="1.5" opacity="0.5"/>
    <path d="M58,76 L64,30 L70,76" fill="none" stroke="#FBF6E1" stroke-width="1.5" opacity="0.5"/>
    <rect x="14" y="86" width="72" height="6" fill="#5C5C5C" stroke="#2A2218" stroke-width="2.5"/>
  </svg>`,

  doras: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="8" width="60" height="84" fill="#8A6238" stroke="#3D2008" stroke-width="3" stroke-linejoin="round"/>
    <rect x="26" y="14" width="48" height="34" fill="#A87C4F" stroke="#3D2008" stroke-width="2"/>
    <rect x="26" y="52" width="48" height="34" fill="#A87C4F" stroke="#3D2008" stroke-width="2"/>
    <circle cx="68" cy="56" r="3" fill="#C9A227" stroke="#3D2008" stroke-width="1.5"/>
    <line x1="38" y1="20" x2="38" y2="42" stroke="#3D2008" stroke-width="1.2" opacity="0.5"/>
    <line x1="62" y1="20" x2="62" y2="42" stroke="#3D2008" stroke-width="1.2" opacity="0.5"/>
    <line x1="38" y1="58" x2="38" y2="80" stroke="#3D2008" stroke-width="1.2" opacity="0.5"/>
    <line x1="62" y1="58" x2="62" y2="80" stroke="#3D2008" stroke-width="1.2" opacity="0.5"/>
  </svg>`,

  malaScoile: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M28,30 Q28,16 50,16 Q72,16 72,30 L72,30 L78,30" fill="none" stroke="#5C3309" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M22,32 L78,32 L82,82 Q82,90 74,90 L26,90 Q18,90 18,82 Z" fill="#A8344F" stroke="#5C0A20" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M22,32 L78,32 L80,46 Q80,52 72,52 L28,52 Q20,52 20,46 Z" fill="#7A1A30" stroke="#5C0A20" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="40" y="40" width="20" height="6" rx="1.5" fill="#C9A227" stroke="#5C0A20" stroke-width="1.5"/>
    <rect x="30" y="60" width="40" height="20" rx="2" fill="#7A1A30" stroke="#5C0A20" stroke-width="2"/>
    <rect x="42" y="68" width="16" height="4" rx="1" fill="#C9A227" stroke="#5C0A20" stroke-width="1.2"/>
  </svg>`,

  riomhaire: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,76 L86,76 L92,86 L8,86 Z" fill="#7A8A9C" stroke="#2A2218" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="18" y="20" width="64" height="56" rx="2" fill="#2A2218" stroke="#1A1410" stroke-width="2.5"/>
    <rect x="22" y="24" width="56" height="44" fill="#5BA6D8"/>
    <rect x="22" y="24" width="56" height="6" fill="#2A2218"/>
    <line x1="22" y1="36" x2="78" y2="36" stroke="#FBF6E1" stroke-width="0.8" opacity="0.4"/>
    <line x1="22" y1="46" x2="78" y2="46" stroke="#FBF6E1" stroke-width="0.8" opacity="0.4"/>
    <line x1="22" y1="56" x2="62" y2="56" stroke="#FBF6E1" stroke-width="0.8" opacity="0.4"/>
    <rect x="42" y="68" width="16" height="4" fill="#5C5C5C"/>
  </svg>`,

  clarBan: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="14" width="80" height="56" rx="2" fill="#5C5C5C" stroke="#2A2218" stroke-width="2.5"/>
    <rect x="14" y="18" width="72" height="48" fill="#FBF6E1"/>
    <path d="M22,32 Q26,28 30,32 Q34,36 30,42" fill="none" stroke="#1A3A6B" stroke-width="2" stroke-linecap="round"/>
    <line x1="40" y1="34" x2="68" y2="34" stroke="#1A3A6B" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="22" y1="48" x2="76" y2="48" stroke="#1A3A6B" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="22" y1="56" x2="60" y2="56" stroke="#1A3A6B" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="20" y="70" width="60" height="4" fill="#A87C4F" stroke="#5C3309" stroke-width="1.5"/>
    <line x1="30" y1="74" x2="30" y2="92" stroke="#2A2218" stroke-width="2"/>
    <line x1="70" y1="74" x2="70" y2="92" stroke="#2A2218" stroke-width="2"/>
  </svg>`,

  leabhar: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M10,24 Q30,18 50,24 Q70,18 90,24 L90,82 Q70,76 50,82 Q30,76 10,82 Z" fill="#FBF6E1" stroke="#2A2218" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M50,24 L50,82" stroke="#2A2218" stroke-width="2.5"/>
    <path d="M10,24 Q30,18 50,24 L50,32 Q30,26 10,32 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="2"/>
    <path d="M50,24 Q70,18 90,24 L90,32 Q70,26 50,32 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="2"/>
    <line x1="18" y1="40" x2="44" y2="40" stroke="#8B7A48" stroke-width="1.2"/>
    <line x1="18" y1="48" x2="44" y2="48" stroke="#8B7A48" stroke-width="1.2"/>
    <line x1="18" y1="56" x2="40" y2="56" stroke="#8B7A48" stroke-width="1.2"/>
    <line x1="56" y1="40" x2="82" y2="40" stroke="#8B7A48" stroke-width="1.2"/>
    <line x1="56" y1="48" x2="82" y2="48" stroke="#8B7A48" stroke-width="1.2"/>
    <line x1="56" y1="56" x2="78" y2="56" stroke="#8B7A48" stroke-width="1.2"/>
  </svg>`,

  muinteoir: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="58" y="10" width="34" height="40" rx="1.5" fill="#0E5F38" stroke="#2A2218" stroke-width="2"/>
    <line x1="64" y1="22" x2="86" y2="22" stroke="#FBF6E1" stroke-width="1.5" opacity="0.8"/>
    <line x1="64" y1="30" x2="84" y2="30" stroke="#FBF6E1" stroke-width="1.5" opacity="0.8"/>
    <line x1="64" y1="38" x2="78" y2="38" stroke="#FBF6E1" stroke-width="1.5" opacity="0.8"/>
    <circle cx="34" cy="30" r="11" fill="#F5D8A8" stroke="#2A2218" stroke-width="2"/>
    <path d="M24,26 Q34,16 44,26 L44,30 Q34,22 24,30 Z" fill="#7A4A1A" stroke="#3D2008" stroke-width="1.5"/>
    <circle cx="30" cy="30" r="1.2" fill="#2A2218"/>
    <circle cx="38" cy="30" r="1.2" fill="#2A2218"/>
    <path d="M30,35 Q34,38 38,35" fill="none" stroke="#2A2218" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M22,42 Q34,40 46,42 L52,72 Q34,76 16,72 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="2" stroke-linejoin="round"/>
    <path d="M46,46 Q58,50 60,42" fill="none" stroke="#1A3A6B" stroke-width="6" stroke-linecap="round"/>
    <rect x="55" y="38" width="8" height="3" fill="#C9A227" stroke="#8B6F0E" stroke-width="1" transform="rotate(20 59 39)"/>
    <line x1="20" y1="74" x2="22" y2="92" stroke="#2A2218" stroke-width="3" stroke-linecap="round"/>
    <line x1="48" y1="74" x2="46" y2="92" stroke="#2A2218" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  urlar: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,40 L100,40 L100,100 L0,100 Z" fill="#FBF6E1" stroke="#2A2218" stroke-width="2"/>
    <path d="M0,40 L100,40" stroke="#2A2218" stroke-width="1.5"/>
    <path d="M10,40 L0,100" stroke="#8B7A48" stroke-width="1"/>
    <path d="M30,40 L20,100" stroke="#8B7A48" stroke-width="1"/>
    <path d="M50,40 L50,100" stroke="#8B7A48" stroke-width="1"/>
    <path d="M70,40 L80,100" stroke="#8B7A48" stroke-width="1"/>
    <path d="M90,40 L100,100" stroke="#8B7A48" stroke-width="1"/>
    <path d="M0,55 L100,55" stroke="#8B7A48" stroke-width="1"/>
    <path d="M0,72 L100,72" stroke="#8B7A48" stroke-width="1"/>
    <path d="M0,90 L100,90" stroke="#8B7A48" stroke-width="1"/>
    <path d="M30,40 L20,55 L0,55" fill="rgba(14,95,56,0.18)"/>
    <path d="M50,55 L70,55 L80,72 L50,72 Z" fill="rgba(201,162,39,0.15)"/>
    <path d="M0,72 L20,72 L10,90 L0,90 Z" fill="rgba(14,95,56,0.18)"/>
    <path d="M70,72 L100,72 L100,90 L80,90 Z" fill="rgba(201,162,39,0.15)"/>
    <text x="50" y="32" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="10" fill="#0E5F38" opacity="0.5">↓</text>
  </svg>`,

  cailin: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M28,28 Q28,10 50,10 Q72,10 72,28 L72,44 Q72,52 65,52 L35,52 Q28,52 28,44 Z" fill="#7A4A1A" stroke="#3D2008" stroke-width="2"/>
    <circle cx="50" cy="32" r="14" fill="#F5D8A8" stroke="#2A2218" stroke-width="2"/>
    <path d="M30,34 Q28,46 32,56 Q40,54 42,46" fill="#7A4A1A" stroke="#3D2008" stroke-width="1.8"/>
    <path d="M70,34 Q72,46 68,56 Q60,54 58,46" fill="#7A4A1A" stroke="#3D2008" stroke-width="1.8"/>
    <circle cx="45" cy="32" r="1.3" fill="#2A2218"/>
    <circle cx="55" cy="32" r="1.3" fill="#2A2218"/>
    <path d="M45,38 Q50,41 55,38" fill="none" stroke="#2A2218" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M30,52 L70,52 L62,88 L38,88 Z" fill="#A8344F" stroke="#5C0A20" stroke-width="2" stroke-linejoin="round"/>
    <path d="M30,52 Q50,58 70,52" fill="none" stroke="#7A1A30" stroke-width="1.5" opacity="0.6"/>
    <line x1="34" y1="60" x2="22" y2="74" stroke="#F5D8A8" stroke-width="5" stroke-linecap="round"/>
    <line x1="66" y1="60" x2="78" y2="74" stroke="#F5D8A8" stroke-width="5" stroke-linecap="round"/>
    <line x1="42" y1="88" x2="42" y2="96" stroke="#5C5C5C" stroke-width="5" stroke-linecap="round"/>
    <line x1="58" y1="88" x2="58" y2="96" stroke="#5C5C5C" stroke-width="5" stroke-linecap="round"/>
  </svg>`,

  buachaill: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M30,28 Q30,12 50,12 Q70,12 70,28 L70,34 Q70,38 66,38 L34,38 Q30,38 30,34 Z" fill="#2A2218" stroke="#1A1410" stroke-width="2"/>
    <circle cx="50" cy="32" r="14" fill="#F5D8A8" stroke="#2A2218" stroke-width="2"/>
    <circle cx="45" cy="32" r="1.3" fill="#2A2218"/>
    <circle cx="55" cy="32" r="1.3" fill="#2A2218"/>
    <path d="M45,38 Q50,41 55,38" fill="none" stroke="#2A2218" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M30,52 L70,52 L72,76 L28,76 Z" fill="#1A3A6B" stroke="#0E1F3F" stroke-width="2" stroke-linejoin="round"/>
    <path d="M30,52 Q50,58 70,52" fill="none" stroke="#0E1F3F" stroke-width="1.5" opacity="0.6"/>
    <line x1="34" y1="56" x2="22" y2="72" stroke="#F5D8A8" stroke-width="5" stroke-linecap="round"/>
    <line x1="66" y1="56" x2="78" y2="72" stroke="#F5D8A8" stroke-width="5" stroke-linecap="round"/>
    <path d="M28,76 L42,76 L40,96 L34,96 Z" fill="#5C5C5C" stroke="#2A2218" stroke-width="2"/>
    <path d="M58,76 L72,76 L66,96 L60,96 Z" fill="#5C5C5C" stroke="#2A2218" stroke-width="2"/>
    <path d="M34,96 L46,96 L46,92 L34,92 Z" fill="#2A2218"/>
    <path d="M60,96 L72,96 L72,92 L60,92 Z" fill="#2A2218"/>
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
