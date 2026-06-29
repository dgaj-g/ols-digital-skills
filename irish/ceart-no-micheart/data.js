/* Ceart nó Mícheart? — verified content pack
 * Issue dgaj-g/ols-digital-skills-inbox#31 (J3 Irish — Tíortha/Countries + Contaetha/Counties)
 *
 * Sources:
 *  - Country flags: public-domain SVGs from Wikimedia Commons (assets/flags/), each
 *    independently verified as the correct, current standard national flag.
 *  - County colours: official GAA county colours, verified high-confidence against the
 *    Wikipedia "County colours (Gaelic games)" table, county GAA boards and O'Neills kits.
 *  - Irish names + pronunciation audio (assets/audio/): recorded by R. Morgan.
 *  - On-screen Irish spellings corrected to logainm.ie / standard forms where the supplied
 *    list differed (flagged in the PR): An Tuirc, Loch Garman, Tiobraid Árann.
 */

window.AUDIO_DIR = 'assets/audio/';
window.FLAG_DIR = 'assets/flags/';

/* ---- COUNTRIES: Irish name <-> national flag ----
 * confuse = other countries whose flag is visually confusable (used to make "wrong"
 * cards genuinely misleading rather than obviously off). Falls back to any other flag.
 * NOTE: confuse is read SUBJECT-side only by pickDistractor() — it need not be mutual,
 * but the strong look-alike pairs below are kept mutual so a flag is equally tricky
 * whichever country is the subject. Each entry is a true colour look-alike, so a pupil
 * cannot tell a "wrong" card from colour-vibe alone — they must know the Irish name.
 */
window.COUNTRIES = [
  { slug: 'albain',            irish: 'Albain',              english: 'Scotland',    flag: 'scotland.svg',    confuse: ['an-ghreig'] },
  { slug: 'an-astrail',        irish: 'An Astráil',          english: 'Australia',   flag: 'australia.svg',   confuse: ['meiricea'] },
  { slug: 'an-bheilg',         irish: 'An Bheilg',           english: 'Belgium',     flag: 'belgium.svg',     confuse: ['an-ghearmain'] },
  { slug: 'an-bhreatain-bheag',irish: 'An Bhreatain Bheag',  english: 'Wales',       flag: 'wales.svg',       confuse: ['an-iodail', 'eire'] },
  { slug: 'an-eilveis',        irish: 'An Eilvéis',          english: 'Switzerland', flag: 'switzerland.svg', confuse: ['an-tuirc'], square: true },
  { slug: 'an-fhrainc',        irish: 'An Fhrainc',          english: 'France',      flag: 'france.svg',      confuse: ['an-isiltir'] },
  { slug: 'an-ghearmain',      irish: 'An Ghearmáin',        english: 'Germany',     flag: 'germany.svg',     confuse: ['an-bheilg'] },
  { slug: 'an-ghreig',         irish: 'An Ghréig',           english: 'Greece',      flag: 'greece.svg',      confuse: ['albain'] },
  { slug: 'an-iodail',         irish: 'An Iodáil',           english: 'Italy',       flag: 'italy.svg',       confuse: ['eire'] },
  { slug: 'an-isiltir',        irish: 'An Ísiltír',          english: 'Netherlands', flag: 'netherlands.svg', confuse: ['an-fhrainc'] },
  { slug: 'an-ostair',         irish: 'An Ostair',           english: 'Austria',     flag: 'austria.svg',     confuse: ['an-spainn'] },
  { slug: 'an-spainn',         irish: 'An Spáinn',           english: 'Spain',       flag: 'spain.svg',       confuse: ['an-ostair'] },
  { slug: 'an-tuirc',          irish: 'An Tuirc',            english: 'Turkey',      flag: 'turkey.svg',      confuse: ['an-eilveis'] },
  { slug: 'eire',              irish: 'Éire',                english: 'Ireland',     flag: 'ireland.svg',     confuse: ['an-iodail'] },
  { slug: 'meiricea',          irish: 'Meiriceá',            english: 'America (USA)', flag: 'usa.svg',       confuse: ['an-astrail'] },
  { slug: 'sasana',            irish: 'Sasana',              english: 'England',     flag: 'england.svg',     confuse: ['an-eilveis'] }
];

/* ---- COUNTIES: Irish name <-> authentic GAA county flag ----
 * Each county is the real "county colours" flag, verified against Wikipedia / Wikimedia
 * Commons / Flags-of-the-World. The GAA norm is a VERTICAL bicolour with the primary
 * colour at the hoist (left); a few counties fly a horizontal flag.
 *   c1 = hoist (left) colour, or TOP colour for horizontal flags
 *   c2 = fly (right) colour, or BOTTOM colour for horizontal flags
 *   orient: 'v' = vertical halves (default GAA layout) · 'h' = horizontal halves
 *   cluster = counties sharing the SAME colour pair; a "wrong" county card NEVER pairs a
 *             county with a colour-twin from its own cluster (that would be unfair).
 * Notes: Dublin (navy over sky) and Mayo (green over red) are flown horizontally — the
 * most commonly flown layout is used. Derry's hoist colour is debated (vexillology says
 * white-hoist, supporters' flags red-hoist); red-hoist used here. Kerry & Donegal are
 * both green-hoist/gold-fly, so their flags are genuinely near-identical (their cluster
 * keeps them from ever being paired as a "wrong" answer).
 */
window.COUNTIES = [
  { slug: 'an-cabhan',        irish: 'An Cabhán',         english: 'Cavan',     c1: '#1B449C', c2: '#FFFFFF', orient: 'v', cluster: 'blue-white' },
  { slug: 'an-dun',           irish: 'An Dún',            english: 'Down',      c1: '#C8102E', c2: '#111111', orient: 'v', cluster: 'red-black' },
  { slug: 'aontroim',         irish: 'Aontroim',          english: 'Antrim',    c1: '#F4C430', c2: '#FFFFFF', orient: 'v', cluster: 'saffron-white' },
  { slug: 'ard-mhacha',       irish: 'Ard Mhacha',        english: 'Armagh',    c1: '#FF6600', c2: '#FFFFFF', orient: 'v', cluster: 'orange-white' },
  { slug: 'baile-atha-cliath',irish: 'Baile Átha Cliath', english: 'Dublin',    c1: '#0A1F44', c2: '#6CADDF', orient: 'h', cluster: 'skyblue-navy' },
  { slug: 'ciarrai',          irish: 'Ciarraí',           english: 'Kerry',     c1: '#006B3C', c2: '#FFD200', orient: 'v', cluster: 'green-gold' },
  { slug: 'cill-mhantain',    irish: 'Cill Mhantáin',     english: 'Wicklow',   c1: '#1B449C', c2: '#FFD200', orient: 'v', cluster: 'blue-gold' },
  { slug: 'corcaigh',         irish: 'Corcaigh',          english: 'Cork',      c1: '#C8102E', c2: '#FFFFFF', orient: 'v', cluster: 'red-white' },
  { slug: 'doire',            irish: 'Doire',             english: 'Derry',     c1: '#C8102E', c2: '#FFFFFF', orient: 'v', cluster: 'red-white' },
  { slug: 'dun-na-ngall',     irish: 'Dún na nGall',      english: 'Donegal',   c1: '#006B3C', c2: '#FFD200', orient: 'v', cluster: 'green-gold' },
  { slug: 'fear-manach',      irish: 'Fear Manach',       english: 'Fermanagh', c1: '#006B3C', c2: '#FFFFFF', orient: 'v', cluster: 'green-white' },
  { slug: 'gaillimh',         irish: 'Gaillimh',          english: 'Galway',    c1: '#7A1F2B', c2: '#FFFFFF', orient: 'v', cluster: 'maroon-white' },
  { slug: 'loch-gorman',      irish: 'Loch Garman',       english: 'Wexford',   c1: '#582C83', c2: '#FFD200', orient: 'v', cluster: 'purple-gold' },
  { slug: 'luimneach',        irish: 'Luimneach',         english: 'Limerick',  c1: '#006B3C', c2: '#FFFFFF', orient: 'v', cluster: 'green-white' },
  { slug: 'maigh-eo',         irish: 'Maigh Eo',          english: 'Mayo',      c1: '#006B3C', c2: '#C8102E', orient: 'h', cluster: 'green-red' },
  { slug: 'muineachan',       irish: 'Muineachán',        english: 'Monaghan',  c1: '#1B449C', c2: '#FFFFFF', orient: 'v', cluster: 'blue-white' },
  { slug: 'port-lairge',      irish: 'Port Láirge',       english: 'Waterford', c1: '#FFFFFF', c2: '#1B449C', orient: 'v', cluster: 'blue-white' },
  { slug: 'sligeach',         irish: 'Sligeach',          english: 'Sligo',     c1: '#111111', c2: '#FFFFFF', orient: 'v', cluster: 'black-white' },
  { slug: 'tiobraid-arainn',  irish: 'Tiobraid Árann',    english: 'Tipperary', c1: '#1B449C', c2: '#FFD200', orient: 'v', cluster: 'blue-gold' }
];
