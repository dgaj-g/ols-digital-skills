/* ============================================================================
   Isotope Lab — verified content data
   CCEA GCSE Chemistry, Unit 1, Atomic Structure: Isotopes (1.1.10-1.1.12)
   Every value below is transcribed from Teresa Quigg's source files:
     - "Isotope Snap" handwritten brief  -> Data Bank 1 (Section 1)
     - "Data Set 2 for isotope digital exercise.pptx" -> mass-spec dataset
   Do not alter a number without checking it against those files.
   ============================================================================ */
(function (global) {
  'use strict';

  /* Periodic table Z 1-20 (covers every element used, H..Ca).
     shells = GCSE Bohr electron arrangement (2,8,8,2 model). */
  var ELEMENTS = {
    1:  { sym: 'H',  name: 'Hydrogen' },
    2:  { sym: 'He', name: 'Helium' },
    3:  { sym: 'Li', name: 'Lithium' },
    4:  { sym: 'Be', name: 'Beryllium' },
    5:  { sym: 'B',  name: 'Boron' },
    6:  { sym: 'C',  name: 'Carbon' },
    7:  { sym: 'N',  name: 'Nitrogen' },
    8:  { sym: 'O',  name: 'Oxygen' },
    9:  { sym: 'F',  name: 'Fluorine' },
    10: { sym: 'Ne', name: 'Neon' },
    11: { sym: 'Na', name: 'Sodium' },
    12: { sym: 'Mg', name: 'Magnesium' },
    13: { sym: 'Al', name: 'Aluminium' },
    14: { sym: 'Si', name: 'Silicon' },
    15: { sym: 'P',  name: 'Phosphorus' },
    16: { sym: 'S',  name: 'Sulfur' },
    17: { sym: 'Cl', name: 'Chlorine' },
    18: { sym: 'Ar', name: 'Argon' },
    19: { sym: 'K',  name: 'Potassium' },
    20: { sym: 'Ca', name: 'Calcium' }
  };

  /* symbol -> Z reverse lookup (used by the element-identification answer check) */
  var SYM_TO_Z = {};
  Object.keys(ELEMENTS).forEach(function (z) { SYM_TO_Z[ELEMENTS[z].sym.toLowerCase()] = Number(z); });

  /* GCSE electron-shell capacities, in order from the nucleus outward. */
  var SHELL_CAPACITY = [2, 8, 8, 2];

  /* Return the electron arrangement for a neutral atom of Z electrons,
     e.g. electronShells(20) -> [2,8,8,2]; electronShells(8) -> [2,6]. */
  function electronShells(z) {
    var out = [], left = z;
    for (var i = 0; i < SHELL_CAPACITY.length && left > 0; i++) {
      var n = Math.min(left, SHELL_CAPACITY[i]);
      out.push(n);
      left -= n;
    }
    return out;
  }

  /* Where each electron sits on a shell, following the teacher's clock
     convention (angles in radians, SVG-style: 12 o'clock = -PI/2, 3 = 0,
     6 = +PI/2, 9 = PI).
       - Inner shell (index 0): up to two single electrons, at 12 then 6.
       - Every other shell: fill 12, 3, 6, 9 as SINGLE electrons first, then
         add a second electron to each in the same order, so each clock
         position ends as a pair (drawn side-by-side).
     Returns an array of OCCUPIED positions: [{ ang, count }] where count is
     1 (single) or 2 (a pair). Shared by the 2D Bohr cards and the 3D atom. */
  function electronLayout(shellIndex, count) {
    var TWELVE = -Math.PI / 2, THREE = 0, SIX = Math.PI / 2, NINE = Math.PI;
    var out = [];
    if (shellIndex === 0) {
      var inner = [TWELVE, SIX];
      for (var i = 0; i < count && i < 2; i++) out.push({ ang: inner[i], count: 1 });
      return out;
    }
    var order = [TWELVE, THREE, SIX, NINE];
    var occ = [0, 0, 0, 0];
    for (var j = 0; j < count; j++) occ[j % 4]++;
    for (var k = 0; k < 4; k++) if (occ[k] > 0) out.push({ ang: order[k], count: occ[k] });
    return out;
  }

  /* ----- Data Bank 1: isotopes used in the Snap game (element Z -> mass numbers) --- */
  var SNAP_BANK = [
    { z: 1, masses: [1, 2, 3] },   // H
    { z: 2, masses: [3, 4] },      // He
    { z: 3, masses: [6, 7, 8] },   // Li
    { z: 5, masses: [10, 11] },    // B
    { z: 6, masses: [12, 13, 14] },// C
    { z: 7, masses: [14, 15] },    // N
    { z: 8, masses: [16, 17, 18] } // O
    /* Be (Z=4) intentionally absent: only one stable isotope, cannot form a pair. */
  ];

  /* Flatten the bank into a list of concrete isotopes used by the card engine. */
  var SNAP_ISOTOPES = [];
  SNAP_BANK.forEach(function (g) {
    g.masses.forEach(function (m) {
      SNAP_ISOTOPES.push({ z: g.z, mass: m, sym: ELEMENTS[g.z].sym, name: ELEMENTS[g.z].name });
    });
  });

  /* ----- Data Set 2: mass-spectrometry abundances ------------------------------
     For each element, the isotopes with their relative abundance (%).
     The % column is authoritative for the Ar calculation. Sample-size columns
     (A-D) from the PPTX are not needed for the calculation and are omitted. */
  var MASS_SPEC = {
    Li: { z: 3,  isotopes: [{ mass: 6, ab: 7 },  { mass: 7, ab: 93 }] },
    B:  { z: 5,  isotopes: [{ mass: 10, ab: 20 }, { mass: 11, ab: 80 }] },
    O:  { z: 8,  isotopes: [{ mass: 16, ab: 99.5 }, { mass: 18, ab: 0.5 }] },
    Ne: { z: 10, isotopes: [{ mass: 20, ab: 90 }, { mass: 21, ab: 0.5 }, { mass: 22, ab: 9.5 }] },
    Mg: { z: 12, isotopes: [{ mass: 24, ab: 79 }, { mass: 25, ab: 10 }, { mass: 26, ab: 11 }] },
    N:  { z: 7,  isotopes: [{ mass: 14, ab: 99 }, { mass: 15, ab: 1 }] },
    S:  { z: 16, isotopes: [{ mass: 32, ab: 94 }, { mass: 33, ab: 1 }, { mass: 34, ab: 4 }, { mass: 36, ab: 1 }] },
    Cl: { z: 17, isotopes: [{ mass: 35, ab: 75 }, { mass: 37, ab: 25 }] },
    Si: { z: 14, isotopes: [{ mass: 28, ab: 92 }, { mass: 29, ab: 5 }, { mass: 30, ab: 3 }] },
    K:  { z: 19, isotopes: [{ mass: 39, ab: 93 }, { mass: 40, ab: 0.5 }, { mass: 41, ab: 6.5 }] },
    Ca: { z: 20, isotopes: [{ mass: 40, ab: 96 }, { mass: 42, ab: 1 }, { mass: 44, ab: 3 }] }
  };

  /* Compute Ar from a mass-spec element record (weighted mean by abundance).
     Returns an object with the exact value and a rounded-to-1dp value. */
  function relativeAtomicMass(rec) {
    var top = 0, bot = 0;
    rec.isotopes.forEach(function (i) { top += i.mass * i.ab; bot += i.ab; });
    var ar = top / bot;
    return { exact: ar, rounded: Math.round(ar * 10) / 10, sumAbundance: bot };
  }

  global.ISO_DATA = {
    ELEMENTS: ELEMENTS,
    SYM_TO_Z: SYM_TO_Z,
    SHELL_CAPACITY: SHELL_CAPACITY,
    electronShells: electronShells,
    electronLayout: electronLayout,
    SNAP_BANK: SNAP_BANK,
    SNAP_ISOTOPES: SNAP_ISOTOPES,
    MASS_SPEC: MASS_SPEC,
    relativeAtomicMass: relativeAtomicMass
  };
})(typeof window !== 'undefined' ? window : this);
