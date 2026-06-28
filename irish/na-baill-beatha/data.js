/* ============================================================
   Na Baill Beatha — Dochtúir na bhFuaimeanna / The Sound Doctor
   Vocabulary data for Year 9 (J2) CCEA Irish.

   Each PART maps a teacher-recorded word to a region (or two
   regions, for paired body parts) on the inline SVG figure.
   - slug:   ASCII id, matches assets/audio/<slug>.m4a AND the
             data-slug on the SVG region group(s).
   - ga:     Irish (with fadas) — revealed only AFTER a correct
             (or missed) round, never before. Never leaks.
   - en:     English gloss.
   - side:   'front' | 'back'  (back parts need the figure flipped)
   - paired: true if two regions on the body both count (ears, eyes…)
   - ward:   1 (clear) | 2 (fiddly face/joints) | 3 (hard + back)

   PLURALS is a ready-to-switch-on extension: the engine probes for
   each plural's audio file and only enables the plural tier if the
   recordings exist (the teacher has only recorded the 24 singulars
   so far). Tapping BOTH paired regions is required for a plural.
   ============================================================ */

const PARTS = [
  /* ---- Ward 1 — An Aghaidh / the face (camera zooms to the head) ---- */
  { slug: 'ceann', ga: 'Ceann',  en: 'head',  side: 'front', paired: false, ward: 1 },
  { slug: 'suil',  ga: 'Súil',   en: 'eye',   side: 'front', paired: true,  ward: 1 },
  { slug: 'sron',  ga: 'Srón',   en: 'nose',  side: 'front', paired: false, ward: 1 },
  { slug: 'cluas', ga: 'Cluas',  en: 'ear',   side: 'front', paired: true,  ward: 1 },
  { slug: 'smig',  ga: 'Smig',   en: 'chin',  side: 'front', paired: false, ward: 1 },

  /* ---- Ward 2 — An Béal agus an Muineál / mouth & neck (zooms closer) ---- */
  { slug: 'beal',     ga: 'Béal',     en: 'mouth',  side: 'front', paired: false, ward: 2 },
  { slug: 'liopai',   ga: 'Liopaí',   en: 'lips',   side: 'front', paired: false, ward: 2 },
  { slug: 'fiacail',  ga: 'Fiacail',  en: 'tooth',  side: 'front', paired: false, ward: 2 },
  { slug: 'teanga',   ga: 'Teanga',   en: 'tongue', side: 'front', paired: false, ward: 2 },
  { slug: 'muineal',  ga: 'Muinéal',  en: 'neck',   side: 'front', paired: false, ward: 2 },
  { slug: 'scornach', ga: 'Scornach', en: 'throat', side: 'front', paired: false, ward: 2 },

  /* ---- Ward 3 — An Lámh agus an Sciathán / arm & hand (zooms to the arm) ---- */
  { slug: 'gualainn', ga: 'Gualainn', en: 'shoulder', side: 'front', paired: true, ward: 3 },
  { slug: 'sciathan', ga: 'Sciathán', en: 'arm',      side: 'front', paired: true, ward: 3 },
  { slug: 'uillinn',  ga: 'Uillinn',  en: 'elbow',    side: 'front', paired: true, ward: 3 },
  { slug: 'caol-na-laimhe', ga: 'Caol na láimhe', en: 'wrist', side: 'front', paired: true, ward: 3 },
  { slug: 'lamh',  ga: 'Lámh',   en: 'hand',   side: 'front', paired: true, ward: 3 },
  { slug: 'mear',  ga: 'Méar',   en: 'finger', side: 'front', paired: true, ward: 3 },
  { slug: 'ordog', ga: 'Ordóg',  en: 'thumb',  side: 'front', paired: true, ward: 3 },

  /* ---- Ward 4 — An Corp agus na Cosa / body & legs (+ cas thart for the back) ---- */
  { slug: 'bolg',   ga: 'Bolg',   en: 'stomach', side: 'front', paired: false, ward: 4 },
  { slug: 'cos',    ga: 'Cos',    en: 'foot / leg', side: 'front', paired: true, ward: 4 },
  { slug: 'gluin',  ga: 'Glúin',  en: 'knee',    side: 'front', paired: true,  ward: 4 },
  { slug: 'ruitin', ga: 'Rúitín', en: 'ankle',   side: 'front', paired: true,  ward: 4 },
  { slug: 'droim',  ga: 'Droim',  en: 'back',    side: 'back',  paired: false, ward: 4 },
  { slug: 'toin',   ga: 'Tóin',   en: 'bottom',  side: 'back',  paired: false, ward: 4 },
];

/* zone = {x,y,w,h} bounding box in the SVG viewBox (0 0 420 905) user units.
   The engine tweens the live viewBox to this box so the ward's parts fill a
   square stage (letterboxed) — large + tappable, yet still several options
   per zone so listening (not eyeballing) is what wins. */
const WARDS = [
  { n: 1, ga: 'An Aghaidh', en: 'The face',     sub: 'Éist agus aimsigh · Listen and find',              zone: { x: 66,  y: 40,  w: 288, h: 288 } },
  { n: 2, ga: 'An Béal',    en: 'Mouth & neck', sub: 'Na baill bheaga · The small parts',                zone: { x: 108, y: 188, w: 204, h: 204 } },
  { n: 3, ga: 'An Lámh',    en: 'Arm & hand',   sub: 'Ón ghualainn go dtí an ordóg · Shoulder to thumb', zone: { x: 48,  y: 348, w: 324, h: 324 } },
  { n: 4, ga: 'An Corp',    en: 'Body & legs',  sub: 'Cas thart don droim! · Turn over for the back',    zone: { x: -60, y: 352, w: 540, h: 540 } },
];

const OVERVIEW_ZONE = { x: 0,   y: 0,   w: 420, h: 905 };
const BACK_ZONE     = { x: -60, y: 320, w: 540, h: 540 };

/* Plural-discrimination extension. ASCII plural slug → expected audio file.
   Enabled per-item ONLY when assets/audio/<pluralSlug>.m4a is reachable.
   (Singular vocab above all have recordings; plurals are awaiting the
   teacher's clips, so this tier ships dormant and self-enables later.) */
const PLURALS = [
  { base: 'cluas', pluralSlug: 'cluasa', ga: 'Cluasa', en: 'ears' },
  { base: 'cos',   pluralSlug: 'cosa',   ga: 'Cosa',   en: 'feet / legs' },
  { base: 'fiacail', pluralSlug: 'fiacla', ga: 'Fiacla', en: 'teeth' },
  { base: 'mear',  pluralSlug: 'meara',  ga: 'Méara',  en: 'fingers' },
  { base: 'suil',  pluralSlug: 'suile',  ga: 'Súile',  en: 'eyes' },
  { base: 'lamh',  pluralSlug: 'lamha',  ga: 'Lámha',  en: 'hands' },
];

const AUDIO_DIR = 'assets/audio/';
