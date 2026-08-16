#!/usr/bin/env node
/* make-inspection-scenes.js — the drawn scenes for J2 Lesson 1's Workshop
 * Safety Inspection (design chunk 3).
 *
 * HIS K9 RULING, 15 Aug 2026: "I don't have time to take photographs of the real
 * ICT suite, so that's out. So we'll have to go with the other one. But please
 * don't waste my time and make sure that the prototype is excellent."
 * So the scenes are drawn vector, and SCENE 1 goes to his screen for style
 * sign-off before scenes 2-5 exist.
 *
 * WHY THIS IS A GENERATOR AND NOT FIVE HAND-DRAWN FILES. Two reasons, both
 * learned the hard way:
 *   1. DFM 192e / 207d killed two animations for the same fault — the actors
 *      were abstract shapes standing in for real things. "Every actor must be a
 *      physically recognisable thing, large enough to read." A shared vocabulary
 *      of drawn objects (a monitor with a bezel and a stand, a chair with a back
 *      and a star base, a can with a ring pull) is built ONCE here and reused,
 *      so scene 5 cannot quietly be drawn worse than scene 1.
 *   2. The five scenes ramp obvious -> subtle. If each were hand-drawn, the ramp
 *      would live in the DRAWING rather than in what is STAGED, and the hard
 *      scene would be hard because it was drawn small (DFM 207d's exact fault:
 *      "pixel size proves size, never visibility").
 *
 * THE LAYOUT is one bench row seen straight on, five stations across. One
 * station is one clickable zone, so the picture and the mechanic agree: she is
 * never asked which invisible rectangle she is in.
 *
 *   node ks3-dt/tools/make-inspection-scenes.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'platform', 'assets', 'img', 'j2');
fs.mkdirSync(OUT, { recursive: true });

/* ---- THE WORKBENCH PALETTE (K11a's world, so the scene belongs to the year it
   is in rather than to J1's navy) ------------------------------------------- */
const C = {
  wallTop: '#3E2812', wallMid: '#31200D', wallBot: '#241608',
  peg: '#4A3117', pegHole: '#1E1206',
  floor: '#1C1207', floorHi: '#251708', skirt: '#40280F',
  benchTop: '#9A6330', benchTopHi: '#B87A43', benchEdge: '#6B3F1B', benchShade: '#57310F',
  benchLeg: '#4A2B10', benchLegHi: '#5C3714',
  body: '#35322F', bodyHi: '#4A4643', bodyDark: '#232120', bodyLine: '#5E5955',
  screenOff: '#16130F', screenOffHi: '#221E19',
  screenOn: '#E4EDF6', screenBar: '#4C6E96', screenText: '#A9BACD', screenTint: '#C9DAEA',
  key: '#4B4744', keyHi: '#635D59',
  chair: '#44525F', chairHi: '#56footer', chairDark: '#2E3A45', chairSeat: '#3A4753',
  can: '#CE4230', canHi: '#EA6B54', canMetal: '#CFD3D8',
  paper: '#F1E8D4', paperLine: '#C6B99C',
  copper: '#E8963C', copperHi: '#FFB45C', copperDeep: '#A85E1B',
  steel: '#8C9298', glow: '#FFD9A8'
};
C.chairHi = '#566878';

const BENCH = 300;          // bench top surface
const DESK_D = 20;          // bench slab depth
const FRONT = BENCH + DESK_D;
const FLOOR = 452;
const W = 1000, H = 560;
const SW = 200;             // station width

const g = (...k) => k.filter(Boolean).join('\n      ');
const shadow = (cx, cy, rx, ry, o) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="${o || 0.28}"/>`;

/* ---------------- the drawing vocabulary: real things, drawn big ---------- */

function monitor(x, state, opts) {
  opts = opts || {};
  const cx = x + SW / 2;
  const w = 138, h = 96, top = BENCH - 136;
  const lit = state === 'on' || state === 'login';
  const inner = lit
    /* SOMEBODY'S SCREEN, LEFT OPEN. A title bar with an avatar and a name pill,
       and a document under it. It has to be readable from across a classroom as
       "that one is still signed in", so the bar is 16px tall and high-contrast
       against the page, not a hint. */
    ? `<rect x="${cx - w / 2 + 9}" y="${top + 9}" width="${w - 18}" height="17" rx="3" fill="${C.screenBar}"/>
      <circle cx="${cx - w / 2 + 20}" cy="${top + 17}" r="5.4" fill="${C.screenOn}"/>
      <rect x="${cx - w / 2 + 30}" y="${top + 13}" width="52" height="8" rx="4" fill="${C.screenOn}" opacity="0.9"/>
      <rect x="${cx + w / 2 - 20}" y="${top + 13}" width="8" height="8" rx="2" fill="${C.screenOn}" opacity="0.55"/>
      <rect x="${cx - w / 2 + 15}" y="${top + 36}" width="${w - 44}" height="6" rx="3" fill="${C.screenText}"/>
      <rect x="${cx - w / 2 + 15}" y="${top + 49}" width="${w - 62}" height="6" rx="3" fill="${C.screenText}"/>
      <rect x="${cx - w / 2 + 15}" y="${top + 62}" width="${w - 34}" height="6" rx="3" fill="${C.screenText}" opacity="0.75"/>
      <rect x="${cx - w / 2 + 15}" y="${top + 75}" width="${w - 70}" height="6" rx="3" fill="${C.screenText}" opacity="0.55"/>`
    : state === 'login'
    /* ON, BUT SIGNED OUT — the sign-in screen. This is the near-miss in scene 4:
       a lit screen that a quick look reads as "somebody left this signed in",
       and a proper look reads as the machine sitting at its own login box with
       nobody's work on it. It is a JUDGEMENT test, so the difference is drawn
       large and plainly: one centred box with a person circle and a Sign in
       button, and no title bar, no name, no document. */
    ? `<rect x="${cx - 44}" y="${top + 18}" width="88" height="60" rx="5" fill="#FFFFFF" opacity="0.9"/>
      <circle cx="${cx}" cy="${top + 36}" r="11" fill="${C.screenBar}"/>
      <path d="M${cx - 7} ${top + 40} a7 7 0 0 1 14 0" fill="${C.screenOn}"/>
      <circle cx="${cx}" cy="${top + 33}" r="4" fill="${C.screenOn}"/>
      <rect x="${cx - 30}" y="${top + 52}" width="60" height="9" rx="4.5" fill="${C.screenText}" opacity="0.55"/>
      <rect x="${cx - 22}" y="${top + 65}" width="44" height="9" rx="4.5" fill="${C.screenBar}"/>`
    : `<rect x="${cx - w / 2 + 9}" y="${top + 9}" width="${w - 18}" height="${h - 18}" rx="3" fill="${C.screenOffHi}"/>
      <path d="M${cx - w / 2 + 9} ${top + h - 9} L${cx + w / 2 - 9} ${top + 9} L${cx + w / 2 - 9} ${top + 28} L${cx - w / 2 + 30} ${top + h - 9} Z" fill="#FFFFFF" opacity="0.035"/>`;
  return g(
    shadow(cx, BENCH + 2, 52, 5, 0.32),
    `<rect x="${cx - w / 2}" y="${top}" width="${w}" height="${h}" rx="7" fill="${C.body}"/>`,
    `<rect x="${cx - w / 2}" y="${top}" width="${w}" height="${h}" rx="7" fill="none" stroke="${C.bodyLine}" stroke-width="1" opacity="0.5"/>`,
    `<rect x="${cx - w / 2 + 5}" y="${top + 5}" width="${w - 10}" height="${h - 10}" rx="4" fill="${state === 'login' ? '#25415F' : (lit ? C.screenOn : C.screenOff)}"/>`,
    inner,
    /* the power light: off is off, on is on, and it is 6px of truth */
    `<circle cx="${cx + w / 2 - 12}" cy="${top + h - 5}" r="3" fill="${lit ? '#7BD88F' : '#3C3835'}"/>`,
    /* THE CRACKED SCREEN (scene 5's trap). A real fault has to be readable at
       the size the scene renders — a hairline on a 22px mouse is not, and that
       is DFM 207d's own lesson. Cracks run right across the glass, with the
       shatter point where it was struck. */
    opts.cracked ? `<g opacity="0.92">
      <path d="M${cx - 26} ${top + 22} L${cx + 6} ${top + 44} L${cx - 16} ${top + 66} L${cx + 22} ${top + 84}"
        stroke="#CBD5E2" stroke-width="2.6" fill="none" stroke-linejoin="round"/>
      <path d="M${cx + 6} ${top + 44} L${cx + 44} ${top + 30} M${cx + 6} ${top + 44} L${cx + 40} ${top + 66}
        M${cx + 6} ${top + 44} L${cx - 44} ${top + 52}"
        stroke="#CBD5E2" stroke-width="2.2" fill="none"/>
      <circle cx="${cx + 6}" cy="${top + 44}" r="5.5" fill="#E6EDF5" opacity="0.85"/>
      <circle cx="${cx + 6}" cy="${top + 44}" r="11" fill="none" stroke="#CBD5E2" stroke-width="1.6" opacity="0.7"/>
    </g>` : '',
    lit ? `<ellipse cx="${cx}" cy="${top + h / 2}" rx="${w * 0.85}" ry="${h * 0.8}" fill="${C.screenTint}" opacity="0.07"/>` : '',
    `<path d="M${cx - 11} ${top + h} h22 l5 22 h-32 z" fill="${C.bodyDark}"/>`,
    `<rect x="${cx - 38}" y="${top + h + 22}" width="76" height="9" rx="4.5" fill="${C.bodyHi}"/>`
  );
}

function keyboard(x, opts) {
  opts = opts || {};
  const cx = x + SW / 2, y = BENCH - 12, w = 112, h = 27;
  let keys = '';
  for (let r = 0; r < 3; r++) {
    const n = r === 2 ? 6 : 9;
    const off = r === 2 ? 22 : 0;
    for (let c = 0; c < n; c++) {
      keys += `<rect x="${cx - w / 2 + 7 + off + c * 11.6}" y="${y + 5 + r * 6.4}" width="9" height="4.4" rx="1.4" fill="${C.keyHi}"/>`;
    }
  }
  return g(
    shadow(cx, y + h + 1, 60, 4, 0.25),
    `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" rx="4" fill="${C.key}"/>`,
    `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="3" rx="1.5" fill="${C.keyHi}" opacity="0.5"/>`,
    keys,
    /* the MOUSE — she has one, and the lesson's language says so (138.1.6) */
    opts.noMouse ? '' : g(
      `<ellipse cx="${cx + w / 2 + 20}" cy="${y + 14}" rx="11" ry="15" fill="${C.bodyHi}"/>`,
      `<rect x="${cx + w / 2 + 19}" y="${y + 4}" width="2.4" height="9" rx="1.2" fill="${C.bodyDark}"/>`,
      `<path d="M${cx + w / 2 + 20} ${y - 1} q2 -14 -8 -20" stroke="${C.bodyDark}" stroke-width="2.6" fill="none" opacity="0.8"/>`
    )
  );
}

/* chairs: tucked chairs show their back and base under the bench front; a
   pulled-out one is drawn whole and lower, so "somebody got up and left" is a
   picture rather than a caption */
function chair(x, state) {
  const cx = x + SW / 2;
  /* a chair somebody got up from and left: further forward, bigger in the
     frame, and turned. It has to read as "left like that" from across a room. */
  const backTop = state === 'out' ? FRONT + 26 : FRONT + 6;
  const drop = state === 'out' ? 26 : 0;
  const w = state === 'out' ? 88 : 72;
  const tilt = state === 'out' ? ` transform="rotate(-13 ${cx} ${backTop + 40})"` : '';
  return `<g${tilt}>
      ${shadow(cx, FLOOR + 6 + drop / 2, w * 0.62, 7, 0.35)}
      <rect x="${cx - w / 2}" y="${backTop}" width="${w}" height="30" rx="8" fill="${C.chair}"/>
      <rect x="${cx - w / 2 + 5}" y="${backTop + 5}" width="${w - 10}" height="7" rx="3.5" fill="${C.chairHi}" opacity="0.55"/>
      <rect x="${cx - w / 2 - 5}" y="${backTop + 36}" width="${w + 10}" height="13" rx="6.5" fill="${C.chairSeat}"/>
      <rect x="${cx - 5}" y="${backTop + 49}" width="10" height="${FLOOR - backTop - 63}" fill="${C.chairDark}"/>
      <path d="M${cx - 34} ${FLOOR - 2} L${cx} ${FLOOR - 14} L${cx + 34} ${FLOOR - 2}" stroke="${C.chairDark}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <circle cx="${cx - 34}" cy="${FLOOR + 1}" r="4.5" fill="${C.bodyHi}"/>
      <circle cx="${cx + 34}" cy="${FLOOR + 1}" r="4.5" fill="${C.bodyHi}"/>
    </g>`;
}

function can(x) {
  /* HIS FINDING AT THE K9 GATE, 16 Aug 2026: "the 'can of fizzy drink' doesn't
     look like that at all so do that again with the word Coke on it perhaps."
     He is right — the first one was a striped cylinder. What makes a drink can
     read as a drink can is its SHAPE before its colour: the body pulls IN at the
     top and bottom into a neck and a foot, the lid is a silver disc with a ring
     pull sitting on it, and the label is a band with a word on it.
     ON THE WORD: it says COLA, not Coke. His "perhaps" was a suggestion for how
     to make it obvious, and COLA does the identical job — every pupil reads it
     instantly — without a real company's trademark being drawn into school
     lesson material that gets published. One word from him changes it.
     Drawn 44 x 74, up from 36 x 60, so the word is comfortably readable at the
     size the scene renders. */
  const cx = x + SW / 2 + 64, y = BENCH - 76;
  const H_ = 74, halfW = 22, neck = 5;
  /* the body: straight sides with the top and bottom drawn in to a neck */
  const body = `M${cx - halfW + neck} ${y + 4}
    L${cx + halfW - neck} ${y + 4}
    L${cx + halfW} ${y + 13}
    L${cx + halfW} ${y + H_ - 13}
    L${cx + halfW - neck} ${y + H_ - 4}
    L${cx - halfW + neck} ${y + H_ - 4}
    L${cx - halfW} ${y + H_ - 13}
    L${cx - halfW} ${y + 13} Z`;
  return g(
    shadow(cx, BENCH + 1, 18, 3.5, 0.26),
    `<path d="${body}" fill="${C.can}"/>`,
    /* the light down one side, and the darker turn of the cylinder on the other */
    `<path d="${body}" fill="none"/>`,
    `<rect x="${cx - halfW + 2}" y="${y + 8}" width="9" height="${H_ - 16}" rx="4" fill="${C.canHi}" opacity="0.55"/>`,
    `<rect x="${cx + halfW - 8}" y="${y + 8}" width="6" height="${H_ - 16}" rx="3" fill="${C.bodyDark}" opacity="0.22"/>`,
    /* the label band and the word on it */
    `<rect x="${cx - halfW}" y="${y + 26}" width="${halfW * 2}" height="24" fill="${C.canMetal}" opacity="0.95"/>`,
    `<rect x="${cx - halfW}" y="${y + 26}" width="${halfW * 2}" height="3" fill="#FFFFFF" opacity="0.4"/>`,
    `<text x="${cx}" y="${y + 43}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"` +
      ` font-size="13" font-weight="700" letter-spacing="0.5" fill="${C.can}">COLA</text>`,
    /* the lid: a silver disc, with a real ring pull sitting on it */
    `<ellipse cx="${cx}" cy="${y + 4}" rx="${halfW - neck}" ry="5" fill="${C.canMetal}"/>`,
    `<ellipse cx="${cx}" cy="${y + 3}" rx="${halfW - neck - 3}" ry="3.4" fill="#A9AEB4"/>`,
    `<ellipse cx="${cx + 2}" cy="${y + 3}" rx="5" ry="2.4" fill="none" stroke="${C.bodyDark}" stroke-width="1.4" opacity="0.75"/>`,
    `<rect x="${cx - 6}" y="${y + 2}" width="5" height="2" rx="1" fill="${C.bodyDark}" opacity="0.6"/>`,
    /* the foot */
    `<ellipse cx="${cx}" cy="${y + H_ - 4}" rx="${halfW - neck}" ry="4.5" fill="${C.canHi}" opacity="0.5"/>`
  );
}

function clutter(x) {
  /* kit left out. Three things, so it reads as "nobody tidied this" rather than
     as one dropped object — and each is placed where it cannot be confused with
     the next station's kit:
       the headphones HANG OVER THE MONITOR'S TOP CORNER (the silhouette every
       pupil knows), the papers fan across the bench in FRONT of the keyboard,
       and the memory stick is left in plain sight beside them. */
  const cx = x + SW / 2;
  const mTop = BENCH - 136, mRight = cx + 69;
  return g(
    /* headphones over the bezel corner: band hooked across, one cup down the
       front of the screen, the other down the back */
    `<path d="M${mRight - 46} ${mTop + 6} a30 26 0 0 1 52 0" stroke="${C.bodyDark}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
    `<rect x="${mRight - 56}" y="${mTop + 2}" width="22" height="30" rx="9" fill="${C.bodyHi}"/>`,
    `<rect x="${mRight - 52}" y="${mTop + 8}" width="14" height="18" rx="7" fill="${C.bodyDark}" opacity="0.6"/>`,
    `<rect x="${mRight - 4}" y="${mTop + 2}" width="22" height="30" rx="9" fill="${C.body}"/>`,
    /* two sheets fanned across the bench, in front of the keyboard */
    `<g transform="rotate(-13 ${cx - 6} ${BENCH + 2})">
       ${shadow(cx - 6, BENCH + 14, 32, 4, 0.3)}
       <rect x="${cx - 40}" y="${BENCH - 14}" width="64" height="34" rx="2" fill="${C.paper}"/>
       <rect x="${cx - 32}" y="${BENCH - 6}" width="46" height="3.4" fill="${C.paperLine}"/>
       <rect x="${cx - 32}" y="${BENCH + 1}" width="36" height="3.4" fill="${C.paperLine}"/>
       <rect x="${cx - 32}" y="${BENCH + 8}" width="42" height="3.4" fill="${C.paperLine}"/></g>`,
    `<g transform="rotate(9 ${cx + 34} ${BENCH + 4})">
       <rect x="${cx + 8}" y="${BENCH - 10}" width="58" height="32" rx="2" fill="${C.paper}" opacity="0.93"/>
       <rect x="${cx + 16}" y="${BENCH - 2}" width="40" height="3.4" fill="${C.paperLine}" opacity="0.8"/></g>`,
    /* memory stick, cap off, left on the bench */
    `<rect x="${cx + 60}" y="${BENCH + 2}" width="30" height="13" rx="2.5" fill="${C.copper}"/>`,
    `<rect x="${cx + 86}" y="${BENCH + 4.5}" width="12" height="8" rx="1.5" fill="${C.canMetal}"/>`
  );
}

function bottle(x, side) {
  /* a sports bottle of juice: a different drink from scene 1's can, so the
     food-and-drink rule is met twice without the picture repeating itself.
     Neck, screw cap, a sports lid, and a fill line, drawn 40 x 86. */
  const cx = x + SW / 2 + (side === 'left' ? -66 : 64), y = BENCH - 88;
  return g(
    shadow(cx, BENCH + 1, 18, 3.5, 0.26),
    `<path d="M${cx - 20} ${y + 30} q0 -12 8 -16 l0 -8 l24 0 l0 8 q8 4 8 16 l0 44 q0 8 -8 8 l-24 0 q-8 0 -8 -8 z" fill="#E0A33A"/>`,
    `<rect x="${cx - 17}" y="${y + 34}" width="8" height="46" rx="4" fill="#F6D08A" opacity="0.65"/>`,
    `<rect x="${cx - 20}" y="${y + 48}" width="40" height="20" fill="#C06A1E" opacity="0.35"/>`,
    `<rect x="${cx - 9}" y="${y + 4}" width="18" height="14" rx="2" fill="${C.canMetal}"/>`,
    `<rect x="${cx - 4}" y="${y - 4}" width="8" height="10" rx="3" fill="${C.bodyHi}"/>`
  );
}

function looseCable(x, part) {
  /* THE LEAD PULLED OUT OF THE BACK OF THE MACHINE — "respect the equipment,
     no tampering". Two earlier attempts failed the same way and it is worth
     recording why: the bench is only 20px deep in a straight-on view, so a
     cable lying ON it has nowhere to be and reads as a scratch. This one hangs
     DOWN over the bench front into the open space between the chairs, where
     there is room for it, and ends in a real three-pin plug 30 x 22 — the same
     size class as every other staged object, so it is found by looking rather
     than by squinting (DFM 207d). */
  const cx = x + SW / 2;
  if (part === 'back') return g(
    `<path d="M${cx + 26} ${BENCH - 118} q40 10 44 40"
       stroke="${C.cable}" stroke-width="7" fill="none" stroke-linecap="round"/>`
  );
  const px = cx + 62, py = FRONT + 74;
  return g(
    `<path d="M${cx + 70} ${BENCH - 76} q10 40 -4 62 q-10 16 -4 32"
       stroke="${C.cable}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
    `<path d="M${cx + 70} ${BENCH - 76} q10 40 -4 62 q-10 16 -4 32"
       stroke="#332F2B" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.55"/>`,
    shadow(px, py + 36, 16, 3.5, 0.3),
    `<rect x="${px - 16}" y="${py}" width="32" height="24" rx="4" fill="#8C8781"/>`,
    `<rect x="${px - 16}" y="${py}" width="32" height="7" rx="3.5" fill="#A9A49D"/>`,
    `<rect x="${px - 10}" y="${py + 22}" width="5" height="10" rx="1.5" fill="${C.canMetal}"/>`,
    `<rect x="${px + 5}" y="${py + 22}" width="5" height="10" rx="1.5" fill="${C.canMetal}"/>`,
    `<rect x="${px - 3}" y="${py + 6}" width="6" height="11" rx="2" fill="${C.bodyDark}" opacity="0.45"/>`
  );
}

function brokenMouse(x) {
  /* A MOUSE IN TWO PIECES. The first cut drew a hairline crack, which made the
     fault subtle by DRAWING — the exact thing DFM 207d forbids. Now the shell
     is plainly in two halves lying apart, 46px across the pair, so the
     judgement in scene 5 is "was it reported?" and never "can I see it?" */
  const cx = x + SW / 2, y = BENCH - 26, w = 112;
  const bx = cx + w / 2 + 8;
  return g(
    shadow(bx + 12, BENCH + 2, 24, 4, 0.26),
    /* the top half, tipped over */
    `<g transform="rotate(-18 ${bx} ${y + 14})">
       <path d="M${bx - 10} ${y + 4} a11 15 0 0 1 20 0 l0 18 l-20 0 z" fill="${C.bodyHi}"/>
       <rect x="${bx - 1.4}" y="${y + 5}" width="2.8" height="9" rx="1.4" fill="${C.bodyDark}"/>
     </g>`,
    /* the bottom half, upside down, with its foot pads showing */
    `<g transform="rotate(12 ${bx + 26} ${y + 20})">
       <path d="M${bx + 16} ${y + 10} a11 15 0 0 0 20 0 l0 16 l-20 0 z" fill="${C.body}"/>
       <circle cx="${bx + 21}" cy="${y + 14}" r="2.6" fill="${C.canMetal}" opacity="0.8"/>
       <circle cx="${bx + 31}" cy="${y + 14}" r="2.6" fill="${C.canMetal}" opacity="0.8"/>
     </g>`
  );
}

function brokenKeys(x) {
  /* two keys off the keyboard and lying beside it, with the gaps they came
     from. The fault is the picture; whether it was REPORTED is what a tag would
     settle, and in scene 3 there is no tag. */
  const cx = x + SW / 2, y = BENCH - 12, w = 112;
  return g(
    `<rect x="${cx - w / 2 + 30}" y="${y + 5}" width="9" height="4.4" rx="1.4" fill="${C.bodyDark}"/>`,
    `<rect x="${cx - w / 2 + 41.6}" y="${y + 5}" width="9" height="4.4" rx="1.4" fill="${C.bodyDark}"/>`,
    `<rect x="${cx - w / 2 + 30}" y="${y + 11.4}" width="9" height="4.4" rx="1.4" fill="${C.bodyDark}"/>`,
    shadow(cx + 20, BENCH + 8, 22, 3.5, 0.22),
    `<rect x="${cx + 4}" y="${BENCH + 1}" width="14" height="12" rx="2.5" transform="rotate(18 ${cx + 11} ${BENCH + 7})" fill="${C.keyHi}"/>`,
    `<rect x="${cx + 24}" y="${BENCH + 3}" width="14" height="12" rx="2.5" transform="rotate(-24 ${cx + 31} ${BENCH + 9})" fill="${C.keyHi}"/>`,
    `<rect x="${cx + 44}" y="${BENCH}" width="14" height="12" rx="2.5" transform="rotate(6 ${cx + 51} ${BENCH + 6})" fill="${C.key}"/>`
  );
}

function reportedTag(x) {
  /* THE LOOKS-WRONG-BUT-ISN'T PIECE (his K11d stretch beat). A fault that HAS
     been reported is a station keeping the rules, not breaking them — the rule
     is "report any technical issue to your teacher", and this one did. The tag
     is a real luggage-style label taped to the bezel. It is 92px wide, because
     the first cut was 58 and clipped its own word in half, and the whole
     judgement turns on reading it. */
  const cx = x + SW / 2, top = BENCH - 136;
  const tx = cx - 22, tw = 92;
  return g(
    `<path d="M${tx} ${top + 10} l${tw} 0 l14 14 l-14 14 l-${tw} 0 z" fill="#E8963C"/>`,
    `<path d="M${tx} ${top + 10} l${tw} 0 l14 14 l-14 14 l-${tw} 0 z" fill="none" stroke="#A85E1B" stroke-width="1.5"/>`,
    `<circle cx="${tx + tw + 6}" cy="${top + 24}" r="3" fill="#2A1502" opacity="0.5"/>`,
    `<text x="${tx + tw / 2}" y="${top + 29}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"` +
      ` font-size="13" font-weight="700" letter-spacing="0.6" fill="#2A1502">REPORTED</text>`
  );
}

function crisps(x) {
  /* a crisp packet tucked in BEHIND the monitor — the food rule, staged so it
     has to be looked for rather than seen. It is subtle because of WHERE it is,
     never because it is drawn small: 46 x 52, the same size class as the can. */
  const cx = x + SW / 2, y = BENCH - 46;
  return g(
    `<path d="M${cx - 84} ${y - 4} l34 -9 l16 46 l-34 11 z" fill="#3E7BC4"/>`,
    `<path d="M${cx - 84} ${y - 4} l11 -3 l16 48 l-11 3 z" fill="#5E9AE0" opacity="0.7"/>`,
    `<path d="M${cx - 51} ${y - 14} l9 -7 l5 12 z" fill="#3E7BC4"/>`,
    `<rect x="${cx - 78}" y="${y + 12}" width="26" height="7" rx="3.5" transform="rotate(-15 ${cx - 65} ${y + 15})" fill="#F1E8D4" opacity="0.9"/>`
  );
}

function bagOnChair(x) {
  /* a school bag dumped on the seat: the tidy-your-area rule, and the reason
     the chair could not be pushed in */
  const cx = x + SW / 2, y = FRONT + 44;
  return g(
    `<rect x="${cx - 34}" y="${y}" width="68" height="46" rx="10" fill="#2E4A63"/>`,
    `<rect x="${cx - 34}" y="${y + 18}" width="68" height="12" fill="#22384B"/>`,
    `<path d="M${cx - 22} ${y} q22 -26 44 0" stroke="#22384B" stroke-width="6" fill="none"/>`,
    `<rect x="${cx - 10}" y="${y + 30}" width="20" height="9" rx="3" fill="#8C9298"/>`
  );
}

function looseStick(x) {
  /* A MEMORY STICK LEFT ON THE BENCH, cap off beside it. It was first drawn as
     a stick left "in the machine's front port" — and the scene draws monitors,
     not towers, so the picture could not keep that claim (rule 35). What is
     drawn is what is said: something of hers left behind on the bench. */
  const cx = x + SW / 2;
  return g(
    shadow(cx - 64, BENCH + 8, 26, 3.5, 0.24),
    `<rect x="${cx - 86}" y="${BENCH - 2}" width="38" height="15" rx="3" fill="${C.copper}"/>`,
    `<rect x="${cx - 86}" y="${BENCH - 2}" width="38" height="4" rx="2" fill="${C.copperHi}" opacity="0.7"/>`,
    `<rect x="${cx - 50}" y="${BENCH + 1}" width="14" height="9" rx="2" fill="${C.canMetal}"/>`,
    `<rect x="${cx - 30}" y="${BENCH + 2}" width="13" height="11" rx="3" fill="${C.bodyDark}"/>`
  );
}

function tray(x) {
  /* a labelled kit tray, squared up on the bench to the LEFT of the keyboard —
     the picture of "this station was tidied" */
  const cx = x + SW / 2;
  return g(
    shadow(cx - 66, BENCH + 1, 26, 4, 0.28),
    `<rect x="${cx - 92}" y="${BENCH - 27}" width="52" height="27" rx="3" fill="${C.bodyHi}"/>`,
    `<rect x="${cx - 92}" y="${BENCH - 27}" width="52" height="8" rx="3" fill="${C.copper}" opacity="0.8"/>`,
    `<rect x="${cx - 85}" y="${BENCH - 14}" width="38" height="4" rx="2" fill="${C.bodyDark}" opacity="0.45"/>`,
    `<rect x="${cx - 85}" y="${BENCH - 7}" width="26" height="4" rx="2" fill="${C.bodyDark}" opacity="0.3"/>`
  );
}

/* ---------------- the room ------------------------------------------------ */
function roomSign() {
  /* HIS SECOND FINDING AT THE K9 GATE: "the board with the tools on it looks
     like its something you'd find in technology room, not ICT, so replace it
     with a sign that says 'ICT Room'." He is right, and it is rule 138.1.6 —
     true to the room she is actually sitting in. A pegboard hung with spanners
     is a workshop; this is an ICT suite.
     His wording is used exactly as he wrote it. The sign is a mounted plate
     with its own frame and two fixings, so it reads as a thing screwed to a
     wall rather than as a caption floating on it — and it gives nothing away:
     it names the room, it never names a rule. */
  const x = 678, y = 58, w = 206, h = 70;
  return g(
    shadow(x + w / 2, y + h + 8, w * 0.44, 6, 0.3),
    `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="6" fill="${C.bodyDark}"/>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#E3D6BC"/>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="none" stroke="${C.copperDeep}" stroke-width="3"/>`,
    `<rect x="${x + 10}" y="${y + h - 16}" width="${w - 20}" height="3" rx="1.5" fill="${C.copperDeep}" opacity="0.55"/>`,
    `<text x="${x + w / 2}" y="${y + 45}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"` +
      ` font-size="30" font-weight="700" letter-spacing="1" fill="#2A1502">ICT Room</text>`,
    `<circle cx="${x + 10}" cy="${y + 10}" r="3.2" fill="${C.steel}"/>`,
    `<circle cx="${x + w - 10}" cy="${y + 10}" r="3.2" fill="${C.steel}"/>`,
    `<circle cx="${x + 10}" cy="${y + h - 10}" r="3.2" fill="${C.steel}"/>`,
    `<circle cx="${x + w - 10}" cy="${y + h - 10}" r="3.2" fill="${C.steel}"/>`
  );
}

function room() {
  return g(
    /* strip light over the bench, and the warm pool it throws */
    `<rect x="180" y="14" width="640" height="12" rx="4" fill="${C.bodyHi}"/>`,
    `<rect x="196" y="26" width="608" height="7" rx="3" fill="${C.glow}" opacity="0.85"/>`,
    `<ellipse cx="500" cy="150" rx="470" ry="150" fill="${C.glow}" opacity="0.055"/>`,
    /* window, with a cold pane and a sill */
    `<rect x="70" y="56" width="214" height="128" rx="3" fill="${C.bodyDark}"/>`,
    `<rect x="78" y="64" width="198" height="112" rx="2" fill="#5A6B78" opacity="0.30"/>`,
    `<rect x="78" y="64" width="198" height="52" rx="2" fill="#8FA6B6" opacity="0.16"/>`,
    `<rect x="176" y="64" width="6" height="112" fill="${C.bodyDark}"/>`,
    `<rect x="78" y="116" width="198" height="6" fill="${C.bodyDark}"/>`,
    `<rect x="62" y="184" width="230" height="9" rx="3" fill="${C.benchEdge}"/>`,
    roomSign(),
    /* clock */
    shadow(452, 116, 34, 6, 0.25),
    `<circle cx="452" cy="98" r="33" fill="${C.bodyDark}"/>`,
    `<circle cx="452" cy="98" r="26" fill="${C.paper}" opacity="0.92"/>`,
    `<path d="M452 98 L452 80 M452 98 L465 104" stroke="${C.bodyDark}" stroke-width="3" stroke-linecap="round"/>`,
    `<circle cx="452" cy="98" r="2.6" fill="${C.can}"/>`
  );
}

function bench() {
  let legs = '';
  [36, 496, 950].forEach(lx => {
    legs += `<rect x="${lx}" y="${FRONT + 7}" width="16" height="${FLOOR - FRONT - 7}" fill="${C.benchLeg}"/>
      <rect x="${lx}" y="${FRONT + 7}" width="5" height="${FLOOR - FRONT - 7}" fill="${C.benchLegHi}"/>`;
  });
  return g(
    `<rect y="${BENCH}" width="${W}" height="${DESK_D}" fill="url(#benchgrad)"/>`,
    `<rect y="${BENCH}" width="${W}" height="4" fill="${C.benchTopHi}" opacity="0.85"/>`,
    `<rect y="${FRONT}" width="${W}" height="9" fill="${C.benchEdge}"/>`,
    `<rect y="${FRONT + 9}" width="${W}" height="4" fill="${C.benchShade}" opacity="0.8"/>`,
    legs
  );
}

/* ---------------- assembly ------------------------------------------------ */
function station(i, spec) {
  const x = i * SW;
  return `    <g class="stn stn-${i}">
      ${chair(x, spec.chair)}
      ${spec.bag ? bagOnChair(x) : ''}
      ${spec.crisps ? crisps(x) : ''}
      ${spec.cable ? looseCable(x, 'back') : ''}
      ${monitor(x, spec.screen, spec)}
      ${spec.tray ? tray(x) : ''}
      ${keyboard(x, spec)}
      ${spec.can ? can(x) : ''}
      ${spec.bottle ? bottle(x, spec.bottleSide) : ''}
      ${spec.cable ? looseCable(x, 'front') : ''}
      ${spec.brokenKeys ? brokenKeys(x) : ''}
      ${spec.stick ? looseStick(x) : ''}
            ${spec.clutter ? clutter(x) : ''}
      ${spec.reported ? reportedTag(x) : ''}
    </g>`;
}

function scene(spec) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${spec.alt}">
  <defs>
    <linearGradient id="wallgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.wallTop}"/><stop offset="0.62" stop-color="${C.wallMid}"/><stop offset="1" stop-color="${C.wallBot}"/>
    </linearGradient>
    <linearGradient id="benchgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.benchTopHi}"/><stop offset="1" stop-color="${C.benchTop}"/>
    </linearGradient>
    <linearGradient id="floorgrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.floorHi}"/><stop offset="1" stop-color="${C.floor}"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.42" r="0.78">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.42"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wallgrad)"/>
  <rect y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="url(#floorgrad)"/>
  <rect y="${FLOOR - 5}" width="${W}" height="7" fill="${C.skirt}"/>
  ${room()}
  ${bench()}
${spec.stations.map((s, i) => station(i, s)).join('\n')}
  <rect width="${W}" height="${H}" fill="url(#vig)" pointer-events="none"/>
</svg>`;
}

/* SCENE 1 — the obvious end of the ramp (design chunk 3: "Four scenes ramp
   obvious -> subtle"). Three staged violations, each breaking a DIFFERENT one
   of his six real DT-room rules, each drawn as a whole recognisable object; two
   stations that are genuinely fine, so "flag everything" is not a strategy. */
/* ---------------- THE FIVE SCENES -----------------------------------------
   They ramp OBVIOUS -> SUBTLE, and the ramp lives in what is STAGED and where,
   never in how small anything is drawn (DFM 207d: "pixel size proves size,
   never visibility"). Every violation object clears the same legibility floor
   in every scene — qa-inspect-scene measures them.

   ACROSS THE FOUR MAIN SCENES, all five visualisable DT rules land at least
   once (the sixth, lining up outside, happens before she is in the room and is
   covered on the briefing card instead):
     food and drink        scene 1 (can) · scene 2 (bottle) · scene 4 (crisps)
     sign out              scene 1 · scene 3 · scene 4
     tidy your area        scene 1 · scene 2 (bag) · scene 3 (kit out)
     respect the equipment scene 2 (lead pulled out)
     report a fault        scene 3 (keys off, no tag) — and scene 5's trap
*/
const ALT_HEAD = 'A school ICT room bench with five computer stations. ';

const SCENES = [
  {
    file: 'inspection-1.svg',
    alt: ALT_HEAD + 'One station has a drink can standing beside the keyboard. One has a ' +
      'screen still signed in with somebody\u2019s work open. One has headphones, papers and a ' +
      'memory stick left out and its chair pushed back. The other two are tidy, with their ' +
      'screens off and their chairs in.',
    stations: [
      /* A TIDY STATION IS SAID BY NOTHING BEING THERE. An earlier cut put a kit
         tray here to "show tidy", and a box left on a bench is exactly what
         station 4 is flagged for, so the picture argued with itself. */
      { screen: 'off', chair: 'in' },
      { screen: 'off', chair: 'in', can: true },
      { screen: 'on', chair: 'in' },
      { screen: 'off', chair: 'out', clutter: true },
      { screen: 'off', chair: 'in' }
    ]
  },
  {
    file: 'inspection-2.svg',
    alt: ALT_HEAD + 'One station has a sports bottle of juice standing beside the keyboard. One has ' +
      'a lead pulled out of the back of the machine and hanging down underneath it. One has a bag ' +
      'dumped on its chair, which is pushed back. The other two are tidy, with their screens ' +
      'off and their chairs in.',
    stations: [
      { screen: 'off', chair: 'in' },
      { screen: 'off', chair: 'in', bottle: true, bottleSide: 'left' },
      { screen: 'off', chair: 'in', cable: true },
      { screen: 'off', chair: 'out', bag: true },
      { screen: 'off', chair: 'in' }
    ]
  },
  {
    file: 'inspection-3.svg',
    alt: ALT_HEAD + 'One station has two keys off its keyboard, lying beside it, with nothing ' +
      'on the machine to say so. One has a screen still signed in with somebody\u2019s work ' +
      'open. The other three are tidy, with their screens off and their chairs in.',
    stations: [
      { screen: 'off', chair: 'in' },
      { screen: 'off', chair: 'in', brokenKeys: true },
      { screen: 'off', chair: 'in' },
      { screen: 'on', chair: 'in' },
      { screen: 'off', chair: 'in' }
    ]
  },
  {
    file: 'inspection-4.svg',
    alt: ALT_HEAD + 'One station is lit and showing its sign-in box, with nobody\u2019s work on ' +
      'it. One has a crisp packet tucked in behind the monitor. One has a screen still signed ' +
      'in with somebody\u2019s work open. The other two are tidy, with their screens off.',
    stations: [
      { screen: 'login', chair: 'in' },
      { screen: 'off', chair: 'in' },
      { screen: 'off', chair: 'in', crisps: true },
      { screen: 'off', chair: 'in' },
      { screen: 'on', chair: 'in' }
    ]
  },
  {
    /* SCENE 5 — "The Hard Inspection", his K11d stretch beat. One station LOOKS
       wrong and is fine: its mouse is broken and a REPORTED tag is taped to the
       monitor, so the rule about reporting a fault was kept, not broken. */
    file: 'inspection-5.svg',
    alt: ALT_HEAD + 'One station has a cracked screen with a REPORTED tag taped to its monitor. ' +
      'One has a crisp packet tucked in behind the monitor. One is completely tidy except that ' +
      'its screen is still signed in. One has a memory stick left in the machine\u2019s front ' +
      'port. The first station is tidy with its screen off.',
    stations: [
      { screen: 'off', chair: 'in' },
      { screen: 'off', chair: 'in', cracked: true, reported: true },
      { screen: 'off', chair: 'in', crisps: true },
      { screen: 'on', chair: 'in' },
      { screen: 'off', chair: 'in', stick: true }
    ]
  }
];

SCENES.forEach(sc => {
  fs.writeFileSync(path.join(OUT, sc.file), scene(sc));
  console.log('wrote ' + sc.file + '  (' + W + 'x' + H + ', ' + sc.stations.length + ' stations)');
});

/* the old single-scene write, kept out of the way */
