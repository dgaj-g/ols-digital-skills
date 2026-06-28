/* ============================================================
   Cluichí Gaelacha (the five Gaelic games) — content pack
   ------------------------------------------------------------
   The 5 GAA games from Róisín Morgan's recordings, each with her
   native-Irish audio, a Wikimedia Commons photograph, a pupil
   pronunciation guide and a short descriptor — all verified
   against Teanglann / Foclóir.ie and official GAA sources.
   ============================================================ */

const GAMES = [
  {
    slug: 'camogaiocht', irish: 'Camógaíocht', english: 'Camogie', pron: 'kam-OHG-ee-okht',
    descriptor: 'Camogie is hurling played by women, with a camán and a sliotar.',
    img: 'assets/img/camogaiocht.jpg', audio: 'assets/audio/camogaiocht.m4a'
  },
  {
    slug: 'cluiche-corr', irish: 'Cluiche Corr', english: 'Rounders', pron: 'KLIH-heh KORR',
    descriptor: 'Rounders: hit the ball with a bat and run round the bases to score.',
    img: 'assets/img/cluiche-corr.jpg', audio: 'assets/audio/cluiche-corr.m4a'
  },
  {
    slug: 'iomanaiocht', irish: 'Iománaíocht', english: 'Hurling', pron: 'um-AWN-ee-okht',
    descriptor: 'Hurling is a fast stick-and-ball game, played with a camán and a sliotar.',
    img: 'assets/img/iomanaiocht.jpg', audio: 'assets/audio/iomanaiocht.m4a'
  },
  {
    slug: 'liathroid-laimhe', irish: 'Liathróid láimhe', english: 'Handball', pron: 'LEE-uh-rohj LAW-iv-eh',
    descriptor: 'Gaelic handball: hitting a small ball off a wall with a gloved hand.',
    img: 'assets/img/liathroid-laimhe.jpg', audio: 'assets/audio/liathroid-laimhe.m4a'
  },
  {
    slug: 'peil-ghaelach', irish: 'Peil Ghaelach', english: 'Gaelic football', pron: 'pell GHAY-lokh',
    descriptor: 'Gaelic football: kick and hand-pass a round ball into the goal or over the bar.',
    img: 'assets/img/peil-ghaelach.jpg', audio: 'assets/audio/peil-ghaelach.m4a'
  }
];

/* Wikimedia Commons attribution. All photographs cropped to a square for the activity.
   Shown in-activity via the "Image credits" panel and in assets/CREDITS.md. */
const CREDITS = [
  { what: 'Camógaíocht (camogie)',       who: 'MaxPride',                     lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Camogie.jpg' },
  { what: 'Cluiche Corr (rounders)',     who: 'Milzo1986',                    lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:GAA_Rounders_Match_Wolfe_Tones_(Antrim)_v_Kilrea_(Derry).jpg' },
  { what: 'Iománaíocht (hurling)',       who: 'Peter Mooney',                 lic: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/wiki/File:Killyon_vrs_Longwood_-_Meath_Senior_Hurling_Championship_2011_(5849122734).jpg' },
  { what: 'Liathróid láimhe (handball)', who: 'Jeff Kastner',                 lic: 'CC BY 2.5',    url: 'https://commons.wikimedia.org/wiki/File:Healy-alvarado.png' },
  { what: 'Peil Ghaelach (Gaelic football)', who: 'Irish Defence Forces',     lic: 'CC BY 2.0',    url: 'https://commons.wikimedia.org/wiki/File:DF_GAA_Football_Final_(4993136271).jpg' },
  { what: 'Celtic knot, triquetra & Newgrange triple-spiral motifs', who: 'AnonMoos and others, Wikimedia Commons', lic: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Triple-Spiral-Symbol.svg' }
];
