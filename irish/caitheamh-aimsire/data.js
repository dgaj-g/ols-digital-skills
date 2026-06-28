/* ============================================================
   Caitheamh Aimsire (Pastimes) — content pack
   ------------------------------------------------------------
   13 pastimes from Roisín Morgan's Foclóir word list, each with
   the teacher's own native-Irish audio recording, a Wikimedia
   Commons photograph, and a pupil-friendly pronunciation guide
   verified against Teanglann / Foclóir.ie.
   ============================================================ */

/* The topic headword — heard on the title, not a quiz tile. */
const HEADWORD = {
  slug: 'caitheamh-aimsire',
  irish: 'Caitheamh Aimsire',
  english: 'Pastimes',
  pron: 'KAH-hiv AM-shir-eh',
  audio: 'assets/audio/caitheamh-aimsire.m4a'
};

const VOCAB = [
  { slug: 'cartai',            irish: 'Cártaí',            english: 'Cards',          pron: 'KAWR-tee',          img: 'assets/img/cartai.jpg',            audio: 'assets/audio/cartai.m4a' },
  { slug: 'ceolchoirm',        irish: 'Ceolchoirm',        english: 'A concert',      pron: 'KYOLE-khirrim',     img: 'assets/img/ceolchoirm.jpg',        audio: 'assets/audio/ceolchoirm.m4a' },
  { slug: 'cispheil',          irish: 'Cispheil',          english: 'Basketball',     pron: 'KISH-fell',         img: 'assets/img/cispheil.jpg',          audio: 'assets/audio/cispheil.m4a' },
  { slug: 'cluichi-riomhaire', irish: 'Cluichí ríomhaire', english: 'Computer games', pron: 'KLIH-hee REE-vir-eh', img: 'assets/img/cluichi-riomhaire.jpg', audio: 'assets/audio/cluichi-riomhaire.m4a' },
  { slug: 'damhsa-gaelach',    irish: 'Damhsa Gaelach',    english: 'Irish dancing',  pron: 'DOW-suh GWAY-lukh', img: 'assets/img/damhsa-gaelach.jpg',    audio: 'assets/audio/damhsa-gaelach.m4a' },
  { slug: 'dornalaiocht',      irish: 'Dornálaíocht',      english: 'Boxing',         pron: 'DOR-naw-lee-ukht',  img: 'assets/img/dornalaiocht.jpg',      audio: 'assets/audio/dornalaiocht.m4a' },
  { slug: 'ficheall',          irish: 'Ficheall',          english: 'Chess',          pron: 'FIH-hyal',          img: 'assets/img/ficheall.jpg',          audio: 'assets/audio/ficheall.m4a' },
  { slug: 'iascaireacht',      irish: 'Iascaireacht',      english: 'Fishing',        pron: 'EE-uss-kir-ukht',   img: 'assets/img/iascaireacht.jpg',      audio: 'assets/audio/iascaireacht.m4a' },
  { slug: 'leadog',            irish: 'Leadóg',            english: 'Tennis',         pron: 'LAD-ohg',           img: 'assets/img/leadog.jpg',            audio: 'assets/audio/leadog.m4a' },
  { slug: 'leamh',             irish: 'Léamh',             english: 'Reading',        pron: 'LAYV',              img: 'assets/img/leamh.jpg',             audio: 'assets/audio/leamh.m4a' },
  { slug: 'lionpheil',         irish: 'Líonpheil',         english: 'Netball',        pron: 'LEEN-fell',         img: 'assets/img/lionpheil.jpg',         audio: 'assets/audio/lionpheil.m4a' },
  { slug: 'reathaiocht',       irish: 'Reathaíocht',       english: 'Running',        pron: 'RAH-hee-ukht',      img: 'assets/img/reathaiocht.jpg',       audio: 'assets/audio/reathaiocht.m4a' },
  { slug: 'rothaiocht',        irish: 'Rothaíocht',        english: 'Cycling',        pron: 'ROH-hee-ukht',      img: 'assets/img/rothaiocht.jpg',        audio: 'assets/audio/rothaiocht.m4a' }
];

/* Wikimedia Commons attribution. All photographs are cropped to 4:3.
   Shown in-activity via the "Image credits" panel and in assets/CREDITS.md. */
const CREDITS = [
  { what: 'Cártaí (cards)',              who: 'Guts Gaming',            lic: 'CC BY 2.0',   url: 'https://commons.wikimedia.org/wiki/File:Flush_Poker_Hand_(Ace,_4,_7,_8_Queen_of_Hearts)_(14719980930).jpg' },
  { what: 'Ceolchoirm (concert)',        who: 'Shixart1985',            lic: 'CC BY 2.0',   url: 'https://commons.wikimedia.org/wiki/File:Enjoying_a_live_rock_concert_at_an_outdoor_venue_with_vibrant_lights_and_enthusiastic_fans.jpg' },
  { what: 'Cispheil (basketball)',       who: 'Sandro Halank',          lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:2018-10-07_Basketball_3x3_ROU_vs_GER_(Girls_Preliminary_Round)_at_2018_Summer_Youth_Olympics_by_Sandro_Halank%E2%80%93031.jpg' },
  { what: 'Cluichí ríomhaire (gaming)',  who: 'InclusiveGameLab',       lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Person_with_PS5_Controller_5.jpg' },
  { what: 'Damhsa Gaelach (Irish dance)', who: 'U.S. Army',             lic: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Irish_dancers_in_team_costume,_Davis_Academy,_USA.jpg' },
  { what: 'Dornálaíocht (boxing)',       who: 'U.S. Army (Spc. Donovon Lynch)', lic: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:U_S_Army_Soldiers_Trade_Punches_during_Boxing_Match_(7693793).jpg' },
  { what: 'Ficheall (chess)',            who: 'Wilfredor',              lic: 'CC0',         url: 'https://commons.wikimedia.org/wiki/File:Chess_game_Staunton_No._6.jpg' },
  { what: 'Iascaireacht (fishing)',      who: 'praimann (via Pixabay)', lic: 'CC0',         url: 'https://commons.wikimedia.org/wiki/File:Fly_fishing_in_Savinja_2010.jpg' },
  { what: 'Leadóg (tennis)',             who: 'Caspia Jackmanson',      lic: 'CC BY 4.0',   url: 'https://commons.wikimedia.org/wiki/File:Renee_Alame_Prepares_Her_Shot_PNG_Edited_260127_114302.png' },
  { what: 'Léamh (reading)',             who: 'Shixart1985',            lic: 'CC BY 2.0',   url: 'https://commons.wikimedia.org/wiki/File:Reading_a_book_indoors_during_a_quiet_afternoon.jpg' },
  { what: 'Líonpheil (netball)',         who: 'Samson Ssemakadde',      lic: 'CC0',         url: 'https://commons.wikimedia.org/wiki/File:Bika_netball_tournament_0F_2025.jpg' },
  { what: 'Reathaíocht (running)',       who: 'William Warby',          lic: 'CC BY 2.0',   url: 'https://commons.wikimedia.org/wiki/File:Heat_1_of_the_Womens_100m_Semi-Final.jpg' },
  { what: 'Rothaíocht (cycling)',        who: 'JohannekeKroesbergen',   lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Girl_on_a_bike.jpg' },
  { what: 'Celtic knot, triquetra & Newgrange triple-spiral motifs', who: 'AnonMoos and others, Wikimedia Commons', lic: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Triple-Spiral-Symbol.svg' }
];
